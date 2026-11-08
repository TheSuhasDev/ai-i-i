import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAuditLog } from "./crudFactory.js";

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.findOne({ email })) throw new AppError("Email already registered", 409);

  const hashed = await bcrypt.hash(password, 10);
  // Role is always "staff" for self-registration.
  const user = await User.create({ name, email, password: hashed, role: "staff" });

  res.status(201).json({ success: true, token: signToken(user), user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) throw new AppError("Invalid email or password", 401);

  writeAuditLog({
    user: user._id,
    action: "login",
    collection: "users",
    documentId: user._id,
    recordName: user.name,
    before: null,
    after: null,
  });

  res.json({ success: true, token: signToken(user), user: publicUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
  if (req.user?._id) {
    writeAuditLog({
      user: req.user._id,
      action: "logout",
      collection: "users",
      documentId: req.user._id,
      recordName: req.user.name,
      before: null,
      after: null,
    });
  }
  res.json({ success: true, message: "Signed out successfully" });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!user) throw new AppError("User not found", 404);

  const { name, currentPassword, newPassword } = req.body;
  const beforeData = { name: user.name };
  let nameChanged = false;
  let passwordChanged = false;

  if (name !== undefined && name !== null) {
    const trimmed = String(name).trim();
    if (trimmed.length < 2) {
      throw new AppError("Name must be at least 2 characters", 400);
    }
    if (trimmed !== user.name) {
      user.name = trimmed;
      nameChanged = true;
    }
  }

  if (newPassword) {
    if (String(newPassword).length < 6) {
      throw new AppError("New password must be at least 6 characters", 400);
    }
    if (!currentPassword) {
      throw new AppError("Current password is required to change password", 400);
    }
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      throw new AppError("Current password is incorrect", 400);
    }
    user.password = await bcrypt.hash(newPassword, 10);
    passwordChanged = true;
  }

  if (!nameChanged && !passwordChanged) {
    throw new AppError("No changes submitted", 400);
  }

  await user.save();

  writeAuditLog({
    user: user._id,
    action: "update",
    collection: "users",
    documentId: user._id,
    recordName: user.name,
    before: beforeData,
    after: {
      name: user.name,
      ...(passwordChanged ? { passwordUpdated: true } : {}),
    },
  });

  res.json({
    success: true,
    message: "Profile updated successfully",
    user: publicUser(user),
  });
});
