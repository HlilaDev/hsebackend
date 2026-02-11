// mqtt/mqttClient.js
const mqtt = require("mqtt");
const mqttHandler = require("./mqttHandler");

const mqttOptions = {
  clientId: "hse-mqtt-client-" + Math.random().toString(16).substr(2, 8),
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 2000
};

const client = mqtt.connect(process.env.MQTT_BROKER_URL, mqttOptions);

client.on("connect", () => {
  console.log("🚀 MQTT connected");
  client.subscribe("hse/#", { qos: 1 });
});

client.on("message", async (topic, payload, packet) => {
  const raw = payload.toString();
  console.log("📩 MQTT IN:", topic, "=>", raw);

  try {
    await mqttHandler(topic, payload, packet);
  } catch (err) {
    console.error("❌ MQTT handler error:", err.message);
  }
});


client.on("error", (err) => {
  console.error("❌ MQTT error:", err.message);
});

module.exports = client;
