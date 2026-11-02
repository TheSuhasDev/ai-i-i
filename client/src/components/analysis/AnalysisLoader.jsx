import { useEffect, useRef, useState } from "react";

export default function AnalysisLoader({ steps = [], isComplete = false, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStates, setStepStates] = useState(() =>
    steps.map((_, idx) => (idx === 0 ? "running" : "pending"))
  );
  const timerRef = useRef(null);
  const isCompleteRef = useRef(isComplete);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    isCompleteRef.current = isComplete;
  }, [isComplete]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let step = 0;

    const advance = () => {
      if (step < steps.length - 1) {
        step++;
        setCurrentStep(step);
        setStepStates((prev) => {
          const next = [...prev];
          next[step - 1] = "completed";
          next[step] = "running";
          return next;
        });

        const delay = isCompleteRef.current ? 180 : 650;
        timerRef.current = setTimeout(advance, delay);
      } else {
        if (isCompleteRef.current) {
          setStepStates(steps.map(() => "completed"));
          timerRef.current = setTimeout(() => {
            onCompleteRef.current?.();
          }, 250);
        } else {
          setStepStates((prev) => {
            const next = [...prev];
            next[step] = "running";
            return next;
          });
        }
      }
    };

    timerRef.current = setTimeout(advance, isCompleteRef.current ? 180 : 650);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [steps]);

  useEffect(() => {
    if (isComplete && currentStep === steps.length - 1) {
      const t = setTimeout(() => {
        setStepStates(steps.map(() => "completed"));
        onCompleteRef.current?.();
      }, 250);
      return () => clearTimeout(t);
    }
  }, [isComplete, currentStep, steps]);

  const progress = Math.min(
    100,
    Math.round(((currentStep + (isComplete ? 1 : 0.5)) / steps.length) * 100)
  );

  return (
    <div className="analysis-loader-container" role="status" aria-live="polite">
      <div className="analysis-stepper-card">
        <div className="analysis-stepper-header">
          <div className="analysis-stepper-title">
            <span className="spinner small" aria-hidden="true" />
            <span>AI Analytical Engine Running...</span>
          </div>
          <span className="analysis-stepper-pct">{progress}%</span>
        </div>

        <div className="analysis-progress-track">
          <div className="analysis-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <ul className="analysis-steps-list">
          {steps.map((label, idx) => {
            const status = stepStates[idx] || "pending";
            return (
              <li key={label} className={`analysis-step-item status-${status}`}>
                <div className="analysis-step-icon">
                  {status === "completed" ? (
                    <span className="step-check" aria-label="Completed">✓</span>
                  ) : status === "running" ? (
                    <span className="spinner tiny" aria-label="Processing" />
                  ) : (
                    <span className="step-dot" aria-label="Waiting" />
                  )}
                </div>
                <span className="analysis-step-text">{label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="analysis-skeleton-preview" aria-hidden="true">
        <div className="skeleton-cards-row">
          <div className="skeleton-box stat" />
          <div className="skeleton-box stat" />
          <div className="skeleton-box stat" />
        </div>
        <div className="skeleton-box chart" />
      </div>
    </div>
  );
}
