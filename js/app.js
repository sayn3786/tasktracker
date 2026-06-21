const STATUSES = [
  { id: "backlog", label: "Backlog" },
  { id: "in-progress", label: "In progress" },
  { id: "blocked", label: "Blocked due to dependency" },
  { id: "completed", label: "Completed" },
];

const PROJECT_STATUSES = {
  active: "Active",
  "in-progress": "In progress",
  completed: "Completed",
  paused: "Paused",
};

const VIEW_META = {
  grid: { title: "Tasks", taskPanel: false, taskActions: true, headerControls: true },
  board: { title: "Task board", taskPanel: false, taskActions: true, headerControls: true },
  charts: { title: "Insights", taskPanel: true, taskActions: true, headerControls: true },
  projects: { title: "List of Project", taskPanel: false, taskActions: false, headerControls: false },
  members: { title: "List of Team Members", taskPanel: false, taskActions: false, headerControls: false },
  "onboard-project": { title: "Onboard Project", taskPanel: false, taskActions: false, headerControls: false },
  "onboard-member": { title: "Onboard Member", taskPanel: false, taskActions: false, headerControls: false },
};

const STORAGE_KEY = "teamtask_state_v1";
const TASK_API = location.protocol === "file:" ? null : `${location.origin}/api/tasktracker/state`;

let state = loadState();
let activeViewName = "grid";

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll("[data-view-panel]"),
  pageTitle: document.querySelector(".page-title h2"),
  taskPanels: document.querySelectorAll("[data-task-panel]"),
  taskOnlyActions: document.querySelectorAll("[data-task-only]"),
  taskHeaderControls: document.querySelectorAll("[data-task-header-control]"),
  totalTasks: document.getElementById("totalTasks"),
  inProgressTasks: document.getElementById("inProgressTasks"),
  blockedTasks: document.getElementById("blockedTasks"),
  completedTasks: document.getElementById("completedTasks"),
  taskTableBody: document.getElementById("taskTableBody"),
  gridEmpty: document.getElementById("gridEmpty"),
  projectSelector: document.getElementById("projectSelector"),
  sideProjectName: document.getElementById("sideProjectName"),
  sideProjectMeta: document.getElementById("sideProjectMeta"),
  headerProjectMeta: document.getElementById("headerProjectMeta"),
  kanbanBoard: document.getElementById("kanbanBoard"),
  statusChart: document.getElementById("statusChart"),
  memberChart: document.getElementById("memberChart"),
  healthGrid: document.getElementById("healthGrid"),
  projectSearchInput: document.getElementById("projectSearchInput"),
  projectStatusFilter: document.getElementById("projectStatusFilter"),
  memberList: document.getElementById("memberList"),
  memberCount: document.getElementById("memberCount"),
  memberSearchInput: document.getElementById("memberSearchInput"),
  memberProjectFilter: document.getElementById("memberProjectFilter"),
  memberTaskFilter: document.getElementById("memberTaskFilter"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  assigneeFilter: document.getElementById("assigneeFilter"),
  labelFilter: document.getElementById("labelFilter"),
  taskDialog: document.getElementById("taskDialog"),
  taskForm: document.getElementById("taskForm"),
  taskDialogTitle: document.getElementById("taskDialogTitle"),
  taskId: document.getElementById("taskId"),
  taskSummary: document.getElementById("taskSummary"),
  taskProject: document.getElementById("taskProject"),
  taskStatus: document.getElementById("taskStatus"),
  taskAssigneeList: document.getElementById("taskAssigneeList"),
  taskPriority: document.getElementById("taskPriority"),
  taskDueDate: document.getElementById("taskDueDate"),
  taskLabels: document.getElementById("taskLabels"),
  taskLabelSuggestions: document.getElementById("taskLabelSuggestions"),
  taskDetails: document.getElementById("taskDetails"),
  taskAttachments: document.getElementById("taskAttachments"),
  attachmentPreview: document.getElementById("attachmentPreview"),
  taskActivityList: document.getElementById("taskActivityList"),
  deleteTaskBtn: document.getElementById("deleteTaskBtn"),
  projectForm: document.getElementById("projectForm"),
  projectName: document.getElementById("projectName"),
  projectCode: document.getElementById("projectCode"),
  projectStatus: document.getElementById("projectStatus"),
  projectStartDate: document.getElementById("projectStartDate"),
  projectEndDate: document.getElementById("projectEndDate"),
  projectDescription: document.getElementById("projectDescription"),
  projectLabels: document.getElementById("projectLabels"),
  projectList: document.getElementById("projectList"),
  projectCount: document.getElementById("projectCount"),
  memberForm: document.getElementById("memberForm"),
  memberName: document.getElementById("memberName"),
  memberRole: document.getElementById("memberRole"),
  memberEmail: document.getElementById("memberEmail"),
  memberProjectSelect: document.getElementById("memberProjectSelect"),
  addMemberProjectBtn: document.getElementById("addMemberProjectBtn"),
  memberProjectSelection: document.getElementById("memberProjectSelection"),
};

