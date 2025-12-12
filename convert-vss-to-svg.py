#!/usr/bin/env python3
"""
Convert Visio Stencil (VSS) files to SVG format for device icons

This script extracts shapes from VSS files and converts them to SVG icons
for use in the FortiGate dashboard.

Requirements:
- libvisio (libreoffice-common or vsd2svg tool)
- Python 3.7+
- Optional: cairosvg for additional processing

Usage:
    python3 convert-vss-to-svg.py --vss-file fortinet.vss --output-dir textures/
    python3 convert-vss-to-svg.py --vss-file meraki.vss --output-dir textures/ --device-type meraki
"""

import os
import sys
import subprocess
import argparse
import re
from pathlib import Path
from typing import Dict, List, Optional

# Mapping of device model patterns to SVG filenames
DEVICE_MAPPING = {
    # FortiGate
    'fortigate': {
        'FG-60E': 'fortigate_60e.svg',
        'FG-61E': 'fortigate_61e.svg',
        'FG-100E': 'fortigate_100e.svg',
        'FG-200E': 'fortigate_200e.svg',
        'FG-500E': 'fortigate_500e.svg',
        'FG-1000E': 'fortigate_1000e.svg',
        'FG-2000E': 'fortigate_2000e.svg',
        'FG-60F': 'fortigate_60f.svg',
        'FG-61F': 'fortigate_61f.svg',
        'FG-100F': 'fortigate_100f.svg',
        'FG-200F': 'fortigate_200f.svg',
        'FG-500F': 'fortigate_500f.svg',
        'FG-1000F': 'fortigate_1000f.svg',
        'FG-2000F': 'fortigate_2000f.svg',
        'FG-60G': 'fortigate_60g.svg',
        'FG-61G': 'fortigate_61g.svg',
        'FG-100G': 'fortigate_100g.svg',
        'FG-200G': 'fortigate_200g.svg',
        'FG-500G': 'fortigate_500g.svg',
        'FG-1000G': 'fortigate_1000g.svg',
        'FG-2000G': 'fortigate_2000g.svg',
        'default': 'real_fortigate.svg'
    },
    # FortiSwitch
    'fortiswitch': {
        'FS-108E': 'fortiswitch_108e.svg',
        'FS-108E-POE': 'fortiswitch_108e_poe.svg',
        'FS-124E': 'fortiswitch_124e.svg',
        'FS-124E-POE': 'fortiswitch_124e_poe.svg',
        'FS-148E': 'fortiswitch_148e.svg',
        'FS-148E-POE': 'fortiswitch_148e_poe.svg',
        'FS-224E': 'fortiswitch_224e.svg',
        'FS-224E-POE': 'fortiswitch_224e_poe.svg',
        'FS-248E': 'fortiswitch_248e.svg',
        'FS-248E-POE': 'fortiswitch_248e_poe.svg',
        'FS-448E': 'fortiswitch_448e.svg',
        'FS-448E-POE': 'fortiswitch_448e_poe.svg',
        'FS-524E': 'fortiswitch_524e.svg',
        'FS-548E': 'fortiswitch_548e.svg',
        'FS-1024E': 'fortiswitch_1024e.svg',
        'FS-1048E': 'fortiswitch_1048e.svg',
        'default': 'real_fortiswitch.svg'
    },
    # FortiAP
    'fortiap': {
        'FAP-221C': 'fortiap_221c.svg',
        'FAP-221E': 'fortiap_221e.svg',
        'FAP-223C': 'fortiap_223c.svg',
        'FAP-223E': 'fortiap_223e.svg',
        'FAP-224E': 'fortiap_224e.svg',
        'FAP-231C': 'fortiap_231c.svg',
        'FAP-231E': 'fortiap_231e.svg',
        'FAP-231F': 'fortiap_231f.svg',
        'FAP-233C': 'fortiap_233c.svg',
        'FAP-233E': 'fortiap_233e.svg',
        'FAP-234E': 'fortiap_234e.svg',
        'FAP-421E': 'fortiap_421e.svg',
        'FAP-423E': 'fortiap_423e.svg',
        'FAP-431F': 'fortiap_431f.svg',
        'FAP-433F': 'fortiap_433f.svg',
        'FAP-U431F': 'fortiap_u431f.svg',
        'FAP-U433F': 'fortiap_u433f.svg',
        'FAP-U434F': 'fortiap_u434f.svg',
        'FAP-U436F': 'fortiap_u436f.svg',
        'FAP-U441C': 'fortiap_u441c.svg',
        'FAP-U441E': 'fortiap_u441e.svg',
        'FAP-U443C': 'fortiap_u443c.svg',
        'FAP-U443E': 'fortiap_u443e.svg',
        'FAP-U444E': 'fortiap_u444e.svg',
        'FAP-U451E': 'fortiap_u451e.svg',
        'FAP-U453E': 'fortiap_u453e.svg',
        'FAP-U454E': 'fortiap_u454e.svg',
        'FAP-U461E': 'fortiap_u461e.svg',
        'FAP-U463E': 'fortiap_u463e.svg',
        'FAP-U464E': 'fortiap_u464e.svg',
        'default': 'real_fortiap.svg'
    }
}


