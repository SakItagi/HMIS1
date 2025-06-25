import React, { useEffect, useRef, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LabelList
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const formatNumber = (num) => {
  if (!num && num !== 0) return '';
  if (num >= 1_000_000) return `${Math.round(num / 1_000_000)}M`;
  if (num >= 1_000) return `${Math.round(num / 1_000)}K`;
  return `${Math.round(num)}`;
};

const renderBarLabel = ({ x, y, width, value }) => {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 5} fill="#000" fontSize={14} textAnchor="middle">
      {formatNumber(value)}
    </text>
  );
};

const renderLineLabel = ({ x, y, value }) => {
  if (!value) return null;
  return (
    <text x={x} y={y - 10} fill="#000" fontSize={14} textAnchor="middle">
      {formatNumber(value)}
    </text>
  );
};

const MaintenanceDashboard = ({ view = 'overview' }) => {
  const [data, setData] = useState([]);
  const dashboardRef = useRef(null);
  const buttonRef = useRef(null);

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
          const category = (item.category || '').toLowerCase().trim();
          const subCategory = (item.subCategory || '').toLowerCase().trim();
          const metric = (item.metric || '').toLowerCase().replace(/actual |expected /, '').trim();
          const rawValue = item.value || item['value\r'] || '0';
          const value = parseFloat(rawValue.toString().replace('\r', '').trim());

          const monthNum = parseInt(item.month, 10);
          const year = item.year?.toString().slice(-2);
          const label = `${monthMap[monthNum] || 'UNK'}-${year}`;

          if (category === 'maintenance') {
            if (!summary[label]) {
              summary[label] = {
                month: label,
                RepairCost: 0,
                PurchaseCost: 0,
                ExpectedRepairCost: 0,
                ExpectedPurchaseCost: 0
              };
            }

            if (subCategory === 'actual') {
              if (metric === 'repair cost') summary[label].RepairCost += value;
              else if (metric === 'purchase cost') summary[label].PurchaseCost += value;
            } else if (subCategory === 'expected') {
              if (metric === 'repair cost') summary[label].ExpectedRepairCost += value;
              else if (metric === 'purchase cost') summary[label].ExpectedPurchaseCost += value;
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
        console.error('Error fetching Maintenance data:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const downloadPDF = async () => {
    if (buttonRef.current) buttonRef.current.style.display = 'none';
    await new Promise(res => setTimeout(res, 500));

    const canvas = await html2canvas(dashboardRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('MaintenanceDashboard.pdf');

    if (buttonRef.current) buttonRef.current.style.display = 'inline-block';
  };

  return (
    <div style={{ padding: '10px', fontFamily: 'Futura, Arial, sans-serif', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
        <button
          ref={buttonRef}
          onClick={downloadPDF}
          style={{
            backgroundColor: '#1976d2',
            color: 'white',
            padding: '4px 10px',
            fontSize: '12px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'Futura, Arial, sans-serif',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}
        >
          Download PDF
        </button>
      </div>

      {/* Wrap all content */}
      <div ref={dashboardRef} style={{ padding: '10px' }}>
        {view === 'expected-vs-actual' ? (
          <>
            <h1 style={{ fontSize: '22px', color: 'black', fontWeight: 'normal' }}>Expected vs Actual: Repair & Purchase Costs</h1>
            <h4 style={{ fontSize: '16px', color: 'black' }}>
              Monthly Comparison of Actual vs Expected Expenses on Maintenance & Repairs and New Purchases
            </h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" style={{ fill: 'black' }} />
                <YAxis tickFormatter={formatNumber} style={{ fill: 'black' }} />
                <Tooltip formatter={(val) => `${val.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="ExpectedRepairCost" fill="#42A5F5" name="Expected Repair Cost">
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Bar dataKey="RepairCost" fill="#4CAF50" name="Repair Cost">
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Bar dataKey="ExpectedPurchaseCost" fill="#FFB300" name="Expected Purchase Cost">
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Bar dataKey="PurchaseCost" fill="#E53935" name="Purchase Cost">
                  <LabelList content={renderBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '22px', color: 'black', fontWeight: 'normal' }}>Maintenance Trend Overview</h1>
            <h4 style={{ fontSize: '16px', color: 'black' }}>
              Repair & Maintenance Cost and New Equipment Expense by Month
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" style={{ fill: 'black' }} />
                <YAxis tickFormatter={formatNumber} style={{ fill: 'black' }} />
                <Tooltip formatter={(val) => `${val.toLocaleString()}`} />
                <Legend />
                <Line type="linear" dataKey="RepairCost" stroke="#1E88E5" strokeWidth={2} name="Repair Cost" label={renderLineLabel} />
                <Line type="linear" dataKey="PurchaseCost" stroke="#D32F2F" strokeWidth={2} name="Purchase Cost" label={renderLineLabel} />
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
                <th key={item.month} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{item.month}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(view === 'overview' ? ['RepairCost', 'PurchaseCost'] : ['ExpectedRepairCost', 'RepairCost', 'ExpectedPurchaseCost', 'PurchaseCost']).map(key => (
              <tr key={key}>
                <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold', textAlign: 'center' }}>
                  {key.replace(/([A-Z])/g, ' $1')}
                </td>
                {data.map(item => (
                  <td key={`${item.month}-${key}`} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    {item[key]?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <h2 style={{ color: 'black', marginTop: '20px', fontSize: '20px' }}>Summary</h2>
        <p style={{ fontSize: '18px', color: 'black' }}>
          Maintenance trends indicate fluctuations in repair and purchase costs over time. While purchase costs were mostly predictable,
          repair costs occasionally exceeded expectations, suggesting possible equipment failures or urgent maintenance issues in certain months.
        </p>
      </div>
    </div>
  );
};

export default MaintenanceDashboard;