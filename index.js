import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static("./public"));

let espSocket = null;
let lastAlarmSettings = null; // ESP32再接続時に送信

wss.on("connection", (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  console.log(`[WS] Connected from ${clientIP}`);

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg.toString());
    } catch (e) {
      console.error("[WS] Invalid JSON:", msg.toString());
      return;
    }

    // ESP32登録
    if (data.type === "esp32") {
      espSocket = ws;
      console.log("[ESP32] Registered");
      
      // 最後のアラーム設定を送信（再接続時）
      if (lastAlarmSettings) {
        ws.send(JSON.stringify(lastAlarmSettings));
        console.log("[ESP32] Sent stored alarm:", lastAlarmSettings);
      }
      
      // 登録完了を返信
      ws.send(JSON.stringify({ 
        type: "registered", 
        message: "ESP32 registered successfully" 
      }));
      return;
    }

    // HTML → ESP32 (アラーム設定)
    if (data.type === "alarm") {
      lastAlarmSettings = data; // 設定を保存
      
      if (espSocket && espSocket.readyState === 1) { // OPEN
        espSocket.send(JSON.stringify(data));
        console.log("[Alarm] Forwarded to ESP32:", data);
        
        // HTML側に成功を返信
        ws.send(JSON.stringify({ 
          type: "alarm_ack", 
          success: true,
          message: "Alarm sent to ESP32"
        }));
      } else {
        console.log("[Alarm] ESP32 not connected");
        
        // HTML側にエラーを返信
        ws.send(JSON.stringify({ 
          type: "alarm_ack", 
          success: false,
          message: "ESP32 is not connected"
        }));
      }
    }
  });

  ws.on("close", () => {
    if (ws === espSocket) {
      espSocket = null;
      console.log("[ESP32] Disconnected");
    } else {
      console.log("[WS] Client disconnected");
    }
  });

  ws.on("error", (err) => {
    console.error("[WS] Error:", err.message);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] Access: http://localhost:${PORT}`);
});