let pendingAttachments = [];
let pendingMemberProjectIds = [];

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch (_) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return normalizeState({
    selectedProjectId: "all",
    projects: [
      {
        id: id(),
        name: "Delivery Operations",
        code: "DO",
        status: "active",
        startDate: "",
        endDate: "",
        description: "Default workspace project for task delivery.",
        labels: ["Later", "Phase 1", "Dependency"],
        createdAt: nowIso(),
      },
    ],
    members: [
      { id: id(), name: "Santosh Yadav", role: "Project Owner", email: "santosh@example.com", createdAt: nowIso() },
      { id: id(), name: "Maya Singh", role: "QA Lead", email: "maya@example.com", createdAt: nowIso() },
    ],
    tasks: [],
    workspaceAudit: [],
  });
}

function normalizeState(data) {
  const fallbackProject = {
    id: "default-project",
    name: "Delivery Operations",
    code: "DO",
    status: "active",
    startDate: "",
    endDate: "",
    description: "Default workspace project for task delivery.",
    labels: ["Later", "Phase 1", "Dependency"],
    createdAt: nowIso(),
  };
  const projects = Array.isArray(data.projects) && data.projects.length
    ? data.projects.map((project) => ({
      ...project,
      status: project.status || "active",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      labels: parseLabels(project.labels || []),
    }))
    : [fallbackProject];
  const fallbackProjectId = projects[0].id;
  const normalized = {
    selectedProjectId: data.selectedProjectId || "all",
    projects,
    members: Array.isArray(data.members) ? data.members : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    workspaceAudit: Array.isArray(data.workspaceAudit) ? data.workspaceAudit : [],
  };

  if (normalized.selectedProjectId !== "all" && !normalized.projects.some((project) => project.id === normalized.selectedProjectId)) {
    normalized.selectedProjectId = "all";
  }

  normalized.members = normalized.members.map((member) => ({
    ...member,
    projectIds: Array.isArray(member.projectIds) ? member.projectIds : [fallbackProjectId],
  }));

  normalized.tasks = normalized.tasks.map((task) => ({
    ...task,
    projectId: task.projectId || fallbackProjectId,
    assigneeIds: Array.isArray(task.assigneeIds) ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : []),
    labels: parseLabels(task.labels || []),
    audit: Array.isArray(task.audit) ? task.audit : [],
  }));

  if (Array.isArray(data.audit) && data.audit.length) {
    data.audit.forEach((entry) => {
      const task = normalized.tasks.find((item) => item.id === entry.taskId);
      if (task) {
        task.audit.push(entry);
      } else {
        normalized.workspaceAudit.push(entry);
      }
    });
  }

  return normalized;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveStateToDatabase();
}

let saveTimer = null;

function saveStateToDatabase() {
  if (!TASK_API) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch(TASK_API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    }).catch(() => {});
  }, 250);
}

