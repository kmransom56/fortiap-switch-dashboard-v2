# 3D Topology Visualization Troubleshooting Guide

## 🌐 3D Topology with Babylon.js

This guide covers troubleshooting for the **interactive 3D network topology** visualization using Babylon.js.

---

## 🔴 Common Issues

### **1. 3D Scene Not Loading**
**Symptoms:**
- Blank 3D topology tab
- "Loading..." screen stuck
- Console errors about Babylon.js

**Causes & Solutions:**

#### **WebGL Not Supported**
```javascript
// Check browser console for:
// "WEBGL_not_supported" or similar errors
```

**Solution:**
- **Chrome/Edge**: Enable WebGL in `chrome://flags/`
- **Firefox**: Check `about:support` for WebGL status
- **Update browser** to latest version
- **Try different browser** (Chrome, Firefox, Edge, Safari)

#### **Babylon.js CDN Failed**
```javascript
// Check browser console for:
// "Failed to load resource: babylon.js"
// "BABYLON is not defined"
```

**Solution:**
- **Check internet connection**
- **Verify CDN access** to `cdn.babylonjs.com`
- **Firewall/proxy**: Allow CDN access
- **Local fallback**: Download Babylon.js locally

---

### **2. Performance Issues**

#### **Slow Rendering/Lag**
**Symptoms:**
- Choppy rotation/zoom
- High CPU usage
- Poor frame rate

**Solutions:**

**Use Category Filters:**
```javascript
// Filter devices to reduce rendering load
- Show only FortiGate + Switches
- Hide APs in large networks
- Use device type filters
```

**Browser Optimization:**
- **Close other tabs**
- **Disable browser extensions**
- **Use hardware acceleration**
- **Update graphics drivers**

#### **Memory Usage**
**Symptoms:**
- Browser becomes slow
- High memory consumption
- Crashes after time

**Solutions:**
- **Refresh page** periodically
- **Use device filters**
- **Close other applications**
- **Restart browser**

---

### **3. Device Interaction Issues**

#### **Click Not Working**
**Symptoms:**
- Can't click on devices
- No device info shown
- Cursor doesn't change

**Solutions:**

**Check Babylon.js Version:**
```javascript
// Verify Babylon.js loaded correctly
console.log(BABYLON.Engine.Version); // Should show version
```

**Camera Issues:**
- **Reset view** using Reset button
- **Check camera controls** are enabled
- **Verify mouse events** working

**Device Mesh Issues:**
- **Check device data** loading
- **Verify topology API** response
- **Look for mesh creation errors**

---

### **4. API/Data Issues**

#### **No Devices Showing**
**Symptoms:**
- 3D scene loads but empty
- No network connections
- "Failed to load 3D topology"

**Solutions:**

**Check API Endpoint:**
```bash
# Test topology API
curl http://localhost:13000/api/topology
```

**Expected Response:**
```json
{
  "fortigate": { ... },
  "switches": [ ... ],
  "aps": [ ... ]
}
```

**API Troubleshooting:**
- **Check server logs** for API errors
- **Verify FortiGate connection**
- **Check API credentials** in `.env`
- **Test other endpoints** like `/api/status`

#### **Incorrect Device Positions**
**Symptoms:**
- Devices overlapping
- Wrong network layout
- Missing connections

**Solutions:**
- **Refresh topology** data
- **Check device coordinates** in API response
- **Verify network topology** in FortiGate

---

## 🔧 Advanced Troubleshooting

### **Browser Developer Tools**

#### **Console Errors to Check:**
```javascript
// Babylon.js errors
"BABYLON is not defined"
"WebGL context creation failed"

// API errors
"Failed to fetch topology"
"Network response was not ok"

// JavaScript errors
"Cannot read property of undefined"
"render3DTopology is not a function"
```

#### **Network Tab:**
- **Check failed requests** to Babylon.js CDN
- **Verify API calls** to `/api/topology`
- **Look for 404/500 errors**

#### **Performance Tab:**
- **Monitor frame rate** during 3D rendering
- **Check memory usage** trends
- **Identify bottlenecks**

### **Server-Side Issues**

#### **Check Server Health:**
```bash
# Test health endpoint
curl http://localhost:13000/health

# Expected response
{
  "status": "healthy",
  "uptime": 12345,
  "cacheHits": 45,
  "cacheMisses": 5,
  "apiCalls": 50
}
```

#### **Check Logs:**
```bash
# View server logs
node server.js

# Look for:
# - API connection errors
# - Cache issues
# - FortiGate authentication problems
```

---

## 🛠️ Configuration Issues

### **Environment Variables**
```bash
# Check these in your .env file:
FORTIGATE_HOST=192.168.1.99    # Must be accessible
FORTIGATE_PORT=443             # Correct management port
FORTIGATE_USERNAME=admin        # Valid API user
FORTIGATE_PASSWORD=password     # Correct password
VERIFY_SSL=false               # For self-signed certs
PORT=13000                      # Server port
```

### **Firewall/Network Issues**
- **Port 13000** must be open for dashboard
- **FortiGate port** (usually 443) accessible
- **No proxy blocking** Babylon.js CDN
- **DNS resolution** working

---

## 📱 Browser Compatibility

### **Supported Browsers:**
- ✅ **Chrome 80+** (Recommended)
- ✅ **Firefox 75+**
- ✅ **Edge 80+**
- ✅ **Safari 14+**

### **Not Supported:**
- ❌ **Internet Explorer** (No WebGL)
- ❌ **Old mobile browsers**
- ❌ **Text-based browsers**

