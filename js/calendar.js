/* Alerte Trading — Annonces économiques (calendrier ForexFactory de la semaine).
   APK : lecture native (CapacitorHttp) ; PC : Electron ouvre l'accès ; web : copie mise à jour toutes les
   6 h par GitHub Actions (web-data.yml) dans la branche `data` (raw.githubusercontent.com autorise la lecture). */
(function () {
  'use strict';
  const SOURCES = [
    { url: 'https://nfs.faireconomy.media/ff_calendar_thisweek.json', label: 'ForexFactory (direct)' },
    { url: 'https://raw.githubusercontent.com/alfiokiangebeni-svg/Trading-app/data/calendar.json', label: 'ForexFactory (copie GitHub, mise à jour toutes les 6 h)' }
  ];
  const CACHE_KEY = 'at:cal:v1', CACHE_MIN = 45;
  const st = { events: [], source: null, loadedAt: 0, error: null, impact: load('cal:impact', 'High'), cur: load('cal:cur', 'USD'), loading: null };
  function load(k, d) { try { const v = localStorage.getItem('at:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('at:' + k, JSON.stringify(v)); } catch (e) {} }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Effet habituel des grandes annonces (USD) sur l'or et le bitcoin. */
  const EFFECTS = [
    [/non-farm|nfp|employment change/i, 'Emploi américain. Chiffre supérieur aux prévisions : dollar ↑, or ↓, BTC souvent ↓. Inférieur : l\'inverse. Mouvements très violents dans les 15 premières minutes.'],
    [/unemployment rate/i, 'Taux de chômage. Plus haut que prévu : dollar ↓, or ↑. Plus bas : dollar ↑, or ↓.'],
    [/unemployment claims|jobless/i, 'Inscriptions hebdomadaires au chômage. Plus élevées que prévu : dollar ↓, or ↑.'],
    [/core pce|pce price/i, 'Inflation préférée de la Fed. Au-dessus des prévisions : taux ↑, dollar ↑, or et BTC ↓.'],
    [/cpi/i, 'Inflation (CPI). Au-dessus des prévisions : dollar et taux ↑, or et BTC ↓ en général. En dessous : or et BTC ↑.'],
    [/ppi/i, 'Prix à la production : annonce l\'inflation à venir. Même logique que le CPI, effet souvent plus faible.'],
    [/fomc|federal funds|fed chair|powell|monetary policy|interest rate decision/i, 'Banque centrale américaine (Fed). Hausse de taux ou ton ferme : dollar ↑, or ↓, BTC ↓. Baisse ou ton accommodant : or ↑, BTC ↑. Volatilité pendant toute la conférence.'],
    [/gdp/i, 'Croissance (PIB). Forte : dollar ↑. Faible : or ↑ (valeur refuge).'],
    [/retail sales/i, 'Ventes au détail (consommation). Fortes : dollar ↑, or ↓.'],
    [/ism|pmi/i, 'Indice d\'activité (au-dessus de 50 = expansion). Surprise forte : dollar ↑, or ↓.'],
    [/jolts|job openings/i, 'Offres d\'emploi. Plus élevées que prévu : marché du travail tendu, dollar ↑.'],
    [/consumer confidence|sentiment/i, 'Moral des ménages : effet en général modéré.'],
    [/bank holiday|holiday/i, 'Jour férié : liquidité faible, mouvements parfois erratiques.']
  ];
  function effect(ev) {
    for (const [re, txt] of EFFECTS) if (re.test(ev.title)) return txt;
    return ev.country === 'USD' ? 'Annonce américaine : volatilité possible sur l\'or et le BTC à l\'heure de publication.' : 'Effet surtout sur la devise concernée ; impact limité sur l\'or et le BTC sauf surprise forte.';
  }

  function parse(arr) {
    return (Array.isArray(arr) ? arr : []).map(e => ({ title: e.title, country: e.country, impact: e.impact, forecast: e.forecast, previous: e.previous,
      actual: e.actual, time: Date.parse(e.date) })).filter(e => isFinite(e.time)).sort((a, b) => a.time - b.time);
  }
  async function getJSON(url) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), 10000);
    try { const r = await fetch(url, { cache: 'no-store', signal: ctl ? ctl.signal : undefined }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    finally { clearTimeout(tm); }
  }
  async function refresh(force) {
    if (st.loading) return st.loading;
    if (!force) {
      const c = load(CACHE_KEY.slice(3), null);
      if (c && Date.now() - c.t < CACHE_MIN * 60000 && c.data && c.data.length) { st.events = parse(c.data); st.source = c.src; st.loadedAt = c.t; return; }
    }
    st.loading = (async () => {
      st.error = null;
      for (const s of SOURCES) {
        try { const d = await getJSON(s.url); const ev = parse(d); if (ev.length < 5) throw new Error('vide');
          st.events = ev; st.source = s.label; st.loadedAt = Date.now(); save(CACHE_KEY.slice(3), { t: st.loadedAt, src: s.label, data: d }); return; }
        catch (e) { st.error = e.message; }
      }
      const c = load(CACHE_KEY.slice(3), null); // dernier recours : ancien cache
      if (c && c.data) { st.events = parse(c.data); st.source = c.src + ' (ancienne copie)'; st.loadedAt = c.t; }
    })();
    try { await st.loading; } finally { st.loading = null; }
  }

  /* Annonces rouges en USD (celles qui font bouger l'or et le BTC) à ±min minutes de maintenant. */
  function near(min) {
    const now = Date.now(), w = min * 60000;
    return st.events.filter(e => e.impact === 'High' && e.country === 'USD' && Math.abs(e.time - now) <= w);
  }
  function nextHigh() { const now = Date.now(); return st.events.find(e => e.impact === 'High' && e.country === 'USD' && e.time > now) || null; }
  function countdown(t) {
    let m = Math.round((t - Date.now()) / 60000); const neg = m < 0; m = Math.abs(m);
    const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    const s = (d ? d + ' j ' : '') + (d || h ? h + ' h ' : '') + mm + ' min';
    return neg ? 'il y a ' + s : 'dans ' + s;
  }

  const DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const HOUR = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  function render() {
    const root = document.getElementById('view-news'); if (!root) return;
    const nx = nextHigh(), nr = near(30);
    const list = st.events.filter(e => (st.impact === 'all' || (st.impact === 'High' ? e.impact === 'High' : (e.impact === 'High' || e.impact === 'Medium'))) &&
      (st.cur === 'all' || e.country === st.cur));
    const days = new Map();
    for (const e of list) { const k = DAY.format(e.time); if (!days.has(k)) days.set(k, []); days.get(k).push(e); }
    const now = Date.now();
    root.innerHTML = `
      <div class="sec-h"><h2>Annonces économiques</h2><p>Calendrier de la semaine · heures locales de votre appareil</p>
        <button class="iconbtn" type="button" id="calRefresh" style="margin-left:auto">Actualiser</button></div>
      <div class="cal-top">
        <div class="card cal-next ${nr.length ? 'hot' : ''}">
          <span class="lbl">${nr.length ? 'Annonce rouge en cours' : 'Prochaine annonce USD à fort impact'}</span>
          ${nx || nr.length ? `<b>${esc((nr[0] || nx).title)}</b><span class="cd">${countdown((nr[0] || nx).time)}</span>
            <span class="sub">${HOUR.format((nr[0] || nx).time)} · prévision ${esc((nr[0] || nx).forecast || '—')} · précédent ${esc((nr[0] || nx).previous || '—')}</span>`
            : `<b>Aucune cette semaine</b><span class="sub">${st.events.length ? 'Plus d\'annonce rouge en USD d\'ici la fin de la semaine.' : 'Calendrier indisponible pour le moment.'}</span>`}
        </div>
        <div class="card cal-rules"><span class="lbl">Règles du bot autour des annonces</span>
          <ul><li>Pas de nouvelle entrée <b>30 min avant et après</b> une annonce rouge en USD (le signal affiche un avertissement).</li>
          <li>Jour de <b>NFP, CPI ou FOMC</b> : taille de position réduite ou pas de trade avant la publication.</li>
          <li>Après l'annonce : attendre la clôture de la première bougie M15, puis appliquer la méthode normalement.</li></ul></div>
      </div>
      <div class="card cal-filters">
        <div class="ctl"><span class="lbl">Impact</span><div class="seg" id="calImpact">
          ${[['High', 'Fort'], ['Medium', 'Fort + moyen'], ['all', 'Tous']].map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${st.impact === v}">${l}</button>`).join('')}</div></div>
        <div class="ctl"><span class="lbl">Devise</span><div class="seg" id="calCur">
          ${['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'all'].map(v => `<button type="button" data-v="${v}" aria-pressed="${st.cur === v}">${v === 'all' ? 'Toutes' : v}</button>`).join('')}</div></div>
      </div>
      ${list.length ? [...days].map(([d, evs]) => `<div class="cal-day"><h3>${esc(d)}</h3>${evs.map(e => `
        <details class="card cal-ev ${e.time < now ? 'past' : ''}" data-imp="${esc(e.impact)}">
          <summary><time>${HOUR.format(e.time)}</time><span class="imp" title="${esc(e.impact)}"></span><span class="cur">${esc(e.country)}</span>
            <span class="t">${esc(e.title)}</span><span class="fp">${e.forecast ? 'Prév. ' + esc(e.forecast) : ''}${e.previous ? ' · Préc. ' + esc(e.previous) : ''}</span></summary>
          <p>${esc(effect(e))}</p></details>`).join('')}</div>`).join('')
        : `<div class="card empty-card">${st.events.length ? 'Aucune annonce pour ces filtres.' : (st.loading ? 'Chargement du calendrier…' : 'Calendrier indisponible. Vérifiez la connexion puis « Actualiser ».')}</div>`}
      <p class="note">Source : ${esc(st.source || '—')}${st.loadedAt ? ' · chargé à ' + HOUR.format(st.loadedAt) : ''}. Les effets indiqués sont des tendances habituelles, pas des certitudes : une surprise se lit toujours par rapport à la prévision, et le marché peut réagir à l'inverse.</p>`;
    root.querySelector('#calRefresh').onclick = async () => { await refresh(true); render(); window.AT && window.AT.refreshSignal(); };
    root.querySelector('#calImpact').onclick = e => { const b = e.target.closest('button'); if (!b) return; st.impact = b.dataset.v; save('cal:impact', st.impact); render(); };
    root.querySelector('#calCur').onclick = e => { const b = e.target.closest('button'); if (!b) return; st.cur = b.dataset.v; save('cal:cur', st.cur); render(); };
  }

  window.ATCal = { refresh, near, nextHigh, countdown, effect, get events() { return st.events; }, get source() { return st.source; } };
  refresh().then(() => { render(); window.AT && window.AT.refreshSignal && window.AT.refreshSignal(); });
  window.addEventListener('at:view', e => { if (e.detail === 'news') { render(); refresh().then(render); } });
  setInterval(() => { if (document.body.dataset.view === 'news') render(); window.AT && window.AT.refreshSignal && window.AT.refreshSignal(); }, 60000);
})();
