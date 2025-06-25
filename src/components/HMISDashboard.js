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
    <text x={x + width / 2 + shift} y={y - 5} fill="#000" fontSize={14} textAnchor="middle">
      {formatNumber(value)}
    </text>
  );
};

const renderLineLabel = ({ x, y, value, payload }) => {
  if (!value) return null;
  const shift = payload?.month === 'Jan-25' ? 10 : 0;
  return (
    <text x={x + shift} y={y - 10} fill="#000" fontSize={14} textAnchor="middle">
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
      11: 'Nov', 12: 'Dec'
    };

    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/hmis/summary');
        const raw = await res.json();
        const summary = {};

        raw.forEach(item => {
          const category = (item.category || '').trim().toLowerCase();
          const subCategory = (item.subCategory || '').trim().toLowerCase();
          const metricRaw = (item.metric || '').trim().toLowerCase();
          const isActual = metricRaw.startsWith('actual');
          const isExpected = metricRaw.startsWith('expected');
          const metric = metricRaw.replace('actual', '').replace('expected', '').trim();

          const rawVal = item.value || item['value\r'] || item[' Value'];
          const value = parseFloat(rawVal) || 0;

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
              if (metric === 'revenue') summary[label].Revenue += value;
            } else if (isExpected || subCategory === 'expected') {
              if (metric === 'expense') summary[label].ExpectedExpense += value;
              if (metric === 'revenue') summary[label].ExpectedRevenue += value;
            }
          }
        });

        const ordered = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const finalData = Object.values(summary).sort((a,b) => {
          const am = a.month.split('-')[0], bm = b.month.split('-')[0];
          return ordered.indexOf(am) - ordered.indexOf(bm);
        });

        setData(finalData);
      } catch (err) {
        console.error('Error fetching financial data:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDownloadPDF = () => {
    const element = dashboardRef.current;
    const button = buttonRef.current;
    if (button) button.style.display = 'none';

    html2canvas(element, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('financial-dashboard.pdf');
      if (button) button.style.display = 'inline-block';
    });
  };

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

      <h2 className="text-2xl font-normal text-gray-800 mb-2 text-center">Financial Dashboard</h2>

      <div className="text-lg font-normal text-gray-800 mb-2 text-left">
        {chartType === 'overview'
          ? 'Monthly Expenses and Revenue'
          : 'Monthly Expenses and Revenue: Expected vs Actual'}
      </div>

      <ResponsiveContainer width="100%" height={chartType === 'overview' ? 300 : 400}>
        {chartType === 'overview' ? (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fill: 'black' }} />
            <YAxis
              tickFormatter={formatNumber}
              domain={[0, dataMax => Math.ceil(dataMax * 1.1)]}
              tick={{ fill: 'black' }}
            />
            <Tooltip formatter={val => `${val.toLocaleString()}`} />
            <Legend />
            <Line
              type="linear"
              dataKey="Expenses"
              stroke="#1E88E5"
              name="Expenses"
              label={renderLineLabel}
              strokeWidth={2}
            />
            <Line
              type="linear"
              dataKey="Revenue"
              stroke="#D32F2F"
              name="Revenue"
              label={renderLineLabel}
              strokeWidth={2}
            />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fill: 'black' }} />
            <YAxis tickFormatter={formatNumber} tick={{ fill: 'black' }} />
            <Tooltip formatter={val => `${val.toLocaleString()}`} />
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
            {(chartType === 'overview'
              ? ['Expenses', 'Revenue']
              : ['ExpectedExpense', 'Expenses', 'ExpectedRevenue', 'Revenue']
            ).map(k => (
              <tr key={k}>
                <td className="p-2 border font-bold">{k.replace(/([A-Z])/g, ' $1')}</td>
                {data.map(item => (
                  <td key={`${item.month}-${k}`} className="p-2 border">
                    {item[k]?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '0'}
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
          Actual expenses largely aligned with budget, while consistent revenue shortfalls highlight the need for improved 
          forecasting or new revenue strategies.
        </p>
      </div>
    </div>
  );
};

export default FinancialDashboard;