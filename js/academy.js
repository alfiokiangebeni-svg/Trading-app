/* Alerte Trading — Académie : affichage, quiz, progression et analyse guidée en direct. */
(function () {
  'use strict';
  const C = window.ATAcademyContent;
  const KEY = 'at:acad:v1';
  const P = loadP();
  function loadP() { try { return Object.assign({ done: {}, checks: {} }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { done: {}, checks: {} }; } }
  function saveP() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const all = () => C.theory.concat(C.steps);
  let current = null; // id of the open lesson / step, 'live' for the guided analysis

  function progress() { const items = all(); const d = items.filter(x => P.done[x.id]).length; return { d, n: items.length, pct: Math.round(d / items.length * 100) }; }
  function nextItem() { return all().find(x => !P.done[x.id]) || null; }

  function home() {
    const pr = progress(), nx = nextItem();
    const item = (x, i, part) => `<button class="lesson ${P.done[x.id] ? 'done' : ''}" data-open="${x.id}" type="button">
      <span class="ln-n">${P.done[x.id] ? '✓' : (part === 't' ? i + 1 : i + 1)}</span><span class="ln-t">${esc(x.title.replace(/^Étape \d+ · /, ''))}</span>
      <span class="ln-m">${x.min ? x.min + ' min' : 'pratique'}</span></button>`;
    return `
      <div class="sec-h"><h2>Académie</h2><p>Apprendre le trading SMC, ICT et price action, de la théorie à l'analyse en direct</p></div>
      <div class="card ac-hero">
        <div><span class="lbl">Votre progression</span><b class="big">${pr.pct} %</b><span class="sub">${pr.d} / ${pr.n} modules terminés</span>
          <div class="bar"><i style="width:${pr.pct}%"></i></div></div>
        <div class="ac-cta">${nx ? `<button class="btn primary" data-open="${nx.id}" type="button">${pr.d ? 'Continuer' : 'Commencer'} : ${esc(nx.title.replace(/^Étape \d+ · /, ''))}</button>` :
          '<button class="btn primary" data-open="live" type="button">Formation terminée : lancer l\'analyse guidée</button>'}
          <button class="btn" data-open="live" type="button">Analyse guidée en direct</button></div>
      </div>
      <div class="ac-parts">
        <section class="card ac-part"><h3><span class="pn">1</span>Théorie express <small>≈ ${C.theory.reduce((s, x) => s + x.min, 0)} min</small></h3>
          <p class="sub">L'essentiel pour comprendre ce que fait le bot, sans jargon inutile.</p>${C.theory.map((x, i) => item(x, i, 't')).join('')}</section>
        <section class="card ac-part"><h3><span class="pn">2</span>Méthode pas à pas <small>de la préparation au journal</small></h3>
          <p class="sub">Les 9 étapes d'une analyse complète, chacune reliée à l'outil de l'app.</p>${C.steps.map((x, i) => item(x, i, 'p')).join('')}</section>
        <section class="card ac-part"><h3><span class="pn">3</span>Analyse guidée en direct</h3>
          <p class="sub">Le bot applique la méthode sur le marché réel, étape par étape, et vous dit si les conditions sont réunies.</p>
          <button class="lesson" data-open="live" type="button"><span class="ln-n">▶</span><span class="ln-t">Lancer l'analyse sur l'or ou le bitcoin</span><span class="ln-m">en direct</span></button></section>
      </div>
      <p class="note">Formation éducative. Le trading comporte un risque de perte en capital : entraînez-vous en compte démo avant de risquer de l'argent réel.</p>`;
  }

  function quizHTML(x) {
    return `<div class="quiz" data-id="${x.id}"><h4>Quiz</h4>${x.quiz.map((q, qi) => `
      <fieldset class="qq" data-q="${qi}"><legend>${esc(q.q)}</legend>
        ${q.a.map((a, ai) => `<label><input type="radio" name="${x.id}-${qi}" value="${ai}"> ${esc(a)}</label>`).join('')}
        <p class="qwhy" hidden></p></fieldset>`).join('')}
      <button class="btn primary" type="button" data-check="${x.id}">Vérifier mes réponses</button><span class="qres"></span></div>`;
  }
  function lesson(x) {
    const isStep = x.id[0] === 'p';
    const items = all(), idx = items.findIndex(y => y.id === x.id), prev = items[idx - 1], next = items[idx + 1];
    const svgs = [x.svg, x.svg2, x.svg3].filter(Boolean).map(k => C.SVG[k]).join('');
    const checks = P.checks[x.id] || [];
    return `
      <div class="ac-nav"><button class="iconbtn" data-home type="button">← Académie</button><span class="sub">${isStep ? 'Méthode pas à pas' : 'Théorie express'} · ${idx + 1} / ${items.length}</span></div>
      <article class="card ac-lesson">
        <h2>${esc(x.title)}</h2>${x.min ? `<span class="sub">Lecture ≈ ${x.min} min</span>` : `<p class="goal"><b>Objectif :</b> ${esc(x.goal)}</p>`}
        ${x.body ? `<div class="ac-body">${x.body}</div>` : ''}
        ${svgs ? `<div class="ac-svgs">${svgs}</div>` : ''}
        ${x.keys ? `<div class="ac-keys"><h4>À retenir</h4><ul>${x.keys.map(k => `<li>${esc(k)}</li>`).join('')}</ul></div>` : ''}
        ${x.todo ? `<div class="ac-todo"><h4>Ce qu'il faut faire</h4>${x.todo.map((t, i) => `<label class="todo"><input type="checkbox" data-chk="${x.id}" data-i="${i}" ${checks[i] ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div>` : ''}
        ${x.app ? `<div class="ac-app"><h4>Dans l'app</h4>${x.app.map((a, i) => `<button class="btn" type="button" data-act="${x.id}:${i}">${esc(a.label)} →</button>`).join('')}</div>` : ''}
        ${x.mistakes ? `<div class="ac-mist"><h4>Erreurs fréquentes</h4><ul>${x.mistakes.map(k => `<li>${esc(k)}</li>`).join('')}</ul></div>` : ''}
        ${quizHTML(x)}
      </article>
      <div class="ac-nav bottom">${prev ? `<button class="btn" data-open="${prev.id}" type="button">← Précédent</button>` : '<span></span>'}
        ${next ? `<button class="btn primary" data-open="${next.id}" type="button">Suivant →</button>` : '<button class="btn primary" data-open="live" type="button">Analyse guidée en direct →</button>'}</div>`;
  }

  /* ---------- analyse guidée en direct ---------- */
  function live() {
    const AT = window.AT, cal = window.ATCal;
    const s = AT && AT.snapshot();
    const head = `<div class="ac-nav"><button class="iconbtn" data-home type="button">← Académie</button><span class="sub">Analyse guidée en direct</span></div>`;
    const pick = `<div class="card f-ctl"><div class="ctl"><span class="lbl">Marché</span><div class="seg" id="liveSym">
        <button type="button" data-sym="XAU/USD" aria-pressed="${s && s.symbol === 'XAU/USD'}">Or</button><button type="button" data-sym="BTC/USD" aria-pressed="${s && s.symbol === 'BTC/USD'}">Bitcoin</button></div></div>
        <div class="ctl"><span class="lbl">Unité d'entrée</span><div class="seg" id="liveTf">${['5m', '15m', '1h'].map(t => `<button type="button" data-tf="${t}" aria-pressed="${s && s.tf === t}">${t}</button>`).join('')}</div></div>
        <button class="btn" type="button" id="liveRefresh">Relancer l'analyse</button></div>`;
    if (!s) return head + pick + '<div class="card empty-card"><span class="spin"></span> Analyse du marché en cours…</div>';
    const val = (rows, label) => { const r = rows.find(x => x[0].startsWith(label)); return r ? r : null; };
    const nr = cal ? cal.near(30) : [], nx = cal ? cal.nextHigh() : null;
    const v2 = s.v2, bias = v2.bias, pd = val(v2.rows, 'Premium'), kz = s.kz;
    const goodKz = kz === 'Londres' || kz === 'New York AM';
    const pdOk = pd && ((bias === 1 && pd[2] === 1) || (bias === -1 && pd[2] === -1));
    const liq = val(s.smc.rows, 'Liquidité'), zones = val(v2.rows, 'Zones fraîches');
    const sig = v2.signal;
    const items = [
      { ok: !nr.length, t: 'Annonces', d: nr.length ? `Annonce rouge ${cal.countdown(nr[0].time)} : ${nr[0].title}. On ne trade pas.` : (nx ? `Aucune annonce rouge dans les 30 min. Prochaine : ${nx.title} ${cal.countdown(nx.time)}.` : 'Aucune annonce rouge en USD à l\'horizon.') },
      { ok: bias !== 0, t: `Biais ${s.htf}`, d: bias ? `Structure ${bias === 1 ? 'haussière : on cherche des achats' : 'baissière : on cherche des ventes'}.` : 'Pas de biais clair : on reste à l\'écart.' },
      { ok: !!pdOk, t: 'Premium / discount', d: pd ? `${pd[1]}. ${pdOk ? 'Bon côté du range pour le biais.' : (bias ? 'Mauvais côté du range : attendre un retracement.' : '')}` : 'Range indisponible.' },
      { ok: liq && liq[2] !== 0, warn: true, t: 'Liquidité', d: liq ? `${liq[1]}.` : '—' },
      { ok: zones && +zones[1] > 0, t: 'Zones d\'intérêt', d: zones ? `${zones[1]} zone(s) fraîche(s) dans le sens du biais. ${v2.status}.` : '—' },
      { ok: goodKz, t: 'Kill zone', d: kz ? `${kz}${goodKz ? ' : bon moment.' : ' : hors des kill zones du bot (Londres, New York AM).'}` : 'Hors session : patience.' },
      { ok: !!sig, t: 'Confirmation et entrée', d: sig ? `Setup validé : ${sig.dir === 1 ? 'ACHAT' : 'VENTE'} à ${AT.fmt(sig.entry, s.symbol === 'BTC/USD' ? 1 : 2)}, stop ${AT.fmt(sig.sl, 2)}, objectif ${AT.fmt(sig.tp, 2)}.` : 'Pas encore de bougie de confirmation sur une zone touchée en kill zone.' }
    ];
    let sizeTxt = '';
    if (sig) { const z = AT.sizing(sig.entry, sig.sl); sizeTxt = `<div class="size"><div class="row"><span>Taille pour ${AT.fmt(s.risk.pct, 2).replace(/,?0+$/, '')} % de risque</span><span class="big">${esc(z.label)}</span></div><div class="row"><span>${esc(z.sub)}</span></div><div class="row"><span>Perte maximale si stop</span><b>−${AT.fmt(z.riskUsd, 2)} $</b></div></div>`; }
    const must = items.filter(x => !x.warn);
    const okAll = must.every(x => x.ok);
    const score = must.filter(x => x.ok).length;
    return head + pick + `
      <div class="card ac-live ${okAll ? 'go' : 'nogo'}">
        <div class="verdict"><span class="dir">${okAll ? (sig.dir === 1 ? 'ACHAT' : 'VENTE') : 'PAS DE TRADE'}</span>
          <span class="sub">${esc(s.symbol)} · entrée ${esc(s.tf)} · biais ${esc(s.htf)} · ${score}/${must.length} conditions · ${esc(s.source)}</span></div>
        <ol class="checklist">${items.map((x, i) => `<li class="${x.ok ? 'ok' : (x.warn ? 'warn' : 'ko')}"><span class="ck">${x.ok ? '✓' : (x.warn ? '!' : '✗')}</span>
          <div><b>${i + 1}. ${esc(x.t)}</b><p>${esc(x.d)}</p></div></li>`).join('')}</ol>
        ${sizeTxt}
        <p class="note">${okAll ? 'Toutes les conditions de la méthode sont réunies. Vérifiez les niveaux sur votre plateforme et respectez la taille calculée.' : 'Tant qu\'une condition manque, la méthode dit d\'attendre. Ne pas trader est aussi une décision.'}</p>
        <div class="ac-app"><button class="btn" type="button" id="liveChart">Voir sur le graphique →</button><button class="btn" type="button" id="liveNews">Annonces →</button></div>
      </div>`;
  }

  function render() {
    const root = document.getElementById('view-academy'); if (!root) return;
    root.innerHTML = current === 'live' ? live() : current ? lesson(all().find(x => x.id === current)) : home();
    bind(root);
  }
  function bind(root) {
    root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { current = b.dataset.open; render(); window.scrollTo(0, 0);
      if (current === 'live' && window.AT && !window.AT.snapshot()) setTimeout(render, 2500); });
    root.querySelectorAll('[data-home]').forEach(b => b.onclick = () => { current = null; render(); window.scrollTo(0, 0); });
    root.querySelectorAll('[data-chk]').forEach(c => c.onchange = () => { const id = c.dataset.chk; (P.checks[id] = P.checks[id] || [])[+c.dataset.i] = c.checked; saveP(); });
    root.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const [id, i] = b.dataset.act.split(':'); const a = all().find(x => x.id === id).app[+i];
      if (a.go) window.AT.go(a.go); else if (a.open) window.AT.openMarket(a.open);
    });
    root.querySelectorAll('[data-check]').forEach(b => b.onclick = () => {
      const x = all().find(y => y.id === b.dataset.check), box = b.closest('.quiz');
      let good = 0;
      x.quiz.forEach((q, qi) => {
        const fs = box.querySelector(`[data-q="${qi}"]`), sel = fs.querySelector('input:checked'), why = fs.querySelector('.qwhy');
        const ok = sel && +sel.value === q.ok; if (ok) good++;
        fs.dataset.res = sel ? (ok ? 'ok' : 'ko') : 'none';
        why.hidden = false; why.textContent = (ok ? '✓ ' : '✗ Bonne réponse : ' + q.a[q.ok] + '. ') + q.why;
      });
      const res = box.querySelector('.qres');
      if (good === x.quiz.length) { P.done[x.id] = true; saveP(); res.textContent = 'Parfait : module validé.'; res.className = 'qres up'; }
      else { res.textContent = `${good} / ${x.quiz.length} : relisez l'explication et réessayez.`; res.className = 'qres down'; }
    });
    const ls = root.querySelector('#liveSym'), lt = root.querySelector('#liveTf');
    const reload = (o) => { root.querySelector('.ac-live, .empty-card') && (root.querySelector('.ac-live, .empty-card').style.opacity = '.5');
      window.AT.openMarket(Object.assign({ stay: true, done: () => render() }, o)); };
    if (ls) ls.onclick = e => { const b = e.target.closest('button'); if (b) reload({ sym: b.dataset.sym, view: 'v2' }); };
    if (lt) lt.onclick = e => { const b = e.target.closest('button'); if (!b) return; const tf = b.dataset.tf; reload({ mode: tf === '5m' ? 'scalp' : 'day', tf, view: 'v2' }); };
    const lr = root.querySelector('#liveRefresh'); if (lr) lr.onclick = () => reload({ view: 'v2' });
    const lc = root.querySelector('#liveChart'); if (lc) lc.onclick = () => window.AT.go('trading');
    const ln = root.querySelector('#liveNews'); if (ln) ln.onclick = () => window.AT.go('news');
  }
  window.addEventListener('at:view', e => { if (e.detail === 'academy') render(); });
  if (document.body.dataset.view === 'academy') render();
})();
