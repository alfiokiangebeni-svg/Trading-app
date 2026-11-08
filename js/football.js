/* Alerte Trading — Bot d'analyse des matchs de football.
   Données : API publique ESPN (classements, calendrier, forme, cotes quand elles existent), sans clé.
   Modèle : loi de Poisson sur les buts avec correction Dixon-Coles des petits scores.
     force d'attaque  = buts marqués par match / moyenne de la ligue (lissée vers 1 en début de saison)
     force de défense = buts encaissés par match / moyenne de la ligue
     buts attendus domicile  = moyenne × attaque(dom) × défense(ext) × avantage du terrain × forme
     buts attendus extérieur = moyenne × attaque(ext) × défense(dom) / avantage du terrain × forme
   Le modèle donne des probabilités, pas des certitudes. */
(function () {
  'use strict';
  const API = 'https://site.api.espn.com/apis';
  const LEAGUES = [
    ['fra.1', 'Ligue 1'], ['eng.1', 'Premier League'], ['esp.1', 'LaLiga'], ['ita.1', 'Serie A'], ['ger.1', 'Bundesliga'],
    ['uefa.champions', 'Ligue des champions'], ['uefa.europa', 'Ligue Europa'], ['por.1', 'Liga Portugal'], ['ned.1', 'Eredivisie'],
    ['bel.1', 'Pro League (Belgique)'], ['tur.1', 'Süper Lig'], ['sau.1', 'Saudi Pro League'], ['usa.1', 'MLS']
  ];
  const HOME_ADV = 1.12, SHRINK = 4, RHO = -0.08, MAXG = 9;
  const st = { source: null, league: load('foot:league', 'fra.1'), range: load('foot:range', 'week'), table: null, matches: [], loading: false, error: null, showTable: false };
  function load(k, d) { try { const v = localStorage.getItem('at:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('at:' + k, JSON.stringify(v)); } catch (e) {} }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = x => Math.round(x * 100) + ' %';
  const mem = new Map();
  /* Copie de secours mise à jour toutes les 6 h par GitHub Actions (workflow web-data.yml), utilisée si ESPN refuse
     la lecture directe depuis le navigateur. */
  const MIRROR = 'https://raw.githubusercontent.com/alfiokiangebeni-svg/Trading-app/data/football';
  function mirrorOf(url) {
    let m = url.match(/soccer\/([^/]+)\/standings/); if (m) return `${MIRROR}/${m[1]}/standings.json`;
    m = url.match(/soccer\/([^/]+)\/scoreboard\?dates=(\d{8})/); if (m) return `${MIRROR}/${m[1]}/${m[2]}.json`;
    return null;
  }
  async function fetchJSON(url) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), 12000);
    try { const r = await fetch(url, { cache: 'no-store', signal: ctl ? ctl.signal : undefined }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    finally { clearTimeout(tm); }
  }
  async function getJSON(url, ttlMin) {
    const hit = mem.get(url);
    if (hit && Date.now() - hit.t < (ttlMin || 10) * 60000) return hit.d;
    let d;
    try { d = await fetchJSON(url); st.source = 'ESPN (direct)'; }
    catch (e) { const m = mirrorOf(url); if (!m) throw e; d = await fetchJSON(m); st.source = 'ESPN (copie GitHub, mise à jour toutes les 6 h)'; }
    mem.set(url, { t: Date.now(), d }); return d;
  }

  /* ---------- données ---------- */
  async function fetchTable(lg) {
    const d = await getJSON(`${API}/v2/sports/soccer/${lg}/standings`, 30);
    const rows = [];
    for (const ch of d.children || []) for (const e of (ch.standings && ch.standings.entries) || []) {
      const v = {}; for (const s of e.stats || []) v[s.name] = s.value;
      rows.push({ id: e.team.id, name: e.team.displayName, short: e.team.abbreviation || e.team.shortDisplayName, logo: (e.team.logos && e.team.logos[0] && e.team.logos[0].href) || '',
        gp: v.gamesPlayed || 0, w: v.wins || 0, d: v.ties || 0, l: v.losses || 0, gf: v.pointsFor || 0, ga: v.pointsAgainst || 0, pts: v.points || 0, rank: v.rank || 0, group: ch.name || '' });
    }
    rows.sort((a, b) => (a.rank || 99) - (b.rank || 99));
    return rows;
  }
  const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');
  async function fetchMatches(lg, range) {
    const days = range === 'today' ? [0] : range === 'tomorrow' ? [1] : range === 'past' ? [-3, -2, -1] : [0, 1, 2, 3, 4, 5, 6];
    const out = [];
    const res = await Promise.allSettled(days.map(k => { const d = new Date(Date.now() + k * 86400000); return getJSON(`${API}/site/v2/sports/soccer/${lg}/scoreboard?dates=${ymd(d)}`, k < 0 ? 60 : 5); }));
    const seen = new Set();
    for (const r of res) if (r.status === 'fulfilled') for (const e of r.value.events || []) {
      if (seen.has(e.id)) continue; seen.add(e.id);
      const c = e.competitions && e.competitions[0]; if (!c) continue;
      const side = h => c.competitors.find(x => x.homeAway === h) || {};
      const H = side('home'), A = side('away');
      const team = x => ({ id: x.team && x.team.id, name: x.team && x.team.displayName, short: x.team && (x.team.abbreviation || x.team.shortDisplayName), logo: x.team && x.team.logo,
        score: x.score, form: x.form || '', record: (x.records && x.records[0] && x.records[0].summary) || '' });
      const o = (c.odds && c.odds[0]) || null;
      out.push({ id: e.id, date: Date.parse(e.date), status: e.status.type, venue: c.venue && c.venue.fullName, home: team(H), away: team(A), odds: o });
    }
    out.sort((a, b) => a.date - b.date);
    return out;
  }

  /* ---------- modèle ---------- */
  function strengths(table) {
    const T = table.filter(t => t.gp > 0);
    const gp = T.reduce((s, t) => s + t.gp, 0), gf = T.reduce((s, t) => s + t.gf, 0);
    const mu = gp ? gf / gp : 1.35;
    const map = new Map();
    for (const t of table) map.set(String(t.id), Object.assign({}, t, {
      att: ((t.gf + SHRINK * mu) / (t.gp + SHRINK)) / mu,
      def: ((t.ga + SHRINK * mu) / (t.gp + SHRINK)) / mu,
      ppg: t.gp ? t.pts / t.gp : 0
    }));
    return { mu, map, n: T.length };
  }
  function formPoints(f) { let p = 0, n = 0; for (const ch of (f || '').slice(-5)) { n++; p += ch === 'W' ? 3 : ch === 'D' ? 1 : 0; } return n ? { ppg: p / n, n } : null; }
  function formFactor(f) { const x = formPoints(f); if (!x) return 1; return Math.max(0.94, Math.min(1.06, 1 + 0.05 * (x.ppg - 1.4) / 1.4)); }
  function poisson(k, l) { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; }
  function tau(x, y, lh, la) {
    if (x === 0 && y === 0) return 1 - lh * la * RHO;
    if (x === 0 && y === 1) return 1 + lh * RHO;
    if (x === 1 && y === 0) return 1 + la * RHO;
    if (x === 1 && y === 1) return 1 - RHO;
    return 1;
  }
  function predict(m, S) {
    const h = S.map.get(String(m.home.id)), a = S.map.get(String(m.away.id));
    if (!h || !a) return null;
    const fh = formFactor(m.home.form), fa = formFactor(m.away.form);
    const lh = S.mu * h.att * a.def * HOME_ADV * fh, la = S.mu * a.att * h.def / HOME_ADV * fa;
    let pH = 0, pD = 0, pA = 0, over = 0, btts = 0, tot = 0; const scores = [];
    for (let x = 0; x < MAXG; x++) for (let y = 0; y < MAXG; y++) {
      const p = poisson(x, lh) * poisson(y, la) * tau(x, y, lh, la);
      tot += p; if (x > y) pH += p; else if (x === y) pD += p; else pA += p;
      if (x + y > 2) over += p; if (x > 0 && y > 0) btts += p; scores.push([x, y, p]);
    }
    pH /= tot; pD /= tot; pA /= tot; over /= tot; btts /= tot;
    scores.sort((u, v) => v[2] - u[2]);
    const best = Math.max(pH, pD, pA);
    const pick = best === pH ? '1' : best === pA ? '2' : 'N';
    const level = best >= 0.58 ? 'Fort' : best >= 0.47 ? 'Moyen' : 'Faible';
    const dc = pH + pD >= pA + pD ? { k: '1N', p: pH + pD } : { k: 'N2', p: pA + pD };
    const sample = Math.min(h.gp, a.gp);
    const why = [];
    const rankTxt = (t) => t.rank ? `${t.rank}e` : '—';
    why.push(`${h.name} : ${rankTxt(h)} (${h.pts} pts en ${h.gp} matchs), ${(h.gf / Math.max(1, h.gp)).toFixed(2)} but(s) marqué(s) et ${(h.ga / Math.max(1, h.gp)).toFixed(2)} encaissé(s) par match.`);
    why.push(`${a.name} : ${rankTxt(a)} (${a.pts} pts en ${a.gp} matchs), ${(a.gf / Math.max(1, a.gp)).toFixed(2)} marqué(s) et ${(a.ga / Math.max(1, a.gp)).toFixed(2)} encaissé(s) par match.`);
    const fhP = formPoints(m.home.form), faP = formPoints(m.away.form);
    if (fhP || faP) why.push(`Forme (5 derniers) : ${m.home.short || h.short} ${m.home.form || '—'} · ${m.away.short || a.short} ${m.away.form || '—'}.`);
    why.push(`Avantage du terrain pris en compte (+${Math.round((HOME_ADV - 1) * 100)} % de buts attendus à domicile).`);
    if (sample < 5) why.push(`Début de saison (${sample} matchs) : estimation encore peu fiable, forces lissées vers la moyenne.`);
    return { lh, la, pH, pD, pA, over, btts, scores: scores.slice(0, 4), pick, level, best, dc, why, sample };
  }
  function american(o) { const v = parseFloat(o); if (!isFinite(v) || v === 0) return null; return v > 0 ? 100 / (v + 100) : -v / (-v + 100); }
  function market(odds) {
    if (!odds) return null;
    const ml = odds.moneyline || {};
    const g = x => x && (x.close && x.close.odds || x.open && x.open.odds);
    const h = american(g(ml.home)), a = american(g(ml.away)), d = american(odds.drawOdds && odds.drawOdds.moneyLine);
    if (h == null || a == null || d == null) return null;
    const s = h + d + a;
    return { pH: h / s, pD: d / s, pA: a / s, margin: s - 1, provider: odds.provider && odds.provider.displayName };
  }

  /* ---------- rendu ---------- */
  const DAYF = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const HOURF = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const logo = (u, n) => u ? `<img src="${esc(u)}" alt="" loading="lazy" width="28" height="28" onerror="this.style.visibility='hidden'">` : `<span class="nologo">${esc((n || '?').slice(0, 2))}</span>`;
  function card(m, S) {
    const p = S ? predict(m, S) : null, mk = market(m.odds);
    const done = m.status && m.status.completed, live = m.status && m.status.state === 'in';
    const score = done || live ? `<span class="fscore ${live ? 'live' : ''}">${esc(m.home.score)} – ${esc(m.away.score)}</span>` : `<span class="ftime">${HOURF.format(m.date)}</span>`;
    const head = `<div class="fm-head"><span class="fdate">${DAYF.format(m.date)}${live ? ' · <b class="live">en direct</b>' : done ? ' · terminé' : ''}</span>${m.venue ? `<span class="fvenue">${esc(m.venue)}</span>` : ''}</div>
      <div class="fm-teams"><div class="ft home">${logo(m.home.logo, m.home.name)}<b>${esc(m.home.name)}</b></div>${score}<div class="ft away"><b>${esc(m.away.name)}</b>${logo(m.away.logo, m.away.name)}</div></div>`;
    if (!p) return `<article class="card fm">${head}<p class="note">Analyse impossible : équipe absente du classement de cette compétition.</p></article>`;
    const pickTxt = p.pick === '1' ? `Victoire ${m.home.name}` : p.pick === '2' ? `Victoire ${m.away.name}` : 'Match nul';
    const diff = mk ? [['1', p.pH - mk.pH], ['N', p.pD - mk.pD], ['2', p.pA - mk.pA]] : null;
    return `<article class="card fm" data-pick="${p.pick}">
      ${head}
      <div class="fm-probs" role="img" aria-label="Probabilités 1 ${pct(p.pH)}, nul ${pct(p.pD)}, 2 ${pct(p.pA)}">
        <i class="h" style="flex:${p.pH}"></i><i class="d" style="flex:${p.pD}"></i><i class="a" style="flex:${p.pA}"></i></div>
      <div class="fm-plabels"><span>1 · ${pct(p.pH)}</span><span>N · ${pct(p.pD)}</span><span>2 · ${pct(p.pA)}</span></div>
      <div class="fm-verdict"><span class="tag lvl-${p.level}">${p.level}</span><b>${esc(pickTxt)}</b><span class="sub">double chance ${p.dc.k} : ${pct(p.dc.p)}</span></div>
      <div class="fm-stats">
        <div><span>Buts attendus</span><b>${p.lh.toFixed(2)} – ${p.la.toFixed(2)}</b></div>
        <div><span>+2,5 buts</span><b>${pct(p.over)}</b></div>
        <div><span>Les 2 marquent</span><b>${pct(p.btts)}</b></div>
        <div><span>Scores probables</span><b>${p.scores.map(s => `${s[0]}-${s[1]}`).join(' · ')}</b></div>
      </div>
      ${mk ? `<div class="fm-market"><span class="lbl">Marché (${esc(mk.provider || 'bookmaker')}, marge retirée)</span>
        <div class="mrow">${diff.map(([k, d], i) => `<span>${k} : ${pct([mk.pH, mk.pD, mk.pA][i])} <em class="${Math.abs(d) >= 0.05 ? (d > 0 ? 'up' : 'down') : ''}">${d > 0 ? '+' : ''}${Math.round(d * 100)}</em></span>`).join('')}</div>
        <small>Écart modèle − marché en points. Un gros écart signale un désaccord, pas une erreur du marché : le marché intègre blessures, compositions et rotations que le modèle ignore.</small></div>` : ''}
      <details class="fm-why"><summary>Pourquoi ?</summary><ul>${p.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></details>
    </article>`;
  }
  async function refresh() {
    const lg = st.league;
    st.loading = true; st.error = null; render();
    try {
      const [table, matches] = await Promise.all([fetchTable(lg), fetchMatches(lg, st.range)]);
      if (lg !== st.league) return;
      st.table = table; st.matches = matches;
    } catch (e) { st.error = e.message || String(e); }
    st.loading = false; render();
  }
  function render() {
    const root = document.getElementById('view-foot'); if (!root) return;
    const S = st.table && st.table.length ? strengths(st.table) : null;
    const lgName = (LEAGUES.find(l => l[0] === st.league) || [0, st.league])[1];
    root.innerHTML = `
      <div class="sec-h"><h2>Bot football</h2><p>Probabilités de chaque match à partir du classement, des buts et de la forme</p>
        <button class="iconbtn" id="fRefresh" type="button" style="margin-left:auto">Actualiser</button></div>
      <div class="card f-ctl">
        <div class="ctl"><span class="lbl">Compétition</span><select id="fLeague" class="fsel">${LEAGUES.map(([id, n]) => `<option value="${id}" ${id === st.league ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
        <div class="ctl"><span class="lbl">Période</span><div class="seg" id="fRange">
          ${[['past', '3 derniers jours'], ['today', 'Aujourd\'hui'], ['tomorrow', 'Demain'], ['week', '7 jours']].map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${st.range === v}">${l}</button>`).join('')}</div></div>
      </div>
      ${st.error ? `<div class="banner"><span>Données football indisponibles (${esc(st.error)}). Vérifiez la connexion puis « Actualiser ».</span></div>` : ''}
      <div class="f-grid">${st.loading && !st.matches.length ? '<div class="card empty-card"><span class="spin"></span> Chargement des matchs…</div>'
        : st.matches.length ? st.matches.map(m => card(m, S)).join('') : `<div class="card empty-card">Aucun match de ${esc(lgName)} sur cette période.</div>`}</div>
      ${S ? `<details class="card f-table" ${st.showTable ? 'open' : ''}><summary>Classement ${esc(lgName)} et forces du modèle</summary><div class="tbl-wrap"><table>
        <thead><tr><th>#</th><th>Équipe</th><th>J</th><th>Pts</th><th>BP</th><th>BC</th><th>Attaque</th><th>Défense</th></tr></thead><tbody>
        ${st.table.map(t => { const x = S.map.get(String(t.id)); return `<tr><td>${t.rank || ''}</td><td class="tn">${esc(t.name)}</td><td>${t.gp}</td><td>${t.pts}</td><td>${t.gf}</td><td>${t.ga}</td>
          <td class="${x.att >= 1 ? 'up' : 'down'}">${x.att.toFixed(2)}</td><td class="${x.def <= 1 ? 'up' : 'down'}">${x.def.toFixed(2)}</td></tr>`; }).join('')}
        </tbody></table></div><p class="note">Attaque &gt; 1 : marque plus que la moyenne. Défense &lt; 1 : encaisse moins que la moyenne. Moyenne de la ligue : ${S.mu.toFixed(2)} but par équipe et par match.</p></details>` : ''}
      <p class="note">Méthode : loi de Poisson (correction Dixon-Coles), forces d'attaque et de défense issues du classement, avantage du terrain, forme récente. Le modèle ne connaît ni les blessures, ni les compositions, ni la motivation : utilisez-le comme une base d'analyse. Les paris comportent des risques de perte et peuvent créer une dépendance ; jouez de façon responsable et seulement si c'est légal pour vous. Source : ${esc(st.source || 'ESPN')}.</p>`;
    root.querySelector('#fRefresh').onclick = () => { mem.clear(); refresh(); };
    root.querySelector('#fLeague').onchange = e => { st.league = e.target.value; save('foot:league', st.league); st.table = null; st.matches = []; refresh(); };
    root.querySelector('#fRange').onclick = e => { const b = e.target.closest('button'); if (!b) return; st.range = b.dataset.v; save('foot:range', st.range); st.matches = []; refresh(); };
    const tb = root.querySelector('.f-table'); if (tb) tb.addEventListener('toggle', () => { st.showTable = tb.open; });
  }
  let started = false;
  window.addEventListener('at:view', e => { if (e.detail === 'foot') { if (!started) { started = true; refresh(); } else render(); } });
  if (document.body.dataset.view === 'foot') { started = true; refresh(); }
  window.ATFoot = { predict, strengths, market, _st: st };
})();
