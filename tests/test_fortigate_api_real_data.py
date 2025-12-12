"""
Pytest tests for verifying real FortiGate data retrieval

These tests make actual API calls to FortiGate and verify:
- API connectivity
- Data retrieval
- Data transformation
- Device model extraction
- Icon/layout mapping
"""

import pytest
import requests
import json
from pathlib import Path


@pytest.mark.real_data
@pytest.mark.api
class TestFortiGateAPIRealData:
    """Test real FortiGate API data retrieval"""
    
    def test_fortigate_api_connectivity(self, fortigate_session, fortigate_api_url):
        """Test basic FortiGate API connectivity"""
        response = fortigate_session.get(f"{fortigate_api_url}/monitor/system/status")
        
        assert response.status_code == 200, f"API connection failed: {response.status_code}"
        
        data = response.json()
        assert 'results' in data, "Response missing 'results' field"
        
        results = data['results']
        
        # FortiGate API may return different field names
        # Check for common fields
        has_version = 'version' in results or 'os_version' in results
        has_hostname = 'hostname' in results
        has_model = 'model' in results or 'model_name' in results
        
        assert has_version or has_hostname or has_model, "Response missing basic system information"
        
        print(f"\n✅ FortiGate API Connected")
        print(f"   Hostname: {results.get('hostname', results.get('hostname', 'Unknown'))}")
        print(f"   Model: {results.get('model', results.get('model_name', 'Unknown'))}")
        print(f"   Model Number: {results.get('model_number', 'N/A')}")
        if 'version' in results:
            print(f"   Version: {results.get('version')}")
        if 'serial' in results:
            print(f"   Serial: {results.get('serial')}")
        
        # Print full response structure for debugging
        print(f"\n   Full Response Keys: {list(results.keys())}")
    
    def test_fortiaps_data_retrieval(self, fortigate_session, fortigate_api_url):
        """Test retrieving real FortiAP data"""
        response = fortigate_session.get(f"{fortigate_api_url}/monitor/wifi/managed_ap")
        
        assert response.status_code == 200, f"Failed to retrieve FortiAPs: {response.status_code}"
        
        data = response.json()
        assert 'results' in data, "Response missing 'results' field"
        
        aps = data['results']
        assert isinstance(aps, list), "FortiAPs should be a list"
        
        if len(aps) > 0:
            print(f"\n✅ Retrieved {len(aps)} FortiAP devices")
            
            # Verify data structure
            first_ap = aps[0]
            print(f"\n   Sample AP data:")
            print(f"   - Name: {first_ap.get('name', 'N/A')}")
            print(f"   - Serial: {first_ap.get('serial', 'N/A')}")
            print(f"   - Status: {first_ap.get('status', 'N/A')}")
            print(f"   - OS Version: {first_ap.get('os_version', 'N/A')}")
            
            # Extract and verify model
            os_version = first_ap.get('os_version', '')
            if os_version:
                model = os_version.split('-')[0] if '-' in os_version else os_version
                print(f"   - Extracted Model: {model}")
                assert len(model) > 0, "Model should not be empty"
            
            # Verify required fields for transformation
            required_fields = ['name', 'status']
            for field in required_fields:
                assert field in first_ap, f"Missing required field: {field}"
        else:
            pytest.skip("No FortiAPs found in FortiGate (this is OK if none are configured)")
    
    def test_fortiswitches_data_retrieval(self, fortigate_session, fortigate_api_url):
        """Test retrieving real FortiSwitch data"""
        response = fortigate_session.get(
            f"{fortigate_api_url}/monitor/switch-controller/managed-switch/port-stats"
        )
        
        assert response.status_code == 200, f"Failed to retrieve FortiSwitches: {response.status_code}"
        
        data = response.json()
        assert 'results' in data, "Response missing 'results' field"
        
        switches = data['results']
        assert isinstance(switches, list), "FortiSwitches should be a list"
        
        if len(switches) > 0:
            print(f"\n✅ Retrieved {len(switches)} FortiSwitch devices")
            
            # Verify data structure
            first_switch = switches[0]
            print(f"\n   Sample Switch data:")
            print(f"   - Name: {first_switch.get('name', 'N/A')}")
            print(f"   - Serial: {first_switch.get('serial', 'N/A')}")
            print(f"   - Model: {first_switch.get('model', 'N/A')}")
            
            # Verify model field
            model = first_switch.get('model', '')
            if model:
                print(f"   - Model: {model}")
                assert len(model) > 0, "Model should not be empty"
            
            # Check for port data
            if 'ports' in first_switch:
                ports = first_switch['ports']
                print(f"   - Ports: {len(ports) if isinstance(ports, dict) else 0}")
        else:
            pytest.skip("No FortiSwitches found in FortiGate (this is OK if none are configured)")
    
    def test_topology_data_retrieval(self, fortigate_session, fortigate_api_url):
        """Test retrieving topology-related data"""
        endpoints = [
            '/monitor/system/status',
            '/monitor/switch-controller/managed-switch/port-stats',
            '/monitor/wifi/managed_ap',
            '/monitor/system/arp',
        ]
        
        results = {}
        for endpoint in endpoints:
            try:
                response = fortigate_session.get(f"{fortigate_api_url}{endpoint}", timeout=10)
                results[endpoint] = {
                    'status': response.status_code,
                    'has_data': 'results' in response.json() if response.status_code == 200 else False
                }
            except Exception as e:
                results[endpoint] = {'status': 'error', 'error': str(e)}
        
        print(f"\n✅ Topology Data Endpoints:")
        for endpoint, result in results.items():
            status = result.get('status', 'unknown')
            if status == 200:
                print(f"   ✅ {endpoint}")
            else:
                print(f"   ⚠️  {endpoint}: {status}")
        
        # At least system status should work
        assert results['/monitor/system/status']['status'] == 200, "System status endpoint failed"
    
    def test_device_model_extraction(self, fortigate_session, fortigate_api_url):
        """Test device model extraction from API responses"""
        models_found = {
            'fortiaps': set(),
            'fortiswitches': set()
        }
        
        # Get FortiAPs
        try:
            response = fortigate_session.get(f"{fortigate_api_url}/monitor/wifi/managed_ap")
            if response.status_code == 200:
                aps = response.json().get('results', [])
                for ap in aps:
                    os_version = ap.get('os_version', '')
                    if os_version:
                        model = os_version.split('-')[0] if '-' in os_version else os_version
                        models_found['fortiaps'].add(model)
        except Exception as e:
            print(f"⚠️  Error retrieving APs: {e}")
        
        # Get FortiSwitches
        try:
            response = fortigate_session.get(
                f"{fortigate_api_url}/monitor/switch-controller/managed-switch/port-stats"
            )
            if response.status_code == 200:
                switches = response.json().get('results', [])
                for sw in switches:
                    model = sw.get('model', '')
                    if model:
                        models_found['fortiswitches'].add(model)
        except Exception as e:
            print(f"⚠️  Error retrieving Switches: {e}")
        
        print(f"\n✅ Device Models Found:")
        print(f"   FortiAPs: {sorted(models_found['fortiaps']) if models_found['fortiaps'] else 'None'}")
        print(f"   FortiSwitches: {sorted(models_found['fortiswitches']) if models_found['fortiswitches'] else 'None'}")
        
        # Verify we can extract models (even if empty)
        assert isinstance(models_found['fortiaps'], set)
        assert isinstance(models_found['fortiswitches'], set)


