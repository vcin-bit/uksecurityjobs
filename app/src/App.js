import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, useUser, useClerk, useAuth } from '@clerk/clerk-react';
import { apiRequest, startApiKeepAlive } from './api';
import './styles.css';

startApiKeepAlive();

const CLERK_KEY = 'pk_test_ZXhjaXRpbmctdXJjaGluLTQxLmNsZXJrLmFjY291bnRzLmRldiQ';

// ── LOGO ──
function Logo() {
  return (
    <a href="https://www.uksecurityjobs.co.uk" className="logo">
      <span className="uk">UK</span><span className="sec">Security</span><span className="job">Jobs</span>
    </a>
  );
}

// ── NAV ──
function Nav() {
  const { signOut } = useClerk();
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Logo />
        <div className="nav-links">
          <SignedIn>
            <a className="nav-link" href="/dashboard">My Profile</a>
            <button className="nav-btn" onClick={() => signOut({ redirectUrl: '/' })}>Sign out</button>
          </SignedIn>
          <SignedOut>
            <a className="nav-link" href="/sign-in">Sign in</a>
            <a className="nav-btn-link" href="/sign-up">Register free</a>
          </SignedOut>
        </div>
      </div>
    </nav>
  );
}

// ── PROGRESS RINGS ──
function ProgressRings({ sections }) {
  const total = sections.length;
  const completed = sections.filter(s => s.complete).length;
  const overallPct = Math.round((completed / total) * 100);
  const size = 180;
  const cx = size / 2, cy = size / 2, r = 70;
  const circ = 2 * Math.PI * r;
  const offset = circ - (overallPct / 100) * circ;
  const color = overallPct >= 80 ? '#10b981' : overallPct >= 50 ? '#f59e0b' : '#1a52a8';

  return (
    <div className="rings-wrap">
      <div className="ring-main">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} stroke="#f3f4f6" strokeWidth="10" fill="none"/>
          <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="10" fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{transform:'rotate(-90deg)',transformOrigin:'center',transition:'stroke-dashoffset 0.6s ease'}}
          />
          {overallPct === 100 && (
            <path d="M70 100 L80 110 L110 80" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          )}
        </svg>
        <div className="ring-label">
          <div className="ring-pct" style={{color}}>{overallPct}%</div>
          <div className="ring-sub">Complete</div>
        </div>
      </div>
      <div className="ring-sections">
        {sections.map((s,i) => {
          const r2=22, c2=2*Math.PI*r2;
          const sectionColors = ['#1a52a8','#0891b2','#7c3aed','#db2777','#dc2626','#d97706','#059669','#0284c7','#6d28d9'];
          const baseColor = sectionColors[i % sectionColors.length];
          // pending = submitted but awaiting admin verification (SIA)
          const col = s.complete ? baseColor : s.pending ? '#f59e0b' : s.started ? baseColor + 'aa' : '#e2e8f0';
          const pct = s.complete ? 100 : s.pending ? 75 : s.started ? 50 : 0;
          const off2 = c2 - (pct/100)*c2;
          return (
            <div key={i} className="ring-mini" title={s.name}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r={r2} stroke="#f3f4f6" strokeWidth="5" fill="none"/>
                <circle cx="28" cy="28" r={r2} stroke={col} strokeWidth="5" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={c2}
                  strokeDashoffset={off2}
                  style={{transform:'rotate(-90deg)',transformOrigin:'center',transition:'stroke-dashoffset 0.4s'}}
                />
                {s.complete && (
                  <path d="M19 28 L25 34 L37 22" stroke={baseColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                )}
                {s.pending && !s.complete && (
                  <text x="28" y="33" textAnchor="middle" fontSize="12" fill="#f59e0b" fontWeight="700">?</text>
                )}
              </svg>
              <div className="ring-mini-label" style={{color:col}}>{s.short}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── STEP SHELL ──
function StepShell({ step, total, title, why, children, onBack, onNext, nextLabel='Save & Continue', saving }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="step-shell">
      <div className="step-progress-bar">
        <div className="step-progress-fill" style={{width:`${pct}%`}}></div>
      </div>
      <div className="step-header">
        <div className="step-count">Step {step} of {total}</div>
        <h2 className="step-title">{title}</h2>
        {why && <div className="step-why"><span className="why-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg></span>{why}</div>}
      </div>
      <div className="step-body">{children}</div>
      <div className="step-footer">
        {onBack && <button className="btn-back" onClick={onBack}>&#8592; Back</button>}
        <button className="btn-next" onClick={onNext} disabled={saving}>
          {saving ? 'Saving...' : nextLabel}
        </button>
      </div>
    </div>
  );
}

// ── FORM COMPONENTS ──
function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {hint && <div className="field-hint">{hint}</div>}
      {children}
    </div>
  );
}
function Input({ onChange, ...props }) { return <input className="f-input" onChange={e => onChange && onChange(e.target.value)} {...props}/>; }
function Select({ children, onChange, ...props }) { return <select className="f-select" onChange={e => onChange && onChange(e.target.value)} {...props}>{children}</select>; }
function Radio({ name, value, label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      style={{
        padding:'0.45rem 1.1rem',
        borderRadius:'6px',
        border: checked ? '2px solid #1a52a8' : '1.5px solid #e2e8f0',
        background: checked ? '#eff6ff' : '#fff',
        color: checked ? '#1a52a8' : '#4a5568',
        fontWeight: checked ? 700 : 500,
        cursor:'pointer',
        fontSize:'0.88rem',
        fontFamily:'inherit',
        transition:'all 0.15s'
      }}
    >
      {label}
    </button>
  );
}
function Checkbox({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        display:'flex',alignItems:'center',gap:'0.5rem',
        padding:'0.4rem 0.75rem',
        borderRadius:'6px',
        border: checked ? '2px solid #1a52a8' : '1.5px solid #e2e8f0',
        background: checked ? '#eff6ff' : '#fff',
        color: checked ? '#1a52a8' : '#4a5568',
        fontWeight: checked ? 600 : 400,
        cursor:'pointer',
        fontSize:'0.85rem',
        fontFamily:'inherit',
        textAlign:'left',
        transition:'all 0.15s',
        width:'100%'
      }}
    >
      <span style={{
        width:'15px',height:'15px',borderRadius:'3px',flexShrink:0,
        border: checked ? '2px solid #1a52a8' : '1.5px solid #cbd5e1',
        background: checked ? '#1a52a8' : '#fff',
        display:'flex',alignItems:'center',justifyContent:'center'
      }}>
        {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </span>
      {label}
    </button>
  );
}

// ── COMPLETED STEP WRAPPER ──
function CompletedStep({ title, summary, onEdit, onNext, onBack }) {
  return (
    <div className="step-shell">
      <div className="step-progress-bar"><div className="step-progress-fill" style={{width:'100%',background:'#10b981'}}></div></div>
      <div className="step-header" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'1rem'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.4rem'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
            <span style={{fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.15em',color:'#10b981'}}>Completed</span>
          </div>
          <h2 className="step-title" style={{marginBottom:'0'}}>{title}</h2>
        </div>
        <button type="button" onClick={onEdit} style={{flexShrink:0,marginTop:'0.25rem',background:'#f1f5f9',color:'#0b1222',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'0.5rem 1.1rem',fontSize:'0.85rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
          Edit
        </button>
      </div>
      <div className="step-body" style={{paddingTop:'1rem',paddingBottom:'1rem'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'0.75rem'}}>
          {summary.map((item,i) => item.value ? (
            <div key={i} style={{background:'#f8fafc',borderRadius:'8px',padding:'0.75rem'}}>
              <div style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#94a3b8',marginBottom:'0.25rem'}}>{item.label}</div>
              <div style={{fontSize:'0.875rem',color:'#0b1222',fontWeight:500}}>{item.value}</div>
            </div>
          ) : null)}
        </div>
      </div>
      <div className="step-footer">
        {onBack && <button className="btn-back" onClick={onBack}>&#8592; Back</button>}
        <button className="btn-next" onClick={onNext}>Continue &#8250;</button>
      </div>
    </div>
  );
}


function StepWelcome({ onNext, name }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg></div>
      <h1>Welcome, {name}.</h1>
      <p className="welcome-lead">You are about to build the most powerful security profile in the UK.</p>
      <div className="welcome-cards">
        <div className="wcard">
          <div className="wcard-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
          <div className="wcard-title">Takes about 15 minutes</div>
          <div className="wcard-desc">You only ever do this once. Every future application takes seconds.</div>
        </div>
        <div className="wcard">
          <div className="wcard-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
          <div className="wcard-title">Your data is secure</div>
          <div className="wcard-desc">Employers only see your profile when you apply. Nothing is shared without your consent.</div>
        </div>
        <div className="wcard">
          <div className="wcard-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
          <div className="wcard-title">Faster vetting</div>
          <div className="wcard-desc">A complete profile means employers can start BS7858 vetting immediately — no delays, no chasing.</div>
        </div>
      </div>
      <div className="welcome-honest">
        <strong>We know some sections are tedious.</strong> But here is the thing — once this is done, you never fill in another application form. Every employer on this platform sees your verified profile instantly. One profile. Every opportunity.
      </div>
      <button className="btn-next" style={{width:'100%',marginTop:'2rem'}} onClick={onNext}>
        Let's Build My Profile &#8250;
      </button>
    </div>
  );
}

// ── STEP 2: SIA LICENCES ──
function StepSIA({ data, onChange, onBack, onNext, isComplete }) {
  const [editing, setEditing] = React.useState(!isComplete);
  React.useEffect(() => { if (isComplete) setEditing(false); }, [isComplete]);
  React.useEffect(() => { if (isComplete) setEditing(false); }, [isComplete]);
  const normaliseLicence = (l) => ({
    type: l.type || l.licence_type || '',
    number: l.number || l.licence_number || '',
    expiry: l.expiry || l.expiry_date || '',
    expiryMonth: l.expiryMonth || (l.expiry_date ? l.expiry_date.split('-')[1] : l.expiry ? l.expiry.split('-')[1] : '') || '',
    expiryYear: l.expiryYear || (l.expiry_date ? l.expiry_date.split('-')[0] : l.expiry ? l.expiry.split('-')[0] : '') || '',
    verified: l.verified || false,
    id: l.id || null,
  });
  const [licences, setLicences] = useState(
    data.licences?.length ? data.licences.map(normaliseLicence) : [{ type:'', number:'', expiry:'', expiryMonth:'', expiryYear:'' }]
  );
  const addLicence = () => setLicences([...licences, { type:'', number:'', expiry:'', expiryMonth:'', expiryYear:'' }]);
  const updateLicence = (i, field, val) => {
    const updated = licences.map((l,idx) => idx===i ? {...l,[field]:val} : l);
    setLicences(updated);
  };
  const removeLicence = (i) => setLicences(licences.filter((_,idx) => idx!==i));
  const save = () => {
    const invalidLic = licences.find(l => l.number && l.number.replace(/\s/g,'').length !== 16);
    if (invalidLic) { alert('Please enter a valid 16-digit SIA licence number.'); return; }
    const mapped = licences.map(l => ({
      ...l,
      expiry: l.expiryYear && l.expiryMonth ? `${l.expiryYear}-${l.expiryMonth}-01` : l.expiry || ''
    }));
    onChange({ licences: mapped }); onNext();
  };
  const licenceTypes = ['Door Supervisor','Security Guard','CCTV Operator','Close Protection','Cash & Valuables in Transit','Key Holding','Non-Front Line'];

  if (isComplete && !editing) {
    return (
      <CompletedStep
        title="SIA Licence(s)"
        summary={licences.map((l,i) => ([
          { label: `Licence ${i+1} Type`, value: l.type || l.licence_type },
          { label: `Licence ${i+1} Status`, value: l.verified ? 'Verified' : 'Pending verification' },
          { label: `Licence ${i+1} Expiry`, value: l.expiry || l.expiry_date },
        ])).flat()}
        onEdit={() => setEditing(true)}
        onBack={onBack}
        onNext={onNext}
      />
    );
  }

  return (
    <StepShell step={2} total={11} title="SIA Licence(s)"
      why="Verifying your SIA licence is the first thing employers check. Once verified here, they can see you are licensed and legal — so they call you first."
      onBack={onBack} onNext={save}>
      {licences.map((lic, i) => (
        <div key={i} className="licence-block">
          {i > 0 && <div className="licence-block-header"><span>Additional Licence {i+1}</span><button className="btn-remove" onClick={()=>removeLicence(i)}>Remove</button></div>}
          <div className="field-row">
            <Field label="Licence Type">
              <Select value={lic.type} onChange={v=>updateLicence(i,"type",v)}>
                <option value="">Select type</option>
                {licenceTypes.map(t=><option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="SIA Licence Number" hint="Your 16-digit licence number">
              <Input type="text" placeholder="0000 0000 0000 0000" maxLength={19} value={lic.number}
                onChange={v=>updateLicence(i,"number",v)}/>
            </Field>
            <Field label="Expiry Date">
              <div className="field-row" style={{gap:'0.5rem',marginBottom:0}}>
                <Select value={lic.expiryMonth||''} onChange={v=>updateLicence(i,'expiryMonth',v)}>
                  <option value="">Month</option>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,mi)=><option key={mi} value={String(mi+1).padStart(2,'0')}>{m}</option>)}
                </Select>
                <Input type="number" placeholder="Year" min={new Date().getFullYear()} max={new Date().getFullYear()+10} value={lic.expiryYear||''} onChange={v=>updateLicence(i,'expiryYear',v)} style={{width:'90px'}}/>
              </div>
            </Field>
          </div>
          {lic.number && lic.number.replace(/\s/g,'').length !== 16 && (
            <div className="address-warning" style={{marginTop:'0.5rem'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
              SIA licence numbers are 16 digits — you have entered {lic.number.replace(/\s/g,'').length}. Please check and correct.
            </div>
          )}
          {lic.number && lic.number.replace(/\s/g,'').length === 16 && (
            <div className="pending-badge">Pending verification — our team will check this against the SIA register within 24 hours</div>
          )}
        </div>
      ))}
      {licences.length < 3 && (
        <button className="btn-add" onClick={addLicence}>+ Add Another Licence</button>
      )}
    </StepShell>
  );
}

// ── STEP 3: PERSONAL DETAILS ──
function StepPersonal({ data, onChange, onBack, onNext, isComplete }) {
  const [editing, setEditing] = React.useState(!isComplete);
  React.useEffect(() => { if (isComplete) setEditing(false); }, [isComplete]);
  const raw = data.personal;
  const existingMovedIn = raw?.move_in_date || raw?.movedIn || '';
  const [form, setForm] = useState({
    firstName: raw?.first_name || raw?.firstName || '',
    lastName: raw?.last_name || raw?.lastName || '',
    phone: raw?.phone || '',
    dobDay: raw?.date_of_birth ? raw.date_of_birth.split('-')[2] : raw?.dob ? raw.dob.split('-')[2] : '',
    dobMonth: raw?.date_of_birth ? raw.date_of_birth.split('-')[1] : raw?.dob ? raw.dob.split('-')[1] : '',
    dobYear: raw?.date_of_birth ? raw.date_of_birth.split('-')[0] : raw?.dob ? raw.dob.split('-')[0] : '',
    gender: raw?.gender || '',
    ni: raw?.ni_number || raw?.ni || '',
    address1: raw?.address_line1 || raw?.address1 || '',
    address2: raw?.address_line2 || raw?.address2 || '',
    town: raw?.city || raw?.town || '',
    county: raw?.county || '',
    postcode: raw?.postcode || '',
    movedIn: existingMovedIn,
    movedInMonth: existingMovedIn ? existingMovedIn.split('-')[1] : '',
    movedInYear: existingMovedIn ? existingMovedIn.split('-')[0] : '',
    currentAddr: 'yes',
    siaAddress: raw?.siaAddress || (raw?.sia_address_match === true ? 'yes' : raw?.sia_address_match === false ? 'no' : ''),
    dvlaAddress: raw?.dvlaAddress || (raw?.dvla_address_match === true ? 'yes' : raw?.dvla_address_match === false ? 'no' : ''),
    prevAddresses: raw?.prevAddresses || [],
  });

  const u = (f,v) => setForm(prev => ({...prev,[f]:v}));

  const addPrevAddress = () => setForm(prev => ({
    ...prev,
    prevAddresses: [...prev.prevAddresses, { line1:'', line2:'', town:'', county:'', postcode:'', from:'', to:'', gapExplanation:'' }]
  }));

  const updatePrevAddr = (i, f, v) => setForm(prev => {
    const arr = [...prev.prevAddresses];
    arr[i] = { ...arr[i], [f]: v };
    return { ...prev, prevAddresses: arr };
  });

  const removePrevAddr = (i) => setForm(prev => ({
    ...prev,
    prevAddresses: prev.prevAddresses.filter((_,idx) => idx !== i)
  }));

  // Calculate months at current address
  const movedInDate = form.movedInYear && form.movedInMonth ? `${form.movedInYear}-${form.movedInMonth}` : form.movedIn || '';
  const monthsAtCurrent = movedInDate
    ? Math.floor((new Date() - new Date(movedInDate + '-01')) / (1000 * 60 * 60 * 24 * 30.5))
    : 0;

  const needs5Year = monthsAtCurrent < 60 && movedInDate;

  // Gap detection — build timeline and find gaps
  const getGaps = () => {
    if (!movedInDate) return [];
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const periods = [];

    // Current address
    periods.push({
      start: new Date(movedInDate + '-01'),
      end: new Date(),
      label: 'Current address'
    });

    // Previous addresses — use fromYear/fromMonth and toYear/toMonth
    form.prevAddresses.forEach((addr, i) => {
      const from = addr.fromYear && addr.fromMonth ? `${addr.fromYear}-${addr.fromMonth}` : addr.from || '';
      const to = addr.toYear && addr.toMonth ? `${addr.toYear}-${addr.toMonth}` : addr.to || '';
      if (from && to) {
        periods.push({
          start: new Date(from + '-01'),
          end: new Date(to + '-01'),
          label: `Previous address ${i + 1} (${addr.line1 || 'no address entered'})`
        });
      }
    });

    // Sort by start date descending (most recent first)
    periods.sort((a, b) => b.start - a.start);

    const gaps = [];
    for (let i = 0; i < periods.length - 1; i++) {
      const current = periods[i];
      const next = periods[i + 1];
      // Gap exists if current period starts after next period ends (more than 35 days)
      const gapDays = Math.floor((current.start - next.end) / (1000 * 60 * 60 * 24));
      if (gapDays > 35) {
        const gapMonths = Math.round(gapDays / 30.5);
        gaps.push({
          from: next.end,
          to: current.start,
          days: gapDays,
          months: gapMonths,
          afterLabel: next.label,
          beforeLabel: current.label,
          index: i
        });
      }
    }

    // Check if history goes back 5 years
    if (periods.length > 0) {
      const earliest = periods[periods.length - 1];
      if (earliest.start > fiveYearsAgo) {
        const shortfallMonths = Math.round((earliest.start - fiveYearsAgo) / (1000 * 60 * 60 * 24 * 30.5));
        if (shortfallMonths > 1) {
          gaps.push({
            from: fiveYearsAgo,
            to: earliest.start,
            days: Math.floor((earliest.start - fiveYearsAgo) / (1000 * 60 * 60 * 24)),
            months: shortfallMonths,
            afterLabel: '5 years ago',
            beforeLabel: earliest.label,
            index: 99,
            shortfall: true
          });
        }
      }
    }

    return gaps;
  };

  const gaps = needs5Year ? getGaps() : [];
  const hasUnexplainedGaps = gaps.some(g => {
    if (g.shortfall) return true;
    const addr = form.prevAddresses[g.index];
    return !addr?.gapExplanation?.trim();
  });

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { month:'short', year:'numeric' }) : '—';

  const yearLabel = (months) => {
    const y = Math.floor(months/12), m = months%12;
    return y > 0 ? (y + ' yr' + (y>1?'s':'') + (m>0?' '+m+' mo':'')) : (months + ' month' + (months!==1?'s':''));
  };

  // Mandatory field validation
  const missingFields = [];
  if (!form.firstName?.trim()) missingFields.push('First name');
  if (!form.lastName?.trim()) missingFields.push('Last name');
  if (!form.phone?.trim()) missingFields.push('Phone number');
  if (!form.dobDay || !form.dobMonth || !form.dobYear) missingFields.push('Date of birth');
  if (!form.ni?.trim()) missingFields.push('National Insurance number');
  if (!form.address1?.trim()) missingFields.push('Address line 1');
  if (!form.town?.trim()) missingFields.push('Town / City');
  if (!form.postcode?.trim()) missingFields.push('Postcode');
  if (!movedInDate) missingFields.push('Month moved in');
  if (!form.siaAddress) missingFields.push('SIA licence address confirmation');

  const canSave = missingFields.length === 0 && !hasUnexplainedGaps;

  const save = () => {
    if (!canSave) return;
    onChange({ personal: form });
    onNext();
  };

  if (isComplete && !editing) {
    const d = data.personal || {};
    return (
      <CompletedStep
        title="Personal Details"
        summary={[
          { label:'Name', value: [d.first_name, d.last_name].filter(Boolean).join(' ') },
          { label:'Phone', value: d.phone || '' },
          { label:'Date of Birth', value: d.date_of_birth || '' },
          { label:'NI Number', value: d.ni_number ? '••••••••' : '' },
          { label:'Address', value: [d.address_line1, d.city, d.postcode].filter(Boolean).join(', ') },
          { label:'SIA Address Match', value: d.sia_address_match === true ? 'Yes' : d.sia_address_match === false ? 'No — update needed' : '' },
        ]}
        onEdit={() => setEditing(true)}
        onBack={onBack}
        onNext={onNext}
      />
    );
  }

  return (
    <StepShell step={3} total={11} title="Personal Details"
      why="Employers need to be able to contact you quickly. A complete personal profile also means vetting can start without any back-and-forth."
      onBack={onBack} onNext={save} nextLabel={!canSave ? 'Complete all required fields' : 'Save & Continue'}>

      {missingFields.length > 0 && (
        <div style={{background:'#fef9c3',border:'1px solid #fde047',borderRadius:'8px',padding:'0.875rem 1rem',marginBottom:'1.25rem'}}>
          <div style={{fontWeight:700,fontSize:'0.82rem',color:'#854d0e',marginBottom:'0.4rem'}}>Required fields missing:</div>
          <div style={{fontSize:'0.8rem',color:'#854d0e'}}>{missingFields.join(' · ')}</div>
        </div>
      )}

      <div className="field-row">
        <Field label="First Name *"><Input type="text" placeholder="John" value={form.firstName} onChange={v=>u('firstName',v)}/></Field>
        <Field label="Last Name *"><Input type="text" placeholder="Smith" value={form.lastName} onChange={v=>u('lastName',v)}/></Field>
      </div>
      <div className="field-row">
        <Field label="Phone Number *"><Input type="tel" placeholder="07700 000000" value={form.phone} onChange={v=>u('phone',v)}/></Field>
        <Field label="Date of Birth *">
          <div className="field-row" style={{gap:'0.5rem',marginBottom:0}}>
            <Select value={form.dobDay} onChange={v=>u('dobDay',v)}>
              <option value="">Day</option>
              {Array.from({length:31},(_,i)=><option key={i+1} value={String(i+1).padStart(2,'0')}>{i+1}</option>)}
            </Select>
            <Select value={form.dobMonth} onChange={v=>u('dobMonth',v)}>
              <option value="">Month</option>
              {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
            </Select>
            <Input type="number" placeholder="Year e.g. 1990" min="1940" max={new Date().getFullYear()-16} value={form.dobYear} onChange={v=>u('dobYear',v)} style={{width:'130px'}}/>
          </div>
        </Field>
      </div>
      <div className="field-row">
        <Field label="National Insurance Number *"><Input type="text" placeholder="AB 12 34 56 C" value={form.ni} onChange={v=>u('ni',v)}/></Field>
        <Field label="Gender" hint="Optional — equal opportunities monitoring only">
          <Select value={form.gender} onChange={v=>u('gender',v)}>
            <option value="">Prefer not to say</option>
            <option>Male</option><option>Female</option><option>Non-binary</option><option>Other</option>
          </Select>
        </Field>
      </div>

      <div className="divider"></div>
      <div style={{fontWeight:700,fontSize:'1rem',color:'#0b1222',marginBottom:'0.25rem'}}>Current Address</div>
      <div style={{fontSize:'0.82rem',color:'#64748b',marginBottom:'1rem'}}>We need your current address to verify your SIA licence and begin BS7858 checks.</div>

      <Field label="Address Line 1 *"><Input type="text" placeholder="House number and street name" value={form.address1} onChange={v=>u('address1',v)}/></Field>
      <Field label="Address Line 2"><Input type="text" placeholder="Optional" value={form.address2} onChange={v=>u('address2',v)}/></Field>
      <div className="field-row">
        <Field label="Town / City *"><Input type="text" placeholder="London" value={form.town} onChange={v=>u('town',v)}/></Field>
        <Field label="County"><Input type="text" placeholder="Greater London" value={form.county} onChange={v=>u('county',v)}/></Field>
        <Field label="Postcode *"><Input type="text" placeholder="SW1A 1AA" value={form.postcode} onChange={v=>u('postcode',v)}/></Field>
      </div>

      <Field label="Month moved in *">
        <div className="field-row" style={{gap:'0.5rem',marginBottom:0}}>
          <Select value={form.movedInMonth} onChange={v=>{const y=form.movedInYear; setForm(prev=>({...prev,movedInMonth:v,movedIn:y?y+'-'+v:''}));}}>
            <option value="">Month</option>
            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
          </Select>
          <Input type="number" placeholder="Year e.g. 2020" min="2000" max={new Date().getFullYear()} value={form.movedInYear} onChange={v=>{const m=form.movedInMonth; setForm(prev=>({...prev,movedInYear:v,movedIn:m?v+'-'+m:''}));}} style={{width:'130px'}}/>
        </div>
      </Field>

      {/* SIA question directly under address */}
      <Field label="Is your SIA licence registered to this address?">
        <div className="radio-row">
          <Radio name="siaAddress" value="yes" label="Yes" checked={form.siaAddress==='yes'} onChange={v=>u('siaAddress',v)}/>
          <Radio name="siaAddress" value="no" label="No" checked={form.siaAddress==='no'} onChange={v=>u('siaAddress',v)}/>
          <Radio name="siaAddress" value="na" label="Not applicable" checked={form.siaAddress==='na'} onChange={v=>u('siaAddress',v)}/>
        </div>
      </Field>
      {form.siaAddress === 'no' && (
        <div className="address-warning" style={{marginTop:'0.5rem'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
          <span>Your SIA licence address should match your current address. Update it through your <a href="https://services.sia.homeoffice.gov.uk/" target="_blank" rel="noopener noreferrer" className="inline-link">SIA online account</a>.</span>
        </div>
      )}

      {/* Save address progress button */}
      <div style={{marginTop:'1.25rem',marginBottom:'0.5rem'}}>
        <button type="button" onClick={()=>onChange({personal:form})} style={{
          background:'#f0f4ff',color:'#1a52a8',border:'1px solid #bfdbfe',
          borderRadius:'8px',padding:'0.6rem 1.25rem',fontSize:'0.85rem',
          fontWeight:600,cursor:'pointer',fontFamily:'inherit'
        }}>
          Save progress
        </button>
        <span style={{fontSize:'0.78rem',color:'#94a3b8',marginLeft:'0.75rem'}}>Your information is saved — you can continue later.</span>
      </div>

      {/* How long at current address */}
      {form.movedIn && (() => {
        const y = Math.floor(monthsAtCurrent/12), m = monthsAtCurrent%12;
        const label = y > 0 ? (y+' year'+(y>1?'s':'')+(m>0?' '+m+' month'+(m>1?'s':''):'')) : (monthsAtCurrent+' month'+(monthsAtCurrent!==1?'s':''));
        return monthsAtCurrent < 60 ? (
          <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:'10px',padding:'1rem 1.25rem',marginTop:'1rem'}}>
            <div style={{fontWeight:700,fontSize:'0.88rem',color:'#c2410c',marginBottom:'0.35rem'}}>
              You have lived here for <strong>{label}</strong> — address history required
            </div>
            <div style={{fontSize:'0.82rem',color:'#9a3412',lineHeight:'1.5'}}>
              BS7858 requires a full 5-year address history with no gaps. You will need to complete the <strong>Address History step</strong> later in this profile — have your previous addresses and exact move-in/move-out dates ready.
            </div>
          </div>
        ) : (
          <div className="address-ok" style={{marginTop:'1rem'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
            You have lived here for <strong>{label}</strong> — your current address covers your full 5-year BS7858 requirement.
          </div>
        );
      })()}

      {/* PREVIOUS ADDRESSES */}
      {needs5Year && (
        <div style={{marginTop:'1.5rem'}}>
          <div style={{fontWeight:700,fontSize:'1rem',color:'#0b1222',marginBottom:'0.25rem'}}>Previous Addresses</div>
          <div style={{fontSize:'0.82rem',color:'#64748b',marginBottom:'1.25rem'}}>
            Add every address going back 5 years. Dates must be exact — from the month you moved in to the month you moved out. Every month must be accounted for.
          </div>

          {form.prevAddresses.map((addr, i) => (
            <div key={i} className="history-block">
              <div className="history-block-header">
                <span>Previous Address {i+1}</span>
                <button className="btn-remove" onClick={()=>removePrevAddr(i)}>Remove</button>
              </div>
              <Field label="Address Line 1"><Input type="text" placeholder="House number and street" value={addr.line1} onChange={v=>updatePrevAddr(i,'line1',v)}/></Field>
              <Field label="Address Line 2"><Input type="text" placeholder="Optional" value={addr.line2} onChange={v=>updatePrevAddr(i,'line2',v)}/></Field>
              <div className="field-row">
                <Field label="Town / City"><Input type="text" value={addr.town} onChange={v=>updatePrevAddr(i,'town',v)}/></Field>
                <Field label="County"><Input type="text" value={addr.county} onChange={v=>updatePrevAddr(i,'county',v)}/></Field>
                <Field label="Postcode"><Input type="text" value={addr.postcode} onChange={v=>updatePrevAddr(i,'postcode',v)}/></Field>
              </div>
              <div className="field-row">
                <Field label="Month Moved In">
                  <div className="field-row" style={{gap:'0.5rem',marginBottom:0}}>
                    <Select value={addr.fromMonth||''} onChange={v=>updatePrevAddr(i,'fromMonth',v)}>
                      <option value="">Month</option>
                      {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,mi)=><option key={mi} value={String(mi+1).padStart(2,'0')}>{m}</option>)}
                    </Select>
                    <Input type="number" placeholder="Year" min="2000" max={new Date().getFullYear()} value={addr.fromYear||''} onChange={v=>updatePrevAddr(i,'fromYear',v)} style={{width:'100px'}}/>
                  </div>
                </Field>
                <Field label="Month Moved Out">
                  <div className="field-row" style={{gap:'0.5rem',marginBottom:0}}>
                    <Select value={addr.toMonth||''} onChange={v=>updatePrevAddr(i,'toMonth',v)}>
                      <option value="">Month</option>
                      {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,mi)=><option key={mi} value={String(mi+1).padStart(2,'0')}>{m}</option>)}
                    </Select>
                    <Input type="number" placeholder="Year" min="2000" max={new Date().getFullYear()} value={addr.toYear||''} onChange={v=>updatePrevAddr(i,'toYear',v)} style={{width:'100px'}}/>
                  </div>
                </Field>
              </div>
            </div>
          ))}

          <button className="btn-add" onClick={addPrevAddress}>+ Add Previous Address</button>

          {/* GAP DETECTION */}
          {gaps.length > 0 && (
            <div style={{marginTop:'1.5rem'}}>
              {gaps.map((gap, gi) => (
                <div key={gi} style={{background:'#fef2f2',border:'2px solid #dc2626',borderRadius:'10px',padding:'1.1rem 1.25rem',marginBottom:'1rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
                    <strong style={{color:'#dc2626',fontSize:'0.9rem'}}>
                      {gap.shortfall ? `Address history does not go back far enough — ${gap.months} month${gap.months!==1?'s':''} missing` : `Gap detected — ${gap.months} month${gap.months!==1?'s':''} unaccounted for`}
                    </strong>
                  </div>
                  <div style={{fontSize:'0.82rem',color:'#7f1d1d',marginBottom:'0.75rem'}}>
                    {gap.shortfall
                      ? `Your address history needs to go back to ${fmtDate(gap.from)}. Add more previous addresses above.`
                      : `There is a ${gap.months}-month gap between ${fmtDate(gap.from)} and ${fmtDate(gap.to)}. This is a red flag in BS7858 vetting — it must be explained.`
                    }
                  </div>
                  {!gap.shortfall && (
                    <>
                      <div style={{fontSize:'0.8rem',fontWeight:600,color:'#7f1d1d',marginBottom:'0.4rem'}}>
                        Where were you during this period? Supporting evidence may be required at interview.
                      </div>
                      <textarea
                        className="f-textarea"
                        rows={3}
                        placeholder="e.g. I was living abroad in Nigeria from Jan 2022 to Jun 2022 — I can provide passport stamps and flight records as evidence."
                        value={form.prevAddresses[gap.index]?.gapExplanation || ''}
                        onChange={e=>updatePrevAddr(gap.index,'gapExplanation',e.target.value)}
                        style={{borderColor:'#dc2626'}}
                      />
                      {!form.prevAddresses[gap.index]?.gapExplanation?.trim() && (
                        <div style={{fontSize:'0.75rem',color:'#dc2626',marginTop:'0.3rem',fontWeight:600}}>
                          This explanation is required before you can continue.
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {form.prevAddresses.length > 0 && gaps.length === 0 && (
            <div className="address-ok" style={{marginTop:'1rem'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
              No gaps detected — your address history is complete.
            </div>
          )}
        </div>
      )}

      <div className="divider"></div>
      <div className="prepare-notice">
        <div className="prepare-notice-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
          Now is a good time to prepare your proof of address
        </div>
        <p>Later in your profile you will need to upload proof that you live at this address. Start gathering these now so they are ready when you need them — and make sure you have them with you at any interview.</p>
        <div className="prepare-docs">
          <div className="prepare-doc"><span className="pd-check">✓</span> Bank statement — no older than 3 months</div>
          <div className="prepare-doc"><span className="pd-check">✓</span> Utility bill (gas, electric, water) — no older than 3 months</div>
          <div className="prepare-doc"><span className="pd-check">✓</span> Council tax letter — current year</div>
          <div className="prepare-doc"><span className="pd-check">✓</span> HMRC correspondence — dated within 12 months</div>
        </div>
        <p className="prepare-note">Documents must show your full name and current address. Screenshots are not accepted — originals or clear photos of originals only.</p>
      </div>
    </StepShell>
  );
}
// ── STEP 4: DRIVING LICENCE & TRANSPORT ──
function StepDriving({ data, onChange, onBack, onNext, isComplete }) {
  const [editing, setEditing] = React.useState(!isComplete);
  React.useEffect(() => { if (isComplete) setEditing(false); }, [isComplete]);
  const raw = data.driving || {};
  const [form, setForm] = useState({
    hasLicence: raw.hasLicence || (raw.has_driving_licence ? 'yes' : raw.has_driving_licence === false ? 'no' : ''),
    licenceType: (raw.licenceType || raw.licence_type || '') === 'Full' ? 'Full UK' : (raw.licenceType || raw.licence_type || ''),
    licenceNumber: raw.licenceNumber || '',
    yearsHeld: raw.yearsHeld || '',
    points: raw.points || '',
    endorsements: raw.endorsements || raw.endorsement_codes || [],
    hasBan: raw.hasBan || (raw.has_ban_history ? 'yes' : ''),
    banDate: raw.banDate || '',
    banDuration: raw.banDuration || '',
    banReason: raw.banReason || '',
    hasTransport: raw.hasTransport || (raw.has_own_vehicle ? 'yes' : raw.has_own_vehicle === false ? 'no' : ''),
    vehicleType: raw.vehicleType || '',
    taxed: raw.taxed || (raw.vehicle_taxed ? 'yes' : ''),
    moted: raw.moted || (raw.vehicle_mot_valid ? 'yes' : ''),
    insured: raw.insured || (raw.vehicle_insured ? 'yes' : ''),
    travelRadius: raw.travelRadius || (raw.travel_radius_miles ? String(raw.travel_radius_miles) : ''),
    dvlaAddress: raw.dvlaAddress || '',
  });
  const u = (f,v) => setForm({...form,[f]:v});
  const toggleEndorsement = (code) => {
    const list = form.endorsements.includes(code) ? form.endorsements.filter(c=>c!==code) : [...form.endorsements,code];
    setForm({...form, endorsements:list});
  };
  const endorsementCodes = ['SP30','SP50','IN10','CU80','CD10','CD30','DD40','DR10','DR20','MS10','TS10','TT99'];
  const save = () => { onChange({ driving: form }); onNext(); };

  if (isComplete && !editing) {
    return (
      <CompletedStep
        title="Driving & Transport"
        summary={(() => { const d=data.driving||{}; return [{label:"Driving Licence",value:d.hasLicence=="yes"||d.has_driving_licence?"Yes":"No"},{label:"Licence Type",value:d.licenceType||d.licence_type||""},{label:"Own Transport",value:d.hasTransport=="yes"||d.has_own_vehicle?"Yes":"No"},{label:"Travel Radius",value:d.travelRadius||d.travel_radius_miles?d.travelRadius||d.travel_radius_miles+" miles":""},{label:"DVLA Address",value:d.dvlaAddress=="yes"?"Matches":d.dvlaAddress=="no"?"Mismatch":""}]; })()}
        onEdit={() => setEditing(true)}
        onBack={onBack}
        onNext={onNext}
      />
    );
  }

  return (
    <StepShell step={4} total={11} title="Driving Licence & Transport"
      why="Having your own transport and a clean licence opens up significantly more roles — including higher-paying mobile patrol and response positions that candidates without transport cannot access."
      onBack={onBack} onNext={save}>
      <Field label="Do you hold a driving licence?">
        <div className="radio-row">
          <Radio name="hasLicence" value="yes" label="Yes" checked={form.hasLicence==='yes'} onChange={v=>u('hasLicence',v)}/>
          <Radio name="hasLicence" value="no" label="No" checked={form.hasLicence==='no'} onChange={v=>u('hasLicence',v)}/>
        </div>
      </Field>
      {form.hasLicence === 'yes' && <>
        <div className="field-row">
          <Field label="Licence Type">
            <Select value={form.licenceType} onChange={v=>u('licenceType',v)}>
              <option value="">Select</option><option>Full UK</option><option>Provisional</option><option>EU</option><option>International</option><option>None</option>
            </Select>
          </Field>
          <Field label="Licence Number"><Input type="text" placeholder="SMITH701234AB9CD" value={form.licenceNumber} onChange={v=>u('licenceNumber',v)}/></Field>
          <Field label="Years Held">
            <Select value={form.yearsHeld} onChange={v=>u('yearsHeld',v)}>
              <option value="">Select</option>
              {['Less than 1','1–2','3–5','6–10','10+'].map(y=><option key={y}>{y}</option>)}
            </Select>
          </Field>
        </div>
        <div className="field-row">
          <Field label="Penalty Points">
            <Select value={form.points} onChange={v=>u('points',v)}>
              <option value="">Select</option>
              {['0','1–3','4–6','7–9','9+'].map(p=><option key={p}>{p}</option>)}
            </Select>
          </Field>
        </div>
        {form.points !== '0' && form.points !== '' && <>
          <Field label="Endorsement Codes" hint="Select all that apply">
            <div className="check-grid">
              {endorsementCodes.map(c=><Checkbox key={c} label={c} checked={form.endorsements.includes(c)} onChange={()=>toggleEndorsement(c)}/>)}
            </div>
          </Field>
        </>}
        <Field label="Previous driving bans?">
          <div className="radio-row">
            <Radio name="hasBan" value="yes" label="Yes" checked={form.hasBan==='yes'} onChange={v=>u('hasBan',v)}/>
            <Radio name="hasBan" value="no" label="No" checked={form.hasBan==='no'} onChange={v=>u('hasBan',v)}/>
          </div>
        </Field>
        {form.hasBan === 'yes' && <div className="field-row">
          <Field label="Date of ban"><div className="field-row" style={{gap:"0.5rem",marginBottom:0}}><Select value={form.banDateMonth||""} onChange={v=>u("banDateMonth",v)}><option value="">Month</option>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,mi)=><option key={mi} value={String(mi+1).padStart(2,"0")}>{m}</option>)}</Select><Input type="number" placeholder="Year" min="2010" max={new Date().getFullYear()} value={form.banDateYear||""} onChange={v=>u("banDateYear",v)} style={{width:"90px"}}/></div></Field>
          <Field label="Duration"><Input type="text" placeholder="e.g. 12 months" value={form.banDuration} onChange={v=>u('banDuration',v)}/></Field>
          <Field label="Reason"><Input type="text" placeholder="e.g. SP30" value={form.banReason} onChange={v=>u('banReason',v)}/></Field>
        </div>}
      </>}
      <div className="divider"></div>
      <Field label="Do you have your own transport?">
        <div className="radio-row">
          <Radio name="hasTransport" value="yes" label="Yes" checked={form.hasTransport==='yes'} onChange={v=>u('hasTransport',v)}/>
          <Radio name="hasTransport" value="no" label="No" checked={form.hasTransport==='no'} onChange={v=>u('hasTransport',v)}/>
        </div>
      </Field>
      {form.hasTransport === 'yes' && <>
        <div className="field-row">
          <Field label="Vehicle Type">
            <Select value={form.vehicleType} onChange={v=>u('vehicleType',v)}>
              <option value="">Select</option>
              {['Car','Motorcycle','Van','Other'].map(v=><option key={v}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Currently Taxed?">
            <div className="radio-row"><Radio name="taxed" value="yes" label="Yes" checked={form.taxed==='yes'} onChange={v=>u('taxed',v)}/><Radio name="taxed" value="no" label="No" checked={form.taxed==='no'} onChange={v=>u('taxed',v)}/></div>
          </Field>
          <Field label="Current MOT?">
            <div className="radio-row"><Radio name="moted" value="yes" label="Yes" checked={form.moted==='yes'} onChange={v=>u('moted',v)}/><Radio name="moted" value="no" label="No" checked={form.moted==='no'} onChange={v=>u('moted',v)}/></div>
          </Field>
        </div>
        <div className="field-row">
          <Field label="Insured for business use?">
            <div className="radio-row"><Radio name="insured" value="yes" label="Yes" checked={form.insured==='yes'} onChange={v=>u('insured',v)}/><Radio name="insured" value="no" label="No" checked={form.insured==='no'} onChange={v=>u('insured',v)}/></div>
          </Field>
          <Field label="Willing to travel">
            <Select value={form.travelRadius} onChange={v=>u('travelRadius',v)}>
              <option value="">Select radius</option>
              {[{l:'Up to 10 miles',v:'10'},{l:'Up to 25 miles',v:'25'},{l:'Up to 50 miles',v:'50'},{l:'Up to 100 miles',v:'100'},{l:'Nationwide',v:'999'}].map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
            </Select>
          </Field>
        </div>
      </>}

      <div className="divider"></div>
      <Field label="Is your driving licence registered to your current address?" hint="If you hold a driving licence">
        <div className="radio-row">
          <Radio name="dvlaAddress" value="yes" label="Yes" checked={form.dvlaAddress==='yes'} onChange={v=>u('dvlaAddress',v)}/>
          <Radio name="dvlaAddress" value="no" label="No" checked={form.dvlaAddress==='no'} onChange={v=>u('dvlaAddress',v)}/>
          <Radio name="dvlaAddress" value="na" label="No driving licence" checked={form.dvlaAddress==='na'} onChange={v=>u('dvlaAddress',v)}/>
        </div>
      </Field>
      {form.dvlaAddress === 'no' && (
        <div className="address-warning" style={{marginTop:'0.5rem'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
          <span>Your driving licence must show your current address by law — £1,000 DVLA fine if not updated within 3 months of moving.{' '}
            <a href="https://www.gov.uk/change-address-driving-licence" target="_blank" rel="noopener noreferrer" className="inline-link">Update on GOV.UK — free, takes 5 minutes</a>
          </span>
        </div>
      )}
    </StepShell>
  );
}

// ── STEP 5: PREFERRED SECTORS & AVAILABILITY ──
function StepSectors({ data, onChange, onBack, onNext, isComplete }) {
  const [editing, setEditing] = React.useState(!isComplete);
  React.useEffect(() => { if (isComplete) setEditing(false); }, [isComplete]);
  const raw = data.sectors;
  const [form, setForm] = useState({
    sectors: Array.isArray(raw?.sectors) ? raw.sectors : [],
    availability: Array.isArray(raw?.availability) ? raw.availability : [],
    availabilityAll: false,
    shiftType: Array.isArray(raw?.shiftType) ? raw.shiftType : [],
    employmentType: raw?.employmentType || '',
    roleType: raw?.roleType || '',
  });
  const allSectors = ['Shopping Centres / Retail','Distribution / Logistics / Warehousing','Construction Sites','Corporate / Commercial','Nightlife / Licensed Premises','Events / Festivals','Close Protection / Private','Transport Hubs (airports, stations)','Healthcare / Hospital','Education','Government / MOD','Residential / Concierge','Cash & Valuables in Transit','Control Room / CCTV','BID / Town Centre Rangers'];
  const toggleSector = (s) => {
    const list = form.sectors.includes(s) ? form.sectors.filter(x=>x!==s) : [...form.sectors,s];
    setForm({...form,sectors:list});
  };
  const toggleShift = (s) => {
    const list = form.shiftType.includes(s) ? form.shiftType.filter(x=>x!==s) : [...form.shiftType,s];
    setForm({...form,shiftType:list});
  };
  const save = () => { onChange({ sectors: form }); onNext(); };

  if (isComplete && !editing) {
    return (
      <CompletedStep
        title="Sectors & Availability"
        summary={(() => { const d=data.sectors||{}; return [{label:"Sectors",value:(d.sectors||[]).slice(0,3).join(", ")||"None selected"},{label:"Employment Type",value:d.employmentType||""},{label:"Availability",value:Array.isArray(d.availability)?d.availability.join(", "):d.preferred_shift||""}]; })()}
        onEdit={() => setEditing(true)}
        onBack={onBack}
        onNext={onNext}
      />
    );
  }

  return (
    <StepShell step={5} total={11} title="Preferred Sectors & Availability"
      why="The more specific you are, the better the roles we match you with — and the less time you waste on applications that are not right for you."
      onBack={onBack} onNext={save}>
      <Field label="Preferred Sectors" hint="Select all that apply. More sectors = more opportunities.">
        <div className="check-grid-2">
          {allSectors.map(s=><Checkbox key={s} label={s} checked={form.sectors.includes(s)} onChange={()=>toggleSector(s)}/>)}
          <Checkbox label="Any / All Sectors" checked={form.sectors.length===allSectors.length} onChange={()=>setForm({...form,sectors:form.sectors.length===allSectors.length?[]:allSectors})}/>
        </div>
      </Field>
      <div className="divider"></div>
      <Field label="What type of role are you looking for?">
        <Select value={form.roleType} onChange={v=>setForm({...form,roleType:v})}>
          <option value="">Select role type</option>
          <option>Operational — Door Supervisor / Manned Guarding</option>
          <option>Operational — CCTV / Control Room</option>
          <option>Operational — Close Protection</option>
          <option>Operational — Mobile Patrol / Key Holding</option>
          <option>Operational — Retail Security</option>
          <option>Operational — Events Security</option>
          <option>Supervisory — Team Leader / Supervisor</option>
          <option>Management — Security Manager</option>
          <option>Management — Operations Manager</option>
          <option>Management — Contract Manager</option>
          <option>Training — SIA Trainer / Assessor</option>
          <option>Consultancy / Risk Management</option>
          <option>Any / Open to opportunities</option>
        </Select>
      </Field>

      <Field label="Employment Type">
        <div className="radio-row">
          {['Full Time','Part Time','Either'].map(t=><Radio key={t} name="employmentType" value={t} label={t} checked={form.employmentType===t} onChange={v=>setForm({...form,employmentType:v})}/>)}
        </div>
      </Field>
      <Field label="Prepared to work" hint="Select all that apply">
        <div className="check-grid">
          {['Days','Nights','Weekends','Bank Holidays'].map(t=>(
            <Checkbox key={t} label={t}
              checked={(form.availability||[]).includes(t)}
              onChange={()=>{
                const list = (form.availability||[]).includes(t)
                  ? (form.availability||[]).filter(x=>x!==t)
                  : [...(form.availability||[]),t];
                const isAll = ['Days','Nights','Weekends','Bank Holidays'].every(x=>list.includes(x));
                setForm({...form, availability: list, availabilityAll: isAll});
              }}
            />
          ))}
          <Checkbox label="All of the above"
            checked={form.availabilityAll||false}
            onChange={()=>{
              const all = ['Days','Nights','Weekends','Bank Holidays'];
              const willCheck = !form.availabilityAll;
              setForm({...form, availability: willCheck ? all : [], availabilityAll: willCheck});
            }}
          />
        </div>
      </Field>
      <Field label="Preferred Shift Length" hint="Select all that apply">
        <div className="radio-row">
          {['8 hour','10 hour','12 hour','Any'].map(s=><Checkbox key={s} label={s} checked={form.shiftType.includes(s)} onChange={()=>toggleShift(s)}/>)}
        </div>
      </Field>
    </StepShell>
  );
}

// ── STEP 6: QUALIFICATIONS & FIRST AID ──
function StepQualifications({ data, onChange, onBack, onNext, isComplete }) {
  const [editing, setEditing] = React.useState(!isComplete);
  React.useEffect(() => { if (isComplete) setEditing(false); }, [isComplete]);
  const raw = data.qualifications || {};
  const [form, setForm] = useState({
    hasFirstAid: raw.hasFirstAid || (raw.has_efaw || raw.has_faw ? 'yes' : raw.frec_level && raw.frec_level !== 'None' ? 'yes' : ''),
    certType: raw.certType || raw.frec_level || '',
    issuingBody: raw.issuingBody || '',
    certNumber: raw.certNumber || '',
    dateAchieved: raw.dateAchieved || '',
    expiry: raw.expiry || raw.first_aid_expiry || '',
    hasUniform: raw.hasUniform || '',
    hasPPE: raw.hasPPE || '',
    languages: raw.languages || [],
    isSIATrainer: raw.isSIATrainer || (raw.is_sia_trainer ? 'yes' : ''),
    trainerDetails: raw.trainerDetails || '',
    hasClearance: raw.hasClearance || (raw.security_clearance && raw.security_clearance !== 'None' ? 'yes' : ''),
    clearanceLevel: raw.clearanceLevel || raw.security_clearance || '',
    clearanceActive: raw.clearanceActive || '',
  });
  const u = (f,v) => setForm({...form,[f]:v});
  const allLangs = ['Welsh','French','Spanish','Portuguese','Polish','Romanian','Arabic','Urdu','Hindi','Punjabi','Somali','Other'];
  const toggleLang = (l) => {
    const list = form.languages.includes(l) ? form.languages.filter(x=>x!==l) : [...form.languages,l];
    setForm({...form,languages:list});
  };
  const save = () => { onChange({ qualifications: form }); onNext(); };

  if (isComplete && !editing) {
    return (
      <CompletedStep
        title="Qualifications"
        summary={(() => { const d=data.qualifications||{}; return [{label:"First Aid",value:d.has_efaw||d.has_faw||d.hasFirstAid=="yes"?"Yes":"No"},{label:"SIA Trainer",value:d.is_sia_trainer||d.isSIATrainer=="yes"?"Yes":"No"},{label:"Security Clearance",value:d.security_clearance||d.clearanceLevel||"None"}]; })()}
        onEdit={() => setEditing(true)}
        onBack={onBack}
        onNext={onNext}
      />
    );
  }

  return (
    <StepShell step={6} total={11} title="Qualifications & Capabilities"
      why="Additional qualifications like First Aid can make you the standout candidate — especially for roles where a medical response capability is valued."
      onBack={onBack} onNext={save}>
      <Field label="Do you hold a First Aid certificate?">
        <div className="radio-row">
          <Radio name="hasFirstAid" value="yes" label="Yes" checked={form.hasFirstAid==='yes'} onChange={v=>u('hasFirstAid',v)}/>
          <Radio name="hasFirstAid" value="no" label="No" checked={form.hasFirstAid==='no'} onChange={v=>u('hasFirstAid',v)}/>
        </div>
      </Field>
      {form.hasFirstAid === 'yes' && <>
        <div className="field-row">
          <Field label="Certificate Type">
            <Select value={form.certType} onChange={v=>u('certType',v)}>
              <option value="">Select</option>
              {['FREC Level 3','FREC Level 4','Emergency First Aid at Work (EFAW)','First Aid at Work (FAW)','BTEC First Aid','Other'].map(t=><option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Issuing Body"><Input type="text" placeholder="e.g. Qualsafe, Highfield" value={form.issuingBody} onChange={v=>u('issuingBody',v)}/></Field>
        </div>
        <div className="field-row">
          <Field label="Certificate Number"><Input type="text" value={form.certNumber} onChange={v=>u('certNumber',v)}/></Field>
          <Field label="Date Achieved"><div className="field-row" style={{gap:"0.5rem",marginBottom:0}}><Select value={form.dateAchievedMonth||""} onChange={v=>u("dateAchievedMonth",v)}><option value="">Month</option>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,mi)=><option key={mi} value={String(mi+1).padStart(2,"0")}>{m}</option>)}</Select><Input type="number" placeholder="Year" min="2000" max={new Date().getFullYear()} value={form.dateAchievedYear||""} onChange={v=>u("dateAchievedYear",v)} style={{width:"90px"}}/></div></Field>
          <Field label="Expiry Date"><div className="field-row" style={{gap:"0.5rem",marginBottom:0}}><Select value={form.expiryMonth||""} onChange={v=>u("expiryMonth",v)}><option value="">Month</option>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,mi)=><option key={mi} value={String(mi+1).padStart(2,"0")}>{m}</option>)}</Select><Input type="number" placeholder="Year" min={new Date().getFullYear()} max={new Date().getFullYear()+10} value={form.expiryYear||""} onChange={v=>u("expiryYear",v)} style={{width:"90px"}}/></div></Field>
        </div>
      </>}
      <div className="divider"></div>
      <div className="field-row">
        <Field label="Own uniform?">
          <div className="radio-row"><Radio name="hasUniform" value="yes" label="Yes" checked={form.hasUniform==='yes'} onChange={v=>u('hasUniform',v)}/><Radio name="hasUniform" value="no" label="No" checked={form.hasUniform==='no'} onChange={v=>u('hasUniform',v)}/></div>
        </Field>
        <Field label="Own PPE? (boots, torch, gloves)">
          <div className="radio-row"><Radio name="hasPPE" value="yes" label="Yes" checked={form.hasPPE==='yes'} onChange={v=>u('hasPPE',v)}/><Radio name="hasPPE" value="no" label="No" checked={form.hasPPE==='no'} onChange={v=>u('hasPPE',v)}/></div>
        </Field>
      </div>
      <div className="divider"></div>
      <Field label="Languages spoken (besides English)" hint="Select all that apply">
        <div className="check-grid">
          {allLangs.map(l=><Checkbox key={l} label={l} checked={form.languages.includes(l)} onChange={()=>toggleLang(l)}/>)}
        </div>
      </Field>
      <div className="divider"></div>
      <Field label="Are you a qualified SIA trainer or assessor?">
        <div className="radio-row"><Radio name="isSIATrainer" value="yes" label="Yes" checked={form.isSIATrainer==='yes'} onChange={v=>u('isSIATrainer',v)}/><Radio name="isSIATrainer" value="no" label="No" checked={form.isSIATrainer==='no'} onChange={v=>u('isSIATrainer',v)}/></div>
      </Field>
      {form.isSIATrainer==='yes' && <Field label="Trainer qualification details"><Input type="text" placeholder="Qualification, awarding body and year" value={form.trainerDetails} onChange={v=>u('trainerDetails',v)}/></Field>}
      <div className="divider"></div>
      <Field label="Do you hold or have you previously held SC or DV security clearance?">
        <div className="radio-row"><Radio name="hasClearance" value="yes" label="Yes" checked={form.hasClearance==='yes'} onChange={v=>u('hasClearance',v)}/><Radio name="hasClearance" value="no" label="No" checked={form.hasClearance==='no'} onChange={v=>u('hasClearance',v)}/></div>
      </Field>
      {form.hasClearance==='yes' && <div className="field-row">
        <Field label="Clearance Level">
          <Select value={form.clearanceLevel} onChange={v=>u('clearanceLevel',v)}>
            <option value="">Select</option><option>SC</option><option>DV</option><option>CTC</option><option>BPSS</option>
          </Select>
        </Field>
        <Field label="Still Active?">
          <div className="radio-row"><Radio name="clearanceActive" value="yes" label="Yes" checked={form.clearanceActive==='yes'} onChange={v=>u('clearanceActive',v)}/><Radio name="clearanceActive" value="no" label="No — lapsed" checked={form.clearanceActive==='no'} onChange={v=>u('clearanceActive',v)}/></div>
        </Field>
      </div>}
    </StepShell>
  );
}

// ── STEP 7: BACKGROUND ──
function StepBackground({ data, onChange, onBack, onNext, isComplete }) {
  const [editing, setEditing] = React.useState(!isComplete);
  React.useEffect(() => { if (isComplete) setEditing(false); }, [isComplete]);
  const raw = data.background || {};
  const [form, setForm] = useState({
    hasForces: raw.hasForces || (raw.served_in_forces ? 'yes' : raw.served_in_forces === false ? 'no' : ''),
    forcesBranch: raw.forcesBranch || raw.forces_branch || '',
    forcesRank: raw.forcesRank || raw.forces_rank || '',
    forcesYears: raw.forcesYears || raw.forces_years || '',
    forcesDischarge: raw.forcesDischarge || raw.forces_discharge_type || '',
    hasCriminal: raw.hasCriminal || (raw.has_criminal_record ? 'yes' : raw.has_criminal_record === false ? 'no' : ''),
    criminalDetails: raw.criminalDetails || raw.criminal_record || '',
  });
  const u = (f,v) => setForm({...form,[f]:v});
  const save = () => { onChange({ background: form }); onNext(); };

  if (isComplete && !editing) {
    return (
      <CompletedStep
        title="Professional Background"
        summary={(() => { const d=data.background||{}; return [{label:"Forces/Police",value:d.served_in_forces||d.hasForces=="yes"?d.forces_branch||d.forcesBranch||"Yes":"No"},{label:"Criminal Record",value:d.has_criminal_record||d.hasCriminal=="yes"?"Yes — declared":"No"}]; })()}
        onEdit={() => setEditing(true)}
        onBack={onBack}
        onNext={onNext}
      />
    );
  }

  return (
    <StepShell step={7} total={11} title="Professional Background"
      why="Armed forces and police backgrounds are highly valued by security employers. BID accreditation opens doors to town centre and retail roles. Be proud of your background — it sets you apart."
      onBack={onBack} onNext={save}>
      <Field label="Do you have an armed forces or police background?">
        <div className="radio-row"><Radio name="hasForces" value="yes" label="Yes" checked={form.hasForces==='yes'} onChange={v=>u('hasForces',v)}/><Radio name="hasForces" value="no" label="No" checked={form.hasForces==='no'} onChange={v=>u('hasForces',v)}/></div>
      </Field>
      {form.hasForces==='yes' && <div className="field-row">
        <Field label="Branch / Force">
          <Select value={form.forcesBranch} onChange={v=>u('forcesBranch',v)}>
            <option value="">Select</option>
            {['British Army','Royal Navy','Royal Air Force','Royal Marines','Police Service','Other'].map(b=><option key={b}>{b}</option>)}
          </Select>
        </Field>
        <Field label="Rank / Grade"><Input type="text" placeholder="e.g. Sergeant, PC" value={form.forcesRank} onChange={v=>u('forcesRank',v)}/></Field>
        <Field label="Years Served"><Input type="text" placeholder="e.g. 8" value={form.forcesYears} onChange={v=>u('forcesYears',v)}/></Field>
      </div>}
      {form.hasForces==='yes' && <Field label="Type of discharge / departure">
        <Select value={form.forcesDischarge} onChange={v=>u('forcesDischarge',v)}>
          <option value="">Select</option>
          {['Honourable discharge','Medical discharge','Voluntary exit','Retirement','Other'].map(d=><option key={d}>{d}</option>)}
        </Select>
      </Field>}
      <div className="divider"></div>
      <Field label="Do you have any unspent criminal convictions?" hint="This does not automatically disqualify you — we assess each case individually">
        <div className="radio-row"><Radio name="hasCriminal" value="yes" label="Yes" checked={form.hasCriminal==='yes'} onChange={v=>u('hasCriminal',v)}/><Radio name="hasCriminal" value="no" label="No" checked={form.hasCriminal==='no'} onChange={v=>u('hasCriminal',v)}/></div>
      </Field>
      {form.hasCriminal==='yes' && <Field label="Please provide brief details" hint="Date, offence, sentence. This is confidential and only visible to you and our admin team."><textarea className="f-textarea" rows={3} value={form.criminalDetails} onChange={e=>u('criminalDetails',e.target.value)} placeholder="e.g. 2019 — SP30 — 3 points and £100 fine"/></Field>}
    </StepShell>
  );
}

// ── STEP 8: INTERVIEW QUESTIONS ──
function StepInterview({ data, onChange, onBack, onNext, isComplete }) {
  const [editing, setEditing] = React.useState(!isComplete);
  React.useEffect(() => { if (isComplete) setEditing(false); }, [isComplete]);
  const raw = data.interview || {};
  const [form, setForm] = useState({
    whyHire: raw.whyHire || '',
    proudOf: raw.proudOf || '',
    difficult: raw.difficult || '',
    strengthen: raw.strengthen || '',
    availability: raw.availability || '',
    salary: raw.salary || '',
  });
  const u = (f,v) => setForm(prev=>({...prev,[f]:v}));
  const save = () => { onChange({ interview: form }); onNext(); };

  if (isComplete && !editing) {
    return (
      <CompletedStep title="Interview Questions"
        summary={[
          { label:'Why hire you', value: form.whyHire ? form.whyHire.substring(0,60)+'...' : '' },
          { label:'Salary expectation', value: form.salary },
          { label:'Availability', value: form.availability },
        ]}
        onEdit={()=>setEditing(true)} onBack={onBack} onNext={onNext}/>
    );
  }

  return (
    <StepShell step={8} total={12} title="About You"
      why="These answers are shown to employers when you apply for a role. A strong, honest answer here sets you apart from candidates who leave these blank."
      onBack={onBack} onNext={save}>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'8px',padding:'0.875rem 1rem',marginBottom:'1.5rem',fontSize:'0.82rem',color:'#1e40af'}}>
        These questions will be shown to employers when you apply. Take your time — your answers help employers understand who you are before they even meet you.
      </div>

      <Field label="Why should an employer hire you?" hint="2–3 sentences. Be specific — mention your licence, experience, and reliability.">
        <textarea className="f-textarea" rows={3} placeholder="e.g. I am a licenced Close Protection officer with 6 years experience across corporate and residential sectors. I have a clean record, valid SIA licence and never missed a shift in my career." value={form.whyHire} onChange={e=>u('whyHire',e.target.value)}/>
      </Field>

      <Field label="What are you most proud of in your security career?" hint="A specific situation, achievement or moment that shows your character.">
        <textarea className="f-textarea" rows={3} placeholder="e.g. Successfully managing a hostile situation at a licensed premises without escalation or police involvement." value={form.proudOf} onChange={e=>u('proudOf',e.target.value)}/>
      </Field>

      <Field label="Describe a difficult situation you handled well." hint="Employers want to know how you react under pressure.">
        <textarea className="f-textarea" rows={3} placeholder="e.g. Dealt with a medical emergency on site before paramedics arrived — administered first aid and kept bystanders calm." value={form.difficult} onChange={e=>u('difficult',e.target.value)}/>
      </Field>

      <Field label="What would you do to strengthen this industry?" hint="Optional — shows professional thinking and ambition.">
        <textarea className="f-textarea" rows={2} placeholder="e.g. Better training standards and clearer career progression routes for front-line officers." value={form.strengthen} onChange={e=>u('strengthen',e.target.value)}/>
      </Field>

      <div className="divider"></div>
      <div className="field-row">
        <Field label="When can you start?">
          <Select value={form.availability} onChange={v=>u('availability',v)}>
            <option value="">Select</option>
            <option>Immediately</option>
            <option>Within 1 week</option>
            <option>Within 2 weeks</option>
            <option>Within 1 month</option>
            <option>I am currently employed</option>
          </Select>
        </Field>
        <Field label="Salary / Rate expectation">
          <Select value={form.salary} onChange={v=>u('salary',v)}>
            <option value="">Select</option>
            <option>£11–£12/hr</option>
            <option>£12–£13/hr</option>
            <option>£13–£15/hr</option>
            <option>£15–£18/hr</option>
            <option>£18–£22/hr</option>
            <option>£22+/hr</option>
            <option>£25,000–£30,000/yr</option>
            <option>£30,000–£35,000/yr</option>
            <option>£35,000–£45,000/yr</option>
            <option>£45,000+/yr</option>
            <option>Negotiable</option>
          </Select>
        </Field>
      </div>
    </StepShell>
  );
}

// ── STEP 9: EMPLOYMENT HISTORY ──
function StepEmployment({ data, onChange, onBack, onNext, isComplete }) {
  const [editing, setEditing] = React.useState(!isComplete);
  React.useEffect(() => { if (isComplete) setEditing(false); }, [isComplete]);
  const emptyJob = () => ({
    employer:'', role:'', sector:'', duties:'',
    address1:'', address2:'', town:'', county:'', postcode:'', website:'', companyPhone:'', companyEmail:'',
    contactName:'', contactTitle:'', contactEmail:'', contactPhone:'',
    fromMonth:'', fromYear:'', toMonth:'', toYear:'', current:false, reason:''
  });

  // Normalize API data (DB uses employer_name, job_title, start_date etc)
  const normalizeJob = (j) => ({
    employer: j.employer || j.employer_name || '',
    role: j.role || j.job_title || '',
    sector: j.sector || '',
    duties: j.duties || '',
    address1: j.address1 || j.employer_address || '',
    address2: j.address2 || '',
    town: j.town || '',
    county: j.county || '',
    postcode: j.postcode || j.employer_postcode || '',
    website: j.website || '',
    companyPhone: j.companyPhone || '',
    companyEmail: j.companyEmail || '',
    contactName: j.contactName || j.reference_name || '',
    contactTitle: j.contactTitle || j.reference_job_title || '',
    contactEmail: j.contactEmail || j.reference_email || '',
    contactPhone: j.contactPhone || j.reference_phone || '',
    fromMonth: j.fromMonth || (j.start_date ? j.start_date.split('-')[1] : '') || '',
    fromYear: j.fromYear || (j.start_date ? j.start_date.split('-')[0] : '') || '',
    toMonth: j.toMonth || (j.end_date ? j.end_date.split('-')[1] : '') || '',
    toYear: j.toYear || (j.end_date ? j.end_date.split('-')[0] : '') || '',
    current: j.current || j.is_current || false,
    reason: j.reason || j.reason_for_leaving || '',
  });

  const [jobs, setJobs] = useState(
    data.employment?.length ? data.employment.map(normalizeJob) : [emptyJob()]
  );
  const [saved, setSaved] = useState(new Set());

  const addJob = () => setJobs([...jobs, emptyJob()]);
  const update = (i,f,v) => setJobs(jobs.map((j,idx)=>idx===i?{...j,[f]:v}:j));
  const remove = (i) => { setJobs(jobs.filter((_,idx)=>idx!==i)); setSaved(s=>{const n=new Set(s);n.delete(i);return n;}); };

  const saveJob = (i) => setSaved(s => new Set([...s, i]));

  const sectors = ['Door Supervisor / Manned Guarding','CCTV / Control Room','Close Protection','Retail Security','Shopping Centre','Events / Festivals','Corporate / Commercial','Distribution / Logistics / Warehousing','Construction','Healthcare / Hospital','Education','Government / MOD','Residential / Concierge','Transport Hub','Cash in Transit','Key Holding / Mobile Patrol','Nightlife / Licensed Premises','Self Employed','Unemployed / Career Break','Other'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const isIncomplete = (j) => !j.employer?.trim() || !j.role?.trim() || !j.sector || !j.address1?.trim() || !j.town?.trim() || !j.postcode?.trim() || !j.contactName?.trim() || !j.contactEmail?.trim() || !j.contactPhone?.trim() || !j.fromMonth || !j.fromYear || (!j.current && (!j.toMonth || !j.toYear));
  const anyIncomplete = jobs.some(isIncomplete);

  // Gap calculator — how many months covered vs 60 needed
  const getCoverage = () => {
    const now = new Date();
    const fiveYearsAgo = new Date(now.getFullYear()-5, now.getMonth(), 1);
    let totalDays = 0;
    jobs.forEach(j => {
      const from = j.fromYear && j.fromMonth ? new Date(j.fromYear+'-'+j.fromMonth+'-01') : null;
      const to = j.current ? now : (j.toYear && j.toMonth ? new Date(j.toYear+'-'+j.toMonth+'-01') : null);
      if (!from || !to) return;
      const start = from < fiveYearsAgo ? fiveYearsAgo : from;
      const end = to > now ? now : to;
      if (end > start) totalDays += (end - start) / (1000*60*60*24);
    });
    const coveredMonths = Math.min(60, Math.round(totalDays / 30.5));
    const remainingMonths = Math.max(0, 60 - coveredMonths);
    return { coveredMonths, remainingMonths };
  };

  const { coveredMonths, remainingMonths } = getCoverage();

  const save = () => {
    if (anyIncomplete) return;
    const mapped = jobs.map(j => ({...j, from: j.fromYear&&j.fromMonth ? j.fromYear+'-'+j.fromMonth : '', to: j.toYear&&j.toMonth ? j.toYear+'-'+j.toMonth : ''}));
    onChange({ employment: mapped }); onNext();
  };

  if (isComplete && !editing) {
    return (
      <CompletedStep
        title="Work History"
        summary={[
          { label:'Positions recorded', value: jobs.length + ' position' + (jobs.length!==1?'s':'') },
          { label:'Coverage', value: coveredMonths + ' of 60 months' },
          { label:'Status', value: remainingMonths === 0 ? '5-year history complete' : remainingMonths + ' months still needed' },
        ]}
        onEdit={() => setEditing(true)}
        onBack={onBack}
        onNext={onNext}
      />
    );
  }

  return (
    <StepShell step={8} total={11} title="Work History"
      why="This is the most critical section for BS7858 vetting. Every employer needs a verifiable contact. Incomplete entries halt the vetting process completely — there is no excuse for missing details."
      onBack={onBack} onNext={save} nextLabel={anyIncomplete ? 'Complete all required fields' : 'Save & Continue'}>

      {/* Gap calculator */}
      <div style={{background: remainingMonths === 0 ? '#dcfce7' : '#fef9c3', border: `1px solid ${remainingMonths === 0 ? '#bbf7d0' : '#fde047'}`, borderRadius:'10px', padding:'1rem 1.25rem', marginBottom:'1.5rem'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'0.5rem'}}>
          <div>
            <div style={{fontWeight:700,fontSize:'0.9rem',color: remainingMonths === 0 ? '#15803d' : '#854d0e'}}>
              {remainingMonths === 0 ? '5-year work history complete' : `${remainingMonths} month${remainingMonths!==1?'s':''} still to account for`}
            </div>
            <div style={{fontSize:'0.78rem',color:'#64748b',marginTop:'0.2rem'}}>
              {coveredMonths} of 60 months covered — BS7858 requires a full 5 years with no unexplained gaps
            </div>
          </div>
          <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
            <div style={{height:'8px',width:'160px',background:'#e2e8f0',borderRadius:'999px',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${(coveredMonths/60)*100}%`,background: remainingMonths === 0 ? '#10b981' : '#f59e0b',borderRadius:'999px',transition:'width 0.4s'}}/>
            </div>
            <span style={{fontSize:'0.78rem',fontWeight:700,color:'#64748b'}}>{Math.round((coveredMonths/60)*100)}%</span>
          </div>
        </div>
      </div>

      <div className="history-note" style={{marginBottom:'1.25rem'}}>
        Start with your <strong>current or most recent employer</strong> and work backwards. Include every position — self-employment, agency work, unemployment and career breaks all count.
      </div>

      {jobs.map((job, i) => (
        <div key={i} className="history-block" style={{border: saved.has(i) && !isIncomplete(job) ? '2px solid #10b981' : isIncomplete(job) ? '2px solid #e2e8f0' : '2px solid #e2e8f0'}}>
          <div className="history-block-header">
            <div>
              <span style={{fontWeight:700}}>Position {i+1}{job.employer ? ' — '+job.employer : ''}</span>
              {saved.has(i) && !isIncomplete(job) && <span style={{marginLeft:'0.5rem',fontSize:'0.75rem',color:'#10b981',fontWeight:700}}>Saved</span>}
            </div>
            {i>0 && <button className="btn-remove" onClick={()=>remove(i)}>Remove</button>}
          </div>

          <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'8px',padding:'0.75rem 1rem',marginBottom:'1rem',fontSize:'0.82rem',color:'#166534'}}>
            <strong>Tip:</strong> Fill in your outline of duties accurately and in detail — this information will be used to build your CV automatically when you apply for roles. The more detail you provide, the stronger your application.
          </div>

          <div className="field-row">
            <Field label="Employer / Organisation Name *"><Input type="text" placeholder="Company name" value={job.employer} onChange={v=>update(i,'employer',v)}/></Field>
            <Field label="Your Job Title *"><Input type="text" placeholder="e.g. Door Supervisor" value={job.role} onChange={v=>update(i,'role',v)}/></Field>
          </div>
          <Field label="Sector *">
            <Select value={job.sector||''} onChange={v=>update(i,'sector',v)}>
              <option value="">Select sector</option>
              {sectors.map(s=><option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Outline of duties *" hint="Be specific — this builds your CV. Include responsibilities, equipment used, team size, site type.">
            <textarea className="f-textarea" rows={3} placeholder="e.g. Manned guarding of 3 distribution warehouses across shift patterns. Responsibilities included access control, CCTV monitoring (16 camera system), lone working protocols, daily incident logging and emergency response. Worked within a 4-person team." value={job.duties||''} onChange={e=>update(i,'duties',e.target.value)}/>

          </Field>

          <div className="divider" style={{margin:'1rem 0 0.75rem'}}></div>
          <div style={{fontWeight:700,fontSize:'0.85rem',color:'#0b1222',marginBottom:'0.75rem'}}>Employer Address *</div>
          <Field label="Address Line 1 *"><Input type="text" placeholder="Building/street" value={job.address1||''} onChange={v=>update(i,'address1',v)}/></Field>
          <Field label="Address Line 2"><Input type="text" placeholder="Optional" value={job.address2||''} onChange={v=>update(i,'address2',v)}/></Field>
          <div className="field-row">
            <Field label="Town / City *"><Input type="text" value={job.town||''} onChange={v=>update(i,'town',v)}/></Field>
            <Field label="County"><Input type="text" value={job.county||''} onChange={v=>update(i,'county',v)}/></Field>
            <Field label="Postcode *"><Input type="text" value={job.postcode||''} onChange={v=>update(i,'postcode',v)}/></Field>
          </div>
          <div className="field-row">
            <Field label="Company Website"><Input type="text" placeholder="www.company.com" value={job.website||''} onChange={v=>update(i,'website',v)}/></Field>
            <Field label="Main Company Phone"><Input type="tel" placeholder="01234 567890" value={job.companyPhone||''} onChange={v=>update(i,'companyPhone',v)}/></Field>
          </div>
          <Field label="Generic HR Email" hint="e.g. hr@company.com or info@company.com"><Input type="email" placeholder="hr@company.com" value={job.companyEmail||''} onChange={v=>update(i,'companyEmail',v)}/></Field>

          <div className="divider" style={{margin:'1rem 0 0.75rem'}}></div>
          <div style={{fontWeight:700,fontSize:'0.85rem',color:'#0b1222',marginBottom:'0.25rem'}}>Reference Contact *</div>
          <div style={{fontSize:'0.78rem',color:'#64748b',marginBottom:'0.75rem'}}>The HR manager, Operations manager or direct line manager who can verify your employment. This person will be contacted during vetting.</div>
          <div className="field-row">
            <Field label="Contact Name *"><Input type="text" placeholder="Full name" value={job.contactName||''} onChange={v=>update(i,'contactName',v)}/></Field>
            <Field label="Job Title"><Input type="text" placeholder="e.g. HR Manager" value={job.contactTitle||''} onChange={v=>update(i,'contactTitle',v)}/></Field>
          </div>
          <div className="field-row">
            <Field label="Direct Phone Number *" hint="Mobile or direct line — not a switchboard"><Input type="tel" placeholder="01234 567890" value={job.contactPhone||''} onChange={v=>update(i,'contactPhone',v)}/></Field>
            <Field label="Reference Email *"><Input type="email" placeholder="e.g. anna@company.com" value={job.contactEmail||''} onChange={v=>update(i,'contactEmail',v)}/></Field>
          </div>

          <div className="divider" style={{margin:'1rem 0 0.75rem'}}></div>
          <div style={{fontWeight:700,fontSize:'0.85rem',color:'#0b1222',marginBottom:'0.75rem'}}>Dates of Employment *</div>
          <div className="field-row">
            <Field label="Start Date *">
              <div className="field-row" style={{gap:'0.5rem',marginBottom:0}}>
                <Select value={job.fromMonth||''} onChange={v=>update(i,'fromMonth',v)}>
                  <option value="">Month</option>
                  {months.map((m,mi)=><option key={mi} value={String(mi+1).padStart(2,'0')}>{m}</option>)}
                </Select>
                <Input type="number" placeholder="Year" min="2000" max={new Date().getFullYear()} value={job.fromYear||''} onChange={v=>update(i,'fromYear',v)} style={{width:'90px'}}/>
              </div>
            </Field>
            {!job.current && <Field label="End Date *">
              <div className="field-row" style={{gap:'0.5rem',marginBottom:0}}>
                <Select value={job.toMonth||''} onChange={v=>update(i,'toMonth',v)}>
                  <option value="">Month</option>
                  {months.map((m,mi)=><option key={mi} value={String(mi+1).padStart(2,'0')}>{m}</option>)}
                </Select>
                <Input type="number" placeholder="Year" min="2000" max={new Date().getFullYear()} value={job.toYear||''} onChange={v=>update(i,'toYear',v)} style={{width:'90px'}}/>
              </div>
            </Field>}
            <Field label=" "><div style={{paddingTop:'1.8rem'}}>
              <Checkbox label="Current employer" checked={job.current} onChange={()=>update(i,'current',!job.current)}/>
            </div></Field>
          </div>
          {!job.current && <Field label="Reason for leaving">
            <Input type="text" placeholder="e.g. Contract ended, career progression, redundancy" value={job.reason||''} onChange={v=>update(i,'reason',v)}/>
          </Field>}

          {/* Per-entry coverage */}
          {job.fromMonth && job.fromYear && (() => {
            const from = new Date(job.fromYear+'-'+job.fromMonth+'-01');
            const to = job.current ? new Date() : (job.toMonth && job.toYear ? new Date(job.toYear+'-'+job.toMonth+'-01') : null);
            if (!to || to <= from) return null;
            const totalMonths = Math.round((to - from) / (1000*60*60*24*30.5));
            const y = Math.floor(totalMonths/12), m = totalMonths%12;
            const label = y > 0 ? y+' year'+(y>1?'s':'')+(m>0?' '+m+' month'+(m>1?'s':''):'') : totalMonths+' month'+(totalMonths!==1?'s':'');
            return (
              <div style={{marginTop:'0.75rem',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'8px',padding:'0.6rem 0.875rem',fontSize:'0.78rem',color:'#15803d',fontWeight:500}}>
                This position covers <strong>{label}</strong> of your 5-year requirement
              </div>
            );
          })()}

          {/* Save this position button */}
          <div style={{marginTop:'1.25rem',paddingTop:'1rem',borderTop:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:'1rem'}}>
            {!isIncomplete(job) ? (
              <button type="button" onClick={()=>saveJob(i)} style={{background:'#10b981',color:'#fff',border:'none',borderRadius:'8px',padding:'0.65rem 1.5rem',fontSize:'0.88rem',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                {saved.has(i) ? 'Position saved' : 'Save this position'}
              </button>
            ) : (
              <div style={{fontSize:'0.78rem',color:'#dc2626',fontWeight:600}}>Complete all required fields * to save this position</div>
            )}
          </div>
        </div>
      ))}

      <button className="btn-add" onClick={addJob}>+ Add Another Position</button>
    </StepShell>
  );
}

// ── STEP 9: ADDRESS HISTORY ──
function StepAddress({ data, onChange, onBack, onNext, isComplete }) {
  const [editing, setEditing] = React.useState(!isComplete);
  React.useEffect(() => { if (isComplete) setEditing(false); }, [isComplete]);

  const emptyAddr = () => ({ line1:'', line2:'', town:'', postcode:'', fromMonth:'', fromYear:'', toMonth:'', toYear:'', current:false });

  const normaliseAddr = (a) => ({
    line1: a.line1 || a.address_line1 || '',
    line2: a.line2 || a.address_line2 || '',
    town: a.town || a.city || '',
    postcode: a.postcode || '',
    fromMonth: a.fromMonth || (a.moved_in_date ? a.moved_in_date.split('-')[1] : '') || '',
    fromYear: a.fromYear || (a.moved_in_date ? a.moved_in_date.split('-')[0] : '') || '',
    toMonth: a.toMonth || (a.moved_out_date ? a.moved_out_date.split('-')[1] : '') || '',
    toYear: a.toYear || (a.moved_out_date ? a.moved_out_date.split('-')[0] : '') || '',
    current: a.current || a.is_current || false,
  });

  const [addresses, setAddresses] = useState(
    data.addresses?.length ? data.addresses.map(normaliseAddr) : [emptyAddr()]
  );
  const add = () => setAddresses([...addresses, emptyAddr()]);
  const update = (i,f,v) => setAddresses(addresses.map((a,idx)=>idx===i?{...a,[f]:v}:a));
  const remove = (i) => setAddresses(addresses.filter((_,idx)=>idx!==i));
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const getCoveredMonths = () => {
    const now = new Date();
    const fiveYearsAgo = new Date(now.getFullYear()-5, now.getMonth(), 1);
    let total = 0;
    addresses.forEach(a => {
      const from = a.fromYear && a.fromMonth ? new Date(a.fromYear+'-'+a.fromMonth+'-01') : null;
      const to = (a.current || a.is_current) ? now : (a.toYear && a.toMonth ? new Date(a.toYear+'-'+a.toMonth+'-01') : null);
      if (!from || !to || to <= from) return;
      const start = from < fiveYearsAgo ? fiveYearsAgo : from;
      const end = to > now ? now : to;
      if (end > start) total += (end - start) / (1000*60*60*24*30.5);
    });
    return Math.min(60, Math.round(total));
  };


  const coveredMonths = getCoveredMonths();
  const remainingMonths = Math.max(0, 60 - coveredMonths);
  const isFiveYearsCovered = remainingMonths === 0;

  const save = () => {
    if (!isFiveYearsCovered) return;
    const mapped = addresses.map(a => ({
      ...a,
      from: a.fromYear && a.fromMonth ? `${a.fromYear}-${a.fromMonth}` : a.from || '',
      to: a.toYear && a.toMonth ? `${a.toYear}-${a.toMonth}` : a.to || '',
    }));
    onChange({ addresses: mapped });
    onNext();
  };

  if (isComplete && !editing) {
    return (
      <CompletedStep
        title="Address History"
        summary={[
          { label:'Addresses recorded', value: (data.addresses?.length||0)+' address(es)' },
          { label:'Coverage', value: coveredMonths+' of 60 months' },
          { label:'Status', value: isFiveYearsCovered ? '5-year history complete' : remainingMonths+' months still needed' },
        ]}
        onEdit={() => setEditing(true)}
        onBack={onBack}
        onNext={isFiveYearsCovered ? onNext : () => { setEditing(true); }}
      />
    );
  }

  return (
    <StepShell step={9} total={11} title="Address History"
      why="A complete 5-year address history with no gaps is a core BS7858 requirement. You cannot proceed until all 5 years are accounted for."
      onBack={onBack} onNext={save}
      nextLabel={!isFiveYearsCovered ? `Add addresses to cover last ${remainingMonths} months` : 'Save & Continue'}>

      {/* Coverage bar */}
      <div style={{background: isFiveYearsCovered ? '#dcfce7' : '#fef9c3', border: `1px solid ${isFiveYearsCovered ? '#bbf7d0' : '#fde047'}`, borderRadius:'10px', padding:'1rem 1.25rem', marginBottom:'1.5rem'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'0.5rem'}}>
          <div>
            <div style={{fontWeight:700,fontSize:'0.9rem',color: isFiveYearsCovered ? '#15803d' : '#854d0e'}}>
              {isFiveYearsCovered ? '5-year address history complete' : `Add your most recent address to cover the last ${remainingMonths} month${remainingMonths!==1?'s':''}`}
            </div>
            <div style={{fontSize:'0.78rem',color:'#64748b',marginTop:'0.2rem'}}>
              Your addresses cover {coveredMonths} of the last 60 months. Only the last 5 years count for BS7858 — older addresses are not required.
            </div>
          </div>
          <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
            <div style={{height:'8px',width:'160px',background:'#e2e8f0',borderRadius:'999px',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${(coveredMonths/60)*100}%`,background: isFiveYearsCovered ? '#10b981' : '#f59e0b',borderRadius:'999px',transition:'width 0.4s'}}/>
            </div>
            <span style={{fontSize:'0.78rem',fontWeight:700,color:'#64748b'}}>{Math.round((coveredMonths/60)*100)}%</span>
          </div>
        </div>
      </div>

      <div className="history-note">Every address for the last <strong>5 years</strong>. Exact dates. No gaps.</div>
      {addresses.map((addr, i) => (
        <div key={i} className="history-block">
          <div className="history-block-header">
            <span>Address {i+1}</span>
            {i>0 && <button className="btn-remove" onClick={()=>remove(i)}>Remove</button>}
          </div>
          <div className="field-row">
            <Field label="Address Line 1"><Input type="text" placeholder="House number and street" value={addr.line1} onChange={v=>update(i,'line1',v)}/></Field>
            <Field label="Address Line 2"><Input type="text" placeholder="Optional" value={addr.line2} onChange={v=>update(i,'line2',v)}/></Field>
          </div>
          <div className="field-row">
            <Field label="Town / City"><Input type="text" value={addr.town} onChange={v=>update(i,'town',v)}/></Field>
            <Field label="Postcode"><Input type="text" value={addr.postcode} onChange={v=>update(i,'postcode',v)}/></Field>
          </div>
          <div className="field-row">
            <Field label="Move-in Date">
              <div className="field-row" style={{gap:'0.5rem',marginBottom:0}}>
                <Select value={addr.fromMonth||''} onChange={v=>update(i,'fromMonth',v)}>
                  <option value="">Month</option>
                  {months.map((m,mi)=><option key={mi} value={String(mi+1).padStart(2,'0')}>{m}</option>)}
                </Select>
                <Input type="number" placeholder="Year" min="2000" max={new Date().getFullYear()} value={addr.fromYear||''} onChange={v=>update(i,'fromYear',v)} style={{width:'90px'}}/>
              </div>
            </Field>
            {!addr.current && <Field label="Move-out Date">
              <div className="field-row" style={{gap:'0.5rem',marginBottom:0}}>
                <Select value={addr.toMonth||''} onChange={v=>update(i,'toMonth',v)}>
                  <option value="">Month</option>
                  {months.map((m,mi)=><option key={mi} value={String(mi+1).padStart(2,'0')}>{m}</option>)}
                </Select>
                <Input type="number" placeholder="Year" min="2000" max={new Date().getFullYear()} value={addr.toYear||''} onChange={v=>update(i,'toYear',v)} style={{width:'90px'}}/>
              </div>
            </Field>}
            <Field label=" "><div style={{paddingTop:'1.8rem'}}>
              <Checkbox label="Current address" checked={addr.current} onChange={()=>update(i,'current',!addr.current)}/>
            </div></Field>
          </div>
        </div>
      ))}
      <button className="btn-add" onClick={add}>+ Add Another Address</button>
    </StepShell>
  );
}


// ── STEP PHOTO ──
function StepPhoto({ data, onChange, onBack, onNext, isComplete }) {
  const [editing, setEditing] = React.useState(!isComplete);
  React.useEffect(() => { if (isComplete) setEditing(false); }, [isComplete]);
  const [preview, setPreview] = React.useState(data.photo?.preview || null);
  const [uploaded, setUploaded] = React.useState(data.photo?.uploaded || false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target.result);
      setUploaded(true);
      onChange({ photo: { uploaded: true, preview: ev.target.result } });
    };
    reader.readAsDataURL(file);
  };

  if (isComplete && !editing) {
    return (
      <CompletedStep title="Profile Photo"
        summary={[
          { label:'Status', value: 'Photo uploaded' },
          { label:'Visibility', value: 'Never shown to employers' },
        ]}
        onEdit={() => setEditing(true)} onBack={onBack} onNext={onNext}/>
    );
  }

  return (
    <StepShell step={7} total={12} title="Profile Photo"
      why="A clear photo helps our team verify your identity. This is the only reason we ask for it."
      onBack={onBack} onNext={() => { onChange({ photo: { uploaded, preview } }); onNext(); }} nextLabel={uploaded ? 'Save & Continue' : 'Skip for now'}>
      <div className="photo-upload-wrap">
        <div className="photo-preview">
          {preview
            ? <img src={preview} alt="Profile" className="photo-img"/>
            : <div className="photo-placeholder"><svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" fill="none" strokeWidth="1.2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          }
        </div>
        <label className="photo-btn">
          {uploaded ? 'Change Photo' : 'Upload Photo'}
          <input type="file" accept="image/*" onChange={handleFile} style={{display:'none'}}/>
        </label>
        <div className="photo-policy">
          <div className="photo-policy-title">Your photo is never shown to employers</div>
          <p>We made this decision deliberately. Employers on this platform hire based on your SIA licence, your vettability score, your employment history and your professional record — not how you look.</p>
          <p>This protects you from unconscious bias and keeps every hiring decision focused on what actually matters: your credentials and your character.</p>
          <p><strong>This is how professional recruitment should work.</strong></p>
        </div>
      </div>
    </StepShell>
  );
}

// ── STEP 10: COMPLETE ──
function StepComplete({ name, sections, onGoToStep }) {
  const incomplete = sections.filter(s => !s.complete && !s.pending);
  const allDone = incomplete.length === 0;

  if (!allDone) {
    return (
      <div className="complete-screen">
        <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>👋</div>
        <h2>Almost there, {name}</h2>
        <p>You have {incomplete.length} section{incomplete.length!==1?'s':''} still to complete before your profile can go live.</p>
        <div className="complete-next" style={{textAlign:'left'}}>
          {sections.map((s,i) => (
            <div key={i} className="cn-item" style={{cursor:'pointer'}}
              onClick={() => onGoToStep && onGoToStep(i)}>
              <div className="cn-n" style={{background: s.complete ? '#10b981' : s.pending ? '#f59e0b' : '#e2e8f0', color: s.complete||s.pending ? '#fff' : '#64748b'}}>
                {s.complete ? '✓' : s.pending ? '?' : i+1}
              </div>
              <div>
                <strong style={{color: s.complete ? '#15803d' : '#0b1222'}}>{s.name}</strong>
                <p style={{margin:'0.1rem 0 0',fontSize:'0.78rem',color:'#64748b'}}>
                  {s.complete ? 'Complete — click to edit' : s.pending ? 'Pending verification' : 'Not yet completed — click to complete'}
                </p>
              </div>
            </div>
          ))}
        </div>
        <a href="/dashboard" className="btn-next" style={{display:'block',textAlign:'center',marginTop:'2rem'}}>Go to My Dashboard</a>
      </div>
    );
  }

  return (
    <div className="complete-screen">
      <div className="complete-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg></div>
      <h2>Profile Submitted</h2>
      <p>Well done, {name}. Your profile is now being reviewed by our team.</p>
      <div className="complete-next">
        <div className="cn-item"><div className="cn-n">1</div><div><strong>SIA Verification</strong><p>We will verify your SIA licence against the public register within 24 hours.</p></div></div>
        <div className="cn-item"><div className="cn-n">2</div><div><strong>Profile Review</strong><p>Our team reviews your profile for completeness. We may be in touch if anything needs clarifying.</p></div></div>
        <div className="cn-item"><div className="cn-n">3</div><div><strong>Apply for Roles</strong><p>Once verified, you can apply for jobs on the platform. Employers will be able to see your vettability score and verified profile when you apply.</p></div></div>
      </div>
      <a href="/dashboard" className="btn-next" style={{display:'block',textAlign:'center',marginTop:'2rem'}}>Go to My Dashboard</a>
    </div>
  );
}



// ── COVER LETTER BUILDER ──
function CoverLetterBuilder({ profileData, userName }) {
  const [form, setForm] = React.useState({ role:'', employer:'', strength:'', extra:'' });
  const [letter, setLetter] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);

  const p = profileData?.personal || {};
  const licences = profileData?.licences || [];
  const employment = profileData?.employment || [];
  const qualifications = profileData?.qualifications || {};
  const driving = profileData?.driving || {};
  const background = profileData?.background || {};

  const generate = async () => {
    setLoading(true);
    setGenerated(false);
    try {
      const profile = {
        name: userName || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'the candidate',
        licences: licences.map(l => l.licence_type||l.type).join(', '),
        employment: employment.slice(0,3).map(j => `${j.role||j.job_title} at ${j.employer||j.employer_name} (${j.sector||'security'})`).join('; '),
        firstAid: qualifications.has_efaw || qualifications.has_faw ? 'First Aid certified' : '',
        driving: driving.hasLicence === 'yes' ? 'Full UK driving licence' : '',
        forces: background.served_in_forces ? `Former ${background.forces_branch}` : '',
        clearance: qualifications.security_clearance && qualifications.security_clearance !== 'None' ? `${qualifications.security_clearance} security clearance` : '',
      };

      const res = await fetch('https://uksecurityjobs-api.onrender.com/api/ai/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'generate_cover_letter', text: `Write a professional cover letter for a UK security officer.\nName: ${profile.name}\nLicences: ${profile.licences}\nExperience: ${profile.employment}\nRole: ${form.role || 'Security Officer'}\nEmployer: ${form.employer || 'the organisation'}\nStrongest quality: ${form.strength}\nExtra: ${form.extra}\n\nWrite a 3-paragraph professional cover letter in UK English. Start with Dear Hiring Manager, end with Yours sincerely, and the candidate name. No preamble.` })
      });
      const data = await res.json();
      const text = data.result;
      if (text) { setLetter(text); setGenerated(true); }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const polish = async () => {
    if (!letter) return;
    setLoading(true);
    try {
      const res = await fetch('https://uksecurityjobs-api.onrender.com/api/ai/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'cover_letter', text: letter })
      });
      const data = await res.json();
      const text = data.result;
      if (text) setLetter(text);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:'12px',padding:'1.75rem',marginTop:'1.5rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.5rem'}}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a52a8" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <div style={{fontWeight:700,fontSize:'1rem',color:'#0b1222'}}>Cover Letter Builder</div>
        <span style={{background:'#eff6ff',color:'#1a52a8',fontSize:'0.68rem',fontWeight:700,padding:'0.15rem 0.5rem',borderRadius:'999px',letterSpacing:'0.05em'}}>AI</span>
      </div>
      <div style={{fontSize:'0.82rem',color:'#64748b',marginBottom:'1.25rem'}}>Answer 4 quick questions and get a professional cover letter instantly. Your profile data is used automatically.</div>

      <div style={{display:'grid',gap:'0.875rem',marginBottom:'1.25rem'}}>
        <Field label="Role you are applying for *">
          <Input type="text" placeholder="e.g. Door Supervisor, CCTV Operator, Security Manager" value={form.role} onChange={v=>setForm({...form,role:v})}/>
        </Field>
        <Field label="Company or employer name">
          <Input type="text" placeholder="e.g. Securitas, G4S, or the venue name" value={form.employer} onChange={v=>setForm({...form,employer:v})}/>
        </Field>
        <Field label="Your strongest quality for this role">
          <Input type="text" placeholder="e.g. 10 years experience in retail security, calm under pressure" value={form.strength} onChange={v=>setForm({...form,strength:v})}/>
        </Field>
        <Field label="Anything else you want to highlight?" hint="Optional">
          <Input type="text" placeholder="e.g. Available immediately, willing to work nights and weekends" value={form.extra} onChange={v=>setForm({...form,extra:v})}/>
        </Field>
      </div>

      <button type="button" onClick={generate} disabled={loading || !form.role}
        style={{background:form.role?'#1a52a8':'#e2e8f0',color:form.role?'#fff':'#94a3b8',border:'none',borderRadius:'8px',padding:'0.75rem 1.5rem',fontSize:'0.9rem',fontWeight:700,cursor:form.role?'pointer':'not-allowed',fontFamily:'inherit',width:'100%',marginBottom:'1rem'}}>
        {loading ? 'Generating...' : generated ? 'Regenerate Cover Letter' : 'Generate Cover Letter'}
      </button>

      {letter && (
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.75rem'}}>
            <div style={{fontWeight:600,fontSize:'0.85rem',color:'#0b1222'}}>Your Cover Letter</div>
            <div style={{display:'flex',gap:'0.5rem'}}>
              <button type="button" onClick={polish} disabled={loading} style={{background:'#f0f4ff',color:'#1a52a8',border:'1px solid #bfdbfe',borderRadius:'6px',padding:'0.35rem 0.75rem',fontSize:'0.75rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                ✦ Polish
              </button>
              <button type="button" onClick={()=>navigator.clipboard.writeText(letter)} style={{background:'#f1f5f9',color:'#334155',border:'1px solid #e2e8f0',borderRadius:'6px',padding:'0.35rem 0.75rem',fontSize:'0.75rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                Copy
              </button>
            </div>
          </div>
          <textarea
            className="f-textarea"
            rows={14}
            value={letter}
            onChange={e=>setLetter(e.target.value)}
            style={{fontFamily:'Georgia,serif',fontSize:'0.82rem',lineHeight:'1.7',color:'#1a1a2e'}}
          />
          <div style={{fontSize:'0.72rem',color:'#94a3b8',marginTop:'0.4rem'}}>You can edit this letter directly. Click Polish to fix grammar and improve impact.</div>
        </div>
      )}
    </div>
  );
}

// ── PROFILE BUILDER ──
function ProfileBuilder() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [step, setStep] = useState(0);
  const [forceEditKey, setForceEditKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [cvMobileOpen, setCvMobileOpen] = React.useState(false);

  const [profileData, setProfileData] = useState({
    licences: null, personal: null, driving: null, sectors: null,
    qualifications: null, background: null, employment: null,
    photo: null, addresses: null,
  });

  // Load profile from API on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const full = await apiRequest('/api/candidates/me/full', 'GET', null, getToken);

        const licences = full.licences || null;
        const personal = full.personal || null;
        const driving = full.driving || null;
        const sectors = full.sectors || null;
        const qualifications = full.qualifications || null;
        const background = full.background || null;
        const employment = full.employment || null;
        const addresses = full.addresses || null;
        const interviewAnswers = full.candidate?.interview_answers || null;

        setProfileData({ licences, personal, driving, sectors, qualifications, background, employment, photo: null, addresses, interview: interviewAnswers });

        // Infer which steps are already complete from API data
        const completed = new Set();
        if (licences?.length) completed.add('licences');
        if (personal?.phone || personal?.first_name) completed.add('personal');
        if (driving) completed.add('driving');
        if (sectors) completed.add('sectors');
        if (qualifications) completed.add('qualifications');
        if (background) completed.add('background');
        if (employment?.length) completed.add('employment');
        if (interviewAnswers?.whyHire) completed.add('interview');
        setCompletedSteps(completed);

        setStep(full.candidate?.profile_step || 0);
          // Only mark complete if 5 years covered
          const now = new Date();
          const fiveYearsAgo = new Date(now.getFullYear()-5, now.getMonth(), 1);
          let total = 0;
          addresses.forEach(a => {
            const from = a.moved_in_date ? new Date(a.moved_in_date) : null;
            const to = a.is_current ? now : (a.moved_out_date ? new Date(a.moved_out_date) : null);
            if (!from || !to) return;
            const start = from < fiveYearsAgo ? fiveYearsAgo : from;
            const end = to > now ? now : to;
            if (end > start) total += (end - start) / (1000*60*60*24*30.5);
          });
          if (Math.round(total) >= 60) completed.add('addresses');
        }
        setCompletedSteps(completed);

      } catch(err) {
        console.error('Failed to load profile:', err);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const sections = [
    { name:'SIA Licence', short:'SIA', complete: profileData.licences?.[0]?.verified === true, pending: completedSteps.has('licences') && !profileData.licences?.[0]?.verified, started: completedSteps.has('licences') || !!profileData.licences?.[0] },
    { name:'Personal Details', short:'Personal', complete: completedSteps.has('personal'), started: completedSteps.has('personal') || !!profileData.personal },
    { name:'Driving & Transport', short:'Drive', complete: completedSteps.has('driving'), started: completedSteps.has('driving') || !!profileData.driving },
    { name:'Sectors & Availability', short:'Work', complete: completedSteps.has('sectors'), started: completedSteps.has('sectors') || !!profileData.sectors },
    { name:'Qualifications', short:'Quals', complete: completedSteps.has('qualifications'), started: completedSteps.has('qualifications') || !!profileData.qualifications },
    { name:'Criminal Record', short:'Record', complete: completedSteps.has('background'), started: completedSteps.has('background') || !!profileData.background },
    { name:'About You', short:'About', complete: completedSteps.has('interview'), started: completedSteps.has('interview') || !!profileData.interview },
    { name:'Work History', short:'Work H', complete: completedSteps.has('employment'), started: completedSteps.has('employment') || !!profileData.employment?.length },
    { name:'Address History', short:'Addr', complete: completedSteps.has('addresses'), started: completedSteps.has('addresses') || !!profileData.addresses?.length },
  ];

  const update = async (d) => {
    const merged = { ...profileData, ...d };
    setProfileData(merged);
    const stepKey = Object.keys(d)[0];

    // Mark complete and advance immediately — don't wait for API
    if (stepKey) setCompletedSteps(prev => new Set([...prev, stepKey]));

    setSaving(true);
    try {
      if (d.personal) {
        const p = d.personal;
        const dob = p.dobYear && p.dobMonth && p.dobDay ? `${p.dobYear}-${p.dobMonth}-${p.dobDay}` : p.date_of_birth || null;
        const movedIn = p.movedInYear && p.movedInMonth ? `${p.movedInYear}-${p.movedInMonth}-01` : p.move_in_date || null;
        try { await apiRequest('/api/candidates/me/personal', 'PUT', {
          first_name: p.firstName || p.first_name || user?.firstName || '',
          last_name: p.lastName || p.last_name || user?.lastName || '',
          date_of_birth: dob || null,
          phone: p.phone || '',
          address_line1: p.address_line1 || p.address1 || '',
          address_line2: p.address_line2 || p.address2 || null,
          city: p.city || p.town || '',
          county: p.county || null,
          postcode: p.postcode || '',
          move_in_date: movedIn || null,
          ni_number: p.ni_number || p.ni || null,
          sia_address_match: p.siaAddress === 'yes' || p.sia_address_match === true,
          dvla_address_match: p.dvlaAddress === 'yes' || p.dvla_address_match === true,
        }, getToken); } catch(e) { console.error("Failed to save personal details:", e.message); }
      }
      if (d.licences) {
        try { await apiRequest('/api/sia', 'PUT', { licences: d.licences }, getToken); } catch(e) { console.error("Failed to save SIA licences:", e.message); }
      }
      if (d.driving) {
        const dr = d.driving;
        try { await apiRequest('/api/profile/driving', 'PUT', {
          has_driving_licence: dr.hasLicence === 'yes',
          licence_type: dr.licenceType === 'Full' ? 'Full UK' : dr.licenceType || null,
          endorsement_codes: dr.endorsements || [],
          has_ban_history: dr.hasBan === 'yes',
          has_own_vehicle: dr.hasTransport === 'yes',
          vehicle_insured: dr.insured === 'yes',
          vehicle_taxed: dr.taxed === 'yes',
          vehicle_mot_valid: dr.moted === 'yes',
          travel_radius_miles: parseInt(dr.travelRadius) || null,
          willing_to_relocate: false,
        }, getToken); } catch(e) { console.error("Failed to save driving details:", e.message); }
      }
      if (d.sectors) {
        const s = d.sectors;
        const avail = Array.isArray(s.availability) ? s.availability : [];
        let preferredShift = null;
        if (avail.includes('Days') && avail.includes('Nights')) preferredShift = 'Either';
        else if (avail.includes('Days')) preferredShift = 'Days';
        else if (avail.includes('Nights')) preferredShift = 'Nights';
        else if (avail.length > 0) preferredShift = 'Either';
        try { await apiRequest('/api/profile/sectors', 'PUT', {
          sectors: s.sectors || [],
          preferred_shift: preferredShift,
          available_from: null,
          min_hourly_rate: null,
        }, getToken); } catch(e) { console.error('Failed to save sectors:', e.message); }
      }
      if (d.qualifications) {
        const q = d.qualifications;
        // frec_level only allows 'None', 'FREC 3', 'FREC 4'
        // Map certType to DB values
        const certType = q.certType || '';
        const hasEfaw = q.hasFirstAid === 'yes' && certType.includes('EFAW');
        const hasFaw = q.hasFirstAid === 'yes' && certType.includes('FAW');
        // frec_level: map display values to DB values
        let frecLevel = 'None';
        if (certType.includes('FREC Level 3') || certType === 'FREC 3') frecLevel = 'FREC 3';
        else if (certType.includes('FREC Level 4') || certType === 'FREC 4') frecLevel = 'FREC 4';
        else if (q.frec_level && q.frec_level !== 'None') frecLevel = q.frec_level;
        const validClearance = ['None','BPSS','SC','DV','CTC','Other'];
        const clearance = validClearance.includes(q.clearanceLevel||q.security_clearance) ? (q.clearanceLevel||q.security_clearance) : 'None';
        try { await apiRequest('/api/profile/qualifications', 'PUT', {
          frec_level: frecLevel,
          has_efaw: hasEfaw || q.has_efaw || false,
          has_faw: hasFaw || q.has_faw || false,
          first_aid_expiry: q.expiryYear && q.expiryMonth ? q.expiryYear+'-'+q.expiryMonth+'-01' : q.first_aid_expiry || null,
          languages: q.languages || [],
          is_sia_trainer: q.isSIATrainer === 'yes' || q.is_sia_trainer || false,
          security_clearance: clearance,
          security_clearance_ref: q.trainerDetails || q.security_clearance_ref || null,
          other_qualifications: q.otherQuals || q.issuingBody || q.other_qualifications || null,
        }, getToken); } catch(e) { console.error('Failed to save qualifications:', e.message); }
      }
      if (d.background) {
        const b = d.background;
        try { await apiRequest('/api/profile/background', 'PUT', {
          served_in_forces: b.hasForces === 'yes' || b.served_in_forces || false,
          forces_branch: b.forcesBranch || b.forces_branch || null,
          forces_rank: b.forcesRank || b.forces_rank || null,
          forces_years: parseInt(b.yearsServed || b.forces_years || 0) || null,
          forces_discharge_type: b.dischargeType || b.forces_discharge_type || null,
          served_in_police: false,
          has_criminal_record: b.hasCriminal === 'yes' || b.has_criminal_record || false,
          criminal_record: b.criminalDetails || b.criminal_record || null,
          has_dbs_certificate: false,
        }, getToken); } catch(e) { console.error('Failed to save background:', e.message); }
      }
      if (d.photo) {
        // Photo upload handled separately via Supabase Storage
        // Mark step complete in profile_step only
      }
      if (d.interview) {
        try { await apiRequest('/api/candidates/me/interview', 'PUT', d.interview, getToken);
        } catch(e) { console.error('Failed to save interview answers:', e.message); }
      }
      if (d.employment) {
        await apiRequest('/api/profile/employment/clear', 'DELETE', null, getToken);
        for (const job of d.employment) {
          if (!job.employer && !job.role) continue;
          if (!job.from) continue; // start_date required
          await apiRequest('/api/profile/employment', 'POST', {
            employer_name: job.employer || '',
            job_title: job.role || '',
            employer_address: [job.address1, job.address2, job.town, job.county, job.postcode].filter(Boolean).join(', ') || null,
            employer_postcode: job.postcode || null,
            reference_name: job.contactName || null,
            reference_job_title: job.contactTitle || null,
            reference_email: job.contactEmail || null,
            reference_phone: job.contactPhone || null,
            start_date: job.from ? job.from + '-01' : null,
            end_date: job.to ? job.to + '-01' : null,
            is_current: job.current || false,
            reason_for_leaving: job.reason || null,
          }, getToken);
        }
      }
      if (d.addresses) {
        await apiRequest('/api/profile/addresses/clear', 'DELETE', null, getToken);
        for (const addr of d.addresses) {
          if (!addr.line1 && !addr.town) continue;
          await apiRequest('/api/profile/addresses', 'POST', {
            address_line1: addr.line1 || addr.address_line1 || '',
            address_line2: addr.line2 || addr.address_line2 || null,
            city: addr.town || addr.city || '',
            postcode: addr.postcode || '',
            moved_in_date: addr.from ? addr.from + '-01' : addr.moved_in_date || null,
            moved_out_date: addr.to ? addr.to + '-01' : addr.moved_out_date || null,
            is_current: addr.current || addr.is_current || false,
          }, getToken);
        }
      }
      await apiRequest('/api/candidates/me/step', 'PATCH', { profile_step: step + 1 }, getToken);
    } catch(err) {
      console.error('Save error:', err);
      alert('Some data could not be saved: ' + err.message + '\n\nYour progress has been recorded. Please try again or contact support.');
    }
    setSaving(false);
  };

  if (loading) return <div style={{textAlign:'center',padding:'4rem',color:'#64748b'}}>Loading your profile...</div>;

  const addressesCoverFiveYears = () => {
    const addrs = profileData.addresses || [];
    if (!addrs.length) return false;
    const now = new Date();
    const fiveYearsAgo = new Date(now.getFullYear()-5, now.getMonth(), 1);
    let total = 0;
    addrs.forEach(a => {
      const from = a.moved_in_date ? new Date(a.moved_in_date) : (a.from ? new Date(a.from+'-01') : null);
      const to = (a.is_current || a.current) ? now : (a.moved_out_date ? new Date(a.moved_out_date) : (a.to ? new Date(a.to+'-01') : null));
      if (!from || !to) return;
      const start = from < fiveYearsAgo ? fiveYearsAgo : from;
      const end = to > now ? now : to;
      if (end > start) total += (end - start) / (1000*60*60*24*30.5);
    });
    return Math.round(total) >= 60;
  };

  const next = () => {
    if (step === 9 && !addressesCoverFiveYears()) {
      alert('You must cover a full 5-year address history before continuing. Add your previous addresses below.');
      return;
    }
    setStep(s => s + 1);
  };
  const back = () => setStep(s => s - 1);

  // Steps that require completion before advancing
  const stepKeys = ['licences','personal','driving','sectors','qualifications','background','employment','addresses'];
  const stepForIndex = { 1:'licences', 2:'personal', 3:'driving', 4:'sectors', 5:'qualifications', 6:'background', 8:'employment', 9:'addresses' };

  // Gated next — only advances if current step is complete
  const gatedNext = () => {
    if (step === 9 && !completedSteps.has('addresses') && !addressesCoverFiveYears()) {
      alert('You must cover a full 5-year address history before continuing. Add your previous addresses below.');
      return;
    }
    setStep(s => s + 1);
  };

  const stepContent = (() => {
    if(step === 0) return <><ProgressRings sections={sections}/><StepWelcome onNext={next} name={user?.firstName || 'there'}/></>;
    if(step === 1) return <><ProgressRings sections={sections}/><StepSIA data={profileData} onChange={update} onBack={back} onNext={gatedNext} isComplete={completedSteps.has('licences') && forceEditKey !== 'licences'}/></>;
    if(step === 2) return <><ProgressRings sections={sections}/><StepPersonal data={profileData} onChange={update} onBack={back} onNext={gatedNext} isComplete={completedSteps.has('personal') && forceEditKey !== 'personal'}/></>;
    if(step === 3) return <><ProgressRings sections={sections}/><StepDriving data={profileData} onChange={update} onBack={back} onNext={gatedNext} isComplete={completedSteps.has('driving') && forceEditKey !== 'driving'}/></>;
    if(step === 4) return <><ProgressRings sections={sections}/><StepSectors data={profileData} onChange={update} onBack={back} onNext={gatedNext} isComplete={completedSteps.has('sectors') && forceEditKey !== 'sectors'}/></>;
    if(step === 5) return <><ProgressRings sections={sections}/><StepQualifications data={profileData} onChange={update} onBack={back} onNext={gatedNext} isComplete={completedSteps.has('qualifications') && forceEditKey !== 'qualifications'}/></>;
    if(step === 6) return <><ProgressRings sections={sections}/><StepBackground data={profileData} onChange={update} onBack={back} onNext={gatedNext} isComplete={completedSteps.has('background') && forceEditKey !== 'background'}/></>;
    if(step === 7) return <><ProgressRings sections={sections}/><StepInterview data={profileData} onChange={update} onBack={back} onNext={next} isComplete={completedSteps.has('interview') && forceEditKey !== 'interview'}/></>;
    if(step === 8) return <><ProgressRings sections={sections}/><StepEmployment data={profileData} onChange={update} onBack={back} onNext={gatedNext} isComplete={completedSteps.has('employment') && forceEditKey !== 'employment'}/></>;
    if(step === 9) return <><ProgressRings sections={sections}/><StepAddress data={profileData} onChange={update} onBack={back} onNext={gatedNext} isComplete={completedSteps.has('addresses') && forceEditKey !== 'addresses'}/></>;
    if(step === 10) {
      const sectionToStep = [1,2,3,4,5,6,7,8,9];
      const sectionKeys = ['licences','personal','driving','sectors','qualifications','background','interview','employment','addresses'];
      return <><ProgressRings sections={sections}/><StepComplete name={user?.firstName || "there"} sections={sections} onGoToStep={i=>{setForceEditKey(sectionKeys[i]||null);setStep(sectionToStep[i]||1);}}/></>;
    }
    return <StepComplete name={user?.firstName || 'there'} sections={sections} onGoToStep={i=>{const m=[1,2,3,4,5,6,7,8,9];setStep(m[i]||1);}}/>;
  })();

  return (
    <>
      <div className="profile-layout">
        <div className="profile-form">{stepContent}</div>
        <CVPanel
          profileData={profileData}
          userName={user?.firstName ? user.firstName + ' ' + (user.lastName||'') : ''}
          mobileOpen={cvMobileOpen}
          onMobileClose={() => setCvMobileOpen(false)}
        />
      </div>
      <button className="cv-mobile-toggle" onClick={() => setCvMobileOpen(true)}>
        View my CV
      </button>
    </>
  );
}

// ── CV PANEL ──
function CVPanel({ profileData, userName, mobileOpen, onMobileClose }) {
  const [activeTab, setActiveTab] = React.useState('cv');
  const p = profileData.personal || {};
  const licences = profileData.licences || [];
  const employment = profileData.employment || [];
  const qualifications = profileData.qualifications || {};
  const driving = profileData.driving || {};
  const background = profileData.background || {};
  const addresses = profileData.addresses || [];
  const interview = profileData.interview || {};
  const sectors = profileData.sectors || {};

  const name = userName?.trim() || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Your Name';
  const phone = p.phone || '';
  const town = p.city || p.town || '';
  const postcode = p.postcode || '';

  const fmtDate = (d) => {
    if (!d) return '';
    const parts = String(d).split('-');
    if (parts.length >= 2) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const m = parseInt(parts[1]) - 1;
      return (months[m] || '') + ' ' + parts[0];
    }
    return d;
  };

  const sectionStyle = { marginBottom:'1.25rem' };
  const titleStyle = { fontSize:'0.62rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.12em', color:'#1a52a8', borderBottom:'1.5px solid #1a52a8', paddingBottom:'0.2rem', marginBottom:'0.6rem' };
  const jobStyle = { marginBottom:'0.75rem', paddingBottom:'0.75rem', borderBottom:'1px solid #f1f5f9' };

  const CandidateCV = () => (
    <div className="cv-doc">
      {/* Header */}
      <div style={{marginBottom:'1rem',paddingBottom:'0.875rem',borderBottom:'2px solid #0b1222'}}>
        <div style={{fontSize:'1.25rem',fontWeight:900,color:'#0b1222',letterSpacing:'-0.02em'}}>{name}</div>
        <div style={{fontSize:'0.75rem',color:'#64748b',marginTop:'0.2rem'}}>
          {[phone, town && postcode ? town+', '+postcode : town||postcode].filter(Boolean).join(' · ')}
          {licences.length > 0 && ' · SIA Licensed'}
        </div>
        {licences.length > 0 && (
          <div style={{marginTop:'0.4rem',display:'flex',flexWrap:'wrap',gap:'0.3rem'}}>
            {licences.map((l,i) => (
              <span key={i} style={{fontSize:'0.65rem',fontWeight:700,padding:'0.15rem 0.5rem',borderRadius:'999px',background:l.verified?'#dcfce7':'#fef9c3',color:l.verified?'#15803d':'#854d0e',border:`1px solid ${l.verified?'#bbf7d0':'#fde047'}`}}>
                {l.verified?'✓ ':'⏳ '}{l.licence_type||l.type}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Personal Statement */}
      {(interview.whyHire || employment.length > 0) && (
        <div style={sectionStyle}>
          <div style={titleStyle}>Professional Profile</div>
          <div style={{fontSize:'0.78rem',lineHeight:'1.65',color:'#374151'}}>
            {interview.whyHire || (
              `${name} is a${licences.length > 0 ? ` SIA licensed ${licences.map(l=>l.licence_type||l.type).filter(Boolean).join(' and ')} professional` : ' security professional'} with experience across ${(sectors.sectors||[]).slice(0,2).join(' and ') || 'the security sector'}. ${driving.has_driving_licence||driving.hasLicence==='yes'?'Full UK driving licence held. ':''}${qualifications.has_efaw||qualifications.has_faw?'First Aid certified. ':''}${background.served_in_forces?'Former '+background.forces_branch+'. ':''}Available and ready to deploy.`
            )}
          </div>
        </div>
      )}

      {/* Core Competencies */}
      {(licences.length > 0 || (sectors.sectors||[]).length > 0 || qualifications.security_clearance) && (
        <div style={sectionStyle}>
          <div style={titleStyle}>Core Competencies</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.25rem 1rem',fontSize:'0.75rem',color:'#374151'}}>
            {licences.map((l,i) => <div key={'l'+i} style={{display:'flex',alignItems:'center',gap:'0.3rem'}}><span style={{color:'#1a52a8',fontWeight:700}}>›</span>{l.licence_type||l.type}</div>)}
            {(sectors.sectors||[]).map((s,i) => <div key={'s'+i} style={{display:'flex',alignItems:'center',gap:'0.3rem'}}><span style={{color:'#1a52a8',fontWeight:700}}>›</span>{s}</div>)}
            {(qualifications.has_efaw) && <div style={{display:'flex',alignItems:'center',gap:'0.3rem'}}><span style={{color:'#1a52a8',fontWeight:700}}>›</span>Emergency First Aid (EFAW)</div>}
            {(qualifications.has_faw) && <div style={{display:'flex',alignItems:'center',gap:'0.3rem'}}><span style={{color:'#1a52a8',fontWeight:700}}>›</span>First Aid at Work (FAW)</div>}
            {qualifications.security_clearance && qualifications.security_clearance !== 'None' && <div style={{display:'flex',alignItems:'center',gap:'0.3rem'}}><span style={{color:'#1a52a8',fontWeight:700}}>›</span>{qualifications.security_clearance} Clearance</div>}
            {(driving.has_driving_licence||driving.hasLicence==='yes') && <div style={{display:'flex',alignItems:'center',gap:'0.3rem'}}><span style={{color:'#1a52a8',fontWeight:700}}>›</span>Full UK Driving Licence</div>}
            {(driving.has_own_vehicle||driving.hasTransport==='yes') && <div style={{display:'flex',alignItems:'center',gap:'0.3rem'}}><span style={{color:'#1a52a8',fontWeight:700}}>›</span>Own Transport</div>}
            {background.served_in_forces && <div style={{display:'flex',alignItems:'center',gap:'0.3rem'}}><span style={{color:'#1a52a8',fontWeight:700}}>›</span>{background.forces_branch} Veteran</div>}
            {(qualifications.languages||[]).map((l,i) => <div key={'lang'+i} style={{display:'flex',alignItems:'center',gap:'0.3rem'}}><span style={{color:'#1a52a8',fontWeight:700}}>›</span>{l}</div>)}
          </div>
        </div>
      )}

      {/* Employment */}
      {employment.length > 0 && (
        <div style={sectionStyle}>
          <div style={titleStyle}>Employment History</div>
          {employment.map((j,i) => {
            const employer = j.employer || j.employer_name || '';
            const role = j.role || j.job_title || '';
            const from = j.from || j.start_date || '';
            const to = j.to || j.end_date || '';
            const current = j.current || j.is_current;
            const duties = j.duties || '';
            const sector = j.sector || '';
            return (
              <div key={i} style={{...jobStyle, ...(i === employment.length-1 ? {borderBottom:'none',paddingBottom:0} : {})}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'0.5rem'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:'0.82rem',color:'#0b1222'}}>{role}</div>
                    <div style={{fontSize:'0.75rem',color:'#475569',fontWeight:500}}>{employer}{sector ? ' · '+sector : ''}</div>
                  </div>
                  <div style={{fontSize:'0.7rem',color:'#94a3b8',whiteSpace:'nowrap',fontWeight:500}}>
                    {fmtDate(from)} — {current ? 'Present' : fmtDate(to)}
                  </div>
                </div>
                {duties && (
                  <div style={{marginTop:'0.35rem',fontSize:'0.73rem',color:'#4b5563',lineHeight:'1.6'}}>
                    {duties}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Qualifications */}
      {(qualifications.frec_level && qualifications.frec_level !== 'None') || qualifications.has_efaw || qualifications.has_faw || qualifications.is_sia_trainer ? (
        <div style={sectionStyle}>
          <div style={titleStyle}>Qualifications & Training</div>
          <div style={{fontSize:'0.75rem',color:'#374151',lineHeight:'1.8'}}>
            {qualifications.frec_level && qualifications.frec_level !== 'None' && <div>{qualifications.frec_level}</div>}
            {qualifications.has_efaw && <div>Emergency First Aid at Work (EFAW)</div>}
            {qualifications.has_faw && <div>First Aid at Work (FAW)</div>}
            {qualifications.is_sia_trainer && <div>Qualified SIA Trainer / Assessor</div>}
            {qualifications.other_qualifications && <div>{qualifications.other_qualifications}</div>}
          </div>
        </div>
      ) : null}

      {/* Military/Police */}
      {background.served_in_forces && (
        <div style={sectionStyle}>
          <div style={titleStyle}>Service Background</div>
          <div style={{...jobStyle, borderBottom:'none', paddingBottom:0}}>
            <div style={{fontWeight:700,fontSize:'0.82rem',color:'#0b1222'}}>{background.forces_rank || 'Veteran'}</div>
            <div style={{fontSize:'0.75rem',color:'#475569'}}>{background.forces_branch}{background.forces_years ? ' · '+background.forces_years+' years served' : ''}</div>
            {background.forces_discharge_type && <div style={{fontSize:'0.72rem',color:'#64748b',marginTop:'0.2rem'}}>{background.forces_discharge_type}</div>}
          </div>
        </div>
      )}

      {/* Interview answers - strongest achievement */}
      {interview.proudOf && (
        <div style={sectionStyle}>
          <div style={titleStyle}>Career Highlight</div>
          <div style={{fontSize:'0.75rem',color:'#374151',lineHeight:'1.6',fontStyle:'italic'}}>"{interview.proudOf}"</div>
        </div>
      )}

      {/* Availability */}
      {(interview.availability || interview.salary) && (
        <div style={sectionStyle}>
          <div style={titleStyle}>Availability & Rate</div>
          <div style={{fontSize:'0.75rem',color:'#374151',display:'flex',gap:'2rem'}}>
            {interview.availability && <div><span style={{fontWeight:600}}>Available: </span>{interview.availability}</div>}
            {interview.salary && <div><span style={{fontWeight:600}}>Rate: </span>{interview.salary}</div>}
          </div>
        </div>
      )}

      <div style={{marginTop:'1rem',fontSize:'0.65rem',color:'#94a3b8',textAlign:'center'}}>References available on request · SIA Licence verified by UKSecurityJobs.co.uk</div>

      {employment.length === 0 && licences.length === 0 && (
        <div style={{color:'#94a3b8',fontSize:'0.78rem',textAlign:'center',padding:'2rem 0'}}>
          Your CV builds automatically as you complete each step.
        </div>
      )}
    </div>
  );

  const VettingProfile = () => (
    <div className="cv-doc">
      <div style={{marginBottom:'1rem',paddingBottom:'0.875rem',borderBottom:'2px solid #0b1222'}}>
        <div style={{fontSize:'1.1rem',fontWeight:900,color:'#0b1222'}}>{name}</div>
        <div style={{fontSize:'0.68rem',color:'#64748b',marginTop:'0.15rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em'}}>BS7858 Vetting Profile · Generated {new Date().toLocaleDateString('en-GB')}</div>
      </div>

      {/* Personal */}
      <div style={sectionStyle}>
        <div style={titleStyle}>Personal Details</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem',fontSize:'0.73rem'}}>
          {phone && <div><span style={{color:'#94a3b8',fontWeight:600,display:'block',fontSize:'0.62rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>Phone</span>{phone}</div>}
          {p.date_of_birth && <div><span style={{color:'#94a3b8',fontWeight:600,display:'block',fontSize:'0.62rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>Date of Birth</span>{p.date_of_birth}</div>}
          {p.ni_number && <div><span style={{color:'#94a3b8',fontWeight:600,display:'block',fontSize:'0.62rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>NI Number</span>••••••••</div>}
          {postcode && <div><span style={{color:'#94a3b8',fontWeight:600,display:'block',fontSize:'0.62rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>Postcode</span>{postcode}</div>}
        </div>
      </div>

      {/* SIA */}
      {licences.length > 0 && (
        <div style={sectionStyle}>
          <div style={titleStyle}>SIA Licences</div>
          {licences.map((l,i) => (
            <div key={i} style={{marginBottom:'0.5rem',fontSize:'0.73rem'}}>
              <div style={{fontWeight:700,color:'#0b1222'}}>{l.licence_type||l.type}</div>
              <div style={{color:'#64748b'}}>Expires: {fmtDate(l.expiry_date||l.expiry)} · <span style={{color:l.verified?'#15803d':'#a16207',fontWeight:600}}>{l.verified?'Verified':'Pending verification'}</span></div>
            </div>
          ))}
        </div>
      )}

      {/* Address history */}
      {addresses.length > 0 && (
        <div style={sectionStyle}>
          <div style={titleStyle}>Address History</div>
          {addresses.map((a,i) => (
            <div key={i} style={{marginBottom:'0.4rem',fontSize:'0.73rem'}}>
              <div style={{fontWeight:600,color:'#0b1222'}}>{[a.address_line1||a.line1, a.city||a.town, a.postcode].filter(Boolean).join(', ')}</div>
              <div style={{color:'#64748b'}}>{fmtDate(a.moved_in_date||a.from)} — {a.is_current||a.current?'Present':fmtDate(a.moved_out_date||a.to)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Employment with full reference details */}
      {employment.length > 0 && (
        <div style={sectionStyle}>
          <div style={titleStyle}>Employment History</div>
          {employment.map((j,i) => {
            const employer = j.employer || j.employer_name || '';
            const role = j.role || j.job_title || '';
            const from = j.from || j.start_date || '';
            const to = j.to || j.end_date || '';
            const current = j.current || j.is_current;
            return (
              <div key={i} style={{...jobStyle, ...(i===employment.length-1?{borderBottom:'none',paddingBottom:0}:{}), fontSize:'0.73rem'}}>
                <div style={{fontWeight:700,color:'#0b1222'}}>{role} — {employer}</div>
                <div style={{color:'#64748b',marginBottom:'0.25rem'}}>{fmtDate(from)} — {current?'Present':fmtDate(to)}</div>
                {j.employer_address && <div style={{color:'#475569'}}>Address: {j.employer_address}</div>}
                {(j.reference_name||j.contactName) && (
                  <div style={{marginTop:'0.25rem',background:'#f8fafc',borderRadius:'4px',padding:'0.3rem 0.5rem',fontSize:'0.7rem'}}>
                    <span style={{fontWeight:600}}>Reference: </span>{j.reference_name||j.contactName}
                    {(j.reference_job_title||j.contactTitle) ? ' ('+( j.reference_job_title||j.contactTitle)+')' : ''}
                    {(j.reference_email||j.contactEmail) ? ' · '+(j.reference_email||j.contactEmail) : ''}
                    {(j.reference_phone||j.contactPhone) ? ' · '+(j.reference_phone||j.contactPhone) : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Criminal disclosure */}
      <div style={sectionStyle}>
        <div style={titleStyle}>Criminal Disclosure</div>
        <div style={{fontSize:'0.73rem',color:'#374151'}}>
          {background.has_criminal_record ? 'Unspent convictions declared — see attached disclosure' : 'No unspent convictions declared by candidate'}
        </div>
      </div>

      <div style={{marginTop:'1rem',fontSize:'0.62rem',color:'#94a3b8',borderTop:'1px solid #f1f5f9',paddingTop:'0.5rem'}}>
        This document is confidential and for vetting purposes only · UKSecurityJobs.co.uk · {new Date().toLocaleDateString('en-GB')}
      </div>
    </div>
  );

  const panelContent = (
    <>
      <div className="cv-panel-tabs">
        <button className={'cv-tab'+(activeTab==='cv'?' active':'')} onClick={()=>setActiveTab('cv')}>CV</button>
        <button className={'cv-tab'+(activeTab==='vetting'?' active':'')} onClick={()=>setActiveTab('vetting')}>Vetting</button>
      </div>
      <div className="cv-panel-body">
        {activeTab === 'cv' ? <CandidateCV/> : <VettingProfile/>}
      </div>
      <div className="cv-actions">
        <button className="cv-dl-btn primary" onClick={()=>window.print()}>Download CV</button>
        <button className="cv-dl-btn secondary" onClick={()=>window.print()}>Download Profile</button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop panel */}
      <div className="cv-panel">{panelContent}</div>

      {/* Mobile drawer */}
      <div className={'cv-mobile-drawer'+(mobileOpen?' open':'')} onClick={onMobileClose}>
        <div className="cv-mobile-sheet" onClick={e=>e.stopPropagation()}>
          <div className="cv-mobile-handle"></div>
          <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            {panelContent}
          </div>
        </div>
      </div>
    </>
  );
}

// ── INDUSTRY FACTS ──
const industryFacts = [
  {
    title: 'BS7858 Vetting',
    fact: 'The BS7858 vetting standard was first introduced in 1996. Today it is a contractual requirement on most UK security contracts.',
    why: 'Your employment and address history needs to be accurate, complete and verifiable. A single unexplained gap can fail a vetting check before it even starts.'
  },
  {
    title: '350,000+ SIA Licence Holders',
    fact: 'There are over 350,000 active SIA licensed security professionals in the UK — one of the largest regulated workforces in the country.',
    why: 'In a crowded market, a complete verified profile is what separates you. Employers on this platform see your vettability score before they see anyone else\'s CV.'
  },
  {
    title: 'SIA Licence Expiry',
    fact: 'Every SIA licence is valid for 3 years. Thousands of professionals lose work every year simply because they let their licence lapse.',
    why: 'Add your licence expiry date to your profile and we will alert you before it expires — so you never lose a day\'s work to an avoidable admin issue.'
  },
  {
    title: '£4.3 Billion Industry',
    fact: 'The UK private security industry generates over £4.3 billion annually, with demand growing every year across retail, events, corporate and public sector.',
    why: 'The roles are there. A complete profile with your preferred sectors selected means you get matched to the right opportunities — not just any opportunity.'
  },
  {
    title: 'Dual SIA Licences',
    fact: 'Around 60% of UK security professionals hold more than one SIA licence type — door supervisor plus CCTV, or close protection plus security guard.',
    why: 'Every additional licence you hold is another door that opens. Add all your licences to your profile — each one increases the roles you can be matched to.'
  },
  {
    title: 'Right to Work Checks',
    fact: 'Employers face unlimited fines for employing someone without the legal right to work in the UK — and the check must be done before day one.',
    why: 'Upload your right to work documents now and employers can confirm compliance before they even interview you. It removes a barrier and speeds up your start date.'
  },
  {
    title: '5-Year History Required',
    fact: 'BS7858 requires a fully verified 5-year employment and address history with no unexplained gaps — not 2 years, not 3 years. Five.',
    why: 'Most candidates underestimate how far back this goes. Start building your history now — the further back you go, the more complete and credible your profile becomes.'
  },
  {
    title: 'The Private Security Industry Act 2001',
    fact: 'The 2001 Act made SIA licensing mandatory, establishing UK security as one of the most professionally regulated industries in Europe.',
    why: 'Your licence is your legal right to work. Keeping it verified and current on your profile is the single most important thing you can do for your career.'
  },
];

// ── DASHBOARD ──
function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [fact] = React.useState(() => industryFacts[Math.floor(Math.random() * industryFacts.length)]);
  const [profileData, setProfileData] = React.useState(null);

  React.useEffect(() => {
    async function load() {
      try {
        const full = await apiRequest('/api/candidates/me/full', 'GET', null, getToken);
        setProfileData({
          licences: full.licences || [],
          personal: full.personal || null,
          employment: full.employment || [],
          addresses: full.addresses || [],
          driving: full.driving || null,
          sectors: full.sectors || null,
          qualifications: full.qualifications || null,
          background: full.background || null,
        });
      } catch(err) { console.error('Dashboard load error:', err); }
    }
    load();
  }, []);

  const sections = [
    { name:'SIA Licence', short:'SIA', complete: profileData?.licences?.[0]?.verified === true, pending: !!profileData?.licences?.[0] && !profileData?.licences?.[0]?.verified, started: !!profileData?.licences?.[0] },
    { name:'Personal Details', short:'Name', complete: !!(profileData?.personal?.phone || profileData?.personal?.first_name), started: !!profileData?.personal },
    { name:'Driving & Transport', short:'Drive', complete: !!profileData?.driving, started: !!profileData?.driving },
    { name:'Sectors & Availability', short:'Work', complete: !!(profileData?.sectors?.sectors?.length || profileData?.sectors?.preferred_shift), started: !!profileData?.sectors },
    { name:'Qualifications', short:'Quals', complete: !!profileData?.qualifications, started: !!profileData?.qualifications },
    { name:'Criminal Record', short:'Record', complete: !!(profileData?.background?.has_criminal_record !== undefined || profileData?.background?.has_criminal_record !== null) && !!profileData?.background, started: !!profileData?.background },
    { name:'Work History', short:'Work H', complete: profileData?.employment?.length > 0, started: !!profileData?.employment?.length },
    { name:'Address History', short:'Addr', complete: profileData?.addresses?.length > 0, started: !!profileData?.addresses?.length },
  ];

  const completed = sections.filter(s => s.complete).length;
  const total = sections.length;
  const pct = Math.round((completed / total) * 100);
  const scoreLabel = pct >= 80 ? 'Premium roles unlocked' : pct >= 60 ? 'Standard roles unlocked' : 'Complete your profile to unlock roles';
  const scoreColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#1a52a8';

  return (
    <div className="page" style={{background:'var(--off)'}}>
      <Nav/>
      <div className="dashboard">
        <div className="dash-header">
          <div className="dash-greeting">Welcome back, {user?.firstName || 'Officer'}</div>
          <div className="dash-sub">Complete your profile to unlock security vacancies and exclusive member benefits.</div>
        </div>

        {/* PROGRESS + CTA */}
        <div className="dash-card" style={{marginBottom:'1.5rem'}}>
          <div className="dash-card-top">
            <div>
              <div className="dash-progress-label">Your Vettability Score</div>
              <div className="dash-progress-status" style={{color:scoreColor}}>{scoreLabel}</div>
            </div>
            <button className="btn-next" style={{whiteSpace:'nowrap'}} onClick={()=>navigate('/profile')}>
              Continue Profile ›
            </button>
          </div>
          <ProgressRings sections={sections}/>
          <div style={{display:'flex',flexWrap:'wrap',gap:'0.5rem',marginTop:'1rem'}}>
            {sections.map((s,i) => (
              <span key={i}
                style={{fontSize:'0.72rem',padding:'0.3rem 0.75rem',borderRadius:'999px',border:'1px solid #e2e8f0',background: s.complete?'#f0fdf4':s.pending?'#fef9c3':'#f8fafc',color:s.complete?'#15803d':s.pending?'#854d0e':'#94a3b8',fontWeight:600}}>
                {s.complete ? '✓ ' : s.pending ? '⏳ ' : '○ '}{s.name}
              </span>
            ))}
          </div>
          <div style={{marginTop:'0.75rem',fontSize:'0.78rem',color:'#64748b'}}>
            Click <strong>Continue Profile</strong> above to edit any section.
          </div>
        </div>

        {/* SUBTLE FACT */}
        <div className="dash-fact-subtle">
          <div className="dash-fact-inner">
            <span className="dash-fact-label">Did you know?</span>
            <span className="dash-fact-title">{fact.title}</span>
            <span className="dash-fact-txt">{fact.fact}</span>
            <span className="dash-fact-why"><strong>Why this matters to you —</strong> {fact.why}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AUTH PAGES ──
function SignUpPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', gdprConsent: false });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const clerk = useClerk();

  const handleRegister = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    if (!form.gdprConsent) { setError('You must agree to the privacy policy to continue.'); setLoading(false); return; }
    try {
      const result = await clerk.client.signUp.create({
        firstName: form.firstName, lastName: form.lastName,
        emailAddress: form.email, password: form.password,
      });
      await result.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep(2);
    } catch(err) { setError(err.errors?.[0]?.message || 'Something went wrong. Please try again.'); }
    setLoading(false);
  };

  const handleVerifyAndCreate = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const result = await clerk.client.signUp.attemptEmailAddressVerification({ code });
      await clerk.setActive({ session: result.createdSessionId });
      // Create candidate record in secure API
      const token = await result.createdSessionId;
      try {
        await fetch('https://uksecurityjobs-api.onrender.com/api/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ email: form.email, gdpr_consent: true })
        });
      } catch(apiErr) { console.error('API create failed:', apiErr); }
      setTimeout(() => { window.location.href = '/profile'; }, 500);
    } catch(err) { setError(err.errors?.[0]?.message || 'Invalid code. Please try again.'); }
    setLoading(false);
  };

  const handleVerify = handleVerifyAndCreate;

  return (
    <div className="page">
      <Nav/>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo"><Logo/></div>
          {step === 1 ? <>
            <div className="auth-title">Create your profile</div>
            <div className="auth-sub">Join the UK's only verified security jobs platform</div>
            <form className="auth-form" onSubmit={handleRegister}>
              {error && <div className="auth-error">{error}</div>}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                <div className="field"><label className="field-label">First Name</label><input className="f-input" type="text" required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} placeholder="John"/></div>
                <div className="field"><label className="field-label">Last Name</label><input className="f-input" type="text" required value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} placeholder="Smith"/></div>
              </div>
              <div className="field"><label className="field-label">Email Address</label><input className="f-input" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="your@email.com"/></div>
              <div className="field"><label className="field-label">Password</label><input className="f-input" type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min. 8 characters"/></div>
              <div className="field" style={{marginTop:'0.5rem'}}>
                <label style={{display:'flex',alignItems:'flex-start',gap:'0.75rem',cursor:'pointer',fontSize:'0.85rem',color:'#374151',lineHeight:'1.5'}}>
                  <input type="checkbox" required checked={form.gdprConsent} onChange={e=>setForm({...form,gdprConsent:e.target.checked})} style={{marginTop:'3px',flexShrink:0}}/>
                  <span>I agree to the <a href="https://www.uksecurityjobs.co.uk/privacy.html" target="_blank" rel="noopener noreferrer" style={{color:'#1a52a8'}}>Privacy Policy</a> and consent to UKSecurityJobs storing my personal data securely for the purpose of matching me with security employment opportunities. I understand I can withdraw consent at any time.</span>
                </label>
              </div>
              <button className="btn-full" type="submit" disabled={loading}>{loading?'Creating account...':'Create My Profile →'}</button>
            </form>
            <div className="auth-footer">Already registered? <a href="/sign-in">Sign in</a></div>
          </> : <>
            <div className="auth-title">Verify your email</div>
            <div className="auth-sub">We sent a 6-digit code to {form.email}</div>
            <form className="auth-form" onSubmit={handleVerify}>
              {error && <div className="auth-error">{error}</div>}
              <div className="field"><label className="field-label">Verification Code</label><input className="f-input" type="text" required value={code} onChange={e=>setCode(e.target.value)} placeholder="000000" style={{textAlign:'center',fontSize:'1.5rem',letterSpacing:'0.4em'}} maxLength={6}/></div>
              <button className="btn-full" type="submit" disabled={loading}>{loading?'Verifying...':'Verify & Continue →'}</button>
            </form>
          </>}
        </div>
      </div>
    </div>
  );
}

function SignInPage() {
  const [form, setForm] = useState({ email:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const clerk = useClerk();
  const handleSignIn = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const result = await clerk.client.signIn.create({ identifier: form.email, password: form.password });
      await clerk.setActive({ session: result.createdSessionId });
      setTimeout(() => { window.location.href = '/dashboard'; }, 500);
    } catch(err) { setError(err.errors?.[0]?.message || 'Invalid email or password.'); }
    setLoading(false);
  };
  return (
    <div className="page">
      <Nav/>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo"><Logo/></div>
          <div className="auth-title">Welcome back</div>
          <div className="auth-sub">Sign in to your UK Security Jobs account</div>
          <form className="auth-form" onSubmit={handleSignIn}>
            {error && <div className="auth-error">{error}</div>}
            <div className="field"><label className="field-label">Email Address</label><input className="f-input" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="your@email.com"/></div>
            <div className="field"><label className="field-label">Password</label><input className="f-input" type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Your password"/></div>
            <div style={{textAlign:'right',marginBottom:'0.5rem'}}><a href="/forgot-password" style={{fontSize:'0.82rem',color:'var(--blue)'}}>Forgot password?</a></div>
            <button className="btn-full" type="submit" disabled={loading}>{loading?'Signing in...':'Sign In →'}</button>
          </form>
          <div className="auth-footer">Not registered? <a href="/sign-up">Create your profile</a></div>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordPage() {
  const [step, setStep] = React.useState(1);
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const clerk = useClerk();

  const sendCode = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await clerk.client.signIn.create({ strategy: 'reset_password_email_code', identifier: email });
      setStep(2);
    } catch(err) { setError(err.errors?.[0]?.message || 'Could not find that email address.'); }
    setLoading(false);
  };

  const resetPassword = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const result = await clerk.client.signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code, password });
      await clerk.setActive({ session: result.createdSessionId });
      window.location.href = '/dashboard';
    } catch(err) { setError(err.errors?.[0]?.message || 'Invalid code or password too weak.'); }
    setLoading(false);
  };

  return (
    <div className="page">
      <Nav/>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo"><Logo/></div>
          {step === 1 ? <>
            <div className="auth-title">Reset your password</div>
            <div className="auth-sub">Enter your email and we'll send you a reset code.</div>
            <form className="auth-form" onSubmit={sendCode}>
              {error && <div className="auth-error">{error}</div>}
              <div className="field"><label className="field-label">Email Address</label><input className="f-input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"/></div>
              <button className="btn-full" type="submit" disabled={loading}>{loading?'Sending...':'Send Reset Code'}</button>
            </form>
            <div className="auth-footer"><a href="/sign-in">Back to sign in</a></div>
          </> : <>
            <div className="auth-title">Set new password</div>
            <div className="auth-sub">Enter the code we sent to {email} and choose a new password.</div>
            <form className="auth-form" onSubmit={resetPassword}>
              {error && <div className="auth-error">{error}</div>}
              <div className="field"><label className="field-label">Reset Code</label><input className="f-input" type="text" required value={code} onChange={e=>setCode(e.target.value)} placeholder="000000" style={{textAlign:'center',fontSize:'1.5rem',letterSpacing:'0.4em'}} maxLength={6}/></div>
              <div className="field"><label className="field-label">New Password</label><input className="f-input" type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 8 characters"/></div>
              <button className="btn-full" type="submit" disabled={loading}>{loading?'Resetting...':'Reset Password →'}</button>
            </form>
          </>}
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  return <><SignedIn>{children}</SignedIn><SignedOut><Navigate to="/sign-in" replace/></SignedOut></>;
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
          <Route path="/sign-up" element={<SignUpPage/>}/>
          <Route path="/sign-in" element={<SignInPage/>}/>
          <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/>
          <Route path="/profile" element={<ProtectedRoute><div className="page" style={{background:'var(--off)'}}><Nav/><ProfileBuilder/></div></ProtectedRoute>}/>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}
