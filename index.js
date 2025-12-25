import express from "express";
import { WebSocketServer } from "ws";

const app = express();
app.use(express.json());

/******** HTTP + WS 共通サーバ ********/
const server = app.listen(3000, () => {
  console.log("HTTP / WebSocket server running");
});

/******** WebSocket ********/
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on("connection", ws => {
  console.log("ESP32 connected");
  clients.add(ws);

  ws.on("close", () => {
    console.log("ESP32 disconnected");
    clients.delete(ws);
  });
});

/******** HTML → Render ********/
app.post("/api/send", (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "text required" });
  }

  console.log("Send:", text);

  // 接続中のESP32へ即Push
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(text);
    }
  }

  res.json({ status: "sent" });
});
