// middlewares/errorHandler.js

// Not found middleware (optional but very useful)
exports.notFound = (req, res, next) => {
  const err = new Error(`Not Found - ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

// Central error handler
exports.errorHandler = (err, req, res, next) => {
  // Default status & message
  let statusCode = err.statusCode || 500;
  let message = err.message || "Server Error";

  // Mongoose: invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  }

  // Mongoose: duplicate key
  // e.g. email unique
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already exists` : "Duplicate field value";
  }

  // Mongoose: validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(", ");
  }

  return res.status(statusCode).json({
    success: false,
    message,
    // show stack only in dev
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
};
