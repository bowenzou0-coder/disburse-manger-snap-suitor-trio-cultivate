"use strict";

let checklistState = { activeCat: null, filter: "all" };

function ensureActiveCat(){
  if(!state.tasks.length) return null;
  if(!checklistState.activeCat || !state.tasks.find(c=>c.id===checklistState.activeCat)) checklistState.activeCat = state.tasks[0].id;
  return checklistState.activeCat;
}
function renderChecklist(){
  document.getElementById("checklistFilters").innerHTML = ["all","today","upcoming"].map(f=>
    `<button class="${checklistState.filter===f?'active':''}" data-filter="${f}">${f==="all"?"All":f==="today"?"Today":"Upcoming"}</button>`).join("");
  document.getElementById("checklistFilters").querySelectorAll("button").forEach(b=>
    b.addEventListener("click", ()=>{ checklistState.filter=b.dataset.filter; renderChecklist(); }));
  const sidebar = document.getElementById("catSidebar");
  ensureActiveCat();
  const scheduledToday = taskRelevantToday;
  const catListHtml = state.tasks.map(c=>{
    const remaining = c.tasks.filter(scheduledToday).filter(t=>!taskDoneToday(t)).length
      + c.groups.reduce((a,g)=>a+g.tasks.filter(scheduledToday).filter(t=>!taskDoneToday(t)).length,0);
    return `<div class="cat-item ${c.id===checklistState.activeCat && checklistState.filter==='all'?'active':''}" data-cat="${c.id}">
      <span class="dot" style="background:${c.color}"></span><span>${escapeHtml(c.name)}</span><span class="cat-count">${remaining}</span></div>`;
  }).join("");
  sidebar.innerHTML = catListHtml + `<div id="catAddSlot"></div>`;
  sidebar.querySelectorAll("[data-cat]").forEach(el=> el.addEventListener("click", ()=>{
    checklistState.activeCat = el.dataset.cat; checklistState.filter="all"; renderChecklist();
  }));
  wireInlineAddCategory(document.getElementById("catAddSlot"));
  const main = document.getElementById("checklistMain");
  if(checklistState.filter !== "all"){
    renderFilteredView(main);
    return;
  }
  if(!state.tasks.length){ main.innerHTML = `<div class="empty">Add a category to start building your checklist.</div>`; return; }
  const cat = state.tasks.find(c=>c.id===checklistState.activeCat);
  if(!cat){ main.innerHTML = `<div class="empty">Select a category.</div>`; return; }
  const totalCount = cat.tasks.filter(scheduledToday).length + cat.groups.reduce((a,g)=>a+g.tasks.filter(scheduledToday).length,0);
  const doneCount = cat.tasks.filter(scheduledToday).filter(t=>taskDoneToday(t)).length
    + cat.groups.reduce((a,g)=>a+g.tasks.filter(scheduledToday).filter(t=>taskDoneToday(t)).length,0);
  const pct = totalCount? Math.round(doneCount/totalCount*100):0;
  let html = `<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
      <div style="font-weight:700; font-size:15px; display:flex; align-items:center; gap:8px;"><span class="dot" style="background:${cat.color}"></span>${escapeHtml(cat.name)}</div>
      <div>
        <button class="iconbtn" data-rename-cat="${cat.id}">${icon('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>')}</button>
        <button class="iconbtn" data-del-cat="${cat.id}">${icon('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>')}</button>
      </div>
    </div>
    ${cat.description?`<div style="font-size:12.5px; color:var(--text-dim); margin-bottom:10px; white-space:pre-wrap;">${escapeHtml(cat.description)}</div>`:""}
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%; background:${cat.color};"></div></div>
    <hr class="sep">`;
  html += renderTaskList(cat.tasks, cat.id, null);
  html += `<div class="add-task-row"><input class="input" placeholder='+ Add task — try "essay due fri !high"' data-new-task-cat="${cat.id}"><div class="qa-hint"></div></div>`;
  cat.groups.forEach(g=>{
    html += `<div class="group-block"><div class="group-head"><span>${escapeHtml(g.name)}</span>
      <button class="iconbtn" data-del-group="${cat.id}:${g.id}">${icon('<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',13)}</button></div>`;
    html += renderTaskList(g.tasks, cat.id, g.id);
    html += `<div class="add-task-row"><input class="input" placeholder='+ Add task — try "read ch.4 sun"' data-new-task-cat="${cat.id}" data-new-task-group="${g.id}"><div class="qa-hint"></div></div></div>`;
  });
  html += `<button class="btn btn-sm" data-add-group="${cat.id}">+ Add section</button>`;
  main.innerHTML = html;
  wireTaskEvents(main);
  main.querySelector(`[data-rename-cat]`).addEventListener("click", (e)=>{
    openCategoryEditPopover(e.currentTarget, cat);
  });
  main.querySelector(`[data-del-cat]`).addEventListener("click", ()=>{
    if(confirm(`Delete category "${cat.name}" and all its tasks?`)){
      state.tasks = state.tasks.filter(c=>c.id!==cat.id); checklistState.activeCat=null; save(); renderChecklist();
    }
  });
  main.querySelector(`[data-add-group]`).addEventListener("click", (e)=>{
    promptPopover(e.currentTarget, "Add section", {label:"Section name", placeholder:"e.g. Assignments"}, name=>{
      cat.groups.push({id:uid(), name, tasks:[]}); save(); renderChecklist();
    });
  });
  main.querySelectorAll("[data-del-group]").forEach(el=> el.addEventListener("click", ()=>{
    const [catId, groupId] = el.dataset.delGroup.split(":");
    const c = state.tasks.find(x=>x.id===catId);
    if(confirm("Delete this section and its tasks?")){ c.groups = c.groups.filter(g=>g.id!==groupId); save(); renderChecklist(); }
  }));
}
function renderTaskRow(t, catId, groupId, opts){
  opts = opts || {};
  const priColors = {0:"transparent",1:"#dc2626",2:"#d97706",3:"#3b82f6"};
  const done = taskDoneToday(t);
  const overdue = t.due && !done && t.due<todayISO();
  const notToday = t.repeat && !overdue && !taskRelevantToday(t);
  const hasKids = opts.childCount>0;
  return `<div class="task-row ${opts.indent?'subtask-row':''}" ${notToday?'style="opacity:.5;"':''}>
      ${hasKids?`<button class="iconbtn" data-toggle-collapse="${catId}:${groupId||''}:${t.id}" style="flex-shrink:0; padding:2px;">${icon(t.collapsed?'<path d="M9 18l6-6-6-6"/>':'<path d="M6 9l6 6 6-6"/>',12)}</button>`:(opts.indent?'':'<span style="width:20px; flex-shrink:0;"></span>')}
      <div class="task-check ${done?'done':''}" data-toggle="${catId}:${groupId||''}:${t.id}" title="${notToday?'Not scheduled today — click to mark it anyway':''}">${done?icon('<path d="M20 6L9 17l-5-5"/>',11):''}</div>
      ${t.priority?`<span class="pri-dot" style="background:${priColors[t.priority]}"></span>`:''}
      <span class="task-title ${done?'done':''}" data-edit-task="${catId}:${groupId||''}:${t.id}">${escapeHtml(t.title)}</span>
      ${hasKids?`<span class="task-due" style="background:var(--surface-2); color:var(--text-dim);">${opts.doneChildCount}/${opts.childCount}</span>`:''}
      ${t.repeat?`<span class="iconbtn" style="cursor:default; color:var(--text-faint);" title="${escapeHtml(taskRepeatLabel(t))}">${icon('<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',13)}</span>`:''}
      ${t.description?`<span class="iconbtn" style="cursor:default; color:var(--text-faint);" title="${escapeHtml(t.description)}">${icon('<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/>',13)}</span>`:''}
      ${(t.due && (!t.repeat || overdue))?`<span class="task-due" style="background:${overdue?'var(--danger-soft)':'var(--surface-2)'}; color:${overdue?'var(--danger)':'var(--text-dim)'}">${t.due}</span>`:''}
      ${!opts.indent?`<button class="iconbtn" data-add-subtask="${t.id}" title="Add sub-task">${icon('<path d="M12 5v14"/><path d="M5 12h14"/>',13)}</button>`:''}
      <button class="iconbtn" data-del-task="${catId}:${groupId||''}:${t.id}">${icon('<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',13)}</button>
    </div>`;
}
function renderTaskList(tasks, catId, groupId){
  const parents = tasks.filter(t=>!t.parentId);
  if(!parents.length) return `<div class="empty" style="padding:8px 2px;">No tasks</div>`;
  return parents.map(t=>{
    const kids = tasks.filter(x=>x.parentId===t.id);
    let html = renderTaskRow(t, catId, groupId, { childCount: kids.length, doneChildCount: kids.filter(k=>taskDoneToday(k)).length });
    if(kids.length && !t.collapsed) html += kids.map(k=> renderTaskRow(k, catId, groupId, { indent:true })).join("");
    html += `<div class="subtask-add-row" data-subtask-add-row="${t.id}" style="display:none;">
      <input class="input" placeholder="+ Add sub-task" data-new-subtask="${catId}:${groupId||''}:${t.id}"><div class="qa-hint"></div>
    </div>`;
    return html;
  }).join("");
}
function findTaskArr(catId, groupId){
  const cat = state.tasks.find(c=>c.id===catId); if(!cat) return null;
  return groupId ? (cat.groups.find(g=>g.id===groupId)||{}).tasks : cat.tasks;
}
function makeTask(overrides){
  return Object.assign({
    id:uid(), title:"", done:false, due:null, priority:0, completedAt:null,
    repeat:null, repeatDays:[], completedDates:[], description:"",
    parentId:null, collapsed:false
  }, overrides);
}
function wireTaskEvents(root){
  root.querySelectorAll("[data-toggle]").forEach(el=> el.addEventListener("click", ()=>{
    const [catId, groupId, taskId] = el.dataset.toggle.split(":");
    toggleTask(catId, groupId||null, taskId); renderChecklist(); renderOverview();
  }));
  root.querySelectorAll("[data-del-task]").forEach(el=> el.addEventListener("click", ()=>{
    const [catId, groupId, taskId] = el.dataset.delTask.split(":");
    const arr = findTaskArr(catId, groupId||null);
    const remaining = arr.filter(t=> t.id!==taskId && t.parentId!==taskId);
    arr.length = 0; arr.push(...remaining);
    save(); renderChecklist();
  }));
  root.querySelectorAll("[data-edit-task]").forEach(el=> el.addEventListener("click", ()=>{
    const [catId, groupId, taskId] = el.dataset.editTask.split(":");
    openTaskEditModal(catId, groupId||null, taskId, el);
  }));
  root.querySelectorAll("[data-toggle-collapse]").forEach(el=> el.addEventListener("click", ()=>{
    const [catId, groupId, taskId] = el.dataset.toggleCollapse.split(":");
    const arr = findTaskArr(catId, groupId||null);
    const t = arr.find(x=>x.id===taskId); if(!t) return;
    t.collapsed = !t.collapsed; save(); renderChecklist();
  }));
  root.querySelectorAll("[data-add-subtask]").forEach(el=> el.addEventListener("click", ()=>{
    const row = root.querySelector(`[data-subtask-add-row="${el.dataset.addSubtask}"]`);
    if(!row) return;
    row.style.display = "flex";
    row.querySelector("input").focus();
  }));
  root.querySelectorAll("[data-new-subtask]").forEach(el=>{
    const hint = el.parentElement.querySelector(".qa-hint");
    el.addEventListener("input", ()=>{
      const parsed = parseQuickAdd(el.value);
      if(hint) hint.innerHTML = el.value.trim() ? qaHintHtml(parsed) : "";
    });
    el.addEventListener("keydown", e=>{
      if(e.key==="Enter" && e.target.value.trim()){
        const [catId, groupId, parentId] = el.dataset.newSubtask.split(":");
        const parsed = parseQuickAdd(e.target.value.trim());
        const arr = findTaskArr(catId, groupId||null);
        arr.push(makeTask({ title:parsed.title || e.target.value.trim(), due:parsed.due, priority:parsed.priority, repeat:parsed.repeat||null, repeatDays:parsed.repeatDays||[], parentId }));
        const parent = arr.find(t=>t.id===parentId); if(parent) parent.collapsed = false;
        e.target.value=""; save(); renderChecklist(); renderOverview();
      }
    });
  });
  root.querySelectorAll("[data-new-task-cat]").forEach(el=>{
    const hint = el.parentElement.querySelector(".qa-hint");
    el.addEventListener("input", ()=>{
      const parsed = parseQuickAdd(el.value);
      if(hint) hint.innerHTML = el.value.trim() ? qaHintHtml(parsed) : "";
    });
    el.addEventListener("keydown", e=>{
      if(e.key==="Enter" && e.target.value.trim()){
        const parsed = parseQuickAdd(e.target.value.trim());
        const arr = findTaskArr(el.dataset.newTaskCat, el.dataset.newTaskGroup||null);
        arr.push(makeTask({ title:parsed.title || e.target.value.trim(), due:parsed.due, priority:parsed.priority, repeat:parsed.repeat||null, repeatDays:parsed.repeatDays||[] }));
        e.target.value=""; save(); renderChecklist(); renderOverview();
      }
    });
  });
}
function openTaskEditModal(catId, groupId, taskId, anchor){
  const arr = findTaskArr(catId, groupId);
  const t = arr.find(x=>x.id===taskId); if(!t) return;
  const body = `
    <label class="field">Title<input class="input" id="tfTitle" value="${escapeHtml(t.title)}"></label>
    <div class="row">
      <label class="field">Due date<input class="input" type="date" id="tfDue" value="${t.due||''}"></label>
      <label class="field">Priority
        <div class="input" id="tfPriority"></div>
      </label>
    </div>
    <label class="field">Repeats
      <div class="input" id="tfRepeat"></div>
    </label>
    <div class="filter-tabs" id="tfRepeatDays" style="display:none; margin-bottom:0; margin-top:8px; flex-wrap:wrap;"></div>
    <label class="field" style="margin-top:12px;">Description <span style="font-weight:400;">(optional)</span>
      <textarea class="input" id="tfDescription" rows="3" placeholder="Add a note...">${escapeHtml(t.description||"")}</textarea>
    </label>
    <div class="modal-actions"><button class="btn" id="tfCancel">Cancel</button><button class="btn btn-primary" id="tfSave">Save</button></div>`;
  openPopover(anchor, "Edit task", body, root=>{
    initSelect(root.querySelector("#tfPriority"), [
      {value:0,label:"None"}, {value:1,label:"P1 — High"}, {value:2,label:"P2 — Medium"}, {value:3,label:"P3 — Low"}
    ], t.priority);
    const repeatDaysWrap = root.querySelector("#tfRepeatDays");
    let pickedDays = new Set(t.repeatDays||[]);
    function paintDayChips(){
      repeatDaysWrap.innerHTML = QA_DOW_NAMES.map((name,i)=>
        `<button type="button" class="${pickedDays.has(i)?'active':''}" data-day="${i}">${name}</button>`).join("");
      repeatDaysWrap.querySelectorAll("[data-day]").forEach(b=> b.addEventListener("click", ()=>{
        const d = Number(b.dataset.day);
        if(pickedDays.has(d)) pickedDays.delete(d); else pickedDays.add(d);
        paintDayChips();
      }));
    }
    paintDayChips();
    const initialRepeat = t.repeat || "none";
    repeatDaysWrap.style.display = initialRepeat==="weekly" ? "flex" : "none";
    initSelect(root.querySelector("#tfRepeat"), [
      {value:"none", label:"Doesn't repeat"}, {value:"daily", label:"Every day"},
      {value:"weekday", label:"Every weekday"}, {value:"weekly", label:"On specific days"}
    ], initialRepeat, v=>{ repeatDaysWrap.style.display = v==="weekly" ? "flex" : "none"; });
    root.querySelector("#tfCancel").addEventListener("click", closePopover);
    root.querySelector("#tfSave").addEventListener("click", ()=>{
      const repeatVal = root.querySelector("#tfRepeat").value;
      if(repeatVal==="weekly" && !pickedDays.size){ toast("Pick at least one day, or choose a different repeat option"); return; }
      t.title = root.querySelector("#tfTitle").value.trim() || t.title;
      t.due = root.querySelector("#tfDue").value || null;
      t.priority = Number(root.querySelector("#tfPriority").value);
      t.repeat = repeatVal==="none" ? null : repeatVal;
      t.repeatDays = repeatVal==="weekly" ? Array.from(pickedDays).sort((a,b)=>a-b) : [];
      if(t.repeat && !t.completedDates) t.completedDates = [];
      t.description = root.querySelector("#tfDescription").value.trim();
      save(); closePopover(); renderChecklist(); renderOverview();
    });
  });
}
function renderFilteredView(main){
  const list = allTasks().filter(t=>!taskDoneToday(t)).filter(t=>{
    if(t.repeat) return checklistState.filter==="today" && taskRelevantToday(t);
    if(!t.due) return false;
    if(checklistState.filter==="today") return t.due<=todayISO();
    if(checklistState.filter==="upcoming") return t.due>todayISO() && daysBetween(todayISO(),t.due)<=7;
    return true;
  }).sort((a,b)=> (a.due||"").localeCompare(b.due||""));
  if(!list.length){ main.innerHTML = `<div class="empty">Nothing here.</div>`; return; }
  main.innerHTML = list.map(t=>{
    const cat = state.tasks.find(c=>c.id===t.catId);
    const overdue = t.due && t.due < todayISO();
    const dueLabel = t.repeat ? (overdue ? t.due : taskRepeatLabel(t)) : t.due;
    return `<div class="task-row">
      <div class="task-check" data-toggle="${t.catId}:${t.groupId||''}:${t.id}"></div>
      <span class="dot" style="background:${cat?cat.color:'#aaa'}"></span>
      <span class="task-title" style="flex:1;">${escapeHtml(t.title)} <span style="color:var(--text-faint); font-size:11.5px;">— ${escapeHtml(cat?cat.name:'')}</span></span>
      <span class="task-due" style="background:${overdue?'var(--danger-soft)':'var(--surface-2)'}; color:${overdue?'var(--danger)':'var(--text-dim)'}">${escapeHtml(dueLabel)}</span>
    </div>`;
  }).join("");
  wireTaskEvents(main);
}
function wireInlineAddCategory(slot){
  if(!slot) return;
  slot.innerHTML = `<div class="inline-add-trigger" id="catAddTrigger">+ Add category</div>`;
  slot.querySelector("#catAddTrigger").addEventListener("click", function(){
    const color = nextPaletteColor();
    slot.innerHTML = `<div class="inline-add-row"><span class="dot" style="background:${color}"></span>
      <input placeholder="Category name…" id="catAddInput">
      <button class="btn btn-sm" id="catAddSave">Add</button></div>`;
    const input = slot.querySelector("#catAddInput");
    input.focus();
    const submit = ()=>{
      const name = input.value.trim();
      if(!name) return;
      const c = {id:uid(), name, color, tasks:[], groups:[]};
      state.tasks.push(c); checklistState.activeCat = c.id; save(); renderChecklist();
    };
    input.addEventListener("keydown", e=>{
      if(e.key==="Enter") submit();
      if(e.key==="Escape") renderChecklist();
    });
    slot.querySelector("#catAddSave").addEventListener("click", submit);
  });
}
