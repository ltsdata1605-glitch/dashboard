
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import html2canvas from 'html2canvas';

// Expose html2canvas globally so all export functions can use (window as any).html2canvas
(window as any).html2canvas = html2canvas;

// The global polyfill was removed as it caused "Cannot set property fetch" errors.
// Modern libraries should use globalThis or handle the absence of global.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

