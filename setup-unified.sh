#!/bin/bash

# Unified FortiAP/Switch Dashboard Integration Script
# Connects existing projects with shared architecture

set -e

echo "🚀 Setting up Unified FortiAP/Switch Dashboard..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 14+"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is not installed. Please install Python 3.7+"
        exit 1
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        success "Docker is available"
    else
        warning "Docker is not installed. Docker deployment will not be available"
    fi
    
    success "Prerequisites check completed"
}

# Setup shared configuration
setup_shared_config() {
    log "Setting up shared configuration..."
    
    # Copy shared environment template if not exists
    if [ ! -f "shared/.env" ]; then
        cp shared/.env.example shared/.env
        success "Created shared/.env from template"
        warning "Please edit shared/.env with your FortiGate credentials"
    else
        log "shared/.env already exists"
    fi
    
    # Create necessary directories
    mkdir -p logs cache data
    success "Created necessary directories"
}

# Install Node.js dependencies
install_node_dependencies() {
    log "Installing Node.js dependencies..."
    
    if [ -f "package-unified.json" ]; then
        cp package-unified.json package.json
        npm install
        success "Node.js dependencies installed"
    else
        error "package-unified.json not found"
        exit 1
    fi
}

# Install Python dependencies
install_python_dependencies() {
    log "Installing Python dependencies..."
    
    if [ -f "babylon_3d/requirements.txt" ]; then
        cd babylon_3d
        pip3 install -r requirements.txt
        cd ..
        success "Python dependencies installed"
    else
        error "Python requirements file not found"
        exit 1
    fi
}

# Setup 3D model library
setup_model_library() {
    log "Setting up 3D model library..."
    
    # Create model registry if not exists
    if [ ! -f "shared/model-registry.json" ]; then
        echo '{}' > shared/model-registry.json
        success "Created model registry"
    fi
    
    # Check if models exist
    if [ -d "babylon_3d/babylon_app/network-visualizer/assets/models" ]; then
        model_count=$(find babylon_3d/babylon_app/network-visualizer/assets/models -name "*.glb" | wc -l)
        success "Found $model_count 3D models"
    else
        warning "3D models directory not found. Please run model generation script"
    fi
}

# Validate configuration
validate_configuration() {
    log "Validating configuration..."
    
    # Check shared environment
    if [ -f "shared/.env" ]; then
        # Load environment variables
        export $(grep -v '^#' shared/.env | xargs)
        
        # Check required variables
        if [ -z "$FORTIGATE_HOST" ] || [ "$FORTIGATE_HOST" = "your_password_here" ]; then
            warning "FORTIGATE_HOST not configured in shared/.env"
        fi
        
        if [ -z "$FORTIGATE_USERNAME" ]; then
            warning "FORTIGATE_USERNAME not configured in shared/.env"
        fi
        
        if [ -z "$FORTIGATE_PASSWORD" ] || [ "$FORTIGATE_PASSWORD" = "your_password_here" ]; then
            warning "FORTIGATE_PASSWORD not configured in shared/.env"
        fi
    fi
    
    success "Configuration validation completed"
}

# Test services
test_services() {
    log "Testing services..."
    
    # Test Node.js API Gateway
    log "Starting API Gateway for testing..."
    timeout 10s node shared/api-gateway.js &
    API_PID=$!
    sleep 3
    
    if curl -s http://localhost:13001/health > /dev/null; then
        success "API Gateway is responding"
        kill $API_PID 2>/dev/null || true
    else
        error "API Gateway failed to start"
        kill $API_PID 2>/dev/null || true
    fi
    
    # Test Python discovery service
    log "Testing Python discovery service..."
    cd babylon_3d
    timeout 5s python3 run_fortigate_discovery.py --config > /dev/null 2>&1 && \
        success "Python discovery service is working" || \
        warning "Python discovery service may have configuration issues"
    cd ..
}

# Create startup scripts
create_startup_scripts() {
    log "Creating startup scripts..."
    
    # Development startup script
    cat > start-dev.sh << 'EOF'
#!/bin/bash
# Development startup script
echo "🚀 Starting Unified Dashboard in Development Mode..."

# Start API Gateway
echo "Starting API Gateway on port 13001..."
node shared/api-gateway.js &
API_PID=$!

# Start Main Dashboard
echo "Starting Main Dashboard on port 13000..."
node server.js &
DASHBOARD_PID=$!

# Start Babylon 3D
echo "Starting Babylon 3D on port 3001..."
cd babylon_3d/babylon_app && node server.js &
BABYLON_PID=$!

echo "All services started!"
echo "API Gateway: http://localhost:13001"
echo "Main Dashboard: http://localhost:13000"
echo "Babylon 3D: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo "Stopping services..."; kill $API_PID $DASHBOARD_PID $BABYLON_PID 2>/dev/null; exit' INT
wait
EOF

    # Production startup script
    cat > start-prod.sh << 'EOF'
#!/bin/bash
# Production startup script
echo "🚀 Starting Unified Dashboard in Production Mode..."

export NODE_ENV=production

# Start with PM2 if available, otherwise with node
if command -v pm2 &> /dev/null; then
    echo "Starting with PM2..."
    pm2 start shared/api-gateway.js --name "api-gateway"
    pm2 start server.js --name "main-dashboard"
    pm2 start babylon_3d/babylon_app/server.js --name "babylon-3d"
    echo "Services started with PM2"
    echo "Check status with: pm2 status"
else
    echo "Starting with node..."
    node shared/api-gateway.js &
    API_PID=$!
    node server.js &
    DASHBOARD_PID=$!
    cd babylon_3d/babylon_app && node server.js &
    BABYLON_PID=$!
    
    echo "Services started in background"
    echo "API Gateway: http://localhost:13001"
    echo "Main Dashboard: http://localhost:13000"
    echo "Babylon 3D: http://localhost:3001"
fi
EOF

    # Docker startup script
    cat > start-docker.sh << 'EOF'
#!/bin/bash
# Docker startup script
echo "🐳 Starting Unified Dashboard with Docker..."

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

echo "Services started with Docker"
echo "Check status with: docker-compose ps"
echo "View logs with: docker-compose logs -f"
EOF

    # Make scripts executable
    chmod +x start-dev.sh start-prod.sh start-docker.sh
    
    success "Startup scripts created"
}

# Main installation function
main() {
    log "Starting Unified Dashboard Integration..."
    
    check_prerequisites
    setup_shared_config
    install_node_dependencies
    install_python_dependencies
    setup_model_library
    validate_configuration
    test_services
    create_startup_scripts
    
    echo ""
    success "🎉 Unified Dashboard Integration Complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Edit shared/.env with your FortiGate credentials"
    echo "2. Run './start-dev.sh' for development"
    echo "3. Run './start-prod.sh' for production"
    echo "4. Run './start-docker.sh' for Docker deployment"
    echo ""
    echo "🌐 Access Points:"
    echo "- Combined Dashboard: http://localhost:13001"
    echo "- Original Dashboard: http://localhost:13000"
    echo "- Babylon 3D: http://localhost:3001"
    echo ""
    echo "📚 Documentation: Check shared/README.md for detailed information"
}

# Run main function
main "$@"
