// --- GLOBAL STATE & CONFIGURATION ---
let map, geocoder, infoWindow, autocomplete, distanceService, placeAutocomplete;
let locations = []; 
let inputMarkers = [];
let poiMarkers = [];
let centerMarker = null;
let searchCircle = null;
let foundPois = []; 
let currentPoiDetails = null;

const STORAGE_KEY = 'meetway_locations';

// --- DYNAMIC LOADER ---
// This is the modern way to load the Google Maps JS API.
(async () => {
    // 1. Get the API key injected by server.js (or fallback for local dev)
    // We'll read it from a data attribute or a global variable if we want,
    // but the easiest is to just let server.js replace it in the script loader.
    
    const loaderScript = document.createElement('script');
    // server.js will replace %GOOGLE_MAPS_API_KEY% here
    loaderScript.src = `https://maps.googleapis.com/maps/api/js?key=%GOOGLE_MAPS_API_KEY%&libraries=places,marker&v=beta`;
    loaderScript.async = true;
    loaderScript.defer = true;
    
    loaderScript.onload = () => {
        initMap();
    };
    
    document.head.appendChild(loaderScript);
})();

// --- INITIALIZATION ---
async function initMap() {
    // Import libraries using the new Maps SDK pattern
    const { Map } = await google.maps.importLibrary("maps");
    const { Geocoder } = await google.maps.importLibrary("geocoding");
    // PlaceAutocompleteElement is part of the 'places' library
    await google.maps.importLibrary("places");
    
    map = new Map(document.getElementById("map"), {
        zoom: 4,
        center: { lat: 1.3521, lng: 103.8198 }, // Default to Singapore for your context
        mapId: 'DEMO_MAP_ID',
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false
    });
    
    geocoder = new Geocoder();
    infoWindow = new google.maps.InfoWindow();
    distanceService = new google.maps.DistanceMatrixService();

    const addressInput = document.getElementById('address-input');
    
    // Stable Autocomplete for standard input
    const { Autocomplete } = await google.maps.importLibrary("places");
    autocomplete = new Autocomplete(addressInput, {
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['geocode', 'establishment']
    });

    // Handle place selection from dropdown
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
            locations.push({
                name: place.formatted_address || place.name,
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
            });
            addressInput.value = '';
            saveToStorage();
            updateUI();
            recalculateAndRedraw();
            showStatus(`Added participant location`, 'info');
        }
    });

    document.getElementById('add-location-btn').addEventListener('click', handleAddLocation);
    document.getElementById('current-location-btn').addEventListener('click', handleCurrentLocation);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('search-poi-btn').addEventListener('click', handleSearchPois);
    document.getElementById('share-btn').addEventListener('click', handleShareMeetup);
    
    // Toggle custom query input
    document.getElementById('poi-type').addEventListener('change', (e) => {
        const customContainer = document.getElementById('custom-poi-container');
        if (e.target.value === 'custom') {
            customContainer.classList.remove('hidden');
        } else {
            customContainer.classList.add('hidden');
        }
    });

    // Update circle in real-time when radius changes
    document.getElementById('search-radius').addEventListener('input', recalculateAndRedraw);
    
    addressInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddLocation();
    });

    // Initial theme check
    if (localStorage.getItem('meetway_theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // Load from URL or Local Storage
    const urlParams = new URLSearchParams(window.location.search);
    const meetupData = urlParams.get('meetup');
    if (meetupData) {
        try {
            locations = JSON.parse(atob(meetupData));
            updateUI();
            recalculateAndRedraw();
            showStatus('Meetup plan loaded from link!', 'info');
        } catch (e) {
            loadFromStorage();
        }
    } else {
        loadFromStorage();
    }
}

// --- PERSISTENCE & SHARING ---
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('meetway_theme', isDark ? 'dark' : 'light');
    showStatus(`${isDark ? 'Dark' : 'Light'} mode enabled`, 'info');
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
}

function loadFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            locations = JSON.parse(saved);
            if (locations.length > 0) {
                updateUI();
                recalculateAndRedraw();
            }
        } catch (e) { console.error(e); }
    }
}

