# Agent Registry & Discovery Platform

A distributed registry and discovery platform for AI agents, backed by Elasticsearch for search and in-memory caching for full payloads. Agents register themselves, and clients can search by text, tags, or location, then fetch either lightweight metadata or the full cached "agent card."

## 🏗️ Architecture

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  AI Agents   │──────▶│  Registry    │──────▶│  Elasticsearch│
│(with /agent  │       │  & Search API│       │   Cluster    │
│  /agentcard) │       └──────────────┘       └──────────────┘
│              │             │                       ▲
└──────────────┘             │                       │
        ▲                     │                       │
        │                     ▼                       │
 ┌──────────────┐       ┌──────────────┐             │
 │  Clients /   │◀──────│  In‑Memory    │◀────────────┘
 │  Orchestrator│       │  Cache (Redis │
 └──────────────┘       │   or in‑proc) │
                        └──────────────┘
```

## 🚀 Features

- **Fast, fuzzy full-text search** over agent metadata
- **Geospatial filtering/sorting** (e.g., nearest agents)
- **Tag- and status-based filtering**
- **Low-latency fetch** of detailed agent cards via cache
- **Resilient, horizontally scalable** backend
- **Clean, self-documenting REST API**

## 📋 Prerequisites

- Node.js 18+ or Bun
- Elasticsearch 7.x or 8.x
- npm or yarn

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd agent-search-engine
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Elasticsearch:**
   
   **Option A: Docker (Recommended)**
   ```bash
   docker run -d \
     --name elasticsearch \
     -p 9200:9200 \
     -p 9300:9300 \
     -e "discovery.type=single-node" \
     -e "xpack.security.enabled=false" \
     docker.elastic.co/elasticsearch/elasticsearch:8.11.0
   ```

   **Option B: Local Installation**
   - Download and install Elasticsearch from [elastic.co](https://www.elastic.co/downloads/elasticsearch)
   - Start the service

4. **Configure environment variables (optional):**
   ```bash
   export ELASTICSEARCH_URL=http://localhost:9200
   export ELASTICSEARCH_USERNAME=elastic
   export ELASTICSEARCH_PASSWORD=changeme
   export PORT=3000
   ```

## 🚀 Quick Start

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Check health:**
   ```bash
   curl http://localhost:3000/health
   ```

## 📚 API Documentation

### Health Check
```http
GET /health
```
Returns service health, Elasticsearch status, and cache statistics.

### Register Agent
```http
POST /registry
Content-Type: application/json

{
  "agentId": "weather-agent-001",
  "name": "Weather Assistant",
  "description": "Provides real-time weather information",
  "url": "http://localhost:3001",
  "tags": ["weather", "forecast"],
  "status": "active",
  "version": "1.0.0",
  "capabilities": "Weather queries, forecasts",
  "location": {
    "lat": 40.7128,
    "lon": -74.0060
  }
}
```

### List Agents
```http
GET /agents?page=1&perPage=20
```
Returns paginated list of all registered agents (metadata only).

### Get Agent Metadata
```http
GET /agent/:agentId
```
Returns metadata for a specific agent.

### Search Agents
```http
GET /search?q=weather&tags=forecast&status=active&lat=40.7128&lon=-74.0060&sort=distance
```

**Query Parameters:**
- `q`: Text search query
- `tags`: Comma-separated tags to filter by
- `status`: Agent status filter (active, inactive, maintenance)
- `version`: Version filter
- `lat`, `lon`: Coordinates for geo-distance sorting
- `page`: Page number (default: 1)
- `perPage`: Results per page (default: 20, max: 100)
- `sort`: Sort order (relevance, name, updatedAt, distance)

### Get Agent Card
```http
GET /agentcard/:agentId
```
Returns full agent card from cache or fetches from agent's endpoint.

### Delete Agent
```http
DELETE /agent/:agentId
```
Removes agent from registry and cache.

### Cache Management
```http
GET /cache/status
POST /cache/clear
```

## 🔍 Search Examples

### Text Search
```bash
curl "http://localhost:3000/search?q=weather"
```

### Tag Filter
```bash
curl "http://localhost:3000/search?tags=finance,stocks"
```

### Geospatial Search
```bash
curl "http://localhost:3000/search?lat=40.7128&lon=-74.0060&sort=distance"
```

### Combined Search
```bash
curl "http://localhost:3000/search?q=analysis&tags=finance&status=active&page=1&perPage=10"
```

## 📊 Data Model

### Elasticsearch Document (Agent Metadata)
```json
{
  "agentId": "weather-agent-001",
  "name": "Weather Assistant",
  "description": "Provides real-time weather information",
  "url": "http://localhost:3001",
  "tags": ["weather", "forecast"],
  "status": "active",
  "version": "1.0.0",
  "capabilities": "Weather queries, forecasts",
  "location": {
    "lat": 40.7128,
    "lon": -74.0060
  },
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Cache Entry (Agent Card)
```json
{
  "agentId": "weather-agent-001",
  "name": "Weather Assistant",
  "description": "Provides real-time weather information",
  "capabilities": "Weather queries, forecasts",
  "endpoints": {
    "process": "/process",
    "status": "/status"
  },
  "examples": [...],
  "cached": true,
  "fetchTimestamp": "2024-01-15T10:30:00Z"
}
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `ELASTICSEARCH_URL`: Elasticsearch connection URL (default: http://localhost:9200)
- `ELASTICSEARCH_USERNAME`: Elasticsearch username (default: elastic)
- `ELASTICSEARCH_PASSWORD`: Elasticsearch password (default: changeme)

### Cache Configuration
- Default TTL: 5 minutes
- Check period: 1 minute
- Configurable via environment variables

## 🧪 Testing

Run the comprehensive test suite:
```bash
npm test
```

The test suite includes:
- Health check validation
- Agent registration
- Search functionality
- Cache operations
- CRUD operations

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Production Considerations
- Use Redis for distributed caching
- Configure Elasticsearch cluster
- Set up proper logging and monitoring
- Implement rate limiting
- Add authentication/authorization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Check the API documentation
- Review the test examples

## 🔄 Roadmap

- [ ] Redis cache backend
- [ ] Authentication & authorization
- [ ] Rate limiting
- [ ] Metrics & monitoring
- [ ] GraphQL API
- [ ] WebSocket support for real-time updates
- [ ] Agent health monitoring
- [ ] Load balancing support
