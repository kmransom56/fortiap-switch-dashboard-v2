#!/bin/bash
#
# Run pytest tests for FortiGate Dashboard
#
# Usage:
#   ./run_tests.sh                    # Run all tests
#   ./run_tests.sh real_data          # Run only real data tests
#   ./run_tests.sh api                # Run only API tests
#   ./run_tests.sh integration        # Run only integration tests

set -e

cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install dependencies if needed
if ! python3 -c "import pytest" 2>/dev/null; then
    echo "Installing pytest and dependencies..."
    pip install pytest requests python-dotenv --quiet
fi

# Parse arguments
MARKER="${1:-all}"

case "$MARKER" in
    real_data)
        MARKER_ARG="-m real_data"
        ;;
    api)
        MARKER_ARG="-m api"
        ;;
    integration)
        MARKER_ARG="-m integration"
        ;;
    unit)
        MARKER_ARG="-m unit"
        ;;
    all|*)
        MARKER_ARG=""
        ;;
esac

echo "═══════════════════════════════════════════════════════════"
echo "Running pytest tests"
echo "═══════════════════════════════════════════════════════════"
echo "Marker: ${MARKER}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Copy .env.example to .env and configure FortiGate credentials"
    echo ""
fi

# Run tests
python3 -m pytest tests/ $MARKER_ARG -v --tb=short

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Tests complete"
echo "═══════════════════════════════════════════════════════════"
