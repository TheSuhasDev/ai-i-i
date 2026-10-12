import Supplier from "../models/Supplier.js";
import { makeCrud } from "../controllers/crudFactory.js";
import { crudRouter } from "./crudRouter.js";
import { supplierCreate, supplierUpdate } from "../validators/schemas.js";

const crud = makeCrud({
  Model: Supplier,
  label: "Supplier",
  searchFields: ["name", "code", "city"],
  filterFields: ["city"],
  defaultSort: "code",
});

export default crudRouter(crud, { createSchema: supplierCreate, updateSchema: supplierUpdate });