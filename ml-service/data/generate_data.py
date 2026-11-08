"""
Synthetic data generator for Replenix.
Run from ml-service/:  python data/generate_data.py
Seed 42 -> reproducible. Outputs CSV files next to this script.
"""
import os
from datetime import date, timedelta

import numpy as np
import pandas as pd

SEED = 42
rng = np.random.default_rng(SEED)
OUT = os.path.dirname(os.path.abspath(__file__))

N_DAYS = 730
END_DATE = date.today()
START_DATE = END_DATE - timedelta(days=N_DAYS - 1)
DATES = pd.date_range(START_DATE, END_DATE, freq="D")
DOW = DATES.dayofweek.values          # Mon=0 ... Sun=6
MONTH = DATES.month.values
T_IDX = np.arange(N_DAYS)
TRAIN_DAYS = 548                      # first 18 months train, last 6 months test

# ----------------------------------------------------------------------------
# Suppliers: 2 excellent, 3 average, 2 poor, 1 erratic
# (name, profile, on_time_rate, late_delay_range, quality_issue_rate)
# ----------------------------------------------------------------------------
SUPPLIERS = [
    ("TechSource Distributors", "excellent", 0.97, (1, 1), 0.01),
    ("Sunrise Electronics",     "excellent", 0.96, (1, 1), 0.02),
    ("Bharat Components",       "average",   0.88, (1, 4), 0.04),
    ("Metro Office Supplies",   "average",   0.85, (2, 5), 0.05),
    ("Orion Imports",           "average",   0.82, (2, 6), 0.06),
    ("QuickShip Traders",       "poor",      0.60, (8, 14), 0.11),
    ("Value Wholesale Co",      "poor",      0.62, (8, 14), 0.10),
    ("Zenith Logistics",        "erratic",   0.75, (7, 13), 0.05),
]

# ----------------------------------------------------------------------------
# Products: name, category, price, base units/day, archetype, season, xyz,
#           lead_time, suppliers (1-based), stock scenario, XAI driver, open PO
# archetype: increasing | decreasing | stable | seasonal | trend_seasonal
# season: none | festive | college | summer
# scenario: reorder | near | normal | well | over
# ----------------------------------------------------------------------------
P = []
def add(*a): P.append(a)
CA, MA, HA, ST, NW, GL = ("Computer Accessories", "Mobile & Audio", "Home Appliances",
                          "Stationery & Office", "Networking", "Gaming & Lifestyle")
