import { useLocation, Link } from 'react-router-dom';
import { ClipboardList, Lock } from 'lucide-react';

export default function Header() {
  const location = useLocation();
  const isAdminPage = location.pathname === '/admin';

  return (
    <header className="border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-brand)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0b0f1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div className="text-[var(--color-brand)] font-bold text-sm tracking-wide">EXECUTIVE WORKSHOP</div>
            <div className="text-slate-400 text-xs">Curated Roundtables</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !isAdminPage
                ? 'bg-[var(--color-brand)] text-[var(--color-bg-dark)]'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ClipboardList size={16} />
            Form
          </Link>
          <Link
            to="/admin"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isAdminPage
                ? 'bg-[var(--color-brand)] text-[var(--color-bg-dark)]'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Lock size={16} />
            Admin
          </Link>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-brand)] to-transparent opacity-40" />
    </header>
  );
}
