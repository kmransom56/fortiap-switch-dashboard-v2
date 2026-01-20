// Dashboard Application
class FortDashboard {
    constructor() {
        this.data = null;
        this.charts = {};
        this.currentTab = 'overview';
        this.darkMode = false;
        this.filters = {
            ap: {
                search: '',
                status: 'all'
            },
            switch: {
                search: '',
                status: 'all'
            }
        };
        this.dataSource = 'API';
        this.dataSourceType = 'api';
        this.lastCacheUpdate = null;

        // Initialize device configuration for icon and layout mapping
        this.deviceConfig = typeof DeviceConfig !== 'undefined' ? new DeviceConfig() : null;
        if (!this.deviceConfig) {
            console.warn('DeviceConfig not available. Using default icons and layouts.');
        }

        // Initialize force graph view
        this.forceGraphView = typeof ForceGraphView !== 'undefined' ? new ForceGraphView(this) : null;
        if (!this.forceGraphView) {
            console.warn('ForceGraphView not available. 3D Force Graph tab will not work.');
        }

        // Debug mode (set to true to enable device debugging)
        this.debugMode = false;

        // Don't automatically run init during test runs (jest) — tests call loadData manually
        if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
            this.init();
        }
    }

    async init() {
        this.setupEventListeners();
        this.setupWebSocket();
        await this.loadData();
        this.render();
        this.setupAutoRefresh();
    }

    setupWebSocket() {
        try {
            // Check if socket.io is available
            if (typeof io === 'undefined') {
                console.warn('Socket.IO client library not loaded. Real-time updates disabled.');
                return;
            }

            // Connect to WebSocket server
            const socket = io(window.location.origin, {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5,
                auth: {
                    clientId: `dashboard-${Date.now()}`,
                    token: null
                }
            });

            // Store socket reference
            this.socket = socket;

            // Connection events
            socket.on('connect', () => {
                console.log('WebSocket connected:', socket.id);
                document.body.classList.add('ws-connected');
                document.body.classList.remove('ws-disconnected');
            });

            socket.on('disconnect', () => {
                console.log('WebSocket disconnected');
                document.body.classList.remove('ws-connected');
                document.body.classList.add('ws-disconnected');
            });

            socket.on('connect_error', (error) => {
                console.error('WebSocket connection error:', error);
            });

            // Listen for data updates
            socket.on('device-status-update', (data) => {
                console.log('Received device status update:', data);
                this.handleDeviceStatusUpdate(data);
            });

            socket.on('connected-devices-update', (data) => {
                console.log('Received connected devices update:', data);
                this.handleConnectedDevicesUpdate(data);
            });

            socket.on('topology-update', (data) => {
                console.log('Received topology update:', data);
                this.handleTopologyUpdate(data);
            });

            socket.on('stats-update', (data) => {
                console.log('Received stats update:', data);
                this.handleStatsUpdate(data);
            });

            // Subscribe to real-time updates
            socket.emit('subscribe', { channel: 'devices' });
            socket.emit('subscribe', { channel: 'connected-devices' });
            socket.emit('subscribe', { channel: 'topology' });

        } catch (error) {
            console.warn('Failed to setup WebSocket:', error);
        }
    }

    handleDeviceStatusUpdate(data) {
        if (!this.data) return;
        
        // Update AP status
        if (data.type === 'ap' && data.serial) {
            const ap = this.data.fortiaps?.find(a => a.serial === data.serial);
            if (ap) {
                Object.assign(ap, data.updates);
            }
        }
        
        // Update Switch status
        if (data.type === 'switch' && data.serial) {
            const sw = this.data.fortiswitches?.find(s => s.serial === data.serial);
            if (sw) {
                Object.assign(sw, data.updates);
            }
        }

        // Re-render affected sections
        if (data.type === 'ap') {
            this.renderFortiAPs();
        } else if (data.type === 'switch') {
            this.renderFortiSwitches();
        }
    }

    handleConnectedDevicesUpdate(data) {
        if (!this.data) return;
        this.data.connected_devices = data;
        this.renderConnectedDevices();
    }

    handleTopologyUpdate(data) {
        if (!this.data) return;
        this.data.network_topology = data;
        if (this.currentTab === 'topology') {
            this.renderTopology();
        }
    }

    handleStatsUpdate(data) {
        if (!this.data) return;
        this.data.stats = data;
        if (this.currentTab === 'historical') {
            this.renderHistorical();
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refreshData();
        });

        // Export button
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportData();
        });

        // Debug: Add keyboard shortcut for debug mode (Ctrl+D or Cmd+D)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.setDebugMode(!this.debugMode);
                if (this.debugMode) {
                    this.debugAllDevices();
                }
            }
        });

        // Debug: Add keyboard shortcut for device export (Ctrl+Shift+D or Cmd+Shift+D)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.exportDeviceData('json');
            }
        });

        // Search and filters
        document.getElementById('apSearchInput')?.addEventListener('input', (e) => {
            this.filterDevices('ap', e.target.value);
        });

        // Hierarchy controls
        document.getElementById('expand-all-topology')?.addEventListener('click', () => {
            this.expandAllHierarchy();
        });

        document.getElementById('collapse-all-topology')?.addEventListener('click', () => {
            this.collapseAllHierarchy();
        });

        document.getElementById('refresh-topology')?.addEventListener('click', () => {
            this.renderTopology();
        });

        document.getElementById('switchSearchInput')?.addEventListener('input', (e) => {
            this.filterDevices('switch', e.target.value);
        });

        document.getElementById('apStatusFilter')?.addEventListener('change', (e) => {
            this.filterByStatus('ap', e.target.value);
        });

        document.getElementById('switchStatusFilter')?.addEventListener('change', (e) => {
            this.filterByStatus('switch', e.target.value);
        });

        // Connected devices controls
        document.getElementById('refreshConnectedDevices')?.addEventListener('click', () => {
            this.renderConnectedDevices();
        });

        document.getElementById('deviceTypeFilter')?.addEventListener('change', (e) => {
            this.filterConnectedDevices(e.target.value);
        });

        document.getElementById('deviceSearchInput')?.addEventListener('input', (e) => {
            this.searchConnectedDevices(e.target.value);
        });

        // Force graph controls
        document.getElementById('resetForceGraph')?.addEventListener('click', () => {
            if (this.forceGraphView) {
                this.forceGraphView.resetLayout();
            }
        });

        document.getElementById('togglePhysics')?.addEventListener('click', (e) => {
            if (this.forceGraphView) {
                const isPaused = e.target.textContent.includes('Pause');
                this.forceGraphView.togglePhysics(!isPaused);
                e.target.innerHTML = isPaused 
                    ? '<i class="fas fa-play"></i> Resume Physics'
                    : '<i class="fas fa-pause"></i> Pause Physics';
            }
        });

        document.getElementById('forceGraphFilter')?.addEventListener('change', (e) => {
            if (this.forceGraphView) {
                const value = e.target.value;
                if (value === 'all') {
                    this.forceGraphView.render();
                } else {
                    this.forceGraphView.filterByType([value]);
                }
            }
        });

        document.getElementById('refreshForceGraph')?.addEventListener('click', () => {
            this.renderForceGraph();
        });

        // Modal close
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('deviceModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'deviceModal') {
                this.closeModal();
            }
        });

        // Time range selector
        document.getElementById('timeRangeSelector')?.addEventListener('change', (e) => {
            this.updateHistoricalCharts(e.target.value);
        });
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
        if (enabled && this.deviceConfig) {
            console.log('Device configuration loaded:', {
                firewallModels: this.deviceConfig.getKnownModels('firewall').length,
                switchModels: this.deviceConfig.getKnownModels('switch').length,
                apModels: this.deviceConfig.getKnownModels('access_point').length
            });
        }
    }

    /**
     * Debug: Inspect all devices and their configurations
     */
    debugAllDevices() {
        console.group('🔍 Device Debug Report');
        
        if (!this.data) {
            console.warn('No data loaded yet');
            console.groupEnd();
            return;
        }

        console.log('=== FortiGate Info ===');
        if (this.fortigateInfo) {
            console.log(this.fortigateInfo);
        } else {
            console.log('No FortiGate info available');
        }

        console.log('\n=== FortiSwitches ===');
        const switches = this.data.fortiswitches || [];
        console.log(`Total: ${switches.length}`);
        switches.forEach((sw, idx) => {
            console.group(`Switch ${idx + 1}: ${sw.name || 'Unknown'}`);
            console.log('Model:', sw.model || 'Unknown');
            console.log('Status:', sw.status || 'Unknown');
            if (this.deviceConfig) {
                console.log('Icon:', this.deviceConfig.getIconPath('switch', sw.model));
                console.log('Layout:', this.deviceConfig.getLayout('switch', sw.model));
            }
            console.log('Ports:', sw.ports_total || 0);
            console.log('POE Budget:', sw.poe_power_budget || 0, 'W');
            console.groupEnd();
        });

        console.log('\n=== FortiAPs ===');
        const aps = this.data.fortiaps || [];
        console.log(`Total: ${aps.length}`);
        aps.forEach((ap, idx) => {
            console.group(`AP ${idx + 1}: ${ap.name || 'Unknown'}`);
            console.log('Model:', ap.model || 'Unknown');
            console.log('Status:', ap.status || 'Unknown');
            if (this.deviceConfig) {
                console.log('Icon:', this.deviceConfig.getIconPath('access_point', ap.model));
                console.log('Layout:', this.deviceConfig.getLayout('access_point', ap.model));
            }
            console.log('Clients:', ap.clients_connected || 0);
            console.groupEnd();
        });

        console.log('\n=== Topology ===');
        if (this.data.network_topology) {
            console.log('Connections:', this.data.network_topology.connections?.length || 0);
        } else {
            console.log('No topology data');
        }

        console.groupEnd();
    }

    /**
     * Debug: Export device data to console/JSON
     * @param {string} format - 'console' or 'json'
     */
    exportDeviceData(format = 'console') {
        if (!this.data) {
            console.warn('No data to export');
            return;
        }

        const exportData = {
            timestamp: new Date().toISOString(),
            fortigate: this.fortigateInfo || null,
            switches: (this.data.fortiswitches || []).map(sw => ({
                name: sw.name,
                model: sw.model,
                serial: sw.serial,
                status: sw.status,
                ports_total: sw.ports_total,
                ports_up: sw.ports_up,
                poe_power_budget: sw.poe_power_budget,
                poe_power_consumption: sw.poe_power_consumption,
                icon: this.deviceConfig ? this.deviceConfig.getIconPath('switch', sw.model) : null,
                layout: this.deviceConfig ? this.deviceConfig.getLayout('switch', sw.model) : null
            })),
            aps: (this.data.fortiaps || []).map(ap => ({
                name: ap.name,
                model: ap.model,
                serial: ap.serial,
                status: ap.status,
                clients_connected: ap.clients_connected,
                icon: this.deviceConfig ? this.deviceConfig.getIconPath('access_point', ap.model) : null,
                layout: this.deviceConfig ? this.deviceConfig.getLayout('access_point', ap.model) : null
            }))
        };

        if (format === 'json') {
            console.log(JSON.stringify(exportData, null, 2));
            return exportData;
        } else {
            console.log('Device Data Export:', exportData);
            return exportData;
        }
    }

    async loadData() {
        try {
            console.log('Loading FortiGate network data...');

            // Initialize data structure
            this.data = {
                fortiaps: [],
                fortiswitches: [],
                historical_data: [],
                last_updated: new Date().toISOString()
            };

            // First check data source status
            try {
                const dataSourceResponse = await fetch('/api/data-source');
                if (dataSourceResponse.ok) {
                    const dataSourceInfo = await dataSourceResponse.json();
                    console.log('Data source info:', dataSourceInfo);

                    // Set the data source info
                    this.dataSourceType = dataSourceInfo.source || 'api';
                    this.lastCacheUpdate = dataSourceInfo.last_updated || null;
                }
            } catch (error) {
                console.warn('Error checking data source:', error);
            }

            // Check API status
            try {
                const statusResponse = await fetch('/api/status');
                if (statusResponse.ok) {
                    const statusData = await statusResponse.json();
                    console.log('API Status:', statusData);

                    this.dataSource = statusData.status === 'connected' ? 'API' : 'Cache';
                    if (statusData.fortigate) {
                        this.fortigateInfo = statusData.fortigate;
                    }
                }
            } catch (error) {
                console.error('Error checking API status:', error);
                this.dataSource = 'Cache';
            }

            // Load FortiAPs
            try {
                const apsResponse = await fetch('/api/fortiaps');
                if (apsResponse.ok) {
                    const apsData = await apsResponse.json();
                    this.data.fortiaps = apsData;
                    console.log('Successfully loaded FortiAP data');
                } else {
                    console.error('Failed to load FortiAP data, status:', apsResponse.status);
                }
            } catch (error) {
                console.error('Error loading FortiAP data:', error);
            }

            // Load FortiSwitches
            try {
                const switchesResponse = await fetch('/api/fortiswitches');
                if (switchesResponse.ok) {
                    const switchesData = await switchesResponse.json();
                    this.data.fortiswitches = switchesData;
                    console.log('Successfully loaded FortiSwitch data');
                } else {
                    console.error('Failed to load FortiSwitch data, status:', switchesResponse.status);
                }
            } catch (error) {
                console.error('Error loading FortiSwitch data:', error);
            }

            // Load historical data
            try {
                const historicalResponse = await fetch('/api/historical');
                if (historicalResponse.ok) {
                    const historicalData = await historicalResponse.json();
                    this.data.historical_data = historicalData;
                    console.log('Successfully loaded historical data');
                } else {
                    console.error('Failed to load historical data, status:', historicalResponse.status);
                }
            } catch (error) {
                console.error('Error loading historical data:', error);
            }

            // Load connected devices data
            try {
                const connectedDevicesResponse = await fetch('/api/connected-devices');
                if (connectedDevicesResponse.ok) {
                    const connectedDevicesData = await connectedDevicesResponse.json();
                    this.data.connected_devices = connectedDevicesData;
                    console.log(`Successfully loaded ${connectedDevicesData.total || 0} connected devices`);
                } else {
                    console.error('Failed to load connected devices, status:', connectedDevicesResponse.status);
                }
            } catch (error) {
                console.error('Error loading connected devices:', error);
            }

            // Load statistics
            try {
                const statsResponse = await fetch('/api/stats');
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    this.data.stats = statsData;
                    console.log('Successfully loaded statistics:', statsData);
                } else {
                    console.error('Failed to load stats, status:', statsResponse.status);
                }
            } catch (error) {
                console.error('Error loading stats:', error);
            }

            // Load alerts
            try {
                const alertsResponse = await fetch('/api/alerts');
                if (alertsResponse.ok) {
                    const alertsData = await alertsResponse.json();
                    this.data.alerts = alertsData;
                    console.log(`Successfully loaded ${alertsData.length || 0} alerts`);
                } else {
                    console.error('Failed to load alerts, status:', alertsResponse.status);
                }
            } catch (error) {
                console.error('Error loading alerts:', error);
            }

            // Update last updated time
            this.data.last_updated = new Date().toISOString();

            // Calculate system health metrics
            this.calculateSystemHealth();

            console.log(`Successfully loaded data from ${this.dataSource}`);
            
            // Debug: Log device information if debug mode is enabled
            if (this.debugMode) {
                this.debugAllDevices();
            }
        } catch (error) {
            console.error('Error in loadData:', error);

            // Set minimal structure if data loading completely failed
            this.data = {
                last_updated: new Date().toISOString(),
                fortiaps: [],
                fortiswitches: [],
                historical_data: [],
                system_health: {
                    alerts: [{
                        device: "System",
                        message: "Failed to load data: " + error.message,
                        severity: "high",
                        type: "error"
                    }]
                }
            };

            this.dataSource = 'Error';
        }
    }

    calculateSystemHealth() {
        const fortiaps = this.data.fortiaps || [];
        const fortiswitches = this.data.fortiswitches || [];

        const apsOnline = fortiaps.filter(ap => ap.status === 'up').length;
        const switchesOnline = fortiswitches.filter(sw => sw.status === 'up').length;
        const switchesWarning = fortiswitches.filter(sw => sw.status === 'warning').length;

        let totalPoeConsumption = 0;
        let totalPoeBudget = 0;
        let totalClients = 0;

        fortiswitches.forEach(sw => {
            if (sw.poe_power_consumption) totalPoeConsumption += sw.poe_power_consumption;
            if (sw.poe_power_budget) totalPoeBudget += sw.poe_power_budget;
        });

        fortiaps.forEach(ap => {
            if (ap.clients_connected) totalClients += ap.clients_connected;
        });

        const avgPoeUtilization = totalPoeBudget ? ((totalPoeConsumption / totalPoeBudget) * 100).toFixed(1) : 0;

        // Generate alerts
        const alerts = [];

        // Add data source alert if not using live API
        if (this.dataSource === 'Cache') {
            alerts.push({
                device: "System",
                message: `Using cached data from ${this.lastCacheUpdate ? new Date(this.lastCacheUpdate).toLocaleString() : 'previous session'}`,
                severity: "low",
                type: "info"
            });
        } else if (this.dataSource === 'Error') {
            alerts.push({
                device: "System",
                message: "Unable to connect to FortiGate API",
                severity: "high",
                type: "error"
            });
        }

        // Device alerts
        fortiswitches.forEach(sw => {
            if (sw.status === 'warning' || sw.status === 'down') {
                alerts.push({
                    device: sw.name,
                    message: `Switch ${sw.status === 'down' ? 'offline' : 'in warning state'}`,
                    severity: sw.status === 'down' ? 'high' : 'medium',
                    type: sw.status === 'down' ? 'error' : 'warning'
                });
            }

            if (sw.temperature > 65) {
                alerts.push({
                    device: sw.name,
                    message: `High temperature (${sw.temperature}°C)`,
                    severity: 'medium',
                    type: 'warning'
                });
            }

            if (sw.poe_power_percentage > 80) {
                alerts.push({
                    device: sw.name,
                    message: `PoE utilization at ${sw.poe_power_percentage}%`,
                    severity: 'medium',
                    type: 'warning'
                });
            }

            if (sw.fan_status === 'warning') {
                alerts.push({
                    device: sw.name,
                    message: `Fan issue detected`,
                    severity: 'medium',
                    type: 'warning'
                });
            }
        });

        fortiaps.forEach(ap => {
            if (ap.status === 'down') {
                alerts.push({
                    device: ap.name,
                    message: `Device offline${ap.last_seen ? ' since ' + new Date(ap.last_seen).toLocaleString() : ''}`,
                    severity: 'high',
                    type: 'error'
                });
            }

            if (ap.temperature > 60) {
                alerts.push({
                    device: ap.name,
                    message: `High temperature (${ap.temperature}°C)`,
                    severity: 'medium',
                    type: 'warning'
                });
            }

            if (ap.interfering_aps > 5) {
                alerts.push({
                    device: ap.name,
                    message: `High interference (${ap.interfering_aps} APs detected)`,
                    severity: 'low',
                    type: 'info'
                });
            }
        });

        // Save health metrics to data
        this.data.system_health = {
            alerts,
            aps_offline: fortiaps.length - apsOnline,
            aps_online: apsOnline,
            avg_poe_utilization: parseFloat(avgPoeUtilization),
            switches_offline: fortiswitches.length - switchesOnline - switchesWarning,
            switches_online: switchesOnline,
            switches_warning: switchesWarning,
            total_aps: fortiaps.length,
            total_clients: totalClients,
            total_poe_power_budget: totalPoeBudget,
            total_poe_power_consumption: totalPoeConsumption,
            total_switches: fortiswitches.length,
            data_source: this.dataSource
        };

        // Generate topology data
        this.generateTopologyData();
    }

    generateTopologyData() {
        const fortiaps = this.data.fortiaps || [];
        const fortiswitches = this.data.fortiswitches || [];

        // Create basic topology with FortiGate
        this.data.network_topology = {
            connections: [],
            fortigate: {
                fortilink_interface: "fortilink",
                ip: this.fortigateInfo?.ip || "Unknown",
                model: this.fortigateInfo?.model || "FortiGate",
                version: this.fortigateInfo?.version || "Unknown"
            }
        };

        // Find core switch (if any)
        const coreSwitch = fortiswitches.find(sw =>
            sw.name.toLowerCase().includes('core') ||
            sw.model.includes('524') ||
            sw.model.includes('548')
        );

        // Connect FortiGate to core switch or all switches
        if (coreSwitch) {
            this.data.network_topology.connections.push({
                from: this.data.network_topology.fortigate.model,
                interface: "fortilink",
                status: coreSwitch.status,
                to: coreSwitch.name
            });

            // Connect other switches to core
            fortiswitches.forEach(sw => {
                if (sw.name !== coreSwitch.name) {
                    this.data.network_topology.connections.push({
                        from: coreSwitch.name,
                        interface: "uplink",
                        status: sw.status,
                        to: sw.name
                    });
                }
            });
        } else {
            // Connect all switches directly to FortiGate
            fortiswitches.forEach(sw => {
                this.data.network_topology.connections.push({
                    from: this.data.network_topology.fortigate.model,
                    interface: "fortilink",
                    status: sw.status,
                    to: sw.name
                });
            });
        }

        // Connect APs to switches based on port information if available
        // This is a simplified approach since the actual connections would require port mapping data
        fortiaps.forEach(ap => {
            // Try to find a switch that has this AP connected in its ports list
            let connectedSwitch = null;

            for (const sw of fortiswitches) {
                if (sw.ports && Array.isArray(sw.ports)) {
                    const connectedPort = sw.ports.find(port =>
                        port.device && (
                            port.device.includes(ap.model) ||
                            port.device.includes('FortiAP')
                        )
                    );

                    if (connectedPort) {
                        connectedSwitch = {
                            name: sw.name,
                            port: connectedPort.port
                        };
                        break;
                    }
                }
            }

            // If no direct connection found, connect to a random switch or the core
            if (!connectedSwitch) {
                const targetSwitch = coreSwitch ||
                    (fortiswitches.length > 0 ? fortiswitches[Math.floor(Math.random() * fortiswitches.length)] : null);

                if (targetSwitch) {
                    connectedSwitch = {
                        name: targetSwitch.name,
                        port: `port${Math.floor(Math.random() * 24) + 1}`
                    };
                }
            }

            // Add the connection if we found a switch
            if (connectedSwitch) {
                this.data.network_topology.connections.push({
                    from: connectedSwitch.name,
                    port: connectedSwitch.port,
                    status: ap.status,
                    to: ap.name
                });
            }
        });
    }

    setupAutoRefresh() {
        // Auto-refresh data every 5 minutes
        setInterval(() => {
            this.refreshData();
        }, 5 * 60 * 1000); // 5 minutes
    }

    toggleTheme() {
        this.darkMode = !this.darkMode;
        
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        }
    }

    async refreshData() {
        await this.loadData();
        this.render();
    }

    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `fortigate-network-export-${new Date().toISOString().slice(0, 10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    render() {
        this.updateLastUpdated();
        this.renderOverview();
        this.renderFortiAPs();
        this.renderFortiSwitches();
        this.renderPOEMonitoring();
        this.renderHistorical();
        // Connected devices are rendered on-demand when tab is activated
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // Refresh charts when switching to historical tab
        if (tabName === 'historical') {
            setTimeout(() => this.renderHistorical(), 100);
        }

        // Refresh hierarchy when switching to topology tab
        // if (tabName === 'topology') {
        //     setTimeout(() => this.refreshHierarchy(), 100);
        // }

        // Render topology only when topology tab is activated
        if (tabName === 'topology') {
            this.renderTopology();
        }

        // Render 3D topology only when 3D topology tab is activated
        if (tabName === '3d-topology') {
            this.render3DTopology();
        }

        // Render connected devices only when connected-devices tab is activated
        if (tabName === 'connected-devices') {
            this.renderConnectedDevices();
        }

        // Render force graph only when force-graph tab is activated
        if (tabName === 'force-graph') {
            this.renderForceGraph();
        }
    }

    updateLastUpdated() {
        const lastUpdated = new Date(this.data.last_updated);
        const element = document.getElementById('lastUpdatedTime');

        if (element) {
            let sourceText = this.dataSource;

            // Add more context for Cache source
            if (this.dataSource === 'Cache' && this.lastCacheUpdate) {
                const cacheDate = new Date(this.lastCacheUpdate);
                const timeDiff = Math.round((Date.now() - cacheDate.getTime()) / (1000 * 60 * 60));
                sourceText = `${sourceText} (from ${timeDiff} hour${timeDiff !== 1 ? 's' : ''} ago)`;
            }

            element.textContent = `${lastUpdated.toLocaleString()} (${sourceText})`;

            // Update element color based on data source
            if (this.dataSource === 'API') {
                element.style.color = 'var(--color-success)';
            } else if (this.dataSource === 'Cache') {
                element.style.color = 'var(--color-warning)';
            } else {
                element.style.color = 'var(--color-danger)';
            }
        }
    }

    renderOverview() {
        const health = this.data.system_health;
        if (!health) return;

        // Update summary cards
        if (document.getElementById('totalAPs')) {
            document.getElementById('totalAPs').textContent = health.total_aps;
            document.getElementById('apsOnline').textContent = health.aps_online;
            document.getElementById('apsOffline').textContent = health.aps_offline;
        }

        if (document.getElementById('totalSwitches')) {
            document.getElementById('totalSwitches').textContent = health.total_switches;
            document.getElementById('switchesOnline').textContent = health.switches_online;
            document.getElementById('switchesOffline').textContent = health.switches_offline;
        }

        if (document.getElementById('totalClients')) {
            document.getElementById('totalClients').textContent = health.total_clients;
        }

        if (document.getElementById('totalPOEPower')) {
            document.getElementById('totalPOEPower').textContent = health.total_poe_power_consumption + 'W';
        }

        if (document.getElementById('poeBudget')) {
            document.getElementById('poeBudget').textContent = health.total_poe_power_budget + 'W';
        }

        // Render alerts
        this.renderAlerts();

        // Render overview chart
        this.renderOverviewChart();
    }

    renderAlerts() {
        const alertsList = document.getElementById('alertsList');
        const alerts = this.data.system_health?.alerts || [];

        if (!alertsList) return;

        if (alerts.length === 0) {
            alertsList.innerHTML = '<p class="text-center">No active alerts</p>';
            return;
        }

        alertsList.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.severity}">
                <div class="alert-icon">
                    <i class="fas ${alert.type === 'error' ? 'fa-exclamation-circle' : alert.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-device">${alert.device}</div>
                    <div class="alert-message">${alert.message}</div>
                </div>
            </div>
        `).join('');
    }

    renderOverviewChart() {
        const ctx = document.getElementById('overviewChart');
        if (!ctx) return;

        if (this.charts.overview) {
            this.charts.overview.destroy();
        }

        const health = this.data.system_health;
        if (!health) return;

        this.charts.overview = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['APs Online', 'APs Offline', 'Switches Online', 'Switches Warning'],
                datasets: [{
                    data: [
                        health.aps_online || 0,
                        health.aps_offline || 0,
                        health.switches_online || 0,
                        health.switches_warning || 0
                    ],
                    backgroundColor: ['#1FB8CD', '#B4413C', '#FFC185', '#D2BA4C']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderFortiAPs() {
        const apGrid = document.getElementById('apGrid');
        if (!apGrid) return;

        const fortiaps = this.data.fortiaps || [];

        if (fortiaps.length === 0) {
            apGrid.innerHTML = '<div class="card"><div class="card__body"><p class="text-center">No FortiAPs found</p></div></div>';
            return;
        }

        apGrid.innerHTML = fortiaps.map((ap, index) => `
            <div class="card device-card ${ap.status === 'up' ? 'status-up' : 'status-down'}" 
                 style="cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" 
                 onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" 
                 onmouseout="this.style.transform=''; this.style.boxShadow=''"
                 onclick="window.dashboard.showAPDetails(${index})"
                 title="Click for detailed information">
                <div class="card__header">
                    <h3>
                        <span class="status-indicator ${ap.status === 'up' ? 'online' : 'offline'}" 
                              title="${ap.status === 'up' ? 'Device is online and operational' : 'Device is offline'}"></span>
                        ${ap.name || 'Unknown'}
                    </h3>
                    <span class="badge ${ap.status === 'up' ? 'badge-success' : 'badge-danger'}">
                        ${ap.status === 'up' ? 'Online' : 'Offline'}
                    </span>
                </div>
                <div class="card__body">
                    <div class="device-info">
                        <div class="info-item" title="Access Point Model">
                            <span class="info-label">Model:</span>
                            <span class="info-value">${ap.model || 'Unknown'}</span>
                        </div>
                        <div class="info-item" title="IP Address: ${ap.ip_address || 'Unknown'}">
                            <span class="info-label">IP Address:</span>
                            <span class="info-value">${ap.ip_address || 'Unknown'}</span>
                        </div>
                        <div class="info-item" title="Firmware Version">
                            <span class="info-label">Firmware:</span>
                            <span class="info-value">${ap.firmware_version || 'Unknown'}</span>
                        </div>
                        <div class="info-item" title="${ap.clients_connected || 0} wireless clients connected to this AP">
                            <span class="info-label">Clients:</span>
                            <span class="info-value"><i class="fas fa-users"></i> ${ap.clients_connected || 0}</span>
                        </div>
                        <div class="info-item" title="Current operating temperature">
                            <span class="info-label">Temperature:</span>
                            <span class="info-value">${ap.temperature || 0}°C</span>
                        </div>
                        <div class="info-item" title="Device Serial Number">
                            <span class="info-label">Serial:</span>
                            <span class="info-value">${ap.serial || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showAPDetails(index) {
        const ap = this.data.fortiaps[index];
        if (!ap) return;

        const modal = document.createElement('div');
        modal.className = 'detail-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); display: flex; align-items: center;
            justify-content: center; z-index: 10000; padding: 2rem;
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; padding: 2rem; position: relative;">
                <button onclick="this.closest('.detail-modal').remove()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                
                <h2 style="margin: 0 0 1.5rem 0; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                    <img src="babylon_3d/babylon_app/network-visualizer/assets/textures/real_fortiap.svg" style="height: 32px;"> ${ap.name || 'Unknown AP'}
                </h2>
                
                <div style="display: grid; gap: 1rem;">
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Status</h3>
                        <span class="badge ${ap.status === 'up' ? 'badge-success' : 'badge-danger'}" style="font-size: 1rem;">
                            ${ap.status === 'up' ? '🟢 Online' : '🔴 Offline'}
                        </span>
                    </div>
                    
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Device Information</h3>
                        <div style="display: grid; gap: 0.5rem; font-size: 0.95rem;">
                            <div><strong>Model:</strong> ${ap.model || 'Unknown'}</div>
                            <div><strong>Serial Number:</strong> ${ap.serial || 'Unknown'}</div>
                            <div><strong>IP Address:</strong> ${ap.ip_address || 'Unknown'}</div>
                            <div><strong>MAC Address:</strong> ${ap.board_mac || 'Unknown'}</div>
                            <div><strong>Firmware:</strong> ${ap.firmware_version || 'Unknown'}</div>
                        </div>
                    </div>
                    
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Performance Metrics</h3>
                        <div style="display: grid; gap: 0.5rem; font-size: 0.95rem;">
                            <div><strong>Connected Clients:</strong> <i class="fas fa-users"></i> ${ap.clients_connected || 0}</div>
                            <div><strong>Temperature:</strong> 🌡️ ${ap.temperature || 0}°C</div>
                            <div><strong>Interfering APs:</strong> ${ap.interfering_aps || 0}</div>
                            ${ap.last_seen ? `<div><strong>Last Seen:</strong> ${new Date(ap.last_seen).toLocaleString()}</div>` : ''}
                        </div>
                    </div>
                    
                    ${ap.ssid && ap.ssid.length > 0 ? `
                        <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                            <h3 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Broadcast SSIDs</h3>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                ${ap.ssid.map(ssid => `<span style="padding: 0.25rem 0.75rem; background: #1FB8CD; color: white; border-radius: 12px; font-size: 0.85rem;">${ssid}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    renderFortiSwitches() {
        const switchGrid = document.getElementById('switchGrid');
        if (!switchGrid) return;

        const fortiswitches = this.data.fortiswitches || [];

        if (fortiswitches.length === 0) {
            switchGrid.innerHTML = '<div class="card"><div class="card__body"><p class="text-center">No FortiSwitches found</p></div></div>';
            return;
        }

        switchGrid.innerHTML = fortiswitches.map((sw, index) => `
            <div class="card device-card ${sw.status === 'up' ? 'status-up' : sw.status === 'warning' ? 'status-warning' : 'status-down'}"
                 style="cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" 
                 onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" 
                 onmouseout="this.style.transform=''; this.style.boxShadow=''"
                 onclick="window.dashboard.showSwitchDetails(${index})"
                 title="Click for detailed port information">
                <div class="card__header">
                    <h3>
                        <span class="status-indicator ${sw.status === 'up' ? 'online' : sw.status === 'warning' ? 'warning' : 'offline'}"
                              title="${sw.status === 'up' ? 'Switch is online' : 'Switch is offline/warning'}"></span>
                        ${sw.name || 'Unknown'}
                    </h3>
                    <span class="badge ${sw.status === 'up' ? 'badge-success' : sw.status === 'warning' ? 'badge-warning' : 'badge-danger'}">
                        ${sw.status === 'up' ? 'Online' : sw.status === 'warning' ? 'Warning' : 'Offline'}
                    </span>
                </div>
                <div class="card__body">
                    <div class="device-info">
                        <div class="info-item" title="Switch Model">
                            <span class="info-label">Model:</span>
                            <span class="info-value">${sw.model || 'Unknown'}</span>
                        </div>
                        <div class="info-item" title="IP Address: ${sw.ip_address || 'Unknown'}">
                            <span class="info-label">IP Address:</span>
                            <span class="info-value">${sw.ip_address || 'Unknown'}</span>
                        </div>
                        <div class="info-item" title="Firmware Version">
                            <span class="info-label">Firmware:</span>
                            <span class="info-value">${sw.firmware_version || 'Unknown'}</span>
                        </div>
                        <div class="info-item" title="Total physical ports on device">
                            <span class="info-label">Total Ports:</span>
                            <span class="info-value">${sw.ports_total || 0}</span>
                        </div>
                        <div class="info-item" title="Ports with active link / Total ports">
                            <span class="info-label">Active Ports:</span>
                            <span class="info-value">${sw.ports_up || 0} / ${sw.ports_total || 0}</span>
                        </div>
                        <div class="info-item" title="Current POE Usage / Total Budget">
                            <span class="info-label">POE Power:</span>
                            <span class="info-value">${sw.poe_power_consumption || 0}W / ${sw.poe_power_budget || 0}W</span>
                        </div>
                        <div class="info-item" title="Device Serial Number">
                            <span class="info-label">Serial:</span>
                            <span class="info-value">${sw.serial || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showSwitchDetails(index) {
        const sw = this.data.fortiswitches[index];
        if (!sw) return;

        const modal = document.createElement('div');
        modal.className = 'detail-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); display: flex; align-items: center;
            justify-content: center; z-index: 10000; padding: 2rem;
        `;

        // Generate port grid HTML
        let portsHtml = '';
        if (sw.ports && Array.isArray(sw.ports)) {
            // Sort ports logically
            const sortedPorts = [...sw.ports].sort((a, b) => {
                const numA = parseInt(a.port.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.port.replace(/\D/g, '')) || 0;
                return numA - numB;
            });

            portsHtml = `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 0.8rem; margin-top: 1rem;">
                    ${sortedPorts.map(port => {
                const isUp = port.status === 'up';
                const hasPoe = port.poe_power > 0;
                const bgColor = isUp ? (hasPoe ? '#e8f5e9' : '#e3f2fd') : '#f5f5f5';
                const borderColor = isUp ? (hasPoe ? '#4caf50' : '#2196f3') : '#e0e0e0';

                return `
                            <div style="border: 2px solid ${borderColor}; background: ${bgColor}; border-radius: 6px; padding: 0.5rem; text-align: center; position: relative;"
                                 title="${port.port}: ${isUp ? 'UP' : 'DOWN'}${hasPoe ? ` (${port.poe_power}W)` : ''}">
                                <div style="font-size: 0.8rem; font-weight: bold; margin-bottom: 0.2rem;">${port.port.replace('port', '')}</div>
                                <div style="font-size: 1rem;">
                                    ${isUp ? (hasPoe ? '⚡' : '🟢') : '⚪'}
                                </div>
                                ${hasPoe ? `<div style="font-size: 0.7rem; margin-top: 0.2rem;">${port.poe_power}W</div>` : ''}
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 800px; width: 100%; max-height: 85vh; overflow-y: auto; padding: 2rem; position: relative;">
                <button onclick="this.closest('.detail-modal').remove()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                
                <h2 style="margin: 0 0 1.5rem 0; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                    <img src="babylon_3d/babylon_app/network-visualizer/assets/textures/real_fortiswitch.svg" style="height: 32px;"> ${sw.name || 'Unknown Switch'}
                </h2>
                
                <div style="display: grid; gap: 1.5rem;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                            <h3 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Device Info</h3>
                            <div style="display: grid; gap: 0.5rem; font-size: 0.9rem;">
                                <div><strong>Model:</strong> ${sw.model || 'Unknown'}</div>
                                <div><strong>Serial:</strong> ${sw.serial || 'Unknown'}</div>
                                <div><strong>IP:</strong> ${sw.ip_address || 'Unknown'}</div>
                                <div><strong>Firmware:</strong> ${sw.firmware_version || 'Unknown'}</div>
                            </div>
                        </div>
                        
                        <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                            <h3 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Power & Status</h3>
                            <div style="display: grid; gap: 0.5rem; font-size: 0.9rem;">
                                <div><strong>Status:</strong> ${sw.status === 'up' ? '🟢 Online' : '🔴 Offline'}</div>
                                <div><strong>POE Usage:</strong> ${sw.poe_power_consumption}W / ${sw.poe_power_budget}W</div>
                                <div><strong>Temperature:</strong> ${sw.temperature || 'N/A'}°C</div>
                                <div><strong>Fan Status:</strong> ${sw.fan_status || 'OK'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Port Status</h3>
                        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.85rem;">
                            <span style="display: flex; align-items: center; gap: 0.3rem;"><span style="width: 10px; height: 10px; background: #4caf50; border-radius: 50%;"></span> POE Active</span>
                            <span style="display: flex; align-items: center; gap: 0.3rem;"><span style="width: 10px; height: 10px; background: #2196f3; border-radius: 50%;"></span> Link Up</span>
                            <span style="display: flex; align-items: center; gap: 0.3rem;"><span style="width: 10px; height: 10px; background: #e0e0e0; border-radius: 50%;"></span> Link Down</span>
                        </div>
                        ${portsHtml}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    renderPOEMonitoring() {
        const poeContainer = document.getElementById('poeMonitoring');
        if (!poeContainer) return;

        const fortiswitches = this.data.fortiswitches || [];

        if (fortiswitches.length === 0) {
            poeContainer.innerHTML = '<p class="text-center">No POE data available</p>';
            return;
        }

        let html = '';

        fortiswitches.forEach((sw, switchIndex) => {
            if (!sw.poe_power_budget) return; // Skip switches without POE

            const usagePercent = sw.poe_power_consumption / sw.poe_power_budget * 100;
            const barClass = usagePercent > 80 ? 'high' : usagePercent > 60 ? 'medium' : 'low';

            html += `
                <div class="poe-device" style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); padding: 1.5rem; margin-bottom: 2rem;">
                    <div class="poe-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <span class="poe-device-name" style="font-size: 1.1rem; font-weight: 600; color: #333;">
                            <i class="fas fa-plug" style="color: #667eea; margin-right: 0.5rem;"></i>
                            ${sw.name || 'Unknown Switch'}
                        </span>
                        <span class="poe-usage" style="font-weight: 600; color: #666;">
                            ${Math.round(usagePercent)}% <span style="font-weight: 400; font-size: 0.9rem;">(${sw.poe_power_consumption}W / ${sw.poe_power_budget}W)</span>
                        </span>
                    </div>
                    <div class="poe-bar-container" style="height: 10px; background: #e9ecef; border-radius: 5px; overflow: hidden; margin-bottom: 1.5rem;">
                        <div class="poe-bar ${barClass}" style="width: ${Math.min(100, usagePercent)}%; height: 100%; background: ${usagePercent > 80 ? '#dc3545' : usagePercent > 60 ? '#ffc107' : '#28a745'}; transition: width 0.5s ease;"></div>
                    </div>
                    <div class="poe-ports">
                        ${this.renderPOEPorts(sw, switchIndex)}
                    </div>
                </div>
            `;
        });

        poeContainer.innerHTML = html || '<p class="text-center">No POE data available</p>';
    }

    renderPOEPorts(switchData, switchIndex) {
        if (!switchData.ports || !Array.isArray(switchData.ports)) return '';

        // Filter to only POE ports and sort by port number
        const poePorts = switchData.ports
            .filter(port => port.poe_capable)
            .sort((a, b) => {
                const portNumA = parseInt(a.port.replace(/\D/g, ''));
                const portNumB = parseInt(b.port.replace(/\D/g, ''));
                return portNumA - portNumB;
            });

        if (poePorts.length === 0) return '<p>No POE ports on this device</p>';

        return `
            <div class="poe-port-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 1rem;">
                ${poePorts.map((port) => {
            const usagePercent = port.poe_power ? (port.poe_power / port.poe_max) * 100 : 0;
            const isUp = port.status === 'up';
            const hasPower = port.poe_power > 0;

            let statusColor = '#e0e0e0'; // Disabled/Down
            if (isUp) {
                if (usagePercent > 90) statusColor = '#dc3545'; // Critical
                else if (usagePercent > 75) statusColor = '#ffc107'; // Warning
                else if (hasPower) statusColor = '#28a745'; // Active
                else statusColor = '#17a2b8'; // Up but no power
            }

            return `
                        <div class="poe-port" 
                             style="border: 1px solid ${hasPower ? statusColor : '#ddd'}; background: ${hasPower ? 'rgba(40, 167, 69, 0.05)' : '#fff'}; border-radius: 8px; padding: 0.8rem; text-align: center; cursor: pointer; transition: all 0.2s;"
                             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)'"
                             onmouseout="this.style.transform=''; this.style.boxShadow=''"
                             onclick="window.dashboard.showPOEPortDetails('${switchData.name}', '${port.port}', ${port.poe_power}, ${port.poe_max}, '${port.status}')"
                             title="Port ${port.port}: ${hasPower ? port.poe_power + 'W' : 'No Load'}">
                            <div class="port-label" style="font-weight: bold; font-size: 0.9rem; margin-bottom: 0.3rem;">${port.port.replace('port', 'P')}</div>
                            <div class="port-icon" style="font-size: 1.2rem; margin-bottom: 0.3rem; color: ${statusColor};">
                                <i class="fas fa-bolt"></i>
                            </div>
                            <div class="port-power" style="font-size: 0.8rem; color: #666;">${port.poe_power || 0}W</div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    showPOEPortDetails(switchName, portName, power, max, status) {
        const percent = max > 0 ? Math.round((power / max) * 100) : 0;

        const modal = document.createElement('div');
        modal.className = 'detail-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); display: flex; align-items: center;
            justify-content: center; z-index: 10000; padding: 2rem;
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 400px; width: 100%; padding: 2rem; position: relative; text-align: center;">
                <button onclick="this.closest('.detail-modal').remove()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                
                <div style="width: 60px; height: 60px; background: ${power > 0 ? '#e8f5e9' : '#f5f5f5'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                    <i class="fas fa-bolt" style="font-size: 2rem; color: ${power > 0 ? '#28a745' : '#ccc'};"></i>
                </div>
                
                <h2 style="margin: 0 0 0.5rem 0; color: #333;">${switchName} - ${portName}</h2>
                <div style="color: #666; margin-bottom: 1.5rem;">POE Status Details</div>
                
                <div style="background: #f8f9fa; border-radius: 8px; padding: 1.5rem; text-align: left;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem; border-bottom: 1px solid #eee; padding-bottom: 0.8rem;">
                        <span style="color: #666;">Status:</span>
                        <span style="font-weight: bold; color: ${status === 'up' ? '#28a745' : '#dc3545'}">
                            ${status === 'up' ? '🟢 Link Up' : '🔴 Link Down'}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem;">
                        <span style="color: #666;">Power Draw:</span>
                        <span style="font-weight: bold;">${power} Watts</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem;">
                        <span style="color: #666;">Max Budget:</span>
                        <span style="font-weight: bold;">${max} Watts</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #666;">Utilization:</span>
                        <span style="font-weight: bold;">${percent}%</span>
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden;">
                    <div style="width: ${percent}%; height: 100%; background: ${percent > 80 ? '#dc3545' : percent > 60 ? '#ffc107' : '#28a745'};"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    renderTopology() {
        const topologyContainer = document.getElementById('hierarchy-tree-2d');
        if (!topologyContainer) return;

        // Fetch topology data if not already available or force refresh
        fetch('/api/topology')
            .then(res => res.json())
            .then(topology => {
                // Initialize D3 Topology
                // We use the 'hierarchy-tree-2d' container which is already in the HTML
                // Ensure the container has a height
                topologyContainer.style.height = '600px';
                topologyContainer.style.width = '100%';

                // Clear any existing content/loading message
                topologyContainer.innerHTML = '';

                // Create new D3 Topology instance
                new D3Topology('hierarchy-tree-2d', topology, {
                    width: topologyContainer.clientWidth,
                    height: 600
                });
            })
            .catch(err => {
                console.error('Error loading topology:', err);
                topologyContainer.innerHTML = '<p class="text-center" style="padding: 2rem; color: #dc3545;">Failed to load topology from FortiGate.</p>';
            });
    }

    updateHistoricalCharts(timeRange) {
        this.renderHistorical();
    }

    renderHistorical() {
        if (!this.data.historical_data || !Array.isArray(this.data.historical_data)) return;

        this.renderClientsChart();
        this.renderPOEChart();
        this.renderTemperatureChart();
        this.renderChannelChart();
    }

    renderClientsChart() {
        const ctx = document.getElementById('clientsChart');
        if (!ctx) return;

        if (this.charts.clients) {
            this.charts.clients.destroy();
        }

        const historical = this.data.historical_data;
        const labels = historical.map(h => new Date(h.timestamp).toLocaleTimeString());
        const data = historical.map(h => h.total_clients);

        this.charts.clients = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Connected Clients',
                    data: data,
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderPOEChart() {
        const ctx = document.getElementById('poeChart');
        if (!ctx) return;

        if (this.charts.poe) {
            this.charts.poe.destroy();
        }

        const historical = this.data.historical_data;
        const labels = historical.map(h => new Date(h.timestamp).toLocaleTimeString());
        const data = historical.map(h => h.total_poe_power);

        this.charts.poe = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'POE Power (W)',
                    data: data,
                    borderColor: '#FFC185',
                    backgroundColor: 'rgba(255, 193, 133, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderTemperatureChart() {
        const ctx = document.getElementById('temperatureChart');
        if (!ctx) return;

        if (this.charts.temperature) {
            this.charts.temperature.destroy();
        }

        const historical = this.data.historical_data;
        const labels = historical.map(h => new Date(h.timestamp).toLocaleTimeString());

        this.charts.temperature = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'AP Temperature (°C)',
                        data: historical.map(h => h.avg_ap_temperature),
                        borderColor: '#B4413C',
                        backgroundColor: 'rgba(180, 65, 60, 0.1)',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Switch Temperature (°C)',
                        data: historical.map(h => h.avg_switch_temperature),
                        borderColor: '#D2BA4C',
                        backgroundColor: 'rgba(210, 186, 76, 0.1)',
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        }
                    }
                }
            }
        });
    }

    renderChannelChart() {
        const ctx = document.getElementById('channelChart');
        if (!ctx) return;

        if (this.charts.channelUtil) {
            this.charts.channelUtil.destroy();
        }

        const historical = this.data.historical_data;
        const labels = historical.map(h => new Date(h.timestamp).toLocaleTimeString());

        this.charts.channelUtil = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '2.4 GHz Utilization (%)',
                        data: historical.map(h => h.avg_channel_utilization_2_4),
                        borderColor: '#1FB8CD',
                        backgroundColor: 'rgba(31, 184, 205, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: '5 GHz Utilization (%)',
                        data: historical.map(h => h.avg_channel_utilization_5),
                        borderColor: '#FFC185',
                        backgroundColor: 'rgba(255, 193, 133, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Utilization (%)'
                        }
                    }
                }
            }
        });
    }

    render3DTopology() {
        const canvas = document.getElementById('renderCanvas');
        const loadingScreen = document.getElementById('loadingScreen3D');

        if (!canvas) return;

        // Show loading screen
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }

        // Initialize Babylon.js engine
        const engine = new BABYLON.Engine(canvas, true);

        // Create scene
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.2, 0.2, 0.2, 1); // Dark Grey Studio Background #333333

        // Remove default environment texture if any
        scene.environmentTexture = null;

        // Camera setup
        const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 4, Math.PI / 3, 25, BABYLON.Vector3.Zero(), scene);
        camera.attachControl(canvas, true);
        camera.wheelPrecision = 50;
        camera.minZ = 0.1;

        // --- Studio Lighting Setup ---

        // 1. Key Light (Main source, bright, casts shadows)
        const keyLight = new BABYLON.DirectionalLight("keyLight", new BABYLON.Vector3(-1, -2, -1), scene);
        keyLight.intensity = 1.2;
        keyLight.position = new BABYLON.Vector3(20, 40, 20);

        // Enable shadows for Key Light
        const shadowGenerator = new BABYLON.ShadowGenerator(1024, keyLight);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;

        // 2. Fill Light (Softer, fills shadows, opposite to key)
        const fillLight = new BABYLON.HemisphericLight("fillLight", new BABYLON.Vector3(1, 1, 0), scene);
        fillLight.intensity = 0.5;
        fillLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        // 3. Rim Light (Backlight, separates objects from background)
        const rimLight = new BABYLON.SpotLight("rimLight", new BABYLON.Vector3(0, 10, 20), new BABYLON.Vector3(0, -1, -2), Math.PI / 3, 2, scene);
        rimLight.intensity = 0.8;
        rimLight.diffuse = new BABYLON.Color3(1, 1, 1); // White rim

        // Create ground (Matte Studio Floor)
        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);
        const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Match background for seamless look
        groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0); // No specular for matte look
        ground.material = groundMaterial;
        ground.receiveShadows = true;

        // Fetch topology data
        fetch('/api/topology')
            .then(res => res.json())
            .then(topology => {
                this.create3DNetwork(scene, topology);

                // Hide loading screen
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                }

                // Start render loop
                engine.runRenderLoop(() => {
                    scene.render();
                });

                // Handle window resize
                window.addEventListener('resize', () => {
                    engine.resize();
                });

                // Setup controls
                this.setup3DControls(scene, engine, camera);
            })
            .catch(err => {
                console.error('Error loading 3D topology:', err);
                if (loadingScreen) {
                    loadingScreen.innerHTML = '<p style="color: red;">Failed to load 3D topology</p>';
                }
            });
    }

    create3DNetwork(scene, topology) {
        // Clear existing meshes (except ground and skyBox if they exist)
        scene.meshes.forEach(mesh => {
            if (mesh.name !== "ground" && mesh.name !== "skyBox") {
                mesh.dispose();
            }
        });

        const devices = [];

        // --- Vertical Tree Layout Calculation ---
        // Level 0: Cloud (Internet)
        // Level 1: FortiGate (61E)
        // Level 2: FortiSwitch (124 POE)
        // Level 3: FortiAPs (Puck)

        const startY = 6;
        const levelHeight = 4; // Vertical distance between levels

        // 1. Cloud
        const cloudPos = new BABYLON.Vector3(0, startY, 0);
        const cloudMesh = BABYLON.MeshBuilder.CreateSphere("cloud", { diameter: 2 }, scene);
        const cloudMat = new BABYLON.StandardMaterial("cloudMat", scene);
        cloudMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.95);
        cloudMat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        cloudMesh.material = cloudMat;
        cloudMesh.position = cloudPos;

        // Label for Cloud
        // (Optional: Add text label)

        // 2. FortiGate (Level 1)
        const gatePos = new BABYLON.Vector3(0, startY - levelHeight, 0);
        const gateData = topology.fortigate || { hostname: 'FortiGate-61E' };
        const gateMesh = this.createDeviceMesh(scene, 'firewall', gateData, gatePos);
        devices.push({ mesh: gateMesh, data: gateData, type: 'firewall' });

        // Connect Cloud -> Gate
        this.createConnection(scene, cloudMesh, gateMesh);

        // 3. FortiSwitch (Level 2)
        // Assuming single switch for now based on reference, or stack them if multiple
        const switches = topology.switches || [];
        const switchY = startY - (levelHeight * 2);

        switches.forEach((sw, index) => {
            // Center switches if multiple
            const spacing = 5;
            const x = (index - (switches.length - 1) / 2) * spacing;
            const swPos = new BABYLON.Vector3(x, switchY, 0);

            const swMesh = this.createDeviceMesh(scene, 'switch', sw, swPos);
            devices.push({ mesh: swMesh, data: sw, type: 'switch' });

            // Connect Gate -> Switch
            this.createConnection(scene, gateMesh, swMesh);

            // Add wired clients connected to this switch
            if (topology.connected_devices && topology.connected_devices.wired) {
                const wiredClients = topology.connected_devices.wired.filter(device => 
                    device.switch_id === sw.serial || device.switch_name === sw.name
                );
                
                const clientY = switchY - 2;
                wiredClients.forEach((client, clientIndex) => {
                    const clientSpacing = 1.5;
                    const clientX = x + (clientIndex - (wiredClients.length - 1) / 2) * clientSpacing;
                    const clientPos = new BABYLON.Vector3(clientX, clientY, 0);
                    
                    const clientMesh = this.createDeviceMesh(scene, 'endpoint', client, clientPos);
                    devices.push({ mesh: clientMesh, data: client, type: 'endpoint' });
                    this.createConnection(scene, swMesh, clientMesh);
                });
            }
        });

        // 4. FortiAPs (Level 3)
        const aps = topology.aps || [];
        const apY = startY - (levelHeight * 3);

        aps.forEach((ap, index) => {
            // Distribute APs in a row
            const spacing = 4;
            const x = (index - (aps.length - 1) / 2) * spacing;
            const apPos = new BABYLON.Vector3(x, apY, 0);

            const apMesh = this.createDeviceMesh(scene, 'access_point', ap, apPos);
            devices.push({ mesh: apMesh, data: ap, type: 'access_point' });

            // Connect to nearest switch (or parent switch if data available)
            // For visualization, connect to the first switch if no parent info
            if (devices.some(d => d.type === 'switch')) {
                const parentSwitch = devices.find(d => d.type === 'switch'); // Simplified
                this.createConnection(scene, parentSwitch.mesh, apMesh);
            }

            // Add wireless clients connected to this AP
            if (topology.connected_devices && topology.connected_devices.wireless) {
                const wirelessClients = topology.connected_devices.wireless.filter(device => 
                    device.ap_serial === ap.serial || device.ap_name === ap.name
                );
                
                const clientY = apY - 2;
                wirelessClients.forEach((client, clientIndex) => {
                    const clientSpacing = 1.5;
                    const clientX = x + (clientIndex - (wirelessClients.length - 1) / 2) * clientSpacing;
                    const clientPos = new BABYLON.Vector3(clientX, clientY, 0);
                    
                    const clientMesh = this.createDeviceMesh(scene, 'endpoint', client, clientPos);
                    devices.push({ mesh: clientMesh, data: client, type: 'endpoint' });
                    this.createConnection(scene, apMesh, clientMesh);
                });
            }
        });

        // Store devices for interaction
        scene.deviceData = devices;
    }

    createDeviceMesh(scene, type, data, position) {
        let mesh;
        const material = new BABYLON.StandardMaterial(`${type}Mat`, scene);
        let texturePath = null;
        let layout = null;

        // White Clay Material Style
        material.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95); // Off-white clay
        material.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Very matte
        material.roughness = 0.8;

        // Get device model from data
        const deviceModel = data.model || data.hostname || '';

        // Use DeviceConfig if available, otherwise use defaults
        if (this.deviceConfig) {
            // For endpoints/clients, pass device data for vendor/type/OS matching
            if (type === 'endpoint' || type === 'client') {
                texturePath = this.deviceConfig.getIconPath(type, deviceModel, data);
            } else {
                texturePath = this.deviceConfig.getIconPath(type, deviceModel);
            }
            
            // Get device-specific layout
            layout = this.deviceConfig.getLayout(type, deviceModel);

            // Debug logging if enabled
            if (this.debugMode) {
                this.deviceConfig.debugDevice(data, type);
            }
        }

        // Fallback to default layouts if DeviceConfig not available or no layout found
        if (!layout) {
            switch (type) {
                case 'firewall':
                    layout = { shape: 'box', width: 2.5, height: 0.8, depth: 2.2 };
                    break;
                case 'switch':
                    layout = { shape: 'box', width: 4.0, height: 0.8, depth: 2.2 };
                    break;
                case 'access_point':
                    layout = { shape: 'cylinder', height: 0.5, diameter: 2.0 };
                    break;
                case 'endpoint':
                case 'client':
                    layout = { shape: 'sphere', diameter: 0.6 };
                    break;
                default:
                    layout = { shape: 'sphere', diameter: 0.8 };
            }
        }

        // Fallback to default texture paths if DeviceConfig not available
        if (!texturePath) {
            switch (type) {
                case 'firewall':
                    texturePath = 'babylon_3d/babylon_app/network-visualizer/assets/textures/real_fortigate.svg';
                    break;
                case 'switch':
                    texturePath = 'babylon_3d/babylon_app/network-visualizer/assets/textures/real_fortiswitch.svg';
                    break;
                case 'access_point':
                    texturePath = 'babylon_3d/babylon_app/network-visualizer/assets/textures/real_fortiap.svg';
                    break;
                case 'endpoint':
                case 'client':
                    // Texture path already set by DeviceConfig above
                    // If no texture found, use colored material as fallback
                    if (!texturePath) {
                        material.diffuseColor = data.is_online 
                            ? new BABYLON.Color3(0.2, 0.8, 0.2) // Green for online
                            : new BABYLON.Color3(0.8, 0.2, 0.2); // Red for offline
                    }
                    break;
            }
        }

        // Create mesh based on layout shape
        const deviceName = data.name || data.hostname || type;
        switch (layout.shape) {
            case 'box':
                mesh = BABYLON.MeshBuilder.CreateBox(deviceName, {
                    width: layout.width || 2.0,
                    height: layout.height || 0.8,
                    depth: layout.depth || 2.0
                }, scene);
                break;
            case 'cylinder':
                mesh = BABYLON.MeshBuilder.CreateCylinder(deviceName, {
                    height: layout.height || 0.5,
                    diameter: layout.diameter || 2.0,
                    tessellation: 32
                }, scene);
                break;
            case 'sphere':
                mesh = BABYLON.MeshBuilder.CreateSphere(deviceName, {
                    diameter: layout.diameter || 0.8
                }, scene);
                break;
            case 'plane':
                // Create a plane for billboard-style device icons
                mesh = BABYLON.MeshBuilder.CreatePlane(deviceName, {
                    width: layout.width || 1.0,
                    height: layout.height || 1.0
                }, scene);
                // Make plane always face camera (billboard)
                mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
                break;
            default:
                // Fallback to box
                mesh = BABYLON.MeshBuilder.CreateBox(deviceName, {
                    width: 2.0,
                    height: 0.8,
                    depth: 2.0
                }, scene);
        }

        // Apply texture if available
        if (texturePath) {
            const texture = new BABYLON.Texture(texturePath, scene);
            material.diffuseTexture = texture;

            // Texture Mapping Adjustments
            if (layout.shape === 'plane' || type === 'endpoint' || type === 'client') {
                // For planes (billboards), use standard mapping
                texture.uScale = 1;
                texture.vScale = -1;
                texture.hasAlpha = true;
                material.emissiveTexture = texture; // Make it glow slightly
                material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            } else if (layout.shape === 'cylinder' || type === 'access_point') {
                texture.wAng = 0;
                texture.uScale = 1;
                texture.vScale = -1;
                texture.hasAlpha = true;
            } else {
                // For Boxes (Gate/Switch), we want the icon on TOP
                texture.wAng = Math.PI; // Rotate 180 if upside down
                texture.hasAlpha = true;
            }
            
            // Handle texture loading errors
            texture.onErrorObservable.add(() => {
                console.warn(`Failed to load texture: ${texturePath}. Using default material.`);
                // Fallback: remove texture and use solid color
                material.diffuseTexture = null;
                material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
            });
        }

        mesh.position = position;
        mesh.material = material;

        // Store device data in mesh metadata for debugging
        mesh.metadata = {
            deviceType: type,
            deviceModel: deviceModel,
            deviceData: data,
            iconPath: texturePath,
            layout: layout
        };

        // Add glow effect for online devices (Subtle)
        if (data.status !== 'down' && data.status !== 'warning') {
            const glowLayer = new BABYLON.GlowLayer("glow", scene);
            glowLayer.intensity = 0.3;
            glowLayer.addIncludedOnlyMesh(mesh);
        }

        // Make mesh clickable
        mesh.isPickable = true;
        mesh.actionManager = new BABYLON.ActionManager(scene);
        mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPickTrigger,
            () => this.showDeviceInfo3D(data)
        ));

        return mesh;
    }

    createConnection(scene, mesh1, mesh2) {
        const path = this.getOrthogonalPath(mesh1.position, mesh2.position);
        const tube = BABYLON.MeshBuilder.CreateTube("connection", {
            path: path,
            radius: 0.12, // Thicker pipe
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
            updatable: false,
            cap: BABYLON.Mesh.CAP_ALL
        }, scene);

        const material = new BABYLON.StandardMaterial("cableMat", scene);
        material.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9); // White clay
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Matte finish
        tube.material = material;

        return tube;
    }

    getOrthogonalPath(start, end) {
        // "Pipe" Style Routing: Vertical -> Horizontal -> Vertical
        // Ideal for Tree Layouts (Top-Down)

        const path = [];
        path.push(start.clone());

        // 1. Down from Start (if Start is higher)
        // Or Up from Start (if Start is lower) - but usually we go Parent -> Child (Down)

        const midY = (start.y + end.y) / 2;

        // Point 1: Start
        // Point 2: Vertical move to Mid-Height
        const p2 = new BABYLON.Vector3(start.x, midY, start.z);

        // Point 3: Horizontal move to End X/Z at Mid-Height
        const p3 = new BABYLON.Vector3(end.x, midY, end.z);

        // Point 4: Vertical move to End
        const p4 = end.clone();

        // Add points, filtering duplicates
        const points = [start, p2, p3, p4];
        const uniquePoints = [points[0]];

        for (let i = 1; i < points.length; i++) {
            if (BABYLON.Vector3.Distance(points[i], uniquePoints[uniquePoints.length - 1]) > 0.1) {
                uniquePoints.push(points[i]);
            }
        }

        return uniquePoints;
    }

    showDeviceInfo3D(device) {
        const infoDiv = document.getElementById('deviceInfo3D');
        if (!infoDiv) return;

        const info = `
            <div style="padding: 10px;">
                <h4>${device.name || device.hostname || 'Unknown Device'}</h4>
                <p><strong>Type:</strong> ${this.getDeviceType(device)}</p>
                <p><strong>Status:</strong> <span class="status-${device.status || 'unknown'}">${device.status || 'Unknown'}</span></p>
                ${device.ip ? `<p><strong>IP:</strong> ${device.ip}</p>` : ''}
                ${device.serial ? `<p><strong>Serial:</strong> ${device.serial}</p>` : ''}
                ${device.model ? `<p><strong>Model:</strong> ${device.model}</p>` : ''}
                ${device.wired_clients_total !== undefined ? `<p><strong>Wired Clients:</strong> ${device.wired_clients_total}</p>` : ''}
                ${device.clients_connected !== undefined ? `<p><strong>Clients:</strong> ${device.clients_connected}</p>` : ''}
            </div>
        `;

        infoDiv.innerHTML = info;
    }

    getDeviceType(device) {
        if (device.hostname || device.model?.includes('FG')) return 'Firewall';
        if (device.name?.includes('SW') || device.model?.includes('FS')) return 'Switch';
        if (device.name?.includes('AP') || device.model?.includes('FAP')) return 'Access Point';
        return 'Unknown';
    }

    setup3DControls(scene, engine, camera) {
        // Reset view button
        const resetBtn = document.getElementById('btn3DReset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                camera.alpha = Math.PI / 4;
                camera.beta = Math.PI / 3;
                camera.radius = 25;
                camera.target = BABYLON.Vector3.Zero();
            });
        }

        // Fullscreen button
        const fullscreenBtn = document.getElementById('btn3DFullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                const canvas = document.getElementById('renderCanvas');
                if (canvas.requestFullscreen) {
                    canvas.requestFullscreen();
                } else if (canvas.msRequestFullscreen) {
                    canvas.msRequestFullscreen();
                } else if (canvas.mozRequestFullScreen) {
                    canvas.mozRequestFullScreen();
                } else if (canvas.webkitRequestFullscreen) {
                    canvas.webkitRequestFullscreen();
                }
            });
        }

        // Screenshot button
        const screenshotBtn = document.getElementById('btn3DScreenshot');
        if (screenshotBtn) {
            screenshotBtn.addEventListener('click', () => {
                BABYLON.Tools.CreateScreenshot(engine, camera, { width: 1920, height: 1080 });
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('btn3DRefresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.render3DTopology();
            });
        }

        // Category filters
        const categoryFilters = document.getElementById('categoryFilters');
        if (categoryFilters && scene.deviceData) {
            categoryFilters.addEventListener('change', (e) => {
                const filterValue = e.target.value;
                const isChecked = e.target.checked;

                scene.deviceData.forEach(device => {
                    if (filterValue === 'all') {
                        device.mesh.setEnabled(isChecked);
                    } else if (device.type === filterValue) {
                        device.mesh.setEnabled(isChecked);
                    }
                });
            });
        }
    }

    // Hierarchy View Methods
    async refreshHierarchy() {
        try {
            const topology = await this.fetchTopology();
            this.renderHierarchy(topology);
        } catch (error) {
            console.error('Failed to refresh hierarchy:', error);
            this.renderHierarchyError(error);
        }
    }

    async fetchTopology() {
        const response = await fetch('/api/topology');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    renderHierarchy(topology) {
        const treeContainer = document.getElementById('hierarchy-tree-2d');
        if (!treeContainer) return;

        // Build hierarchy structure
        const hierarchyData = this.buildHierarchyData(topology);

        // Render hierarchy tree
        treeContainer.innerHTML = this.renderHierarchyNode(hierarchyData, 0);

        // Add click handlers for nodes
        this.addHierarchyNodeHandlers();
    }

    buildHierarchyData(topology) {
        const hierarchy = {
            name: 'Network Root',
            type: 'root',
            status: 'up',
            children: []
        };

        // Add FortiGate as root device
        if (topology.fortigate) {
            hierarchy.children.push({
                ...topology.fortigate,
                type: 'fortigate',
                name: topology.fortigate.name || 'FortiGate',
                status: 'up',
                children: []
            });
        }

        // Add switches under FortiGate
        if (topology.switches && topology.switches.length > 0) {
            const switchContainer = {
                name: 'Switches',
                type: 'switch-container',
                status: 'up',
                children: []
            };

            topology.switches.forEach(sw => {
                const switchNode = {
                    ...sw,
                    type: 'switch',
                    name: sw.name || sw.serial || 'Unknown Switch',
                    status: sw.status || 'down',
                    children: []
                };

                // Add ports as children
                if (sw.ports && Array.isArray(sw.ports)) {
                    sw.ports.forEach(port => {
                        if (port.status === 'up' || port.wired_clients > 0) {
                            const portNode = {
                                ...port,
                                type: 'port',
                                name: `${port.port} (${port.wired_clients || 0} clients)`,
                                status: port.status || 'down',
                                children: []
                            };

                            // Add connected devices to this port
                            if (topology.connected_devices && topology.connected_devices.wired) {
                                const devicesOnPort = topology.connected_devices.wired.filter(device => 
                                    device.switch_id === sw.serial && device.port === port.port
                                );
                                devicesOnPort.forEach(device => {
                                    portNode.children.push({
                                        ...device,
                                        type: 'client',
                                        name: device.hostname !== 'Unknown' ? device.hostname : device.ip_address,
                                        status: device.is_online ? 'up' : 'down'
                                    });
                                });
                            }

                            switchNode.children.push(portNode);
                        }
                    });
                }

                switchContainer.children.push(switchNode);
            });

            hierarchy.children.push(switchContainer);
        }

        // Add access points
        if (topology.aps && topology.aps.length > 0) {
            const apContainer = {
                name: 'Access Points',
                type: 'ap-container',
                status: 'up',
                children: []
            };

            topology.aps.forEach(ap => {
                const apNode = {
                    ...ap,
                    type: 'access_point',
                    name: ap.name || ap.serial || 'Unknown AP',
                    status: ap.status || 'down',
                    children: []
                };

                // Add wireless clients
                if (ap.clients_connected > 0) {
                    const clientGroup = {
                        name: `Wireless Clients (${ap.clients_connected})`,
                        type: 'client-group',
                        status: 'up',
                        children: []
                    };

                    // Add individual connected devices
                    if (topology.connected_devices && topology.connected_devices.wireless) {
                        const devicesOnAP = topology.connected_devices.wireless.filter(device => 
                            device.ap_serial === ap.serial || device.ap_name === ap.name
                        );
                        devicesOnAP.forEach(device => {
                            clientGroup.children.push({
                                ...device,
                                type: 'client',
                                name: device.hostname !== 'Unknown' ? device.hostname : device.ip_address,
                                status: device.is_online ? 'up' : 'down'
                            });
                        });
                    }

                    apNode.children.push(clientGroup);
                }

                apContainer.children.push(apNode);
            });

            hierarchy.children.push(apContainer);
        }

        return hierarchy;
    }

    renderHierarchyNode(node, level = 0) {
        const hasChildren = node.children && node.children.length > 0;

        // Store device data as JSON string in dataset
        const deviceData = JSON.stringify({
            ip_address: node.ip_address,
            serial: node.serial,
            model: node.model,
            firmware_version: node.firmware_version,
            temperature: node.temperature,
            clients_connected: node.clients_connected,
            ports_total: node.ports_total,
            ports_up: node.ports_up,
            ports_down: node.ports_down,
            wired_clients: node.wired_clients,
            port: node.port,
            poe_power: node.poe_power,
            poe_max: node.poe_max,
            rx_bytes: node.rx_bytes,
            tx_bytes: node.tx_bytes,
            board_mac: node.board_mac,
            last_seen: node.last_seen,
            interfering_aps: node.interfering_aps,
            ssid: node.ssid,
            hostname: node.hostname,
            version: node.version,
            connection_state: node.connection_state,
            channel_utilization_2_4: node.channel_utilization_2_4,
            channel_utilization_5: node.channel_utilization_5
        });

        let html = `
            <div class="hierarchy-node" data-type="${node.type}" data-level="${level}" data-node-data='${deviceData}'>
                <div class="node-content">
                    ${hasChildren ? '<span class="node-toggle">▼</span>' : '<span class="node-empty"></span>'}
                    <span class="node-icon node-icon-${node.type}"></span>
                    <span class="node-name">${node.name}</span>
                    ${node.status && node.status !== 'up' ? `<span class="node-status status-${node.status}">${node.status}</span>` : ''}
                </div>
        `;

        if (hasChildren) {
            html += '<div class="node-children">';
            node.children.forEach(child => {
                html += this.renderHierarchyNode(child, level + 1);
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    addHierarchyNodeHandlers() {
        // Add click handlers for node toggles
        document.querySelectorAll('.node-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const node = e.target.closest('.hierarchy-node');
                const children = node.querySelector('.node-children');

                if (children) {
                    const isCollapsed = children.style.display === 'none';
                    children.style.display = isCollapsed ? 'block' : 'none';
                    e.target.textContent = isCollapsed ? '▼' : '▶';
                    e.target.classList.toggle('collapsed', !isCollapsed);
                }
            });
        });

        // Add click handlers for node content
        document.querySelectorAll('.node-content').forEach(content => {
            content.addEventListener('click', (e) => {
                // Remove previous selection
                document.querySelectorAll('.node-content.selected').forEach(el => {
                    el.classList.remove('selected');
                });

                // Add selection to current node
                content.classList.add('selected');

                const node = e.target.closest('.hierarchy-node');
                this.showDeviceDetails(node);
            });
        });
    }

    showDeviceDetails(node) {
        const detailsContainer = document.getElementById('device-details-content-2d');
        if (!detailsContainer) return;

        const nodeData = this.extractNodeData(node);

        let detailsHTML = `
            <h4>${nodeData.name}</h4>
            <div class="device-info">
                <p><strong>Type:</strong> ${nodeData.type}</p>
                <p><strong>Status:</strong> <span class="status-${nodeData.status}">${nodeData.status}</span></p>
        `;

        // Add IP address if available
        if (nodeData.ip_address) {
            detailsHTML += `<p><strong>IP Address:</strong> ${nodeData.ip_address}</p>`;
        }

        // Add serial number if available
        if (nodeData.serial) {
            detailsHTML += `<p><strong>Serial:</strong> ${nodeData.serial}</p>`;
        }

        // Add model if available
        if (nodeData.model) {
            detailsHTML += `<p><strong>Model:</strong> ${nodeData.model}</p>`;
        }

        // Add firmware version if available
        if (nodeData.firmware_version) {
            detailsHTML += `<p><strong>Firmware:</strong> ${nodeData.firmware_version}</p>`;
        }

        // Add temperature if available
        if (nodeData.temperature) {
            detailsHTML += `<p><strong>Temperature:</strong> ${nodeData.temperature}°C</p>`;
        }

        // Add client information
        if (nodeData.clients_connected !== undefined) {
            detailsHTML += `<p><strong>Clients Connected:</strong> ${nodeData.clients_connected}</p>`;
        }

        // Add port information for switches
        if (nodeData.ports_total !== undefined) {
            detailsHTML += `
                <p><strong>Total Ports:</strong> ${nodeData.ports_total}</p>
                <p><strong>Ports Up:</strong> ${nodeData.ports_up || 0}</p>
                <p><strong>Ports Down:</strong> ${nodeData.ports_down || 0}</p>
                <p><strong>Wired Clients:</strong> ${nodeData.wired_clients || 0}</p>
            `;
        }

        // Add port-specific information
        if (nodeData.port) {
            detailsHTML += `
                <p><strong>Port:</strong> ${nodeData.port}</p>
                <p><strong>Status:</strong> ${nodeData.status}</p>
            `;
            if (nodeData.wired_clients !== undefined) {
                detailsHTML += `<p><strong>Wired Clients:</strong> ${nodeData.wired_clients}</p>`;
            }
            if (nodeData.poe_power !== undefined) {
                detailsHTML += `<p><strong>PoE Power:</strong> ${nodeData.poe_power}W / ${nodeData.poe_max}W</p>`;
            }
            if (nodeData.rx_bytes !== undefined && nodeData.tx_bytes !== undefined) {
                detailsHTML += `<p><strong>Traffic:</strong> ↓${this.formatBytes(nodeData.rx_bytes)} / ↑${this.formatBytes(nodeData.tx_bytes)}</p>`;
            }
        }

        // Add AP-specific information
        if (nodeData.type === 'access_point') {
            if (nodeData.board_mac) {
                detailsHTML += `<p><strong>MAC Address:</strong> ${nodeData.board_mac}</p>`;
            }
            if (nodeData.last_seen) {
                detailsHTML += `<p><strong>Last Seen:</strong> ${nodeData.last_seen}</p>`;
            }
            if (nodeData.interfering_aps !== undefined) {
                detailsHTML += `<p><strong>Interfering APs:</strong> ${nodeData.interfering_aps}</p>`;
            }
            if (nodeData.ssid && nodeData.ssid.length > 0) {
                detailsHTML += `<p><strong>SSIDs:</strong> ${nodeData.ssid.join(', ')}</p>`;
            }
        }

        // Add FortiGate-specific information
        if (nodeData.type === 'fortigate') {
            if (nodeData.hostname) {
                detailsHTML += `<p><strong>Hostname:</strong> ${nodeData.hostname}</p>`;
            }
            if (nodeData.version) {
                detailsHTML += `<p><strong>Version:</strong> ${nodeData.version}</p>`;
            }
            if (nodeData.serial) {
                detailsHTML += `<p><strong>Serial:</strong> ${nodeData.serial}</p>`;
            }
        }

        detailsHTML += `
            </div>
            <div class="device-actions">
                <button class="btn btn--primary btn--sm">Configure</button>
                <button class="btn btn--secondary btn--sm">View Logs</button>
                <button class="btn btn--secondary btn--sm">Refresh</button>
            </div>
        `;

        detailsContainer.innerHTML = detailsHTML;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    extractNodeData(node) {
        const data = {
            name: node.querySelector('.node-name')?.textContent || 'Unknown',
            type: node.dataset.type || 'unknown',
            status: node.querySelector('.node-status')?.textContent || 'unknown'
        };

        // Extract all available data from node dataset
        try {
            const nodeData = JSON.parse(node.dataset.nodeData || '{}');
            Object.assign(data, nodeData);
        } catch (e) {
            // If no nodeData, continue with basic info
        }

        // Extract IP and model from elements
        const ipElement = node.querySelector('.node-ip');
        if (ipElement) data.ip_address = ipElement.textContent.trim();

        const modelElement = node.querySelector('.node-model');
        if (modelElement) data.model = modelElement.textContent.trim();

        return data;
    }

    expandAllHierarchy() {
        document.querySelectorAll('.node-children').forEach(children => {
            children.style.display = 'block';
        });
        document.querySelectorAll('.node-toggle').forEach(toggle => {
            toggle.textContent = '▼';
            toggle.classList.remove('collapsed');
        });
    }

    collapseAllHierarchy() {
        document.querySelectorAll('.node-children').forEach(children => {
            children.style.display = 'none';
        });
        document.querySelectorAll('.node-toggle').forEach(toggle => {
            toggle.textContent = '▶';
            toggle.classList.add('collapsed');
        });
    }

    renderHierarchyError(error) {
        const treeContainer = document.getElementById('hierarchy-tree-2d');
        if (treeContainer) {
            treeContainer.innerHTML = `
                <div class="error-message">
                    <h3>Failed to load hierarchy data</h3>
                    <p>${error.message}</p>
                    <button class="btn btn--primary" onclick="window.dashboard.refreshHierarchy()">Retry</button>
                </div>
            `;
        }
    }

    // Connected Devices Methods
    async renderConnectedDevices() {
        const container = document.getElementById('connectedDevicesGrid');
        if (!container) return;

        try {
            container.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-spin"></i> Loading connected devices...</div>';

            const response = await fetch('/api/connected-devices');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Update summary
            if (document.getElementById('totalConnectedDevices')) {
                document.getElementById('totalConnectedDevices').textContent = data.total || 0;
            }
            if (document.getElementById('wiredDevicesCount')) {
                document.getElementById('wiredDevicesCount').textContent = data.summary?.wired_count || 0;
            }
            if (document.getElementById('wirelessDevicesCount')) {
                document.getElementById('wirelessDevicesCount').textContent = data.summary?.wireless_count || 0;
            }
            if (document.getElementById('onlineDevicesCount')) {
                document.getElementById('onlineDevicesCount').textContent = data.summary?.online_count || 0;
            }

            // Store data for filtering
            this.connectedDevicesData = data;

            // Render all devices
            this.renderConnectedDevicesList(data);

        } catch (error) {
            console.error('Error loading connected devices:', error);
            container.innerHTML = `
                <div class="error-message">
                    <h3>Failed to load connected devices</h3>
                    <p>${error.message}</p>
                    <button class="btn btn--primary" onclick="window.dashboard.renderConnectedDevices()">Retry</button>
                </div>
            `;
        }
    }

    renderConnectedDevicesList(data) {
        const container = document.getElementById('connectedDevicesGrid');
        if (!container) return;

        const allDevices = [
            ...(data.wired || []).map(d => ({ ...d, category: 'wired' })),
            ...(data.wireless || []).map(d => ({ ...d, category: 'wireless' })),
            ...(data.detected || []).map(d => ({ ...d, category: 'detected' }))
        ];

        if (allDevices.length === 0) {
            container.innerHTML = '<div class="card"><div class="card__body"><p class="text-center">No connected devices found</p></div></div>';
            return;
        }

        // Apply current filter if set
        const currentFilter = document.getElementById('deviceTypeFilter')?.value || 'all';
        const filteredDevices = currentFilter === 'all' 
            ? allDevices 
            : allDevices.filter(d => d.category === currentFilter);

        container.innerHTML = filteredDevices.map((device, index) => {
            const connectionIcon = device.category === 'wireless' ? 'fa-wifi' : 
                                 device.category === 'wired' ? 'fa-network-wired' : 
                                 'fa-search';
            const connectionColor = device.category === 'wireless' ? '#1FB8CD' : 
                                   device.category === 'wired' ? '#667eea' : 
                                   '#999';

            return `
                <div class="card device-card ${device.is_online ? 'status-up' : 'status-down'}" 
                     style="cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" 
                     onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.2)'" 
                     onmouseout="this.style.transform=''; this.style.boxShadow=''"
                     onclick="window.dashboard.showConnectedDeviceDetails(${index}, '${device.category}')"
                     title="Click for detailed information">
                    <div class="card__header">
                        <h3>
                            <span class="status-indicator ${device.is_online ? 'online' : 'offline'}" 
                                  title="${device.is_online ? 'Device is online' : 'Device is offline'}"></span>
                            <i class="fas ${connectionIcon}" style="color: ${connectionColor}; margin-right: 0.5rem;"></i>
                            ${device.hostname !== 'Unknown' ? device.hostname : device.ip_address}
                        </h3>
                        <span class="badge ${device.is_online ? 'badge-success' : 'badge-danger'}">
                            ${device.is_online ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    <div class="card__body">
                        <div class="device-info">
                            <div class="info-item" title="IP Address">
                                <span class="info-label">IP:</span>
                                <span class="info-value">${device.ip_address || 'Unknown'}</span>
                            </div>
                            <div class="info-item" title="MAC Address">
                                <span class="info-label">MAC:</span>
                                <span class="info-value" style="font-family: monospace; font-size: 0.9em;">${device.mac || 'Unknown'}</span>
                            </div>
                            <div class="info-item" title="Device Vendor">
                                <span class="info-label">Vendor:</span>
                                <span class="info-value">${device.vendor || 'Unknown'}</span>
                            </div>
                            <div class="info-item" title="Device Type">
                                <span class="info-label">Type:</span>
                                <span class="info-value">${device.device_type || 'Unknown'}</span>
                            </div>
                            ${device.os_name && device.os_name !== 'Unknown' ? `
                            <div class="info-item" title="Operating System">
                                <span class="info-label">OS:</span>
                                <span class="info-value">${device.os_name} ${device.os_version || ''}</span>
                            </div>
                            ` : ''}
                            <div class="info-item" title="Connection Type">
                                <span class="info-label">Connection:</span>
                                <span class="info-value" style="text-transform: capitalize;">${device.connection_type || 'Unknown'}</span>
                            </div>
                            ${device.ap_name ? `
                            <div class="info-item" title="Connected to AP">
                                <span class="info-label">AP:</span>
                                <span class="info-value">${device.ap_name}</span>
                            </div>
                            ` : ''}
                            ${device.switch_id ? `
                            <div class="info-item" title="Connected to Switch">
                                <span class="info-label">Switch:</span>
                                <span class="info-value">${device.switch_id}</span>
                            </div>
                            ` : ''}
                            ${device.port ? `
                            <div class="info-item" title="Port">
                                <span class="info-label">Port:</span>
                                <span class="info-value">${device.port}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Store filtered devices for detail view
        this.filteredConnectedDevices = filteredDevices;
    }

    showConnectedDeviceDetails(index, category) {
        if (!this.filteredConnectedDevices || !this.filteredConnectedDevices[index]) return;

        const device = this.filteredConnectedDevices[index];

        const modal = document.createElement('div');
        modal.className = 'detail-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); display: flex; align-items: center;
            justify-content: center; z-index: 10000; padding: 2rem;
        `;

        const connectionIcon = device.category === 'wireless' ? 'fa-wifi' : 
                             device.category === 'wired' ? 'fa-network-wired' : 
                             'fa-search';

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; padding: 2rem; position: relative;">
                <button onclick="this.closest('.detail-modal').remove()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                
                <h2 style="margin: 0 0 1.5rem 0; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas ${connectionIcon}" style="font-size: 1.5rem;"></i> 
                    ${device.hostname !== 'Unknown' ? device.hostname : device.ip_address}
                </h2>
                
                <div style="display: grid; gap: 1rem;">
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Status</h3>
                        <span class="badge ${device.is_online ? 'badge-success' : 'badge-danger'}" style="font-size: 1rem;">
                            ${device.is_online ? '🟢 Online' : '🔴 Offline'}
                        </span>
                    </div>
                    
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Network Information</h3>
                        <div style="display: grid; gap: 0.5rem; font-size: 0.95rem;">
                            <div><strong>IP Address:</strong> ${device.ip_address || 'Unknown'}</div>
                            <div><strong>MAC Address:</strong> <span style="font-family: monospace;">${device.mac || 'Unknown'}</span></div>
                            <div><strong>Hostname:</strong> ${device.hostname || 'Unknown'}</div>
                            <div><strong>Connection Type:</strong> <span style="text-transform: capitalize;">${device.connection_type || 'Unknown'}</span></div>
                            <div><strong>Interface:</strong> ${device.detected_interface || 'Unknown'}</div>
                        </div>
                    </div>
                    
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Device Information</h3>
                        <div style="display: grid; gap: 0.5rem; font-size: 0.95rem;">
                            <div><strong>Vendor:</strong> ${device.vendor || 'Unknown'}</div>
                            <div><strong>Device Type:</strong> ${device.device_type || 'Unknown'}</div>
                            ${device.os_name && device.os_name !== 'Unknown' ? `
                            <div><strong>OS:</strong> ${device.os_name} ${device.os_version || ''}</div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${device.ap_name ? `
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Wireless Connection</h3>
                        <div style="display: grid; gap: 0.5rem; font-size: 0.95rem;">
                            <div><strong>Access Point:</strong> ${device.ap_name}</div>
                            ${device.ssid ? `<div><strong>SSID:</strong> ${Array.isArray(device.ssid) ? device.ssid.join(', ') : device.ssid}</div>` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${device.switch_id ? `
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Wired Connection</h3>
                        <div style="display: grid; gap: 0.5rem; font-size: 0.95rem;">
                            <div><strong>Switch:</strong> ${device.switch_id}</div>
                            ${device.port ? `<div><strong>Port:</strong> ${device.port}</div>` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Timestamps</h3>
                        <div style="display: grid; gap: 0.5rem; font-size: 0.95rem;">
                            ${device.last_seen ? `<div><strong>Last Seen:</strong> ${new Date(device.last_seen * 1000).toLocaleString()}</div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    filterConnectedDevices(filterType) {
        if (!this.connectedDevicesData) return;

        const allDevices = [
            ...(this.connectedDevicesData.wired || []).map(d => ({ ...d, category: 'wired' })),
            ...(this.connectedDevicesData.wireless || []).map(d => ({ ...d, category: 'wireless' })),
            ...(this.connectedDevicesData.detected || []).map(d => ({ ...d, category: 'detected' }))
        ];

        const filtered = filterType === 'all' 
            ? allDevices 
            : allDevices.filter(d => d.category === filterType);

        this.filteredConnectedDevices = filtered;
        this.renderConnectedDevicesList({
            ...this.connectedDevicesData,
            filtered: filtered
        });
    }

    searchConnectedDevices(searchTerm) {
        if (!this.connectedDevicesData) return;

        const allDevices = [
            ...(this.connectedDevicesData.wired || []).map(d => ({ ...d, category: 'wired' })),
            ...(this.connectedDevicesData.wireless || []).map(d => ({ ...d, category: 'wireless' })),
            ...(this.connectedDevicesData.detected || []).map(d => ({ ...d, category: 'detected' }))
        ];

        const filterType = document.getElementById('deviceTypeFilter')?.value || 'all';
        const typeFiltered = filterType === 'all' 
            ? allDevices 
            : allDevices.filter(d => d.category === filterType);

        const searchLower = searchTerm.toLowerCase();
        const searched = typeFiltered.filter(device => {
            return (device.hostname || '').toLowerCase().includes(searchLower) ||
                   (device.ip_address || '').toLowerCase().includes(searchLower) ||
                   (device.mac || '').toLowerCase().includes(searchLower) ||
                   (device.vendor || '').toLowerCase().includes(searchLower) ||
                   (device.device_type || '').toLowerCase().includes(searchLower);
        });

        this.filteredConnectedDevices = searched;
        this.renderConnectedDevicesList({
            ...this.connectedDevicesData,
            filtered: searched
        });
    }

    // Force Graph Methods
    async renderForceGraph() {
        if (!this.forceGraphView) {
            console.warn('ForceGraphView not available. Make sure force-graph-view.js is loaded.');
            const container = document.getElementById('force-graph-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-message" style="padding: 2rem; text-align: center; color: white;">
                        <h3>3D Force Graph Library Not Loaded</h3>
                        <p>Please ensure the 3d-force-graph library is loaded in index.html</p>
                    </div>
                `;
            }
            return;
        }

        try {
            await this.forceGraphView.render();
        } catch (error) {
            console.error('Error rendering force graph:', error);
            const container = document.getElementById('force-graph-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-message" style="padding: 2rem; text-align: center; color: white;">
                        <h3>Failed to load force graph</h3>
                        <p>${error.message}</p>
                        <button class="btn btn--primary" onclick="window.dashboard.renderForceGraph()">Retry</button>
                    </div>
                `;
            }
        }
    }
}

// Expose the class in browser-like globals to make tests easier
if (typeof window !== 'undefined') {
    window.FortDashboard = FortDashboard;
}
if (typeof globalThis !== 'undefined') {
    globalThis.FortDashboard = FortDashboard;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FortDashboard;
}

// Initialize the dashboard when document is loaded
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dashboard = new FortDashboard();
    });
}
