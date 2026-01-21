// index.js - ESP32 Alarm Server-side JavaScript v27.01

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';


// server.js - ESP32 Alarm WebSocket Server

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// 接続管理
const clients = {
  esp32: null,
  browsers: new Set()
};

// 静的ファイル配信
app.use(express.static(join(__dirname, 'public')));

// WebSocket接続処理
wss.on('connection', (ws, req) => {
  console.log('[WS] Connected from:', req.socket.remoteAddress);
  
  // 初期状態：ブラウザとして登録
  clients.browsers.add(ws);
  console.log(`[Browser] Total browsers: ${clients.browsers.size}`);
  
  ws.on('message', (data) => {
    const rawMessage = data.toString();
    console.log('[DEBUG] Raw received:', rawMessage);
    
    try {
      const message = JSON.parse(rawMessage);
      console.log('[WS] Parsed message type:', message.type);
      
      // クライアントタイプの識別
      if (message.type === 'esp32') {
        // ESP32として登録
        if (clients.esp32) {
          console.log('[ESP32] Closing previous connection');
          clients.esp32.close();
        }
        clients.browsers.delete(ws);
        clients.esp32 = ws;
        console.log('[ESP32] Registered');
        
        // 登録確認を送信
        const response = { type: 'registered', message: 'ESP32 registered successfully' };
        ws.send(JSON.stringify(response));
        console.log('[ESP32] Sent registration confirmation');
        return;
      }
      
      // メッセージのルーティング
      if (message.type === 'alarm' || message.type === 'stop' || message.type === 'time_sync') {
        // ブラウザからESP32へ
        console.log(`[${message.type.toUpperCase()}] Received from browser`);
        
        if (clients.esp32 && clients.esp32.readyState === 1) {
          console.log(`[${message.type.toUpperCase()}] Forwarding to ESP32:`, message);
          clients.esp32.send(JSON.stringify(message));
          console.log(`[${message.type.toUpperCase()}] Successfully forwarded`);
        } else {
          console.error('[Error] ESP32 not connected');
          console.error('[Error] ESP32 state:', clients.esp32 ? clients.esp32.readyState : 'null');
          
          if (clients.browsers.has(ws)) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'ESP32 not connected'
            }));
          }
        }
      } else if (message.type === 'alarm_status') {
        // ESP32からブラウザへ
        console.log('[Status] Received from ESP32:', message);
        console.log('[Status] Current browser count:', clients.browsers.size);
        
        let sentCount = 0;
        clients.browsers.forEach(browser => {
          if (browser.readyState === 1) {
            console.log('[Status] Sending to browser...');
            browser.send(JSON.stringify(message));
            sentCount++;
          } else {
            console.log('[Status] Browser not ready, state:', browser.readyState);
          }
        });
        console.log(`[Status] Successfully sent to ${sentCount} browser(s)`);
      } else {
        console.log('[WS] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[Error] Message parse error:', error);
      console.error('[Error] Raw message was:', rawMessage);
    }
  });
  
  ws.on('close', () => {
    console.log('[WS] Connection closed');
    if (clients.esp32 === ws) {
      clients.esp32 = null;
      console.log('[ESP32] Disconnected');
    } else {
      clients.browsers.delete(ws);
      console.log(`[Browser] Disconnected. Remaining: ${clients.browsers.size}`);
    }
  });
  
  ws.on('error', (error) => {
    console.error('[Error] WebSocket error:', error);
  });
});

// サーバー起動
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] Access: http://localhost:${PORT}`);
});

// 定期的な接続状態表示
setInterval(() => {
  const esp32Status = clients.esp32 ? `Connected (state: ${clients.esp32.readyState})` : 'Disconnected';
  console.log(`[Server] Status - ESP32: ${esp32Status}, Browsers: ${clients.browsers.size}`);
}, 60000);