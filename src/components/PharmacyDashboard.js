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
    <text x={x + width / 2} y={y - 5} fill="black" fontSize={12} textAnchor="middle">
      {formatNumber(value)}
    </text>
  );
};

const renderLineLabel = ({ x, y, value }) => {
  if (!value) return null;
  return (
    <text x={x} y={y - 10} fill="black" fontSize={12} textAnchor="middle">
      {formatNumber(value)}
    </text>
  );
};

const PharmacyDashboard = ({ view = 'expected-vs-actual' }) => {
  const [data, setData] = useState([]);
  const dashboardRef = useRef();
  const buttonRef = useRef();

  const handleDownloadPDF = () => {
    const input = dashboardRef.current;
    const button = buttonRef.current;
    if (button) button.style.display = 'none';

    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('pharmacy-dashboard.pdf');
      if (button) button.style.display = 'inline-block';
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

      <h2 className="text-2xl font-normal text-gray-800 mb-2 text-center"> Pharmacy Dashboard</h2>
      

      {/* Chart Title Left Aligned */}
      <div className="text-lg font-normal text-gray-800 mb-2 text-left">
        {view === 'expected-vs-actual'
          ? 'Expected vs Actual Issued & Expired Medications'
          : 'Actual Medications Issued & Expired Over Time'}
      </div>

      <ResponsiveContainer width="100%" height={view === 'expected-vs-actual' ? 400 : 300}>
        {view === 'expected-vs-actual' ? (
          <BarChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fill: 'black' }} />
            <YAxis tickFormatter={formatNumber} tick={{ fill: 'black' }} />
            <Tooltip formatter={(val) => `${val.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="ExpectedIssued" fill="#5A67D8" name="Expected Issued">
              <LabelList content={renderBarLabel} />
            </Bar>
            <Bar dataKey="Issued" fill="#68D391" name="Actual Issued">
              <LabelList content={renderBarLabel} />
            </Bar>
            <Bar dataKey="ExpectedExpired" fill="#ECC94B" name="Expected Expired">
              <LabelList content={renderBarLabel} />
            </Bar>
            <Bar dataKey="Expired" fill="#F56565" name="Actual Expired">
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
            {(view === 'expected-vs-actual'
              ? ['ExpectedIssued', 'Issued', 'ExpectedExpired', 'Expired']
              : ['Issued', 'Expired']
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
        <h4 className="text-xl font-normal text-black mb-2 text-center ">Summary</h4>
        <p className="text-black text-base leading-relaxed">
          Pharmacy trends illustrate the volume of medications issued and expired across months. Issuance is mostly aligned with expectations, while spikes in expired stock may indicate inventory challenges that require further review.
        </p>
      </div>
    </div>
  );
};

export default PharmacyDashboard;