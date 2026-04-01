// --- GLOBAL STATE & CONFIGURATION ---
let map;
let geocoder;
let infoWindow;
let locations = []; // Stores {name, lat, lng}
let inputMarkers = [];
let poiMarkers = [];
let centerMarker = null;
let searchCircle = null;
let foundPois = []; // Store the full Place objects
let currentPoiDetails = null; // <-- NEW: Store the currently selected POI details

// --- INITIALIZATION ---
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 4,
        center: { lat: 39.8283, lng: -98.5795 },
        mapId: 'DEMO_MAP_ID',
    });
    geocoder = new google.maps.Geocoder();
    infoWindow = new google.maps.InfoWindow();

    document.getElementById('add-location-btn').addEventListener('click', handleAddLocation);
    document.getElementById('search-poi-btn').addEventListener('click', handleSearchPois);
    
    document.getElementById('address-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddLocation();
    });
}

// --- EVENT HANDLERS ---
function handleAddLocation() {
    const addressInput = document.getElementById('address-input');
    const address = addressInput.value.trim();
    if (!address) {
        showStatus('Please enter an address.', 'error');
        return;
    }
    showStatus('Geocoding address...', 'info');
    geocoder.geocode({ address: address }, (results, status) => {
        if (status === 'OK') {
            const location = results[0].geometry.location;
            locations.push({
                name: results[0].formatted_address,
                lat: location.lat(),
                lng: location.lng()
            });
            addressInput.value = '';
            updateUI();
            recalculateAndRedraw();
            showStatus(`Added: ${results[0].formatted_address}`, 'info');
        } else {
            showStatus(`Geocode failed: ${status}`, 'error');
        }
    });
}

function handleRemoveLocation(index) {
    locations.splice(index, 1);
    updateUI();
    recalculateAndRedraw();
}

async function handleSearchPois() {
    if (locations.length < 2) {
        showStatus('Add at least two locations first.', 'error');
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
        fields: ['displayName', 'location'],
        locationRestriction: { center: center, radius: radiusM },
        includedPrimaryTypes: [type],
        maxResultCount: 20,
    };

    // @ts-ignore
    const { places } = await Place.searchNearby(request);

    if (places && places.length > 0) {
        foundPois = places;
        foundPois.forEach((place, index) => {
            const marker = new google.maps.marker.AdvancedMarkerElement({
                map: map,
                position: place.location,
                title: place.displayName,
            });
            marker.content = document.createElement('img');
            marker.content.src = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
            marker.content.style.width = '32px';
            marker.content.style.height = '32px';

            marker.addListener('click', () => showPoiDetails(index));
            
            poiMarkers.push(marker);
        });
        updatePoiDetailsPanel();
        showStatus(`Found ${foundPois.length} ${type}(s). Click a green pin or a list item to see details.`, 'info');
    } else {
        showStatus(`No ${type}s found.`, 'info');
    }
}

// --- NEW: Function to populate the POI list panel ---
function updatePoiDetailsPanel() {
    const panel = document.getElementById('poi-details-panel');
    const list = document.getElementById('poi-list');
    list.innerHTML = '';

    if (foundPois.length === 0) {
        panel.classList.add('hidden');
        return;
    }

    panel.classList.remove('hidden');
    foundPois.forEach((place, index) => {
        const li = document.createElement('li');
        li.textContent = place.displayName;
        li.onclick = () => showPoiDetails(index);
        list.appendChild(li);
    });
}

// --- REWRITTEN: Function to display rich, interactive details for a selected POI ---
async function showPoiDetails(index) {
    const place = foundPois[index];
    if (!place) return;

    // 1. Highlight the active list item
    const listItems = document.querySelectorAll('#poi-list li');
    listItems.forEach((item, i) => item.classList.toggle('active', i === index));

    // 2. Center map on the selected marker
    map.panTo(place.location);

    // 3. Fetch detailed fields for the place
    const detailsFields = ['id','rating', 'userRatingCount', 'photos', 'website', 'internationalPhoneNumber', 'googleMapsUri'];
    await place.fetchFields({ fields: detailsFields });

    // 4. Store current POI for action button use
    currentPoiDetails = place;

    // 5. Populate the details panel
    const nameEl = document.getElementById('poi-info-name');
    const contentEl = document.getElementById('poi-info-content');
    const actionsEl = document.getElementById('poi-actions');

    nameEl.textContent = place.displayName;
    let contentHTML = '';

    // Rating
    if (place.rating) {
        const stars = '★'.repeat(Math.round(place.rating));
        contentHTML += `<p><strong>Rating:</strong> <span style="color: #fbbc04;">${stars}</span> ${place.rating} (${place.userRatingCount} reviews)</p>`;
    }
    
    // Phone Number
    if (place.internationalPhoneNumber) {
        contentHTML += `<p><strong>Phone:</strong> <a href="tel:${place.internationalPhoneNumber}">${place.internationalPhoneNumber}</a></p>`;
    }

    // Website
    if (place.website) {
        contentHTML += `<p><strong>Website:</strong> <a href="${place.website}" target="_blank" rel="noopener noreferrer">Visit Website</a></p>`;
    }

    // Photo Gallery
    if (place.photos && place.photos.length > 0) {
        contentHTML += `<div id="photo-gallery">`;
        contentHTML += `<img id="main-photo" src="${place.photos[0].getUrl({ maxWidth: 400, maxHeight: 250 })}" alt="Photo of ${place.displayName}">`;
        if (place.photos.length > 1) {
            contentHTML += `<div id="photo-thumbnails">`;
            place.photos.forEach((photo, i) => {
                const thumbUrl = photo.getUrl({ maxWidth: 50, maxHeight: 50 });
                contentHTML += `<img src="${thumbUrl}" data-main="${photo.getUrl({ maxWidth: 400, maxHeight: 250 })}" class="${i === 0 ? 'active' : ''}" onclick="swapMainPhoto(this)">`;
            });
            contentHTML += `</div>`;
        }
        contentHTML += `</div>`;
    }
    
    if (contentHTML === '') {
        contentHTML = '<p>No further details available.</p>';
    }

    contentEl.innerHTML = contentHTML;
    actionsEl.classList.remove('hidden'); // Show the action buttons
}

