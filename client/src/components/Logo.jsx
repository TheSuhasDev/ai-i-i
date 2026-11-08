import { useEffect, useState } from "react";

export default function Logo({
  height = 32,
  iconOnly = false,
  theme: themeProp,
  className = "",
  style = {},
  alt = "Replenix",
  ...props
}) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.dataset.theme || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    if (themeProp) return undefined;
    const updateTheme = () => {
      const active = document.documentElement.dataset.theme || "dark";
      setCurrentTheme(active);
    };

    updateTheme();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
          updateTheme();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const handleCustomEvent = (e) => {
      if (e.detail) setCurrentTheme(e.detail);
    };
    window.addEventListener("inventory-theme-changed", handleCustomEvent);

    return () => {
      observer.disconnect();
      window.removeEventListener("inventory-theme-changed", handleCustomEvent);
    };
  }, [themeProp]);

  const activeTheme = themeProp || currentTheme;
  const isLight = activeTheme === "light";

  let src;
  if (iconOnly) {
    src = isLight ? "/replenix-icon-light.png" : "/replenix-icon-dark.png";
  } else {
    src = isLight ? "/replenix-logo-light.png" : "/replenix-logo-dark.png";
  }

  return (
    <img
      src={src}
      alt={alt}
      height={height}
      className={`replenix-logo ${iconOnly ? "replenix-logo-icon" : "replenix-logo-full"} ${className}`.trim()}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        width: "auto",
        maxWidth: "100%",
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
      loading="eager"
      decoding="sync"
      {...props}
    />
  );
}

