import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, useUser, useClerk } from '@clerk/clerk-react';
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
function Input(props) { return <input className="f-input" {...props}/>; }
function Select({ children, ...props }) { return <select className="f-select" {...props}>{children}</select>; }
function Radio({ name, value, label, checked, onChange }) {
  return (
    <label className="f-radio">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange}/>
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
  const [form, setForm] = useState(data.personal || { phone:'', dob:'', gender:'', ni:'', address1:'', address2:'', town:'', county:'', postcode:'', movedIn:'', movedOut:'', currentAddr:'', siaAddress:'', dvlaAddress:'' });
  const u = (f,v) => setForm({...form,[f]:v});
  const save = () => { onChange({ personal: form }); onNext(); };
  return (
    <StepShell step={3} total={11} title="Personal Details"
      why="Employers need to be able to contact you quickly. A complete personal profile also means vetting can start without any back-and-forth."
      onBack={onBack} onNext={save}>
      <div className="field-row">
        <Field label="Phone Number"><Input type="tel" placeholder="07700 000000" value={form.phone} onChange={e=>u('phone',e.target.value)}/></Field>
        <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={e=>u('dob',e.target.value)}/></Field>
      </div>
      <div className="field-row">
        <Field label="National Insurance Number"><Input type="text" placeholder="AB 12 34 56 C" value={form.ni} onChange={e=>u('ni',e.target.value)}/></Field>
        <Field label="Gender" hint="Optional — used for equal opportunities monitoring only">
          <Select value={form.gender} onChange={e=>u('gender',e.target.value)}>
            <option value="">Prefer not to say</option>
            <option>Male</option><option>Female</option><option>Non-binary</option><option>Other</option>
          </Select>
        </Field>
      </div>
      <div className="divider"></div>
      <Field label="Current Address Line 1"><Input type="text" placeholder="House number and street name" value={form.address1} onChange={e=>u('address1',e.target.value)}/></Field>
      <Field label="Address Line 2" hint="Flat, apartment, building name (if applicable)"><Input type="text" placeholder="Optional" value={form.address2} onChange={e=>u('address2',e.target.value)}/></Field>
      <div className="field-row">
        <Field label="Town / City"><Input type="text" placeholder="London" value={form.town} onChange={e=>u('town',e.target.value)}/></Field>
        <Field label="County"><Input type="text" placeholder="Greater London" value={form.county} onChange={e=>u('county',e.target.value)}/></Field>
        <Field label="Postcode"><Input type="text" placeholder="SW1A 1AA" value={form.postcode} onChange={e=>u('postcode',e.target.value)}/></Field>
      </div>
      <div className="field-row">
        <Field label="Move-in Date" hint="The date you moved to this address">
          <Input type="month" value={form.movedIn} onChange={e=>u('movedIn',e.target.value)}/>
        </Field>
        <Field label="Currently living here?">
          <div className="radio-row">
            <Radio name="currentAddr" value="yes" label="Yes" checked={form.currentAddr==='yes'} onChange={e=>u('currentAddr',e.target.value)}/>
            <Radio name="currentAddr" value="no" label="No" checked={form.currentAddr==='no'} onChange={e=>u('currentAddr',e.target.value)}/>
          </div>
        </Field>
      </div>
      {form.currentAddr === 'no' && (
        <Field label="Move-out Date">
          <Input type="month" value={form.movedOut} onChange={e=>u('movedOut',e.target.value)}/>
        </Field>
      )}
      {form.movedIn && form.currentAddr === 'yes' && (() => {
        const months = Math.floor((new Date() - new Date(form.movedIn + '-01')) / (1000 * 60 * 60 * 24 * 30.5));
        const years = Math.floor(months / 12);
        const rem = months % 12;
        const label = years > 0 ? (years + ' year' + (years>1?'s':'') + (rem > 0 ? ' ' + rem + ' month' + (rem>1?'s':'') : '')) : (months + ' month' + (months!==1?'s':''));
        return months < 60 ? (
          <div className="address-warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
            You have lived here for <strong>{label}</strong>. BS7858 requires a full 5-year address history — you will need to add your previous address(es) in the Address History step later.
          </div>
        ) : (
          <div className="address-ok">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
            You have lived here for <strong>{label}</strong> — your current address covers your full 5-year BS7858 requirement.
          </div>
        );
      })()}

      <div className="divider"></div>

      <Field label="Is your SIA licence registered to this address?">
        <div className="radio-row">
          <Radio name="siaAddress" value="yes" label="Yes" checked={form.siaAddress==='yes'} onChange={e=>u('siaAddress',e.target.value)}/>
          <Radio name="siaAddress" value="no" label="No" checked={form.siaAddress==='no'} onChange={e=>u('siaAddress',e.target.value)}/>
          <Radio name="siaAddress" value="na" label="Not applicable" checked={form.siaAddress==='na'} onChange={e=>u('siaAddress',e.target.value)}/>
        </div>
      </Field>
      {form.siaAddress === 'no' && (
        <div className="address-warning" style={{marginTop:'0.5rem'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
          <span>Your SIA licence address should match your current address. A mismatch can raise a flag during identity verification. You can update your registered address quickly through your <a href="https://services.sia.homeoffice.gov.uk/" target="_blank" rel="noopener noreferrer" className="inline-link">SIA online account</a>. We recommend doing this before applying for roles.</span>
        </div>
      )}

      <Field label="Is your driving licence registered to this address?" hint="If you hold a driving licence">
        <div className="radio-row">
          <Radio name="dvlaAddress" value="yes" label="Yes" checked={form.dvlaAddress==='yes'} onChange={e=>u('dvlaAddress',e.target.value)}/>
          <Radio name="dvlaAddress" value="no" label="No" checked={form.dvlaAddress==='no'} onChange={e=>u('dvlaAddress',e.target.value)}/>
          <Radio name="dvlaAddress" value="na" label="No driving licence" checked={form.dvlaAddress==='na'} onChange={e=>u('dvlaAddress',e.target.value)}/>
        </div>
      </Field>
      {form.dvlaAddress === 'no' && (
        <div className="address-warning" style={{marginTop:'0.5rem'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
          <span>
            Your driving licence must show your current address by law. An out-of-date address can cause issues during identity and address verification checks — and carries a £1,000 DVLA fine if not updated within 3 months of moving.
            <br/><br/>
            You can update your driving licence address online in minutes — it is free and takes about 5 minutes:
            <br/>
            <a href="https://www.gov.uk/change-address-driving-licence" target="_blank" rel="noopener noreferrer" className="inline-link">&#8250; Update your driving licence address on GOV.UK</a>
            <br/>
            <a href="https://www.gov.uk/change-address-driving-licence" target="_blank" rel="noopener noreferrer" className="inline-link">&#8250; You will need your National Insurance number and a valid UK passport or biometric residence permit</a>
          </span>
        </div>
      )}
      <div className="prepare-notice">
        <div className="prepare-notice-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
          Now is a good time to prepare your proof of address
        </div>
        <p>Later in your profile you will need to upload proof that you live at this address. Start gathering these now so they are ready when you need them.</p>
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
          <Radio name="hasLicence" value="yes" label="Yes" checked={form.hasLicence==='yes'} onChange={e=>u('hasLicence',e.target.value)}/>
          <Radio name="hasLicence" value="no" label="No" checked={form.hasLicence==='no'} onChange={e=>u('hasLicence',e.target.value)}/>
        </div>
      </Field>
      {form.hasLicence === 'yes' && <>
        <div className="field-row">
          <Field label="Licence Type">
            <Select value={form.licenceType} onChange={e=>u('licenceType',e.target.value)}>
              <option value="">Select</option><option>Full</option><option>Provisional</option>
            </Select>
          </Field>
          <Field label="Licence Number"><Input type="text" placeholder="SMITH701234AB9CD" value={form.licenceNumber} onChange={e=>u('licenceNumber',e.target.value)}/></Field>
          <Field label="Years Held">
            <Select value={form.yearsHeld} onChange={e=>u('yearsHeld',e.target.value)}>
              <option value="">Select</option>
              {['Less than 1','1–2','3–5','6–10','10+'].map(y=><option key={y}>{y}</option>)}
            </Select>
          </Field>
        </div>
        <div className="field-row">
          <Field label="Penalty Points">
            <Select value={form.points} onChange={e=>u('points',e.target.value)}>
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
            <Radio name="hasBan" value="yes" label="Yes" checked={form.hasBan==='yes'} onChange={e=>u('hasBan',e.target.value)}/>
            <Radio name="hasBan" value="no" label="No" checked={form.hasBan==='no'} onChange={e=>u('hasBan',e.target.value)}/>
          </div>
        </Field>
        {form.hasBan === 'yes' && <div className="field-row">
          <Field label="Date of ban"><Input type="date" value={form.banDate} onChange={e=>u('banDate',e.target.value)}/></Field>
          <Field label="Duration"><Input type="text" placeholder="e.g. 12 months" value={form.banDuration} onChange={e=>u('banDuration',e.target.value)}/></Field>
          <Field label="Reason"><Input type="text" placeholder="e.g. SP30" value={form.banReason} onChange={e=>u('banReason',e.target.value)}/></Field>
        </div>}
      </>}
      <div className="divider"></div>
      <Field label="Do you have your own transport?">
        <div className="radio-row">
          <Radio name="hasTransport" value="yes" label="Yes" checked={form.hasTransport==='yes'} onChange={e=>u('hasTransport',e.target.value)}/>
          <Radio name="hasTransport" value="no" label="No" checked={form.hasTransport==='no'} onChange={e=>u('hasTransport',e.target.value)}/>
        </div>
      </Field>
      {form.hasTransport === 'yes' && <>
        <div className="field-row">
          <Field label="Vehicle Type">
            <Select value={form.vehicleType} onChange={e=>u('vehicleType',e.target.value)}>
              <option value="">Select</option>
              {['Car','Motorcycle','Van','Other'].map(v=><option key={v}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Currently Taxed?">
            <div className="radio-row"><Radio name="taxed" value="yes" label="Yes" checked={form.taxed==='yes'} onChange={e=>u('taxed',e.target.value)}/><Radio name="taxed" value="no" label="No" checked={form.taxed==='no'} onChange={e=>u('taxed',e.target.value)}/></div>
          </Field>
          <Field label="Current MOT?">
            <div className="radio-row"><Radio name="moted" value="yes" label="Yes" checked={form.moted==='yes'} onChange={e=>u('moted',e.target.value)}/><Radio name="moted" value="no" label="No" checked={form.moted==='no'} onChange={e=>u('moted',e.target.value)}/></div>
          </Field>
        </div>
        <div className="field-row">
          <Field label="Insured for business use?">
            <div className="radio-row"><Radio name="insured" value="yes" label="Yes" checked={form.insured==='yes'} onChange={e=>u('insured',e.target.value)}/><Radio name="insured" value="no" label="No" checked={form.insured==='no'} onChange={e=>u('insured',e.target.value)}/></div>
          </Field>
          <Field label="Willing to travel">
            <Select value={form.travelRadius} onChange={e=>u('travelRadius',e.target.value)}>
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
  const [form, setForm] = useState(data.sectors || { sectors:[], availability:'', shiftType:[], employmentType:'' });
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
          {['Full Time','Part Time','Either'].map(t=><Radio key={t} name="employmentType" value={t} label={t} checked={form.employmentType===t} onChange={e=>setForm({...form,employmentType:e.target.value})}/>)}
        </div>
      </Field>
      <Field label="Availability">
        <div className="radio-row">
          {['Days','Nights','Weekends','Flexible / Any'].map(t=><Radio key={t} name="availability" value={t} label={t} checked={form.availability===t} onChange={e=>setForm({...form,availability:e.target.value})}/>)}
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
          <Radio name="hasFirstAid" value="yes" label="Yes" checked={form.hasFirstAid==='yes'} onChange={e=>u('hasFirstAid',e.target.value)}/>
          <Radio name="hasFirstAid" value="no" label="No" checked={form.hasFirstAid==='no'} onChange={e=>u('hasFirstAid',e.target.value)}/>
        </div>
      </Field>
      {form.hasFirstAid === 'yes' && <>
        <div className="field-row">
          <Field label="Certificate Type">
            <Select value={form.certType} onChange={e=>u('certType',e.target.value)}>
              <option value="">Select</option>
              {['FREC Level 3','FREC Level 4','Emergency First Aid at Work (EFAW)','First Aid at Work (FAW)','BTEC First Aid','Other'].map(t=><option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Issuing Body"><Input type="text" placeholder="e.g. Qualsafe, Highfield" value={form.issuingBody} onChange={e=>u('issuingBody',e.target.value)}/></Field>
        </div>
        <div className="field-row">
          <Field label="Certificate Number"><Input type="text" value={form.certNumber} onChange={e=>u('certNumber',e.target.value)}/></Field>
          <Field label="Date Achieved"><Input type="date" value={form.dateAchieved} onChange={e=>u('dateAchieved',e.target.value)}/></Field>
          <Field label="Expiry Date"><Input type="date" value={form.expiry} onChange={e=>u('expiry',e.target.value)}/></Field>
        </div>
      </>}
      <div className="divider"></div>
      <div className="field-row">
        <Field label="Own uniform?">
          <div className="radio-row"><Radio name="hasUniform" value="yes" label="Yes" checked={form.hasUniform==='yes'} onChange={e=>u('hasUniform',e.target.value)}/><Radio name="hasUniform" value="no" label="No" checked={form.hasUniform==='no'} onChange={e=>u('hasUniform',e.target.value)}/></div>
        </Field>
        <Field label="Own PPE? (boots, torch, gloves)">
          <div className="radio-row"><Radio name="hasPPE" value="yes" label="Yes" checked={form.hasPPE==='yes'} onChange={e=>u('hasPPE',e.target.value)}/><Radio name="hasPPE" value="no" label="No" checked={form.hasPPE==='no'} onChange={e=>u('hasPPE',e.target.value)}/></div>
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
        <div className="radio-row"><Radio name="isSIATrainer" value="yes" label="Yes" checked={form.isSIATrainer==='yes'} onChange={e=>u('isSIATrainer',e.target.value)}/><Radio name="isSIATrainer" value="no" label="No" checked={form.isSIATrainer==='no'} onChange={e=>u('isSIATrainer',e.target.value)}/></div>
      </Field>
      {form.isSIATrainer==='yes' && <Field label="Trainer qualification details"><Input type="text" placeholder="Qualification, awarding body and year" value={form.trainerDetails} onChange={e=>u('trainerDetails',e.target.value)}/></Field>}
      <div className="divider"></div>
      <Field label="Do you hold or have you previously held SC or DV security clearance?">
        <div className="radio-row"><Radio name="hasClearance" value="yes" label="Yes" checked={form.hasClearance==='yes'} onChange={e=>u('hasClearance',e.target.value)}/><Radio name="hasClearance" value="no" label="No" checked={form.hasClearance==='no'} onChange={e=>u('hasClearance',e.target.value)}/></div>
      </Field>
      {form.hasClearance==='yes' && <div className="field-row">
        <Field label="Clearance Level">
          <Select value={form.clearanceLevel} onChange={e=>u('clearanceLevel',e.target.value)}>
            <option value="">Select</option><option>SC</option><option>DV</option><option>CTC</option><option>BPSS</option>
          </Select>
        </Field>
        <Field label="Still Active?">
          <div className="radio-row"><Radio name="clearanceActive" value="yes" label="Yes" checked={form.clearanceActive==='yes'} onChange={e=>u('clearanceActive',e.target.value)}/><Radio name="clearanceActive" value="no" label="No — lapsed" checked={form.clearanceActive==='no'} onChange={e=>u('clearanceActive',e.target.value)}/></div>
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
        <div className="radio-row"><Radio name="hasForces" value="yes" label="Yes" checked={form.hasForces==='yes'} onChange={e=>u('hasForces',e.target.value)}/><Radio name="hasForces" value="no" label="No" checked={form.hasForces==='no'} onChange={e=>u('hasForces',e.target.value)}/></div>
      </Field>
      {form.hasForces==='yes' && <div className="field-row">
        <Field label="Branch / Force">
          <Select value={form.forcesBranch} onChange={e=>u('forcesBranch',e.target.value)}>
            <option value="">Select</option>
            {['British Army','Royal Navy','Royal Air Force','Royal Marines','Police Service','Other'].map(b=><option key={b}>{b}</option>)}
          </Select>
        </Field>
        <Field label="Rank / Grade"><Input type="text" placeholder="e.g. Sergeant, PC" value={form.forcesRank} onChange={e=>u('forcesRank',e.target.value)}/></Field>
        <Field label="Years Served"><Input type="text" placeholder="e.g. 8" value={form.forcesYears} onChange={e=>u('forcesYears',e.target.value)}/></Field>
      </div>}
      {form.hasForces==='yes' && <Field label="Type of discharge / departure">
        <Select value={form.forcesDischarge} onChange={e=>u('forcesDischarge',e.target.value)}>
          <option value="">Select</option>
          {['Honourable discharge','Medical discharge','Voluntary exit','Retirement','Other'].map(d=><option key={d}>{d}</option>)}
        </Select>
      </Field>}
      <div className="divider"></div>
      <Field label="Are you registered with any BID (Business Improvement District) scheme?" hint="BID accreditation is required for many town centre and retail security roles">
        <div className="radio-row"><Radio name="hasBID" value="yes" label="Yes" checked={form.hasBID==='yes'} onChange={e=>u('hasBID',e.target.value)}/><Radio name="hasBID" value="no" label="No" checked={form.hasBID==='no'} onChange={e=>u('hasBID',e.target.value)}/></div>
      </Field>
      {form.hasBID==='yes' && <Field label="BID scheme(s), town/city and accreditation number"><Input type="text" placeholder="e.g. Manchester BID — MAN-DS-001234" value={form.bidSchemes} onChange={e=>u('bidSchemes',e.target.value)}/></Field>}
      <div className="divider"></div>
      <Field label="Do you have any unspent criminal convictions?" hint="This does not automatically disqualify you — we assess each case individually">
        <div className="radio-row"><Radio name="hasCriminal" value="yes" label="Yes" checked={form.hasCriminal==='yes'} onChange={e=>u('hasCriminal',e.target.value)}/><Radio name="hasCriminal" value="no" label="No" checked={form.hasCriminal==='no'} onChange={e=>u('hasCriminal',e.target.value)}/></div>
      </Field>
      {form.hasCriminal==='yes' && <Field label="Please provide brief details" hint="Date, offence, sentence. This is confidential and only visible to you and our admin team."><textarea className="f-textarea" rows={3} value={form.criminalDetails} onChange={e=>u('criminalDetails',e.target.value)} placeholder="e.g. 2019 — SP30 — 3 points and £100 fine"/></Field>}
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
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Load from Clerk metadata on mount
  const [profileData, setProfileData] = useState(() => {
    const meta = user?.unsafeMetadata || {};
    return {
      licences: meta.licences,
      personal: meta.personal,
      driving: meta.driving,
      sectors: meta.sectors,
      qualifications: meta.qualifications,
      background: meta.background,
      employment: meta.employment,
      photo: meta.photo,
      addresses: meta.addresses,
    };
  });

  const sections = [
    { name:'SIA Licence', short:'SIA', complete: profileData.licences?.[0]?.verified === true, started: !!profileData.licences?.[0]?.number },
    { name:'Personal Details', short:'Info', complete: !!profileData.personal?.phone, started: !!profileData.personal },
    { name:'Driving & Transport', short:'Drive', complete: profileData.driving?.hasLicence !== undefined, started: !!profileData.driving },
    { name:'Sectors & Availability', short:'Work', complete: profileData.sectors?.sectors?.length > 0, started: !!profileData.sectors },
    { name:'Qualifications', short:'Quals', complete: profileData.qualifications?.hasFirstAid !== undefined, started: !!profileData.qualifications },
    { name:'Background', short:'BG', complete: profileData.background?.hasForces !== undefined, started: !!profileData.background },
    { name:'Employment History', short:'Jobs', complete: profileData.employment?.length > 0, started: !!profileData.employment },
    { name:'Photo', short:'Photo', complete: !!profileData.photo?.uploaded, started: !!profileData.photo },
    { name:'Address History', short:'Addr', complete: profileData.addresses?.length > 0, started: !!profileData.addresses },
  ];

  // Save to Clerk metadata immediately on each step
  const update = async (d) => {
    const merged = { ...profileData, ...d };
    setProfileData(merged);
    setSaving(true);
    try {
      // Strip photo preview from metadata (too large for Clerk)
      const toSave = { ...merged };
      if (toSave.photo) toSave.photo = { uploaded: toSave.photo.uploaded };
      await user.update({ unsafeMetadata: { ...(user.unsafeMetadata || {}), ...toSave } });
    } catch(err) {
      console.error('Save error:', err);
    }
    setSaving(false);
  };

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
  const navigate = useNavigate();

  // Pick a random fact on load
  const [fact] = React.useState(() => industryFacts[Math.floor(Math.random() * industryFacts.length)]);

  // Build sections based on user metadata
  const meta = user?.unsafeMetadata || {};
  const sections = [
    { name:'SIA Licence', short:'SIA', complete: meta.licences?.[0]?.verified === true, started: !!meta.licences?.[0]?.number },
    { name:'Personal Details', short:'Info', complete: !!meta.personal?.phone, started: !!meta.personal },
    { name:'Driving & Transport', short:'Drive', complete: meta.driving?.hasLicence !== undefined, started: !!meta.driving },
    { name:'Sectors & Availability', short:'Work', complete: meta.sectors?.sectors?.length > 0, started: !!meta.sectors },
    { name:'Qualifications', short:'Quals', complete: meta.qualifications?.hasFirstAid !== undefined, started: !!meta.qualifications },
    { name:'Background', short:'BG', complete: meta.background?.hasForces !== undefined, started: !!meta.background },
    { name:'Photo', short:'Photo', complete: !!meta.photo?.uploaded, started: !!meta.photo },
    { name:'Employment', short:'Jobs', complete: meta.employment?.length > 0, started: !!meta.employment },
    { name:'Address', short:'Addr', complete: meta.addresses?.length > 0, started: !!meta.addresses },
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
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', licenceType:'' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const clerk = useClerk();

  const handleRegister = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const result = await clerk.client.signUp.create({
        firstName: form.firstName, lastName: form.lastName,
        emailAddress: form.email, password: form.password,
        unsafeMetadata: { licenceType: form.licenceType, status: 'pending', score: 5 }
      });
      await result.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep(2);
    } catch(err) { setError(err.errors?.[0]?.message || 'Something went wrong. Please try again.'); }
    setLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const result = await clerk.client.signUp.attemptEmailAddressVerification({ code });
      await clerk.setActive({ session: result.createdSessionId });
      setTimeout(() => { window.location.href = '/profile'; }, 500);
    } catch(err) { setError(err.errors?.[0]?.message || 'Invalid code. Please try again.'); }
    setLoading(false);
  };

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
              <div className="field">
                <label className="field-label">Primary SIA Licence Type</label>
                <select className="f-select" required value={form.licenceType} onChange={e=>setForm({...form,licenceType:e.target.value})}>
                  <option value="">Select your licence type</option>
                  <option>Door Supervisor</option><option>Security Guard</option><option>CCTV Operator</option>
                  <option>Close Protection</option><option>Cash & Valuables in Transit</option>
                  <option>Key Holding</option><option>Not yet licensed</option>
                </select>
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
          <Route path="/profile" element={<ProtectedRoute><div className="page" style={{background:'var(--off)'}}><Nav/><div className="profile-builder"><ProfileBuilder/></div></div></ProtectedRoute>}/>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}
