"""Phase 4 (to come): execution.

* MetaTrader 5 (gold) and ccxt / Binance (BTC) connectors
* mandatory 4-week paper trading with an automatic live-vs-backtest drift alert
* per-trade log of the SMC bricks present at entry, Telegram notifications
* monthly walk-forward re-optimisation

The hard risk rules (sizing, 3 % daily / 6 % weekly loss caps, no martingale / grid, stop never moved
against the trade) are already enforced in ``smcbot.backtest.engine`` and will be reused here.
"""
