import AppError from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function makeCrud({
  Model,
  label,
  populate = [],
  searchFields = [],
  filterFields = [],
  defaultSort = "-createdAt",
  buildFilter,
  beforeCreate,
  beforeUpdate,
}) {
  const withPopulate = (query) => populate.reduce((q, p) => q.populate(p), query);

  const list = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 200);
    const filter = {};

    for (const f of filterFields) {
      const v = req.query[f];
      if (typeof v === "string" && v !== "") filter[f] = v;
    }
    if (typeof req.query.search === "string" && req.query.search.trim() && searchFields.length) {
      const rx = new RegExp(escapeRegex(req.query.search.trim()), "i");
      filter.$or = searchFields.map((f) => ({ [f]: rx }));
    }
    if (buildFilter) Object.assign(filter, buildFilter(req.query));

    const sort =
      typeof req.query.sort === "string" && /^-?[a-zA-Z.]+$/.test(req.query.sort)
        ? req.query.sort
        : defaultSort;

    const [data, total] = await Promise.all([
      withPopulate(Model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit)),
      Model.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  });

  const getOne = asyncHandler(async (req, res) => {
    const doc = await withPopulate(Model.findById(req.params.id));
    if (!doc) throw new AppError(`${label} not found`, 404);
    res.json({ success: true, data: doc });
  });

  const create = asyncHandler(async (req, res) => {
    let data = req.body;
    if (beforeCreate) data = await beforeCreate(data);
    const doc = await Model.create(data);
    const populated = await withPopulate(Model.findById(doc._id));
    res.status(201).json({ success: true, data: populated });
  });

  const update = asyncHandler(async (req, res) => {
    if (!Object.keys(req.body || {}).length) throw new AppError("Nothing to update", 400);
    const doc = await Model.findById(req.params.id);
    if (!doc) throw new AppError(`${label} not found`, 404);
    let data = req.body;
    if (beforeUpdate) data = await beforeUpdate(data, doc);
    doc.set(data);
    await doc.save();
    const populated = await withPopulate(Model.findById(doc._id));
    res.json({ success: true, data: populated });
  });

  const remove = asyncHandler(async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) throw new AppError(`${label} not found`, 404);
    res.json({ success: true, message: `${label} deleted` });
  });

  return { list, getOne, create, update, remove };
}