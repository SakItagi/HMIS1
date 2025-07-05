import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList
} from 'recharts';

const ReportGenerator = () => {
  const reportRef = useRef();
  const [csvRows, setCsvRows] = useState([]);
  const [charts, setCharts] = useState({});
  const [reportType, setReportType] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState('January');
  const [selectedYear, setSelectedYear] = useState('2025');

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cleanedData = result.data.map(row => {
          const metric = row.metric?.trim().replace(/^Actual /i, '') || '';
          return {
            ...row,
            month: row.month?.toString().padStart(2, '0'),
            year: row.year?.toString().trim(),
            category: row.category?.trim(),
            subCategory: row.subCategory?.trim(),
            metric,
            value: parseFloat(row.value) || 0
          };
        });
        setCsvRows(cleanedData);
      }
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
      html2canvas: {
        scale: 2,
        useCORS: true,       // Ensures images load correctly
        logging: true,       // Helps debug layout issues
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'] // ⛔ Prevents awkward page breaks
      }
    };
    html2pdf().set(opt).from(element).save();
  };

  const monthNameToNumberString = (monthName) => {
    const index = monthNames.indexOf(monthName);
    return index !== -1 ? (index + 1).toString().padStart(2, '0') : '01';
  };

  const filterByReportType = (rows) => {
    if (reportType === 'monthly') {
      const monthStr = monthNameToNumberString(selectedMonth);
      const yearStr = selectedYear.toString();
      return rows.filter(row => row.month === monthStr && row.year === yearStr);
    }
    return rows;
  };

  useEffect(() => {
    if (!csvRows.length) return;

    const filteredRows = filterByReportType(csvRows);

    const groupSum = (metrics, subCat = 'Actual') => {
      return filteredRows
        .filter(row => metrics.includes(row.metric) && row.subCategory === subCat)
        .reduce((acc, row) => {
          const key = row.metric;
          acc[key] = (acc[key] || 0) + Number(row.value || 0);
          return acc;
        }, {});
    };

    const groupByCategory = (metric) => {
      return filteredRows
        .filter(row => row.metric === metric && row.subCategory === 'Actual' && row.category !== 'General')
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
      'Admissions vs Discharges': toChart(groupSum(['Admissions', 'Discharges'])),
      'Issued vs Expired': toChart(groupSum(['Issued', 'Expired'])),
      'Joinee vs Resignation': toChart(groupSum(['Joinees', 'Resignations'])),
      'Repair vs Purchase': toChart(groupSum(['Repair Cost', 'Purchase Cost'])),
      'IPD vs OPD': toChart(groupSum(['IPD Score', 'OPD Score'])),
      'Departmental Revenue': toChart(groupByCategory('Revenue')),
      'Profitability': toChart(groupByCategory('Profitability')),
      'Patient Volume': toChart(groupByCategory('Patients'))
    });
  }, [csvRows, reportType, selectedMonth, selectedYear]);

