"use strict";

const SNAP_MIN = 15;
const TIME_LABEL_WIDTH = 52;
const PX_PER_MIN = 0.85;

function snapToGrid(minutes) {
  return Math.round(minutes / SNAP_MIN) * SNAP_MIN;
}

function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function dayFromX(x, wrapRect) {
  const availableWidth = wrapRect.width - TIME_LABEL_WIDTH;
  const colWidth = availableWidth / 7;
  const day = Math.floor((x - wrapRect.left - TIME_LABEL_WIDTH) / colWidth);
  return Math.max(0, Math.min(6, day));
}

function minFromY(y, wrapRect) {
  const pxPerMin = 0.85;
  const rawMin = Math.round((y - wrapRect.top) / pxPerMin);
  return Math.max(0, Math.min(24 * 60 - 1, rawMin));
}

function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

let dragState = null;
let previewEl = null;

function createPreviewBlock(day, startMin, endMin, color) {
  if (previewEl) previewEl.remove();

  const wrap = document.querySelector(".tt-wrap");
  if (!wrap) return;
  const wrapRect = wrap.getBoundingClientRect();
  const scrollTop = wrap.scrollTop;

  const availableWidth = wrapRect.width - TIME_LABEL_WIDTH;
  const colWidth = availableWidth / 7;
  const pxPerMin = 0.85;

  const left = wrapRect.left + TIME_LABEL_WIDTH + day * colWidth + 3;
  const top = wrapRect.top + startMin * pxPerMin - wrap.scrollTop;
  const width = colWidth - 6;
  const height = Math.max(6, (endMin - startMin) * 0.85 - 3);

  console.log("[dragdrop] createPreviewBlock", {day, startMin, endMin, top, left, height, scrollTop: wrap.scrollTop});

  previewEl = document.createElement("div");
  previewEl.className = "tt-block tt-drag-preview";
  previewEl.style.cssText = `
    position: fixed;
    left: ${left}px;
    top: ${top}px;
    width: ${width}px;
    height: ${height}px;
    background: ${color}44;
    border: 2px dashed ${color};
    border-radius: 7px;
    pointer-events: none;
    z-index: 10000;
    box-sizing: border-box;
  `;
  document.body.appendChild(previewEl);
}

function removePreview() {
  if (previewEl) {
    previewEl.remove();
    previewEl = null;
  }
}

function getBlockAtPoint(x, y) {
  const blocks = document.querySelectorAll("#ttGrid .tt-block[data-edit-block]");
  for (const el of blocks) {
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      return { el, id: el.dataset.editBlock };
    }
  }
  return null;
}

function isOverResizeHandle(el, x, y) {
  const r = el.getBoundingClientRect();
  return y >= r.bottom - 8 && y <= r.bottom + 2 && x >= r.left && x <= r.right;
}

function onPointerDown(e) {
  console.log("[dragdrop] pointerdown", e.clientX, e.clientY, e.target);
  if (e.button !== 0) return;
  
  const wrap = document.querySelector(".tt-wrap");
  const grid = document.querySelector(".tt-body");
  if (!grid || !wrap) return;
  
  const wrapRect = wrap.getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;
  
  if (x < wrapRect.left || x > wrapRect.right || y < wrapRect.top || y > wrapRect.bottom) return;
  
  const target = getBlockAtPoint(x, y);

  if (target) {
    const onResize = isOverResizeHandle(target.el, x, y);
    dragState = {
      mode: onResize ? "resize" : "move",
      blockId: target.id,
      startX: x,
      startY: y,
      startDay: null,
      startMin: null,
      endMin: null,
      origDay: null,
      origStart: null,
      origEnd: null,
    };

    const block = state.timetable.find(b => b.id === target.id);
    if (!block) return;

    dragState.origDay = block.day;
    dragState.origStart = block.start;
    dragState.origEnd = block.end;

    dragState.startDay = block.day;
    dragState.startMin = timeToMin(block.start);
    dragState.endMin = timeToMin(block.end);

    e.preventDefault();
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.body.style.touchAction = "none";
    document.body.style.userSelect = "none";
  } else {
    const wrapRect = wrap.getBoundingClientRect();
    const day = dayFromX(x, wrapRect);
    const startMin = snapToGrid(minFromY(y, wrapRect));
    dragState = {
      mode: "create",
      startX: x,
      startY: y,
      startDay: day,
      startMin,
      endMin: startMin + 60,
    };

    e.preventDefault();
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.body.style.touchAction = "none";
    document.body.style.userSelect = "none";
  }
}

