#!/bin/bash
# Start all development services for FortiAP/Switch Dashboard

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting FortiAP/Switch Dashboard Services"
echo "=============================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating..."
    python3 -m venv venv
    source venv/bin/activate
    echo "📦 Installing Python dependencies..."
    pip install -r babylon_3d/requirements.txt
    pip install aiohttp-cors
else
    source venv/bin/activate
fi

# Check if .env exists
if [ ! -f "shared/.env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp shared/.env.example shared/.env
    echo "⚠️  Please edit shared/.env with your FortiGate credentials"
fi

# Check Node.js dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo ""
echo "Starting services in background..."
echo ""

# Start API Gateway
echo "🌐 Starting API Gateway on port 13001..."
node shared/api-gateway.js > logs/api-gateway.log 2>&1 &
API_GATEWAY_PID=$!
echo "   PID: $API_GATEWAY_PID"

# Start Dashboard
echo "📊 Starting Dashboard on port 13000..."
node server.js > logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "   PID: $DASHBOARD_PID"

# Start Python Service
echo "🐍 Starting Python API Service on port 13002..."
python3 babylon_3d/python_api_service.py > logs/python-service.log 2>&1 &
PYTHON_SERVICE_PID=$!
echo "   PID: $PYTHON_SERVICE_PID"

# Create logs directory if it doesn't exist
mkdir -p logs

# Wait a moment for services to start
sleep 2

echo ""
echo "✅ Services started!"
echo ""
echo "📋 Service Status:"
echo "   • API Gateway: http://localhost:13001"
echo "   • Dashboard: http://localhost:13000"
echo "   • Python API: http://localhost:13002"
echo ""
echo "📝 Logs:"
echo "   • API Gateway: logs/api-gateway.log"
echo "   • Dashboard: logs/dashboard.log"
echo "   • Python Service: logs/python-service.log"
echo ""
echo "🛑 To stop services:"
echo "   kill $API_GATEWAY_PID $DASHBOARD_PID $PYTHON_SERVICE_PID"
echo ""
echo "Or run: ./stop-dev.sh"

# Save PIDs to file for easy stopping
echo "$API_GATEWAY_PID $DASHBOARD_PID $PYTHON_SERVICE_PID" > .service_pids

echo ""
echo "Waiting for services to be ready..."
sleep 3

# Test services
echo ""
echo "🧪 Testing services..."

if curl -s http://localhost:13001/health > /dev/null 2>&1; then
    echo "   ✅ API Gateway: Running"
else
    echo "   ❌ API Gateway: Not responding"
fi

if curl -s http://localhost:13000/health > /dev/null 2>&1; then
    echo "   ✅ Dashboard: Running"
else
    echo "   ❌ Dashboard: Not responding"
fi

if curl -s http://localhost:13002/topology > /dev/null 2>&1; then
    echo "   ✅ Python Service: Running"
else
    echo "   ⚠️  Python Service: Not responding (may need FortiGate config)"
fi

echo ""
echo "🎉 Setup complete! Open http://localhost:13000 in your browser"

