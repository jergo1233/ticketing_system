/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  BookOpen,
  Settings,
  PlusCircle,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  Send,
  Sparkles,
  Paperclip,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Lock,
  User as UserIcon,
  Check,
  X,
  Download,
  FileText,
  SlidersHorizontal,
  Bot,
  HelpCircle,
  LogOut,
  KeyRound,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  UploadCloud,
  Printer,
  ExternalLink,
  FileSpreadsheet,
  FileCode,
  Trash2,
  ZoomIn,
  ZoomOut,
  Copy,
  File,
  Image as ImageIcon,
  Calendar,
  Bell,
  BellRing
} from 'lucide-react';
import BrandLogo from './components/BrandLogo';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'new_request' | 'ticket_update' | 'ticket_assigned' | 'password_reset' | 'system';
  ticketId?: string;
  ticketNumber?: string;
  createdAt: string;
  isRead: boolean;
  targetRole?: 'admin' | 'agent' | 'user' | 'all';
  targetEmployeeId?: string;
}

interface User {
  id: string;
  employeeId: string;
  fullName: string;
  role: 'admin' | 'agent' | 'user';
  department: string;
  avatar: string;
  password?: string;
  isOnline?: boolean;
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
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Pending Vendor' | 'Resolved' | 'Closed';
  createdBy: {
    id: string;
    name: string;
    email: string;
    employeeId: string;
  };
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  slaStatus: 'On Track' | 'Warning' | 'Breached';
  attachments?: { name: string; url?: string; size?: string; type?: string; dataUrl?: string }[];
  aiSentiment?: string;
  aiSuggestedCategory?: string;
  aiSummary?: string;
  comments?: TicketComment[];
  auditLogs?: AuditLog[];
}

