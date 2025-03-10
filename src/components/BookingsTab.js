import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Table from './Table';
import GenericForm from './GenericForm';
import DatabaseService from '../services/DatabaseService';

function BookingsTab({ users }) {
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const initData = async () => {
      const [customerData, serviceData] = await Promise.all([
        fetchCustomers(),
        fetchServices()
      ]);
      fetchBookings(serviceData, customerData);
    };
    initData();
  }, []);

  const fetchBookings = async (serviceData, customerData) => {
    try {
      // 使用DatabaseService单例获取预约数据
      const dbService = DatabaseService.getInstance();
      const data = await dbService.fetchData('bookings', 'start_time', false);

      // 使用传入的服务和客户数据，而不是依赖state
      const servicesForMapping = serviceData || services;
      const customersForMapping = customerData || customers;

      // 处理预约数据，添加服务名称、客户名称和持续时间
      const bookingsWithDetails = data.map((booking) => {
        const service = servicesForMapping.find((s) => s.id === booking.service_id);
        const customer = customersForMapping.find((c) => c.id === booking.customer_id);
        
        // 计算预约持续时间（分钟）
        let durationInMinutes = 60; // 默认60分钟
        
        if (service && service.duration) {
          // 如果服务有持续时间，使用服务的持续时间
          durationInMinutes = parseDuration(service.duration);
        } else if (booking.start_time && booking.end_time) {
          // 如果预约有开始和结束时间，计算实际持续时间
          const startTime = new Date(booking.start_time);
          const endTime = new Date(booking.end_time);
          durationInMinutes = Math.round((endTime - startTime) / 60000); // 转换为分钟
        }
        
        return {
          ...booking,
          service_name: service?.name || 'Unknown Service',
          customer_name: customer?.full_name || 'Unknown Customer',
          // 格式化日期时间显示
          booking_time_formatted: new Date(booking.start_time).toLocaleString(),
          // 添加持续时间字段
          duration: durationInMinutes,
          // 添加格式化的start_time，用于datetime-local输入框
          start_time: booking.start_time ? new Date(booking.start_time).toISOString().slice(0, 16) : ''
        };
      });

      setBookings(bookingsWithDetails);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const data = await dbService.fetchData('services');
      setServices(data);
      return data;
    } catch (error) {
      console.error('Error fetching services:', error.message);
      return [];
    }
  };

  const fetchCustomers = async () => {
    try {
      if (users && users.length > 0) {
        const customerData = users.filter(user => user.role === 'customer')
          .map(user => ({ id: user.id, full_name: user.full_name }));
        setCustomers(customerData);
        return customerData;
      } else {
        const dbService = DatabaseService.getInstance();
        const data = await dbService.fetchSpecificColumns('users', 'id, full_name', { role: 'customer' });
        setCustomers(data);
        return data;
      }
    } catch (error) {
      console.error('Error fetching customers:', error.message);
      return [];
    }
  };

  // 解析各种格式的duration为分钟数
  const parseDuration = (duration) => {
    let durationInMinutes = 60; // 默认60分钟
    
    // 确保duration是有效的数字
    if (typeof duration === 'number' && !isNaN(duration)) {
      durationInMinutes = duration;
    } else if (typeof duration === 'string') {
      // 处理PostgreSQL interval格式
      if (duration.includes(':')) {
        // 如果duration是时间格式(HH:MM:SS)，转换为分钟
        const timeParts = duration.split(':');
        if (timeParts.length === 3) {
          // 转换小时:分钟:秒为分钟
          durationInMinutes = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]) + parseInt(timeParts[2]) / 60;
        } else if (timeParts.length === 2) {
          // 转换分钟:秒为分钟
          durationInMinutes = parseInt(timeParts[0]) + parseInt(timeParts[1]) / 60;
        }
      } else if (duration.includes('hour') || duration.includes('minute') || duration.includes('second')) {
        // 处理详细的interval格式
        let minutes = 0;
        
        // 提取小时
        const hourMatch = duration.match(/(\d+)\s+hour/i);
        if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
        
        // 提取分钟
        const minuteMatch = duration.match(/(\d+)\s+minute/i);
        if (minuteMatch) minutes += parseInt(minuteMatch[1]);
        
        // 提取秒(转换为分钟的小数)
        const secondMatch = duration.match(/(\d+)\s+second/i);
        if (secondMatch) minutes += parseInt(secondMatch[1]) / 60;
        
        durationInMinutes = minutes;
      } else {
        // 尝试直接解析数字
        const parsedDuration = parseFloat(duration);
        if (!isNaN(parsedDuration)) {
          durationInMinutes = parsedDuration;
        }
      }
    }
    
    return durationInMinutes;
  };

  // 使用DatabaseService单例实现保存功能
  const handleSave = async (itemData) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // 移除额外的显示字段
      const { service_name, customer_name, booking_time_formatted, duration, ...dataToSave } = itemData;
      
      // 验证必填字段
      if (!dataToSave.customer_id) {
        toast.error('Please select a customer');
        return;
      }
      
      if (!dataToSave.service_id) {
        toast.error('Please select a service');
        return;
      }
      
      // 计算end_time，根据服务的duration
      const selectedService = services.find(service => service.id === dataToSave.service_id);
      
      try {
        // 验证开始时间是否有效
        const startTime = new Date(dataToSave.start_time);
        if (isNaN(startTime.getTime())) {
          throw new Error('Invalid start time');
        }
        
        // 使用统一的parseDuration函数解析duration
        let durationInMinutes = parseDuration(selectedService?.duration);
        
        // 计算结束时间
        const endTime = new Date(startTime.getTime() + durationInMinutes * 60000); // 60000毫秒 = 1分钟
        
        // 验证结束时间是否有效
        if (isNaN(endTime.getTime())) {
          throw new Error('Invalid end time calculation');
        }
        
        // 添加end_time到保存数据中
        dataToSave.end_time = endTime.toISOString();
      } catch (error) {
        console.error('Error calculating booking time:', error);
        toast.error(`Error calculating booking time: ${error.message}`);
        return;
      }
      
      if (isCreating) {
        // 创建新预约
        await dbService.createItem('bookings', dataToSave, 'Booking');
        
        // 更新本地状态
        const staffData = await fetchServices();
        const customerData = await fetchCustomers();
        await fetchBookings(staffData, customerData); // 传递最新的服务和客户数据
        setIsCreating(false);
      } else {
        // 更新现有预约
        await dbService.updateItem('bookings', dataToSave, 'Booking');
        
        // 更新本地状态
        const staffData = await fetchServices();
        const customerData = await fetchCustomers();
        await fetchBookings(staffData, customerData); // 传递最新的服务和客户数据
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
      
      // 删除选中的预约
      await dbService.deleteItems('bookings', selectedRows, 'Booking');
      
      // 更新本地状态
      setBookings(bookings.filter((item) => !selectedRows.includes(item.id)));
      setSelectedRows([]);
    } catch (error) {
      console.error('Error deleting bookings:', error);
      // 错误处理已在DatabaseService中通过toast显示
    }
  };

  // 根据状态筛选预约
  const filteredBookings = statusFilter === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === statusFilter);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Manage Bookings</h2>
      
      {/* 创建新预约按钮 */}
      <button
        onClick={() => {
          setIsCreating(true);
          setEditItem({
            customer_id: customers.length > 0 ? customers[0].id : null,
            service_id: services.length > 0 ? services[0].id : null,
            start_time: new Date().toISOString().slice(0, 16),
            status: "pending",
            notes: ""
          });
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 my-4"
      >
        Create New Booking
      </button>

      {/* 删除选中按钮 */}
      <button
        onClick={handleDeleteSelected}
        className={`${selectedRows.length === 0 ? 'bg-gray-400 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded-lg my-4 ml-2`}
        disabled={selectedRows.length === 0}
      >
        Delete Selected
      </button>

      {/* 状态筛选 */}
      <div className="my-4">
        <label className="mr-2 font-medium">Filter by Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Bookings</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* 预约表格 */}
      <Table
        columns={[
          { key: "customer_name", label: "Customer" },
          { key: "service_name", label: "Service" },
          { key: "booking_time_formatted", label: "Booking Time" },
          { key: "duration", label: "Duration (mins)" },
          { key: "status", label: "Status" },
          { key: "notes", label: "Notes" },
          { key: "created_at", label: "Created At" },
        ]}
        data={filteredBookings}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onEdit={(booking) => {
          setIsCreating(false);
          // 确保start_time格式化为datetime-local输入所需的格式 (YYYY-MM-DDThh:mm)
          const formattedBooking = {
            ...booking,
            start_time: booking.start_time ? new Date(booking.start_time).toISOString().slice(0, 16) : ''
          };
          setEditItem(formattedBooking);
        }}
      />

      {/* 编辑/创建弹窗 */}
      {(editItem || isCreating) && (
        <GenericForm
          data={editItem}
          onSave={handleSave}
          onCancel={() => {
            setEditItem(null);
            setIsCreating(false);
          }}
          title={isCreating ? "Create New Booking" : "Edit Booking"}
          fields={[
            { 
              key: "customer_id", 
              label: "Customer", 
              type: "select",
              required: true,
              options: customers.map(customer => ({
                value: customer.id,
                label: customer.full_name
              })),
              placeholder: "Select Customer"
            },
            { 
              key: "service_id", 
              label: "Service", 
              type: "select",
              required: true,
              options: services.map(service => ({
                value: service.id,
                label: service.name
              })),
              placeholder: "Select Service"
            },
            { 
              key: "start_time", 
              label: "Booking Time", 
              type: "datetime",
              required: true 
            },
            { 
              key: "status", 
              label: "Status", 
              type: "select",
              required: true,
              options: [
                { value: "pending", label: "Pending" },
                { value: "confirmed", label: "Confirmed" },
                { value: "completed", label: "Completed" },
                { value: "cancelled", label: "Cancelled" }
              ]
            },
            { 
              key: "notes", 
              label: "Notes", 
              type: "textarea" 
            },
          ]}
        />
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

export default BookingsTab;