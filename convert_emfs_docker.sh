#!/bin/bash
set -e

# Install dependencies
apt-get update
apt-get install -y inkscape

# Define base directory
BASE_DIR="/data/babylon_3d/babylon_app/network-visualizer/assets/extracted_icons_docker"

# Find and convert EMF files
find "$BASE_DIR" -name "*.emf" | while read emf_file; do
    dir=$(dirname "$emf_file")
    filename=$(basename "$emf_file" .emf)
    svg_file="$dir/$filename.svg"
    
    echo "Converting $emf_file to $svg_file..."
    
    # Inkscape conversion
    inkscape "$emf_file" --export-plain-svg --export-filename="$svg_file"
done

echo "EMF to SVG conversion complete."
