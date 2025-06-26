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
        setResetMessage(data.error || 'Error sending reset email');
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
              <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
                <form
                  onSubmit={handleLogin}
                  className="bg-white p-6 rounded shadow-md w-full max-w-sm"
                >
                  <h2 className="text-lg font-bold mb-4">
                    {patientType === 'new' ? 'Register' : 'Login'}
                  </h2>
                  <input
                    type="text"
                    placeholder="Username"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    className="w-full mb-2 p-2 border rounded"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="w-full mb-2 p-2 border rounded"
                  />
                  {patientType === 'new' && (
                    <>
                      <input
                        type="password"
                        placeholder="Confirm Password"
                        value={credentials.confirmPassword}
                        onChange={(e) => setCredentials({ ...credentials, confirmPassword: e.target.value })}
                        className="w-full mb-2 p-2 border rounded"
                      />
                      <input
                        type="text"
                        placeholder="Role"
                        value={credentials.role}
                        onChange={(e) => setCredentials({ ...credentials, role: e.target.value })}
                        className="w-full mb-2 p-2 border rounded"
                      />
                    </>
                  )}
                  {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                  <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
                    {patientType === 'new' ? 'Register' : 'Login'}
                  </button>
                  <p className="text-sm mt-2">
                    {patientType === 'new' ? (
                      <span>
                        Already have an account?{' '}
                        <button type="button" onClick={() => setPatientType('existing')} className="text-blue-600 underline">
                          Login
                        </button>
                      </span>
                    ) : (
                      <>
                        Don’t have an account?{' '}
                        <button type="button" onClick={() => setPatientType('new')} className="text-blue-600 underline">
                          Register
                        </button>
                        <br />
                        <button
                          type="button"
                          onClick={() => setShowResetForm(true)}
                          className="text-sm text-blue-600 underline mt-2"
                        >
                          Forgot Password?
                        </button>
                      </>
                    )}
                  </p>
                </form>

                {showResetForm && (
                  <form
                    onSubmit={handlePasswordReset}
                    className="bg-white p-4 mt-6 rounded shadow-md w-full max-w-sm"
                  >
                    <h3 className="font-semibold mb-2">Reset Password</h3>
                    <label className="block text-sm font-medium mb-1">Username</label>
                    <input
                      type="text"
                      placeholder="Enter Username"
                      value={resetUsername}
                      onChange={(e) => setResetUsername(e.target.value)}
                      className="w-full mb-2 p-2 border rounded"
                    />
                    <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">
                      Send Reset Link
                    </button>
                    {resetMessage && <p className="text-sm mt-2">{resetMessage}</p>}
                  </form>
                )}
              </div>
            ) : (
              <div className="flex">
                <div className="w-64 bg-gray-800 text-white min-h-screen">
                  <HMISForm
                    setActivePage={setActivePage}
                    toggleSubmenu={toggleSubmenu}
                    openSubmenus={openSubmenus}
                    setIsLoggedIn={setIsLoggedIn}
                  />
                </div>
                <div className="flex-1 p-6 bg-gray-50">{renderContent()}</div>
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
