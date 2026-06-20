import { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, Database, FileSpreadsheet, Search, Check, X, Phone, Mail, RefreshCw, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import logo from '../../assets/logo.jpeg';

const DEFAULT_BACKEND_URL = 'https://executive-workshop-backend.vercel.app';

interface Applicant {
  id: number;
  timestamp: string;
  name: string;
  role: string;
  organization: string;
  sector: string;
  experience: string;
  phone: string;
  email: string;
  challengingDecision: string;
  interests: string;
  referralSource: string;
  status: 'Approved' | 'Pending Review' | 'Waitlisted' | 'Rejected';
}

function mapApiToApplicant(data: Record<string, unknown>): Applicant {
  const ts = data.created_at as string | null;
  const date = ts ? new Date(ts) : new Date();
  const formatted = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' +
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return {
    id: data.id as number,
    timestamp: formatted,
    name: data.full_name as string,
    role: data.current_role as string,
    organization: data.organization as string,
    sector: data.industry as string,
    experience: data.experience as string,
    phone: data.mobile_number as string,
    email: data.email as string,
    challengingDecision: (data.challenging_decision as string) || '',
    interests: (data.interests as string) || '',
    referralSource: (data.referral_source as string) || '',
    status: (data.status as Applicant['status']) || 'Pending Review',
  };
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [isVerified, setIsVerified] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('verified') === '1' || localStorage.getItem('adminVerified') === 'true';
  });
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('applicants')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setApplicants(data.map(mapApiToApplicant));
      }
    } catch {
      // API not reachable — keep existing state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isVerified) fetchApplicants();
  }, [isVerified, fetchApplicants]);

  const handleVerify = () => {
    if (accessCode === 'ADMIN2026') {
      setError('');
      setIsVerified(true);
    } else {
      setError('Invalid access code. Please try again.');
    }
  };

  const sendStatusEmail = async (applicant: Applicant, newStatus: 'Approved' | 'Rejected') => {
    // Send email to applicant via FastAPI Gmail SMTP backend
    const subject = newStatus === 'Approved' ? '🎉 Your Seat is Confirmed!' : 'Update on Your Workshop Application';
    const html = newStatus === 'Approved'
      ? `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px;">
          <h2 style="color:#059669;">🎉 Congratulations, ${applicant.name}!</h2>
          <p style="color:#374151;font-size:16px;">Your seat for the <strong>Executive Workshop</strong> has been <strong>confirmed</strong>.</p>
          <p style="color:#374151;">We look forward to seeing you at the session. More details will follow soon.</p>
          <p style="color:#6b7280;font-size:14px;">Thank you for registering!</p>
        </div>
      `
      : `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px;">
          <h2 style="color:#dc2626;">Update on Your Application</h2>
          <p style="color:#374151;font-size:16px;">Dear ${applicant.name},</p>
          <p style="color:#374151;">We regret to inform you that your seat request for the <strong>Executive Workshop</strong> has been <strong>rejected</strong> at this time.</p>
          <p style="color:#6b7280;font-size:14px;">Thank you for your interest. We hope to see you in future sessions.</p>
        </div>
      `;

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
      const res = await fetch(`${backendUrl}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: applicant.email, subject, html }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('FastAPI email error (user):', errText);
        alert(`⚠️ Email to ${applicant.email} failed: ${errText}`);
      } else {
        console.log(`✅ Email sent to ${applicant.email} (${newStatus})`);
      }
    } catch (err) {
      console.error('Failed to reach FastAPI email server:', err);
      alert(`⚠️ Could not reach email server at ${import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL}. Is the FastAPI backend running?`);
    }
  };

  // Notify admin when a decision is made
  const sendAdminNotification = async (applicant: Applicant, newStatus: 'Approved' | 'Rejected') => {
    const adminEmail = import.meta.env.VITE_ADMIN_NOTIFICATION_EMAIL || 'sirijapolinati17@gmail.com';
    const subject = `[Admin] Applicant ${newStatus}: ${applicant.name}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px;">
        <h2 style="color:#1f2937;">Admin Decision Recorded</h2>
        <p><strong>${applicant.name}</strong> (${applicant.email}) has been <strong style="color:${newStatus === 'Approved' ? '#059669' : '#dc2626'}">${newStatus}</strong>.</p>
        <p>Organization: ${applicant.organization} | Role: ${applicant.role}</p>
      </div>
    `;
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
      const res = await fetch(`${backendUrl}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: adminEmail, subject, html }),
      });
      if (!res.ok) console.error('FastAPI email error (admin):', await res.text());
    } catch (err) {
      console.error('Failed to send admin notification via FastAPI:', err);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const { error } = await (supabase as any)
        .from('applicants')
        .update({ status } as any)
        .eq('id', id);

      if (error) {
        console.error('Supabase Update Error:', error);
        alert('Failed to update status: ' + error.message);
      } else {
        setApplicants((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: status as Applicant['status'] } : a))
        );
      }
    } catch (err) {
      console.error('Network Error:', err);
    }
  };

  const handleApprove = async (applicant: Applicant) => {
    await updateStatus(applicant.id, 'Approved');
    await sendStatusEmail(applicant, 'Approved');
    // Notify admin about the approval action
    await sendAdminNotification(applicant, 'Approved');
  };

  const handleReject = async (applicant: Applicant) => {
    await updateStatus(applicant.id, 'Rejected');
    await sendStatusEmail(applicant, 'Rejected');
    // Notify admin about the rejection action
    await sendAdminNotification(applicant, 'Rejected');
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('applicants')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase Delete Error:', error);
        alert('Failed to delete: ' + error.message);
      } else {
        setApplicants((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error('Network Error:', err);
    }
  };

  const exportToCSV = () => {
    if (applicants.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = [
      'ID', 'Timestamp', 'Name', 'Role', 'Organization', 'Sector', 
      'Experience', 'Phone', 'Email', 'Challenging Decision', 
      'Interests', 'Referral Source', 'Status'
    ];

    const escapeCsv = (field: any) => {
      if (field === null || field === undefined) return '""';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [headers.join(',')];

    applicants.forEach(a => {
      const row = [
        a.id, a.timestamp, a.name, a.role, a.organization, a.sector,
        a.experience, a.phone, a.email, a.challengingDecision,
        a.interests, a.referralSource, a.status
      ];
      csvRows.push(row.map(escapeCsv).join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n'); // Added BOM for Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `executive_workshop_applicants_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredApplicants = applicants.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.organization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All Statuses' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const approvedCount = applicants.filter((a) => a.status === 'Approved').length;
  const pendingCount = applicants.filter((a) => a.status === 'Pending Review' || a.status === 'Waitlisted').length;

  const stats = [
    { label: 'TOTAL APPLICATIONS', value: applicants.length, sub: 'received', color: 'text-white' },
    { label: 'APPROVED SEATS', value: approvedCount, sub: 'confirmed', color: 'text-emerald-400' },
    { label: 'PENDING CURATIONS', value: pendingCount, sub: 'awaiting', color: 'text-yellow-400' },
    { label: 'PROJECTED REVENUE', value: `₹${approvedCount * 7500}`, sub: '@ 7.5k/ea', color: 'text-white' },
  ];

  if (!isVerified) {
    return (
      <div className="min-h-[calc(100vh-73px)] flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full border-2 border-slate-700 flex items-center justify-center">
                  <Shield size={28} className="text-[var(--color-brand)]" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-white mb-3">Organizer Authenticity Required</h1>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Please enter the security access code to manage applications &amp; export database to Excel.
              </p>
              <input
                type="password"
                placeholder="Enter Access Code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className="w-full bg-transparent border border-slate-700 rounded-lg px-4 py-3.5 text-white placeholder-slate-500 text-sm outline-none focus:border-[var(--color-brand)] transition-colors mb-2 text-center"
              />
              {error && (
                <p className="text-red-400 text-xs mb-4 text-center">{error}</p>
              )}
              {!error && <div className="mb-4" />}
              <button
                onClick={handleVerify}
                className="w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-bg-dark)] font-semibold text-sm rounded-xl transition-colors"
              >
                Verify &amp; Access Database
                <Lock size={16} />
              </button>
            </div>
          </div>
        </div>
        <footer className="border-t border-slate-800 px-6 py-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-slate-500 text-xs">© 2026 Executive Roundtables. All rights reserved.</p>
              <p className="text-slate-600 text-xs">Secure Firestore-backed real-time database with Excel sheet generation.</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link to="/" className="text-slate-400 hover:text-white transition-colors">Registration Page</Link>
              <span className="text-slate-700">|</span>
              <Link to="/admin" className="text-slate-400 hover:text-white transition-colors">Admin Portal</Link>
              <span className="text-slate-700">|</span>
              <span className="text-[var(--color-brand)]">Curated Session</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] flex flex-col">
      <div className="flex-1 px-4 md:px-8 py-10">
        <div className="max-w-7xl mx-auto">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-[#111827] to-[#1e293b] border border-slate-700/50 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl shadow-black/20">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Executive Workshop Logo" className="h-12 object-contain rounded-xl" />
              <div>
                <p className="text-slate-400 text-sm mt-0.5">Total verified submissions and live seat projections</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02]"
              >
                <FileSpreadsheet size={18} />
                Export CSV
              </button>
              <button
                onClick={fetchApplicants}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1e293b] hover:bg-[#334155] border border-slate-600 text-white text-sm font-semibold rounded-xl shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  localStorage.removeItem('adminVerified');
                  navigate('/login');
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-semibold rounded-xl transition-all hover:scale-[1.02]"
              >
                <Lock size={18} />
                Logout
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
            {stats.map((stat, i) => (
              <div key={i} className="relative overflow-hidden bg-[#111827] border border-slate-700/50 rounded-2xl p-6 shadow-lg group hover:border-slate-600 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-white/10 transition-colors" />
                <div className="relative z-10">
                  <div className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">{stat.label}</div>
                  <div className="flex items-end gap-2">
                    <span className={`text-4xl font-extrabold tracking-tight ${stat.color}`}>{stat.value}</span>
                    <span className="text-slate-500 text-sm font-medium mb-1">{stat.sub}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Live Registrant Log */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <h2 className="text-base font-bold text-white">Live Registrant Log</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search name/company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-[var(--color-brand)] transition-colors w-56"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#1a2332] border border-slate-700 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-[var(--color-brand)] transition-colors appearance-none cursor-pointer"
                >
                  <option value="All Statuses">All Statuses</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Waitlisted">Waitlisted</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-slate-800">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Applicant & Role</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Org & Sector</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Experience</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Info</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Challenging Decision</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Review Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplicants.map((applicant) => (
                    <tr key={applicant.id} className="border-t border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">{applicant.timestamp}</td>
                      <td className="px-6 py-4">
                        <div className="text-white text-sm font-medium">{applicant.name}</div>
                        <div className="text-emerald-400 text-xs">{applicant.role}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white text-sm">{applicant.organization}</div>
                        <div className="text-slate-500 text-xs">{applicant.sector}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-sm whitespace-nowrap">{applicant.experience}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                          <Phone size={12} className="text-slate-500" />
                          {applicant.phone}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
                          <Mail size={12} className="text-slate-500" />
                          {applicant.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-sm max-w-[200px] truncate">{applicant.challengingDecision}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${applicant.status === 'Approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : applicant.status === 'Pending Review'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : applicant.status === 'Waitlisted'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                          {applicant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {applicant.status !== 'Approved' && (
                            <button
                              onClick={() => handleApprove(applicant)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                              title="Approve"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          {applicant.status !== 'Rejected' && (
                            <button
                              onClick={() => handleReject(applicant)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                              title="Reject"
                            >
                              <X size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(applicant.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredApplicants.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500 text-sm">
                        No applicants found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-slate-500 text-xs">© 2026 Executive Roundtables. All rights reserved.</p>
            <p className="text-slate-600 text-xs">Secure Firestore-backed real-time database with Excel sheet generation.</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors">Registration Page</Link>
            <span className="text-slate-700">|</span>
            <Link to="/admin" className="text-slate-400 hover:text-white transition-colors">Admin Portal</Link>
            <span className="text-slate-700">|</span>
            <span className="text-[var(--color-brand)]">Curated Session</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
