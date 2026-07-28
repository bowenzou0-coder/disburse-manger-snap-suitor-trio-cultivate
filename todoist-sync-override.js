"use strict";

/**
 * Enhanced Todoist Sync Override Module
 *
 * This module provides conflict resolution for sync operations between
 * Keystone and Todoist, preventing duplicate project creation during resets.
 *
 * KEY FEATURES:
 * - Detects conflicts (same name, different IDs)
 * - Shows user-friendly dialogs to choose override direction
 * - Prevents duplicate project/task creation
 * - Respects todoistSyncMode setting from todoist-sync.js
 *
 * NOTE: This file depends on globals from todoist-sync.js:
 *   todoistToken, todoistMap, TODOIST_TOKEN_KEY, TODOIST_MAP_KEY,
 *   todoistFetch(), saveTodoistMap(), COLOR_MAP, escapeHtml()
 */

/**
 * Checks if a project already exists in Todoist to prevent duplicates
 * @param {string} name - Project name to search for
 * @returns {Promise<object|null>} - Existing project object or null
 */
async function findExistingProjectByName(name) {
  try{
    const projects = await todoistFetch("/projects");
    if (!projects) return null;

    const projectArray = Array.isArray(projects) ? projects : projects.results || projects.data || [];
    return projectArray.find(p => p.name.toLowerCase() === name.toLowerCase());
  } catch (e) {
    console.error("Error fetching projects:", e);
    return null;
  }
}

/**
 * Checks if a section already exists in Todoist by name within a project
 * @param {string} projectId - Todoist project ID
 * @param {string} name - Section name to search for
 * @returns {Promise<object|null>} - Existing section object or null
 */
async function findExistingSectionByName(projectId, name) {
  try {
    const sections = await todoistFetch("/sections");
    if (!sections) return null;
    const arr = Array.isArray(sections) ? sections : sections.results || sections.data || [];
    return arr.find(s => s.project_id === projectId && s.name.toLowerCase() === name.toLowerCase());
  } catch (e) {
    console.error("Error fetching sections:", e);
    return null;
  }
}

/**
 * Shows a conflict resolution dialog for projects
 * @param {object} localProject - Local project data
 * @param {object} remoteProject - Remote (Todoist) project data
 * @returns {Promise<'local'|'remote'|'cancel'>} - User choice
 */
function showProjectConflictDialog(localProject, remoteProject) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;justify-content:center;align-items:center;';

    const mode = window.todoistSyncMode || "keystone";
    const recommendation = mode === "todoist"
      ? '💡 Recommendation: Choose "Override with Todoist" to maintain Todoist as your single source of truth'
      : '💡 Recommendation: Choose "Override with Keystone" to maintain Keystone as your single source of truth';

    const dialog = document.createElement('div');
    dialog.style.cssText = 'background:white;padding:24px;border-radius:12px;max-width:520px;width:90%;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:10001;';
    dialog.innerHTML = `
      <h3 style="margin-top:0;margin-bottom:16px;font-size:18px;color:#1a1a1a;">Project Conflict Detected</h3>
      <p style="font-size:14px;color:#4a4a4a;margin-bottom:8px;"><strong>Local Project:</strong> ${escapeHtml(localProject.name)}</p>
      <p style="font-size:14px;color:#4a4a4a;margin-bottom:20px;"><strong>Remote Project (Todoist):</strong> ${escapeHtml(remoteProject.name)}</p>
      <div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#666;">
        <p style="margin:0 0 8px 0;"><strong>What would you like to do?</strong></p>
        <ul style="margin:0;padding-left:20px;">
          <li><strong>Override with Keystone:</strong> Delete this Todoist project and recreate from your local data</li>
          <li><strong>Override with Todoist:</strong> Keep this Todoist project and update your local app</li>
        </ul>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="keep-local-btn" class="btn btn-primary" style="flex:1;min-width:140px;">Override with Keystone</button>
        <button id="keep-remote-btn" class="btn btn-success" style="flex:1;min-width:140px;">Override with Todoist</button>
        <button id="cancel-btn" class="btn" style="flex:1;min-width:140px;">Cancel Sync</button>
      </div>
      <p style="font-size:11px;color:#999;margin-top:12px;text-align:center;">${recommendation}</p>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    document.getElementById('keep-local-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve('local');
    });
    document.getElementById('keep-remote-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve('remote');
    });
    document.getElementById('cancel-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve('cancel');
    });
  });
}

/**
 * Shows a conflict resolution dialog for tasks
 * @param {object} localTask - Local task data
 * @param {object} remoteTask - Remote (Todoist) task data
 * @returns {Promise<'local'|'remote'|'cancel'>} - User choice
 */
function showTaskConflictDialog(localTask, remoteTask) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;justify-content:center;align-items:center;';

    const mode = window.todoistSyncMode || "keystone";
    const recommendation = mode === "todoist"
      ? '💡 Recommendation: Choose "Override with Todoist" to maintain consistency'
      : '💡 Recommendation: Choose "Override with Keystone" to maintain consistency';

    const dialog = document.createElement('div');
    dialog.style.cssText = 'background:white;padding:24px;border-radius:12px;max-width:520px;width:90%;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:10001;';
    dialog.innerHTML = `
      <h3 style="margin-top:0;margin-bottom:16px;font-size:18px;color:#1a1a1a;">Task Conflict Detected</h3>
      <p style="font-size:14px;color:#4a4a4a;margin-bottom:8px;"><strong>Local Task:</strong> ${escapeHtml(localTask.title || localTask.content)}</p>
      <p style="font-size:14px;color:#4a4a4a;margin-bottom:20px;"><strong>Remote Task (Todoist):</strong> ${escapeHtml(remoteTask.content)}</p>
      <div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#666;">
        <p style="margin:0 0 8px 0;"><strong>What would you like to do?</strong></p>
        <ul style="margin:0;padding-left:20px;">
          <li><strong>Override with Keystone:</strong> Delete this Todoist task and recreate from your local data</li>
          <li><strong>Override with Todoist:</strong> Keep this Todoist task and update your local app</li>
        </ul>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="keep-local-task-btn" class="btn btn-primary" style="flex:1;min-width:140px;">Override with Keystone</button>
        <button id="keep-remote-task-btn" class="btn btn-success" style="flex:1;min-width:140px;">Override with Todoist</button>
        <button id="cancel-task-btn" class="btn" style="flex:1;min-width:140px;">Cancel Sync</button>
      </div>
      <p style="font-size:11px;color:#999;margin-top:12px;text-align:center;">${recommendation}</p>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    document.getElementById('keep-local-task-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve('local');
    });
    document.getElementById('keep-remote-task-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve('remote');
    });
    document.getElementById('cancel-task-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve('cancel');
    });
  });
}

