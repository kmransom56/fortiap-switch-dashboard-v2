class D3Topology {
  constructor(containerId, data, options = {}) {
    this.containerId = containerId;
    this.data = data;
    this.options = {
      width: options.width || 1200,
      height: options.height || 800,
      nodeSize: [180, 120], // Width, Height for tree spacing
      ...options
    };

    this.svg = null;
    this.g = null;
    this.root = null;

    this.init();
  }

  init() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Clear container
    container.innerHTML = '';

    // Get dimensions
    const width = container.clientWidth || this.options.width;
    const height = container.clientHeight || this.options.height;

    // Create SVG with White Background (Visio Style)
    this.svg = d3.select(`#${this.containerId}`)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [0, 0, width, height])
      .style('background-color', '#ffffff'); // White background

    // Add zoom capabilities
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
      });

    this.svg.call(zoom);

    // Container for graph elements, centered initially
    this.g = this.svg.append('g')
      .attr('transform', `translate(${width / 2}, 50)`);

    this.render();
  }

  processData() {
    // Build Hierarchy
    const root = {
      name: 'Internet',
      type: 'cloud',
      children: []
    };

    // FortiGate
    const fgData = this.data.fortigate || {};
    const fortigate = {
      name: fgData.hostname || 'FortiGate',
      type: 'firewall',
      ...fgData,
      children: []
    };
    root.children.push(fortigate);

    // Switches
    if (this.data.switches) {
      this.data.switches.forEach(sw => {
        const switchNode = {
          name: sw.name,
          type: 'switch',
          ...sw,
          children: []
        };

        // Wired Clients
        if (sw.ports) {
          sw.ports.forEach(port => {
            if (port.detected_devices && port.detected_devices.length > 0) {
              port.detected_devices.forEach(device => {
                const deviceName = device.hostname || device.mac || 'Unknown Client';
                switchNode.children.push({
                  name: deviceName,
                  type: 'endpoint',
                  ip: device.ip,
                  mac: device.mac,
                  port: port.port,
                  os: device.os,
                  vendor: device.vendor,
                  deviceType: device.type,
                  ...device
                });
              });
            }
          });
        }
        fortigate.children.push(switchNode);
      });
    }

    // APs
    if (this.data.aps) {
      this.data.aps.forEach(ap => {
        const apNode = {
          name: ap.name,
          type: 'access_point',
          ...ap,
          children: []
        };

        // Wireless Clients (Grouped)
        if (ap.clients_connected > 0) {
          apNode.children.push({
            name: `${ap.clients_connected} Clients`,
            type: 'client_group',
            count: ap.clients_connected,
            parentAp: ap.name
          });
        }

        // Attach AP to FortiGate
        fortigate.children.push(apNode);
      });
    }

    return d3.hierarchy(root);
  }

  getIconPath(type) {
    const basePath = 'babylon_3d/babylon_app/network-visualizer/assets/textures/';
    switch (type) {
      case 'firewall': return basePath + 'real_fortigate.svg';
      case 'switch': return basePath + 'real_fortiswitch.svg';
      case 'access_point': return basePath + 'real_fortiap.svg';
      default: return null;
    }
  }

  render() {
    const root = this.processData();

    // Tree Layout
    // Use nodeSize to prevent overlapping
    // Increased spacing for larger icons
    const treeLayout = d3.tree().nodeSize([220, 180]);
    treeLayout(root);

    // Links (Orthogonal)
    const linkGen = d3.linkVertical()
      .x(d => d.x)
      .y(d => d.y);

    // Draw Links
    this.g.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('d', d => {
        // Custom orthogonal path
        // Move down from source, then horizontal, then down to target
        const s = d.source;
        const t = d.target;
        const midY = (s.y + t.y) / 2;
        return `M${s.x},${s.y} 
                        V${midY} 
                        H${t.x} 
                        V${t.y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', d => {
        // Color logic based on connection type
        // FG -> Switch: Black
        // Switch -> AP: Blue or Orange (Alternating or based on index)

        if (d.source.data.type === 'firewall' || d.source.data.type === 'cloud') {
          return '#000000'; // Black for core links
        }

        if (d.source.data.type === 'switch') {
          // Alternate colors for APs/Clients to match the Visio example
          // Using index of the target in the parent's children array would be ideal,
          // but d.target.data doesn't inherently know its index.
          // We can use a hash of the name or just random for now,
          // or better: check if it's the first or second child.

          const siblings = d.source.children;
          const index = siblings.indexOf(d.target);

          if (index % 2 === 0) return '#0000FF'; // Blue
          return '#FFA500'; // Orange
        }

        return '#999999'; // Gray for others
      })
      .attr('stroke-width', 3); // Thicker lines like Visio

    // Draw Nodes
    const node = this.g.selectAll('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        this.showDetails(d.data);
      });

    // Add visual elements to nodes
    node.each((d, i, n) => {
      const el = d3.select(n[i]);
      const data = d.data;
      const iconPath = this.getIconPath(data.type);

      // Node Label Background (for readability over lines if needed, or just visual style)
      // The reference has text below icons.

      if (data.type === 'cloud') {
        // Icon (using FontAwesome for cloud)
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', '#4facfe')
          .attr('font-family', '"Font Awesome 5 Free"')
          .attr('font-weight', '900')
          .attr('font-size', '64px')
          .text('\uf0c2'); // fa-cloud

        // Text label "Internet"
        el.append('text')
          .attr('y', 50)
          .attr('text-anchor', 'middle')
          .attr('fill', '#000000') // Black text
          .attr('font-size', '16px')
          .attr('font-weight', 'bold')
          .text('Internet');
      } else {
        // Icon
        if (iconPath) {
          // Device Icon - Scaled up to 80px
          el.append('image')
            .attr('xlink:href', iconPath)
            .attr('x', -40) // Center 80px image
            .attr('y', -40)
            .attr('width', 80)
            .attr('height', 80);
        } else if (data.type === 'endpoint' || data.type === 'client_group') {
          // Client Icon
          let iconCode = '\uf108'; // desktop
          if (data.type === 'client_group') iconCode = '\uf0c0'; // users

          el.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('fill', '#333333') // Dark gray for icons
            .attr('font-family', '"Font Awesome 5 Free"')
            .attr('font-weight', '900')
            .attr('font-size', '40px') // Scaled up
            .text(iconCode);
        }

        // Label
        // Split long names if needed
        el.append('text')
          .attr('y', 55) // Adjusted for larger icon
          .attr('text-anchor', 'middle')
          .attr('fill', '#000000') // Black text
          .attr('font-family', 'sans-serif')
          .attr('font-size', '14px')
          .attr('font-weight', 'bold')
          .text(data.name);

        // Sub-label (Type)
        let typeLabel = '';
        if (data.type === 'firewall') typeLabel = 'FortiGate Firewall';
        else if (data.type === 'switch') typeLabel = 'Switch';
        else if (data.type === 'access_point') typeLabel = 'FortiAP';

        if (typeLabel) {
          el.append('text')
            .attr('y', 72) // Adjusted for larger icon
            .attr('text-anchor', 'middle')
            .attr('fill', '#666666') // Dark gray text
            .attr('font-family', 'sans-serif')
            .attr('font-size', '12px')
            .text(typeLabel);
        }
      }
    });
  }

  showDetails(d) {
    // ... (Keep existing modal logic, just update styling if needed)
    const modal = document.createElement('div');
    modal.className = 'detail-modal';
    modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8); display: flex; align-items: center;
            justify-content: center; z-index: 10000; padding: 2rem;
        `;

    // ... (Reuse content generation logic from previous step, maybe adjust colors for dark mode)
    // For simplicity, reusing the previous logic but ensuring it looks good.

    let content = '';
    let iconHtml = '';
    const iconPath = this.getIconPath(d.type);

    if (d.type === 'endpoint') {
      iconHtml = `<i class="fas fa-desktop" style="color:#17a2b8; font-size: 32px;"></i>`;
      content = `
                <div style="display: grid; gap: 0.5rem; font-size: 0.95rem;">
                    <div><strong>IP:</strong> ${d.ip || 'Unknown'}</div>
                    <div><strong>MAC:</strong> ${d.mac || 'Unknown'}</div>
                    <div><strong>Port:</strong> ${d.port || 'Unknown'}</div>
                </div>`;
    } else if (d.type === 'client_group') {
      iconHtml = `<i class="fas fa-users" style="color:#17a2b8; font-size: 32px;"></i>`;
      content = `<div><strong>Count:</strong> ${d.count}</div>`;
    } else {
      if (iconPath) iconHtml = `<img src="${iconPath}" style="height: 32px;">`;
      else iconHtml = `<i class="fas fa-server" style="font-size: 32px;"></i>`;

      content = `
                <div style="display: grid; gap: 0.5rem; font-size: 0.95rem;">
                    <div><strong>IP:</strong> ${d.ip || d.ip_address || 'Unknown'}</div>
                    <div><strong>Serial:</strong> ${d.serial || 'Unknown'}</div>
                    <div><strong>Status:</strong> ${d.status === 'down' ? '🔴 Down' : '🟢 Up'}</div>
                </div>`;
    }

    modal.innerHTML = `
            <div style="background: #2d2d2d; color: white; border-radius: 12px; max-width: 500px; width: 100%; padding: 2rem; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #444;">
                <button onclick="this.closest('.detail-modal').remove()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #aaa;">&times;</button>
                
                <h2 style="margin: 0 0 1.5rem 0; color: #fff; display: flex; align-items: center; gap: 0.75rem;">
                    ${iconHtml} ${d.name}
                </h2>
                
                <div style="padding: 1rem; background: #3d3d3d; border-radius: 8px;">
                    ${content}
                </div>
            </div>
        `;

    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  }
}
