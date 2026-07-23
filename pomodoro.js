"use strict";

let timer = { timerType:"pomodoro", mode:"work", running:false, intervalId:null, cycles:0, segStart:null, accumSec:0, loggedSec:0 };
let pomoSubjectId = "";

function phaseSeconds(mode){
  if(mode==="work") return state.settings.pomodoroWork*60;
  if(mode==="short") return state.settings.pomodoroShort*60;
  return state.settings.pomodoroLong*60;
}
function elapsedSec(){
  return timer.accumSec + (timer.running ? Math.floor((Date.now()-timer.segStart)/1000) : 0);
}
function renderPomodoro(){
  document.getElementById("timerModeTabs").innerHTML = ["pomodoro","stopwatch"].map(m=>
    `<button class="${timer.timerType===m?'active':''}" data-timer-mode="${m}">${m==="pomodoro"?"Pomodoro":"Stopwatch"}</button>`).join("");
  document.getElementById("timerModeTabs").querySelectorAll("button").forEach(b=>
    b.addEventListener("click", ()=> switchTimerType(b.dataset.timerMode)));
  const sel = document.getElementById("pomoSubject");
  const subjOpts = [{value:"",label:"General / no subject"}].concat(state.subjects.map(s=>({value:s.id,label:s.name})));
  if(pomoSubjectId && !state.subjects.find(s=>s.id===pomoSubjectId)) pomoSubjectId = "";
  if(!sel.dataset.wired){
    initSelect(sel, subjOpts, pomoSubjectId, v=>{ pomoSubjectId = v; });
    sel.dataset.wired = "1";
  } else {
    sel.cselOptions = subjOpts;
    sel.value = pomoSubjectId;
  }
  const isPomo = timer.timerType==="pomodoro";
  document.getElementById("durRow").style.display = isPomo ? "flex" : "none";
  document.getElementById("swHint").style.display = isPomo ? "none" : "block";
  document.getElementById("durWork").value = state.settings.pomodoroWork;
  document.getElementById("durShort").value = state.settings.pomodoroShort;
  document.getElementById("durLong").value = state.settings.pomodoroLong;
  renderTimerControls();
  updateTimerDisplay();
  renderPomoSessions();
}
function switchTimerType(type){
  if(type===timer.timerType) return;
  clearInterval(timer.intervalId); timer.intervalId=null;
  timer.timerType = type; timer.mode = "work"; timer.running = false; timer.accumSec = 0; timer.segStart = null; timer.loggedSec = 0;
  renderPomodoro();
}
function renderTimerControls(){
  const wrap = document.getElementById("pomoControls");
  const logBtn = document.getElementById("pomoLogNow");
  if(timer.timerType==="stopwatch"){
    wrap.innerHTML = `<button class="btn btn-primary" id="pomoStart">${timer.running?"Pause":"Start"}</button>
      <button class="btn" id="pomoStopLog">Stop &amp; log</button>`;
    wrap.querySelector("#pomoStopLog").addEventListener("click", onStopLog);
    logBtn.style.display = "none";
  } else {
    wrap.innerHTML = `<button class="btn btn-primary" id="pomoStart">${timer.running?"Pause":"Start"}</button>
      <button class="btn" id="pomoReset">Reset</button>
      <button class="btn" id="pomoSkip">Skip</button>`;
    wrap.querySelector("#pomoReset").addEventListener("click", onReset);
    wrap.querySelector("#pomoSkip").addEventListener("click", onSkip);
    logBtn.style.display = (timer.mode==="work" && elapsedSec()-timer.loggedSec>=30) ? "inline-flex" : "none";
    logBtn.onclick = onLogNow;
  }
  wrap.querySelector("#pomoStart").addEventListener("click", onStartPause);
}
function updateTimerDisplay(){
  let secondsShown, modeLabel, frac;
  if(timer.timerType==="stopwatch"){
    secondsShown = elapsedSec();
    modeLabel = "Stopwatch";
    frac = timer.running ? 1 : 0;
  } else {
    const total = phaseSeconds(timer.mode);
    secondsShown = Math.max(0, total - elapsedSec());
    modeLabel = timer.mode==="work"?"Focus":timer.mode==="short"?"Short break":"Long break";
    frac = total>0 ? secondsShown/total : 0;
  }
  const h = Math.floor(secondsShown/3600), m = Math.floor((secondsShown%3600)/60), s = secondsShown%60;
  document.getElementById("pomoTime").textContent = h>0
    ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
    : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  document.getElementById("pomoMode").textContent = modeLabel;
  const circumference = 2*Math.PI*100;
  document.getElementById("pomoProgress").setAttribute("stroke-dasharray", circumference.toFixed(1));
  document.getElementById("pomoProgress").setAttribute("stroke-dashoffset", (circumference*(1-frac)).toFixed(1));
  const startBtn = document.getElementById("pomoStart");
  if(startBtn) startBtn.textContent = timer.running ? "Pause" : "Start";
}
function beep(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 660; g.gain.value = 0.08;
    o.start(); setTimeout(()=>{ o.stop(); ctx.close(); }, 220);
  }catch(e){}
}
function tick(){
  if(timer.timerType==="pomodoro"){
    const secondsLeft = phaseSeconds(timer.mode) - elapsedSec();
    if(secondsLeft<=0){
      timer.accumSec = elapsedSec();
      clearInterval(timer.intervalId); timer.running=false; timer.intervalId=null;
      completePhase();
      return;
    }
  }
  updateTimerDisplay();
  renderPomoSessions();
  const logBtn = document.getElementById("pomoLogNow");
  if(logBtn) logBtn.style.display = (timer.timerType==="pomodoro" && timer.mode==="work" && elapsedSec()-timer.loggedSec>=30) ? "inline-flex" : "none";
}
function bankElapsed(kind, allowSmall){
  const total = elapsedSec();
  const newSec = total - timer.loggedSec;
  if(newSec < (allowSmall ? 1 : 30)) return 0;
  const minutes = Math.max(1, Math.round(newSec/60));
  state.sessions.push({ id:uid(), subjectId: pomoSubjectId||null, date:todayISO(), minutes, at: Date.now(), kind });
  timer.loggedSec = total;
  save();
  return minutes;
}
function completePhase(){
  beep();
  if(timer.mode==="work"){
    const minutes = bankElapsed("pomodoro", true);
    timer.cycles++;
    toast(minutes>0 ? "Focus session complete — nice work!" : "Focus session complete!");
    timer.mode = (timer.cycles % state.settings.longBreakInterval === 0) ? "long" : "short";
  } else {
    toast("Break's over — ready to focus?");
    timer.mode = "work";
  }
  timer.accumSec = 0; timer.segStart = null; timer.loggedSec = 0;
  renderPomoSessions(); renderOverview(); renderTimerControls();
  updateTimerDisplay();
}
function onStartPause(){
  if(timer.running){
    timer.accumSec = elapsedSec(); timer.running=false; clearInterval(timer.intervalId); timer.intervalId=null;
  } else {
    timer.segStart = Date.now(); timer.running = true;
    timer.intervalId = setInterval(tick, 1000);
  }
  renderTimerControls(); updateTimerDisplay(); renderPomoSessions();
}
function onReset(){
  clearInterval(timer.intervalId); timer.intervalId=null; timer.running=false;
  timer.accumSec = 0; timer.segStart = null; timer.loggedSec = 0;
  renderTimerControls(); updateTimerDisplay(); renderPomoSessions();
}
function onSkip(){
  if(timer.running) timer.accumSec = elapsedSec();
  clearInterval(timer.intervalId); timer.intervalId=null; timer.running=false;
  completePhase();
}
function onLogNow(){
  const minutes = bankElapsed("pomodoro", true);
  if(minutes>0) toast(`Logged ${minutes} min so far — keep going!`);
  renderPomoSessions(); renderOverview(); renderTimerControls();
}
function onStopLog(){
  if(timer.running) timer.accumSec = elapsedSec();
  clearInterval(timer.intervalId); timer.intervalId=null; timer.running=false;
  const minutes = bankElapsed("stopwatch", false);
  if(minutes>0) toast(`Logged ${minutes} min — nice work!`);
  timer.accumSec = 0; timer.segStart = null; timer.loggedSec = 0;
  renderPomoSessions(); renderOverview();
  renderTimerControls(); updateTimerDisplay();
}
["pagehide","beforeunload"].forEach(evt=> window.addEventListener(evt, ()=>{
  if(timer.running) bankElapsed(timer.timerType==="stopwatch" ? "stopwatch" : "pomodoro", true);
}));
["durWork","durShort","durLong"].forEach(id=>{
  document.getElementById(id).addEventListener("change", e=>{
    const v = Math.max(1, Number(e.target.value)||1);
    if(id==="durWork") state.settings.pomodoroWork=v;
    if(id==="durShort") state.settings.pomodoroShort=v;
    if(id==="durLong") state.settings.pomodoroLong=v;
    save();
    if(!timer.running){ timer.accumSec = 0; timer.loggedSec = 0; updateTimerDisplay(); }
  });
});
function renderPomoSessions(){
  const todays = state.sessions.filter(s=>s.date===todayISO()).sort((a,b)=>b.at-a.at);
  const loggedTotal = todays.reduce((a,s)=>a+s.minutes,0);
  const liveSec = timer.running ? Math.max(0, elapsedSec()-timer.loggedSec) : 0;
  const liveMin = Math.floor(liveSec/60);
  document.getElementById("pomoTodayTotal").textContent = fmtHM(loggedTotal + liveMin);
  const list = document.getElementById("pomoSessions");
  const liveSubj = subjectById(pomoSubjectId);
  const liveRow = (timer.running && liveSec>=60) ? `<div class="session-item live"><span class="dot" style="background:${liveSubj?liveSubj.color:'var(--accent)'}"></span>
      <span style="flex:1; font-style:italic; color:var(--text-dim);">${liveSubj?escapeHtml(liveSubj.name):"General"} · in progress</span>
      <span style="color:var(--accent); font-family:var(--mono); font-weight:600;">${liveMin}m</span></div>` : "";
  list.innerHTML = liveRow + (todays.length ? todays.map(s=>{
    const subj = subjectById(s.subjectId);
    return `<div class="session-item"><span class="dot" style="background:${subj?subj.color:'#94a3b8'}"></span>
      <span style="flex:1;">${subj?escapeHtml(subj.name):"General"}</span>
      <span style="color:var(--text-dim);">${s.minutes}m</span></div>`;
  }).join("") : (liveRow ? "" : `<div class="empty">No sessions logged yet today.</div>`));
}
