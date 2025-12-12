# 3D Force Graph Implementation

## Overview

A 3D force-directed graph visualization has been added to the dashboard, providing an alternative physics-based view of the network topology.

## Features

### Visualization
- **Physics Simulation**: Nodes automatically position themselves based on forces
- **Interactive**: Click, drag, hover, zoom, and pan
- **Color-Coded**: Different colors for device types
- **Link Types**: Visual distinction between wired and wireless connections
- **Responsive**: Adapts to container size

### Controls
- **Reset Layout**: Clear fixed positions and restart physics
- **Pause/Resume Physics**: Freeze or resume simulation
- **Filter by Type**: Show only specific device types
- **Refresh**: Reload data from API

### Node Types
- **Firewall** (Red): FortiGate devices
- **Switch** (Blue): FortiSwitch devices  
- **Access Point** (Green): FortiAP devices
- **Client** (Orange): Connected endpoints

### Link Types
- **Wired** (Dark Gray, Thick): Ethernet connections
- **Wireless** (Orange, Thin): Wi-Fi connections

## Implementation Details

### Library
- **3d-force-graph**: Uses Three.js for 3D rendering
- **CDN**: Loaded from `unpkg.com/3d-force-graph@1`
- **Size**: ~200KB minified

### Files Added
1. **`force-graph-view.js`**: Main force graph class
2. **`3D_FORCE_GRAPH_INVESTIGATION.md`**: Research and planning document
3. **HTML Tab**: Added "3D Force Graph" tab to navigation
4. **Integration**: Connected to dashboard app.js

### Data Flow
1. Dashboard calls `/api/topology`
2. `topologyToGraph()` transforms data to graph format
3. Nodes and links are created with metadata
4. 3d-force-graph renders the graph
5. Physics simulation positions nodes

## Usage

### Accessing the View
1. Navigate to the "3D Force Graph" tab
2. Graph loads automatically
3. Use mouse to interact:
   - **Left Click + Drag**: Rotate view
   - **Right Click + Drag**: Pan view
   - **Scroll**: Zoom in/out
   - **Click Node**: Show device details
   - **Drag Node**: Reposition (pins node)

### Controls
- **Reset Layout**: Clears pinned positions
- **Pause Physics**: Freezes simulation
- **Filter**: Shows only selected device type
- **Refresh**: Reloads topology data

## Customization

### Node Colors
Edit `getNodeColor()` in `force-graph-view.js`:
```javascript
getNodeColor(node) {
    const colors = {
        firewall: '#e74c3c',
        switch: '#3498db',
        access_point: '#2ecc71',
        endpoint: '#f39c12'
    };
    return colors[node.type] || '#95a5a6';
}
```

### Node Sizes
Edit `getNodeSize()` in `force-graph-view.js`:
```javascript
getNodeSize(node) {
    const sizes = {
        firewall: 8,
        switch: 6,
        access_point: 4,
        endpoint: 2
    };
    return sizes[node.type] || 2;
}
```

### Physics Parameters
Adjust in `force-graph-view.js` initialization:
```javascript
this.graph = ForceGraph3D()
    .nodeRelSize(6)           // Node size multiplier
    .linkDistance(30)         // Link length
    .linkStrength(0.5)        // Link strength
    .d3Force('charge', -300)  // Node repulsion
    .d3Force('center', 0.1);  // Center force
```

## Performance Considerations

### Large Networks
- For networks with >100 nodes, consider:
  - Reducing node size
  - Simplifying link rendering
  - Using node grouping/clustering
  - Limiting visible nodes with filters

### Optimization Tips
1. Use filters to reduce visible nodes
2. Pause physics when not needed
3. Limit link rendering for large graphs
4. Consider node aggregation for many clients

## Future Enhancements

### Planned Features
- [ ] Node icons/textures (use SVG icons)
- [ ] Node grouping/clustering
- [ ] Search and highlight nodes
- [ ] Export graph as image
- [ ] Save/load graph layouts
- [ ] Custom force parameters UI
- [ ] Animation controls
- [ ] Node labels toggle
- [ ] Link labels (connection types)
- [ ] Device status indicators

### Potential Improvements
- Integrate with device-config.js for icons
- Add node tooltips with more details
- Support for multiple FortiGate instances
- Visual indicators for device status
- Connection strength visualization
- Path highlighting between nodes

## Troubleshooting

### Graph Not Loading
1. Check browser console for errors
2. Verify 3d-force-graph library loaded
3. Check network tab for API calls
4. Ensure container element exists

### Performance Issues
1. Reduce number of visible nodes
2. Pause physics when not interacting
3. Use filters to show subsets
4. Check browser performance tools

### Nodes Not Positioning
1. Click "Reset Layout" button
2. Ensure physics is not paused
3. Check for JavaScript errors
4. Verify data structure is correct

## References

- 3d-force-graph: https://github.com/vasturiano/3d-force-graph
- Three.js: https://threejs.org/
- D3 Force: https://github.com/d3/d3-force
