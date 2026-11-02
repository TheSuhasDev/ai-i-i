from docx.shared import Inches, Pt, RGBColor
from doc_generator.builder import (
    add_heading_1, add_heading_2, add_heading_3, add_paragraph,
    add_bullet, add_table_custom, add_code_block
)

def render_section_4(doc):
    add_heading_1(doc, "4. Database Design & Schema Reference")
    
    add_paragraph(doc, 
        "The operational persistence layer is implemented in MongoDB using Mongoose ODM schemas. "
        "The database maintains seven collections structured to optimize both high-throughput point transactions "
        "(daily sales logging, stock updates) and relational analytical queries (supplier lead-time evaluations, "
        "reorder planning, and decision-support lookups)."
    )

    add_heading_2(doc, "4.1 Entity Relationship Model (ERD) Description")
    add_paragraph(doc, 
        "Relationships across collections are established via MongoDB 12-byte ObjectIds with strategic indexing:",
        bold_prefix="Relational Structure: "
    )
    add_bullet(doc, "Supplier -> Product: One-to-many relationship. Product.suppliers contains an array of ObjectId references pointing to Supplier documents.", bold_prefix="Supplier-to-Product: ")
    add_bullet(doc, "Product -> Inventory: One-to-one relationship. Inventory.product maintains a unique index on Product._id, enforcing exactly one snapshot per product.", bold_prefix="Product-to-Inventory: ")
    add_bullet(doc, "Product -> Sale: One-to-many relationship. Sale.product references Product._id. A compound unique index on { product: 1, date: 1 } guarantees at most one recorded sales row per product per calendar date.", bold_prefix="Product-to-Sale: ")
    add_bullet(doc, "Product / Supplier -> PurchaseOrder: Many-to-one relationships. PurchaseOrder references both Product._id and Supplier._id with individual secondary indexes.", bold_prefix="PurchaseOrder References: ")
    add_bullet(doc, "Product -> Insight: One-to-one relationship. Insight.product maintains a unique index on Product._id. Insight stores the latest computed ML payload in data.", bold_prefix="Product-to-Insight: ")

    erd_text = (
        "+----------------+          1:N          +------------------+\n"
        "|    Supplier    | <--------------------+ |     Product      |\n"
        "|  - _id         |                        |  - _id           |\n"
        "|  - code (S1..8)|                        |  - code (P001..40|\n"
        "|  - name        |                        |  - sku, name     |\n"
        "|  - city        |                        |  - leadTimeDays  |\n"
        "+-------+--------+                        |  - price, cost   |\n"
        "        |                                 +---+----+-----+---+\n"
        "        | 1:N                                 |    |     |    \n"
        "        v                                 1:1 |    |     | 1:1\n"
        "+-------+---------------+ <-------------------+    |     v\n"
        "|     PurchaseOrder     |         1:N              |  +--+---------------+\n"
        "|  - _id, poNumber      |                          |  |    Inventory     |\n"
        "|  - product (Ref)      |                          |  |  - product (Ref) |\n"
        "|  - supplier (Ref)     |                          |  |  - currentStock  |\n"
        "|  - qtyOrdered/Received|                          |  |  - inTransitQty  |\n"
        "|  - status, delayDays  |                          |  +------------------+\n"
        "+-----------------------+                          |          \n"
        "                                                   | 1:N      \n"
        "                                                   v          \n"
        "                                      +------------+-----+   1:1  +------------------+\n"
        "                                      |       Sale       | -----> |     Insight      |\n"
        "                                      |  - product (Ref) |        |  - product (Ref) |\n"
        "                                      |  - date, units   |        |  - priority      |\n"
        "                                      |  - revenue       |        |  - healthScore   |\n"
        "                                      +------------------+        |  - data (Mixed)  |\n"
        "                                                                  +------------------+\n"
    )
    add_code_block(doc, erd_text, caption="Entity Relationship Diagram (ERD) Schema Links")

    # 4.2 Collection Specifications & Sample Documents
    add_heading_2(doc, "4.2 Schema Specifications & Concrete JSON Documents")

    # 1. User
    add_heading_3(doc, "4.2.1 User Collection (users)")
    u_fields = [
        ["_id", "ObjectId", "Primary Key", "MongoDB system-generated unique document identifier."],
        ["name", "String", "Required, Trim", "Full name of the system operator."],
        ["email", "String", "Required, Unique, Lowercase", "Unique login email address."],
        ["password", "String", "Required, Min 6, Select: false", "Bcrypt-hashed password (10 salt rounds). Omitted from queries by default."],
        ["role", "String", "Enum ['admin', 'manager', 'staff']", "RBAC authorization role governing route access (default 'staff')."],
        ["createdAt / updatedAt", "Date", "Timestamps", "Automatic ISO8601 audit timestamps."]
    ]
    add_table_custom(doc, ["Field Name", "BSON Type", "Constraints & Indexing", "Business Description"], u_fields, [Inches(1.5), Inches(1.1), Inches(1.7), Inches(2.2)])
    add_code_block(doc, 
        '{\n'
        '  "_id": "671142a78e12a4b89c310001",\n'
        '  "name": "Inventory Manager",\n'
        '  "email": "manager@inventory.com",\n'
        '  "role": "manager",\n'
        '  "createdAt": "2026-10-17T10:00:00.000Z",\n'
        '  "updatedAt": "2026-10-17T10:00:00.000Z"\n'
        '}',
        caption="Sample Document: User"
    )

    # 2. Supplier
    add_heading_3(doc, "4.2.2 Supplier Collection (suppliers)")
    s_fields = [
        ["_id", "ObjectId", "Primary Key", "Unique identifier for supplier."],
        ["code", "String", "Required, Unique", "Business identifier matching CSV supplier_id (S1 to S8)."],
        ["name", "String", "Required, Trim", "Commercial business name of the vendor."],
        ["contactEmail", "String", "Trim", "Primary procurement contact email."],
        ["city", "String", "Trim", "Origin fulfillment center / supplier headquarters city."],
        ["createdAt / updatedAt", "Date", "Timestamps", "Automatic audit timestamps."]
    ]
    add_table_custom(doc, ["Field Name", "BSON Type", "Constraints & Indexing", "Business Description"], s_fields, [Inches(1.5), Inches(1.1), Inches(1.7), Inches(2.2)])
    add_code_block(doc, 
        '{\n'
        '  "_id": "671142a78e12a4b89c310010",\n'
        '  "code": "S1",\n'
        '  "name": "Apex Electronics Ltd",\n'
        '  "contactEmail": "orders@apexelectronics.com",\n'
        '  "city": "Bengaluru",\n'
        '  "createdAt": "2026-10-17T10:00:00.000Z",\n'
        '  "updatedAt": "2026-10-17T10:00:00.000Z"\n'
        '}',
        caption="Sample Document: Supplier"
    )

    # 3. Product
    add_heading_3(doc, "4.2.3 Product Collection (products)")
    p_fields = [
        ["_id", "ObjectId", "Primary Key", "Unique product identifier."],
        ["code", "String", "Required, Unique", "Unique catalog code matching CSV product_id (P001 to P040)."],
        ["sku", "String", "Required, Unique, Trim", "Stock Keeping Unit code."],
        ["name", "String", "Required, Trim", "Display name of the catalog product."],
        ["imageUrl", "String", "Trim, Optional", "Relative or absolute image asset URL (/products/P001.jpg)."],
        ["category", "String", "Required, Indexed", "Merchandise category (Electronics, Accessories, Office, etc.)."],
        ["price", "Number", "Required, Min: 0", "Retail selling price per unit in currency units."],
        ["cost", "Number", "Required, Min: 0", "Procurement acquisition cost per unit."],
        ["leadTimeDays", "Number", "Required, Min: 1", "Nominal vendor fulfillment lead time in days."],
        ["suppliers", "Array[ObjectId]", "Ref: Supplier", "Array of approved vendor IDs; first supplier is primary."],
        ["isActive", "Boolean", "Default: true", "Catalog listing active status flag."],
        ["createdAt / updatedAt", "Date", "Timestamps", "Automatic audit timestamps."]
    ]
    add_table_custom(doc, ["Field Name", "BSON Type", "Constraints & Indexing", "Business Description"], p_fields, [Inches(1.5), Inches(1.1), Inches(1.7), Inches(2.2)])
    add_code_block(doc, 
        '{\n'
        '  "_id": "671142a78e12a4b89c310020",\n'
        '  "code": "P010",\n'
        '  "sku": "SKU-P010-WLK",\n'
        '  "name": "Wireless Keyboard RGB",\n'
        '  "imageUrl": "/products/P010.jpg",\n'
        '  "category": "Peripherals",\n'
        '  "price": 1499.00,\n'
        '  "cost": 850.00,\n'
        '  "leadTimeDays": 7,\n'
        '  "suppliers": ["671142a78e12a4b89c310010"],\n'
        '  "isActive": true,\n'
        '  "createdAt": "2026-10-17T10:00:00.000Z",\n'
        '  "updatedAt": "2026-10-17T10:00:00.000Z"\n'
        '}',
        caption="Sample Document: Product"
    )

    # 4. Inventory
    add_heading_3(doc, "4.2.4 Inventory Collection (inventories)")
    inv_fields = [
        ["_id", "ObjectId", "Primary Key", "Unique identifier for inventory snapshot."],
        ["product", "ObjectId", "Ref: Product, Required, Unique", "Unique 1:1 foreign reference to Product document."],
        ["currentStock", "Number", "Required, Min: 0", "Current on-hand physical warehouse stock."],
        ["inTransitQty", "Number", "Default: 0, Min: 0", "Legacy field representing nominal units in transit."],
        ["snapshotDate", "Date", "Required", "Timestamp of the physical or ledger inventory count."],
        ["createdAt / updatedAt", "Date", "Timestamps", "Automatic audit timestamps."]
    ]
    add_table_custom(doc, ["Field Name", "BSON Type", "Constraints & Indexing", "Business Description"], inv_fields, [Inches(1.5), Inches(1.1), Inches(1.7), Inches(2.2)])
    add_code_block(doc, 
        '{\n'
        '  "_id": "671142a78e12a4b89c310030",\n'
        '  "product": "671142a78e12a4b89c310020",\n'
        '  "currentStock": 0,\n'
        '  "inTransitQty": 0,\n'
        '  "snapshotDate": "2026-10-11T00:00:00.000Z",\n'
        '  "createdAt": "2026-10-17T10:00:00.000Z",\n'
        '  "updatedAt": "2026-10-17T10:00:00.000Z"\n'
        '}',
        caption="Sample Document: Inventory"
    )

    # 5. Sale
    add_heading_3(doc, "4.2.5 Sale Collection (sales)")
    sale_fields = [
        ["_id", "ObjectId", "Primary Key", "Unique sale record identifier."],
        ["product", "ObjectId", "Ref: Product, Required, Compound Index", "Foreign reference to Product document."],
        ["date", "Date", "Required, Compound Index", "Calendar date of recorded sales activity."],
        ["unitsSold", "Number", "Required, Min: 0", "Quantity of product units sold on the given date."],
        ["unitPrice", "Number", "Required, Min: 0", "Selling price realized per unit."],
        ["revenue", "Number", "Required, Min: 0", "Gross revenue (unitsSold * unitPrice)."],
        ["promoFlag", "Boolean", "Default: false", "Binary flag indicating active marketing or price promotion."]
    ]
    add_table_custom(doc, ["Field Name", "BSON Type", "Constraints & Indexing", "Business Description"], sale_fields, [Inches(1.5), Inches(1.1), Inches(1.7), Inches(2.2)])
    add_code_block(doc, 
        '{\n'
        '  "_id": "671142a78e12a4b89c310040",\n'
        '  "product": "671142a78e12a4b89c310020",\n'
        '  "date": "2026-10-10T00:00:00.000Z",\n'
        '  "unitsSold": 48,\n'
        '  "unitPrice": 1499.00,\n'
        '  "revenue": 71952.00,\n'
        '  "promoFlag": false\n'
        '}',
        caption="Sample Document: Sale"
    )

    # 6. PurchaseOrder
    add_heading_3(doc, "4.2.6 PurchaseOrder Collection (purchaseorders)")
    po_fields = [
        ["_id", "ObjectId", "Primary Key", "Unique purchase order identifier."],
        ["poNumber", "String", "Required, Unique", "Human-readable order tracking number (e.g. PO-2026-0042)."],
        ["product", "ObjectId", "Ref: Product, Required, Indexed", "Reference to ordered catalog item."],
        ["supplier", "ObjectId", "Ref: Supplier, Required, Indexed", "Reference to fulfilling vendor."],
        ["orderDate", "Date", "Required", "Timestamp when procurement order was submitted."],
        ["expectedDeliveryDate", "Date", "Required", "Contractual promised arrival date."],
        ["actualDeliveryDate", "Date", "Default: null", "Actual timestamp when shipment was checked into warehouse."],
        ["delayDays", "Number", "Default: null", "Computed slippage (actual - expected in days; negative = early)."],
        ["qtyOrdered", "Number", "Required, Min: 1", "Total units requested on the order."],
        ["qtyReceived", "Number", "Default: 0, Min: 0", "Units checked into warehouse stock."],
        ["unitCost", "Number", "Required, Min: 0", "Contractual acquisition cost per unit."],
        ["qualityIssue", "Boolean", "Default: false", "Flag indicating damaged, defective, or rejected delivery."],
        ["status", "String", "Enum: Pending, In Transit, Delivered, Cancelled", "Order lifecycle state."],
        ["createdAt / updatedAt", "Date", "Timestamps", "Automatic audit timestamps."]
    ]
    add_table_custom(doc, ["Field Name", "BSON Type", "Constraints & Indexing", "Business Description"], po_fields, [Inches(1.5), Inches(1.1), Inches(1.7), Inches(2.2)])
    add_code_block(doc, 
        '{\n'
        '  "_id": "671142a78e12a4b89c310050",\n'
        '  "poNumber": "PO-2026-0398",\n'
        '  "product": "671142a78e12a4b89c310020",\n'
        '  "supplier": "671142a78e12a4b89c310010",\n'
        '  "orderDate": "2026-10-05T00:00:00.000Z",\n'
        '  "expectedDeliveryDate": "2026-10-18T00:00:00.000Z",\n'
        '  "actualDeliveryDate": null,\n'
        '  "delayDays": null,\n'
        '  "qtyOrdered": 422,\n'
        '  "qtyReceived": 0,\n'
        '  "unitCost": 850.00,\n'
        '  "qualityIssue": false,\n'
        '  "status": "Pending",\n'
        '  "createdAt": "2026-10-05T00:00:00.000Z",\n'
        '  "updatedAt": "2026-10-05T00:00:00.000Z"\n'
        '}',
        caption="Sample Document: PurchaseOrder"
    )

    # 7. Insight
    add_heading_3(doc, "4.2.7 Insight Collection (insights)")
    ins_fields = [
        ["_id", "ObjectId", "Primary Key", "Unique document identifier."],
        ["product", "ObjectId", "Ref: Product, Required, Unique", "1:1 reference to Product document (one snapshot per item)."],
        ["productCode", "String", "Required, Indexed", "Product code matching catalog item (P001 to P040)."],
        ["asOf", "Date", "Required", "Temporal cutoff date of the underlying transactional data."],
        ["priority", "String", "Enum: Critical, High, Medium, Low, Indexed", "Intelligent replenishment alert urgency ranking."],
        ["healthScore", "Number", "Float (0.0 to 100.0)", "Composite 0-100 inventory health score."],
        ["healthStatus", "String", "Enum: Critical, Warning, Healthy, Indexed", "Discrete health categorisation."],
        ["riskPct", "Number", "Float (0.0 to 100.0)", "Calibrated stockout probability percentage."],
        ["orderQty", "Number", "Integer (>= 0)", "Prescribed smart reorder quantity in units."],
        ["daysOfCover", "Number", "Float", "Projected days of inventory coverage based on forecast demand."],
        ["marginDays", "Number", "Float", "Replenishment margin = daysOfCover - expectedDeliveryDays."],
        ["data", "Mixed", "Complete JSON Object", "Full unstructured response payload returned by ML service."],
        ["computedAt", "Date", "Default: Date.now", "Timestamp when insight was synthesized and persisted."]
    ]
    add_table_custom(doc, ["Field Name", "BSON Type", "Constraints & Indexing", "Business Description"], ins_fields, [Inches(1.5), Inches(1.1), Inches(1.7), Inches(2.2)])
    add_code_block(doc, 
        '{\n'
        '  "_id": "671142a78e12a4b89c310060",\n'
        '  "product": "671142a78e12a4b89c310020",\n'
        '  "productCode": "P010",\n'
        '  "asOf": "2026-10-11T00:00:00.000Z",\n'
        '  "priority": "Critical",\n'
        '  "healthScore": 24.2,\n'
        '  "healthStatus": "Critical",\n'
        '  "riskPct": 100.0,\n'
        '  "orderQty": 422,\n'
        '  "daysOfCover": 0.0,\n'
        '  "marginDays": -7.0,\n'
        '  "data": {\n'
        '    "product_id": "P010",\n'
        '    "name": "Wireless Keyboard RGB",\n'
        '    "classification": { "abc": "A", "xyz": "Y", "class": "AY" },\n'
        '    "forecast": { "horizon_weeks": [1, 2, 3], "predictions": [310, 318, 325] },\n'
        '    "stockout": { "stock": 0, "on_order": 0, "days_of_cover": 0.0, "margin_days": -7.0 },\n'
        '    "reorder": { "reorder_point": 422, "order_qty": 422 },\n'
        '    "health": { "score": 24.2, "status": "Critical" },\n'
        '    "supplier": { "code": "S1", "reliability": 92.5 }\n'
        '  },\n'
        '  "computedAt": "2026-10-23T18:00:00.000Z"\n'
        '}',
        caption="Sample Document: Insight"
    )
