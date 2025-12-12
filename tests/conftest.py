"""
Pytest configuration and fixtures for FortiGate Dashboard tests
"""
import os
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Project root
PROJECT_ROOT = Path(__file__).parent.parent


@pytest.fixture(scope="session")
def fortigate_config():
    """FortiGate configuration from environment"""
    config = {
        'host': os.getenv('FORTIGATE_HOST'),
        'port': int(os.getenv('FORTIGATE_PORT', 443)),
        'api_token': os.getenv('FORTIGATE_API_TOKEN'),
        'verify_ssl': os.getenv('FORTIGATE_VERIFY_SSL', 'false').lower() == 'true',
        'dashboard_port': int(os.getenv('DASHBOARD_PORT', 13000))
    }
    
    if not config['host'] or not config['api_token']:
        pytest.skip("FortiGate configuration not found in .env file")
    
    return config


@pytest.fixture(scope="session")
def dashboard_url(fortigate_config):
    """Dashboard base URL"""
    return f"http://localhost:{fortigate_config['dashboard_port']}"


@pytest.fixture(scope="session")
def fortigate_api_url(fortigate_config):
    """FortiGate API base URL"""
    protocol = 'https'
    return f"{protocol}://{fortigate_config['host']}:{fortigate_config['port']}/api/v2"


@pytest.fixture(scope="function")
def fortigate_session(fortigate_config):
    """Create authenticated FortiGate API session"""
    session = requests.Session()
    session.verify = fortigate_config['verify_ssl']
    session.headers.update({
        'Authorization': f"Bearer {fortigate_config['api_token']}",
        'Content-Type': 'application/json'
    })
    return session


@pytest.fixture(scope="function")
def dashboard_session():
    """Create dashboard API session"""
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json'
    })
    return session


def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line(
        "markers", "integration: Integration tests requiring running services"
    )
    config.addinivalue_line(
        "markers", "api: Tests making API calls to FortiGate"
    )
    config.addinivalue_line(
        "markers", "real_data: Tests verifying real FortiGate data retrieval"
    )
