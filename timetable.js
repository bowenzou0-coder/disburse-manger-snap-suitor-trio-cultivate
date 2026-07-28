"use strict";

const DAY_START = 0, DAY_END = 24*60, PX_PER_MIN = 0.85;
let mobileTTDay = null;
let ttScrolledToNow = false;
let ttUserScrolled = false;
let ttTypeFilter = "all"; // "all", "event", "task", "study"
let ttWeekOffset = 0; // 0 = this week, -1 = last week, etc.

function autoDetectSubject(title){
  if(!title) return null;
  const words = subjectNameWords(title);
  let best = null, bestScore = 0;
  state.subjects.forEach(s=>{
    const score = subjectWordSimilarity(words, subjectNameWords(s.name));
    if(score > bestScore){ bestScore = score; best = s; }
  });
  return bestScore >= 0.3 ? best : null;
}

function blockColor(b){
  return b.color || (subjectById(b.subjectId)||{}).color || "#94a3b8";
}
function blockName(b){
  const subj = subjectById(b.subjectId);
  return subj ? subj.name : (b.title || "Untitled");
}

function renderTimetable(){
  const totalH = (DAY_END - DAY_START) * PX_PER_MIN;
  const todayIdx = mondayIndex(new Date());
  
  // Get current type filter
  const filterBtn = document.querySelector("#ttTypeFilter .btn.active, #ttTypeFilterMobile .btn.active");
  const currentFilter = filterBtn ? filterBtn.dataset.ttFilter : "all";
  
  // Filter blocks by type
  const filteredTimetable = currentFilter === "all" 
    ? state.timetable 
    : state.timetable.filter(b => b.type === currentFilter);
  
  let head = `<div class="tt-head"><div></div>` + DAYS.map((d,i)=>`<div class="${i===todayIdx?'today':''}">${d}</div>`).join("") + `</div>`;
  let hours = `<div class="tt-hours" style="height:${totalH}px;">`;
  for(let m = DAY_START; m < DAY_END; m += 60){
    hours += `<div class="tt-hour-label" style="top:${(m - DAY_START)*PX_PER_MIN}px;">${minToTimeLabel(m)}</div>`;
  }
  hours += `</div>`;
  let cols = "";
  for(let d = 0; d < DAYS.length; d++){
    let inner = "";
    for(let m = DAY_START; m < DAY_END; m += 30){
      const isHour = m % 60 === 0;
      inner += `<div class="tt-hline${isHour?'':' tt-hline-half'}" style="top:${(m - DAY_START)*PX_PER_MIN}px;"></div>`;
    }
    const blocks = filteredTimetable.filter(b=>b.day===d);
    blocks.forEach(b=>{
      const color = blockColor(b);
      const top = (timeToMin(b.start) - DAY_START)*PX_PER_MIN;
      const h = Math.max(6, (timeToMin(b.end) - timeToMin(b.start))*PX_PER_MIN - 3);
      const name = escapeHtml(blockName(b));
      const titleAttr = escapeHtml(`${blockName(b)} — ${minToTimeLabel(timeToMin(b.start))}–${minToTimeLabel(timeToMin(b.end))}`);
      let typeClass = b.type==="task"?" tt-task": b.type==="study"?" tt-study":"";
      let doneClass = b.type==="task" && b.completed ? " tt-completed":"";
      let typeIcon = "";
      let taskCheckbox = "";
      if(b.type==="task"){
        typeIcon = b.completed ? " ✓":" ☐";
        taskCheckbox = `<span class="tt-task-checkbox" data-task-toggle="${b.id}" style="margin-right:6px; cursor:pointer; user-select:none;" title="Toggle completion">${b.completed ? "✓" : "☐"}</span>`;
      } else if(b.type==="study") typeIcon = " 📖";
      else if(b.recurring) typeIcon = " ↻";
      if(h < 15){
        inner += `<div class="tt-block tt-sliver${typeClass}${doneClass}" data-edit-block="${b.id}" title="${titleAttr}" style="top:${top}px; height:${h}px; background:${color}; border-color:${color};">${taskCheckbox}</div>`;
      } else {
        const tight = h < 42;
        inner += `<div class="tt-block${tight?' tt-tight':''}${typeClass}${doneClass}" data-edit-block="${b.id}" title="${titleAttr}" style="top:${top}px; height:${h}px; background:${color}22; border-color:${color}; color:${color};">
          <b>${taskCheckbox}${name}${typeIcon}</b>${tight?"":`<div class="tt-block-meta">${minToTimeLabel(timeToMin(b.start))}–${minToTimeLabel(timeToMin(b.end))}</div>`}
        </div>`;
      }
    });
    if(d===todayIdx){
      const now = new Date(); const nowMin = now.getHours()*60+now.getMinutes();
      inner += `<div class="tt-now-line" style="top:${(nowMin - DAY_START)*PX_PER_MIN}px;"><div class="tt-now-dot"></div></div>`;
    }
    inner += `<button class="btn btn-sm tt-add-col-btn" data-add-day="${d}">+ Add</button>`;
    cols += `<div class="tt-col ${d===todayIdx?'today':''}" style="height:${totalH}px;">${inner}</div>`;
  }
  const body = `<div class="tt-body">${hours}${cols}</div>`;
  document.getElementById("ttGrid").innerHTML = head + body;
  document.getElementById("ttGrid").querySelectorAll("[data-edit-block]").forEach(el=>
    el.addEventListener("click", (e)=>{
      if(e.target.closest("[data-task-toggle]")) return;
      openBlockModal(el.dataset.editBlock, undefined, el);
    }));
  document.getElementById("ttGrid").querySelectorAll("[data-task-toggle]").forEach(el=>
    el.addEventListener("click", (e)=>{
      e.stopPropagation();
      const block = state.timetable.find(b=>b.id===el.dataset.taskToggle);
      if(block && block.type==="task"){
        block.completed = !block.completed;
        block.completedAt = block.completed ? todayISO() : null;
        save(); renderTimetable();
        if(block.todoistId){
          todoistSync();
        }
      }
    }));
  document.getElementById("ttGrid").querySelectorAll("[data-add-day]").forEach(el=>
    el.addEventListener("click", ()=> openBlockModal(null, Number(el.dataset.addDay), el)));
  document.getElementById("ttLegend").innerHTML = state.subjects.map(s=>
    `<span><span class="dot" style="background:${s.color}"></span>${escapeHtml(s.name)}</span>`).join("");
  
  // Update week label
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 4); // Friday
  const weekLabel = document.getElementById("ttWeekLabel");
  if(weekLabel){
    const fmt = d => `${d.toLocaleDateString(undefined, {month:"short", day:"numeric"})}`;
    weekLabel.textContent = `${fmt(weekStart)} – ${fmt(weekEnd)}`;
  }
  
  const wrap = document.querySelector(".tt-wrap");
  if(wrap && !ttUserScrolled){
    scrollToNow();
  }
  
  if(!ttScrolledToNow){
    scrollToNow();
    ttScrolledToNow = true;
  }
  renderTimetableMobile();
  renderTimetableUpNext();
}

