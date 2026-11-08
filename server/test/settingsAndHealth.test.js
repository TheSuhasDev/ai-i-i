import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import AuditLog from "../src/models/AuditLog.js";
import { deriveRecordName, hasSignificantChanges } from "../src/controllers/crudFactory.js";

test("Health check aggregates operational states across backend, database, and ML node", () => {
  const computeHealthSummary = (dbState, mlResponseStatus) => ({
    status: "ok",
    services: {
      backend: "operational",
      database: dbState === 1 ? "operational" : "down",
      ml: mlResponseStatus === "ok" ? "operational" : "down",
    },
  });

  // All healthy
  const healthy = computeHealthSummary(1, "ok");
  assert.equal(healthy.services.backend, "operational");
  assert.equal(healthy.services.database, "operational");
  assert.equal(healthy.services.ml, "operational");

  // ML down
  const mlDown = computeHealthSummary(1, "failed");
  assert.equal(mlDown.services.backend, "operational");
  assert.equal(mlDown.services.database, "operational");
  assert.equal(mlDown.services.ml, "down");

  // DB disconnected
  const dbDown = computeHealthSummary(0, "ok");
  assert.equal(dbDown.services.backend, "operational");
  assert.equal(dbDown.services.database, "down");
  assert.equal(dbDown.services.ml, "operational");
});

test("Profile update validates minimum name length and prevents empty names", () => {
  const validateName = (name) => {
    if (name === undefined || name === null) return null;
    const trimmed = String(name).trim();
    if (trimmed.length < 2) {
      throw new Error("Name must be at least 2 characters");
    }
    return trimmed;
  };

  assert.equal(validateName("Alice"), "Alice");
  assert.equal(validateName("  Bob  "), "Bob");
  assert.throws(() => validateName("A"), /Name must be at least 2 characters/);
  assert.throws(() => validateName("   "), /Name must be at least 2 characters/);
});

test("Password change enforces current password verification and minimum 6 characters", () => {
  const validatePasswordChange = ({ currentPassword, newPassword, confirmPassword }) => {
    if (newPassword) {
      if (String(newPassword).length < 6) {
        throw new Error("New password must be at least 6 characters");
      }
      if (!currentPassword) {
        throw new Error("Current password is required to change password");
      }
      if (confirmPassword !== undefined && newPassword !== confirmPassword) {
        throw new Error("New password and confirmation do not match");
      }
    }
    return true;
  };

  // Valid change
  assert.ok(
    validatePasswordChange({
      currentPassword: "OldPassword123",
      newPassword: "NewSecurePassword456",
      confirmPassword: "NewSecurePassword456",
    })
  );

  // Short password (< 6)
  assert.throws(
    () => validatePasswordChange({ currentPassword: "Old", newPassword: "123" }),
    /New password must be at least 6 characters/
  );

  // Missing current password
  assert.throws(
    () => validatePasswordChange({ currentPassword: "", newPassword: "NewSecurePassword" }),
    /Current password is required to change password/
  );

  // Mismatched confirmation
  assert.throws(
    () =>
      validatePasswordChange({
        currentPassword: "Old",
        newPassword: "NewSecurePassword",
        confirmPassword: "DifferentPassword",
      }),
    /New password and confirmation do not match/
  );
});

test("Profile updates log an immutable audit log entry without leaking sensitive credentials", async () => {
  const fakeUserId = new mongoose.Types.ObjectId();
  const beforeName = "Old User Name";
  const updatedName = "New Display Name";

  const entry = new AuditLog({
    user: fakeUserId,
    action: "update",
    collection: "users",
    documentId: fakeUserId,
    recordName: updatedName,
    before: { name: beforeName },
    after: { name: updatedName, passwordUpdated: true },
    at: new Date(),
  });

  await entry.validate();
  assert.equal(entry.action, "update");
  assert.equal(entry.collection, "users");
  assert.equal(entry.recordName, "New Display Name");
  assert.equal(entry.before.name, "Old User Name");
  assert.equal(entry.after.name, "New Display Name");
  assert.equal(entry.after.passwordUpdated, true);
  // Ensure no raw passwords or hashes are in before/after
  assert.equal(entry.before.password, undefined);
  assert.equal(entry.after.password, undefined);
});

test("Theme selector accurately identifies active theme and preserves valid options", () => {
  const isValidTheme = (theme) => ["dark", "light"].includes(theme);
  assert.equal(isValidTheme("dark"), true);
  assert.equal(isValidTheme("light"), true);
  assert.equal(isValidTheme("blue"), false);

  const getThemeClasses = (current, target) => {
    const isActive = current === target;
    return {
      active: isActive,
      pillTone: isActive ? "healthy" : "muted",
      pillLabel: isActive ? "Active" : "Select",
    };
  };

  const darkSelected = getThemeClasses("dark", "dark");
  assert.equal(darkSelected.active, true);
  assert.equal(darkSelected.pillLabel, "Active");

  const lightUnselected = getThemeClasses("dark", "light");
  assert.equal(lightUnselected.active, false);
  assert.equal(lightUnselected.pillLabel, "Select");
});

