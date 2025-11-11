const WebSocket = require('ws');

// Create WebSocket server
const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Handle incoming messages
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    
    // Broadcast to all connected clients except sender
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log('WebSocket server running on port', process.env.PORT || 3000);