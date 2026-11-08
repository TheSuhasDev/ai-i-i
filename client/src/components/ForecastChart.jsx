import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate, formatWeekTick, num } from "../utils/format";
import { ChartCard, ChartTooltip, CHART_GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS } from "./charts";

function buildSeries(history = [], forecast = []) {
  const rows = (history || []).map((h) => ({ week: h.weekStart, units: h.units }));
  if (rows.length && forecast && forecast.length) {
    const lastActual = rows[rows.length - 1];
    lastActual.forecast = lastActual.units;
    lastActual.low = lastActual.units;
    lastActual.band = 0;
  }
  (forecast || []).forEach((f) =>
    rows.push({
      week: f.week_start,
      forecast: f.forecast,
      low: f.low,
      band: Math.max((f.high || 0) - (f.low || 0), 0),
    })
  );
  return rows;
}

export default function ForecastChart({ history = [], forecast = [], leadTimeDays, leadTimeDemand, leadTimeDemandHigh }) {
  const [range, setRange] = useState("26w");

  const filteredHistory =
    range === "13w"
      ? history.slice(-13)
      : range === "26w"
      ? history.slice(-26)
      : range === "52w"
      ? history.slice(-52)
      : history;

  const data = buildSeries(filteredHistory, forecast);
  const forecastStart =
    (filteredHistory && filteredHistory.length > 0
      ? filteredHistory[filteredHistory.length - 1]?.weekStart
      : forecast?.[0]?.week_start) || null;
  const forecastEnd = forecast && forecast.length > 0 ? forecast[forecast.length - 1]?.week_start : null;

  const totalForecast = (forecast || []).reduce((s, f) => s + (f.forecast || 0), 0);
  const avgForecastWeekly = forecast.length ? Math.round(totalForecast / forecast.length) : 0;

  const recentHistory = history.slice(-4);
  const recentAvg = recentHistory.length
    ? Math.round(recentHistory.reduce((s, h) => s + (h.units || 0), 0) / recentHistory.length)
    : 0;
  const growthPct = recentAvg > 0 ? Math.round(((avgForecastWeekly - recentAvg) / recentAvg) * 100) : 0;

  const takeaway =
    totalForecast > 0
      ? `Model projects ~${avgForecastWeekly} units/week over the next ${forecast.length} weeks (${growthPct >= 0 ? `+${growthPct}%` : `${growthPct}%`} vs recent 4-week run-rate).`
      : "Historical sales pattern displayed. Forecast projections will update on next analysis run.";

  const rangeButtons = (
    <div className="btn-group" style={{ display: "inline-flex", background: "var(--surface-raised)", borderRadius: "6px", padding: "2px", border: "1px solid var(--border)" }}>
      {["13w", "26w", "52w", "All"].map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setRange(r)}
          style={{
            border: "none",
            background: range === r ? "var(--surface-hover, #1c2230)" : "transparent",
            color: range === r ? "var(--text)" : "var(--muted)",
            fontWeight: range === r ? 600 : 400,
            fontSize: "11px",
            padding: "2px 8px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {r}
        </button>
      ))}
    </div>
  );

  return (
    <ChartCard
      title="Demand Forecast (Actual vs Predicted)"
      subtitle="Historical weekly demand with machine-learning demand forecast and 80% confidence interval."
      jargon={["80% range", "Lead Time"]}
      takeaway={takeaway}
      takeawayTone="info"
      actions={rangeButtons}
      ariaLabel="Weekly demand forecast chart"
      empty={!data.length}
      emptyMessage="Forecast data is not available."
    >
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 15, right: 20, bottom: 0, left: 10 }}>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis dataKey="week" tickFormatter={formatWeekTick} minTickGap={28} {...X_AXIS_PROPS} />
            <YAxis
              width={50}
              {...Y_AXIS_PROPS}
              label={{
                value: "Units / week",
                angle: -90,
                position: "insideLeft",
                offset: 12,
                fill: "var(--muted)",
                fontSize: 11,
                textAnchor: "middle",
              }}
            />
            <Tooltip
              content={
                <ChartTooltip
                  labelFormatter={(d) => `Week of ${formatDate(d)}`}
                  formatter={(val, name) => [`${num(val, 0)} units`, name]}
                />
              }
            />
            <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />

            {forecastStart && forecastEnd && (
              <ReferenceArea
                x1={forecastStart}
                x2={forecastEnd}
                fill="var(--chart-3, #fbbf24)"
                fillOpacity={0.06}
              />
            )}

            {forecastStart && (
              <ReferenceLine
                x={forecastStart}
                stroke="var(--chart-3, #fbbf24)"
                strokeDasharray="4 4"
                label={{
                  value: "Forecast starts",
                  fill: "var(--chart-3, #fbbf24)",
                  position: "top",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}

            <Area
              dataKey="low"
              stackId="band"
              stroke="none"
              fill="transparent"
              legendType="none"
              isAnimationActive={false}
            />
            <Area
              dataKey="band"
              stackId="band"
              stroke="none"
              fill="var(--chart-1, #818cf8)"
              fillOpacity={0.25}
              name="80% likely range"
              isAnimationActive={false}
            />
            <Line
              dataKey="units"
              name="Actual sales"
              stroke="var(--chart-1, #818cf8)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="forecast"
              name="Forecast"
              stroke="var(--chart-3, #fbbf24)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3, fill: "var(--chart-3, #fbbf24)" }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {leadTimeDays && leadTimeDemand != null && (
        <p className="muted small" style={{ margin: "10px 0 0 0", fontSize: "0.8rem", lineHeight: 1.4 }}>
          Demand over the {leadTimeDays}-day lead time: <strong>{num(leadTimeDemand, 0)} units</strong>
          {leadTimeDemandHigh != null && <> (cautious estimate (90th percentile) <strong>{num(leadTimeDemandHigh, 0)} units</strong>)</>}.
          Forecast reflects seasonal index dynamics and baseline operations.
        </p>
      )}
    </ChartCard>
  );
}
