import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const ReportGenerator = () => {
  const reportRef = useRef();
  const [csvRows, setCsvRows] = useState([]);
  const [charts, setCharts] = useState({});

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setCsvRows(result.data);
      },
    });
  };

  const handlePrint = useReactToPrint({
    content: () => reportRef.current,
    documentTitle: 'HMIS_Report',
  });

  const handleDownloadPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin: 0.5,
      filename: 'HMIS_Report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    };
    html2pdf().set(opt).from(element).save();
  };

  useEffect(() => {
    if (!csvRows.length) return;

    const groupSum = (metrics, subCat = 'Actual') => {
      return csvRows
        .filter(row => metrics.includes(row.metric) && row.subCategory === subCat)
        .reduce((acc, row) => {
          const key = row.metric;
          acc[key] = (acc[key] || 0) + Number(row.value || 0);
          return acc;
        }, {});
    };

    const groupByCategory = (metric) => {
      return csvRows
        .filter(row => row.metric === metric && row.subCategory === 'Actual')
        .reduce((acc, row) => {
          const key = row.category;
          acc[key] = (acc[key] || 0) + Number(row.value || 0);
          return acc;
        }, {});
    };

    const toChart = (obj) =>
      Object.entries(obj).map(([label, value]) => ({ label, value }));

    setCharts({
      'Revenue vs Expense': toChart(groupSum(['Revenue', 'Expense'])),
      'Lab vs Radiology': toChart(groupSum(['Lab Tests', 'Radiology Tests'])),
      'Issued vs Expired': toChart(groupSum(['Issued', 'Expired'])),
      'Joinee vs Resignation': toChart(groupSum(['Joinees', 'Resignations'])),
      'Repair vs Purchase': toChart(groupSum(['Repair Cost', 'Purchase Cost'])),
      'IPD vs OPD': toChart(groupSum(['Actual IPD Score', 'Actual OPD Score'])),
      'Departmental Revenue': toChart(groupByCategory('Revenue')),
      'Profitability': toChart(groupByCategory('Profitability')),
      'Patient Volume': toChart(groupByCategory('Patients')),
    });
  }, [csvRows]);

  const chartTitles = [
    'Revenue vs Expense',
    'Lab vs Radiology',
    'Issued vs Expired',
    'Joinee vs Resignation',
    'Repair vs Purchase',
    'IPD vs OPD',
    'Departmental Revenue',
    'Profitability',
    'Patient Volume',
  ];