function handleShareMeetup() {
    if (locations.length === 0) {
        showStatus('Add locations first.', 'error');
        return;
    }
    const data = btoa(JSON.stringify(locations));
    const radius = document.getElementById('search-radius').value;
    const shareUrl = `${window.location.origin}${window.location.pathname}?meetup=${data}&radius=${radius}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        showStatus('Link copied to clipboard!', 'info');
    });
}

// --- EVENT HANDLERS ---
function handleCurrentLocation() {
    if (!navigator.geolocation) {
        showStatus('Geolocation is not supported by your browser.', 'error');
        return;
    }

    showStatus('Getting your location...', 'info');
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    locations.push({
                        name: results[0].formatted_address,
                        lat: lat,
                        lng: lng
                    });
                    saveToStorage();
                    updateUI();
                    recalculateAndRedraw();
                    showStatus('Current location added!', 'info');
                } else {
                    // Fallback to coordinates if geocoding fails
                    locations.push({
                        name: `My Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                        lat: lat,
                        lng: lng
                    });
                    saveToStorage();
                    updateUI();
                    recalculateAndRedraw();
                }
            });
        },
        (error) => {
            showStatus(`Location error: ${error.message}`, 'error');
        }
    );
}

function handleAddLocation() {
    const addressInput = document.getElementById('address-input');
    const address = addressInput.value.trim();
    if (!address) return;

    showStatus('Finding address...', 'info');
    geocoder.geocode({ address: address }, (results, status) => {
        if (status === 'OK') {
            const location = results[0].geometry.location;
            locations.push({
                name: results[0].formatted_address,
                lat: location.lat(),
                lng: location.lng()
            });
            addressInput.value = '';
            saveToStorage();
            updateUI();
            recalculateAndRedraw();
            showStatus('Location added!', 'info');
        } else {
            showStatus(`Location not found: ${status}`, 'error');
        }
    });
}
function handleRemoveLocation(index) {
    locations.splice(index, 1);
    saveToStorage();
    updateUI();
    recalculateAndRedraw();
}

let isSearching = false;
async function handleSearchPois() {
    if (isSearching) return;
    if (locations.length < 2) {
        showStatus('Add at least two participants first.', 'error');
        return;
    }

    const searchBtn = document.getElementById('search-poi-btn');
    const originalBtnText = searchBtn.textContent;
    
    isSearching = true;
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';

    clearPois();
    const center = calculateGeographicCenter(locations);
    const poiType = document.getElementById('poi-type').value;
    const customQuery = document.getElementById('custom-poi-query').value.trim();
    const radiusKm = parseInt(document.getElementById('search-radius').value, 10);
    const radiusM = radiusKm * 1000;

    try {
        const { Place } = await google.maps.importLibrary("places");
        let places = [];

        if (poiType === 'custom') {
            if (!customQuery) {
                showStatus('Please enter a search term.', 'error');
                resetSearchState();
                return;
            }
            showStatus(`Searching for "${customQuery}"...`, 'info');
            const request = {
                fields: ['displayName', 'location', 'rating', 'userRatingCount', 'priceLevel'],
                textQuery: customQuery,
                locationBias: { center: center, radius: radiusM },
                maxResultCount: 20,
            };
            const result = await Place.searchByText(request);
            places = result.places;
        } else {
            showStatus(`Searching for ${poiType}s...`, 'info');
            const request = {
                fields: ['displayName', 'location', 'rating', 'userRatingCount', 'priceLevel'],
                locationRestriction: { center: center, radius: radiusM },
                includedPrimaryTypes: [poiType],
                maxResultCount: 20,
            };
            const result = await Place.searchNearby(request);
            places = result.places;
        }

        if (places && places.length > 0) {
            foundPois = places;
            foundPois.forEach((place, index) => {
                const marker = new google.maps.marker.AdvancedMarkerElement({
                    map: map,
                    position: place.location,
                    title: place.displayName ? (typeof place.displayName === 'string' ? place.displayName : place.displayName.text) : 'Location',
                });
                
                // Custom Marker Style
                const icon = document.createElement('div');
                icon.innerHTML = '📍';
                icon.style.fontSize = '24px';
                icon.style.filter = 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))';
                marker.content = icon;

                marker.addListener('click', () => showPoiDetails(index));
                poiMarkers.push(marker);
            });
            updatePoiList();
            document.getElementById('poi-details-panel').classList.add('visible');
        } else {
            showStatus(`No results found in this area.`, 'info');
        }
    } catch (error) {
        console.error('Search error:', error);
        showStatus('Search failed. Please try again.', 'error');
    } finally {
        resetSearchState();
    }

    function resetSearchState() {
        isSearching = false;
        searchBtn.disabled = false;
        searchBtn.textContent = originalBtnText;
    }
}

