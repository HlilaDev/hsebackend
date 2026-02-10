const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Connection URI (replace with your MongoDB URI)
    const uri = process.env.MONGO_URI;

    // Connect to MongoDB
    await mongoose.connect(uri);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
