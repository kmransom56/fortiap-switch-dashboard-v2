# Testing Guide for FortiGate Dashboard

This guide explains how to run tests to verify real FortiGate data retrieval and application functionality.

## Test Types

### 1. Real Data Tests (`@pytest.mark.real_data`)

Tests that make actual API calls to FortiGate and verify:
- API connectivity
- Data retrieval
- Data transformation
- Device model extraction
- Icon/layout mapping

**Run:**
```bash
./run_tests.sh real_data
# Or:
source venv/bin/activate
pytest tests/ -m real_data -v
```

### 2. API Tests (`@pytest.mark.api`)

Tests that verify API endpoint functionality:
- FortiGate API endpoints
- Dashboard API endpoints
- Data transformation

**Run:**
```bash
./run_tests.sh api
```

### 3. Integration Tests (`@pytest.mark.integration`)

Tests that require running services (dashboard server):
- End-to-end data flow
- Dashboard API endpoints
- Service integration

**Run:**
```bash
# Start dashboard first:
npm run dashboard

# Then run tests:
./run_tests.sh integration
```

### 4. Unit Tests (`@pytest.mark.unit`)

Tests that don't require external services:
- Data transformation logic
- Model extraction
- Icon mapping

**Run:**
```bash
./run_tests.sh unit
```

## Prerequisites

### 1. Environment Setup

Ensure `.env` file exists with FortiGate credentials:
```bash
cp .env.example .env
# Edit .env with your FortiGate details
```

Required variables:
- `FORTIGATE_HOST` - FortiGate IP address
- `FORTIGATE_PORT` - FortiGate port (default: 443)
- `FORTIGATE_API_TOKEN` - API token for authentication
- `FORTIGATE_VERIFY_SSL` - SSL verification (false for self-signed)

### 2. Install Dependencies

```bash
# Activate virtual environment
source venv/bin/activate

# Install test dependencies
pip install pytest requests python-dotenv
```

## Running Tests

### Quick Test (API Connectivity)

```bash
source venv/bin/activate
pytest tests/test_fortigate_api_real_data.py::TestFortiGateAPIRealData::test_fortigate_api_connectivity -v -s
```

### All Real Data Tests

```bash
./run_tests.sh real_data
```

### All Tests

```bash
./run_tests.sh
# Or:
pytest tests/ -v
```

### Specific Test Class

```bash
pytest tests/test_fortigate_api_real_data.py::TestFortiGateAPIRealData -v
```

### With Output

```bash
pytest tests/ -v -s  # -s shows print statements
```

## Test Coverage

### FortiGate API Tests

- ✅ API connectivity
- ✅ FortiAP data retrieval
- ✅ FortiSwitch data retrieval
- ✅ Topology data endpoints
- ✅ Device model extraction

### Dashboard API Tests

- ✅ Status endpoint
- ✅ FortiAPs endpoint
- ✅ FortiSwitches endpoint
- ✅ Topology endpoint

### Data Transformation Tests

- ✅ FortiAP data transformation
- ✅ FortiSwitch data transformation
- ✅ Model extraction edge cases

### Device Mapping Tests

- ✅ Icon file existence
- ✅ Device model to icon mapping
- ✅ Layout configuration

## Expected Test Results

### Successful Test Run

```
============================= test session starts ==============================
platform linux -- Python 3.12.3, pytest-9.0.2, pluggy-1.6.0
collected 15 items

tests/test_fortigate_api_real_data.py::TestFortiGateAPIRealData::test_fortigate_api_connectivity PASSED
tests/test_fortigate_api_real_data.py::TestFortiGateAPIRealData::test_fortiaps_data_retrieval PASSED
tests/test_fortigate_api_real_data.py::TestFortiGateAPIRealData::test_fortiswitches_data_retrieval PASSED
...

============================= 15 passed in 5.23s ==============================
```

## Troubleshooting

### API Connection Failed

**Error:** `ConnectionError` or `401 Unauthorized`

**Solutions:**
1. Check `.env` file has correct credentials
2. Verify FortiGate API token is valid
3. Check network connectivity to FortiGate
4. Verify SSL settings if using self-signed certificates

### Dashboard Not Running

**Error:** `ConnectionError: Connection refused`

**Solutions:**
1. Start dashboard server: `npm run dashboard`
2. Check port is correct in `.env` (default: 13000)
3. Verify no firewall blocking

### Missing Dependencies

**Error:** `ModuleNotFoundError: No module named 'pytest'`

**Solutions:**
```bash
source venv/bin/activate
pip install pytest requests python-dotenv
```

### Tests Skipped

Some tests may be skipped if:
- No devices found (this is OK - means FortiGate has no APs/switches configured)
- Dashboard server not running (for integration tests)
- Configuration missing

## Continuous Testing

### Watch Mode

```bash
pytest tests/ -v --tb=short -f  # -f runs failed tests first
```

### Coverage Report

```bash
pip install pytest-cov
pytest tests/ --cov=. --cov-report=html
```

## Test Files

- `tests/test_fortigate_api_real_data.py` - Real FortiGate API tests
- `tests/test_data_transformation.py` - Data transformation tests
- `tests/conftest.py` - Pytest configuration and fixtures
- `pytest.ini` - Pytest configuration

## Next Steps

1. **Run real data tests** to verify API connectivity
2. **Check test output** to see actual device models
3. **Verify icon mapping** matches your device models
4. **Run integration tests** with dashboard running
5. **Fix any failing tests** based on your actual FortiGate setup
