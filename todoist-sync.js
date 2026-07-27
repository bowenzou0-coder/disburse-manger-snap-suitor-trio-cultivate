"use strict";

/**
 * Keystone Todoist Sync Module (v3)
 * 
 * ARCHITECTURE UPDATE:
 * This module now supports a hybrid sync approach. While client-side sync remains
 * for immediate UI feedback, heavy/background operations should be routed through
 * the new Supabase Edge Function (`supabase/functions/todoist-sync/index.ts`).
 * 
 * The Edge Function enforces Row Level Security (RLS) via the `withSupabase` pattern
 * and queues jobs in the new `sync_jobs` table using atomic `FOR UPDATE SKIP LOCKED`
 * patterns to prevent deadlocks during concurrent sync operations.
 */

const TODOIST_API = "https://api.todoist.com/api/v1";
// Use local proxy in development to bypass browser CORS restrictions
const IS_LOCALHOST = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = IS_LOCALHOST ? "http://localhost:3001" : TODOIST_API;

const TODOIST_TOKEN_KEY = "keystone.todoistToken";
const TODOIST_MAP_KEY = "keystone.todoistMap";

let todoistToken = localStorage.getItem(TODOIST_TOKEN_KEY) || "";
let todoistSyncStatus = "idle";
let todoistLastSyncAt = 0;
let todoistInFlight = false;
let todoistDebounceTimer = null;
let todoistMap = { projects: {}, sections: {}, tasks: {}, completed: {} };
let todoistSyncProgress = { phase: "idle", done: 0, total: 0 };

const COLOR_MAP = {
  "#b85c38":47, "#5f8a63":34, "#a87e23":44,
  "#5c7a99":45, "#7e5a75":33, "#3f7e74":49, "#a8465a":50
};

