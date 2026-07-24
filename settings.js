"use strict";

function renderSettings(){
  renderSyncPanel();
  renderTodoistPanel();
  document.getElementById("subjList").innerHTML = state.subjects.map(s=>`
    <div class="subj-row">
      <input type="color" class="color-input" value="${s.color}" data-subj-color="${s.id}">
      <input class="input" value="${escapeHtml(s.name)}" data-subj-name="${s.id}">
      <button class="iconbtn" data-subj-del="${s.id}">${icon('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>')}</button>
    </div>`).join("");
  document.getElementById("subjList").querySelectorAll("[data-subj-color]").forEach(el=> el.addEventListener("change", e=>{
    const subj = subjectById(el.dataset.subjColor); if(!subj) return;
    subj.color = e.target.value; save(); renderTimetable(); renderSettings();
  }));
  document.getElementById("subjList").querySelectorAll("[data-subj-name]").forEach(el=> el.addEventListener("change", e=>{
    const subj = subjectById(el.dataset.subjName); if(!subj) return;
    subj.name = e.target.value.trim() || "Untitled"; save();
  }));
  document.getElementById("subjList").querySelectorAll("[data-subj-del]").forEach(el=> el.addEventListener("click", ()=>{
    const id = el.dataset.subjDel; const subj = subjectById(id);
    if(!subj) return;
    const uses = state.timetable.filter(p=>p.subjectId===id).length + state.marks.filter(m=>m.subjectId===id).length + state.sessions.filter(s=>s.subjectId===id).length;
    if(confirm(`Delete "${subj.name}"?${uses?` It's referenced in ${uses} record(s), which will show as "Unknown subject".`:''}`)){
      state.subjects = state.subjects.filter(s=>s.id!==id); delete state.goals[id]; save(); renderSettings();
    }
  }));
  wireInlineAddSubject();
  document.getElementById("goalList").innerHTML = state.subjects.map(s=>`
    <div class="goal-row"><span class="dot" style="background:${s.color}"></span><span style="flex:1; font-size:13px;">${escapeHtml(s.name)}</span>
      <input class="input" type="number" min="0" step="0.5" value="${state.goals[s.id]||''}" placeholder="0" data-goal="${s.id}"> h/wk</div>`).join("");
  document.getElementById("goalList").querySelectorAll("[data-goal]").forEach(el=> el.addEventListener("change", e=>{
    state.goals[el.dataset.goal] = Number(e.target.value)||0; save();
  }));
  document.getElementById("setWork").value = state.settings.pomodoroWork;
  document.getElementById("setShort").value = state.settings.pomodoroShort;
  document.getElementById("setLong").value = state.settings.pomodoroLong;
  document.getElementById("setInterval").value = state.settings.longBreakInterval;
}
function wireInlineAddSubject(){
  const list = document.getElementById("subjList");
  let slot = document.getElementById("subjAddSlot");
  if(!slot){ slot = document.createElement("div"); slot.id = "subjAddSlot"; list.after(slot); }
  slot.innerHTML = `<div class="inline-add-trigger" id="subjAddTrigger">+ Add subject</div>`;
  slot.querySelector("#subjAddTrigger").addEventListener("click", function(){
    const color = nextPaletteColor();
    slot.innerHTML = `<div class="inline-add-row"><span class="dot" style="background:${color}"></span>
      <input placeholder="Subject name…" id="subjAddInput">
      <button class="btn btn-sm" id="subjAddSave">Add</button></div>`;
    const input = slot.querySelector("#subjAddInput");
    input.focus();
    const submit = ()=>{
      const name = input.value.trim();
      if(!name) return;
      state.subjects.push({id:uid(), name, color}); save(); renderSettings();
    };
    input.addEventListener("keydown", e=>{
      if(e.key==="Enter") submit();
      if(e.key==="Escape") renderSettings();
    });
    slot.querySelector("#subjAddSave").addEventListener("click", submit);
  });
}
["setWork","setShort","setLong","setInterval"].forEach(id=>{
  document.getElementById(id).addEventListener("change", e=>{
    const v = Math.max(1, Number(e.target.value)||1);
    if(id==="setWork") state.settings.pomodoroWork=v;
    if(id==="setShort") state.settings.pomodoroShort=v;
    if(id==="setLong") state.settings.pomodoroLong=v;
    if(id==="setInterval") state.settings.longBreakInterval=v;
    save();
  });
});
document.getElementById("exportBtn").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `study-dashboard-backup-${todayISO()}.json`;
  a.click(); URL.revokeObjectURL(a.href);
});
document.getElementById("importBtn").addEventListener("click", ()=> document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change", e=>{
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(reader.result);
      if(!parsed.subjects || !parsed.tasks) throw new Error("bad shape");
      if(confirm("This will replace all current data with the backup. Continue?")){
        state = Object.assign(defaultState(), parsed, {settings: Object.assign({}, defaultState().settings, parsed.settings||{})});
        state.tasks = normalizeTasksSlice(state.tasks);
        save(); location.reload();
      }
    }catch(err){ toast("Couldn't read that file — is it a valid backup?"); }
  };
  reader.readAsText(file);
  e.target.value = "";
});
document.getElementById("resetBtn").addEventListener("click", ()=>{
  if(confirm("This will permanently delete all local data. Are you sure?") && confirm("Really sure? This cannot be undone.")){
    localStorage.removeItem(KEY); location.reload();
  }
});
