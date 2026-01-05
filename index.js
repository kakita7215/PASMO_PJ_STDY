import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ES module 対応
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HTML 配信（index.html 等）
app.use(express.static(path.join(__dirname, "/")));

// ===== WebSocket 管理 =====
let espSocket = null;

wss.on("connection", (ws) => {
  console.log("WebSocket connected");

  ws.on("message", (msg) => {
    let data;

    // JSON 安全パース（重要）
    try {
      data = JSON.parse(msg.toString());
    } catch (e) {
      console.log("Invalid JSON:", msg.toString());
      return;
    }

    // ===== ESP32 登録 =====
    if (data.type === "esp32") {
      espSocket = ws;
      console.log("ESP32 registered");
      return;
    }

    // ===== HTML → ESP32 転送 =====
    if (data.type === "text" && espSocket) {
      espSocket.send(
        JSON.stringify({
          type: "text",
          text: data.text
        })
      );
    }
  });

  ws.on("close", () => {
    if (ws === espSocket) {
      espSocket = null;
      console.log("ESP32 disconnected");
    }
  });
});

// ===== サーバ起動 =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
