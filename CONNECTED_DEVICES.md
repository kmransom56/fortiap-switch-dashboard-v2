# Connected Devices Feature

## Overview

The Connected Devices feature retrieves and displays all devices connected to your Fortinet network infrastructure, including:

- **Wired Devices**: Clients connected to FortiSwitches via Ethernet ports
- **Wireless Devices**: Clients connected to FortiAPs via Wi-Fi
- **Detected Devices**: Devices discovered on the network through various detection methods

## API Endpoint

### `/api/connected-devices`

Returns a comprehensive list of all connected devices with the following structure:

```json
{
  "total": 25,
  "wired": [
    {
      "mac": "aa:bb:cc:dd:ee:ff",
      "ip_address": "192.168.1.100",
      "hostname": "Workstation-01",
      "vendor": "Dell",
      "device_type": "Laptop",
      "os_name": "Windows 11",
      "os_version": "22H2",
      "is_online": true,
      "connection_type": "wired",
      "switch_id": "FS-108E",
      "port": "port1",
      "detected_interface": "internal"
    }
  ],
  "wireless": [
    {
      "mac": "11:22:33:44:55:66",
      "ip_address": "192.168.1.101",
      "hostname": "iPhone-12",
      "vendor": "Apple",
      "device_type": "Mobile Device",
      "is_online": true,
      "connection_type": "wireless",
      "ap_name": "AP1",
      "ssid": ["NET_INT_SSID"]
    }
  ],
  "detected": [
    {
      "mac": "77:88:99:aa:bb:cc",
      "ip_address": "192.168.1.102",
      "hostname": "Unknown",
      "vendor": "Unknown",
      "is_online": false,
      "connection_type": "detected"
    }
  ],
  "summary": {
    "wired_count": 10,
    "wireless_count": 12,
    "detected_count": 3,
    "online_count": 20
  },
  "timestamp": "2025-01-25T10:30:00.000Z"
}
```

## Data Sources

The endpoint aggregates data from multiple FortiGate API endpoints:

1. **`/monitor/user/device/query`**: User devices and connected clients (filters out Fortinet equipment)
2. **`/monitor/user/detected-device/query`**: Devices detected through various methods
3. **`/monitor/system/arp`**: ARP table for IP/MAC address mapping
4. **`/monitor/wifi/managed_ap`**: Access point data for wireless client association
5. **`/monitor/switch-controller/managed-switch/port-stats`**: Switch port statistics for wired client detection

## Dashboard UI

### Accessing Connected Devices

1. Navigate to the **"Connected Devices"** tab in the dashboard navigation
2. The view displays:
   - Summary statistics (Total, Wired, Wireless, Online counts)
   - Filter dropdown (All, Wired Only, Wireless Only, Detected Only)
   - Search box for filtering by hostname, IP, MAC, vendor, or device type
   - Grid of device cards with key information

### Device Card Information

Each device card shows:
- **Status Indicator**: Green (online) or Red (offline) dot
- **Connection Icon**: Wi-Fi (wireless), Network (wired), or Search (detected)
- **Hostname or IP Address**: Primary identifier
- **IP Address**: Network IP
- **MAC Address**: Hardware address
- **Vendor**: Device manufacturer
- **Device Type**: Hardware category
- **OS Information**: Operating system name and version (if available)
- **Connection Details**: AP name (wireless) or Switch/Port (wired)

### Filtering and Search

- **Type Filter**: Use the dropdown to show only wired, wireless, or detected devices
- **Search**: Type in the search box to filter by:
  - Hostname
  - IP address
  - MAC address
  - Vendor name
  - Device type

### Device Details Modal

Click any device card to view detailed information in a modal dialog, including:
- Full network information
- Device specifications
- Connection details (AP/SSID for wireless, Switch/Port for wired)
- Timestamps (last seen)

## Testing

### Run Connected Devices Tests

```bash
# Activate virtual environment
source venv/bin/activate

# Run all connected device tests
pytest tests/test_connected_devices.py -v

# Run specific test classes
pytest tests/test_connected_devices.py::TestConnectedDevicesAPI -v
pytest tests/test_connected_devices.py::TestDashboardConnectedDevices -v

# Run with real data (requires FortiGate connection)
pytest tests/test_connected_devices.py -v -m real_data
```

### Test Coverage

- **API Endpoint Tests**: Verify FortiGate API endpoints return data
- **Data Transformation Tests**: Verify device data is correctly transformed
- **Dashboard Endpoint Tests**: Verify `/api/connected-devices` endpoint structure
- **Integration Tests**: Verify end-to-end data flow

## Implementation Details

### Backend (`server.js`)

- **`transformConnectedDeviceData()`**: Normalizes device data from various sources
- **`/api/connected-devices` route**: Aggregates and combines data from multiple endpoints
- **Device Classification**: Separates devices into wired/wireless/detected categories
- **Data Enrichment**: Adds AP information for wireless devices, switch/port info for wired devices

### Frontend (`app.js`)

- **`renderConnectedDevices()`**: Fetches and renders the device grid
- **`renderConnectedDevicesList()`**: Creates device cards from data
- **`showConnectedDeviceDetails()`**: Displays detailed device information modal
- **`filterConnectedDevices()`**: Filters devices by type
- **`searchConnectedDevices()`**: Searches devices by various fields

### Styling (`style.css`)

- **`.devices-grid`**: Grid layout for device cards
- **`.device-card`**: Card styling with hover effects
- **`.summary-item`**: Summary statistics styling
- **`.status-indicator`**: Online/offline status indicators

## Notes

- Fortinet equipment (FortiGate, FortiAP, FortiSwitch) is automatically filtered out from client devices
- Devices may appear in multiple categories if detected through different methods
- Online/offline status is based on the `is_online` field from the FortiGate API
- Some devices may have limited information if not fully detected by FortiGate

## Future Enhancements

- Device grouping by vendor or type
- Historical device connection tracking
- Device activity graphs
- Export device list to CSV/JSON
- Bulk device operations
- Device naming/aliasing
- Custom device categories/tags
