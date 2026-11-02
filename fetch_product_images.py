import csv, io, os, sys, time, requests
from PIL import Image, ImageOps

KEY = os.environ.get("PIXABAY_KEY")
if not KEY:
    sys.exit("Set PIXABAY_KEY first")

OUT = "client/public/products"
os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "inventory-project-image-fetch/1.0 (student project)"}

def from_pixabay(q):
    r = requests.get("https://pixabay.com/api/", params={
        "key": KEY, "q": q, "image_type": "photo", "per_page": 3,
        "safe_search": "true", "orientation": "horizontal"}, timeout=20)
    hits = r.json().get("hits", [])
    return (hits[0]["webformatURL"], hits[0]["pageURL"]) if hits else None

def from_wikimedia(q):
    r = requests.get("https://commons.wikimedia.org/w/api.php", headers=UA, params={
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": q, "gsrnamespace": 6, "gsrlimit": 5,
        "prop": "imageinfo", "iiprop": "url|mime", "iiurlwidth": 640}, timeout=20)
    for p in (r.json().get("query", {}).get("pages", {}) or {}).values():
        info = p.get("imageinfo", [{}])[0]
        if info.get("mime", "").startswith("image/jpeg"):
            return info["thumburl"], info["descriptionurl"]
    return None

with open("ml-service/data/products.csv", newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        pid, name = row["product_id"], row["name"]
        path = f"{OUT}/{pid}.jpg"
        if os.path.exists(path):
            continue
        res = from_pixabay(name) or from_wikimedia(name)
        if not res:
            print("NO RESULT:", pid, name)
            continue
        url, page = res
        img = Image.open(io.BytesIO(requests.get(url, headers=UA, timeout=30).content)).convert("RGB")
        ImageOps.fit(img, (400, 400)).save(path, quality=82, optimize=True)
        print("saved", pid, name, "<-", page)
        time.sleep(0.7)