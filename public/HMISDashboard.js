import React, { useEffect, useState, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LabelList
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const formatNumber = (num) => {
  if (!num && num !== 0) return '';
  return `${(num / 1_000_000).toFixed(1)}M`;
};

const renderBarLabel = ({ x, y, width, value, payload }) => {
  if (!value) return null;
  const shift = payload?.month === 'Jan-25' ? 10 : 0;
  return (
    <text
      x={x + width / 2 + shift}
      y={y - 5}
      fill="#000"
      fontSize={14}
      textAnchor="middle"
    >
      {formatNumber(value)}
    </text>
  );
};

const renderLineLabel = ({ x, y, value, payload }) => {
  if (!value) return null;
  const shift = payload?.month === 'Jan-25' ? 10 : 0;
  return (
    <text
      x={x + shift}
      y={y - 10}
      fill="#000"
      fontSize={14}
      textAnchor="middle"
    >
      {formatNumber(value)}
    </text>
  );
};

const FinancialDashboard = ({ chartType = 'overview' }) => {
  const [data, setData] = useState([]);
  const dashboardRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const monthMap = {
      1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May',
      6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct',
      11: 'Nov', 12: 'Dec',
    };

    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/hmis/summary');
        const raw = await res.json();

        const summary = {};

        raw.forEach(item => {
          const rawCategory = item.category || '';
          const rawSubCategory = item.subCategory || '';
          const rawMetric = item.metric || '';
          const rawValue = item.value || item['value\r'] || item[' Value'];

          const category = rawCategory.trim().toLowerCase();
          const subCategory = rawSubCategory.trim().toLowerCase();
          const cleanMetric = rawMetric.trim().toLowerCase();

          const isActual = cleanMetric.startsWith('actual');
          const isExpected = cleanMetric.startsWith('expected');
          const metric = cleanMetric.replace('actual', '').replace('expected', '').trim();
          const value = parseFloat(rawValue || 0);

          const monthNum = parseInt(item.month, 10);
          const monthStr = monthMap[monthNum] || 'UNK';
          const label = `${monthStr}-${String(item.year).slice(-2)}`;

          if (!summary[label]) {
            summary[label] = {
              month: label,
              Expenses: 0,
              Revenue: 0,
              ExpectedExpense: 0,
              ExpectedRevenue: 0
            };
          }

          if (category === 'general') {
            if (isActual || subCategory === 'actual') {
              if (metric === 'expense') summary[label].Expenses += value;
              else if (metric === 'revenue') summary[label].Revenue += value;
            } else if (isExpected || subCategory === 'expected') {
              if (metric === 'expense') summary[label].ExpectedExpense += value;
              else if (metric === 'revenue') summary[label].ExpectedRevenue += value;
            }
          }
        });

        const finalData = Object.values(summary).sort((a, b) => {
          const order = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const [am] = a.month.trim().split('-');
          const [bm] = b.month.trim().split('-');
          return order.indexOf(am) - order.indexOf(bm);
        });

        setData(finalData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = async () => {
    const button = buttonRef.current;
    const element = dashboardRef.current;

    if (button) button.style.display = 'none';

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height + 60]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('financial_dashboard.pdf');

    if (button) button.style.display = 'block';
  };

  return (
    <div style={{ padding: '10px', fontFamily: "'Futura', sans-serif", position: 'relative' }}>
      {/* Download Button */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 999 }}>
        <button
          ref={buttonRef}
          onClick={handleDownload}
          style={{
            backgroundColor: '#007bff',
            color: '#fff',
            padding: '6px 12px',
            fontSize: '13px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Download PDF
        </button>
      </div>

      <div ref={dashboardRef}>
        {chartType === 'expected-vs-actual' ? (
          <>
            <h1 style={{ color: 'black', fontSize: '22px', marginBottom: '10px', fontWeight: 'normal' }}>
              Expected vs Actual: Expense & Revenue Insights
            </h1>
            <h4 style={{ fontSize: '16px', color: '#000', marginBottom: '10px', fontWeight: 'normal' }}>
              Monthly Expenses and Revenue: Expected vs Actual
            </h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: '#000' }} />
                <YAxis tickFormatter={formatNumber} domain={[0, 'auto']} tick={{ fill: '#000' }} />
                <Tooltip formatter={(val) => `${val.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="ExpectedExpense" fill="#42A5F5" name="Expected Expense">
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Bar dataKey="Expenses" fill="#4CAF50" name="Expenses">
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Bar dataKey="ExpectedRevenue" fill="#FFB300" name="Expected Revenue">
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Bar dataKey="Revenue" fill="#E53935" name="Revenue">
                  <LabelList content={renderBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <>
            <h1 style={{ color: 'black', fontSize: '22px', marginBottom: '10px', fontWeight: 'normal' }}>
              Financial Trend Overview
            </h1>
            <h4 style={{ fontSize: '16px', color: '#000', marginBottom: '10px', fontWeight: 'normal' }}>
              Monthly Expenses and Revenue
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: '#000' }} />
                <YAxis
                  tickFormatter={formatNumber}
                  domain={[0, dataMax => Math.ceil(dataMax * 1.1)]}
                  tick={{ fill: '#000' }}
                />
                <Tooltip formatter={(val) => `${val.toLocaleString()}`} />
                <Legend />
                <Line type="linear" dataKey="Expenses" stroke="#1E88E5" name="Expenses" label={renderLineLabel} strokeWidth={2} />
                <Line type="linear" dataKey="Revenue" stroke="#D32F2F" name="Revenue" label={renderLineLabel} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}

        <br />

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ background: '#f4f4f4' }}>
            <tr>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Category</th>
              {data.map(item => (
                <th key={item.month} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {item.month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(chartType === 'expected-vs-actual'
              ? ['ExpectedExpense', 'Expenses', 'ExpectedRevenue', 'Revenue']
              : ['Expenses', 'Revenue']
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

        <h2 style={{ color: 'black', marginTop: '20px', marginBottom: '12px', fontSize: '20px' }}>Summary</h2>
        <p style={{ fontSize: '18px', color: 'black' }}>
          Actual expenses remained largely within budget, but consistent revenue shortfalls against expectations highlight a need for improved revenue generation or more realistic forecasting.
        </p>
      </div>
    </div>
  );
};

export default FinancialDashboard;