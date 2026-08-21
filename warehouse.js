/* ============================================================
   TZU CHI MOZ LMS — Warehouse & Procurement module
   Namespace: W
   Full workflow parity with WH-SOP-01 (requisitions) and WH-SOP-02
   (container/cargo abnormalities), adapted onto the LMS's shared
   5-role model instead of the reference prototype's 6 granular roles.
   ============================================================ */
const W = {};
W.THRESHOLD = 50000; // MZN — above this, authorisation escalates to Top Management (mirrors database/schema.sql)

/* Permission checks read the signed-in user's individually-editable permission set
   (see PERM_CATALOG / expandGranted in app.js), not a fixed role table — an
   Administrator can grant or revoke any of these per person from Admin ▸ User
   Accounts. Role only sets the starting defaults. */
W.can = p => !!activeUser && expandGranted(activeUser,'w').has(p);
W.canAuthorize = req => req.status==='VERIFIED' && ((req.value<=W.THRESHOLD && hasPermFlag(activeUser,'approve')) || (req.value>W.THRESHOLD && hasPermFlag(activeUser,'authorizeHigh')));

/* ---- date helpers (runtime clock — this is browser code, not agent tooling) ---- */
W.daysAgo = n => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString(); };
W.daysAhead = n => { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
W.today = () => new Date().toISOString().slice(0,10);
W.onDay = (s,d) => String(s).slice(0,10)===d;
W.uid = p => p+'-'+Math.random().toString(36).slice(2,8).toUpperCase();
W.pick = a => a[Math.floor(Math.random()*a.length)];
W.rint = (a,b) => a+Math.floor(Math.random()*(b-a+1));

/* ---- reference data ---- */
W.WAREHOUSES = [
  {id:'W1', name:'Kura Warehouse', loc:'Beira, Sofala', lat:-19.83, lon:34.84},
  {id:'W2', name:'Maputo Central Store', loc:'Maputo City', lat:-25.97, lon:32.58},
  /* Nhamatanda Field Store — pinned to the exact Plus Code P6X3+99M, Nhamatanda,
     Mozambique (decoded via the Open Location Code algorithm and reverse-geocode
     verified against Nhamatanda, Sofala). Do not approximate this one — it's fixed. */
  {id:'W3', name:'Nhamatanda Field Store', loc:'Nhamatanda, Sofala · Plus Code P6X3+99M', lat:-19.2515, lon:34.2034}
];
W.CATS = [
  {id:'FOD', name:'Food & Nutrition'}, {id:'SHL', name:'Shelter & Bedding'},
  {id:'HYG', name:'Water & Hygiene'}, {id:'MED', name:'Medical'},
  {id:'EDU', name:'Education'}, {id:'EQP', name:'Equipment'}, {id:'OFF', name:'Office'}
];
/* Representative photos per category — real photographs (Wikimedia Commons, CC-licensed),
   not stock renders. These stand in for the category, not the exact SKU photographed. */
W.CATEGORY_IMAGES = {
  FOD: { url:'https://commons.wikimedia.org/wiki/Special:FilePath/Bags_of_rice_are_unloaded_from_truck_to_pile_in_a_Dakar_warehouse.jpg?width=500', credit:'Wiki Loves Africa 2017, CC BY-SA 4.0' },
  SHL: { url:'https://commons.wikimedia.org/wiki/Special:FilePath/Tarpaulin_fly_tent.jpg?width=500', credit:'Ryan Bushby, public domain' },
  HYG: { url:'https://commons.wikimedia.org/wiki/Special:FilePath/3_Jerrycans.JPG?width=500', credit:'Wikimedia Commons, CC BY-SA 3.0' },
  MED: { url:'https://commons.wikimedia.org/wiki/Special:FilePath/A-first-aid-kit.jpg?width=500', credit:'US CDC, public domain' },
  EDU: { url:'https://commons.wikimedia.org/wiki/Special:FilePath/Operation_School_Supplies_weilds_power_of_pencils_111110-A-KT814-019.jpg?width=500', credit:'US Army photo, public domain' },
  EQP: { url:'https://commons.wikimedia.org/wiki/Special:FilePath/UNICEF_pallets_02.jpg?width=500', credit:'Wikimedia Commons, CC BY-SA 3.0' }
};
const WI = (code,name,cat,unit,qty,reorder,wh,loc,val,exp) => ({id:code,code,name,cat,unit,qty,reorder,wh,loc,val,exp:exp||'',active:true});
W.ITEMS = [
  WI('TCM-FOD-001','Jing Si Rice 20 kg','FOD','Bag',4380,800,'W1','A-01-03',1450,W.daysAhead(410)),
  WI('TCM-FOD-002','Jing Si Instant Rice 60 g','FOD','Pack',2400,500,'W1','A-02-01',65,W.daysAhead(300)),
  WI('TCM-FOD-003','Cooking oil 5 L','FOD','Bottle',180,200,'W1','A-03-02',690,W.daysAhead(240)),
  WI('TCM-FOD-004','Fortified maize flour 25 kg','FOD','Bag',640,200,'W3','F-01-01',1180,W.daysAhead(150)),
  WI('TCM-SHL-001','Tarpaulin 4x6 m','SHL','Piece',320,150,'W1','B-01-01',980,''),
  WI('TCM-SHL-002','Eco-blanket (recycled PET)','SHL','Piece',1250,300,'W1','B-02-04',420,''),
  WI('TCM-SHL-003','Folding bed','SHL','Unit',45,60,'W2','M-04-02',2350,''),
  WI('TCM-SHL-004','Mosquito net, double','SHL','Piece',890,250,'W3','F-02-03',310,''),
  WI('TCM-HYG-001','Family hygiene kit','HYG','Kit',410,200,'W1','C-01-02',750,''),
  WI('TCM-HYG-002','Bar soap 200 g','HYG','Piece',3200,800,'W1','C-01-05',38,W.daysAhead(520)),
  WI('TCM-HYG-003','Jerrycan 20 L','HYG','Unit',260,150,'W3','F-03-01',265,''),
  WI('TCM-HYG-004','Water purification tablets, box 100','HYG','Box',95,100,'W1','C-02-01',520,W.daysAhead(95)),
  WI('TCM-MED-001','First aid kit','MED','Kit',60,40,'W2','M-01-01',1850,W.daysAhead(330)),
  WI('TCM-MED-002','Surgical mask, box 50','MED','Box',240,100,'W2','M-01-04',290,W.daysAhead(600)),
  WI('TCM-MED-003','Paracetamol 500 mg, box 1000','MED','Box',28,30,'W2','M-02-02',980,W.daysAhead(62)),
  WI('TCM-EDU-001','School kit (notebooks & pens)','EDU','Kit',720,200,'W1','D-01-01',340,''),
  WI('TCM-EDU-002','School uniform set','EDU','Set',340,150,'W1','D-02-02',620,''),
  WI('TCM-EQP-001','Wooden pallet','EQP','Unit',120,40,'W1','YARD',480,''),
  WI('TCM-EQP-002','Hand pallet truck 2.5 t','EQP','Unit',4,2,'W1','YARD',21500,''),
  WI('TCM-EQP-003','Digital platform scale 300 kg','EQP','Unit',3,1,'W1','OFFICE',14800,''),
  WI('TCM-EQP-004','Volunteer safety vest','EQP','Piece',150,50,'W1','C-03-01',285,''),
  WI('TCM-OFF-001','A4 paper ream','OFF','Ream',55,30,'W2','M-05-01',340,'')
];
W.item = id => W.ITEMS.find(i=>i.id===id) || {id,code:id,name:'(unknown item)',unit:'',qty:0,val:0};
W.whName = w => (W.WAREHOUSES.find(x=>x.id===w)||{name:w}).name;
W.catName = c => (W.CATS.find(x=>x.id===c)||{name:c}).name;

/* ---- historical stock movements, generated so the ledger has depth ---- */
W.MOVEMENTS = [];
(function seedMovements(){
  W.ITEMS.forEach(it => {
    const events = W.rint(3,6);
    const hist = [];
    for (let k=0;k<events;k++){
      const out = Math.random() > 0.42;
      const q = out ? W.rint(1, Math.max(2, Math.round(it.qty*0.06))) : W.rint(2, Math.max(3, Math.round(it.qty*0.12)));
      hist.push({ out, q, at: W.daysAgo(W.rint(4,150)) });
    }
    hist.sort((a,b) => new Date(a.at)-new Date(b.at));
    let running = it.qty; hist.slice().reverse().forEach(h => { running = h.out ? running+h.q : running-h.q; });
    let run = Math.max(0, running);
    hist.forEach(h => {
      run = h.out ? run-h.q : run+h.q;
      W.MOVEMENTS.push({ id:W.uid('MV'), itemId:it.id, type: h.out?'OUT':'IN', qty:h.q, at:h.at, bal:Math.max(0,run),
        ref: h.out ? 'REQ-'+W.rint(2170,2200) : 'GRN-'+W.rint(30,60), dept: h.out ? W.pick(['Charity & Relief','Medical','Education','Logistics & Warehouse']) : '—',
        by: h.out ? 'Logistics Department' : 'Logistics Department', note:'' });
    });
  });
})();

/* ---- requisitions (WH-SOP-01), multi-line ---- */
W.REQ_STEPS = [
  {n:'01', t:'Requisition raised', who:'Department coordinator'},
  {n:'02', t:'Warehouse verification', who:'Logistics Department'},
  {n:'03', t:'Authorisation', who:'Logistics Department / Top Management'},
  {n:'04', t:'Release & issue', who:'Logistics Department'},
  {n:'05', t:'Record & report', who:'System'}
];
W.STATUS_META = {
  SUBMITTED:{label:'Awaiting warehouse',cls:'submitted',step:1},
  VERIFIED:{label:'Awaiting authorisation',cls:'submitted',step:2},
  AUTHORIZED:{label:'Ready to release',cls:'authorized',step:3},
  RELEASED:{label:'Released',cls:'released',step:5},
  REJECTED:{label:'Rejected',cls:'rejected',step:0}
};
W.statusTag = s => { const m=W.STATUS_META[s]||{label:s,cls:'grey'}; return `<span class="tag t-${m.cls==='submitted'?'amber':m.cls==='authorized'?'blue':m.cls==='released'?'jade':m.cls==='rejected'?'rust':'grey'}"><span class="dot"></span>${esc(m.label)}</span>`; };
W.lineValue = lines => lines.reduce((s,l)=>s+l.qty*W.item(l.itemId).val,0);

function makeReq(id,dept,requester,purpose,project,lines,status,ageDays,priority){
  const created = W.daysAgo(ageDays);
  const hist = [{action:'Requisition raised', by:requester, at:created, note:purpose}];
  if (['VERIFIED','AUTHORIZED','RELEASED'].includes(status)) hist.push({action:'Stock verified — approved', by:'Logistics Department', at:W.daysAgo(ageDays-1), note:'Stock confirmed on shelf'});
  if (['AUTHORIZED','RELEASED'].includes(status)) hist.push({action:'Authorised', by: W.lineValue(lines)>W.THRESHOLD?'Top Management':'Logistics Department', at:W.daysAgo(ageDays-2), note:'Within approved project budget'});
  if (status==='RELEASED'){ hist.push({action:'Released from store', by:'Logistics Department', at:W.daysAgo(ageDays-3), note:'Collected by requesting department'}); hist.push({action:'Recorded in stock ledger', by:'System', at:W.daysAgo(ageDays-3), note:'Movement posted automatically'}); }
  if (status==='REJECTED') hist.push({action:'Rejected', by:'Logistics Department', at:W.daysAgo(ageDays-1), note:'Quantity exceeds available stock; resubmit against next inbound'});
  const l = lines.map(x => ({itemId:x.itemId, qty:x.qty, appr: x.appr!=null?x.appr:x.qty, rel:status==='RELEASED'?(x.appr!=null?x.appr:x.qty):null}));
  return { id, code:id, dept, requester, purpose, project, neededBy:W.daysAhead(W.rint(2,20)), priority, lines:l, status, createdAt:created, history:hist, value:W.lineValue(l) };
}
W.REQS = [
  makeReq('REQ-2201','Charity & Relief','Samuel Machava','Flood relief distribution — Buzi district, 340 families','2026 Flood Relief',
    [{itemId:'TCM-FOD-001',qty:340},{itemId:'TCM-SHL-002',qty:340},{itemId:'TCM-HYG-001',qty:340}], 'SUBMITTED', 2, 'High'),
  makeReq('REQ-2200','Medical','Paula Matola','Mobile clinic restock — Nhamatanda outreach','Community Medical Outreach',
    [{itemId:'TCM-MED-001',qty:12},{itemId:'TCM-MED-002',qty:30}], 'SUBMITTED', 1, 'Normal'),
  makeReq('REQ-2199','Medical','Paula Matola','Folding beds for new shelter wing','Community Medical Outreach',
    [{itemId:'TCM-SHL-003',qty:30}], 'VERIFIED', 3, 'High'),
  makeReq('REQ-2198','Education','Ana Mucavele','School kit handover — Escola Primária de Munhava','Education Support 2026',
    [{itemId:'TCM-EDU-001',qty:180},{itemId:'TCM-EDU-002',qty:90}], 'VERIFIED', 4, 'Normal'),
  makeReq('REQ-2195','Charity & Relief','Samuel Machava','Emergency shelter kits — Dondo','2026 Flood Relief',
    [{itemId:'TCM-SHL-001',qty:60,appr:55},{itemId:'TCM-HYG-003',qty:60}], 'AUTHORIZED', 6, 'High'),
  makeReq('REQ-2190','Charity & Relief','Samuel Machava','Volunteer equipment for rice offloading','Rice Distribution Programme',
    [{itemId:'TCM-EQP-004',qty:70}], 'RELEASED', 12, 'Normal'),
  makeReq('REQ-2185','Charity & Relief','Samuel Machava','Rice distribution — Beira city, 1st wave','Rice Distribution Programme',
    [{itemId:'TCM-FOD-001',qty:900},{itemId:'TCM-FOD-002',qty:400}], 'RELEASED', 21, 'High'),
  makeReq('REQ-2180','Medical','Paula Matola','Paracetamol restock','Community Medical Outreach',
    [{itemId:'TCM-MED-003',qty:40,appr:0}], 'REJECTED', 8, 'Normal')
];
W.counters = { req: 2202, grn: 62, cc: 9, trf: 13 };

/* ---- goods receipts (WH-SOP-02) ---- */
W.GRN_STEPS = [
  {n:'01',t:'Pre-pickup inspection',who:'Seal · exterior · cargo'}, {n:'02',t:'Visual record',who:'Continuous photo & video'},
  {n:'03',t:'Notify HQ',who:'Shipping line · surveyor · insurer'}, {n:'04',t:'Survey & acceptance',who:'Third-party surveyor'},
  {n:'05',t:'Insurance claim',who:'HQ, on survey report'}, {n:'06',t:'Claim documents',who:'LOA + 7 documents'},
  {n:'07',t:'Resolution',who:'Contingency plan'}
];
W.CLAIM_DOCS = ['Letter of Authorization (LOA)','Letter of Claim (quantity lost & amount)','Original insurance policy or certificate',
  'Bill of Lading / transport document','Commercial invoice & packing list','Survey report or damage certificate','Notice of loss & HQ official reply'];
W.ABNORMALITIES = ['Seal broken or cut','Seal number mismatch','Container structural damage','Water ingress / wet cargo','Shortage on count','Damaged packaging','Contamination / infestation','Temperature deviation'];
W.RECEIPTS = [
  { id:'GRN-2026-058', code:'GRN-2026-058', date:W.daysAgo(69), supplier:'Tzu Chi HQ, Taiwan', origin:'Kaohsiung — Beira',
    containerNo:'TCLU 4429183', sealNo:'TW-880114', sealMatch:true, bl:'MSCUTW2264881', weighbridge:'24,180 kg', wh:'W1',
    lines:[{itemId:'TCM-FOD-001',dec:900,rec:900}], abnormal:false, abnormalTypes:[],
    evidence:{photos:true,video:true,irregularity:false}, sopStage:7, status:'POSTED', surveyor:'', claim:{open:false,docs:[],loa:false},
    history:[{action:'Inspection completed — seal intact, no abnormality', by:'Logistics Department', at:W.daysAgo(69)},
             {action:'Cargo counted and posted to stock', by:'Logistics Department', at:W.daysAgo(69)}] },
  { id:'GRN-2026-061', code:'GRN-2026-061', date:W.daysAgo(9), supplier:'Tzu Chi HQ, Taiwan', origin:'Kaohsiung — Beira',
    containerNo:'MSCU 7781204', sealNo:'TW-880231', sealMatch:false, bl:'MSCUTW2271140', weighbridge:'23,640 kg', wh:'W1',
    lines:[{itemId:'TCM-FOD-001',dec:900,rec:872}], abnormal:true, abnormalTypes:['Seal number mismatch','Water ingress / wet cargo','Shortage on count'],
    evidence:{photos:true,video:true,irregularity:true}, sopStage:5, status:'HELD', surveyor:'Third-party surveyor appointed by HQ',
    claim:{open:true, docs:['Letter of Authorization (LOA)','Bill of Lading / transport document','Commercial invoice & packing list'], loa:true},
    history:[
      {action:'Abnormality found on pre-pickup inspection — container not collected', by:'Logistics Department', at:W.daysAgo(9)},
      {action:'Continuous video recorded (top, bottom, all four sides) and photographs taken', by:'Logistics Department', at:W.daysAgo(9)},
      {action:'HQ, shipping line, surveyor and insurer notified. Container not collected.', by:'Logistics Department', at:W.daysAgo(9)},
      {action:'Third-party survey completed — bags wet-damaged, shortage confirmed', by:'Third-party surveyor', at:W.daysAgo(4)},
      {action:'Signed for receipt after verifying surveyor record', by:'Logistics Department', at:W.daysAgo(4)},
      {action:'LOA signed and sent to HQ; claim file opened', by:'Logistics Department', at:W.daysAgo(3)}] }
];

/* ---- inter-warehouse transfers ---- */
W.trfStatus = { REQUESTED:{l:'Awaiting dispatch',c:'t-amber'}, IN_TRANSIT:{l:'In transit',c:'t-blue'}, RECEIVED:{l:'Received',c:'t-jade'} };
W.TRANSFERS = [
  { id:'TRF-2026-11', code:'TRF-2026-11', date:W.daysAgo(6), from:'W1', to:'W3', status:'RECEIVED', vehicle:'MZ-BEI-0042', driver:'Warehouse Operative 2', raisedBy:'Logistics Department',
    lines:[{itemId:'TCM-SHL-004',qty:200},{itemId:'TCM-HYG-003',qty:80}],
    history:[{action:'Transfer raised', by:'Logistics Department', at:W.daysAgo(6)}, {action:'Dispatched from Kura Warehouse', by:'Logistics Department', at:W.daysAgo(6)}, {action:'Received at Nhamatanda Field Store', by:'Logistics Department', at:W.daysAgo(5)}] },
  { id:'TRF-2026-12', code:'TRF-2026-12', date:W.daysAgo(1), from:'W1', to:'W2', status:'IN_TRANSIT', vehicle:'MZ-BEI-0042', driver:'Warehouse Operative 1', raisedBy:'Logistics Department',
    lines:[{itemId:'TCM-EDU-001',qty:120}],
    history:[{action:'Transfer raised', by:'Logistics Department', at:W.daysAgo(1)}, {action:'Dispatched from Kura Warehouse', by:'Logistics Department', at:W.daysAgo(1)}] }
];

/* ---- staff, shifts, equipment, budget, counts, safety ---- */
W.STAFF = [
  {id:'S1',name:'Warehouse Supervisor',post:'Warehouse Supervisor',rate:420,certs:[{n:'Forklift operation',exp:W.daysAhead(310)},{n:'First aid',exp:W.daysAhead(45)}]},
  {id:'S2',name:'Logistics Assistant',post:'Logistics Assistant',rate:260,certs:[{n:'Warehouse safety',exp:W.daysAhead(400)}]},
  {id:'S3',name:'Warehouse Operative 1',post:'Warehouse operative',rate:180,certs:[{n:'Manual handling',exp:W.daysAhead(50)}]},
  {id:'S4',name:'Warehouse Operative 2',post:'Warehouse operative',rate:180,certs:[{n:'Manual handling',exp:W.daysAhead(220)}]},
  {id:'S5',name:'Warehouse Operative 3',post:'Warehouse operative',rate:180,certs:[]},
  {id:'S6',name:'Security Guard',post:'Facility security',rate:150,certs:[]}
];
W.SHIFTS = [];
(function seedShifts(){
  const TASKS = ['Receiving','Picking & release','Cycle count','Housekeeping','Loading'];
  for (let dd=-3; dd<=3; dd++){
    const day = new Date(); day.setDate(day.getDate()+dd);
    if (day.getDay()===0) continue;
    W.STAFF.filter(s=>s.post!=='Facility security').forEach((s,ix) => {
      if (Math.random()<0.12) return;
      W.SHIFTS.push({ id:W.uid('SH'), date:day.toISOString().slice(0,10), staffId:s.id, slot: ix%2?'09:00–16:00':'08:30–17:30', hours: ix%2?7:9, task:W.pick(TASKS) });
    });
  }
})();
W.staffOf = id => W.STAFF.find(s=>s.id===id) || {name:'—',rate:0,post:''};
W.labourFor = d => { const sh=W.SHIFTS.filter(s=>s.date===d); return { hours: sh.reduce((a,s)=>a+s.hours,0), cost: sh.reduce((a,s)=>a+s.hours*W.staffOf(s.staffId).rate,0), n:sh.length }; };
W.monthLabour = p => { const sh=W.SHIFTS.filter(s=>s.date.slice(0,7)===p); return { hours: sh.reduce((a,s)=>a+s.hours,0), cost: sh.reduce((a,s)=>a+s.hours*W.staffOf(s.staffId).rate,0) }; };

W.EQUIPMENT = [
  {id:'EQ-01',name:'Hand pallet truck A',type:'Materials handling',wh:'W1',serial:'HPT-2401',lastInsp:W.daysAgo(20),nextInsp:W.daysAhead(70),status:'Serviceable'},
  {id:'EQ-02',name:'Hand pallet truck B',type:'Materials handling',wh:'W1',serial:'HPT-2402',lastInsp:W.daysAgo(95),nextInsp:W.daysAhead(-5),status:'Inspection due'},
  {id:'EQ-03',name:'Digital platform scale 300 kg',type:'Weighing',wh:'W1',serial:'SC-300-11',lastInsp:W.daysAgo(40),nextInsp:W.daysAhead(140),status:'Serviceable'},
  {id:'EQ-04',name:'Delivery vehicle — 3 t truck',type:'Vehicle',wh:'W1',serial:'MZ-BEI-0042',lastInsp:W.daysAgo(60),nextInsp:W.daysAhead(30),status:'Serviceable'},
  {id:'EQ-05',name:'Forklift 1.8 t',type:'Materials handling',wh:'W1',serial:'FL-1801',lastInsp:W.daysAgo(130),nextInsp:W.daysAhead(-15),status:'Out of service'}
];
W.MAINTENANCE = [
  {id:W.uid('MT'),equipId:'EQ-05',date:W.daysAgo(12),type:'Repair',by:'External contractor',cost:38500,note:'Hydraulic leak — awaiting parts, unit withdrawn from service.'},
  {id:W.uid('MT'),equipId:'EQ-04',date:W.daysAgo(60),type:'Service',by:'External contractor',cost:21000,note:'Routine service and inspection.'},
  {id:W.uid('MT'),equipId:'EQ-01',date:W.daysAgo(20),type:'Inspection',by:'Logistics Department',cost:0,note:'Pre-use inspection passed.'}
];
W.equipOf = id => W.EQUIPMENT.find(e=>e.id===id) || {name:'—'};

const thisMonth = new Date().toISOString().slice(0,7);
W.BUDGET = [
  {id:'B1',period:thisMonth,line:'Warehouse labour',cat:'Labour',budget:185000,actual:0},
  {id:'B2',period:thisMonth,line:'Equipment maintenance',cat:'Maintenance',budget:60000,actual:38500},
  {id:'B3',period:thisMonth,line:'Fuel and vehicle running',cat:'Transport',budget:45000,actual:31200},
  {id:'B4',period:thisMonth,line:'Packaging and consumables',cat:'Consumables',budget:25000,actual:18400},
  {id:'B5',period:thisMonth,line:'Facility — utilities and security',cat:'Facility',budget:70000,actual:66500}
];

W.COUNTS = [
  {id:'CC-2026-07',code:'CC-2026-07',date:W.daysAgo(11),wh:'W1',by:'Logistics Department',status:'POSTED',note:'Monthly count, aisle A',
    lines:[{itemId:'TCM-FOD-001',sys:4392,cnt:4380},{itemId:'TCM-FOD-002',sys:2400,cnt:2400},{itemId:'TCM-FOD-003',sys:183,cnt:180}]},
  {id:'CC-2026-08',code:'CC-2026-08',date:W.daysAgo(1),wh:'W1',by:'Logistics Department',status:'OPEN',note:'Aisle C — hygiene stock',
    lines:[{itemId:'TCM-HYG-001',sys:410,cnt:null},{itemId:'TCM-HYG-002',sys:3200,cnt:null},{itemId:'TCM-HYG-004',sys:95,cnt:null}]}
];

W.SAFETY_CHECKS = ['Aisles and emergency exits clear','Fire extinguishers in place and in date','First aid kit stocked and accessible','Racking undamaged, loads within limits','Spill kit available, floor dry','PPE worn — gloves, boots, high-visibility vests','Forklift and pallet truck pre-use check done','Perimeter and store secured at close'];
W.SAFETY = [
  {id:W.uid('SF'),date:W.daysAgo(1),by:'Logistics Department',wh:'W1',passed:W.SAFETY_CHECKS.slice(0,7),failed:['Perimeter and store secured at close'],note:'Rear gate latch needs repair — reported to facility.'},
  {id:W.uid('SF'),date:W.daysAgo(2),by:'Logistics Department',wh:'W1',passed:W.SAFETY_CHECKS,failed:[],note:''}
];
W.INCIDENTS = [
  {id:'INC-2026-03',date:W.daysAgo(16),type:'Near miss',severity:'Medium',wh:'W1',desc:'Pallet of rice shifted during stacking; no injury.',by:'Warehouse Operative 1',action:'Stack height limited to four pallets; toolbox talk delivered.',status:'Closed'},
  {id:'INC-2026-04',date:W.daysAgo(5),type:'Property damage',severity:'Low',wh:'W1',desc:'Pallet truck wheel damaged a section of floor coating in bay 2.',by:'Logistics Department',action:'Floor repair quoted; area cordoned.',status:'Open'}
];
W.incCounter = 5;
W.REPORTS = [];
W.NOTIF_READ = {};

/* ---- daily operating hours (WH-SOP-01) ---- */
W.DAY_PHASES = [ {from:8.5,to:9,t:'Planning',d:"Stock check, pick list, day's requisitions reviewed"}, {from:9,to:16,t:'Public hours',d:'Receiving, issuing and collections'}, {from:16,to:17.5,t:'Reporting',d:"Ledger reconciled, day's report filed"} ];
W.dayPhase = () => { const n=new Date(); const h=n.getHours()+n.getMinutes()/60; return W.DAY_PHASES.findIndex(p=>h>=p.from&&h<p.to); };
W.dayStripHTML = () => { const cur=W.dayPhase(); return '<div class="rail">'+W.DAY_PHASES.map((p,i)=>{ const t=n=>String(Math.floor(n)).padStart(2,'0')+':'+(n%1?'30':'00'); return `<div class="rail-step ${i===cur?'now':i<cur?'done':''}"><div class="n">${t(p.from)} – ${t(p.to)}</div><div class="t">${esc(p.t)}</div><div class="m">${esc(p.d)}</div></div>`; }).join('')+'</div>'; };

/* ---- exceptions (drives Control Tower + Daily Report) ---- */
W.exceptions = () => {
  const x = [];
  W.RECEIPTS.filter(r=>r.status==='HELD').forEach(r=>x.push({sev:'Critical',area:'Inbound',what:'Container '+r.containerNo+' held under WH-SOP-02 — '+r.abnormalTypes.join(', ')}));
  W.ITEMS.filter(i=>i.qty<=0).forEach(i=>x.push({sev:'Critical',area:'Stock',what:i.name+' is at zero'}));
  W.ITEMS.filter(i=>i.qty>0 && i.qty<=i.reorder).forEach(i=>x.push({sev:'High',area:'Stock',what:i.name+' below reorder ('+nf(i.qty)+' of '+nf(i.reorder)+')'}));
  W.REQS.filter(r=>['SUBMITTED','VERIFIED'].includes(r.status) && hoursBetween(r.history[r.history.length-1].at,new Date())>48).forEach(r=>x.push({sev:'High',area:'Requisitions',what:r.code+' waiting over 48 hours at step '+W.STATUS_META[r.status].step}));
  W.EQUIPMENT.filter(e=>e.status==='Out of service').forEach(e=>x.push({sev:'High',area:'Equipment',what:e.name+' out of service'}));
  W.EQUIPMENT.filter(e=>daysUntil(e.nextInsp)<=0 && e.status!=='Out of service').forEach(e=>x.push({sev:'Medium',area:'Equipment',what:e.name+' inspection overdue'}));
  W.INCIDENTS.filter(i=>i.status==='Open').forEach(i=>x.push({sev:'Medium',area:'Safety',what:i.id+' — '+i.desc}));
  (W.SAFETY[0] && W.SAFETY[0].failed||[]).forEach(f=>x.push({sev:'Medium',area:'Safety',what:'Failed check: '+f}));
  W.ITEMS.filter(i=>i.exp && daysUntil(i.exp)<=90 && daysUntil(i.exp)>=0).forEach(i=>x.push({sev:'Low',area:'Stock',what:i.name+' expires '+fmtD(i.exp)}));
  const rank={Critical:0,High:1,Medium:2,Low:3};
  return x.sort((a,b)=>rank[a.sev]-rank[b.sev]);
};
W.sevTag = s => `<span class="tag t-${s==='Critical'?'rust':s==='High'?'amber':s==='Medium'?'sand':'grey'}">${s}</span>`;

/* ---- KPI drill-downs — every "Critical / High priority / etc" number opens the list behind it ---- */
W.AREA_VIEW = {Inbound:'receiving',Stock:'inventory',Requisitions:'requisitions',Equipment:'equipment',Safety:'sop'};
W.showExceptions = (sev) => {
  const list = W.exceptions().filter(e=>!sev || e.sev===sev);
  showDrawer('Logistics Control Tower', sev ? sev+' exceptions' : 'All exceptions',
    list.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Severity</th><th>Area</th><th>What</th><th></th></tr></thead><tbody>${list.map(e=>`<tr><td>${W.sevTag(e.sev)}</td><td class="small">${esc(e.area)}</td><td class="small">${esc(e.what)}</td><td>${W.AREA_VIEW[e.area]?`<button class="action-btn compact" onclick="closeDrawer();switchView('${W.AREA_VIEW[e.area]}')">Open</button>`:''}</td></tr>`).join('')}</tbody></table></div>`
    : W.emptyState('Nothing here','All clear at this severity.'));
};
W.showInflight = () => {
  const inflight = W.REQS.filter(r=>['SUBMITTED','VERIFIED','AUTHORIZED'].includes(r.status)).sort((a,b)=>new Date(a.history[a.history.length-1].at)-new Date(b.history[b.history.length-1].at));
  showDrawer('Logistics Control Tower', 'Requisitions in flight',
    inflight.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Department</th><th>Status</th><th></th></tr></thead><tbody>${inflight.map(r=>`<tr><td><strong>${esc(r.id)}</strong></td><td class="small">${esc(r.dept)}</td><td>${W.statusTag(r.status)}</td><td><button class="action-btn compact" onclick="closeDrawer();W.openReq('${r.id}')">View</button></td></tr>`).join('')}</tbody></table></div>`
    : W.emptyState('Pipeline clear','No requisitions in flight.'));
};
W.showConsignments = () => {
  const held = W.RECEIPTS.filter(r=>r.status==='HELD'); const transit = W.TRANSFERS.filter(t=>t.status==='IN_TRANSIT');
  const rows = [...held.map(g=>({ref:g.code,detail:g.origin+' · '+g.containerNo,tag:'<span class="tag t-rust">Held</span>',action:`closeDrawer();W.openGRN('${g.id}')`})),
    ...transit.map(t=>({ref:t.code,detail:W.whName(t.from)+' → '+W.whName(t.to),tag:'<span class="tag t-blue">In transit</span>',action:`closeDrawer();W.openTransfer('${t.id}')`}))];
  showDrawer('Logistics Control Tower', 'Consignments moving',
    rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Detail</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.ref)}</strong></td><td class="small">${esc(r.detail)}</td><td>${r.tag}</td><td><button class="action-btn compact" onclick="${r.action}">View</button></td></tr>`).join('')}</tbody></table></div>`
    : W.emptyState('Nothing moving right now',''));
};