async function updatePoiList() {
    const list = document.getElementById('poi-list');
    list.innerHTML = '';
    foundPois.forEach((place, index) => {
        const name = place.displayName ? (typeof place.displayName === 'string' ? place.displayName : place.displayName.text) : 'Unknown';
        const rating = place.rating ? `⭐ ${place.rating}` : 'No rating';
        
        const div = document.createElement('div');
        div.className = 'poi-item';
        div.innerHTML = DOMPurify.sanitize(`
            <div>
                <div class="poi-item-name">${name}</div>
                <div class="poi-item-meta">${rating} • Click for details</div>
            </div>
            <div style="font-size: 20px; color: var(--primary);">→</div>
        `, { ADD_ATTR: ['style'] });
        div.onclick = (e) => {
            e.stopPropagation();
            showPoiDetails(index);
        };
        list.appendChild(div);
    });
}

async function showPoiDetails(index) {
    const place = foundPois[index];
    if (!place) return;

    try {
        // Correct field names for the New Places Library (Note: URI must be uppercase)
        const detailsFields = ['id', 'displayName', 'rating', 'userRatingCount', 'photos', 'websiteURI', 'internationalPhoneNumber', 'googleMapsURI', 'priceLevel'];
        await place.fetchFields({ fields: detailsFields });
        currentPoiDetails = place;

        const name = place.displayName ? (typeof place.displayName === 'string' ? place.displayName : place.displayName.text) : 'Details';
        document.getElementById('poi-info-name').textContent = name;
        
        const infoContent = document.getElementById('poi-info-content');
        infoContent.innerHTML = ''; // Clear previous
        
        // Hero Image - Directly create and append element to avoid string-based sanitization stripping
        if (place.photos && place.photos.length > 0) {
            const img = document.createElement('img');
            img.src = place.photos[0].getURI({ maxWidth: 400, maxHeight: 250 });
            img.className = 'poi-hero-img';
            img.alt = name;
            infoContent.appendChild(img);
        }

        let contentHTML = '';
        contentHTML += `<div id="distance-info" style="margin-bottom: 20px;">
            <strong style="font-size: 14px; display: block; margin-bottom: 8px;">Travel Times</strong>
            <div id="distance-matrix-results" style="background: var(--bg-light); padding: 12px; border-radius: 8px; font-size: 13px;">Calculating...</div>
        </div>`;

        if (place.rating) {
            contentHTML += `<p><strong>Rating:</strong> ⭐ ${place.rating} (${place.userRatingCount} reviews)</p>`;
        }
        
        if (place.internationalPhoneNumber) {
            contentHTML += `<p><strong>Phone:</strong> <a href="tel:${place.internationalPhoneNumber}">${place.internationalPhoneNumber}</a></p>`;
        }

        // Access as websiteURI
        if (place.websiteURI) {
            contentHTML += `<p><strong>Website:</strong> <a href="${place.websiteURI}" target="_blank" rel="noopener noreferrer">Visit Site</a></p>`;
        }

        // Append the sanitized text content AFTER the image
        const detailsDiv = document.createElement('div');
        detailsDiv.innerHTML = DOMPurify.sanitize(contentHTML, { 
            ADD_ATTR: ['href', 'target', 'rel', 'style']
        });
        infoContent.appendChild(detailsDiv);

        document.getElementById('poi-info-view').classList.add('open');
        
        calculateDistances(place.location);
        map.panTo(place.location);
        map.setZoom(15);
    } catch (error) {
        console.error('Error fetching place details:', error);
        showStatus('Error loading details. Check console.', 'error');
    }
}

