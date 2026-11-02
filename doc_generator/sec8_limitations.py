from docx.shared import Inches, Pt, RGBColor
from doc_generator.builder import (
    add_heading_1, add_heading_2, add_heading_3, add_paragraph,
    add_bullet, add_table_custom, add_callout
)

def render_section_8(doc):
    add_heading_1(doc, "8. Known Limitations & Production Roadmap")
    
    add_paragraph(doc, 
        "A rigorous, evidence-based code and architectural audit of the repository reveals several technical limitations, "
        "synthetic data constraints, and security recommendations that must be addressed prior to multi-tenant production deployment."
    )

    add_heading_2(doc, "8.1 Identified Technical & Modeling Limitations")

    add_bullet(doc, "Synthetic Data Autocorrelation: The dataset was synthesized using stationary statistical distributions (Seed 42) across 40 products. Daily inventory levels of individual products exhibit autocorrelation, reducing effective statistical degrees of freedom compared to raw observation counts. Real-world demand exhibits non-stationary shifts, stockout-censored demand, and cross-item elasticity.", bold_prefix="1. Synthetic Data Constraints: ")
    add_bullet(doc, "Constant Daily Demand Assumption in Simulator: The 30-day stock projection in ml-service/app/simulator.py assumes constant daily demand calculated as the mean of the 3-week forecast divided by 7. It does not account for intraday or day-of-week demand variance (weekend retail uplift) or mid-month promotional spikes.", bold_prefix="2. Simulator Projection Assumptions: ")
    add_bullet(doc, "Heuristic Inventory Health Weights: The 0-100 inventory health score in ml-service/app/health.py combines four operational components using judgmental weights: 55% stock cover, 15% risk safety, 15% supplier reliability, and 15% demand stability. These weights represent heuristic domain rules rather than empirically fitted loss parameters.", bold_prefix="3. Judgmental Health Weights: ")
    add_bullet(doc, "Client Token Storage in LocalStorage: In client/src/context/AuthProvider.jsx, JWT authentication tokens are stored in browser localStorage. While convenient for SPA persistence, tokens stored in localStorage are vulnerable to extraction via Cross-Site Scripting (XSS). Secure HTTP-only cookies with Strict SameSite policies represent the industry standard.", bold_prefix="4. Client Token Storage: ")
    add_bullet(doc, "Process-Local In-Memory Assistant Rate Limiting: In server/src/routes/assistant.js, the rate limiter tracks user request timestamps in an in-memory Map. This limiter is local to a single Node.js process and resets whenever the server restarts. In a multi-replica clustered deployment, a distributed store (e.g. Redis) is required to enforce uniform quotas.", bold_prefix="5. In-Memory Rate Limiting: ")
    add_bullet(doc, "Overdue Purchase Order Age in Alert Margin: In ml-service/app/insights.py, open PO delivery dates are evaluated using max((expected_date - as_of).days, 0) + avg_delay. For an order that is already overdue by 20 days, the negative elapsed duration is clamped to 0, modeling the order as arriving today plus average delay. An overdue order penalty or immediate critical state should be applied.", bold_prefix="6. Overdue PO Clamping: ")
    add_bullet(doc, "Single Snapshot Insight Persistence: The Mongoose Insight model maintains exactly one active document per product (upserted via findOneAndUpdate). Historical progression of health scores, alert priorities, and reorder points over time is not currently archived, preventing historical trend analysis of decision engine efficacy.", bold_prefix="7. Non-Temporal Insight Schema: ")
    add_bullet(doc, "Assistant Data-Level Prompt Injection Surface: While assistantTools.js enforces strictly read-only execution, tool functions query product names, categories, and supplier notes. If a malicious operator enters prompt injection payloads into editable catalog fields, the text is fed into the LLM context, potentially influencing model recommendations.", bold_prefix="8. Indirect Prompt Injection Surface: ")

    add_heading_2(doc, "8.2 Prioritized Production Roadmap")
    add_paragraph(doc, "The following roadmap outlines the critical engineering tasks recommended for enterprise production hardening:")

    roadmap_data = [
        ["Phase 1 (Immediate)", "HTTP-Only Cookie Authentication", "High", "Migrate JWT storage from browser localStorage to secure, httpOnly, SameSite=Strict cookies to eliminate token theft vectors."],
        ["Phase 1 (Immediate)", "Distributed Rate Limiting", "High", "Replace in-memory assistant Map with Redis-backed express-rate-limit across all authentication and analytical endpoints."],
        ["Phase 1 (Immediate)", "Overdue PO Escalation Policy", "Medium", "Update ml-service alert margin logic to treat already-overdue purchase orders as immediate high-severity replenishment exceptions."],
        ["Phase 2 (Near-Term)", "Temporal Insight Historical Tracking", "Medium", "Modify Insight collection or add InsightHistory collection to archive daily score snapshots for longitudinal performance reporting."],
        ["Phase 2 (Near-Term)", "Censored Demand ML Adjustment", "Medium", "Implement Tobit regression or Kaplan-Meier survival adjustments to recover true customer demand during out-of-stock periods."],
        ["Phase 2 (Near-Term)", "Assistant Input Sanitization", "Medium", "Implement strict output formatting wrappers and structural XML isolation around tool query results fed into the LLM context."],
        ["Phase 3 (Long-Term)", "Multi-Tenant Enterprise Partitioning", "Low", "Introduce tenant_id partitioning across all MongoDB collections and FastAPI query contexts to support multi-client SaaS operations."],
        ["Phase 3 (Long-Term)", "Automated Model Retraining Pipelines", "Low", "Establish scheduled cron triggers (e.g. weekly Airflow or GitHub Actions) to retrain forecast and risk models as new transaction batches arrive."]
    ]
    add_table_custom(doc, ["Roadmap Phase", "Engineering Objective", "Priority", "Implementation Plan & Impact"], roadmap_data, [Inches(1.5), Inches(1.8), Inches(1.0), Inches(2.7)])
