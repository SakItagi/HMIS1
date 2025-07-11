import React, { useEffect, useRef, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LabelList
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const formatK = (num) => {
  if (isNaN(num)) return '';
  return `${(num / 1000).toFixed(1)}K`;
};

const renderBarLabel = ({ x, y, width, value }) => {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 5} fill="#000" fontSize={14} textAnchor="middle">
      {formatK(value)}
    </text>
  );
};

const renderLineLabel = ({ x, y, value }) => {
  if (!value) return null;
  return (
    <text x={x} y={y - 10} fill="#000" fontSize={14} textAnchor="middle">
      {formatK(value)}
    </text>
  );
};

const AdmissionsDischargesDashboard = ({ chartType = 'line' }) => {
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

          if (category === 'admissions and discharges') {
            if (!summary[label]) {
              summary[label] = {
                month: label,
                Admissions: 0,
                Discharges: 0,
                ExpectedAdmissions: 0,
                ExpectedDischarges: 0
              };
            }

            if (subCategory === 'actual') {
              if (metric === 'admissions') summary[label].Admissions += value;
              else if (metric === 'discharges') summary[label].Discharges += value;
            } else if (subCategory === 'expected') {
              if (metric === 'admissions') summary[label].ExpectedAdmissions += value;
              else if (metric === 'discharges') summary[label].ExpectedDischarges += value;
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
        console.error('Error fetching Admissions data:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const downloadPDF = () => {
    const input = dashboardRef.current;
    const button = buttonRef.current;
    if (button) button.style.display = 'none';

    html2canvas(input, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('admissions_discharge_dashboard.pdf');

      if (button) button.style.display = 'inline-block';
    });
  };

  return (
    <div ref={dashboardRef} style={{ padding: '10px', fontFamily: "'Futura', sans-serif", position: 'relative' }}>
      {/* Updated top-right PDF button */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 999 }}>
        <button
          ref={buttonRef}
          onClick={downloadPDF}
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

      {chartType === 'bar' ? (
        <>
          <h1 style={{ color: 'black', fontSize: '22px', marginBottom: '10px', fontWeight: 'normal' }}>
            Expected vs Actual: Admissions & Discharges
          </h1>
          <h4 style={{ fontSize: '16px', color: '#000', marginBottom: '10px', fontWeight: 'normal' }}>
            Monthly Admission and Discharges : Expected vs Actual
          </h4>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(val) => `${val.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="ExpectedAdmissions" fill="#42A5F5" name="Expected Admissions">
                <LabelList content={renderBarLabel} />
              </Bar>
              <Bar dataKey="Admissions" fill="#4CAF50" name="Admissions">
                <LabelList content={renderBarLabel} />
              </Bar>
              <Bar dataKey="ExpectedDischarges" fill="#FFB300" name="Expected Discharges">
                <LabelList content={renderBarLabel} />
              </Bar>
              <Bar dataKey="Discharges" fill="#E53935" name="Discharges">
                <LabelList content={renderBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      ) : (
        <>
          <h1 style={{ color: 'black', fontSize: '22px', marginBottom: '10px', fontWeight: 'normal' }}>
            Admissions & Discharges Overview
          </h1>
          <h4 style={{ fontSize: '16px', color: '#000', marginBottom: '10px', fontWeight: 'normal' }}>
            Monthly Admission and Discharges
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(val) => `${val.toLocaleString()}`} />
              <Legend />
              <Line type="linear" dataKey="Admissions" stroke="#1E88E5" strokeWidth={2} name="Admissions" label={renderLineLabel} />
              <Line type="linear" dataKey="Discharges" stroke="#D32F2F" strokeWidth={2} name="Discharges" label={renderLineLabel} />
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
          {(chartType === 'bar'
            ? ['ExpectedAdmissions', 'Admissions', 'ExpectedDischarges', 'Discharges']
            : ['Admissions', 'Discharges']
          ).map(key => (
            <tr key={key}>
              <td style={{
                padding: '8px',
                border: '1px solid #ddd',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
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
        Admissions and discharges trends show seasonal changes in hospital inflow and outflow.
        While discharges were largely stable, admissions fluctuated in some months—potentially due to
        seasonal illnesses, staffing, or bed availability. Comparing expected vs actual values can help optimize hospital capacity planning.
      </p>
    </div>
  );
};

export default AdmissionsDischargesDashboard;