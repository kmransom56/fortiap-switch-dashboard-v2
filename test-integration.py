#!/usr/bin/env python3
"""
Integration Test Script for Unified FortiAP/Switch Dashboard
Tests all components working together with intelligent service detection
"""

import asyncio
import aiohttp
import json
import time
import subprocess
import sys
import os
import socket
import importlib.util
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

class ServiceDetector:
    """Detects if services are running and available"""
    
    @staticmethod
    def is_port_open(host: str, port: int, timeout: float = 2.0) -> bool:
        """Check if a port is open on a host"""
        try:
            with socket.create_connection((host, port), timeout):
                return True
        except (socket.error, socket.timeout):
            return False
    
    @staticmethod
    def check_services() -> Dict[str, bool]:
        """Check which services are running"""
        services = {
            'api_gateway': ServiceDetector.is_port_open('localhost', 13001),
            'dashboard': ServiceDetector.is_port_open('localhost', 13000),
            'babylon_3d': ServiceDetector.is_port_open('localhost', 3001)
        }
        return services

class ComponentTester:
    """Tests individual components without requiring running services"""
    
    def __init__(self):
        self.test_results = {}
    
    def test_file_structure(self) -> bool:
        """Test if all required files exist"""
        print("\n🔍 Testing File Structure...")
        
        required_files = [
            'shared/api-gateway.js',
            'shared/model-library.js',
            'shared/combined-dashboard.js',
            'shared/combined-dashboard.html',
            'shared/.env.example',
            'package-unified.json',
            'Dockerfile',
            'docker-compose.yml',
            'setup-unified.sh',
            'setup-unified.bat'
        ]
        
        missing_files = []
        for file_path in required_files:
            if not Path(file_path).exists():
                missing_files.append(file_path)
        
        if missing_files:
            self.test_results['file_structure'] = {
                'status': 'FAIL',
                'missing_files': missing_files
            }
            print(f"❌ File Structure: Missing {len(missing_files)} files")
            for file in missing_files:
                print(f"   • {file}")
            return False
        else:
            self.test_results['file_structure'] = {
                'status': 'PASS',
                'files_checked': len(required_files)
            }
            print(f"✅ File Structure: All {len(required_files)} files present")
            return True
    
    def test_package_json(self) -> bool:
        """Test package.json structure and dependencies"""
        print("\n🔍 Testing Package Configuration...")
        
        try:
            with open('package-unified.json', 'r') as f:
                package_data = json.load(f)
            
            required_fields = ['name', 'version', 'scripts', 'dependencies']
            missing_fields = [field for field in required_fields if field not in package_data]
            
            if missing_fields:
                self.test_results['package_json'] = {
                    'status': 'FAIL',
                    'missing_fields': missing_fields
                }
                print(f"❌ Package Configuration: Missing fields {missing_fields}")
                return False
            
            # Check critical scripts
            required_scripts = ['start', 'dev', 'combined']
            missing_scripts = [script for script in required_scripts if script not in package_data.get('scripts', {})]
            
            if missing_scripts:
                self.test_results['package_json'] = {
                    'status': 'FAIL',
                    'missing_scripts': missing_scripts
                }
                print(f"❌ Package Configuration: Missing scripts {missing_scripts}")
                return False
            
            self.test_results['package_json'] = {
                'status': 'PASS',
                'name': package_data['name'],
                'version': package_data['version'],
                'scripts_count': len(package_data['scripts']),
                'dependencies_count': len(package_data['dependencies'])
            }
            print(f"✅ Package Configuration: {package_data['name']} v{package_data['version']}")
            print(f"   • Scripts: {len(package_data['scripts'])}")
            print(f"   • Dependencies: {len(package_data['dependencies'])}")
            return True
            
        except Exception as e:
            self.test_results['package_json'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ Package Configuration: {e}")
            return False
    
    def test_shared_config(self) -> bool:
        """Test shared configuration files"""
        print("\n🔍 Testing Shared Configuration...")
        
        try:
            # Test .env.example
            env_example_path = Path('shared/.env.example')
            if not env_example_path.exists():
                self.test_results['shared_config'] = {
                    'status': 'FAIL',
                    'error': 'shared/.env.example not found'
                }
                print("❌ Shared Configuration: .env.example not found")
                return False
            
            # Read and validate .env.example
            with open(env_example_path, 'r') as f:
                env_content = f.read()
            
            required_env_vars = [
                'FORTIGATE_HOST',
                'FORTIGATE_USERNAME',
                'FORTIGATE_PASSWORD',
                'SHARED_API_PORT',
                'DASHBOARD_PORT',
                'BABYLON_3D_PORT'
            ]
            
            missing_vars = []
            for var in required_env_vars:
                if var not in env_content:
                    missing_vars.append(var)
            
            if missing_vars:
                self.test_results['shared_config'] = {
                    'status': 'FAIL',
                    'missing_env_vars': missing_vars
                }
                print(f"❌ Shared Configuration: Missing env vars {missing_vars}")
                return False
            
            self.test_results['shared_config'] = {
                'status': 'PASS',
                'env_vars_count': len([line for line in env_content.split('\n') if line.strip() and not line.startswith('#')]),
                'has_fortigate_config': True
            }
            print("✅ Shared Configuration: All required variables present")
            return True
            
        except Exception as e:
            self.test_results['shared_config'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ Shared Configuration: {e}")
            return False
    
    def test_javascript_modules(self) -> bool:
        """Test JavaScript module existence and basic structure"""
        print("\n🔍 Testing JavaScript Modules...")
        
        js_files = [
            'shared/api-gateway.js',
            'shared/model-library.js',
            'shared/combined-dashboard.js'
        ]
        
        issues = []
        
        for js_file in js_files:
            try:
                # Try different encodings
                content = None
                encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
                
                for encoding in encodings:
                    try:
                        with open(js_file, 'r', encoding=encoding) as f:
                            content = f.read()
                        break
                    except UnicodeDecodeError:
                        continue
                
                if content is None:
                    issues.append(f"{js_file}: Unable to read file (encoding issue)")
                    continue
                
                # Check if file has content
                if len(content.strip()) == 0:
                    issues.append(f"{js_file}: Empty file")
                    continue
                
                # Check for basic JavaScript structure (more lenient)
                has_js_structure = any(keyword in content for keyword in ['function', 'class', 'const', 'let', 'var', 'module.exports'])
                has_exports = any(keyword in content for keyword in ['module.exports', 'export', 'exports.'])
                
                if not has_js_structure:
                    issues.append(f"{js_file}: Missing JavaScript structure")
                elif not has_exports:
                    issues.append(f"{js_file}: Missing module exports")
                
                # Check for Node.js specific patterns
                has_node_patterns = any(pattern in content for pattern in ['require(', 'process.env', 'console.'])
                
                if not has_node_patterns:
                    issues.append(f"{js_file}: Missing Node.js patterns")
                
            except Exception as e:
                issues.append(f"{js_file}: {e}")
        
        if issues:
            self.test_results['javascript_modules'] = {
                'status': 'FAIL',
                'issues': issues
            }
            print("❌ JavaScript Modules: Issues found")
            for issue in issues:
                print(f"   • {issue}")
            return False
        else:
            self.test_results['javascript_modules'] = {
                'status': 'PASS',
                'modules_checked': len(js_files)
            }
            print(f"✅ JavaScript Modules: All {len(js_files)} modules valid")
            return True
    
    def test_python_dependencies(self) -> bool:
        """Test Python requirements and imports"""
        print("\n🔍 Testing Python Dependencies...")
        
        try:
            # Check requirements.txt
            req_file = Path('babylon_3d/requirements.txt')
            if not req_file.exists():
                self.test_results['python_dependencies'] = {
                    'status': 'FAIL',
                    'error': 'babylon_3d/requirements.txt not found'
                }
                print("❌ Python Dependencies: requirements.txt not found")
                return False
            
            with open(req_file, 'r') as f:
                requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]
            
            # Check if key packages are listed
            key_packages = ['requests', 'aiohttp', 'python-dotenv']
            missing_packages = [pkg for pkg in key_packages if not any(pkg in req for req in requirements)]
            
            if missing_packages:
                self.test_results['python_dependencies'] = {
                    'status': 'FAIL',
                    'missing_packages': missing_packages
                }
                print(f"❌ Python Dependencies: Missing {missing_packages}")
                return False
            
            # Try importing key modules
            import_errors = []
            for package in key_packages:
                try:
                    if package == 'python-dotenv':
                        import dotenv
                    else:
                        importlib.import_module(package)
                except ImportError:
                    import_errors.append(package)
            
            if import_errors:
                self.test_results['python_dependencies'] = {
                    'status': 'FAIL',
                    'import_errors': import_errors,
                    'note': 'Run: pip install -r babylon_3d/requirements.txt'
                }
                print(f"❌ Python Dependencies: Not installed {import_errors}")
                return False
            
            self.test_results['python_dependencies'] = {
                'status': 'PASS',
                'requirements_count': len(requirements),
                'key_packages_available': True
            }
            print(f"✅ Python Dependencies: {len(requirements)} packages, all key packages available")
            return True
            
        except Exception as e:
            self.test_results['python_dependencies'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ Python Dependencies: {e}")
            return False
    
    def test_docker_configuration(self) -> bool:
        """Test Docker configuration files"""
        print("\n🔍 Testing Docker Configuration...")
        
        docker_files = ['Dockerfile', 'docker-compose.yml']
        docker_errors = []
        
        for docker_file in docker_files:
            if not Path(docker_file).exists():
                docker_errors.append(f"{docker_file} not found")
                continue
            
            try:
                if docker_file.endswith('.yml') or docker_file.endswith('.yaml'):
                    # Basic YAML structure check without importing yaml
                    with open(docker_file, 'r') as f:
                        content = f.read()
                    
                    if 'services:' not in content:
                        docker_errors.append(f"{docker_file}: No services defined")
                    elif 'api-gateway:' not in content:
                        docker_errors.append(f"{docker_file}: api-gateway service missing")
                
            except Exception as e:
                docker_errors.append(f"{docker_file}: {e}")
        
        if docker_errors:
            self.test_results['docker_configuration'] = {
                'status': 'FAIL',
                'errors': docker_errors
            }
            print("❌ Docker Configuration: Errors found")
            for error in docker_errors:
                print(f"   • {error}")
            return False
        else:
            self.test_results['docker_configuration'] = {
                'status': 'PASS',
                'files_checked': len(docker_files)
            }
            print(f"✅ Docker Configuration: All {len(docker_files)} files valid")
            return True

class ServiceTester:
    """Tests running services if available"""
    
    def __init__(self):
        self.base_urls = {
            'api_gateway': 'http://localhost:13001',
            'dashboard': 'http://localhost:13000',
            'babylon_3d': 'http://localhost:3001'
        }
        self.test_results = {}
    
    async def test_service_if_running(self, service_name: str, session: aiohttp.ClientSession) -> bool:
        """Test a service only if it's running"""
        port_map = {
            'api_gateway': 13001,
            'dashboard': 13000,
            'babylon_3d': 3001
        }
        
        if not ServiceDetector.is_port_open('localhost', port_map[service_name]):
            self.test_results[f'{service_name}_service'] = {
                'status': 'SKIP',
                'reason': 'Service not running'
            }
            print(f"⏭️  {service_name.title()} Service: Not running (skipped)")
            return True
        
        try:
            async with session.get(f"{self.base_urls[service_name]}/") as response:
                if response.status == 200:
                    self.test_results[f'{service_name}_service'] = {
                        'status': 'PASS',
                        'response_code': response.status,
                        'content_length': len(await response.text())
                    }
                    print(f"✅ {service_name.title()} Service: Responding (HTTP {response.status})")
                    return True
                else:
                    self.test_results[f'{service_name}_service'] = {
                        'status': 'FAIL',
                        'error': f"HTTP {response.status}"
                    }
                    print(f"❌ {service_name.title()} Service: HTTP {response.status}")
                    return False
        except Exception as e:
            self.test_results[f'{service_name}_service'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ {service_name.title()} Service: {e}")
            return False
    
    async def test_api_gateway_if_running(self, session: aiohttp.ClientSession) -> bool:
        """Test API Gateway endpoints if service is running"""
        if not ServiceDetector.is_port_open('localhost', 13001):
            self.test_results['api_gateway_endpoints'] = {
                'status': 'SKIP',
                'reason': 'API Gateway not running'
            }
            print("⏭️  API Gateway Endpoints: Not running (skipped)")
            return True
        
        endpoints_to_test = [
            '/health',
            '/config',
            '/api/3d-models'
        ]
        
        results = {}
        for endpoint in endpoints_to_test:
            try:
                async with session.get(f"{self.base_urls['api_gateway']}{endpoint}") as response:
                    if response.status == 200:
                        results[endpoint] = 'PASS'
                    else:
                        results[endpoint] = f'FAIL ({response.status})'
            except Exception as e:
                results[endpoint] = f'ERROR ({e})'
        
        passed = sum(1 for result in results.values() if result == 'PASS')
        
        self.test_results['api_gateway_endpoints'] = {
            'status': 'PASS' if passed == len(endpoints_to_test) else 'FAIL',
            'endpoints_tested': len(endpoints_to_test),
            'endpoints_passed': passed,
            'results': results
        }
        
        print(f"✅ API Gateway Endpoints: {passed}/{len(endpoints_to_test)} responding")
        return passed == len(endpoints_to_test)

class IntegrationTester:
    """Main integration test orchestrator"""
    
    def __init__(self):
        self.component_tester = ComponentTester()
        self.service_tester = ServiceTester()
        self.test_results = {}
    
    async def run_tests(self) -> bool:
        """Run all integration tests"""
        print("🧪 Starting Comprehensive Integration Tests")
        print("=" * 50)
        
        # Detect running services
        running_services = ServiceDetector.check_services()
        print(f"\n🔍 Service Detection:")
        for service, running in running_services.items():
            status = "✅ Running" if running else "⏸️  Stopped"
            print(f"   • {service.replace('_', ' ').title()}: {status}")
        
        # Component tests (always run)
        print(f"\n📋 Component Tests:")
        component_tests = [
            self.component_tester.test_file_structure,
            self.component_tester.test_package_json,
            self.component_tester.test_shared_config,
            self.component_tester.test_javascript_modules,
            self.component_tester.test_python_dependencies,
            self.component_tester.test_docker_configuration
        ]
        
        component_results = []
        for test in component_tests:
            try:
                result = test()
                component_results.append(result)
            except Exception as e:
                print(f"❌ Component test failed: {e}")
                component_results.append(False)
        
        # Service tests (only if services are running)
        if any(running_services.values()):
            print(f"\n🌐 Service Tests:")
            async with aiohttp.ClientSession() as session:
                # Test individual services
                service_tests = [
                    ('api_gateway', lambda: self.service_tester.test_service_if_running('api_gateway', session)),
                    ('dashboard', lambda: self.service_tester.test_service_if_running('dashboard', session)),
                    ('babylon_3d', lambda: self.service_tester.test_service_if_running('babylon_3d', session))
                ]
                
                service_results = []
                for service_name, test_func in service_tests:
                    try:
                        result = await test_func()
                        service_results.append(result)
                    except Exception as e:
                        print(f"❌ Service test failed: {e}")
                        service_results.append(False)
                
                # Test API Gateway endpoints
                await self.service_tester.test_api_gateway_if_running(session)
        else:
            print(f"\n⏸️  Service Tests: No services running (skipped)")
        
        # Combine results
        self.test_results.update(self.component_tester.test_results)
        self.test_results.update(self.service_tester.test_results)
        
        return self.generate_report()
    
    def generate_report(self) -> bool:
        """Generate comprehensive test report"""
        print("\n" + "=" * 50)
        print("📊 INTEGRATION TEST REPORT")
        print("=" * 50)
        
        passed = 0
        failed = 0
        skipped = 0
        total = len(self.test_results)
        
        for test_name, result in self.test_results.items():
            status = result['status']
            if status == 'PASS':
                passed += 1
                icon = "✅"
            elif status == 'SKIP':
                skipped += 1
                icon = "⏭️ "
            else:
                failed += 1
                icon = "❌"
            
            display_name = test_name.replace('_', ' ').title()
            print(f"{icon} {display_name}: {status}")
            
            # Show additional details for passed tests
            if status == 'PASS':
                for key, value in result.items():
                    if key not in ['status'] and not isinstance(value, (dict, list)):
                        print(f"   • {key}: {value}")
            elif status == 'FAIL':
                error = result.get('error', 'Unknown error')
                print(f"   • Error: {error}")
            elif status == 'SKIP':
                reason = result.get('reason', 'Unknown reason')
                print(f"   • Reason: {reason}")
        
        print(f"\n📈 Summary: {passed} passed, {failed} failed, {skipped} skipped ({total} total)")
        
        # Determine overall success
        if failed == 0:
            if passed >= 5:  # At least 5 component tests should pass
                print("🎉 Integration test successful! Architecture is properly configured.")
                return True
            else:
                print("⚠️  Integration test partially successful. Some components need attention.")
                return False
        else:
            print("❌ Integration test failed. Please address the errors above.")
            return False

async def main():
    """Main test runner"""
    tester = IntegrationTester()
    
    try:
        success = await tester.run_tests()
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
