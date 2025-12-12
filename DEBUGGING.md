# Debugging Guide for FortiGate Dashboard

This guide explains how to debug the application, work with real FortiGate data, and create device-specific icons and layouts.

## Debugging Features

### 1. Enable Debug Mode

Debug mode can be enabled in several ways:

**Keyboard Shortcut:**
- Press `Ctrl+D` (or `Cmd+D` on Mac) to toggle debug mode
- When enabled, device information will be logged to the browser console

**Programmatically:**
```javascript
// In browser console
window.dashboard.setDebugMode(true);
```

### 2. Inspect Device Data

**View All Devices:**
```javascript
// In browser console
window.dashboard.debugAllDevices();
```

This will output:
- FortiGate information
- All FortiSwitches with their models, status, ports, POE info, and icon/layout mappings
- All FortiAPs with their models, status, clients, and icon/layout mappings
- Topology connection information

**Export Device Data:**
```javascript
// Export as JSON (prints to console)
window.dashboard.exportDeviceData('json');

// Export as formatted object
window.dashboard.exportDeviceData('console');
```

**Keyboard Shortcut:**
- Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) to export device data as JSON

### 3. Check API Connection

**Test API Endpoints:**

Open browser DevTools (F12) → Network tab, then check:
- `/api/fortiaps` - Should return array of FortiAP devices
- `/api/fortiswitches` - Should return array of FortiSwitch devices
- `/api/topology` - Should return complete network topology
- `/api/status` - Should return FortiGate connection status

**Server-side Debugging:**

Check server logs for:
- API request/response details
- Cache hits/misses
- Error messages
- Device model extraction

## Device-Specific Icons and Layouts

### How It Works

The application uses `device-config.js` to map device models to specific icons and 3D layouts.

**Icon Mapping:**
- Device models (e.g., "FG-61E", "FS-124E-POE", "FAP-221C") are matched against patterns
- If a match is found, the corresponding icon file is used
- If no match, a default icon is used

**Layout Mapping:**
- Each device model has specific 3D dimensions and shape
- FortiGate/FortiSwitch: Box shapes with width/height/depth
- FortiAP: Cylinder (indoor) or Box (outdoor) shapes

### Adding New Device Models

1. **Add Icon Mapping** in `device-config.js`:

```javascript
// In the iconMapping object, add to the appropriate device type:
switch: {
    patterns: {
        'FS-NEW-MODEL': 'fortiswitch_new_model.svg',
        // ... existing patterns
    }
}
```

2. **Add Layout Mapping** in `device-config.js`:

```javascript
// In the layoutMapping object:
switch: {
    patterns: {
        'FS-NEW-MODEL': {
            shape: 'box',
            width: 4.5,
            height: 0.9,
            depth: 2.4
        },
        // ... existing patterns
    }
}
```

3. **Add Icon File:**
   - Place SVG icon file in: `babylon_3d/babylon_app/network-visualizer/assets/textures/`
   - Name it according to your mapping (e.g., `fortiswitch_new_model.svg`)

### Icon File Requirements

- **Format:** SVG (recommended) or PNG
- **Size:** Recommended 512x512px or higher for quality
- **Transparency:** Supported (SVG with alpha channel)
- **Naming:** Use lowercase with underscores (e.g., `fortigate_61e.svg`)

### Layout Guidelines

**FortiGate (Firewall):**
- Desktop models (60E, 61E, 100E): width 2.3-2.8, height 0.7-1.0
- Mid-range (200E, 500E): width 3.0-3.5, height 1.2-1.5
- High-end (1000E, 2000E): width 4.0-4.5, height 1.8-2.0

**FortiSwitch:**
- Small (108E): width 2.5, height 0.6-0.7
- Medium (124E, 148E): width 4.0-4.5, height 0.8-0.9
- Large (224E, 248E): width 5.0-5.5, height 1.0-1.1
- Enterprise (448E, 524E, 548E): width 6.0-7.0, height 1.2-1.5

**FortiAP:**
- Indoor (puck): cylinder, diameter 1.8-2.2, height 0.4-0.6
- Outdoor: box, width 1.5-1.8, height 0.3, depth 1.5-1.8

## Troubleshooting

### Icons Not Showing

1. **Check File Path:**
   - Verify icon files exist in `babylon_3d/babylon_app/network-visualizer/assets/textures/`
   - Check browser console for 404 errors

2. **Check Model Matching:**
   - Enable debug mode: `window.dashboard.setDebugMode(true)`
   - Check console for device model values
   - Verify model string matches pattern in `device-config.js`

3. **Fallback Behavior:**
   - If icon fails to load, device will use default material (gray color)
   - Check console for texture loading errors

### Layout Issues

1. **Devices Too Large/Small:**
   - Adjust dimensions in `device-config.js` layout mapping
   - Values are in Babylon.js units (roughly meters)

2. **Wrong Shape:**
   - Verify `shape` property matches device type
   - Indoor APs should be `cylinder`, outdoor APs should be `box`

### API Data Issues

1. **No Devices Showing:**
   - Check `/api/status` endpoint for connection status
   - Verify FortiGate credentials in `.env` file
   - Check server logs for API errors

2. **Wrong Device Models:**
   - Check server.js `transformFortiAPData()` and `transformFortiSwitchData()` functions
   - Verify API response structure matches expected format
   - Enable debug mode to see raw device data

3. **Missing Device Information:**
   - Check FortiGate API endpoint responses
   - Verify API permissions for REST API user
   - Some fields may not be available depending on FortiOS version

## Testing with Real Data

### 1. Verify API Connection

```bash
# Test API endpoint directly
curl -k -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://YOUR_FORTIGATE_IP:443/api/v2/monitor/system/status
```

### 2. Check Device Models

After loading data, check browser console:
```javascript
// See all switch models
window.dashboard.data.fortiswitches.map(s => s.model)

// See all AP models
window.dashboard.data.fortiaps.map(a => a.model)
```

### 3. Test Icon Mapping

```javascript
// Test icon path for a specific model
const config = new DeviceConfig();
console.log(config.getIconPath('switch', 'FS-124E-POE'));
console.log(config.getLayout('switch', 'FS-124E-POE'));
```

## Environment Variables

Ensure `.env` file contains:
```
FORTIGATE_HOST=your-fortigate-ip
FORTIGATE_PORT=443
FORTIGATE_API_TOKEN=your-api-token
FORTIGATE_VERIFY_SSL=false  # Set to true in production
```

## Next Steps

1. **Add Your Device Icons:**
   - Create SVG icons for your specific device models
   - Place them in the textures directory
   - Update `device-config.js` with mappings

2. **Customize Layouts:**
   - Adjust dimensions in `device-config.js` to match your devices
   - Test in 3D topology view

3. **Monitor Debug Output:**
   - Keep debug mode enabled during development
   - Use `debugAllDevices()` to verify data structure
   - Check for missing or incorrect model strings
