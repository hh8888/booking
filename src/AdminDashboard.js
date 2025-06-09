import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import DashboardTab from './components/dashboard/DashboardTab';
import UsersTab from './components/service/UsersTab';
import ServicesTab from './components/service/ServicesTab';
import BookingsTab from './components/booking/BookingsTab';
import ReportsTab from './components/reports/ReportsTab';
import SettingsTab from './components/SettingsTab';
import DatabaseService from './services/DatabaseService';
import LocationService from './services/LocationService';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard'); // Default active tab
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('Booking Management System');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(null); // Changed to null initially
  const [locations, setLocations] = useState([]);
  
  // State for storing network error messages
  const [networkError, setNetworkError] = useState(null);
  
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

    const fetchBusinessInfo = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const name = await dbService.getSettingsByKey('system', 'businessName');
        
        if (name) {
          setBusinessName(name);
        }
      } catch (error) {
        console.error('Error fetching business info:', error);
      }
    };

    fetchLocations();
    fetchBusinessInfo();
    const fetchUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        if (userData) {
          setUserRole(userData.role);
        }
      }
    };
    fetchUserInfo();
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false });
    
        if (error) {
          console.error("Error fetching users:", error);
          setNetworkError("Network connection issue. Unable to fetch user data. Please check your connection and try again.");
        } else {
          setUsers(data);
          setNetworkError(null); // Clear previous errors
        }
      } catch (e) {
        console.error("Exception fetching users:", e);
        setNetworkError("Network connection issue. Unable to fetch user data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchUsers();
  }, []);

  // Retry fetching user data
  const retryFetchUsers = () => {
    setLoading(true);
    setNetworkError(null);
    // Trigger useEffect again
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false });
    
        if (error) {
          console.error("Error fetching users:", error);
          setNetworkError("Network connection issue. Unable to fetch user data. Please check your connection and try again.");
        } else {
          setUsers(data);
          setNetworkError(null);
        }
      } catch (e) {
        console.error("Exception fetching users:", e);
        setNetworkError("Network connection issue. Unable to fetch user data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  };

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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
    else window.location.reload(); // Reload the page to return to the sign-in screen
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 flex flex-col">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">{businessName}</h1>
          <div className="mt-2">
            <label htmlFor="location-select" className="text-sm font-medium text-gray-700 mr-2">
              Location:
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
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">{userEmail}</p>
            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-red-500 text-white py-2 px-3 md:py-2 md:px-4 rounded-lg hover:bg-red-600 transition duration-200 text-sm md:text-base link-button"
          >
            Sign Out
          </button>
        </div>
      </div>
    
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-4 md:mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${activeTab === 'dashboard' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${activeTab === 'bookings' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Bookings
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${activeTab === 'users' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('Services')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${activeTab === 'Services' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Services
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${activeTab === 'reports' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Reports
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-2 px-3 md:px-4 text-sm md:text-base whitespace-nowrap ${activeTab === 'settings' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Settings
        </button>
      </div>
    
      {/* Tab Content */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md flex-grow mb-16">
        {loading ? (
          <p className="text-sm md:text-base">Loading users...</p>
        ) : networkError ? (
          <div className="text-center py-6 md:py-8">
            <div className="text-red-500 text-base md:text-xl mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{networkError}</p>
            </div>
            <button 
              onClick={retryFetchUsers}
              className="mt-4 bg-blue-500 text-white py-2 px-4 md:px-6 rounded-lg hover:bg-blue-600 transition duration-200 text-sm md:text-base"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardTab selectedLocation={selectedLocation} />}
            {activeTab === 'bookings' && <BookingsTab users={users} selectedLocation={selectedLocation} />}
            {activeTab === 'users' && <UsersTab users={users} setUsers={setUsers} selectedLocation={selectedLocationIndex} />}
            {activeTab === 'Services' && <ServicesTab users={users} selectedLocation={selectedLocation} />}
            {activeTab === 'reports' && <ReportsTab selectedLocation={selectedLocation} />}
            {activeTab === 'settings' && <SettingsTab />}
          </>
        )}
      </div>
    </div>
  );
}
