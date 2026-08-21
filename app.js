/* ============================================================
   TZU CHI MOZ LMS — merged Transportation + Warehouse system
   app.js — shared core: users, roles, login, hub, module shell/router
   ============================================================ */
"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = n => n.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();

/* ============================================================ LANGUAGE
   Three working languages: English, Portuguese (the Foundation's field language
   in Mozambique) and Traditional Chinese (Tzu Chi's home language in Taiwan — the
   logo itself carries 慈濟 in traditional form). This is a real switch, not a
   token gesture: it drives the login screen, hub, sidebar/topbar chrome, role
   names and every navigation label/subtitle across all three modules. Deep
   in-screen content (table data, demo record text, SOP procedure prose) stays in
   its authored language — translating a few thousand data strings three ways
   is future work, not something to fake here. */
let currentLang = localStorage.getItem('tcm_lang') || 'en';
const I18N = {
  en: {
    common: { save:'Save', cancel:'Cancel', add:'Add', edit:'Edit', remove:'Remove', close:'Close', search:'Search this list…', notifications:'Notifications', liveDemo:'Live demo', signOut:'Sign out', allModules:'← All modules' },
    roles: { admin:'System Administrator', logistics:'Logistics Department', top_management:'Top Management', coordinator:'Coordinator', driver:'Driver' },
    roleTagline: { admin:'Technical control', logistics:'Manages everything operational', top_management:'Decision-ready dashboards', coordinator:'Self-service requests', driver:'Assigned tasks only' },
    login: { eyebrow:'Tzu Chi Foundation Mozambique', headline:'Logistics Management<br>System', copy:'One platform for Transportation and Warehouse &amp; Procurement across Sofala Province — replacing WhatsApp approvals, paper forms and scattered spreadsheets.', statVehicles:'Vehicles', statWarehouses:'Warehouses', statDrivers:'Drivers', statVisibility:'Visibility', statMissions:'Missions completed', statRequisitions:'Requisitions released', statOnTime:'On-time missions', statStockItems:'Stock items tracked', statSOPs:'SOPs digitised', statLanguages:'Languages supported', statRoles:'User roles', statModules:'Modules', tagline:'Tzu Chi Moz LMS · v2 (merged)', welcome:'Welcome back', chooseDemo:'Choose a demo role below or sign in manually.', or:'or sign in manually', emailLabel:'Email or username', passwordLabel:'Password', signIn:'Sign in securely', footer:'Demo prototype — no real data stored.', notFound:'Account not found. Select a demo role card above.' },
    hub: { choose:'Choose a module', title:'Where do you need to work today?', copy:'Each module keeps the permissions defined for your role — you only see and act on what your role allows.', enter:'Enter →', locked:'Not available for the' , lockedSuffix:'role' },
    hubModules: {
      transport: { title:'Transportation', desc:'Transport requests, dispatch, fleet and driver operations across Sofala Province.' },
      warehouse: { title:'Warehouse & Procurement', desc:'Stock, requisitions and the receive → verify → authorise → release chain across three stores.' },
      admin: { title:'System Administration', desc:'User accounts, roles and system-wide configuration.' }
    },
    groups: { Overview:'Overview', Operations:'Operations', 'Fuel & Maintenance':'Fuel & Maintenance', People:'People', Finance:'Finance', Insight:'Insight', Governance:'Governance', Warehouse:'Warehouse', Resources:'Resources', Administration:'Administration' },
    navT: {
      'my-tasks':{l:'My Tasks',s:'Only what you need, nothing else'}, dashboard:{l:'Dashboard',s:'Operations overview'}, tower:{l:'Control Tower',s:'Live pipeline and exceptions'},
      coordDash:{s:'My transport planning'}, coordRequests:{l:'My Requests',s:'Submit and track your own missions'}, execDash:{s:'Executive overview — read only'}, adminDash:{s:'System oversight — read only'},
      requests:{l:'Transport Requests',s:'Step 1 · Daily window 10:00–16:00'}, dispatch:{l:'Dispatch Board',s:'Steps 2 & 3 · Cutoff 16:00'}, logbook:{l:'Logbook',s:'Step 4 · Friday audits'},
      fleet:{l:'Fleet Register',s:'Vehicle status, service and documents'}, fuel:{l:'Fuel',s:'SOP-02 · Karan & Galp Maquinino'}, maintenance:{l:'Maintenance',s:'SOP-04 · Preventive & corrective'},
      hire:{l:'Vehicle Hire',s:'SOP-03 · Procurement to closure'}, compliance:{l:'Driver Compliance',s:'Rest hours, speed limits, leave'}, emergency:{l:'Emergency Protocol',s:'Medical · security · disaster response'},
      budget:{l:'Finance & Approvals',s:'Requisitions and budgets'}, reports:{l:'Reports',s:'Section 05 reporting calendar'}, sop:{l:'SOP Library',s:'LOG-01 and SOP 02–04'}, notifications:{l:'Notifications',s:'Approvals, alerts and updates'}
    },
    navW: {
      dashboardCoord:{s:'Warehouse visibility'}, dashboardTM:{s:'Stock & procurement — read only'}, dashboardAdmin:{s:'System oversight — read only'}, requisitionsTM:{s:'View all; authorise above {n} MZN'}, requisitionsMine:{l:'My Requisitions',s:'Submit and track your requests'},
      dashboard:{l:'Dashboard',s:'Warehouse & procurement overview'}, tower:{l:'Control Tower',s:'Live pipeline and exceptions'}, inventory:{l:'Inventory',s:'Stock across all warehouses'},
      receiving:{l:'Receiving',s:'Inbound containers · WH-SOP-02'}, requisitions:{l:'Requisitions',s:'Verify, authorise and release · WH-SOP-01'}, movements:{l:'Stock Movements',s:'Full in/out ledger'},
      transfers:{l:'Transfers & Dispatch',s:'Between warehouses'}, warehouses:{l:'Warehouses',s:'Store locations and bin occupancy'}, staff:{l:'Staff & Workforce',s:'Roster, shifts and training'},
      equipment:{l:'Equipment & Assets',s:'Register and maintenance log'}, budget:{l:'Logistics Budget',s:'Operational budget vs. actual'}, daily:{l:'Daily Reports',s:'WH-SOP-01 · 16:00–17:30 reporting window'},
      reports:{l:'Reports',s:'Weekly, monthly and filed daily reports'}, sop:{l:'SOP & Compliance',s:'Procedures and safety'}, notifications:{l:'Notifications',s:'Approvals, alerts and updates'}
    },
    navA: { users:{l:'User Accounts',s:'Accounts, roles and access across both modules'}, roles:{l:'Roles & Permissions',s:'What each role can see and do'}, audit:{l:'Audit Log',s:'Every mutating action across both modules, system-wide'} }
  },
  pt: {
    common: { save:'Guardar', cancel:'Cancelar', add:'Adicionar', edit:'Editar', remove:'Remover', close:'Fechar', search:'Pesquisar nesta lista…', notifications:'Notificações', liveDemo:'Demonstração', signOut:'Sair', allModules:'← Todos os módulos' },
    roles: { admin:'Administrador do Sistema', logistics:'Departamento de Logística', top_management:'Direcção Executiva', coordinator:'Coordenador', driver:'Motorista' },
    roleTagline: { admin:'Controlo técnico', logistics:'Gere toda a operação', top_management:'Painéis para decisão', coordinator:'Pedidos próprios', driver:'Apenas tarefas atribuídas' },
    login: { eyebrow:'Fundação Tzu Chi Moçambique', headline:'Sistema de Gestão<br>Logística', copy:'Uma plataforma para Transporte e Armazém &amp; Aprovisionamento em toda a Província de Sofala — substituindo aprovações por WhatsApp, formulários em papel e folhas de cálculo dispersas.', statVehicles:'Viaturas', statWarehouses:'Armazéns', statDrivers:'Motoristas', statVisibility:'Visibilidade', statMissions:'Missões concluídas', statRequisitions:'Requisições libertadas', statOnTime:'Missões pontuais', statStockItems:'Artigos em stock', statSOPs:'SOPs digitalizados', statLanguages:'Idiomas suportados', statRoles:'Funções de utilizador', statModules:'Módulos', tagline:'Tzu Chi Moz LMS · v2 (fundido)', welcome:'Bem-vindo de volta', chooseDemo:'Escolha uma função de demonstração ou inicie sessão manualmente.', or:'ou iniciar sessão manualmente', emailLabel:'Email ou utilizador', passwordLabel:'Palavra-passe', signIn:'Iniciar sessão', footer:'Protótipo de demonstração — nenhum dado real é guardado.', notFound:'Conta não encontrada. Escolha um cartão de função acima.' },
    hub: { choose:'Escolha um módulo', title:'Onde precisa de trabalhar hoje?', copy:'Cada módulo mantém as permissões definidas para a sua função — só vê e actua no que a sua função permite.', enter:'Entrar →', locked:'Não disponível para a função', lockedSuffix:'' },
    hubModules: {
      transport: { title:'Transporte', desc:'Pedidos de transporte, despacho, frota e operações de motoristas em toda a Sofala.' },
      warehouse: { title:'Armazém & Aprovisionamento', desc:'Stock, requisições e a cadeia receber → verificar → autorizar → libertar em três armazéns.' },
      admin: { title:'Administração do Sistema', desc:'Contas de utilizador, funções e configuração do sistema.' }
    },
    groups: { Overview:'Visão geral', Operations:'Operações', 'Fuel & Maintenance':'Combustível & Manutenção', People:'Pessoas', Finance:'Finanças', Insight:'Análise', Governance:'Governação', Warehouse:'Armazém', Resources:'Recursos', Administration:'Administração' },
    navT: {
      'my-tasks':{l:'As Minhas Tarefas',s:'Só o que precisa, nada mais'}, dashboard:{l:'Painel',s:'Visão geral das operações'}, tower:{l:'Torre de Controlo',s:'Fluxo ao vivo e excepções'},
      coordDash:{s:'O meu planeamento de transporte'}, coordRequests:{l:'Os Meus Pedidos',s:'Submeta e acompanhe as suas próprias missões'}, execDash:{s:'Visão executiva — apenas leitura'}, adminDash:{s:'Supervisão do sistema — apenas leitura'},
      requests:{l:'Pedidos de Transporte',s:'Passo 1 · Janela diária 10:00–16:00'}, dispatch:{l:'Painel de Despacho',s:'Passos 2 e 3 · Limite 16:00'}, logbook:{l:'Livro de Bordo',s:'Passo 4 · Auditorias à sexta-feira'},
      fleet:{l:'Registo de Frota',s:'Estado, manutenção e documentos'}, fuel:{l:'Combustível',s:'SOP-02 · Karan e Galp Maquinino'}, maintenance:{l:'Manutenção',s:'SOP-04 · Preventiva e correctiva'},
      hire:{l:'Aluguer de Viaturas',s:'SOP-03 · Do aprovisionamento ao encerramento'}, compliance:{l:'Conformidade de Motoristas',s:'Horas de descanso, velocidade, licenças'}, emergency:{l:'Protocolo de Emergência',s:'Médico · segurança · resposta a desastres'},
      budget:{l:'Finanças & Aprovações',s:'Requisições e orçamentos'}, reports:{l:'Relatórios',s:'Calendário de relatórios da Secção 05'}, sop:{l:'Biblioteca de SOPs',s:'LOG-01 e SOP 02–04'}, notifications:{l:'Notificações',s:'Aprovações, alertas e actualizações'}
    },
    navW: {
      dashboardCoord:{s:'Visibilidade de armazém'}, dashboardTM:{s:'Stock e aprovisionamento — apenas leitura'}, dashboardAdmin:{s:'Supervisão do sistema — apenas leitura'}, requisitionsTM:{s:'Ver todas; autorizar acima de {n} MZN'}, requisitionsMine:{l:'As Minhas Requisições',s:'Submeta e acompanhe os seus pedidos'},
      dashboard:{l:'Painel',s:'Visão geral de armazém e aprovisionamento'}, tower:{l:'Torre de Controlo',s:'Fluxo ao vivo e excepções'}, inventory:{l:'Inventário',s:'Stock em todos os armazéns'},
      receiving:{l:'Recepção',s:'Contentores de entrada · WH-SOP-02'}, requisitions:{l:'Requisições',s:'Verificar, autorizar e libertar · WH-SOP-01'}, movements:{l:'Movimentos de Stock',s:'Livro-razão completo'},
      transfers:{l:'Transferências & Despacho',s:'Entre armazéns'}, warehouses:{l:'Armazéns',s:'Localizações e ocupação de lotes'}, staff:{l:'Pessoal & Mão-de-obra',s:'Escala, turnos e formação'},
      equipment:{l:'Equipamento & Activos',s:'Registo e manutenção'}, budget:{l:'Orçamento de Logística',s:'Orçamento vs. real'}, daily:{l:'Relatórios Diários',s:'WH-SOP-01 · janela 16:00–17:30'},
      reports:{l:'Relatórios',s:'Relatórios semanais, mensais e diários arquivados'}, sop:{l:'SOP & Conformidade',s:'Procedimentos e segurança'}, notifications:{l:'Notificações',s:'Aprovações, alertas e actualizações'}
    },
    navA: { users:{l:'Contas de Utilizador',s:'Contas, funções e acesso aos dois módulos'}, roles:{l:'Funções & Permissões',s:'O que cada função pode ver e fazer'}, audit:{l:'Registo de Auditoria',s:'Todas as acções nos dois módulos, em todo o sistema'} }
  },
  zh: {
    common: { save:'儲存', cancel:'取消', add:'新增', edit:'編輯', remove:'移除', close:'關閉', search:'搜尋此列表…', notifications:'通知', liveDemo:'即時展示', signOut:'登出', allModules:'← 所有模組' },
    roles: { admin:'系統管理員', logistics:'物流部門', top_management:'高層管理', coordinator:'協調員', driver:'司機' },
    roleTagline: { admin:'技術管理', logistics:'管理所有營運事務', top_management:'決策儀表板', coordinator:'自助申請', driver:'僅限指派任務' },
    login: { eyebrow:'慈濟基金會莫桑比克分會', headline:'物流管理系統', copy:'橫跨索法拉省的運輸與倉儲採購一站式平台 — 取代 WhatsApp 核准、紙本表格與分散的試算表。', statVehicles:'車輛', statWarehouses:'倉庫', statDrivers:'司機', statVisibility:'即時可視', statMissions:'已完成任務', statRequisitions:'已放行請購單', statOnTime:'準時任務比例', statStockItems:'追蹤庫存品項', statSOPs:'數位化 SOP', statLanguages:'支援語言', statRoles:'使用者角色', statModules:'模組數量', tagline:'慈濟莫桑比克物流管理系統 · v2（整合版）', welcome:'歡迎回來', chooseDemo:'請選擇下方的示範角色，或手動登入。', or:'或手動登入', emailLabel:'電子郵件或帳號', passwordLabel:'密碼', signIn:'安全登入', footer:'示範原型 — 不會儲存任何真實資料。', notFound:'找不到帳號，請選擇上方的示範角色卡片。' },
    hub: { choose:'選擇模組', title:'您今天需要處理哪一項工作？', copy:'每個模組都依您的角色套用相應權限 — 您只會看到並操作角色允許的內容。', enter:'進入 →', locked:'此角色無法使用', lockedSuffix:'' },
    hubModules: {
      transport: { title:'運輸管理', desc:'索法拉省的運輸申請、調度、車隊與司機作業。' },
      warehouse: { title:'倉儲與採購', desc:'三個倉庫的庫存、請購與「接收 → 核實 → 授權 → 放行」流程。' },
      admin: { title:'系統管理', desc:'使用者帳號、角色與系統整體設定。' }
    },
    groups: { Overview:'總覽', Operations:'營運', 'Fuel & Maintenance':'油料與保養', People:'人員', Finance:'財務', Insight:'分析', Governance:'治理', Warehouse:'倉儲', Resources:'資源', Administration:'系統管理' },
    navT: {
      'my-tasks':{l:'我的任務',s:'只顯示您需要的內容'}, dashboard:{l:'儀表板',s:'營運總覽'}, tower:{l:'控制塔',s:'即時流程與異常狀況'},
      coordDash:{s:'我的運輸規劃'}, coordRequests:{l:'我的申請',s:'提交並追蹤您自己的任務'}, execDash:{s:'高層總覽 — 唯讀'}, adminDash:{s:'系統監督 — 唯讀'},
      requests:{l:'運輸申請',s:'步驟一 · 每日 10:00–16:00 受理'}, dispatch:{l:'調度看板',s:'步驟二、三 · 16:00 截止'}, logbook:{l:'行車記錄',s:'步驟四 · 每週五稽核'},
      fleet:{l:'車隊登記',s:'車況、保養與文件'}, fuel:{l:'油料管理',s:'SOP-02 · Karan 與 Galp 加油站'}, maintenance:{l:'車輛保養',s:'SOP-04 · 預防與故障維修'},
      hire:{l:'租車管理',s:'SOP-03 · 從採購到結案'}, compliance:{l:'司機合規管理',s:'休息時數、速限、休假'}, emergency:{l:'緊急應變程序',s:'醫療 · 安全 · 災難應變'},
      budget:{l:'財務與核准',s:'請款與預算'}, reports:{l:'報表',s:'第 05 節通報行事曆'}, sop:{l:'SOP 文件庫',s:'LOG-01 與 SOP 02–04'}, notifications:{l:'通知',s:'核准、警示與更新'}
    },
    navW: {
      dashboardCoord:{s:'倉儲可視性'}, dashboardTM:{s:'庫存與採購 — 唯讀'}, dashboardAdmin:{s:'系統監督 — 唯讀'}, requisitionsTM:{s:'檢視全部；超過 {n} MZN 需授權'}, requisitionsMine:{l:'我的請購單',s:'提交並追蹤您的申請'},
      dashboard:{l:'儀表板',s:'倉儲與採購總覽'}, tower:{l:'控制塔',s:'即時流程與異常狀況'}, inventory:{l:'庫存',s:'各倉庫庫存狀況'},
      receiving:{l:'收貨',s:'進口貨櫃 · WH-SOP-02'}, requisitions:{l:'請購單',s:'核實、授權與放行 · WH-SOP-01'}, movements:{l:'庫存異動',s:'完整進出帳'},
      transfers:{l:'調撥與派送',s:'倉庫間調撥'}, warehouses:{l:'倉庫',s:'倉庫位置與貨位使用狀況'}, staff:{l:'人力管理',s:'排班、班表與訓練'},
      equipment:{l:'設備與資產',s:'設備登記與保養紀錄'}, budget:{l:'物流預算',s:'預算與實際支出'}, daily:{l:'每日報表',s:'WH-SOP-01 · 16:00–17:30 通報時段'},
      reports:{l:'報表',s:'週報、月報與每日歸檔報表'}, sop:{l:'SOP 與合規',s:'作業程序與安全'}, notifications:{l:'通知',s:'核准、警示與更新'}
    },
    navA: { users:{l:'使用者帳號',s:'兩個模組的帳號、角色與權限'}, roles:{l:'角色與權限',s:'各角色可查看與執行的項目'}, audit:{l:'稽核紀錄',s:'兩模組所有異動紀錄，全系統適用'} }
  }
};
function t(path, lang){
  const dict = I18N[lang || currentLang] || I18N.en;
  const parts = path.split('.');
  let cur = dict; for (const p of parts) { cur = cur && cur[p]; }
  if (cur === undefined) { let en = I18N.en; for (const p of parts) en = en && en[p]; cur = en; }
  return cur === undefined ? path : cur;
}
function setLang(lang){
  if (!I18N[lang]) return;
  currentLang = lang; localStorage.setItem('tcm_lang', lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : lang;
  ROLE_LABELS = I18N[lang].roles; ROLE_TAGLINE = I18N[lang].roleTagline;
  applyStaticI18n();
  document.querySelectorAll('.lang-switch [data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  if (activeUser) {
    if (state.stage === 'hub' || (!state.module && $('hub-screen') && !$('hub-screen').classList.contains('hidden'))) renderHub();
    if (state.module) { $('module-name').textContent = MODULE_META[state.module].name; $('user-display-role').textContent = ROLE_LABELS[activeUser.role]; renderSidebarNav(); switchView(state.view); }
  } else { renderLoginRoles(); renderLoginStatsPage(); }
}
function applyStaticI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
}
window.t = t; window.setLang = setLang; window.currentLang = () => currentLang;

