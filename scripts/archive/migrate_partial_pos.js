import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "server/.env" });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const PO = mongoose.model("PurchaseOrder", new mongoose.Schema({
    poNumber: String,
    product: mongoose.Schema.Types.ObjectId,
    qtyOrdered: Number,
    qtyReceived: Number,
    status: String,
  }, { strict: false }));
  const Inventory = mongoose.model("Inventory", new mongoose.Schema({
    product: mongoose.Schema.Types.ObjectId,
    inTransitQty: Number,
  }, { strict: false }));

  const pos = await PO.find({
    status: "Delivered",
    $expr: { $lt: ["$qtyReceived", "$qtyOrdered"] }
  }).lean();

  console.log(`Found ${pos.length} Delivered POs with qtyReceived < qtyOrdered:`);
  for (const po of pos) {
    console.log(`- ${po.poNumber}: ordered ${po.qtyOrdered}, received ${po.qtyReceived}, remaining ${po.qtyOrdered - po.qtyReceived}`);
  }

  // Update them to "Partially Delivered"
  if (pos.length > 0) {
    const res = await PO.updateMany(
      {
        status: "Delivered",
        $expr: { $lt: ["$qtyReceived", "$qtyOrdered"] }
      },
      { $set: { status: "Partially Delivered" } }
    );
    console.log(`Migrated ${res.modifiedCount} POs to 'Partially Delivered'.`);

    // Recalculate inTransitQty for affected products
    const prodIds = [...new Set(pos.map(p => p.product.toString()))];
    for (const pid of prodIds) {
      const openOrders = await PO.find({
        product: pid,
        status: { $nin: ["Delivered", "Cancelled"] }
      }).lean();
      const inTransitQty = openOrders.reduce((sum, o) => {
        const rem = Math.max(Number(o.qtyOrdered || 0) - Number(o.qtyReceived || 0), 0);
        return sum + rem;
      }, 0);
      await Inventory.updateOne({ product: pid }, { $set: { inTransitQty } });
      console.log(`Updated product ${pid} inTransitQty to ${inTransitQty}`);
    }
  }

  // Fix PO order_date vs PO number date mismatch
  const allPOs = await PO.find({}).lean();
  let fixCount = 0;
  for (const po of allPOs) {
    const m = (po.poNumber || "").match(/^PO-(\d{4})(\d{2})(\d{2})/i);
    if (m && po.orderDate) {
      const dStr = new Date(po.orderDate).toISOString().slice(0, 10).replaceAll("-", "");
      const poDateStr = `${m[1]}${m[2]}${m[3]}`;
      if (poDateStr !== dStr) {
        const alignedDate = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
        await PO.updateOne({ _id: po._id }, { $set: { orderDate: alignedDate } });
        console.log(`Fixed date mismatch on ${po.poNumber}: orderDate set to ${alignedDate.toISOString().slice(0, 10)} (was ${new Date(po.orderDate).toISOString().slice(0, 10)})`);
        fixCount++;
      }
    }
  }
  console.log(`Fixed ${fixCount} date mismatch records.`);

  await mongoose.disconnect();
}

run().catch(console.error);

