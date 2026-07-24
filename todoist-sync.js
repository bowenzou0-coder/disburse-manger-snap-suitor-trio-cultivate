"use strict";

const TODOIST_API = "https://api.todoist.com/api/v1";
const TODOIST_TOKEN_KEY = "keystone.todoistToken";
const TODOIST_MAP_KEY = "keystone.todoistMap";

let todoistToken = localStorage.getItem(TODOIST_TOKEN_KEY) || "";
let todoistSyncStatus = "idle";
let todoistLastSyncAt = 0;
let todoistInFlight = false;
let todoistDebounceTimer = null;
let todoistMap = { projects: {}, sections: {}, tasks: {}, completed: {} };

const COLOR_MAP = {
  "#b85c38":47, "#5f8a63":34, "#a87e23":44,
  "#5c7a99":45, "#7e5a75":33, "#3f7e74":49, "#a8465a":50
};

function appToTodoistPriority(appPri){
  if(appPri===1) return 4;
  if(appPri===2) return 3;
  if(appPri===3) return 1;
  return 2;
}
function todoistToAppPriority(tdPri){
  if(tdPri>=3) return 1;
  if(tdPri===2) return 2;
  if(tdPri===1) return 3;
  return 0;
}

let todoistLastToastTs = 0;
let todoistToastCount = 0;

function todoistToast(msg){
  const now = Date.now();
  if(now - todoistLastToastTs < 8000){
    todoistToastCount++;
    if(todoistToastCount > 3) return;
  } else {
    todoistToastCount = 0;
  }
  todoistLastToastTs = now;
  toast(msg);
}

function todoistToArray(data){
  if(Array.isArray(data)) return data;
  if(data && typeof data==="object"){
    if(Array.isArray(data.results)) return data.results;
    if(Array.isArray(data.items)) return data.items;
    if(Array.isArray(data.data)) return data.data;
  }
  return [];
}

async function todoistFetch(path, opts, attempt){
  attempt = attempt || 0;
  opts = opts || {};
  if(!todoistToken) throw new Error("No Todoist token");
  const method = opts.method || "GET";
  const headers = { "Authorization": "Bearer " + todoistToken };
  if(method !== "GET") headers["Content-Type"] = "application/json";
  let res;
  try{
    res = await fetch(TODOIST_API + path, {
      method,
      headers,
      body: opts.body || undefined
    });
  }catch(e){
    if(attempt < 2){
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      return todoistFetch(path, opts, attempt + 1);
    }
    throw new Error("Network error — check your connection or disable ad blockers");
  }
  if(res.status===401) throw new Error("Invalid Todoist API token");
  if(res.status===429) throw new Error("Todoist rate limit — try again later");
  if(!res.ok) throw new Error("Todoist API "+res.status);
  const ct = res.headers.get("content-type")||"";
  if(!ct.includes("json") || res.status===204) return null;
  return await res.json();
}

function saveTodoistMap(){
  localStorage.setItem(TODOIST_MAP_KEY, JSON.stringify(todoistMap));
}
function loadTodoistMap(){
  try{
    const d = JSON.parse(localStorage.getItem(TODOIST_MAP_KEY)||"{}");
    todoistMap = { projects:d.projects||{}, sections:d.sections||{}, tasks:d.tasks||{}, completed:d.completed||{} };
  }catch(e){ todoistMap={projects:{},sections:{},tasks:{},completed:{}}; }
}

async function todoistPush(){
  if(!todoistToken || !state.tasks.length) return;

  for(const cat of state.tasks){
    if(!cat.todoistId){
      const p = await todoistFetch("/projects", {
        method:"POST",
        body:JSON.stringify({ name:cat.name, color:COLOR_MAP[cat.color]||34 })
      });
      cat.todoistId = p.id;
      todoistMap.projects[p.id] = cat.id;
    } else {
      try{ await todoistFetch("/projects/"+cat.todoistId, { method:"POST", body:JSON.stringify({ name:cat.name, color:COLOR_MAP[cat.color]||34 }) }); }catch(e){}
    }
    for(const g of (cat.groups||[])){
      if(!g.todoistSectionId){
        const s = await todoistFetch("/sections", {
          method:"POST",
          body:JSON.stringify({ project_id:cat.todoistId, name:g.name })
        });
        g.todoistSectionId = s.id;
        todoistMap.sections[s.id] = { catId:cat.id, groupId:g.id };
      } else {
        try{ await todoistFetch("/sections/"+g.todoistSectionId, { method:"POST", body:JSON.stringify({ name:g.name }) }); }catch(e){}
      }
    }

    for(const g of (cat.groups||[])){
      for(const t of (g.tasks||[])) await todoistPushTask(t, cat, g.todoistSectionId);
    }
    for(const t of (cat.tasks||[])) await todoistPushTask(t, cat, null);
  }

  saveTodoistMap();
  save();
}