add("USB Hub 4-Port",        CA, 450,   17,  "stable",         "none",    "X", 5,  [1],    "reorder", "low_stock",        False)
add("Mechanical Keyboard",   CA, 750,   20,  "stable",         "none",    "X", 6,  [3],    "reorder", "low_stock",        False)
add("Wireless Mouse",        CA, 550,   24,  "increasing",     "none",    "Y", 7,  [1, 3], "near",    "rising_demand",   False)
add("Webcam 1080p",          CA, 2200,  7,   "increasing",     "none",    "Z", 10, [2],    "well",    "none",            False)
add("Laptop Stand",          CA, 900,   5,   "increasing",     "none",    "X", 7,  [3],    "normal",  "none",            False)
add("External HDD 1TB",      CA, 4800,  9,   "decreasing",     "none",    "Y", 9,  [2, 5], "normal",  "none",            False)
add("USB Flash Drive 64GB",  CA, 500,   10,  "decreasing",     "none",    "Z", 6,  [5],    "over",    "none",            False)
add("Laptop Backpack",       CA, 1300,  12,  "trend_seasonal", "college", "X", 8,  [4],    "near",    "rising_demand",   False)
add("Phone Charger 20W",     MA, 650,   70,  "stable",         "none",    "X", 5,  [1],    "well",    "none",            False)
add("Power Bank 10000mAh",   MA, 1100,  40,  "seasonal",       "festive", "Y", 7,  [1, 2], "reorder", "low_stock",        False)
add("Bluetooth Earbuds",     MA, 1500,  30,  "trend_seasonal", "festive", "Z", 10, [2],    "reorder", "rising_demand",   False)
add("Wired Earphones",       MA, 250,   25,  "decreasing",     "none",    "X", 6,  [5, 3], "over",    "none",            False)
add("Bluetooth Speaker",     MA, 2200,  8,   "seasonal",       "festive", "Y", 12, [2, 6], "near",    "late_supplier",   False)
add("Smartwatch",            MA, 3500,  12,  "seasonal",       "festive", "Z", 14, [6],    "reorder", "long_lead_time",  True)
add("Phone Case",            MA, 300,   14,  "seasonal",       "festive", "Z", 6,  [3],    "normal",  "none",            False)
add("Tempered Glass",        MA, 150,   25,  "stable",         "none",    "X", 4,  [3, 5], "reorder", "low_stock",       False)
add("Table Fan",             HA, 1400,  14,  "seasonal",       "summer",  "Y", 10, [7],    "near",    "late_supplier",   True)
add("Pedestal Fan",          HA, 3200,  14,  "seasonal",       "summer",  "Y", 12, [7, 3], "over",    "none",            False)
add("Air Cooler",            HA, 7500,  6,   "seasonal",       "summer",  "Z", 15, [7],    "over",    "none",            False)
add("Electric Kettle",       HA, 900,   9,   "stable",         "none",    "X", 7,  [4],    "near",    "low_stock",       False)
add("Steam Iron",            HA, 1100,  5,   "stable",         "none",    "X", 8,  [4, 5], "well",    "none",            False)
add("Mixer Grinder",         HA, 2800,  4,   "increasing",     "none",    "Z", 9,  [5],    "near",    "rising_demand",   False)
add("Notebook 200 Pages",    ST, 220,   55,  "seasonal",       "college", "X", 5,  [4],    "well",    "none",            False)
add("A4 Paper Ream",         ST, 380,   35,  "stable",         "none",    "X", 4,  [4],    "normal",  "none",            False)
add("Ball Pens Pack",        ST, 90,    40,  "decreasing",     "none",    "X", 4,  [4],    "normal",  "none",            False)
add("Highlighter Set",       ST, 160,   15,  "stable",         "none",    "Y", 5,  [4, 5], "well",    "none",            False)
add("Scientific Calculator", ST, 900,   10,  "seasonal",       "college", "Z", 8,  [3],    "well",    "none",            False)
add("Geometry Box",          ST, 180,   18,  "seasonal",       "college", "Z", 6,  [4],    "over",    "none",            False)
add("File Folders",          ST, 120,   20,  "stable",         "none",    "Z", 5,  [4],    "normal",  "none",            False)
add("Whiteboard Markers",    ST, 140,   16,  "decreasing",     "none",    "Y", 5,  [4, 5], "over",    "none",            False)
add("WiFi Router AC1200",    NW, 1800,  26,  "increasing",     "none",    "X", 9,  [1, 3], "near",    "rising_demand",   False)
add("Ethernet Cable 5m",     NW, 180,   22,  "stable",         "none",    "X", 5,  [3],    "well",    "none",            False)
add("WiFi Range Extender",   NW, 1500,  6,   "stable",         "none",    "Y", 10, [2, 6], "reorder", "late_supplier",   True)
add("USB WiFi Adapter",      NW, 550,   8,   "stable",         "none",    "Z", 7,  [8],    "normal",  "none",            False)
add("Network Switch 8-Port", NW, 1600,  5,   "increasing",     "none",    "Y", 11, [8],    "near",    "long_lead_time",  False)
add("Gaming Mouse",          GL, 1400,  9,   "increasing",     "none",    "Z", 10, [2],    "well",    "none",            False)
add("Gaming Headset",        GL, 2600,  17,  "trend_seasonal", "festive", "X", 12, [2, 8], "reorder", "long_lead_time",  False)
add("Mousepad XL",           GL, 450,   11,  "increasing",     "none",    "X", 6,  [3],    "normal",  "none",            False)
add("Game Controller",       GL, 2400,  3,   "trend_seasonal", "festive", "Z", 18, [6, 8], "reorder", "long_lead_time",  True)
add("LED Strip Lights",      GL, 700,   7,   "trend_seasonal", "festive", "Y", 15, [6],    "reorder", "long_lead_time",  False)
assert len(P) == 40
A_NAMES = {"External HDD 1TB", "Phone Charger 20W", "Power Bank 10000mAh", "Bluetooth Earbuds", "Smartwatch",
           "Pedestal Fan", "Air Cooler", "WiFi Router AC1200", "Gaming Headset"}
