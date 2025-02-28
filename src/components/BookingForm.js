import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function BookingForm({ role, fetchBookings }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (role === 'public') return;

    const { data, error } = await supabase
      .from('bookings')
      .insert([{ name, email, date, time }]);

    if (!error) {
      setName('');
      setEmail('');
      setDate('');
      setTime('');
      fetchBookings();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />
      <button type="submit">Book</button>
    </form>
  );
}

export default BookingForm;