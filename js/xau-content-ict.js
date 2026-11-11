/* Alerte Trading — Académie XAUUSD : schémas communs et parcours ICT (Inner Circle Trader).
   Les définitions suivent l'usage public de la méthode ICT ; les seuils chiffrés utilisés par les détecteurs
   (swing à 3 bougies, déplacement ≥ 1,1 ATR, égalité ≤ 0,12 ATR…) sont des adaptations de l'app, signalées comme telles. */
window.ATXauContent = window.ATXauContent || {};
(function (X) {
  'use strict';
  X.SVG = Object.assign(X.SVG || {}, {
    bosChoch: `<svg viewBox="0 0 320 150" class="schema"><polyline points="10,120 50,80 75,100 120,50 145,75 190,30 215,60 240,45 260,95 285,80 310,130" class="ln"/>
      <line x1="120" y1="50" x2="200" y2="50" class="dash"/><text x="150" y="44" class="lb up">BOS</text><line x1="215" y1="60" x2="305" y2="60" class="dash"/><text x="255" y="118" class="lb down">CHoCH</text>
      <text x="44" y="72" class="lb">HH</text><text x="70" y="114" class="lb">HL</text><text x="185" y="24" class="lb">HH</text><text x="208" y="76" class="lb">HL</text><text x="236" y="38" class="lb">LH</text></svg>`,
    mss: `<svg viewBox="0 0 320 150" class="schema"><line x1="10" y1="110" x2="200" y2="110" class="dash"/><text x="12" y="104" class="lb">creux = liquidité vendeuse</text>
      <polyline points="10,60 50,95 80,75 120,110 150,135 175,70 200,90 240,40 300,25" class="ln"/><text x="132" y="148" class="lb accent">sweep</text>
      <line x1="80" y1="75" x2="250" y2="75" class="dash"/><text x="210" y="70" class="lb up">MSS</text><text x="172" y="60" class="lb accent">déplacement</text>
      <rect x="185" y="80" width="40" height="14" class="zone fvg"/><text x="230" y="92" class="lb accent">FVG</text></svg>`,
    eq: `<svg viewBox="0 0 320 150" class="schema"><line x1="20" y1="40" x2="300" y2="40" class="dash"/><text x="22" y="32" class="lb accent">Equal highs : stops au-dessus (BSL)</text>
      <polyline points="20,110 70,41 110,90 160,40 200,95 240,120" class="ln"/><line x1="20" y1="128" x2="300" y2="128" class="dash"/><text x="22" y="145" class="lb accent">Equal lows : stops en dessous (SSL)</text></svg>`,
    ifvg: `<svg viewBox="0 0 320 150" class="schema"><rect x="60" y="60" width="250" height="25" class="zone fvg"/><text x="230" y="77" class="lb accent">FVG → IFVG</text>
      <polyline points="20,120 60,50 110,100 160,110 200,40 230,72 260,95 300,135" class="ln bear"/><text x="160" y="135" class="lb">clôture sous le FVG : il s'inverse</text><text x="215" y="55" class="lb down">rejet</text></svg>`,
    breaker: `<svg viewBox="0 0 320 150" class="schema"><rect x="60" y="90" width="250" height="22" class="zone bear"/><text x="230" y="106" class="lb down">breaker</text>
      <polyline points="20,60 60,105 110,30 160,70 190,130 230,95 260,120 300,145" class="ln bear"/><text x="66" y="126" class="lb">OB haussier</text><text x="180" y="146" class="lb">cassé</text></svg>`,
    mitig: `<svg viewBox="0 0 320 150" class="schema"><polyline points="20,110 70,30 110,85 160,50 200,120 240,95 270,130" class="ln bear"/><rect x="100" y="78" width="210" height="16" class="zone bear"/>
      <text x="62" y="22" class="lb">sommet</text><text x="140" y="42" class="lb">plus bas : échec</text><text x="230" y="90" class="lb down">mitigation</text><line x1="110" y1="85" x2="300" y2="85" class="dash"/></svg>`,
    ote: `<svg viewBox="0 0 320 150" class="schema"><polyline points="20,135 140,20 200,85 260,40" class="ln"/><line x1="20" y1="135" x2="300" y2="135" class="dash"/><text x="250" y="130" class="lb">100 %</text>
      <line x1="140" y1="20" x2="300" y2="20" class="dash"/><text x="262" y="16" class="lb">0 %</text><rect x="140" y="91" width="160" height="21" class="zone fvg"/><text x="210" y="106" class="lb accent">OTE 62–79 %</text><text x="150" y="80" class="lb">50 %</text><line x1="140" y1="77" x2="300" y2="77" class="dash"/></svg>`,
    judas: `<svg viewBox="0 0 320 150" class="schema"><rect x="10" y="70" width="110" height="30" class="zone fvg"/><text x="14" y="64" class="lb accent">range asiatique</text>
      <polyline points="10,85 40,75 70,95 100,80 120,88 150,50 170,62 190,95 230,115 270,128 310,140" class="ln bear"/><text x="135" y="42" class="lb">faux départ (Judas)</text><text x="210" y="105" class="lb down">vrai mouvement</text></svg>`,
    po3: `<svg viewBox="0 0 320 150" class="schema"><line x1="10" y1="80" x2="310" y2="80" class="dash"/><text x="230" y="74" class="lb accent">ouverture minuit</text>
      <polyline points="10,80 50,74 80,86 110,78 140,120 165,100 200,60 240,40 280,25 310,20" class="ln"/><text x="30" y="100" class="lb">Accumulation</text><text x="110" y="140" class="lb">Manipulation</text><text x="210" y="70" class="lb up">Distribution</text></svg>`,
    sessions: `<svg viewBox="0 0 320 110" class="schema"><rect x="10" y="40" width="300" height="24" class="track"/>
      <rect x="10" y="40" width="75" height="24" class="kz asia"/><rect x="85" y="40" width="25" height="24" class="kz sb"/><rect x="110" y="40" width="12" height="24" class="kz lon"/><rect x="122" y="40" width="63" height="24" class="kz nypm"/>
      <text x="12" y="32" class="lb">Asie 00 h – 06 h</text><text x="70" y="82" class="lb">Pré-Londres 06 h – 08 h</text><text x="105" y="32" class="lb accent">1re heure 08 h – 09 h</text><text x="150" y="82" class="lb">Londres</text>
      <text x="10" y="104" class="lb">Heures de Londres (adaptation de l'app, voir sources)</text></svg>`,
    umarSetup: `<svg viewBox="0 0 320 150" class="schema"><rect x="10" y="55" width="110" height="40" class="zone fvg"/><text x="14" y="50" class="lb accent">Asie</text>
      <polyline points="10,75 40,65 70,85 110,70 130,80 150,110 165,100 180,85 195,92 215,60 250,45 300,25" class="ln"/><text x="130" y="128" class="lb accent">sweep du bas (pré-Londres)</text>
      <line x1="180" y1="85" x2="240" y2="85" class="dash"/><text x="200" y="80" class="lb up">BOS 5 min</text><line x1="195" y1="118" x2="300" y2="118" class="dash"/><text x="262" y="113" class="lb down">stop</text><line x1="215" y1="20" x2="300" y2="20" class="dash"/><text x="262" y="15" class="lb up">1:2</text></svg>`,
    rr: `<svg viewBox="0 0 320 130" class="schema"><rect x="40" y="20" width="240" height="60" class="zone bull"/><rect x="40" y="80" width="240" height="30" class="zone bear"/>
      <text x="50" y="52" class="lb up">Objectif : 2 × le risque</text><text x="50" y="100" class="lb down">Risque : 1R</text><line x1="40" y1="80" x2="280" y2="80" class="dash"/><text x="220" y="76" class="lb accent">entrée</text>
      <text x="40" y="126" class="lb">À 1:2, il suffit de 34 % de réussite pour couvrir les pertes (hors frais)</text></svg>`,
    range: `<svg viewBox="0 0 320 150" class="schema"><rect x="20" y="40" width="200" height="70" class="zone fvg"/><text x="24" y="34" class="lb accent">consolidation : extrêmes « évidents »</text>
      <polyline points="20,100 50,45 80,105 110,42 140,108 170,44 200,106 230,130 250,90 290,60" class="ln"/><text x="210" y="146" class="lb accent">sweep du bas</text></svg>`,
    disp: `<svg viewBox="0 0 320 150" class="schema"><g class="cdl"><line x1="60" y1="95" x2="60" y2="130"/><rect x="52" y="100" width="16" height="22" class="r"/></g>
      <g class="cdl"><line x1="100" y1="25" x2="100" y2="125"/><rect x="92" y="32" width="16" height="85" class="b"/></g><g class="cdl"><line x1="140" y1="15" x2="140" y2="55"/><rect x="132" y="20" width="16" height="25" class="b"/></g>
      <rect x="70" y="55" width="240" height="38" class="zone fvg"/><text x="200" y="78" class="lb accent">FVG laissé</text><text x="110" y="145" class="lb">bougie de déplacement</text></svg>`
  });

  const Q = (q, a, ok, why) => ({ q, a, ok, why });
  X.ict = {
    name: 'Parcours ICT', profName: 'Professeur ICT', avatar: '🦉', role: 'Enseigne et corrige uniquement selon la méthodologie ICT (Inner Circle Trader)',
    tagline: 'Structure, liquidité, FVG, order blocks, premium / discount, OTE, kill zones et sessions, appliqués à l\'or.',
    intro: `<p>Bonjour, je suis votre professeur ICT. Je vous enseigne la lecture du marché selon <b>ICT (Inner Circle Trader)</b> : le prix va chercher la <b>liquidité</b> (les ordres stop) puis rééquilibre les <b>inefficiences</b> (FVG), à des <b>heures précises</b>.</p>
      <p>Chaque chapitre vous montre le concept sur de <b>vraies bougies de l'or</b>, avec les cas qui ont marché et ceux qui ont échoué. Je ne mélange pas avec d'autres méthodes : si vous suivez aussi le parcours Umar, gardez les deux grilles de lecture séparées.</p>
      <p class="sub">Les définitions sont celles de l'enseignement public d'ICT. Les seuils chiffrés (taille d'un FVG, nombre de bougies d'un swing…) sont des choix de l'app pour pouvoir détecter les cas automatiquement.</p>`,
    chapters: []
  };
  const ch = (o) => X.ict.chapters.push(Object.assign({ id: 'ict-' + String(X.ict.chapters.length + 1).padStart(2, '0') }, o));

  ch({ title: 'Market Structure', min: 5, eng: 'structure', tf: '15m', svg: ['structure'],
    body: `<p>La <b>structure de marché</b> est la suite des sommets (<i>highs</i>) et des creux (<i>lows</i>) significatifs. En tendance haussière, chaque sommet dépasse le précédent (<b>HH</b>, higher high) et chaque creux reste au-dessus du précédent (<b>HL</b>, higher low). En tendance baissière : <b>LH</b> (lower high) et <b>LL</b> (lower low).</p>
      <p>Un point de swing n'est <b>confirmé</b> qu'après coup : il faut que plusieurs bougies de part et d'autre ne le dépassent pas. Sur le graphique, l'app confirme un swing après 3 bougies de chaque côté : tant qu'elles ne sont pas formées, le point n'existe pas encore pour vous.</p>
      <p>Sur l'or, lisez la structure <b>du haut vers le bas</b> : hebdomadaire et journalier pour le contexte, 4 h et 1 h pour le biais, 15 min et 5 min pour l'exécution. Une structure 5 min contraire au 1 h n'est qu'un retracement.</p>
      <p>Le <b>dernier HL</b> d'une tendance haussière est le point qui la protège : tant qu'il tient, la tendance tient. C'est aussi l'endroit logique du stop.</p>`,
    keys: ['HH + HL = haussier, LH + LL = baissier.', 'Un swing est confirmé seulement quand les bougies suivantes sont formées : jamais avant.', 'Le dernier HL (ou LH) protège la tendance et sert de stop de structure.'],
    win: 'Tendance haussière nette sur 1 h, cassure d\'un sommet en 15 min, achat avec stop sous le dernier HL : le HL tient, le prix fait un nouveau HH.',
    lose: 'Achat sur une cassure de sommet alors que la structure 1 h est baissière : la cassure 15 min n\'était qu\'un retracement, le prix casse le HL et touche le stop.',
    mistakes: ['Marquer un sommet avant que les bougies suivantes ne le confirment (biais du futur).', 'Compter chaque petite mèche comme un swing : seuls les points significatifs comptent.', 'Lire le 5 min sans regarder le 1 h et le 4 h.'],
    quiz: [Q('Une suite HH puis HL indique :', ['Une tendance haussière', 'Une tendance baissière', 'Un range'], 0, 'Sommets et creux de plus en plus hauts.'),
      Q('Quand un point de swing est-il confirmé ?', ['Dès que la mèche se forme', 'Après que les bougies suivantes ne l\'ont pas dépassé', 'À la clôture de la journée'], 1, 'Sans bougies après lui, on ne sait pas encore si c\'est un sommet.'),
      Q('Où se place le stop de structure d\'un achat ?', ['Sous le dernier HL', 'Sous le plus bas de l\'année', 'Juste sous l\'entrée'], 0, 'Le dernier HL protège la tendance.'),
      Q('Le 5 min fait des LH / LL mais le 1 h est haussier. C\'est :', ['Un retracement dans une tendance haussière', 'Une nouvelle tendance baissière confirmée', 'Un signal d\'achat immédiat'], 0, 'L\'unité supérieure donne le contexte.')] });

  ch({ title: 'Break of Structure (BOS)', min: 4, eng: 'bos', tf: '15m', svg: ['bosChoch'],
    body: `<p>Un <b>BOS</b> (Break of Structure) est la cassure d'un sommet en tendance haussière, ou d'un creux en tendance baissière, <b>dans le sens de la tendance</b>. Il confirme que la tendance continue.</p>
      <p>ICT insiste sur la <b>clôture</b> : une mèche qui dépasse le niveau puis revient n'est pas une cassure mais une prise de liquidité. Le BOS se valide quand une bougie <b>clôture</b> au-delà du niveau.</p>
      <p>Après un BOS, on ne poursuit pas le prix : on attend le retracement vers une zone (FVG, order block, OTE) dans la partie <b>discount</b> (pour un achat) de la nouvelle jambe.</p>`,
    keys: ['BOS = cassure dans le sens de la tendance, en clôture.', 'Une mèche seule n\'est pas un BOS.', 'Après un BOS, attendre le retracement : ne pas courir après le prix.'],
    win: 'BOS haussier en clôture, retracement vers le FVG laissé par la cassure, achat : le prix repart et fait un nouveau sommet.',
    lose: 'Achat au marché juste après un BOS, en plein premium : le prix retrace profondément, le stop placé trop près est touché avant la reprise.',
    mistakes: ['Prendre une mèche pour un BOS.', 'Acheter au plus haut juste après la cassure.', 'Confondre BOS (continuation) et CHoCH (premier signe de retournement).'],
    quiz: [Q('Un BOS haussier, c\'est :', ['La cassure en clôture d\'un sommet dans une tendance haussière', 'Une mèche au-dessus d\'un sommet', 'La cassure d\'un creux en tendance haussière'], 0, 'Dans le sens de la tendance, en clôture.'),
      Q('Que faire juste après un BOS ?', ['Attendre un retracement vers une zone', 'Entrer immédiatement au marché', 'Inverser la position'], 0, 'On entre au retour, pas pendant l\'élan.'),
      Q('Une mèche dépasse le sommet puis la bougie clôture dessous :', ['C\'est une prise de liquidité, pas un BOS', 'C\'est un BOS confirmé', 'C\'est un CHoCH'], 0, 'Sans clôture au-delà, pas de cassure.'),
      Q('Le BOS confirme :', ['La continuation de la tendance', 'Un retournement certain', 'Un range'], 0, 'Le retournement, c\'est le CHoCH / MSS.')] });

  ch({ title: 'Change of Character (CHoCH)', min: 4, eng: 'choch', tf: '15m', svg: ['bosChoch'],
    body: `<p>Le <b>CHoCH</b> (Change of Character) est la <b>première</b> cassure contre la tendance en cours : en tendance haussière, le prix clôture sous le dernier HL. C'est le premier signe que le « caractère » du marché change.</p>
      <p>Un CHoCH <b>n'est pas encore une tendance baissière</b>. Il faut ensuite un LH puis une nouvelle cassure vers le bas (BOS baissier) pour confirmer. Beaucoup de CHoCH sur petite unité ne sont que des retracements de l'unité supérieure.</p>
      <p>Le CHoCH devient intéressant quand il se produit <b>après une prise de liquidité</b> et dans une <b>zone de l'unité supérieure</b> (premium pour vendre, discount pour acheter) : c'est alors un MSS (chapitre suivant).</p>`,
    keys: ['CHoCH = première cassure contre la tendance.', 'Il annonce un changement possible, pas une tendance confirmée.', 'Il prend de la valeur après une prise de liquidité, dans une zone de l\'unité supérieure.'],
    win: 'Tendance haussière qui prend la liquidité au-dessus d\'un sommet en zone premium du 1 h, puis CHoCH baissier : la tendance s\'inverse.',
    lose: 'CHoCH baissier en 15 min au milieu d\'une forte tendance haussière 4 h, sans prise de liquidité : le prix reprend sa hausse.',
    mistakes: ['Vendre chaque CHoCH contre une tendance forte.', 'Confondre CHoCH et BOS.', 'Ignorer l\'unité supérieure.'],
    quiz: [Q('Le CHoCH est :', ['La première cassure contre la tendance', 'Une cassure dans le sens de la tendance', 'Un gap d\'ouverture'], 0, 'Changement de caractère.'),
      Q('Après un CHoCH baissier, la tendance baissière est-elle confirmée ?', ['Non, il faut un LH puis un BOS baissier', 'Oui, toujours', 'Oui si la bougie est rouge'], 0, 'Le CHoCH est un premier signe.'),
      Q('Un CHoCH devient plus fiable :', ['Après une prise de liquidité, dans une zone de l\'unité supérieure', 'Au milieu d\'un range', 'Quand il se produit en week-end'], 0, 'Contexte = liquidité + zone.'),
      Q('En tendance haussière, le CHoCH se produit quand le prix clôture :', ['Sous le dernier HL', 'Au-dessus du dernier HH', 'Sur l\'ouverture de minuit'], 0, 'Le HL protégeait la tendance.')] });

  ch({ title: 'Market Structure Shift (MSS)', min: 5, eng: 'mss', tf: '5m', svg: ['mss'],
    body: `<p>Pour ICT, le <b>MSS</b> (Market Structure Shift) est un changement de structure <b>qualifié</b>, en trois temps :</p>
      <p><b>1. Prise de liquidité</b> : le prix passe sous un creux (ou au-dessus d'un sommet) où dorment des stops. <b>2. Déplacement</b> : une ou plusieurs grandes bougies repartent dans l'autre sens avec énergie et laissent souvent un FVG. <b>3. Cassure</b> en clôture du dernier sommet (ou creux) court terme.</p>
      <p>Sans prise de liquidité, ce n'est qu'un CHoCH ; sans déplacement, le mouvement manque de conviction. L'entrée ICT classique se fait au <b>retour dans le FVG</b> créé par le déplacement, stop au-delà de l'extrême de la prise de liquidité.</p>
      <p class="sub">Adaptation de l'app : déplacement = corps de bougie ≥ 1,1 × l'ATR (volatilité moyenne).</p>`,
    keys: ['MSS = liquidité prise + déplacement + cassure en clôture.', 'Entrée au retour dans le FVG du déplacement.', 'Stop au-delà de l\'extrême du sweep.'],
    win: 'Sweep des creux asiatiques à Londres, grande bougie verte avec FVG, cassure du dernier sommet 5 min : retour dans le FVG, achat, objectif atteint.',
    lose: 'MSS contre la tendance 1 h, en pleine zone discount pour une vente : le FVG est traversé et le stop touché.',
    mistakes: ['Appeler MSS une cassure sans prise de liquidité.', 'Entrer pendant le déplacement au lieu d\'attendre le FVG.', 'Placer le stop sous le FVG plutôt qu\'au-delà de l\'extrême du sweep.'],
    quiz: [Q('Les trois éléments d\'un MSS :', ['Prise de liquidité, déplacement, cassure en clôture', 'RSI, MACD, volume', 'Gap, doji, marteau'], 0, 'Dans cet ordre.'),
      Q('Où se fait l\'entrée ICT classique après un MSS ?', ['Au retour dans le FVG du déplacement', 'Au plus haut du déplacement', 'Au hasard'], 0, 'Le FVG est la zone de rééquilibrage.'),
      Q('Où se place le stop ?', ['Au-delà de l\'extrême de la prise de liquidité', 'Au milieu du FVG', 'Il n\'y a pas de stop'], 0, 'Si l\'extrême est repris, l\'idée est fausse.'),
      Q('Une cassure de structure sans prise de liquidité préalable est :', ['Un simple CHoCH', 'Un MSS parfait', 'Un order block'], 0, 'La liquidité manque.')] });

  ch({ title: 'Buy Side Liquidity (BSL)', min: 4, eng: 'bsl', tf: '15m', svg: ['sweep'],
    body: `<p>La <b>Buy Side Liquidity</b> est l'ensemble des ordres d'<b>achat</b> qui dorment <b>au-dessus</b> des sommets : stops des vendeurs (un stop de vente se déclenche en achetant) et ordres d'achat sur cassure.</p>
      <p>Les gros acteurs ont besoin de cette liquidité pour <b>vendre</b> de grandes quantités sans faire chuter le prix contre eux. C'est pourquoi le prix monte souvent chercher un sommet évident juste avant de se retourner.</p>
      <p>Deux issues possibles : le prix <b>balaye</b> la BSL (mèche au-dessus puis clôture dessous : retournement possible) ou <b>l'accepte</b> (clôture au-dessus : la liquidité a servi de carburant, la hausse continue). La BSL est aussi une <b>cible</b> : en tendance haussière, l'objectif naturel est la prochaine BSL.</p>`,
    keys: ['BSL = stops et ordres d\'achat au-dessus des sommets.', 'Sweep (clôture dessous) ≠ cassure acceptée (clôture dessus).', 'La BSL est à la fois un piège et un objectif.'],
    win: 'Sommet évident en zone premium, le prix le dépasse d\'une mèche et reclôture dessous : vente, le prix redescend.',
    lose: 'Vente dès que le prix touche le sommet, sans attendre la clôture : la bougie clôture au-dessus, la hausse continue.',
    mistakes: ['Vendre au simple contact du sommet.', 'Oublier que la BSL peut être un objectif plutôt qu\'un point de retournement.', 'Placer son propre stop juste au-dessus d\'un sommet évident.'],
    quiz: [Q('Où se trouve la Buy Side Liquidity ?', ['Au-dessus des sommets', 'Sous les creux', 'Au milieu du range'], 0, 'Stops des vendeurs et achats sur cassure.'),
      Q('Mèche au-dessus du sommet puis clôture dessous :', ['Balayage : retournement possible', 'Cassure acceptée : on achète', 'Rien de notable'], 0, 'La liquidité a été prise puis rejetée.'),
      Q('Pourquoi les gros acteurs ont-ils besoin de la BSL ?', ['Pour vendre en face d\'acheteurs', 'Pour payer moins de frais', 'Pour suivre le RSI'], 0, 'Il faut des acheteurs pour vendre gros.'),
      Q('En tendance haussière, la prochaine BSL est souvent :', ['Un objectif', 'Une zone d\'achat', 'Sans intérêt'], 0, 'Le prix va chercher la liquidité.')] });

  ch({ title: 'Sell Side Liquidity (SSL)', min: 4, eng: 'ssl', tf: '15m', svg: ['sweep'],
    body: `<p>La <b>Sell Side Liquidity</b> est le miroir de la BSL : les ordres de <b>vente</b> qui dorment <b>sous</b> les creux (stops des acheteurs, ventes sur cassure).</p>
      <p>Avant une forte hausse, le prix descend souvent <b>sous un creux évident</b> pour déclencher ces ventes : les gros acheteurs remplissent leurs ordres en face. Si la bougie reclôture au-dessus du creux, c'est un <b>balayage</b> ; si elle clôture dessous et que la baisse s'accélère, la SSL a servi de carburant.</p>
      <p>En tendance baissière, la prochaine SSL est l'<b>objectif</b> logique d'une vente.</p>`,
    keys: ['SSL = stops et ventes sous les creux.', 'Balayage de SSL en discount = achat possible.', 'En tendance baissière, la SSL est la cible.'],
    win: 'Creux asiatique balayé à l\'ouverture de Londres, reclôture au-dessus, MSS haussier : achat, objectif atteint.',
    lose: 'Achat dès le passage sous le creux, alors que le 1 h est baissier : le creux est cassé en clôture, la baisse continue.',
    mistakes: ['Acheter au contact du creux sans confirmation.', 'Placer son stop juste sous un creux évident.', 'Ignorer le biais de l\'unité supérieure.'],
    quiz: [Q('Où se trouve la SSL ?', ['Sous les creux', 'Au-dessus des sommets', 'Sur l\'ouverture'], 0, 'Stops des acheteurs.'),
      Q('Le prix passe sous un creux puis reclôture au-dessus :', ['Balayage de SSL', 'BOS baissier', 'Breaker'], 0, 'La liquidité a été prise puis rejetée.'),
      Q('En tendance baissière, la SSL est :', ['Un objectif', 'Une zone de vente', 'Sans intérêt'], 0, 'Le prix va chercher la liquidité.'),
      Q('Pourquoi éviter de mettre son stop juste sous un creux évident ?', ['C\'est là que le prix va chercher la liquidité', 'Parce que c\'est interdit', 'Parce que le spread y est nul'], 0, 'Votre stop fait partie de la SSL.')] });

  ch({ title: 'Equal Highs et Equal Lows', min: 4, eng: 'eqhl', tf: '15m', svg: ['eq'],
    body: `<p>Deux sommets (ou deux creux) <b>presque au même prix</b> forment des <b>equal highs</b> (ou <b>equal lows</b>). Pour la foule, c'est une « double résistance » ou un « double support » : beaucoup placent leur stop juste au-delà.</p>
      <p>Pour ICT, c'est au contraire une <b>liquidité très concentrée</b> et donc une cible privilégiée. Des equal lows sous le prix en tendance haussière sont souvent balayés avant la reprise ; des equal highs au-dessus sont une cible évidente.</p>
      <p class="sub">Adaptation de l'app : deux swings sont « égaux » si leur écart est inférieur à 0,12 × l'ATR et qu'ils sont séparés d'au moins 4 bougies.</p>`,
    keys: ['Equal highs / lows = liquidité concentrée.', 'Ce n\'est pas un « double support solide » : c\'est une cible.', 'Attendre la prise de cette liquidité avant d\'entrer.'],
    win: 'Equal lows sous le prix, balayés à Londres puis reclôture au-dessus : achat, le prix repart vers les sommets.',
    lose: 'Achat au contact des equal lows en anticipant un rebond : ils sont cassés, le stop placé juste dessous est touché.',
    mistakes: ['Acheter un « double bas » avant qu\'il ait été balayé.', 'Placer son stop juste sous des equal lows.', 'Chercher des égalités parfaites au centime près.'],
    quiz: [Q('Des equal highs représentent :', ['Une liquidité concentrée au-dessus', 'Une résistance infranchissable', 'Un FVG'], 0, 'Beaucoup de stops au même endroit.'),
      Q('Que fait souvent le prix avec des equal lows ?', ['Il les balaye avant de repartir', 'Il ne les touche jamais', 'Il s\'arrête pile dessus'], 0, 'Ils sont une cible.'),
      Q('La bonne réaction face à des equal lows en tendance haussière :', ['Attendre leur balayage puis une confirmation', 'Acheter au contact', 'Mettre son stop juste dessous'], 0, 'On attend que la liquidité soit prise.'),
      Q('Les equal highs doivent-ils être égaux au centime près ?', ['Non, à peu près au même niveau', 'Oui, exactement', 'Oui, à 1 $ près obligatoirement'], 0, 'La tolérance dépend de la volatilité.')] });

  ch({ title: 'Fair Value Gap (FVG)', min: 5, eng: 'fvg', tf: '15m', svg: ['fvg'],
    body: `<p>Un <b>Fair Value Gap</b> est un déséquilibre sur trois bougies : la mèche de la bougie 1 et celle de la bougie 3 <b>ne se chevauchent pas</b>. Entre les deux, le prix n'a été échangé que dans un seul sens, par la grande bougie 2.</p>
      <p>FVG haussier : le <b>plus bas de la bougie 3</b> est au-dessus du <b>plus haut de la bougie 1</b>. FVG baissier : le plus haut de la bougie 3 est sous le plus bas de la bougie 1.</p>
      <p>Le prix a tendance à <b>revenir</b> dans ce vide pour le rééquilibrer. Dans le sens de la tendance, le retour dans le FVG est une zone d'entrée ; l'entrée se prend au bord du FVG, le stop au-delà de la bougie 1. Le niveau de <b>50 %</b> du FVG (consequent encroachment) est souvent respecté.</p>
      <p class="sub">Adaptation de l'app : un FVG doit mesurer au moins 0,15 × l'ATR pour compter.</p>`,
    keys: ['FVG = vide entre la mèche de la bougie 1 et celle de la bougie 3.', 'Le prix revient souvent le combler.', 'On l\'utilise dans le sens du biais, pas contre.'],
    win: 'FVG haussier laissé par un déplacement après un MSS, en discount : le prix revient au bord du FVG, achat, objectif atteint.',
    lose: 'Achat dans un FVG haussier alors que le 1 h est baissier : le FVG est traversé sans réaction.',
    mistakes: ['Prendre n\'importe quel petit gap : il doit naître d\'un vrai déplacement.', 'Trader un FVG contre le biais.', 'Mettre le stop au milieu du FVG.'],
    quiz: [Q('Un FVG haussier existe quand :', ['Le bas de la bougie 3 est au-dessus du haut de la bougie 1', 'Les trois bougies sont vertes', 'Le prix gappe à l\'ouverture'], 0, 'Les mèches 1 et 3 ne se touchent pas.'),
      Q('Que fait souvent le prix avec un FVG ?', ['Il revient le combler', 'Il ne le revisite jamais', 'Il l\'élargit'], 0, 'Rééquilibrage.'),
      Q('Où placer le stop d\'un achat dans un FVG haussier ?', ['Au-delà de la bougie 1', 'Au milieu du FVG', 'Au-dessus de la bougie 3'], 0, 'Si la bougie 1 est reprise, le déséquilibre est annulé.'),
      Q('Un FVG contre le biais de l\'unité supérieure :', ['Est à éviter', 'Est la meilleure entrée', 'N\'existe pas'], 0, 'On trade les FVG dans le sens du biais.')] });

  ch({ title: 'Inversion FVG', min: 4, eng: 'ifvg', tf: '15m', svg: ['ifvg'],
    body: `<p>Un FVG ne tient pas toujours. Quand une bougie <b>clôture à travers</b> un FVG (sous un FVG haussier, au-dessus d'un FVG baissier), le déséquilibre change de camp : c'est une <b>Inversion FVG</b> (IFVG).</p>
      <p>Un FVG haussier traversé vers le bas devient une <b>résistance</b> : au retour du prix par le dessous, on cherche une vente. C'est souvent le signe que la tendance de court terme a changé.</p>
      <p>Le principe ressemble au breaker block : ceux qui ont acheté dans le FVG sont piégés et revendent au retour à leur prix d'entrée.</p>`,
    keys: ['IFVG = FVG traversé en clôture qui change de rôle.', 'Haussier traversé = résistance ; baissier traversé = support.', 'Il signale souvent un changement de direction de court terme.'],
    win: 'FVG haussier traversé en clôture après un sweep de BSL, retour par le dessous : vente, le prix poursuit sa baisse.',
    lose: 'Vente sur IFVG alors que l\'unité supérieure est fortement haussière : le prix traverse la zone et reprend sa hausse.',
    mistakes: ['Considérer une simple mèche à travers le FVG comme une inversion.', 'Trader l\'IFVG sans regarder l\'unité supérieure.', 'Placer le stop trop près, dans la zone.'],
    quiz: [Q('Un FVG haussier devient IFVG quand :', ['Une bougie clôture sous lui', 'Une mèche le touche', 'Il est comblé à 50 %'], 0, 'Il faut une clôture à travers.'),
      Q('Un FVG haussier inversé sert ensuite de :', ['Résistance', 'Support', 'Objectif d\'achat'], 0, 'Il change de camp.'),
      Q('Pourquoi l\'IFVG fonctionne-t-il ?', ['Les acheteurs piégés revendent au retour', 'Les banques sont fermées', 'Le spread s\'élargit'], 0, 'Même logique que le breaker.'),
      Q('Une simple mèche qui traverse le FVG puis revient :', ['N\'est pas une inversion', 'Est une inversion', 'Est un MSS'], 0, 'Clôture obligatoire.')] });

  ch({ title: 'Order Blocks', min: 5, eng: 'ob', tf: '15m', svg: ['ob'],
    body: `<p>Un <b>order block</b> haussier est la <b>dernière bougie baissière</b> avant un mouvement haussier qui casse la structure (et inversement pour un order block baissier). C'est là que des ordres importants ont été placés.</p>
      <p>Un bon order block remplit trois conditions : il est suivi d'un <b>déplacement</b> (souvent avec un FVG), ce déplacement <b>casse la structure</b>, et il se trouve dans la bonne zone (discount pour un achat). Au retour du prix dans l'order block, on cherche une entrée dans le sens du mouvement ; stop de l'autre côté de la bougie.</p>
      <p>Un order block dont le prix <b>clôture à travers</b> est invalidé (il peut devenir un breaker, chapitre suivant).</p>`,
    keys: ['OB haussier = dernière bougie baissière avant la cassure haussière.', 'Il doit être suivi d\'un déplacement qui casse la structure.', 'Clôture à travers = OB invalidé.'],
    win: 'OB haussier à l\'origine d\'un BOS, en discount du 1 h : retour du prix dans l\'OB, achat, objectif atteint.',
    lose: 'OB sans déplacement ni cassure de structure, en premium : le prix le traverse sans réaction.',
    mistakes: ['Marquer chaque bougie opposée comme order block.', 'Ignorer l\'absence de cassure de structure.', 'Acheter un OB situé en premium.'],
    quiz: [Q('Un order block haussier est :', ['La dernière bougie baissière avant une cassure haussière', 'La plus grande bougie verte', 'Un gap'], 0, 'La dernière bougie opposée.'),
      Q('Ce qui valide un order block :', ['Un déplacement qui casse la structure', 'Une couleur de bougie', 'Le volume du week-end'], 0, 'Sans cassure, ce n\'est qu\'une bougie.'),
      Q('Le prix clôture sous un OB haussier :', ['L\'OB est invalidé', 'L\'OB est renforcé', 'On achète plus'], 0, 'Il peut devenir breaker.'),
      Q('Un OB haussier idéal se trouve :', ['En zone discount', 'En zone premium', 'N\'importe où'], 0, 'Acheter bas.')] });

  ch({ title: 'Breaker Blocks', min: 4, eng: 'breaker', tf: '15m', svg: ['breaker'],
    body: `<p>Un <b>breaker block</b> est un order block qui a <b>échoué</b>. Exemple : un OB haussier est cassé en clôture vers le bas, généralement après que le prix a pris de la liquidité au-dessus d'un sommet. Les acheteurs de cet OB sont piégés.</p>
      <p>Quand le prix revient dans la zone par le dessous, ces acheteurs sortent à leur prix d'entrée : la zone devient une <b>résistance</b>. Le breaker est l'un des modèles de retournement préférés d'ICT, surtout après une prise de liquidité.</p>`,
    keys: ['Breaker = OB cassé qui change de camp.', 'OB haussier cassé = résistance (et inversement).', 'Plus fiable après une prise de liquidité.'],
    win: 'Sweep d\'un sommet, cassure de l\'OB haussier qui l\'avait lancé, retour par le dessous : vente, baisse.',
    lose: 'Vente sur breaker en pleine tendance haussière 4 h : la zone ne tient pas.',
    mistakes: ['Confondre breaker et mitigation block.', 'Vendre au premier contact sans regarder la clôture.', 'Ignorer l\'unité supérieure.'],
    quiz: [Q('Un breaker block est :', ['Un order block cassé qui change de rôle', 'Un FVG non comblé', 'Un sommet égal'], 0, 'Un OB qui a échoué.'),
      Q('Un OB haussier cassé vers le bas devient :', ['Une résistance', 'Un support', 'Sans intérêt'], 0, 'Acheteurs piégés.'),
      Q('Le breaker est plus fiable :', ['Après une prise de liquidité', 'En week-end', 'Sans cassure'], 0, 'Liquidité puis cassure.'),
      Q('Pourquoi la zone résiste-t-elle ?', ['Les acheteurs piégés sortent à leur prix', 'Les vendeurs dorment', 'Il n\'y a pas d\'ordres'], 0, 'Ils veulent sortir sans perte.')] });

  ch({ title: 'Mitigation Blocks', min: 4, eng: 'mitigation', tf: '15m', svg: ['mitig'],
    body: `<p>Le <b>mitigation block</b> ressemble au breaker, avec une différence : il n'y a <b>pas de prise de liquidité</b> avant la cassure. Le prix <b>échoue</b> à faire un nouveau sommet (il fait un sommet plus bas), puis casse le creux précédent.</p>
      <p>La bougie haussière à l'origine de ce dernier élan raté devient le mitigation block : au retour du prix, ceux qui y ont acheté « mitigent » (soldent) leurs positions, ce qui crée une résistance.</p>
      <p><b>Breaker</b> : sommet plus haut (liquidité prise) puis cassure. <b>Mitigation</b> : sommet plus bas (échec) puis cassure.</p>`,
    keys: ['Mitigation = échec à faire un nouvel extrême, puis cassure.', 'Pas de prise de liquidité, contrairement au breaker.', 'La zone sert de résistance (ou support) au retour.'],
    win: 'Sommet plus bas, cassure du creux, retour dans le mitigation block : vente, baisse.',
    lose: 'Mitigation block repéré dans une forte tendance haussière : la zone est traversée.',
    mistakes: ['Confondre avec le breaker (qui suppose une prise de liquidité).', 'Oublier d\'attendre la cassure du creux.', 'Trader la zone sans unité supérieure favorable.'],
    quiz: [Q('Le mitigation block se forme quand le prix :', ['Échoue à faire un nouvel extrême puis casse la structure', 'Prend la liquidité puis casse', 'Fait un gap'], 0, 'Échec puis cassure.'),
      Q('Différence avec le breaker :', ['Pas de prise de liquidité avant la cassure', 'Aucune', 'Le breaker n\'existe pas'], 0, 'Breaker = sommet plus haut ; mitigation = sommet plus bas.'),
      Q('Au retour dans la zone, les acteurs :', ['Soldent leurs positions perdantes', 'Ajoutent des positions', 'Ne font rien'], 0, 'Ils « mitigent ».'),
      Q('Un mitigation block baissier sert de :', ['Résistance', 'Support', 'Objectif d\'achat'], 0, 'Il bloque la remontée.')] });

  ch({ title: 'Premium et Discount', min: 4, eng: 'pd', tf: '1h', svg: ['pd'],
    body: `<p>On trace un range du dernier creux au dernier sommet significatif. Le milieu (<b>50 %</b>) est l'équilibre. Au-dessus : la zone <b>premium</b> (cher) ; en dessous : la zone <b>discount</b> (bon marché).</p>
      <p>La règle ICT est simple : on <b>achète en discount</b> et on <b>vend en premium</b>, dans le sens du biais. Un achat au-dessus de 50 % a un moins bon rapport risque / rendement et plus de chances de se faire prendre par un retracement.</p>`,
    keys: ['50 % = équilibre.', 'Acheter en discount, vendre en premium.', 'Toujours dans le sens du biais de l\'unité supérieure.'],
    win: 'Structure 1 h haussière, prix revenu sous 50 % du range à 7 h (New York) : achat, le prix remonte.',
    lose: 'Achat en premium dans une structure haussière : retracement vers le discount, stop touché.',
    mistakes: ['Acheter au plus haut parce que « ça monte ».', 'Tracer le range sur des points non significatifs.', 'Oublier le biais : un discount en tendance baissière n\'est pas un achat.'],
    quiz: [Q('Le prix est au-dessus de 50 % du range : il est en', ['Premium', 'Discount', 'Équilibre parfait'], 0, 'Au-dessus du milieu.'),
      Q('En tendance haussière, on cherche à acheter :', ['En discount', 'En premium', 'Au plus haut'], 0, 'Acheter bon marché.'),
      Q('Le range premium / discount se trace :', ['Du dernier creux au dernier sommet significatif', 'Sur les deux dernières bougies', 'Sur l\'année'], 0, 'Points de swing significatifs.'),
      Q('Discount en tendance baissière :', ['Pas une raison d\'acheter', 'Achat obligatoire', 'Signal parfait'], 0, 'Le biais passe avant.')] });

  ch({ title: 'Dealing Range', min: 4, eng: 'dealing', tf: '1h', svg: ['pd'],
    body: `<p>Le <b>dealing range</b> est le range dans lequel le prix « travaille » en ce moment : du dernier creux significatif au dernier sommet significatif de l'unité de référence. C'est sur lui qu'on calcule premium, discount et équilibre.</p>
      <p>Quand le prix casse un extrême du dealing range en clôture, on redessine le range sur la nouvelle jambe. Les extrêmes du dealing range sont des réservoirs de liquidité (BSL au-dessus, SSL en dessous) : le prix va souvent chercher l'un avant l'autre.</p>`,
    keys: ['Dealing range = dernier creux → dernier sommet significatifs.', 'Il se redessine après une cassure en clôture.', 'Ses extrêmes portent la liquidité.'],
    win: 'Dealing range 1 h tracé, prix revenu à l\'équilibre puis en discount, achat vers le haut du range.',
    lose: 'Range tracé sur des petits points de 5 min : l\'équilibre ne veut rien dire, le prix l\'ignore.',
    mistakes: ['Garder un ancien range après une cassure.', 'Tracer le range sur une unité trop petite.', 'Oublier que les extrêmes sont des cibles de liquidité.'],
    quiz: [Q('Le dealing range va :', ['Du dernier creux au dernier sommet significatifs', 'De l\'ouverture à la clôture', 'Du plus bas historique au plus haut'], 0, 'Range de travail actuel.'),
      Q('Après une cassure en clôture d\'un extrême :', ['On redessine le range', 'On garde l\'ancien', 'On arrête de trader'], 0, 'Nouvelle jambe, nouveau range.'),
      Q('L\'équilibre du dealing range est à :', ['50 %', '79 %', '100 %'], 0, 'Le milieu.'),
      Q('Les extrêmes du dealing range sont :', ['Des réservoirs de liquidité', 'Des zones sans ordres', 'Des FVG'], 0, 'BSL au-dessus, SSL dessous.')] });

  ch({ title: 'Optimal Trade Entry (OTE)', min: 5, eng: 'ote', tf: '15m', svg: ['ote'],
    body: `<p>L'<b>OTE</b> est la zone d'entrée préférée d'ICT : le <b>retracement de 62 % à 79 %</b> de la jambe d'impulsion qui vient de casser la structure, avec 70,5 % comme niveau central.</p>
      <p>On trace un Fibonacci du début à la fin de la jambe (du creux au sommet pour un achat). Si le prix revient dans 62–79 % et que cette zone contient aussi un FVG ou un order block, la confluence est forte. Le stop se place au-delà de l'origine de la jambe (100 %).</p>
      <p>L'OTE est par construction en <b>discount</b> (pour un achat) de la jambe.</p>`,
    keys: ['OTE = 62 % – 79 % de la jambe, 70,5 % au centre.', 'Jambe qui a cassé la structure, tracée de son origine à son extrême.', 'Meilleure avec un FVG ou un OB dans la zone.'],
    win: 'BOS haussier, retracement à 70,5 % qui touche aussi un FVG : achat, le prix refait le sommet puis plus.',
    lose: 'OTE tracée sur une jambe qui n\'a pas cassé la structure : le prix traverse la zone jusqu\'à l\'origine.',
    mistakes: ['Tracer le Fibonacci à l\'envers.', 'Utiliser une jambe sans cassure de structure.', 'Mettre le stop à 79 % au lieu de l\'origine.'],
    quiz: [Q('La zone OTE est :', ['62 % – 79 % de retracement', '23 % – 38 %', '100 % – 161 %'], 0, '70,5 % au centre.'),
      Q('Pour un achat, le Fibonacci se trace :', ['Du creux au sommet de la jambe', 'Du sommet au creux', 'Sur deux bougies au hasard'], 0, 'Origine vers extrême.'),
      Q('Le stop d\'une entrée OTE se place :', ['Au-delà de l\'origine de la jambe', 'À 79 %', 'À 50 %'], 0, 'Si l\'origine casse, la jambe est annulée.'),
      Q('Une confluence forte en OTE :', ['Un FVG ou un OB dans la zone', 'Une bougie verte', 'Le week-end'], 0, 'Plusieurs raisons au même endroit.')] });

  ch({ title: 'Kill Zones', min: 4, eng: 'kz', tf: '5m', svg: ['kz'],
    body: `<p>Les <b>kill zones</b> sont les fenêtres horaires où les mouvements importants ont le plus de chances de se produire. En heure de New York : <b>Asie</b> 20 h – minuit (construction du range), <b>Londres</b> 2 h – 5 h, <b>New York AM</b> 7 h – 10 h, <b>New York PM</b> 13 h 30 – 16 h.</p>
      <p>Sur l'or, Londres et New York AM concentrent la plupart des grands mouvements : prises de liquidité de l'Asie, MSS, déplacements. Hors kill zone, les setups sont moins fiables et le prix « traîne ».</p>
      <p>Les kill zones sont en heure de <b>New York</b> : l'app tient compte des changements d'heure (été / hiver), qui ne tombent pas le même jour en Europe et aux États-Unis.</p>`,
    keys: ['Londres 2 h – 5 h et New York 7 h – 10 h (heure de New York).', 'Les setups ICT se cherchent dans les kill zones.', 'Heures de New York : attention aux changements d\'heure.'],
    win: 'Sweep de l\'Asie puis MSS dans la kill zone de Londres : mouvement ample, objectif atteint.',
    lose: 'Le même schéma à 12 h, hors kill zone : peu d\'élan, le prix revient sur l\'entrée.',
    mistakes: ['Trader toute la journée sans filtre horaire.', 'Oublier les décalages d\'heure été / hiver.', 'Confondre kill zone et session complète.'],
    quiz: [Q('Kill zone de Londres (heure de New York) :', ['2 h – 5 h', '9 h – 12 h', '20 h – minuit'], 0, 'Ouverture européenne.'),
      Q('Kill zone de New York AM :', ['7 h – 10 h', '13 h – 16 h', '0 h – 3 h'], 0, 'Avec les annonces de 8 h 30.'),
      Q('Rôle de l\'Asie pour l\'or :', ['Construire un range dont la liquidité sera prise', 'Faire le grand mouvement du jour', 'Rien'], 0, 'Accumulation.'),
      Q('Pourquoi tenir compte des changements d\'heure ?', ['Les fenêtres se décalent pour un trader européen', 'Ils n\'ont aucun effet', 'Le marché ferme'], 0, 'Les dates diffèrent entre Europe et États-Unis.')] });

  ch({ title: 'Asian Range', min: 4, eng: 'asian', tf: '5m', svg: ['judas'],
    body: `<p>Pour ICT, le <b>range asiatique</b> se mesure de 20 h à minuit (heure de New York). Son plus haut et son plus bas concentrent de la liquidité : stops des traders qui ont joué le range.</p>
      <p>Pendant Londres et New York, le prix prend très souvent <b>un côté</b> du range asiatique. Deux lectures : soit il <b>balaye</b> ce côté et revient dans le range (faux départ, on cherche l'autre sens), soit il <b>sort et continue</b> (vraie direction).</p>
      <p>Un range asiatique <b>étroit</b> annonce souvent une expansion ; un range très large laisse moins de place.</p>`,
    keys: ['Asie ICT = 20 h – minuit, heure de New York.', 'Londres prend souvent un côté de l\'Asie.', 'Balayage + retour = faux départ ; sortie + clôture dehors = continuation.'],
    win: 'Londres balaye le haut asiatique et reclôture dedans : vente, le prix va chercher le bas asiatique.',
    lose: 'Vente au premier passage au-dessus du haut asiatique, sans reclôture : la hausse continue.',
    mistakes: ['Utiliser une mauvaise fenêtre horaire.', 'Vendre la sortie sans attendre la reclôture.', 'Oublier le biais de fond.'],
    quiz: [Q('Le range asiatique ICT se mesure :', ['De 20 h à minuit, heure de New York', 'De 8 h à 12 h, heure de Paris', 'Sur toute la nuit européenne'], 0, 'Fenêtre ICT.'),
      Q('Londres balaye le haut asiatique puis reclôture dans le range :', ['Faux départ : chercher une vente', 'Achat immédiat', 'Rien à faire'], 0, 'La liquidité a été prise.'),
      Q('Un range asiatique étroit annonce souvent :', ['Une expansion', 'Une journée morte certaine', 'Un gap'], 0, 'Compression puis expansion.'),
      Q('Les extrêmes du range asiatique sont :', ['Des réservoirs de liquidité', 'Des niveaux sans ordres', 'Des FVG'], 0, 'Stops des traders du range.')] });

  ch({ title: 'London Session', min: 4, eng: 'london', tf: '5m', svg: ['kz'],
    body: `<p>La kill zone de <b>Londres</b> (2 h – 5 h, heure de New York) fait souvent le <b>premier vrai mouvement</b> de la journée sur l'or, après la prise de liquidité de l'Asie.</p>
      <p>Son plus haut et son plus bas deviennent à leur tour des niveaux de liquidité pour <b>New York</b> : New York continue souvent le mouvement de Londres ou vient balayer l'extrême de Londres avant de se retourner (Londres a fait le sommet ou le creux du jour).</p>`,
    keys: ['Londres fait souvent le premier mouvement du jour.', 'Ses extrêmes sont des cibles pour New York.', 'Continuation ou retournement : la clôture tranche.'],
    win: 'New York balaye le haut de Londres et reclôture dessous : vente, le prix retourne vers le bas de Londres.',
    lose: 'Vente au contact du haut de Londres alors que New York accélère à la hausse : continuation.',
    mistakes: ['Ignorer les extrêmes de Londres en session de New York.', 'Supposer que Londres fait toujours le sommet du jour.', 'Trader avant la confirmation de clôture.'],
    quiz: [Q('Kill zone de Londres, heure de New York :', ['2 h – 5 h', '8 h – 11 h', '14 h – 17 h'], 0, 'Ouverture européenne.'),
      Q('Le haut de Londres, pour New York, est :', ['Une cible de liquidité', 'Sans intérêt', 'Un FVG'], 0, 'Stops au-dessus.'),
      Q('New York prend le haut de Londres et reclôture dessous :', ['Retournement possible', 'Achat obligatoire', 'Signal nul'], 0, 'Balayage.'),
      Q('Londres fait-elle toujours l\'extrême du jour ?', ['Non', 'Oui', 'Seulement le lundi'], 0, 'Souvent, pas toujours.')] });

  ch({ title: 'New York Session', min: 4, eng: 'ny', tf: '5m', svg: ['kz'],
    body: `<p>La kill zone de <b>New York AM</b> (7 h – 10 h) est la plus volatile pour l'or : les statistiques américaines sortent à <b>8 h 30</b> (emploi, inflation) et l'ouverture des actions est à 9 h 30.</p>
      <p>New York continue la tendance de Londres, ou la retourne après avoir pris la liquidité de Londres. L'après-midi (13 h 30 – 16 h) termine souvent le mouvement ou le corrige. Avant une annonce rouge, ICT recommande d'attendre : le premier mouvement de l'annonce est souvent une prise de liquidité.</p>`,
    keys: ['New York AM = 7 h – 10 h, annonces à 8 h 30.', 'Continuation ou retournement de Londres.', 'Pas d\'entrée juste avant une annonce rouge.'],
    win: 'Après l\'annonce de 8 h 30, sweep du bas de Londres puis MSS haussier : achat, objectif atteint.',
    lose: 'Entrée à 8 h 29, juste avant l\'annonce : mèche violente qui touche le stop.',
    mistakes: ['Entrer juste avant une annonce importante.', 'Confondre la mèche d\'annonce avec la direction du jour.', 'Ignorer les extrêmes de Londres.'],
    quiz: [Q('Les statistiques américaines importantes sortent souvent à :', ['8 h 30, heure de New York', '3 h, heure de New York', '17 h, heure de Paris'], 0, 'Emploi, inflation…'),
      Q('Juste avant une annonce rouge :', ['On attend', 'On entre au maximum', 'On double la taille'], 0, 'Volatilité imprévisible.'),
      Q('Le premier mouvement d\'une annonce est souvent :', ['Une prise de liquidité', 'La direction du mois', 'Sans importance'], 0, 'Puis le vrai mouvement.'),
      Q('La kill zone New York AM :', ['7 h – 10 h', '20 h – minuit', '2 h – 5 h'], 0, 'Heure de New York.')] });

  ch({ title: 'Judas Swing', min: 4, eng: 'judas', tf: '5m', svg: ['judas'],
    body: `<p>Le <b>Judas swing</b> est le <b>faux départ</b> de la session : en début de Londres (ou de New York), le prix part dans le sens <b>opposé</b> au vrai mouvement du jour pour prendre la liquidité (souvent un extrême de l'Asie), puis se retourne.</p>
      <p>Le Judas se repère quand le mouvement va <b>contre le biais</b> de fond et qu'il <b>reclôture</b> dans le range qu'il vient de quitter. On attend ensuite un MSS dans le sens du biais pour entrer.</p>
      <p>Si la sortie va dans le sens du biais et tient en clôture, ce n'est pas un Judas : c'est le vrai mouvement.</p>`,
    keys: ['Judas = faux départ contre le biais, en début de session.', 'Il prend la liquidité (souvent l\'Asie) puis reclôture dans le range.', 'Entrée après le MSS dans le sens du biais.'],
    win: 'Biais baissier, Londres monte au-dessus du haut asiatique puis reclôture dedans, MSS baissier : vente, belle baisse.',
    lose: 'Vente sur une sortie de l\'Asie qui va dans le sens du biais haussier : ce n\'était pas un Judas, la hausse continue.',
    mistakes: ['Appeler Judas toute sortie de l\'Asie.', 'Entrer avant la reclôture et le MSS.', 'Oublier de définir le biais avant la session.'],
    quiz: [Q('Le Judas swing va :', ['Contre le vrai mouvement du jour', 'Dans le sens du biais', 'Uniquement le vendredi'], 0, 'Faux départ.'),
      Q('Signe qu\'un Judas est en cours :', ['Reclôture dans le range qu\'il vient de quitter', 'Clôture loin dehors', 'Volume nul'], 0, 'La sortie a échoué.'),
      Q('On entre :', ['Après un MSS dans le sens du biais', 'Pendant le faux départ', 'Avant la session'], 0, 'Confirmation.'),
      Q('Une sortie de l\'Asie dans le sens du biais, qui tient en clôture :', ['Probablement le vrai mouvement', 'Toujours un Judas', 'Un FVG'], 0, 'Pas de faux départ.')] });

  ch({ title: 'Power of Three', min: 4, eng: 'po3', tf: '5m', svg: ['po3'],
    body: `<p>Le <b>Power of Three</b> (PO3, ou AMD) découpe la journée en trois temps : <b>Accumulation</b> (Asie : le prix construit un range), <b>Manipulation</b> (Londres : faux mouvement sous l'ouverture pour une journée haussière, au-dessus pour une journée baissière), <b>Distribution</b> (Londres / New York : le vrai mouvement).</p>
      <p>La référence est l'<b>ouverture de minuit</b> (heure de New York). Journée haussière attendue : on cherche à acheter <b>sous</b> l'ouverture, pendant la manipulation, quand le prix revient au-dessus. La bougie journalière haussière typique a une mèche basse (manipulation) puis un grand corps (distribution).</p>`,
    keys: ['Accumulation → Manipulation → Distribution.', 'Référence : ouverture de minuit, heure de New York.', 'Journée haussière : acheter sous l\'ouverture après la manipulation.'],
    win: 'Biais haussier, Londres passe sous l\'ouverture de minuit puis revient au-dessus : achat, distribution haussière à New York.',
    lose: 'Achat sous l\'ouverture alors que le biais était baissier : la « manipulation » était le vrai mouvement.',
    mistakes: ['Utiliser l\'ouverture de 18 h ou de 0 h UTC au lieu de minuit à New York.', 'Acheter au-dessus de l\'ouverture une journée haussière.', 'Appliquer le PO3 sans biais.'],
    quiz: [Q('Les trois temps du PO3 :', ['Accumulation, manipulation, distribution', 'Ouverture, clôture, volume', 'Asie, Europe, Australie'], 0, 'AMD.'),
      Q('Référence du PO3 :', ['Ouverture de minuit, heure de New York', 'Clôture de vendredi', 'Plus haut annuel'], 0, 'Midnight open.'),
      Q('Journée haussière : on cherche à acheter', ['Sous l\'ouverture, après la manipulation', 'Au plus haut', 'Avant l\'Asie'], 0, 'Acheter bon marché.'),
      Q('La manipulation se produit souvent :', ['Pendant Londres', 'Le week-end', 'À la clôture'], 0, 'Faux mouvement de Londres.')] });

  ch({ title: 'Previous Day High / Low', min: 4, eng: 'pdhl', tf: '5m', svg: ['sweep'],
    body: `<p>Le <b>plus haut de la veille</b> (PDH) et le <b>plus bas de la veille</b> (PDL) sont parmi les niveaux de liquidité les plus regardés : beaucoup de stops et d'ordres sur cassure s'y accumulent.</p>
      <p>Le prix va très souvent chercher l'un des deux pendant la journée. Comme pour l'Asie : un <b>balayage</b> du PDH avec reclôture dessous ouvre une vente vers le PDL ; une <b>cassure acceptée</b> ouvre la voie à la liquidité suivante (plus haut de la semaine…).</p>
      <p class="sub">L'app utilise la journée de trading de l'or (de 18 h à 17 h, heure de New York).</p>`,
    keys: ['PDH / PDL = liquidité de la veille.', 'Balayage = retournement possible, cassure acceptée = continuation.', 'Tracez-les chaque matin.'],
    win: 'PDH balayé à Londres, reclôture dessous, MSS baissier : vente vers le PDL.',
    lose: 'Vente au premier contact du PDH : clôture au-dessus, la hausse continue vers le plus haut de la semaine.',
    mistakes: ['Oublier de tracer PDH / PDL chaque jour.', 'Utiliser une journée calendaire au lieu de la journée de trading.', 'Trader le contact sans la clôture.'],
    quiz: [Q('PDH signifie :', ['Plus haut de la veille', 'Plus haut de l\'heure', 'Prix de demain'], 0, 'Previous Day High.'),
      Q('Le PDH est balayé puis reclôture dessous :', ['Vente possible vers le PDL', 'Achat', 'Rien'], 0, 'Liquidité prise et rejetée.'),
      Q('Cassure acceptée du PDH :', ['Continuation vers la liquidité suivante', 'Retournement certain', 'Signal nul'], 0, 'La liquidité a servi de carburant.'),
      Q('La journée de trading de l\'or va de :', ['18 h à 17 h, heure de New York', 'Minuit à minuit, heure de Paris', '9 h à 17 h'], 0, 'Horaires du future.')] });

  ch({ title: 'Previous Week High / Low', min: 4, eng: 'pwhl', tf: '1h', svg: ['sweep'],
    body: `<p>Le <b>plus haut</b> et le <b>plus bas de la semaine précédente</b> (PWH / PWL) sont la liquidité de l'unité hebdomadaire. Pendant la semaine, le prix va souvent chercher l'un des deux, fréquemment entre lundi et mercredi.</p>
      <p>Un balayage du PWH suivi d'une reclôture dessous peut former le <b>sommet de la semaine</b> ; une cassure acceptée annonce une semaine d'expansion. Ce sont aussi des <b>objectifs</b> pour les trades de la semaine.</p>`,
    keys: ['PWH / PWL = liquidité hebdomadaire.', 'Balayage = possible extrême de la semaine.', 'Objectifs naturels des trades de la semaine.'],
    win: 'PWL balayé le mardi puis reclôture au-dessus : le creux de la semaine est fait, la semaine finit en hausse.',
    lose: 'Achat au contact du PWL alors que la semaine casse en clôture : expansion baissière.',
    mistakes: ['Oublier les niveaux hebdomadaires en scalping.', 'Prendre un contact pour un balayage.', 'Viser trop loin au-delà du PWH / PWL.'],
    quiz: [Q('PWL signifie :', ['Plus bas de la semaine précédente', 'Plus bas du mois', 'Prix pondéré'], 0, 'Previous Week Low.'),
      Q('Ces niveaux servent :', ['De liquidité et d\'objectifs', 'Seulement en investissement', 'À rien en scalping'], 0, 'Cibles hebdomadaires.'),
      Q('Balayage du PWH puis reclôture dessous :', ['Possible sommet de la semaine', 'Achat obligatoire', 'Fin de la tendance annuelle'], 0, 'Liquidité prise.'),
      Q('Quand le PWH / PWL est-il souvent visité ?', ['En début ou milieu de semaine', 'Jamais', 'Le dimanche seulement'], 0, 'Souvent lundi – mercredi.')] });
})(window.ATXauContent);
