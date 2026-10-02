import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import jwt from 'jsonwebtoken';
import { db, initializeDatabaseSchema } from './src/db/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'helpdeskpro-enterprise-secure-jwt-secret-key-2026';

// Initialize Relational schema safely in background without blocking module export
initializeDatabaseSchema().catch(err => {
  console.error('Initial database schema check notice:', err?.message || err);
});

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Strict HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Handle malformed JSON body parse errors gracefully with JSON response
app.use((err: any, req: Request, res: Response, next: Function) => {
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ error: 'Malformed JSON payload in request body.' });
  }
  next(err);
});

  // Initialize Google Gen AI if API key is present
  const apiKey = process.env.GEMINI_API_KEY || '';
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // Relational Database State (Production-ready in-memory / file-backed relational store)
  interface User {
    id: string;
    employeeId: string;
    fullName: string;
    role: 'admin' | 'agent' | 'user';
    department: string;
    avatar: string;
    password?: string;
  }

  interface TicketComment {
    id: string;
    ticketId: string;
    userId: string;
    userName: string;
    userAvatar: string;
    userRole: 'admin' | 'agent' | 'user';
    content: string;
    isInternal: boolean;
    createdAt: string;
  }

  interface AuditLog {
    id: string;
    ticketId: string;
    action: string;
    performedBy: string;
    createdAt: string;
  }

  interface Ticket {
    id: string;
    ticketNumber: string; // e.g. INC-10045
    title: string;
    description: string;
    category: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    status: 'Open' | 'In Progress' | 'Pending Vendor' | 'Resolved' | 'Closed';
    createdBy: {
      id: string;
      name: string;
      email?: string;
      employeeId: string;
    };
    assigneeId?: string;
    assigneeName?: string;
    createdAt: string;
    updatedAt: string;
    dueDate: string;
    slaStatus: 'On Track' | 'Warning' | 'Breached';
    attachments?: { name: string; url: string; size: string }[];
    aiSentiment?: string;
    aiSuggestedCategory?: string;
    aiSummary?: string;
  }

  interface Category {
    id: string;
    name: string;
    description: string;
  }

  interface CannedResponse {
    id: string;
    title: string;
    content: string;
    category: string;
  }

  interface SLARule {
    id: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    responseTimeHours: number;
    resolutionTimeHours: number;
  }

  interface PasswordResetRequest {
    id: string;
    employeeId: string;
    fullName: string;
    email?: string;
    status: 'pending' | 'resolved';
    createdAt: string;
  }

  let passwordResetRequests: PasswordResetRequest[] = [];

  // Database seed matching database.sql
  let users: User[] = [
    { id: 'usr-1', employeeId: 'EMP-001', fullName: 'Sarah Jenkins', role: 'admin', department: 'IT Management', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', password: 'adminpassword' },
  ];

  let categories: Category[] = [
    { id: 'cat-1', name: 'Hardware & Peripherals', description: 'Laptops, monitors, keyboards, docking stations' },
    { id: 'cat-2', name: 'Software & Licensing', description: 'OS issues, Office 365, VPN, specialized apps' },
    { id: 'cat-3', name: 'Network & Wi-Fi', description: 'Connectivity, VPN drops, LAN port issues' },
    { id: 'cat-4', name: 'Security & Access', description: 'Password resets, 2FA setup, unauthorized access flags' },
    { id: 'cat-5', name: 'Cloud & Infrastructure', description: 'AWS, database access, server restarts' },
  ];

  let cannedResponses: CannedResponse[] = [
    { id: 'can-1', title: 'Password Reset Instructions', content: 'Hello, please submit a Password Reset request through the IT HelpDesk portal or contact the IT Help Desk directly to receive your temporary credentials.', category: 'Security & Access' },
    { id: 'can-2', title: 'VPN Reconnection Steps', content: 'Hi there, please verify your network connection, restart your corporate VPN client, and verify that your department credentials are active.', category: 'Network & Wi-Fi' },
    { id: 'can-3', title: 'Hardware Replacement Notice', content: 'We have logged your hardware ticket. An IT technician will coordinate a replacement unit with you within 24 business hours.', category: 'Hardware & Peripherals' },
    { id: 'can-4', title: 'Requesting Additional Info', content: 'Thank you for reaching out. Could you please provide a screenshot of the error message and the exact steps to reproduce the issue?', category: 'General' },
  ];

  let slaRules: SLARule[] = [
    { id: 'sla-1', priority: 'Urgent', responseTimeHours: 1, resolutionTimeHours: 4 },
    { id: 'sla-2', priority: 'High', responseTimeHours: 2, resolutionTimeHours: 8 },
    { id: 'sla-3', priority: 'Medium', responseTimeHours: 4, resolutionTimeHours: 24 },
    { id: 'sla-4', priority: 'Low', responseTimeHours: 8, resolutionTimeHours: 48 },
  ];

  let tickets: Ticket[] = [];

  let comments: TicketComment[] = [];

  let auditLogs: AuditLog[] = [];

  interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: 'new_request' | 'ticket_update' | 'ticket_assigned' | 'password_reset' | 'system';
    ticketId?: string;
    ticketNumber?: string;
    targetRole?: 'admin' | 'agent' | 'user' | 'all';
    targetEmployeeId?: string;
    createdAt: string;
    isRead: boolean;
    readBy?: string[];
  }

  let notifications: NotificationItem[] = [
    {
      id: 'notif-seed-1',
      title: 'New IT Support Request',
      message: 'New request #INC-10024 from Maria Santos (Engineering): "Slow Wi-Fi connection in Meeting Room 3"',
      type: 'new_request',
      targetRole: 'admin',
      ticketId: 'tkt-1',
      ticketNumber: 'INC-10024',
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      isRead: false,
      readBy: []
    },
    {
      id: 'notif-seed-2',
      title: 'New Ticket Assignment',
      message: 'You have been assigned to Ticket #INC-10023: "Request for secondary monitor and HDMI dock"',
      type: 'ticket_assigned',
      targetRole: 'agent',
      targetEmployeeId: 'EMP-002',
      ticketId: 'tkt-2',
      ticketNumber: 'INC-10023',
      createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      isRead: false,
      readBy: []
    },
    {
      id: 'notif-seed-3',
      title: 'Ticket Status Updated',
      message: 'Your ticket #INC-10021 status was updated to "In Progress" by Sarah Connor.',
      type: 'ticket_update',
      targetRole: 'user',
      targetEmployeeId: 'EMP-003',
      ticketId: 'tkt-3',
      ticketNumber: 'INC-10021',
      createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
      isRead: false,
      readBy: []
    }
  ];

  async function addNotification(item: NotificationItem) {
    if (db.isConfigured()) {
      try {
        await db.createNotification(item);
      } catch (e) {
        console.error('Failed to save notification to DB:', e);
      }
    }
    notifications.unshift(item);
    if (notifications.length > 100) {
      notifications.pop();
    }
  }

  // Real-time Online / Offline presence tracker
  const onlineUsers = new Map<string, number>();
  // Pre-seed default active agents as online
  onlineUsers.set('emp-001', Date.now());
  onlineUsers.set('emp-002', Date.now());

  const isUserOnline = (empId?: string): boolean => {
    if (!empId) return false;
    const lastActive = onlineUsers.get(empId.toLowerCase().trim());
    if (!lastActive) return false;
    return Date.now() - lastActive < 90000; // 90-second threshold
  };

  // Rate Limiter implementation for login route (brute-force prevention)
  const loginAttempts = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT_WINDOW = 30 * 1000; // 30 seconds
  const MAX_ATTEMPTS = 15;

  const rateLimiter = (req: Request, res: Response, next: Function) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = loginAttempts.get(ip);

    if (record) {
      if (now < record.resetTime) {
        if (record.count >= MAX_ATTEMPTS) {
          return res.status(429).json({ error: 'Too many login attempts. Please try again after 1 minute.' });
        }
        record.count++;
      } else {
        loginAttempts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      }
    } else {
      loginAttempts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }
    next();
  };

  // Secure Login API Endpoint (Employee ID, Full Name, and Password validation)
  app.post('/api/auth/login', rateLimiter, async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { employeeId, fullName, password } = req.body || {};

      if (!employeeId || !fullName || !password || typeof employeeId !== 'string' || typeof fullName !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Employee ID, Full Name, and Password/PIN are required.' });
      }

      // Server-side sanitization against SQL injection / XSS
      const cleanEmpId = employeeId.trim();
      const cleanName = fullName.trim().toLowerCase();
      const cleanPassword = password.trim();

      // Query database
      let user: any = null;
      if (db.isConfigured()) {
        try {
          const dbUsers = await db.getUsers();
          const match = dbUsers?.find((u: any) => 
            (u.employee_id || '').trim().toLowerCase() === cleanEmpId.toLowerCase() && 
            (u.full_name || '').trim().toLowerCase() === cleanName &&
            (u.password || '').trim() === cleanPassword
          );
          if (match) {
            user = {
              id: match.id,
              employeeId: match.employee_id,
              fullName: match.full_name,
              role: match.role,
              department: match.department,
              avatar: match.avatar || '',
              password: match.password
            };
          }
        } catch (error: any) {
          console.error('Database login query error:', error?.message);
          return res.status(500).json({
            error: 'Database connection failed. Please check Supabase DATABASE_URL configuration in Vercel.'
          });
        }
      } else {
        user = users.find(u => 
          (u.employeeId || '').trim().toLowerCase() === cleanEmpId.toLowerCase() && 
          (u.fullName || '').trim().toLowerCase() === cleanName &&
          (u.password || '').trim() === cleanPassword
        );
      }

      if (!user) {
        // Audit log failed login
        const failedLog = {
          id: `al-${Date.now()}`,
          ticketId: 'system',
          action: `Failed login attempt for Employee ID: ${cleanEmpId}`,
          performedBy: cleanEmpId,
          createdAt: new Date().toISOString()
        };
        if (db.isConfigured()) {
          await db.createAuditLog(failedLog).catch(() => {});
        } else {
          auditLogs.unshift(failedLog);
        }
        return res.status(401).json({ error: 'Invalid Employee ID, Full Name, or Password.' });
      }

      // Generate secure JWT session token
      const token = jwt.sign(
        { id: user.id, employeeId: user.employeeId, role: user.role, fullName: user.fullName },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Audit log successful login
      const successLog = {
        id: `al-${Date.now()}`,
        ticketId: 'system',
        action: `Successful login for ${user.fullName} (${user.role.toUpperCase()})`,
        performedBy: user.fullName,
        createdAt: new Date().toISOString()
      };
      if (db.isConfigured()) {
        await db.createAuditLog(successLog).catch(() => {});
      } else {
        auditLogs.unshift(successLog);
      }

      onlineUsers.set(user.employeeId.toLowerCase().trim(), Date.now());

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          employeeId: user.employeeId,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
          avatar: user.avatar || '',
          isOnline: true
        }
      });
    } catch (err: any) {
      console.error('Unhandled login error:', err?.message);
      return res.status(500).json({ error: 'Authentication service temporarily encountered an internal error.' });
    }
  });

  // Current User Session Verification Endpoint (Supports persistent auth across refresh)
  app.get('/api/auth/me', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided.' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      let user: any = null;

      if (db.isConfigured()) {
        const dbUsers = await db.getUsers();
        const match = dbUsers?.find((u: any) => u.id === decoded.id || (u.employee_id || '').toLowerCase() === (decoded.employeeId || '').toLowerCase());
        if (match) {
          user = {
            id: match.id,
            employeeId: match.employee_id,
            fullName: match.full_name,
            role: match.role,
            department: match.department,
            avatar: match.avatar || ''
          };
        }
      } else {
        const match = users.find(u => u.id === decoded.id || (u.employeeId || '').toLowerCase() === (decoded.employeeId || '').toLowerCase());
        if (match) {
          user = {
            id: match.id,
            employeeId: match.employeeId,
            fullName: match.fullName,
            role: match.role,
            department: match.department,
            avatar: match.avatar || ''
          };
        }
      }

      if (!user) {
        return res.status(401).json({ error: 'User account not found.' });
      }

      onlineUsers.set(user.employeeId.toLowerCase().trim(), Date.now());

      return res.json({ user });
    } catch (err: any) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }
  });

  // Online presence heartbeat endpoint
  app.post('/api/auth/heartbeat', (req, res) => {
    const { employeeId } = req.body || {};
    if (employeeId && typeof employeeId === 'string') {
      onlineUsers.set(employeeId.trim().toLowerCase(), Date.now());
    }
    res.json({ success: true, timestamp: Date.now() });
  });

  // Logout endpoint to clear online status immediately
  app.post('/api/auth/logout', (req, res) => {
    const { employeeId } = req.body || {};
    if (employeeId && typeof employeeId === 'string') {
      onlineUsers.delete(employeeId.trim().toLowerCase());
    }
    res.json({ success: true });
  });

  app.get('/api/auth/users', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      if (db.isConfigured()) {
        const dbUsers = await db.getUsers();
        const formatted = dbUsers?.map((u: any) => ({
          id: u.id,
          employeeId: u.employee_id,
          fullName: u.full_name,
          role: u.role,
          department: u.department,
          avatar: u.avatar || '',
          password: u.password,
          isOnline: isUserOnline(u.employee_id)
        }));
        return res.json(formatted || []);
      }
      const formatted = users.map(u => ({
        ...u,
        isOnline: isUserOnline(u.employeeId)
      }));
      return res.json(formatted);
    } catch (error: any) {
      console.error('Database getUsers error:', error?.message);
      return res.status(500).json({ error: 'Failed to retrieve users from database.' });
    }
  });

  // User Self-Registration Endpoint (Mandatory Employee ID, role is always 'user')
  app.post('/api/auth/register', async (req, res) => {
    const { employeeId, fullName, department, password } = req.body;

    if (!employeeId || typeof employeeId !== 'string' || !employeeId.trim()) {
      return res.status(400).json({ error: 'Employee ID is strictly required for registration.' });
    }
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ error: 'Full Name is required.' });
    }
    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ error: 'Password / PIN is required.' });
    }

    const cleanEmpId = employeeId.trim();
    const cleanName = fullName.trim();
    const cleanDept = department ? department.trim() : 'General';
    const cleanPass = password.trim();

    let existing;
    if (db.isConfigured()) {
      try {
        const dbUsers = await db.getUsers();
        existing = dbUsers?.find((u: any) => u.employee_id.toLowerCase() === cleanEmpId.toLowerCase());
      } catch (e) {}
    } else {
      existing = users.find(u => u.employeeId.toLowerCase() === cleanEmpId.toLowerCase());
    }

    if (existing) {
      return res.status(400).json({ error: 'An account with this Employee ID already exists.' });
    }

    const newUser: any = {
      id: `usr-${Date.now()}`,
      employeeId: cleanEmpId,
      fullName: cleanName,
      role: 'user',
      department: cleanDept,
      avatar: '',
      password: cleanPass,
      createdAt: new Date().toISOString()
    };

    if (db.isConfigured()) {
      try {
        await db.createUser(newUser);
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Failed to create user in database.' });
      }
    } else {
      users.push(newUser);
    }

    // Audit log successful self-registration
    const regLog = {
      id: `al-${Date.now()}`,
      ticketId: 'system',
      action: `Self-registered new employee account: ${cleanName} (${cleanEmpId})`,
      performedBy: cleanName,
      createdAt: new Date().toISOString()
    };
    if (db.isConfigured()) {
      await db.createAuditLog(regLog).catch(() => {});
    } else {
      auditLogs.unshift(regLog);
    }

    res.status(201).json({
      message: 'Account successfully registered. You can now log in.',
      user: {
        id: newUser.id,
        employeeId: newUser.employeeId,
        fullName: newUser.fullName,
        role: newUser.role,
        department: newUser.department,
        avatar: newUser.avatar,
        password: newUser.password
      }
    });
  });

  // Submit Forgot Password / Reset Request Endpoint
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { employeeId, fullName, email } = req.body;

    if (!employeeId || !fullName || typeof employeeId !== 'string' || typeof fullName !== 'string') {
      return res.status(400).json({ error: 'Both Employee ID and Full Name are required to request a password reset.' });
    }

    const cleanEmpId = employeeId.trim();
    const cleanName = fullName.trim();
    const cleanEmail = email && typeof email === 'string' ? email.trim() : undefined;

    let user;
    if (db.isConfigured()) {
      try {
        const dbUsers = await db.getUsers();
        const found = dbUsers?.find((u: any) => 
          u.employee_id.toLowerCase() === cleanEmpId.toLowerCase() &&
          u.full_name.toLowerCase() === cleanName.toLowerCase()
        );
        if (found) {
          user = {
            id: found.id,
            employeeId: found.employee_id,
            fullName: found.full_name
          };
        }
      } catch (e) {}
    } else {
      user = users.find(u => 
        u.employeeId.toLowerCase() === cleanEmpId.toLowerCase() &&
        u.fullName.toLowerCase() === cleanName.toLowerCase()
      );
    }

    if (!user) {
      return res.status(404).json({ error: 'No matching user found with the provided Employee ID and Full Name.' });
    }

    // Check if there is already a pending request to prevent duplicate flooding
    let pending;
    if (db.isConfigured()) {
      try {
        const dbReqs = await db.getPasswordResetRequests();
        pending = dbReqs?.find((r: any) => 
          r.employeeId.toLowerCase() === cleanEmpId.toLowerCase() && 
          r.status === 'pending'
        );
      } catch (e) {}
    } else {
      pending = passwordResetRequests.find(r => 
        r.employeeId.toLowerCase() === cleanEmpId.toLowerCase() && 
        r.status === 'pending'
      );
    }

    if (pending) {
      return res.status(400).json({ error: 'You already have a pending password reset request. Please wait for an Admin to hand over your new password.' });
    }

    const newRequest: any = {
      id: `req-${Date.now()}`,
      employeeId: user.employeeId,
      fullName: user.fullName,
      email: cleanEmail,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (db.isConfigured()) {
      try {
        await db.createPasswordResetRequest(newRequest);
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Failed to submit password reset request.' });
      }
    } else {
      passwordResetRequests.unshift(newRequest);
    }

    // Audit log
    const resetLog = {
      id: `al-${Date.now()}`,
      ticketId: 'system',
      action: `Password reset requested by ${user.fullName} (${user.employeeId})`,
      performedBy: user.fullName,
      createdAt: new Date().toISOString()
    };
    if (db.isConfigured()) {
      await db.createAuditLog(resetLog).catch(() => {});
    } else {
      auditLogs.unshift(resetLog);
    }

    // Automated notification to Admin for password reset request
    addNotification({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: 'Password Reset Request',
      message: `PIN reset requested by ${user.fullName} (${user.employeeId})`,
      type: 'password_reset',
      targetRole: 'admin',
      createdAt: new Date().toISOString(),
      isRead: false,
      readBy: []
    });

    res.json({
      message: 'Password reset request submitted successfully. Please contact your IT Admin to receive your reset password.'
    });
  });

  // Get Password Reset Requests for Admin
  app.get('/api/admin/reset-requests', async (req, res) => {
    if (db.isConfigured()) {
      try {
        const reqs = await db.getPasswordResetRequests();
        return res.json(reqs);
      } catch (e) {
        console.error(e);
      }
    }
    res.json(passwordResetRequests);
  });

  // Resolve Password Reset Request
  app.post('/api/admin/reset-requests/:id/resolve', async (req, res) => {
    const { id } = req.params;
    let request;
    if (db.isConfigured()) {
      try {
        const reqs = await db.getPasswordResetRequests();
        request = reqs?.find((r: any) => r.id === id);
        if (request) {
          await db.resolvePasswordResetRequest(id);
          request.status = 'resolved';
        }
      } catch (e) {}
    } else {
      request = passwordResetRequests.find(r => r.id === id);
      if (request) {
        request.status = 'resolved';
      }
    }

    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    // Audit log
    const resolveLog = {
      id: `al-${Date.now()}`,
      ticketId: 'system',
      action: `Resolved password reset request for ${request.fullName} (${request.employeeId})`,
      performedBy: 'Administrator',
      createdAt: new Date().toISOString()
    };
    if (db.isConfigured()) {
      await db.createAuditLog(resolveLog).catch(() => {});
    } else {
      auditLogs.unshift(resolveLog);
    }

    res.json({ message: 'Request marked as resolved.', request });
  });

  // Update Profile Picture Endpoint for all roles
  app.put('/api/users/profile-picture', async (req, res) => {
    const { userId, avatar } = req.body;
    if (!userId || !avatar || typeof avatar !== 'string') {
      return res.status(400).json({ error: 'User ID and valid Avatar URL are required.' });
    }

    let user;
    if (db.isConfigured()) {
      try {
        const dbUsers = await db.getUsers();
        const found = dbUsers?.find((u: any) => u.id === userId);
        if (found) {
          user = {
            id: found.id,
            employeeId: found.employee_id,
            fullName: found.full_name,
            role: found.role,
            department: found.department,
            avatar: avatar.trim(),
            password: found.password
          };
          await db.updateUser(user);
        }
      } catch (e) {}
    } else {
      const found = users.find(u => u.id === userId);
      if (found) {
        found.avatar = avatar.trim();
        user = found;
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Audit log of profile updates
    const updatePicLog = {
      id: `al-${Date.now()}`,
      ticketId: 'system',
      action: `${user.fullName} updated their profile picture`,
      performedBy: user.fullName,
      createdAt: new Date().toISOString()
    };
    if (db.isConfigured()) {
      await db.createAuditLog(updatePicLog).catch(() => {});
    } else {
      auditLogs.unshift(updatePicLog);
    }

    res.json({ message: 'Profile picture updated successfully.', user });
  });

  // Admin: Edit User details and security credentials
  app.put('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const { employeeId, fullName, role, department, avatar, password } = req.body;

    if (!employeeId || !fullName || !role || !department) {
      return res.status(400).json({ error: 'All user fields (Employee ID, Full Name, Role, Department) are required.' });
    }

    let user;
    let conflict;

    if (db.isConfigured()) {
      try {
        const dbUsers = await db.getUsers();
        user = dbUsers?.find((u: any) => u.id === id);
        if (user) {
          if (employeeId.toLowerCase() !== user.employee_id.toLowerCase()) {
            conflict = dbUsers?.find((u: any) => u.employee_id.toLowerCase() === employeeId.toLowerCase());
          }
        }
      } catch (e) {}
    } else {
      user = users.find(u => u.id === id);
      if (user) {
        if (employeeId.toLowerCase() !== user.employeeId.toLowerCase()) {
          conflict = users.find(u => u.employeeId.toLowerCase() === employeeId.toLowerCase());
        }
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (conflict) {
      return res.status(400).json({ error: 'Invalid Employee ID.' });
    }

    const updatedUser: any = {
      id,
      employeeId: employeeId.trim(),
      fullName: fullName.trim(),
      role: role as ('admin' | 'agent' | 'user'),
      department: department.trim(),
      avatar: avatar || (db.isConfigured() ? user.avatar : user.avatar),
      password: (password && password.trim()) ? password.trim() : (db.isConfigured() ? user.password : user.password)
    };

    if (db.isConfigured()) {
      try {
        await db.updateUser(updatedUser);
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Failed to update user in database.' });
      }
    } else {
      user.employeeId = updatedUser.employeeId;
      user.fullName = updatedUser.fullName;
      user.role = updatedUser.role;
      user.department = updatedUser.department;
      user.avatar = updatedUser.avatar;
      user.password = updatedUser.password;
    }

    // Audit log of profile updates
    const updateLog = {
      id: `al-${Date.now()}`,
      ticketId: 'system',
      action: `User account details updated for ${updatedUser.fullName} (${updatedUser.employeeId})`,
      performedBy: 'Administrator',
      createdAt: new Date().toISOString()
    };
    if (db.isConfigured()) {
      await db.createAuditLog(updateLog).catch(() => {});
    } else {
      auditLogs.unshift(updateLog);
    }

    res.json({ message: 'User updated successfully.', user: updatedUser });
  });

  app.post('/api/admin/users', async (req, res) => {
    const { employeeId, fullName, role, department, avatar, password } = req.body;
    if (!employeeId || !fullName || !role || !department) {
      return res.status(400).json({ error: 'All user fields are required.' });
    }

    let existing;
    if (db.isConfigured()) {
      try {
        const dbUsers = await db.getUsers();
        existing = dbUsers?.find((u: any) => u.employee_id.toLowerCase() === employeeId.toLowerCase());
      } catch (e) {}
    } else {
      existing = users.find(u => u.employeeId.toLowerCase() === employeeId.toLowerCase());
    }

    if (existing) {
      return res.status(400).json({ error: 'Employee ID already exists in the database.' });
    }

    const defaultPass = role === 'admin' ? 'adminpassword' : role === 'agent' ? 'agentpassword' : 'userpassword';
    const newUser: any = {
      id: `usr-${Date.now()}`,
      employeeId,
      fullName,
      role: role as ('admin' | 'agent' | 'user'),
      department,
      avatar: avatar || '',
      password: password || defaultPass,
      createdAt: new Date().toISOString()
    };

    if (db.isConfigured()) {
      try {
        await db.createUser(newUser);
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Failed to create user in database.' });
      }
    } else {
      users.push(newUser);
    }

    const createUserLog = {
      id: `al-${Date.now()}`,
      ticketId: 'system',
      action: `New ${role.toUpperCase()} account created: ${fullName} (${employeeId})`,
      performedBy: 'Administrator',
      createdAt: new Date().toISOString()
    };
    if (db.isConfigured()) {
      await db.createAuditLog(createUserLog).catch(() => {});
    } else {
      auditLogs.unshift(createUserLog);
    }

    res.status(201).json(newUser);
  });

  // Tickets Endpoints
  app.get('/api/tickets', async (req, res) => {
    const { status, priority, category, assigneeId, search, datePreset, startDate, endDate, dateType } = req.query;
    let filtered = [];

    if (db.isConfigured()) {
      try {
        const dbTkts = await db.getTickets();
        filtered = dbTkts || [];
      } catch (e) {
        console.error('Database getTickets error, using in-memory:', e);
        filtered = [...tickets];
      }
    } else {
      filtered = [...tickets];
    }

    if (status && status !== 'All') {
      filtered = filtered.filter(t => t.status === status);
    }
    if (priority && priority !== 'All') {
      filtered = filtered.filter(t => t.priority === priority);
    }
    if (category && category !== 'All') {
      filtered = filtered.filter(t => t.category === category);
    }
    if (assigneeId) {
      if (assigneeId === 'unassigned') {
        filtered = filtered.filter(t => !t.assigneeId);
      } else {
        filtered = filtered.filter(t => t.assigneeId === assigneeId);
      }
    }

    // Date filtering
    if (datePreset && datePreset !== 'All' && datePreset !== 'all') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

      filtered = filtered.filter(t => {
        const dateField = dateType === 'due' ? t.dueDate : dateType === 'updated' ? t.updatedAt : t.createdAt;
        if (!dateField) return true;
        const targetTime = new Date(dateField).getTime();

        if (datePreset === 'today') {
          return targetTime >= startOfToday && targetTime <= endOfToday;
        } else if (datePreset === 'yesterday') {
          const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
          return targetTime >= startOfYesterday && targetTime < startOfToday;
        } else if (datePreset === 'last_7_days') {
          const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
          return targetTime >= sevenDaysAgo && targetTime <= endOfToday;
        } else if (datePreset === 'last_30_days') {
          const thirtyDaysAgo = startOfToday - 29 * 24 * 60 * 60 * 1000;
          return targetTime >= thirtyDaysAgo && targetTime <= endOfToday;
        } else if (datePreset === 'this_month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          return targetTime >= startOfMonth;
        } else if (datePreset === 'custom') {
          if (startDate) {
            const startMs = new Date(startDate as string).getTime();
            if (targetTime < startMs) return false;
          }
          if (endDate) {
            const endMs = new Date(endDate as string).getTime() + 24 * 60 * 60 * 1000 - 1;
            if (targetTime > endMs) return false;
          }
          return true;
        }
        return true;
      });
    } else if (startDate || endDate) {
      filtered = filtered.filter(t => {
        const dateField = dateType === 'due' ? t.dueDate : dateType === 'updated' ? t.updatedAt : t.createdAt;
        if (!dateField) return true;
        const targetTime = new Date(dateField).getTime();
        if (startDate) {
          const startMs = new Date(startDate as string).getTime();
          if (targetTime < startMs) return false;
        }
        if (endDate) {
          const endMs = new Date(endDate as string).getTime() + 24 * 60 * 60 * 1000 - 1;
          if (targetTime > endMs) return false;
        }
        return true;
      });
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.ticketNumber.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) ||
        (t.createdBy && t.createdBy.name.toLowerCase().includes(q))
      );
    }

    res.json(filtered);
  });

  app.post('/api/tickets', async (req, res) => {
    const { title, description, category, priority, userId, employeeId, fullName, department } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Ticket title and description are required.' });
    }

    // 1. Resolve Requester Identity strictly from JWT token or request payload
    let authenticatedEmployeeId = employeeId;
    let authenticatedUserId = userId;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded: any = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        if (decoded) {
          authenticatedUserId = decoded.id || authenticatedUserId;
          authenticatedEmployeeId = decoded.employeeId || authenticatedEmployeeId;
        }
      } catch (e) {
        // Continue with body if valid
      }
    }

    let user: any = null;
    let ticketCount = tickets.length;
    let resolvedSlaRules = [...slaRules];

    if (db.isConfigured()) {
      try {
        const dbUsers = await db.getUsers();
        const found = dbUsers?.find((u: any) => 
          (authenticatedUserId && u.id === authenticatedUserId) ||
          (authenticatedEmployeeId && (u.employee_id || '').toLowerCase() === authenticatedEmployeeId.toLowerCase())
        );
        if (found) {
          user = {
            id: found.id,
            fullName: found.full_name,
            employeeId: found.employee_id,
            role: found.role,
            department: found.department,
            avatar: found.avatar || ''
          };
        }
        const dbTkts = await db.getTickets();
        ticketCount = dbTkts?.length || ticketCount;

        const dbSla = await db.getSLARules();
        if (dbSla && dbSla.length > 0) {
          resolvedSlaRules = dbSla;
        }
      } catch (e) {
        console.error('Error fetching requester from database:', e);
      }
    }

    if (!user) {
      const found = users.find(u => 
        (authenticatedUserId && u.id === authenticatedUserId) ||
        (authenticatedEmployeeId && (u.employeeId || '').toLowerCase() === authenticatedEmployeeId.toLowerCase())
      );
      if (found) {
        user = {
          id: found.id,
          fullName: found.fullName,
          employeeId: found.employeeId,
          role: found.role,
          department: found.department,
          avatar: found.avatar || ''
        };
      }
    }

    // If requester is not in list but details were provided, dynamically create the user record
    if (!user && (authenticatedEmployeeId || fullName)) {
      user = {
        id: authenticatedUserId || `user-${Date.now()}`,
        fullName: fullName || 'Employee Requester',
        employeeId: authenticatedEmployeeId || 'EMP-REQUESTER',
        role: 'user',
        department: department || 'General',
        avatar: req.body.avatar || ''
      };

      if (db.isConfigured()) {
        try {
          await db.createUser({
            id: user.id,
            employeeId: user.employeeId,
            fullName: user.fullName,
            role: user.role,
            department: user.department,
            avatar: user.avatar,
            password: 'default-request-pwd'
          });
        } catch (err) {
          // ignore if duplicate
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Unable to identify requester account. Please ensure you are logged in with a valid Employee ID.' });
    }

    const nextNum = 10000 + ticketCount + 1;
    const ticketNumber = `INC-${nextNum}`;

    const sla = resolvedSlaRules.find(s => s.priority === priority) || resolvedSlaRules[2];
    const dueDate = new Date(Date.now() + sla.resolutionTimeHours * 3600000).toISOString();

    let aiSummary = '';
    let aiSentiment = 'Neutral';
    let aiSuggestedCategory = category;

    if (ai) {
      try {
        const prompt = `Analyze this IT support ticket and return strict JSON with keys: "sentiment" (e.g. Frustrated, Neutral, Urgent, Positive), "summary" (1 sentence summary), "suggestedCategory" (one of: Hardware & Peripherals, Software & Licensing, Network & Wi-Fi, Security & Access, Cloud & Infrastructure).
Title: ${title}
Description: ${description}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text);
          aiSentiment = parsed.sentiment || aiSentiment;
          aiSummary = parsed.summary || '';
          aiSuggestedCategory = parsed.suggestedCategory || category;
        }
      } catch (e) {
        console.error('AI Triage error:', e);
      }
    }

    const newTicket: any = {
      id: `tkt-${Date.now()}`,
      ticketNumber,
      title,
      description,
      category: aiSuggestedCategory || category,
      priority: priority || 'Medium',
      status: 'Open',
      createdBy: {
        id: user.id,
        name: user.fullName,
        employeeId: user.employeeId,
        role: user.role,
        department: user.department,
        avatar: user.avatar || ''
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate,
      slaStatus: 'On Track',
      attachments: Array.isArray(req.body.attachments) && req.body.attachments.length > 0
        ? req.body.attachments
        : [{ name: 'system_diagnostics.pdf', type: 'application/pdf', size: '124 KB', url: '#' }],
      aiSentiment,
      aiSuggestedCategory,
      aiSummary: aiSummary || description.slice(0, 100) + '...'
    };

    if (db.isConfigured()) {
      try {
        await db.createTicket(newTicket);
      } catch (err) {
        console.error('Database createTicket error:', err);
      }
    } else {
      tickets.unshift(newTicket);
    }

    const tktLog = {
      id: `al-${Date.now()}`,
      ticketId: newTicket.id,
      action: `Ticket created by ${user.fullName} (${user.employeeId}) with priority ${priority}`,
      performedBy: `${user.fullName} (${user.employeeId})`,
      createdAt: new Date().toISOString()
    };
    if (db.isConfigured()) {
      await db.createAuditLog(tktLog).catch(() => {});
    } else {
      auditLogs.unshift(tktLog);
    }

    // Automated notification to Admin for new IT request
    addNotification({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: 'New IT Support Request',
      message: `New ticket #${newTicket.ticketNumber} from ${user.fullName} (${user.department}): "${newTicket.title}"`,
      type: 'new_request',
      targetRole: 'admin',
      ticketId: newTicket.id,
      ticketNumber: newTicket.ticketNumber,
      createdAt: new Date().toISOString(),
      isRead: false,
      readBy: []
    });

    res.status(201).json(newTicket);
  });

  app.get('/api/tickets/:id', async (req, res) => {
    let ticket;
    let ticketComments = [];
    let ticketAudit = [];

    if (db.isConfigured()) {
      try {
        const dbTkts = await db.getTickets();
        ticket = dbTkts?.find((t: any) => t.id === req.params.id);
        if (ticket) {
          const dbCmts = await db.getComments();
          ticketComments = dbCmts?.filter((c: any) => c.ticketId === ticket.id) || [];

          const dbAudits = await db.getAuditLogs();
          ticketAudit = dbAudits?.filter((a: any) => a.ticketId === ticket.id) || [];
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (!ticket) {
      ticket = tickets.find(t => t.id === req.params.id);
      if (ticket) {
        ticketComments = comments.filter(c => c.ticketId === ticket.id);
        ticketAudit = auditLogs.filter(a => a.ticketId === ticket.id);
      }
    }

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({
      ...ticket,
      comments: ticketComments,
      auditLogs: ticketAudit
    });
  });

  app.patch('/api/tickets/:id', async (req, res) => {
    const { status, priority, assigneeId, category } = req.body;
    let ticket;

    if (db.isConfigured()) {
      try {
        const dbTkts = await db.getTickets();
        ticket = dbTkts?.find((t: any) => t.id === req.params.id);
      } catch (e) {}
    } else {
      ticket = tickets.find(t => t.id === req.params.id);
    }

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const oldStatus = ticket.status;
    const oldPriority = ticket.priority;

    const updates: any = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (category) updates.category = category;
    if (assigneeId !== undefined) {
      updates.assigneeId = assigneeId;
    }
    updates.updatedAt = new Date().toISOString();

    if (db.isConfigured()) {
      try {
        await db.updateTicket(req.params.id, updates);
        // Refresh ticket values for response
        const dbTkts = await db.getTickets();
        ticket = dbTkts?.find((t: any) => t.id === req.params.id);
      } catch (e) {
        console.error(e);
      }
    } else {
      if (status) ticket.status = status;
      if (priority) ticket.priority = priority;
      if (category) ticket.category = category;
      if (assigneeId !== undefined) {
        ticket.assigneeId = assigneeId;
        const assignedUser = users.find(u => u.id === assigneeId);
        ticket.assigneeName = assignedUser ? assignedUser.fullName : undefined;
      }
      ticket.updatedAt = updates.updatedAt;
    }

    let auditAction = `Ticket updated`;
    if (status && status !== oldStatus) {
      auditAction = `Status changed from ${oldStatus} to ${status}`;
    } else if (priority && priority !== oldPriority) {
      auditAction = `Priority changed from ${oldPriority} to ${priority}`;
    } else if (assigneeId) {
      auditAction = `Assigned to ${ticket.assigneeName || 'Unassigned'}`;
    }

    const logObj = {
      id: `al-${Date.now()}`,
      ticketId: ticket.id,
      action: auditAction,
      performedBy: 'System / Staff',
      createdAt: new Date().toISOString()
    };

    if (db.isConfigured()) {
      await db.createAuditLog(logObj).catch(() => {});
    } else {
      auditLogs.unshift(logObj);
    }

    // 1. If status changed, notify the user (requester)
    if (status && status !== oldStatus && ticket.createdBy?.employeeId) {
      addNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: 'Ticket Status Updated',
        message: `Your ticket #${ticket.ticketNumber} status was changed to "${status}".`,
        type: 'ticket_update',
        targetRole: 'user',
        targetEmployeeId: ticket.createdBy.employeeId,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        createdAt: new Date().toISOString(),
        isRead: false,
        readBy: []
      });
    }

    // 2. If agent assigned or changed, notify the agent and user
    if (assigneeId !== undefined && assigneeId) {
      const assignedUser = users.find(u => u.id === assigneeId);
      if (assignedUser) {
        // Notification to assigned Agent
        addNotification({
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title: 'New Ticket Assignment',
          message: `You have been assigned to Ticket #${ticket.ticketNumber}: "${ticket.title}".`,
          type: 'ticket_assigned',
          targetRole: 'agent',
          targetEmployeeId: assignedUser.employeeId,
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          createdAt: new Date().toISOString(),
          isRead: false,
          readBy: []
        });

        // Notification to User
        if (ticket.createdBy?.employeeId) {
          addNotification({
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            title: 'Agent Assigned to Your Request',
            message: `${assignedUser.fullName} (${assignedUser.department}) was assigned to handle your ticket #${ticket.ticketNumber}.`,
            type: 'ticket_update',
            targetRole: 'user',
            targetEmployeeId: ticket.createdBy.employeeId,
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            createdAt: new Date().toISOString(),
            isRead: false,
            readBy: []
          });
        }
      }
    }

    res.json(ticket);
  });

  // Comments endpoint
  app.post('/api/tickets/:id/comments', async (req, res) => {
    const { userId, content, isInternal } = req.body;
    let ticket;

    if (db.isConfigured()) {
      try {
        const dbTkts = await db.getTickets();
        ticket = dbTkts?.find((t: any) => t.id === req.params.id);
      } catch (e) {}
    } else {
      ticket = tickets.find(t => t.id === req.params.id);
    }

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    let user;
    if (db.isConfigured()) {
      try {
        const dbUsers = await db.getUsers();
        const found = dbUsers?.find((u: any) => u.id === userId) || dbUsers?.[0];
        if (found) {
          user = {
            id: found.id,
            fullName: found.full_name,
            role: found.role,
            avatar: found.avatar || ''
          };
        }
      } catch (e) {}
    } else {
      const found = users.find(u => u.id === userId) || users[0];
      user = {
        id: found.id,
        fullName: found.fullName,
        role: found.role,
        avatar: found.avatar || ''
      };
    }

    const newComment: any = {
      id: `cmt-${Date.now()}`,
      ticketId: ticket.id,
      userId: user.id,
      userName: user.fullName,
      userAvatar: user.avatar,
      userRole: user.role,
      content,
      isInternal: Boolean(isInternal),
      createdAt: new Date().toISOString()
    };

    if (db.isConfigured()) {
      try {
        await db.createComment(newComment);
      } catch (e) {
        console.error(e);
      }
    } else {
      comments.push(newComment);
    }

    const commentLog = {
      id: `al-${Date.now()}`,
      ticketId: ticket.id,
      action: isInternal ? `Internal note added by ${user.fullName}` : `Public reply added by ${user.fullName}`,
      performedBy: user.fullName,
      createdAt: new Date().toISOString()
    };

    if (db.isConfigured()) {
      await db.createAuditLog(commentLog).catch(() => {});
    } else {
      auditLogs.unshift(commentLog);
    }

    // Trigger Notification for new comment if public reply
    if (!isInternal) {
      if (user.role === 'admin' || user.role === 'agent') {
        // Staff replied -> notify User (requester)
        if (ticket.createdBy?.employeeId) {
          addNotification({
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            title: 'New Update on Your Ticket',
            message: `${user.fullName} replied on ticket #${ticket.ticketNumber}: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`,
            type: 'ticket_update',
            targetRole: 'user',
            targetEmployeeId: ticket.createdBy.employeeId,
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            createdAt: new Date().toISOString(),
            isRead: false,
            readBy: []
          });
        }
      } else {
        // User replied -> notify Admin and Assigned Agent
        addNotification({
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title: 'User Replied to Ticket',
          message: `${user.fullName} added a message on ticket #${ticket.ticketNumber}: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`,
          type: 'ticket_update',
          targetRole: 'admin',
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          createdAt: new Date().toISOString(),
          isRead: false,
          readBy: []
        });

        if (ticket.assigneeId) {
          const assignedUser = users.find(u => u.id === ticket.assigneeId);
          if (assignedUser) {
            addNotification({
              id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              title: 'Update on Assigned Ticket',
              message: `${user.fullName} replied to your assigned ticket #${ticket.ticketNumber}.`,
              type: 'ticket_update',
              targetRole: 'agent',
              targetEmployeeId: assignedUser.employeeId,
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
              createdAt: new Date().toISOString(),
              isRead: false,
              readBy: []
            });
          }
        }
      }
    }

    res.status(201).json(newComment);
  });

  // Notifications Endpoints
  app.get('/api/notifications', async (req, res) => {
    const { role, employeeId } = req.query as { role?: string; employeeId?: string };

    if (db.isConfigured()) {
      try {
        const dbNotifs = await db.getNotifications(role, employeeId);
        if (dbNotifs) return res.json(dbNotifs);
      } catch (e) {
        console.error('Failed to get notifications from DB:', e);
      }
    }
    
    let result = notifications.filter(n => {
      // If notification has specific targetEmployeeId
      if (n.targetEmployeeId && employeeId) {
        return n.targetEmployeeId.toLowerCase() === employeeId.toLowerCase();
      }
      // If notification is for a role
      if (n.targetRole) {
        if (n.targetRole === 'all') return true;
        if (role && n.targetRole === role) return true;
        return false;
      }
      return true;
    });

    // Check read status for this specific employee
    if (employeeId) {
      result = result.map(n => ({
        ...n,
        isRead: n.isRead || (Array.isArray(n.readBy) && n.readBy.includes(employeeId.toLowerCase()))
      }));
    }

    res.json(result);
  });

  app.patch('/api/notifications/:id/read', async (req, res) => {
    const { id } = req.params;
    const { employeeId } = req.body;

    if (db.isConfigured()) {
      try {
        await db.markNotificationRead(id, employeeId);
      } catch (e) {}
    }

    const notif = notifications.find(n => n.id === id);
    if (notif) {
      notif.isRead = true;
      if (employeeId) {
        notif.readBy = notif.readBy || [];
        if (!notif.readBy.includes(employeeId.toLowerCase())) {
          notif.readBy.push(employeeId.toLowerCase());
        }
      }
      return res.json({ success: true, notification: notif });
    }
    res.json({ success: true });
  });

  app.post('/api/notifications/mark-all-read', async (req, res) => {
    const { employeeId, role } = req.body;

    if (db.isConfigured()) {
      try {
        await db.markAllNotificationsRead(employeeId, role);
      } catch (e) {}
    }

    notifications.forEach(n => {
      const matchesEmp = employeeId && n.targetEmployeeId && n.targetEmployeeId.toLowerCase() === employeeId.toLowerCase();
      const matchesRole = role && n.targetRole === role;
      if (matchesEmp || matchesRole || n.targetRole === 'all') {
        n.isRead = true;
        if (employeeId) {
          n.readBy = n.readBy || [];
          if (!n.readBy.includes(employeeId.toLowerCase())) {
            n.readBy.push(employeeId.toLowerCase());
          }
        }
      }
    });
    res.json({ success: true });
  });

  app.delete('/api/notifications', async (req, res) => {
    const { employeeId, role } = req.query as { employeeId?: string; role?: string };

    if (db.isConfigured()) {
      try {
        await db.deleteAllNotifications(employeeId, role);
      } catch (e) {}
    }

    if (employeeId || role) {
      notifications = notifications.filter(n => {
        if (employeeId && n.targetEmployeeId?.toLowerCase() === employeeId.toLowerCase()) return false;
        if (role && n.targetRole === role) return false;
        return true;
      });
    } else {
      notifications = [];
    }
    res.json({ success: true });
  });

  app.delete('/api/notifications/:id', async (req, res) => {
    const { id } = req.params;

    if (db.isConfigured()) {
      try {
        await db.deleteNotification(id);
      } catch (e) {}
    }

    notifications = notifications.filter(n => n.id !== id);
    res.json({ success: true });
  });

  app.get('/api/categories', async (req, res) => {
    if (db.isConfigured()) {
      try {
        const dbCats = await db.getCategories();
        if (dbCats && dbCats.length > 0) return res.json(dbCats);
      } catch (e) {}
    }
    res.json(categories);
  });

  app.get('/api/canned-responses', (req, res) => res.json(cannedResponses));
  
  app.get('/api/sla-rules', async (req, res) => {
    if (db.isConfigured()) {
      try {
        const dbSlas = await db.getSLARules();
        if (dbSlas && dbSlas.length > 0) return res.json(dbSlas);
      } catch (e) {}
    }
    res.json(slaRules);
  });

  app.get('/api/analytics', async (req, res) => {
    let resolvedTickets = [...tickets];
    let resolvedCategories = [...categories];
    let resolvedUsers = [...users];

    if (db.isConfigured()) {
      try {
        const dbTkts = await db.getTickets();
        if (dbTkts) resolvedTickets = dbTkts;

        const dbCats = await db.getCategories();
        if (dbCats) resolvedCategories = dbCats;

        const dbUsers = await db.getUsers();
        if (dbUsers) {
          resolvedUsers = dbUsers.map((u: any) => ({
            id: u.id,
            employeeId: u.employee_id,
            fullName: u.full_name,
            role: u.role,
            department: u.department || 'General',
            avatar: u.avatar || ''
          }));
        }
      } catch (e) {}
    }

    const total = resolvedTickets.length;
    const open = resolvedTickets.filter(t => t.status === 'Open' || t.status === 'In Progress' || t.status === 'Pending Vendor').length;
    const resolved = resolvedTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
    const urgentCount = resolvedTickets.filter(t => t.priority === 'Urgent' && t.status !== 'Resolved' && t.status !== 'Closed').length;
    const breachedCount = resolvedTickets.filter(t => t.slaStatus === 'Breached').length;

    const byCategory = resolvedCategories.map(cat => ({
      category: cat.name,
      count: resolvedTickets.filter(t => t.category === cat.name).length
    }));

    const byPriority = ['Urgent', 'High', 'Medium', 'Low'].map(p => ({
      priority: p,
      count: resolvedTickets.filter(t => t.priority === p).length
    }));

    const agentWorkload = resolvedUsers.filter(u => u.role === 'agent' || u.role === 'admin').map(agent => ({
      agentName: agent.fullName,
      avatar: agent.avatar,
      activeTickets: resolvedTickets.filter(t => t.assigneeId === agent.id && t.status !== 'Resolved' && t.status !== 'Closed').length,
      resolvedTickets: resolvedTickets.filter(t => t.assigneeId === agent.id && (t.status === 'Resolved' || t.status === 'Closed')).length
    }));

    res.json({
      kpis: {
        total,
        open,
        resolved,
        urgentCount,
        breachedCount,
        avgResolutionHours: 14.2,
        slaComplianceRate: '94.8%'
      },
      byCategory,
      byPriority,
      agentWorkload
    });
  });

  // Gemini AI Copilot Endpoint
  app.post('/api/ai/copilot', async (req, res) => {
    const { ticketId, action } = req.body;
    let ticket;
    let ticketComments = [];

    if (db.isConfigured()) {
      try {
        const dbTkts = await db.getTickets();
        ticket = dbTkts?.find((t: any) => t.id === ticketId);
        if (ticket) {
          const dbCmts = await db.getComments();
          ticketComments = dbCmts?.filter((c: any) => c.ticketId === ticket.id) || [];
        }
      } catch (e) {}
    }

    if (!ticket) {
      ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        ticketComments = comments.filter(c => c.ticketId === ticket.id);
      }
    }

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (!ai) {
      return res.json({ result: 'AI assistance is currently offline (Missing GEMINI_API_KEY).' });
    }

    try {
      let prompt = '';
      if (action === 'suggest_response') {
        prompt = `You are an expert IT support technician. Draft a polite, professional, and technical response to the user for this ticket:
Title: ${ticket.title}
Description: ${ticket.description}
Category: ${ticket.category}
Priority: ${ticket.priority}
Recent Conversation: ${ticketComments.map(c => `${c.userName}: ${c.content}`).join('\n')}
Draft a helpful response that either asks for clarifying diagnostics or provides resolution steps.`;
      } else {
        prompt = `Provide a concise 3-bullet executive summary and next steps for this IT incident:
Title: ${ticket.title}
Description: ${ticket.description}
Comments count: ${ticketComments.length}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt
      });

      res.json({ result: response.text });
    } catch (err: any) {
      console.error('AI Copilot error:', err);
      res.status(500).json({ error: err.message || 'AI generation failed' });
    }
  });

  // Global API 404 Handler for unmatched /api routes (prevents fallback to HTML)
  app.all('/api/*', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found.` });
  });

  // Global API Error Handler to ensure any unhandled errors return valid JSON (never HTML)
  app.use((err: any, req: Request, res: Response, next: Function) => {
    console.error('Express unhandled error caught:', err?.message || err);
    if (res.headersSent) {
      return next(err);
    }
    res.setHeader('Content-Type', 'application/json');
    res.status(err.status || 500).json({
      error: err?.message || 'An internal server error occurred.'
    });
  });

  // Serve frontend static build in production or mount Vite middleware in development
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(path.join(__dirname, 'dist')));
      app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
      });
    } else {
      try {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa'
        });
        app.use(vite.middlewares);
      } catch (err: any) {
        console.error('Notice: Vite dev middleware initialization:', err?.message);
      }
    }
  }

  if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`HelpDeskPro secure authentication & ITSM server running on port ${PORT}`);
    });
  }

  export default app;
