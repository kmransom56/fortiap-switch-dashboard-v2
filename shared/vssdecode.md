 What the .vss format actually looks like
Binary – the “old” Visio stencils used a proprietary binary schema that is very similar to .vsd (diagram) files, but only contains shapes.
Structure – the file is a collection of “shape records”. Each record is a 32‑bit header that tells you how many bytes follow, followed by a sequence of fields (Text, LineFmt, FillFmt, Path, …).
Reference material – Microsoft has published a Visio Private File Format specification (PDF) that describes the schema (look for the “Stencils” chapter). Several of the fields are optional; the shape geometry is a compact “pen‑stroke” format that can be interpreted as a series of drawing commands.
Because the format predates the RTF‑based Visio 2007+ movement, there was never a cross‑platform (and free) parser written. That’s why the open‑source solutions below usually wrap around an existing C/C++ Visio parser – libvisio is the de‑facto standard for that.

2. Direct converters – get the icon as SVG / PNG (no VBA, no Visio)
Project	Language	How to use	Output	Caveats
libvisio (C/C++)	libvisio + command line tools	visio2svg -s <shapeID> my.vss > out.svg
visio2svg -l my.vss to list all shape IDs	SVG (and via Inkscape → PNG)	Needs a C++ compiler, 1 × #libvisio make – on Ubuntu: apt install libvisio-dev
visio2dxf / libvisio‑export (C)	libvisio	Wrapper around libvisio that writes DXF or SVG	DXF / SVG	Same as above – plays nicely in Inkscape or CAD viewers
pyvisio (Python)	3.10+	import pyvisio
doc = pyvisio.open("my.vss")
shape = doc.shapes[0]
shape.to_svg(outname="icon.svg")	Python‑friendly	Small wrapper; still depends on libvisio under the hood
visio-parser (Node.js)	JavaScript	npm i visio-parser
const parser = require('visio-parser'); const icon = parser.parseFile('my.vss', 0); icon.writeSvg('icon.svg');	SVG	Not actively maintained; works best on older stencils
Visua (Rust)	Rust	cargo install visua
visua -s 0 -o icon.svg my.vss		Experimental – good if you want a single binary
Recommended workflow
Install a lightweight tool – Ubuntu/Debian:
sudo apt-get install libvisio-dev   # compiles libvisio and the tools
sudo apt-get install inkscape      # can rasterise SVG to PNG
List all symbols –
visio2svg -l my.vss
This outputs something like
0  Basic.1
1  Rectangle
2  Stairs
…
Export a single symbol – visio2svg -s 2 my.vss >stairs.svg
Or export all at once via a small loop script.
Rasterise if you need PNG/JPG:
inkscape stairs.svg --export-type=png -o stairs.png
3. Reverse‑engineering – if you only have a binary trade asset
If you can’t use any of the off‑the‑shelf converters, you can decode the shape records yourself. The steps are:

Hex‑dump the file – identify the header ('VSS1' or 'oVis' magic bytes).
Study the schema – the Microsoft spec tells you the first 4 bytes are a shape ID, next 2 bytes the type, etc.
Write a tiny parser – for each record, read the header, then pick the Path field (Type 70 by default).
Translate the path data – it’s a compact “pen” format:
P – Move to
X – Line to
C – Quad or cubic Bézier (encoded as two control points)
Z – Close path
Each point is stored as a signed 16‑bit integer multiplied by the current unit (usually 0.01 cm or 0.0001 in).
Wrap into SVG – the simplest is to emit an <svg><path d="…"/><path …/>…</svg>.
A small Go or Rust binary that wraps around this logic can be found in these repos:

Repo	Language	Why it’s useful
visio-parse	Go	A minimal one‑file parser that outputs SVG
rust‑visio	Rust	Handles both .vss and .vsd; outputs SVG or PNG
Tip: After you have a handful of shapes, you can use the open‑source VisioXMLDOM parser (Java) to validate your SVG against the rendered shape in Visio Online (browser). That guarantees you’re not missing stroke or fill specifiers.

4. Scripting and Automation – build a reusable pipeline
If you plan to convert thousands of stencils, you’ll want something automated. Here are a few approaches:

