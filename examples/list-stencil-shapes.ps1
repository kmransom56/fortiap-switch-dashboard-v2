# List all available shapes in Fortinet stencils
# This script helps you discover what device icons are available

param(
    [string]$StencilPath = ".\shared\fortinet",
    [switch]$ExportToFile = $false
)

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "  Fortinet Stencil Shape Browser" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# Check if Visio is installed
try {
    $Visio = New-Object -ComObject Visio.Application
    $Visio.Visible = $false
    Write-Host "✓ Microsoft Visio detected (Version: $($Visio.Version))" -ForegroundColor Green
} catch {
    Write-Host "✗ Microsoft Visio is not installed or cannot be accessed" -ForegroundColor Red
    exit 1
}

# Get all stencil files
$StencilFiles = Get-ChildItem -Path $StencilPath -Filter "*.vss" -ErrorAction SilentlyContinue

if ($StencilFiles.Count -eq 0) {
    Write-Host "✗ No stencil files found in: $StencilPath" -ForegroundColor Red
    $Visio.Quit()
    exit 1
}

Write-Host "`nFound $($StencilFiles.Count) stencil files in: $StencilPath`n" -ForegroundColor Green

$AllShapes = @()

foreach ($stencilFile in $StencilFiles) {
    Write-Host "==================================================================`n" -ForegroundColor Cyan
    Write-Host "Stencil: $($stencilFile.Name)" -ForegroundColor Yellow
    Write-Host "Path: $($stencilFile.FullName)" -ForegroundColor Gray
    Write-Host "Size: $([math]::Round($stencilFile.Length/1KB, 1)) KB`n" -ForegroundColor Gray
    
    try {
        # Open stencil
        $Stencil = $Visio.Documents.OpenEx($stencilFile.FullName, 4)
        
        Write-Host "Available shapes ($($Stencil.Masters.Count)):" -ForegroundColor Cyan
        Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
        
        $shapeNumber = 1
        foreach ($Master in $Stencil.Masters) {
            $shapeName = $Master.Name
            $shapeType = if ($Master.Type -eq 1) { "Master" } else { "Group" }
            
            Write-Host "  $shapeNumber. $shapeName" -ForegroundColor White -NoNewline
            Write-Host " ($shapeType)" -ForegroundColor Gray
            
            # Store for export
            $AllShapes += [PSCustomObject]@{
                Stencil = $stencilFile.Name
                ShapeNumber = $shapeNumber
                ShapeName = $shapeName
                ShapeType = $shapeType
            }
            
            $shapeNumber++
        }
        
        # Close stencil
        $Stencil.Close()
        
        Write-Host ""
        
    } catch {
        Write-Host "  ⚠ Error loading stencil: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Export to CSV if requested
if ($ExportToFile) {
    $outputFile = "fortinet-stencil-shapes.csv"
    $AllShapes | Export-Csv -Path $outputFile -NoTypeInformation
    Write-Host "`n✓ Exported shape list to: $outputFile" -ForegroundColor Green
}

# Close Visio
$Visio.Quit()

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "Total shapes found: $($AllShapes.Count)" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan

Write-Host "`nUsage Tips:" -ForegroundColor Yellow
Write-Host "  • Copy the shape names you want to use" -ForegroundColor Gray
Write-Host "  • Update the DeviceMapping in import-to-visio-with-stencils.ps1" -ForegroundColor Gray
Write-Host "  • Run with -ExportToFile to save complete list to CSV`n" -ForegroundColor Gray

Write-Host "Example:" -ForegroundColor Yellow
Write-Host '  $DeviceMapping["FortiGate-100F"] = @{Stencil="FortiGate"; Master="FortiGate 100F"}' -ForegroundColor Cyan
Write-Host ""
