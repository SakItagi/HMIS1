import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const PharmacyDashboard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/hmis')
      .then(res => {
        const parsed = res.data.map(row => ({
          month: row.month || '',
          expectedIssued: parseInt(row['ExpectedIssued']) || 0,
          actualIssued: parseInt(row['ActualIssued']) || 0,
          expectedExpired: parseInt(row['ExpectedExpired']) || 0,
          actualExpired: parseInt(row['ActualExpired']) || 0,
        }));
        setData(parsed);
      })
      .catch(err => console.error("Failed to fetch pharmacy data:", err));
  }, []);

  return (
    <div className="w-full px-4 overflow-x-auto">
      <h2 className="text-2xl font-bold mb-6 text-indigo-800 text-center">💊 Pharmacy Dashboard</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" angle={-30} textAnchor="end" interval={0} height={60} tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="expectedIssued" fill="#5A67D8" name="Expected Issued" />
          <Bar dataKey="actualIssued" fill="#68D391" name="Actual Issued" />
          <Bar dataKey="expectedExpired" fill="#ECC94B" name="Expected Expired" />
          <Bar dataKey="actualExpired" fill="#F56565" name="Actual Expired" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">📋 Pharmacy Summary Table</h3>
        <table className="w-full text-sm text-left text-gray-700 border">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-2">Month</th>
              <th className="p-2">Expected Issued</th>
              <th className="p-2">Actual Issued</th>
              <th className="p-2">Expected Expired</th>
              <th className="p-2">Actual Expired</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="p-2 min-w-[120px] font-medium text-gray-800">{row.month}</td>
                <td className="p-2">{row.expectedIssued}</td>
                <td className="p-2">{row.actualIssued}</td>
                <td className="p-2">{row.expectedExpired}</td>
                <td className="p-2">{row.actualExpired}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PharmacyDashboard;
