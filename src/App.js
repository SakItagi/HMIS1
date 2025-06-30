import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HMISForm from './components/HMISForm';
import HMISDashboard from './components/HMISDashboard';
import DiagnosticsDashboard from './components/DiagnosticsDashboard';
import HRDashboard from './components/HRDashboard';
import PharmacyDashboard from './components/PharmacyDashboard';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import AdmissionsDashboard from './components/AdmissionDashboard';
import FeedbackDashboard from './components/FeedbackDashboard';
import DepartmentDashboard from './components/DepartmentDashboard';
import OverviewDashboard from './components/OverviewDashboard';
import ResetPasswordForm from './components/ResetPasswordForm';
import ReportGenerator from './components/ReportingDashboard';
import './index.css';

const App = () => {
  const [activePage, setActivePage] = useState('home');
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '', confirmPassword: '', role: '' });
  const [error, setError] = useState('');
  const [patientType, setPatientType] = useState('existing');
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const toggleSubmenu = (menu) => {
    setOpenSubmenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const renderContent = () => {
    switch (activePage) {
      case 'finance-overview': return <HMISDashboard chartType="overview" />;
      case 'finance-expected-vs-actual': return <HMISDashboard chartType="expected-vs-actual" />;
      case 'diagnostics-overview': return <DiagnosticsDashboard view="overview" />;
      case 'diagnostics-performance': return <DiagnosticsDashboard view="expected-vs-actual" />;
      case 'hr-overview': return <HRDashboard chartType="overview" />;
      case 'hr-analytics': return <HRDashboard chartType="expected-vs-actual" />;
      case 'pharmacy-overview': return <PharmacyDashboard view="overview" />;
      case 'pharmacy-inventory': return <PharmacyDashboard view="expected-vs-actual" />;
      case 'maintenance-overview': return <MaintenanceDashboard view="overview" />;
      case 'maintenance-requests': return <MaintenanceDashboard view="expected-vs-actual" />;
      case 'ipd-admissions': return <AdmissionsDashboard chartType="line" />;
      case 'ipd-expected-vs-actual': return <AdmissionsDashboard chartType="bar" />;
      case 'feedback-overview': return <FeedbackDashboard chartType="overview" />;
      case 'feedback-expected-vs-actual': return <FeedbackDashboard chartType="expected-vs-actual" />;
      case 'department-overview': return <DepartmentDashboard view="overview" />;
      case 'department-expected-vs-actual': return <DepartmentDashboard view="revenue" />;
      case 'department-volume-overview': return <DepartmentDashboard view="volumeOverview" />;
      case 'department-volume-expected-vs-actual': return <DepartmentDashboard view="volumeComparison" />;
      case 'department-profit-overview': return <DepartmentDashboard view="profitOverview" />;
      case 'department-profit-expected-vs-actual': return <DepartmentDashboard view="profitComparison" />;
      case 'overview': return <OverviewDashboard />;
      case 'reporting': return <ReportGenerator />;
      case 'home':
      default: return <HMISForm />;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { username, password, confirmPassword, role } = credentials;

    if (patientType === 'new') {
      if (!username || !role || !password || !confirmPassword) {
        setError('Please fill all fields');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      try {
        const response = await fetch('http://localhost:5000/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.toLowerCase(), password, role }),
        });
        const data = await response.json();
        if (data.error) {
          setError(data.error);
        } else {
          alert('You have been successfully registered');
          setPatientType('existing');
          setError('');
        }
      } catch (err) {
        setError('Server error during registration');
      }
    } else {
      try {
        const res = await fetch('http://localhost:5000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
        });
        const data = await res.json();
        if (data.message === 'Login successful') {
          setIsLoggedIn(true);
          setError('');
        } else {
          setError(data.error || 'Invalid username or password');
        }
      } catch (error) {
        setError('Server error during login');
      }
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetUsername) {
      setResetMessage('Please enter your username');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resetUsername }),
      });

      const data = await res.json();

      if (data.message) {
        setResetMessage(data.message);
      } else {
        setResetMessage(data.error || 'Error sending reset link');
      }
    } catch (error) {
      setResetMessage('Server error during password reset');
    }
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            !isLoggedIn ? (
              <div className="flex h-screen">
                <div className="w-1/2 bg-blue-100 flex flex-col justify-center items-center p-10">
                  <h2 className="text-2xl font-normal text-center mb-2 text-black">
                    Empowering Smarter Healthcare Decisions
                  </h2>
                  <p className="text-black text-center mb-6">One Platform for Stakeholders and Staff</p>
                  <img src="/doctor2.jpg" alt="Doctor" className="w-full h-full object-cover rounded-2xl mb-22" />
                </div>
                <div className="w-1/2 bg-white flex flex-col justify-center items-center shadow-lg px-10">
                  <div className="w-full max-w-md flex flex-col items-center">
                    {!showResetForm ? (
                      <form onSubmit={handleLogin} className="w-full">
                        <h1 className="text-lg font-normal mb-6 text-black text-center">
                          Make Informed HealthCare Decisions<br />Sign In
                        </h1>
                        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
                        <div className="mb-4 text-left">
                          <label className="block text-sm font-medium text-black text-left">Username</label>
                          <input type="text" value={credentials.username} onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded outline-none text-black text-left" placeholder="Enter username" required />
                        </div>
                        {patientType === 'new' && (
                          <div className="mb-4 text-left">
                            <label className="block text-sm font-medium text-black text-left">Role</label>
                            <select value={credentials.role} onChange={(e) => setCredentials({ ...credentials, role: e.target.value })} className="w-full px-12 py-2 border border-gray-300 rounded outline-none text-black bg-white text-left" required>
                              <option value="">Select role</option>
                              <option value="admin">Stakeholder</option>
                              <option value="doctor">Doctor</option>
                              <option value="staff">Staff</option>
                            </select>
                          </div>
                        )}
                        <div className="mb-6 text-left relative">
                          <label className="block text-sm font-medium text-black text-left">Password</label>
                          <input type="password" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded outline-none text-black text-left" placeholder="Enter password" required />
                          {patientType === 'existing' && (
                            <div className="absolute right-0 mt-1 text-sm text-blue-600 hover:underline cursor-pointer" onClick={() => setShowResetForm(true)}>Forgot Password</div>
                          )}
                        </div>
                        {patientType === 'new' && (
                          <div className="mb-6 text-left">
                            <label className="block text-sm font-medium text-black text-left">Confirm Password</label>
                            <input type="password" value={credentials.confirmPassword} onChange={(e) => setCredentials({ ...credentials, confirmPassword: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded outline-none text-black text-left" placeholder="Confirm password" required />
                          </div>
                        )}
                        <button type="submit" className="w-full bg-blue-700 text-white py-2 rounded-full hover:bg-blue-800 transition mb-6">
                          {patientType === 'new' ? 'Register' : 'Login'}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handlePasswordReset} className="w-full">
                        <h2 className="text-xl font-normal mb-6 text-black text-center">Reset Your Password</h2>
                        {resetMessage && <p className="text-center text-blue-600 mb-4">{resetMessage}</p>}
                        <div className="mb-4 text-left">
                          <label className="block text-sm font-medium text-black text-left">Username</label>
                          <input type="text" placeholder="Enter Username" value={resetUsername} onChange={(e) => setResetUsername(e.target.value)} className="w-full mb-2 p-2 border rounded" />
                        </div>
                        <button type="submit" className="w-full bg-blue-700 text-white py-2 rounded-md hover:bg-blue-800 transition mb-6">
                          Send Reset Link
                        </button>
                        <button type="button" onClick={() => { setShowResetForm(false); setResetMessage(''); }} className="text-white bg-blue-800 text-sm py-1 px-4 rounded-full hover:opacity-90 transition">
                          Back to Login
                        </button>
                      </form>
                    )}
                    {!showResetForm && (
                      <div className="flex justify-center mb-4 w-full">
                        <button onClick={() => setPatientType('new')} className="px-6 py-2 rounded-l-full border w-1/2 bg-blue-600 text-white">New User</button>
                        <button onClick={() => setPatientType('existing')} className="px-6 py-2 rounded-r-full border w-1/2 bg-blue-600 text-white">Existing User</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-white font-poppins">
                <aside className="w-60 bg-blue-900 text-white h-screen fixed left-0 top-0 overflow-y-auto font-futura flex flex-col">
                  <div className="mt-6 mb-4 px-4">
                    <h1 className="text-white text-lg font-bold tracking-wide">HMIS</h1>
                    <hr className="border-white mt-2" />
                  </div>
                  <div className="flex flex-col justify-start h-full px-4 pb-4">
                    <nav className="flex flex-col gap-2 flex-1 text-sm font-normal font-futura items-start">
                      <button onClick={() => setActivePage('home')} className="text-left hover:text-blue-300 mb-px">Home</button>
                      <div className="w-full mb-px">
                        <button onClick={() => toggleSubmenu('dashboard')} className="w-full text-left hover:text-blue-300 capitalize mb-px">Dashboard</button>
                        {openSubmenus['dashboard'] && (
                          <div className="pl-0 flex flex-col w-full text-left items-start space-y-1 text-blue-100 leading-relaxed">
                            <button onClick={() => setActivePage('overview')} className="text-left">Overview</button>
                            {[['finance', ['Finance Overview', 'finance-overview'], ['Expected vs Actual', 'finance-expected-vs-actual']],
                              ['diagnostics', ['Diagnostics Overview', 'diagnostics-overview'], ['Expected vs Actual', 'diagnostics-performance']],
                              ['HR', ['HR Overview', 'hr-overview'], ['Expected vs Actual', 'hr-analytics']],
                              ['pharmacy', ['Pharmacy Overview', 'pharmacy-overview'], ['Expected vs Actual', 'pharmacy-inventory']],
                              ['maintenance', ['Maintenance Overview', 'maintenance-overview'], ['Expected vs Actual', 'maintenance-requests']],
                              ['IPD', ['Admissions Overview', 'ipd-admissions'], ['Expected vs Actual', 'ipd-expected-vs-actual']],
                              ['feedback', ['Feedback Overview', 'feedback-overview'], ['Expected vs Actual', 'feedback-expected-vs-actual']],
                              ['department', ['Department Overview', 'department-overview'], ['Expected vs Actual', 'department-expected-vs-actual'], ['Patient Volume Overview', 'department-volume-overview'], ['Expected vs Actual Patient Volume', 'department-volume-expected-vs-actual'], ['Profit Overview', 'department-profit-overview'], ['Expected vs Actual Profitability', 'department-profit-expected-vs-actual']]
                            ].map(([key, ...buttons]) => (
                              <div key={key} className="w-full items-start">
                                <button onClick={() => toggleSubmenu(key)} className="w-full text-left hover:text-blue-300 capitalize leading-tight">{key}</button>
                                {openSubmenus[key] && (
                                  <div className="ml-2 flex flex-col space-y-1 items-start text-blue-100 leading-tight">
                                    {buttons.map(([label, id]) => (
                                      <button key={id} onClick={() => setActivePage(id)} className="text-left w-full px-2 hover:text-blue-300">{label}</button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => setActivePage('reporting')} className="text-left hover:text-blue-300 mb-px">Reporting</button>
                      <button onClick={() => setActivePage('forecasting')} className="text-left hover:text-blue-300 mb-px">Forecasting</button>
                      <button onClick={() => setActivePage('alerts')} className="text-left hover:text-blue-300 mb-px">Alerts</button>
                      <button onClick={() => setActivePage('settings')} className="text-left hover:text-blue-300 mb-px">Settings</button>
                      <button onClick={() => setIsLoggedIn(false)} className="mt-4 text-left text-white hover:text-white-500">Logout</button>
                      <div className="w-full flex flex-col items-center justify-center mt-4 space-y-1">
                        <img src="/ambulance3.png" alt="Ambulance Icon" className="w-14 h-14" />
                        <span className="text-sm text-white font-futura">Emergency </span>
                      </div>
                      <hr className="border-white mt-2 w-1/2 mx-auto" />
                      <div className="w-full flex flex-col items-center justify-center mt-4 space-y-1">
                        <img src="/Medical_files.png" alt="Services" className="w-16 h-16" />
                        <span className="text-sm text-white font-futura">Reports </span>
                      </div>
                      <hr className="border-white mt-2 w-1/2 mx-auto" />
                      <div className="w-full flex flex-col items-center justify-center mt-4 space-y-1">
                        <img src="/stethoscope1.png" alt="Services" className="w-16 h-16" />
                        <span className="text-sm text-white font-futura">Services</span>
                      </div>
                    </nav>
                  </div>
                </aside>
                <main className="flex-grow ml-60 pt-4 pb-32 px-4 overflow-y-auto h-screen">
                  {renderContent()}
                </main>
                <footer className="w-full bg-blue-600 text-white text-sm px-6 py-3 fixed bottom-0 left-0 ml-60 flex justify-center items-center z-10 font-futura">
                  <div className="flex gap-4 text-center">
                    <span>Email: info@hmis.com</span>
                    <span>Phone: +91 123 456 7890</span>
                    <span>Address: 5th Main Street</span>
                  </div>
                </footer>
              </div>
            )
          }
        />
        <Route path="/reset-password/:token" element={<ResetPasswordForm />} />
      </Routes>
    </Router>
  );
};

export default App;