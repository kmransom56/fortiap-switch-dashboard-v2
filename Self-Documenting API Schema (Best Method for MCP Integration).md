Self-Documenting API Schema (Best Method for MCP Integration)
FortiOS 7.0+ includes built-in API schema endpoints that return complete JSON documentation directly from your FortiGate. This is ideal for your MCP servers because you can programmatically extract the exact API structure for your firmware version:​​

Retrieve Full CMDB Schema
bash
curl -k \
  -H "Authorization: Bearer 199psNw33b8bq581dNmQqNpkGH53bm" \
  "https://192.168.0.254/api/v2/cmdb/?action=schema"
Retrieve Schema for Specific Endpoint
bash
# Firewall policy schema
curl -k \
  -H "Authorization: Bearer 199psNw33b8bq581dNmQqNpkGH53bm" \
  "https://192.168.0.254/api/v2/cmdb/firewall/policy/?action=schema"

# Switch-controller managed-switch schema
curl -k \
  -H "Authorization: Bearer 199psNw33b8bq581dNmQqNpkGH53bm" \
  "https://192.168.0.254/api/v2/cmdb/switch-controller/managed-switch/?action=schema"

# Wireless-controller wtp (FortiAP) schema
curl -k \
  -H "Authorization: Bearer 199psNw33b8bq581dNmQqNpkGH53bm" \
  "https://192.168.0.254/api/v2/cmdb/wireless-controller/wtp/?action=schema"
Retrieve Monitor API Endpoints
bash
# Full monitor API directory
curl -k \
  -H "Authorization: Bearer 199psNw33b8bq581dNmQqNpkGH53bm" \
  "https://192.168.0.254/api/v2/monitor/"
The schema output includes field names, types, allowed values, defaults, and descriptions—perfect for generating MCP tool definitions.​

GUI API Preview (FortiOS 7.0+)
When using the FortiGate GUI, there's an API Preview feature that shows the exact REST API calls being made. This is extremely useful for discovering endpoints:​

Open browser developer tools (F12)

Go to Network tab

Perform any action in the FortiGate GUI

Observe the API calls in the network panel

In FortiOS 7.0+, clicking Create New in the GUI shows an API preview with the method, URL, and parameters before you submit.​

Fortinet Developer Network (FNDN)
The official REST API reference documentation is available through FNDN at https://fndn.fortinet.net. Access requires sponsorship from two Fortinet employees (typically your account manager and SE). Once approved, you get access to:​

Complete FortiOS REST API Reference (all endpoints documented)

FortiAP API documentation

Example code and scripts

FortiGuard API documentation

To request access: Contact your Fortinet account team and provide their email addresses during registration—they receive an approval link to sponsor you.​

CLI Tree Command for Complete Command Reference
On your FortiGate, you can dump the entire CLI command tree for offline reference:​

bash
# Full CLI tree
tree

# Specific branches
tree system
tree switch-controller
tree wireless-controller
tree diagnose
tree execute
Capture this output using PuTTY or another terminal with logging enabled to create a text file of all available commands for your specific firmware version.​

Python Script to Export API Documentation
Here's a script to extract and save the complete API schema from your FortiGate for your MCP servers:

python
import requests
import json
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

FGT_IP = "192.168.1.1"
API_TOKEN = "your-api-token"
OUTPUT_DIR = "./fortinet_api_docs"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Accept": "application/json"
}

# Endpoints to document
endpoints = {
    "cmdb_schema": "/api/v2/cmdb/?action=schema",
    "monitor_directory": "/api/v2/monitor/",
    "switch_controller_schema": "/api/v2/cmdb/switch-controller/?action=schema",
    "wireless_controller_schema": "/api/v2/cmdb/wireless-controller/?action=schema",
    "system_schema": "/api/v2/cmdb/system/?action=schema",
    "firewall_schema": "/api/v2/cmdb/firewall/?action=schema",
}

import os
os.makedirs(OUTPUT_DIR, exist_ok=True)

for name, endpoint in endpoints.items():
    url = f"https://{FGT_IP}{endpoint}"
    resp = requests.get(url, headers=headers, verify=False)
    
    if resp.status_code == 200:
        with open(f"{OUTPUT_DIR}/{name}.json", "w") as f:
            json.dump(resp.json(), f, indent=2)
        print(f"Saved: {name}.json")
    else:
        print(f"Failed: {name} - {resp.status_code}")
Key API Endpoints for Your Network Mapping Project
For your network topology visualization project with FortiSwitch and FortiAP, these are the most relevant endpoints:

Purpose	Endpoint
Managed switches status	/api/v2/monitor/switch-controller/managed-switch/select/
Switch port statistics	/api/v2/monitor/switch-controller/managed-switch/select/?port_stats=true
FortiAP status	/api/v2/monitor/wifi/managed_ap/select/
Connected clients	/api/v2/monitor/user/device/query
MAC table	/api/v2/monitor/switch-controller/managed-switch/faceplate-xml/
Interface info	/api/v2/cmdb/system/interface/
These endpoints return JSON that can be directly parsed by your MCP tools and applications for building network maps