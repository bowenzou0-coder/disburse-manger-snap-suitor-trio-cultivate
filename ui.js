"use strict";

/* ===================== toast ===================== */
function toast(msg){
  let t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = "position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:9px 18px;border-radius:999px;font-size:13px;font-weight:600;z-index:999;box-shadow:var(--shadow-modal);";
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2200);
}

/* ===================== popover ===================== */
let activePopover = null;
function closePopover(){
  if(!activePopover) return;
  document.removeEventListener("keydown", activePopover.esc);
  if(activePopover.outside) document.removeEventListener("mousedown", activePopover.outside, true);
  activePopover.close();
  activePopover = null;
}
function openPopover(anchor, title, bodyHtml, onMount){
  closePopover();
  if(isMobileViewport()) return openPopoverSheet(title, bodyHtml, onMount);
  const pop = document.createElement("div");
  pop.className = "popover";
  pop.innerHTML = `${title?`<h3>${title}</h3>`:""}<div class="popover-body">${bodyHtml}</div>`;
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const popW = 320;
  let left = Math.round(r.right - popW);
  left = Math.max(12, Math.min(left, window.innerWidth - popW - 12));
  let top = Math.round(r.bottom + 10);
  pop.style.left = left + "px";
  pop.style.top = top + "px";
  const arrow = document.createElement("div");
  arrow.className = "popover-arrow arrow-top";
  arrow.style.right = Math.max(16, Math.min(popW - 30, (r.left + r.width/2) - left - 6)) + "px";
  pop.appendChild(arrow);
  requestAnimationFrame(()=>{
    const ph = pop.offsetHeight;
    if(top + ph > window.innerHeight - 12){
      const newTop = r.top - ph - 10;
      pop.style.top = Math.max(12, newTop) + "px";
      arrow.className = "popover-arrow arrow-bottom";
    }
  });
  const outside = e=>{ if(!pop.contains(e.target) && e.target!==anchor && !anchor.contains(e.target)) closePopover(); };
  const esc = e=>{ if(e.key==="Escape") closePopover(); };
  setTimeout(()=> document.addEventListener("mousedown", outside, true), 0);
  document.addEventListener("keydown", esc);
  activePopover = { el: pop, outside, esc, close(){ pop.remove(); } };
  if(onMount) onMount(pop.querySelector(".popover-body"));
  return pop;
}
function openPopoverSheet(title, bodyHtml, onMount){
  const overlay = document.createElement("div");
  overlay.className = "sheet-overlay";
  overlay.innerHTML = `<div class="sheet"><div class="sheet-handle"></div>${title?`<h3 style="padding:0 8px 12px; font-size:16px; font-weight:700;">${title}</h3>`:""}<div class="popover-body" style="padding:0 4px;"></div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector(".popover-body").innerHTML = bodyHtml;
  requestAnimationFrame(()=> overlay.classList.add("open"));
  const outside = e=>{ if(e.target===overlay) closePopover(); };
  overlay.addEventListener("mousedown", outside);
  const esc = e=>{ if(e.key==="Escape") closePopover(); };
  document.addEventListener("keydown", esc);
  activePopover = { el: overlay, outside:null, esc, close(){
    overlay.classList.remove("open");
    setTimeout(()=> overlay.remove(), 220);
  }};
  if(onMount) onMount(overlay.querySelector(".popover-body"));
  return overlay;
}
function promptPopover(anchor, title, opts, onSave){
  opts = opts || {};
  const body = `
    <label class="field">${opts.label||"Name"}<input class="input" id="pmValue" value="${escapeHtml(opts.value||"")}" placeholder="${escapeHtml(opts.placeholder||"")}"></label>
    ${opts.color!==undefined?`<label class="field">Colour<input type="color" class="color-input" id="pmColor" value="${opts.color}"></label>`:""}
    <div class="modal-actions"><button class="btn" id="pmCancel">Cancel</button><button class="btn btn-primary" id="pmSave">Save</button></div>`;
  openPopover(anchor, title, body, root=>{
    const input = root.querySelector("#pmValue");
    input.focus(); input.select();
    const submit = ()=>{
      const val = input.value.trim();
      if(!val){ toast("This can't be empty"); return; }
      const color = opts.color!==undefined ? root.querySelector("#pmColor").value : undefined;
      closePopover();
      onSave(val, color);
    };
    input.addEventListener("keydown", e=>{ if(e.key==="Enter") submit(); });
    root.querySelector("#pmCancel").addEventListener("click", closePopover);
    root.querySelector("#pmSave").addEventListener("click", submit);
  });
}
function openCategoryEditPopover(anchor, cat){
  const body = `
    <label class="field">Name<input class="input" id="ceName" value="${escapeHtml(cat.name)}"></label>
    <label class="field">Colour<input type="color" class="color-input" id="ceColor" value="${cat.color}"></label>
    <label class="field">Description <span style="font-weight:400;">(optional)</span>
      <textarea class="input" id="ceDescription" rows="3" placeholder="Add a note...">${escapeHtml(cat.description||"")}</textarea>
    </label>
    <div class="modal-actions"><button class="btn" id="ceCancel">Cancel</button><button class="btn btn-primary" id="ceSave">Save</button></div>`;
  openPopover(anchor, "Edit category", body, root=>{
    const input = root.querySelector("#ceName");
    input.focus(); input.select();
    const submit = ()=>{
      const name = input.value.trim();
      if(!name){ toast("This can't be empty"); return; }
      cat.name = name;
      cat.color = root.querySelector("#ceColor").value;
      cat.description = root.querySelector("#ceDescription").value.trim();
      closePopover();
      renderChecklist();
    };
    root.querySelector("#ceCancel").addEventListener("click", closePopover);
    root.querySelector("#ceSave").addEventListener("click", submit);
  });
}

/* ===================== custom select ===================== */
const PHONE_BREAKPOINT = 700;
function isMobileViewport(){ return window.innerWidth < PHONE_BREAKPOINT; }
let activeCselDropdown = null;
function closeCselDropdown(){
  if(!activeCselDropdown) return;
  activeCselDropdown.el.remove();
  document.removeEventListener("mousedown", activeCselDropdown.outside, true);
  activeCselDropdown = null;
}
function openSelectPicker(anchor, options, currentValue, onPick){
  if(isMobileViewport()){
    const overlay = document.createElement("div");
    overlay.className = "sheet-overlay";
    overlay.innerHTML = `<div class="sheet"><div class="sheet-handle"></div><div class="sheet-list">${
      options.map(o=>`<button class="sheet-option ${String(o.value)===String(currentValue)?"active":""}" data-v="${escapeHtml(String(o.value))}">${escapeHtml(o.label)}</button>`).join("")
    }</div></div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(()=> overlay.classList.add("open"));
    function close(){ overlay.classList.remove("open"); setTimeout(()=>overlay.remove(), 220); }
    overlay.addEventListener("mousedown", e=>{ if(e.target===overlay) close(); });
    overlay.querySelectorAll(".sheet-option").forEach(b=> b.addEventListener("click", ()=>{ onPick(b.dataset.v); close(); }));
  } else {
    closeCselDropdown();
    const r = anchor.getBoundingClientRect();
    const dd = document.createElement("div");
    dd.className = "csel-dropdown";
    dd.style.visibility = "hidden";
    dd.innerHTML = options.map(o=>`<button class="csel-option ${String(o.value)===String(currentValue)?"active":""}" data-v="${escapeHtml(String(o.value))}">${escapeHtml(o.label)}</button>`).join("");
    document.body.appendChild(dd);
    const ddw = Math.max(r.width, 170);
    dd.style.width = ddw + "px";
    let left = Math.max(8, Math.min(r.left, window.innerWidth - ddw - 8));
    let top = r.bottom + 4;
    if(top + dd.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - dd.offsetHeight - 4);
    dd.style.left = left + "px"; dd.style.top = top + "px"; dd.style.visibility = "visible";
    const outside = e=>{ if(!dd.contains(e.target) && e.target!==anchor && !anchor.contains(e.target)) closeCselDropdown(); };
    setTimeout(()=> document.addEventListener("mousedown", outside, true), 0);
    activeCselDropdown = { el: dd, outside };
    dd.querySelectorAll(".csel-option").forEach(b=> b.addEventListener("click", ()=>{ onPick(b.dataset.v); closeCselDropdown(); }));
  }
}
function initSelect(el, options, value, onChange){
  if(!el) return;
  el.classList.add("csel");
  el.setAttribute("tabindex", "0");
  el.setAttribute("role", "button");
  let current = value!=null ? String(value) : (options[0] ? String(options[0].value) : "");
  let opts = options;
  function labelFor(v){ const o = opts.find(o=>String(o.value)===String(v)); return o ? o.label : ""; }
  function paint(){
    el.innerHTML = `<span class="csel-label">${escapeHtml(labelFor(current))}</span>${icon('<path d="M6 9l6 6 6-6"/>',14)}`;
    el.lastElementChild && el.lastElementChild.classList.add("csel-chevron");
  }
  Object.defineProperty(el, "value", {
    get(){ return current; },
    set(v){ current = v!=null ? String(v) : ""; paint(); },
    configurable: true
  });
  Object.defineProperty(el, "cselOptions", {
    get(){ return opts; },
    set(v){ opts = v; paint(); },
    configurable: true
  });
  paint();
  el.addEventListener("click", ()=>{
    openSelectPicker(el, opts, current, v=>{
      current = v; paint();
      el.dispatchEvent(new Event("change", {bubbles:true}));
      if(onChange) onChange(v);
    });
  });
  el.addEventListener("keydown", e=>{ if(e.key==="Enter" || e.key===" "){ e.preventDefault(); el.click(); } });
}

