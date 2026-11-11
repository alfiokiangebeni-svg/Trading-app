/* Alerte Trading — Académie XAUUSD : parcours Umar Punjabi.
   Sources : uniquement les vidéos publiques d'Umar Punjabi (YouTube, en hindi), lues et minutées pour cette académie.
   Chaque règle est marquée : « Documenté » (dit dans la vidéo, avec le lien et la minute), « Interprétation pédagogique »
   (explication de l'Académie à partir de ses principes) ou « Adaptation algorithmique » (chiffre choisi par l'app pour automatiser).
   Aucune règle reconstruite n'est présentée comme une règle officielle. */
(function (X) {
  'use strict';
  X.VIDEOS = Object.assign(X.VIDEOS || {}, {
    gold8: { id: 'q5SYM2zIw-k', title: 'Learn My Best Gold Trading Strategy in 8 Minutes' },
    liq: { id: 'PxBbTvu-xTQ', title: 'How to Read Liquidity on Charts (Master It in 15 Minutes)' },
    bias: { id: '4siOMJgHXYk', title: 'How to Find Market Direction Daily' }
  });
  const Q = (q, a, ok, why) => ({ q, a, ok, why });
  const R = (t, s, v, at) => ({ t, s, v, at });
  X.umar = {
    name: 'Parcours Umar Punjabi', profName: 'Professeur Umar', avatar: '🦅', role: 'Enseigne et corrige selon les principes publiés par Umar Punjabi, en séparant le documenté de l\'interprété',
    tagline: 'Liquidité, range asiatique, pré-Londres, cassure de structure 5 min dans la première heure de Londres, stop sous le swing, objectif 1:2.',
    intro: `<p>Bonjour, je suis votre professeur pour la méthode d'<b>Umar Punjabi</b>. Son idée centrale sur l'or : <b>le prix a besoin de liquidité pour bouger</b>. Il construit un range en Asie, va chercher les stops d'un côté avant Londres, puis fait son vrai mouvement dans la <b>première heure de Londres</b>.</p>
      <p>Je ne vous enseigne que ce qu'il dit lui-même dans ses vidéos publiques, et je marque chaque règle : <span class="xa-tag up">Documenté</span> (avec le lien vers la minute de la vidéo), <span class="xa-tag warn">Interprétation pédagogique</span> ou <span class="xa-tag muted">Adaptation algorithmique</span>. Je ne mélange pas avec la méthode ICT.</p>`,
    sources: `<p>Cette formation s'appuie sur trois vidéos publiques d'Umar Punjabi (en hindi), écoutées et minutées pour l'Académie :</p>
      <ul><li><a href="https://www.youtube.com/watch?v=q5SYM2zIw-k" target="_blank" rel="noopener">Learn My Best Gold Trading Strategy in 8 Minutes</a> : le setup or / session de Londres.</li>
      <li><a href="https://www.youtube.com/watch?v=PxBbTvu-xTQ" target="_blank" rel="noopener">How to Read Liquidity on Charts</a> : la liquidité, les sommets / creux égaux, les sessions.</li>
      <li><a href="https://www.youtube.com/watch?v=4siOMJgHXYk" target="_blank" rel="noopener">How to Find Market Direction Daily</a> : le biais journalier.</li></ul>
      <p>Ce que les vidéos <b>ne chiffrent pas</b> (heures exactes des sessions, ce qu'est une session « en tendance », taille d'un swing) est choisi par l'app et marqué « Adaptation algorithmique ». Son indicateur de sessions et sa formation payante ne sont pas publics : ils ne sont pas utilisés ici. Les minutes indiquées sont approximatives (« vers 1:00 » = entre 1:00 et 2:00).</p>`,
    chapters: []
  };
  const ch = (o) => X.umar.chapters.push(Object.assign({ id: 'umar-' + String(X.umar.chapters.length + 1).padStart(2, '0') }, o));

  ch({ title: 'La liquidité : pourquoi le prix chasse les stops', min: 5, eng: 'sweep', tf: '15m', svg: ['sweep'],
    body: `<p>Pour Umar, comprendre la liquidité explique pourquoi votre stop est touché juste avant le mouvement. Un gros acteur qui veut <b>vendre</b> une énorme quantité d'or ne peut pas le faire d'un coup : le prix chuterait contre lui. Il lui faut des <b>acheteurs en face</b>.</p>
      <p>Il les obtient avec un <b>faux breakout</b> : le prix passe au-dessus d'un sommet, les traders particuliers achètent la cassure et les stops des vendeurs (qui sont des ordres d'achat) se déclenchent. Le gros acteur vend dans cette demande, puis le prix s'effondre et les acheteurs piégés deviennent à leur tour la liquidité.</p>`,
    rules: [R('Les gros acteurs ont besoin de contreparties : ils créent un faux mouvement pour remplir leurs ordres.', 'doc', 'liq', '1:00'),
      R('Un faux breakout attire des acheteurs et déclenche les stops des vendeurs : deux sources de demande.', 'doc', 'liq', '3:00'),
      R('Le trader qui achète la cassure et se fait sortir « devient la liquidité » de l\'institution.', 'doc', 'liq', '4:00'),
      R('Dans l\'app, un balayage = mèche au-delà d\'un sommet / creux confirmé puis clôture de retour.', 'algo')],
    keys: ['Le prix a besoin de liquidité pour bouger.', 'Faux breakout = demande artificielle pour vendre (ou offre pour acheter).', 'Votre stop évident fait partie de cette liquidité.'],
    win: 'Sommet évident dépassé d\'une mèche puis reclôture dessous : les acheteurs de la cassure sont piégés, le prix baisse.',
    lose: 'Le prix dépasse le sommet et clôture au-dessus : ce n\'était pas un piège mais une vraie cassure.',
    mistakes: ['Acheter chaque cassure de sommet par réflexe.', 'Mettre son stop exactement là où tout le monde le met.', 'Voir des pièges partout sans attendre la clôture.'],
    quiz: [Q('Pourquoi un gros vendeur crée-t-il un faux breakout haussier ?', ['Pour avoir des acheteurs en face de ses ventes', 'Pour payer moins de commissions', 'Par hasard'], 0, 'Il lui faut de la contrepartie.'),
      Q('Les stops des vendeurs à découvert sont des ordres :', ['D\'achat', 'De vente', 'Annulés'], 0, 'Fermer une vente = acheter.'),
      Q('Après un faux breakout réussi, les acheteurs piégés :', ['Deviennent la liquidité de la baisse', 'Gagnent toujours', 'Ne comptent plus'], 0, 'Leurs stops alimentent la chute.'),
      Q('Ce qui distingue un balayage d\'une vraie cassure :', ['La clôture de retour sous le niveau', 'La couleur de la mèche', 'L\'heure de Paris'], 0, 'Clôture.')] });

  ch({ title: 'Identifier les ranges', min: 4, eng: 'u_range', tf: '1h', svg: ['range'],
    body: `<p>Quand le marché ne fait plus de nouveaux sommets ni de nouveaux creux, il est en <b>consolidation</b>. Umar commence alors par <b>marquer les extrêmes</b> du range, puis observe ce que fait la structure à l'intérieur.</p>
      <p>Les extrêmes d'un range sont des niveaux <b>évidents</b> : tout le monde les voit, donc les stops s'y accumulent. Un support testé deux ou trois fois finit très souvent par être balayé. Dans un range, il conseille de ne pas courir après les petits trades.</p>`,
    rules: [R('En consolidation, marquer d\'abord les extrêmes, puis regarder la structure.', 'doc', 'bias', '4:00'),
      R('Un niveau de support ou de résistance « évident » finit presque toujours balayé.', 'doc', 'liq', '11:00'),
      R('Après deux ou trois tests d\'un niveau, s\'en écarter : il sera probablement balayé.', 'doc', 'liq', '12:00'),
      R('Dans une consolidation, ne pas courir après les petits trades.', 'doc', 'bias', '10:00'),
      R('Dans l\'app, un range = 30 bougies 1 h dans moins de 4,5 ATR, chaque extrême touché au moins 2 fois.', 'algo')],
    keys: ['Marquer les extrêmes d\'abord.', 'Plus un niveau est évident et testé, plus il sera balayé.', 'Pas de petits trades au milieu du range.'],
    win: 'Range 1 h dont le bas est touché trois fois, balayé d\'une mèche puis reclôture dedans : achat vers le haut du range.',
    lose: 'Achat au troisième contact du bas « solide » : le niveau est cassé, la baisse continue.',
    mistakes: ['Acheter un support parce qu\'il « a tenu trois fois ».', 'Trader le milieu du range.', 'Ne pas mettre à jour les extrêmes après une cassure.'],
    quiz: [Q('Première action dans une consolidation :', ['Marquer les extrêmes', 'Acheter le milieu', 'Ajouter des indicateurs'], 0, 'D\'abord les extrêmes.'),
      Q('Un support testé trois fois :', ['Finit souvent par être balayé', 'Est incassable', 'N\'a pas d\'ordres'], 0, 'Les stops s\'y accumulent.'),
      Q('Au milieu d\'un range, Umar conseille :', ['De ne pas courir après les petits trades', 'De trader au maximum', 'D\'augmenter le risque'], 0, 'Patience.'),
      Q('Le seuil « 4,5 ATR » de l\'app est :', ['Une adaptation algorithmique', 'Une règle d\'Umar', 'Une loi du marché'], 0, 'Choix de l\'app.')] });

  ch({ title: 'Asian High et Asian Low', min: 4, eng: 'u_asia', tf: '5m', svg: ['sessions'],
    body: `<p>La stratégie or d'Umar commence par l'analyse de la <b>session asiatique</b>. Il regarde trois sessions dans l'ordre : l'Asie, le pré-Londres, puis l'ouverture de Londres.</p>
      <p>Le <b>plus haut de l'Asie</b> (Asia High) et le <b>plus bas de l'Asie</b> (Asia Low) sont les deux réservoirs de liquidité de la nuit. Toute la suite de la méthode consiste à observer lequel des deux le prix va chercher avant Londres.</p>`,
    rules: [R('La stratégie ne s\'applique qu\'à l\'or, et seulement en session de Londres.', 'doc', 'gold8', '0:00'),
      R('Il analyse trois sessions : l\'Asie, le pré-Londres et Londres.', 'doc', 'gold8', '0:00'),
      R('Les hauts et les bas de chaque session portent beaucoup de liquidité au repos.', 'doc', 'liq', '13:00'),
      R('Dans l\'app, la session asiatique va de 00 h à 06 h (heure de Londres). Umar affiche ses sessions avec un indicateur privé, sans donner les heures à l\'oral.', 'algo')],
    keys: ['Méthode : or uniquement, session de Londres.', 'Asia High et Asia Low = liquidité de la nuit.', 'Heures de l\'app : 00 h – 06 h Londres (adaptation).'],
    win: 'Asia Low marqué, balayé en pré-Londres, puis cassure haussière 5 min dans la première heure : achat gagnant.',
    lose: 'Range asiatique mal marqué (heures de Paris au lieu de Londres) : le « balayage » n\'en était pas un.',
    mistakes: ['Appliquer la méthode à d\'autres marchés ou d\'autres sessions.', 'Se tromper de fuseau horaire.', 'Marquer les corps de bougies au lieu des mèches.'],
    quiz: [Q('La stratégie or d\'Umar s\'applique :', ['À l\'or, en session de Londres', 'À toutes les paires, toute la journée', 'Au Bitcoin le week-end'], 0, 'Il le dit au début de la vidéo.'),
      Q('Les trois sessions observées :', ['Asie, pré-Londres, Londres', 'Londres, New York, Sydney', 'Lundi, mardi, mercredi'], 0, 'Dans cet ordre.'),
      Q('L\'Asia High se mesure sur :', ['La plus haute mèche de la session', 'La clôture la plus haute', 'L\'ouverture'], 0, 'On marque les extrêmes.'),
      Q('« 00 h – 06 h heure de Londres » est :', ['Une adaptation de l\'app', 'Une citation d\'Umar', 'Une heure de New York'], 0, 'Les heures exactes ne sont pas dites dans la vidéo.')] });

  ch({ title: 'Le pré-Londres et le balayage de l\'Asie', min: 5, eng: 'u_prelondon', tf: '5m', svg: ['umarSetup'],
    body: `<p>Entre la fin de l'Asie et l'ouverture de Londres, il y a un écart de <b>deux heures</b> qu'Umar appelle le <b>pré-Londres</b>. C'est le moment clé de sa méthode.</p>
      <p>Son critère principal : <b>pendant le pré-Londres, le prix doit balayer l'Asia High ou l'Asia Low</b>. Si aucun côté n'est balayé, il y a de fortes chances que Londres ne donne pas de bon mouvement. Si le bas asiatique est balayé, un grand mouvement haussier devient probable, et inversement.</p>`,
    rules: [R('Le pré-Londres est l\'écart de 2 heures entre la clôture de l\'Asie et l\'ouverture de Londres.', 'doc', 'gold8', '1:00'),
      R('Critère : l\'Asia High ou l\'Asia Low doit être balayé pendant le pré-Londres.', 'doc', 'gold8', '1:00'),
      R('Sans balayage, forte probabilité que Londres ne fasse pas de grand mouvement.', 'doc', 'gold8', '1:00'),
      R('Un balayage de liquidité signifie qu\'un grand mouvement arrive.', 'doc', 'gold8', '2:00'),
      R('Bas asiatique balayé → on cherche des achats ; haut balayé → des ventes.', 'interp'),
      R('Dans l\'app, le pré-Londres va de 06 h à 08 h (heure de Londres) ; si les deux côtés sont pris, pas de setup.', 'algo')],
    keys: ['Pré-Londres = 2 h avant l\'ouverture de Londres.', 'Balayage de l\'Asie en pré-Londres = condition principale.', 'Pas de balayage = Londres souvent sans grand mouvement.'],
    win: 'Asia Low balayé à 07 h (Londres), puis cassure haussière 5 min à 08 h 20 : achat, objectif 1:2 atteint.',
    lose: 'Aucun côté balayé, entrée quand même sur une cassure à 08 h 15 : mouvement faible, stop touché.',
    mistakes: ['Ignorer l\'absence de balayage.', 'Compter un balayage qui a lieu pendant l\'Asie elle-même.', 'Prendre un côté quand les deux ont été pris.'],
    quiz: [Q('Le pré-Londres dure :', ['Environ 2 heures', '30 minutes', '6 heures'], 0, 'L\'écart entre Asie et Londres.'),
      Q('Condition principale de la méthode :', ['Balayage de l\'Asia High ou Low en pré-Londres', 'Un croisement de moyennes mobiles', 'Une annonce économique'], 0, 'Il insiste : « très important ».'),
      Q('Sans balayage en pré-Londres :', ['Londres risque de ne pas bouger beaucoup', 'Le trade est garanti', 'On double la taille'], 0, 'Le prix a besoin de liquidité.'),
      Q('« Bas balayé → chercher des achats » est :', ['Une interprétation pédagogique', 'Une citation mot pour mot', 'Une adaptation chiffrée'], 0, 'Déduit de ses exemples.')] });

  ch({ title: 'London High et London Low', min: 4, eng: 'u_london', tf: '5m', svg: ['sessions'],
    body: `<p>Une fois Londres ouverte, son plus haut et son plus bas deviennent à leur tour des <b>niveaux de liquidité</b>. Umar montre des journées où le bas de l'Asie et celui de Londres sont balayés avant la hausse, et d'autres où le haut de Londres est pris avant que New York ne fasse baisser le prix.</p>
      <p>Pour vous, c'est un repère simple : en fin de Londres, notez son haut et son bas. Ce sont les prochaines cibles probables de New York.</p>`,
    rules: [R('Exemple : Asia Low et London Low balayés, puis mouvement haussier.', 'doc', 'liq', '13:00'),
      R('Exemple : London High balayé, puis New York fait baisser le prix.', 'doc', 'liq', '13:00'),
      R('Lorsqu\'une session ferme, les ordres en attente et les stops se placent autour de ses extrêmes.', 'doc', 'liq', '14:00'),
      R('Dans l\'app, la session de Londres va de 08 h à 13 h (heure de Londres).', 'algo')],
    keys: ['London High / Low = liquidité pour New York.', 'Les extrêmes de session attirent les stops.', 'Marquez-les en fin de matinée.'],
    win: 'New York balaye le London High puis repart à la baisse : la vente sur confirmation fonctionne.',
    lose: 'Vente au contact du London High, sans confirmation : New York casse et continue.',
    mistakes: ['Oublier de mettre à jour les extrêmes pendant la session.', 'Supposer que le London High tient forcément.', 'Confondre première heure et session complète.'],
    quiz: [Q('Le London High, pour New York, est :', ['Un niveau de liquidité', 'Un niveau sans ordres', 'Un indicateur'], 0, 'Stops au-dessus.'),
      Q('Pourquoi les extrêmes de session attirent-ils les stops ?', ['Les traders y placent leurs stops et ordres', 'Par magie', 'Parce que les banques ferment'], 0, 'Accumulation d\'ordres.'),
      Q('Dans l\'app, la session de Londres complète :', ['08 h – 13 h heure de Londres', '00 h – 06 h', '14 h – 22 h'], 0, 'Adaptation de l\'app.'),
      Q('Un balayage du London Low puis une hausse ressemble à :', ['Un exemple montré par Umar', 'Une règle ICT', 'Un hasard'], 0, 'Il le montre sur l\'or.')] });

  ch({ title: 'Liquidity Sweep', min: 4, eng: 'sweep', tf: '5m', svg: ['sweep'],
    body: `<p>Un <b>liquidity sweep</b> se produit quand le prix dépasse un niveau où dorment des stops, les déclenche, puis repart dans l'autre sens. Umar observe que le balayage casse souvent un support ou une résistance <b>secondaire</b> pour aller toucher un niveau <b>majeur</b>, d'où part le vrai mouvement.</p>
      <p>Le balayage n'est pas une entrée en soi : c'est la <b>condition</b> qui rend le mouvement suivant probable. L'entrée vient ensuite, avec une cassure de structure.</p>`,
    rules: [R('Le balayage casse un support / résistance mineur et vient toucher un niveau majeur, puis le prix part.', 'doc', 'liq', '8:00'),
      R('Si un niveau majeur est juste contre vous, éviter le trade : il peut provoquer un balayage.', 'doc', 'liq', '9:00'),
      R('Le balayage est une condition, l\'entrée vient avec la cassure de structure.', 'interp'),
      R('Dans l\'app, balayage = mèche au-delà d\'un swing confirmé (3 bougies) puis clôture de retour.', 'algo')],
    keys: ['Balayage = stops déclenchés puis retour.', 'Souvent : niveau mineur cassé, niveau majeur touché.', 'Condition, pas entrée.'],
    win: 'Creux balayé qui touche un support majeur, puis cassure de structure haussière : achat gagnant.',
    lose: 'Achat sur la mèche du balayage, avant toute cassure : le prix continue de baisser.',
    mistakes: ['Entrer pendant la mèche du balayage.', 'Trader contre un niveau majeur juste à côté.', 'Confondre balayage et cassure acceptée.'],
    quiz: [Q('Un liquidity sweep :', ['Déclenche les stops puis repart dans l\'autre sens', 'Est une cassure qui continue', 'Est un indicateur'], 0, 'Prise puis rejet.'),
      Q('Un balayage efficace va souvent :', ['D\'un niveau mineur vers un niveau majeur', 'Au milieu d\'un range', 'Nulle part'], 0, 'Il l\'explique sur l\'or.'),
      Q('Un niveau majeur juste contre votre trade :', ['Raison d\'éviter le trade', 'Raison d\'augmenter la taille', 'Sans importance'], 0, 'Risque de balayage contre vous.'),
      Q('Le balayage est :', ['Une condition avant l\'entrée', 'Le signal d\'entrée lui-même', 'Un objectif'], 0, 'L\'entrée vient avec la structure.')] });

  ch({ title: 'Stop Hunt et Liquidity Grab', min: 4, eng: 'eqhl', tf: '15m', svg: ['eq'],
    body: `<p>Umar classe les endroits où la liquidité se concentre : 1) les <b>equal highs et equal lows</b>, le réservoir le plus simple ; 2) les <b>supports et résistances évidents</b> ; 3) les <b>extrêmes de session</b> ; 4) les <b>chiffres ronds</b> (utiles à connaître, mais peu pratiques selon lui).</p>
      <p>Le <b>stop hunt</b> est le déclenchement de ces stops ; le <b>liquidity grab</b> est la prise rapide de cette liquidité par une mèche, suivie d'un retournement. Il propose même d'utiliser un balayage en 1 minute pour affiner l'entrée dans le sens de l'analyse.</p>`,
    rules: [R('Equal highs / equal lows = la zone de liquidité la plus basique.', 'doc', 'liq', '7:00'),
      R('Supports et résistances évidents : presque toujours balayés.', 'doc', 'liq', '11:00'),
      R('Chiffres ronds : bons à connaître, peu pratiques.', 'doc', 'liq', '14:00'),
      R('Utiliser un balayage d\'equal highs en 1 minute pour placer une entrée « sniper » dans le sens de l\'analyse.', 'doc', 'liq', '10:00'),
      R('Stop hunt = déclenchement des stops ; liquidity grab = prise rapide puis retournement : distinction de vocabulaire de l\'Académie.', 'interp'),
      R('Dans l\'app, deux swings sont « égaux » à moins de 0,12 ATR d\'écart.', 'algo')],
    keys: ['Equal highs / lows, niveaux évidents, extrêmes de session, chiffres ronds.', 'Stop hunt = stops déclenchés ; grab = prise rapide puis retour.', 'Balayage 1 min pour affiner l\'entrée (dans le sens de l\'analyse).'],
    win: 'Equal lows balayés d\'une mèche dans le sens du biais haussier, reclôture au-dessus : achat.',
    lose: 'Achat au contact d\'equal lows sans balayage : ils cassent, le stop placé juste dessous saute.',
    mistakes: ['Prendre les chiffres ronds comme signal principal.', 'Utiliser le balayage 1 min contre son analyse.', 'Placer son stop sur des equal lows.'],
    quiz: [Q('Le réservoir de liquidité le plus basique selon Umar :', ['Equal highs et equal lows', 'Les moyennes mobiles', 'Le RSI'], 0, 'Il commence par là.'),
      Q('Les chiffres ronds sont pour lui :', ['Bons à connaître, peu pratiques', 'Le meilleur signal', 'Inutiles et faux'], 0, 'Il le dit à la fin de la vidéo.'),
      Q('Le balayage en 1 minute sert à :', ['Affiner l\'entrée dans le sens de l\'analyse', 'Trader contre la tendance', 'Remplacer l\'analyse'], 0, 'Entrée « sniper ».'),
      Q('La distinction stop hunt / grab présentée ici est :', ['Une interprétation pédagogique', 'Une citation', 'Une adaptation chiffrée'], 0, 'Vocabulaire de l\'Académie.')] });

  ch({ title: 'Market Structure Shift', min: 4, eng: 'choch', tf: '5m', svg: ['bosChoch'],
    body: `<p>Umar lit la structure simplement : une suite de <b>lower highs et lower lows</b> est baissière. Si le prix <b>ne parvient pas</b> à faire un nouveau lower low et repart fortement à la hausse, la structure change : c'est un <b>market structure shift</b>, que beaucoup appellent aussi CHoCH (change of character).</p>
      <p>Il insiste sur un point : ne cherchez pas à prédire le retournement. Laissez le marché montrer qu'il change, puis suivez-le.</p>`,
    rules: [R('Lower highs / lower lows, puis échec à faire un nouveau lower low et forte hausse = market structure shift (CHoCH).', 'doc', 'bias', '5:00'),
      R('Ne pas prédire le marché : le laisser faire ce qu\'il fait et trader dans ce sens.', 'doc', 'bias', '7:00'),
      R('Pour changer de biais, attendre une confirmation en 4 h.', 'doc', 'bias', '9:00'),
      R('Dans l\'app, le shift est détecté sur la clôture au-delà du dernier swing opposé (3 bougies).', 'algo')],
    keys: ['Échec du nouvel extrême + cassure = shift.', 'Ne pas prédire : attendre que le marché le montre.', 'Changement de biais confirmé en 4 h.'],
    win: 'Lower lows sur 5 min, échec du dernier creux, cassure du lower high : achat en accord avec le biais 4 h.',
    lose: 'Shift 5 min contre un biais 4 h toujours baissier : le prix repart à la baisse.',
    mistakes: ['Anticiper un retournement avant le shift.', 'Changer de biais sur une seule bougie 5 min.', 'Ignorer l\'unité 4 h.'],
    quiz: [Q('Un market structure shift haussier :', ['Échec d\'un nouveau lower low puis forte hausse et cassure', 'Une bougie verte', 'Un gap'], 0, 'Il le montre en vidéo.'),
      Q('Face à un possible retournement, Umar dit :', ['Ne pas prédire, laisser le marché le montrer', 'Vendre tout de suite', 'Acheter au plus bas'], 0, 'Suivre le marché.'),
      Q('Pour changer de biais, il attend :', ['Une confirmation en 4 h', 'Une rumeur', 'Une confirmation en 1 minute'], 0, 'Il le dit dans la vidéo sur le biais.'),
      Q('Autre nom du market structure shift :', ['CHoCH', 'RSI', 'POC'], 0, 'Change of character.')] });

  ch({ title: 'Displacement', min: 4, eng: 'u_displacement', tf: '5m', svg: ['disp'],
    body: `<p>Dans les exemples d'Umar, le vrai mouvement après un balayage part avec <b>force</b> : une grande bougie (il parle d'un « grand pump ») qui laisse peu de place à l'autre camp. C'est ce qu'on appelle un <b>déplacement</b>.</p>
      <p>Un déplacement prouve qu'un acteur important est entré. Il laisse souvent un vide (FVG) que le prix vient retester. Un retournement sans déplacement, avec de petites bougies hésitantes, est moins fiable.</p>`,
    rules: [R('Après l\'échec d\'un nouveau creux, le prix fait un grand mouvement haussier qui change la structure.', 'doc', 'bias', '5:00'),
      R('Un déplacement (grande bougie) montre l\'entrée d\'un acteur important et rend le mouvement plus fiable.', 'interp'),
      R('Dans l\'app, déplacement = corps ≥ 1,5 × l\'ATR qui laisse un FVG.', 'algo')],
    keys: ['Déplacement = grande bougie qui part avec force.', 'Il laisse souvent un FVG à retester.', 'Pas de déplacement = signal plus faible.'],
    win: 'Balayage du bas asiatique, grande bougie verte avec FVG, retest du FVG : achat gagnant.',
    lose: 'Retournement fait de petites bougies sans déplacement : le prix revient sous le creux.',
    mistakes: ['Entrer au sommet de la bougie de déplacement.', 'Prendre une mèche longue pour un déplacement.', 'Ignorer le contexte (balayage, session).'],
    quiz: [Q('Un déplacement, c\'est :', ['Une grande bougie qui part avec force', 'Un petit doji', 'Une moyenne mobile'], 0, 'Corps important.'),
      Q('Ce qu\'un déplacement laisse souvent :', ['Un FVG à retester', 'Rien', 'Un dividende'], 0, 'Le vide de la grande bougie.'),
      Q('« Corps ≥ 1,5 ATR » est :', ['Une adaptation algorithmique', 'Une règle d\'Umar', 'Une règle ICT officielle'], 0, 'Choix de l\'app.'),
      Q('Où entrer après un déplacement ?', ['Au retest de la zone, pas au sommet de la bougie', 'Au sommet de la bougie', 'Nulle part'], 0, 'Attendre le retour.')] });

  ch({ title: 'Confirmation de direction : le biais journalier', min: 5, eng: 'u_bias', tf: '1h', svg: ['structure'],
    body: `<p>Le <b>biais journalier</b> est votre point de vue du jour : vais-je chercher des achats ou des ventes ? Umar en fait une étape obligatoire : sans biais, on trade dans les deux sens et on rend ses gains.</p>
      <p>Sa méthode : lire la structure (sommets, creux) de l'unité supérieure, marquer les <b>niveaux importants</b> et respecter ce que le marché a déjà respecté. Même avec un biais baissier, <b>ne vendez pas sur un support important</b>. Et si le marché vous donne tort une fois dans la journée, arrêtez-vous : le biais évite la surexposition. Les jours de FOMC ou de discours du président de la Fed, mieux vaut rester dehors.</p>`,
    rules: [R('Le biais journalier = savoir si l\'on achète ou vend ce jour-là.', 'doc', 'bias', '0:00'),
      R('Si le marché vous donne tort une fois, s\'arrêter pour la journée (éviter l\'overtrading).', 'doc', 'bias', '1:00'),
      R('Même avec un biais baissier, ne pas vendre sur un support important.', 'doc', 'bias', '8:00'),
      R('Les jours de FOMC ou de discours de la Fed, rester en dehors du marché.', 'doc', 'bias', '11:00'),
      R('Biais = sens de la dernière cassure de structure 1 h à 07 h (heure de Londres).', 'algo')],
    keys: ['Un seul sens par jour.', 'Respecter les niveaux importants, même dans le sens du biais.', 'Une erreur dans la journée = on s\'arrête. Jours de Fed = dehors.'],
    win: 'Biais vendeur sur 1 h, cassure baissière 5 min à Londres loin de tout support : vente gagnante.',
    lose: 'Vente dans le sens du biais mais pile sur un support majeur : rebond, stop touché.',
    mistakes: ['Changer de biais à chaque bougie.', 'Continuer à trader après avoir eu tort.', 'Trader le jour du FOMC.'],
    quiz: [Q('Le biais journalier sert à :', ['Choisir un seul sens pour la journée', 'Trader dans les deux sens', 'Remplacer le stop'], 0, 'Éviter de rendre ses gains.'),
      Q('Biais baissier et prix sur un support important :', ['Ne pas vendre là', 'Vendre au maximum', 'Acheter sans réfléchir'], 0, 'Il le dit explicitement.'),
      Q('Après une première perte qui contredit le biais :', ['S\'arrêter pour la journée', 'Doubler la taille', 'Inverser trois fois'], 0, 'Éviter l\'overtrading.'),
      Q('Un jour de FOMC :', ['Mieux vaut rester dehors', 'Meilleur jour pour cette méthode', 'Aucune différence'], 0, 'Marché difficile à lire.')] });

  ch({ title: 'FVG et zones de retest', min: 4, eng: 'fvg', tf: '5m', svg: ['fvg'],
    body: `<p>Les vidéos publiques utilisées ici ne détaillent pas les Fair Value Gaps. Ce chapitre est donc une <b>interprétation pédagogique</b> : il relie le déplacement (chapitre précédent) à une zone de retest concrète.</p>
      <p>Après un déplacement, le vide laissé entre la mèche de la bougie 1 et celle de la bougie 3 (le FVG) est une zone où le prix revient souvent. Dans l'esprit de la méthode, on n'entre que si la zone est <b>dans le sens du biais</b>, <b>après un balayage</b>, et pendant la <b>fenêtre de Londres</b>.</p>`,
    rules: [R('Le FVG comme zone de retest après un déplacement.', 'interp'),
      R('N\'utiliser le retest que dans le sens du biais et après un balayage.', 'interp'),
      R('Dans l\'app, FVG = écart ≥ 0,15 ATR entre les mèches des bougies 1 et 3 ; stop au-delà de la bougie 1.', 'algo')],
    keys: ['Chapitre interprété : pas de règle FVG documentée dans les sources.', 'Retest dans le sens du biais, après un balayage.', 'Stop au-delà de la bougie 1.'],
    win: 'FVG laissé par le déplacement après le balayage de l\'Asie, retest pendant la première heure : achat gagnant.',
    lose: 'Retest d\'un FVG contre le biais, en fin de session : le prix traverse la zone.',
    mistakes: ['Présenter le FVG comme une règle d\'Umar.', 'Trader tous les FVG.', 'Entrer hors de la fenêtre.'],
    quiz: [Q('Dans les sources utilisées, le FVG est :', ['Une interprétation pédagogique', 'Une règle documentée d\'Umar', 'Interdit'], 0, 'Les vidéos n\'en parlent pas.'),
      Q('Un FVG se forme quand :', ['Les mèches des bougies 1 et 3 ne se touchent pas', 'Trois bougies sont rouges', 'Le marché est fermé'], 0, 'Le vide de la bougie 2.'),
      Q('Dans l\'esprit de la méthode, le retest se trade :', ['Dans le sens du biais, après un balayage', 'Dans tous les sens', 'Uniquement le soir'], 0, 'Contexte d\'abord.'),
      Q('Le stop d\'un retest de FVG haussier se place :', ['Sous la bougie 1', 'Au milieu du FVG', 'Au-dessus de la bougie 3'], 0, 'Si la bougie 1 casse, le vide est annulé.')] });

  ch({ title: 'Entrées M1, M3 et M5', min: 5, eng: 'u_entry', tf: '5m', svg: ['umarSetup'],
    body: `<p>Le modèle d'entrée de la stratégie or est volontairement simple : après l'ouverture de Londres, dès qu'il y a une <b>cassure de structure en 5 minutes</b> (un nouveau higher high pour acheter, un nouveau lower low pour vendre) dans le sens attendu, on entre. Umar répète : « ne compliquez pas le BOS ».</p>
      <p>Pour affiner l'entrée, il propose d'utiliser un <b>balayage en 1 minute</b> dans le sens de l'analyse. Le <b>3 minutes</b> n'est pas cité dans les sources utilisées : c'est une unité intermédiaire possible, présentée ici comme interprétation.</p>
      <p class="sub">Limite des données : l'app ne dispose pas d'un historique 1 min fiable de l'or au comptant. Les exemples réels sont donc en 5 min. Le 1 min arrivera avec les données Dukascopy du laboratoire.</p>`,
    rules: [R('Entrée sur une cassure de structure en 5 min, après l\'ouverture de Londres, dans le sens du biais.', 'doc', 'gold8', '2:00'),
      R('Le BOS, simplement : un nouveau higher high (ou lower low). Ne pas compliquer.', 'doc', 'gold8', '3:00'),
      R('Balayage en 1 min pour placer une entrée « sniper ».', 'doc', 'liq', '10:00'),
      R('Le 3 min comme unité d\'entrée intermédiaire.', 'interp'),
      R('Dans l\'app, BOS = clôture 5 min au-delà du dernier swing confirmé à 2 bougies.', 'algo')],
    keys: ['Entrée = BOS 5 min dans le sens attendu, après l\'ouverture de Londres.', 'BOS = nouveau HH (ou LL), pas plus compliqué.', '1 min pour affiner ; 3 min = interprétation.'],
    win: 'Asia Low balayé, cassure du dernier sommet 5 min à 08 h 10 : entrée à la clôture, objectif atteint.',
    lose: 'Entrée sur une mèche qui dépasse le sommet sans clôture : retour immédiat sous le niveau.',
    mistakes: ['Entrer sur une mèche, pas sur une clôture.', 'Prendre une cassure dans le sens contraire au balayage.', 'Croire que le 3 min est une règle d\'Umar.'],
    quiz: [Q('Le modèle d\'entrée de la stratégie or :', ['Cassure de structure en 5 min après l\'ouverture de Londres', 'Croisement de moyennes mobiles', 'Divergence RSI'], 0, 'Il l\'explique vers 2:00.'),
      Q('Le BOS pour Umar, c\'est :', ['Un nouveau higher high ou lower low', 'Un gap', 'Une bougie doji'], 0, '« Ne compliquez pas ».'),
      Q('Le 1 min sert à :', ['Affiner l\'entrée avec un balayage', 'Définir le biais', 'Rien'], 0, 'Entrée « sniper ».'),
      Q('Pourquoi les exemples réels sont-ils en 5 min ?', ['Pas d\'historique 1 min fiable de l\'or au comptant dans l\'app', 'Le 1 min n\'existe pas', 'Umar l\'interdit'], 0, 'Limite des données, dite honnêtement.')] });

  ch({ title: 'Gestion du Stop Loss', min: 3, eng: 'u_stop', tf: '5m', svg: ['umarSetup'],
    body: `<p>La règle de stop est simple : <b>sous le dernier swing low</b> pour un achat, <b>au-dessus du dernier swing high</b> pour une vente. C'est le point qui invalide l'idée : si le prix y revient, la cassure de structure était fausse.</p>
      <p>Un stop « au feeling » ou à un nombre fixe de dollars ne respecte pas la structure. Un stop placé pile sur un niveau évident (equal lows, bas asiatique) risque d'être balayé : la logique de liquidité du chapitre 1 s'applique aussi à vous.</p>`,
    rules: [R('Stop sous le swing low précédent (achat).', 'doc', 'gold8', '3:00'),
      R('Ne pas placer son stop pile sur un niveau de liquidité évident.', 'interp'),
      R('Dans l\'app, stop = dernier swing confirmé à 2 bougies avant l\'entrée.', 'algo')],
    keys: ['Stop sous le dernier swing low (achat), au-dessus du dernier swing high (vente).', 'Le stop marque l\'invalidation de l\'idée.', 'Pas de stop au hasard.'],
    win: 'Stop sous le dernier creux 5 min : le prix le respecte et part vers l\'objectif.',
    lose: 'Stop trop serré, au-dessus du creux : une petite mèche le touche avant le mouvement.',
    mistakes: ['Stop fixe en dollars sans tenir compte de la structure.', 'Déplacer le stop pour « laisser respirer ».', 'Stop pile sur un niveau évident.'],
    quiz: [Q('Le stop d\'un achat se place :', ['Sous le dernier swing low', 'Au-dessus de l\'entrée', 'À 10 $ fixes'], 0, 'Règle documentée.'),
      Q('Le stop représente :', ['Le point où l\'idée devient fausse', 'Le gain visé', 'Le spread'], 0, 'Invalidation.'),
      Q('Éloigner son stop en cours de trade :', ['Est une erreur', 'Est recommandé', 'Est obligatoire'], 0, 'Le risque doit rester fixe.'),
      Q('Stop pile sur les equal lows :', ['Risque d\'être balayé', 'Idéal', 'Interdit par le broker'], 0, 'C\'est de la liquidité.')] });

  ch({ title: 'Take Profit', min: 3, eng: 'u_target', tf: '5m', svg: ['rr'],
    body: `<p>Dans la stratégie or, l'objectif est <b>simple : 1:2</b>, c'est-à-dire deux fois la distance du stop. Si vous risquez 4 $ par once, vous visez 8 $.</p>
      <p>Umar montre des trades qui continuent bien au-delà de l'objectif, mais la règle reste fixe : on prend 1:2. Dans la vidéo sur la liquidité, il parle aussi de 1:2 ou 1:3 pour les entrées affinées en 1 minute.</p>`,
    rules: [R('Objectif simple : 1:2.', 'doc', 'gold8', '2:00'),
      R('1:2 ou 1:3 avec une entrée affinée par balayage en 1 min.', 'doc', 'liq', '11:00'),
      R('Dans l\'app, l\'objectif est toujours placé à 2 × la distance d\'entrée au stop.', 'algo')],
    keys: ['Objectif = 2 × le risque.', 'On ne change pas l\'objectif en cours de route.', '1:3 possible avec une entrée plus fine.'],
    win: 'Risque de 3,80 $, objectif à 7,60 $ : atteint en 40 minutes.',
    lose: 'Objectif déplacé « pour gagner plus » : le prix se retourne et touche le stop.',
    mistakes: ['Changer l\'objectif pendant le trade.', 'Calculer l\'objectif depuis le mauvais prix.', 'Couper avant l\'objectif par peur.'],
    quiz: [Q('L\'objectif de la stratégie or :', ['1:2', '1:1', '1:10'], 0, 'Règle documentée.'),
      Q('Risque de 5 $, objectif 1:2 :', ['10 $', '5 $', '2,5 $'], 0, 'Deux fois le risque.'),
      Q('Avec une entrée affinée en 1 min, Umar évoque :', ['1:2 ou 1:3', '1:20', 'Aucun objectif'], 0, 'Vidéo sur la liquidité.'),
      Q('Déplacer l\'objectif pendant le trade :', ['Est une erreur', 'Est la règle', 'N\'a pas d\'effet'], 0, 'Discipline.')] });

  ch({ title: 'Risk / Reward', min: 4, eng: 'u_rr', tf: '5m', svg: ['rr'],
    body: `<p>Le rapport <b>risque / rendement</b> (R/R) compare ce que vous risquez à ce que vous visez. À 1:2, un trade gagnant rapporte <b>2R</b> et un perdant coûte <b>1R</b>. Il suffit alors d'environ <b>34 % de réussite</b> pour couvrir les pertes, avant les frais.</p>
      <p>Avec un risque fixe de 1 % par trade, 10 pertes de suite coûtent environ 10 %. Ce qui compte n'est pas le taux de réussite seul mais l'<b>espérance</b> : réussite × gain moyen − échec × perte moyenne. Umar insiste : testez votre stratégie sur au moins un an de données avant de trader en réel.</p>`,
    rules: [R('Objectif 1:2 dans la stratégie or.', 'doc', 'gold8', '2:00'),
      R('Écrire ses règles, tester la stratégie sur un an de données, puis compte démo avant le réel.', 'doc', 'gold8', '6:00'),
      R('Seuil de rentabilité à 1:2 ≈ 34 % de réussite, hors frais : calcul de l\'Académie.', 'interp')],
    keys: ['1:2 → seuil ≈ 34 % de réussite (hors frais).', 'Espérance = ce qui compte.', 'Tester sur un an, puis démo.'],
    win: 'Sur 10 trades à 1:2 : 4 gagnants, 6 perdants = +2R.',
    lose: 'Sur 10 trades à 1:2 : 3 gagnants, 7 perdants = −1R, et les frais aggravent encore.',
    mistakes: ['Juger une stratégie au seul taux de réussite.', 'Oublier les frais (spread, commission).', 'Passer en réel sans test.'],
    quiz: [Q('À 1:2, le seuil de réussite pour être à l\'équilibre (hors frais) :', ['Environ 34 %', 'Environ 80 %', 'Environ 10 %'], 0, '1 / (1 + 2).'),
      Q('4 gagnants et 6 perdants à 1:2 donnent :', ['+2R', '−2R', '0R'], 0, '4 × 2 − 6.'),
      Q('Avant de trader en réel, Umar recommande :', ['Tester sur un an de données puis en démo', 'Commencer en réel tout de suite', 'Suivre les signaux d\'un autre'], 0, 'Plan d\'action de la vidéo.'),
      Q('Ce qui juge une stratégie :', ['L\'espérance après frais', 'Le seul taux de réussite', 'Le nombre de trades'], 0, 'Gain moyen et perte moyenne comptent.')] });

  ch({ title: 'Gestion des sessions de trading', min: 3, eng: 'u_session', tf: '5m', svg: ['sessions'],
    body: `<p>La règle horaire est stricte : <b>on n'entre que pendant la première heure de la session de Londres</b>. Si aucune entrée ne se présente dans cette heure, <b>pas de trade</b> ce jour-là.</p>
      <p>Cette règle limite le nombre de trades (la fréquence est faible) mais concentre l'activité sur le moment où l'or bouge le plus après la prise de liquidité. Ne pas trader est une décision valable.</p>`,
    rules: [R('Entrée uniquement dans la première heure de Londres ; sinon, pas de trade.', 'doc', 'gold8', '1:00'),
      R('La fréquence des trades est faible.', 'doc', 'gold8', '5:00'),
      R('Dans l\'app, la première heure va de 08 h à 09 h (heure de Londres), changements d\'heure compris.', 'algo')],
    keys: ['Fenêtre : première heure de Londres uniquement.', 'Pas d\'entrée dans la fenêtre = pas de trade.', 'Peu de trades, c\'est normal.'],
    win: 'Cassure 5 min à 08 h 25 : entrée valide, objectif atteint.',
    lose: 'Cassure à 09 h 40, entrée quand même : hors règle, et le mouvement s\'essouffle.',
    mistakes: ['Entrer après la fenêtre « parce que le setup est beau ».', 'Confondre heure de Londres et heure de Paris.', 'Forcer un trade chaque jour.'],
    quiz: [Q('Fenêtre d\'entrée de la stratégie or :', ['Première heure de Londres', 'Toute la journée', 'Session asiatique'], 0, 'Règle documentée.'),
      Q('Pas d\'entrée dans la fenêtre :', ['Pas de trade ce jour-là', 'On entre à New York', 'On double demain'], 0, 'Il le dit clairement.'),
      Q('La fréquence des trades de cette méthode est :', ['Faible', 'Très élevée', 'Fixe à 10 par jour'], 0, 'Peu de setups.'),
      Q('« 08 h – 09 h heure de Londres » est :', ['Une adaptation de l\'app', 'Une citation exacte', 'Une heure de New York'], 0, 'Umar parle de « première heure », pas d\'horaire chiffré.')] });

  ch({ title: 'Identifier les faux signaux', min: 5, eng: 'u_fake', tf: '5m', svg: ['umarSetup'],
    body: `<p>Umar décrit précisément les journées où <b>Londres ne bouge pas</b> : 1) <b>pas de balayage</b> de l'Asie en pré-Londres ; 2) une Asie <b>et</b> un pré-Londres <b>très en tendance</b> (le mouvement a déjà eu lieu). Une cassure 5 min sans balayage est un setup de <b>basse probabilité</b>, qu'il appelle « London continuation ».</p>
      <p>Il ne veut <b>pas d'indicateurs</b> en plus (moyennes mobiles, RSI) : la lecture du prix suffit. Il propose plutôt de tester et de retirer ce qui perd, par exemple un jour de la semaine qui concentre les pertes.</p>`,
    rules: [R('Asie et pré-Londres très en tendance → Londres ne bouge souvent pas.', 'doc', 'gold8', '4:00'),
      R('Pas de balayage = setup de basse probabilité (« London continuation »).', 'doc', 'gold8', '5:00'),
      R('Pas d\'indicateurs supplémentaires (moyennes mobiles, RSI) : il n\'y croit pas.', 'doc', 'gold8', '5:00'),
      R('Tester et retirer ce qui perd (exemple : ne plus trader le lundi si les pertes s\'y concentrent).', 'doc', 'gold8', '7:00'),
      R('Dans l\'app, une session est « en tendance » si son déplacement net dépasse 60 % de son amplitude.', 'algo')],
    keys: ['Pas de balayage = basse probabilité.', 'Asie + pré-Londres en tendance = Londres souvent plate.', 'Pas d\'indicateurs : filtrer par le test.'],
    win: 'Journée filtrée : balayage clair, Asie calme. La cassure 5 min donne un bon trade.',
    lose: 'Journée ignorée par le filtre (Asie et pré-Londres en tendance) mais tradée quand même : pas de mouvement, stop.',
    mistakes: ['Trader les jours de basse probabilité « pour ne pas rater ».', 'Ajouter des indicateurs au lieu de tester.', 'Retirer un jour sans assez de données.'],
    quiz: [Q('Londres bouge peu quand :', ['Asie et pré-Londres sont déjà très en tendance', 'L\'Asie est calme et balayée', 'Il pleut à Londres'], 0, 'Le mouvement a déjà eu lieu.'),
      Q('Cassure 5 min sans balayage de l\'Asie :', ['Setup de basse probabilité', 'Meilleur setup', 'Interdit par la loi'], 0, '« London continuation ».'),
      Q('Les indicateurs supplémentaires selon Umar :', ['Il n\'y croit pas', 'Indispensables', 'Obligatoires le lundi'], 0, 'Il le dit explicitement.'),
      Q('Le seuil « 60 % de l\'amplitude » est :', ['Une adaptation de l\'app', 'Une règle d\'Umar', 'Un standard du marché'], 0, 'Choix de l\'app.')] });

  ch({ title: 'Le setup complet : Gold London', min: 5, eng: 'u_setup', tf: '5m', svg: ['umarSetup'],
    body: `<p>Toutes les pièces assemblées, dans l'ordre :</p>
      <p><b>1.</b> Marquer l'Asia High et l'Asia Low. <b>2.</b> Pendant le pré-Londres, vérifier lequel est balayé (bas balayé → achats ; haut balayé → ventes ; aucun ou les deux → pas de setup de haute probabilité). <b>3.</b> Vérifier que l'Asie et le pré-Londres ne sont pas tous deux en tendance. <b>4.</b> Dans la <b>première heure de Londres</b>, attendre une cassure de structure 5 min dans le sens attendu. <b>5.</b> Stop sous (au-dessus) du dernier swing, objectif 1:2. <b>6.</b> Rien dans la fenêtre : pas de trade.</p>
      <p>Umar le rappelle : écrivez ces règles, testez-les sur au moins un an, puis en démo. Les statistiques ci-dessous viennent des données réelles chargées : un échantillon de quelques semaines ne prouve rien, le vrai test viendra avec le laboratoire « Le Marché ».</p>`,
    rules: [R('Or uniquement, session de Londres, analyse Asie → pré-Londres → Londres.', 'doc', 'gold8', '0:00'),
      R('Balayage de l\'Asie en pré-Londres, entrée sur BOS 5 min dans la première heure, stop sous le swing, objectif 1:2.', 'doc', 'gold8', '1:00'),
      R('Écrire les règles, tester sur un an, puis compte démo.', 'doc', 'gold8', '6:00'),
      R('Si les deux côtés de l\'Asie sont pris en pré-Londres : pas de setup.', 'interp'),
      R('Heures, seuil de tendance et taille des swings : voir les chapitres précédents.', 'algo')],
    keys: ['Asie → balayage en pré-Londres → BOS 5 min dans la 1re heure → stop au swing → 1:2.', 'Pas de balayage ou sessions en tendance = basse probabilité.', 'Pas de setup = pas de trade.'],
    win: 'Asia Low balayé à 06 h 40, Asie calme, BOS haussier 5 min à 08 h 15 : achat, objectif 1:2 atteint avant 10 h.',
    lose: 'Asia High balayé, BOS baissier à 08 h 30, mais une annonce américaine fait remonter l\'or : stop touché. Aucune méthode ne gagne à chaque fois.',
    mistakes: ['Sauter une étape (par exemple entrer sans balayage).', 'Juger la méthode sur quelques trades.', 'Trader en réel sans backtest ni démo.'],
    quiz: [Q('Ordre correct du setup :', ['Asie → balayage pré-Londres → BOS 5 min 1re heure → stop au swing → 1:2', 'BOS → Asie → objectif → stop', 'RSI → MACD → entrée'], 0, 'Les six étapes.'),
      Q('Asia Low balayé en pré-Londres : on cherche', ['Des achats', 'Des ventes', 'Rien'], 0, 'Liquidité vendeuse prise.'),
      Q('Aucun BOS dans la première heure :', ['Pas de trade', 'Entrée à 11 h', 'Entrée au hasard'], 0, 'Règle de la fenêtre.'),
      Q('Quelques semaines de statistiques suffisent-elles à prouver la méthode ?', ['Non', 'Oui', 'Oui si elles sont positives'], 0, 'Il faut un vrai backtest sur plusieurs années.')] });
})(window.ATXauContent);
