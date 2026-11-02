import AnalysisButton from "./AnalysisButton";

export default function AnalysisIdle({
  title = "Ready to Analyze",
  description = "Trigger on-demand AI intelligence to evaluate data patterns and forecasts.",
  icon = "⚡",
  onAnalyze,
  isRunning = false,
  buttonLabel = "Run Analysis",
  controls = null,
}) {
  return (
    <div className="analysis-idle-card">
      <div className="analysis-idle-badge">
        <span className="analysis-idle-icon">{icon}</span>
      </div>
      <h3 className="analysis-idle-title">{title}</h3>
      <p className="analysis-idle-desc">{description}</p>

      {controls && <div className="analysis-idle-controls">{controls}</div>}

      <div className="analysis-idle-action">
        <AnalysisButton
          onClick={onAnalyze}
          isRunning={isRunning}
          label={buttonLabel}
          size="large"
        />
      </div>
    </div>
  );
}
