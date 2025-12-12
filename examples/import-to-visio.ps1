# Import Network Topology to Microsoft Visio
# This script uses Visio COM automation to create a network diagram
# from the exported topology data

param(
    [string]$JsonFile = "visio-topology.json",
    [string]$OutputFile = "FortiGate-Network-Diagram.vsdx",
    [switch]$AutoLayout = $true
)

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "  FortiGate Network Topology Import to Visio" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# Check if Visio is installed
try {
    $Visio = New-Object -ComObject Visio.Application
    Write-Host "✓ Microsoft Visio detected (Version: $($Visio.Version))" -ForegroundColor Green
} catch {
    Write-Host "✗ Microsoft Visio is not installed or cannot be accessed" -ForegroundColor Red
    Write-Host "  Please install Microsoft Visio to use this script" -ForegroundColor Yellow
    exit 1
}

# Load topology JSON
if (-not (Test-Path $JsonFile)) {
    Write-Host "✗ Topology file not found: $JsonFile" -ForegroundColor Red
    Write-Host "  Please run the export script first: node examples/visio-export-example.js" -ForegroundColor Yellow
    $Visio.Quit()
    exit 1
}

Write-Host "✓ Loading topology from: $JsonFile" -ForegroundColor Green
$Topology = Get-Content $JsonFile | ConvertFrom-Json

Write-Host "`nNetwork Overview:" -ForegroundColor Cyan
Write-Host "  FortiGate: $($Topology.fortigate.hostname) ($($Topology.fortigate.ip))"
Write-Host "  Switches: $($Topology.switches.Count)"
Write-Host "  Access Points: $($Topology.aps.Count)"

# Create new Visio document
Write-Host "`n✓ Creating new Visio document..." -ForegroundColor Green
$Visio.Visible = $true
$Document = $Visio.Documents.Add("")
$Page = $Document.Pages.Item(1)
$Page.Name = "Network Topology"

