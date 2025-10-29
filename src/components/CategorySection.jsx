import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import PlaceCard from './PlaceCard.jsx';

const CategorySection = ({ category, places, categoryData, index, sortBy }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!places || places.length === 0) return null;

  // Get sort indicator text
  const getSortIndicator = () => {
    switch (sortBy) {
      case 'distance':
        return 'by distance';
      case 'rating':
        return 'by rating';
      case 'name':
        return 'by name';
      default:
        return 'by distance';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      className="mb-8"
    >
      {/* Category Header */}
      <motion.div
        className="category-header cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              className="text-4xl"
              whileHover={{ scale: 1.2, rotate: 10 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {categoryData.icon}
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {categoryData.name}
              </h2>
              <div className="flex items-center gap-4 text-gray-300">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {places.length} places found
                </span>
                <span className="text-sm bg-blue-500/20 px-3 py-1 rounded-full">
                  {places[0]?.distance ? `${places[0].distance} km away` : 'Nearby'}
                </span>
                <span className="text-xs bg-purple-500/20 px-2 py-1 rounded-full text-purple-300">
                  sorted {getSortIndicator()}
                </span>
              </div>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ChevronDown className="w-6 h-6" />
          </motion.div>
        </div>
      </motion.div>

      {/* Places Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="place-grid mt-4">
              {places.slice(0, 10).map((place, placeIndex) => (
                <motion.div
                  key={place.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ 
                    delay: placeIndex * 0.05,
                    duration: 0.4,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{ y: -5 }}
                >
                  <PlaceCard place={place} />
                </motion.div>
              ))}
            </div>
            
            {places.length > 10 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 text-center"
              >
                <p className="text-gray-400 text-sm">
                  Showing top 10 of {places.length} {categoryData.name.toLowerCase()}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CategorySection;
