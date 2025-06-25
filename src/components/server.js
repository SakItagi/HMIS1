const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// === MongoDB (Local) Connection ===
mongoose.set('debug', true);
mongoose.connect('mongodb://localhost:27017/hmis')
  .then(() => console.log('✅ Connected to local MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// === User Schema ===
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  }
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

  const linesToAppend = data.map(record =>
    [
      escapeCsvValue(getMonthNumber(record.month)),
      escapeCsvValue(record.year),
      escapeCsvValue(record.category),
      escapeCsvValue(record.subCategory),
      escapeCsvValue(record.metric),
      escapeCsvValue(record.value),
    ].join(',')
  ).join('\n') + '\n';

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
    if (!fs.existsSync(csvFilePath)) {
      return res.json([]);
    }

    const content = fs.readFileSync(csvFilePath, 'utf8');
    const lines = content.trim().split('\n');
    const header = lines.shift().split(',');

    const results = lines.map(line => {
      const values = line.split(',');
      const obj = {};
      header.forEach((h, i) => {
        obj[h] = values[i];
      });
      return obj;
    });

    res.json(results);
  } catch (err) {
    console.error('❌ Error reading CSV summary:', err);
    res.status(500).json({ error: 'Failed to read summary' });
  }
});

// === CSV Export Endpoint ===
app.get('/api/hmis/export', (req, res) => {
  try {
    if (!fs.existsSync(csvFilePath)) {
      return res.status(404).json({ error: 'CSV file not found' });
    }

    res.download(csvFilePath, 'hmis_data.csv', (err) => {
      if (err) console.error('❌ Error during CSV download:', err);
      else console.log('📤 CSV file sent to client');
    });
  } catch (err) {
    console.error('❌ Error exporting CSV:', err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// === Registration Endpoint ===
app.post('/api/register', async (req, res) => {
  let { username, password } = req.body;
  console.log('📨 Received registration body:', req.body);

  if (!username || !password) {
    console.log('❌ Missing username or password');
    return res.status(400).json({ error: 'Username and password required' });
  }

  const normalizedUsername = username.trim().toLowerCase();
  console.log('📝 Register attempt:', normalizedUsername);

  try {
    const existing = await User.findOne({ username: normalizedUsername });
    console.log('🔍 Existing user:', existing);

    if (existing) {
      console.log('⚠️ User already exists');
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 Hashed password generated');

    const newUser = new User({ username: normalizedUsername, password: hashedPassword });

    await newUser.save();
    console.log('✅ User successfully saved:', newUser);
    res.json({ message: 'You have been successfully registered' });

  } catch (err) {
    console.error('❌ Registration try-catch error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// === Login Endpoint (UPDATED) ===
app.post('/api/login', async (req, res) => {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Username or password missing');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    console.log('🔐 Login attempt for:', normalizedUsername);

    const user = await User.findOne({ username: normalizedUsername });

    if (!user) {
      console.log(`❌ No user found with username: ${normalizedUsername}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log('❌ Incorrect password for:', normalizedUsername);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    console.log('✅ Login successful for:', user.username);
    return res.json({ message: 'Login successful' });

  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// === Test user save route ===
app.get('/api/test-user-save', async (req, res) => {
  try {
    const username = 'demo@example.com';
    const normalizedUsername = username.trim().toLowerCase();

    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) {
      console.log('⚠️ Test user already exists:', normalizedUsername);
      return res.status(400).json({ error: 'Test user already exists' });
    }

    const hashedPassword = await bcrypt.hash('plaintext123', 10);

    const testUser = new User({
      username: normalizedUsername,
      password: hashedPassword
    });

    await testUser.save();
    console.log('✅ Test user saved:', testUser);
    res.json({ message: 'Test user saved to MongoDB' });
  } catch (err) {
    console.error('❌ Error saving test user:', err);
    res.status(500).json({ error: 'Failed to save test user' });
  }
});

// === Debug route to list all users ===
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});