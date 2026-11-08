import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const email = z.string().trim().email("Invalid email");

// ---- Auth ----
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

// ---- Supplier ----
export const supplierCreate = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(2),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  contactEmail: email.optional().or(z.literal("")),
  city: z.string().trim().optional(),
});
export const supplierUpdate = supplierCreate.partial();

// ---- Product ----
export const productCreate = z
  .object({
    code: z.string().trim().min(1),
    sku: z.string().trim().min(1),
    name: z.string().trim().min(2),
    category: z.string().trim().min(1),
    price: z.coerce.number().min(0),
    cost: z.coerce.number().min(0),
    leadTimeDays: z.coerce.number().int().min(1),
    suppliers: z.array(objectId).min(1).max(2).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.price >= data.cost, {
    message: "Selling price must be greater than or equal to unit cost",
    path: ["price"],
  });
export const productUpdate = z.object({
  code: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1).optional(),
  name: z.string().trim().min(2).optional(),
  category: z.string().trim().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  cost: z.coerce.number().min(0).optional(),
  leadTimeDays: z.coerce.number().int().min(1).optional(),
  suppliers: z.array(objectId).min(1).max(2).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => data.price === undefined || data.cost === undefined || data.price >= data.cost, {
  message: "Selling price must be greater than or equal to unit cost",
  path: ["price"],
});

// ---- Inventory ----
export const inventoryCreate = z.object({
  product: objectId,
  currentStock: z.coerce.number().int().min(0),
  inTransitQty: z.coerce.number().int().min(0).optional(),
  snapshotDate: z.coerce.date(),
});
export const inventoryUpdate = inventoryCreate.partial();

// ---- Sale ----
export const saleCreate = z.object({
  product: objectId,
  date: z.coerce.date(),
  unitsSold: z.coerce.number().int().min(0),
  unitPrice: z.coerce.number().min(0),
  revenue: z.coerce.number().min(0).optional(), // computed if omitted
  promoFlag: z.boolean().optional(),
});
export const saleUpdate = saleCreate.partial();

// ---- Purchase order ----
export const poCreate = z
  .object({
    poNumber: z.string().trim().min(1),
    product: objectId,
    supplier: objectId,
    orderDate: z.coerce.date(),
    expectedDeliveryDate: z.coerce.date(),
    actualDeliveryDate: z.coerce.date().nullable().optional(),
    delayDays: z.coerce.number().int().nullable().optional(),
    qtyOrdered: z.coerce.number().int().min(1),
    qtyReceived: z.coerce.number().int().min(0).optional(),
    unitCost: z.coerce.number().min(0),
    qualityIssue: z.boolean().optional(),
    status: z.enum(["Pending", "Approved", "In Transit", "Partially Delivered", "Delivered", "Cancelled"]).optional(),
    confirmDuplicate: z.boolean().optional(),
  })
  .refine(
    (data) => new Date(data.expectedDeliveryDate).getTime() >= new Date(data.orderDate).getTime(),
    {
      message: "Expected delivery date cannot be before order date",
      path: ["expectedDeliveryDate"],
    }
  );
export const poUpdate = z.object({
  poNumber: z.string().trim().min(1).optional(),
  product: objectId.optional(),
  supplier: objectId.optional(),
  orderDate: z.coerce.date().optional(),
  expectedDeliveryDate: z.coerce.date().optional(),
  actualDeliveryDate: z.coerce.date().nullable().optional(),
  delayDays: z.coerce.number().int().nullable().optional(),
  qtyOrdered: z.coerce.number().int().min(1).optional(),
  qtyReceived: z.coerce.number().int().min(0).optional(),
  unitCost: z.coerce.number().min(0).optional(),
  qualityIssue: z.boolean().optional(),
  status: z.enum(["Pending", "Approved", "In Transit", "Partially Delivered", "Delivered", "Cancelled"]).optional(),
  confirmDuplicate: z.boolean().optional(),
}).refine(
  (data) => {
    if (!data.expectedDeliveryDate || !data.orderDate) return true;
    return new Date(data.expectedDeliveryDate).getTime() >= new Date(data.orderDate).getTime();
  },
  {
    message: "Expected delivery date cannot be before order date",
    path: ["expectedDeliveryDate"],
  }
);
