import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function Services() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data, error } = await supabase.from('services').select('*');
    if (error) console.error(error);
    else setServices(data);
  };

  return (
    <div>
      <h1>Services</h1>
      <ul>
        {services.map((service) => (
          <li key={service.id}>
            <h2>{service.name}</h2>
            <p>{service.description}</p>
            <p>Duration: {service.duration}</p>
            <p>Price: ${service.price}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}