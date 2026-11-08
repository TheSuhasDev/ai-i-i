import { useState } from "react";
import useFetch from "../hooks/useFetch";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import Pill from "../components/Pill";
import { exportCsv } from "../utils/exportCsv";
import {
  getChangedFields,
  formatFieldLabel,
  formatDiffValue,
  formatCurrencyValue,
  HIDDEN_FIELDS,
} from "../utils/auditDiff";

export { getChangedFields, formatFieldLabel, formatDiffValue, formatCurrencyValue, HIDDEN_FIELDS };

export function AuditDiffViewer({ before, after, action }) {
  const [showRaw, setShowRaw] = useState(false);
  const act = String(action || "").toLowerCase();

  if (act === "login") {
    return (
      <div className="audit-diff-wrap">
        <div className="audit-diff-empty" style={{ fontStyle: "normal", color: "var(--text)", fontWeight: 500 }}>
          Signed in
        </div>
      </div>
    );
  }

  if (act === "logout") {
    return (
      <div className="audit-diff-wrap">
        <div className="audit-diff-empty" style={{ fontStyle: "normal", color: "var(--text)", fontWeight: 500 }}>
          Signed out
        </div>
      </div>
    );
  }

  const changedFields = getChangedFields(before, after);

  return (
    <div className="audit-diff-wrap">
      <div className="audit-diff-header">
        <span className="audit-diff-count">
          {changedFields.length === 0
            ? "No field changes detected"
            : `${changedFields.length} changed ${changedFields.length === 1 ? "field" : "fields"}`}
        </span>
        <button
          type="button"
          onClick={() => setShowRaw((prev) => !prev)}
          className="audit-diff-toggle-btn"
          aria-label={showRaw ? "Hide raw JSON" : "View raw JSON"}
        >
          {showRaw ? "View formatted diff" : "View raw JSON"}
        </button>
      </div>

      {showRaw ? (
        <pre className="code-font audit-diff-raw">
          {JSON.stringify({ before, after }, null, 2)}
        </pre>
      ) : changedFields.length === 0 ? (
        <div className="audit-diff-empty">
          No modified fields recorded for this entry.
        </div>
      ) : (
        <table className="audit-diff-table">
          <thead>
            <tr>
              <th style={{ width: "35%" }}>Field</th>
              <th style={{ width: "32%" }}>Before</th>
              <th style={{ width: "33%" }}>After</th>
            </tr>
          </thead>
          <tbody>
            {changedFields.map(({ key, label, before: bVal, after: aVal }) => {
              const formattedBefore = formatDiffValue(key, bVal);
              const formattedAfter = formatDiffValue(key, aVal);
              const isModified = bVal !== undefined && aVal !== undefined;
              const isAdded = bVal === undefined && aVal !== undefined;

              return (
                <tr key={key}>
                  <td className="audit-diff-field">{label}</td>
                  <td className={`audit-diff-before ${isModified ? "modified" : ""}`}>
                    {formattedBefore}
                  </td>
                  <td className={`audit-diff-after ${isAdded ? "added" : ""}`}>
                    {formattedAfter}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function deriveAction(log) {
  if (!log) return "Update";
  const raw = String(log.action || "").toLowerCase();
  if (raw === "logout") return "Logout";
  if (raw === "login" || log.collection === "users" || log.collection === "auth") return "Login";
  if (raw === "delete" || (!log.after && log.before)) return "Delete";
  if (raw === "create" || (!log.before && log.after)) return "Create";
  if (raw === "update" || (log.before && log.after)) return "Update";
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Update";
}

export function getActionTone(action) {
  const a = String(action || "").toLowerCase();
  if (a === "delete") return "critical"; // Red badge
  if (a === "update") return "warning";  // Amber badge
  if (a === "create") return "healthy";  // Green badge
  if (a === "login") return "info";      // Blue badge
  if (a === "logout") return "muted";    // Grey badge
  return "info";
}

export function getRecordLabel(log) {
  if (log?.recordName) {
    return log.recordName
      .replace(/\s*\((Stock:\s*\d+|units Sold:\s*\d+|\d+\s*units?)\)/gi, "")
      .replace(/\s*\([^)]+@[^)]+\)/g, "")
      .trim();
  }
  const data = log?.after || log?.before || {};
  const col = String(log?.collection || "").toLowerCase();
  if (col === "products") {
    if (data.code && data.name) return `${data.code} · ${data.name}`;
    return data.name || data.code || "";
  }
  if (col === "suppliers") {
    if (data.code && data.name) return `${data.code} · ${data.name}`;
    return data.name || data.code || "";
  }
  if (col === "purchase_orders" || col === "purchaseorders" || col === "purchase-orders") {
    return data.poNumber || (data._id ? `PO #${String(data._id).slice(-6)}` : "Purchase Order");
  }
  if (col === "inventory" || col === "inventories") {
    const prodName = data.product?.name || (data.product?.code ? `Product ${data.product.code}` : "");
    return prodName || "Inventory Record";
  }
  if (col === "sales") {
    const prodName = data.product?.name || (data.product?.code ? `Product ${data.product.code}` : "");
    return prodName || "Sale Record";
  }
  if (col === "users" || col === "auth") {
    return data.name || data.email || "User";
  }
  return data.name || data.title || data.code || data.poNumber || "";
}

const AUDIT_COLS = [
  { header: "Date & Time", key: "at", format: (v) => (v ? new Date(v).toLocaleString() : "") },
  { header: "User", key: "user.name", format: (v, r) => r.user?.name || "System" },
  { header: "Role", key: "user.role", format: (v, r) => r.user?.role || "user" },
  { header: "Action", key: "action", format: (_, r) => deriveAction(r) },
  { header: "Collection", key: "collection" },
  { header: "Record Name", key: "recordName", format: (_, r) => getRecordLabel(r) },
  { header: "Document ID", key: "documentId" },
  {
    header: "Details",
    key: "details",
    format: (_, r) => {
      const act = String(r.action || "").toLowerCase();
      if (act === "login") return "Signed in";
      if (act === "logout") return "Signed out";
      const changed = getChangedFields(r.before, r.after);
      if (!changed.length) return "No field modifications";
      return changed
        .map((c) => `${c.label}: ${formatDiffValue(c.key, c.before)} → ${formatDiffValue(c.key, c.after)}`)
        .join("; ");
    },
  },
];

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [collection, setCollection] = useState("");
  const [action, setAction] = useState("");

  const fetchLogs = () =>
    api.get("/audit-logs", {
      params: {
        page,
        limit: 25,
        collection: collection || undefined,
        action: action || undefined,
      },
    });

  const { data, loading, error, reload } = useFetch(fetchLogs, [page, collection, action]);
  const logs = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 25, total: logs.length, pages: 1 };

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable activity and modification log for sensitive supply chain transactions."
        actions={
          <button
            type="button"
            className="btn"
            onClick={() => exportCsv("audit-logs", AUDIT_COLS, logs)}
            disabled={!logs.length}
          >
            Export CSV
          </button>
        }
      />

      <div className="toolbar">
        <select
          value={collection}
          onChange={(e) => {
            setCollection(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by collection"
        >
          <option value="">All collections</option>
          <option value="products">Products</option>
          <option value="inventory">Inventory</option>
          <option value="sales">Sales</option>
          <option value="purchase_orders">Purchase Orders</option>
          <option value="suppliers">Suppliers</option>
          <option value="users">Users / Auth</option>
        </select>

        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
        </select>

        <button type="button" className="btn small" onClick={reload}>
          Refresh
        </button>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Collection</th>
              <th>Document / Record</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="center">
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="center">
                  No audit log records recorded yet
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const actionLabel = deriveAction(log);
                const actionTone = getActionTone(actionLabel);
                const recordLabel = getRecordLabel(log);

                return (
                  <tr key={log._id}>
                    <td>{log.at ? new Date(log.at).toLocaleString() : "—"}</td>
                    <td>
                      <strong>{log.user?.name || "System"}</strong>
                      <div className="small muted">
                        {log.user?.email || "system@inventory.app"} ({log.user?.role || "user"})
                      </div>
                    </td>
                    <td>
                      <Pill tone={actionTone} label={actionLabel}>
                        {actionLabel}
                      </Pill>
                    </td>
                    <td>
                      <code>{log.collection}</code>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {recordLabel ? (
                          <strong className="text-xs font-semibold text-[var(--text)]">
                            {recordLabel}
                          </strong>
                        ) : null}
                        <code className="small muted" title={String(log.documentId)}>
                          ID: {String(log.documentId || "").slice(-8)}
                        </code>
                      </div>
                    </td>
                    <td style={{ minWidth: "280px" }}>
                      <details className="audit-diff-details">
                        <summary className="audit-diff-summary">View Diff</summary>
                        <AuditDiffViewer before={log.before} after={log.after} action={log.action} />
                      </details>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination pagination={pagination} onPage={setPage} />
    </div>
  );
}
