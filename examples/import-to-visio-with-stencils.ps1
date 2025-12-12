# Import Network Topology to Visio with Fortinet Stencils
# This script automatically uses official Fortinet stencils for devices

param(
    [string]$JsonFile = "visio-topology.json",
    [string]$OutputFile = "FortiGate-Network-Diagram.vsdx",
    [string]$StencilPath = ".\shared\fortinet"
)

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "  FortiGate Network Topology Import to Visio" -ForegroundColor Cyan
Write-Host "  With Official Fortinet Stencils" -ForegroundColor Cyan
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

# Load Fortinet Stencils
Write-Host "`n✓ Loading Fortinet stencils..." -ForegroundColor Green
$Stencils = @{}
$StencilFiles = @{
    "FortiGate" = "FortiGate_Series_R22_2025Q2.vss"
    "FortiSwitch" = "FortiSwitch_Series_R14_2025Q2.vss"
    "FortiAP" = "FortiAP Series_R8_2025Q2.vss"
    "Icons" = "Fortinet_Icons_new_R2_2025Q2.vss"
    "Accessories" = "Fortinet_Accessories_and_Other Products_R4_2021Q3.vss"
}

foreach ($key in $StencilFiles.Keys) {
    $stencilFile = Join-Path $StencilPath $StencilFiles[$key]
    if (Test-Path $stencilFile) {
        try {
            $Stencils[$key] = $Visio.Documents.OpenEx($stencilFile, 4)
            Write-Host "  ✓ Loaded: $($StencilFiles[$key])" -ForegroundColor Gray
        } catch {
            Write-Host "  ⚠ Could not load: $($StencilFiles[$key])" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠ Not found: $stencilFile" -ForegroundColor Yellow
    }
}

if ($Stencils.Count -eq 0) {
    Write-Host "`n✗ No Fortinet stencils found in: $StencilPath" -ForegroundColor Red
    Write-Host "  Falling back to basic shapes" -ForegroundColor Yellow
}

# Device to stencil master mapping
$DeviceMapping = @{
    # FortiGate models
    "FortiGate-40F" = @{Stencil="FortiGate"; Master="FortiGate 40F"}
    "FortiGate-60F" = @{Stencil="FortiGate"; Master="FortiGate 60F"}
    "FortiGate-61E" = @{Stencil="FortiGate"; Master="FortiGate 60E/61E"}
    "FortiGate-61F" = @{Stencil="FortiGate"; Master="FortiGate 60F/61F"}
    "FortiGate-80F" = @{Stencil="FortiGate"; Master="FortiGate 80F/81F"}
    "FortiGate-100F" = @{Stencil="FortiGate"; Master="FortiGate 100F/101F"}
    "FortiGate" = @{Stencil="FortiGate"; Master="FortiGate"}
    
    # FortiSwitch models
    "FortiSwitch-124E" = @{Stencil="FortiSwitch"; Master="FortiSwitch 124E"}
    "FortiSwitch-124F" = @{Stencil="FortiSwitch"; Master="FortiSwitch 124F"}
    "FortiSwitch-224E" = @{Stencil="FortiSwitch"; Master="FortiSwitch 224E"}
    "FortiSwitch-248E" = @{Stencil="FortiSwitch"; Master="FortiSwitch 248E"}
    "FortiSwitch-424E" = @{Stencil="FortiSwitch"; Master="FortiSwitch 424E"}
    "FortiSwitch-448E" = @{Stencil="FortiSwitch"; Master="FortiSwitch 448E"}
    "FortiSwitch-524D" = @{Stencil="FortiSwitch"; Master="FortiSwitch 524D"}
    "FortiSwitch" = @{Stencil="FortiSwitch"; Master="FortiSwitch"}
    
    # FortiAP models  
    "FortiAP-221E" = @{Stencil="FortiAP"; Master="FortiAP 221E"}
    "FortiAP-231F" = @{Stencil="FortiAP"; Master="FortiAP 231F"}
    "FortiAP-231G" = @{Stencil="FortiAP"; Master="FortiAP 231G"}
    "FortiAP-234F" = @{Stencil="FortiAP"; Master="FortiAP 234F"}
    "FortiAP-431F" = @{Stencil="FortiAP"; Master="FortiAP 431F"}
    "FortiAP-431G" = @{Stencil="FortiAP"; Master="FortiAP 431G"}
    "FP231F" = @{Stencil="FortiAP"; Master="FortiAP 231F"}
    "FortiAP" = @{Stencil="FortiAP"; Master="FortiAP"}
    
    # Generic endpoints from Icons stencil
    "Desktop" = @{Stencil="Icons"; Master="Desktop Computer"}
    "Laptop" = @{Stencil="Icons"; Master="Laptop"}
    "Server" = @{Stencil="Icons"; Master="Server"}
    "Printer" = @{Stencil="Icons"; Master="Printer"}
    "Phone" = @{Stencil="Icons"; Master="IP Phone"}
    "Camera" = @{Stencil="Icons"; Master="IP Camera"}
    "Mobile" = @{Stencil="Icons"; Master="Mobile Device"}
}

# Function to get master shape from stencil
function Get-MasterShape {
    param(
        [string]$DeviceModel,
        [string]$DeviceType
    )
    
    # Try exact model match first
    if ($DeviceMapping.ContainsKey($DeviceModel)) {
        $mapping = $DeviceMapping[$DeviceModel]
        if ($Stencils.ContainsKey($mapping.Stencil)) {
            try {
                $master = $Stencils[$mapping.Stencil].Masters.Item($mapping.Master)
                return $master
            } catch {
                Write-Host "  ⚠ Master not found: $($mapping.Master) in $($mapping.Stencil)" -ForegroundColor Yellow
            }
        }
    }
    
    # Try generic type match
    $genericModel = switch ($DeviceType) {
        "FortiGate" { "FortiGate" }
        "FortiSwitch" { "FortiSwitch" }
        "FortiAP" { "FortiAP" }
        default { $null }
    }
    
    if ($genericModel -and $DeviceMapping.ContainsKey($genericModel)) {
        $mapping = $DeviceMapping[$genericModel]
        if ($Stencils.ContainsKey($mapping.Stencil)) {
            try {
                # Get first master from stencil
                $master = $Stencils[$mapping.Stencil].Masters.Item(1)
                return $master
            } catch {
                Write-Host "  ⚠ Could not get master from $($mapping.Stencil)" -ForegroundColor Yellow
            }
        }
    }
    
    return $null
}

# Function to create shape with fallback
function New-DeviceShape {
    param(
        $Page,
        $X,
        $Y,
        $DeviceModel,
        $DeviceType,
        $Text,
        $FallbackColor = "RGB(200,200,200)"
    )
    
    # Try to use stencil master
    $master = Get-MasterShape -DeviceModel $DeviceModel -DeviceType $DeviceType
    
    if ($master) {
        # Drop master shape at position
        $shape = $Page.Drop($master, $X, $Y)
        Write-Host "    ✓ Used stencil shape: $($master.Name)" -ForegroundColor Gray
    } else {
        # Fallback to basic rectangle
        $shape = $Page.DrawRectangle($X - 0.75, $Y - 0.5, $X + 0.75, $Y + 0.5)
        $shape.CellsU("FillForegnd").FormulaU = $FallbackColor
        $shape.CellsU("LineWeight").FormulaU = "2 pt"
        Write-Host "    ⚠ Using basic shape (stencil not available)" -ForegroundColor Yellow
    }
    
    # Add text label below shape
    try {
        # Get shape dimensions
        $shapeHeight = [double]$shape.CellsU("Height").ResultIU
        $shapeWidth = [double]$shape.CellsU("Width").ResultIU
        
        # Create text box below shape
        $textBox = $Page.DrawRectangle(
            $X - ($shapeWidth / 2),
            $Y - $shapeHeight - 0.5,
            $X + ($shapeWidth / 2),
            $Y - $shapeHeight
        )
        $textBox.Text = $Text
        $textBox.CellsU("FillForegnd").FormulaU = "RGB(255,255,255)"
        $textBox.CellsU("LineWeight").FormulaU = "0 pt"
        $textBox.CellsU("Char.Size").FormulaU = "9 pt"
        $textBox.CellsU("Char.Style").FormulaU = "1"  # Bold
        $textBox.CellsU("Para.HorzAlign").FormulaU = "1"  # Center
    } catch {
        # Fallback to shape text if text box fails
        $shape.Text = $Text
        $shape.CellsU("Char.Size").FormulaU = "8 pt"
    }
    
    return $shape
}

# Shape dimensions and layout
$PageWidth = 11
$PageHeight = 8.5
$StartY = $PageHeight - 1.5
$VerticalSpacing = 2.5
$HorizontalSpacing = 2.5

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

Write-Host "`n✓ Creating network diagram with Fortinet shapes..." -ForegroundColor Green

# Create FortiGate shape
Write-Host "`n  Creating FortiGate: $($Topology.fortigate.hostname)" -ForegroundColor White
$FortiGateShape = New-DeviceShape -Page $Page -X $FortiGateX -Y $FortiGateY `
    -DeviceModel $Topology.fortigate.model `
    -DeviceType "FortiGate" `
    -Text "$($Topology.fortigate.hostname)`n$($Topology.fortigate.ip)" `
    -FallbackColor "RGB(220,100,100)"

# Create switch shapes
$SwitchShapes = @()
$CurrentX = $SwitchStartX
foreach ($Switch in $Topology.switches) {
    Write-Host "`n  Creating Switch: $($Switch.name)" -ForegroundColor White
    $SwitchShape = New-DeviceShape -Page $Page -X $CurrentX -Y $SwitchY `
        -DeviceModel $Switch.model `
        -DeviceType "FortiSwitch" `
        -Text "$($Switch.name)`n$($Switch.ip_address)`n$($Switch.ports_up)/$($Switch.ports_total) ports" `
        -FallbackColor "RGB(100,150,220)"
    $SwitchShapes += $SwitchShape
    $CurrentX += $HorizontalSpacing
}

# Create AP shapes
$APShapes = @()
$CurrentX = $APStartX
foreach ($AP in $Topology.aps) {
    Write-Host "`n  Creating AP: $($AP.name)" -ForegroundColor White
    $APShape = New-DeviceShape -Page $Page -X $CurrentX -Y $APY `
        -DeviceModel $AP.model `
        -DeviceType "FortiAP" `
        -Text "$($AP.name)`n$($AP.ip_address)`n$($AP.clients_connected) clients" `
        -FallbackColor "RGB(100,220,150)"
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
    try {
        $Connector.CellsU("BeginX").GlueTo($FortiGateShape.CellsU("PinX"))
        $Connector.CellsU("EndX").GlueTo($SwitchShape.CellsU("PinX"))
        Write-Host "  • Connected FortiGate → Switch" -ForegroundColor Gray
    } catch {
        Write-Host "  ⚠ Connection warning: $($_.Exception.Message)" -ForegroundColor Yellow
    }
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
            try {
                $Connector.CellsU("BeginX").GlueTo($SwitchShape.CellsU("PinX"))
                $Connector.CellsU("EndX").GlueTo($APShape.CellsU("PinX"))
                Write-Host "  • Connected Switch → AP" -ForegroundColor Gray
            } catch {
                Write-Host "  ⚠ Connection warning" -ForegroundColor Yellow
            }
            
            $APIndex++
        }
    }
}

