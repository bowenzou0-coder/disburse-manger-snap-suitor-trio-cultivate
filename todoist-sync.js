"use strict";

/**
 * Keystone Todoist Sync Module (v4)
 *
 * SYNC MODES:
 * - "keystone": Push local data to Todoist. Pull only imports NEW items (no local match).
 *                Never overwrites existing local data. Keystone is source of truth.
 * - "todoist": Pull overwrites everything. Todoist is source of truth.
 * - "bidirectional": Full two-way sync with conflict dialogs on name mismatches.
 *
 * SYNC ORDER: Pull → Push → Completions
 * Pulling first ensures the todoistMap is populated before push tries to create anything,
 * preventing duplicate project/task creation.
 */

const TODOIST_SYNC_API = "https://api.todoist.com/api/v1";
const IS_LOCALHOST = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = IS_LOCALHOST ? "http://localhost:3001" : TODOIST_SYNC_API;

const TODOIST_TOKEN_KEY = "keystone.todoistToken";
const TODOIST_MAP_KEY = "keystone.todoistMap";
const TODOIST_SYNC_MODE_KEY = "keystone.todoistSyncMode";

var todoistToken = localStorage.getItem(TODOIST_TOKEN_KEY) || "";
var todoistSyncMode = localStorage.getItem(TODOIST_SYNC_MODE_KEY) || "keystone";
var todoistSyncStatus = "idle";
var todoistLastSyncAt = 0;
var todoistInFlight = false;
var todoistDebounceTimer = null;
var todoistMap = { projects: {}, sections: {}, tasks: {}, completed: {} };
var todoistSyncProgress = { phase: "idle", done: 0, total: 0 };

var COLOR_MAP = {
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
  if(res.status===404) throw new Error("NOT_FOUND");
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

// ─── PUSH ────────────────────────────────────────────────────────────────────

async function todoistPush(){
  if(!todoistToken || !state.tasks.length) return;

  todoistSyncProgress = { phase: "projects", done: 0, total: state.tasks.length };
  renderTodoistPanel();

  const projectCreates = state.tasks
    .filter(cat => !cat.todoistId)
    .map(cat => todoistFetch("/projects", {
      method: "POST",
      body: JSON.stringify({ name: cat.name, color: COLOR_MAP[cat.color] || 34 })
    }).then(p => { cat.todoistId = p.id; todoistMap.projects[p.id] = cat.id; }));

  const createdProjects = await Promise.all(projectCreates);
  todoistSyncProgress.done = createdProjects.length;

  const projectUpdates = state.tasks
    .filter(cat => cat.todoistId)
    .map(async (cat) => {
      try {
        const current = await todoistFetch("/projects/" + cat.todoistId);
        if (current && (current.name !== cat.name || current.color !== (COLOR_MAP[cat.color] || 34))) {
          await todoistFetch("/projects/" + cat.todoistId, {
            method: "POST",
            body: JSON.stringify({ name: cat.name, color: COLOR_MAP[cat.color] || 34 })
          });
        }
      } catch (e) {
        if (e.message === "NOT_FOUND" || e.message.includes("Network error")) {
          console.warn(`[Todoist Sync] Project ID ${cat.todoistId} missing. Clearing ID to recreate.`);
          const oldId = cat.todoistId;
          cat.todoistId = null;
          delete todoistMap.projects[oldId];
        } else {
          throw e;
        }
      }
    });

  await Promise.all(projectUpdates);
  todoistSyncProgress = { phase: "sections", done: 0, total: state.tasks.reduce((a, c) => a + (c.groups || []).length, 0) };
  renderTodoistPanel();

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

  const sectionUpdates = [];
  for (const cat of state.tasks) {
    if (!cat.todoistId) continue;
    for (const g of (cat.groups || [])) {
      if (g.todoistSectionId) {
        sectionUpdates.push(
          (async () => {
            try {
              const current = await todoistFetch("/sections/" + g.todoistSectionId);
              if (current && current.name !== g.name) {
                await todoistFetch("/sections/" + g.todoistSectionId, {
                  method: "POST",
                  body: JSON.stringify({ name: g.name })
                });
              }
            } catch (e) {
              if (e.message === "NOT_FOUND" || e.message.includes("Network error")) {
                console.warn(`[Todoist Sync] Section ID ${g.todoistSectionId} missing. Clearing ID.`);
                const oldId = g.todoistSectionId;
                g.todoistSectionId = null;
                delete todoistMap.sections[oldId];
              } else {
                throw e;
              }
            }
          })()
        );
      }
    }
  }
  await Promise.all(sectionUpdates);

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
    try {
      const body = { content:t.title };
      if(t.priority) body.priority = appToTodoistPriority(t.priority);
      body.due_date = t.due || null;
      body.description = t.description || "";
      await todoistFetch("/tasks/"+t.todoistId, { method:"POST", body:JSON.stringify(body) });
    } catch (e) {
      if (e.message === "NOT_FOUND" || e.message.includes("Network error")) {
        console.warn(`[Todoist Sync] Task ID ${t.todoistId} missing. Clearing ID to recreate.`);
        const oldId = t.todoistId;
        t.todoistId = null;
        delete todoistMap.tasks[oldId];
        await todoistPushTask(t, cat, sectionId);
      } else {
        throw e;
      }
    }
  }
}

