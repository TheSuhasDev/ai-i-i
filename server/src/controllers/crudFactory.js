import AppError from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import AuditLog from "../models/AuditLog.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function cleanAuditDoc(doc) {
  if (!doc) return null;
  const raw = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  delete raw.__v;
  return raw;
}

export function deriveRecordName(collection, doc) {
  if (!doc) return "";
  const col = String(collection || "").toLowerCase();
  if (col === "products") {
    if (doc.code && doc.name) return `${doc.code} · ${doc.name}`;
    return doc.name || doc.code || "";
  }
  if (col === "suppliers") {
    if (doc.code && doc.name) return `${doc.code} · ${doc.name}`;
    return doc.name || doc.code || "";
  }
  if (col === "purchase_orders" || col === "purchaseorders" || col === "purchase-orders") {
    return doc.poNumber || (doc._id ? `PO #${String(doc._id).slice(-6)}` : "Purchase Order");
  }
  if (col === "inventory" || col === "inventories") {
    const prodName = doc.product?.name || (doc.product?.code ? `Product ${doc.product.code}` : "");
    if (prodName) return prodName;
    return "Inventory Record";
  }
  if (col === "sales") {
    const prodName = doc.product?.name || (doc.product?.code ? `Product ${doc.product.code}` : "");
    if (prodName) return prodName;
    return "Sale Record";
  }
  if (col === "users" || col === "auth") {
    return doc.name || doc.email || "User";
  }
  return doc.name || doc.title || doc.code || "";
}

export function hasSignificantChanges(before, after) {
  if (!before && !after) return false;
  if (!before || !after) return true;

  const IGNORED = new Set([
    "_id",
    "id",
    "__v",
    "updatedAt",
    "createdAt",
    "password",
    "passwordHash",
    "token",
    "secret",
    "hash",
    "resetPasswordToken",
    "resetPasswordExpires",
  ]);

  const b = typeof before.toObject === "function" ? before.toObject() : { ...before };
  const a = typeof after.toObject === "function" ? after.toObject() : { ...after };

  const allKeys = new Set([...Object.keys(b), ...Object.keys(a)]);

  for (const k of allKeys) {
    if (IGNORED.has(k)) continue;

    const vB = b[k];
    const vA = a[k];

    // Nullish equivalence
    if ((vB === undefined || vB === null) && (vA === undefined || vA === null)) {
      continue;
    }
    if (vB === vA) continue;

    // Dates check
    if ((vB instanceof Date || typeof vB === "string") && (vA instanceof Date || typeof vA === "string")) {
      const dB = new Date(vB).getTime();
      const dA = new Date(vA).getTime();
      if (!Number.isNaN(dB) && !Number.isNaN(dA)) {
        if (dB === dA) continue;
        return true;
      }
    }

    // Number check
    if (typeof vB === "number" && typeof vA === "number") {
      if (vB === vA) continue;
      return true;
    }

    // ObjectId or referenced document comparison
    const idB = vB?._id ? String(vB._id) : (typeof vB === "object" ? null : String(vB));
    const idA = vA?._id ? String(vA._id) : (typeof vA === "object" ? null : String(vA));
    if (idB && idA && idB === idA) {
      continue;
    }

    // Deep object check
    if (typeof vB === "object" && typeof vA === "object" && vB !== null && vA !== null) {
      if (JSON.stringify(vB) === JSON.stringify(vA)) continue;
      return true;
    }

    return true;
  }

  return false;
}

export function writeAuditLog({ user, action, collection, documentId, recordName = "", before = null, after = null }) {
  if (!user || !documentId || !collection || !action) return;
  const act = String(action).toLowerCase();
  if (act === "update" && !hasSignificantChanges(before, after)) {
    return;
  }
  const docForName = after || before;
  const derived = recordName || deriveRecordName(collection, docForName);
  AuditLog.create({
    user,
    action: act,
    collection: String(collection).toLowerCase(),
    documentId,
    recordName: derived,
    before: cleanAuditDoc(before),
    after: cleanAuditDoc(after),
    at: new Date(),
  }).catch((err) => {
    console.error(`AuditLog ${action} on ${collection} failed:`, err);
  });
}

export function makeCrud({
  Model,
  label,
  auditCollection,
  populate = [],
  searchFields = [],
  filterFields = [],
  defaultSort = "-createdAt",
  buildFilter,
  buildSummary,
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

    const [data, total, summary] = await Promise.all([
      withPopulate(Model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit)),
      Model.countDocuments(filter),
      buildSummary ? buildSummary(filter, Model) : Promise.resolve(null),
    ]);

    const resObj = {
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
    if (summary !== null && summary !== undefined) {
      resObj.summary = summary;
    }

    res.json(resObj);
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

    if (auditCollection && req.user?._id) {
      writeAuditLog({
        user: req.user._id,
        action: "create",
        collection: auditCollection,
        documentId: doc._id,
        recordName: deriveRecordName(auditCollection, populated || doc),
        before: null,
        after: populated || doc,
      });
    }

    res.status(201).json({ success: true, data: populated });
  });

  const update = asyncHandler(async (req, res) => {
    if (!Object.keys(req.body || {}).length) throw new AppError("Nothing to update", 400);
    const doc = await withPopulate(Model.findById(req.params.id));
    if (!doc) throw new AppError(`${label} not found`, 404);
    const beforeData = cleanAuditDoc(doc);
    let data = req.body;
    if (beforeUpdate) data = await beforeUpdate(data, doc);
    doc.set(data);
    await doc.save();
    const populated = await withPopulate(Model.findById(doc._id));

    if (auditCollection && req.user?._id) {
      writeAuditLog({
        user: req.user._id,
        action: "update",
        collection: auditCollection,
        documentId: doc._id,
        recordName: deriveRecordName(auditCollection, populated || doc),
        before: beforeData,
        after: populated || doc,
      });
    }

    res.json({ success: true, data: populated });
  });

  const remove = asyncHandler(async (req, res) => {
    const doc = await withPopulate(Model.findById(req.params.id));
    if (!doc) throw new AppError(`${label} not found`, 404);
    const beforeData = cleanAuditDoc(doc);
    await Model.findByIdAndDelete(req.params.id);

    if (auditCollection && req.user?._id) {
      writeAuditLog({
        user: req.user._id,
        action: "delete",
        collection: auditCollection,
        documentId: doc._id,
        recordName: deriveRecordName(auditCollection, beforeData),
        before: beforeData,
        after: null,
      });
    }

    res.json({ success: true, message: `${label} deleted` });
  });

  return { list, getOne, create, update, remove };
}