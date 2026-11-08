"""Phase 2-3 (to come): validation funnel.

* walk_forward.py   — 100 rolling windows (6 months optimisation / 1 month test), recurrence score
* stability.py      — parameter perturbation (±10-20 %): plateaus, not isolated peaks
* overfitting.py    — Deflated Sharpe Ratio, PBO via CSCV, White Reality Check / Hansen SPA
* monte_carlo.py    — 10,000 trade-order permutations + bootstrap: drawdown distribution, risk of ruin
* synthetic.py      — shuffled-price control: a real edge must NOT survive on synthetic data

The chronological 60/20/20 split already lives in ``smcbot.data.clean.split_periods``.
"""