async function pushTimetableTasks(){
  if(!todoistToken) return [];
  const timetableTasks = state.timetable.filter(b=> b.type==="task" && b.todoistId);
  if(!timetableTasks.length) return [];
  const projectId = await ensureTimetableProject();
  return timetableTasks.map(b => pushTimetableTaskBlock(b, projectId));
}

function ensureTimetableProject(){
  const existing = state.tasks.find(c => c.name === "Timetable" && c.todoistId);
  if(existing) return Promise.resolve(existing.todoistId);
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

async function pushTimetableTaskBlock(block, projectId){
  if(!block.todoistId){
    const body = {
      content: block.title,
      project_id: projectId,
      description: `[Timetable ${DAYS[block.day]} ${block.start}-${block.end}] ${block.description || ""}`
    };
    const dueDate = getDueDateForBlock(block);
    if(dueDate) body.due_date = dueDate;
    const td = await todoistFetch("/tasks", { method:"POST", body:JSON.stringify(body) });
    block.todoistId = td.id;
    todoistMap.tasks[td.id] = { type: "timetable", blockId: block.id };
  } else {
    try {
      const body = { content: block.title };
      const dueDate = getDueDateForBlock(block);
      if(dueDate) body.due_date = dueDate;
      body.description = `[Timetable ${DAYS[block.day]} ${block.start}-${block.end}] ${block.description || ""}`;
      await todoistFetch("/tasks/"+block.todoistId, { method:"POST", body:JSON.stringify(body) });
    } catch (e) {
      if (e.message === "NOT_FOUND") {
        console.warn(`[Todoist Sync] Timetable Task ID ${block.todoistId} not found. Clearing ID to recreate.`);
        const oldId = block.todoistId;
        block.todoistId = null;
        delete todoistMap.tasks[oldId];
        await pushTimetableTaskBlock(block, projectId);
      } else {
        throw e;
      }
    }
  }
}

function getDueDateForBlock(block){
  const today = new Date();
  const todayDow = today.getDay();
  const blockDow = block.day + 1;
  let daysUntil = blockDow - todayDow;
  if(daysUntil < 0) daysUntil += 7;
  if(daysUntil === 0){
    const nowMin = today.getHours()*60 + today.getMinutes();
    const startMin = timeToMin(block.start);
    if(nowMin > startMin) daysUntil = 7;
  }
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + daysUntil);
  return isoDate(dueDate);
}

