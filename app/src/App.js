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
  const inProgress = sections.filter(s => s.started && !s.complete).length;
  const overallPct = Math.round((completed / total) * 100);
  const size = 120;
  const cx = size / 2, cy = size / 2, r = 46;
  const circ = 2 * Math.PI * r;
  const offset = circ - (overallPct / 100) * circ;
  const color = overallPct >= 80 ? '#10b981' : overallPct >= 50 ? '#f59e0b' : '#1a52a8';

  return (
    <div className="rings-wrap">
      <div className="ring-main">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} stroke="#f3f4f6" strokeWidth="8" fill="none"/>
          <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="8" fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{transform:'rotate(-90deg)',transformOrigin:'center',transition:'stroke-dashoffset 0.6s ease'}}
          />
        </svg>
        <div className="ring-label">
          <div className="ring-pct" style={{color}}>{overallPct}%</div>
          <div className="ring-sub">Complete</div>
        </div>
      </div>
      <div className="ring-sections">
        {sections.map((s,i) => {
          const r2=14, c2=2*Math.PI*r2;
          const pct=s.complete?100:s.started?50:0;
          const off2=c2-(pct/100)*c2;
          const sectionColors = ['#1a52a8','#0891b2','#7c3aed','#db2777','#dc2626','#d97706','#059669','#0284c7','#6d28d9'];
          const baseColor = sectionColors[i % sectionColors.length];
          const col = s.complete ? baseColor : s.started ? baseColor + 'aa' : '#e2e8f0';
          return (
            <div key={i} className="ring-mini" title={s.name}>
              <svg width="36" height="36" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r={r2} stroke="#f3f4f6" strokeWidth="4" fill="none"/>
                <circle cx="18" cy="18" r={r2} stroke={col} strokeWidth="4" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={c2}
                  strokeDashoffset={off2}
                  style={{transform:'rotate(-90deg)',transformOrigin:'center',transition:'stroke-dashoffset 0.4s'}}
                />
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
    <label className="f-radio">
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)}/>
      <span>{label}</span>
    </label>
  );
}
function Checkbox({ label, checked, onChange }) {
  return (
    <label className="f-check">
      <input type="checkbox" checked={checked} onChange={onChange}/>
      <span>{label}</span>
    </label>
  );
}

