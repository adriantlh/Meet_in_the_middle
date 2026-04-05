# 📍 MeetWay

MeetWay is a smart "Meet in the Middle" web application designed to find the perfect compromise for group hangouts. It calculates the geographic center between multiple participants and discovers "fair" points of interest (POIs) using the Google Maps Platform.

## ✨ Features

- **Multi-Location Input:** Add any number of participants using Google Maps Autocomplete or direct address entry with smart geocoding fallback.
- **Current Location Support:** Quickly add your own starting point with a single click using the GPS icon.
- **Centroid Math:** Uses 3D Cartesian vector averaging to find the true geographic center between coordinates.
- **Flexible Travel Modes:** Calculate travel times for Driving, Walking, Bicycling, or Transit.
- **Expanded POI Discovery:** Search for Restaurants, Cafes, Bars, Parks, and more, or use **Custom Search** to find specific venues near the center.
- **Fairness Scoring:** Uses the Google Distance Matrix API to calculate travel times for all participants and highlights the **Fastest** and **Slowest** routes to ensure a balanced meeting spot.
- **Dark Mode:** Seamlessly toggle between light and dark themes for better usability in any environment.
- **Mobile-First Design:** Fully responsive UI with interactive bottom sheets for mobile users.
- **Shareable Plans:** Generate unique URLs to share your meetup plan with friends.
- **Interactive Details:** View photos, ratings, and get one-click directions or Street View for any location.

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Backend:** Node.js (Express) - handles static serving and dynamic API key injection.
- **APIs:** 
  - Google Maps JavaScript SDK (v3 Beta)
  - New Places Library (`Place.searchNearby`, `fetchFields`)
  - Advanced Marker Element
  - Distance Matrix API
  - Geocoding API
- **Testing:** Playwright for E2E testing.
- **Deployment:** Pre-configured for Render.com and Vercel.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- A Google Maps Platform API Key (with Places, Geocoding, and Distance Matrix APIs enabled).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/adriantlh/Meet_in_the_middle.git
   cd Meet_in_the_middle
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your API Key:
   Create a `.env` file in the root directory:
   ```env
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

4. Start the server:
   ```bash
   npm start
   ```
   The app will be available at `http://localhost:3000`.

## 🧪 Testing

Run the Playwright E2E test suite:
```bash
npx playwright test
```

## 🌐 Deployment

### Render.com
The repository includes a `render.yaml` file. Simply connect your GitHub repo to Render and it will automatically detect the settings. Ensure you add `GOOGLE_MAPS_API_KEY` as an environment variable in the Render dashboard.

### Vercel
The repository includes a `vercel.json` file. Push to a new project on Vercel and add your environment variables to the project settings.

## 📜 License
MIT License. Created by [Adrian](https://github.com/adriantlh).
