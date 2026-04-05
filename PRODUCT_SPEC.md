# Product Specification: MeetWay

## Overview
MeetWay is a web-based application designed to help users find a convenient meeting point between multiple locations. It calculates the geographic center (centroid) of several addresses and allows users to discover nearby points of interest (POIs) such as restaurants, parks, and attractions.

## Key Features

### 1. Multi-Location Input
- **Address Entry & Geocoding:** Users can enter addresses or place names via Google Maps Autocomplete or direct text entry. Direct entry uses a smart geocoding fallback to ensure any valid address is found.
- **Current Location:** A dedicated "Use My Location" (🎯) button allows users to quickly add their current GPS coordinates as a starting point.
- **Location Management:** Added locations are displayed in a list. Users can remove individual locations, which triggers an immediate recalculation of the center.
- **Visual Feedback:** Each added location is marked on the map with a person icon marker.

### 2. Geographic Center & Travel Flexibility
- **Centroid Logic:** The app calculates the average latitude and longitude (geographic center) of all active locations.
- **Travel Modes:** Users can select between **Driving, Walking, Bicycling, or Transit** modes. These choices directly affect the travel time calculations and the fairness score.
- **Visual Representation:** The center is marked on the map with a distinct target icon and a semi-transparent blue circle representing the search radius.

### 3. Point of Interest (POI) Discovery
- **Configurable Search:** Users can select from presets (Restaurant, Cafe, Bar, Park, Attraction, Library, Gym, Cinema) or use **Custom Search** to find specific venues (e.g., "Sushi").
- **Nearby Search:** The app uses the Google Places API (including `searchNearby` and `searchByText`) to find relevant locations within the specified radius of the calculated center.
- **Interactive Map Pins:** Found POIs are displayed as pins on the map.

### 4. Rich POI Details & Fairness Visuals
- **Selection:** Users can click on a map pin or a list item in the results panel to view details.
- **Fairness Labels:** Travel times from all participants are listed, with the **Fastest** and **Slowest** routes clearly labeled to highlight potential imbalances.
- **Comprehensive Info:** Displays ratings, review counts, phone numbers, and website links.

### 5. Personalization & Sharing
- **Dark Mode:** A theme toggle allows users to switch between light and dark themes, with preferences persisted locally.
- **Directions & Street View:** Interactive buttons open Google Maps for turn-by-turn directions (respecting the chosen travel mode) or launch a Street View exploration.
- **Shareable URLs:** Users can generate a unique link that encodes their current meetup plan (locations and search settings) for easy sharing.

---

## Deployment
The application is configured for deployment on **Render.com** (via `render.yaml` and `server.js`). 

### Deployment Steps:
1. Push to GitHub.
2. Connect the repository to a new Render Web Service.
3. Add the `GOOGLE_MAPS_API_KEY` environment variable in the Render Dashboard.
4. The application will automatically build and deploy.
