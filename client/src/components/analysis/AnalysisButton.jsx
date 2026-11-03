export default function AnalysisButton({
  onClick,
  isRunning = false,
  isDone = false,
  label = "Run Analysis",
  rerunLabel = "Re-run Analysis",
  className = "btn primary",
  size = "normal",
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={`${className} ${size === "large" ? "btn-lg" : size === "small" ? "small" : ""}`}
      onClick={onClick}
      disabled={disabled || isRunning}
    >
      {isRunning ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <span>Analyzing...</span>
        </>
      ) : isDone ? (
        <>
          <span aria-hidden="true">✨</span>
          <span>{rerunLabel}</span>
        </>
      ) : (
        <>
          <span aria-hidden="true">✨</span>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

