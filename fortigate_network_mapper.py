# FortiGate Network Mapper - Extract Connected Client Endpoint Information
# Purpose: Obtain connected client endpoint information from FortiGate, FortiSwitch, and FortiAP
# For use with Draw.io MCP integration for network topology visualization
# 
# Requirements: pip install requests urllib3 pyyaml
#
# Official API Documentation:
# - FortiGate REST API: https://docs.fortinet.com/document/fortigate/7.6.4/administration-guide/
# - FortiSwitch: https://docs.fortinet.com/document/fortiswitch/7.6.4/fortilink-guide/
# - Meraki API: https://developer.cisco.com/meraki/api-v1/

import requests
import json
import ssl
import urllib3
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import sys

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class FortiGateNetworkMapper:
    """
    FortiGate Network Mapper - Collects connected endpoint information from Fortinet devices
    """
    
    def __init__(self, fortigate_host: str, api_token: str, verify_ssl: bool = False):
        """
        Initialize FortiGate API connection
        
        Args:
            fortigate_host: IP address or FQDN of FortiGate (e.g., "192.168.1.1")
            api_token: REST API token generated in FortiGate GUI
            verify_ssl: Whether to verify SSL certificates (default: False for self-signed certs)
        """
        self.host = fortigate_host
        self.api_token = api_token
        self.verify_ssl = verify_ssl
        self.base_url = f"https://{fortigate_host}"
        self.session = requests.Session()
        self.session.verify = verify_ssl
        
        # Set default headers
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        
        # Test connectivity
        self.test_connection()
    
    def test_connection(self) -> bool:
        """Test API connectivity to FortiGate"""
        try:
            response = self.session.get(
                f"{self.base_url}/api/v2/cmdb/system/interface?fields=name,ip,status",
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 200:
                print(f"✓ Successfully connected to FortiGate at {self.host}")
                return True
            else:
                print(f"✗ Failed to connect. Status: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
        except Exception as e:
            print(f"✗ Connection error: {e}")
            return False
    
    def get_connected_devices(self) -> Dict:
        """
        Get all connected devices from FortiGate device inventory
        
        API Endpoint: /api/v2/monitor/user/device/query
        Returns device information including MAC, IP, hostname, device type, etc.
        """
        try:
            print("\n[*] Fetching connected devices from FortiGate...")
            
            response = self.session.get(
                f"{self.base_url}/api/v2/monitor/user/device/query",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                devices = data.get('results', [])
                print(f"✓ Retrieved {len(devices)} devices")
                return {
                    'total_devices': len(devices),
                    'devices': devices,
                    'raw_response': data
                }
            else:
                print(f"✗ Error fetching devices: {response.status_code}")
                print(f"  Response: {response.text}")
                return {'error': response.text, 'devices': []}
                
        except Exception as e:
            print(f"✗ Exception: {e}")
            return {'error': str(e), 'devices': []}
    
    def get_fortiswitch_clients(self) -> Dict:
        """
        Get connected clients on managed FortiSwitch devices
        
        API Endpoint: /api/v2/monitor/switch-controller/managed-switch/status
        Returns: List of FortiSwitch units and connected ports
        
        Additional Info: /api/v2/monitor/wifi/managed_ap/status
        """
        try:
            print("\n[*] Fetching FortiSwitch managed devices...")
            
            response = self.session.get(
                f"{self.base_url}/api/v2/monitor/switch-controller/managed-switch/status",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                switches = data.get('results', [])
                print(f"✓ Retrieved {len(switches)} FortiSwitch devices")
                return {
                    'total_switches': len(switches),
                    'switches': switches,
                    'raw_response': data
                }
            else:
                print(f"✗ Error fetching FortiSwitch data: {response.status_code}")
                return {'error': response.text, 'switches': []}
                
        except Exception as e:
            print(f"✗ Exception: {e}")
            return {'error': str(e), 'switches': []}
    
    def get_fortiap_clients(self) -> Dict:
        """
        Get connected clients on managed FortiAP wireless devices
        
        API Endpoint: /api/v2/monitor/wifi/managed_ap/status
        Returns: List of access points with connection statistics
        """
        try:
            print("\n[*] Fetching FortiAP managed devices...")
            
            response = self.session.get(
                f"{self.base_url}/api/v2/monitor/wifi/managed_ap/status",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                aps = data.get('results', [])
                print(f"✓ Retrieved {len(aps)} FortiAP devices")
                return {
                    'total_aps': len(aps),
                    'access_points': aps,
                    'raw_response': data
                }
            else:
                print(f"✗ Error fetching FortiAP data: {response.status_code}")
                return {'error': response.text, 'access_points': []}
                
        except Exception as e:
            print(f"✗ Exception: {e}")
            return {'error': str(e), 'access_points': []}
    
    def get_endpoint_clients(self) -> Dict:
        """
        Get connected endpoint clients (FortiClient registered devices)
        
        API Endpoint: /api/v2/monitor/endpoint-control/registration/summary
        Returns: Summary of FortiClient registrations and endpoint status
        """
        try:
            print("\n[*] Fetching FortiClient endpoint registrations...")
            
            response = self.session.get(
                f"{self.base_url}/api/v2/monitor/endpoint-control/registration/summary",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Retrieved endpoint registration summary")
                return {
                    'endpoints': data,
                    'raw_response': data
                }
            else:
                print(f"✗ Error fetching endpoint data: {response.status_code}")
                return {'error': response.text, 'endpoints': {}}
                
        except Exception as e:
            print(f"✗ Exception: {e}")
            return {'error': str(e), 'endpoints': {}}
    
    def get_interface_status(self) -> Dict:
        """
        Get FortiGate interface status and statistics
        
        API Endpoint: /api/v2/monitor/interface/ethernet/status
        Returns: Interface operational status, traffic statistics, connected clients
        """
        try:
            print("\n[*] Fetching FortiGate interface status...")
            
            response = self.session.get(
                f"{self.base_url}/api/v2/monitor/interface/ethernet/status",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                interfaces = data.get('results', [])
                print(f"✓ Retrieved {len(interfaces)} interfaces")
                return {
                    'total_interfaces': len(interfaces),
                    'interfaces': interfaces,
                    'raw_response': data
                }
            else:
                print(f"✗ Error fetching interface data: {response.status_code}")
                return {'error': response.text, 'interfaces': []}
                
        except Exception as e:
            print(f"✗ Exception: {e}")
            return {'error': str(e), 'interfaces': []}
    
    def get_dhcp_leases(self) -> Dict:
        """
        Get DHCP lease information (connected clients via DHCP)
        
        API Endpoint: /api/v2/monitor/dhcp-server/leases
        Returns: Active DHCP leases with client IP, MAC, hostname
        """
        try:
            print("\n[*] Fetching DHCP leases...")
            
            response = self.session.get(
                f"{self.base_url}/api/v2/monitor/dhcp-server/leases",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                leases = data.get('results', [])
                print(f"✓ Retrieved {len(leases)} DHCP leases")
                return {
                    'total_leases': len(leases),
                    'leases': leases,
                    'raw_response': data
                }
            else:
                print(f"✗ Error fetching DHCP leases: {response.status_code}")
                return {'error': response.text, 'leases': []}
                
        except Exception as e:
            print(f"✗ Exception: {e}")
            return {'error': str(e), 'leases': []}
    
    def collect_all_topology_data(self) -> Dict:
        """
        Collect all network topology data from FortiGate
        
        Returns comprehensive dictionary with all connected devices and clients
        """
        print("\n" + "="*60)
        print("FortiGate Network Topology Data Collection Started")
        print("="*60)
        
        topology_data = {
            'timestamp': datetime.now().isoformat(),
            'fortigate_host': self.host,
            'devices': self.get_connected_devices(),
            'fortiswitch': self.get_fortiswitch_clients(),
            'fortiap': self.get_fortiap_clients(),
            'endpoints': self.get_endpoint_clients(),
            'interfaces': self.get_interface_status(),
            'dhcp_leases': self.get_dhcp_leases()
        }
        
        print("\n" + "="*60)
        print("Data Collection Complete")
        print("="*60)
        
        return topology_data
    
    def export_to_json(self, data: Dict, filename: str = None) -> str:
        """Export topology data to JSON file for Draw.io MCP processing"""
        if filename is None:
            filename = f"fortigate_topology_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            with open(filename, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            print(f"\n✓ Topology data exported to: {filename}")
            return filename
        except Exception as e:
            print(f"✗ Error exporting JSON: {e}")
            return None
    
    def parse_device_info(self, devices: List[Dict]) -> List[Dict]:
        """
        Parse and normalize device information for Draw.io processing
        
        Extracts relevant fields for network diagram generation
        """
        parsed_devices = []
        
        for device in devices:
            parsed_device = {
                'hostname': device.get('hostname', 'Unknown'),
                'mac_address': device.get('mac', ''),
                'ipv4_address': device.get('ipv4_address', ''),
                'device_type': device.get('hardware_type', ''),
                'vendor': device.get('hardware_vendor', ''),
                'device_family': device.get('hardware_family', ''),
                'os_name': device.get('os_name', ''),
                'os_version': device.get('os_version', ''),
                'interface': device.get('detected_interface', ''),
                'is_online': device.get('is_online', False),
                'last_seen': device.get('last_seen', 0),
                'connection_type': device.get('host_src', 'unknown')  # lldp, dhcp, etc
            }
            parsed_devices.append(parsed_device)
        
        return parsed_devices
    
    def generate_draw_io_context(self, topology_data: Dict) -> str:
        """
        Generate human-readable context for Draw.io MCP diagram generation
        
        This output is used as LLM context to create network diagrams
        """
        context = []
        context.append("# Network Topology Data for Diagram Generation\n")
        context.append(f"Source: FortiGate {self.host}\n")
        context.append(f"Timestamp: {topology_data['timestamp']}\n\n")
        
        # Connected Devices
        devices_data = topology_data['devices']
        if devices_data.get('devices'):
            context.append(f"## Connected Devices ({devices_data['total_devices']} total)\n")
            parsed = self.parse_device_info(devices_data['devices'])
            for device in parsed[:10]:  # Show first 10 for brevity
                context.append(f"- {device['hostname']} ({device['device_family']})")
                context.append(f"  IP: {device['ipv4_address']}, MAC: {device['mac_address']}")
                context.append(f"  Type: {device['device_type']}, Online: {device['is_online']}\n")
        
        # FortiSwitch Devices
        switch_data = topology_data['fortiswitch']
        if switch_data.get('switches'):
            context.append(f"## Managed FortiSwitch Devices ({switch_data['total_switches']} total)\n")
            for switch in switch_data['switches'][:5]:
                context.append(f"- {switch.get('name', 'Unknown')}")
                context.append(f"  Serial: {switch.get('serial', 'N/A')}\n")
        
        # FortiAP Devices
        ap_data = topology_data['fortiap']
        if ap_data.get('access_points'):
            context.append(f"## Managed FortiAP Devices ({ap_data['total_aps']} total)\n")
            for ap in ap_data['access_points'][:5]:
                context.append(f"- {ap.get('name', 'Unknown')}")
                context.append(f"  Clients: {ap.get('wtp_client', 0)}\n")
        
        # DHCP Leases
        dhcp_data = topology_data['dhcp_leases']
        if dhcp_data.get('leases'):
            context.append(f"## DHCP Leases ({dhcp_data['total_leases']} total)\n")
            for lease in dhcp_data['leases'][:10]:
                context.append(f"- {lease.get('ip', 'N/A')}: {lease.get('mac', 'N/A')}\n")
        
        # Interfaces
        interface_data = topology_data['interfaces']
        if interface_data.get('interfaces'):
            context.append(f"## Network Interfaces ({interface_data['total_interfaces']} total)\n")
            for iface in interface_data['interfaces']:
                context.append(f"- {iface.get('name', 'Unknown')}")
                context.append(f"  IP: {iface.get('ip', 'N/A')}")
                context.append(f"  Status: {iface.get('state', 'unknown')}\n")
        
        return "\n".join(context)


class MerakiNetworkMapper:
    """
    Meraki API integration for access point and client endpoint information
    """
    
    def __init__(self, api_key: str, org_id: str):
        """
        Initialize Meraki Dashboard API connection
        
        Args:
            api_key: Meraki API key from Dashboard
            org_id: Organization ID from Meraki Dashboard
        """
        self.api_key = api_key
        self.org_id = org_id
        self.base_url = "https://api.meraki.com/api/v1"
        self.session = requests.Session()
        self.headers = {
            "X-Cisco-Meraki-API-Key": api_key,
            "Content-Type": "application/json"
        }
        
        self.test_connection()
    
    def test_connection(self) -> bool:
        """Test API connectivity to Meraki"""
        try:
            response = self.session.get(
                f"{self.base_url}/organizations/{self.org_id}",
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 200:
                org_name = response.json().get('name', 'Unknown')
                print(f"✓ Successfully connected to Meraki organization: {org_name}")
                return True
            else:
                print(f"✗ Failed to connect. Status: {response.status_code}")
                return False
        except Exception as e:
            print(f"✗ Connection error: {e}")
            return False
    
    def get_networks(self) -> List[Dict]:
        """Get all networks in organization"""
        try:
            print("\n[*] Fetching Meraki networks...")
            response = self.session.get(
                f"{self.base_url}/organizations/{self.org_id}/networks",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                networks = response.json()
                print(f"✓ Retrieved {len(networks)} networks")
                return networks
            else:
                print(f"✗ Error: {response.status_code}")
                return []
        except Exception as e:
            print(f"✗ Exception: {e}")
            return []
    
    def get_network_devices(self, network_id: str) -> List[Dict]:
        """Get devices in a network"""
        try:
            response = self.session.get(
                f"{self.base_url}/organizations/{self.org_id}/networks/{network_id}/devices",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return []
        except Exception as e:
            print(f"✗ Exception getting network devices: {e}")
            return []
    
    def get_device_clients(self, device_serial: str, timespan: int = 2592000) -> List[Dict]:
        """
        Get clients connected to a specific device (AP, Switch, etc)
        
        API Endpoint: /devices/{serial}/clients
        
        Args:
            device_serial: Device serial number
            timespan: Time range in seconds (default: 30 days)
        """
        try:
            response = self.session.get(
                f"{self.base_url}/devices/{device_serial}/clients",
                headers=self.headers,
                params={"timespan": timespan},
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return []
        except Exception as e:
            print(f"✗ Exception: {e}")
            return []
    
    def collect_all_meraki_data(self) -> Dict:
        """Collect all Meraki topology data"""
        print("\n" + "="*60)
        print("Meraki Network Topology Data Collection Started")
        print("="*60)
        
        networks = self.get_networks()
        meraki_data = {
            'timestamp': datetime.now().isoformat(),
            'organization_id': self.org_id,
            'networks': []
        }
        
        for network in networks:
            network_info = {
                'network_id': network['id'],
                'network_name': network['name'],
                'devices': []
            }
            
            devices = self.get_network_devices(network['id'])
            for device in devices:
                device_info = {
                    'serial': device['serial'],
                    'name': device['name'],
                    'device_type': device['type'],
                    'address': device.get('address', ''),
                    'ip': device.get('ip', ''),
                    'clients': self.get_device_clients(device['serial'])
                }
                network_info['devices'].append(device_info)
            
            meraki_data['networks'].append(network_info)
        
        print("="*60)
        print("Meraki Data Collection Complete")
        print("="*60)
        
        return meraki_data


def main():
    """Main execution"""
    
    print("\n" + "="*60)
    print("FortiGate Network Mapper - Network Topology Data Collector")
    print("="*60)
    
    # Example 1: FortiGate Network Mapping
    print("\n[EXAMPLE 1] FortiGate Network Mapping")
    print("-" * 60)
    
    # Configuration
    FORTIGATE_HOST = "192.168.1.1"  # Change to your FortiGate IP
    FORTIGATE_API_TOKEN = "YOUR_API_TOKEN_HERE"  # Get from FortiGate System > Administrators > API Users
    
    try:
        # Initialize FortiGate mapper
        fg_mapper = FortiGateNetworkMapper(
            fortigate_host=FORTIGATE_HOST,
            api_token=FORTIGATE_API_TOKEN,
            verify_ssl=False
        )
        
        # Collect all topology data
        topology_data = fg_mapper.collect_all_topology_data()
        
        # Export to JSON for Draw.io MCP
        json_file = fg_mapper.export_to_json(topology_data)
        
        # Generate context for Draw.io diagram generation
        diagram_context = fg_mapper.generate_draw_io_context(topology_data)
        print("\n[*] Generated Draw.io context:")
        print(diagram_context[:500] + "...\n")  # Print first 500 chars
        
        print("\n[*] To use with Draw.io MCP, send to Claude Desktop:")
        print(f'    "Using this topology data: {json_file}, create a network diagram in Draw.io"')
        
    except Exception as e:
        print(f"Error: {e}")
    
    # Example 2: Meraki Network Mapping (optional)
    print("\n\n[EXAMPLE 2] Meraki Network Mapping (Optional)")
    print("-" * 60)
    
    MERAKI_API_KEY = "YOUR_MERAKI_API_KEY_HERE"  # Get from Meraki Dashboard
    MERAKI_ORG_ID = "YOUR_ORG_ID_HERE"  # Organization ID from Meraki Dashboard
    
    if MERAKI_API_KEY != "YOUR_MERAKI_API_KEY_HERE":
        try:
            meraki_mapper = MerakiNetworkMapper(
                api_key=MERAKI_API_KEY,
                org_id=MERAKI_ORG_ID
            )
            
            meraki_data = meraki_mapper.collect_all_meraki_data()
            # Export Meraki data
            # meraki_mapper.export_to_json(meraki_data)
            
        except Exception as e:
            print(f"Meraki Error: {e}")


if __name__ == "__main__":
    main()