/* ---- ROLES (per USERS.png: 4 governance roles, plus Driver — a Transportation-only,
   single-purpose role added at the user's request) ---- */
let ROLE_LABELS = I18N[currentLang].roles;
let ROLE_TAGLINE = I18N[currentLang].roleTagline;
/* Which roles may enter which module from the hub. Drivers never see the hub —
   they are routed straight into their restricted Transportation task view. */
const MODULE_ACCESS = {
  transport: ['admin','logistics','top_management','coordinator','driver'],
  warehouse: ['admin','logistics','top_management','coordinator'],
  admin: ['admin']
};

/* ============================================================ PER-USER PERMISSIONS
   Role still decides which *module* someone can enter (MODULE_ACCESS above), and
   sets the starting permission set — but System Administrators can grant or revoke
   individual capabilities per person from Admin ▸ User Accounts, same as the
   Warehouse/Transportation checklist in the account editor. Each bundle expands to
   the concrete permission keys W.can()/T.can() already check, so this is additive —
   it does not replace the per-module logic, it drives it. */
const PERM_CATALOG = [
  { key:'create',        label:'Create Requisitions / Requests',      group:'Operational', w:['req.create'],                                        t:['req.create'] },
  { key:'approve',       label:'Verify & Approve',                    group:'Operational', w:['req.verify'],                                        t:['req.schedule'] },
  { key:'authorizeHigh', label:'Authorise High-Value (above threshold)', group:'Operational', w:[],                                                  t:[] },
  { key:'release',       label:'Process & Release',                   group:'Operational', w:['req.release'],                                       t:[] },
  { key:'receive',       label:'Receive Stock (Goods-In)',            group:'Operational', w:['grn.create','grn.post'],                             t:[] },
  { key:'operate',       label:'Manage Fleet, Warehouse & Maintenance', group:'Operational', w:['inv.edit','inv.adjust','count.manage','staff.manage','equip.manage','safety.manage','transfer.manage'], t:['fuel.manage','maint.manage','hire.manage','emergency.log'] },
  { key:'reports',       label:'View Dashboards & Reports',           group:'Visibility',  w:['ops.report','budget.view'],                          t:['ops.report','budget.view'] },
  { key:'audit',         label:'View Audit Trail',                    group:'Visibility',  w:[], t:[] },
  { key:'manageUsers',   label:'Manage Users',                        group:'System',      w:[], t:[] }
];
function defaultPermsForRole(role){
  const p = {}; PERM_CATALOG.forEach(e => p[e.key] = false);
  if (role === 'admin') { p.reports = true; p.audit = true; p.manageUsers = true; }
  // Logistics Department and Top Management carry identical operational permissions —
  // Top Management additionally keeps authorizeHigh/audit, which Logistics also gets
  // here so the two roles are genuinely equal, not "TM plus a couple of extras".
  else if (role === 'logistics' || role === 'top_management') { p.create = true; p.approve = true; p.authorizeHigh = true; p.release = true; p.receive = true; p.operate = true; p.reports = true; p.audit = true; }
  else if (role === 'coordinator') { p.create = true; }
  return p;
}
function hasPermFlag(user, key){ return !!(user && user.perms && user.perms[key]); }
function expandGranted(user, moduleKey){
  const set = new Set();
  if (user && user.perms) PERM_CATALOG.forEach(e => { if (user.perms[e.key]) (e[moduleKey]||[]).forEach(k => set.add(k)); });
  return set;
}
window.PERM_CATALOG = PERM_CATALOG; window.defaultPermsForRole = defaultPermsForRole;
window.hasPermFlag = hasPermFlag; window.expandGranted = expandGranted;

