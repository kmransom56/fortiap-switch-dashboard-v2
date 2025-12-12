#!/usr/bin/env python3
"""
Auto-generated FortiGate API Client
Generated on: 2025-12-01T18:36:48.600377
FortiGate: 192.168.0.254
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
        self.base_url = f"https://{host}:{port}"
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_token}'
        })
        
        if not verify_ssl:
            self.session.verify = False
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make API request with error handling"""
        try:
            url = f"{self.base_url}/api/v2/monitor/{endpoint}"
            if params:
                url += '?' + '&'.join([f"{k}={v}" for k, v in params.items()])
            
            response = self.session.get(url, timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": f"HTTP {response.status_code}", "text": response.text}
        except Exception as e:
            return {"error": str(e)}
    
    # Auto-generated methods based on discovered endpoints

    def get_system_status(self, vdom: str = "root") -> Dict:
        """Get data from system/status"""
        return self._make_request("system/status", {"vdom": vdom})

    def get_interfaces(self, vdom: str = "root") -> Dict:
        """Get data from system/interface"""
        return self._make_request("system/interface", {"vdom": vdom})

    def get_managed_switches(self, vdom: str = "root") -> Dict:
        """Get data from switch-controller/managed-switch/select"""
        return self._make_request("switch-controller/managed-switch/select", {"vdom": vdom})

    def get_managed_aps(self, vdom: str = "root") -> Dict:
        """Get data from wifi/managed_ap/select"""
        return self._make_request("wifi/managed_ap/select", {"vdom": vdom})

    def get_connected_clients(self, vdom: str = "root") -> Dict:
        """Get data from user/device/query"""
        return self._make_request("user/device/query", {"vdom": vdom})

    def get_dhcp_leases(self, vdom: str = "root") -> Dict:
        """Get data from system/dhcp/lease"""
        return self._make_request("system/dhcp/lease", {"vdom": vdom})