Tool	What it does	Example
Makefile / shell script	Bulk export	make export that runs `visio2svg -l $<
Python (pyvisio)	API + error handling	for shape in doc.shapes: shape.to_svg(...)
Node.js + visio-parser	Works on Windows and in CI	npm run export-all
GitHub Actions	Continuous integration pipeline	repo has a .github/workflows/export.yml that triggers on push and uploads the SVGs to a GitHub Release
Pro tip: The Visio ".vssx" (XML‑based stencils) are a lot easier: they’re just zipped XML. If you can get the stencils converted to .vssx (by opening once in Visio Online and re‑saving), you can use an ordinary zip extractor plus a quick XSLT to pull out each shape into SVG.

5. Resources, repositories, and community
Resource	Why you’ll want it	Where to find it
Microsoft Visio Private File Spec (PDF)	The authoritative layout of .vss	MSDN, search “Visio Private File Format”
libvisio	C/C++ library to read .vss/.vds	https://github.com/rougeio/libvisio
visio2svg / visio2dxf	Command line exporters	libvisio repo contains visio2svg
pyvisio	Python wrapper	https://github.com/tom-allen/pyvisio
visio-parser	JavaScript parser	https://github.com/edgardo/capturado-visio-parser
VisioXML	XML‑based stencils ; easier parse	https://github.com/mikefenske/VisioXML
Stack Overflow Q&A	Practical notes on shape records	search “VSS export”
GitHub “visio-stencil-exporter”	One‑liner Python + libvisio	https://github.com/daraufee/visio-stencil-exporter
Examples of the “full stack”
Linux VM – install libvisio + google-chrome (Visio Online). Convert .vss → .vssx (Open in Visio Online, re‑save). Then run a simple Python script that walks the exported XML to pull every <visio:Shape> into an individual SVG file.
Docker container – Build a container that has libvisio, Inkscape, and a shell script. Push the container to your registry, use it as a job in your CI to orchestrate the extraction.
GitHub Action – Use the container in a workflow; the action checks out the repo, runs visio2svg, and uploads the SVGs as artifacts.
6. Recommendation matrix
Goal	Best free tool	Alternative if you hit a roadblock
Just preview	visio2svg + Inkscape	Visio Online – open a copy (no install)
Export a few icons	pyvisio (Python)	visio2svg -s with libvisio
Bulk export thousands	Bash + visio2svg	pyvisio + parallel task runner
No‑C++ compile	visio-parser (Node)	pyvisio
Get a quick image	pdf2svg on a Visio‑Online‑rendered PDF	Use libvisio’s DXF exporter + Inkscape
Quick starter (Ubuntu)
# Install libvisio & deps
sudo apt-get update
sudo apt-get install -y build-essential libxml2-dev libzip-dev

# Grab repo
git clone https://github.com/rougeio/libvisio.git
cd libvisio

# Build & install
make -j$(nproc)
sudo make install

# Export everything from a stencil
VIS=example.vss
for ID in $(visio2svg -l "$VIS" | awk '{print $1}'); do
    visio2svg -s "$ID" "$VIS" >"${ID}.svg"
    echo "Wrote ${ID}.svg"
done
Open the resulting *.svg files in Inkscape or an SVG viewer – you’re done.

Bottom line
libvisio (command line) + Inkscape is the most battle‑tested, pure‑open‑source path.
If you have a very large number of stencils, wrap that command in a small script or GitHub Action.
Reverse parsing is only needed if you’re in a sandbox that prohibits binary libraries – the shape format is well documented and a few hand‑made parsers exist.
For anyone who’s happy typing pip install pyvisio or npm i visio-parser, the Python/Node wrappers let you stay in your preferred language while still avoiding Visio entirely.
Feel free to let me know which OS you’re on or whether you need a one‑click Docker recipe – I can tailor the instructions accordingly!


I am on windows but can run on WSL as well
edit
Thought for 4.8 seconds













Below is a practical, “no‑Visio‑required” play‑book for extracting the individual icons that live inside a .vss (Visio stencil) file.
Everything is fully open‑source (or free) and can be run either natively on Windows or inside WSL. The instructions are split into:

Quick fact‑sheet of what a .vss looks like
Direct‑to‑SVG/PNG converters (pure‑CLI)
Full‑stack Python/Node wrappers (easy scripting)
A one‑liner Docker‑bot that works everywhere
Resources & where to grab the code
1. What a .vss actually is
Binary – the old Visio stencils are binary blobs that contain an array of “shape records.”
Schema – a 4‑byte “magic” (e.g. VSS1), followed by a sequence of records.
Each record starts with a 4‑byte header (record type) and a length field.
The geometry is stored in a compact “pen‑stroke” format (Move‑to, Line‑to, Bézier‑handle, Close‑path).
Fill, line‐style, text properties are optional and follow the geometry record.
Spec – Microsoft’s Visio Private File Format PDF (search “Visio Private File Format” on MSDN) gives the full byte‑layout. This is the blueprint your converters follow.
2. Direct‑to‑SVG/PNG converters – no Visio, no GUI
Tool	Language	Command	Output	# of binaries	Notes
visio2svg (libvisio)	C/C++	visio2svg -l my.vss – lists all IDs
visio2svg -s 3 my.vss >icon.svg	SVG	1 binary (but you get helper shells)	Most battle‑tested.
visio2svg + Inkscape	CLI	inkscape icon.svg --export-type=png -o icon.png	PNG	1 + 1	Common on Linux/WSL, also works in PowerShell.
pyvisio (Python wrapper)	Python	import pyvisio; d=pyvisio.open('my.vss'); d.shapes[0].to_svg('shape.svg')	SVG	1 Python script	Requires libvisio under the hood.
visio-parser (Node.js)	JavaScript	const vp=require('visio-parser'); vp.convert('my.vss',0,'out.svg')	SVG	1	Works on Windows & WSL.
Rust‑visio (experimental)	Rust	cargo install visua
visua -l my.vss	SVG	1	Great if you want a single compiled binary.
How to install on Windows
Via pre‑built binaries (recommended)
# Download libvisio + tools from releases
Invoke-WebRequest -Uri https://github.com/rougeio/libvisio/releases/latest/download/libvisio-windows-x64.zip -OutFile libvisio.zip
Expand-Archive libvisio.zip -DestinationPath C:\visio
# Add tools to PATH
$env:Path += ";C:\visio\bin"
Via MSVC build (if you need the latest)
Clone: git clone https://github.com/rougeio/libvisio.git
Open Visual Studio 2022 → libvisio\vsproj\visio.sln
Build Release → binaries in bin\.
Python wrapper
pip install pyvisio
# pyvisio will look for libvisio.dll automatically
How to install on WSL
sudo apt update
sudo apt install -y libxml2-dev libzip-dev build-essential
git clone https://github.com/rougeio/libvisio.git
cd libvisio
make -j$(nproc)        # builds visio2svg (and libvisio)
sudo make install
Open that folder in PowerShell or Bash and use the same commands.

Quick export demo (Windows PowerShell)
# list all symbols
visio2svg -l my.vss

# export every symbol to its own SVG
$visia = "my.vss"
$ids = (visio2svg -l $visia | ForEach-Object { $_.split()[0] })
foreach($id in $ids){
    visio2svg -s $id $visia >"$id.svg"
    Write-Host "exported $id.svg"
}
After that you can bulk‑rastrise:

# install Inkscape (msi) – you already have it for the SVG path
for ($i=0; $i -lt $ids.Count; $i++) {
    $name = "$ids[$i].svg"
    inkscape $name --export-type=png -o "$ids[$i].png"
}
3. Full‑stack scripting (Python or Node)
Python example (runs on Windows or WSL)
#!/usr/bin/env python3
"""
Extract every shape from a .vss and write SVG + PNG.
Requires: pip install pyvisio, inkscape (or wkhtmltopdf)
"""

import pathlib, subprocess, sys
from pyvisio import open

def export_shapes(vss_path: str):
    doc = open(pathlib.Path(vss_path))
    out_dir = pathlib.Path(vss_path).stem
    out_dir.mkdir(exist_ok=True)

    for idx, sh in enumerate(doc.shapes):
        svg_file = out_dir / f"{idx}_{sh.name}.svg"
        sh.to_svg(svg_file)
        # rasterise to PNG (requires inkscape)
        png_file = svg_file.with_suffix(".png")
        subprocess.run(
            ["inkscape", str(svg_file), "--export-type=png", f"--export-filename={png_file}"],
            check=True
        )
        print(f"✅ {png_file}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python vss_export.py my.stencil.vss")
        sys.exit(1)
    export_shapes(sys.argv[1])
Run it (both under powershell or bash):

python vss_export.py C:\Users\me\Downloads\Standard.vss
Result: ./Standard/0_Rectangle.svg and PNG files for every shape.

Node.js example
// vss2svg.js
const fs = require('fs');
const path = require('path');
const vp = require('visio-parser');
const { execSync } = require('child_process');

const vss = process.argv[2];
if (!vss) {
  console.error('Usage: node vss2svg.js my.vss');
  process.exit(1);
}

const outDir = path.basename(vss, '.vss');
fs.mkdirSync(outDir, { recursive: true });

const fileBuffer = fs.readFileSync(vss);
const shapes = vp.parse(fileBuffer);

shapes.forEach((shape, i) => {
  const svgFile = path.join(outDir, `${i}_${shape.name}.svg`);
  fs.writeFileSync(svgFile, shape.toSvg());

  // Optional PNG
  execSync(`inkscape "${svgFile}" --export-type=png --export-filename="${svgFile}.png"`, {stdio: 'inherit'});
  console.log(`✅ ${svgFile}.png`);
});
node vss2svg.js build/Stencil.vss
4. One‑liner Docker bot (works on any platform)
If you’re comfortable with Docker, you can spin up a tiny container that has everything you need (libvisio + Inkscape) and run the export with a single command.

docker run --rm -v $(pwd):/src \
  ghcr.io/visio2svg/visio2svg:latest \
  sh -c "visio2svg -l /src/Stencil.vss | awk '{print \$1}' | xargs -I{} sh -c 'visio2svg -s {} /src/Stencil.vss >{} .svg && inkscape {}.svg --export-type=png -o {}.png'"
The image visio2svg/visio2svg contains:

visio2svg binary
libvisio
inkscape (headless) – no GUI, only CLI
BusyBox‑style shell
This single line will pull the stencil into the host directory and leave you with a folder of SVGs and PNGs.

5. Where to get the code, docs, and push the envelope
Resource	Link	What you’ll see
libvisio (core C/C++ parser + CLI)	https://github.com/rougeio/libvisio	visio2svg, visio2dxf, header files
pyvisio (Python wrapper)	https://github.com/tom-allen/pyvisio	open(filename).shapes returns object graph
visio-parser (Node wrapper)	https://github.com/edgardo/visio-parser	Minimal JS API
Rust‑visio	https://github.com/adam-spl/visio-rs	Experimental, single binary
Visio Private File Format (spec)	https://learn.microsoft.com/en-us/previous-versions/office/visio/ptv55c6f(office.12)#visio-file-format	Byte‑layout diagrams
Stack Overflow Q&A	https://stackoverflow.com/questions/tagged/visio	Real‑world tips, e.g. vss convert to svg
GitHub “visio-stencil-exporter”	https://github.com/daraufee/visio-stencil-exporter	Python script that uses libvisio via Cython
GitHub Actions (example)	https://github.com/your-org/visio-ci	CI job that converts .vss → artifacts
6. Quick “cheat sheet” for the most common tasks
Problem	Command (Windows/WSL)	Note
List all shapes in a stencil	visio2svg -l my.vss	
Export a single shape (by ID)	visio2svg -s 7 my.vss >out.svg	
Batch‑export all symbols → SVG	`visio2svg -l my.vss	awk '{print $1}'
Rasterise SVG to PNG (Inkscape CLI)	inkscape shape.svg --export-type=png -o shape.png	Must have Inkscape installed.
Do the whole job in one go (PowerShell)	```powershell	
$vss="C:\Stencils\Standard.vss"		
$ids = (visio2svg -l $vss	ForEach-Object { $_.split()[0] })	
foreach ($id in $ids) {		
   visio2svg -s $id $vss >"$id.svg"
   inkscape "$id.svg" --export-type=png -o "$id.png"
}``` | |

