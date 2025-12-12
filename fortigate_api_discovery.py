#!/usr/bin/env python3
"""
FortiGate API Discovery Tool
Automatically discovers and documents FortiGate REST API endpoints using self-documenting capabilities
"""

import requests
import json
import urllib3
from pathlib import Path
from datetime import datetime
import argparse

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class FortiGateAPIDiscovery:
    """Discover and document FortiGate REST API endpoints"""
    
    def __init__(self, fgt_ip, api_token, port=10443, output_dir="./fortigate_api_docs"):
        self.fgt_ip = fgt_ip
        self.port = port
        self.api_token = api_token
        self.output_dir = Path(output_dir)
        self.base_url = f"https://{fgt_ip}:{port}"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Accept": "application/json"
        }
        
        # Create output directory
        self.output_dir.mkdir(exist_ok=True)
        
    def test_connection(self):
        """Test basic API connectivity"""
        try:
            url = f"{self.base_url}/api/v2/monitor/system/status?vdom=root"
            response = requests.get(url, headers=self.headers, verify=False, timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"[OK] Connected to FortiGate {data.get('serial', 'Unknown')}")
                print(f"   Version: {data.get('version', 'Unknown')}")
                return True
            else:
                print(f"[FAIL] Connection failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"[ERROR] Connection error: {e}")
            return False
    
    def get_full_schema(self):
        """Retrieve complete CMDB schema"""
        try:
            url = f"{self.base_url}/api/v2/cmdb/?action=schema"
            response = requests.get(url, headers=self.headers, verify=False)
            
            if response.status_code == 200:
                schema = response.json()
                self.save_json("cmdb_full_schema.json", schema)
                print(f"[OK] Full CMDB schema saved")
                return schema
            else:
                print(f"[FAIL] Failed to get full schema: {response.status_code}")
                return None
        except Exception as e:
            print(f"[ERROR] Error getting full schema: {e}")
            return None
    
    def get_endpoint_schema(self, endpoint_path):
        """Get schema for specific endpoint"""
        try:
            url = f"{self.base_url}/api/v2/cmdb/{endpoint_path}/?action=schema"
            response = requests.get(url, headers=self.headers, verify=False, timeout=10)
            
            if response.status_code == 200:
                schema = response.json()
                safe_name = endpoint_path.replace("/", "_") + "_schema.json"
                self.save_json(safe_name, schema)
                return schema
            else:
                print(f"[FAIL] Failed to get schema for {endpoint_path}: {response.status_code}")
                return None
        except Exception as e:
            print(f"[ERROR] Error getting schema for {endpoint_path}: {e}")
            return None
    
    def get_monitor_directory(self):
        """Get monitor API directory"""
        try:
            url = f"{self.base_url}/api/v2/monitor/"
            response = requests.get(url, headers=self.headers, verify=False, timeout=10)
            
            if response.status_code == 200:
                directory = response.json()
                self.save_json("monitor_directory.json", directory)
                print(f"[OK] Monitor directory saved")
                return directory
            else:
                print(f"[FAIL] Failed to get monitor directory: {response.status_code}")
                return None
        except Exception as e:
            print(f"[ERROR] Error getting monitor directory: {e}")
            return None
    
    def discover_key_endpoints(self):
        """Discover schemas for key network mapping endpoints"""
        key_endpoints = {
            "system/global": "System global configuration",
            "system/interface": "Network interfaces",
            "firewall/policy": "Firewall policies",
            "firewall/address": "Firewall addresses",
            "firewall/vip": "Virtual IPs",
            "system/dhcp/server": "DHCP servers",
            "wifi": "WiFi controller settings",
            "wifi/wifi-ap-managed": "Managed access points",
            "switch-controller": "Switch controller settings",
            "switch-controller/managed-switch": "Managed switches",
            "wireless-controller/wtp": "Wireless controller WTPs"
        }
        
        print("\n[DISCOVER] Discovering key endpoint schemas...")
        for endpoint, description in key_endpoints.items():
            print(f"   {endpoint}: {description}")
            schema = self.get_endpoint_schema(endpoint)
            if schema:
                print(f"   [OK] {endpoint} schema saved")
            else:
                print(f"   [FAIL] {endpoint} failed")
    
    def test_network_endpoints(self):
        """Test key network mapping endpoints with actual data"""
        test_endpoints = {
            "system/status": "System status",
            "system/interface": "Interface information",
            "switch-controller/managed-switch/select": "Managed switches status",
            "switch-controller/managed-switch/select/?port_stats=true": "Switch port statistics",
            "wifi/managed_ap/select": "FortiAP status",
            "user/device/query": "Connected clients",
            "switch-controller/managed-switch/faceplate-xml/": "MAC table",
            "system/dhcp/lease": "DHCP leases"
        }
        
        print("\n[TEST] Testing network endpoints...")
        results = {}
        
        for endpoint, description in test_endpoints.items():
            try:
                # Determine if monitor or cmdb endpoint
                if endpoint.startswith("system/") or "select" in endpoint or "query" in endpoint:
                    url = f"{self.base_url}/api/v2/monitor/{endpoint}?vdom=root"
                else:
                    url = f"{self.base_url}/api/v2/monitor/{endpoint}?vdom=root"
                
                response = requests.get(url, headers=self.headers, verify=False)
                
                if response.status_code == 200:
                    data = response.json()
                    results[endpoint] = {
                        "status": "success",
                        "description": description,
                        "data_count": len(data.get('results', [])),
                        "sample_data": data.get('results', [])[:2]  # First 2 items
                    }
                    print(f"   [OK] {endpoint}: {len(data.get('results', []))} items")
                else:
                    results[endpoint] = {
                        "status": "failed",
                        "description": description,
                        "error": f"HTTP {response.status_code}"
                    }
                    print(f"   [FAIL] {endpoint}: HTTP {response.status_code}")
                    
            except Exception as e:
                results[endpoint] = {
                    "status": "error",
                    "description": description,
                    "error": str(e)
                }
                print(f"   [ERROR] {endpoint}: {e}")
        
        # Save test results
        self.save_json("endpoint_tests.json", results)
        print(f"[OK] Endpoint test results saved")
        return results
    
    def generate_client_code(self):
        """Generate Python client code based on discovered schemas"""
        print("\n[GENERATE] Generating Python client code...")
        
        client_code = '''#!/usr/bin/env python3
"""
Auto-generated FortiGate API Client
Generated on: {timestamp}
FortiGate: {fgt_ip}
"""

import requests
import json
from typing import Dict, List, Optional, Any
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class FortiGateAPIClient:
    """Auto-generated FortiGate API Client"""
    
    def __init__(self, host: str, api_token: str, port: int = 443, verify_ssl: bool = False):
        self.host = host
        self.port = port
        self.api_token = api_token
        self.verify_ssl = verify_ssl
        self.base_url = f"https://{{host}}:{{port}}"
        self.session = requests.Session()
        self.session.headers.update({{
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {{api_token}}'
        }})
        
        if not verify_ssl:
            self.session.verify = False
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make API request with error handling"""
        try:
            url = f"{{self.base_url}}/api/v2/monitor/{{endpoint}}"
            if params:
                url += '?' + '&'.join([f"{{k}}={{v}}" for k, v in params.items()])
            
            response = self.session.get(url)
            if response.status_code == 200:
                return response.json()
            else:
                return {{"error": f"HTTP {{response.status_code}}", "text": response.text}}
        except Exception as e:
            return {{"error": str(e)}}
    
    # Auto-generated methods based on discovered endpoints
'''.format(
            timestamp=datetime.now().isoformat(),
            fgt_ip=self.fgt_ip
        )
        
        # Add methods for discovered endpoints
        endpoint_methods = {
            "system/status": "get_system_status",
            "system/interface": "get_interfaces", 
            "switch-controller/managed-switch/select": "get_managed_switches",
            "wifi/managed_ap/select": "get_managed_aps",
            "user/device/query": "get_connected_clients",
            "system/dhcp/lease": "get_dhcp_leases"
        }
        
        for endpoint, method_name in endpoint_methods.items():
            client_code += f'''
    def {method_name}(self, vdom: str = "root") -> Dict:
        """Get data from {endpoint}"""
        return self._make_request("{endpoint}", {{"vdom": vdom}})
'''
        
        # Save generated client
        client_file = self.output_dir / "generated_client.py"
        with open(client_file, 'w') as f:
            f.write(client_code)
        
        print(f"[OK] Generated client code saved to {client_file}")
    
    def save_json(self, filename, data):
        """Save data to JSON file"""
        file_path = self.output_dir / filename
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    
    def run_full_discovery(self):
        """Run complete API discovery process"""
        print("[START] Starting FortiGate API Discovery...")
        print(f"   Target: {self.fgt_ip}")
        print(f"   Output: {self.output_dir}")
        
        # Test connection
        if not self.test_connection():
            return False
        
        # Get full schema
        full_schema = self.get_full_schema()
        
        # Get monitor directory
        monitor_dir = self.get_monitor_directory()
        
        # Discover key endpoints
        self.discover_key_endpoints()
        
        # Test network endpoints
        self.test_network_endpoints()
        
        # Generate client code
        self.generate_client_code()
        
        print(f"\n[DONE] Discovery complete! Check {self.output_dir} for results.")
        return True

def main():
    parser = argparse.ArgumentParser(description="FortiGate API Discovery Tool")
    parser.add_argument("fgt_ip", help="FortiGate IP address")
    parser.add_argument("api_token", help="FortiGate API token")
    parser.add_argument("-p", "--port", type=int, default=10443, 
                       help="FortiGate port (default: 10443)")
    parser.add_argument("-o", "--output", default="./fortigate_api_docs", 
                       help="Output directory (default: ./fortigate_api_docs)")
    
    args = parser.parse_args()
    
    discovery = FortiGateAPIDiscovery(args.fgt_ip, args.api_token, args.port, args.output)
    discovery.run_full_discovery()

if __name__ == "__main__":
    main()
