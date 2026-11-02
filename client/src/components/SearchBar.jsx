import { useEffect, useRef, useState } from "react";

export default function SearchBar({ onSearch, placeholder = "Search..." }) {
  const [value, setValue] = useState("");
  const onSearchRef = useRef(onSearch);
  const lastSearchedRef = useRef("");
  const debounceTimer = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed !== lastSearchedRef.current) {
        lastSearchedRef.current = trimmed;
        onSearchRef.current?.(trimmed);
      }
    }, 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const trimmed = value.trim();
    if (trimmed !== lastSearchedRef.current) {
      lastSearchedRef.current = trimmed;
      onSearchRef.current?.(trimmed);
    }
  };

  const handleClear = () => {
    setValue("");
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if ("" !== lastSearchedRef.current) {
      lastSearchedRef.current = "";
      onSearchRef.current?.("");
    }
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
