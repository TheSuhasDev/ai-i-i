const ICON_PATHS = {
  alert: <><path d="M10.3 3.9 1.8 18.2A1.2 1.2 0 0 0 2.9 20h18.2a1.2 1.2 0 0 0 1.1-1.8L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 3h.01" /></>,
  check: <><path d="m5 12 4 4L19 6" /><circle cx="12" cy="12" r="10" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 11v5m0-8h.01" /></>,
  trend: <><path d="M3 17 9 11l4 4 8-9" /><path d="M15 6h6v6" /></>,
  down: <><path d="M3 7 9 13l4-4 8 9" /><path d="M15 18h6v-6" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  package: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5m-18 0v9l9 5 9-5V8m-9 5v9" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  truck: <><path d="M3 6h12v12H3zM15 10h4l3 3v5h-7" /><circle cx="7.5" cy="18" r="2" /><circle cx="18.5" cy="18" r="2" /></>,
  spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.2L22 17l-1.9.8L19 20l-1.1-2.2L16 17l1.9-.8L19 14Z" /></>,
  box: <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
};

export default function Icon({ name = "info", size = 15, className = "" }) {
  return (
    <svg className={`ui-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICON_PATHS[name] || ICON_PATHS.info}
    </svg>
  );
}