// ── STEP 1: WELCOME ──
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
function StepSIA({ data, onChange, onBack, onNext }) {
  const [licences, setLicences] = useState(data.licences || [{ type:'', number:'', expiry:'' }]);
  const addLicence = () => setLicences([...licences, { type:'', number:'', expiry:'' }]);
  const updateLicence = (i, field, val) => {
    const updated = licences.map((l,idx) => idx===i ? {...l,[field]:val} : l);
    setLicences(updated);
  };
  const removeLicence = (i) => setLicences(licences.filter((_,idx) => idx!==i));
  const save = () => { onChange({ licences }); onNext(); };
  const licenceTypes = ['Door Supervisor','Security Guard','CCTV Operator','Close Protection','Cash & Valuables in Transit','Key Holding','Non-Front Line'];

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
function StepPersonal({ data, onChange, onBack, onNext }) {
  const raw = data.personal;
  const [form, setForm] = useState({
    phone: raw?.phone || '',
    dob: raw?.date_of_birth || raw?.dob || '',
    gender: raw?.gender || '',
    ni: raw?.ni_number || raw?.ni || '',
    address1: raw?.address_line1 || raw?.address1 || '',
    address2: raw?.address_line2 || raw?.address2 || '',
    town: raw?.city || raw?.town || '',
    county: raw?.county || '',
    postcode: raw?.postcode || '',
    movedIn: raw?.move_in_date || raw?.movedIn || '',
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
  const monthsAtCurrent = form.movedIn
    ? Math.floor((new Date() - new Date(form.movedIn + '-01')) / (1000 * 60 * 60 * 24 * 30.5))
    : 0;

  const needs5Year = monthsAtCurrent < 60 && form.movedIn;

  // Gap detection — build timeline and find gaps
  const getGaps = () => {
    if (!form.movedIn) return [];
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    // Build list of address periods within 5 year window
    const periods = [];

    // Current address
    periods.push({
      start: new Date(form.movedIn + '-01'),
      end: new Date(),
      label: 'Current address'
    });

    // Previous addresses
    form.prevAddresses.forEach((addr, i) => {
      if (addr.from && addr.to) {
        periods.push({
          start: new Date(addr.from + '-01'),
          end: new Date(addr.to + '-01'),
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

  const save = () => {
    if (hasUnexplainedGaps) return;
    onChange({ personal: form });
    onNext();
  };

  return (
    <StepShell step={3} total={11} title="Personal Details"
      why="Employers need to be able to contact you quickly. A complete personal profile also means vetting can start without any back-and-forth."
      onBack={onBack} onNext={save} nextLabel={hasUnexplainedGaps ? 'Explain all gaps to continue' : 'Save & Continue'}>
      <div className="field-row">
        <Field label="Phone Number"><Input type="tel" placeholder="07700 000000" value={form.phone} onChange={v=>u('phone',v)}/></Field>
        <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={v=>u('dob',v)}/></Field>
      </div>
      <div className="field-row">
        <Field label="National Insurance Number"><Input type="text" placeholder="AB 12 34 56 C" value={form.ni} onChange={v=>u('ni',v)}/></Field>
        <Field label="Gender" hint="Optional — equal opportunities monitoring only">
          <Select value={form.gender} onChange={v=>u('gender',v)}>
            <option value="">Prefer not to say</option>
            <option>Male</option><option>Female</option><option>Non-binary</option><option>Other</option>
          </Select>
        </Field>
      </div>

      <div className="divider"></div>
      <div style={{fontWeight:700,fontSize:'1rem',color:'#0b1222',marginBottom:'1rem'}}>Current Address</div>

      <Field label="Address Line 1"><Input type="text" placeholder="House number and street name" value={form.address1} onChange={v=>u('address1',v)}/></Field>
      <Field label="Address Line 2" hint="Flat, apartment, building name (if applicable)"><Input type="text" placeholder="Optional" value={form.address2} onChange={v=>u('address2',v)}/></Field>
      <div className="field-row">
        <Field label="Town / City"><Input type="text" placeholder="London" value={form.town} onChange={v=>u('town',v)}/></Field>
        <Field label="County"><Input type="text" placeholder="Greater London" value={form.county} onChange={v=>u('county',v)}/></Field>
        <Field label="Postcode"><Input type="text" placeholder="SW1A 1AA" value={form.postcode} onChange={v=>u('postcode',v)}/></Field>
      </div>
      <Field label="Move-in Date" hint="The month and year you moved to this address">
        <Input type="month" value={form.movedIn} onChange={v=>u('movedIn',v)}/>
      </Field>

      {form.movedIn && (() => {
        const y = Math.floor(monthsAtCurrent/12), m = monthsAtCurrent%12;
        const label = y > 0 ? (y+' year'+(y>1?'s':'')+(m>0?' '+m+' month'+(m>1?'s':''):'')) : (monthsAtCurrent+' month'+(monthsAtCurrent!==1?'s':''));
        return monthsAtCurrent < 60 ? (
          <div className="address-warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
            You have lived here for <strong>{label}</strong>. BS7858 requires a full 5-year address history with no gaps. Add every previous address below — exact dates, no gaps.
          </div>
        ) : (
          <div className="address-ok">
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
                <Field label="Moved In (month & year)"><Input type="month" value={addr.from} onChange={v=>updatePrevAddr(i,'from',v)}/></Field>
                <Field label="Moved Out (month & year)"><Input type="month" value={addr.to} onChange={v=>updatePrevAddr(i,'to',v)}/></Field>
              </div>
              {addr.gapExplanation && (
                <div style={{fontSize:'0.78rem',color:'#64748b',marginTop:'0.25rem'}}>Gap explanation recorded.</div>
              )}
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
                      ? `Your address history needs to go back to ${fmtDate(gap.from)}. Add more previous addresses below.`
                      : `There is a ${gap.months}-month gap between ${fmtDate(gap.from)} and ${fmtDate(gap.to)}. This is a red flag in BS7858 vetting — it must be explained.`
                    }
                  </div>
                  {!gap.shortfall && (
                    <>
                      <div style={{fontSize:'0.8rem',fontWeight:600,color:'#7f1d1d',marginBottom:'0.4rem'}}>
                        Explain this gap — where were you? Supporting evidence may be required.
                      </div>
                      <textarea
                        className="f-textarea"
                        rows={3}
                        placeholder="e.g. I was living abroad in Nigeria from Jan 2022 to Jun 2022 — I can provide passport stamps / flight records as evidence."
                        value={form.prevAddresses[gap.index]?.gapExplanation || ''}
                        onChange={e => updatePrevAddr(gap.index, 'gapExplanation', e.target.value)}
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

          {/* All clear */}
          {form.prevAddresses.length > 0 && gaps.length === 0 && monthsAtCurrent > 0 && (
            <div className="address-ok" style={{marginTop:'1rem'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
              No gaps detected — your address history is complete.
            </div>
          )}
        </div>
      )}

      <div className="divider"></div>

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
          <span>Your SIA licence address should match your current address. A mismatch can raise a flag during identity verification. Update it through your <a href="https://services.sia.homeoffice.gov.uk/" target="_blank" rel="noopener noreferrer" className="inline-link">SIA online account</a>.</span>
        </div>
      )}

      <Field label="Is your driving licence registered to this address?" hint="If you hold a driving licence">
        <div className="radio-row">
          <Radio name="dvlaAddress" value="yes" label="Yes" checked={form.dvlaAddress==='yes'} onChange={v=>u('dvlaAddress',v)}/>
          <Radio name="dvlaAddress" value="no" label="No" checked={form.dvlaAddress==='no'} onChange={v=>u('dvlaAddress',v)}/>
          <Radio name="dvlaAddress" value="na" label="No driving licence" checked={form.dvlaAddress==='na'} onChange={v=>u('dvlaAddress',v)}/>
        </div>
      </Field>
      {form.dvlaAddress === 'no' && (
        <div className="address-warning" style={{marginTop:'0.5rem'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
          <span>
            Your driving licence must show your current address by law — carries a £1,000 DVLA fine if not updated within 3 months of moving.
            <br/>
            <a href="https://www.gov.uk/change-address-driving-licence" target="_blank" rel="noopener noreferrer" className="inline-link">&#8250; Update your driving licence address on GOV.UK</a>
          </span>
        </div>
      )}

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
function StepDriving({ data, onChange, onBack, onNext }) {
  const [form, setForm] = useState(data.driving || {
    hasLicence: '', licenceType:'', licenceNumber:'', yearsHeld:'', points:'', endorsements:[], hasBan:'', banDate:'', banDuration:'', banReason:'',
    hasTransport:'', vehicleType:'', taxed:'', moted:'', insured:'', travelRadius:''
  });
  const u = (f,v) => setForm({...form,[f]:v});
  const toggleEndorsement = (code) => {
    const list = form.endorsements.includes(code) ? form.endorsements.filter(c=>c!==code) : [...form.endorsements,code];
    setForm({...form, endorsements:list});
  };
  const endorsementCodes = ['SP30','SP50','IN10','CU80','CD10','CD30','DD40','DR10','DR20','MS10','TS10','TT99'];
  const save = () => { onChange({ driving: form }); onNext(); };

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
    </StepShell>
  );
}

// ── STEP 5: PREFERRED SECTORS & AVAILABILITY ──
function StepSectors({ data, onChange, onBack, onNext }) {
  const raw = data.sectors;
  const [form, setForm] = useState({
    sectors: Array.isArray(raw?.sectors) ? raw.sectors : [],
    availability: raw?.availability || raw?.preferred_shift || '',
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
      <Field label="Availability">
        <div className="radio-row">
          {['Days','Nights','Weekends','Flexible / Any'].map(t=><Radio key={t} name="availability" value={t} label={t} checked={form.availability===t} onChange={v=>setForm({...form,availability:v})}/>)}
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
function StepQualifications({ data, onChange, onBack, onNext }) {
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
function StepBackground({ data, onChange, onBack, onNext }) {
  const [form, setForm] = useState(data.background || {
    hasForces:'', forcesBranch:'', forcesRank:'', forcesYears:'', forcesDischarge:'',
    hasBID:'', bidSchemes:'', hasCriminal:'', criminalDetails:''
  });
  const u = (f,v) => setForm({...form,[f]:v});
  const save = () => { onChange({ background: form }); onNext(); };

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
      <Field label="Are you registered with any BID (Business Improvement District) scheme?" hint="BID accreditation is required for many town centre and retail security roles">
        <div className="radio-row"><Radio name="hasBID" value="yes" label="Yes" checked={form.hasBID==='yes'} onChange={v=>u('hasBID',v)}/><Radio name="hasBID" value="no" label="No" checked={form.hasBID==='no'} onChange={v=>u('hasBID',v)}/></div>
      </Field>
      {form.hasBID==='yes' && <Field label="BID scheme(s), town/city and accreditation number"><Input type="text" placeholder="e.g. Manchester BID — MAN-DS-001234" value={form.bidSchemes} onChange={v=>u('bidSchemes',v)}/></Field>}
      <div className="divider"></div>
      <Field label="Do you have any unspent criminal convictions?" hint="This does not automatically disqualify you — we assess each case individually">
        <div className="radio-row"><Radio name="hasCriminal" value="yes" label="Yes" checked={form.hasCriminal==='yes'} onChange={v=>u('hasCriminal',v)}/><Radio name="hasCriminal" value="no" label="No" checked={form.hasCriminal==='no'} onChange={v=>u('hasCriminal',v)}/></div>
      </Field>
      {form.hasCriminal==='yes' && <Field label="Please provide brief details" hint="Date, offence, sentence. This is confidential and only visible to you and our admin team."><textarea className="f-textarea" rows={3} value={form.criminalDetails} onChange={v=>u('criminalDetails',v)} placeholder="e.g. 2019 — SP30 — 3 points and £100 fine"/></Field>}
    </StepShell>
  );
}

// ── STEP 8: EMPLOYMENT HISTORY ──
function StepEmployment({ data, onChange, onBack, onNext }) {
  const [jobs, setJobs] = useState(data.employment || [{ employer:'', role:'', from:'', to:'', current:false, reason:'' }]);
  const addJob = () => setJobs([...jobs,{ employer:'', role:'', from:'', to:'', current:false, reason:'' }]);
  const update = (i,f,v) => setJobs(jobs.map((j,idx)=>idx===i?{...j,[f]:v}:j));
  const remove = (i) => setJobs(jobs.filter((_,idx)=>idx!==i));
  const save = () => { onChange({ employment: jobs }); onNext(); };

  return (
    <StepShell step={8} total={11} title="Employment History"
      why="We know this is the tedious one. But a complete 5-year employment history is what makes you BS7858 ready — and that is what gets you hired faster than anyone else on any platform. No gaps. Every month accounted for."
      onBack={onBack} onNext={save}>
      <div className="history-note">Cover the last <strong>5 years</strong> in full. No gaps allowed — if you were unemployed or self-employed, include that too.</div>
      {jobs.map((job, i) => (
        <div key={i} className="history-block">
          <div className="history-block-header">
            <span>Position {i+1}</span>
            {i>0 && <button className="btn-remove" onClick={()=>remove(i)}>Remove</button>}
          </div>
          <div className="field-row">
            <Field label="Employer Name"><Input type="text" placeholder="Company name" value={job.employer} onChange={e=>update(i,'employer',e.target.value)}/></Field>
            <Field label="Your Role / Job Title"><Input type="text" placeholder="e.g. Door Supervisor" value={job.role} onChange={e=>update(i,'role',e.target.value)}/></Field>
          </div>
          <div className="field-row">
            <Field label="Start Date"><Input type="month" value={job.from} onChange={e=>update(i,'from',e.target.value)}/></Field>
            {!job.current && <Field label="End Date"><Input type="month" value={job.to} onChange={e=>update(i,'to',e.target.value)}/></Field>}
            <Field label=""><div style={{paddingTop:'1.8rem'}}><Checkbox label="Current employer" checked={job.current} onChange={e=>update(i,'current',e.target.checked)}/></div></Field>
          </div>
          <Field label="Reason for leaving" hint="Not required for current employer">
            <Input type="text" placeholder="e.g. Contract ended, career progression" value={job.reason} onChange={e=>update(i,'reason',e.target.value)}/>
          </Field>
        </div>
      ))}
      <button className="btn-add" onClick={addJob}>+ Add Another Position</button>
    </StepShell>
  );
}

// ── STEP 9: ADDRESS HISTORY ──
function StepAddress({ data, onChange, onBack, onNext }) {
  const [addresses, setAddresses] = useState(data.addresses || [{ line1:'', line2:'', town:'', postcode:'', from:'', to:'', current:false }]);
  const add = () => setAddresses([...addresses,{ line1:'', line2:'', town:'', postcode:'', from:'', to:'', current:false }]);
  const update = (i,f,v) => setAddresses(addresses.map((a,idx)=>idx===i?{...a,[f]:v}:a));
  const remove = (i) => setAddresses(addresses.filter((_,idx)=>idx!==i));
  const save = () => { onChange({ addresses }); onNext(); };

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
            <Field label="Address Line 1"><Input type="text" placeholder="House number and street" value={addr.line1} onChange={e=>update(i,'line1',e.target.value)}/></Field>
            <Field label="Address Line 2"><Input type="text" placeholder="Optional" value={addr.line2} onChange={e=>update(i,'line2',e.target.value)}/></Field>
          </div>
          <div className="field-row">
            <Field label="Town / City"><Input type="text" value={addr.town} onChange={e=>update(i,'town',e.target.value)}/></Field>
            <Field label="Postcode"><Input type="text" value={addr.postcode} onChange={e=>update(i,'postcode',e.target.value)}/></Field>
          </div>
          <div className="field-row">
            <Field label="Move-in Date"><Input type="month" value={addr.from} onChange={e=>update(i,'from',e.target.value)}/></Field>
            {!addr.current && <Field label="Move-out Date"><Input type="month" value={addr.to} onChange={e=>update(i,'to',e.target.value)}/></Field>}
            <Field label=""><div style={{paddingTop:'1.8rem'}}><Checkbox label="Current address" checked={addr.current} onChange={e=>update(i,'current',e.target.checked)}/></div></Field>
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
        <div className="cn-item"><div className="cn-n">3</div><div><strong>Go Live</strong><p>Once verified, your profile goes live and employers can find you.</p></div></div>
      </div>
      <a href="/dashboard" className="btn-next" style={{display:'block',textAlign:'center',marginTop:'2rem'}}>Go to My Dashboard</a>
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
        setProfileData({
          licences: siaRes.status === 'fulfilled' ? siaRes.value.licences : null,
          personal: personalRes.status === 'fulfilled' ? personalRes.value.personal : null,
          driving: drivingRes.status === 'fulfilled' ? drivingRes.value.driving : null,
          sectors: sectorsRes.status === 'fulfilled' ? sectorsRes.value.sectors : null,
          qualifications: qualsRes.status === 'fulfilled' ? qualsRes.value.qualifications : null,
          background: bgRes.status === 'fulfilled' ? bgRes.value.background : null,
          employment: empRes.status === 'fulfilled' ? empRes.value.employment : null,
          photo: null,
          addresses: addrRes.status === 'fulfilled' ? addrRes.value.addresses : null,
        });
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
    { name:'SIA Licence', short:'SIA', complete: profileData.licences?.[0]?.verified === true, started: !!profileData.licences?.[0] },
    { name:'Personal Details', short:'Info', complete: !!profileData.personal?.phone, started: !!profileData.personal },
    { name:'Driving & Transport', short:'Drive', complete: !!profileData.driving, started: !!profileData.driving },
    { name:'Sectors & Availability', short:'Work', complete: profileData.sectors?.sectors?.length > 0, started: !!profileData.sectors },
    { name:'Qualifications', short:'Quals', complete: !!profileData.qualifications, started: !!profileData.qualifications },
    { name:'Background', short:'BG', complete: !!profileData.background, started: !!profileData.background },
    { name:'Employment History', short:'Jobs', complete: profileData.employment?.length > 0, started: !!profileData.employment },
    { name:'Photo', short:'Photo', complete: !!profileData.photo?.uploaded, started: !!profileData.photo },
    { name:'Address History', short:'Addr', complete: profileData.addresses?.length > 0, started: !!profileData.addresses },
  ];

  const update = async (d) => {
    const merged = { ...profileData, ...d };
    setProfileData(merged);
    setSaving(true);
    try {
      // Save to the correct API endpoint based on what changed
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
          await apiRequest('/api/profile/employment', 'POST', { employer_name: job.employer, job_title: job.role, start_date: job.from, end_date: job.to || null, is_current: job.current, reason_for_leaving: job.reason }, getToken);
        }
      }
      if (d.addresses) {
        for (const addr of d.addresses) {
          await apiRequest('/api/profile/addresses', 'POST', { address_line1: addr.line1, address_line2: addr.line2, city: addr.town, postcode: addr.postcode, moved_in_date: addr.from, moved_out_date: addr.to || null, is_current: addr.current }, getToken);
        }
      }
      // Update step progress
      await apiRequest('/api/candidates/me/step', 'PATCH', { profile_step: step + 1 }, getToken);
    } catch(err) {
      console.error('Save error:', err);
    }
    setSaving(false);
  };

  if (loading) return <div style={{textAlign:'center',padding:'4rem',color:'#64748b'}}>Loading your profile...</div>;

  const next = () => setStep(s=>s+1);
  const back = () => setStep(s=>s-1);

  if(step === 0) return <><ProgressRings sections={sections}/><StepWelcome onNext={next} name={user?.firstName || 'there'}/></>;
  if(step === 1) return <><ProgressRings sections={sections}/><StepSIA data={profileData} onChange={update} onBack={back} onNext={next}/></>;
  if(step === 2) return <><ProgressRings sections={sections}/><StepPersonal data={profileData} onChange={update} onBack={back} onNext={next}/></>;
  if(step === 3) return <><ProgressRings sections={sections}/><StepDriving data={profileData} onChange={update} onBack={back} onNext={next}/></>;
  if(step === 4) return <><ProgressRings sections={sections}/><StepSectors data={profileData} onChange={update} onBack={back} onNext={next}/></>;
  if(step === 5) return <><ProgressRings sections={sections}/><StepQualifications data={profileData} onChange={update} onBack={back} onNext={next}/></>;
  if(step === 6) return <><ProgressRings sections={sections}/><StepBackground data={profileData} onChange={update} onBack={back} onNext={next}/></>;
  if(step === 7) return <><ProgressRings sections={sections}/><StepPhoto data={profileData} onChange={update} onBack={back} onNext={next}/></>;
  if(step === 8) return <><ProgressRings sections={sections}/><StepEmployment data={profileData} onChange={update} onBack={back} onNext={next}/></>;
  if(step === 9) return <><ProgressRings sections={sections}/><StepAddress data={profileData} onChange={update} onBack={back} onNext={next}/></>;
  if(step === 10) return <><ProgressRings sections={sections}/><StepComplete name={user?.firstName || 'there'}/></>;
  return <StepComplete name={user?.firstName || 'there'}/>;
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
        const [siaRes, personalRes, empRes, addrRes] = await Promise.allSettled([
          apiRequest('/api/sia', 'GET', null, getToken),
          apiRequest('/api/candidates/me/personal', 'GET', null, getToken),
          apiRequest('/api/profile/employment', 'GET', null, getToken),
          apiRequest('/api/profile/addresses', 'GET', null, getToken),
        ]);
        setProfileData({
          licences: siaRes.status === 'fulfilled' ? siaRes.value.licences : [],
          personal: personalRes.status === 'fulfilled' ? personalRes.value.personal : null,
          employment: empRes.status === 'fulfilled' ? empRes.value.employment : [],
          addresses: addrRes.status === 'fulfilled' ? addrRes.value.addresses : [],
        });
      } catch(err) { console.error('Dashboard load error:', err); }
    }
    load();
  }, []);

  const sections = [
    { name:'SIA Licence', short:'SIA', complete: profileData?.licences?.[0]?.verified === true, started: !!profileData?.licences?.[0] },
    { name:'Personal Details', short:'Info', complete: !!profileData?.personal?.phone, started: !!profileData?.personal },
    { name:'Driving & Transport', short:'Drive', complete: false, started: false },
    { name:'Sectors & Availability', short:'Work', complete: false, started: false },
    { name:'Qualifications', short:'Quals', complete: false, started: false },
    { name:'Background', short:'BG', complete: false, started: false },
    { name:'Employment History', short:'Jobs', complete: profileData?.employment?.length > 0, started: !!profileData?.employment?.length },
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
                <div className="field"><label className="field-label">First Name</label><input className="f-input" type="text" required value={form.firstName} onChange={v=>setForm({...form,firstName:v})} placeholder="John"/></div>
                <div className="field"><label className="field-label">Last Name</label><input className="f-input" type="text" required value={form.lastName} onChange={v=>setForm({...form,lastName:v})} placeholder="Smith"/></div>
              </div>
              <div className="field"><label className="field-label">Email Address</label><input className="f-input" type="email" required value={form.email} onChange={v=>setForm({...form,email:v})} placeholder="your@email.com"/></div>
              <div className="field"><label className="field-label">Password</label><input className="f-input" type="password" required value={form.password} onChange={v=>setForm({...form,password:v})} placeholder="Min. 8 characters"/></div>
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
            <div className="field"><label className="field-label">Email Address</label><input className="f-input" type="email" required value={form.email} onChange={v=>setForm({...form,email:v})} placeholder="your@email.com"/></div>
            <div className="field"><label className="field-label">Password</label><input className="f-input" type="password" required value={form.password} onChange={v=>setForm({...form,password:v})} placeholder="Your password"/></div>
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
          <Route path="/profile" element={<ProtectedRoute><div className="page" style={{background:'var(--off)'}}><Nav/><div className="profile-builder"><ProfileBuilder/></div></div></ProtectedRoute>}/>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}
