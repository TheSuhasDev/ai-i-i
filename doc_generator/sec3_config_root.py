from docx.shared import Inches, Pt, RGBColor
from doc_generator.builder import (
    add_heading_1, add_heading_2, add_heading_3, add_paragraph,
    add_bullet, add_file_info_table, add_code_block
)

def render_section_3_config_root(doc):
    add_heading_2(doc, "3.4 Configuration, Tooling & Root Automation Scripts")
    add_paragraph(doc, 
        "This section documents the repository's configuration files, image pipeline scripts, and tooling infrastructure. "
        "These utilities govern dataset image assets, environment configuration templates, compiler rules, and code linting."
    )

    # 1. Image Pipeline Scripts
    add_heading_3(doc, "3.4.1 Product Image Processing Pipeline")
    
    add_file_info_table(doc,
        path="pick_images.py",
        purpose="Automated pipeline: queries Pixabay API for catalog products, downloads 6 candidate images per product, and crops to 400x400 square JPEGs.",
        deps="requests, PIL (Pillow), csv, os, sys",
        used_by="Invoked via CLI: python pick_images.py fetch | python pick_images.py apply"
    )
    add_paragraph(doc, "Code Explanation:", bold_prefix="Execution Flow: ")
    add_bullet(doc, "Reads products.csv to extract product names and categories. Cleans query strings.", bold_prefix="1. Query Sanitization: ")
    add_bullet(doc, "Executes authenticated queries against Pixabay REST API using PIXABAY_KEY. Fetches up to 6 candidate images per product and saves into candidates/.", bold_prefix="2. Candidate Download: ")
    add_bullet(doc, "pick_images.py apply: Crops selected candidate images using Pillow (PIL.ImageOps.fit) to exact 400x400 square thumbnails and writes to client/public/products/<product_id>.jpg.", bold_prefix="3. Normalization: ")

    add_file_info_table(doc,
        path="fetch_product_images.py & import_manual.py",
        purpose="Fallback image fetchers and manual image importers converting arbitrary candidate formats (including AVIF/WebP) to standard JPG.",
        deps="PIL, pillow_avif, glob, os",
        used_by="Manual curation workflow"
    )
    add_paragraph(doc, "Code Explanation:", bold_prefix="Execution Flow: ")
    add_bullet(doc, "import_manual.py: Scans manual/ directory for user-supplied product images (e.g., P001.jpg, P007.avif, P012.webp). Uses pillow_avif and PIL to open any format, applies ImageOps.fit(..., (400, 400)), converts to RGB, and saves as client/public/products/<id>.jpg.", bold_prefix="Format Normalization: ")

    add_file_info_table(doc,
        path="pick.html",
        purpose="Interactive HTML visual review gallery allowing manual inspection of candidate product images.",
        deps="Standard HTML5 / CSS",
        used_by="Opened locally in browser to visually select top candidate image per product"
    )

    # 2. Server Configuration Files
    add_heading_3(doc, "3.4.2 Server Configuration Files")
    add_bullet(doc, "server/package.json: Declares Node.js ES module configuration ('type': 'module'). Defines dependencies (express 5.3, mongoose 9.11, zod 4.6, bcryptjs 3.0, jsonwebtoken 9.0, cors, helmet, morgan, csv-parse). Defines scripts: 'dev' (nodemon src/index.js), 'start' (node src/index.js), 'seed' (node src/seed/seed.js), 'test' (node --test), 'lint' (eslint .).", bold_prefix="server/package.json: ")
    add_bullet(doc, "server/.env.example: Environment variable template specifying PORT (5000), MONGO_URI, CLIENT_URL, ML_SERVICE_URL, ML_SERVICE_TOKEN, JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV, LLM_API_KEY, LLM_BASE_URL, and LLM_MODEL.", bold_prefix="server/.env.example: ")
    add_bullet(doc, "server/eslint.config.js: ESLint flat configuration using @eslint/js recommended rules, node globals, and strict ES module parsing.", bold_prefix="server/eslint.config.js: ")

    # 3. ML Service Configuration Files
    add_heading_3(doc, "3.4.3 ML Service Configuration Files")
    add_bullet(doc, "ml-service/requirements.txt: Pinned Python dependency manifest: fastapi==0.143.0, uvicorn==0.54.0, scikit-learn==1.7.2, xgboost==3.2.0, pandas==2.3.3, numpy==2.2.6, shap==0.49.1, statsmodels==0.15.0, pydantic==2.14.0, joblib==1.6.0, pytest==9.1.1, python-dotenv==1.2.4.", bold_prefix="ml-service/requirements.txt: ")
    add_bullet(doc, "ml-service/.env.example: Environment variable template declaring PORT (8000), CLIENT_URL, SERVER_URL, and ML_SERVICE_TOKEN.", bold_prefix="ml-service/.env.example: ")
    add_bullet(doc, "ml-service/pytest.ini: Pytest discovery configuration specifying testpaths = tests and python_files = test_*.py.", bold_prefix="ml-service/pytest.ini: ")

    # 4. Client Configuration Files
    add_heading_3(doc, "3.4.4 Client Configuration Files")
    add_bullet(doc, "client/package.json: Declares React 19, Vite 8, React Router 7, Recharts 3.10, TailwindCSS 4, Framer Motion 14, and Axios 1.2. Scripts: 'dev', 'build', 'lint', 'preview', 'typecheck'.", bold_prefix="client/package.json: ")
    add_bullet(doc, "client/vite.config.js: Configures Vite bundler with @vitejs/plugin-react and @tailwindcss/vite. Enables automatic chunk code-splitting and JSX transformation.", bold_prefix="client/vite.config.js: ")
    add_bullet(doc, "client/tsconfig.json & tsconfig.app.json: TypeScript compiler configuration enabling path aliases, strict JSX support, and typechecking.", bold_prefix="client/tsconfig.json: ")
    add_bullet(doc, "client/src/index.css: Core design system stylesheet (882 lines). Defines CSS variables for dark/light themes, typography, custom scrollbars, card elevations, badge colors, and utility classes.", bold_prefix="client/src/index.css: ")
    add_bullet(doc, ".gitignore: Root repository ignore file. Excludes node_modules/, dist/, build/, .env, .venv/, __pycache__/, and serialized model binaries (ml-service/models/*.joblib).", bold_prefix=".gitignore: ")
