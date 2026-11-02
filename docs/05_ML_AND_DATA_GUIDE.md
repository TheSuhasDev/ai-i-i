# 05. Beginner's Guide to Machine Learning & Data Science

Welcome to the beginner-friendly Data Science guide for **AI-Powered Inventory & Supply Chain Intelligence**.

If you are a web developer who knows JavaScript, Node.js, and MongoDB, but gets intimidated by terms like *Gradient Boosting*, *Isolation Forests*, or *Platt Calibration*, this guide was written for you. No prior knowledge of mathematics or machine learning is required.

---

## 1. Machine Learning Concepts Explained from Zero

Every concept below follows the exact 5-part teaching template:
- **(a) What it is in one line**
- **(b) A real-life analogy**
- **(c) Why we use it here**
- **(d) How it is done in our code, step by step**
- **(e) A tiny example with numbers**

---

### Concept 1: Demand Forecasting (HistGradientBoostingRegressor)

#### (a) What it is in one line
Using past sales patterns and calendar facts to predict the exact number of units customers will buy in future weeks.

#### (b) A real-life analogy
Imagine a baker predicting how many croissants to bake next Saturday. The baker looks at how many sold on previous Saturdays, whether next weekend is a festival, and whether the bakery is running a 20% discount. The baker combines these clues to make an educated guess.

#### (c) Why we use it here
Traditional software assumes next week's sales will equal last week's sales. But if next week is Diwali or a holiday weekend, that naive assumption fails. Machine learning detects seasonal cycles and promotional uplifts automatically.

#### (d) How it is done in our code, step by step
1. In `ml-service/app/preprocessing.py`, we convert daily sales into weekly totals (Monday to Sunday).
2. In `ml-service/app/forecasting.py::make_origin_table()`, we compute the recent sales level (the average of the last 8 weeks, called `scale`).
3. Instead of predicting raw units directly, our model predicts a **scale-free ratio**:
   $$\text{Target Ratio} = \frac{\text{Future Week Units}}{\text{Mean of Last 8 Weeks}}$$
   This clever trick allows **a single model** to forecast both high-volume items (selling 500 units/week) and low-volume items (selling 10 units/week).
4. In `ml-service/app/train_forecast.py`, we train a `HistGradientBoostingRegressor` (decision trees that learn from previous tree errors).
5. During live inference in `forecast_product()`, we multiply the predicted ratio back by the product's recent 8-week average to obtain the real unit forecast.

#### (e) A tiny example with numbers
- Product P001 sells an average of **50 units/week** over the last 8 weeks (`scale = 50`).
- Next week is a 2-day promotional discount. The model predicts a ratio of `1.20` (meaning 20% higher than average).
- Predicted forecast: $50 \times 1.20 = \mathbf{60\text{ units}}$.

---

### Concept 2: 80% Prediction Intervals (Residual Quantiles)

#### (a) What it is in one line
A realistic range (Low and High) showing where sales are 80% likely to land, acknowledging that no forecast is ever 100% perfect.

#### (b) A real-life analogy
A weather forecaster saying: *"Tomorrow's temperature will be 24°C, but there is an 80% chance it stays between 21°C and 27°C."*

#### (c) Why we use it here
If you only look at an average point forecast (e.g. 50 units), you might get caught off guard by an unusually busy week. The high bound lets managers plan for worst-case surges.

#### (d) How it is done in our code, step by step
1. During training, we compare model predictions against actual historical sales on a validation fold.
2. We calculate the errors (called **residuals**): $\text{error} = \text{actual} - \text{predicted}$.
3. We find the 10th percentile ($q_{10}$) and 90th percentile ($q_{90}$) of these errors.
4. During live forecasting, the lower bound is $\text{forecast} + q_{10}$ and the upper bound is $\text{forecast} + q_{90}$.
5. This guarantees that 80% of actual sales fall within this band.

#### (e) A tiny example with numbers
- Point forecast = **60 units**.
- On past validation data, the 10% worst underestimates were $-8$ units, and the 10% worst overestimates were $+12$ units.
- Low bound: $60 - 8 = \mathbf{52\text{ units}}$.
- High bound: $60 + 12 = \mathbf{72\text{ units}}$.
- The manager knows sales will almost certainly fall between 52 and 72 units.

---

### Concept 3: Stockout Risk Classification (Random Forest & Platt Scaling)

#### (a) What it is in one line
Predicting the probability (0% to 100%) that a product will run completely out of stock before a replacement order arrives from the supplier.

