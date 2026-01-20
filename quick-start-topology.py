#!/usr/bin/env python3
"""
Quick Start Script for Network Topology
Python equivalent of quick-start-topology.ps1
This script will set up and launch your network topology viewer
"""

import os
import sys
import subprocess
import time
import webbrowser
import urllib.request
import urllib.error
import signal
from pathlib import Path
from typing import Optional

# Color codes for terminal output
class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    GRAY = '\033[90m'
    RESET = '\033[0m'

def print_header():
    """Print the startup header"""
    print()
    print(f"{Colors.CYAN}╔══════════════════════════════════════════════════╗{Colors.RESET}")
    print(f"{Colors.CYAN}║   Network Topology Quick Start                   ║{Colors.RESET}")
    print(f"{Colors.CYAN}╚══════════════════════════════════════════════════╝{Colors.RESET}")
    print()

def print_step(step_num: int, message: str):
    """Print a step message"""
    print(f"{Colors.YELLOW}📋 Step {step_num}: {message}{Colors.RESET}")

def print_success(message: str):
    """Print a success message"""
    print(f"   {Colors.GREEN}✅ {message}{Colors.RESET}")

def print_error(message: str):
    """Print an error message"""
    print(f"   {Colors.RED}❌ {message}{Colors.RESET}")

def print_warning(message: str):
    """Print a warning message"""
    print(f"   {Colors.YELLOW}⚠️  {message}{Colors.RESET}")

def print_info(message: str):
    """Print an info message"""
    print(f"   {Colors.CYAN}ℹ️  {message}{Colors.RESET}")

def check_required_files(project_dir: Path) -> bool:
    """Check if all required files exist"""
    print_step(1, "Checking required files...")
    
    required_files = [
        "topology-standalone.html",
        "test-topology-server.js",
        "network-topology.js"
    ]
    
    missing_files = []
    for filename in required_files:
        file_path = project_dir / filename
        if file_path.exists():
            print_success(f"Found: {filename}")
        else:
            print_error(f"Missing: {filename}")
            missing_files.append(filename)
    
    if missing_files:
        print()
        print_warning("Some files are missing. Please download them from the chat.")
        print(f"   {Colors.YELLOW}Missing files: {', '.join(missing_files)}{Colors.RESET}")
        return False
    
    return True

def check_network_icons(project_dir: Path) -> None:
    """Check if network icons exist"""
    print()
    print_step(2, "Checking for network icons...")
    
    icons_dir = project_dir / "drawio" / "fortinet_icons"
    
    if icons_dir.exists():
        svg_files = list(icons_dir.glob("*.svg"))
        if svg_files:
            print_success(f"Found {len(svg_files)} SVG icons")
        else:
            print_warning("No icons found. Run VSS converter to generate icons.")
            print(f"   {Colors.GRAY}python drawio/vss-to-svg-converter.py --batch drawio/fortinet_visio drawio/fortinet_icons{Colors.RESET}")
    else:
        print_info("Icons directory not found. You can generate icons later.")

def check_nodejs() -> bool:
    """Check if Node.js is installed"""
    print()
    print_step(3, "Checking Node.js...")
    
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            node_version = result.stdout.strip()
            print_success(f"Node.js installed: {node_version}")
            return True
    except FileNotFoundError:
        pass
    
    print_error("Node.js not found")
    print(f"   {Colors.YELLOW}Please install Node.js from: https://nodejs.org/{Colors.RESET}")
    return False

def kill_existing_process(port: int = 3000) -> None:
    """Kill any existing process on the specified port"""
    try:
        if sys.platform == "win32":
            result = subprocess.run(
                f"netstat -ano | findstr :{port}",
                shell=True,
                capture_output=True,
                text=True
            )
            if result.stdout:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    parts = line.split()
                    if parts:
                        pid = parts[-1]
                        try:
                            subprocess.run(f"taskkill /PID {pid} /F", shell=True)
                            print_warning(f"Stopped existing process on port {port}")
                        except:
                            pass
        else:
            result = subprocess.run(
                f"lsof -ti :{port}",
                shell=True,
                capture_output=True,
                text=True
            )
            if result.stdout:
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    if pid:
                        try:
                            os.kill(int(pid), signal.SIGTERM)
                            print_warning(f"Stopped existing process on port {port}")
                        except:
                            pass
    except Exception:
        pass

