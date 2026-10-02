-- HelpDeskPro Enterprise Relational Database Schema (PostgreSQL)
-- Clean production database setup. Contains NO mock data (only the Admin account).

-- 1. Users Table (Stores Employee ID, Full Name, Role, Department, Password/PIN)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'agent', 'user')),
    department VARCHAR(50) NOT NULL,
    avatar TEXT,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ticket Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- 3. SLA Rules Table
CREATE TABLE IF NOT EXISTS sla_rules (
    id VARCHAR(50) PRIMARY KEY,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    response_time_hours INT NOT NULL,
    resolution_time_hours INT NOT NULL
);

-- 4. Tickets Table (Core Incident Management)
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(50) PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL, -- e.g. INC-10001
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status VARCHAR(30) NOT NULL,
    created_by_id VARCHAR(50) NOT NULL,
    assignee_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    sla_status VARCHAR(20) NOT NULL,
    ai_sentiment VARCHAR(50),
    ai_suggested_category VARCHAR(100),
    ai_summary TEXT,
    attachments TEXT
);

-- 5. Comments Table (Public replies and Internal Staff Notes)
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(50) PRIMARY KEY,
    ticket_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Audit Logs Table (Chronological security & action tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    ticket_id VARCHAR(50),
    action TEXT NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Password Reset Requests Table
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Admin Account (Sarah Jenkins / EMP-001 / adminpassword)
INSERT INTO users (id, employee_id, full_name, role, department, avatar, password) 
VALUES (
    'usr-1', 
    'EMP-001', 
    'Sarah Jenkins', 
    'admin', 
    'IT Management', 
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 
    'adminpassword'
) ON CONFLICT (id) DO NOTHING;

-- Seed Default Ticket Categories
INSERT INTO categories (id, name, description) VALUES
('cat-1', 'Hardware & Peripherals', 'Laptops, monitors, keyboards, docking stations'),
('cat-2', 'Software & Licensing', 'OS issues, Office 365, VPN, specialized apps'),
('cat-3', 'Network & Wi-Fi', 'Connectivity, VPN drops, LAN port issues'),
('cat-4', 'Security & Access', 'Password resets, 2FA setup, unauthorized access flags'),
('cat-5', 'Cloud & Infrastructure', 'AWS, database access, server restarts')
ON CONFLICT (id) DO NOTHING;

-- Seed Default SLA Rules
INSERT INTO sla_rules (id, priority, response_time_hours, resolution_time_hours) VALUES
('sla-1', 'Urgent', 1, 4),
('sla-2', 'High', 2, 8),
('sla-3', 'Medium', 4, 24),
('sla-4', 'Low', 8, 48)
ON CONFLICT (id) DO NOTHING;
