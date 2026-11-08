import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { runTool, toolDefinitions } from "../src/services/assistantTools.js";

// Message validation schema mirroring server/src/routes/assistant.js
const messageSchema = z
  .object({
    messages: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
      .min(1)
      .max(20),
  })
  .refine((b) => b.messages[b.messages.length - 1].role === "user", {
    message: "The last message must be from the user",
    path: ["messages"],
  });

// Answer parser mirroring client/src/components/ChatMessages.jsx
function parseAnswer(text) {
  const sections = [];
  let cur = null;
  (text || "").split("\n").forEach((line) => {
    const clean = line.replace(/^[*_#\s]+/, "").trim();
    const match = clean.match(/^(facts?|recommendations?)\b/i);
    if (match) {
      cur = { kind: match[1].toLowerCase().startsWith("fact") ? "facts" : "recommendation", lines: [] };
      sections.push(cur);
    } else {
      if (!cur) {
        cur = { kind: "other", lines: [] };
        sections.push(cur);
      }
      cur.lines.push(line);
    }
  });
  return sections.filter((section) => section.lines.join("").trim());
}

test("Assistant message schema accepts valid user prompt and rejects empty/oversized prompts", () => {
  // Valid prompt
  const valid = messageSchema.safeParse({
    messages: [{ role: "user", content: "Which products should I reorder today?" }],
  });
  assert.equal(valid.success, true);

  // Rejects empty content
  const emptyContent = messageSchema.safeParse({
    messages: [{ role: "user", content: "   " }],
  });
  assert.equal(emptyContent.success, false);

  // Rejects prompt over 2000 characters
  const tooLong = messageSchema.safeParse({
    messages: [{ role: "user", content: "A".repeat(2001) }],
  });
  assert.equal(tooLong.success, false);

  // Rejects conversation ending with assistant
  const endingWithAssistant = messageSchema.safeParse({
    messages: [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
    ],
  });
  assert.equal(endingWithAssistant.success, false);
});

test("Assistant tool definitions cover all 5 suggested question domains", () => {
  const names = new Set(toolDefinitions.map((t) => t.name));
  // Q1: Reorders
  assert.ok(names.has("list_reorder_recommendations"));
  // Q2: Supplier delays
  assert.ok(names.has("get_supplier_risk"));
  // Q3: Overstocked products
  assert.ok(names.has("list_overstocked"));
  // Q4: What-if portfolio simulation
  assert.ok(names.has("simulate_all"));
  // Q5: Product drilldown & risk explain
  assert.ok(names.has("search_products"));
  assert.ok(names.has("get_product_insight"));
  assert.ok(names.has("explain_stockout_risk"));
});

test("runTool gracefully handles unknown tools and invalid parameters", async () => {
  const unknown = await runTool("nonexistent_tool", {});
  assert.equal(unknown.error, true);
  const unknownJson = JSON.parse(unknown.text);
  assert.match(unknownJson.error, /Unknown tool/);

  // list_reorder_recommendations with negative or out-of-range limit
  const invalidLimit = await runTool("list_reorder_recommendations", { limit: 999 });
  assert.equal(invalidLimit.error, true);
  const invalidJson = JSON.parse(invalidLimit.text);
  assert.match(invalidJson.error, /Invalid input/);
});

test("parseAnswer correctly extracts facts and recommendations from standard and markdown-styled headers", () => {
  // 1. Standard markdown headers
  const std = `## Facts
- P001 stock is 117 units.
## Recommendation
- Reorder 240 units today.`;
  const parsedStd = parseAnswer(std);
  assert.equal(parsedStd.length, 2);
  assert.equal(parsedStd[0].kind, "facts");
  assert.equal(parsedStd[1].kind, "recommendation");

  // 2. Bold wrapped markdown headers (**## Facts**) commonly returned by LLMs
  const boldWrapped = `**## Facts**
- 16 products need reorder.
**## Recommendation**
- Place emergency orders for critical items.`;
  const parsedBold = parseAnswer(boldWrapped);
  assert.equal(parsedBold.length, 2);
  assert.equal(parsedBold[0].kind, "facts");
  assert.equal(parsedBold[1].kind, "recommendation");

  // 3. Colon style (**Facts:**)
  const colonStyle = `**Facts:**
- Overstock detected for 6 products.
**Recommendation:**
- Slow down replenishment.`;
  const parsedColon = parseAnswer(colonStyle);
  assert.equal(parsedColon.length, 2);
  assert.equal(parsedColon[0].kind, "facts");
  assert.equal(parsedColon[1].kind, "recommendation");
});