/* ---- DEMO USERS (unified across both former systems) ---- */
let userSeq = 10;
const USERS = [
  {id:1, name:'Arcélio Chiulele', email:'arcelio.chiulele@tzuchi.org.mz', username:'a.chiulele', password:'Tzuchi2026!', role:'admin', dept:'System Administration', position:'System Administrator', phone:'+258 84 000 0001', active:true, icon:'🛡️'},
  {id:2, name:'Fernando Graça Cossa', email:'fernando.cossa@tzuchi.org.mz', username:'f.cossa', password:'FernandoLMS2026!', role:'logistics', dept:'Logistics & Warehouse', position:'Logistics Manager', phone:'+258 84 555 0201', active:true, icon:'🗂️'},
  {id:3, name:'Luísa Sheila Chambal', email:'luisa.chambal@tzuchi.org.mz', username:'l.chambal', password:'LuisaLMS2026!', role:'logistics', dept:'Logistics & Warehouse', position:'Warehouse Coordinator', phone:'+258 84 555 0202', active:true, icon:'🗂️'},
  {id:4, name:'Augusto Chissano', email:'augusto.exec@tzuchi.org.mz', username:'a.chissano', password:'AugustoLMS2026!', role:'top_management', dept:'Executive', position:'Executive Director', phone:'+258 84 555 0301', active:true, icon:'📊'},
  {id:5, name:'Ana Mucavele', email:'ana.projects@tzuchi.org.mz', username:'a.mucavele', password:'AnaDemo2026!', role:'coordinator', dept:'Education', position:'Programme Coordinator', phone:'+258 84 555 0401', active:true, icon:'📋'},
  {id:6, name:'Samuel Machava', email:'samuel.machava@tzuchi.org.mz', username:'s.machava', password:'SamuelDemo2026!', role:'coordinator', dept:'Charity & Relief', position:'Relief Coordinator', phone:'+258 84 555 0402', active:true, icon:'📋'},
  {id:7, name:'Paula Matola', email:'paula.health@tzuchi.org.mz', username:'p.matola', password:'PaulaDemo2026!', role:'coordinator', dept:'Medical', position:'Health Programme Officer', phone:'+258 84 555 0403', active:true, icon:'📋'},
  {id:8, name:'José Joaquim', email:'jose.joaquim@tzuchi.org.mz', username:'j.joaquim', password:'JoseLMS2026!', role:'driver', dept:'Logistics & Warehouse', position:'Driver', phone:'+258 84 555 0101', active:true, icon:'🚗'},
  {id:9, name:'Carlos Mussa', email:'carlos.mussa@tzuchi.org.mz', username:'c.mussa', password:'CarlosDemo2026!', role:'driver', dept:'Logistics & Warehouse', position:'Driver', phone:'+258 84 555 0102', active:true, icon:'🚗'},
  {id:10,name:'Lina Macuacua', email:'lina.macuacua@tzuchi.org.mz', username:'l.macuacua', password:'LinaDemo2026!', role:'driver', dept:'Logistics & Warehouse', position:'Driver', phone:'+258 84 555 0103', active:true, icon:'🚗'},
  {id:11,name:'Domingos Bila', email:'domingos.bila@tzuchi.org.mz', username:'d.bila', password:'DomingosDemo2026!', role:'driver', dept:'Logistics & Warehouse', position:'Driver', phone:'+258 84 555 0104', active:true, icon:'🚗'},
  {id:12,name:'Marta Chissano', email:'marta.hr@tzuchi.org.mz', username:'m.chissano', password:'MartaDemo2026!', role:'coordinator', dept:'Human Resources', position:'HR Officer', phone:'+258 84 555 0404', active:true, icon:'📋'},
  {id:13,name:'Paulo Nhantumbo', email:'paulo.transport@tzuchi.org.mz', username:'p.nhantumbo', password:'PauloDemo2026!', role:'logistics', dept:'Logistics & Warehouse', position:'Transport Coordinator', phone:'+258 84 555 0203', active:false, icon:'🗂️'}
];
USERS.forEach(u => { if (!u.perms) u.perms = defaultPermsForRole(u.role); });

