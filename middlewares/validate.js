// middlewares/validate.js
// Usage: validate(schema, "body" | "query" | "params")

module.exports = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,   // return all errors, not just first
      stripUnknown: true   // remove fields not in schema
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((d) => d.message)
      });
    }

    // replace with validated & cleaned data
    req[property] = value;
    next();
  };
};
