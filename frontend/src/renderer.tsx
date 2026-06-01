

import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
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
