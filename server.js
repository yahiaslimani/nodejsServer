const WebSocket = require('ws');

// Configuration
const PORT = process.env.PORT || 3000;

// Store active passenger connections
const passengerConnections = new Set();

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (socket, req) => {
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
  console.log('Driver connected to /api/driver-location-ws');
  
  socket.on('message', (data) => {
    try {
      // Parse incoming driver data
      const driverData = JSON.parse(data.toString());
      
      // Validate required fields
      if (typeof driverData.lat !== 'number' || typeof driverData.lng !== 'number') {
        console.error('Invalid location data received:', driverData);
        return;
      }
      
      // Process/modify data as needed (currently keeping it the same)
      const processedData = {
        ...driverData,
        // Add server timestamp if needed
        serverTimestamp: new Date().toISOString(),
        // Example of potential modifications:
        // processedVelocity: `${driverData.velocity} m/s`
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
      console.error('Raw data:', data.toString());
    }
  });
  
  socket.on('close', () => {
    console.log('Driver disconnected from /api/driver-location-ws');
  });
  
  socket.on('error', (error) => {
    console.error('Driver connection error:', error);
  });
}

// Handle passenger connections
function handlePassengerConnection(socket) {
  console.log('Passenger connected to /api/passenger-realtime-ws');
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
  wss.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});