"use strict";

const SYNC_CFG_KEY = "keystone.syncCfg";
const SYNC_REVS_KEY = "keystone.sliceRevs";
const SYNC_SNAPSHOT_KEY = "keystone.lastPushed";
const SYNC_COLLECTION_SLICES = ["subjects","timetable","marks","sessions","tasks"];
const SYNC_SINGLETON_SLICES = ["notes","goals","benchmarks","settings"];
const SYNC_ALL_SLICES = SYNC_COLLECTION_SLICES.concat(SYNC_SINGLETON_SLICES);
const GRAVE_TTL_MS = 180*24*60*60*1000;

let syncCfg = null;
try{ syncCfg = JSON.parse(localStorage.getItem(SYNC_CFG_KEY)||"null"); }catch(e){ syncCfg = null; }
let sb = null;
let syncSession = null;
let syncStatus = "idle";
let pushDebounceTimer = null;
let syncInFlight = false;
let syncErrorToasted = false;
let lastSyncSuccessAt = null;
let sliceRevs = {};
try{ sliceRevs = JSON.parse(localStorage.getItem(SYNC_REVS_KEY)||"{}"); }catch(e){ sliceRevs = {}; }
let lastPushedSnapshot = {};
try{ lastPushedSnapshot = JSON.parse(localStorage.getItem(SYNC_SNAPSHOT_KEY)||"{}"); }catch(e){ lastPushedSnapshot = {}; }
function saveSliceRevs(){ localStorage.setItem(SYNC_REVS_KEY, JSON.stringify(sliceRevs)); }
function saveSnapshot(){ localStorage.setItem(SYNC_SNAPSHOT_KEY, JSON.stringify(lastPushedSnapshot)); }

