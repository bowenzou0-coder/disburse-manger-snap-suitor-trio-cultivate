"use strict";

const DAY_START = 8*60, DAY_END = 16*60, PX_PER_MIN = 1.6;
let mobileTTDay = null;

function renderTimetable(){
  let start = DAY_START, end = DAY_END;
  state.timetable.forEach(p=>{ start = Math.min(start, timeToMin(p.start)); end = Math.max(end, timeToMin(p.end)); });
  start = Math.floor(start/60)*60; end = Math.ceil(end/60)*60;
  const totalH = (end-start)*PX_PER_MIN;
  const todayIdx = mondayIndex(new Date());
  let head = `<div class="tt-head"><div></div>` + DAYS.map((d,i)=>`<div class="${i===todayIdx?'today':''}">${d}</div>`).join("") + `</div>`;
  let hours = `<div class="tt-hours" style="height:${totalH}px;">`;
  for(let m=start; m<=end; m+=60){
    hours += `<div class="tt-hour-label" style="top:${(m-start)*PX_PER_MIN}px;">${minToTimeLabel(m)}</div>`;
  }
  hours += `</div>`;
  let cols = "";
  for(let d=0; d<5; d++){
    let inner = "";
    for(let m=start; m<=end; m+=60){
      inner += `<div class="tt-hline" style="top:${(m-start)*PX_PER_MIN}px;"></div>`;
    }
    const periods = state.timetable.filter(p=>p.day===d);
    periods.forEach(p=>{
      const subj = subjectById(p.subjectId);
      const color = subj?subj.color:"#94a3b8";
      const top = (timeToMin(p.start)-start)*PX_PER_MIN;
      const h = Math.max(6,(timeToMin(p.end)-timeToMin(p.start))*PX_PER_MIN - 3);
      const name = escapeHtml(subj?subj.name:(p.label||"Untitled"));
      const meta = `${minToTimeLabel(timeToMin(p.start))}–${minToTimeLabel(timeToMin(p.end))}${p.room?" · "+escapeHtml(p.room):""}`;
      const titleAttr = escapeHtml(`${subj?subj.name:(p.label||"Untitled")} — ${minToTimeLabel(timeToMin(p.start))}–${minToTimeLabel(timeToMin(p.end))}${p.room?" · "+p.room:""}`);
      if(h < 15){
        inner += `<div class="tt-block tt-sliver" data-edit-period="${p.id}" title="${titleAttr}" style="top:${top}px; height:${h}px; background:${color}; border-color:${color};"></div>`;
      } else {
        const tight = h < 42;
        inner += `<div class="tt-block${tight?' tt-tight':''}" data-edit-period="${p.id}" title="${titleAttr}" style="top:${top}px; height:${h}px; background:${color}22; border-color:${color}; color:${color};">
          <b>${name}</b>${tight?"":`<div class="tt-block-meta">${meta}</div>`}
        </div>`;
      }
    });
    if(d===todayIdx){
      const now = new Date(); const nowMin = now.getHours()*60+now.getMinutes();
      if(nowMin>=start && nowMin<=end){
        inner += `<div class="tt-now-line" style="top:${(nowMin-start)*PX_PER_MIN}px;"><div class="tt-now-dot"></div></div>`;
      }
    }
    inner += `<button class="btn btn-sm tt-add-col-btn" data-add-day="${d}">+ Add</button>`;
    cols += `<div class="tt-col ${d===todayIdx?'today':''}" style="height:${totalH}px;">${inner}</div>`;
  }
  const body = `<div class="tt-body">${hours}${cols}</div>`;
  document.getElementById("ttGrid").innerHTML = head + body;
  document.getElementById("ttGrid").querySelectorAll("[data-edit-period]").forEach(el=>
    el.addEventListener("click", ()=> openPeriodModal(el.dataset.editPeriod, undefined, el)));
  document.getElementById("ttGrid").querySelectorAll("[data-add-day]").forEach(el=>
    el.addEventListener("click", ()=> openPeriodModal(null, Number(el.dataset.addDay), el)));
  document.getElementById("ttLegend").innerHTML = state.subjects.map(s=>
    `<span><span class="dot" style="background:${s.color}"></span>${escapeHtml(s.name)}</span>`).join("");
  renderTimetableMobile();
}
document.getElementById("ttAddBtn").addEventListener("click", (e)=> openPeriodModal(null, mondayIndex(new Date())<=4?mondayIndex(new Date()):0, e.currentTarget));

