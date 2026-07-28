"use strict";

/**
 * Enhanced Todoist Sync Override Module
 *
 * This module provides conflict resolution for sync operations between
 * Keystone and Todoist, preventing duplicate project creation during resets.
 *
 * NOTE: The core todoistPush() in todoist-sync.js now handles name-based
 * matching, Keystone override (deletes unmatched Todoist items), and prevents
 * This file now primarily provides the reset functionality.
 */

/**
 * Reset sync function that properly clears Todoist mappings
 */
function resetTodoistSyncProperly() {
  const mode = window.todoistSyncMode || "keystone";
  const tip = mode === "keystone"
    ? "After reset, Keystone data will override Todoist on next sync (unmatched items are deleted)."
    : mode === "todoist"
    ? "After reset, Todoist data will overwrite your local data on next sync."
    : "After reset, you'll be prompted to choose the source of truth for each project.";

  if(confirm("Reset all Todoist sync links?\n\nThis will clear all todoistId references and recreate everything fresh on the next sync. Your local tasks, subjects, and timetable data will NOT be deleted.\n\n" + tip)){
    for(const cat of state.tasks){
      delete cat.todoistId;
      for(const g of (cat.groups || [])){
        delete g.todoistSectionId;
        for(const t of (g.tasks || [])) delete t.todoistId;
      }
    }
    for(const slot of (state.timetable || [])){
      for(const t of (slot.tasks || [])) delete t.todoistId;
    }
    todoistMap = {projects:{},sections:{},tasks:{},completed:{}};
    saveTodoistMap();
    save();
    todoistSyncStatus = "idle";
    toast("Todoist sync reset. Press 'Sync now' to recreate.");
    renderTodoistPanel();
  }
}

if (typeof window !== 'undefined') {
  window.resetTodoistSyncProperly = resetTodoistSyncProperly;
}
