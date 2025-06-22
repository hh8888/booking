import { supabase } from '../supabaseClient';

class LocationService {
  static instance = null;
  
  constructor() {
    if (LocationService.instance) {
      return LocationService.instance;
    }
    
    this.locations = [];
    this.selectedLocation = null;
    this.selectedLocationId = null;
    this.listeners = [];
    
    LocationService.instance = this;
  }
  
  static getInstance() {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }
  
  async initializeLocations(dbService) {
    try {
      const { data: locations, error } = await supabase
        .from('location')
        .select('id,name')
        .order('id');
      
      if (error) {
        console.error('Error fetching locations:', error);
        return;
      }
      
      this.locations = locations || [];

      console.log('Locations fetched:', this.locations);
      
      // Set initial selected location if not already set
      if (!this.selectedLocation && this.locations.length > 0) {
        this.setSelectedLocation(this.locations[0]);
      }
    } catch (error) {
      console.error('Error initializing locations:', error);
    }
  }
  
  getLocations() {
    return this.locations;
  }
  
  getSelectedLocation() {
    return this.selectedLocation;
  }
  
  getSelectedLocationId() {
    return this.selectedLocationId;
  }
  
  setSelectedLocation(location) {
    if (typeof location === 'object') {
      this.selectedLocation = location;
      this.selectedLocationId = location.id;
      
      // Notify all listeners
      this.listeners.forEach(listener => {
        try {
          listener(location);
        } catch (error) {
          console.error('Error in location change listener:', error);
        }
      });
    } else {
      // Legacy support for separate name and id parameters
      this.selectedLocation = { name: location, id: arguments[1] };
      this.selectedLocationId = arguments[1];
      
      this.listeners.forEach(listener => {
        try {
          listener(this.selectedLocation);
        } catch (error) {
          console.error('Error in location change listener:', error);
        }
      });
    }
  }
  
  addLocationChangeListener(listener) {
    this.listeners.push(listener);
    
    // Return a function to remove the listener
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  removeLocationChangeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // New function to get location name by ID
  getLocationNameById(locationId) {
    if (!locationId) return 'N/A';
    
    console.log('Locations fetched:', this.locations);
    const location = this.locations.find(loc => loc.id === locationId);
    console.log('Looking for location ID:', locationId);
    console.log('Found location:', location);
    return location ? location.name : 'Unknown Location';
  }

  // Add new function to get location index by location object or ID
  getLocationIndex(location) {
    if (!location) return -1;
    
    // If location is an object with id property
    if (typeof location === 'string') {
      return this.locations.findIndex(loc => loc.name === location.location);
    }
    
    return -1;
  }
}

export default LocationService;