function scalarSignature(obj, excludeKeys){
  const keys = Object.keys(obj).filter(k=>!excludeKeys.includes(k)).sort();
  return JSON.stringify(keys.map(k=>obj[k]));
}
function stampFlatCollection(current, snapshotItems, graves, excludeKeys){
  excludeKeys = excludeKeys || ["u"];
  const now = Date.now();
  const snapById = new Map((snapshotItems||[]).map(it=>[it.id,it]));
  const curIds = new Set();
  (current||[]).forEach(it=>{
    curIds.add(it.id);
    const old = snapById.get(it.id);
    if(!old){ if(!it.u) it.u = now; }
    else if(scalarSignature(it, excludeKeys) !== scalarSignature(old, excludeKeys)){ it.u = now; }
  });
  snapById.forEach((_, id)=>{ if(!curIds.has(id)) graves.push({id, t:now}); });
}
function stampTasksSlice(currentCats, snapshotCats, graves){
  const snapCatsById = new Map((snapshotCats||[]).map(c=>[c.id,c]));
  stampFlatCollection(currentCats, snapshotCats, graves, ["u","tasks","groups"]);
  currentCats.forEach(cat=>{
    const snapCat = snapCatsById.get(cat.id);
    stampFlatCollection(cat.tasks, snapCat?snapCat.tasks:[], graves, ["u"]);
    const snapGroupsById = new Map(((snapCat&&snapCat.groups)||[]).map(g=>[g.id,g]));
    stampFlatCollection(cat.groups, snapCat?snapCat.groups:[], graves, ["u","tasks"]);
    cat.groups.forEach(g=>{
      const snapGroup = snapGroupsById.get(g.id);
      stampFlatCollection(g.tasks, snapGroup?snapGroup.tasks:[], graves, ["u"]);
    });
  });
}
function pruneGraves(graves){
  const cutoff = Date.now() - GRAVE_TTL_MS;
  return graves.filter(g=> g.t > cutoff);
}
function buildLocalPayloads(){
  const payloads = {};
  SYNC_COLLECTION_SLICES.forEach(slice=>{
    const prevPayload = lastPushedSnapshot[slice] || {items:[], graves:[]};
    const newGraves = [];
    if(slice==="tasks") stampTasksSlice(state.tasks, prevPayload.items, newGraves);
    else stampFlatCollection(state[slice], prevPayload.items, newGraves);
    payloads[slice] = { items: state[slice], graves: pruneGraves((prevPayload.graves||[]).concat(newGraves)) };
  });
  const settingsForSync = Object.assign({}, state.settings); delete settingsForSync.lastTab;
  payloads.settings = { value: settingsForSync };
  payloads.notes = { value: state.notes };
  payloads.goals = { value: state.goals };
  payloads.benchmarks = { value: state.benchmarks };
  return payloads;
}
function mergeGraveLists(a, b){
  const graves = new Map();
  (a||[]).concat(b||[]).forEach(g=>{
    const p = graves.get(g.id);
    if(!p || g.t > p.t) graves.set(g.id, g);
  });
  return graves;
}
function mergeFlatCollection(remotePayload, localPayload){
  const graves = mergeGraveLists(remotePayload.graves, localPayload.graves);
  const byId = new Map();
  (remotePayload.items||[]).concat(localPayload.items||[]).forEach(it=>{
    const p = byId.get(it.id);
    if(!p || (it.u||0) >= (p.u||0)) byId.set(it.id, it);
  });
  const items = [...byId.values()].filter(it=>{ const g = graves.get(it.id); return !g || (it.u||0) > g.t; });
  return { items, graves: pruneGraves([...graves.values()]) };
}
function pickNewer(remoteObj, localObj){
  if(!remoteObj) return localObj;
  if(!localObj) return remoteObj;
  return (localObj.u||0) >= (remoteObj.u||0) ? localObj : remoteObj;
}
function mergeTasksSlice(remotePayload, localPayload){
  const graves = mergeGraveLists(remotePayload.graves, localPayload.graves);
  const alive = it => { const g = graves.get(it.id); return !g || (it.u||0) > g.t; };
  function mergeTaskArr(remoteArr, localArr){
    const byId = new Map();
    (remoteArr||[]).concat(localArr||[]).forEach(t=>{
      const p = byId.get(t.id);
      if(!p || (t.u||0) >= (p.u||0)) byId.set(t.id, t);
    });
    const arr = [...byId.values()].filter(alive);
    const ids = new Set(arr.map(t=>t.id));
    arr.forEach(t=>{ if(t.parentId && !ids.has(t.parentId)) t.parentId = null; });
    return arr;
  }
  function mergeGroupArr(remoteGroups, localGroups){
    const ids = new Set((remoteGroups||[]).concat(localGroups||[]).map(g=>g.id));
    const remoteById = new Map((remoteGroups||[]).map(g=>[g.id,g]));
    const localById = new Map((localGroups||[]).map(g=>[g.id,g]));
    const out = [];
    ids.forEach(id=>{
      const r = remoteById.get(id), l = localById.get(id);
      const winner = pickNewer(r, l);
      if(!alive(winner)) return;
      out.push(Object.assign({}, winner, { tasks: mergeTaskArr(r?r.tasks:[], l?l.tasks:[]) }));
    });
    return out;
  }
  const catIds = new Set((remotePayload.items||[]).concat(localPayload.items||[]).map(c=>c.id));
  const remoteById = new Map((remotePayload.items||[]).map(c=>[c.id,c]));
  const localById = new Map((localPayload.items||[]).map(c=>[c.id,c]));
  const cats = [];
  catIds.forEach(id=>{
    const r = remoteById.get(id), l = localById.get(id);
    const winner = pickNewer(r, l);
    if(!alive(winner)) return;
    cats.push(Object.assign({}, winner, {
      tasks: mergeTaskArr(r?r.tasks:[], l?l.tasks:[]),
      groups: mergeGroupArr(r?r.groups:[], l?l.groups:[])
    }));
  });
  return { items: cats, graves: pruneGraves([...graves.values()]) };
}
function mergeSlicePayload(slice, remotePayload, localPayload){
  if(slice==="tasks") return mergeTasksSlice(remotePayload, localPayload);
  return mergeFlatCollection(remotePayload, localPayload);
}
function applySlicePayload(slice, payload){
  if(SYNC_COLLECTION_SLICES.includes(slice)) state[slice] = payload.items;
  else if(slice==="settings") state.settings = Object.assign({}, payload.value, { lastTab: state.settings.lastTab });
  else state[slice] = payload.value;
}

