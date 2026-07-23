"use strict";

let trendSubjectId = null;

function renderAnalytics(){
  renderWeekChart();
  renderGoalProgress();
  renderTrendChart();
  renderTaskDonut();
  renderHeatmap();
}
function renderWeekChart(){
  const days = [];
  for(let i=6;i>=0;i--) days.push(addDays(todayISO(), -i));
  const w=440,h=180,pad=26, barW = (w-pad*2)/7*0.6, gap=(w-pad*2)/7;
  const maxMin = Math.max(60, ...days.map(d=>minutesOnDate(d)));
  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">`;
  days.forEach((d,i)=>{
    const bySubj = {};
    state.sessions.filter(s=>s.date===d).forEach(s=>{ bySubj[s.subjectId||"none"] = (bySubj[s.subjectId||"none"]||0)+s.minutes; });
    const total = Object.values(bySubj).reduce((a,b)=>a+b,0);
    let yCursor = h-30;
    const x = pad + i*gap + (gap-barW)/2;
    Object.entries(bySubj).forEach(([sid,min])=>{
      const subj = subjectById(sid);
      const barH = (min/maxMin)*(h-60);
      yCursor -= barH;
      svg += `<rect x="${x.toFixed(1)}" y="${yCursor.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${subj?subj.color:'#94a3b8'}" rx="2"/>`;
    });
    svg += `<text x="${(x+barW/2).toFixed(1)}" y="${h-12}" font-size="10" text-anchor="middle" fill="var(--text-faint)">${new Date(d+"T00:00:00").toLocaleDateString(undefined,{weekday:'short'})}</text>`;
    if(total>0) svg += `<text x="${(x+barW/2).toFixed(1)}" y="${(yCursor-5).toFixed(1)}" font-size="9" text-anchor="middle" fill="var(--text-dim)">${total}m</text>`;
  });
  svg += `</svg>`;
  document.getElementById("chartWeek").innerHTML = svg;
  document.getElementById("chartWeekLegend").innerHTML = state.subjects.map(s=>`<span><span class="dot" style="background:${s.color}"></span>${escapeHtml(s.name)}</span>`).join("");
}
function renderGoalProgress(){
  const weekStart = addDays(todayISO(), -6);
  const el = document.getElementById("goalProgress");
  const withGoals = state.subjects.filter(s=> state.goals[s.id] && Number(state.goals[s.id])>0);
  if(!withGoals.length){ el.innerHTML = `<div class="empty">Set weekly goals in Settings to see progress here.</div>`; return; }
  el.innerHTML = withGoals.map(s=>{
    const minutes = state.sessions.filter(sess=>sess.subjectId===s.id && sess.date>=weekStart).reduce((a,x)=>a+x.minutes,0);
    const goalMin = Number(state.goals[s.id])*60;
    const pct = Math.min(100, Math.round(minutes/goalMin*100));
    return `<div style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:4px;">
        <span><span class="dot" style="background:${s.color}"></span> ${escapeHtml(s.name)}</span>
        <span style="color:var(--text-dim);">${fmtHM(minutes)} / ${state.goals[s.id]}h</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%; background:${s.color};"></div></div>
    </div>`;
  }).join("");
}
function renderTrendChart(){
  const sel = document.getElementById("trendSubject");
  const subjOpts = state.subjects.map(s=>({value:s.id, label:s.name}));
  if(!trendSubjectId || !state.subjects.find(s=>s.id===trendSubjectId)) trendSubjectId = subjOpts.length ? subjOpts[0].value : "";
  if(!sel.dataset.wired){
    initSelect(sel, subjOpts, trendSubjectId, v=>{ trendSubjectId = v; renderTrendChart(); });
    sel.dataset.wired = "1";
  } else {
    sel.cselOptions = subjOpts;
    sel.value = trendSubjectId;
  }
  const subjId = trendSubjectId;
  const entries = state.marks.filter(m=>m.subjectId===subjId && m.score!=null).sort((a,b)=>a.date.localeCompare(b.date));
  const box = document.getElementById("chartTrend");
  if(entries.length<2){ box.innerHTML = `<div class="empty">Need at least 2 scored assessments for this subject.</div>`; return; }
  const w=440,h=180,pad=30;
  const pts = entries.map((e,i)=> ({ x: pad + i*((w-pad*2)/(entries.length-1)), y: h-20-((e.score/e.outOf*100)/100)*(h-50), pct: e.score/e.outOf*100 }));
  const path = pts.map((p,i)=> (i===0?"M":"L")+p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");
  const subj = subjectById(subjId);
  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">
    <line x1="${pad}" y1="${h-20}" x2="${w-pad}" y2="${h-20}" stroke="var(--border)"/>
    <path d="${path}" fill="none" stroke="${subj?subj.color:'#6366f1'}" stroke-width="2.5"/>
    ${pts.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${subj?subj.color:'#6366f1'}"/>`).join("")}
  </svg>`;
  box.innerHTML = svg;
}
function renderTaskDonut(){
  const all = allTasks().filter(t=> taskRelevantToday(t));
  const done = all.filter(t=>taskDoneToday(t)).length, total = all.length;
  const pct = total? Math.round(done/total*100):0;
  const r=42, c=2*Math.PI*r;
  const svg = `<svg width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="12"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c*(1-pct/100)).toFixed(1)}" transform="rotate(-90 50 50)"/>
    <text x="50" y="55" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text)">${pct}%</text>
  </svg>`;
  document.getElementById("taskDonut").innerHTML = `${svg}<div><div class="stat-num" style="font-size:20px;">${done}/${total}</div><div class="stat-label">Tasks completed</div></div>`;
}
function renderHeatmap(){
  const days = [];
  for(let i=90;i>=0;i--) days.push(addDays(todayISO(), -i));
  const maxMin = Math.max(1, ...days.map(minutesOnDate));
  document.getElementById("heatGrid").innerHTML = days.map(d=>{
    const min = minutesOnDate(d);
    const alpha = min===0? 0 : 0.25 + 0.75*Math.min(1,min/maxMin);
    const bg = min===0 ? "var(--surface-2)" : `color-mix(in srgb, var(--accent) ${Math.round(alpha*100)}%, var(--surface-2))`;
    return `<div class="heat-cell" title="${d}: ${min}m" style="background:${bg}"></div>`;
  }).join("");
}
