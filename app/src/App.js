import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, useUser, useClerk } from '@clerk/clerk-react';
import './styles.css';

const CLERK_KEY = 'pk_test_ZXhjaXRpbmctdXJjaGluLTQxLmNsZXJrLmFjY291bnRzLmRldiQ';

function Logo() {
  return (
    <a href="https://www.uksecurityjobs.co.uk" className="nav-logo">
      <span className="uk">UK</span><span className="sec">Security</span><span className="job">Jobs</span>
    </a>
  );
}

function Nav() {
  const { signOut } = useClerk();
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Logo />
        <div className="nav-links">
          <SignedIn>
            <a className="nav-link" href="/dashboard">Dashboard</a>
            <button className="nav-btn" onClick={() => signOut({ redirectUrl: '/' })}>Sign out</button>
          </SignedIn>
          <SignedOut>
            <a className="nav-link" href="/sign-in">Sign in</a>
            <a className="nav-btn" style={{display:'inline-block'}} href="/sign-up">Register free</a>
          </SignedOut>
        </div>
      </div>
    </nav>
  );
}

function SignUpPage() {
  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState({ firstName:'', lastName:'', email:'', password:'', licenceType:'' });
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const { signUp, setActive } = useClerk().client ? useClerk() : { signUp: null, setActive: null };
  const clerk = useClerk();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await clerk.client.signUp.create({
        firstName: form.firstName,
        lastName: form.lastName,
        emailAddress: form.email,
        password: form.password,
        unsafeMetadata: { licenceType: form.licenceType, status: 'pending', score: 5 }
      });
      await result.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep(2);
    } catch (err) {
      setError(err.errors?.[0]?.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await clerk.client.signUp.attemptEmailAddressVerification({ code });
      await clerk.setActive({ session: result.createdSessionId });
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.errors?.[0]?.message || 'Invalid code. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <Nav />
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo"><Logo /></div>
          {step === 1 ? (
            <>
              <div className="auth-title">Create your profile</div>
              <div className="auth-sub">Join the UK's only verified security jobs platform</div>
              <form className="auth-form" onSubmit={handleRegister}>
                {error && <div className="auth-error">{error}</div>}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                  <div className="form-field">
                    <label className="form-label">First Name</label>
                    <input className="form-input" type="text" required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} placeholder="John" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" type="text" required value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} placeholder="Smith" />
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="your@email.com" autoComplete="email" />
                </div>
                <div className="form-field">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min. 8 characters" autoComplete="new-password" />
                </div>
                <div className="form-field">
                  <label className="form-label">Primary SIA Licence Type</label>
                  <select className="form-select" required value={form.licenceType} onChange={e=>setForm({...form,licenceType:e.target.value})}>
                    <option value="">Select your licence type</option>
                    <option value="ds">Door Supervisor</option>
                    <option value="sg">Security Guard</option>
                    <option value="cctv">CCTV Operator</option>
                    <option value="cp">Close Protection</option>
                    <option value="cvit">Cash &amp; Valuables in Transit</option>
                    <option value="kh">Key Holding</option>
                    <option value="none">Not yet licensed</option>
                  </select>
                </div>
                <button className="btn-full" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create My Profile →'}</button>
              </form>
              <div className="auth-footer">Already registered? <a href="/sign-in">Sign in</a></div>
            </>
          ) : (
            <>
              <div className="auth-title">Verify your email</div>
              <div className="auth-sub">We sent a 6-digit code to {form.email}</div>
              <form className="auth-form" onSubmit={handleVerify}>
                {error && <div className="auth-error">{error}</div>}
                <div className="form-field">
                  <label className="form-label">Verification Code</label>
                  <input className="form-input" type="text" required value={code} onChange={e=>setCode(e.target.value)} placeholder="Enter 6-digit code" style={{textAlign:'center',fontSize:'1.3rem',letterSpacing:'0.3em'}} maxLength={6} />
                </div>
                <button className="btn-full" type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify & Continue →'}</button>
              </form>
              <div className="auth-footer"><a href="/sign-up" onClick={()=>setStep(1)}>← Change email</a></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SignInPage() {
  const [form, setForm] = React.useState({ email:'', password:'' });
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const clerk = useClerk();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await clerk.client.signIn.create({ identifier: form.email, password: form.password });
      await clerk.setActive({ session: result.createdSessionId });
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.errors?.[0]?.message || 'Invalid email or password.');
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <Nav />
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo"><Logo /></div>
          <div className="auth-title">Welcome back</div>
          <div className="auth-sub">Sign in to your UKSecurityJobs account</div>
          <form className="auth-form" onSubmit={handleSignIn}>
            {error && <div className="auth-error">{error}</div>}
            <div className="form-field">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="your@email.com" autoComplete="email" />
            </div>
            <div className="form-field">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Your password" autoComplete="current-password" />
            </div>
            <div style={{textAlign:'right',marginBottom:'0.5rem'}}>
              <a href="/forgot-password" style={{fontSize:'0.82rem',color:'var(--blue)'}}>Forgot password?</a>
            </div>
            <button className="btn-full" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In →'}</button>
          </form>
          <div className="auth-footer">Not registered? <a href="/sign-up">Create your profile</a></div>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [step, setStep] = React.useState(1);
  const [code, setCode] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const clerk = useClerk();

  const handleRequest = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await clerk.client.signIn.create({ strategy: 'reset_password_email_code', identifier: email });
      setStep(2);
    } catch (err) {
      setError(err.errors?.[0]?.message || 'Could not find that email address.');
    }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await clerk.client.signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code, password: newPassword });
      await clerk.setActive({ session: result.createdSessionId });
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.errors?.[0]?.message || 'Invalid code or password too weak.');
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <Nav />
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo"><Logo /></div>
          {step === 1 ? (
            <>
              <div className="auth-title">Reset your password</div>
              <div className="auth-sub">Enter your email and we'll send a reset code</div>
              <form className="auth-form" onSubmit={handleRequest}>
                {error && <div className="auth-error">{error}</div>}
                <div className="form-field">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" />
                </div>
                <button className="btn-full" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Code →'}</button>
              </form>
              <div className="auth-footer"><a href="/sign-in">← Back to sign in</a></div>
            </>
          ) : (
            <>
              <div className="auth-title">Enter your code</div>
              <div className="auth-sub">We sent a reset code to {email}</div>
              <form className="auth-form" onSubmit={handleReset}>
                {error && <div className="auth-error">{error}</div>}
                <div className="form-field">
                  <label className="form-label">Reset Code</label>
                  <input className="form-input" type="text" required value={code} onChange={e=>setCode(e.target.value)} placeholder="6-digit code" style={{textAlign:'center',fontSize:'1.2rem',letterSpacing:'0.2em'}} maxLength={6} />
                </div>
                <div className="form-field">
                  <label className="form-label">New Password</label>
                  <input className="form-input" type="password" required value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Your new password" />
                </div>
                <button className="btn-full" type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password →'}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user } = useUser();
  const score = user?.unsafeMetadata?.score || 5;
  const licenceType = user?.unsafeMetadata?.licenceType || 'none';
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  const licenceLabels = { ds:'Door Supervisor', sg:'Security Guard', cctv:'CCTV Operator', cp:'Close Protection', cvit:'Cash & Valuables in Transit', kh:'Key Holding', none:'Not yet licensed' };

  const steps = [
    { num:'01', title:'SIA Licence', desc:'Verify your SIA licence number against the public register', done: licenceType !== 'none' },
    { num:'02', title:'Personal Details', desc:'Add your location, contact details and driving licence', done: false },
    { num:'03', title:'Employment History', desc:'Add 5 years of employment history — no gaps allowed', done: false },
    { num:'04', title:'Address History', desc:'Add 5 years of address history for BS7858 compliance', done: false },
    { num:'05', title:'Documents', desc:'Upload right to work documents and qualifications', done: false },
    { num:'06', title:'Referees', desc:'Add two professional referees with contact details', done: false },
  ];

  return (
    <div className="page" style={{background:'var(--off)'}}>
      <Nav />
      <div className="dashboard">
        <div className="dash-header">
          <div className="dash-greeting">Welcome, {user?.firstName || 'Officer'} 👋</div>
          <div className="dash-sub">Complete your profile to unlock security jobs and exclusive member benefits.</div>
        </div>

        <div className="score-card">
          <div className="score-ring-wrap">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#f3f4f6" strokeWidth="8" fill="none"/>
              <circle cx="50" cy="50" r="40" stroke="#1a52a8" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{transition:'stroke-dashoffset 0.5s'}}/>
            </svg>
            <div className="score-ring-num">
              <div className="score-big">{score}</div>
              <div className="score-label">Score</div>
            </div>
          </div>
          <div>
            <div className="score-title">Your Vettability Score</div>
            <div className="score-status">{score < 60 ? 'Complete your profile to unlock jobs' : score < 80 ? 'Good — standard roles now available' : 'Premium roles unlocked'}</div>
            <div className="score-bars">
              <div className="bar-item">
                <div className="bar-top"><span className="bar-lbl">SIA Licence</span><span className={`bar-val ${licenceType !== 'none' ? 'ok' : 'miss'}`}>{licenceType !== 'none' ? '+5 ✓' : '+0/20'}</span></div>
                <div className="bar-track"><div className={`bar-fill ${licenceType !== 'none' ? 'ok' : ''}`} style={{width: licenceType !== 'none' ? '100%' : '0%'}}></div></div>
              </div>
              <div className="bar-item">
                <div className="bar-top"><span className="bar-lbl">Employment History</span><span className="bar-val miss">+0/20</span></div>
                <div className="bar-track"><div className="bar-fill" style={{width:'0%'}}></div></div>
              </div>
              <div className="bar-item">
                <div className="bar-top"><span className="bar-lbl">Address History</span><span className="bar-val miss">+0/15</span></div>
                <div className="bar-track"><div className="bar-fill" style={{width:'0%'}}></div></div>
              </div>
              <div className="bar-item">
                <div className="bar-top"><span className="bar-lbl">Documents</span><span className="bar-val miss">+0/10</span></div>
                <div className="bar-track"><div className="bar-fill" style={{width:'0%'}}></div></div>
              </div>
            </div>
          </div>
        </div>

        <div className="alert amber">
          <strong>Your profile is not yet live.</strong> Complete the steps below to reach a score of 70 and go live to employers.
        </div>

        <div className="steps-grid">
          {steps.map((s, i) => (
            <div key={i} className={`step-card ${s.done ? 'complete' : i === 0 ? 'active' : ''}`}>
              <div className="step-num">Step {s.num}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
              <span className={`step-badge ${s.done ? 'done' : 'todo'}`}>{s.done ? 'Complete' : 'To do'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><Navigate to="/sign-in" replace /></SignedOut>
    </>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}
