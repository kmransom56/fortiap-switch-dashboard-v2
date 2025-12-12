# Enhanced FortiGate Integration Test

from enhanced_fortigate_integration import EnhancedFortiGateClient
import json

def test_enhanced_client():
    print('Testing Enhanced FortiGate Client...')
    
    client = EnhancedFortiGateClient(
        host='192.168.0.254',
        api_token='199psNw33b8bq581dNmQqNpkGH53bm',
        port=10443,
        verify_ssl=False
    )
    
    # Test discovery summary
    summary = client.get_discovery_summary()
    print('Discovery Summary:', summary['discovered_capabilities'])
    
    # Test topology
    topology = client.get_complete_topology()
    print('Topology:', topology['metadata'])
    
    return True

if __name__ == '__main__':
    test_enhanced_client()
