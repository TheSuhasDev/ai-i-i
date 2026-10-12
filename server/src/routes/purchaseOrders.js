import PurchaseOrder from "../models/PurchaseOrder.js";
import { makeCrud } from "../controllers/crudFactory.js";
import { crudRouter } from "./crudRouter.js";
import { poCreate, poUpdate } from "../validators/schemas.js";

const DAY = 86400000;

// delayDays = actual - expected delivery (negative = early). Matches the Day 2 definition.
function withDelay(data, existing = {}) {
  const out = { ...data };
  const actual = out.actualDeliveryDate !== undefined ? out.actualDeliveryDate : existing.actualDeliveryDate;
  const expected = out.expectedDeliveryDate ?? existing.expectedDeliveryDate;
  if (actual && expected) {
    if (out.delayDays === undefined) {
      out.delayDays = Math.round((new Date(actual) - new Date(expected)) / DAY);
    }
    if (!out.status) out.status = "Delivered";
  }
  return out;
}

const crud = makeCrud({
  Model: PurchaseOrder,
  label: "Purchase order",
  populate: [
    { path: "product", select: "code name" },
    { path: "supplier", select: "code name" },
  ],
  searchFields: ["poNumber"],
  filterFields: ["product", "supplier", "status", "qualityIssue"],
  defaultSort: "-orderDate",
  beforeCreate: (data) => withDelay(data),
  beforeUpdate: (data, existing) => withDelay(data, existing),
});

export default crudRouter(crud, { createSchema: poCreate, updateSchema: poUpdate });