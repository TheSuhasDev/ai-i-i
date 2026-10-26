/**
 * exportCsv(filename, columns, rows)
 *
 * columns: Array<{ header: string; key: string; format?: (value, row) => string }>
 * rows:    the data array (same shape as what's in the table)
 *
 * Builds a CSV string client-side and triggers a browser download.
 */
export function exportCsv(filename, columns, rows) {
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    // Wrap in quotes if the value contains comma, quote, or newline
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = columns.map((c) => escape(c.header)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => {
      const raw = c.key.split(".").reduce((obj, k) => obj?.[k], row);
      const formatted = c.format ? c.format(raw, row) : raw;
      return escape(formatted);
    }).join(",")
  );

  const csv = [header, ...body].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
