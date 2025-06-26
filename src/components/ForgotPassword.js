import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordForm = () => {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username) {
      setError('Please enter your email');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Reset link sent to your email');
        setError('');
      } else {
        setError(data.error || 'Error sending reset link');
        setMessage('');
      }
    } catch (err) {
      setError('Server error');
      setMessage('');
    }
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/2 bg-blue-100 flex flex-col justify-center items-center p-10">
        <h2 className="text-2xl font-normal text-center mb-2 text-gray-800">
          Empowering Smarter Healthcare Decisions
        </h2>
        <p className="text-gray-600 text-center mb-6">One Platform for Stakeholders and Staff</p>
        <img src="/doctor2.jpg" alt="Doctor" className="w-full h-full object-cover rounded-2xl mb-22" />
      </div>

      <div className="w-1/2 bg-white flex flex-col justify-center items-center shadow-lg px-10">
        <div className="w-full max-w-md flex flex-col items-center">
          <form onSubmit={handleSubmit} className="w-full">
            <h2 className="text-l font-normal mb-6 text-gray-700 text-center">
              Reset Your Password
            </h2>

            {message && <p className="text-green-500 mb-4 text-center">{message}</p>}
            {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

            <div className="mb-6 text-left">
  <label className="block text-sm font-medium text-black">Username</label>
  <input
    type="email"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded outline-none text-black"
    placeholder="Enter your username (email)"
    required
  />
</div>

            <button type="submit" className="w-full bg-blue-700 text-white py-2 rounded-full hover:bg-blue-800 transition mb-4">
              Send Reset Link
            </button>

            <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-sm">
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;