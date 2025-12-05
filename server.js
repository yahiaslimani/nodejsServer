/*const WebSocket = require('ws');

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
*/
const WebSocket = require('ws');

// Configuration
const DRIVER_WS_URL = process.env.DRIVER_WS_URL || 'ws://localhost:8080/driver'; // Internal endpoint for drivers
const PASSENGER_WS_URL = process.env.PASSENGER_WS_URL || 'ws://localhost:8081/passenger'; // Internal endpoint for passengers
const PORT = process.env.PORT || 3000;

// Store active passenger connections
const passengerConnections = new Set();

// Create WebSocket servers
const server = new WebSocket.Server({ port: PORT });

// Handle incoming connections
server.on('connection', (socket, req) => {
  const url = req.url;
  
  if (url === '/api/driver-location-ws') {
    handleDriverConnection(socket);
  } else if (url === '/api/passenger-realtime-ws') {
    handlePassengerConnection(socket);
  } else {
    socket.close(1008, 'Invalid endpoint');
  }
});

// Handle driver connections
function handleDriverConnection(socket) {
  console.log('Driver connected');
  
  socket.on('message', (data) => {
    try {
      // Parse incoming driver data
      const driverData = JSON.parse(data.toString());
      
      // Process/modify data as needed (currently keeping it the same)
      const processedData = {
        ...driverData,
        // Example of potential modifications:
        // processedTimestamp: new Date().toISOString(),
        // formattedVelocity: `${driverData.velocity} m/s`
      };
      
      // Broadcast to all passengers
      const payload = JSON.stringify(processedData);
      const disconnected = [];
      
      for (const passengerSocket of passengerConnections) {
        if (passengerSocket.readyState === WebSocket.OPEN) {
          passengerSocket.send(payload);
        } else {
          disconnected.push(passengerSocket);
        }
      }
      
      // Clean up disconnected passengers
      for (const socket of disconnected) {
        passengerConnections.delete(socket);
      }
      
      console.log(`Broadcasted to ${passengerConnections.size} passengers:`, processedData);
    } catch (error) {
      console.error('Error processing driver message:', error);
    }
  });
  
  socket.on('close', () => {
    console.log('Driver disconnected');
  });
  
  socket.on('error', (error) => {
    console.error('Driver connection error:', error);
  });
}

// Handle passenger connections
function handlePassengerConnection(socket) {
  console.log('Passenger connected');
  passengerConnections.add(socket);
  
  // Send welcome message
  socket.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to real-time location service',
    timestamp: new Date().toISOString()
  }));
  
  // Handle passenger disconnection
  socket.on('close', () => {
    passengerConnections.delete(socket);
    console.log('Passenger disconnected. Active passengers:', passengerConnections.size);
  });
  
  socket.on('error', (error) => {
    console.error('Passenger connection error:', error);
    passengerConnections.delete(socket);
  });
}

console.log(`Server listening on port ${PORT}`);
console.log(`Driver endpoint: /api/driver-location-ws`);
console.log(`Passenger endpoint: /api/passenger-realtime-ws`);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});