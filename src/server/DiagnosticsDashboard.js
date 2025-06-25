import React, { useEffect, useState, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LabelList
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const formatNumber = (num) => {
  if (!num && num !== 0) return '';
  return `${(num / 1000).toFixed(0)}K`;
};

const renderBarLabel = ({ x, y, width, value }) => {
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="#000"
      fontSize={14}
      textAnchor="middle"
    >
      {formatNumber(value)}
    </text>
  );
};

const renderLineLabel = ({ x, y, value }) => {
  if (!value) return null;
  return (
    <text
      x={x}
      y={y - 10}
      fill="#000"
      fontSize={14}
      textAnchor="middle"
    >
      {formatNumber(value)}
    </text>
  );
};

const DiagnosticsDashboard = ({ view = 'overview' }) => {
  const [data, setData] = useState([]);
  const dashboardRef = useRef();

  const downloadPDF = () => {
    const input = dashboardRef.current;
    html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save('DiagnosticsDashboard.pdf');
    });
  };

  useEffect(() => {
    const monthMap = {
      1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May',
      6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct',
      11: 'Nov', 12: 'Dec'
    };

    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/hmis/summary');
        const raw = await res.json();

        const summary = {};
        raw.forEach(item => {
          const category = (item.category || '').toLowerCase();
          const subCategory = (item.subCategory || '').toLowerCase();
          const metric = (item.metric || '').toLowerCase().replace('actual ', '').replace('expected ', '').trim();
          const rawValue = item['value'] || item['value\r'] || '0';
          const value = parseFloat(rawValue.toString().replace('\r', '').trim());
          const monthNum = parseInt(item.month, 10);
          const label = `${monthMap[monthNum] || 'UNK'}-${String(item.year).slice(-2)}`;

          if (!summary[label]) {
            summary[label] = {
              month: label,
              LabTests: 0,
              RadiologyTests: 0,
              ExpectedLabTests: 0,
              ExpectedRadiologyTests: 0
            };
          }

          if (category === 'diagnostic') {
            if (subCategory === 'actual') {
              if (metric === 'lab tests') summary[label].LabTests += value;
              else if (metric === 'radiology tests') summary[label].RadiologyTests += value;
            } else if (subCategory === 'expected') {
              if (metric === 'lab tests') summary[label].ExpectedLabTests += value;
              else if (metric === 'radiology tests') summary[label].ExpectedRadiologyTests += value;
            }
          }
        });

        const finalData = Object.values(summary).sort((a, b) => {
          const order = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const [am] = a.month.split('-');
          const [bm] = b.month.split('-');
          return order.indexOf(am) - order.indexOf(bm);
        });

        setData(finalData);
      } catch (err) {
        console.error('Error fetching diagnostics data:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '10px', fontFamily: 'Arial' }}>
      {/* Download Button */}
      <div style={{ textAlign: 'right', marginBottom: '10px' }}>
        <button
          onClick={downloadPDF}
          style={{
            backgroundColor: '#4CAF50',
            color: '#fff',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Download PDF
        </button>
      </div>

      <div ref={dashboardRef}>
        {/* Diagnostic Title and Chart */}
        {view === 'expected-vs-actual' ? (
          <>
            <h1 style={{ fontSize: '22px', color: '#000', marginBottom: '12px' }}>
              Expected vs Actual: Lab and Radiology Tests Insights
            </h1>
            <h4 style={{ fontSize: '16px', color: '#000', marginBottom: '10px' }}>
              Monthly Lab and Radiology Test
            </h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="black" />
                <YAxis tickFormatter={formatNumber} stroke="black" />
                <Tooltip formatter={(val) => `${val.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="ExpectedLabTests" fill="#42A5F5" name="Expected Lab Tests">
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Bar dataKey="LabTests" fill="#4CAF50" name="Lab Tests">
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Bar dataKey="ExpectedRadiologyTests" fill="#FFB300" name="Expected Radiology Tests">
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Bar dataKey="RadiologyTests" fill="#E53935" name="Radiology Tests">
                  <LabelList content={renderBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '22px', color: '#000', marginBottom: '12px' }}>
              Diagnostic Trend Overview
            </h1>
            <h4 style={{ fontSize: '16px', color: '#000', marginBottom: '10px' }}>
              Monthly Lab and Radiology Test: Expected vs Actual
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="black" />
                <YAxis tickFormatter={formatNumber} stroke="black" />
                <Tooltip formatter={(val) => `${val.toLocaleString()}`} />
                <Legend />
                <Line
                  type="linear"
                  dataKey="LabTests"
                  stroke="#1E88E5"
                  strokeWidth={2}
                  name="Lab Tests"
                  label={renderLineLabel}
                />
                <Line
                  type="linear"
                  dataKey="RadiologyTests"
                  stroke="#D32F2F"
                  strokeWidth={2}
                  name="Radiology Tests"
                  label={renderLineLabel}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}

        <br />

        {/* Summary Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ background: '#f4f4f4' }}>
            <tr>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Category</th>
              {data.map(item => (
                <th key={item.month} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{item.month}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(view === 'overview'
              ? ['LabTests', 'RadiologyTests']
              : ['ExpectedLabTests', 'LabTests', 'ExpectedRadiologyTests', 'RadiologyTests']
            ).map(key => (
              <tr key={key}>
                <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold', textAlign: 'center' }}>
                  {key.replace(/([A-Z])/g, ' $1')}
                </td>
                {data.map(item => (
                  <td key={`${item.month}-${key}`} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    {item[key]?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Text */}
        <h2 style={{ color: 'black', marginTop: '20px', fontSize: '20px' }}>Summary</h2>
        <p style={{ fontSize: '17px', color: 'black' }}>
          Lab and radiology test volumes showed noticeable variation across months.
          While lab testing generally matched expectations, radiology performance occasionally fell short of targets,
          suggesting a need for improved scheduling, equipment uptime, or staffing in radiology departments.
        </p>
      </div>
    </div>
  );
};

export default DiagnosticsDashboard;