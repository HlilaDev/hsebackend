const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
require("dotenv").config();

const connectDB = require("./config/db");
const routes = require("./routes");
const path = require("path");
const fs = require("fs");

const { startDeviceHeartbeatMonitor } = require("./services/deviceHeartbeatMonitor");
const { initSocket } = require("./socket/socketServer");

const app = express();

// ✅ Créer automatiquement le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ✅ CORS
app.use(
  cors({
    origin: "http://localhost:4200",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// ✅ Servir les images statiquement
app.use("/uploads", express.static(uploadsDir));

// ✅ Route upload
app.use("/api/upload", require("./routes/uploadRoutes"));

// ✅ Routes API
app.use("/api", routes);

// ✅ Connect DB
connectDB();

// ✅ MQTT
require("./mqtt/mqttClient");

// ✅ Create HTTP server
const server = http.createServer(app);

// ✅ Init Socket.IO
initSocket(server);

const port = process.env.PORT || 3001;
server.listen(port, () => console.log(`Server running on port ${port}`));


//offline devices Checker
startDeviceHeartbeatMonitor();
console.log("✅ Device heartbeat monitor started");