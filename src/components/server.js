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

// CSV Setup
const csvFilePath = path.join(__dirname, 'hmis_data.csv');
if (!fs.existsSync(csvFilePath)) {
  fs.writeFileSync(csvFilePath, 'Date,Email,Message\n');
  console.log(`📁 CSV file created at: ${csvFilePath}`);
} else {
  console.log(`📁 CSV file already exists at: ${csvFilePath}`);
}

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

// Password Reset Request Route
app.post('/api/request-password-reset', async (req, res) => {
  const { username } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 3600000; // 1 hour

    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    await user.save();

    const resetLink = `http://localhost:3000/reset-password/${token}`;
    console.log(`📩 Sending reset email to: ${user.username}`);
    console.log(`🔗 Reset link: ${resetLink}`);

    // 🔁 Updated: handle error inside callback
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.username,
      subject: 'Password Reset',
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    }, (err, info) => {
      if (err) {
        console.error('❌ Error sending email:', err);
        return res.status(500).json({ error: 'Failed to send reset email', details: err.message });
      } else {
        console.log('📨 Email sent successfully:', info.response);
        return res.status(200).json({ message: 'Password reset link sent' });
      }
    });

  } catch (err) {
    console.error('❌ Unexpected server error:', err);
    res.status(500).json({ error: 'Something went wrong', details: err.message });
  }
});

// ✅ Reset Password Handler Route (with hashing)
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
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });

    console.log('✅ Email sent successfully:', info.response);
    return res.status(200).json({ message: 'Password reset link sent' });

  } catch (err) {
    console.error('❌ Full error caught:', err);
    return res.status(500).json({ error: 'Something went wrong', details: err.message });
  }
});

// Forgot Password Form Route
app.get('/api/forgot-password', (req, res) => {
  res.send('<form action="/api/request-password-reset" method="POST"><label>Username</label><input type="email" name="username" placeholder="Enter your username" required/><button type="submit">Request Reset</button></form>');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log('✅ Connected to local MongoDB');
});