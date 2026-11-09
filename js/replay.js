/* Alerte Trading — Académie : simulateur « trader et backtester votre stratégie » (replay façon TradingView).
   Marchés : or, BTC, EUR/USD, S&P 500. L'élève choisit une semaine (ou remonte le temps), fait défiler le marché
   comme en réel, trace HH / HL / LH / LL, OB, FVG, MSS, Fibonacci (à la main ou automatique), puis ouvre une ou
   plusieurs positions dont il règle le stop et l'objectif en faisant glisser les lignes. Le professeur compare
   son analyse aux détecteurs du bot (sur les seules bougies visibles : aucune information du futur), explique,
   note chaque trade et suit le parcours de certification (objectif : 26 000 trades gagnants validés). */
(function () {
  'use strict';
  const TF = { '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400, '1D': 86400, '1W': 604800 };
  const HTF = { '5m': '1h', '15m': '4h', '30m': '4h', '1h': '1D', '4h': '1D', '1D': '1W', '1W': '1M' };
  const HTF_SEC = { '1h': 3600, '4h': 14400, '1D': 86400, '1W': 604800, '1M': 2592000 };
  const BIN_TF = { '1D': '1d', '1W': '1w' };
  const MONDAY = 4 * 86400; // l'époque Unix tombe un jeudi : +4 jours = lundi 00:00 UTC
  const bucket = (t, sec) => sec === 604800 ? Math.floor((t - MONDAY) / sec) * sec + MONDAY : Math.floor(t / sec) * sec;
  const SYM = {
    'XAU/USD': { name: 'Or', dec: 2, contract: 100, unit: 'lot', src: [{ y: 'GC=F', label: 'Or · future GC (COMEX), Yahoo' }, { b: 'PAXGUSDT', label: 'Or · PAXG (Binance)' }] },
    'BTC/USD': { name: 'Bitcoin', dec: 1, contract: 1, unit: 'BTC', src: [{ b: 'BTCUSDT', label: 'BTC/USDT (Binance)' }] },
    'EUR/USD': { name: 'EUR/USD', dec: 5, contract: 100000, unit: 'lot', src: [{ y: 'EURUSD=X', label: 'EUR/USD (Yahoo)' }, { b: 'EURUSDT', label: 'EUR/USDT (Binance)' }] },
    'US500': { name: 'S&P 500', dec: 2, contract: 1, unit: 'lot (1 $/pt)', src: [{ y: 'ES=F', label: 'S&P 500 · future E-mini (CME), Yahoo' }] }
  };
  const REWIND = [['1w', '1 semaine', 7 * 86400], ['4d', '4 jours', 4 * 86400], ['2d', '2 jours', 2 * 86400], ['1d', '1 journée', 86400],
    ['4h', '4 h', 14400], ['1h', '1 h', 3600], ['30m', '30 min', 1800], ['15m', '15 min', 900], ['5m', '5 min', 300], ['rand', 'Date au hasard', 0]];
  const SESS = [['Asie', 1200, 1440, '77,163,255'], ['Londres', 120, 300, '242,193,78'], ['New York AM', 420, 600, '31,224,161'], ['New York PM', 810, 960, '31,224,161']];
  const FIB = [0, 0.236, 0.382, 0.5, 0.618, 0.705, 0.79, 1, -0.272, -0.618];
  const HIST = 300, MAX_OPEN = 5;
  const HKEY = 'at:replay:v1', AGG = 'at:replay:agg', MIRROR = 'https://raw.githubusercontent.com/alfiokiangebeni-svg/Trading-app/data/market';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const R = {
    sym: lsGet('at:rp:sym', 'XAU/USD'), tf: lsGet('at:rp:tf', '15m'), period: lsGet('at:rp:period', 'w1'),
    balance: lsGet('at:rp:bal', 10000), goal: lsGet('at:rp:goal', 26000),
    all: [], cur: 0, sub: 0, live: null, startT: 0, endT: 0, playing: false, speed: 3, timer: null, acc: 0,
    tool: 'cursor', pending: null, draws: [], trend: null, showFix: false, marks: [],
    ticket: null, trades: [], equity: 0, msgs: [], loading: false, src: '', root: null, onBack: null, seq: 0, lastSess: null,
    customDate: lsGet('at:rp:date', ''), customStart: 0, nowT: 0, magnet: lsGet('at:rp:mag', true), hideDraws: false, undo: [], redo: [],
    stopWhen: null, guide: null
  };
  if (!SYM[R.sym]) R.sym = 'XAU/USD';
  if (!TF[R.tf]) R.tf = '15m';
  let chart = null, series = null, ov = null, octx = null, box = null, resizeObs = null, themeObs = null, plines = [], drag = null;
  const lib = () => window.AT && window.AT.lib;
  const fmt = (x, d) => window.AT ? window.AT.fmt(x, d) : String(x);
  const dec = () => SYM[R.sym].dec;
  const fp = x => fmt(x, dec());
  const DTF = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const DAYF = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'America/New_York' });
  const DSHORT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/New_York' });
  const NYD = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
  const fT = t => DTF.format(new Date(t * 1000));
  const nyMin = t => window.AT && window.AT.nyMinutes ? window.AT.nyMinutes(t) : (new Date(t * 1000).getUTCHours() * 60);
  function sessionOf(t) { const m = nyMin(t); for (const s of SESS) if (m >= s[1] && m < s[2]) return s[0]; return null; }

  /* ---------------- semaines ---------------- */
  function weeks(n) { // lundi 00:00 UTC des n dernières semaines
    const now = new Date(), d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
    const f = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }), out = [];
    for (let i = 0; i < n; i++) { const m = new Date(d.getTime() - i * 7 * 86400000), fri = new Date(m.getTime() + 4 * 86400000);
      out.push({ id: 'w' + i, mon: m.getTime() / 1000, label: (i === 0 ? 'Semaine en cours · ' : '') + `du lun. ${f.format(m)} au ven. ${f.format(fri)}` }); }
    return out;
  }

  /* ---------------- données ---------------- */
  async function getJSON(url) { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
  async function fromBinance(sym, tf, a, b) {
    const out = [], step = TF[tf] * 1000; let s = a * 1000;
    while (s < b * 1000) {
      let j = null;
      for (const h of ['https://data-api.binance.vision', 'https://api.binance.com']) {
        try { j = await getJSON(`${h}/api/v3/klines?symbol=${sym}&interval=${BIN_TF[tf] || tf}&startTime=${s}&endTime=${b * 1000}&limit=1000`); break; } catch (e) { j = null; }
      }
      if (!j) throw new Error('Binance injoignable');
      for (const k of j) out.push({ t: Math.floor(k[0] / 1000), o: +k[1], h: +k[2], l: +k[3], c: +k[4] });
      if (!j.length) break; s = j[j.length - 1][0] + step;
    }
    return out;
  }
  function aggregateTo(rows, sec) {
    const out = []; let cur = null;
    for (const x of rows) { const b = bucket(x.t, sec);
      if (!cur || cur.t !== b) { cur = { t: b, o: x.o, h: x.h, l: x.l, c: x.c }; out.push(cur); } else { cur.h = Math.max(cur.h, x.h); cur.l = Math.min(cur.l, x.l); cur.c = x.c; } }
    return out;
  }
  function parseYahoo(j) {
    const r = j && j.chart && j.chart.result && j.chart.result[0]; if (!r || !r.timestamp) return [];
    const q = r.indicators.quote[0], out = [];
    r.timestamp.forEach((t, i) => { if (q.close[i] != null && q.open[i] != null && q.high[i] != null && q.low[i] != null) out.push({ t, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i] }); });
    return out;
  }
  async function fromYahoo(sym, tf, a, b) {
    const MAP = { '5m': ['5m', 300, '5m'], '15m': ['15m', 900, '5m'], '30m': ['30m', 1800, '5m'], '1h': ['60m', 3600, '1h'], '4h': ['60m', 3600, '1h'], '1D': ['1d', 86400, '1d'], '1W': ['1wk', 604800, '1d'] };
    const [base, bsec, mfile] = MAP[tf], now = Date.now() / 1000;
    // Yahoo ne sert l'intraday que sur une profondeur limitée : 5 à 30 min ≈ 60 jours, 1 h ≈ 2 ans
    const directOk = bsec >= 86400 || (bsec === 3600 ? a > now - 725 * 86400 : a > now - 58 * 86400);
    let rows = [], baseSec = bsec;
    if (directOk) try { // direct (APK : HTTP natif ; PC : accès autorisé par Electron)
      rows = parseYahoo(await getJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${base}&period1=${a}&period2=${b}&includePrePost=true`));
    } catch (e) { rows = []; }
    if (rows.length < 50) { // copie GitHub qui s'allonge chaque jour (web-data.yml) : 5 min, 1 h et journalier
      const m = await getJSON(`${MIRROR}/${sym.replace(/[^A-Za-z0-9]/g, '_')}_${mfile}.json`);
      rows = (m.rows || []).filter(x => x[0] >= a && x[0] < b).map(x => ({ t: x[0], o: x[1], h: x[2], l: x[3], c: x[4] }));
      baseSec = mfile === '5m' ? 300 : mfile === '1h' ? 3600 : 86400;
    }
    const sec = TF[tf];
    return sec > baseSec ? aggregateTo(rows, sec) : rows;
  }
  async function fetchRange(tf, a, b) {
    for (const s of SYM[R.sym].src) {
      try { const rows = s.y ? await fromYahoo(s.y, tf, a, b) : await fromBinance(s.b, tf, a, b);
        if (rows.length >= 60) { const seen = new Set(); return { rows: rows.filter(x => !seen.has(x.t) && seen.add(x.t)).sort((p, q) => p.t - q.t), label: s.label }; } }
      catch (e) { /* source suivante */ }
    }
    throw new Error('aucune source');
  }
  async function load(keepTime) {
    const sec = TF[R.tf], now = Math.floor(Date.now() / 1000);
    let start, end = now;
    if (keepTime && R.all.length) { start = R.nowT || cursorTime(); end = Math.max(R.endT || now, start + 400 * sec); end = Math.min(end, now); }
    else if (R.period[0] === 'w') { const w = weeks(10).find(x => x.id === R.period) || weeks(1)[0]; start = w.mon - 3 * 3600; end = Math.min(now, w.mon + 5 * 86400 + 2 * 3600); }
    else if (R.period === 'rand') { start = now - Math.floor((3 + Math.random() * 50) * 86400); end = Math.min(now, start + 400 * sec); }
    else if (R.period === 'date' || R.period === 'guided') { start = R.period === 'date' ? Date.parse(R.customDate + 'T00:00:00Z') / 1000 - 3 * 3600 : R.customStart; end = Math.min(now, start + Math.max(400 * sec, 8 * 86400)); }
    else start = now - (REWIND.find(r => r[0] === R.period) || REWIND[2])[2];
    const anchor = start, seq = R.loadSeq = (R.loadSeq || 0) + 1; start = bucket(start, sec); // seule la dernière demande compte
    R.loading = true; renderStatus('Chargement des bougies…');
    let res; // marchés avec week-ends fermés : on prend plus d'historique pour avoir ~300 bougies
    try { res = await fetchRange(R.tf, start - Math.round(HIST * sec * (R.sym === 'BTC/USD' ? 1 : 1.5)), end); }
    catch (e) { if (seq !== R.loadSeq) return -2; R.loading = false; say(`Impossible de charger ${SYM[R.sym].name} en ${R.tf} pour cette période. Historique disponible : BTC depuis 2017 sur toutes les UT ; or et EUR/USD depuis 2020 en intraday (via Binance), plus de 10 ans en 1D / 1W ; S&P 500 : 5 à 30 min sur les derniers mois (copie qui s'allonge chaque jour), 1 h sur 2 ans, 1D / 1W sur plus de 10 ans. Essaie une UT plus grande ou une date plus récente.`, 'ko'); renderStatus(); return -1; }
    if (seq !== R.loadSeq) return -2; // une demande plus récente a pris le relais
    const all = res.rows; if (all.length && all[all.length - 1].t + sec > now) all.pop();
    R.all = all; R.src = res.label; R.loading = false; R.endT = end;
    let idx = all.findIndex(x => x.t + sec > anchor); if (idx < 0) idx = all.length; // une bougie pas encore terminée n'est jamais montrée
    R.cur = Math.min(all.length, Math.max(Math.min(40, all.length), idx)); R.sub = 0; R.live = null;
    if (!keepTime) { R.startT = anchor; R.nowT = anchor; }
    setData(); return all.length - R.cur;
  }
  function cursorTime() { return R.cur ? R.all[R.cur - 1].t + TF[R.tf] : 0; }
  const visible = () => R.all.slice(0, R.cur);
  const lastPx = () => R.live ? R.live.c : R.all[R.cur - 1].c;

  /* ---------------- graphique ---------------- */
  function buildChart() {
    const LC = window.LightweightCharts; if (!LC) return;
    box = R.root.querySelector('.rp-chart');
    chart = LC.createChart(box.querySelector('.rp-c'), {
      autoSize: true, crosshair: { mode: 0 },
      layout: { background: { type: 'solid', color: css('chart-bg') }, textColor: css('muted'), fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
      grid: { vertLines: { visible: false }, horzLines: { color: css('line') } },
      rightPriceScale: { borderColor: css('line') }, timeScale: { borderColor: css('line'), timeVisible: true, rightOffset: 14 },
      localization: { locale: 'fr-FR', priceFormatter: p => fp(p), timeFormatter: t => fT(t) }
    });
    const up = css('bull'), dn = css('bear');
    series = chart.addCandlestickSeries({ upColor: up, downColor: dn, borderUpColor: up, borderDownColor: dn, wickUpColor: up, wickDownColor: dn });
    ov = box.querySelector('canvas.rp-ov'); octx = ov.getContext('2d');
    const redraw = () => requestAnimationFrame(drawOverlay);
    chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    chart.subscribeCrosshairMove(redraw);
    resizeObs = new ResizeObserver(redraw); resizeObs.observe(box);
    bindPointer(box.querySelector('.rp-c'));
    themeObs = new MutationObserver(applyTheme); themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  function applyTheme() {
    if (!chart) return; const up = css('bull'), dn = css('bear');
    chart.applyOptions({ layout: { background: { type: 'solid', color: css('chart-bg') }, textColor: css('muted') }, grid: { horzLines: { color: css('line') } },
      rightPriceScale: { borderColor: css('line') }, timeScale: { borderColor: css('line') } });
    series.applyOptions({ upColor: up, downColor: dn, borderUpColor: up, borderDownColor: dn, wickUpColor: up, wickDownColor: dn });
    priceLines(); requestAnimationFrame(drawOverlay);
  }
  function destroyChart() { stop(); if (resizeObs) resizeObs.disconnect(); if (themeObs) themeObs.disconnect(); if (chart) chart.remove(); chart = series = null; plines = []; }
  function setData() {
    if (!series) return;
    series.applyOptions({ priceFormat: { type: 'price', precision: dec(), minMove: Math.pow(10, -dec()) } });
    series.setData(visible().map(x => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c })));
    chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, R.cur - 130), to: R.cur + 14 });
    priceLines(); applyMarks(); requestAnimationFrame(drawOverlay); renderStatus();
  }

  /* ---------------- souris / tactile : tracés et glisser des lignes SL / TP ---------------- */
  function lineHit(y) {
    let best = null, bd = 14;
    const cand = []; if (R.ticket) cand.push([R.ticket, 'sl'], [R.ticket, 'tp']);
    R.trades.filter(t => t.open).forEach(t => cand.push([t, 'sl'], [t, 'tp']));
    for (const [t, k] of cand) { const py = series.priceToCoordinate(t[k]); if (py != null && Math.abs(py - y) < bd) { bd = Math.abs(py - y); best = { t, k }; } }
    return best;
  }
  function bindPointer(el) {
    let down = null;
    const rel = e => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, r }; };
    el.addEventListener('pointerdown', e => {
      down = { x: e.clientX, y: e.clientY };
      if (!chart) return; const p = rel(e), hit = lineHit(p.y) || (R.tool === 'cursor' ? drawHit(p.x, p.y) : null);
      if (hit && hit.d) { commit(); drag = hit; chart.applyOptions({ handleScroll: false, handleScale: false }); try { el.setPointerCapture(e.pointerId); } catch (err) {} return; }
      if (hit) { drag = Object.assign(hit, { from: hit.t[hit.k] }); chart.applyOptions({ handleScroll: false, handleScale: false });
        try { el.setPointerCapture(e.pointerId); } catch (err) {} }
    }, true);
    el.addEventListener('pointermove', e => {
      if (!chart) return; const p = rel(e);
      if (drag && drag.d) { const d = drag.d; if (drag.k === 'p') d.p = series.coordinateToPrice(p.y); else { const sp = d.type === 'fib' ? snapPrice(p.x, p.y) : { t: timeAtX(p.x), p: series.coordinateToPrice(p.y) }; d['t' + drag.k] = sp.t; d['p' + drag.k] = sp.p; } requestAnimationFrame(drawOverlay); return; }
      if (drag) { const price = series.coordinateToPrice(p.y); if (price == null) return; drag.t[drag.k] = price; priceLines(); renderTicket(); renderPositions(); requestAnimationFrame(drawOverlay); return; }
      el.style.cursor = lineHit(p.y) ? 'ns-resize' : (R.tool === 'cursor' ? (drawHit(p.x, p.y) ? 'move' : '') : 'crosshair');
    }, true);
    el.addEventListener('pointerup', e => {
      if (drag && drag.d) { const dd = drag.d; drag = null; chart.applyOptions({ handleScroll: R.tool === 'cursor', handleScale: true }); down = null; if (dd.type === 'fib' && !dd.prof) checkFib(dd); requestAnimationFrame(drawOverlay); return; }
      if (drag) { const d = drag; drag = null; chart.applyOptions({ handleScroll: R.tool === 'cursor', handleScale: true }); afterDrag(d); down = null; return; }
      if (!down || !chart) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
      if (moved > 8) return; const p = rel(e);
      if (p.x > p.r.width - chart.priceScale('right').width() || p.y > p.r.height - chart.timeScale().height()) return;
      onClick({ x: p.x, y: p.y });
    }, true);
    el.addEventListener('pointercancel', () => { if (drag) { drag = null; chart && chart.applyOptions({ handleScroll: true, handleScale: true }); } down = null; }, true);
  }
  function afterDrag(d) {
    const t = d.t, k = d.k;
    if (t.open && k === 'sl') {
      if ((t.sl - lastPx()) * t.dir >= 0) { t.sl = d.from; say('Le stop ne peut pas être placé de l\'autre côté du prix actuel.', 'warn'); }
      else if (Math.abs(t.entry - t.sl) > Math.abs(t.entry - d.from) + 1e-12 && (t.sl - t.entry) * t.dir < 0) {
        t.widened = true; say(`Trade n°${t.id} : tu as éloigné ton stop (${fp(d.from)} → ${fp(t.sl)}), le risque monte à ${fmt(riskNow(t), 0)} $. Règle d'or : on ne déplace jamais son stop contre soi (ce trade ne pourra pas être validé).`, 'ko'); }
      else say(`Trade n°${t.id} : stop rapproché à ${fp(t.sl)}${Math.abs(t.sl - t.entry) < 1e-9 ? ' (break-even)' : ''}, risque réduit à ${fmt(riskNow(t), 0)} $.`, 'ok');
    } else if (t.open && k === 'tp') {
      if ((t.tp - lastPx()) * t.dir <= 0) { t.tp = d.from; say('L\'objectif doit rester au-delà du prix actuel.', 'warn'); }
      else say(`Trade n°${t.id} : objectif déplacé à ${fp(t.tp)}.`, 'info');
    }
    priceLines(); renderTicket(); renderPositions(); requestAnimationFrame(drawOverlay);
  }
  function logicalOf(t) { const a = R.all; if (!a.length) return 0; const sec = TF[R.tf];
    let lo = 0, hi = a.length - 1; if (t >= a[hi].t) return hi + (t - a[hi].t) / sec; if (t <= a[0].t) return (t - a[0].t) / sec;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m].t <= t) lo = m; else hi = m; } return lo + (t - a[lo].t) / (a[hi].t - a[lo].t); }
  const xOf = t => chart.timeScale().logicalToCoordinate(logicalOf(t));
  function candleAtX(x) { const l = chart.timeScale().coordinateToLogical(x); if (l == null) return null; const i = Math.round(l); if (i < 0 || i >= R.cur) return null; return { i, k: R.all[i] }; }
  function timeAtX(x) { const i = Math.round(chart.timeScale().coordinateToLogical(x)); if (i >= 0 && i < R.all.length) return R.all[i].t; const last = R.all[R.cur - 1]; return last.t + (i - (R.cur - 1)) * TF[R.tf]; }
  function snapPrice(x, y) { // aimant sur la mèche la plus proche
    const price = series.coordinateToPrice(y), ck = candleAtX(x); if (!ck || !R.magnet) return { t: ck ? ck.k.t : timeAtX(x), p: price, i: ck ? ck.i : undefined };
    const a = lib().atrArr(visible()), tol = a[a.length - 1] * 0.35;
    if (Math.abs(price - ck.k.h) <= tol) return { t: ck.k.t, p: ck.k.h, i: ck.i };
    if (Math.abs(price - ck.k.l) <= tol) return { t: ck.k.t, p: ck.k.l, i: ck.i };
    return { t: ck.k.t, p: price, i: ck.i };
  }

  /* ---------------- annuler / rétablir ---------------- */
  function commit() { R.undo.push(JSON.stringify(R.draws)); if (R.undo.length > 60) R.undo.shift(); R.redo = []; }
  function undo() { if (!R.undo.length) return; R.redo.push(JSON.stringify(R.draws)); R.draws = JSON.parse(R.undo.pop()); requestAnimationFrame(drawOverlay); }
  function redo() { if (!R.redo.length) return; R.undo.push(JSON.stringify(R.draws)); R.draws = JSON.parse(R.redo.pop()); requestAnimationFrame(drawOverlay); }
  function drawHit(x, y) { // poignées des tracés modifiables (ligne, tendance, Fibonacci)
    if (R.hideDraws) return null; let best = null, bd = 11; const Y = p => series.priceToCoordinate(p);
    for (const d of R.draws) {
      if (d.type === 'hline') { const py = Y(d.p); if (py != null && Math.abs(py - y) < 7 && Math.abs(py - y) < bd) { bd = Math.abs(py - y); best = { d, k: 'p' }; } }
      if (d.type === 'tline' || d.type === 'fib') for (const k of [1, 2]) { const px = xOf(d['t' + k]), py = Y(d['p' + k]); if (px == null || py == null) continue;
        const dist = Math.hypot(px - x, py - y); if (dist < bd) { bd = dist; best = { d, k }; } }
    }
    return best;
  }

  /* ---------------- outils ---------------- */
  const TOOLS = [['cursor', '↖', 'Curseur'], ['HH', 'HH', 'Higher high'], ['HL', 'HL', 'Higher low'], ['LH', 'LH', 'Lower high'], ['LL', 'LL', 'Lower low'],
    ['ob', 'OB', 'Order block'], ['fvg', 'FVG', 'Fair value gap'], ['mss', 'MSS', 'Market structure shift'], ['fib', 'Fib', 'Fibonacci manuel'],
    ['hline', '—', 'Ligne'], ['tline', '╱', 'Tendance'], ['erase', '⌫', 'Gomme']];
  const TIPS = { HH: 'HH : clique sur un sommet plus haut que le précédent (aimanté sur la mèche haute).', HL: 'HL : clique sur un creux plus haut que le précédent (mèche basse).',
    LH: 'LH : clique sur un sommet plus bas que le précédent.', LL: 'LL : clique sur un creux plus bas que le précédent.', ob: 'OB : clique sur la dernière bougie opposée avant l\'impulsion.',
    fvg: 'FVG : clique sur la bougie du milieu d\'un mouvement de 3 bougies.', mss: 'MSS : clique sur la bougie qui casse la structure contraire avec force (déplacement).',
    fib: 'Fibonacci : clique sur le début puis la fin du mouvement (aimanté sur les mèches).', hline: 'Clique à la hauteur du niveau.', tline: 'Clique sur deux points.', erase: 'Clique sur un tracé pour l\'effacer.' };
  function onClick(pt) {
    if (R.tool === 'cursor' || !R.cur) return;
    const ck = candleAtX(pt.x), price = series.coordinateToPrice(pt.y);
    if (R.tool === 'erase') { eraseNear(pt.x, pt.y); return; }
    if (!(R.tool === 'fib' || R.tool === 'tline') || R.pending) commit();
    if (['HH', 'HL', 'LH', 'LL'].includes(R.tool)) {
      if (!ck) return; const hi = R.tool === 'HH' || R.tool === 'LH';
      R.draws = R.draws.filter(d => !(d.type === 'sw' && d.t === ck.k.t && d.hi === hi));
      const d = { type: 'sw', lab: R.tool, hi, t: ck.k.t, p: hi ? ck.k.h : ck.k.l, i: ck.i, tf: R.tf }; R.draws.push(d); checkSwing(d);
    } else if (R.tool === 'ob') {
      if (!ck) return; const k = ck.k, d = { type: 'ob', t: k.t, top: k.h, bot: k.l, dir: k.c < k.o ? 1 : -1, i: ck.i, tf: R.tf }; R.draws.push(d); quickOB(d);
    } else if (R.tool === 'fvg') {
      if (!ck || ck.i < 1 || ck.i + 1 >= R.cur) { say('Pour un FVG, clique sur la bougie du milieu d\'un mouvement de 3 bougies déjà clôturées.', 'warn'); return; }
      const a = R.all[ck.i - 1], c = R.all[ck.i + 1]; let d;
      if (c.l > a.h) d = { type: 'fvg', t: R.all[ck.i].t, top: c.l, bot: a.h, dir: 1, i: ck.i, tf: R.tf };
      else if (c.h < a.l) d = { type: 'fvg', t: R.all[ck.i].t, top: a.l, bot: c.h, dir: -1, i: ck.i, tf: R.tf };
      else { say(`Pas de FVG ici : les mèches des bougies 1 et 3 se recouvrent (${fp(a.l)} – ${fp(a.h)} et ${fp(c.l)} – ${fp(c.h)}). Un FVG est un trou entre les deux.`, 'warn'); return; }
      R.draws.push(d); quickFVG(d);
    } else if (R.tool === 'mss') { if (!ck) return; markMSS(ck.i); }
    else if (R.tool === 'fib') {
      const s = snapPrice(pt.x, pt.y);
      if (!R.pending) { R.pending = s; renderStatus('Fibonacci : clique maintenant sur la fin du mouvement.'); requestAnimationFrame(drawOverlay); return; }
      const d = { type: 'fib', t1: R.pending.t, p1: R.pending.p, t2: s.t, p2: s.p, tf: R.tf }; R.pending = null; R.draws.push(d); checkFib(d);
    } else if (R.tool === 'hline') R.draws.push({ type: 'hline', p: R.magnet ? snapPrice(pt.x, pt.y).p : price });
    else if (R.tool === 'tline') {
      if (!R.pending) { R.pending = { t: timeAtX(pt.x), p: price }; renderStatus('Deuxième clic pour terminer la ligne.'); return; }
      R.draws.push({ type: 'tline', t1: R.pending.t, p1: R.pending.p, t2: timeAtX(pt.x), p2: price }); R.pending = null;
    }
    requestAnimationFrame(drawOverlay);
  }
  function eraseNear(x, y) {
    let best = -1, bd = 18;
    const seg = (ax, ay, bx, by) => { if ([ax, ay, bx, by].some(v => v == null)) return 1e9; const L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1; const u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2)); return Math.hypot(ax + u * (bx - ax) - x, ay + u * (by - ay) - y); };
    R.draws.forEach((d, i) => {
      let dist = 1e9; const Y = p => series.priceToCoordinate(p);
      if (d.type === 'sw') { const px = xOf(d.t), py = Y(d.p); if (px != null && py != null) dist = Math.hypot(px - x, py - y); }
      else if (d.type === 'hline') { const py = Y(d.p); if (py != null) dist = Math.abs(py - y); }
      else if (d.type === 'ob' || d.type === 'fvg') { const y0 = Y(d.top), y1 = Y(d.bot), x0 = xOf(d.t); if (y0 != null && y1 != null && x0 != null && x >= x0 - 6 && y >= Math.min(y0, y1) - 6 && y <= Math.max(y0, y1) + 6) dist = 0; }
      else if (d.type === 'tline' || d.type === 'fib' || d.type === 'mss') dist = seg(xOf(d.t1), Y(d.p1), xOf(d.t2), Y(d.p2 != null ? d.p2 : d.p1));
      if (dist < bd) { bd = dist; best = i; }
    });
    if (best >= 0) { commit(); R.draws.splice(best, 1); requestAnimationFrame(drawOverlay); }
  }

  /* ---------------- dessin ---------------- */
  function drawOverlay() {
    if (!chart || !ov) return;
    const r = box.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    ov.width = Math.round(r.width * dpr); ov.height = Math.round(r.height * dpr); ov.style.width = r.width + 'px'; ov.style.height = r.height + 'px';
    const g = octx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
    if (!R.cur) return;
    const W = r.width - chart.priceScale('right').width(), H = r.height - chart.timeScale().height(), ts = chart.timeScale();
    const Y = p => series.priceToCoordinate(p);
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    const F = '600 10px "JetBrains Mono", monospace'; g.font = F;
    const col = { bull: css('bull'), bear: css('bear'), acc: css('accent'), mut: css('muted'), fg: css('fg'), faint: css('faint') };
    // ---- journées et sessions (heure de New York)
    const rng = ts.getVisibleLogicalRange();
    const daily = TF[R.tf] >= 86400;
    if (rng && daily) { // séparateurs de mois
      const a = Math.max(0, Math.floor(rng.from)), b = Math.min(R.cur - 1, Math.ceil(rng.to)); let pm = null;
      for (let i = a; i <= b; i++) { const dt = new Date(R.all[i].t * 1000), m = dt.getUTCFullYear() * 12 + dt.getUTCMonth(), x = ts.logicalToCoordinate(i); if (x == null) continue;
        if (pm !== null && m !== pm) { g.strokeStyle = col.faint; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); g.setLineDash([]);
          g.fillStyle = col.mut; g.font = '700 11px "Inter", sans-serif'; g.fillText(dt.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' }), x + 4, 14); g.font = F; }
        pm = m; }
    }
    if (rng && !daily) {
      const a = Math.max(0, Math.floor(rng.from)), b = Math.min(R.cur - 1, Math.ceil(rng.to));
      const bw = Math.max(1, Math.abs((ts.logicalToCoordinate(1) || 0) - (ts.logicalToCoordinate(0) || 0)) || 6);
      let prevDay = null, runS = null, runX0 = 0, lastLab = -1e9; const showSess = TF[R.tf] <= 3600;
      const flush = xEnd => { if (!runS || !showSess) return; const s = SESS.find(z => z[0] === runS); g.fillStyle = `rgba(${s[3]},0.06)`; g.fillRect(runX0, 0, xEnd - runX0, H);
        g.fillStyle = `rgba(${s[3]},0.6)`; g.fillRect(runX0, H - 4, xEnd - runX0, 4); if (xEnd - runX0 > 44) { g.fillStyle = `rgba(${s[3]},0.95)`; g.fillText(runS, runX0 + 3, H - 8); } };
      for (let i = a; i <= b; i++) {
        const t = R.all[i].t, x = ts.logicalToCoordinate(i); if (x == null) continue;
        const s = sessionOf(t);
        if (s !== runS) { flush(x - bw / 2); runS = s; runX0 = x - bw / 2; }
        const day = NYD.format(new Date(t * 1000));
        if (prevDay !== null && day !== prevDay && (TF[R.tf] < 14400 || x - lastLab > 78)) { g.strokeStyle = col.faint; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x - bw / 2, 0); g.lineTo(x - bw / 2, H); g.stroke(); g.setLineDash([]);
          if (x - lastLab > 78) { lastLab = x; g.fillStyle = col.mut; g.font = '700 11px "Inter", sans-serif'; g.fillText(DSHORT.format(new Date(t * 1000)), x - bw / 2 + 4, 14); g.font = F; } }
        prevDay = day;
      }
      flush((ts.logicalToCoordinate(b) || 0) + bw / 2);
    }
    const zone = (d, dashed, alpha) => {
      const y0 = Y(d.top), y1 = Y(d.bot); let x0 = xOf(d.t); if (y0 == null || y1 == null) return; if (x0 == null) x0 = 0;
      const c = d.type === 'fvg' ? col.acc : (d.dir === 1 ? col.bull : col.bear);
      g.globalAlpha = alpha; g.fillStyle = c; g.fillRect(x0, Math.min(y0, y1), W - x0, Math.max(2, Math.abs(y1 - y0))); g.globalAlpha = 1;
      g.strokeStyle = c; g.setLineDash(dashed ? [5, 4] : []); g.strokeRect(x0 + .5, Math.min(y0, y1) + .5, W - x0 - 1, Math.max(2, Math.abs(y1 - y0)) - 1); g.setLineDash([]);
      g.fillStyle = c; g.fillText((d.type === 'fvg' ? 'FVG' : 'OB') + (dashed ? ' (prof)' : ''), x0 + 4, Math.min(y0, y1) + 11);
    };
    const fib = (d, dashed) => {
      const xa = xOf(d.t1), xb = xOf(d.t2), x0 = Math.min(xa == null ? 0 : xa, xb == null ? 0 : xb), A = d.p1, B = d.p2, span = B - A;
      const yo1 = Y(B - span * 0.62), yo2 = Y(B - span * 0.79);
      if (yo1 != null && yo2 != null) { g.fillStyle = col.acc; g.globalAlpha = dashed ? 0.06 : 0.12; g.fillRect(x0, Math.min(yo1, yo2), W - x0, Math.abs(yo2 - yo1)); g.globalAlpha = 1; }
      for (const lv of FIB) { const y = Y(B - span * lv); if (y == null) continue;
        const key = lv === 0.5 || lv === 0.618 || lv === 0.705 || lv === 0.79; g.strokeStyle = key ? col.acc : col.mut; g.setLineDash(dashed ? [5, 4] : (lv < 0 ? [2, 3] : []));
        g.beginPath(); g.moveTo(x0, y); g.lineTo(W, y); g.stroke(); g.setLineDash([]);
        g.fillStyle = g.strokeStyle; const pc = `${String(+(Math.abs(lv) * 100).toFixed(1)).replace('.', ',')} %`; g.fillText(W < 520 ? (lv < 0 ? '−' : '') + pc : `${lv < 0 ? 'cible ' : ''}${pc} · ${fp(B - span * lv)}`, x0 + 4, y - 3); }
      const ay = Y(A), by = Y(B);
      if ([xa, ay, xb, by].every(v => v != null)) { g.strokeStyle = col.fg; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(xa, ay); g.lineTo(xb, by); g.stroke(); g.setLineDash([]); }
      const ym = Y(B - span * 0.705); if (ym != null && W >= 520) { g.fillStyle = col.acc; g.fillText(dashed ? 'OTE (prof)' : 'OTE 62–79 %', W - 96, ym + 4); }
    };
    // ---- correction du professeur
    if (R.showFix && R.cur > 30) {
      const fx = teacherView();
      fx.obs.forEach(o => zone(Object.assign({ type: 'ob' }, o), true, 0.06));
      fx.fvgs.forEach(f => zone(Object.assign({ type: 'fvg' }, f), true, 0.06));
      fx.swings.forEach(s => { const x = xOf(s.t), y = Y(s.p); if (x == null || y == null) return;
        g.strokeStyle = col.acc; g.setLineDash([3, 3]); g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        g.fillStyle = col.acc; g.fillText(s.label, x - 8, s.hi ? y - 12 : y + 20); });
      fx.events.forEach(e => { const x0 = xOf(e.tFrom), x1 = xOf(e.t), y = Y(e.level); if (x0 == null || x1 == null || y == null) return;
        g.strokeStyle = e.dir === 1 ? col.bull : col.bear; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.setLineDash([]);
        g.fillStyle = g.strokeStyle; g.fillText(e.mss ? 'MSS' : e.kind, (x0 + x1) / 2 - 12, y + (e.dir === 1 ? -4 : 12)); });
      if (fx.leg) fib(fx.leg, true);
    }
    // ---- tracés de l'élève et du professeur
    for (const d of (R.hideDraws ? [] : R.draws)) {
      if (d.type === 'ob' || d.type === 'fvg') zone(d, !!d.prof, d.prof ? 0.1 : 0.14);
      else if (d.type === 'fib') fib(d, !!d.prof);
      else if (d.type === 'hline') { const y = Y(d.p); if (y == null) continue; const c = d.prof ? col.acc : col.fg; g.strokeStyle = c; g.setLineDash(d.prof ? [6, 4] : []); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.setLineDash([]); g.fillStyle = c; g.fillText((d.label ? d.label + ' · ' : '') + fp(d.p), 4, y - 3);
        if (R.tool === 'cursor' && !d.prof) { g.fillStyle = c; g.fillRect(W / 2 - 4, y - 4, 8, 8); } }
      else if (d.type === 'tline') { const ax = xOf(d.t1), ay = Y(d.p1), bx = xOf(d.t2), by = Y(d.p2); if ([ax, ay, bx, by].some(v => v == null)) continue;
        const k = (by - ay) / ((bx - ax) || 1); g.strokeStyle = col.fg; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ax, ay); g.lineTo(W, ay + k * (W - ax)); g.stroke(); g.lineWidth = 1; }
      else if (d.type === 'mss') { const x0 = xOf(d.t1), x1 = xOf(d.t2), y = Y(d.p1); if (x0 == null || x1 == null || y == null) continue;
        g.strokeStyle = d.dir === 1 ? col.bull : col.bear; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.lineWidth = 1;
        g.fillStyle = g.strokeStyle; g.font = '700 11px "JetBrains Mono", monospace'; g.fillText(d.label || (d.ok ? 'MSS' : 'MSS ?'), (x0 + x1) / 2 - 14, y + (d.dir === 1 ? -6 : 15)); g.font = F; }
    }
    if (R.tool === 'cursor' && !R.hideDraws) for (const d of R.draws) if ((d.type === 'tline' || d.type === 'fib') && !d.prof) for (const k of [1, 2]) { const x = xOf(d['t' + k]), y = Y(d['p' + k]); if (x == null || y == null) continue; g.fillStyle = css('surface-solid'); g.strokeStyle = col.acc; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); g.stroke(); }
    const sws = (R.hideDraws ? [] : R.draws).filter(d => d.type === 'sw' && !d.prof).sort((a, b) => a.t - b.t);
    for (const m of (R.hideDraws ? [] : R.draws).filter(d => d.type === 'sw' && d.prof)) { const x = xOf(m.t), y = Y(m.p); if (x == null || y == null) continue;
      g.strokeStyle = col.acc; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1; g.fillStyle = col.acc; g.font = '700 11px "JetBrains Mono", monospace'; g.fillText(m.lab, x - 9, m.hi ? y - 12 : y + 21); g.font = F; }
    if (sws.length > 1) { g.strokeStyle = col.mut; g.beginPath(); let first = true; for (const m of sws) { const x = xOf(m.t), y = Y(m.p); if (x == null || y == null) continue; if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y); } g.stroke(); }
    for (const m of sws) { const x = xOf(m.t), y = Y(m.p); if (x == null || y == null) continue;
      g.fillStyle = m.hi ? col.bear : col.bull; g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill();
      g.font = '700 11px "JetBrains Mono", monospace'; g.fillText(m.lab, x - 9, m.hi ? y - 9 : y + 17); g.font = F; }
    if (R.pending) { const x = xOf(R.pending.t), y = Y(R.pending.p); if (x != null && y != null) { g.fillStyle = col.fg; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); } }
    const xs = xOf(R.startT); if (xs != null && xs > 0) { g.strokeStyle = col.acc; g.globalAlpha = .45; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(xs, 0); g.lineTo(xs, H); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; g.fillStyle = col.acc; g.fillText('départ', xs + 4, 26); }
    // poignées « ⇕ » pour glisser stop / objectif
    const handles = []; if (R.ticket) handles.push(R.ticket); R.trades.filter(t => t.open).forEach(t => handles.push(t));
    for (const t of handles) for (const k of ['sl', 'tp']) { const y = Y(t[k]); if (y == null) continue;
      g.fillStyle = k === 'sl' ? col.bear : col.bull; g.beginPath(); if (g.roundRect) g.roundRect(W - 52, y - 9, 46, 18, 6); else g.rect(W - 52, y - 9, 46, 18); g.fill();
      g.fillStyle = '#fff'; g.fillText('⇕ ' + k.toUpperCase(), W - 47, y + 4); }
    g.restore();
  }

  /* ---------------- le professeur ---------------- */
  function teacherView() {
    const L = lib(), vis = visible(), n = vis.length, from = Math.max(0, n - 160);
    const atr = L.atrArr(vis), sw = L.findSwings(vis, 3), ms = L.marketStructure(vis, sw);
    const label = (arr, hi) => { const out = []; let prev = null; for (const s of arr) { out.push({ t: s.t, p: s.p, i: s.i, hi, label: prev == null ? (hi ? 'H' : 'B') : hi ? (s.p > prev ? 'HH' : 'LH') : (s.p > prev ? 'HL' : 'LL') }); prev = s.p; } return out; };
    const swings = label(sw.hs, true).concat(label(sw.ls, false)).filter(s => s.i >= from);
    const obs = L.orderBlocks(vis, ms.events).filter(o => !o.broken && o.i >= from).slice(-6);
    const fvgs = L.fairValueGaps(vis, atr).filter(f => !f.filled && f.i >= from).slice(-6);
    const events = ms.events.filter(e => e.at >= from).slice(-6).map(e => Object.assign({}, e, { mss: e.kind === 'CHoCH' && Math.abs(vis[e.at].c - vis[e.at].o) >= 1.2 * atr[e.at] }));
    let htf = 0; const Hc = L.aggregate(vis, HTF_SEC[HTF[R.tf]]).slice(0, -1);
    if (Hc.length >= 12) htf = L.marketStructure(Hc, L.findSwings(Hc, 2)).trend;
    const Hh = ms.lastH ? ms.lastH.p : null, Ll = ms.lastL ? ms.lastL.p : null, px = vis[n - 1].c;
    const pos = Hh != null && Ll != null && Hh > Ll ? (px - Ll) / (Hh - Ll) : null;
    let leg = null; const hs = sw.hs, ls = sw.ls; // dernière jambe d'impulsion (Fibonacci automatique)
    if (hs.length && ls.length) {
      const h = hs[hs.length - 1], l = ls[ls.length - 1];
      if (ms.trend === 1 || (ms.trend === 0 && h.i > l.i)) { const l0 = ls.filter(x => x.i < h.i).pop(); if (l0) leg = { t1: l0.t, p1: l0.p, t2: h.t, p2: h.p, i1: l0.i, i2: h.i, dir: 1 }; }
      else { const h0 = hs.filter(x => x.i < l.i).pop(); if (h0) leg = { t1: h0.t, p1: h0.p, t2: l.t, p2: l.p, i1: h0.i, i2: l.i, dir: -1 }; }
    }
    return { swings, obs, fvgs, events, trend: ms.trend, lastEv: ms.events[ms.events.length - 1] || null, htf, atr: atr[n - 1], pos, Hh, Ll, px, sw, from, leg };
  }
  const trendTxt = t => t === 1 ? 'haussière' : t === -1 ? 'baissière' : 'sans direction claire (range)';
  function explainTrend(fx) {
    const hs = fx.swings.filter(s => s.hi).slice(-2), ls = fx.swings.filter(s => !s.hi).slice(-2), parts = [];
    if (hs.length === 2) parts.push(`sommets ${hs[1].p > hs[0].p ? 'croissants' : 'décroissants'} (${fp(hs[0].p)} → ${fp(hs[1].p)}, ${hs[1].label})`);
    if (ls.length === 2) parts.push(`creux ${ls[1].p > ls[0].p ? 'croissants' : 'décroissants'} (${fp(ls[0].p)} → ${fp(ls[1].p)}, ${ls[1].label})`);
    const ev = fx.lastEv ? `Dernier événement : ${fx.lastEv.kind} ${fx.lastEv.dir === 1 ? 'haussier' : 'baissier'} clôturé au-delà de ${fp(fx.lastEv.level)} le ${fT(fx.lastEv.t)}.` : '';
    const hUp = hs.length === 2 ? hs[1].p > hs[0].p : null, lUp = ls.length === 2 ? ls[1].p > ls[0].p : null;
    const against = fx.trend !== 0 && hUp !== null && lUp !== null && hUp === lUp && (hUp ? -1 : 1) === fx.trend;
    const note = against ? ` Attention : les derniers sommets et creux vont encore dans l'autre sens ; c'est la dernière cassure (${fx.lastEv ? fx.lastEv.kind : 'BOS'}) qui vient d'inverser la tendance. Retournement à confirmer par un ${fx.trend === 1 ? 'HL (creux plus haut)' : 'LH (sommet plus bas)'}.` : '';
    return `La tendance ${R.tf} est ${trendTxt(fx.trend)} : ${parts.join(' et ') || 'pas assez de swings visibles'}. ${ev}${note} Sur l'UT supérieure (${HTF[R.tf]}), elle est ${trendTxt(fx.htf)}.`;
  }
  function checkSwing(d) {
    const fx = teacherView(), real = fx.sw[d.hi ? 'hs' : 'ls'].find(s => Math.abs(s.i - d.i) <= 2);
    const prev = R.draws.filter(x => x.type === 'sw' && x.hi === d.hi && x.t < d.t).sort((a, b) => a.t - b.t).pop();
    const ref = prev ? prev.p : (fx.sw[d.hi ? 'hs' : 'ls'].filter(s => s.i < d.i - 2).pop() || {}).p;
    const want = ref == null ? null : d.hi ? (d.p > ref ? 'HH' : 'LH') : (d.p > ref ? 'HL' : 'LL');
    if (!real) say(`Ce point n'est pas un vrai ${d.hi ? 'sommet' : 'creux'} : un swing ${d.hi ? 'haut' : 'bas'} a des bougies ${d.hi ? 'plus basses' : 'plus hautes'} de chaque côté.`, 'warn');
    else if (want && want !== d.lab) say(`Tu as marqué ${d.lab}, mais ce ${d.hi ? 'sommet' : 'creux'} (${fp(d.p)}) est ${d.p > ref ? 'plus haut' : 'plus bas'} que le précédent (${fp(ref)}) : c'est un <b>${want}</b>.`, 'ko');
    else if (want) say(`${d.lab} correct (${fp(d.p)} ${d.p > ref ? '>' : '<'} ${fp(ref)}).`, 'ok');
    if (R.draws.filter(x => x.type === 'sw').length === 4) say('Avec deux sommets et deux creux, la structure apparaît : HH + HL = tendance haussière, LH + LL = baissière. Déclare la tendance à droite.', 'tip');
  }
  function quickOB(d) {
    const fx = teacherView(), match = fx.obs.find(o => Math.abs(o.i - d.i) <= 1);
    const broken = R.all.slice(d.i + 1, R.cur).some(x => d.dir === 1 ? x.c < d.bot : x.c > d.top);
    if (broken) say(`Cet OB a déjà été cassé (clôture ${d.dir === 1 ? 'sous' : 'au-dessus de'} la zone) : il n'est plus valable.`, 'warn');
    else if (match) say(`Bon OB ${match.dir === 1 ? 'haussier' : 'baissier'} : dernière bougie ${match.dir === 1 ? 'baissière' : 'haussière'} avant l'impulsion qui a cassé la structure. Zone ${fp(match.bot)} – ${fp(match.top)}.`, 'ok');
    else { const any = fx.obs.filter(o => o.dir === d.dir).pop();
      say(`Je ne valide pas cet OB : c'est la dernière bougie ${d.dir === 1 ? 'baissière avant une impulsion haussière' : 'haussière avant une impulsion baissière'} qui casse un sommet / creux (BOS ou CHoCH). ${any ? `Regarde plutôt ${fp(any.bot)} – ${fp(any.top)} (${fT(any.t)}).` : 'Aucun OB intact de ce sens dans la zone récente.'}`, 'warn'); }
  }
  function quickFVG(d) {
    const filled = R.all.slice(d.i + 2, R.cur).some(x => d.dir === 1 ? x.l <= d.bot : x.h >= d.top);
    say(filled ? `FVG ${d.dir === 1 ? 'haussier' : 'baissier'} correct, mais déjà comblé : il a perdu l'essentiel de son intérêt.`
      : `FVG ${d.dir === 1 ? 'haussier' : 'baissier'} correct (${fp(d.bot)} – ${fp(d.top)}) et encore ouvert : zone ${d.dir === 1 ? 'd\'achat' : 'de vente'} si la tendance va dans ce sens.`, filled ? 'warn' : 'ok');
  }
  function markMSS(i) {
    const L = lib(), vis = visible(), atr = L.atrArr(vis), ms = L.marketStructure(vis, L.findSwings(vis, 2));
    const e = ms.events.filter(x => Math.abs(x.at - i) <= 1).pop();
    if (!e) { R.draws.push({ type: 'mss', t1: R.all[Math.max(0, i - 6)].t, t2: R.all[i].t, p1: R.all[i].c, dir: R.all[i].c >= R.all[i].o ? 1 : -1, ok: false });
      say('Aucune cassure de structure à cette bougie : un MSS est une clôture au-delà du dernier sommet (ou creux) qui inverse la tendance.', 'ko'); return; }
    const body = Math.abs(vis[e.at].c - vis[e.at].o), disp = body >= 1.2 * atr[e.at], ok = e.kind === 'CHoCH' && disp;
    R.draws.push({ type: 'mss', t1: e.tFrom, t2: e.t, p1: e.level, dir: e.dir, ok });
    if (ok) say(`MSS ${e.dir === 1 ? 'haussier' : 'baissier'} valide : la bougie casse ${e.dir === 1 ? 'le dernier sommet' : 'le dernier creux'} (${fp(e.level)}) contre l'ancienne tendance, avec un déplacement (corps ${(body / atr[e.at]).toFixed(1)} × ATR). Cherche maintenant un retour sur l'OB / FVG laissé par ce mouvement, idéalement dans l'OTE du Fibonacci.`, 'ok');
    else if (e.kind === 'CHoCH') say(`C'est bien un changement de structure (CHoCH), mais sans déplacement (corps ${(body / atr[e.at]).toFixed(1)} × ATR, il faut au moins 1,2) : MSS faible, prudence.`, 'warn');
    else say('C\'est un BOS (cassure dans le sens de la tendance), pas un MSS : un MSS casse la structure <b>contraire</b>.', 'ko');
  }
  function checkFib(d) {
    const fx = teacherView(), leg = fx.leg, i1 = logicalOf(d.t1), i2 = logicalOf(d.t2), up = d.p2 > d.p1;
    if (!leg) { say('Fibonacci tracé. Mesure toujours la dernière jambe d\'impulsion : du creux au sommet en tendance haussière, du sommet au creux en baissière.', 'info'); return; }
    const okA = Math.abs(i1 - leg.i1) <= 2 && Math.abs(d.p1 - leg.p1) <= fx.atr * 0.5, okB = Math.abs(i2 - leg.i2) <= 2 && Math.abs(d.p2 - leg.p2) <= fx.atr * 0.5;
    const ote = `${fp(Math.min(leg.p2 - (leg.p2 - leg.p1) * 0.79, leg.p2 - (leg.p2 - leg.p1) * 0.62))} – ${fp(Math.max(leg.p2 - (leg.p2 - leg.p1) * 0.79, leg.p2 - (leg.p2 - leg.p1) * 0.62))}`;
    if (okA && okB) say(`Fibonacci bien placé sur la dernière jambe ${leg.dir === 1 ? 'haussière' : 'baissière'} (${fp(leg.p1)} → ${fp(leg.p2)}). Zone OTE 62–79 % : ${ote}.`, 'ok');
    else if ((leg.dir === 1) !== up) say(`Fibonacci tracé dans le mauvais sens : en tendance ${leg.dir === 1 ? 'haussière, du creux vers le sommet' : 'baissière, du sommet vers le creux'}. La dernière jambe va de ${fp(leg.p1)} à ${fp(leg.p2)}.`, 'ko');
    else say(`Bon sens, mais pas sur les bons points. La dernière jambe va de ${fp(leg.p1)} (${fT(leg.t1)}) à ${fp(leg.p2)} (${fT(leg.t2)}) : accroche le Fibonacci sur les mèches de ces swings (bouton « Fibo auto » pour comparer).`, 'warn');
  }
  function autoFib() {
    if (!R.cur) return; const fx = teacherView(), leg = fx.leg;
    if (!leg) { say('Pas encore assez de swings visibles pour tracer un Fibonacci automatique.', 'warn'); return; }
    commit(); R.draws = R.draws.filter(d => !(d.type === 'fib' && d.auto)); R.draws.push(Object.assign({ type: 'fib', auto: true, tf: R.tf }, leg));
    const span = leg.p2 - leg.p1, o1 = leg.p2 - span * 0.62, o2 = leg.p2 - span * 0.79, eq = leg.p2 - span * 0.5;
    const inOte = fx.px <= Math.max(o1, o2) && fx.px >= Math.min(o1, o2);
    say(`<b>Fibonacci automatique</b> sur la dernière jambe ${leg.dir === 1 ? 'haussière' : 'baissière'} : ${fp(leg.p1)} → ${fp(leg.p2)}. Équilibre 50 % = ${fp(eq)}. OTE 62–79 % = ${fp(Math.min(o1, o2))} – ${fp(Math.max(o1, o2))}${inOte ? ' : <b>le prix y est maintenant</b>, cherche une confirmation (MSS ou bougie de rejet).' : ' : attends que le prix y revienne.'} Cibles d'extension : ${fp(leg.p2 + span * 0.272)} et ${fp(leg.p2 + span * 0.618)}.`, 'tip');
    requestAnimationFrame(drawOverlay);
  }
  function reviewAnalysis(silent) {
    const fx = teacherView(), notes = [];
    const majors = fx.swings.slice(-8), marks = R.draws.filter(d => d.type === 'sw' && d.tf === R.tf && !d.prof);
    const near = m => fx.swings.find(s => m.hi === s.hi && Math.abs(logicalOf(m.t) - s.i) <= 2);
    const found = majors.filter(s => marks.some(m => m.hi === s.hi && Math.abs(logicalOf(m.t) - s.i) <= 2));
    const goodLab = marks.filter(m => { const s = near(m); return s && (s.label === m.lab || s.label.length === 1); }).length;
    const extra = marks.filter(m => !near(m) && logicalOf(m.t) >= fx.from);
    const sStruct = Math.max(0, Math.min(25, majors.length ? Math.round(18 * found.length / majors.length + (marks.length ? 7 * goodLab / marks.length : 0)) - Math.min(8, extra.length * 2) : 0));
    if (!marks.length) notes.push(['ko', 'Structure', 'Aucun HH / HL / LH / LL marqué. Commence toujours par la structure : c\'est la base de la lecture SMC.']);
    else {
      notes.push([found.length >= majors.length * 0.6 ? 'ok' : 'warn', 'Structure', `${found.length} des ${majors.length} swings importants trouvés, ${goodLab} étiquette(s) juste(s) sur ${marks.length}${extra.length ? `, ${extra.length} point(s) qui ne sont pas de vrais swings` : ''}.`]);
      const miss = majors.filter(s => !found.includes(s)).slice(-3).map(s => `${s.label} à ${fp(s.p)} (${fT(s.t)})`);
      if (miss.length) notes.push(['info', 'Oubliés', miss.join(' · ') + '. Coche « Correction » pour les voir.']);
    }
    let sTrend = 0;
    if (R.trend == null) notes.push(['ko', 'Tendance', 'Tendance non déclarée. ' + explainTrend(fx)]);
    else if (R.trend === fx.trend) { sTrend = 15; notes.push(['ok', 'Tendance', 'Exact. ' + explainTrend(fx)]); }
    else notes.push(['ko', 'Tendance', `Tu as indiqué une tendance ${trendTxt(R.trend)}. ${explainTrend(fx)}`]);
    const zones = R.draws.filter(d => (d.type === 'ob' || d.type === 'fvg') && d.tf === R.tf && !d.prof);
    let good = 0;
    zones.forEach(z => { const broken = R.all.slice(z.i + 1, R.cur).some(x => z.dir === 1 ? x.c < z.bot : x.c > z.top); const ok = z.type === 'fvg' || fx.obs.some(o => Math.abs(o.i - z.i) <= 1); if (ok && !broken) good++; });
    const hasMss = R.draws.some(d => d.type === 'mss' && d.ok && !d.prof), hasFib = R.draws.some(d => d.type === 'fib' && !d.prof);
    const sZones = Math.min(20, (zones.length ? Math.round(16 * good / zones.length) : 0) + (hasMss ? 2 : 0) + (hasFib ? 2 : 0));
    notes.push([zones.length ? (good === zones.length ? 'ok' : 'warn') : 'ko', 'Zones', zones.length ? `${good} zone(s) valable(s) sur ${zones.length}. Le bot voit ${fx.obs.length} OB et ${fx.fvgs.length} FVG intacts.${hasMss || hasFib ? ' Bonus : ' + [hasMss ? 'MSS identifié' : '', hasFib ? 'Fibonacci tracé' : ''].filter(Boolean).join(', ') + '.' : ''}` : 'Aucun OB ni FVG tracé : sans zone, on ne sait pas où entrer.']);
    const res = { fx, notes, sStruct, sTrend, sZones };
    if (!silent) { notes.forEach(n => say(`<b>${n[1]}</b> — ${n[2]}`, n[0])); say(`Score d'analyse : <b>${sStruct + sTrend + sZones} / 60</b> (structure ${sStruct}/25, tendance ${sTrend}/15, zones ${sZones}/20). La décision compte pour les 40 points restants.`, 'score'); }
    return res;
  }
  function reviewDecision(t) {
    const an = reviewAnalysis(true), fx = an.fx, out = [];
    let sDir = 0, sLoc = 0, sSL = 0, sRR = 0, sKZ = 0;
    if (fx.trend === t.dir) { sDir = 10; out.push(['ok', 'Sens', `Dans le sens de la tendance ${trendTxt(fx.trend)}.`]); }
    else out.push(['ko', 'Sens', `Tu ${t.dir === 1 ? 'achètes' : 'vends'} alors que la tendance ${R.tf} est ${trendTxt(fx.trend)}. Trader contre la structure demande un MSS confirmé.`]);
    if (fx.htf && fx.htf !== t.dir) out.push(['warn', 'UT supérieure', `L'UT ${HTF[R.tf]} est ${trendTxt(fx.htf)} : ton trade va contre elle.`]);
    if (fx.pos != null) { const ok = t.dir === 1 ? fx.pos < 0.5 : fx.pos > 0.5; if (ok) sLoc += 6;
      out.push([ok ? 'ok' : 'ko', 'Premium / discount', `Prix à ${Math.round(fx.pos * 100)} % du range (${fp(fx.Ll)} – ${fp(fx.Hh)}) : ${fx.pos < 0.5 ? 'discount' : 'premium'}. ${ok ? 'Bon côté pour ce trade.' : (t.dir === 1 ? 'Acheter en premium, c\'est acheter cher.' : 'Vendre en discount, c\'est vendre bon marché.')}`]); }
    const zones = R.draws.filter(d => d.type === 'ob' || d.type === 'fvg').concat(fx.obs.map(o => Object.assign({ type: 'ob' }, o)), fx.fvgs.map(f => Object.assign({ type: 'fvg' }, f)));
    const inZone = zones.some(z => z.dir === t.dir && t.entry <= z.top + fx.atr * 0.3 && t.entry >= z.bot - fx.atr * 0.3);
    const fibs = R.draws.filter(d => d.type === 'fib').concat(fx.leg ? [fx.leg] : []);
    const inOte = fibs.some(f => { const s = f.p2 - f.p1, a = f.p2 - s * 0.62, b = f.p2 - s * 0.79; return t.entry >= Math.min(a, b) && t.entry <= Math.max(a, b) && (s > 0) === (t.dir === 1); });
    if (inZone || inOte) { sLoc += 4; out.push(['ok', 'Zone d\'entrée', `Entrée ${[inZone ? 'sur un OB / FVG' : '', inOte ? 'dans l\'OTE du Fibonacci' : ''].filter(Boolean).join(' et ')} du bon sens.`]); }
    else out.push(['warn', 'Zone d\'entrée', 'Entrée ni sur un OB / FVG ni dans l\'OTE (62–79 %) : tu entres « au milieu de nulle part ».']);
    const ref = t.dir === 1 ? fx.sw.ls.filter(s => s.i < R.cur).pop() : fx.sw.hs.filter(s => s.i < R.cur).pop();
    const slBeyond = ref ? (t.dir === 1 ? t.sl < ref.p : t.sl > ref.p) : false, slDist = Math.abs(t.entry - t.sl) / fx.atr;
    if (slBeyond && slDist <= 4) { sSL = 8; out.push(['ok', 'Stop', `Stop au-delà du dernier ${t.dir === 1 ? 'creux' : 'sommet'} (${fp(ref.p)}).`]); }
    else if (slDist < 0.4) out.push(['ko', 'Stop', `Stop très serré (${slDist.toFixed(1)} ATR) : le moindre bruit le touchera.`]);
    else out.push(['warn', 'Stop', ref ? `Stop pas au-delà du dernier ${t.dir === 1 ? 'creux' : 'sommet'} (${fp(ref.p)}) : un sweep peut te sortir.` : 'Stop sans repère de structure.']);
    const rr = Math.abs(t.tp - t.entry) / Math.abs(t.entry - t.sl);
    if (rr >= 2) { sRR = 7; out.push(['ok', 'Risque / rendement', `R:R 1:${rr.toFixed(1)}.`]); } else out.push([rr >= 1.5 ? 'warn' : 'ko', 'Risque / rendement', `R:R 1:${rr.toFixed(1)} : vise au moins 1:2.`]);
    if (t.pct > 2) out.push(['ko', 'Risque', `${String(t.pct).replace('.', ',')} % du capital : au-delà de 2 %, une série de pertes devient dangereuse.`]);
    const kz = sessionOf(cursorTime());
    if (kz === 'Londres' || kz === 'New York AM') { sKZ = 5; out.push(['ok', 'Session', `Entrée pendant la kill zone ${kz}.`]); }
    else out.push(['warn', 'Session', `Entrée ${kz ? 'en session ' + kz : 'hors kill zone'} : en dehors de Londres / New York AM, les mouvements sont moins fiables.`]);
    const decision = sDir + sLoc + sSL + sRR + sKZ;
    return { notes: an.notes.concat(out), total: an.sStruct + an.sTrend + an.sZones + decision, analysis: an.sStruct + an.sTrend + an.sZones, decision, rr,
      errors: out.filter(o => o[0] === 'ko').map(o => o[1]).concat(an.notes.filter(o => o[0] === 'ko').map(o => o[1])) };
  }
  function say(html, kind) { R.msgs.push({ html, kind: kind || 'info' }); if (R.msgs.length > 80) R.msgs.shift(); renderMsgs(); }

  /* ---------------- lecture ---------------- */
  const path = k => k.c >= k.o ? [k.o, k.l, k.h, k.c] : [k.o, k.h, k.l, k.c];
  function stepSub() {
    if (R.cur >= R.all.length) { stop(); if (R.stopWhen) { const f = R.stopWhen; R.stopWhen = null; if (f.done) f.done(); return false; } say('Fin de la période : tu es arrivé au bout des données. Choisis une autre semaine pour continuer.', 'info'); return false; }
    const k = R.all[R.cur], i = R.sub, px = path(k)[i], prev = R.live ? R.live.c : k.o;
    if (i === 0) R.live = { t: k.t, o: k.o, h: k.o, l: k.o, c: k.o };
    R.live.c = px; R.live.h = Math.max(R.live.h, px); R.live.l = Math.min(R.live.l, px);
    series.update({ time: k.t, open: R.live.o, high: R.live.h, low: R.live.l, close: R.live.c });
    for (const t of R.trades) if (t.open) checkTrade(t, prev, px, k.t);
    if (++R.sub >= 4) { R.sub = 0; R.live = null; R.cur++; R.nowT = Math.max(R.nowT, cursorTime()); onCandleClosed(); }
    return true;
  }
  function play() {
    if (R.playing || R.loading || !R.all.length) return; R.playing = true; R.acc = 0;
    R.timer = setInterval(() => { R.acc += R.speed * 4 * 40 / 1000; let n = Math.floor(R.acc); R.acc -= n;
      while (n-- > 0 && R.playing) { const c0 = R.cur; if (!stepSub()) break; if (R.cur !== c0 && R.stopWhen && R.stopWhen()) { const f = R.stopWhen; R.stopWhen = null; stop(); if (f.done) f.done(); break; } }
      requestAnimationFrame(drawOverlay); renderStatus(); renderPositions(); }, 40);
    renderControls();
  }
  function stop() { R.playing = false; if (R.timer) clearInterval(R.timer); R.timer = null; renderControls();
    if (R.stopWhen) { const f = R.stopWhen; R.stopWhen = null; if (f.done) setTimeout(f.done, 0); } } // libère une lecture « jusqu'à »
  function stepBack(n) {
    if (!R.all.length) return;
    if (R.trades.some(t => t.open)) { say('Clôture tes positions avant de revenir en arrière.', 'warn'); return; }
    stop(); R.ticket = null; R.sub = 0; R.live = null;
    const keep = chart.timeScale().getVisibleLogicalRange();
    R.cur = n === 'start' ? Math.max(Math.min(40, R.all.length), R.all.findIndex(x => x.t + TF[R.tf] > R.startT)) : Math.max(Math.min(40, R.all.length), R.cur - n);
    R.nowT = cursorTime();
    series.setData(visible().map(x => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c })));
    if (keep && n !== 'start') chart.timeScale().setVisibleLogicalRange(keep); else chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, R.cur - 130), to: R.cur + 14 });
    priceLines(); applyMarks(); renderTicket(); renderStatus(); requestAnimationFrame(drawOverlay);
  }
  function stepCandle() { do { if (!stepSub()) break; } while (R.sub !== 0); requestAnimationFrame(drawOverlay); renderStatus(); renderPositions(); }
  function onCandleClosed() {
    for (const t of R.trades.filter(x => x.open)) {
      const r = (R.all[R.cur - 1].c - t.entry) * t.dir / t.risk0;
      if (t.prof && r >= 1 && !t.be) { t.be = true; t.sl = t.entry; priceLines(); say(`Le professeur : +1R atteint, je remonte mon stop au point d'entrée (${fp(t.entry)}). Le trade ne peut plus coûter.`, 'tip'); continue; }
      if (!t.hint1 && r >= 1) { t.hint1 = true; say(`Trade n°${t.id} à +1R : le plan dit stop au point d'entrée (glisse la ligne SL sur l'entrée, ou bouton « Stop au break-even »).`, 'tip'); }
      if (!t.hintS) { const L = lib(), vis = visible(), ms = L.marketStructure(vis, L.findSwings(vis, 3)), e = ms.events[ms.events.length - 1];
        if (e && e.at === R.cur - 1 && e.dir === -t.dir) { t.hintS = true; say(`Trade n°${t.id} : ${e.kind} ${e.dir === 1 ? 'haussier' : 'baissier'} contre ta position à ${fp(e.level)}. La raison du trade s'affaiblit.`, 'warn'); } }
    }
    const s = sessionOf(cursorTime()), prevS = R.lastSess; R.lastSess = s;
    if (s && s !== prevS && (s === 'Londres' || s === 'New York AM') && R.playing) say(`Ouverture de la kill zone <b>${s}</b> (${DAYF.format(new Date(cursorTime() * 1000))}) : surveille tes zones.`, 'info');
  }

  /* ---------------- ordres et positions ---------------- */
  const riskNow = t => t.units * Math.abs(t.entry - t.sl);
  function sizeFor(entry, sl, pct) { const risk = R.balance * pct / 100, units = risk / Math.max(1e-12, Math.abs(entry - sl)), c = SYM[R.sym].contract;
    return { risk, units, label: c > 1 ? `${fmt(units / c, 2)} ${SYM[R.sym].unit}` : `${fmt(units, units < 10 ? 4 : 2)} ${SYM[R.sym].unit}` }; }
  function newTicket(dir) {
    if (!R.cur) return;
    if (R.trades.filter(t => t.open).length >= MAX_OPEN) { say(`Maximum ${MAX_OPEN} positions ouvertes en même temps.`, 'warn'); return; }
    stop();
    const px = lastPx(), fx = teacherView(), ref = dir === 1 ? fx.sw.ls.filter(s => s.i < R.cur).pop() : fx.sw.hs.filter(s => s.i < R.cur).pop();
    let sl = ref ? ref.p - dir * fx.atr * 0.2 : px - dir * fx.atr * 1.5; if ((px - sl) * dir <= fx.atr * 0.3) sl = px - dir * fx.atr * 1.2;
    R.ticket = { dir, entry: px, sl, tp: px + dir * 2 * Math.abs(px - sl), pct: lsGet('at:rp:pct', 1) };
    say('Ordre en préparation : <b>maintiens et fais glisser</b> les lignes SL (rouge) et TP (vert) sur le graphique, règle le risque, puis valide.', 'info');
    renderTicket(); priceLines(); requestAnimationFrame(drawOverlay);
  }
  function validate() {
    const k = R.ticket; if (!k) return;
    if (k.prof) return validateProf(k);
    if ((k.entry - k.sl) * k.dir <= 0) { say('Le stop doit être sous le prix pour un achat, au-dessus pour une vente.', 'ko'); return; }
    if ((k.tp - k.entry) * k.dir <= 0) { say('L\'objectif doit être au-dessus du prix pour un achat, en dessous pour une vente.', 'ko'); return; }
    const sz = sizeFor(k.entry, k.sl, k.pct);
    const t = Object.assign({}, k, { id: ++R.seq, open: true, units: sz.units, risk0: Math.abs(k.entry - k.sl), riskUsd: sz.risk, t0: cursorTime(), i0: R.cur,
      session: sessionOf(cursorTime()) || 'hors session', day: DAYF.format(new Date(cursorTime() * 1000)) });
    t.review = reviewDecision(t); R.trades.push(t); R.ticket = null;
    addMark({ time: R.all[R.cur - 1].t, position: t.dir === 1 ? 'belowBar' : 'aboveBar', shape: t.dir === 1 ? 'arrowUp' : 'arrowDown', color: css('accent'), text: `#${t.id} ${t.dir === 1 ? 'Achat' : 'Vente'}` });
    say(`<b>Trade n°${t.id} : ${t.dir === 1 ? 'ACHAT' : 'VENTE'}</b> à ${fp(t.entry)} · stop ${fp(t.sl)} · objectif ${fp(t.tp)} · R:R 1:${t.review.rr.toFixed(1)} · risque ${String(t.pct).replace('.', ',')} % (${fmt(sz.risk, 0)} $) · ${t.day}, session ${t.session}.`, 'info');
    t.review.notes.forEach(n => say(`<b>${n[1]}</b> — ${n[2]}`, n[0]));
    say(`Note du trade n°${t.id} : <b>${t.review.total} / 100</b> (analyse ${t.review.analysis}/60, décision ${t.review.decision}/40). ${t.review.total >= 70 ? 'S\'il est gagnant, il comptera pour ta certification.' : 'Même gagnant, il ne comptera pas pour la certification (note < 70).'}`, 'score');
    renderTicket(); renderPositions(); priceLines(); requestAnimationFrame(drawOverlay);
  }
  function checkTrade(t, p0, p1, time) {
    const lo = Math.min(p0, p1), hi = Math.max(p0, p1), hitSL = t.sl >= lo && t.sl <= hi, hitTP = t.tp >= lo && t.tp <= hi;
    if (hitSL || hitTP) { const slFirst = hitSL && (!hitTP || Math.abs(t.sl - p0) <= Math.abs(t.tp - p0));
      closeTrade(t, slFirst ? t.sl : t.tp, slFirst ? (Math.abs(t.sl - t.entry) < 1e-12 ? 'break-even' : 'stop') : 'objectif', time); }
  }
  function closeTrade(t, px, why, time) {
    if (!t.open) return; t.open = false; t.exit = px; t.why = why; t.pnl = (px - t.entry) * t.dir * t.units; t.R = t.pnl / t.riskUsd;
    R.equity += t.pnl; stop();
    addMark({ time: time || R.all[R.cur - 1].t, position: t.dir === 1 ? 'aboveBar' : 'belowBar', shape: 'circle', color: t.R >= 0 ? css('bull') : css('bear'), text: `#${t.id} ${t.R >= 0 ? '+' : ''}${t.R.toFixed(1)}R` });
    if (t.prof) { say(`<b>Résultat du trade du professeur</b> (${why}) : <b class="${t.R >= 0 ? 'up' : 'down'}">${t.R >= 0 ? '+' : ''}${t.R.toFixed(2)} R</b>. ${t.R > 0 ? 'Le plan a fonctionné : biais, zone, kill zone, confirmation, puis gestion.' : t.R === 0 || why === 'break-even' ? 'Sortie à zéro grâce au break-even : la gestion a protégé le capital.' : 'Perte de 1R : même un plan parfait perd parfois. Ce qui compte, c\'est de répéter le même processus sur des centaines de trades.'}`, t.R >= 0 ? 'ok' : 'ko');
      renderPositions(); priceLines(); requestAnimationFrame(drawOverlay); return; }
    const validated = t.R > 0 && t.review.total >= 70 && !t.widened;
    record({ d: Date.now(), sym: R.sym, tf: R.tf, dir: t.dir, R: +t.R.toFixed(2), pnl: +t.pnl.toFixed(2), why, score: t.review.total, errors: t.review.errors, session: t.session, day: t.day, validated });
    const good = t.review.total >= 70;
    const lesson = t.R > 0 && good ? (t.widened ? 'Gagnant, mais tu as éloigné ton stop : trade non validé.' : 'Bon trade, bonne méthode : <b>trade validé</b> pour ta certification.')
      : t.R > 0 ? 'Gagnant, mais la méthode n\'était pas respectée (note < 70) : chance, pas compétence. Non validé.'
      : good ? 'Perdant malgré une bonne analyse : c\'est le coût du métier. Une perte de 1R avec un plan respecté reste un « bon » trade.'
      : 'Perdant et méthode non respectée : relis les points en rouge avant le prochain trade.';
    say(`<b>Trade n°${t.id} clôturé (${why})</b> à ${fp(px)} : <b class="${t.R >= 0 ? 'up' : 'down'}">${t.R >= 0 ? '+' : ''}${t.R.toFixed(2)} R (${t.pnl >= 0 ? '+' : ''}${fmt(t.pnl, 2)} $)</b>. ${lesson}`, t.R >= 0 ? 'ok' : 'ko');
    say('Ce que le marché a fait : ' + explainTrend(teacherView()), 'info');
    renderPositions(); priceLines(); renderStats(); requestAnimationFrame(drawOverlay);
  }
  function addMark(m) { R.marks.push(m); applyMarks(); }
  function applyMarks() { if (!series || !R.all.length) return; const lim = R.all[Math.min(R.cur, R.all.length - 1)].t; series.setMarkers(R.marks.filter(m => m.time <= lim).sort((a, b) => a.time - b.time)); }
  function priceLines() {
    if (!series) return; plines.forEach(l => { try { series.removePriceLine(l); } catch (e) {} }); plines = [];
    const add = (p, c, title, style) => plines.push(series.createPriceLine({ price: p, color: c, lineWidth: 2, lineStyle: style, axisLabelVisible: true, title }));
    for (const t of R.trades.filter(x => x.open)) { add(t.entry, css('accent'), `#${t.id} ${t.dir === 1 ? 'Achat' : 'Vente'}`, 0); add(t.sl, css('bear'), `#${t.id} SL`, 0); add(t.tp, css('bull'), `#${t.id} TP`, 0); }
    const k = R.ticket; if (k) { add(k.entry, css('accent'), 'Entrée', 2); add(k.sl, css('bear'), 'SL', 2); add(k.tp, css('bull'), 'TP', 2); }
  }

  /* ---------------- suivi et certification ---------------- */
  function emptyAgg() { return { n: 0, wins: 0, validated: 0, gp: 0, gl: 0, score: 0, errs: {} }; }
  function addAgg(A, x) { A.n++; if (x.R > 0) { A.wins++; A.gp += x.R; } else A.gl -= x.R; A.score += x.score || 0; if (x.validated) A.validated++; (x.errors || []).forEach(e => A.errs[e] = (A.errs[e] || 0) + 1); }
  function getAgg() { let A = lsGet(AGG, null); if (!A) { A = emptyAgg(); lsGet(HKEY, []).forEach(x => addAgg(A, x)); lsSet(AGG, A); } return A; }
  function record(rec) { const A = getAgg(); const H = lsGet(HKEY, []); H.push(rec); lsSet(HKEY, H.slice(-300)); addAgg(A, rec); lsSet(AGG, A); }
  function level(v) { return v >= R.goal ? ['Certifié SMC / ICT', 5] : v >= 10000 ? ['Expert', 4] : v >= 1000 ? ['Avancé', 3] : v >= 100 ? ['Intermédiaire', 2] : v >= 10 ? ['Apprenti', 1] : ['Débutant', 0]; }


  /* ---------------- suivre le professeur : analyse guidée, du hebdomadaire au 5 minutes ---------------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function gotoTF(tf) {
    if (R.tf !== tf) { R.tf = tf; renderSetup(); const r = await load(true); if (r < 0) throw new Error('données indisponibles en ' + tf); }
    chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, R.cur - 110), to: R.cur + 14 }); requestAnimationFrame(drawOverlay);
  }
  function runUntil(pred, max, speed) {
    return new Promise(res => { const c0 = R.cur; R.speed = speed; renderControls();
      R.stopWhen = Object.assign(() => pred() || R.cur - c0 >= max, { done: res }); play(); });
  }
  const P = d => Object.assign({ prof: true, tf: R.tf }, d);
  function profSwings(n) {
    const fx = teacherView();
    fx.swings.sort((a, b) => a.i - b.i).slice(-n).forEach(s => R.draws.push(P({ type: 'sw', hi: s.hi, t: s.t, p: s.p, i: s.i, lab: s.label.length === 1 ? (s.hi ? 'H' : 'B') : s.label })));
    requestAnimationFrame(drawOverlay); return fx;
  }
  function profZones(fx, bias, n) {
    const px = fx.px, zs = fx.obs.map(o => Object.assign({ type: 'ob' }, o)).concat(fx.fvgs.map(f => Object.assign({ type: 'fvg' }, f)))
      .filter(z => z.dir === bias && (bias === 1 ? z.top <= px + fx.atr : z.bot >= px - fx.atr))
      .sort((a, b) => bias === 1 ? b.top - a.top : a.bot - b.bot).slice(0, n);
    zs.forEach(z => R.draws.push(P({ type: z.type, t: z.t, top: z.top, bot: z.bot, dir: z.dir, i: z.i })));
    requestAnimationFrame(drawOverlay); return zs;
  }
  function profLeg(fx) { if (!fx.leg) return null; R.draws.push(P(Object.assign({ type: 'fib' }, fx.leg))); requestAnimationFrame(drawOverlay); return fx.leg; }
  const KZ = () => { const s = sessionOf(cursorTime()); return s === 'Londres' || s === 'New York AM'; };
  const dirW = d => d === 1 ? 'haussier' : d === -1 ? 'baissier' : 'neutre';
  const dirF = d => d === 1 ? 'haussière' : d === -1 ? 'baissière' : 'neutre';
  function legPos(leg, px) { const lo = Math.min(leg.p1, leg.p2), hi = Math.max(leg.p1, leg.p2), pos = (px - lo) / (hi - lo);
    if (pos > 1) return `au-dessus du sommet de la jambe (${fp(hi)}) : <b>premium extrême</b>, on évite d'acheter si haut`;
    if (pos < 0) return `sous le creux de la jambe (${fp(lo)}) : <b>discount extrême</b>, on évite de vendre si bas`;
    return `à ${Math.round(pos * 100)} % de la jambe : zone <b>${pos < 0.5 ? 'discount (bon marché, on préfère acheter)' : 'premium (cher, on préfère vendre)'}</b>`; }
  const GSTEPS = [
    { tf: '1W', title: 'Hebdomadaire : la structure', desc: 'Le professeur marque les sommets et creux (HH, HL, LH, LL) et lit la tendance de fond.',
      run: async g => { await gotoTF('1W'); const fx = profSwings(6); g.biasW = fx.trend;
        say(`<b>1. Hebdomadaire.</b> On commence toujours par la plus grande unité de temps. Je marque les derniers sommets et creux en doré. ${explainTrend(fx)} Le biais de fond est <b>${dirW(fx.trend)}</b>.`, 'tip'); } },
    { tf: '1W', title: 'Hebdomadaire : premium ou discount', desc: 'Fibonacci sur la dernière grande jambe : le prix est-il cher ou bon marché ?',
      run: async g => { const fx = teacherView(), leg = profLeg(fx);
        say(leg ? `<b>2. Premium / discount.</b> Fibonacci sur la dernière jambe ${dirF(leg.dir)} (${fp(leg.p1)} → ${fp(leg.p2)}). Équilibre 50 % : ${fp(leg.p2 - (leg.p2 - leg.p1) * 0.5)}. Le prix est ${legPos(leg, fx.px)}.` : '<b>2.</b> Pas encore de jambe nette en hebdomadaire : on s\'appuiera sur le journalier.', 'tip'); } },
    { tf: '1D', title: 'Journalier : structure et dernier BOS / CHoCH', desc: 'On descend en daily : la structure confirme-t-elle le biais hebdo ?',
      run: async g => { await gotoTF('1D'); const fx = profSwings(6);
        fx.events.slice(-2).forEach(e => R.draws.push(P({ type: 'mss', t1: e.tFrom, t2: e.t, p1: e.level, dir: e.dir, ok: e.mss, label: e.mss ? 'MSS (prof)' : e.kind + ' (prof)' })));
        g.bias = fx.trend || g.biasW || 1; requestAnimationFrame(drawOverlay);
        say(`<b>3. Journalier.</b> ${explainTrend(fx)} ${fx.trend === g.biasW ? 'Le journalier <b>confirme</b> l\'hebdomadaire : on cherchera uniquement des ' + (g.bias === 1 ? 'achats' : 'ventes') + '.' : 'Le journalier ne suit pas l\'hebdomadaire : prudence, on suit le journalier pour le trade du jour (' + (g.bias === 1 ? 'achats' : 'ventes') + ').'}`, 'tip'); } },
    { tf: '1D', title: 'Journalier : les liquidités', desc: 'Plus haut / bas de la semaine et de la veille, sommets égaux : là où sont les stops.',
      run: async g => { const vis = visible(), weeksMap = new Map();
        vis.forEach(k => { const b = bucket(k.t, 604800); const w = weeksMap.get(b) || { h: -Infinity, l: Infinity }; w.h = Math.max(w.h, k.h); w.l = Math.min(w.l, k.l); weeksMap.set(b, w); });
        const curW = bucket(R.nowT, 604800), prevW = [...weeksMap.keys()].filter(b => b < curW).sort((a, b) => a - b).pop(), pw = weeksMap.get(prevW), pd = vis[vis.length - 1];
        const lv = []; if (pw) lv.push(['PWH', pw.h], ['PWL', pw.l]); lv.push(['PDH', pd.h], ['PDL', pd.l]);
        const fx = teacherView(), hs = fx.sw.hs.slice(-6);
        for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) if (Math.abs(hs[i].p - hs[j].p) <= fx.atr * 0.15) lv.push(['EQH', Math.max(hs[i].p, hs[j].p)]);
        lv.forEach(([label, p]) => R.draws.push(P({ type: 'hline', p, label })));
        g.target = g.bias === 1 ? (pw ? pw.h : pd.h) : (pw ? pw.l : pd.l); requestAnimationFrame(drawOverlay);
        say(`<b>4. Liquidités.</b> En pointillés dorés : ${lv.map(([l, p]) => `${l} ${fp(p)}`).join(' · ')}. PWH / PWL = plus haut / bas de la semaine précédente, PDH / PDL = de la veille, EQH = sommets égaux. Les stops des traders s'y accumulent. Biais ${dirW(g.bias)} : <b>objectif probable ${fp(g.target)}</b>, et un balayage (sweep) ${g.bias === 1 ? 'sous le PDL' : 'au-dessus du PDH'} peut venir d'abord.`, 'tip'); } },
    { tf: '4h', title: '4H : MSS et zones d\'intérêt', desc: 'Dernier changement de structure et OB / FVG dans le sens du biais.',
      run: async g => { await gotoTF('4h'); const fx = teacherView(), e = fx.events.slice().reverse().find(x => x.dir === g.bias) || fx.events[fx.events.length - 1];
        if (e) R.draws.push(P({ type: 'mss', t1: e.tFrom, t2: e.t, p1: e.level, dir: e.dir, ok: e.mss, label: e.mss ? 'MSS (prof)' : e.kind + ' (prof)' }));
        const zs = profZones(fx, g.bias, 2); g.zones4h = zs;
        say(`<b>5. 4 heures.</b> ${e ? `Dernier ${e.mss ? 'MSS' : e.kind} ${dirW(e.dir)} à ${fp(e.level)} (${fT(e.t)}).` : ''} ${zs.length ? `Zones d'intérêt ${g.bias === 1 ? 'haussières sous le prix' : 'baissières au-dessus du prix'} : ${zs.map(z => `${z.type.toUpperCase()} ${fp(z.bot)} – ${fp(z.top)}`).join(' ; ')}. C'est là qu'on attendra le prix.` : 'Pas de zone intacte dans le sens du biais : on attendra que le marché en crée une.'}`, 'tip'); } },
    { tf: '4h', title: '4H : Fibonacci et OTE', desc: 'Le professeur trace le Fibonacci de la dernière jambe et repère l\'OTE (62–79 %).',
      run: async g => { const fx = teacherView(), leg = profLeg(fx);
        if (leg) { const sp = leg.p2 - leg.p1, a = leg.p2 - sp * 0.62, b = leg.p2 - sp * 0.79; g.ote = [Math.min(a, b), Math.max(a, b)];
          say(`<b>6. Fibonacci 4H.</b> Dernière jambe ${dirF(leg.dir)} ${fp(leg.p1)} → ${fp(leg.p2)} ; prix ${legPos(leg, fx.px)}. OTE : <b>${fp(g.ote[0])} – ${fp(g.ote[1])}</b>. La meilleure entrée = un OB / FVG qui se trouve dans l'OTE.`, 'tip'); }
        else say('<b>6.</b> Pas de jambe nette en 4H pour le Fibonacci.', 'info'); } },
    { tf: '1h', title: '1H : affiner la zone', desc: 'On descend en 1H pour trouver la zone la plus précise.',
      run: async g => { await gotoTF('1h'); profSwings(4); const fx = teacherView(), zs = profZones(fx, g.bias, 2);
        say(`<b>7. 1 heure.</b> ${explainTrend(fx)} ${zs.length ? `Zone affinée : ${zs.map(z => `${z.type.toUpperCase()} ${fp(z.bot)} – ${fp(z.top)}`).join(' ; ')}.` : 'Pas de nouvelle zone en 1H : on garde celles du 4H.'}`, 'tip'); } },
    { tf: '15m', title: '15 min : attendre la kill zone', desc: 'Le professeur fait défiler le marché jusqu\'à Londres ou New York AM.',
      run: async g => { await gotoTF('15m');
        if (!KZ()) { say('<b>8. 15 minutes.</b> On ne trade pas n\'importe quand : je fais défiler jusqu\'à la prochaine kill zone (bandes colorées en bas du graphique)…', 'info'); await runUntil(KZ, 120, 30); }
        say(KZ() ? `<b>Kill zone ${sessionOf(cursorTime())} ouverte</b> (${fT(cursorTime())}). Les institutionnels arrivent : c'est maintenant que les setups SMC se forment.` : 'Pas de kill zone atteinte sur la période chargée.', 'tip'); } },
    { tf: '5m', title: '5 min : la confirmation (MSS)', desc: 'Le professeur attend une cassure de structure dans le sens du biais, en kill zone.',
      run: async g => { await gotoTF('5m'); say('<b>9. 5 minutes.</b> J\'attends une confirmation : une cassure de structure (MSS / CHoCH ou BOS) dans le sens du biais, pendant la kill zone…', 'info');
        const L = lib(); let ev = null;
        await runUntil(() => { if (!KZ()) return false; const vis = visible(), ms = L.marketStructure(vis, L.findSwings(vis, 2)), e = ms.events[ms.events.length - 1];
          if (e && e.at === R.cur - 1 && e.dir === g.bias) { ev = e; return true; } return false; }, 220, 30);
        g.confirmed = !!ev;
        if (ev) { R.draws.push(P({ type: 'mss', t1: ev.tFrom, t2: ev.t, p1: ev.level, dir: ev.dir, ok: true, label: ev.kind + ' 5m (prof)' })); requestAnimationFrame(drawOverlay);
          say(`<b>Confirmation !</b> ${ev.kind} ${dirW(ev.dir)} à ${fp(ev.level)} (${fT(ev.t)}) pendant la kill zone, dans le sens du biais. On peut préparer l'entrée.`, 'ok'); }
        else say('Pas de confirmation propre pendant les kill zones : <b>le professeur ne trade pas</b>. Ne pas trader est aussi une bonne décision.', 'warn'); } },
    { tf: '5m', title: 'Entrée, stop et objectif', desc: 'Le professeur place l\'ordre : stop sous la structure, objectif sur la liquidité.',
      run: async g => { if (!g.confirmed) { say('<b>10.</b> Pas de confirmation, donc pas d\'entrée.', 'info'); return; }
        const fx = teacherView(), px = lastPx(), ref = g.bias === 1 ? fx.sw.ls.filter(x => x.i < R.cur).pop() : fx.sw.hs.filter(x => x.i < R.cur).pop();
        let sl = ref ? ref.p - g.bias * fx.atr * 0.3 : px - g.bias * fx.atr * 1.5; if ((px - sl) * g.bias < fx.atr * 0.5) sl = px - g.bias * fx.atr * 1.2;
        const risk = Math.abs(px - sl), rrT = g.target ? (g.target - px) * g.bias / risk : 0, tp = rrT >= 2 && rrT <= 6 ? g.target : px + g.bias * 2 * risk;
        R.ticket = { dir: g.bias, entry: px, sl, tp, pct: 1, prof: true }; validate();
        say(`<b>10. Entrée du professeur : ${g.bias === 1 ? 'ACHAT' : 'VENTE'}</b> à ${fp(px)}. Stop ${fp(sl)} (au-delà du dernier ${g.bias === 1 ? 'creux' : 'sommet'}), objectif ${fp(tp)} (${tp === g.target ? 'la liquidité visée' : '2R'}), R:R 1:${(Math.abs(tp - px) / risk).toFixed(1)}, risque 1 %.`, 'tip'); } },
    { tf: '5m', title: 'Gestion et résultat', desc: 'Le marché défile : break-even à +1R, puis objectif ou stop.',
      run: async g => { const t = R.trades.find(x => x.prof && x.open); if (!t) { say('<b>11.</b> Aucun trade à gérer.', 'info'); return; }
        say('<b>11. Gestion.</b> Je laisse le marché travailler. À +1R, je remonterai le stop au point d\'entrée.', 'info');
        await runUntil(() => !t.open, 500, 30); if (t.open) closeTrade(t, lastPx(), 'fin de la séance'); } },
    { tf: 'all', title: 'Revue sur toutes les unités de temps', desc: 'Le professeur repasse du hebdomadaire au 5 minutes avec tous les tracés.',
      run: async g => { say('<b>12. Revue.</b> On repasse sur chaque unité de temps : regarde comment chaque tracé du professeur prend son sens.', 'info');
        const TXT = { '1W': 'le biais de fond et le premium / discount', '1D': 'la structure et les liquidités visées', '4h': 'le MSS, les zones et l\'OTE', '1h': 'la zone affinée', '15m': 'la kill zone', '5m': 'la confirmation, l\'entrée et le résultat' };
        for (const tf of ['1W', '1D', '4h', '1h', '15m', '5m']) { await gotoTF(tf); say(`${tf} : ${TXT[tf]}.`, 'info'); await sleep(1800); }
        say('<b>Séance terminée.</b> Ton tour : relance « Suivre le professeur » pour un autre marché, ou refais la même analyse seul avec les outils et compare avec la correction.', 'score'); } }
  ];
  async function startGuide() {
    if (R.trades.some(t => t.open)) { say('Clôture tes positions avant de lancer une séance guidée.', 'warn'); return; }
    const syms = Object.keys(SYM), sym = syms[Math.floor(Math.random() * syms.length)];
    let day; do { day = new Date(Date.now() - (4 + Math.floor(Math.random() * 40)) * 86400000); } while (day.getUTCDay() === 0 || day.getUTCDay() === 6 || day.getUTCDay() === 5);
    R.sym = sym; R.tf = '1W'; R.period = 'guided'; R.customStart = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 5, 0) / 1000;
    stop(); R.draws = []; R.undo = []; R.redo = []; R.trend = null; R.ticket = null; R.trades = []; R.marks = []; R.pending = null; R.equity = 0; R.stopWhen = null;
    R.guide = { idx: 0, done: [], running: true }; renderGuide(); renderSetup();
    say(`<b>Séance guidée avec le professeur.</b> Marché tiré au hasard : <b>${SYM[sym].name}</b>, le ${DAYF.format(new Date(R.customStart * 1000))}. Coche chaque étape : je fais l'action sur le graphique et je t'explique. On part du hebdomadaire pour finir en 5 minutes.`, 'tip');
    const r = await load(false); R.guide.running = false;
    if (r < 0) { R.guide = null; renderGuide(); return; }
    renderGuide();
  }
  async function runStep(i) {
    const g = R.guide; if (!g || g.running || i !== g.idx) return;
    g.running = true; renderGuide(); R.tool = 'cursor'; renderTools();
    try { await GSTEPS[i].run(g); g.done[i] = true; g.idx = i + 1; }
    catch (e) { say(`Le professeur n'a pas pu faire cette étape : ${esc(e.message)}. On passe à la suite.`, 'warn'); g.done[i] = true; g.idx = i + 1; }
    g.running = false; renderGuide(); renderPositions();
  }
  function renderGuide() {
    const el = R.root && R.root.querySelector('[data-rp="guide"]'); if (!el) return;
    const g = R.guide;
    if (!g) { el.innerHTML = `<h3>Suivre le professeur</h3><p class="sub">Le professeur choisit un marché au hasard et l'analyse avec toi, étape par étape, du hebdomadaire au 5 minutes. Tu coches chaque étape et tu vois ce qu'il trace sur le graphique.</p>
      <button class="btn primary" type="button" data-g="start">🎓 Analyser un marché avec le professeur</button>`;
      el.querySelector('[data-g="start"]').onclick = startGuide; return; }
    el.innerHTML = `<h3>Analyse guidée · ${esc(SYM[R.sym].name)}</h3>
      <ol class="rp-steps">${GSTEPS.map((st, i) => { const done = g.done[i], cur = i === g.idx, run = cur && g.running;
        return `<li class="${done ? 'done' : cur ? 'cur' : ''}"><label><input type="checkbox" data-g="${i}" ${done ? 'checked disabled' : ''} ${!cur || g.running ? 'disabled' : ''}>
          <span><b>${i + 1}. ${esc(st.title)}</b>${st.tf !== 'all' ? ` <em>${st.tf}</em>` : ''}<br><small>${run ? '<span class="spin"></span> le professeur travaille…' : esc(st.desc)}</small></span></label></li>`; }).join('')}</ol>
      <div class="rp-row"><button class="iconbtn" type="button" data-g="stop">Terminer la séance guidée</button></div>`;
    el.querySelectorAll('input[data-g]').forEach(c => c.onchange = () => runStep(+c.dataset.g));
    const list = el.querySelector('.rp-steps'), cur = el.querySelector('.rp-steps li.cur'); if (list && cur) list.scrollTop = Math.max(0, cur.offsetTop - list.offsetTop - 60);
    el.querySelector('[data-g="stop"]').onclick = () => { stop(); R.stopWhen = null; R.guide = null; renderGuide(); say('Séance guidée terminée. Les tracés du professeur restent sur le graphique (bouton ✕ pour tout effacer).', 'info'); };
  }
  function validateProf(k) {
    const sz = sizeFor(k.entry, k.sl, k.pct);
    const t = Object.assign({}, k, { id: ++R.seq, open: true, units: sz.units, risk0: Math.abs(k.entry - k.sl), riskUsd: sz.risk, t0: cursorTime(), i0: R.cur,
      session: sessionOf(cursorTime()) || 'hors session', day: DAYF.format(new Date(cursorTime() * 1000)), review: { total: 100, errors: [], rr: Math.abs(k.tp - k.entry) / Math.abs(k.entry - k.sl) } });
    R.trades.push(t); R.ticket = null;
    addMark({ time: R.all[R.cur - 1].t, position: t.dir === 1 ? 'belowBar' : 'aboveBar', shape: t.dir === 1 ? 'arrowUp' : 'arrowDown', color: css('accent'), text: `Prof ${t.dir === 1 ? 'Achat' : 'Vente'}` });
    renderTicket(); renderPositions(); priceLines(); requestAnimationFrame(drawOverlay);
  }

  /* ---------------- interface ---------------- */
  function mount(root, onBack) {
    R.root = root; R.onBack = onBack;
    const W = weeks(10);
    root.innerHTML = `
      <div class="ac-nav"><button class="iconbtn" data-rp="back" type="button">← Académie</button><span class="sub">Simulateur · trader et backtester votre stratégie</span></div>
      <div class="card rp-setup">
        <div class="ctl"><span class="lbl">Marché</span><div class="seg" data-rp="sym">${Object.keys(SYM).map(s => `<button type="button" data-v="${s}">${SYM[s].name}</button>`).join('')}</div></div>
        <div class="ctl"><span class="lbl">Unité de temps</span><div class="seg" data-rp="tf">${Object.keys(TF).map(t => `<button type="button" data-v="${t}">${t}</button>`).join('')}</div></div>
        <div class="ctl"><span class="lbl">Semaine à analyser / point de départ</span><select class="fsel" data-rp="period">
          <optgroup label="Semaine à analyser">${W.map(w => `<option value="${w.id}">${esc(w.label)}</option>`).join('')}</optgroup>
          <optgroup label="Remonter depuis maintenant">${REWIND.map(r => `<option value="${r[0]}">${r[1]}</option>`).join('')}</optgroup>
          <optgroup label="Données antérieures"><option value="date">Choisir une date…</option></optgroup>
          <option value="guided" hidden>Séance guidée (marché au hasard)</option></select></div>
        <div class="ctl" data-rp="datebox" hidden><span class="lbl">Date de départ</span><input class="fsel" type="date" data-rp="date" min="2017-09-01" max="${new Date().toISOString().slice(0, 10)}" value="${esc(R.customDate)}"></div>
        <button class="btn primary" type="button" data-rp="start">Charger et commencer</button>
      </div>
      <div class="rp-main">
        <div class="card rp-left">
          <div class="rp-body"><div class="rp-tools" data-rp="tools"></div>
          <div class="rp-chart"><div class="rp-c"></div><canvas class="rp-ov"></canvas><div class="rp-status"></div><div class="rp-day" data-rp="day" hidden></div></div></div>
          <div class="rp-ctrl" data-rp="ctrl"></div>
        </div>
        <aside class="rp-right">
          <div class="card rp-panel rp-guide" data-rp="guide"></div>
          <div class="card rp-panel"><h3>Mon analyse et mes ordres</h3>
            <span class="lbl">Tendance que je vois</span><div class="seg rp-trend" data-rp="trend">
              <button type="button" data-v="1">Haussière</button><button type="button" data-v="0">Range</button><button type="button" data-v="-1">Baissière</button></div>
            <div class="rp-row"><button class="btn" type="button" data-rp="ask">Avis du professeur</button><label class="check"><input type="checkbox" data-rp="fix"> Correction</label></div>
            <div class="rp-row"><button class="btn rp-buy" type="button" data-rp="buy">Acheter</button><button class="btn rp-sell" type="button" data-rp="sell">Vendre</button></div>
            <div class="rp-ticket" data-rp="ticket"></div>
            <div class="rp-positions" data-rp="positions"></div>
          </div>
          <div class="card rp-panel"><h3>Professeur</h3><div class="rp-msgs" data-rp="msgs"></div></div>
          <div class="card rp-panel"><h3>Certification SMC / ICT · suivi</h3><div data-rp="stats"></div></div>
        </aside>
      </div>`;
    const q = s => root.querySelector(`[data-rp="${s}"]`);
    q('back').onclick = () => { destroyChart(); if (onBack) onBack(); };
    q('sym').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (R.trades.some(t => t.open)) { say('Clôture tes positions avant de changer de marché.', 'warn'); return; } R.sym = b.dataset.v; lsSet('at:rp:sym', R.sym); renderSetup(); };
    q('tf').onclick = async e => { const b = e.target.closest('button'); if (!b || b.dataset.v === R.tf) return;
      if (R.trades.some(t => t.open)) { say('Clôture tes positions avant de changer d\'unité de temps.', 'warn'); return; }
      const was = R.all.length > 0; R.tf = b.dataset.v; lsSet('at:rp:tf', R.tf); renderSetup();
      if (was) { stop(); if (await load(true) >= 0 && !R.loading) say(`Unité de temps ${R.tf}, au même instant du replay. Tes tracés sont conservés.`, 'info'); } };
    q('period').onchange = e => { R.period = e.target.value; lsSet('at:rp:period', R.period); q('datebox').hidden = R.period !== 'date'; };
    q('datebox').hidden = R.period !== 'date';
    q('date').onchange = e => { R.customDate = e.target.value; lsSet('at:rp:date', R.customDate); };
    q('start').onclick = start;
    q('trend').onclick = e => { const b = e.target.closest('button'); if (!b) return; R.trend = +b.dataset.v; renderSetup(); };
    q('ask').onclick = () => { if (!R.cur) return; stop(); reviewAnalysis(false); };
    q('fix').onchange = e => { R.showFix = e.target.checked; if (R.showFix) say('Correction en pointillés dorés : swings HH / HL / LH / LL, BOS / CHoCH / MSS, OB, FVG et Fibonacci de la dernière jambe.', 'info'); requestAnimationFrame(drawOverlay); };
    q('buy').onclick = () => newTicket(1); q('sell').onclick = () => newTicket(-1);
    buildChart(); renderSetup(); renderTools(); renderControls(); renderTicket(); renderPositions(); renderMsgs(); renderStats(); renderGuide();
    if (!R.msgs.length) say('Bienvenue. Choisis un marché (or, BTC, EUR/USD, S&P 500), une unité de temps et la semaine à analyser, puis « Charger et commencer ». Le graphique s\'arrête au début de la semaine : tu ne vois pas la suite.', 'info');
    if (R.all.length) setData();
    try { if (sessionStorage.getItem('at:autoguide')) { sessionStorage.removeItem('at:autoguide'); setTimeout(startGuide, 50); } } catch (e) {}
  }
  async function start() {
    if (R.trades.some(t => t.open)) { say('Clôture tes positions avant de recharger.', 'warn'); return; }
    if (R.period === 'date' && !R.customDate) { say('Choisis d\'abord une date de départ.', 'warn'); return; }
    if (R.guide) { R.guide = null; renderGuide(); }
    stop(); R.draws = []; R.undo = []; R.redo = []; R.trend = null; R.ticket = null; R.trades = []; R.marks = []; R.pending = null; R.showFix = false; R.lastSess = null; R.equity = 0; R.stopWhen = null;
    const cb = R.root.querySelector('[data-rp="fix"]'); if (cb) cb.checked = false;
    const left = await load(false); if (left < 0) return;
    if (R.loading) return;
    const wk = R.period[0] === 'w' ? weeks(10).find(w => w.id === R.period) : null, nx = R.all[R.cur];
    say(`<b>${SYM[R.sym].name}</b> en ${R.tf} · ${wk ? `semaine ${esc(wk.label.replace('Semaine en cours · ', ''))}` : `départ le ${DAYF.format(new Date(cursorTime() * 1000))}`}. Le graphique s'arrête ${nx && nx.t - cursorTime() > 6 * 3600 ? `à la clôture précédente ; reprise du marché ${DSHORT.format(new Date(nx.t * 1000))} ${fT(nx.t).split(' ').pop()}` : `le ${fT(cursorTime())}`}. ${left} bougie(s) à venir. Source : ${esc(R.src)}.`, 'info');
    say('<b>Méthode</b> : 1) marque la structure avec HH / HL / LH / LL ; 2) déclare la tendance ; 3) repère le MSS, les OB et FVG ; 4) trace le Fibonacci (à la main ou « Fibo auto ») et repère l\'OTE ; 5) lance ▶ et attends la kill zone (bandes de couleur en bas du graphique) ; 6) achète ou vends, puis règle SL / TP en faisant glisser les lignes.', 'tip');
    renderSetup(); renderTicket(); renderPositions(); renderStats();
  }
  function renderSetup() {
    const r = R.root; if (!r) return;
    r.querySelectorAll('[data-rp="sym"] button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === R.sym));
    r.querySelectorAll('[data-rp="tf"] button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === R.tf));
    r.querySelectorAll('[data-rp="trend"] button').forEach(b => b.setAttribute('aria-pressed', R.trend != null && +b.dataset.v === R.trend));
    const sel = r.querySelector('[data-rp="period"]'); if (sel) sel.value = R.period;
  }
  const TB = [['cursor'], '|', ['HH'], ['HL'], ['LH'], ['LL'], '|', ['ob'], ['fvg'], ['mss'], '|', ['fib'], ['autofib', 'Fib', 'Fibonacci automatique (dernière jambe)', 'A'], '|', ['hline'], ['tline'], '|', ['erase'],
    '|', ['magnet', '🧲', 'Aimant sur les mèches', 'M'], ['hide', '👁', 'Masquer / afficher les tracés', ''], ['undo', '↶', 'Annuler (Ctrl+Z)', ''], ['redo', '↷', 'Rétablir (Ctrl+Y)', ''],
    ['full', '⛶', 'Plein écran', 'F'], ['clear', '✕', 'Tout effacer', '']];
  const KEYS = { cursor: 'Échap', hline: 'H', tline: 'T', fib: 'B', erase: 'E' };
  function renderTools() {
    const el = R.root && R.root.querySelector('[data-rp="tools"]'); if (!el) return;
    el.innerHTML = TB.map(x => {
      if (x === '|') return '<i class="rp-sep"></i>';
      const def = TOOLS.find(t => t[0] === x[0]) || [x[0], x[1], x[2]], k = def[0], icon = def[1], label = def[2];
      const on = k === R.tool || (k === 'magnet' && R.magnet) || (k === 'hide' && R.hideDraws) || (k === 'full' && R.root.querySelector('.rp-left.rp-full'));
      const key = KEYS[k] || x[3] || '';
      return `<button type="button" class="rp-tool${k === 'autofib' ? ' gold' : ''}" data-tool="${k}" aria-pressed="${!!on}" aria-label="${esc(label)}"><b>${icon}</b><span class="tt">${esc(label)}${key ? ` <kbd>${esc(key)}</kbd>` : ''}</span></button>`;
    }).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; toolAction(b.dataset.tool); };
  }
  function toolAction(k) {
    if (k === 'clear') { if (R.draws.length) { commit(); R.draws = []; } R.pending = null; requestAnimationFrame(drawOverlay); return; }
    if (k === 'autofib') { autoFib(); return; }
    if (k === 'undo') { undo(); return; }
    if (k === 'redo') { redo(); return; }
    if (k === 'magnet') { R.magnet = !R.magnet; lsSet('at:rp:mag', R.magnet); renderTools(); renderStatus(R.magnet ? 'Aimant activé : les points se collent aux mèches.' : 'Aimant désactivé.'); return; }
    if (k === 'hide') { R.hideDraws = !R.hideDraws; renderTools(); requestAnimationFrame(drawOverlay); return; }
    if (k === 'full') { const l = R.root.querySelector('.rp-left'); l.classList.toggle('rp-full'); document.body.classList.toggle('rp-noscroll', l.classList.contains('rp-full')); renderTools(); requestAnimationFrame(drawOverlay); return; }
    R.tool = k; R.pending = null; renderTools(); if (chart) chart.applyOptions({ handleScroll: k === 'cursor', handleScale: true });
    renderStatus(TIPS[k] || (k === 'cursor' ? 'Curseur : fais glisser les poignées pour modifier une ligne ou un Fibonacci.' : ''));
    requestAnimationFrame(drawOverlay);
  }
  /* raccourcis clavier façon TradingView */
  document.addEventListener('keydown', e => {
    if (!R.root || !R.root.isConnected || !chart || document.body.dataset.view !== 'academy') return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    const k = e.key, mod = e.ctrlKey || e.metaKey;
    if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); redo(); return; }
    if (mod) return;
    if (k === ' ') { e.preventDefault(); if (R.playing) stop(); else play(); }
    else if (k === 'ArrowRight') { e.preventDefault(); if (e.shiftKey) { for (let i = 0; i < 10; i++) stepCandle(); } else { stop(); stepCandle(); } }
    else if (k === 'ArrowLeft') { e.preventDefault(); stepBack(e.shiftKey ? 10 : 1); }
    else if (k === 'Escape') { const l = R.root.querySelector('.rp-left.rp-full'); if (l) toolAction('full'); else toolAction('cursor'); }
    else if (k === 'h' || k === 'H') toolAction('hline');
    else if (k === 't' || k === 'T') toolAction('tline');
    else if (k === 'b' || k === 'B') toolAction('fib');
    else if (k === 'e' || k === 'E') toolAction('erase');
    else if (k === 'a' || k === 'A') toolAction('autofib');
    else if (k === 'm' || k === 'M') toolAction('magnet');
    else if (k === 'f' || k === 'F') toolAction('full');
  });
  const SPEEDS = [0.25, 0.5, 1, 3, 10, 30, 100];
  function renderControls() {
    const el = R.root && R.root.querySelector('[data-rp="ctrl"]'); if (!el) return;
    el.innerHTML = `<div class="rp-transport">
        <button class="btn" type="button" data-c="home" title="Revenir au point de départ">⏮</button>
        <button class="btn" type="button" data-c="back10" title="Reculer de 10 bougies (Maj + ←)">⏪ 10</button>
        <button class="btn" type="button" data-c="back" title="Reculer d'une bougie (←)">◀ 1</button>
        <button class="btn primary rp-play" type="button" data-c="play" title="Lecture / pause (Espace)">${R.playing ? '⏸ Pause' : '▶ Lecture'}</button>
        <button class="btn" type="button" data-c="step" title="Avancer d'une bougie (→)">1 ▶</button>
        <button class="btn" type="button" data-c="step10" title="Avancer de 10 bougies (Maj + →)">10 ⏩</button></div>
      <div class="seg rp-speed" data-c="speed">${SPEEDS.map(v => `<button type="button" data-v="${v}" aria-pressed="${R.speed === v}">${String(v).replace('.', ',')}×</button>`).join('')}</div>
      <span class="rp-clock" data-c="clock"></span>`;
    const on = (k, f) => { el.querySelector(`[data-c="${k}"]`).onclick = () => { if (R.all.length) f(); }; };
    on('play', () => { if (R.playing) stop(); else play(); });
    on('step', () => { stop(); stepCandle(); });
    on('step10', () => { stop(); for (let i = 0; i < 10; i++) stepCandle(); });
    on('back', () => stepBack(1)); on('back10', () => stepBack(10)); on('home', () => stepBack('start'));
    el.querySelector('[data-c="speed"]').onclick = e => { const b = e.target.closest('button'); if (!b) return; R.speed = +b.dataset.v; renderControls(); };
    renderStatus();
  }
  function renderStatus(msg) {
    if (!R.root) return;
    const st = R.root.querySelector('.rp-status'), ck = R.root.querySelector('[data-c="clock"]'), day = R.root.querySelector('[data-rp="day"]');
    if (ck) ck.textContent = R.all.length ? `${fT(cursorTime())} · ${Math.max(0, R.all.length - R.cur)} bougies à venir` : '';
    if (st) st.textContent = msg || (R.loading ? 'Chargement…' : R.all.length ? `${R.src} · ${R.tf}` : 'Choisis les réglages puis « Charger et commencer »');
    if (day) {
      if (!R.cur) { day.hidden = true; return; }
      const t = cursorTime(), nxt = R.all[R.cur], s = sessionOf(t), cap = x => x.charAt(0).toUpperCase() + x.slice(1);
      if (TF[R.tf] >= 86400) day.innerHTML = `<b>${esc(R.tf === '1W' ? 'Hebdomadaire' : 'Journalier')}</b> · jusqu'au ${esc(cap(DAYF.format(new Date(Math.min(t, R.nowT || t) * 1000 - 1000))))}`;
      else if (nxt && nxt.t - t > 6 * 3600) day.innerHTML = `<b>Marché fermé</b> (week-end) · reprise ${esc(DSHORT.format(new Date(nxt.t * 1000)))} ${esc(fT(nxt.t).split(' ').pop())}`;
      else day.innerHTML = `<b>${esc(cap(DAYF.format(new Date(t * 1000))))}</b> · ${s ? `session <b class="${s === 'Londres' || s === 'New York AM' ? 'kz' : ''}">${esc(s)}</b>` : 'hors session'}`;
      day.hidden = false;
    }
  }
  function renderTicket() {
    const el = R.root && R.root.querySelector('[data-rp="ticket"]'); if (!el) return;
    const k = R.ticket;
    if (!k) { el.innerHTML = `<p class="sub">Choisis Acheter ou Vendre quand le prix est dans ta zone. Jusqu'à ${MAX_OPEN} positions en même temps.</p>`; return; }
    const rr = Math.abs(k.tp - k.entry) / Math.max(1e-12, Math.abs(k.entry - k.sl)), sz = sizeFor(k.entry, k.sl, k.pct);
    el.innerHTML = `<div class="rp-pos ${k.dir === 1 ? 'buy' : 'sell'}"><b>Nouvel ordre ${k.dir === 1 ? 'd\'achat' : 'de vente'}</b> au marché · ${fp(k.entry)}<br>
        <span class="sub">Maintiens et fais glisser les lignes SL / TP sur le graphique, ou saisis-les :</span></div>
      <div class="rp-grid2">
        <label>Stop<input type="number" step="any" data-t="sl" value="${k.sl.toFixed(dec())}"></label>
        <label>Objectif<input type="number" step="any" data-t="tp" value="${k.tp.toFixed(dec())}"></label>
        <label>Risque : <b>${String(k.pct).replace('.', ',')} %</b><input type="range" min="0.25" max="3" step="0.25" value="${k.pct}" data-t="pct"></label>
        <label>Capital ($)<input type="number" step="100" min="100" data-t="bal" value="${R.balance}"></label>
      </div>
      <p class="sub">Taille <b>${esc(sz.label)}</b> · perte si stop <b class="down">−${fmt(sz.risk, 2)} $</b> · gain si objectif <b class="up">+${fmt(sz.risk * rr, 2)} $</b> · R:R 1:${rr.toFixed(2)}</p>
      <div class="rp-row"><button class="btn primary" type="button" data-t="ok">Valider l'ordre</button><button class="btn" type="button" data-t="cancel">Annuler</button></div>`;
    el.querySelector('[data-t="sl"]').onchange = e => { k.sl = +e.target.value; renderTicket(); priceLines(); requestAnimationFrame(drawOverlay); };
    el.querySelector('[data-t="tp"]').onchange = e => { k.tp = +e.target.value; renderTicket(); priceLines(); requestAnimationFrame(drawOverlay); };
    el.querySelector('[data-t="pct"]').oninput = e => { k.pct = +e.target.value; lsSet('at:rp:pct', k.pct); renderTicket(); };
    el.querySelector('[data-t="bal"]').onchange = e => { R.balance = Math.max(100, +e.target.value || 10000); lsSet('at:rp:bal', R.balance); renderTicket(); };
    el.querySelector('[data-t="ok"]').onclick = validate;
    el.querySelector('[data-t="cancel"]').onclick = () => { R.ticket = null; renderTicket(); priceLines(); requestAnimationFrame(drawOverlay); };
  }
  function renderPositions() {
    const el = R.root && R.root.querySelector('[data-rp="positions"]'); if (!el) return;
    const open = R.trades.filter(t => t.open), done = R.trades.filter(t => !t.open);
    if (!R.trades.length) { el.innerHTML = ''; return; }
    const px = R.cur ? lastPx() : 0;
    el.innerHTML = `<span class="lbl">Positions (${open.length} ouverte${open.length > 1 ? 's' : ''}) · résultat de la séance <b class="${R.equity >= 0 ? 'up' : 'down'}">${R.equity >= 0 ? '+' : ''}${fmt(R.equity, 2)} $</b></span>
      ${open.map(t => { const pnl = (px - t.entry) * t.dir * t.units, r = pnl / t.riskUsd; return `<div class="rp-pos ${t.dir === 1 ? 'buy' : 'sell'}"><b>#${t.id} ${t.dir === 1 ? 'Achat' : 'Vente'}</b> ${fp(t.entry)} · SL ${fp(t.sl)} · TP ${fp(t.tp)}
        <span class="${r >= 0 ? 'up' : 'down'}"> ${r >= 0 ? '+' : ''}${r.toFixed(2)} R (${pnl >= 0 ? '+' : ''}${fmt(pnl, 2)} $)</span><br><span class="sub">${esc(t.day)} · ${esc(t.session)} · risque actuel ${fmt(riskNow(t), 0)} $</span>
        <div class="rp-row"><button class="iconbtn" type="button" data-be="${t.id}">Stop au break-even</button><button class="iconbtn" type="button" data-close="${t.id}">Clôturer</button></div></div>`; }).join('')}
      ${done.slice(-4).reverse().map(t => `<div class="rp-done"><span>#${t.id} ${t.dir === 1 ? 'Achat' : 'Vente'} · ${esc(t.why)}</span><b class="${t.R >= 0 ? 'up' : 'down'}">${t.R >= 0 ? '+' : ''}${t.R.toFixed(2)} R</b><span>note ${t.review.total}</span></div>`).join('')}`;
    el.querySelectorAll('[data-be]').forEach(b => b.onclick = () => { const t = R.trades.find(x => x.id === +b.dataset.be); if (!t || !t.open) return;
      if ((t.entry - lastPx()) * t.dir >= 0) { say('Le prix n\'est pas encore au-delà de ton entrée : break-even impossible.', 'warn'); return; }
      t.sl = t.entry; priceLines(); renderPositions(); requestAnimationFrame(drawOverlay); say(`Trade n°${t.id} : stop au point d'entrée, il ne peut plus coûter.`, 'ok'); });
    el.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { const t = R.trades.find(x => x.id === +b.dataset.close); if (t) closeTrade(t, lastPx(), 'clôture manuelle'); });
  }
  function renderMsgs() {
    const el = R.root && R.root.querySelector('[data-rp="msgs"]'); if (!el) return;
    el.innerHTML = R.msgs.slice(-30).map(m => `<div class="rp-msg ${m.kind}"><span class="av">🎓</span><div>${m.html}</div></div>`).join('');
    el.scrollTop = el.scrollHeight;
  }
  function renderStats() {
    const el = R.root && R.root.querySelector('[data-rp="stats"]'); if (!el) return;
    const H = lsGet(HKEY, []), A = getAgg(), v = A.validated || 0, pctG = Math.min(100, v / R.goal * 100), [lvl, li] = level(v);
    const head = `<div class="rp-cert"><div class="rp-cert-top"><span class="lbl">Trades gagnants validés</span><b>${fmt(v, 0)} / ${fmt(R.goal, 0)}</b></div>
        <div class="bar"><i style="width:${Math.max(0.5, pctG)}%"></i></div>
        <div class="rp-levels">${['Débutant', 'Apprenti', 'Intermédiaire', 'Avancé', 'Expert', 'Certifié'].map((n, i) => `<span class="${i <= li ? 'on' : ''}">${n}</span>`).join('')}</div>
        <p class="sub">Niveau : <b>${esc(lvl)}</b>. Un trade est <b>validé</b> s'il est gagnant, noté au moins 70 / 100 par le professeur et sans stop éloigné. Objectif pour maîtriser l'analyse SMC / ICT :
          <input class="rp-goal" type="number" min="10" step="10" value="${R.goal}" data-rp="goal"> trades validés.</p></div>`;
    if (!A.n) { el.innerHTML = head + '<p class="sub">Tes trades simulés apparaîtront ici : c\'est le backtest de <b>ta</b> stratégie.</p>'; bindGoal(el); return; }
    const errs = Object.entries(A.errs || {}).sort((a, b) => b[1] - a[1]).slice(0, 3), sumR = A.gp - A.gl;
    el.innerHTML = head + `<div class="rp-stats">
        <div><span>Trades</span><b>${fmt(A.n, 0)}</b></div><div><span>Réussite</span><b>${Math.round(A.wins / A.n * 100)} %</b></div>
        <div><span>R cumulé</span><b class="${sumR >= 0 ? 'up' : 'down'}">${sumR >= 0 ? '+' : ''}${sumR.toFixed(1)}</b></div><div><span>Espérance</span><b>${(sumR / A.n) >= 0 ? '+' : ''}${(sumR / A.n).toFixed(2)} R</b></div>
        <div><span>Facteur de profit</span><b>${A.gl ? (A.gp / A.gl).toFixed(2) : '∞'}</b></div><div><span>Note moyenne</span><b>${Math.round(A.score / A.n)}/100</b></div></div>
      ${errs.length ? `<p class="sub"><b>À travailler :</b> ${errs.map(([e, n]) => `${esc(e)} (${n}×)`).join(', ')}.</p>` : ''}
      <div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Marché</th><th>Session</th><th>Sens</th><th>R</th><th>Note</th><th>✓</th></tr></thead><tbody>
        ${H.slice(-8).reverse().map(x => `<tr><td>${new Date(x.d).toLocaleDateString('fr-FR')}</td><td>${esc(SYM[x.sym] ? SYM[x.sym].name : x.sym)} ${esc(x.tf)}</td><td>${esc(x.session || '—')}</td><td class="${x.dir === 1 ? 'up' : 'down'}">${x.dir === 1 ? 'Achat' : 'Vente'}</td><td class="${x.R >= 0 ? 'up' : 'down'}">${x.R >= 0 ? '+' : ''}${x.R}</td><td>${x.score}</td><td>${x.validated ? '✓' : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <button class="iconbtn" type="button" data-rp="reset">Remettre le suivi à zéro</button>`;
    bindGoal(el);
    el.querySelector('[data-rp="reset"]').onclick = () => { if (confirm('Effacer tout l\'historique et la progression du simulateur ?')) { lsSet(HKEY, []); lsSet(AGG, emptyAgg()); renderStats(); } };
  }
  function bindGoal(el) { const g = el.querySelector('[data-rp="goal"]'); if (g) g.onchange = e => { R.goal = Math.max(10, Math.round(+e.target.value || 26000)); lsSet('at:rp:goal', R.goal); renderStats(); }; }
  window.addEventListener('at:view', e => { if (e.detail !== 'academy') stop(); });
  window.ATReplay = { mount, unmount: destroyChart, _R: R };
})();
