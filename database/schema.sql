-- Drop existing database if exists
DROP DATABASE IF EXISTS volunteer_connect_db;

-- Create database
CREATE DATABASE volunteer_connect_db;
USE volunteer_connect_db;

-- Table: volunteers
CREATE TABLE volunteers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    location VARCHAR(100),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: organizations
CREATE TABLE organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(100),
    website VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: skills
CREATE TABLE skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(50) UNIQUE NOT NULL,
    INDEX idx_skill_name (skill_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: volunteer_skills (Many-to-Many junction table)
CREATE TABLE volunteer_skills (
    volunteer_id INT NOT NULL,
    skill_id INT NOT NULL,
    PRIMARY KEY (volunteer_id, skill_id),
    FOREIGN KEY (volunteer_id) REFERENCES volunteers(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    INDEX idx_volunteer (volunteer_id),
    INDEX idx_skill (skill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: opportunities
CREATE TABLE opportunities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    organization_id INT NOT NULL,
    location VARCHAR(100),
    event_date DATE,
    event_time TIME,
    required_skills VARCHAR(200),
    status ENUM('open', 'closed', 'completed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_organization (organization_id),
    INDEX idx_status (status),
    INDEX idx_event_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: applications
CREATE TABLE applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    volunteer_id INT NOT NULL,
    opportunity_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'withdrawn') DEFAULT 'pending',
    message TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (volunteer_id) REFERENCES volunteers(id) ON DELETE CASCADE,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    UNIQUE KEY unique_application (volunteer_id, opportunity_id),
    INDEX idx_volunteer (volunteer_id),
    INDEX idx_opportunity (opportunity_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample skills
INSERT INTO skills (skill_name) VALUES 
('Teaching'), ('Healthcare'), ('Event Management'), ('Social Media'),
('Fundraising'), ('Counseling'), ('IT Support'), ('Cooking'),
('Construction'), ('Environmental Cleanup'), ('Animal Care'), ('Translation');

-- Insert sample organization
INSERT INTO organizations (name, email, password, description, location) VALUES
('Community Help Center', 'admin@community.org', '$2b$10$dummyhashforpassword', 'Helping local communities', 'Mumbai');

-- Insert sample opportunities
INSERT INTO opportunities (title, description, organization_id, location, event_date, event_time, required_skills, status) VALUES
('Beach Cleanup Drive', 'Join us for a coastal cleanup initiative', 1, 'Juhu Beach, Mumbai', '2025-11-05', '08:00:00', 'Environmental Cleanup', 'open'),
('Food Distribution Event', 'Help distribute meals to underprivileged communities', 1, 'Dharavi, Mumbai', '2025-11-10', '10:00:00', 'Event Management,Cooking', 'open'),
('Blood Donation Camp', 'Volunteer coordination for blood donation drive', 1, 'Andheri, Mumbai', '2025-11-15', '09:00:00', 'Healthcare,Event Management', 'open');
