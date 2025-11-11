const express = require('express');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Store connected clients
const clients = new Set();

const wss = new WebSocket.Server({ noServer: true });

// HTTP routes
app.get('/', (req, res) => {
  res.send('Hello over HTTP!')
})

// WebSocket connections
wss.on('connection', (ws) => {
  console.log('WebSocket client connected')

  ws.on('message', (message) => {
    console.log('Received:', message.toString())
    ws.send(`Hello over WebSocket!`)
  })

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
})

// HTTP server upgrade to WebSocket
const server = app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Receive GPS updates from the driver phone and broadcast to all WebSocket clients
app.post('/location', (req, res) => {
  const { busId, lat, lng, timestamp, velocity } = req.body;

  // Construct the message
  const message = JSON.stringify({
    type: 'position',
    busId,
    lat,
    lng,
    timestamp,
    velocity
  });

  // Broadcast to all connected WebSocket clients
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  res.status(200).send({ status: 'Location sent to clients' });
});
