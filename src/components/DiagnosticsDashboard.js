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
    <text x={x + width / 2} y={y - 5} fill="#000" fontSize={12} textAnchor="middle">
      {formatNumber(value)}
    </text>
  );
};

const renderLineLabel = ({ x, y, value }) => {
  if (!value) return null;
  return (
    <text x={x} y={y - 10} fill="#000" fontSize={12} textAnchor="middle">
      {formatNumber(value)}
    </text>
  );
};

const DiagnosticsDashboard = ({ view = 'overview' }) => {
  const [data, setData] = useState([]);
  const dashboardRef = useRef();
  const buttonRef = useRef();

  const handleDownloadPDF = async () => {
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
      unit: 'pt',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('diagnostics-dashboard.pdf');

    if (button) button.style.display = 'inline-block';
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
          const [am, ay] = a.month.split('-');
          const [bm, by] = b.month.split('-');
          const aIndex = order.indexOf(am) + parseInt(ay, 10) * 12;
          const bIndex = order.indexOf(bm) + parseInt(by, 10) * 12;
          return aIndex - bIndex;
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
    <div className="w-full px-4 py-6 font-sans relative" ref={dashboardRef}>
      {/* Download Button */}
      <div className="absolute top-4 right-4 z-50">
        <button
          ref={buttonRef}
          onClick={handleDownloadPDF}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          Download PDF
        </button>
      </div>

      <h2 className="text-2xl font-normal text-gray-800 mb-2 text-center">Diagnostic Dashboard</h2>

      <div className="text-lg font-normal text-gray-800 mb-2 text-left">
        {view === 'overview'
          ? 'Monthly Lab and Radiology Tests'
          : 'Expected vs Actual Lab & Radiology Tests'}
      </div>

      <ResponsiveContainer width="101%" height={view === 'overview' ? 400 : 400}>
        {view === 'overview' ? (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fill: 'black' }} />
            <YAxis tickFormatter={formatNumber} tick={{ fill: 'black' }} />
            <Tooltip formatter={(val) => `${val.toLocaleString()}`} />
            <Legend />
            <Line dataKey="LabTests" stroke="#1E88E5" name="Lab Tests" strokeWidth={2} label={renderLineLabel} />
            <Line dataKey="RadiologyTests" stroke="#D32F2F" name="Radiology Tests" strokeWidth={2} label={renderLineLabel} />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fill: 'black' }} />
            <YAxis tickFormatter={formatNumber} tick={{ fill: 'black' }} />
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
        )}
      </ResponsiveContainer>

      <div className="mt-10 overflow-x-auto">
        <table className="min-w-full text-sm border text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Category</th>
              {data.map(item => (
                <th key={item.month} className="p-2 border">{item.month}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(view === 'overview'
              ? ['LabTests', 'RadiologyTests']
              : ['ExpectedLabTests', 'LabTests', 'ExpectedRadiologyTests', 'RadiologyTests']
            ).map(key => (
              <tr key={key}>
                <td className="p-2 border font-medium font-bold text-gray-700">{key.replace(/([A-Z])/g, ' $1')}</td>
                {data.map(item => (
                  <td key={`${item.month}-${key}`} className="p-2 border">
                    {item[key]?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h4 className="text-xl font-normal text-black mb-2 text-center">Summary</h4>
        <p className="text-black text-base leading-relaxed">
          Lab and radiology test volumes showed monthly fluctuations. While lab tests often met expectations,
          radiology tests occasionally fell short, indicating potential areas for process or equipment optimization.
        </p>
      </div>
    </div>
  );
};

export default DiagnosticsDashboard;