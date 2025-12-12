# FortiGate API Development Reference Guide

## Quick Start Commands

### 1. API Discovery
```bash
# Run full discovery on your FortiGate
python fortigate_api_discovery.py 192.168.0.254 YOUR_API_TOKEN

# Custom output directory
python fortigate_api_discovery.py 192.168.0.254 YOUR_API_TOKEN -o my_api_docs
```

### 2. Essential API Calls
```bash
# System status
curl -k -H "Authorization: Bearer TOKEN" \
  "https://192.168.0.254/api/v2/monitor/system/status?vdom=root"

# Managed switches
curl -k -H "Authorization: Bearer TOKEN" \
  "https://192.168.0.254/api/v2/monitor/switch-controller/managed-switch/select?vdom=root"

# FortiAPs
curl -k -H "Authorization: Bearer TOKEN" \
  "https://192.168.0.254/api/v2/monitor/wifi/managed_ap/select?vdom=root"

# Connected devices
curl -k -H "Authorization: Bearer TOKEN" \
  "https://192.168.0.254/api/v2/monitor/user/device/query?vdom=root"
```

## Response Pattern Recognition

### Monitor API Pattern
```json
{
  "http_method": "GET",
  "results": [...],        // ACTUAL DATA HERE
  "vdom": "root",
  "path": "system",
  "name": "status", 
  "status": "success",     // SUCCESS/FAILURE INDICATOR
  "serial": "FGT61F...",
  "version": "v7.6.4"
}
```

### Key Field Extraction
```python
# Extract actual data from monitor API
data = response.json()
actual_results = data.get('results', [])
success = data.get('status') == 'success'

# Extract system info from response
system_info = {
    'serial': data.get('serial'),
    'version': data.get('version'),
    'status': data.get('status')
}
```

## Common Endpoint Patterns

### System Endpoints
- `/api/v2/monitor/system/status` - System status
- `/api/v2/monitor/system/resource/usage` - Resource usage
- `/api/v2/monitor/system/dhcp/lease` - DHCP leases

### Network Endpoints  
- `/api/v2/monitor/system/interface` - Interface status
- `/api/v2/monitor/switch-controller/managed-switch/select` - Switch status
- `/api/v2/monitor/wifi/managed_ap/select` - Access point status

### Device Endpoints
- `/api/v2/monitor/user/device/query` - Connected devices
- `/api/v2/monitor/user/device/list` - Device list

## Error Handling Patterns

### HTTP Status Codes
- **200**: Success
- **400**: Bad Request (wrong parameters)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (endpoint doesn't exist)
- **500**: Internal Server Error

### Response Error Format
```json
{
  "status": "error",
  "error": "Error message",
  "http_status": 400
}
```

### Python Error Handling
```python
def safe_api_call(url, headers):
    try:
        response = requests.get(url, headers=headers, verify=False)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                return data.get('results', [])
            else:
                print(f"API Error: {data.get('error', 'Unknown error')}")
                return []
        else:
            print(f"HTTP Error: {response.status_code}")
            return []
    except Exception as e:
        print(f"Exception: {e}")
        return []
```

## Authentication Best Practices

### Token Management
```python
class FortiGateClient:
    def __init__(self, host, api_token):
        self.host = host
        self.api_token = api_token
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        })
        self.session.verify = False  # Only for dev/testing
```

### Token Generation (CLI)
```bash
# Create API user
config system api-user
    edit "my-api-user"
        set accprofile "super_admin"
        set vdom "root"
    next
end

# Generate token (copy this immediately)
execute api-user generate-key my-api-user
```

## Development Workflow

### 1. Discovery Phase
```bash
# Discover all available endpoints
python fortigate_api_discovery.py FGT_IP TOKEN

# Review generated schemas
cat fortigate_api_docs/cmdb_full_schema.json
cat fortigate_api_docs/endpoint_tests.json
```

### 2. Implementation Phase
```python
# Use generated client
from fortigate_api_docs.generated_client import FortiGateAPIClient

client = FortiGateAPIClient("192.168.0.254", "YOUR_TOKEN")
switches = client.get_managed_switches()
aps = client.get_managed_aps()
devices = client.get_connected_clients()
```

### 3. Testing Phase
```bash
# Test individual endpoints
curl -k -H "Authorization: Bearer TOKEN" \
  "https://FGT_IP/api/v2/monitor/switch-controller/managed-switch/select?vdom=root"

# Verify response structure
python -c "import json; print(json.dumps(response.json(), indent=2))"
```

## Common Pitfalls & Solutions

### 1. HTML Instead of JSON
**Problem**: Getting HTML login page instead of JSON
**Solution**: Use Bearer token authentication, not session-based login

### 2. Empty Results Array
**Problem**: `{"results": [], "status": "success"}`
**Solution**: Check if feature is licensed, enabled, or if user has permissions

### 3. 404 Errors
**Problem**: Endpoint not found
**Solution**: Use schema discovery to verify endpoint exists for your FortiOS version

### 4. SSL Certificate Issues
**Problem**: SSL verification errors
**Solution**: Add `verify=False` for development, use proper certificates for production

## Performance Optimization

### Pagination
```python
def get_all_devices(client, limit=100):
    all_devices = []
    offset = 0
    
    while True:
        devices = client.get_connected_clients(limit=limit, offset=offset)
        if not devices:
            break
        all_devices.extend(devices)
        offset += limit
    
    return all_devices
```

### Caching
```python
import time
from functools import lru_cache

class CachedFortiGateClient(FortiGateAPIClient):
    @lru_cache(maxsize=128)
    def get_system_status(self, ttl=300):
        # Cache for 5 minutes
        return super().get_system_status()
```

## Debugging Tools

### Response Inspector
```python
def inspect_response(response):
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    
    try:
        data = response.json()
        print(f"JSON Keys: {list(data.keys())}")
        print(f"Results Count: {len(data.get('results', []))}")
    except:
        print(f"Response Text: {response.text[:200]}...")
```

### API Tester
```python
def test_all_endpoints(client):
    endpoints = [
        ("system/status", "System Status"),
        ("system/interface", "Interfaces"),
        ("switch-controller/managed-switch/select", "Switches"),
        ("wifi/managed_ap/select", "Access Points"),
        ("user/device/query", "Connected Devices")
    ]
    
    for endpoint, name in endpoints:
        print(f"\nTesting {name}...")
        result = client._make_request(endpoint)
        if 'error' not in result:
            print(f"✅ {name}: {len(result.get('results', []))} items")
        else:
            print(f"❌ {name}: {result.get('error')}")
```

## Version Compatibility

### FortiOS 6.x vs 7.x
- **6.x**: Session-based authentication, different endpoint structure
- **7.x**: Bearer token authentication, self-documenting API

### Checking Version
```python
def check_fortios_version(client):
    status = client.get_system_status()
    version = status.get('version', '')
    
    if version.startswith('v6.'):
        print("⚠️  FortiOS 6.x detected - may need different endpoints")
    elif version.startswith('v7.'):
        print("✅ FortiOS 7.x detected - full API support")
    else:
        print(f"❓ Unknown version: {version}")
```

## Next Steps

1. **Run Discovery**: Use the discovery tool on your FortiGate
2. **Review Schemas**: Understand available endpoints and data structures
3. **Generate Client**: Use the auto-generated Python client
4. **Implement Features**: Build your specific integration
5. **Test Thoroughly**: Verify all endpoints work with your FortiOS version
6. **Document**: Keep notes on any version-specific quirks

This reference guide will help you write better, more reliable FortiNet integration code!