# Add title
Write-Host "`n✓ Adding diagram title and metadata..." -ForegroundColor Green
$TitleShape = $Page.DrawRectangle(0.5, $PageHeight - 0.3, 5, $PageHeight - 0.1)
$TitleShape.Text = "FortiGate Network Topology - $($Topology.fortigate.hostname)"
$TitleShape.CellsU("FillForegnd").FormulaU = "RGB(255,255,255)"
$TitleShape.CellsU("LineWeight").FormulaU = "0 pt"
$TitleShape.CellsU("Char.Size").FormulaU = "14 pt"
$TitleShape.CellsU("Char.Style").FormulaU = "1"  # Bold

# Add metadata
$InfoY = $PageHeight - 0.6
$InfoX = 6.5
$InfoSpacing = 0.2

$InfoTexts = @(
    "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
    "FortiGate: $($Topology.fortigate.hostname)",
    "Total Devices: $(1 + $Topology.switches.Count + $Topology.aps.Count)",
    "Wired Clients: $($Topology.totals.wired_clients)",
    "Wireless Clients: $($Topology.totals.wireless_clients)"
)

foreach ($InfoText in $InfoTexts) {
    $InfoLabel = $Page.DrawRectangle($InfoX, $InfoY - 0.15, $InfoX + 3.5, $InfoY)
    $InfoLabel.Text = $InfoText
    $InfoLabel.CellsU("FillForegnd").FormulaU = "RGB(255,255,255)"
    $InfoLabel.CellsU("LineWeight").FormulaU = "0 pt"
    $InfoLabel.CellsU("Char.Size").FormulaU = "9 pt"
    
    $InfoY -= $InfoSpacing
}

# Add Fortinet logo/branding if available
if ($Stencils.ContainsKey("Icons")) {
    try {
        $logoMaster = $Stencils["Icons"].Masters.Item("Fortinet Logo")
        $logoShape = $Page.Drop($logoMaster, 0.8, 0.6)
        Write-Host "  ✓ Added Fortinet logo" -ForegroundColor Gray
    } catch {
        # Logo not available, skip
    }
}

# Save document
Write-Host "`n✓ Saving document: $OutputFile" -ForegroundColor Green
$FullPath = Join-Path (Get-Location) $OutputFile
$Document.SaveAs($FullPath)

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "✅ Success! Network diagram created with Fortinet stencils" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "`nFile saved to: $FullPath" -ForegroundColor White
Write-Host "`nStencils used:" -ForegroundColor Yellow
foreach ($key in $Stencils.Keys) {
    Write-Host "  • $key - $($StencilFiles[$key])" -ForegroundColor Gray
}
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
