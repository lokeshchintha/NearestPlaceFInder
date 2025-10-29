# 🌍 Nearby Places Finder

A modern, interactive React website that helps users find nearby places like airports, restaurants, hotels, and more. Built with React, Tailwind CSS, Framer Motion, and Leaflet maps.

## ✨ Features

- **📍 Location Detection**: Auto-detect current location or search by address
- **🗺️ Interactive Maps**: Beautiful map integration with custom markers
- **🔍 Smart Search**: Search and filter places by category, distance, or rating
- **📱 Responsive Design**: Works perfectly on mobile and desktop
- **🎨 Modern UI**: Glassmorphism design with smooth animations
- **⚡ Real-time Results**: Instant search results with live filtering
- **🧭 Navigation**: Get directions to any place with one click

## 🏗️ Tech Stack

- **Frontend**: React 18, JavaScript ES6+
- **Styling**: Tailwind CSS, Custom CSS
- **Animations**: Framer Motion
- **Maps**: Leaflet.js, React Leaflet
- **APIs**: OpenStreetMap, Overpass API, Nominatim
- **Icons**: Lucide React
- **HTTP Client**: Axios

## 🚀 Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nearby-places-finder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000` to view the application.

## 📱 How to Use

1. **Set Your Location**
   - Click "Use Current Location" to auto-detect your position
   - Or enter an address in the search bar

2. **Adjust Search Radius**
   - Use the slider to set your preferred search radius (1-50 km)
   - Default is 10 km

3. **Browse Places**
   - View results in the left panel as cards
   - See all places on the interactive map
   - Click markers for detailed information

4. **Filter & Sort**
   - Filter by category (airports, restaurants, hotels, etc.)
   - Sort by distance, rating, or name
   - Use the search bar to find specific places

5. **Get Directions**
   - Click "Directions" on any place card
   - Opens Google Maps with turn-by-turn navigation

## 🏢 Place Categories

The app searches for these types of places:

- ✈️ **Airports** - Commercial and regional airports
- 🚌 **Bus Stations** - Public transportation hubs
- 🚂 **Train Stations** - Railway stations and terminals
- 🚕 **Taxi Stands** - Designated taxi pickup points
- ⛴️ **Ferry Terminals** - Water transportation hubs
- 🚛 **Truck Stops** - Rest areas for commercial vehicles
- ☕ **Cafes** - Coffee shops and casual dining
- 🍽️ **Restaurants** - Dining establishments
- 🏨 **Hotels & Lodging** - Accommodation options

## 🎨 UI Features

- **Glassmorphism Design**: Modern glass-like effects with backdrop blur
- **Smooth Animations**: Framer Motion powered transitions
- **Responsive Layout**: Mobile-first design that scales beautifully
- **Interactive Elements**: Hover effects and micro-interactions
- **Custom Map Markers**: Category-specific colored markers
- **Loading States**: Elegant loading animations
- **Error Handling**: User-friendly error messages

## 🔧 Configuration

### Customizing Search Radius
Edit the default radius in `src/App.js`:
```javascript
const [radius, setRadius] = useState(10); // Change default radius
```

### Adding New Place Categories
Add new categories in `src/services/placesService.js`:
```javascript
export const PLACE_CATEGORIES = {
  // ... existing categories
  new_category: { 
    name: 'New Category', 
    icon: '🏢', 
    tag: 'amenity=new_category' 
  }
};
```

### Styling Customization
Modify colors and styles in `tailwind.config.js` and `src/index.css`.

## 📊 API Integration

The app uses several free APIs:

- **Overpass API**: For fetching place data from OpenStreetMap
- **Nominatim**: For geocoding addresses to coordinates
- **OpenStreetMap**: For map tiles and base map data

No API keys required! All services are free and open-source.

## 🌐 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

**Note**: Geolocation requires HTTPS in production environments.

## 📱 Mobile Features

- Touch-friendly interface
- Responsive map controls
- Optimized for small screens
- Swipe gestures on mobile

## 🔒 Privacy

- Location data is only used locally
- No personal information is stored
- All API calls are made directly from the browser
- No tracking or analytics

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Netlify/Vercel
1. Build the project
2. Upload the `build` folder
3. Configure redirects for SPA routing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🐛 Troubleshooting

### Common Issues

**Location not detected:**
- Ensure location services are enabled
- Check browser permissions
- Try using HTTPS

**No places found:**
- Increase search radius
- Try a different location
- Check internet connection

**Map not loading:**
- Check internet connection
- Clear browser cache
- Try refreshing the page

## 🎯 Future Enhancements

- [ ] Save favorite places
- [ ] Route planning between multiple places
- [ ] Place reviews and ratings
- [ ] Offline map support
- [ ] Dark/light theme toggle
- [ ] Voice search
- [ ] Place recommendations based on preferences

---

Built with ❤️ using React and modern web technologies.
