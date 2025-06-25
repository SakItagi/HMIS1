import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';

const formatCurrency = (val) => `₹${(val / 1000).toFixed(0)}K`;
const formatPercent = (val) => `${(val * 100).toFixed(1)}%`;

const OverviewDashboard = () => {
  const [overviewData, setOverviewData] = useState({});
  const [ipdData, setIpdData] = useState([]);
  const [feedbackData, setFeedbackData] = useState([]);
  const [deptData, setDeptData] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/hmis/summary')
      .then(res => res.json())
      .then(data => setOverviewData(data));

    fetch('/api/hmis/ipd')
      .then(res => res.json())
      .then(data => setIpdData(data));

    fetch('/api/hmis/feedback')
      .then(res => res.json())
      .then(data => setFeedbackData(data));

    fetch('/api/hmis/department')
      .then(res => res.json())
      .then(data => setDeptData(data));
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm font-medium text-gray-500">Net Profit</h4>
          <p className="text-xl font-bold text-green-600">{formatCurrency(overviewData.netProfit || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm font-medium text-gray-500">Total Diagnostics</h4>
          <p className="text-xl font-bold text-blue-600">{overviewData.totalDiagnostics || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm font-medium text-gray-500">Net Staff Growth</h4>
          <p className="text-xl font-bold text-indigo-600">{overviewData.netStaffGrowth || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm font-medium text-gray-500">Drug Expiration Rate</h4>
          <p className="text-xl font-bold text-red-500">{formatPercent(overviewData.drugExpiryRate || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="text-sm font-medium text-gray-500">Total Maintenance Cost</h4>
          <p className="text-xl font-bold text-orange-500">{formatCurrency(overviewData.totalMaintenanceCost || 0)}</p>
        </div>
      </div>

      {/* Horizontal Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Admissions & Discharges Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ipdData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="actualAdmission" fill="#8884d8" name="Actual Admission" />
              <Bar dataKey="actualDischarge" fill="#82ca9d" name="Actual Discharge" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">IPD & OPD Feedback Scores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={feedbackData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="actualIPDScore" fill="#8884d8" name="Actual IPD" />
              <Bar dataKey="actualOPDScore" fill="#82ca9d" name="Actual OPD" />
              <Line dataKey="expectedIPDScore" stroke="#ff7300" name="Expected IPD" />
              <Line dataKey="expectedOPDScore" stroke="#ff0000" name="Expected OPD" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Revenue & Profitability */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Department Revenue & Profitability</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={deptData} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tickFormatter={formatPercent} />
            <Tooltip formatter={(val, name) => name.includes('Profit') ? formatPercent(val) : formatCurrency(val)} />
            <Legend />
            <Bar yAxisId="left" dataKey="expectedRevenue" fill="#a0aec0" name="Expected Revenue" />
            <Bar yAxisId="left" dataKey="actualRevenue" fill="#4c51bf" name="Actual Revenue" />
            <Line yAxisId="right" dataKey="actualProfitability" stroke="#e53e3e" strokeWidth={2} name="Profitability" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default OverviewDashboard;
