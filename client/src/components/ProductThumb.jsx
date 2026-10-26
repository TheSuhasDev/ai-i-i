import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getProductImage, getProductCode } from "../utils/productImage";
import useProductImageViewer from "../context/useProductImageViewer";

const SIZE = { sm: 48, md: 72, lg: 96, xl: 220, card: 112, simulator: 120 };
const warnedCodes = new Set();

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

function PackageIcon() {
  return <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" aria-hidden="true"><path d="m3.5 7 8.5-4 8.5 4v10L12 21l-8.5-4V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="m3.8 7.2 8.2 4 8.2-4M12 11.2V21M7.7 5l8.6 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}

function ProductThumb({ product, size = "md", className = "", imageList = [] }) {
  const code = getProductCode(product);
  const name = typeof product === "object" ? product?.name || code : code;
  const image = getProductImage(product);
  const [failedImage, setFailedImage] = useState("");
  const [preview, setPreview] = useState(null);
  const viewer = useProductImageViewer();
  const failed = failedImage === image;
  const dimension = SIZE[size] || Number(size) || SIZE.md;

  useEffect(() => {
    if (!preview) return undefined;
    const hide = () => setPreview(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [preview]);

  const fail = () => {
    setFailedImage(image);
    if (import.meta.env.DEV && !warnedCodes.has(code)) {
      warnedCodes.add(code);
      console.warn(`[ProductThumb] Product image unavailable for ${code}: ${image}`);
    }
  };
  const showPreview = (event) => {
    const table = event.currentTarget.closest(".table-wrap");
    if (!table || window.innerWidth < 600 || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const x = event.clientX;
    const y = event.clientY;
    const left = Math.max(8, Math.min(x + 16, window.innerWidth - 296));
    const top = Math.max(8, Math.min(y + 16, window.innerHeight - 330));
    setPreview({ left, top });
  };
  const open = (event) => {
    event.stopPropagation();
    setPreview(null);
    viewer?.openImage(product, imageList, event.currentTarget);
  };

  return <>
    <button
      type="button"
      className={`product-thumb product-thumb-${size} ${failed || !image ? "product-thumb-fallback" : ""} ${className}`}
      width={dimension}
      height={dimension}
      aria-label={`View ${name} photo`}
      title={`View ${name} photo`}
      onClick={open}
      onMouseEnter={showPreview}
      onMouseMove={showPreview}
      onMouseLeave={() => setPreview(null)}
    >
      {image && !failed ? <img src={image} alt={name} width={dimension} height={dimension} loading="lazy" decoding="async" onError={fail} /> : <PackageIcon />}
    </button>
    {preview && createPortal(
      <aside className="product-hover-preview" style={{ left: preview.left, top: preview.top }} aria-hidden="true">
        {image && !failed ? <img src={image} alt="" width="180" height="180" loading="lazy" decoding="async" /> : <span className="product-thumb-fallback"><PackageIcon /></span>}
        <strong title={name}>{name}</strong><span>{code}</span>
        {statusFor(product) && <span className={`product-status-badge ${statusTone(statusFor(product))}`}>{statusFor(product)}</span>}
      </aside>, document.body
    )}
  </>;
}

export default memo(ProductThumb);
