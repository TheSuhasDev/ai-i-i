import { memo } from "react";
import { Link } from "react-router-dom";
import ProductThumb from "./ProductThumb";
import { getProductCode } from "../utils/productImage";

function ProductCell({ product, code, name, size = "md", to, imageList = [] }) {
  const value = typeof product === "string" ? { code: product, name: name || product } : { ...(product || {}), ...(code ? { code } : {}), ...(name ? { name } : {}) };
  const productCode = getProductCode(value);
  const productName = value.name || productCode || "Unknown product";
  const copy = <span className="product-cell-copy">
    <strong className="product-cell-name" title={productName}>{productName}</strong>
    <span className="product-cell-code">{productCode}</span>
  </span>;

  return <span className="product-cell">
    <ProductThumb product={value} size={size} imageList={imageList} />
    {to === null ? copy : <Link className="product-cell-link" to={to || `/product/${productCode}`}>{copy}</Link>}
  </span>;
}

export default memo(ProductCell);