B_NAMES = {"Table Fan", "Bluetooth Speaker", "Webcam 1080p", "Laptop Backpack", "Mechanical Keyboard", "Gaming Mouse",
           "Wireless Mouse", "A4 Paper Ream", "Notebook 200 Pages", "Mixer Grinder", "WiFi Range Extender",
           "Scientific Calculator"}
def _factor(n):
    return 1.30 if n in A_NAMES else (0.88 if n in B_NAMES else 0.78)
P = [(a[0], a[1], int(round(a[2] * _factor(a[0]) / 5) * 5)) + tuple(a[3:]) for a in P]
MARGIN = {"Bluetooth Earbuds": -4.0, "Gaming Headset": 0.5, "Smartwatch": 1.5, "WiFi Range Extender": 1.0,
          "Tempered Glass": 0.5, "LED Strip Lights": 1.5}

OUT_OF_STOCK = {"Power Bank 10000mAh", "Game Controller"}
FIXED_STOCK = {"USB Hub 4-Port": 40, "Mechanical Keyboard": 45}
RETAIL_CATS = {CA, MA, HA, GL}

SEASON_RAW = {
    "festive": [0.85, 0.85, 0.85, 0.9, 0.9, 0.9, 0.9, 0.9, 1.0, 1.5, 1.55, 1.1],
    "college": [0.9, 0.9, 0.9, 0.9, 1.2, 1.55, 1.5, 1.2, 0.9, 0.9, 0.9, 0.85],
    "summer":  [0.5, 0.6, 1.2, 1.7, 1.8, 1.5, 0.9, 0.7, 0.6, 0.5, 0.45, 0.45],
}
NOISE_CV = {"X": 0.14, "Y": 0.42, "Z": 0.95}
NOISE_LABEL = {"X": "low", "Y": "medium", "Z": "high"}


def season_curve(kind, strength):
    if kind == "none":
        return np.ones(N_DAYS)
    raw = np.array(SEASON_RAW[kind])
    raw = 1 + strength * (raw - 1)
    raw = raw / raw.mean()
    return raw[MONTH - 1]


def trend_curve(arch, slope):
    # centred so the product's mean level equals its base demand
    return 1 + slope * (T_IDX / (N_DAYS - 1) - 0.5)


def promo_windows(n_events):
    """3-5 promo windows of 3-7 days, none in the last 30 days."""
    flag = np.zeros(N_DAYS)
    placed = 0
    tries = 0
    while placed < n_events and tries < 200:
        tries += 1
        length = int(rng.integers(3, 8))
        start = int(rng.integers(10, N_DAYS - 30 - length))
        lo, hi = max(0, start - 14), min(N_DAYS, start + length + 14)
        if flag[lo:hi].any():
            continue
        flag[start:start + length] = rng.uniform(0.4, 0.8)
        placed += 1
    return flag


