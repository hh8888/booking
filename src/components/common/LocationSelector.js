import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DatabaseService from '../../services/DatabaseService';
import LocationService from '../../services/LocationService';
import { useLanguage } from '../../contexts/LanguageContext';

const LocationSelector = () => {
  const { t } = useLanguage();
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(null);
  const [locations, setLocations] = useState([]);
  
  // React Router hooks
  const location = useLocation();
  const navigate = useNavigate();
  
  // Fetch locations from the location table
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locationService = LocationService.getInstance();
        const dbService = DatabaseService.getInstance();
        
        // Initialize LocationService with database service
        await locationService.initializeLocations(dbService);
        
        // Get locations from LocationService
        const data = locationService.getLocations();
        
        if (data && data.length > 0) {
          setLocations(data);
          
          // Check URL for location parameter
          const searchParams = new URLSearchParams(location.search);
          const locationParam = searchParams.get('location');
          
          // Find location by name from URL parameter
          if (locationParam) {
            const locationMatch = data.find(loc => loc.name === locationParam);
            if (locationMatch) {
              setSelectedLocation(locationMatch.name);
              setSelectedLocationIndex(locationMatch.id);
              locationService.setSelectedLocation(locationMatch);
            } else {
              // If location from URL not found, use first location
              setSelectedLocation(data[0].name);
              setSelectedLocationIndex(data[0].id);
              locationService.setSelectedLocation(data[0]);
              
              // Update URL with default location
              const newSearchParams = new URLSearchParams(location.search);
              newSearchParams.set('location', data[0].name);
              navigate({ search: newSearchParams.toString() }, { replace: true });
            }
          } else {
            // No location in URL, use first location
            setSelectedLocation(data[0].name);
            setSelectedLocationIndex(data[0].id);
            locationService.setSelectedLocation(data[0]);
            
            // Update URL with default location
            const newSearchParams = new URLSearchParams(location.search);
            newSearchParams.set('location', data[0].name);
            navigate({ search: newSearchParams.toString() }, { replace: true });
          }
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };

    fetchLocations();
  }, [location.search, navigate]);

  // Handle location change
  const handleLocationChange = (value) => {
    const locationId = parseInt(value);
    const locationObj = locations.find(loc => loc.id === locationId);
    
    if (locationObj) {
      setSelectedLocation(locationObj.name);
      setSelectedLocationIndex(locationId);
      
      // Update LocationService with the new selection
      const locationService = LocationService.getInstance();
      locationService.setSelectedLocation(locationObj);
      
      // Update URL with new location
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('location', locationObj.name);
      navigate({ search: searchParams.toString() }, { replace: true });
    }
  };

  return (
    <div className="mt-2">
      <label htmlFor="location-select" className="text-sm font-medium text-gray-700 mr-2">
        {t('common.location')}
      </label>
      <select
        id="location-select"
        value={selectedLocationIndex || ''} // Handle null case
        onChange={(e) => handleLocationChange(e.target.value)}
        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LocationSelector;