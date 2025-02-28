import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import SignUp from './components/SignUp';
import BookingForm from './components/BookingForm';
import BookingList from './components/BookingList';
import AdminPanel from './components/AdminPanel';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('public');
  const [bookings, setBookings] = useState([]);
  const [showSignUp, setShowSignUp] = useState(false);

  useEffect(() => {
    checkUser();
    fetchBookings();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      fetchRole(user.id);
    }
  };

  const fetchRole = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (data) setRole(data.role);
  };

  const fetchBookings = async () => {
    const { data, error } = await supabase.from('bookings').select('*');
    if (data) setBookings(data);
  };

  return (
    <div className="app-container">
      <h1>Booking Management System</h1>
      {!user ? (
        <>
          {showSignUp ? (
            <SignUp setUser={setUser} setRole={setRole} />
          ) : (
            <Login setUser={setUser} setRole={setRole} />
          )}
          <button onClick={() => setShowSignUp(!showSignUp)}>
            {showSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
          </button>
        </>
      ) : (
        <>
          <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
          <BookingForm role={role} fetchBookings={fetchBookings} />
          <BookingList bookings={bookings} role={role} fetchBookings={fetchBookings} />
          {role === 'admin' && <AdminPanel />}
        </>
      )}
    </div>
  );
}

export default App;