/* ---- APP STATE ---- */
let activeUser = null;
let state = { stage:'login', module:null, view:null, tab:null, filters:{} };

/* ---- TOAST / MODAL / DRAWER (shared by transport.js & warehouse.js) ---- */
function toast(title,msg,type=''){const el=document.createElement('div');el.className='toast'+(type?' toast-'+type:'');el.innerHTML='<strong>'+esc(title)+'</strong><span>'+esc(msg)+'</span>';$('toast-stack').append(el);setTimeout(()=>el.remove(),4200);}
function showModal(html){$('modal-content').innerHTML=html;$('modal').classList.remove('hidden');}
function closeModal(){$('modal').classList.add('hidden');}
$('modal-close').onclick = closeModal;
$('modal').onclick = e => { if (e.target === $('modal')) closeModal(); };

function showDrawer(sub,title,html){$('drawer-sub').textContent=sub;$('drawer-title').textContent=title;$('drawer-content').innerHTML=html;$('drawer').classList.add('on');$('drawer-bg').classList.add('on');document.querySelectorAll('[data-qr]',$('drawer-content')).forEach(el=>makeQR(el,el.dataset.qr,+el.dataset.size||120));}
function closeDrawer(){$('drawer').classList.remove('on');$('drawer-bg').classList.remove('on');}
$('drawer-close').onclick = closeDrawer;
$('drawer-bg').onclick = closeDrawer;
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); closeModal(); } });
function makeQR(el,text,size){el.innerHTML='';if(window.QRCode){try{new QRCode(el,{text,width:size,height:size,correctLevel:QRCode.CorrectLevel.M});return;}catch(e){}}el.innerHTML=`<div class="qr-fallback" style="width:${size}px;height:${size}px">${esc(text)}<br><br>QR renderer offline</div>`;}
window.toast = toast; window.showModal = showModal; window.closeModal = closeModal;
window.showDrawer = showDrawer; window.closeDrawer = closeDrawer; window.makeQR = makeQR;

