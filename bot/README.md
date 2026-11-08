# Bot SMC / Price Action — XAUUSD & BTCUSD

Bot de recherche basé sur les Smart Money Concepts (SMC / ICT) et le price action. Objectif du projet complet :
générer ~1 000 000 de combinaisons de règles, les filtrer en entonnoir statistique, et ne garder que celles
qui tiennent sur des données jamais vues.

**État : phase 1 terminée** (structure, données, détecteurs SMC avec tests, premier backtest simple).
La génération massive n'est volontairement **pas** lancée (voir « Résultats » plus bas).

> Outil de recherche. Aucun résultat n'est garanti et un backtest ne dit rien de certain sur l'avenir.

## Arborescence

```
bot/
├── config/config.yaml        tous les paramètres (données, coûts, SMC, sessions, risque, découpage)
├── smcbot/
│   ├── data/                 sources (Dukascopy, Binance Vision, MT5, ccxt, CSV), nettoyage, M1 -> M5..D1
│   ├── features/smc/         détecteurs SMC (numba), tous causaux
│   │   ├── core.py           ATR, swings, BOS / CHoCH / MSS, suivi des zones
│   │   ├── zones.py          FVG, IFVG, BPR, order blocks (+ qualité), breakers
│   │   ├── liquidity.py      equal highs/lows, extrêmes session / jour / semaine, sweeps, premium-discount, OTE
│   │   ├── sessions.py       kill zones en heure de New York (heure d'été gérée)
│   │   ├── price_action.py   pin bar, englobante, cassure d'inside bar, rejet de niveau
│   │   └── filters.py        percentile d'ATR, jour de la semaine, blackout news (CSV de calendrier éco)
│   ├── strategies/           simple_smc.py (première combinaison)
│   ├── backtest/             moteur (numba, coûts réels, règles de risque) + statistiques
│   ├── reports/              rapport HTML
│   ├── validation/           phases 2-3 (walk-forward, DSR, PBO, Monte Carlo…)
│   └── live/                 phase 4 (MT5 / ccxt, paper trading, Telegram)
├── scripts/                  download_data.py, plot_detectors.py, backtest_simple.py
├── tests/                    45 tests (chaque détecteur, absence de look-ahead, moteur, données)
└── reports/                  rapports HTML générés
```

## Lancer chaque étape

```bash
cd bot
pip install -r requirements.txt

# 1. Données (M1 -> M5, M15, H1, H4, D1 dans data/processed/*.parquet)
python scripts/download_data.py --asset BTCUSD                       # Binance Vision, 5 ans, ~2 min
python scripts/download_data.py --asset XAUUSD                       # Dukascopy, or spot réel (lent, reprend où il s'est arrêté)
python scripts/download_data.py --asset XAUUSD --source binance_vision --name XAUUSD_PAXG   # proxy rapide

# 2. Tests
python -m pytest -q tests

# 3. Vérification visuelle des détecteurs sur graphique
python scripts/plot_detectors.py --dataset BTCUSD --tf M15 --end 2025-06-04 --bars 200

# 4. Premier backtest simple (in-sample + validation ; le test final reste verrouillé)
python scripts/backtest_simple.py --asset BTCUSD
python scripts/backtest_simple.py --asset XAUUSD --dataset XAUUSD_PAXG
```

Sous Windows avec MetaTrader 5 : mettre `source: mt5` pour XAUUSD dans `config.yaml` (vérifier le décalage horaire du serveur du broker).

## Données

| Actif | Source par défaut | Profondeur | Remarques |
|---|---|---|---|
| BTCUSD | Binance Vision (archives mensuelles `BTCUSDT`) | 5 ans | gratuit, sans clé, ~2,6 M bougies M1 |
| XAUUSD | Dukascopy (spot réel, BID + ASK) | 5 ans | spread réel minute par minute (~0,32 $) ; Dukascopy limite fortement (HTTP 429) : le téléchargeur attend et réessaie, chaque jour est mis en cache |
| XAUUSD_PAXG | Binance Vision (`PAXGUSDT`) | 5 ans | proxy rapide de l'or, **pas** le même marché (liquidité, spread, week-ends crypto retirés) |

Nettoyage : UTC, tri, doublons, prix invalides, réparation OHLC, week-end des métaux retiré, trous **signalés, jamais comblés**.