async function calculateDistances(destination) {
    const mode = document.getElementById('travel-mode').value;
    const origins = locations.map(l => `${l.lat},${l.lng}`).join('|');
    const destStr = `${destination.lat()},${destination.lng()}`;

    try {
        const response = await fetch(`/api/distance-matrix?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destStr)}&travelMode=${mode}`);
        const data = await response.json();
        
        const resultsEl = document.getElementById('distance-matrix-results');
        if (data.status === 'OK') {
            let results = [];
            let durations = [];

            data.rows.forEach((row, i) => {
                const el = row.elements[0];
                if (el.status === 'OK') {
                    durations.push(el.duration.value);
                    results.push({
                        name: locations[i].name.split(',')[0],
                        durationText: el.duration.text,
                        durationValue: el.duration.value
                    });
                }
            });

            if (durations.length > 0) {
                const minDuration = Math.min(...durations);
                const maxDuration = Math.max(...durations);

                let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
                results.forEach(res => {
                    let label = '';
                    if (durations.length > 1) {
                        if (res.durationValue === minDuration) label = '<span class="time-label time-fastest">Fastest</span>';
                        else if (res.durationValue === maxDuration) label = '<span class="time-label time-slowest">Slowest</span>';
                    }

                    html += `<li style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--text-sub);">${res.name}:</span>
                        <div>
                            <strong style="color: var(--text-main);">${res.durationText}</strong>
                            ${label}
                        </div>
                    </li>`;
                });
                html += '</ul>';
                resultsEl.innerHTML = DOMPurify.sanitize(html, { ADD_ATTR: ['style'] });
                updateFairness(durations);
            }
        }
    } catch (error) {
        console.error('Distance calculation error:', error);
        document.getElementById('distance-matrix-results').textContent = 'Error calculating distances.';
    }
}
function updateFairness(durations) {
    const fairnessEl = document.getElementById('fairness-score');
    if (durations.length < 2) return;

    const max = Math.max(...durations);
    const min = Math.min(...durations);
    const diffMin = (max - min) / 60; // difference in minutes

    fairnessEl.classList.remove('hidden', 'fairness-good', 'fairness-warning');
    if (diffMin < 10) {
        fairnessEl.classList.add('fairness-good');
        fairnessEl.innerHTML = DOMPurify.sanitize('⚖️ <strong>Very Fair:</strong> Travel times are balanced within 10 mins.', { ADD_ATTR: ['style'] });
    } else {
        fairnessEl.classList.add('fairness-warning');
        fairnessEl.innerHTML = DOMPurify.sanitize(`⚖️ <strong>Unbalanced:</strong> ${Math.round(diffMin)} min difference between participants.`, { ADD_ATTR: ['style'] });
    }
}

// --- CORE LOGIC ---
function calculateGeographicCenter(coords) {
    let x = 0, y = 0, z = 0;
    coords.forEach(c => {
        const lat = c.lat * Math.PI / 180;
        const lon = c.lng * Math.PI / 180;
        x += Math.cos(lat) * Math.cos(lon);
        y += Math.cos(lat) * Math.sin(lon);
        z += Math.sin(lat);
    });
    const count = coords.length;
    x /= count; y /= count; z /= count;
    const centerLng = Math.atan2(y, x) * 180 / Math.PI;
    const centerLat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
    return { lat: centerLat, lng: centerLng };
}