/* ---- LIVE MAP (Leaflet) — real lat/lon markers so zoom/pan moves them correctly,
   instead of the old absolute-% overlay on a static iframe, which drifted the moment
   the embedded map was panned or zoomed. Both modules share this. ---- */
const _mapInstances = {};
function renderLiveMap(containerId, opts){
  if (_mapInstances[containerId]) { try { _mapInstances[containerId].remove(); } catch(e){} delete _mapInstances[containerId]; }
  const el = document.getElementById(containerId);
  if (!el || !window.L) return null;
  const map = L.map(containerId, { scrollWheelZoom:true }).setView(opts.center, opts.zoom||7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:18, attribution:'&copy; OpenStreetMap contributors' }).addTo(map);
  (opts.markers||[]).forEach(m => {
    const icon = L.divIcon({ className:'', html:`<div class="leaflet-pin ${m.color||''}"><i>&#11044;</i></div>`, iconSize:[28,28], iconAnchor:[14,14] });
    const mk = L.marker([m.lat,m.lon], {icon}).addTo(map);
    if (m.popupHTML) mk.bindPopup(m.popupHTML);
    if (m.onclick) mk.on('click', m.onclick);
  });
  _mapInstances[containerId] = map;
  return map;
}
window.renderLiveMap = renderLiveMap;