function scrollToNow(){
  const wrap = document.querySelector(".tt-wrap");
  if(!wrap) return;
  const now = new Date();
  const nowMin = now.getHours()*60+now.getMinutes();
  const target = Math.max(0, (nowMin - DAY_START)*PX_PER_MIN - wrap.clientHeight*0.3);
  wrap.scrollTop = target;
  ttUserScrolled = false;
}

function renderTimetableUpNext(){
  const card = document.getElementById("ttUpNextCard");
  if(!card) return;
  const now = new Date();
  const dayIdx = mondayIndex(now);
  if(dayIdx >= DAYS.length){ card.style.display = "none"; return; }
  const nowMin = now.getHours()*60 + now.getMinutes() + now.getSeconds()/60;
  const periods = state.timetable.filter(p=>p.day===dayIdx).sort((a,b)=>timeToMin(a.start)-timeToMin(b.start));
  const current = periods.find(p=> nowMin>=timeToMin(p.start) && nowMin<timeToMin(p.end));
  const next = periods.find(p=> timeToMin(p.start) > nowMin);
  if(!current && !next){ card.style.display="none"; return; }
  card.style.display="block";
  let period, label, targetMin, fill;
  if(current){
    period = current; label = "In progress";
    const totalMin = timeToMin(current.end)-timeToMin(current.start);
    const elapsedMin = nowMin-timeToMin(current.start);
    fill = totalMin>0 ? Math.min(100, Math.max(0, elapsedMin/totalMin*100)) : 100;
    targetMin = timeToMin(current.end);
  } else {
    period = next; label = "Up next";
    const untilMin = timeToMin(next.start) - nowMin;
    const runway = 60;
    fill = untilMin>=runway ? 0 : Math.min(100, Math.max(0, (runway-untilMin)/runway*100));
    targetMin = timeToMin(next.start);
  }
  const remainingSec = Math.max(0, Math.round((targetMin - nowMin)*60));
  const h=Math.floor(remainingSec/3600), m=Math.floor((remainingSec%3600)/60), s=remainingSec%60;
  const timeStr = h>0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  const color = blockColor(period);
  document.getElementById("ttUpNextLabel").textContent = label;
  document.getElementById("ttUpNextTimer").textContent = (current?"Ends in ":"Starts in ")+timeStr;
  document.getElementById("ttUpNextTimer").style.color = color;
  document.getElementById("ttUpNextName").textContent = blockName(period);
  document.getElementById("ttUpNextName").style.color = color;
  document.getElementById("ttUpNextMeta").textContent = period.description ? escapeHtml(period.description.slice(0,60)) : "\u00a0";
  document.getElementById("ttUpNextFill").style.width = fill.toFixed(1)+"%";
  document.getElementById("ttUpNextFill").style.background = color;
}

// Track user scroll - only auto-scroll if user hasn't manually scrolled away from "now"
document.querySelector(".tt-wrap")?.addEventListener("scroll", ()=>{
  const wrap = document.querySelector(".tt-wrap");
  if(!wrap) return;
  const now = new Date();
  const nowMin = now.getHours()*60+now.getMinutes();
  const nowPos = (nowMin - DAY_START)*PX_PER_MIN;
  const viewportTop = wrap.scrollTop;
  const viewportBottom = wrap.scrollTop + wrap.clientHeight;
  // User is near "now" (within 50% of viewport) - allow auto-scroll
  if(nowPos >= viewportTop - wrap.clientHeight*0.5 && nowPos <= viewportBottom + wrap.clientHeight*0.5){
    ttUserScrolled = false;
  } else {
    ttUserScrolled = true;
  }
});

document.getElementById("ttAddBtn").addEventListener("click", (e)=> openBlockModal(null, mondayIndex(new Date()), e.currentTarget));
document.getElementById("ttTemplatesBtn").addEventListener("click", openTemplatesModal);
document.getElementById("ttExportBtn").addEventListener("click", exportTimetableCSV);

