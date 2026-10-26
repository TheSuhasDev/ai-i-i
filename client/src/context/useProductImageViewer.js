import { useContext } from "react";
import ProductImageContext from "./productImageContext";

export default function useProductImageViewer() {
  return useContext(ProductImageContext);
}
