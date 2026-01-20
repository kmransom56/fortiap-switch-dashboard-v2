# Quick Start Script for Network Topology
# This script will set up and launch your network topology viewer

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Network Topology Quick Start                   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$projectDir = "C:\Users\Keith Ransom\CascadeProjects\fortiap-switch-dashboard"

# Check if we're in the right directory
if (-not (Test-Path $projectDir)) {
    
    Write-Host "❌ Project directory not found: $projectDir" -ForegroundColor Red
    Write-Host "Please update the path in this script" -ForegroundColor Yellow
    exit 1
}

Set-Location $projectDir

# Step 1: Check for required files
Write-Host "📋 Step 1: Checking required files..." -ForegroundColor Yellow

$requiredFiles = @(
    "topology-standalone.html",
    "test-topology-server.js",
    "network-topology.js"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
        Write-Host "   ❌ Missing: $file" -ForegroundColor Red
    } else {
        Write-Host "   ✅ Found: $file" -ForegroundColor Green
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Some files are missing. Please download them from the chat." -ForegroundColor Yellow
    Write-Host "   Missing files: $($missingFiles -join ', ')" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check if icons exist
Write-Host ""
Write-Host "📋 Step 2: Checking for network icons..." -ForegroundColor Yellow

if (Test-Path "drawio\fortinet_icons") {
    $iconCount = (Get-ChildItem "drawio\fortinet_icons" -Filter "*.svg").Count
    if ($iconCount -gt 0) {
        Write-Host "   ✅ Found $iconCount SVG icons" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No icons found. Run VSS converter to generate icons." -ForegroundColor Yellow
        Write-Host "      python drawio/vss-to-svg-converter.py --batch drawio/fortinet_visio drawio/fortinet_icons" -ForegroundColor Gray
    }
} else {
    Write-Host "   ℹ️  Icons directory not found. You can generate icons later." -ForegroundColor Cyan
}

# Step 3: Check if Node.js is installed
Write-Host ""
Write-Host "📋 Step 3: Checking Node.js..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js not found" -ForegroundColor Red
    Write-Host "   Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Step 4: Start the server
Write-Host ""
Write-Host "🚀 Step 4: Starting test server..." -ForegroundColor Yellow
Write-Host ""

# Kill any existing node processes on port 3000
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "   Stopping existing server on port 3000..." -ForegroundColor Yellow
    Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Start the server in background
Write-Host "   Starting server..." -ForegroundColor Cyan
$job = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    node test-topology-server.js
} -ArgumentList $projectDir

# Wait a moment for server to start
Start-Sleep -Seconds 2

# Check if server is running
$serverRunning = $false
for ($i = 0; $i -lt 5; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction SilentlyContinue
        $serverRunning = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

if ($serverRunning) {
    Write-Host "   ✅ Server is running!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Server may not have started correctly" -ForegroundColor Yellow
    Write-Host "   Check for errors below:" -ForegroundColor Yellow
    Receive-Job $job
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              🎉 Ready to View!                   ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 Opening topology viewer..." -ForegroundColor Cyan
Write-Host "     URL: http://localhost:3000/topology-standalone.html" -ForegroundColor Gray
Write-Host ""
Write-Host "  📝 Tips:" -ForegroundColor Yellow
Write-Host "     • Drag nodes to rearrange" -ForegroundColor Gray
Write-Host "     • Click nodes to see details" -ForegroundColor Gray
Write-Host "     • Use 'Fit to Screen' to zoom to all nodes" -ForegroundColor Gray
Write-Host "     • Use 'Reset Layout' to rearrange nodes" -ForegroundColor Gray
Write-Host ""
Write-Host "  ⏹️  To stop the server:" -ForegroundColor Yellow
Write-Host "     Stop-Job $($job.Id)" -ForegroundColor Gray
Write-Host "     Or close this PowerShell window" -ForegroundColor Gray
Write-Host ""

# Open browser
Start-Sleep -Seconds 1
Start-Process "http://localhost:3000/topology-standalone.html"

# Keep script running and show server logs
Write-Host "  📊 Server logs (press Ctrl+C to stop):" -ForegroundColor Cyan
Write-Host "  " + ("─" * 50) -ForegroundColor DarkGray

while ($true) {
    $output = Receive-Job $job
    if ($output) {
        Write-Host $output
    }
    
    Start-Sleep -Seconds 1
    
    # Check if job is still running
    if ((Get-Job $job.Id).State -ne "Running") {
        Write-Host ""
        Write-Host "  ⚠️  Server stopped" -ForegroundColor Yellow
        break
    }
}

# Cleanup
Remove-Job $job -Force
