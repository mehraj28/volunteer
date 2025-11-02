const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let currentUserType = null;
let selectedOpportunityId = null;

// ============================================
// AUTHENTICATION
// ============================================

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
  // Load user from localStorage
  const userData = localStorage.getItem('user');
  const userType = localStorage.getItem('userType');
  
  if (userData && userType) {
    currentUser = JSON.parse(userData);
    currentUserType = userType;
    
    // Redirect if on wrong page
    const currentPage = window.location.pathname;
    if (currentPage.includes('login.html') || currentPage.includes('index.html')) {
      redirectToDashboard();
    } else {
      initializeDashboard();
    }
  } else {
    // Redirect to login if trying to access dashboard
    const currentPage = window.location.pathname;
    if (currentPage.includes('dashboard')) {
      window.location.href = 'login.html';
    }
  }
  
  // Initialize auth page if on login page
  if (window.location.pathname.includes('login.html')) {
    initializeAuthPage();
  }
});

function redirectToDashboard() {
  if (currentUserType === 'volunteer') {
    window.location.href = 'volunteer-dashboard.html';
  } else {
    window.location.href = 'org-dashboard.html';
  }
}

function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('userType');
  window.location.href = 'index.html';
}

// ============================================
// AUTH PAGE
// ============================================

function initializeAuthPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const typeFromUrl = urlParams.get('type');
  
  if (typeFromUrl) {
    const userTypeButtons = document.querySelectorAll('.user-type-btn');
    userTypeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === typeFromUrl);
    });
  }
  
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.tab;
      document.getElementById('loginForm').classList.toggle('hidden', tabName !== 'login');
      document.getElementById('registerForm').classList.toggle('hidden', tabName !== 'register');
    });
  });
  
  // User type switching
  document.querySelectorAll('.user-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.user-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const isOrg = btn.dataset.type === 'organization';
      document.querySelectorAll('.volunteer-only').forEach(el => {
        el.classList.toggle('hidden', isOrg);
      });
      document.querySelectorAll('.org-only').forEach(el => {
        el.classList.toggle('hidden', !isOrg);
      });
    });
  });
  
  // Login form submission
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const userType = document.querySelector('.user-type-btn.active').dataset.type;
    
    try {
      const endpoint = userType === 'volunteer' ? '/volunteer/login' : '/organization/login';
      const response = await fetch(API_BASE_URL + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userType', data.userType);
        currentUser = data.user;
        currentUserType = data.userType;
        redirectToDashboard();
      } else {
        document.getElementById('loginError').textContent = data.error || 'Login failed';
      }
    } catch (error) {
      document.getElementById('loginError').textContent = 'Network error. Please try again.';
    }
  });
  
  // Register form submission
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userType = document.querySelector('.user-type-btn.active').dataset.type;
    
    const formData = {
      name: document.getElementById('registerName').value,
      email: document.getElementById('registerEmail').value,
      password: document.getElementById('registerPassword').value,
      phone: document.getElementById('registerPhone').value,
      location: document.getElementById('registerLocation').value
    };
    
    if (userType === 'volunteer') {
      formData.bio = document.getElementById('registerBio').value;
    } else {
      formData.description = document.getElementById('registerDescription').value;
      formData.website = document.getElementById('registerWebsite').value;
    }
    
    try {
      const endpoint = userType === 'volunteer' ? '/volunteer/register' : '/organization/register';
      const response = await fetch(API_BASE_URL + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Registration successful! Please login.');
        document.querySelector('[data-tab="login"]').click();
        document.getElementById('registerForm').reset();
      } else {
        document.getElementById('registerError').textContent = data.error || 'Registration failed';
      }
    } catch (error) {
      document.getElementById('registerError').textContent = 'Network error. Please try again.';
    }
  });
}

// ============================================
// DASHBOARD
// ============================================

function initializeDashboard() {
  // Display user name
  const nameElement = document.getElementById('userName') || document.getElementById('orgName');
  if (nameElement && currentUser) {
    nameElement.textContent = currentUser.name;
  }
  
  // Sidebar navigation
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      const sectionName = link.dataset.section;
      document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.toggle('hidden', section.id !== sectionName);
      });
      
      // Load section data
      loadSectionData(sectionName);
    });
  });
  
  // Load initial section
  loadSectionData(document.querySelector('.sidebar-link.active').dataset.section);
}

async function loadSectionData(sectionName) {
  if (currentUserType === 'volunteer') {
    switch (sectionName) {
      case 'opportunities':
        await loadOpportunities();
        break;
      case 'my-applications':
        await loadMyApplications();
        break;
      case 'profile':
        await loadProfile();
        break;
    }
  } else {
    switch (sectionName) {
      case 'my-opportunities':
        await loadMyOpportunities();
        break;
      case 'create-opportunity':
        initializeCreateOpportunityForm();
        break;
      case 'applications':
        await loadReceivedApplications();
        break;
    }
  }
}

