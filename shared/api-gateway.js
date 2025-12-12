const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const NodeCache = require('node-cache');

class SharedAPIGateway {
    constructor() {
        this.app = express();
        this.port = process.env.SHARED_API_PORT || 13001;
        this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes default TTL
        this.pythonService = null;
        this.config = this.loadConfiguration();
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    loadConfiguration() {
        try {
            // Load from .env file
            require('dotenv').config({ path: path.join(__dirname, '.env') });
            
            return {
                fortigate: {
                    host: process.env.FORTIGATE_HOST || '192.168.0.254',
                    username: process.env.FORTIGATE_USERNAME || 'admin',
                    password: process.env.FORTIGATE_PASSWORD || '!cg@RW%G@o',
                    port: parseInt(process.env.FORTIGATE_PORT) || 10443,
                    verify_ssl: process.env.VERIFY_SSL === 'true'
                },
                services: {
                    dashboard_port: process.env.DASHBOARD_PORT || 13000,
                    babylon_3d_port: process.env.BABYLON_3D_PORT || 3001,
                    python_api_port: process.env.PYTHON_API_PORT || 13002
                },
                cache: {
                    ttl: parseInt(process.env.CACHE_TTL) || 300000,
                    cleanup_interval: parseInt(process.env.CACHE_CLEANUP_INTERVAL) || 60000
                },
                visualization: {
                    max_switches: parseInt(process.env.MAX_SWITCHES) || 50,
                    max_access_points: parseInt(process.env.MAX_ACCESS_POINTS) || 100,
                    max_endpoints: parseInt(process.env.MAX_ENDPOINTS) || 500
                }
            };
        } catch (error) {
            console.error('Error loading configuration:', error);
            process.exit(1);
        }
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
            next();
        });
    }

    setupRoutes() {
        // Root route for health check
        this.app.get('/', (req, res) => {
            res.json({
                name: 'FortiAP/Switch Dashboard API Gateway',
                version: '2.0.0',
                status: 'running',
                endpoints: {
                    health: '/health',
                    config: '/config',
                    topology: '/api/topology',
                    models: '/api/3d-models',
                    dashboard: '/api/dashboard-data',
                    visualization: '/api/3d-visualization'
                }
            });
        });

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    api_gateway: 'running',
                    python_service: this.pythonService ? 'running' : 'stopped',
                    cache: this.cache.getStats()
                }
            });
        });

        // Configuration endpoint
        this.app.get('/config', (req, res) => {
            res.json({
                fortigate: {
                    host: this.config.fortigate.host,
                    port: this.config.fortigate.port,
                    verify_ssl: this.config.fortigate.verify_ssl
                },
                services: this.config.services,
                visualization: this.config.visualization
            });
        });

        // 3D Models endpoint
        this.app.get('/api/3d-models', async (req, res) => {
            try {
                const models = await this.get3DModelLibrary();
                res.json(models);
            } catch (error) {
                res.status(500).json({ error: 'Failed to load 3D models' });
            }
        });

        // Topology endpoint
        this.app.get('/api/topology', async (req, res) => {
            try {
                const cacheKey = 'topology';
                let topologyData = this.getFromCache(cacheKey);
                
                if (!topologyData) {
                    // Get data from Python service only
                    topologyData = await this.callPythonService('get_topology');
                    this.setCache(cacheKey, topologyData);
                }
                
                // Enrich with 3D models
                const enriched = await this.enrichTopologyWithModels(topologyData);
                res.json(enriched);
            } catch (error) {
                console.error('Topology endpoint error:', error);
                res.status(503).json({ 
                    error: 'Python service unavailable',
                    details: error.message 
                });
            }
        });

        // Discovery endpoint
        this.app.post('/api/discover', async (req, res) => {
            try {
                const result = await this.callPythonService('discover_all', req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: 'Discovery failed' });
            }
        });

        // VSS conversion endpoint
        this.app.post('/api/convert/vss', async (req, res) => {
            try {
                const { vss_file_path } = req.body;
                if (!vss_file_path) {
                    return res.status(400).json({ error: 'VSS file path required' });
                }
                
                const result = await this.callPythonService('convert_vss', { vss_file_path });
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: 'VSS conversion failed' });
            }
        });

        // Combined dashboard data endpoint
        this.app.get('/api/dashboard-data', async (req, res) => {
            try {
                const [topology, models] = await Promise.all([
                    this.callPythonService('get_topology'),
                    this.get3DModelLibrary()
                ]);
                
                res.json({
                    topology,
                    models,
                    fortiaps: [],
                    fortiswitches: [],
                    historical: []
                });
            } catch (error) {
                res.status(500).json({ error: 'Failed to get dashboard data' });
            }
        });

        // 3D visualization data endpoint
        this.app.get('/api/3d-visualization', async (req, res) => {
            try {
                const cacheKey = '3d-visualization';
                let visualizationData = this.getFromCache(cacheKey);
                
                if (!visualizationData) {
                    const topology = await this.callPythonService('get_topology');
                    const models = await this.get3DModelLibrary();
                    
                    visualizationData = {
                        topology: await this.enrichTopologyWithModels(topology),
                        models,
                        layout: {
                            camera: { position: { x: 0, y: 10, z: -20 } },
                            lighting: { intensity: 0.8 }
                        }
                    };
                    
                    this.setCache(cacheKey, visualizationData);
                }
                
                res.json(visualizationData);
            } catch (error) {
                res.status(500).json({ error: 'Failed to generate 3D visualization data' });
            }
        });
    }

    async initializePythonService() {
        const pythonScript = path.join(__dirname, '../babylon_3d/python_api_service.py');
        
        try {
            // Check if Python API service exists, create if not
            await this.createPythonService(pythonScript);
            
            // Try different Python commands for Windows compatibility
            const pythonCommands = ['py', 'python3', 'python'];
            
            const spawnPython = (cmdIndex) => {
                if (cmdIndex >= pythonCommands.length) {
                    console.error('Python not found. Please install Python or add it to PATH.');
                    return;
                }
                
                const cmd = pythonCommands[cmdIndex];
                console.log(`Trying Python command for service: ${cmd}`);
                
                this.pythonService = spawn(cmd, [pythonScript], {
                    cwd: path.dirname(pythonScript),
                    env: { ...process.env, PYTHON_SERVICE: 'true' }
                });

                this.pythonService.stdout.on('data', (data) => {
                    console.log(`Python API: ${data.toString().trim()}`);
                });

                this.pythonService.stderr.on('data', (data) => {
                    const stderr = data.toString().trim();
                    if (stderr.includes('was not found') || stderr.includes('not recognized')) {
                        console.log(`Python command '${cmd}' not found for service, trying next...`);
                        this.pythonService.kill();
                        spawnPython(cmdIndex + 1);
                    } else {
                        console.error(`Python API Error: ${stderr}`);
                    }
                });

                this.pythonService.on('close', (code) => {
                    console.log(`Python API service exited with code ${code}`);
                    this.pythonService = null;
                });
                
                this.pythonService.on('error', (error) => {
                    if (error.message.includes('ENOENT')) {
                        console.log(`Python command '${cmd}' not found for service, trying next...`);
                        spawnPython(cmdIndex + 1);
                    } else {
                        console.error('Python service error:', error);
                    }
                });
            };
            
            spawnPython(0);

        } catch (error) {
            console.error('Failed to initialize Python service:', error);
        }
    }

    async createPythonService(scriptPath) {
        const serviceCode = `#!/usr/bin/env python3
"""
Python API Service for Shared Gateway
Provides discovery and 3D model services
"""

import json
import sys
import os
from pathlib import Path
import asyncio
from aiohttp import web, ClientSession
from aiohttp.web import Application, Request, Response
import aiohttp_cors

# Add babylon_3d to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from fortigate_api_integration import FortiGateAPIClient
    from fortigate_config import get_config, validate_config
except ImportError:
    print("Warning: FortiGate modules not available, using mock data")
    FortiGateAPIClient = None

class PythonAPIService:
    def __init__(self):
        self.config = self.get_mock_config()
        self.forti_client = None
        self.cache = {}
        
    def get_mock_config(self):
        return {
            'fortigate': {
                'host': os.environ.get('FORTIGATE_HOST', '192.168.1.1'),
                'username': os.environ.get('FORTIGATE_USERNAME', 'admin'),
                'password': os.environ.get('FORTIGATE_PASSWORD', ''),
                'port': int(os.environ.get('FORTIGATE_PORT', 443)),
                'verify_ssl': os.environ.get('VERIFY_SSL', 'false').lower() == 'true'
            }
        }
    
    async def start(self):
        """Initialize the service"""
        print("Python API Service starting...")
        
    async def get_topology(self, request):
        """Get network topology data"""
        # Return mock topology data
        topology_data = {
            'fortigate': {
                'name': 'FortiGate-61E',
                'serial': 'FG61E3X16800123',
                'version': 'v6.4.5',
                'ip': self.config['fortigate']['host']
            },
            'switches': [],
            'access_points': [],
            'endpoints': []
        }
        return web.json_response(topology_data)
    
    async def get_fortiaps(self, request):
        """Get FortiAP data"""
        return web.json_response([])
    
    async def get_fortiswitches(self, request):
        """Get FortiSwitch data"""
        return web.json_response([])
    
    async def get_historical(self, request):
        """Get historical data"""
        return web.json_response([])
    
    async def discover_devices(self, request):
        """Run device discovery"""
        try:
            data = await request.json()
            return web.json_response({'status': 'discovery_started', 'parameters': data})
        except Exception as e:
            return web.json_response({'error': str(e)}, status=500)
    
    async def convert_vss(self, request):
        """Convert VSS to SVG"""
        try:
            data = await request.json()
            vss_path = data.get('vss_file_path')
            if not vss_path:
                return web.json_response({'error': 'VSS file path required'}, status=400)
            
            return web.json_response({'status': 'conversion_started', 'file': vss_path})
        except Exception as e:
            return web.json_response({'error': str(e)}, status=500)

async def main():
    service = PythonAPIService()
    await service.start()
    
    app = web.Application()
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
        )
    })
    
    # Add routes
    app.router.add_get('/topology', service.get_topology)
    app.router.add_get('/fortiaps', service.get_fortiaps)
    app.router.add_get('/fortiswitches', service.get_fortiswitches)
    app.router.add_get('/historical', service.get_historical)
    app.router.add_post('/discover', service.discover_devices)
    app.router.add_post('/convert_vss', service.convert_vss)
    
    # Add CORS to all routes
    for route in list(app.router.routes()):
        cors.add(route)
    
    port = int(os.environ.get('PYTHON_API_PORT', 13002))
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', port)
    await site.start()
    
    print(f"Python API Service running on port {port}")
    try:
        await asyncio.Future()  # Run forever
    except KeyboardInterrupt:
        pass

if __name__ == '__main__':
    asyncio.run(main())
`;

        await fs.writeFile(scriptPath, serviceCode);
        console.log('Created Python API service script');
    } catch (error) {
        console.error('Error creating Python service:', error);
    }

    async callPythonService(method, data = null) {
        return new Promise((resolve, reject) => {
            const http = require('http');
            
            // Map method names to Python service endpoints
            const endpointMap = {
                'get_topology': 'topology',
                'get_fortiaps': 'fortiaps', 
                'get_fortiswitches': 'fortiswitches',
                'discover_all': 'discover',
                'convert_vss': 'convert_vss'
            };
            
            const endpoint = endpointMap[method] || method;
            
            const options = {
                hostname: 'localhost',
                port: 13002,
                path: `/${endpoint}`,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            console.log(`Calling Python service: http://localhost:13002/${endpoint}`);
            
            const req = http.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`Python service response: ${res.statusCode}`);
                    try {
                        const result = JSON.parse(data);
                        resolve(result);
                    } catch (e) {
                        resolve({ output: data, error: null });
                    }
                });
            });
            
            req.on('error', (error) => {
                console.error(`Python service error: ${error.message}`);
                reject(error);
            });
            
            req.end();
        });
    }

    async enrichTopologyWithModels(topologyData) {
        const modelLibrary = await this.get3DModelLibrary();
        
        const enriched = {
            ...topologyData,
            models: modelLibrary,
            visualization_config: this.config.visualization
        };

        // Add model references to devices
        if (enriched.fortigate) {
            enriched.fortigate.model = modelLibrary.firewall;
        }
        
        if (enriched.switches) {
            enriched.switches = enriched.switches.map(switchDevice => ({
                ...switchDevice,
                model: modelLibrary.switch
            }));
        }
        
        if (enriched.aps) {
            enriched.aps = enriched.aps.map(ap => ({
                ...ap,
                model: modelLibrary.access_point
            }));
        }

        return enriched;
    }

    async get3DModelLibrary() {
        const modelsPath = path.join(__dirname, '../babylon_3d/babylon_app/network-visualizer/assets/models');
        
        try {
            const modelFiles = await fs.readdir(modelsPath);
            const models = {};

            for (const file of modelFiles) {
                if (file.endsWith('.glb')) {
                    const modelName = path.basename(file, '.glb');
                    const stats = await fs.stat(path.join(modelsPath, file));
                    
                    models[modelName] = {
                        file: file,
                        path: `/models/${file}`,
                        size: stats.size,
                        type: this.getModelType(modelName)
                    };
                }
            }

            return models;
        } catch (error) {
            console.error('Error loading 3D models:', error);
            return {
                firewall: { file: 'fortigate.glb', type: 'firewall' },
                switch: { file: 'fortiswitch.glb', type: 'switch' },
                access_point: { file: 'fortiap.glb', type: 'access_point' }
            };
        }
    }

    getModelType(modelName) {
        if (modelName.toLowerCase().includes('fortigate') || modelName.toLowerCase().includes('firewall')) {
            return 'firewall';
        } else if (modelName.toLowerCase().includes('switch')) {
            return 'switch';
        } else if (modelName.toLowerCase().includes('ap') || modelName.toLowerCase().includes('access')) {
            return 'access_point';
        } else {
            return 'endpoint';
        }
    }

    // Cache management
    getFromCache(key) {
        return this.cache.get(key);
    }

    setCache(key, data) {
        this.cache.set(key, data);
    }

    start() {
        // Initialize Python service
        this.initializePythonService();
        
        this.app.listen(this.port, () => {
            console.log(`🚀 Shared API Gateway running on port ${this.port}`);
            console.log(`📊 Health: http://localhost:${this.port}/health`);
            console.log(`🔧 Config: http://localhost:${this.port}/config`);
            console.log(`🌐 Topology: http://localhost:${this.port}/api/topology`);
            console.log(`🎨 3D Models: http://localhost:${this.port}/api/3d-models`);
        });
    }
}

// Start the gateway
if (require.main === module) {
    const gateway = new SharedAPIGateway();
    gateway.start();
}

module.exports = SharedAPIGateway;