/* ============================================================ NAV */
const tnW = k => t('navW.'+k+'.l'), tsW = k => t('navW.'+k+'.s');
W.NAV = role => {
  const low = W.ITEMS.filter(i=>i.qty<i.reorder).length;
  const mine = activeUser ? W.REQS.filter(r=>r.requester===activeUser.name).length : 0;
  const awaiting = W.REQS.filter(r=>['SUBMITTED','VERIFIED'].includes(r.status)).length;
  const awaitingHigh = W.REQS.filter(r=>r.status==='VERIFIED' && r.value>W.THRESHOLD).length;
  const held = W.RECEIPTS.filter(r=>r.status==='HELD').length;
  if (role === 'coordinator') return {
    dashboard: {icon:'⊞', label:tnW('dashboard'), title:tnW('dashboard'), sub:tsW('dashboardCoord'), group:tg('Overview')},
    requisitions: {icon:'📝', label:tnW('requisitionsMine'), title:tnW('requisitionsMine'), sub:tsW('requisitionsMine'), badge:mine||'', group:tg('Overview')}
  };
  if (role === 'top_management') return {
    dashboard: {icon:'⊞', label:tnW('dashboard'), title:tnW('dashboard'), sub:tsW('dashboardTM'), group:tg('Overview')},
    requisitions: {icon:'📝', label:tnW('requisitions'), title:tnW('requisitions'), sub:tsW('requisitionsTM').replace('{n}',W.THRESHOLD.toLocaleString()), badge:awaitingHigh||'', group:tg('Warehouse')},
    budget: {icon:'💰', label:tnW('budget'), title:tnW('budget'), sub:tsW('budget'), group:tg('Resources')},
    reports: {icon:'📊', label:tnW('reports'), title:tnW('reports'), sub:tsW('reports'), group:tg('Insight')}
  };
  if (role === 'admin') return {
    dashboard: {icon:'⊞', label:tnW('dashboard'), title:tnW('dashboard'), sub:tsW('dashboardAdmin'), group:tg('Overview')},
    reports: {icon:'📊', label:tnW('reports'), title:tnW('reports'), sub:tsW('reports'), group:tg('Insight')}
  };
  // logistics: full operational control
  return {
    dashboard: {icon:'⊞', label:tnW('dashboard'), title:tnW('dashboard'), sub:tsW('dashboard'), group:tg('Overview')},
    tower: {icon:'🎛', label:tnW('tower'), title:tnW('tower'), sub:tsW('tower'), group:tg('Overview')},
    inventory: {icon:'📦', label:tnW('inventory'), title:tnW('inventory'), sub:tsW('inventory'), badge:low||'', group:tg('Warehouse')},
    receiving: {icon:'🚛', label:tnW('receiving'), title:tnW('receiving'), sub:tsW('receiving'), badge:held||'', group:tg('Warehouse')},
    requisitions: {icon:'📝', label:tnW('requisitions'), title:tnW('requisitions'), sub:tsW('requisitions'), badge:awaiting||'', group:tg('Warehouse')},
    movements: {icon:'↕', label:tnW('movements'), title:tnW('movements'), sub:tsW('movements'), group:tg('Warehouse')},
    transfers: {icon:'⇄', label:tnW('transfers'), title:tnW('transfers'), sub:tsW('transfers'), group:tg('Warehouse')},
    warehouses: {icon:'🏬', label:tnW('warehouses'), title:tnW('warehouses'), sub:tsW('warehouses'), group:tg('Warehouse')},
    staff: {icon:'👥', label:tnW('staff'), title:tnW('staff'), sub:tsW('staff'), group:tg('Resources')},
    equipment: {icon:'🛠', label:tnW('equipment'), title:tnW('equipment'), sub:tsW('equipment'), group:tg('Resources')},
    budget: {icon:'💰', label:tnW('budget'), title:tnW('budget'), sub:tsW('budget'), group:tg('Resources')},
    daily: {icon:'🗓', label:tnW('daily'), title:tnW('daily'), sub:tsW('daily'), group:tg('Insight')},
    reports: {icon:'📊', label:tnW('reports'), title:tnW('reports'), sub:tsW('reports'), group:tg('Insight')},
    sop: {icon:'📘', label:tnW('sop'), title:tnW('sop'), sub:tsW('sop'), group:tg('Governance')},
    notifications: {icon:'🔔', label:tnW('notifications'), title:tnW('notifications'), sub:tsW('notifications'), group:tg('Governance')}
  };
};
W.badgeCount = user => user.role==='coordinator'
  ? W.REQS.filter(r=>r.requester===user.name && ['SUBMITTED','VERIFIED'].includes(r.status)).length
  : W.notifications().filter(n=>!(W.NOTIF_READ[user.id]||[]).includes(n.k)).length;

