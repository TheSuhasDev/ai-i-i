import Product from "../models/Product.js";
import { makeCrud } from "../controllers/crudFactory.js";
import { crudRouter } from "./crudRouter.js";
import { productCreate, productUpdate } from "../validators/schemas.js";

const crud = makeCrud({
  Model: Product,
  label: "Product",
  auditCollection: "products",
  populate: [{ path: "suppliers", select: "code name" }],
  searchFields: ["name", "sku", "code"],
  filterFields: ["category", "isActive"],
  defaultSort: "code",
  buildFilter: (q) => (typeof q.supplier === "string" && q.supplier ? { suppliers: q.supplier } : {}),
  buildSummary: async (filter, Model) => {
    const [activeCount, stats, categoryCounts] = await Promise.all([
      Model.countDocuments({ ...filter, isActive: { $ne: false } }),
      Model.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            avgLeadTime: { $avg: "$leadTimeDays" },
          },
        },
      ]),
      Model.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      activeCount,
      avgLeadTime: stats[0]?.avgLeadTime ? Math.round(stats[0].avgLeadTime * 10) / 10 : 0,
      categoryDistribution: categoryCounts.map((c) => ({
        category: c._id,
        count: c.count,
      })),
    };
  },
});

export default crudRouter(crud, { createSchema: productCreate, updateSchema: productUpdate });