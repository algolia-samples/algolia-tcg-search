import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import App from './App';

// Capture ?scan=true before React or InstantSearch can touch the URL
if (new URLSearchParams(window.location.search).get('scan') === 'true') {
  sessionStorage.setItem('scan_enabled', 'true');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