function renderTimetableMobile(){
  const todayIdx = mondayIndex(new Date());
  if(mobileTTDay===null) mobileTTDay = todayIdx<=4 ? todayIdx : 0;
  document.getElementById("ttDayTabs").innerHTML = DAYS.map((d,i)=>
    `<button class="${mobileTTDay===i?'active':''}" data-day-tab="${i}">${d}${i===todayIdx?' •':''}</button>`).join("");
  document.getElementById("ttDayTabs").querySelectorAll("button").forEach(b=>
    b.addEventListener("click", ()=>{ mobileTTDay = Number(b.dataset.dayTab); renderTimetableMobile(); }));
  const periods = state.timetable.filter(p=>p.day===mobileTTDay).sort((a,b)=>timeToMin(a.start)-timeToMin(b.start));
  const list = document.getElementById("ttDayList");
  if(!periods.length){ list.innerHTML = `<div class="empty">No periods for ${DAYS[mobileTTDay]} yet.</div>`; }
  else{
    const now = new Date(); const nowMin = now.getHours()*60+now.getMinutes();
    list.innerHTML = periods.map(p=>{
      const subj = subjectById(p.subjectId);
      const color = subj?subj.color:"#94a3b8";
      const name = subj?subj.name:(p.label||"Untitled");
      const active = mobileTTDay===todayIdx && nowMin>=timeToMin(p.start) && nowMin<timeToMin(p.end);
      return `<div class="tt-day-card ${active?'now':''}" data-edit-period-m="${p.id}" style="border-left-color:${color};">
        <div class="tt-day-card-time">${minToTimeLabel(timeToMin(p.start))} – ${minToTimeLabel(timeToMin(p.end))}</div>
        <div class="tt-day-card-name">${escapeHtml(name)}</div>
        ${(p.room||p.teacher)?`<div class="tt-day-card-meta">${[p.room,p.teacher].filter(Boolean).map(escapeHtml).join(" · ")}</div>`:""}
        ${active?'<span class="now-tag">NOW</span>':''}
      </div>`;
    }).join("");
    list.querySelectorAll("[data-edit-period-m]").forEach(el=>
      el.addEventListener("click", ()=> openPeriodModal(el.dataset.editPeriodM, undefined, el)));
  }
  document.getElementById("ttMobileAddBtn").onclick = e=> openPeriodModal(null, mobileTTDay, e.currentTarget);
}

