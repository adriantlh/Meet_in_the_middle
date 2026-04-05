import { test, expect } from '@playwright/test';

test.describe('MeetWay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/MeetWay/);
  });

  test('should have a functional address input and add button', async ({ page }) => {
    const addressInput = page.locator('#address-input');
    const addButton = page.locator('#add-location-btn');
    
    await expect(addressInput).toBeVisible();
    await expect(addButton).toBeVisible();
    await expect(addButton).toHaveText('Add');
  });

  test('should have POI search controls', async ({ page }) => {
    const poiType = page.locator('#poi-type');
    const searchButton = page.locator('#search-poi-btn');
    
    await expect(poiType).toBeVisible();
    await expect(searchButton).toBeVisible();
    await expect(searchButton).toHaveText('Search Near Center');
  });

  test('should have travel mode selection', async ({ page }) => {
    const travelMode = page.locator('#travel-mode');
    await expect(travelMode).toBeVisible();
    await expect(travelMode).toHaveValue('DRIVING');
  });

  test('should have a theme toggle', async ({ page }) => {
    const themeToggle = page.locator('#theme-toggle');
    await expect(themeToggle).toBeVisible();
    
    // Toggle to dark mode
    await themeToggle.click();
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
    
    // Toggle back to light mode
    await themeToggle.click();
    await expect(page.locator('body')).not.toHaveClass(/dark-mode/);
  });

  test('should have a current location button', async ({ page }) => {
    const currentLocBtn = page.locator('#current-location-btn');
    await expect(currentLocBtn).toBeVisible();
  });

  test('should have a map container', async ({ page }) => {
    const map = page.locator('#map');
    await expect(map).toBeVisible();
  });

  test('should have a share button', async ({ page }) => {
    const shareButton = page.locator('#share-btn');
    await expect(shareButton).toBeVisible();
    await expect(shareButton).toHaveText('Share Meetup Plan');
  });

  test('should display initial status message correctly', async ({ page }) => {
    const centerCoords = page.locator('#center-coords');
    await expect(centerCoords).toContainText('Add 2+ locations to start.');
  });

  test('should hide status message after a few seconds', async ({ page }) => {
    // Trigger a status message (e.g., call showStatus directly)
    await page.evaluate(() => {
        window.showStatus('MeetWay helps you find the perfect compromise.', 'info');
    });
    const statusMessage = page.locator('#status-message');
    
    // Should be visible initially
    await expect(statusMessage).toBeVisible();
    await expect(statusMessage).toContainText('MeetWay helps you find the perfect compromise.');
    
    // Should be hidden after timeout (using a bit more than 4s)
    await expect(statusMessage).toBeHidden({ timeout: 10000 });
  });
});
