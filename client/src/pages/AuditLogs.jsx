import { useState } from "react";
import useFetch from "../hooks/useFetch";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import Pill from "../components/Pill";
import { exportCsv } from "../utils/exportCsv";

const AUDIT_COLS = [
  { header: "Date & Time", key: "at", format: (v) => new Date(v).toLocaleString() },
  { header: "User", key: "user.name" },
  { header: "Role", key: "user.role" },
  { header: "Action", key: "action" },
  { header: "Collection", key: "collection" },
  { header: "Document ID", key: "documentId" },
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
        <select value={collection} onChange={(e) => { setCollection(e.target.value); setPage(1); }}>
          <option value="">All collections</option>
          <option value="sales">Sales</option>
          <option value="purchase_orders">Purchase Orders</option>
        </select>

        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>

        <button type="button" className="btn small" onClick={reload}>Refresh</button>
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
              <th>Document ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="center">Loading audit logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="center">No audit log records recorded yet</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.at).toLocaleString()}</td>
                  <td>
                    <strong>{log.user?.name || "System"}</strong>
                    <div className="small muted">{log.user?.email} ({log.user?.role || "user"})</div>
                  </td>
                  <td>
                    <Pill value={log.action === "delete" ? "Critical" : log.action === "update" ? "Warning" : "Healthy"}>
                      {log.action.toUpperCase()}
                    </Pill>
                  </td>
                  <td><code>{log.collection}</code></td>
                  <td><code className="small">{String(log.documentId).slice(-8)}</code></td>
                  <td>
                    <details className="small">
                      <summary>View Diff</summary>
                      <pre className="code-font" style={{ margin: "6px 0", maxHeight: "120px", overflow: "auto" }}>
                        {JSON.stringify({ before: log.before, after: log.after }, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination pagination={pagination} onPage={setPage} />
    </div>
  );
}
