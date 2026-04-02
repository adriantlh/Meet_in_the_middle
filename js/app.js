// --- GLOBAL STATE & CONFIGURATION ---
let map, geocoder, infoWindow, autocomplete, distanceService;
window.initMap = initMap; // Ensure it's globally available
let locations = []; 
let inputMarkers = [];
let poiMarkers = [];
let centerMarker = null;
let searchCircle = null;
let foundPois = []; 
let currentPoiDetails = null;

const STORAGE_KEY = 'meetway_locations';

// --- INITIALIZATION ---
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 4,
        center: { lat: 39.8283, lng: -98.5795 },
        mapId: 'DEMO_MAP_ID',
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false
    });
    geocoder = new google.maps.Geocoder();
    infoWindow = new google.maps.InfoWindow();
    distanceService = new google.maps.DistanceMatrixService();

    const addressInput = document.getElementById('address-input');
    autocomplete = new google.maps.places.Autocomplete(addressInput, {
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['geocode', 'establishment']
    });

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
            addLocationFromPlace(place);
            addressInput.value = '';
        }
    });

    document.getElementById('add-location-btn').addEventListener('click', handleAddLocation);
    document.getElementById('search-poi-btn').addEventListener('click', handleSearchPois);
    document.getElementById('share-btn').addEventListener('click', handleShareMeetup);
    
    // Update circle in real-time when radius changes
    document.getElementById('search-radius').addEventListener('input', recalculateAndRedraw);
    
    addressInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddLocation();
    });

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
function addLocationFromPlace(place) {
    const location = place.geometry.location;
    locations.push({
        name: place.formatted_address || place.name,
        lat: location.lat(),
        lng: location.lng()
    });
    saveToStorage();
    updateUI();
    recalculateAndRedraw();
    showStatus(`Added participant location`, 'info');
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
        } else {
            showStatus(`Geocode failed: ${status}`, 'error');
        }
    });
}

function handleRemoveLocation(index) {
    locations.splice(index, 1);
    saveToStorage();
    updateUI();
    recalculateAndRedraw();
}

async function handleSearchPois() {
    if (locations.length < 2) {
        showStatus('Add at least two participants first.', 'error');
        return;
    }
    clearPois();
    const center = calculateGeographicCenter(locations);
    const type = document.getElementById('poi-type').value;
    const radiusKm = parseInt(document.getElementById('search-radius').value, 10);
    const radiusM = radiusKm * 1000;

    showStatus(`Searching for ${type}s...`, 'info');

    const { Place } = await google.maps.importLibrary("places");
    const request = {
        fields: ['displayName', 'location', 'rating', 'userRatingCount', 'priceLevel'],
        locationRestriction: { center: center, radius: radiusM },
        includedPrimaryTypes: [type],
        maxResultCount: 20,
    };

    const { places } = await Place.searchNearby(request);

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
        showStatus(`No ${type}s found in this area.`, 'info');
    }
}

function updatePoiList() {
    const list = document.getElementById('poi-list');
    list.innerHTML = '';
    foundPois.forEach((place, index) => {
        const name = place.displayName ? (typeof place.displayName === 'string' ? place.displayName : place.displayName.text) : 'Unknown';
        const rating = place.rating ? `⭐ ${place.rating}` : 'No rating';
        
        const div = document.createElement('div');
        div.className = 'poi-item';
        div.innerHTML = `
            <div>
                <div class="poi-item-name">${name}</div>
                <div class="poi-item-meta">${rating} • Click for details</div>
            </div>
            <div style="font-size: 20px; color: var(--primary);">→</div>
        `;
        div.onclick = () => showPoiDetails(index);
        list.appendChild(div);
    });
}

async function showPoiDetails(index) {
    const place = foundPois[index];
    if (!place) return;

    try {
        // Correct field names for the New Places Library (Note the uppercase URI)
        const detailsFields = ['id', 'displayName', 'rating', 'userRatingCount', 'photos', 'websiteURI', 'internationalPhoneNumber', 'googleMapsURI', 'priceLevel'];
        await place.fetchFields({ fields: detailsFields });
        currentPoiDetails = place;

        const name = place.displayName ? (typeof place.displayName === 'string' ? place.displayName : place.displayName.text) : 'Details';
        document.getElementById('poi-info-name').textContent = name;
        
        let contentHTML = '';
        
        // Hero Image
        if (place.photos && place.photos.length > 0) {
            contentHTML += `<img src="${place.photos[0].getURI({ maxWidth: 400, maxHeight: 250 })}" class="poi-hero-img">`;
        }

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
            contentHTML += `<p><strong>Website:</strong> <a href="${place.websiteURI}" target="_blank">Visit Site</a></p>`;
        }

        document.getElementById('poi-info-content').innerHTML = contentHTML;
        document.getElementById('poi-info-view').classList.add('open');
        
        calculateDistances(place.location);
        map.panTo(place.location);
        map.setZoom(15);
    } catch (error) {
        console.error('Error fetching place details:', error);
        showStatus('Error: ' + error.message, 'error');
    }
}

function calculateDistances(destination) {
    distanceService.getDistanceMatrix({
        origins: locations.map(l => ({ lat: l.lat, lng: l.lng })),
        destinations: [destination],
        travelMode: google.maps.TravelMode.DRIVING,
    }, (response, status) => {
        const resultsEl = document.getElementById('distance-matrix-results');
        if (status === 'OK') {
            let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
            let durations = [];
            
            response.rows.forEach((row, i) => {
                const el = row.elements[0];
                if (el.status === 'OK') {
                    durations.push(el.duration.value);
                    html += `<li style="margin-bottom: 6px;">
                        <span style="color: var(--text-sub);">${locations[i].name.split(',')[0]}:</span> 
                        <strong>${el.duration.text}</strong>
                    </li>`;
                }
            });
            html += '</ul>';
            resultsEl.innerHTML = html;
            updateFairness(durations);
        }
    });
}

function updateFairness(durations) {
    const fairnessEl = document.getElementById('fairness-score');
    if (durations.length < 2) return;

    const max = Math.max(...durations);
    const min = Math.min(...durations);
    const diffMin = (max - min) / 60; // difference in minutes

    fairnessEl.classList.remove('hidden');
    if (diffMin < 10) {
        fairnessEl.className = 'fairness-good';
        fairnessEl.innerHTML = '⚖️ <strong>Very Fair:</strong> Travel times are balanced within 10 mins.';
    } else {
        fairnessEl.className = 'fairness-warning';
        fairnessEl.innerHTML = `⚖️ <strong>Unbalanced:</strong> ${Math.round(diffMin)} min difference between participants.`;
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
        li.innerHTML = `
            <div class="location-info">
                <span class="location-name">${loc.name}</span>
            </div>
            <button class="remove-btn" onclick="handleRemoveLocation(${index})">✕</button>
        `;
        list.appendChild(li);
    });
}

function showStatus(message, type) {
    const el = document.getElementById('status-message');
    el.textContent = message;
    el.className = type || '';
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
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
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('directions-btn').addEventListener('click', () => {
        if (!currentPoiDetails) return;
        const url = `https://www.google.com/maps/dir/?api=1&origin=${locations[0].lat},${locations[0].lng}&destination=place_id:${currentPoiDetails.id}`;
        window.open(url, '_blank');
    });
    document.getElementById('streetview-btn').addEventListener('click', () => {
        if (!currentPoiDetails) return;
        const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${currentPoiDetails.location.lat()},${currentPoiDetails.location.lng()}`;
        window.open(url, '_blank');
    });
});
