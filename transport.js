/* ============================================================
   TZU CHI MOZ LMS — Transportation module
   Namespace: T
   Built from LOG-01 Transportation SOP: vehicle request (10:00–16:00
   daily window, 24h rule) → scheduling & trip ticket (16:00 cutoff) →
   logbook execution (Friday audits) → driver/car safety, SOP-02 fuel
   (Karan/Galp, 50k alert / 400k top-up), SOP-03 hire, SOP-04
   maintenance, emergency protocol, and the Section-05 reporting calendar.
   ============================================================ */
const T = {};
T.THRESHOLD = 50000; // MZN payment-requisition sign-off threshold (mirrors the Warehouse module's rule)

/* Permission checks now read the signed-in user's individually-editable permission
   set (see PERM_CATALOG / expandGranted in app.js), not a fixed role table — an
   Administrator can grant or revoke any of these per person from Admin ▸ User
   Accounts. Role only sets the starting defaults. */
T.can = p => !!activeUser && expandGranted(activeUser,'t').has(p);
T.canApproveHire = h => h.status==='pending_approval' && ((h.total<=T.THRESHOLD && hasPermFlag(activeUser,'approve')) || (h.total>T.THRESHOLD && hasPermFlag(activeUser,'authorizeHigh')));

T.today = () => new Date().toISOString().slice(0,10);
T.uid = p => p+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
T.daysAhead = n => { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
T.daysAgo = n => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString(); };

/* ---- STATUS LABELS — reuse the existing .status CSS classes, relabelled to the SOP's own stage names ---- */
T.STATUS_LABELS = { pending:'Submitted', approved:'Scheduled', assigned:'Ticketed', 'in-progress':'In progress', completed:'Completed', cancelled:'Rejected' };
T.statusTag = s => `<span class="status ${s}">${esc(T.STATUS_LABELS[s]||s)}</span>`;

/* ---- DEMO DATA ---- */
/* lat/lon are real approximate coordinates for each named location in Sofala/Manica
   province (Beira HQ, Dondo, Chimoio, the EN6 corridor, etc.) so the Leaflet map plots
   them at true positions that track correctly when the map is zoomed or panned. */
T.VEHICLES = [
  {id:1,plate:'AFA-23-MC',name:'Toyota Hilux 01',type:'Pickup',status:'active',driver:'José Joaquim',location:'Beira HQ',lat:-19.8437,lon:34.8389,fuel:78,km:124350,nextServiceKm:130000,docExpiry:T.daysAhead(140),last:'2 min ago'},
  {id:2,plate:'AFB-91-MC',name:'Toyota Land Cruiser',type:'SUV',status:'active',driver:'Carlos Mussa',location:'Nhamatanda Road',lat:-19.55,lon:34.55,fuel:62,km:98720,nextServiceKm:100000,docExpiry:T.daysAhead(310),last:'5 min ago'},
  {id:3,plate:'ADE-44-MC',name:'Mitsubishi Canter',type:'Truck',status:'alert',driver:'Lina Macuacua',location:'Kura Warehouse',lat:-19.80,lon:34.82,fuel:18,km:67400,nextServiceKm:70000,docExpiry:T.daysAhead(20),last:'1 min ago'},
  {id:4,plate:'AFD-10-MC',name:'Toyota Hiace',type:'Minibus',status:'active',driver:'Domingos Bila',location:'Munhava',lat:-19.82,lon:34.86,fuel:85,km:45200,nextServiceKm:50000,docExpiry:T.daysAhead(200),last:'4 min ago'},
  {id:5,plate:'ACQ-77-MC',name:'Ford Ranger',type:'Pickup',status:'offline',driver:'Ernesto Sitoe',location:'Dondo - Workshop',lat:-19.6033,lon:34.7464,fuel:51,km:112000,nextServiceKm:110000,docExpiry:T.daysAhead(-5),last:'38 min ago'},
  {id:6,plate:'AEG-18-MC',name:'Toyota Hilux 02',type:'Pickup',status:'active',driver:'Sérgio Manuel',location:'Beira Port',lat:-19.8317,lon:34.8500,fuel:69,km:88600,nextServiceKm:90000,docExpiry:T.daysAhead(260),last:'3 min ago'},
  {id:7,plate:'AHA-05-MC',name:'Nissan Patrol',type:'SUV',status:'active',driver:'Américo João',location:'Chimoio Mission',lat:-19.1164,lon:33.4833,fuel:73,km:52300,nextServiceKm:55000,docExpiry:T.daysAhead(90),last:'6 min ago'},
  {id:8,plate:'AGC-62-MC',name:'Isuzu NPR Truck',type:'Truck',status:'active',driver:'Rogério Cossa',location:'EN6 Corridor',lat:-19.45,lon:34.35,fuel:58,km:203000,nextServiceKm:205000,docExpiry:T.daysAhead(15),last:'8 min ago'},
  {id:9,plate:'ABB-30-MC',name:'Toyota Coaster',type:'Bus',status:'offline',driver:'Mateus Langa',location:'Workshop',lat:-19.85,lon:34.87,fuel:22,km:178000,nextServiceKm:178000,docExpiry:T.daysAhead(400),last:'1 hr ago'},
  {id:10,plate:'AFH-82-MC',name:'Mazda BT-50',type:'Pickup',status:'active',driver:'Celso Tomás',location:'Buzi Road',lat:-19.9667,lon:34.7333,fuel:64,km:76500,nextServiceKm:80000,docExpiry:T.daysAhead(180),last:'7 min ago'},
  {id:11,plate:'AHB-56-MC',name:'Hyundai H1 Van',type:'Van',status:'active',driver:'Joaquim Mário',location:'Beira Airport',lat:-19.7961,lon:34.9070,fuel:75,km:29800,nextServiceKm:35000,docExpiry:T.daysAhead(300),last:'2 min ago'}
];
T.vehicle = plate => T.VEHICLES.find(v=>v.plate===plate) || {plate,name:'—',km:0};

const mkReq = (id,date,timeLeave,timeReturn,requester,department,project,origin,stops,destination,passengers,activity,cargo,priority,status,driver,vehicle,submittedAt) =>
  ({id,date,timeLeave,timeReturn,requester,department,project,origin,stops,destination,passengers,activity,cargo,priority,status,driver,vehicle,submittedAt,
    depOdo:null,depTime:null,retOdo:null,retTime:null,totalKm:null,stopsOk:null,signedBy:null,signedAt:null});
T.REQUESTS = [
  mkReq('TR-26081','2026-08-20','08:30','12:00','Ana Mucavele','Education','Education Support 2026','Beira HQ',[{point:'Nhamatanda Centre',activity:'School monitoring visit'}],'Nhamatanda Centre',6,'School monitoring visit','',
    'High','assigned','José Joaquim','AFA-23-MC','2026-08-19T11:20:00'),
  mkReq('TR-26082','2026-08-20','10:00','15:00','Samuel Machava','Charity & Relief','2026 Flood Relief','Kura Warehouse',[{point:'Dondo Community',activity:'Relief distribution supervision'}],'Dondo Community',3,'Relief distribution supervision','2 tons of relief goods',
    'High','in-progress','Carlos Mussa','AFB-91-MC','2026-08-19T13:05:00'),
  mkReq('TR-26083','2026-08-20','13:30','16:30','Ana Mucavele','Education','Education Support 2026','Beira HQ',[],'Munhava School',4,'Deliver training materials','Boxes of training materials',
    'Normal','pending','','','2026-08-20T09:10:00'),
  mkReq('TR-26084','2026-08-21','07:00','13:00','Paula Matola','Medical','Community Medical Outreach','Beira HQ',[],'Buzi District',5,'Mobile clinic support','Medical supplies',
    'Urgent','pending','','','2026-08-20T14:40:00'),
  mkReq('TR-26085','2026-08-19','09:00','09:45','Samuel Machava','Charity & Relief','Administration','Beira Airport',[],'Beira HQ',2,'Visitor collection','',
    'Normal','completed','Lina Macuacua','ADE-44-MC','2026-08-18T10:00:00'),
  mkReq('TR-26086','2026-08-21','15:00','18:00','Ana Mucavele','Education','Education Support 2026','Beira HQ',[],'Dondo Training Hall',8,'Project leader workshop','',
    'Normal','approved','','','2026-08-20T09:50:00'),
  mkReq('TR-26087','2026-08-22','06:30','14:00','Samuel Machava','Charity & Relief','Rice Distribution Programme','Kura Warehouse',[{point:'Nhamatanda',activity:'Fuel stop'}],'Chimoio',2,'Cargo escort mission','Rice bags',
    'High','assigned','Carlos Mussa','AGC-62-MC','2026-08-21T08:15:00'),
  mkReq('TR-26088','2026-08-18','11:15','17:30','Paula Matola','Medical','Community Medical Outreach','Beira HQ',[],'Beira Central Hospital',3,'Medical supplies coordination','',
    'Urgent','completed','José Joaquim','AFD-10-MC','2026-08-17T15:00:00')
];
Object.assign(T.REQUESTS.find(r=>r.id==='TR-26085'), {depOdo:67300, depTime:'09:00', retOdo:67340, retTime:'09:45', totalKm:40, stopsOk:true, signedBy:'Samuel Machava', signedAt:'2026-08-19T09:50:00'});
Object.assign(T.REQUESTS.find(r=>r.id==='TR-26088'), {depOdo:45050, depTime:'11:15', retOdo:45200, retTime:'17:30', totalKm:150, stopsOk:true, signedBy:null, signedAt:null}); // unsigned — will surface in Friday audit
T.reqCounter = 89;

T.DRIVER_ATTENDANCE = [
  {name:'José Joaquim',days:18,off:4,rest:12,phone:'+258 84 555 0101'}, {name:'Carlos Mussa',days:20,off:3,rest:9,phone:'+258 84 555 0102'},
  {name:'Lina Macuacua',days:17,off:5,rest:14,phone:'+258 84 555 0103'}, {name:'Domingos Bila',days:19,off:4,rest:11,phone:'+258 84 555 0104'},
  {name:'Ernesto Sitoe',days:21,off:2,rest:8,phone:'+258 84 555 0105'}, {name:'Sérgio Manuel',days:16,off:6,rest:16,phone:'+258 84 555 0106'}
];

