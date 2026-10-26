export const CATEGORIES = [
  "Computer Accessories",
  "Mobile & Audio",
  "Home Appliances",
  "Stationery & Office",
  "Networking",
  "Gaming & Lifestyle",
];

export const PO_STATUSES = ["Pending", "In Transit", "Delivered", "Cancelled"];

export const money = (n) =>
  n == null ? "-" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const formatDate = (d) => {
  if (!d) return "-";
  const str = String(d);
  let year, monthIdx, day;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, dt] = str.slice(0, 10).split("-");
    year = y;
    monthIdx = parseInt(m, 10) - 1;
    day = String(parseInt(dt, 10)).padStart(2, "0");
  } else {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return str;
    year = date.getFullYear();
    monthIdx = date.getMonth();
    day = String(date.getDate()).padStart(2, "0");
  }
  return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
};

export const getDataAgeDays = (dateInput) => {
  if (!dateInput) return null;
  const str = String(dateInput).slice(0, 10);
  const target = new Date(`${str}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const diffMs = today.getTime() - target.getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
};

export const fmtDate = formatDate;

// value for <input type="date">
export const toDateInput = (d) => (d ? String(d).slice(0, 10) : "");

// today's date in the user's local timezone, as YYYY-MM-DD for <input type="date">
export const todayInput = () => new Date().toLocaleDateString("en-CA");

export const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export const num = (n, d = 1) =>
  n == null || Number.isNaN(Number(n)) ? "-" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: d });

export const pct = (n, d = 1) =>
  n == null || Number.isNaN(Number(n)) ? "-" : `${(Number(n) * (Number(n) <= 1 && Number(n) >= 0 ? 100 : 1)).toFixed(d)}%`;

export const humanize = (key) => String(key).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

// YYYY-MM-DD for today + n days, in local time
export const addDaysInput = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
};

export const normalizePoNumber = (po) => {
  if (!po) return "-";
  if (typeof po === "string") return po;
  const raw = po.poNumber || "";
  if (/^PO-\d{8}-[A-Za-z0-9]+$/i.test(raw)) {
    return raw.toUpperCase();
  }
  const code = po.product?.code || po.productCode;
  const date = po.orderDate;
  if (date && code) {
    const dStr = String(date).slice(0, 10).replaceAll("-", "");
    if (dStr.length === 8) {
      return `PO-${dStr}-${code}`;
    }
  }
  return raw || "-";
};