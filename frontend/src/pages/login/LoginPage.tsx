import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Mail, Lock, ArrowRight, Shield, User } from 'lucide-react';
import logo from '../../assets/logo.jpeg';

const ADMIN_ACCESS_CODE = import.meta.env.VITE_ADMIN_ACCESS_CODE || 'ADMIN2026';

type Role = 'user' | 'admin';

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('user');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (role === 'admin') {
        // Admin access via access code
        if (accessCode !== ADMIN_ACCESS_CODE) {
          throw new Error('Invalid access code');
        }
        // Successful admin entry
        localStorage.setItem('adminVerified', 'true');
        navigate('/admin?verified=1');
      } else {
        // User flow (sign‑in / sign‑up)
        if (isSignUp) {
          if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
          }
          
          // Custom Sign Up: bypass Supabase auth and go directly to form
          localStorage.setItem('userEmail', email);
          navigate('/form?first=true');
        } else {
          // Custom Sign In: check if email is in applicants table
          const { data, error: fetchError } = await supabase
            .from('applicants')
            .select('email')
            .eq('email', email)
            .single();
            
          if (fetchError || !data) {
            throw new Error('Invalid credentials or user not found. Please sign up if you do not have an account.');
          }
          
          localStorage.setItem('userEmail', email);
          navigate('/form');
        }
      }
    } catch (e: any) {
      console.error('Login/Signup error:', e);
      const errorMsg = e?.message || (typeof e === 'string' ? e : JSON.stringify(e));
      setError(errorMsg === '{}' ? 'Failed to connect. Check console for details.' : (errorMsg || 'Operation failed. Please check your input.'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full bg-white/5 border ${
      focusedField === field ? 'border-[var(--color-brand)]' : 'border-slate-700'
    } rounded-xl px-4 py-3 pl-11 text-white placeholder-slate-500 text-sm outline-none transition-all duration-200`;

  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)] flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[var(--color-brand)]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--color-brand)]/3 blur-[100px] pointer-events-none" />

      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-[var(--color-brand)] flex items-center justify-center shadow-lg shadow-[var(--color-brand)]/30">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0b0f1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div className="text-center mt-2">
          <div className="flex justify-center">
            <img src={logo} alt="Executive Workshop Logo" className="h-16 md:h-20 object-contain rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">

          {/* Top accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-brand)] to-transparent" />

          <div className="p-8">
            {/* Heading */}
            <h1 className="text-2xl font-bold text-white mb-1">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
            <p className="text-slate-400 text-sm mb-8">{isSignUp ? 'Sign up to start your journey' : 'Sign in to access your panel'}</p>

            {/* Role Tabs */}
            <div className="flex gap-2 p-1 bg-slate-800/60 rounded-xl mb-8">
              <button
                type="button"
                onClick={() => { setRole('user'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  role === 'user'
                    ? 'bg-[var(--color-brand)] text-[var(--color-bg-dark)] shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User size={15} />
                User Login
              </button>
              <button
                type="button"
                onClick={() => { setRole('admin'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  role === 'admin'
                    ? 'bg-[var(--color-brand)] text-[var(--color-bg-dark)] shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield size={15} />
                Admin Login
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
                {/* Admin Access Code */}
                {role === 'admin' ? (
                  <div className="relative">
                    <Lock size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'accessCode' ? 'text-[var(--color-brand)]' : 'text-slate-500'}`} />
                    <input
                      type="password"
                      placeholder="Access Code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      onFocus={() => setFocusedField('accessCode')}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={inputClass('accessCode')}
                    />
                  </div>
                ) : (
                  <>
                    {/* Email */}
                    <div className="relative">
                      <Mail size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'email' ? 'text-[var(--color-brand)]' : 'text-slate-500'}`} />
                      <input
                        type="email"
                        placeholder="Your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        required
                        className={inputClass('email')}
                      />
                    </div>

                    {/* Password */}
                    <div className="relative">
                      <Lock size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'password' ? 'text-[var(--color-brand)]' : 'text-slate-500'}`} />
                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        required
                        className={inputClass('password')}
                      />
                    </div>
                  </>
                )}

              {/* Confirm Password */}
              {isSignUp && role !== 'admin' && (
                <div className="relative">
                  <Lock size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'confirmPassword' ? 'text-[var(--color-brand)]' : 'text-slate-500'}`} />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    required
                    className={inputClass('confirmPassword')}
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-bg-dark)] font-bold text-sm rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg shadow-[var(--color-brand)]/20"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
                  </svg>
                ) : (
                  <>
                    {isSignUp ? 'Sign Up' : `Sign In as ${role === 'admin' ? 'Admin' : 'User'}`}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
            
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-center text-slate-500 text-xs mt-4 hover:text-[var(--color-brand)] transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          {/* Bottom accent */}
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-brand)] to-transparent opacity-30" />
        </div>

        {/* Role hint */}
        <p className="text-center text-slate-600 text-xs mt-6">
          {role === 'admin'
            ? 'Admin credentials grant access to the admin dashboard.'
            : 'User credentials grant access to the registration form.'}
        </p>
      </div>
    </div>
  );
}
