import { useReducer, useCallback } from 'react';
import { toast } from 'react-toastify';
import BookingService from '../services/BookingService';
import DatabaseService from '../services/DatabaseService';
import { TABLES } from '../constants';

// Define action types
const ACTIONS = {
  SET_BOOKINGS: 'SET_BOOKINGS',
  SET_SERVICES: 'SET_SERVICES',
  SET_CUSTOMERS: 'SET_CUSTOMERS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_SELECTED_ROWS: 'SET_SELECTED_ROWS',
  SET_EDIT_ITEM: 'SET_EDIT_ITEM',
  SET_IS_CREATING: 'SET_IS_CREATING',
  SET_STATUS_FILTER: 'SET_STATUS_FILTER',
  SET_TIME_FILTER: 'SET_TIME_FILTER',
  SET_BOOKING_TIME_INTERVAL: 'SET_BOOKING_TIME_INTERVAL',
  SET_SHOW_RECURRING_OPTIONS: 'SET_SHOW_RECURRING_OPTIONS',
  SET_HOUR_OPTIONS: 'SET_HOUR_OPTIONS',
  SET_MINUTE_OPTIONS: 'SET_MINUTE_OPTIONS',
  SET_SELECTED_TIME: 'SET_SELECTED_TIME'
};

// Initial state
const initialState = {
  bookings: [],
  services: [],
  customers: [],
  selectedRows: [],
  loading: true,
  error: null,
  editItem: null,
  isCreating: false,
  statusFilter: 'all',
  timeFilter: 'today+',
  bookingTimeInterval: 30,
  showRecurringOptions: false,
  hourOptions: [],
  minuteOptions: [],
  selectedTime: ''
};

// Reducer function
function bookingsReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_BOOKINGS:
      return { ...state, bookings: action.payload };
    case ACTIONS.SET_SERVICES:
      return { ...state, services: action.payload };
    case ACTIONS.SET_CUSTOMERS:
      return { ...state, customers: action.payload };
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    case ACTIONS.SET_SELECTED_ROWS:
      return { ...state, selectedRows: action.payload };
    case ACTIONS.SET_EDIT_ITEM:
      return { ...state, editItem: action.payload };
    case ACTIONS.SET_IS_CREATING:
      return { ...state, isCreating: action.payload };
    case ACTIONS.SET_STATUS_FILTER:
      return { ...state, statusFilter: action.payload };
    case ACTIONS.SET_TIME_FILTER:
      return { ...state, timeFilter: action.payload };
    case ACTIONS.SET_BOOKING_TIME_INTERVAL:
      return { ...state, bookingTimeInterval: action.payload };
    case ACTIONS.SET_SHOW_RECURRING_OPTIONS:
      return { ...state, showRecurringOptions: action.payload };
    case ACTIONS.SET_HOUR_OPTIONS:
      return { ...state, hourOptions: action.payload };
    case ACTIONS.SET_MINUTE_OPTIONS:
      return { ...state, minuteOptions: action.payload };
    case ACTIONS.SET_SELECTED_TIME:
      return { ...state, selectedTime: action.payload };
    default:
      return state;
  }
}

export function useBookingsState(users, userId) {
  const [state, dispatch] = useReducer(bookingsReducer, initialState);

  const fetchBookingTimeInterval = useCallback(async () => {
    try {
      const bookingService = BookingService.getInstance();
      const interval = await bookingService.getBookingTimeInterval();
      dispatch({ type: ACTIONS.SET_BOOKING_TIME_INTERVAL, payload: interval });
    } catch (error) {
      console.error('Error fetching booking time interval:', error);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const data = await dbService.fetchData(TABLES.SERVICES);
      dispatch({ type: ACTIONS.SET_SERVICES, payload: data });
      return data;
    } catch (error) {
      console.error('Error fetching services:', error);
      return [];
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      if (users && users.length > 0) {
        const customerData = users
          .filter(user => user.role === 'customer')
          .map(user => ({ id: user.id, full_name: user.full_name }));
        dispatch({ type: ACTIONS.SET_CUSTOMERS, payload: customerData });
        return customerData;
      } else {
        const dbService = DatabaseService.getInstance();
        const data = await dbService.fetchSpecificColumns(TABLES.USERS, 'id, full_name', { role: 'customer' });
        dispatch({ type: ACTIONS.SET_CUSTOMERS, payload: data });
        return data;
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  }, [users]);

  const fetchBookings = useCallback(async (serviceData, customerData) => {
    try {
      const bookingService = BookingService.getInstance();
      const bookingsWithDetails = await bookingService.fetchBookings(
        serviceData || state.services,
        customerData || state.customers
      );
      let filteredBookings = bookingService.filterBookingsByTime(bookingsWithDetails, state.timeFilter);
      
      if (userId) {
        filteredBookings = filteredBookings.filter(booking => booking.customer_id === userId);
      }
      
      dispatch({ type: ACTIONS.SET_BOOKINGS, payload: filteredBookings });
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  }, [state.services, state.customers, state.timeFilter, userId]);

  const handleSave = useCallback(async (itemData) => {
    try {
      const bookingService = BookingService.getInstance();
      
      if (state.isCreating) {
        const newBooking = await bookingService.createBooking(itemData);
        dispatch({ type: ACTIONS.SET_BOOKINGS, payload: [newBooking, ...state.bookings] });
        dispatch({ type: ACTIONS.SET_IS_CREATING, payload: false });
        dispatch({ type: ACTIONS.SET_EDIT_ITEM, payload: null });
        toast.success('Booking created successfully');
      } else {
        await bookingService.updateBooking(itemData);
        dispatch({
          type: ACTIONS.SET_BOOKINGS,
          payload: state.bookings.map((item) =>
            item.id === itemData.id ? { ...item, ...itemData } : item
          )
        });
        dispatch({ type: ACTIONS.SET_EDIT_ITEM, payload: null });
        toast.success('Booking updated successfully');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Error: ${error.message}`);
    }
  }, [state.bookings, state.isCreating]);

  const handleDeleteSelected = useCallback(async () => {
    try {
      const bookingService = BookingService.getInstance();
      await bookingService.deleteBookings(state.selectedRows);
      dispatch({
        type: ACTIONS.SET_BOOKINGS,
        payload: state.bookings.filter((item) => !state.selectedRows.includes(item.id))
      });
      dispatch({ type: ACTIONS.SET_SELECTED_ROWS, payload: [] });
      toast.success('Selected bookings deleted successfully');
    } catch (error) {
      toast.error(`Error deleting bookings: ${error.message}`);
    }
  }, [state.bookings, state.selectedRows]);

  return {
    state,
    dispatch,
    ACTIONS,
    fetchBookingTimeInterval,
    fetchServices,
    fetchCustomers,
    fetchBookings,
    handleSave,
    handleDeleteSelected
  };
}