// ─── COMPLETIONS ─────────────────────────────────────────────────────────────

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

// ─── PULL ────────────────────────────────────────────────────────────────────

async function todoistPull(){
  if(!todoistToken) return false;

  const [tdProjects, tdSections, tdTasks, tdCompleted] = await Promise.all([
    todoistFetch("/projects").then(todoistToArray),
    todoistFetch("/sections").then(todoistToArray),
    todoistFetch("/tasks").then(todoistToArray),
    todoistFetch("/tasks/completed").then(todoistToArray)
  ]);

  let changed = false;
  const mode = todoistSyncMode;

  // Build reverse lookup: local category name → local category (for name-based matching)
  const localCatByName = {};
  for(const cat of state.tasks){
    localCatByName[cat.name.toLowerCase()] = cat;
  }

  // ── Projects ──
  const projById = {};
  (tdProjects||[]).forEach(p=>{
    projById[p.id] = p;
    if(todoistMap.projects[p.id]){
      // Already mapped — nothing to do
      return;
    }
    // Not mapped — try to find a local category by name
    const localMatch = localCatByName[p.name.toLowerCase()];
    if(localMatch && !localMatch.todoistId){
      // Link existing local category to this Todoist project
      localMatch.todoistId = p.id;
      todoistMap.projects[p.id] = localMatch.id;
      changed = true;
    } else {
      // No local match — import as new (but only if mode allows it)
      if(mode !== "keystone"){
        const cat = { id:uid(), name:p.name, color:"#888888", tasks:[], groups:[], todoistId:p.id };
        state.tasks.push(cat);
        todoistMap.projects[p.id] = cat.id;
        changed = true;
      }
      // In keystone mode: skip importing unknown Todoist projects
    }
  });

  // ── Sections ──
  // Build reverse lookup: local group name → local group (within each category)
  const localGroupByName = {};
  for(const cat of state.tasks){
    for(const g of (cat.groups||[])){
      const key = cat.id + "|" + g.name.toLowerCase();
      localGroupByName[key] = g;
    }
  }

  const secById = {};
  (tdSections||[]).forEach(s=>{
    secById[s.id] = s;
    if(todoistMap.sections[s.id]) return;
    const catAppId = todoistMap.projects[s.project_id];
    if(!catAppId) return;
    const cat = state.tasks.find(c=>c.id===catAppId);
    if(!cat) return;

    const key = cat.id + "|" + s.name.toLowerCase();
    const localMatch = localGroupByName[key];
    if(localMatch && !localMatch.todoistSectionId){
      localMatch.todoistSectionId = s.id;
      todoistMap.sections[s.id] = { catId:cat.id, groupId:localMatch.id };
      changed = true;
    } else if(mode !== "keystone"){
      const g = { id:uid(), name:s.name, tasks:[], todoistSectionId:s.id };
      cat.groups.push(g);
      todoistMap.sections[s.id] = { catId:cat.id, groupId:g.id };
      changed = true;
    }
  });

  // ── Build task lookup maps ──
  const taskIdToLocal = new Map();
  const catById = new Map(state.tasks.map(c => [c.id, c]));
  for(const cat of state.tasks){
    for(const t of cat.tasks) taskIdToLocal.set(t.id, { cat, task: t, group: null });
    for(const g of cat.groups||[]){
      for(const t of g.tasks||[]) taskIdToLocal.set(t.id, { cat, task: t, group: g });
    }
  }

  // Build reverse lookup: title → local task (within each category)
  const localTaskByTitle = {};
  for(const cat of state.tasks){
    for(const t of cat.tasks){
      const key = cat.id + "|" + (t.title||"").toLowerCase();
      localTaskByTitle[key] = t;
    }
    for(const g of cat.groups||[]){
      for(const t of g.tasks||[]){
        const key = cat.id + "|" + (t.title||"").toLowerCase();
        localTaskByTitle[key] = t;
      }
    }
  }

  const timetableProjectId = state.tasks.find(c => c.name === "Timetable" && c.todoistId)?.todoistId;
  const checklistTasks = (tdTasks||[]).filter(td => td.project_id !== timetableProjectId);
  const timetableTasks = (tdTasks||[]).filter(td => td.project_id === timetableProjectId);

  // ── Checklist tasks ──
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
      // Task already mapped — update only if mode is not keystone
      if(mode !== "keystone"){
        existing.task.title = td.content;
        existing.task.due = (td.due && td.due.date) ? td.due.date : null;
        existing.task.priority = todoistToAppPriority(td.priority||0);
        existing.task.description = td.description || "";
        existing.task.done = false;
        existing.task.completedAt = null;
        changed = true;
      }
    } else {
      // Not mapped — try to find a local task by title
      const titleKey = cat.id + "|" + td.content.toLowerCase();
      const localTitleMatch = localTaskByTitle[titleKey];
      if(localTitleMatch && !localTitleMatch.todoistId){
        localTitleMatch.todoistId = td.id;
        todoistMap.tasks[td.id] = { catId:cat.id, taskId:localTitleMatch.id };
        changed = true;
      } else if(mode !== "keystone"){
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
    }
  });

  // ── Timetable tasks ──
  timetableTasks.forEach(td=>{
    const mapped = todoistMap.tasks[td.id];
    if(mapped && mapped.type === "timetable"){
      const block = state.timetable.find(b => b.id === mapped.blockId);
      if(block){
        if(mode !== "keystone"){
          block.title = td.content;
          block.completed = false;
          block.completedAt = null;
          if(td.due && td.due.date) block.due = td.due.date;
          changed = true;
        }
      }
    } else if(!mapped){
      parseAndCreateTimetableBlock(td);
      changed = true;
    }
  });

  // ── Completed tasks ──
  (tdCompleted||[]).forEach(td=>{
    const mapped = todoistMap.tasks[td.id];
    if(!mapped) return;

    if(mapped.type === "timetable"){
      const block = state.timetable.find(b => b.id === mapped.blockId);
      if(block && !block.completed){
        block.completed = true;
        block.completedAt = todayISO();
        changed = true;
      }
    } else {
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
  const desc = td.description || "";
  const match = desc.match(/\[Timetable\s+(Mon|Tue|Wed|Thu|Fri)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\]/);
  if(!match) return;

  const dayMap = {Mon:0, Tue:1, Wed:2, Thu:3, Fri:4, Sat:5, Sun:6};
  const day = dayMap[match[1]];
  if(day === undefined) return;

  const start = match[2];
  const end = match[3];

  const existing = state.timetable.find(b =>
    b.day === day && b.start === start && b.end === end && b.title === td.content
  );
  if(existing){
    existing.todoistId = td.id;
    todoistMap.tasks[td.id] = { type: "timetable", blockId: existing.id };
    return;
  }

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

// ─── MAIN SYNC ORCHESTRATOR ──────────────────────────────────────────────────

async function todoistSync(){
  if(!todoistToken || todoistInFlight) return;
  todoistInFlight = true;
  todoistSyncStatus = "syncing";
  renderTodoistPanel();
  try{
    // PULL FIRST to populate todoistMap before push creates anything
    const pulled = await todoistPull();

    // Then push (creates new items in Todoist, updates existing)
    if(typeof window.todoistPushWithConflictResolution === "function"){
      await window.todoistPushWithConflictResolution();
    } else {
      await todoistPush();
    }

    await todoistPushCompletions();

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
  todoistSyncMode = localStorage.getItem(TODOIST_SYNC_MODE_KEY) || "keystone";
}

// ─── UI ──────────────────────────────────────────────────────────────────────

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

  const modeLabels = { keystone: "Keystone (push + import new)", todoist: "Todoist (pull overwrites)", bidirectional: "Bidirectional (both ways)" };
  const modeDescs = {
    keystone: "Keystone is source of truth. Only new items from Todoist are imported.",
    todoist: "Todoist is source of truth. Pull overwrites local data.",
    bidirectional: "Full two-way sync. Conflicts are resolved manually."
  };

  el.innerHTML = `
    <div style="font-size:13px; margin-bottom:4px;">Connected to <b>Todoist</b> ${badge}</div>
    <div style="font-size:11.5px; color:var(--text-faint); margin-bottom:14px;">${todoistLastSyncAt ? "Last synced "+timeAgoShort(Date.now()-todoistLastSyncAt)+" ago" : "Syncing now…"}</div>
    ${progressHtml}
    <div style="margin-bottom:12px;">
      <label class="field" style="font-size:12px; margin-bottom:4px;">Sync mode</label>
      <select class="input" id="tdSyncModeSelect" style="font-size:12px; padding:6px 8px;">
        <option value="keystone" ${todoistSyncMode==="keystone"?"selected":""}>Keystone (push + import new)</option>
        <option value="todoist" ${todoistSyncMode==="todoist"?"selected":""}>Todoist (pull overwrites)</option>
        <option value="bidirectional" ${todoistSyncMode==="bidirectional"?"selected":""}>Bidirectional (both ways)</option>
      </select>
      <p style="font-size:10.5px; color:var(--text-faint); margin-top:4px;">${modeDescs[todoistSyncMode]}</p>
    </div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button class="btn btn-primary" id="tdSyncNowBtn">Sync now</button>
      <button class="btn btn-danger" id="tdResetSyncBtn">Reset Todoist Sync</button>
      <button class="btn" id="tdDisconnectBtn">Disconnect</button>
    </div>
    <p style="font-size:11px; color:var(--text-faint); margin-top:8px;">Reset clears all Todoist ID links locally and forces a fresh reconcile on next sync. Your tasks & data are preserved.</p>`;

  el.querySelector("#tdSyncModeSelect").addEventListener("change", (e)=>{
    todoistSyncMode = e.target.value;
    localStorage.setItem(TODOIST_SYNC_MODE_KEY, todoistSyncMode);
    renderTodoistPanel();
  });

  el.querySelector("#tdSyncNowBtn").addEventListener("click", async ()=>{
    const btn = el.querySelector("#tdSyncNowBtn"); btn.textContent="Syncing…"; btn.disabled=true;
    await todoistSync();
    btn.textContent="Sync now"; btn.disabled=false;
  });
  el.querySelector("#tdResetSyncBtn").addEventListener("click", ()=>{
    if(typeof window.resetTodoistSyncProperly === "function"){
      window.resetTodoistSyncProperly();
    } else {
      const tip = todoistSyncMode === "keystone"
        ? "After reset, Keystone data will be pushed to Todoist on next sync."
        : todoistSyncMode === "todoist"
        ? "After reset, Todoist data will overwrite your local data on next sync."
        : "After reset, you'll be prompted to choose the source of truth for each project.";
      if(confirm("Reset all Todoist sync links?\n\nThis will clear all todoistId references and recreate everything fresh on the next sync. Your local tasks, subjects, and timetable data will NOT be deleted.\n\n" + tip)){
        for(const cat of state.tasks){
          delete cat.todoistId;
          for(const g of (cat.groups || [])){
            delete g.todoistSectionId;
            for(const t of (g.tasks || [])) delete t.todoistId;
          }
        }
        for(const slot of (state.timetable || [])){
          for(const t of (slot.tasks || [])) delete t.todoistId;
        }
        todoistMap = {projects:{},sections:{},tasks:{},completed:{}};
        saveTodoistMap();
        save();
        todoistSyncStatus = "idle";
        toast("Todoist sync reset. Press 'Sync now' to reconcile.");
        renderTodoistPanel();
      }
    }
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
