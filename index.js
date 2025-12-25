import express from "express";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

/******** HTML配信 ********/
app.use(express.static(path.join(__dirname, "public")));

/******** HTTP + WS ********/
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

  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(text);
    }
  }

  res.json({ status: "sent" });
});
