# Alerte Trading

Application web d'analyse du marché **Or (XAU/USD)** et **Bitcoin (BTC/USD)**. Le bot lit le marché selon trois méthodes — **SMC**, **CRT** et **Price Action** — repère les opportunités en **scalping** et en **day trading**, calcule la taille de position pour un risque de **1 à 2 %** et permet de **backtester** chaque stratégie.

> Outil d'aide à la décision. Aucun résultat n'est garanti et les performances passées, y compris en backtest, ne préjugent pas des performances futures. Ce n'est pas un conseil en investissement.

## Fonctionnalités

| Bouton | Ce qu'il fait |
|---|---|
| **Analyser** | Recharge les cours et lance l'analyse complète : un signal n'est émis que si au moins 2 des 4 votes (SMC, CRT, Price Action, tendance de l'UT supérieure) vont dans le même sens. |
| **Analyse SMC** | Structure de marché (BOS / CHoCH), order blocks, fair value gaps, sweeps de liquidité, zones premium / discount. |
| **Analyse CRT** | Candle Range Theory : sweep du haut ou du bas de la bougie précédente de l'UT supérieure puis retour dans le range, objectif à l'extrémité opposée. |
| **Price Action** | Tendance EMA 20/50, structure HH/HL, supports et résistances par regroupement de swings, englobantes, pin bars, cassures d'inside bar. |
| **Backtest** | Rejoue la stratégie bougie par bougie sans regarder le futur ; option « Tester toutes les UT du style ». |
| **Alertes en direct** | Surveille le marché, ajoute chaque nouvelle opportunité au journal, avec son et notification dans la page. |

Chaque signal affiche le sens (ACHAT / VENTE), l'entrée, le stop loss, l'objectif, le ratio risque / rendement, un score de confluence, les raisons du signal et la taille de position (lots pour l'or sur la base de 100 oz par lot, BTC pour le bitcoin).

### Unités de temps

- **Scalping** : 1m, 5m, 15m (CRT lu sur 15m, 1h, 4h)
- **Day trading** : 15m, 1h, 4h (CRT lu sur 4h, 1D)

### Hypothèses du backtest

- Entrée à l'ouverture de la bougie qui suit le signal, une seule position à la fois.
- Si le stop et l'objectif sont touchés dans la même bougie, le stop est retenu (hypothèse prudente).
- Risque composé au pourcentage choisi, spread / frais déduits à chaque trade, sortie forcée après la durée maximale.
- Historique de 500 bougies par unité de temps : les résultats varient fortement d'une période à l'autre.

## Données de marché

La page cherche les cours dans cet ordre et affiche la source utilisée en haut à droite :

1. **Connecteur Cubrik** (`get_candles`) quand la page est ouverte dans Claude.
2. **API publique Binance** (`data-api.binance.vision`, sans clé) : `BTCUSDT` pour le bitcoin, `PAXGUSDT` pour l'or.
3. **API publique Coinbase** (sans clé) si Binance est injoignable : `BTC-USD` et `PAXG-USD` (le 4h est reconstruit à partir du 1h).
4. **Données de démonstration**, clairement signalées, si aucune source ne répond.

L'or est suivi via **PAXG**, un jeton adossé à une once d'or physique : il suit le XAU/USD spot à quelques dollars près et cote 24 h/24, 7 j/7, mais peut s'écarter légèrement du prix de votre broker (surtout le week-end, quand le marché de l'or est fermé). Vérifiez toujours les niveaux sur votre plateforme avant d'entrer.

En mode « Alertes en direct », les cours publics sont relus toutes les 20 s (1m) ou 45 s (autres UT).

## Lancer

Ouvrez `index.html` dans un navigateur, ou publiez le dépôt avec GitHub Pages (Settings → Pages → branche `main`, dossier racine).

## Technique

Une seule page HTML, sans build : graphique [Lightweight Charts](https://github.com/tradingview/lightweight-charts) 4.1.3, moteurs d'analyse et backtest en JavaScript, préférences enregistrées dans le navigateur.