function renderTimetableMobile(){
  const todayIdx = mondayIndex(new Date());
  if(mobileTTDay===null) mobileTTDay = todayIdx;
  document.getElementById("ttDayTabs").innerHTML = DAYS.map((d,i)=>
    `<button class="${mobileTTDay===i?'active':''}" data-day-tab="${i}">${d}${i===todayIdx?' •':''}</button>`).join("");
  document.getElementById("ttDayTabs").querySelectorAll("button").forEach(b=>
    b.addEventListener("click", ()=>{ mobileTTDay = Number(b.dataset.dayTab); renderTimetableMobile(); }));
  
  // Type filter tabs for mobile
  document.getElementById("ttTypeFilterMobile").querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      ttTypeFilter = btn.dataset.ttFilter;
      document.getElementById("ttTypeFilterMobile").querySelectorAll("button").forEach(b=>b.classList.toggle("active", b===btn));
      renderTimetableMobile();
    });
  });
  
  let blocks = state.timetable.filter(b=>b.day===mobileTTDay).sort((a,b)=>timeToMin(a.start)-timeToMin(b.start));
  if(ttTypeFilter !== "all") blocks = blocks.filter(b=>b.type===ttTypeFilter);
  
  const list = document.getElementById("ttDayList");
  if(!blocks.length){ list.innerHTML = `<div class="empty">No blocks for ${DAYS[mobileTTDay]} yet.</div>`; }
  else{
    const now = new Date(); const nowMin = now.getHours()*60+now.getMinutes();
    list.innerHTML = blocks.map(b=>{
      const color = blockColor(b);
      const name = escapeHtml(blockName(b));
      const active = mobileTTDay===todayIdx && nowMin>=timeToMin(b.start) && nowMin<timeToMin(b.end);
      const typeBadge = b.type==="task"?'<span class="badge badge-muted" style="margin-left:6px;">Task</span>'
        : b.type==="study"?'<span class="badge badge-accent" style="margin-left:6px;">Study</span>':"";
      const recIcon = b.recurring?" ↻":"";
      const taskCheckbox = b.type==="task" ? `<span class="tt-task-checkbox-m" data-task-toggle-m="${b.id}" style="margin-right:8px; cursor:pointer;">${b.completed ? "✓" : "☐"}</span>` : "";
      const todoistIndicator = b.type==="task" && b.todoistId ? '<span class="badge badge-success" style="margin-left:6px; font-size:10px;">✓ Synced</span>' : "";
      return `<div class="tt-day-card ${active?'now':''}" data-edit-block-m="${b.id}" style="border-left-color:${color};">
        <div class="tt-day-card-time">${minToTimeLabel(timeToMin(b.start))} – ${minToTimeLabel(timeToMin(b.end))}${recIcon}</div>
        <div class="tt-day-card-name">${taskCheckbox}${name}${typeBadge}${todoistIndicator}</div>
        ${b.description?`<div class="tt-day-card-meta">${escapeHtml(b.description.slice(0,60))}</div>`:""}
        ${active?'<span class="now-tag">NOW</span>':''}
      </div>`;
    }).join("");
    list.querySelectorAll("[data-edit-block-m]").forEach(el=>
      el.addEventListener("click", (e)=>{
        if(e.target.closest("[data-task-toggle-m]")) return;
        openBlockModal(el.dataset.editBlockM, undefined, el);
      }));
    list.querySelectorAll("[data-task-toggle-m]").forEach(el=>
      el.addEventListener("click", (e)=>{
        e.stopPropagation();
        const block = state.timetable.find(b=>b.id===el.dataset.taskToggleM);
        if(block && block.type==="task"){
          block.completed = !block.completed;
          block.completedAt = block.completed ? todayISO() : null;
          save(); renderTimetable();
          if(block.todoistId) todoistSync();
        }
      }));
  }
  document.getElementById("ttMobileAddBtn").onclick = e=> openBlockModal(null, mobileTTDay, e.currentTarget);
}

