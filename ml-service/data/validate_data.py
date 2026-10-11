"""
Validation checks for the synthetic dataset (Day 2).
Run from ml-service/:  python data/validate_data.py
"""
import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

D = os.path.dirname(os.path.abspath(__file__))
prod = pd.read_csv(f"{D}/products.csv")
sup = pd.read_csv(f"{D}/suppliers.csv")
sales = pd.read_csv(f"{D}/sales.csv", parse_dates=["date"])
stock = pd.read_csv(f"{D}/stock_history.csv", parse_dates=["date"])
snap = pd.read_csv(f"{D}/inventory_snapshot.csv")
po = pd.read_csv(f"{D}/purchase_orders.csv")
lab = pd.read_csv(f"{D}/scenario_labels.csv")

results = []
def check(name, ok, detail=""):
    results.append(ok)
    print(f"[{'PASS' if ok else 'FAIL'}] {name}  {detail}")

# 1. ABC-XYZ matrix: all 9 cells >= 3 products
cells = pd.crosstab(lab.abc_actual, lab.xyz_actual)
print("\nABC-XYZ matrix:\n", cells, "\n")
full = all(cells.get(x, pd.Series(dtype=int)).get(a, 0) >= 3 for a in "ABC" for x in "XYZ")
check("All 9 ABC-XYZ cells have >= 3 products", full)

# ABC revenue shares (informational)
rev = sales.groupby("product_id").revenue.sum()
share = (rev.groupby(lab.set_index("product_id").abc_actual).sum() / rev.sum()).round(3)
print("Revenue share by ABC class:", share.to_dict(),
      "| product counts:", lab.abc_actual.value_counts().to_dict(), "\n")

# 2. Trend / seasonal classes planted as designed
arch_counts = lab.archetype.value_counts().to_dict()
need = {"increasing": 8, "decreasing": 5, "stable": 12, "seasonal": 10, "trend_seasonal": 5}
check("All trend/seasonal classes present with planned counts", arch_counts == need, str(arch_counts))

# 3. Health statuses
hs = lab.expected_status.value_counts().to_dict()
check("Critical, Warning and Healthy all appear", set(hs) == {"Critical", "Warning", "Healthy"}, str(hs))

# 4. Supplier on-time rates vs target
targets = {"S1": .97, "S2": .96, "S3": .88, "S4": .85, "S5": .82, "S6": .60, "S7": .62, "S8": .75}
dl = po[po.status == "Delivered"].copy()
dl["on_time"] = dl.delay_days <= 0
ot = dl.groupby("supplier_id").agg(on_time=("on_time", "mean"), avg_delay=("delay_days", "mean"),
                                   std_lt=("delay_days", "std"), n=("po_id", "count"),
                                   quality=("quality_issue", "mean"))
ot["target"] = pd.Series(targets)
print(ot.round(3), "\n")
ok = bool(((ot.on_time - ot.target).abs() <= 0.06).all())
check("Each supplier on-time rate matches target profile (+/-6 pts)", ok)

# 5. At least 4 products with expected stockout before expected delivery
n_crit = int(lab.stockout_before_delivery.sum())
check("At least 4 products stock out before expected delivery", n_crit >= 4, f"({n_crit} products)")
print("Alert priority (provisional rule):", lab.expected_alert.value_counts().to_dict(),
      "| out of stock now:", int((snap.current_stock == 0).sum()), "\n")

n_re = int(((lab.stock_scenario == "reorder") & (lab.stock_ratio < 1)).sum())
check("10 products have stock below lead-time demand + safety stock", n_re == 10, f"({n_re} of 10 reorder products)")
near = lab[lab.stock_scenario == "near"].stock_ratio
check("8 near-threshold products (stock ratio 1.0-1.4) for the what-if simulator",
      len(near) == 8 and near.between(1.0, 1.4).all(), str(near.round(2).tolist()))

# 6. No negative values
neg = (sales.units_sold < 0).sum() + (stock.stock_on_hand < 0).sum() + (snap.current_stock < 0).sum()
check("No negative stock or sales values", neg == 0)

# 7. Baseline forecast MAPE (weekly, 4-week moving average, test period)
split = sales.date.min() + pd.Timedelta(days=548)
mapes = []
for pid, g in sales.groupby("product_id"):
    w = g.set_index("date").units_sold.resample("W").sum()
    train, test = w[w.index < split], w[w.index >= split]
    pred = pd.Series(train.tail(4).mean(), index=test.index)
    mask = test > 0
    mapes.append((np.abs(test[mask] - pred[mask]) / test[mask]).mean() * 100)
mape = float(np.mean(mapes))
check("Baseline forecast MAPE is finite and not near zero", np.isfinite(mape) and mape > 5,
      f"(weekly 4-wk moving average, mean MAPE = {mape:.1f}%)")

# extra info
print(f"\nRows: sales={len(sales)} stock_history={len(stock)} POs={len(po)}")
print(f"Anomaly rate: sales {sales.is_anomaly.mean() * 100:.2f}%  stock {stock.is_anomaly.mean() * 100:.2f}%"
      f"  | max supplier delay {po.delay_days.max():.0f} days")

rates = []
for pid, g in sales.groupby("product_id"):
    lt = prod.loc[prod.product_id == pid, "lead_time_days"].iloc[0]
    d = g.units_sold.values
    st = stock[stock.product_id == pid].stock_on_hand.values
    ltd = pd.Series(d[::-1]).rolling(lt, min_periods=lt).sum().values[::-1]
    ltd = np.roll(ltd, -1)
    ss = 1.65 * pd.Series(d).rolling(60, min_periods=30).std().values * np.sqrt(lt)
    ok_ = ~np.isnan(ltd) & ~np.isnan(ss)
    rates.append((st[ok_] < ltd[ok_] + ss[ok_]).mean())
print(f"Provisional stockout label rate: {np.mean(rates) * 100:.1f}% (target 15-25%)")

# 8. Plots: one per trend / seasonal type
picks = {"increasing": "WiFi Router AC1200", "decreasing": "External HDD 1TB", "stable": "Phone Charger 20W",
         "seasonal (festive)": "Power Bank 10000mAh", "seasonal (summer)": "Table Fan",
         "trend + seasonal": "Bluetooth Earbuds"}
fig, axes = plt.subplots(3, 2, figsize=(14, 10))
for ax, (kind, nm) in zip(axes.ravel(), picks.items()):
    pid = prod.loc[prod.name == nm, "product_id"].iloc[0]
    s = sales[sales.product_id == pid].set_index("date").units_sold
    ax.plot(s.resample("W").sum(), lw=1.2)
    ax.axvline(split, color="red", ls="--", lw=1)
    ax.set_title(f"{kind}: {nm} (weekly units)")
plt.tight_layout()
os.makedirs(f"{D}/plots", exist_ok=True)
plt.savefig(f"{D}/plots/sample_products.png", dpi=110)
print("Saved plot: data/plots/sample_products.png (red line = train/test split)")

print("\nRESULT:", "ALL CHECKS PASSED" if all(results) else "SOME CHECKS FAILED")
sys.exit(0 if all(results) else 1)