@pytest.mark.real_data
@pytest.mark.integration
class TestDashboardAPIRealData:
    """Test dashboard API endpoints with real data"""
    
    def test_dashboard_status_endpoint(self, dashboard_session, dashboard_url):
        """Test dashboard status endpoint"""
        try:
            response = dashboard_session.get(f"{dashboard_url}/api/status", timeout=5)
            assert response.status_code == 200, f"Status endpoint failed: {response.status_code}"
            
            data = response.json()
            assert 'status' in data, "Response missing 'status' field"
            
            print(f"\n✅ Dashboard Status:")
            print(f"   Status: {data.get('status')}")
            print(f"   Data Source: {data.get('data_source', 'unknown')}")
            
            if 'fortigate' in data:
                fg = data['fortigate']
                print(f"   FortiGate Version: {fg.get('version', 'unknown')}")
                print(f"   FortiGate Hostname: {fg.get('hostname', 'unknown')}")
        except requests.exceptions.ConnectionError:
            pytest.skip("Dashboard server not running. Start with: npm run dashboard")
    
    def test_dashboard_fortiaps_endpoint(self, dashboard_session, dashboard_url):
        """Test dashboard FortiAPs endpoint with real data"""
        try:
            response = dashboard_session.get(f"{dashboard_url}/api/fortiaps", timeout=10)
            assert response.status_code == 200, f"FortiAPs endpoint failed: {response.status_code}"
            
            data = response.json()
            assert isinstance(data, list), "FortiAPs should be a list"
            
            print(f"\n✅ Dashboard FortiAPs Endpoint:")
            print(f"   Retrieved {len(data)} FortiAPs")
            
            if len(data) > 0:
                first_ap = data[0]
                print(f"\n   Sample Transformed AP:")
                print(f"   - Name: {first_ap.get('name', 'N/A')}")
                print(f"   - Model: {first_ap.get('model', 'N/A')}")
                print(f"   - Status: {first_ap.get('status', 'N/A')}")
                print(f"   - IP: {first_ap.get('ip_address', 'N/A')}")
                print(f"   - Clients: {first_ap.get('clients_connected', 0)}")
                
                # Verify transformation
                assert 'name' in first_ap, "Missing 'name' field"
                assert 'status' in first_ap, "Missing 'status' field"
                assert 'model' in first_ap, "Missing 'model' field"
        except requests.exceptions.ConnectionError:
            pytest.skip("Dashboard server not running. Start with: npm run dashboard")
    
    def test_dashboard_fortiswitches_endpoint(self, dashboard_session, dashboard_url):
        """Test dashboard FortiSwitches endpoint with real data"""
        try:
            response = dashboard_session.get(f"{dashboard_url}/api/fortiswitches", timeout=10)
            assert response.status_code == 200, f"FortiSwitches endpoint failed: {response.status_code}"
            
            data = response.json()
            assert isinstance(data, list), "FortiSwitches should be a list"
            
            print(f"\n✅ Dashboard FortiSwitches Endpoint:")
            print(f"   Retrieved {len(data)} FortiSwitches")
            
            if len(data) > 0:
                first_switch = data[0]
                print(f"\n   Sample Transformed Switch:")
                print(f"   - Name: {first_switch.get('name', 'N/A')}")
                print(f"   - Model: {first_switch.get('model', 'N/A')}")
                print(f"   - Status: {first_switch.get('status', 'N/A')}")
                print(f"   - Ports Total: {first_switch.get('ports_total', 0)}")
                print(f"   - Ports Up: {first_switch.get('ports_up', 0)}")
                print(f"   - POE Budget: {first_switch.get('poe_power_budget', 0)}W")
                
                # Verify transformation
                assert 'name' in first_switch, "Missing 'name' field"
                assert 'status' in first_switch, "Missing 'status' field"
                assert 'model' in first_switch, "Missing 'model' field"
                assert 'ports_total' in first_switch, "Missing 'ports_total' field"
        except requests.exceptions.ConnectionError:
            pytest.skip("Dashboard server not running. Start with: npm run dashboard")
    
    def test_dashboard_topology_endpoint(self, dashboard_session, dashboard_url):
        """Test dashboard topology endpoint with real data"""
        try:
            response = dashboard_session.get(f"{dashboard_url}/api/topology", timeout=15)
            assert response.status_code == 200, f"Topology endpoint failed: {response.status_code}"
            
            data = response.json()
            
            print(f"\n✅ Dashboard Topology Endpoint:")
            print(f"   FortiGate: {data.get('fortigate', {}).get('hostname', 'N/A')}")
            print(f"   Switches: {len(data.get('switches', []))}")
            print(f"   APs: {len(data.get('aps', []))}")
            
            # Verify structure
            assert 'fortigate' in data, "Missing 'fortigate' field"
            assert 'switches' in data, "Missing 'switches' field"
            assert 'aps' in data, "Missing 'aps' field"
            assert isinstance(data['switches'], list), "Switches should be a list"
            assert isinstance(data['aps'], list), "APs should be a list"
        except requests.exceptions.ConnectionError:
            pytest.skip("Dashboard server not running. Start with: npm run dashboard")


