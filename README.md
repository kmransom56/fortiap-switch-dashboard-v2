# FortiAP/Switch Dashboard v2.0

Advanced network monitoring and visualization dashboard for Fortinet infrastructure with 3D topology, connected device tracking, and force-directed graph visualization.

## Features

### Core Functionality
- **Real-time Monitoring**: Live data from FortiGate API
- **Device Management**: Track FortiGate, FortiSwitch, and FortiAP devices
- **Connected Devices**: Monitor wired and wireless client devices
- **POE Monitoring**: Track power over Ethernet consumption
- **Historical Data**: View trends over time

### Visualizations
- **2D Topology**: Hierarchical tree view using D3.js
- **3D Topology**: Fixed-position 3D layout using Babylon.js with device-specific icons
- **3D Force Graph**: Physics-based force-directed graph visualization
- **Connected Devices View**: Grid view with filtering and search
- **Charts**: Real-time charts for clients, POE, temperature, and channel utilization

### Advanced Features
- **Device-Specific Icons**: SVG icons for Fortinet equipment and connected devices
- **3D Device Rendering**: Billboards for clients, 3D shapes for infrastructure
- **Icon Mapping**: Vendor/type/OS-based icon selection for connected devices
- **Debug Mode**: Device debugging and data export (Ctrl+D, Ctrl+Shift+D)
- **Real Data Testing**: Pytest test suite for API connectivity and data retrieval

## Prerequisites

- Node.js >= 14.0.0
- Python >= 3.7.0
- FortiGate with API access enabled
- API token with appropriate permissions

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fortiap-switch-dashboard-v2.git
cd fortiap-switch-dashboard-v2
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Install Python dependencies:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your FortiGate credentials
```

5. Start the dashboard:
```bash
npm run dashboard
```

The dashboard will be available at `http://localhost:13000`

## Configuration

Create a `.env` file with the following variables:

```env
FORTIGATE_HOST=your-fortigate-ip
FORTIGATE_PORT=443
FORTIGATE_API_TOKEN=your-api-token
VERIFY_SSL=true
```

## Usage

### Dashboard Views

1. **Overview**: Summary statistics and quick charts
2. **FortiAPs**: Access point status and details
3. **FortiSwitches**: Switch status and port information
4. **POE Monitoring**: Power consumption tracking
5. **Topology**: 2D hierarchical network view
6. **3D Topology**: 3D visualization with device icons
7. **3D Force Graph**: Physics-based network graph
8. **Historical**: Trend analysis over time
9. **Connected Devices**: Client device management

### Keyboard Shortcuts

- `Ctrl+D`: Toggle debug mode
- `Ctrl+Shift+D`: Export device data as JSON

### Debugging

Enable debug mode to see detailed device information:
1. Press `Ctrl+D` to enable debug mode
2. Navigate through views to see debug output
3. Press `Ctrl+Shift+D` to export device data

## Testing

Run the test suite:

```bash
# Activate virtual environment
source venv/bin/activate

# Run all tests
pytest

# Run only real data tests (requires FortiGate connection)
pytest -m real_data

# Run specific test file
pytest tests/test_connected_devices.py
```

## Project Structure

```
fortiap-switch-dashboard-v2/
├── server.js                 # Express.js backend server
├── app.js                    # Frontend dashboard application
├── device-config.js          # Device icon and layout configuration
├── force-graph-view.js       # 3D force graph implementation
├── index.html                # Main HTML file
├── style.css                 # Stylesheet
├── tests/                    # Pytest test suite
│   ├── test_connected_devices.py
│   ├── test_fortigate_api_real_data.py
│   └── conftest.py
├── babylon_3d/               # 3D visualization assets
│   └── babylon_app/
│       └── network-visualizer/
│           └── assets/
│               └── textures/  # SVG device icons
└── docs/                     # Documentation
```

## Device Icons

The dashboard uses SVG icons for device visualization:

### Fortinet Equipment
- Device-specific icons based on model (e.g., `fortigate_61f.svg`, `fortiswitch_124e.svg`)
- Icons applied as textures to 3D shapes

### Connected Devices
- Vendor-based icons (Apple, Dell, HP, Lenovo, Microsoft, Samsung, Cisco)
- Type-based icons (Laptop, Desktop, Mobile, Tablet, Phone, Server, etc.)
- OS-based icons (Windows, macOS, iOS, Android, Linux)
- Default fallback icon for unknown devices

See `CONNECTED_DEVICES_ICONS.md` for complete icon mapping.

## API Endpoints

- `GET /api/status` - FortiGate connection status
- `GET /api/fortiaps` - FortiAP device list
- `GET /api/fortiswitches` - FortiSwitch device list
- `GET /api/topology` - Network topology data
- `GET /api/connected-devices` - Connected client devices
- `GET /api/historical` - Historical data

## Development

### Adding New Device Icons

1. Add SVG icon file to `babylon_3d/babylon_app/network-visualizer/assets/textures/`
2. Update `device-config.js` with icon mapping
3. Test in 3D topology view

### Adding New Visualizations

1. Create new view class in `app.js` or separate file
2. Add tab to `index.html`
3. Implement render method
4. Connect to data API

## Documentation

- `CONNECTED_DEVICES.md` - Connected devices feature documentation
- `CONNECTED_DEVICES_ICONS.md` - Device icon system documentation
- `DEVICE_CONFIGURATION.md` - Device configuration guide
- `FORCE_GRAPH_IMPLEMENTATION.md` - 3D force graph documentation
- `TESTING.md` - Testing guide
- `3D_FORCE_GRAPH_INVESTIGATION.md` - Force graph research

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Fortinet for FortiGate API
- Babylon.js for 3D rendering
- D3.js for data visualization
- 3d-force-graph for force-directed graphs
- Chart.js for charts

## Support

For issues and questions, please open an issue on GitHub.
