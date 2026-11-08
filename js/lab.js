/* Alerte Trading — Labo : le bot de recherche Python (dossier bot/) intégré à l'app. */
(function () {
  'use strict';
  const REPO = 'https://github.com/alfiokiangebeni-svg/Trading-app/tree/main/bot';
  function render() {
    const root = document.getElementById('view-lab'); if (!root) return;
    root.innerHTML = `
      <div class="sec-h"><h2>Labo · bot de recherche SMC</h2><p>Ce que le bot Python a testé, et comment l'app s'en sert</p></div>
      <div class="lab-grid">
        <section class="card lab-card">
          <h3>Le bot de recherche</h3>
          <p>Un bot Python teste les règles SMC / ICT / price action sur <b>5 ans de données M1</b> (BTC via Binance, or via Dukascopy ou PAXG), avec des coûts réels et sans aucune information du futur.
          Il est conçu pour tester des milliers de combinaisons et ne garder que celles qui tiennent sur des données jamais vues.</p>
          <ul class="lab-list">
            <li><b>45 tests automatiques</b>, dont un test qui garantit qu'aucun détecteur ne « voit le futur »</li>
            <li>Détecteurs : swings, BOS / CHoCH / MSS, FVG, IFVG, BPR, order blocks, breakers, liquidité, sweeps, premium / discount, OTE, kill zones</li>
            <li>Moteur : spread, commission, slippage, stop prioritaire, break-even, plafonds −3 % / jour et −6 % / semaine</li>
          </ul>
        </section>
        <section class="card lab-card">
          <h3>Ce qui est intégré dans l'app</h3>
          <ul class="lab-list">
            <li><b>Moteur « Bot SMC v2 »</b> : la stratégie testée par le bot, réécrite en JavaScript (biais UT supérieure, premier contact d'un FVG / OB frais, discount / premium, kill zone Londres ou New York AM, confirmation sous 3 bougies)</li>
            <li><b>Backtest de l'app</b> aligné sur le moteur Python : commissions (or 7 $/lot, BTC 0,04 % par côté), break-even à +1R, plafonds de perte</li>
            <li><b>Avertissement annonces</b> : pas d'entrée 30 min autour d'une annonce rouge en USD</li>
            <li><b>Kill zones en heure de New York</b>, heure d'été gérée</li>
          </ul>
          <div class="ac-app"><button class="btn primary" type="button" data-lab="v2">Voir le Bot SMC v2 en direct →</button>
            <button class="btn" type="button" data-lab="bt">Backtester le Bot v2 →</button></div>
        </section>
      </div>
      <section class="card lab-card">
        <h3>Premier résultat du bot (une seule combinaison, test final verrouillé)</h3>
        <div class="tbl-wrap"><table><thead><tr><th>Période</th><th>Trades</th><th>Réussite</th><th>PF</th><th>Espérance</th><th>Rendement</th><th>DD max</th></tr></thead><tbody>
          <tr><td>BTC in-sample 2021-24</td><td>589</td><td>25,5 %</td><td>0,61</td><td class="down">−0,38 R</td><td class="down">−90 %</td><td>90 %</td></tr>
          <tr><td>BTC validation 2024-25</td><td>184</td><td>27,2 %</td><td>0,53</td><td class="down">−0,39 R</td><td class="down">−52 %</td><td>56 %</td></tr>
          <tr><td>Or (PAXG) in-sample</td><td>201</td><td>25,9 %</td><td>0,77</td><td class="down">−0,12 R</td><td class="down">−22 %</td><td>26 %</td></tr>
          <tr><td>Or (PAXG) validation</td><td>126</td><td>33,3 %</td><td>1,19</td><td class="up">+0,12 R</td><td class="up">+13 %</td><td>9 %</td></tr>
        </tbody></table></div>
        <div class="lab-lessons">
          <div><b>1. Pas d'avantage avant coûts</b><p>Sans frais, l'espérance est de −0,03 R sur les deux marchés : cette combinaison seule relève du hasard.</p></div>
          <div><b>2. Les coûts tuent le scalping BTC</b><p>≈ 0,30 R par trade en M15 (frais + spread pour un stop médian de 188 $), contre ≈ 0,06 R sur l'or.</p></div>
          <div><b>3. Un bon mois ne prouve rien</b><p>+13 % sur l'or en validation après −22 % en in-sample : bruit de marché, pas un signal.</p></div>
        </div>
        <p class="note">C'est pour cela que le Bot SMC v2 est fourni comme outil d'étude, pas comme robot rentable : la phase suivante du bot de recherche testera un grand nombre de combinaisons avec des contrôles anti-hasard (walk-forward, Deflated Sharpe, PBO, Monte Carlo) avant de valider quoi que ce soit.</p>
        <div class="ac-app"><a class="btn" href="bot/reports/backtest_simple_BTCUSD.html" target="_blank" rel="noopener">Rapport complet BTC →</a>
          <a class="btn" href="bot/reports/backtest_simple_XAUUSD_PAXG.html" target="_blank" rel="noopener">Rapport complet or (PAXG) →</a>
          <a class="btn" href="bot/reports/detectors_BTCUSD_M15.html" target="_blank" rel="noopener">Graphique des détecteurs →</a>
          <a class="btn" href="${REPO}" target="_blank" rel="noopener">Code du bot (GitHub) →</a></div>
      </section>`;
    root.querySelector('[data-lab="v2"]').onclick = () => window.AT.openMarket({ view: 'v2', mode: 'scalp', tf: '15m', scroll: '#engSec' });
    root.querySelector('[data-lab="bt"]').onclick = () => window.AT.openMarket({ view: 'v2', mode: 'scalp', tf: '15m', scroll: '#btAnchor', backtest: true });
  }
  window.addEventListener('at:view', e => { if (e.detail === 'lab') render(); });
  if (document.body.dataset.view === 'lab') render();
})();
