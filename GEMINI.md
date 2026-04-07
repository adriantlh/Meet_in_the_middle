# 🛡️ MeetWay Engineering & Security Guidelines

This document serves as a reference for maintaining the security and functional integrity of the MeetWay application. Adhere to these rules to prevent regressions in API functionality and security posture.

## 🔑 Google Maps API Integration

### 1. Case-Sensitive Field Names (Places API v3 Beta)
When using the New Places library (`google.maps.importLibrary("places")`), certain fields are **strictly case-sensitive**. Using the wrong case will cause a `fetchFields` failure and break the POI details panel.
- **Correct**: `websiteURI`, `googleMapsURI`
- **Incorrect**: `websiteUri`, `googleMapsUri`, `websiteUrl`

### 2. API Key Proxying
To protect the Google Maps API Key from being exposed in high-volume automated scraping:
- **Rule**: All **Distance Matrix** calls must be proxied through the backend (`/api/distance-matrix`).
- **Reason**: This keeps the API key usage for these specific calculation-heavy calls on the server.

---

## 🔒 Security Standards

### 1. Input Sanitization (XSS Protection)
MeetWay uses **DOMPurify** to prevent Cross-Site Scripting (XSS) attacks when injecting HTML into the DOM.
- **Usage**: Always wrap `innerHTML` assignments in `DOMPurify.sanitize(html, config)`.
- **Required Configuration**: By default, DOMPurify strips `style` and `src` attributes. Use the following configuration for POI details and distances:
  ```javascript
  DOMPurify.sanitize(html, { 
      ADD_ATTR: ['src', 'href', 'target', 'rel', 'style'],
      ADD_TAGS: ['img', 'a']
  });
  ```

### 2. Content Security Policy (CSP)
The app uses **Helmet.js** to enforce a strict CSP. If adding new external libraries or CDNs, update the `directives` in `server.js`.
- **Current Allowed Connect Sources**: `'self'`, `https://maps.googleapis.com`, `https://*.googleapis.com`, `https://cdnjs.cloudflare.com`.
- **Note**: If you see a "violates the following Content Security Policy directive" error in the console, you must update the `helmet` configuration in `server.js`.

### 3. Rate Limiting
- **Backend**: `express-rate-limit` is configured for 100 requests per 15 minutes.
- **Frontend**: A `isSearching` debounce flag is implemented in `handleSearchPois()` to prevent rapid-fire API calls from multiple button clicks.

---

## 🚀 Deployment Checklist

1.  **Environment Variables**: Ensure `GOOGLE_MAPS_API_KEY` is set in the production environment (Render/Vercel).
2.  **API Restrictions**: In the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials), ensure the API Key is restricted to the production domain (e.g., `https://your-app.onrender.com/*`).
3.  **CORS**: Update the `cors` origin list in `server.js` if deploying to a new domain.
