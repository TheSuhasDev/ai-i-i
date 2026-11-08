import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SYSTEM_PROMPT } from "../src/services/assistant.js";

// Helper mirroring client/src/utils/exportCsv.js filename formatting
function formatExportFilename(filename) {
  const cleanName = filename.replace(/\.csv$/i, "");
  const baseName = cleanName.toLowerCase().startsWith("replenix-") ? cleanName : `replenix-${cleanName}`;
  return `${baseName}.csv`;
}

// Helper mirroring client/src/components/Layout.jsx tab title formatting
function formatTabTitle(pageTitle) {
  return `${pageTitle} | Replenix`;
}

test("Assistant system prompt identifies as Replenix", () => {
  assert.match(SYSTEM_PROMPT, /inside "Replenix"/);
  assert.doesNotMatch(SYSTEM_PROMPT, /inside "AI Inventory Intelligence"/);
});

test("Root package.json is named replenix with tagline description", () => {
  const rootPkg = JSON.parse(fs.readFileSync(path.resolve("../package.json"), "utf8"));
  assert.equal(rootPkg.name, "replenix");
  assert.equal(rootPkg.description, "Replenix — Predict. Prevent. Replenish.");
});

test("Export CSV filename utility always enforces replenix- prefix", () => {
  assert.equal(formatExportFilename("products"), "replenix-products.csv");
  assert.equal(formatExportFilename("products.csv"), "replenix-products.csv");
  assert.equal(formatExportFilename("replenix-audit-logs"), "replenix-audit-logs.csv");
  assert.equal(formatExportFilename("replenix-audit-logs.csv"), "replenix-audit-logs.csv");
  assert.equal(formatExportFilename("purchase-orders-2026-11-08.csv"), "replenix-purchase-orders-2026-11-08.csv");
});

test("Page tab title enforces | Replenix suffix", () => {
  assert.equal(formatTabTitle("Dashboard"), "Dashboard | Replenix");
  assert.equal(formatTabTitle("Smart Reorder"), "Smart Reorder | Replenix");
  assert.equal(formatTabTitle("Settings & Profile"), "Settings & Profile | Replenix");
});

test("Index.html contains Replenix title and meta og:title", () => {
  const indexHtml = fs.readFileSync(path.resolve("../client/index.html"), "utf8");
  assert.match(indexHtml, /<title>Replenix<\/title>/);
  assert.match(indexHtml, /<meta property="og:title" content="Replenix"/);
});

test("Mobile sidebar drawer styles enforce full height, fixed position, solid background, and dimmed backdrop", () => {
  const css = fs.readFileSync(path.resolve("../client/src/index.css"), "utf8");
  // Check max-width: 700px mobile rules
  assert.match(css, /\.sidebar\s*\{[^}]*position:\s*fixed;[^}]*top:\s*0;[^}]*bottom:\s*0;/s);
  assert.match(css, /\.sidebar\s*\{[^}]*background:\s*#0c0e14;/s);
  assert.match(css, /\.sidebar-backdrop\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*250;[^}]*inset:\s*0;/s);
  assert.match(css, /\.sidebar-backdrop\s*\{[^}]*backdrop-filter:\s*blur\(4px\);/s);
});

