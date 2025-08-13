import React from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ToastMessage = () => {
  return <ToastContainer />;
};

// Remove this duplicate import line
// import { toast } from 'react-toastify';

// 统一的toast配置
const defaultConfig = {
  position: "bottom-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

// 导出toast方法
export const showToast = {
  success: (message) => toast.success(message, defaultConfig),
  error: (message) => toast.error(message, defaultConfig),
  info: (message) => toast.info(message, defaultConfig),
  warning: (message) => toast.warning(message, defaultConfig)
};

// Remove the ToastMessage component export
// export default ToastMessage;