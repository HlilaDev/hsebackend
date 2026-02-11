const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const PORT = process.env.PORT || 5000;


const app = express();
const routes = require("./routes");


// middlewares
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

require('./mqtt/mqttClient');

app.use("/api", routes);
// Set the server to listen on a specific port
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


