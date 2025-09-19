import React, { useState, useEffect } from 'react';
import DatabaseService from '../../services/DatabaseService';
import LocationService from '../../services/LocationService';
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

// Shared color array for all charts (20 unique colors)
const CHART_COLORS = [
  'rgba(59, 130, 246, 0.8)',   // Blue
  'rgba(34, 197, 94, 0.8)',    // Green
  'rgba(239, 68, 68, 0.8)',    // Red
  'rgba(245, 158, 11, 0.8)',   // Yellow
  'rgba(139, 92, 246, 0.8)',   // Purple
  'rgba(236, 72, 153, 0.8)',   // Pink
  'rgba(20, 184, 166, 0.8)',   // Teal
  'rgba(251, 146, 60, 0.8)',   // Orange
  'rgba(156, 163, 175, 0.8)',  // Gray
  'rgba(99, 102, 241, 0.8)',   // Indigo
  'rgba(168, 85, 247, 0.8)',   // Violet
  'rgba(14, 165, 233, 0.8)',   // Sky Blue
  'rgba(34, 197, 94, 0.8)',    // Emerald
  'rgba(249, 115, 22, 0.8)',   // Orange Red
  'rgba(217, 70, 239, 0.8)',   // Fuchsia
  'rgba(6, 182, 212, 0.8)',    // Cyan
  'rgba(132, 204, 22, 0.8)',   // Lime
  'rgba(251, 191, 36, 0.8)',   // Amber
  'rgba(244, 63, 94, 0.8)',    // Rose
  'rgba(71, 85, 105, 0.8)'     // Slate
];

