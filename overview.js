"use strict";

function renderUpNext(){
  const card = document.getElementById("upNextCard");
  const now = new Date();
  const dayIdx = mondayIndex(now);
  if(dayIdx>4){ card.style.display="none"; return; }
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
  const subj = subjectById(period.subjectId);
  const color = subj?subj.color:"var(--accent)";
  document.getElementById("upNextLabel").textContent = label;
  document.getElementById("upNextTimer").textContent = (current?"Ends in ":"Starts in ")+timeStr;
  document.getElementById("upNextTimer").style.color = color;
  document.getElementById("upNextName").textContent = blockName(period);
  document.getElementById("upNextName").style.color = color;
  document.getElementById("upNextMeta").textContent = period.description ? escapeHtml(period.description.slice(0,60)) : "\u00a0";
  document.getElementById("upNextFill").style.width = fill.toFixed(1)+"%";
  document.getElementById("upNextFill").style.background = color;
}
function renderOverview(){
  const now = new Date();
  document.getElementById("ovDate").textContent = now.toLocaleDateString(undefined,{weekday:"long", month:"long", day:"numeric"});
  const hr = now.getHours();
  document.getElementById("ovGreeting").textContent = hr<12?"Good morning":hr<17?"Good afternoon":"Good evening";
  document.getElementById("statStreak").textContent = computeStreak();
  document.getElementById("statMinutesToday").textContent = minutesOnDate(todayISO());
  document.getElementById("statPomosToday").textContent = state.sessions.filter(s=>s.date===todayISO()).length;
  renderUpNext();
  renderHeroHeatmap();
  renderSubjectBalance();
  const doneToday = allTasks().filter(t=>taskCompletedOnDate(t, todayISO())).length;
  document.getElementById("statTasksToday").textContent = doneToday;
  renderStreakChip();
  const dayIdx = mondayIndex(now);
  const nowMin = now.getHours()*60+now.getMinutes();
  const todays = state.timetable.filter(p=>p.day===dayIdx).sort((a,b)=>timeToMin(a.start)-timeToMin(b.start));
  const ovToday = document.getElementById("ovToday");
  if(dayIdx>4){ ovToday.innerHTML = `<div class="empty">No classes — it's the weekend.</div>`; }
  else if(!todays.length){ ovToday.innerHTML = `<div class="empty">No periods added for today yet.</div>`; }
  else{
    ovToday.innerHTML = todays.map(p=>{
      const subj = subjectById(p.subjectId);
      const color = subj?subj.color:"#a1a1aa";
      const name = escapeHtml(blockName(p));
      const active = nowMin>=timeToMin(p.start) && nowMin<timeToMin(p.end);
      return `<div class="period-row">
        <div class="period-time">${minToTimeLabel(timeToMin(p.start))}</div>
        <div class="period-bar" style="background:${color}"></div>
        <div><div class="period-name">${name}</div><div class="period-meta">${p.description?escapeHtml(p.description.slice(0,40)):''}</div></div>
        ${active?'<span class="now-tag">NOW</span>':''}
      </div>`;
    }).join("");
  }
  const due = allTasks().filter(t=> !taskDoneToday(t) && t.due).map(t=>({...t, delta: daysBetween(todayISO(), t.due)}))
    .filter(t=> t.delta<=2).sort((a,b)=>a.delta-b.delta).slice(0,6);
  const ovDue = document.getElementById("ovDue");
  ovDue.innerHTML = due.length? due.map(t=>{
    const overdue = t.delta<0;
    const label = overdue? `${Math.abs(t.delta)}d overdue` : t.delta===0? "Today" : t.delta===1? "Tomorrow" : `In ${t.delta}d`;
    return `<div class="due-row"><div class="due-check" data-toggle-task="${t.id}" data-cat="${t.catId}" data-group="${t.groupId||''}"></div>
      <div style="flex:1; font-size:13px;">${escapeHtml(t.title)}</div>
      <span class="badge ${overdue?'badge-danger':'badge-warn'}">${label}</span></div>`;
  }).join("") : `<div class="empty">Nothing due in the next couple of days.</div>`;
  ovDue.querySelectorAll("[data-toggle-task]").forEach(el=> el.addEventListener("click", ()=>{
    toggleTask(el.dataset.cat, el.dataset.group||null, el.dataset.toggleTask); renderOverview();
  }));
  const upcoming = state.marks.filter(m=> m.score==null && m.date>=todayISO()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6);
  const ovAssess = document.getElementById("ovAssess");
  ovAssess.innerHTML = upcoming.length? upcoming.map(m=>{
    const subj = subjectById(m.subjectId);
    const d = daysBetween(todayISO(), m.date);
    return `<div class="due-row"><span class="dot" style="background:${subj?subj.color:'#aaa'}"></span>
      <div style="flex:1; font-size:13px;"><b>${escapeHtml(m.name)}</b> — ${escapeHtml(subj?subj.name:'')}</div>
      <span class="badge badge-muted">${d===0?'Today':d+'d'}</span></div>`;
  }).join("") : `<div class="empty">No upcoming assessments logged.</div>`;
  const notesEl = document.getElementById("ovNotes");
  if(document.activeElement !== notesEl) notesEl.value = state.notes;
}
document.getElementById("ovNotes").addEventListener("input", e=>{ state.notes = e.target.value; save(); });

