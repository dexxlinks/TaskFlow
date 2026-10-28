(() => {
  "use strict";

  const STORAGE_KEYS = {
    tasks: "taskflow.tasks.v1",
    categories: "taskflow.categories.v1",
    preferences: "taskflow.preferences.v1"
  };

  const DEFAULT_CATEGORIES = [
    { id: "personal", name: "Personal", color: "#d7a45c" },
    { id: "work", name: "Work", color: "#6b83df" },
    { id: "study", name: "Study", color: "#45a88b" },
    { id: "projects", name: "Projects", color: "#a17bdd" }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const elements = {
    sidebar: $("#sidebar"), sidebarScrim: $("#sidebarScrim"), menuToggle: $("#menuToggle"),
    primaryNav: $("#primaryNav"), categoryNav: $("#categoryNav"), addCategoryButton: $("#addCategoryButton"),
    breadcrumbCurrent: $("#breadcrumbCurrent"), greeting: $("#greeting"), currentDate: $("#currentDate"),
    searchInput: $("#searchInput"), newTaskButton: $("#newTaskButton"), secondaryNewTask: $("#secondaryNewTask"),
    overviewPanel: $("#overviewPanel"), tasksPanel: $("#tasksPanel"), settingsPanel: $("#settingsPanel"),
    statTotal: $("#statTotal"), statCompleted: $("#statCompleted"), statPending: $("#statPending"), statOverdue: $("#statOverdue"),
    completionRate: $("#completionRate"), progressRing: $("#progressRing"), progressPercent: $("#progressPercent"),
    progressHeadline: $("#progressHeadline"), progressDescription: $("#progressDescription"), progressBar: $("#progressBar"),
    focusList: $("#focusList"), viewTitle: $("#viewTitle"), viewSubtitle: $("#viewSubtitle"), resultCount: $("#resultCount"),
    filterTabs: $("#filterTabs"), priorityFilter: $("#priorityFilter"), sortSelect: $("#sortSelect"),
    activeFilters: $("#activeFilters"), taskList: $("#taskList"), listFooterText: $("#listFooterText"),
    clearCompletedButton: $("#clearCompletedButton"), taskDialog: $("#taskDialog"), taskForm: $("#taskForm"),
    dialogTitle: $("#dialogTitle"), dialogEyebrow: $("#dialogEyebrow"), taskTitle: $("#taskTitle"),
    taskDescription: $("#taskDescription"), taskDueDate: $("#taskDueDate"), taskPriority: $("#taskPriority"),
    taskCategory: $("#taskCategory"), formError: $("#formError"), saveTaskButton: $("#saveTaskButton"),
    closeDialogButton: $("#closeDialogButton"), cancelDialogButton: $("#cancelDialogButton"),
    confirmDialog: $("#confirmDialog"), confirmTitle: $("#confirmTitle"), confirmMessage: $("#confirmMessage"),
    confirmCancel: $("#confirmCancel"), confirmProceed: $("#confirmProceed"), toastRegion: $("#toastRegion"),
    themeOptions: $("#themeOptions"), quickThemeButton: $("#quickThemeButton"), defaultView: $("#defaultView"),
    exportButton: $("#exportButton"), importButton: $("#importButton"), importFile: $("#importFile"),
    clearAllButton: $("#clearAllButton"), restoreSampleButton: $("#restoreSampleButton"),
    storageNotice: $("#storageNotice"), settingsShortcut: $("#settingsShortcut")
  };

  let storageAvailable = testStorage();
  let memoryStore = { tasks: [], categories: clone(DEFAULT_CATEGORIES), preferences: { theme: "light", defaultView: "overview" } };
  let state = {
    tasks: [], categories: clone(DEFAULT_CATEGORIES),
    preferences: { theme: "light", defaultView: "overview" },
    view: "overview", categoryId: null, filter: "all", priority: "all", sort: "due",
    query: "", editingId: null, confirmAction: null, toastTimer: null
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function testStorage() {
    try { const key = "__taskflow_test__"; localStorage.setItem(key, "1"); localStorage.removeItem(key); return true; }
    catch { return false; }
  }
  function readStored(key, fallback, validate) {
    if (!storageAvailable) return clone(fallback);
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return clone(fallback);
      const parsed = JSON.parse(raw);
      return validate(parsed) ? parsed : clone(fallback);
    } catch (error) {
      console.warn(`TaskFlow could not read ${key}. Existing stored data was left untouched.`, error);
      return clone(fallback);
    }
  }
  function writeStored(key, value) {
    if (!storageAvailable) {
      if (key === STORAGE_KEYS.tasks) memoryStore.tasks = clone(value);
      if (key === STORAGE_KEYS.categories) memoryStore.categories = clone(value);
      if (key === STORAGE_KEYS.preferences) memoryStore.preferences = clone(value);
      return false;
    }
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) {
      storageAvailable = false;
      console.warn("TaskFlow could not persist data; continuing in memory.", error);
      showToast("Browser storage is unavailable or full. Changes may not persist.", "error");
      return false;
    }
  }
  function validTasks(value) {
    return Array.isArray(value) && value.every(task =>
      task && typeof task.id === "string" && typeof task.title === "string" &&
      typeof task.completed === "boolean" && ["low", "medium", "high"].includes(task.priority) &&
      typeof task.categoryId === "string" && typeof task.createdAt === "string"
    );
  }
  function validCategories(value) {
    return Array.isArray(value) && value.every(category =>
      category && typeof category.id === "string" && typeof category.name === "string" && typeof category.color === "string"
    );
  }
  function validPreferences(value) {
    return value && ["light", "dark"].includes(value.theme) &&
      ["overview", "all", "today", "upcoming", "completed"].includes(value.defaultView);
  }
  function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function dateOffset(days) { const date = new Date(); date.setDate(date.getDate() + days); return localDateKey(date); }
  function makeId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
    return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  function sampleTasks() {
    const now = new Date().toISOString();
    return [
      { id: makeId(), title: "Review JavaScript array methods", description: "Practise map, filter, find and reduce with small examples.", dueDate: dateOffset(0), priority: "high", categoryId: "study", completed: false, createdAt: now, completedAt: null },
      { id: makeId(), title: "Update portfolio project cards", description: "Add the weather app demo and a short feature summary.", dueDate: dateOffset(1), priority: "medium", categoryId: "projects", completed: false, createdAt: now, completedAt: null },
      { id: makeId(), title: "Plan the week", description: "Choose three outcomes to focus on before Friday.", dueDate: dateOffset(2), priority: "low", categoryId: "personal", completed: true, createdAt: now, completedAt: now },
      { id: makeId(), title: "Read API documentation", description: "Review response codes and error handling.", dueDate: dateOffset(-1), priority: "medium", categoryId: "work", completed: false, createdAt: now, completedAt: null },
      { id: makeId(), title: "Push latest changes to GitHub", description: "Check the README and verify the repository structure.", dueDate: dateOffset(3), priority: "high", categoryId: "projects", completed: false, createdAt: now, completedAt: null }
    ];
  }
  function initialize() {
    state.tasks = readStored(STORAGE_KEYS.tasks, sampleTasks(), validTasks);
    state.categories = readStored(STORAGE_KEYS.categories, DEFAULT_CATEGORIES, validCategories);
    state.preferences = { ...state.preferences, ...readStored(STORAGE_KEYS.preferences, state.preferences, validPreferences) };
    if (!storageAvailable) {
      state.tasks = memoryStore.tasks.length ? clone(memoryStore.tasks) : sampleTasks();
      state.categories = clone(memoryStore.categories);
      state.preferences = clone(memoryStore.preferences);
    }
    if (!state.categories.length) state.categories = clone(DEFAULT_CATEGORIES);
    state.view = state.preferences.defaultView;
    renderAll();
    updateStorageNotice();
    bindEvents();
  }
  function persistTasks() { writeStored(STORAGE_KEYS.tasks, state.tasks); }
  function persistCategories() { writeStored(STORAGE_KEYS.categories, state.categories); }
  function persistPreferences() { writeStored(STORAGE_KEYS.preferences, state.preferences); }
  function categoryFor(id) { return state.categories.find(category => category.id === id) || { id: "uncategorized", name: "Uncategorized", color: "#929bad" }; }
  function isOverdue(task) { return !task.completed && Boolean(task.dueDate) && task.dueDate < localDateKey(); }
  function dateLabel(dateString) {
    if (!dateString) return "No due date";
    const today = localDateKey(), tomorrow = dateOffset(1);
    if (dateString === today) return "Today";
    if (dateString === tomorrow) return "Tomorrow";
    const parsed = new Date(`${dateString}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateString;
    return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  function readableDate(dateString) {
    if (!dateString) return "";
    const date = new Date(`${dateString}T12:00:00`);
    return Number.isNaN(date.getTime()) ? dateString : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  function renderAll() {
    applyTheme();
    renderGreeting();
    renderNavigation();
    renderCategories();
    renderStats();
    renderProgress();
    renderFocusList();
    renderView();
    renderTaskCategoryOptions();
    renderSettings();
  }
  function renderGreeting() {
    const hour = new Date().getHours();
    elements.greeting.textContent = hour < 12 ? "Good morning." : hour < 17 ? "Good afternoon." : "Good evening.";
    elements.currentDate.textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase();
  }
  function renderNavigation() {
    $$(".nav-item[data-view]", elements.primaryNav.parentElement.parentElement).forEach(button => {
      button.classList.toggle("active", button.dataset.view === state.view && !state.categoryId);
      if (button.dataset.view === "all") $("#countAll").textContent = state.tasks.length;
      if (button.dataset.view === "today") $("#countToday").textContent = state.tasks.filter(task => !task.completed && task.dueDate === localDateKey()).length;
      if (button.dataset.view === "completed") $("#countCompleted").textContent = state.tasks.filter(task => task.completed).length;
    });
    elements.breadcrumbCurrent.textContent = state.categoryId ? categoryFor(state.categoryId).name : ({
      overview: "Overview", all: "My Tasks", today: "Today", upcoming: "Upcoming", completed: "Completed", settings: "Settings"
    }[state.view] || "My Tasks");
  }
  function renderCategories() {
    elements.categoryNav.replaceChildren();
    state.categories.forEach(category => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `nav-item category-item${state.categoryId === category.id ? " active" : ""}`;
      button.dataset.categoryId = category.id;
      const dot = document.createElement("span"); dot.className = "category-dot"; dot.style.setProperty("--cat-color", category.color);
      const name = document.createElement("span"); name.textContent = category.name;
      const count = document.createElement("span"); count.className = "nav-count"; count.textContent = state.tasks.filter(task => task.categoryId === category.id).length;
      button.append(dot, name, count);
      elements.categoryNav.append(button);
    });
  }
  function renderTaskCategoryOptions(selectedId) {
    const current = selectedId || elements.taskCategory.value;
    elements.taskCategory.replaceChildren();
    state.categories.forEach(category => {
      const option = document.createElement("option"); option.value = category.id; option.textContent = category.name;
      elements.taskCategory.append(option);
    });
    if (current && state.categories.some(category => category.id === current)) elements.taskCategory.value = current;
  }
  function renderStats() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const overdue = state.tasks.filter(isOverdue).length;
    elements.statTotal.textContent = total;
    elements.statCompleted.textContent = completed;
    elements.statPending.textContent = pending;
    elements.statOverdue.textContent = overdue;
    elements.completionRate.textContent = `${total ? Math.round(completed / total * 100) : 0}%`;
  }
  function renderProgress() {
    const total = state.tasks.length, completed = state.tasks.filter(task => task.completed).length;
    const percent = total ? Math.round(completed / total * 100) : 0;
    elements.progressRing.style.setProperty("--progress", `${percent}%`);
    elements.progressPercent.textContent = `${percent}%`;
    elements.progressBar.style.width = `${percent}%`;
    elements.progressHeadline.textContent = total === 0 ? "Your week starts here" : percent === 100 ? "Everything is wrapped up" : completed ? "You're building momentum" : "Pick your first small win";
    elements.progressDescription.textContent = total === 0 ? "Add a task to start building momentum." : `${completed} of ${total} ${total === 1 ? "task is" : "tasks are"} complete. Keep taking it one step at a time.`;
  }
  function renderFocusList() {
    const tasks = state.tasks.filter(task => !task.completed && task.dueDate === localDateKey()).sort(compareTasks).slice(0, 4);
    elements.focusList.replaceChildren();
    if (!tasks.length) {
      const empty = document.createElement("div"); empty.className = "focus-empty"; empty.textContent = "No tasks due today. Enjoy the breathing room."; elements.focusList.append(empty); return;
    }
    tasks.forEach(task => {
      const row = document.createElement("div"); row.className = "focus-item";
      const check = document.createElement("button"); check.className = "mini-check"; check.type = "button"; check.dataset.action = "toggle"; check.dataset.id = task.id; check.setAttribute("aria-label", `Complete ${task.title}`);
      const title = document.createElement("span"); title.className = "focus-title"; title.textContent = task.title;
      const date = document.createElement("span"); date.className = "focus-date"; date.textContent = task.priority === "high" ? "High priority" : categoryFor(task.categoryId).name;
      row.append(check, title, date); elements.focusList.append(row);
    });
  }
  function renderView() {
    const isSettings = state.view === "settings";
    elements.settingsPanel.hidden = !isSettings;
    elements.overviewPanel.hidden = isSettings || state.view !== "overview";
    elements.tasksPanel.hidden = isSettings;
    if (isSettings) return;
    const viewTitles = { overview: "Your tasks", all: "All tasks", today: "Today", upcoming: "Upcoming", completed: "Completed" };
    const viewSubtitles = { overview: "The things you’re working on, all in one place.", all: "Everything you want to move forward.", today: "Focus on what needs your attention today.", upcoming: "A clear look at what’s coming next.", completed: "Look back at what you’ve already accomplished." };
    elements.viewTitle.textContent = state.categoryId ? categoryFor(state.categoryId).name : (viewTitles[state.view] || "All tasks");
    elements.viewSubtitle.textContent = state.categoryId ? `Tasks filed under ${categoryFor(state.categoryId).name}.` : (viewSubtitles[state.view] || "");
    const filtered = getVisibleTasks();
    elements.resultCount.textContent = filtered.length;
    elements.taskList.replaceChildren();
    if (!filtered.length) renderEmptyState();
    else filtered.forEach(task => elements.taskList.append(createTaskElement(task)));
    elements.listFooterText.textContent = `Showing ${filtered.length} ${filtered.length === 1 ? "task" : "tasks"}`;
    elements.clearCompletedButton.hidden = !state.tasks.some(task => task.completed);
    renderActiveFilters();
  }
  function getVisibleTasks() {
    let tasks = [...state.tasks];
    if (state.categoryId) tasks = tasks.filter(task => task.categoryId === state.categoryId);
    if (state.view === "today") tasks = tasks.filter(task => task.dueDate === localDateKey());
    else if (state.view === "upcoming") tasks = tasks.filter(task => !task.completed && task.dueDate && task.dueDate >= localDateKey());
    else if (state.view === "completed") tasks = tasks.filter(task => task.completed);
    if (state.filter === "completed") tasks = tasks.filter(task => task.completed);
    else if (state.filter === "pending") tasks = tasks.filter(task => !task.completed);
    else if (state.filter === "overdue") tasks = tasks.filter(isOverdue);
    if (state.priority !== "all") tasks = tasks.filter(task => task.priority === state.priority);
    const query = state.query.trim().toLocaleLowerCase();
    if (query) tasks = tasks.filter(task => `${task.title} ${task.description || ""}`.toLocaleLowerCase().includes(query));
    return tasks.sort(compareTasks);
  }
  function compareTasks(a, b) {
    if (state.sort === "priority") {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority] || compareDue(a, b);
    }
    if (state.sort === "created") return new Date(b.createdAt) - new Date(a.createdAt);
    if (state.sort === "alphabetical") return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    return compareDue(a, b);
  }
  function compareDue(a, b) {
    if (!a.dueDate && !b.dueDate) return new Date(b.createdAt) - new Date(a.createdAt);
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate) || ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]);
  }
  function createTaskElement(task) {
    const row = document.createElement("article");
    row.className = `task-row${task.completed ? " is-completed" : ""}`;
    row.dataset.id = task.id;
    const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.className = "task-check"; checkbox.checked = task.completed; checkbox.dataset.action = "toggle"; checkbox.dataset.id = task.id; checkbox.setAttribute("aria-label", task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`);
    const main = document.createElement("div"); main.className = "task-main";
    const titleLine = document.createElement("div"); titleLine.className = "task-title-line";
    const title = document.createElement("span"); title.className = "task-title"; title.textContent = task.title; titleLine.append(title);
    main.append(titleLine);
    if (task.description) { const description = document.createElement("p"); description.className = "task-description"; description.textContent = task.description; main.append(description); }
    const meta = document.createElement("div"); meta.className = "task-meta";
    const priority = document.createElement("span"); priority.className = `priority-badge priority-${task.priority}`; priority.textContent = `${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`;
    const category = categoryFor(task.categoryId); const categoryBadge = document.createElement("span"); categoryBadge.className = "category-badge";
    const categoryDot = document.createElement("i"); categoryDot.style.setProperty("--cat-color", category.color);
    const categoryName = document.createElement("span"); categoryName.textContent = category.name; categoryBadge.append(categoryDot, categoryName);
    meta.append(priority, categoryBadge);
    if (task.dueDate) { const due = document.createElement("span"); due.className = `due-badge${isOverdue(task) ? " overdue" : task.dueDate === localDateKey() && !task.completed ? " today" : ""}`; due.textContent = `${isOverdue(task) ? "Overdue · " : ""}${dateLabel(task.dueDate)}`; meta.append(due); }
    main.append(meta);
    const actions = document.createElement("div"); actions.className = "task-actions";
    const edit = document.createElement("button"); edit.type = "button"; edit.className = "task-action"; edit.dataset.action = "edit"; edit.dataset.id = task.id; edit.textContent = "✎"; edit.setAttribute("aria-label", `Edit ${task.title}`); edit.title = "Edit task";
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "task-action delete"; remove.dataset.action = "delete"; remove.dataset.id = task.id; remove.textContent = "×"; remove.setAttribute("aria-label", `Delete ${task.title}`); remove.title = "Delete task";
    actions.append(edit, remove); row.append(checkbox, main, actions); return row;
  }
  function renderEmptyState() {
    const box = document.createElement("div"); box.className = "empty-state";
    const illustration = document.createElement("div"); illustration.className = "empty-illustration"; illustration.textContent = state.query ? "⌕" : state.view === "completed" ? "✓" : "✦";
    const heading = document.createElement("h3"); const message = document.createElement("p");
    if (state.query) { heading.textContent = "No matching tasks"; message.textContent = "Try a different keyword or clear your search to see more tasks."; }
    else if (state.filter !== "all" || state.priority !== "all") { heading.textContent = "No tasks match these filters"; message.textContent = "Try changing the filters to widen your list."; }
    else if (state.view === "today") { heading.textContent = "Nothing due today"; message.textContent = "You’re clear for now. Add a task if something needs your attention."; }
    else if (state.view === "upcoming") { heading.textContent = "Nothing upcoming yet"; message.textContent = "Add a due date to a task and it will appear here."; }
    else if (state.view === "completed") { heading.textContent = "Your wins will show up here"; message.textContent = "Complete a task to start building your record of progress."; }
    else { heading.textContent = "A fresh start"; message.textContent = "Add your first task and give your next step a home."; }
    const button = document.createElement("button"); button.type = "button"; button.className = "button button-primary"; button.textContent = state.query ? "Clear search" : "+ Create a task";
    button.addEventListener("click", () => state.query ? clearSearch() : openTaskDialog());
    box.append(illustration, heading, message, button); elements.taskList.append(box);
  }
  function renderActiveFilters() {
    const labels = [];
    if (state.categoryId) labels.push(`Category: ${categoryFor(state.categoryId).name}`);
    if (state.filter !== "all") labels.push(`Status: ${state.filter}`);
    if (state.priority !== "all") labels.push(`Priority: ${state.priority}`);
    if (state.query.trim()) labels.push(`Search: “${state.query.trim()}”`);
    elements.activeFilters.hidden = !labels.length;
    elements.activeFilters.textContent = labels.length ? `${labels.join(" · ")} — ` : "";
    if (labels.length) {
      const clear = document.createElement("button"); clear.className = "text-button"; clear.type = "button"; clear.textContent = "Clear filters";
      clear.addEventListener("click", () => { state.categoryId = null; state.filter = "all"; state.priority = "all"; state.query = ""; elements.searchInput.value = ""; elements.priorityFilter.value = "all"; $$(".filter-tab", elements.filterTabs).forEach(tab => tab.classList.toggle("active", tab.dataset.filter === "all")); renderAll(); });
      elements.activeFilters.append(clear);
    }
  }
  function renderSettings() {
    $$(".segmented-control button", elements.themeOptions).forEach(button => button.classList.toggle("selected", button.dataset.theme === state.preferences.theme));
    elements.defaultView.value = state.preferences.defaultView;
  }
  function applyTheme() {
    document.documentElement.dataset.theme = state.preferences.theme;
    const dark = state.preferences.theme === "dark";
    elements.quickThemeButton.textContent = dark ? "☾" : "☼";
    elements.quickThemeButton.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    const metaTheme = $('meta[name="theme-color"]'); if (metaTheme) metaTheme.content = dark ? "#111722" : "#172033";
  }
  function updateStorageNotice() {
    const dot = document.createElement("span"); dot.className = "status-dot"; dot.style.background = storageAvailable ? "#43bd90" : "#e4ae4d";
    const copy = document.createElement("span"); copy.textContent = storageAvailable ? "Browser storage is available. Changes persist on this device." : "Storage is unavailable. Changes may be lost when you leave this page.";
    elements.storageNotice.replaceChildren(dot, copy);
  }
  function bindEvents() {
    elements.primaryNav.addEventListener("click", event => {
      const button = event.target.closest("[data-view]"); if (!button) return;
      state.view = button.dataset.view; state.categoryId = null; closeMobileNav(); renderAll();
    });
    const settingsNavButton = $(".settings-nav", elements.sidebar);
    settingsNavButton.addEventListener("click", () => {
      state.view = "settings"; state.categoryId = null; closeMobileNav(); renderAll();
    });
    elements.categoryNav.addEventListener("click", event => {
      const button = event.target.closest("[data-category-id]"); if (!button) return;
      state.categoryId = button.dataset.categoryId; state.view = "all"; closeMobileNav(); renderAll();
    });
    elements.addCategoryButton.addEventListener("click", addCategory);
    elements.newTaskButton.addEventListener("click", () => openTaskDialog());
    elements.secondaryNewTask.addEventListener("click", () => openTaskDialog());
    elements.searchInput.addEventListener("input", () => { state.query = elements.searchInput.value; renderView(); });
    elements.searchInput.addEventListener("focus", () => { if (window.innerWidth <= 620) elements.searchInput.closest(".search-box").classList.add("search-open"); });
    elements.searchInput.addEventListener("blur", () => { if (!elements.searchInput.value && window.innerWidth <= 620) elements.searchInput.closest(".search-box").classList.remove("search-open"); });
    elements.filterTabs.addEventListener("click", event => {
      const button = event.target.closest("[data-filter]"); if (!button) return;
      state.filter = button.dataset.filter;
      $$(".filter-tab", elements.filterTabs).forEach(tab => tab.classList.toggle("active", tab === button));
      renderView();
    });
    elements.priorityFilter.addEventListener("change", () => { state.priority = elements.priorityFilter.value; renderView(); });
    elements.sortSelect.addEventListener("change", () => { state.sort = elements.sortSelect.value; renderView(); });
    elements.taskList.addEventListener("click", handleTaskAction);
    elements.taskList.addEventListener("change", handleTaskAction);
    elements.focusList.addEventListener("click", event => { const button = event.target.closest('[data-action="toggle"]'); if (button) toggleTask(button.dataset.id); });
    elements.taskForm.addEventListener("submit", saveTaskFromForm);
    [elements.closeDialogButton, elements.cancelDialogButton].forEach(button => button.addEventListener("click", closeTaskDialog));
    elements.taskDialog.addEventListener("click", event => { if (event.target === elements.taskDialog) closeTaskDialog(); });
    elements.confirmCancel.addEventListener("click", closeConfirm);
    elements.confirmProceed.addEventListener("click", () => { const action = state.confirmAction; closeConfirm(); if (action) action(); });
    elements.clearCompletedButton.addEventListener("click", () => askConfirmation("Clear completed tasks?", "This will permanently delete every completed task.", "Clear completed", () => { state.tasks = state.tasks.filter(task => !task.completed); persistTasks(); renderAll(); showToast("Completed tasks cleared."); }));
    elements.themeOptions.addEventListener("click", event => { const button = event.target.closest("[data-theme]"); if (!button) return; state.preferences.theme = button.dataset.theme; persistPreferences(); renderAll(); });
    elements.quickThemeButton.addEventListener("click", () => { state.preferences.theme = state.preferences.theme === "light" ? "dark" : "light"; persistPreferences(); renderAll(); });
    elements.defaultView.addEventListener("change", () => { state.preferences.defaultView = elements.defaultView.value; persistPreferences(); showToast("Default view saved."); });
    elements.settingsShortcut.addEventListener("click", () => { state.view = "settings"; state.categoryId = null; renderAll(); });
    elements.exportButton.addEventListener("click", exportData);
    elements.importButton.addEventListener("click", () => elements.importFile.click());
    elements.importFile.addEventListener("change", importData);
    elements.clearAllButton.addEventListener("click", () => askConfirmation("Clear all task data?", "All tasks will be permanently removed from this browser. Your categories and preferences will remain.", "Clear all tasks", () => { state.tasks = []; persistTasks(); renderAll(); showToast("All tasks have been cleared."); }));
    elements.restoreSampleButton.addEventListener("click", () => askConfirmation("Restore sample tasks?", "This replaces your current task list with the original TaskFlow demo tasks.", "Restore samples", () => { state.tasks = sampleTasks(); state.categories = clone(DEFAULT_CATEGORIES); persistTasks(); persistCategories(); state.categoryId = null; state.filter = "all"; state.priority = "all"; state.query = ""; elements.searchInput.value = ""; elements.priorityFilter.value = "all"; renderAll(); showToast("Sample tasks restored."); }));
    elements.menuToggle.addEventListener("click", toggleMobileNav);
    elements.sidebarScrim.addEventListener("click", closeMobileNav);
    document.addEventListener("keydown", event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); elements.searchInput.focus(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") { event.preventDefault(); openTaskDialog(); }
      if (event.key === "Escape") closeMobileNav();
    });
    document.querySelectorAll(".text-button[data-view]").forEach(button => button.addEventListener("click", () => { state.view = button.dataset.view; state.categoryId = null; renderAll(); }));
  }
  function handleTaskAction(event) {
    const control = event.target.closest("[data-action]"); if (!control) return;
    const { action, id } = control.dataset;
    if (!id) return;
    if (action === "toggle") toggleTask(id);
    if (action === "edit") openTaskDialog(id);
    if (action === "delete") {
      const task = state.tasks.find(item => item.id === id); if (!task) return;
      askConfirmation("Delete this task?", `“${task.title}” will be permanently removed.`, "Delete task", () => { state.tasks = state.tasks.filter(item => item.id !== id); persistTasks(); renderAll(); showToast("Task deleted."); });
    }
  }
  function toggleTask(id) {
    const task = state.tasks.find(item => item.id === id); if (!task) return;
    task.completed = !task.completed; task.completedAt = task.completed ? new Date().toISOString() : null;
    persistTasks(); renderAll(); showToast(task.completed ? "Nice work — task completed." : "Task reopened.");
  }
  function openTaskDialog(id = null) {
    state.editingId = id;
    elements.taskForm.reset(); elements.formError.hidden = true; elements.formError.textContent = "";
    renderTaskCategoryOptions();
    if (id) {
      const task = state.tasks.find(item => item.id === id); if (!task) return;
      elements.dialogTitle.textContent = "Edit task"; elements.dialogEyebrow.textContent = "UPDATE TASK"; elements.saveTaskButton.innerHTML = "Save changes <span>→</span>";
      elements.taskTitle.value = task.title; elements.taskDescription.value = task.description || ""; elements.taskDueDate.value = task.dueDate || ""; elements.taskPriority.value = task.priority; elements.taskCategory.value = task.categoryId;
    } else {
      elements.dialogTitle.textContent = "Create a task"; elements.dialogEyebrow.textContent = "TASK DETAILS"; elements.saveTaskButton.innerHTML = "Create task <span>→</span>";
      elements.taskPriority.value = "medium"; if (state.categoryId) elements.taskCategory.value = state.categoryId;
    }
    if (!elements.taskDialog.open) elements.taskDialog.showModal();
    window.setTimeout(() => elements.taskTitle.focus(), 30);
  }
  function closeTaskDialog() { if (elements.taskDialog.open) elements.taskDialog.close(); state.editingId = null; }
  function saveTaskFromForm(event) {
    event.preventDefault();
    const title = elements.taskTitle.value.trim();
    const description = elements.taskDescription.value.trim();
    const dueDate = elements.taskDueDate.value;
    const priority = elements.taskPriority.value;
    const categoryId = elements.taskCategory.value;
    if (!title) return showFormError("Add a task title before saving.");
    if (title.length > 120) return showFormError("Task titles must be 120 characters or fewer.");
    if (description.length > 600) return showFormError("Descriptions must be 600 characters or fewer.");
    if (!["low", "medium", "high"].includes(priority)) return showFormError("Choose a valid priority.");
    if (!state.categories.some(category => category.id === categoryId)) return showFormError("Choose a valid category.");
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return showFormError("Choose a valid due date.");
    if (dueDate && Number.isNaN(new Date(`${dueDate}T12:00:00`).getTime())) return showFormError("That due date is not valid.");
    if (state.editingId) {
      const task = state.tasks.find(item => item.id === state.editingId);
      if (!task) { closeTaskDialog(); showToast("This task no longer exists. Refresh and try again.", "error"); return; }
      Object.assign(task, { title, description, dueDate, priority, categoryId });
      persistTasks(); closeTaskDialog(); renderAll(); showToast("Task updated.");
    } else {
      state.tasks.push({ id: makeId(), title, description, dueDate, priority, categoryId, completed: false, createdAt: new Date().toISOString(), completedAt: null });
      persistTasks(); closeTaskDialog(); renderAll(); showToast("Task created.");
    }
  }
  function showFormError(message) { elements.formError.textContent = message; elements.formError.hidden = false; }
  function askConfirmation(title, message, buttonText, action) {
    elements.confirmTitle.textContent = title; elements.confirmMessage.textContent = message; elements.confirmProceed.textContent = buttonText; state.confirmAction = action;
    if (!elements.confirmDialog.open) elements.confirmDialog.showModal();
  }
  function closeConfirm() { if (elements.confirmDialog.open) elements.confirmDialog.close(); state.confirmAction = null; }
  function showToast(message, type = "success") {
    const toast = document.createElement("div"); toast.className = `toast${type === "error" ? " error" : ""}`;
    const mark = document.createElement("span"); mark.className = "toast-mark"; mark.textContent = type === "error" ? "!" : "✓";
    const text = document.createElement("span"); text.textContent = message; toast.append(mark, text); elements.toastRegion.append(toast);
    window.setTimeout(() => toast.remove(), 3400);
  }
  function clearSearch() { state.query = ""; elements.searchInput.value = ""; renderView(); }
  function addCategory() {
    const name = window.prompt("Name your new category (2–24 characters):");
    if (name === null) return;
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 24) return showToast("Category names must be 2–24 characters.", "error");
    if (state.categories.some(category => category.name.toLowerCase() === cleanName.toLowerCase())) return showToast("A category with that name already exists.", "error");
    const palette = ["#d7a45c", "#6b83df", "#45a88b", "#a17bdd", "#dc7e87", "#5ba7c8"];
    state.categories.push({ id: makeId(), name: cleanName, color: palette[state.categories.length % palette.length] });
    persistCategories(); renderAll(); showToast("Category added.");
  }
  function exportData() {
    const payload = { app: "TaskFlow", version: 1, exportedAt: new Date().toISOString(), tasks: state.tasks, categories: state.categories, preferences: state.preferences };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `taskflow-backup-${localDateKey()}.json`; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); showToast("Backup exported.");
  }
  async function importData(event) {
    const file = event.target.files && event.target.files[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || !validTasks(parsed.tasks) || !validCategories(parsed.categories)) throw new Error("The file does not contain valid TaskFlow tasks and categories.");
      const knownCategoryIds = new Set(parsed.categories.map(category => category.id));
      if (parsed.tasks.some(task => !knownCategoryIds.has(task.categoryId))) throw new Error("Every task must refer to a category included in the backup.");
      askConfirmation("Import this backup?", `This will replace ${state.tasks.length} current task(s) with ${parsed.tasks.length} imported task(s).`, "Import backup", () => {
        state.tasks = parsed.tasks; state.categories = parsed.categories.length ? parsed.categories : clone(DEFAULT_CATEGORIES);
        if (validPreferences(parsed.preferences)) state.preferences = { ...state.preferences, ...parsed.preferences };
        persistTasks(); persistCategories(); persistPreferences(); state.categoryId = null; state.query = ""; elements.searchInput.value = ""; renderAll(); showToast("Backup imported.");
      });
    } catch (error) { showToast(error.message || "Could not read this JSON file.", "error"); }
    finally { elements.importFile.value = ""; }
  }
  function toggleMobileNav() {
    const open = elements.sidebar.classList.toggle("is-open"); elements.sidebarScrim.hidden = !open; elements.menuToggle.setAttribute("aria-expanded", String(open));
  }
  function closeMobileNav() { elements.sidebar.classList.remove("is-open"); elements.sidebarScrim.hidden = true; elements.menuToggle.setAttribute("aria-expanded", "false"); }

  initialize();
})();