/**
 * Device Configuration Module
 * Maps device models to specific icons, layouts, and visual properties
 *
 * This allows for device-specific rendering based on actual FortiGate device models
 */

class DeviceConfig {
  constructor() {
    // Device icon mapping: model pattern -> icon filename
    this.iconMapping = {
      // FortiGate models
      firewall: {
        default: 'real_fortigate.svg',
        patterns: {
          'FG-61E': 'fortigate_61e.svg',
          'FG-60E': 'fortigate_60e.svg',
          'FG-100E': 'fortigate_100e.svg',
          'FG-200E': 'fortigate_200e.svg',
          'FG-500E': 'fortigate_500e.svg',
          'FG-1000E': 'fortigate_1000e.svg',
          'FG-2000E': 'fortigate_2000e.svg',
          'FG-60F': 'fortigate_60f.svg',
          'FG-61F': 'fortigate_61f.svg',
          'FG-100F': 'fortigate_100f.svg',
          'FG-200F': 'fortigate_200f.svg',
          'FG-500F': 'fortigate_500f.svg',
          'FG-1000F': 'fortigate_1000f.svg',
          'FG-2000F': 'fortigate_2000f.svg',
          'FG-60G': 'fortigate_60g.svg',
          'FG-61G': 'fortigate_61g.svg',
          'FG-100G': 'fortigate_100g.svg',
          'FG-200G': 'fortigate_200g.svg',
          'FG-500G': 'fortigate_500g.svg',
          'FG-1000G': 'fortigate_1000g.svg',
          'FG-2000G': 'fortigate_2000g.svg'
        }
      },
      // FortiSwitch models
      switch: {
        default: 'real_fortiswitch.svg',
        patterns: {
          'FS-108E': 'fortiswitch_108e.svg',
          'FS-108E-POE': 'fortiswitch_108e_poe.svg',
          'FS-124E': 'fortiswitch_124e.svg',
          'FS-124E-POE': 'fortiswitch_124e_poe.svg',
          'FS-148E': 'fortiswitch_148e.svg',
          'FS-148E-POE': 'fortiswitch_148e_poe.svg',
          'FS-224E': 'fortiswitch_224e.svg',
          'FS-224E-POE': 'fortiswitch_224e_poe.svg',
          'FS-248E': 'fortiswitch_248e.svg',
          'FS-248E-POE': 'fortiswitch_248e_poe.svg',
          'FS-448E': 'fortiswitch_448e.svg',
          'FS-448E-POE': 'fortiswitch_448e_poe.svg',
          'FS-524E': 'fortiswitch_524e.svg',
          'FS-548E': 'fortiswitch_548e.svg',
          'FS-1024E': 'fortiswitch_1024e.svg',
          'FS-1048E': 'fortiswitch_1048e.svg'
        }
      },
      // FortiAP models
      access_point: {
        default: 'real_fortiap.svg',
        patterns: {
          'FAP-221C': 'fortiap_221c.svg',
          'FAP-221E': 'fortiap_221e.svg',
          'FAP-223C': 'fortiap_223c.svg',
          'FAP-223E': 'fortiap_223e.svg',
          'FAP-224E': 'fortiap_224e.svg',
          'FAP-231C': 'fortiap_231c.svg',
          'FAP-231E': 'fortiap_231e.svg',
          'FAP-231F': 'fortiap_231f.svg',
          'FAP-233C': 'fortiap_233c.svg',
          'FAP-233E': 'fortiap_233e.svg',
          'FAP-234E': 'fortiap_234e.svg',
          'FAP-421E': 'fortiap_421e.svg',
          'FAP-423E': 'fortiap_423e.svg',
          'FAP-431F': 'fortiap_431f.svg',
          'FAP-433F': 'fortiap_433f.svg',
          'FAP-U431F': 'fortiap_u431f.svg',
          'FAP-U433F': 'fortiap_u433f.svg',
          'FAP-U434F': 'fortiap_u434f.svg',
          'FAP-U436F': 'fortiap_u436f.svg',
          'FAP-U441C': 'fortiap_u441c.svg',
          'FAP-U441E': 'fortiap_u441e.svg',
          'FAP-U443C': 'fortiap_u443c.svg',
          'FAP-U443E': 'fortiap_u443e.svg',
          'FAP-U444E': 'fortiap_u444e.svg',
          'FAP-U451E': 'fortiap_u451e.svg',
          'FAP-U453E': 'fortiap_u453e.svg',
          'FAP-U454E': 'fortiap_u454e.svg',
          'FAP-U461E': 'fortiap_u461e.svg',
          'FAP-U463E': 'fortiap_u463e.svg',
          'FAP-U464E': 'fortiap_u464e.svg',
          'FAP-U431F': 'fortiap_u431f.svg',
          'FAP-U433F': 'fortiap_u433f.svg',
          'FAP-U434F': 'fortiap_u434f.svg',
          'FAP-U436F': 'fortiap_u436f.svg'
        }
      }
    };

    // Device layout mapping: model pattern -> dimensions and shape
    this.layoutMapping = {
      firewall: {
        default: {
          shape: 'box',
          width: 2.5,
          height: 0.8,
          depth: 2.2
        },
        patterns: {
          'FG-61E': { shape: 'box', width: 2.5, height: 0.8, depth: 2.2 },
          'FG-60E': { shape: 'box', width: 2.3, height: 0.7, depth: 2.0 },
          'FG-100E': { shape: 'box', width: 2.8, height: 1.0, depth: 2.5 },
          'FG-200E': { shape: 'box', width: 3.0, height: 1.2, depth: 2.8 },
          'FG-500E': { shape: 'box', width: 3.5, height: 1.5, depth: 3.2 },
          'FG-1000E': { shape: 'box', width: 4.0, height: 1.8, depth: 3.5 },
          'FG-2000E': { shape: 'box', width: 4.5, height: 2.0, depth: 4.0 },
          'FG-60F': { shape: 'box', width: 2.3, height: 0.7, depth: 2.0 },
          'FG-61F': { shape: 'box', width: 2.5, height: 0.8, depth: 2.2 },
          'FG-100F': { shape: 'box', width: 2.8, height: 1.0, depth: 2.5 },
          'FG-200F': { shape: 'box', width: 3.0, height: 1.2, depth: 2.8 },
          'FG-500F': { shape: 'box', width: 3.5, height: 1.5, depth: 3.2 },
          'FG-1000F': { shape: 'box', width: 4.0, height: 1.8, depth: 3.5 },
          'FG-2000F': { shape: 'box', width: 4.5, height: 2.0, depth: 4.0 }
        }
      },
      switch: {
        default: {
          shape: 'box',
          width: 4.0,
          height: 0.8,
          depth: 2.2
        },
        patterns: {
          'FS-108E': { shape: 'box', width: 2.5, height: 0.6, depth: 1.8 },
          'FS-108E-POE': { shape: 'box', width: 2.5, height: 0.7, depth: 1.8 },
          'FS-124E': { shape: 'box', width: 4.0, height: 0.8, depth: 2.2 },
          'FS-124E-POE': { shape: 'box', width: 4.0, height: 0.9, depth: 2.2 },
          'FS-148E': { shape: 'box', width: 4.5, height: 0.8, depth: 2.4 },
          'FS-148E-POE': { shape: 'box', width: 4.5, height: 0.9, depth: 2.4 },
          'FS-224E': { shape: 'box', width: 5.0, height: 1.0, depth: 2.6 },
          'FS-224E-POE': { shape: 'box', width: 5.0, height: 1.1, depth: 2.6 },
          'FS-248E': { shape: 'box', width: 5.5, height: 1.0, depth: 2.8 },
          'FS-248E-POE': { shape: 'box', width: 5.5, height: 1.1, depth: 2.8 },
          'FS-448E': { shape: 'box', width: 6.0, height: 1.2, depth: 3.0 },
          'FS-448E-POE': { shape: 'box', width: 6.0, height: 1.3, depth: 3.0 },
          'FS-524E': { shape: 'box', width: 6.5, height: 1.4, depth: 3.2 },
          'FS-548E': { shape: 'box', width: 7.0, height: 1.5, depth: 3.4 },
          'FS-1024E': { shape: 'box', width: 8.0, height: 1.8, depth: 3.8 },
          'FS-1048E': { shape: 'box', width: 8.5, height: 2.0, depth: 4.0 }
        }
      },
      access_point: {
        default: {
          shape: 'cylinder',
          height: 0.5,
          diameter: 2.0
        }
      },
      endpoint: {
        default: {
          shape: 'plane',
          width: 1.0,
          height: 1.0
        }
      },
      client: {
        default: {
          shape: 'plane',
          width: 1.0,
          height: 1.0
        }
      }
    };

    // Original layout mapping continues...
    this.layoutMapping = {
      firewall: {
        default: {
          shape: 'box',
          width: 2.5,
          height: 0.8,
          depth: 2.2
        },
        patterns: {
          // Indoor APs (typically cylindrical/puck)
          'FAP-221C': { shape: 'cylinder', height: 0.4, diameter: 1.8 },
          'FAP-221E': { shape: 'cylinder', height: 0.4, diameter: 1.8 },
          'FAP-223C': { shape: 'cylinder', height: 0.4, diameter: 1.8 },
          'FAP-223E': { shape: 'cylinder', height: 0.4, diameter: 1.8 },
          'FAP-224E': { shape: 'cylinder', height: 0.5, diameter: 2.0 },
          'FAP-231C': { shape: 'cylinder', height: 0.4, diameter: 1.8 },
          'FAP-231E': { shape: 'cylinder', height: 0.4, diameter: 1.8 },
          'FAP-231F': { shape: 'cylinder', height: 0.4, diameter: 1.8 },
          'FAP-233C': { shape: 'cylinder', height: 0.4, diameter: 1.8 },
          'FAP-233E': { shape: 'cylinder', height: 0.4, diameter: 1.8 },
          'FAP-234E': { shape: 'cylinder', height: 0.5, diameter: 2.0 },
          'FAP-421E': { shape: 'cylinder', height: 0.6, diameter: 2.2 },
          'FAP-423E': { shape: 'cylinder', height: 0.6, diameter: 2.2 },
          'FAP-431F': { shape: 'cylinder', height: 0.5, diameter: 2.0 },
          'FAP-433F': { shape: 'cylinder', height: 0.5, diameter: 2.0 },
          // Outdoor APs (typically box-shaped)
          'FAP-U431F': { shape: 'box', width: 1.5, height: 0.3, depth: 1.5 },
          'FAP-U433F': { shape: 'box', width: 1.5, height: 0.3, depth: 1.5 },
          'FAP-U434F': { shape: 'box', width: 1.6, height: 0.3, depth: 1.6 },
          'FAP-U436F': { shape: 'box', width: 1.6, height: 0.3, depth: 1.6 },
          'FAP-U441C': { shape: 'box', width: 1.5, height: 0.3, depth: 1.5 },
          'FAP-U441E': { shape: 'box', width: 1.5, height: 0.3, depth: 1.5 },
          'FAP-U443C': { shape: 'box', width: 1.5, height: 0.3, depth: 1.5 },
          'FAP-U443E': { shape: 'box', width: 1.5, height: 0.3, depth: 1.5 },
          'FAP-U444E': { shape: 'box', width: 1.6, height: 0.3, depth: 1.6 },
          'FAP-U451E': { shape: 'box', width: 1.6, height: 0.3, depth: 1.6 },
          'FAP-U453E': { shape: 'box', width: 1.6, height: 0.3, depth: 1.6 },
          'FAP-U454E': { shape: 'box', width: 1.7, height: 0.3, depth: 1.7 },
          'FAP-U461E': { shape: 'box', width: 1.7, height: 0.3, depth: 1.7 },
          'FAP-U463E': { shape: 'box', width: 1.7, height: 0.3, depth: 1.7 },
          'FAP-U464E': { shape: 'box', width: 1.8, height: 0.3, depth: 1.8 }
        }
      },
      // Connected device types (endpoints/clients)
      endpoint: {
        default: 'device_generic.svg',
        // Vendor-based mappings
        vendors: {
          'Apple': 'device_apple.svg',
          'Dell': 'device_dell.svg',
          'HP': 'device_hp.svg',
          'Lenovo': 'device_lenovo.svg',
          'Microsoft': 'device_microsoft.svg',
          'Samsung': 'device_samsung.svg',
          'Cisco': 'device_cisco.svg',
          'Fortinet': 'device_fortinet.svg'
        },
        // Device type-based mappings
        types: {
          'Laptop': 'device_laptop.svg',
          'Desktop': 'device_desktop.svg',
          'Mobile Device': 'device_mobile.svg',
          'Tablet': 'device_tablet.svg',
          'Phone': 'device_phone.svg',
          'Printer': 'device_printer.svg',
          'Server': 'device_server.svg',
          'Router': 'device_router.svg',
          'Network Generic': 'device_network.svg',
          'IoT Device': 'device_iot.svg',
          'Camera': 'device_camera.svg'
        },
        // OS-based mappings (fallback)
        os: {
          'Windows': 'device_windows.svg',
          'macOS': 'device_mac.svg',
          'iOS': 'device_ios.svg',
          'Android': 'device_android.svg',
          'Linux': 'device_linux.svg'
        }
      },
      client: {
        // Alias for endpoint
        default: 'device_generic.svg',
        vendors: {},
        types: {},
        os: {}
      }
    };

    // Base path for textures
    this.textureBasePath = 'babylon_3d/babylon_app/network-visualizer/assets/textures/';
  }

