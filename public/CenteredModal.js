import React from 'react';

const CenteredModal = ({ message, onClose, type = 'info' }) => {
  // Define text color based on the type
  const textColor = {
    success: 'text-green-700',
    error: 'text-red-700',
    info: 'text-indigo-700',
  }[type] || 'text-indigo-700';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-xl shadow-lg px-6 py-4 max-w-sm w-full"
        style={{
          border: '2px solid black', // Maintain visible black border
          boxSizing: 'border-box',
          borderRadius: '12px',
        }}
      >
        <p className={`${textColor} font-medium mb-4 text-center`}>{message}</p>

        {/* Centering the button with flex */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onClose}
            className="bg-indigo-700 text-white text-xs font-semibold rounded hover:bg-indigo-800 transition-all duration-200"
            style={{
              fontSize: '12px',
              width: '60px',
              height: '30px',
              padding: '4px 12px',
              minWidth: '50px',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CenteredModal;