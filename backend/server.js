const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// VOLUNTEER APIs
// ============================================

// Register Volunteer
app.post('/api/volunteer/register', async (req, res) => {
  try {
    const { name, email, password, phone, location, bio, skills } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM volunteers WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert volunteer
    const [result] = await db.query(
      'INSERT INTO volunteers (name, email, password, phone, location, bio) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone, location, bio]
    );

    const volunteerId = result.insertId;

    // Insert skills if provided
    if (skills && skills.length > 0) {
      for (const skillName of skills) {
        const [skillResult] = await db.query('SELECT id FROM skills WHERE skill_name = ?', [skillName]);
        if (skillResult.length > 0) {
          await db.query('INSERT INTO volunteer_skills (volunteer_id, skill_id) VALUES (?, ?)', 
            [volunteerId, skillResult[0].id]);
        }
      }
    }

    res.status(201).json({ 
      message: 'Volunteer registered successfully', 
      volunteerId 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login Volunteer
app.post('/api/volunteer/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [volunteers] = await db.query('SELECT * FROM volunteers WHERE email = ?', [email]);
    
    if (volunteers.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const volunteer = volunteers[0];
    const passwordMatch = await bcrypt.compare(password, volunteer.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Remove password from response
    delete volunteer.password;

    res.json({ 
      message: 'Login successful', 
      user: volunteer,
      userType: 'volunteer'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get Volunteer Profile
app.get('/api/volunteer/:id', async (req, res) => {
  try {
    const [volunteers] = await db.query(
      'SELECT id, name, email, phone, location, bio, created_at FROM volunteers WHERE id = ?',
      [req.params.id]
    );

    if (volunteers.length === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    // Get volunteer skills
    const [skills] = await db.query(
      `SELECT s.skill_name FROM skills s
       JOIN volunteer_skills vs ON s.id = vs.skill_id
       WHERE vs.volunteer_id = ?`,
      [req.params.id]
    );

    res.json({ 
      ...volunteers[0], 
      skills: skills.map(s => s.skill_name) 
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ============================================
// ORGANIZATION APIs
// ============================================

// Register Organization
app.post('/api/organization/register', async (req, res) => {
  try {
    const { name, email, password, description, location, website } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const [existing] = await db.query('SELECT id FROM organizations WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO organizations (name, email, password, description, location, website) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, description, location, website]
    );

    res.status(201).json({ 
      message: 'Organization registered successfully', 
      organizationId: result.insertId 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login Organization
app.post('/api/organization/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [organizations] = await db.query('SELECT * FROM organizations WHERE email = ?', [email]);
    
    if (organizations.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const organization = organizations[0];
    const passwordMatch = await bcrypt.compare(password, organization.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    delete organization.password;

    res.json({ 
      message: 'Login successful', 
      user: organization,
      userType: 'organization'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============================================
// OPPORTUNITY APIs
// ============================================

// Create Opportunity
app.post('/api/opportunities', async (req, res) => {
  try {
    const { title, description, organization_id, location, event_date, event_time, required_skills } = req.body;

    if (!title || !description || !organization_id) {
      return res.status(400).json({ error: 'Title, description, and organization are required' });
    }

    const [result] = await db.query(
      'INSERT INTO opportunities (title, description, organization_id, location, event_date, event_time, required_skills) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, organization_id, location, event_date, event_time, required_skills]
    );

    res.status(201).json({ 
      message: 'Opportunity created successfully', 
      opportunityId: result.insertId 
    });
  } catch (error) {
    console.error('Create opportunity error:', error);
    res.status(500).json({ error: 'Failed to create opportunity' });
  }
});

// Get All Opportunities (with filters)
app.get('/api/opportunities', async (req, res) => {
  try {
    const { location, skills, status = 'open' } = req.query;
    
    let query = `
      SELECT o.*, org.name as organization_name 
      FROM opportunities o
      JOIN organizations org ON o.organization_id = org.id
      WHERE o.status = ?
    `;
    const params = [status];

    if (location) {
      query += ' AND o.location LIKE ?';
      params.push(`%${location}%`);
    }

    if (skills) {
      query += ' AND o.required_skills LIKE ?';
      params.push(`%${skills}%`);
    }

    query += ' ORDER BY o.created_at DESC';

    const [opportunities] = await db.query(query, params);
    res.json(opportunities);
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// Get Single Opportunity
app.get('/api/opportunities/:id', async (req, res) => {
  try {
    const [opportunities] = await db.query(
      `SELECT o.*, org.name as organization_name, org.email as organization_email, org.location as org_location
       FROM opportunities o
       JOIN organizations org ON o.organization_id = org.id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (opportunities.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json(opportunities[0]);
  } catch (error) {
    console.error('Get opportunity error:', error);
    res.status(500).json({ error: 'Failed to fetch opportunity' });
  }
});

// Get Opportunities by Organization
app.get('/api/organization/:orgId/opportunities', async (req, res) => {
  try {
    const [opportunities] = await db.query(
      'SELECT * FROM opportunities WHERE organization_id = ? ORDER BY created_at DESC',
      [req.params.orgId]
    );
    res.json(opportunities);
  } catch (error) {
    console.error('Get org opportunities error:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// Update Opportunity
app.put('/api/opportunities/:id', async (req, res) => {
  try {
    const { title, description, location, event_date, event_time, required_skills, status } = req.body;
    
    await db.query(
      `UPDATE opportunities 
       SET title = ?, description = ?, location = ?, event_date = ?, event_time = ?, required_skills = ?, status = ?
       WHERE id = ?`,
      [title, description, location, event_date, event_time, required_skills, status, req.params.id]
    );

    res.json({ message: 'Opportunity updated successfully' });
  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({ error: 'Failed to update opportunity' });
  }
});

// Delete Opportunity
app.delete('/api/opportunities/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM opportunities WHERE id = ?', [req.params.id]);
    res.json({ message: 'Opportunity deleted successfully' });
  } catch (error) {
    console.error('Delete opportunity error:', error);
    res.status(500).json({ error: 'Failed to delete opportunity' });
  }
});

// ============================================
// APPLICATION APIs
// ============================================

// Apply for Opportunity
app.post('/api/applications', async (req, res) => {
  try {
    const { volunteer_id, opportunity_id, message } = req.body;

    if (!volunteer_id || !opportunity_id) {
      return res.status(400).json({ error: 'Volunteer and opportunity are required' });
    }

    // Check if already applied
    const [existing] = await db.query(
      'SELECT id FROM applications WHERE volunteer_id = ? AND opportunity_id = ?',
      [volunteer_id, opportunity_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Already applied for this opportunity' });
    }

    const [result] = await db.query(
      'INSERT INTO applications (volunteer_id, opportunity_id, message) VALUES (?, ?, ?)',
      [volunteer_id, opportunity_id, message]
    );

    res.status(201).json({ 
      message: 'Application submitted successfully', 
      applicationId: result.insertId 
    });
  } catch (error) {
    console.error('Apply error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get Volunteer Applications
app.get('/api/volunteer/:volunteerId/applications', async (req, res) => {
  try {
    const [applications] = await db.query(
      `SELECT a.*, o.title, o.description, o.location, o.event_date, org.name as organization_name
       FROM applications a
       JOIN opportunities o ON a.opportunity_id = o.id
       JOIN organizations org ON o.organization_id = org.id
       WHERE a.volunteer_id = ?
       ORDER BY a.applied_at DESC`,
      [req.params.volunteerId]
    );
    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get Applications for an Opportunity
app.get('/api/opportunities/:opportunityId/applications', async (req, res) => {
  try {
    const [applications] = await db.query(
      `SELECT a.*, v.name, v.email, v.phone, v.location, v.bio
       FROM applications a
       JOIN volunteers v ON a.volunteer_id = v.id
       WHERE a.opportunity_id = ?
       ORDER BY a.applied_at DESC`,
      [req.params.opportunityId]
    );
    res.json(applications);
  } catch (error) {
    console.error('Get opportunity applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Update Application Status
app.put('/api/applications/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'accepted', 'rejected', 'withdrawn'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.query('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Application status updated successfully' });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// ============================================
// UTILITY APIs
// ============================================

// Get All Skills
app.get('/api/skills', async (req, res) => {
  try {
    const [skills] = await db.query('SELECT * FROM skills ORDER BY skill_name');
    res.json(skills);
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Search (combined search across opportunities)
app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const [results] = await db.query(
      `SELECT o.*, org.name as organization_name
       FROM opportunities o
       JOIN organizations org ON o.organization_id = org.id
       WHERE (o.title LIKE ? OR o.description LIKE ? OR o.location LIKE ? OR o.required_skills LIKE ?)
       AND o.status = 'open'
       ORDER BY o.created_at DESC`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
    );

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