## Choix importants

**Aucun look-ahead.** Chaque valeur à la bougie `t` n'utilise que les bougies `0..t` :
- un swing (pivot en `p`) est daté à sa confirmation `p + L` ;
- un FVG est daté sur sa 3e bougie ;
- les hauts et bas d'une session, d'un jour ou d'une semaine n'existent qu'une fois la période terminée ;
- les unités de temps supérieures ne servent qu'une fois leur bougie clôturée (`align_htf`).

`tests/test_causality.py` recalcule tous les détecteurs sur des données tronquées et exige des valeurs identiques.

**`smartmoneyconcepts` sert uniquement de contrôle.** Son `swing_highs_lows` utilise `shift(-n)` (bougies futures) et son `fvg` marque la bougie du milieu en regardant la suivante. C'est correct pour dessiner, mais en backtest c'est du look-ahead. Le test montre que nos FVG sont exactement ceux de la librairie, une bougie plus tard.

**Coûts réels et exécution prudente :**
- entrée à l'ouverture de la bougie suivante, achat à l'ask, vente au bid ;
- slippage aléatoire de 0 à 2 ticks ;
- le stop est retenu en premier si stop et objectif tombent dans la même bougie ;
- commission par lot (or) ou sur le nominal (BTC).

**Règles de risque dans le moteur**, quoi que demande la stratégie :
- risque de 1 % par défaut, taille calculée sur la distance du stop ;
- un trade est refusé si son stop pouvait faire dépasser −3 % sur la journée ou −6 % sur la semaine ;
- break-even à +1R ;
- pas de martingale ni de grid, et le stop n'est jamais déplacé contre le trade.

## Résultats du premier backtest (une seule combinaison)

Stratégie `simple_smc`, définie dans `strategies/simple_smc.py` :
- biais H1 ;
- premier contact avec un FVG / OB M15 dans ce sens, en discount (achat) ou en premium (vente) ;
- bougie de confirmation dans les 3 bougies, kill zone Londres / New York AM ;
- stop au-delà de la zone, RR 2.

| | Trades | Réussite | PF | Espérance | Rendement net | DD max |
|---|---|---|---|---|---|---|
| BTC in-sample (2021-11 → 2024-11) | 589 | 25,5 % | 0,61 | −0,38 R | −90 % | 90 % |
| BTC validation (2024-11 → 2025-11) | 184 | 27,2 % | 0,53 | −0,39 R | −52 % | 56 % |
| Or (PAXG) in-sample | 201 | 25,9 % | 0,77 | −0,12 R | −22 % | 26 % |
| Or (PAXG) validation | 126 | 33,3 % | 1,19 | +0,12 R | +13 % | 9 % |

Ce que ça nous apprend :
1. **Sans les coûts, l'espérance est de −0,03 R sur les deux actifs** : cette combinaison n'a aucun avantage, c'est du hasard.
2. **Les coûts pèsent lourd sur BTC en M15** : ≈ 0,30 R par trade (frais taker 0,04 % aller et retour + spread, pour un stop médian de 188 $). Sur l'or c'est ≈ 0,06 R. Le scalping BTC demande des frais maker, des stops plus larges ou des unités de temps plus hautes, et l'entonnoir filtrera après coûts.
3. La validation positive sur l'or (+13 %) après un in-sample négatif (−22 %) est typique du bruit de régime : il ne faut rien en conclure.

Rapports détaillés : `reports/backtest_simple_*.html` ; graphique des détecteurs : `reports/detectors_BTCUSD_M15.html`.

## Prochaines étapes

1. Données d'or réelles (Dukascopy lancé en local, ou MT5), puis nouveau contrôle.
2. Générateur vectorisé de combinaisons + Latin Hypercube, multiprocessing, résultats en Parquet.
3. Entonnoir A → D : découpage 60/20/20, ≥ 200 trades, PF > 1,3, walk-forward sur 100 fenêtres, stabilité des paramètres,
   DSR, PBO, Reality Check / SPA, Monte Carlo, données synthétiques ; exécution unique sur le test verrouillé.
4. Couche portefeuille (2 positions max, pas or + BTC dans le même sens si corrélés), paper trading, réel.
