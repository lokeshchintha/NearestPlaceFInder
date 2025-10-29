import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Search, 
  Loader2, 
  Filter,
  Star,
  Sparkles,
  Zap,
  ChevronDown,
  Grid3X3,
  List,
  RefreshCw,
  Crosshair
} from 'lucide-react';
import MapComponent from './MapComponent.jsx';
import CategorySection from './CategorySection.jsx';
import LocationInput from './LocationInput.jsx';
import PlaceCard from './PlaceCard.jsx';
import { 
  getCurrentLocation, 
  geocodeAddress, 
  fetchNearbyPlaces, 
  checkLocationSupport,
  PLACE_CATEGORIES 
} from '../services/placesService';

function PlacesFinder() {
  const [location, setLocation] = useState(null);
  const [radius, setRadius] = useState(10);
  const [places, setPlaces] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('distance');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('categories'); // 'categories' or 'list'
  const [animationKey, setAnimationKey] = useState(0);
  const [locationSupport, setLocationSupport] = useState(null);

  // Handle location detection
  const handleGetCurrentLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPlaces({}); // Clear existing places immediately
    
    try {
      console.log('Getting current location...');
      const currentLocation = await getCurrentLocation();
      console.log('Current location:', currentLocation);
      
      // Add display name for better UX
      const locationWithDisplay = {
        ...currentLocation,
        display_name: currentLocation.method === 'high_accuracy_gps' ? 
          'GPS Location (High Accuracy)' : 
          currentLocation.method === 'moderate_accuracy' ? 
          'GPS Location (Network Assisted)' : 
          currentLocation.method === 'gps_poor_accuracy' ? 
          'GPS Location (Poor Signal)' :
          currentLocation.method === 'gps_final_attempt' ? 
          'GPS Location (Final Attempt)' :
          currentLocation.method === 'ip_location' ?
          (currentLocation.city ? `Approximate Location: ${currentLocation.city}` : 'Approximate Location (IP-based)') :
          currentLocation.accuracy && currentLocation.accuracy <= 100 ? 
          'GPS Location (Excellent)' : 
          currentLocation.accuracy && currentLocation.accuracy <= 1000 ? 
          'GPS Location (Good)' : 
          'GPS Location (Cell Tower Assisted)'
      };
      
      setLocation(locationWithDisplay);
      
      // For low-accuracy or IP-based location, don't auto-search. Let user refine or confirm.
      const isAccurateEnough = (typeof currentLocation.accuracy === 'number' && currentLocation.accuracy <= 1000) && currentLocation.method !== 'ip_location';
      if (!isAccurateEnough) {
        console.log('ℹ️ Location accuracy is low or IP-based. Not auto-searching. Ask user to refine or enter address.');
      } else {
        console.log('🔍 Searching for nearby places with verified addresses...');
        await searchNearbyPlaces(currentLocation.lat, currentLocation.lng, radius);
      }
    } catch (err) {
      console.error('Current location error:', err);
      setError(err.message);
      
      // Provide helpful suggestions in the error state
      if (err.message.includes('denied')) {
        console.log('💡 Tip: You can manually enter your address instead');
      }
    } finally {
      setLoading(false);
    }
  }, [radius]);

  // Handle address search
  const handleAddressSearch = async (input) => {
    const isObject = input && typeof input === 'object';
    const addressText = isObject ? (input.display_name || input.short_name || '') : (input || '');
    if (!isObject && !addressText.trim()) return;

    setLoading(true);
    setError(null);
    setPlaces({});

    try {
      let targetLat, targetLng, targetDisplayName;
      if (isObject && typeof input.lat === 'number' && typeof input.lng === 'number') {
        // Use exact coordinates from suggestion click
        targetLat = input.lat;
        targetLng = input.lng;
        targetDisplayName = addressText;
        setLocation({ lat: targetLat, lng: targetLng, display_name: targetDisplayName, method: 'manual_selection' });
      } else {
        console.log('Searching for address:', addressText);
        const geocodedLocation = await geocodeAddress(addressText);
        console.log('Geocoded location:', geocodedLocation);
        targetLat = geocodedLocation.lat;
        targetLng = geocodedLocation.lng;
        targetDisplayName = geocodedLocation.display_name || addressText;
        setLocation({ ...geocodedLocation, display_name: targetDisplayName, method: 'geocoded' });
      }

      await searchNearbyPlaces(targetLat, targetLng, radius);
    } catch (err) {
      console.error('Address search error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Search for nearby places
  const searchNearbyPlaces = async (lat, lng, searchRadius) => {
    try {
      // Only set loading if not already loading (to avoid conflicts with parent functions)
      const wasLoading = loading;
      if (!wasLoading) {
        setLoading(true);
      }
      
      setAnimationKey(prev => prev + 1); // Trigger re-animation
      console.log(`Searching places for: ${lat}, ${lng}, radius: ${searchRadius}km`);
      
      // Clear existing places first
      setPlaces({});
      
      // Try to fetch real data first
      console.log('🔍 Starting place search...');
      const nearbyPlaces = await fetchNearbyPlaces(lat, lng, searchRadius);
      
      // Check if we got meaningful results
      const totalPlaces = Object.values(nearbyPlaces).reduce((sum, categoryPlaces) => sum + categoryPlaces.length, 0);
      const categoriesWithPlaces = Object.entries(nearbyPlaces).filter(([key, places]) => places.length > 0);
      
      console.log(`📊 Search results: ${totalPlaces} total places in ${categoriesWithPlaces.length} categories`);
      categoriesWithPlaces.forEach(([category, places]) => {
        console.log(`  - ${category}: ${places.length} places`);
      });
      // Always set the result from service (it already merges real + verified mock)
      console.log('✅ Setting places state from service result');
      setPlaces(nearbyPlaces);
      console.log('✅ Places state updated successfully');
    } catch (err) {
      console.error('Error fetching places:', err);
      // Graceful fallback: clear places and let UI show friendly message
      setPlaces({});
    }
    // Note: Don't set loading to false here as parent functions handle it
  };

  // Handle radius change
  const handleRadiusChange = async (newRadius) => {
    setRadius(newRadius);
    if (location) {
      setLoading(true);
      try {
        await searchNearbyPlaces(location.lat, location.lng, newRadius);
      } catch (err) {
        console.error('Error updating radius:', err);
        setError('Failed to update search radius');
      } finally {
        setLoading(false);
      }
    }
  };

  // Get filtered and sorted places for list view
  const getFilteredPlaces = () => {
    let allPlaces = [];
    
    if (selectedCategory === 'all') {
      allPlaces = Object.values(places).flat();
    } else {
      allPlaces = places[selectedCategory] || [];
    }

    // Filter by search query
    if (searchQuery) {
      allPlaces = allPlaces.filter(place => 
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort places
    allPlaces.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return a.distance - b.distance;
      }
    });

    return allPlaces;
  };

  // Get filtered and sorted places for a specific category
  const getFilteredCategoryPlaces = (categoryKey, categoryPlaces) => {
    console.log(`🔍 Filtering ${categoryKey}: ${categoryPlaces.length} places`);
    let filteredPlaces = [...categoryPlaces];

    // Filter by search query
    if (searchQuery) {
      const beforeSearch = filteredPlaces.length;
      filteredPlaces = filteredPlaces.filter(place => 
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log(`  📝 Search filter "${searchQuery}": ${beforeSearch} -> ${filteredPlaces.length} places`);
    }

    // Filter by selected category (if not 'all')
    if (selectedCategory !== 'all' && selectedCategory !== categoryKey) {
      console.log(`  🚫 Category filter: ${categoryKey} filtered out (selected: ${selectedCategory})`);
      return []; // Don't show this category if it's not selected
    }

    // Sort places within the category
    filteredPlaces.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return a.distance - b.distance;
      }
    });

    console.log(`  ✅ Final ${categoryKey}: ${filteredPlaces.length} places after filtering and sorting`);
    return filteredPlaces;
  };

  // Get total count of places (unfiltered)
  const getTotalPlacesCount = () => {
    return Object.values(places).reduce((total, categoryPlaces) => total + categoryPlaces.length, 0);
  };

  // Get total count of filtered places
  const getFilteredPlacesCount = () => {
    if (viewMode === 'categories') {
      return Object.entries(PLACE_CATEGORIES).reduce((total, [categoryKey, categoryData]) => {
        const categoryPlaces = places[categoryKey] || [];
        const filteredCategoryPlaces = getFilteredCategoryPlaces(categoryKey, categoryPlaces);
        return total + filteredCategoryPlaces.length;
      }, 0);
    } else {
      return getFilteredPlaces().length;
    }
  };

  useEffect(() => {
    // Check location support on component mount
    const support = checkLocationSupport();
    setLocationSupport(support);
    console.log('Location support status:', support);
    
    // Auto-detect location on component mount if supported
    if (support.supported) {
      handleGetCurrentLocation();
    } else {
      console.warn('Location detection not available:', support.issues.join(', '));
      setError(`Location detection unavailable: ${support.issues.join(', ')}. Please enter your address manually.`);
    }
  }, [handleGetCurrentLocation]);

  // Debug: Monitor places state changes
  useEffect(() => {
    const totalPlaces = Object.values(places).reduce((sum, categoryPlaces) => sum + categoryPlaces.length, 0);
    console.log(`🔄 Places state changed: ${totalPlaces} total places across ${Object.keys(places).length} categories`);
    
    if (totalPlaces > 0) {
      console.log('📊 Current places state:', places);
      // Log first place from each category for debugging
      Object.entries(places).forEach(([category, categoryPlaces]) => {
        if (categoryPlaces.length > 0) {
          const firstPlace = categoryPlaces[0];
          console.log(`  📍 ${category}: ${categoryPlaces.length} places (first: "${firstPlace.name}" at ${firstPlace.distance}km)`);
        }
      });
    }
  }, [places]);

  return (
    <div className="min-h-screen gradient-bg">
      {/* Animated Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
        className="glass-effect p-6 m-4 rounded-3xl relative overflow-hidden"
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <motion.div 
          className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        ></motion.div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="text-5xl"
              >
                🌍
              </motion.div>
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Nearby Places Finder
              </h1>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-3xl"
              >
                ✨
              </motion.div>
            </div>
            <p className="text-gray-300 text-lg md:text-xl">
              Discover amazing places around you with AI-powered search
            </p>
            <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-400">
              <Sparkles className="w-4 h-4" />
              <span>Real-time • Interactive • Beautiful</span>
              <Zap className="w-4 h-4" />
            </div>
          </motion.div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Top Section - Location Input and Map */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Location Input Column */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="floating-card"
            >
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <MapPin className="w-6 h-6 text-blue-400" />
                </motion.div>
                Set Location
              </h2>
              
              <LocationInput 
                onAddressSearch={handleAddressSearch}
                onCurrentLocation={handleGetCurrentLocation}
                loading={loading}
                locationSupport={locationSupport}
                currentLocation={location}
              />

              {location && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full pulse-ring ${
                        location.accuracy && location.accuracy <= 100 ? 'bg-green-400' :
                        location.accuracy && location.accuracy <= 1000 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}></div>
                      <span className={`text-sm font-medium ${
                        location.accuracy && location.accuracy <= 100 ? 'text-green-300' :
                        location.accuracy && location.accuracy <= 1000 ? 'text-yellow-300' : 'text-red-300'
                      }`}>
                        {location.accuracy && location.accuracy <= 100 ? 'GPS Location Set' :
                         location.accuracy && location.accuracy <= 1000 ? 'GPS Location (Moderate)' : 'GPS Location (Poor Signal)'}
                      </span>
                    </div>
                    <motion.button
                      onClick={handleGetCurrentLocation}
                      disabled={loading}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="text-blue-400 hover:text-blue-300 p-1 rounded-md hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                      title="Refresh location"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </motion.button>
                  </div>
                  <p className="text-white/90 text-sm mb-2">
                    📍 {location.display_name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                  </p>
                  {location.accuracy && (
                    <div className="flex items-center gap-2">
                      <Crosshair className="w-3 h-3 text-gray-400" />
                      <span className={`text-xs ${
                        location.accuracy <= 100 ? 'text-green-400' : 
                        location.accuracy <= 1000 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        GPS Accuracy: ±{Math.round(location.accuracy)}m {
                          location.accuracy <= 100 ? '(Excellent)' : 
                          location.accuracy <= 1000 ? '(Good)' : '(Poor - Move to open area for better signal)'
                        }
                      </span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Radius Selector */}
              <div className="mt-6">
                <label className="block text-white text-lg font-semibold mb-3">
                  Search Radius: <span className="text-blue-400">{radius} km</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={radius}
                  onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-700/50 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>1 km</span>
                  <span>25 km</span>
                  <span>50 km</span>
                </div>
              </div>

              {/* Force Refresh Button */}
              {location && (
                <div className="mt-4">
                  <motion.button
                    onClick={() => searchNearbyPlaces(location.lat, location.lng, radius)}
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-green-500/20 to-blue-500/20 hover:from-green-500/30 hover:to-blue-500/30 text-green-300 border border-green-500/30 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Refresh Places
                  </motion.button>
                </div>
              )}

              {/* GPS Tips */}
              {location && location.accuracy && location.accuracy > 1000 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 bg-yellow-500/20 border border-yellow-500/50 p-4 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-yellow-400 text-lg">📡</div>
                    <div className="flex-1">
                      <p className="text-yellow-200 text-sm font-medium mb-2">Poor GPS Signal Detected</p>
                      <p className="text-yellow-300 text-xs mb-2">
                        Your GPS accuracy is {Math.round(location.accuracy)}m. To improve:
                      </p>
                      <ul className="text-yellow-300 text-xs space-y-1">
                        <li>• Move to an open area away from buildings</li>
                        <li>• Enable "High accuracy" in device location settings</li>
                        <li>• Allow location access in browser settings</li>
                        <li>• Wait a moment for GPS to get better signal</li>
                        <li>• Or enter your address manually for precise results</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error Display */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 bg-red-500/20 border border-red-500/50 p-4 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-red-400 text-lg">⚠️</div>
                    <div>
                      <p className="text-red-200 text-sm font-medium mb-1">Location Detection Failed</p>
                      <p className="text-red-300 text-xs">{error}</p>
                      {error.includes('denied') && (
                        <div className="mt-2 p-2 bg-red-500/10 rounded-lg">
                          <p className="text-red-200 text-xs">
                            💡 <strong>Quick Fix:</strong> Click the location icon in your browser's address bar and allow location access, then try again.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Map Column */}
          <div className="lg:col-span-3">
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="floating-card h-[500px] lg:h-[600px] relative overflow-hidden">
                {/* Map Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    >
                      🗺️
                    </motion.div>
                    Interactive Map
                  </h2>
                  {location && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30"
                    >
                      <div className="w-2 h-2 bg-green-400 rounded-full pulse-ring"></div>
                      <span className="text-green-300 text-sm font-medium">Live Location</span>
                    </motion.div>
                  )}
                </div>

                {/* Map Container */}
                <div className="h-full rounded-2xl overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/20 via-transparent to-transparent z-10 pointer-events-none"></div>
                  
                  <MapComponent 
                    location={location}
                    places={viewMode === 'categories' ? Object.values(places).flat() : getFilteredPlaces()}
                    radius={radius}
                  />

                  {/* Map Stats Overlay */}
                  {location && Object.keys(places).length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="absolute bottom-4 left-4 right-4 z-20"
                    >
                      <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-blue-300">
                              <MapPin className="w-4 h-4" />
                              <span>{radius} km radius</span>
                            </div>
                            <div className="flex items-center gap-1 text-green-300">
                              <Star className="w-4 h-4" />
                              <span>{getFilteredPlacesCount()} places</span>
                            </div>
                          </div>
                          <div className="text-gray-400 text-xs">
                            Click markers for details
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Section - Filters and Places */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Column */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="floating-card"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Filter className="w-6 h-6 text-blue-400" />
                  </motion.div>
                  Smart Filters
                </h2>
                <motion.button
                  onClick={() => setShowFilters(!showFilters)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
                >
                  <motion.div
                    animate={{ rotate: showFilters ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </motion.button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 mb-4 p-1 bg-gray-800/50 rounded-xl">
                <motion.button
                  onClick={() => setViewMode('categories')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all duration-300 ${
                    viewMode === 'categories' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                  Categories
                </motion.button>
                <motion.button
                  onClick={() => setViewMode('list')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all duration-300 ${
                    viewMode === 'list' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  List
                </motion.button>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search places..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400/50 transition-all"
                />
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Category Filter */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Category</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="all">All Categories</option>
                        {Object.entries(PLACE_CATEGORIES).map(([key, category]) => (
                          <option key={key} value={key}>
                            {category.icon} {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="distance">Distance</option>
                        <option value="rating">Rating</option>
                        <option value="name">Name</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results Summary */}
              {Object.keys(places).length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl"
                >
                  <p className="text-blue-300 text-sm font-medium">
                    Showing {getFilteredPlacesCount()} of {getTotalPlacesCount()} places in {radius} km radius
                  </p>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Places Results Column */}
          <div className="lg:col-span-3">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="floating-card"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Star className="w-6 h-6 text-yellow-400" />
                  </motion.div>
                  {viewMode === 'categories' ? 'Place Categories' : 'All Places'}
                </h2>
                {Object.keys(places).length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-4 py-2 rounded-full border border-blue-500/30"
                  >
                    <p className="text-blue-300 text-sm font-medium">
                      {getFilteredPlacesCount()} places shown
                    </p>
                  </motion.div>
                )}
              </div>

              {loading ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mb-4"
                  >
                    <Loader2 className="w-12 h-12 text-blue-400" />
                  </motion.div>
                  <motion.p 
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-white text-lg"
                  >
                    Discovering amazing places...
                  </motion.p>
                  <p className="text-gray-400 text-sm mt-2">This might take a moment</p>
                </motion.div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                  {viewMode === 'categories' ? (
                    // Category View
                    <div key={animationKey}>
                      {(() => {
                        console.log('🎨 Rendering categories view...');
                        console.log('📊 Current places state in render:', places);
                        const totalPlacesInState = Object.values(places).reduce((sum, categoryPlaces) => sum + categoryPlaces.length, 0);
                        console.log(`📊 Total places in state: ${totalPlacesInState}`);
                        
                        return Object.entries(PLACE_CATEGORIES).map(([categoryKey, categoryData], index) => {
                          const categoryPlaces = places[categoryKey] || [];
                          console.log(`🏷️ Processing category ${categoryKey}: ${categoryPlaces.length} places`);
                          const filteredCategoryPlaces = getFilteredCategoryPlaces(categoryKey, categoryPlaces);
                          
                          if (filteredCategoryPlaces.length === 0) {
                            console.log(`❌ Skipping ${categoryKey}: no places after filtering`);
                            return null;
                          }
                          
                          console.log(`✅ Rendering ${categoryKey} with ${filteredCategoryPlaces.length} places`);
                          return (
                            <CategorySection
                              key={categoryKey}
                              category={categoryKey}
                              places={filteredCategoryPlaces}
                              categoryData={categoryData}
                              index={index}
                              sortBy={sortBy}
                            />
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    // List View
                    <div className="space-y-3">
                      <AnimatePresence>
                        {getFilteredPlaces().map((place, index) => (
                          <motion.div
                            key={place.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <PlaceCard place={place} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                  
                  {Object.keys(places).length > 0 && getTotalPlacesCount() === 0 && !loading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-12"
                    >
                      <div className="text-6xl mb-4">🔍</div>
                      <p className="text-gray-300 text-lg mb-2">No places found</p>
                      <p className="text-gray-500 text-sm">
                        Try adjusting your search radius or location
                      </p>
                    </motion.div>
                  )}

                  {Object.keys(places).length === 0 && !loading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-12"
                    >
                      <div className="text-6xl mb-4">📍</div>
                      <p className="text-gray-300 text-lg mb-2">Ready to explore</p>
                      <p className="text-gray-500 text-sm">
                        Set your location to discover nearby places
                      </p>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
        className="fixed bottom-6 right-6 z-50 lg:hidden"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleGetCurrentLocation}
          disabled={loading}
          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-full shadow-2xl neon-glow"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <MapPin className="w-6 h-6" />
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}

export default PlacesFinder;
