import React from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ToastMessage = () => {
  return <ToastContainer />;
};

// Remove this duplicate import line
// import { toast } from 'react-toastify';

// Unified toast configuration
const defaultConfig = {
  position: "bottom-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

// Export toast methods
export const showToast = {
  success: (message) => toast.success(message, defaultConfig),
  error: (message) => toast.error(message, defaultConfig),
  info: (message) => toast.info(message, defaultConfig),
  warning: (message) => toast.warning(message, defaultConfig)
};

// Remove the ToastMessage component export
// export default ToastMessage;