# ----------------------------------------------------------------------------
# 1. Demand
# ----------------------------------------------------------------------------
products, demand, promo_flags, meta = [], {}, {}, {}
for i, (name, cat, price, base, arch, season, xyz, lt, sups, scen, driver, open_po) in enumerate(P, start=1):
    pid = f"P{i:03d}"
    if arch == "increasing":
        slope = rng.uniform(0.35, 0.80)
    elif arch == "decreasing":
        slope = -rng.uniform(0.30, 0.60)
    elif arch == "trend_seasonal":
        slope = rng.uniform(0.35, 0.55) * (-1 if name == "Game Controller" else 1)
    else:
        slope = 0.0
    strength = 1.0 if arch == "seasonal" else (0.6 if arch == "trend_seasonal" else 0.0)
    retail = cat in RETAIL_CATS
    wk = np.where(DOW >= 5, rng.uniform(1.10, 1.20), 1.0) if retail else np.where(DOW >= 5, 0.80, 1.0)
    promo = promo_windows(int(rng.integers(3, 6)))
    cv = NOISE_CV[xyz] * (0.8 if (xyz == "X" and arch in ("seasonal", "trend_seasonal")) else 1.0)
    noise = rng.gamma(1 / cv**2, cv**2, N_DAYS)
    mean = (base * trend_curve(arch, slope) * season_curve(season, strength) * wk * (1 + promo))
    d = np.rint(mean * noise).astype(int)
    d = np.maximum(d, 0)
    cost = round(price * rng.uniform(0.65, 0.80), 2)
    products.append(dict(product_id=pid, sku=f"SKU-{1000 + i}", name=name, category=cat,
                         price=price, cost=cost, lead_time_days=lt,
                         supplier_ids=",".join(f"S{s}" for s in sups)))
    demand[pid] = d
    promo_flags[pid] = (promo > 0).astype(int)
    meta[pid] = dict(archetype=arch, season=season, xyz_target=xyz, scenario=scen, driver=driver,
                     open_po=open_po, sups=sups, lt=lt, noise_level=NOISE_LABEL[xyz], slope=slope,
                     name=name, price=price, base=base,
                     ago=int(rng.integers(1, max(lt - 1, 2))))
prod_df = pd.DataFrame(products)

# ----------------------------------------------------------------------------
# 2. Anomalies in sales (spikes 3-5x, zero-sales while stock exists)
# ----------------------------------------------------------------------------
sales_anom = {pid: np.zeros(N_DAYS, dtype=int) for pid in demand}
for pid, d in demand.items():
    n_each = int(round(0.012 * N_DAYS))        # ~1.2% spikes + ~1.2% zero days
    cand = rng.choice(np.arange(20, N_DAYS - 15), size=2 * n_each, replace=False)
    for idx in cand[:n_each]:
        d[idx] = int(max(d[idx], 1) * rng.uniform(3, 5)) + 1
        sales_anom[pid][idx] = 1
    for idx in cand[n_each:]:
        d[idx] = 0
        sales_anom[pid][idx] = 1

# ----------------------------------------------------------------------------
# 3. Current stock targets from scenarios
#    effective lead time = lead time + supplier average delay;  SS = 1.65*sigma*sqrt(LT)
# ----------------------------------------------------------------------------
sup_avg_delay = {}
for s_idx, (_, profile, p_on, (lo, hi), _q) in enumerate(SUPPLIERS, start=1):
    sup_avg_delay[s_idx] = (1 - p_on) * (lo + hi) / 2 - (0.35 * 2.5 if profile == "erratic" else 0)


def recent_stats(d):
    mu = d[-28:].mean()
    sigma = d[-90:].std()
    return mu, sigma


target_stock, ratios = {}, {}
RATIO = {"reorder": (0.25, 0.75), "near": (1.05, 1.30), "normal": (1.7, 2.3), "well": (2.6, 3.8)}
for pid, m in meta.items():
    mu, sigma = recent_stats(demand[pid])
    eff_lt = m["lt"] + np.mean([sup_avg_delay[s] for s in m["sups"]])
    ltd = mu * eff_lt
    ss = 1.65 * sigma * np.sqrt(m["lt"])
    m.update(mu=mu, sigma=sigma, ltd=ltd, ss=ss, eff_lt=eff_lt)
    deliv = (m["lt"] - m["ago"]) if m["open_po"] else eff_lt
    if m["name"] in OUT_OF_STOCK:
        stock = 0
    elif m["name"] in FIXED_STOCK:
        stock = FIXED_STOCK[m["name"]]
    elif m["name"] in MARGIN:
        stock = int(mu * (deliv + MARGIN[m["name"]]))
    elif m["scenario"] == "over":
        stock = int(mu * rng.uniform(160, 260))
    else:
        r = rng.uniform(*RATIO[m["scenario"]])
        stock = int(r * (ltd + ss))
    target_stock[pid] = stock

