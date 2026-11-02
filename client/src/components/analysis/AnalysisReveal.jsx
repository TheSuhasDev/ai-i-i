import React from "react";

export default function AnalysisReveal({ children, analyzedAt, onRerun, isRunning = false }) {
  const formattedTime = analyzedAt
    ? new Date(analyzedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "Just now";

  return (
    <div className="analysis-reveal-wrapper">
      <div className="analysis-status-bar">
        <div className="analysis-timestamp-pill">
          <span className="dot-live" />
          <span>Analysis computed {formattedTime}</span>
        </div>
        {onRerun && (
          <button
            type="button"
            className="btn small secondary"
            onClick={onRerun}
            disabled={isRunning}
            title="Re-run analysis"
          >
            {isRunning ? (
              <>
                <span className="spinner tiny" aria-hidden="true" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <span aria-hidden="true">🔄</span>
                <span>Re-run</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="analysis-reveal-content">
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return child;
          return (
            <div
              className="analysis-reveal-item"
              style={{
                animationDelay: `${index * 90}ms`,
              }}
            >
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}
