# Alerte Trading

Application web d'analyse du marché **Or (XAU/USD)** et **Bitcoin (BTC/USD)**. Le bot lit le marché selon trois méthodes — **SMC**, **CRT** et **Price Action** — repère les opportunités en **scalping** et en **day trading**, calcule la taille de position pour un risque de **1 à 2 %** et permet de **backtester** chaque stratégie.

> Outil d'aide à la décision. Aucun résultat n'est garanti et les performances passées, y compris en backtest, ne préjugent pas des performances futures. Ce n'est pas un conseil en investissement.

## Sections de l'application

| Section | Contenu |
|---|---|
| **Trading** | Analyse or / BTC en SMC, CRT, Price Action et **Bot SMC v2** (stratégie du bot Python portée en JavaScript), signaux, gestion du risque, backtest aux règles du moteur Python (commissions, break-even à +1R, plafonds −3 %/jour et −6 %/semaine). |
| **Annonces** | Calendrier économique de la semaine (ForexFactory), compte à rebours de la prochaine annonce USD à fort impact, effet habituel sur l'or et le BTC, avertissement sur l'écran de trading 30 min avant/après une annonce rouge. |
| **Football** | Bot d'analyse des matchs (Ligue 1, Premier League, LaLiga, Serie A, Bundesliga, Ligue des champions…) : probabilités 1/N/2, buts attendus, +2,5 buts, les deux équipes marquent, scores probables, comparaison avec les cotes. Modèle de Poisson (Dixon-Coles) sur les forces d'attaque/défense, la forme et l'avantage du terrain. Données ESPN. |
| **Académie** | Formation : théorie express (6 leçons + quiz), méthode pas à pas en 9 étapes (annonces → biais → liquidité → zones → kill zone → confirmation → entrée/taille → gestion → journal) reliée aux outils de l'app, puis analyse guidée en direct sur le marché réel, et **simulateur « trader et backtester votre stratégie »** sur l'or, le BTC, l'EUR/USD et le S&P 500 : choix de la semaine à analyser (10 dernières) ou retour en arrière de 1 semaine à 5 minutes, UT 5m à 4h, lecture en temps réel 1× à 100×, journées et sessions (Asie, Londres, New York) affichées sur le graphique ; outils HH / HL / LH / LL, OB, FVG, MSS, Fibonacci manuel et automatique (OTE 62–79 %), lignes ; plusieurs positions simultanées, stop et objectif réglés en faisant glisser les lignes, risque réglable ; le professeur corrige chaque tracé, note chaque trade sur 100 et suit le parcours de certification (objectif 26 000 trades gagnants validés, réglable). Données : Yahoo Finance (or GC=F, EUR/USD, S&P 500 ES=F) et Binance (BTC), copie de secours dans la branche `data`. Progression enregistrée sur l'appareil. |
| **Labo** | Le bot de recherche Python (`bot/`) : méthode, résultats, enseignements, rapports complets consultables dans l'app. |

Sources : l'APK lit le calendrier et ESPN directement (HTTP natif Capacitor), l'app PC aussi (Electron). La version web utilise en secours une copie mise à jour toutes les 6 h par GitHub Actions (`.github/workflows/web-data.yml`, branche `data`).

## Bot de recherche SMC (Python)

Le dossier [`bot/`](bot/README.md) contient le bot de recherche SMC / price action en Python (données 5 ans, détecteurs testés, moteur de backtest avec coûts réels). Voir son README.

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

## Télécharger / ouvrir

| Version | Comment |
|---|---|
| **Android** (7 à 16) | APK dans les [Releases](https://github.com/alfiokiangebeni-svg/Trading-app/releases/latest), ou ouvrez la version Chrome sur le téléphone puis menu ⋮ → « Installer l'application ». |
| **PC** Windows · macOS · Linux | Installateur `.exe` / portable, `.dmg`, `.AppImage` / `.deb` dans les [Releases](https://github.com/alfiokiangebeni-svg/Trading-app/releases/latest). Ou bouton « Installer » dans Chrome / Edge. |
| **Chrome** | https://alfiokiangebeni-svg.github.io/Trading-app/ (GitHub Pages, publié depuis la branche `main`). |

Les APK et installateurs sont compilés automatiquement par GitHub Actions (`.github/workflows/build-apps.yml`) à chaque push, puis publiés dans la release `v2.0.0`.

### Compiler soi-même

```bash
npm ci
npm run android:apk          # APK debug dans android/app/build/outputs/apk/debug/ (Android SDK + JDK 21 requis)
npm run android:open         # ou ouvrir le projet dans Android Studio

cd desktop && npm ci
npm run prepare-app && npm start     # lancer l'app PC
npx electron-builder                 # créer l'installateur pour votre système
```

## Technique

- Android : Capacitor 8 (cible Android 16 / API 36, minimum Android 7 / API 24).
- PC : Electron, installateurs via electron-builder.
- Web : PWA installable (manifeste + service worker, fonctionne hors ligne pour l'interface).

Une seule page HTML, sans build : graphique [Lightweight Charts](https://github.com/tradingview/lightweight-charts) 4.1.3, moteurs d'analyse et backtest en JavaScript, préférences enregistrées dans le navigateur.
