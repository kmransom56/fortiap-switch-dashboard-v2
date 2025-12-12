# VSS to SVG Conversion Guide

This guide explains how to convert Visio Stencil (VSS) files to SVG icons for the FortiGate dashboard.

## Overview

You have Fortinet and Meraki VSS files that need to be converted to individual SVG files. The dashboard requires **63 SVG files** total (see `REQUIRED_SVG_FILES.md` for the complete list).

## Required SVG Files Summary

- **3 Default icons**: `real_fortigate.svg`, `real_fortiswitch.svg`, `real_fortiap.svg`
- **18 FortiGate models**: FG-60E through FG-2000G series
- **14 FortiSwitch models**: FS-108E through FS-1048E (including POE variants)
- **28 FortiAP models**: Indoor (221C-433F) and Outdoor (U431F-U464E) models

## Conversion Methods

### Method 1: Using libvisio Tools (Recommended)

**Prerequisites:**
```bash
# Install libvisio-tools
sudo apt-get install libvisio-tools

# OR build from source
cd /home/keransom/libvisio-0.1.9
./autogen.sh
make
sudo make install
```

**Usage:**
```bash
# Convert VSS to XML (to inspect structure)
vsd2raw fortinet.vss fortinet.xml

# If vsd2svg is available (newer versions)
vsd2svg fortinet.vss output.svg

# Use the provided script
./convert-vss-libvisio.sh fortinet.vss textures/
```

### Method 2: Using LibreOffice Draw

LibreOffice can open VSS files and export individual shapes:

```bash
# Open VSS file in LibreOffice Draw
libreoffice --draw fortinet.vss

# Or use headless conversion
libreoffice --headless --convert-to svg --outdir textures/ fortinet.vss
```

**Manual Process:**
1. Open VSS file in LibreOffice Draw
2. Select each shape individually
3. File → Export → Export as SVG
4. Name according to `REQUIRED_SVG_FILES.md`

### Method 3: Using Inkscape

```bash
# If Inkscape supports VSS (may require conversion first)
inkscape fortinet.vss --export-type=svg --export-filename=output.svg
```

### Method 4: Using Visio (Windows/Mac)

If you have Microsoft Visio:
1. Open the VSS file in Visio
2. Right-click each shape → Save as Picture → SVG
3. Name files according to mapping

## Shape Name Mapping

VSS files contain shapes with names that need to be mapped to SVG filenames:

### FortiGate Mapping Examples

| VSS Shape Name | SVG Filename |
|----------------|--------------|
| FortiGate 61E | `fortigate_61e.svg` |
| FG-61E | `fortigate_61e.svg` |
| FortiGate 100F | `fortigate_100f.svg` |

### FortiSwitch Mapping Examples

| VSS Shape Name | SVG Filename |
|----------------|--------------|
| FortiSwitch 124E POE | `fortiswitch_124e_poe.svg` |
| FS-124E-POE | `fortiswitch_124e_poe.svg` |
| FortiSwitch 448E | `fortiswitch_448e.svg` |

### FortiAP Mapping Examples

| VSS Shape Name | SVG Filename |
|----------------|--------------|
| FortiAP 221C | `fortiap_221c.svg` |
| FAP-221C | `fortiap_221c.svg` |
| FortiAP U431F | `fortiap_u431f.svg` |

**Naming Rules:**
- Convert to lowercase
- Replace spaces and hyphens with underscores
- Remove "FortiGate", "FortiSwitch", "FortiAP" prefixes
- Keep model numbers and letters (e.g., "61E" → "61e")

## Automated Conversion Script

Use the provided Python script to help with conversion:

```bash
# List shapes in VSS file
python3 convert-vss-to-svg.py --vss-file fortinet.vss --list-shapes

# Convert (dry run)
python3 convert-vss-to-svg.py --vss-file fortinet.vss --output-dir textures/ --dry-run

# Convert
python3 convert-vss-to-svg.py --vss-file fortinet.vss --output-dir textures/ --device-type fortigate
```

