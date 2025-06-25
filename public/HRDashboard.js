import React, { useEffect, useRef, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LabelList
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const formatNumber = (num) => {
  if (!num) return '';
  return `${(num / 1_000).toFixed(1)}k`;
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
      style={{ fontFamily: 'Quicksand, sans-serif' }}
    >
      {value}
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
      style={{ fontFamily: 'Quicksand, sans-serif' }}
    >
      {value}
    </text>
  );
};

const HRDashboard = ({ chartType = 'overview' }) => {
  const [data, setData] = useState([]);
  const view = chartType;
  const pdfRef = useRef();
  const buttonRef = useRef();

  const handleDownloadPDF = async () => {
    if (buttonRef.current) buttonRef.current.style.display = 'none';
    await new Promise(res => setTimeout(res, 500));

    const canvas = await html2canvas(pdfRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('HR_Dashboard.pdf');

    if (buttonRef.current) buttonRef.current.style.display = 'inline-block';
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
          const metric = (item.metric || '').toLowerCase().replace(/actual |expected /, '').trim();

          const rawValue = item.value || item['value\r'] || '0';
          const value = parseFloat(rawValue.toString().replace('\r', '').trim());

          const monthNum = parseInt(item.month, 10);
          const year = item.year?.toString().slice(-2);
          const label = `${monthMap[monthNum] || 'UNK'}-${year}`;

          if (category === 'workforce') {
            if (!summary[label]) {
              summary[label] = {
                month: label,
                Joinees: 0,
                Resignations: 0,
                ExpectedJoinees: 0,
                ExpectedResignations: 0
              };
            }

            if (subCategory === 'actual') {
              if (metric === 'joinees') summary[label].Joinees += value;
              else if (metric === 'resignations') summary[label].Resignations += value;
            } else if (subCategory === 'expected') {
              if (metric === 'joinees') summary[label].ExpectedJoinees += value;
              else if (metric === 'resignations') summary[label].ExpectedResignations += value;
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
        console.error('Error fetching HR data:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '10px', fontFamily: 'Quicksand, sans-serif', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
        <button
          ref={buttonRef}
          onClick={handleDownloadPDF}
          style={{
            backgroundColor: '#1976d2',
            color: 'white',
            padding: '4px 10px',
            fontSize: '12px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'Quicksand, sans-serif',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}
        >
          Download PDF
        </button>
      </div>

      <div ref={pdfRef}>
        {view === 'expected-vs-actual' ? (
          <>
            <h1 style={{ color: 'black', fontSize: '22px', marginBottom: '10px', fontWeight: 'normal' }}>
              Expected vs Actual: Joinees & Resignations
            </h1>
            <h4 style={{ fontSize: '16px', color: '#000', marginBottom: '10px', fontWeight: 'normal' }}>
              Monthly Joinings & Resignations : Expected vs Actual
            </h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: '#000', fontFamily: 'Quicksand, sans-serif' }} />
                <YAxis tick={{ fill: '#000', fontFamily: 'Quicksand, sans-serif' }} />
                <Tooltip formatter={(val) => `${val}`} />
                <Legend />
                <Bar dataKey="ExpectedJoinees" fill="#42A5F5" name="Expected Joinees">
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Bar dataKey="Joinees" fill="#4CAF50" name="Joinees">
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Bar dataKey="ExpectedResignations" fill="#FFB300" name="Expected Resignations">
                  <LabelList content={renderBarLabel} />
                </Bar>
                <Bar dataKey="Resignations" fill="#E53935" name="Resignations">
                  <LabelList content={renderBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <>
            <h1 style={{ color: 'black', fontSize: '22px', marginBottom: '10px', fontWeight: 'normal' }}>
              HR Trend Overview
            </h1>
            <h4 style={{ fontSize: '16px', color: '#000', marginBottom: '10px', fontWeight: 'normal' }}>
              Monthly Workforce Summary
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: '#000', fontFamily: 'Quicksand, sans-serif' }} />
                <YAxis tick={{ fill: '#000', fontFamily: 'Quicksand, sans-serif' }} />
                <Tooltip formatter={(val) => `${val}`} />
                <Legend />
                <Line type="linear" dataKey="Joinees" stroke="#1E88E5" strokeWidth={2} name="Joinees">
                  <LabelList content={renderLineLabel} />
                </Line>
                <Line type="linear" dataKey="Resignations" stroke="#D32F2F" strokeWidth={2} name="Resignations">
                  <LabelList content={renderLineLabel} />
                </Line>
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
            {(view === 'overview'
              ? ['Joinees', 'Resignations']
              : ['ExpectedJoinees', 'Joinees', 'ExpectedResignations', 'Resignations']
            ).map(key => (
              <tr key={key}>
                <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold', textAlign: 'center' }}>
                  {key.replace(/([A-Z])/g, ' $1')}
                </td>
                {data.map(item => (
                  <td
                    key={`${item.month}-${key}`}
                    style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}
                  >
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
          Workforce trends reveal fluctuations in joinees and resignations across months.
          Joinee numbers were mostly aligned with expectations, but resignation rates occasionally exceeded projections,
          indicating potential retention challenges in certain departments or periods.
        </p>
      </div>
    </div>
  );
};

export default HRDashboard;
