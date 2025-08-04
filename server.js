import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Client } from '@elastic/elasticsearch';
import NodeCache from 'node-cache';
import axios from 'axios';
import Joi from 'joi';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Elasticsearch client
const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
  }
});

// In-memory cache for agent cards
const agentCache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every minute
  useClones: false
});

// Cache statistics
let cacheStats = {
  hits: 0,
  misses: 0,
  size: 0
};

// Elasticsearch index name
const INDEX_NAME = 'agents';

// Validation schemas
const agentRegistrationSchema = Joi.object({
  agentId: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  url: Joi.string().uri().required(),
  tags: Joi.array().items(Joi.string()).default([]),
  status: Joi.string()
    .valid('active', 'inactive', 'maintenance')
    .default('active'),
  version: Joi.string().default('1.0.0'),
  capabilities: Joi.string().default(''),
  location: Joi.object({
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lon: Joi.number().min(-180).max(180).required()
    }).required(),
    city: Joi.string().optional(),
    country: Joi.string().optional()
  }).optional()
});

const searchQuerySchema = Joi.object({
  q: Joi.string().optional(),
  tags: Joi.string().optional(),
  status: Joi.string()
    .valid('active', 'inactive', 'maintenance')
    .optional(),
  version: Joi.string().optional(),
  city: Joi.string().optional(),
  country: Joi.string().optional(),
  lat: Joi.number().min(-90).max(90).optional(),
  lon: Joi.number().min(-180).max(180).optional(),
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string()
    .valid('relevance', 'name', 'updatedAt', 'distance')
    .default('relevance')
});
// Initialize Elasticsearch index
async function initializeIndex() {
  try {
    const indexExists = await client.indices.exists({ index: INDEX_NAME });
    
    if (!indexExists) {
      await client.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              agentId: { type: 'keyword' },
              name: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              description: { 
                type: 'text',
                analyzer: 'standard'
              },
              url: { type: 'keyword' },
              tags: { type: 'keyword' },
              status: { type: 'keyword' },
              version: { type: 'keyword' },
              capabilities: { 
                type: 'text',
                analyzer: 'standard'
              },
              location: {
                type: 'object',
                properties: {
                  coordinates: { type: 'geo_point' },
                  city: { type: 'keyword' },
                  country: { type: 'keyword' }
                }
              },
              updatedAt: { type: 'date' }
            }
          },
          settings: {
            analysis: {
              analyzer: {
                standard: {
                  type: 'standard'
                }
              }
            }
          }
        }
      });
      console.log(`Created index: ${INDEX_NAME}`);
    }
  } catch (error) {
    console.error('Error initializing Elasticsearch index:', error);
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const esHealth = await client.cluster.health();
    const cacheInfo = agentCache.getStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      elasticsearch: {
        status: esHealth.status,
        cluster_name: esHealth.cluster_name,
        number_of_nodes: esHealth.number_of_nodes
      },
      cache: {
        size: cacheInfo.vsize,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Register or update agent
app.post('/registry', async (req, res) => {
  try {
    const { error, value } = agentRegistrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const agentData = {
      ...value,
      updatedAt: new Date().toISOString()
    };

    // Transform coordinates for Elasticsearch
    if (agentData.location && agentData.location.coordinates) {
      agentData.location.coordinates = [
        agentData.location.coordinates.lon,
        agentData.location.coordinates.lat
      ];
    }

    // Index the agent metadata
    await client.index({
      index: INDEX_NAME,
      id: agentData.agentId,
      body: agentData
    });

    // Invalidate cache for this agent
    agentCache.del(`agentcard:${agentData.agentId}`);

    // Refresh index for immediate searchability
    await client.indices.refresh({ index: INDEX_NAME });

    res.status(201).json({
      message: 'Agent registered successfully',
      agentId: agentData.agentId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register agent' });
  }
});

// List all agents (metadata only)
app.get('/agents', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 20;
    const from = (page - 1) * perPage;

    const result = await client.search({
      index: INDEX_NAME,
      body: {
        query: { match_all: {} },
        sort: [{ updatedAt: { order: 'desc' } }],
        from,
        size: perPage
      }
    });

    res.json({
      agents: result.hits.hits.map(hit => ({
        ...hit._source,
        score: hit._score
      })),
      pagination: {
        page,
        perPage,
        total: result.hits.total.value,
        totalPages: Math.ceil(result.hits.total.value / perPage)
      }
    });
  } catch (error) {
    console.error('List agents error:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Get single agent metadata
app.get('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const result = await client.get({
      index: INDEX_NAME,
      id: agentId
    });

    res.json(result._source);
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      res.status(404).json({ error: 'Agent not found' });
    } else {
      console.error('Get agent error:', error);
      res.status(500).json({ error: 'Failed to fetch agent' });
    }
  }
});

// Delete agent
app.delete('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    await client.delete({
      index: INDEX_NAME,
      id: agentId
    });

    // Remove from cache
    agentCache.del(`agentcard:${agentId}`);

    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      res.status(404).json({ error: 'Agent not found' });
    } else {
      console.error('Delete agent error:', error);
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  }
});

