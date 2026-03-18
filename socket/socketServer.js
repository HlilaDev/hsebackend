const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { setIo } = require("./socket");

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  setIo(io);

  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers?.cookie || "";
      const tokenMatch = cookieHeader.match(/access_token=([^;]+)/);

      if (!tokenMatch) {
        return next();
      }

      const token = decodeURIComponent(tokenMatch[1]);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next();
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
      console.log(`Socket ${socket.id} joined room user:${socket.user.id}`);
    }

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", socket.id, reason);
    });
  });

  return io;
}

module.exports = {
  initSocket,
};