import React, { useState } from 'react';
import RevenueDashboard from './dashboards/RevenueDashboard';
import DepartmentDashboard from './dashboards/DepartmentDashboard';
import DiagnosticsDashboard from './dashboards/DiagnosticsDashboard';
import WorkforceDashboard from './dashboards/WorkforceDashboard';
import PatientSatisfactionDashboard from './dashboards/PatientSatisfactionDashboard';
import PharmacyDashboard from './dashboards/PharmacyDashboard';
import DashboardAdmissions from './DashboardAdmissions';


const tabs = [
  { label: 'Revenue Overview', component: <RevenueDashboard /> },
  { label: 'Department Financials', component: <DepartmentDashboard /> },
  { label: 'Diagnostics', component: <DiagnosticsDashboard /> },
  { label: 'Workforce', component: <WorkforceDashboard /> },
  { label: 'Pharmacy', component: <PharmacyDashboard /> },
  { label: 'Patient Feedback', component: <PatientSatisfactionDashboard /> },
  {label:'Admission & Discharges',component:<DashboardAdmissions/>}
];

const DashboardTabs = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="p-6">
      <div className="flex flex-wrap mb-4 border-b">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`px-4 py-2 font-semibold rounded-t ${activeTab === index ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:text-blue-600'}`}
            onClick={() => setActiveTab(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="bg-white p-4 rounded shadow min-h-[400px]">
        {tabs[activeTab].component}
      </div>
    </div>
  );
};

export default DashboardTabs;
