const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* WebSocket */
let espSocket = null;

wss.on("connection", (ws) => {
  ws.on("message", (msg) =>
