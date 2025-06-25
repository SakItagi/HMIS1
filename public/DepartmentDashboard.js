import React, { useEffect, useState, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LabelList,
  BarChart, Bar
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const formatCurrency = (val) => `${(val / 1000).toFixed(0)}K`;

const DepartmentDashboard = ({ view = 'overview' }) => {
  const [rawData, setRawData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [expectedVsActualRevenueData, setExpectedVsActualRevenueData] = useState([]);
  const [actualPatientData, setActualPatientData] = useState([]);
  const [expectedVsActualPatientData, setExpectedVsActualPatientData] = useState([]);
  const [actualProfitData, setActualProfitData] = useState([]);
  const [expectedVsActualProfitData, setExpectedVsActualProfitData] = useState([]);
  const dashboardRef = useRef();

  useEffect(() => {
    fetch('http://localhost:5000/api/hmis/summary')
      .then((res) => res.json())
      .then((data) => {
        const cleaned = data.map((entry) => {
          const cleanedEntry = {};
          for (const key in entry) {
            const cleanKey = key.trim().toLowerCase();
            const value = entry[key];
            cleanedEntry[cleanKey] =
              typeof value === 'string' ? value.trim().replace('\r', '') : value;
          }
          return cleanedEntry;
        });
        setRawData(cleaned);
      });
  }, []);

  useEffect(() => {
    const allowedDepartments = [
      'General Medicine', 'Orthopaedic', 'Dialysis', 'Pediatric', 'Ophthalmology',
      'Homoeopathic', 'Geriatric', 'Cardiology', 'Surgery',
      'Gynaecology', 'Neurology', 'Urology', 'Gastroenterology', 'ENT'
    ];

    const filterBy = (subCategory, metric) => rawData.filter(
      d =>
        d.subcategory === subCategory &&
        d.metric === metric &&
        allowedDepartments.includes(d.category)
    );

    const actualRevenue = filterBy('Actual', 'Revenue');
    const expectedRevenue = filterBy('Expected', 'Revenue');
    const actualPatients = filterBy('Actual', 'Patients');
    const expectedPatients = filterBy('Expected', 'Patients');
    const actualProfit = filterBy('Actual', 'Profitability');
    const expectedProfit = filterBy('Expected', 'Profitability');

    const mapReducer = (data) =>
      data.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + parseInt(curr.value || 0, 10);
        return acc;
      }, {});

    const actualRevenueMap = mapReducer(actualRevenue);
    const expectedRevenueMap = mapReducer(expectedRevenue);
    const actualPatientsMap = mapReducer(actualPatients);
    const expectedPatientsMap = mapReducer(expectedPatients);
    const actualProfitMap = mapReducer(actualProfit);
    const expectedProfitMap = mapReducer(expectedProfit);

    setDepartmentData(allowedDepartments.map((dept) => ({ category: dept, value: actualRevenueMap[dept] || 0 })));
    setExpectedVsActualRevenueData(allowedDepartments.map((dept) => ({ department: dept, expected: expectedRevenueMap[dept] || 0, actual: actualRevenueMap[dept] || 0 })));
    setActualPatientData(allowedDepartments.map((dept) => ({ department: dept, patients: actualPatientsMap[dept] || 0 })));
    setExpectedVsActualPatientData(allowedDepartments.map((dept) => ({ department: dept, expected: expectedPatientsMap[dept] || 0, actual: actualPatientsMap[dept] || 0 })));
    setActualProfitData(allowedDepartments.map((dept) => ({ department: dept, profit: actualProfitMap[dept] || 0 })));
    setExpectedVsActualProfitData(allowedDepartments.map((dept) => ({ department: dept, expected: expectedProfitMap[dept] || 0, actual: actualProfitMap[dept] || 0 })));
  }, [rawData]);

  const labelStyle = { fill: 'black', fontSize: 14 };

  const chartTitles = {
    overview: 'Department-wise Revenue',
    revenue: 'Department-wise Revenue: Expected vs Actual',
    volumeOverview: 'Patient Count by Department',
    volumeComparison: 'Patient Count by Department: Expected vs Actual',
    profitOverview: 'Profitability per patient by Department',
    profitComparison: 'Profitability per patient by Department: Expected vs Actual',
  };

  const renderChart = () => {
    const height = 500;
    const chartProps = {
      width: 1400,
      height,
      margin: { top: 30, right: 30, left: 60, bottom: 80 }
    };

    const xAxis = {
      dataKey: "department",
      interval: 0,
      angle: -30,
      textAnchor: "end",
      height: 80,
      stroke: 'black'
    };

    const yAxis = { stroke: 'black' };

    const title = chartTitles[view];

    const titleStyle = {
      fontSize: '18px',
      fontWeight: 'normal',
      color: '#333',
      marginBottom: '10px',
      marginTop: '10px'
    };

    switch (view) {
      case 'overview':
        return (
          <>
            <div style={titleStyle}>{title}</div>
            <ResponsiveContainer width="100%" height={departmentData.length * 50}>
              <BarChart data={departmentData} layout="vertical" margin={{ top: 30, right: 30, left: 60, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" stroke="black" />
                <YAxis type="category" dataKey="category" stroke="black" />
                <Tooltip formatter={formatCurrency} />
                <Bar dataKey="value" fill="#27AE60" name="Revenue">
                  <LabelList dataKey="value" position="right" formatter={formatCurrency} {...labelStyle} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        );
      case 'revenue':
        return (
          <>
            <div style={titleStyle}>{title}</div>
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={expectedVsActualRevenueData} {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...xAxis} />
                <YAxis {...yAxis} />
                <Tooltip formatter={formatCurrency} />
                <Legend />
                <Bar dataKey="expected" fill="#42A5F5" name="Expected">
                  <LabelList dataKey="expected" position="top" formatter={formatCurrency} {...labelStyle} />
                </Bar>
                <Bar dataKey="actual" fill="#4CAF50" name="Actual">
                  <LabelList dataKey="actual" position="top" formatter={formatCurrency} {...labelStyle} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        );
      case 'volumeOverview':
        return (
          <>
            <div style={titleStyle}>{title}</div>
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={actualPatientData} {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...xAxis} />
                <YAxis {...yAxis} />
                <Tooltip />
                <Bar dataKey="patients" fill="#27AE60" name="Patients">
                  <LabelList dataKey="patients" position="top" {...labelStyle} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        );
      case 'volumeComparison':
        return (
          <>
            <div style={titleStyle}>{title}</div>
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={expectedVsActualPatientData} {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...xAxis} />
                <YAxis {...yAxis} />
                <Tooltip />
                <Legend />
                <Bar dataKey="expected" fill="#42A5F5" name="Expected">
                  <LabelList dataKey="expected" position="top" {...labelStyle} />
                </Bar>
                <Bar dataKey="actual" fill="#4CAF50" name="Actual">
                  <LabelList dataKey="actual" position="top" {...labelStyle} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        );
      case 'profitOverview':
        return (
          <>
            <div style={titleStyle}>{title}</div>
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={actualProfitData} {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...xAxis} />
                <YAxis {...yAxis} />
                <Tooltip formatter={formatCurrency} />
                <Line type="linear" dataKey="profit" stroke="#27AE60" name="Profit" strokeWidth={2}>
                  <LabelList dataKey="profit" position="top" {...labelStyle} formatter={formatCurrency} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </>
        );
      case 'profitComparison':
        return (
          <>
            <div style={titleStyle}>{title}</div>
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={expectedVsActualProfitData} {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...xAxis} />
                <YAxis {...yAxis} />
                <Tooltip formatter={formatCurrency} />
                <Legend />
                <Bar dataKey="expected" fill="#42A5F5" name="Expected">
                  <LabelList dataKey="expected" position="top" {...labelStyle} formatter={formatCurrency} />
                </Bar>
                <Bar dataKey="actual" fill="#4CAF50" name="Actual">
                  <LabelList dataKey="actual" position="top" {...labelStyle} formatter={formatCurrency} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        );
      default:
        return null;
    }
  };

  const dashboardTitles = {
    overview: 'Department Overview',
    revenue: 'Department wise- Expected vs Actual Revenue',
    volumeOverview: 'Departmental Patient Volume Overview',
    volumeComparison: 'Patient Count by Department',
    profitOverview: 'Profit Overview',
    profitComparison: 'Expected vs Actual Profitability by Department',
  };

  const renderTableForView = () => {
    const TransposedTable = ({ columns, data }) => {
      if (!data.length) return null;

      const headers = columns.map((col) => {
        if (col === 'Category') return 'Department';
        if (col === 'Value') return 'Revenue';
        return col;
      });

      const transposedRows = headers.map((header, idx) => [
        header,
        ...data.map((row) => {
          const key = columns[idx].toLowerCase();
          const val = row[key];
          return typeof val === 'number' ? formatCurrency(val) : val || '';
        }),
      ]);

      return (
        <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
          <tbody>
            {transposedRows.map((row, idx) => (
              <tr key={idx}>
                {row.map((cell, i) => (
                  <td key={i} style={{ border: '1px solid black', padding: '8px', color: 'black', textAlign: 'center' }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    };

    const getSummary = () => {
      const getTopAndWorstDept = (data, key = 'actual') => {
        if (!data || !data.length) return { best: { name: 'N/A', value: 0 }, worst: { name: 'N/A', value: 0 } };
        const best = data.reduce((max, d) => (d[key] > max[key] ? d : max), { [key]: -Infinity });
        const worst = data.reduce((min, d) => (d[key] < min[key] ? d : min), { [key]: Infinity });
        return {
          best: { name: best.department || best.category || 'N/A', value: best[key] },
          worst: { name: worst.department || worst.category || 'N/A', value: worst[key] }
        };
      };

      let summary = '';
      switch (view) {
        case 'overview': {
          const { best, worst } = getTopAndWorstDept(departmentData, 'value');
          summary = `The department with the highest revenue is ${best.name} with ₹${formatCurrency(best.value)}. The lowest revenue was from ${worst.name} with ₹${formatCurrency(worst.value)}.`;
          break;
        }
        case 'revenue': {
          const { best, worst } = getTopAndWorstDept(expectedVsActualRevenueData);
          summary = `The department with the highest actual revenue is ${best.name} with ₹${formatCurrency(best.value)}. The lowest was from ${worst.name} with ₹${formatCurrency(worst.value)}.`;
          break;
        }
        case 'volumeOverview': {
          const { best, worst } = getTopAndWorstDept(actualPatientData, 'patients');
          summary = `The department with the highest patient volume is ${best.name} with ${best.value} patients. The lowest was from ${worst.name} with ${worst.value} patients.`;
          break;
        }
        case 'volumeComparison': {
          const { best, worst } = getTopAndWorstDept(expectedVsActualPatientData);
          summary = `The department with the highest actual patient count is ${best.name} with ${best.value} patients. The lowest was from ${worst.name} with ${worst.value} patients.`;
          break;
        }
        case 'profitOverview': {
          const { best, worst } = getTopAndWorstDept(actualProfitData, 'profit');
          summary = `The department with the highest profitability is ${best.name} with ₹${formatCurrency(best.value)}. The lowest was from ${worst.name} with ₹${formatCurrency(worst.value)}.`;
          break;
        }
        case 'profitComparison': {
          const { best, worst } = getTopAndWorstDept(expectedVsActualProfitData);
          summary = `The department with the highest actual profit is ${best.name} with ₹${formatCurrency(best.value)}. The lowest was from ${worst.name} with ₹${formatCurrency(worst.value)}.`;
          break;
        }
        default:
          summary = '';
      }

      return (
        <div style={{ marginTop: '20px', color: 'black' }}>
          <h2 style={{ color: 'black', fontSize: '20px', marginBottom: '8px' }}>Summary</h2>
          <p style={{ color: 'black', fontSize: '18px', margin: 0 }}>{summary}</p>
        </div>
      );
    };

    switch (view) {
      case 'overview':
        return (
          <>
            <TransposedTable columns={['Category', 'Value']} data={departmentData} />
            {getSummary()}
          </>
        );
      case 'revenue':
        return (
          <>
            <TransposedTable columns={['Department', 'Expected', 'Actual']} data={expectedVsActualRevenueData} />
            {getSummary()}
          </>
        );
      case 'volumeOverview':
        return (
          <>
            <TransposedTable columns={['Department', 'Patients']} data={actualPatientData} />
            {getSummary()}
          </>
        );
      case 'volumeComparison':
        return (
          <>
            <TransposedTable columns={['Department', 'Expected', 'Actual']} data={expectedVsActualPatientData} />
            {getSummary()}
          </>
        );
      case 'profitOverview':
        return (
          <>
            <TransposedTable columns={['Department', 'Profit']} data={actualProfitData} />
            {getSummary()}
          </>
        );
      case 'profitComparison':
        return (
          <>
            <TransposedTable columns={['Department', 'Expected', 'Actual']} data={expectedVsActualProfitData} />
            {getSummary()}
          </>
        );
      default:
        return null;
    }
  };

  const handleDownloadPDF = async () => {
    const input = dashboardRef.current;
    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('landscape');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('dashboard.pdf');
  };

  return (
    <div style={{ marginLeft: '360px', padding: '10px', fontFamily: 'Arial', color: 'black', position: 'relative' }}>
      <button
        onClick={handleDownloadPDF}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: '#1976D2',
          color: 'white',
          padding: '8px 12px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          zIndex: 999
        }}
      >
        Download PDF
      </button>
      <div ref={dashboardRef}>
        <h1 style={{ color: 'black', fontSize: '24px', marginBottom: '10px', fontWeight: 'normal' }}>
          {dashboardTitles[view] || 'Department Dashboard'}
        </h1>
        <div style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scroll">
          {renderChart()}
          {renderTableForView()}
        </div>
      </div>
    </div>
  );
};

export default DepartmentDashboard;