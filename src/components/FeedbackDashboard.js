import React, { useEffect, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const formatNumber = (num) => {
  if (!num && num !== 0) return '';
  return `${Math.round(parseFloat(num))}`;
};

const renderBarLabel = ({ x, y, width, value }) => {
  if (value === undefined || value === null) return null;
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
  if (value === undefined || value === null) return null;
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

const FeedbackDashboard = ({ chartType = 'overview' }) => {
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
          const cleanItem = {};
          Object.entries(item).forEach(([key, val]) => {
            const cleanKey = key.replace(/\r/g, '').trim();
            cleanItem[cleanKey] = typeof val === 'string'
              ? val.replace(/\r/g, '').trim()
              : val;
          });

          const { month, year, category, subCategory, metric, value } = cleanItem;

          if (
            category?.toLowerCase() === 'patient feedback' &&
            subCategory &&
            metric &&
            value !== undefined
          ) {
            const sub = subCategory.trim().toLowerCase();
            const metricKey = metric.toLowerCase().includes('ipd') ? 'IPDScore' : 'OPDScore';
            const isExpected = metric.toLowerCase().includes('expected');
            const keyName = isExpected ? `Expected${metricKey}` : metricKey;

            const monthNum = parseInt(month, 10);
            const shortYear = year?.toString().slice(-2);
            const label = `${monthMap[monthNum] || 'UNK'}-${shortYear}`;

            if (!summary[label]) {
              summary[label] = {
                month: label,
                IPDScore: 0,
                OPDScore: 0,
                ExpectedIPDScore: 0,
                ExpectedOPDScore: 0
              };
            }

            summary[label][keyName] += parseFloat(value);
          }
        });

        const finalData = Object.values(summary).sort((a, b) => {
          const getMonthIndex = (m) => {
            const name = m.split('-')[0];
            return [
              'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ].indexOf(name);
          };
          return getMonthIndex(a.month) - getMonthIndex(b.month);
        });

        setData(finalData);
      } catch (err) {
        console.error('Error fetching Feedback data:', err);
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
      pdf.save('feedback_dashboard.pdf');

      if (button) button.style.display = 'inline-block';
    });
  };

  const renderChart = () => {
    if (chartType === 'expected-vs-actual') {
      return (
        <>
          <h1
            style={{
              color: 'black',
              fontSize: '22px',
              marginBottom: '10px',
              fontWeight: 'normal'
            }}
          >
            Feedback Expected vs Actual
          </h1>
          <h4
            style={{
              fontSize: '16px',
              color: '#000',
              marginBottom: '10px',
              fontWeight: 'normal'
            }}
          >
            Monthly IPD and OPD Scores: Expected vs Actual
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatNumber} domain={[0, 10]} />
              <Tooltip formatter={(val) => `${Math.round(val)}`} />
              <Legend />
              <Bar dataKey="ExpectedIPDScore" fill="#42A5F5" name="Expected IPD">
                <LabelList content={renderBarLabel} />
              </Bar>
              <Bar dataKey="IPDScore" fill="#4CAF50" name="Actual IPD">
                <LabelList content={renderBarLabel} />
              </Bar>
              <Bar dataKey="ExpectedOPDScore" fill="#FFB300" name="Expected OPD">
                <LabelList content={renderBarLabel} />
              </Bar>
              <Bar dataKey="OPDScore" fill="#E53935" name="Actual OPD">
                <LabelList content={renderBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      );
    }

    return (
      <>
        <h1
          style={{
            color: 'black',
            fontSize: '22px',
            marginBottom: '10px',
            fontWeight: 'normal'
          }}
        >
          Feedback Trend Overview
        </h1>
        <h4
          style={{
            fontSize: '16px',
            color: '#000',
            marginBottom: '10px',
            fontWeight: 'normal'
          }}
        >
          Monthly IPD and OPD Scores
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={formatNumber} domain={[0, 10]} />
            <Tooltip formatter={(val) => `${Math.round(val)}`} />
            <Legend />
            <Line
              type="linear"
              dataKey="IPDScore"
              stroke="#1E88E5"
              name="IPD Score"
              strokeWidth={2}
              label={renderLineLabel}
            />
            <Line
              type="linear"
              dataKey="OPDScore"
              stroke="#D32F2F"
              name="OPD Score"
              strokeWidth={2}
              label={renderLineLabel}
            />
          </LineChart>
        </ResponsiveContainer>
      </>
    );
  };

  return (
    <div
      ref={dashboardRef}
      style={{
        padding: '10px',
        fontFamily: 'Futura, Arial, sans-serif',
        position: 'relative'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 999
        }}
      >
        <button
          ref={buttonRef}
          onClick={downloadPDF}
          style={{
            backgroundColor: '#1976D2',
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

      {renderChart()}

      <br />

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}
      >
        <thead style={{ background: '#f4f4f4' }}>
          <tr>
            <th
              style={{
                padding: '8px',
                border: '1px solid #ddd',
                textAlign: 'center'
              }}
            >
              Category
            </th>
            {data.map(item => (
              <th
                key={item.month}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  textAlign: 'center'
                }}
              >
                {item.month}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {['IPDScore', 'OPDScore'].map(key => (
            <tr key={key}>
              <td
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}
              >
                {key.replace(/([A-Z])/g, ' $1')}
              </td>
              {data.map(item => (
                <td
                  key={`${item.month}-${key}`}
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    textAlign: 'center'
                  }}
                >
                  {item[key] !== undefined ? Math.round(item[key]) : '0'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h2
        style={{
          color: 'black',
          marginTop: '20px',
          marginBottom: '12px',
          fontSize: '20px'
        }}
      >
        Summary
      </h2>
      <p style={{ fontSize: '18px', color: 'black' }}>
        Feedback scores reflect patient satisfaction levels across IPD and OPD.
        Observed trends show general alignment with expectations, though OPD scores
        occasionally fluctuate due to varying patient volumes or services rendered.
      </p>
    </div>
  );
};

export default FeedbackDashboard;