const renderInsights = (title, data) => {
    const sum = (label) => data.find(d => d.label === label)?.value || 0;
    const map = {
      'Revenue vs Expense': () => {
        const rev = sum('Revenue');
        const exp = sum('Expense');
        if (!rev && !exp) return ['No data available.'];
        if (rev > exp) return [' Revenue exceeds expense — good financial control.'];
        if (rev === exp) return [' Revenue equals expense — monitor profit margin closely.'];
        return ['Expenses exceed revenue — consider cost-cutting or boosting revenue streams.'];
      },
      'Lab vs Radiology': () => {
        const lab = sum('Lab Tests');
        const rad = sum('Radiology Tests');
        if (!lab && !rad) return ['No data available.'];
        return lab > rad
          ? [' Lab test volume is healthy compared to radiology.']
          : ['Radiology tests exceed lab tests — check for overuse or imbalance.'];
      },
      'Issued vs Expired': () => {
        const issued = sum('Issued');
        const expired = sum('Expired');
        if (!issued && !expired) return ['No data available.'];
        if (!issued && expired) return ['Issues data missing, but expired stock is present — investigate further.'];
        if (expired > issued * 0.1) return [' Expired stock is more than 10% of issued — review inventory practices.'];
        if (expired === 0) return ['Zero expirations — excellent stock rotation and usage.'];
        return ['Expired stock is within acceptable threshold.'];
      },
      'Joinees vs Resignations': () => {
        const joinee = sum('Joinees');
        const resignation = sum('Resignations');
        if (!joinee && !resignation) return ['No data available.'];
        if (resignation > joinee) return ['More resignations than joinees — assess employee satisfaction and retention strategies.'];
        return ['Healthy hiring trend over resignations.'];
      },
      'Repair vs Purchase': () => {
        const repair = sum('Repair Cost');
        const purchase = sum('Purchase Cost');
        if (!repair && !purchase) return ['No data available.'];
        return repair > purchase
          ? [' Repair cost exceeds purchase cost — consider replacing aging equipment.']
          : [' Repair cost under control compared to new purchases.'];
      },
      'IPD vs OPD': () => {
        const ipd = sum('Actual IPD Score');
        const opd = sum('Actual OPD Score');
        if (!ipd && !opd) return ['No data available.'];
        return ipd > opd
          ? [' Higher IPD score — ensure bed and staff availability.']
          : ['OPD dominates — opportunity for preventive healthcare and early interventions.'];
      },
      'Departmental Revenue': () => [' Review department-wise trends to identify top and underperforming units.'],
      'Profitability': () => ['Check departments with high revenue but low profit — optimize resource allocation.'],
      'Patient Volume': () => ['Evaluate patient load distribution — align staffing and resources accordingly.']
    };
    return map[title]?.() || ['No insights available for this section.'];
  };

  const renderActions = (title) => {
    const map = {
      'Revenue vs Expense': [
        'Audit major expense heads and identify optimization areas.',
        'Explore new revenue channels or improve billing efficiency.',
        'Benchmark against previous months to spot financial drifts.'
      ],
      'Lab vs Radiology': [
        'Ensure clinical guidelines are followed for test requisitions.',
        'Analyze diagnostic yield of radiology tests.',
        'Balance lab and imaging budgets proportionally.'
      ],
      'Issued vs Expired': [
        'Tighten inventory checks and rotation schedules.',
        'Implement expiry alerts and reorder tracking.',
        'Train pharmacy/store staff on FEFO principles.'
      ],
      'Joinee vs Resignation': [
        'Conduct exit interviews to identify patterns.',
        'Improve onboarding and workplace satisfaction.',
        'Analyze departments with higher attrition.'
      ],
      'Repair vs Purchase': [
        'Evaluate ROI of repairing vs replacing frequently broken equipment.',
        'Introduce maintenance schedules to reduce breakdowns.',
        'Reassess procurement strategy based on usage.'
      ],
      'IPD vs OPD': [
        'Strengthen referral pipelines and follow-up tracking.',
        'Ensure optimal bed allocation and discharge planning.',
        'Enhance OPD to IPD conversion efficiency.'
      ],
      'Departmental Revenue': [
        'Support underperforming departments with training/resources.',
        'Promote high-performing services.',
        'Review inter-departmental referrals and their impact.'
      ],
      'Profitability': [
        'Revisit pricing for low-margin departments.',
        'Improve operational efficiency in resource-heavy units.',
        'Benchmark against industry profitability standards.'
      ],
      'Patient Volume': [
        'Distribute staffing based on footfall trends.',
        'Use this data to optimize appointment scheduling.',
        'Plan infrastructure expansions accordingly.'
      ]
    };
    return map[title] || ['No recommendations available.'];
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans max-w-[1600px] mx-auto w-full">
      <div className="flex items-center gap-4 mb-8">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="border px-3 py-2 rounded bg-white text-sm"
        />
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          📄 Generate Report
        </button>
        <button
          onClick={handleDownloadPDF}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          ⬇️ Download PDF
        </button>
      </div>

      <div ref={reportRef} className="bg-white px-32 py-16 rounded shadow-md text-sm w-full">
        <div className="mb-12">
          
            <img src="/logo.png" alt="Hospital Logo" className="h-12" />
            <div className="text-right">
              <h1 className="text-2xl font-bold">Hospital Monthly Report</h1>
              <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
       

        {chartTitles.map((title, idx) => (
          <section key={title} className="mb-20 border-b pb-10">
            <h2 className="text-xl font-bold mb-6">{idx + 1}. {title}</h2>

            {charts[title]?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={charts[title]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">No data available for {title}</p>
            )}

            {charts[title]?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-semibold mb-2">Summary Table</h4>
                <table className="w-full border text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2 text-left">Metric</th>
                      <th className="border px-4 py-2 text-left">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charts[title].map(({ label, value }) => (
                      <tr key={label}>
                        <td className="border px-4 py-2">{label}</td>
                        <td className="border px-4 py-2">₹{value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
 <div className="mt-6">
              <h4 className="text-md font-semibold mb-2">AI-Generated Insights</h4>
              <ul className="list-disc pl-5 text-gray-700">
                {renderInsights(title, charts[title] || []).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <h4 className="text-md font-semibold mb-2">Recommended Actions</h4>
              <ul className="list-disc pl-5 text-gray-700">
                {renderActions(title).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        ))}
        

        <section className="mt-16 text-sm text-gray-600">
          <p>Prepared by: _____________________________</p>
          <p className="mt-2">Designation: ____________________________</p>
          <p className="mt-6 italic">This is a system-generated report. No signature is required.</p>
        </section>
      </div>
    </div>
  );
};

export default ReportGenerator;