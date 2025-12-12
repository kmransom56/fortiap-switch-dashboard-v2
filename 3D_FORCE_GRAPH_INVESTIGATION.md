# 3D Force Graph Investigation

## Overview

Investigation into adding a 3D force-directed graph visualization to the dashboard. This would provide an alternative view to the current hierarchical 3D topology, using physics simulation to position nodes based on their connections.

## Current Visualization Approaches

1. **2D Topology** (`d3-topology.js`): Hierarchical tree view using D3.js
2. **3D Topology** (`app.js`): Fixed-position 3D layout using Babylon.js
3. **3D Force Graph** (proposed): Physics-based 3D force-directed graph

## Library Options

### Option 1: 3d-force-graph (Recommended)
- **Library**: `3d-force-graph` (npm package)
- **Dependencies**: Three.js, d3-force-3d
- **CDN**: Available via jsDelivr
- **Pros**:
  - Purpose-built for 3D force graphs
  - Easy to use API
  - Good performance
  - Supports node/edge customization
  - Interactive (hover, click, drag)
- **Cons**:
  - Adds another library dependency
  - Uses Three.js (different from Babylon.js)

### Option 2: D3.js Force Simulation in 3D
- **Library**: `d3-force-3d` extension
- **Dependencies**: D3.js (already included)
- **Pros**:
  - Uses existing D3.js dependency
  - Consistent with 2D topology
  - Full control over rendering
- **Cons**:
  - More manual implementation required
  - Need to handle 3D rendering ourselves
  - Less optimized for 3D

### Option 3: Babylon.js with Physics Engine
- **Library**: Babylon.js Physics Plugin
- **Dependencies**: Babylon.js (already included)
- **Pros**:
  - Consistent with existing 3D topology
  - Same rendering engine
  - Can reuse existing meshes/textures
- **Cons**:
  - More complex to implement force simulation
  - Physics engine overhead
  - Less optimized for graph visualization

## Recommended Approach: 3d-force-graph

### Why 3d-force-graph?
1. **Purpose-built**: Specifically designed for 3D force-directed graphs
2. **Performance**: Optimized for large graphs
3. **Features**: Built-in interactions, animations, controls
4. **Community**: Well-maintained, good documentation
5. **Flexibility**: Easy to customize nodes, links, and forces

### Implementation Plan

#### 1. Add Library
```html
<script src="https://unpkg.com/3d-force-graph@1"></script>
```

Or via npm:
```bash
npm install 3d-force-graph
```

#### 2. Data Structure
Convert topology data to graph format:
```javascript
{
  nodes: [
    { id: 'fortigate', name: 'FortiGate', type: 'firewall', ... },
    { id: 'switch1', name: 'Switch1', type: 'switch', ... },
    { id: 'ap1', name: 'AP1', type: 'access_point', ... },
    { id: 'client1', name: 'Client1', type: 'endpoint', ... }
  ],
  links: [
    { source: 'fortigate', target: 'switch1' },
    { source: 'switch1', target: 'ap1' },
    { source: 'switch1', target: 'client1' },
    { source: 'ap1', target: 'client2' }
  ]
}
```

#### 3. Features to Implement
- **Node Types**: Different sizes/colors for FortiGate, switches, APs, clients
- **Node Icons**: Use SVG icons as textures (similar to current 3D topology)
- **Link Types**: Different styles for wired vs wireless connections
- **Interactions**:
  - Hover to highlight node and connections
  - Click to show device details
  - Drag nodes to reposition
  - Zoom/pan controls
- **Physics**:
  - Charge force (repulsion between nodes)
  - Link force (attraction along edges)
  - Center force (keep graph centered)
  - Collision detection
- **Controls**:
  - Toggle physics simulation
  - Reset layout
  - Filter by device type
  - Adjust force parameters

#### 4. Integration Points
- Add new tab: "3D Force Graph"
- Use existing `/api/topology` endpoint
- Transform topology data to graph format
- Reuse device icons from `device-config.js`
- Share device detail modal with other views

## Data Transformation

### Current Topology Structure
```javascript
{
  fortigate: { ... },
  switches: [ { ... }, ... ],
  aps: [ { ... }, ... ],
  connected_devices: {
    wired: [ { ... }, ... ],
    wireless: [ { ... }, ... ]
  }
}
```