function openBlockModal(blockId, prefillDay, anchor, prefillStart, prefillEnd){
  const editing = blockId ? state.timetable.find(b=>b.id===blockId) : null;
  const body = `
    <label class="field">Title
      <input class="input" id="bfTitle" value="${editing?escapeHtml(editing.title):''}" placeholder="e.g. Physics revision">
    </label>
    <label class="field">Type
      <div class="input" id="bfType"></div>
    </label>
    <label class="field">Day(s)
      <div class="input" id="bfDay" style="flex-wrap:wrap; gap:6px; padding:8px;"></div>
    </label>
    <div class="row">
      <label class="field">Start<input class="input" type="time" id="bfStart" value="${editing?editing.start:(prefillStart||'09:00')}"></label>
      <label class="field">End<input class="input" type="time" id="bfEnd" value="${editing?editing.end:(prefillEnd||'10:00')}"></label>
    </div>
    <label class="field">Subject
      <div class="input" id="bfSubject"></div>
    </label>
    <label class="field">Description
      <textarea class="input" id="bfDesc" rows="2" placeholder="Optional notes...">${editing?escapeHtml(editing.description||""):''}</textarea>
    </label>
    <div id="bfTypeFields" style="margin-bottom:8px;"></div>
    <label class="field" style="flex-direction:row; align-items:center; gap:8px; margin-bottom:0;">
      <input type="checkbox" id="bfRecurring" ${editing&&editing.recurring?'checked':""}> Part of weekly schedule
    </label>
    <div class="modal-actions">
      ${editing?'<button class="btn btn-danger" id="bfDelete">Delete</button>':''}
      <button class="btn" id="bfCancel">Cancel</button>
      <button class="btn btn-primary" id="bfSave">Save</button>
    </div>`;
  openPopover(anchor, editing?"Edit block":"New block", body, (root)=>{
    initSelect(root.querySelector("#bfType"), [
      {value:"event",label:"Event"}, {value:"task",label:"Task"}, {value:"study",label:"Study Session"}
    ], editing?editing.type:"event");
    root.querySelector("#bfDay").innerHTML = DAYS.map((d,i)=>`<label style="display:flex; align-items:center; gap:4px; cursor:pointer;"><input type="checkbox" value="${i}" ${(editing?editing.day:(prefillDay??0))===i?"checked":""}>${d}</label>`).join("");
    const subjOpts = [{value:"",label:"— None —"}].concat(state.subjects.map(s=>({value:s.id,label:s.name})));
    initSelect(root.querySelector("#bfSubject"), subjOpts, editing&&editing.subjectId?editing.subjectId:"");
    root.querySelector("#bfTitle").addEventListener("input", (e)=>{
      const detected = autoDetectSubject(e.target.value);
      if(detected) initSelect(root.querySelector("#bfSubject"), subjOpts, detected.id);
    });

    // Type-specific fields
    const typeFields = root.querySelector("#bfTypeFields");
    function renderTypeFields(type){
      if(type==="task"){
        typeFields.innerHTML = `
          <label class="field" style="flex-direction:row; align-items:center; gap:8px;">
            <input type="checkbox" id="bfTodoistSync" ${editing&&editing.todoistId?'checked':''}> Sync to Todoist
            <span style="font-size:11px; color:var(--text-faint);">Creates/updates a Todoist task</span>
          </label>`;
      } else if(type==="study"){
        typeFields.innerHTML = `
          <label class="field">
            <textarea class="input" id="bfStudyTopics" rows="2" placeholder="Topics to cover (comma-separated)...">${editing&&editing.studyTopics?editing.studyTopics.join(", "):''}</textarea>
          </label>
          <div style="font-size:11px; color:var(--text-faint); margin-top:-8px; margin-bottom:8px;">Obsidian integration coming soon</div>`;
      } else {
        typeFields.innerHTML = "";
      }
    }
    renderTypeFields(editing?editing.type:"event");
    root.querySelector("#bfType").addEventListener("change", (e)=> renderTypeFields(e.target.value));

    root.querySelector("#bfCancel").addEventListener("click", closePopover);
    if(editing) root.querySelector("#bfDelete").addEventListener("click", ()=>{
      if(editing.todoistId && confirm("This will also delete the Todoist task. Continue?")){
        state.timetable = state.timetable.filter(b=>b.id!==editing.id);
        save(); closePopover(); renderTimetable();
      } else if(!editing.todoistId) {
        state.timetable = state.timetable.filter(b=>b.id!==editing.id);
        save(); closePopover(); renderTimetable();
      }
    });
    root.querySelector("#bfSave").addEventListener("click", ()=>{
      const start = root.querySelector("#bfStart").value, end = root.querySelector("#bfEnd").value;
      if(!start || !end || timeToMin(end)<=timeToMin(start)){ toast("End time must be after start time"); return; }
      const subjectId = root.querySelector("#bfSubject").value || null;
      const type = root.querySelector("#bfType").value;
      const days = Array.from(root.querySelectorAll("#bfDay input:checked")).map(cb=>Number(cb.value));
      if(!days.length){ toast("Select at least one day"); return; }
      const data = {
        type,
        title: root.querySelector("#bfTitle").value.trim(),
        description: root.querySelector("#bfDesc").value.trim(),
        start, end, subjectId,
        recurring: root.querySelector("#bfRecurring").checked
      };
      if(type==="task"){
        data.todoistId = root.querySelector("#bfTodoistSync")?.checked ? (editing?.todoistId||null) : null;
      } else {
        data.todoistId = null;
      }
      if(type==="study"){
        const topics = root.querySelector("#bfStudyTopics")?.value;
        data.studyTopics = topics ? topics.split(",").map(s=>s.trim()).filter(Boolean) : [];
        data.studyProgress = 0;
      }
      if(editing){
        editing.day = days[0];
        Object.assign(editing, data);
        for(let i=1;i<days.length;i++){
          state.timetable.push(makeBlock({...data,id:uid(),day:days[i],todoistId:null}));
        }
      } else {
        days.forEach(day=>state.timetable.push(makeBlock({...data,id:uid(),day})));
      }
      save(); closePopover(); renderTimetable();
    });
  });
}

