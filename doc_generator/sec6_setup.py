from docx.shared import Inches, Pt, RGBColor
from doc_generator.builder import (
    add_heading_1, add_heading_2, add_heading_3, add_paragraph,
    add_bullet, add_table_custom, add_code_block, add_callout
)

def render_section_6(doc):
    add_heading_1(doc, "6. Setup, Configuration & Run Guide")
    
    add_paragraph(doc, 
        "This guide provides complete, step-by-step instructions to configure, seed, and run all services in a local "
        "development environment or production host."
    )

    add_heading_2(doc, "6.1 System Prerequisites")
    add_bullet(doc, "Node.js: Version 20.x LTS or higher (with npm 10+).", bold_prefix="Node.js: ")
    add_bullet(doc, "Python: Version 3.10 or higher (with pip, virtualenv, and build tools).", bold_prefix="Python: ")
    add_bullet(doc, "MongoDB: Local MongoDB Community Server 7.0+ or a cloud MongoDB Atlas M0 cluster.", bold_prefix="MongoDB: ")
    add_bullet(doc, "Git: Distributed version control system.", bold_prefix="Git: ")
    add_bullet(doc, "Operating System: Cross-platform support (Windows PowerShell, macOS Terminal, Ubuntu/Debian Linux).", bold_prefix="OS: ")

    add_heading_2(doc, "6.2 Comprehensive Environment Variables Reference")
    add_paragraph(doc, 
        "All secrets and service URLs must be configured in environment files (.env) located in server/, ml-service/, and client/. "
        "The following table specifies every variable without exposing confidential values:"
    )

    env_data = [
        ["server/.env", "PORT", "5000", "Local TCP port for Express HTTP listener."],
        ["server/.env", "MONGO_URI", "mongodb://localhost:27017/inventory", "MongoDB connection string."],
        ["server/.env", "CLIENT_URL", "http://localhost:5173", "Permitted CORS origin for React frontend."],
        ["server/.env", "ML_SERVICE_URL", "http://localhost:8000", "Base URL of the Python FastAPI ML microservice."],
        ["server/.env", "ML_SERVICE_TOKEN", "<shared_random_secret>", "Secret token sent in X-Service-Token to authenticate with FastAPI."],
        ["server/.env", "JWT_SECRET", "<random_32_char_secret>", "Secret key for HS256 JWT signing (strictly validated on startup >= 32 chars)."],
        ["server/.env", "JWT_EXPIRES_IN", "7d", "Lifetime duration of issued client JWT tokens."],
        ["server/.env", "NODE_ENV", "development", "Runtime environment (development / production)."],
        ["server/.env", "LLM_API_KEY", "<groq_or_openai_key>", "API key for external LLM tool-calling assistant provider."],
        ["server/.env", "LLM_BASE_URL", "https://api.groq.com/openai/v1", "OpenAI-compatible base URL for chat completions."],
        ["server/.env", "LLM_MODEL", "llama-3.3-70b-versatile", "Target LLM model identifier for assistant queries."],
        ["ml-service/.env", "PORT", "8000", "Local TCP port for FastAPI Uvicorn listener."],
        ["ml-service/.env", "CLIENT_URL", "http://localhost:5173", "Permitted browser CORS origin."],
        ["ml-service/.env", "SERVER_URL", "http://localhost:5000", "Permitted backend CORS origin."],
        ["ml-service/.env", "ML_SERVICE_TOKEN", "<shared_random_secret>", "Must match server/.env ML_SERVICE_TOKEN exactly."],
        ["client/.env", "VITE_API_URL", "http://localhost:5000/api", "Base REST URL of the Express backend."],
        ["client/.env", "VITE_ML_URL", "http://localhost:8000", "Direct URL to FastAPI ML microservice (optional)."]
    ]
    add_table_custom(doc, ["Configuration File", "Variable Name", "Example / Default", "Technical Purpose"], env_data, [Inches(1.5), Inches(1.8), Inches(1.8), Inches(2.2)])

    add_heading_2(doc, "6.3 Step-by-Step Installation & Execution")
    
    add_heading_3(doc, "Step 1: ML Microservice Setup (Data & Models)")
    add_paragraph(doc, "Open Terminal 1 (PowerShell / Bash) and navigate to ml-service/:")
    add_code_block(doc,
        "cd ml-service\n"
        "python -m venv .venv\n"
        "# On Windows: .\\.venv\\Scripts\\Activate.ps1  |  On Linux/Mac: source .venv/bin/activate\n"
        "pip install -r requirements.txt\n"
        "# Generate synthetic retail dataset (Seed 42)\n"
        "python data/generate_data.py\n"
        "python data/validate_data.py\n"
        "# Train models and save serialized joblib binaries & JSON metrics\n"
        "python -m app.train_forecast\n"
        "python -m app.train_risk\n"
        "python -m app.anomaly\n"
        "# Start FastAPI ASGI microservice on port 8000\n"
        "uvicorn app.main:app --reload --port 8000",
        caption="Terminal 1: ML Microservice Installation, Training, and Execution"
    )

    add_heading_3(doc, "Step 2: Express Backend Setup & Database Seeding")
    add_paragraph(doc, "Open Terminal 2 and navigate to server/:")
    add_code_block(doc,
        "cd server\n"
        "npm install\n"
        "# Configure server/.env based on .env.example\n"
        "# Run database seed (migrates generated CSVs into MongoDB)\n"
        "npm run seed\n"
        "# Execute server regression test suite\n"
        "npm test\n"
        "# Start Express backend API on port 5000\n"
        "npm run dev",
        caption="Terminal 2: Express Backend Installation, Seeding, Testing, and Execution"
    )

    add_heading_3(doc, "Step 3: Frontend Client Setup")
    add_paragraph(doc, "Open Terminal 3 and navigate to client/:")
    add_code_block(doc,
        "cd client\n"
        "npm install\n"
        "# Configure client/.env (VITE_API_URL=http://localhost:5000/api)\n"
        "# Start Vite development server on port 5173\n"
        "npm run dev",
        caption="Terminal 3: React Client Installation and Execution"
    )
    add_paragraph(doc, "Access the application in your browser at: http://localhost:5173", bold_prefix="Web Access: ")

    add_heading_2(doc, "6.4 Pre-Configured Demo Accounts")
    add_paragraph(doc, "The database seed script initializes three accounts for testing role-aware workflows:")
    demo_data = [
        ["Admin", "admin@inventory.com", "Admin@123", "Full administration, destructive deletes, insight refresh."],
        ["Manager", "manager@inventory.com", "Manager@123", "Add/edit products, suppliers, purchase orders; simulator; assistant."],
        ["Staff", "staff@inventory.com", "Staff@123", "Read-only catalogs, record daily sales, update physical stock counts."]
    ]
    add_table_custom(doc, ["Role Persona", "Email Address", "Default Password", "Functional Access Level"], demo_data, [Inches(1.2), Inches(2.0), Inches(1.3), Inches(2.5)])
