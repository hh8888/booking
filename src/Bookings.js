import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const { data, error } = await supabase.from('bookings').select('*');
    if (error) console.error(error);
    else setBookings(data);
  };

  return (
    <div>
      <h1>My Bookings</h1>
      <ul>
        {bookings.map((booking) => (
          <li key={booking.id}>
            <p>Service ID: {booking.service_id}</p>
            <p>Start Time: {new Date(booking.start_time).toLocaleString()}</p>
            <p>End Time: {new Date(booking.end_time).toLocaleString()}</p>
            <p>Status: {booking.status}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}