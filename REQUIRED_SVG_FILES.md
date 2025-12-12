# Required SVG Icon Files

This document lists all SVG icon files that need to be created for accurate device representation.

## Summary

- **FortiGate Models**: 18 SVG files
- **FortiSwitch Models**: 14 SVG files  
- **FortiAP Models**: 28 SVG files
- **Default Icons**: 3 SVG files
- **Total**: 63 SVG files

## FortiGate Icons (18 files)

### Default
- `real_fortigate.svg` (fallback/default)

### E Series
- `fortigate_60e.svg`
- `fortigate_61e.svg`
- `fortigate_100e.svg`
- `fortigate_200e.svg`
- `fortigate_500e.svg`
- `fortigate_1000e.svg`
- `fortigate_2000e.svg`

### F Series
- `fortigate_60f.svg`
- `fortigate_61f.svg`
- `fortigate_100f.svg`
- `fortigate_200f.svg`
- `fortigate_500f.svg`
- `fortigate_1000f.svg`
- `fortigate_2000f.svg`

### G Series
- `fortigate_60g.svg`
- `fortigate_61g.svg`
- `fortigate_100g.svg`
- `fortigate_200g.svg`
- `fortigate_500g.svg`
- `fortigate_1000g.svg`
- `fortigate_2000g.svg`

## FortiSwitch Icons (14 files)

### Default
- `real_fortiswitch.svg` (fallback/default)

### Models
- `fortiswitch_108e.svg`
- `fortiswitch_108e_poe.svg`
- `fortiswitch_124e.svg`
- `fortiswitch_124e_poe.svg`
- `fortiswitch_148e.svg`
- `fortiswitch_148e_poe.svg`
- `fortiswitch_224e.svg`
- `fortiswitch_224e_poe.svg`
- `fortiswitch_248e.svg`
- `fortiswitch_248e_poe.svg`
- `fortiswitch_448e.svg`
- `fortiswitch_448e_poe.svg`
- `fortiswitch_524e.svg`
- `fortiswitch_548e.svg`
- `fortiswitch_1024e.svg`
- `fortiswitch_1048e.svg`

## FortiAP Icons (28 files)

### Default
- `real_fortiap.svg` (fallback/default)

### Indoor Models (Cylinder/Puck Shape)
- `fortiap_221c.svg`
- `fortiap_221e.svg`
- `fortiap_223c.svg`
- `fortiap_223e.svg`
- `fortiap_224e.svg`
- `fortiap_231c.svg`
- `fortiap_231e.svg`
- `fortiap_231f.svg`
- `fortiap_233c.svg`
- `fortiap_233e.svg`
- `fortiap_234e.svg`
- `fortiap_421e.svg`
- `fortiap_423e.svg`
- `fortiap_431f.svg`
- `fortiap_433f.svg`

### Outdoor Models (Box Shape)
- `fortiap_u431f.svg`
- `fortiap_u433f.svg`
- `fortiap_u434f.svg`
- `fortiap_u436f.svg`
- `fortiap_u441c.svg`
- `fortiap_u441e.svg`
- `fortiap_u443c.svg`
- `fortiap_u443e.svg`
- `fortiap_u444e.svg`
- `fortiap_u451e.svg`
- `fortiap_u453e.svg`
- `fortiap_u454e.svg`
- `fortiap_u461e.svg`
- `fortiap_u463e.svg`
- `fortiap_u464e.svg`

## VSS to SVG Mapping Guide

When converting from Visio Stencil (VSS) files, you'll need to map Visio shape names to the SVG filenames above.

### Common Visio Shape Naming Patterns

**FortiGate:**
- Visio shape: "FortiGate 61E" → SVG: `fortigate_61e.svg`
- Visio shape: "FG-61E" → SVG: `fortigate_61e.svg`
- Pattern: Convert to lowercase, replace spaces/hyphens with underscores

**FortiSwitch:**
- Visio shape: "FortiSwitch 124E POE" → SVG: `fortiswitch_124e_poe.svg`
- Visio shape: "FS-124E-POE" → SVG: `fortiswitch_124e_poe.svg`
- Pattern: Convert to lowercase, replace spaces/hyphens with underscores

**FortiAP:**
- Visio shape: "FortiAP 221C" → SVG: `fortiap_221c.svg`
- Visio shape: "FAP-221C" → SVG: `fortiap_221c.svg`
- Visio shape: "FortiAP U431F" → SVG: `fortiap_u431f.svg`
- Pattern: Convert to lowercase, replace spaces/hyphens with underscores

## File Location

All SVG files should be placed in:
```
babylon_3d/babylon_app/network-visualizer/assets/textures/
```

## SVG Requirements

- **Format**: SVG (vector graphics)
- **Size**: Recommended 512x512px viewBox or larger
- **Transparency**: Supported (use transparent background)
- **Colors**: Preserve original device colors
- **Optimization**: Can be optimized with SVGO or similar tools
- **Naming**: Use lowercase with underscores (snake_case)

## Priority Order

If you can't create all icons immediately, prioritize:

1. **Default icons** (3 files) - Required for fallback
   - `real_fortigate.svg`
   - `real_fortiswitch.svg`
   - `real_fortiap.svg`

2. **Most common models** - Based on your actual devices
   - Check your FortiGate API to see which models you have
   - Use: `window.dashboard.debugAllDevices()` to see your models

3. **All models** - Complete the full set for comprehensive coverage
