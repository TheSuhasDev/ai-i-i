export function getProductCode(product) {
  if (typeof product === "string" || typeof product === "number") return String(product);
  return product?.code || product?.productCode || product?.product_id || product?.productId || product?.sku || "";
}

export function getProductImage(product) {
  if (product && typeof product === "object" && product.imageUrl) return product.imageUrl;
  const code = getProductCode(product);
  return code ? `/products/${encodeURIComponent(code)}.jpg` : "";
}
