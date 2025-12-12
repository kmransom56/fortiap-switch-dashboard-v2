#!/usr/bin/env python3
"""
Map and copy extracted Fortinet SVG files to the required filenames for the dashboard.

This script:
1. Maps existing SVG filenames to required dashboard filenames
2. Handles multiple models in single files (e.g., "FG-100_101E.svg")
3. Copies files to the textures directory with correct names
4. Creates a mapping report
"""

import os
import shutil
import re
from pathlib import Path
from typing import Dict, List, Tuple

# Base paths
EXTRACTED_DIR = Path(__file__).parent / "fortinet_visio_stencil" / "extracted_visio_content"
TEXTURES_DIR = Path(__file__).parent / "babylon_3d" / "babylon_app" / "network-visualizer" / "assets" / "textures"

# Mapping from required filenames to source patterns
REQUIRED_MAPPING = {
    # FortiGate models (updated with actual filenames)
    'fortigate_60e.svg': ['FG-60E-POE', 'FG-60E', 'FG-600E_601E'],
    'fortigate_61e.svg': ['FG-61E', 'FG-600E_601E'],
    'fortigate_100e.svg': ['FG-100_101E', 'FG-100E', 'FG-100EF'],
    'fortigate_200e.svg': ['FG-200_201E', 'FG-200E'],
    'fortigate_500e.svg': ['FG-500E_501E', 'FG-500E'],
    'fortigate_1000e.svg': ['FG-1000_1001E', 'FG-1000E'],
    'fortigate_2000e.svg': ['FG-2000E'],
    'fortigate_60f.svg': ['FG-60_61F', 'FG-60F', 'FG-600_601F'],
    'fortigate_61f.svg': ['FG-61F', 'FG-600_601F'],
    'fortigate_100f.svg': ['FG-100F_101F', 'FG-100F'],
    'fortigate_200f.svg': ['FG-200_201F', 'FG-200F'],
    'fortigate_500f.svg': ['FG-500F', 'FG-500_501F'],
    'fortigate_1000f.svg': ['FG-1000_1001F', 'FG-1000F'],
    'fortigate_2000f.svg': ['FG-2000F'],
    'fortigate_60g.svg': ['FG-60G', 'FG-60_61G'],
    'fortigate_61g.svg': ['FG-61G', 'FG-60_61G'],
    'fortigate_100g.svg': ['FG-100G', 'FG-100_101G'],
    'fortigate_200g.svg': ['FG-200_201G', 'FG-200G'],
    'fortigate_500g.svg': ['FG-500G', 'FG-500_501G'],
    'fortigate_1000g.svg': ['FG-1000G', 'FG-1000_1001G'],
    'fortigate_2000g.svg': ['FG-2000G'],
    
    # FortiSwitch models (updated with actual filenames)
    'fortiswitch_108e.svg': ['FSW-108E'],
    'fortiswitch_108e_poe.svg': ['FSW-108E-POE'],
    'fortiswitch_124e.svg': ['FSW-124E'],
    'fortiswitch_124e_poe.svg': ['FSW-124E-POE'],
    'fortiswitch_148e.svg': ['FSW-148E', 'FSW-148F'],  # May need F variant
    'fortiswitch_148e_poe.svg': ['FSW-148E-POE', 'FSW-148F-POE'],
    'fortiswitch_224e.svg': ['FSW-224E'],
    'fortiswitch_224e_poe.svg': ['FSW-224E-POE'],
    'fortiswitch_248e.svg': ['FSW-248E-FPOE', 'FSW-248E'],
    'fortiswitch_248e_poe.svg': ['FSW-248E-POE'],
    'fortiswitch_448e.svg': ['FSW-448E'],
    'fortiswitch_448e_poe.svg': ['FSW-448E-POE'],
    'fortiswitch_524e.svg': ['FSW-524D-FPOE', 'FSW-524E'],
    'fortiswitch_548e.svg': ['FSW-548D-FPOE', 'FSW-548D', 'FSW-548E'],
    'fortiswitch_1024e.svg': ['FSW-1024E__F_'],
    'fortiswitch_1048e.svg': ['FSW-1048E__F_'],
    
    # FortiAP models
    'fortiap_221c.svg': ['FAP-221C', 'FAP-221B_221C'],
    'fortiap_221e.svg': ['FAP-221E', 'FAP-221_223E'],
    'fortiap_223c.svg': ['FAP-223C', 'FAP-223B_223C', 'FAP-221_223E'],
    'fortiap_223e.svg': ['FAP-223E', 'FAP-221_223E'],
    'fortiap_224e.svg': ['FAP-224E'],
    'fortiap_231c.svg': ['FAP-231C'],
    'fortiap_231e.svg': ['FAP-231E'],
    'fortiap_231f.svg': ['FAP-231F', 'FAP-231F_233F'],
    'fortiap_233c.svg': ['FAP-233C'],
    'fortiap_233e.svg': ['FAP-233E'],
    'fortiap_234e.svg': ['FAP-234E', 'FAP-432F_234F'],
    'fortiap_421e.svg': ['FAP-421E', 'FAP-421_423E'],
    'fortiap_423e.svg': ['FAP-423E', 'FAP-421_423E'],
    'fortiap_431f.svg': ['FAP-431F', 'FAP-231F_233F_431F_433F'],
    'fortiap_433f.svg': ['FAP-433F', 'FAP-231F_233F_431F_433F'],
    'fortiap_u431f.svg': ['FAP-U431F', 'FAP-U431_433F'],
    'fortiap_u433f.svg': ['FAP-U433F', 'FAP-U431_433F'],
    'fortiap_u434f.svg': ['FAP-U434F', 'FAP-U432F'],
    'fortiap_u436f.svg': ['FAP-U436F'],
    'fortiap_u441c.svg': ['FAP-U441C'],
    'fortiap_u441e.svg': ['FAP-U441E'],
    'fortiap_u443c.svg': ['FAP-U443C'],
    'fortiap_u443e.svg': ['FAP-U443E'],
    'fortiap_u444e.svg': ['FAP-U444E'],
    'fortiap_u451e.svg': ['FAP-U451E'],
    'fortiap_u453e.svg': ['FAP-U453E'],
    'fortiap_u454e.svg': ['FAP-U454E'],
    'fortiap_u461e.svg': ['FAP-U461E'],
    'fortiap_u463e.svg': ['FAP-U463E'],
    'fortiap_u464e.svg': ['FAP-U464E'],
}

