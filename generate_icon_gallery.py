import os

def generate_gallery(base_dir, output_file):
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Extracted Icons Gallery</title>
        <style>
            body { font-family: sans-serif; background: #333; color: #fff; }
            .gallery { display: flex; flex-wrap: wrap; gap: 10px; }
            .icon-card { 
                background: #444; 
                padding: 10px; 
                border-radius: 5px; 
                text-align: center; 
                width: 150px;
            }
            .icon-card img { 
                max-width: 100%; 
                height: auto; 
                max-height: 100px;
                background: white; /* Icons might be transparent/black */
            }
            .icon-name { 
                font-size: 12px; 
                margin-top: 5px; 
                word-break: break-all;
            }
        </style>
    </head>
    <body>
        <h1>Extracted Icons Gallery</h1>
        <div class="gallery">
    """
    
    count = 0
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith(".svg"):
                # Get relative path for HTML
                rel_path = os.path.relpath(os.path.join(root, file), os.path.dirname(output_file))
                
                html_content += f"""
                <div class="icon-card">
                    <img src="{rel_path}" alt="{file}">
                    <div class="icon-name">{file}</div>
                </div>
                """
                count += 1
                
    html_content += """
        </div>
    </body>
    </html>
    """
    
    with open(output_file, "w") as f:
        f.write(html_content)
        
    print(f"Gallery generated with {count} icons at {output_file}")

if __name__ == "__main__":
    base_dir = "babylon_3d/babylon_app/network-visualizer/assets/extracted_icons_docker"
    output_file = "babylon_3d/babylon_app/network-visualizer/assets/extracted_icons_docker/gallery.html"
    generate_gallery(base_dir, output_file)