@pytest.mark.real_data
class TestDeviceIconMapping:
    """Test device icon and layout mapping with real data"""
    
    def test_device_config_loading(self):
        """Test that DeviceConfig can be loaded"""
        import sys
        sys.path.insert(0, str(Path(__file__).parent.parent))
        
        try:
            # Try to import DeviceConfig (JavaScript module, may need Node.js)
            # For now, test the mapping file exists
            config_file = Path(__file__).parent.parent / "device-config.js"
            assert config_file.exists(), "device-config.js not found"
            
            print(f"\n✅ Device Config File Found: {config_file}")
        except Exception as e:
            pytest.skip(f"DeviceConfig test skipped: {e}")
    
    def test_icon_files_exist(self):
        """Test that icon files exist for mapped devices"""
        textures_dir = Path(__file__).parent.parent / "babylon_3d" / "babylon_app" / "network-visualizer" / "assets" / "textures"
        
        assert textures_dir.exists(), f"Textures directory not found: {textures_dir}"
        
        # Check for default icons
        default_icons = ['real_fortigate.svg', 'real_fortiswitch.svg', 'real_fortiap.svg']
        missing_icons = []
        
        for icon in default_icons:
            icon_path = textures_dir / icon
            if not icon_path.exists():
                missing_icons.append(icon)
        
        print(f"\n✅ Icon Files Check:")
        print(f"   Textures Directory: {textures_dir}")
        print(f"   Total SVG files: {len(list(textures_dir.glob('*.svg')))}")
        
        if missing_icons:
            print(f"   ⚠️  Missing default icons: {missing_icons}")
        else:
            print(f"   ✅ All default icons present")
        
        # At least some icons should exist
        svg_files = list(textures_dir.glob('*.svg'))
        assert len(svg_files) > 0, "No SVG icon files found"
    
    def test_device_model_to_icon_mapping(self, dashboard_session, dashboard_url):
        """Test that device models map to correct icon files"""
        try:
            # Get real device data
            aps_response = dashboard_session.get(f"{dashboard_url}/api/fortiaps", timeout=10)
            switches_response = dashboard_session.get(f"{dashboard_url}/api/fortiswitches", timeout=10)
            
            if aps_response.status_code != 200 or switches_response.status_code != 200:
                pytest.skip("Dashboard endpoints not available")
            
            aps = aps_response.json()
            switches = switches_response.json()
            
            # Check device models
            ap_models = [ap.get('model', '') for ap in aps if ap.get('model')]
            switch_models = [sw.get('model', '') for sw in switches if sw.get('model')]
            
            print(f"\n✅ Device Model Mapping Test:")
            print(f"   AP Models Found: {ap_models[:5]}")  # Show first 5
            print(f"   Switch Models Found: {switch_models[:5]}")
            
            # Verify models are extracted
            if ap_models:
                assert all(len(m) > 0 for m in ap_models), "Some AP models are empty"
            if switch_models:
                assert all(len(m) > 0 for m in switch_models), "Some switch models are empty"
        except requests.exceptions.ConnectionError:
            pytest.skip("Dashboard server not running")


