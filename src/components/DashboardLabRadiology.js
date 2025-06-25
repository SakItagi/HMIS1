import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import axios from 'axios';

const DashboardLabRadiology = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('/api/hmis')
      .then(res => setData(res.data))
      .catch(err => console.error('Error fetching diagnostics data:', err));
  }, []);

  const formatted = data.map(row => ({
    month: row.month,
    expectedLab: +row.expectedLabTests || 0,
    actualLab: +row.actualLabTests || 0,
    expectedRadiology: +row.expectedRadiologyTests || 0,
    actualRadiology: +row.actualRadiologyTests || 0,
  }));

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-blue-900">🧪 Diagnostic Test Counts: Actual vs Expected</h2>

      {/* Combined Chart */}
      <div className="mb-12 bg-white p-6 rounded-xl shadow border">
        <h3 className="text-xl font-semibold mb-4">Monthly Comparison of Expected vs Actual Lab and Radiology Tests</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={formatted} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="expectedLab" fill="#C0392B" name="Expected Lab Test Count">
              <LabelList dataKey="expectedLab" position="top" />
            </Bar>
            <Bar dataKey="actualLab" fill="#9B59B6" name="Actual Lab Test Done">
              <LabelList dataKey="actualLab" position="top" />
            </Bar>
            <Bar dataKey="expectedRadiology" fill="#FAD7A0" name="Expected Radiology Test Count">
              <LabelList dataKey="expectedRadiology" position="top" />
            </Bar>
            <Bar dataKey="actualRadiology" fill="#A04000" name="Actual Radiology Test">
              <LabelList dataKey="actualRadiology" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Table */}
      <div className="mb-12 bg-white p-6 rounded-xl shadow border overflow-auto">
        <h3 className="text-lg font-semibold mb-4">📋 Monthly Summary Table</h3>
        <table className="min-w-full text-sm border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left">Metric</th>
              {formatted.map((row, idx) => (
                <th key={idx} className="border border-gray-300 px-4 py-2 text-left">{row.month}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {['expectedLab', 'actualLab', 'expectedRadiology', 'actualRadiology'].map((key, i) => (
              <tr key={i}>
                <td className="border border-gray-300 px-4 py-2 font-medium">
                  {key.includes('Lab') ? (key.includes('expected') ? 'Expected Lab Test Count' : 'Actual Lab Test Done')
                  : (key.includes('expected') ? 'Expected Radiology Test Count' : 'Actual Radiology Test')}
                </td>
                {formatted.map((row, idx) => (
                  <td key={idx} className="border border-gray-300 px-4 py-2">{row[key].toLocaleString()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insights */}
      <div className="text-sm text-center max-w-4xl mx-auto px-4 py-6 bg-white rounded-xl shadow border">
        <p className="font-semibold text-lg mb-2">📌 Insights:</p>
        <p className="text-gray-700 leading-relaxed">
          There is a <strong>close alignment</strong> between <strong>expected and actual test counts</strong>,
          with <strong>lab tests</strong> peaking in <strong>August</strong> and gradually declining through <strong>October</strong>,
          while <strong>radiology tests</strong> remained <strong>consistently stable</strong> throughout the months.
        </p>
      </div>
    </div>
  );
};

export default DashboardLabRadiology;
