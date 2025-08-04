import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

// Test data
const testAgents = [
  {
    agentId: 'weather-agent-001',
    name: 'Weather Assistant',
    description: 'Provides real-time weather information and forecasts for any location',
    url: 'http://localhost:3001',
    tags: ['weather', 'forecast', 'location'],
    status: 'active',
    version: '1.2.0',
    capabilities: 'Weather queries, location-based forecasts, historical data',
    location: { lat: 40.7128, lon: -74.0060 } // New York
  },
  {
    agentId: 'translation-agent-002',
    name: 'Multi-Language Translator',
    description: 'Advanced translation service supporting 50+ languages with context awareness',
    url: 'http://localhost:3002',
    tags: ['translation', 'language', 'nlp'],
    status: 'active',
    version: '2.1.0',
    capabilities: 'Text translation, language detection, cultural context',
    location: { lat: 48.8566, lon: 2.3522 } // Paris
  },
  {
    agentId: 'finance-agent-003',
    name: 'Financial Analyst',
    description: 'Real-time stock market data, financial analysis, and investment insights',
    url: 'http://localhost:3003',
    tags: ['finance', 'stocks', 'investment'],
    status: 'active',
    version: '1.5.0',
    capabilities: 'Stock quotes, financial analysis, portfolio tracking',
    location: { lat: 51.5074, lon: -0.1278 } // London
  },
  {
    agentId: 'health-agent-004',
    name: 'Health Advisor',
    description: 'Medical information and health recommendations based on symptoms',
    url: 'http://localhost:3004',
    tags: ['health', 'medical', 'symptoms'],
    status: 'maintenance',
    version: '1.0.0',
    capabilities: 'Symptom analysis, health tips, medication info',
    location: { lat: 35.6762, lon: 139.6503 } // Tokyo
  }
];

async function testHealth() {
  console.log('\n🔍 Testing Health Check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

async function testRegistration() {
  console.log('\n📝 Testing Agent Registration...');
  
  for (const agent of testAgents) {
    try {
      const response = await axios.post(`${BASE_URL}/registry`, agent);
      console.log(`✅ Registered ${agent.name}:`, response.data);
    } catch (error) {
      console.error(`❌ Failed to register ${agent.name}:`, error.response?.data || error.message);
    }
  }
}

async function testListAgents() {
  console.log('\n📋 Testing List Agents...');
  try {
    const response = await axios.get(`${BASE_URL}/agents?page=1&perPage=10`);
    console.log('✅ List agents:', {
      count: response.data.agents.length,
      total: response.data.pagination.total,
      agents: response.data.agents.map(a => ({ name: a.name, status: a.status }))
    });
  } catch (error) {
    console.error('❌ List agents failed:', error.response?.data || error.message);
  }
}

async function testGetAgent() {
  console.log('\n👤 Testing Get Single Agent...');
  try {
    const response = await axios.get(`${BASE_URL}/agent/weather-agent-001`);
    console.log('✅ Get agent:', {
      name: response.data.name,
      status: response.data.status,
      tags: response.data.tags
    });
  } catch (error) {
    console.error('❌ Get agent failed:', error.response?.data || error.message);
  }
}

async function testSearch() {
  console.log('\n🔍 Testing Search Functionality...');
  
  const searchTests = [
    { name: 'Text Search', query: { q: 'weather' } },
    { name: 'Tag Filter', query: { tags: 'finance,stocks' } },
    { name: 'Status Filter', query: { status: 'active' } },
    { name: 'Geo Search', query: { lat: 40.7128, lon: -74.0060, sort: 'distance' } },
    { name: 'Combined Search', query: { q: 'analysis', tags: 'finance', status: 'active' } }
  ];

  for (const test of searchTests) {
    try {
      const response = await axios.get(`${BASE_URL}/search`, { params: test.query });
      console.log(`✅ ${test.name}:`, {
        count: response.data.agents.length,
        total: response.data.pagination.total,
        agents: response.data.agents.map(a => ({ name: a.name, score: a.score }))
      });
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.response?.data || error.message);
    }
  }
}

async function testCacheStatus() {
  console.log('\n💾 Testing Cache Status...');
  try {
    const response = await axios.get(`${BASE_URL}/cache/status`);
    console.log('✅ Cache status:', response.data);
  } catch (error) {
    console.error('❌ Cache status failed:', error.response?.data || error.message);
  }
}

async function testAgentCard() {
  console.log('\n🃏 Testing Agent Card Fetch...');
  try {
    const response = await axios.get(`${BASE_URL}/agentcard/weather-agent-001`);
    console.log('✅ Agent card:', {
      agentId: response.data.agentId,
      cached: response.data.cached,
      fetchTimestamp: response.data.fetchTimestamp
    });
  } catch (error) {
    console.error('❌ Agent card failed:', error.response?.data || error.message);
  }
}

async function testUpdateAgent() {
  console.log('\n🔄 Testing Agent Update...');
  try {
    const updateData = {
      agentId: 'weather-agent-001',
      name: 'Weather Assistant Pro',
      description: 'Enhanced weather service with advanced forecasting capabilities',
      url: 'http://localhost:3001',
      tags: ['weather', 'forecast', 'location', 'advanced'],
      status: 'active',
      version: '1.3.0',
      capabilities: 'Weather queries, location-based forecasts, historical data, severe weather alerts',
      location: { lat: 40.7128, lon: -74.0060 }
    };
    
    const response = await axios.post(`${BASE_URL}/registry`, updateData);
    console.log('✅ Agent updated:', response.data);
  } catch (error) {
    console.error('❌ Agent update failed:', error.response?.data || error.message);
  }
}

async function testDeleteAgent() {
  console.log('\n🗑️ Testing Agent Deletion...');
  try {
    const response = await axios.delete(`${BASE_URL}/agent/health-agent-004`);
    console.log('✅ Agent deleted:', response.data);
  } catch (error) {
    console.error('❌ Agent deletion failed:', error.response?.data || error.message);
  }
}

async function testCacheClear() {
  console.log('\n🧹 Testing Cache Clear...');
  try {
    const response = await axios.post(`${BASE_URL}/cache/clear`);
    console.log('✅ Cache cleared:', response.data);
  } catch (error) {
    console.error('❌ Cache clear failed:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Agent Registry & Discovery Platform Tests\n');
  
  await testHealth();
  await testRegistration();
  await testListAgents();
  await testGetAgent();
  await testSearch();
  await testCacheStatus();
  await testAgentCard();
  await testUpdateAgent();
  await testDeleteAgent();
  await testCacheClear();
  
  console.log('\n✨ All tests completed!');
}

// Run tests
runAllTests().catch(console.error); 