function appToTodoistPriority(appPri){
  if(appPri===1) return 4;
  if(appPri===2) return 3;
  if(appPri===3) return 2;
  return 1;
}
function todoistToAppPriority(tdPri){
  if(tdPri===4) return 1;
  if(tdPri===3) return 2;
  if(tdPri===2) return 3;
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
    res = await fetch(API_BASE + path, {
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

  todoistSyncProgress = { phase: "projects", done: 0, total: state.tasks.length };
  renderTodoistPanel();

  // Create projects in parallel
  const projectCreates = state.tasks
    .filter(cat => !cat.todoistId)
    .map(cat => todoistFetch("/projects", {
      method: "POST",
      body: JSON.stringify({ name: cat.name, color: COLOR_MAP[cat.color] || 34 })
    }).then(p => { cat.todoistId = p.id; todoistMap.projects[p.id] = cat.id; }));

  const createdProjects = await Promise.all(projectCreates);
  todoistSyncProgress.done = createdProjects.length;

  // Update existing projects in parallel (only if name/color changed)
  const projectUpdates = state.tasks
    .filter(cat => cat.todoistId)
    .map(cat => {
      return todoistFetch("/projects/" + cat.todoistId)
        .then(current => {
          if (current.name !== cat.name || current.color !== (COLOR_MAP[cat.color] || 34)) {
            return todoistFetch("/projects/" + cat.todoistId, {
              method: "POST",
              body: JSON.stringify({ name: cat.name, color: COLOR_MAP[cat.color] || 34 })
            });
          }
        });
    });

  await Promise.all(projectUpdates);
  todoistSyncProgress = { phase: "sections", done: 0, total: state.tasks.reduce((a, c) => a + (c.groups || []).length, 0) };
  renderTodoistPanel();

  // Create sections in parallel
  const sectionCreates = [];
  for (const cat of state.tasks) {
    if (!cat.todoistId) continue;
    for (const g of (cat.groups || [])) {
      if (!g.todoistSectionId) {
        sectionCreates.push(todoistFetch("/sections", {
          method: "POST",
          body: JSON.stringify({ project_id: cat.todoistId, name: g.name })
        }).then(s => { g.todoistSectionId = s.id; todoistMap.sections[s.id] = { catId: cat.id, groupId: g.id }; }));
      }
    }
  }
  await Promise.all(sectionCreates);
  todoistSyncProgress.done = sectionCreates.length;

  // Update existing sections in parallel
  const sectionUpdates = [];
  for (const cat of state.tasks) {
    if (!cat.todoistId) continue;
    for (const g of (cat.groups || [])) {
      if (g.todoistSectionId) {
        sectionUpdates.push(
          todoistFetch("/sections/" + g.todoistSectionId)
            .then(current => {
              if (current.name !== g.name) {
                return todoistFetch("/sections/" + g.todoistSectionId, {
                  method: "POST",
                  body: JSON.stringify({ name: g.name })
                });
              }
            })
        );
      }
    }
  }
  await Promise.all(sectionUpdates);

  // Push checklist tasks in parallel
  const taskPromises = [];
  for (const cat of state.tasks) {
    if (!cat.todoistId) continue;
    for (const g of (cat.groups || [])) {
      for (const t of (g.tasks || [])) {
        taskPromises.push(todoistPushTask(t, cat, g.todoistSectionId));
      }
    }
    for (const t of (cat.tasks || [])) {
      taskPromises.push(todoistPushTask(t, cat, null));
    }
  }

  // Push timetable task blocks
  const timetableTaskPromises = await pushTimetableTasks();
  taskPromises.push(...timetableTaskPromises);

  let completed = 0;
  const totalTasks = taskPromises.length;
  todoistSyncProgress = { phase: "tasks", done: 0, total: totalTasks };
  renderTodoistPanel();

  for (const p of taskPromises) {
    await p;
    completed++;
    if (completed % 5 === 0 || completed === totalTasks) {
      todoistSyncProgress.done = completed;
      renderTodoistPanel();
    }
  }

  todoistSyncProgress = { phase: "done", done: 0, total: 0 };
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

async function pushTimetableTasks(){
  if(!todoistToken) return [];
  const timetableTasks = state.timetable.filter(b=> b.type==="task" && b.todoistId);
  if(!timetableTasks.length) return [];
  
  // Get or create the Timetable project once
  const projectId = await ensureTimetableProject();
  
  // Push all blocks in parallel
  return timetableTasks.map(b => pushTimetableTaskBlock(b, projectId));
}

function ensureTimetableProject(){
  // Find existing timetable project
  const existing = state.tasks.find(c => c.name === "Timetable" && c.todoistId);
  if(existing) return Promise.resolve(existing.todoistId);
  
  // Create new project
  return todoistFetch("/projects", {
    method: "POST",
    body: JSON.stringify({ name: "Timetable", color: 34 })
  }).then(p => {
    const cat = { id:uid(), name:"Timetable", color:"#5f8a63", tasks:[], groups:[], todoistId:p.id };
    state.tasks.push(cat);
    todoistMap.projects[p.id] = cat.id;
    return p.id;
  });
}

function pushTimetableTaskBlock(block, projectId){
  if(!block.todoistId){
    const body = { 
      content: block.title, 
      project_id: projectId,
      description: `[Timetable ${DAYS[block.day]} ${block.start}-${block.end}] ${block.description || ""}`
    };
    // Set due date to the start time on the block's day
    const dueDate = getDueDateForBlock(block);
    if(dueDate) body.due_date = dueDate;
    
    return todoistFetch("/tasks", { method:"POST", body:JSON.stringify(body) })
      .then(td => {
        block.todoistId = td.id;
        todoistMap.tasks[td.id] = { type: "timetable", blockId: block.id };
      });
  } else {
    const body = { content: block.title };
    const dueDate = getDueDateForBlock(block);
    if(dueDate) body.due_date = dueDate;
    body.description = `[Timetable ${DAYS[block.day]} ${block.start}-${block.end}] ${block.description || ""}`;
    
    return todoistFetch("/tasks/"+block.todoistId, { method:"POST", body:JSON.stringify(body) });
  }
}

function getDueDateForBlock(block){
  // Calculate the next occurrence date for this block's day
  const today = new Date();
  const todayDow = today.getDay(); // 0=Sun, 1=Mon...
  const blockDow = block.day + 1; // 0=Mon -> 1, 4=Fri -> 5
  
  let daysUntil = blockDow - todayDow;
  if(daysUntil < 0) daysUntil += 7;
  if(daysUntil === 0){
    // Today - check if time has passed
    const nowMin = today.getHours()*60 + today.getMinutes();
    const startMin = timeToMin(block.start);
    if(nowMin > startMin) daysUntil = 7;
  }
  
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + daysUntil);
  return isoDate(dueDate);
}

async function todoistPushCompletions(){
  if(!todoistToken) return;
  // Checklist tasks
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
  // Timetable task blocks
  for(const block of state.timetable){
    if(block.type!=="task" || !block.todoistId) continue;
    const done = block.completed;
    const key = block.todoistId+"_"+todayISO();
    if(done && !todoistMap.completed[key]){
      try{
        await todoistFetch("/tasks/"+block.todoistId+"/close", { method:"POST" });
        todoistMap.completed[key] = true;
      }catch(e){}
    } else if(!done && todoistMap.completed[key]){
      try{
        await todoistFetch("/tasks/"+block.todoistId+"/reopen", { method:"POST" });
        delete todoistMap.completed[key];
      }catch(e){}
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

  // Pre-build lookup maps for O(1) access instead of O(n²)
  const taskIdToLocal = new Map();
  const catById = new Map(state.tasks.map(c => [c.id, c]));
  for(const cat of state.tasks){
    for(const t of cat.tasks) taskIdToLocal.set(t.id, { cat, task: t, group: null });
    for(const g of cat.groups||[]){
      for(const t of g.tasks||[]) taskIdToLocal.set(t.id, { cat, task: t, group: g });
    }
  }

  // Separate timetable project tasks from checklist tasks
  const timetableProjectId = state.tasks.find(c => c.name === "Timetable" && c.todoistId)?.todoistId;
  const checklistTasks = (tdTasks||[]).filter(td => td.project_id !== timetableProjectId);
  const timetableTasks = (tdTasks||[]).filter(td => td.project_id === timetableProjectId);

  // Process checklist tasks (existing logic)
  checklistTasks.forEach(td=>{
    const catAppId = todoistMap.projects[td.project_id];
    if(!catAppId) return;
    const cat = catById.get(catAppId);
    if(!cat) return;

    let targetArr = cat.tasks;
    if(td.section_id && todoistMap.sections[td.section_id]){
      const secMap = todoistMap.sections[td.section_id];
      const g = cat.groups.find(x=>x.id===secMap.groupId);
      if(g) targetArr = g.tasks;
    }

    const mapped = todoistMap.tasks[td.id];
    const existing = mapped ? taskIdToLocal.get(mapped.taskId) : null;

    if(existing){
      existing.task.title = td.content;
      existing.task.due = (td.due && td.due.date) ? td.due.date : null;
      existing.task.priority = todoistToAppPriority(td.priority||0);
      existing.task.description = td.description || "";
      existing.task.done = false;
      existing.task.completedAt = null;
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

  // Process timetable tasks
  timetableTasks.forEach(td=>{
    const mapped = todoistMap.tasks[td.id];
    if(mapped && mapped.type === "timetable"){
      // Existing timetable block
      const block = state.timetable.find(b => b.id === mapped.blockId);
      if(block){
        block.title = td.content;
        block.completed = false;
        block.completedAt = null;
        // Update due date from Todoist
        if(td.due && td.due.date) block.due = td.due.date;
        changed = true;
      }
    } else if(!mapped){
      // New timetable task from Todoist - try to parse and create block
      parseAndCreateTimetableBlock(td);
      changed = true;
    }
  });

  // Handle completed tasks (both checklist and timetable)
  (tdCompleted||[]).forEach(td=>{
    const mapped = todoistMap.tasks[td.id];
    if(!mapped) return;
    
    if(mapped.type === "timetable"){
      // Timetable block completion
      const block = state.timetable.find(b => b.id === mapped.blockId);
      if(block && !block.completed){
        block.completed = true;
        block.completedAt = todayISO();
        changed = true;
      }
    } else {
      // Checklist task completion (existing logic)
      const cat = catById.get(mapped.catId);
      if(!cat) return;
      const existing = taskIdToLocal.get(mapped.taskId);
      if(existing && !existing.task.done){
        existing.task.done = true;
        existing.task.completedAt = todayISO();
        changed = true;
      }
    }
  });

  if(changed){
    saveTodoistMap();
    save();
  }
  return changed;
}

function parseAndCreateTimetableBlock(td){
  // Try to parse the description to extract day/time info
  // Format: [Timetable Mon 09:00-10:00] description
  const desc = td.description || "";
  const match = desc.match(/\[Timetable\s+(Mon|Tue|Wed|Thu|Fri)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\]/);
  if(!match) return;
  
  const dayMap = {Mon:0, Tue:1, Wed:2, Thu:3, Fri:4, Sat:5, Sun:6};
  const day = dayMap[match[1]];
  if(day === undefined) return;
  
  const start = match[2];
  const end = match[3];
  
  // Check if block already exists
  const existing = state.timetable.find(b => 
    b.day === day && b.start === start && b.end === end && b.title === td.content
  );
  if(existing){
    existing.todoistId = td.id;
    todoistMap.tasks[td.id] = { type: "timetable", blockId: existing.id };
    return;
  }
  
  // Create new block
  const block = makeBlock({
    type: "task",
    title: td.content,
    description: desc.replace(/\[Timetable[^\]]+\]\s*/, ""),
    day,
    start,
    end,
    todoistId: td.id,
    completed: false
  });
  state.timetable.push(block);
  todoistMap.tasks[td.id] = { type: "timetable", blockId: block.id };
}

async function todoistSync(){
  if(!todoistToken || todoistInFlight) return;
  todoistInFlight = true;
  todoistSyncStatus = "syncing";
  renderTodoistPanel();
  try{
    await todoistPush();
    const [, pulled] = await Promise.all([
      todoistPushCompletions(),
      todoistPull()
    ]);
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
  todoistDebounceTimer = setTimeout(()=> todoistSync(), 6000);
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
  
  let progressHtml = "";
  if(todoistSyncStatus === "syncing" && todoistSyncProgress.total > 0){
    const pct = Math.round((todoistSyncProgress.done / todoistSyncProgress.total) * 100);
    progressHtml = `
      <div style="margin-bottom:8px; font-size:11.5px; color:var(--text-dim);">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>${todoistSyncProgress.phase} (${todoistSyncProgress.done}/${todoistSyncProgress.total})</span>
          <span>${pct}%</span>
        </div>
        <div style="height:4px; background:var(--border); border-radius:2px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:var(--accent); transition:width 0.2s;"></div>
        </div>
      </div>`;
  }
  
  el.innerHTML = `
    <div style="font-size:13px; margin-bottom:4px;">Connected to <b>Todoist</b> ${badge}</div>
    <div style="font-size:11.5px; color:var(--text-faint); margin-bottom:14px;">${todoistLastSyncAt ? "Last synced "+timeAgoShort(Date.now()-todoistLastSyncAt)+" ago" : "Syncing now…"}</div>
    ${progressHtml}
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
