import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different place categories
const createCustomIcon = (emoji, color = '#3b82f6') => {
  return L.divIcon({
    html: `
      <div style="
        background: linear-gradient(135deg, ${color}, ${color}dd);
        border: 3px solid white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        position: relative;
      ">
        ${emoji}
      </div>
    `,
    className: 'custom-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

// User location icon
const userLocationIcon = L.divIcon({
  html: `
    <div style="
      background: linear-gradient(135deg, #ef4444, #dc2626);
      border: 4px solid white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: pulse 2s infinite;
    "></div>
    <style>
      @keyframes pulse {
        0% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3); }
        50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3); }
        100% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3); }
      }
    </style>
  `,
  className: 'user-location-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Component to update map view when location changes
const MapUpdater = ({ location, places }) => {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], 13);
    }
  }, [location, map]);

  useEffect(() => {
    if (location && places.length > 0) {
      const bounds = L.latLngBounds();
      bounds.extend([location.lat, location.lng]);
      
      places.forEach(place => {
        bounds.extend([place.lat, place.lng]);
      });
      
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [location, places, map]);

  return null;
};

const MapComponent = ({ location, places, radius }) => {
  const mapRef = useRef();

  // Default center (if no location provided)
  const defaultCenter = [40.7128, -74.0060]; // New York City

  // Category colors for markers
  const categoryColors = {
    airport: '#3b82f6',
    bus_station: '#10b981',
    train_station: '#f59e0b',
    taxi_stand: '#eab308',
    ferry_terminal: '#06b6d4',
    truck_stop: '#8b5cf6',
    cafe: '#f97316',
    restaurant: '#ef4444',
    lodging: '#ec4899'
  };

  if (!location) {
    return (
      <div className="w-full h-full bg-gray-800 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-white/70 text-lg">Enter a location to view the map</p>
          <p className="text-white/50 text-sm mt-2">
            Use the search bar or current location button
          </p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      ref={mapRef}
      center={[location.lat, location.lng]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      className="rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapUpdater location={location} places={places} />

      {/* User location marker */}
      <Marker position={[location.lat, location.lng]} icon={userLocationIcon}>
        <Popup>
          <div className="text-center p-2">
            <div className="text-lg font-semibold mb-1">📍 Your Location</div>
            <div className="text-sm text-gray-600">
              {location.display_name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
            </div>
          </div>
        </Popup>
      </Marker>

      {/* Search radius circle */}
      <Circle
        center={[location.lat, location.lng]}
        radius={radius * 1000} // Convert km to meters
        pathOptions={{
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 5'
        }}
      />

      {/* Place markers */}
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={createCustomIcon(place.icon, categoryColors[place.category])}
        >
          <Popup maxWidth={300} className="custom-popup">
            <div className="p-3">
              <div className="flex items-start gap-3 mb-3">
                <div className="text-2xl">{place.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-800 leading-tight">
                    {place.name}
                  </h3>
                  <p className="text-gray-600 text-sm">{place.categoryName}</p>
                </div>
                <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full">
                  <span className="text-yellow-600 text-xs">⭐</span>
                  <span className="text-yellow-700 text-xs font-medium">
                    {place.rating.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-gray-700 text-sm">
                  <span className="text-blue-500">📍</span>
                  <span>{place.distance} km away</span>
                </div>
                
                <div className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="text-gray-400 mt-0.5">📍</span>
                  <span>{place.address}</span>
                </div>

                {place.opening_hours && (
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <span className="text-green-500">🕒</span>
                    <span>{place.opening_hours}</span>
                  </div>
                )}

                {place.phone && (
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <span className="text-blue-500">📞</span>
                    <span>{place.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
                    window.open(url, '_blank');
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  🧭 Directions
                </button>

                {place.phone && (
                  <button
                    onClick={() => window.open(`tel:${place.phone}`, '_self')}
                    className="bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    📞
                  </button>
                )}

                {place.website && (
                  <button
                    onClick={() => window.open(place.website, '_blank')}
                    className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    🌐
                  </button>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;
