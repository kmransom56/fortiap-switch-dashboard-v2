The Solution: detected-device Monitor API Endpoint
The key endpoint for MAC ↔ switch ↔ port mapping is:

text
GET /api/v2/monitor/user/detected-device/query
Full Response Structure
json
{
  "results": [
    {
      "ipv4_address": "192.168.20.4",
      "mac": "s3:1c:ge:62:bc:05",
      "hardware_vendor": "Fortinet",
      "hardware_version": "1048D",
      "hardware_type": "Network Generic",
      "hardware_family": "FortiSwitch",
      "vdom": "root",
      "os_name": "FortiSwitch OS",
      "os_version": "7.0.5",
      "hostname": "FortiSwitch-8",
      "last_seen": 1721681857,
      "host_src": "lldp",
      "is_online": true,
      "active_start_time": 1721409964,
      "detected_interface": "port1",           // ← PORT MAPPING
      "master_mac": "s3:1c:ge:62:bc:05",      // ← SWITCH MAC
      "is_master_device": true
    }
  ],
  "total": 74,
  "status": "success",
  "serial": "FG-ABCDEFGHIJK",
  "version": "v7.0.14"
}
Key Fields for Per-Port Mapping
Field	Purpose
mac	Client MAC address
detected_interface	FortiSwitch port name (e.g., port1, port5)
master_mac	FortiSwitch serial/MAC (identifies which switch)
ipv4_address	Client IP address
hostname	Client hostname
last_seen	UNIX timestamp for last activity
is_online	Current connection status
cURL Example
bash
curl -X GET "https://<FORTIGATE_IP>/api/v2/monitor/user/detected-device/query" \
  -H "Authorization: Bearer <YOUR_API_TOKEN>" \
  -H "accept: application/json" \
  -k
Python Implementation
python
import requests
import json

def get_switch_port_mapping(fortigate_ip, api_token):
    """Get MAC to switch/port mapping from FortiOS"""
    url = f"https://{fortigate_ip}/api/v2/monitor/user/detected-device/query"
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Accept": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers, verify=False)
        response.raise_for_status()
        
        data = response.json()
        
        # Build mapping
        port_mapping = {}
        for device in data.get('results', []):
            entry = {
                'mac': device.get('mac'),
                'switch': device.get('master_mac'),
                'port': device.get('detected_interface'),
                'ip': device.get('ipv4_address'),
                'hostname': device.get('hostname'),
                'online': device.get('is_online'),
                'last_seen': device.get('last_seen')
            }
            port_mapping[device.get('mac')] = entry
        
        return port_mapping
    
    except Exception as e:
        print(f"Error querying detected devices: {e}")
        return None

# Usage
mapping = get_switch_port_mapping('192.168.1.1', 'your_token')
for mac, info in mapping.items():
    print(f"{mac} -> {info['switch']} port {info['port']}")
Prerequisites
FortiLink enabled - FortiSwitch(es) must be managed by FortiGate

Device detection enabled - CLI command:

text
config switch-controller network-monitor-settings
set network-monitoring enable
end
API token - Created with appropriate permissions

Limitations & Notes
⚠️ Only works for Layer 2 directly connected devices - Devices behind L3 routing will show the router's MAC, not the client
⚠️ Populated dynamically - Devices must have active traffic or be discovered via LLDP
✅ Real-time mapping - Updates as devices connect/disconnect
✅ Works across VDOMs - Can query all VDOMs or filter specific one with ?vdom=<name>

Related Alternative Endpoints
For more granular switch-specific data, also available:

text
GET /api/v2/monitor/switch-controller/managed-switch
POST /api/v2/cmdb/switch-controller/managed-switch
Returns FortiSwitch configuration including port MACs and status.

This is the missing piece to complete your topology mapping! The detected-device endpoint