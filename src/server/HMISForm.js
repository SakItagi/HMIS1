import React, { useState } from "react";

const HMISPage = () => {
  const [formData, setFormData] = useState({
    month: "",
    year: "",
    role: "",
    department: "",
    subDepartment: "",
    inputs: {},
  });

  const inputClass =
    "w-72 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-sm h-10 box-border";
  const selectClass =
    "w-72 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-sm h-10 box-border";

  const normalizeMetricKey = (label) =>
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/\s+/g, "");

  const metricLabelMap = {};
  const departmentInputs = {
    Stakeholder: {
      General: ["Expected Revenue", "Expected Expense"],
      Diagnostic: ["Expected Lab Tests", "Expected Radiology Tests"],
      "Admissions and Discharges": ["Expected Admissions", "Expected Discharges"],
      Workforce: ["Expected Joinees", "Expected Resignations"],
      Pharmacy: ["Expected Issued", "Expected Expired"],
      Maintenance: ["Expected Repair Cost", "Expected Purchase Cost"],
      "Patient Feedback": ["Expected IPD Score", "Expected OPD Score"],
      "Departmental Metrics": [
        "Expected Revenue",
        "Expected Patients",
        "Expected Profitability",
      ],
    },
    Staff: {
      General: ["Actual Revenue", "Actual Expense"],
      Diagnostic: ["Actual Lab Tests", "Actual Radiology Tests"],
      "Admissions and Discharges": ["Actual Admissions", "Actual Discharges"],
      Workforce: ["Actual Joinees", "Actual Resignations"],
      Pharmacy: ["Actual Issued", "Actual Expired"],
      Maintenance: ["Actual Repair Cost", "Actual Purchase Cost"],
      "Patient Feedback": ["Actual IPD Score", "Actual OPD Score"],
      "Departmental Metrics": [
        "Actual Revenue",
        "Actual Patients",
        "Actual Profitability",
      ],
    },
  };

  const normalizedDepartmentInputs = {};
  for (const role in departmentInputs) {
    normalizedDepartmentInputs[role] = {};
    for (const dept in departmentInputs[role]) {
      normalizedDepartmentInputs[role][dept] = departmentInputs[role][dept].map((label) => {
        const key = normalizeMetricKey(label);
        metricLabelMap[key] = label;
        return key;
      });
    }
  }

  const subDepartments = [
    "General Medicine", "Orthopaedic", "Dialysis", "Pediatric", "Ophthalmology", "Homoeopathic",
    "Geriatric", "Cardiology", "Surgery", "Gynaecology", "Neurology", "Urology", "ENT", "Gastroenterology",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      let updates = { ...prev, [name]: value };
      if (name === "role") {
        updates.department = "";
        updates.subDepartment = "";
        updates.inputs = {};
      } else if (name === "department") {
        updates.subDepartment = "";
        updates.inputs = {};
      } else if (name === "subDepartment") {
        updates.inputs = {};
      }
      return updates;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (value === "" || /^[0-9\b]+$/.test(value)) {
      setFormData((prev) => ({
        ...prev,
        inputs: {
          ...prev.inputs,
          [name]: value,
        },
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { month, year, role, department, subDepartment, inputs } = formData;

    if (!month || !year || !role || !department) {
      alert("Please fill all the required fields.");
      return;
    }
    if (department === "Departmental Metrics" && !subDepartment) {
      alert("Please select a Sub Department for Departmental Metrics.");
      return;
    }

    const records = [];
    if (department === "Departmental Metrics" && subDepartment) {
      for (const metricKey in inputs) {
        if (inputs[metricKey] === "") continue;
        records.push({
          month,
          year,
          category: department,
          subCategory: subDepartment,
          metric: metricLabelMap[metricKey] || metricKey,
          value: Number(inputs[metricKey]),
        });
      }
    } else {
      for (const metricKey in inputs) {
        if (inputs[metricKey] === "") continue;
        records.push({
          month,
          year,
          category: department,
          subCategory: role,
          metric: metricLabelMap[metricKey] || metricKey,
          value: Number(inputs[metricKey]),
        });
      }
    }

    if (records.length === 0) {
      alert("Please enter some metric values before submitting.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/hmis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(records),
      });

      const result = await response.json();
      if (response.ok) {
        alert("Submitted successfully!");
        setFormData({
          month: "",
          year: "",
          role: "",
          department: "",
          subDepartment: "",
          inputs: {},
        });
      } else {
        console.error("Backend error:", result.error);
        alert("Submission failed: " + result.error);
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Submission failed. Please try again.");
    }
  };

  const shouldShowInputs =
    formData.role &&
    formData.department &&
    normalizedDepartmentInputs[formData.role]?.[formData.department] &&
    (formData.department !== "Departmental Metrics" || formData.subDepartment);

  return (
    <div className="flex min-h-screen bg-[#EAF6FF]">
      <aside className="w-[90px] bg-[#1F3C88] flex flex-col items-center py-10 text-white space-y-10">
        {/* Sidebar content here */}
      </aside>

      <main className="flex-1 grid grid-cols-2 relative overflow-hidden">
        {/* LEFT FORM SECTION */}
        <div className="flex flex-col justify-start items-start px-16 overflow-y-auto max-h-screen pr-4">
          <h1 className="text-4xl font-bold text-[#001F4E] leading-tight pt-4 font-futura">
            Hospital Management
            <br />
            <span className="text-[#3399FF] font-futura">Information System</span>
          </h1>

          <p className="mt-3 text-gray-600 max-w-md text-sm ml-1">
            Our HMIS system helps you track, manage, and monitor<br />
            hospital metrics seamlessly and efficiently.
          </p>

          <form onSubmit={handleSubmit} className="font-futura mt-8 space-y-4 w-full max-w-sm bg-white p-6 rounded-md shadow text-black">
            <h2 className="text-xl text-black font-normal mb-2">Enter Monthly Hospital Metrics</h2>

            <div>
              <label className="block font-medium text-black text-left">Month</label>
              <select name="month" value={formData.month} onChange={handleChange} className={selectClass} required>
                <option value="">Select Month</option>
                {[
                  "January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December",
                ].map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-black text-left">Year</label>
              <select name="year" value={formData.year} onChange={handleChange} className={selectClass} required>
                <option value="">Select Year</option>
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>

            <div>
              <label className="block font-medium text-black text-left">Role</label>
              <select name="role" value={formData.role} onChange={handleChange} className={selectClass} required>
                <option value="">Select Role</option>
                <option value="Stakeholder">Stakeholder</option>
                <option value="Staff">Staff</option>
              </select>
            </div>

            {formData.role && (
              <div>
                <label className="block font-medium text-black text-left">Department</label>
                <select name="department" value={formData.department} onChange={handleChange} className={selectClass} required>
                  <option value="">Select Department</option>
                  {Object.keys(departmentInputs[formData.role]).map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.department === "Departmental Metrics" && (
              <div>
                <label className="block font-medium text-black">Sub Department</label>
                <select name="subDepartment" value={formData.subDepartment} onChange={handleChange} className={selectClass} required>
                  <option value="">Select Sub Department</option>
                  {subDepartments.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}

            {shouldShowInputs &&
              normalizedDepartmentInputs[formData.role][formData.department].map((fieldKey) => (
                <div key={fieldKey}>
                  <label className="block font-medium text-black text-left">{metricLabelMap[fieldKey]}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    name={fieldKey}
                    value={formData.inputs[fieldKey] || ""}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="Enter value"
                    required
                  />
                </div>
              ))}

            <button
              type="submit"
              className="w-full bg-[#1F3C88] text-white py-2 rounded font-normal hover:bg-[#173174] font-futura"
            >
              Submit
            </button>
          </form>
        </div>

        {/* RIGHT IMAGE SECTION */}
        <div className="relative flex justify-center items-center">
          <div className="absolute top-8 left-16 w-[400px] h-[400px] rounded-[300px] border-[6px] border-[#3399FF] opacity-70 z-0"></div>

          <div className="w-[720px] h-[360px] bg-white rounded-b-full overflow-hidden shadow-md flex items-center justify-center -mt-4 transform rotate-90 z-10">
            <img
              src="/Doctor1.jpg"
              alt="Doctors"
              className="w-full h-full object-cover transform -rotate-90"
            />
          </div>

          <div className="absolute top-[10%] left-[5%] w-[180px] h-[180px] bg-[#1F3C88] rounded-full opacity-20 rotate-45"></div>

          <div
            className="absolute bottom-20 right-80 p-4 rounded-md shadow-lg max-w-xs text-sm leading-snug z-50"
            style={{ backgroundColor: "#1F3C88", color: "#ffffff" }}
          >
            <p className="font-normal text-white font-futura">Seamless hospital insights</p>
            <p className="text-[#85C1FF] text-xs mt-1 text-white font-futura">Smarter patient outcomes</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HMISPage;