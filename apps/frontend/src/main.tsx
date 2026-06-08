import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Restore the saved theme; first-time visitors meet the reactor (dark) console.
const saved = localStorage.getItem('zearch-theme');
const theme = saved === 'light' || saved === 'dark' ? saved : 'dark';
document.documentElement.setAttribute('data-theme', theme);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
