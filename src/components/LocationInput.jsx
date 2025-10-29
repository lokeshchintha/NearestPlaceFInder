import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Navigation, Loader2, MapPin, Clock } from 'lucide-react';
import { getPlaceSuggestions } from '../services/placesService';

const LocationInput = ({ onAddressSearch, onCurrentLocation, loading, locationSupport, currentLocation }) => {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Debounced search for suggestions using our enhanced service
  useEffect(() => {
    const searchSuggestions = async () => {
      if (address.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      try {
        const near = currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng, radiusKm: 25 } : null;
        const results = await getPlaceSuggestions(address, 15, near); // Increased limit and biased to current location if available
        
        const formattedSuggestions = results.map(item => {
          return {
            id: item.id,
            display_name: item.name,
            short_name: item.shortName || item.name.split(',')[0].trim(),
            context: item.context || item.name.split(',').slice(1, 3).join(', ').trim(),
            lat: item.lat,
            lng: item.lng,
            type: item.type,
            class: item.class || 'place',
            importance: item.importance || 0,
            address: item.address,
            osm_type: item.osm_type
          };
        });

        console.log(`📍 Showing ${formattedSuggestions.length} suggestions for "${address}"`);
        setSuggestions(formattedSuggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchSuggestions, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [address, currentLocation]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (address.trim()) {
      handleSearch(address);
    }
  };

  const handleSearch = (searchAddress) => {
    console.log('LocationInput: Triggering search for:', searchAddress);
    
    // Save to recent searches
    const newRecentSearches = [
      searchAddress,
      ...recentSearches.filter(item => item !== searchAddress)
    ].slice(0, 5);
    
    setRecentSearches(newRecentSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
    
    // Clear the input and suggestions
    setShowSuggestions(false);
    
    // Trigger the parent search function
    onAddressSearch(searchAddress);
  };

  const handleSuggestionClick = (suggestion) => {
    setAddress(suggestion.display_name);
    // Save to recent searches
    const savedLabel = suggestion.display_name || suggestion.short_name;
    const newRecentSearches = [
      savedLabel,
      ...recentSearches.filter(item => item !== savedLabel)
    ].slice(0, 5);
    setRecentSearches(newRecentSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));

    // Pass exact coordinates upstream to avoid re-geocoding ambiguities
    setShowSuggestions(false);
    onAddressSearch({
      lat: suggestion.lat,
      lng: suggestion.lng,
      display_name: suggestion.display_name,
      short_name: suggestion.short_name,
      address: suggestion.address
    });
  };

  const handleInputChange = (e) => {
    setAddress(e.target.value);
    if (e.target.value.length >= 3) {
      setShowSuggestions(true);
    }
  };

  const handleInputFocus = () => {
    if (address.length >= 3 || recentSearches.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Address Input */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4 z-10" />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4 animate-spin z-10" />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter address or place name..."
            value={address}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400/50 transition-all"
            disabled={loading}
            autoComplete="off"
          />

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
              <motion.div
                ref={suggestionsRef}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-xl border border-gray-600/50 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto custom-scrollbar"
              >
                {/* Recent Searches */}
                {recentSearches.length > 0 && address.length < 3 && (
                  <div className="p-3 border-b border-gray-600/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-300">Recent Searches</span>
                    </div>
                    {recentSearches.map((recent, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          setAddress(recent);
                          handleSearch(recent);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <MapPin className="w-3 h-3 text-gray-500" />
                        <span className="truncate">{recent}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Live Suggestions */}
                {suggestions.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-gray-300">Suggestions</span>
                    </div>
                    {suggestions.map((suggestion, index) => (
                      <motion.button
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-3 py-3 hover:bg-gray-700/50 rounded-lg transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {suggestion.class === 'amenity' ? '🏢' :
                             suggestion.class === 'place' ? '📍' :
                             suggestion.class === 'highway' ? '🛣️' :
                             suggestion.class === 'tourism' ? '🏛️' :
                             suggestion.class === 'shop' ? '🏪' :
                             suggestion.class === 'building' ? '🏗️' :
                             suggestion.class === 'leisure' ? '🎯' :
                             suggestion.class === 'natural' ? '🌳' :
                             suggestion.osm_type === 'node' ? '📌' :
                             suggestion.osm_type === 'way' ? '🛤️' :
                             suggestion.osm_type === 'relation' ? '🗺️' :
                             <MapPin className="w-4 h-4 text-blue-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium group-hover:text-blue-300 transition-colors truncate">
                              {suggestion.short_name}
                            </div>
                            {suggestion.context && (
                              <div className="text-blue-300 text-xs mt-0.5 truncate">
                                {suggestion.context}
                              </div>
                            )}
                            <div className="text-gray-400 text-xs mt-1 truncate">
                              {suggestion.type} • {suggestion.class}
                              {suggestion.address?.state && ` • ${suggestion.address.state}`}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* No suggestions found */}
                {suggestions.length === 0 && recentSearches.length === 0 && address.length >= 3 && !isSearching && (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    No locations found for "{address}"
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <motion.button
          type="submit"
          disabled={loading || !address.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Search Location
        </motion.button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-white/20"></div>
        <span className="text-white/60 text-sm">or</span>
        <div className="flex-1 h-px bg-white/20"></div>
      </div>

      {/* Location Support Status */}
      {locationSupport && !locationSupport.supported && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-xl"
        >
          <div className="flex items-start gap-2">
            <div className="text-yellow-400 text-sm">⚠️</div>
            <div>
              <p className="text-yellow-200 text-xs font-medium">Location Detection Unavailable</p>
              <p className="text-yellow-300 text-xs mt-1">
                {locationSupport.issues.join(', ')}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Current Location Button */}
      <motion.button
        onClick={onCurrentLocation}
        disabled={loading || (locationSupport && !locationSupport.supported)}
        whileHover={{ scale: locationSupport?.supported ? 1.02 : 1 }}
        whileTap={{ scale: locationSupport?.supported ? 0.98 : 1 }}
        className={`w-full flex items-center justify-center gap-2 relative group transition-all duration-200 ${
          locationSupport?.supported 
            ? 'btn-secondary disabled:opacity-50 disabled:cursor-not-allowed' 
            : 'bg-gray-700/50 text-gray-400 cursor-not-allowed border border-gray-600/50 py-3 px-4 rounded-lg'
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Navigation className={`w-4 h-4 ${locationSupport?.supported ? '' : 'opacity-50'}`} />
        )}
        {locationSupport?.supported ? 'Use Current Location' : 'Location Unavailable'}
        
        {/* Tooltip for location permission */}
        {locationSupport?.supported && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
            📍 Allow location access for accurate results
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
        
        {/* Tooltip for unsupported location */}
        {locationSupport && !locationSupport.supported && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 max-w-xs">
            {locationSupport.issues.includes('HTTPS required') 
              ? '🔒 HTTPS required for location access' 
              : '❌ Location not supported by browser'}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </motion.button>
    </div>
  );
};

export default LocationInput;
