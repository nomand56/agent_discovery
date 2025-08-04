import express from 'express';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3001;
const REGISTRY_URL = process.env.REGISTRY_URL || 'http://localhost:3000';

app.use(express.json());

// Sample weather agent implementation
const agentData = {
  agentId: 'weather-agent-001',
  name: 'Weather Assistant',
  description: 'Provides real-time weather information and forecasts for any location',
  url: `http://localhost:${PORT}`,
  tags: ['weather', 'forecast', 'location'],
  status: 'active',
  version: '1.2.0',
  capabilities: 'Weather queries, location-based forecasts, historical data',
  location: { lat: 40.7128, lon: -74.0060 } // New York
};

// Agent card endpoint (what the registry fetches)
app.get('/agentcard', (req, res) => {
  res.json({
    agentId: agentData.agentId,
    name: agentData.name,
    description: agentData.description,
    capabilities: agentData.capabilities,
    endpoints: {
      process: '/process',
      status: '/status',
      health: '/health'
    },
    examples: [
      {
        input: "What's the weather in New York?",
        output: "Currently 72°F, partly cloudy with 10% chance of rain"
      },
      {
        input: "Forecast for tomorrow in London",
        output: "Tomorrow: 65°F, mostly sunny, light winds"
      }
    ],
    configuration: {
      supportedLocations: "Global",
      updateFrequency: "5 minutes",
      dataSource: "OpenWeatherMap API"
    }
  });
});

// Process endpoint (main functionality)
app.post('/process', (req, res) => {
  const { query, location } = req.body;
  
  // Simulate weather processing
  const response = {
    query,
    location: location || 'New York',
    result: {
      temperature: '72°F',
      condition: 'Partly Cloudy',
      humidity: '65%',
      windSpeed: '8 mph',
      forecast: 'Clear skies tonight, sunny tomorrow'
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(response);
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'active',
    uptime: process.uptime(),
    version: agentData.version,
    lastUpdate: new Date().toISOString()
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Register with the registry
async function registerWithRegistry() {
  try {
    console.log('Registering with agent registry...');
    const response = await axios.post(`${REGISTRY_URL}/registry`, agentData);
    console.log('✅ Successfully registered:', response.data);
  } catch (error) {
    console.error('❌ Failed to register:', error.response?.data || error.message);
  }
}

// Start server and register
async function startAgent() {
  app.listen(PORT, () => {
    console.log(`🌤️ Weather Agent running on port ${PORT}`);
    console.log(`Agent Card: http://localhost:${PORT}/agentcard`);
    console.log(`Process: http://localhost:${PORT}/process`);
    console.log(`Status: http://localhost:${PORT}/status`);
  });
  
  // Wait a moment for the registry to be ready, then register
  setTimeout(registerWithRegistry, 2000);
}

startAgent().catch(console.error); 