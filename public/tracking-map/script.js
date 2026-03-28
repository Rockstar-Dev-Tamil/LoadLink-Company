const TRACKING_CONFIG = {
    driver: {
        name: "Rahul Verma",
        truckNumber: "TN 01 AB 4271",
        lat: 13.0827,
        lng: 80.2707
    },
    pickup: {
        businessName: "South Hub Warehouse",
        address: "Salem, Tamil Nadu",
        lat: 11.6643,
        lng: 78.1460
    },
    routeProfile: "driving",
    movementStepMs: 100, // Faster updates for smooth movement
    speedMultiplier: 50, // 50x real speed for the demo
    followZoom: 14
};

const state = {
    map: null,
    driverMarker: null,
    pickupMarker: null,
    routeLine: null,
    routeShadow: null,
    routeData: null,
    simulationTimer: null,
    elapsedMs: 0,
    speedMps: 0,
    currentSegmentIndex: 0,
    followDriver: true
};

function checkGoogleAndInit() {
    console.log("Checking Google Maps SDK...");
    if (typeof google !== 'undefined' && google.maps && google.maps.DirectionsService) {
        console.log("Google Maps SDK ready. Initializing...");
        initialize();
    } else {
        setTimeout(checkGoogleAndInit, 100);
    }
}

if (document.readyState === 'complete') {
    checkGoogleAndInit();
} else {
    window.addEventListener('load', checkGoogleAndInit);
}

async function initialize() {
    setupMap();
    try {
        console.log("Fetching route from", TRACKING_CONFIG.driver, "to", TRACKING_CONFIG.pickup);
        const routeData = await fetchRoute(TRACKING_CONFIG.driver, TRACKING_CONFIG.pickup);
        state.routeData = prepareRoute(routeData);
        state.speedMps = (state.routeData.distanceMeters / Math.max(state.routeData.durationSeconds, 1)) * TRACKING_CONFIG.speedMultiplier;
        
        console.log("Route prepared. Distance:", state.routeData.distanceMeters, "m. Speed:", state.speedMps, "m/s");
        
        drawRoute(state.routeData);
        addMarkers();
        startSimulation();
    } catch (error) {
        console.error("Simulation failed to initialize:", error);
    }
}

function setupMap() {
    const darkMapStyle = [
      { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] }
    ];

    state.map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: TRACKING_CONFIG.driver.lat, lng: TRACKING_CONFIG.driver.lng },
        zoom: 13,
        styles: darkMapStyle,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy"
    });
}

function fetchRoute(origin, destination) {
    const directionsService = new google.maps.DirectionsService();
    return new Promise((resolve, reject) => {
        directionsService.route({
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: destination.lat, lng: destination.lng },
            travelMode: google.maps.TravelMode.DRIVING
        }, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                resolve(result.routes[0]);
            } else {
                reject(new Error("Directions request failed: " + status));
            }
        });
    });
}

function prepareRoute(route) {
    const legs = route.legs[0];
    const coordinates = route.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
    const cumulativeDistances = [0];
    let totalDist = 0;
    for (let i = 1; i < coordinates.length; i++) {
        totalDist += haversineMeters(coordinates[i-1], coordinates[i]);
        cumulativeDistances.push(totalDist);
    }
    return {
        coordinates,
        cumulativeDistances,
        distanceMeters: legs.distance.value,
        durationSeconds: legs.duration.value
    };
}

function drawRoute(routeData) {
    const path = routeData.coordinates.map(p => new google.maps.LatLng(p.lat, p.lng));
    state.routeShadow = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: "rgba(55, 115, 255, 0.2)",
        strokeWeight: 12,
        map: state.map
    });
    state.routeLine = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: "#3b82f6",
        strokeWeight: 5,
        map: state.map
    });
}

function addMarkers() {
    state.pickupMarker = new google.maps.Marker({
        position: { lat: TRACKING_CONFIG.pickup.lat, lng: TRACKING_CONFIG.pickup.lng },
        map: state.map,
        title: "Destination: Salem",
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
            scale: 8
        }
    });

    state.driverMarker = new google.maps.Marker({
        position: { lat: TRACKING_CONFIG.driver.lat, lng: TRACKING_CONFIG.driver.lng },
        map: state.map,
        title: "Truck: TN 01 AB 4271",
        zIndex: 100,
        icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 6,
            rotation: 0
        }
    });
}

function startSimulation() {
    console.log("Starting simulation loop...");
    const interval = TRACKING_CONFIG.movementStepMs;
    const speedPerTick = state.speedMps * (interval / 1000);

    state.simulationTimer = setInterval(() => {
        state.elapsedMs += interval;
        const travelled = Math.min((state.elapsedMs / 1000) * state.speedMps, state.routeData.distanceMeters);
        const point = locatePointAlongRoute(travelled);
        
        const latLng = { lat: point.lat, lng: point.lng };
        state.driverMarker.setPosition(latLng);
        
        // Update rotation if bearing changed significantly
        const icon = state.driverMarker.getIcon();
        if (icon && Math.abs(icon.rotation - point.bearing) > 2) {
            icon.rotation = point.bearing;
            state.driverMarker.setIcon(icon);
        }
        
        if (state.followDriver) {
            state.map.panTo(latLng);
            if (state.map.getZoom() !== TRACKING_CONFIG.followZoom) {
                state.map.setZoom(TRACKING_CONFIG.followZoom);
            }
        }

        if (travelled >= state.routeData.distanceMeters) {
            console.log("Simulation finished: reached destination.");
            clearInterval(state.simulationTimer);
        }
    }, interval);

    // Initial focus
    if (state.followDriver) {
        state.map.setCenter({ lat: TRACKING_CONFIG.driver.lat, lng: TRACKING_CONFIG.driver.lng });
        state.map.setZoom(TRACKING_CONFIG.followZoom);
    }
}

function locatePointAlongRoute(targetDistance) {
    const { coordinates, cumulativeDistances } = state.routeData;
    while (state.currentSegmentIndex < cumulativeDistances.length - 2 && cumulativeDistances[state.currentSegmentIndex + 1] < targetDistance) {
        state.currentSegmentIndex += 1;
    }
    const startIndex = state.currentSegmentIndex;
    const startPoint = coordinates[startIndex];
    const endPoint = coordinates[startIndex + 1];
    const startDist = cumulativeDistances[startIndex];
    const endDist = cumulativeDistances[startIndex + 1];
    const progress = (targetDistance - startDist) / (endDist - startDist || 1);

    return {
        lat: startPoint.lat + (endPoint.lat - startPoint.lat) * progress,
        lng: startPoint.lng + (endPoint.lng - startPoint.lng) * progress,
        bearing: calculateBearing(startPoint, endPoint)
    };
}

function haversineMeters(p1, p2) {
    const R = 6371000;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function calculateBearing(p1, p2) {
    const l1 = p1.lat * Math.PI / 180;
    const l2 = p2.lat * Math.PI / 180;
    const dl = (p2.lng - p1.lng) * Math.PI / 180;
    const y = Math.sin(dl) * Math.cos(l2);
    const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dl);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
