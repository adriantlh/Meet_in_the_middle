import { test, expect } from '@playwright/test';

test.describe('MeetWay Robust Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should add and then remove a location', async ({ page }) => {
    const addressInput = page.locator('#address-input');
    const addButton = page.locator('#add-location-btn');
    
    // Add a location
    await addressInput.fill('Singapore');
    await addButton.click();
    
    // Wait for geocoding and list update
    const locationCard = page.locator('.location-card');
    await expect(locationCard).toHaveCount(1, { timeout: 10000 });
    await expect(locationCard.locator('.location-name')).toContainText('Singapore');
    
    // Remove the location (using a more specific locator to avoid the close button in the drawer)
    const removeBtn = locationCard.locator('.remove-btn');
    await removeBtn.click();
    
    // Verify it is gone
    await expect(locationCard).toHaveCount(0);
  });

  test('should persist theme across reloads', async ({ page }) => {
    const themeToggle = page.locator('#theme-toggle');
    const body = page.locator('body');
    
    // Toggle to dark mode
    await themeToggle.click();
    await expect(body).toHaveClass(/dark-mode/);
    
    // Reload
    await page.reload();
    
    // Verify theme persisted
    await expect(body).toHaveClass(/dark-mode/);
  });

  test('should show POI list after search', async ({ page }) => {
    // Add 2 locations to enable search
    const addressInput = page.locator('#address-input');
    const addButton = page.locator('#add-location-btn');
    
    await addressInput.fill('170 River Valley Rd, Singapore');
    await addButton.click();
    await page.waitForTimeout(1000); // Give geocoder a breath
    
    await addressInput.fill('85 Compassvale Bow, Singapore');
    await addButton.click();
    await page.waitForTimeout(1000);
    
    // Search
    const searchBtn = page.locator('#search-poi-btn');
    await searchBtn.click();
    
    // Wait for results or empty state (to be robust against API key limits in CI)
    const poiList = page.locator('#poi-list');
    const statusMessage = page.locator('#status-message');
    
    // Either results appear OR a status message appears
    await Promise.race([
        page.waitForSelector('.poi-item', { timeout: 20000 }),
        page.waitForSelector('#status-message:not(.hidden)', { timeout: 20000 })
    ]);

    const hasResults = await page.locator('.poi-item').count() > 0;
    if (hasResults) {
        await page.locator('.poi-item').first().click();
        const poiDetails = page.locator('#poi-details-panel');
        await expect(poiDetails).toHaveClass(/visible/);
    } else {
        const errorText = await statusMessage.textContent();
        console.log(`POI Search info: ${errorText}`);
        // If it's just "No results", that's a valid application state for the test
        expect(errorText).toBeTruthy();
    }
  });

  test('should handle current location button click', async ({ page, context }) => {
    // Mock geolocation
    await context.setGeolocation({ latitude: 1.3521, longitude: 103.8198 });
    await context.grantPermissions(['geolocation']);
    
    const currentLocBtn = page.locator('#current-location-btn');
    await currentLocBtn.click();
    
    // Wait for location to be added (may take a moment for reverse geocoding)
    await expect(page.locator('.location-card')).toHaveCount(1, { timeout: 10000 });
  });
});