/* ---- LEAVE REQUESTS — driver-submitted, Logistics Department approves ---- */
T.LEAVE_TYPES = ['Annual leave','Sick leave','Compassionate leave','Unpaid leave'];
const mkLeave = (id,driver,type,start,end,reason,status,submittedDaysAgo,decidedBy) => {
  const days = Math.round((new Date(end)-new Date(start))/864e5)+1;
  return { id, driver, type, start, end, days, reason, status, submittedAt:T.daysAgo(submittedDaysAgo), decidedBy:decidedBy||null, decidedAt: status==='pending'?null:T.daysAgo(Math.max(0,submittedDaysAgo-1)) };
};
T.LEAVE_REQUESTS = [
  mkLeave('LV-101','José Joaquim','Annual leave','2026-09-02','2026-09-06','Family visit to Maputo','pending',1),
  mkLeave('LV-100','Carlos Mussa','Sick leave','2026-08-14','2026-08-15','Flu — medical note attached','approved',9,'Fernando Graça Cossa'),
  mkLeave('LV-099','Lina Macuacua','Annual leave','2026-08-25','2026-08-29','Pre-approved annual leave','approved',15,'Fernando Graça Cossa'),
  mkLeave('LV-098','Domingos Bila','Unpaid leave','2026-07-20','2026-07-21','Personal matter','rejected',20,'Luísa Sheila Chambal'),
  mkLeave('LV-097','Carlos Mussa','Compassionate leave','2026-06-10','2026-06-12','Family bereavement','approved',60,'Fernando Graça Cossa')
];
T.leaveCounter = 102;
T.leaveStatusTag = s => `<span class="status ${s==='approved'?'completed':s==='rejected'?'cancelled':'pending'}">${s}</span>`;
T.openLeaveForm = () => {
  showModal(`<p class="eyebrow blue">Leave request</p><h3>Request time off</h3><form id="leave-form" class="form-grid">
  <label>Type<select name="type">${T.LEAVE_TYPES.map(t=>`<option>${t}</option>`).join('')}</select></label>
  <label>&nbsp;</label>
  <label>Start date<input name="start" type="date" value="${T.daysAhead(7)}" required></label>
  <label>End date<input name="end" type="date" value="${T.daysAhead(9)}" required></label>
  <label class="full">Reason<textarea name="reason" rows="2" required></textarea></label>
  <button class="primary-btn full" type="submit">Submit request</button></form>`);
  $('leave-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target);
    const start=f.get('start'), end=f.get('end');
    if (new Date(end) < new Date(start)) { toast('End date must be on or after the start date'); return; }
    const id = 'LV-'+(T.leaveCounter++);
    T.LEAVE_REQUESTS.unshift(mkLeave(id, activeUser.name, f.get('type'), start, end, f.get('reason').trim(), 'pending', 0));
    audit('Requested leave','leave',activeUser.name+' — '+f.get('type'));
    closeModal(); switchView(state.view); toast('Leave request submitted', 'The Logistics Department will review it.');
  };
};
T.decideLeave = (id, decision) => {
  const l = T.LEAVE_REQUESTS.find(x=>x.id===id); if (!l) return;
  l.status = decision; l.decidedBy = activeUser.name; l.decidedAt = new Date().toISOString();
  audit((decision==='approved'?'Approved':'Rejected')+' leave request '+id,'leave',l.driver+' — '+l.type);
  switchView(state.view); toast(decision==='approved'?'Leave approved':'Leave rejected', l.driver+' — '+l.type);
};
T.leaveAdminHTML = () => { const pending = T.LEAVE_REQUESTS.filter(l=>l.status==='pending').sort((a,b)=>new Date(a.submittedAt)-new Date(b.submittedAt));
  const rest = T.LEAVE_REQUESTS.filter(l=>l.status!=='pending').sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt)).slice(0,8);
  return `<div class="card" style="margin-top:18px"><div class="card-header"><div><h3>Leave requests</h3><p>${pending.length} awaiting decision</p></div></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Driver</th><th>Type</th><th>Dates</th><th>Reason</th><th>Status</th><th></th></tr></thead><tbody>
  ${[...pending,...rest].map(l=>`<tr><td><strong>${esc(l.driver)}</strong></td><td class="small">${esc(l.type)}</td><td class="small">${fmtD(l.start)} → ${fmtD(l.end)} (${l.days}d)</td><td class="small" style="max-width:200px">${esc(l.reason)}</td><td>${T.leaveStatusTag(l.status)}</td><td style="white-space:nowrap">${l.status==='pending'&&T.can('approve')?`<button class="action-btn success" onclick="T.decideLeave('${l.id}','approved')">Approve</button> <button class="action-btn danger" onclick="T.decideLeave('${l.id}','rejected')">Reject</button>`:l.decidedBy?`<small class="muted">by ${esc(l.decidedBy)}</small>`:''}</td></tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:18px">No leave requests recorded.</td></tr>`}
  </tbody></table></div></div>`;
};

/* ---- SOP-02: Fuel — Karan System & Galp Maquinino ---- */
T.KARAN = { balance: 42000, threshold: 50000, topupAmount: 400000,
  history: [ {date:T.daysAgo(24), amount:400000, status:'Deposited', by:'Finance Department'}, {date:T.daysAgo(3), amount:400000, status:'Requested — awaiting deposit', by:'Fernando Graça Cossa'} ] };
T.FUEL_REQUESTS = [
  {id:'FR-231', driver:'José Joaquim', vehicle:'AFA-23-MC', date:T.daysAgo(1), litres:45, station:'Karan Beira Central', method:'Karan', status:'CONFIRMED', orderNumber:'KO-88231', otp:'4471', litresConfirmed:45, cost:3195},
  {id:'FR-232', driver:'Carlos Mussa', vehicle:'AFB-91-MC', date:T.daysAgo(0), litres:60, station:'Galp Maquinino, Beira', method:'Galp', status:'REQUESTED', orderNumber:'', otp:'', litresConfirmed:null, cost:null},
  {id:'FR-233', driver:'Lina Macuacua', vehicle:'ADE-44-MC', date:T.daysAgo(0), litres:80, station:'Karan Kura Warehouse', method:'Karan', status:'VERIFIED', orderNumber:'', otp:'', litresConfirmed:null, cost:null}
];
T.fuelCounter = 234;

/* ---- SOP-03: Vehicle & truck hire ---- */
T.HIRE_REQUESTS = [
  { id:'HR-041', dept:'Charity & Relief', requester:'Samuel Machava', purpose:'Extra truck for Gorongosa distribution event', vehicleType:'Flatbed truck, 7t',
    quotes:[{supplier:'Transportes Beira Lda',amount:38000},{supplier:'Sofala Cargo Movers',amount:41500},{supplier:'Rota Segura Transportes',amount:36800}],
    selected:'Rota Segura Transportes', total:36800, toll:1200, status:'pending_approval', invoiced:false },
  { id:'HR-039', dept:'Medical', requester:'Paula Matola', purpose:'Ambulance-type vehicle hire for Chibabava health assessment', vehicleType:'4x4 SUV',
    quotes:[{supplier:'Sofala Cargo Movers',amount:22000},{supplier:'Rota Segura Transportes',amount:19500},{supplier:'Costa Fretes',amount:24000}],
    selected:'Rota Segura Transportes', total:19500, toll:0, status:'approved', invoiced:true }
];
T.hireCounter = 42;

/* ---- SOP-04: Maintenance ---- */
T.SERVICE_LOG = [
  {id:T.uid('SV'), vehicle:'AFB-91-MC', date:T.daysAgo(18), type:'Oil & filter change', by:'Beira Motors Workshop', cost:8200, note:'Routine service at 5,000 km interval.'},
  {id:T.uid('SV'), vehicle:'AGC-62-MC', date:T.daysAgo(40), type:'Tyre rotation & alignment', by:'Sofala Tyre Centre', cost:5400, note:'All four tyres rotated.'},
  {id:T.uid('SV'), vehicle:'AHB-56-MC', date:T.daysAgo(75), type:'Full inspection (semi-annual)', by:'Beira Motors Workshop', cost:14500, note:'Mechanical and electrical inspection passed.'}
];
T.BREAKDOWNS = [
  { id:'BD-018', vehicle:'ADE-44-MC', driver:'Lina Macuacua', date:T.daysAgo(2), phase:'ASSESSMENT', urgency:'Non-urgent',
    diagnosis:'Low fuel warning combined with unusual consumption — suspected fuel line issue.',
    quotes:[{workshop:'Beira Motors Workshop',amount:6200},{workshop:'Sofala Tyre Centre',amount:7100},{workshop:'Costa Fretes Garage',amount:5800}],
    selected:'', cost:null, status:'Awaiting Administration approval' },
  { id:'BD-016', vehicle:'ACQ-77-MC', driver:'Ernesto Sitoe', date:T.daysAgo(11), phase:'CLOSED', urgency:'Urgent',
    diagnosis:'Alternator failure — dashboard warning light, vehicle immobilised safely at Dondo workshop.',
    quotes:[{workshop:'Beira Motors Workshop',amount:12400}], selected:'Beira Motors Workshop', cost:12400, status:'Repaired and returned to service' }
];
T.breakdownCounter = 19;
T.FLEET_LOG_TABLE = [
  ['Daily pre-trip inspection','Daily','Driver','Vehicle logbook'],
  ['Mileage & fuel consumption','Per refuelling','Driver / Manager','Karan System + Drive'],
  ['Oil and filter service','Every 5,000 km','Logistics Department','Individual vehicle file'],
  ['Tyres (pressure, wear, alignment)','Monthly / 10,000 km','Logistics Department','Individual vehicle file'],
  ['Full inspection (mechanical & electrical)','Semi-annually','Logistics Department','Technical report + Drive'],
  ['Document renewal (insurance, vehicle test)','Annually','Logistics Dept + Finance','Document folder'],
  ['Fleet report','Monthly','Logistics Department','Logistics Drive + Admin']
];

/* ---- Emergency protocol log ---- */
T.EMERGENCIES = [
  {id:'EM-006', date:T.daysAgo(14), location:'Nhamatanda Road', nature:'Medical evacuation — volunteer injury', people:2, coordinator:'Fernando Graça Cossa', vehicle:'AFB-91-MC', driver:'Carlos Mussa', paperwork:'Filed'},
];
T.emergencyCounter = 7;

/* ---- Section 05 — Reporting obligations ---- */
T.VENDORS = [
  {name:'Rota Segura Transportes', category:'Vehicle hire', price:'Competitive', leadTime:'Same day', quality:'Good', blacklisted:false},
  {name:'Sofala Cargo Movers', category:'Vehicle hire / freight', price:'Moderate', leadTime:'1–2 days', quality:'Good', blacklisted:false},
  {name:'Beira Motors Workshop', category:'Maintenance & repair', price:'Moderate', leadTime:'Same day', quality:'Reliable', blacklisted:false},
  {name:'Costa Fretes', category:'Vehicle hire', price:'High', leadTime:'2–3 days', quality:'Inconsistent', blacklisted:true}
];
T.CONTRACTS = [
  {supplier:'Karan Fuel Systems', type:'Fuel card account', renewal:T.daysAhead(140), status:'Active'},
  {supplier:'Galp Maquinino, Beira', type:'Fuel — WhatsApp order channel', renewal:T.daysAhead(500), status:'Active'},
  {supplier:'Beira Motors Workshop', type:'Maintenance service agreement', renewal:T.daysAhead(60), status:'Active'},
  {supplier:'Vehicle tracking provider', type:'Annual tracking subscription (all vehicles)', renewal:T.daysAhead(210), status:'Active'}
];
T.FINANCE = [
  {id:'PR-001',description:'Diesel restock - Kura Warehouse fleet',amount:85000,dept:'Logistics',status:'pending',requester:'Fernando Graça Cossa',date:T.daysAgo(0),category:'Fuel'},
  {id:'PR-002',description:'Toyota Hilux 01 brake system repair',amount:42000,dept:'Logistics',status:'approved',requester:'Fernando Graça Cossa',date:T.daysAgo(1),category:'Maintenance'},
  {id:'PR-004',description:'Karan balance top-up — Sofala field ops',amount:400000,dept:'Logistics',status:'pending',requester:'Fernando Graça Cossa',date:T.daysAgo(0),category:'Fuel'}
];
T.ACTIVITY = [
  {msg:'TR-26084 awaiting scheduling',detail:'Urgent Buzi health mission - 5 passengers',time:'3 min',color:'var(--red)'},
  {msg:'ADE-44-MC low fuel alert',detail:'Kura Warehouse - 18% remaining',time:'8 min',color:'var(--red)'},
  {msg:'Karan balance below alert threshold',detail:'42,000 MZN — top-up request pending Finance deposit',time:'20 min',color:'var(--amber)'},
  {msg:'TR-26082 in progress',detail:'Carlos Mussa confirmed start - Kura to Dondo',time:'22 min',color:'var(--blue)'},
  {msg:'TR-26081 ticketed and notified',detail:'José Joaquim - in-app + SMS sent',time:'41 min',color:'var(--blue)'}
];

/* ============================================================ exceptions (Control Tower + audits) */
T.exceptions = () => {
  const x = [];
  T.VEHICLES.filter(v=>v.status==='alert').forEach(v=>x.push({sev:'Critical',area:'Fleet',what:v.plate+' low fuel — '+v.fuel+'% remaining'}));
  if (T.KARAN.balance <= T.KARAN.threshold) x.push({sev:'Critical',area:'Fuel',what:'Karan balance at '+T.KARAN.balance.toLocaleString()+' MZN — below the '+T.KARAN.threshold.toLocaleString()+' MZN alert threshold'});
  T.VEHICLES.filter(v=>daysUntil(v.docExpiry)<=30).forEach(v=>x.push({sev: daysUntil(v.docExpiry)<0?'Critical':'High', area:'Fleet', what:v.plate+' document (insurance/vehicle test) '+(daysUntil(v.docExpiry)<0?'expired':'expires in '+daysUntil(v.docExpiry)+' days')}));
  T.VEHICLES.filter(v=>v.km>=v.nextServiceKm).forEach(v=>x.push({sev:'High',area:'Fleet',what:v.plate+' is due or overdue for scheduled service ('+nf(v.km)+' km)'}));
  T.REQUESTS.filter(r=>r.status==='pending' && hoursBetween(r.submittedAt,new Date())>6).forEach(r=>x.push({sev:'High',area:'Requests',what:r.id+' awaiting scheduling for over 6 hours'}));
  T.REQUESTS.filter(r=>r.status==='completed' && !r.signedBy).forEach(r=>x.push({sev:'Medium',area:'Logbook',what:r.id+' completed without a Passenger Focal Point signature — flagged \'Personal Use\' at Friday audit'}));
  T.DRIVER_ATTENDANCE.filter(d=>d.rest<11).forEach(d=>x.push({sev:'Medium',area:'Drivers',what:d.name+' has '+d.rest+'h rest — below the 11h minimum'}));
  T.BREAKDOWNS.filter(b=>b.phase!=='CLOSED' && b.urgency==='Urgent').forEach(b=>x.push({sev:'Critical',area:'Maintenance',what:b.id+' ('+b.vehicle+') — urgent repair still open'}));
  const rank={Critical:0,High:1,Medium:2,Low:3};
  return x.sort((a,b)=>rank[a.sev]-rank[b.sev]);
};
T.sevTag = s => `<span class="tag t-${s==='Critical'?'rust':s==='High'?'amber':s==='Medium'?'sand':'grey'}">${s}</span>`;
T.kpi = (lab,val,sub,cls,unit,onclick) => `<div class="kpi ${cls||''}"${onclick?` style="cursor:pointer" onclick="${onclick}"`:''}><div class="kpi-head"><span>${cls?`<i class="kpi-dot ${cls}"></i>`:''}${esc(lab)}</span></div><strong>${val}${unit?`<small style="font-size:12px;font-weight:600;color:var(--muted);margin-left:3px">${esc(unit)}</small>`:''}</strong><small>${sub||''}</small></div>`;
T.emptyState = (msg,hint) => `<div class="empty"><div style="font-weight:600;color:var(--ink)">${esc(msg)}</div><div class="small">${esc(hint||'')}</div></div>`;

/* ---- KPI drill-downs — every "Critical / High priority / etc" number opens the list behind it ---- */
T.AREA_VIEW = {Fleet:'fleet',Fuel:'fuel',Requests:'requests',Logbook:'logbook',Drivers:'compliance',Maintenance:'maintenance'};
T.showExceptions = (sev) => {
  const list = T.exceptions().filter(e=>!sev || e.sev===sev);
  showDrawer('Fleet Control Tower', sev ? sev+' exceptions' : 'All exceptions',
    list.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Severity</th><th>Area</th><th>What</th><th></th></tr></thead><tbody>${list.map(e=>`<tr><td>${T.sevTag(e.sev)}</td><td class="small">${esc(e.area)}</td><td class="small">${esc(e.what)}</td><td>${T.AREA_VIEW[e.area]?`<button class="action-btn compact" onclick="closeDrawer();switchView('${T.AREA_VIEW[e.area]}')">Open</button>`:''}</td></tr>`).join('')}</tbody></table></div>`
    : T.emptyState('Nothing here','All clear at this severity.'));
};
T.showInflight = () => {
  const inflight = T.REQUESTS.filter(r=>['pending','approved','assigned'].includes(r.status)).sort((a,b)=>new Date(a.submittedAt)-new Date(b.submittedAt));
  showDrawer('Fleet Control Tower', 'Requests in flight',
    inflight.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Route</th><th>Status</th><th></th></tr></thead><tbody>${inflight.map(r=>`<tr><td><strong>${esc(r.id)}</strong></td><td class="small">${esc(r.origin)} → ${esc(r.destination)}</td><td>${T.statusTag(r.status)}</td><td><button class="action-btn compact" onclick="closeDrawer();T.openRequestDetail('${r.id}')">View</button></td></tr>`).join('')}</tbody></table></div>`
    : T.emptyState('Pipeline clear','No requests in flight.'));
};
T.showBreakdownsOpen = () => {
  const list = T.BREAKDOWNS.filter(b=>b.phase!=='CLOSED');
  showDrawer('Fleet Control Tower', 'Open breakdowns',
    list.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Vehicle</th><th>Phase</th><th></th></tr></thead><tbody>${list.map(b=>`<tr><td><strong>${esc(b.id)}</strong></td><td class="small">${esc(b.vehicle)}</td><td><span class="tag t-blue">${esc(b.phase)}</span></td><td><button class="action-btn compact" onclick="closeDrawer();switchView('maintenance')">Open</button></td></tr>`).join('')}</tbody></table></div>`
    : T.emptyState('No breakdowns open',''));
};
T.showFleetBreakdown = () => {
  showDrawer('Fleet', 'Fleet status breakdown', `<div class="table-wrap"><table class="data-table"><thead><tr><th>Plate</th><th>Vehicle</th><th>Driver</th><th>Status</th><th>Fuel</th></tr></thead><tbody>${T.VEHICLES.map(v=>`<tr><td><strong>${esc(v.plate)}</strong></td><td class="small">${esc(v.name)}</td><td class="small">${esc(v.driver||'—')}</td><td>${T.statusTag(v.status)}</td><td class="small">${v.fuel}%</td></tr>`).join('')}</tbody></table></div>`);
};
T.showDriverAlerts = () => {
  const items = [];
  T.VEHICLES.filter(v=>v.status==='alert').forEach(v=>items.push({label:v.plate+' low fuel', detail:v.fuel+'% remaining · '+v.location}));
  T.DRIVER_ATTENDANCE.filter(d=>d.rest<11).forEach(d=>items.push({label:d.name+' rest warning', detail:d.rest+'h rest — minimum 11h'}));
  showDrawer('Dashboard', 'Driver & fleet alerts', items.length ? `<div class="activity-list">${items.map(i=>`<div class="activity-item"><div class="activity-dot" style="background:var(--red)"></div><div><strong>${esc(i.label)}</strong><span>${esc(i.detail)}</span></div></div>`).join('')}</div>` : T.emptyState('No alerts',''));
};

/* ---- 24-hour rule / submission window helpers (SOP §1) ---- */
T.withinWindow = () => { const h = new Date().getHours(); return h>=10 && h<16; };
T.isSaturday = () => new Date().getDay()===6;

