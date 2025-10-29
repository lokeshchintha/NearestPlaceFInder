import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Navigation, 
  Route, 
  Clock, 
  Car, 
  PersonStanding, 
  Bike,
  ArrowLeft,
  ExternalLink,
  Compass,
  Target,
  Zap,
  Search
} from 'lucide-react';
import { getCurrentLocation, geocodeAddress } from '../services/placesService';

const DirectionsPage = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [sourceLocation, setSourceLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [travelMode, setTravelMode] = useState('driving');
  const [routeInfo, setRouteInfo] = useState(null);
  const [sourceInput, setSourceInput] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false); // Default to address input
  const [locationLoading, setLocationLoading] = useState(false);

  // Parse destination from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const placeParam = urlParams.get('place');
    
    if (placeParam) {
      try {
        const placeData = JSON.parse(decodeURIComponent(placeParam));
        setDestination(placeData);
      } catch (err) {
        setError('Invalid place data');
      }
    } else {
      setError('No destination specified');
    }
  }, []);

  // Calculate distance between two points
  const calculateDistance = React.useCallback((lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Calculate estimated duration based on travel mode
  const calculateDuration = React.useCallback((distance, mode) => {
    const speeds = {
      driving: 50, // km/h
      walking: 5,  // km/h
      cycling: 15  // km/h
    };
    
    const hours = distance / speeds[mode];
    const minutes = Math.round(hours * 60);
    
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hrs}h ${mins}m`;
    }
  }, []);

  // Enhance instruction with better left/right directions
  const enhanceInstruction = (instruction, maneuverType) => {
    if (!instruction) return 'Continue straight';
    
    // Map maneuver types to clear directions
    const maneuverMap = {
      'turn-left': 'Turn left',
      'turn-right': 'Turn right',
      'turn-sharp-left': 'Turn sharp left',
      'turn-sharp-right': 'Turn sharp right',
      'turn-slight-left': 'Turn slight left',
      'turn-slight-right': 'Turn slight right',
      'continue': 'Continue straight',
      'merge': 'Merge',
      'ramp-left': 'Take the ramp on the left',
      'ramp-right': 'Take the ramp on the right',
      'fork-left': 'Keep left at the fork',
      'fork-right': 'Keep right at the fork',
      'roundabout-enter': 'Enter the roundabout',
      'roundabout-exit': 'Exit the roundabout',
      'uturn': 'Make a U-turn',
      'depart': 'Start your journey',
      'arrive': 'You have arrived at your destination'
    };
    
    // If we have a specific maneuver type, use it
    if (maneuverType && maneuverMap[maneuverType]) {
      return maneuverMap[maneuverType];
    }
    
    // Enhance existing instructions with better left/right indicators
    let enhanced = instruction.toLowerCase();
    
    // Replace generic terms with specific directions
    enhanced = enhanced.replace(/turn/g, 'Turn');
    enhanced = enhanced.replace(/left/g, 'left');
    enhanced = enhanced.replace(/right/g, 'right');
    enhanced = enhanced.replace(/straight/g, 'straight');
    enhanced = enhanced.replace(/continue/g, 'Continue');
    
    // Add specific turn instructions based on keywords
    if (enhanced.includes('left') && !enhanced.includes('turn')) {
      enhanced = enhanced.replace('left', 'Turn left');
    }
    if (enhanced.includes('right') && !enhanced.includes('turn')) {
      enhanced = enhanced.replace('right', 'Turn right');
    }
    
    // Capitalize first letter
    return enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
  };

  // Get real route directions using OpenRouteService API
  const fetchRealRoute = React.useCallback(async (start, end, mode) => {
    try {
      // Try OpenRouteService first (free tier available)
      const profile = mode === 'driving' ? 'driving-car' : mode === 'cycling' ? 'cycling-regular' : 'foot-walking';
      
      const response = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}?api_key=5b3ce3597851110001cf6248YOUR_API_KEY&start=${start.lng},${start.lat}&end=${end.lng},${end.lat}&format=json&instructions=true`);
      
      if (!response.ok) {
        throw new Error('OpenRouteService failed');
      }
      
      const data = await response.json();
      
      if (data.features && data.features[0]) {
        const route = data.features[0];
        const instructions = route.properties.segments[0].steps;
        
        const steps = instructions.map((step, index) => ({
          instruction: enhanceInstruction(step.instruction, step.maneuver?.type),
          distance: `${(step.distance / 1000).toFixed(1)} km`,
          duration: `${Math.round(step.duration / 60)} min`,
          maneuver: step.maneuver?.type || 'continue'
        }));
        
        return {
          distance: (route.properties.segments[0].distance / 1000).toFixed(1),
          duration: Math.round(route.properties.segments[0].duration / 60),
          steps: steps,
          source: 'openrouteservice'
        };
      }
    } catch (error) {
      console.warn('OpenRouteService failed:', error.message);
    }
    
    // Fallback to OSRM (Open Source Routing Machine)
    try {
      const profile = mode === 'driving' ? 'car' : mode === 'cycling' ? 'bike' : 'foot';
      const response = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&annotations=true&overview=false`);
      
      if (!response.ok) {
        throw new Error('OSRM failed');
      }
      
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const legs = route.legs[0];
        
        const steps = legs.steps.map((step, index) => ({
          instruction: enhanceInstruction(step.maneuver.instruction || `${step.maneuver.type} for ${(step.distance / 1000).toFixed(1)} km`, step.maneuver.type),
          distance: `${(step.distance / 1000).toFixed(1)} km`,
          duration: `${Math.round(step.duration / 60)} min`,
          maneuver: step.maneuver.type
        }));
        
        return {
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.round(route.duration / 60),
          steps: steps,
          source: 'osrm'
        };
      }
    } catch (error) {
      console.warn('OSRM failed:', error.message);
    }
    
    // Final fallback to enhanced mock data
    return generateEnhancedMockRoute(start, end, mode);
  }, []);
  
  // Generate enhanced mock route steps with more realistic directions
  const generateEnhancedMockRoute = React.useCallback((start, end, mode) => {
    const totalDistance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
    const bearing = calculateBearing(start.lat, start.lng, end.lat, end.lng);
    
    // Generate more realistic step-by-step directions
    const steps = [];
    
    // Starting instruction
    steps.push({
      instruction: `Start ${mode === 'driving' ? 'driving' : mode === 'cycling' ? 'cycling' : 'walking'} from your location`,
      distance: "0 km",
      duration: "0 min",
      maneuver: 'depart'
    });
    
    // Direction-based instructions with specific turns
    const direction = getCardinalDirection(bearing);
    const initialTurn = bearing > 180 ? 'Turn left' : bearing < 180 && bearing > 0 ? 'Turn right' : 'Continue straight';
    steps.push({
      instruction: `${initialTurn} and head ${direction} towards ${end.name}`,
      distance: `${Math.min(0.5, totalDistance * 0.1).toFixed(1)} km`,
      duration: `${Math.round(Math.min(0.5, totalDistance * 0.1) / (mode === 'driving' ? 50 : mode === 'cycling' ? 15 : 5) * 60)} min`,
      maneuver: bearing > 180 ? 'turn-left' : bearing < 180 && bearing > 0 ? 'turn-right' : 'continue'
    });
    
    // Middle segments for longer routes with realistic turns
    if (totalDistance > 2) {
      const segments = Math.min(3, Math.floor(totalDistance / 2));
      const turns = ['Turn right', 'Continue straight', 'Turn left', 'Turn slight right', 'Turn slight left'];
      
      for (let i = 0; i < segments; i++) {
        const segmentDistance = totalDistance * 0.6 / segments;
        const randomTurn = turns[Math.floor(Math.random() * turns.length)];
        const roadType = mode === 'driving' ? ['Main Street', 'Highway', 'Boulevard', 'Avenue'][Math.floor(Math.random() * 4)] : 
                        mode === 'cycling' ? ['bike path', 'cycle lane', 'shared road'][Math.floor(Math.random() * 3)] : 
                        ['sidewalk', 'pedestrian path', 'walkway'][Math.floor(Math.random() * 3)];
        
        steps.push({
          instruction: `${randomTurn} onto ${roadType} and continue for ${segmentDistance.toFixed(1)} km`,
          distance: `${segmentDistance.toFixed(1)} km`,
          duration: `${Math.round(segmentDistance / (mode === 'driving' ? 50 : mode === 'cycling' ? 15 : 5) * 60)} min`,
          maneuver: randomTurn.includes('right') ? 'turn-right' : randomTurn.includes('left') ? 'turn-left' : 'continue'
        });
      }
    }
    
    // Final approach with specific turn
    const finalDistance = Math.max(0.1, totalDistance * 0.1);
    const finalTurn = Math.random() > 0.5 ? 'Turn right' : 'Turn left';
    steps.push({
      instruction: `${finalTurn} towards ${end.name}`,
      distance: `${finalDistance.toFixed(1)} km`,
      duration: `${Math.round(finalDistance / (mode === 'driving' ? 30 : mode === 'cycling' ? 10 : 4) * 60)} min`,
      maneuver: finalTurn.includes('right') ? 'turn-right' : 'turn-left'
    });
    
    // Arrival
    steps.push({
      instruction: `Arrive at ${end.name}`,
      distance: "0 km",
      duration: "0 min",
      maneuver: 'arrive'
    });
    
    return {
      distance: totalDistance.toFixed(1),
      duration: Math.round(totalDistance / (mode === 'driving' ? 50 : mode === 'cycling' ? 15 : 5) * 60),
      steps: steps,
      source: 'enhanced_mock'
    };
  }, [calculateDistance]);
  
  // Calculate bearing between two points
  const calculateBearing = React.useCallback((lat1, lng1, lat2, lng2) => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }, []);
  
  // Convert bearing to cardinal direction
  const getCardinalDirection = (bearing) => {
    const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  };

  // Calculate route information with real routing data
  const calculateRoute = React.useCallback(async (start, end) => {
    try {
      setLoading(true);
      console.log(`🗺️ Calculating ${travelMode} route from [${start.lat}, ${start.lng}] to [${end.lat}, ${end.lng}]`);
      
      const routeData = await fetchRealRoute(start, end, travelMode);
      
      console.log(`✅ Route calculated using ${routeData.source}: ${routeData.distance}km, ${routeData.duration}min, ${routeData.steps.length} steps`);
      setRouteInfo(routeData);
    } catch (error) {
      console.error('Route calculation failed:', error);
      // Fallback to basic calculation
      const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
      const routeData = {
        distance: distance.toFixed(1),
        duration: calculateDuration(distance, travelMode),
        steps: generateEnhancedMockRoute(start, end, travelMode).steps,
        source: 'fallback'
      };
      setRouteInfo(routeData);
    } finally {
      setLoading(false);
    }
  }, [travelMode, calculateDistance, calculateDuration, fetchRealRoute, generateEnhancedMockRoute]);

  // Handle source location selection
  const handleUseCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      setError(null);
      const location = await getCurrentLocation();
      setUserLocation(location);
      setSourceLocation(location);
      setUseCurrentLocation(true);
      setSourceInput('');
      
      if (destination) {
        await calculateRoute(location, destination);
      }
    } catch (err) {
      // Show error only when user explicitly tries to use current location
      setError('Unable to access your current location: ' + err.message + '. Please enter an address manually.');
      setUseCurrentLocation(false); // Switch to address input mode
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSourceAddressSearch = async () => {
    if (!sourceInput.trim()) return;
    
    try {
      setLocationLoading(true);
      setError(null);
      const location = await geocodeAddress(sourceInput);
      setSourceLocation(location);
      setUseCurrentLocation(false);
      
      if (destination) {
        await calculateRoute(location, destination);
      }
      // Clear any previous errors on successful search
      setError(null);
    } catch (err) {
      setError('Unable to find the specified address: ' + err.message);
    } finally {
      setLocationLoading(false);
    }
  };

  // Get user's current location on component mount
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        setLoading(true);
        const location = await getCurrentLocation();
        setUserLocation(location);
        setSourceLocation(location); // Set as default source
        setUseCurrentLocation(true);
        
        if (destination) {
          await calculateRoute(location, destination);
        }
      } catch (err) {
        // Silently fail and default to address input mode on initial load
        console.log('Location access denied or unavailable, defaulting to address input');
        setUseCurrentLocation(false); // Default to address input mode
        // Don't set error on initial load to avoid overwhelming users
      } finally {
        setLoading(false);
      }
    };

    if (destination) {
      getUserLocation();
    }
  }, [destination, calculateRoute]);

  // Open in external maps app
  const openInMaps = (service) => {
    if (!sourceLocation || !destination) return;
    
    let url = '';
    
    switch (service) {
      case 'google':
        url = `https://www.google.com/maps/dir/${sourceLocation.lat},${sourceLocation.lng}/${destination.lat},${destination.lng}`;
        break;
      case 'apple':
        url = `http://maps.apple.com/?saddr=${sourceLocation.lat},${sourceLocation.lng}&daddr=${destination.lat},${destination.lng}`;
        break;
      case 'waze':
        url = `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`;
        break;
      default:
        return;
    }
    
    window.open(url, '_blank');
  };

  const travelModes = [
    { id: 'driving', icon: Car, label: 'Driving', color: 'blue' },
    { id: 'walking', icon: PersonStanding, label: 'Walking', color: 'green' },
    { id: 'cycling', icon: Bike, label: 'Cycling', color: 'purple' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mb-4"
          >
            <Compass className="w-12 h-12 text-blue-400 mx-auto" />
          </motion.div>
          <p className="text-white text-lg">Getting your location...</p>
        </motion.div>
      </div>
    );
  }

  // Handle retry location permission
  const handleRetryLocation = async () => {
    setError(null);
    setLocationLoading(true);
    await handleUseCurrentLocation();
    setLocationLoading(false);
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-effect p-6 m-4 rounded-3xl"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <motion.button
              onClick={() => window.history.back()}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="text-white hover:text-blue-400 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </motion.button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Navigation
            </h1>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Navigation className="w-8 h-8 text-blue-400" />
            </motion.div>
          </div>
          
          {destination && (
            <div className="flex items-center gap-3 text-gray-300">
              <Target className="w-5 h-5 text-green-400" />
              <span>Navigating to: <strong className="text-white">{destination.name}</strong></span>
            </div>
          )}
        </div>
      </motion.header>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Source Location Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="floating-card"
        >
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
            <MapPin className="w-6 h-6 text-blue-400" />
            Starting Location
          </h2>
          
          <div className="space-y-4">
            {/* Location Type Toggle */}
            <div className="flex items-center gap-4 mb-4">
              <motion.button
                onClick={() => {
                  setUseCurrentLocation(true);
                  handleUseCurrentLocation();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  useCurrentLocation
                    ? 'bg-blue-500/30 border border-blue-500/50 text-blue-300'
                    : 'bg-gray-700/50 border border-gray-600/50 text-gray-400 hover:text-white hover:bg-gray-600/50'
                }`}
              >
                <Compass className="w-4 h-4" />
                Use Current Location
              </motion.button>
              
              <motion.button
                onClick={() => {
                  setUseCurrentLocation(false);
                  setError(null); // Clear any location-related errors
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  !useCurrentLocation
                    ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300'
                    : 'bg-gray-700/50 border border-gray-600/50 text-gray-400 hover:text-white hover:bg-gray-600/50'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Enter Address
              </motion.button>
            </div>

            {/* Address Input (shown when not using current location) */}
            {!useCurrentLocation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Enter starting address..."
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSourceAddressSearch()}
                  className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400/50 transition-all"
                />
                <motion.button
                  onClick={handleSourceAddressSearch}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!sourceInput.trim() || locationLoading}
                  className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {locationLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Search
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* Current Source Location Display */}
            {sourceLocation ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full pulse-ring"></div>
                  <span className="text-green-300 text-sm font-medium">
                    {useCurrentLocation ? 'Current Location' : 'Selected Location'}
                  </span>
                </div>
                <p className="text-white/90 text-sm">
                  📍 {sourceLocation.display_name || `${sourceLocation.lat.toFixed(4)}, ${sourceLocation.lng.toFixed(4)}`}
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full pulse-ring"></div>
                  <span className="text-yellow-300 text-sm font-medium">No Starting Location Selected</span>
                </div>
                <p className="text-white/90 text-sm">
                  Please select your starting location to get directions
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="floating-card"
          >
            <div className="text-center py-8">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-white mb-4">Location Access Issue</h3>
              <p className="text-gray-300 mb-6 max-w-md mx-auto">{error}</p>
              
              <div className="flex items-center justify-center gap-4">
                <motion.button
                  onClick={handleRetryLocation}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={locationLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {locationLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Trying...
                    </>
                  ) : (
                    <>
                      <Compass className="w-4 h-4" />
                      Try Again
                    </>
                  )}
                </motion.button>
                
                <motion.button
                  onClick={() => {
                    setError(null);
                    setUseCurrentLocation(false);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-600/50 hover:bg-gray-500/50 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Use Address Instead
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Route Summary or Prompt */}
        {!sourceLocation && !error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="floating-card text-center"
          >
            <div className="py-12">
              <div className="text-6xl mb-4">🗺️</div>
              <h2 className="text-2xl font-bold text-white mb-4">Ready to Navigate</h2>
              <p className="text-gray-300 mb-6">
                Select your starting location above to get turn-by-turn directions to <strong className="text-white">{destination?.name}</strong>
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-400" />
                  <span>Use GPS Location</span>
                </div>
                <span>or</span>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span>Enter Address</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : routeInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="floating-card"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Route className="w-6 h-6 text-blue-400" />
                Route Summary
              </h2>
              <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full">
                <Zap className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-sm font-medium">Optimal Route</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
                <MapPin className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-blue-300 font-medium">Distance</p>
                <p className="text-white text-2xl font-bold">{routeInfo.distance} km</p>
              </div>
              
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 text-center">
                <Clock className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-purple-300 font-medium">Duration</p>
                <p className="text-white text-2xl font-bold">{routeInfo.duration}</p>
              </div>
              
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
                {React.createElement(travelModes.find(mode => mode.id === travelMode)?.icon || Car, {
                  className: "w-8 h-8 text-green-400 mx-auto mb-2"
                })}
                <p className="text-green-300 font-medium">Mode</p>
                <p className="text-white text-lg font-bold capitalize">{travelMode}</p>
              </div>
            </div>

            {/* Travel Mode Selector */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Travel Mode</h3>
              <div className="flex gap-2">
                {travelModes.map((mode) => (
                  <motion.button
                    key={mode.id}
                    onClick={async () => {
                      setTravelMode(mode.id);
                      if (userLocation && destination) {
                        await calculateRoute(userLocation, destination);
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-300 ${
                      travelMode === mode.id
                        ? mode.color === 'blue' 
                          ? 'bg-blue-500/30 border border-blue-500/50 text-blue-300'
                          : mode.color === 'green'
                          ? 'bg-green-500/30 border border-green-500/50 text-green-300'
                          : 'bg-purple-500/30 border border-purple-500/50 text-purple-300'
                        : 'bg-gray-700/50 border border-gray-600/50 text-gray-400 hover:text-white hover:bg-gray-600/50'
                    }`}
                  >
                    <mode.icon className="w-5 h-5" />
                    <span className="font-medium">{mode.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* External Maps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <motion.button
                onClick={() => openInMaps('google')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Google Maps
              </motion.button>
              
              <motion.button
                onClick={() => openInMaps('apple')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/30 text-gray-300 py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Apple Maps
              </motion.button>
              
              <motion.button
                onClick={() => openInMaps('waze')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Waze
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Location Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* From */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="floating-card"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <div className="w-3 h-3 bg-green-400 rounded-full pulse-ring"></div>
              From ({useCurrentLocation ? 'Current Location' : 'Selected Location'})
            </h3>
            {sourceLocation && (
              <div className="space-y-2 text-gray-300">
                {sourceLocation.display_name && (
                  <p className="font-semibold text-white mb-2">{sourceLocation.display_name}</p>
                )}
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-400" />
                  <span>Lat: {sourceLocation.lat.toFixed(6)}</span>
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-400" />
                  <span>Lng: {sourceLocation.lng.toFixed(6)}</span>
                </p>
                {useCurrentLocation && sourceLocation.accuracy && (
                  <p className="text-sm text-gray-400">
                    Accuracy: ±{sourceLocation.accuracy.toFixed(0)} meters
                  </p>
                )}
              </div>
            )}
          </motion.div>

          {/* To */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="floating-card"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <div className="w-3 h-3 bg-red-400 rounded-full pulse-ring"></div>
              To (Destination)
            </h3>
            {destination && (
              <div className="space-y-2 text-gray-300">
                <p className="font-semibold text-white">{destination.name}</p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span>{destination.address}</span>
                </p>
                <p className="text-sm text-gray-400">
                  Distance from search center: {destination.distance} km
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Route Steps */}
        {routeInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="floating-card"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Navigation className="w-5 h-5 text-blue-400" />
                Route Steps
              </h3>
              {routeInfo.source && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">Powered by:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    routeInfo.source === 'osrm' ? 'bg-green-500/20 text-green-300' :
                    routeInfo.source === 'openrouteservice' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {routeInfo.source === 'osrm' ? 'OSRM' :
                     routeInfo.source === 'openrouteservice' ? 'OpenRouteService' :
                     routeInfo.source === 'enhanced_mock' ? 'Enhanced Routing' :
                     'Basic Routing'}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {routeInfo.steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
                >
                  <div className="w-8 h-8 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center text-blue-300 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{step.instruction}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">{step.distance}</span>
                      {step.duration && step.duration !== "0 min" && (
                        <span className="text-blue-300">• {step.duration}</span>
                      )}
                      {step.maneuver && (
                        <span className="text-purple-300 text-xs bg-purple-500/20 px-2 py-1 rounded-full">
                          {step.maneuver}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DirectionsPage;
