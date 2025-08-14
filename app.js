// -------- Storage & Data --------
const STORAGE_KEY = "projects.v1";

const DEFAULT_PROJECTS = [
  {
    id: cryptoRandom(),
    title: "Portfolio Website",
    description:
      "A personal portfolio showcasing projects, resume, and contact form.",
    date: "2025-07-01",
    tags: ["web", "ui", "html", "css"]
  },
  {
    id: cryptoRandom(),
    title: "Task Manager App",
    description:
      "Simple to-do list with priorities, deadlines, and local storage.",
    date: "2025-06-15",
    tags: ["javascript", "productivity"]
  },
  {
    id: cryptoRandom(),
    title: "Blog Template",
    description:
      "Responsive blog layout with dark mode and search.",
    date: "2025-05-02",
    tags: ["template", "blog", "responsive"]
  }
];

function cryptoRandom() {
  // reasonably unique id
  return "p_" + (crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
}

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_PROJECTS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_PROJECTS];
    return parsed;
  } catch {
    return [...DEFAULT_PROJECTS];
  }
}

function saveProjects(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// -------- State --------
let projects = loadProjects();
let query = "";
let activeTag = null;
let sortBy = "new";

// -------- DOM --------
const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");
const addBtn = document.getElementById("addBtn");
const emptyAddBtn = document.getElementById("emptyAddBtn");
const sortSelect = document.getElementById("sortSelect");
const tagChips = document.getElementById("tagChips");

const modal = document.getElementById("projectModal");
const form = document.getElementById("projectForm");
const modalTitle = document.getElementById("modalTitle");
const titleEl = document.getElementById("title");
const descEl = document.getElementById("description");
const dateEl = document.getElementById("date");
const tagsEl = document.getElementById("tags");
const editIdEl = document.getElementById("editId");
const cancelBtn = document.getElementById("cancelBtn");
const closeModal = document.getElementById("closeModal");

const toast = document.getElementById("toast");

// -------- Rendering --------
function render() {
  // filter by query & tag
  let list = projects.filter(p => {
    const matchQuery =
      !query ||
      p.title.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      (p.tags || []).some(t => t.toLowerCase().includes(query));
    const matchTag = !activeTag || (p.tags || []).map(t=>t.toLowerCase()).includes(activeTag);
    return matchQuery && matchTag;
  });

  // sort
  list.sort((a, b) => {
    if (sortBy === "new") return (b.date || "").localeCompare(a.date || "");
    if (sortBy === "old") return (a.date || "").localeCompare(b.date || "");
    if (sortBy === "az") return a.title.localeCompare(b.title);
    if (sortBy === "za") return b.title.localeCompare(a.title);
    return 0;
  });

  // grid
  grid.innerHTML = "";
  list.forEach(p => grid.appendChild(projectCard(p)));

  // empty state
  empty.classList.toggle("hidden", list.length > 0);

  // tags (top chips)
  renderChips();
}

function projectCard(p) {
  const card = document.createElement("article");
  card.className = "card";

  const h = document.createElement("h3");
  h.textContent = p.title;

  const d = document.createElement("p");
  d.textContent = p.description;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = (p.date ? new Date(p.date).toDateString() : "No date") +
    (p.tags?.length ? ` • ${p.tags.join(", ")}` : "");

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const editBtn = button("Edit", () => openForEdit(p.id));
  const delBtn = button("Delete", () => removeProject(p.id), "danger");

  actions.append(editBtn, delBtn);
  card.append(h, d, meta, actions);
  return card;
}

function button(text, onClick, variant) {
  const b = document.createElement("button");
  b.className = "btn" + (variant ? ` ${variant}` : "");
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

function renderChips() {
  const tags = new Set();
  projects.forEach(p => (p.tags || []).forEach(t => tags.add(t.toLowerCase())));
  const all = ["all", ...Array.from(tags).sort()];
  tagChips.innerHTML = "";
  all.forEach(t => {
    const chip = document.createElement("span");
    chip.className = "chip" + ((activeTag === null && t==="all") || activeTag === t ? " active":"");
    chip.textContent = t;
    chip.addEventListener("click", () => {
      activeTag = (t === "all") ? null : t;
      render();
    });
    tagChips.appendChild(chip);
  });
}

// -------- Modal / Form --------
function openForCreate() {
  modalTitle.textContent = "Add Project";
  form.reset();
  editIdEl.value = "";
  modal.showModal();
  titleEl.focus();
}

function openForEdit(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  modalTitle.textContent = "Edit Project";
  titleEl.value = p.title;
  descEl.value = p.description;
  dateEl.value = p.date || "";
  tagsEl.value = (p.tags || []).join(", ");
  editIdEl.value = p.id;
  modal.showModal();
  titleEl.focus();
}

function closeModalSafely() {
  modal.close();
}

function removeProject(id) {
  if (!confirm("Delete this project?")) return;
  projects = projects.filter(p => p.id !== id);
  saveProjects(projects);
  toastMsg("Project deleted");
  render();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = titleEl.value.trim();
  const description = descEl.value.trim();
  const date = (dateEl.value || "").trim();
  const tags = tagsEl.value
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  if (!title || !description) {
    toastMsg("Title and description are required");
    return;
  }

  const editId = editIdEl.value;

  if (editId) {
    // update
    projects = projects.map(p =>
      p.id === editId ? { ...p, title, description, date, tags } : p
    );
    toastMsg("Project updated");
  } else {
    // create
    projects.unshift({
      id: cryptoRandom(),
      title,
      description,
      date: date || new Date().toISOString().slice(0,10),
      tags
    });
    toastMsg("Project added");
  }

  saveProjects(projects);
  render();
  closeModalSafely();
});

// -------- Search / Sort --------
searchInput.addEventListener("input", () => {
  query = searchInput.value.trim().toLowerCase();
  render();
});

clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  query = "";
  render();
  searchInput.focus();
});

sortSelect.addEventListener("change", () => {
  sortBy = sortSelect.value;
  render();
});

// -------- Buttons --------
addBtn.addEventListener("click", openForCreate);
emptyAddBtn.addEventListener("click", openForCreate);
cancelBtn.addEventListener("click", closeModalSafely);
closeModal.addEventListener("click", closeModalSafely);

// -------- Toast --------
let toastTimer = null;
function toastMsg(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toast.classList.remove("show"), 2000);
}

// -------- Init --------
render();