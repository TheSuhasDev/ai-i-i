import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function buildSeries(history = [], forecast = []) {
  const rows = history.map((h) => ({ week: h.weekStart, units: h.units }));
  if (rows.length) rows[rows.length - 1].forecast = rows[rows.length - 1].units; // join the two lines
  forecast.forEach((f) =>
    rows.push({ week: f.week_start, forecast: f.forecast, low: f.low, band: Math.max(f.high - f.low, 0) })
  );
  return rows;
}

function SeriesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tip">
      <strong>Week of {label}</strong>
      {p.units != null && <div>Actual: {p.units}</div>}
      {p.band != null && (
        <div>
          Forecast: {p.forecast} (range {p.low} to {Math.round(p.low + p.band)})
        </div>
      )}
    </div>
  );
}

export default function ForecastChart({ history, forecast }) {
  const data = buildSeries(history, forecast);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e8f0" />
        <XAxis dataKey="week" tickFormatter={(d) => d.slice(5)} minTickGap={24} />
        <YAxis width={48} />
        <Tooltip content={<SeriesTooltip />} />
        <Legend />
        <Area dataKey="low" stackId="band" stroke="none" fill="transparent" legendType="none" isAnimationActive={false} />
        <Area dataKey="band" stackId="band" stroke="none" fill="#bac8ff" fillOpacity={0.6} name="80% range" isAnimationActive={false} />
        <Line dataKey="units" name="Actual (units/week)" stroke="#3b5bdb" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line dataKey="forecast" name="Forecast" stroke="#f08c00" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}