function renderHeroHeatmap(){
  document.getElementById("heroStreakNum").textContent = computeStreak();
  const year = new Date().getFullYear();
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const cells = [];
  for(let i=0, pad=mondayIndex(jan1); i<pad; i++) cells.push(null);
  for(let d=new Date(jan1); d<=dec31; d.setDate(d.getDate()+1)) cells.push(isoDate(d));
  const today = todayISO();
  const activeSet = getActiveDatesSet();
  const maxMin = Math.max(1, ...cells.filter(Boolean).map(minutesOnDate));
  document.getElementById("heroHeatGrid").innerHTML = cells.map(d=>{
    if(!d) return `<div class="heat-cell" style="visibility:hidden;"></div>`;
    const min = minutesOnDate(d);
    const tasksDone = tasksCompletedCountOnDate(d);
    let alpha = 0;
    if(min>0) alpha = 0.25 + 0.75*Math.min(1,min/maxMin);
    else if(activeSet.has(d)) alpha = 0.35;
    const bg = alpha===0 ? "var(--surface)" : `color-mix(in srgb, var(--accent) ${Math.round(alpha*100)}%, var(--surface))`;
    const isToday = d===today;
    const parts = [];
    if(min>0) parts.push(`${min}m`);
    if(tasksDone>0) parts.push(`${tasksDone} task${tasksDone===1?'':'s'}`);
    const summary = parts.length ? parts.join(", ") : "no activity";
    return `<div class="heat-cell${isToday?' heat-today':''}" title="${d}: ${summary}${isToday?' · today':''}" style="background:${bg}"></div>`;
  }).join("");
}
function renderSubjectBalance(){
  const el = document.getElementById("ovSubjectBalance");
  const totals = state.subjects.map(s=>({
    s, minutes: state.sessions.filter(x=>x.subjectId===s.id).reduce((a,x)=>a+x.minutes,0)
  })).filter(x=>x.minutes>0).sort((a,b)=>b.minutes-a.minutes).slice(0,5);
  if(!totals.length){ el.innerHTML = `<div class="empty">No study sessions logged yet.</div>`; return; }
  const max = totals[0].minutes;
  el.innerHTML = totals.map(t=>`
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
      <div style="width:82px; flex-shrink:0; font-size:12px; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(t.s.name)}</div>
      <div style="flex:1; height:8px; background:var(--surface-2); border-radius:4px; overflow:hidden;">
        <div style="height:100%; width:${(t.minutes/max*100).toFixed(1)}%; background:${t.s.color}; border-radius:4px;"></div>
      </div>
    </div>`).join("");
}

function allTasks(){
  const out = [];
  state.tasks.forEach(cat=>{
    cat.tasks.forEach(t=> out.push({...t, catId:cat.id, groupId:null}));
    cat.groups.forEach(g=> g.tasks.forEach(t=> out.push({...t, catId:cat.id, groupId:g.id})));
  });
  return out;
}
function toggleTask(catId, groupId, taskId){
  const cat = state.tasks.find(c=>c.id===catId); if(!cat) return;
  const arr = groupId ? (cat.groups.find(g=>g.id===groupId)||{}).tasks : cat.tasks;
  if(!arr) return;
  const t = arr.find(x=>x.id===taskId); if(!t) return;
  const wasDone = taskDoneToday(t);
  setTaskDoneToday(t, !wasDone);
  if(!wasDone && t.timetableBlockId){
    const block = state.timetable.find(b=>b.id===t.timetableBlockId);
    if(block && !block.recurring) state.timetable = state.timetable.filter(b=>b.id!==block.id);
  }
  save();
  renderStreakChip();
}
