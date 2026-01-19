import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star, Clock, Navigation2, Route, CheckCircle, MapIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PlaceCard = ({ place }) => {
  const [currentPlace, setCurrentPlace] = useState(place);
  const navigate = useNavigate();

  // Update place data when prop changes
  useEffect(() => {
    setCurrentPlace(place);
  }, [place]);

  const handleGetDirections = (openInNewTab = true) => {
    if (currentPlace?.lat && currentPlace?.lng) {
      // Navigate to directions page with place data
      const placeData = encodeURIComponent(JSON.stringify({
        name: currentPlace.name,
        lat: currentPlace.lat,
        lng: currentPlace.lng,
        address: currentPlace.address,
        distance: currentPlace.distance
      }));
      
      if (openInNewTab) {
        // Open in new tab for better UX
        window.open(`/directions?place=${placeData}`, '_blank');
      } else {
        // Navigate in same tab
        navigate(`/directions?place=${placeData}`);
      }
    }
  };

  // Return early if no place data
  if (!currentPlace) {
    return null;
  }

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -8 }}
      whileTap={{ scale: 0.98 }}
      className="floating-card group cursor-pointer relative overflow-hidden"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{currentPlace.icon}</div>
          <div>
            <h3 className="text-white font-semibold text-lg leading-tight">
              {currentPlace.name}
            </h3>
            <p className="text-white/70 text-sm">{currentPlace.categoryName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded-full">
          <Star className="w-3 h-3 text-yellow-400 fill-current" />
          <span className="text-yellow-400 text-xs font-medium">
            {currentPlace.rating?.toFixed(1) || 'N/A'}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-white/80 text-sm">
          <MapPin className="w-4 h-4 text-blue-400" />
          <span>{currentPlace.distance} km away</span>
        </div>
        
        <div className="flex items-start gap-2 text-white/70 text-sm">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span className="line-clamp-2">{currentPlace.address}</span>
            {(currentPlace.verified || currentPlace.type === 'verified_mock') && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-green-400 text-xs">Verified Address</span>
              </div>
            )}
          </div>
        </div>

        {currentPlace.opening_hours && (
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <Clock className="w-4 h-4 text-green-400" />
            <span>{currentPlace.opening_hours}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <motion.button
          onClick={() => handleGetDirections(false)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-blue-300 border border-blue-500/30 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
          title="Open directions in new tab"
        >
          <Route className="w-4 h-4" />
          Get Navigation
        </motion.button>
      </div>
      </div>
    </motion.div>
  );
};

export default PlaceCard;