# Try to load network stencil
try {
    # Try different stencil paths
    $StencilPaths = @(
        "NETWRK_M.VSSX",
        "BASIC_M.VSSX", 
        "Network.vss",
        "$($Visio.Path)\Visio\1033\NETWRK_M.VSSX"
    )
    
    $Stencil = $null
    foreach ($path in $StencilPaths) {
        try {
            $Stencil = $Visio.Documents.OpenEx($path, 4)
            Write-Host "✓ Loaded stencil: $path" -ForegroundColor Green
            break
        } catch {
            # Try next path
        }
    }
    
    if ($null -eq $Stencil) {
        Write-Host "⚠ Network stencil not found, using basic shapes" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not load network stencil: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Shape dimensions
$ShapeWidth = 1.5
$ShapeHeight = 1.0
$VerticalSpacing = 2.0
$HorizontalSpacing = 2.5

# Calculate layout positions
$PageWidth = 11
$PageHeight = 8.5
$StartY = $PageHeight - 1

# Position FortiGate at top center
$FortiGateX = $PageWidth / 2
$FortiGateY = $StartY

# Position switches in a row below FortiGate
$SwitchY = $FortiGateY - $VerticalSpacing
$SwitchStartX = if ($Topology.switches.Count -gt 0) {
    ($PageWidth - ($Topology.switches.Count * $HorizontalSpacing)) / 2 + ($HorizontalSpacing / 2)
} else { $PageWidth / 2 }

# Position APs in a row below switches
$APY = $SwitchY - $VerticalSpacing
$APStartX = if ($Topology.aps.Count -gt 0) {
    ($PageWidth - ($Topology.aps.Count * $HorizontalSpacing)) / 2 + ($HorizontalSpacing / 2)
} else { $PageWidth / 2 }

Write-Host "`n✓ Creating network diagram..." -ForegroundColor Green

# Function to create a shape
function New-NetworkShape {
    param(
        $Page,
        $X,
        $Y,
        $Width,
        $Height,
        $Text,
        $FillColor = "RGB(200,200,200)"
    )
    
    # Create rectangle shape
    $Shape = $Page.DrawRectangle($X - $Width/2, $Y - $Height/2, $X + $Width/2, $Y + $Height/2)
    $Shape.Text = $Text
    
    # Apply formatting
    $Shape.CellsU("FillForegnd").FormulaU = $FillColor
    $Shape.CellsU("LineWeight").FormulaU = "2 pt"
    $Shape.CellsU("Char.Size").FormulaU = "10 pt"
    
    return $Shape
}

# Create FortiGate shape
Write-Host "  • Creating FortiGate: $($Topology.fortigate.hostname)" -ForegroundColor White
$FortiGateShape = New-NetworkShape -Page $Page -X $FortiGateX -Y $FortiGateY `
    -Width $ShapeWidth -Height $ShapeHeight `
    -Text "$($Topology.fortigate.hostname)`n$($Topology.fortigate.ip)`n$($Topology.fortigate.model)" `
    -FillColor "RGB(220,100,100)"

# Create switch shapes
$SwitchShapes = @()
$CurrentX = $SwitchStartX
foreach ($Switch in $Topology.switches) {
    Write-Host "  • Creating Switch: $($Switch.name)" -ForegroundColor White
    $SwitchShape = New-NetworkShape -Page $Page -X $CurrentX -Y $SwitchY `
        -Width $ShapeWidth -Height $ShapeHeight `
        -Text "$($Switch.name)`n$($Switch.ip_address)`n$($Switch.model)" `
        -FillColor "RGB(100,150,220)"
    $SwitchShapes += $SwitchShape
    $CurrentX += $HorizontalSpacing
}

# Create AP shapes
$APShapes = @()
$CurrentX = $APStartX
foreach ($AP in $Topology.aps) {
    Write-Host "  • Creating AP: $($AP.name)" -ForegroundColor White
    $APShape = New-NetworkShape -Page $Page -X $CurrentX -Y $APY `
        -Width $ShapeWidth -Height $ShapeHeight `
        -Text "$($AP.name)`n$($AP.ip_address)`nClients: $($AP.clients_connected)" `
        -FillColor "RGB(100,220,150)"
    $APShapes += $APShape
    $CurrentX += $HorizontalSpacing
}

# Connect FortiGate to Switches
Write-Host "`n✓ Creating connections..." -ForegroundColor Green
foreach ($SwitchShape in $SwitchShapes) {
    $Connector = $Page.Drop($Page.Application.ConnectorToolDataObject, 0, 0)
    $Connector.CellsU("LineWeight").FormulaU = "2 pt"
    $Connector.CellsU("LineColor").FormulaU = "RGB(0,0,0)"
    
    # Connect shapes
    $Connector.CellsU("BeginX").GlueTo($FortiGateShape.CellsU("AlignBottom"))
    $Connector.CellsU("EndX").GlueTo($SwitchShape.CellsU("AlignTop"))
    
    Write-Host "  • Connected FortiGate → Switch" -ForegroundColor White
}

# Connect Switches to APs (distribute evenly)
if ($SwitchShapes.Count -gt 0 -and $APShapes.Count -gt 0) {
    $APsPerSwitch = [Math]::Ceiling($APShapes.Count / $SwitchShapes.Count)
    $APIndex = 0
    
    foreach ($SwitchShape in $SwitchShapes) {
        for ($i = 0; $i -lt $APsPerSwitch -and $APIndex -lt $APShapes.Count; $i++) {
            $APShape = $APShapes[$APIndex]
            $Connector = $Page.Drop($Page.Application.ConnectorToolDataObject, 0, 0)
            $Connector.CellsU("LineWeight").FormulaU = "1 pt"
            $Connector.CellsU("LineColor").FormulaU = "RGB(100,100,100)"
            
            # Connect shapes
            $Connector.CellsU("BeginX").GlueTo($SwitchShape.CellsU("AlignBottom"))
            $Connector.CellsU("EndX").GlueTo($APShape.CellsU("AlignTop"))
            
            Write-Host "  • Connected Switch → AP" -ForegroundColor White
            $APIndex++
        }
    }
}

# Add title
Write-Host "`n✓ Adding diagram title..." -ForegroundColor Green
$TitleShape = $Page.DrawRectangle(0.5, $PageHeight - 0.3, 5, $PageHeight - 0.1)
$TitleShape.Text = "FortiGate Network Topology - $($Topology.fortigate.hostname)"
$TitleShape.CellsU("FillForegnd").FormulaU = "RGB(255,255,255)"
$TitleShape.CellsU("LineWeight").FormulaU = "0 pt"
$TitleShape.CellsU("Char.Size").FormulaU = "14 pt"
$TitleShape.CellsU("Char.Style").FormulaU = "1"  # Bold

# Add legend
$LegendY = 0.8
$LegendX = 0.5
$LegendSpacing = 0.3

$LegendTitle = $Page.DrawRectangle($LegendX, $LegendY + 0.1, $LegendX + 2, $LegendY + 0.3)
$LegendTitle.Text = "Legend"
$LegendTitle.CellsU("FillForegnd").FormulaU = "RGB(255,255,255)"
$LegendTitle.CellsU("LineWeight").FormulaU = "0 pt"
$LegendTitle.CellsU("Char.Size").FormulaU = "12 pt"
$LegendTitle.CellsU("Char.Style").FormulaU = "1"

# Legend items
$LegendItems = @(
    @{Text="FortiGate"; Color="RGB(220,100,100)"},
    @{Text="FortiSwitch"; Color="RGB(100,150,220)"},
    @{Text="FortiAP"; Color="RGB(100,220,150)"}
)

foreach ($Item in $LegendItems) {
    $Box = $Page.DrawRectangle($LegendX, $LegendY - 0.15, $LegendX + 0.3, $LegendY)
    $Box.CellsU("FillForegnd").FormulaU = $Item.Color
    $Box.CellsU("LineWeight").FormulaU = "1 pt"
    
    $Label = $Page.DrawRectangle($LegendX + 0.35, $LegendY - 0.15, $LegendX + 1.5, $LegendY)
    $Label.Text = $Item.Text
    $Label.CellsU("FillForegnd").FormulaU = "RGB(255,255,255)"
    $Label.CellsU("LineWeight").FormulaU = "0 pt"
    $Label.CellsU("Char.Size").FormulaU = "10 pt"
    
    $LegendY -= $LegendSpacing
}

# Add metadata
$InfoY = $PageHeight - 0.6
$InfoX = 6
$InfoSpacing = 0.2

$InfoTexts = @(
    "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
    "Total Devices: $(1 + $Topology.switches.Count + $Topology.aps.Count)",
    "Wired Clients: $($Topology.totals.wired_clients)",
    "Wireless Clients: $($Topology.totals.wireless_clients)"
)

foreach ($InfoText in $InfoTexts) {
    $InfoLabel = $Page.DrawRectangle($InfoX, $InfoY - 0.15, $InfoX + 3, $InfoY)
    $InfoLabel.Text = $InfoText
    $InfoLabel.CellsU("FillForegnd").FormulaU = "RGB(255,255,255)"
    $InfoLabel.CellsU("LineWeight").FormulaU = "0 pt"
    $InfoLabel.CellsU("Char.Size").FormulaU = "9 pt"
    
    $InfoY -= $InfoSpacing
}

# Save document
Write-Host "`n✓ Saving document: $OutputFile" -ForegroundColor Green
$FullPath = Join-Path (Get-Location) $OutputFile
$Document.SaveAs($FullPath)

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "✅ Success! Network diagram created in Visio" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "`nFile saved to: $FullPath" -ForegroundColor White
Write-Host "`nThe Visio application is still open for you to review and edit." -ForegroundColor Yellow
Write-Host "Close Visio when you're done, or press Ctrl+C to close it now.`n" -ForegroundColor Yellow

# Keep script running until user closes Visio
try {
    while ($Visio.Documents.Count -gt 0) {
        Start-Sleep -Seconds 2
    }
} catch {
    # Visio was closed
}

Write-Host "✓ Visio closed. Script complete.`n" -ForegroundColor Green