# ----------------------------------------------------------------------------
# 4. Purchase orders (history built backwards from the current stock snapshot)
# ----------------------------------------------------------------------------
po_rows = []
for pid, m in meta.items():
    n_po = int(rng.integers(9, 12))
    cycle = (N_DAYS - 70) / n_po
    sup_choice = [int(rng.choice(m["sups"])) for _ in range(n_po)]
    m["po_plan"] = list(zip(range(n_po), sup_choice))

# quotas of delays per supplier so on-time rates match their target profile
by_sup = {s: [] for s in range(1, 9)}
for pid, m in meta.items():
    for k, s in m["po_plan"]:
        by_sup[s].append((pid, k))
delay_map = {}
for s, items in by_sup.items():
    _, profile, p_on, (lo, hi), _q = SUPPLIERS[s - 1]
    n = len(items)
    n_ok = int(round(p_on * n))
    delays = []
    for j in range(n):
        if j < n_ok:
            if profile == "erratic":
                delays.append(int(rng.choice([-4, -3, -2, -1, 0], p=[0.15, 0.25, 0.2, 0.2, 0.2])))
            else:
                delays.append(0)
        else:
            delays.append(int(rng.integers(lo, hi + 1)))
    delays = list(rng.permutation(delays))
    for (pid, k), dl in zip(items, delays):
        delay_map[(pid, k)] = int(dl)
# one extreme supplier delay (anomaly) on a poor supplier
extreme_key = next(key for key, _ in [(k, 0) for k in delay_map] if meta[key[0]]["sups"][0] == 6)
delay_map[extreme_key] = 17
extreme_po = extreme_key

stock_true = {}
for pid, m in meta.items():
    d = demand[pid]
    lt = m["lt"]
    n_po = len(m["po_plan"])
    cycle = (N_DAYS - 70) / n_po
    gap = int(rng.integers(30, 55))                 # last delivered receipt, days before today
    receipts = []                                   # (receipt_day_idx, supplier, delay, k)
    r = N_DAYS - 1 - gap
    for k in range(n_po - 1, -1, -1):
        sup = m["po_plan"][k][1]
        dl = delay_map[(pid, k)]
        if r < 8:
            break
        receipts.append((r, sup, dl, k))
        r = int(r - cycle * rng.uniform(0.88, 1.12))
    receipts = sorted(receipts)                     # ascending by receipt day
    rec_day = {x[0]: x for x in receipts}
    stock = np.zeros(N_DAYS)
    stock[-1] = target_stock[pid]
    qty = {}
    for t in range(N_DAYS - 1, 0, -1):
        if t in rec_day:
            b = rng.uniform(0.0, 0.15) * m["mu"] * (m["lt"] + 3)
            q = max(int(round(stock[t] + d[t] - b)), 1)
            qty[t] = q
            stock[t - 1] = stock[t] + d[t] - q
        else:
            stock[t - 1] = stock[t] + d[t]
    stock_true[pid] = np.maximum(stock, 0)
    for (rday, sup, dl, k) in receipts:
        order_idx = rday - (lt + dl)
        po_rows.append(dict(
            product_id=pid, supplier_id=f"S{sup}",
            order_date=DATES[max(order_idx, 0)].date(),
            expected_delivery_date=DATES[max(order_idx, 0)].date() + timedelta(days=lt),
            actual_delivery_date=DATES[rday].date(), delay_days=dl,
            qty_ordered=qty[rday], qty_received=qty[rday],
            unit_cost=float(prod_df.loc[prod_df.product_id == pid, "cost"].iloc[0]),
            quality_issue=int(rng.random() < SUPPLIERS[sup - 1][4]),
            status="Delivered", is_anomaly=int((pid, k) == extreme_po)))
    # open (in-transit) PO for flagged products
    if m["open_po"]:
        ago = m["ago"]
        o_idx = N_DAYS - 1 - ago
        sup = m["sups"][0]
        po_rows.append(dict(
            product_id=pid, supplier_id=f"S{sup}", order_date=DATES[o_idx].date(),
            expected_delivery_date=DATES[o_idx].date() + timedelta(days=lt),
            actual_delivery_date=None, delay_days=None,
            qty_ordered=int(m["mu"] * 45), qty_received=0,
            unit_cost=float(prod_df.loc[prod_df.product_id == pid, "cost"].iloc[0]),
            quality_issue=0, status="In Transit", is_anomaly=0))

