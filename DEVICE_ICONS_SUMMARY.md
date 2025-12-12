# Device Icons Implementation Summary

## Overview

All devices in the 3D topology now use SVG-based icons:

- **Fortinet Equipment**: SVG textures applied to 3D boxes (firewalls/switches) and cylinders (APs)
- **Connected Devices**: SVG textures applied to billboard planes (always face camera)

## Fortinet Equipment Icons

Fortinet equipment uses SVG files as textures on 3D geometric shapes:

- **Firewalls**: Box meshes with SVG textures (e.g., `fortigate_61f.svg`, `fortigate_100f.svg`)
- **Switches**: Box meshes with SVG textures (e.g., `fortiswitch_124e.svg`, `fortiswitch_148e.svg`)
- **Access Points**: Cylinder meshes with SVG textures (e.g., `fortiap_231f.svg`, `fortiap_431f.svg`)

The SVG files are mapped to the top face of boxes or wrapped around cylinders, creating a 3D appearance with device-specific branding.

## Connected Device Icons

Connected devices use SVG icons displayed as billboard planes. Icons are selected based on:

### Vendor-Based Icons (Priority 1)
- `device_apple.svg` - Apple devices
- `device_dell.svg` - Dell devices
- `device_hp.svg` - HP devices
- `device_lenovo.svg` - Lenovo devices
- `device_microsoft.svg` - Microsoft devices
- `device_samsung.svg` - Samsung devices
- `device_cisco.svg` - Cisco devices
- `device_fortinet.svg` - Fortinet devices

### Device Type-Based Icons (Priority 2)
- `device_laptop.svg` - Laptops
- `device_desktop.svg` - Desktop computers
- `device_mobile.svg` - Mobile devices
- `device_tablet.svg` - Tablets
- `device_phone.svg` - Phones
- `device_printer.svg` - Printers
- `device_server.svg` - Servers
- `device_router.svg` - Routers
- `device_network.svg` - Generic network devices
- `device_iot.svg` - IoT devices
- `device_camera.svg` - Cameras

### OS-Based Icons (Priority 3)
- `device_windows.svg` - Windows devices
- `device_mac.svg` - macOS devices
- `device_ios.svg` - iOS devices
- `device_android.svg` - Android devices
- `device_linux.svg` - Linux devices

### Default Icon
- `device_generic.svg` - Fallback for unknown devices

## Icon Location

All SVG icons are located in:
```
babylon_3d/babylon_app/network-visualizer/assets/textures/
```

## Implementation Details

### Fortinet Equipment Rendering
1. Device model is extracted from FortiGate API data
2. `DeviceConfig.getIconPath()` matches model to specific SVG file
3. SVG texture is applied to the top face of box (firewall/switch) or wrapped around cylinder (AP)
4. Texture uses alpha channel for transparency
5. Material uses white clay style with matte finish

### Connected Device Rendering
1. Device data (vendor, device_type, os_name) is extracted from connected devices API
2. `DeviceConfig.getIconPath()` matches vendor → type → OS → default
3. SVG texture is applied to a billboard plane (always faces camera)
4. Plane uses emissive texture for slight glow effect
5. Texture supports alpha channel for transparency

## Visual Characteristics

### Fortinet Equipment
- **Shape**: 3D geometric shapes (boxes/cylinders)
- **Texture**: SVG icons on top/wrapped surfaces
- **Material**: White clay with matte finish
- **Glow**: Subtle glow for online devices
- **Orientation**: Fixed in 3D space

### Connected Devices
- **Shape**: Billboard planes (2D planes that rotate to face camera)
- **Texture**: SVG icons covering entire plane
- **Material**: Emissive texture with slight glow
- **Glow**: Emissive color for visibility
- **Orientation**: Always faces camera (billboard mode)

## Benefits

1. **Device Recognition**: Users can quickly identify device types by their icons
2. **Brand Recognition**: Vendor logos help identify manufacturer
3. **Scalability**: SVG icons scale perfectly at any resolution
4. **Performance**: SVG textures are efficient and lightweight
5. **Consistency**: All devices use the same icon system

## Future Enhancements

- Add more vendor-specific icons
- Support custom icon uploads
- Animate device icons based on status
- Add device-specific colors based on status
- Support icon themes (light/dark mode)
