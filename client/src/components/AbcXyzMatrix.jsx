const ABC = [["A", "high value"], ["B", "medium"], ["C", "low value"]];
const XYZ = [["X", "predictable"], ["Y", "variable"], ["Z", "erratic"]];

export default function AbcXyzMatrix({ items }) {
  const cells = {};
  items.forEach((i) => {
    const c = i.data?.classification;
    if (c) (cells[`${c.abc}${c.xyz}`] ||= []).push(i);
  });
  const max = Math.max(1, ...Object.values(cells).map((a) => a.length));

  return (
    <table className="matrix">
      <thead>
        <tr>
          <th></th>
          {XYZ.map(([k, label]) => (
            <th key={k}>{k}<br /><span className="muted small">{label}</span></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ABC.map(([a, aLabel]) => (
          <tr key={a}>
            <th>{a}<br /><span className="muted small">{aLabel}</span></th>
            {XYZ.map(([x]) => {
              const list = cells[`${a}${x}`] || [];
              return (
                <td
                  key={x}
                  style={{ background: `rgba(59, 91, 219, ${list.length ? 0.1 + 0.5 * (list.length / max) : 0})` }}
                  title={list.map((i) => `${i.productCode} ${i.data?.name}`).join("\n")}
                >
                  <div className="matrix-count">{list.length}</div>
                  <div className="small muted">{list.map((i) => i.productCode).join(" ")}</div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}