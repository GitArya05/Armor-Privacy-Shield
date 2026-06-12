// src/renderer.tsx
import React from 'react';
import { createRoot } from 'react-dom/client'; // Explicitly grab the root mount engine
import './index.css'; 
import PrivacyHubDashboard from './PrivacyHubDashboard';
const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <PrivacyHubDashboard />
    </React.StrictMode>
  );
}
