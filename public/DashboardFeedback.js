import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function DashboardFeedback() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/get-data")
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  const feedbackAnalysis = () => {
    const totalExpectedIPD = data.reduce((sum, item) => sum + Number(item.ExpectedIPDScore || 0), 0);
    const totalActualIPD = data.reduce((sum, item) => sum + Number(item.ActualIPDScore || 0), 0);
    const totalExpectedOPD = data.reduce((sum, item) => sum + Number(item.ExpectedOPDScore || 0), 0);
    const totalActualOPD = data.reduce((sum, item) => sum + Number(item.ActualOPDScore || 0), 0);

    const count = data.length;
    if (count === 0) return "No feedback data available.";

    const avgExpectedIPD = totalExpectedIPD / count;
    const avgActualIPD = totalActualIPD / count;
    const avgExpectedOPD = totalExpectedOPD / count;
    const avgActualOPD = totalActualOPD / count;

    if (avgActualIPD < avgExpectedIPD && Math.abs(avgActualOPD - avgExpectedOPD) <= 0.5) {
      return "IPD scores consistently underperform expectations while OPD scores remain relatively close.";
    } else {
      return "Feedback scores show varying performance between IPD and OPD.";
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">⭐ IPD & OPD Feedback Scores (Expected vs Actual)</h2>

      <ResponsiveContainer width="100%" height={800}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 5]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="ExpectedIPDScore" fill="#fbbf24" name="Expected IPD Score" />
          <Bar dataKey="ActualIPDScore" fill="#f97316" name="Actual IPD Score" />
          <Bar dataKey="ExpectedOPDScore" fill="#60a5fa" name="Expected OPD Score" />
          <Bar dataKey="ActualOPDScore" fill="#3b82f6" name="Actual OPD Score" />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center items-center mt-6">
      <p className="mt-6 text-8xl font-bold text-center text-gray-800 italic">
        {feedbackAnalysis()}
      </p>
    </div>
    </div>
  );
}

export default DashboardFeedback;