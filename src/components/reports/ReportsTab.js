import React, { useState, useEffect } from 'react';
import DatabaseService from '../../services/DatabaseService';
import { toast } from 'react-toastify';
import { TABLES } from '../../constants';
import { Bar } from 'react-chartjs-2';
import { useLanguage } from '../../contexts/LanguageContext';
import ConnectedUsersReport from './ConnectedUsersReport';
import useDashboardUser from '../../hooks/useDashboardUser';
// Only register what you need
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // Add this for Doughnut chart
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // Add this
  Title,
  Tooltip,
  Legend
);

export default function ReportsTab() {
  const { t } = useLanguage();
  const { currentUserId, userRole, userName } = useDashboardUser();
  const [activeReportTab, setActiveReportTab] = useState('bookings');
  const [weeklyBookings, setWeeklyBookings] = useState([]);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState('all');
  const [staffOptions, setStaffOptions] = useState([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Start date
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }); // End date

  useEffect(() => {
    fetchWeeklyBookings();
    fetchCustomerBookings();
  }, [startDate, endDate, selectedStaffId]); // Refetch data when date range or staff selection changes

  const fetchWeeklyBookings = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Get date range
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Get booking data with related services and staff information
      const [bookings, services, staff] = await Promise.all([
        dbService.fetchData(
          TABLES.BOOKINGS,
          'start_time',
          false,
          {
            start_time: {
              gte: start.toISOString(),
              lte: end.toISOString()
            }
          }
        ),
        dbService.fetchData(TABLES.SERVICES),
        dbService.fetchData(TABLES.USERS, 'full_name', false, { role: { in: ['staff', 'manager'] } })
      ]);

      // Set staff options for filter (sorted alphabetically)
      const sortedStaff = staff
        .map(s => ({ id: s.id, name: s.full_name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setStaffOptions([
        { id: 'all', name: 'All Staff' },
        ...sortedStaff
      ]);

      // Create date labels
      const dateLabels = [];
      let currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        dateLabels.push(dateStr);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Filter bookings by selected staff if not 'all'
      let filteredBookings = bookings;
      if (selectedStaffId !== 'all') {
        filteredBookings = bookings.filter(booking => booking.provider_id === selectedStaffId);
      }

      // Get unique service types (booking types)
      const serviceTypes = new Set();
      filteredBookings.forEach(booking => {
        const service = services.find(s => s.id === booking.service_id);
        const serviceName = service?.name || 'Unknown Service';
        serviceTypes.add(serviceName);
      });

      const serviceTypesList = Array.from(serviceTypes).sort();
      
      // Generate colors for each combination
      const colors = [
        'rgba(59, 130, 246, 0.8)',   // Blue
        'rgba(34, 197, 94, 0.8)',    // Green
        'rgba(239, 68, 68, 0.8)',    // Red
        'rgba(245, 158, 11, 0.8)',   // Yellow
        'rgba(139, 92, 246, 0.8)',   // Purple
        'rgba(236, 72, 153, 0.8)',   // Pink
        'rgba(20, 184, 166, 0.8)',   // Teal
        'rgba(251, 146, 60, 0.8)',   // Orange
        'rgba(156, 163, 175, 0.8)',  // Gray
        'rgba(99, 102, 241, 0.8)'    // Indigo
      ];

      // Initialize data structure for each service type and date
      const chartData = {};
      serviceTypesList.forEach((serviceType, index) => {
        chartData[serviceType] = {
          label: serviceType,
          data: new Array(dateLabels.length).fill(0),
          backgroundColor: colors[index % colors.length],
          borderColor: colors[index % colors.length].replace('0.8', '1'),
          borderWidth: 1
        };
      });

      // Count bookings for each service type and date
      filteredBookings.forEach(booking => {
        const dateStr = new Date(booking.start_time).toISOString().split('T')[0];
        const dateIndex = dateLabels.indexOf(dateStr);
        
        if (dateIndex !== -1) {
          const service = services.find(s => s.id === booking.service_id);
          const serviceName = service?.name || 'Unknown Service';
          
          if (chartData[serviceName]) {
            chartData[serviceName].data[dateIndex]++;
          }
        }
      });

      setWeeklyBookings({
        labels: dateLabels.map(date => {
          const [year, month, day] = date.split('-');
          const weekday = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
          return `${weekday} ${month}/${day}`;
        }),
        datasets: Object.values(chartData)
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error(t('reports.failedToGetStatistics'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerBookings = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Get date range
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Get booking data with related services, staff, and customers
      const [bookings, services, customers] = await Promise.all([
        dbService.fetchData(
          TABLES.BOOKINGS,
          'start_time',
          false,
          {
            start_time: {
              gte: start.toISOString(),
              lte: end.toISOString()
            }
          }
        ),
        dbService.fetchData(TABLES.SERVICES),
        dbService.fetchData(TABLES.USERS, 'full_name', false, { role: 'customer' })
      ]);

      // Filter bookings by selected staff if not 'all'
      let filteredBookings = bookings;
      if (selectedStaffId !== 'all') {
        filteredBookings = bookings.filter(booking => booking.provider_id === selectedStaffId);
      }

      // Group bookings by customer and service type
      const customerServiceCounts = {};
      const serviceTypes = new Set();

      filteredBookings.forEach(booking => {
        const customer = customers.find(c => c.id === booking.customer_id);
        const service = services.find(s => s.id === booking.service_id);
        
        const customerName = customer?.full_name || 'Unknown Customer';
        const serviceName = service?.name || 'Unknown Service';
        
        serviceTypes.add(serviceName);
        
        if (!customerServiceCounts[customerName]) {
          customerServiceCounts[customerName] = {};
        }
        
        if (!customerServiceCounts[customerName][serviceName]) {
          customerServiceCounts[customerName][serviceName] = 0;
        }
        
        customerServiceCounts[customerName][serviceName]++;
      });

      // Sort customers by total booking count (descending)
      const sortedCustomers = Object.keys(customerServiceCounts)
        .map(customerName => ({
          name: customerName,
          totalBookings: Object.values(customerServiceCounts[customerName]).reduce((sum, count) => sum + count, 0)
        }))
        .sort((a, b) => b.totalBookings - a.totalBookings)
        .slice(0, 15) // Limit to top 15 customers for readability
        .map(customer => customer.name);

      const serviceTypesList = Array.from(serviceTypes).sort();
      
      // Generate colors for each service type
      const colors = [
        'rgba(59, 130, 246, 0.8)',   // Blue
        'rgba(34, 197, 94, 0.8)',    // Green
        'rgba(239, 68, 68, 0.8)',    // Red
        'rgba(245, 158, 11, 0.8)',   // Yellow
        'rgba(139, 92, 246, 0.8)',   // Purple
        'rgba(236, 72, 153, 0.8)',   // Pink
        'rgba(20, 184, 166, 0.8)',   // Teal
        'rgba(251, 146, 60, 0.8)',   // Orange
        'rgba(156, 163, 175, 0.8)',  // Gray
        'rgba(99, 102, 241, 0.8)'    // Indigo
      ];

      // Create datasets for each service type
      const datasets = serviceTypesList.map((serviceType, index) => ({
        label: serviceType,
        data: sortedCustomers.map(customerName => 
          customerServiceCounts[customerName]?.[serviceType] || 0
        ),
        backgroundColor: colors[index % colors.length],
        borderColor: colors[index % colors.length].replace('0.8', '1'),
        borderWidth: 1
      }));

      setCustomerBookings({
        labels: sortedCustomers,
        datasets: datasets
      });
    } catch (error) {
      console.error('Error fetching customer bookings:', error);
      toast.error('Failed to fetch customer booking statistics');
    }
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 11
          }
        }
      },
      title: {
        display: true,
        text: t('reports.bookingStatistics'),
        font: {
          size: 16
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value} booking${value !== 1 ? 's' : ''}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveReportTab('bookings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeReportTab === 'bookings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('reports.bookingStatistics')}
          </button>
          <button
            onClick={() => setActiveReportTab('customers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeReportTab === 'customers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('reports.customerBookings')}
          </button>
          <button
            onClick={() => setActiveReportTab('connectedUsers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeReportTab === 'connectedUsers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('reports.connectedUsers')}
          </button>
        </nav>
      </div>

      {/* Report Content */}
      {activeReportTab === 'bookings' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="mb-4 flex items-center space-x-4 flex-wrap">
            <div className="flex items-center">
              <label htmlFor="startDate" className="mr-2 text-gray-700">{t('reports.startDate')}</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div className="flex items-center">
              <label htmlFor="endDate" className="mr-2 text-gray-700">{t('reports.endDate')}</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div className="flex items-center">
              <label htmlFor="staffFilter" className="mr-2 text-gray-700">Staff Filter:</label>
              <select
                id="staffFilter"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1"
              >
                {staffOptions.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Bar
            data={{
              labels: weeklyBookings.labels,
              datasets: weeklyBookings.datasets || []
            }}
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                title: {
                  ...chartOptions.plugins.title,
                  text: `Service Booking Statistics ${startDate} to ${endDate}${selectedStaffId !== 'all' ? ` - ${staffOptions.find(s => s.id === selectedStaffId)?.name || 'Selected Staff'}` : ''}`
                }
              }
            }}
          />
        </div>
      )}

      {activeReportTab === 'customers' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="mb-4 flex items-center space-x-4 flex-wrap">
            <div className="flex items-center">
              <label htmlFor="startDate" className="mr-2 text-gray-700">{t('reports.startDate')}</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div className="flex items-center">
              <label htmlFor="endDate" className="mr-2 text-gray-700">{t('reports.endDate')}</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div className="flex items-center">
              <label htmlFor="staffFilter" className="mr-2 text-gray-700">Staff Filter:</label>
              <select
                id="staffFilter"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1"
              >
                {staffOptions.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {customerBookings.labels && customerBookings.labels.length > 0 ? (
            <div style={{ height: '400px', width: '100%' }}>
              <Bar
                data={customerBookings}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    title: {
                      display: true,
                      text: `Customer Booking Statistics ${startDate} to ${endDate}${selectedStaffId !== 'all' ? ` - ${staffOptions.find(s => s.id === selectedStaffId)?.name || 'Selected Staff'}` : ''}`
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                      callbacks: {
                        footer: function(tooltipItems) {
                          let total = 0;
                          tooltipItems.forEach(function(tooltipItem) {
                            total += tooltipItem.parsed.y;
                          });
                          return 'Total: ' + total;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      stacked: true,
                      ticks: {
                        maxRotation: 45,
                        minRotation: 0
                      }
                    },
                    y: {
                      stacked: true,
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  },
                  interaction: {
                    mode: 'index',
                    intersect: false
                  }
                }}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No customer booking data available for the selected period</p>
            </div>
          )}
        </div>
      )}

      {activeReportTab === 'connectedUsers' && (
        <ConnectedUsersReport 
          currentUserId={currentUserId}
          userRole={userRole}
          userName={userName}
        />
      )}
    </div>
  );
}