po_df = pd.DataFrame(po_rows).sort_values(["order_date", "product_id"]).reset_index(drop=True)
for sid, g in po_df[po_df.status == "Delivered"].groupby("supplier_id"):
    rate = SUPPLIERS[int(sid[1:]) - 1][4]
    n_q = int(round(rate * len(g)))
    po_df.loc[g.index, "quality_issue"] = 0
    po_df.loc[rng.choice(g.index.values, size=n_q, replace=False), "quality_issue"] = 1
po_df["delay_days"] = po_df["delay_days"].astype("Int64")
po_df.insert(0, "po_id", [f"PO-{i:04d}" for i in range(1, len(po_df) + 1)])

# ----------------------------------------------------------------------------
# 5. Stock history (recorded counts, with stock-mismatch anomalies)
# ----------------------------------------------------------------------------
sh_rows, sales_rows = [], []
for pid in meta:
    rec = stock_true[pid].copy()
    anom = np.zeros(N_DAYS, dtype=int)
    n_mis = int(round(0.01 * N_DAYS))
    for idx in rng.choice(np.arange(20, N_DAYS - 15), size=n_mis, replace=False):
        rec[idx] = max(0, int(rec[idx] * rng.choice([rng.uniform(0.4, 0.7), rng.uniform(1.3, 1.6)])))
        anom[idx] = 1
    sh_rows.append(pd.DataFrame(dict(date=DATES.date, product_id=pid,
                                     stock_on_hand=rec.astype(int), is_anomaly=anom)))
    price = meta[pid]["price"]
    sales_rows.append(pd.DataFrame(dict(
        date=DATES.date, product_id=pid, units_sold=demand[pid],
        unit_price=price, revenue=demand[pid] * price,
        promo_flag=promo_flags[pid], is_anomaly=sales_anom[pid])))
stock_df = pd.concat(sh_rows, ignore_index=True)
sales_df = pd.concat(sales_rows, ignore_index=True)

snap_rows = []
open_qty = po_df[po_df.status == "In Transit"].groupby("product_id").qty_ordered.sum().to_dict()
for pid in meta:
    snap_rows.append(dict(product_id=pid, snapshot_date=END_DATE,
                          current_stock=int(stock_true[pid][-1]),
                          in_transit_qty=int(open_qty.get(pid, 0))))
snap_df = pd.DataFrame(snap_rows)

