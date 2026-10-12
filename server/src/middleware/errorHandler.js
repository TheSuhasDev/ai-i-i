import AppError from "../utils/AppError.js";

export function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || "Server error";
  let details = err.details;

  if (err.name === "ValidationError" && err.errors) {
    status = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid value for ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    status = 409;
    const fields = Object.keys(err.keyValue || {});
    message = fields.length ? `Duplicate value for: ${fields.join(", ")}` : "Duplicate value";
  } else if (err.name === "JsonWebTokenError") {
    status = 401;
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    status = 401;
    message = "Token expired, please log in again";
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
  }

  const isProd = process.env.NODE_ENV === "production";
  if (status >= 500) console.error(err);

  res.status(status).json({
    success: false,
    message: status >= 500 && isProd ? "Internal server error" : message,
    ...(details && { details }),
    ...(!isProd && status >= 500 && { stack: err.stack }),
  });
}