const chartTitles = [
    'Revenue vs Expense',
    'Lab vs Radiology',
    'Admissions vs Discharges',
    'Issued vs Expired',
    'Joinee vs Resignation',
    'Repair vs Purchase',
    'IPD vs OPD',
    'Departmental Revenue',
    'Profitability',
    'Patient Volume',
  ];

  const renderInsights = (title, data, charts = {}) => {
    const sum = (label) => data.find(d => d.label === label)?.value || 0;
    const allValues = (t) => charts?.[t]?.reduce((acc, curr) => acc + curr.value, 0) || 0;
  
    switch (title) {
      case 'Revenue vs Expense': {
        const rev = sum('Revenue');
        const exp = sum('Expense');
        const profitability = allValues('Profitability');
        if (!rev && !exp) return ['No data available.'];
        if (rev < exp && profitability < 0) {
          return [`Expenses exceed revenue by ₹${(exp - rev).toLocaleString()} — operating at a deficit likely due to low profitability.`];
        }
        return rev > exp
          ? [`Revenue exceeds expenses by ₹${(rev - exp).toLocaleString()} — good financial control.`]
          : [`Expenses exceed revenue by ₹${(exp - rev).toLocaleString()} — operating at a deficit.`];
      }
      case 'Joinee vs Resignation': {
        const joinees = sum('Joinees');
        const resigns = sum('Resignations');
        const patientLoad = allValues('Patient Volume');
        if (!joinees && !resigns) return ['No data available.'];
        if (resigns > joinees && patientLoad > 1000) {
          return ['More resignations than joinees — possibly due to high patient volume and staff burnout.'];
        }
        return resigns > joinees
          ? ['More resignations than joinees — assess employee satisfaction and retention strategies.']
          : ['Healthy hiring trend over resignations.'];
      }
      case 'Admissions vs Discharges': {
        const adm = sum('Admissions');
        const dis = sum('Discharges');
        const ipdScore = sum('IPD Score');
        if (!adm && !dis) return ['No data available.'];
        if (adm > dis && ipdScore > 500) {
          return [`Admissions exceed discharges by ${(adm - dis).toLocaleString()} — possibly due to longer IPD stays.`];
        }
        return adm > dis
          ? [`Admissions exceed discharges by ${(adm - dis).toLocaleString()} — may indicate delays in patient turnover or extended stays.`]
          : dis > adm
          ? [`Discharges exceed admissions by ${(dis - adm).toLocaleString()} — verify if this is due to backlog clearing or seasonal trends.`]
          : ['Admissions and discharges are balanced — efficient patient flow maintained.'];
      }
      case 'Issued vs Expired': {
        const issued = sum('Issued');
        const expired = sum('Expired');
        if (!issued && !expired) return ['No data available.'];
        if (!issued && expired) return ['Issues data missing, but expired stock is present — investigate further.'];
        if (expired > issued * 0.1) return ['Expired stock is more than 10% of issued — review inventory practices.'];
        if (expired === 0) return ['Zero expirations — excellent stock rotation and usage.'];
        return ['Expired stock is within acceptable threshold.'];
      }
      case 'Lab vs Radiology': {
        const lab = sum('Lab Tests');
        const rad = sum('Radiology Tests');
        if (!lab && !rad) return ['No data available.'];
        if (rad > lab && allValues('Profitability') < 0) {
          return ['Radiology tests exceed lab tests — consider reviewing diagnostic cost efficiency.'];
        }
        return lab > rad
          ? ['Lab test volume is healthy compared to radiology.']
          : ['Radiology tests exceed lab tests — check for overuse or imbalance.'];
      }
      case 'Repair vs Purchase': {
        const repair = sum('Repair Cost');
        const purchase = sum('Purchase Cost');
        if (!repair && !purchase) return ['No data available.'];
        if (repair > purchase && allValues('Revenue vs Expense') < 0) {
          return ['Repair cost exceeds purchase cost and revenue is low — suggests outdated infrastructure draining resources.'];
        }
        return repair > purchase
          ? ['Repair cost exceeds purchase cost — consider replacing aging equipment.']
          : ['Repair cost under control compared to new purchases.'];
      }
      case 'IPD vs OPD': {
        const ipd = sum('IPD Score');
        const opd = sum('OPD Score');
        if (!ipd && !opd) return ['No data available.'];
        return ipd > opd
          ? ['Higher IPD score — ensure bed and staff availability.']
          : ['OPD dominates — opportunity for preventive healthcare and early interventions.'];
      }
      case 'Departmental Revenue': {
        const total = data.reduce((acc, curr) => acc + curr.value, 0);
        return [`Total departmental revenue: ₹${total.toLocaleString()}. Focus on underperforming departments.`];
      }
      case 'Profitability': {
        const total = data.reduce((acc, curr) => acc + curr.value, 0);
        const revenue = allValues('Revenue vs Expense');
        if (total < 0 && revenue < 0) {
          return [`Negative profitability and revenue deficit — urgent review of department-wise budgeting needed.`];
        }
        return [`Overall profitability: ₹${total.toLocaleString()}. Evaluate low-profit departments.`];
      }
      case 'Patient Volume': {
        const total = data.reduce((acc, curr) => acc + curr.value, 0);
        const hrTurnover = allValues('Joinee vs Resignation');
        if (total > 2000 && hrTurnover < 0) {
          return [`High patient volume: ${total.toLocaleString()} — likely stressing staff, review HR allocations.`];
        }
        return [`Total patient volume: ${total.toLocaleString()} — plan staffing accordingly.`];
      }
      default:
        return ['No specific insights available.'];
    }
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
        'Conduct exit interviews to understand root causes of resignations.',
        'Improve onboarding and mentorship programs.',
        'Assess team morale and workload regularly.'
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
      'Admissions vs Discharges': [
        'Review average length of stay per department.',
        'Ensure timely discharge planning and coordination.',
        'Address discharge delays related to documentation or post-care logistics.'
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
    return map[title] || ['No recommended actions available.'];
  };
  

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans max-w-[1600px] mx-auto w-full text-black">
      <div className="flex items-center gap-4 mb-8">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="border px-3 py-2 rounded bg-white text-sm"
        />
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="border px-3 py-2 rounded bg-white text-sm"
        >
          <option value="monthly">Monthly</option>
          <option value="overall">Overall</option>
        </select>
        {reportType === 'monthly' && (
          <>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border px-3 py-2 rounded bg-white text-sm"
            >
              {monthNames.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border px-3 py-2 rounded bg-white text-sm"
            >
              {[2025, 2024, 2023].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </>
        )}
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Generate Report
        </button>
        <button
          onClick={handleDownloadPDF}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Download PDF
        </button>
      </div>
      <div ref={reportRef} className="bg-white px-12 py-8 rounded shadow-md text-sm w-full text-black">
        <div className="mb-12">
          <img src="/logo.png" alt="Hospital Logo" className="h-12" />
          <div className="text-right">
            <h1 className="text-2xl font-bold text-black">Hospital Monthly Report</h1>
            <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {chartTitles.map((title, idx) => (
          <section key={title} className="mb-20 border-b pb-10">
            <h2 className="text-xl font-bold mb-6 text-black">{idx + 1}. {title}</h2>

            {charts[title]?.length ? (
              <div style={{ width: '400px', height: '300px' }}>
              <BarChart
                width={1200}
                height={300}
                data={charts[title]}
                barSize={80} // Adjust this to control bar width
                barGap={0}
                barCategoryGap={0}
                margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
              >
              
                
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
  dataKey="label"
  stroke="black"
  angle={-45}
  textAnchor="end"
  interval={0}
  
/>
                <YAxis stroke='black' />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                <LabelList
  dataKey="value"
  position="top"
  formatter={(value) => value.toLocaleString()}
  fill="black"
/>
                </Bar>
              </BarChart>
            </div>
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
            <td className="border px-4 py-2 " style={{ fontWeight: 'bold' }}>{label}</td>
            <td className="border px-4 py-2">
              {['Lab vs Radiology', 'IPD vs OPD', 'Joinee vs Resignation', 'Patient Volume', 'Issued vs Expired','Admissions vs Discharges'].includes(title)
                ? value.toLocaleString()
                : `₹${value.toLocaleString()}`}
            </td>
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
 <section className="mt-16 text-base style={{ color: 'black' }}">
          <h2 className="text-xl font-bold mb-4 text-black">Overall Summary of Operations</h2>
          <p className="mb-4 leading-7 text-black">
            This month, the hospital maintained steady operations with active departmental participation. While revenue was generated across core units, some departments exhibited challenges in cost management, staffing, and inventory control that require attention.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Finance:</strong> Revenue was lower than expenses, mainly due to high purchase costs in the Maintenance department.</li>
            <li><strong>Maintenance:</strong> Excessive spending on equipment procurement suggests a need to review purchasing policies.</li>
            <li><strong>IPD Admissions and Discharges:</strong> Admissions exceeded discharges by 2,200 — review bed turnover efficiency and discharge processes to avoid patient backlog.</li>
            <li><strong>Pharmacy:</strong> High volume of expired stock indicates inventory rotation practices need strengthening.</li>
            <li><strong>HR:</strong> Resignation count exceeded ideal levels, suggesting employee satisfaction and retention should be reviewed.</li>
            <li><strong>Diagnostics:</strong> Radiology usage was higher than lab testing — balance test utilization across services.</li>
            <li><strong>Feedback:</strong> IPD and OPD scores are balanced, indicating a stable utilization of both inpatient and outpatient services.</li>
            <li><strong>Revenue Generation:</strong> While most departments contributed, a few reported low revenue and need targeted performance support.</li>
          </ul>
        </section>

        <section className="mt-16 text-sm text-black">
          <p className='text-black'>Prepared by: _____________________________</p>
          <p className="mt-2 text-black">Designation: ____________________________</p>
          <p className="mt-6 italic text-black">This is a system-generated report. No signature is required.</p>
        </section>
      </div>
    </div>
  );
};

export default ReportGenerator;
