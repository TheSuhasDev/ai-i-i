import Inventory from "../models/Inventory.js";
import { makeCrud } from "../controllers/crudFactory.js";
import { crudRouter } from "./crudRouter.js";
import { inventoryCreate, inventoryUpdate } from "../validators/schemas.js";

const crud = makeCrud({
  Model: Inventory,
  label: "Inventory record",
  auditCollection: "inventory",
  populate: [{ path: "product", select: "code sku name category leadTimeDays" }],
  filterFields: ["product"],
  defaultSort: "-updatedAt",
  buildSummary: async (filter, Model) => {
    const [totals, categoryAgg] = await Promise.all([
      Model.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalStock: { $sum: "$currentStock" },
            totalInTransit: { $sum: "$inTransitQty" },
            stockouts: {
              $sum: { $cond: [{ $eq: ["$currentStock", 0] }, 1, 0] },
            },
          },
        },
      ]),
      Model.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "prod",
          },
        },
        { $unwind: "$prod" },
        {
          $group: {
            _id: "$prod.category",
            stock: { $sum: "$currentStock" },
          },
        },
      ]),
    ]);

    return {
      totalStock: totals[0]?.totalStock || 0,
      totalInTransit: totals[0]?.totalInTransit || 0,
      stockouts: totals[0]?.stockouts || 0,
      categoryStock: categoryAgg.map((c) => ({
        category: c._id,
        stock: c.stock,
      })),
    };
  },
});

export default crudRouter(crud, {
  createSchema: inventoryCreate,
  updateSchema: inventoryUpdate,
  updateRoles: ["admin", "manager", "staff"],
});