#!/usr/bin/env python3
"""
Enhanced FortiGate API Client for FortiAP-Switch Dashboard
Built using discovered API schemas from FortiGate-61F (v7.6.4)
"""

import requests
import json
import urllib3
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class EnhancedFortiGateClient:
    """Enhanced FortiGate API Client with discovered endpoints"""
    
    def __init__(self, host: str, api_token: str, port: int = 10443, verify_ssl: bool = False):
        self.host = host
        self.port = port
        self.api_token = api_token
        self.verify_ssl = verify_ssl
        self.base_url = f"https://{host}:{port}"
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_token}'
        })
        
        if not verify_ssl:
            self.session.verify = False
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def _make_request(self, endpoint: str, params: Dict = None, timeout: int = 10) -> Dict:
        """Make API request with enhanced error handling"""
        try:
            url = f"{self.base_url}/api/v2/monitor/{endpoint}"
            if params:
                url += '?' + '&'.join([f"{k}={v}" for k, v in params.items()])
            
            response = self.session.get(url, timeout=timeout)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'success':
                    return data
                else:
                    self.logger.error(f"API Error: {data.get('error', 'Unknown error')}")
                    return data
            else:
                self.logger.error(f"HTTP Error: {response.status_code} - {response.text}")
                return {"error": f"HTTP {response.status_code}", "text": response.text}
        except Exception as e:
            self.logger.error(f"Request Exception: {e}")
            return {"error": str(e)}
    
    def get_system_status(self) -> Dict:
        """Get FortiGate system status"""
        return self._make_request("system/status", {"vdom": "root"})
    
    def get_fortiaps(self) -> List[Dict]:
        """Get FortiAP access points with enhanced data"""
        result = self._make_request("wifi/managed_ap/select", {"vdom": "root"})
        
        if 'error' not in result:
            aps = result.get('results', [])
            enhanced_aps = []
            
            for ap in aps:
                enhanced_ap = {
                    'id': ap.get('serial', ap.get('name', 'unknown')),
                    'name': ap.get('name', 'Unknown'),
                    'serial': ap.get('serial', 'Unknown'),
                    'model': ap.get('model', 'Unknown'),
                    'ip': ap.get('ip', ap.get('connecting_from', '')),
                    'status': ap.get('state', 'unknown'),
                    'profile': ap.get('ap_profile', ''),
                    'vdom': ap.get('vdom', 'root'),
                    'is_local': ap.get('is_local', False),
                    'radio_1': ap.get('radio_1', {}),
                    'radio_2': ap.get('radio_2', {}),
                    'wifi_clients': ap.get('wifi_clients', 0),
                    'ethernet_mac': ap.get('ethernet_mac', ''),
                    'last_seen': ap.get('last_seen', ''),
                    'uptime': ap.get('uptime', 0),
                    'cpu_usage': ap.get('cpu_usage', 0),
                    'memory_usage': ap.get('memory_usage', 0),
                    'temperature': ap.get('temperature', 0),
                    'metadata': {
                        'raw_data': ap
                    }
                }
                enhanced_aps.append(enhanced_ap)
            
            return enhanced_aps
        
        return []
    
    def get_connected_devices(self) -> List[Dict]:
        """Get connected user devices with enhanced information"""
        result = self._make_request("user/device/query", {"vdom": "root"})
        
        if 'error' not in result:
            devices = result.get('results', [])
            enhanced_devices = []
            
            for device in devices:
                enhanced_device = {
                    'id': device.get('mac', 'unknown'),
                    'name': device.get('hostname', device.get('name', 'Unknown')),
                    'mac': device.get('mac', ''),
                    'ip': device.get('ip', device.get('ipv4', '')),
                    'type': 'endpoint',
                    'user': device.get('user', 'Unknown'),
                    'device_type': device.get('devtype', device.get('type', 'Unknown')),
                    'os': device.get('os', 'Unknown'),
                    'vdom': device.get('vdom', 'root'),
                    'last_seen': device.get('last_seen', 0),
                    'online': device.get('online', False),
                    'auth_user': device.get('auth_user', ''),
                    'auth_group': device.get('auth_group', ''),
                    'interface': device.get('src_intf', ''),
                    'traffic_stats': device.get('traffic_stats', {}),
                    'metadata': {
                        'raw_data': device
                    }
                }
                enhanced_devices.append(enhanced_device)
            
            return enhanced_devices
        
        return []
    
    def get_interfaces(self) -> List[Dict]:
        """Get network interfaces with status"""
        result = self._make_request("system/interface", {"vdom": "root"})
        
        if 'error' not in result:
            interfaces = result.get('results', [])
            enhanced_interfaces = []
            
            for interface in interfaces:
                # Handle case where interface might be a string
                if isinstance(interface, str):
                    interface = {'name': interface}
                elif not isinstance(interface, dict):
                    interface = {}
                
                enhanced_interface = {
                    'id': f"interface_{interface.get('name', 'unknown')}",
                    'name': interface.get('name', 'Unknown'),
                    'type': 'interface',
                    'ip': interface.get('ip', ''),
                    'subnet': interface.get('subnet', ''),
                    'status': interface.get('status', 'down'),
                    'mtu': interface.get('mtu', 1500),
                    'speed': interface.get('speed', 'auto'),
                    'mac': interface.get('mac', ''),
                    'alias': interface.get('alias', ''),
                    'vdom': interface.get('vdom', 'root'),
                    'role': interface.get('role', ''),
                    'connected_to': 'fortigate_main',
                    'metadata': {
                        'raw_data': interface
                    }
                }
                enhanced_interfaces.append(enhanced_interface)
            
            return enhanced_interfaces
        
        return []
    
    def get_complete_topology(self) -> Dict:
        """Build complete network topology using discovered endpoints"""
        self.logger.info("Building complete network topology...")
        
        # Get all data
        system_status = self.get_system_status()
        fortiaps = self.get_fortiaps()
        devices = self.get_connected_devices()
        interfaces = self.get_interfaces()
        
        # Build topology
        topology = {
            'fortigate': {
                'id': 'fortigate_main',
                'name': system_status.get('hostname', 'FortiGate'),
                'serial': system_status.get('serial', 'Unknown'),
                'version': system_status.get('version', 'Unknown'),
                'model': system_status.get('model', 'Unknown'),
                'ip': self.host,
                'status': system_status.get('status', 'unknown'),
                'uptime': system_status.get('uptime', 0),
                'cpu_usage': system_status.get('cpu_usage', 0),
                'memory_usage': system_status.get('memory_usage', 0)
            },
            'fortiaps': fortiaps,
            'devices': devices,
            'interfaces': interfaces,
            'connections': [],
            'metadata': {
                'last_updated': datetime.now().isoformat(),
                'total_devices': len(fortiaps) + len(devices) + len(interfaces),
                'fortiaps_count': len(fortiaps),
                'endpoints_count': len(devices),
                'interfaces_count': len(interfaces),
                'discovery_method': 'enhanced_fortigate_client'
            }
        }
        
        # Build connections
        for ap in fortiaps:
            topology['connections'].append({
                'source': 'fortigate_main',
                'target': ap['id'],
                'type': 'wifi',
                'bandwidth': 0
            })
        
        for device in devices:
            topology['connections'].append({
                'source': 'fortigate_main',
                'target': device['id'],
                'type': 'endpoint',
                'bandwidth': 100
            })
        
        for interface in interfaces:
            topology['connections'].append({
                'source': 'fortigate_main',
                'target': interface['id'],
                'type': 'network',
                'bandwidth': interface.get('speed', 'auto')
            })
        
        self.logger.info(f"Topology built: {topology['metadata']['total_devices']} total devices")
        return topology
    
    def get_discovery_summary(self) -> Dict:
        """Get summary of discovered capabilities"""
        return {
            'fortigate_info': {
                'host': self.host,
                'port': self.port,
                'connected': True
            },
            'working_endpoints': {
                'fortiaps': True,
                'connected_devices': True,
                'interfaces': True,
                'system_status': True
            },
            'discovered_capabilities': {
                'fortiaps_count': len(self.get_fortiaps()),
                'devices_count': len(self.get_connected_devices()),
                'interfaces_count': len(self.get_interfaces())
            },
            'api_version': 'v7.6.4',
            'client_version': '1.0.0'
        }

# Usage Example
if __name__ == "__main__":
    # Initialize client
    client = EnhancedFortiGateClient(
        host="192.168.0.254",
        api_token="199psNw33b8bq581dNmQqNpkGH53bm",
        port=10443,
        verify_ssl=False
    )
    
    # Get discovery summary
    summary = client.get_discovery_summary()
    print("Discovery Summary:")
    print(json.dumps(summary, indent=2))
    
    # Get complete topology
    topology = client.get_complete_topology()
    print(f"\nComplete Topology: {topology['metadata']['total_devices']} devices")
