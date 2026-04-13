import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, useUser, useClerk, useAuth } from '@clerk/clerk-react';
import { apiRequest } from './api';
import './styles.css';

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
  const [licences, setLicences] = useState(data.licences || [{ type:'', number:'', expiry:'' }]);
  const addLicence = () => setLicences([...licences, { type:'', number:'', expiry:'' }]);
  const updateLicence = (i, field, val) => {
    const updated = licences.map((l,idx) => idx===i ? {...l,[field]:val} : l);
    setLicences(updated);
  };
  const removeLicence = (i) => setLicences(licences.filter((_,idx) => idx!==i));
  const save = () => { onChange({ licences }); onNext(); };
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
              <Select value={lic.type} onChange={e=>updateLicence(i,'type',e.target.value)}>
                <option value="">Select type</option>
                {licenceTypes.map(t=><option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="SIA Licence Number" hint="Your 16-digit licence number">
              <Input type="text" placeholder="0000 0000 0000 0000" maxLength={19} value={lic.number}
                onChange={e=>updateLicence(i,'number',e.target.value)}/>
            </Field>
            <Field label="Expiry Date">
              <Input type="date" value={lic.expiry} onChange={e=>updateLicence(i,'expiry',e.target.value)}/>
            </Field>
          </div>
          {lic.number && <div className="pending-badge">Pending verification — our team will check this against the SIA register within 24 hours</div>}
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
  const raw = data.personal;
  const existingMovedIn = raw?.move_in_date || raw?.movedIn || '';
  const [form, setForm] = useState({
    phone: raw?.phone || '',
    dobDay: raw?.dob ? raw.dob.split('-')[2] : '',
    dobMonth: raw?.dob ? raw.dob.split('-')[1] : '',
    dobYear: raw?.dob ? raw.dob.split('-')[0] : '',
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
          { label:'Phone', value: d.phone || '' },
          { label:'Date of Birth', value: d.date_of_birth || d.dob || '' },
          { label:'NI Number', value: d.ni_number || d.ni ? '••••••••' : '' },
          { label:'Address', value: [d.address_line1||d.address1, d.city||d.town, d.postcode].filter(Boolean).join(', ') },
          { label:'Moved In', value: d.move_in_date || d.movedIn || '' },
          { label:'SIA Address Match', value: d.sia_address_match === true ? 'Yes' : d.sia_address_match === false ? 'No — update needed' : d.siaAddress === 'yes' ? 'Yes' : d.siaAddress === 'no' ? 'No' : '' },
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
      <div style={{fontWeight:700,fontSize:'1rem',color:'#0b1222',marginBottom:'1rem'}}>Current Address</div>

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
          <div className="address-warning" style={{marginTop:'1rem'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
            You have lived here for <strong>{label}</strong>. BS7858 requires a full 5-year address history with no gaps. Add every previous address below — exact dates, no gaps.
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
  const [form, setForm] = useState(data.driving || {
    hasLicence: '', licenceType:'', licenceNumber:'', yearsHeld:'', points:'', endorsements:[], hasBan:'', banDate:'', banDuration:'', banReason:'',
    hasTransport:'', vehicleType:'', taxed:'', moted:'', insured:'', travelRadius:'',
    dvlaAddress:''
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
              <option value="">Select</option><option>Full</option><option>Provisional</option>
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
          <Field label="Date of ban"><Input type="date" value={form.banDate} onChange={v=>u('banDate',v)}/></Field>
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
              {['Up to 10 miles','Up to 25 miles','Up to 50 miles','Up to 100 miles','Nationwide'].map(r=><option key={r}>{r}</option>)}
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
  const raw = data.sectors;
  const [form, setForm] = useState({
    sectors: Array.isArray(raw?.sectors) ? raw.sectors : [],
    availability: Array.isArray(raw?.availability) ? raw.availability : [],
    availabilityAll: false,
    shiftType: Array.isArray(raw?.shiftType) ? raw.shiftType : [],
    employmentType: raw?.employmentType || ''
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
  const [form, setForm] = useState(data.qualifications || {
    hasFirstAid:'', certType:'', issuingBody:'', certNumber:'', dateAchieved:'', expiry:'',
    hasUniform:'', hasPPE:'', languages:[], isSIATrainer:'', trainerDetails:'',
    hasClearance:'', clearanceLevel:'', clearanceActive:''
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
          <Field label="Date Achieved"><Input type="date" value={form.dateAchieved} onChange={v=>u('dateAchieved',v)}/></Field>
          <Field label="Expiry Date"><Input type="date" value={form.expiry} onChange={v=>u('expiry',v)}/></Field>
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
  const [form, setForm] = useState(data.background || {
    hasForces:'', forcesBranch:'', forcesRank:'', forcesYears:'', forcesDischarge:'',
    hasBID:'', bidSchemes:'', hasCriminal:'', criminalDetails:''
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
      {form.hasCriminal==='yes' && <Field label="Please provide brief details" hint="Date, offence, sentence. This is confidential and only visible to you and our admin team."><textarea className="f-textarea" rows={3} value={form.criminalDetails} onChange={v=>u('criminalDetails',v)} placeholder="e.g. 2019 — SP30 — 3 points and £100 fine"/></Field>}
    </StepShell>
  );
}

// ── STEP 8: EMPLOYMENT HISTORY ──
function StepEmployment({ data, onChange, onBack, onNext, isComplete }) {
  const [editing, setEditing] = React.useState(!isComplete);
  const emptyJob = () => ({
    employer:'', role:'', sector:'', duties:'',
    address1:'', address2:'', town:'', county:'', postcode:'', website:'',
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
            {job.duties?.trim().length > 20 && (
              <button type="button"
                onClick={async () => {
                  update(i,'dutiesLoading',true);
                  try {
                    const res = await fetch('https://api.anthropic.com/v1/messages', {
                      method:'POST',
                      headers:{'Content-Type':'application/json'},
                      body: JSON.stringify({
                        model:'claude-sonnet-4-20250514',
                        max_tokens:500,
                        messages:[{role:'user',content:`You are helping a UK security officer write their CV. Fix any spelling and grammar errors in the following job duties text and make it professional, clear and concise. Keep it in first or third person consistently, use active voice, and make it suitable for a security industry CV. Return only the improved text with no preamble or explanation:\n\n${job.duties}`}]
                      })
                    });
                    const d = await res.json();
                    const improved = d.content?.[0]?.text;
                    if (improved) update(i,'duties',improved.trim());
                  } catch(e) { console.error(e); }
                  update(i,'dutiesLoading',false);
                }}
                style={{marginTop:'0.5rem',background:'#f0f4ff',color:'#1a52a8',border:'1px solid #bfdbfe',borderRadius:'6px',padding:'0.4rem 0.875rem',fontSize:'0.78rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:'0.4rem'}}
              >
                {job.dutiesLoading ? 'Improving...' : '✦ Fix spelling & grammar'}
              </button>
            )}
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
            <Field label="Company Website" hint="e.g. www.company.com"><Input type="text" placeholder="www.company.com" value={job.website||''} onChange={v=>update(i,'website',v)}/></Field>
            <Field label="Generic / HR Email" hint="e.g. hr@company.com"><Input type="email" placeholder="hr@company.com" value={job.contactEmail||''} onChange={v=>update(i,'contactEmail',v)}/></Field>
          </div>

          <div className="divider" style={{margin:'1rem 0 0.75rem'}}></div>
          <div style={{fontWeight:700,fontSize:'0.85rem',color:'#0b1222',marginBottom:'0.25rem'}}>Reference Contact *</div>
          <div style={{fontSize:'0.78rem',color:'#64748b',marginBottom:'0.75rem'}}>The HR manager, Operations manager or direct line manager who can verify your employment. This person will be contacted during vetting.</div>
          <div className="field-row">
            <Field label="Contact Name *"><Input type="text" placeholder="Full name" value={job.contactName||''} onChange={v=>update(i,'contactName',v)}/></Field>
            <Field label="Job Title"><Input type="text" placeholder="e.g. HR Manager" value={job.contactTitle||''} onChange={v=>update(i,'contactTitle',v)}/></Field>
          </div>
          <Field label="Direct Phone Number *" hint="Mobile or direct line — not a switchboard"><Input type="tel" placeholder="01234 567890" value={job.contactPhone||''} onChange={v=>update(i,'contactPhone',v)}/></Field>

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
  const [addresses, setAddresses] = useState(data.addresses || [{ line1:'', line2:'', town:'', postcode:'', fromMonth:'', fromYear:'', toMonth:'', toYear:'', current:false }]);
  const add = () => setAddresses([...addresses,{ line1:'', line2:'', town:'', postcode:'', fromMonth:'', fromYear:'', toMonth:'', toYear:'', current:false }]);
  const update = (i,f,v) => setAddresses(addresses.map((a,idx)=>idx===i?{...a,[f]:v}:a));
  const remove = (i) => setAddresses(addresses.filter((_,idx)=>idx!==i));
  const save = () => {
    const mapped = addresses.map(a => ({
      ...a,
      from: a.fromYear && a.fromMonth ? `${a.fromYear}-${a.fromMonth}` : a.from || '',
      to: a.toYear && a.toMonth ? `${a.toYear}-${a.toMonth}` : a.to || '',
    }));
    onChange({ addresses: mapped });
    onNext();
  };
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (isComplete && !editing) {
    return (
      <CompletedStep
        title="Address History"
        summary={[{label:"Addresses recorded",value:(data.addresses?.length||jobs?.length||0)+" address(es)"},{label:"Status",value:"Complete"}]}
        onEdit={() => setEditing(true)}
        onBack={onBack}
        onNext={onNext}
      />
    );
  }

  return (
    <StepShell step={9} total={11} title="Address History"
      why="A complete 5-year address history with no gaps is a core BS7858 requirement. Getting this right now means employers can start vetting immediately when you apply."
      onBack={onBack} onNext={save}>
      <div className="history-note">Cover the last <strong>5 years</strong> in full. Every address, exact dates. No gaps.</div>
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
function StepPhoto({ data, onChange, onBack, onNext }) {
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

  return (
    <StepShell step={8} total={11} title="Profile Photo"
      why="A clear photo helps our team verify your identity. This is the only reason we ask for it."
      onBack={onBack} onNext={onNext} nextLabel={uploaded ? 'Save & Continue' : 'Skip for now'}>
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
function StepComplete({ name }) {
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

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: `Write a professional cover letter for a UK security officer applying for the following role.

Candidate profile:
- Name: ${profile.name}
- SIA Licences: ${profile.licences || 'SIA licensed professional'}
- Recent experience: ${profile.employment || 'Security industry professional'}
- Additional: ${[profile.firstAid, profile.driving, profile.forces, profile.clearance].filter(Boolean).join(', ') || 'Experienced security professional'}

Application details:
- Role applying for: ${form.role || 'Security Officer'}
- Employer/company: ${form.employer || 'the organisation'}
- Their strongest quality: ${form.strength || 'reliability and professionalism'}
- Anything else to highlight: ${form.extra || ''}

Write a concise, professional 3-paragraph cover letter. Paragraph 1: introduce and state the role. Paragraph 2: relevant experience and strengths. Paragraph 3: enthusiasm and call to action. Use professional UK English. No spelling or grammar errors. Do not use generic phrases like "I am writing to apply". Return only the letter text, starting with "Dear Hiring Manager," and ending with "Yours sincerely," followed by the name.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text;
      if (text) { setLetter(text); setGenerated(true); }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const polish = async () => {
    if (!letter) return;
    setLoading(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: `Fix any spelling and grammar errors in this cover letter and make it more impactful while keeping it professional and authentic. Return only the improved letter:\n\n${letter}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text;
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
        const [candidateRes, personalRes, siaRes, drivingRes, sectorsRes, qualsRes, bgRes, empRes, addrRes] = await Promise.allSettled([
          apiRequest('/api/candidates/me', 'GET', null, getToken),
          apiRequest('/api/candidates/me/personal', 'GET', null, getToken),
          apiRequest('/api/sia', 'GET', null, getToken),
          apiRequest('/api/profile/driving', 'GET', null, getToken),
          apiRequest('/api/profile/sectors', 'GET', null, getToken),
          apiRequest('/api/profile/qualifications', 'GET', null, getToken),
          apiRequest('/api/profile/background', 'GET', null, getToken),
          apiRequest('/api/profile/employment', 'GET', null, getToken),
          apiRequest('/api/profile/addresses', 'GET', null, getToken),
        ]);

        const licences = siaRes.status === 'fulfilled' ? siaRes.value.licences : null;
        const personal = personalRes.status === 'fulfilled' ? personalRes.value.personal : null;
        const driving = drivingRes.status === 'fulfilled' ? drivingRes.value.driving : null;
        const sectors = sectorsRes.status === 'fulfilled' ? sectorsRes.value.sectors : null;
        const qualifications = qualsRes.status === 'fulfilled' ? qualsRes.value.qualifications : null;
        const background = bgRes.status === 'fulfilled' ? bgRes.value.background : null;
        const employment = empRes.status === 'fulfilled' ? empRes.value.employment : null;
        const addresses = addrRes.status === 'fulfilled' ? addrRes.value.addresses : null;

        setProfileData({ licences, personal, driving, sectors, qualifications, background, employment, photo: null, addresses });

        // Infer which steps are already complete from API data
        const completed = new Set();
        if (licences?.length) completed.add('licences');
        if (personal?.phone || personal?.first_name) completed.add('personal');
        if (driving) completed.add('driving');
        if (sectors) completed.add('sectors');
        if (qualifications) completed.add('qualifications');
        if (background) completed.add('background');
        if (employment?.length) completed.add('employment');
        if (addresses?.length) completed.add('addresses');
        setCompletedSteps(completed);

        if (candidateRes.status === 'fulfilled') {
          setStep(candidateRes.value.candidate?.profile_step || 0);
        }
      } catch(err) {
        console.error('Failed to load profile:', err);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const sections = [
    { name:'SIA Licence', short:'SIA', complete: profileData.licences?.[0]?.verified === true, pending: completedSteps.has('licences') && !profileData.licences?.[0]?.verified, started: completedSteps.has('licences') || !!profileData.licences?.[0] },
    { name:'Personal Details', short:'Info', complete: completedSteps.has('personal'), started: completedSteps.has('personal') || !!profileData.personal },
    { name:'Driving & Transport', short:'Drive', complete: completedSteps.has('driving'), started: completedSteps.has('driving') || !!profileData.driving },
    { name:'Sectors & Availability', short:'Work', complete: completedSteps.has('sectors'), started: completedSteps.has('sectors') || !!profileData.sectors },
    { name:'Qualifications', short:'Quals', complete: completedSteps.has('qualifications'), started: completedSteps.has('qualifications') || !!profileData.qualifications },
    { name:'Criminal Record', short:'Record', complete: completedSteps.has('background'), started: completedSteps.has('background') || !!profileData.background },
    { name:'Work History', short:'Work H', complete: completedSteps.has('employment'), started: completedSteps.has('employment') || !!profileData.employment?.length },
    { name:'Photo', short:'Photo', complete: completedSteps.has('photo'), started: completedSteps.has('photo') || !!profileData.photo?.uploaded },
    { name:'Address History', short:'Addr', complete: completedSteps.has('addresses'), started: completedSteps.has('addresses') || !!profileData.addresses?.length },
  ];

  const update = async (d) => {
    const merged = { ...profileData, ...d };
    setProfileData(merged);
    const stepKey = Object.keys(d)[0];
    setSaving(true);
    let saveOk = false;
    try {
      if (d.personal) await apiRequest('/api/candidates/me/personal', 'PUT', d.personal, getToken);
      if (d.licences) {
        for (const lic of d.licences) {
          if (lic.number) await apiRequest('/api/sia', 'POST', { licence_number: lic.number, licence_type: lic.type, expiry_date: lic.expiry }, getToken);
        }
      }
      if (d.driving) await apiRequest('/api/profile/driving', 'PUT', d.driving, getToken);
      if (d.sectors) await apiRequest('/api/profile/sectors', 'PUT', d.sectors, getToken);
      if (d.qualifications) await apiRequest('/api/profile/qualifications', 'PUT', d.qualifications, getToken);
      if (d.background) await apiRequest('/api/profile/background', 'PUT', d.background, getToken);
      if (d.employment) {
        for (const job of d.employment) {
          await apiRequest('/api/profile/employment', 'POST', {
            employer_name: job.employer, job_title: job.role,
            employer_address: [job.address1, job.address2, job.town, job.county, job.postcode].filter(Boolean).join(', '),
            employer_postcode: job.postcode,
            reference_name: job.contactName, reference_job_title: job.contactTitle,
            reference_email: job.contactEmail, reference_phone: job.contactPhone,
            start_date: job.from, end_date: job.to || null,
            is_current: job.current, reason_for_leaving: job.reason
          }, getToken);
        }
      }
      if (d.addresses) {
        for (const addr of d.addresses) {
          await apiRequest('/api/profile/addresses', 'POST', {
            address_line1: addr.line1, address_line2: addr.line2,
            city: addr.town, postcode: addr.postcode,
            moved_in_date: addr.from, moved_out_date: addr.to || null,
            is_current: addr.current
          }, getToken);
        }
      }
      await apiRequest('/api/candidates/me/step', 'PATCH', { profile_step: step + 1 }, getToken);
      saveOk = true;
      if (stepKey) setCompletedSteps(prev => new Set([...prev, stepKey]));
    } catch(err) {
      console.error('Save error:', err);
      alert('Save failed: ' + err.message + '\n\nPlease try again. If this keeps happening, contact support.');
    }
    setSaving(false);
    return saveOk;
  };

  if (loading) return <div style={{textAlign:'center',padding:'4rem',color:'#64748b'}}>Loading your profile...</div>;

  const next = () => setStep(s=>s+1);
  const back = () => setStep(s=>s-1);

  const stepContent = (() => {
    if(step === 0) return <><ProgressRings sections={sections}/><StepWelcome onNext={next} name={user?.firstName || 'there'}/></>;
    if(step === 1) return <><ProgressRings sections={sections}/><StepSIA data={profileData} onChange={update} onBack={back} onNext={next} isComplete={completedSteps.has('licences')}/></>;
    if(step === 2) return <><ProgressRings sections={sections}/><StepPersonal data={profileData} onChange={update} onBack={back} onNext={next} isComplete={completedSteps.has('personal')}/></>;
    if(step === 3) return <><ProgressRings sections={sections}/><StepDriving data={profileData} onChange={update} onBack={back} onNext={next} isComplete={completedSteps.has('driving')}/></>;
    if(step === 4) return <><ProgressRings sections={sections}/><StepSectors data={profileData} onChange={update} onBack={back} onNext={next} isComplete={completedSteps.has('sectors')}/></>;
    if(step === 5) return <><ProgressRings sections={sections}/><StepQualifications data={profileData} onChange={update} onBack={back} onNext={next} isComplete={completedSteps.has('qualifications')}/></>;
    if(step === 6) return <><ProgressRings sections={sections}/><StepBackground data={profileData} onChange={update} onBack={back} onNext={next} isComplete={completedSteps.has('background')}/></>;
    if(step === 7) return <><ProgressRings sections={sections}/><StepPhoto data={profileData} onChange={update} onBack={back} onNext={next}/></>;
    if(step === 8) return <><ProgressRings sections={sections}/><StepEmployment data={profileData} onChange={update} onBack={back} onNext={next} isComplete={completedSteps.has('employment')}/></>;
    if(step === 9) return <><ProgressRings sections={sections}/><StepAddress data={profileData} onChange={update} onBack={back} onNext={next} isComplete={completedSteps.has('addresses')}/></>;
    if(step === 10) return <><ProgressRings sections={sections}/><StepComplete name={user?.firstName || 'there'}/></>;
    return <StepComplete name={user?.firstName || 'there'}/>;
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

  const name = userName || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Your Name';
  const phone = p.phone || '';
  const town = p.city || p.town || '';
  const postcode = p.postcode || '';

  const fmtDate = (d) => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length === 2) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return months[parseInt(parts[1])-1] + ' ' + parts[0];
    }
    return d;
  };

  const CandidateCV = () => (
    <div className="cv-doc">
      {/* Header */}
      <div className="cv-name">{name}</div>
      <div className="cv-contact">
        {[phone, town, postcode].filter(Boolean).join(' · ')}
        {licences.length > 0 && ' · SIA Licensed'}
      </div>

      {/* SIA Licences */}
      {licences.length > 0 && (
        <div className="cv-section">
          <div className="cv-section-title">SIA Licences</div>
          {licences.map((l,i) => (
            <span key={i} className={'cv-badge ' + (l.verified ? 'verified' : 'pending')}>
              {l.verified ? '✓' : '⏳'} {l.licence_type || l.type}
            </span>
          ))}
        </div>
      )}

      {/* Personal Statement */}
      {employment.length > 0 && (
        <div className="cv-section">
          <div className="cv-section-title">Professional Summary</div>
          <div className="cv-job-duties">
            {name} is a{licences.length > 0 ? ` SIA licensed ${licences.map(l=>l.licence_type||l.type).join(' and ')} professional` : ' security professional'} with {employment.filter(j=>!j.current&&!j.is_current).length > 0 ? 'extensive' : 'relevant'} experience across{employment.map(j=>j.sector).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,3).map(s=>' '+s).join(',') || ' the security sector'}. {driving.hasLicence==='yes'?'Full UK driving licence held. ': ''}{qualifications.has_efaw||qualifications.has_faw?'First Aid certified. ': ''}{background.served_in_forces?'Former '+background.forces_branch+'. ': ''}Available and ready to deploy.
          </div>
        </div>
      )}

      {/* Employment */}
      {employment.length > 0 && (
        <div className="cv-section">
          <div className="cv-section-title">Employment History</div>
          {employment.map((j,i) => {
            const employer = j.employer || j.employer_name || '';
            const role = j.role || j.job_title || '';
            const from = j.from || j.start_date || '';
            const to = j.to || j.end_date || '';
            const current = j.current || j.is_current;
            const duties = j.duties || '';
            return (
              <div key={i} className="cv-job">
                <div className="cv-job-title">{role}</div>
                <div className="cv-job-employer">{employer}{j.sector ? ' · '+j.sector : ''}</div>
                <div className="cv-job-dates">{fmtDate(from)} — {current ? 'Present' : fmtDate(to)}</div>
                {duties && <div className="cv-job-duties">{duties}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Qualifications */}
      {(qualifications.frec_level || qualifications.has_efaw || qualifications.has_faw || qualifications.security_clearance) && (
        <div className="cv-section">
          <div className="cv-section-title">Qualifications</div>
          {qualifications.frec_level && qualifications.frec_level !== 'None' && <div className="cv-job-duties">{qualifications.frec_level}</div>}
          {qualifications.has_efaw && <div className="cv-job-duties">Emergency First Aid at Work (EFAW)</div>}
          {qualifications.has_faw && <div className="cv-job-duties">First Aid at Work (FAW)</div>}
          {qualifications.security_clearance && qualifications.security_clearance !== 'None' && <div className="cv-job-duties">Security Clearance: {qualifications.security_clearance}</div>}
          {qualifications.is_sia_trainer && <div className="cv-job-duties">Qualified SIA Trainer / Assessor</div>}
        </div>
      )}

      {/* Skills */}
      {(driving.hasLicence === 'yes' || (qualifications.languages||[]).length > 0 || driving.hasTransport === 'yes') && (
        <div className="cv-section">
          <div className="cv-section-title">Additional Skills</div>
          <div>
            {driving.hasLicence === 'yes' && <span className="cv-badge">Full UK Driving Licence</span>}
            {driving.hasTransport === 'yes' && <span className="cv-badge">Own Transport</span>}
            {(qualifications.languages||[]).map(l=><span key={l} className="cv-badge">{l}</span>)}
            {background.served_in_forces && <span className="cv-badge">{background.forces_branch}</span>}
          </div>
        </div>
      )}

      {employment.length === 0 && licences.length === 0 && (
        <div style={{color:'#94a3b8',fontSize:'0.78rem',textAlign:'center',padding:'2rem 0'}}>
          Your CV builds automatically as you complete each step.
        </div>
      )}
    </div>
  );

  const VettingProfile = () => (
    <div className="cv-doc">
      <div className="cv-name">{name}</div>
      <div className="cv-contact" style={{marginBottom:'1rem'}}>BS7858 Vetting Profile · {new Date().toLocaleDateString('en-GB')}</div>

      {/* Personal */}
      <div className="cv-section">
        <div className="cv-section-title">Personal Details</div>
        <div className="cv-grid">
          {phone && <div className="cv-field"><label>Phone</label><span>{phone}</span></div>}
          {p.date_of_birth && <div className="cv-field"><label>Date of Birth</label><span>{p.date_of_birth}</span></div>}
          {p.ni_number && <div className="cv-field"><label>NI Number</label><span>••••••••</span></div>}
          {postcode && <div className="cv-field"><label>Postcode</label><span>{postcode}</span></div>}
        </div>
      </div>

      {/* SIA */}
      {licences.length > 0 && (
        <div className="cv-section">
          <div className="cv-section-title">SIA Licences</div>
          {licences.map((l,i) => (
            <div key={i} style={{marginBottom:'0.4rem'}}>
              <div className="cv-job-title">{l.licence_type||l.type}</div>
              <div className="cv-job-dates">Expires: {l.expiry_date||l.expiry} · <span style={{color:l.verified?'#15803d':'#a16207'}}>{l.verified?'Verified':'Pending verification'}</span></div>
            </div>
          ))}
        </div>
      )}

      {/* Address history */}
      {addresses.length > 0 && (
        <div className="cv-section">
          <div className="cv-section-title">Address History</div>
          {addresses.map((a,i) => (
            <div key={i} className="cv-job">
              <div className="cv-job-title">{[a.address_line1||a.line1, a.city||a.town].filter(Boolean).join(', ')}</div>
              <div className="cv-job-dates">{fmtDate(a.moved_in_date||a.from)} — {a.is_current||a.current?'Present':fmtDate(a.moved_out_date||a.to)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Employment with references */}
      {employment.length > 0 && (
        <div className="cv-section">
          <div className="cv-section-title">Employment History</div>
          {employment.map((j,i) => {
            const employer = j.employer || j.employer_name || '';
            const role = j.role || j.job_title || '';
            const from = j.from || j.start_date || '';
            const to = j.to || j.end_date || '';
            const current = j.current || j.is_current;
            return (
              <div key={i} className="cv-job">
                <div className="cv-job-title">{role} — {employer}</div>
                <div className="cv-job-dates">{fmtDate(from)} — {current?'Present':fmtDate(to)}</div>
                {j.contactName && <div className="cv-job-duties">Ref: {j.contactName}{j.contactTitle?' ('+j.contactTitle+')':''} · {j.contactEmail} · {j.contactPhone}</div>}
                {(j.address1||j.employer_address) && <div className="cv-job-duties">{[j.address1||j.employer_address, j.postcode||j.employer_postcode].filter(Boolean).join(', ')}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Criminal */}
      <div className="cv-section">
        <div className="cv-section-title">Criminal Disclosure</div>
        <div className="cv-job-duties">{background.has_criminal_record ? 'Disclosed — see case notes' : 'No unspent convictions declared'}</div>
      </div>

      {addresses.length === 0 && employment.length === 0 && (
        <div style={{color:'#94a3b8',fontSize:'0.78rem',textAlign:'center',padding:'2rem 0'}}>
          Your vetting profile builds automatically as you complete each step.
        </div>
      )}
    </div>
  );

  const panelContent = (
    <>
      <div className="cv-panel-tabs">
        <button className={'cv-tab'+(activeTab==='cv'?' active':'')} onClick={()=>setActiveTab('cv')}>CV</button>
        <button className={'cv-tab'+(activeTab==='vetting'?' active':'')} onClick={()=>setActiveTab('vetting')}>Vetting</button>
        <button className={'cv-tab'+(activeTab==='letter'?' active':'')} onClick={()=>setActiveTab('letter')}>Cover Letter</button>
      </div>
      <div className="cv-panel-body">
        {activeTab === 'cv' ? <CandidateCV/> : activeTab === 'vetting' ? <VettingProfile/> : (
          <CoverLetterBuilder profileData={profileData} userName={userName}/>
        )}
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
        const [siaRes, personalRes, empRes, addrRes, drivingRes, sectorsRes, qualsRes, bgRes] = await Promise.allSettled([
          apiRequest('/api/sia', 'GET', null, getToken),
          apiRequest('/api/candidates/me/personal', 'GET', null, getToken),
          apiRequest('/api/profile/employment', 'GET', null, getToken),
          apiRequest('/api/profile/addresses', 'GET', null, getToken),
          apiRequest('/api/profile/driving', 'GET', null, getToken),
          apiRequest('/api/profile/sectors', 'GET', null, getToken),
          apiRequest('/api/profile/qualifications', 'GET', null, getToken),
          apiRequest('/api/profile/background', 'GET', null, getToken),
        ]);
        setProfileData({
          licences: siaRes.status === 'fulfilled' ? siaRes.value.licences : [],
          personal: personalRes.status === 'fulfilled' ? personalRes.value.personal : null,
          employment: empRes.status === 'fulfilled' ? empRes.value.employment : [],
          addresses: addrRes.status === 'fulfilled' ? addrRes.value.addresses : [],
          driving: drivingRes.status === 'fulfilled' ? drivingRes.value.driving : null,
          sectors: sectorsRes.status === 'fulfilled' ? sectorsRes.value.sectors : null,
          qualifications: qualsRes.status === 'fulfilled' ? qualsRes.value.qualifications : null,
          background: bgRes.status === 'fulfilled' ? bgRes.value.background : null,
        });
      } catch(err) { console.error('Dashboard load error:', err); }
    }
    load();
  }, []);

  const sections = [
    { name:'SIA Licence', short:'SIA', complete: profileData?.licences?.[0]?.verified === true, pending: !!profileData?.licences?.[0] && !profileData?.licences?.[0]?.verified, started: !!profileData?.licences?.[0] },
    { name:'Personal Details', short:'Info', complete: !!(profileData?.personal?.phone || profileData?.personal?.first_name), started: !!profileData?.personal },
    { name:'Driving & Transport', short:'Drive', complete: !!profileData?.driving, started: !!profileData?.driving },
    { name:'Sectors & Availability', short:'Work', complete: !!(profileData?.sectors?.sectors?.length || profileData?.sectors?.preferred_shift), started: !!profileData?.sectors },
    { name:'Qualifications', short:'Quals', complete: !!profileData?.qualifications, started: !!profileData?.qualifications },
    { name:'Criminal Record', short:'Record', complete: !!(profileData?.background?.has_criminal_record !== undefined || profileData?.background?.has_criminal_record !== null) && !!profileData?.background, started: !!profileData?.background },
    { name:'Work History', short:'Work H', complete: profileData?.employment?.length > 0, started: !!profileData?.employment?.length },
    { name:'Photo', short:'Photo', complete: false, started: false },
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
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/>
          <Route path="/profile" element={<ProtectedRoute><div className="page" style={{background:'var(--off)'}}><Nav/><ProfileBuilder/></div></ProtectedRoute>}/>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}