### Graph Structure Needed
```javascript
{
  nodes: [
    // FortiGate
    { id: 'fg-1', name: 'FortiGate', type: 'firewall', group: 1, ... },
    // Switches
    { id: 'sw-1', name: 'Switch1', type: 'switch', group: 2, ... },
    // APs
    { id: 'ap-1', name: 'AP1', type: 'access_point', group: 3, ... },
    // Clients
    { id: 'client-1', name: 'Client1', type: 'endpoint', group: 4, ... }
  ],
  links: [
    { source: 'fg-1', target: 'sw-1', type: 'wired' },
    { source: 'sw-1', target: 'ap-1', type: 'wired' },
    { source: 'sw-1', target: 'client-1', type: 'wired' },
    { source: 'ap-1', target: 'client-2', type: 'wireless' }
  ]
}
```

## Example Implementation

```javascript
// Transform topology to graph format
function topologyToGraph(topology) {
  const nodes = [];
  const links = [];
  
  // Add FortiGate
  if (topology.fortigate) {
    nodes.push({
      id: 'fortigate',
      name: topology.fortigate.hostname,
      type: 'firewall',
      group: 1,
      ...topology.fortigate
    });
  }
  
  // Add switches
  topology.switches?.forEach((sw, idx) => {
    nodes.push({
      id: `switch-${idx}`,
      name: sw.name,
      type: 'switch',
      group: 2,
      ...sw
    });
    
    // Link to FortiGate
    links.push({
      source: 'fortigate',
      target: `switch-${idx}`,
      type: 'wired'
    });
  });
  
  // Add APs
  topology.aps?.forEach((ap, idx) => {
    nodes.push({
      id: `ap-${idx}`,
      name: ap.name,
      type: 'access_point',
      group: 3,
      ...ap
    });
    
    // Link to nearest switch (simplified)
    links.push({
      source: `switch-0`,
      target: `ap-${idx}`,
      type: 'wired'
    });
  });
  
  // Add connected devices
  [...(topology.connected_devices?.wired || []), 
   ...(topology.connected_devices?.wireless || [])].forEach((device, idx) => {
    nodes.push({
      id: `device-${idx}`,
      name: device.hostname || device.ip_address,
      type: 'endpoint',
      group: 4,
      ...device
    });
    
    // Link to parent (switch or AP)
    if (device.switch_id) {
      const switchIdx = topology.switches?.findIndex(s => s.serial === device.switch_id);
      if (switchIdx >= 0) {
        links.push({
          source: `switch-${switchIdx}`,
          target: `device-${idx}`,
          type: 'wired'
        });
      }
    } else if (device.ap_serial) {
      const apIdx = topology.aps?.findIndex(a => a.serial === device.ap_serial);
      if (apIdx >= 0) {
        links.push({
          source: `ap-${apIdx}`,
          target: `device-${idx}`,
          type: 'wireless'
        });
      }
    }
  });
  
  return { nodes, links };
}
```

## Benefits of 3D Force Graph

1. **Automatic Layout**: Physics simulation automatically positions nodes
2. **Clustering**: Related devices naturally cluster together
3. **Visual Relationships**: Easy to see connection patterns
4. **Interactive Exploration**: Drag, zoom, filter for exploration
5. **Scalability**: Handles large networks well
6. **Alternative View**: Different perspective from hierarchical layout

## Potential Challenges

1. **Library Size**: 3d-force-graph adds ~200KB
2. **Performance**: Large graphs (>100 nodes) may need optimization
3. **Rendering**: Different from Babylon.js (Three.js instead)
4. **Icon Integration**: Need to adapt SVG icons for Three.js
5. **State Management**: Keep in sync with other views

## Next Steps

1. ✅ Research library options
2. ⏳ Add 3d-force-graph library
3. ⏳ Create data transformation function
4. ⏳ Implement basic force graph view
5. ⏳ Add node/edge styling
6. ⏳ Integrate device icons
7. ⏳ Add interactions and controls
8. ⏳ Test with real topology data
9. ⏳ Optimize for performance

## References

- 3d-force-graph: https://github.com/vasturiano/3d-force-graph
- Three.js: https://threejs.org/
- D3 Force Simulation: https://github.com/d3/d3-force