### **Mobile Considerations:**
- **Touch controls** work but limited
- **Performance** may be slower
- **Small screens** challenging for 3D

---

## 🔄 Reset and Recovery

### **Quick Reset:**
1. **Refresh browser** (Ctrl+F5)
2. **Clear cache** if needed
3. **Reset 3D view** using button
4. **Restart server** if API issues

### **Full Reset:**
```bash
# Clear server cache
rm -rf cache/*

# Restart server
npm start

# Clear browser cache
# Ctrl+Shift+Delete in browser
```

### **Data Reset:**
```bash
# Use fallback data if API fails
# Check dashboard_data.yaml exists
# Server will auto-fallback when API unavailable
```

---

## 📞 Getting Help

### **Information to Provide:**
When reporting issues, include:

1. **Browser** and version
2. **Console errors** (screenshots)
3. **Network tab** errors
4. **Server logs** output
5. **Environment** (OS, Node.js version)
6. **FortiGate** model and firmware

### **Debug Mode:**
Enable detailed logging:
```bash
# Set debug environment
export DEBUG=forti-dashboard:*

# Start server with debug
npm start
```

---

## 🎯 Performance Tips

### **For Large Networks:**
- **Use device filters** to reduce rendered objects
- **Close other browser tabs**
- **Use dedicated GPU** if available
- **Reduce browser window size**

### **For Better Experience:**
- **Wired connection** vs WiFi
- **Modern hardware** with GPU support
- **Latest browser version**
- **Sufficient RAM** (8GB+ recommended)

---

## 🔍 Verification Checklist

### **Before Opening Issue:**
- [ ] **Browser updated** to latest version
- [ ] **WebGL enabled** and working
- [ ] **Server running** without errors
- [ ] **API endpoints** responding
- [ ] **Console cleared** of old errors
- [ ] **Cache cleared** and page refreshed
- [ ] **Network connection** stable
- [ ] **FortiGate accessible** from server

### **Expected Behavior:**
- ✅ **3D scene loads** with ground plane
- ✅ **Devices appear** as colored meshes
- ✅ **Connections visible** between devices
- ✅ **Mouse controls** work (rotate, zoom, pan)
- ✅ **Device clicking** shows information
- ✅ **Category filters** toggle visibility
- ✅ **Reset/Fullscreen/Screenshot** buttons work

---

**🌐 3D Topology Troubleshooting Complete!**

If issues persist after following this guide, please provide detailed error information and system specifications for further assistance.
```

### Option 2: Install Locally

```powershell
# Install cytoscape locally
npm install cytoscape

# Then in your HTML, reference local file
<script src="node_modules/cytoscape/dist/cytoscape.min.js"></script>
```

### Option 3: Download and Host Yourself

```powershell
# Create libs directory
mkdir static/libs

# Download cytoscape
# Visit: https://unpkg.com/cytoscape@3.26.0/dist/cytoscape.min.js
# Save to: static/libs/cytoscape.min.js

# Then reference it
<script src="/static/libs/cytoscape.min.js"></script>
```

## 🧪 Testing Steps

1. **Test if Cytoscape loads:**
   ```html
   <!-- Add this to check -->
   <script>
   if (typeof cytoscape === 'undefined') {
     alert('Cytoscape failed to load!');
   } else {
     console.log('Cytoscape version:', cytoscape.version());
   }
   </script>
   ```

2. **Test API endpoint:**
   ```powershell
   # Test if API returns JSON
   curl http://localhost:3000/api/network/topology/all-devices
   
   # Or in browser console:
   fetch('/api/network/topology/all-devices')
     .then(r => r.json())
     .then(d => console.log(d))
   ```

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Look for errors in Console tab
   - Check Network tab for failed requests

## 📝 Common Issues and Fixes

### Issue: CORS Error
```
Access to fetch at 'http://localhost:3000/api/...' from origin 'null' has been blocked
```

**Fix:** Make sure you're accessing via `http://localhost:3000`, not opening HTML file directly

### Issue: 404 on API
```
GET http://localhost:3000/api/network/topology/all-devices 404 (Not Found)
```

**Fix:** 
1. API endpoint not defined in server
2. Server not running
3. Wrong port number

### Issue: Module not found
```
Cannot find module './network-topology.js'
```

**Fix:** Make sure `network-topology.js` is in the same directory as your server file

### Issue: Icons not showing
```
GET http://localhost:3000/drawio/fortinet_icons/fortigate.svg 404
```

**Fix:** 
1. Icons haven't been generated yet (run the VSS converter)
2. Wrong path in `iconMap`
3. Icons not in correct directory

## 🎯 Next Steps

Once the standalone version works:

1. **Generate your actual icons:**
   ```powershell
   python drawio/vss-to-svg-converter.py --batch drawio/fortinet_visio drawio/fortinet_icons
   ```

2. **Organize icons:**
   ```powershell
   python organize-icons.py drawio/fortinet_icons --organize
   ```

3. **Connect to real data:**
   - Integrate with your existing FortiGate API calls
   - Update the topology endpoint to use real device data
   - Test with actual network

4. **Customize:**
   - Add more device types
   - Customize colors and layouts
   - Add real-time updates

## 💡 Pro Tips

- Start with the standalone version to verify everything works
- Test with sample data before connecting to real API
- Use browser DevTools to debug issues
- Check server logs for backend errors
- Test on different browsers if issues persist

---

Need more help? Check:
- Browser console for JavaScript errors
- Server console for backend errors  
- Network tab in DevTools for failed requests
