# FortiAP/Switch Unified Dashboard - Copilot Instructions

**Purpose:** Help AI coding agents become immediately productive on this multi-service dashboard project.

## Project Overview

**Unified FortiAP/Switch Dashboard** integrates network device monitoring with a 3D visualization system.

**Core architecture:**
- **Backend**: Node.js/Express API server that aggregates FortiGate REST data
- **Frontend**: DOM-driven dashboard UI (single-page app in `app.js`)
- **API Gateway**: Shared bridge between Node.js and FortiGate/Python services
- **3D Visualizer**: Babylon.js-based network topology visualization with Python SNMP discovery

**Key insight:** Changes that modify API response shapes or add endpoints require coordination across `server.js` (backend), `app.js` (frontend consumer), and fallback cache files.

## Architecture & Data Flow

### Service Dependencies
