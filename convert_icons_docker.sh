#!/bin/bash
set -e

# Install dependencies
apt-get update
apt-get install -y inkscape

# Define directories
INPUT_DIR="/data/shared/fortinet"
OUTPUT_DIR="/data/babylon_3d/babylon_app/network-visualizer/assets/extracted_icons_docker"

mkdir -p "$OUTPUT_DIR"

# Convert files
for vss_file in "$INPUT_DIR"/*.vss; do
    [ -e "$vss_file" ] || continue
    filename=$(basename "$vss_file" .vss)
    echo "Processing $filename..."
    
    # Create a subdirectory for each VSS file's icons
    target_dir="$OUTPUT_DIR/$filename"
    mkdir -p "$target_dir"
    
    # Inkscape conversion
    # Inkscape usually converts the whole sheet to one SVG
    output_svg="$target_dir/$filename.svg"
    inkscape "$vss_file" --export-plain-svg --export-filename="$output_svg"
    
    echo "Converted $filename to $output_svg"
done

echo "Conversion complete."
