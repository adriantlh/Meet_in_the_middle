import { test, expect } from '@playwright/test';

test.describe('Debug POI Details', () => {
  test('should capture console errors when clicking POI', async ({ page }) => {
    // 1. Capture and log all console messages
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    // 2. Load the site
    await page.goto('http://localhost:3000');

    // 3. Add two locations (Singapore examples based on your screenshot)
    const addressInput = page.locator('#address-input');
    const addButton = page.locator('#add-location-btn');

    await addressInput.fill('170 River Valley Rd, Singapore');
    await addButton.click();
    await page.waitForTimeout(1000); // Give time for geocoding

    await addressInput.fill('85 Compassvale Bow, Singapore');
    await addButton.click();
    await page.waitForTimeout(1000);

    // 4. Search for restaurants
    const searchButton = page.locator('#search-poi-btn');
    await searchButton.click();
    
    // 5. Wait for the POI results and click the first one
    console.log('Waiting for POI results...');
    const firstPoi = page.locator('#poi-list .poi-item').first();
    await firstPoi.waitFor({ state: 'visible', timeout: 10000 });
    await firstPoi.click();

    // 6. Check for the details view and any error status
    const statusMessage = page.locator('#status-message');
    await page.waitForTimeout(2000); // Give time for fetchFields
    
    const isErrorVisible = await statusMessage.isVisible();
    if (isErrorVisible) {
      const errorText = await statusMessage.textContent();
      console.log(`POLL STATUS ERROR: ${errorText}`);
    }

    // Keep the browser open for a bit to capture more logs if needed
    await page.waitForTimeout(3000);
  });
});
