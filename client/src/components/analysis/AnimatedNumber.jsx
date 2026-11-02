import { useEffect, useRef, useState } from "react";

export default function AnimatedNumber({ value = 0, decimals = 0, prefix = "", suffix = "" }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const animRef = useRef(null);

  useEffect(() => {
    const startVal = Number(prevValueRef.current) || 0;
    const endVal = Number(value) || 0;
    prevValueRef.current = value;

    if (startVal === endVal) return;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      const t = setTimeout(() => setDisplayValue(endVal), 0);
      return () => clearTimeout(t);
    }

    const duration = 650;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayValue(endVal);
      }
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [value]);

  const formatted = typeof displayValue === "number"
    ? displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : displayValue;

  return <span>{prefix}{formatted}{suffix}</span>;
}
