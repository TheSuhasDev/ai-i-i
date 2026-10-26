import PurchaseOrder from "../models/PurchaseOrder.js";

export const OPEN_STATUSES = ["Pending", "Approved", "In Transit", "In transit"];

export function summarizeOpenPurchaseOrders(orders) {
  if (!Array.isArray(orders)) return { onOrder: 0, expectedDeliveryDate: null };
  return orders
    .filter((order) => {
      const status = order?.status;
      if (!status) return true;
      return !["Delivered", "Cancelled"].includes(status);
    })
    .reduce(
      (summary, order) => {
        const remaining = Math.max(Number(order.qtyOrdered || 0) - Number(order.qtyReceived || 0), 0);
        summary.onOrder += remaining;
        if (remaining > 0 && order.expectedDeliveryDate &&
            (!summary.expectedDeliveryDate || order.expectedDeliveryDate < summary.expectedDeliveryDate)) {
          summary.expectedDeliveryDate = order.expectedDeliveryDate;
        }
        return summary;
      },
      { onOrder: 0, expectedDeliveryDate: null }
    );
}

export async function getOpenPurchaseOrderSummary(productId) {
  const orders = await PurchaseOrder.find({
    product: productId,
    status: { $nin: ["Delivered", "Cancelled"] },
  })
    .select("status qtyOrdered qtyReceived expectedDeliveryDate")
    .lean();
  return summarizeOpenPurchaseOrders(orders);
}
