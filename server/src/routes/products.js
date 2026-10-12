import Product from "../models/Product.js";
import { makeCrud } from "../controllers/crudFactory.js";
import { crudRouter } from "./crudRouter.js";
import { productCreate, productUpdate } from "../validators/schemas.js";

const crud = makeCrud({
  Model: Product,
  label: "Product",
  populate: [{ path: "suppliers", select: "code name" }],
  searchFields: ["name", "sku", "code"],
  filterFields: ["category", "isActive"],
  defaultSort: "code",
  buildFilter: (q) => (typeof q.supplier === "string" && q.supplier ? { suppliers: q.supplier } : {}),
});

export default crudRouter(crud, { createSchema: productCreate, updateSchema: productUpdate });