# Default icons (use generic versions)
DEFAULT_ICONS = {
    'real_fortigate.svg': 'FortiGate_Series_R22_2025Q2',
    'real_fortiswitch.svg': 'FortiSwitch_Series_R14_2025Q2',
    'real_fortiap.svg': 'FortiAP Series_R8_2025Q2',
}


def find_source_file(patterns: List[str], device_type: str) -> Tuple[Path, str]:
    """Find source SVG file matching patterns."""
    if device_type == 'fortigate':
        search_dir = EXTRACTED_DIR / "FortiGate_Series_R22_2025Q2"
    elif device_type == 'fortiswitch':
        search_dir = EXTRACTED_DIR / "FortiSwitch_Series_R14_2025Q2"
    elif device_type == 'fortiap':
        search_dir = EXTRACTED_DIR / "FortiAP Series_R8_2025Q2"
    else:
        return None, None
    
    if not search_dir.exists():
        return None, None
    
    # Get all SVG files
    svg_files = list(search_dir.glob("*.svg"))
    
    # Try each pattern
    for pattern in patterns:
        pattern_upper = pattern.upper()
        for svg_file in svg_files:
            filename_upper = svg_file.stem.upper()
            # Check if pattern matches filename
            if pattern_upper in filename_upper or filename_upper.startswith(pattern_upper):
                return svg_file, pattern
    
    # If no exact match, try partial match
    for pattern in patterns:
        pattern_base = pattern.split('-')[0] if '-' in pattern else pattern
        for svg_file in svg_files:
            filename_upper = svg_file.stem.upper()
            if pattern_base in filename_upper:
                return svg_file, pattern
    
    return None, None


