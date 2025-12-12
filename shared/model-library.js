/**
 * 3D Model Library Manager
 * Shared 3D model library for both dashboard and Babylon 3D projects
 */

const fs = require('fs').promises;
const path = require('path');

class ModelLibraryManager {
    constructor(config) {
        this.config = config;
        this.modelsPath = path.resolve(config.THREE_D_MODEL_PATH || './babylon_3d/babylon_app/network-visualizer/assets/models');
        this.cache = new Map();
        this.modelRegistry = new Map();
    }

    async initialize() {
        await this.loadModelRegistry();
        await this.validateModels();
    }

    async loadModelRegistry() {
        const registryPath = path.join(__dirname, 'model-registry.json');
        
        try {
            const registryData = await fs.readFile(registryPath, 'utf8');
            this.modelRegistry = new Map(JSON.parse(registryData));
        } catch (error) {
            // Create default registry if not exists
            await this.createDefaultRegistry();
        }
    }

    async createDefaultRegistry() {
        const defaultModels = {
            'fortigate-61e': {
                name: 'FortiGate-61E',
                type: 'firewall',
                file: 'fortigate-61e.glb',
                scale: { x: 1, y: 1, z: 1 },
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                metadata: {
                    vendor: 'Fortinet',
                    category: 'firewall',
                    ports: 8,
                    rack_units: 1
                },
                tags: ['security', 'firewall', 'gateway']
            },
            'fortiswitch-124e-poe': {
                name: 'FortiSwitch-124E-POE',
                type: 'switch',
                file: 'fortiswitch-124e-poe.glb',
                scale: { x: 1, y: 1, z: 1 },
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                metadata: {
                    vendor: 'Fortinet',
                    category: 'switch',
                    ports: 24,
                    poe_ports: 24,
                    rack_units: 1
                },
                tags: ['switch', 'poe', 'network']
            },
            'fortiap-231f': {
                name: 'FortiAP-231F',
                type: 'access_point',
                file: 'fortiap-231f.glb',
                scale: { x: 1, y: 1, z: 1 },
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                metadata: {
                    vendor: 'Fortinet',
                    category: 'wireless',
                    bands: ['2.4GHz', '5GHz'],
                    max_clients: 128
                },
                tags: ['wireless', 'ap', 'wifi']
            },
            'laptop': {
                name: 'Laptop',
                type: 'endpoint',
                file: 'laptop.glb',
                scale: { x: 0.8, y: 0.8, z: 0.8 },
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                metadata: {
                    category: 'computer',
                    type: 'laptop'
                },
                tags: ['endpoint', 'computer', 'mobile']
            },
            'desktop': {
                name: 'Desktop PC',
                type: 'endpoint',
                file: 'desktop.glb',
                scale: { x: 1, y: 1, z: 1 },
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                metadata: {
                    category: 'computer',
                    type: 'desktop'
                },
                tags: ['endpoint', 'computer', 'stationary']
            },
            'server': {
                name: 'Server',
                type: 'endpoint',
                file: 'server.glb',
                scale: { x: 1, y: 1, z: 1 },
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                metadata: {
                    category: 'server',
                    rack_units: 2
                },
                tags: ['endpoint', 'server', 'infrastructure']
            },
            'mobile': {
                name: 'Mobile Phone',
                type: 'endpoint',
                file: 'mobile.glb',
                scale: { x: 0.5, y: 0.5, z: 0.5 },
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                metadata: {
                    category: 'mobile',
                    type: 'smartphone'
                },
                tags: ['endpoint', 'mobile', 'handheld']
            },
            'network-port': {
                name: 'Network Port',
                type: 'interface',
                file: 'network-port.glb',
                scale: { x: 0.3, y: 0.3, z: 0.3 },
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                metadata: {
                    category: 'interface',
                    type: 'ethernet'
                },
                tags: ['interface', 'port', 'connection']
            }
        };

        this.modelRegistry = new Map(Object.entries(defaultModels));
        await this.saveModelRegistry();
    }

    async saveModelRegistry() {
        const registryPath = path.join(__dirname, 'model-registry.json');
        const registryData = JSON.stringify(Array.from(this.modelRegistry.entries()), null, 2);
        await fs.writeFile(registryPath, registryData);
    }

    async validateModels() {
        const modelFiles = await this.getModelFiles();
        const registryModels = Array.from(this.modelRegistry.values());
        
        for (const model of registryModels) {
            const modelPath = path.join(this.modelsPath, model.file);
            try {
                await fs.access(modelPath);
                model.available = true;
                model.file_size = (await fs.stat(modelPath)).size;
            } catch (error) {
                model.available = false;
                console.warn(`Model file not found: ${model.file}`);
            }
        }
        
        await this.saveModelRegistry();
    }

    async getModelFiles() {
        try {
            const files = await fs.readdir(this.modelsPath);
            return files.filter(file => file.endsWith('.glb') || file.endsWith('.gltf'));
        } catch (error) {
            console.error('Error reading models directory:', error);
            return [];
        }
    }

    getModelById(modelId) {
        return this.modelRegistry.get(modelId);
    }

