/* Alerte Trading — contenu de l'Académie (SMC, ICT, price action).
   Partie 1 : théorie courte. Partie 2 : méthode pas à pas, de la préparation au journal. */
window.ATAcademyContent = (function () {
  'use strict';
  /* ---------- schémas (SVG, couleurs du thème) ---------- */
  const SVG = {
    structure: `<svg viewBox="0 0 320 150" class="schema"><polyline points="10,130 60,80 90,105 150,40 185,75 250,15" class="ln"/>
      <line x1="150" y1="40" x2="300" y2="40" class="dash"/><text x="252" y="34" class="lb up">BOS</text>
      <text x="55" y="72" class="lb">HH</text><text x="83" y="122" class="lb">HL</text><text x="145" y="32" class="lb">HH</text><text x="178" y="92" class="lb">HL</text>
      <polyline points="250,15 280,60 300,45 315,95" class="ln bear"/><line x1="185" y1="75" x2="318" y2="75" class="dash"/><text x="262" y="92" class="lb down">CHoCH</text></svg>`,
    sweep: `<svg viewBox="0 0 320 150" class="schema"><line x1="20" y1="45" x2="300" y2="45" class="dash"/><text x="22" y="38" class="lb">Equal highs = liquidité (stops)</text>
      <g class="cdl"><line x1="60" y1="40" x2="60" y2="110"/><rect x="52" y="55" width="16" height="40" class="b"/></g>
      <g class="cdl"><line x1="130" y1="44" x2="130" y2="115"/><rect x="122" y="60" width="16" height="35" class="b"/></g>
      <g class="cdl"><line x1="200" y1="18" x2="200" y2="95"/><rect x="192" y="50" width="16" height="35" class="r"/></g>
      <g class="cdl"><line x1="240" y1="55" x2="240" y2="140"/><rect x="232" y="65" width="16" height="60" class="r"/></g>
      <text x="150" y="14" class="lb accent">sweep : mèche au-dessus</text><text x="130" y="146" class="lb accent">puis clôture dessous</text></svg>`,
    footprint: `<svg viewBox="0 0 330 150" class="schema" style="max-width:560px"><g font-family="JetBrains Mono, monospace" font-size="9">
      <rect x="40" y="20" width="70" height="110" fill="none" stroke="var(--line-strong)"/>
      <rect x="41" y="21" width="68" height="17" class="zone bear"/><text x="46" y="33" class="lb">120 × 35</text>
      <rect x="41" y="39" width="68" height="17" class="zone bear"/><text x="46" y="51" class="lb">310 × 90</text>
      <rect x="41" y="57" width="68" height="17" class="zone fvg" stroke="var(--accent)" stroke-width="2"/><text x="46" y="69" class="lb accent">640 × 610</text>
      <rect x="41" y="75" width="68" height="17" class="zone bull"/><text x="46" y="87" class="lb">150 × 480</text>
      <rect x="41" y="93" width="68" height="17" class="zone bull"/><text x="46" y="105" class="lb up">60 × 520</text>
      <rect x="41" y="111" width="68" height="17" class="zone bull"/><text x="46" y="123" class="lb up">40 × 300</text></g>
      <text x="118" y="70" class="lb accent">← POC (le plus échangé)</text>
      <text x="118" y="112" class="lb up">← déséquilibres empilés</text>
      <text x="118" y="34" class="lb">vendeurs × acheteurs</text>
      <text x="40" y="146" class="lb">Δ bougie = acheteurs − vendeurs = +1 255</text></svg>`,
    fvg: `<svg viewBox="0 0 320 150" class="schema"><rect x="70" y="58" width="230" height="30" class="zone fvg"/><text x="185" y="78" class="lb accent">FVG (déséquilibre)</text>
      <g class="cdl"><line x1="60" y1="85" x2="60" y2="135"/><rect x="52" y="95" width="16" height="30" class="b"/></g>
      <g class="cdl"><line x1="100" y1="30" x2="100" y2="120"/><rect x="92" y="40" width="16" height="70" class="b"/></g>
      <g class="cdl"><line x1="140" y1="15" x2="140" y2="60"/><rect x="132" y="22" width="16" height="30" class="b"/></g>
      <text x="20" y="146" class="lb">haut bougie 1</text><text x="155" y="52" class="lb">bas bougie 3</text></svg>`,
    ob: `<svg viewBox="0 0 320 150" class="schema"><rect x="68" y="88" width="240" height="34" class="zone bull"/><text x="210" y="110" class="lb up">Order block</text>
      <g class="cdl"><line x1="40" y1="60" x2="40" y2="100"/><rect x="32" y="66" width="16" height="26" class="r"/></g>
      <g class="cdl"><line x1="76" y1="85" x2="76" y2="125"/><rect x="68" y="90" width="16" height="28" class="r"/></g>
      <g class="cdl"><line x1="112" y1="50" x2="112" y2="112"/><rect x="104" y="58" width="16" height="50" class="b"/></g>
      <g class="cdl"><line x1="148" y1="20" x2="148" y2="68"/><rect x="140" y="26" width="16" height="36" class="b"/></g>
      <line x1="20" y1="45" x2="300" y2="45" class="dash"/><text x="170" y="40" class="lb up">BOS (déplacement)</text></svg>`,
    pd: `<svg viewBox="0 0 320 150" class="schema"><rect x="30" y="15" width="260" height="60" class="zone bear"/><rect x="30" y="75" width="260" height="60" class="zone bull"/>
      <line x1="30" y1="75" x2="290" y2="75" class="dash"/><text x="38" y="35" class="lb down">Premium : on cherche à vendre</text><text x="38" y="125" class="lb up">Discount : on cherche à acheter</text>
      <text x="210" y="70" class="lb">équilibre 50 %</text><rect x="30" y="98" width="260" height="10" class="zone fvg"/><text x="200" y="96" class="lb accent">OTE 62–79 %</text></svg>`,
    kz: `<svg viewBox="0 0 320 90" class="schema"><rect x="10" y="30" width="300" height="22" class="track"/>
      <rect x="10" y="30" width="50" height="22" class="kz asia"/><rect x="85" y="30" width="38" height="22" class="kz lon"/><rect x="148" y="30" width="38" height="22" class="kz ny"/><rect x="198" y="30" width="12" height="22" class="kz sb"/><rect x="226" y="30" width="31" height="22" class="kz nypm"/>
      <text x="12" y="22" class="lb">Asie 20h-0h</text><text x="80" y="70" class="lb">Londres 2h-5h</text><text x="140" y="22" class="lb">NY AM 7h-10h</text><text x="190" y="70" class="lb">SB 10h</text><text x="228" y="22" class="lb">NY PM</text>
      <text x="10" y="86" class="lb">Heures de New York (le bot convertit automatiquement)</text></svg>`
  };

  const theory = [
    { id: 't1', title: 'Les bases : bougies, unités de temps, tendance', min: 3, svg: 'structure',
      body: `<p>Une <b>bougie</b> résume une période : ouverture, plus haut, plus bas, clôture. Le corps montre qui a gagné (acheteurs = verte, vendeurs = rouge), les mèches montrent les prix rejetés.</p>
      <p>Les <b>unités de temps</b> (UT) s'emboîtent : D1 et H4 donnent la direction, H1 et M15 les zones, M5 et M1 l'entrée. On analyse toujours <b>de haut en bas</b>.</p>
      <p>Une <b>tendance haussière</b> fait des plus hauts et des plus bas de plus en plus hauts (HH / HL). Baissière : LH / LL. Sans cela, le marché est en range.</p>`,
      keys: ['Corps = décision, mèche = rejet', 'Analyse de l\'UT haute vers l\'UT basse', 'Tendance = HH/HL ou LH/LL'],
      quiz: [{ q: 'Dans quel ordre analyse-t-on les unités de temps ?', a: ['M1 puis D1', 'D1/H4 puis H1/M15 puis M5/M1', 'Peu importe'], ok: 1, why: 'Le contexte vient des grandes UT, l\'entrée des petites.' },
        { q: 'Une suite HH / HL indique…', a: ['une tendance haussière', 'une tendance baissière', 'un range'], ok: 0, why: 'Plus hauts et plus bas croissants = haussier.' }] },
    { id: 't2', title: 'Price action : structure, niveaux, figures', min: 3, svg: 'structure',
      body: `<p>Le price action lit le prix nu. Trois outils suffisent :</p>
      <p><b>1. La structure</b> : un <b>BOS</b> (break of structure) casse le dernier sommet dans le sens de la tendance et la confirme. Un <b>CHoCH</b> (change of character) casse dans le sens inverse : premier signe de retournement. On ne compte que les <b>clôtures</b>.</p>
      <p><b>2. Les niveaux</b> : supports et résistances là où le prix a réagi plusieurs fois.</p>
      <p><b>3. Les figures de bougies</b> sur un niveau : pin bar (longue mèche de rejet), englobante, cassure d'inside bar. Une figure loin d'un niveau ne vaut presque rien.</p>`,
      keys: ['BOS = continuation, CHoCH = retournement possible', 'Une cassure se valide en clôture', 'Figure de bougie + niveau = signal'],
      quiz: [{ q: 'Un CHoCH haussier, c\'est…', a: ['la cassure d\'un sommet en tendance haussière', 'la première cassure d\'un sommet après une tendance baissière', 'une bougie verte'], ok: 1, why: 'Le CHoCH casse la structure contraire : il change le « caractère » du marché.' },
        { q: 'Une pin bar au milieu de nulle part est…', a: ['un signal fort', 'un signal faible', 'un signal de vente'], ok: 1, why: 'Sans niveau clé, la figure n\'a pas de contexte.' }] },
    { id: 't3', title: 'SMC : liquidité, order blocks, FVG', min: 4, svg: 'sweep', svg2: 'fvg', svg3: 'ob',
      body: `<p>Les Smart Money Concepts partent d'une idée : les gros acteurs ont besoin de <b>liquidité</b> (les ordres des autres) pour remplir leurs positions.</p>
      <p><b>Liquidité</b> : stops au-dessus des sommets égaux (equal highs), sous les creux égaux, au-dessus/dessous du plus haut/bas de la veille ou de la session d'Asie. Un <b>sweep</b> = mèche qui va chercher ces stops puis clôture de l'autre côté.</p>
      <p><b>Order block (OB)</b> : la dernière bougie opposée avant le mouvement fort (déplacement) qui a cassé la structure. Le prix y revient souvent.</p>
      <p><b>Fair value gap (FVG)</b> : trou entre la mèche de la bougie 1 et celle de la bougie 3 d'un mouvement rapide. Le prix tend à le combler.</p>
      <p>Un OB de qualité a <b>pris de la liquidité</b>, a <b>laissé un FVG</b> et n'a <b>pas encore été touché</b>.</p>`,
      keys: ['La liquidité attire le prix', 'Sweep = piège, puis retournement', 'OB et FVG = zones de retour', 'Zone fraîche > zone déjà touchée'],
      quiz: [{ q: 'Où se trouve la liquidité côté acheteurs (buy-side) ?', a: ['Au-dessus des sommets', 'Sous les creux', 'Au milieu du range'], ok: 0, why: 'Les stops des vendeurs et les ordres d\'achat sur cassure sont au-dessus des sommets.' },
        { q: 'Un FVG haussier se forme quand…', a: ['le bas de la bougie 3 est au-dessus du haut de la bougie 1', 'la bougie 2 est rouge', 'deux sommets sont égaux'], ok: 0, why: 'Il reste un trou de prix non échangé entre la bougie 1 et la bougie 3.' },
        { q: 'Quel OB est le plus fiable ?', a: ['Déjà touché 3 fois', 'Frais, avec sweep de liquidité et FVG', 'Le plus ancien'], ok: 1, why: 'Fraîcheur, liquidité prise et déséquilibre laissé sont les critères de qualité.' }] },
    { id: 't4', title: 'ICT : premium/discount, OTE, kill zones', min: 3, svg: 'pd', svg2: 'kz',
      body: `<p>ICT (Inner Circle Trader) ajoute le <b>où</b> et le <b>quand</b>.</p>
      <p><b>Premium / discount</b> : on trace le range du dernier creux au dernier sommet. Au-dessus de 50 % = premium (cher : on vend), en dessous = discount (bon marché : on achète). L'<b>OTE</b> (optimal trade entry) est la zone de 62 à 79 % de retracement.</p>
      <p><b>Kill zones</b> : les heures où les volumes institutionnels arrivent. Londres (2h-5h New York), New York AM (7h-10h), Silver Bullet (10h-11h). En dehors, les mouvements sont souvent des pièges.</p>
      <p><b>Power of 3 (AMD)</b> : accumulation (Asie), manipulation (sweep à l'ouverture de Londres ou New York), distribution (le vrai mouvement).</p>`,
      keys: ['Acheter en discount, vendre en premium', 'OTE = 62–79 % du range', 'Trader pendant les kill zones', 'Le faux mouvement précède souvent le vrai'],
      quiz: [{ q: 'Biais haussier, prix à 80 % du range : que fait-on ?', a: ['On achète', 'On attend un retour en discount', 'On vend'], ok: 1, why: 'À 80 % on est en premium : trop cher pour acheter.' },
        { q: 'La kill zone de Londres, en heure de New York, c\'est…', a: ['2h-5h', '9h-12h', '20h-0h'], ok: 0, why: '2h-5h New York = 7h-10h ou 8h-11h à Paris selon la saison.' }] },
    { id: 't5', title: 'Gestion du risque : la seule chose qu\'on contrôle', min: 3,
      body: `<p><b>Risque par trade : 1 à 2 % du capital maximum.</b> Avec 1 %, il faut 10 pertes d'affilée pour perdre 10 % : on survit aux mauvaises séries.</p>
      <p><b>Taille de position</b> = (capital × risque %) ÷ distance du stop. Le stop se place d'abord, la taille en découle. L'app la calcule pour vous (lots d'or : 1 lot = 100 oz).</p>
      <p><b>Ratio risque / rendement</b> : avec un R:R de 1:2, on peut perdre 6 trades sur 10 et rester à l'équilibre. Le taux de réussite seul ne veut rien dire.</p>
      <p><b>Limites</b> : stop journalier −3 %, hebdomadaire −6 %. Break-even à +1R. Jamais de martingale, jamais de stop déplacé contre soi.</p>
      <p><b>Coûts</b> : spread et commissions mangent l'avantage. Sur BTC en M15, le bot de recherche a mesuré ≈ 0,3 R de coûts par trade : les petites UT coûtent cher.</p>`,
      keys: ['1–2 % par trade, jamais plus', 'Le stop d\'abord, la taille ensuite', 'R:R ≥ 1:2', '−3 % / jour, −6 % / semaine = on s\'arrête'],
      quiz: [{ q: 'Capital 10 000 $, risque 1 %, stop à 5 $ sur l\'or. Quelle taille ?', a: ['0,2 lot (20 oz)', '2 lots', '0,02 lot'], ok: 0, why: '100 $ ÷ 5 $ = 20 oz = 0,2 lot de 100 oz.' },
        { q: 'Avec un R:R de 1:2, le seuil de rentabilité est d\'environ…', a: ['67 % de réussite', '50 %', '33 %'], ok: 2, why: '1 gain de 2R compense 2 pertes de 1R : 1 sur 3 suffit (hors coûts).' }] },
    { id: 't6', title: 'Psychologie et journal', min: 2,
      body: `<p>Un plan simple suivi à la lettre bat un plan brillant suivi à moitié.</p>
      <p><b>Règles</b> : pas de trade de revanche après une perte ; pas plus de 2 trades par session ; arrêt à la limite journalière.</p>
      <p><b>Journal</b> : pour chaque trade, notez le biais, la zone, la confirmation, l'heure, le résultat en R et une capture. Après 30 trades, vous saurez ce qui marche pour <i>vous</i>.</p>
      <p>L'app tient un journal des signaux du bot : comparez-le à vos propres décisions.</p>`,
      keys: ['Le plan d\'abord', 'Pas de trade de revanche', 'Tout noter, relire chaque semaine'],
      quiz: [{ q: 'Après 3 pertes dans la journée (−3 %), que faire ?', a: ['Doubler la taille pour se refaire', 'Arrêter pour la journée', 'Changer de stratégie'], ok: 1, why: 'La limite journalière protège le capital et le mental.' }] }
  ];

  theory.push({ id: 't7', title: 'Order flow : footprint, delta et profil de volume', min: 4, svg: 'footprint',
    body: `<p>Le graphique en bougies montre <i>où</i> le prix est allé. L'<b>order flow</b> montre <i>qui</i> l'a poussé : les ordres <b>agressifs</b> (au marché) contre les ordres <b>passifs</b> (limites).</p>
      <p><b>Footprint</b> : chaque bougie est découpée en niveaux de prix. À chaque niveau : volume vendu au marché × volume acheté au marché. Le <b>POC</b> est le niveau le plus échangé. Un <b>déséquilibre</b> apparaît quand un côté domine l'autre à plus de 300 % (en diagonale) ; trois déséquilibres empilés forment une zone que le prix respecte souvent au retour.</p>
      <p><b>Delta</b> = acheteurs agressifs − vendeurs agressifs, pour une bougie. Le <b>CVD</b> est son cumul. Prix et CVD qui montent ensemble = mouvement sain. Nouveau plus bas avec un CVD plus haut = <b>divergence</b> : les vendeurs s'épuisent.</p>
      <p><b>Absorption</b> : énorme volume, petit corps, delta très négatif mais clôture haussière → des acheteurs limites ont tout encaissé. Sur un sweep de liquidité SMC, c'est la confirmation idéale.</p>
      <p><b>Profil de volume</b> : volume par prix sur une période. POC = aimant, zone de valeur (70 % du volume, entre VAL et VAH) = équilibre ; en sortir et y rester = nouvelle tendance.</p>
      <p>Dans l'app : boutons <b>FP</b>, <b>Δ</b>, <b>VP</b> et <b>OF</b> (lecture du professeur) du simulateur. BTC, or (PAXG) et EUR/USDT ont un order flow réel (transactions Binance) ; or COMEX et S&P 500 sont estimés à partir du volume.</p>`,
    keys: ['Footprint = vendeurs × acheteurs à chaque prix', 'Delta / CVD = qui pousse vraiment', 'Divergence ou absorption sur un sweep = retournement probable', 'Le POC attire le prix, la zone de valeur = équilibre'],
    quiz: [{ q: 'Le prix fait un nouveau plus bas mais le CVD fait un plus bas plus haut. On parle de…', a: ['divergence haussière', 'continuation baissière', 'absorption vendeuse'], ok: 0, why: 'Les vendeurs agressifs poussent moins fort : le mouvement baissier s\'essouffle.' },
      { q: 'Énorme volume, petit corps, delta très négatif, clôture haussière :', a: ['les vendeurs dominent', 'absorption : des acheteurs limites encaissent la vente', 'aucune information'], ok: 1, why: 'Les ventes au marché sont absorbées par des ordres d\'achat passifs.' },
      { q: 'Trois déséquilibres acheteurs empilés sur un FVG haussier :', a: ['confirment la zone d\'achat', 'invalident le FVG', 'n\'ont aucun lien'], ok: 0, why: 'L\'order flow confirme que les acheteurs défendent la zone SMC.' }] });

  /* ---------- méthode pas à pas ---------- */
  const steps = [
    { id: 'p1', title: 'Étape 1 · Préparer la journée : les annonces', goal: 'Savoir quand ne pas trader.',
      todo: ['Ouvrir le calendrier des annonces de la semaine', 'Repérer les annonces rouges en USD (CPI, NFP, FOMC…) et leur heure', 'Bloquer 30 min avant et après chaque annonce rouge', 'Jour de FOMC / NFP : décider de réduire la taille ou de ne pas trader'],
      app: [{ label: 'Ouvrir les annonces', go: 'news' }],
      mistakes: ['Entrer 5 minutes avant le CPI « parce que le setup est beau »', 'Oublier le décalage horaire (l\'app affiche l\'heure de votre appareil)'],
      quiz: [{ q: 'Le CPI sort dans 20 minutes, un setup apparaît. On…', a: ['entre tout de suite', 'attend l\'annonce et la clôture de la 1re bougie M15', 'double la taille'], ok: 1, why: 'Règle : pas d\'entrée 30 min autour d\'une annonce rouge.' }] },
    { id: 'p2', title: 'Étape 2 · Le biais sur les grandes UT (D1 / H4)', goal: 'Décider si on cherche des achats ou des ventes aujourd\'hui.',
      todo: ['Regarder la structure D1 puis H4 : dernier BOS ou CHoCH ?', 'Noter le biais : haussier, baissier ou neutre', 'Situer le prix : premium ou discount du range H4', 'Si neutre ou contradictoire : pas de trade, ou plus petite taille'],
      app: [{ label: 'Or en day trading (H4, SMC)', open: { sym: 'XAU/USD', mode: 'day', tf: '4h', view: 'smc' } }, { label: 'BTC en day trading (H4, SMC)', open: { sym: 'BTC/USD', mode: 'day', tf: '4h', view: 'smc' } }],
      mistakes: ['Prendre un achat M5 contre une structure H4 baissière', 'Changer de biais à chaque bougie M5'],
      quiz: [{ q: 'H4 haussier, D1 baissier. Le plus prudent :', a: ['Acheter fort', 'Réduire la taille ou attendre que les deux s\'alignent', 'Vendre en M1'], ok: 1, why: 'Les UT contradictoires = signal plus faible.' }] },
    { id: 'p3', title: 'Étape 3 · Cartographier la liquidité', goal: 'Savoir où le prix va probablement aller chercher les stops.',
      todo: ['Tracer le plus haut et le plus bas de la veille (PDH / PDL)', 'Tracer le haut et le bas de la session d\'Asie', 'Repérer les sommets et creux égaux (equal highs / lows)', 'Identifier la liquidité « visée » dans le sens du biais'],
      app: [{ label: 'Voir la liquidité (SMC, H1)', open: { sym: 'XAU/USD', mode: 'day', tf: '1h', view: 'smc', scroll: '#engSec' } }],
      mistakes: ['Placer son stop exactement sous un creux évident (c\'est là que va le sweep)'],
      quiz: [{ q: 'Biais haussier : quelle liquidité le prix va-t-il souvent prendre d\'abord ?', a: ['Celle sous un creux récent (sweep), avant de monter', 'Aucune', 'Celle très au-dessus, directement'], ok: 0, why: 'Le « faux » mouvement baissier vient chercher les stops avant la vraie hausse.' }] },
    { id: 'p4', title: 'Étape 4 · Les zones d\'intérêt (H1 / M15)', goal: 'Choisir 1 ou 2 zones où l\'on accepte d\'entrer.',
      todo: ['Lister les OB et FVG frais dans le sens du biais', 'Ne garder que ceux en discount (achat) ou premium (vente)', 'Préférer la zone qui a pris de la liquidité et laissé un FVG', 'Noter le niveau d\'invalidation (clôture au-delà de la zone)'],
      app: [{ label: 'Zones M15 du Bot SMC v2', open: { sym: 'XAU/USD', mode: 'scalp', tf: '15m', view: 'v2' } }],
      mistakes: ['Marquer 10 zones « au cas où »', 'Acheter un OB en premium'],
      quiz: [{ q: 'Combien de zones garder pour la session ?', a: ['Une ou deux, les meilleures', 'Toutes', 'Aucune'], ok: 0, why: 'Moins de zones = décisions plus claires.' }] },
    { id: 'p5', title: 'Étape 5 · Attendre la kill zone et le sweep', goal: 'Laisser le prix venir à vous, au bon moment.',
      todo: ['Ne surveiller qu\'en kill zone (Londres ou New York AM)', 'Attendre que le prix atteigne votre zone', 'Idéalement : un sweep de liquidité juste avant ou dans la zone', 'Activer les alertes du bot pour ne pas rester devant l\'écran'],
      app: [{ label: 'Activer le suivi (Trading)', go: 'trading' }],
      mistakes: ['Courir après le prix quand il part sans vous', 'Trader à 13h New York par ennui'],
      quiz: [{ q: 'Le prix touche votre zone à 12h30 New York (hors kill zone). Le Bot v2…', a: ['entre', 'ignore le contact', 'vend'], ok: 1, why: 'Le bot v2 ne valide que les contacts pendant Londres ou New York AM.' }] },
    { id: 'p6', title: 'Étape 6 · La confirmation sur petite UT', goal: 'Ne pas acheter un couteau qui tombe.',
      todo: ['Dans la zone, passer en M5 / M1', 'Attendre un CHoCH dans le sens du biais (ou une bougie de rejet nette)', 'La zone doit tenir : aucune clôture au-delà', 'Sans confirmation dans les 3 bougies : on laisse passer'],
      app: [{ label: 'Or M5, price action', open: { sym: 'XAU/USD', mode: 'scalp', tf: '5m', view: 'pa' } }],
      mistakes: ['Entrer au premier contact sans confirmation', 'Confondre une pause avec un retournement'],
      quiz: [{ q: 'Achat : la bougie clôture sous la zone. Que fait-on ?', a: ['On achète plus bas', 'La zone est invalidée : on attend autre chose', 'On déplace le stop'], ok: 1, why: 'Une clôture au-delà de la zone l\'invalide.' }] },
    { id: 'p7', title: 'Étape 7 · Entrée, stop, objectif, taille', goal: 'Un trade = un plan chiffré avant de cliquer.',
      todo: ['Stop : au-delà de la zone (ou du sweep) + petite marge', 'Objectif : liquidité opposée ou R:R ≥ 1:2', 'Calculer la taille pour risquer 1 % (ou 2 % maximum)', 'Vérifier : pas d\'annonce rouge dans les 30 min'],
      app: [{ label: 'Gestion du risque et calcul de taille', open: { sym: 'XAU/USD', view: 'all', scroll: '.risk' } }],
      mistakes: ['Choisir la taille avant le stop', 'Objectif à 1:0,5 « pour être sûr de gagner »'],
      quiz: [{ q: 'Stop à 8 $, capital 5 000 $, risque 1 %. Taille en or ?', a: ['6,25 oz (0,06 lot)', '62,5 oz', '0,6 lot'], ok: 0, why: '50 $ ÷ 8 $ = 6,25 oz ≈ 0,06 lot.' }] },
    { id: 'p8', title: 'Étape 8 · Gérer le trade', goal: 'Laisser travailler, protéger le capital.',
      todo: ['À +1R : stop au point d\'entrée (break-even)', 'Option : prise partielle sur la première liquidité', 'Ne jamais élargir le stop', 'Sortir si la raison du trade disparaît (structure cassée contre vous)'],
      app: [{ label: 'Backtest du Bot v2 (break-even inclus)', open: { sym: 'XAU/USD', mode: 'scalp', tf: '15m', view: 'v2', scroll: '#btAnchor', backtest: true } }],
      mistakes: ['Couper un gagnant à +0,3R par peur', 'Déplacer le stop plus loin « pour lui laisser de l\'air »'],
      quiz: [{ q: 'Le trade atteint +1R. Le plan dit…', a: ['stop à l\'entrée', 'doubler la position', 'fermer immédiatement'], ok: 0, why: 'Break-even à +1R : le trade ne peut plus coûter.' }] },
    { id: 'p9', title: 'Étape 9 · Journal et revue', goal: 'Progresser à partir de vos propres données.',
      todo: ['Noter : biais, zone, heure, confirmation, R obtenu, capture', 'Chaque semaine : relire, compter les erreurs de règle', 'Backtester une idée avant de la jouer en réel', 'Rester en démo tant que 30 trades ne sont pas positifs'],
      app: [{ label: 'Journal des signaux', open: { view: 'all', scroll: '#feedSec' } }, { label: 'Ce qu\'a appris le bot de recherche', go: 'lab' }],
      mistakes: ['Juger une méthode sur 5 trades', 'Passer en réel après une bonne semaine en démo'],
      quiz: [{ q: 'Combien de trades minimum pour juger une méthode ?', a: ['5', '30 et plus', '1'], ok: 1, why: 'En dessous, le hasard domine.' }] }
  ];
  return { SVG, theory, steps };
})();
