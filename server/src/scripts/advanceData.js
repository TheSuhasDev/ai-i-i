// Script to advance inventory data by 1 or more days (or up to today).
// Usage (from server/): npm run data:advance [days]
import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import Sale from "../models/Sale.js";
import PurchaseOrder, { syncInTransit } from "../models/PurchaseOrder.js";
import { computeAndStore } from "../controllers/insightsController.js";

export async function advanceData(daysToAdvance = 1) {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for data advancement...");

  const maxSale = await Sale.findOne().sort({ date: -1 }).select("date").lean();
  if (!maxSale) {
    console.log("No sales found in database. Please run npm run seed first.");
    await mongoose.disconnect();
    return null;
  }

  const currentDate = new Date(maxSale.date);
  if (daysToAdvance <= 0) {
    console.log("daysToAdvance is 0 or negative. No data advancement needed.");
    await mongoose.disconnect();
    return { previousDate: currentDate.toISOString().slice(0, 10), newDate: currentDate.toISOString().slice(0, 10), totalNewSales: 0 };
  }
  const products = await Product.find({ isActive: true }).lean();
  const inventories = await Inventory.find().lean();
  const invMap = new Map(inventories.map((i) => [String(i.product), i]));

  console.log(`Current max sale date in DB: ${currentDate.toISOString().slice(0, 10)}`);
  console.log(`Advancing data by ${daysToAdvance} day(s)...`);

  let totalNewSales = 0;
  let deliveredPOs = 0;

  for (let d = 1; d <= daysToAdvance; d++) {
    const nextDate = new Date(currentDate.getTime() + d * 86400000);
    const dateStr = nextDate.toISOString().slice(0, 10);
    console.log(`Processing date: ${dateStr}`);

    const newSales = [];

    for (const prod of products) {
      const inv = invMap.get(String(prod._id));
      const currentStock = inv ? inv.currentStock : 0;
      // Generate realistic daily sales: 1 to 5 units depending on price / category, capped by stock
      const baseUnits = Math.max(1, Math.round(prod.price > 5000 ? 1 : prod.price > 1000 ? 2 : 4));
      const unitsSold = Math.min(currentStock, Math.max(0, baseUnits + Math.floor(Math.random() * 3) - 1));

      newSales.push({
        product: prod._id,
        date: nextDate,
        unitsSold,
        unitPrice: prod.price,
        revenue: unitsSold * prod.price,
        promoFlag: false,
      });

      if (inv) {
        inv.currentStock = Math.max(0, currentStock - unitsSold);
        inv.snapshotDate = nextDate;
      }
    }

    if (newSales.length) {
      await Sale.insertMany(newSales);
      totalNewSales += newSales.length;
    }

    // Deliver POs due on or before nextDate
    const duePOs = await PurchaseOrder.find({
      status: { $in: ["Pending", "In Transit", "Approved"] },
      expectedDeliveryDate: { $lte: nextDate },
    });

    for (const po of duePOs) {
      po.status = "Delivered";
      po.actualDeliveryDate = nextDate;
      po.qtyReceived = po.qtyOrdered;
      await po.save();
      deliveredPOs++;

      const inv = invMap.get(String(po.product));
      if (inv) {
        inv.currentStock += po.qtyOrdered;
      }
    }

    // Persist updated inventory snapshots
    for (const inv of invMap.values()) {
      await Inventory.updateOne(
        { _id: inv._id },
        { currentStock: inv.currentStock, snapshotDate: inv.snapshotDate }
      );
    }
  }

  // Sync in-transit and refresh insights for all products
  await Promise.all(products.map((p) => syncInTransit(p._id)));
  console.log("Recomputing insights for all products...");
  for (let i = 0; i < products.length; i += 5) {
    const batch = products.slice(i, i + 5);
    await Promise.allSettled(batch.map((p) => computeAndStore(p)));
  }

  const finalMaxSale = await Sale.findOne().sort({ date: -1 }).select("date").lean();
  const finalDateStr = finalMaxSale ? finalMaxSale.date.toISOString().slice(0, 10) : "unknown";

  console.log("Advancement complete!");
  console.log({
    previousDate: currentDate.toISOString().slice(0, 10),
    newDate: finalDateStr,
    totalNewSales,
    deliveredPOs,
  });

  await mongoose.disconnect();
  return { previousDate: currentDate.toISOString().slice(0, 10), newDate: finalDateStr, totalNewSales };
}

// Execute when run directly via CLI
if (process.argv[1] && process.argv[1].endsWith("advanceData.js")) {
  const daysArg = process.argv[2] !== undefined ? parseInt(process.argv[2], 10) : 1;
  advanceData(daysArg)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Advance data failed:", err);
      process.exit(1);
    });
}
