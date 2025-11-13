import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <App />
);

// By unregistering the service worker, we ensure that the browser fetches the latest version of the app,
// preventing potential issues with cached, outdated code that could cause infinite loops or other bugs.
serviceWorkerRegistration.unregister();

reportWebVitals();

// Remove duplicate reportWebVitals call
// reportWebVitals();