// ============================================
// VOLUNTEER FUNCTIONS
// ============================================

async function loadOpportunities() {
  try {
    const response = await fetch(`${API_BASE_URL}/opportunities`);
    const opportunities = await response.json();
    
    const container = document.getElementById('opportunitiesList');
    if (opportunities.length === 0) {
      container.innerHTML = '<p>No opportunities available at the moment.</p>';
      return;
    }
    
    container.innerHTML = opportunities.map(opp => `
      <div class="opportunity-card card">
        <div class="card__body">
          <h3>${opp.title}</h3>
          <p>${opp.description.substring(0, 100)}...</p>
          <div class="opportunity-meta">
            <span>🏢 ${opp.organization_name}</span>
            <span>📍 ${opp.location || 'Not specified'}</span>
            <span>📅 ${opp.event_date ? new Date(opp.event_date).toLocaleDateString() : 'TBD'}</span>
            <span>🎯 ${opp.required_skills || 'Any'}</span>
          </div>
          <div class="opportunity-actions">
            <button onclick="applyForOpportunity(${opp.id}, '${opp.title}')" class="btn btn--primary btn--sm">Apply Now</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading opportunities:', error);
  }
}

async function searchOpportunities() {
  const query = document.getElementById('searchInput').value;
  if (!query) {
    await loadOpportunities();
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(query)}`);
    const opportunities = await response.json();
    
    const container = document.getElementById('opportunitiesList');
    container.innerHTML = opportunities.map(opp => `
      <div class="opportunity-card card">
        <div class="card__body">
          <h3>${opp.title}</h3>
          <p>${opp.description.substring(0, 100)}...</p>
          <div class="opportunity-meta">
            <span>🏢 ${opp.organization_name}</span>
            <span>📍 ${opp.location || 'Not specified'}</span>
            <span>📅 ${opp.event_date ? new Date(opp.event_date).toLocaleDateString() : 'TBD'}</span>
          </div>
          <button onclick="applyForOpportunity(${opp.id}, '${opp.title}')" class="btn btn--primary btn--sm">Apply Now</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Search error:', error);
  }
}

function applyForOpportunity(opportunityId, title) {
  selectedOpportunityId = opportunityId;
  document.getElementById('modalTitle').textContent = `Apply for: ${title}`;
  document.getElementById('applicationModal').classList.remove('hidden');
  
  const form = document.getElementById('applicationForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const message = document.getElementById('applicationMessage').value;
    
    try {
      const response = await fetch(`${API_BASE_URL}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteer_id: currentUser.id,
          opportunity_id: selectedOpportunityId,
          message
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Application submitted successfully!');
        closeModal();
        document.getElementById('applicationForm').reset();
      } else {
        alert(data.error || 'Failed to submit application');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };
}

function closeModal() {
  document.getElementById('applicationModal').classList.add('hidden');
}

async function loadMyApplications() {
  try {
    const response = await fetch(`${API_BASE_URL}/volunteer/${currentUser.id}/applications`);
    const applications = await response.json();
    
    const container = document.getElementById('applicationsList');
    
    if (applications.length === 0) {
      container.innerHTML = '<p>You haven\'t applied to any opportunities yet.</p>';
      return;
    }
    
    container.innerHTML = applications.map(app => `
      <div class="card" style="margin-bottom: 16px;">
        <div class="card__body">
          <h3>${app.title}</h3>
          <p>${app.description.substring(0, 150)}...</p>
          <div class="opportunity-meta">
            <span>🏢 ${app.organization_name}</span>
            <span>📍 ${app.location || 'Not specified'}</span>
            <span>📅 Applied: ${new Date(app.applied_at).toLocaleDateString()}</span>
            <span class="status status--${app.status}">${app.status.toUpperCase()}</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading applications:', error);
  }
}

async function loadProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/volunteer/${currentUser.id}`);
    const profile = await response.json();
    
    const container = document.getElementById('profileContent');
    container.innerHTML = `
      <div class="card">
        <div class="card__body">
          <h3>${profile.name}</h3>
          <p><strong>Email:</strong> ${profile.email}</p>
          <p><strong>Phone:</strong> ${profile.phone || 'Not provided'}</p>
          <p><strong>Location:</strong> ${profile.location || 'Not provided'}</p>
          <p><strong>Bio:</strong> ${profile.bio || 'No bio added'}</p>
          <p><strong>Skills:</strong> ${profile.skills.join(', ') || 'No skills added'}</p>
          <p><strong>Member since:</strong> ${new Date(profile.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

// ============================================
// ORGANIZATION FUNCTIONS
// ============================================

async function loadMyOpportunities() {
  try {
    const response = await fetch(`${API_BASE_URL}/organization/${currentUser.id}/opportunities`);
    const opportunities = await response.json();
    
    const container = document.getElementById('myOpportunitiesList');
    
    if (opportunities.length === 0) {
      container.innerHTML = '<p>You haven\'t posted any opportunities yet.</p>';
      return;
    }
    
    container.innerHTML = opportunities.map(opp => `
      <div class="opportunity-card card">
        <div class="card__body">
          <h3>${opp.title}</h3>
          <p>${opp.description.substring(0, 100)}...</p>
          <div class="opportunity-meta">
            <span>📍 ${opp.location || 'Not specified'}</span>
            <span>📅 ${opp.event_date ? new Date(opp.event_date).toLocaleDateString() : 'TBD'}</span>
            <span class="status status--${opp.status}">${opp.status.toUpperCase()}</span>
          </div>
          <div class="opportunity-actions">
            <button onclick="viewApplications(${opp.id})" class="btn btn--primary btn--sm">View Applications</button>
            <button onclick="deleteOpportunity(${opp.id})" class="btn btn--secondary btn--sm">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading opportunities:', error);
  }
}

function initializeCreateOpportunityForm() {
  const form = document.getElementById('createOpportunityForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const formData = {
      title: document.getElementById('oppTitle').value,
      description: document.getElementById('oppDescription').value,
      organization_id: currentUser.id,
      location: document.getElementById('oppLocation').value,
      event_date: document.getElementById('oppDate').value,
      event_time: document.getElementById('oppTime').value,
      required_skills: document.getElementById('oppSkills').value
    };
    
    try {
      const response = await fetch(`${API_BASE_URL}/opportunities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Opportunity created successfully!');
        form.reset();
        document.querySelector('[data-section="my-opportunities"]').click();
      } else {
        document.getElementById('createError').textContent = data.error || 'Failed to create opportunity';
      }
    } catch (error) {
      document.getElementById('createError').textContent = 'Network error. Please try again.';
    }
  };
}

async function deleteOpportunity(oppId) {
  if (!confirm('Are you sure you want to delete this opportunity?')) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/opportunities/${oppId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert('Opportunity deleted successfully!');
      await loadMyOpportunities();
    } else {
      alert('Failed to delete opportunity');
    }
  } catch (error) {
    alert('Network error');
  }
}

async function loadReceivedApplications() {
  try {
    // Get all opportunities first
    const oppResponse = await fetch(`${API_BASE_URL}/organization/${currentUser.id}/opportunities`);
    const opportunities = await oppResponse.json();
    
    const container = document.getElementById('applicationsReceived');
    
    if (opportunities.length === 0) {
      container.innerHTML = '<p>No opportunities posted yet.</p>';
      return;
    }
    
    let allApplicationsHTML = '';
    
    for (const opp of opportunities) {
      const appResponse = await fetch(`${API_BASE_URL}/opportunities/${opp.id}/applications`);
      const applications = await appResponse.json();
      
      if (applications.length > 0) {
        allApplicationsHTML += `
          <div class="card" style="margin-bottom: 24px;">
            <div class="card__body">
              <h3>${opp.title}</h3>
              ${applications.map(app => `
                <div style="border-top: 1px solid var(--color-border); padding-top: 16px; margin-top: 16px;">
                  <h4>${app.name}</h4>
                  <p><strong>Email:</strong> ${app.email} | <strong>Phone:</strong> ${app.phone || 'N/A'}</p>
                  <p><strong>Message:</strong> ${app.message || 'No message'}</p>
                  <p><strong>Applied:</strong> ${new Date(app.applied_at).toLocaleDateString()}</p>
                  <span class="status status--${app.status}">${app.status.toUpperCase()}</span>
                  ${app.status === 'pending' ? `
                    <div style="margin-top: 8px;">
                      <button onclick="updateApplicationStatus(${app.id}, 'accepted')" class="btn btn--primary btn--sm">Accept</button>
                      <button onclick="updateApplicationStatus(${app.id}, 'rejected')" class="btn btn--secondary btn--sm">Reject</button>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }
    
    container.innerHTML = allApplicationsHTML || '<p>No applications received yet.</p>';
  } catch (error) {
    console.error('Error loading applications:', error);
  }
}

async function updateApplicationStatus(appId, status) {
  try {
    const response = await fetch(`${API_BASE_URL}/applications/${appId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    
    if (response.ok) {
      alert(`Application ${status}!`);
      await loadReceivedApplications();
    } else {
      alert('Failed to update application');
    }
  } catch (error) {
    alert('Network error');
  }
}

async function viewApplications(oppId) {
  document.querySelector('[data-section="applications"]').click();
}