function openPeriodModal(periodId, prefillDay, anchor){
  const editing = periodId ? state.timetable.find(p=>p.id===periodId) : null;
  const body = `
    <label class="field">Day
      <div class="input" id="pfDay"></div>
    </label>
    <label class="field">Subject
      <div class="input" id="pfSubject"></div>
    </label>
    <label class="field" id="pfLabelWrap" style="display:${editing&&!editing.subjectId?'flex':'none'}">Custom label
      <input class="input" id="pfLabel" value="${editing&&editing.label?escapeHtml(editing.label):''}" placeholder="e.g. Assembly">
    </label>
    <div class="row">
      <label class="field">Start<input class="input" type="time" id="pfStart" value="${editing?editing.start:'09:00'}"></label>
      <label class="field">End<input class="input" type="time" id="pfEnd" value="${editing?editing.end:'09:50'}"></label>
    </div>
    <div class="row">
      <label class="field">Room<input class="input" id="pfRoom" value="${editing&&editing.room?escapeHtml(editing.room):''}"></label>
      <label class="field">Teacher<input class="input" id="pfTeacher" value="${editing&&editing.teacher?escapeHtml(editing.teacher):''}"></label>
    </div>
    <div class="modal-actions">
      ${editing?'<button class="btn btn-danger" id="pfDelete">Delete</button>':''}
      <button class="btn" id="pfCancel">Cancel</button>
      <button class="btn btn-primary" id="pfSave">Save</button>
    </div>`;
  openPopover(anchor, editing?"Edit period":"Add period", body, (root)=>{
    initSelect(root.querySelector("#pfDay"), DAYS.map((d,i)=>({value:i,label:d})), editing?editing.day:prefillDay);
    const subjOpts = [{value:"",label:"— custom label —"}].concat(state.subjects.map(s=>({value:s.id,label:s.name})));
    initSelect(root.querySelector("#pfSubject"), subjOpts, editing&&editing.subjectId?editing.subjectId:"", v=>{
      root.querySelector("#pfLabelWrap").style.display = v ? "none" : "flex";
    });
    root.querySelector("#pfCancel").addEventListener("click", closePopover);
    if(editing) root.querySelector("#pfDelete").addEventListener("click", ()=>{
      state.timetable = state.timetable.filter(p=>p.id!==editing.id); save(); closePopover(); renderTimetable();
    });
    root.querySelector("#pfSave").addEventListener("click", ()=>{
      const start = root.querySelector("#pfStart").value, end = root.querySelector("#pfEnd").value;
      if(!start || !end || timeToMin(end)<=timeToMin(start)){ toast("End time must be after start time"); return; }
      const rec = {
        id: editing?editing.id:uid(),
        day: Number(root.querySelector("#pfDay").value),
        subjectId: root.querySelector("#pfSubject").value || null,
        label: root.querySelector("#pfLabel").value.trim(),
        start, end,
        room: root.querySelector("#pfRoom").value.trim(),
        teacher: root.querySelector("#pfTeacher").value.trim()
      };
      if(editing){ Object.assign(editing, rec); } else { state.timetable.push(rec); }
      save(); closePopover(); renderTimetable();
    });
  });
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
    room: header.indexOf("room"), teacher: header.indexOf("teacher")
  };
  if(idx.day<0 || idx.subject<0 || idx.start<0 || idx.end<0){
    return {rows:[], error:"CSV needs a header row with Day, Subject, Start, End columns (Room and Teacher are optional)."};
  }
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const cols = splitCsvLine(lines[i]);
    const dayRaw = (cols[idx.day]||"").trim();
    const subject = (cols[idx.subject]||"").trim();
    const startRaw = (cols[idx.start]||"").trim();
    const endRaw = (cols[idx.end]||"").trim();
    const room = idx.room>=0 ? (cols[idx.room]||"").trim() : "";
    const teacher = idx.teacher>=0 ? (cols[idx.teacher]||"").trim() : "";
    const day = parseDayName(dayRaw);
    const start = parseTimeFlexible(startRaw);
    const end = parseTimeFlexible(endRaw);
    let error = null;
    if(day===null) error = `Unrecognised day "${dayRaw}"`;
    else if(!subject) error = "Missing subject";
    else if(!start) error = `Unrecognised start time "${startRaw}"`;
    else if(!end) error = `Unrecognised end time "${endRaw}"`;
    else if(timeToMin(end)<=timeToMin(start)) error = "End time must be after start";
    rows.push({ day, subject, start, end, room, teacher, error, raw: lines[i] });
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
  const events = []; let cur = null;
  lines.forEach(l=>{
    if(l.startsWith("BEGIN:VEVENT")) cur = {};
    else if(l.startsWith("END:VEVENT")){ if(cur) events.push(cur); cur = null; }
    else if(cur){
      const i = l.indexOf(":"); if(i<0) return;
      const key = l.slice(0,i).split(";")[0].toUpperCase();
      const val = l.slice(i+1);
      if(key==="DTSTART") cur.dtstart = val;
      else if(key==="DTEND") cur.dtend = val;
      else if(key==="SUMMARY") cur.summary = unescapeICS(val);
      else if(key==="LOCATION") cur.location = unescapeICS(val).replace(/^Room:\s*/i, "");
      else if(key==="DESCRIPTION") cur.description = unescapeICS(val);
    }
  });
  if(!events.length) return {rows:[], error:"No events found in this calendar file."};
  const rows = events.map(ev=>{
    const s = parseICSDate(ev.dtstart), e = parseICSDate(ev.dtend);
    if(!s || !e) return { error:"Couldn't read this event's time", raw: ev.summary||"(untitled)" };
    if(s.day===null || s.day>4) return null;
    if(timeToMin(e.time)<=timeToMin(s.time)) return { error:"End time must be after start", raw: ev.summary||"(untitled)" };
    const teacherMatch = (ev.description||"").match(/Teacher:\s*([^\n]+)/i);
    return {
      day:s.day, subject: cleanICSSubject(ev.summary||"Untitled"), start:s.time, end:e.time,
      room: ev.location||"", teacher: teacherMatch ? teacherMatch[1].trim() : "", error:null
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
  [...new Set(importState.rows.filter(r=>!r.error && !findSubjectByName(r.subject)).map(r=>r.subject.trim()))].forEach(name=>{
    const suggestion = suggestSubjectMatch(name);
    importState.subjectMap[name] = suggestion ? suggestion.id : "new";
  });
  renderImportPreview(root, result.error);
}
function importResolvedCount(){
  return importState.rows.filter(r=> !r.error && r.include && importState.subjectMap[r.subject.trim()]!=="skip").length;
}
function renderImportPreview(root, topError){
  const wrap = root.querySelector("#impPreviewWrap");
  root.querySelector("#impCancelWrap").style.display = topError || !importState.rows.length ? "flex" : "none";
  if(topError){ wrap.innerHTML = `<hr class="sep"><div class="empty" style="color:var(--danger);">${escapeHtml(topError)}</div>`; return; }
  const rows = importState.rows;
  const validCount = rows.filter(r=>!r.error).length;
  const unmatchedNames = Object.keys(importState.subjectMap);
  wrap.innerHTML = `
    <hr class="sep">
    <div style="font-size:12.5px; color:var(--text-dim); margin-bottom:8px;">
      Found ${rows.length} weekly period${rows.length===1?"":"s"} — ${validCount} usable${rows.length-validCount>0?`, ${rows.length-validCount} skipped`:""}.
      ${importState.dupCount>0?` Collapsed ${importState.dupCount} repeated week-to-week occurrence${importState.dupCount===1?"":"s"} of the same class into one weekly slot.`:""}
    </div>
    ${unmatchedNames.length ? `
    <div style="font-size:12.5px; font-weight:600; color:var(--text); margin-bottom:6px;">Map imported subjects</div>
    <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px;">
      ${unmatchedNames.map(name=> `
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="flex:1; font-size:12.5px; color:var(--text-dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(name)}</div>
          <div class="input" style="flex:1;" data-subj-map="${escapeHtml(name)}"></div>
        </div>
      `).join("")}
    </div>` : ""}
    <div style="max-height:220px; overflow:auto;">
    <table class="import-table"><thead><tr><th></th><th>Day</th><th>Subject</th><th>Start</th><th>End</th><th>Room</th></tr></thead><tbody>
      ${rows.map((r,i)=> r.error ? `
        <tr class="row-error"><td></td><td colspan="5">${escapeHtml(r.error)}${r.raw?` — "${escapeHtml(r.raw)}"`:""}</td></tr>
      ` : `
        <tr><td><input type="checkbox" data-imp-row="${i}" ${r.include?"checked":""}></td>
          <td>${DAYS[r.day]}</td><td>${escapeHtml(r.subject)}</td>
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
  const toAdd = importState.rows.filter(r=> !r.error && r.include && importState.subjectMap[r.subject.trim()]!=="skip");
  if(!toAdd.length){ toast("Nothing selected to import"); return; }
  if(mode==="replace") state.timetable = [];
  const createdByName = {};
  toAdd.forEach(r=>{
    const key = r.subject.trim();
    const mapped = importState.subjectMap[key];
    let subj;
    if(mapped && mapped!=="new") subj = state.subjects.find(s=>s.id===mapped);
    if(!subj) subj = findSubjectByName(r.subject) || createdByName[key.toLowerCase()];
    if(!subj){ subj = {id:uid(), name:r.subject.trim(), color: nextPaletteColor()}; state.subjects.push(subj); createdByName[key.toLowerCase()] = subj; }
    state.timetable.push({ id:uid(), day:r.day, subjectId:subj.id, label:"", start:r.start, end:r.end, room:r.room||"", teacher:r.teacher||"" });
  });
  save(); closeModal(); renderTimetable();
  toast(`Imported ${toAdd.length} period${toAdd.length===1?"":"s"}`);
}