/* ===================== templates ===================== */
function openTemplatesModal(){
  const body = `
    <div style="margin-bottom:14px;">
      <button class="btn btn-primary" id="tplSaveCurrent">Save Current Week as Template</button>
    </div>
    <div id="tplSaveForm" style="display:none; margin-bottom:14px; padding:12px; background:var(--surface-2); border-radius:var(--radius-sm);">
      <label class="field">Template name
        <input class="input" id="tplNameInput" placeholder="Enter template name">
      </label>
      <div class="modal-actions">
        <button class="btn" id="tplSaveCancel">Cancel</button>
        <button class="btn btn-primary" id="tplSaveConfirm">Save</button>
      </div>
    </div>
    <div id="tplList"></div>
    <div class="modal-actions"><button class="btn" id="tplClose">Close</button></div>`;
  openModal("Schedule Templates", body, root=>{
    renderTemplateList(root);
    root.querySelector("#tplSaveCurrent").addEventListener("click", ()=>{
      root.querySelector("#tplSaveForm").style.display = "block";
      root.querySelector("#tplNameInput").value = "";
      root.querySelector("#tplNameInput").focus();
    });
    root.querySelector("#tplSaveConfirm").addEventListener("click", ()=>{
      const name = root.querySelector("#tplNameInput").value.trim();
      if(!name){ toast("Enter a template name"); return; }
      state.templates.push({ id:uid(), name, blocks: state.timetable.map(b=>({...b})) });
      save(); renderTemplateList(root); toast("Template saved");
      root.querySelector("#tplSaveForm").style.display = "none";
    });
    root.querySelector("#tplSaveCancel").addEventListener("click", ()=>{
      root.querySelector("#tplSaveForm").style.display = "none";
    });
    root.querySelector("#tplClose").addEventListener("click", closeModal);
  });
}
function renderTemplateList(root){
  const wrap = root.querySelector("#tplList");
  if(!state.templates.length){
    wrap.innerHTML = '<div class="empty">No templates yet. Save your current week layout as a template.</div>';
    return;
  }
  wrap.innerHTML = state.templates.map(tpl=>
    `<div style="display:flex; flex-direction:column; gap:8px; padding:10px 4px; border-bottom:1px solid var(--border);">
       <div style="display:flex; align-items:center; gap:10px;">
         <div style="flex:1; font-weight:600;">${escapeHtml(tpl.name)} <span style="font-weight:400; color:var(--text-faint); font-size:12px;">(${tpl.blocks.length} blocks)</span></div>
         <button class="btn btn-sm" data-apply-tpl="${tpl.id}">Apply</button>
         <button class="btn btn-sm btn-danger" data-del-tpl="${tpl.id}">Delete</button>
       </div>
       <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--text-dim);">
         <input type="checkbox" data-clear-before="${tpl.id}"> Clear existing blocks before applying
       </label>
     </div>`).join("");
  wrap.querySelectorAll("[data-apply-tpl]").forEach(btn=>
    btn.addEventListener("click", ()=>{
      const tpl = state.templates.find(t=>t.id===btn.dataset.applyTpl);
      if(!tpl) return;
      const clearFirst = wrap.querySelector(`[data-clear-before="${tpl.id}"]`)?.checked;
      if(!confirm(clearFirst ? "Clear all blocks and apply template?" : "Replace current timetable with template?")) return;
      if(clearFirst) state.timetable = [];
      tpl.blocks.forEach(b=>{
        state.timetable.push(makeBlock({...b, id:uid(), createdAt:todayISO()}));
      });
      save(); closeModal(); renderTimetable(); toast("Template applied");
    }));
  wrap.querySelectorAll("[data-del-tpl]").forEach(btn=>
    btn.addEventListener("click", ()=>{
      state.templates = state.templates.filter(t=>t.id!==btn.dataset.delTpl);
      save(); renderTemplateList(root);
    }));
}