#### (b) A real-life analogy
A car's fuel gauge and distance-to-empty display. It calculates your current fuel, your recent driving speed, and the distance to the next gas station, alerting you if the odds of running out of fuel exceed safe limits.

#### (c) Why we use it here
Simply looking at "units on hand" is deceptive. Having 15 units is plenty for an item selling 1 per week, but disastrous for an item selling 10 per day whose supplier takes 5 days to deliver.

#### (d) How it is done in our code, step by step
1. In `ml-service/app/risk.py::stockout_labels()`, we define a historical stockout day as:
   $$\text{stock}[t] < \text{lead\_time\_demand}(t+1 \dots t+L) + \text{safety\_stock}$$
2. We extract 11 features known as of day $t$ (days of cover, stock ratio, demand momentum, supplier on-time rate).
3. We train a `RandomForestClassifier` (a voting committee of 300 decision trees).
4. Because raw Random Forest votes can bunch up near 0 or 1, we pass the score through **Platt Calibration** (a simple logistic regression model fitted on validation data) so that a score of 70% truly means 7 out of 10 similar historical situations ran out of stock.

#### (e) A tiny example with numbers
- Product P010 has 10 units in stock.
- Over the 7-day supplier lead time, expected demand is 14 units.
- The classifier sees `stock_ratio = 10 / 14 = 0.71` (less than 1).
- The calibrated classifier outputs: $\mathbf{88.4\%}\text{ risk of stockout}$ (High Risk).

---

### Concept 4: Explainable AI (SHAP TreeExplainer)

#### (a) What it is in one line
An algorithm that breaks down a complex machine learning prediction into individual positive and negative reasons in plain English.

#### (b) A real-life analogy
A bank loan officer explaining why a mortgage application was rejected: *"Your income was good (+20 points), but your credit card debt was high (-45 points) and your job tenure was short (-15 points)."*

#### (c) Why we use it here
If an algorithm marks a product as "85% Critical Stockout Risk", a warehouse manager will not trust it unless the software explains *why*.

#### (d) How it is done in our code, step by step
1. In `ml-service/app/explain.py`, we initialize `shap.TreeExplainer` on the trained Random Forest.
2. SHAP uses cooperative game theory to measure how much each feature pushed the risk prediction away from the baseline average.
3. We sum the 11 mathematical features into 6 plain-language factor groups: Stock Level, Demand Trend, Volatility, Lead Time, Supplier Reliability, and Time of Year.
4. We verify the **additivity property**:
   $$\text{Base Value} + \sum \text{SHAP Contributions} = \text{Model Output}$$
5. We format the largest drivers into human-readable sentences in `_reason()`.

#### (e) A tiny example with numbers
- Base average risk across all products = **15%**.
- For Product P001:
  - Low stock pushes risk up: **+45%**
  - Supplier delays push risk up: **+18%**
  - Stable demand pulls risk down: **-4%**
- Total Raw Risk: $15 + 45 + 18 - 4 = \mathbf{74\%}$.
- The UI displays: *"Main reason: Current stock is low (1.8 days of cover against a 7-day lead time)."*

---

### Concept 5: Unsupervised Anomaly Detection (Isolation Forest)

#### (a) What it is in one line
Detecting unusual sales spikes or human bookkeeping mistakes without needing anyone to manually label them beforehand.

#### (b) A real-life analogy
Airport security metal detectors. The detector doesn't need to know what every specific banned object looks like; it just flags anything that looks drastically different from normal passengers.

#### (c) Why we use it here
If a warehouse worker types "500" instead of "50" into the inventory ledger, or if an e-commerce bot buys 100 units in one hour, our forecasting models will get distorted unless we identify the blip.

#### (d) How it is done in our code, step by step
1. In `ml-service/app/anomaly.py`, we construct scale-free behavioral features:
   - `sales_ratio`: $\text{units} / \text{mean}_{28d}$
   - `sales_z`: Number of standard deviations away from normal (z-score)
   - `stock_blip`: Daily inventory residual:
     $$e_t = \text{stock}[t-1] - \text{stock}[t] - \text{sales}[t]$$
     A counting mistake creates an error that reverses the next day; a real restock does not reverse!
2. We fit an `IsolationForest` (300 random partitioning trees). Anomalies are isolated in very few splits because they are rare and extreme.
3. Data points receiving anomaly scores above the contamination threshold are flagged.

