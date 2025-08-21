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
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Start date
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }); // End date

  useEffect(() => {
    fetchWeeklyBookings();
  }, [startDate, endDate]); // Refetch data when date range changes

  const fetchWeeklyBookings = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Get date range
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Get booking data from database for specified date range
      const bookings = await dbService.fetchData(
        TABLES.BOOKINGS,
        'start_time',
        false,
        {
          start_time: {
            gte: start.toISOString(),
            lte: end.toISOString()
          }
        }
      );

      // Group and count bookings by date
      const bookingsByDate = {};
      const dateLabels = [];

      // Initialize data for date range
      let currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        bookingsByDate[dateStr] = 0;
        dateLabels.push(dateStr);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Count bookings for each day
      bookings.forEach(booking => {
        const dateStr = new Date(booking.start_time).toISOString().split('T')[0];
        if (Object.prototype.hasOwnProperty.call(bookingsByDate, dateStr)) {
          bookingsByDate[dateStr]++;
        }
      });

      setWeeklyBookings({
        labels: dateLabels.map(date => {
          const [year, month, day] = date.split('-');
          const weekday = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
          return `${weekday} ${month}/${day}`;
        }),
        data: dateLabels.map(date => bookingsByDate[date])
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error(t('reports.failedToGetStatistics'));
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: t('reports.bookingStatistics'),
        font: {
          size: 16
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
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
          <div className="mb-4 flex items-center space-x-4">
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
          </div>
          <Bar
            data={{
              labels: weeklyBookings.labels,
              datasets: [
                {
                  data: weeklyBookings.data,
                  backgroundColor: weeklyBookings.labels.map(dateStr => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const [weekday, monthDay] = dateStr.split(' ');
                    const [month, day] = monthDay.split('/');
                    const date = new Date(new Date().getFullYear(), parseInt(month) - 1, parseInt(day));
                    if (date.getTime() === today.getTime()) {
                      return 'rgba(34, 197, 94, 0.5)'; // Green for today
                    } else if (date < today) {
                      return 'rgba(156, 163, 175, 0.5)'; // Grey for past
                    } else {
                      return 'rgba(59, 130, 246, 0.5)'; // Blue for future
                    }
                  }),
                  borderColor: weeklyBookings.labels.map(dateStr => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const [weekday, monthDay] = dateStr.split(' ');
                    const [month, day] = monthDay.split('/');
                    const date = new Date(new Date().getFullYear(), parseInt(month) - 1, parseInt(day));
                    if (date.getTime() === today.getTime()) {
                      return 'rgb(34, 197, 94)'; // Green for today
                    } else if (date < today) {
                      return 'rgb(156, 163, 175)'; // Grey for past
                    } else {
                      return 'rgb(59, 130, 246)'; // Blue for future
                    }
                  }),
                  borderWidth: 1
                }
              ]
            }}
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                title: {
                  ...chartOptions.plugins.title,
                  text: `Booking Statistics ${startDate} to ${endDate}`
                }
              }
            }}
          />
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