import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Supabase and Postgres Connection String Resolution
const rawConnectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL ||
  '';

// Check if database connection string or individual PG environment variables are provided
const isDatabaseConfigured = !!(
  rawConnectionString ||
  (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE)
);

let pool: pg.Pool | null = null;

if (isDatabaseConfigured) {
  try {
    const config: pg.PoolConfig = rawConnectionString
      ? {
          connectionString: rawConnectionString,
          ssl: { rejectUnauthorized: false },
          max: 2, // Serverless pool sizing: prevent exhausting Supabase connection pool
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 5000,
        }
      : {
          host: process.env.PGHOST,
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          database: process.env.PGDATABASE,
          port: parseInt(process.env.PGPORT || '5432', 10),
          ssl: { rejectUnauthorized: false },
          max: 2,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 5000,
        };

    pool = new Pool(config);
    pool.on('error', (err: Error) => {
      console.error('PostgreSQL client pool error:', err.message);
    });
  } catch (error: any) {
    console.error('Failed to initialize PostgreSQL pool:', error?.message);
    pool = null;
  }
}

let isInitializing = false;
let isInitialized = false;

// Automatically verify and seed tables if database is connected (non-destructive)
export async function initializeDatabaseSchema(): Promise<boolean> {
  if (!pool || isInitialized) return isInitialized;
  if (isInitializing) return false;

  isInitializing = true;
  let client: pg.PoolClient | null = null;
  try {
    client = await pool.connect();

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL,
        department VARCHAR(50) NOT NULL,
        avatar TEXT,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Categories Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT
      );
    `);

    // 3. SLA Rules Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sla_rules (
        id VARCHAR(50) PRIMARY KEY,
        priority VARCHAR(20) NOT NULL,
        response_time_hours INT NOT NULL,
        resolution_time_hours INT NOT NULL
      );
    `);

    // 4. Tickets Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR(50) PRIMARY KEY,
        ticket_number VARCHAR(20) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        priority VARCHAR(20) NOT NULL,
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
    `);

    // 5. Comments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(50) PRIMARY KEY,
        ticket_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Audit Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        ticket_id VARCHAR(50),
        action TEXT NOT NULL,
        performed_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Password Reset Requests Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id VARCHAR(50) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        ticket_id VARCHAR(50),
        ticket_number VARCHAR(20),
        target_role VARCHAR(20),
        target_employee_id VARCHAR(50),
        is_read BOOLEAN DEFAULT FALSE,
        read_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safe seed default users if empty (preserves existing data)
    await client.query(`
      INSERT INTO users (id, employee_id, full_name, role, department, avatar, password) VALUES
      ('usr-1', 'EMP-001', 'Sarah Jenkins', 'admin', 'IT Management', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'adminpassword')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Safe seed default categories if empty
    await client.query(`
      INSERT INTO categories (id, name, description) VALUES
      ('cat-1', 'Hardware & Peripherals', 'Laptops, monitors, keyboards, docking stations'),
      ('cat-2', 'Software & Licensing', 'OS issues, Office 365, VPN, specialized apps'),
      ('cat-3', 'Network & Wi-Fi', 'Connectivity, VPN drops, LAN port issues'),
      ('cat-4', 'Security & Access', 'Password resets, 2FA setup, unauthorized access flags'),
      ('cat-5', 'Cloud & Infrastructure', 'AWS, database access, server restarts')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Safe seed default SLA Rules if empty
    await client.query(`
      INSERT INTO sla_rules (id, priority, response_time_hours, resolution_time_hours) VALUES
      ('sla-1', 'Urgent', 1, 4),
      ('sla-2', 'High', 2, 8),
      ('sla-3', 'Medium', 4, 24),
      ('sla-4', 'Low', 8, 48)
      ON CONFLICT (id) DO NOTHING;
    `);

    isInitialized = true;
    return true;
  } catch (error: any) {
    console.error('Database schema verify/seed notice:', error?.message);
    return false;
  } finally {
    isInitializing = false;
    if (client) {
      try {
        client.release();
      } catch {}
    }
  }
}

// Interface of database handlers to route queries cleanly
export const db = {
  isConfigured: () => !!pool,

  // General select wrapper
  query: async (text: string, params?: any[]) => {
    if (!pool) throw new Error('Database not configured');
    return pool.query(text, params);
  },

  // 1. Users Handlers
  getUsers: async () => {
    if (!pool) return null;
    const res = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return res.rows;
  },

  createUser: async (user: any) => {
    if (!pool) return null;
    await pool.query(
      'INSERT INTO users (id, employee_id, full_name, role, department, avatar, password, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [user.id, user.employeeId, user.fullName, user.role, user.department, user.avatar || '', user.password, user.createdAt || new Date().toISOString()]
    );
    return user;
  },

  updateUser: async (user: any) => {
    if (!pool) return null;
    await pool.query(
      'UPDATE users SET employee_id = $1, full_name = $2, role = $3, department = $4, password = $5, avatar = $6 WHERE id = $7',
      [user.employeeId, user.fullName, user.role, user.department, user.password, user.avatar || '', user.id]
    );
    return user;
  },

  deleteUser: async (id: string) => {
    if (!pool) return null;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return true;
  },

  // 2. Categories Handlers
  getCategories: async () => {
    if (!pool) return null;
    const res = await pool.query('SELECT * FROM categories');
    return res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description
    }));
  },

  // 3. SLA Rules Handlers
  getSLARules: async () => {
    if (!pool) return null;
    const res = await pool.query('SELECT * FROM sla_rules');
    return res.rows.map((r: any) => ({
      id: r.id,
      priority: r.priority,
      responseTimeHours: r.response_time_hours,
      resolutionTimeHours: r.resolution_time_hours
    }));
  },

  // 4. Tickets Handlers
  getTickets: async () => {
    if (!pool) return null;
    const res = await pool.query(`
      SELECT t.*, 
             u.full_name as creator_name, u.employee_id as creator_emp_id, u.avatar as creator_avatar,
             a.full_name as assignee_name, a.avatar as assignee_avatar
      FROM tickets t
      LEFT JOIN users u ON t.created_by_id = u.id
      LEFT JOIN users a ON t.assignee_id = a.id
      ORDER BY t.created_at DESC
    `);
    return res.rows.map((r: any) => {
      let attachments: any[] = [];
      try {
        attachments = r.attachments ? JSON.parse(r.attachments) : [];
      } catch {
        attachments = [];
      }
      return {
        id: r.id,
        ticketNumber: r.ticket_number,
        title: r.title,
        description: r.description,
        category: r.category,
        priority: r.priority,
        status: r.status,
        createdBy: {
          id: r.created_by_id,
          name: r.creator_name || 'System User',
          employeeId: r.creator_emp_id || 'EMP-SYSTEM',
          avatar: r.creator_avatar || ''
        },
        assigneeId: r.assignee_id,
        assigneeName: r.assignee_name || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
        dueDate: r.due_date ? new Date(r.due_date).toISOString() : new Date().toISOString(),
        slaStatus: r.sla_status,
        aiSentiment: r.ai_sentiment || undefined,
        aiSuggestedCategory: r.ai_suggested_category || undefined,
        aiSummary: r.ai_summary || undefined,
        attachments
      };
    });
  },

  createTicket: async (ticket: any) => {
    if (!pool) return null;
    await pool.query(`
      INSERT INTO tickets (
        id, ticket_number, title, description, category, priority, status, created_by_id, assignee_id,
        created_at, updated_at, due_date, sla_status, ai_sentiment, ai_suggested_category, ai_summary, attachments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `, [
      ticket.id, ticket.ticketNumber, ticket.title, ticket.description, ticket.category, ticket.priority, ticket.status,
      ticket.createdBy.id, ticket.assigneeId || null, ticket.createdAt || new Date().toISOString(), ticket.updatedAt || new Date().toISOString(),
      ticket.dueDate, ticket.slaStatus, ticket.aiSentiment || null, ticket.aiSuggestedCategory || null, ticket.aiSummary || null,
      JSON.stringify(ticket.attachments || [])
    ]);
    return ticket;
  },

  updateTicket: async (ticketId: string, updates: any) => {
    if (!pool) return null;
    
    const keys = Object.keys(updates);
    if (keys.length === 0) return;

    const columnMap: any = {
      title: 'title',
      description: 'description',
      category: 'category',
      priority: 'priority',
      status: 'status',
      assigneeId: 'assignee_id',
      updatedAt: 'updated_at',
      dueDate: 'due_date',
      slaStatus: 'sla_status',
      aiSentiment: 'ai_sentiment',
      aiSuggestedCategory: 'ai_suggested_category',
      aiSummary: 'ai_summary'
    };

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const key of keys) {
      if (columnMap[key]) {
        setClauses.push(`${columnMap[key]} = $${idx}`);
        values.push(updates[key]);
        idx++;
      }
    }

    if (setClauses.length === 0) return;

    values.push(ticketId);
    await pool.query(
      `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      values
    );
  },

  // 5. Comments Handlers
  getComments: async () => {
    if (!pool) return null;
    const res = await pool.query(`
      SELECT c.*, u.full_name as user_name, u.role as user_role, u.avatar as user_avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at ASC
    `);
    return res.rows.map((r: any) => ({
      id: r.id,
      ticketId: r.ticket_id,
      userId: r.user_id,
      userName: r.user_name || 'Staff User',
      userAvatar: r.user_avatar || undefined,
      userRole: r.user_role || 'user',
      content: r.content,
      isInternal: r.is_internal,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    }));
  },

  createComment: async (comment: any) => {
    if (!pool) return null;
    await pool.query(
      'INSERT INTO comments (id, ticket_id, user_id, content, is_internal, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [comment.id, comment.ticketId, comment.userId, comment.content, comment.isInternal, comment.createdAt || new Date().toISOString()]
    );
    return comment;
  },

  // 6. Audit Logs Handlers
  getAuditLogs: async () => {
    if (!pool) return null;
    const res = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC');
    return res.rows.map((r: any) => ({
      id: r.id,
      ticketId: r.ticket_id,
      action: r.action,
      performedBy: r.performed_by,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    }));
  },

  createAuditLog: async (log: any) => {
    if (!pool) return null;
    await pool.query(
      'INSERT INTO audit_logs (id, ticket_id, action, performed_by, created_at) VALUES ($1, $2, $3, $4, $5)',
      [log.id, log.ticketId, log.action, log.performedBy, log.createdAt || new Date().toISOString()]
    );
    return log;
  },

  // 7. Password Reset Requests Handlers
  getPasswordResetRequests: async () => {
    if (!pool) return null;
    const res = await pool.query('SELECT * FROM password_reset_requests ORDER BY created_at DESC');
    return res.rows.map((r: any) => ({
      id: r.id,
      employeeId: r.employee_id,
      fullName: r.full_name,
      email: r.email || undefined,
      status: r.status,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    }));
  },

  createPasswordResetRequest: async (req: any) => {
    if (!pool) return null;
    await pool.query(
      'INSERT INTO password_reset_requests (id, employee_id, full_name, email, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.id, req.employeeId, req.fullName, req.email || null, req.status, req.createdAt || new Date().toISOString()]
    );
    return req;
  },

  resolvePasswordResetRequest: async (id: string) => {
    if (!pool) return null;
    await pool.query("UPDATE password_reset_requests SET status = 'resolved' WHERE id = $1", [id]);
    return true;
  },

  // 8. Notifications Handlers
  getNotifications: async (role?: string, employeeId?: string) => {
    if (!pool) return null;
    const res = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100');
    let rows = res.rows;
    if (role || employeeId) {
      rows = rows.filter((n: any) => {
        if (n.target_employee_id && employeeId) {
          return n.target_employee_id.toLowerCase() === employeeId.toLowerCase();
        }
        if (n.target_role) {
          if (n.target_role === 'all') return true;
          if (role && n.target_role === role) return true;
          return false;
        }
        return true;
      });
    }
    return rows.map((r: any) => {
      let readBy: string[] = [];
      try {
        readBy = r.read_by ? JSON.parse(r.read_by) : [];
      } catch {
        readBy = [];
      }
      const isReadByEmp = employeeId ? readBy.includes(employeeId.toLowerCase()) : false;
      return {
        id: r.id,
        title: r.title,
        message: r.message,
        type: r.type,
        ticketId: r.ticket_id || undefined,
        ticketNumber: r.ticket_number || undefined,
        targetRole: r.target_role || undefined,
        targetEmployeeId: r.target_employee_id || undefined,
        isRead: r.is_read || isReadByEmp,
        readBy,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      };
    });
  },

  createNotification: async (notif: any) => {
    if (!pool) return null;
    await pool.query(
      `INSERT INTO notifications (
        id, title, message, type, ticket_id, ticket_number, target_role, target_employee_id, is_read, read_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        notif.id, notif.title, notif.message, notif.type,
        notif.ticketId || null, notif.ticketNumber || null,
        notif.targetRole || null, notif.targetEmployeeId || null,
        notif.isRead || false, JSON.stringify(notif.readBy || []),
        notif.createdAt || new Date().toISOString()
      ]
    );
    return notif;
  },

  markNotificationRead: async (id: string, employeeId?: string) => {
    if (!pool) return null;
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
    return true;
  },

  markAllNotificationsRead: async (employeeId?: string, role?: string) => {
    if (!pool) return null;
    await pool.query('UPDATE notifications SET is_read = TRUE');
    return true;
  },

  deleteNotification: async (id: string) => {
    if (!pool) return null;
    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    return true;
  },

  deleteAllNotifications: async (employeeId?: string, role?: string) => {
    if (!pool) return null;
    if (employeeId) {
      await pool.query('DELETE FROM notifications WHERE LOWER(target_employee_id) = LOWER($1)', [employeeId]);
    } else if (role) {
      await pool.query('DELETE FROM notifications WHERE target_role = $1', [role]);
    } else {
      await pool.query('DELETE FROM notifications');
    }
    return true;
  }
};