// Search agents
app.get('/search', async (req, res) => {
  try {
    const { error, value } = searchQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      q, tags, status, version, lat, lon,  page, perPage, sort,city, country
    } = value;

    const from = (page - 1) * perPage;
    
    // Build query
    const must = [];
    const filter = [];
    const sortClause = [];

    // Text search
    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: ['name^2', 'description', 'capabilities'],
          fuzziness: 'AUTO',
          type: 'best_fields'
        }
      });
    }

    // Tag filter
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      filter.push({ terms: { tags: tagArray } });
    }

    // Status filter
    if (status) {
      filter.push({ term: { status } });
    }

    // Version filter
    if (version) {
      filter.push({ term: { version } });
    }

    // Geo sorting
    if (lat && lon) {
      sortClause.push({
        _geo_distance: {
          "location.coordinates": { lat, lon },
          order: 'asc',
          unit: 'km'
        }
      });
    }

    // Other sorting
    switch (sort) {
      case 'name':
        sortClause.push({ 'name.keyword': { order: 'asc' } });
        break;
      case 'updatedAt':
        sortClause.push({ updatedAt: { order: 'desc' } });
        break;
      case 'relevance':
      default:
        if (!q) {
          sortClause.push({ updatedAt: { order: 'desc' } });
        }
        break;
    }

    const query = {
      bool: {
        must,
        filter
      }
    };

    const result = await client.search({
      index: INDEX_NAME,
      body: {
        query,
        sort: sortClause,
        from,
        size: perPage,
        aggs: {
          tags: {
            terms: { field: 'tags' }
          },
          status: {
            terms: { field: 'status' }
          }
        }
      }
    });

    res.json({
      agents: result.hits.hits.map(hit => ({
        ...hit._source,
        score: hit._score,
        distance: hit.sort?.[0] // Geo distance if applicable
      })),
      pagination: {
        page,
        perPage,
        total: result.hits.total.value,
        totalPages: Math.ceil(result.hits.total.value / perPage)
      },
      aggregations: result.aggregations
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get full agent card (from cache or fetch)
app.get('/agentcard/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const cacheKey = `agentcard:${agentId}`;

    // Try cache first
    let agentCard = agentCache.get(cacheKey);
    
    if (agentCard) {
      cacheStats.hits++;
      return res.json({
        ...agentCard,
        cached: true,
        fetchTimestamp: agentCard.fetchTimestamp
      });
    }

    cacheStats.misses++;

    // Get agent metadata
    const metadata = await client.get({
      index: INDEX_NAME,
      id: agentId
    });

    // Fetch full agent card from agent's endpoint
    try {
      const response = await axios.get(`${metadata._source.url}/.well-known/agent.json`, {
        timeout: 5000
      });

      agentCard = {
        ...response.data,
        agentId,
        cached: false,
        fetchTimestamp: new Date().toISOString()
      };

      // Cache the result
      agentCache.set(cacheKey, agentCard);

      res.json(agentCard);
    } catch (fetchError) {
      console.error(`Failed to fetch agent card from ${metadata._source.url}:`, fetchError.message);
      res.status(503).json({
        error: 'Failed to fetch agent card',
        agentId,
        url: metadata._source.url
      });
    }
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      res.status(404).json({ error: 'Agent not found' });
    } else {
      console.error('Get agent card error:', error);
      res.status(500).json({ error: 'Failed to fetch agent card' });
    }
  }
});

// Cache status
app.get('/cache/status', (req, res) => {
  const stats = agentCache.getStats();
  res.json({
    size: stats.vsize,
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0,
    keys: stats.keys,
    ksize: stats.ksize
  });
});

// Clear cache
app.post('/cache/clear', (req, res) => {
  agentCache.flushAll();
  cacheStats = { hits: 0, misses: 0, size: 0 };
  res.json({ message: 'Cache cleared successfully' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  await initializeIndex();
  
  app.listen(PORT, () => {
    console.log(`Agent Registry & Discovery Platform running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

startServer().catch(console.error); 