  /**
     * Get icon path for a device based on its model
     * @param {string} deviceType - 'firewall', 'switch', 'access_point', 'endpoint', or 'client'
     * @param {string} model - Device model string (e.g., 'FG-61E', 'FS-124E-POE', 'FAP-221C')
     * @param {object} deviceData - Optional device data object for connected devices (vendor, device_type, os_name)
     * @returns {string} Path to icon file
     */
  getIconPath(deviceType, model, deviceData = null) {
    // Handle endpoint/client types with device data
    if ((deviceType === 'endpoint' || deviceType === 'client') && deviceData) {
      const mapping = this.iconMapping.endpoint;

      // Try vendor first
      if (deviceData.vendor && mapping.vendors) {
        const vendor = String(deviceData.vendor).trim();
        for (const [vendorPattern, icon] of Object.entries(mapping.vendors)) {
          if (vendor.toLowerCase().includes(vendorPattern.toLowerCase())) {
            return this.textureBasePath + icon;
          }
        }
      }

      // Try device type
      if (deviceData.device_type && mapping.types) {
        const deviceTypeStr = String(deviceData.device_type).trim();
        for (const [typePattern, icon] of Object.entries(mapping.types)) {
          if (deviceTypeStr.toLowerCase().includes(typePattern.toLowerCase())) {
            return this.textureBasePath + icon;
          }
        }
      }

      // Try OS as fallback
      if (deviceData.os_name && mapping.os) {
        const osName = String(deviceData.os_name).trim();
        for (const [osPattern, icon] of Object.entries(mapping.os)) {
          if (osName.toLowerCase().includes(osPattern.toLowerCase())) {
            return this.textureBasePath + icon;
          }
        }
      }

      // Return default for endpoints
      return this.textureBasePath + mapping.default;
    }

    // Handle infrastructure devices (existing logic)
    const mapping = this.iconMapping[deviceType];
    if (!mapping) {
      console.warn(`Unknown device type: ${deviceType}`);
      return this.textureBasePath + 'real_fortigate.svg'; // Fallback
    }

    if (!model) {
      return this.textureBasePath + mapping.default;
    }

    // Try to match model against patterns
    const modelUpper = model.toUpperCase().trim();
    for (const [pattern, icon] of Object.entries(mapping.patterns || {})) {
      if (modelUpper.includes(pattern)) {
        return this.textureBasePath + icon;
      }
    }

    // Return default if no match
    return this.textureBasePath + mapping.default;
  }

