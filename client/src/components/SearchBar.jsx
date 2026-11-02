import { useEffect, useRef, useState } from "react";

export default function SearchBar({ onSearch, placeholder = "Search..." }) {
  const [value, setValue] = useState("");
  const debounceTimer = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      onSearch(value.trim());
    }, 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [value, onSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    onSearch(value.trim());
  };

  const handleClear = () => {
    setValue("");
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    onSearch("");
  };

  return (
    <form className="search" onSubmit={handleSubmit} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        style={{ paddingRight: value ? "28px" : undefined }}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          style={{
            position: "absolute",
            right: "80px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            color: "var(--text-muted, #888)",
            padding: "4px 6px",
          }}
        >
          ✕
        </button>
      )}
      <button type="submit" className="btn">Search</button>
    </form>
  );
}
