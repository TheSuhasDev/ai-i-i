import AppError from "../utils/AppError.js";

// Validates req.body against a Zod schema. Unknown fields are stripped.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    return next(new AppError("Validation failed", 400, details));
  }
  req.body = result.data;
  next();
};