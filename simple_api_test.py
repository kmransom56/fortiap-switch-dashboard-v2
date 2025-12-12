# Simple API Test for FortiGate Integration
from enhanced_fortigate_integration import EnhancedFortiGateClient
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

class FortiGateAPIHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, client, **kwargs):
        self.client = client
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        if self.path == '/api/topology':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            topology = self.client.get_complete_topology()
            response = json.dumps(topology, indent=2)
            self.wfile.write(response.encode())
        else:
            self.send_response(404)
            self.end_headers()

def run_test_server():
    client = EnhancedFortiGateClient(
        host='192.168.0.254',
        api_token='199psNw33b8bq581dNmQqNpkGH53bm',
        port=10443,
        verify_ssl=False
    )
    
    def handler(*args):
        FortiGateAPIHandler(*args, client=client)
    
    server = HTTPServer(('localhost', 9999), handler)
    print('Test API server running on http://localhost:9999')
    print('Test with: curl http://localhost:9999/api/topology')
    server.serve_forever()

if __name__ == '__main__':
    run_test_server()
