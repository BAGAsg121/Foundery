import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// MSW mocks disabled — requests now go to the real Express backend
// To re-enable mocks for frontend-only dev, uncomment the block below:
// if (import.meta.env.DEV) {
//   const { worker } = await import('./mocks/browser');
//   await worker.start();
// }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);