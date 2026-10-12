import { useState } from "react";

export default function SearchBar({ onSearch, placeholder = "Search..." }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
    >
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
      <button className="btn">Search</button>
    </form>
  );
}