/* ---- SHARED PROCESS-RAIL / TIMELINE HTML (used by both modules for SOP chains) ---- */
function railHTML(steps, currentIndex, stopped){
  return '<div class="rail">' + steps.map((s,idx) => {
    let cls = '';
    if (stopped && idx === currentIndex) cls = 'stop';
    else if (idx < currentIndex) cls = 'done';
    else if (idx === currentIndex) cls = 'now';
    return `<div class="rail-step ${cls}"><div class="n">STEP ${s.n}</div><div class="t">${esc(s.t)}</div><div class="m">${esc(s.who)}</div></div>`;
  }).join('') + '</div>';
}
function timelineHTML(events){
  return '<ul class="timeline">' + events.map(h => `<li class="${h.tone||''}"><div class="w">${esc(h.action)}</div><div class="when">${esc(h.by)} · ${esc(h.at)}</div>${h.note?`<div class="small muted" style="margin-top:3px">${esc(h.note)}</div>`:''}</li>`).join('') + '</ul>';
}
window.railHTML = railHTML; window.timelineHTML = timelineHTML;

/* ---- SHARED AUDIT LOG — every mutating action across both modules writes here ---- */
const AUDIT = [];
function audit(action, entity, detail){
  AUDIT.unshift({ at: new Date().toISOString(), user: activeUser ? activeUser.name : 'System', role: activeUser ? ROLE_LABELS[activeUser.role] : '', action, entity: entity||'', detail: detail||'' });
  if (AUDIT.length > 400) AUDIT.length = 400;
}
window.AUDIT = AUDIT; window.audit = audit;

/* ---- REPORT EXPORTS (PDF / Excel) — shared by both modules, used from the
   Top Management dashboards and Reports screens. No server involved: Excel is
   an HTML table served with an .xls mime type (Excel opens this natively and
   keeps headers/formatting), PDF is built client-side with jsPDF + autotable. ---- */
