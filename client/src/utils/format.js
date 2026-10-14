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

export const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "-");

// value for <input type="date">
export const toDateInput = (d) => (d ? String(d).slice(0, 10) : "");

// today's date in the user's local timezone, as YYYY-MM-DD for <input type="date">
export const todayInput = () => new Date().toLocaleDateString("en-CA");

export const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export const num = (n, d = 1) =>
  n == null || Number.isNaN(Number(n)) ? "-" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: d });

export const humanize = (key) => String(key).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

// YYYY-MM-DD for today + n days, in local time
export const addDaysInput = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
};