  /**
     * Get layout configuration for a device based on its model
     * @param {string} deviceType - 'firewall', 'switch', or 'access_point'
     * @param {string} model - Device model string
     * @returns {object} Layout configuration with shape and dimensions
     */
  getLayout(deviceType, model) {
    const mapping = this.layoutMapping[deviceType];
    if (!mapping) {
      console.warn(`Unknown device type: ${deviceType}`);
      return this.layoutMapping.firewall.default; // Fallback
    }

    if (!model) {
      return mapping.default;
    }

    // Try to match model against patterns
    const modelUpper = model.toUpperCase().trim();
    for (const [pattern, layout] of Object.entries(mapping.patterns)) {
      if (modelUpper.includes(pattern)) {
        return layout;
      }
    }

    // Return default if no match
    return mapping.default;
  }

  /**
     * Debug: Log device information for troubleshooting
     * @param {object} device - Device data object
     * @param {string} deviceType - Device type
     */
  debugDevice(device, deviceType) {
    console.group(`🔍 Device Debug: ${device.name || 'Unknown'}`);
    console.log('Type:', deviceType);
    console.log('Model:', device.model || 'Unknown');
    console.log('Status:', device.status || 'Unknown');
    console.log('Icon Path:', this.getIconPath(deviceType, device.model));
    console.log('Layout:', this.getLayout(deviceType, device.model));
    console.log('Full Data:', device);
    console.groupEnd();
  }

  /**
     * Get all known models for a device type (for debugging/UI)
     * @param {string} deviceType - Device type
     * @returns {array} Array of model strings
     */
  getKnownModels(deviceType) {
    const mapping = this.iconMapping[deviceType];
    if (!mapping) return [];
    return Object.keys(mapping.patterns);
  }
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeviceConfig;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.DeviceConfig = DeviceConfig;
}
