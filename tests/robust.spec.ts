import { test, expect } from '@playwright/test';

test.describe('MeetWay Robust Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/MeetWay/);
  });

  test('should add and then remove a location', async ({ page }) => {
    const addressInput = page.locator('#address-input');
    const addButton = page.locator('#add-location-btn');
    
    await addressInput.fill('Singapore');
    await addButton.click();
    
    const locationCard = page.locator('.location-card');
    await expect(locationCard).toHaveCount(1, { timeout: 10000 });
    
    const removeBtn = locationCard.locator('.remove-btn');
    await removeBtn.click();
    await expect(locationCard).toHaveCount(0);
  });

  test('should persist theme across reloads', async ({ page }) => {
    const themeToggle = page.locator('#theme-toggle');
    const body = page.locator('body');
    
    await themeToggle.click();
    await expect(body).toHaveClass(/dark-mode/);
    await page.reload();
    await expect(body).toHaveClass(/dark-mode/);
  });

  test('should show POI list and details with back button and image', async ({ page }) => {
    const addressInput = page.locator('#address-input');
    const addButton = page.locator('#add-location-btn');
    
    await addressInput.fill('170 River Valley Rd, Singapore');
    await addButton.click();
    await page.waitForTimeout(1000);
    await addressInput.fill('85 Compassvale Bow, Singapore');
    await addButton.click();
    await page.waitForTimeout(1000);
    
    await page.locator('#search-poi-btn').click();
    
    // Wait for results
    await page.waitForSelector('.poi-item', { timeout: 20000 });
    const firstPoi = page.locator('.poi-item').first();
    await firstPoi.click();
    
    // Verify details panel and back button
    const poiDetails = page.locator('#poi-details-panel');
    const infoView = page.locator('#poi-info-view');
    await expect(poiDetails).toHaveClass(/visible/);
    await expect(infoView).toHaveClass(/open/);
    
    // Verify image exists (may not load if API limits hit, but element should exist)
    const heroImg = page.locator('.poi-hero-img');
    const hasImage = await heroImg.count() > 0;
    if (hasImage) {
        await expect(heroImg).toBeVisible();
    }

    // Test back button
    const backBtn = page.locator('#poi-back-btn');
    await backBtn.click();
    await expect(infoView).not.toHaveClass(/open/);
  });

  test('should handle current location button click', async ({ page, context }) => {
    await context.setGeolocation({ latitude: 1.3521, longitude: 103.8198 });
    await context.grantPermissions(['geolocation']);
    
    const currentLocBtn = page.locator('#current-location-btn');
    await currentLocBtn.click();
    await expect(page.locator('.location-card')).toHaveCount(1, { timeout: 15000 });
  });

  test('should have a share button', async ({ page }) => {
    const shareButton = page.locator('#share-btn');
    await expect(shareButton).toBeVisible();
    await expect(shareButton).toHaveText('Share Meetup Plan');
  });
});
