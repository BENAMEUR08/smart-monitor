const { Server } = require("socket.io");

module.exports = (server) => {
  const io = new Server(server);

  io.on("connection", (socket) => {
    // مشاهد انضم
    socket.on("viewer-joined", () => {
      socket.broadcast.emit("viewer-joined");
    });

    // إرسال offer
    socket.on("offer", (offer) => {
      socket.broadcast.emit("offer", offer);
    });

    // إرسال answer
    socket.on("answer", (answer) => {
      socket.broadcast.emit("answer", answer);
    });

    // إرسال ice-candidate
    socket.on("ice-candidate", (candidate) => {
      socket.broadcast.emit("ice-candidate", candidate);
    });

    // إرسال الحدود للـ ESP32
    socket.on("setLimits", (limits) => {
      mqttClient.publish("esp32/limits", JSON.stringify(limits));
      console.log("Limits sent:", limits);
    });
  });

  return io;
};