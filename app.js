"use strict";

const KEY = "studyDashboard.v1";
const PALETTE = ["#b85c38","#5f8a63","#a87e23","#5c7a99","#7e5a75","#3f7e74","#a8465a"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const TABS = [
  {id:"overview", label:"Overview", icon:'<path d="M3 11l9-7 9 7"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>'},
  {id:"timetable", label:"Timetable", icon:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4"/><path d="M16 2v4"/>'},
  {id:"pomodoro", label:"Pomodoro", icon:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6"/>'},
  {id:"checklist", label:"Checklist", icon:'<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M4 6l1 1 2-2"/><path d="M4 12l1 1 2-2"/><path d="M4 18l1 1 2-2"/>'},
  {id:"marks", label:"Marks", icon:'<path d="M3 17l5-5 4 4 8-9"/><path d="M14 7h6v6"/>'},
  {id:"analytics", label:"Analytics", icon:'<path d="M4 20V10"/><path d="M11 20V4"/><path d="M18 20v-7"/>'},
  {id:"settings", label:"Settings", icon:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19.7a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.96 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.04 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8.96a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04z"/>'}
];

function makeTask(overrides){
  return Object.assign({
    id:uid(), title:"", done:false, due:null, priority:0, completedAt:null,
    repeat:null, repeatDays:[], completedDates:[], description:"",
    parentId:null, collapsed:false, todoistId:null, descExpanded:false
  }, overrides);
}
function makeBlock(overrides){
  return Object.assign({
    id:uid(), type:"event", title:"", description:"",
    day:0, start:"09:00", end:"10:00",
    color:null, subjectId:null,
    recurring:true, templateId:null,
    todoistId:null, completed:false, completedAt:null,
    obsidianRef:null, generated:false, studyTopics:[], studyProgress:0, createdAt:todayISO()
  }, overrides);
}
function seedSubjects(){
  const names = ["Chemistry","Biology","Maths Ext 1","Maths Advanced","English Advanced","Latin Continuers","Economics"];
  return names.map((n,i)=>({id:uid(), name:n, color:PALETTE[i % PALETTE.length]}));
}
function defaultState(){
  return {
    subjects: seedSubjects(),
    timetable: [],
    templates: [],
    tasks: [],
    marks: [],
    sessions: [],
    notes: "",
    goals: {},
    benchmarks: {},
    weekOffset: 0,
    settings: { pomodoroWork:25, pomodoroShort:5, pomodoroLong:15, longBreakInterval:4, theme:"light", lastTab:"overview" }
  };
}
function normalizeTasksSlice(cats){
  return (cats||[]).map(cat=>({
    id: cat.id, name: cat.name||"Untitled", color: cat.color||"#888888",
    description: cat.description||"", todoistId: cat.todoistId||null,
    tasks: (cat.tasks||[]).map(t=>makeTask(t)),
    groups: (cat.groups||[]).map(g=>({
      id: g.id, name: g.name||"Untitled", todoistSectionId: g.todoistSectionId||null,
      tasks: (g.tasks||[]).map(t=>makeTask(t))
    }))
  }));
}
let state = loadState();
function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const d = defaultState();
    const merged = Object.assign({}, d, parsed, { settings: Object.assign({}, d.settings, parsed.settings||{}) });
    merged.tasks = normalizeTasksSlice(merged.tasks);
    if(!merged.templates) merged.templates = [];
    if(merged.timetable.length && merged.timetable[0] && merged.timetable[0].subjectId !== undefined && !merged.timetable[0].type){
      merged.timetable = merged.timetable.map(p => makeBlock({
        id: p.id, type:"event", title: p.label||"", day: p.day,
        start: p.start, end: p.end, subjectId: p.subjectId, recurring:true, createdAt: todayISO()
      }));
    }
    return merged;
  }catch(e){ return defaultState(); }
}
const BACKUP_KEY = KEY + ".bak";
function save(){
  const prev = localStorage.getItem(KEY);
  if(prev) localStorage.setItem(BACKUP_KEY, prev);
  localStorage.setItem(KEY, JSON.stringify(state));
  schedulePush();
  // Automatic Todoist sync disabled to prevent unwanted background syncing and duplication.
  // Sync is now manual-only via the Todoist panel.
}

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function isoDate(d){ d = d||new Date(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function todayISO(){ return isoDate(new Date()); }
function mondayIndex(d){ const js=d.getDay(); return js===0?6:js-1; }
function addDays(dateStr, n){ const d=new Date(dateStr+"T00:00:00"); d.setDate(d.getDate()+n); return isoDate(d); }
function daysBetween(a,b){ return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000); }
function timeToMin(t){ const [h,m]=t.split(":").map(Number); return h*60+m; }
function minToTimeLabel(mins){
  let h=Math.floor(mins/60), m=mins%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function fmtHM(mins){ const h=Math.floor(mins/60), m=mins%60; return h>0? `${h}h ${m}m` : `${m}m`; }
function escapeHtml(s){ return String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function subjectById(id){ return state.subjects.find(s=>s.id===id); }
function nextPaletteColor(){
  const used = state.subjects.map(s=>s.color);
  return PALETTE.find(c=>!used.includes(c)) || PALETTE[state.subjects.length % PALETTE.length];
}
function icon(svgInner, size){ return `<svg viewBox="0 0 24 24" width="${size||15}" height="${size||15}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgInner}</svg>`; }

function renderStreakChip(){
  const streak = computeStreak();
  const filled = streak===0 ? 0 : (streak % 5===0 ? 5 : streak % 5);
  let dots = "";
  for(let i=0;i<5;i++){
    dots += `<span style="width:5px;height:5px;border-radius:50%;background:${i<filled?'var(--accent)':'var(--border)'};flex-shrink:0;"></span>`;
  }
  document.getElementById("streakChip").innerHTML = `<div style="display:flex; gap:3px;">${dots}</div><span>${streak}&nbsp;day streak</span>`;
}

function taskDoneToday(t){
  if(t.repeat) return (t.completedDates||[]).includes(t.due || todayISO());
  return !!t.done;
}
function setTaskDoneToday(t, done){
  if(t.repeat){
    t.due = t.due || todayISO();
    if(t.due < todayISO()){
      if(done) t.due = nextScheduledDate(t, todayISO());
      return;
    }
    t.completedDates = t.completedDates || [];
    const idx = t.completedDates.indexOf(t.due);
    if(done && idx===-1) t.completedDates.push(t.due);
    else if(!done && idx!==-1) t.completedDates.splice(idx,1);
    const cutoff = addDays(todayISO(), -400);
    t.completedDates = t.completedDates.filter(d=> d >= cutoff);
  } else {
    t.done = done;
    t.completedAt = done ? todayISO() : null;
  }
}
function taskCompletedOnDate(t, date){
  if(t.repeat) return (t.completedDates||[]).includes(date);
  return t.done && t.completedAt===date;
}
function taskScheduledOn(t, dateISO){
  if(!t.repeat) return true;
  if(t.repeat==="daily") return true;
  const dow = new Date(dateISO+"T00:00:00").getDay();
  if(t.repeat==="weekday") return dow>=1 && dow<=5;
  if(t.repeat==="weekly") return (t.repeatDays||[]).includes(dow);
  return true;
}
function nextScheduledDate(t, fromDateISO){
  let d = fromDateISO;
  for(let i=0;i<8;i++){
    if(taskScheduledOn(t, d)) return d;
    d = addDays(d, 1);
  }
  return fromDateISO;
}
function taskRelevantToday(t){
  if(!t.repeat) return true;
  if(taskScheduledOn(t, todayISO())) return true;
  return !!(t.due && t.due < todayISO() && !taskDoneToday(t));
}
function taskRepeatLabel(t){
  if(t.repeat==="daily") return "Repeats daily";
  if(t.repeat==="weekday") return "Repeats on weekdays";
  if(t.repeat==="weekly") return "Repeats "+(t.repeatDays||[]).slice().sort((a,b)=>a-b).map(d=>QA_DOW_NAMES[d]).join("/");
  return "";
}
function getActiveDatesSet(){
  const set = new Set();
  state.sessions.forEach(s=> set.add(s.date));
  const addTask = t=>{
    if(t.repeat) (t.completedDates||[]).forEach(d=>set.add(d));
    else if(t.done && t.completedAt) set.add(t.completedAt);
  };
  state.tasks.forEach(cat=>{ cat.tasks.forEach(addTask); cat.groups.forEach(g=> g.tasks.forEach(addTask)); });
  return set;
}
function tasksCompletedCountOnDate(dateStr){
  let count = 0;
  const addTask = t=>{ if(taskCompletedOnDate(t, dateStr)) count++; };
  state.tasks.forEach(cat=>{ cat.tasks.forEach(addTask); cat.groups.forEach(g=> g.tasks.forEach(addTask)); });
  return count;
}
function computeStreak(){
  const set = getActiveDatesSet();
  let d = todayISO();
  if(!set.has(d)) d = addDays(d,-1);
  let streak = 0;
  while(set.has(d)){ streak++; d = addDays(d,-1); }
  return streak;
}
function minutesOnDate(dateStr){ return state.sessions.filter(s=>s.date===dateStr).reduce((a,s)=>a+s.minutes,0); }

function rolloverRepeatTasks(){
  const today = todayISO();
  const advance = t=>{
    if(!t.repeat) return;
    if(!t.due){ t.due = today; return; }
    if(t.due < today && taskCompletedOnDate(t, t.due)){
      t.due = nextScheduledDate(t, addDays(t.due, 1));
    }
  };
  state.tasks.forEach(cat=>{ cat.tasks.forEach(advance); cat.groups.forEach(g=> g.tasks.forEach(advance)); });
}
function cleanupCompletedTasks(){
  const cleanArr = arr=>{
    const doneParentIds = new Set(arr.filter(t=> !t.repeat && !t.parentId && t.done).map(t=>t.id));
    return arr.filter(t=>{
      if(t.repeat) return true;
      if(!t.parentId) return !t.done;
      if(doneParentIds.has(t.parentId)) return false;
      return !t.done;
    });
  };
  state.tasks.forEach(cat=>{ cat.tasks = cleanArr(cat.tasks); cat.groups.forEach(g=>{ g.tasks = cleanArr(g.tasks); }); });
}
const LAST_SEEN_DAY_KEY = "keystone.lastSeenDay";
function runDailyRollover(){
  rolloverRepeatTasks();
  const today = todayISO();
  const lastSeen = localStorage.getItem(LAST_SEEN_DAY_KEY);
  if(lastSeen !== today){
    if(lastSeen) cleanupCompletedTasks();
    localStorage.setItem(LAST_SEEN_DAY_KEY, today);
    return true;
  }
  return false;
}

function renderNav(){
  const nav = document.getElementById("navList");
  nav.innerHTML = TABS.map(t=>`<button class="navitem" data-tab="${t.id}">${icon(t.icon)}<span>${t.label}</span></button>`).join("");
  nav.querySelectorAll(".navitem").forEach(b=> b.addEventListener("click", ()=> switchTab(b.dataset.tab)));
  renderBottomNav();
}
const BOTTOM_NAV_PRIMARY = ["overview","timetable","pomodoro","checklist"];
const MORE_ICON = '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';
function renderBottomNav(){
  const nav = document.getElementById("bottomNav");
  const primary = BOTTOM_NAV_PRIMARY.map(id=> TABS.find(t=>t.id===id));
  nav.innerHTML = primary.map(t=>`<button class="bn-item" data-bn-tab="${t.id}">${icon(t.icon)}<span>${t.label}</span></button>`).join("")
    + `<button class="bn-item" id="bnMoreBtn">${icon(MORE_ICON)}<span>More</span></button>`;
  nav.querySelectorAll("[data-bn-tab]").forEach(b=> b.addEventListener("click", ()=> switchTab(b.dataset.bnTab)));
  nav.querySelector("#bnMoreBtn").addEventListener("click", openMoreSheet);
}
function openMoreSheet(){
  const items = ["marks","analytics","settings"].map(id=> TABS.find(t=>t.id===id));
  const body = items.map(t=>`<button class="sheet-option" data-more-tab="${t.id}" style="display:flex; align-items:center; gap:12px;">${icon(t.icon,18)}<span>${t.label}</span></button>`).join("");
  openPopoverSheet("More", body, root=>{
    root.querySelectorAll("[data-more-tab]").forEach(b=> b.addEventListener("click", ()=>{ closePopover(); switchTab(b.dataset.moreTab); }));
  });
}
function switchTab(id){
  document.querySelectorAll(".tab").forEach(el=> el.classList.toggle("active", el.id === "tab-"+id));
  document.querySelectorAll(".navitem").forEach(el=> el.classList.toggle("active", el.dataset.tab === id));
  document.querySelectorAll("#bottomNav [data-bn-tab]").forEach(el=> el.classList.toggle("active", el.dataset.bnTab === id));
  const moreBtn = document.getElementById("bnMoreBtn");
  if(moreBtn) moreBtn.classList.toggle("active", !BOTTOM_NAV_PRIMARY.includes(id));
  state.settings.lastTab = id; save();
  renderStreakChip();
  if(id==="overview") renderOverview();
  if(id==="timetable") renderTimetable();
  if(id==="pomodoro") renderPomodoro();
  if(id==="checklist") renderChecklist();
  if(id==="marks") renderMarks();
  if(id==="analytics") renderAnalytics();
  if(id==="settings") renderSettings();
}

function applyTheme(){
  document.body.setAttribute("data-theme", state.settings.theme);
  document.getElementById("themeToggle").textContent = state.settings.theme==="dark" ? "☀ Light mode" : "🌙 Dark mode";
}
document.getElementById("themeToggle").addEventListener("click", ()=>{
  state.settings.theme = state.settings.theme==="dark" ? "light" : "dark";
  save(); applyTheme();
});
