import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = { Critical: "var(--danger)", Warning: "var(--warning)", Healthy: "var(--success)" };

export default function HealthChart({ items }) {
  const data = ["Critical", "Warning", "Healthy"].map((name) => ({
    name,
    count: items.filter((i) => i.healthStatus === name).length,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 15, bottom: 20, left: 15 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis
          dataKey="name"
          stroke="var(--muted)"
          label={{ value: "Health Status", position: "insideBottom", offset: -12, fill: "var(--muted)", fontSize: 12 }}
        />
        <YAxis
          allowDecimals={false}
          width={45}
          stroke="var(--muted)"
          unit=" products"
          label={{ value: "Product Count", angle: -90, position: "insideLeft", offset: 10, fill: "var(--muted)", fontSize: 12, textAnchor: "middle" }}
        />
        <Tooltip formatter={(value) => [`${value} products`, "Count"]} />
        <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="count" name="Products by Health Status" isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.name} fill={COLORS[d.name]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