/**
 * Modified push function with conflict resolution
 * Respects todoistSyncMode to auto-resolve or show dialogs
 */
async function todoistPushWithConflictResolution() {
  if(!todoistToken || !state.tasks.length) return;

  const mode = window.todoistSyncMode || "keystone";

  if(window.todoistSyncProgress) {
    window.todoistSyncProgress = { phase: "projects", done: 0, total: state.tasks.length };
    if(window.renderTodoistPanel) window.renderTodoistPanel();
  }

  for(const cat of state.tasks) {
    if (!cat.todoistId) {
      const existingProject = await findExistingProjectByName(cat.name);

      if (existingProject) {
        let resolution;
        if (mode === "keystone") {
          resolution = "local";
          console.log(`[Conflict] Keystone mode: auto-resolving project "${cat.name}" with Keystone`);
        } else if (mode === "todoist") {
          resolution = "remote";
          console.log(`[Conflict] Todoist mode: auto-resolving project "${cat.name}" with Todoist`);
        } else {
          resolution = await showProjectConflictDialog(cat, existingProject);
        }

        if (resolution === 'local') {
          cat.todoistId = existingProject.id;
          todoistMap.projects[existingProject.id] = cat.id;
        } else if (resolution === 'remote') {
          cat.todoistId = existingProject.id;
          todoistMap.projects[existingProject.id] = cat.id;
        } else {
          console.log("Sync cancelled by user");
          return;
        }
      } else {
        const createdProject = await todoistFetch("/projects", {
          method: "POST",
          body: JSON.stringify({ name: cat.name, color: window.COLOR_MAP[cat.color] || 34 })
        });
        cat.todoistId = createdProject.id;
        todoistMap.projects[createdProject.id] = cat.id;
      }
    } else {
      try {
        const current = await todoistFetch("/projects/" + cat.todoistId);
        if (current && (current.name !== cat.name || current.color !== (window.COLOR_MAP[cat.color] || 34))) {
          await todoistFetch("/projects/" + cat.todoistId, {
            method: "POST",
            body: JSON.stringify({ name: cat.name, color: window.COLOR_MAP[cat.color] || 34 })
          });
        }
      } catch (e) {
        if (e.message === "NOT_FOUND" || e.message.includes("Network error")) {
          console.warn(`[Todoist Sync] Project ID ${cat.todoistId} missing. Clearing ID to recreate.`);
          const oldId = cat.todoistId;
          cat.todoistId = null;
          delete todoistMap.projects[oldId];

          const createdProject = await todoistFetch("/projects", {
            method: "POST",
            body: JSON.stringify({ name: cat.name, color: window.COLOR_MAP[cat.color] || 34 })
          });
          cat.todoistId = createdProject.id;
          todoistMap.projects[createdProject.id] = cat.id;
        } else {
          throw e;
        }
      }
    }

    if(window.todoistSyncProgress) {
      window.todoistSyncProgress.done++;
      if(window.renderTodoistPanel) window.renderTodoistPanel();
    }
  }

  if(window.todoistSyncProgress) {
    window.todoistSyncProgress = { phase: "done", done: 0, total: 0 };
  }

  localStorage.setItem(TODOIST_MAP_KEY, JSON.stringify(todoistMap));
  if(window.save) window.save();
}

/**
 * Reset sync function that properly clears Todoist mappings
 */
function resetTodoistSyncProperly() {
  const mode = window.todoistSyncMode || "keystone";
  const tip = mode === "keystone"
    ? "After reset, Keystone data will be pushed to Todoist on next sync."
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
  window.todoistPushWithConflictResolution = todoistPushWithConflictResolution;
  window.resetTodoistSyncProperly = resetTodoistSyncProperly;
  window.findExistingProjectByName = findExistingProjectByName;
  window.findExistingSectionByName = findExistingSectionByName;
  window.showProjectConflictDialog = showProjectConflictDialog;
  window.showTaskConflictDialog = showTaskConflictDialog;
}
