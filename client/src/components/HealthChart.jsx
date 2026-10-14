import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = { Critical: "#e03131", Warning: "#f08c00", Healthy: "#2f9e44" };

export default function HealthChart({ items }) {
  const data = ["Critical", "Warning", "Healthy"].map((name) => ({
    name,
    count: items.filter((i) => i.healthStatus === name).length,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e8f0" />
        <XAxis dataKey="name" />
        <YAxis allowDecimals={false} width={32} />
        <Tooltip />
        <Bar dataKey="count" name="Products" isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.name} fill={COLORS[d.name]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}