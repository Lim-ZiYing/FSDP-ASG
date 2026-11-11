// Shared styles first, so each page's own CSS file can override them
import './index.css';
import './auth.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './auth.jsx';
import { CartProvider } from './cart.jsx';
import { CentreProvider } from './centre.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CentreProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </CentreProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);