/* ============================================================ NAV */
const tnT = k => t('navT.'+k+'.l'), tsT = k => t('navT.'+k+'.s'), tg = g => t('groups.'+g);
T.NAV = role => {
  const pendReq = T.REQUESTS.filter(r=>r.status==='pending').length;
  const finPend = T.FINANCE.filter(f=>f.status==='pending').length;
  const hirePend = T.HIRE_REQUESTS.filter(h=>h.status==='pending_approval').length;
  const myTasks = activeUser ? T.REQUESTS.filter(r=>r.driver===activeUser.name && ['assigned','in-progress'].includes(r.status)).length : 0;
  if (role === 'driver') return { 'my-tasks': {icon:'🚗', label:tnT('my-tasks'), title:tnT('my-tasks'), sub:tsT('my-tasks'), badge:myTasks||''} };
  if (role === 'coordinator') return {
    dashboard: {icon:'⊞', label:tnT('dashboard'), title:tnT('dashboard'), sub:t('navT.coordDash.s')||tsT('dashboard'), group:tg('Overview')},
    requests:  {icon:'↗', label:t('navT.coordRequests.l')||tnT('requests'), title:tnT('requests'), sub:tsT('coordRequests')||'', group:tg('Overview')}
  };
  if (role === 'admin') return {
    dashboard: {icon:'⊞', label:tnT('dashboard'), title:tnT('dashboard'), sub:tsT('adminDash')||tsT('dashboard'), group:tg('Overview')},
    reports:   {icon:'📊', label:tnT('reports'), title:tnT('reports'), sub:tsT('reports'), group:tg('Insight')}
  };
  // logistics + top_management: identical full operational visibility — Top Management
  // holds the same permissions as the Logistics Department, so it gets the same nav.
  return {
    dashboard:  {icon:'⊞', label:tnT('dashboard'), title:tnT('dashboard'), sub:tsT('dashboard'), group:tg('Overview')},
    tower:      {icon:'🎛', label:tnT('tower'), title:tnT('tower'), sub:tsT('tower'), group:tg('Overview')},
    requests:   {icon:'↗', label:tnT('requests'), title:tnT('requests'), sub:tsT('requests'), badge:pendReq||'', group:tg('Operations')},
    dispatch:   {icon:'⌖', label:tnT('dispatch'), title:tnT('dispatch'), sub:tsT('dispatch'), badge:pendReq||'', group:tg('Operations')},
    logbook:    {icon:'📓', label:tnT('logbook'), title:tnT('logbook'), sub:tsT('logbook'), group:tg('Operations')},
    fleet:      {icon:'□', label:tnT('fleet'), title:tnT('fleet'), sub:tsT('fleet'), group:tg('Operations')},
    fuel:       {icon:'⛽', label:tnT('fuel'), title:tnT('fuel'), sub:tsT('fuel'), group:tg('Fuel & Maintenance')},
    maintenance:{icon:'🔧', label:tnT('maintenance'), title:tnT('maintenance'), sub:tsT('maintenance'), group:tg('Fuel & Maintenance')},
    hire:       {icon:'🚚', label:tnT('hire'), title:tnT('hire'), sub:tsT('hire'), badge:hirePend||'', group:tg('Fuel & Maintenance')},
    compliance: {icon:'♙', label:tnT('compliance'), title:tnT('compliance'), sub:tsT('compliance'), group:tg('People')},
    emergency:  {icon:'🚨', label:tnT('emergency'), title:tnT('emergency'), sub:tsT('emergency'), group:tg('People')},
    budget:     {icon:'💵', label:tnT('budget'), title:tnT('budget'), sub:tsT('budget'), badge:finPend||'', group:tg('Finance')},
    reports:    {icon:'📊', label:tnT('reports'), title:tnT('reports'), sub:tsT('reports'), group:tg('Insight')},
    sop:        {icon:'📘', label:tnT('sop'), title:tnT('sop'), sub:tsT('sop'), group:tg('Governance')},
    notifications: {icon:'🔔', label:tnT('notifications'), title:tnT('notifications'), sub:tsT('notifications'), group:tg('Governance')}
  };
};
T.badgeCount = user => user.role==='driver'
  ? T.REQUESTS.filter(r=>r.driver===user.name && r.status==='assigned').length
  : T.notifications().filter(n=>!(T.NOTIF_READ[user.id]||[]).includes(n.k)).length;
T.NOTIF_READ = {};
T.quickAction = user => ['logistics','coordinator'].includes(user.role) ? { label:'+ Transport Request', action:()=>T.openRequestForm() } : null;

/* ---- helpers ---- */
T.fleetMapHTML = (height=420) => `<div class="map-wrap" style="height:${height}px"><div id="fleet-map" class="leaflet-map"></div><div style="position:absolute;bottom:8px;left:8px;z-index:400;background:rgba(7,28,51,.72);color:#fff;border-radius:8px;padding:6px 10px;font-size:10px;font-weight:700;">🟢 Active &nbsp;|&nbsp; 🔴 Alert &nbsp;|&nbsp; ⚫ Offline</div></div>`;
T.initFleetMap = () => {
  if (!$('fleet-map')) return;
  renderLiveMap('fleet-map', { center:[-19.75,34.55], zoom:8, markers: T.VEHICLES.map(v => ({
    lat:v.lat, lon:v.lon, color:v.status,
    popupHTML: `<strong>${esc(v.plate)} · ${esc(v.name)}</strong>${esc(v.location)}<br>Fuel: ${v.fuel}% · ${nf(v.km)} km`,
    onclick: () => toast(v.plate, v.name+' — '+v.location+' — Fuel: '+v.fuel+'%')
  })) });
};
T.activityFeedHTML = (limit=10) => '<div class="activity-list">'+T.ACTIVITY.slice(0,limit).map(a=>'<div class="activity-item"><div class="activity-dot" style="background:'+(a.color||'var(--blue)')+'"></div><div><strong>'+esc(a.msg)+'</strong><span>'+esc(a.detail)+'</span></div><time>'+esc(a.time)+'</time></div>').join('')+'</div>';

/* ============================================================ RENDER ROUTER */
T.render = view => {
  switch (view) {
    case 'my-tasks': return T.renderMyTasks();
    case 'dashboard': return T.renderDashboard();
    case 'tower': return T.renderTower();
    case 'requests': return T.renderRequests();
    case 'dispatch': return T.renderDispatch();
    case 'logbook': return T.renderLogbook();
    case 'fleet': return T.renderFleet();
    case 'fuel': return T.renderFuel();
    case 'maintenance': return T.renderMaintenance();
    case 'hire': return T.renderHire();
    case 'compliance': return T.renderCompliance();
    case 'emergency': return T.renderEmergency();
    case 'budget': return T.renderFinance();
    case 'reports': return T.renderReports();
    case 'sop': return T.renderSOP();
    case 'notifications': return T.renderNotifications();
  }
};

