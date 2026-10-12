import Sale from "../models/Sale.js";
import { makeCrud } from "../controllers/crudFactory.js";
import { crudRouter } from "./crudRouter.js";
import { saleCreate, saleUpdate } from "../validators/schemas.js";

const crud = makeCrud({
  Model: Sale,
  label: "Sale",
  populate: [{ path: "product", select: "code name category" }],
  filterFields: ["product", "promoFlag"],
  defaultSort: "-date",
  buildFilter: (q) => {
    const f = {};
    const from = typeof q.from === "string" && q.from ? new Date(q.from) : null;
    const to = typeof q.to === "string" && q.to ? new Date(q.to) : null;
    if (from || to) {
      f.date = {};
      if (from) f.date.$gte = from;
      if (to) f.date.$lte = to;
    }
    return f;
  },
  beforeCreate: (data) => ({ ...data, revenue: data.revenue ?? data.unitsSold * data.unitPrice }),
  beforeUpdate: (data, existing) => {
    if (data.revenue !== undefined) return data;
    if (data.unitsSold === undefined && data.unitPrice === undefined) return data;
    const units = data.unitsSold ?? existing.unitsSold;
    const price = data.unitPrice ?? existing.unitPrice;
    return { ...data, revenue: units * price };
  },
});

export default crudRouter(crud, {
  createSchema: saleCreate,
  updateSchema: saleUpdate,
  createRoles: ["admin", "manager", "staff"],
});