async function initSync(){
  if(!syncCfg || !syncCfg.url || !syncCfg.anonKey) return;
  if(typeof window.supabase==="undefined"){ syncStatus="error"; return; }
  try{
    sb = window.supabase.createClient(syncCfg.url, syncCfg.anonKey);
  }catch(e){ syncStatus="error"; return; }
  sb.auth.onAuthStateChange((event, session)=>{
    syncSession = session;
    if(event==="PASSWORD_RECOVERY"){
      syncSession = session;
      const newPw = prompt("Enter your new password (at least 6 characters):");
      if(newPw && newPw.length >= 6){
        sb.auth.updateUser({ password: newPw }).then(({ error })=>{
          if(error) toast("Couldn't reset password: "+error.message);
          else{ toast("Password updated! Signing in…"); sb.auth.signOut(); }
        });
      }
    } else if(event==="SIGNED_IN" || (event==="INITIAL_SESSION" && session)){
      syncNow();
    } else if(event==="SIGNED_OUT"){
      syncSession=null; syncStatus="idle";
      sliceRevs={}; lastPushedSnapshot={};
      localStorage.removeItem(SYNC_REVS_KEY); localStorage.removeItem(SYNC_SNAPSHOT_KEY);
      if(document.getElementById("syncPanel")) renderSyncPanel();
    }
  });
  document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") syncNow(); });
  window.addEventListener("focus", ()=> syncNow());
  setInterval(()=>{ if(document.visibilityState==="visible") syncNow(); }, 45000);
}
async function syncNow(manual){
  if(!sb || !syncSession){ if(manual) toast("Not signed in"); return; }
  if(syncInFlight){ if(manual) toast("Already syncing…"); return; }
  syncInFlight = true;
  syncStatus = "checking";
  if(document.getElementById("syncPanel")) renderSyncPanel();
  try{
    const { data: rows, error } = await sb.from("user_slices").select("slice,data,rev").eq("user_id", syncSession.user.id);
    if(error) throw error;
    const remoteBySlice = {};
    (rows||[]).forEach(r=> remoteBySlice[r.slice] = r);
    const localPayloads = buildLocalPayloads();
    let changed = false;
    SYNC_ALL_SLICES.forEach(slice=>{
      const remote = remoteBySlice[slice];
      if(!remote) return;
      if(sliceRevs[slice] === remote.rev) return;
      let merged;
      if(SYNC_COLLECTION_SLICES.includes(slice)){
        merged = mergeSlicePayload(slice, remote.data, localPayloads[slice]);
      } else {
        const hasSyncedBefore = Object.prototype.hasOwnProperty.call(lastPushedSnapshot, slice);
        const localIsDirty = hasSyncedBefore && JSON.stringify(localPayloads[slice]) !== JSON.stringify(lastPushedSnapshot[slice]);
        merged = localIsDirty ? localPayloads[slice] : remote.data;
      }
      applySlicePayload(slice, merged);
      localPayloads[slice] = merged;
      sliceRevs[slice] = remote.rev;
      if(JSON.stringify(merged) === JSON.stringify(remote.data)) lastPushedSnapshot[slice] = merged;
      changed = true;
    });
    if(changed){
      localStorage.setItem(KEY, JSON.stringify(state));
      saveSliceRevs(); saveSnapshot();
      applyTheme(); renderNav(); renderStreakChip();
      const typing = document.activeElement && ["INPUT","TEXTAREA"].includes(document.activeElement.tagName);
      if(!typing) switchTab(state.settings.lastTab || "overview");
    }
    syncInFlight = false;
    const pushOk = await pushDirtySlices(localPayloads);
    if(pushOk){
      syncStatus = "synced";
      lastSyncSuccessAt = Date.now();
      syncErrorToasted = false;
      if(manual) toast("Synced");
    } else {
      syncStatus = "error";
      if(manual || !syncErrorToasted){ toast("Sync error — will retry"); syncErrorToasted = true; }
    }
  }catch(e){
    syncStatus = "error";
    const msg = (e && e.message) ? e.message : "unknown error";
    if(manual || !syncErrorToasted){ toast("Sync error: "+msg); syncErrorToasted = true; }
  }finally{
    syncInFlight = false;
    if(document.getElementById("syncPanel")) renderSyncPanel();
  }
}
async function pushDirtySlices(localPayloads){
  if(!sb || !syncSession) return false;
  try{
    const payloads = localPayloads || buildLocalPayloads();
    const dirty = SYNC_ALL_SLICES.filter(slice=> JSON.stringify(payloads[slice]) !== JSON.stringify(lastPushedSnapshot[slice]||null));
    let ok = true;
    for(const slice of dirty){
      const success = await pushSlice(slice, payloads[slice], 0);
      if(!success) ok = false;
    }
    if(document.getElementById("syncPanel")) renderSyncPanel();
    return ok;
  }catch(e){
    if(!syncErrorToasted){ toast("Sync error: "+((e&&e.message)||"unknown error")); syncErrorToasted = true; }
    syncStatus = "error";
    if(document.getElementById("syncPanel")) renderSyncPanel();
    return false;
  }
}
async function pushSlice(slice, payload, attempt){
  if(!sb || !syncSession) return false;
  if(attempt>3) return false;
  const expectedRev = sliceRevs[slice] || 0;
  const nowIso = new Date().toISOString();
  if(expectedRev===0){
    const { error: insErr } = await sb.from("user_slices").insert({ user_id:syncSession.user.id, slice, data:payload, rev:1, updated_at:nowIso });
    if(!insErr){ sliceRevs[slice]=1; lastPushedSnapshot[slice]=payload; saveSliceRevs(); saveSnapshot(); return true; }
  } else {
    const { data, error } = await sb.from("user_slices")
      .update({ data: payload, rev: expectedRev+1, updated_at: nowIso })
      .eq("user_id", syncSession.user.id).eq("slice", slice).eq("rev", expectedRev)
      .select("rev");
    if(!error && data && data.length){ sliceRevs[slice]=expectedRev+1; lastPushedSnapshot[slice]=payload; saveSliceRevs(); saveSnapshot(); return true; }
  }
  const { data: existing, error: selErr } = await sb.from("user_slices").select("data,rev").eq("user_id",syncSession.user.id).eq("slice",slice).maybeSingle();
  if(selErr || !existing) return false;
  const merged = SYNC_COLLECTION_SLICES.includes(slice) ? mergeSlicePayload(slice, existing.data, payload) : payload;
  applySlicePayload(slice, merged);
  localStorage.setItem(KEY, JSON.stringify(state));
  sliceRevs[slice] = existing.rev; saveSliceRevs();
  return await pushSlice(slice, merged, attempt+1);
}
function schedulePush(){
  if(!sb || !syncSession) return;
  clearTimeout(pushDebounceTimer);
  pushDebounceTimer = setTimeout(()=>{ pushDebounceTimer = null; pushDirtySlices(); }, 2000);
}
function renderSyncPanel(){
  const el = document.getElementById("syncPanel");
  if(!el) return;
  if(!syncCfg){
    el.innerHTML = `
      <p style="font-size:12.5px; color:var(--text-dim); margin-bottom:12px;">Connect a free Supabase project to sync your data across devices.</p>
      <label class="field">Project URL<input class="input" id="syncUrl" placeholder="https://xxxx.supabase.co"></label>
      <label class="field">Publishable key<input class="input" id="syncKey" placeholder="eyJ..."></label>
      <button class="btn btn-primary" id="syncConnectBtn">Connect</button>`;
    el.querySelector("#syncConnectBtn").addEventListener("click", ()=>{
      const url = el.querySelector("#syncUrl").value.trim();
      const key = el.querySelector("#syncKey").value.trim();
      if(!url || !key){ toast("Enter both the project URL and anon key"); return; }
      syncCfg = {url, anonKey:key};
      localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(syncCfg));
      initSync();
      renderSyncPanel();
    });
    return;
  }
  if(!syncSession){
    el.innerHTML = `
      <p style="font-size:12.5px; color:var(--text-dim); margin-bottom:12px;">Sign in with email &amp; password to sync across devices. <b>Make an account once</b>, then just sign in.</p>
      <label class="field">Email<input class="input" id="syncEmail" type="email" placeholder="you@example.com" autocomplete="email"></label>
      <label class="field">Password<input class="input" id="syncPassword" type="password" placeholder="Enter password" autocomplete="current-password"></label>
      <div id="syncAuthError" style="font-size:12.5px; color:var(--danger); margin-bottom:8px; display:none;"></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-primary" id="syncSignInBtn" style="flex:1; min-width:100px;">Sign in</button>
        <button class="btn" id="syncSignUpBtn" style="flex:1; min-width:100px;">Sign up</button>
      </div>
      <button class="btn btn-sm" id="syncForgotPw" style="margin-top:4px;">Forgot password?</button>
      <button class="btn btn-sm" id="syncForget" style="margin-top:4px;">Use a different project</button>`;
    const showError = msg => {
      const errEl = el.querySelector("#syncAuthError");
      if(msg){ errEl.textContent = msg; errEl.style.display = "block"; }
      else errEl.style.display = "none";
    };
    el.querySelector("#syncSignInBtn").addEventListener("click", async ()=>{
      const email = el.querySelector("#syncEmail").value.trim();
      const password = el.querySelector("#syncPassword").value;
      if(!email || !password){ toast("Enter your email and password"); return; }
      showError(null);
      const btn = el.querySelector("#syncSignInBtn"); btn.textContent = "Signing in…"; btn.disabled = true;
      const { error } = await sb.auth.signInWithPassword({ email, password });
      btn.textContent = "Sign in"; btn.disabled = false;
      if(error) showError(error.message);
    });
    el.querySelector("#syncSignUpBtn").addEventListener("click", async ()=>{
      const email = el.querySelector("#syncEmail").value.trim();
      const password = el.querySelector("#syncPassword").value;
      if(!email || !password){ toast("Enter your email and password"); return; }
      if(password.length < 6){ toast("Password must be at least 6 characters"); return; }
      showError(null);
      const btn = el.querySelector("#syncSignUpBtn"); btn.textContent = "Signing up…"; btn.disabled = true;
      const { data, error } = await sb.auth.signUp({ email, password });
      btn.textContent = "Sign up"; btn.disabled = false;
      if(error) showError(error.message);
      else if(data.user && !data.session) toast("Check your email for a confirmation link, then sign in");
    });
    el.querySelector("#syncForgotPw").addEventListener("click", async ()=>{
      const email = el.querySelector("#syncEmail").value.trim();
      if(!email){ toast("Enter your email first"); return; }
      const { error } = await sb.auth.resetPasswordForEmail({ email, redirectTo: window.location.origin + window.location.pathname });
      if(error) showError(error.message);
      else toast("Check your email for a password reset link");
    });
    el.querySelector("#syncForget").addEventListener("click", ()=>{
      if(confirm("Disconnect this Supabase project? Your data stays as-is, both locally and in the cloud.")){
        localStorage.removeItem(SYNC_CFG_KEY); syncCfg=null; sb=null; syncSession=null; renderSyncPanel();
      }
    });
    el.querySelector("#syncEmail").addEventListener("keydown", e=>{ if(e.key==="Enter") el.querySelector("#syncPassword").focus(); });
    el.querySelector("#syncPassword").addEventListener("keydown", e=>{ if(e.key==="Enter") el.querySelector("#syncSignInBtn").click(); });
    return;
  }
  const statusText = syncStatus==="checking" ? "Checking…" : syncStatus==="error" ? "Sync error — will retry" : "Synced";
  const lastSyncedText = lastSyncSuccessAt ? "Last synced "+timeAgoShort(Date.now()-lastSyncSuccessAt)+" ago" : "Not synced yet this session";
  el.innerHTML = `
    <div style="font-size:13px; margin-bottom:4px; overflow-wrap:anywhere;">Signed in as <b>${escapeHtml(syncSession.user.email)}</b></div>
    <div class="badge ${syncStatus==='error'?'badge-danger':'badge-success'}" style="margin-bottom:6px;">${statusText}</div>
    <div style="font-size:11.5px; color:var(--text-faint); margin-bottom:14px;">${lastSyncedText}</div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button class="btn btn-primary" id="syncNowBtn">Sync now</button>
      <button class="btn" id="syncSignOut">Sign out</button>
    </div>`;
  el.querySelector("#syncNowBtn").addEventListener("click", async ()=>{
    const btn = el.querySelector("#syncNowBtn"); btn.textContent="Syncing…"; btn.disabled=true;
    await syncNow(true);
    btn.textContent="Sync now"; btn.disabled=false;
  });
  el.querySelector("#syncSignOut").addEventListener("click", async ()=>{ await sb.auth.signOut(); });
}
function timeAgoShort(ms){
  const s = Math.round(ms/1000);
  if(s<60) return s+"s";
  const m = Math.round(s/60);
  if(m<60) return m+"m";
  const h = Math.round(m/60);
  return h+"h";
}
