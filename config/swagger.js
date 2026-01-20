/**
 * Swagger/OpenAPI Configuration
 * Provides API documentation using swagger-jsdoc and swagger-ui-express
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FortiAP/Switch Dashboard API',
      version: '2.0.0',
      description: 'Advanced Fortinet network monitoring dashboard with 3D visualization, connected device tracking, and force-directed graphs',
      contact: {
        name: 'API Support',
        url: 'https://github.com/kmransom56/fortiap-switch-dashboard-v2'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:13000',
        description: 'Development server'
      },
      {
        url: 'http://0.0.0.0:13000',
        description: 'Local network server'
      }
    ],
    tags: [
      {
        name: 'FortiAP',
        description: 'FortiAP access point management'
      },
      {
        name: 'FortiSwitch',
        description: 'FortiSwitch management'
      },
      {
        name: 'Devices',
        description: 'Connected device management'
      },
      {
        name: 'Topology',
        description: 'Network topology visualization'
      },
      {
        name: 'Historical',
        description: 'Historical data and analytics'
      },
      {
        name: 'System',
        description: 'System health and metrics'
      }
    ],
    components: {
      schemas: {
        FortiAP: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'FortiAP device name'
            },
            serial: {
              type: 'string',
              description: 'Serial number'
            },
            status: {
              type: 'string',
              enum: ['online', 'offline'],
              description: 'Device status'
            },
            ip_address: {
              type: 'string',
              description: 'IP address'
            },
            model: {
              type: 'string',
              description: 'Device model'
            },
            clients: {
              type: 'integer',
              description: 'Number of connected clients'
            }
          }
        },
        FortiSwitch: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'FortiSwitch device name'
            },
            serial: {
              type: 'string',
              description: 'Serial number'
            },
            status: {
              type: 'string',
              enum: ['online', 'offline'],
              description: 'Device status'
            },
            ports_up: {
              type: 'integer',
              description: 'Number of active ports'
            },
            ports_total: {
              type: 'integer',
              description: 'Total number of ports'
            }
          }
        },
        ConnectedDevice: {
          type: 'object',
          properties: {
            mac: {
              type: 'string',
              description: 'MAC address'
            },
            ip_address: {
              type: 'string',
              description: 'IP address'
            },
            hostname: {
              type: 'string',
              description: 'Device hostname'
            },
            vendor: {
              type: 'string',
              description: 'Device vendor'
            },
            device_type: {
              type: 'string',
              description: 'Device type'
            },
            connection_type: {
              type: 'string',
              enum: ['wired', 'wireless', 'detected'],
              description: 'Connection type'
            },
            is_online: {
              type: 'boolean',
              description: 'Online status'
            }
          }
        },
        Topology: {
          type: 'object',
          properties: {
            nodes: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Network nodes'
            },
            links: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Network links'
            }
          }
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Health status'
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in milliseconds'
            },
            uptimeFormatted: {
              type: 'string',
              description: 'Formatted uptime'
            },
            metrics: {
              type: 'object',
              description: 'Performance metrics'
            },
            memory: {
              type: 'object',
              description: 'Memory usage'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Error status'
            },
            message: {
              type: 'string',
              description: 'Error message'
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad request - validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized - authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        TooManyRequests: {
          description: 'Too many requests - rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  },
  apis: ['./server.js', './routes/*.js'] // Path to API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
