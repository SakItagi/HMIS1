import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import axios from 'axios';

const DashboardWorkforce = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('/api/hmis')
      .then(res => {
        const formatted = res.data.map(row => ({
          month: row.month,
          joinees: +row.actualJoinees || 0,
          resigned: +row.actualResignations || 0
        }));
        setData(formatted);
      })
      .catch(err => console.error('Error fetching workforce data:', err));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-blue-800">👥 Employee Join and Exit Dashboard</h2>
      <p className="font-medium text-gray-700 mb-2">Monthly Workforce Summary</p>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="joinees" fill="#1E90FF" name="New Hires Count">
            <LabelList dataKey="joinees" position="top" />
          </Bar>
          <Bar dataKey="resigned" fill="#C2185B" name="Resigned Employee Count">
            <LabelList dataKey="resigned" position="top" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-2">📋 Monthly Workforce Table</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm text-center border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Metric</th>
                {data.map((row, i) => (
                  <th key={i} className="border px-4 py-2">{row.month}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Resigned Employee Count', key: 'resigned' },
                { label: 'New Joinee Count', key: 'joinees' }
              ].map((metric, i) => (
                <tr key={i}>
                  <td className="border px-4 py-2 font-medium">{metric.label}</td>
                  {data.map((row, j) => (
                    <td key={j} className="border px-4 py-2">{row[metric.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm mt-8">
        <p className="font-semibold mb-1">📌 Insights:</p>
        <p className="text-gray-700 leading-relaxed">
          <strong>May, June, July, and October</strong> saw more people joining, while
          <strong> September</strong> showed the <strong>highest exits</strong> with <strong>no new hires</strong>,
          signaling a <strong>possible staffing concern</strong>.
        </p>
      </div>
    </div>
  );
};

export default DashboardWorkforce;
