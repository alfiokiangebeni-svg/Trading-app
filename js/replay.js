/* Alerte Trading — Académie : simulateur de marché (replay façon TradingView) avec professeur.
   L'élève remonte le marché, le fait défiler comme en réel, trace ses plus hauts / plus bas, OB, FVG,
   lignes, déclare la tendance puis achète ou vend. Le professeur compare son analyse aux détecteurs
   du bot (sur les seules bougies déjà visibles : aucune information du futur), explique et note,
   puis débriefe le trade. Historique = backtest de la stratégie de l'élève. */
(function () {
  'use strict';
  const TF = { '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400 };
  const HTF = { '5m': '1h', '15m': '4h', '30m': '4h', '1h': '1D', '4h': '1D' };
  const HTF_SEC = { '1h': 3600, '4h': 14400, '1D': 86400 };
  const REWIND = [['1w', '1 semaine', 7 * 86400], ['4d', '4 jours', 4 * 86400], ['2d', '2 jours', 2 * 86400], ['1d', '1 journée', 86400],
    ['4h', '4 h', 14400], ['1h', '1 h', 3600], ['30m', '30 min', 1800], ['15m', '15 min', 900], ['5m', '5 min', 300], ['rand', 'Date au hasard', 0]];
  const SYM = { 'XAU/USD': { bin: 'PAXGUSDT', name: 'Or (PAXG)', dec: 2, contract: 100, unit: 'lot' }, 'BTC/USD': { bin: 'BTCUSDT', name: 'Bitcoin', dec: 1, contract: 1, unit: 'BTC' } };
  const HIST = 300;            // bougies d'historique avant le point de départ
  const HKEY = 'at:replay:v1';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const R = {
    sym: lsGet('at:rp:sym', 'XAU/USD'), tf: lsGet('at:rp:tf', '15m'), rewind: lsGet('at:rp:rw', '2d'),
    all: [], cur: 0, sub: 0, live: null, startT: 0, playing: false, speed: 3, timer: null, acc: 0,
    tool: 'cursor', pending: null, draws: [], trend: null, showFix: false, marks: [],
    trade: null, closed: [], msgs: [], loading: false, src: '', scored: null, root: null, onBack: null
  };
  let chart = null, series = null, ov = null, octx = null, box = null, resizeObs = null;
  const lib = () => window.AT && window.AT.lib;
  const fmt = (x, d) => window.AT ? window.AT.fmt(x, d) : String(x);
  const fp = x => fmt(x, SYM[R.sym].dec);
  const dtf = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const fT = t => dtf.format(new Date(t * 1000));

  /* ---------------- données ---------------- */
  async function klines(sym, tf, startT, endT) {
    const out = [], step = TF[tf] * 1000;
    let s = startT * 1000;
    const hosts = ['https://data-api.binance.vision', 'https://api.binance.com'];
    while (s < endT * 1000) {
      let ok = false;
      for (const h of hosts) {
        try {
          const r = await fetch(`${h}/api/v3/klines?symbol=${SYM[sym].bin}&interval=${tf}&startTime=${s}&endTime=${endT * 1000}&limit=1000`, { cache: 'no-store' });
          if (!r.ok) throw new Error(r.status);
          const j = await r.json();
          for (const k of j) out.push({ t: Math.floor(k[0] / 1000), o: +k[1], h: +k[2], l: +k[3], c: +k[4] });
          s = j.length ? j[j.length - 1][0] + step : endT * 1000;
          ok = true; break;
        } catch (e) { /* hôte suivant */ }
      }
      if (!ok) throw new Error('Binance injoignable');
    }
    const seen = new Set();
    return out.filter(x => !seen.has(x.t) && seen.add(x.t)).sort((a, b) => a.t - b.t);
  }
  function demo(tf, startT, endT) { // données de secours, clairement signalées
    const sec = TF[tf], out = []; let p = R.sym === 'BTC/USD' ? 78000 : 4000, seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let t = Math.floor(startT / sec) * sec; t < endT; t += sec) {
      const v = p * 0.0018 * Math.sqrt(sec / 900), o = p, c = o + (rnd() - 0.5) * 2 * v + Math.sin(t / 40000) * v * 0.15;
      out.push({ t, o, h: Math.max(o, c) + rnd() * v * 0.6, l: Math.min(o, c) - rnd() * v * 0.6, c }); p = c;
    }
    return out;
  }
  async function load(keepTime) {
    const sec = TF[R.tf], now = Math.floor(Date.now() / 1000);
    let start;
    if (keepTime && R.all.length) start = cursorTime();
    else if (R.rewind === 'rand') start = now - Math.floor((3 + Math.random() * 57) * 86400);
    else start = now - (REWIND.find(r => r[0] === R.rewind) || REWIND[2])[2];
    start = Math.floor(start / sec) * sec;
    const end = R.rewind === 'rand' && !keepTime ? Math.min(now, start + 400 * sec) : now;
    R.loading = true; renderStatus('Chargement des bougies…');
    let all, src;
    try { all = await klines(R.sym, R.tf, start - HIST * sec, end); src = 'Binance · ' + SYM[R.sym].bin; }
    catch (e) { all = demo(R.tf, start - HIST * sec, end); src = 'données de démonstration (Binance injoignable)'; }
    // une bougie encore en formation n'est jamais « future » : on la retire
    if (all.length && all[all.length - 1].t + sec > now) all.pop();
    R.all = all; R.src = src; R.loading = false;
    let idx = all.findIndex(x => x.t + sec > start); if (idx < 0) idx = all.length;
    R.cur = Math.min(all.length, Math.max(Math.min(30, all.length), idx));
    R.sub = 0; R.live = null; R.startT = start;
    if (!keepTime) { R.scored = null; }
    setData();
    return all.length - R.cur;
  }
  function cursorTime() { const sec = TF[R.tf]; return R.cur ? R.all[R.cur - 1].t + sec : 0; }
  const visible = () => R.all.slice(0, R.cur);

  /* ---------------- graphique ---------------- */
  function buildChart() {
    const LC = window.LightweightCharts; if (!LC) return;
    box = R.root.querySelector('.rp-chart');
    chart = LC.createChart(box.querySelector('.rp-c'), {
      autoSize: true, crosshair: { mode: 0 },
      layout: { background: { type: 'solid', color: css('chart-bg') }, textColor: css('muted'), fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
      grid: { vertLines: { color: css('line') }, horzLines: { color: css('line') } },
      rightPriceScale: { borderColor: css('line') }, timeScale: { borderColor: css('line'), timeVisible: true, rightOffset: 12 },
      localization: { locale: 'fr-FR', priceFormatter: p => fp(p) }
    });
    const up = css('bull'), dn = css('bear');
    series = chart.addCandlestickSeries({ upColor: up, downColor: dn, borderUpColor: up, borderDownColor: dn, wickUpColor: up, wickDownColor: dn,
      priceFormat: { type: 'price', precision: SYM[R.sym].dec, minMove: Math.pow(10, -SYM[R.sym].dec) } });
    ov = box.querySelector('canvas.rp-ov'); octx = ov.getContext('2d');
    const redraw = () => requestAnimationFrame(drawOverlay);
    chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    chart.subscribeCrosshairMove(redraw);
    resizeObs = new ResizeObserver(redraw); resizeObs.observe(box);
    // Clics / tapotements gérés directement (pointer events : souris et écran tactile)
    const el = box.querySelector('.rp-c'); let down = null;
    el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; }, true);
    el.addEventListener('pointerup', e => {
      if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
      if (moved > 8 || !chart) return;
      const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (x > r.width - chart.priceScale('right').width() || y > r.height - chart.timeScale().height()) return;
      onClick({ point: { x, y }, logical: chart.timeScale().coordinateToLogical(x) });
    }, true);
  }
  function destroyChart() { stop(); if (resizeObs) resizeObs.disconnect(); if (chart) chart.remove(); chart = series = null; }
  function setData() {
    if (!series) return;
    series.applyOptions({ priceFormat: { type: 'price', precision: SYM[R.sym].dec, minMove: Math.pow(10, -SYM[R.sym].dec) } });
    series.setData(visible().map(x => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c })));
    chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, R.cur - 120), to: R.cur + 12 });
    tradeLines(); applyMarks(); requestAnimationFrame(drawOverlay); renderStatus();
  }

  /* ---------------- lecture (play) ---------------- */
  function path(k) { return k.c >= k.o ? [k.o, k.l, k.h, k.c] : [k.o, k.h, k.l, k.c]; } // trajet réaliste dans la bougie
  function stepSub() {
    if (R.cur >= R.all.length) { stop(); say('Fin des données : tu es revenu au présent. Relance une séance pour t\'entraîner encore.', 'info'); return false; }
    const k = R.all[R.cur], pts = path(k), i = R.sub;
    const prev = R.live ? R.live.c : k.o, px = pts[i];
    R.live = i === 0 ? { t: k.t, o: k.o, h: k.o, l: k.o, c: k.o } : R.live;
    R.live.c = px; R.live.h = Math.max(R.live.h, px); R.live.l = Math.min(R.live.l, px);
    series.update({ time: k.t, open: R.live.o, high: R.live.h, low: R.live.l, close: R.live.c });
    checkTrade(prev, px, k.t);
    R.sub++;
    if (R.sub >= 4) { R.sub = 0; R.live = null; R.cur++; onCandleClosed(); }
    return true;
  }
  function stepCandle() { do { if (!stepSub()) break; } while (R.sub !== 0); requestAnimationFrame(drawOverlay); renderStatus(); }
  function play() {
    if (R.playing || R.loading) return; R.playing = true; R.acc = 0;
    R.timer = setInterval(() => {
      R.acc += R.speed * 4 * 40 / 1000; // sous-étapes à jouer
      let n = Math.floor(R.acc); R.acc -= n;
      while (n-- > 0 && R.playing) if (!stepSub()) break;
      requestAnimationFrame(drawOverlay); renderStatus();
    }, 40);
    renderControls();
  }
  function stop() { R.playing = false; if (R.timer) clearInterval(R.timer); R.timer = null; renderControls(); }
  function onCandleClosed() {
    const t = R.trade;
    if (t && t.open) {
      const r = (R.all[R.cur - 1].c - t.entry) * t.dir / t.risk;
      if (!t.hint1 && r >= 1) { t.hint1 = true; say('Le trade atteint +1R. Le plan dit : stop au point d\'entrée (bouton « Stop au break-even ») pour qu\'il ne puisse plus coûter.', 'tip'); }
      if (!t.hintStruct) {
        const L = lib(), vis = visible(), ms = L.marketStructure(vis, L.findSwings(vis, 3));
        const last = ms.events[ms.events.length - 1];
        if (last && last.at === R.cur - 1 && last.dir === -t.dir) { t.hintStruct = true; say(`Attention : ${last.kind} ${last.dir === 1 ? 'haussier' : 'baissier'} contre ta position à ${fp(last.level)}. La raison du trade s'affaiblit : surveille ton stop.`, 'warn'); }
      }
    }
  }

  /* ---------------- outils de tracé ---------------- */
  const TOOLS = [['cursor', '↖', 'Curseur'], ['hi', 'H', 'Plus haut'], ['lo', 'B', 'Plus bas'], ['ob', 'OB', 'Order block (clic sur la bougie)'], ['fvg', 'FVG', 'FVG (clic sur la bougie du milieu)'],
    ['hline', '—', 'Ligne horizontale'], ['tline', '╱', 'Ligne de tendance (2 clics)'], ['erase', '⌫', 'Gomme']];
  function logicalOf(t) { const a = R.all; if (!a.length) return 0; const sec = TF[R.tf];
    let lo = 0, hi = a.length - 1; if (t >= a[hi].t) return hi + (t - a[hi].t) / sec; if (t <= a[0].t) return (t - a[0].t) / sec;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m].t <= t) lo = m; else hi = m; } return lo + (t - a[lo].t) / (a[hi].t - a[lo].t); }
  function xOf(t) { return chart.timeScale().logicalToCoordinate(logicalOf(t)); }
  function candleAt(param) {
    let l = param.logical; if (l == null && param.point) l = chart.timeScale().coordinateToLogical(param.point.x);
    if (l == null) return null; const i = Math.round(l); if (i < 0 || i >= R.cur) return null; return { i, k: R.all[i] };
  }
  function onClick(param) {
    if (!param.point || R.tool === 'cursor') return;
    const price = series.coordinateToPrice(param.point.y); const ck = candleAt(param);
    const tAt = () => { const l = chart.timeScale().coordinateToLogical(param.point.x); const i = Math.round(l);
      if (i >= 0 && i < R.all.length) return R.all[i].t; const last = R.all[R.cur - 1]; return last.t + (i - (R.cur - 1)) * TF[R.tf]; };
    if (R.tool === 'erase') { eraseNear(param.point.x, param.point.y); return; }
    if (R.tool === 'hi' || R.tool === 'lo') {
      if (!ck) return; const hi = R.tool === 'hi';
      R.draws = R.draws.filter(d => !((d.type === 'hi' || d.type === 'lo') && d.t === ck.k.t));
      R.draws.push({ type: R.tool, t: ck.k.t, p: hi ? ck.k.h : ck.k.l, tf: R.tf });
      const n = R.draws.filter(d => d.type === 'hi' || d.type === 'lo').length;
      if (n === 4) say('Bien. Avec 2 plus hauts et 2 plus bas, la structure apparaît : sommets et creux montent-ils (HH / HL) ou descendent-ils (LH / LL) ? Déclare la tendance à droite.', 'tip');
    } else if (R.tool === 'ob') {
      if (!ck) return; const k = ck.k, dir = k.c < k.o ? 1 : -1; // bougie baissière = OB haussier potentiel, et inversement
      R.draws.push({ type: 'ob', t: k.t, top: k.h, bot: k.l, dir, i: ck.i, tf: R.tf }); quickOB(R.draws[R.draws.length - 1]);
    } else if (R.tool === 'fvg') {
      if (!ck || ck.i < 1 || ck.i + 1 >= R.cur) { say('Pour un FVG, clique sur la bougie du milieu d\'un mouvement de 3 bougies déjà clôturées.', 'warn'); return; }
      const a = R.all[ck.i - 1], c = R.all[ck.i + 1];
      if (c.l > a.h) R.draws.push({ type: 'fvg', t: R.all[ck.i].t, top: c.l, bot: a.h, dir: 1, i: ck.i, tf: R.tf });
      else if (c.h < a.l) R.draws.push({ type: 'fvg', t: R.all[ck.i].t, top: a.l, bot: c.h, dir: -1, i: ck.i, tf: R.tf });
      else { say(`Pas de FVG ici : le bas de la bougie suivante (${fp(c.l)}) ne dépasse pas le haut de la précédente (${fp(a.h)}), et inversement. Un FVG est un « trou » entre la mèche de la bougie 1 et celle de la bougie 3.`, 'warn'); return; }
      quickFVG(R.draws[R.draws.length - 1]);
    } else if (R.tool === 'hline') { R.draws.push({ type: 'hline', p: price }); }
    else if (R.tool === 'tline') {
      if (!R.pending) { R.pending = { t: tAt(), p: price }; say('Deuxième clic pour terminer la ligne de tendance.', 'info'); return; }
      R.draws.push({ type: 'tline', t1: R.pending.t, p1: R.pending.p, t2: tAt(), p2: price }); R.pending = null;
    } else if (R.tool === 'sl' || R.tool === 'tp') {
      if (R.trade && !R.trade.open) { R.trade[R.tool] = price; R.tool = 'cursor'; chart.applyOptions({ handleScroll: true }); renderTicket(); tradeLines(); renderTools(); }
      return;
    }
    requestAnimationFrame(drawOverlay); renderStats();
  }
  function eraseNear(x, y) {
    let best = -1, bd = 18;
    R.draws.forEach((d, i) => {
      let dist = 1e9;
      if (d.type === 'hi' || d.type === 'lo') { const px = xOf(d.t), py = series.priceToCoordinate(d.p); if (px != null && py != null) dist = Math.hypot(px - x, py - y); }
      else if (d.type === 'hline') { const py = series.priceToCoordinate(d.p); if (py != null) dist = Math.abs(py - y); }
      else if (d.type === 'ob' || d.type === 'fvg') { const y0 = series.priceToCoordinate(d.top), y1 = series.priceToCoordinate(d.bot), x0 = xOf(d.t);
        if (y0 != null && y1 != null && x0 != null && x >= x0 - 6 && y >= Math.min(y0, y1) - 6 && y <= Math.max(y0, y1) + 6) dist = 0; }
      else if (d.type === 'tline') { const ax = xOf(d.t1), ay = series.priceToCoordinate(d.p1), bx = xOf(d.t2), by = series.priceToCoordinate(d.p2);
        if ([ax, ay, bx, by].every(v => v != null)) { const L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1; const u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2)); dist = Math.hypot(ax + u * (bx - ax) - x, ay + u * (by - ay) - y); } }
      if (dist < bd) { bd = dist; best = i; }
    });
    if (best >= 0) { R.draws.splice(best, 1); requestAnimationFrame(drawOverlay); renderStats(); }
  }

  /* ---------------- dessin (canvas) ---------------- */
  function drawOverlay() {
    if (!chart || !ov) return;
    const r = box.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    ov.width = Math.round(r.width * dpr); ov.height = Math.round(r.height * dpr); ov.style.width = r.width + 'px'; ov.style.height = r.height + 'px';
    const g = octx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
    const W = r.width - chart.priceScale('right').width(), H = r.height - chart.timeScale().height();
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    g.font = '600 10px "JetBrains Mono", monospace';
    const col = { bull: css('bull'), bear: css('bear'), acc: css('accent'), mut: css('muted'), fg: css('fg') };
    const zone = (d, dashed, alpha) => {
      const y0 = series.priceToCoordinate(d.top), y1 = series.priceToCoordinate(d.bot); let x0 = xOf(d.t); if (y0 == null || y1 == null) return; if (x0 == null) x0 = 0;
      const c = d.type === 'fvg' ? col.acc : (d.dir === 1 ? col.bull : col.bear);
      g.globalAlpha = alpha; g.fillStyle = c; g.fillRect(x0, Math.min(y0, y1), W - x0, Math.max(2, Math.abs(y1 - y0))); g.globalAlpha = 1;
      g.strokeStyle = c; g.setLineDash(dashed ? [5, 4] : []); g.strokeRect(x0 + .5, Math.min(y0, y1) + .5, W - x0 - 1, Math.max(2, Math.abs(y1 - y0)) - 1); g.setLineDash([]);
      g.fillStyle = c; g.fillText((d.type === 'fvg' ? 'FVG' : 'OB') + (dashed ? ' (prof)' : ''), x0 + 4, Math.min(y0, y1) + 11);
    };
    // correction du professeur (pointillés)
    if (R.showFix && R.cur > 30) {
      const fx = teacherView();
      fx.obs.forEach(o => zone(Object.assign({ type: 'ob' }, o), true, 0.07));
      fx.fvgs.forEach(f => zone(Object.assign({ type: 'fvg' }, f), true, 0.07));
      fx.swings.forEach(s => { const x = xOf(s.t), y = series.priceToCoordinate(s.p); if (x == null || y == null) return;
        g.strokeStyle = col.acc; g.setLineDash([3, 3]); g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        g.fillStyle = col.acc; g.fillText(s.label, x - 8, s.hi ? y - 12 : y + 20); });
      fx.events.forEach(e => { const x0 = xOf(e.tFrom), x1 = xOf(e.t), y = series.priceToCoordinate(e.level); if (x0 == null || x1 == null || y == null) return;
        g.strokeStyle = e.dir === 1 ? col.bull : col.bear; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.setLineDash([]);
        g.fillStyle = g.strokeStyle; g.fillText(e.kind, (x0 + x1) / 2 - 12, y + (e.dir === 1 ? -4 : 12)); });
    }
    // tracés de l'élève
    for (const d of R.draws) {
      if (d.type === 'ob' || d.type === 'fvg') zone(d, false, 0.14);
      else if (d.type === 'hline') { const y = series.priceToCoordinate(d.p); if (y == null) continue; g.strokeStyle = col.fg; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.fillStyle = col.fg; g.fillText(fp(d.p), 4, y - 3); }
      else if (d.type === 'tline') { const ax = xOf(d.t1), ay = series.priceToCoordinate(d.p1), bx = xOf(d.t2), by = series.priceToCoordinate(d.p2);
        if ([ax, ay, bx, by].some(v => v == null)) continue; const k = (by - ay) / ((bx - ax) || 1); g.strokeStyle = col.fg; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ax, ay); g.lineTo(W, ay + k * (W - ax)); g.stroke(); g.lineWidth = 1; }
    }
    const marks = R.draws.filter(d => d.type === 'hi' || d.type === 'lo').sort((a, b) => a.t - b.t);
    const lastHi = {}, lab = new Map();
    for (const m of marks) { const prev = lastHi[m.type]; lab.set(m, prev == null ? (m.type === 'hi' ? 'H' : 'B') : m.type === 'hi' ? (m.p > prev ? 'HH' : 'LH') : (m.p > prev ? 'HL' : 'LL')); lastHi[m.type] = m.p; }
    if (marks.length > 1) { g.strokeStyle = col.mut; g.setLineDash([]); g.beginPath(); let first = true;
      for (const m of marks) { const x = xOf(m.t), y = series.priceToCoordinate(m.p); if (x == null || y == null) continue; if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y); } g.stroke(); }
    for (const m of marks) { const x = xOf(m.t), y = series.priceToCoordinate(m.p); if (x == null || y == null) continue;
      const hi = m.type === 'hi', c = hi ? col.bear : col.bull; g.fillStyle = c; g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill();
      g.font = '700 11px "JetBrains Mono", monospace'; g.fillText(lab.get(m), x - 9, hi ? y - 9 : y + 17); g.font = '600 10px "JetBrains Mono", monospace'; }
    if (R.pending) { const x = xOf(R.pending.t), y = series.priceToCoordinate(R.pending.p); if (x != null && y != null) { g.fillStyle = col.fg; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); } }
    // point de départ du replay
    const xs = xOf(R.startT); if (xs != null && xs > 0) { g.strokeStyle = col.acc; g.globalAlpha = .5; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(xs, 0); g.lineTo(xs, H); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; g.fillStyle = col.acc; g.fillText('départ replay', xs + 4, 12); }
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
    const events = ms.events.filter(e => e.at >= from).slice(-5);
    let htf = 0; const H = L.aggregate(vis, HTF_SEC[HTF[R.tf]]).slice(0, -1);
    if (H.length >= 12) htf = L.marketStructure(H, L.findSwings(H, 2)).trend;
    let Hh = null, Ll = null; if (ms.lastH) Hh = ms.lastH.p; if (ms.lastL) Ll = ms.lastL.p;
    const px = vis[n - 1].c, pos = Hh != null && Ll != null && Hh > Ll ? (px - Ll) / (Hh - Ll) : null;
    return { swings, obs, fvgs, events, trend: ms.trend, lastEv: ms.events[ms.events.length - 1] || null, htf, atr: atr[n - 1], pos, Hh, Ll, px, sw, from };
  }
  const trendTxt = t => t === 1 ? 'haussière' : t === -1 ? 'baissière' : 'sans direction claire (range)';
  function explainTrend(fx) {
    const hs = fx.swings.filter(s => s.hi).slice(-2), ls = fx.swings.filter(s => !s.hi).slice(-2);
    const parts = [];
    if (hs.length === 2) parts.push(`sommets ${hs[1].p > hs[0].p ? 'croissants' : 'décroissants'} (${fp(hs[0].p)} → ${fp(hs[1].p)}, ${hs[1].label})`);
    if (ls.length === 2) parts.push(`creux ${ls[1].p > ls[0].p ? 'croissants' : 'décroissants'} (${fp(ls[0].p)} → ${fp(ls[1].p)}, ${ls[1].label})`);
    const ev = fx.lastEv ? `Dernier événement : ${fx.lastEv.kind} ${fx.lastEv.dir === 1 ? 'haussier' : 'baissier'} qui a clôturé au-delà de ${fp(fx.lastEv.level)} le ${fT(fx.lastEv.t)}.` : '';
    return `La tendance ${R.tf} est ${trendTxt(fx.trend)} : ${parts.join(' et ') || 'pas assez de swings visibles'}. ${ev} Sur l'UT supérieure (${HTF[R.tf]}), elle est ${trendTxt(fx.htf)}.`;
  }
  function quickOB(d) {
    const fx = teacherView(), k = R.all[d.i], match = fx.obs.find(o => Math.abs(o.i - d.i) <= 1);
    const after = R.all.slice(d.i + 1, R.cur), broken = after.some(x => d.dir === 1 ? x.c < d.bot : x.c > d.top);
    if (broken) say(`Cet OB a déjà été cassé (une bougie a clôturé ${d.dir === 1 ? 'sous' : 'au-dessus de'} la zone) : il n'est plus valable. Un OB doit être intact.`, 'warn');
    else if (match) say(`Bon OB ${match.dir === 1 ? 'haussier' : 'baissier'} : c'est bien la dernière bougie ${match.dir === 1 ? 'baissière' : 'haussière'} avant le mouvement qui a cassé la structure. Zone ${fp(match.bot)} – ${fp(match.top)}.`, 'ok');
    else {
      const any = fx.obs.filter(o => o.dir === d.dir).pop();
      say(`Je ne valide pas cet OB : un OB est la dernière bougie ${d.dir === 1 ? 'baissière avant une impulsion haussière' : 'haussière avant une impulsion baissière'} qui casse un sommet/creux (BOS ou CHoCH). ${any ? `Regarde plutôt la zone ${fp(any.bot)} – ${fp(any.top)} (bougie du ${fT(any.t)}).` : 'Aucun OB intact de ce sens dans la zone récente.'}`, 'warn');
    }
    void k;
  }
  function quickFVG(d) {
    const filled = R.all.slice(d.i + 2, R.cur).some(x => d.dir === 1 ? x.l <= d.bot : x.h >= d.top);
    say(filled ? `FVG ${d.dir === 1 ? 'haussier' : 'baissier'} correct, mais il a déjà été comblé : il a perdu l'essentiel de son intérêt.`
      : `FVG ${d.dir === 1 ? 'haussier' : 'baissier'} correct (${fp(d.bot)} – ${fp(d.top)}) et encore ouvert : le prix peut revenir le combler.${d.dir === 1 ? ' C\'est une zone d\'achat si la tendance est haussière.' : ' C\'est une zone de vente si la tendance est baissière.'}`, filled ? 'warn' : 'ok');
  }
  function reviewAnalysis(silent) {
    const fx = teacherView(), notes = [], miss = [];
    // 1. structure (25)
    const majors = fx.swings.slice(-8), marks = R.draws.filter(d => (d.type === 'hi' || d.type === 'lo') && d.tf === R.tf);
    const found = majors.filter(s => marks.some(m => (m.type === 'hi') === s.hi && Math.abs(logicalOf(m.t) - s.i) <= 2));
    const extra = marks.filter(m => !fx.swings.some(s => (m.type === 'hi') === s.hi && Math.abs(logicalOf(m.t) - s.i) <= 2) && logicalOf(m.t) >= fx.from);
    let sStruct = majors.length ? Math.round(25 * found.length / majors.length) - Math.min(8, extra.length * 2) : 0; sStruct = Math.max(0, sStruct);
    if (!marks.length) notes.push(['ko', 'Structure', 'Tu n\'as marqué aucun plus haut / plus bas. Commence toujours par là : c\'est la base de toute lecture de tendance.']);
    else {
      notes.push([found.length >= majors.length * 0.6 ? 'ok' : 'warn', 'Structure', `Tu as trouvé ${found.length} des ${majors.length} sommets/creux importants récents${extra.length ? `, et ${extra.length} marque(s) ne correspondent pas à un vrai swing (il faut des bougies plus basses de chaque côté pour un sommet)` : ''}.`]);
      majors.filter(s => !found.includes(s)).slice(-3).forEach(s => miss.push(`${s.hi ? 'sommet' : 'creux'} ${s.label} à ${fp(s.p)} (${fT(s.t)})`));
      if (miss.length) notes.push(['info', 'Oubliés', miss.join(' · ') + '. Active « Correction » pour les voir.']);
    }
    // 2. tendance (15)
    let sTrend = 0;
    if (R.trend == null) notes.push(['ko', 'Tendance', 'Tu n\'as pas déclaré la tendance. ' + explainTrend(fx)]);
    else if (R.trend === fx.trend) { sTrend = 15; notes.push(['ok', 'Tendance', 'Exact. ' + explainTrend(fx)]); }
    else notes.push(['ko', 'Tendance', `Tu as indiqué une tendance ${trendTxt(R.trend)}. ${explainTrend(fx)}`]);
    // 3. zones (20)
    const zones = R.draws.filter(d => (d.type === 'ob' || d.type === 'fvg') && d.tf === R.tf);
    let good = 0;
    zones.forEach(z => {
      const broken = R.all.slice(z.i + 1, R.cur).some(x => z.dir === 1 ? x.c < z.bot : x.c > z.top);
      const ok = z.type === 'fvg' ? !broken : fx.obs.some(o => Math.abs(o.i - z.i) <= 1);
      if (ok && !broken) good++;
    });
    const sZones = zones.length ? Math.round(20 * good / zones.length) : 0;
    notes.push([zones.length ? (good === zones.length ? 'ok' : 'warn') : 'ko', 'Zones', zones.length ? `${good} zone(s) valable(s) sur ${zones.length} tracée(s).${fx.obs.length || fx.fvgs.length ? ` Le bot voit ${fx.obs.length} OB et ${fx.fvgs.length} FVG intacts dans la zone récente.` : ''}` : 'Aucun OB ni FVG tracé : sans zone, on ne sait pas où entrer.']);
    const res = { fx, notes, sStruct, sTrend, sZones };
    if (!silent) { notes.forEach(n => say(`<b>${n[1]}</b> — ${n[2]}`, n[0])); say(`Score d'analyse : <b>${sStruct + sTrend + sZones} / 60</b> (structure ${sStruct}/25, tendance ${sTrend}/15, zones ${sZones}/20). La décision de trade compte pour les 40 points restants.`, 'score'); }
    return res;
  }
  function reviewDecision(t) {
    const an = reviewAnalysis(true), fx = an.fx, out = [];
    let sDir = 0, sLoc = 0, sSL = 0, sRR = 0, sKZ = 0;
    if (fx.trend === t.dir) { sDir = 10; out.push(['ok', 'Sens', `Tu trades dans le sens de la tendance ${trendTxt(fx.trend)}.`]); }
    else out.push(['ko', 'Sens', `Tu ${t.dir === 1 ? 'achètes' : 'vends'} alors que la tendance ${R.tf} est ${trendTxt(fx.trend)}. Trader contre la structure demande une raison très forte (CHoCH confirmé).`]);
    if (fx.htf && fx.htf !== t.dir) out.push(['warn', 'UT supérieure', `L'UT ${HTF[R.tf]} est ${trendTxt(fx.htf)} : ton trade va contre elle.`]);
    if (fx.pos != null) { const okLoc = t.dir === 1 ? fx.pos < 0.5 : fx.pos > 0.5; if (okLoc) sLoc = 10;
      out.push([okLoc ? 'ok' : 'ko', 'Emplacement', `Prix à ${Math.round(fx.pos * 100)} % du range (${fp(fx.Ll)} – ${fp(fx.Hh)}) : ${fx.pos < 0.5 ? 'discount' : 'premium'}. ${okLoc ? 'Bon côté pour ce trade.' : (t.dir === 1 ? 'Acheter en premium, c\'est acheter cher.' : 'Vendre en discount, c\'est vendre bon marché.')}`]); }
    const zones = R.draws.filter(d => d.type === 'ob' || d.type === 'fvg').concat(fx.obs.map(o => Object.assign({ type: 'ob' }, o)), fx.fvgs.map(f => Object.assign({ type: 'fvg' }, f)));
    const inZone = zones.some(z => z.dir === t.dir && t.entry <= z.top + fx.atr * 0.3 && t.entry >= z.bot - fx.atr * 0.3);
    if (inZone) { sLoc = Math.min(10, sLoc + 0); out.push(['ok', 'Zone', 'L\'entrée se fait dans ou près d\'une zone (OB / FVG) du bon sens.']); }
    else out.push(['warn', 'Zone', 'L\'entrée n\'est pas sur un OB ou un FVG : tu entres « au milieu de nulle part ».']);
    const ref = t.dir === 1 ? fx.sw.ls.filter(s => s.i < R.cur).pop() : fx.sw.hs.filter(s => s.i < R.cur).pop();
    const slBeyond = ref ? (t.dir === 1 ? t.sl < ref.p : t.sl > ref.p) : false;
    const slDist = Math.abs(t.entry - t.sl) / fx.atr;
    if (slBeyond && slDist <= 4) { sSL = 8; out.push(['ok', 'Stop', `Stop au-delà du dernier ${t.dir === 1 ? 'creux' : 'sommet'} (${fp(ref.p)}) : protégé par la structure.`]); }
    else if (slDist < 0.4) out.push(['ko', 'Stop', `Stop très serré (${slDist.toFixed(1)} ATR) : le moindre bruit le touchera.`]);
    else out.push(['warn', 'Stop', ref ? `Le stop n'est pas au-delà du dernier ${t.dir === 1 ? 'creux' : 'sommet'} (${fp(ref.p)}) : un sweep peut te sortir avant le vrai mouvement.` : 'Stop placé sans repère de structure.']);
    const rr = Math.abs(t.tp - t.entry) / Math.abs(t.entry - t.sl);
    if (rr >= 2) { sRR = 7; out.push(['ok', 'Risque / rendement', `R:R de 1:${rr.toFixed(1)} : une perte est compensée par la moitié d'un gain.`]); }
    else out.push([rr >= 1.5 ? 'warn' : 'ko', 'Risque / rendement', `R:R de 1:${rr.toFixed(1)}. Vise au moins 1:2 : avec 1:1, il faut gagner plus d'un trade sur deux juste pour couvrir les coûts.`]);
    const kz = window.AT && window.AT.killZone ? window.AT.killZone(cursorTime()) : null;
    if (kz === 'Londres' || kz === 'New York AM') { sKZ = 5; out.push(['ok', 'Horaire', `Entrée pendant la kill zone ${kz} : volumes institutionnels présents.`]); }
    else out.push(['warn', 'Horaire', `Entrée ${kz ? 'en session ' + kz : 'hors session'} (heure de New York ${fT(cursorTime()).split(' ').pop()}) : en dehors de Londres / New York AM, les mouvements sont moins fiables.`]);
    const decision = sDir + sLoc + sSL + sRR + sKZ, total = an.sStruct + an.sTrend + an.sZones + decision;
    return { notes: an.notes.concat(out), total, analysis: an.sStruct + an.sTrend + an.sZones, decision, rr, errors: out.filter(o => o[0] === 'ko').map(o => o[1]).concat(an.notes.filter(o => o[0] === 'ko').map(o => o[1])) };
  }
  function say(html, kind) { R.msgs.push({ html, kind: kind || 'info', t: Date.now() }); if (R.msgs.length > 60) R.msgs.shift(); renderMsgs(); }

  /* ---------------- trade ---------------- */
  function sizing(entry, sl) { const bal = (window.AT && window.AT.snapshot && window.AT.snapshot()) ? window.AT.snapshot().risk.balance : 10000;
    const pct = R.trade ? R.trade.pct : 1, risk = bal * pct / 100, units = risk / Math.max(1e-9, Math.abs(entry - sl));
    return { risk, label: R.sym === 'XAU/USD' ? `${fmt(units / 100, 2)} lot` : `${fmt(units, 4)} BTC` }; }
  function newTicket(dir) {
    if (R.trade && R.trade.open) { say('Tu as déjà une position ouverte : gère-la avant d\'en prendre une autre.', 'warn'); return; }
    stop();
    const vis = visible(), px = vis[vis.length - 1].c, fx = teacherView();
    const ref = dir === 1 ? fx.sw.ls.filter(s => s.i < R.cur).pop() : fx.sw.hs.filter(s => s.i < R.cur).pop();
    let sl = ref ? ref.p - dir * fx.atr * 0.2 : px - dir * fx.atr * 1.5; if ((px - sl) * dir <= fx.atr * 0.3) sl = px - dir * fx.atr * 1.2;
    R.trade = { dir, entry: px, sl, tp: px + dir * 2 * Math.abs(px - sl), pct: 1, open: false };
    renderTicket(); tradeLines();
  }
  function validate() {
    const t = R.trade; if (!t || t.open) return;
    if ((t.entry - t.sl) * t.dir <= 0) { say('Le stop doit être sous le prix pour un achat, au-dessus pour une vente.', 'ko'); return; }
    if ((t.tp - t.entry) * t.dir <= 0) { say('L\'objectif doit être au-dessus du prix pour un achat, en dessous pour une vente.', 'ko'); return; }
    t.open = true; t.risk = Math.abs(t.entry - t.sl); t.t0 = cursorTime(); t.i0 = R.cur; t.be = false;
    t.review = reviewDecision(t);
    addMark({ time: R.all[R.cur - 1].t, position: t.dir === 1 ? 'belowBar' : 'aboveBar', shape: t.dir === 1 ? 'arrowUp' : 'arrowDown', color: css('accent'), text: t.dir === 1 ? 'Achat' : 'Vente' });
    say(`<b>Ordre ${t.dir === 1 ? 'ACHAT' : 'VENTE'} validé</b> à ${fp(t.entry)} · stop ${fp(t.sl)} · objectif ${fp(t.tp)} · R:R 1:${t.review.rr.toFixed(1)}. Voici mon avis avant que le marché reparte :`, 'info');
    t.review.notes.forEach(n => say(`<b>${n[1]}</b> — ${n[2]}`, n[0]));
    say(`Note de la séance : <b>${t.review.total} / 100</b> (analyse ${t.review.analysis}/60, décision ${t.review.decision}/40). Lance ▶ pour voir le résultat.`, 'score');
    renderTicket(); tradeLines();
  }
  function checkTrade(p0, p1, t) {
    const tr = R.trade; if (!tr || !tr.open) return;
    const lo = Math.min(p0, p1), hi = Math.max(p0, p1);
    const hitSL = tr.sl >= lo && tr.sl <= hi, hitTP = tr.tp >= lo && tr.tp <= hi;
    if (hitSL || hitTP) {
      // ordre de passage sur le segment p0 -> p1
      const slFirst = hitSL && (!hitTP || Math.abs(tr.sl - p0) <= Math.abs(tr.tp - p0));
      closeTrade(slFirst ? tr.sl : tr.tp, slFirst ? (tr.be ? 'break-even' : 'stop') : 'objectif', t);
    }
  }
  function closeTrade(px, why, t) {
    const tr = R.trade; if (!tr || !tr.open) return;
    tr.open = false; tr.exit = px; tr.why = why; tr.R = (px - tr.entry) * tr.dir / tr.risk; tr.t1 = t || cursorTime();
    stop();
    const rec = { d: Date.now(), sym: R.sym, tf: R.tf, dir: tr.dir, entry: tr.entry, exit: px, R: +tr.R.toFixed(2), why, score: tr.review.total, errors: tr.review.errors, bars: R.cur - tr.i0 };
    addMark({ time: t || R.all[R.cur - 1].t, position: tr.dir === 1 ? 'aboveBar' : 'belowBar', shape: 'circle', color: tr.R >= 0 ? css('bull') : css('bear'), text: `${tr.R >= 0 ? '+' : ''}${tr.R.toFixed(1)}R` });
    const H = lsGet(HKEY, []); H.push(rec); lsSet(HKEY, H.slice(-200));
    const good = tr.review.total >= 70;
    let lesson;
    if (tr.R > 0 && good) lesson = 'Bon trade et bonne méthode : c\'est exactement ce qu\'il faut répéter.';
    else if (tr.R > 0) lesson = 'Gagnant, mais la méthode n\'était pas respectée : ne confonds pas chance et compétence. Sur 30 trades, les erreurs se paient.';
    else if (good) lesson = 'Perdant malgré une bonne analyse : ça arrive, c\'est le coût du métier. Une perte de 1R avec un plan respecté est un « bon » trade.';
    else lesson = 'Perdant, et la méthode n\'était pas respectée : relis les points en rouge ci-dessus avant la prochaine séance.';
    say(`<b>Trade clôturé (${why})</b> à ${fp(px)} après ${rec.bars} bougie(s) : <b class="${tr.R >= 0 ? 'up' : 'down'}">${tr.R >= 0 ? '+' : ''}${tr.R.toFixed(2)} R</b>. ${lesson}`, tr.R >= 0 ? 'ok' : 'ko');
    const fx = teacherView(); say('Ce que le marché a fait ensuite : ' + explainTrend(fx), 'info');
    renderTicket(); tradeLines(); renderStats();
  }
  function addMark(m) { R.marks.push(m); applyMarks(); }
  function applyMarks() { if (!series) return; const lim = R.cur ? R.all[Math.min(R.cur, R.all.length - 1)].t : 0;
    series.setMarkers(R.marks.filter(m => m.time <= lim).sort((a, b) => a.time - b.time)); }
  let plines = [];
  function tradeLines() {
    if (!series) return; plines.forEach(l => { try { series.removePriceLine(l); } catch (e) {} }); plines = [];
    const t = R.trade; if (!t || (t.exit != null && !t.open)) return;
    const add = (p, c, title) => plines.push(series.createPriceLine({ price: p, color: c, lineWidth: 2, lineStyle: t.open ? 0 : 2, axisLabelVisible: true, title }));
    add(t.entry, css('accent'), t.dir === 1 ? 'Achat' : 'Vente'); add(t.sl, css('bear'), 'Stop'); add(t.tp, css('bull'), 'Objectif');
  }

  /* ---------------- suivi de l'élève ---------------- */
  function stats() {
    const H = lsGet(HKEY, []), n = H.length; if (!n) return null;
    const w = H.filter(x => x.R > 0), gp = w.reduce((s, x) => s + x.R, 0), gl = -H.filter(x => x.R <= 0).reduce((s, x) => s + x.R, 0);
    const errs = {}; H.forEach(x => (x.errors || []).forEach(e => errs[e] = (errs[e] || 0) + 1));
    const last10 = H.slice(-10), prev10 = H.slice(-20, -10), avg = a => a.length ? a.reduce((s, x) => s + x.score, 0) / a.length : null;
    return { n, win: w.length / n, pf: gl ? gp / gl : (gp ? Infinity : 0), sumR: gp - gl, exp: (gp - gl) / n, score: avg(H), last: avg(last10), prev: avg(prev10),
      errs: Object.entries(errs).sort((a, b) => b[1] - a[1]).slice(0, 3), H };
  }

  /* ---------------- interface ---------------- */
  function mount(root, onBack) {
    R.root = root; R.onBack = onBack;
    root.innerHTML = `
      <div class="ac-nav"><button class="iconbtn" data-rp="back" type="button">← Académie</button><span class="sub">Simulateur · trader et backtester votre stratégie</span></div>
      <div class="card rp-setup">
        <div class="ctl"><span class="lbl">Marché</span><div class="seg" data-rp="sym">${Object.keys(SYM).map(s => `<button type="button" data-v="${s}">${SYM[s].name}</button>`).join('')}</div></div>
        <div class="ctl"><span class="lbl">Unité de temps</span><div class="seg" data-rp="tf">${Object.keys(TF).map(t => `<button type="button" data-v="${t}">${t}</button>`).join('')}</div></div>
        <div class="ctl"><span class="lbl">Remonter le marché de</span><select class="fsel" data-rp="rewind">${REWIND.map(r => `<option value="${r[0]}">${r[1]}</option>`).join('')}</select></div>
        <button class="btn primary" type="button" data-rp="start">Remonter et commencer</button>
      </div>
      <div class="rp-main">
        <div class="card rp-left">
          <div class="rp-tools" data-rp="tools"></div>
          <div class="rp-chart"><div class="rp-c"></div><canvas class="rp-ov"></canvas><div class="rp-status"></div></div>
          <div class="rp-ctrl" data-rp="ctrl"></div>
        </div>
        <aside class="rp-right">
          <div class="card rp-panel"><h3>Mon analyse</h3>
            <span class="lbl">Tendance que je vois</span><div class="seg rp-trend" data-rp="trend">
              <button type="button" data-v="1">Haussière</button><button type="button" data-v="0">Range</button><button type="button" data-v="-1">Baissière</button></div>
            <div class="rp-row"><button class="btn" type="button" data-rp="ask">Demander l'avis du professeur</button>
              <label class="check"><input type="checkbox" data-rp="fix"> Correction</label></div>
            <div class="rp-row"><button class="btn rp-buy" type="button" data-rp="buy">Acheter</button><button class="btn rp-sell" type="button" data-rp="sell">Vendre</button></div>
            <div class="rp-ticket" data-rp="ticket"></div>
          </div>
          <div class="card rp-panel"><h3>Professeur</h3><div class="rp-msgs" data-rp="msgs"></div></div>
          <div class="card rp-panel"><h3>Suivi de l'élève · backtest</h3><div data-rp="stats"></div></div>
        </aside>
      </div>`;
    const q = s => root.querySelector(`[data-rp="${s}"]`);
    q('back').onclick = () => { destroyChart(); onBack && onBack(); };
    q('sym').onclick = e => { const b = e.target.closest('button'); if (!b) return; R.sym = b.dataset.v; lsSet('at:rp:sym', R.sym); renderSetup(); };
    q('tf').onclick = async e => { const b = e.target.closest('button'); if (!b || b.dataset.v === R.tf) return; const was = R.all.length > 0; R.tf = b.dataset.v; lsSet('at:rp:tf', R.tf); renderSetup();
      if (was && !(R.trade && R.trade.open)) { stop(); await load(true); say(`Unité de temps changée en ${R.tf}, au même instant du replay. Tes tracés sont conservés ; seules les marques de l'UT courante comptent dans la note.`, 'info'); } };
    q('rewind').onchange = e => { R.rewind = e.target.value; lsSet('at:rp:rw', R.rewind); };
    q('start').onclick = start;
    q('trend').onclick = e => { const b = e.target.closest('button'); if (!b) return; R.trend = +b.dataset.v; renderSetup(); };
    q('ask').onclick = () => { if (!R.all.length) return; stop(); reviewAnalysis(false); };
    q('fix').onchange = e => { R.showFix = e.target.checked; if (R.showFix) say('Correction affichée en pointillés dorés : sommets / creux du bot (HH, HL, LH, LL), BOS / CHoCH, OB et FVG intacts. Compare-les aux tiens.', 'info'); requestAnimationFrame(drawOverlay); };
    q('buy').onclick = () => R.all.length && newTicket(1);
    q('sell').onclick = () => R.all.length && newTicket(-1);
    buildChart(); renderSetup(); renderTools(); renderControls(); renderTicket(); renderMsgs(); renderStats();
    if (!R.msgs.length) say('Bienvenue dans le simulateur. Choisis un marché, une unité de temps et de combien remonter, puis « Remonter et commencer ». Le graphique s\'arrête au point de départ : tu ne vois pas le futur.', 'info');
    if (R.all.length) setData();
  }
  async function start() {
    stop(); R.draws = []; R.trend = null; R.trade = null; R.showFix = false; R.pending = null; R.marks = [];
    const cb = R.root.querySelector('[data-rp="fix"]'); if (cb) cb.checked = false;
    const left = await load(false);
    const rw = REWIND.find(r => r[0] === R.rewind);
    say(`Marché remonté ${R.rewind === 'rand' ? 'à une date au hasard' : 'de ' + rw[1]} : nous sommes le <b>${fT(cursorTime())}</b> (${R.sym === 'XAU/USD' ? 'or via PAXG' : 'BTC'}, ${R.tf}). ${left} bougie(s) à venir.`, 'info');
    if (left <= 0) say(`Remonter de ${rw[1]} en ${R.tf} ne laisse aucune bougie à jouer : choisis une unité de temps plus petite ou remonte plus loin.`, 'warn');
    say('<b>Méthode</b> : 1) marque les plus hauts (H) et plus bas (B) récents ; 2) déclare la tendance ; 3) trace les OB / FVG dans son sens ; 4) lance ▶ et attends que le prix vienne dans ta zone ; 5) achète ou vends avec un stop et un objectif. Je te corrige à chaque étape.', 'tip');
    renderSetup(); renderTicket(); renderStats();
  }
  function renderSetup() {
    const r = R.root; if (!r) return;
    r.querySelectorAll('[data-rp="sym"] button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === R.sym));
    r.querySelectorAll('[data-rp="tf"] button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === R.tf));
    r.querySelectorAll('[data-rp="trend"] button').forEach(b => b.setAttribute('aria-pressed', R.trend != null && +b.dataset.v === R.trend));
    const sel = r.querySelector('[data-rp="rewind"]'); if (sel) sel.value = R.rewind;
  }
  function renderTools() {
    const el = R.root && R.root.querySelector('[data-rp="tools"]'); if (!el) return;
    el.innerHTML = TOOLS.map(([k, ic, l]) => `<button type="button" class="rp-tool" data-tool="${k}" aria-pressed="${R.tool === k}" title="${esc(l)}"><b>${ic}</b><span>${esc(l.split(' (')[0])}</span></button>`).join('') +
      `<button type="button" class="rp-tool" data-tool="clear" title="Tout effacer"><b>✕</b><span>Tout effacer</span></button>`;
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.tool;
      if (k === 'clear') { R.draws = []; R.pending = null; requestAnimationFrame(drawOverlay); return; }
      R.tool = k; R.pending = null; renderTools();
      if (chart) chart.applyOptions({ handleScroll: k === 'cursor', handleScale: true });
      const tips = { hi: 'Clique sur une bougie : le point se place sur sa mèche haute.', lo: 'Clique sur une bougie : le point se place sur sa mèche basse.', ob: 'Clique sur la bougie qui forme l\'OB (dernière bougie opposée avant l\'impulsion).', fvg: 'Clique sur la bougie du milieu du mouvement de 3 bougies.', hline: 'Clique à la hauteur du niveau.', tline: 'Clique sur deux points.', erase: 'Clique sur un tracé pour l\'effacer.' };
      if (tips[k]) renderStatus(tips[k]); };
  }
  function renderControls() {
    const el = R.root && R.root.querySelector('[data-rp="ctrl"]'); if (!el) return;
    el.innerHTML = `<button class="btn primary rp-play" type="button" data-c="play">${R.playing ? '⏸ Pause' : '▶ Lecture'}</button>
      <button class="btn" type="button" data-c="step" title="Avancer d'une bougie">⏭ 1 bougie</button>
      <div class="seg" data-c="speed">${[1, 3, 10, 30, 100].map(s => `<button type="button" data-v="${s}" aria-pressed="${R.speed === s}">${s}×</button>`).join('')}</div>
      <span class="rp-clock" data-c="clock"></span>`;
    el.querySelector('[data-c="play"]').onclick = () => { if (!R.all.length) return; R.playing ? stop() : play(); };
    el.querySelector('[data-c="step"]').onclick = () => { if (!R.all.length) return; stop(); stepCandle(); };
    el.querySelector('[data-c="speed"]').onclick = e => { const b = e.target.closest('button'); if (!b) return; R.speed = +b.dataset.v; renderControls(); };
    renderStatus();
  }
  function renderStatus(msg) {
    if (!R.root) return;
    const st = R.root.querySelector('.rp-status'), ck = R.root.querySelector('[data-c="clock"]');
    if (ck) ck.textContent = R.all.length ? `${fT(cursorTime())} · ${Math.max(0, R.all.length - R.cur)} bougies à venir` : '';
    if (st) { st.textContent = msg || (R.loading ? 'Chargement…' : R.all.length ? `${R.src} · ${R.tf}` : 'Choisis les réglages puis « Remonter et commencer »'); }
  }
  function renderTicket() {
    const el = R.root && R.root.querySelector('[data-rp="ticket"]'); if (!el) return;
    const t = R.trade;
    if (!t) { el.innerHTML = '<p class="sub">Quand ton analyse est prête et que le prix est dans ta zone, choisis Acheter ou Vendre.</p>'; return; }
    const rr = Math.abs(t.tp - t.entry) / Math.max(1e-9, Math.abs(t.entry - t.sl)), sz = sizing(t.entry, t.sl);
    if (t.open) {
      const last = R.live ? R.live.c : R.all[R.cur - 1].c, r = (last - t.entry) * t.dir / t.risk;
      el.innerHTML = `<div class="rp-pos ${t.dir === 1 ? 'buy' : 'sell'}"><b>${t.dir === 1 ? 'ACHAT' : 'VENTE'} en cours</b> · entrée ${fp(t.entry)} · stop ${fp(t.sl)} · objectif ${fp(t.tp)}<br>
        <span class="${r >= 0 ? 'up' : 'down'}">${r >= 0 ? '+' : ''}${r.toFixed(2)} R</span> · taille ${esc(sz.label)}</div>
        <div class="rp-row"><button class="btn" type="button" data-t="be">Stop au break-even</button><button class="btn" type="button" data-t="close">Clôturer au marché</button></div>`;
      el.querySelector('[data-t="be"]').onclick = () => { if (t.be) return; t.sl = t.entry; t.be = true; tradeLines(); renderTicket(); say('Stop déplacé au point d\'entrée : le trade ne peut plus te coûter (hors coûts).', 'ok'); };
      el.querySelector('[data-t="close"]').onclick = () => closeTrade(R.live ? R.live.c : R.all[R.cur - 1].c, 'clôture manuelle');
      return;
    }
    if (t.exit != null) { el.innerHTML = `<div class="rp-pos ${t.R >= 0 ? 'buy' : 'sell'}"><b>Trade terminé : ${t.R >= 0 ? '+' : ''}${t.R.toFixed(2)} R</b> (${esc(t.why)}) · note ${t.review.total}/100</div>
      <p class="sub">Continue la lecture pour une nouvelle opportunité, ou relance une séance.</p>`; return; }
    el.innerHTML = `<div class="rp-pos ${t.dir === 1 ? 'buy' : 'sell'}"><b>Ordre ${t.dir === 1 ? 'd\'achat' : 'de vente'}</b> au marché · ${fp(t.entry)}</div>
      <div class="rp-grid">
        <label>Stop<input type="number" step="any" data-t="sl" value="${t.sl.toFixed(SYM[R.sym].dec)}"></label><button class="iconbtn" type="button" data-t="pick-sl">placer sur le graphique</button>
        <label>Objectif<input type="number" step="any" data-t="tp" value="${t.tp.toFixed(SYM[R.sym].dec)}"></label><button class="iconbtn" type="button" data-t="pick-tp">placer sur le graphique</button>
        <label>Risque<select data-t="pct">${[0.5, 1, 1.5, 2].map(p => `<option value="${p}" ${p === t.pct ? 'selected' : ''}>${String(p).replace('.', ',')} %</option>`).join('')}</select></label><span class="sub">taille ${esc(sz.label)} · −${fmt(sz.risk, 0)} $ si stop</span>
      </div>
      <p class="sub">R:R 1:${rr.toFixed(2)}</p>
      <div class="rp-row"><button class="btn primary" type="button" data-t="ok">Valider l'ordre</button><button class="btn" type="button" data-t="cancel">Annuler</button></div>`;
    el.querySelector('[data-t="sl"]').onchange = e => { t.sl = +e.target.value; renderTicket(); tradeLines(); };
    el.querySelector('[data-t="tp"]').onchange = e => { t.tp = +e.target.value; renderTicket(); tradeLines(); };
    el.querySelector('[data-t="pct"]').onchange = e => { t.pct = +e.target.value; renderTicket(); };
    el.querySelector('[data-t="pick-sl"]').onclick = () => { R.tool = 'sl'; renderTools(); chart && chart.applyOptions({ handleScroll: false }); renderStatus('Clique sur le graphique au niveau du stop.'); };
    el.querySelector('[data-t="pick-tp"]').onclick = () => { R.tool = 'tp'; renderTools(); chart && chart.applyOptions({ handleScroll: false }); renderStatus('Clique sur le graphique au niveau de l\'objectif.'); };
    el.querySelector('[data-t="ok"]').onclick = validate;
    el.querySelector('[data-t="cancel"]').onclick = () => { R.trade = null; renderTicket(); tradeLines(); };
  }
  function renderMsgs() {
    const el = R.root && R.root.querySelector('[data-rp="msgs"]'); if (!el) return;
    el.innerHTML = R.msgs.slice(-25).map(m => `<div class="rp-msg ${m.kind}"><span class="av">🎓</span><div>${m.html}</div></div>`).join('');
    el.scrollTop = el.scrollHeight;
  }
  function renderStats() {
    const el = R.root && R.root.querySelector('[data-rp="stats"]'); if (!el) return;
    const s = stats();
    if (!s) { el.innerHTML = '<p class="sub">Tes trades simulés apparaîtront ici : taux de réussite, R cumulé, note moyenne et erreurs récurrentes. C\'est le backtest de <b>ta</b> stratégie.</p>'; return; }
    const trend = s.prev != null ? (s.last > s.prev ? `en progrès (+${(s.last - s.prev).toFixed(0)} pts)` : s.last < s.prev ? `en baisse (${(s.last - s.prev).toFixed(0)} pts)` : 'stable') : '';
    el.innerHTML = `<div class="rp-stats">
        <div><span>Trades</span><b>${s.n}</b></div><div><span>Réussite</span><b>${Math.round(s.win * 100)} %</b></div>
        <div><span>R cumulé</span><b class="${s.sumR >= 0 ? 'up' : 'down'}">${s.sumR >= 0 ? '+' : ''}${s.sumR.toFixed(1)}</b></div><div><span>Espérance</span><b>${s.exp >= 0 ? '+' : ''}${s.exp.toFixed(2)} R</b></div>
        <div><span>Facteur de profit</span><b>${isFinite(s.pf) ? s.pf.toFixed(2) : '∞'}</b></div><div><span>Note moyenne</span><b>${Math.round(s.score)}/100</b></div></div>
      ${trend ? `<p class="sub">10 derniers trades : ${esc(trend)}.</p>` : ''}
      ${s.errs.length ? `<p class="sub"><b>À travailler :</b> ${s.errs.map(([e, n]) => `${esc(e)} (${n}×)`).join(', ')}.</p>` : ''}
      <div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Marché</th><th>Sens</th><th>R</th><th>Note</th></tr></thead><tbody>
        ${s.H.slice(-8).reverse().map(x => `<tr><td>${new Date(x.d).toLocaleDateString('fr-FR')}</td><td>${esc(x.sym)} ${esc(x.tf)}</td><td class="${x.dir === 1 ? 'up' : 'down'}">${x.dir === 1 ? 'Achat' : 'Vente'}</td><td class="${x.R >= 0 ? 'up' : 'down'}">${x.R >= 0 ? '+' : ''}${x.R}</td><td>${x.score}</td></tr>`).join('')}
      </tbody></table></div>
      ${s.n < 30 ? `<p class="note">${30 - s.n} trade(s) de plus pour un premier bilan fiable (30 minimum).</p>` : ''}
      <button class="iconbtn" type="button" data-rp="reset">Remettre le suivi à zéro</button>`;
    el.querySelector('[data-rp="reset"]').onclick = () => { if (confirm('Effacer tout l\'historique du simulateur ?')) { lsSet(HKEY, []); renderStats(); } };
  }
  window.addEventListener('at:view', e => { if (e.detail !== 'academy') stop(); });
  window.ATReplay = { mount, unmount: destroyChart, _R: R };
})();
