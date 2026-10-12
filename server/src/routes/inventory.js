import Inventory from "../models/Inventory.js";
import { makeCrud } from "../controllers/crudFactory.js";
import { crudRouter } from "./crudRouter.js";
import { inventoryCreate, inventoryUpdate } from "../validators/schemas.js";

const crud = makeCrud({
  Model: Inventory,
  label: "Inventory record",
  populate: [{ path: "product", select: "code sku name category leadTimeDays" }],
  filterFields: ["product"],
  defaultSort: "-updatedAt",
});

export default crudRouter(crud, {
  createSchema: inventoryCreate,
  updateSchema: inventoryUpdate,
  updateRoles: ["admin", "manager", "staff"],
});