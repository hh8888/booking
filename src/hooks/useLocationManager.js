import { useEffect, useRef } from 'react';
import DatabaseService from '../services/DatabaseService';
import LocationService from '../services/LocationService';
import { TABLES } from '../constants';
import { toast } from 'react-toastify';

const useLocationManager = ({
  userId,
  lastLocation,
  userLoading,
  userType = 'user' // 'customer', 'admin', or 'user'
}) => {
  const initializationRef = useRef(false);
  const locationRestorationRef = useRef(false);

  // Initialize location restoration when user data is available
  useEffect(() => {
    const initLocationData = async () => {
      // Prevent multiple initializations
      if (initializationRef.current || !userId || userLoading) {
        return;
      }
      
      initializationRef.current = true;
      
      console.log(`=== ${userType} useLocationManager initLocationData START ===`);
      console.log('User ID:', userId);
      console.log('Last Location:', lastLocation);
      
      try {
        // Restore last selected location if available
        if (lastLocation) {
          locationRestorationRef.current = true; // Set flag before restoration
          const locationService = LocationService.getInstance();
          const dbService = DatabaseService.getInstance();
          
          // Initialize locations first, then set the selected location
          await locationService.initializeLocations(dbService);
          
          // Find the location object by ID
          const locations = locationService.getLocations();
          const savedLocation = locations.find(loc => loc.id === lastLocation);
          
          if (savedLocation) {
            locationService.setSelectedLocation(savedLocation);
            console.log(`Restored ${userType} last location:`, savedLocation);
          }
          
          // Reset flag after a short delay to allow for any pending location changes
          setTimeout(() => {
            locationRestorationRef.current = false;
          }, 100);
        }
      } catch (error) {
        console.error(`Error initializing ${userType} location data:`, error);
      }
      
      console.log(`=== ${userType} useLocationManager initLocationData END ===`);
    };

    initLocationData();
  }, [userId, lastLocation, userLoading, userType]);

  // Add location change listener to save location
  useEffect(() => {
    if (!userId) return;
    
    const locationService = LocationService.getInstance();
    
    // Add listener for location changes
    const removeListener = locationService.addLocationChangeListener(async (newLocation) => {
      console.log(`${userType} location changed:`, newLocation);
      
      // Save the new location to user's last_location field only if:
      // 1. Loading is finished
      // 2. Not during location restoration
      // 3. This is a user-initiated change
      if (userId && newLocation && !userLoading && 
          initializationRef.current && !locationRestorationRef.current) {
        // Additional check: only save if the location is actually different from current
        if (lastLocation !== newLocation.id) {
          try {
            const dbService = DatabaseService.getInstance();
            await dbService.updateItem(TABLES.USERS, {
              id: userId,
              last_location: newLocation.id
            }, 'User');
            console.log(`Saved ${userType} last_location:`, newLocation.id);
          } catch (error) {
            console.error(`Error saving ${userType} location:`, error);
            toast.error('Failed to save location preference');
          }
        } else {
          console.log(`${userType} location unchanged, skipping save`);
        }
      } else {
        console.log(`Skipping ${userType} location save - loading in progress, initialization not complete, or during restoration`);
      }
    });
    
    // Cleanup listener on unmount
    return () => {
      removeListener();
    };
  }, [userId, lastLocation, userLoading, userType]);

  return {
    initializationRef,
    locationRestorationRef
  };
};

export default useLocationManager;