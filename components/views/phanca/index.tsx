import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './PhanCaView';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Không tìm thấy phần tử root để gắn ứng dụng vào.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