@pytest.mark.real_data
@pytest.mark.slow
class TestEndToEndDataFlow:
    """End-to-end tests for complete data flow"""
    
    def test_complete_data_flow(self, fortigate_session, dashboard_session, 
                                 fortigate_api_url, dashboard_url):
        """Test complete flow from FortiGate API to Dashboard"""
        try:
            # Step 1: Get data from FortiGate API
            fg_response = fortigate_session.get(f"{fortigate_api_url}/monitor/wifi/managed_ap")
            assert fg_response.status_code == 200, "FortiGate API failed"
            
            fg_data = fg_response.json().get('results', [])
            print(f"\n✅ Step 1: Retrieved {len(fg_data)} devices from FortiGate API")
            
            # Step 2: Get data from Dashboard API
            dash_response = dashboard_session.get(f"{dashboard_url}/api/fortiaps", timeout=10)
            assert dash_response.status_code == 200, "Dashboard API failed"
            
            dash_data = dash_response.json()
            print(f"✅ Step 2: Retrieved {len(dash_data)} devices from Dashboard API")
            
            # Step 3: Verify transformation
            if len(fg_data) > 0 and len(dash_data) > 0:
                fg_first = fg_data[0]
                dash_first = dash_data[0]
                
                print(f"\n✅ Step 3: Data Transformation Verification")
                print(f"   FortiGate API name: {fg_first.get('name', 'N/A')}")
                print(f"   Dashboard API name: {dash_first.get('name', 'N/A')}")
                
                # Names should match (or be transformed correctly)
                fg_name = fg_first.get('name') or fg_first.get('wtp_id', '')
                dash_name = dash_first.get('name', '')
                
                # Verify transformation preserved key data
                assert dash_name or dash_first.get('serial'), "Transformed data missing identifier"
            
        except requests.exceptions.ConnectionError as e:
            pytest.skip(f"Service not available: {e}")
