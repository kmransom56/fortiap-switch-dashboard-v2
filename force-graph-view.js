/**
 * 3D Force Graph Visualization
 * Uses 3d-force-graph library for physics-based network visualization
 */

class ForceGraphView {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.graph = null;
    this.graphData = { nodes: [], links: [] };
    this.isInitialized = false;
  }

  /**
     * Initialize the force graph
     */
  async init() {
    if (this.isInitialized) return;

    // Check if 3d-force-graph is available
    if (typeof ForceGraph3D === 'undefined') {
      console.error('3d-force-graph library not loaded');
      return;
    }

    const container = document.getElementById('force-graph-container');
    if (!container) {
      console.error('Force graph container not found');
      return;
    }

    // Create force graph instance
    this.graph = ForceGraph3D()
      .width(container.offsetWidth)
      .height(container.offsetHeight)
      .backgroundColor('#1a1a1a')
      .showNavInfo(false)
      .nodeLabel(node => `
                <div style="background: rgba(0,0,0,0.8); color: white; padding: 8px; border-radius: 4px;">
                    <strong>${node.name || node.id}</strong><br/>
                    Type: ${node.type || 'Unknown'}<br/>
                    ${node.ip_address ? `IP: ${node.ip_address}<br/>` : ''}
                    ${node.status ? `Status: ${node.status}` : ''}
                </div>
            `)
      .nodeColor(node => this.getNodeColor(node))
      .nodeVal(node => this.getNodeSize(node))
      .linkColor(link => this.getLinkColor(link))
      .linkWidth(link => this.getLinkWidth(link))
      .linkDirectionalArrowLength(3)
      .linkDirectionalArrowRelPos(1)
      .onNodeHover(node => {
        container.style.cursor = node ? 'pointer' : 'default';
      })
      .onNodeClick(node => {
        this.showNodeDetails(node);
      })
      .onNodeDrag(node => {
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
      })
      .onNodeDragEnd(node => {
        node.fx = null;
        node.fy = null;
        node.fz = null;
      });

    // Attach to container
    this.graph(container);

    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.graph && container) {
        this.graph.width(container.offsetWidth).height(container.offsetHeight);
      }
    });

    this.isInitialized = true;
  }

  /**
     * Transform topology data to graph format
     */
  topologyToGraph(topology) {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    // Add FortiGate
    if (topology.fortigate) {
      const fgNode = {
        id: 'fortigate',
        name: topology.fortigate.hostname || 'FortiGate',
        type: 'firewall',
        group: 1,
        ...topology.fortigate
      };
      nodes.push(fgNode);
      nodeMap.set('fortigate', fgNode);
    }

    // Add switches
    if (topology.switches) {
      topology.switches.forEach((sw, idx) => {
        const nodeId = `switch-${sw.serial || idx}`;
        const swNode = {
          id: nodeId,
          name: sw.name || `Switch ${idx + 1}`,
          type: 'switch',
          group: 2,
          serial: sw.serial,
          ...sw
        };
        nodes.push(swNode);
        nodeMap.set(nodeId, swNode);

        // Link to FortiGate
        if (nodeMap.has('fortigate')) {
          links.push({
            source: 'fortigate',
            target: nodeId,
            type: 'wired',
            strength: 0.5
          });
        }
      });
    }

    // Add access points
    if (topology.aps) {
      topology.aps.forEach((ap, idx) => {
        const nodeId = `ap-${ap.serial || idx}`;
        const apNode = {
          id: nodeId,
          name: ap.name || `AP ${idx + 1}`,
          type: 'access_point',
          group: 3,
          serial: ap.serial,
          ...ap
        };
        nodes.push(apNode);
        nodeMap.set(nodeId, apNode);

        // Link to nearest switch (simplified - could be improved)
        const switchNodes = nodes.filter(n => n.type === 'switch');
        if (switchNodes.length > 0) {
          links.push({
            source: switchNodes[0].id,
            target: nodeId,
            type: 'wired',
            strength: 0.3
          });
        }
      });
    }

    // Add wired connected devices
    if (topology.connected_devices?.wired) {
      topology.connected_devices.wired.forEach((device, idx) => {
        const nodeId = `wired-${device.mac || idx}`;
        const deviceNode = {
          id: nodeId,
          name: device.hostname || device.ip_address || `Device ${idx + 1}`,
          type: 'endpoint',
          group: 4,
          connection_type: 'wired',
          ...device
        };
        nodes.push(deviceNode);
        nodeMap.set(nodeId, deviceNode);

        // Link to switch
        if (device.switch_id) {
          const switchNode = nodes.find(n =>
            n.serial === device.switch_id ||
                        n.id === `switch-${device.switch_id}`
          );
          if (switchNode) {
            links.push({
              source: switchNode.id,
              target: nodeId,
              type: 'wired',
              strength: 0.2
            });
          }
        }
      });
    }

    // Add wireless connected devices
    if (topology.connected_devices?.wireless) {
      topology.connected_devices.wireless.forEach((device, idx) => {
        const nodeId = `wireless-${device.mac || idx}`;
        const deviceNode = {
          id: nodeId,
          name: device.hostname || device.ip_address || `Device ${idx + 1}`,
          type: 'endpoint',
          group: 5,
          connection_type: 'wireless',
          ...device
        };
        nodes.push(deviceNode);
        nodeMap.set(nodeId, deviceNode);

        // Link to AP
        if (device.ap_serial) {
          const apNode = nodes.find(n =>
            n.serial === device.ap_serial ||
                        n.id === `ap-${device.ap_serial}`
          );
          if (apNode) {
            links.push({
              source: apNode.id,
              target: nodeId,
              type: 'wireless',
              strength: 0.2
            });
          }
        }
      });
    }

    return { nodes, links };
  }

  /**
     * Get node color based on type
     */
  getNodeColor(node) {
    const colors = {
      firewall: '#e74c3c',    // Red
      switch: '#3498db',      // Blue
      access_point: '#2ecc71', // Green
      endpoint: '#f39c12'     // Orange
    };
    return colors[node.type] || '#95a5a6';
  }

  /**
     * Get node size based on type
     */
  getNodeSize(node) {
    const sizes = {
      firewall: 8,
      switch: 6,
      access_point: 4,
      endpoint: 2
    };
    return sizes[node.type] || 2;
  }

  /**
     * Get link color based on connection type
     */
  getLinkColor(link) {
    if (link.type === 'wireless') {
      return '#e67e22'; // Orange for wireless
    }
    return '#34495e'; // Dark gray for wired
  }

  /**
     * Get link width based on connection type
     */
  getLinkWidth(link) {
    return link.type === 'wireless' ? 1 : 2;
  }

  /**
     * Show node details
     */
  showNodeDetails(node) {
    if (this.dashboard && typeof this.dashboard.showDeviceInfo === 'function') {
      this.dashboard.showDeviceInfo(node);
    } else {
      // Fallback: show in console or alert
      console.log('Node details:', node);
    }
  }

  /**
     * Load and render graph data
     */
  async loadGraphData() {
    try {
      const response = await fetch('/api/topology');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const topology = await response.json();
      this.graphData = this.topologyToGraph(topology);

      if (this.graph) {
        this.graph.graphData(this.graphData);
      }
    } catch (error) {
      console.error('Error loading graph data:', error);
    }
  }

  /**
     * Render the force graph
     */
  async render() {
    if (!this.isInitialized) {
      await this.init();
    }

    await this.loadGraphData();
  }

  /**
     * Reset the graph layout
     */
  resetLayout() {
    if (this.graph && this.graphData.nodes) {
      this.graphData.nodes.forEach(node => {
        node.fx = null;
        node.fy = null;
        node.fz = null;
      });
      this.graph.graphData(this.graphData);
    }
  }

  /**
     * Toggle physics simulation
     */
  togglePhysics(enabled) {
    if (this.graph) {
      this.graph.cooldownTicks(enabled ? undefined : 0);
    }
  }

  /**
     * Filter nodes by type
     */
  filterByType(types) {
    if (!this.graph) return;

    const filteredNodes = this.graphData.nodes.filter(node =>
      types.includes(node.type)
    );
    const filteredLinks = this.graphData.links.filter(link =>
      filteredNodes.some(n => n.id === link.source.id || n.id === link.target.id)
    );

    this.graph.graphData({
      nodes: filteredNodes,
      links: filteredLinks
    });
  }

  /**
     * Cleanup
     */
  destroy() {
    if (this.graph) {
      // Cleanup if needed
      this.graph = null;
    }
    this.isInitialized = false;
  }
}

// Export for use in dashboard
if (typeof window !== 'undefined') {
  window.ForceGraphView = ForceGraphView;
}
