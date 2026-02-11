// mqtt/parsers/dht11.parser.js

module.exports = function parseDHT11(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid DHT11 payload: not an object");
  }

  const temperatureRaw = payload.temperature ?? payload.t;
  const humidityRaw = payload.humidity ?? payload.h;

  const temperature = Number(temperatureRaw);
  const humidity = Number(humidityRaw);

  if (Number.isNaN(temperature) || Number.isNaN(humidity)) {
    throw new Error(
      `Invalid DHT11 payload: temperature=${temperatureRaw}, humidity=${humidityRaw}`
    );
  }

  return {
    values: { temperature, humidity },
    raw: payload
  };
};
