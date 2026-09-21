import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ArcWalletProvider } from './context/ArcWalletContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ArcWalletProvider>
      <App />
    </ArcWalletProvider>
  </React.StrictMode>
);
