# Product Specification: MeetWay

## Overview
MeetWay is a web-based application designed to help users find a convenient meeting point between multiple locations. It calculates the geographic center (centroid) of several addresses and allows users to discover nearby points of interest (POIs) such as restaurants, parks, and attractions.

## Key Features

### 1. Multi-Location Input
- **Address Geocoding:** Users can enter addresses or place names in a search bar. The application uses the Google Maps Geocoding API to convert these into geographic coordinates.
- **Location Management:** Added locations are displayed in a list. Users can remove individual locations, which triggers an immediate recalculation of the center.
- **Visual Feedback:** Each added location is marked on the map with a blue pin.

### 2. Geographic Center Calculation
- **Centroid Logic:** The app calculates the average latitude and longitude (geographic center) of all active locations.
- **Visual Representation:** The center is marked on the map with a distinct red pin and a semi-transparent red circle representing the search radius.
- **Coordinate Display:** The exact latitude and longitude of the center are displayed in the control panel.

### 3. Point of Interest (POI) Discovery
- **Configurable Search:** Users can select a category (Restaurant, Tourist Attraction, Gas Station, Park) and define a search radius (1km to 500km).
- **Nearby Search:** The app uses the Google Places API to find relevant businesses or locations within the specified radius of the calculated center.
- **Interactive Map Pins:** Found POIs are displayed as green pins on the map.

### 4. Rich POI Details
- **Selection:** Users can click on a map pin or a list item in the results panel to view details.
- **Comprehensive Info:** Displays ratings, review counts, phone numbers, and website links.
- **Photo Gallery:** Shows a primary photo of the venue with a thumbnail gallery for additional images.

### 5. Actionable Outcomes
- **Directions:** A "Get Directions" button opens Google Maps in a new tab, providing a route from the first user-inputted location to the selected POI.
- **Street View:** Users can launch a Street View window for the selected POI to virtually explore the surroundings.

---

## Technical Stack
- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **APIs:** Google Maps JavaScript API.
  - Libraries: `places`, `marker`.
  - Services: `Geocoder`, `Place.searchNearby`, `AdvancedMarkerElement`.
