import docx
from docx.shared import Pt, RGBColor
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import json

def format_cell(cell, fill_hex, top_mar=100, bottom_mar=100, left_mar=140, right_mar=140):
    tcPr = cell._tc.get_or_add_tcPr()
    for ch in list(tcPr):
        if ch.tag.endswith('shd') or ch.tag.endswith('tcMar'):
            tcPr.remove(ch)
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top_mar}" w:type="dxa"/><w:bottom w:w="{bottom_mar}" w:type="dxa"/><w:left w:w="{left_mar}" w:type="dxa"/><w:right w:w="{right_mar}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        f'<w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        f'<w:insideV w:val="none"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def main():
    with open('ml-service/models/forecast_metrics.json') as f:
        f_metrics = json.load(f)
    with open('ml-service/models/risk_metrics.json') as f:
        r_metrics = json.load(f)

    # Load fresh original document
    doc = docx.Document('AI_Inventory_Intelligence_Project_Report.docx')

    # ==========================================
    # 1. Update Paragraph P39 (Four weeks ahead)
    # ==========================================
    for p in doc.paragraphs:
        if 'Description: Generates forward-looking demand forecasts across one, two, three, and four weeks ahead' in p.text:
            p.text = 'Description: Generates forward-looking demand forecasts across one, two, and three weeks ahead, flanked by empirical 80% prediction confidence intervals.'
            p.runs[0].font.name = 'Calibri'
            p.runs[0].font.size = Pt(10.5)
            p.runs[0].font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # ==========================================
    # 2. Update Section 5.1 (Demand Forecasting)
    # ==========================================
    # P174: Target horizons
    for p in doc.paragraphs:
        if 'a) Business Goal & Prediction Target:' in p.text and 'one, two, three, and four weeks ahead' in p.text:
            p.clear()
            r0 = p.add_run('a) Business Goal & Prediction Target:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(' Predict weekly customer unit demand for each product across horizons of one, two, and three weeks ahead (')
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            r2 = p.add_run('h ∈ {1, 2, 3}')
            r2.bold = True
            r2.font.name = 'Cambria Math'
            r2.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
            r3 = p.add_run('). Target is scale-normalized demand ratio y_{ratio}(t+h) = Units_{t+h} / Scale_t.')
            r3.font.name = 'Calibri'
            r3.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P180: Multi-horizon setup & validation selection
    for p in doc.paragraphs:
        if 'g) Training Approach & Multi-Horizon Setup:' in p.text:
            p.clear()
            r0 = p.add_run('g) Training Approach & Multi-Horizon Setup:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(
                f' Separate HistGradientBoostingRegressor models are trained for each horizon h ∈ {{1, 2, 3}}. '
                f'On a {f_metrics.get("validation_weeks", 13)}-week time-based validation fold, HistGradientBoostingRegressor achieved lower Weighted Absolute Percentage Error (WAPE) '
                f'than RandomForestRegressor across all horizons: h=1 ({f_metrics["results"]["1"]["validation_wape"]["hgb"]:.2f}% vs {f_metrics["results"]["1"]["validation_wape"]["rf"]:.2f}%), '
                f'h=2 ({f_metrics["results"]["2"]["validation_wape"]["hgb"]:.2f}% vs {f_metrics["results"]["2"]["validation_wape"]["rf"]:.2f}%), and '
                f'h=3 ({f_metrics["results"]["3"]["validation_wape"]["hgb"]:.2f}% vs {f_metrics["results"]["3"]["validation_wape"]["rf"]:.2f}%), '
                'selecting gradient boosting as the production model for every horizon. Sample weights scale proportionately with sales volume.'
            )
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P183: Baselines & Forecast Results Table
    p183 = None
    for p in doc.paragraphs:
        if 'i) Baselines Compared Against:' in p.text and 'Naive Last-Week' in p.text:
            p183 = p
            break

    if p183 is not None:
        p183.clear()
        r0 = p183.add_run('i) Baselines Compared Against & Test Performance:')
        r0.bold = True
        r0.font.name = 'Calibri'
        r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        r1 = p183.add_run(
            ' Benchmarked against two baselines: Naive Last-Week (repeating the most recent known week) and 4-Week Moving Average. '
            f'The gradient booster achieves superior accuracy across all three prediction horizons on the {f_metrics["results"]["1"]["test"]["model"]["n"]:,} held-out test rows per horizon:'
        )
        r1.font.name = 'Calibri'
        r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

        # Create forecast results table
        f_tbl = doc.add_table(rows=4, cols=8)
        set_table_borders(f_tbl)
        headers = ['Horizon', 'Selected Model', 'Model WAPE', '4-Wk MA WAPE', 'Naive WAPE', 'WAPE Gain', 'MAE / RMSE', '80% Interval Coverage']
        for col_idx, h_text in enumerate(headers):
            cell = f_tbl.cell(0, col_idx)
            format_cell(cell, '1E3A8A', top_mar=120, bottom_mar=120)
            cp = cell.paragraphs[0]
            cr = cp.add_run(h_text)
            cr.bold = True
            cr.font.name = 'Calibri'
            cr.font.size = Pt(8.5)
            cr.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

        row_data = [
            (
                'Week 1 (h=1)',
                'HistGradBoost',
                f'{f_metrics["results"]["1"]["test"]["model"]["wape"]:.2f}%',
                f'{f_metrics["results"]["1"]["test"]["ma4"]["wape"]:.2f}%',
                f'{f_metrics["results"]["1"]["test"]["naive"]["wape"]:.2f}%',
                f'+{f_metrics["results"]["1"]["wape_gain_vs_ma4_pct"]:.1f}%',
                f'{f_metrics["results"]["1"]["test"]["model"]["mae"]:.2f} / {f_metrics["results"]["1"]["test"]["model"]["rmse"]:.2f}',
                f'{f_metrics["results"]["1"]["interval_80_coverage_pct"]:.1f}%'
            ),
            (
                'Week 2 (h=2)',
                'HistGradBoost',
                f'{f_metrics["results"]["2"]["test"]["model"]["wape"]:.2f}%',
                f'{f_metrics["results"]["2"]["test"]["ma4"]["wape"]:.2f}%',
                f'{f_metrics["results"]["2"]["test"]["naive"]["wape"]:.2f}%',
                f'+{f_metrics["results"]["2"]["wape_gain_vs_ma4_pct"]:.1f}%',
                f'{f_metrics["results"]["2"]["test"]["model"]["mae"]:.2f} / {f_metrics["results"]["2"]["test"]["model"]["rmse"]:.2f}',
                f'{f_metrics["results"]["2"]["interval_80_coverage_pct"]:.1f}%'
            ),
            (
                'Week 3 (h=3)',
                'HistGradBoost',
                f'{f_metrics["results"]["3"]["test"]["model"]["wape"]:.2f}%',
                f'{f_metrics["results"]["3"]["test"]["ma4"]["wape"]:.2f}%',
                f'{f_metrics["results"]["3"]["test"]["naive"]["wape"]:.2f}%',
                f'+{f_metrics["results"]["3"]["wape_gain_vs_ma4_pct"]:.1f}%',
                f'{f_metrics["results"]["3"]["test"]["model"]["mae"]:.2f} / {f_metrics["results"]["3"]["test"]["model"]["rmse"]:.2f}',
                f'{f_metrics["results"]["3"]["interval_80_coverage_pct"]:.1f}%'
            ),
        ]

        for r_idx, r_vals in enumerate(row_data, start=1):
            fill = 'F8FAFC' if r_idx % 2 == 1 else 'FFFFFF'
            for c_idx, val in enumerate(r_vals):
                cell = f_tbl.cell(r_idx, c_idx)
                format_cell(cell, fill, top_mar=100, bottom_mar=100)
                cp = cell.paragraphs[0]
                cr = cp.add_run(val)
                cr.font.name = 'Calibri'
                cr.font.size = Pt(8.5)
                cr.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
                if c_idx in [0, 2, 5]:
                    cr.bold = True

        p183._p.addnext(f_tbl._tbl)

    # ==========================================
    # 3. Update Section 5.2 (Stockout Risk)
    # ==========================================
    # P188 (c)
    for p in doc.paragraphs:
        if 'c) Algorithms Used & Selection Rationale:' in p.text and 'Tree ensembles capture complex interactions' in p.text:
            p.clear()
            r0 = p.add_run('c) Algorithms Considered & Selection Rationale:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(
                f' Both RandomForestClassifier and a regularized Logistic Regression pipeline (StandardScaler paired with LogisticRegression, class_weight="balanced") '
                f'were trained and evaluated on a {r_metrics.get("validation_days", 60)}-day time-based validation split. '
                f'Logistic Regression was selected for deployment because it achieved superior Area Under the Precision-Recall Curve '
                f'(PR-AUC of {r_metrics["validation_pr_auc"]["logreg"]:.4f} vs {r_metrics["validation_pr_auc"]["rf"]:.4f} for Random Forest). '
                'Probability calibration is performed via custom Platt scaling, where a secondary logistic regression is fit directly on the logit (log-odds) '
                'of the base classifier\'s predictions over the validation fold (CalibratedClassifierCV is not used).'
            )
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P189 (d)
    for p in doc.paragraphs:
        if 'd) How It Works in Simple Words:' in p.text and 'An ensemble of decision trees votes' in p.text:
            p.clear()
            r0 = p.add_run('d) How It Works in Simple Words:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(
                ' The pipeline first standardizes eleven operational inventory signals (such as stock ratio, days of cover, demand volatility, and vendor delay history) '
                'into standard scores. Each standardized signal is multiplied by its learned regression weight and summed with the baseline intercept to produce an uncalibrated log-odds score. '
                'A fitted Platt sigmoid calibration function then transforms this score into a true empirical probability, ensuring that an SKU assigned an 80% risk score actually experiences a stockout 8 out of 10 times in reality.'
            )
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P192 (g)
    for p in doc.paragraphs:
        if 'g) Training Approach & Calibration:' in p.text and 'Classifiers are trained on time splits' in p.text:
            p.clear()
            r0 = p.add_run('g) Training Approach & Calibration:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(
                f' Classifiers are trained using a historical time-based split (split date: {r_metrics.get("split_date", "2026-05-05")}). '
                f'Features are standardized using StandardScaler and balanced with inverse class weights (training positive rate: {r_metrics.get("train_positive_rate", 0.1708)*100:.2f}%). '
                f'To transform raw classifier outputs into true probabilities, custom Platt scaling fits parameters A and B via logistic regression on the base model log-odds score f(x) over the {r_metrics.get("validation_days", 60)}-day validation fold:'
            )
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P196 (i) & Risk Results Table
    p196 = None
    for p in doc.paragraphs:
        if 'i) Baselines Compared Against:' in p.text and 'Stock Ratio < 1.0' in p.text:
            p196 = p
            break

    if p196 is not None:
        p196.clear()
        r0 = p196.add_run('i) Baselines Compared Against & Decision Thresholds:')
        r0.bold = True
        r0.font.name = 'Calibri'
        r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        r1 = p196.add_run(
            f' Rather than defaulting to an arbitrary 0.50 cutoff, the operational decision threshold is set to {r_metrics["threshold"]:.4f}, '
            f'which was determined mathematically on the {r_metrics.get("validation_days", 60)}-day validation fold to maximize the F1-score for stockout detection. '
            f'Benchmarked against a standard static heuristic rule (Stock Ratio < 1.0) on the held-out test split of {r_metrics["test"]["n"]:,} product-days (positive rate: {r_metrics["test"]["positive_rate"]*100:.2f}%):'
        )
        r1.font.name = 'Calibri'
        r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

        r_tbl = doc.add_table(rows=4, cols=8)
        set_table_borders(r_tbl)
        r_headers = ['Model / Baseline', 'Decision Threshold', 'Precision', 'Recall', 'F1-Score', 'True Pos (TP)', 'False Pos (FP)', 'Global Metrics']
        for col_idx, h_text in enumerate(r_headers):
            cell = r_tbl.cell(0, col_idx)
            format_cell(cell, '1E3A8A', top_mar=120, bottom_mar=120)
            cp = cell.paragraphs[0]
            cr = cp.add_run(h_text)
            cr.bold = True
            cr.font.name = 'Calibri'
            cr.font.size = Pt(8.5)
            cr.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

        r_test_at_thresh = r_metrics["test"]["at_threshold"]
        r_test_at_05 = r_metrics["test"]["at_0_5"]
        r_baseline = r_metrics["rule_baseline_stock_ratio_lt_1"]

        r_rows = [
            (
                'Calibrated Logistic Reg (Deployed)',
                f'{r_metrics["threshold"]:.4f} (Optimal)',
                f'{r_test_at_thresh["precision"]*100:.2f}%',
                f'{r_test_at_thresh["recall"]*100:.2f}%',
                f'{r_test_at_thresh["f1"]*100:.2f}%',
                f'{r_test_at_thresh["tp"]:,}',
                f'{r_test_at_thresh["fp"]:,}',
                f'ROC-AUC: {r_metrics["test"]["roc_auc"]:.4f} | PR-AUC: {r_metrics["test"]["pr_auc"]:.4f} | Brier: {r_metrics["test"]["brier"]:.4f}'
            ),
            (
                'Calibrated Logistic Reg (Standard)',
                '0.5000 (Default)',
                f'{r_test_at_05["precision"]*100:.2f}%',
                f'{r_test_at_05["recall"]*100:.2f}%',
                f'{r_test_at_05["f1"]*100:.2f}%',
                f'{r_test_at_05["tp"]:,}',
                f'{r_test_at_05["fp"]:,}',
                f'ROC-AUC: {r_metrics["test"]["roc_auc"]:.4f} | PR-AUC: {r_metrics["test"]["pr_auc"]:.4f}'
            ),
            (
                'Static Rule Baseline (Stock Ratio < 1)',
                'Ratio < 1.0',
                f'{r_baseline["precision"]*100:.2f}%',
                f'{r_baseline["recall"]*100:.2f}%',
                f'{r_baseline["f1"]*100:.2f}%',
                f'{r_baseline["tp"]:,}',
                f'{r_baseline["fp"]:,}',
                'Uncalibrated static inventory heuristic'
            ),
        ]

        for r_idx, r_vals in enumerate(r_rows, start=1):
            fill = 'F8FAFC' if r_idx % 2 == 1 else 'FFFFFF'
            for c_idx, val in enumerate(r_vals):
                cell = r_tbl.cell(r_idx, c_idx)
                format_cell(cell, fill, top_mar=100, bottom_mar=100)
                cp = cell.paragraphs[0]
                cr = cp.add_run(val)
                cr.font.name = 'Calibri'
                cr.font.size = Pt(8.5)
                cr.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
                if c_idx in [0, 2, 4]:
                    cr.bold = True

        p196._p.addnext(r_tbl._tbl)

    # ==========================================
    # 4. Update Section 5.3 (Feature Attribution)
    # ==========================================
    # P198 heading
    for p in doc.paragraphs:
        if '5.3 TreeSHAP Feature Attribution (Explainable AI)' in p.text:
            p.text = '5.3 Feature Attribution (Linear Log-Odds Contributions)'
            p.runs[0].bold = True
            p.runs[0].font.name = 'Calibri'
            p.runs[0].font.size = Pt(13)
            p.runs[0].font.color.rgb = RGBColor(0x25, 0x63, 0xEB)
            break

    # P199 (a)
    for p in doc.paragraphs:
        if 'a) Business Goal & Prediction Target:' in p.text and 'drove a product\'s stockout risk score' in p.text:
            p.clear()
            r0 = p.add_run('a) Business Goal & Prediction Target:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(' Provide exact mathematical explanations showing which business factors drove a product\'s stockout risk score above or below catalog baseline.')
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P200 (b)
    for p in doc.paragraphs:
        if 'b) ML Problem Type:' in p.text and 'Game-theoretic feature attribution' in p.text:
            p.clear()
            r0 = p.add_run('b) ML Problem Type:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(' Local feature attribution and interpretability for calibrated linear classifiers.')
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P201 (c)
    for p in doc.paragraphs:
        if 'c) Algorithms Used & Selection Rationale:' in p.text and 'TreeSHAP' in p.text:
            p.clear()
            r0 = p.add_run('c) Algorithms Used & Selection Rationale:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(
                ' Exact Linear Log-Odds Feature Attribution. Because the tournament selected a regularized Logistic Regression pipeline for deployment, '
                'feature contributions are computed directly and deterministically from the model weights and standardized inputs with zero approximation error. '
                '(The codebase also provides modular TreeSHAP support via shap.TreeExplainer should a tree ensemble be selected in future retraining, '
                'but the linear attribution path is actively executed in production).'
            )
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P202 (d)
    for p in doc.paragraphs:
        if 'd) How It Works in Simple Words:' in p.text and 'Treats features as players in a cooperative game' in p.text:
            p.clear()
            r0 = p.add_run('d) How It Works in Simple Words:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(
                ' Each input feature is standardized into standard deviation units. The algorithm multiplies each standardized value by its learned regression weight. '
                'This isolates the exact individual push that each specific signal gives to the risk score—either pushing risk higher (positive log-odds contribution) '
                'or pulling risk lower (negative log-odds contribution).'
            )
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P203 (e)
    for p in doc.paragraphs:
        if 'e) Input Features:' in p.text and 'The full 11-feature vector' in p.text:
            p.clear()
            r0 = p.add_run('e) Input Features:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(' The full 11 standardized inventory features used by the stockout risk classifier: stock_ratio, cover_ltd, cover_days, cv_60, growth_28_90, sup_delay, mean7_ratio, lead_time_days, doy_cos, doy_sin, and sup_ontime.')
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P204 (f)
    for p in doc.paragraphs:
        if 'f) Data Preparation:' in p.text and 'trained tree model structure' in p.text:
            p.clear()
            r0 = p.add_run('f) Data Preparation:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(' Operates on standardized inputs z = (x - μ) / σ produced by the scikit-learn StandardScaler pipeline fitted on the training split.')
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P205 (g)
    for p in doc.paragraphs:
        if 'g) Training Approach & Additive Formula:' in p.text and 'Computes Shapley attributions' in p.text:
            p.clear()
            r0 = p.add_run('g) Mathematical Formulation & Local Accuracy Property:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(' Feature contributions in log-odds units are computed as ϕ_i(x) = β_i · z_i. The model log-odds f(x) satisfies the exact additive local accuracy property:')
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P207 (h)
    for p in doc.paragraphs:
        if 'h) Evaluation Metrics:' in p.text and 'residual leakage' in p.text:
            p.clear()
            r0 = p.add_run('h) Evaluation Metrics:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(' Validated by automated tests confirming feature contributions plus base intercept sum to 100% of the model log-odds without residual numerical leakage.')
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P208 (i)
    for p in doc.paragraphs:
        if 'i) Baselines Compared Against:' in p.text and 'Compared against classical permutation importance' in p.text:
            p.clear()
            r0 = p.add_run('i) Baselines Compared Against:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(' Compared against global feature importance rankings; exact local linear attribution calculates instance-specific explanations for every individual product day, explaining why each SKU is at risk.')
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # P209 (j)
    for p in doc.paragraphs:
        if 'j) Outputs Produced:' in p.text and 'Six intuitive factor shares' in p.text:
            p.clear()
            r0 = p.add_run('j) Outputs Produced:')
            r0.bold = True
            r0.font.name = 'Calibri'
            r0.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            r1 = p.add_run(' Six intuitive factor shares (Stock Level, Demand Trend, Demand Volatility, Lead Time, Supplier Reliability, Time of Year) formatted as signed percentage shares that sum to 100%.')
            r1.font.name = 'Calibri'
            r1.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            break

    # ==========================================
    # 5. Global paragraph updates
    # ==========================================
    for p in doc.paragraphs:
        if '3. Machine Learning Microservice:' in p.text and 'TreeSHAP attributions' in p.text:
            p.text = '3. Machine Learning Microservice: High-performance Python FastAPI service managing gradient boosting forecasts, calibrated logistic regression risk scoring, linear feature attributions, and anomaly detection.'
            p.runs[0].font.name = 'Calibri'
            p.runs[0].font.size = Pt(10.5)
            p.runs[0].font.color.rgb = RGBColor(0x33, 0x41, 0x55)

        elif 'The dedicated predictive and statistical engine.' in p.text and 'TreeSHAP feature attributions' in p.text:
            p.text = 'The dedicated predictive and statistical engine. It trains and serves multi-horizon demand forecasting models, calculates calibrated stockout risks, extracts feature attributions, runs dual Isolation Forest anomaly detectors, and executes real-time What-If simulations.'
            p.runs[0].font.name = 'Calibri'
            p.runs[0].font.size = Pt(10.5)
            p.runs[0].font.color.rgb = RGBColor(0x33, 0x41, 0x55)

        elif '• TreeSHAP Local Accuracy:' in p.text:
            p.text = '• Feature Attribution Local Accuracy: Checks that individual feature contributions plus base intercept sum exactly to the model output log-odds without discrepancy.'
            p.runs[0].font.name = 'Calibri'
            p.runs[0].font.size = Pt(10.5)
            p.runs[0].font.color.rgb = RGBColor(0x33, 0x41, 0x55)

        elif '• Explainable AI & High Trust:' in p.text and 'TreeSHAP factor shares' in p.text:
            p.text = '• Explainable AI & High Trust: Demystifies machine learning recommendations through plain-English factor shares derived from exact feature attributions.'
            p.runs[0].font.name = 'Calibri'
            p.runs[0].font.size = Pt(10.5)
            p.runs[0].font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    # ==========================================
    # 6. Global table updates (content-based lookup)
    # ==========================================
    for tbl in doc.tables:
        header_text = tbl.rows[0].cells[0].text.strip()

        # Section 5.3 Model output formula table
        if 'Model Output f(x)' in header_text:
            p = tbl.rows[0].cells[0].paragraphs[0]
            if len(p.runs) > 0:
                p.runs[0].text = 'Model Log-Odds f(x) = Intercept (β₀) + Σ ( β_i × z_i )'

        # Table 1: Section summary
        if 'Section' in header_text and len(tbl.rows[0].cells) == 2:
            for row in tbl.rows:
                if '5. Machine Learning in Detail' in row.cells[0].text:
                    row.cells[1].paragraphs[0].runs[0].text = 'Deep dive into models, feature sets, calibration, feature attributions, and evaluation metrics.'

        # Table 2: Tech stack
        if 'Layer / Technology' in header_text:
            for row in tbl.rows:
                if 'scikit-learn' in row.cells[0].text:
                    row.cells[2].paragraphs[0].runs[0].text = 'Powers classification pipelines, logistic regression, gradient boosting, and unsupervised anomaly detection.'
                if 'SHAP' in row.cells[0].text:
                    row.cells[0].paragraphs[0].runs[0].text = 'SHAP & Linear Attribution'
                    row.cells[1].paragraphs[0].runs[0].text = 'Explainable AI Engine'
                    row.cells[2].paragraphs[0].runs[0].text = 'Computes exact linear feature attributions for the active logistic regression model (with TreeSHAP fallback if a tree model is selected).'

        # ML Features Table (was Table 44)
        if 'Feature' in header_text and len(tbl.rows[0].cells) == 5:
            for row in tbl.rows:
                if 'Stockout Risk' in row.cells[0].text:
                    row.cells[1].paragraphs[0].runs[0].text = 'Calibrated Logistic Regression (Platt)'
                if 'Explainable AI' in row.cells[0].text:
                    row.cells[1].paragraphs[0].runs[0].text = 'Linear Log-Odds Contributions (TreeSHAP for tree models)'

        # Entity Table (was Table 45)
        if 'Entity' in header_text and len(tbl.rows[0].cells) == 3:
            for row in tbl.rows:
                if 'Insight' in row.cells[0].text:
                    row.cells[2].paragraphs[0].runs[0].text = 'Product link, health score, priority tier, stockout risk %, reorder qty, days of cover, forecasts, attribution factor shares, timestamp.'

        # Glossary Table (was Table 47)
        if 'Technical Term / Symbol' in header_text:
            for row in tbl.rows:
                if 'TreeSHAP' in row.cells[0].text:
                    row.cells[0].paragraphs[0].runs[0].text = 'Feature Attribution (Linear & TreeSHAP)'
                    row.cells[1].paragraphs[0].runs[0].text = 'The interpretability engine computing exact linear log-odds contributions (β_i × z_i) for the active logistic regression model (and TreeSHAP for tree models), showing how each signal shifted the stockout risk.'

    doc.save('AI_Inventory_Intelligence_Project_Report_v2.docx')
    print('Cleanly generated AI_Inventory_Intelligence_Project_Report_v2.docx!')

if __name__ == '__main__':
    main()