#### (e) A tiny example with numbers
- A product normally sells **10 units/day** ($\sigma = 2$).
- On Tuesday, **48 units** are logged (`sales_ratio = 4.8`, `z-score = +19.0`).
- The Isolation Forest isolates this row in just 2 random decision splits.
- Flagged as: `sales_spike` ("48 units sold, 4.8x the usual 10 a day").

---

### Concept 6: Year-over-Year Trend & Seasonality Detection

#### (a) What it is in one line
Determining whether customer demand is genuinely growing year-over-year, or simply experiencing an annual holiday surge.

#### (b) A real-life analogy
Selling warm winter coats. Coat sales always jump in December. If you compare December with November, you might think the business is booming 300%. But if you compare December this year with December last year, you find sales are flat.

#### (c) Why we use it here
A naive linear slope gets easily fooled by seasonal peaks. We must separate true long-term business growth from predictable annual seasonality.

#### (d) How it is done in our code, step by step
1. In `ml-service/app/trend.py`, we analyze 104 weeks (two full 52-week years).
2. **Trend:** We compute the 52-week difference ($y_{\text{this year}} - y_{\text{last year}}$). Comparing each week to the exact same week last year completely eliminates seasonal bias! We test if the change is statistically significant ($|z| \ge 2.0$ and $|\text{YoY}| \ge 15\%$).
3. **Seasonality:** We detrend the series by subtracting the linear slope, then compute the Pearson correlation coefficient ($r$) between this year and last year. If $r \ge 0.30$ and $p < 0.05$, the pattern repeats predictably every year.

#### (e) A tiny example with numbers
- Year 1 average sales = **100 units/week**.
- Year 2 average sales = **145 units/week**.
- Year-over-Year change: $\frac{145 - 100}{100} = \mathbf{+45\%}$.
- Calculated $z$-score = **+4.2** (far above threshold 2.0).
- Trend classification: **"increasing"**.

---

## 2. Synthetic Dataset Architecture & Planted Patterns

Because real commercial supply chain data is proprietary, this project features a high-fidelity synthetic data generator in `ml-service/data/generate_data.py` (fixed random seed `42`).

### 2.1. The 7 Generated Datasets

```
ml-service/data/
├── products.csv            # 40 products across 6 retail categories
├── suppliers.csv           # 8 suppliers with distinct lead times and delays
├── sales.csv               # 29,200 daily sales transactions (40 SKUs x 730 days)
├── stock_history.csv       # 29,200 daily inventory snapshots
├── inventory_snapshot.csv  # Current stock on hand for each product
├── purchase_orders.csv     # 398 procurement orders with delivery timestamps
└── scenario_labels.csv     # Ground-truth labels (used ONLY for test verification)
```

### 2.2. Mathematical Formula for Synthetic Demand
Daily sales units for each product are generated using a multi-factor multiplicative formula:
$$\text{Daily Units} = \text{Base} \times \text{Trend}(t) \times \text{Seasonality}(t) \times \text{Weekday}(t) \times \text{Promo}(t) \times \text{Noise}$$

- **Base Demand:** Constant baseline between 5 and 50 units/day.
- **Trend:** Linear ramp multiplying base demand by 0.7x to 1.5x over 2 years.
- **Seasonality:** Harmonic sine wave with peaks in winter (December) or summer (July).
- **Weekday Multiplier:** 1.25x surge on Saturdays and Sundays; 0.85x on Tuesdays.
- **Promo Uplift:** 1.5x to 2.5x spike on randomly scheduled promotional days.
- **Noise:** Gamma distribution ($\alpha, \beta$) simulating natural retail variance.

### 2.3. Planted Patterns & What Feature Each Proves

| Planted Scenario | SKUs Involved | What Happens in the Data | Which Feature Proves It |
|---|---|---|---|
| **Critical Stockout Risk** | P001, P010, P016, P039 | Current stock is set far below lead-time demand; POs are delayed. | **Alerts & Smart Reorder:** Flags Critical priority, negative margin days, and recommends immediate reorder. |
| **Severe Overstocking** | P004, P008, P022 | Warehouse holds 150 to 220 days of stock cover. | **Inventory Health Score:** Cover score drops from 100 to 45; emits "Overstock" alert. |
| **Unreliable Vendor** | S6 (QuickShip), S7, S8 | Average delivery delay is 4–7 days with 15% defective items. | **Supplier Risk:** Scores drop below 50 (High Risk); Smart Reorder inflates safety buffers by 1.5x. |
| **Clean Sales Spike** | P002 (Day 412), P015 | A sudden 4.2x demand surge occurs on a single day. | **Isolation Forest:** Flagged in `/anomalies` as `sales_spike`. |
| **Stock Count Blip** | P007 (Day 510) | Physical stock recorded drops by 40 units and rebounds the next day. | **Isolation Forest:** Flagged as `stock_mismatch` (counting error). |
| **Extreme Vendor Delay** | PO-0284 (Supplier S7) | A shipment arrives 17 days after promised delivery date. | **Anomaly Rule:** Flagged as `supplier_delay` ($15+$ days). |
| **Annual Seasonality** | P017, P018 (Desk Fans) | Summer peak with 70% sales uplift in June/July. | **Trend & Seasonality:** Detects lag-52 autocorrelation ($r = 0.62$, Peak: Jul). |

