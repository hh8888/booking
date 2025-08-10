import { useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

const useCustomerRealtime = ({ customerData, refreshBookings, setCustomerData }) => {
  // Real-time subscription for customer bookings
  useEffect(() => {
    if (!customerData?.id) return;

    console.log('📡 Setting up real-time subscription for customer bookings:', customerData.id);
    
    const customerBookingsChannel = supabase
      .channel(`customer-bookings-${customerData.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${customerData.id}`
        },
        async (payload) => {
          console.log('📡 Real-time customer booking change:', payload);
          
          try {
            await refreshBookings();
            
            // Show appropriate toast message
            if (payload.eventType === 'INSERT') {
              toast.success('Your new booking has been created!');
            } else if (payload.eventType === 'UPDATE') {
              toast.info('Your booking has been updated');
            } else if (payload.eventType === 'DELETE') {
              toast.info('Your booking has been cancelled');
            }
          } catch (error) {
            console.error('Error refreshing customer bookings after real-time update:', error);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 Cleaning up customer bookings real-time subscription');
      supabase.removeChannel(customerBookingsChannel);
    };
  }, [customerData?.id, refreshBookings]);

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
              toast.info('Your profile has been updated');
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
  }, [customerData?.id, setCustomerData]);
};

export default useCustomerRealtime;