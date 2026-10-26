import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { getProductCode, getProductImage } from "../utils/productImage";
import ProductImageContext from "./productImageContext";

function statusFor(product) {
  return product?.priority || product?.health?.status || product?.status || product?.risk_level || "";
}

function statusTone(status) {
  const value = status.toLowerCase();
  if (value.includes("critical") || value === "high") return "critical";
  if (value.includes("warning") || value === "medium") return "warning";
  if (value.includes("healthy") || value === "low") return "healthy";
  return "info";
}

export function ProductImageProvider({ children }) {
  const [viewer, setViewer] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const closeRef = useRef(null);
  const returnFocusRef = useRef(null);

  const openImage = useCallback((product, imageList = [], returnFocus = null) => {
    const code = getProductCode(product);
    const source = imageList.length ? imageList : [product];
    const products = [...new Map(source.map((item) => [getProductCode(item), item])).values()];
    const index = Math.max(0, products.findIndex((item) => getProductCode(item) === code));
    returnFocusRef.current = returnFocus;
    setImageFailed(false);
    setViewer({ products, index });
  }, []);
  const closeImage = useCallback(() => {
    setViewer(null);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus?.());
  }, []);
  const move = useCallback((direction) => {
    setImageFailed(false);
    setViewer((current) => {
      if (!current || current.products.length < 2) return current;
      return { ...current, index: (current.index + direction + current.products.length) % current.products.length };
    });
  }, []);

  const isOpen = Boolean(viewer);
  useEffect(() => {
    if (!isOpen) return undefined;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeImage();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "Tab") {
        const focusable = [...document.querySelectorAll(".product-lightbox button, .product-lightbox a")].filter((item) => !item.disabled);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, closeImage, move]);

  const product = viewer?.products[viewer.index];
  const code = getProductCode(product);
  const name = product?.name || code;
  const image = getProductImage(product);
  const status = statusFor(product);

  return (
    <ProductImageContext.Provider value={{ openImage }}>
      {children}
      {viewer && createPortal(
        <div className="product-lightbox-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeImage(); }}>
          <section className="product-lightbox" role="dialog" aria-modal="true" aria-label={`${name} photo`}>
            <button ref={closeRef} className="product-lightbox-x" type="button" aria-label="Close photo" title="Close" onClick={closeImage}>×</button>
            {viewer.products.length > 1 && <>
              <button className="product-lightbox-arrow previous" type="button" aria-label="Previous product" onClick={() => move(-1)}>‹</button>
              <button className="product-lightbox-arrow next" type="button" aria-label="Next product" onClick={() => move(1)}>›</button>
            </>}
            {image && !imageFailed ? <img className="product-lightbox-image" src={image} alt={name} width="480" height="480" loading="eager" decoding="async" onError={() => setImageFailed(true)} /> : <div className="product-lightbox-fallback" role="img" aria-label={`${name} image unavailable`}><svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" aria-hidden="true"><path d="m3.5 7 8.5-4 8.5 4v10L12 21l-8.5-4V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="m3.8 7.2 8.2 4 8.2-4M12 11.2V21M7.7 5l8.6 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg></div>}
            <div className="product-lightbox-caption">
              <strong>{name}</strong>
              <span className="muted">{code}</span>
              {status && <span className={`product-status-badge ${statusTone(status)}`}>{status}</span>}
            </div>
            <div className="product-lightbox-actions">
              {code && <Link className="btn primary" to={`/product/${code}`} onClick={closeImage}>Open product</Link>}
              <button className="btn" type="button" onClick={closeImage}>Close</button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </ProductImageContext.Provider>
  );
}
