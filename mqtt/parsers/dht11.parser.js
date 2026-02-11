module.exports = function parseDHT11(payload) {
  // si safeParse a renvoyé { value: "..." }
  if (payload && typeof payload === "object" && "value" in payload) {
    const s = String(payload.value);

    // ex: "16.6,55.2" (optionnel si jamais)
    const parts = s.split(/[;, ]+/).filter(Boolean);
    if (parts.length >= 2) {
      return {
        values: { temperature: Number(parts[0]), humidity: Number(parts[1]) },
        raw: payload
      };
    }

    throw new Error("Invalid DHT11 payload: string format not supported: " + s);
  }

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

  return { values: { temperature, humidity }, raw: payload };
};
