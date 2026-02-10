require("dotenv").config();
const mqtt = require("mqtt");
const mongoose = require("mongoose");

// --- MongoDB connection (reuse later via shared/db.js)
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected (MQTT)"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

// --- MQTT connection options
const mqttOptions = {
  clientId: "hse-mqtt-client-" + Math.random().toString(16).substr(2, 8),
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 2000,
};

// --- Broker URL
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL;

// --- Connect to broker
const client = mqtt.connect(MQTT_BROKER_URL, mqttOptions);

// --- On connect
client.on("connect", () => {
  console.log("🚀 MQTT connected");

  // subscribe to all sensors
  client.subscribe("sensors/#", { qos: 1 }, (err) => {
    if (err) {
      console.error("❌ MQTT subscribe error:", err.message);
    } else {
      console.log("📡 Subscribed to sensors/#");
    }
  });
});

// --- On message
client.on("message", (topic, payload) => {
  try {
    const message = payload.toString();
    const data = JSON.parse(message);

    console.log("📥 MQTT message");
    console.log("Topic:", topic);
    console.log("Data:", data);

    // TODO: route topic → handler → save to DB
  } catch (err) {
    console.error("❌ MQTT message error:", err.message);
  }
});

// --- Errors & reconnect
client.on("error", (err) => {
  console.error("❌ MQTT error:", err.message);
});

client.on("reconnect", () => {
  console.log("🔄 MQTT reconnecting...");
});
