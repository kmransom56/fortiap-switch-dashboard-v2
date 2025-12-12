# Device-Specific Icons and Layouts Configuration

## Overview

The dashboard now supports device-specific icons and 3D layouts based on actual FortiGate device models. This allows for accurate visual representation of your network infrastructure.

## Files Created/Modified

### New Files
1. **`device-config.js`** - Device configuration module with icon and layout mappings
2. **`DEBUGGING.md`** - Comprehensive debugging guide
3. **`test-api-connection.js`** - Script to test FortiGate API connection

### Modified Files
1. **`app.js`** - Updated to use device-specific icons and layouts
2. **`index.html`** - Added script tag for device-config.js

## How It Works

### 1. Device Model Detection

The application extracts device models from FortiGate API responses:
- **FortiGate**: From system status
- **FortiSwitch**: From `sw.model` field
- **FortiAP**: From `ap.os_version` field (parsed)

### 2. Icon Mapping

When rendering a device, the system:
1. Extracts the device model (e.g., "FS-124E-POE", "FAP-221C")
2. Matches it against known patterns in `device-config.js`
3. Uses the mapped icon file, or falls back to default

### 3. Layout Mapping

Similarly, device-specific 3D dimensions are applied:
- **Box shapes** (FortiGate/FortiSwitch): width, height, depth
- **Cylinder shapes** (Indoor FortiAPs): height, diameter
- **Box shapes** (Outdoor FortiAPs): width, height, depth

## Quick Start

### 1. Test API Connection

```bash
node test-api-connection.js
```

This will verify:
- FortiGate API connectivity
- API token validity
- Available devices and their models

### 2. Enable Debug Mode

In browser console:
```javascript
window.dashboard.setDebugMode(true);
```

Or press `Ctrl+D` (or `Cmd+D` on Mac)

### 3. Inspect Devices

```javascript
// View all devices with their configurations
window.dashboard.debugAllDevices();

// Export device data as JSON
window.dashboard.exportDeviceData('json');
```

## Adding Device Icons

### Step 1: Create Icon File

1. Create SVG icon (recommended) or PNG
2. Place in: `babylon_3d/babylon_app/network-visualizer/assets/textures/`
3. Name it descriptively (e.g., `fortiswitch_124e_poe.svg`)

### Step 2: Update device-config.js

Add to the appropriate section:

```javascript
switch: {
    patterns: {
        'FS-124E-POE': 'fortiswitch_124e_poe.svg',  // Add this line
        // ... existing patterns
    }
}
```

### Step 3: Test

1. Refresh the dashboard
2. Enable debug mode
3. Check console for icon path
4. Verify icon loads in 3D topology view

## Adding Device Layouts

### Step 1: Determine Dimensions

Measure or estimate device dimensions:
- Desktop devices: ~2-3 units wide
- Rack-mounted: ~4-8 units wide
- Height: typically 0.6-2.0 units

### Step 2: Update device-config.js

Add to layout mapping:

```javascript
switch: {
    patterns: {
        'FS-124E-POE': {
            shape: 'box',
            width: 4.0,
            height: 0.9,  // Slightly taller for POE
            depth: 2.2
        },
        // ... existing patterns
    }
}
```

### Step 3: Test in 3D View

1. Navigate to "3D Topology" tab
2. Verify device size matches expectations
3. Adjust dimensions if needed

## Supported Device Models

### FortiGate Models
- 60E, 61E, 100E, 200E, 500E, 1000E, 2000E
- 60F, 61F, 100F, 200F, 500F, 1000F, 2000F
- 60G, 61G, 100G, 200G, 500G, 1000G, 2000G

### FortiSwitch Models
- 108E, 108E-POE
- 124E, 124E-POE
- 148E, 148E-POE
- 224E, 224E-POE
- 248E, 248E-POE
- 448E, 448E-POE
- 524E, 548E
- 1024E, 1048E

### FortiAP Models
- Indoor: 221C, 221E, 223C, 223E, 224E, 231C, 231E, 231F, 233C, 233E, 234E, 421E, 423E, 431F, 433F
- Outdoor: U431F, U433F, U434F, U436F, U441C, U441E, U443C, U443E, U444E, U451E, U453E, U454E, U461E, U463E, U464E

## Debugging Tips

### Device Model Not Recognized

1. Check actual model string:
   ```javascript
   window.dashboard.data.fortiswitches[0].model
   ```

2. Verify pattern matching:
   - Model strings are converted to uppercase
   - Partial matches work (e.g., "FS-124E-POE" matches "FS-124E")
   - Add more specific patterns if needed

### Icon Not Loading

1. Check file path in console
2. Verify file exists in textures directory
3. Check browser Network tab for 404 errors
4. Ensure SVG is valid (open in browser)

### Layout Issues

1. Devices too large/small: Adjust dimensions in `device-config.js`
2. Wrong shape: Verify `shape` property matches device type
3. Overlapping devices: Adjust spacing in `create3DNetwork()` function

## Keyboard Shortcuts

- `Ctrl+D` / `Cmd+D` - Toggle debug mode
- `Ctrl+Shift+D` / `Cmd+Shift+D` - Export device data as JSON

## Next Steps

1. **Add Your Device Icons:**
   - Create icons for your specific models
   - Update `device-config.js` mappings

2. **Customize Layouts:**
   - Adjust dimensions to match your devices
   - Test in 3D topology view

3. **Monitor Real Data:**
   - Use debug mode to verify device models
   - Check API responses for accuracy
   - Update mappings as needed

## Support

For issues or questions:
1. Check `DEBUGGING.md` for troubleshooting
2. Enable debug mode and check console output
3. Verify API connection with `test-api-connection.js`
4. Review server logs for API errors
