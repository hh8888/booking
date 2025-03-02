import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabaseClient';

const stripePromise = loadStripe('your-stripe-publishable-key');

export default function Payment({ bookingId }) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    const stripe = await stripePromise;

    // Create a payment intent
    const { data, error } = await supabase
      .from('payments')
      .insert([{ booking_id: bookingId, amount: 100, payment_method: 'stripe' }])
      .single();

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Redirect to Stripe checkout
    const { error: stripeError } = await stripe.redirectToCheckout({
      sessionId: data.stripe_session_id,
    });

    if (stripeError) {
      console.error(stripeError);
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Payment</h1>
      <button onClick={handlePayment} disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </div>
  );
}