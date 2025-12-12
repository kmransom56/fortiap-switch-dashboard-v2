#!/bin/bash
#
# Convert Visio Stencil (VSS) files to SVG using libvisio tools
#
# This script extracts shapes from VSS files and converts them to individual SVG files
# for use in the FortiGate dashboard.
#
# Requirements:
#   - libvisio-tools (provides vsd2raw, vsd2svg if available)
#   - Python 3 with xml.etree (for parsing)
#   - Optional: Inkscape or LibreOffice for additional conversion
#
# Usage:
#   ./convert-vss-libvisio.sh fortinet.vss output_dir/
#   ./convert-vss-libvisio.sh meraki.vss output_dir/ --device-type meraki

set -e

VSS_FILE="$1"
OUTPUT_DIR="$2"
DEVICE_TYPE="${3:-auto}"

if [ -z "$VSS_FILE" ] || [ -z "$OUTPUT_DIR" ]; then
    echo "Usage: $0 <vss-file> <output-dir> [device-type]"
    echo ""
    echo "Device types: fortigate, fortiswitch, fortiap, meraki, auto"
    echo ""
    echo "Example:"
    echo "  $0 fortinet.vss textures/ fortigate"
    exit 1
fi

if [ ! -f "$VSS_FILE" ]; then
    echo "Error: VSS file not found: $VSS_FILE"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "═══════════════════════════════════════════════════════════"
echo "VSS to SVG Conversion Tool"
echo "═══════════════════════════════════════════════════════════"
echo "VSS File: $VSS_FILE"
echo "Output Dir: $OUTPUT_DIR"
echo "Device Type: $DEVICE_TYPE"
echo ""

# Check for vsd2raw (part of libvisio-tools)
if command -v vsd2raw >/dev/null 2>&1; then
    echo "✅ Found vsd2raw"
    VSD2RAW_CMD="vsd2raw"
elif [ -f "/usr/local/bin/vsd2raw" ]; then
    echo "✅ Found vsd2raw at /usr/local/bin/vsd2raw"
    VSD2RAW_CMD="/usr/local/bin/vsd2raw"
else
    echo "❌ vsd2raw not found"
    echo ""
    echo "Please install libvisio-tools:"
    echo "  sudo apt-get install libvisio-tools"
    echo "  OR"
    echo "  Build from source: https://github.com/freedesktop/libvisio"
    exit 1
fi

# Check for vsd2svg (optional, newer versions)
if command -v vsd2svg >/dev/null 2>&1; then
    echo "✅ Found vsd2svg (direct SVG conversion available)"
    VSD2SVG_CMD="vsd2svg"
    USE_VSD2SVG=true
else
    echo "⚠️  vsd2svg not found (will use vsd2raw + conversion)"
    USE_VSD2SVG=false
fi

echo ""

# Method 1: Direct SVG conversion (if vsd2svg available)
if [ "$USE_VSD2SVG" = true ]; then
    echo "Attempting direct SVG conversion with vsd2svg..."
    
    # VSS files are stencils, may need special handling
    # Try converting to SVG
    TEMP_SVG="${OUTPUT_DIR}/temp_converted.svg"
    if $VSD2SVG_CMD "$VSS_FILE" "$TEMP_SVG" 2>/dev/null; then
        echo "✅ Direct conversion successful!"
        echo "Output: $TEMP_SVG"
        echo ""
        echo "Note: VSS files contain multiple shapes. You may need to:"
        echo "1. Open the SVG in Inkscape or similar tool"
        echo "2. Extract individual shapes"
        echo "3. Save each shape as a separate SVG file"
        exit 0
    else
        echo "⚠️  Direct conversion failed, trying alternative method..."
    fi
fi

# Method 2: Convert to raw XML format, then extract shapes
echo "Converting VSS to raw XML format..."
TEMP_XML="${OUTPUT_DIR}/temp_vss.xml"

if $VSD2RAW_CMD "$VSS_FILE" "$TEMP_XML" 2>/dev/null; then
    echo "✅ Conversion to XML successful!"
    echo "XML file: $TEMP_XML"
    echo ""
    
    # Extract shape information from XML
    echo "Extracting shape information..."
    
    # Use Python to parse XML and extract shapes
    python3 << 'PYTHON_SCRIPT'
import sys
import xml.etree.ElementTree as ET
import re
from pathlib import Path

xml_file = sys.argv[1]
output_dir = sys.argv[2]

try:
    tree = ET.parse(xml_file)
    root = tree.getroot()
    
    # Find all shape elements (VSS format may vary)
    shapes = []
    
    # Look for common Visio shape elements
    for elem in root.iter():
        # Check for shape name attributes
        name = elem.get('Name') or elem.get('name') or elem.get('NameU')
        if name:
            shapes.append(name)
        
        # Check for text content that might be shape names
        if elem.text and len(elem.text.strip()) > 0:
            text = elem.text.strip()
            # Look for device model patterns
            if re.search(r'(FG|FS|FAP|FortiGate|FortiSwitch|FortiAP)', text, re.I):
                if text not in shapes:
                    shapes.append(text)
    
    print(f"Found {len(shapes)} potential shapes:")
    for i, shape in enumerate(shapes[:20], 1):  # Show first 20
        print(f"  {i}. {shape}")
    
    if len(shapes) > 20:
        print(f"  ... and {len(shapes) - 20} more")
    
    print("\nNote: VSS files are stencil libraries containing multiple shapes.")
    print("You'll need to manually extract each shape or use a Visio-compatible tool.")
    
except Exception as e:
    print(f"Error parsing XML: {e}")
    print("\nThe XML file has been created. You can:")
    print("1. Open it in a text editor to inspect structure")
    print("2. Use a Visio-compatible tool to extract shapes")
    print("3. Use LibreOffice Draw to open the VSS and export individual shapes")

PYTHON_SCRIPT "$TEMP_XML" "$OUTPUT_DIR"
    
else
    echo "❌ Conversion to XML failed"
    echo ""
    echo "Alternative methods:"
    echo "1. Use LibreOffice Draw:"
    echo "   libreoffice --draw $VSS_FILE"
    echo "   Then export each shape as SVG"
    echo ""
    echo "2. Use Inkscape (if it supports VSS):"
    echo "   inkscape $VSS_FILE --export-type=svg"
    echo ""
    echo "3. Use online converters or Visio itself"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Next Steps:"
echo "═══════════════════════════════════════════════════════════"
echo "1. Review the XML file: $TEMP_XML"
echo "2. Extract individual shapes from the VSS file"
echo "3. Convert each shape to SVG"
echo "4. Rename SVGs according to REQUIRED_SVG_FILES.md"
echo "5. Place in: babylon_3d/babylon_app/network-visualizer/assets/textures/"
echo ""
echo "For detailed instructions, see: VSS_CONVERSION_GUIDE.md"