/* ============================================================ SHARED HELPERS */
W.kpi = (lab,val,sub,cls,unit,onclick) => `<div class="kpi ${cls||''}"${onclick?` style="cursor:pointer" onclick="${onclick}"`:''}><div class="kpi-head"><span>${cls?`<i class="kpi-dot ${cls}"></i>`:''}${esc(lab)}</span></div><strong>${val}${unit?`<small style="font-size:12px;font-weight:600;color:var(--muted);margin-left:3px">${esc(unit)}</small>`:''}</strong><small>${sub||''}</small></div>`;
W.emptyState = (msg,hint) => `<div class="empty"><div style="font-weight:600;color:var(--ink)">${esc(msg)}</div><div class="small">${esc(hint||'')}</div></div>`;
W.whStats = id => { const items=W.ITEMS.filter(i=>i.wh===id); const low=items.filter(i=>i.qty<i.reorder).length; const value=items.reduce((s,i)=>s+i.qty*i.val,0); return {count:items.length, low, value}; };
/* Real lat/lon markers via Leaflet — replaces the old absolute-% overlay on a static
   iframe, which drifted out of position the moment the embedded map was zoomed or panned. */
W.facilityMapHTML = (height=300) => `<div class="map-wrap" style="height:${height}px"><div id="facility-map" class="leaflet-map"></div><div style="position:absolute;bottom:8px;left:8px;z-index:400;background:rgba(0,41,77,.72);color:#fff;border-radius:8px;padding:6px 10px;font-size:10px;font-weight:700;">🟢 Stock healthy &nbsp;|&nbsp; 🔴 Below reorder</div></div>`;
W.initFacilityMap = () => {
  if (!$('facility-map')) return;
  renderLiveMap('facility-map', { center:[-21.5,35.5], zoom:5, markers: W.WAREHOUSES.map(w => { const st=W.whStats(w.id);
    return { lat:w.lat, lon:w.lon, color: st.low>0?'alert':'active',
      popupHTML:`<strong>${esc(w.name)}</strong>${esc(w.loc)}<br>${st.count} SKUs · ${st.low} below reorder`,
      onclick:()=>toast(w.name, w.loc+' · '+st.count+' SKUs · '+st.low+' below reorder') }; }) });
};

/* ============================================================ RENDER ROUTER */
W.render = view => {
  switch (view) {
    case 'dashboard': return W.renderDashboard();
    case 'tower': return W.renderTower();
    case 'inventory': return W.renderInventory();
    case 'receiving': return W.renderReceiving();
    case 'requisitions': return W.renderRequisitions();
    case 'movements': return W.renderMovements();
    case 'transfers': return W.renderTransfers();
    case 'warehouses': return W.renderWarehouses();
    case 'staff': return W.renderStaff();
    case 'equipment': return W.renderEquipment();
    case 'budget': return W.renderBudget();
    case 'daily': return W.renderDaily();
    case 'reports': return W.renderReports();
    case 'sop': return W.renderSOP();
    case 'notifications': return W.renderNotifications();
  }
};

/* ============================================================ DASHBOARD */
W.renderDashboard = () => {
  const low = W.ITEMS.filter(i=>i.qty<i.reorder);
  const awaiting = W.REQS.filter(r=>['SUBMITTED','VERIFIED'].includes(r.status));
  const released = W.REQS.filter(r=>r.status==='RELEASED').length;
  const totalValue = W.ITEMS.reduce((s,i)=>s+i.qty*i.val,0);
  const held = W.RECEIPTS.filter(r=>r.status==='HELD');
  $('view').innerHTML = `${W.dayStripHTML()}
  <div class="grid kpi-grid" style="margin:16px 0 20px">
  ${W.kpi('Stock value',(totalValue/1e6).toFixed(2)+'M','MZN across '+W.WAREHOUSES.length+' stores', '', '', "switchView('inventory')")}
  ${W.kpi('Below reorder', low.length, 'Items need restock', low.length?'bad':'good', '', "switchView('inventory',{stock:'low'})")}
  ${W.kpi('Awaiting action', awaiting.length, 'Requisitions in the pipeline', awaiting.length?'warn':'good', '', "W.showInflight()")}
  ${W.kpi('Released', released, 'Requisitions fulfilled', 'good', '', "switchView('requisitions')")}
  </div>
  ${held.length ? `<div class="note bad" style="margin-bottom:16px"><b>${held.length} container held under WH-SOP-02.</b> ${esc(held[0].containerNo)} — survey and claim in progress.</div>` : ''}
  <div class="grid two-col">
  <div class="card"><div class="card-header"><div><h3>Warehouse locations</h3><p>Stock health across ${W.WAREHOUSES.length} stores</p></div></div>${W.facilityMapHTML()}
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Store</th><th>SKUs</th><th>Below reorder</th><th>Value (MZN)</th></tr></thead><tbody>${W.WAREHOUSES.map(w=>{const st=W.whStats(w.id);return `<tr><td><strong>${esc(w.name)}</strong><br><small>${esc(w.loc)}</small></td><td>${st.count}</td><td class="${st.low?'danger':''}">${st.low}</td><td>${st.value.toLocaleString()}</td></tr>`;}).join('')}</tbody></table></div>
  </div>
  <div class="card"><div class="card-header"><div><h3>Low stock</h3><p>Below minimum threshold</p></div></div><div class="activity-list">${low.length?low.map(i=>`<div class="activity-item"><div class="activity-dot" style="background:var(--red)"></div><div><strong>${esc(i.name)}</strong><span>${i.qty} ${esc(i.unit)} left · reorder at ${i.reorder} · ${esc(W.whName(i.wh))}</span></div></div>`).join(''):'<div class="activity-item"><div class="activity-dot" style="background:var(--green)"></div><div><strong>All items above reorder level</strong></div></div>'}</div></div>
  </div>
  <div class="card" style="margin-top:18px"><div class="card-header"><div><h3>Requisition pipeline</h3><p>Live status across the SOP chain</p></div><button class="text-btn" onclick="switchView('requisitions')">Open requisitions</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Item(s)</th><th>Dept</th><th>Value (MZN)</th><th>Status</th></tr></thead><tbody>${W.REQS.slice(0,8).map(r=>`<tr><td><strong>${esc(r.id)}</strong></td><td>${r.lines.map(l=>esc(W.item(l.itemId).name)).join(', ')}</td><td>${esc(r.dept)}</td><td>${r.value.toLocaleString()}</td><td>${W.statusTag(r.status)}</td></tr>`).join('')}</tbody></table></div></div>`;
  W.initFacilityMap();
};

/* ============================================================ CONTROL TOWER */
W.renderTower = () => {
  const x = W.exceptions();
  const held = W.RECEIPTS.filter(r=>r.status==='HELD');
  const inflight = W.REQS.filter(r=>['SUBMITTED','VERIFIED','AUTHORIZED'].includes(r.status)).sort((a,b)=>new Date(a.history[a.history.length-1].at)-new Date(b.history[b.history.length-1].at));
  const transit = W.TRANSFERS.filter(t=>t.status==='IN_TRANSIT');
  const crit = x.filter(e=>e.sev==='Critical').length, high = x.filter(e=>e.sev==='High').length;
  const f = W.dayFigures(W.today());
  $('view').innerHTML = `${W.dayStripHTML()}
  <div class="grid kpi-grid" style="margin:16px 0 20px">
  ${W.kpi('Critical', crit, 'Stop-the-line issues', crit?'bad':'good', '', "W.showExceptions('Critical')")}
  ${W.kpi('High priority', high, 'Same-day response', high?'warn':'good', '', "W.showExceptions('High')")}
  ${W.kpi('Requisitions in flight', inflight.length, 'Across steps 02 to 04', '', '', "W.showInflight()")}
  ${W.kpi('Consignments moving', transit.length+held.length, held.length+' held · '+transit.length+' in transit', held.length?'warn':'', '', "W.showConsignments()")}
  </div>
  <div class="grid two-col">
  <div class="card"><div class="card-header"><div><h3>Requisition pipeline</h3><p>Oldest first</p></div></div>
  <div class="table-wrap">${inflight.length ? `<table class="data-table"><thead><tr><th>Reference</th><th>Department</th><th>Step</th><th>Waiting</th><th>Next actor</th></tr></thead><tbody>${inflight.map(r=>{const age=hoursBetween(r.history[r.history.length-1].at,new Date());const nx=W.REQ_STEPS[W.STATUS_META[r.status].step]||W.REQ_STEPS[4];return `<tr><td><strong>${esc(r.id)}</strong><br><small>${esc(r.purpose.slice(0,46))}</small></td><td>${esc(r.dept)}</td><td>${W.statusTag(r.status)}</td><td class="${age>48?'warning':''}">${age} h</td><td class="muted">${esc(nx.who)}</td></tr>`;}).join('')}</tbody></table>` : W.emptyState('Pipeline clear','No requisitions in flight.')}</div></div>
  <div class="card"><div class="card-header"><div><h3>Exceptions</h3></div><span class="tag t-${x.length?'amber':'jade'}" style="margin-right:16px">${x.length}</span></div>
  <div class="table-wrap" style="max-height:340px">${x.length ? `<table class="data-table"><tbody>${x.map(e=>`<tr><td style="width:1%">${W.sevTag(e.sev)}</td><td class="small"><b>${esc(e.area)}</b> — ${esc(e.what)}</td></tr>`).join('')}</tbody></table>` : W.emptyState('Nothing outstanding','')}</div></div>
  </div>
  <div class="card" style="margin-top:18px"><div class="card-header"><div><h3>Today at a glance</h3><p>${fmtD(new Date())}</p></div></div><div class="card-body">
  ${[['Units received',nf(f.in.reduce((a,m)=>a+m.qty,0))],['Units released',nf(f.out.reduce((a,m)=>a+m.qty,0))],['Movements posted',f.in.length+f.out.length+f.adj.length],['Requisitions raised',f.raised.length],['Requisitions released',f.released.length],['Labour hours rostered',f.labour.hours],['Daily report filed', W.REPORTS.some(r=>r.date===W.today())?'Yes':'Not yet']]
    .map(([k,v])=>`<div class="activity-item" style="padding:9px 0"><div style="flex:1">${esc(k)}</div><strong>${v}</strong></div>`).join('')}
  </div></div>`;
};

