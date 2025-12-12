@echo off
REM Unified FortiAP/Switch Dashboard Integration Script for Windows
REM Connects existing projects with shared architecture

setlocal enabledelayedexpansion

echo 🚀 Setting up Unified FortiAP/Switch Dashboard...

REM Colors for output (Windows compatible)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Logging function
:log
echo %BLUE%[%date% %time%]%NC %~1
goto :eof

:error
echo %RED%[ERROR]%NC %~1
goto :eof

:success
echo %GREEN%[SUCCESS]%NC %~1
goto :eof

:warning
echo %YELLOW%[WARNING]%NC %~1
goto :eof

REM Check prerequisites
call :log "Checking prerequisites..."

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    call :error "Node.js is not installed. Please install Node.js 14+"
    pause
    exit /b 1
)

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    call :error "Python 3 is not installed. Please install Python 3.7+"
    pause
    exit /b 1
)

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    call :error "npm is not installed"
    pause
    exit /b 1
)

call :success "Prerequisites check completed"

REM Setup shared configuration
call :log "Setting up shared configuration..."

if not exist "shared\.env" (
    copy "shared\.env.example" "shared\.env" >nul
    call :success "Created shared\.env from template"
    call :warning "Please edit shared\.env with your FortiGate credentials"
) else (
    call :log "shared\.env already exists"
)

REM Create necessary directories
if not exist "logs" mkdir logs
if not exist "cache" mkdir cache
if not exist "data" mkdir data
call :success "Created necessary directories"

REM Install Node.js dependencies
call :log "Installing Node.js dependencies..."

if exist "package-unified.json" (
    copy "package-unified.json" "package.json" >nul
    npm install
    if errorlevel 1 (
        call :error "Failed to install Node.js dependencies"
        pause
        exit /b 1
    )
    call :success "Node.js dependencies installed"
) else (
    call :error "package-unified.json not found"
    pause
    exit /b 1
)

REM Install Python dependencies
call :log "Installing Python dependencies..."

if exist "babylon_3d\requirements.txt" (
    cd babylon_3d
    pip install -r requirements.txt
    if errorlevel 1 (
        call :error "Failed to install Python dependencies"
        cd ..
        pause
        exit /b 1
    )
    cd ..
    call :success "Python dependencies installed"
) else (
    call :error "Python requirements file not found"
    pause
    exit /b 1
)

REM Setup 3D model library
call :log "Setting up 3D model library..."

if not exist "shared\model-registry.json" (
    echo {} > "shared\model-registry.json"
    call :success "Created model registry"
)

if exist "babylon_3d\babylon_app\network-visualizer\assets\models" (
    dir /b "babylon_3d\babylon_app\network-visualizer\assets\models\*.glb" >nul 2>&1
    if errorlevel 1 (
        call :warning "No 3D models found. Please run model generation script"
    ) else (
        for /f %%i in ('dir /b "babylon_3d\babylon_app\network-visualizer\assets\models\*.glb" 2^>nul ^| find /c /v ""') do set model_count=%%i
        call :success "Found !model_count! 3D models"
    )
) else (
    call :warning "3D models directory not found"
)

REM Validate configuration
call :log "Validating configuration..."

if exist "shared\.env" (
    call :success "Configuration file exists"
    call :warning "Please verify FortiGate credentials in shared\.env"
)

call :success "Configuration validation completed"

REM Create startup scripts
call :log "Creating startup scripts..."

REM Development startup script
echo @echo off > start-dev.bat
echo echo 🚀 Starting Unified Dashboard in Development Mode... >> start-dev.bat
echo. >> start-dev.bat
echo echo Starting API Gateway on port 13001... >> start-dev.bat
echo start "API Gateway" cmd /k "node shared\api-gateway.js" >> start-dev.bat
echo. >> start-dev.bat
echo echo Starting Main Dashboard on port 13000... >> start-dev.bat
echo start "Main Dashboard" cmd /k "node server.js" >> start-dev.bat
echo. >> start-dev.bat
echo echo Starting Babylon 3D on port 3001... >> start-dev.bat
echo start "Babylon 3D" cmd /k "cd babylon_3d\babylon_app && node server.js" >> start-dev.bat
echo. >> start-dev.bat
echo echo All services started! >> start-dev.bat
echo echo API Gateway: http://localhost:13001 >> start-dev.bat
echo echo Main Dashboard: http://localhost:13000 >> start-dev.bat
echo echo Babylon 3D: http://localhost:3001 >> start-dev.bat
echo. >> start-dev.bat
echo pause >> start-dev.bat

REM Production startup script
echo @echo off > start-prod.bat
echo echo 🚀 Starting Unified Dashboard in Production Mode... >> start-prod.bat
echo set NODE_ENV=production >> start-prod.bat
echo. >> start-prod.bat
echo echo Starting services in background... >> start-prod.bat
echo start /B node shared\api-gateway.js >> start-prod.bat
echo start /B node server.js >> start-prod.bat
echo start /B cmd /c "cd babylon_3d\babylon_app && node server.js" >> start-prod.bat
echo. >> start-prod.bat
echo echo Services started in background >> start-prod.bat
echo echo API Gateway: http://localhost:13001 >> start-prod.bat
echo echo Main Dashboard: http://localhost:13000 >> start-prod.bat
echo echo Babylon 3D: http://localhost:3001 >> start-prod.bat
echo. >> start-prod.bat
echo pause >> start-prod.bat

REM Test script
echo @echo off > test-integration.bat
echo echo 🧪 Running Integration Tests... >> test-integration.bat
echo python test-integration.py >> test-integration.bat
echo. >> test-integration.bat
echo echo Press any key to exit... >> test-integration.bat
echo pause >> test-integration.bat

call :success "Startup scripts created"

REM Test services briefly
call :log "Testing services..."

echo Testing API Gateway...
timeout /t 3 /nobreak >nul
start /B cmd /c "node shared\api-gateway.js >nul 2>&1"
timeout /t 5 /nobreak >nul

curl -s http://localhost:13001/health >nul 2>&1
if errorlevel 1 (
    call :warning "API Gateway may need configuration"
) else (
    call :success "API Gateway is responding"
)

taskkill /f /im node.exe >nul 2>&1

echo.
echo %GREEN%🎉 Unified Dashboard Integration Complete!%NC%
echo.
echo 📋 Next Steps:
echo 1. Edit shared\.env with your FortiGate credentials
echo 2. Run 'start-dev.bat' for development
echo 3. Run 'start-prod.bat' for production
echo 4. Run 'test-integration.bat' to test integration
echo.
echo 🌐 Access Points:
echo - Combined Dashboard: http://localhost:13001
echo - Original Dashboard: http://localhost:13000
echo - Babylon 3D: http://localhost:3001
echo.
echo 📚 Documentation: Check shared\README.md for detailed information
echo.
pause