interface AnalyticsData {
  kpis: {
    total: number;
    open: number;
    resolved: number;
    urgentCount: number;
    breachedCount: number;
    avgResolutionHours: number;
    slaComplianceRate: string;
  };
  byCategory: { category: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  agentWorkload: { agentName: string; avatar: string; activeTickets: number; resolvedTickets: number }[];
}

// Safe Fetch Helper that handles non-JSON HTML error pages gracefully
async function safeFetchJson(url: string, options?: RequestInit): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    let data: any = null;

    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    } else {
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        if (res.status === 500) {
          data = { error: 'Database / Server error (500). Please check Supabase DATABASE_URL in Vercel.' };
        } else if (res.status === 404) {
          data = { error: 'API route not found (404).' };
        } else {
          data = { error: text || `Server returned error (${res.status})` };
        }
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: data || {},
        error: data?.error || (res.status === 401 ? 'Invalid Employee ID, Full Name, or Password.' : `Request failed with status ${res.status}`)
      };
    }

    return {
      ok: true,
      status: res.status,
      data: data || {}
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: {},
      error: err?.message || 'Network connection failed. Please check your internet connection.'
    };
  }
}

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('helpdeskpro_user');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error parsing saved user session', e);
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('helpdeskpro_token');
    } catch (e) {
      return null;
    }
  });

  const renderAvatar = (
    avatarUrl?: string,
    name?: string,
    sizeClass = "w-8 h-8 sm:w-9 sm:h-9",
    isOnline?: boolean | null
  ) => {
    const avatarEl = (!avatarUrl || avatarUrl.trim() === "" || avatarUrl.includes("placeholder")) ? (
      <div className={`${sizeClass} rounded-full bg-slate-800 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold uppercase select-none text-xs flex-shrink-0`}>
        {name ? name.charAt(0) : "U"}
      </div>
    ) : (
      <img
        src={avatarUrl}
        alt={name || "User"}
        className={`${sizeClass} rounded-full object-cover border border-indigo-500/30 flex-shrink-0`}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          const parent = (e.target as HTMLImageElement).parentElement;
          if (parent) {
            const existing = parent.querySelector('.avatar-fallback');
            if (!existing) {
              const fallback = document.createElement('div');
              fallback.className = `avatar-fallback ${sizeClass} rounded-full bg-slate-800 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold uppercase select-none text-xs flex-shrink-0`;
              fallback.innerText = name ? name.charAt(0) : 'U';
              parent.appendChild(fallback);
            }
          }
        }}
      />
    );

    if (isOnline === undefined || isOnline === null) {
      return avatarEl;
    }

    return (
      <div className="relative inline-flex items-center justify-center flex-shrink-0" title={isOnline ? 'Online' : 'Offline'}>
        {avatarEl}
        {isOnline ? (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-slate-950 shadow-md shadow-emerald-500/50 flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          </span>
        ) : (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full ring-2 ring-slate-950 shadow-md shadow-red-500/50 flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-white/70 rounded-full"></span>
          </span>
        )}
      </div>
    );
  };
  
  // Login Form State
  const [loginEmployeeId, setLoginEmployeeId] = useState('');
  const [loginFullName, setLoginFullName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showEmpId, setShowEmpId] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Registration, Forgot Password, and Admin Edit States
  const [authScreen, setAuthScreen] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [regEmployeeId, setRegEmployeeId] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regDepartment, setRegDepartment] = useState('Engineering');
  const [regPassword, setRegPassword] = useState('');
  const [regSuccessMessage, setRegSuccessMessage] = useState('');
  const [forgotEmployeeId, setForgotEmployeeId] = useState('');
  const [forgotFullName, setForgotFullName] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('');

  const [passwordResetRequests, setPasswordResetRequests] = useState<{ id: string; employeeId: string; fullName: string; email?: string; status: 'pending' | 'resolved'; createdAt: string }[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'agent' | 'user'>('user');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editUserError, setEditUserError] = useState('');

  // Profile Picture Edit States
  const [isEditAvatarOpen, setIsEditAvatarOpen] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  // Logout Confirmation State (All Roles)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Notification Indicator & Popover State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('helpdeskpro_notifications');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'notif-seed-1',
        title: 'New IT Support Request',
        message: 'New request #INC-10024 from Maria Santos: "Slow Wi-Fi connection in Meeting Room 3"',
        type: 'new_request',
        targetRole: 'admin',
        ticketNumber: 'INC-10024',
        createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        isRead: false
      },
      {
        id: 'notif-seed-2',
        title: 'New Ticket Assignment',
        message: 'You have been assigned to Ticket #INC-10023: "Request for secondary monitor"',
        type: 'ticket_assigned',
        targetRole: 'agent',
        targetEmployeeId: 'EMP-002',
        ticketNumber: 'INC-10023',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        isRead: false
      },
      {
        id: 'notif-seed-3',
        title: 'Ticket Status Updated',
        message: 'Your ticket #INC-10021 status was updated to "In Progress" by Sarah Connor.',
        type: 'ticket_update',
        targetRole: 'user',
        targetEmployeeId: 'EMP-003',
        ticketNumber: 'INC-10021',
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        isRead: false
      }
    ];
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'requests' | 'updates'>('all');

  // Admin Panel Search, Role & Online/Offline Status Filter State
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState<'all' | 'admin' | 'agent' | 'user'>('all');
  const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | 'online' | 'offline'>('all');

  // App Navigation & Data State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets' | 'knowledge' | 'admin' | 'my_requests' | 'closed_tickets'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopNavVisible, setIsDesktopNavVisible] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAssignee, setFilterAssignee] = useState('All');
  
  // Date Filtering State
  const [filterDatePreset, setFilterDatePreset] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterDateType, setFilterDateType] = useState<'created' | 'due' | 'updated'>('created');
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  
  // New Ticket Modal State
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Hardware & Peripherals');
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [newAttachments, setNewAttachments] = useState<Array<{ name: string; size: string; type: string; dataUrl?: string }>>([]);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [createTicketError, setCreateTicketError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Document / Attachment Preview Modal State
  const [previewAttachment, setPreviewAttachment] = useState<{
    name: string;
    size?: string;
    type?: string;
    dataUrl?: string;
    ticketNumber?: string;
    requestedBy?: string;
    createdAt?: string;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [copiedLog, setCopiedLog] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      };

      reader.onload = () => {
        const dataUrl = reader.result as string;
        setNewAttachments(prev => [
          ...prev,
          {
            name: file.name,
            size: formatSize(file.size),
            type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
            dataUrl
          }
        ]);
      };

      if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.type.startsWith('text/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsDataURL(file);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveNewAttachment = (index: number) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddSampleAttachment = (type: 'pdf' | 'screenshot' | 'log') => {
    if (type === 'pdf') {
      setNewAttachments(prev => [
        ...prev,
        {
          name: `network_diagnostics_report_${Date.now().toString().slice(-4)}.pdf`,
          size: '184 KB',
          type: 'application/pdf'
        }
      ]);
    } else if (type === 'screenshot') {
      setNewAttachments(prev => [
        ...prev,
        {
          name: `system_error_screen_${Date.now().toString().slice(-4)}.png`,
          size: '420 KB',
          type: 'image/png'
        }
      ]);
    } else {
      setNewAttachments(prev => [
        ...prev,
        {
          name: `error_trace_${Date.now().toString().slice(-4)}.log`,
          size: '64 KB',
          type: 'text/plain'
        }
      ]);
    }
  };
  
  // Add User Modal State (Admin feature)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addEmpId, setAddEmpId] = useState('');
  const [addFullName, setAddFullName] = useState('');
  const [addRole, setAddRole] = useState<'agent' | 'user'>('agent');
  const [addDepartment, setAddDepartment] = useState('Tier-2 Support');
  const [addUserError, setAddUserError] = useState('');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');
    try {
      const { ok, data, error } = await safeFetchJson('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: addEmpId,
          fullName: addFullName,
          role: addRole,
          department: addDepartment
        })
      });
      if (!ok) throw new Error(error || data?.error || 'Failed to create user');

      setIsAddUserOpen(false);
      setAddEmpId('');
      setAddFullName('');
      fetchUsers();
    } catch (e: any) {
      setAddUserError(e.message || 'Error creating user');
    }
  };
  
  // Comment input
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  
  // AI Copilot state
  const [aiResult, setAiResult] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Analytics & Reference Data
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string; description: string }[]>([]);
  const [cannedResponses, setCannedResponses] = useState<{ id: string; title: string; content: string; category: string }[]>([]);

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
      fetchCategories();
      fetchCannedResponses();
      fetchAnalytics();
      fetchTickets();
      if (currentUser.role === 'admin') {
        fetchResetRequests();
      }
      if (currentUser.role === 'user') {
        setActiveTab('my_requests');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const { ok, data } = await safeFetchJson('/api/auth/users');
      if (ok && Array.isArray(data)) {
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchResetRequests = async () => {
    try {
      const { ok, data } = await safeFetchJson('/api/admin/reset-requests');
      if (ok && Array.isArray(data)) {
        setPasswordResetRequests(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setRegSuccessMessage('');

    if (!regEmployeeId.trim()) {
      setLoginError('Employee ID is strictly required for registration.');
      return;
    }

    try {
      const { ok, data, error } = await safeFetchJson('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: regEmployeeId,
          fullName: regFullName,
          department: regDepartment,
          password: regPassword
        })
      });

      if (!ok) {
        throw new Error(error || data?.error || 'Registration failed.');
      }

      setRegSuccessMessage('Account registered successfully! You can now log in.');
      // Pre-fill login for convenience
      setLoginEmployeeId(regEmployeeId);
      setLoginFullName(regFullName);
      setLoginPassword(regPassword);
      
      // Clear registration form
      setRegEmployeeId('');
      setRegFullName('');
      setRegPassword('');
      
      // Switch back to login screen after 2 seconds
      setTimeout(() => {
        setAuthScreen('login');
        setRegSuccessMessage('');
      }, 2000);
    } catch (err: any) {
      setLoginError(err.message || 'Failed to register account.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setForgotSuccessMessage('');

    try {
      const { ok, data, error } = await safeFetchJson('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: forgotEmployeeId,
          fullName: forgotFullName,
          email: forgotEmail.trim() || undefined
        })
      });

      if (!ok) {
        throw new Error(error || data?.error || 'Request failed.');
      }

      setForgotSuccessMessage(data?.message || 'Request submitted successfully.');
      setForgotEmployeeId('');
      setForgotFullName('');
      setForgotEmail('');
    } catch (err: any) {
      setLoginError(err.message || 'Could not submit password reset request.');
    }
  };

  const handleResolveResetRequest = async (id: string) => {
    try {
      const { ok } = await safeFetchJson(`/api/admin/reset-requests/${id}/resolve`, {
        method: 'POST'
      });
      if (ok) {
        fetchResetRequests();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setEditEmployeeId(user.employeeId);
    setEditFullName(user.fullName);
    setEditRole(user.role);
    setEditDepartment(user.department);
    setEditPassword('');
    setEditUserError('');
    setIsEditUserOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserError('');

    try {
      const { ok, data, error } = await safeFetchJson(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: editEmployeeId,
          fullName: editFullName,
          role: editRole,
          department: editDepartment,
          password: editPassword || undefined
        })
      });

      if (!ok) {
        throw new Error(error || data?.error || 'Failed to update user.');
      }

      setIsEditUserOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setEditUserError(err.message || 'Error updating user.');
    }
  };

  const handleUpdateProfilePicture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAvatarUrl.trim() || !currentUser) return;
    setIsSavingAvatar(true);
    setAvatarError('');

    try {
      const { ok, data, error } = await safeFetchJson('/api/users/profile-picture', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, avatar: newAvatarUrl.trim() })
      });
      if (!ok) {
        throw new Error(error || data?.error || 'Failed to update profile picture.');
      }

      // Update current user state and localStorage
      const updatedUser = { ...currentUser, avatar: data.user.avatar };
      setCurrentUser(updatedUser);
      localStorage.setItem('helpdeskpro_user', JSON.stringify(updatedUser));
      
      setIsEditAvatarOpen(false);
      setNewAvatarUrl('');
      
      // Refetch lists to synchronize
      fetchUsers();
    } catch (err: any) {
      setAvatarError(err.message || 'Error updating profile picture.');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // limit to 5MB for profile picture upload
        setAvatarError('Image is too large. Please select a file smaller than 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Synchronize and revalidate session with server on refresh/mount
  useEffect(() => {
    const syncSession = async () => {
      const storedToken = localStorage.getItem('helpdeskpro_token');
      if (!storedToken || storedToken === 'undefined' || storedToken === 'null') return;

      try {
        const { ok, data } = await safeFetchJson('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` }
        });

        if (ok && data?.user) {
          setCurrentUser(data.user);
          localStorage.setItem('helpdeskpro_user', JSON.stringify(data.user));
        } else if (!ok && data?.error && typeof data.error === 'string' && 
                  (data.error.toLowerCase().includes('expired') || data.error.toLowerCase().includes('invalid token'))) {
          // Token is definitively invalidated, clear session safely
          localStorage.removeItem('helpdeskpro_token');
          localStorage.removeItem('helpdeskpro_user');
          setToken(null);
          setCurrentUser(null);
        }
      } catch (e) {
        console.warn('Session verification notice:', e);
      }
    };

    syncSession();
  }, []);

  const userNotifications = notifications.filter(n => {
    if (!currentUser) return false;
    if (n.targetEmployeeId && n.targetEmployeeId.toLowerCase() === currentUser.employeeId.toLowerCase()) {
      return true;
    }
    if (n.targetRole) {
      if (n.targetRole === 'all') return true;
      if (n.targetRole === currentUser.role) return true;
      return false;
    }
    return true;
  });

  const unreadCount = userNotifications.filter(n => !n.isRead).length;

  const displayNotifications = userNotifications.filter(n => {
    if (notificationFilter === 'unread') return !n.isRead;
    if (notificationFilter === 'requests') return n.type === 'new_request';
    if (notificationFilter === 'updates') return n.type === 'ticket_update' || n.type === 'ticket_assigned';
    return true;
  });

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const { ok, data } = await safeFetchJson(`/api/notifications?role=${currentUser.role}&employeeId=${currentUser.employeeId}`);
      if (ok && Array.isArray(data)) {
        setNotifications(data);
        localStorage.setItem('helpdeskpro_notifications', JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Failed to fetch notifications', e);
    }
  };

  const dispatchLocalNotification = (notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      isRead: false
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      localStorage.setItem('helpdeskpro_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
      localStorage.setItem('helpdeskpro_notifications', JSON.stringify(updated));
      return updated;
    });
    if (currentUser) {
      safeFetchJson(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentUser.employeeId })
      }).catch(() => {});
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, isRead: true }));
      localStorage.setItem('helpdeskpro_notifications', JSON.stringify(updated));
      return updated;
    });
    if (currentUser) {
      safeFetchJson('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentUser.employeeId, role: currentUser.role })
      }).catch(() => {});
    }
  };

  const handleClearAllNotifications = async () => {
    setNotifications(prev => {
      const updated = prev.filter(n => {
        const isMine = (n.targetEmployeeId && currentUser && n.targetEmployeeId.toLowerCase() === currentUser.employeeId.toLowerCase()) || (n.targetRole && currentUser && n.targetRole === currentUser.role);
        return !isMine;
      });
      localStorage.setItem('helpdeskpro_notifications', JSON.stringify(updated));
      return updated;
    });
    if (currentUser) {
      safeFetchJson(`/api/notifications?employeeId=${currentUser.employeeId}&role=${currentUser.role}`, {
        method: 'DELETE'
      }).catch(() => {});
    }
  };

  const handleDeleteSingleNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem('helpdeskpro_notifications', JSON.stringify(updated));
      return updated;
    });
    safeFetchJson(`/api/notifications/${id}`, {
      method: 'DELETE'
    }).catch(() => {});
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    handleMarkNotificationAsRead(notif.id);
    setIsNotificationsOpen(false);

    if (notif.ticketId) {
      let t = tickets.find(item => item.id === notif.ticketId);
      if (!t && notif.ticketNumber) {
        t = tickets.find(item => item.ticketNumber === notif.ticketNumber);
      }
      if (t) {
        setSelectedTicket(t);
      } else {
        handleSelectTicket(notif.ticketId);
      }
      if (currentUser?.role === 'user') {
        setActiveTab('my_requests');
      } else {
        setActiveTab('tickets');
      }
    } else if (notif.type === 'password_reset' && currentUser?.role === 'admin') {
      setActiveTab('admin');
    }
  };

  const getUserOnlineStatus = (employeeId?: string, name?: string): boolean => {
    if (currentUser) {
      if (employeeId && currentUser.employeeId.toLowerCase() === employeeId.toLowerCase()) return true;
      if (name && currentUser.fullName.toLowerCase() === name.toLowerCase()) return true;
    }
    if (!employeeId && !name) return false;
    const match = users.find(u => 
      (employeeId && u.employeeId.toLowerCase() === employeeId.toLowerCase()) ||
      (name && u.fullName.toLowerCase() === name.toLowerCase())
    );
    if (match) {
      if (currentUser && match.employeeId.toLowerCase() === currentUser.employeeId.toLowerCase()) {
        return true;
      }
      return match.isOnline ?? false;
    }
    return false;
  };

  const filteredAdminUsers = users.filter(u => {
    const isOnline = (currentUser && u.employeeId.toLowerCase() === currentUser.employeeId.toLowerCase())
      ? true
      : (u.isOnline ?? false);

    if (adminStatusFilter === 'online' && !isOnline) return false;
    if (adminStatusFilter === 'offline' && isOnline) return false;

    const matchesRole = adminRoleFilter === 'all' || u.role === adminRoleFilter;
    if (!matchesRole) return false;
    if (!adminUserSearch.trim()) return true;
    const q = adminUserSearch.toLowerCase().trim();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.employeeId.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.password && u.password.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    if (currentUser) {
      fetchTickets();
      fetchNotifications();
      fetchUsers();
      // Send initial heartbeat
      safeFetchJson('/api/auth/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentUser.employeeId })
      }).catch(() => {});

      const interval = setInterval(() => {
        fetchTickets();
        fetchNotifications();
        fetchUsers();
        // Ping heartbeat
        safeFetchJson('/api/auth/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: currentUser.employeeId })
        }).catch(() => {});
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchTickets();
    }
  }, [filterStatus, filterPriority, filterCategory, filterAssignee, searchQuery, filterDatePreset, filterStartDate, filterEndDate, filterDateType]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const { ok, data, error } = await safeFetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: loginEmployeeId, fullName: loginFullName, password: loginPassword })
      });

      if (!ok) {
        throw new Error(error || data?.error || 'Authentication failed.');
      }

      localStorage.setItem('helpdeskpro_token', data.token);
      localStorage.setItem('helpdeskpro_user', JSON.stringify(data.user));
      setToken(data.token);
      setCurrentUser(data.user);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid Employee ID, Full Name, or Password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const getTabClass = (tab: string, isMobile: boolean) => {
    const active = activeTab === tab;
    const base = `px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${active ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`;
    return isMobile ? `${base} w-full` : base;
  };

  const renderNavItems = (isMobile: boolean) => (
    isUserRole ? (
      <>
        <button onClick={() => { setActiveTab('my_requests'); setIsMobileMenuOpen(false); }} className={getTabClass('my_requests', isMobile)}>
          <TicketIcon size={16} /> My Support Requests ({myTickets.length})
        </button>
        <button onClick={() => { setActiveTab('closed_tickets'); setIsMobileMenuOpen(false); }} className={getTabClass('closed_tickets', isMobile)}>
          <CheckCircle2 size={16} /> Closed Requests ({closedTickets.length})
        </button>
        <button onClick={() => { setActiveTab('knowledge'); setIsMobileMenuOpen(false); }} className={getTabClass('knowledge', isMobile)}>
          <BookOpen size={16} /> IT Knowledge Base
        </button>
      </>
    ) : (
      <>
        <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={getTabClass('dashboard', isMobile)}>
          <LayoutDashboard size={16} /> Dashboard
        </button>
        <button onClick={() => { setActiveTab('tickets'); setIsMobileMenuOpen(false); }} className={getTabClass('tickets', isMobile)}>
          <TicketIcon size={16} /> Tickets Queue ({tickets.length})
        </button>
        <button onClick={() => { setActiveTab('knowledge'); setIsMobileMenuOpen(false); }} className={getTabClass('knowledge', isMobile)}>
          <BookOpen size={16} /> Knowledge Base
        </button>
        {currentUser?.role === 'admin' && (
          <button onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }} className={getTabClass('admin', isMobile)}>
            <Settings size={16} /> Admin Panel
          </button>
        )}
      </>
    )
  );

  const handleLogout = () => {
    if (currentUser) {
      safeFetchJson('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentUser.employeeId })
      }).catch(() => {});
    }
    localStorage.removeItem('helpdeskpro_token');
    localStorage.removeItem('helpdeskpro_user');
    setToken(null);
    setCurrentUser(null);
    setSelectedTicket(null);
    setIsLogoutConfirmOpen(false);
    setIsMobileMenuOpen(false);
  };

  const exportTicketsToCSV = () => {
    const headers = ['Ticket Number', 'Title', 'Description', 'Category', 'Priority', 'Status', 'Created By', 'Created At', 'Due Date'];
    const rows = tickets.map(t => [
      t.ticketNumber,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      t.priority,
      t.status,
      t.createdBy.name,
      t.createdAt,
      t.dueDate
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tickets_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'All') params.append('status', filterStatus);
      if (filterPriority !== 'All') params.append('priority', filterPriority);
      if (filterCategory !== 'All') params.append('category', filterCategory);
      if (filterAssignee !== 'All') params.append('assigneeId', filterAssignee);
      if (filterDatePreset !== 'all') params.append('datePreset', filterDatePreset);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);
      if (filterDateType) params.append('dateType', filterDateType);
      if (searchQuery) params.append('search', searchQuery);

      const { ok, data } = await safeFetchJson(`/api/tickets?${params.toString()}`);
      if (ok && Array.isArray(data)) {
        setTickets(data);
      }
    } catch (e) {
      console.error('Failed to fetch tickets', e);
    }
  };

  const fetchCategories = async () => {
    try {
      const { ok, data } = await safeFetchJson('/api/categories');
      if (ok && Array.isArray(data)) {
        setCategories(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCannedResponses = async () => {
    try {
      const { ok, data } = await safeFetchJson('/api/canned-responses');
      if (ok && Array.isArray(data)) {
        setCannedResponses(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { ok, data } = await safeFetchJson('/api/analytics');
      if (ok && data?.kpis) {
        setAnalytics(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !currentUser) return;

    setCreateTicketError('');
    setIsCreatingTicket(true);

    try {
      const activeToken = token || localStorage.getItem('helpdeskpro_token');
      const { ok, data, error } = await safeFetchJson('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {})
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          category: newCategory,
          priority: newPriority,
          userId: currentUser.id,
          employeeId: currentUser.employeeId,
          fullName: currentUser.fullName,
          department: currentUser.department,
          avatar: currentUser.avatar || '',
          attachments: newAttachments
        })
      });

      if (!ok) {
        throw new Error(error || data?.error || 'Failed to submit IT ticket.');
      }

      setIsNewTicketOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewAttachments([]);
      setCreateTicketError('');
      fetchTickets();
      fetchAnalytics();
      fetchNotifications();
      
      // Dispatch immediate notification for Admin
      dispatchLocalNotification({
        title: 'New IT Support Request',
        message: `New ticket #${data?.ticketNumber || 'INC-NEW'} submitted by ${currentUser.fullName}: "${newTitle}"`,
        type: 'new_request',
        targetRole: 'admin',
        ticketId: data?.id,
        ticketNumber: data?.ticketNumber
      });
    } catch (e: any) {
      console.error('Error creating ticket:', e);
      setCreateTicketError(e.message || 'An error occurred while creating the ticket.');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleSelectTicket = async (ticketId: string) => {
    try {
      const { ok, data } = await safeFetchJson(`/api/tickets/${ticketId}`);
      if (ok && data) {
        setSelectedTicket(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { ok, data } = await safeFetchJson(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (ok) {
        setSelectedTicket(prev => prev ? { ...prev, ...data } : null);
        fetchTickets();
        fetchAnalytics();
        fetchNotifications();

        if (selectedTicket?.createdBy?.employeeId) {
          dispatchLocalNotification({
            title: 'Ticket Status Updated',
            message: `Your ticket #${selectedTicket.ticketNumber} was updated to "${newStatus}" by ${currentUser?.fullName || 'IT Staff'}.`,
            type: 'ticket_update',
            targetRole: 'user',
            targetEmployeeId: selectedTicket.createdBy.employeeId,
            ticketId: selectedTicket.id,
            ticketNumber: selectedTicket.ticketNumber
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignTicket = async (ticketId: string, assigneeId: string) => {
    try {
      const { ok, data } = await safeFetchJson(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId })
      });
      if (ok) {
        setSelectedTicket(prev => prev ? { ...prev, ...data } : null);
        fetchTickets();
        fetchNotifications();

        const assignedUser = users.find(u => u.id === assigneeId);
        if (assignedUser && selectedTicket) {
          // Notify Agent
          dispatchLocalNotification({
            title: 'New Ticket Assignment',
            message: `You have been assigned to Ticket #${selectedTicket.ticketNumber}: "${selectedTicket.title}".`,
            type: 'ticket_assigned',
            targetRole: 'agent',
            targetEmployeeId: assignedUser.employeeId,
            ticketId: selectedTicket.id,
            ticketNumber: selectedTicket.ticketNumber
          });

          // Notify User
          if (selectedTicket.createdBy?.employeeId) {
            dispatchLocalNotification({
              title: 'Agent Assigned to Your Request',
              message: `${assignedUser.fullName} (${assignedUser.department}) was assigned to handle your ticket #${selectedTicket.ticketNumber}.`,
              type: 'ticket_update',
              targetRole: 'user',
              targetEmployeeId: selectedTicket.createdBy.employeeId,
              ticketId: selectedTicket.id,
              ticketNumber: selectedTicket.ticketNumber
            });
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTicket || !currentUser) return;

    try {
      const { ok } = await safeFetchJson(`/api/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          content: commentText,
          isInternal: isInternalComment
        })
      });

      if (ok) {
        setCommentText('');
        setIsInternalComment(false);
        handleSelectTicket(selectedTicket.id);
        fetchNotifications();

        if (!isInternalComment) {
          if (currentUser.role === 'admin' || currentUser.role === 'agent') {
            if (selectedTicket.createdBy?.employeeId) {
              dispatchLocalNotification({
                title: 'New Support Response',
                message: `${currentUser.fullName} replied on ticket #${selectedTicket.ticketNumber}.`,
                type: 'ticket_update',
                targetRole: 'user',
                targetEmployeeId: selectedTicket.createdBy.employeeId,
                ticketId: selectedTicket.id,
                ticketNumber: selectedTicket.ticketNumber
              });
            }
          } else {
            dispatchLocalNotification({
              title: 'User Replied to Ticket',
              message: `${currentUser.fullName} added a message on ticket #${selectedTicket.ticketNumber}.`,
              type: 'ticket_update',
              targetRole: 'admin',
              ticketId: selectedTicket.id,
              ticketNumber: selectedTicket.ticketNumber
            });
            if (selectedTicket.assigneeId) {
              const assigned = users.find(u => u.id === selectedTicket.assigneeId);
              if (assigned) {
                dispatchLocalNotification({
                  title: 'Update on Assigned Ticket',
                  message: `${currentUser.fullName} replied to your assigned ticket #${selectedTicket.ticketNumber}.`,
                  type: 'ticket_update',
                  targetRole: 'agent',
                  targetEmployeeId: assigned.employeeId,
                  ticketId: selectedTicket.id,
                  ticketNumber: selectedTicket.ticketNumber
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunAiCopilot = async (action: 'suggest_response' | 'summarize') => {
    if (!selectedTicket) return;
    setIsAiLoading(true);
    setAiResult('');
    try {
      const { ok, data } = await safeFetchJson('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: selectedTicket.id, action })
      });
      if (ok && data?.result) {
        setAiResult(data.result);
      } else {
        setAiResult('AI request completed.');
      }
    } catch (e) {
      setAiResult('AI request failed.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'Urgent': return <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full flex items-center gap-1 w-fit"><ShieldAlert size={12} /> Urgent</span>;
      case 'High': return <span className="px-2.5 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full flex items-center gap-1 w-fit"><AlertTriangle size={12} /> High</span>;
      case 'Medium': return <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full w-fit">Medium</span>;
      case 'Low': return <span className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full w-fit">Low</span>;
      default: return null;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'Open': return <span className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full">Open</span>;
      case 'In Progress': return <span className="px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">In Progress</span>;
      case 'Pending Vendor': return <span className="px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-full">Pending Vendor</span>;
      case 'Resolved': return <span className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1"><CheckCircle2 size={12} /> Resolved</span>;
      case 'Closed': return <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">Closed</span>;
      default: return null;
    }
  };

  const getSlaBadge = (sla: string) => {
    switch (sla) {
      case 'On Track': return <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> On Track</span>;
      case 'Warning': return <span className="text-xs text-amber-600 flex items-center gap-1 font-medium"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> <Clock size={12} /> SLA Nearing</span>;
      case 'Breached': return <span className="text-xs text-red-600 flex items-center gap-1 font-semibold"><span className="w-2 h-2 rounded-full bg-red-500"></span> <AlertTriangle size={12} /> SLA Breached</span>;
      default: return null;
    }
  };

  // If not logged in, render the secure unified login/register/forgot-password interface
  if (!currentUser) {
    return (
      <div className="min-h-screen animated-linear-bg text-slate-100 flex items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Ambient Glowing Background Linear Gradient Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none bg-ambient-orb"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none bg-ambient-orb" style={{ animationDelay: '-6s' }}></div>

        <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-8 shadow-2xl space-y-8 relative z-10">
          <div className="text-center flex flex-col items-center gap-3">
            <div className="flex items-center justify-center mx-auto">
              <BrandLogo className="w-20 h-20 shadow-xl shadow-indigo-600/30 rounded-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">HelpDeskPro Portal</h1>
              <p className="text-xs text-slate-400 mt-1">Enterprise IT Ticketing & Incident Management System</p>
            </div>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-xs text-red-400 flex items-center gap-2">
              <ShieldAlert size={16} /> {loginError}
            </div>
          )}

          {regSuccessMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={16} /> {regSuccessMessage}
            </div>
          )}

          {forgotSuccessMessage && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-xs text-blue-400 flex items-center gap-2">
              <CheckCircle2 size={16} /> {forgotSuccessMessage}
            </div>
          )}

          {authScreen === 'login' && (
            <>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Employee ID</label>
                  <div className="relative">
                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="Enter Employee ID (e.g. EMP-001)"
                      value={loginEmployeeId}
                      onChange={e => setLoginEmployeeId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                  <div className="relative">
                    <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Enter Full Name"
                      value={loginFullName}
                      onChange={e => setLoginFullName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password / PIN</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-12 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                      title={showPassword ? "Hide Password" : "Show Password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => { setAuthScreen('forgot_password'); setLoginError(''); setForgotSuccessMessage(''); }}
                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Forgot Password?
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthScreen('register'); setLoginError(''); setRegSuccessMessage(''); }}
                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Create User Account
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-2xl text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ShieldCheck size={18} /> {isLoggingIn ? 'Verifying Credentials...' : 'Secure Login'}
                </button>
              </form>
            </>
          )}

          {authScreen === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="text-xs text-indigo-400 font-semibold bg-indigo-950/40 p-3.5 border border-indigo-900 rounded-2xl mb-2">
                🔒 Exclusive Employee Self-Registration. You must possess a valid Employee ID issued by IT Department.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Employee ID <span className="text-red-400">* Required</span></label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Enter unique Employee ID"
                    value={regEmployeeId}
                    onChange={e => setRegEmployeeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative">
                  <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Enter Full Name"
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Department</label>
                <div className="relative">
                  <SlidersHorizontal size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    autoComplete="organization"
                    placeholder="Enter Department"
                    value={regDepartment}
                    onChange={e => setRegDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Create Password / PIN</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-12 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Already registered?</span>
                <button
                  type="button"
                  onClick={() => { setAuthScreen('login'); setLoginError(''); setRegSuccessMessage(''); }}
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Return to Login
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-2xl text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} /> Register Account
              </button>
            </form>
          )}

          {authScreen === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="text-xs text-amber-400 font-semibold bg-amber-950/30 p-3.5 border border-amber-900/50 rounded-2xl mb-2">
                🔑 Password Reset requests are handled by IT Admin. Once submitted, your Admin will resolve the request and securely deliver your new Password/PIN either in-person, or manually via Email if provided below.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Employee ID</label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Enter Employee ID"
                    value={forgotEmployeeId}
                    onChange={e => setForgotEmployeeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Full Name</label>
                <div className="relative">
                  <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Enter Full Name"
                    value={forgotFullName}
                    onChange={e => setForgotFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Email Address <span className="text-slate-500 font-normal">(Optional)</span></label>
                <div className="relative">
                  <SlidersHorizontal size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="Enter Email Address"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">If provided, the Admin can manually email your newly configured security PIN to this address.</p>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span>Remembered password?</span>
                <button
                  type="button"
                  onClick={() => { setAuthScreen('login'); setLoginError(''); setForgotSuccessMessage(''); }}
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Return to Login
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3.5 rounded-2xl text-sm shadow-xl shadow-amber-600/30 transition flex items-center justify-center gap-2"
              >
                <Send size={16} /> Submit Reset Request
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              HelpDeskPro Internal IT Support & Incident Management Portal. For authorized organization employees only.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isUserRole = currentUser.role === 'user';
  const myTickets = tickets.filter(t => t.createdBy?.employeeId === currentUser.employeeId && t.status !== 'Closed');
  const closedTickets = tickets.filter(t => t.createdBy?.employeeId === currentUser.employeeId && t.status === 'Closed');

  return (
    <div className="min-h-screen animated-linear-bg text-slate-100 flex flex-col font-sans relative">
      {/* Ambient Glowing Background Orbs */}
      <div className="fixed top-1/4 -left-40 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none bg-ambient-orb z-0"></div>
      <div className="fixed bottom-1/4 -right-40 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none bg-ambient-orb z-0" style={{ animationDelay: '-6s' }}></div>
      {/* Top Navigation Bar */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 sm:px-6 py-3.5 grid grid-cols-[auto_1fr_auto] items-center gap-4 sticky top-0 z-50 shadow-sm max-w-full">
        {/* Left: Branding */}
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo className="w-10 h-10 flex-shrink-0 shadow-md shadow-indigo-600/30 rounded-xl" />
          <div className="hidden sm:block min-w-0">
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-2 truncate">
              HelpDesk<span className="text-indigo-400">Pro</span>
            </h1>
          </div>
        </div>

        {/* Center: Nav tabs - Centered with flex justify-center, hidden on mobile */}
        <div className="hidden md:flex justify-center min-w-0 overflow-hidden">
          <nav className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 min-w-0 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {renderNavItems(false)}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 justify-end">
          {/* Mobile Menu Slide-in Drawer */}
          <div className={`fixed inset-0 z-50 md:hidden ${isMobileMenuOpen ? 'visible' : 'invisible'}`}>
            {/* Backdrop */}
            <div 
              className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>
            {/* Drawer */}
            <nav className={`fixed top-0 right-0 h-full w-72 bg-slate-950 border-l border-slate-800 p-6 shadow-2xl transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative group cursor-pointer flex-shrink-0" onClick={() => { setNewAvatarUrl(currentUser?.avatar || ''); setIsEditAvatarOpen(true); }} title="Change Profile Picture">
                    {renderAvatar(currentUser?.avatar, currentUser?.fullName, "w-10 h-10", true)}
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200">
                      <Settings size={14} className="text-white" />
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-white truncate flex items-center gap-1.5">
                      {currentUser?.fullName}
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" title="Online"></span>
                    </span>
                    <span className="text-xs text-indigo-300 font-bold flex items-center gap-1">
                      <span>{currentUser?.employeeId} ({currentUser?.role})</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">• Online</span>
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">{currentUser?.department}</span>
                  </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); setIsNewTicketOpen(true); }}
                  className="mb-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow shadow-indigo-600/30"
                >
                  <PlusCircle size={18} /> {isUserRole ? 'New IT Request' : 'Create Ticket'}
                </button>
                {renderNavItems(true)}
                <button
                  onClick={() => { setIsMobileMenuOpen(false); setIsLogoutConfirmOpen(true); }}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition border border-red-500/20"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </nav>
          </div>

          {/* Create Ticket Button (Available for all roles: Admin, Agent, User) */}
          <button
            onClick={() => setIsNewTicketOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3.5 py-2 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 flex-shrink-0"
            title={isUserRole ? 'Submit New IT Support Request' : 'Create New IT Ticket'}
          >
            <PlusCircle size={16} /> <span className="font-semibold">{isUserRole ? 'New Request' : 'Create Ticket'}</span>
          </button>

          {/* Notification Indicator Bell Button & Popover */}
          <div className="relative flex-shrink-0 z-[60]">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`relative p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                isNotificationsOpen 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30' 
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
              }`}
              title="Notifications & Alerts"
            >
              {unreadCount > 0 ? (
                <BellRing size={18} className="text-amber-300" />
              ) : (
                <Bell size={18} />
              )}

              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-extrabold text-[10px] min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/50 ring-2 ring-slate-950 animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {isNotificationsOpen && (
              <>
                {/* Backdrop on mobile */}
                <div 
                  className="fixed inset-0 z-[90] sm:hidden bg-black/40" 
                  onClick={() => setIsNotificationsOpen(false)}
                />
                <div className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl z-[100] overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[520px]">
                  {/* Dropdown Header */}
                  <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                        <Bell size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          Notifications
                          {unreadCount > 0 && (
                            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                              {unreadCount} unread
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {currentUser.role === 'admin' 
                            ? 'Admin alerts & incoming requests' 
                            : currentUser.role === 'agent' 
                            ? 'Ticket assignments & replies' 
                            : 'Updates on your IT support requests'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllNotificationsRead}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 rounded-lg text-xs transition"
                          title="Mark all as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {userNotifications.length > 0 && (
                        <button
                          onClick={handleClearAllNotifications}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg text-xs transition"
                          title="Clear all notifications"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => setIsNotificationsOpen(false)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 p-2 border-b border-slate-800 bg-slate-950/30 text-xs overflow-x-auto">
                    <button
                      onClick={() => setNotificationFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        notificationFilter === 'all' 
                          ? 'bg-indigo-600 text-white shadow' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      All ({userNotifications.length})
                    </button>
                    <button
                      onClick={() => setNotificationFilter('unread')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        notificationFilter === 'unread' 
                          ? 'bg-indigo-600 text-white shadow' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      Unread ({unreadCount})
                    </button>
                    <button
                      onClick={() => setNotificationFilter('requests')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        notificationFilter === 'requests' 
                          ? 'bg-indigo-600 text-white shadow' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      Requests
                    </button>
                    <button
                      onClick={() => setNotificationFilter('updates')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        notificationFilter === 'updates' 
                          ? 'bg-indigo-600 text-white shadow' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      Updates
                    </button>
                  </div>

                  {/* Notification List Body */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1">
                    {displayNotifications.length === 0 ? (
                      <div className="py-10 px-4 text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-500 flex items-center justify-center mx-auto">
                          <Bell size={22} />
                        </div>
                        <p className="text-sm font-semibold text-slate-300">No notifications here</p>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto">
                          {notificationFilter === 'unread' 
                            ? "You've read all your notifications." 
                            : "New requests, status updates, and assignments will appear right here."}
                        </p>
                      </div>
                    ) : (
                      displayNotifications.map(notif => {
                        const isNotifUnread = !notif.isRead;
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-start gap-3 hover:bg-slate-800/70 group relative ${
                              isNotifUnread ? 'bg-indigo-950/30 border-l-2 border-indigo-500' : 'bg-transparent opacity-85 hover:opacity-100'
                            }`}
                          >
                            {/* Type Icon Badge */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              notif.type === 'new_request'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : notif.type === 'ticket_assigned'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : notif.type === 'password_reset'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {notif.type === 'new_request' && <PlusCircle size={16} />}
                              {notif.type === 'ticket_assigned' && <UserCheck size={16} />}
                              {notif.type === 'password_reset' && <KeyRound size={16} />}
                              {notif.type === 'ticket_update' && <RefreshCw size={15} />}
                              {notif.type === 'system' && <AlertTriangle size={15} />}
                            </div>

                            <div className="flex-1 min-w-0 pr-6">
                              <div className="flex items-center justify-between gap-1">
                                <h5 className={`text-xs font-bold truncate ${isNotifUnread ? 'text-white' : 'text-slate-300'}`}>
                                  {notif.title}
                                </h5>
                                {isNotifUnread && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.2 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                                <Clock size={11} />
                                <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span>•</span>
                                <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                                {notif.ticketNumber && (
                                  <span className="ml-auto font-mono text-indigo-400 group-hover:underline">
                                    {notif.ticketNumber}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Individual Delete Notification Button */}
                            <button
                              onClick={(e) => handleDeleteSingleNotification(notif.id, e)}
                              className="absolute top-3 right-2.5 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition opacity-0 group-hover:opacity-100"
                              title="Delete notification"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-2.5 border-t border-slate-800 bg-slate-950/80 text-center">
                    <span className="text-[11px] text-slate-500">
                      Real-time notification alerts for HelpDeskPro ITSM
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-800 flex-shrink-0">
            <div className="relative group cursor-pointer flex-shrink-0" onClick={() => { setNewAvatarUrl(currentUser.avatar || ''); setIsEditAvatarOpen(true); }} title="Change Profile Picture">
              {renderAvatar(currentUser.avatar, currentUser.fullName, "w-8 h-8 sm:w-9 sm:h-9", true)}
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200">
                <Settings size={12} className="text-white" />
              </div>
            </div>
            <div className="hidden md:flex flex-col items-start min-w-0">
              <div className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                <span>{currentUser.fullName}</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" title="Online account">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-300">
                {currentUser.employeeId} ({currentUser.role})
              </div>
              <div className="text-xs text-slate-400 truncate">{currentUser.department}</div>
            </div>
            
            {/* Desktop Logout Button */}
            <button
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="hidden md:flex p-2 bg-slate-900 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-xl transition border border-slate-800"
              title="Secure Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
          
          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex-shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white"
            >
              {isMobileMenuOpen ? <X size={24} /> : <div className="space-y-1.5"><div className="w-6 h-0.5 bg-slate-400"></div><div className="w-6 h-0.5 bg-slate-400"></div><div className="w-6 h-0.5 bg-slate-400"></div></div>}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* End-User Portal: My Requests View */}
        {isUserRole && activeTab === 'my_requests' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-950 border border-indigo-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Welcome back, {currentUser.fullName}!</h2>
                <p className="text-sm text-slate-300 mt-1">Need help with your hardware, VPN, or software licenses? Submit a request below and our IT support team will assist you.</p>
              </div>
              <button
                onClick={() => setIsNewTicketOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-3 rounded-xl text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 whitespace-nowrap"
              >
                <PlusCircle size={18} /> Submit New Request
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TicketIcon size={20} className="text-indigo-400" /> My Submitted Support Requests ({myTickets.length})
                </h3>
              </div>

              {myTickets.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <HelpCircle size={40} className="mx-auto text-slate-600" />
                  <h4 className="text-base font-semibold text-white">No requests submitted yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">When you encounter any IT issue, click the button above to raise a ticket with our support desk.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {myTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => handleSelectTicket(ticket.id)}
                      className="bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-indigo-400 text-sm">{ticket.ticketNumber}</span>
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
                          {ticket.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-1">{ticket.description}</p>
                      </div>

                      <div className="flex items-center gap-6 text-xs text-slate-400">
                        <div>
                          <div className="font-medium text-slate-300">{ticket.category}</div>
                          <div className="text-[10px]">Created {new Date(ticket.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="p-2 bg-slate-900 group-hover:bg-indigo-600 group-hover:text-white rounded-xl transition text-slate-400">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Staff & Admin Dashboard */}
        {!isUserRole && activeTab === 'dashboard' && analytics && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">IT Service Desk Operations Dashboard</h2>
                <p className="text-sm text-slate-400">Real-time IT incident metrics, SLA compliance, and agent workload.</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsNewTicketOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3.5 py-1.5 rounded-xl text-xs transition shadow flex items-center gap-1.5 shadow-indigo-600/20"
                >
                  <PlusCircle size={14} /> Create Ticket
                </button>
                <button 
                  onClick={fetchAnalytics}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <RefreshCw size={14} /> Refresh Metrics
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-sm font-medium">Total Tickets</span>
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl"><TicketIcon size={18} /></div>
                </div>
                <div className="text-3xl font-bold text-white">{analytics.kpis.total}</div>
                <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  <TrendingUp size={12} /> {analytics.kpis.open} active across departments
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-sm font-medium">Urgent Incidents</span>
                  <div className="p-2 bg-red-500/10 text-red-400 rounded-xl"><ShieldAlert size={18} /></div>
                </div>
                <div className="text-3xl font-bold text-white">{analytics.kpis.urgentCount}</div>
                <div className="text-xs text-red-400 mt-2">
                  {analytics.kpis.breachedCount} SLA breached
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-sm font-medium">SLA Compliance Rate</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl"><CheckCircle2 size={18} /></div>
                </div>
                <div className="text-3xl font-bold text-white">{analytics.kpis.slaComplianceRate}</div>
                <div className="text-xs text-slate-400 mt-2">Target: &gt;95.0%</div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-sm font-medium">Avg Resolution Time</span>
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl"><Clock size={18} /></div>
                </div>
                <div className="text-3xl font-bold text-white">{analytics.kpis.avgResolutionHours} hrs</div>
                <div className="text-xs text-emerald-400 mt-2">12% faster than last week</div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category Breakdown */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6 lg:col-span-2">
                <h3 className="text-base font-bold text-white mb-4">Incidents by Category</h3>
                <div className="space-y-4">
                  {analytics.byCategory.map((cat, idx) => {
                    const maxCount = Math.max(...analytics.byCategory.map(c => c.count), 1);
                    const pct = Math.round((cat.count / maxCount) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300 font-medium">{cat.category}</span>
                          <span className="text-slate-400 font-semibold">{cat.count} tickets</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.max(pct, 5)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agent Workload */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-4">Support Agent Workload</h3>
                <div className="space-y-4">
                  {analytics.agentWorkload.map((agent, idx) => {
                    const isAgentOnline = getUserOnlineStatus(undefined, agent.agentName);
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
                        <div className="flex items-center gap-3">
                          {renderAvatar(agent.avatar, agent.agentName, "w-10 h-10", isAgentOnline)}
                          <div>
                            <div className="text-sm font-semibold text-white flex items-center gap-2">
                              <span>{agent.agentName}</span>
                              <span 
                                className={`w-2 h-2 rounded-full ${isAgentOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500'}`} 
                                title={isAgentOnline ? 'Online' : 'Offline'}
                              />
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${isAgentOnline ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
                                {isAgentOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400">{agent.activeTickets} active tickets</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 rounded-full">
                            {agent.resolvedTickets} resolved
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isUserRole && activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">IT Incident Queue</h2>
                <p className="text-sm text-slate-400">Manage, triage, and resolve incoming support requests.</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setIsNewTicketOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition shadow flex items-center gap-2 whitespace-nowrap shadow-indigo-600/20"
                >
                  <PlusCircle size={16} /> Create Ticket
                </button>
                <button
                  onClick={exportTicketsToCSV}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 font-medium px-4 py-2 rounded-xl text-sm border border-slate-800 transition flex items-center gap-2"
                >
                  <Download size={16} /> Export CSV
                </button>
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search tickets, IDs, or users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
                    />
                  </div>
                  <button 
                    className="sm:hidden bg-slate-900 border border-slate-800 text-slate-300 px-3 py-2 rounded-xl text-sm font-medium"
                    onClick={() => { /* This could trigger a search function if needed, or just blur/close */ }}
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider mr-1">
                  <Filter size={13} /> Filters:
                </div>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="All">Status: All</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending Vendor">Pending Vendor</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="All">Priority: All</option>
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="All">Category: All</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>

                {/* Assignee Filter */}
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="All">Assignee: All</option>
                  <option value="unassigned">Unassigned</option>
                  {users.filter(u => u.role !== 'user').map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.fullName}</option>
                  ))}
                </select>

                {/* Date Preset Filter */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
                  <Calendar size={13} className="text-indigo-400 flex-shrink-0" />
                  <select
                    value={filterDatePreset}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFilterDatePreset(val);
                      if (val === 'custom') {
                        setIsCustomDateOpen(true);
                      } else {
                        setIsCustomDateOpen(false);
                      }
                    }}
                    className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer font-medium py-1"
                  >
                    <option value="all" className="bg-slate-900 text-white">Date: All Time</option>
                    <option value="today" className="bg-slate-900 text-white">Today</option>
                    <option value="yesterday" className="bg-slate-900 text-white">Yesterday</option>
                    <option value="last_7_days" className="bg-slate-900 text-white">Last 7 Days</option>
                    <option value="last_30_days" className="bg-slate-900 text-white">Last 30 Days</option>
                    <option value="this_month" className="bg-slate-900 text-white">This Month</option>
                    <option value="custom" className="bg-slate-900 text-white">Custom Date Range...</option>
                  </select>
                </div>

                {/* Date Target Field Selector */}
                <select
                  value={filterDateType}
                  onChange={(e) => setFilterDateType(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-400 focus:outline-none focus:border-indigo-500"
                  title="Choose which date field to filter by"
                >
                  <option value="created">By Created Date</option>
                  <option value="due">By SLA Due Date</option>
                  <option value="updated">By Last Updated</option>
                </select>

                {/* Reset Filters */}
                {(filterStatus !== 'All' || filterPriority !== 'All' || filterCategory !== 'All' || filterAssignee !== 'All' || filterDatePreset !== 'all' || filterStartDate || filterEndDate || searchQuery) && (
                  <button
                    onClick={() => {
                      setFilterStatus('All');
                      setFilterPriority('All');
                      setFilterCategory('All');
                      setFilterAssignee('All');
                      setFilterDatePreset('all');
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setFilterDateType('created');
                      setIsCustomDateOpen(false);
                      setSearchQuery('');
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium hover:underline ml-auto flex items-center gap-1"
                  >
                    <X size={12} /> Reset Filters
                  </button>
                )}
              </div>

              {/* Custom Date Range Picker Row (when custom preset is selected or toggled) */}
              {(filterDatePreset === 'custom' || isCustomDateOpen) && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-900 bg-slate-900/40 p-3 rounded-xl">
                  <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
                    <Calendar size={13} /> Custom Range ({filterDateType === 'due' ? 'SLA Due' : filterDateType === 'updated' ? 'Updated' : 'Created'}):
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-400">From:</label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-400">To:</label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  {(filterStartDate || filterEndDate) && (
                    <button
                      type="button"
                      onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                      className="text-[11px] text-red-400 hover:text-red-300 hover:underline"
                    >
                      Clear Dates
                    </button>
                  )}
                </div>
              )}

              {/* Active Filter Badges Bar */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-900">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>Showing <strong className="text-white">{tickets.length}</strong> incidents</span>
                  {filterDatePreset !== 'all' && (
                    <span className="inline-flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full text-[11px]">
                      <Calendar size={11} />
                      {filterDatePreset === 'today' ? 'Today' :
                       filterDatePreset === 'yesterday' ? 'Yesterday' :
                       filterDatePreset === 'last_7_days' ? 'Last 7 Days' :
                       filterDatePreset === 'last_30_days' ? 'Last 30 Days' :
                       filterDatePreset === 'this_month' ? 'This Month' :
                       `${filterStartDate || 'Start'} to ${filterEndDate || 'End'}`} ({filterDateType})
                      <button
                        type="button"
                        onClick={() => { setFilterDatePreset('all'); setFilterStartDate(''); setFilterEndDate(''); setIsCustomDateOpen(false); }}
                        className="hover:text-white ml-0.5"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  )}
                  {filterStatus !== 'All' && (
                    <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[11px]">
                      Status: {filterStatus}
                      <button type="button" onClick={() => setFilterStatus('All')} className="hover:text-white ml-0.5"><X size={10} /></button>
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500">
                  Real-time auto-refresh active
                </div>
              </div>
            </div>

            {/* Tickets Table */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4">Ticket</th>
                      <th className="p-4">Title & Category</th>
                      <th className="p-4">Requester</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">SLA Tracker</th>
                      <th className="p-4">Assignee</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          No tickets found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      tickets.map(ticket => (
                        <tr 
                          key={ticket.id} 
                          onClick={() => handleSelectTicket(ticket.id)}
                          className="hover:bg-slate-900/60 cursor-pointer transition-colors group"
                        >
                          <td className="p-4 font-mono font-semibold text-indigo-400 whitespace-nowrap">
                            {ticket.ticketNumber}
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-white group-hover:text-indigo-300 transition line-clamp-1">
                              {ticket.title}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{ticket.category}</div>
                          </td>
                          <td className="p-4 text-slate-300 whitespace-nowrap">
                            {(() => {
                              const isOnline = getUserOnlineStatus(ticket.createdBy.employeeId, ticket.createdBy.name);
                              return (
                                <div className="flex items-center gap-2" title={isOnline ? `${ticket.createdBy.name} is Online` : `${ticket.createdBy.name} is Offline`}>
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500'}`}></span>
                                  <span className="font-medium text-white">{ticket.createdBy.name}</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {getPriorityBadge(ticket.priority)}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {getStatusBadge(ticket.status)}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {getSlaBadge(ticket.slaStatus)}
                          </td>
                          <td className="p-4 text-slate-300 whitespace-nowrap">
                            {ticket.assigneeName ? (
                              (() => {
                                const isOnline = getUserOnlineStatus(undefined, ticket.assigneeName);
                                return (
                                  <span className="flex items-center gap-2 text-xs bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 w-fit" title={isOnline ? `${ticket.assigneeName} (Online)` : `${ticket.assigneeName} (Offline)`}>
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500'}`}></span>
                                    <UserCheck size={12} className="text-indigo-400" />
                                    <span className="text-indigo-200">{ticket.assigneeName}</span>
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-xs text-amber-500 font-medium">Unassigned</span>
                            )}
                          </td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <button className="p-2 bg-slate-900 group-hover:bg-indigo-600 group-hover:text-white rounded-xl text-slate-400 transition">
                              <ChevronRight size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'closed_tickets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Closed Request Archive</h2>
                <p className="text-sm text-slate-400">All resolved and finalized tickets including completion dates.</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4">Ticket</th>
                      <th className="p-4">Title & Category</th>
                      {isUserRole ? null : <th className="p-4">Requester</th>}
                      <th className="p-4">Closed Date & Time</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {(isUserRole ? closedTickets : tickets.filter(t => t.status === 'Closed')).length === 0 ? (
                      <tr>
                        <td colSpan={isUserRole ? 5 : 6} className="p-8 text-center text-slate-500">
                          No closed tickets found in the archive.
                        </td>
                      </tr>
                    ) : (
                      (isUserRole ? closedTickets : tickets.filter(t => t.status === 'Closed')).map(ticket => (
                        <tr 
                          key={ticket.id} 
                          onClick={() => handleSelectTicket(ticket.id)}
                          className="hover:bg-slate-900/60 cursor-pointer transition-colors group"
                        >
                          <td className="p-4 font-mono font-semibold text-indigo-400 whitespace-nowrap">
                            {ticket.ticketNumber}
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-white group-hover:text-indigo-300 transition line-clamp-1">
                              {ticket.title}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{ticket.category}</div>
                          </td>
                          {isUserRole ? null : (
                            <td className="p-4 text-slate-300 whitespace-nowrap">
                              {ticket.createdBy.name}
                            </td>
                          )}
                          <td className="p-4 text-slate-300 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-500" />
                              {new Date(ticket.updatedAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <Clock size={12} />
                              {new Date(ticket.updatedAt).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {getStatusBadge(ticket.status)}
                          </td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <button className="p-2 bg-slate-900 group-hover:bg-indigo-600 group-hover:text-white rounded-xl text-slate-400 transition">
                              <ChevronRight size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Knowledge Base & Troubleshooting Guides</h2>
              <p className="text-sm text-slate-400">Standardized troubleshooting guides and answers to frequent IT issues.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cannedResponses.map(can => (
                <div key={can.id} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/30">
                      {can.category}
                    </span>
                    <button 
                      onClick={() => navigator.clipboard.writeText(can.content)}
                      className="text-xs text-slate-400 hover:text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800"
                    >
                      Copy Guide
                    </button>
                  </div>
                  <h3 className="text-base font-bold text-white">{can.title}</h3>
                  <p className="text-sm text-slate-300 bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-xs">
                    {can.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isUserRole && activeTab === 'admin' && currentUser.role === 'admin' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Administration & RBAC Control</h2>
                <p className="text-sm text-slate-400 mt-1">Manage user roles, security PINs, SLA thresholds, and enterprise security policies.</p>
              </div>
            </div>

            {/* Admin Panel Search Bar & Quick Filters */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={adminUserSearch}
                    onChange={e => setAdminUserSearch(e.target.value)}
                    placeholder="Search users by Name, Employee ID (e.g. EMP-001), Role, or Department..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  {adminUserSearch && (
                    <button
                      onClick={() => setAdminUserSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Role Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
                  {(['all', 'admin', 'agent', 'user'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => setAdminRoleFilter(role)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition flex items-center gap-1.5 whitespace-nowrap ${
                        adminRoleFilter === role
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {role === 'all' ? 'All Roles' : `${role}s`}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-bold">
                        {role === 'all' 
                          ? users.length 
                          : users.filter(u => u.role === role).length}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Online / Offline Status Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0 sm:border-l sm:border-slate-800 sm:pl-3">
                  <button
                    onClick={() => setAdminStatusFilter('all')}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                      adminStatusFilter === 'all'
                        ? 'bg-slate-700 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    All Status
                  </button>
                  <button
                    onClick={() => setAdminStatusFilter('online')}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                      adminStatusFilter === 'online'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-slate-900 text-emerald-400 hover:bg-emerald-950/40 border border-slate-800'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-bold">
                      {users.filter(u => (currentUser && u.employeeId.toLowerCase() === currentUser.employeeId.toLowerCase()) ? true : (u.isOnline ?? false)).length}
                    </span>
                  </button>
                  <button
                    onClick={() => setAdminStatusFilter('offline')}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                      adminStatusFilter === 'offline'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'bg-slate-900 text-rose-400 hover:bg-rose-950/40 border border-slate-800'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    Offline
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-bold">
                      {users.filter(u => !((currentUser && u.employeeId.toLowerCase() === currentUser.employeeId.toLowerCase()) ? true : (u.isOnline ?? false))).length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Live search results info */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-900">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong className="text-white">{filteredAdminUsers.length}</strong> of {users.length} users
                  </span>
                  {(adminUserSearch || adminRoleFilter !== 'all' || adminStatusFilter !== 'all') && (
                    <span className="text-indigo-400 text-[11px]">
                      (filtered by {adminUserSearch ? `"${adminUserSearch}"` : ''} {adminRoleFilter !== 'all' ? `[role: ${adminRoleFilter}]` : ''} {adminStatusFilter !== 'all' ? `[status: ${adminStatusFilter}]` : ''})
                    </span>
                  )}
                </div>

                {(adminUserSearch || adminRoleFilter !== 'all' || adminStatusFilter !== 'all') && (
                  <button
                    onClick={() => { setAdminUserSearch(''); setAdminRoleFilter('all'); setAdminStatusFilter('all'); }}
                    className="text-xs text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <X size={12} /> Clear filters
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: User Directory & Credentials */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <UserIcon size={18} className="text-indigo-400" /> User Directory & Security PINs
                  </h3>
                  <button
                    onClick={() => setIsAddUserOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
                  >
                    <PlusCircle size={14} /> Add User / Agent
                  </button>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredAdminUsers.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                      <Search size={24} className="mx-auto text-slate-500" />
                      <p className="text-sm font-semibold text-white">No users or agents found</p>
                      <p className="text-xs text-slate-400">
                        No accounts match your current search and status filters.
                      </p>
                      <button
                        onClick={() => { setAdminUserSearch(''); setAdminRoleFilter('all'); setAdminStatusFilter('all'); }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
                      >
                        Reset search filters
                      </button>
                    </div>
                  ) : (
                    filteredAdminUsers.map(u => {
                      const isOnline = (currentUser && u.employeeId.toLowerCase() === currentUser.employeeId.toLowerCase()) 
                        ? true 
                        : (u.isOnline ?? false);
                      return (
                        <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800 gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {renderAvatar(u.avatar, u.fullName, "w-10 h-10", isOnline)}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate flex items-center gap-2">
                                <span>{u.fullName}</span>
                                {isOnline ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" title="Online account">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/60"></span>
                                    Online
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30" title="Offline account">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/60"></span>
                                    Offline
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-indigo-300 font-mono font-bold mt-0.5">{u.employeeId} • {u.department}</div>
                              {/* Visible credential/password details for manual handover as requested */}
                              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                <span>🔑 Password/PIN:</span>
                                <strong className="text-emerald-400 font-mono select-all bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/60">{u.password || 'userpassword'}</strong>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${u.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' : u.role === 'agent' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-blue-500/10 text-blue-300 border-blue-500/20'}`}>
                              {u.role}
                            </span>
                            <button
                              onClick={() => openEditUser(u)}
                              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Password Reset Requests & SLA rules */}
              <div className="space-y-6">
                {/* Password Reset Requests */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <KeyRound size={18} className="text-amber-400 animate-pulse" /> Pending Password Reset Requests
                  </h3>
                  <div className="space-y-3">
                    {passwordResetRequests.filter(r => r.status === 'pending').length === 0 ? (
                      <div className="text-xs text-slate-500 bg-slate-900/40 p-4 border border-slate-900 rounded-xl text-center">
                        No pending password reset requests.
                      </div>
                    ) : (
                      passwordResetRequests.filter(r => r.status === 'pending').map(req => {
                        const targetUser = users.find(u => u.employeeId.toLowerCase() === req.employeeId.toLowerCase());
                        return (
                          <div key={req.id} className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">{req.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Emp ID: {req.employeeId}</div>
                              {req.email && (
                                <div className="text-[10px] text-indigo-300 font-mono mt-0.5 truncate max-w-[220px]" title={req.email}>
                                  ✉️ {req.email}
                                </div>
                              )}
                              <div className="text-[10px] text-amber-400 mt-1">Requested: {new Date(req.createdAt).toLocaleTimeString()}</div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {req.email && (
                                <a
                                  href={`mailto:${req.email}?subject=HelpDeskPro Security PIN Reset&body=Hi ${req.fullName},%0D%0A%0D%0AYour requested security PIN has been updated. Here are your credentials:%0D%0A%0D%0AEmployee ID: ${req.employeeId}%0D%0ASecurity PIN / Password: ${targetUser?.password || 'userpassword'}%0D%0A%0D%0APlease use these credentials to secure your HelpDeskPro portal account.%0D%0A%0D%0ABest regards,%0D%0AIT Support Administration`}
                                  className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-indigo-950 hover:text-indigo-200 text-indigo-300 rounded-lg border border-slate-700 font-semibold transition text-center"
                                  title="Draft credential email to employee"
                                >
                                  Draft Email
                                </a>
                              )}
                              {targetUser && (
                                <button
                                  onClick={() => openEditUser(targetUser)}
                                  className="px-2 py-1 text-[10px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded-lg transition"
                                  title="Change User Password"
                                >
                                  Update PIN
                                </button>
                              )}
                              <button
                                onClick={() => handleResolveResetRequest(req.id)}
                                className="px-2 py-1 text-[10px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow"
                              >
                                Resolve
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* SLA Rules */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock size={18} className="text-indigo-400" /> SLA Response & Resolution Rules
                  </h3>
                  <div className="space-y-3">
                    {[
                      { priority: 'Urgent', response: '1 hour', resolution: '4 hours' },
                      { priority: 'High', response: '2 hours', resolution: '8 hours' },
                      { priority: 'Medium', response: '4 hours', resolution: '24 hours' },
                      { priority: 'Low', response: '8 hours', resolution: '48 hours' },
                    ].map((rule, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800 text-sm">
                        <span className="font-semibold text-white">{rule.priority} Priority</span>
                        <div className="text-xs text-slate-400 space-x-3">
                          <span>Response: <strong className="text-slate-200">{rule.response}</strong></span>
                          <span>Resolution: <strong className="text-slate-200">{rule.resolution}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* New Ticket Modal */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
                  <TicketIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {isUserRole ? 'Submit IT Support Request' : 'Create IT Support Ticket'}
                  </h3>
                  <p className="text-xs text-slate-400">Opisyal na itatala sa ilalim ng iyong account</p>
                </div>
              </div>
              <button onClick={() => { setIsNewTicketOpen(false); setCreateTicketError(''); }} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
                <X size={20} />
              </button>
            </div>

            {/* Locked Requester Identity Card */}
            {currentUser && (
              <div className="bg-gradient-to-r from-slate-950 via-slate-950 to-indigo-950/30 border border-indigo-500/30 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-inner">
                {renderAvatar(currentUser.avatar, currentUser.fullName, "w-11 h-11 ring-2 ring-indigo-500/40")}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white truncate">{currentUser.fullName}</span>
                    <span className="inline-flex items-center gap-1 bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md">
                      <Lock size={10} /> EMP ID: {currentUser.employeeId}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{currentUser.department}</span>
                    <span>•</span>
                    <span className="uppercase text-[10px] font-semibold text-indigo-400">{currentUser.role}</span>
                    <span className="text-emerald-400 text-[11px] flex items-center gap-1 ml-auto font-medium">
                      <CheckCircle2 size={12} /> Verified Requester
                    </span>
                  </div>
                </div>
              </div>
            )}

            {createTicketError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 text-xs text-red-400 flex items-center gap-2">
                <ShieldAlert size={16} className="flex-shrink-0" />
                <span>{createTicketError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Issue Title / Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cannot connect to Office Wi-Fi or VPN gateway"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Priority Level</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low - Minor inconvenience</option>
                    <option value="Medium">Medium - Standard ticket</option>
                    <option value="High">High - Impeding productivity</option>
                    <option value="Urgent">Urgent - System outage</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Detailed Description & Steps to Reproduce</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the detailed issue, error messages, affected systems, or steps to reproduce..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition"
                />
              </div>

              {/* File Attachments Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Attachments & Diagnostic Documents ({newAttachments.length})
                  </label>
                  <span className="text-[11px] text-indigo-400">PDF, Images, Logs, Docs</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.txt,.log,.docx,.xlsx,.zip"
                  className="hidden"
                />

                {/* Dropzone area */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-indigo-500/70 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-950/50 hover:bg-slate-950/80 group"
                >
                  <UploadCloud size={24} className="mx-auto text-indigo-400 group-hover:scale-110 mb-1.5 transition duration-200" />
                  <span className="text-xs text-slate-300 font-medium block">
                    Click to browse files or drag & drop documents here
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Supports PDF, Screenshots (PNG/JPG), Log files (.log/.txt), and diagnostics
                  </span>
                </div>

                {/* Quick Add Sample Preset Attachments */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-[11px] text-slate-400">Quick Samples:</span>
                  <button
                    type="button"
                    onClick={() => handleAddSampleAttachment('pdf')}
                    className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <FileText size={12} className="text-red-400" /> + Diagnostics PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSampleAttachment('screenshot')}
                    className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <ImageIcon size={12} className="text-blue-400" /> + Error Screenshot
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSampleAttachment('log')}
                    className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <FileCode size={12} className="text-emerald-400" /> + Crash Log
                  </button>
                </div>

                {/* Attached Files List */}
                {newAttachments.length > 0 && (
                  <div className="space-y-2 pt-1 max-h-36 overflow-y-auto pr-1">
                    {newAttachments.map((att, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 text-xs group hover:border-indigo-500/40 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {att.name.endsWith('.pdf') || att.type?.includes('pdf') ? (
                            <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0">
                              <FileText size={14} />
                            </div>
                          ) : att.type?.startsWith('image/') || att.name.match(/\.(png|jpg|jpeg|webp)$/i) ? (
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                              <ImageIcon size={14} />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                              <FileCode size={14} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-slate-200 font-medium truncate block">{att.name}</span>
                            <span className="text-[10px] text-slate-500">{att.size}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment({
                              name: att.name,
                              size: att.size,
                              type: att.type,
                              dataUrl: att.dataUrl,
                              ticketNumber: 'DRAFT',
                              requestedBy: currentUser?.fullName,
                              createdAt: new Date().toISOString()
                            })}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                            title="Preview Attachment"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewAttachment(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                            title="Remove file"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsNewTicketOpen(false); setCreateTicketError(''); }}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTicket}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isCreatingTicket ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> {isUserRole ? 'Submit Request' : 'Create Ticket'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-indigo-400 text-lg">{selectedTicket.ticketNumber}</span>
                {getStatusBadge(selectedTicket.status)}
                {getPriorityBadge(selectedTicket.priority)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border border-slate-700 shadow-sm print-hidden"
                  title="Print Ticket Detail & Comments"
                >
                  <Printer size={14} /> Print Ticket
                </button>
                <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-white p-1 print-hidden">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Details & Comments */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedTicket.title}</h2>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      Requested by:{' '}
                      {(() => {
                        const isReqOnline = getUserOnlineStatus(selectedTicket.createdBy?.employeeId, selectedTicket.createdBy?.name);
                        return (
                          <>
                            <span 
                              className={`w-2 h-2 rounded-full inline-block ${isReqOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'}`}
                              title={isReqOnline ? 'Online' : 'Offline'}
                            />
                            <strong className="text-slate-200">{selectedTicket.createdBy.name}</strong>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${isReqOnline ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
                              {isReqOnline ? 'Online' : 'Offline'}
                            </span>
                          </>
                        );
                      })()}
                    </span>
                    <span>Created: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {!isUserRole && selectedTicket.aiSummary && (
                  <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      <Sparkles size={14} className="text-indigo-400" /> Gemini AI Incident Triage
                    </div>
                    <p className="text-sm text-slate-200">{selectedTicket.aiSummary}</p>
                    <div className="flex items-center gap-3 pt-1 text-xs text-indigo-300">
                      <span>Sentiment: <strong>{selectedTicket.aiSentiment || 'Neutral'}</strong></span>
                      <span>Suggested Category: <strong>{selectedTicket.aiSuggestedCategory}</strong></span>
                    </div>
                  </div>
                )}

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase">Description</h4>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                  
                  {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                    <div className="pt-3 border-t border-slate-800 mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                          Attached Files ({selectedTicket.attachments.length})
                        </span>
                        <span className="text-[10px] text-indigo-400">Click any file to open & preview</span>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {selectedTicket.attachments.map((att, idx) => {
                          const isPdf = att.name.endsWith('.pdf') || att.type?.includes('pdf');
                          const isImg = att.type?.startsWith('image/') || att.name.match(/\.(png|jpg|jpeg|webp)$/i);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setZoomLevel(100);
                                setPreviewAttachment({
                                  name: att.name,
                                  size: att.size || '120 KB',
                                  type: att.type || (isPdf ? 'application/pdf' : isImg ? 'image/png' : 'text/plain'),
                                  dataUrl: att.dataUrl || att.url,
                                  ticketNumber: selectedTicket.ticketNumber,
                                  requestedBy: selectedTicket.createdBy?.name,
                                  createdAt: selectedTicket.createdAt
                                });
                              }}
                              className="group flex items-center gap-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 px-3.5 py-2.5 rounded-xl text-xs transition duration-200 text-left shadow-sm cursor-pointer"
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPdf ? 'bg-red-500/10 text-red-400 border border-red-500/30' : isImg ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                                {isPdf ? <FileText size={16} /> : isImg ? <ImageIcon size={16} /> : <FileCode size={16} />}
                              </div>
                              <div className="min-w-0 max-w-[180px]">
                                <span className="text-slate-200 font-medium truncate block group-hover:text-indigo-300 transition">{att.name}</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  {att.size || '120 KB'} • <Eye size={10} className="text-indigo-400 inline" /> Preview
                                </span>
                              </div>
                              <ExternalLink size={14} className="text-slate-600 group-hover:text-indigo-400 ml-1 transition flex-shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Comments & Timeline */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Conversation & Updates
                  </h4>

                  <div className="space-y-3">
                    {selectedTicket.comments && selectedTicket.comments
                      .filter(comment => !(isUserRole && comment.isInternal))
                      .map(comment => (
                        <div 
                          key={comment.id} 
                          className={`p-4 rounded-xl border ${comment.isInternal ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-950 border-slate-800'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {renderAvatar(
                                comment.userAvatar, 
                                comment.userName, 
                                "w-7 h-7", 
                                getUserOnlineStatus(undefined, comment.userName)
                              )}
                              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                                <span>{comment.userName}</span>
                                <span 
                                  className={`w-2 h-2 rounded-full inline-block ${getUserOnlineStatus(undefined, comment.userName) ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'}`}
                                  title={getUserOnlineStatus(undefined, comment.userName) ? 'Online' : 'Offline'}
                                />
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-slate-900 text-slate-400">
                                {comment.userRole}
                              </span>
                              {comment.isInternal && (
                                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                  <Lock size={10} /> Internal Note
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-sm text-slate-300">{comment.content}</p>
                        </div>
                      ))}
                  </div>

                  {/* Add Comment Form */}
                  <form onSubmit={handleAddComment} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <textarea
                      rows={3}
                      placeholder={isUserRole ? 'Add a reply or update to support...' : 'Write a reply or internal note...'}
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />

                    <div className="flex items-center justify-between">
                      {!isUserRole && (
                        <label className="flex items-center gap-2 text-xs text-amber-400 cursor-pointer font-medium">
                          <input
                            type="checkbox"
                            checked={isInternalComment}
                            onChange={e => setIsInternalComment(e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-amber-600 focus:ring-0"
                          />
                          <Lock size={12} /> Restrict to Internal Staff Notes
                        </label>
                      )}

                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-xs shadow transition flex items-center gap-1.5 ml-auto"
                      >
                        <Send size={14} /> Send Reply
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column: Ticket Controls & AI Copilot */}
              <div className="space-y-6">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase">Request Status</h4>

                  {!isUserRole && (
                    <>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Status</label>
                        <select
                          value={selectedTicket.status}
                          onChange={e => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Pending Vendor">Pending Vendor</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Assignee</label>
                        <select
                          value={selectedTicket.assigneeId || ''}
                          onChange={e => handleAssignTicket(selectedTicket.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">Unassigned</option>
                          {users.filter(u => u.role !== 'user').map(agent => {
                            const isAgentOnline = (currentUser && agent.employeeId.toLowerCase() === currentUser.employeeId.toLowerCase()) ? true : (agent.isOnline ?? false);
                            return (
                              <option key={agent.id} value={agent.id}>
                                {agent.fullName} ({agent.department}) — {isAgentOnline ? '🟢 Online' : '🔴 Offline'}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </>
                  )}

                  {isUserRole && (
                    <div className="space-y-2 text-xs text-slate-300">
                      <div>Current Status: <strong className="text-white">{selectedTicket.status}</strong></div>
                      <div>
                        Assigned Agent:{' '}
                        <strong className="text-white inline-flex items-center gap-1.5 ml-1">
                          {selectedTicket.assigneeName ? (
                            <>
                              <span 
                                className={`w-2 h-2 rounded-full inline-block ${getUserOnlineStatus(undefined, selectedTicket.assigneeName) ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'}`}
                                title={getUserOnlineStatus(undefined, selectedTicket.assigneeName) ? 'Online' : 'Offline'}
                              />
                              <span>{selectedTicket.assigneeName}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${getUserOnlineStatus(undefined, selectedTicket.assigneeName) ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
                                {getUserOnlineStatus(undefined, selectedTicket.assigneeName) ? 'Online' : 'Offline'}
                              </span>
                            </>
                          ) : (
                            'Queued for Assignment'
                          )}
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>SLA Tracker:</span>
                      <strong className="text-white">{getSlaBadge(selectedTicket.slaStatus)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Target Resolution:</span>
                      <strong className="text-white">{new Date(selectedTicket.dueDate).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                {!isUserRole && (
                  <div className="bg-gradient-to-br from-indigo-950/60 to-slate-950 border border-indigo-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase">
                      <Bot size={16} className="text-indigo-400" /> Gemini AI Copilot
                    </div>
                    <p className="text-xs text-slate-300">Draft intelligent agent responses or generate concise incident summaries.</p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRunAiCopilot('suggest_response')}
                        disabled={isAiLoading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-xl text-xs transition disabled:opacity-50"
                      >
                        {isAiLoading ? 'Thinking...' : 'Draft Response'}
                      </button>
                      <button
                        onClick={() => handleRunAiCopilot('summarize')}
                        disabled={isAiLoading}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 rounded-xl text-xs transition border border-slate-700 disabled:opacity-50"
                      >
                        Summarize
                      </button>
                    </div>

                    {aiResult && (
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs text-slate-200 space-y-2 mt-2">
                        <div className="font-semibold text-indigo-400">AI Result:</div>
                        <p className="whitespace-pre-wrap">{aiResult}</p>
                        <button
                          onClick={() => setCommentText(aiResult)}
                          className="text-[10px] bg-indigo-600/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30 hover:bg-indigo-600/30"
                        >
                          Use as Draft Reply
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!isUserRole && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase">Audit Trail</h4>
                    <div className="space-y-2 text-xs">
                      {selectedTicket.auditLogs?.map(log => (
                        <div key={log.id} className="border-l-2 border-indigo-500 pl-3 py-1 space-y-0.5">
                          <div className="text-slate-200 font-medium">{log.action}</div>
                          <div className="text-[10px] text-slate-500">By {log.performedBy} • {new Date(log.createdAt).toLocaleTimeString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachment & PDF Document Viewer Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[94vh] flex flex-col">
            {/* Viewer Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  previewAttachment.name.endsWith('.pdf') || previewAttachment.type?.includes('pdf')
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : previewAttachment.type?.startsWith('image/') || previewAttachment.name.match(/\.(png|jpg|jpeg|webp)$/i)
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {previewAttachment.name.endsWith('.pdf') || previewAttachment.type?.includes('pdf') ? (
                    <FileText size={20} />
                  ) : previewAttachment.type?.startsWith('image/') || previewAttachment.name.match(/\.(png|jpg|jpeg|webp)$/i) ? (
                    <ImageIcon size={20} />
                  ) : (
                    <FileCode size={20} />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                    {previewAttachment.name}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>{previewAttachment.size || '120 KB'}</span>
                    <span>•</span>
                    <span className="uppercase text-[10px] font-semibold text-indigo-400">
                      {previewAttachment.name.endsWith('.pdf') || previewAttachment.type?.includes('pdf')
                        ? 'PDF Document'
                        : previewAttachment.type?.startsWith('image/') || previewAttachment.name.match(/\.(png|jpg|jpeg|webp)$/i)
                        ? 'Image Screenshot'
                        : 'Diagnostic Text / Log'}
                    </span>
                    {previewAttachment.ticketNumber && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-slate-300">{previewAttachment.ticketNumber}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Viewer Controls Toolbar */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Zoom Controls (Images / Docs) */}
                <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-300">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(50, prev - 25))}
                    className="p-1 hover:text-white transition disabled:opacity-40"
                    disabled={zoomLevel <= 50}
                    title="Zoom Out"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="px-2 font-mono text-[11px] min-w-[42px] text-center">{zoomLevel}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(200, prev + 25))}
                    className="p-1 hover:text-white transition disabled:opacity-40"
                    disabled={zoomLevel >= 200}
                    title="Zoom In"
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>

                {/* Print Button */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition text-xs flex items-center gap-1.5"
                  title="Print Document"
                >
                  <Printer size={16} />
                  <span className="hidden md:inline">Print</span>
                </button>

                {/* Download Button */}
                <a
                  href={previewAttachment.dataUrl || '#'}
                  download={previewAttachment.name}
                  onClick={(e) => {
                    if (!previewAttachment.dataUrl || previewAttachment.dataUrl === '#') {
                      e.preventDefault();
                      const blob = new Blob([
                        `=== HELPDESKPRO ATTACHMENT REPORT ===\nFile: ${previewAttachment.name}\nTicket: ${previewAttachment.ticketNumber || 'INC-10024'}\nTimestamp: ${new Date().toISOString()}\nStatus: Verified\n---\nSample diagnostic test passed with 0 errors.`
                      ], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = previewAttachment.name;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                  title="Download File"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline font-semibold">Download</span>
                </a>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition ml-1"
                  title="Close Viewer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Viewer Content Body */}
            <div className="flex-1 overflow-y-auto min-h-[50vh] max-h-[68vh] bg-slate-950 rounded-2xl border border-slate-800/80 p-4 sm:p-6 flex flex-col items-center justify-start">
              {/* 1. PDF Viewer Mode */}
              {previewAttachment.name.endsWith('.pdf') || previewAttachment.type?.includes('pdf') ? (
                previewAttachment.dataUrl && previewAttachment.dataUrl.startsWith('data:application/pdf') ? (
                  <iframe 
                    src={previewAttachment.dataUrl} 
                    className="w-full h-[60vh] rounded-xl border border-slate-800 bg-white"
                    title={previewAttachment.name}
                  />
                ) : (
                  /* Formatted High-Fidelity Printable PDF Sheet */
                  <div 
                    style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}
                    className="w-full max-w-2xl bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-8 space-y-6 font-sans border border-slate-200"
                  >
                    {/* PDF Header */}
                    <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-4">
                      <div>
                        <div className="text-xl font-extrabold text-indigo-950 tracking-tight flex items-center gap-2">
                          <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded font-mono font-bold">IT-DOC</span>
                          HelpDeskPro Diagnostic Report
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">Enterprise Incident Support & System Health Document</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-indigo-600">{previewAttachment.ticketNumber || 'INC-10024'}</div>
                        <div className="text-[10px] text-slate-400">{new Date(previewAttachment.createdAt || Date.now()).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {/* PDF Meta Box */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Requester</span>
                        <strong className="text-slate-800">{previewAttachment.requestedBy || currentUser?.fullName || 'John Doe'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Document ID</span>
                        <span className="font-mono text-slate-700">DOC-DX-{Date.now().toString().slice(-6)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Compliance</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 size={12} className="inline text-emerald-600" /> ISO/IEC 20000 Passed
                        </span>
                      </div>
                    </div>

                    {/* Automated Diagnostics Table */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Automated Diagnostic Check Results</h4>
                      <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                        <thead className="bg-slate-100 text-slate-700 font-semibold">
                          <tr>
                            <th className="p-2 border border-slate-200">System Component</th>
                            <th className="p-2 border border-slate-200">Sensor Reading / Value</th>
                            <th className="p-2 border border-slate-200">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          <tr>
                            <td className="p-2 border border-slate-200 font-medium text-slate-800">Local Gateway Ping</td>
                            <td className="p-2 border border-slate-200 font-mono text-slate-600">192.168.1.1 (Latency: 0.82ms)</td>
                            <td className="p-2 border border-slate-200 text-emerald-600 font-bold">NORMAL</td>
                          </tr>
                          <tr>
                            <td className="p-2 border border-slate-200 font-medium text-slate-800">Corporate DNS Lookup</td>
                            <td className="p-2 border border-slate-200 font-mono text-slate-600">auth.company.corp (Resolved in 14ms)</td>
                            <td className="p-2 border border-slate-200 text-emerald-600 font-bold">NORMAL</td>
                          </tr>
                          <tr>
                            <td className="p-2 border border-slate-200 font-medium text-slate-800">CPU & Memory Load</td>
                            <td className="p-2 border border-slate-200 font-mono text-slate-600">CPU: 18% | RAM: 5.4 / 16.0 GB</td>
                            <td className="p-2 border border-slate-200 text-emerald-600 font-bold">HEALTHY</td>
                          </tr>
                          <tr>
                            <td className="p-2 border border-slate-200 font-medium text-slate-800">Antivirus & Firewall</td>
                            <td className="p-2 border border-slate-200 font-mono text-slate-600">EDR Agent v4.19 (Signatures Up-to-date)</td>
                            <td className="p-2 border border-slate-200 text-emerald-600 font-bold">ENFORCED</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* System Log Snippet */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Log Trace & Event Dump</h4>
                      <div className="bg-slate-950 text-emerald-400 font-mono text-[11px] p-3 rounded-lg overflow-x-auto leading-relaxed border border-slate-800">
                        <div>[09:14:02.108] INFO: Diagnostic probe initialized on interface wlan0</div>
                        <div>[09:14:02.342] INFO: Handshake with authentication server validated (TLS 1.3)</div>
                        <div>[09:14:02.580] WARN: Packet retry observed on port 443 (Recovered in 8ms)</div>
                        <div>[09:14:03.011] SUCCESS: Diagnostic report generated successfully. No fatal hardware errors detected.</div>
                      </div>
                    </div>

                    {/* PDF Footer Signature */}
                    <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                      <div>HelpDeskPro Security Operations Center • System Automation</div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <ShieldCheck size={14} className="text-indigo-600" /> Digitally Certified by IT HelpDesk
                      </div>
                    </div>
                  </div>
                )
              ) : previewAttachment.type?.startsWith('image/') || previewAttachment.name.match(/\.(png|jpg|jpeg|webp)$/i) ? (
                /* 2. Image Screenshot Viewer Mode */
                <div className="w-full flex flex-col items-center justify-center p-2">
                  <img
                    src={previewAttachment.dataUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800'}
                    alt={previewAttachment.name}
                    style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}
                    className="max-w-full rounded-xl shadow-2xl border border-slate-800 object-contain max-h-[60vh]"
                  />
                  <span className="text-xs text-slate-400 mt-4 font-mono">
                    {previewAttachment.name} ({previewAttachment.size || 'Screenshot'})
                  </span>
                </div>
              ) : (
                /* 3. Text / Log Viewer Mode */
                <div className="w-full max-w-3xl space-y-3">
                  <div className="flex items-center justify-between bg-slate-900 px-4 py-2 rounded-t-xl border border-slate-800 text-xs text-slate-400 font-mono">
                    <span>{previewAttachment.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`[ERROR_LOG_DUMP]\nTimestamp: ${new Date().toISOString()}\nTicket: ${previewAttachment.ticketNumber || 'INC-10024'}\nLevel: DIAGNOSTIC\nStatus: 200 OK\nDiagnostics completed successfully.`);
                        setCopiedLog(true);
                        setTimeout(() => setCopiedLog(false), 2000);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                    >
                      <Copy size={12} /> {copiedLog ? 'Copied!' : 'Copy Contents'}
                    </button>
                  </div>
                  <pre className="bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-b-xl border border-slate-800 overflow-x-auto leading-relaxed">
{`// HELPDESKPRO DIAGNOSTIC & LOG REPORT
// Generated: ${new Date().toISOString()}
// System Host: CORP-CLIENT-WS-${Date.now().toString().slice(-4)}
// User Context: ${previewAttachment.requestedBy || currentUser?.fullName || 'Requester'}

[SYSTEM_BOOT] Initializing hardware diagnostic subroutines...
[NETWORK] Adapter 0 (Ethernet): Link Speed 1000 Mbps Full-Duplex [UP]
[NETWORK] Adapter 1 (Wi-Fi 6): Signal 92% (-48 dBm), SSID: CORP-ENTERPRISE-5G
[IP_CONFIG] IPv4: 10.20.14.88 | Subnet: 255.255.255.0 | Gateway: 10.20.14.1
[SECURITY] Windows Defender ATP: Active & Real-Time Protection Enabled
[DIAG_RESULT] All diagnostic probes returned healthy exit code (0x0).
[STATUS] Ready for technician review.`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserIcon className="text-indigo-500" /> Add New Agent or User
              </h3>
              <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {addUserError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
                {addUserError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Employee ID</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Employee ID"
                  value={addEmpId}
                  onChange={e => setAddEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Full Name"
                  value={addFullName}
                  onChange={e => setAddFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Role</label>
                  <select
                    value={addRole}
                    onChange={e => setAddRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="agent">Support Agent</option>
                    <option value="user">End-User / Client</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Department"
                    value={addDepartment}
                    onChange={e => setAddDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditUserOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings size={20} className="text-indigo-500" /> Edit User / Reset Password
              </h3>
              <button onClick={() => { setIsEditUserOpen(false); setEditingUser(null); }} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {editUserError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
                {editUserError}
              </div>
            )}

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Employee ID</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Employee ID"
                  value={editEmployeeId}
                  onChange={e => setEditEmployeeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Full Name"
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Role</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="admin">Administrator</option>
                    <option value="agent">Support Agent</option>
                    <option value="user">End-User / Client</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Department"
                    value={editDepartment}
                    onChange={e => setEditDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Set New Password / PIN</label>
                <input
                  type="text"
                  placeholder="•••••••• (Leave blank to keep current)"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">If you set a password here, deliver it securely to the employee.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsEditUserOpen(false); setEditingUser(null); }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Picture Modal */}
      {isEditAvatarOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-500" /> Update Profile Picture
              </h3>
              <button onClick={() => { setIsEditAvatarOpen(false); setAvatarError(''); }} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {avatarError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
                {avatarError}
              </div>
            )}

            <form onSubmit={handleUpdateProfilePicture} className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preview</div>
                {renderAvatar(newAvatarUrl, currentUser?.fullName, "w-24 h-24 border-4 border-indigo-500/40 shadow-xl")}
              </div>

              {/* Upload Image from Computer Option */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Upload from Computer</label>
                <div className="relative border border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-950/70 group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud size={24} className="mx-auto text-indigo-400 mb-1 group-hover:scale-110 transition duration-200" />
                  <span className="text-xs text-slate-300 font-medium block">Select an image file</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Supports PNG, JPG, GIF, WebP (Max 5MB)</span>
                </div>
              </div>

              {/* Preset Avatar Selection Grid */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Choose a Preset Avatar</label>
                <div className="grid grid-cols-4 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  {[
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
                    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
                    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
                    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
                    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewAvatarUrl(preset)}
                      className={`w-12 h-12 rounded-full overflow-hidden border-2 transition hover:scale-105 active:scale-95 ${newAvatarUrl === preset ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/20' : 'border-slate-800 hover:border-slate-500'}`}
                    >
                      <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom URL Option */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Or Paste Custom Image URL</label>
                <input
                  type="url"
                  placeholder="Paste image URL here"
                  value={newAvatarUrl}
                  onChange={e => setNewAvatarUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsEditAvatarOpen(false); setAvatarError(''); }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAvatar}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingAvatar ? 'Saving...' : 'Update Picture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog for All Roles */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
              <LogOut size={28} className="translate-x-0.5" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Confirm Logout</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to log out of your account? You will need to sign in again to access the HelpDesk portal.
              </p>
            </div>

            {currentUser && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 text-left">
                {renderAvatar(currentUser.avatar, currentUser.fullName, "w-10 h-10", true)}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                    <span>{currentUser.fullName}</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Online
                    </span>
                  </div>
                  <div className="text-[11px] text-indigo-400 font-medium">
                    {currentUser.employeeId} • <span className="uppercase text-slate-400">{currentUser.role}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{currentUser.department}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 rounded-xl text-sm transition border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
              >
                <LogOut size={16} /> Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
