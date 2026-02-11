// mqtt/parsers/gas.parser.js

module.exports = function parseGas(payload) {
  const ppm = Number(payload.ppm ?? payload.value);

  if (Number.isNaN(ppm)) {
    throw new Error("Invalid GAS payload");
  }

  return {
    values: {
      ppm
    },
    raw: payload
  };
};
