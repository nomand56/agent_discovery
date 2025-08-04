import axios from 'axios';

const REGISTRY_URL = 'http://localhost:3000';

class AgentRegistryClient {
  constructor(baseUrl = REGISTRY_URL) {
    this.baseUrl = baseUrl;
  }

  // Search for agents
  async searchAgents(params = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, { params });
      return response.data;
    } catch (error) {
      console.error('Search failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get agent metadata
  async getAgent(agentId) {
    try {
      const response = await axios.get(`${this.baseUrl}/agent/${agentId}`);
      return response.data;
    } catch (error) {
      console.error('Get agent failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get full agent card
  async getAgentCard(agentId) {
    try {
      const response = await axios.get(`${this.baseUrl}/agentcard/${agentId}`);
      return response.data;
    } catch (error) {
      console.error('Get agent card failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // List all agents
  async listAgents(page = 1, perPage = 20) {
    try {
      const response = await axios.get(`${this.baseUrl}/agents`, {
        params: { page, perPage }
      });
      return response.data;
    } catch (error) {
      console.error('List agents failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Check registry health
  async health() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Example usage
async function demonstrateClient() {
  const client = new AgentRegistryClient();

  console.log('🤖 Agent Registry Client Demo\n');

  // Check health
  try {
    const health = await client.health();
    console.log('✅ Registry Health:', health.status);
  } catch (error) {
    console.log('❌ Registry not available');
    return;
  }

  // Search for weather agents
  console.log('\n🔍 Searching for weather agents...');
  try {
    const weatherResults = await client.searchAgents({ q: 'weather' });
    console.log(`Found ${weatherResults.agents.length} weather agents:`);
    weatherResults.agents.forEach(agent => {
      console.log(`  - ${agent.name} (${agent.agentId})`);
    });
  } catch (error) {
    console.log('No weather agents found');
  }

  // Search by tags
  console.log('\n🏷️ Searching for finance agents...');
  try {
    const financeResults = await client.searchAgents({ tags: 'finance,stocks' });
    console.log(`Found ${financeResults.agents.length} finance agents:`);
    financeResults.agents.forEach(agent => {
      console.log(`  - ${agent.name} (${agent.agentId})`);
    });
  } catch (error) {
    console.log('No finance agents found');
  }

  // Geospatial search
  console.log('\n🌍 Searching for agents near New York...');
  try {
    const geoResults = await client.searchAgents({
      lat: 40.7128,
      lon: -74.0060,
      sort: 'distance'
    });
    console.log(`Found ${geoResults.agents.length} agents near New York:`);
    geoResults.agents.forEach(agent => {
      const distance = agent.distance ? `${agent.distance.toFixed(2)}km` : 'unknown';
      console.log(`  - ${agent.name} (${distance} away)`);
    });
  } catch (error) {
    console.log('No agents found near New York');
  }

  // Get specific agent details
  console.log('\n👤 Getting weather agent details...');
  try {
    const agent = await client.getAgent('weather-agent-001');
    console.log('Agent Details:', {
      name: agent.name,
      description: agent.description,
      status: agent.status,
      tags: agent.tags
    });
  } catch (error) {
    console.log('Weather agent not found');
  }

  // Get full agent card
  console.log('\n🃏 Getting weather agent card...');
  try {
    const agentCard = await client.getAgentCard('weather-agent-001');
    console.log('Agent Card:', {
      name: agentCard.name,
      cached: agentCard.cached,
      endpoints: agentCard.endpoints,
      examples: agentCard.examples?.length || 0
    });
  } catch (error) {
    console.log('Could not fetch agent card');
  }

  // List all agents
  console.log('\n📋 Listing all agents...');
  try {
    const allAgents = await client.listAgents(1, 10);
    console.log(`Total agents: ${allAgents.pagination.total}`);
    console.log('Recent agents:');
    allAgents.agents.forEach(agent => {
      console.log(`  - ${agent.name} (${agent.status})`);
    });
  } catch (error) {
    console.log('Could not list agents');
  }

  console.log('\n✨ Demo completed!');
}

// Run the demo
demonstrateClient().catch(console.error); 