import React from 'react';
import { supabase } from '../supabaseClient';

function BookingList({ bookings, role, fetchBookings }) {
  const handleDelete = async (id) => {
    if (role === 'public') return;
    await supabase.from('bookings').delete().eq('id', id);
    fetchBookings();
  };

  return (
    <ul>
      {bookings.map((booking) => (
        <li key={booking.id}>
          {booking.name} - {booking.email} - {booking.date} at {booking.time}
          {role !== 'public' && (
            <button onClick={() => handleDelete(booking.id)}>Delete</button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default BookingList;