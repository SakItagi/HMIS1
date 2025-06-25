import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function DashboardMaintenance() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/get-data")
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  const maintenanceSummary = () => {
    const totalExpectedRepair = data.reduce((sum, item) => sum + Number(item.ExpectedRepairCost || 0), 0);
    const totalActualRepair = data.reduce((sum, item) => sum + Number(item.ActualRepairCost || 0), 0);
    const totalExpectedPurchase = data.reduce((sum, item) => sum + Number(item.ExpectedPurchaseCost || 0), 0);
    const totalActualPurchase = data.reduce((sum, item) => sum + Number(item.ActualPurchaseCost || 0), 0);

    const count = data.length;
    if (count === 0) return "No maintenance data available.";

    const repairStatus = totalActualRepair > totalExpectedRepair ? "exceeded" : "remained within";
    const purchaseStatus = totalActualPurchase > totalExpectedPurchase ? "exceeded" : "remained within";

    return `Repair & Maintenance costs have ${repairStatus} expectations, while New Purchase costs have ${purchaseStatus} expectations.`;
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">🛠️ Expected vs Actual — Repair, Maintenance & New Purchase Costs</h2>

      <ResponsiveContainer width="100%" height={800}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {/* Repair & Maintenance */}
          <Bar dataKey="ExpectedRepairCost" fill="#fbbf24" name="Expected Repair & Maintenance" />
          <Bar dataKey="ActualRepairCost" fill="#f97316" name="Actual Repair & Maintenance" />
          {/* New Purchase */}
          <Bar dataKey="ExpectedPurchaseCost" fill="#60a5fa" name="Expected New Purchase" />
          <Bar dataKey="ActualPurchaseCost" fill="#3b82f6" name="Actual New Purchase" />
        </BarChart>
      </ResponsiveContainer>

      <p className="mt-6 text-8xl font-semibold text-center text-gray-800 italic">
        {maintenanceSummary()}
      </p>
    </div>
  );
}

export default DashboardMaintenance;