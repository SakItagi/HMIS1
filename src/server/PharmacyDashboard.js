import React, { useEffect, useState, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LabelList
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const formatNumber = (num) => {
  if (!num && num !== 0) return '';
  return `${(num / 1_000).toFixed(1)}K`;
};

const renderBarLabel = ({ x, y, width, value }) => {
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="black"
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
      fill="black"
      fontSize={14}
      textAnchor="middle"
    >
      {formatNumber(value)}
    </text>
  );
};

const PharmacyDashboard = ({ view = 'overview' }) => {
  const [data, setData] = useState([]);
  const dashboardRef = useRef();

  const handleDownloadPDF = () => {
    const input = dashboardRef.current;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('pharmacy-dashboard.pdf');
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
          const category = (item.category || '').toLowerCase().trim();
          const subCategory = (item.subCategory || '').toLowerCase().trim();
          let metric = (item.metric || '').toLowerCase().replace(/expected|actual/g, '').trim();
          const rawValue = item.value || item['value\r'] || '0';
          const value = parseFloat(rawValue.toString().replace('\r', '').trim());
          const monthNum = parseInt(item.month, 10);
          const year = item.year?.toString().slice(-2);
          const label = `${monthMap[monthNum] || 'UNK'}-${year}`;

          if (category === 'pharmacy') {
            if (!summary[label]) {
              summary[label] = {
                month: label,
                Issued: 0,
                Expired: 0,
                ExpectedIssued: 0,
                ExpectedExpired: 0
              };
            }

            if (subCategory === 'actual') {
              if (metric === 'issued') summary[label].Issued += value;
              else if (metric === 'expired') summary[label].Expired += value;
            } else if (subCategory === 'expected') {
              if (metric === 'issued') summary[label].ExpectedIssued += value;
              else if (metric === 'expired') summary[label].ExpectedExpired += value;
            }
          }
        });

        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const finalData = Object.values(summary).sort((a, b) => {
          const [aMonth, aYear] = a.month.split('-');
          const [bMonth, bYear] = b.month.split('-');
          const aIndex = monthOrder.indexOf(aMonth) + parseInt(aYear, 10) * 12;
          const bIndex = monthOrder.indexOf(bMonth) + parseInt(bYear, 10) * 12;
          return aIndex - bIndex;
        });

        setData(finalData);
      } catch (err) {
        console.error('Error fetching Pharmacy data:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '10px', fontFamily: 'Futura, sans-serif' }}>
      {/* Download Button (non-intrusive) */}
      <div style={{ textAlign: 'right', marginBottom: '8px' }}>
        <button
          onClick={handleDownloadPDF}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '8px 14px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Download PDF
        </button>
      </div>

      {/* Dashboard content to capture */}
      <div ref={dashboardRef}>
        <h1 style={{ color: 'black', fontSize: '22px', marginBottom: '10px', fontWeight: 'normal' }}>
          Pharmacy Trend Overview
        </h1>

        <h4 style={{ fontSize: '16px', color: '#000', marginBottom: '10px', fontWeight: 'normal', font: 'Futura' }}>
          {view === 'expected-vs-actual'
            ? 'Expected vs Actual Issued & Expired Medications'
            : 'Actual Medications Issued & Expired Over Time'}
        </h4>

        <ResponsiveContainer width="100%" height={view === 'expected-vs-actual' ? 400 : 300}>
          {view === 'expected-vs-actual' ? (
            <BarChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: 'black' }} />
              <YAxis tickFormatter={formatNumber} tick={{ fill: 'black' }} />
              <Tooltip formatter={(val) => `${val.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="ExpectedIssued" fill="#42A5F5" name="Expected Issued">
                <LabelList content={renderBarLabel} />
              </Bar>
              <Bar dataKey="Issued" fill="#4CAF50" name="Issued">
                <LabelList content={renderBarLabel} />
              </Bar>
              <Bar dataKey="ExpectedExpired" fill="#FFB300" name="Expected Expired">
                <LabelList content={renderBarLabel} />
              </Bar>
              <Bar dataKey="Expired" fill="#E53935" name="Expired">
                <LabelList content={renderBarLabel} />
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: 'black' }} />
              <YAxis tickFormatter={formatNumber} tick={{ fill: 'black' }} />
              <Tooltip formatter={(val) => `${val.toLocaleString()}`} />
              <Legend />
              <Line type="linear" dataKey="Issued" stroke="#1E88E5" name="Issued" strokeWidth={2} label={renderLineLabel} />
              <Line type="linear" dataKey="Expired" stroke="#D32F2F" name="Expired" strokeWidth={2} label={renderLineLabel} />
            </LineChart>
          )}
        </ResponsiveContainer>

        <br />

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'center' }}>
          <thead style={{ background: '#f4f4f4' }}>
            <tr>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Category</th>
              {data.map(item => (
                <th key={item.month} style={{ padding: '8px', border: '1px solid #ddd' }}>{item.month}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(view === 'overview'
              ? ['Issued', 'Expired']
              : ['ExpectedIssued', 'Issued', 'ExpectedExpired', 'Expired']
            ).map(key => (
              <tr key={key}>
                <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                  {key.replace(/([A-Z])/g, ' $1')}
                </td>
                {data.map(item => (
                  <td key={`${item.month}-${key}`} style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {item[key]?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <h2 style={{ color: 'black', marginTop: '20px', marginBottom: '12px', fontSize: '20px' }}>
          Summary
        </h2>
        <p style={{ fontSize: '18px', color: 'black' }}>
          Pharmacy trends illustrate the volume of medications issued and expired across months.
          Issuance was largely aligned with expectations, while occasional spikes in expired stock may indicate inventory management issues.
        </p>
      </div>
    </div>
  );
};

export default PharmacyDashboard;