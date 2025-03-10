import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Table from './Table';
import GenericForm from './GenericForm';
import ServiceForm from './ServiceForm';
import DatabaseService from '../services/DatabaseService';
import ServiceStaffService from '../services/ServiceStaffService';

function ServicesTab({ users }) {
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
      // 使用ServiceStaffService获取服务及其分配的员工
      const serviceStaffService = ServiceStaffService.getInstance();
      const servicesWithStaff = await serviceStaffService.getAllServicesWithStaff();
      
      // Process service data and handle duration format
      const servicesWithStaffName = servicesWithStaff.map((service) => {
        // 获取所有分配的员工名称
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
          staff_name: staffNames.length > 0 ? staffNames.join(', ') : 'Unassigned', // 使用逗号分隔的员工名称列表
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
        const staffData = users.filter(user => user.role === 'staff' || user.role === 'admin')
          .map(user => ({ id: user.id, full_name: user.full_name }));
        setStaffUsers(staffData);
        return staffData;
      } else {
        // 使用DatabaseService单例获取员工数据
        const dbService = DatabaseService.getInstance();
        const data = await dbService.fetchSpecificColumns('users', 'id, full_name', { role: 'staff' });
        
        setStaffUsers(data);
        return data;
      }
    } catch (error) {
      console.error('Error fetching staff users:', error.message);
      return [];
    }
  };

  // 使用DatabaseService和ServiceStaffService实现保存功能
  const handleSave = async (itemData) => {
    try {
      const dbService = DatabaseService.getInstance();
      const serviceStaffService = ServiceStaffService.getInstance();
      
      // 从表单数据中提取staff_ids
      const { staff_ids, ...serviceData } = itemData;
      
      if (isCreating) {
        // 创建新服务
        const newService = await dbService.createItem('services', serviceData, 'Service');
        
        // 为新服务分配员工
        if (staff_ids && staff_ids.length > 0) {
          await serviceStaffService.assignStaffToService(newService.id, staff_ids);
        }
        
        // 更新本地状态
        setServices([newService, ...services]);
        setIsCreating(false);
      } else {
        // 更新现有服务
        await dbService.updateItem('services', serviceData, 'Service');
        
        // 更新服务的员工分配
        if (serviceData.id) {
          await serviceStaffService.assignStaffToService(serviceData.id, staff_ids || []);
        }
        
        // 更新本地状态
        setServices(services.map((item) => 
          item.id === serviceData.id ? { ...item, ...serviceData } : item
        ));
        setEditItem(null);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // 使用DatabaseService单例实现删除功能
  const handleDeleteSelected = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // 删除选中的服务
      await dbService.deleteItems('services', selectedRows, 'Service');
      
      // 更新本地状态
      setServices(services.filter((item) => !selectedRows.includes(item.id)));
      setSelectedRows([]);
    } catch (error) {
      console.error('Error deleting services:', error);
      // 错误处理已在DatabaseService中通过toast显示
    }
  };

  // 根据员工筛选服务
  const filteredServices = staffFilter === 'all' 
    ? services 
    : services.filter(service => {
        if (staffFilter === 'unassigned') {
          return !service.staff_ids || service.staff_ids.length === 0;
        }
        // 确保staff_ids是数组并且包含选定的员工ID
        return service.staff_ids && Array.isArray(service.staff_ids) && service.staff_ids.includes(staffFilter);
      });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Services Management</h2>
      <button
        onClick={() => {
          setEditItem(null); // Reset form data for new service
          setIsCreating(true); // Open the popup
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 my-4"
      >
        Add New Service
      </button>

      <button
        onClick={handleDeleteSelected}
        className={`${selectedRows.length === 0 ? 'bg-gray-400 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded-lg my-4 ml-2`}
        disabled={selectedRows.length === 0}
      >
        Delete Selected
      </button>

      {/* 员工筛选 */}
      <div className="my-4">
        <label className="mr-2 font-medium">Filter by Staff:</label>
        <select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Services</option>
          <option value="unassigned">Unassigned</option>
          {staffUsers.map(staff => (
            <option key={staff.id} value={staff.id}>{staff.full_name}</option>
          ))}
        </select>
      </div>

      <Table
        data={filteredServices}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'description', label: 'Description' },
          { key: 'price', label: 'Price ($)' },
          { key: 'duration', label: 'Duration (mins)' }, // Display duration in minutes
          { key: 'staff_name', label: 'Assigned Staff' },
          { key: 'created_at', label: 'Created At' },
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
            <h2 className="text-xl font-semibold mb-4">{isCreating ? "Create New Service" : "Edit Service"}</h2>
            
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
                  
                  await handleSave(dataToSave);
                  
                  setEditItem(null);
                  setIsCreating(false);
                  
                  // 重新获取服务数据以更新表格
                  const staffData = await fetchStaffUsers();
                  if (staffData) {
                    await fetchServices(staffData);
                  }
                } catch (error) {
                  console.error('Error saving service:', error);
                  // 错误已在handleSave中通过toast显示
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default ServicesTab;