async function todoistPushTask(t, cat, sectionId){
  if(!t.todoistId){
    const body = { content:t.title, project_id:cat.todoistId };
    if(t.priority) body.priority = appToTodoistPriority(t.priority);
    if(t.due) body.due_date = t.due;
    if(t.description) body.description = t.description;
    if(t.parentId){
      const parentAll = cat.tasks.concat((cat.groups||[]).reduce((a,g)=>a.concat(g.tasks||[]),[]));
      const parent = parentAll.find(x=>x.id===t.parentId);
      if(parent && parent.todoistId) body.parent_id = parent.todoistId;
    }
    if(!body.parent_id && sectionId) body.section_id = sectionId;
    const td = await todoistFetch("/tasks", { method:"POST", body:JSON.stringify(body) });
    t.todoistId = td.id;
    todoistMap.tasks[td.id] = { catId:cat.id, taskId:t.id };
  } else {
    const body = { content:t.title };
    if(t.priority) body.priority = appToTodoistPriority(t.priority);
    body.due_date = t.due || null;
    body.description = t.description || "";
    await todoistFetch("/tasks/"+t.todoistId, { method:"POST", body:JSON.stringify(body) });
  }
}

async function todoistPushCompletions(){
  if(!todoistToken) return;
  for(const cat of state.tasks){
    const allTasks = cat.tasks.concat((cat.groups||[]).reduce((a,g)=>a.concat(g.tasks||[]),[]));
    for(const t of allTasks){
      if(!t.todoistId) continue;
      const done = taskDoneToday(t);
      const key = t.todoistId+"_"+todayISO();
      if(done && !todoistMap.completed[key]){
        try{
          await todoistFetch("/tasks/"+t.todoistId+"/close", { method:"POST" });
          todoistMap.completed[key] = true;
        }catch(e){}
      } else if(!done && todoistMap.completed[key]){
        try{
          await todoistFetch("/tasks/"+t.todoistId+"/reopen", { method:"POST" });
          delete todoistMap.completed[key];
        }catch(e){}
      }
    }
  }
  saveTodoistMap();
}

async function todoistPull(){
  if(!todoistToken) return false;

  const [tdProjects, tdSections, tdTasks, tdCompleted] = await Promise.all([
    todoistFetch("/projects").then(todoistToArray),
    todoistFetch("/sections").then(todoistToArray),
    todoistFetch("/tasks").then(todoistToArray),
    todoistFetch("/tasks/completed").then(todoistToArray)
  ]);

  const completedIds = new Set((tdCompleted||[]).map(t=>t.id));

  let changed = false;
  const projById = {};
  (tdProjects||[]).forEach(p=>{
    projById[p.id] = p;
    if(!todoistMap.projects[p.id]){
      const cat = { id:uid(), name:p.name, color:"#888888", tasks:[], groups:[], todoistId:p.id };
      state.tasks.push(cat);
      todoistMap.projects[p.id] = cat.id;
      changed = true;
    }
  });

  const secById = {};
  (tdSections||[]).forEach(s=>{
    secById[s.id] = s;
    if(!todoistMap.sections[s.id]){
      const catAppId = todoistMap.projects[s.project_id];
      if(catAppId){
        const cat = state.tasks.find(c=>c.id===catAppId);
        if(cat){
          const g = { id:uid(), name:s.name, tasks:[], todoistSectionId:s.id };
          cat.groups.push(g);
          todoistMap.sections[s.id] = { catId:cat.id, groupId:g.id };
          changed = true;
        }
      }
    }
  });

  (tdTasks||[]).forEach(td=>{
    const catAppId = todoistMap.projects[td.project_id];
    if(!catAppId) return;
    const cat = state.tasks.find(c=>c.id===catAppId);
    if(!cat) return;

    let targetArr = cat.tasks;
    if(td.section_id && todoistMap.sections[td.section_id]){
      const secMap = todoistMap.sections[td.section_id];
      const g = cat.groups.find(x=>x.id===secMap.groupId);
      if(g) targetArr = g.tasks;
    }

    const allArr = cat.tasks.concat((cat.groups||[]).reduce((a,g)=>a.concat(g.tasks||[]),[]));
    const mapped = todoistMap.tasks[td.id];
    const existing = mapped ? allArr.find(x=>x.id===mapped.taskId) : null;

    if(existing){
      existing.title = td.content;
      existing.due = (td.due && td.due.date) ? td.due.date : null;
      existing.priority = todoistToAppPriority(td.priority||0);
      existing.description = td.description || "";
      existing.done = false;
      existing.completedAt = null;
      changed = true;
    } else {
      const newTask = makeTask({
        title:td.content,
        due:(td.due && td.due.date) ? td.due.date : null,
        priority:todoistToAppPriority(td.priority||0),
        description:td.description||"",
        done:false,
        completedAt:null,
        todoistId:td.id,
        parentId:(td.parent_id && todoistMap.tasks[td.parent_id]) ? todoistMap.tasks[td.parent_id].taskId : null
      });
      targetArr.push(newTask);
      todoistMap.tasks[td.id] = { catId:cat.id, taskId:newTask.id };
      changed = true;
    }
  });

  (tdCompleted||[]).forEach(td=>{
    const mapped = todoistMap.tasks[td.id];
    if(!mapped) return;
    const cat = state.tasks.find(c=>c.id===mapped.catId);
    if(!cat) return;
    const allArr = cat.tasks.concat((cat.groups||[]).reduce((a,g)=>a.concat(g.tasks||[]),[]));
    const existing = allArr.find(x=>x.id===mapped.taskId);
    if(existing && !existing.done){
      existing.done = true;
      existing.completedAt = todayISO();
      changed = true;
    }
  });

  if(changed){
    saveTodoistMap();
    save();
  }
  return changed;
}

