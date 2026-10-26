import { useEffect, useRef, useState } from "react";
import ProductCell from "./ProductCell";
import { getProductCode } from "../utils/productImage";

export default function ProductSelect({ products = [], value = "", onChange, valueKey = "_id", placeholder = "Select product", allLabel, disabled = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = products.find((product) => String(product[valueKey] ?? getProductCode(product)) === String(value));

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const choose = (next) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className={`product-select ${open ? "is-open" : ""}`} ref={rootRef}>
      <button type="button" className="product-select-trigger" aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)}>
        {selected ? <ProductCell product={selected} size="sm" to={null} /> : <span className="muted">{value ? value : placeholder}</span>}
        <span aria-hidden="true">▾</span>
      </button>
      {open && <div className="product-select-options" role="listbox">
        {allLabel && <button type="button" role="option" aria-selected={!value} className="product-select-option product-select-all" onClick={() => choose("")}>{allLabel}</button>}
        {products.map((product) => {
          const optionValue = product[valueKey] ?? getProductCode(product);
          return <button type="button" role="option" aria-selected={String(optionValue) === String(value)} className="product-select-option" key={optionValue} onClick={() => choose(optionValue)}><ProductCell product={product} size="sm" to={null} /></button>;
        })}
      </div>}
    </div>
  );
}