## Step-by-Step Conversion Process

### Step 1: Extract Shapes from VSS

```bash
# Convert to XML to inspect
vsd2raw fortinet.vss fortinet.xml

# Or use the conversion script
./convert-vss-libvisio.sh fortinet.vss temp_output/
```

### Step 2: Identify Shapes

Review the XML or open the VSS file to identify:
- Which device models are present
- Shape names in the VSS file
- Which shapes correspond to which models

### Step 3: Extract Individual Shapes

For each shape:
1. Extract from VSS (using LibreOffice, Visio, or script)
2. Save as SVG
3. Name according to mapping table

### Step 4: Optimize SVGs

```bash
# Install SVGO (optional, for optimization)
npm install -g svgo

# Optimize all SVGs
svgo -f textures/ -r
```

### Step 5: Place in Correct Location

```bash
# Copy to textures directory
cp *.svg babylon_3d/babylon_app/network-visualizer/assets/textures/
```

## SVG Requirements

Each SVG file should:
- **Size**: 512x512px viewBox (or larger)
- **Format**: SVG 1.1 or 2.0
- **Transparency**: Transparent background preferred
- **Colors**: Preserve original device colors
- **Optimization**: Remove unnecessary metadata
- **ViewBox**: Properly set viewBox attribute

### Example SVG Structure

```svg
<svg xmlns="http://www.w3.org/2000/svg" 
     viewBox="0 0 512 512" 
     width="512" 
     height="512">
  <!-- Device shape content -->
</svg>
```

## Verification

After conversion, verify icons:

1. **Check file existence:**
   ```bash
   ls babylon_3d/babylon_app/network-visualizer/assets/textures/*.svg | wc -l
   # Should show 63+ files
   ```

2. **Test in browser:**
   - Open dashboard
   - Enable debug mode: `window.dashboard.setDebugMode(true)`
   - Check console for icon paths
   - View 3D topology to see icons

3. **Verify mapping:**
   ```javascript
   // In browser console
   const config = new DeviceConfig();
   console.log(config.getIconPath('switch', 'FS-124E-POE'));
   // Should return: babylon_3d/.../fortiswitch_124e_poe.svg
   ```

## Troubleshooting

### VSS File Won't Open

- Try LibreOffice Draw: `libreoffice --draw file.vss`
- Try converting to VSD first (if possible)
- Check file format (should be Visio Stencil)

### Shapes Not Extracting

- VSS files are stencil libraries, not single documents
- You may need to open in Visio and extract shapes manually
- Or use a tool that supports stencil extraction

### Wrong Shape Names

- VSS shape names may differ from device model names
- Create a mapping table manually
- Update `device-config.js` if needed

### SVG Not Displaying

- Check file path in browser console
- Verify SVG is valid (open in browser)
- Check for CORS issues if loading from file://
- Ensure viewBox is set correctly

## Quick Reference

**Required Tools:**
- `vsd2raw` or `vsd2svg` (libvisio-tools)
- LibreOffice Draw (alternative)
- Inkscape (optional, for optimization)

**Output Location:**
```
babylon_3d/babylon_app/network-visualizer/assets/textures/
```

**Total Files Needed:** 63 SVG files

**Priority Order:**
1. Default icons (3 files) - Required
2. Your actual device models - Check API data
3. All models - Complete coverage

## Next Steps

1. **Identify your devices:**
   ```bash
   node test-api-connection.js
   # Or check browser console: window.dashboard.debugAllDevices()
   ```

2. **Convert VSS files:**
   ```bash
   ./convert-vss-libvisio.sh fortinet.vss textures/
   ```

3. **Extract and rename shapes:**
   - Extract each shape from VSS
   - Rename according to mapping
   - Place in textures directory

4. **Test:**
   - Refresh dashboard
   - Check 3D topology view
   - Verify icons display correctly
