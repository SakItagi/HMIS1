import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import axios from 'axios';

const RevenueDashboard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('/api/hmis/summary')
      .then(res => {
        setData(res.data);
      })
      .catch(err => console.error('Error fetching summary:', err));
  }, []);

  const formattedData = data.map(row => ({
    month: row.month,
    expectedRevenue: Number(row.expectedRevenue) || 0,
    actualRevenue: Number(row.actualRevenue) || 0,
  }));

  const months = formattedData.map(d => d.month);

  const metrics = [
    {
      key: 'expectedRevenue',
      label: 'Expected Revenue',
    },
    {
      key: 'actualRevenue',
      label: 'Actual Revenue',
    },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow border w-full max-w-6xl mx-auto text-center">
      <h2 className="text-xl font-bold text-gray-800 mb-6">💰 Revenue Comparison</h2>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={formattedData} margin={{ top: 30, right: 30, left: 20, bottom: 60 }}>
          <XAxis dataKey="month" angle={-30} textAnchor="end" height={60} />
          <YAxis tickFormatter={val => `₹${val.toLocaleString()}`} />
          <Tooltip formatter={val => `₹${val.toLocaleString()}`} />
          <Legend />
          <Bar dataKey="expectedRevenue" fill="#F5A623" name="Expected Revenue">
            <LabelList dataKey="expectedRevenue" position="top" fill="#000" fontSize={12} />
          </Bar>
          <Bar dataKey="actualRevenue" fill="#F56C42" name="Actual Revenue">
            <LabelList dataKey="actualRevenue" position="top" fill="#000" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Transposed Table */}
      <div className="mt-8 overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Revenue Summary Table</h3>
        <table className="table-auto border-collapse border border-gray-300 mx-auto text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Metric</th>
              {months.map((month, idx) => (
                <th key={idx} className="border p-2">{month}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border p-2 font-medium text-left">{metric.label}</td>
                {formattedData.map((row, i) => (
                  <td key={i} className="border p-2">
                    ₹{row[metric.key].toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RevenueDashboard;