/* ===================== modal ===================== */
function openModal(title, bodyHtml, onMount){
  closeModal();
  const root = document.createElement("div");
  root.className = "modal-overlay";
  root.id = "genericModalOverlay";
  root.innerHTML = `<div class="modal"><h3>${title}</h3><div class="modal-body">${bodyHtml}</div></div>`;
  document.body.appendChild(root);
  root.addEventListener("mousedown", e=>{ if(e.target===root) closeModal(); });
  const esc = e=>{ if(e.key==="Escape") closeModal(); };
  document.addEventListener("keydown", esc);
  root._esc = esc;
  if(onMount) onMount(root.querySelector(".modal-body"));
}
function closeModal(){
  const root = document.getElementById("genericModalOverlay");
  if(!root) return;
  document.removeEventListener("keydown", root._esc);
  root.remove();
}

/* ===================== quick-add natural-language parsing ===================== */
const QA_DOW_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const QA_WEEKDAYS = [
  {re:/(mon|monday)/i, day:1}, {re:/(tues?|tuesday)/i, day:2}, {re:/(wed(nes)?|wednesday)/i, day:3},
  {re:/(thur?s?|thursday)/i, day:4}, {re:/(fri|friday)/i, day:5}, {re:/(sat|saturday)/i, day:6}, {re:/(sun|sunday)/i, day:0},
];
const QA_MONTHS = {jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11};
const QA_PRIORITY = [
  {re:/(!p1|!high|\basap\b|\burgent\b|(?:^|\s)!!(?=\s|$))/i, level:1, label:"High"},
  {re:/(!p2|!med(ium)?)/i, level:2, label:"Medium"},
  {re:/(!p3|!low)/i, level:3, label:"Low"},
];
const QA_REPEAT_RE = /\b(!daily|every\s*day|everyday|daily)\b/i;
const QA_WORKDAY_RE = /\b(?:every|ev)\s+(work\s*days?|weekdays?)\b/i;
const QA_WEEKLY_LIST_RE = /\b(?:every|ev)\s+((?:mon|tue|wed|thu|fri|sat|sun)[a-z]*(?:\s*(?:,|&|and)?\s*(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*)*)/i;
function qaFindWeeklyRepeat(text){
  const m = text.match(QA_WEEKLY_LIST_RE);
  if(!m) return null;
  const chunk = m[1];
  const days = [];
  for(const w of QA_WEEKDAYS){
    if(new RegExp("\\b"+w.re.source, "i").test(chunk) && !days.includes(w.day)) days.push(w.day);
  }
  if(!days.length) return null;
  days.sort((a,b)=>a-b);
  return { days, match: m[0] };
}
function qaNextWeekday(targetDow){
  const cur = new Date().getDay();
  return addDays(todayISO(), (targetDow - cur + 7) % 7);
}
function qaFindWeekday(text){
  for(const w of QA_WEEKDAYS){
    const m = text.match(new RegExp("\\bnext\\s+"+w.re.source+"[a-z]*\\b", "i"));
    if(m) return { day:w.day, match:m[0], label:QA_DOW_NAMES[w.day], forceNextWeek:true };
  }
  for(const w of QA_WEEKDAYS){
    const m = text.match(new RegExp("\\b"+w.re.source+"\\b", "i"));
    if(m) return { day:w.day, match:m[0], label:QA_DOW_NAMES[w.day], forceNextWeek:false };
  }
  return null;
}
function safeMonthDay(year, monthIndex, day){
  const d = new Date(year, monthIndex, day);
  const normalizedMonth = ((monthIndex % 12) + 12) % 12;
  return d.getMonth()===normalizedMonth ? d : null;
}
function qaFindExplicitDate(text){
  const thisYear = new Date().getFullYear();
  const startOfToday = new Date(todayISO()+"T00:00:00");
  function resolveYear(mon, day){
    let d = safeMonthDay(thisYear, mon, day);
    if(d && d < startOfToday) d = safeMonthDay(thisYear+1, mon, day);
    return d;
  }
  let m = text.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/);
  if(m){
    const day = +m[1], mon = +m[2]-1;
    if(day>=1 && day<=31 && mon>=0 && mon<=11){
      const d = resolveYear(mon, day);
      if(d) return { due: isoDate(d), label: d.toLocaleDateString(undefined,{day:"numeric",month:"short"}), match: m[0] };
    }
  }
  const monthNames = Object.keys(QA_MONTHS).join("|");
  m = text.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(st|nd|rd|th)?\\b`, "i"));
  let day, monName;
  if(m){ monName = m[1].toLowerCase(); day = +m[2]; }
  else{
    m = text.match(new RegExp(`\\b(\\d{1,2})(st|nd|rd|th)?\\s+(${monthNames})\\b`, "i"));
    if(m){ day = +m[1]; monName = m[3].toLowerCase(); }
  }
  if(m && day>=1 && day<=31){
    const mon = QA_MONTHS[monName];
    const d = resolveYear(mon, day);
    if(d) return { due: isoDate(d), label: d.toLocaleDateString(undefined,{day:"numeric",month:"short"}), match: m[0] };
  }
  m = text.match(/\b(\d{1,2})(st|nd|rd|th)\b/i);
  if(m){
    const d2 = +m[1];
    if(d2>=1 && d2<=31){
      const now = new Date();
      let d = safeMonthDay(now.getFullYear(), now.getMonth(), d2);
      if(d && d < startOfToday) d = safeMonthDay(now.getFullYear(), now.getMonth()+1, d2);
      if(d) return { due: isoDate(d), label: d.toLocaleDateString(undefined,{day:"numeric",month:"short"}), match: m[0] };
    }
  }
  return null;
}
function qaEndOfMonth(){
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth()+1, 0);
}
function parseQuickAdd(raw){
  let text = raw, due = null, dueLabel = null, priority = 0, priLabel = null, repeat = null, repeatDays = null;
  const dailyMatch = text.match(QA_REPEAT_RE);
  if(dailyMatch){ repeat = "daily"; text = text.replace(dailyMatch[0], ""); }
  else {
    const workdayMatch = text.match(QA_WORKDAY_RE);
    if(workdayMatch){ repeat = "weekday"; text = text.replace(workdayMatch[0], ""); }
    else {
      const weekly = qaFindWeeklyRepeat(text);
      if(weekly){ repeat = "weekly"; repeatDays = weekly.days; text = text.replace(weekly.match, ""); }
    }
  }
  const todayMatch = text.match(/\b(today|tod|eod|end of day)\b/i);
  const tonightMatch = !todayMatch && text.match(/\btonight\b/i);
  if(todayMatch){ due = todayISO(); dueLabel = "Today"; text = text.replace(todayMatch[0], ""); }
  else if(tonightMatch){ due = todayISO(); dueLabel = "Tonight"; text = text.replace(tonightMatch[0], ""); }
  else if(/\b(tomorrow|tmrw|tmr|tom)\b/i.test(text)){ due = addDays(todayISO(),1); dueLabel = "Tomorrow"; text = text.replace(/\b(tomorrow|tmrw|tmr|tom)\b/i, ""); }
  else if(/\bnext week\b/i.test(text)){ due = addDays(todayISO(),7); dueLabel = "Next week"; text = text.replace(/\bnext week\b/i, ""); }
  else {
    const explicitDate = qaFindExplicitDate(text);
    const eowMatch = text.match(/\b(eow|end of week)\b/i);
    const eomMatch = text.match(/\b(eom|end of month)\b/i);
    const nextWeekendMatch = text.match(/\bnext weekend\b/i);
    const weekendMatch = !nextWeekendMatch && text.match(/\b(this weekend|weekend)\b/i);
    const inWeeks = text.match(/\bin (\d+)\s*w(eeks?)?\b/i);
    const inDays = !inWeeks && text.match(/\bin (\d+)\s*d(ays?)?\b/i);
    if(explicitDate){ due = explicitDate.due; dueLabel = explicitDate.label; text = text.replace(explicitDate.match, ""); }
    else if(eowMatch){ due = qaNextWeekday(5); dueLabel = "Fri"; text = text.replace(eowMatch[0], ""); }
    else if(eomMatch){ const d = qaEndOfMonth(); due = isoDate(d); dueLabel = d.toLocaleDateString(undefined,{day:"numeric",month:"short"}); text = text.replace(eomMatch[0], ""); }
    else if(nextWeekendMatch){ due = addDays(qaNextWeekday(6), 7); dueLabel = "Next Sat"; text = text.replace(nextWeekendMatch[0], ""); }
    else if(weekendMatch){ due = qaNextWeekday(6); dueLabel = "Sat"; text = text.replace(weekendMatch[0], ""); }
    else if(inWeeks){ const n = Number(inWeeks[1]); due = addDays(todayISO(), n*7); dueLabel = `In ${n}w`; text = text.replace(inWeeks[0], ""); }
    else if(inDays){ const n = Number(inDays[1]); due = addDays(todayISO(), n); dueLabel = `In ${n}d`; text = text.replace(inDays[0], ""); }
    else{
      const wd = qaFindWeekday(text);
      if(wd){
        due = wd.forceNextWeek ? addDays(qaNextWeekday(wd.day), 7) : qaNextWeekday(wd.day);
        dueLabel = wd.label;
        text = text.replace(wd.match, "");
      }
    }
  }
  for(const p of QA_PRIORITY){
    const m = text.match(p.re);
    if(m){ priority = p.level; priLabel = p.label; text = text.replace(p.re, ""); break; }
  }
  text = text.replace(/\s{2,}/g, " ").trim();
  return { title: text, due, dueLabel, priority, priLabel, repeat, repeatDays };
}
function qaRepeatLabel(parsed){
  if(parsed.repeat==="daily") return "Daily";
  if(parsed.repeat==="weekday") return "Weekdays";
  if(parsed.repeat==="weekly" && parsed.repeatDays && parsed.repeatDays.length) return parsed.repeatDays.map(d=>QA_DOW_NAMES[d]).join("/");
  return "";
}
function qaHintHtml(parsed){
  if(!parsed.dueLabel && !parsed.priLabel && !parsed.repeat) return "";
  return `${parsed.dueLabel?`<span class="badge badge-accent">${parsed.dueLabel}</span>`:""}${parsed.priLabel?`<span class="badge ${parsed.priority===1?'badge-danger':parsed.priority===2?'badge-warn':'badge-muted'}">${parsed.priLabel}</span>`:""}${parsed.repeat?`<span class="badge badge-muted">${qaRepeatLabel(parsed)}</span>`:""}`;
}
