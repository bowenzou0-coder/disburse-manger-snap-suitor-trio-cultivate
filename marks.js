"use strict";

let marksState = { year: null, mode: "overview", subjectId: null };

function markYear(m){ return (m.date||todayISO()).slice(0,4); }
function availableYears(){
  const years = new Set(state.marks.map(markYear));
  years.add(todayISO().slice(0,4));
  return [...years].sort();
}
function ensureMarkYear(){
  const years = availableYears();
  if(!marksState.year || !years.includes(marksState.year)) marksState.year = years[years.length-1];
  return years;
}
function subjectWeightedAvg(subjectId, year){
  const entries = state.marks.filter(m=>m.subjectId===subjectId && m.score!=null && (!year || markYear(m)===year));
  if(!entries.length) return null;
  const weights = entries.map(e=>e.weight||1);
  const sumW = weights.reduce((a,b)=>a+b,0);
  return entries.reduce((a,e,i)=>a + (e.score/e.outOf*100)*weights[i], 0) / sumW;
}
function stdDev(nums){
  if(nums.length<2) return 0;
  const mean = nums.reduce((a,b)=>a+b,0)/nums.length;
  return Math.sqrt(nums.reduce((a,b)=>a+(b-mean)**2,0)/nums.length);
}
function renderMarks(){
  const years = ensureMarkYear();
  document.getElementById("yearTabs").innerHTML = years.map(y=>
    `<button class="${marksState.year===y?'active':''}" data-year="${y}">${y}</button>`).join("");
  document.getElementById("yearTabs").querySelectorAll("button").forEach(b=>
    b.addEventListener("click", ()=>{ marksState.year=b.dataset.year; renderMarks(); }));
  renderNextAssessCard();
  const subjAvgs = state.subjects.map(s=>({s, avg: subjectWeightedAvg(s.id, marksState.year)})).filter(x=>x.avg!=null);
  const overall = subjAvgs.length ? subjAvgs.reduce((a,x)=>a+x.avg,0)/subjAvgs.length : null;
  const spread = subjAvgs.length ? stdDev(subjAvgs.map(x=>x.avg)) : null;
  const withBenchmark = subjAvgs.filter(x=> state.benchmarks[x.s.id]!=null);
  const avgDelta = withBenchmark.length ? withBenchmark.reduce((a,x)=>a+(x.avg-state.benchmarks[x.s.id]),0)/withBenchmark.length : null;
  document.getElementById("markSummary").innerHTML = `
    <div class="card stat-card"><div class="stat-num" style="font-family:var(--mono);">${overall==null?'—':overall.toFixed(1)+'%'}</div><div class="stat-label">Overall average</div></div>
    <div class="card stat-card"><div class="stat-num" style="font-family:var(--mono);">${spread==null?'—':'±'+spread.toFixed(1)}</div><div class="stat-label">Spread across subjects</div></div>
    <div class="card stat-card"><div class="stat-num" style="font-family:var(--mono); color:${avgDelta==null?'var(--text)':avgDelta>=0?'var(--success)':'var(--danger)'};">${avgDelta==null?'—':(avgDelta>=0?'+':'')+avgDelta.toFixed(1)}</div><div class="stat-label">Avg. vs benchmark</div></div>
    <div class="card stat-card"><div class="stat-num" style="font-family:var(--mono);">${state.marks.filter(m=>markYear(m)===marksState.year).length}</div><div class="stat-label">Marks logged (${marksState.year})</div></div>`;
  const body = document.getElementById("marksBody");
  if(marksState.mode === "subject" && marksState.subjectId) renderSubjectDetail(body);
  else renderMarkBars(body);
}
function renderMarkBars(body){
  body.innerHTML = `<div class="card">${
    state.subjects.map(s=>{
      const avg = subjectWeightedAvg(s.id, marksState.year);
      const bench = state.benchmarks[s.id];
      return `<div class="mark-bar-row" data-subj-bar="${s.id}">
        <div class="mark-bar-name"><span class="dot" style="background:${s.color}"></span>${escapeHtml(s.name)}</div>
        <div class="mark-bar-track">
          <div class="mark-bar-fill" style="width:${avg==null?0:Math.min(100,avg)}%; background:${s.color};"></div>
          ${bench!=null?`<div class="mark-bar-benchmark" style="left:calc(${bench}% - 1px);" title="Benchmark: ${bench}%"></div>`:''}
        </div>
        <div class="mark-bar-val">${avg==null?'—':avg.toFixed(1)+'%'}</div>
        <div class="mark-bar-chevron">${icon('<path d="M9 18l6-6-6-6"/>',15)}</div>
      </div>`;
    }).join("") || `<div class="empty">Add subjects in Settings to start tracking marks.</div>`
  }</div>`;
  body.querySelectorAll("[data-subj-bar]").forEach(el=> el.addEventListener("click", ()=>{
    marksState.mode = "subject"; marksState.subjectId = el.dataset.subjBar; renderMarks();
  }));
}
function renderSubjectDetail(body){
  const subj = subjectById(marksState.subjectId);
  if(!subj){ marksState.mode="overview"; renderMarkBars(body); return; }
  const entries = state.marks.filter(m=>m.subjectId===subj.id && markYear(m)===marksState.year).sort((a,b)=>a.date.localeCompare(b.date));
  const avg = subjectWeightedAvg(subj.id, marksState.year);
  const bench = state.benchmarks[subj.id];
  const delta = (avg!=null && bench!=null) ? avg-bench : null;
  body.innerHTML = `
    <div class="subj-detail-head">
      <div class="subj-back" id="subjBackBtn">${icon('<path d="M15 18l-6-6 6-6"/>',15)} All subjects</div>
    </div>
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
        <span class="dot" style="background:${subj.color}; width:12px; height:12px;"></span>
        <div style="font-size:17px; font-weight:700; color:var(--text);">${escapeHtml(subj.name)}</div>
        <button class="btn btn-sm" id="subjAddMarkBtn" style="margin-left:auto;">+ Add mark</button>
      </div>
      <div class="benchmark-row">
        <div class="benchmark-stat"><div class="v">${avg==null?'—':avg.toFixed(1)+'%'}</div><div class="l">Weighted average</div></div>
        <div class="benchmark-stat"><div class="v" style="color:${delta==null?'var(--text)':delta>=0?'var(--success)':'var(--danger)'};">${delta==null?'—':(delta>=0?'+':'')+delta.toFixed(1)}</div><div class="l">vs benchmark</div></div>
        <div class="benchmark-input-wrap"><label class="field" style="margin-bottom:0;">Benchmark %<input class="input" type="number" min="0" max="100" id="benchInput" value="${bench??''}" placeholder="e.g. 85"></label></div>
      </div>
    </div>
    <div class="card" style="margin-bottom:16px;">
      <div class="section-title">Marks over time</div>
      <div id="markLineChart"></div>
    </div>
    <div class="card"><div id="subjMarksTable"></div></div>`;
  document.getElementById("subjBackBtn").addEventListener("click", ()=>{ marksState.mode="overview"; renderMarks(); });
  document.getElementById("subjAddMarkBtn").addEventListener("click", (e)=> openMarkModal(null, e.currentTarget, subj.id));
  document.getElementById("benchInput").addEventListener("change", e=>{
    const v = e.target.value===""? null : Number(e.target.value);
    if(v==null) delete state.benchmarks[subj.id]; else state.benchmarks[subj.id]=v;
    save(); renderMarks();
  });
  renderMarkLineChart(document.getElementById("markLineChart"), entries, bench, subj.color);
  const table = document.getElementById("subjMarksTable");
  if(!entries.length){ table.innerHTML = `<div class="empty">No marks logged for ${escapeHtml(subj.name)} in ${marksState.year} yet.</div>`; }
  else {
    table.innerHTML = `<table class="marks-table"><thead><tr><th>Assessment</th><th>Date</th><th>Score</th><th>Weight</th><th></th></tr></thead><tbody>
      ${[...entries].reverse().map(m=>{
        const upcoming = m.score==null;
        const pct = !upcoming ? (m.score/m.outOf*100) : null;
        const badgeClass = upcoming ? 'badge-muted' : pct>=85?'badge-success':pct>=70?'badge-warn':'badge-danger';
        return `<tr>
          <td>${escapeHtml(m.name)}</td>
          <td>${m.date}</td>
          <td>${upcoming?`<span class="badge badge-muted">Upcoming</span>`:`<span class="badge ${badgeClass}">${m.score}/${m.outOf} (${pct.toFixed(0)}%)</span>`}</td>
          <td>${m.weight||1}</td>
          <td><button class="iconbtn" data-edit-mark="${m.id}">${icon('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',14)}</button>
              <button class="iconbtn" data-del-mark="${m.id}">${icon('<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',14)}</button></td>
        </tr>`;
      }).join("")}
    </tbody></table>`;
    table.querySelectorAll("[data-edit-mark]").forEach(el=> el.addEventListener("click", ()=> openMarkModal(el.dataset.editMark, el, subj.id)));
    table.querySelectorAll("[data-del-mark]").forEach(el=> el.addEventListener("click", ()=>{
      if(confirm("Delete this entry?")){ state.marks = state.marks.filter(m=>m.id!==el.dataset.delMark); save(); renderMarks(); }
    }));
  }
}
function renderMarkLineChart(el, entries, bench, color){
  const scored = entries.filter(m=>m.score!=null);
  if(scored.length<2){ el.innerHTML = `<div class="empty">Need at least 2 scored assessments to chart a trend.</div>`; return; }
  const w=560,h=200,pad=32;
  const step = (w-pad*2)/(scored.length-1);
  const pts = scored.map((m,i)=>({ x: pad+i*step, y: h-24-((m.score/m.outOf*100)/100)*(h-56) }));
  let running = [];
  const avgPts = scored.map((m,i)=>{
    running.push(m.score/m.outOf*100);
    const a = running.reduce((x,y)=>x+y,0)/running.length;
    return { x: pad+i*step, y: h-24-(a/100)*(h-56) };
  });
  const path = pts.map((p,i)=>(i===0?"M":"L")+p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");
  const avgPath = avgPts.map((p,i)=>(i===0?"M":"L")+p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");
  const benchY = bench!=null ? h-24-(bench/100)*(h-56) : null;
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto;">
    <line x1="${pad}" y1="${h-24}" x2="${w-pad}" y2="${h-24}" stroke="var(--border)"/>
    ${benchY!=null?`<line x1="${pad}" y1="${benchY.toFixed(1)}" x2="${w-pad}" y2="${benchY.toFixed(1)}" stroke="color-mix(in srgb, ${color} 55%, var(--text))"/>`:''}
    <path d="${avgPath}" fill="none" stroke="color-mix(in srgb, ${color} 55%, var(--surface))" stroke-width="1.75"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5"/>
    ${pts.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${color}"/>`).join("")}
  </svg>
  <div class="chart-legend"><span><span class="dot" style="background:${color}"></span>Score</span><span><span class="dot" style="background:color-mix(in srgb, ${color} 55%, var(--surface))"></span>Running average</span>${bench!=null?`<span><span class="dot" style="background:color-mix(in srgb, ${color} 55%, var(--text));"></span>Benchmark</span>`:''}</div>`;
}
function renderNextAssessCard(){
  const upcoming = state.marks.filter(m=>m.score==null && m.date>=todayISO()).sort((a,b)=>a.date.localeCompare(b.date));
  const card = document.getElementById("nextAssessCard");
  if(!upcoming.length){ card.innerHTML = ""; return; }
  const next = upcoming[0];
  const subj = subjectById(next.subjectId);
  const days = daysBetween(todayISO(), next.date);
  card.innerHTML = `<div class="card next-assess-card">
    <div><div class="next-assess-num">${days}</div><div class="next-assess-unit">day${days===1?'':'s'}</div></div>
    <div style="flex:1;">
      <div style="font-size:15px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:8px;"><span class="dot" style="background:${subj?subj.color:'#aaa'}"></span>${escapeHtml(next.name)}</div>
      <div style="font-size:12.5px; color:var(--text-dim); margin-top:2px;">${escapeHtml(subj?subj.name:'')} · ${days===0?'Today':days===1?'Tomorrow':next.date}</div>
    </div>
    ${upcoming.length>1?`<div class="badge badge-muted">+${upcoming.length-1} more upcoming</div>`:''}
  </div>`;
}
document.getElementById("markAddBtn").addEventListener("click", (e)=> openMarkModal(null, e.currentTarget, marksState.mode==="subject"?marksState.subjectId:null));
function openMarkModal(markId, anchor, presetSubjectId){
  const editing = markId ? state.marks.find(m=>m.id===markId) : null;
  const body = `
    <label class="field">Subject
      <div class="input" id="mfSubject"></div>
    </label>
    <label class="field">Assessment name<input class="input" id="mfName" value="${editing?escapeHtml(editing.name):''}" placeholder="e.g. Topic 3 test"></label>
    <div class="row">
      <label class="field">Date<input class="input" type="date" id="mfDate" value="${editing?editing.date:todayISO()}"></label>
      <label class="field">Weight<input class="input" type="number" step="0.1" min="0" id="mfWeight" value="${editing?(editing.weight||1):1}"></label>
    </div>
    <div class="row">
      <label class="field">Score <span style="font-weight:400;">(leave blank if upcoming)</span><input class="input" type="number" step="0.1" id="mfScore" value="${editing&&editing.score!=null?editing.score:''}"></label>
      <label class="field">Out of<input class="input" type="number" step="0.1" min="1" id="mfOutOf" value="${editing?editing.outOf:100}"></label>
    </div>
    <div class="modal-actions">
      ${editing?'<button class="btn btn-danger" id="mfDelete">Delete</button>':''}
      <button class="btn" id="mfCancel">Cancel</button><button class="btn btn-primary" id="mfSave">Save</button>
    </div>`;
  openPopover(anchor, editing?"Edit mark":"Add mark", body, root=>{
    initSelect(root.querySelector("#mfSubject"), state.subjects.map(s=>({value:s.id,label:s.name})), editing?editing.subjectId:presetSubjectId);
    root.querySelector("#mfCancel").addEventListener("click", closePopover);
    if(editing) root.querySelector("#mfDelete").addEventListener("click", ()=>{
      state.marks = state.marks.filter(m=>m.id!==editing.id); save(); closePopover(); renderMarks();
    });
    root.querySelector("#mfSave").addEventListener("click", ()=>{
      const name = root.querySelector("#mfName").value.trim();
      if(!name){ toast("Give the assessment a name"); return; }
      if(!state.subjects.length){ toast("Add a subject first (Settings → Subjects)"); return; }
      const scoreRaw = root.querySelector("#mfScore").value;
      const rec = {
        id: editing?editing.id:uid(),
        subjectId: root.querySelector("#mfSubject").value,
        name, date: root.querySelector("#mfDate").value || todayISO(),
        weight: Number(root.querySelector("#mfWeight").value)||1,
        outOf: Number(root.querySelector("#mfOutOf").value)||100,
        score: scoreRaw===""? null : Number(scoreRaw)
      };
      if(editing){ Object.assign(editing, rec); } else { state.marks.push(rec); }
      save(); closePopover(); renderMarks(); renderOverview();
    });
  });
}