// --- NEW: Helper function for photo gallery ---
function swapMainPhoto(thumbnail) {
    const mainPhoto = document.getElementById('main-photo');
    mainPhoto.src = thumbnail.dataset.main;
    
    // Update active thumbnail
    document.querySelectorAll('#photo-thumbnails img').forEach(thumb => thumb.classList.remove('active'));
    thumbnail.classList.add('active');
}

// --- NEW: Action Button Handlers ---
// Replace the entire function with this corrected version
function handleGetDirections() {
    if (!currentPoiDetails || !locations.length) return;

    // Use the coordinates of the first location for a precise origin
    const originCoords = `${locations[0].lat},${locations[0].lng}`;

    // Use the unique Place ID for a precise destination
    const destinationPlaceId = currentPoiDetails.id;

    // Construct the correct Google Maps directions URL
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originCoords}&destination=place_id:${destinationPlaceId}`;

    // Open the directions in a new tab
    window.open(url, '_blank');
}

function handleViewStreetView() {
    if (!currentPoiDetails) return;
    const url = `https://maps.google.com/maps?q=&layer=c&cbll=${currentPoiDetails.location.lat()},${currentPoiDetails.location.lng()}`;
    window.open(url, '_blank');
}

// Attach action button listeners after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('directions-btn').addEventListener('click', handleGetDirections);
    document.getElementById('streetview-btn').addEventListener('click', handleViewStreetView);
});


// --- CORE LOGIC ---
function calculateGeographicCenter(coords) {
    if (coords.length === 0) return { lat: 0, lng: 0 };
    let x = 0.0, y = 0.0, z = 0.0;
    coords.forEach(coord => {
        const lat = coord.lat * Math.PI / 180;
        const lon = coord.lng * Math.PI / 180;
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

    if (locations.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        locations.forEach((loc, index) => {
            const marker = new google.maps.marker.AdvancedMarkerElement({
                map: map,
                position: { lat: loc.lat, lng: loc.lng },
                title: loc.name,
            });
            marker.content = document.createElement('img');
            marker.content.src = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
            marker.content.style.width = '32px';
            marker.content.style.height = '32px';

            marker.addListener('click', () => {
                infoWindow.setContent(`<strong>${loc.name}</strong>`);
                infoWindow.open(map, marker);
            });

            inputMarkers.push(marker);
            bounds.extend(marker.position);
        });

        const center = calculateGeographicCenter(locations);
        centerMarker = new google.maps.marker.AdvancedMarkerElement({
            map: map,
            position: center,
            title: 'Geographic Center',
        });
        centerMarker.content = document.createElement('img');
        centerMarker.content.src = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
        centerMarker.content.style.width = '32px';
        centerMarker.content.style.height = '32px';
        
        const radiusM = parseInt(document.getElementById('search-radius').value, 10) * 1000;
        searchCircle = new google.maps.Circle({
            map: map, center: center, radius: radiusM,
            strokeColor: '#FF0000', strokeOpacity: 0.5, strokeWeight: 2,
            fillColor: '#FF0000', fillOpacity: 0.15
        });

        document.getElementById('center-coords').textContent = `Center: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;

        if (locations.length === 1) {
            map.setCenter(locations[0]);
            map.setZoom(12);
        } else {
            map.fitBounds(bounds);
        }
    } else {
        document.getElementById('center-coords').textContent = 'Add at least two locations to calculate the center.';
    }
}

// --- UI HELPERS ---
function updateUI() {
    const list = document.getElementById('locations-list');
    list.innerHTML = '';
    locations.forEach((loc, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="location-item" onclick="showMarkerInfo(${index})">${loc.name}</span>
            <button class="remove-btn" onclick="event.stopPropagation(); handleRemoveLocation(${index})">Remove</button>
        `;
        list.appendChild(li);
    });
}

function showMarkerInfo(index) {
    if (inputMarkers[index]) {
        google.maps.event.trigger(inputMarkers[index], 'click');
    }
}

function showStatus(message, type) {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = '';
    if (type) statusEl.classList.add(type);
    statusEl.classList.remove('hidden');
    setTimeout(() => statusEl.classList.add('hidden'), 6000);
}

function clearMarkers() {
    inputMarkers.forEach(marker => marker.map = null);
    if (centerMarker) centerMarker.map = null;
    inputMarkers = [];
    centerMarker = null;
}

function clearPois() {
    poiMarkers.forEach(marker => marker.map = null);
    poiMarkers = [];
    foundPois = [];
    currentPoiDetails = null; // Clear the stored POI
    document.getElementById('poi-details-panel').classList.add('hidden');
    document.getElementById('poi-actions').classList.add('hidden'); // Hide action buttons
}