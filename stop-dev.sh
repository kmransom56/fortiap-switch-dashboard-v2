#!/bin/bash
# Stop all development services for FortiAP/Switch Dashboard

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🛑 Stopping FortiAP/Switch Dashboard Services"
echo "=============================================="

# Read PIDs from file if it exists
if [ -f ".service_pids" ]; then
    PIDS=$(cat .service_pids)
    echo "Stopping services with PIDs: $PIDS"
    kill $PIDS 2>/dev/null || true
    rm .service_pids
fi

# Also try to kill by process name (in case PIDs file is missing)
echo "Stopping processes by name..."
pkill -f "node.*api-gateway" 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "python.*python_api_service" 2>/dev/null || true

# Wait a moment
sleep 1

# Check if any are still running
if pgrep -f "node.*api-gateway" > /dev/null; then
    echo "⚠️  API Gateway still running, force killing..."
    pkill -9 -f "node.*api-gateway"
fi

if pgrep -f "node.*server.js" > /dev/null; then
    echo "⚠️  Dashboard still running, force killing..."
    pkill -9 -f "node.*server.js"
fi

if pgrep -f "python.*python_api_service" > /dev/null; then
    echo "⚠️  Python service still running, force killing..."
    pkill -9 -f "python.*python_api_service"
fi

echo "✅ All services stopped"