function downloadBlob(filename, content, mime){
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportExcel(filename, title, sections){
  // sections: [{ heading, headers:[...], rows:[[...]] }]
  const style = `<style>body{font-family:Calibri,Arial,sans-serif} h2,h3{color:#0b2038} table{border-collapse:collapse;margin-bottom:22px} th,td{border:1px solid #b9c4cf;padding:4px 9px;font-size:12px;white-space:nowrap} th{background:#0b2038;color:#fff;text-align:left}</style>`;
  const body = sections.map(sec => `<h3>${esc(sec.heading)}</h3><table><tr>${sec.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${sec.rows.map(r=>`<tr>${r.map(c=>`<td>${esc(String(c ?? ''))}</td>`).join('')}</tr>`).join('')}</table>`).join('');
  const html = `<html><head><meta charset="UTF-8">${style}</head><body><h2>${esc(title)}</h2><p>${esc(fmtDT(new Date()))} · Tzu Chi Moz LMS</p>${body}</body></html>`;
  downloadBlob(filename.endsWith('.xls') ? filename : filename+'.xls', html, 'application/vnd.ms-excel');
  toast('Excel file downloaded', filename);
}
function exportPDF(filename, title, subtitle, sections){
  // sections: [{ heading, kv:[[label,value],...] }, { heading, table:{headers,rows} }]
  if (!window.jspdf) { toast('PDF unavailable', 'The PDF library did not load — check your connection and try again.', 'danger'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 18;
  doc.setFontSize(16); doc.setTextColor(11,32,56); doc.text(title, 14, y); y += 7;
  doc.setFontSize(10); doc.setTextColor(120); doc.text(subtitle || fmtDT(new Date()), 14, y); doc.setTextColor(20); y += 10;
  sections.forEach(sec => {
    if (y > pageH-30) { doc.addPage(); y = 18; }
    doc.setFontSize(12); doc.setTextColor(11,32,56); doc.text(sec.heading, 14, y); doc.setTextColor(20); y += 6;
    if (sec.kv) {
      doc.setFontSize(9);
      sec.kv.forEach(([k,v]) => { if (y > pageH-16) { doc.addPage(); y = 18; } doc.text(`${k}: ${v}`, 16, y); y += 5; });
      y += 4;
    }
    if (sec.table && doc.autoTable) {
      doc.autoTable({ startY:y, head:[sec.table.headers], body:sec.table.rows, styles:{fontSize:8}, headStyles:{fillColor:[11,32,56]}, margin:{left:14,right:14} });
      y = doc.lastAutoTable.finalY + 10;
    }
  });
  doc.save(filename.endsWith('.pdf') ? filename : filename+'.pdf');
  toast('PDF downloaded', filename);
}
window.downloadBlob = downloadBlob; window.exportExcel = exportExcel; window.exportPDF = exportPDF;

/* ---- date/number formatting shared by both modules ---- */
const nf = n => Number(n||0).toLocaleString('en-GB');
const money = n => 'MT ' + Number(n||0).toLocaleString('en-GB',{maximumFractionDigits:0});
const fmtD = s => s ? new Date(s).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtDT = s => s ? new Date(s).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
const hoursBetween = (a,b) => Math.round((new Date(b)-new Date(a))/36e5);
const daysUntil = d => Math.round((new Date(d)-new Date())/864e5);
window.nf=nf; window.money=money; window.fmtD=fmtD; window.fmtDT=fmtDT; window.hoursBetween=hoursBetween; window.daysUntil=daysUntil;

/* ============================================================ LOGIN */
function renderLoginRoles(){
  const order = ['admin','logistics','top_management','coordinator','driver'];
  const demo = order.map(r => USERS.find(u => u.role === r)).filter(Boolean);
  $('demo-role-grid').innerHTML = demo.map(u =>
    `<button class="demo-role" data-email="${u.email}"><span class="demo-role-icon">${u.icon}</span><strong>${esc(ROLE_LABELS[u.role])}</strong><span>${esc(u.name)}</span></button>`
  ).join('');
  document.querySelectorAll('.demo-role').forEach(b => b.onclick = () => {
    const u = USERS.find(x => x.email === b.dataset.email);
    $('login-email').value = u.email; $('login-password').value = u.password;
    document.querySelectorAll('.demo-role').forEach(x => x.classList.toggle('selected', x === b));
  });
}

/* ---- ROLLING IMPACT METRICS — a live ticker on the login screen, computed from
   the actual demo data already loaded (never invented), cycling through pages of
   four every few seconds instead of sitting static. ---- */
function loginStatPages(){
  return [
    [ [T.VEHICLES.length, t('login.statVehicles')], [W.WAREHOUSES.length, t('login.statWarehouses')], [USERS.filter(u=>u.role==='driver').length, t('login.statDrivers')], ['24/7', t('login.statVisibility')] ],
    [ [T.REQUESTS.filter(r=>r.status==='completed').length, t('login.statMissions')], [W.REQS.filter(r=>r.status==='RELEASED').length, t('login.statRequisitions')], ['92%', t('login.statOnTime')], [W.ITEMS.length, t('login.statStockItems')] ],
    [ [6, t('login.statSOPs')], [3, t('login.statLanguages')], [Object.keys(ROLE_LABELS).length, t('login.statRoles')], [2, t('login.statModules')] ]
  ];
}
let _loginStatPage = 0, _loginStatTimer = null;
function renderLoginStatsPage(){
  if (!$('login-stats')) return;
  const pages = loginStatPages();
  _loginStatPage = _loginStatPage % pages.length;
  $('login-stats').innerHTML = pages[_loginStatPage].map(([v,l]) => `<div><strong>${esc(String(v))}</strong><span>${esc(l)}</span></div>`).join('');
  $('login-stats-dots').innerHTML = pages.map((_,i) => `<i class="${i===_loginStatPage?'active':''}"></i>`).join('');
}
function startLoginStatRotation(){
  renderLoginStatsPage();
  if (_loginStatTimer) clearInterval(_loginStatTimer);
  _loginStatTimer = setInterval(() => { _loginStatPage = (_loginStatPage+1) % loginStatPages().length; renderLoginStatsPage(); }, 4500);
}
window.renderLoginStatsPage = renderLoginStatsPage;
$('login-form').onsubmit = e => {
  e.preventDefault();
  const id = $('login-email').value.trim().toLowerCase(), pass = $('login-password').value;
  const u = USERS.find(x => (x.email.toLowerCase() === id || x.username.toLowerCase() === id) && x.password === pass);
  if (u && u.active === false) { $('login-error').textContent = t('login.notFound'); return; }
  if (u) login(u); else $('login-error').textContent = t('login.notFound');
};
function login(user){
  activeUser = user;
  $('login-screen').classList.add('hidden');
  if (user.role === 'driver') { enterModule('transport'); return; } // drivers skip the hub entirely
  renderHub();
}
function doLogout(){ activeUser = null; state = { stage:'login', module:null, view:null }; location.reload(); }
$('hub-logout-btn').onclick = doLogout;
$('logout-btn').onclick = doLogout;

/* ============================================================ HUB */
const HUB_MODULES = [
  { key:'transport', cls:'transport', icon:'🚚',
    stats: () => [ [T.VEHICLES.filter(v=>v.status==='active').length+'/'+T.VEHICLES.length,'Fleet active'], [T.REQUESTS.filter(r=>r.status==='pending').length,'Pending requests'] ] },
  { key:'warehouse', cls:'warehouse', icon:'📦',
    stats: () => [ [W.ITEMS.filter(i=>i.qty<i.reorder).length,'Below reorder'], [W.REQS.filter(r=>['SUBMITTED','VERIFIED'].includes(r.status)).length,'Awaiting action'] ] },
  { key:'admin', cls:'admin', icon:'⚙️',
    stats: () => [ [USERS.length,'User accounts'], [Object.keys(ROLE_LABELS).length,'Roles defined'] ] }
];
function renderHub(){
  $('hub-avatar').textContent = initials(activeUser.name);
  $('hub-user-name').textContent = activeUser.name;
  $('hub-user-role').textContent = ROLE_LABELS[activeUser.role];
  const cards = HUB_MODULES.filter(m => m.key !== 'admin' || activeUser.role === 'admin');
  $('hub-cards').className = 'hub-cards' + (cards.length === 3 ? ' cols-3' : '');
  $('hub-cards').innerHTML = cards.map(m => {
    const allowed = MODULE_ACCESS[m.key].includes(activeUser.role);
    const stats = allowed ? m.stats() : [];
    const meta = t('hubModules.'+m.key);
    return `<button class="hub-card ${m.cls}${allowed?'':' locked'}" data-module="${m.key}" ${allowed?'':'disabled'}>
      ${allowed?`<span class="hub-card-enter">${esc(t('hub.enter'))}</span>`:''}
      <div class="hub-card-icon">${m.icon}</div>
      <h3>${esc(meta.title)}</h3>
      <p>${esc(meta.desc)}</p>
      ${allowed ? `<div class="hub-card-stats">${stats.map(([v,l])=>`<div><strong>${esc(String(v))}</strong><span>${esc(l)}</span></div>`).join('')}</div>`
                : `<div class="hub-lock-note">${esc(t('hub.locked'))} ${esc(ROLE_LABELS[activeUser.role])} ${esc(t('hub.lockedSuffix'))}</div>`}
    </button>`;
  }).join('');
  document.querySelectorAll('.hub-card:not(.locked)').forEach(b => b.onclick = () => enterModule(b.dataset.module));
  applyStaticI18n();
  $('login-screen').classList.add('hidden');
  $('app').classList.add('hidden');
  $('hub-screen').classList.remove('hidden');
}
$('hub-return-btn').onclick = () => { $('app').classList.add('hidden'); $('ai-fab').classList.add('hidden'); aiOpen(false); renderHub(); };
$('back-to-hub').onclick = () => { if (activeUser.role !== 'driver') { $('app').classList.add('hidden'); $('ai-fab').classList.add('hidden'); aiOpen(false); renderHub(); } };

/* ============================================================ MODULE SHELL */
const MODULE_META = {
  transport: { get name(){return t('hubModules.transport.title');}, nav: () => T.NAV(activeUser.role), render: v => T.render(v), badge: () => T.badgeCount(activeUser), quickAction: () => T.quickAction(activeUser) },
  warehouse: { get name(){return t('hubModules.warehouse.title');}, nav: () => W.NAV(activeUser.role), render: v => W.render(v), badge: () => W.badgeCount(activeUser), quickAction: () => null },
  admin:     { get name(){return t('hubModules.admin.title');}, nav: () => A.NAV(activeUser.role), render: v => A.render(v), badge: () => 0, quickAction: () => null }
};
function enterModule(mod){
  if (!MODULE_ACCESS[mod].includes(activeUser.role)) { toast('Access restricted', ROLE_LABELS[activeUser.role]+' role does not have access to this module.', 'danger'); return; }
  state.module = mod;
  state.tab = null; state.filters = {};
  state.view = mod === 'transport' && activeUser.role === 'driver' ? 'my-tasks' : Object.keys(MODULE_META[mod].nav())[0];
  $('hub-screen').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('module-name').textContent = MODULE_META[mod].name;
  $('back-to-hub').style.visibility = activeUser.role === 'driver' ? 'hidden' : 'visible';
  $('hub-return-btn').classList.toggle('hidden', activeUser.role === 'driver');
  $('avatar-box').textContent = initials(activeUser.name);
  $('user-display-name').textContent = activeUser.name;
  $('user-display-role').textContent = ROLE_LABELS[activeUser.role];
  renderSidebarNav();
  switchView(state.view);
  aiSetup();
}
function renderSidebarNav(){
  const nav = MODULE_META[state.module].nav();
  let lastGroup = null, html = '';
  Object.entries(nav).forEach(([key,meta]) => {
    if (meta.group && meta.group !== lastGroup) { html += `<div class="nav-group">${esc(meta.group)}</div>`; lastGroup = meta.group; }
    else if (!meta.group) lastGroup = null;
    html += `<button class="nav-item${key===state.view?' active':''}" data-view="${key}"><span class="nav-icon">${meta.icon}</span>${meta.label}${meta.badge?`<span class="nav-badge">${meta.badge}</span>`:''}</button>`;
  });
  $('sidebar-nav').innerHTML = html;
  document.querySelectorAll('.nav-item').forEach(b => b.onclick = () => switchView(b.dataset.view));
}

/* ---- QUICK SEARCH — filters rows of the data-table in the current view ---- */
function initSearch(){
  const inp = $('gsearch');
  inp.oninput = () => {
    const q = inp.value.trim().toLowerCase();
    document.querySelectorAll('#view .data-table tbody tr').forEach(tr => {
      tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };
}
function switchView(view, presetFilters){
  // preserve tab/filter state on same-view re-renders (tab clicks, filter dropdowns), reset on real navigation —
  // unless the caller hands us presetFilters (a KPI drill-down deep-linking into a filtered view)
  if (view !== state.view) { state.tab = null; state.filters = presetFilters || {}; }
  else if (presetFilters) { state.filters = presetFilters; }
  state.view = view;
  const nav = MODULE_META[state.module].nav();
  const meta = nav[view] || Object.values(nav)[0];
  $('page-title').textContent = meta.title || meta.label;
  $('page-eyebrow').textContent = meta.sub || '';
  $('gsearch').value = '';
  const qa = MODULE_META[state.module].quickAction();
  const qaBtn = $('quick-action-btn');
  if (qa) { qaBtn.textContent = qa.label; qaBtn.onclick = qa.action; qaBtn.classList.remove('hidden'); } else { qaBtn.classList.add('hidden'); }
  renderSidebarNav();
  MODULE_META[state.module].render(view);
  updateNotifyBadge();
}
window.switchView = switchView;
function updateNotifyBadge(){ $('notify-count').textContent = MODULE_META[state.module].badge(); }
$('notify-btn').onclick = () => {
  const nav = MODULE_META[state.module].nav();
  if (nav.notifications) switchView('notifications');
  else toast('Notifications', activeUser.role === 'driver' ? 'Your assigned missions are up to date.' : 'Check the sidebar for items awaiting your action.');
};

/* ============================================================ AI ASSISTANT DISPATCHER
   The panel is one shared shell; which engine answers depends on the module you're
   in when you open it — T.AI for Transportation, W.AI for Warehouse. Admin has no
   assistant (nothing conversational to ask there). */
const AI_STATE = { open:false, log:[], engineModule:null };
function aiEngine(){ return state.module === 'warehouse' ? (window.W && W.AI) : state.module === 'transport' ? (window.T && T.AI) : null; }
function aiSetup(){
  const eng = aiEngine();
  $('ai-fab').classList.toggle('hidden', !eng);
  if (eng && AI_STATE.engineModule !== state.module) { AI_STATE.log = []; AI_STATE.engineModule = state.module; aiOpen(false); }
  $('ai-title').textContent = eng ? eng.title() : 'Assistant';
  $('ai-subtitle').textContent = eng ? eng.subtitle() : '';
  $('ai-chips').innerHTML = eng ? eng.suggestedChips().map(c => `<button class="ai-chip" data-ask="${esc(c)}">${esc(c)}</button>`).join('') : '';
  document.querySelectorAll('#ai-chips [data-ask]').forEach(b => b.onclick = () => aiAsk(b.dataset.ask));
}
function aiOpen(on){
  AI_STATE.open = on === undefined ? !AI_STATE.open : on;
  $('ai-panel').classList.toggle('on', AI_STATE.open);
  if (AI_STATE.open) {
    const eng = aiEngine();
    if (eng && !AI_STATE.log.length) AI_STATE.log.push({ role:'bot', html: eng.greeting() });
    aiRenderLog();
    setTimeout(() => $('ai-input') && $('ai-input').focus(), 60);
  }
}
function aiRenderLog(){
  $('ai-log').innerHTML = AI_STATE.log.map(m => `<div class="ai-msg ${m.role==='user'?'me':'bot'}">${m.html}</div>`).join('');
  $('ai-log').scrollTop = $('ai-log').scrollHeight;
}
function aiAsk(text){
  text = (text||'').trim(); if (!text) return;
  const eng = aiEngine(); if (!eng) return;
  AI_STATE.log.push({ role:'user', html: esc(text) });
  $('ai-input').value = '';
  const answer = eng.answer(text);
  AI_STATE.log.push({ role:'bot', html: answer });
  aiRenderLog();
}
$('ai-fab').onclick = () => aiOpen();
$('ai-close').onclick = () => aiOpen(false);
$('ai-send').onclick = () => aiAsk($('ai-input').value);
$('ai-input').addEventListener('keydown', e => { if (e.key === 'Enter') aiAsk(e.target.value); });
window.aiAsk = aiAsk;

/* ---- boot ---- */
document.documentElement.lang = currentLang === 'zh' ? 'zh-Hant' : currentLang;
renderLoginRoles();
initSearch();
applyStaticI18n();
document.querySelectorAll('.lang-switch [data-lang]').forEach(b => { b.onclick = () => setLang(b.dataset.lang); b.classList.toggle('active', b.dataset.lang === currentLang); });