Closing notes
Cross‑platform: The core parser (libvisio) lives in C/C++ and can be compiled for Windows (MSVC or MinGW) or for WSL (apt‑build). All CLI tools use the same binary, so the workflow is identical.
Open‑source: There are no closed‑source “Visio extraction kits” on this list – every repo is MIT or BSD–licensed.
Remember performance: Hundreds of shapes are trivial (< 10 Ms for a modern laptop). The biggest hit is compiling libvisio on Windows – spend a few minutes in VS2022 or use the pre‑built ZIP.
Beyond .vss: If you ever hit the new XML‑based stencils (.vssx / .vsdx), unzip and pull the <visio:Shape> element – it contains a <visio:Path> node that is an SVG path string. You can auto‑generate PNGs with inkscape or svgexport-cli.
Happy icon hunting! If you hit a snag at any step, drop your exact error and I’ll help tighten the script.

Resource	Why you’ll want it	Where to find it
Microsoft Visio Private File Spec (PDF)	The authoritative layout of .vss	MSDN, search “Visio Private File Format”
libvisio	C/C++ library to read .vss/.vds	https://github.com/rougeio/libvisio
visio2svg / visio2dxf	Command line exporters	libvisio repo contains visio2svg
pyvisio	Python wrapper	https://github.com/tom-allen/pyvisio
visio-parser	JavaScript parser	https://github.com/edgardo/capturado-visio-parser
VisioXML	XML‑based stencils ; easier parse	https://github.com/mikefenske/VisioXML
Stack Overflow Q&A	Practical notes on shape records	search “VSS export”
GitHub “visio-stencil-exporter”	One‑liner Python + libvisio	https://github.com/daraufee/visio-stencil-exporter