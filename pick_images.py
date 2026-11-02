import csv, io, os, sys, html, shutil, time, requests
from PIL import Image, ImageOps

KEY = os.environ.get("PIXABAY_KEY")
CAND, OUT, N = "candidates", "client/public/products", 6
UA = {"User-Agent": "Mozilla/5.0 (student project image picker)"}

def products():
    return list(csv.DictReader(open("ml-service/data/products.csv", encoding="utf-8")))

def terms():
    t = {}
    if os.path.exists("search_terms.csv"):
        for r in csv.DictReader(open("search_terms.csv", encoding="utf-8")):
            t[r["product_id"]] = r["term"]
    return t

def get(url, **kw):
    for attempt in range(4):
        try:
            r = requests.get(url, headers=UA, timeout=30, **kw)
            if r.status_code == 429:
                print("  rate limited, waiting 60s...")
                time.sleep(60)
                continue
            if r.status_code == 200:
                return r
        except requests.RequestException:
            pass
        time.sleep(3)
    return None

def search(q):
    r = get("https://pixabay.com/api/", params={
        "key": KEY, "q": q, "image_type": "photo",
        "per_page": N, "safe_search": "true"})
    try:
        return r.json().get("hits", []) if r else []
    except ValueError:
        return []

def fetch():
    if not KEY:
        sys.exit("Set PIXABAY_KEY first")
    os.makedirs(CAND, exist_ok=True)
    tm, sections = terms(), []
    for p in products():
        pid = p["product_id"]
        q = tm.get(pid, p["name"])
        have = [i for i in range(1, N + 1) if os.path.exists(f"{CAND}/{pid}_{i}.jpg")]
        if not have:
            for i, h in enumerate(search(q), 1):
                r = get(h["webformatURL"])
                if not r:
                    continue
                try:
                    im = Image.open(io.BytesIO(r.content)).convert("RGB")
                    ImageOps.fit(im, (400, 400)).save(f"{CAND}/{pid}_{i}.jpg", quality=82)
                except Exception:
                    print("  skipped a bad image for", pid)
                time.sleep(0.4)
            time.sleep(1.5)
            have = [i for i in range(1, N + 1) if os.path.exists(f"{CAND}/{pid}_{i}.jpg")]
        figs = "".join(
            f'<figure><img src="{CAND}/{pid}_{i}.jpg" width="150" height="150"><figcaption>{i}</figcaption></figure>'
            for i in have)
        sections.append(f'<section><h3>{pid} {html.escape(p["name"])} <small>(searched: {html.escape(q)})</small></h3><div class="row">{figs or "no results"}</div></section>')
        print("done", pid, f"({len(have)} candidates)")
    open("pick.html", "w", encoding="utf-8").write(
        '<!doctype html><meta charset="utf-8"><style>body{font-family:sans-serif;background:#111;color:#eee;padding:16px}'
        '.row{display:flex;gap:10px;flex-wrap:wrap}figure{margin:0;text-align:center}img{border-radius:8px}'
        'h3{margin:18px 0 6px}small{color:#999;font-weight:normal}</style>' + "".join(sections))
    print("Open pick.html, then write your picks in choices.txt (example line: P001 3)")

def apply():
    os.makedirs(OUT, exist_ok=True)
    for line in open("choices.txt", encoding="utf-8"):
        parts = line.split()
        if len(parts) == 2:
            src = f"{CAND}/{parts[0]}_{parts[1]}.jpg"
            if os.path.exists(src):
                shutil.copy(src, f"{OUT}/{parts[0]}.jpg")
                print("saved", parts[0])
            else:
                print("missing", src)

{"fetch": fetch, "apply": apply}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: print("usage: fetch | apply"))()