/* ============================================================ DASHBOARD */
T.renderDashboard = () => {
  const role = activeUser.role;
  if (role === 'coordinator') return T.renderCoordDash();
  return T.renderManagerDash();
};
T.renderManagerDash = () => {
  const active = T.VEHICLES.filter(v=>v.status==='active').length, alerts = T.VEHICLES.filter(v=>v.status==='alert').length;
  const pending = T.REQUESTS.filter(r=>r.status==='pending').length, inProg = T.REQUESTS.filter(r=>r.status==='in-progress').length;
  const finPend = T.FINANCE.filter(f=>f.status==='pending').length, restWarn = T.DRIVER_ATTENDANCE.filter(d=>d.rest<11);
  const canExport = hasPermFlag(activeUser,'reports');
  const reqByStatus = ['pending','approved','assigned','in-progress','completed'].map(s => [s, T.REQUESTS.filter(r=>r.status===s).length]);
  $('view').innerHTML = `${!T.withinWindow()?`<div class="alert-banner warning" style="margin-bottom:16px">⏰ <div>The daily transport-request window (10:00–16:00) is currently closed. Requests submitted now queue for the next opening.${T.isSaturday()?' Reminder: weekly vehicle plans are due today before 14:00.':''}</div></div>`:''}
  <div class="grid kpi-grid" style="margin-bottom:20px">
  ${T.kpi('Fleet active', active, 'of '+T.VEHICLES.length+' vehicles', 'good', '', "T.showFleetBreakdown()")}
  ${T.kpi('Active missions', inProg, pending+' awaiting scheduling', '', '', "switchView('dispatch')")}
  ${T.kpi('Karan balance', (T.KARAN.balance/1000).toFixed(0)+'k', T.KARAN.balance<=T.KARAN.threshold?'Below alert threshold':'Healthy', T.KARAN.balance<=T.KARAN.threshold?'bad':'good', '', "switchView('fuel')")}
  ${T.kpi('Driver alerts', alerts+restWarn.length, alerts+' low-fuel · '+restWarn.length+' rest warnings', 'warn', '', "T.showDriverAlerts()")}
  </div>
  ${canExport ? `<div class="row" style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:14px"><button class="action-btn compact" onclick="T.exportDashboardPDF()">⭳ Download PDF</button><button class="action-btn compact" onclick="T.exportDashboardExcel()">⭳ Download Excel</button></div>` : ''}
  <div class="grid two-col"><div class="card"><div class="card-header"><div><h3>Live fleet location</h3><p>Demo GPS positions - Sofala Province</p></div><button class="text-btn" onclick="switchView('fleet')">Fleet register</button></div>${T.fleetMapHTML()}</div>
  <div class="card"><div class="card-header"><div><h3>Live operations feed</h3><p>Recent alerts and events</p></div></div>${T.activityFeedHTML(9)}</div></div>
  <div class="grid two-col" style="margin-top:18px">
  <div class="card"><div class="card-header"><div><h3>Fleet composition</h3><p>${T.VEHICLES.length} vehicles department-wide</p></div></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Plate</th><th>Vehicle</th><th>Driver</th><th>Status</th><th>Fuel</th><th>Odometer</th></tr></thead><tbody>${T.VEHICLES.map(v=>`<tr><td><strong>${esc(v.plate)}</strong></td><td class="small">${esc(v.name)}</td><td class="small">${esc(v.driver||'—')}</td><td>${T.statusTag(v.status)}</td><td class="small">${v.fuel}%</td><td class="small">${nf(v.km)} km</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card"><div class="card-header"><div><h3>Requests by stage</h3><p>Whole pipeline, this dataset</p></div></div><div class="card-body">${reqByStatus.map(([s,n])=>{const max=Math.max(1,...reqByStatus.map(r=>r[1]));return `<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px"><span style="text-transform:capitalize">${esc(s)}</span><span class="muted">${n}</span></div><div class="bar-track"><div class="bar-fill" style="width:${n/max*100}%"></div></div></div>`;}).join('')}</div>
  <div class="card-header" style="border-top:1px solid var(--line)"><div><h3>Driver rest compliance</h3><p>Minimum 11h rest — SOP §People</p></div></div>
  <div class="activity-list">${restWarn.length?restWarn.map(d=>`<div class="activity-item"><div class="activity-dot" style="background:var(--red)"></div><div><strong>${esc(d.name)}</strong><span>${d.rest}h rest — below the 11h minimum</span></div></div>`).join(''):'<div class="activity-item"><div class="activity-dot" style="background:var(--green)"></div><div><strong>All drivers within rest limits</strong></div></div>'}</div>
  </div>
  </div>`;
  T.initFleetMap();
};
T.renderCoordDash = () => {
  const mine = T.REQUESTS.filter(r=>r.requester===activeUser.name);
  $('view').innerHTML = `<div class="hero-card" style="margin-bottom:20px"><p class="eyebrow" style="color:#9fc8e6">Transport Planning</p><h3>Plan missions without phone calls or paper forms.</h3><p>Requests are open 10:00–16:00 daily (24-hour rule: submit by 16:00 the day before). Weekly vehicle plans are due every Saturday before 14:00.</p><button class="primary-btn" onclick="T.openRequestForm()">Request transportation</button></div>
  <div class="grid kpi-grid" style="margin-bottom:20px">
  ${T.kpi('My requests', mine.length, 'All submitted missions')}
  ${T.kpi('Ticketed / active', mine.filter(r=>['assigned','in-progress'].includes(r.status)).length, 'Driver and vehicle confirmed', 'good')}
  ${T.kpi('Pending', mine.filter(r=>r.status==='pending').length, 'Awaiting scheduling', 'warn')}
  ${T.kpi('Completed', mine.filter(r=>r.status==='completed').length, 'Mission history')}
  </div>
  <div class="grid two-col"><div class="card"><div class="card-header"><div><h3>Fleet visibility</h3><p>Operational awareness — read only</p></div></div>${T.fleetMapHTML()}</div><div class="card"><div class="card-header"><div><h3>Operations feed</h3><p>Recent activity</p></div></div>${T.activityFeedHTML(8)}</div></div>`;
  T.initFleetMap();
};
/* ---- report exports — Logistics Department and Top Management hold the same
   permissions, so both can pull a snapshot straight from the dashboard. ---- */
T.exportDashboardExcel = () => {
  exportExcel('transportation-dashboard', 'Transportation — Dashboard Export', [
    { heading:'Fleet', headers:['Plate','Vehicle','Driver','Status','Fuel %','Odometer (km)','Location'],
      rows: T.VEHICLES.map(v => [v.plate, v.name, v.driver||'—', v.status, v.fuel, v.km, v.location]) },
    { heading:'Transport requests', headers:['ID','Requester','Department','Route','Status','Driver','Vehicle'],
      rows: T.REQUESTS.map(r => [r.id, r.requester, r.department, r.origin+' → '+r.destination, r.status, r.driver||'—', r.vehicle||'—']) },
    { heading:'Driver rest compliance', headers:['Driver','Days worked','Days off','Rest hours','Phone'],
      rows: T.DRIVER_ATTENDANCE.map(d => [d.name, d.days, d.off, d.rest, d.phone]) },
    { heading:'Hire requests', headers:['ID','Department','Purpose','Selected supplier','Total (MZN)','Status'],
      rows: T.HIRE_REQUESTS.map(h => [h.id, h.dept, h.purpose, h.selected, h.total, h.status]) }
  ]);
};
T.exportDashboardPDF = () => {
  const active = T.VEHICLES.filter(v=>v.status==='active').length;
  exportPDF('transportation-dashboard', 'Transportation — Dashboard Report', 'Tzu Chi Moz LMS · '+fmtDT(new Date()), [
    { heading:'Overview', kv:[
      ['Fleet readiness', active+' of '+T.VEHICLES.length+' vehicles active'],
      ['Open requests', T.REQUESTS.filter(r=>r.status==='pending').length],
      ['Hire requests awaiting sign-off', T.HIRE_REQUESTS.filter(h=>T.canApproveHire(h)).length],
      ['Drivers below rest minimum', T.DRIVER_ATTENDANCE.filter(d=>d.rest<11).length]
    ]},
    { heading:'Fleet', table:{ headers:['Plate','Vehicle','Driver','Status','Fuel','Odometer'],
      rows: T.VEHICLES.map(v => [v.plate, v.name, v.driver||'—', v.status, v.fuel+'%', nf(v.km)+' km']) } },
    { heading:'Transport requests', table:{ headers:['ID','Department','Route','Status'],
      rows: T.REQUESTS.map(r => [r.id, r.department, r.origin+' → '+r.destination, r.status]) } },
    { heading:'Driver rest compliance', table:{ headers:['Driver','Days worked','Days off','Rest hours'],
      rows: T.DRIVER_ATTENDANCE.map(d => [d.name, d.days, d.off, d.rest+'h']) } }
  ]);
};

/* ============================================================ CONTROL TOWER */
T.renderTower = () => {
  const x = T.exceptions();
  const inflight = T.REQUESTS.filter(r=>['pending','approved','assigned'].includes(r.status)).sort((a,b)=>new Date(a.submittedAt)-new Date(b.submittedAt));
  const crit = x.filter(e=>e.sev==='Critical').length, high = x.filter(e=>e.sev==='High').length;
  $('view').innerHTML = `<div class="grid kpi-grid" style="margin-bottom:20px">
  ${T.kpi('Critical', crit, 'Stop-the-line issues', crit?'bad':'good', '', "T.showExceptions('Critical')")}
  ${T.kpi('High priority', high, 'Same-day response', high?'warn':'good', '', "T.showExceptions('High')")}
  ${T.kpi('Requests in flight', inflight.length, 'Across submission to ticketing', '', '', "T.showInflight()")}
  ${T.kpi('Breakdowns open', T.BREAKDOWNS.filter(b=>b.phase!=='CLOSED').length, 'SOP-04 corrective maintenance', T.BREAKDOWNS.filter(b=>b.phase!=='CLOSED').length?'warn':'good', '', "T.showBreakdownsOpen()")}
  </div>
  <div class="grid two-col">
  <div class="card"><div class="card-header"><div><h3>Request pipeline</h3><p>Oldest first</p></div></div>
  <div class="table-wrap">${inflight.length ? `<table class="data-table"><thead><tr><th>ID</th><th>Route</th><th>Status</th><th>Waiting</th></tr></thead><tbody>${inflight.map(r=>`<tr><td><strong>${esc(r.id)}</strong><br><small>${esc(r.requester)}</small></td><td class="small">${esc(r.origin)} → ${esc(r.destination)}</td><td>${T.statusTag(r.status)}</td><td class="${hoursBetween(r.submittedAt,new Date())>6?'warning':''}">${hoursBetween(r.submittedAt,new Date())} h</td></tr>`).join('')}</tbody></table>` : T.emptyState('Pipeline clear','')}</div></div>
  <div class="card"><div class="card-header"><div><h3>Exceptions</h3></div><span class="tag t-${x.length?'amber':'jade'}" style="margin-right:16px">${x.length}</span></div>
  <div class="table-wrap" style="max-height:340px">${x.length ? `<table class="data-table"><tbody>${x.map(e=>`<tr><td style="width:1%">${T.sevTag(e.sev)}</td><td class="small"><b>${esc(e.area)}</b> — ${esc(e.what)}</td></tr>`).join('')}</tbody></table>` : T.emptyState('Nothing outstanding','')}</div></div>
  </div>`;
};

/* ============================================================ MY TASKS (driver) */
T.renderMyTasks = () => {
  const tasks = T.REQUESTS.filter(r=>r.driver===activeUser.name && ['assigned','in-progress'].includes(r.status));
  const att = T.DRIVER_ATTENDANCE.find(d=>d.name===activeUser.name);
  $('view').innerHTML = `<div class="alert-banner ${tasks.length?'info':'success'}" style="margin-bottom:18px"><span style="font-size:20px">🔔</span><div><strong>${tasks.length} active assignment${tasks.length===1?'':'s'}</strong><div class="muted">You'll be notified here the moment a new mission is ticketed to you.</div></div></div>
  ${tasks.length ? tasks.map(T.taskCardHTML).join('') : '<div class="hero-card"><h3>No active transport assignment</h3><p>The Logistics Department will notify you the moment a mission is ticketed to you.</p></div>'}
  ${att ? `<div class="card" style="margin-top:18px"><div class="card-header"><div><h3>My work and rest status</h3><p>Current month · minimum rest is 11 hours</p></div></div><div class="card-body" style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
    <div style="text-align:center;padding:14px;background:#f7f9fc;border-radius:10px"><div style="font-family:Manrope;font-size:26px;font-weight:800">${att.days}</div><div class="muted" style="font-size:11px">Days worked</div></div>
    <div style="text-align:center;padding:14px;background:#f7f9fc;border-radius:10px"><div style="font-family:Manrope;font-size:26px;font-weight:800">${att.off}</div><div class="muted" style="font-size:11px">Days off</div></div>
    <div style="text-align:center;padding:14px;background:${att.rest<11?'#fef2f2':'#f0fdf4'};border-radius:10px"><div style="font-family:Manrope;font-size:26px;font-weight:800;color:${att.rest<11?'var(--red)':'var(--green)'}">${att.rest}h</div><div class="muted" style="font-size:11px">Last rest</div></div>
  </div></div>` : ''}
  <div class="card" style="margin-top:18px"><div class="card-header"><div><h3>My leave requests</h3><p>Submit a leave request — the Logistics Department reviews it</p></div><button class="primary-btn compact" onclick="T.openLeaveForm()">+ Request leave</button></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr></thead><tbody>
  ${T.LEAVE_REQUESTS.filter(l=>l.driver===activeUser.name).sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt)).map(l=>`<tr><td>${esc(l.type)}</td><td class="small">${fmtD(l.start)} → ${fmtD(l.end)}</td><td>${l.days}</td><td>${T.leaveStatusTag(l.status)}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:18px">No leave requests yet.</td></tr>`}
  </tbody></table></div></div>
  <div class="role-note">Driver access is intentionally restricted to assigned tasks, trip start/completion, fuel requests, leave requests and personal notifications — nothing else to sort through.</div>`;
};
T.taskCardHTML = tr => `<div class="card driver-task-card" style="margin-bottom:16px"><div class="card-header"><div><h3>${esc(tr.id)} - ${esc(tr.activity)}</h3><p>${tr.date} · leave ${tr.timeLeave}, return by ${tr.timeReturn}</p></div>${T.statusTag(tr.status)}</div>
  <div style="padding:16px 20px 0"><div class="task-route"><span>From: ${esc(tr.origin)}</span><div class="task-route-line"></div><span>To: ${esc(tr.destination)}</span></div>
  ${tr.stops&&tr.stops.length?`<div class="muted small" style="margin-bottom:10px">Stops: ${tr.stops.map(s=>esc(s.point)+(s.activity?' ('+esc(s.activity)+')':'')).join(' → ')}</div>`:''}
  <div class="task-meta-grid"><div class="task-meta-item"><span>Vehicle</span><strong>${esc(tr.vehicle)}</strong></div><div class="task-meta-item"><span>Passengers</span><strong>${tr.passengers}</strong></div><div class="task-meta-item"><span>Priority</span><strong>${esc(tr.priority)}</strong></div></div>
  <div style="padding-bottom:16px;display:flex;gap:8px;flex-wrap:wrap"><button class="action-btn primary" onclick="T.advanceTask('${tr.id}')">${tr.status==='assigned'?'Start trip — log odometer':'Complete trip — log return'}</button><button class="action-btn" onclick="T.openFuelRequest('${tr.vehicle}')">Request fuel</button><button class="action-btn" onclick="toast('SMS preview','Mission details sent to your registered phone.')">SMS preview</button></div></div></div>`;
T.advanceTask = id => {
  const r = T.REQUESTS.find(x=>x.id===id);
  if (r.status==='assigned') {
    showModal(`<p class="eyebrow blue">Logbook — before departure</p><h3>Start trip ${esc(r.id)}</h3><form id="dep-form" class="form-grid">
    <label>Odometer (start)<input name="odo" type="number" value="${T.vehicle(r.vehicle).km}" required></label><label>Time<input name="time" type="time" value="${new Date().toTimeString().slice(0,5)}"></label>
    <label class="full">Vehicle plate<input value="${esc(r.vehicle)}" disabled></label>
    <button class="primary-btn full" type="submit">Confirm departure</button></form>`);
    $('dep-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target); r.depOdo=+f.get('odo'); r.depTime=f.get('time'); r.status='in-progress'; closeModal(); switchView(state.view); toast('Trip started','Logbook opened — odometer '+nf(r.depOdo)+' km.'); };
  } else {
    showModal(`<p class="eyebrow blue">Logbook — upon return</p><h3>Complete trip ${esc(r.id)}</h3><form id="ret-form" class="form-grid">
    <label>Odometer (end)<input name="odo" type="number" min="${r.depOdo||0}" value="${(r.depOdo||0)+40}" required></label><label>Time<input name="time" type="time" value="${new Date().toTimeString().slice(0,5)}"></label>
    <label><input type="checkbox" name="stops" checked style="width:auto;display:inline-block;margin-right:6px">Stops completed match the route</label>
    <label class="full">Passenger Focal Point signature (name)<input name="signed" placeholder="Name of senior staff on board" required></label>
    <button class="primary-btn full" type="submit">Confirm return</button></form>`);
    $('ret-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target); const odo=+f.get('odo');
      r.retOdo=odo; r.retTime=f.get('time'); r.totalKm=r.depOdo!=null?odo-r.depOdo:null; r.stopsOk=!!f.get('stops'); r.signedBy=f.get('signed').trim()||null; r.signedAt=new Date().toISOString(); r.status='completed';
      const veh=T.vehicle(r.vehicle); if (veh) veh.km=odo; closeModal(); switchView(state.view); toast('Trip completed', r.id+' logged — '+(r.totalKm!=null?nf(r.totalKm)+' km, ':'')+'signed by '+r.signedBy); };
  }
};

/* ============================================================ REQUESTS (Step 1) */
T.renderRequests = () => {
  const isCoord = activeUser.role==='coordinator';
  let list = isCoord ? T.REQUESTS.filter(r=>r.requester===activeUser.name) : T.REQUESTS.slice();
  list.sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt));
  const canCreate = ['logistics','top_management','coordinator'].includes(activeUser.role);
  const canSchedule = ['logistics','top_management'].includes(activeUser.role);
  $('view').innerHTML = `<div class="alert-banner ${T.withinWindow()?'success':'warning'}" style="margin-bottom:16px">⏰ <div><strong>Daily submission window: 10:00–16:00.</strong> ${T.withinWindow()?'Open now.':'Closed — requests queue for the next window.'} 24-hour rule: submit by 16:00 the day before the trip. Weekly plans due every Saturday before 14:00.</div></div>
  <div class="card"><div class="card-header"><div><h3>${isCoord?'My Requests':'Transport Requests'}</h3><p>${list.length} records for this role</p></div>${canCreate?'<button class="primary-btn compact" onclick="T.openRequestForm()">+ New request</button>':''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Date & route</th><th>Activity</th><th>Requester</th><th>Assignment</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.map(r=>`<tr><td><strong>${esc(r.id)}</strong><br><small style="color:${r.priority==='Urgent'?'var(--red)':r.priority==='High'?'var(--amber)':'var(--muted)'};font-weight:700">${esc(r.priority)}</small></td><td>${r.date} ${r.timeLeave}<br><small>${esc(r.origin)} to ${esc(r.destination)}</small></td><td>${esc(r.activity)}<br><small>${r.passengers} pax - ${esc(r.department)}</small></td><td>${esc(r.requester)}</td><td>${r.driver?`<strong>${esc(r.driver)}</strong><br><small>${esc(r.vehicle)}</small>`:'<span style="color:var(--muted)">Unassigned</span>'}</td><td>${T.statusTag(r.status)}</td><td style="white-space:nowrap">${canSchedule&&r.status==='pending'?`<button class="action-btn primary" onclick="switchView('dispatch')">Schedule</button>`:''}<button class="action-btn" onclick="T.openRequestDetail('${r.id}')">View</button></td></tr>`).join('')}
  </tbody></table></div></div>`;
};
T.openRequestForm = () => {
  showModal(`<p class="eyebrow blue">Transportation request — Step 1</p><h3>Plan a new mission</h3><p class="muted">Daily window 10:00–16:00 · 24-hour rule: submit by 16:00 the day before the trip.</p>
  <form id="request-form" class="form-grid"><label>Date<input name="date" type="date" value="${T.daysAhead(2)}" required></label><label>Time to leave<input name="timeLeave" type="time" value="08:00" required></label>
  <label>Time to return<input name="timeReturn" type="time" value="16:00" required></label><label>Project / Programme<input name="project" placeholder="e.g. 2026 Flood Relief"></label>
  <label>Origin<input name="origin" value="Beira HQ" required></label><label>Destination<input name="destination" required></label>
  <label>Passengers<input name="passengers" type="number" min="1" value="2" required></label><label>Priority<select name="priority"><option>Normal</option><option>High</option><option>Urgent</option></select></label>
  <label class="full">Activity to be executed<input name="activity" required></label>
  <label class="full">Cargo description (if any) — type, quantity, weight<textarea name="cargo" rows="2"></textarea></label>
  <button class="primary-btn full" type="submit">Submit transportation request</button></form>`);
  $('request-form').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target);
    T.REQUESTS.unshift(mkReq(`TR-2608${T.reqCounter++}`, f.get('date'), f.get('timeLeave'), f.get('timeReturn'), activeUser.name, activeUser.dept, f.get('project')||'General',
      f.get('origin'), [], f.get('destination'), Number(f.get('passengers')), f.get('activity'), f.get('cargo'), f.get('priority'), 'pending', '', '', new Date().toISOString()));
    closeModal(); switchView(state.view); toast('Request submitted','The Logistics Department has been notified for review and scheduling.'); };
};
T.openRequestDetail = id => {
  const r = T.REQUESTS.find(x=>x.id===id);
  showModal(`<p class="eyebrow blue">${esc(r.id)}</p><h3>${esc(r.origin)} → ${esc(r.destination)}</h3><p>${esc(r.activity)}</p>
  <div class="task-meta-grid"><div class="task-meta-item"><span>Date</span><strong>${r.date} · ${r.timeLeave}–${r.timeReturn}</strong></div><div class="task-meta-item"><span>Assignment</span><strong>${esc(r.driver||'Pending')}</strong></div><div class="task-meta-item"><span>Status</span><strong>${T.STATUS_LABELS[r.status]||r.status}</strong></div></div>
  ${r.depOdo!=null ? `<div class="note" style="margin-top:12px"><b>Logbook:</b> departed ${esc(r.depTime||'')} at ${nf(r.depOdo)} km${r.retOdo!=null?`, returned ${esc(r.retTime||'')} at ${nf(r.retOdo)} km (${nf(r.totalKm)} km total)`:''}. ${r.signedBy?'Signed by '+esc(r.signedBy)+'.':'<span style="color:var(--red)">Not yet signed by a Passenger Focal Point.</span>'}</div>` : ''}`);
};

/* ============================================================ DISPATCH — Steps 2 & 3 */
T.renderDispatch = () => {
  const waiting = T.REQUESTS.filter(r=>r.status==='pending');
  const scheduled = T.REQUESTS.filter(r=>r.status==='approved');
  const active = T.REQUESTS.filter(r=>['assigned','in-progress'].includes(r.status));
  const now = new Date(); const cutoffPassed = now.getHours()>=16;
  $('view').innerHTML = `<div class="note" style="margin-bottom:16px"><b>16:00</b> cutoff for requests · <b>16:00–17:00</b> Logistics reviews and optimises (combine trips to the same area, assign by availability and rest hours) · <b>17:30</b> schedule confirmed and broadcast via WhatsApp/Email. ${cutoffPassed?'Cutoff has passed for today.':'Window still open today.'}</div>
  <div style="display:grid;gap:20px">
  <div class="card"><div class="card-header"><div><h3>Step 2 — Awaiting scheduling (${waiting.length})</h3><p>Assign a vehicle and driver</p></div></div>${T.tripTable(waiting,'schedule')}</div>
  <div class="card"><div class="card-header"><div><h3>Scheduled — awaiting Trip Ticket (${scheduled.length})</h3><p>Step 3 links Vehicle + Driver + Project. No ticket = vehicle does not move.</p></div></div>${T.tripTable(scheduled,'ticket')}</div>
  <div class="card"><div class="card-header"><div><h3>Ticketed & active (${active.length})</h3></div></div>${T.tripTable(active,null)}</div>
  </div>`;
};
T.tripTable = (list,action) => list.length===0 ? T.emptyState('No records in this category','') :
  `<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Date & route</th><th>Activity</th><th>Passengers</th><th>Status</th><th></th></tr></thead><tbody>${list.map(r=>`<tr><td><strong>${esc(r.id)}</strong><br><small style="color:${r.priority==='Urgent'?'var(--red)':r.priority==='High'?'var(--amber)':'var(--muted)'};font-weight:700">${esc(r.priority)}</small></td><td>${r.date} ${r.timeLeave}<br><small>${esc(r.origin)} to ${esc(r.destination)}</small></td><td>${esc(r.activity)}<br><small>${esc(r.requester)}</small></td><td>${r.passengers}</td><td>${T.statusTag(r.status)}</td><td>${action==='schedule'?`<button class="action-btn primary" onclick="T.openScheduleModal('${r.id}')">Assign</button>`:action==='ticket'?`<button class="action-btn primary" onclick="T.issueTicket('${r.id}')">Issue Trip Ticket</button>`:`<button class="action-btn" onclick="T.openRequestDetail('${r.id}')">View</button>`}</td></tr>`).join('')}</tbody></table></div>`;
T.openScheduleModal = id => {
  const r = T.REQUESTS.find(x=>x.id===id);
  const drivers = USERS.filter(u=>u.role==='driver');
  showModal(`<p class="eyebrow blue">Scheduling — Step 2</p><h3>${esc(r.id)} · ${esc(r.destination)}</h3><p class="muted">${esc(r.activity)}</p>
  <form id="sched-form"><label>Driver<select name="driver">${drivers.map(u=>`<option>${esc(u.name)}</option>`).join('')}</select></label>
  <label>Vehicle<select name="vehicle">${T.VEHICLES.filter(v=>v.status==='active').map(v=>`<option value="${v.plate}">${v.plate} · ${v.name}</option>`).join('')}</select></label>
  <button class="primary-btn" type="submit">Confirm scheduling</button></form>`);
  $('sched-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target); r.driver=f.get('driver'); r.vehicle=f.get('vehicle'); r.status='approved';
    audit('Scheduled trip '+r.id,'trip',r.driver+' · '+r.vehicle); closeModal(); switchView('dispatch'); toast('Scheduled', r.id+' assigned to '+r.driver+'. Issue the Trip Ticket to allow departure.'); };
};
T.issueTicket = id => { const r = T.REQUESTS.find(x=>x.id===id); r.status='assigned';
  audit('Trip Ticket issued for '+r.id,'trip',r.vehicle+' + '+r.driver+' + '+r.project);
  switchView('dispatch'); toast('Trip Ticket issued', r.id+' — vehicle, driver and project linked. Broadcast sent via WhatsApp/Email.'); };

/* ============================================================ LOGBOOK — Step 4 */
T.renderLogbook = () => {
  const rows = T.REQUESTS.filter(r=>['in-progress','completed'].includes(r.status)).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const unsigned = rows.filter(r=>r.status==='completed' && !r.signedBy);
  $('view').innerHTML = `<div class="note" style="margin-bottom:16px"><b>Logbook audits: every Friday.</b> Gaps in mileage or unsigned trips are flagged as 'Personal Use'.</div>
  <div class="grid kpi-grid" style="margin-bottom:20px">
  ${T.kpi('Trips logged', rows.length, 'In progress or completed')}
  ${T.kpi('Unsigned', unsigned.length, "Missing Passenger Focal Point signature", unsigned.length?'bad':'good')}
  ${T.kpi('Total km this week', nf(rows.filter(r=>r.totalKm).reduce((s,r)=>s+r.totalKm,0)), 'From completed logbooks')}
  ${T.kpi('Friday audit', new Date().getDay()===5?'Today':'Next Friday', 'Review cadence')}
  </div>
  <div class="card"><div class="card-header"><h3>Trip logbook</h3></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Vehicle / driver</th><th>Departure</th><th>Return</th><th>Total km</th><th>Signed</th></tr></thead><tbody>
  ${rows.map(r=>`<tr style="${r.status==='completed'&&!r.signedBy?'background:#fdeaea':''}"><td><strong>${esc(r.id)}</strong></td><td class="small">${esc(r.vehicle)}<br>${esc(r.driver)}</td><td class="small">${r.depTime?esc(r.depTime)+' · '+nf(r.depOdo)+' km':'—'}</td><td class="small">${r.retTime?esc(r.retTime)+' · '+nf(r.retOdo)+' km':'—'}</td><td>${r.totalKm!=null?nf(r.totalKm)+' km':'—'}</td><td>${r.signedBy?'<span class="tag t-jade">'+esc(r.signedBy)+'</span>':r.status==='completed'?'<span class="tag t-rust">Unsigned — Personal Use flag</span>':'<span class="tag t-grey">In progress</span>'}</td></tr>`).join('')}
  </tbody></table>${rows.length?'':T.emptyState('No trips logged yet','')}</div></div>`;
};

/* ============================================================ FLEET REGISTER */
T.renderFleet = () => {
  $('view').innerHTML = `<div class="grid two-col"><div class="card"><div class="card-header"><div><h3>Fleet location</h3><p>Current demonstration positions</p></div></div>${T.fleetMapHTML()}</div>
  <div class="card"><div class="card-header"><div><h3>Fleet status</h3><p>${T.VEHICLES.length} registered vehicles</p></div></div><div class="activity-list">${T.VEHICLES.map(v=>`<div class="activity-item"><div class="activity-dot" style="background:${v.status==='alert'?'var(--red)':v.status==='offline'?'var(--muted)':'var(--green)'}"></div><div><strong>${v.plate} · ${v.name}</strong><span>${v.location} · ${v.fuel}% fuel · ${v.km.toLocaleString()} km</span></div><time>${v.last}</time></div>`).join('')}</div></div></div>
  <div class="card" style="margin-top:18px"><div class="card-header"><h3>Service and document status</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Vehicle</th><th>Odometer</th><th>Next service due</th><th>Document renewal</th></tr></thead><tbody>
  ${T.VEHICLES.map(v=>`<tr><td><strong>${v.plate}</strong><br><small>${esc(v.name)}</small></td><td>${nf(v.km)} km</td><td class="${v.km>=v.nextServiceKm?'danger':v.nextServiceKm-v.km<2000?'warning':''}">${nf(v.nextServiceKm)} km${v.km>=v.nextServiceKm?' · overdue':''}</td><td class="${daysUntil(v.docExpiry)<0?'danger':daysUntil(v.docExpiry)<30?'warning':''}">${fmtD(v.docExpiry)}${daysUntil(v.docExpiry)<0?' · expired':''}</td></tr>`).join('')}
  </tbody></table></div></div>`;
  T.initFleetMap();
};

/* ============================================================ FUEL — SOP-02 */
T.renderFuel = () => {
  const tb = state.tab || 'requests';
  const tabs = `<div class="subtabs">${[['requests','Refuelling requests'],['balance','Karan balance'],['cost','Cost allocation']].map(([k,l])=>`<button class="subtab ${tb===k?'active':''}" onclick="state.tab='${k}';switchView('fuel')">${l}</button>`).join('')}</div>`;
  if (tb==='balance') { $('view').innerHTML = tabs + T.fuelBalanceHTML(); return; }
  if (tb==='cost') { $('view').innerHTML = tabs + T.fuelCostHTML(); return; }
  const rows = T.FUEL_REQUESTS.slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  $('view').innerHTML = tabs + `<div class="note" style="margin-bottom:16px">Driver photographs the dashboard and states quantity + nearest station → Manager verifies and confirms availability → processed via Karan (online, OTP shared) or Galp Maquinino (WhatsApp, Beira) → driver confirms exact quantity refuelled.</div>
  <div class="card"><div class="card-header"><div><h3>Refuelling requests</h3></div>${T.can('fuel.manage')?`<button class="primary-btn compact" onclick="T.openFuelRequest()">+ New request</button>`:''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Vehicle / driver</th><th>Method</th><th>Litres</th><th>Order / OTP</th><th>Status</th><th></th></tr></thead><tbody>
  ${rows.map(f=>`<tr><td><strong>${esc(f.id)}</strong><br><small>${fmtD(f.date)}</small></td><td class="small">${esc(f.vehicle)}<br>${esc(f.driver)}</td><td><span class="tag t-blue">${esc(f.method)}</span></td><td>${f.litres} L</td><td class="small mono">${f.orderNumber?esc(f.orderNumber)+' / '+esc(f.otp):'—'}</td><td><span class="status ${f.status==='CONFIRMED'?'completed':f.status==='PROCESSED'?'assigned':f.status==='VERIFIED'?'approved':'pending'}">${f.status}</span></td><td>${T.can('fuel.manage')&&f.status==='REQUESTED'?`<button class="action-btn primary" onclick="T.verifyFuel('${f.id}')">Verify</button>`:T.can('fuel.manage')&&f.status==='VERIFIED'?`<button class="action-btn primary" onclick="T.processFuel('${f.id}')">Process order</button>`:''}</td></tr>`).join('')}
  </tbody></table></div></div>`;
};
T.fuelBalanceHTML = () => `<div class="grid kpi-grid" style="margin-bottom:20px">
  ${T.kpi('Karan balance', nf(T.KARAN.balance), 'MZN', T.KARAN.balance<=T.KARAN.threshold?'bad':'good', 'MZN')}
  ${T.kpi('Alert threshold', nf(T.KARAN.threshold), 'Prepare a top-up request below this line')}
  ${T.kpi('Top-up amount', nf(T.KARAN.topupAmount), 'Standard request to Finance')}
  ${T.kpi('Deposits', 'Wednesdays', 'Typical Finance processing day')}
  </div>
  ${T.KARAN.balance<=T.KARAN.threshold ? `<div class="alert-banner warning" style="margin-bottom:16px">⚠ Balance at or below the ${nf(T.KARAN.threshold)} MZN threshold. ${T.can('fuel.manage')?`<button class="action-btn compact" style="margin-left:10px" onclick="T.openTopupRequest()">Request top-up</button>`:''}</div>` : ''}
  <div class="card"><div class="card-header"><h3>Balance management workflow</h3></div><div class="card-body">
  <div class="sop-num"><b>1</b><div>Screenshot the Karan homepage with all account data; post in the Finance &amp; Logistics WhatsApp group with a top-up request, tagging the Financial Director.</div></div>
  <div class="sop-num"><b>2</b><div>Finance acknowledges and processes the bank deposit (typically Wednesdays).</div></div>
  <div class="sop-num"><b>3</b><div>Finance shares the proof of payment (POP) with Logistics.</div></div>
  <div class="sop-num"><b>4</b><div>The Manager submits the POP in the Karan system and requests approval in the Karan WhatsApp Group for the balance to reflect.</div></div>
  <div class="sop-num"><b>5</b><div>Download the weekly report: Reports → Customer Ledger → date range → Go → Download. Reconcile against all requests.</div></div>
  </div></div>
  <div class="card" style="margin-top:16px"><div class="card-header"><h3>Top-up history</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Amount</th><th>Status</th><th>By</th></tr></thead><tbody>${T.KARAN.history.map(h=>`<tr><td class="small">${fmtD(h.date)}</td><td>${nf(h.amount)} MZN</td><td class="small">${esc(h.status)}</td><td class="small">${esc(h.by)}</td></tr>`).join('')}</tbody></table></div></div>`;
T.fuelCostHTML = () => { const v='AFA-23-MC', bill=20000, km=2000, cpk=bill/km;
  const projects=[{name:'Charity (Beira)',km:800},{name:'Education',km:500},{name:'Admin / Ops',km:700}];
  return `<div class="note" style="margin-bottom:16px"><b>Pro-rata mileage method.</b> Formula: Total Fuel Cost ÷ Total KM Driven = Cost per KM. Fuel control is inspected against distance travelled and mileage checked in the Logbook and the Google Worksheet.</div>
  <div class="grid kpi-grid" style="margin-bottom:20px">
  ${T.kpi('Total bill', nf(bill), 'Paid via fuel system (monthly) — '+v)}
  ${T.kpi('Total distance', nf(km)+' km', 'From Logbook (monthly)')}
  ${T.kpi('Cost per km', cpk.toFixed(0)+' MZN', bill.toLocaleString()+' ÷ '+km.toLocaleString())}
  ${T.kpi('Projects allocated', projects.length, 'Monthly Fleet Allocation Report → Finance')}
  </div>
  <div class="card"><div class="card-header"><h3>Project allocation — ${v}</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Project</th><th>KM</th><th>Rate</th><th>Cost (MZN)</th></tr></thead><tbody>
  ${projects.map(p=>`<tr><td>${esc(p.name)}</td><td>${nf(p.km)}</td><td>${cpk.toFixed(0)} MZN/km</td><td><strong>${nf(Math.round(p.km*cpk))}</strong></td></tr>`).join('')}
  <tr style="background:#f8fafc"><td><strong>Total</strong></td><td><strong>${nf(projects.reduce((s,p)=>s+p.km,0))}</strong></td><td></td><td><strong>${nf(Math.round(projects.reduce((s,p)=>s+p.km,0)*cpk))}</strong></td></tr>
  </tbody></table></div></div>`; };
T.verifyFuel = id => { const f=T.FUEL_REQUESTS.find(x=>x.id===id); f.status='VERIFIED'; audit('Verified fuel request '+id,'fuel',''); switchView('fuel'); toast('Verified', id+' — availability confirmed with station.'); };
T.processFuel = id => { const f=T.FUEL_REQUESTS.find(x=>x.id===id); f.status = f.method==='Karan' ? 'PROCESSED' : 'PROCESSED'; if (f.method==='Karan') { f.orderNumber='KO-'+T.fuelCounter++; f.otp=String(1000+Math.floor(Math.random()*8999)); }
  audit('Processed fuel request '+id,'fuel',f.method); switchView('fuel'); toast('Processed', f.method==='Karan'?'Order '+f.orderNumber+' — OTP '+f.otp+' shared with driver.':'Galp WhatsApp message sent with vehicle registration.'); };
T.openFuelRequest = (plate) => {
  showModal(`<p class="eyebrow blue">Fuel requisition · SOP-02</p><h3>Request fuel</h3><form id="fuel-form" class="form-grid">
  <label>Vehicle<select name="vehicle">${T.VEHICLES.map(v=>`<option value="${v.plate}" ${v.plate===plate?'selected':''}>${v.plate} — ${esc(v.name)}</option>`).join('')}</select></label>
  <label>Litres needed<input name="litres" type="number" min="1" value="45"></label>
  <label>Method<select name="method"><option>Karan</option><option>Galp</option></select></label>
  <label class="full">Nearest station<input name="station" value="Karan Beira Central"></label>
  <button class="primary-btn full" type="submit">Submit request</button></form>`);
  $('fuel-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target); const id='FR-'+T.fuelCounter++;
    T.FUEL_REQUESTS.unshift({id,driver:activeUser.name,vehicle:f.get('vehicle'),date:new Date().toISOString(),litres:+f.get('litres'),station:f.get('station'),method:f.get('method'),status:'REQUESTED',orderNumber:'',otp:'',litresConfirmed:null,cost:null});
    audit('Fuel request '+id,'fuel',f.get('vehicle')); closeModal(); if (state.module==='transport') switchView(state.view); toast('Request sent', id+' sent to the Transport Manager for verification.'); };
};
T.openTopupRequest = () => { T.KARAN.history.unshift({date:new Date().toISOString(),amount:T.KARAN.topupAmount,status:'Requested — awaiting deposit',by:activeUser.name});
  audit('Requested Karan top-up','fuel',nf(T.KARAN.topupAmount)+' MZN'); switchView('fuel'); toast('Top-up requested', 'Screenshot posted to the Finance & Logistics group — tagged the Financial Director.'); };

/* ============================================================ MAINTENANCE — SOP-04 */
T.renderMaintenance = () => {
  const tb = state.tab || 'preventive';
  const tabs = `<div class="subtabs">${[['preventive','Preventive'],['corrective','Corrective & breakdowns'],['log','Fleet control log']].map(([k,l])=>`<button class="subtab ${tb===k?'active':''}" onclick="state.tab='${k}';switchView('maintenance')">${l}</button>`).join('')}</div>`;
  if (tb==='log') { $('view').innerHTML = tabs + T.maintLogHTML(); return; }
  if (tb==='corrective') { $('view').innerHTML = tabs + T.correctiveHTML(); return; }
  const due = T.VEHICLES.filter(v=>v.km>=v.nextServiceKm);
  $('view').innerHTML = tabs + `<div class="grid kpi-grid" style="margin-bottom:20px">
  ${T.kpi('Services logged', T.SERVICE_LOG.length, 'This period')}
  ${T.kpi('Due or overdue', due.length, 'By mileage', due.length?'bad':'good')}
  ${T.kpi('Spend', nf(T.SERVICE_LOG.reduce((s,m)=>s+m.cost,0)), 'MZN, preventive services')}
  ${T.kpi('Daily pre-trip checks', 'Driver', 'Oil, water, tyres, lights, brakes')}
  </div>
  <div class="card"><div class="card-header"><div><h3>Maintenance calendar — by vehicle</h3></div>${T.can('maint.manage')?`<button class="primary-btn compact" onclick="T.openNewService()">+ Log a service</button>`:''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Vehicle</th><th>Odometer</th><th>Next service</th><th>Status</th></tr></thead><tbody>${T.VEHICLES.map(v=>`<tr><td><strong>${v.plate}</strong></td><td>${nf(v.km)} km</td><td>${nf(v.nextServiceKm)} km</td><td>${v.km>=v.nextServiceKm?'<span class="tag t-rust">Overdue</span>':v.nextServiceKm-v.km<2000?'<span class="tag t-amber">Due soon</span>':'<span class="tag t-jade">On schedule</span>'}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card" style="margin-top:16px"><div class="card-header"><h3>Service log</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Vehicle</th><th>Type</th><th>Workshop</th><th>Cost</th></tr></thead><tbody>${T.SERVICE_LOG.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s=>`<tr><td class="small">${fmtD(s.date)}</td><td><strong>${esc(s.vehicle)}</strong></td><td><span class="tag t-grey">${esc(s.type)}</span></td><td class="small">${esc(s.by)}</td><td>${money(s.cost)}</td></tr>`).join('')}</tbody></table></div></div>`;
};
T.correctiveHTML = () => `<div class="note" style="margin-bottom:16px"><b>Phase 1</b> detection & reporting (driver immobilises safely, photographs, calls Manager; police report if accident) → <b>Phase 2</b> assessment & approval (urgency, 3 quotes if non-urgent, Administration approval) → <b>Phase 3</b> repair & closure (supervise, before/after photos, invoice, warranty, update log).</div>
  <div class="card"><div class="card-header"><div><h3>Breakdowns</h3></div>${T.can('maint.manage')?`<button class="primary-btn compact" onclick="T.openNewBreakdown()">+ Report a breakdown</button>`:''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Vehicle / driver</th><th>Urgency</th><th>Diagnosis</th><th>Phase</th><th></th></tr></thead><tbody>
  ${T.BREAKDOWNS.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(b=>`<tr><td><strong>${esc(b.id)}</strong><br><small>${fmtD(b.date)}</small></td><td class="small">${esc(b.vehicle)}<br>${esc(b.driver)}</td><td>${b.urgency==='Urgent'?'<span class="tag t-rust">Urgent</span>':'<span class="tag t-grey">Non-urgent</span>'}</td><td class="small" style="max-width:260px">${esc(b.diagnosis)}</td><td><span class="tag t-blue">${esc(b.phase)}</span></td><td>${T.can('maint.manage')&&b.phase!=='CLOSED'?`<button class="action-btn compact" onclick="T.advanceBreakdown('${b.id}')">Advance</button>`:''}</td></tr>`).join('')}
  </tbody></table></div></div>`;
T.maintLogHTML = () => `<div class="card"><div class="card-header"><h3>Fleet control log &amp; reporting</h3><p>SOP-04 reference table</p></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Control element</th><th>Frequency</th><th>Responsible</th><th>Filing location</th></tr></thead><tbody>${T.FLEET_LOG_TABLE.map(r=>`<tr>${r.map(c=>`<td class="small">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
T.advanceBreakdown = id => { const b=T.BREAKDOWNS.find(x=>x.id===id); const order=['DETECTION','ASSESSMENT','REPAIR','CLOSED']; const i=order.indexOf(b.phase);
  if (i<order.length-1) { b.phase=order[i+1]; if (b.phase==='REPAIR' && !b.selected) b.selected=b.quotes[0].workshop; if (b.phase==='CLOSED') { b.cost = b.cost||(b.quotes.find(q=>q.workshop===b.selected)||{amount:0}).amount; b.status='Repaired and returned to service'; } }
  audit('Advanced breakdown '+id+' to '+b.phase,'maintenance',''); switchView('maintenance'); toast(id+' moved to '+b.phase); };
T.openNewService = () => {
  showModal(`<p class="eyebrow blue">Maintenance · SOP-04</p><h3>Log a service</h3><form id="sv-form" class="form-grid">
  <label>Vehicle<select name="vehicle">${T.VEHICLES.map(v=>`<option value="${v.plate}">${v.plate} — ${esc(v.name)}</option>`).join('')}</select></label>
  <label>Type<select name="type">${['Oil & filter change','Tyre rotation & alignment','Brake inspection','Electrical check','Full inspection (semi-annual)'].map(t=>`<option>${t}</option>`).join('')}</select></label>
  <label>Workshop<input name="by" value="Beira Motors Workshop"></label><label>Cost (MZN)<input name="cost" type="number" min="0" value="5000"></label>
  <label class="full">Note<textarea name="note" rows="2"></textarea></label>
  <button class="primary-btn full" type="submit">Save record</button></form>`);
  $('sv-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target);
    T.SERVICE_LOG.unshift({id:T.uid('SV'),vehicle:f.get('vehicle'),date:new Date().toISOString(),type:f.get('type'),by:f.get('by').trim(),cost:+f.get('cost')||0,note:f.get('note').trim()});
    const v=T.vehicle(f.get('vehicle')); if (v) v.nextServiceKm = v.km+5000;
    audit('Logged service on '+f.get('vehicle'),'maintenance',f.get('type')); closeModal(); switchView('maintenance'); toast('Service logged'); };
};
T.openNewBreakdown = () => {
  showModal(`<p class="eyebrow blue">Maintenance · SOP-04</p><h3>Report a breakdown</h3><form id="bd-form" class="form-grid">
  <label>Vehicle<select name="vehicle">${T.VEHICLES.map(v=>`<option value="${v.plate}">${v.plate} — ${esc(v.name)}</option>`).join('')}</select></label>
  <label>Urgency<select name="urgency"><option>Non-urgent</option><option>Urgent</option></select></label>
  <label class="full">Diagnosis / description<textarea name="diag" rows="2" required></textarea></label>
  <button class="primary-btn full" type="submit">Record breakdown</button></form>`);
  $('bd-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target); const id='BD-'+String(T.breakdownCounter++).padStart(3,'0');
    T.BREAKDOWNS.unshift({id,vehicle:f.get('vehicle'),driver:activeUser.name,date:new Date().toISOString(),phase:'DETECTION',urgency:f.get('urgency'),diagnosis:f.get('diag').trim(),quotes:[],selected:'',cost:null,status:'Reported — awaiting assessment'});
    audit('Reported breakdown '+id,'maintenance',f.get('vehicle')); closeModal(); switchView('maintenance'); toast(id+' recorded'); };
};

/* ============================================================ HIRE — SOP-03 */
T.renderHire = () => {
  const rows = T.HIRE_REQUESTS.slice().sort((a,b)=>b.id.localeCompare(a.id));
  $('view').innerHTML = `<div class="note" style="margin-bottom:16px">Analyse request → 3 quotations → requisition to Finance for Charity Director approval → invoice request → pre-activity coordination → fuelling per SOP-02 → closure with toll receipts.</div>
  <div class="card"><div class="card-header"><div><h3>Vehicle &amp; truck hire</h3></div>${T.can('hire.manage')?`<button class="primary-btn compact" onclick="T.openNewHire()">+ New hire request</button>`:''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Purpose</th><th>Selected supplier</th><th>Total (MZN)</th><th>Status</th><th></th></tr></thead><tbody>
  ${rows.map(h=>`<tr><td><strong>${esc(h.id)}</strong><br><small>${esc(h.dept)}</small></td><td class="small" style="max-width:240px">${esc(h.purpose)}</td><td class="small">${esc(h.selected)}${h.toll?`<br><small class="muted">+${nf(h.toll)} toll</small>`:''}</td><td>${nf(h.total)}${h.total>T.THRESHOLD?' <span class="tag t-sand">high value</span>':''}</td><td>${h.status==='pending_approval'?'<span class="status pending">Awaiting approval</span>':h.status==='approved'?'<span class="status completed">Approved'+(h.invoiced?' · Invoiced':'')+'</span>':'<span class="status cancelled">Rejected</span>'}</td><td>${T.canApproveHire(h)?`<button class="action-btn success" onclick="T.approveHire('${h.id}')">Approve</button> <button class="action-btn danger" onclick="T.rejectHire('${h.id}')">Reject</button>`:''}</td></tr>`).join('')}
  </tbody></table></div></div>
  ${activeUser.role==='top_management'?'<div class="role-note">Hire requests above 50,000 MZN require Top Management sign-off, same threshold as Finance & Approvals.</div>':''}`;
};
T.approveHire = id => { const h=T.HIRE_REQUESTS.find(x=>x.id===id); h.status='approved'; audit('Approved hire '+id,'hire',h.selected); switchView('hire'); toast('Approved', id+' — '+h.selected); };
T.rejectHire = id => { const h=T.HIRE_REQUESTS.find(x=>x.id===id); h.status='rejected'; audit('Rejected hire '+id,'hire',''); switchView('hire'); toast('Rejected', id, 'danger'); };
T.openNewHire = () => {
  showModal(`<p class="eyebrow blue">Vehicle &amp; truck hire · SOP-03</p><h3>New hire request</h3><form id="hire-form" class="form-grid">
  <label>Purpose<input name="purpose" required></label><label>Vehicle type<input name="type" placeholder="e.g. Flatbed truck, 7t"></label>
  <label>Quote 1 — supplier / amount<input name="q1s" placeholder="Supplier"></label><label><input name="q1a" type="number" placeholder="Amount MZN"></label>
  <label>Quote 2 — supplier / amount<input name="q2s" placeholder="Supplier"></label><label><input name="q2a" type="number" placeholder="Amount MZN"></label>
  <label>Quote 3 — supplier / amount<input name="q3s" placeholder="Supplier"></label><label><input name="q3a" type="number" placeholder="Amount MZN"></label>
  <label>Toll value (if applicable)<input name="toll" type="number" value="0"></label>
  <button class="primary-btn full" type="submit">Submit for Finance approval</button></form>`);
  $('hire-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target);
    const quotes=[['q1s','q1a'],['q2s','q2a'],['q3s','q3a']].map(([s,a])=>({supplier:f.get(s),amount:+f.get(a)||0})).filter(q=>q.supplier&&q.amount);
    if (!quotes.length) { toast('Enter at least one quote'); return; }
    const best = quotes.slice().sort((a,b)=>a.amount-b.amount)[0]; const id='HR-'+String(T.hireCounter++).padStart(3,'0');
    T.HIRE_REQUESTS.unshift({id,dept:activeUser.dept,requester:activeUser.name,purpose:f.get('purpose'),vehicleType:f.get('type'),quotes,selected:best.supplier,total:best.amount,toll:+f.get('toll')||0,status:'pending_approval',invoiced:false});
    audit('Raised hire request '+id,'hire',best.supplier); closeModal(); switchView('hire'); toast(id+' submitted for approval'); };
};

/* ============================================================ COMPLIANCE */
T.renderCompliance = () => {
  const warnings = T.DRIVER_ATTENDANCE.filter(d=>d.rest<11).length;
  const avgDays = (T.DRIVER_ATTENDANCE.reduce((s,d)=>s+d.days,0)/T.DRIVER_ATTENDANCE.length).toFixed(1);
  $('view').innerHTML = `<div class="grid kpi-grid" style="margin-bottom:20px">
  ${T.kpi('Active drivers', T.DRIVER_ATTENDANCE.length, 'Compliance roster')}
  ${T.kpi('Rest warnings', warnings, 'Min rest: 11 hours', warnings?'bad':'good')}
  ${T.kpi('Avg days worked', avgDays, 'Current month')}
  ${T.kpi('Night driving', 'Forbidden after 19:00', 'Without written Head of Office approval')}
  </div>
  <div class="grid two-col"><div class="card"><div class="card-header"><h3>Speed limits &amp; driving rules</h3></div><div class="card-body">
  <div class="sop-num"><b>▲</b><div><b>Highway:</b> 100 km/h maximum</div></div>
  <div class="sop-num"><b>▲</b><div><b>City / dirt road:</b> 40 km/h maximum</div></div>
  <div class="sop-num"><b>▲</b><div><b>Rest periods:</b> minimum 11 hours between shifts — non-negotiable</div></div>
  <div class="sop-num"><b>▲</b><div><b>Night driving:</b> strictly forbidden after 19:00 without explicit written Head of Office approval</div></div>
  <div class="sop-num"><b>▲</b><div><b>Tracking system:</b> paid annually on every vehicle — real-time location 24/7, fuel level, battery status</div></div>
  </div></div>
  <div class="card"><div class="card-header"><h3>Compliance exceptions</h3></div><div class="activity-list">${T.DRIVER_ATTENDANCE.filter(d=>d.rest<11).map(d=>`<div class="activity-item"><div class="activity-dot" style="background:var(--red)"></div><div><strong>${esc(d.name)}</strong><span>${d.rest} hrs rest - minimum is 11 - ${esc(d.phone)}</span></div></div>`).join('') || '<div class="activity-item"><div class="activity-dot" style="background:var(--green)"></div><div><strong>All drivers compliant</strong></div></div>'}</div></div></div>
  <div class="card" style="margin-top:18px"><div class="card-header"><h3>Driver roster</h3></div><div class="activity-list">${T.DRIVER_ATTENDANCE.map(d=>`<div class="activity-item"><div class="activity-dot" style="background:${d.rest<11?'var(--red)':'var(--green)'}"></div><div><strong>${esc(d.name)}</strong><span>${d.days}d worked - ${d.off}d off - ${d.rest}h rest</span></div></div>`).join('')}</div></div>
  ${T.leaveAdminHTML()}`;
};

/* ============================================================ EMERGENCY PROTOCOL */
T.EMERGENCY_STEPS = [ {n:'01',t:'Call Logistics Coordinator',who:'State location, nature, people involved'}, {n:'02',t:'Verbal approval granted',who:'Vehicle dispatched immediately'}, {n:'03',t:'Vehicle dispatched',who:'Standard safety rules still apply'}, {n:'04',t:'Retroactive paperwork',who:'Completed within 24h, marked EMERGENCY'} ];
T.renderEmergency = () => {
  $('view').innerHTML = `${railHTML(T.EMERGENCY_STEPS,-1,false)}
  <div class="note bad" style="margin:16px 0"><b>In a real emergency, life safety takes priority.</b> Dispatch first, document after.</div>
  <div class="card"><div class="card-header"><div><h3>Emergency dispatch log</h3></div>${T.can('emergency.log')?`<button class="primary-btn compact" onclick="T.openNewEmergency()">+ Log emergency dispatch</button>`:''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Date</th><th>Nature</th><th>Location</th><th>Vehicle / driver</th><th>Paperwork</th></tr></thead><tbody>
  ${T.EMERGENCIES.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>`<tr><td><span class="tag t-rust">${esc(e.id)}</span></td><td class="small">${fmtD(e.date)}</td><td class="small">${esc(e.nature)}</td><td class="small">${esc(e.location)}</td><td class="small">${esc(e.vehicle)}<br>${esc(e.driver)}</td><td>${e.paperwork==='Filed'?'<span class="tag t-jade">Filed</span>':'<span class="tag t-amber">Pending — due within 24h</span>'}</td></tr>`).join('')}
  </tbody></table>${T.EMERGENCIES.length?'':T.emptyState('No emergencies logged','')}</div></div>`;
};
T.openNewEmergency = () => {
  showModal(`<p class="eyebrow blue">Emergency Protocol</p><h3>Log emergency dispatch</h3><form id="em-form" class="form-grid">
  <label>Nature of emergency<input name="nature" required></label><label>Location<input name="location" required></label>
  <label>People involved<input name="people" type="number" min="1" value="1"></label><label>Vehicle<select name="vehicle">${T.VEHICLES.map(v=>`<option value="${v.plate}">${v.plate}</option>`).join('')}</select></label>
  <label class="full">Driver dispatched<input name="driver" required></label>
  <button class="primary-btn full" type="submit">Confirm dispatch</button></form>`);
  $('em-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target); const id='EM-'+String(++T.emergencyCounter).padStart(3,'0');
    T.EMERGENCIES.unshift({id,date:new Date().toISOString(),location:f.get('location'),nature:f.get('nature'),people:+f.get('people'),coordinator:activeUser.name,vehicle:f.get('vehicle'),driver:f.get('driver'),paperwork:'Pending'});
    audit('Logged emergency dispatch '+id,'emergency',f.get('nature')); closeModal(); switchView('emergency'); toast(id+' dispatched — retroactive paperwork due within 24h'); };
};

/* ============================================================ FINANCE & APPROVALS */
T.renderFinance = () => {
  const canApprove = ['logistics','top_management'].includes(activeUser.role);
  $('view').innerHTML = `<div class="card"><div class="card-header"><h3>Payment &amp; Purchase Requisitions</h3></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Description</th><th>Amount (MZN)</th><th>Category</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>
  ${T.FINANCE.map(f=>`<tr><td><strong>${esc(f.id)}</strong></td><td style="max-width:220px">${esc(f.description)}</td><td><strong>${f.amount.toLocaleString()}</strong>${f.amount>T.THRESHOLD?' <span class="tag t-sand">high value</span>':''}</td><td>${esc(f.category)}</td><td>${fmtD(f.date)}</td><td><span class="status ${f.status}">${f.status}</span></td><td>${canApprove&&f.status==='pending'?`<button class="action-btn success" onclick="T.approveReq('${f.id}')">Approve</button> <button class="action-btn danger" onclick="T.rejectReq('${f.id}')">Reject</button>`:''}</td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="card" style="margin-top:16px"><div class="card-header"><h3>Hire requests above threshold</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Purpose</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${T.HIRE_REQUESTS.filter(h=>h.total>T.THRESHOLD).map(h=>`<tr><td><strong>${esc(h.id)}</strong></td><td class="small">${esc(h.purpose)}</td><td>${nf(h.total)}</td><td>${h.status}</td><td>${T.canApproveHire(h)?`<button class="action-btn success" onclick="T.approveHire('${h.id}')">Approve</button>`:''}</td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">None above threshold</td></tr>'}</tbody></table></div></div>
  ${activeUser.role==='top_management'?'<div class="role-note">Requisitions and hire requests above 50,000 MZN require Top Management sign-off.</div>':''}`;
};
T.approveReq = id => { const r = T.FINANCE.find(f=>f.id===id); if(!r) return; r.status='approved'; audit('Approved payment '+id,'finance',r.description); toast('Approved', id+' - '+r.description, 'success'); switchView('budget'); };
T.rejectReq = id => { const r = T.FINANCE.find(f=>f.id===id); if(!r) return; r.status='cancelled'; audit('Rejected payment '+id,'finance',''); toast('Rejected', id+' marked as rejected.', 'danger'); switchView('budget'); };

/* ============================================================ REPORTS — Section 05 reporting calendar */
T.renderReports = () => {
  const tb = state.tab || 'weekly';
  const tabs = `<div class="subtabs">${[['weekly','Weekly'],['monthly','Monthly'],['quarterly','Quarterly'],['ondemand','As needed']].map(([k,l])=>`<button class="subtab ${tb===k?'active':''}" onclick="state.tab='${k}';switchView('reports')">${l}</button>`).join('')}</div>
  <div class="note" style="margin-bottom:16px">Per Instruction TZC-MZ/PROCUREMENT/2026/001, signed by Dino Mamudo Foi, Executive Administrator. Submitted via institutional email + shared Drive to the HR Director and Executive Administrator. Non-compliance is subject to disciplinary review.</div>`;
  if (tb==='monthly') { $('view').innerHTML = tabs + T.monthlyReportsHTML(); return; }
  if (tb==='quarterly') { $('view').innerHTML = tabs + T.quarterlyReportsHTML(); return; }
  if (tb==='ondemand') { $('view').innerHTML = tabs + `<div class="card"><div class="card-header"><h3>SOPs Compliance Report</h3><p>Produced upon implementation or revision of procedures</p></div><div class="card-body">Confirms adherence to SOPs, approvals obtained and authorisation thresholds respected. Current status: <span class="tag t-jade">Compliant</span> — ${T.exceptions().length} open exception(s) tracked in the Control Tower.</div></div>`; return; }
  $('view').innerHTML = tabs + `<div class="card"><div class="card-header"><h3>Vendor List &amp; Evaluation Report</h3><p>Updated weekly — performance evaluation and blacklist</p></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Vendor</th><th>Category</th><th>Price</th><th>Lead time</th><th>Quality</th><th>Status</th></tr></thead><tbody>
  ${T.VENDORS.map(v=>`<tr><td><strong>${esc(v.name)}</strong></td><td class="small">${esc(v.category)}</td><td class="small">${esc(v.price)}</td><td class="small">${esc(v.leadTime)}</td><td class="small">${esc(v.quality)}</td><td>${v.blacklisted?'<span class="tag t-rust">Blacklisted</span>':'<span class="tag t-jade">Active</span>'}</td></tr>`).join('')}
  </tbody></table></div></div>`;
};
T.monthlyReportsHTML = () => { const fuelSpend=T.FINANCE.filter(f=>f.category==='Fuel').reduce((s,f)=>s+f.amount,0); const maintSpend=T.SERVICE_LOG.reduce((s,m)=>s+m.cost,0)+T.BREAKDOWNS.reduce((s,b)=>s+(b.cost||0),0); const hireSpend=T.HIRE_REQUESTS.filter(h=>h.status==='approved').reduce((s,h)=>s+h.total,0);
  return `<div class="card"><div class="card-header"><h3>Purchase Orders / Procurement Expenditure Report</h3><p>Period summary — budget vs. actuals</p></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Category</th><th>Actual spend (MZN)</th></tr></thead><tbody><tr><td>Fuel</td><td>${nf(fuelSpend)}</td></tr><tr><td>Maintenance</td><td>${nf(maintSpend)}</td></tr><tr><td>Vehicle hire</td><td>${nf(hireSpend)}</td></tr><tr style="background:#f8fafc"><td><strong>Total</strong></td><td><strong>${nf(fuelSpend+maintSpend+hireSpend)}</strong></td></tr></tbody></table></div></div>
  <div class="card" style="margin-top:16px"><div class="card-header"><h3>Contract &amp; Agreement Status Report</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Supplier</th><th>Type</th><th>Renewal</th><th>Status</th></tr></thead><tbody>${T.CONTRACTS.map(c=>`<tr><td>${esc(c.supplier)}</td><td class="small">${esc(c.type)}</td><td class="small ${daysUntil(c.renewal)<30?'warning':''}">${fmtD(c.renewal)}</td><td><span class="tag t-jade">${esc(c.status)}</span></td></tr>`).join('')}</tbody></table></div></div>`; };
T.quarterlyReportsHTML = () => `<div class="card"><div class="card-header"><h3>Quotation Comparison Report</h3><p>All quotation comparisons conducted this quarter</p></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Request</th><th>Purpose</th><th>Quotes compared</th><th>Selected</th></tr></thead><tbody>${T.HIRE_REQUESTS.map(h=>`<tr><td><strong>${esc(h.id)}</strong></td><td class="small">${esc(h.purpose)}</td><td class="small">${h.quotes.map(q=>esc(q.supplier)+' ('+nf(q.amount)+')').join(', ')}</td><td class="small"><strong>${esc(h.selected)}</strong></td></tr>`).join('')}</tbody></table></div></div>`;

/* ============================================================ SOP LIBRARY */
T.renderSOP = () => {
  const tb = state.tab || 'log01';
  const tabs = `<div class="subtabs">${[['log01','LOG-01 · Transport & Fleet'],['sop02','SOP-02 · Fuel'],['sop03','SOP-03 · Vehicle Hire'],['sop04','SOP-04 · Maintenance'],['reporting','Reporting Obligations']].map(([k,l])=>`<button class="subtab ${tb===k?'active':''}" onclick="state.tab='${k}';switchView('sop')">${l}</button>`).join('')}</div>`;
  const docs = { log01:T.sopLog01, sop02:T.sopFuel, sop03:T.sopHire, sop04:T.sopMaint, reporting:T.sopReporting };
  $('view').innerHTML = tabs + `<div class="card"><div class="card-body">${docs[tb]()}</div></div>`;
};
T.sopLog01 = () => `<div class="sop-doc"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="code-chip">LOG-01</span><span class="tag t-blue">Effective January 2026</span><span class="muted small">Transportation Management &amp; Fleet Control</span></div>
  <p class="muted small" style="margin:12px 0">End-to-end workflow: submit request → scheduling → trip plan → execution → report.</p>
  <h4>Step 1 — Vehicle Request</h4><ul><li>Daily submission window: 10:00–16:00 via the transport request worksheet.</li><li>Weekly plan: every Saturday before 14:00.</li><li>24-hour rule: submit by 16:00 the day before the trip.</li>
  <li>Mandatory data: requester name, department, project/programme, passengers and activity, full route with stopping points and times, cargo description if any.</li></ul>
  <h4>Steps 2 &amp; 3 — Scheduling &amp; Trip Ticket</h4><ul><li>16:00 cutoff, no new requests accepted after.</li><li>16:00–17:00 Logistics reviews and optimises — combines trips to the same area, assigns vehicle and driver by availability and rest hours.</li><li>17:30 schedule confirmed and broadcast via WhatsApp/Email.</li><li>The Trip Ticket links Vehicle + Driver + Project and is required before departure — no ticket, no movement.</li></ul>
  <h4>Step 4 — Execution &amp; Logbook</h4><ul><li>Before departure: date/time, odometer start, project, plate number.</li><li>Upon return: time, odometer end, total km, stops completed.</li><li>Signature: Passenger Focal Point (senior staff on board) verifies the trip happened.</li><li>Logbook audits every Friday — mileage gaps or unsigned trips flagged as 'Personal Use'.</li></ul>
  <h4>Driver &amp; Car Management</h4><ul><li>Rest: minimum 11 hours between shifts, non-negotiable.</li><li>Speed: highway 100 km/h, city/dirt road 40 km/h.</li><li>Night driving forbidden after 19:00 without written Head of Office approval.</li><li>All vehicles carry a paid annual tracking system — location, fuel level, battery status.</li></ul>
  <h4>Emergency Protocol</h4><ul><li>Call the Logistics Coordinator → verbal approval → vehicle dispatched immediately → retroactive paperwork within 24 hours, marked 'EMERGENCY'.</li></ul></div>`;
T.sopFuel = () => `<div class="sop-doc"><span class="code-chip">SOP 02</span> <span class="tag t-amber" style="margin-left:6px">Karan System &amp; Galp Maquinino (Beira)</span>
  <p class="muted small" style="margin:12px 0">Balance alert threshold: 50,000 MZN · Top-up amount: 400,000 MZN · Deposits processed on Wednesdays.</p>
  <h4>Refuelling workflow</h4><ul><li>Driver photographs the dashboard, states quantity needed and nearest station.</li><li>Manager verifies and confirms availability with the station.</li><li>Via Karan (online): login → create order → share Order Number, OTP, litres and station with the driver.</li><li>Via Galp (Beira): WhatsApp message in the Foundation's Galp group with greeting, full-tank request and vehicle registration.</li><li>Driver confirms exact quantity refuelled for reconciliation.</li></ul>
  <h4>Fuel cost allocation</h4><p class="small">Pro-rata mileage method: Total Fuel Cost ÷ Total KM Driven = Cost per KM, allocated to projects by kilometres driven for each. Checked against the Logbook and Google Worksheet.</p></div>`;
T.sopHire = () => `<div class="sop-doc"><span class="code-chip">SOP 03</span> <span class="tag t-amber" style="margin-left:6px">Vehicle &amp; Truck Hire</span>
  <p class="muted small" style="margin:12px 0">Procurement · Approval · Coordination · Fuelling · Closure.</p>
  <ol style="padding-left:18px;font-size:13px"><li style="margin-bottom:6px">Analyse the department request — scope, passengers, itinerary, duration.</li><li style="margin-bottom:6px">Obtain 3 quotations — vehicle documentation, service terms, fuelling policy, tolls.</li><li style="margin-bottom:6px">Prepare and submit the requisition to Finance for Charity Director approval.</li><li style="margin-bottom:6px">Approval and invoice request.</li><li style="margin-bottom:6px">Pre-activity coordination — itinerary, driver contact, pick-up points.</li><li style="margin-bottom:6px">Fuelling per SOP-02 if applicable.</li><li style="margin-bottom:6px">Closure — toll receipts, invoice payment, hand receipts to Finance.</li></ol></div>`;
T.sopMaint = () => `<div class="sop-doc"><span class="code-chip">SOP 04</span> <span class="tag t-amber" style="margin-left:6px">Vehicle Maintenance</span>
  <h4>Preventive</h4><ul><li>Maintenance calendar by vehicle, mileage and/or time based.</li><li>Daily pre-trip checks by the driver: oil, water, tyres, lights, brakes.</li><li>Scheduled services: oil/filters every 5,000 km, tyre rotation, brake inspection, electrical checks.</li><li>Requisition with 3 workshop quotes, Administration approval.</li></ul>
  <h4>Corrective / breakdowns — 3 phases</h4><ul><li>Detection &amp; reporting: driver immobilises safely, photographs, contacts Manager; police report if accident.</li><li>Assessment &amp; approval: urgency determined, 3 quotes if non-urgent, Administration approval before repair.</li><li>Repair &amp; closure: supervise repair, before/after photos, invoice/warranty, update the vehicle log.</li></ul></div>`;
T.sopReporting = () => `<div class="sop-doc"><span class="code-chip">Section 05</span> <span class="tag t-amber" style="margin-left:6px">Reporting Obligations — Procurement &amp; Logistics</span>
  <p class="muted small" style="margin:12px 0">Per Instruction TZC-MZ/PROCUREMENT/2026/001, signed by Dino Mamudo Foi, Executive Administrator. In force from 29 May 2026.</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:10px"><thead><tr><th style="text-align:left;padding:6px 0;border-bottom:1px solid var(--line)">Cadence</th><th style="text-align:left;padding:6px 0;border-bottom:1px solid var(--line)">Report</th></tr></thead><tbody>
  <tr><td style="padding:6px 0">Weekly</td><td style="padding:6px 0">Vendor List &amp; Evaluation Report</td></tr>
  <tr><td style="padding:6px 0">Monthly</td><td style="padding:6px 0">Purchase Orders / Procurement Expenditure Report</td></tr>
  <tr><td style="padding:6px 0">Monthly</td><td style="padding:6px 0">Contract &amp; Agreement Status Report</td></tr>
  <tr><td style="padding:6px 0">Quarterly</td><td style="padding:6px 0">Quotation Comparison Report</td></tr>
  <tr><td style="padding:6px 0">As needed</td><td style="padding:6px 0">SOPs Compliance Report</td></tr>
  </tbody></table>
  <h4>Submission &amp; responsibility</h4><ul><li>Digital: institutional email + shared Drive. Physical: signed, stamped, archived.</li><li>Recipients: HR Director + Executive Administrator.</li><li>Prepared by the Procurement Officer / Transport Manager; non-compliance is subject to disciplinary review.</li></ul></div>`;

/* ============================================================ NOTIFICATIONS */
T.notifications = () => {
  const n = []; const u = activeUser; if (!u) return n;
  T.REQUESTS.forEach(r => {
    if (r.status==='pending' && ['logistics','top_management'].includes(activeUser.role)) n.push({k:'req:'+r.id, sev:'action', t:'Trip request awaiting scheduling', d:r.id+' — '+r.activity, at:r.submittedAt});
    if (r.status==='approved' && ['logistics','top_management'].includes(activeUser.role)) n.push({k:'ticket:'+r.id, sev:'action', t:'Ready for Trip Ticket', d:r.id+' — vehicle & driver assigned', at:r.submittedAt});
    if (r.requester===u.name && ['approved','assigned','completed','cancelled'].includes(r.status)) n.push({k:'mine:'+r.id+':'+r.status, sev:r.status==='cancelled'?'bad':'info', t:'Your request was '+(T.STATUS_LABELS[r.status]||r.status).toLowerCase(), d:r.id, at:r.submittedAt});
  });
  if (T.KARAN.balance<=T.KARAN.threshold) n.push({k:'karan-low', sev:'bad', t:'Karan balance below threshold', d:nf(T.KARAN.balance)+' MZN — prepare a top-up request', at:new Date().toISOString()});
  T.BREAKDOWNS.filter(b=>b.phase!=='CLOSED').forEach(b=>n.push({k:'bd:'+b.id, sev:b.urgency==='Urgent'?'bad':'warn', t:'Breakdown in progress', d:b.id+' — '+b.vehicle, at:b.date}));
  T.HIRE_REQUESTS.filter(h=>T.canApproveHire(h)).forEach(h=>n.push({k:'hire:'+h.id, sev:'action', t:'Hire request awaiting your approval', d:h.id+' — '+nf(h.total)+' MZN', at:new Date().toISOString()}));
  if (T.can('approve')) T.LEAVE_REQUESTS.filter(l=>l.status==='pending').forEach(l=>n.push({k:'leave:'+l.id, sev:'action', t:'Leave request awaiting your decision', d:l.driver+' — '+l.type+', '+l.days+' day(s)', at:l.submittedAt}));
  T.LEAVE_REQUESTS.filter(l=>l.driver===u.name && l.status!=='pending' && l.decidedAt).forEach(l=>n.push({k:'myleave:'+l.id, sev:l.status==='rejected'?'bad':'info', t:'Your leave request was '+l.status, d:l.type+' · '+fmtD(l.start)+' → '+fmtD(l.end), at:l.decidedAt}));
  return n.sort((a,b)=>new Date(b.at)-new Date(a.at));
};
T.renderNotifications = () => {
  const list = T.notifications(); const read = T.NOTIF_READ[activeUser.id]||[];
  const cls = {action:'t-blue',bad:'t-rust',warn:'t-amber',info:'t-grey'}; const lab = {action:'Action',bad:'Critical',warn:'Attention',info:'Update'};
  $('view').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><p class="eyebrow blue">${list.filter(n=>!read.includes(n.k)).length} unread of ${list.length}</p><button class="action-btn compact" onclick="T.markAllRead()">Mark all as read</button></div>
  <div class="card"><div class="table-wrap">${list.length ? `<table class="data-table"><tbody>${list.map(n=>`<tr style="${read.includes(n.k)?'opacity:.55':''}"><td style="width:1%"><span class="tag ${cls[n.sev]}">${lab[n.sev]}</span></td><td><div style="font-weight:${read.includes(n.k)?400:600}">${esc(n.t)}</div><div class="muted small" style="margin-top:2px">${esc(n.d)}</div></td><td class="small muted">${fmtD(n.at)}</td></tr>`).join('')}</table>` : T.emptyState('Nothing to report','')}</div></div>`;
};
T.markAllRead = () => { T.NOTIF_READ[activeUser.id] = T.notifications().map(n=>n.k); switchView('notifications'); };

/* ============================================================ AI ASSISTANT
   A local knowledge engine over this module's own live data and the LOG-01/SOP
   02–04 procedures — no external API, so it works offline and never invents a
   figure it can't trace back to the records already on screen. */
T.AI = {
  title: () => 'Transportation Assistant',
  subtitle: () => 'Ask about vehicles, requests, fuel or the SOPs',
  greeting: () => `Hi ${esc((activeUser.name||'').split(' ')[0])} — I can answer questions about fleet status, transport requests, fuel and the LOG-01/SOP procedures. What do you need?`,
  suggestedChips: () => ['What is the Karan balance?', 'Which vehicles need fuel?', 'What is the 24-hour rule?', 'How do I request leave?', 'What can I do with my role?'],
  answer(raw){
    const q = raw.toLowerCase().trim();
    const has = arr => arr.some(w=>q.includes(w));

    if (/^(hi|hello|hey|olá|ola)\b/.test(q)) return `Hello! Ask me about a specific vehicle, a trip request, fuel, leave, or how any of the LOG-01/SOP procedures work.`;

    if (has(['what can i do','my permission','my role'])) {
      const grants = PERM_CATALOG.filter(e=>activeUser.perms&&activeUser.perms[e.key]).map(e=>e.label);
      return `You're signed in as <b>${esc(ROLE_LABELS[activeUser.role])}</b>.<br>${grants.length? 'You can: '+grants.map(esc).join('; ')+'.' : 'Your account has no elevated Transportation permissions beyond your assigned tasks.'}`;
    }
    if (has(['24 hour','24-hour','submission window','when can i submit','deadline'])) return `Requests are open <b>10:00–16:00 daily</b>. The 24-hour rule: submit by 16:00 the day before the trip. Weekly vehicle plans are due every <b>Saturday before 14:00</b>. After 16:00 the request queues for the next window.`;
    if (has(['trip ticket','no ticket'])) return `The Trip Ticket links <b>Vehicle + Driver + Project</b> and is issued after scheduling (16:00–17:00 review, confirmed by 17:30). No ticket, no movement — a scheduled trip still can't depart until the ticket is issued in Dispatch.`;
    if (has(['logbook','odometer','friday audit'])) return `The driver logs departure (time + odometer) and return (time + odometer + stops completed), signed by the Passenger Focal Point. Logbook audits run every <b>Friday</b> — unsigned trips or mileage gaps are flagged 'Personal Use'.`;
    if (has(['speed limit','how fast'])) return `Highway: <b>100 km/h</b> maximum. City / dirt road: <b>40 km/h</b> maximum.`;
    if (has(['night driving','after 19'])) return `Night driving is <b>strictly forbidden after 19:00</b> without explicit written approval from the Head of Office.`;
    if (has(['rest hour','minimum rest'])) { const warn = T.DRIVER_ATTENDANCE.filter(d=>d.rest<11); return `Minimum rest between shifts is <b>11 hours</b>, non-negotiable.${warn.length?' Currently below minimum: '+warn.map(d=>esc(d.name)+' ('+d.rest+'h)').join(', ')+'.':' No drivers are currently below the minimum.'}`; }
    if (has(['emergency'])) return `Emergency protocol: <b>1)</b> call the Logistics Coordinator with location, nature and people involved. <b>2)</b> verbal approval is given. <b>3)</b> the vehicle is dispatched immediately — standard safety rules still apply. <b>4)</b> paperwork is completed within 24 hours, marked 'EMERGENCY'. Life safety takes priority — dispatch first, document after.`;

    if (has(['karan','fuel balance','balance'])) return `Karan balance is <b>${nf(T.KARAN.balance)} MZN</b> (alert threshold ${nf(T.KARAN.threshold)} MZN, top-up amount ${nf(T.KARAN.topupAmount)} MZN).${T.KARAN.balance<=T.KARAN.threshold?' This is at or below the alert threshold — a top-up request should be prepared.':''}`;
    if (has(['refuel','fuel request','how do i get fuel','galp'])) return `Driver photographs the dashboard and states quantity + nearest station → Manager verifies availability → processed via <b>Karan</b> (online, Order Number + OTP shared with the driver) or <b>Galp Maquinino</b> (WhatsApp message, Beira) → driver confirms the exact quantity refuelled.`;
    if (has(['cost per km','fuel cost','pro-rata','pro rata'])) return `Fuel cost allocation uses the pro-rata mileage method: <b>Total Fuel Cost ÷ Total KM Driven = Cost per KM</b>, then allocated to each project by kilometres driven. See Fuel ▸ Cost allocation for the worked example.`;
    if (has(['which vehicle','low fuel','need fuel','fuel level'])) { const low = T.VEHICLES.filter(v=>v.fuel<=25); return low.length ? `Below 25% fuel: `+low.map(v=>esc(v.plate)+' ('+v.fuel+'%, '+esc(v.location)+')').join(', ')+'.' : 'No vehicles are currently below 25% fuel.'; }

    if (has(['leave','vacation','time off'])) { const mine = T.LEAVE_REQUESTS.filter(l=>l.driver===activeUser.name); return activeUser.role==='driver'
      ? `To request leave, open <b>My Tasks</b> and use "+ Request leave" — choose a type, dates and a reason. ${mine.length?'You have '+mine.length+' leave request(s) on file, most recent status: '+mine[0].status+'.':'You have no leave requests on file yet.'}`
      : `Leave requests are submitted by drivers from their task view and approved by the Logistics Department under Driver Compliance. ${T.LEAVE_REQUESTS.filter(l=>l.status==='pending').length} are currently pending.`; }

    if (has(['breakdown','repair'])) { const open = T.BREAKDOWNS.filter(b=>b.phase!=='CLOSED'); return open.length ? `${open.length} breakdown(s) open: `+open.map(b=>esc(b.id)+' ('+esc(b.vehicle)+', '+esc(b.phase)+')').join(', ')+'.' : 'No breakdowns are currently open.'; }
    if (has(['service due','maintenance due','overdue'])) { const due = T.VEHICLES.filter(v=>v.km>=v.nextServiceKm); return due.length ? `Due or overdue for service: `+due.map(v=>esc(v.plate)).join(', ')+'.' : 'No vehicles are currently due for service.'; }
    if (has(['hire','rent a vehicle','rent a truck'])) return `Vehicle/truck hire (SOP-03): analyse the request → obtain 3 quotations → requisition to Finance for approval (Charity Director, or Top Management above ${nf(T.THRESHOLD)} MZN) → invoice request → coordinate pick-up → fuel per SOP-02 if needed → close with toll receipts.`;

    const plateMatch = T.VEHICLES.find(v => q.includes(v.plate.toLowerCase()) || (v.plate.replace(/-/g,'').toLowerCase()!=='' && q.replace(/-/g,'').includes(v.plate.replace(/-/g,'').toLowerCase())));
    if (plateMatch) return `<b>${esc(plateMatch.plate)}</b> — ${esc(plateMatch.name)}, ${esc(plateMatch.status)}, at ${esc(plateMatch.location)}. Fuel ${plateMatch.fuel}%, odometer ${nf(plateMatch.km)} km, next service at ${nf(plateMatch.nextServiceKm)} km, document renewal ${fmtD(plateMatch.docExpiry)}.`;

    const idMatch = q.match(/tr-?\s?(\d{5})/i);
    if (idMatch) { const r = T.REQUESTS.find(x=>x.id.toLowerCase()==='tr-'+idMatch[1]); if (r) return `<b>${esc(r.id)}</b> — ${T.STATUS_LABELS[r.status]||r.status}. ${esc(r.origin)} → ${esc(r.destination)}, ${esc(r.activity)}. ${r.driver?'Driver: '+esc(r.driver)+' ('+esc(r.vehicle)+').':'Not yet assigned.'}`; }

    if (has(['how are we doing','kpi','fleet status','overview'])) { const active = T.VEHICLES.filter(v=>v.status==='active').length; const pending = T.REQUESTS.filter(r=>r.status==='pending').length; return `Fleet: <b>${active}/${T.VEHICLES.length}</b> active. Pending requests: <b>${pending}</b>. Karan balance: <b>${nf(T.KARAN.balance)} MZN</b>. Open breakdowns: <b>${T.BREAKDOWNS.filter(b=>b.phase!=='CLOSED').length}</b>.`; }
    if (has(['where do i','where can i','how do i find','which screen'])) return `Use the sidebar — Dashboard and Control Tower for the overview; Transport Requests, Dispatch and Logbook for the SOP-01 flow; Fleet, Fuel and Maintenance for the vehicles; Driver Compliance and Emergency Protocol for people; Finance, Reports and SOP Library for governance.`;

    return `I couldn't match that to something in the current records. Try asking about a vehicle plate, a request ID (e.g. TR-26081), the Karan balance, leave requests, or a specific SOP topic like the 24-hour rule, logbook audits, or the emergency protocol.`;
  }
};

window.T = T;
