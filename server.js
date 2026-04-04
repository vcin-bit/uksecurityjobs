const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Candidate Schema
const candidateSchema = new mongoose.Schema({
  fullname:     { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  licence_type: { type: String, required: true },
  sia_number:   { type: String },
  registered_at:{ type: Date, default: Date.now },
  status:       { type: String, default: 'pending' }
});

const Candidate = mongoose.model('Candidate', candidateSchema);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'UKSecurityJobs API running' });
});

// Register candidate
app.post('/api/register', async (req, res) => {
  try {
    const { fullname, email, licence_type, sia_number } = req.body;

    if (!fullname || !email || !licence_type) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    const existing = await Candidate.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    const candidate = new Candidate({
      fullname,
      email,
      licence_type,
      sia_number
    });

    await candidate.save();

    res.status(201).json({ 
      success: true, 
      message: 'Registration successful. Welcome to UKSecurityJobs.' 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
