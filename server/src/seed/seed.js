// Seeds MongoDB from the CSVs in ml-service/data.
// Usage (from server/):  npm run seed        |  DRY_RUN=1 npm run seed  (parse only, no database)
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { parse } from "csv-parse/sync";

import User from "../models/User.js";
import Supplier from "../models/Supplier.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import Sale from "../models/Sale.js";
import PurchaseOrder, { syncInTransit } from "../models/PurchaseOrder.js";
import Insight from "../models/Insight.js";
import { computeAndStore } from "../controllers/insightsController.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../../ml-service/data");
const DRY_RUN = process.env.DRY_RUN === "1";

const readCsv = (file) =>
  parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"), { columns: true, skip_empty_lines: true });
const num = (v) => (v === "" || v === undefined ? null : Number(v));
const date = (v) => (v === "" || v === undefined ? null : new Date(`${v}T00:00:00.000Z`));

async function insertBatches(Model, docs, size = 5000) {
  for (let i = 0; i < docs.length; i += size) {
    await Model.insertMany(docs.slice(i, i + size), { ordered: false });
  }
}

async function main() {
  const suppliers = readCsv("suppliers.csv").map((r) => ({
    _id: new mongoose.Types.ObjectId(),
    code: r.supplier_id, name: r.name, contactEmail: r.contact_email, city: r.city,
  }));
  const supplierId = Object.fromEntries(suppliers.map((s) => [s.code, s._id]));

  const products = readCsv("products.csv").map((r) => ({
    _id: new mongoose.Types.ObjectId(),
    code: r.product_id, sku: r.sku, name: r.name, category: r.category,
    price: num(r.price), cost: num(r.cost), leadTimeDays: num(r.lead_time_days),
    suppliers: r.supplier_ids.split(",").map((s) => supplierId[s]),
  }));
  const productId = Object.fromEntries(products.map((p) => [p.code, p._id]));

  const inventory = readCsv("inventory_snapshot.csv").map((r) => ({
    product: productId[r.product_id], currentStock: num(r.current_stock),
    inTransitQty: num(r.in_transit_qty), snapshotDate: date(r.snapshot_date),
  }));

  const sales = readCsv("sales.csv").map((r) => ({
    product: productId[r.product_id], date: date(r.date), unitsSold: num(r.units_sold),
    unitPrice: num(r.unit_price), revenue: num(r.revenue), promoFlag: r.promo_flag === "1",
  }));

  const purchaseOrders = readCsv("purchase_orders.csv").map((r) => ({
    poNumber: r.po_id, product: productId[r.product_id], supplier: supplierId[r.supplier_id],
    orderDate: date(r.order_date), expectedDeliveryDate: date(r.expected_delivery_date),
    actualDeliveryDate: date(r.actual_delivery_date), delayDays: num(r.delay_days),
    qtyOrdered: num(r.qty_ordered), qtyReceived: num(r.qty_received), unitCost: num(r.unit_cost),
    qualityIssue: r.quality_issue === "1", status: r.status,
  }));

  // Demo users (development only). Passwords are hashed.
  const demoUsers = [
    { name: "Admin User", email: "admin@inventory.com", role: "admin", pw: "Admin@123" },
    { name: "Inventory Manager", email: "manager@inventory.com", role: "manager", pw: "Manager@123" },
    { name: "Warehouse Staff", email: "staff@inventory.com", role: "staff", pw: "Staff@123" },
  ];
  const users = await Promise.all(
    demoUsers.map(async (u) => ({ name: u.name, email: u.email, role: u.role, password: await bcrypt.hash(u.pw, 10) }))
  );

  console.log({ users: users.length, suppliers: suppliers.length, products: products.length,
    inventory: inventory.length, sales: sales.length, purchaseOrders: purchaseOrders.length });

  if (DRY_RUN) {
    console.log("DRY_RUN=1: parsed and mapped all CSVs, nothing written to the database.");
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected, clearing old data...");
  await Promise.all([User, Supplier, Product, Inventory, Sale, PurchaseOrder, Insight].map((M) => M.deleteMany({})));

  await User.insertMany(users);
  await Supplier.insertMany(suppliers);
  await Product.insertMany(products);
  await Inventory.insertMany(inventory);
  await insertBatches(Sale, sales);
  await PurchaseOrder.insertMany(purchaseOrders);
  await Promise.all(products.map((p) => syncInTransit(p._id)));

  console.log("Computing initial insights for all products...");
  for (let i = 0; i < products.length; i += 5) {
    const batch = products.slice(i, i + 5);
    await Promise.allSettled(batch.map((p) => computeAndStore(p)));
  }

  console.log("Seed complete.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});