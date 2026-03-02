const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const connectDB = require("./config/db");

const app = express();
const routes = require("./routes");

// ✅ IMPORTANT: autoriser cookies + origin front
app.use(
  cors({
    origin: "http://localhost:4200", //  Angular
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

connectDB();
require("./mqtt/mqttClient");

app.use("/api", routes);

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server running on port ${port}`));