export default function ReportsTab() {
  const { t } = useLanguage();
  const { currentUserId, userRole, userName } = useDashboardUser();
  const [activeReportTab, setActiveReportTab] = useState('bookings');
  const [weeklyBookings, setWeeklyBookings] = useState([]);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState('all');
  const [staffOptions, setStaffOptions] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('all');
  const [locationOptions, setLocationOptions] = useState([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Start date
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }); // End date

  useEffect(() => {
    fetchWeeklyBookings();
    fetchCustomerBookings();
  }, [startDate, endDate, selectedStaffId, selectedLocationId]); // Refetch data when date range, staff, or location selection changes

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

      // Get location options
      const locationService = LocationService.getInstance();
      const dbService2 = DatabaseService.getInstance();
      await locationService.initializeLocations(dbService2);
      const locations = locationService.getLocations();
      
      setLocationOptions([
        { id: 'all', name: 'All Locations' },
        ...locations.map(loc => ({ id: loc.id, name: loc.name }))
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
        filteredBookings = filteredBookings.filter(booking => booking.provider_id === selectedStaffId);
      }

      // Filter bookings by selected location if not 'all'
      if (selectedLocationId !== 'all') {
        const locationIdInt = parseInt(selectedLocationId, 10);
        console.log('🔍 Location filtering debug:', {
          selectedLocationId,
          locationIdInt,
          totalBookings: filteredBookings.length,
          sampleBookingLocations: filteredBookings.slice(0, 5).map(b => ({ id: b.id, location: b.location, type: typeof b.location }))
        });
        filteredBookings = filteredBookings.filter(booking => booking.location === locationIdInt);
        console.log('🔍 After location filter:', filteredBookings.length, 'bookings remain');
      }

      // Get unique service types (booking types) - include all services in the system
      const serviceTypes = new Set(services.map(service => service.name));

      const serviceTypesList = Array.from(serviceTypes).sort();
      
      // Use shared color array

      // Initialize data structure for each service type and date
      const chartData = {};
      serviceTypesList.forEach((serviceType, index) => {
        chartData[serviceType] = {
          label: serviceType,
          data: new Array(dateLabels.length).fill(0),
          backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
          borderColor: CHART_COLORS[index % CHART_COLORS.length].replace('0.8', '1'),
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
        filteredBookings = filteredBookings.filter(booking => booking.provider_id === selectedStaffId);
      }

      // Filter bookings by selected location if not 'all'
      if (selectedLocationId !== 'all') {
        const locationIdInt = parseInt(selectedLocationId, 10);
        filteredBookings = filteredBookings.filter(booking => booking.location === locationIdInt);
      }

      // Group bookings by customer and service type
      const customerServiceCounts = {};
      // Include all services in the system, not just those with bookings
      const serviceTypes = new Set(services.map(service => service.name));

      filteredBookings.forEach(booking => {
        const customer = customers.find(c => c.id === booking.customer_id);
        const service = services.find(s => s.id === booking.service_id);
        
        const customerName = customer?.full_name || 'Unknown Customer';
        const serviceName = service?.name || 'Unknown Service';
        
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
        //.slice(0, 25) // Limit to top 25 customers for better visibility
        .map(customer => customer.name);

      const serviceTypesList = Array.from(serviceTypes).sort();
      
      // Use shared color array

      // Create datasets for each service type
      const datasets = serviceTypesList.map((serviceType, index) => ({
        label: serviceType,
        data: sortedCustomers.map(customerName => 
          customerServiceCounts[customerName]?.[serviceType] || 0
        ),
        backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
        borderColor: CHART_COLORS[index % CHART_COLORS.length].replace('0.8', '1'),
        borderWidth: 1
      }));

      // Calculate totals
      const totalBookingsCount = filteredBookings.length;
      const totalCustomersCount = Object.keys(customerServiceCounts).length;

      setCustomerBookings({
        labels: sortedCustomers,
        datasets: datasets
      });
      setTotalBookings(totalBookingsCount);
      setTotalCustomers(totalCustomersCount);
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
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="flex flex-col">
              <label htmlFor="startDate" className="mb-1 text-sm font-medium text-gray-700">{t('reports.startDate')}</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="endDate" className="mb-1 text-sm font-medium text-gray-700">{t('reports.endDate')}</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="staffFilter" className="mb-1 text-sm font-medium text-gray-700">Staff Filter:</label>
              <select
                id="staffFilter"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {staffOptions.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="locationFilter" className="mb-1 text-sm font-medium text-gray-700">Location Filter:</label>
              <select
                id="locationFilter"
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {locationOptions.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <div className="min-w-full" style={{ minHeight: '300px', height: '400px' }}>
              <Bar
                data={{
                  labels: weeklyBookings.labels,
                  datasets: weeklyBookings.datasets || []
                }}
                options={{
                  ...chartOptions,
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      ...chartOptions.plugins.legend,
                      labels: {
                        ...chartOptions.plugins.legend.labels,
                        boxWidth: 10,
                        padding: 8,
                        font: {
                          size: window.innerWidth < 768 ? 10 : 11
                        }
                      }
                    },
                    title: {
                      ...chartOptions.plugins.title,
                      font: {
                        size: window.innerWidth < 768 ? 14 : 16
                      },
                      text: `Service Booking Statistics ${startDate} to ${endDate}${selectedStaffId !== 'all' ? ` - ${staffOptions.find(s => s.id === selectedStaffId)?.name || 'Selected Staff'}` : ''}${selectedLocationId !== 'all' ? ` - ${locationOptions.find(l => l.id === selectedLocationId)?.name || 'Selected Location'}` : ''}`
                    }
                  },
                  scales: {
                    ...chartOptions.scales,
                    x: {
                      ...chartOptions.scales.x,
                      ticks: {
                        font: {
                          size: window.innerWidth < 768 ? 10 : 12
                        },
                        maxRotation: window.innerWidth < 768 ? 45 : 0,
                        minRotation: window.innerWidth < 768 ? 45 : 0
                      }
                    },
                    y: {
                      ...chartOptions.scales.y,
                      ticks: {
                        ...chartOptions.scales.y.ticks,
                        font: {
                          size: window.innerWidth < 768 ? 10 : 12
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activeReportTab === 'customers' && (
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="flex flex-col">
              <label htmlFor="startDate" className="mb-1 text-sm font-medium text-gray-700">{t('reports.startDate')}</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="endDate" className="mb-1 text-sm font-medium text-gray-700">{t('reports.endDate')}</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="staffFilter" className="mb-1 text-sm font-medium text-gray-700">Staff Filter:</label>
              <select
                id="staffFilter"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {staffOptions.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="locationFilter" className="mb-1 text-sm font-medium text-gray-700">Location Filter:</label>
              <select
                id="locationFilter"
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {locationOptions.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Summary Statistics */}
          <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{totalBookings}</div>
              <div className="text-xs sm:text-sm text-blue-800">Total Bookings</div>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{totalCustomers}</div>
              <div className="text-xs sm:text-sm text-green-800">Total Customers</div>
            </div>
          </div>

          {customerBookings.labels && customerBookings.labels.length > 0 ? (
            <div>
              <div className="mb-2 text-xs sm:text-sm text-gray-600">
                <span className="font-medium">Note:</span> Chart shows top 25 customers by booking count. Total count above includes all customers.
              </div>
              <div style={{ height: window.innerWidth < 768 ? '300px' : '400px', width: '100%' }}>
              <Bar
                data={customerBookings}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        font: {
                          size: window.innerWidth < 768 ? 10 : 12
                        },
                        padding: window.innerWidth < 768 ? 10 : 20
                      }
                    },
                    title: {
                      display: true,
                      text: `Customer Booking Statistics ${startDate} to ${endDate}${selectedStaffId !== 'all' ? ` - ${staffOptions.find(s => s.id === selectedStaffId)?.name || 'Selected Staff'}` : ''}${selectedLocationId !== 'all' ? ` - ${locationOptions.find(l => l.id === selectedLocationId)?.name || 'Selected Location'}` : ''}`,
                      font: {
                        size: window.innerWidth < 768 ? 12 : 16
                      },
                      padding: {
                        top: window.innerWidth < 768 ? 10 : 20,
                        bottom: window.innerWidth < 768 ? 15 : 30
                      }
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                      titleFont: {
                        size: window.innerWidth < 768 ? 11 : 13
                      },
                      bodyFont: {
                        size: window.innerWidth < 768 ? 10 : 12
                      },
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
                        font: {
                          size: window.innerWidth < 768 ? 9 : 11
                        },
                        maxRotation: window.innerWidth < 768 ? 45 : 0,
                        minRotation: window.innerWidth < 768 ? 45 : 0
                      }
                    },
                    y: {
                      stacked: true,
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                        font: {
                          size: window.innerWidth < 768 ? 9 : 11
                        }
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