/* Alerte Trading — Académie XAUUSD : parcours ICT et Umar Punjabi, niveau 1 (théorie).
   Chaque chapitre : 1 cours · 2 illustrations · 3 exemples réels sur l'or · 4 configurations gagnantes et perdantes réelles ·
   5 erreurs fréquentes · 6 exercice pratique sur graphique réel · 7 questionnaire · 8 évaluation (déblocage du chapitre suivant). */
window.ATXauAcad = (function () {
  'use strict';
  const C = () => window.ATXauContent, X = () => window.ATXau;
  const KEY = 'at:xau:v1', PASS_QUIZ = 0.75, EX_N = 3, EX_PASS = 2;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();
  const f2 = x => window.AT ? window.AT.fmt(x, 2) : (+x).toFixed(2);
  const S = load();
  function load() { try { return Object.assign({ ch: {} }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { ch: {} }; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  const st = id => S.ch[id] || (S.ch[id] = { quiz: 0, ex: 0, done: false, tries: 0, errs: {} });

  /* ---------------- parcours ---------------- */
  const track = k => C()[k];
  const chapters = k => track(k).chapters;
  const isDone = id => !!(S.ch[id] && S.ch[id].done);
  function unlocked(k, i) { return i === 0 || isDone(chapters(k)[i - 1].id); }
  function trackProg(k) { const ch = chapters(k), d = ch.filter(x => isDone(x.id)).length; return { d, n: ch.length, pct: Math.round(d / ch.length * 100) }; }
  function findCh(id) { for (const k of ['ict', 'umar']) { const i = chapters(k).findIndex(x => x.id === id); if (i >= 0) return { k, i, ch: chapters(k)[i] }; } return null; }

  function homeHTML() {
    if (!C()) return '';
    const card = k => { const T = track(k), p = trackProg(k), nx = chapters(k).find(x => !isDone(x.id));
      return `<section class="card xa-track xa-${k}"><div class="xa-prof"><span class="xa-av">${T.avatar}</span><div><b>${esc(T.name)}</b><span class="sub">${esc(T.profName)} · ${p.n} chapitres</span></div></div>
        <p class="sub">${esc(T.tagline)}</p><div class="bar"><i style="width:${p.pct}%"></i></div><span class="sub">${p.d} / ${p.n} chapitres validés · niveau 1</span>
        <div class="xa-row"><button class="btn primary" type="button" data-open="${k}">${p.d ? 'Continuer' : 'Commencer'}</button>${nx && p.d ? `<button class="btn" type="button" data-open="${nx.id}">${esc(nx.title)}</button>` : ''}</div></section>`; };
    return `<div class="xa-head"><div><h2>Académie XAUUSD</h2><p class="sub">Deux spécialisations sur l'or : ICT et Umar Punjabi. Théorie, exemples réels, exercices et évaluation, chapitre par chapitre.</p></div></div>
      <div class="xa-tracks">${card('ict')}${card('umar')}</div>`;
  }

  function ladder(k) {
    const p = trackProg(k), l1 = p.d === p.n;
    const lv = [['1', 'Formation théorique', `${p.d} / ${p.n} chapitres`, true, l1],
      ['2', 'Travail avec le professeur', l1 ? 'en développement (phase 3)' : 'débloqué après le niveau 1', false, false],
      ['3', 'Travail individuel supervisé', 'débloqué après le niveau 2', false, false],
      ['4', 'Examen et certification', 'débloqué après le niveau 3', false, false]];
    return `<ol class="xa-ladder">${lv.map(([n, t, s, open, done]) => `<li class="${done ? 'done' : open ? 'open' : 'lock'}"><span class="n">${done ? '✓' : open ? n : '🔒'}</span><div><b>Niveau ${n} · ${t}</b><span class="sub">${s}</span></div></li>`).join('')}</ol>`;
  }

  function trackPage(k) {
    const T = track(k), p = trackProg(k);
    const list = chapters(k).map((x, i) => { const s = S.ch[x.id], open = unlocked(k, i);
      return `<button class="lesson ${isDone(x.id) ? 'done' : ''} ${open ? '' : 'locked'}" ${open ? `data-open="${x.id}"` : 'disabled'} type="button">
        <span class="ln-n">${isDone(x.id) ? '✓' : open ? i + 1 : '🔒'}</span><span class="ln-t">${esc(x.title)}</span>
        <span class="ln-m">${s && (s.quiz || s.ex) && !s.done ? `quiz ${Math.round(s.quiz * 100)} % · ex ${s.ex}/${EX_N}` : x.min + ' min'}</span></button>`; }).join('');
    return `<div class="ac-nav"><button class="iconbtn" data-home type="button">← Académie</button><span class="sub">${esc(T.name)}</span></div>
      <div class="card xa-intro xa-${k}"><div class="xa-prof"><span class="xa-av big">${T.avatar}</span><div><b>${esc(T.profName)}</b><span class="sub">${esc(T.role)}</span></div></div>
        <div class="xa-say">${T.intro}</div>${T.sources ? `<details class="xa-src"><summary>Sources et niveau de preuve des règles</summary>${T.sources}</details>` : ''}
        <div class="bar"><i style="width:${p.pct}%"></i></div><span class="sub">${p.d} / ${p.n} chapitres validés. Validation d'un chapitre : questionnaire ≥ ${PASS_QUIZ * 100} % et au moins ${EX_PASS} exercices réussis sur ${EX_N}.</span></div>
      <div class="xa-grid"><section class="card ac-part"><h3><span class="pn">1</span>Niveau 1 · Formation théorique <small>${p.n} chapitres</small></h3>${list}</section>
        <section class="card ac-part"><h3>Votre parcours</h3>${ladder(k)}<p class="sub">Les niveaux 2 à 4 (travail avec le professeur, travail supervisé, examen) arrivent dans la phase suivante. Ils resteront verrouillés tant que le niveau 1 n'est pas validé.</p></section></div>`;
  }

  /* ---------------- chapitre ---------------- */
  const SRC_TAG = { doc: ['Documenté', 'up'], interp: ['Interprétation pédagogique', 'warn'], algo: ['Adaptation algorithmique', 'muted'] };
  function srcRef(r) { const v = C().VIDEOS[r.v]; if (!v) return ''; const s = r.at.split(':').reduce((a, b) => a * 60 + +b, 0);
    return ` <a class="xa-ref" href="https://www.youtube.com/watch?v=${v.id}&t=${s}s" target="_blank" rel="noopener">« ${esc(v.title)} » vers ${esc(r.at)}</a>`; }
  function rulesHTML(rules) {
    if (!rules) return '';
    return `<div class="xa-rules"><h4>Règles et niveau de preuve</h4><ul>${rules.map(r => `<li><span class="xa-tag ${SRC_TAG[r.s][1]}">${SRC_TAG[r.s][0]}</span> ${r.t}${r.v ? srcRef(r) : ''}</li>`).join('')}</ul></div>`;
  }
  function chapterHTML(k, i, x) {
    const T = track(k), n = chapters(k).length, s = st(x.id), svgs = (x.svg || []).map(q => C().SVG[q] || (window.ATAcademyContent && window.ATAcademyContent.SVG[q]) || '').join('');
    const nav = [['c1', 'Cours'], ['c3', 'Exemples réels'], ['c4', 'Gagnant / perdant'], ['c6', 'Exercice'], ['c7', 'Questionnaire'], ['c8', 'Évaluation']];
    return `<div class="ac-nav"><button class="iconbtn" data-back="${k}" type="button">← ${esc(T.name)}</button><span class="sub">Niveau 1 · chapitre ${i + 1} / ${n}</span></div>
      <article class="card ac-lesson xa-ch xa-${k}">
        <div class="xa-prof"><span class="xa-av">${T.avatar}</span><div><b>${esc(x.title)}</b><span class="sub">${esc(T.profName)} · lecture ≈ ${x.min} min · ${isDone(x.id) ? '<b class="up">chapitre validé</b>' : 'à valider'}</span></div></div>
        <nav class="xa-toc">${nav.map(([a, t]) => `<a href="#" data-to="${a}">${t}</a>`).join('')}</nav>
        <section id="c1"><h4>1 · Cours</h4><div class="ac-body">${x.body}</div>${rulesHTML(x.rules)}
          ${x.keys ? `<div class="ac-keys"><h4>À retenir</h4><ul>${x.keys.map(q => `<li>${q}</li>`).join('')}</ul></div>` : ''}</section>
        ${svgs ? `<section id="c2"><h4>2 · Illustrations</h4><div class="ac-svgs">${svgs}</div></section>` : ''}
        <section id="c3"><h4>3 · Exemples réels sur l'or</h4>
          <div class="xa-chart-wrap" data-x="ex"><div class="xa-bar"><button class="iconbtn" data-nav="-1" type="button">◀ Plus ancien</button><span class="sub" data-x="pos">chargement…</span><button class="iconbtn" data-nav="1" type="button">Plus récent ▶</button></div>
            <div class="xa-chart"><div class="xa-c"></div><canvas class="xa-ov"></canvas></div>
            <div class="xa-txt" data-x="txt"><span class="spin"></span> Chargement des bougies réelles…</div><p class="note" data-x="src"></p></div></section>
        <section id="c4"><h4>4 · Configurations gagnantes et perdantes</h4>
          <div class="xa-wl"><div class="xa-w"><b class="up">Configuration gagnante</b><p>${x.win}</p><button class="btn" type="button" data-pick="win">Voir un cas gagnant réel</button></div>
            <div class="xa-l"><b class="down">Configuration perdante</b><p>${x.lose}</p><button class="btn" type="button" data-pick="loss">Voir un cas perdant réel</button></div></div>
          <p class="sub" data-x="stats"></p></section>
        <section id="c5" class="ac-mist"><h4>5 · Erreurs fréquentes</h4><ul>${x.mistakes.map(q => `<li>${q}</li>`).join('')}</ul></section>
        <section id="c6"><h4>6 · Exercice pratique <small class="sub">${EX_N} cas réels, au moins ${EX_PASS} réussis</small></h4>
          <div class="xa-chart-wrap" data-x="xw"><div class="xa-q" data-x="xq"><button class="btn primary" type="button" data-x="xstart">Commencer l'exercice</button> <span class="sub">Meilleur score : ${s.ex} / ${EX_N}</span></div>
            <div class="xa-chart" hidden><div class="xa-c"></div><canvas class="xa-ov"></canvas></div><div class="xa-txt" data-x="xfb"></div></div></section>
        <section id="c7"><h4>7 · Questionnaire</h4>${quizHTML(x)}</section>
        <section id="c8"><h4>8 · Évaluation</h4><div data-x="eval">${evalHTML(k, i, x)}</div></section>
      </article>`;
  }
  function quizHTML(x) {
    return `<div class="quiz" data-id="${x.id}">${x.quiz.map((q, qi) => `
      <fieldset class="qq" data-q="${qi}"><legend>${esc(q.q)}</legend>
        ${shuffle(q.a.map((a, ai) => [a, ai])).map(([a, ai]) => `<label><input type="radio" name="${x.id}-${qi}" value="${ai}"> ${esc(a)}</label>`).join('')}
        <p class="qwhy" hidden></p></fieldset>`).join('')}
      <button class="btn primary" type="button" data-check="1">Vérifier mes réponses</button><span class="qres"></span></div>`;
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function evalHTML(k, i, x) {
    const s = st(x.id), qOk = s.quiz >= PASS_QUIZ, eOk = s.ex >= EX_PASS, next = chapters(k)[i + 1];
    return `<div class="xa-eval"><div class="${qOk ? 'ok' : 'ko'}"><span>Questionnaire</span><b>${Math.round(s.quiz * 100)} %</b><small>requis ${PASS_QUIZ * 100} %</small></div>
      <div class="${eOk ? 'ok' : 'ko'}"><span>Exercice</span><b>${s.ex} / ${EX_N}</b><small>requis ${EX_PASS}</small></div>
      <div class="${s.done ? 'ok' : 'ko'}"><span>Chapitre</span><b>${s.done ? 'Validé ✓' : 'Non validé'}</b><small>${s.tries} essai(s) d'exercice</small></div></div>
      <p class="xa-say">${s.done ? (next ? `Bravo. Le chapitre suivant est débloqué : <b>${esc(next.title)}</b>.` : 'Bravo : tout le niveau 1 de ce parcours est validé. Le niveau 2 (travail avec le professeur) arrive dans la prochaine phase.')
        : !qOk && !eOk ? 'Pour valider : réussissez le questionnaire et l\'exercice sur graphique réel.' : !qOk ? 'Il reste le questionnaire.' : 'Il reste l\'exercice sur graphique réel.'}</p>
      ${s.done && next ? `<button class="btn primary" type="button" data-open="${next.id}">Chapitre suivant →</button>` : ''}`;
  }
  function checkDone(id) { const s = st(id); if (!s.done && s.quiz >= PASS_QUIZ && s.ex >= EX_PASS) { s.done = true; s.doneAt = Date.now(); if (window.AT) window.AT.toast('Chapitre validé'); } save(); }

  /* ---------------- graphique réel (lecture seule) ---------------- */
  function mkChart(wrap, tz) {
    const LC = window.LightweightCharts, el = wrap.querySelector('.xa-c'), ov = wrap.querySelector('.xa-ov'), g = ov.getContext('2d');
    const X0 = X(), fmtT = t => X0.fday(t, tz).replace(/ \d{4}$/, '') + ' ' + X0.fhm(t, tz);
    const chart = LC.createChart(el, { autoSize: true, crosshair: { mode: 0 },
      layout: { background: { type: 'solid', color: css('chart-bg') }, textColor: css('muted'), fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
      grid: { vertLines: { visible: false }, horzLines: { color: css('line') } }, rightPriceScale: { borderColor: css('line') },
      timeScale: { borderColor: css('line'), timeVisible: true, rightOffset: 6, tickMarkFormatter: t => X0.fhm(t, tz) === '00:00' ? X0.fday(t, tz).slice(0, 9) : X0.fhm(t, tz) },
      localization: { locale: 'fr-FR', priceFormatter: p => f2(p), timeFormatter: t => fmtT(t) }, handleScroll: { vertTouchDrag: false } });
    const up = css('bull'), dn = css('bear');
    const series = chart.addCandlestickSeries({ upColor: up, downColor: dn, borderUpColor: up, borderDownColor: dn, wickUpColor: up, wickDownColor: dn });
    let rows = [], ann = {}, extra = [];
    const col = n => n === 'muted' ? css('muted') : css(n) || n;
    function xOf(t, side) { if (t == null) return side < 0 ? 0 : el.clientWidth - 60; let lo = 0, hi = rows.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (rows[m].t <= t) lo = m; else hi = m - 1; }
      const x = chart.timeScale().logicalToCoordinate(lo); return x == null ? (side < 0 ? 0 : el.clientWidth) : x; }
    function draw() {
      const W = el.clientWidth, H = el.clientHeight, dpr = window.devicePixelRatio || 1; ov.width = W * dpr; ov.height = H * dpr; ov.style.width = W + 'px'; ov.style.height = H + 'px';
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); if (!rows.length) return; const pw = W - 60;
      g.font = '600 10px JetBrains Mono, monospace';
      (ann.boxes || []).forEach(b => { const x1 = xOf(b.t1, -1), x2 = xOf(b.t2, 1), y1 = series.priceToCoordinate(b.top), y2 = series.priceToCoordinate(b.bot); if (y1 == null || y2 == null) return;
        g.fillStyle = 'rgba(77,163,255,.07)'; g.strokeStyle = 'rgba(77,163,255,.45)'; g.setLineDash([3, 3]); g.fillRect(x1, y1, x2 - x1, y2 - y1); g.strokeRect(x1, y1, x2 - x1, y2 - y1); g.setLineDash([]);
        g.fillStyle = 'rgba(77,163,255,.9)'; g.fillText(b.label, x1 + 4, y1 - 4); });
      (ann.zones || []).forEach(z => { const x1 = xOf(z.t1, -1), x2 = Math.min(pw, xOf(z.t2, 1)), y1 = series.priceToCoordinate(z.top), y2 = series.priceToCoordinate(z.bot); if (y1 == null || y2 == null) return;
        const cc = col(z.col); g.globalAlpha = .18; g.fillStyle = cc; g.fillRect(x1, y1, x2 - x1, y2 - y1); g.globalAlpha = 1; g.strokeStyle = cc; g.lineWidth = 1; g.strokeRect(x1, y1, x2 - x1, y2 - y1);
        g.fillStyle = cc; g.fillText(z.label || '', x1 + 4, y1 + 11); });
      (ann.lines || []).concat(extra).forEach(l => { const y = series.priceToCoordinate(l.p); if (y == null) return; const x1 = l.t1 ? xOf(l.t1, -1) : 0, x2 = l.t2 ? xOf(l.t2, 1) : pw;
        g.strokeStyle = col(l.col); g.lineWidth = l.w || 1.4; g.setLineDash(l.dash ? [5, 4] : []); g.beginPath(); g.moveTo(x1, y); g.lineTo(Math.min(pw, x2), y); g.stroke(); g.setLineDash([]);
        g.fillStyle = col(l.col); const tw = g.measureText(l.label || '').width; g.fillText(l.label || '', Math.max(2, Math.min(pw - tw - 4, x2 - tw - 4)), y - 4); });
      (ann.band ? [ann.band] : []).forEach(b => { const x1 = xOf(b[0], -1), x2 = xOf(b[1], 1); g.fillStyle = 'rgba(242,193,78,.06)'; g.fillRect(x1 - 3, 0, x2 - x1 + 6, H - 26); });
    }
    function show(all, o, mode) {
      const end = mode === 'ex' ? o.cut : o.t1; rows = all.filter(r => r.t >= o.t0 && r.t <= end);
      series.setData(rows.map(r => ({ time: r.t, open: r.o, high: r.h, low: r.l, close: r.c })));
      ann = mode === 'ex' ? Object.assign({}, o.ex.show || {}, o.ex.full ? {} : {}) : JSON.parse(JSON.stringify(o.ann || {}));
      if (mode === 'ex' && o.ex.band) ann.band = o.ex.band;
      if (mode !== 'ex' && o.trade && o.trade.res !== 'nofill') ann.lines = (ann.lines || []).concat(tradeLines(o.trade));
      extra = [];
      const marks = mode === 'ex' ? [] : (o.ann && o.ann.marks || []).filter(m => m.t >= rows[0].t && m.t <= end).map(m => ({ time: m.t, position: m.pos === 'below' ? 'belowBar' : 'aboveBar', color: col(m.col), shape: m.pos === 'below' ? 'arrowUp' : 'arrowDown', text: m.text }));
      if (mode !== 'ex' && o.trade && o.trade.fillT) marks.push({ time: o.trade.fillT, position: o.trade.dir === 1 ? 'belowBar' : 'aboveBar', color: css('accent'), shape: 'circle', text: o.trade.dir === 1 ? 'achat' : 'vente' });
      series.setMarkers(marks.sort((a, b) => a.time - b.time));
      chart.timeScale().fitContent(); requestAnimationFrame(draw);
    }
    function tradeLines(tr) { const t1 = tr.fillT, t2 = tr.exitT; return [{ p: tr.entry, label: 'Entrée', col: 'accent', t1, t2, dash: true }, { p: tr.sl, label: 'Stop', col: 'bear', t1, t2, dash: true }, { p: tr.tp, label: 'Objectif ' + tr.rr + 'R', col: 'bull', t1, t2, dash: true }]; }
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => requestAnimationFrame(draw));
    const ro = new ResizeObserver(() => requestAnimationFrame(draw)); ro.observe(el);
    return {
      show, chart, series,
      mark(lines) { extra = lines; requestAnimationFrame(draw); },
      priceAt(y) { return series.coordinateToPrice(y); },
      timeAt(x) { const l = chart.timeScale().coordinateToLogical(x); if (l == null) return null; const i = Math.max(0, Math.min(rows.length - 1, Math.round(l))); return rows[i] ? rows[i].t : null; },
      el, destroy() { ro.disconnect(); chart.remove(); }
    };
  }

  /* ---------------- rendu et interactions ---------------- */
  let charts = [], ctx = null;
  function unmount() { charts.forEach(c => c.destroy()); charts = []; ctx = null; }
  function render(root, route, back) {
    unmount();
    if (route === 'ict' || route === 'umar') { root.innerHTML = trackPage(route); bindCommon(root, back); return; }
    const f = findCh(route);
    if (!f) { root.innerHTML = '<div class="card empty-card">Chapitre introuvable.</div>'; return; }
    if (!unlocked(f.k, f.i)) { root.innerHTML = `<div class="ac-nav"><button class="iconbtn" data-back="${f.k}" type="button">← ${esc(track(f.k).name)}</button></div><div class="card empty-card">🔒 Validez d'abord le chapitre précédent : <b>${esc(chapters(f.k)[f.i - 1].title)}</b>.</div>`; bindCommon(root, back); return; }
    root.innerHTML = chapterHTML(f.k, f.i, f.ch); bindCommon(root, back); bindChapter(root, f);
  }
  function bindCommon(root, back) {
    root.querySelectorAll('[data-home]').forEach(b => b.onclick = () => back());
    root.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { location.hash = 'academy/' + b.dataset.back; });
    root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { location.hash = 'academy/' + b.dataset.open; });
  }
  function bindChapter(root, f) {
    const x = f.ch; let tz = f.k === 'umar' ? X().LDN : X().NY;
    root.querySelectorAll('[data-to]').forEach(a => a.onclick = e => { e.preventDefault(); const s = root.querySelector('#' + a.dataset.to); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    // questionnaire
    const qb = root.querySelector('[data-check]');
    qb.onclick = () => { const box = qb.closest('.quiz'); let good = 0;
      x.quiz.forEach((q, qi) => { const fs = box.querySelector(`[data-q="${qi}"]`), sel = fs.querySelector('input:checked'), why = fs.querySelector('.qwhy'), ok = sel && +sel.value === q.ok; if (ok) good++;
        fs.dataset.res = sel ? (ok ? 'ok' : 'ko') : 'none'; why.hidden = false; why.textContent = (ok ? '✓ ' : '✗ Bonne réponse : ' + q.a[q.ok] + '. ') + q.why; });
      const sc = good / x.quiz.length, s = st(x.id); s.quiz = Math.max(s.quiz, sc); if (sc < 1) s.errs.quiz = (s.errs.quiz || 0) + 1; checkDone(x.id);
      const r = box.querySelector('.qres'); r.textContent = `${good} / ${x.quiz.length}` + (sc >= PASS_QUIZ ? ' : questionnaire réussi.' : ' : relisez le cours et réessayez.'); r.className = 'qres ' + (sc >= PASS_QUIZ ? 'up' : 'down');
      refreshEval(root, f); };
    // exemples réels
    const exW = root.querySelector('[data-x="ex"]'), txt = exW.querySelector('[data-x="txt"]'), pos = exW.querySelector('[data-x="pos"]');
    const loadFail = e => { txt.innerHTML = `<b>Exemple réel indisponible</b> : ${esc(e.message || e)}. Aucune donnée de remplacement n'est affichée. Vérifiez la connexion et rouvrez le chapitre.`; pos.textContent = '—'; };
    X().occurrences(x.eng, x.tf).then(D => {
      if (!root.isConnected) return;
      const occ = D.occ.filter(o => o.t1 > o.t0);
      if (!occ.length) { txt.innerHTML = `Aucun cas « ${esc(x.title)} » dans les données chargées (${esc(D.label)}). Rien n'est inventé : revenez après la prochaine mise à jour des données.`; pos.textContent = '0 cas'; return; }
      tz = occ[0].tz || tz; const ch = mkChart(exW, tz); charts.push(ch); let cur = occ.length - 1;
      const showI = i => { cur = Math.max(0, Math.min(occ.length - 1, i)); const o = occ[cur]; ch.show(D.rows, o, 'full');
        pos.textContent = `Cas ${cur + 1} / ${occ.length} · unité ${x.tf}`;
        const tr = o.trade, badge = tr && tr.res === 'win' ? '<span class="xa-tag up">Gagnant</span>' : tr && tr.res === 'loss' ? '<span class="xa-tag down">Perdant</span>' : tr ? '<span class="xa-tag muted">Sans issue</span>' : '<span class="xa-tag muted">Observation</span>';
        txt.innerHTML = `<b>${esc(o.title)}</b> ${badge}<p>${o.text}</p>${tr ? `<p>${resTxt(tr)}</p>` : ''}`; };
      exW.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => showI(cur + +b.dataset.nav));
      showI(occ.length - 1);
      exW.querySelector('[data-x="src"]').innerHTML = `Source : ${esc(D.label)} (${esc(D.from)}), heures de ${tz === X().NY ? 'New York' : 'Londres'}. ${esc(X().NOTE)}`;
      const s = D.stats, stEl = root.querySelector('[data-x="stats"]');
      stEl.innerHTML = s.n ? `Sur les données chargées : <b>${s.n}</b> configurations conclues, <b class="up">${s.w} gagnantes</b>, <b class="down">${s.l} perdantes</b> (réussite ${Math.round(s.wr * 100)} %, espérance ${s.exp >= 0 ? '+' : ''}${s.exp.toFixed(2)} R avant frais). ${s.n < 100 ? 'Échantillon trop petit pour juger la rentabilité : ce chiffre sert à comprendre, pas à prouver. Le vrai backtest sur plusieurs années viendra avec le laboratoire « Le Marché ».' : ''}` : 'Ce concept est une lecture du marché : il n\'a pas de résultat gagnant / perdant à lui seul. Les cas affichés montrent ce que le prix a fait ensuite.';
      root.querySelectorAll('[data-pick]').forEach(b => { const want = b.dataset.pick, list = occ.map((o, i) => [o, i]).filter(([o]) => o.trade && o.trade.res === want);
        b.textContent += ` (${list.length})`; if (!list.length) { b.disabled = true; return; }
        let n = list.length - 1; b.onclick = () => { showI(list[n][1]); n = (n - 1 + list.length) % list.length; exW.scrollIntoView({ behavior: 'smooth', block: 'center' }); }; });
      ctx = { D, occ, f };
      bindExercise(root, f, D, occ, tz);
    }).catch(loadFail);
  }
  function resTxt(tr) {
    const s = tr.dir === 1 ? 'Achat' : 'Vente', base = `${s} à ${f2(tr.entry)}, stop ${f2(tr.sl)}, objectif ${f2(tr.tp)} (${tr.rr}R). `;
    return base + ({ win: '<b class="up">Résultat réel : objectif atteint (+' + tr.rr + 'R).</b>', loss: '<b class="down">Résultat réel : stop touché (−1R).</b>', nofill: 'Le prix n\'est jamais revenu à l\'entrée : pas de trade.', open: 'Trade encore ouvert à la fin des données.', flat: 'Ni stop ni objectif dans la fenêtre observée.' }[tr.res] || '');
  }
  function refreshEval(root, f) { const e = root.querySelector('[data-x="eval"]'); if (e) { e.innerHTML = evalHTML(f.k, f.i, f.ch); e.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { location.hash = 'academy/' + b.dataset.open; }); } }

  /* ---------------- exercice ---------------- */
  function bindExercise(root, f, D, occ, tz) {
    const W = root.querySelector('[data-x="xw"]'), q = W.querySelector('[data-x="xq"]'), fb = W.querySelector('[data-x="xfb"]'), box = W.querySelector('.xa-chart');
    let ch = null, set = [], n = 0, good = 0, cur = null, answered = false;
    const start = () => {
      // cas tirés au hasard, en dehors des 3 plus récents (ceux affichés dans les exemples)
      const pool = occ.slice(0, Math.max(1, occ.length - 3)).filter(o => o.ex); set = [];
      while (set.length < Math.min(EX_N, pool.length)) { const o = pool[Math.floor(Math.random() * pool.length)]; if (!set.includes(o)) set.push(o); }
      if (set.length < EX_N) { const rest = occ.filter(o => o.ex && !set.includes(o)); while (set.length < EX_N && rest.length) set.push(rest.pop()); }
      n = 0; good = 0; box.hidden = false; if (!ch) { ch = mkChart(W, tz); charts.push(ch); bindClick(); } st(f.ch.id).tries++; save(); next();
    };
    const next = () => { if (n >= set.length) return finish(); cur = set[n]; answered = false; if (ctx) ctx.cur = cur; ch.show(D.rows, cur, 'ex');
      const ex = cur.ex;
      q.innerHTML = `<div class="xa-qh"><span class="xa-tag">${n + 1} / ${set.length}</span> ${ex.q}</div>` + (ex.type === 'choice' ? `<div class="xa-opts">${ex.opts.map((o, i) => `<button class="btn" type="button" data-opt="${i}">${esc(o)}</button>`).join('')}</div>` : '<span class="sub">Touchez le graphique à l\'endroit voulu.</span>');
      fb.innerHTML = `<span class="sub">${esc(cur.title.replace(/ · .*/, ''))} · ${esc(X().fday(cur.cut, tz))}, ${esc(X().fhm(cur.cut, tz))}. Les bougies suivantes sont cachées.</span>`;
      q.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => answer({ opt: +b.dataset.opt }));
    };
    function bindClick() {
      const el = ch.el; let down = null;
      el.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
      el.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return; down = null;
        if (!cur || answered || cur.ex.type === 'choice') return; const r = el.getBoundingClientRect(), p = ch.priceAt(e.clientY - r.top), t = ch.timeAt(e.clientX - r.left); if (p == null) return; answer({ p, t }); });
    }
    function answer(a) {
      answered = true; const ex = cur.ex; let ok = false, msg = '';
      if (ex.type === 'choice') { ok = a.opt === ex.ok; msg = ok ? 'Bonne réponse.' : `La méthode répond : <b>${esc(ex.opts[ex.ok])}</b>.`; }
      else if (ex.type === 'price') { const d = Math.abs(a.p - ex.p); ok = d <= ex.tol; msg = `Votre clic : ${f2(a.p)}. Réponse : <b>${f2(ex.p)}</b> (écart ${f2(d)} $, tolérance ${f2(ex.tol)} $).`; }
      else { const inP = a.p >= ex.bot - ex.tol && a.p <= ex.top + ex.tol, sec = (D.rows[1].t - D.rows[0].t) * 3, inT = !ex.t1 || (a.t != null && a.t >= ex.t1 - sec && a.t <= (ex.t2 || ex.t1) + sec);
        ok = inP && inT; msg = `Votre clic : ${f2(a.p)}. Zone attendue : <b>${f2(ex.bot)} – ${f2(ex.top)}</b>${ex.t1 ? ` vers ${X().fhm(ex.t1, tz)}` : ''}.${inP && !inT ? ' Bon prix, mais pas sur la bonne bougie.' : ''}`; }
      if (ok) good++; else { const s = st(f.ch.id); s.errs.exercise = (s.errs.exercise || 0) + 1; save(); }
      ch.show(D.rows, cur, 'full');
      if (a.p != null) ch.mark([{ p: a.p, label: 'Votre réponse', col: ok ? 'bull' : 'bear', dash: true, w: 2 }]);
      fb.innerHTML = `<p>${ok ? '<b class="up">✓ Correct.</b> ' : '<b class="down">✗ Pas tout à fait.</b> '}${msg}</p><p>${cur.text}</p>${cur.trade ? `<p>${resTxt(cur.trade)}</p>` : ''}
        <button class="btn primary" type="button" data-x="xnext">${n + 1 < set.length ? 'Cas suivant →' : 'Voir mon score'}</button>`;
      q.querySelectorAll('[data-opt]').forEach(b => { b.disabled = true; if (+b.dataset.opt === ex.ok) b.classList.add('good'); else if (+b.dataset.opt === a.opt) b.classList.add('bad'); });
      fb.querySelector('[data-x="xnext"]').onclick = () => { n++; next(); };
    }
    function finish() {
      const s = st(f.ch.id); s.ex = Math.max(s.ex, good); checkDone(f.ch.id); refreshEval(root, f);
      q.innerHTML = `<div class="xa-qh"><b class="${good >= EX_PASS ? 'up' : 'down'}">Score : ${good} / ${set.length}</b> ${good >= EX_PASS ? '· exercice réussi.' : `· il faut ${EX_PASS} bonnes réponses. Relisez les exemples réels puis recommencez avec de nouveaux cas.`}</div>
        <button class="btn" type="button" data-x="xstart">Recommencer avec d'autres cas</button>`;
      q.querySelector('[data-x="xstart"]').onclick = start;
    }
    q.querySelector('[data-x="xstart"]').onclick = start;
  }

  return { _dbg: () => ({ charts, ctx, cur: ctx && ctx.cur }), homeHTML, render, unmount, isRoute: r => !!r && (r === 'ict' || r === 'umar' || /^(ict|umar)-\d+$/.test(r)), progress: trackProg, state: S };
})();
