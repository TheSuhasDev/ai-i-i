import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Alerts = lazy(() => import("./pages/Alerts"));
const SmartReorder = lazy(() => import("./pages/SmartReorder"));
const TrendSeasonalityPage = lazy(() => import("./pages/TrendSeasonality"));
const SupplierRisk = lazy(() => import("./pages/SupplierRisk"));
const SupplierDeliveries = lazy(() => import("./pages/SupplierDeliveries"));
const ProductInsight = lazy(() => import("./pages/ProductInsight"));
const ProductList = lazy(() => import("./pages/ProductList"));
const ProductForm = lazy(() => import("./pages/ProductForm"));
const InventoryList = lazy(() => import("./pages/InventoryList"));
const InventoryForm = lazy(() => import("./pages/InventoryForm"));
const SaleList = lazy(() => import("./pages/SaleList"));
const SaleForm = lazy(() => import("./pages/SaleForm"));
const SupplierList = lazy(() => import("./pages/SupplierList"));
const SupplierForm = lazy(() => import("./pages/SupplierForm"));
const PurchaseOrderList = lazy(() => import("./pages/PurchaseOrderList"));
const PurchaseOrderForm = lazy(() => import("./pages/PurchaseOrderForm"));
const Anomalies = lazy(() => import("./pages/Anomalies"));
const Simulator = lazy(() => import("./pages/Simulator"));
const ModelPerformance = lazy(() => import("./pages/ModelPerformance"));
const Assistant = lazy(() => import("./pages/Assistant"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <Suspense fallback={<div className="plain-fallback" role="status">Loading page…</div>}>
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="reorder" element={<SmartReorder />} />
          <Route path="trend" element={<TrendSeasonalityPage />} />
          <Route path="supplier-risk" element={<SupplierRisk />} />
          <Route path="supplier-risk/:id/deliveries" element={<SupplierDeliveries />} />
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
          <Route path="settings" element={<Settings />} />

          {/* admin only */}
          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>

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

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
