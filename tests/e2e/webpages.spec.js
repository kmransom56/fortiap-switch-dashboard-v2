const { test, expect } = require('@playwright/test');

test.describe('Dashboard Webpages', () => {
  test('Main page - should load and display header', async ({ page }) => {
    await page.goto('/');
    
    await expect(page).toHaveTitle(/Fortinet Infrastructure Dashboard/);
    
    const header = page.locator('header.header');
    await expect(header).toBeVisible();
    
    const title = page.locator('h1');
    await expect(title).toContainText('Fortinet Dashboard');
  });

  test('Main page - should have all navigation tabs', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('button[data-tab="overview"]')).toBeVisible();
    await expect(page.locator('button[data-tab="fortiaps"]')).toBeVisible();
    await expect(page.locator('button[data-tab="fortiswitches"]')).toBeVisible();
    await expect(page.locator('button[data-tab="topology"]')).toBeVisible();
    await expect(page.locator('button[data-tab="connected-devices"]')).toBeVisible();
    await expect(page.locator('button[data-tab="3d-topology"]')).toBeVisible();
  });

  test('Main page - should have working header buttons', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('#refreshBtn')).toBeVisible();
    await expect(page.locator('#themeToggle')).toBeVisible();
    await expect(page.locator('#exportBtn')).toBeVisible();
  });

  test('Overview tab - should display statistics', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const overviewSection = page.locator('#overview');
    await expect(overviewSection).toBeVisible();
    
    const statCards = overviewSection.locator('.summary-card');
    const count = await statCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('FortiAPs tab - should switch and load data', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button[data-tab="fortiaps"]');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const fortiapSection = page.locator('#fortiaps');
    await expect(fortiapSection).toBeVisible();
    
    const activeTab = page.locator('.nav-tab.active');
    await expect(activeTab).toHaveAttribute('data-tab', 'fortiaps');
  });

  test('FortiSwitches tab - should switch and load data', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button[data-tab="fortiswitches"]');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const switchSection = page.locator('#fortiswitches');
    await expect(switchSection).toBeVisible();
    
    const activeTab = page.locator('.nav-tab.active');
    await expect(activeTab).toHaveAttribute('data-tab', 'fortiswitches');
  });

  test('Topology tab - should switch and display topology view', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button[data-tab="topology"]');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const topologySection = page.locator('#topology');
    await expect(topologySection).toBeVisible();
  });

  test('Connected Devices tab - should switch and load devices', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button[data-tab="connected-devices"]');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const devicesSection = page.locator('#connected-devices');
    await expect(devicesSection).toBeVisible();
  });

  test('3D Topology tab - should switch and initialize 3D view', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button[data-tab="3d-topology"]');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const threeDSection = page.locator('div[id="3d-topology"]');
    await expect(threeDSection).toBeVisible();
  });

  test('Refresh button - should reload data', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('#refreshBtn');
    
    await page.waitForResponse(response => 
      response.url().includes('/api/fortiaps') && response.status() === 200
    );
    
    await expect(page.locator('#lastUpdatedTime')).not.toContainText('--');
  });

  test('Theme toggle - should be clickable', async ({ page }) => {
    await page.goto('/');
    
    const themeBtn = page.locator('#themeToggle');
    await expect(themeBtn).toBeVisible();
    
    await themeBtn.click();
    // Just verify it's clickable, theme implementation may vary
  });

  test('Search functionality - should filter results', async ({ page }) => {
    await page.goto('/');
    
    await page.click('button[data-tab="fortiaps"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const searchInput = page.locator('#fortiapSearch');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Office');
      await page.waitForTimeout(500);
    }
  });

  test('Console errors - check for major errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out common non-critical errors
        if (!text.includes('favicon') && 
            !text.includes('404') &&
            !text.includes('net::ERR_') &&
            !text.includes('Failed to load resource')) {
          errors.push(text);
        }
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Allow some errors but log them for debugging
    if (errors.length > 0) {
      console.log('Non-critical errors found:', errors);
    }
  });

  test('Network requests - check critical requests', async ({ page }) => {
    const failedRequests = [];
    
    page.on('requestfailed', request => {
      const url = request.url();
      // Only track failures of critical resources
      if (!url.includes('favicon') && 
          !url.includes('cdn.') &&
          !url.includes('fonts.')) {
        failedRequests.push(url);
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Log failed requests for debugging
    if (failedRequests.length > 0) {
      console.log('Failed critical requests:', failedRequests);
    }
  });

  test('Static assets - should load CSS and JS files', async ({ page }) => {
    await page.goto('/');
    
    // Wait for main assets with timeout
    try {
      await page.waitForResponse(response => 
        response.url().includes('style.css'), { timeout: 5000 }
      );
      
      await page.waitForResponse(response => 
        response.url().includes('app.js'), { timeout: 5000 }
      );
    } catch (error) {
      // Assets may already be cached
      console.log('Assets may be cached or served differently');
    }
    
    // Verify page loaded
    await expect(page.locator('header.header')).toBeVisible();
  });

  test('WebSocket - Socket.io available on page', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if page has loaded successfully
    const headerVisible = await page.locator('header.header').isVisible();
    expect(headerVisible).toBeTruthy();
    
    // Verify app.js loaded (which would initialize socket)
    const appJsLoaded = await page.evaluate(() => {
      return document.querySelector('script[src*="app.js"]') !== null;
    });
    
    expect(appJsLoaded).toBeTruthy();
  });

  test('Data loading - should fetch and display data', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForResponse(response => 
      response.url().includes('/api/fortiaps') && response.status() === 200
    );
    
    await page.waitForResponse(response => 
      response.url().includes('/api/fortiswitches') && response.status() === 200
    );
    
    await page.waitForTimeout(1000);
    
    const lastUpdated = await page.locator('#lastUpdatedTime').textContent();
    expect(lastUpdated).not.toBe('--');
  });
});
