import React, { useState } from 'react';
import './Tabs.css'; // Optional: for custom styles

const tabs = [
  { id: 'data', label: 'Data Entry', content: 'Welcome to Data Entry' },
  { id: 'finance', label: 'Finance', content: 'Finance details here' },
  { id: 'departments', label: 'Departments', content: 'Department overview' },
  { id: 'feedback', label: 'Feedback', content: 'Feedback form' },
  { id: 'diagnostics', label: 'Diagnostics', content: 'Diagnostics tools' },
  { id: 'admissions', label: 'Admissions', content: 'Admissions page' },
  { id: 'pharmacy', label: 'Pharmacy', content: 'Pharmacy inventory' },
  { id: 'maintenance', label: 'Maintenance', content: 'Maintenance logs' },
];

export default function Tabs() {
  const [activeTab, setActiveTab] = useState('data');

  return (
    <div>
      <div className="tab-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {tabs.map(tab => (
          activeTab === tab.id && <div key={tab.id}>{tab.content}</div>
        ))}
      </div>
    </div>
  );
}