def normalize_shape_name(name: str) -> str:
    """Normalize Visio shape name to match device model patterns."""
    # Remove common prefixes/suffixes
    name = re.sub(r'^(FortiGate|FortiSwitch|FortiAP|FG|FS|FAP)[\s-]*', '', name, flags=re.IGNORECASE)
    name = re.sub(r'[\s-]+(Stencil|Shape|Icon|Device)$', '', name, flags=re.IGNORECASE)
    
    # Normalize whitespace and hyphens
    name = re.sub(r'[\s_]+', '-', name)
    name = name.strip().upper()
    
    return name


def find_matching_model(shape_name: str, device_type: str) -> Optional[str]:
    """Find matching device model for a shape name."""
    if device_type not in DEVICE_MAPPING:
        return None
    
    normalized = normalize_shape_name(shape_name)
    mapping = DEVICE_MAPPING[device_type]
    
    # Try exact match first
    if normalized in mapping:
        return mapping[normalized]
    
    # Try partial match
    for pattern, svg_name in mapping.items():
        if pattern != 'default' and pattern.upper() in normalized:
            return svg_name
    
    # Try reverse lookup (check if shape name contains model)
    for pattern, svg_name in mapping.items():
        if pattern != 'default' and normalized in pattern.upper():
            return svg_name
    
    return None


