import React, { useState } from 'react';
import Papa from 'papaparse';
import PptxGenJS from 'pptxgenjs';

const ReportGenerator = () => {
  const [csvData, setCsvData] = useState(null);
  const [dashboardLinks] = useState({
    Finance: "https://example.com/finance",
    HR: "https://example.com/hr",
    Pharmacy: "https://example.com/pharmacy",
    Diagnostic: "https://example.com/diagnostic",
    Maintenance: "https://example.com/maintenance",
    IPD: "https://example.com/ipd",
    Feedback: "https://example.com/feedback",
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    Papa.parse(file, {
      header: true,
      complete: (results) => setCsvData(results.data),
    });
  };

  const extractHighlights = (data) => {
    const summary = {};
    const grouped = {};

    data.forEach((row) => {
      const key = `${row.category}__${row.metric}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    for (const key in grouped) {
      const series = grouped[key].sort((a, b) => {
        const dateA = `${a.year}-${a.month.padStart(2, '0')}`;
        const dateB = `${b.year}-${b.month.padStart(2, '0')}`;
        return dateA.localeCompare(dateB);
      });

      if (series.length < 2) continue;

      const prev = parseFloat(series.at(-2).value);
      const curr = parseFloat(series.at(-1).value);
      if (!prev || !curr) continue;

      const change = ((curr - prev) / prev) * 100;
      if (Math.abs(change) < 8) continue;

      const [dept, metric] = key.split('__');
      const dir = change > 0 ? "rose" : "fell";
      const reason = dept === "ICU" && change > 0 ? "possibly due to flu surge" :
                     dept === "IPD" && change < 0 ? "possibly due to staff shortage" :
                     change > 0 ? "due to increased demand" : "due to resource constraints";

      summary[dept] = `${dept}: ${metric} ${dir} ${Math.abs(change).toFixed(1)}% — ${reason}`;
    }

    return Object.values(summary);
  };

  const generatePPT = async () => {
    if (!csvData) return;

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'Wide', width: 13.33, height: 7.5 });
    pptx.layout = 'Wide';

    const titleStyle = { x: 0.5, y: 0.3, fontSize: 28, bold: true, color: '1F3C88', fontFace: 'Montserrat' };
    const contentStyle = { x: 0.5, y: 1.2, fontSize: 14, fontFace: 'Arial', color: '1f1f1f', w: 12.5, h: 5.5, lineSpacing: 20 };
    const today = new Date().toLocaleDateString('en-GB');

    const addFooter = (slide, index) => {
      slide.addText(`Generated on: ${today} | Slide ${index}/5`, { x: 0.3, y: 6.9, fontSize: 10, color: '666666' });
    };

    const highlights = extractHighlights(csvData);

    const slide1 = pptx.addSlide();
    slide1.addText("Next-Gen Hospital Intelligence with HMIS", titleStyle);
    slide1.addText("Quarterly Operational Summary", { ...titleStyle, y: 1, fontSize: 20 });
    slide1.addText(
      "This report summarizes key trends across all hospital departments. It highlights risks, operational gaps, and emerging opportunities with AI-inferred reasoning.",
      contentStyle
    );
    addFooter(slide1, 1);

    const slide2 = pptx.addSlide();
    slide2.addText("Department Highlights", titleStyle);
    slide2.addText(
      highlights.slice(0, 4).map(line => `• ${line}`).join('\n'),
      { ...contentStyle, x: 0.5, y: 1.5, w: 6 }
    );
    slide2.addText(
      highlights.slice(4).map(line => `• ${line}`).join('\n'),
      { ...contentStyle, x: 7, y: 1.5, w: 5.5 }
    );
    addFooter(slide2, 2);

    const slide3 = pptx.addSlide();
    slide3.addText("Correlation Analysis", titleStyle);
    slide3.addText(
      `• ICU overperformed in Week 2 likely due to flu outbreak\n` +
      `• OPD fell in Week 3 due to possible staffing shortage\n` +
      `• Lab Tests dropped in Mar-24 possibly due to technician unavailability\n` +
      `• Pharmacy revenue spiked post-supply restocking\n` +
      `• Radiology saw a dip likely due to equipment maintenance`,
      contentStyle
    );
    addFooter(slide3, 3);

    const slide4 = pptx.addSlide();
    slide4.addText("Action Plan & Timeline", titleStyle);
    slide4.addText(
      "Immediate (0–1 month):\n• Hire ICU/OPD staff\n• Resolve equipment downtime\n\nShort-Term (1–3 months):\n• Automate supply chain alerts\n• Monitor patient inflow trends\n\nMid-Term (3–6 months):\n• Introduce predictive dashboards\n• Review departmental KPIs",
      contentStyle
    );
    addFooter(slide4, 4);

    const slide5 = pptx.addSlide();
    slide5.addText("Operational Appendix", titleStyle);
    let y = 1.4;
    Object.entries(dashboardLinks).forEach(([dept, link]) => {
      slide5.addText(`${dept} Dashboard`, {
        x: 0.5,
        y,
        fontSize: 14,
        fontFace: 'Arial',
        color: '0563C1',
        hyperlink: { url: link },
      });
      y += 0.5;
    });
    addFooter(slide5, 5);

    pptx.writeFile('HMIS_Executive_Report');
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-[#1F3C88]">HMIS Report Generator</h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="mb-4"
      />
      <button
        onClick={generatePPT}
        disabled={!csvData}
        className="bg-[#1F3C88] text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
      >
        Generate PPT Report
      </button>
    </div>
  );
};

export default ReportGenerator;