def get_device_type(filename: str) -> str:
    """Determine device type from filename."""
    if filename.startswith('fortigate'):
        return 'fortigate'
    elif filename.startswith('fortiswitch'):
        return 'fortiswitch'
    elif filename.startswith('fortiap'):
        return 'fortiap'
    return None


def copy_svg_files(dry_run: bool = False) -> Dict[str, List[str]]:
    """Copy and rename SVG files."""
    results = {
        'copied': [],
        'missing': [],
        'errors': []
    }
    
    # Ensure textures directory exists
    TEXTURES_DIR.mkdir(parents=True, exist_ok=True)
    
    print("═══════════════════════════════════════════════════════════")
    print("Mapping and Copying SVG Files")
    print("═══════════════════════════════════════════════════════════\n")
    
    # Process required mappings
    for required_name, patterns in REQUIRED_MAPPING.items():
        device_type = get_device_type(required_name)
        source_file, matched_pattern = find_source_file(patterns, device_type)
        
        dest_file = TEXTURES_DIR / required_name
        
        if source_file and source_file.exists():
            try:
                if not dry_run:
                    shutil.copy2(source_file, dest_file)
                print(f"✅ {required_name:40} ← {source_file.name:50} (matched: {matched_pattern})")
                results['copied'].append(required_name)
            except Exception as e:
                print(f"❌ {required_name:40} ERROR: {e}")
                results['errors'].append(f"{required_name}: {e}")
        else:
            print(f"⚠️  {required_name:40} NOT FOUND (tried: {', '.join(patterns)})")
            results['missing'].append(required_name)
    
    # Copy default icons
    print("\n--- Default Icons ---")
    for default_name, series_dir in DEFAULT_ICONS.items():
        source_dir = EXTRACTED_DIR / series_dir
        if source_dir.exists():
            # Try to find a generic/representative file
            svg_files = list(source_dir.glob("*.svg"))
            if svg_files:
                # Use first file as default (or find a better match)
                source_file = svg_files[0]
                dest_file = TEXTURES_DIR / default_name
                try:
                    if not dry_run:
                        shutil.copy2(source_file, dest_file)
                    print(f"✅ {default_name:40} ← {source_file.name}")
                    results['copied'].append(default_name)
                except Exception as e:
                    print(f"❌ {default_name:40} ERROR: {e}")
                    results['errors'].append(f"{default_name}: {e}")
            else:
                print(f"⚠️  {default_name:40} NO FILES IN {series_dir}")
                results['missing'].append(default_name)
        else:
            print(f"⚠️  {default_name:40} DIRECTORY NOT FOUND: {series_dir}")
            results['missing'].append(default_name)
    
    # Summary
    print("\n═══════════════════════════════════════════════════════════")
    print("Summary")
    print("═══════════════════════════════════════════════════════════")
    print(f"✅ Copied: {len(results['copied'])}")
    print(f"⚠️  Missing: {len(results['missing'])}")
    print(f"❌ Errors: {len(results['errors'])}")
    
    if results['missing']:
        print("\nMissing files:")
        for missing in results['missing']:
            print(f"  - {missing}")
    
    return results


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Map and copy Fortinet SVG files')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be copied without copying')
    parser.add_argument('--list-available', action='store_true', help='List available SVG files')
    
    args = parser.parse_args()
    
    if args.list_available:
        print("Available SVG files:")
        for series_dir in ['FortiGate_Series_R22_2025Q2', 'FortiSwitch_Series_R14_2025Q2', 'FortiAP Series_R8_2025Q2']:
            series_path = EXTRACTED_DIR / series_dir
            if series_path.exists():
                svg_files = sorted(series_path.glob("*.svg"))
                print(f"\n{series_dir} ({len(svg_files)} files):")
                for svg_file in svg_files[:20]:  # Show first 20
                    print(f"  - {svg_file.name}")
                if len(svg_files) > 20:
                    print(f"  ... and {len(svg_files) - 20} more")
        return
    
    results = copy_svg_files(dry_run=args.dry_run)
    
    if args.dry_run:
        print("\n⚠️  DRY RUN - No files were copied")
        print("Run without --dry-run to actually copy files")
    else:
        print(f"\n✅ Files copied to: {TEXTURES_DIR}")


if __name__ == '__main__':
    main()
