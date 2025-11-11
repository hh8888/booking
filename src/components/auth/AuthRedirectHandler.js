import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');

    if (type === 'recovery') {
      navigate(`/reset-password?${location.search}`, { replace: true });
    } else {
      navigate(`/auth?${location.search}`, { replace: true });
    }
  }, [navigate, location.search]);

  return null;
};

export default AuthRedirectHandler;