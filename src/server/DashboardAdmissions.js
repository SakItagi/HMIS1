import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import axios from 'axios';

const DashboardAdmissions = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('/api/hmis')
      .then(res => {
        const formatted = res.data.map(row => ({
          month: row.month,
          expectedAdmission: +row.expectedAdmissions || 0,
          actualAdmission: +row.actualAdmissions || 0,
          expectedDischarge: +row.expectedDischarges || 0,
          actualDischarge: +row.actualDischarges || 0,
        }));
        setData(formatted);
      })
      .catch(err => console.error('Error fetching IPD data:', err));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-blue-800">🏥 Monthly IPD Admissions and Discharges: Actual vs Expected</h2>
      <p className="font-medium text-gray-700 mb-2">
        Expected IPD Admission, Actual IPD Admission, Expected Discharges, and Actual Discharges by Month
      </p>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={600}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="expectedAdmission" fill="#8B4513" name="Expected IPD Admission">
            <LabelList dataKey="expectedAdmission" position="top" />
          </Bar>
          <Bar dataKey="actualAdmission" fill="#D2B48C" name="Actual IPD Admission">
            <LabelList dataKey="actualAdmission" position="top" />
          </Bar>
          <Bar dataKey="expectedDischarge" fill="#A52A2A" name="Expected Discharges">
            <LabelList dataKey="expectedDischarge" position="top" />
          </Bar>
          <Bar dataKey="actualDischarge" fill="#CD853F" name="Actual Discharges">
            <LabelList dataKey="actualDischarge" position="top" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Table */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-2">📋 Monthly Summary Table</h3>
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
                { label: "Expected IPD Admission", key: "expectedAdmission" },
                { label: "Actual IPD Admission", key: "actualAdmission" },
                { label: "Expected Discharges", key: "expectedDischarge" },
                { label: "Actual Discharges", key: "actualDischarge" }
              ].map((metric, i) => (
                <tr key={i}>
                  <td className="border px-4 py-2 font-medium">{metric.label}</td>
                  {data.map((row, j) => (
                    <td key={j} className="border px-4 py-2">
                      {row[metric.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="text-sm mt-8">
        <p className="font-semibold mb-1">📌 Insights:</p>
        <p className="text-gray-700 leading-relaxed">
          The number of <strong>admissions and discharges</strong> was <strong>mostly overestimated</strong>,
          but both started decreasing from <strong>August to May</strong>, and the
          <strong> actual numbers</strong> came <strong>closer to the expected ones</strong> in the months of
          <strong> April and May</strong>. August had the <strong>highest number of actual admissions</strong>,
          exceeding expectations, but also showed a <strong>notable shortfall in actual discharges</strong> —
          indicating potential <strong>strain on bed availability or discharge processes</strong>.
        </p>
      </div>
    </div>
  );
};

export default DashboardAdmissions;