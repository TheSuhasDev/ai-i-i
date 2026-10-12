import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProductList from "./pages/ProductList";
import ProductForm from "./pages/ProductForm";
import SupplierList from "./pages/SupplierList";
import SupplierForm from "./pages/SupplierForm";
import PurchaseOrderList from "./pages/PurchaseOrderList";
import PurchaseOrderForm from "./pages/PurchaseOrderForm";
import InventoryList from "./pages/InventoryList";
import InventoryForm from "./pages/InventoryForm";
import SaleList from "./pages/SaleList";
import SaleForm from "./pages/SaleForm";
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="suppliers" element={<SupplierList />} />
          <Route path="purchase-orders" element={<PurchaseOrderList />} />
          <Route path="inventory" element={<InventoryList />} />
          <Route path="inventory/:id/edit" element={<InventoryForm />} />
          <Route path="sales" element={<SaleList />} />
          <Route path="sales/new" element={<SaleForm />} />

          {/* create/edit pages: admin and manager only */}
          <Route element={<ProtectedRoute roles={["admin", "manager"]} />}>
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            <Route path="suppliers/new" element={<SupplierForm />} />
            <Route path="suppliers/:id/edit" element={<SupplierForm />} />
            <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
            <Route path="purchase-orders/:id/edit" element={<PurchaseOrderForm />} />
            <Route path="inventory/new" element={<InventoryForm />} />
            <Route path="inventory/:id/edit" element={<InventoryForm />} />
            <Route path="sales/:id/edit" element={<SaleForm />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}