async function hydrateStateFromDatabase() {
  if (!TASK_API) return;
  try {
    const res = await fetch(TASK_API);
    if (!res.ok) return;
    const data = await res.json();
    if (data.state) {
      state = normalizeState(data.state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (_) {}
}

function id() {
  return window.crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function statusLabel(statusId) {
  return STATUSES.find((status) => status.id === statusId)?.label || statusId;
}

function currentProject() {
  if (state.selectedProjectId === "all") return null;
  return state.projects.find((project) => project.id === state.selectedProjectId) || null;
}

function projectName(projectId) {
  return state.projects.find((project) => project.id === projectId)?.name || "No project";
}

function projectCode(projectId) {
  return state.projects.find((project) => project.id === projectId)?.code || "TASK";
}

function memberName(memberId) {
  return state.members.find((member) => member.id === memberId)?.name || "Unassigned";
}

function taskAssigneeNames(task) {
  const names = (task.assigneeIds || []).map(memberName).filter((name) => name !== "Unassigned");
  return names.length ? names.join(", ") : "Unassigned";
}

function memberProjects(member) {
  return (member.projectIds || []).map(projectName).join(", ") || "No project assigned";
}

function memberAssignedTasks(member, projectId = null) {
  return activeTasks().filter((task) =>
    (task.assigneeIds || []).includes(member.id) && (!projectId || task.projectId === projectId)
  );
}

function renderMemberProjectStats(member) {
  const projectIds = member.projectIds || [];
  if (!projectIds.length) return '<div class="member-role">No project assigned</div>';
  return `<div class="member-project-stats">${projectIds.map((projectId) => {
    const count = memberAssignedTasks(member, projectId).length;
    return `<span class="stat-chip">${escapeHtml(projectName(projectId))}: ${count} tasks</span>`;
  }).join("")}</div>`;
}

function projectStatusLabel(status) {
  return PROJECT_STATUSES[status] || "Active";
}

function parseLabels(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((label) => String(label).trim()).filter(Boolean))];
  }
  return [...new Set(String(value || "").split(",").map((label) => label.trim()).filter(Boolean))];
}

function labelsText(labels = []) {
  return parseLabels(labels).join(", ");
}

function projectSuggestedLabels(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  const projectLabels = project?.labels || [];
  const taskLabels = state.tasks
    .filter((task) => !projectId || projectId === "all" || task.projectId === projectId)
    .flatMap((task) => task.labels || []);
  return [...new Set([...projectLabels, ...taskLabels])].sort((a, b) => a.localeCompare(b));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "No due date";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatProjectDateRange(project) {
  const start = project.startDate ? formatDate(project.startDate) : "No start";
  const end = project.endDate ? formatDate(project.endDate) : "No end";
  return `${start} - ${end}`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function activeTasks() {
  return state.tasks.filter((task) => !task.deletedAt);
}

function scopedTasks() {
  const tasks = activeTasks();
  if (state.selectedProjectId === "all") return tasks;
  return tasks.filter((task) => task.projectId === state.selectedProjectId);
}

function membersForProject(projectId) {
  if (!projectId || projectId === "all") return state.members;
  return state.members.filter((member) => (member.projectIds || []).includes(projectId));
}

function logAudit(action, taskId, detail = {}) {
  const task = state.tasks.find((item) => item.id === taskId);
  const entry = {
    id: id(),
    action,
    taskId,
    taskSummary: task?.summary || detail?.summary || "Task removed",
    detail: detail?.message || "",
    actor: "Current user",
    createdAt: nowIso(),
  };

  if (task) {
    task.audit = [entry, ...(task.audit || [])].slice(0, 120);
  } else {
    state.workspaceAudit = [entry, ...(state.workspaceAudit || [])].slice(0, 120);
  }
}

function updateOptions() {
  const selectedStatus = els.statusFilter.value || "all";
  const selectedAssignee = els.assigneeFilter.value || "all";
  const selectedLabel = els.labelFilter.value || "all";
  const selectedProject = state.selectedProjectId || "all";
  const taskProjectValue = els.taskProject.value || defaultTaskProjectId();
  const taskAssigneeValues = selectedTaskAssigneeIds();

  els.projectSelector.innerHTML = [
    '<option value="all">All projects</option>',
    ...state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`),
  ].join("");
  els.projectSelector.value = selectedProject;

  const selectedMemberProject = els.memberProjectFilter.value || "all";
  els.memberProjectFilter.innerHTML = [
    '<option value="all">All projects</option>',
    '<option value="">No project</option>',
    ...state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`),
  ].join("");
  els.memberProjectFilter.value = state.projects.some((project) => project.id === selectedMemberProject) || selectedMemberProject === "" ? selectedMemberProject : "all";

  els.taskProject.innerHTML = state.projects
    .map((project) => `<option value="${project.id}">${escapeHtml(project.name)} (${escapeHtml(project.code)})</option>`)
    .join("");
  els.taskProject.value = state.projects.some((project) => project.id === taskProjectValue) ? taskProjectValue : defaultTaskProjectId();

  const statusOptions = ['<option value="all">All statuses</option>']
    .concat(STATUSES.map((status) => `<option value="${status.id}">${status.label}</option>`));
  els.statusFilter.innerHTML = statusOptions.join("");
  els.statusFilter.value = statusOptions.some((option) => option.includes(`value="${selectedStatus}"`)) ? selectedStatus : "all";
  els.taskStatus.innerHTML = STATUSES.map((status) => `<option value="${status.id}">${status.label}</option>`).join("");

  const filterMembers = membersForProject(state.selectedProjectId);
  const filterMemberOptions = filterMembers.map((member) => `<option value="${member.id}">${escapeHtml(member.name)}</option>`);
  els.assigneeFilter.innerHTML = ['<option value="all">All assignees</option>', '<option value="">Unassigned</option>', ...filterMemberOptions].join("");
  els.assigneeFilter.value = filterMembers.some((member) => member.id === selectedAssignee) || selectedAssignee === "" ? selectedAssignee : "all";

  const labelOptions = projectSuggestedLabels(state.selectedProjectId);
  els.labelFilter.innerHTML = ['<option value="all">All labels</option>', ...labelOptions.map((label) => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`)].join("");
  els.labelFilter.value = labelOptions.includes(selectedLabel) ? selectedLabel : "all";
  els.taskLabelSuggestions.innerHTML = projectSuggestedLabels(els.taskProject.value || defaultTaskProjectId())
    .map((label) => `<option value="${escapeHtml(label)}"></option>`)
    .join("");

  updateTaskAssigneeOptions(taskAssigneeValues);
  renderMemberProjectPicker();
}

function defaultTaskProjectId() {
  return state.selectedProjectId !== "all" ? state.selectedProjectId : state.projects[0]?.id;
}

function selectedTaskAssigneeIds() {
  return Array.from(els.taskAssigneeList.querySelectorAll("input:checked")).map((input) => input.value);
}

function updateTaskAssigneeOptions(preferredValues = []) {
  const projectId = els.taskProject.value || defaultTaskProjectId();
  const preferred = Array.isArray(preferredValues) ? preferredValues : [preferredValues].filter(Boolean);
  const members = membersForProject(projectId);
  els.taskAssigneeList.innerHTML = members.map((member) => `
    <label class="check-option">
      <input type="checkbox" value="${member.id}" ${preferred.includes(member.id) ? "checked" : ""} />
      <span>${escapeHtml(member.name)}</span>
    </label>
  `).join("") || '<div class="empty-state">No members assigned to this project.</div>';
  els.taskLabelSuggestions.innerHTML = projectSuggestedLabels(projectId)
    .map((label) => `<option value="${escapeHtml(label)}"></option>`)
    .join("");
}

function renderMemberProjectPicker() {
  const availableProjects = state.projects.filter((project) => !pendingMemberProjectIds.includes(project.id));
  els.memberProjectSelect.innerHTML = availableProjects
    .map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`)
    .join("");
  els.memberProjectSelect.disabled = !availableProjects.length;
  els.addMemberProjectBtn.disabled = !availableProjects.length;

  els.memberProjectSelection.innerHTML = pendingMemberProjectIds.map((projectId) => `
    <span class="selected-chip">
      ${escapeHtml(projectName(projectId))}
      <button class="chip-remove" type="button" data-action="remove-member-project" data-id="${projectId}" aria-label="Remove project">x</button>
    </span>
  `).join("") || '<div class="empty-inline">No project assigned.</div>';
}

function filteredTasks() {
  const query = els.searchInput.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  const assignee = els.assigneeFilter.value;
  const label = els.labelFilter.value;

  return scopedTasks().filter((task) => {
    const searchable = `${task.summary} ${task.details} ${taskAssigneeNames(task)} ${projectName(task.projectId)} ${labelsText(task.labels)}`.toLowerCase();
    const matchesQuery = !query || searchable.includes(query);
    const matchesStatus = status === "all" || task.status === status;
    const assigneeIds = task.assigneeIds || [];
    const matchesAssignee = assignee === "all" || (assignee === "" ? !assigneeIds.length : assigneeIds.includes(assignee));
    const matchesLabel = label === "all" || (task.labels || []).includes(label);
    return matchesQuery && matchesStatus && matchesAssignee && matchesLabel;
  });
}

function renderSummary() {
  els.totalTasks.textContent = scopedTasks().length;
  els.inProgressTasks.textContent = countByStatus("in-progress");
  els.blockedTasks.textContent = countByStatus("blocked");
  els.completedTasks.textContent = countByStatus("completed");
}

function countByStatus(statusId) {
  return scopedTasks().filter((task) => task.status === statusId).length;
}

function renderGrid() {
  const tasks = filteredTasks();
  els.gridEmpty.classList.toggle("hidden", tasks.length > 0);
  els.taskTableBody.innerHTML = tasks.map((task) => `
    <tr class="task-row" data-open-task data-id="${task.id}">
      <td>
        <div class="task-title"><span class="task-key">${taskKey(task)}</span>${escapeHtml(task.summary)}</div>
        <div class="task-detail">${escapeHtml(task.details || "No details provided")}</div>
      </td>
      <td>${escapeHtml(projectName(task.projectId))}</td>
      <td><span class="pill ${task.status}">${statusLabel(task.status)}</span></td>
      <td>${escapeHtml(taskAssigneeNames(task))}</td>
      <td>${renderLabelChips(task.labels)}</td>
      <td><span class="priority-${task.priority.toLowerCase()}">${task.priority}</span></td>
      <td>${formatDate(task.dueDate)}</td>
      <td>${renderAttachmentChips(task.attachments)}</td>
    </tr>
  `).join("");
}

function renderAttachmentChips(attachments = []) {
  if (!attachments.length) return '<span class="chip">None</span>';
  return `<div class="attachment-chips">${attachments.map((file) => `<span class="chip">${escapeHtml(file.name)}</span>`).join("")}</div>`;
}

function renderBoard() {
  els.kanbanBoard.innerHTML = STATUSES.map((status) => {
    const tasks = scopedTasks().filter((task) => task.status === status.id);
    return `
      <section class="board-column" data-status="${status.id}">
        <div class="column-header">
          <h2>${status.label}</h2>
          <span class="column-count">${tasks.length}</span>
        </div>
        <div class="task-lane">
          ${tasks.map(renderTaskCard).join("") || '<div class="empty-state">Drop tasks here</div>'}
        </div>
      </section>
    `;
  }).join("");
}

function renderTaskCard(task) {
  return `
    <article class="task-card" draggable="true" data-open-task data-id="${task.id}" data-status="${task.status}">
      <div class="task-card-top">
        <div>
          <div class="task-key">${taskKey(task)}</div>
          <div class="card-summary">${escapeHtml(task.summary)}</div>
        </div>
      </div>
      <div class="card-meta">${escapeHtml(taskAssigneeNames(task))} - ${task.priority}</div>
      <p class="card-detail">${escapeHtml(task.details || "No details provided")}</p>
      ${renderLabelChips(task.labels)}
      ${renderAttachmentChips(task.attachments)}
    </article>
  `;
}

function renderLabelChips(labels = []) {
  const parsed = parseLabels(labels);
  if (!parsed.length) return '<span class="chip muted-chip">No label</span>';
  return `<div class="label-chips">${parsed.map((label) => `<span class="label-chip">${escapeHtml(label)}</span>`).join("")}</div>`;
}

function taskKey(task) {
  const projectTasks = state.tasks.filter((item) => item.projectId === task.projectId);
  const index = projectTasks.findIndex((item) => item.id === task.id);
  return `${projectCode(task.projectId)}-${String(index + 1).padStart(3, "0")}`;
}

function renderCharts() {
  const tasks = scopedTasks();
  const total = tasks.length || 1;
  document.getElementById("statusChartTotal").textContent = `${tasks.length} tasks`;
  els.statusChart.innerHTML = STATUSES.map((status) => {
    const count = countByStatus(status.id);
    return renderBarRow(status.label, count, Math.round((count / total) * 100));
  }).join("");

  const assignedTasks = tasks.filter((task) => (task.assigneeIds || []).length);
  document.getElementById("memberChartTotal").textContent = `${assignedTasks.length} assigned`;
  const chartMembers = membersForProject(state.selectedProjectId);
  els.memberChart.innerHTML = chartMembers.map((member) => {
    const count = tasks.filter((task) => (task.assigneeIds || []).includes(member.id)).length;
    const max = Math.max(...chartMembers.map((item) => tasks.filter((task) => (task.assigneeIds || []).includes(item.id)).length), 1);
    return renderBarRow(member.name, count, Math.round((count / max) * 100));
  }).join("") || '<div class="empty-state">No members onboarded yet.</div>';

  const open = tasks.filter((task) => task.status !== "completed").length;
  const overdue = tasks.filter((task) => task.dueDate && task.status !== "completed" && new Date(`${task.dueDate}T23:59:59`) < new Date()).length;
  els.healthGrid.innerHTML = [
    ["Open tasks", open],
    ["Completion rate", `${Math.round((countByStatus("completed") / total) * 100)}%`],
    ["Blocked rate", `${Math.round((countByStatus("blocked") / total) * 100)}%`],
    ["Overdue", overdue],
  ].map(([label, value]) => `
    <div class="health-metric">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderBarRow(label, count, percent) {
  return `
    <div class="bar-row">
      <div class="bar-label">${escapeHtml(label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width: ${Math.max(percent, count ? 4 : 0)}%"></div></div>
      <div class="bar-value">${count}</div>
    </div>
  `;
}

function renderMembers() {
  els.memberCount.textContent = `${state.members.length} ${state.members.length === 1 ? "person" : "people"}`;
  const rows = filteredMemberRows();
  els.memberList.innerHTML = rows.map(({ member, projectId, projectTaskCount }) => `
    <tr>
      <td><div class="member-name">${escapeHtml(member.name)}</div></td>
      <td>${escapeHtml(member.role)}</td>
      <td>${member.email ? escapeHtml(member.email) : "No email"}</td>
      <td>${projectId ? escapeHtml(projectName(projectId)) : "No project"}</td>
      <td>${memberAssignedTasks(member).length}</td>
      <td>${projectTaskCount}</td>
    </tr>
  `).join("") || '<tr><td colspan="6" class="empty">No members match these filters.</td></tr>';
}

function memberRows() {
  return state.members.flatMap((member) => {
    const projectIds = member.projectIds?.length ? member.projectIds : [""];
    return projectIds.map((projectId) => ({
      member,
      projectId,
      projectTaskCount: projectId ? memberAssignedTasks(member, projectId).length : 0,
    }));
  });
}

function filteredMemberRows() {
  const query = els.memberSearchInput.value.trim().toLowerCase();
  const projectFilter = els.memberProjectFilter.value;
  const taskFilter = els.memberTaskFilter.value;

  return memberRows().filter(({ member, projectId, projectTaskCount }) => {
    const searchable = `${member.name} ${member.role} ${member.email || ""} ${projectName(projectId)}`.toLowerCase();
    const matchesQuery = !query || searchable.includes(query);
    const matchesProject = projectFilter === "all" || projectId === projectFilter;
    const matchesTasks =
      taskFilter === "all" ||
      (taskFilter === "with-tasks" && projectTaskCount > 0) ||
      (taskFilter === "no-tasks" && projectTaskCount === 0);
    return matchesQuery && matchesProject && matchesTasks;
  });
}

function renderProjects() {
  els.projectCount.textContent = `${state.projects.length} ${state.projects.length === 1 ? "project" : "projects"}`;
  els.projectList.innerHTML = filteredProjects().map((project) => {
    const taskCount = activeTasks().filter((task) => task.projectId === project.id).length;
    const memberCount = membersForProject(project.id).length;
    return `
      <tr class="project-row ${state.selectedProjectId === project.id ? "active" : ""}" data-action="select-project" data-id="${project.id}">
        <td>
          <div class="member-name">${escapeHtml(project.name)}</div>
          <div class="member-role">${escapeHtml(project.code)}${project.description ? ` - ${escapeHtml(project.description)}` : ""}</div>
        </td>
        <td><span class="project-status ${project.status || "active"}">${projectStatusLabel(project.status)}</span></td>
        <td>${project.startDate ? formatDate(project.startDate) : "No start"}</td>
        <td>${project.endDate ? formatDate(project.endDate) : "No end"}</td>
        <td>${memberCount}</td>
        <td>${taskCount}</td>
        <td>${escapeHtml(labelsText(project.labels) || "None")}</td>
      </tr>
    `;
  }).join("") || '<tr><td colspan="7" class="empty">No projects match these filters.</td></tr>';
}

function filteredProjects() {
  const query = els.projectSearchInput.value.trim().toLowerCase();
  const status = els.projectStatusFilter.value;
  return state.projects.filter((project) => {
    const searchable = `${project.name} ${project.code} ${project.description || ""} ${labelsText(project.labels)}`.toLowerCase();
    const matchesQuery = !query || searchable.includes(query);
    const matchesStatus = status === "all" || (project.status || "active") === status;
    return matchesQuery && matchesStatus;
  });
}

function renderProjectContext() {
  const project = currentProject();
  if (!project) {
    els.sideProjectName.textContent = "All projects";
    els.sideProjectMeta.textContent = `${state.projects.length} projects in portfolio`;
    renderHeaderMeta();
    return;
  }

  const taskCount = activeTasks().filter((task) => task.projectId === project.id).length;
  const memberCount = membersForProject(project.id).length;
  els.sideProjectName.textContent = project.name;
  els.sideProjectMeta.textContent = `${project.code} - ${memberCount} members - ${taskCount} tasks`;
  renderHeaderMeta();
}

function renderHeaderMeta() {
  const project = currentProject();
  const taskMeta = project
    ? `${project.code} - ${formatProjectDateRange(project)}`
    : `${state.projects.length} projects`;
  const metaByView = {
    projects: `${state.projects.length} projects`,
    members: `${state.members.length} ${state.members.length === 1 ? "person" : "people"}`,
    "onboard-project": `${state.projects.length} projects`,
    "onboard-member": `${state.projects.length} projects`,
  };
  els.headerProjectMeta.textContent = metaByView[activeViewName] || taskMeta;
}

function renderTaskAudit(task) {
  if (!task) {
    els.taskActivityList.innerHTML = '<div class="empty-state">Activity starts after this task is created.</div>';
    return;
  }

  els.taskActivityList.innerHTML = (task.audit || []).map((entry) => `
    <div class="task-activity-item">
      <div class="audit-title">${escapeHtml(entry.action)}</div>
      <div class="audit-meta">${escapeHtml(entry.detail)} ${entry.detail ? "-" : ""} ${escapeHtml(entry.actor)} at ${formatDateTime(entry.createdAt)}</div>
    </div>
  `).join("") || '<div class="empty-state">No task activity yet.</div>';
}

function renderAll() {
  updateOptions();
  renderSummary();
  renderGrid();
  renderBoard();
  renderCharts();
  renderProjectContext();
  renderProjects();
  renderMembers();
  saveState();
}

function setActiveView(viewName) {
  activeViewName = viewName;
  const meta = VIEW_META[viewName] || VIEW_META.grid;
  els.tabs.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  els.views.forEach((view) => view.classList.toggle("active", view.dataset.viewPanel === viewName));
  els.pageTitle.textContent = meta.title;
  els.taskPanels.forEach((panel) => panel.classList.toggle("hidden", !meta.taskPanel));
  els.taskOnlyActions.forEach((action) => action.classList.toggle("hidden", !meta.taskActions));
  els.taskHeaderControls.forEach((control) => control.classList.toggle("hidden", !meta.headerControls));
  renderHeaderMeta();
}

function openTaskDialog(taskId = null) {
  const task = state.tasks.find((item) => item.id === taskId);
  pendingAttachments = task ? [...(task.attachments || [])] : [];
  els.taskDialogTitle.textContent = task ? "Task details" : "New task";
  els.taskId.value = task?.id || "";
  els.taskSummary.value = task?.summary || "";
  els.taskProject.value = task?.projectId || defaultTaskProjectId();
  els.taskStatus.value = task?.status || "backlog";
  els.taskPriority.value = task?.priority || "Medium";
  els.taskDueDate.value = task?.dueDate || "";
  els.taskLabels.value = labelsText(task?.labels || []);
  els.taskDetails.value = task?.details || "";
  els.taskAttachments.value = "";
  els.deleteTaskBtn.classList.toggle("hidden", !task);
  renderAttachmentPreview();
  renderTaskAudit(task);
  updateTaskAssigneeOptions(task?.assigneeIds || []);
  els.taskDialog.showModal();
}

function closeTaskDialog() {
  els.taskDialog.close();
}

function renderAttachmentPreview() {
  els.attachmentPreview.innerHTML = pendingAttachments.map((file, index) => `
    <span class="chip">${escapeHtml(file.name)} <button class="link-btn" type="button" data-action="remove-attachment" data-index="${index}">remove</button></span>
  `).join("");
}

function saveTask(event) {
  event.preventDefault();
  const existingId = els.taskId.value;
  const payload = {
    summary: els.taskSummary.value.trim(),
    projectId: els.taskProject.value,
    status: els.taskStatus.value,
    assigneeIds: selectedTaskAssigneeIds(),
    priority: els.taskPriority.value,
    dueDate: els.taskDueDate.value,
    labels: parseLabels(els.taskLabels.value),
    details: els.taskDetails.value.trim(),
    attachments: pendingAttachments,
    updatedAt: nowIso(),
  };

  if (existingId) {
    const index = state.tasks.findIndex((task) => task.id === existingId);
    const previous = state.tasks[index];
    state.tasks[index] = { ...previous, ...payload };
    logAudit("Updated task", existingId, { message: describeChanges(previous, state.tasks[index]) });
  } else {
    const task = { id: id(), ...payload, createdAt: nowIso() };
    state.tasks.unshift(task);
    logAudit("Added task", task.id, { message: `Created in ${statusLabel(task.status)}` });
  }

  closeTaskDialog();
  renderAll();
}

function describeChanges(before, after) {
  const changes = [];
  if (before.status !== after.status) changes.push(`status ${statusLabel(before.status)} to ${statusLabel(after.status)}`);
  if (before.projectId !== after.projectId) changes.push(`project ${projectName(before.projectId)} to ${projectName(after.projectId)}`);
  if ((before.assigneeIds || []).join("|") !== (after.assigneeIds || []).join("|")) {
    changes.push(`assigned members ${taskAssigneeNames(before)} to ${taskAssigneeNames(after)}`);
  }
  if (before.priority !== after.priority) changes.push(`priority ${before.priority} to ${after.priority}`);
  if (labelsText(before.labels) !== labelsText(after.labels)) changes.push("labels changed");
  if (before.summary !== after.summary) changes.push("summary changed");
  if (before.details !== after.details) changes.push("details changed");
  if ((before.attachments || []).length !== (after.attachments || []).length) changes.push("attachments changed");
  return changes.length ? changes.join(", ") : "Saved without field changes";
}

function deleteTask() {
  const taskId = els.taskId.value;
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.deletedAt = nowIso();
  task.updatedAt = nowIso();
  logAudit("Removed task", taskId, { summary: task.summary, message: "Task removed from active board" });
  closeTaskDialog();
  renderAll();
}

function changeTaskStatus(taskId, nextStatus) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || task.status === nextStatus) return;
  const previous = task.status;
  task.status = nextStatus;
  task.updatedAt = nowIso();
  logAudit("Changed status", task.id, { message: `${statusLabel(previous)} to ${statusLabel(nextStatus)}` });
  renderAll();
}

function addMember(event) {
  event.preventDefault();
  const member = {
    id: id(),
    name: els.memberName.value.trim(),
    role: els.memberRole.value.trim(),
    email: els.memberEmail.value.trim(),
    projectIds: [...pendingMemberProjectIds],
    createdAt: nowIso(),
  };
  state.members.push(member);
  state.workspaceAudit.unshift({
    id: id(),
    action: "Onboarded member",
    taskId: null,
    taskSummary: member.name,
    detail: member.role,
    actor: "Current user",
    createdAt: nowIso(),
  });
  els.memberForm.reset();
  pendingMemberProjectIds = [];
  renderAll();
}

function addProject(event) {
  event.preventDefault();
  const project = {
    id: id(),
    name: els.projectName.value.trim(),
    code: els.projectCode.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PRJ",
    status: els.projectStatus.value,
    startDate: els.projectStartDate.value,
    endDate: els.projectEndDate.value,
    description: els.projectDescription.value.trim(),
    labels: parseLabels(els.projectLabels.value),
    createdAt: nowIso(),
  };
  state.projects.push(project);
  state.selectedProjectId = project.id;
  state.workspaceAudit.unshift({
    id: id(),
    action: "Onboarded project",
    taskId: null,
    taskSummary: project.name,
    detail: project.code,
    actor: "Current user",
    createdAt: nowIso(),
  });
  els.projectForm.reset();
  renderAll();
}

function removeMember(memberId) {
  const member = state.members.find((item) => item.id === memberId);
  if (!member) return;
  state.members = state.members.filter((item) => item.id !== memberId);
  state.tasks.forEach((task) => {
    if ((task.assigneeIds || []).includes(memberId)) {
      task.assigneeIds = (task.assigneeIds || []).filter((idValue) => idValue !== memberId);
      task.updatedAt = nowIso();
      logAudit("Changed assignee", task.id, { message: `${member.name} removed from assigned members` });
    }
  });
  state.workspaceAudit.unshift({
    id: id(),
    action: "Removed member",
    taskId: null,
    taskSummary: member.name,
    detail: "Assigned tasks moved to Unassigned",
    actor: "Current user",
    createdAt: nowIso(),
  });
  renderAll();
}

function seedData() {
  if (state.tasks.length && !confirm("Replace current tasks and task audit history with sample data?")) return;
  const deliveryProject = {
    id: id(),
    name: "Delivery Operations",
    code: "DO",
    status: "in-progress",
    startDate: nextDate(-14),
    endDate: nextDate(45),
    description: "Internal delivery workflow and task operations.",
    labels: ["Phase 1", "Later", "Dependency", "Reporting"],
    createdAt: nowIso(),
  };
  const customerProject = {
    id: id(),
    name: "Customer Portal",
    code: "CP",
    status: "active",
    startDate: nextDate(3),
    endDate: nextDate(90),
    description: "Customer-facing portal launch workstream.",
    labels: ["MVP", "Post MVP", "Phase 2", "UX"],
    createdAt: nowIso(),
  };
  state.projects = [deliveryProject, customerProject];
  state.members = [
    { id: id(), name: "Santosh Yadav", role: "Project Owner", email: "santosh@example.com", projectIds: [deliveryProject.id, customerProject.id], createdAt: nowIso() },
    { id: id(), name: "Maya Singh", role: "QA Lead", email: "maya@example.com", projectIds: [deliveryProject.id], createdAt: nowIso() },
    { id: id(), name: "Aisha Khan", role: "Frontend Engineer", email: "aisha@example.com", projectIds: [customerProject.id], createdAt: nowIso() },
  ];
  const [owner, qa, frontend] = state.members;
  state.tasks = [
    {
      id: id(),
      summary: "Create sprint backlog import",
      details: "Allow CSV task import with summary, owner, priority, and due date columns.",
      projectId: deliveryProject.id,
      status: "backlog",
      assigneeIds: [owner?.id, qa?.id].filter(Boolean),
      priority: "High",
      dueDate: nextDate(5),
      labels: ["Phase 1"],
      attachments: [{ name: "backlog-template.csv", size: 18400 }],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: id(),
      summary: "Build drag and drop board",
      details: "Tasks should move from Backlog to In progress, Blocked, and Completed.",
      projectId: deliveryProject.id,
      status: "in-progress",
      assigneeIds: [owner?.id].filter(Boolean),
      priority: "Critical",
      dueDate: nextDate(2),
      labels: ["Phase 1", "Dependency"],
      attachments: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: id(),
      summary: "Confirm dependency with identity team",
      details: "Blocked until SSO group mapping is approved.",
      projectId: deliveryProject.id,
      status: "blocked",
      assigneeIds: [qa?.id].filter(Boolean),
      priority: "Medium",
      dueDate: nextDate(1),
      labels: ["Dependency", "Later"],
      attachments: [{ name: "dependency-note.pdf", size: 301200 }],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: id(),
      summary: "Build onboarding project selector",
      details: "Let project managers switch between projects and assign the right members.",
      projectId: customerProject.id,
      status: "completed",
      assigneeIds: [owner?.id, frontend?.id].filter(Boolean),
      priority: "Medium",
      dueDate: nextDate(-1),
      labels: ["MVP", "UX"],
      attachments: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];
  state.tasks.forEach((task) => {
    task.audit = [{
      id: id(),
      action: "Added task",
      taskId: task.id,
      taskSummary: task.summary,
      detail: `Sample task created in ${statusLabel(task.status)}`,
      actor: "Current user",
      createdAt: task.createdAt,
    }];
  });
  state.workspaceAudit.unshift({
    id: id(),
    action: "Loaded sample data",
    taskId: null,
    taskSummary: "Workspace",
    detail: "Sample tasks created",
    actor: "Current user",
    createdAt: nowIso(),
  });
  state.selectedProjectId = "all";
  renderAll();
}

function nextDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function wireEvents() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setActiveView(tab.dataset.view);
    });
  });

  document.getElementById("newTaskBtn").addEventListener("click", () => openTaskDialog());
  document.getElementById("seedDataBtn").addEventListener("click", seedData);
  document.getElementById("closeTaskDialog").addEventListener("click", closeTaskDialog);
  document.getElementById("cancelTaskBtn").addEventListener("click", closeTaskDialog);
  els.taskForm.addEventListener("submit", saveTask);
  els.deleteTaskBtn.addEventListener("click", deleteTask);
  els.projectForm.addEventListener("submit", addProject);
  els.memberForm.addEventListener("submit", addMember);
  els.addMemberProjectBtn.addEventListener("click", () => {
    const projectId = els.memberProjectSelect.value;
    if (projectId && !pendingMemberProjectIds.includes(projectId)) {
      pendingMemberProjectIds.push(projectId);
      renderMemberProjectPicker();
    }
  });
  els.projectSelector.addEventListener("change", () => {
    state.selectedProjectId = els.projectSelector.value;
    els.statusFilter.value = "all";
    els.assigneeFilter.value = "all";
    renderAll();
  });
  els.taskProject.addEventListener("change", () => updateTaskAssigneeOptions(selectedTaskAssigneeIds()));
  els.projectSearchInput.addEventListener("input", renderProjects);
  els.projectStatusFilter.addEventListener("change", renderProjects);
  els.searchInput.addEventListener("input", renderGrid);
  els.statusFilter.addEventListener("change", renderGrid);
  els.assigneeFilter.addEventListener("change", renderGrid);
  els.labelFilter.addEventListener("change", renderGrid);
  els.memberSearchInput.addEventListener("input", renderMembers);
  els.memberProjectFilter.addEventListener("change", renderMembers);
  els.memberTaskFilter.addEventListener("change", renderMembers);

  els.taskAttachments.addEventListener("change", () => {
    const files = Array.from(els.taskAttachments.files).map((file) => ({ name: file.name, size: file.size }));
    pendingAttachments = pendingAttachments.concat(files);
    renderAttachmentPreview();
  });

  document.body.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (target) {
      const action = target.dataset.action;
      if (action === "remove-member") removeMember(target.dataset.id);
      if (action === "select-project") {
        state.selectedProjectId = target.dataset.id;
        renderAll();
      }
      if (action === "remove-member-project") {
        pendingMemberProjectIds = pendingMemberProjectIds.filter((projectId) => projectId !== target.dataset.id);
        renderMemberProjectPicker();
      }
      if (action === "remove-attachment") {
        pendingAttachments.splice(Number(target.dataset.index), 1);
        renderAttachmentPreview();
      }
      return;
    }

    const openTarget = event.target.closest("[data-open-task]");
    if (openTarget) {
      openTaskDialog(openTarget.dataset.id);
      return;
    }
  });

  els.kanbanBoard.addEventListener("dragstart", (event) => {
    const card = event.target.closest(".task-card");
    if (card) event.dataTransfer.setData("text/plain", card.dataset.id);
  });

  els.kanbanBoard.addEventListener("dragover", (event) => {
    const column = event.target.closest(".board-column");
    if (!column) return;
    event.preventDefault();
    column.classList.add("drag-over");
  });

  els.kanbanBoard.addEventListener("dragleave", (event) => {
    const column = event.target.closest(".board-column");
    if (column) column.classList.remove("drag-over");
  });

  els.kanbanBoard.addEventListener("drop", (event) => {
    const column = event.target.closest(".board-column");
    if (!column) return;
    event.preventDefault();
    column.classList.remove("drag-over");
    changeTaskStatus(event.dataTransfer.getData("text/plain"), column.dataset.status);
  });
}

hydrateStateFromDatabase().finally(() => {
  wireEvents();
  setActiveView("grid");
  renderAll();
});
