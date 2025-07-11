import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
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
  const [data, setData] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [charts, setCharts] = useState({});
  const [reportType, setReportType] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState('January');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [parsedData, setParsedData] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState('Expected');

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetch('http://localhost:5000/api/hmis/summary')
      .then(res => res.json())
      .then(data => {
        const cleanRow = (row) => ({
          ...row,
          month: row.month?.trim(),
          year: row.year?.trim(),
          metric: row.metric?.trim(),
          category: row.category?.trim(),
          subCategory: row.subCategory?.trim(),
          value: Number(row.value?.replace(/,/g, '') || 0)
        });

        const normalized = data.map(cleanRow);
        console.log("✅ Normalized JSON Data:", normalized);
        setParsedData(normalized);
      })
      .catch(error => {
        console.error("❌ Error fetching or parsing summary data:", error);
      });
  }, []);

  useEffect(() => {
    const monthNumber = monthNameToNumber(selectedMonth);
    const yearNumber = parseInt(selectedYear);

    const filteredRows = parsedData.filter((row) => {
      const cleanedMonth = (row.month || '').trim().toLowerCase();
      const cleanedYear = (row.year || '').trim();
      const selectedMonthNormalized = selectedMonth.toLowerCase();
      const monthMatch = cleanedMonth === selectedMonthNormalized || cleanedMonth === monthNameToNumber(selectedMonth);
      const yearMatch = cleanedYear === selectedYear;
      return reportType === 'monthly' ? monthMatch && yearMatch : true;
    });
    
    

    const generalRows = filteredRows.filter(row => row.category === 'General' || row.category === '');
    const categoryRows = filteredRows.filter(row => row.category && row.category !== 'General');

    const groupSum = (rows, metrics) => {
      return rows
        .filter(row =>
          metrics.some(m => row.metric.toLowerCase().includes(m.toLowerCase())) &&
          row.subCategory?.toLowerCase() === selectedSubCategory.toLowerCase()
        )
        .reduce((acc, row) => {
          const key = metrics.find(m => row.metric.toLowerCase().includes(m.toLowerCase())) || row.metric;
          acc[key] = (acc[key] || 0) + Number(row.value || 0);
          return acc;
        }, {});
    };
    const groupByCategory = (rows, targetMetric) => {
      return rows
        .filter(row =>
          row.metric?.toLowerCase().includes(targetMetric.toLowerCase()) &&
          row.subCategory?.toLowerCase() === selectedSubCategory.toLowerCase() &&
          row.category && row.category.toLowerCase() !== 'general'
        )
        .reduce((acc, row) => {
          const key = row.category;
          acc[key] = (acc[key] || 0) + Number(row.value || 0);
          return acc;
        }, {});
    };
    
    const toChart = (obj) =>
      Object.entries(obj).map(([label, value]) => ({ label, value }));
    setCharts({
      'Revenue vs Expense': toChart(groupSum(generalRows, ['Revenue', 'Expense'])),
      'Lab vs Radiology': toChart(groupSum(filteredRows, ['Lab Tests', 'Radiology Tests'])),
      'Admissions vs Discharges': toChart(groupSum(filteredRows, ['Admissions', 'Discharges'])),
      'Issued vs Expired': toChart(groupSum(filteredRows, ['Issued', 'Expired'])),
      'Joinee vs Resignation': toChart(groupSum(filteredRows, ['Joinees', 'Resignations'])),
      'Repair vs Purchase': toChart(groupSum(filteredRows, ['Repair Cost', 'Purchase Cost'])),
      'IPD vs OPD': toChart(groupSum(filteredRows, ['IPD Score', 'OPD Score'])),
      'Departmental Revenue': toChart(groupByCategory(categoryRows, 'Revenue')),
  'Profitability': toChart(groupByCategory(categoryRows, 'Profitability')),
  'Patient Volume': toChart(groupByCategory(categoryRows, 'Patients'))
    });
  }, [parsedData, reportType, selectedMonth, selectedYear, selectedSubCategory]);
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
        if (!rev && !exp) return ['Observation: No data available.'];
  
        if (rev < exp && profitability < 0) {
          return [
            `Observation: Expenses exceed revenue by ₹${(exp - rev).toLocaleString()}.`,
            `RCA: Likely due to negative profitability from underperforming departments or rising fixed costs.`
          ];
        }
  
        return [
          `Observation: Revenue exceeds expenses by ₹${(rev - exp).toLocaleString()}.`,
          `RCA: Indicates sound financial control and operational efficiency.`
        ];
      }
  
      case 'Joinee vs Resignation': {
        const joinees = sum('Joinees');
        const resigns = sum('Resignations');
        const patientLoad = allValues('Patient Volume');
        if (!joinees && !resigns) return ['Observation: No data available.'];
  
        if (resigns > joinees && patientLoad > 1000) {
          return [
            'Observation: Resignations exceed joinees under high patient load.',
            'RCA: Possible staff burnout or inadequate HR planning.'
          ];
        }
  
        if (resigns > joinees) {
          return [
            'Observation: Resignations exceed joinees.',
            'RCA: Likely causes include dissatisfaction, lack of engagement, or poor work culture.'
          ];
        }
  
        return [
          'Observation: More joinees than resignations.',
          'RCA: Effective recruitment and retention practices are in place.'
        ];
      }
  
      case 'Admissions vs Discharges': {
        const adm = sum('Admissions');
        const dis = sum('Discharges');
        const ipdScore = sum('IPD Score');
        if (!adm && !dis) return ['Observation: No data available.'];
  
        if (adm > dis && ipdScore > 500) {
          return [
            `Observation: Admissions exceed discharges by ${(adm - dis).toLocaleString()}.`,
            `RCA: Indicates longer patient stays possibly due to critical cases or discharge delays.`
          ];
        }
  
        if (dis > adm) {
          return [
            `Observation: Discharges exceed admissions by ${(dis - adm).toLocaleString()}.`,
            `RCA: Might be backlog clearing, seasonal variation, or reduced admission rates.`
          ];
        }
  
        return ['Observation: Admissions and discharges are balanced.', 'RCA: Reflects efficient patient flow and care transitions.'];
      }
  
      case 'Issued vs Expired': {
        const issued = sum('Issued');
        const expired = sum('Expired');
        if (!issued && !expired) return ['Observation: No data available.'];
  
        if (expired > issued * 0.1) {
          return [
            'Observation: Expired stock is more than 10% of issued.',
            'RCA: Poor inventory rotation or excess ordering leading to wastage.'
          ];
        }
  
        return [
          'Observation: Expired stock is within acceptable limits.',
          'RCA: Inventory is managed well with timely usage.'
        ];
      }
  
      case 'Lab vs Radiology': {
        const lab = sum('Lab Tests');
        const rad = sum('Radiology Tests');
        if (!lab && !rad) return ['Observation: No data available.'];
  
        if (rad > lab && allValues('Profitability') < 0) {
          return [
            'Observation: Radiology tests exceed lab tests.',
            'RCA: Potential overuse of imaging without cost-effective results.'
          ];
        }
  
        return [
          lab > rad
            ? 'Observation: Lab tests are higher than radiology.'
            : 'Observation: Radiology tests are higher than lab.',
          'RCA: Reflects service focus or physician ordering patterns.'
        ];
      }
  
      case 'Repair vs Purchase': {
        const repair = sum('Repair Cost');
        const purchase = sum('Purchase Cost');
        if (!repair && !purchase) return ['Observation: No data available.'];
  
        return [
          `Observation: ${repair > purchase ? 'Repairs' : 'Purchases'} dominate.`,
          repair > purchase
            ? 'RCA: Indicates aging equipment or deferred replacements.'
            : 'RCA: Investment in new infrastructure or capital upgrades.'
        ];
      }
  
      case 'IPD vs OPD': {
        const ipd = sum('IPD Score');
        const opd = sum('OPD Score');
        if (!ipd && !opd) return ['Observation: No data available.'];
  
        return [
          `Observation: ${ipd > opd ? 'IPD' : 'OPD'} dominates.`,
          ipd > opd
            ? 'RCA: Indicates complex inpatient care or longer stays.'
            : 'RCA: Strong outpatient care possibly reducing admissions.'
        ];
      }
  
      case 'Departmental Revenue': {
        const total = data.reduce((acc, curr) => acc + curr.value, 0);
        return [
          `Observation: Total departmental revenue is ₹${total.toLocaleString()}.`,
          'RCA: Evaluate departments with below-average contribution.'
        ];
      }
  
      case 'Profitability': {
        const total = data.reduce((acc, curr) => acc + curr.value, 0);
        const revenue = allValues('Revenue vs Expense');
        return [
          `Observation: Overall profitability is ₹${total.toLocaleString()}.`,
          total < 0 && revenue < 0
            ? 'RCA: System-wide financial inefficiencies — urgent review required.'
            : 'RCA: Profit varies by department, optimize low-margin areas.'
        ];
      }
  
      case 'Patient Volume': {
        const total = data.reduce((acc, curr) => acc + curr.value, 0);
        const hrTurnover = allValues('Joinee vs Resignation');
        return [
          `Observation: Patient volume is ${total.toLocaleString()}.`,
          total > 2000 && hrTurnover < 0
            ? 'RCA: Staff may be under strain — review HR allocations.'
            : 'RCA: Monitor volume to optimize scheduling and resource allocation.'
        ];
      }
  
      default:
        return ['Observation: No specific insights available.'];
    }
  };
  const renderActions = (title, data, charts = {}) => {
    const sum = (label, titleOverride = title) => charts?.[titleOverride]?.find(d => d.label === label)?.value || 0;
    const allValues = (t) => charts?.[t]?.reduce((acc, curr) => acc + curr.value, 0) || 0;
  
    switch (title) {
      case 'Revenue vs Expense': {
        const rev = sum('Revenue');
        const exp = sum('Expense');
        const rad = sum('Radiology Tests', 'Lab vs Radiology');
        const lab = sum('Lab Tests', 'Lab vs Radiology');
        const adm = sum('Admissions', 'Admissions vs Discharges');
        const dis = sum('Discharges', 'Admissions vs Discharges');
        const expired = sum('Expired', 'Issued vs Expired');
        const issued = sum('Issued', 'Issued vs Expired');
        const repair = sum('Repair Cost', 'Repair vs Purchase');
        const purchase = sum('Purchase Cost', 'Repair vs Purchase');
        const profitability = allValues('Profitability');
  
        let actions = [];
        if (rev < exp) {
          actions.push(`Hospital running at a deficit of ₹${(exp - rev).toLocaleString()} — initiate cross-departmental cost review.`);
          if (rad < lab) actions.push(`Radiology test volume (${rad.toLocaleString()}) is lower than Lab (${lab.toLocaleString()}) — check clinician referral patterns and equipment utilization.`);
          if (adm < dis) actions.push(`Admissions (${adm.toLocaleString()}) were lower than discharges (${dis.toLocaleString()}) — assess referral efficiency and patient inflow.`);
          if (expired > issued * 0.1) actions.push(`Expired inventory (${expired.toLocaleString()}) exceeded 10% of issued (${issued.toLocaleString()}) — improve pharmacy rotation and forecasting.`);
          if (repair > purchase) actions.push(`Repair cost (₹${repair.toLocaleString()}) exceeded purchase cost (₹${purchase.toLocaleString()}) — evaluate high-maintenance assets.`);
          if (profitability < 0) actions.push('Negative profitability across departments — audit revenue leakages and cost inefficiencies.');
          actions.push('Coordinate between finance, maintenance, diagnostics, and HR to optimize expenditure and performance.');
        } else {
          actions.push('Revenue exceeds expense — maintain discipline and audit for further optimization potential.');
        }
        return actions;
      }
      case 'Lab vs Radiology': {
        const lab = sum('Lab Tests');
        const rad = sum('Radiology Tests');
        const profit = allValues('Profitability');
        const exp = sum('Expense', 'Revenue vs Expense');
  
        let actions = [];
        if (rad > lab && profit < 0) {
          actions.push(`Radiology volume (${rad.toLocaleString()}) exceeds Lab (${lab.toLocaleString()}) with low profitability — review diagnostic cost efficiency.`);
        } else if (lab > rad) {
          actions.push(`Lab volume (${lab.toLocaleString()}) dominates — evaluate whether imaging is underutilized.`);
        }
        actions.push('Balance diagnostic spend based on clinical need and ROI across departments.');
        if (exp > 0) actions.push('Coordinate with finance to analyze test yield vs cost impact.');
        return actions;
      }
      case 'Admissions vs Discharges': {
        const adm = sum('Admissions');
        const dis = sum('Discharges');
        const ipd = sum('IPD Score', 'IPD vs OPD');
  
        let actions = [];
        if (adm > dis) {
          actions.push(`Admissions (${adm.toLocaleString()}) exceed discharges (${dis.toLocaleString()}) — review discharge planning and bed turnover.`);
          if (ipd > 1000) actions.push(`High IPD score (${ipd}) — verify if prolonged stays are delaying discharges.`);
        } else if (dis > adm) {
          actions.push(`Discharges (${dis.toLocaleString()}) exceed admissions (${adm.toLocaleString()}) — may indicate seasonal clearance or reduced new admissions.`);
        }
        actions.push('Collaborate with OPD teams, diagnostics, and HR to improve patient flow.');
        return actions;
      }
      case 'Issued vs Expired': {
        const issued = sum('Issued');
        const expired = sum('Expired');
        const expPercent = ((expired / issued) * 100).toFixed(1);
  
        let actions = [];
        if (expired > issued * 0.1) actions.push(`Expired stock (${expPercent}%) exceeds acceptable threshold — enforce FEFO and adjust purchase cycles.`);
        else actions.push(`Expired stock within limits (${expPercent}%) — maintain current inventory practices.`);
        actions.push('Link pharmacy alerts with clinical departments to avoid overstocking or underutilization.');
        return actions;
      }
      case 'Joinee vs Resignation': {
        const joinees = sum('Joinees');
        const resigns = sum('Resignations');
        const patients = allValues('Patient Volume');
  
        let actions = [];
        if (resigns > joinees) {
          actions.push(`Resignations (${resigns}) exceed joinees (${joinees}) — review exit feedback and staff morale.`);
          if (patients > 2000) actions.push(`High patient volume (${patients.toLocaleString()}) may be contributing to burnout.`);
        }
        actions.push('HR, Admin, and Department Heads must jointly plan staffing aligned to load and retention.');
        return actions;
      }
      case 'Repair vs Purchase': {
        const repair = sum('Repair Cost');
        const purchase = sum('Purchase Cost');
        const profit = allValues('Profitability');
  
        let actions = [];
        if (repair > purchase) {
          actions.push(`Repair cost (₹${repair.toLocaleString()}) exceeded purchase (₹${purchase.toLocaleString()}) — assess if older assets need replacement.`);
          if (profit < 0) actions.push('Low profitability may be due to recurring equipment downtimes — check asset performance logs.');
        } else {
          actions.push('Equipment maintenance within reasonable limits — continue preventive checks.');
        }
        actions.push('Finance and Maintenance teams should jointly evaluate lifecycle cost of critical equipment.');
        return actions;
      }
      case 'IPD vs OPD': {
        const ipd = sum('IPD Score');
        const opd = sum('OPD Score');
  
        return [
          ipd > opd
            ? `IPD score (${ipd}) exceeds OPD (${opd}) — review bed utilization, referral rates, and resource load.`
            : `OPD footfall (${opd}) is higher than IPD (${ipd}) — opportunity to strengthen preventive care.`,
          'Coordinate between OPD physicians and inpatient teams for seamless transitions.'
        ];
      }
      case 'Departmental Revenue': {
        const total = allValues(title);
        return [
          `Total departmental revenue: ₹${total.toLocaleString()}`,
          'Support underperforming units with marketing, resources, or diagnostic alignment.'
        ];
      }
      case 'Profitability': {
        const total = allValues(title);
        const rev = allValues('Revenue vs Expense');
        return [
          `Total profitability: ₹${total.toLocaleString()}`,
          total < 0 && rev < 0
            ? 'Both revenue and profit are negative — urgent inter-departmental performance review needed.'
            : 'Maintain focus on improving margins via service mix and efficiency.'
        ];
      }
      case 'Patient Volume': {
        const total = allValues(title);
        const hrTurnover = sum('Resignations', 'Joinee vs Resignation') - sum('Joinees', 'Joinee vs Resignation');
  
        return [
          `Total patient volume: ${total.toLocaleString()}`,
          hrTurnover > 0 && total > 2000
            ? 'High patient load with net staff loss — adjust manpower planning immediately.'
            : 'Use footfall trends to fine-tune appointment scheduling and staff allocation.'
        ];
      }
      default:
        return ['No dynamic recommendations available.'];
    }
  };
  

  const monthNameToNumber = (name) => {
    const monthMap = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };
    return monthMap[name?.toLowerCase()] || name;
  };
  const handleDownloadPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin: 0.5,
      filename: 'HMIS_Report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: true, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans max-w-[1600px] mx-auto w-full text-black">
      <div className="flex items-center gap-4 mb-8">
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
        <select
          value={selectedSubCategory}
          onChange={(e) => setSelectedSubCategory(e.target.value)}
          className="border px-3 py-2 rounded bg-white text-sm"
        >
          <option value="Expected">Expected</option>
          <option value="Actual">Actual</option>
        </select>
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
              <div className="overflow-x-auto max-w-full">
                <BarChart
                  width={Math.max(charts[title].length * 100, 1200)}
                  height={300}
                  data={charts[title]}
                  barSize={80}
                  margin={{ top: 20, right: 30, left: 40, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    interval={0}
                    stroke="black"
                    tick={({ x, y, payload }) => (
                      <text
                        x={x}
                        y={y + 30}
                        textAnchor="end"
                        transform={`rotate(-45, ${x}, ${y + 30})`}
                        fontSize={13}
                        fill="black"
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis stroke="black" />
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

    {['Departmental Revenue', 'Profitability', 'Patient Volume'].includes(title) ? (
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            {charts[title].map(({ label }) => (
              <th key={label} className="border px-4 py-2 text-left">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {charts[title].map(({ value }) => (
              <td key={value} className="border px-4 py-2">
                {title === 'Patient Volume'
                  ? value.toLocaleString()
                  : `₹${value.toLocaleString()}`}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    ) : (
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
              <td className="border px-4 py-2 font-bold">{label}</td>
              <td className="border px-4 py-2">
                {['Lab vs Radiology', 'IPD vs OPD', 'Joinee vs Resignation', 'Patient Volume', 'Issued vs Expired', 'Admissions vs Discharges'].includes(title)
                  ? value.toLocaleString()
                  : `₹${value.toLocaleString()}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
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