function recalculateAndRedraw() {
    clearMarkers();
    if (searchCircle) searchCircle.setMap(null);

    const bounds = new google.maps.LatLngBounds();
    locations.forEach((loc, index) => {
        const marker = new google.maps.marker.AdvancedMarkerElement({
            map: map,
            position: { lat: loc.lat, lng: loc.lng },
            title: loc.name,
        });
        const icon = document.createElement('div');
        icon.innerHTML = '👤';
        icon.style.fontSize = '24px';
        marker.content = icon;
        inputMarkers.push(marker);
        bounds.extend(marker.position);
    });

    if (locations.length >= 2) {
        const center = calculateGeographicCenter(locations);
        centerMarker = new google.maps.marker.AdvancedMarkerElement({
            map: map, position: center, title: 'Center'
        });
        const icon = document.createElement('div');
        icon.innerHTML = '🎯'; icon.style.fontSize = '32px';
        centerMarker.content = icon;

        const radiusM = parseInt(document.getElementById('search-radius').value, 10) * 1000;
        searchCircle = new google.maps.Circle({
            map: map, center: center, radius: radiusM,
            strokeColor: '#1a73e8', strokeOpacity: 0.3, strokeWeight: 2,
            fillColor: '#1a73e8', fillOpacity: 0.1
        });

        document.getElementById('center-coords').textContent = `Balanced Midpoint: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
        map.fitBounds(bounds, 50);
    }
}

function updateUI() {
    const list = document.getElementById('locations-list');
    list.innerHTML = '';
    locations.forEach((loc, index) => {
        const li = document.createElement('li');
        li.className = 'location-card';
        
        // Use separate elements and event listeners instead of inline onclick for security
        const info = document.createElement('div');
        info.className = 'location-info';
        info.innerHTML = DOMPurify.sanitize(`<span class="location-name">${loc.name}</span>`);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '✕';
        removeBtn.title = 'Remove Location';
        removeBtn.onclick = () => handleRemoveLocation(index);
        
        li.appendChild(info);
        li.appendChild(removeBtn);
        list.appendChild(li);
    });
}

function showHowItWorks() {
    const message = "MeetWay calculates the geographic center between all participants, " +
                    "then searches for nearby points of interest. We calculate a 'Fairness Score' " +
                    "based on the difference in travel times to ensure a balanced meeting spot.";
    showStatus(message, 'info');
}

let statusTimeout;
function showStatus(message, type) {
    const el = document.getElementById('status-message');
    el.textContent = message;
    
    // Clear previous types and the hidden class
    el.classList.remove('hidden', 'info', 'error');
    if (type) el.classList.add(type);
    
    // Reset timer
    if (statusTimeout) clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
        el.classList.add('hidden');
    }, 4000);
}

function clearMarkers() {
    inputMarkers.forEach(m => m.map = null);
    if (centerMarker) centerMarker.map = null;
    inputMarkers = [];
}

function clearPois() {
    poiMarkers.forEach(m => m.map = null);
    poiMarkers = [];
    foundPois = [];
    document.getElementById('poi-details-panel').classList.remove('visible');
    document.getElementById('poi-info-view').classList.remove('open');
    document.getElementById('fairness-score').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    // Drawer navigation
    document.getElementById('poi-back-btn').addEventListener('click', () => {
        document.getElementById('poi-info-view').classList.remove('open');
    });
    document.getElementById('poi-close-btn').addEventListener('click', () => {
        document.getElementById('poi-details-panel').classList.remove('visible');
    });
    document.getElementById('poi-back-to-map-btn').addEventListener('click', () => {
        document.getElementById('poi-details-panel').classList.remove('visible');
    });

    document.getElementById('directions-btn').addEventListener('click', () => {
        if (!currentPoiDetails || locations.length === 0) return;
        const name = currentPoiDetails.displayName ? (typeof currentPoiDetails.displayName === 'string' ? currentPoiDetails.displayName : currentPoiDetails.displayName.text) : 'Location';
        const mode = document.getElementById('travel-mode').value.toLowerCase();
        const url = `https://www.google.com/maps/dir/?api=1&origin=${locations[0].lat},${locations[0].lng}&destination=${encodeURIComponent(name)}&destination_place_id=${currentPoiDetails.id}&travelmode=${mode}`;
        window.open(url, '_blank');
    });
    document.getElementById('streetview-btn').addEventListener('click', () => {
        if (!currentPoiDetails) return;
        const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${currentPoiDetails.location.lat()},${currentPoiDetails.location.lng()}`;
        window.open(url, '_blank');
    });
});
