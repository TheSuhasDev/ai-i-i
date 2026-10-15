import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import SmartReorder from "./pages/SmartReorder";
import SupplierRisk from "./pages/SupplierRisk";
import ProductInsight from "./pages/ProductInsight";
import ProductList from "./pages/ProductList";
import ProductForm from "./pages/ProductForm";
import InventoryList from "./pages/InventoryList";
import InventoryForm from "./pages/InventoryForm";
import SaleList from "./pages/SaleList";
import SaleForm from "./pages/SaleForm";
import SupplierList from "./pages/SupplierList";
import SupplierForm from "./pages/SupplierForm";
import PurchaseOrderList from "./pages/PurchaseOrderList";
import PurchaseOrderForm from "./pages/PurchaseOrderForm";
import Anomalies from "./pages/Anomalies";
import Simulator from "./pages/Simulator";
import ModelPerformance from "./pages/ModelPerformance";
import Assistant from "./pages/Assistant";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="reorder" element={<SmartReorder />} />
          <Route path="supplier-risk" element={<SupplierRisk />} />
          <Route path="product/:code" element={<ProductInsight />} />

          <Route path="products" element={<ProductList />} />
          <Route path="inventory" element={<InventoryList />} />
          <Route path="inventory/:id/edit" element={<InventoryForm />} />
          <Route path="sales" element={<SaleList />} />
          <Route path="sales/new" element={<SaleForm />} />
          <Route path="suppliers" element={<SupplierList />} />
          <Route path="anomalies" element={<Anomalies />} />
          <Route path="simulator" element={<Simulator />} />
          <Route path="performance" element={<ModelPerformance />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="purchase-orders" element={<PurchaseOrderList />} />

          {/* admin and manager only */}
          <Route element={<ProtectedRoute roles={["admin", "manager"]} />}>
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            <Route path="inventory/new" element={<InventoryForm />} />
            <Route path="sales/:id/edit" element={<SaleForm />} />
            <Route path="suppliers/new" element={<SupplierForm />} />
            <Route path="suppliers/:id/edit" element={<SupplierForm />} />
            <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
            <Route path="purchase-orders/:id/edit" element={<PurchaseOrderForm />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}