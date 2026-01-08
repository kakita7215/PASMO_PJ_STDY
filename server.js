import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static("./"));

let espSocket = null;

wss.on("connection", (ws) => {
  console.log("WS connected");

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg.toString());
    } catch {
      return;
    }

    // ESP32登録
    if (data.type === "esp32") {
      espSocket = ws;
      console.log("ESP32 registered");
      return;
    }

    // HTML → ESP32
    if (data.type === "alarm" && espSocket) {
      espSocket.send(JSON.stringify(data));
      console.log("Alarm forwarded:", data);
    }
  });

  ws.on("close", () => {
    if (ws === espSocket) espSocket = null;
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running:", PORT);
});