def is_server_running(port: int = 3000, timeout: int = 2) -> bool:
    """Check if the server is running"""
    url = f"http://localhost:{port}"
    try:
        urllib.request.urlopen(url, timeout=timeout)
        return True
    except (urllib.error.URLError, urllib.error.HTTPError):
        return False
    except Exception:
        return False

def start_server(project_dir: Path) -> Optional[subprocess.Popen]:
    """Start the test server in the background"""
    print()
    print_step(4, "Starting test server...")
    print()
    
    kill_existing_process(3000)
    
    print(f"   {Colors.CYAN}Starting server...{Colors.RESET}")
    
    try:
        process = subprocess.Popen(
            ["node", "test-topology-server.js"],
            cwd=str(project_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        time.sleep(2)
        
        server_running = False
        for i in range(5):
            if is_server_running(3000):
                server_running = True
                break
            time.sleep(1)
        
        if server_running:
            print_success("Server is running!")
            return process
        else:
            print_warning("Server may not have started correctly")
            print(f"   {Colors.YELLOW}Check for errors below:{Colors.RESET}")
            return process
    
    except Exception as e:
        print_error(f"Failed to start server: {e}")
        return None

def print_ready_message():
    """Print the ready message"""
    print()
    print(f"{Colors.GREEN}╔══════════════════════════════════════════════════╗{Colors.RESET}")
    print(f"{Colors.GREEN}║              🎉 Ready to View!                   ║{Colors.RESET}")
    print(f"{Colors.GREEN}╚══════════════════════════════════════════════════╝{Colors.RESET}")
    print()
    print(f"  {Colors.CYAN}🌐 Opening topology viewer...{Colors.RESET}")
    print(f"     {Colors.GRAY}URL: http://localhost:3000/topology-standalone.html{Colors.RESET}")
    print()
    print(f"  {Colors.YELLOW}📝 Tips:{Colors.RESET}")
    print(f"     {Colors.GRAY}• Drag nodes to rearrange{Colors.RESET}")
    print(f"     {Colors.GRAY}• Click nodes to see details{Colors.RESET}")
    print(f"     {Colors.GRAY}• Use 'Fit to Screen' to zoom to all nodes{Colors.RESET}")
    print(f"     {Colors.GRAY}• Use 'Reset Layout' to rearrange nodes{Colors.RESET}")
    print()
    print(f"  {Colors.YELLOW}⏹️  To stop the server:{Colors.RESET}")
    print(f"     {Colors.GRAY}Press Ctrl+C to stop{Colors.RESET}")
    print()

def show_server_logs(process: subprocess.Popen) -> None:
    """Show server logs in real-time"""
    print(f"  {Colors.CYAN}📊 Server logs (press Ctrl+C to stop):{Colors.RESET}")
    print(f"  {Colors.GRAY}{'─' * 50}{Colors.RESET}")
    
    try:
        while True:
            line = process.stdout.readline()
            if line:
                print(f"  {line.rstrip()}")
            else:
                break
            time.sleep(0.1)
    except KeyboardInterrupt:
        print()
        print(f"  {Colors.YELLOW}⚠️  Server stopped by user{Colors.RESET}")

def main():
    """Main function"""
    print_header()
    
    project_dir = Path.cwd()
    
    if not (project_dir / "test-topology-server.js").exists():
        script_dir = Path(__file__).parent.absolute()
        if (script_dir / "test-topology-server.js").exists():
            project_dir = script_dir
        else:
            print_error(f"Project directory not found: {project_dir}")
            print(f"{Colors.YELLOW}Please run this script from the project root directory{Colors.RESET}")
            sys.exit(1)
    
    print(f"Project directory: {project_dir}")
    os.chdir(project_dir)
    
    if not check_required_files(project_dir):
        sys.exit(1)
    
    check_network_icons(project_dir)
    
    if not check_nodejs():
        sys.exit(1)
    
    process = start_server(project_dir)
    if not process:
        sys.exit(1)
    
    print_ready_message()
    
    time.sleep(1)
    try:
        webbrowser.open("http://localhost:3000/topology-standalone.html")
    except Exception as e:
        print_warning(f"Could not open browser automatically: {e}")
        print(f"   {Colors.GRAY}Please open manually: http://localhost:3000/topology-standalone.html{Colors.RESET}")
    
    show_server_logs(process)
    
    try:
        process.terminate()
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print(f"{Colors.YELLOW}Script interrupted by user{Colors.RESET}")
        sys.exit(0)
