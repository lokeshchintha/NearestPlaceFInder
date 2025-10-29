import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PlacesFinder from './components/PlacesFinder.jsx';
import DirectionsPage from './components/DirectionsPage.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PlacesFinder />} />
        <Route path="/directions" element={<DirectionsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