    getModelsByType(type) {
        return Array.from(this.modelRegistry.values()).filter(model => model.type === type);
    }

    getModelsByTag(tag) {
        return Array.from(this.modelRegistry.values()).filter(model => 
            model.tags && model.tags.includes(tag)
        );
    }

    async addModel(modelData) {
        const modelId = modelData.id || modelData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        const model = {
            id: modelId,
            name: modelData.name,
            type: modelData.type,
            file: modelData.file,
            scale: modelData.scale || { x: 1, y: 1, z: 1 },
            position: modelData.position || { x: 0, y: 0, z: 0 },
            rotation: modelData.rotation || { x: 0, y: 0, z: 0 },
            metadata: modelData.metadata || {},
            tags: modelData.tags || [],
            available: false,
            created_at: new Date().toISOString()
        };

        // Validate model file exists
        const modelPath = path.join(this.modelsPath, model.file);
        try {
            await fs.access(modelPath);
            model.available = true;
            model.file_size = (await fs.stat(modelPath)).size;
        } catch (error) {
            console.warn(`Model file not found: ${model.file}`);
        }

        this.modelRegistry.set(modelId, model);
        await this.saveModelRegistry();
        
        return model;
    }

    async removeModel(modelId) {
        const removed = this.modelRegistry.delete(modelId);
        if (removed) {
            await this.saveModelRegistry();
        }
        return removed;
    }

    async updateModel(modelId, updates) {
        const model = this.modelRegistry.get(modelId);
        if (!model) {
            throw new Error(`Model not found: ${modelId}`);
        }

        Object.assign(model, updates);
        model.updated_at = new Date().toISOString();
        
        // Re-validate if file changed
        if (updates.file) {
            const modelPath = path.join(this.modelsPath, model.file);
            try {
                await fs.access(modelPath);
                model.available = true;
                model.file_size = (await fs.stat(modelPath)).size;
            } catch (error) {
                model.available = false;
            }
        }

        this.modelRegistry.set(modelId, model);
        await this.saveModelRegistry();
        
        return model;
    }

    getLibraryStats() {
        const models = Array.from(this.modelRegistry.values());
        const stats = {
            total_models: models.length,
            available_models: models.filter(m => m.available).length,
            models_by_type: {},
            total_file_size: models.reduce((sum, m) => sum + (m.file_size || 0), 0)
        };

        // Count by type
        models.forEach(model => {
            stats.models_by_type[model.type] = (stats.models_by_type[model.type] || 0) + 1;
        });

        return stats;
    }

    async exportLibrary() {
        const library = {
            version: '1.0.0',
            exported_at: new Date().toISOString(),
            models: Array.from(this.modelRegistry.entries()),
            stats: this.getLibraryStats(),
            config: {
                models_path: this.modelsPath,
                authentic_models: this.config.AUTHENTIC_MODELS
            }
        };

        return library;
    }

    async importLibrary(libraryData) {
        if (!libraryData.models) {
            throw new Error('Invalid library data format');
        }

        // Clear existing registry
        this.modelRegistry.clear();

        // Import models
        for (const [modelId, modelData] of libraryData.models) {
            this.modelRegistry.set(modelId, modelData);
        }

        // Validate imported models
        await this.validateModels();
        
        return this.getLibraryStats();
    }

    // Get model for device based on device information
    getModelForDevice(device) {
        const deviceType = this.getDeviceType(device);
        const vendor = device.vendor?.toLowerCase() || '';
        const model = device.model?.toLowerCase() || '';

        // First try to find exact match
        let candidate = this.findModel(deviceType, vendor, model);
        
        // Fall back to type-based match
        if (!candidate) {
            candidate = this.getModelsByType(deviceType)[0];
        }

        // Final fallback to generic endpoint
        if (!candidate && deviceType === 'endpoint') {
            candidate = this.getModelById('laptop') || this.getModelById('desktop');
        }

        return candidate;
    }

    getDeviceType(device) {
        if (device.type) {
            return device.type.toLowerCase();
        }

        // Infer type from device properties
        if (device.name?.toLowerCase().includes('fortigate') || 
            device.category?.toLowerCase().includes('firewall')) {
            return 'firewall';
        } else if (device.name?.toLowerCase().includes('fortiswitch') || 
                   device.category?.toLowerCase().includes('switch')) {
            return 'switch';
        } else if (device.name?.toLowerCase().includes('fortiap') || 
                   device.category?.toLowerCase().includes('wireless') ||
                   device.category?.toLowerCase().includes('access point')) {
            return 'access_point';
        } else if (device.category?.toLowerCase().includes('interface') ||
                   device.type?.toLowerCase().includes('port')) {
            return 'interface';
        } else {
            return 'endpoint';
        }
    }

    findModel(type, vendor, model) {
        const candidates = this.getModelsByType(type);
        
        // Try to find exact vendor/model match
        return candidates.find(candidate => {
            const candidateName = candidate.name.toLowerCase();
            const candidateVendor = candidate.metadata?.vendor?.toLowerCase() || '';
            
            return candidateName.includes(model) && 
                   (candidateVendor === vendor || candidateName.includes(vendor));
        });
    }
}

module.exports = ModelLibraryManager;