async function todoistSync(){
  if(!todoistToken || todoistInFlight) return;
  todoistInFlight = true;
  todoistSyncStatus = "syncing";
  renderTodoistPanel();
  try{
    await todoistPush();
    await todoistPushCompletions();
    const pulled = await todoistPull();
    todoistSyncStatus = "synced";
    todoistLastSyncAt = Date.now();
    save();
    if(pulled && document.getElementById("tab-checklist").classList.contains("active")) renderChecklist();
  }catch(e){
    todoistSyncStatus = "error";
    console.error("Todoist sync error:", e);
    todoistToast("Todoist sync failed — "+e.message);
  }
  todoistInFlight = false;
  renderTodoistPanel();
}

function scheduleTodoistPush(){
  if(!todoistToken) return;
  clearTimeout(todoistDebounceTimer);
  todoistDebounceTimer = setTimeout(()=> todoistSync(), 3000);
}

function initTodoistSync(){
  loadTodoistMap();
  todoistToken = localStorage.getItem(TODOIST_TOKEN_KEY) || "";
}

function renderTodoistPanel(){
  const el = document.getElementById("todoistPanel");
  if(!el) return;
  if(!todoistToken){
    el.innerHTML = `
      <p style="font-size:12.5px; color:var(--text-dim); margin-bottom:12px;">Sync your Checklist with <b>Todoist</b>. Categories become projects, sections and tasks sync automatically.</p>
      <label class="field">API token<input class="input" id="tdTokenInput" placeholder="Paste your token here" type="password"></label>
      <p style="font-size:11px; color:var(--text-faint); margin-bottom:10px;">Find it at <b>Todoist → Settings → Integrations → Developer</b>.</p>
      <button class="btn btn-primary" id="tdConnectBtn">Connect</button>`;
    el.querySelector("#tdConnectBtn").addEventListener("click", ()=>{
      const v = el.querySelector("#tdTokenInput").value.trim();
      if(!v){ toast("Paste your Todoist API token"); return; }
      todoistToken = v;
      localStorage.setItem(TODOIST_TOKEN_KEY, v);
      toast("Connecting to Todoist…");
      todoistSync();
      renderTodoistPanel();
    });
    return;
  }
  const badge = todoistSyncStatus==="syncing" ? '<span class="badge badge-warn">Syncing…</span>'
    : todoistSyncStatus==="error" ? '<span class="badge badge-danger">Error</span>'
    : todoistSyncStatus==="synced" ? '<span class="badge badge-success">Synced</span>'
    : '<span class="badge badge-muted">Connected</span>';
  el.innerHTML = `
    <div style="font-size:13px; margin-bottom:4px;">Connected to <b>Todoist</b> ${badge}</div>
    <div style="font-size:11.5px; color:var(--text-faint); margin-bottom:14px;">${todoistLastSyncAt ? "Last synced "+timeAgoShort(Date.now()-todoistLastSyncAt)+" ago" : "Syncing now…"}</div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button class="btn btn-primary" id="tdSyncNowBtn">Sync now</button>
      <button class="btn" id="tdDisconnectBtn">Disconnect</button>
    </div>`;
  el.querySelector("#tdSyncNowBtn").addEventListener("click", async ()=>{
    const btn = el.querySelector("#tdSyncNowBtn"); btn.textContent="Syncing…"; btn.disabled=true;
    await todoistSync();
    btn.textContent="Sync now"; btn.disabled=false;
  });
  el.querySelector("#tdDisconnectBtn").addEventListener("click", ()=>{
    if(confirm("Disconnect from Todoist? Your local tasks won't be deleted.")){
      todoistToken = "";
      localStorage.removeItem(TODOIST_TOKEN_KEY);
      todoistMap = {projects:{},sections:{},tasks:{},completed:{}};
      saveTodoistMap();
      renderTodoistPanel();
    }
  });
}
