require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Setup
mongoose.connect('mongodb://127.0.0.1:27017/hmis', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  resetToken: String,
  resetTokenExpiry: Date,
});

const User = mongoose.model('User', userSchema);

// === CSV Setup ===
const csvFilePath = path.join(process.cwd(), 'hmis_data.csv');
const csvHeaders = ['Month', 'Year', 'Category', 'SubCategory', 'Metric', 'Value'];

function createCsvIfNotExists() {
  try {
    if (!fs.existsSync(csvFilePath)) {
      const headerLine = csvHeaders.join(',') + '\n';
      fs.writeFileSync(csvFilePath, headerLine, 'utf8');
      console.log('📝 CSV created with headers at:', csvFilePath);
    } else {
      console.log('📁 CSV file already exists at:', csvFilePath);
    }
  } catch (err) {
    console.error('❌ Error creating CSV file:', err);
  }
}
createCsvIfNotExists();

function escapeCsvValue(val) {
  if (typeof val !== 'string') val = String(val);
  if (val.includes('"')) val = val.replace(/"/g, '""');
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    val = `"${val}"`;
  }
  return val;
}

function getMonthNumber(monthStr) {
  const monthMap = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  };
  return monthMap[monthStr] || monthStr;
}

// === HMIS CSV Save Endpoint ===
app.post('/api/hmis', (req, res) => {
  const data = req.body;
  console.log('📥 Received data:', data);

  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: 'Expected non-empty array in request body' });
  }

  for (const record of data) {
    for (const key of ['month', 'year', 'category', 'subCategory', 'metric', 'value']) {
      if (!(key in record)) {
        return res.status(400).json({ error: `Missing field '${key}' in one of the records` });
      }
    }

    if (record.subCategory === 'Staff') {
      record.subCategory = 'Actual';
    }
    if (record.subCategory === 'Stakeholder') {
      record.subCategory = 'Expected';
    }
  }
  const linesToAppend = data.map(record => {
    const cleanedRecord = {
      month: getMonthNumber((record.month || '').trim()),
      year: (record.year || '').trim(),
      category: (record.category || '').trim(),
      subCategory: (record.subCategory || '').trim(),
      metric: (record.metric || '').trim(),
      value: (record.value || record['value\r'] || '').toString().trim(),
    };
  
    return csvHeaders.map(header =>
      escapeCsvValue(cleanedRecord[header])
    ).join(',');
  }).join('\n') + '\n';
  try {
    fs.appendFileSync(csvFilePath, linesToAppend, 'utf8');
    console.log('✅ Data appended to CSV:\n', linesToAppend);
    return res.json({ message: 'Data saved successfully' });
  } catch (err) {
    console.error('❌ Error appending data to CSV:', err);
    return res.status(500).json({ error: 'Failed to save data to CSV' });
  }
});

// === HMIS CSV Summary Endpoint ===
app.get('/api/hmis/summary', (req, res) => {
  try {
    console.log("✅ CSV exists? ", fs.existsSync(csvFilePath));
    console.log("📄 CSV Path:", csvFilePath);

    if (!fs.existsSync(csvFilePath)) {
      return res.json([]);
    }

    const content = fs.readFileSync(csvFilePath, 'utf8');
    console.log("📦 Raw CSV Content:\n", content);

    const lines = content.trim().split('\n');
    const header = lines.shift().split(',').map(h => h.replace(/[\r\n]+/g, '').trim());

    const results = lines.map(line => {
      const values = line.split(',');
      const obj = {};
      header.forEach((h, i) => {
        const cleanKey = h;
        const cleanValue = values[i]?.replace(/[\r\n]+/g, '').trim() || '';
        obj[cleanKey] = cleanValue;
      });
      return obj;
    });

    res.json(results);
  } catch (err) {
    console.error('❌ Error reading CSV summary:', err);
    res.status(500).json({ error: 'Failed to read summary' });
  }
});

// Email Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Verify transporter setup
transporter.verify((error, success) => {
  if (error) {
    console.error('🚫 Email transporter configuration error:', error);
  } else {
    console.log('✅ Email transporter is ready to send emails');
  }
});

// ✅ Login Route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    console.log("✅ User logged in:", username);
    res.status(200).json({ message: 'Login successful' });

  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ✅ Password Reset Request Route
app.post('/api/request-password-reset', async (req, res) => {
  const { username } = req.body;
  console.log('📨 Incoming reset request for:', username);

  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.log('❌ No user found');
      return res.status(404).json({ error: 'User not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 3600000;

    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    await user.save();
    console.log('🧾 Token saved to user:', { token, expiry });

    const resetLink = `http://localhost:3000/reset-password/${token}`;
    console.log('📧 Attempting to send email to:', user.username);
    console.log('🔗 Reset link:', resetLink);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.username,
      subject: 'Password Reset',
      text: `Hello,

You requested to reset your password. Click the link below to proceed:

${resetLink}

If you didn’t request this, you can ignore this email.`,
    });

    console.log('✅ Email sent successfully:', info.response);
    return res.status(200).json({ message: 'Password reset link sent' });

  } catch (err) {
    console.error('❌ Full error caught:', err);
    return res.status(500).json({ error: 'Something went wrong', details: err.message });
  }
});

// ✅ Reset Password Route
app.post('/api/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  console.log('🔧 Reset password route hit:', token);

  if (!password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    console.log("✅ Password reset successfully for:", user.username);
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('❌ Unexpected server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Forgot Password Form Route
app.get('/api/forgot-password', (req, res) => {
  res.send('<form action="/api/request-password-reset" method="POST"><label>Username</label><input type="email" name="username" placeholder="Enter your username" required/><button type="submit">Request Reset</button></form>');
});
// ✅ Register Route
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    console.log("🆕 New user registered:", username);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log('✅ Connected to local MongoDB');
});
