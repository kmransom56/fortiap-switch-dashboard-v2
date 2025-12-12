"""
Tests for connected device data retrieval

Tests verify that the application can retrieve:
- Wired clients connected to switches
- Wireless clients connected to APs
- Detected devices on the network
- ARP table entries
"""

import pytest
import requests


@pytest.mark.real_data
@pytest.mark.api
class TestConnectedDevicesAPI:
    """Test connected device data retrieval from FortiGate API"""
    
    def test_detected_devices_endpoint(self, fortigate_session, fortigate_api_url):
        """Test retrieving detected devices from FortiGate"""
        response = fortigate_session.get(
            f"{fortigate_api_url}/monitor/user/detected-device/query",
            timeout=10
        )
        
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            devices = data.get('results', [])
            
            print(f"\n✅ Detected Devices Endpoint:")
            print(f"   Retrieved {len(devices)} devices")
            
            if len(devices) > 0:
                first_device = devices[0]
                print(f"\n   Sample Device:")
                print(f"   - MAC: {first_device.get('mac', 'N/A')}")
                print(f"   - IP: {first_device.get('ipv4_address', 'N/A')}")
                print(f"   - Hostname: {first_device.get('hostname', 'N/A')}")
                print(f"   - Vendor: {first_device.get('hardware_vendor', 'N/A')}")
                print(f"   - Type: {first_device.get('hardware_type', 'N/A')}")
                print(f"   - Online: {first_device.get('is_online', False)}")
                print(f"   - Interface: {first_device.get('detected_interface', 'N/A')}")
        else:
            pytest.skip("Detected devices endpoint not available (404)")
    
    def test_user_device_query_endpoint(self, fortigate_session, fortigate_api_url):
        """Test retrieving user devices (connected clients)"""
        response = fortigate_session.get(
            f"{fortigate_api_url}/monitor/user/device/query",
            timeout=10
        )
        
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            devices = data.get('results', [])
            
            print(f"\n✅ User Device Query Endpoint:")
            print(f"   Retrieved {len(devices)} devices")
            
            if len(devices) > 0:
                # Filter out FortiGate equipment
                client_devices = [
                    d for d in devices 
                    if d.get('hardware_family', '').lower() not in ['fortigate', 'fortiap', 'fortiswitch']
                ]
                
                print(f"   Client Devices (excluding Fortinet equipment): {len(client_devices)}")
                
                if len(client_devices) > 0:
                    first_client = client_devices[0]
                    print(f"\n   Sample Client Device:")
                    print(f"   - MAC: {first_client.get('mac', 'N/A')}")
                    print(f"   - IP: {first_client.get('ipv4_address', 'N/A')}")
                    print(f"   - Hostname: {first_client.get('hostname', 'N/A')}")
                    print(f"   - Vendor: {first_client.get('hardware_vendor', 'N/A')}")
                    print(f"   - OS: {first_client.get('os_name', 'N/A')}")
                    print(f"   - Online: {first_client.get('is_online', False)}")
        else:
            pytest.skip("User device query endpoint not available (404)")
    
    def test_arp_table_endpoint(self, fortigate_session, fortigate_api_url):
        """Test retrieving ARP table"""
        # Try different ARP endpoints
        endpoints = [
            '/monitor/system/arp',
            '/api/v2/monitor/system/arp-table',
            '/monitor/system/arp-table'
        ]
        
        arp_data = None
        working_endpoint = None
        
        for endpoint in endpoints:
            try:
                if endpoint.startswith('/api/v2'):
                    url = f"{fortigate_api_url.replace('/api/v2', '')}{endpoint}"
                else:
                    url = f"{fortigate_api_url}{endpoint}"
                
                response = fortigate_session.get(url, timeout=5)
                if response.status_code == 200:
                    arp_data = response.json()
                    working_endpoint = endpoint
                    break
            except:
                continue
        
        if arp_data:
            entries = arp_data.get('results', [])
            print(f"\n✅ ARP Table Endpoint ({working_endpoint}):")
            print(f"   Retrieved {len(entries)} ARP entries")
            
            if len(entries) > 0:
                first_entry = entries[0]
                print(f"\n   Sample ARP Entry:")
                print(f"   - IP: {first_entry.get('ip', first_entry.get('ip_addr', 'N/A'))}")
                print(f"   - MAC: {first_entry.get('mac', 'N/A')}")
                print(f"   - Interface: {first_entry.get('interface', 'N/A')}")
        else:
            pytest.skip("ARP table endpoint not available")
    
    def test_wireless_clients_endpoint(self, fortigate_session, fortigate_api_url):
        """Test retrieving wireless client list"""
        endpoints = [
            '/monitor/wifi/client',
            '/monitor/wifi/ap_status',
            '/monitor/wifi/managed_ap'
        ]
        
        clients_found = []
        
        for endpoint in endpoints:
            try:
                response = fortigate_session.get(f"{fortigate_api_url}{endpoint}", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    results = data.get('results', [])
                    
                    # Extract clients from AP data
                    if endpoint == '/monitor/wifi/managed_ap':
                        for ap in results:
                            client_count = ap.get('clients', 0)
                            if client_count > 0:
                                clients_found.append({
                                    'ap_name': ap.get('name', 'Unknown'),
                                    'clients': client_count,
                                    'ap_ip': ap.get('local_ipv4_addr', 'N/A')
                                })
                    elif 'client' in endpoint.lower():
                        clients_found.extend(results)
            except:
                continue
        
        print(f"\n✅ Wireless Clients:")
        print(f"   Found clients on {len(clients_found)} APs")
        
        for ap_info in clients_found[:5]:  # Show first 5
            print(f"   - {ap_info.get('ap_name', 'Unknown')}: {ap_info.get('clients', 0)} clients")
    
    def test_wired_clients_from_switches(self, fortigate_session, fortigate_api_url):
        """Test retrieving wired clients from switch ports"""
        response = fortigate_session.get(
            f"{fortigate_api_url}/monitor/switch-controller/managed-switch/port-stats",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            switches = data.get('results', [])
            
            total_wired_clients = 0
            ports_with_clients = 0
            
            for switch in switches:
                ports = switch.get('ports', {})
                for port_name, port_data in ports.items():
                    # Check for client indicators
                    rx_packets = port_data.get('rx-packets', 0)
                    tx_packets = port_data.get('tx-packets', 0)
                    has_traffic = rx_packets > 0 or tx_packets > 0
                    
                    if has_traffic:
                        ports_with_clients += 1
                        # Estimate: 1 device per active port (could be more)
                        total_wired_clients += 1
            
            print(f"\n✅ Wired Clients from Switches:")
            print(f"   Active ports with traffic: {ports_with_clients}")
            print(f"   Estimated wired clients: {total_wired_clients}")
        else:
            pytest.skip("Switch port stats endpoint not available")


@pytest.mark.real_data
@pytest.mark.integration
class TestDashboardConnectedDevices:
    """Test dashboard connected devices endpoint"""
    
    def test_dashboard_connected_devices_endpoint(self, dashboard_session, dashboard_url):
        """Test dashboard connected devices endpoint"""
        try:
            response = dashboard_session.get(f"{dashboard_url}/api/connected-devices", timeout=15)
            
            if response.status_code == 404:
                pytest.skip("Connected devices endpoint not implemented yet")
            
            assert response.status_code == 200, f"Endpoint failed: {response.status_code}"
            
            data = response.json()
            
            print(f"\n✅ Dashboard Connected Devices Endpoint:")
            print(f"   Total Devices: {data.get('total', 0)}")
            print(f"   Wired: {len(data.get('wired', []))}")
            print(f"   Wireless: {len(data.get('wireless', []))}")
            print(f"   Detected: {len(data.get('detected', []))}")
            
            # Verify structure
            assert 'wired' in data, "Missing 'wired' field"
            assert 'wireless' in data, "Missing 'wireless' field"
            assert 'detected' in data, "Missing 'detected' field"
            assert isinstance(data['wired'], list), "Wired should be a list"
            assert isinstance(data['wireless'], list), "Wireless should be a list"
            assert isinstance(data['detected'], list), "Detected should be a list"
            
        except requests.exceptions.ConnectionError:
            pytest.skip("Dashboard server not running. Start with: npm run dashboard")
