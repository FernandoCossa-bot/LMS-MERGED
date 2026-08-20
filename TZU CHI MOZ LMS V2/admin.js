/* ============================================================
   TZU CHI MOZ LMS — System Administration module
   Namespace: A  (System Administrator only — see USERS.png)
   ============================================================ */
const A = {};
const tnA = k => t('navA.'+k+'.l'), tsA = k => t('navA.'+k+'.s');
A.NAV = () => {
  const nav = {
    users: {icon:'👤', label:tnA('users'), title:tnA('users'), sub:tsA('users'), group:t('groups.Administration')},
    roles: {icon:'🔑', label:tnA('roles'), title:tnA('roles'), sub:tsA('roles'), group:t('groups.Administration')}
  };
  if (hasPermFlag(activeUser,'audit')) nav.audit = {icon:'📜', label:tnA('audit'), title:tnA('audit'), sub:tsA('audit'), group:t('groups.Administration')};
  return nav;
};
A.render = view => view === 'roles' ? A.renderRoles() : view === 'audit' ? A.renderAudit() : A.renderUsers();

A.renderAudit = () => {
  $('view').innerHTML = `<div class="note">One trail across both modules — every requisition approval, trip dispatch, fuel top-up and stock adjustment writes here, whichever module it happened in.</div>
  <div class="card" style="margin-top:14px"><div class="card-header"><div><h3>Audit trail</h3><p>${AUDIT.length} entries this session</p></div></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>When</th><th>User</th><th>Role</th><th>Action</th><th>Detail</th></tr></thead><tbody>
  ${AUDIT.length ? AUDIT.map(a=>`<tr><td class="small">${fmtDT(a.at)}</td><td class="small">${esc(a.user)}</td><td class="small" style="color:var(--muted)">${esc(a.role)}</td><td class="small">${esc(a.action)}</td><td class="small" style="color:var(--muted)">${esc(a.detail)}</td></tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--muted)">No actions recorded yet this session.</td></tr>`}
  </tbody></table></div></div>`;
};

/* ============================================================ USER ACCOUNTS */
A.renderUsers = () => {
  const canManage = hasPermFlag(activeUser,'manageUsers');
  $('view').innerHTML = `<div class="card"><div class="card-header"><div><h3>User accounts</h3><p>${USERS.length} accounts across Transportation and Warehouse</p></div>${canManage?`<button class="primary-btn compact" onclick="A.openUserForm()">+ Add user</button>`:''}</div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>User</th><th>Role</th><th>Department / Position</th><th>Module access</th><th>Status</th><th></th></tr></thead><tbody>
  ${USERS.map(u=>{
    const mods = Object.keys(MODULE_ACCESS).filter(m=>MODULE_ACCESS[m].includes(u.role) && m!=='admin');
    return `<tr><td><strong>${esc(u.name)}</strong><br><small>${esc(u.email)}</small></td><td>${esc(ROLE_LABELS[u.role])}</td><td class="small">${esc(u.dept)}${u.position?`<br><small class="muted">${esc(u.position)}</small>`:''}</td><td>${mods.map(m=>`<span class="tag t-blue" style="margin-right:4px">${m}</span>`).join('')}</td><td>${u.active!==false?'<span class="status active">Active</span>':'<span class="status cancelled">Disabled</span>'}</td><td style="white-space:nowrap">${canManage?`<button class="action-btn" onclick="A.openUserForm(${u.id})">Edit</button> <button class="action-btn danger" onclick="A.removeUser(${u.id})">Remove</button>`:''}</td></tr>`;
  }).join('')}
  </tbody></table></div></div>
  <div class="role-note">${canManage ? 'Permissions are set per person here, not just by role — a System Administrator can grant or revoke any capability for any account below.' : 'Your account does not currently hold the "Manage Users" permission — ask another Administrator to grant it if you need to add, edit or remove accounts.'}</div>`;
};

A.PERM_GROUPS = ['Operational','Visibility','System'];
A.openUserForm = (id) => {
  const editing = !!id;
  const u = editing ? USERS.find(x=>x.id===id) : { id:null, name:'', username:'', email:'', phone:'', role:'coordinator', dept:'', position:'', active:true, perms:defaultPermsForRole('coordinator') };
  const checklist = A.PERM_GROUPS.map(g => `
    <div style="margin-bottom:10px"><p class="eyebrow blue" style="margin-bottom:6px">${esc(g)}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 14px">
    ${PERM_CATALOG.filter(e=>e.group===g).map(e=>`<label class="check"><input type="checkbox" name="perm_${e.key}" ${u.perms&&u.perms[e.key]?'checked':''}><span>${esc(e.label)}</span></label>`).join('')}
    </div></div>`).join('');
  showModal(`<p class="eyebrow blue">${editing?'Edit':'New'} User Account</p><h3>${editing?esc(u.name):'Add a team member'}</h3>
  <form id="user-form" class="form-grid">
    <label>Full Name<input name="name" value="${esc(u.name)}" required></label>
    <label>Username<input name="username" value="${esc(u.username)}" required></label>
    <label>Email<input name="email" type="email" value="${esc(u.email)}" required></label>
    <label>Phone / Contact<input name="phone" value="${esc(u.phone||'')}"></label>
    <label>Role<select name="role" id="uf-role">${Object.entries(ROLE_LABELS).map(([k,l])=>`<option value="${k}" ${u.role===k?'selected':''}>${esc(l)}</option>`).join('')}</select></label>
    <label>Department<input name="dept" value="${esc(u.dept)}" required></label>
    <label>Position<input name="position" value="${esc(u.position||'')}"></label>
    <label>Account Status<select name="active"><option value="1" ${u.active!==false?'selected':''}>Active</option><option value="0" ${u.active===false?'selected':''}>Disabled</option></select></label>
    <label class="full">Password ${editing?'(min 8 chars; leave blank to keep current)':'(min 8 chars)'}<input name="password" type="password" placeholder="${editing?'••••••••':''}" ${editing?'':'required'} minlength="8"></label>
    <label class="full">Permissions<span class="muted small" style="display:block;font-weight:400;margin-top:2px">Defaults come from the role above — tick or untick anything to override it for this person only.</span></label>
    <div class="full">${checklist}</div>
    <div class="full" style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px">
      <button type="button" class="action-btn" onclick="closeModal()">Cancel</button>
      <button type="submit" class="primary-btn compact">${editing?'Save User':'Add User'}</button>
    </div>
  </form>`);
  $('uf-role').onchange = e => {
    const rp = defaultPermsForRole(e.target.value);
    PERM_CATALOG.forEach(entry => { const box = document.querySelector(`[name="perm_${entry.key}"]`); if (box) box.checked = !!rp[entry.key]; });
  };
  $('user-form').onsubmit = ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const username = f.get('username').trim();
    if (USERS.some(x => x.username.toLowerCase()===username.toLowerCase() && x.id!==u.id)) { toast('Username already in use','Choose a different username.','danger'); return; }
    const perms = {}; PERM_CATALOG.forEach(e => perms[e.key] = !!f.get('perm_'+e.key));
    const record = {
      name: f.get('name').trim(), username, email: f.get('email').trim(), phone: f.get('phone').trim(),
      role: f.get('role'), dept: f.get('dept').trim(), position: f.get('position').trim(), active: f.get('active')==='1', perms
    };
    if (editing) {
      const pass = f.get('password');
      Object.assign(u, record, pass ? {password:pass} : {});
      audit('Updated user account', 'user', u.name+' ('+u.username+')');
      toast('Saved', u.name+' has been updated.');
    } else {
      const newUser = Object.assign({ id: ++userSeq, icon:'👤', password: f.get('password') }, record);
      USERS.push(newUser);
      audit('Created user account', 'user', newUser.name+' ('+newUser.username+')');
      toast('User added', newUser.name+' can now sign in.');
    }
    closeModal(); switchView('users'); renderLoginRoles();
  };
};
A.removeUser = id => {
  const u = USERS.find(x=>x.id===id); if (!u) return;
  if (activeUser.id === id) { toast('Cannot remove your own account', 'Ask another Administrator to do this.', 'danger'); return; }
  if (u.role==='admin' && USERS.filter(x=>x.role==='admin' && x.active!==false).length <= 1) { toast('Cannot remove the last active Administrator', '', 'danger'); return; }
  if (!confirm('Remove '+u.name+'? This cannot be undone in this session.')) return;
  USERS.splice(USERS.indexOf(u), 1);
  audit('Removed user account', 'user', u.name+' ('+u.username+')');
  toast('User removed', u.name);
  switchView('users'); renderLoginRoles();
};

A.renderRoles = () => {
  const rows = Object.entries(ROLE_LABELS).map(([key,label]) => {
    const mods = Object.keys(MODULE_ACCESS).filter(m=>MODULE_ACCESS[m].includes(key));
    const defaults = defaultPermsForRole(key);
    const grantedLabels = PERM_CATALOG.filter(e=>defaults[e.key]).map(e=>e.label);
    return `<tr><td><strong>${esc(label)}</strong><br><small class="muted">${esc(ROLE_TAGLINE[key])}</small></td><td>${mods.map(m=>`<span class="tag t-blue" style="margin-right:4px">${m}</span>`).join('')}</td><td class="small">${grantedLabels.length?grantedLabels.map(l=>`<span class="tag t-grey" style="margin:1px 3px 1px 0">${esc(l)}</span>`).join(''):'<span class="muted">Assigned tasks only</span>'}</td></tr>`;
  }).join('');
  $('view').innerHTML = `<div class="card"><div class="card-header"><div><h3>Roles & default permissions</h3><p>Per USERS.png governance model, plus the Driver role added for Transportation. These are starting defaults — individual accounts can be adjusted from User Accounts.</p></div></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Role</th><th>Module access</th><th>Default permissions</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
};
window.A = A;

/* All four modules are loaded by this point (admin.js is the last script tag),
   so it's safe to start the login screen's rolling metrics here — starting it
   from app.js itself would run before T/W exist and throw. */
startLoginStatRotation();