sup_df = pd.DataFrame([dict(supplier_id=f"S{i}", name=s[0], contact_email=f"sales@{s[0].lower().replace(' ', '').replace('&','')}.in",
                            city=c) for i, (s, c) in enumerate(zip(SUPPLIERS, ["Bengaluru", "Chennai", "Mumbai", "Delhi", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"]), start=1)])

# ----------------------------------------------------------------------------
# 6. Scenario labels (ground truth, validation only)
# ----------------------------------------------------------------------------
tot_rev = sales_df.groupby("product_id").revenue.sum().sort_values(ascending=False)
share = tot_rev / tot_rev.sum()
cum_before = share.cumsum() - share
abc = pd.Series(np.where(cum_before < 0.70, "A", np.where(cum_before < 0.90, "B", "C")), index=share.index)
cvs = sales_df.groupby("product_id").units_sold.agg(lambda s: s.std() / s.mean())
xyz = pd.Series(np.where(cvs < 0.5, "X", np.where(cvs <= 1.0, "Y", "Z")), index=cvs.index)

# provisional rules (final versions are built on Days 8-9)
def prov_alert(pid):
    m = meta[pid]
    stock = stock_true[pid][-1]
    doc = stock / max(m["mu"], 0.1)                 # days of cover
    if pid in open_qty:
        deliv = (po_df[(po_df.product_id == pid) & (po_df.status == "In Transit")]
                 .expected_delivery_date.iloc[0] - END_DATE).days
    else:
        deliv = m["eff_lt"]
    margin = doc - deliv
    return doc, deliv, margin

def prov_health(pid):
    m = meta[pid]
    stock = stock_true[pid][-1]
    r = stock / max(m["ltd"] + m["ss"], 1e-6)
    doc = stock / max(m["mu"], 0.1)
    cover = np.interp(r, [0, 1, 2], [0, 30, 100]) if r <= 2 else 100
    if doc > 90:
        cover = np.interp(doc, [90, 250], [100, 35])
    sup_score = 100 * np.mean([SUPPLIERS[s - 1][2] for s in m["sups"]])
    turnover = np.clip(100 * (365 / max(doc, 1)) / 12, 0, 100)
    vol = 100 * (1 - min(cvs[pid], 1.5) / 1.5)
    return 0.65 * cover + 0.15 * sup_score + 0.10 * turnover + 0.10 * vol

lab = []
for pid, m in meta.items():
    doc, deliv, margin = prov_alert(pid)
    h = prov_health(pid)
    status = "Critical" if h < 40 else ("Warning" if h < 70 else "Healthy")
    if margin < 0:
        pri = "Critical"
    elif margin < 5:
        pri = "High"
    elif margin < 15:
        pri = "Medium"
    else:
        pri = "Low"
    lab.append(dict(product_id=pid, name=m["name"], archetype=m["archetype"], seasonality=m["season"],
                    noise_level=m["noise_level"], xyz_target=m["xyz_target"], abc_actual=abc[pid],
                    xyz_actual=xyz[pid], stock_scenario=m["scenario"], xai_driver=m["driver"],
                    supplier_ids=",".join(f"S{s}" for s in m["sups"]), days_of_cover=round(doc, 1),
                    expected_delivery_days=round(deliv, 1), cover_margin_days=round(margin, 1),
                    expected_alert=pri, health_score=round(h, 1), expected_status=status,
                    stockout_before_delivery=int(margin < 0),
                    stock_ratio=round(stock_true[pid][-1] / max(m["ltd"] + m["ss"], 1e-6), 2)))
lab_df = pd.DataFrame(lab)

# ----------------------------------------------------------------------------
# 7. Write files
# ----------------------------------------------------------------------------
prod_df.to_csv(f"{OUT}/products.csv", index=False)
sup_df.to_csv(f"{OUT}/suppliers.csv", index=False)
sales_df.to_csv(f"{OUT}/sales.csv", index=False)
snap_df.to_csv(f"{OUT}/inventory_snapshot.csv", index=False)
stock_df.to_csv(f"{OUT}/stock_history.csv", index=False)
po_df.to_csv(f"{OUT}/purchase_orders.csv", index=False)
lab_df.to_csv(f"{OUT}/scenario_labels.csv", index=False)
print(f"products={len(prod_df)} suppliers={len(sup_df)} sales={len(sales_df)} "
      f"stock_history={len(stock_df)} purchase_orders={len(po_df)}")
print("Files written to", OUT)