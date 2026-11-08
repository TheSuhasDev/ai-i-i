import { money, formatDate } from "./format.js";

export const HIDDEN_FIELDS = new Set([
  "_id",
  "id",
  "__v",
  "password",
  "passwordHash",
  "password_hash",
  "salt",
  "token",
  "secret",
  "hash",
  "resetPasswordToken",
  "resetPasswordExpires",
]);

export const FIELD_LABELS = {
  // Product
  code: "Product Code",
  sku: "SKU",
  name: "Name",
  category: "Category",
  price: "Selling Price",
  sellingPrice: "Selling Price",
  cost: "Unit Cost",
  unitCost: "Unit Cost",
  unitPrice: "Unit Price",
  leadTimeDays: "Lead Time (Days)",
  description: "Description",
  // Inventory
  currentStock: "Current Stock",
  safetyStock: "Safety Stock",
  reorderLevel: "Reorder Level",
  reorderPoint: "Reorder Point",
  inTransitQty: "In-Transit Qty",
  snapshotDate: "Snapshot Date",
  // Sales
  date: "Date",
  unitsSold: "Units Sold",
  revenue: "Revenue",
  promoFlag: "Promotional",
  isPromotional: "Promotional",
  // Purchase Orders
  poNumber: "PO Number",
  orderDate: "Order Date",
  expectedDeliveryDate: "Expected Delivery Date",
  actualDeliveryDate: "Actual Delivery Date",
  delayDays: "Delay (Days)",
  qtyOrdered: "Qty Ordered",
  qtyReceived: "Qty Received",
  qualityIssue: "Quality Issue",
  status: "Status",
  totalAmount: "Total Amount",
  totalCost: "Total Cost",
  paymentTerms: "Payment Terms",
  // Supplier
  contactEmail: "Contact Email",
  city: "City",
  address: "Address",
  phone: "Phone",
  reliabilityScore: "Reliability Score",
  onTimeRate: "On-Time Rate",
  defectRate: "Defect Rate",
  leadTimeVariance: "Lead Time Variance",
  minOrderQty: "Min Order Qty",
  // User & Auth
  email: "Email",
  role: "Role",
  // Relations
  product: "Product",
  supplier: "Supplier",
  suppliers: "Suppliers",
  user: "User",
};

export function formatFieldLabel(key) {
  if (!key) return "";
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export function formatCurrencyValue(val) {
  const n = Number(val);
  if (Number.isNaN(n)) return String(val);
  const hasFraction = n % 1 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDiffValue(key, val) {
  if (val === null || val === undefined || val === "") return "—";

  if (typeof val === "boolean") {
    return val ? "Yes" : "No";
  }

  const lowerKey = String(key || "").toLowerCase();

  // Currency fields (cost, price, revenue, amount)
  const isCurrency =
    lowerKey.includes("cost") ||
    lowerKey.includes("price") ||
    lowerKey.includes("revenue") ||
    lowerKey.includes("amount") ||
    lowerKey === "price" ||
    lowerKey === "cost";

  if (isCurrency && !Number.isNaN(Number(val)) && val !== "") {
    return formatCurrencyValue(val);
  }

  // Rate / Percentage fields (e.g. defectRate, onTimeRate)
  if (lowerKey.includes("rate") && !Number.isNaN(Number(val))) {
    const num = Number(val);
    const pctVal = num <= 1 && num >= 0 ? num * 100 : num;
    return `${pctVal.toFixed(1)}%`;
  }

  // Dates
  const isDateKey =
    lowerKey.includes("date") ||
    lowerKey === "at" ||
    lowerKey === "createdat" ||
    lowerKey === "updatedat";

  const isIsoDate = typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val);

  if (isDateKey || isIsoDate) {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) {
      const str = String(val);
      if (str.includes("T") && !/T00:00:00(\.000)?Z?$/.test(str)) {
        return d.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return formatDate(val);
    }
  }

  // Arrays
  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    return val
      .map((item) => {
        if (item && typeof item === "object") {
          return item.code && item.name
            ? `${item.code} · ${item.name}`
            : item.name || item.code || item.poNumber || item._id || JSON.stringify(item);
        }
        return String(item);
      })
      .join(", ");
  }

  // Objects
  if (typeof val === "object") {
    if (val.code && val.name) return `${val.code} · ${val.name}`;
    if (val.name) return val.name;
    if (val.code) return val.code;
    if (val.poNumber) return val.poNumber;
    if (val.email) return val.email;
    return JSON.stringify(val);
  }

  return String(val);
}

export function getChangedFields(before, after) {
  const b = before && typeof before === "object" ? before : null;
  const a = after && typeof after === "object" ? after : null;

  if (!b && !a) return [];

  const keys = Array.from(
    new Set([...(b ? Object.keys(b) : []), ...(a ? Object.keys(a) : [])])
  );

  const changed = [];
  for (const key of keys) {
    if (HIDDEN_FIELDS.has(key)) continue;

    const valBefore = b ? b[key] : undefined;
    const valAfter = a ? a[key] : undefined;

    // If both are nullish/undefined, ignore
    if (
      (valBefore === undefined || valBefore === null) &&
      (valAfter === undefined || valAfter === null)
    ) {
      continue;
    }

    // Strict equality check
    if (valBefore === valAfter) continue;

    // Date equality check
    if (
      (valBefore instanceof Date || typeof valBefore === "string") &&
      (valAfter instanceof Date || typeof valAfter === "string")
    ) {
      const dB = new Date(valBefore).getTime();
      const dA = new Date(valAfter).getTime();
      if (!Number.isNaN(dB) && !Number.isNaN(dA) && dB === dA) {
        continue;
      }
    }

    // ObjectId vs Populated object equality check
    const idBefore = valBefore?._id ? String(valBefore._id) : (typeof valBefore === "object" ? null : String(valBefore));
    const idAfter = valAfter?._id ? String(valAfter._id) : (typeof valAfter === "object" ? null : String(valAfter));
    if (idBefore && idAfter && idBefore === idAfter) {
      continue;
    }

    // Deep equality for objects/arrays
    if (
      typeof valBefore === "object" &&
      typeof valAfter === "object" &&
      valBefore !== null &&
      valAfter !== null &&
      JSON.stringify(valBefore) === JSON.stringify(valAfter)
    ) {
      continue;
    }

    changed.push({
      key,
      label: formatFieldLabel(key),
      before: valBefore,
      after: valAfter,
    });
  }

  return changed;
}

