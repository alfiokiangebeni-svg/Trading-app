/* Alerte Trading — Académie XAUUSD : données réelles de l'or et détecteurs des concepts ICT / Umar.
   Chaque détecteur parcourt de vraies bougies et renvoie des « occurrences » : un cas réel daté, ses tracés,
   le résultat réel de la configuration (gagnant / perdant, mesuré sur les bougies suivantes) et un exercice.
   Aucune bougie, aucun trade n'est inventé : sans données, l'Académie affiche « exemple indisponible ». */
window.ATXau = (function () {
  'use strict';
  const MIRROR = 'https://raw.githubusercontent.com/alfiokiangebeni-svg/Trading-app/data/market/';
  const SRC = { '5m': ['GC_F_5m', 300, '5m', '60d'], '1h': ['GC_F_1h', 3600, '60m', '730d'], '1d': ['GC_F_1d', 86400, '1d', '10y'] };
  const LABEL = 'Or · contrat à terme GC (COMEX), données Yahoo';
  const NOTE = 'Ce n\'est pas le XAUUSD au comptant : le future cote quelques dollars au-dessus du spot (coût de portage), avec les mêmes mouvements et presque les mêmes horaires (pause 17 h – 18 h à New York).';
  const cache = {};

  /* ---------------- données ---------------- */
  async function getJSON(u) { const r = await fetch(u, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
  function clean(rows, sec) {
    const seen = new Set(), out = [];
    rows.sort((a, b) => a.t - b.t).forEach(x => { if (sec < 86400 && x.t % sec) return; // bougie en cours (horodatage non aligné)
      if (!seen.has(x.t) && isFinite(x.h) && x.h >= x.l) { seen.add(x.t); out.push(x); } });
    return out;
  }
  function load(tf) {
    if (tf === '15m' || tf === '4h') return load(tf === '15m' ? '5m' : '1h').then(d => ({ rows: aggregate(d.rows, tf === '15m' ? 900 : 14400), label: d.label, from: d.from }));
    if (cache[tf]) return cache[tf];
    const [file, sec, yi, yr] = SRC[tf];
    cache[tf] = (async () => {
      let rows = [], from = 'copie GitHub, mise à jour toutes les 6 h';
      try { const j = await getJSON(MIRROR + file + '.json'); rows = (j.rows || []).map(x => ({ t: x[0], o: x[1], h: x[2], l: x[3], c: x[4], v: x[5] || 0 })); } catch (e) { rows = []; }
      if (rows.length < 300) try { // APK / PC : accès direct à Yahoo
        const j = await getJSON(`https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=${yi}&range=${yr}`);
        const r = j.chart.result[0], q = r.indicators.quote[0]; rows = [];
        r.timestamp.forEach((t, i) => { if (q.close[i] != null && q.open[i] != null) rows.push({ t, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i] || 0 }); });
        from = 'Yahoo en direct';
      } catch (e) { /* rien */ }
      rows = clean(rows, sec);
      if (rows.length < 100) throw new Error('Données de l\'or indisponibles (connexion ?)');
      return { rows, label: LABEL, from };
    })();
    cache[tf].catch(() => { delete cache[tf]; });
    return cache[tf];
  }
  function aggregate(rows, sec) {
    const out = []; let cur = null;
    for (const x of rows) { const b = Math.floor(x.t / sec) * sec;
      if (!cur || cur.t !== b) { cur = { t: b, o: x.o, h: x.h, l: x.l, c: x.c, v: x.v }; out.push(cur); }
      else { cur.h = Math.max(cur.h, x.h); cur.l = Math.min(cur.l, x.l); cur.c = x.c; cur.v += x.v; } }
    return out;
  }

  /* ---------------- heures locales (New York pour l'ICT, Londres pour Umar), changements d'heure compris ---------------- */
  const OFF = {}, FMT = {};
  function off(t, tz) {
    const h = Math.floor(t / 3600), k = tz + h; if (OFF[k] != null) return OFF[k];
    const f = FMT[tz] || (FMT[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }));
    const p = {}; f.formatToParts(new Date(h * 3600000)).forEach(x => p[x.type] = x.value);
    return (OFF[k] = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) / 1000 - h * 3600);
  }
  const NY = 'America/New_York', LDN = 'Europe/London';
  const lmin = (t, tz) => Math.floor((((t + off(t, tz)) % 86400) + 86400) % 86400 / 60);
  const lday = (t, tz, shift) => Math.floor((t + off(t, tz) + (shift || 0)) / 86400); // jour local (décalé pour la journée de trading)
  const tday = t => lday(t, NY, 6 * 3600); // journée de trading : commence à 18 h à New York
  const wd = t => new Date((t + off(t, NY)) * 1000).getUTCDay();
  const DAYF = {};
  function fday(t, tz) { const f = DAYF[tz] || (DAYF[tz] = new Intl.DateTimeFormat('fr-FR', { timeZone: tz, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })); return f.format(new Date(t * 1000)); }
  function fhm(t, tz) { const m = lmin(t, tz); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

  /* ---------------- briques ---------------- */
  const L = () => window.AT.lib;
  const f2 = x => window.AT ? window.AT.fmt(x, 2) : x.toFixed(2);
  function prep(c, n) {
    const lib = L(), atr = lib.atrArr(c, 14), sw = lib.findSwings(c, n || 3), ms = lib.marketStructure(c, sw);
    return { atr, sw, ms, fvg: lib.fairValueGaps(c, atr) };
  }
  function idxAt(c, t) { let lo = 0, hi = c.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (c[m].t <= t) lo = m; else hi = m - 1; } return lo; }
  const lastSw = (arr, k) => { let r = null; for (const s of arr) { if (s.conf <= k) r = s; else break; } return r; };
  const swBefore = (arr, k, n) => arr.filter(s => s.conf <= k).slice(-n);
  /* Simulation d'un trade sur les bougies suivantes. Bougie qui touche stop et objectif : comptée perdante (prudent). */
  function trade(c, k, dir, entry, sl, o) {
    o = o || {}; const rr = o.rr || 2, risk = Math.abs(entry - sl), tp = entry + dir * rr * risk, max = o.max || 150;
    if (!(risk > 0) || (dir === 1 ? sl >= entry : sl <= entry)) return null;
    let i = k + 1, fill = k;
    if (o.limit) { fill = -1; for (; i < Math.min(c.length, k + (o.fillMax || 60)); i++) { if (dir === 1 ? c[i].l <= entry : c[i].h >= entry) { fill = i; break; } }
      if (fill < 0) return { dir, entry, sl, tp, rr, res: 'nofill', fillT: null, exitT: null, k };
      if (dir === 1 ? c[fill].l <= sl : c[fill].h >= sl) return { dir, entry, sl, tp, rr, res: 'loss', fillT: c[fill].t, exitT: c[fill].t, k, exitI: fill };
      i = fill + 1; }
    for (; i < Math.min(c.length, fill + max); i++) {
      const hitSl = dir === 1 ? c[i].l <= sl : c[i].h >= sl, hitTp = dir === 1 ? c[i].h >= tp : c[i].l <= tp;
      if (hitSl) return { dir, entry, sl, tp, rr, res: 'loss', fillT: c[fill].t, exitT: c[i].t, k, exitI: i };
      if (hitTp) return { dir, entry, sl, tp, rr, res: 'win', fillT: c[fill].t, exitT: c[i].t, k, exitI: i };
    }
    return { dir, entry, sl, tp, rr, res: i >= c.length ? 'open' : 'flat', fillT: c[fill].t, exitT: null, k };
  }
  function win(c, a, b) { a = Math.max(0, a); b = Math.min(c.length - 1, b); return { t0: c[a].t, t1: c[b].t }; }
  function tradeAnn(tr) { if (!tr) return []; const t2 = tr.exitT || null;
    return [{ p: tr.entry, label: 'Entrée', col: 'accent', t1: tr.fillT || null, t2 }, { p: tr.sl, label: 'Stop', col: 'bear', t1: tr.fillT || null, t2 }, { p: tr.tp, label: 'Objectif ' + tr.rr + 'R', col: 'bull', t1: tr.fillT || null, t2 }]; }
  function resText(tr) {
    if (!tr) return '';
    const s = tr.dir === 1 ? 'Achat' : 'Vente', base = `${s} à ${f2(tr.entry)}, stop ${f2(tr.sl)}, objectif ${f2(tr.tp)} (${tr.rr}R). `;
    return base + ({ win: '<b class="up">Résultat réel : objectif atteint (+' + tr.rr + 'R).</b>', loss: '<b class="down">Résultat réel : stop touché (−1R).</b>',
      nofill: 'Le prix n\'est jamais revenu à l\'entrée : <b>pas de trade</b>.', open: 'Trade encore en cours à la fin des données.', flat: 'Ni stop ni objectif dans la fenêtre observée.' }[tr.res] || '');
  }
  const pick = (arr, n) => arr.slice(-(n || 200));

  /* ================= détecteurs ICT ================= */
  const D = {};
  function labelSwings(c, P, k, n) { // HH / HL / LH / LL des derniers points confirmés
    const marks = [];
    [[P.sw.hs, 'H'], [P.sw.ls, 'L']].forEach(([arr, kind]) => { const s = swBefore(arr, k, n + 1);
      for (let i = 1; i < s.length; i++) { const up = s[i].p > s[i - 1].p; marks.push({ t: s[i].t, pos: kind === 'H' ? 'above' : 'below', text: (up ? 'H' : 'L') + (kind === 'H' ? 'H' : 'L'), col: up ? 'bull' : 'bear' }); } });
    return marks;
  }
  function structEvents(c, P, kind) {
    return pick(P.ms.events.filter(e => !kind || e.kind === kind).map(e => {
      const k = e.at, opp = e.dir === 1 ? lastSw(P.sw.ls, k) : lastSw(P.sw.hs, k);
      const tr = opp ? trade(c, k, e.dir, c[k].c, opp.p + (e.dir === 1 ? -1 : 1) * P.atr[k] * 0.1) : null;
      return { k, e, opp, tr, ...win(c, k - 90, k + 60), cut: c[k].t, atr: P.atr[k] };
    }));
  }
  D.structure = (c) => { const P = prep(c, 3);
    return structEvents(c, P).filter(o => o.opp).map(o => ({ ...o,
      title: `${o.e.dir === 1 ? 'Cassure haussière' : 'Cassure baissière'} · ${fday(o.cut, NY)} ${fhm(o.cut, NY)}`,
      text: `Les points HH / HL / LH / LL sont confirmés après 3 bougies de chaque côté. La clôture à ${f2(c[o.k].c)} dépasse le ${o.e.dir === 1 ? 'dernier sommet' : 'dernier creux'} (${f2(o.e.level)}) : la structure est <b>${o.e.dir === 1 ? 'haussière' : 'baissière'}</b>. Le stop de structure se place sous le dernier ${o.e.dir === 1 ? 'creux (HL)' : 'sommet (LH)'} à ${f2(o.opp.p)}.`,
      ann: { marks: labelSwings(c, P, o.k, 4), lines: [{ p: o.e.level, label: o.e.kind, col: 'muted', t1: o.e.tFrom, t2: o.cut }] },
      trade: o.tr,
      ex: { type: 'price', p: o.opp.p, tol: o.atr * 0.45, q: `Cliquez sur le dernier ${o.e.dir === 1 ? 'creux (HL)' : 'sommet (LH)'} confirmé avant la cassure : c'est là que se place le stop de structure.` } }));
  };
  function breakOcc(c, P, kind, word) {
    return structEvents(c, P, kind).filter(o => o.opp).map(o => ({ ...o,
      title: `${kind} ${o.e.dir === 1 ? 'haussier' : 'baissier'} · ${fday(o.cut, NY)} ${fhm(o.cut, NY)}`,
      text: word(o) + ` Le niveau cassé : ${f2(o.e.level)} (formé ${fday(o.e.tFrom, NY)} ${fhm(o.e.tFrom, NY)}). Clôture de cassure : ${f2(c[o.k].c)}.`,
      ann: { marks: labelSwings(c, P, o.k, 3), lines: [{ p: o.e.level, label: kind, col: o.e.dir === 1 ? 'bull' : 'bear', t1: o.e.tFrom, t2: o.cut }] },
      trade: o.tr,
      ex: { type: 'price', p: o.e.level, tol: o.atr * 0.4, q: `Cliquez sur le niveau de structure que la dernière bougie vient de casser en clôture.` } }));
  }
  D.bos = c => breakOcc(c, prep(c, 3), 'BOS', o => `Cassure <b>dans le sens</b> de la tendance en cours : continuation.`);
  D.choch = c => breakOcc(c, prep(c, 3), 'CHoCH', o => `Première cassure <b>contre</b> la tendance précédente (${o.e.dir === 1 ? 'baissière' : 'haussière'}) : premier signe de changement de caractère, pas encore une tendance confirmée.`);
  D.mss = (c) => { const P = prep(c, 3), out = [];
    P.ms.events.forEach(e => { if (e.kind !== 'CHoCH') return; const k = e.at;
      let x = e.from; for (let j = e.from; j <= k; j++) if (e.dir === 1 ? c[j].l < c[x].l : c[j].h > c[x].h) x = j;
      const prev = (e.dir === 1 ? P.sw.ls : P.sw.hs).filter(s => s.conf <= x && s.i < x).slice(-1)[0];
      if (!prev || !(e.dir === 1 ? c[x].l < prev.p : c[x].h > prev.p)) return; // pas de prise de liquidité avant : simple CHoCH
      let disp = 0; for (let j = x + 1; j <= k; j++) disp = Math.max(disp, Math.abs(c[j].c - c[j].o) / P.atr[j]);
      if (disp < 1.1) return; // pas de déplacement
      const g = P.fvg.filter(g => g.dir === e.dir && g.created > x && g.created <= k + 1).slice(-1)[0];
      const ext = e.dir === 1 ? c[x].l : c[x].h, sl = ext - e.dir * P.atr[k] * 0.1;
      const tr = g ? trade(c, Math.max(k, g.created), e.dir, e.dir === 1 ? g.top : g.bot, sl, { limit: true }) : trade(c, k, e.dir, c[k].c, sl);
      out.push({ k, ...win(c, k - 80, k + 60), cut: c[k].t, trade: tr,
        title: `MSS ${e.dir === 1 ? 'haussier' : 'baissier'} · ${fday(c[k].t, NY)} ${fhm(c[k].t, NY)}`,
        text: `1) Liquidité prise : le prix passe ${e.dir === 1 ? 'sous' : 'au-dessus de'} ${f2(prev.p)} (extrême ${f2(ext)}). 2) Déplacement : bougie de ${disp.toFixed(1)}× l'ATR. 3) Cassure du ${e.dir === 1 ? 'sommet' : 'creux'} ${f2(e.level)} en clôture : <b>Market Structure Shift</b>. ${g ? `Entrée ICT au retour dans le FVG laissé par le déplacement (${f2(g.bot)} – ${f2(g.top)}).` : 'Aucun FVG : entrée à la clôture.'}`,
        ann: { lines: [{ p: prev.p, label: e.dir === 1 ? 'SSL prise' : 'BSL prise', col: 'muted', t1: prev.t, t2: c[x].t }, { p: e.level, label: 'MSS', col: e.dir === 1 ? 'bull' : 'bear', t1: e.tFrom, t2: c[k].t }],
          zones: g ? [{ t1: g.t, t2: c[Math.min(c.length - 1, k + 30)].t, top: g.top, bot: g.bot, col: 'accent', label: 'FVG' }] : [], marks: [{ t: c[x].t, pos: e.dir === 1 ? 'below' : 'above', text: 'sweep', col: 'accent' }] },
        ex: { type: 'price', p: e.level, tol: P.atr[k] * 0.4, q: 'Le prix vient de prendre la liquidité puis de repartir avec force. Cliquez sur le niveau dont la cassure confirme le MSS.' } });
    });
    return pick(out);
  };
  function liqOcc(c, side, eq) { // side 1 = BSL (au-dessus), -1 = SSL (en dessous)
    const P = prep(c, 3), arr = side === 1 ? P.sw.hs : P.sw.ls, out = [];
    for (let a = 0; a < arr.length; a++) {
      let lvl = arr[a].p, from = arr[a], k0 = arr[a].conf, pair = null;
      if (eq) { const b = arr[a + 1]; if (!b || b.i - from.i < 4 || Math.abs(b.p - from.p) > P.atr[b.i] * 0.12) continue;
        pair = b; lvl = side === 1 ? Math.max(from.p, b.p) : Math.min(from.p, b.p); k0 = b.conf; }
      let q = -1; for (let j = k0 + 1; j < Math.min(c.length, k0 + 400); j++) if (side === 1 ? c[j].h > lvl : c[j].l < lvl) { q = j; break; }
      if (q < 0) continue;
      let crossed = false; for (let j = (pair || from).i + 1; j <= k0; j++) if (side === 1 ? c[j].h > lvl : c[j].l < lvl) crossed = true;
      if (crossed) continue;
      const rej = side === 1 ? c[q].c < lvl : c[q].c > lvl, atr = P.atr[q];
      const tr = rej ? trade(c, q, -side, c[q].c, (side === 1 ? c[q].h : c[q].l) + side * atr * 0.1) : null;
      out.push({ k: q, lvl, rej, ...win(c, from.i - 30, q + 50), cut: c[q - 1].t, trade: tr, atr, from, pair });
    }
    return pick(out);
  }
  function liqDecor(c, side, eq) {
    const nm = eq ? (side === 1 ? 'Equal highs' : 'Equal lows') : (side === 1 ? 'BSL' : 'SSL');
    return liqOcc(c, side, eq).map(o => ({ ...o,
      title: `${nm} ${o.rej ? 'balayé' : 'pris'} · ${fday(c[o.k].t, NY)} ${fhm(c[o.k].t, NY)}`,
      text: `${eq ? `Deux ${side === 1 ? 'sommets' : 'creux'} quasi égaux (${f2(o.from.p)} et ${f2(o.pair.p)}) : les stops s'accumulent juste ${side === 1 ? 'au-dessus' : 'en dessous'}. ` : `Sommet${side === 1 ? '' : ' (creux)'} non pris à ${f2(o.lvl)} : des ordres stop dorment ${side === 1 ? 'au-dessus (liquidité acheteuse, Buy Side Liquidity)' : 'en dessous (liquidité vendeuse, Sell Side Liquidity)'}. `}`
        + (o.rej ? `La bougie de ${fhm(c[o.k].t, NY)} dépasse le niveau puis clôture de l'autre côté (${f2(c[o.k].c)}) : <b>balayage (sweep)</b>, retournement possible.` : `Le prix dépasse le niveau et clôture au-delà (${f2(c[o.k].c)}) : liquidité prise <b>et acceptée</b>, pas de retournement à jouer.`),
      ann: { lines: [{ p: o.lvl, label: nm, col: 'accent', t1: o.from.t, t2: c[o.k].t }], marks: [{ t: c[o.k].t, pos: side === 1 ? 'above' : 'below', text: o.rej ? 'sweep' : 'pris', col: o.rej ? 'accent' : 'muted' }] },
      trade: o.trade,
      ex: { type: 'price', p: o.lvl, tol: o.atr * 0.4, q: `Cliquez sur le niveau où se trouve la ${side === 1 ? 'liquidité acheteuse (au-dessus des sommets)' : 'liquidité vendeuse (sous les creux)'} que le prix va chercher${eq ? ' : les sommets / creux égaux' : ''}.` } }));
  }
  D.bsl = c => liqDecor(c, 1); D.ssl = c => liqDecor(c, -1);
  D.sweep = c => liqDecor(c, 1).concat(liqDecor(c, -1)).filter(o => o.rej).sort((a, b) => a.k - b.k).slice(-200);
  D.eqhl = c => liqDecor(c, 1, true).concat(liqDecor(c, -1, true)).sort((a, b) => a.k - b.k);
  D.fvg = (c) => { const P = prep(c, 3);
    return pick(P.fvg.map(g => { const k = g.created, a = P.atr[k], sl = g.dir === 1 ? c[g.i - 1].l - a * 0.1 : c[g.i - 1].h + a * 0.1;
      const tr = trade(c, k, g.dir, g.dir === 1 ? g.top : g.bot, sl, { limit: true });
      return { k, ...win(c, k - 60, k + 60), cut: c[k].t, trade: tr, title: `FVG ${g.dir === 1 ? 'haussier' : 'baissier'} · ${fday(g.t, NY)} ${fhm(g.t, NY)}`,
        text: `Trois bougies : le ${g.dir === 1 ? 'haut' : 'bas'} de la bougie 1 (${f2(g.dir === 1 ? g.bot : g.top)}) et le ${g.dir === 1 ? 'bas' : 'haut'} de la bougie 3 (${f2(g.dir === 1 ? g.top : g.bot)}) ne se touchent pas : déséquilibre de ${f2(g.top - g.bot)} $. Le prix revient souvent le combler ; l'entrée se fait au bord du FVG, stop au-delà de la bougie 1.`,
        ann: { zones: [{ t1: g.t, t2: c[Math.min(c.length - 1, k + 40)].t, top: g.top, bot: g.bot, col: 'accent', label: 'FVG' }] }, atr: a,
        ex: { type: 'zone', top: g.top, bot: g.bot, t1: c[g.i - 1].t, t2: c[k].t + 4 * (c[1].t - c[0].t), tol: a * 0.15, q: 'Cliquez à l\'intérieur du Fair Value Gap (le vide laissé entre la bougie 1 et la bougie 3).' } };
    }).filter(o => o.trade && o.trade.res !== 'nofill'));
  };
  D.ifvg = (c) => { const P = prep(c, 3), out = [];
    P.fvg.forEach(g => { let v = -1; for (let j = g.created + 1; j < Math.min(c.length, g.created + 120); j++) if (g.dir === 1 ? c[j].c < g.bot : c[j].c > g.top) { v = j; break; }
      if (v < 0) return; const d = -g.dir, a = P.atr[v], entry = d === 1 ? g.top : g.bot, sl = d === 1 ? g.bot - a * 0.6 : g.top + a * 0.6;
      const tr = trade(c, v, d, entry, sl, { limit: true }); if (!tr || tr.res === 'nofill') return;
      out.push({ k: v, ...win(c, g.created - 40, v + 60), cut: c[v].t, trade: tr, atr: a,
        title: `Inversion FVG ${d === 1 ? 'haussière' : 'baissière'} · ${fday(c[v].t, NY)} ${fhm(c[v].t, NY)}`,
        text: `FVG ${g.dir === 1 ? 'haussier' : 'baissier'} (${f2(g.bot)} – ${f2(g.top)}) traversé par une clôture à ${f2(c[v].c)} : il ne tient plus et change de camp. Au retour du prix, la zone sert désormais de ${d === 1 ? 'support' : 'résistance'} (IFVG).`,
        ann: { zones: [{ t1: g.t, t2: c[Math.min(c.length - 1, v + 40)].t, top: g.top, bot: g.bot, col: d === 1 ? 'bull' : 'bear', label: 'IFVG' }], marks: [{ t: c[v].t, pos: d === 1 ? 'above' : 'below', text: 'inversion', col: 'accent' }] },
        ex: { type: 'zone', top: g.top, bot: g.bot, tol: a * 0.15, q: `Le FVG vient d'être traversé en clôture. Cliquez sur la zone qui devient ${d === 1 ? 'support' : 'résistance'} (l'IFVG).` } });
    });
    return pick(out);
  };
  function obList(c, P) { return L().orderBlocks(c, P.ms.events); }
  D.ob = (c) => { const P = prep(c, 3);
    return pick(obList(c, P).map(ob => { const k = ob.created, a = P.atr[k];
      const tr = trade(c, k, ob.dir, ob.dir === 1 ? ob.top : ob.bot, ob.dir === 1 ? ob.bot - a * 0.1 : ob.top + a * 0.1, { limit: true });
      if (!tr || tr.res === 'nofill') return null;
      return { k, ...win(c, ob.i - 40, k + 60), cut: c[k].t, trade: tr, atr: a, title: `Order block ${ob.dir === 1 ? 'haussier' : 'baissier'} · ${fday(ob.t, NY)} ${fhm(ob.t, NY)}`,
        text: `Dernière bougie ${ob.dir === 1 ? 'baissière' : 'haussière'} (${f2(ob.bot)} – ${f2(ob.top)}) avant le mouvement qui casse la structure : c'est là que les gros ordres ont été placés. On attend le retour du prix dans la zone, stop de l'autre côté.`,
        ann: { zones: [{ t1: ob.t, t2: c[Math.min(c.length - 1, k + 40)].t, top: ob.top, bot: ob.bot, col: ob.dir === 1 ? 'bull' : 'bear', label: 'OB' }] },
        ex: { type: 'zone', top: ob.top, bot: ob.bot, t1: ob.t, t2: ob.t, tol: a * 0.15, q: `La structure vient de casser ${ob.dir === 1 ? 'vers le haut' : 'vers le bas'}. Cliquez sur l'order block d'origine (dernière bougie opposée avant le mouvement).` } };
    }).filter(Boolean));
  };
  D.breaker = (c) => { const P = prep(c, 3), out = [];
    obList(c, P).forEach(ob => { let b = -1; for (let j = ob.created + 1; j < Math.min(c.length, ob.created + 150); j++) if (ob.dir === 1 ? c[j].c < ob.bot : c[j].c > ob.top) { b = j; break; }
      if (b < 0) return; const d = -ob.dir, a = P.atr[b], entry = d === 1 ? ob.top : ob.bot, sl = d === 1 ? ob.bot - a * 0.6 : ob.top + a * 0.6;
      const tr = trade(c, b, d, entry, sl, { limit: true }); if (!tr || tr.res === 'nofill') return;
      out.push({ k: b, ...win(c, ob.i - 30, b + 60), cut: c[b].t, trade: tr, atr: a, title: `Breaker ${d === 1 ? 'haussier' : 'baissier'} · ${fday(c[b].t, NY)} ${fhm(c[b].t, NY)}`,
        text: `Order block ${ob.dir === 1 ? 'haussier' : 'baissier'} (${f2(ob.bot)} – ${f2(ob.top)}) cassé en clôture à ${f2(c[b].c)} : les acheteurs${ob.dir === 1 ? '' : ' (vendeurs)'} qui l'ont défendu sont piégés. Au retour, la zone devient un <b>breaker block</b> ${d === 1 ? 'haussier' : 'baissier'}.`,
        ann: { zones: [{ t1: ob.t, t2: c[Math.min(c.length - 1, b + 40)].t, top: ob.top, bot: ob.bot, col: d === 1 ? 'bull' : 'bear', label: 'Breaker' }], marks: [{ t: c[b].t, pos: d === 1 ? 'above' : 'below', text: 'cassé', col: 'accent' }] },
        ex: { type: 'zone', top: ob.top, bot: ob.bot, tol: a * 0.15, q: `Un order block vient d'être cassé en clôture. Cliquez sur la zone qui devient breaker block.` } });
    });
    return pick(out);
  };
  D.mitigation = (c) => { const P = prep(c, 3), out = [];
    P.ms.events.forEach(e => { if (e.kind !== 'CHoCH') return; const k = e.at, A = e.dir === 1 ? P.sw.ls : P.sw.hs; // échec : pas de nouvel extrême avant la cassure
      const ins = A.filter(s => s.i > e.from && s.i < k), pre = A.filter(s => s.i < e.from).slice(-1)[0], x = ins.slice(-1)[0];
      if (!x || !pre || !(e.dir === -1 ? x.p < pre.p : x.p > pre.p)) return; // sommet plus bas (ou creux plus haut) = échec
      let f = -1; for (let j = e.from; j >= Math.max(0, e.from - 3); j--) if (e.dir === -1 ? c[j].c > c[j].o : c[j].c < c[j].o) { f = j; break; }
      if (f < 0) return; const top = c[f].h, bot = c[f].l, a = P.atr[k], d = e.dir;
      const tr = trade(c, k, d, d === 1 ? top : bot, d === 1 ? bot - a * 0.6 : top + a * 0.6, { limit: true }); if (!tr || tr.res === 'nofill') return;
      out.push({ k, ...win(c, f - 40, k + 60), cut: c[k].t, trade: tr, atr: a, title: `Mitigation block ${d === 1 ? 'haussier' : 'baissier'} · ${fday(c[k].t, NY)} ${fhm(c[k].t, NY)}`,
        text: `Le prix n'a pas réussi à faire un ${d === -1 ? 'nouveau sommet' : 'nouveau creux'} (${f2(x.p)} contre ${f2(pre.p)}) : <b>échec</b>. Puis il casse le ${d === -1 ? 'creux' : 'sommet'} ${f2(e.level)}. La bougie ${d === -1 ? 'haussière' : 'baissière'} à l'origine du dernier élan (${f2(bot)} – ${f2(top)}) devient un <b>mitigation block</b> : à son retour, ceux qui y sont entrés soldent leurs positions.`,
        ann: { zones: [{ t1: c[f].t, t2: c[Math.min(c.length - 1, k + 40)].t, top, bot, col: d === 1 ? 'bull' : 'bear', label: 'Mitigation' }], lines: [{ p: pre.p, label: d === -1 ? 'sommet' : 'creux', col: 'muted', t1: pre.t, t2: x.t }, { p: e.level, label: 'cassure', col: d === 1 ? 'bull' : 'bear', t1: e.tFrom, t2: c[k].t }] },
        ex: { type: 'zone', top, bot, tol: a * 0.15, q: 'Le prix a échoué à faire un nouvel extrême puis a cassé la structure. Cliquez sur le mitigation block.' } });
    });
    return pick(out);
  };
  function rangeAt(c, P, k) { const h = lastSw(P.sw.hs, k), l = lastSw(P.sw.ls, k); if (!h || !l || h.p <= l.p) return null; return { h, l, eq: (h.p + l.p) / 2 }; }
  function dailyAt(c, nyM) { const out = []; let last = null; for (let k = 50; k < c.length; k++) { const m = lmin(c[k].t, NY), d = tday(c[k].t); if (m >= nyM && d !== last) { last = d; out.push(k); } } return out; }
  D.pd = (c) => { const P = prep(c, 3);
    return pick(dailyAt(c, 7 * 60).map(k => { const r = rangeAt(c, P, k); if (!r) return null; const px = c[k].c, prem = px > r.eq, bias = P.ms.events.filter(e => e.at <= k).slice(-1)[0], dir = bias ? bias.dir : 0, a = P.atr[k];
      const good = (dir === 1 && !prem) || (dir === -1 && prem), tr = good ? trade(c, k, dir, px, (dir === 1 ? r.l.p : r.h.p) - dir * a * 0.2) : null;
      return { k, ...win(c, Math.min(r.h.i, r.l.i) - 10, k + 40), cut: c[k].t, trade: tr, atr: a, prem, title: `Premium / discount · ${fday(c[k].t, NY)} 07:00`,
        text: `Range de référence : sommet ${f2(r.h.p)}, creux ${f2(r.l.p)}, équilibre ${f2(r.eq)}. À 7 h (New York), le prix (${f2(px)}) est en <b>${prem ? 'premium' : 'discount'}</b>. Structure ${dir === 1 ? 'haussière' : dir === -1 ? 'baissière' : 'indécise'} : ${good ? `bon côté pour ${dir === 1 ? 'acheter' : 'vendre'}.` : 'mauvais côté du range pour le biais : on attend.'}`,
        ann: { zones: [{ t1: c[Math.min(r.h.i, r.l.i)].t, t2: c[Math.min(c.length - 1, k + 30)].t, top: r.h.p, bot: r.eq, col: 'bear', label: 'Premium' }, { t1: c[Math.min(r.h.i, r.l.i)].t, t2: c[Math.min(c.length - 1, k + 30)].t, top: r.eq, bot: r.l.p, col: 'bull', label: 'Discount' }],
          lines: [{ p: r.eq, label: 'Équilibre 50 %', col: 'muted' }] },
        ex: { type: 'choice', opts: ['Premium (au-dessus de 50 %)', 'Discount (en dessous de 50 %)'], ok: prem ? 0 : 1, show: { lines: [{ p: r.h.p, label: 'Sommet', col: 'muted' }, { p: r.l.p, label: 'Creux', col: 'muted' }] }, q: 'Le sommet et le creux du range sont tracés. Où se trouve le prix actuel ?' } };
    }).filter(Boolean));
  };
  D.dealing = (c) => D.pd(c).map(o => ({ ...o, title: o.title.replace('Premium / discount', 'Dealing range'),
    ex: { type: 'price', p: (o.ann.lines[0].p), tol: o.atr * 0.5, show: o.ex.show, q: 'Le sommet et le creux du dealing range sont tracés. Cliquez sur l\'équilibre (50 %) du range.' } }));
  D.ote = (c) => { const P = prep(c, 3), out = [];
    P.ms.events.forEach(e => { if (e.kind !== 'BOS') return; const k = e.at;
      const ext = (e.dir === 1 ? P.sw.hs : P.sw.ls).find(s => s.i >= k && s.conf < k + 40); if (!ext) return;
      let o = e.from; for (let j = e.from; j <= k; j++) if (e.dir === 1 ? c[j].l < c[o].l : c[j].h > c[o].h) o = j;
      const lo = e.dir === 1 ? c[o].l : ext.p, hi = e.dir === 1 ? ext.p : c[o].h, rg = hi - lo; if (rg <= 0) return;
      const z1 = e.dir === 1 ? hi - 0.62 * rg : lo + 0.62 * rg, z2 = e.dir === 1 ? hi - 0.79 * rg : lo + 0.79 * rg, entry = e.dir === 1 ? hi - 0.705 * rg : lo + 0.705 * rg, a = P.atr[ext.conf];
      const tr = trade(c, ext.conf, e.dir, entry, e.dir === 1 ? lo - a * 0.1 : hi + a * 0.1, { limit: true }); if (!tr || tr.res === 'nofill') return;
      out.push({ k: ext.conf, ...win(c, o - 30, ext.conf + 60), cut: c[ext.conf].t, trade: tr, atr: a, title: `OTE ${e.dir === 1 ? 'acheteur' : 'vendeur'} · ${fday(c[ext.conf].t, NY)} ${fhm(c[ext.conf].t, NY)}`,
        text: `Jambe d'impulsion de ${f2(e.dir === 1 ? lo : hi)} à ${f2(e.dir === 1 ? hi : lo)} (${f2(rg)} $) qui casse la structure. L'<b>OTE</b> est le retracement de 62 à 79 % : ${f2(Math.min(z1, z2))} – ${f2(Math.max(z1, z2))}. Entrée à 70,5 %, stop au-delà de l'origine de la jambe.`,
        ann: { zones: [{ t1: c[o].t, t2: c[Math.min(c.length - 1, ext.conf + 40)].t, top: Math.max(z1, z2), bot: Math.min(z1, z2), col: 'accent', label: 'OTE 62–79 %' }], lines: [{ p: lo, label: e.dir === 1 ? '100 %' : '0 %', col: 'muted', t1: c[o].t }, { p: hi, label: e.dir === 1 ? '0 %' : '100 %', col: 'muted', t1: c[o].t }] },
        ex: { type: 'zone', top: Math.max(z1, z2), bot: Math.min(z1, z2), tol: a * 0.2, show: { lines: [{ p: lo, label: 'Bas de la jambe', col: 'muted', t1: c[o].t }, { p: hi, label: 'Haut de la jambe', col: 'muted', t1: c[o].t }] }, q: 'La jambe d\'impulsion est tracée. Cliquez dans la zone OTE (retracement de 62 à 79 %).' } });
    });
    return pick(out);
  };
  /* --- sessions ICT (heures de New York) --- */
  function ictDays(c) {
    const P = prep(c, 3), days = new Map();
    c.forEach((x, i) => { const d = tday(x.t); if (!days.has(d)) days.set(d, []); days.get(d).push(i); });
    const out = [], keys = [...days.keys()];
    keys.forEach((d, n) => { const ids = days.get(d), m = i => lmin(c[i].t, NY);
      const asia = ids.filter(i => m(i) >= 1200), lon = ids.filter(i => m(i) >= 120 && m(i) < 300), ny = ids.filter(i => m(i) >= 420 && m(i) < 600), pm = ids.filter(i => m(i) >= 810 && m(i) < 960);
      if (asia.length < 30 || lon.length < 24 || ny.length < 24) return;
      const hl = s => ({ h: Math.max(...s.map(i => c[i].h)), l: Math.min(...s.map(i => c[i].l)), a: s[0], b: s[s.length - 1] });
      const prev = n ? days.get(keys[n - 1]) : null;
      const mid = ids.find(i => m(i) === 0 && wd(c[i].t) !== 0) ;
      out.push({ d, ids, A: hl(asia), Lo: hl(lon), N: hl(ny), PM: pm.length > 10 ? hl(pm) : null, prev: prev && prev.length > 100 ? hl(prev) : null, mid, P });
    });
    return out;
  }
  function sweepIn(c, ids, lvl, side) { for (const i of ids) if (side === 1 ? c[i].h > lvl : c[i].l < lvl) return i; return -1; }
  function backInside(c, ids, from, lvl, side) { for (const i of ids) if (i >= from && (side === 1 ? c[i].c < lvl : c[i].c > lvl)) return i; return -1; }
  function sessSweepOcc(c, refName, refKey, sessKey, sessIds, nm, exSide) {
    return ictDays(c).map(D0 => { const R0 = D0[refKey]; if (!R0) return null; const ids = sessIds(D0), a = D0.P.atr;
      let side = 0, q = -1; const qh = sweepIn(c, ids, R0.h, 1), ql = sweepIn(c, ids, R0.l, -1);
      if (qh >= 0 && (ql < 0 || qh < ql)) { side = 1; q = qh; } else if (ql >= 0) { side = -1; q = ql; }
      let tr = null, back = -1;
      if (side) { back = backInside(c, ids, q, side === 1 ? R0.h : R0.l, side);
        if (back >= 0) { let ext = q; for (let j = q; j <= back; j++) if (side === 1 ? c[j].h > c[ext].h : c[j].l < c[ext].l) ext = j;
          tr = trade(c, back, -side, c[back].c, (side === 1 ? c[ext].h : c[ext].l) + side * a[back] * 0.1); } }
      const cutI = R0.b, which = exSide || ((D0.d % 2) ? 1 : -1);
      return { k: cutI, ...win(c, R0.a - 20, Math.min(D0.ids[D0.ids.length - 1], (back >= 0 ? back : cutI) + 70)), cut: c[cutI].t, trade: tr, atr: a[cutI], D0, side, back,
        title: `${refName} · ${fday(c[R0.b].t, NY)}`,
        text: `${refName} : haut ${f2(R0.h)}, bas ${f2(R0.l)} (amplitude ${f2(R0.h - R0.l)} $). ` + (side ? `${nm} prend d'abord le ${side === 1 ? 'haut' : 'bas'} à ${fhm(c[q].t, NY)}${back >= 0 ? `, puis une bougie reclôture dans le range à ${fhm(c[back].t, NY)} : <b>prise de liquidité et retournement</b>.` : ' et poursuit au-delà : <b>continuation</b>, pas de retournement.'}` : `${nm} ne sort pas du range.`),
        ann: { boxes: [{ t1: c[R0.a].t, t2: c[R0.b].t, top: R0.h, bot: R0.l, label: refName }], lines: [{ p: R0.h, label: refName + ' haut', col: 'accent', t1: c[R0.a].t }, { p: R0.l, label: refName + ' bas', col: 'accent', t1: c[R0.a].t }],
          marks: side ? [{ t: c[q].t, pos: side === 1 ? 'above' : 'below', text: back >= 0 ? 'sweep' : 'cassure', col: 'accent' }] : [] },
        ex: { type: 'price', p: which === 1 ? R0.h : R0.l, tol: a[cutI] * 0.45, q: `Cliquez sur le ${which === 1 ? 'haut' : 'bas'} du ${refName.toLowerCase()} (le ${which === 1 ? 'plus haut' : 'plus bas'} prix de la période encadrée).` , band: [c[R0.a].t, c[R0.b].t] } };
    }).filter(Boolean).slice(-200);
  }
  D.asian = c => sessSweepOcc(c, 'Range asiatique', 'A', 'Lo', D0 => D0.Lo ? D0.ids.filter(i => lmin(c[i].t, NY) >= 120 && lmin(c[i].t, NY) < 600) : [], 'Londres');
  D.london = c => sessSweepOcc(c, 'Session de Londres', 'Lo', 'N', D0 => D0.ids.filter(i => lmin(c[i].t, NY) >= 420 && lmin(c[i].t, NY) < 720), 'New York');
  D.ny = c => sessSweepOcc(c, 'New York AM', 'N', 'PM', D0 => D0.ids.filter(i => lmin(c[i].t, NY) >= 600 && lmin(c[i].t, NY) < 960), 'L\'après-midi');
  D.pdhl = c => sessSweepOcc(c, 'Veille (PDH / PDL)', 'prev', null, D0 => D0.ids, 'La journée').map(o => { o.cut = c[o.D0.ids[0]].t; o.k = o.D0.ids[0];
    o.ex.q = `Cliquez sur le ${o.ex.p === o.D0.prev.h ? 'plus haut (PDH)' : 'plus bas (PDL)'} de la veille.`; o.ex.band = null; o.title = 'PDH / PDL · ' + fday(o.cut, NY); return o; });
  D.judas = (c) => ictDays(c).map(D0 => { const A = D0.A, lon = D0.ids.filter(i => lmin(c[i].t, NY) >= 120 && lmin(c[i].t, NY) < 420), a = D0.P.atr;
    const qh = sweepIn(c, lon, A.h, 1), ql = sweepIn(c, lon, A.l, -1); let side = 0, q = -1;
    if (qh >= 0 && (ql < 0 || qh < ql)) { side = 1; q = qh; } else if (ql >= 0) { side = -1; q = ql; } if (!side) return null;
    const lvl = side === 1 ? A.h : A.l, b = backInside(c, lon, q, lvl, side), bias = D0.P.ms.events.filter(e => e.at <= q).slice(-1)[0], bd = bias ? bias.dir : 0;
    const judasExpected = bd !== 0 && side !== bd; let tr = null;
    if (b >= 0) { let ext = q; for (let j = q; j <= b; j++) if (side === 1 ? c[j].h > c[ext].h : c[j].l < c[ext].l) ext = j; tr = trade(c, b, -side, c[b].c, (side === 1 ? c[ext].h : c[ext].l) + side * a[b] * 0.1); }
    return { k: q, ...win(c, A.a - 10, (b >= 0 ? b : q) + 70), cut: c[q].t, trade: tr, atr: a[q], title: `Judas swing ? · ${fday(c[q].t, NY)} ${fhm(c[q].t, NY)}`,
      text: `À ${fhm(c[q].t, NY)} (Londres), le prix dépasse le ${side === 1 ? 'haut' : 'bas'} asiatique (${f2(lvl)}). Structure de fond : ${bd === 1 ? 'haussière' : bd === -1 ? 'baissière' : 'indécise'}. ${judasExpected ? 'Ce mouvement va <b>contre</b> le biais : Judas swing probable, on attend la reclôture dans le range.' : 'Ce mouvement va <b>dans le sens</b> du biais : plutôt une vraie sortie.'} ${b >= 0 ? `Reclôture dans le range à ${fhm(c[b].t, NY)} : le faux départ est confirmé.` : 'Pas de reclôture dans le range : pas de Judas confirmé.'}`,
      ann: { boxes: [{ t1: c[A.a].t, t2: c[A.b].t, top: A.h, bot: A.l, label: 'Asie' }], lines: [{ p: lvl, label: side === 1 ? 'Haut Asie' : 'Bas Asie', col: 'accent', t1: c[A.a].t }], marks: [{ t: c[q].t, pos: side === 1 ? 'above' : 'below', text: 'sortie', col: 'accent' }] },
      ex: { type: 'choice', opts: ['Judas swing probable : attendre la reclôture et un MSS dans l\'autre sens', 'Vraie sortie dans le sens du biais'], ok: judasExpected ? 0 : 1,
        show: { lines: [{ p: lvl, label: side === 1 ? 'Haut Asie' : 'Bas Asie', col: 'accent', t1: c[A.a].t }] }, q: `Biais de fond : ${bd === 1 ? 'haussier' : bd === -1 ? 'baissier' : 'indécis'}. Le prix vient de sortir du range asiatique ${side === 1 ? 'par le haut' : 'par le bas'} en session de Londres. Que dit la méthode ?` } };
  }).filter(Boolean).slice(-200);
  D.po3 = (c) => ictDays(c).map(D0 => { if (D0.mid == null) return null; const op = c[D0.mid].o, a = D0.P.atr, ids = D0.ids.filter(i => i >= D0.mid && lmin(c[i].t, NY) < 600);
    const ev = D0.P.ms.events.filter(e => e.at <= D0.mid).slice(-1)[0], dir = ev ? ev.dir : 0; if (!dir || ids.length < 50) return null;
    let man = -1, back = -1; for (const i of ids) { if (man < 0 && (dir === 1 ? c[i].l < op : c[i].h > op)) man = i; if (man >= 0 && (dir === 1 ? c[i].c > op : c[i].c < op) && i > man) { back = i; break; } }
    let tr = null; if (back >= 0) { let ext = man; for (let j = man; j <= back; j++) if (dir === 1 ? c[j].l < c[ext].l : c[j].h > c[ext].h) ext = j; tr = trade(c, back, dir, c[back].c, (dir === 1 ? c[ext].l : c[ext].h) - dir * a[back] * 0.1); }
    const end = D0.ids[D0.ids.length - 1];
    return { k: D0.mid, ...win(c, D0.A.a, end), cut: c[D0.mid].t, trade: tr, atr: a[D0.mid], title: `Power of Three · ${fday(c[D0.mid].t, NY)}`,
      text: `Ouverture de minuit (New York) : ${f2(op)}. Biais de fond ${dir === 1 ? 'haussier' : 'baissier'}. <b>Accumulation</b> en Asie, <b>manipulation</b> : ${man >= 0 ? `passage ${dir === 1 ? 'sous' : 'au-dessus de'} l'ouverture à ${fhm(c[man].t, NY)}` : 'aucune'}, <b>distribution</b> : ${back >= 0 ? `retour au-dessus${dir === 1 ? '' : ' (en dessous)'} de l'ouverture à ${fhm(c[back].t, NY)}, entrée dans le sens du biais.` : 'pas de retour : pas de setup.'}`,
      ann: { lines: [{ p: op, label: 'Ouverture minuit', col: 'accent', t1: c[D0.mid].t }], boxes: [{ t1: c[D0.A.a].t, t2: c[D0.A.b].t, top: D0.A.h, bot: D0.A.l, label: 'Accumulation' }], marks: man >= 0 ? [{ t: c[man].t, pos: dir === 1 ? 'below' : 'above', text: 'manipulation', col: 'accent' }] : [] },
      ex: { type: 'price', p: op, tol: a[D0.mid] * 0.4, q: 'Cliquez sur le prix d\'ouverture de minuit (heure de New York) : la référence du Power of Three.', band: [c[D0.mid].t, c[D0.mid].t] } };
  }).filter(Boolean).slice(-200);
  D.kz = (c) => { const days = ictDays(c), nm = ['Asie', 'Londres', 'New York AM', 'New York PM'], tot = [0, 0, 0, 0], cnt = [0, 0, 0, 0];
    const occ = days.map(D0 => { const rs = [D0.A, D0.Lo, D0.N, D0.PM].map(s => s ? s.h - s.l : 0); rs.forEach((r, i) => { if (r) { tot[i] += r; cnt[i]++; } });
      const best = rs.indexOf(Math.max(...rs)), end = D0.ids[D0.ids.length - 1];
      return { k: end, ...win(c, D0.ids[0], end), cut: c[end].t, trade: null, atr: D0.P.atr[end], title: `Kill zones · ${fday(c[end].t, NY)}`,
        text: `Amplitudes réelles du jour : ${nm.map((n, i) => `${n} ${f2(rs[i])} $`).join(' · ')}. La plus active : <b>${nm[best]}</b>.`,
        ann: { boxes: [D0.A, D0.Lo, D0.N, D0.PM].map((s, i) => s && { t1: c[s.a].t, t2: c[s.b].t, top: s.h, bot: s.l, label: nm[i] }).filter(Boolean) },
        ex: { type: 'choice', opts: nm, ok: best, show: { boxes: [D0.A, D0.Lo, D0.N, D0.PM].map((s, i) => s && { t1: c[s.a].t, t2: c[s.b].t, top: s.h, bot: s.l, label: nm[i] }).filter(Boolean) }, q: 'Les quatre fenêtres sont encadrées. Laquelle a eu la plus grande amplitude ce jour-là ?', full: true } };
    });
    const avg = nm.map((n, i) => `${n} : ${cnt[i] ? f2(tot[i] / cnt[i]) : '—'} $`).join(' · ');
    occ.forEach(o => o.text += `<br><span class="sub">Moyenne sur ${days.length} jours de données : ${avg}.</span>`);
    return occ.slice(-200);
  };
  D.pwhl = (c) => { // sur 1 h : plus haut / plus bas de la semaine précédente
    const P = prep(c, 3), wk = new Map(); c.forEach((x, i) => { const w = Math.floor((tday(x.t) - 4) / 7); if (!wk.has(w)) wk.set(w, []); wk.get(w).push(i); });
    const ks = [...wk.keys()], out = [];
    for (let n = 1; n < ks.length; n++) { const pw = wk.get(ks[n - 1]), ids = wk.get(ks[n]); if (pw.length < 60 || ids.length < 20) continue;
      const h = Math.max(...pw.map(i => c[i].h)), l = Math.min(...pw.map(i => c[i].l)), qh = sweepIn(c, ids, h, 1), ql = sweepIn(c, ids, l, -1);
      let side = 0, q = -1; if (qh >= 0 && (ql < 0 || qh < ql)) { side = 1; q = qh; } else if (ql >= 0) { side = -1; q = ql; }
      let tr = null, b = -1; if (side) { b = backInside(c, ids.filter(i => i <= q + 3), q, side === 1 ? h : l, side); if (b >= 0) { let ext = q; for (let j = q; j <= b; j++) if (side === 1 ? c[j].h > c[ext].h : c[j].l < c[ext].l) ext = j; tr = trade(c, b, -side, c[b].c, (side === 1 ? c[ext].h : c[ext].l) + side * P.atr[b] * 0.1, { max: 80 }); } }
      const which = ks[n] % 2 ? 1 : -1, k0 = ids[0];
      out.push({ k: k0, ...win(c, pw[0], ids[ids.length - 1]), cut: c[k0].t, trade: tr, atr: P.atr[k0], title: `Semaine du ${fday(c[k0].t, NY)}`,
        text: `Semaine précédente : plus haut (PWH) ${f2(h)}, plus bas (PWL) ${f2(l)}. ${side ? `Cette semaine, le prix prend d'abord le ${side === 1 ? 'PWH' : 'PWL'} (${fday(c[q].t, NY)})${b >= 0 ? ' puis reclôture de l\'autre côté : balayage hebdomadaire.' : ' et poursuit.'}` : 'Cette semaine reste à l\'intérieur.'}`,
        ann: { lines: [{ p: h, label: 'PWH', col: 'accent', t1: c[pw[0]].t }, { p: l, label: 'PWL', col: 'accent', t1: c[pw[0]].t }], marks: side ? [{ t: c[q].t, pos: side === 1 ? 'above' : 'below', text: b >= 0 ? 'sweep' : 'pris', col: 'accent' }] : [] },
        ex: { type: 'price', p: which === 1 ? h : l, tol: P.atr[k0] * 0.6, q: `Cliquez sur le ${which === 1 ? 'plus haut (PWH)' : 'plus bas (PWL)'} de la semaine précédente.` } });
    }
    return out.slice(-200);
  };

  /* ================= détecteurs Umar (heures de Londres) =================
     Règles documentées (vidéo « Learn My Best Gold Trading Strategy in 8 Minutes ») : or uniquement, session de Londres,
     Asie puis pré-Londres (2 h avant l'ouverture), balayage du haut ou du bas asiatique en pré-Londres, entrée sur cassure de
     structure en 5 min pendant la première heure de Londres, stop sous le dernier creux (au-dessus du dernier sommet), objectif 1:2.
     Adaptations de l'app (non chiffrées dans la vidéo) : Asie = 00 h – 06 h Londres, pré-Londres 06 h – 08 h, fenêtre 08 h – 09 h,
     « tendance » = déplacement net ≥ 60 % de l'amplitude de la session, points de swing à 2 bougies. */
  const UM = { asia: [0, 360], pre: [360, 480], win: [480, 540], lon: [480, 780], trendPct: 0.6, swing: 2 };
  function umarDays(c) {
    const P = prep(c, UM.swing), days = new Map();
    c.forEach((x, i) => { const d = lday(x.t, LDN); if (!days.has(d)) days.set(d, []); days.get(d).push(i); });
    const out = [];
    days.forEach((ids, d) => { const m = i => lmin(c[i].t, LDN), wdn = new Date(d * 86400000).getUTCDay(); if (wdn === 0 || wdn === 6) return;
      const asia = ids.filter(i => m(i) >= UM.asia[0] && m(i) < UM.asia[1]), pre = ids.filter(i => m(i) >= UM.pre[0] && m(i) < UM.pre[1]),
        w = ids.filter(i => m(i) >= UM.win[0] && m(i) < UM.win[1]), lon = ids.filter(i => m(i) >= UM.lon[0] && m(i) < UM.lon[1]), after = ids.filter(i => m(i) >= UM.win[0] && m(i) < 660);
      if (asia.length < 50 || pre.length < 18 || w.length < 10) return;
      const S = s => { const h = Math.max(...s.map(i => c[i].h)), l = Math.min(...s.map(i => c[i].l)); return { h, l, a: s[0], b: s[s.length - 1], net: Math.abs(c[s[s.length - 1]].c - c[s[0]].o), tr: Math.abs(c[s[s.length - 1]].c - c[s[0]].o) >= UM.trendPct * (h - l) }; };
      const A = S(asia), PR = S(pre), sh = PR.h > A.h, sl = PR.l < A.l;
      const sweep = sh && sl ? 'both' : sh ? 'high' : sl ? 'low' : 'none';
      const exp = sweep === 'low' ? 1 : sweep === 'high' ? -1 : 0;
      // premier BOS en 5 min à partir de l'ouverture de Londres (jusqu'à 11 h pour montrer aussi les cassures hors fenêtre)
      let bos = null; for (const i of after) { const h = lastSw(P.sw.hs, i - 1), l = lastSw(P.sw.ls, i - 1);
        if (h && c[i].c > h.p && c[i - 1].c <= h.p && (exp >= 0)) { bos = { i, dir: 1, lvl: h.p, sw: l }; break; }
        if (l && c[i].c < l.p && c[i - 1].c >= l.p && (exp <= 0)) { bos = { i, dir: -1, lvl: l.p, sw: h }; break; } }
      const inWin = bos && m(bos.i) < UM.win[1];
      const prob = sweep === 'both' ? 'aucune' : (sweep !== 'none' && !(A.tr && PR.tr)) ? 'haute' : 'basse';
      // règle stricte : on ne prend que les journées de haute probabilité ; les autres sont simulées pour information (trLow)
      const t0 = bos && inWin && bos.sw && sweep !== 'both' ? trade(c, bos.i, bos.dir, c[bos.i].c, bos.sw.p - bos.dir * 0.01, { rr: 2, max: 140 }) : null;
      const tr = prob === 'haute' ? t0 : null, trLow = prob === 'basse' ? t0 : null;
      const L0 = lon.length ? S(lon) : null;
      out.push({ d, ids, A, PR, W: S(w), L0, sweep, exp, bos, inWin, prob, tr, trLow, P });
    });
    return out;
  }
  const lbl = (c, i) => fhm(c[i].t, LDN);
  function uBase(c, U, k, extra) {
    const boxes = [{ t1: c[U.A.a].t, t2: c[U.A.b].t, top: U.A.h, bot: U.A.l, label: 'Asie' }, { t1: c[U.PR.a].t, t2: c[U.PR.b].t, top: U.PR.h, bot: U.PR.l, label: 'Pré-Londres' }, { t1: c[U.W.a].t, t2: c[U.W.b].t, top: U.W.h, bot: U.W.l, label: '1re heure Londres' }];
    return Object.assign({ k, ...win(c, U.A.a - 6, Math.min(U.ids[U.ids.length - 1], (U.tr && U.tr.exitI ? U.tr.exitI : U.W.b) + 50)), atr: U.P.atr[k], tz: LDN, trade: U.tr,
      ann: { boxes, lines: [{ p: U.A.h, label: 'Haut Asie', col: 'accent', t1: c[U.A.a].t }, { p: U.A.l, label: 'Bas Asie', col: 'accent', t1: c[U.A.a].t }].concat(U.bos ? [{ p: U.bos.lvl, label: 'BOS 5 min', col: U.bos.dir === 1 ? 'bull' : 'bear', t1: U.bos.sw ? c[Math.max(0, U.bos.i - 20)].t : null, t2: c[U.bos.i].t }] : []) } }, extra);
  }
  function uStory(c, U) {
    const sw = { high: 'le haut asiatique a été balayé en pré-Londres', low: 'le bas asiatique a été balayé en pré-Londres', both: 'les deux côtés de l\'Asie ont été pris : pas de direction claire', none: 'aucun côté de l\'Asie n\'a été balayé en pré-Londres' }[U.sweep];
    let s = `Asie ${f2(U.A.l)} – ${f2(U.A.h)}${U.A.tr ? ' (en tendance)' : ''} ; pré-Londres ${f2(U.PR.l)} – ${f2(U.PR.h)}${U.PR.tr ? ' (en tendance)' : ''} : ${sw}. Probabilité : <b>${U.prob}</b>. `;
    if (!U.bos) s += 'Aucune cassure de structure 5 min exploitable avant 11 h : pas de trade.';
    else s += `Cassure ${U.bos.dir === 1 ? 'haussière' : 'baissière'} 5 min à ${lbl(c, U.bos.i)} (niveau ${f2(U.bos.lvl)}) ${!U.inWin ? ': <b>hors de la première heure, pas d\'entrée</b>.' : U.prob === 'haute' ? 'dans la première heure : <b>entrée</b>.' : 'dans la première heure, mais journée de basse probabilité : <b>la règle stricte ne la prend pas</b>.'}`;
    if (U.trLow) s += ` Pour information, ce trade aurait donné : ${U.trLow.res === 'win' ? 'objectif atteint' : U.trLow.res === 'loss' ? 'stop touché' : 'aucune issue'}.`;
    return s;
  }
  const U = {};
  U.asia = c => umarDays(c).map(x => { const which = x.d % 2 ? 1 : -1; return uBase(c, x, x.A.b, { cut: c[x.A.b].t, title: `Range asiatique · ${fday(c[x.A.b].t, LDN)}`, text: uStory(c, x), trade: x.tr,
    ex: { type: 'price', p: which === 1 ? x.A.h : x.A.l, tol: x.P.atr[x.A.b] * 0.5, band: [c[x.A.a].t, c[x.A.b].t], q: `La session asiatique (00 h – 06 h, heure de Londres) est terminée. Cliquez sur l'<b>Asia ${which === 1 ? 'High' : 'Low'}</b>.` } }); }).slice(-200);
  U.london = c => umarDays(c).filter(x => x.L0).map(x => { const k = x.L0.b, which = x.d % 2 ? 1 : -1;
    const ny = x.ids.filter(i => lmin(c[i].t, LDN) >= 780 && lmin(c[i].t, LDN) < 1080), nh = ny.length && Math.max(...ny.map(i => c[i].h)) > x.L0.h, nl = ny.length && Math.min(...ny.map(i => c[i].l)) < x.L0.l;
    const o = uBase(c, x, k, { cut: c[k].t, title: `London High / Low · ${fday(c[k].t, LDN)}`, trade: null,
      text: `Session de Londres (08 h – 13 h) : haut ${f2(x.L0.h)}, bas ${f2(x.L0.l)}. Ensuite, New York ${nh && nl ? 'prend les deux côtés' : nh ? 'prend le London High' : nl ? 'prend le London Low' : 'reste à l\'intérieur'} : les extrêmes de session sont des réservoirs de liquidité.`,
      ex: { type: 'price', p: which === 1 ? x.L0.h : x.L0.l, tol: x.P.atr[k] * 0.5, band: [c[x.L0.a].t, c[x.L0.b].t], q: `Cliquez sur le <b>London ${which === 1 ? 'High' : 'Low'}</b> (08 h – 13 h, heure de Londres).` } });
    o.t1 = c[Math.min(x.ids[x.ids.length - 1], k + 70)].t; o.ann.boxes.push({ t1: c[x.L0.a].t, t2: c[x.L0.b].t, top: x.L0.h, bot: x.L0.l, label: 'Londres' }); return o; }).slice(-200);
  U.prelondon = c => umarDays(c).map(x => uBase(c, x, x.PR.b, { cut: c[x.PR.b].t, title: `Pré-Londres · ${fday(c[x.PR.b].t, LDN)}`, text: uStory(c, x),
    ex: { type: 'choice', opts: ['Le haut asiatique a été balayé', 'Le bas asiatique a été balayé', 'Les deux côtés', 'Aucun côté'], ok: ['high', 'low', 'both', 'none'].indexOf(x.sweep), show: { lines: [{ p: x.A.h, label: 'Haut Asie', col: 'accent', t1: c[x.A.a].t }, { p: x.A.l, label: 'Bas Asie', col: 'accent', t1: c[x.A.a].t }] }, q: 'Il est 08 h à Londres. Pendant le pré-Londres (06 h – 08 h), qu\'a fait le prix avec le range asiatique ?' } })).slice(-200);
  U.entry = c => umarDays(c).filter(x => x.bos).map(x => uBase(c, x, x.bos.i, { cut: c[x.bos.i - 1].t, title: `Entrée 5 min · ${fday(c[x.bos.i].t, LDN)} ${lbl(c, x.bos.i)}`, text: uStory(c, x),
    ex: { type: 'price', p: x.bos.lvl, tol: x.P.atr[x.bos.i] * 0.45, q: `Le marché attend une cassure ${x.bos.dir === 1 ? 'haussière' : 'baissière'}. Cliquez sur le dernier ${x.bos.dir === 1 ? 'sommet' : 'creux'} 5 min que le prix doit casser en clôture pour donner l'entrée.` } })).slice(-200);
  U.stop = c => umarDays(c).map(x => Object.assign({}, x, { tr: x.tr || x.trLow })).filter(x => x.tr).map(x => uBase(c, x, x.bos.i, { cut: c[x.bos.i].t, title: `Stop loss · ${fday(c[x.bos.i].t, LDN)} ${lbl(c, x.bos.i)}`, text: uStory(c, x) + ` Stop sous le dernier ${x.bos.dir === 1 ? 'creux' : 'sommet'} : ${f2(x.bos.sw.p)}.`,
    ex: { type: 'price', p: x.bos.sw.p, tol: x.P.atr[x.bos.i] * 0.45, show: { lines: [{ p: c[x.bos.i].c, label: 'Entrée', col: 'accent' }] }, q: `Entrée ${x.bos.dir === 1 ? 'à l\'achat' : 'à la vente'} à ${f2(c[x.bos.i].c)}. Cliquez où placer le stop loss selon la règle (dernier ${x.bos.dir === 1 ? 'creux' : 'sommet'} 5 min).` } })).slice(-200);
  U.target = c => umarDays(c).map(x => Object.assign({}, x, { tr: x.tr || x.trLow })).filter(x => x.tr).map(x => uBase(c, x, x.bos.i, { cut: c[x.bos.i].t, title: `Objectif 1:2 · ${fday(c[x.bos.i].t, LDN)}`, text: uStory(c, x),
    ex: { type: 'price', p: x.tr.tp, tol: Math.abs(x.tr.entry - x.tr.sl) * 0.2, show: { lines: [{ p: x.tr.entry, label: 'Entrée', col: 'accent' }, { p: x.tr.sl, label: 'Stop', col: 'bear' }] }, q: `Entrée ${f2(x.tr.entry)}, stop ${f2(x.tr.sl)} (risque ${f2(Math.abs(x.tr.entry - x.tr.sl))} $). Cliquez où placer l'objectif 1:2.` } })).slice(-200);
  U.session = c => umarDays(c).filter(x => x.bos).map(x => uBase(c, x, x.bos.i, { cut: c[x.bos.i].t, title: `Fenêtre d'entrée · ${fday(c[x.bos.i].t, LDN)} ${lbl(c, x.bos.i)}`, text: uStory(c, x),
    ex: { type: 'choice', opts: ['Entrée autorisée', 'Pas d\'entrée (hors de la première heure de Londres)'], ok: x.inWin ? 0 : 1, q: `Une cassure de structure 5 min apparaît à ${lbl(c, x.bos.i)} (heure de Londres). La règle autorise-t-elle l'entrée ?` } })).slice(-200);
  U.fake = c => umarDays(c).map(x => uBase(c, x, x.PR.b, { cut: c[x.PR.b].t, title: `Filtre · ${fday(c[x.PR.b].t, LDN)}`, text: uStory(c, x),
    ex: { type: 'choice', opts: ['Haute probabilité : un côté de l\'Asie balayé, sessions pas toutes deux en tendance', 'Basse probabilité : pas de balayage, ou Asie et pré-Londres en tendance', 'Pas de setup : les deux côtés de l\'Asie pris'], ok: x.prob === 'haute' ? 0 : x.prob === 'basse' ? 1 : 2, q: 'Il est 08 h à Londres. Classez la journée selon les filtres de la méthode.' } })).slice(-200);
  U.setup = c => umarDays(c).map(x => uBase(c, x, x.PR.b, { cut: c[x.PR.b].t, title: `Setup Gold London · ${fday(c[x.PR.b].t, LDN)}`, text: uStory(c, x),
    ex: { type: 'choice', opts: ['Chercher un achat (bas asiatique balayé)', 'Chercher une vente (haut asiatique balayé)', 'Pas de setup haute probabilité aujourd\'hui'], ok: x.prob !== 'haute' ? 2 : x.sweep === 'low' ? 0 : 1, q: 'Il est 08 h à Londres. D\'après le range asiatique et le pré-Londres, quel plan pour la première heure ?' } })).slice(-200);
  U.rr = c => umarDays(c).map(x => Object.assign({}, x, { tr: x.tr || x.trLow })).filter(x => x.tr).map(x => uBase(c, x, x.bos.i, { cut: c[x.bos.i].t, title: `Risque / rendement · ${fday(c[x.bos.i].t, LDN)}`, text: uStory(c, x),
    ex: { type: 'choice', opts: ['1:1', '1:2', '1:3'], ok: 1, show: { lines: [{ p: x.tr.entry, label: 'Entrée', col: 'accent' }, { p: x.tr.sl, label: 'Stop', col: 'bear' }, { p: x.tr.tp, label: 'Objectif', col: 'bull' }] }, q: `Risque ${f2(Math.abs(x.tr.entry - x.tr.sl))} $, gain visé ${f2(Math.abs(x.tr.tp - x.tr.entry))} $. Quel est le ratio risque / rendement ?` } })).slice(-200);
  U.bias = (c) => { const P = prep(c, 3), out = [];
    for (let k = 30; k < c.length; k++) { if (lmin(c[k].t, LDN) !== 420) continue; const ev = P.ms.events.filter(e => e.at <= k).slice(-1)[0]; if (!ev) continue;
      const hi = lastSw(P.sw.hs, k), lo = lastSw(P.sw.ls, k); if (!hi || !lo) continue;
      const lon = []; for (let j = k + 1; j < c.length && lmin(c[j].t, LDN) < 780 && j < k + 8; j++) lon.push(j);
      const mv = lon.length ? c[lon[lon.length - 1]].c - c[k].c : 0;
      out.push({ k, ...win(c, k - 120, k + 12), cut: c[k].t, tz: LDN, trade: null, atr: P.atr[k], title: `Biais journalier · ${fday(c[k].t, LDN)}`,
        text: `Structure 1 h : dernière cassure ${ev.dir === 1 ? 'haussière' : 'baissière'} (${ev.kind}) au niveau ${f2(ev.level)}. Résistance clé ${f2(hi.p)}, support clé ${f2(lo.p)}. Biais : <b>${ev.dir === 1 ? 'acheteur' : 'vendeur'}</b>${(ev.dir === 1 && hi.p - c[k].c < P.atr[k]) || (ev.dir === -1 && c[k].c - lo.p < P.atr[k]) ? ', mais le prix est collé à un niveau clé : on attend sa réaction' : ''}. Mouvement réel de Londres (08 h – 13 h) : ${mv >= 0 ? '+' : ''}${f2(mv)} $.`,
        ann: { marks: labelSwings(c, P, k, 3), lines: [{ p: hi.p, label: 'Résistance', col: 'bear', t1: hi.t }, { p: lo.p, label: 'Support', col: 'bull', t1: lo.t }] },
        ex: { type: 'choice', opts: ['Biais acheteur', 'Biais vendeur'], ok: ev.dir === 1 ? 0 : 1, q: 'Graphique 1 h, il est 07 h à Londres. D\'après la structure (sommets et creux), quel est le biais du jour ?' } });
    }
    return out.slice(-200);
  };
  U.range = (c) => { const P = prep(c, 3), out = []; let last = -99;
    for (let k = 40; k < c.length - 1; k++) { if (k - last < 24) continue; const s = c.slice(k - 30, k + 1), h = Math.max(...s.map(x => x.h)), l = Math.min(...s.map(x => x.l)), a = P.atr[k];
      if (h - l > 4.5 * a) continue; const th = s.filter(x => h - x.h < a * 0.3).length, tl = s.filter(x => x.l - l < a * 0.3).length; if (th < 2 || tl < 2) continue;
      let q = -1; for (let j = k + 1; j < Math.min(c.length, k + 60); j++) if (c[j].h > h || c[j].l < l) { q = j; break; } if (q < 0) continue;
      const side = c[q].h > h ? 1 : -1, lvl = side === 1 ? h : l, rej = side === 1 ? c[q].c < lvl : c[q].c > lvl;
      const tr = rej ? trade(c, q, -side, c[q].c, (side === 1 ? c[q].h : c[q].l) + side * a * 0.1, { max: 60 }) : null; last = k;
      out.push({ k, ...win(c, k - 40, q + 30), cut: c[k].t, tz: LDN, trade: tr, atr: a, title: `Range · ${fday(c[k].t, LDN)}`,
        text: `Consolidation de ${f2(l)} à ${f2(h)} : extrêmes touchés ${th} et ${tl} fois. Ces extrêmes « évidents » accumulent les stops. Sortie ${side === 1 ? 'par le haut' : 'par le bas'} : ${rej ? '<b>balayage puis retour dans le range</b>.' : 'cassure acceptée (clôture dehors).'}`,
        ann: { boxes: [{ t1: c[k - 30].t, t2: c[k].t, top: h, bot: l, label: 'Range' }], marks: [{ t: c[q].t, pos: side === 1 ? 'above' : 'below', text: rej ? 'sweep' : 'cassure', col: 'accent' }] },
        ex: { type: 'price', p: k % 2 ? h : l, tol: a * 0.4, band: [c[k - 30].t, c[k].t], q: `Marquez l'extrême ${k % 2 ? 'haut' : 'bas'} de la consolidation en cours (cliquez sur le prix).` } });
    }
    return out.slice(-200);
  };
  U.displacement = (c) => { const P = prep(c, 2);
    return pick(P.fvg.map(g => { const i = g.i, a = P.atr[i], body = Math.abs(c[i].c - c[i].o); if (body < 1.5 * a) return null; const k = g.created;
      const tr = trade(c, k, g.dir, g.dir === 1 ? g.top : g.bot, g.dir === 1 ? c[i - 1].l - a * 0.1 : c[i - 1].h + a * 0.1, { limit: true }); if (!tr || tr.res === 'nofill') return null;
      return { k, ...win(c, i - 50, k + 50), cut: c[k].t, tz: LDN, trade: tr, atr: a, title: `Déplacement · ${fday(c[i].t, LDN)} ${fhm(c[i].t, LDN)}`,
        text: `Bougie de ${f2(body)} $ (${(body / a).toFixed(1)}× l'ATR) qui laisse un FVG de ${f2(g.top - g.bot)} $ : un acteur important est entré. Le retest du FVG donne l'entrée dans le sens du déplacement.`,
        ann: { zones: [{ t1: g.t, t2: c[Math.min(c.length - 1, k + 30)].t, top: g.top, bot: g.bot, col: 'accent', label: 'FVG' }], marks: [{ t: c[i].t, pos: g.dir === 1 ? 'below' : 'above', text: 'déplacement', col: 'accent' }] },
        ex: { type: 'zone', top: Math.max(c[i].o, c[i].c), bot: Math.min(c[i].o, c[i].c), t1: c[i].t, t2: c[i].t, tol: a * 0.1, q: 'Cliquez sur la bougie de déplacement (grand corps qui part de la zone et laisse un vide).' } };
    }).filter(Boolean));
  };

  /* ---------------- statistiques réelles d'une liste d'occurrences ---------------- */
  function stats(occ) { const t = occ.map(o => o.trade).filter(x => x && (x.res === 'win' || x.res === 'loss')), w = t.filter(x => x.res === 'win').length, l = t.length - w;
    const R = t.reduce((s, x) => s + (x.res === 'win' ? x.rr : -1), 0); return { n: t.length, w, l, wr: t.length ? w / t.length : 0, R, exp: t.length ? R / t.length : 0 }; }

  const ALL = Object.assign({}, D, Object.fromEntries(Object.entries(U).map(([k, f]) => ['u_' + k, f])));
  const memo = {};
  async function occurrences(key, tf) {
    const id = key + ':' + tf; if (memo[id]) return memo[id];
    memo[id] = load(tf).then(d => { const occ = ALL[key](d.rows); occ.forEach(o => { o.tf = tf; o.tz = o.tz || NY; }); return { occ, rows: d.rows, label: d.label, from: d.from, stats: stats(occ) }; });
    memo[id].catch(() => { delete memo[id]; });
    return memo[id];
  }
  return { load, occurrences, stats, fday, fhm, lmin, NY, LDN, LABEL, NOTE, UM, keys: Object.keys(ALL) };
})();
