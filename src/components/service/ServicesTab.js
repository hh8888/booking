import React, { useState, useEffect } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { showToast } from '../common/ToastMessage';
import ToastMessage from '../common/ToastMessage';
import Table from '../table/Table';
import GenericForm from '../common/GenericForm';
import ServiceForm from './ServiceForm';
import DatabaseService from '../../services/DatabaseService';
import ServiceStaffService from '../../services/ServiceStaffService';
import withErrorHandling from '../common/withErrorHandling';
import { USER_ROLES, TABLES, QUERY_FILTERS } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext';

function ServicesTab({ users, handleError }) {
  const { t } = useLanguage();
  const [services, setServices] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [staffFilter, setStaffFilter] = useState('all');

  useEffect(() => {
    const initData = async () => {
      const staffData = await fetchStaffUsers();
      fetchServices(staffData); 
    };
    initData();
  }, []);

  const fetchServices = async (staffData) => {
    try {
      // Use ServiceStaffService to get services and their assigned staff
      const serviceStaffService = ServiceStaffService.getInstance();
      const servicesWithStaff = await serviceStaffService.getAllServicesWithStaff();
      
      // Process service data and handle duration format
      const servicesWithStaffName = servicesWithStaff.map((service) => {
        // Get all assigned staff names
        const staffNames = service.staff_ids && service.staff_ids.length > 0 
          ? service.staff_ids.map(staffId => {
              const staff = staffData.find(user => user.id === staffId);
              return staff?.full_name || 'Unknown';
            })
          : [];
        
        // Handle PostgreSQL interval format for duration
        let duration = service.duration;
        if (typeof duration === 'string') {
          // PostgreSQL interval format can be like '00:30:00' or '1 hour 30 minutes'
          if (duration.includes(':')) {
            // If duration is in time format (HH:MM:SS), convert to minutes
            const timeParts = duration.split(':');
            if (timeParts.length === 3) {
              // Convert hours:minutes:seconds to minutes
              duration = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]) + parseInt(timeParts[2]) / 60;
            } else if (timeParts.length === 2) {
              // Convert minutes:seconds to minutes
              duration = parseInt(timeParts[0]) + parseInt(timeParts[1]) / 60;
            }
          } else if (duration.includes('hour') || duration.includes('minute') || duration.includes('second')) {
            // Handle verbose interval format
            let minutes = 0;
            
            // Extract hours
            const hourMatch = duration.match(/(\d+)\s+hour/i);
            if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
            
            // Extract minutes
            const minuteMatch = duration.match(/(\d+)\s+minute/i);
            if (minuteMatch) minutes += parseInt(minuteMatch[1]);
            
            // Extract seconds (convert to fraction of minute)
            const secondMatch = duration.match(/(\d+)\s+second/i);
            if (secondMatch) minutes += parseInt(secondMatch[1]) / 60;
            
            duration = minutes;
          }
        }
        
        return {
          ...service,
          duration: duration, // Use the processed duration value
          staff_name: staffNames.length > 0 ? staffNames.join(', ') : '', // Show empty string when no staff assigned
        };
      });

      setServices(servicesWithStaffName);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      if (users && users.length > 0) {
        // Filter for providers (Staff and Manager, but not Admin)
        const staffData = users.filter(user => 
          user.role === USER_ROLES.STAFF || user.role === USER_ROLES.MANAGER
        ).map(user => ({ id: user.id, full_name: user.full_name }));
        setStaffUsers(staffData);
        return staffData;
      } else {
        // Use DatabaseService singleton to get provider data (Staff and Manager)
        const dbService = DatabaseService.getInstance();
        const staffData = await dbService.fetchSpecificColumns(TABLES.USERS, 'id, full_name', QUERY_FILTERS.ROLE_STAFF);
        const managerData = await dbService.fetchSpecificColumns(TABLES.USERS, 'id, full_name', { role: USER_ROLES.MANAGER });
        
        const combinedData = [...staffData, ...managerData];
        setStaffUsers(combinedData);
        return combinedData;
      }
    } catch (error) {
      console.error('Error fetching staff users:', error.message);
      return [];
    }
  };

  // Use DatabaseService and ServiceStaffService to implement save functionality
  const handleSave = async (itemData) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Ensure staff_ids is a valid array and filter out empty values
      const staff_ids = (itemData.staff_ids || []).filter(id => id && id.trim() !== '');
      // Extract staff_ids from form data and prepare service data
      const { staff_ids: _, ...serviceData } = itemData;
      
      if (isCreating) {
        // Create new service
        const newService = await dbService.createItem(TABLES.SERVICES, serviceData, 'Service');
        
        // Assign staff to new service
        if (staff_ids.length > 0) {
          await ServiceStaffService.getInstance().assignStaffToService(newService.id, staff_ids);
        }
        
        // Update local state
        const serviceWithStaff = { ...newService, staff_ids };
        setServices([serviceWithStaff, ...services]);
        setIsCreating(false);
      } else {
        // Update existing service
        const serviceDataWithId = {
          id: itemData.id,
          ...serviceData
        };
        await dbService.updateItem(TABLES.SERVICES, serviceDataWithId, 'Service');
        
        // Update service staff assignments
        await ServiceStaffService.getInstance().assignStaffToService(itemData.id, staff_ids);
        
        // Update local state
        setServices(services.map((item) => 
          item.id === itemData.id ? { ...item, ...serviceData, staff_ids } : item
        ));
        setEditItem(null);
      }
    } catch (error) {
      handleError('saving', () => Promise.reject(error));
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      await dbService.deleteItems(TABLES.SERVICES, selectedRows, 'Service');
      setServices(services.filter((item) => !selectedRows.includes(item.id)));
    } catch (error) {
      handleError('deleting', () => Promise.reject(error));
    }
  };

  // Filter services by staff
  const filteredServices = staffFilter === 'all' 
    ? services 
    : services.filter(service => {
        if (staffFilter === 'unassigned') {
          return !service.staff_ids || service.staff_ids.length === 0;
        }
        // Ensure staff_ids is an array and contains selected staff ID
        return service.staff_ids && Array.isArray(service.staff_ids) && service.staff_ids.includes(staffFilter);
      });

  if (loading) return <div>{t('common.loading')}</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('services.manageServices')}</h2>
      <button
        onClick={() => {
          setEditItem(null); // Reset form data for new service
          setIsCreating(true); // Open the popup
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 my-4"
      >
        {t('services.addNewService')}
      </button>
      <button
        onClick={async () => {
          console.log('Refreshing users data...');
          const initData = async () => {
            const staffData = await fetchStaffUsers();
            fetchServices(staffData); 
          };
          await initData();
          console.log('Users data refreshed successfully');
        }}
        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 my-4 ml-2"
      >
        {t('common.refresh')}
      </button>
      <button
        onClick={handleDeleteSelected}
        className={`${selectedRows.length === 0 ? 'bg-gray-400 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded-lg my-4 ml-2`}
        disabled={selectedRows.length === 0}
      >
        {t('users.deleteSelected')}
      </button>

      {/* Staff filter */}
      <div className="my-4">
        <label className="mr-2 font-medium">{t('services.filterByStaff')}</label>
        <select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">{t('services.allStaff')}</option>
          <option value="unassigned">{t('services.unassigned')}</option>
          {staffUsers.map(staff => (
            <option key={staff.id} value={staff.id}>{staff.full_name}</option>
          ))}
        </select>
      </div>

      <Table
        data={filteredServices}
        columns={[
          { key: 'name', label: t('formLabels.name') },
          { key: 'description', label: t('formLabels.description') },
          { key: 'price', label: t('formLabels.price') },
          { key: 'duration', label: t('formLabels.duration') }, // Display duration in minutes
          { key: 'staff_name', label: t('formLabels.assignedStaff') },
          { key: 'created_at', label: t('formLabels.createdAt') },
        ]}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onEdit={(service) => {
          setIsCreating(false);
          setEditItem(service);
        }}
      />

      {(editItem || isCreating) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">{isCreating ? t('formLabels.createNewService') : t('formLabels.editService')}</h2>
            
            <ServiceForm
              initialData={editItem}
              staffUsers={staffUsers}
              onClose={() => {
                setEditItem(null);
                setIsCreating(false);
              }}
              onSubmit={async (formData) => {
                try {
                  // Remove staff_name field before saving to database
                  const { staff_name, ...dataToSave } = formData;
                  
                  // Convert duration from minutes to PostgreSQL interval format
                  if (dataToSave.duration) {
                    // Convert minutes to 'HH:MM:00' format for PostgreSQL interval
                    const hours = Math.floor(dataToSave.duration / 60);
                    const minutes = Math.floor(dataToSave.duration % 60);
                    dataToSave.duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
                  }
                  console.log('Data to save:', dataToSave);
                  await handleSave(dataToSave);
                  
                  setEditItem(null);
                  setIsCreating(false);
                  
                  // Refetch service data to update table
                  const staffData = await fetchStaffUsers();
                  if (staffData) {
                    await fetchServices(staffData);
                  }
                } catch (error) {
                  console.error('Error saving service:', error);
                  // Error already shown in handleSave via toast
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Toast Message Component */}
      <ToastMessage />
    </div>
  );
}

export default withErrorHandling(ServicesTab, 'Service');