# Connected Devices Icons in 3D Topology

## Overview

Connected devices (endpoints/clients) in the 3D topology now use device-specific SVG icons displayed as billboard planes, similar to how infrastructure devices use their specific icons.

## Icon Selection Logic

The system selects icons based on device information in the following priority order:

1. **Vendor** (highest priority)
   - Apple → `device_apple.svg`
   - Dell → `device_dell.svg`
   - HP → `device_hp.svg`
   - Lenovo → `device_lenovo.svg`
   - Microsoft → `device_microsoft.svg`
   - Samsung → `device_samsung.svg`
   - Cisco → `device_cisco.svg`
   - Fortinet → `device_fortinet.svg`

2. **Device Type** (if vendor not matched)
   - Laptop → `device_laptop.svg`
   - Desktop → `device_desktop.svg`
   - Mobile Device → `device_mobile.svg`
   - Tablet → `device_tablet.svg`
   - Phone → `device_phone.svg`
   - Printer → `device_printer.svg`
   - Server → `device_server.svg`
   - Router → `device_router.svg`
   - Network Generic → `device_network.svg`
   - IoT Device → `device_iot.svg`
   - Camera → `device_camera.svg`

3. **Operating System** (fallback)
   - Windows → `device_windows.svg`
   - macOS → `device_mac.svg`
   - iOS → `device_ios.svg`
   - Android → `device_android.svg`
   - Linux → `device_linux.svg`

4. **Default** (if nothing matches)
   - `device_generic.svg`

## Required Icon Files

Place the following SVG icon files in:
```
babylon_3d/babylon_app/network-visualizer/assets/textures/
```

### Vendor Icons
- `device_apple.svg`
- `device_dell.svg`
- `device_hp.svg`
- `device_lenovo.svg`
- `device_microsoft.svg`
- `device_samsung.svg`
- `device_cisco.svg`
- `device_fortinet.svg`

### Device Type Icons
- `device_laptop.svg`
- `device_desktop.svg`
- `device_mobile.svg`
- `device_tablet.svg`
- `device_phone.svg`
- `device_printer.svg`
- `device_server.svg`
- `device_router.svg`
- `device_network.svg`
- `device_iot.svg`
- `device_camera.svg`

### OS Icons
- `device_windows.svg`
- `device_mac.svg`
- `device_ios.svg`
- `device_android.svg`
- `device_linux.svg`

### Default
- `device_generic.svg`

## Visual Implementation

### 3D Rendering
- Connected devices are rendered as **billboard planes** (always face the camera)
- Plane dimensions: 1.0 x 1.0 units
- Icons use emissive texture for slight glow effect
- Icons support transparency (alpha channel)

### Positioning
- Wired devices appear below their connected switch
- Wireless devices appear below their connected AP
- Devices are spaced horizontally to avoid overlap

## Adding New Icon Mappings

To add new vendor/type/OS mappings, edit `device-config.js`:

```javascript
endpoint: {
    vendors: {
        'NewVendor': 'device_newvendor.svg'
    },
    types: {
        'NewType': 'device_newtype.svg'
    },
    os: {
        'NewOS': 'device_newos.svg'
    }
}
```

## Fallback Behavior

If an icon file is missing:
1. The system will attempt to load the SVG texture
2. On failure, it will fall back to a colored material:
   - Green for online devices
   - Red for offline devices
3. A warning will be logged to the console

## Testing

To verify icon loading:
1. Open browser developer console
2. Navigate to 3D Topology tab
3. Check for texture loading warnings
4. Verify devices display with appropriate icons based on their vendor/type/OS

## Notes

- Icon matching is case-insensitive
- Partial matches are supported (e.g., "Apple Inc." matches "Apple")
- The system prioritizes vendor over type over OS
- All icons should be SVG format for best quality and scalability