function onPointerMove(e) {
  if (!dragState) return;

  const wrap = document.querySelector(".tt-wrap");
  if (!wrap) return;
  const wrapRect = wrap.getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;

  if (x < wrapRect.left || x > wrapRect.right || y < wrapRect.top || y > wrapRect.bottom) {
    if (previewEl) previewEl.style.opacity = "0.3";
    return;
  }
  if (previewEl) previewEl.style.opacity = "1";

  const day = dayFromX(x, wrapRect);
  const min = snapToGrid(minFromY(y, wrapRect));

  if (dragState.mode === "create") {
    const start = Math.min(dragState.startMin, min);
    const end = Math.max(dragState.startMin, min);
    dragState.endMin = Math.max(end, start + 15);
    createPreviewBlock(day, start, dragState.endMin, "#888");
  } else if (dragState.mode === "move") {
    const deltaMin = min - dragState.startMin;
    const newStart = Math.max(0, Math.min(24 * 60 - 15, dragState.origStart + deltaMin));
    const duration = timeToMin(dragState.origEnd) - timeToMin(dragState.origStart);
    const newEnd = newStart + duration;
    dragState.startDay = day;
    dragState.startMin = newStart;
    dragState.endMin = newEnd;

    const block = state.timetable.find(b => b.id === dragState.blockId);
    const color = block ? blockColor(block) : "#888";
    createPreviewBlock(day, newStart, newEnd, "#888");
  } else if (dragState.mode === "resize") {
    const newEnd = Math.max(dragState.startMin + 15, Math.min(24 * 60, min));
    dragState.endMin = newEnd;

    const block = state.timetable.find(b => b.id === dragState.blockId);
    const color = block ? blockColor(block) : "#888";
    createPreviewBlock(dragState.startDay, dragState.startMin, newEnd, "#888");
  }
}

function onPointerUp(e) {
  if (!dragState) return;

  document.removeEventListener("pointermove", onPointerMove);
  document.removeEventListener("pointerup", onPointerUp);
  document.body.style.touchAction = "";
  document.body.style.userSelect = "";
  removePreview();

  const wrap = document.querySelector(".tt-wrap");
  if (!wrap) { dragState = null; return; }
  const wrapRect = wrap.getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;

  const inBounds = x >= wrapRect.left && x <= wrapRect.right && y >= wrapRect.top && y <= wrapRect.bottom;

  if (!inBounds) {
    dragState = null;
    return;
  }

  if (dragState.mode === "create") {
    console.log("[dragdrop] create complete", {startMin: dragState.startMin, endMin: dragState.endMin, startDay: dragState.startDay});
    if (dragState.endMin > dragState.startMin + 15) {
      const start = minToTime(dragState.startMin);
      const end = minToTime(dragState.endMin);
      const btn = document.querySelector(`.tt-add-col-btn[data-add-day="${dragState.startDay}"]`) || document.getElementById("ttAddBtn");
      openBlockModal(null, dragState.startDay, btn, minToTime(dragState.startMin), minToTime(dragState.endMin));
    }
  } else if (dragState.mode === "move") {
    console.log("[dragdrop] move complete", {startMin: dragState.startMin, endMin: dragState.endMin, startDay: dragState.startDay});
    const block = state.timetable.find(b => b.id === dragState.blockId);
    if (block) {
      const newDay = dragState.startDay;
      const newStart = minToTime(dragState.startMin);
      const newEnd = minToTime(dragState.endMin);
      if (newDay !== block.day || newStart !== block.start || newEnd !== block.end) {
        block.day = newDay;
        block.start = newStart;
        block.end = newEnd;
        save();
        renderTimetable();
        if (block.todoistId && block.type === "task") {
          todoistSync();
        }
      }
    }
  } else if (dragState.mode === "resize") {
    console.log("[dragdrop] resize complete", {startMin: dragState.startMin, endMin: dragState.endMin, startDay: dragState.startDay});
    const block = state.timetable.find(b => b.id === dragState.blockId);
    if (block) {
      const newEnd = minToTime(dragState.endMin);
      if (newEnd !== block.end) {
        block.end = newEnd;
        save();
        renderTimetable();
        if (block.todoistId && block.type === "task") {
          todoistSync();
        }
      }
    }
  }

  dragState = null;
}

function initDragDrop() {
  const grid = document.querySelector(".tt-body");
  console.log("[dragdrop] initDragDrop, grid:", grid);
  if (grid) {
    grid.addEventListener("pointerdown", onPointerDown);
    grid.style.touchAction = "none";
    console.log("[dragdrop] pointerdown listener attached");
  } else {
    console.log("[dragdrop] .tt-body not found!");
  }
}