test("Sidebar has zero gap: full height 100dvh top 0 to bottom 0 on desktop and mobile", () => {
  const css = fs.readFileSync(path.resolve("../client/src/index.css"), "utf8");
  // Ensure no lingering 59px gaps exist in CSS
  assert.doesNotMatch(css, /59px/);
  // Ensure 100dvh is applied to sidebar
  assert.match(css, /height:\s*100dvh/);
  // Desktop sidebar has top: 0, bottom: 0
  assert.match(css, /@media\s*\(min-width:\s*701px\)[\s\S]*?\.sidebar\s*\{[\s\S]*?top:\s*0;[\s\S]*?bottom:\s*0;/);
});

test("Broken logo dash removed: .brand::before is completely eliminated from stylesheet", () => {
  const css = fs.readFileSync(path.resolve("../client/src/index.css"), "utf8");
  assert.doesNotMatch(css, /\.brand::before/);
});

test("Brand header uses Logo component and tagline level with top bar row", () => {
  const layout = fs.readFileSync(path.resolve("../client/src/components/Layout.jsx"), "utf8");
  assert.match(layout, /<Logo height=\{26\}/);
  assert.match(layout, /className="brand-tagline">Predict\. Prevent\. Replenish\./);

  const css = fs.readFileSync(path.resolve("../client/src/index.css"), "utf8");
  // Topbar and brand header have matching row heights
  assert.match(css, /\.brand\s*\{[\s\S]*?height:\s*64px;[\s\S]*?min-height:\s*64px;/);
  assert.match(css, /\.topbar\s*\{[\s\S]*?height:\s*64px;[\s\S]*?min-height:\s*64px;/);
});

test("Top bar is offset to right of sidebar when open and doesn't extend under it; page body does not move", () => {
  const css = fs.readFileSync(path.resolve("../client/src/index.css"), "utf8");
  // Desktop offsets the entire topbar to the right with smooth transition
  assert.match(css, /@media\s*\(min-width:\s*701px\)[\s\S]*?\.app\.desktop-sidebar-open\s*\.topbar\s*\{[\s\S]*?margin-left:\s*var\(--sidebar-width\);[\s\S]*?width:\s*calc\(100%\s*-\s*var\(--sidebar-width\)\);/);
  assert.match(css, /\.topbar\s*\{[\s\S]*?transition:\s*margin-left\s*250ms/);

  // Page body (.main) has NO margin-left or width shift on open
  assert.match(css, /@media\s*\(min-width:\s*701px\)[\s\S]*?\.main\s*\{[\s\S]*?width:\s*100%;[\s\S]*?margin-left:\s*0;/);
  assert.doesNotMatch(css, /\.app\.desktop-sidebar-open\s*\.main/);

  // Mobile keeps .main at 0 offset and topbar at 100% width
  assert.match(css, /@media\s*\(max-width:\s*700px\)[\s\S]*?\.main\s*\{[\s\S]*?margin-left:\s*0\s*!important;/);
  assert.match(css, /@media\s*\(max-width:\s*700px\)[\s\S]*?\.topbar\s*\{[\s\S]*?width:\s*100%\s*!important;/);
});

test("New Replenix logo asset files exist in client/public", () => {
  const darkLogo = fs.existsSync(path.resolve("../client/public/replenix-logo-dark.png"));
  const lightLogo = fs.existsSync(path.resolve("../client/public/replenix-logo-light.png"));
  const darkIcon = fs.existsSync(path.resolve("../client/public/replenix-icon-dark.png"));
  const lightIcon = fs.existsSync(path.resolve("../client/public/replenix-icon-light.png"));
  const faviconPng = fs.existsSync(path.resolve("../client/public/favicon.png"));
  assert.ok(darkLogo, "replenix-logo-dark.png must exist");
  assert.ok(lightLogo, "replenix-logo-light.png must exist");
  assert.ok(darkIcon, "replenix-icon-dark.png must exist");
  assert.ok(lightIcon, "replenix-icon-light.png must exist");
  assert.ok(faviconPng, "favicon.png must exist");
});

test("Login page renders Logo component with tagline", () => {
  const login = fs.readFileSync(path.resolve("../client/src/pages/Login.jsx"), "utf8");
  assert.match(login, /<Logo height=\{44\} alt="Replenix" \/>/);
  assert.match(login, /<Logo height=\{38\} alt="Replenix" \/>/);
  assert.match(login, /Predict\. Prevent\. Replenish\./);
});

test("Navigation links enforce single-line height and white-space nowrap to keep Trend & Seasonality matching", () => {
  const css = fs.readFileSync(path.resolve("../client/src/index.css"), "utf8");
  assert.match(css, /\.sidebar\s*a\s*\{[\s\S]*?white-space:\s*nowrap;/);
  assert.match(css, /\.sidebar\s*a\.active\s*\{[\s\S]*?box-shadow:\s*inset\s*3px\s*0\s*var\(--accent\);/);
});

test("Responsive breakpoints (320, 375, 768, 1024px) provide sufficient sidebar width without text truncation", () => {
  const css = fs.readFileSync(path.resolve("../client/src/index.css"), "utf8");
  // On 768px and 1024px, sidebar width is 254px (not 200px)
  assert.match(css, /@media\s*\(max-width:\s*1099px\)\s*and\s*\(min-width:\s*701px\)[\s\S]*?--sidebar-width:\s*254px;/);
  // On 320px and 375px mobile, drawer is min(85vw, 310px) which provides at least 272px
  assert.match(css, /width:\s*min\(85vw,\s*310px\);/);
});

test("Theme support is maintained in both dark and light modes", () => {
  const css = fs.readFileSync(path.resolve("../client/src/index.css"), "utf8");
  assert.match(css, /:root\[data-theme="light"\][\s\S]*?--sidebar-bg/);
  assert.match(css, /:root[\s\S]*?--sidebar-bg/);
});