---

## 3. Model Training, Validation & Holdout Accuracy

### 3.1. Strict Time-Based Splitting (No Data Leaks)
We **never** use random train/test splits. Shuffling time-series data allows models to "cheat" by using future sales to predict past sales.
- **Training Set:** First 548 days (Year 1 up to April 13, 2026).
- **Test Set (Held-Out):** Last 182 days (6 months of unseen future data).

### 3.2. Holdout Performance Scorecard

| Model | Target Metric | Simple Baseline (4-Week MA) | Our Machine Learning Model | Improvement |
|---|---|---|---|---|
| **Forecasting (h=1 week)** | WAPE (Weighted Error) | 18.38% | **16.33%** (HistGradientBoosting) | **+11.1% more accurate** |
| **Forecasting (h=2 weeks)** | WAPE | 19.03% | **16.99%** | **+10.7% more accurate** |
| **Forecasting (h=3 weeks)** | WAPE | 19.52% | **17.46%** | **+10.6% more accurate** |
| **Stockout Classifier** | F1-Score | 0.72 (Stock Ratio Rule) | **0.86** (Random Forest) | **+19.4% better F1** |
| **Anomaly Detection** | ROC-AUC | 0.50 (Random Guess) | **0.89** (Isolation Forest) | **High discrimination** |

---

## 4. Comprehensive Inventory & Data Science Glossary

| Term | Simple Definition | Practical Example |
|---|---|---|
| **Lead Time (LT)** | The number of days between placing an order with a supplier and the shipment arriving at your warehouse. | If you order on Monday and goods arrive next Monday, lead time is 7 days. |
| **Safety Stock (SS)** | The emergency cushion of inventory held to protect against unexpected sales surges or late deliveries. | Holding 15 extra units in case a snowstorm delays delivery trucks. |
| **Reorder Point (ROP)** | The threshold level of inventory that triggers a new purchase order. | *"When inventory drops to 50 units, order more immediately."* |
| **Days of Cover** | How many days current inventory will last if customer demand continues at the projected rate. | Having 100 units when selling 10/day equals 10 days of cover. |
| **Replenishment Margin** | Days of stock cover minus days until replacement shipment arrives. | If stock lasts 4 days but the order arrives in 6 days, margin is -2 days (stockout!). |
| **MAE (Mean Absolute Error)** | The average size of prediction mistakes, measured in real units. | An MAE of 5.0 means forecasts are off by an average of 5 units. |
| **RMSE (Root Mean Squared Error)** | Error metric that heavily penalizes large blunders. | Useful when underestimating by 50 units is far worse than underestimating by 5 units ten times. |
| **MAPE (Mean Absolute % Error)** | The average percentage mistake relative to actual sales. | A MAPE of 16% means predictions are on average within 84% of actual sales. |
| **WAPE (Weighted Absolute % Error)** | Percentage error weighted by sales volume. | Gives more importance to mistakes on bestsellers than slow-moving accessories. |
| **Z-Score** | How many standard deviations a value is away from the average. | A z-score of +3.0 indicates an extreme spike that occurs less than 0.3% of the time. |
| **Coefficient of Variation (CV)** | Volatility ratio ($\sigma / \mu$) measuring demand unpredictability. | A steady product has CV = 0.15; an erratic product has CV = 0.85. |
| **Platt Scaling** | Fitting a logistic regression curve on raw model outputs to transform them into true probabilities. | Turns raw decision tree votes into an accurate percentage chance of stockout. |
| **SHAP Value** | The exact positive or negative contribution a specific feature made to a model's prediction. | Proves that "low stock" contributed +42% to a stockout alert. |
| **Isolation Forest** | Tree-based unsupervised anomaly detection algorithm that isolates rare data points quickly. | Flags count errors and fake promotional spikes without manual supervision. |
