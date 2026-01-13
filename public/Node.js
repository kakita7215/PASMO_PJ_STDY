import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
  console.log('[Server] New connection from:', req.socket.remoteAddress);
  
  // 初期状態：ブラウザとして登録
  clients.browsers.add(ws);
  console.log(`[Server] Browser clients: ${clients.browsers.size}`);
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('[WS] Received message:', message);
      
      // クライアントタイプの識別
      if (message.type === 'esp32') {
        // ESP32として登録
        if (clients.esp32) {
          console.log('[ESP32] Previous connection closed');
          clients.esp32.close();
        }
        clients.browsers.delete(ws);
        clients.esp32 = ws;
        console.log('[ESP32] Registered');
        
        // 登録確認を送信
        ws.send(JSON.stringify({ type: 'registered' }));
        return;
      }
      
      // メッセージのルーティング
      if (message.type === 'alarm' || message.type === 'stop') {
        // ブラウザからESP32へ
        if (clients.esp32 && clients.esp32.readyState === 1) {
          console.log('[Alarm] Forwarded to ESP32:', message);
          clients.esp32.send(JSON.stringify(message));
        } else {
          console.error('[Error] ESP32 not connected');
          ws.send(JSON.stringify({
            type: 'error',
            message: 'ESP32 not connected'
          }));
        }
      } else if (message.type === 'alarm_status') {
        // ESP32からブラウザへ
        console.log('[Status] Broadcasting to browsers:', message);
        let sentCount = 0;
        clients.browsers.forEach(browser => {
          if (browser.readyState === 1) {
            browser.send(JSON.stringify(message));
            sentCount++;
          }
        });
        console.log(`[Status] Sent to ${sentCount} browser(s)`);
      } else {
        console.log('[WS] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[Error] Message parse error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('[Server] Connection closed');
    if (clients.esp32 === ws) {
      clients.esp32 = null;
      console.log('[Server] ESP32 disconnected');
    } else {
      clients.browsers.delete(ws);
      console.log(`[Server] Browser disconnected. Remaining: ${clients.browsers.size}`);
    }
  });
  
  ws.on('error', (error) => {
    console.error('[Server] WebSocket error:', error);
  });
});


// サーバー起動
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] WebSocket ready`);
});

// 定期的な接続状態表示
setInterval(() => {
  console.log(`[Server] Status - ESP32: ${clients.esp32 ? 'Connected' : 'Disconnected'}, Browsers: ${clients.browsers.size}`);
}, 30000);