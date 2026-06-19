import { supabase } from '../../lib/supabaseClient';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Info, User, Phone, Mail, Building2, Briefcase, Globe, Calendar, ArrowRight, ArrowLeft, Send, Check } from 'lucide-react';

interface FormData {
  fullName: string;
  mobileNumber: string;
  email: string;
  organization: string;
  currentRole: string;
  industry: string;
  experience: string;
  interests: string;
  challengingDecision: string;
  referralSource: string;
  agreeTerms: boolean;
  agreeFee: boolean;
}

const roleOptions = [
  'Founder / CEO',
  'Managing Director',
  'CXO (CFO, CTO, COO, etc.)',
  'Business Owner',
  'Director',
  'Successor / Next-Gen Leader',
  'Other',
];

const experienceOptions = [
  '0-5 years',
  '5-10 years',
  '10-20 years',
  '20-30 years',
  '30+ years',
];

const referralOptions = [
  'Personal invitation',
  'WhatsApp',
  'Email',
  'LinkedIn',
  'Referral',
  'Other',
];

export default function LandingPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    mobileNumber: '',
    email: '',
    organization: '',
    currentRole: '',
    industry: '',
    experience: '',
    interests: '',
    challengingDecision: '',
    referralSource: '',
    agreeTerms: false,
    agreeFee: false,
  });

  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (step1Errors[field]) {
      setStep1Errors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (step2Errors[field]) {
      setStep2Errors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const requiredStep1Fields: { key: keyof FormData; label: string }[] = [
    { key: 'fullName', label: 'Full Name' },
    { key: 'mobileNumber', label: 'Mobile Number' },
    { key: 'email', label: 'Email Address' },
    { key: 'organization', label: 'Organization / Business Name' },
    { key: 'currentRole', label: 'Current Role' },
    { key: 'industry', label: 'Industry / Sector' },
    { key: 'experience', label: 'Years of Experience' },
  ];

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    for (const { key, label } of requiredStep1Fields) {
      const val = formData[key];
      if (typeof val === 'string' && val.trim() === '') {
        errors[key] = `${label} is required`;
      }
    }
    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.interests.trim()) errors.interests = 'This field is required';
    if (!formData.challengingDecision.trim()) errors.challengingDecision = 'This field is required';
    if (!formData.referralSource) errors.referralSource = 'Please select an option';
    if (!formData.agreeTerms) errors.agreeTerms = 'You must agree to continue';
    if (!formData.agreeFee) errors.agreeFee = 'You must agree to continue';
    setStep2Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const { error: supabaseError } = await supabase
      .from('applicants')
      .insert([
        {
          full_name: formData.fullName,
          mobile_number: formData.mobileNumber,
          email: formData.email,
          organization: formData.organization,
          current_role: formData.currentRole,
          industry: formData.industry,
          experience: formData.experience,
          interests: formData.interests,
          challenging_decision: formData.challengingDecision,
          referral_source: formData.referralSource,
          status: 'Pending Review',
        },
      ] as any);
      if (supabaseError) throw supabaseError;

      // Notify admin via FastAPI Gmail SMTP backend
      try {
        const adminEmail = import.meta.env.VITE_ADMIN_NOTIFICATION_EMAIL || 'krishnakishore.k777@gmail.com';
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${backendUrl}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: adminEmail,
            subject: `🆕 New Workshop Registration: ${formData.fullName} (${formData.organization})`,
            html: `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
    <h2 style="color:#1f2937;margin-bottom:8px;">📋 New Workshop Registration</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 12px;">A new participant has submitted the registration form. Details are below:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px;color:#6b7280;width:35%;">Full Name</td><td style="padding:6px;color:#111827;font-weight:600;">${formData.fullName}</td></tr>
      <tr><td style="padding:6px;color:#6b7280;">Email</td><td style="padding:6px;color:#111827;">${formData.email}</td></tr>
      <tr><td style="padding:6px;color:#6b7280;">Mobile</td><td style="padding:6px;color:#111827;">${formData.mobileNumber}</td></tr>
      <tr><td style="padding:6px;color:#6b7280;">Organization</td><td style="padding:6px;color:#111827;">${formData.organization}</td></tr>
      <tr><td style="padding:6px;color:#6b7280;">Role</td><td style="padding:6px;color:#111827;">${formData.currentRole}</td></tr>
      <tr><td style="padding:6px;color:#6b7280;">Industry</td><td style="padding:6px;color:#111827;">${formData.industry}</td></tr>
      <tr><td style="padding:6px;color:#6b7280;">Experience</td><td style="padding:6px;color:#111827;">${formData.experience}</td></tr>
      <tr><td style="padding:6px;color:#6b7280;">Referral</td><td style="padding:6px;color:#111827;">${formData.referralSource}</td></tr>
    </table>
    <p style="color:#374151;font-size:13px;margin-top:12px;">Log in to the admin panel to <strong>approve</strong> or <strong>reject</strong> this applicant. The applicant will be notified automatically of the decision.</p>
  </div>`,
          }),
        });
        if (!res.ok) {
          console.error('Admin notification email failed:', await res.text());
        } else {
          console.log('✅ Admin notified of new registration');
        }
      } catch (emailError) {
        console.error('Failed to reach FastAPI email server for admin notification:', emailError);
      }

      // Send acknowledgement email to the applicant
      try {
        const backendUrl2 = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${backendUrl2}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: formData.email,
            subject: `✅ We received your registration, ${formData.fullName}!`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:40px 32px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
                <h2 style="color:#1f2937;margin-bottom:6px;">Thank you for registering!</h2>
                <p style="color:#6b7280;font-size:13px;margin-top:0;">Executive Leadership Workshop — Seat Application Received</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
                <p style="color:#374151;font-size:15px;">Dear <strong>${formData.fullName}</strong>,</p>
                <p style="color:#374151;font-size:15px;line-height:1.7;">Your application has been received and is currently <strong style="color:#d97706;">under review</strong>.</p>
                <p style="color:#374151;font-size:15px;line-height:1.7;">We will notify you via email once your seat is <strong>approved</strong> or if it is <strong>rejected</strong>.</p>
                </p>

                <div style="margin:28px 0;padding:20px 24px;background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
                  <p style="margin:0 0 6px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Your Application Summary</p>
                  <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <tr><td style="padding:5px 0;color:#6b7280;width:40%;">Name</td><td style="padding:5px 0;color:#111827;font-weight:600;">${formData.fullName}</td></tr>
                    <tr><td style="padding:5px 0;color:#6b7280;">Organization</td><td style="padding:5px 0;color:#111827;">${formData.organization}</td></tr>
                    <tr><td style="padding:5px 0;color:#6b7280;">Role</td><td style="padding:5px 0;color:#111827;">${formData.currentRole}</td></tr>
                    <tr><td style="padding:5px 0;color:#6b7280;">Industry</td><td style="padding:5px 0;color:#111827;">${formData.industry}</td></tr>
                    <tr><td style="padding:5px 0;color:#6b7280;">Experience</td><td style="padding:5px 0;color:#111827;">${formData.experience}</td></tr>
                  </table>
                </div>

                <p style="color:#6b7280;font-size:13px;line-height:1.6;">
                  ℹ️ This is an <strong>invitation-only</strong> workshop. Payment instructions (₹7,500 + GST)
                  will be shared only after your seat is formally confirmed.
                </p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
                <p style="color:#9ca3af;font-size:12px;">© 2026 Executive Roundtables. All rights reserved.</p>
              </div>
            `,
          }),
        });
        if (!res.ok) {
          console.error('Applicant acknowledgement email failed:', await res.text());
        } else {
          console.log(`✅ Acknowledgement sent to ${formData.email}`);
        }
      } catch (emailError) {
        console.error('Failed to send applicant acknowledgement:', emailError);
      }

      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldHasError = (field: string) => !!step1Errors[field];

  const inputClass = (field: string) =>
    `w-full bg-transparent border ${
      fieldHasError(field)
        ? 'border-red-500'
        : focusedField === field
          ? 'border-[var(--color-brand)]'
          : 'border-slate-700'
    } rounded-lg px-4 py-3 pl-11 text-white placeholder-slate-500 text-sm outline-none transition-colors`;

  const selectClass = (field: string) =>
  `w-full bg-transparent border ${
    fieldHasError(field)
      ? 'border-red-500'
      : focusedField === field
        ? 'border-[var(--color-brand)]'
        : 'border-slate-700'
  } rounded-lg px-4 py-3 pl-11 text-white text-sm outline-none transition-colors appearance-none cursor-pointer ${
    !formData[field as keyof FormData] ? 'text-slate-500' : ''
  }`;

  const textareaClass = (field: string) =>
    `w-full bg-transparent border ${
      fieldHasError(field)
        ? 'border-red-500'
        : focusedField === field
          ? 'border-[var(--color-brand)]'
          : 'border-slate-700'
    } rounded-lg px-4 py-3 text-white placeholder-slate-500 text-sm outline-none transition-colors resize-none`;

  return (
    <>
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-4 py-16">
        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
        >
          Logout
        </button>
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--color-brand)]/40 bg-[var(--color-brand)]/5 mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--color-brand)]" />
            <span className="text-[var(--color-brand)] text-xs font-semibold tracking-widest uppercase">
              Invitation-Only Roundtable
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight mb-8">
  The Leadership <span className="text-[var(--color-brand)] italic">Blind-Spot</span>:<br/>
  The Hidden Cost of Bad Decisions
</h1>

          <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-12 max-w-2xl mx-auto">
            Thank you for your interest in this invitation-only workshop for founders, CXOs, business
            owners, and successors. This 3-hour interactive session is designed as a reflective space
            to explore decision-making under pressure, identify blind spots, and gain practical insight
            into leadership choices.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <div className="border border-slate-700 rounded-xl px-8 py-5 min-w-[180px]">
              <div className="text-slate-500 text-xs font-semibold tracking-widest uppercase mb-1">
                Program Fee
              </div>
              <div className="text-white text-lg font-bold">
                ₹7,500 <span className="text-slate-500 text-sm font-normal">+ GST</span>
              </div>
            </div>
            <div className="border border-slate-700 rounded-xl px-8 py-5 min-w-[180px]">
              <div className="text-slate-500 text-xs font-semibold tracking-widest uppercase mb-1">
                Duration
              </div>
              <div className="text-white text-lg font-bold">3 Hours</div>
            </div>
          </div>

          <div className="mb-12">
            <button
              onClick={() => {
                setShowForm(true);
                setTimeout(() => {
                  document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="flex items-center gap-2 px-8 py-4 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-bg-dark)] font-semibold text-base rounded-xl transition-colors mx-auto"
            >
              Register for Workshop
              <ChevronDown size={18} />
            </button>
          </div>

          <div className="flex items-start gap-3 max-w-xl mx-auto bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-left">
            <Info size={18} className="text-[var(--color-brand)] mt-0.5 shrink-0" />
            <p className="text-slate-400 text-sm leading-relaxed">
              Registrations will be reviewed, and confirmed participation will be communicated based on seat availability.
              Payment instructions will be shared solely upon formal registration approval.
            </p>
          </div>
        </div>
      </div>

      {/* Registration Form Section */}
      {showForm && (
        <div id="registration-form" className="px-4 pb-20">
          <div className="w-full max-w-2xl mx-auto">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              {/* Progress bar */}
              <div className="h-1 bg-slate-800">
                <div className={`h-full transition-all duration-300 ${currentStep === 1 ? 'w-1/2' : 'w-full'}`} />
              </div>

              <div className="p-8 md:p-10">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                      <Check size={28} className="text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Registration Submitted!</h2>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto mb-8">
                      Thank you for registering. Your application is now under review. You will receive a confirmation
                      email with further details once your seat is confirmed.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setShowForm(false);
                        setCurrentStep(1);
                        setFormData({
                          fullName: '', mobileNumber: '', email: '', organization: '',
                          currentRole: '', industry: '', experience: '', interests: '',
                          challengingDecision: '', referralSource: '', agreeTerms: false, agreeFee: false,
                        });
                      }}
                      className="px-6 py-3 border border-slate-700 text-white hover:bg-slate-800 font-semibold text-sm rounded-xl transition-colors"
                    >
                      Back to Home
                    </button>
                  </div>
                ) : (
                <>
                {currentStep === 1 ? (
                  <>
                    {/* Step 1 */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[var(--color-brand)] text-xs font-semibold tracking-widest uppercase">
                        Step 1 of 2: Professional Profile
                      </span>
                      <span className="text-slate-500 text-xs border border-slate-700 rounded px-2 py-0.5">
                        1/2
                      </span>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-8">Tell us about yourself</h2>

                    <div className="space-y-5">
                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">
                          Full Name <span className="text-[var(--color-brand)]">*</span>
                        </label>
                        <div className="relative">
                          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                           <input
                            type="text"
                            placeholder="Enter your full name"
                            value={formData.fullName}
                            onChange={(e) => handleChange('fullName', e.target.value)}
                            onFocus={() => setFocusedField('fullName')}
                            onBlur={() => setFocusedField(null)}
                            className={inputClass('fullName')}
                          />
                        </div>
                        {fieldHasError('fullName') && (
                          <p className="text-red-500 text-xs mt-1.5">{step1Errors.fullName}</p>
                        )}
                      </div>

                      {/* Mobile + Email row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">
                            Mobile Number <span className="text-[var(--color-brand)]">*</span>
                          </label>
                          <div className="relative">
                            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                              type="tel"
                              placeholder="10-digit mobile number"
                              value={formData.mobileNumber}
                              onChange={(e) => handleChange('mobileNumber', e.target.value)}
                              onFocus={() => setFocusedField('mobileNumber')}
                              onBlur={() => setFocusedField(null)}
                              className={inputClass('mobileNumber')}
                              maxLength={10}
                            />
                          </div>
                          {fieldHasError('mobileNumber') ? (
                            <p className="text-red-500 text-xs mt-1.5">{step1Errors.mobileNumber}</p>
                          ) : (
                            <p className="text-slate-600 text-xs mt-1.5">Only numbers allowed. Must be exactly 10 digits.</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">
                            Email Address <span className="text-[var(--color-brand)]">*</span>
                          </label>
                          <div className="relative">
                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                              type="email"
                              placeholder="you@company.com"
                              value={formData.email}
                              onChange={(e) => handleChange('email', e.target.value)}
                              onFocus={() => setFocusedField('email')}
                              onBlur={() => setFocusedField(null)}
                              className={inputClass('email')}
                            />
                          </div>
                          {fieldHasError('email') && (
                            <p className="text-red-500 text-xs mt-1.5">{step1Errors.email}</p>
                          )}
                        </div>
                      </div>

                      {/* Organization + Role row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">
                            Organization / Business Name <span className="text-[var(--color-brand)]">*</span>
                          </label>
                          <div className="relative">
                            <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                              type="text"
                              placeholder="Company name"
                              value={formData.organization}
                              onChange={(e) => handleChange('organization', e.target.value)}
                              onFocus={() => setFocusedField('organization')}
                              onBlur={() => setFocusedField(null)}
                              className={inputClass('organization')}
                            />
                          </div>
                          {fieldHasError('organization') && (
                            <p className="text-red-500 text-xs mt-1.5">{step1Errors.organization}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">
                            Current Role <span className="text-[var(--color-brand)]">*</span>
                          </label>
                          <div className="relative">
                            <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <select
                              value={formData.currentRole}
                              onChange={(e) => handleChange('currentRole', e.target.value)}
                              onFocus={() => setFocusedField('currentRole')}
                              onBlur={() => setFocusedField(null)}
                              className={selectClass('currentRole')}
                            >
                              <option value="" disabled>Select your current role</option>
                              {roleOptions.map((role) => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </div>
                          {fieldHasError('currentRole') && (
                            <p className="text-red-500 text-xs mt-1.5">{step1Errors.currentRole}</p>
                          )}
                        </div>
                      </div>

                      {/* Industry + Experience row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">
                            Industry / Sector <span className="text-[var(--color-brand)]">*</span>
                          </label>
                          <div className="relative">
                            <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                              type="text"
                              placeholder="e.g., Tech, Manufacturing, Finance"
                              value={formData.industry}
                              onChange={(e) => handleChange('industry', e.target.value)}
                              onFocus={() => setFocusedField('industry')}
                              onBlur={() => setFocusedField(null)}
                              className={inputClass('industry')}
                            />
                          </div>
                          {fieldHasError('industry') && (
                            <p className="text-red-500 text-xs mt-1.5">{step1Errors.industry}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">
                            Years of Leadership / Business Experience <span className="text-[var(--color-brand)]">*</span>
                          </label>
                          <div className="relative">
                            <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <select
                              value={formData.experience}
                              onChange={(e) => handleChange('experience', e.target.value)}
                              onFocus={() => setFocusedField('experience')}
                              onBlur={() => setFocusedField(null)}
                              className={selectClass('experience')}
                            >
                              <option value="" disabled>Select experience range</option>
                              {experienceOptions.map((exp) => (
                                <option key={exp} value={exp}>{exp}</option>
                              ))}
                            </select>
                          </div>
                          {fieldHasError('experience') && (
                            <p className="text-red-500 text-xs mt-1.5">{step1Errors.experience}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Continue button */}
                    <div className="mt-8 flex justify-end">
                      <button
                        onClick={() => {
                          if (validateStep1()) {
                            setCurrentStep(2);
                            document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="flex items-center gap-2 px-8 py-3.5 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-bg-dark)] font-semibold text-sm rounded-xl transition-colors"
                      >
                        Continue to Insights
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Step 2 */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[var(--color-brand)] text-xs font-semibold tracking-widest uppercase">
                        Step 2 of 2: Workshop Insights
                      </span>
                      <span className="text-slate-500 text-xs border border-slate-700 rounded px-2 py-0.5">
                        2/2
                      </span>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-8">Share your thoughts</h2>

                    <div className="space-y-6">
                      {/* Interests */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">
                          What interests you about this workshop? <span className="text-[var(--color-brand)]">*</span>
                        </label>
                        <textarea
                          placeholder="Please write in a few sentences what motivated you to register..."
                          rows={4}
                          value={formData.interests}
                          onChange={(e) => handleChange('interests', e.target.value)}
                          onFocus={() => setFocusedField('interests')}
                          onBlur={() => setFocusedField(null)}
                          className={textareaClass('interests')}
                        />
                        {fieldHasError('interests') && (
                          <p className="text-red-500 text-xs mt-1.5">{step2Errors.interests}</p>
                        )}
                      </div>

                      {/* Challenging Decision */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">
                          What is one kind of decision you currently find most challenging? <span className="text-[var(--color-brand)]">*</span>
                        </label>
                        <textarea
                          placeholder="Describe a difficult decision domain, e.g., leadership alignments, capital scaling, or successors planning..."
                          rows={4}
                          value={formData.challengingDecision}
                          onChange={(e) => handleChange('challengingDecision', e.target.value)}
                          onFocus={() => setFocusedField('challengingDecision')}
                          onBlur={() => setFocusedField(null)}
                          className={textareaClass('challengingDecision')}
                        />
                        {fieldHasError('challengingDecision') && (
                          <p className="text-red-500 text-xs mt-1.5">{step2Errors.challengingDecision}</p>
                        )}
                      </div>

                      {/* Referral Source */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 tracking-wider uppercase mb-3">
                          How did you hear about this workshop? <span className="text-[var(--color-brand)]">*</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {referralOptions.map((option) => (
                            <label
                              key={option}
                              onClick={() => handleChange('referralSource', option)}
                              className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                                formData.referralSource === option
                                  ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/5'
                                  : fieldHasError('referralSource')
                                    ? 'border-red-500'
                                    : 'border-slate-700 hover:border-slate-600'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  formData.referralSource === option
                                    ? 'border-[var(--color-brand)]'
                                    : 'border-slate-600'
                                }`}
                              >
                                {formData.referralSource === option && (
                                  <div className="w-2 h-2 rounded-full bg-[var(--color-brand)]" />
                                )}
                              </div>
                              <span className="text-sm text-slate-300">{option}</span>
                            </label>
                          ))}
                        </div>
                        {fieldHasError('referralSource') && (
                          <p className="text-red-500 text-xs mt-1.5">{step2Errors.referralSource}</p>
                        )}
                      </div>

                       {/* Checkboxes */}
                      <div className="space-y-3 pt-2">
                        <label className="flex items-start gap-3 p-4 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.agreeTerms}
                            onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-transparent text-[var(--color-brand)] focus:ring-[var(--color-brand)] focus:ring-offset-0 accent-[var(--color-brand)]"
                          />
                          <span className="text-sm text-slate-300 leading-relaxed">
                            I understand that this is a curated, registration-based workshop and that submission of this form does not automatically confirm my seat. <span className="text-[var(--color-brand)]">*</span>
                          </span>
                        </label>
                        {fieldHasError('agreeTerms') && (
                          <p className="text-red-500 text-xs">{step2Errors.agreeTerms}</p>
                        )}

                        <label className="flex items-start gap-3 p-4 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.agreeFee}
                            onChange={(e) => handleChange('agreeFee', e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-transparent text-[var(--color-brand)] focus:ring-[var(--color-brand)] focus:ring-offset-0 accent-[var(--color-brand)]"
                          />
                          <span className="text-sm text-slate-300 leading-relaxed">
                            I understand that the participation fee is ₹7,500 + GST, payable upon confirmation. <span className="text-[var(--color-brand)]">*</span>
                          </span>
                        </label>
                        {fieldHasError('agreeFee') && (
                          <p className="text-red-500 text-xs">{step2Errors.agreeFee}</p>
                        )}
                      </div>
                    </div>

                    {/* Back + Register buttons */}
                    <div className="mt-8 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setCurrentStep(1);
                          document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="flex items-center gap-2 px-6 py-3.5 border border-slate-700 text-white hover:bg-slate-800 font-semibold text-sm rounded-xl transition-colors"
                      >
                        <ArrowLeft size={16} />
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-8 py-3.5 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-bg-dark)] font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Submitting...' : 'Register for Workshop'}
                        <Send size={16} />
                      </button>
                    </div>
                    {submitError && (
                      <p className="text-red-500 text-sm mt-4 text-center">{submitError}</p>
                    )}
                  </>
                )}
                </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