def check_libvisio_tools() -> Dict[str, Optional[str]]:
    """Check for available libvisio conversion tools."""
    tools = {
        'vsd2svg': None,
        'vsd2raw': None,
        'libreoffice': None,
        'inkscape': None
    }
    
    # Check for vsd2svg (if libvisio-tools is installed)
    try:
        result = subprocess.run(['which', 'vsd2svg'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            tools['vsd2svg'] = result.stdout.strip()
    except:
        pass
    
    # Check for vsd2raw
    try:
        result = subprocess.run(['which', 'vsd2raw'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            tools['vsd2raw'] = result.stdout.strip()
    except:
        pass
    
    # Check for LibreOffice (can convert VSS)
    try:
        result = subprocess.run(['which', 'libreoffice'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            tools['libreoffice'] = result.stdout.strip()
    except:
        pass
    
    # Check for Inkscape (can convert various formats to SVG)
    try:
        result = subprocess.run(['which', 'inkscape'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            tools['inkscape'] = result.stdout.strip()
    except:
        pass
    
    return tools


def extract_shapes_from_vss(vss_file: str) -> List[str]:
    """Extract shape names from VSS file (if possible)."""
    # This is a placeholder - actual extraction would require parsing VSS format
    # or using libvisio tools
    print(f"Note: Shape extraction from VSS requires libvisio tools")
    print(f"VSS file: {vss_file}")
    return []


def convert_with_libreoffice(vss_file: str, output_dir: str) -> bool:
    """Convert VSS to SVG using LibreOffice."""
    try:
        # LibreOffice can export VSS to SVG
        cmd = [
            'libreoffice',
            '--headless',
            '--convert-to', 'svg',
            '--outdir', output_dir,
            vss_file
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        return result.returncode == 0
    except Exception as e:
        print(f"Error with LibreOffice conversion: {e}")
        return False


def convert_with_inkscape(input_file: str, output_file: str) -> bool:
    """Convert file to SVG using Inkscape."""
    try:
        cmd = [
            'inkscape',
            input_file,
            '--export-type=svg',
            f'--export-filename={output_file}'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        return result.returncode == 0
    except Exception as e:
        print(f"Error with Inkscape conversion: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Convert Visio Stencil (VSS) files to SVG icons'
    )
    parser.add_argument('--vss-file', required=True,
                       help='Path to VSS file (Fortinet or Meraki)')
    parser.add_argument('--output-dir', required=True,
                       help='Output directory for SVG files')
    parser.add_argument('--device-type', 
                       choices=['fortigate', 'fortiswitch', 'fortiap', 'meraki', 'auto'],
                       default='auto',
                       help='Device type (auto-detect if not specified)')
    parser.add_argument('--list-shapes', action='store_true',
                       help='List available shapes in VSS file')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be converted without actually converting')
    
    args = parser.parse_args()
    
    # Check if VSS file exists
    if not os.path.exists(args.vss_file):
        print(f"Error: VSS file not found: {args.vss_file}")
        sys.exit(1)
    
    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Check for conversion tools
    print("Checking for conversion tools...")
    tools = check_libvisio_tools()
    
    available_tools = [k for k, v in tools.items() if v is not None]
    if not available_tools:
        print("\n❌ No conversion tools found!")
        print("\nPlease install one of the following:")
        print("  - libvisio-tools (provides vsd2svg)")
        print("  - LibreOffice (can convert VSS)")
        print("  - Inkscape (can convert various formats)")
        print("\nInstallation:")
        print("  sudo apt-get install libvisio-tools libreoffice inkscape")
        sys.exit(1)
    
    print(f"✅ Found tools: {', '.join(available_tools)}")
    
    # Auto-detect device type from filename
    device_type = args.device_type
    if device_type == 'auto':
        vss_lower = args.vss_file.lower()
        if 'fortigate' in vss_lower or 'fg' in vss_lower:
            device_type = 'fortigate'
        elif 'fortiswitch' in vss_lower or 'switch' in vss_lower:
            device_type = 'fortiswitch'
        elif 'fortiap' in vss_lower or 'fap' in vss_lower or 'ap' in vss_lower:
            device_type = 'fortiap'
        elif 'meraki' in vss_lower:
            device_type = 'meraki'
        else:
            print("⚠️  Could not auto-detect device type. Using 'fortigate' as default.")
            device_type = 'fortigate'
    
    print(f"\nDevice type: {device_type}")
    
    # List shapes if requested
    if args.list_shapes:
        print("\nExtracting shapes from VSS file...")
        shapes = extract_shapes_from_vss(args.vss_file)
        if shapes:
            print(f"Found {len(shapes)} shapes:")
            for shape in shapes:
                print(f"  - {shape}")
        else:
            print("Note: Shape extraction requires libvisio tools")
        return
    
    # Convert VSS to SVG
    print(f"\nConverting {args.vss_file} to SVG files...")
    
    if tools['libreoffice']:
        print("Using LibreOffice for conversion...")
        if not args.dry_run:
            success = convert_with_libreoffice(args.vss_file, str(output_dir))
            if success:
                print("✅ Conversion completed!")
            else:
                print("❌ Conversion failed")
        else:
            print("(Dry run - would convert with LibreOffice)")
    
    print(f"\nOutput directory: {output_dir}")
    print("\nNext steps:")
    print("1. Review the converted SVG files")
    print("2. Rename them according to REQUIRED_SVG_FILES.md")
    print("3. Place them in: babylon_3d/babylon_app/network-visualizer/assets/textures/")


if __name__ == '__main__':
    main()