/* ===================== CSV export ===================== */
function exportTimetableCSV(){
  const rows = [["Title","Type","Day","Start","End","Subject","Recurring","Description"]];
  state.timetable.forEach(b=>{
    const subj = subjectById(b.subjectId);
    rows.push([
      b.title||(subj?subj.name:""), b.type, DAYS[b.day], b.start, b.end,
      subj?subj.name:"", b.recurring?"true":"false", b.description||""
    ]);
  });
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "timetable.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ===================== timetable import (CSV / ICS) ===================== */
let importState = { rows: [], subjectMap: {} };
function findSubjectByName(name){
  const n = (name||"").trim().toLowerCase();
  return state.subjects.find(s=> s.name.trim().toLowerCase()===n);
}
const SUBJ_WORD_EXPAND = {
  maths:"mathematics", math:"mathematics", ext:"extension", adv:"advanced",
  eng:"english", bio:"biology", chem:"chemistry", econ:"economics", lit:"literature", phys:"physics"
};
function subjectNameWords(name){
  let t = (name||"").toLowerCase().trim();
  t = t.replace(/^(yr|year)\s*\d+\s*/,"");
  t = t.replace(/[^a-z0-9\s]/g," ");
  return t.split(/\s+/).filter(Boolean).map(w=> SUBJ_WORD_EXPAND[w]||w);
}
function subjectWordSimilarity(wordsA, wordsB){
  const a = new Set(wordsA), b = new Set(wordsB);
  const inter = [...a].filter(w=>b.has(w)).length;
  const union = new Set([...a,...b]).size;
  return union ? inter/union : 0;
}
function suggestSubjectMatch(name){
  const words = subjectNameWords(name);
  let best = null, bestScore = 0;
  state.subjects.forEach(s=>{
    const score = subjectWordSimilarity(words, subjectNameWords(s.name));
    if(score > bestScore){ bestScore = score; best = s; }
  });
  return bestScore >= 0.4 ? best : null;
}
function splitCsvLine(line){
  const out = []; let cur = "", inQ = false;
  for(let i=0;i<line.length;i++){
    const c = line[i];
    if(c === '"'){ inQ = !inQ; continue; }
    if(c === "," && !inQ){ out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}
function parseDayName(s){
  const t = (s||"").trim().toLowerCase();
  const map = {mon:0, monday:0, tue:1, tues:1, tuesday:1, wed:2, weds:2, wednesday:2, thu:3, thur:3, thurs:3, thursday:3, fri:4, friday:4};
  return map[t]!==undefined ? map[t] : null;
}
function parseTimeFlexible(s){
  if(!s) return null;
  s = s.trim();
  let m = s.match(/^(\d{1,2}):(\d{2})$/);
  if(m){ const h=+m[1], mi=+m[2]; if(h<24 && mi<60) return String(h).padStart(2,"0")+":"+String(mi).padStart(2,"0"); }
  m = s.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i);
  if(m){ let h=+m[1]; const mi=+m[2]; const ap=m[3].toLowerCase(); if(h===12) h=0; if(ap==="pm") h+=12; if(h<24 && mi<60) return String(h).padStart(2,"0")+":"+String(mi).padStart(2,"0"); }
  m = s.match(/^(\d{1,2})\s*([ap]m)$/i);
  if(m){ let h=+m[1]; const ap=m[2].toLowerCase(); if(h===12) h=0; if(ap==="pm") h+=12; return String(h).padStart(2,"0")+":00"; }
  return null;
}
function parseCSV(text){
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length);
  if(!lines.length) return {rows:[], error:"That file looks empty."};
  const header = splitCsvLine(lines[0]).map(h=>h.trim().toLowerCase());
  const idx = {
    day: header.indexOf("day"), subject: header.indexOf("subject"),
    start: header.indexOf("start"), end: header.indexOf("end"),
    room: header.indexOf("room"), teacher: header.indexOf("teacher"),
    type: header.indexOf("type")
  };
  // Backward compatibility: old format has Subject but no Type
  const hasTypeColumn = idx.type >= 0;
  if(!hasTypeColumn && (idx.day<0 || idx.subject<0 || idx.start<0 || idx.end<0)){
    return {rows:[], error:"CSV needs a header row with Day, Subject, Start, End columns (Room and Teacher are optional)."};
  }
  if(hasTypeColumn && (idx.day<0 || idx.start<0 || idx.end<0)){
    return {rows:[], error:"CSV needs a header row with Day, Start, End columns (Type is optional, Subject optional)."};
  }
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const cols = splitCsvLine(lines[i]);
    const dayRaw = (cols[idx.day]||"").trim();
    const subject = idx.subject>=0 ? (cols[idx.subject]||"").trim() : "";
    const startRaw = (cols[idx.start]||"").trim();
    const endRaw = (cols[idx.end]||"").trim();
    const room = idx.room>=0 ? (cols[idx.room]||"").trim() : "";
    const teacher = idx.teacher>=0 ? (cols[idx.teacher]||"").trim() : "";
    const typeRaw = idx.type>=0 ? (cols[idx.type]||"").trim().toLowerCase() : "";
    const day = parseDayName(dayRaw);
    const start = parseTimeFlexible(startRaw);
    const end = parseTimeFlexible(endRaw);
    const type = typeRaw === "task" ? "task" : typeRaw === "study" ? "study" : "event";
    let error = null;
    if(day===null) error = `Unrecognised day "${dayRaw}"`;
    else if(!subject && !hasTypeColumn) error = "Missing subject";
    else if(!start) error = `Unrecognised start time "${startRaw}"`;
    else if(!end) error = `Unrecognised end time "${endRaw}"`;
    else if(timeToMin(end)<=timeToMin(start)) error = "End time must be after start";
    rows.push({ day, subject, start, end, room, teacher, type, error, raw: lines[i] });
  }
  return {rows, error:null};
}
function unescapeICS(s){ return (s||"").replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\n/gi,"\n").replace(/\\\\/g,"\\"); }
function parseICSDate(v){
  if(!v) return null;
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if(!m) return null;
  const [, y, mo, da, h, mi, se, isUTC] = m;
  const d = isUTC
    ? new Date(Date.UTC(+y, +mo-1, +da, +h, +mi, +se))
    : new Date(+y, +mo-1, +da, +h, +mi, +se);
  return { day: mondayIndex(d), time: `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` };
}
function cleanICSSubject(summary){
  const m = summary.match(/^[A-Za-z0-9]{2,12}:\s*(.+)$/);
  return m ? m[1].trim() : summary.trim();
}
function parseICS(text){
  const raw = text.split(/\r\n|\n|\r/);
  const lines = [];
  raw.forEach(l=>{
    if((l.startsWith(" ")||l.startsWith("\t")) && lines.length) lines[lines.length-1] += l.slice(1);
    else lines.push(l);
  });
  const events = []; let cur = null; let inVtodo = false; let inStudy = false;
  lines.forEach(l=>{
    if(l.startsWith("BEGIN:VEVENT")){ cur = {}; inVtodo = false; inStudy = false; }
    else if(l.startsWith("BEGIN:VTODO")){ cur = {}; inVtodo = true; inStudy = false; }
    else if(l.startsWith("END:VEVENT") || l.startsWith("END:VTODO")){ 
      if(cur){ cur.isVtodo = inVtodo; cur.isStudy = inStudy; events.push(cur); }
      cur = null; inVtodo = false; inStudy = false; 
    }
    else if(cur){
      const i = l.indexOf(":"); if(i<0) return;
      const key = l.slice(0,i).split(";")[0].toUpperCase();
      const val = l.slice(i+1);
      if(key==="DTSTART") cur.dtstart = val;
      else if(key==="DTEND") cur.dtend = val;
      else if(key==="SUMMARY") cur.summary = unescapeICS(val);
      else if(key==="LOCATION") cur.location = unescapeICS(val).replace(/^Room:\s*/i, "");
      else if(key==="DESCRIPTION") cur.description = unescapeICS(val);
      else if(key==="X-STUDY") inStudy = val.toLowerCase() === "true";
    }
  });
  if(!events.length) return {rows:[], error:"No events or tasks found in this calendar file."};
  const rows = events.map(ev=>{
    const s = parseICSDate(ev.dtstart), e = parseICSDate(ev.dtend);
    if(!s || !e) return { error:"Couldn't read this event's time", raw: ev.summary||"(untitled)" };
    if(s.day===null || s.day>=DAYS.length) return null;
    if(timeToMin(e.time)<=timeToMin(s.time)) return { error:"End time must be after start", raw: ev.summary||"(untitled)" };
    const teacherMatch = (ev.description||"").match(/Teacher:\s*([^\n]+)/i);
    let type = "event";
    if(ev.isVtodo) type = "task";
    else if(ev.isStudy) type = "study";
    return {
      day:s.day, subject: cleanICSSubject(ev.summary||"Untitled"), start:s.time, end:e.time,
      room: ev.location||"", teacher: teacherMatch ? teacherMatch[1].trim() : "", type, error:null
    };
  }).filter(Boolean);
  return {rows, error: rows.length? null : "No weekday events found — only weekend events were in this file."};
}
document.getElementById("ttImportBtn").addEventListener("click", openImportModal);
function openImportModal(){
  importState = { rows: [] };
  const body = `
    <label class="field">Upload a .csv or .ics file
      <input type="file" class="input" id="impFile" accept=".csv,.ics,text/calendar,text/csv">
    </label>
    <div style="text-align:center; font-size:11px; color:var(--text-faint); margin:2px 0 10px;">— or paste CSV text —</div>
    <label class="field">CSV <span style="font-weight:400;">(header row: Day,Subject,Start,End,Room,Teacher)</span>
      <textarea class="input" id="impPaste" rows="4" style="font-family:var(--mono); font-size:12px;" placeholder="Day,Subject,Start,End,Room,Teacher&#10;Mon,Chemistry,09:00,10:00,Lab 3,Dr Lin"></textarea>
    </label>
    <button class="btn btn-sm" id="impParseBtn">Parse</button>
    <div id="impPreviewWrap"></div>
    <div class="modal-actions" id="impCancelWrap"><button class="btn" id="impCancel">Cancel</button></div>
  `;
  openModal("Import timetable", body, root=>{
    root.querySelector("#impFile").addEventListener("change", e=>{
      const file = e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=> runImportParse(reader.result, file.name, root);
      reader.readAsText(file);
    });
    root.querySelector("#impParseBtn").addEventListener("click", ()=>{
      const text = root.querySelector("#impPaste").value;
      if(!text.trim()){ toast("Paste some CSV text or choose a file first"); return; }
      runImportParse(text, "pasted.csv", root);
    });
    root.querySelector("#impCancel").addEventListener("click", closeModal);
  });
}
function dedupeImportRows(rows){
  const seen = new Set();
  return rows.filter(r=>{
    if(r.error) return true;
    const key = `${r.day}|${r.subject.trim().toLowerCase()}|${r.start}|${r.end}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function runImportParse(text, filename, root){
  const isICS = /^BEGIN:VCALENDAR/im.test(text) || /\.ics$/i.test(filename);
  const result = isICS ? parseICS(text) : parseCSV(text);
  const deduped = dedupeImportRows(result.rows);
  const dupCount = result.rows.length - deduped.length;
  importState.rows = deduped.map(r=> ({...r, include: !r.error}));
  importState.dupCount = dupCount;
  importState.subjectMap = {};
  // Show mapping for ALL subjects that don't have an exact match, even if they exist
  [...new Set(importState.rows.filter(r=>!r.error && !findSubjectByName(r.subject)).map(r=>r.subject.trim()))].forEach(name=>{
    const suggestion = suggestSubjectMatch(name);
    importState.subjectMap[name] = suggestion ? suggestion.id : "new";
  });
  renderImportPreview(root, result.error);
}
function importResolvedCount(){
  return importState.rows.filter(r=> {
    if(r.error || !r.include) return false;
    // Tasks don't need subject mapping
    if(r.type === "task") return true;
    // Events/study need subject mapping not set to skip
    return importState.subjectMap[r.subject.trim()] !== "skip";
  }).length;
}
function renderImportPreview(root, topError){
  const wrap = root.querySelector("#impPreviewWrap");
  root.querySelector("#impCancelWrap").style.display = topError || !importState.rows.length ? "flex" : "none";
  if(topError){ wrap.innerHTML = `<hr class="sep"><div class="empty" style="color:var(--danger);">${escapeHtml(topError)}</div>`; return; }
  const rows = importState.rows;
  const validCount = rows.filter(r=>!r.error).length;
  // Only show subject mapping for event/study types, not tasks
  const subjectRows = rows.filter(r=> !r.error && r.type !== "task");
  const unmatchedNames = [...new Set(subjectRows.filter(r=>!findSubjectByName(r.subject)).map(r=>r.subject.trim()))];
  wrap.innerHTML = `
    <hr class="sep">
    <div style="font-size:12.5px; color:var(--text-dim); margin-bottom:8px;">
      Found ${rows.length} weekly period${rows.length===1?"":"s"} — ${validCount} usable${rows.length-validCount>0?`, ${rows.length-validCount} skipped`:""}.
      ${importState.dupCount>0?` Collapsed ${importState.dupCount} repeated week-to-week occurrence${importState.dupCount===1?"":"s"} of the same class into one weekly slot.`:""}
    </div>
    ${unmatchedNames.length ? `
    <div style="font-size:12.5px; font-weight:600; color:var(--text); margin-bottom:6px;">Map imported subjects (events & study only)</div>
    <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px;">
      ${unmatchedNames.map(name=> {
      const row = importState.rows.find(r=> r.subject.trim()===name);
      const isTask = row?.type === "task";
      if(isTask) return ""; // Tasks don't need subject mapping
      return `
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="flex:1; font-size:12.5px; color:var(--text-dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(name)}</div>
          <div style="flex:1;" data-subj-map="${escapeHtml(name)}"></div>
        </div>
      `;
    }).join("")}
    </div>` : ""}
    <div style="max-height:220px; overflow:auto;">
    <table class="import-table"><thead><tr><th></th><th>Day</th><th>Subject/Title</th><th>Type</th><th>Start</th><th>End</th><th>Room</th></tr></thead><tbody>
      ${rows.map((r,i)=> r.error ? `
        <tr class="row-error"><td></td><td colspan="6">${escapeHtml(r.error)}${r.raw?` — "${escapeHtml(r.raw)}"`:""}</td></tr>
      ` : `
        <tr><td><input type="checkbox" data-imp-row="${i}" ${r.include?"checked":""}></td>
          <td>${DAYS[r.day]}</td><td>${escapeHtml(r.subject)}</td>
          <td><span class="badge ${r.type==="task"?"badge-muted":r.type==="study"?"badge-accent":"badge-success"}">${r.type}</span></td>
          <td>${r.start}</td><td>${r.end}</td><td>${escapeHtml(r.room||"—")}</td></tr>
      `).join("")}
    </tbody></table>
    </div>
    <div class="row" style="margin-top:12px;">
      <label class="radio-field"><input type="radio" name="impMode" value="merge" checked> Merge with existing periods</label>
      <label class="radio-field"><input type="radio" name="impMode" value="replace"> Replace all periods</label>
    </div>
    <div class="modal-actions">
      <button class="btn" id="impCancel2">Cancel</button>
      <button class="btn btn-primary" id="impCommit">Import ${importResolvedCount()} period${importResolvedCount()===1?"":"s"}</button>
    </div>
  `;
  wrap.querySelectorAll("[data-imp-row]").forEach(cb=> cb.addEventListener("change", e=>{
    importState.rows[Number(e.target.dataset.impRow)].include = e.target.checked;
    wrap.querySelector("#impCommit").textContent = `Import ${importResolvedCount()} period${importResolvedCount()===1?"":"s"}`;
  }));
  wrap.querySelectorAll("[data-subj-map]").forEach(sel=>{
    const name = sel.dataset.subjMap;
    const opts = [{value:"new",label:"Create new subject"}]
      .concat(state.subjects.map(s=>({value:s.id, label:"Map to "+s.name})))
      .concat([{value:"skip",label:"Don't import these rows"}]);
    initSelect(sel, opts, importState.subjectMap[name], v=>{
      importState.subjectMap[name] = v;
      wrap.querySelector("#impCommit").textContent = `Import ${importResolvedCount()} period${importResolvedCount()===1?"":"s"}`;
    });
  });
  wrap.querySelector("#impCancel2").addEventListener("click", closeModal);
  wrap.querySelector("#impCommit").addEventListener("click", ()=>{
    const mode = wrap.querySelector('input[name="impMode"]:checked').value;
    commitImport(mode);
  });
}
function commitImport(mode){
  const toAdd = importState.rows.filter(r=> {
    if(r.error || !r.include) return false;
    // Tasks don't need subject mapping
    if(r.type === "task") return true;
    // Events/study need subject mapping not set to skip
    return importState.subjectMap[r.subject.trim()] !== "skip";
  });
  if(!toAdd.length){ toast("Nothing selected to import"); return; }
  if(mode==="replace") state.timetable = [];
  const createdByName = {};
  toAdd.forEach(r=>{
    const type = r.type || "event";
    let subjectId = null;
    let title = "";
    
    if(type === "event" || type === "study"){
      // School periods - need subject mapping
      const key = r.subject.trim();
      const mapped = importState.subjectMap[key];
      let subj;
      if(mapped && mapped!=="new") subj = state.subjects.find(s=>s.id===mapped);
      if(!subj) subj = findSubjectByName(r.subject) || createdByName[key.toLowerCase()];
      if(!subj){ subj = {id:uid(), name:r.subject.trim(), color: nextPaletteColor()}; state.subjects.push(subj); createdByName[key.toLowerCase()] = subj; }
      subjectId = subj.id;
    } else if(type === "task"){
      // Tasks use the title field, not subject
      title = r.subject.trim();
    }
    
    state.timetable.push(makeBlock({ day:r.day, subjectId, title, start:r.start, end:r.end, type, recurring:true }));
  });
  save(); closeModal(); renderTimetable();
  toast(`Imported ${toAdd.length} period${toAdd.length===1?"":"s"}`);
}

/* ===================== Future: Obsidian / AI hooks ===================== */
// Future: called by AI planner to generate study sessions
function generateStudySession(subjectId, date, startTime, endTime, topics){
  // Creates a type:"study" block with generated=true
  // Populates studyTopics array
  const day = mondayIndex(new Date(date));
  const block = makeBlock({
    type: "study",
    title: state.subjects.find(s=>s.id===subjectId)?.name + " Study",
    day,
    start: startTime,
    end: endTime,
    subjectId,
    studyTopics: topics || [],
    studyProgress: 0,
    generated: true,
    recurring: false
  });
  state.timetable.push(block);
  save();
  renderTimetable();
  return block;
}
