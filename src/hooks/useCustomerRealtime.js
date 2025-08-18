import { useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';
import { showUserUpdateToast, USER_FIELDS_CONFIG } from '../utils/realtimeToastUtils';
import { useLanguage } from '../contexts/LanguageContext';
import { useMultilingualToast } from '../utils/multilingualToastUtils';

const useCustomerRealtime = ({ customerData, refreshBookings, setCustomerData, bookings }) => {
  const { t } = useLanguage();
  const { handleBookingRealtimeToast, showSuccessToast } = useMultilingualToast(t);

  // Real-time subscription for customer bookings
  useEffect(() => {
    if (!customerData?.id) return;
  
    console.log('📡 Setting up real-time subscription for customer bookings:', customerData.id);
  
    const customerBookingsChannel = supabase
      .channel(`customer-bookings-${customerData.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'bookings'
        },
        async (payload) => {
          console.log('📡 Real-time customer booking change:', payload);
          
          const eventType = payload.eventType || payload.event;
          const bookingData = payload.new || payload.old;
          
          console.log('📡 Event details:', {
            eventType,
            bookingData,
            currentCustomerId: customerData.id,
            bookingCustomerId: bookingData?.customer_id,
            deletedBookingId: payload.old?.id
          });
          
          let isRelevantToCustomer = false;
          
          if (eventType === 'DELETE') {
            // For DELETE events, check if the deleted booking ID matches any of the customer's current bookings
            const deletedBookingId = payload.old?.id;
            const customerHasThisBooking = bookings?.some(booking => booking.id === deletedBookingId);
            
            console.log('🗑️ DELETE event - checking booking ID match:', {
              deletedBookingId,
              customerBookingIds: bookings?.map(b => b.id),
              customerHasThisBooking
            });
            
            isRelevantToCustomer = customerHasThisBooking;
          } else {
            // For INSERT/UPDATE events, check customer_id
            isRelevantToCustomer = payload.new?.customer_id === customerData.id;
          }
          
          if (isRelevantToCustomer) {
            console.log('📡 Event is relevant to current customer, processing...');
            
            try {
              await refreshBookings();
              
              if (eventType === 'DELETE') {
                console.log('🗑️ DELETE event detected for customer booking, showing toast');
              }
              
              // Use multilingual toast handler
              handleBookingRealtimeToast(payload, {
                isCustomerView: true,
                autoClose: 5000,
                includeLocation: true,
                includeNotes: true
              });
            } catch (error) {
              console.error('Error refreshing customer bookings after real-time update:', error);
            }
          } else {
            console.log('📡 Event not relevant to current customer, ignoring');
          }
        }
      )
      .subscribe();
  
    return () => {
      console.log('🧹 Cleaning up customer bookings real-time subscription');
      customerBookingsChannel.unsubscribe();
    };
  }, [customerData?.id, refreshBookings, bookings, handleBookingRealtimeToast]); // Add handleBookingRealtimeToast as dependency

  // Real-time subscription for customer user data
  useEffect(() => {
    if (!customerData?.id) return;
  
    console.log('📡 Setting up real-time subscription for customer user data:', customerData.id);
  
    const customerUserChannel = supabase
      .channel(`customer-user-${customerData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${customerData.id}`
        },
        async (payload) => {
          console.log('📡 Real-time customer user data change:', payload);
          
          try {
            if (payload.new) {
              console.log('👤 Updating customer data from real-time subscription:', payload.new);
              setCustomerData(payload.new);
              
              // Use multilingual success toast for profile updates
              showSuccessToast('profileUpdated', {}, {
                autoClose: 4000,
                closeOnClick: true,
                pauseOnHover: true
              });
            }
          } catch (error) {
            console.error('Error updating customer data after real-time update:', error);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 Cleaning up customer user data real-time subscription');
      supabase.removeChannel(customerUserChannel);
    };
  }, [customerData?.id, setCustomerData, showSuccessToast]);
};

export default useCustomerRealtime;