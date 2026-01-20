/**
 * Combined Dashboard - Multi-Visualization Interface
 * Integrates 2D charts, 3D topology, and advanced features
 */

class CombinedDashboard {
  constructor() {
    this.currentView = 'overview';
    this.visualizationTypes = ['2d-charts', '3d-topology', 'hierarchy', 'hybrid', 'advanced'];
    this.currentVisualization = '2d-charts';
    this.dataSources = {
      live: false,
      cached: false,
      fallback: false
    };
    this.sharedAPI = new SharedAPIConnector();
    this.modelLibrary = new ModelLibraryManager();

    this.initializeDashboard();
  }

  async initializeDashboard() {
    await this.loadConfiguration();
    this.setupEventListeners();
    this.initializeVisualizations();
    this.startDataUpdates();
    this.showWelcomeScreen();
  }

  async loadConfiguration() {
    try {
      const response = await fetch('/shared/config');
      this.config = await response.json();
      console.log('Configuration loaded:', this.config);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      this.showConfigurationError();
    }
  }

  setupEventListeners() {
    // View switcher
    document.querySelectorAll('.view-switcher').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
    });

    // Visualization switcher
    document.querySelectorAll('.viz-switcher').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchVisualization(e.target.dataset.viz));
    });

    // Data source controls
    document.getElementById('refresh-data').addEventListener('click', () => this.refreshAllData());
    document.getElementById('toggle-live').addEventListener('click', () => this.toggleLiveData());
    document.getElementById('export-data').addEventListener('click', () => this.exportData());

    // 3D controls
    document.getElementById('reset-3d').addEventListener('click', () => this.reset3DView());
    document.getElementById('fullscreen-3d').addEventListener('click', () => this.toggleFullscreen3D());
    document.getElementById('screenshot-3d').addEventListener('click', () => this.takeScreenshot3D());

    // Filter controls
    document.querySelectorAll('.device-filter').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.applyFilters());
    });

    // Layout controls
    document.getElementById('layout-grid').addEventListener('click', () => this.setLayout('grid'));
    document.getElementById('layout-split').addEventListener('click', () => this.setLayout('split'));
    document.getElementById('layout-focus').addEventListener('click', () => this.setLayout('focus'));
  }

  initializeVisualizations() {
    // Initialize 2D charts
    this.init2DCharts();

    // Initialize 3D topology
    this.init3DTopology();

    // Initialize hierarchy view
    this.initHierarchyView();

    // Initialize hybrid view
    this.initHybridView();

    // Initialize advanced features
    this.initAdvancedFeatures();
  }

  init2DCharts() {
    // Device status charts
    this.deviceStatusChart = new Chart(document.getElementById('device-status-chart'), {
      type: 'doughnut',
      data: {
        labels: ['Online', 'Offline', 'Warning'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ['#4CAF50', '#F44336', '#FF9800']
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

    // Performance metrics
    this.performanceChart = new Chart(document.getElementById('performance-chart'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'CPU Usage',
          data: [],
          borderColor: '#2196F3',
          tension: 0.4
        }, {
          label: 'Memory Usage',
          data: [],
          borderColor: '#4CAF50',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });

    // Network traffic
    this.trafficChart = new Chart(document.getElementById('traffic-chart'), {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Traffic (Mbps)',
          data: [],
          backgroundColor: '#FF9800'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  async init3DTopology() {
    try {
      // Initialize Babylon.js scene
      const canvas = document.getElementById('babylon-canvas');
      this.engine = new BABYLON.Engine(canvas, true);
      this.scene = new BABYLON.Scene(this.engine);

      // Setup camera
      this.camera = new BABYLON.ArcRotateCamera(
        'camera',
        Math.PI / 4,
        Math.PI / 3,
        30,
        BABYLON.Vector3.Zero(),
        this.scene
      );
      this.camera.attachControl(canvas, true);

      // Setup lighting
      const light = new BABYLON.HemisphericLight(
        'light',
        new BABYLON.Vector3(0, 1, 0),
        this.scene
      );
      light.intensity = 0.7;

      // Create ground
      const ground = BABYLON.MeshBuilder.CreateGround(
        'ground',
        { width: 50, height: 50 },
        this.scene
      );
      const groundMaterial = new BABYLON.StandardMaterial('groundMat', this.scene);
      groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
      ground.material = groundMaterial;

      // Load 3D models
      await this.load3DModels();

      // Start render loop
      this.engine.runRenderLoop(() => {
        this.scene.render();
      });

      // Handle window resize
      window.addEventListener('resize', () => {
        this.engine.resize();
      });

      // Enable device interaction
      this.setup3DInteraction();

    } catch (error) {
      console.error('Failed to initialize 3D topology:', error);
      this.show3DError();
    }
  }

  initHierarchyView() {
    console.log('Initializing hierarchy view...');

    // Create hierarchy container if it doesn't exist
    if (!document.getElementById('hierarchy-view')) {
      const hierarchyHTML = `
                <div id="hierarchy-view" class="dashboard-view" style="display: none;">
                    <div class="view-header">
                        <h2>Network Hierarchy</h2>
                        <div class="view-controls">
                            <button id="expand-all" class="btn btn--secondary btn--sm">Expand All</button>
                            <button id="collapse-all" class="btn btn--secondary btn--sm">Collapse All</button>
                            <button id="refresh-hierarchy" class="btn btn--primary btn--sm">Refresh</button>
                        </div>
                    </div>
                    <div class="hierarchy-container">
                        <div id="hierarchy-tree" class="hierarchy-tree">
                            <!-- Hierarchy tree will be rendered here -->
                        </div>
                        <div id="hierarchy-details" class="hierarchy-details">
                            <h3>Device Details</h3>
                            <div id="device-details-content">
                                <p>Select a device to see details</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      document.querySelector('.dashboard-content').insertAdjacentHTML('beforeend', hierarchyHTML);
    }

    // Add event listeners for hierarchy controls
    document.getElementById('expand-all')?.addEventListener('click', () => this.expandAllHierarchy());
    document.getElementById('collapse-all')?.addEventListener('click', () => this.collapseAllHierarchy());
    document.getElementById('refresh-hierarchy')?.addEventListener('click', () => this.refreshHierarchy());

    // Load initial hierarchy data
    this.refreshHierarchy();
  }

  async refreshHierarchy() {
    try {
      const topology = await this.getTopology();
      this.renderHierarchy(topology);
    } catch (error) {
      console.error('Failed to refresh hierarchy:', error);
      this.renderHierarchyError(error);
    }
  }

  renderHierarchy(topology) {
    const treeContainer = document.getElementById('hierarchy-tree');
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
              switchNode.children.push({
                ...port,
                type: 'port',
                name: `${port.port} (${port.wired_clients || 0} clients)`,
                status: port.status || 'down',
                children: []
              });
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
          apNode.children.push({
            name: `Wireless Clients (${ap.clients_connected})`,
            type: 'client-group',
            status: 'up',
            children: []
          });
        }

        apContainer.children.push(apNode);
      });

      hierarchy.children.push(apContainer);
    }

    return hierarchy;
  }

  renderHierarchyNode(node, level = 0) {
    const hasChildren = node.children && node.children.length > 0;
    const indent = level * 20;

    let html = `
            <div class="hierarchy-node" data-type="${node.type}" data-level="${level}">
                <div class="node-content" style="margin-left: ${indent}px;">
                    ${hasChildren ? '<span class="node-toggle">▼</span>' : '<span class="node-empty"></span>'}
                    <span class="node-icon node-icon-${node.type}"></span>
                    <span class="node-name">${node.name}</span>
                    <span class="node-status status-${node.status}">${node.status}</span>
                    ${node.ip_address ? `<span class="node-ip">${node.ip_address}</span>` : ''}
                    ${node.model ? `<span class="node-model">${node.model}</span>` : ''}
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
          children.style.display = children.style.display === 'none' ? 'block' : 'none';
          e.target.textContent = children.style.display === 'none' ? '▶' : '▼';
        }
      });
    });

    // Add click handlers for node content
    document.querySelectorAll('.node-content').forEach(content => {
      content.addEventListener('click', (e) => {
        const node = e.target.closest('.hierarchy-node');
        this.showDeviceDetails(node);
      });
    });
  }

  showDeviceDetails(node) {
    const detailsContainer = document.getElementById('device-details-content');
    if (!detailsContainer) return;

    const nodeData = this.extractNodeData(node);

    let detailsHTML = `
            <h4>${nodeData.name}</h4>
            <div class="device-info">
                <p><strong>Type:</strong> ${nodeData.type}</p>
                <p><strong>Status:</strong> <span class="status-${nodeData.status}">${nodeData.status}</span></p>
        `;

    if (nodeData.ip_address) {
      detailsHTML += `<p><strong>IP Address:</strong> ${nodeData.ip_address}</p>`;
    }

    if (nodeData.serial) {
      detailsHTML += `<p><strong>Serial:</strong> ${nodeData.serial}</p>`;
    }

    if (nodeData.model) {
      detailsHTML += `<p><strong>Model:</strong> ${nodeData.model}</p>`;
    }

    if (nodeData.firmware_version) {
      detailsHTML += `<p><strong>Firmware:</strong> ${nodeData.firmware_version}</p>`;
    }

    if (nodeData.temperature) {
      detailsHTML += `<p><strong>Temperature:</strong> ${nodeData.temperature}°C</p>`;
    }

    if (nodeData.clients_connected !== undefined) {
      detailsHTML += `<p><strong>Clients Connected:</strong> ${nodeData.clients_connected}</p>`;
    }

    if (nodeData.ports_total !== undefined) {
      detailsHTML += `
                <p><strong>Ports:</strong> ${nodeData.ports_up || 0}/${nodeData.ports_total} up</p>
                <p><strong>Wired Clients:</strong> ${nodeData.wired_clients || 0}</p>
            `;
    }

    detailsHTML += `
            </div>
            <div class="device-actions">
                <button class="btn btn--primary btn--sm">Configure</button>
                <button class="btn btn--secondary btn--sm">View Logs</button>
            </div>
        `;

    detailsContainer.innerHTML = detailsHTML;
  }

  extractNodeData(node) {
    const data = {
      name: node.querySelector('.node-name')?.textContent || 'Unknown',
      type: node.dataset.type || 'unknown',
      status: node.querySelector('.node-status')?.textContent || 'unknown'
    };

    const ipElement = node.querySelector('.node-ip');
    if (ipElement) data.ip_address = ipElement.textContent.trim();

    const modelElement = node.querySelector('.node-model');
    if (modelElement) data.model = modelElement.textContent.trim();

    // Extract additional data from node attributes if available
    const nodeData = JSON.parse(node.dataset.nodeData || '{}');
    return { ...data, ...nodeData };
  }

  expandAllHierarchy() {
    document.querySelectorAll('.node-children').forEach(children => {
      children.style.display = 'block';
    });
    document.querySelectorAll('.node-toggle').forEach(toggle => {
      toggle.textContent = '▼';
    });
  }

  collapseAllHierarchy() {
    document.querySelectorAll('.node-children').forEach(children => {
      children.style.display = 'none';
    });
    document.querySelectorAll('.node-toggle').forEach(toggle => {
      toggle.textContent = '▶';
    });
  }

  renderHierarchyError(error) {
    const treeContainer = document.getElementById('hierarchy-tree');
    if (treeContainer) {
      treeContainer.innerHTML = `
                <div class="error-message">
                    <h3>Failed to load hierarchy data</h3>
                    <p>${error.message}</p>
                    <button class="btn btn--primary" onclick="this.refreshHierarchy()">Retry</button>
                </div>
            `;
    }
  }

  async load3DModels() {
    try {
      const response = await fetch('/shared/api/3d-models');
      const models = await response.json();

      this.modelLibrary = models;
      console.log('3D models loaded:', models);

      // Load model meshes
      for (const [modelId, modelData] of Object.entries(models)) {
        try {
          const result = await BABYLON.SceneLoader.ImportMeshAsync(
            '',
            '/shared/models/',
            modelData.file,
            this.scene
          );

          // Store loaded mesh
          this.modelLibrary[modelId].mesh = result.meshes[0];
          this.modelLibrary[modelId].mesh.setEnabled(false); // Hide initially

        } catch (modelError) {
          console.warn(`Failed to load model ${modelId}:`, modelError);
        }
      }

    } catch (error) {
      console.error('Failed to fetch 3D models:', error);
    }
  }

  setup3DInteraction() {
    // Ground picking for device placement
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERPICK) {
        const pickedMesh = pointerInfo.pickInfo.pickedMesh;

        if (pickedMesh && pickedMesh.metadata && pickedMesh.metadata.deviceId) {
          this.showDeviceInfo(pickedMesh.metadata);
        }
      }
    });

    // Keyboard controls
    window.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'r':
          this.reset3DView();
          break;
        case 'f':
          this.toggleFullscreen3D();
          break;
        case 's':
          this.takeScreenshot3D();
          break;
      }
    });
  }

  initHybridView() {
    // Setup split view with 2D and 3D side by side
    this.hybridContainer = document.getElementById('hybrid-container');
    this.setupHybridLayout();
  }

  setupHybridLayout() {
    const layout = localStorage.getItem('hybrid-layout') || 'horizontal';

    if (layout === 'horizontal') {
      this.hybridContainer.style.flexDirection = 'row';
    } else {
      this.hybridContainer.style.flexDirection = 'column';
    }
  }

  initAdvancedFeatures() {
    // Initialize advanced analytics
    this.initAnalytics();

    // Setup VSS conversion interface
    this.setupVSSConversion();

    // Initialize discovery controls
    this.setupDiscoveryControls();

    // Setup performance monitoring
    this.setupPerformanceMonitoring();
  }

  initAnalytics() {
    this.analyticsPanel = document.getElementById('analytics-panel');
    this.analyticsData = {
      deviceTrends: [],
      performanceMetrics: [],
      networkHealth: {},
      alerts: []
    };
  }

  setupVSSConversion() {
    const vssUpload = document.getElementById('vss-upload');
    const convertBtn = document.getElementById('convert-vss');

    if (convertBtn) {
      convertBtn.addEventListener('click', () => this.convertVSSFile());
    }
  }

  async convertVSSFile() {
    const fileInput = document.getElementById('vss-file-input');
    const file = fileInput.files[0];

    if (!file) {
      alert('Please select a VSS file to convert');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('vss_file', file);

      const response = await fetch('/shared/api/convert/vss', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        this.showVSSResult(result);
      } else {
        alert('VSS conversion failed: ' + result.error);
      }
    } catch (error) {
      console.error('VSS conversion error:', error);
      alert('VSS conversion failed');
    }
  }

  setupDiscoveryControls() {
    const discoverBtn = document.getElementById('run-discovery');
    const discoveryConfig = document.getElementById('discovery-config');

    if (discoverBtn) {
      discoverBtn.addEventListener('click', () => this.runDiscovery());
    }
  }

  async runDiscovery() {
    try {
      this.showDiscoveryProgress();

      const config = this.getDiscoveryConfig();

      const response = await fetch('/shared/api/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const result = await response.json();

      if (result.success) {
        this.showDiscoveryResults(result);
        this.refreshAllData();
      } else {
        alert('Discovery failed: ' + result.error);
      }
    } catch (error) {
      console.error('Discovery error:', error);
      alert('Discovery failed');
    }
  }

  getDiscoveryConfig() {
    return {
      max_switches: parseInt(document.getElementById('max-switches').value) || 50,
      max_access_points: parseInt(document.getElementById('max-aps').value) || 100,
      max_endpoints: parseInt(document.getElementById('max-endpoints').value) || 500,
      include_offline: document.getElementById('include-offline').checked,
      timeout: parseInt(document.getElementById('discovery-timeout').value) || 30
    };
  }

  setupPerformanceMonitoring() {
    this.performanceMonitor = {
      startTime: Date.now(),
      apiCalls: 0,
      errors: 0,
      responseTime: []
    };

    // Monitor API performance
    setInterval(() => {
      this.updatePerformanceStats();
    }, 5000);
  }

  updatePerformanceStats() {
    const uptime = Date.now() - this.performanceMonitor.startTime;
    const avgResponseTime = this.performanceMonitor.responseTime.length > 0
      ? this.performanceMonitor.responseTime.reduce((a, b) => a + b, 0) / this.performanceMonitor.responseTime.length
      : 0;

    document.getElementById('uptime').textContent = this.formatDuration(uptime);
    document.getElementById('api-calls').textContent = this.performanceMonitor.apiCalls;
    document.getElementById('avg-response-time').textContent = avgResponseTime.toFixed(2) + 'ms';
    document.getElementById('error-rate').textContent =
            ((this.performanceMonitor.errors / Math.max(this.performanceMonitor.apiCalls, 1)) * 100).toFixed(2) + '%';
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  async startDataUpdates() {
    // Initial data load
    await this.loadAllData();

    // Set up periodic updates
    setInterval(() => {
      if (this.dataSources.live) {
        this.loadAllData();
      }
    }, this.config?.cache?.ttl || 300000); // 5 minutes default
  }

  async loadAllData() {
    try {
      const startTime = Date.now();

      const response = await fetch('/shared/api/dashboard-data');
      const data = await response.json();

      this.performanceMonitor.apiCalls++;
      this.performanceMonitor.responseTime.push(Date.now() - startTime);

      // Update data sources
      this.dataSources = {
        live: data.data_source === 'python_service',
        cached: data.cached || false,
        fallback: data.data_source === 'fallback'
      };

      // Update all visualizations
      this.update2DCharts(data);
      await this.update3DTopology(data);
      this.updateOverview(data);
      this.updateDataSourceIndicator();

    } catch (error) {
      this.performanceMonitor.errors++;
      console.error('Data load error:', error);
      this.showDataLoadError();
    }
  }

  update2DCharts(data) {
    // Update device status chart
    if (this.deviceStatusChart && data.fortiaps && data.fortiswitches) {
      const online = (data.fortiaps.filter(ap => ap.status === 'up').length +
                          data.fortiswitches.filter(sw => sw.status === 'up').length);
      const offline = (data.fortiaps.filter(ap => ap.status === 'down').length +
                           data.fortiswitches.filter(sw => sw.status === 'down').length);
      const warning = (data.fortiaps.filter(ap => ap.status === 'warning').length +
                           data.fortiswitches.filter(sw => sw.status === 'warning').length);

      this.deviceStatusChart.data.datasets[0].data = [online, offline, warning];
      this.deviceStatusChart.update();
    }

    // Update performance chart
    if (this.performanceChart && data.historical) {
      const labels = data.historical.map(h => new Date(h.timestamp).toLocaleTimeString());
      const cpuData = data.historical.map(h => h.avg_cpu_usage || 0);
      const memoryData = data.historical.map(h => h.avg_memory_usage || 0);

      this.performanceChart.data.labels = labels.slice(-20); // Last 20 data points
      this.performanceChart.data.datasets[0].data = cpuData.slice(-20);
      this.performanceChart.data.datasets[1].data = memoryData.slice(-20);
      this.performanceChart.update();
    }

    // Update traffic chart
    if (this.trafficChart && data.fortiswitches) {
      const switches = data.fortiswitches.slice(0, 10); // Top 10 switches
      const labels = switches.map(sw => sw.name || sw.serial);
      const traffic = switches.map(sw => sw.traffic || 0);

      this.trafficChart.data.labels = labels;
      this.trafficChart.data.datasets[0].data = traffic;
      this.trafficChart.update();
    }
  }

  async update3DTopology(data) {
    if (!this.scene) return;

    // Clear existing devices
    this.clear3DDevices();

    // Add FortiGate
    if (data.topology?.fortigate) {
      await this.add3DDevice('fortigate', data.topology.fortigate, { x: 0, z: 0 });
    }

    // Add switches
    if (data.topology?.switches) {
      data.topology.switches.forEach((sw, index) => {
        const position = this.config?.visualization?.layout?.switch_spacing || { x: -5, z: 3 };
        this.add3DDevice('switch', sw, {
          x: position.x * (index + 1),
          z: position.z * (index + 1)
        });
      });
    }

    // Add access points
    if (data.topology?.aps) {
      data.topology.aps.forEach((ap, index) => {
        const position = this.config?.visualization?.layout?.ap_spacing || { x: 5, z: 2 };
        this.add3DDevice('access_point', ap, {
          x: position.x * (index + 1),
          z: position.z * (index + 1)
        });
      });
    }

    // Add connections
    this.add3DConnections(data.topology);
  }

  async add3DDevice(type, deviceData, position) {
    const model = this.modelLibrary.getModelForDevice({ type, ...deviceData });

    if (!model || !model.mesh) {
      console.warn(`No 3D model available for ${type}:`, deviceData.name);
      return;
    }

    // Clone the model mesh
    const mesh = model.mesh.clone(`device_${deviceData.serial || deviceData.name}`, null);
    mesh.position = new BABYLON.Vector3(position.x, 0.5, position.z);
    mesh.setEnabled(true);

    // Store device metadata
    mesh.metadata = {
      deviceId: deviceData.serial || deviceData.name,
      deviceType: type,
      deviceData: deviceData
    };

    // Add status indicator
    this.addStatusIndicator(mesh, deviceData.status);
  }

  addStatusIndicator(mesh, status) {
    const indicator = BABYLON.MeshBuilder.CreateBox(
      `status_${mesh.metadata.deviceId}`,
      { size: 0.5 },
      this.scene
    );

    indicator.parent = mesh;
    indicator.position = new BABYLON.Vector3(0, 1, 0);

    const material = new BABYLON.StandardMaterial(`status_mat_${mesh.metadata.deviceId}`, this.scene);

    switch (status) {
      case 'up':
        material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
        break;
      case 'down':
        material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red
        break;
      case 'warning':
        material.diffuseColor = new BABYLON.Color3(1, 1, 0); // Yellow
        break;
      default:
        material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Gray
    }

    indicator.material = material;
  }

  add3DConnections(topology) {
    // Add connection lines between devices
    if (topology.connections) {
      topology.connections.forEach(connection => {
        this.add3DConnection(connection);
      });
    }
  }

  add3DConnection(connection) {
    const sourceMesh = this.scene.getMeshByName(`device_${connection.source}`);
    const targetMesh = this.scene.getMeshByName(`device_${connection.target}`);

    if (!sourceMesh || !targetMesh) return;

    const points = [
      sourceMesh.position,
      targetMesh.position
    ];

    const line = BABYLON.MeshBuilder.CreateLines(
      `connection_${connection.source}_${connection.target}`,
      { points: points },
      this.scene
    );

    const material = new BABYLON.StandardMaterial(`line_mat_${connection.source}_${connection.target}`, this.scene);
    material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
    material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    line.material = material;
  }

  clear3DDevices() {
    this.scene.meshes.forEach(mesh => {
      if (mesh.metadata && mesh.metadata.deviceId) {
        mesh.dispose();
      }
    });
  }

  updateOverview(data) {
    // Update overview statistics
    const totalDevices = (data.fortiaps?.length || 0) + (data.fortiswitches?.length || 0);
    const onlineDevices = (data.fortiaps?.filter(ap => ap.status === 'up').length || 0) +
                             (data.fortiswitches?.filter(sw => sw.status === 'up').length || 0);

    document.getElementById('total-devices').textContent = totalDevices;
    document.getElementById('online-devices').textContent = onlineDevices;
    document.getElementById('offline-devices').textContent = totalDevices - onlineDevices;

    // Update last refresh time
    document.getElementById('last-refresh').textContent = new Date().toLocaleTimeString();
  }

  updateDataSourceIndicator() {
    const indicator = document.getElementById('data-source-indicator');
    indicator.className = 'data-source ' + Object.keys(this.dataSources).find(key => this.dataSources[key]);

    const text = document.getElementById('data-source-text');
    if (this.dataSources.live) {
      text.textContent = 'Live Data';
    } else if (this.dataSources.cached) {
      text.textContent = 'Cached Data';
    } else {
      text.textContent = 'Fallback Data';
    }
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Hide all views
    document.querySelectorAll('.dashboard-view').forEach(view => {
      view.style.display = 'none';
    });

    // Show selected view
    document.getElementById(`${viewName}-view`).style.display = 'block';

    // Update view switcher
    document.querySelectorAll('.view-switcher').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Special handling for 3D view
    if (viewName === '3d-topology' && this.engine) {
      setTimeout(() => this.engine.resize(), 100);
    }
  }

  switchVisualization(vizType) {
    this.currentVisualization = vizType;

    // Update visualization switcher
    document.querySelectorAll('.viz-switcher').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.viz === vizType);
    });

    // Apply visualization-specific settings
    switch (vizType) {
      case '3d-topology':
        this.switchView('3d-topology');
        break;
      case 'hierarchy':
        this.switchView('hierarchy');
        break;
      case 'hybrid':
        this.switchView('hybrid');
        break;
      case 'advanced':
        this.switchView('advanced');
        break;
      default:
        this.switchView('overview');
    }
  }

  setLayout(layout) {
    const container = document.getElementById('main-dashboard');

    // Remove all layout classes
    container.className = container.className.replace(/layout-\w+/g, '');

    // Add new layout class
    container.classList.add(`layout-${layout}`);

    // Save preference
    localStorage.setItem('dashboard-layout', layout);
  }

  async refreshAllData() {
    this.showLoadingState();
    await this.loadAllData();
    this.hideLoadingState();
  }

  toggleLiveData() {
    this.dataSources.live = !this.dataSources.live;

    const toggle = document.getElementById('toggle-live');
    toggle.classList.toggle('active', this.dataSources.live);
    toggle.textContent = this.dataSources.live ? 'Stop Live' : 'Start Live';

    if (this.dataSources.live) {
      this.loadAllData();
    }
  }

  async exportData() {
    try {
      const response = await fetch('/shared/api/dashboard-data');
      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  }

  reset3DView() {
    if (this.camera) {
      this.camera.position = new BABYLON.Vector3(0, 15, -30);
      this.camera.setTarget(BABYLON.Vector3.Zero());
    }
  }

  toggleFullscreen3D() {
    const canvas = document.getElementById('babylon-canvas');

    if (!document.fullscreenElement) {
      canvas.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  takeScreenshot3D() {
    if (!this.engine) return;

    const screenshot = this.engine.takeScreenshot();
    const link = document.createElement('a');
    link.href = screenshot;
    link.download = `topology-screenshot-${new Date().toISOString().split('T')[0]}.png`;
    link.click();
  }

  applyFilters() {
    const filters = {
      firewall: document.getElementById('filter-firewall').checked,
      switches: document.getElementById('filter-switches').checked,
      access_points: document.getElementById('filter-aps').checked,
      endpoints: document.getElementById('filter-endpoints').checked,
      offline: document.getElementById('filter-offline').checked
    };

    // Apply filters to 3D scene
    if (this.scene) {
      this.scene.meshes.forEach(mesh => {
        if (mesh.metadata && mesh.metadata.deviceType) {
          const shouldShow = filters[mesh.metadata.deviceType] &&
                                     (filters.offline || mesh.metadata.deviceData.status === 'up');
          mesh.setEnabled(shouldShow);
        }
      });
    }

    // Apply filters to 2D charts
    this.applyFiltersToCharts(filters);
  }

  applyFiltersToCharts(filters) {
    // Implementation for filtering 2D chart data
    console.log('Applying filters to charts:', filters);
  }

  showDeviceInfo(deviceInfo) {
    const infoPanel = document.getElementById('device-info-panel');
    const infoContent = document.getElementById('device-info-content');

    infoContent.innerHTML = `
            <h3>${deviceInfo.deviceData.name || deviceInfo.deviceId}</h3>
            <p><strong>Type:</strong> ${deviceInfo.deviceType}</p>
            <p><strong>Status:</strong> <span class="status-${deviceInfo.deviceData.status}">${deviceInfo.deviceData.status}</span></p>
            <p><strong>Serial:</strong> ${deviceInfo.deviceData.serial || 'N/A'}</p>
            <p><strong>IP:</strong> ${deviceInfo.deviceData.ip || 'N/A'}</p>
            <p><strong>Model:</strong> ${deviceInfo.deviceData.model || 'N/A'}</p>
            <p><strong>Firmware:</strong> ${deviceInfo.deviceData.firmware_version || 'N/A'}</p>
        `;

    infoPanel.style.display = 'block';
  }

  showWelcomeScreen() {
    const welcome = document.getElementById('welcome-screen');
    if (welcome) {
      welcome.style.display = 'block';
      setTimeout(() => {
        welcome.style.display = 'none';
      }, 3000);
    }
  }

  showLoadingState() {
    document.getElementById('loading-overlay').style.display = 'flex';
  }

  hideLoadingState() {
    document.getElementById('loading-overlay').style.display = 'none';
  }

  showConfigurationError() {
    alert('Failed to load configuration. Please check your settings.');
  }

  show3DError() {
    const errorDiv = document.getElementById('3d-error');
    if (errorDiv) {
      errorDiv.style.display = 'block';
      errorDiv.innerHTML = `
                <h3>3D Visualization Error</h3>
                <p>Failed to initialize 3D topology. Please check browser compatibility and WebGL support.</p>
                <button onclick="location.reload()">Reload</button>
            `;
    }
  }

  showDataLoadError() {
    const errorDiv = document.getElementById('data-error');
    if (errorDiv) {
      errorDiv.style.display = 'block';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }
  }

  showDiscoveryProgress() {
    const progress = document.getElementById('discovery-progress');
    if (progress) {
      progress.style.display = 'block';
      progress.innerHTML = '<div class="spinner"></div> Running discovery...';
    }
  }

  showDiscoveryResults(results) {
    const progress = document.getElementById('discovery-progress');
    if (progress) {
      progress.style.display = 'none';
    }

    // Show results in a modal or panel
    console.log('Discovery results:', results);
  }

  showVSSResult(result) {
    const resultPanel = document.getElementById('vss-result');
    if (resultPanel) {
      resultPanel.style.display = 'block';
      resultPanel.innerHTML = `
                <h3>VSS Conversion Complete</h3>
                <p>Successfully converted ${result.converted_files || 0} files</p>
                <p>Output directory: ${result.output_path || 'N/A'}</p>
                <button onclick="this.parentElement.style.display='none'">Close</button>
            `;
    }
  }
}

// Shared API Connector
class SharedAPIConnector {
  constructor() {
    this.baseURL = '/shared/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getTopology() {
    return this.request('/topology');
  }

  async get3DModels() {
    return this.request('/3d-models');
  }

  async getDashboardData() {
    return this.request('/dashboard-data');
  }

  async discoverDevices(config) {
    return this.request('/discover', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async convertVSS(vssFile) {
    return this.request('/convert/vss', {
      method: 'POST',
      body: JSON.stringify({ vss_file_path: vssFile })
    });
  }
}

// Initialize the dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new CombinedDashboard();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CombinedDashboard, SharedAPIConnector };
}
