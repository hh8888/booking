import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
// Remove or comment out the service worker import
// import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <App />
);

// Remove all service worker registration code
// serviceWorkerRegistration.register({
//   onUpdate: (registration) => {
//     if (window.confirm('New version available! Click OK to update.')) {
//       if (registration && registration.waiting) {
//         registration.waiting.postMessage({ type: 'SKIP_WAITING' });
//         window.location.reload();
//       }
//     }
//   },
//   onSuccess: (registration) => {
//     console.log('SW registered: ', registration);
//   }
// });

// serviceWorkerRegistration.unregister();

reportWebVitals();

// Remove duplicate reportWebVitals call
// reportWebVitals();