/* ============================================================ INVENTORY */
W.renderInventory = () => {
  const tb = state.tab || 'items';
  const tabs = `<div class="subtabs"><button class="subtab ${tb==='items'?'active':''}" onclick="state.tab='items';switchView('inventory')">Items</button><button class="subtab ${tb==='counts'?'active':''}" onclick="state.tab='counts';switchView('inventory')">Cycle counts</button></div>`;
  if (tb==='counts') { $('view').innerHTML = tabs; return W.renderCounts(); }
  const f = state.filters;
  let rows = W.ITEMS.slice();
  if (f.cat) rows = rows.filter(i=>i.cat===f.cat);
  if (f.wh) rows = rows.filter(i=>i.wh===f.wh);
  if (f.stock==='low') rows = rows.filter(i=>i.qty<=i.reorder);
  rows.sort((a,b)=>a.code.localeCompare(b.code));
  $('view').innerHTML = tabs + `<div class="card"><div class="card-header" style="flex-wrap:wrap;gap:8px">
  <div><h3>Inventory</h3><p>${W.ITEMS.length} SKUs across ${W.WAREHOUSES.length} stores</p></div>
  <div class="row" style="display:flex;gap:8px;flex-wrap:wrap">
    <select onchange="state.filters.cat=this.value;switchView('inventory')"><option value="">All categories</option>${W.CATS.map(c=>`<option value="${c.id}" ${f.cat===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
    <select onchange="state.filters.wh=this.value;switchView('inventory')"><option value="">All warehouses</option>${W.WAREHOUSES.map(w=>`<option value="${w.id}" ${f.wh===w.id?'selected':''}>${esc(w.name)}</option>`).join('')}</select>
    <select onchange="state.filters.stock=this.value;switchView('inventory')"><option value="">All stock levels</option><option value="low" ${f.stock==='low'?'selected':''}>Below reorder only</option></select>
    ${W.can('inv.edit')?`<button class="primary-btn compact" onclick="W.openNewItem()">+ Add item</button>`:''}
  </div></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th></th><th>Code</th><th>Item</th><th>Category</th><th>Store / bin</th><th>On hand</th><th>Reorder</th><th>Value</th></tr></thead><tbody>
  ${rows.map(i=>`<tr onclick="W.openItem('${i.id}')" style="cursor:pointer"><td>${W.CATEGORY_IMAGES[i.cat]?`<img src="${W.CATEGORY_IMAGES[i.cat].url}" alt="${esc(W.catName(i.cat))}" class="inv-thumb">`:`<div class="inv-thumb inv-thumb-empty">${esc(i.cat)}</div>`}</td><td><span class="tag t-blue">${esc(i.code)}</span></td><td><strong>${esc(i.name)}</strong>${i.exp?`<br><small class="muted">Expires ${fmtD(i.exp)}</small>`:''}</td><td class="small">${esc(W.catName(i.cat))}</td><td class="small">${esc(W.whName(i.wh))}<br><small class="muted">${esc(i.loc)}</small></td><td><strong>${nf(i.qty)}</strong> <small class="muted">${esc(i.unit)}</small></td><td class="muted">${nf(i.reorder)}</td><td class="small">${money(i.qty*i.val)}</td></tr>`).join('')}
  </tbody></table>${rows.length?'':W.emptyState('No items match those filters','Clear the filters or search a different code.')}</div></div>`;
};
W.openItem = id => {
  const i = W.item(id);
  const led = W.MOVEMENTS.filter(m=>m.itemId===id).sort((a,b)=>new Date(b.at)-new Date(a.at));
  const linked = W.REQS.filter(r=>r.lines.some(l=>l.itemId===id));
  const pct = Math.min(100, Math.round(i.qty/Math.max(1,i.reorder*3)*100));
  const img = W.CATEGORY_IMAGES[i.cat];
  showDrawer(`${esc(W.catName(i.cat))} · ${esc(W.whName(i.wh))}`, i.name, `<div class="stack" style="display:flex;flex-direction:column;gap:16px">
    ${img ? `<div style="border-radius:var(--radius);overflow:hidden;position:relative"><img src="${img.url}" alt="${esc(W.catName(i.cat))}" style="width:100%;height:170px;object-fit:cover;display:block"><div style="position:absolute;bottom:0;left:0;right:0;background:rgba(11,32,56,.65);color:#fff;font-size:10px;padding:5px 10px">Representative photo, ${esc(W.catName(i.cat))} · ${esc(img.credit)}</div></div>` : ''}
    <div class="card"><div class="card-body" style="display:flex;gap:16px;align-items:flex-start">
      <div class="qr-box" data-qr="TCMWMS|ITEM|${esc(i.code)}|${esc(i.name)}|${esc(W.whName(i.wh))}|${esc(i.loc)}" data-size="100"></div>
      <div style="flex:1;min-width:0"><span class="tag t-blue">${esc(i.code)}</span>
        <div style="display:flex;gap:22px;margin-top:10px"><div><p class="eyebrow blue">On hand</p><div style="font-family:var(--mono);font-size:24px;font-weight:600">${nf(i.qty)} <small class="muted" style="font-size:13px">${esc(i.unit)}</small></div></div><div><p class="eyebrow blue">Reorder at</p><div style="font-family:var(--mono);font-size:24px;font-weight:600;color:var(--muted)">${nf(i.reorder)}</div></div></div>
        <div class="bar-track" style="margin-top:10px"><div class="bar-fill" style="width:${pct}%;background:${i.qty<=i.reorder?'var(--amber)':'var(--green)'}"></div></div>
        <div class="muted small" style="margin-top:8px">Bin <b>${esc(i.loc)}</b> · Unit value ${money(i.val)}${i.exp?` · Expires ${fmtD(i.exp)}`:''}</div>
      </div></div></div>
    ${W.can('inv.adjust') ? `<div class="card"><div class="card-header"><h3>Record an adjustment</h3></div><div class="card-body">
      <div class="form-grid"><label>Type<select id="adj-type"><option value="IN">Receipt / return in</option><option value="OUT">Issue out</option><option value="ADJ">Stock count correction</option></select></label>
      <label>Quantity<input id="adj-qty" type="number" min="1" value="1"></label>
      <label class="full">Reason (recorded in the ledger)<input id="adj-note" placeholder="e.g. Cycle count variance, bin ${esc(i.loc)}"></label></div>
      <button class="primary-btn compact" onclick="W.adjustItem('${esc(i.id)}')">Post movement</button></div></div>` : ''}
    <div class="card"><div class="card-header"><div><h3>Stock ledger — in / out</h3><p>${led.length} movements</p></div></div>
    <div class="table-wrap" style="max-height:300px;overflow:auto"><table class="data-table"><thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Balance</th><th>Reference</th></tr></thead><tbody>${led.map(m=>`<tr><td class="small">${fmtD(m.at)}</td><td>${W.movTag(m.type)}</td><td>${m.type==='OUT'?'−':'+'}${nf(m.qty)}</td><td class="muted">${nf(m.bal)}</td><td class="small">${esc(m.ref)}</td></tr>`).join('')}</tbody></table>${led.length?'':W.emptyState('No movements recorded','')}</div></div>
    ${linked.length ? `<div class="card"><div class="card-header"><h3>Requisitions for this item</h3></div><div class="table-wrap"><table class="data-table"><tbody>${linked.map(r=>`<tr onclick="closeDrawer();W.openReq('${r.id}')" style="cursor:pointer"><td><span class="tag t-blue">${esc(r.code)}</span></td><td class="small">${esc(r.dept)}</td><td>${W.statusTag(r.status)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
  </div>`);
};
W.movTag = t => `<span class="tag t-${t==='IN'?'jade':t==='OUT'?'sand':'grey'}">${t}</span>`;
W.adjustItem = id => {
  const i = W.item(id); const type = $('adj-type').value; const q = Math.max(0, +$('adj-qty').value||0); const note = $('adj-note').value.trim();
  if (!q) { toast('Enter a quantity'); return; } if (!note) { toast('A reason is required for every adjustment'); return; }
  if (type==='OUT' && q>i.qty) { toast('Cannot issue more than the '+nf(i.qty)+' on hand'); return; }
  i.qty = type==='IN'?i.qty+q:type==='OUT'?i.qty-q:q;
  W.MOVEMENTS.unshift({id:W.uid('MV'),itemId:i.id,type,qty:q,at:new Date().toISOString(),bal:i.qty,ref:'MANUAL',dept:activeUser.dept,by:activeUser.name,note});
  audit('Stock adjustment on '+i.code, 'item', type+' '+q+' — '+note);
  closeDrawer(); switchView('inventory'); toast('Movement posted to '+i.code);
};
W.openNewItem = () => {
  showModal(`<p class="eyebrow blue">Inventory</p><h3>Add an item code</h3><form id="ni-form" class="form-grid">
  <label>Category<select name="cat">${W.CATS.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
  <label>Unit of issue<input name="unit" placeholder="e.g. Bag, Kit, Piece" required></label>
  <label class="full">Item name<input name="name" placeholder="e.g. Jing Si Rice 20 kg" required></label>
  <label>Opening quantity<input name="qty" type="number" min="0" value="0"></label><label>Reorder level<input name="reorder" type="number" min="0" value="0"></label><label>Unit value (MT)<input name="val" type="number" min="0" value="0"></label>
  <label>Store<select name="wh">${W.WAREHOUSES.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select></label><label>Bin location<input name="loc" placeholder="e.g. A-01-03"></label>
  <button class="primary-btn full" type="submit">Add item</button></form>`);
  $('ni-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target); const cat=f.get('cat'); const n=W.ITEMS.filter(i=>i.cat===cat).length+1; const code='TCM-'+cat+'-'+String(n).padStart(3,'0');
    const it = WI(code, f.get('name'), cat, f.get('unit')||'Unit', +f.get('qty')||0, +f.get('reorder')||0, f.get('wh'), f.get('loc')||'—', +f.get('val')||0, '');
    W.ITEMS.push(it); if (it.qty>0) W.MOVEMENTS.unshift({id:W.uid('MV'),itemId:code,type:'IN',qty:it.qty,at:new Date().toISOString(),bal:it.qty,ref:'OPENING',dept:'—',by:activeUser.name,note:'Opening balance'});
    audit('Created item '+code,'item',it.name); closeModal(); switchView('inventory'); toast(code+' added'); };
};

/* ============================================================ CYCLE COUNTS */
W.renderCounts = () => {
  const rows = W.COUNTS.slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const open = rows.filter(c=>c.status==='OPEN');
  $('view').innerHTML += `<div class="card"><div class="card-header"><div><h3>Cycle counts</h3><p>${open.length} open</p></div>${W.can('count.manage')?`<button class="primary-btn compact" onclick="W.openNewCount()">+ Open a count</button>`:''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Date</th><th>Store</th><th>Scope</th><th>Lines</th><th>Status</th></tr></thead><tbody>
  ${rows.map(c=>{const v=c.lines.filter(l=>l.cnt!==null&&l.cnt!==l.sys).length;return `<tr onclick="W.openCount('${c.id}')" style="cursor:pointer"><td><span class="tag t-blue">${esc(c.code)}</span></td><td class="small">${fmtD(c.date)}</td><td class="small">${esc(W.whName(c.wh))}</td><td class="small">${esc(c.note)}</td><td>${c.lines.length}</td><td>${c.status==='OPEN'?'<span class="tag t-amber">Open</span>':'<span class="tag t-jade">Posted, '+v+' variance(s)</span>'}</td></tr>`;}).join('')}
  </tbody></table>${rows.length?'':W.emptyState('No cycle counts yet','')}</div></div>`;
};
W.openCount = id => {
  const c = W.COUNTS.find(x=>x.id===id); const editable = c.status==='OPEN' && W.can('count.manage');
  showDrawer(`${esc(W.whName(c.wh))} · ${fmtD(c.date)}`, c.code, `<div class="card"><div class="card-header"><div><h3>Count sheet — ${esc(c.note)}</h3><p>Counted by ${esc(c.by)}</p></div></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>System</th><th>Counted</th><th>Variance</th></tr></thead><tbody>${c.lines.map((l,i)=>{const v=l.cnt===null?null:l.cnt-l.sys;return `<tr><td>${esc(W.item(l.itemId).name)}</td><td class="muted">${nf(l.sys)}</td><td>${editable?`<input type="number" min="0" value="${l.cnt===null?'':l.cnt}" data-cnt="${i}" style="width:90px">`:(l.cnt===null?'—':nf(l.cnt))}</td><td class="${v?'danger':'muted'}">${v===null?'—':v>0?'+'+v:v}</td></tr>`;}).join('')}</tbody></table></div></div>
  ${editable ? `<div class="note warn" style="margin-top:14px">Posting the count writes an ADJ movement for every line that differs.</div><button class="primary-btn compact" style="margin-top:12px" onclick="W.postCount('${c.id}')">Post count and correct stock</button>` : ''}`);
};
W.postCount = id => {
  const c = W.COUNTS.find(x=>x.id===id);
  document.querySelectorAll('[data-cnt]').forEach(inp=>{const i=+inp.dataset.cnt;c.lines[i].cnt=inp.value===''?null:Math.max(0,+inp.value);});
  if (c.lines.some(l=>l.cnt===null)) { toast('Every line needs a physical count before posting'); return; }
  let n=0; const now=new Date().toISOString();
  c.lines.forEach(l=>{const it=W.item(l.itemId); if(!it||l.cnt===l.sys) return; it.qty=l.cnt; n++;
    W.MOVEMENTS.unshift({id:W.uid('MV'),itemId:it.id,type:'ADJ',qty:Math.abs(l.cnt-l.sys),at:now,bal:it.qty,ref:c.code,dept:'Logistics & Warehouse',by:activeUser.name,note:'Cycle count variance: system '+l.sys+', counted '+l.cnt});});
  c.status='POSTED'; c.by=activeUser.name; audit('Posted cycle count '+c.code,'count',n+' correction(s)'); closeDrawer(); state.tab='counts'; switchView('inventory'); toast(c.code+' posted — '+n+' correction(s)');
};
W.openNewCount = () => {
  showModal(`<p class="eyebrow blue">Cycle counts</p><h3>Open a count</h3><form id="cc-form" class="form-grid">
  <label>Store<select name="wh">${W.WAREHOUSES.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select></label>
  <label>Scope<input name="note" placeholder="e.g. Aisle A — food stock"></label>
  <label class="full">Items to count<select name="items" multiple size="8" style="height:auto">${W.ITEMS.map(i=>`<option value="${i.id}">${esc(i.code)} — ${esc(i.name)}</option>`).join('')}</select></label>
  <button class="primary-btn full" type="submit">Open count</button></form>`);
  $('cc-form').onsubmit = e => { e.preventDefault(); const sel = Array.from(e.target.items.selectedOptions).map(o=>o.value); if(!sel.length){toast('Select at least one item to count');return;}
    const code='CC-2026-'+String(W.counters.cc++).padStart(2,'0');
    W.COUNTS.unshift({id:code,code,date:new Date().toISOString(),wh:e.target.wh.value,by:activeUser.name,status:'OPEN',note:e.target.note.value.trim()||'Ad hoc count',lines:sel.map(id=>({itemId:id,sys:W.item(id).qty,cnt:null}))});
    audit('Opened cycle count '+code,'count',sel.length+' lines'); closeModal(); state.tab='counts'; switchView('inventory'); toast(code+' opened'); };
};

/* ============================================================ RECEIVING (WH-SOP-02) */
W.renderReceiving = () => {
  const rows = W.RECEIPTS.slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const abn = rows.filter(r=>r.abnormal).length, held = rows.filter(r=>r.status==='HELD').length;
  $('view').innerHTML = `${railHTML(W.GRN_STEPS,-1,false)}<div class="muted small" style="margin:8px 0 16px">WH-SOP-02 · Handling container and cargo abnormalities. Steps 03–07 only open when an abnormality is recorded at inspection.</div>
  <div class="grid kpi-grid" style="margin-bottom:20px">
  ${W.kpi('Containers logged', rows.length, 'All receipts')}
  ${W.kpi('With abnormalities', abn, rows.length?Math.round(abn/rows.length*100)+'% of receipts':'—', abn?'warn':'good')}
  ${W.kpi('Currently held', held, 'Not yet cleared to stock', held?'bad':'good')}
  ${W.kpi('Open claims', rows.filter(r=>r.claim&&r.claim.open).length, 'Awaiting settlement')}
  </div>
  <div class="card"><div class="card-header"><div><h3>Inbound receipts</h3></div>${W.can('grn.create')?`<button class="primary-btn compact" onclick="W.openNewGRN()">+ Log a receipt</button>`:''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Container / seal</th><th>Origin</th><th>Cargo</th><th>Declared</th><th>Received</th><th>Status</th></tr></thead><tbody>
  ${rows.map(g=>{const dec=g.lines.reduce((s,l)=>s+l.dec,0),rec=g.lines.reduce((s,l)=>s+l.rec,0);
    return `<tr onclick="W.openGRN('${g.id}')" style="cursor:pointer"><td><span class="tag t-blue">${esc(g.code)}</span><br><small class="muted">${fmtD(g.date)}</small></td><td class="small">${esc(g.containerNo)}<br><span class="${g.sealMatch?'muted':'danger'}">Seal ${esc(g.sealNo)} ${g.sealMatch?'✓':'✗ mismatch'}</span></td><td class="small">${esc(g.origin)}</td><td class="small">${g.lines.map(l=>esc(W.item(l.itemId).name)).join('<br>')}</td><td>${nf(dec)}</td><td class="${rec<dec?'danger':'muted'}">${nf(rec)}</td><td>${g.status==='POSTED'?'<span class="tag t-jade">Posted to stock</span>':'<span class="tag t-rust">Held</span>'}</td></tr>`;}).join('')}
  </tbody></table>${rows.length?'':W.emptyState('No receipts logged','')}</div></div>`;
};
W.openGRN = id => {
  const g = W.RECEIPTS.find(x=>x.id===id); const dec=g.lines.reduce((s,l)=>s+l.dec,0), rec=g.lines.reduce((s,l)=>s+l.rec,0);
  const docs = W.CLAIM_DOCS.map((d,i)=>`<label class="check"><input type="checkbox" ${g.claim.docs.includes(d)?'checked':''} data-doc="${i}" ${g.status==='POSTED'?'disabled':''}><span>${esc(d)}</span></label>`).join('');
  showDrawer(`${esc(g.origin)} · ${esc(W.whName(g.wh))}`, g.code, `
    ${g.abnormal ? railHTML(W.GRN_STEPS, g.sopStage-1, false) : railHTML(W.GRN_STEPS.slice(0,2), 2, false)+`<div class="muted small" style="margin-top:6px">Steps 03–07 were not triggered — no abnormality was found at inspection.</div>`}
    <div class="note ${g.abnormal?'bad':''}" style="margin:14px 0">${g.abnormal ? `<b>Abnormality recorded.</b> ${g.abnormalTypes.map(esc).join(' · ')}. The container was not collected until HQ, the shipping line, the surveyor and the insurer had been notified.` : `<b>Clean receipt.</b> Seal intact and matching, no structural damage, count agrees with the packing list.`}</div>
    <div class="card"><div class="card-header"><h3>Container record</h3></div><div class="card-body form-grid">
      <div><p class="eyebrow blue">Container number</p><div>${esc(g.containerNo)}</div></div>
      <div><p class="eyebrow blue">Seal number</p><div class="${g.sealMatch?'':'danger'}">${esc(g.sealNo)} — ${g.sealMatch?'matches documents':'does not match documents'}</div></div>
      <div><p class="eyebrow blue">Bill of lading</p><div>${esc(g.bl)}</div></div>
      <div><p class="eyebrow blue">Weighbridge</p><div>${esc(g.weighbridge||'not weighed')}</div></div>
      <div><p class="eyebrow blue">Supplier</p><div>${esc(g.supplier)}</div></div>
      <div><p class="eyebrow blue">Received into</p><div>${esc(W.whName(g.wh))}</div></div></div></div>
    <div class="card" style="margin-top:14px"><div class="card-header"><div><h3>Cargo count</h3></div><span class="tag t-${rec<dec?'rust':'jade'}" style="margin-right:16px">${rec<dec?'Shortage '+nf(dec-rec):'Count agrees'}</span></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Declared</th><th>Counted</th><th>Variance</th></tr></thead><tbody>${g.lines.map(l=>`<tr><td>${esc(W.item(l.itemId).name)}</td><td>${nf(l.dec)}</td><td>${nf(l.rec)}</td><td class="${l.rec<l.dec?'danger':'muted'}">${l.rec-l.dec===0?'0':nf(l.rec-l.dec)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card" style="margin-top:14px"><div class="card-header"><h3>Evidence held (step 02)</h3></div><div class="card-body">
      <label class="check"><input type="checkbox" ${g.evidence.photos?'checked':''} disabled><span>Photographs of seal, exterior and cargo condition</span></label>
      <label class="check"><input type="checkbox" ${g.evidence.video?'checked':''} disabled><span>One continuous video — top, bottom, all four sides, every abnormality in close-up</span></label>
      <label class="check"><input type="checkbox" ${g.evidence.irregularity?'checked':''} disabled><span>Irregularity report obtained from the transport unit on site</span></label></div></div>
    ${g.abnormal ? `<div class="card" style="margin-top:14px"><div class="card-header"><div><h3>Survey &amp; claim</h3></div>${g.claim.open?'<span class="tag t-amber" style="margin-right:16px">Claim open</span>':'<span class="tag t-grey" style="margin-right:16px">No claim</span>'}</div><div class="card-body">
      <p class="eyebrow blue">Third-party surveyor</p><div style="margin-bottom:10px">${esc(g.surveyor||'not yet appointed')}</div>
      <p class="eyebrow blue">Documents required for the claim</p>${docs}
      ${g.status!=='POSTED' && W.can('grn.post') ? `<div style="margin-top:14px;display:flex;gap:8px"><button class="primary-btn compact" onclick="W.postGRN('${g.id}')">Clear and post sound cargo to stock</button><button class="action-btn" onclick="W.saveGRNDocs('${g.id}')">Save document checklist</button></div>` : ''}
    </div></div>` : ''}
    <div class="card" style="margin-top:14px"><div class="card-header"><h3>Procedure log</h3></div><div class="card-body">${timelineHTML(g.history.map(h=>({...h,at:fmtDT(h.at)})))}</div></div>`);
};
W.postGRN = id => { const g=W.RECEIPTS.find(x=>x.id===id); const now=new Date().toISOString();
  g.lines.forEach(l=>{const it=W.item(l.itemId); if(!it||l.rec<=0) return; it.qty+=l.rec; W.MOVEMENTS.unshift({id:W.uid('MV'),itemId:it.id,type:'IN',qty:l.rec,at:now,bal:it.qty,ref:g.code,dept:'—',by:activeUser.name,note:'Container '+g.containerNo});});
  g.status='POSTED'; g.sopStage=7; g.history.push({action:'Sound cargo cleared and posted to stock after survey', by:activeUser.name, at:now});
  audit('Posted receipt '+g.code+' to stock','receipt',''); closeDrawer(); switchView('receiving'); toast(g.code+' posted to stock'); };
W.saveGRNDocs = id => { const g=W.RECEIPTS.find(x=>x.id===id); g.claim.docs = Array.from(document.querySelectorAll('[data-doc]')).filter(c=>c.checked).map(c=>W.CLAIM_DOCS[+c.dataset.doc]); g.claim.loa = g.claim.docs.includes(W.CLAIM_DOCS[0]);
  audit('Updated claim documents for '+g.code,'receipt',g.claim.docs.length+' of 7 held'); toast('Document checklist saved'); };
W.openNewGRN = () => {
  const opts = W.ITEMS.map(i=>`<option value="${i.id}">${esc(i.code)} — ${esc(i.name)}</option>`).join('');
  showModal(`<p class="eyebrow blue">Receiving · WH-SOP-02</p><h3>Log an inbound receipt</h3>
  <div class="note" style="margin:10px 0 14px">Inspect the seal, exterior and cargo condition <b>before</b> collecting. If anything is abnormal, do not pick up the container.</div>
  <form id="grn-form" class="form-grid">
  <label>Container number<input name="cont" required></label><label>Seal number<input name="seal" required></label>
  <label>Bill of lading<input name="bl"></label><label>Supplier<input name="sup" value="Tzu Chi HQ, Taiwan"></label>
  <label>Receive into<select name="wh">${W.WAREHOUSES.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select></label>
  <label>Seal verification<select name="sealmatch"><option value="1">Seal intact, matches documents</option><option value="0">Seal broken or mismatch</option></select></label>
  <label>Item<select name="item">${opts}</select></label><label>Declared qty<input name="dec" type="number" min="1" value="100"></label>
  <label class="full">Counted qty<input name="rec" type="number" min="0" value="100"></label>
  <label class="full">Abnormalities (leave empty for a clean receipt)</label>
  <div class="full" style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px">${W.ABNORMALITIES.map(a=>`<label class="check"><input type="checkbox" name="abn" value="${esc(a)}"><span>${esc(a)}</span></label>`).join('')}</div>
  <button class="primary-btn full" type="submit">Log receipt</button></form>`);
  $('grn-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target);
    const abn = f.getAll('abn'); const sealMatch = f.get('sealmatch')==='1'; if(!sealMatch && !abn.includes('Seal number mismatch')) abn.push('Seal number mismatch');
    const dec=+f.get('dec')||0, rec=+f.get('rec')||0; if (rec<dec && !abn.includes('Shortage on count')) abn.push('Shortage on count');
    const abnormal = abn.length>0; const code='GRN-2026-'+String(W.counters.grn++).padStart(3,'0'); const now=new Date().toISOString();
    const g = { id:code, code, date:now, supplier:f.get('sup').trim(), origin:'Kaohsiung — Beira', containerNo:f.get('cont').trim(), sealNo:f.get('seal').trim(), sealMatch,
      bl:f.get('bl').trim(), weighbridge:'', wh:f.get('wh'), lines:[{itemId:f.get('item'),dec,rec}], abnormal, abnormalTypes:abn,
      evidence:{photos:true,video:true,irregularity:abnormal}, sopStage:abnormal?3:7, status:abnormal?'HELD':'POSTED', surveyor:'', claim:{open:abnormal,docs:[],loa:false},
      history:[{action:abnormal?'Abnormality found on pre-pickup inspection — container not collected':'Inspection completed — seal intact, no abnormality', by:activeUser.name, at:now}] };
    if (abnormal) g.history.push({action:'HQ, shipping line, third-party surveyor and insurer notified with photo and video evidence', by:activeUser.name, at:now});
    else { const it=W.item(f.get('item')); it.qty+=rec; W.MOVEMENTS.unshift({id:W.uid('MV'),itemId:it.id,type:'IN',qty:rec,at:now,bal:it.qty,ref:code,dept:'—',by:activeUser.name,note:'Container '+g.containerNo}); g.history.push({action:'Cargo counted and posted to stock', by:activeUser.name, at:now}); }
    W.RECEIPTS.unshift(g); audit('Logged receipt '+code,'receipt', abnormal?'Abnormal — held: '+abn.join(', '):'Clean receipt posted to stock');
    closeModal(); switchView('receiving'); toast(abnormal ? code+' held — WH-SOP-02 notification steps opened' : code+' posted to stock'); };
};

/* ============================================================ REQUISITIONS (WH-SOP-01) */
W.renderRequisitions = () => {
  const isCoord = activeUser.role==='coordinator';
  let rows = isCoord ? W.REQS.filter(r=>r.requester===activeUser.name) : W.REQS.slice();
  rows.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const counts = {}; Object.keys(W.STATUS_META).forEach(s=>counts[s]=W.REQS.filter(r=>r.status===s).length);
  $('view').innerHTML = `${railHTML(W.REQ_STEPS,-1,false)}<div class="muted small" style="margin:8px 0 16px">WH-SOP-01 · a requisition passes every one of these five steps, and nothing leaves the store until step 04 is signed.</div>
  <div class="grid kpi-grid" style="margin-bottom:20px">
  ${W.kpi('Awaiting warehouse', counts.SUBMITTED, 'Step 02 verification', counts.SUBMITTED?'warn':'')}
  ${W.kpi('Awaiting authorisation', counts.VERIFIED, 'Step 03 sign-off', counts.VERIFIED?'warn':'')}
  ${W.kpi('Ready to release', counts.AUTHORIZED, 'Step 04 issue', counts.AUTHORIZED?'good':'')}
  ${W.kpi('Released', counts.RELEASED, 'Step 05 recorded', 'good')}
  </div>
  <div class="card"><div class="card-header"><div><h3>${isCoord?'My Requisitions':'Requisitions'}</h3><p>${rows.length} records for this role</p></div>${W.can('req.create')||isCoord?`<button class="primary-btn compact" onclick="W.openNewReq()">+ New requisition</button>`:''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Purpose</th><th>Department</th><th>Value (MZN)</th><th>Needed by</th><th>Status</th></tr></thead><tbody>
  ${rows.map(r=>`<tr onclick="W.openReq('${r.id}')" style="cursor:pointer"><td><span class="tag t-blue">${esc(r.code)}</span><br><small class="muted">${fmtD(r.createdAt)}</small></td><td><strong style="max-width:260px;display:inline-block">${esc(r.purpose)}</strong><br><small class="muted">${esc(r.project)}</small></td><td class="small">${esc(r.dept)}</td><td>${r.value.toLocaleString()}${r.value>W.THRESHOLD?' <span class="tag t-sand">high value</span>':''}</td><td class="small">${fmtD(r.neededBy)}${r.priority==='High'||r.priority==='Urgent'?' <span class="tag t-rust">'+esc(r.priority)+'</span>':''}</td><td>${W.statusTag(r.status)}</td></tr>`).join('')}
  </tbody></table>${rows.length?'':W.emptyState('No requisitions here','Raise one to start the WH-SOP-01 workflow.')}</div></div>`;
};
W.openReq = id => {
  const r = W.REQS.find(x=>x.id===id); const stopped = r.status==='REJECTED'; const cur = stopped ? 1 : W.STATUS_META[r.status].step;
  const editable = r.status==='SUBMITTED' && W.can('req.verify');
  const lines = r.lines.map((l,idx) => { const it=W.item(l.itemId); const short = it.qty < (l.appr!=null?l.appr:l.qty);
    return `<tr><td>${esc(it.name)}</td><td>${nf(l.qty)} <small class="muted">${esc(it.unit)}</small></td><td class="${short?'danger':'muted'}">${nf(it.qty)}</td><td>${editable?`<input type="number" min="0" max="${it.qty}" value="${l.appr!=null?l.appr:l.qty}" data-appr="${idx}" style="width:80px">`:`<strong>${nf(l.appr!=null?l.appr:'—')}</strong>`}</td><td class="muted">${l.rel!=null?nf(l.rel):'—'}</td></tr>`; }).join('');
  const acts = [];
  if (r.status==='SUBMITTED' && W.can('req.verify')) { acts.push(`<button class="action-btn success" onclick="W.reqAction('${r.id}','verify')">Approve — stock verified</button>`); acts.push(`<button class="action-btn danger" onclick="W.reqAction('${r.id}','reject')">Reject</button>`); }
  if (r.status==='VERIFIED' && W.canAuthorize(r)) { acts.push(`<button class="action-btn success" onclick="W.reqAction('${r.id}','authorize')">Authorise release</button>`); acts.push(`<button class="action-btn danger" onclick="W.reqAction('${r.id}','reject')">Reject</button>`); }
  if (r.status==='VERIFIED' && !W.canAuthorize(r) && r.value>W.THRESHOLD && activeUser.role==='logistics') acts.push(`<div class="note warn">This requisition is ${r.value.toLocaleString()} MZN — above the ${W.THRESHOLD.toLocaleString()} MZN threshold, so Top Management must authorise it.</div>`);
  if (r.status==='AUTHORIZED' && W.can('req.release')) acts.push(`<button class="action-btn primary" onclick="W.reqAction('${r.id}','release')">Release from store</button>`);
  showDrawer(`${esc(r.dept)} · ${esc(r.project)}`, r.code, `
    ${railHTML(W.REQ_STEPS, cur, stopped)}
    <div class="card" style="margin-top:14px"><div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-weight:700;font-size:15px">${esc(r.purpose)}</div><div class="muted small" style="margin-top:4px">Raised by ${esc(r.requester)} · ${fmtDT(r.createdAt)}</div></div>${W.statusTag(r.status)}</div>
      <div style="display:flex;gap:26px;margin-top:14px"><div><p class="eyebrow blue">Needed by</p><div>${fmtD(r.neededBy)}</div></div><div><p class="eyebrow blue">Priority</p><div>${esc(r.priority)}</div></div><div><p class="eyebrow blue">Value</p><div>${r.value.toLocaleString()} MZN</div></div></div>
    </div></div>
    <div class="card" style="margin-top:14px"><div class="card-header"><h3>Requested items</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Requested</th><th>On hand</th><th>Approved</th><th>Released</th></tr></thead><tbody>${lines}</tbody></table></div></div>
    ${acts.length ? `<div class="card" style="margin-top:14px"><div class="card-body"><label>Note (recorded against your decision)<input id="req-note" placeholder="${r.status==='SUBMITTED'?'e.g. Stock confirmed on shelf':'e.g. Within approved project budget'}"></label><div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${acts.join('')}</div></div></div>`
      : `<div class="note" style="margin-top:14px">${stopped ? 'This requisition is closed.' : 'No action is open to your role at this step.'}</div>`}
    <div class="card" style="margin-top:14px"><div class="card-header"><h3>Approval trail</h3></div><div class="card-body">${timelineHTML(r.history.map(h=>({action:h.action,by:h.by,at:fmtDT(h.at),note:h.note,tone:/reject/i.test(h.action)?'no':''})))}</div></div>`);
};
W.collectAppr = r => { document.querySelectorAll('[data-appr]').forEach(inp=>{const i=+inp.dataset.appr; r.lines[i].appr = Math.max(0, Math.min(W.item(r.lines[i].itemId).qty, +inp.value||0));}); };
W.reqAction = (id,kind) => {
  const r = W.REQS.find(x=>x.id===id); const note = ($('req-note')&&$('req-note').value.trim())||''; const now=new Date().toISOString();
  if (kind==='verify') { W.collectAppr(r); if (r.lines.every(l=>(l.appr||0)===0)) { toast('Set at least one approved quantity above zero'); return; }
    r.value = W.lineValue(r.lines); r.status='VERIFIED'; r.history.push({action:'Stock verified — approved', by:activeUser.name, at:now, note}); audit('Verified requisition '+r.code,'requisition',note); toast(r.code+' approved — sent for authorisation'); }
  if (kind==='authorize') { r.status='AUTHORIZED'; r.history.push({action:'Authorised', by:activeUser.name, at:now, note}); audit('Authorised requisition '+r.code,'requisition',note); toast(r.code+' authorised — ready to release'); }
  if (kind==='reject') { if(!note){toast('A rejection needs a reason');return;} r.status='REJECTED'; r.history.push({action:'Rejected', by:activeUser.name, at:now, note}); audit('Rejected requisition '+r.code,'requisition',note); toast(r.code+' rejected'); }
  if (kind==='release') { let posted=0; r.lines.forEach(l=>{const it=W.item(l.itemId); if(!it) return; const q=Math.min(it.qty, l.appr!=null?l.appr:l.qty); if(q<=0) return; it.qty-=q; l.rel=q; posted++;
      W.MOVEMENTS.unshift({id:W.uid('MV'),itemId:it.id,type:'OUT',qty:q,at:now,bal:it.qty,ref:r.code,dept:r.dept,by:activeUser.name,note:r.purpose});});
    if(!posted){toast('Nothing to release — approved quantities are zero');return;} r.status='RELEASED';
    r.history.push({action:'Released from store', by:activeUser.name, at:now, note:note||'Collected by requesting department'});
    r.history.push({action:'Recorded in stock ledger', by:'System', at:now, note:posted+' movement(s) posted automatically'});
    audit('Released requisition '+r.code,'requisition',posted+' lines posted to ledger'); toast(r.code+' released and posted to the ledger'); }
  closeDrawer(); switchView('requisitions');
};
W.openNewReq = () => {
  const opts = W.ITEMS.map(i=>`<option value="${i.id}">${esc(i.code)} — ${esc(i.name)} (${nf(i.qty)} ${esc(i.unit)} on hand)</option>`).join('');
  showModal(`<p class="eyebrow blue">Requisitions · WH-SOP-01</p><h3>Submit a new requisition</h3><form id="req-form" class="form-grid">
  <label>Project / programme<input name="proj" placeholder="e.g. 2026 Flood Relief"></label><label>Needed by<input name="needed" type="date" value="${W.daysAhead(7)}"></label>
  <label class="full">Purpose — what the goods are for, and where they are going<textarea name="purpose" rows="2" required></textarea></label>
  <label>Priority<select name="prio"><option>Normal</option><option>High</option><option>Urgent</option></select></label>
  <label>Item<select name="item">${opts}</select></label>
  <label class="full">Quantity<input name="qty" type="number" min="1" value="1"></label>
  <button class="primary-btn full" type="submit">Submit requisition</button></form>`);
  $('req-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target); const item=W.item(f.get('item')); const code='REQ-'+(W.counters.req++);
    const lines=[{itemId:item.id, qty:+f.get('qty')||1, appr:+f.get('qty')||1}]; const now=new Date().toISOString();
    W.REQS.unshift({ id:code, code, dept:activeUser.dept, requester:activeUser.name, purpose:f.get('purpose').trim(), project:f.get('proj').trim()||'General',
      neededBy:f.get('needed'), priority:f.get('prio'), lines, status:'SUBMITTED', createdAt:now, value:W.lineValue(lines),
      history:[{action:'Requisition raised', by:activeUser.name, at:now, note:f.get('purpose').trim()}] });
    audit('Raised requisition '+code,'requisition',f.get('purpose').trim()); closeModal(); switchView('requisitions'); toast(code+' submitted for warehouse verification'); };
};

/* ============================================================ MOVEMENTS LEDGER */
W.renderMovements = () => {
  let rows = W.MOVEMENTS.slice().sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,250);
  const outs = W.MOVEMENTS.filter(m=>m.type==='OUT'), ins = W.MOVEMENTS.filter(m=>m.type==='IN');
  $('view').innerHTML = `<div class="grid kpi-grid" style="margin-bottom:20px">
  ${W.kpi('Total movements', nf(W.MOVEMENTS.length), 'All time')}
  ${W.kpi('Units released', nf(outs.reduce((s,m)=>s+m.qty,0)), outs.length+' issue transactions')}
  ${W.kpi('Units received', nf(ins.reduce((s,m)=>s+m.qty,0)), ins.length+' receipt transactions')}
  ${W.kpi('Traceability', '100%', 'Every movement carries a named signatory', 'good')}
  </div>
  <div class="card"><div class="card-header"><h3>Stock movement ledger</h3></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Qty</th><th>Balance</th><th>Reference</th><th>Department</th><th>By</th></tr></thead><tbody>
  ${rows.map(m=>`<tr><td class="small">${fmtDT(m.at)}</td><td><span class="tag t-blue">${esc(m.itemId)}</span> <small>${esc(W.item(m.itemId).name)}</small></td><td>${W.movTag(m.type)}</td><td><strong>${m.type==='OUT'?'−':'+'}${nf(m.qty)}</strong></td><td class="muted">${nf(m.bal)}</td><td class="small">${esc(m.ref)}</td><td class="small">${esc(m.dept||'—')}</td><td class="small">${esc(m.by||'—')}</td></tr>`).join('')}
  </tbody></table></div></div>`;
};

/* ============================================================ TRANSFERS & DISPATCH */
W.renderTransfers = () => {
  const tb = state.tab || 'transfers';
  const tabs = `<div class="subtabs"><button class="subtab ${tb==='transfers'?'active':''}" onclick="state.tab='transfers';switchView('transfers')">Inter-warehouse transfers</button><button class="subtab ${tb==='dispatch'?'active':''}" onclick="state.tab='dispatch';switchView('transfers')">Dispatch &amp; collection</button></div>`;
  if (tb==='dispatch') { $('view').innerHTML = tabs + W.dispatchTabHTML(); return; }
  const rows = W.TRANSFERS.slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  $('view').innerHTML = tabs + `<div class="card"><div class="card-header"><div><h3>Inter-warehouse transfers</h3></div>${W.can('transfer.manage')?`<button class="primary-btn compact" onclick="W.openNewTransfer()">+ Raise a transfer</button>`:''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Date</th><th>From → to</th><th>Cargo</th><th>Status</th><th></th></tr></thead><tbody>
  ${rows.map(t=>`<tr><td onclick="W.openTransfer('${t.id}')" style="cursor:pointer"><span class="tag t-blue">${esc(t.code)}</span></td><td class="small">${fmtD(t.date)}</td><td class="small">${esc(W.whName(t.from))} → ${esc(W.whName(t.to))}</td><td class="small">${t.lines.map(l=>nf(l.qty)+' × '+esc(W.item(l.itemId).name)).join('<br>')}</td><td>${W.trfStatus[t.status].c==='t-amber'?'<span class="tag t-amber">'+W.trfStatus[t.status].l+'</span>':t.status==='IN_TRANSIT'?'<span class="tag t-blue">'+W.trfStatus[t.status].l+'</span>':'<span class="tag t-jade">'+W.trfStatus[t.status].l+'</span>'}</td><td>${t.status==='REQUESTED'&&W.can('transfer.manage')?`<button class="action-btn compact" onclick="W.moveTransfer('${t.id}','dispatch')">Dispatch</button>`:t.status==='IN_TRANSIT'&&W.can('transfer.manage')?`<button class="action-btn success" onclick="W.moveTransfer('${t.id}','receive')">Receive</button>`:''}</td></tr>`).join('')}
  </tbody></table>${rows.length?'':W.emptyState('No transfers raised','Move stock between Kura, Maputo and Nhamatanda.')}</div></div>`;
};
W.dispatchTabHTML = () => {
  const awaiting = W.REQS.filter(r=>r.status==='AUTHORIZED');
  const recent = W.REQS.filter(r=>r.status==='RELEASED').slice(0,10);
  return `<div class="card"><div class="card-header"><div><h3>Awaiting collection</h3></div><span class="tag t-${awaiting.length?'blue':'grey'}" style="margin-right:16px">${awaiting.length}</span></div>
  <div class="table-wrap">${awaiting.length ? `<table class="data-table"><thead><tr><th>Reference</th><th>Department</th><th>Goods</th><th>Needed by</th></tr></thead><tbody>${awaiting.map(r=>`<tr onclick="W.openReq('${r.id}')" style="cursor:pointer"><td><span class="tag t-blue">${esc(r.code)}</span></td><td class="small">${esc(r.dept)}</td><td class="small">${r.lines.map(l=>nf(l.appr!=null?l.appr:l.qty)+' × '+esc(W.item(l.itemId).name)).join('<br>')}</td><td class="small">${fmtD(r.neededBy)}</td></tr>`).join('')}</tbody></table>` : W.emptyState('Nothing awaiting collection','')}</div></div>
  <div class="card" style="margin-top:16px"><div class="card-header"><h3>Recent dispatches</h3></div><div class="table-wrap">${recent.length ? `<table class="data-table"><thead><tr><th>Reference</th><th>Department</th><th>Goods</th></tr></thead><tbody>${recent.map(r=>`<tr onclick="W.openReq('${r.id}')" style="cursor:pointer"><td><span class="tag t-blue">${esc(r.code)}</span></td><td class="small">${esc(r.dept)}</td><td class="small">${r.lines.map(l=>nf(l.rel!=null?l.rel:l.appr)+' × '+esc(W.item(l.itemId).name)).join('<br>')}</td></tr>`).join('')}</tbody></table>` : W.emptyState('No dispatches yet','')}</div></div>`;
};
W.openTransfer = id => { const t=W.TRANSFERS.find(x=>x.id===id);
  showDrawer(`${esc(W.whName(t.from))} → ${esc(W.whName(t.to))}`, t.code, `<div class="card"><div class="card-body"><div style="display:flex;gap:22px"><div><p class="eyebrow blue">Vehicle</p><div>${esc(t.vehicle)}</div></div><div><p class="eyebrow blue">Driver</p><div>${esc(t.driver)}</div></div></div></div></div>
  <div class="card" style="margin-top:14px"><div class="card-header"><h3>Cargo</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Qty</th></tr></thead><tbody>${t.lines.map(l=>`<tr><td>${esc(W.item(l.itemId).name)}</td><td>${nf(l.qty)}</td></tr>`).join('')}</tbody></table></div></div>
  ${W.can('transfer.manage')&&t.status!=='RECEIVED' ? `<div style="margin-top:14px">${t.status==='REQUESTED'?`<button class="primary-btn compact" onclick="W.moveTransfer('${t.id}','dispatch')">Dispatch from ${esc(W.whName(t.from))}</button>`:`<button class="action-btn success" onclick="W.moveTransfer('${t.id}','receive')">Receive at ${esc(W.whName(t.to))}</button>`}</div>`:''}
  <div class="card" style="margin-top:14px"><div class="card-header"><h3>Movement log</h3></div><div class="card-body">${timelineHTML(t.history.map(h=>({...h,at:fmtDT(h.at)})))}</div></div>`);
};
W.moveTransfer = (id,kind) => { const t=W.TRANSFERS.find(x=>x.id===id); const now=new Date().toISOString();
  t.lines.forEach(l=>{const it=W.item(l.itemId); if(!it) return; if(kind==='dispatch') it.qty-=Math.min(it.qty,l.qty); else { it.qty+=l.qty; it.wh=t.to; }
    W.MOVEMENTS.unshift({id:W.uid('MV'),itemId:it.id,type:kind==='dispatch'?'OUT':'IN',qty:l.qty,at:now,bal:it.qty,ref:t.code,dept:'Logistics & Warehouse',by:activeUser.name,note:kind==='dispatch'?'Transfer dispatched to '+W.whName(t.to):'Transfer received from '+W.whName(t.from)});});
  t.status = kind==='dispatch'?'IN_TRANSIT':'RECEIVED';
  t.history.push({action:kind==='dispatch'?'Dispatched from '+W.whName(t.from):'Received at '+W.whName(t.to), by:activeUser.name, at:now});
  audit((kind==='dispatch'?'Dispatched':'Received')+' transfer '+t.code,'transfer',''); closeDrawer(); switchView('transfers'); toast(t.code+(kind==='dispatch'?' dispatched':' received')); };
W.openNewTransfer = () => {
  showModal(`<p class="eyebrow blue">Transfers &amp; Dispatch</p><h3>Raise a transfer</h3><form id="tf-form" class="form-grid">
  <label>From<select name="from">${W.WAREHOUSES.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select></label>
  <label>To<select name="to">${W.WAREHOUSES.map((w,i)=>`<option value="${w.id}" ${i===2?'selected':''}>${esc(w.name)}</option>`).join('')}</select></label>
  <label>Vehicle<input name="veh" placeholder="e.g. MZ-BEI-0042"></label><label>Driver<input name="drv"></label>
  <label>Item<select name="item">${W.ITEMS.filter(i=>i.qty>0).map(i=>`<option value="${i.id}">${esc(i.code)} — ${esc(i.name)} (${nf(i.qty)})</option>`).join('')}</select></label>
  <label>Quantity<input name="qty" type="number" min="1" value="1"></label>
  <button class="primary-btn full" type="submit">Raise transfer</button></form>`);
  $('tf-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target); const from=f.get('from'),to=f.get('to');
    if (from===to) { toast('Origin and destination must differ'); return; }
    const itemId=f.get('item'), qty=+f.get('qty')||0; if (qty<=0 || qty>W.item(itemId).qty) { toast('Quantity must be between 1 and '+nf(W.item(itemId).qty)); return; }
    const code='TRF-2026-'+(W.counters.trf++);
    W.TRANSFERS.unshift({id:code,code,date:new Date().toISOString(),from,to,status:'REQUESTED',vehicle:f.get('veh').trim()||'—',driver:f.get('drv').trim()||'—',raisedBy:activeUser.name,
      lines:[{itemId,qty}], history:[{action:'Transfer raised', by:activeUser.name, at:new Date().toISOString()}]});
    audit('Raised transfer '+code,'transfer',W.whName(from)+' → '+W.whName(to)); closeModal(); switchView('transfers'); toast(code+' raised'); };
};

/* ============================================================ WAREHOUSES (map + bin occupancy) */
W.renderWarehouses = () => {
  $('view').innerHTML = `<div class="grid three-col">
  ${W.WAREHOUSES.map(w=>{const st=W.whStats(w.id); const eq=W.EQUIPMENT.filter(e=>e.wh===w.id).length;
    return `<div class="card"><div class="card-body"><p class="eyebrow blue">${esc(w.id)}</p><h3 style="font-family:Manrope;font-size:16px;margin:4px 0 2px">${esc(w.name)}</h3><div class="muted small">${esc(w.loc)}</div>
    <div style="display:flex;gap:20px;margin-top:14px"><div><p class="eyebrow blue">Item codes</p><div style="font-family:var(--mono);font-size:20px;font-weight:600">${st.count}</div></div><div><p class="eyebrow blue">Units</p><div style="font-family:var(--mono);font-size:20px;font-weight:600">${nf(W.ITEMS.filter(i=>i.wh===w.id).reduce((a,i)=>a+i.qty,0))}</div></div></div>
    <div class="small" style="margin-top:10px">Value <strong>${money(st.value)}</strong> · Assets <strong>${eq}</strong></div>
    ${st.low ? `<div class="note warn" style="margin-top:10px">${st.low} item(s) below reorder</div>` : `<div class="note" style="margin-top:10px">All items above reorder level</div>`}
    </div></div>`;}).join('')}
  </div>
  <div class="card" style="margin-top:18px"><div class="card-header"><h3>Store locations</h3></div>${W.facilityMapHTML(360)}</div>
  <div class="card" style="margin-top:18px"><div class="card-header"><h3>Stock by store and category</h3></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Category</th>${W.WAREHOUSES.map(w=>`<th>${esc(w.name)}</th>`).join('')}<th>Total</th></tr></thead><tbody>
  ${W.CATS.map(c=>{const cells=W.WAREHOUSES.map(w=>W.ITEMS.filter(i=>i.cat===c.id&&i.wh===w.id).reduce((a,i)=>a+i.qty,0)); if(!cells.some(v=>v)) return ''; return `<tr><td>${esc(c.name)}</td>${cells.map(v=>`<td class="${v?'':'muted'}">${v?nf(v):'·'}</td>`).join('')}<td><strong>${nf(cells.reduce((a,b)=>a+b,0))}</strong></td></tr>`;}).join('')}
  </tbody></table></div></div>
  <div class="card" style="margin-top:18px"><div class="card-header"><h3>Bin occupancy — items by location</h3></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Store</th><th>Bin</th><th>Item</th><th>On hand</th></tr></thead><tbody>
  ${W.ITEMS.slice().sort((a,b)=>(a.wh+a.loc).localeCompare(b.wh+b.loc)).map(i=>`<tr onclick="W.openItem('${i.id}')" style="cursor:pointer"><td class="small">${esc(W.whName(i.wh))}</td><td class="small">${esc(i.loc)}</td><td><span class="tag t-blue">${esc(i.code)}</span> ${esc(i.name)}</td><td>${nf(i.qty)} <small class="muted">${esc(i.unit)}</small></td></tr>`).join('')}
  </tbody></table></div></div>`;
  W.initFacilityMap();
};

/* ============================================================ STAFF & WORKFORCE */
W.renderStaff = () => {
  const days=[]; for (let i=-3;i<=3;i++){const d=new Date();d.setDate(d.getDate()+i);days.push(d.toISOString().slice(0,10));}
  const m = W.monthLabour(W.today().slice(0,7));
  const certsDue = W.STAFF.flatMap(s=>(s.certs||[]).filter(c=>daysUntil(c.exp)<=60).map(c=>({s,c})));
  $('view').innerHTML = `<div class="grid kpi-grid" style="margin-bottom:20px">
  ${W.kpi('Staff on strength', W.STAFF.length, 'Warehouse roster')}
  ${W.kpi('Labour this month', nf(m.hours), money(m.cost), '', 'hrs')}
  ${W.kpi('Shifts today', W.labourFor(W.today()).n, W.labourFor(W.today()).hours+' hours rostered')}
  ${W.kpi('Certifications due', certsDue.length, 'Expiring within 60 days', certsDue.length?'warn':'good')}
  </div>
  <div class="card"><div class="card-header"><div><h3>Shift roster</h3><p>Three days either side of today</p></div>${W.can('staff.manage')?`<button class="primary-btn compact" onclick="W.openNewShift()">+ Assign a shift</button>`:''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Staff</th>${days.map(d=>`<th style="${d===W.today()?'color:var(--blue)':''}">${new Date(d).toLocaleDateString('en-GB',{weekday:'short',day:'2-digit'})}</th>`).join('')}<th>Hours</th></tr></thead><tbody>
  ${W.STAFF.map(s=>{let tot=0; const cells=days.map(d=>{const sh=W.SHIFTS.find(x=>x.staffId===s.id&&x.date===d); if(sh) tot+=sh.hours; return `<td class="small">${sh?`<div style="font-family:var(--mono);font-size:10px">${esc(sh.slot)}</div><div class="muted" style="font-size:10px">${esc(sh.task)}</div>`:'<span class="muted">·</span>'}</td>`;}).join('');
    return `<tr><td><strong>${esc(s.name)}</strong><br><small class="muted">${esc(s.post)}</small></td>${cells}<td>${tot}</td></tr>`;}).join('')}
  </tbody></table></div></div>
  <div class="card" style="margin-top:18px"><div class="card-header"><h3>Staff and training records</h3></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Post</th><th>Rate / hr</th><th>Certifications</th></tr></thead><tbody>
  ${W.STAFF.map(s=>`<tr><td><strong>${esc(s.name)}</strong></td><td class="small">${esc(s.post)}</td><td>${money(s.rate)}</td><td class="small">${(s.certs||[]).length?s.certs.map(c=>`<span class="tag t-${daysUntil(c.exp)<=60?'amber':'grey'}" style="margin:1px 3px 1px 0">${esc(c.n)} · ${fmtD(c.exp)}</span>`).join(''):'<span class="muted">—</span>'}</td></tr>`).join('')}
  </tbody></table></div></div>`;
};
W.openNewShift = () => {
  showModal(`<p class="eyebrow blue">Staff &amp; shifts</p><h3>Assign a shift</h3><form id="sh-form" class="form-grid">
  <label>Staff<select name="staff">${W.STAFF.map(s=>`<option value="${s.id}">${esc(s.name)} — ${esc(s.post)}</option>`).join('')}</select></label>
  <label>Date<input name="date" type="date" value="${W.today()}"></label>
  <label>Shift<select name="slot"><option value="08:30–17:30|9">08:30–17:30 · full day (9 h)</option><option value="09:00–16:00|7">09:00–16:00 · public hours (7 h)</option></select></label>
  <label>Task<select name="task">${['Receiving','Picking & release','Cycle count','Housekeeping','Loading'].map(t=>`<option>${t}</option>`).join('')}</select></label>
  <button class="primary-btn full" type="submit">Assign shift</button></form>`);
  $('sh-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target); const [slot,hrs]=f.get('slot').split('|'); const staffId=f.get('staff'), date=f.get('date');
    if (W.SHIFTS.find(s=>s.staffId===staffId&&s.date===date)) { toast(W.staffOf(staffId).name+' is already rostered on that date'); return; }
    W.SHIFTS.push({id:W.uid('SH'),date,staffId,slot,hours:+hrs,task:f.get('task')});
    audit('Assigned shift','roster',W.staffOf(staffId).name+' · '+date); closeModal(); switchView('staff'); toast('Shift assigned'); };
};

/* ============================================================ EQUIPMENT & ASSETS */
W.renderEquipment = () => {
  const due = W.EQUIPMENT.filter(e=>daysUntil(e.nextInsp)<=0); const oos = W.EQUIPMENT.filter(e=>e.status==='Out of service'); const spend = W.MAINTENANCE.reduce((a,m)=>a+m.cost,0);
  $('view').innerHTML = `<div class="grid kpi-grid" style="margin-bottom:20px">
  ${W.kpi('Equipment on register', W.EQUIPMENT.length, W.WAREHOUSES.length+' stores')}
  ${W.kpi('Inspections overdue', due.length, 'Must not be used until inspected', due.length?'bad':'good')}
  ${W.kpi('Out of service', oos.length, oos.length?oos.map(e=>e.name).join(', '):'All serviceable', oos.length?'warn':'good')}
  ${W.kpi('Maintenance spend', (spend/1000).toFixed(1)+'k', 'MZN, all records', '', 'MT')}
  </div>
  <div class="card"><div class="card-header"><div><h3>Equipment and vehicle register</h3></div>${W.can('equip.manage')?`<button class="primary-btn compact" onclick="W.openNewMaint()">+ Log inspection or repair</button>`:''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Asset</th><th>Type</th><th>Serial</th><th>Store</th><th>Next due</th><th>Status</th></tr></thead><tbody>
  ${W.EQUIPMENT.map(e=>{const d=daysUntil(e.nextInsp); return `<tr><td><strong>${esc(e.name)}</strong></td><td class="small">${esc(e.type)}</td><td class="small">${esc(e.serial)}</td><td class="small">${esc(W.whName(e.wh))}</td><td class="small ${d<=0?'danger':d<=30?'warning':''}">${fmtD(e.nextInsp)}${d<=0?' · overdue':''}</td><td>${e.status==='Serviceable'?'<span class="tag t-jade">Serviceable</span>':e.status==='Out of service'?'<span class="tag t-rust">Out of service</span>':'<span class="tag t-amber">Inspection due</span>'}</td></tr>`;}).join('')}
  </tbody></table></div></div>
  <div class="card" style="margin-top:18px"><div class="card-header"><h3>Maintenance log</h3></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Asset</th><th>Type</th><th>By</th><th>Cost</th><th>Note</th></tr></thead><tbody>
  ${W.MAINTENANCE.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(m=>`<tr><td class="small">${fmtD(m.date)}</td><td class="small">${esc(W.equipOf(m.equipId).name)}</td><td><span class="tag t-grey">${esc(m.type)}</span></td><td class="small">${esc(m.by)}</td><td>${money(m.cost)}</td><td class="small muted">${esc(m.note)}</td></tr>`).join('')}
  </tbody></table></div></div>`;
};
W.openNewMaint = () => {
  showModal(`<p class="eyebrow blue">Equipment &amp; facility</p><h3>Log inspection or repair</h3><form id="mt-form" class="form-grid">
  <label>Asset<select name="eq">${W.EQUIPMENT.map(e=>`<option value="${e.id}">${esc(e.name)} — ${esc(e.serial)}</option>`).join('')}</select></label>
  <label>Type<select name="type"><option>Inspection</option><option>Service</option><option>Repair</option></select></label>
  <label>Carried out by<input name="by" value="${esc(activeUser.name)}"></label><label>Cost (MT)<input name="cost" type="number" min="0" value="0"></label>
  <label>Resulting status<select name="status"><option>Serviceable</option><option>Inspection due</option><option>Out of service</option></select></label>
  <label>Next inspection<input name="next" type="date" value="${W.daysAhead(90)}"></label>
  <label class="full">Note<textarea name="note" rows="2"></textarea></label>
  <button class="primary-btn full" type="submit">Save record</button></form>`);
  $('mt-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target); const eq=W.equipOf(f.get('eq')); const now=new Date().toISOString();
    W.MAINTENANCE.unshift({id:W.uid('MT'),equipId:eq.id,date:now,type:f.get('type'),by:f.get('by').trim()||activeUser.name,cost:+f.get('cost')||0,note:f.get('note').trim()||'—'});
    Object.assign(W.EQUIPMENT.find(e=>e.id===eq.id),{lastInsp:now,nextInsp:f.get('next'),status:f.get('status')});
    audit('Logged '+f.get('type').toLowerCase()+' on '+eq.name,'equipment',f.get('status')); closeModal(); switchView('equipment'); toast(eq.name+' updated'); };
};

/* ============================================================ BUDGET */
W.renderBudget = () => {
  const period = W.today().slice(0,7); const m = W.monthLabour(period);
  const bud = W.BUDGET.map(b=>b.line==='Warehouse labour'?Object.assign({},b,{actual:m.cost}):b);
  const tb = bud.reduce((a,b)=>a+b.budget,0), ta = bud.reduce((a,b)=>a+b.actual,0);
  $('view').innerHTML = `<div class="grid kpi-grid" style="margin-bottom:20px">
  ${W.kpi('Budget used', tb?Math.round(ta/tb*100)+'%':'—', money(ta)+' of '+money(tb), ta>tb?'bad':ta/tb>0.9?'warn':'good')}
  ${W.kpi('Labour hours', nf(m.hours), money(m.cost)+' this month', '', 'hrs')}
  ${W.kpi('Exceptions open', W.exceptions().length, 'Across all areas', W.exceptions().length?'warn':'good')}
  ${W.kpi('Stock value', (W.ITEMS.reduce((s,i)=>s+i.qty*i.val,0)/1e6).toFixed(2)+'M', 'MZN across all stores')}
  </div>
  <div class="card"><div class="card-header"><div><h3>Operational budget — ${period}</h3><p>Labour actual is computed from the roster</p></div></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Budget line</th><th>Category</th><th>Budget</th><th>Actual</th><th>Variance</th><th style="width:24%">Used</th></tr></thead><tbody>
  ${bud.map(b=>{const v=b.budget-b.actual, pct=b.budget?b.actual/b.budget*100:0;
    return `<tr><td><strong>${esc(b.line)}</strong></td><td class="small">${esc(b.cat)}</td><td>${money(b.budget)}</td><td>${money(b.actual)}</td><td class="${v<0?'danger':'positive'}">${v<0?'−':''}${money(Math.abs(v))}</td><td><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,pct)}%;background:${pct>100?'var(--red)':pct>90?'var(--amber)':'var(--green)'}"></div></div><small class="muted">${Math.round(pct)}%</small></td></tr>`;}).join('')}
  <tr style="background:#f8fafc"><td><strong>Total</strong></td><td></td><td><strong>${money(tb)}</strong></td><td><strong>${money(ta)}</strong></td><td><strong class="${ta>tb?'danger':'positive'}">${ta>tb?'−':''}${money(Math.abs(tb-ta))}</strong></td><td></td></tr>
  </tbody></table></div></div>`;
};

/* ============================================================ DAILY REPORTS */
W.dayFigures = d => { const mv=W.MOVEMENTS.filter(m=>W.onDay(m.at,d)); const raised=W.REQS.filter(r=>W.onDay(r.createdAt,d));
  const acted = step => W.REQS.filter(r=>r.history.some(h=>W.onDay(h.at,d)));
  return { in:mv.filter(m=>m.type==='IN'), out:mv.filter(m=>m.type==='OUT'), adj:mv.filter(m=>m.type==='ADJ'), raised, released:W.REQS.filter(r=>r.status==='RELEASED'&&r.history.some(h=>W.onDay(h.at,d))),
    receipts:W.RECEIPTS.filter(r=>W.onDay(r.date,d)), labour:W.labourFor(d) }; };
W.renderDaily = () => {
  const d = state.filters.day || W.today(); const f = W.dayFigures(d); const x = W.exceptions(); const filed = W.REPORTS.find(r=>r.date===d);
  const unitsOut = f.out.reduce((a,m)=>a+m.qty,0), unitsIn = f.in.reduce((a,m)=>a+m.qty,0);
  $('view').innerHTML = `<div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:16px"><label>Report date<input type="date" value="${d}" onchange="state.filters.day=this.value;switchView('daily')" style="width:auto"></label>${W.can('ops.report')?`<button class="primary-btn compact" onclick="W.fileReport('${d}')">${filed?'Re-file report':"File the day's report"}</button>`:''}</div>
  <div class="card"><div class="card-body"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><p class="eyebrow blue">Tzu Chi Foundation Mozambique · Logistics &amp; Warehouse</p><h3 style="font-family:Manrope;font-size:18px;margin-top:4px">Daily warehouse report — ${fmtD(d)}</h3><div class="muted small" style="margin-top:3px">WH-SOP-01 reporting window 16:00–17:30</div></div>${filed?`<span class="tag t-jade">Filed ${fmtDT(filed.filedAt)}</span>`:`<span class="tag t-amber">Not yet filed</span>`}</div></div></div>
  <div class="grid kpi-grid" style="margin:16px 0">
  ${W.kpi('Units received', nf(unitsIn), f.in.length+' inbound movements')}
  ${W.kpi('Units released', nf(unitsOut), f.out.length+' issue movements')}
  ${W.kpi('Labour', f.labour.hours, f.labour.n+' shifts · '+money(f.labour.cost), '', 'hrs')}
  ${W.kpi('Requisitions raised', f.raised.length, 'Today')}
  </div>
  <div class="card"><div class="card-header"><div><h3>Exceptions requiring attention</h3></div><span class="tag t-${x.length?'amber':'jade'}" style="margin-right:16px">${x.length}</span></div>
  <div class="table-wrap">${x.length ? `<table class="data-table"><thead><tr><th>Severity</th><th>Area</th><th>Exception</th></tr></thead><tbody>${x.map(e=>`<tr><td>${W.sevTag(e.sev)}</td><td class="small">${esc(e.area)}</td><td class="small">${esc(e.what)}</td></tr>`).join('')}</tbody></table>` : W.emptyState('No exceptions','')}</div></div>
  ${W.can('ops.report') ? `<div class="card" style="margin-top:14px"><div class="card-header"><h3>Coordinator's notes</h3></div><div class="card-body"><textarea id="rep-note" rows="3" placeholder="Narrative for the day — decisions taken, matters carried forward">${esc(filed?filed.note:'')}</textarea></div></div>` : ''}
  ${W.REPORTS.length ? `<div class="card" style="margin-top:14px"><div class="card-header"><h3>Filed reports</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Filed</th><th>By</th><th>In</th><th>Out</th><th>Exceptions</th></tr></thead><tbody>${W.REPORTS.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<tr><td>${fmtD(r.date)}</td><td class="small">${fmtDT(r.filedAt)}</td><td class="small">${esc(r.by)}</td><td>${nf(r.unitsIn)}</td><td>${nf(r.unitsOut)}</td><td>${r.exceptions}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
};
W.fileReport = d => { const f=W.dayFigures(d), x=W.exceptions(); const note=($('rep-note')&&$('rep-note').value.trim())||'';
  const rec = { id:W.uid('RP'), date:d, filedAt:new Date().toISOString(), by:activeUser.name, note, unitsIn:f.in.reduce((a,m)=>a+m.qty,0), unitsOut:f.out.reduce((a,m)=>a+m.qty,0), exceptions:x.length };
  const i = W.REPORTS.findIndex(r=>r.date===d); if (i>=0) W.REPORTS[i]=rec; else W.REPORTS.push(rec);
  audit('Filed daily report for '+d,'report',x.length+' exceptions noted'); switchView('daily'); toast('Daily report filed for '+fmtD(d)); };

/* ============================================================ REPORTS HUB */
W.renderReports = () => {
  const t = state.tab || 'weekly';
  const tabs = `<div class="subtabs">${[['weekly','Weekly review'],['monthly','Monthly report'],['filed','Filed daily reports']].map(([k,l])=>`<button class="subtab ${t===k?'active':''}" onclick="state.tab='${k}';switchView('reports')">${l}</button>`).join('')}</div>`;
  if (t==='filed') { $('view').innerHTML = tabs + `<div class="card"><div class="card-header"><h3>Filed daily reports</h3></div><div class="table-wrap">${W.REPORTS.length ? `<table class="data-table"><thead><tr><th>Date</th><th>Filed</th><th>By</th><th>In</th><th>Out</th><th>Exceptions</th><th>Note</th></tr></thead><tbody>${W.REPORTS.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<tr><td>${fmtD(r.date)}</td><td class="small">${fmtDT(r.filedAt)}</td><td class="small">${esc(r.by)}</td><td>${nf(r.unitsIn)}</td><td>${nf(r.unitsOut)}</td><td>${r.exceptions}</td><td class="small muted">${esc(r.note||'—')}</td></tr>`).join('')}</tbody></table>` : W.emptyState('No reports filed yet','')}</div></div>`; return; }
  const wk=[]; for (let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);wk.push(d.toISOString().slice(0,10));}
  const weekMv = W.MOVEMENTS.filter(m=>wk.includes(m.at.slice(0,10)));
  const weekReq = W.REQS.filter(r=>wk.includes(r.createdAt.slice(0,10)));
  if (t==='weekly') { $('view').innerHTML = tabs + `
    <div class="grid kpi-grid" style="margin-bottom:20px">
    ${W.kpi('Units received', nf(weekMv.filter(x=>x.type==='IN').reduce((a,x)=>a+x.qty,0)), 'This week')}
    ${W.kpi('Units released', nf(weekMv.filter(x=>x.type==='OUT').reduce((a,x)=>a+x.qty,0)), 'This week')}
    ${W.kpi('Requisitions raised', weekReq.length, 'This week')}
    ${W.kpi('Labour hours', nf(wk.reduce((a,d)=>a+W.labourFor(d).hours,0)), 'Rostered across the week', '', 'hrs')}
    </div>
    <div class="card"><div class="card-header"><h3>Replenishment list</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Store</th><th>On hand</th><th>Reorder</th><th>Shortfall</th></tr></thead><tbody>${W.ITEMS.filter(i=>i.qty<=i.reorder).map(i=>`<tr><td>${esc(i.code)} ${esc(i.name)}</td><td class="small">${esc(W.whName(i.wh))}</td><td>${nf(i.qty)}</td><td class="muted">${nf(i.reorder)}</td><td class="warning">${nf(i.reorder-i.qty)}</td></tr>`).join('')}</tbody></table>${W.ITEMS.some(i=>i.qty<=i.reorder)?'':W.emptyState('Nothing to replenish','')}</div></div>`; return; }
  // monthly
  const period = W.today().slice(0,7); const monMv = W.MOVEMENTS.filter(x=>x.at.slice(0,7)===period); const m = W.monthLabour(period);
  const released = W.REQS.filter(r=>r.status==='RELEASED').length, closed = W.REQS.filter(r=>['RELEASED','REJECTED'].includes(r.status)).length;
  const fill = closed ? Math.round(released/closed*100) : 100;
  $('view').innerHTML = tabs + `<div class="grid kpi-grid" style="margin-bottom:20px">
  ${W.kpi('Movements', nf(monMv.length), nf(monMv.reduce((a,x)=>a+x.qty,0))+' units handled')}
  ${W.kpi('Service level', fill+'%', 'Released ÷ closed requisitions', fill>=85?'good':'warn')}
  ${W.kpi('Labour', nf(m.hours), money(m.cost), '', 'hrs')}
  ${W.kpi('Stock value', (W.ITEMS.reduce((s,i)=>s+i.qty*i.val,0)/1e6).toFixed(2)+'M', 'MZN at close')}
  </div>
  <div class="card"><div class="card-header"><h3>Requisitions by department</h3></div><div class="card-body">${W.chartDepts()}</div></div>`;
};
W.chartDepts = () => { const map={}; W.REQS.forEach(r=>{map[r.dept]=(map[r.dept]||0)+1;}); const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]); const max=Math.max(1,...rows.map(r=>r[1]));
  return rows.map(([d,n])=>`<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px"><span>${esc(d)}</span><span class="muted">${n}</span></div><div class="bar-track"><div class="bar-fill" style="width:${n/max*100}%"></div></div></div>`).join('') || '<div class="muted small">No requisitions yet.</div>'; };

/* ============================================================ SOP & COMPLIANCE */
W.renderSOP = () => {
  const t = state.tab || 'sop01';
  const tabs = `<div class="subtabs">${[['sop01','WH-SOP-01 · Warehouse operations'],['sop02','WH-SOP-02 · Container abnormalities'],['safety','Safety & compliance']].map(([k,l])=>`<button class="subtab ${t===k?'active':''}" onclick="state.tab='${k}';switchView('sop')">${l}</button>`).join('')}</div>`;
  if (t==='safety') { $('view').innerHTML = tabs; return W.renderSafety(); }
  $('view').innerHTML = tabs + `<div class="card"><div class="card-body">${t==='sop02'?W.sopDoc2():W.sopDoc1()}</div></div>`;
};
W.sopDoc1 = () => `<div class="sop-doc"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="code-chip">WH-SOP-01</span><span class="tag t-blue">Effective March 2026</span><span class="muted small">Warehouse Operations — Sofala</span></div>
  <p class="muted small" style="margin:12px 0">The requisition-to-reporting workflow that governs every issue of stock. No item leaves a Tzu Chi store without all five steps recorded against a named person.</p>
  ${railHTML(W.REQ_STEPS,-1,false)}<h4>Daily operating hours</h4>${W.dayStripHTML()}
  <h4>Step 01 — Requisition</h4><ul><li>The department coordinator raises a requisition stating the purpose, the destination, the project it is charged to and the date the goods are needed.</li><li>The requester cannot approve their own requisition.</li></ul>
  <h4>Step 02 — Warehouse verification</h4><ul><li>The Logistics Department checks the requested quantity against physical stock and the bin location, and may reduce the quantity to what actually exists.</li></ul>
  <h4>Step 03 — Authorisation</h4><ul><li>Requisitions up to ${W.THRESHOLD.toLocaleString()} MZN are authorised by the Logistics Department; above that threshold, Top Management authorises.</li></ul>
  <h4>Step 04 — Release and issue</h4><ul><li>Stock is picked against the approved quantity and handed over to the collecting department. Quantity, collector, date and time are recorded.</li></ul>
  <h4>Step 05 — Record and report</h4><ul><li>The stock ledger updates automatically at release, carrying who requested, approved, authorised and released — so any issue can be traced end to end.</li></ul></div>`;
W.sopDoc2 = () => `<div class="sop-doc"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="code-chip">WH-SOP-02</span><span class="tag t-rust">Abnormality procedure</span></div>
  <p class="muted small" style="margin:12px 0">Applies to every inbound container. Steps 03 onward open only when an abnormality is found.</p>
  ${railHTML(W.GRN_STEPS,-1,false)}
  ${W.GRN_STEPS.map((s,i)=>`<div class="sop-num"><b>${s.n}</b><div><b>${esc(s.t)}.</b> ${esc(s.who)}</div></div>`).join('')}
  <h4>Documents required for a claim</h4><ol style="padding-left:18px;font-size:13px">${W.CLAIM_DOCS.map(d=>`<li style="margin-bottom:4px">${esc(d)}</li>`).join('')}</ol></div>`;
W.renderSafety = () => {
  const todayCheck = W.SAFETY.find(s=>W.onDay(s.date,W.today())); const openInc = W.INCIDENTS.filter(i=>i.status==='Open');
  $('view').innerHTML += `<div class="grid kpi-grid" style="margin-bottom:20px">
  ${W.kpi("Today's check", todayCheck?(todayCheck.failed.length?'Issues':'Passed'):'Not done', todayCheck?todayCheck.failed.length+' failed item(s)':'Due before close', todayCheck?(todayCheck.failed.length?'warn':'good'):'bad')}
  ${W.kpi('Open incidents', openInc.length, 'Awaiting closure', openInc.length?'warn':'good')}
  ${W.kpi('Checks filed', W.SAFETY.length, 'Running record')}
  </div>
  ${W.can('safety.manage') ? `<div class="card"><div class="card-header"><div><h3>Daily safety and security check</h3></div></div><div class="card-body">
    ${W.SAFETY_CHECKS.map((c,i)=>`<label class="check"><input type="checkbox" data-chk="${i}" ${(!todayCheck||todayCheck.passed.includes(c))?'checked':''}><span>${esc(c)}</span></label>`).join('')}
    <label style="margin-top:12px">Notes on any failed item<input id="sf-note" value="${esc(todayCheck?todayCheck.note:'')}"></label>
    <button class="primary-btn compact" style="margin-top:10px" onclick="W.fileSafety()">File today's check</button></div></div>` : ''}
  <div class="card" style="margin-top:14px"><div class="card-header"><div><h3>Incident log</h3></div>${W.can('safety.manage')?`<button class="primary-btn compact" onclick="W.openNewIncident()">+ Report an incident</button>`:''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Date</th><th>Type</th><th>Severity</th><th>What happened</th><th>Status</th></tr></thead><tbody>
  ${W.INCIDENTS.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(i=>`<tr><td><span class="tag t-blue">${esc(i.id)}</span></td><td class="small">${fmtD(i.date)}</td><td class="small">${esc(i.type)}</td><td>${W.sevTag(i.severity)}</td><td class="small">${esc(i.desc)}</td><td>${i.status==='Open'?`<span class="tag t-amber">Open</span> ${W.can('safety.manage')?`<button class="action-btn compact" onclick="W.closeIncident('${i.id}')">Close</button>`:''}`:'<span class="tag t-jade">Closed</span>'}</td></tr>`).join('')}
  </tbody></table>${W.INCIDENTS.length?'':W.emptyState('No incidents recorded','')}</div></div>`;
};
W.fileSafety = () => { const passed=[],failed=[]; document.querySelectorAll('[data-chk]').forEach(c=>(c.checked?passed:failed).push(W.SAFETY_CHECKS[+c.dataset.chk]));
  if (failed.length && !$('sf-note').value.trim()) { toast('Note what is wrong with the failed items'); return; }
  const rec = {id:W.uid('SF'),date:new Date().toISOString(),by:activeUser.name,wh:'W1',passed,failed,note:$('sf-note').value.trim()};
  const i = W.SAFETY.findIndex(s=>W.onDay(s.date,W.today())); if (i>=0) W.SAFETY[i]=rec; else W.SAFETY.unshift(rec);
  audit('Filed daily safety check','safety',failed.length?failed.length+' failed item(s)':'all clear'); state.tab='safety'; switchView('sop'); toast(failed.length?'Check filed — '+failed.length+' item(s) flagged':'Check filed — all clear'); };
W.openNewIncident = () => {
  showModal(`<p class="eyebrow blue">Safety &amp; compliance</p><h3>Report an incident</h3><form id="in-form" class="form-grid">
  <label>Type<select name="type">${['Near miss','Injury','Property damage','Security','Fire or spill'].map(t=>`<option>${t}</option>`).join('')}</select></label>
  <label>Severity<select name="sev"><option>Low</option><option selected>Medium</option><option>High</option></select></label>
  <label class="full">What happened<textarea name="desc" rows="2" required></textarea></label>
  <label class="full">Immediate action taken<textarea name="act" rows="2"></textarea></label>
  <button class="primary-btn full" type="submit">Record incident</button></form>`);
  $('in-form').onsubmit = e => { e.preventDefault(); const f=new FormData(e.target); const desc=f.get('desc').trim(); if(!desc){toast('Describe what happened');return;}
    const id='INC-2026-'+String(++W.incCounter).padStart(2,'0');
    W.INCIDENTS.unshift({id,date:new Date().toISOString(),type:f.get('type'),severity:f.get('sev'),wh:'W1',desc,by:activeUser.name,action:f.get('act').trim()||'—',status:'Open'});
    audit('Reported incident '+id,'safety',f.get('sev')+' · '+f.get('type')); closeModal(); state.tab='safety'; switchView('sop'); toast(id+' recorded'); };
};
W.closeIncident = id => { const i=W.INCIDENTS.find(x=>x.id===id); i.status='Closed'; audit('Closed incident '+id,'safety',''); state.tab='safety'; switchView('sop'); toast(id+' closed'); };

/* ============================================================ NOTIFICATIONS */
W.notifications = () => {
  const n = []; const u = activeUser; if (!u) return n;
  W.REQS.forEach(r => {
    if (r.status==='SUBMITTED' && W.can('req.verify')) n.push({k:'req:'+r.id+':2', sev:'action', t:'Requisition awaiting your verification', d:r.code+' — '+r.purpose, at:r.history[r.history.length-1].at});
    if (r.status==='VERIFIED' && W.canAuthorize(r)) n.push({k:'req:'+r.id+':3', sev:'action', t:'Requisition awaiting your authorisation', d:r.code+' — '+r.purpose, at:r.history[r.history.length-1].at});
    if (r.status==='AUTHORIZED' && W.can('req.release')) n.push({k:'req:'+r.id+':4', sev:'action', t:'Authorised — ready to release', d:r.code+' — '+r.purpose, at:r.history[r.history.length-1].at});
    if (r.requester===u.name && ['VERIFIED','AUTHORIZED','RELEASED','REJECTED'].includes(r.status)) { const h=r.history[r.history.length-1]; n.push({k:'mine:'+r.id+':'+r.status, sev:r.status==='REJECTED'?'bad':'info', t:'Your requisition was '+W.STATUS_META[r.status].label.toLowerCase(), d:r.code+' — '+(h.note||h.action), at:h.at}); }
  });
  W.RECEIPTS.filter(r=>r.status==='HELD').forEach(r=>n.push({k:'grn:'+r.id, sev:'bad', t:'Container held under WH-SOP-02', d:r.containerNo+' — '+r.abnormalTypes.join(', '), at:r.date}));
  W.TRANSFERS.filter(t=>t.status==='IN_TRANSIT').forEach(t=>n.push({k:'trf:'+t.id, sev:'info', t:'Transfer in transit', d:t.code+' — '+W.whName(t.from)+' → '+W.whName(t.to), at:t.date}));
  if (W.can('ops.report') && !W.REPORTS.some(r=>r.date===W.today())) n.push({k:'rep:'+W.today(), sev:'action', t:"Today's report is not filed", d:'Due in the 16:00–17:30 reporting window', at:new Date().toISOString()});
  W.ITEMS.filter(i=>i.qty>0 && i.qty<=i.reorder).forEach(i=>n.push({k:'low:'+i.id, sev:'warn', t:'Below reorder level', d:i.name+' — '+nf(i.qty)+' of '+nf(i.reorder), at:new Date().toISOString()}));
  return n.sort((a,b)=>new Date(b.at)-new Date(a.at));
};
W.renderNotifications = () => {
  const list = W.notifications(); const read = W.NOTIF_READ[activeUser.id]||[];
  const cls = {action:'t-blue',bad:'t-rust',warn:'t-amber',info:'t-grey'}; const lab = {action:'Action',bad:'Critical',warn:'Attention',info:'Update'};
  $('view').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><p class="eyebrow blue">${list.filter(n=>!read.includes(n.k)).length} unread of ${list.length}</p><button class="action-btn compact" onclick="W.markAllRead()">Mark all as read</button></div>
  <div class="card"><div class="table-wrap">${list.length ? `<table class="data-table"><tbody>${list.map(n=>`<tr style="${read.includes(n.k)?'opacity:.55':''}"><td style="width:1%"><span class="tag ${cls[n.sev]}">${lab[n.sev]}</span></td><td><div style="font-weight:${read.includes(n.k)?400:600}">${esc(n.t)}</div><div class="muted small" style="margin-top:2px">${esc(n.d)}</div></td><td class="small muted">${fmtD(n.at)}</td></tr>`).join('')}</table>` : W.emptyState('Nothing to report','Approvals, alerts and updates for your role appear here.')}</div></div>`;
};
W.markAllRead = () => { W.NOTIF_READ[activeUser.id] = W.notifications().map(n=>n.k); switchView('notifications'); };

/* ============================================================ AI ASSISTANT
   A local knowledge engine over this module's own live data and WH-SOP-01/02 —
   no external API, so it works offline and never invents a figure it can't trace
   back to the records already on screen. */
W.AI = {
  title: () => 'Warehouse Assistant',
  subtitle: () => 'Ask about stock, requisitions or the SOPs',
  greeting: () => `Hi ${esc((activeUser.name||'').split(' ')[0])} — I can answer questions about stock levels, requisitions, receiving and the WH-SOP-01/02 procedures. What do you need?`,
  suggestedChips: () => ['What is below reorder?', 'What is pending approval?', 'How do I raise a requisition?', 'Is any container held?', 'What can I do with my role?'],
  answer(raw){
    const q = raw.toLowerCase().trim();
    const has = arr => arr.some(w=>q.includes(w));

    if (/^(hi|hello|hey|olá|ola)\b/.test(q)) return `Hello! Ask me about a specific item, a requisition, a container receipt, or how the WH-SOP-01/02 procedures work.`;

    if (has(['what can i do','my permission','my role'])) {
      const grants = PERM_CATALOG.filter(e=>activeUser.perms&&activeUser.perms[e.key]).map(e=>e.label);
      return `You're signed in as <b>${esc(ROLE_LABELS[activeUser.role])}</b>.<br>${grants.length? 'You can: '+grants.map(esc).join('; ')+'.' : 'Your account has no elevated Warehouse permissions.'}`;
    }
    if (has(['how do i request','how to request','raise a requisition','new requisition','request goods'])) return `Open <b>Requisitions</b> and press "+ New requisition". Give the project, purpose, priority and item/quantity, then submit. It follows WH-SOP-01: the Logistics Department verifies against stock, then authorises (above ${nf(W.THRESHOLD)} MZN, Top Management authorises), then it's released and recorded. You can't approve your own requisition.`;
    if (has(['sop-01','sop 01','five step','requisition process','approval process','who approves'])) return `WH-SOP-01, five steps: <b>01</b> Requisition raised (coordinator) → <b>02</b> Warehouse verification (checked against physical stock) → <b>03</b> Authorisation (Logistics Department, or Top Management above ${nf(W.THRESHOLD)} MZN) → <b>04</b> Release & issue → <b>05</b> Record — the ledger updates automatically.`;
    if (has(['sop-02','sop 02','abnormal','broken seal','seal mismatch','damaged container','shortage on arrival','claim','insurance'])) { const held = W.RECEIPTS.filter(r=>r.status==='HELD'); return `WH-SOP-02 (container abnormalities): if the seal is broken, mismatched, the container is damaged, or the count is short — do not collect it. Photograph and video it, notify HQ/shipping line/surveyor/insurer, sign for receipt only after survey, then file the claim.${held.length?' Currently held: '+held.map(g=>esc(g.containerNo)).join(', ')+'.':' No containers are currently held.'}`; }

    if (has(['below reorder','low stock','running low','need restock','shortage'])) { const low = W.ITEMS.filter(i=>i.qty<=i.reorder); return low.length ? `<b>${low.length} item(s)</b> at or below reorder: `+low.slice(0,8).map(i=>esc(i.name)+' ('+i.qty+' '+esc(i.unit)+', reorder at '+i.reorder+', '+esc(W.whName(i.wh))+')').join('; ')+(low.length>8?'…':'')+'.' : 'Nothing is at or below its reorder level right now.'; }
    if (has(['expir'])) { const soon = W.ITEMS.filter(i=>i.exp && daysUntil(i.exp)<=90 && daysUntil(i.exp)>=0); return soon.length ? `${soon.length} item(s) expire within 90 days: `+soon.map(i=>esc(i.name)+' ('+fmtD(i.exp)+')').join(', ')+'.' : 'Nothing expires within the next 90 days.'; }
    if (has(['pending','waiting on me','awaiting approval','what needs approval'])) { const mine = W.REQS.filter(r=>(r.status==='SUBMITTED'&&W.can('req.verify'))||(r.status==='VERIFIED'&&W.canAuthorize(r))); const all = W.REQS.filter(r=>['SUBMITTED','VERIFIED'].includes(r.status)); return mine.length ? `${mine.length} requisition(s) waiting on you: `+mine.map(r=>esc(r.code)+' — '+esc(r.dept)).join(', ')+'.' : `Nothing is waiting on you specifically. ${all.length} requisition(s) are pending overall.`; }
    if (has(['held','container status','what is arriving','inbound'])) { const held = W.RECEIPTS.filter(r=>r.status==='HELD'); return held.length ? `${held.length} container held: `+held.map(g=>esc(g.containerNo)+' ('+esc(g.abnormalTypes.join(', '))+')').join('; ')+'.' : 'No containers are currently held; all receipts are clear.'; }

    const codeMatch = q.match(/req-?\s?(\d{4})/i);
    if (codeMatch) { const r = W.REQS.find(x=>x.id.toLowerCase()==='req-'+codeMatch[1]); if (r) return `<b>${esc(r.code)}</b> — ${W.STATUS_META[r.status]?W.STATUS_META[r.status].label:r.status}. ${esc(r.dept)}, ${nf(r.value)} MZN. ${esc(r.purpose)}`; }

    const found = W.ITEMS.filter(i => q.includes(i.name.toLowerCase().split(' ')[0]) || q.includes(i.code.toLowerCase()));
    if (found.length) { const i = found[0]; return `<b>${esc(i.name)}</b> (${esc(i.code)}) — <b>${nf(i.qty)} ${esc(i.unit)}</b> on hand at ${esc(W.whName(i.wh))}, bin ${esc(i.loc)}. Reorder at ${nf(i.reorder)}.${i.qty<=i.reorder?' This is at or below reorder level.':''}`; }

    if (has(['how much stock','stock value','total stock','how are we doing','kpi'])) { const val = W.ITEMS.reduce((s,i)=>s+i.qty*i.val,0); const low = W.ITEMS.filter(i=>i.qty<=i.reorder).length; return `Stock value: <b>${money(val)}</b> across ${W.WAREHOUSES.length} stores. Below reorder: <b>${low}</b>. Pipeline: <b>${W.REQS.filter(r=>['SUBMITTED','VERIFIED'].includes(r.status)).length}</b> requisitions in flight.`; }
    if (has(['transfer','move stock','between store','send to'])) { const t = W.TRANSFERS.filter(x=>x.status==='IN_TRANSIT'); return `Stock moves between Kura, Maputo and Nhamatanda via <b>Transfers & Dispatch</b>. ${t.length?'In transit now: '+t.map(x=>esc(x.code)).join(', ')+'.':'Nothing is currently in transit.'}`; }
    if (has(['where is the nhamatanda','nhamatanda location','plus code'])) return `Nhamatanda Field Store is pinned to Plus Code <b>P6X3+99M</b>, Nhamatanda, Sofala — see it on the map in Warehouses or the Dashboard.`;
    if (has(['where do i','where can i','how do i find','which screen'])) return `Use the sidebar — Dashboard and Control Tower for the overview; Inventory, Receiving, Requisitions, Stock Movements, Transfers and Warehouses for day-to-day store operations; Staff, Equipment and Budget for resources; Daily Reports, Reports and SOP & Compliance for governance.`;

    return `I couldn't match that to something in the current records. Try asking about an item name or code, a requisition reference (e.g. REQ-2201), what's below reorder, held containers, or a specific SOP topic.`;
  }
};

window.W = W;
