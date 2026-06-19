import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function LoginPanel() {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  const navigate = useNavigate();
  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      setUser(data.user);
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8 p-6 bg-[#1f2937] rounded-xl border border-slate-700 flex flex-col md:flex-row gap-8">
      <div className="md:w-1/3 flex flex-col gap-2">
        <h2 className="text-xl font-bold text-white mb-4">Authentication</h2>
        <button
          className={`px-4 py-2 rounded text-left ${activeTab === 'user' ? 'bg-[var(--color-brand)] text-white' : 'bg-slate-800 text-slate-300'}`}
          onClick={() => setActiveTab('user')}
        >
          User Login
        </button>
        <button
          className={`px-4 py-2 rounded text-left ${activeTab === 'admin' ? 'bg-[var(--color-brand)] text-white' : 'bg-slate-800 text-slate-300'}`}
          onClick={() => setActiveTab('admin')}
        >
          Admin Login
        </button>
      </div>

      <div className="md:w-2/3 border-t md:border-t-0 md:border-l border-slate-700 pt-6 md:pt-0 md:pl-8">
        {user ? (
          <div className="text-center text-green-400 py-10 flex flex-col items-center gap-4">
            <span>Logged in as {user.email} ({activeTab})</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white capitalize">{activeTab} Login</h3>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-bg-dark)] rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
