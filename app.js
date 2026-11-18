import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const authView = document.querySelector("#authView");
const appView = document.querySelector("#appView");
const authForm = document.querySelector("#authForm");
const authMessage = document.querySelector("#authMessage");
const authHeading = document.querySelector("#authHeading");
const authSubheading = document.querySelector("#authSubheading");
const authSubmit = document.querySelector("#authSubmit");
const toggleAuth = document.querySelector("#toggleAuth");
const authSwitchText = document.querySelector("#authSwitchText");
const toast = document.querySelector("#toast");
let isRegistering = false;
let currentUser = null;
let students = [];
let lastPrediction = null;
let toastTimer;

const configReady = Object.values(firebaseConfig).every(v => typeof v === "string" && v.length > 0 && !v.startsWith("PASTE_"));
let app, auth, db;
if (configReady) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}
function setMessage(el, message, isError = true) {
  el.textContent = message;
  el.style.color = isError ? "var(--orange)" : "var(--green)";
}
function friendlyError(error) {
  const messages = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/email-already-in-use": "This email already has an account. Please sign in.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "permission-denied": "Database permission denied. Check your Firestore rules.",
    "unavailable": "Service is unavailable. Check your internet connection."
  };
  return messages[error.code] || error.message || "Something went wrong. Please try again.";
}
function requireFirebase() {
  if (!configReady) {
    setMessage(authMessage, "First connect Firebase: follow README.md and fill js/firebase-config.js.");
    return false;
  }
  return true;
}

toggleAuth.addEventListener("click", () => {
  isRegistering = !isRegistering;
  authHeading.textContent = isRegistering ? "Create your account" : "Sign in to your account";
  authSubheading.textContent = isRegistering ? "Register to create your private workspace." : "Enter your account details to continue.";
  authSubmit.innerHTML = isRegistering ? "Create account <span>→</span>" : "Sign in <span>→</span>";
  authSwitchText.innerHTML = isRegistering ? 'Already registered? <button class="text-button" id="toggleAuth" type="button">Sign in</button>' : 'New here? <button class="text-button" id="toggleAuth" type="button">Create an account</button>';
  document.querySelector("#toggleAuth").addEventListener("click", () => toggleAuth.click());
  document.querySelector("#authPassword").autocomplete = isRegistering ? "new-password" : "current-password";
  setMessage(authMessage, "");
});
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireFirebase()) return;
  const email = document.querySelector("#authEmail").value.trim();
  const password = document.querySelector("#authPassword").value;
  authSubmit.disabled = true;
  authSubmit.textContent = isRegistering ? "Creating account…" : "Signing in…";
  try {
    if (isRegistering) await createUserWithEmailAndPassword(auth, email, password);
    else await signInWithEmailAndPassword(auth, email, password);
    authForm.reset();
    setMessage(authMessage, "");
  } catch (error) {
    setMessage(authMessage, friendlyError(error));
  } finally {
    authSubmit.disabled = false;
    authSubmit.innerHTML = isRegistering ? "Create account <span>→</span>" : "Sign in <span>→</span>";
  }
});

onAuthStateChangedIfConfigured();
function onAuthStateChangedIfConfigured() {
  if (!configReady) return;
  onAuthStateChanged(auth, async user => {
    currentUser = user;
    authView.classList.toggle("hidden", Boolean(user));
    appView.classList.toggle("hidden", !user);
    if (user) {
      document.querySelector("#userEmail").textContent = user.email || "Signed-in user";
      document.querySelector("#userAvatar").textContent = (user.email || "U").charAt(0).toUpperCase();
      await loadStudents();
    }
  });
}
document.querySelector("#logoutBtn").addEventListener("click", async () => {
  if (auth) await signOut(auth);
});
document.querySelector("#year").textContent = new Date().getFullYear();

function scoreFor(s) {
  return Math.round((Number(s.exam) * .40 + Number(s.attendance) * .20 + Number(s.test) * .25 + Number(s.assignment) * .15) * 10) / 10;
}
function categoryFor(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Average";
  return "Needs support";
}
function categoryClass(category) {
  if (category === "Excellent" || category === "Good") return "good";
  if (category === "Average") return "average";
  return "support";
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
async function loadStudents() {
  if (!currentUser || !db) return;
  try {
    const q = query(collection(db, "students"), where("ownerUid", "==", currentUser.uid));
    const snapshot = await getDocs(q);
    students = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    students.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    renderAll();
  } catch (error) {
    notify("Could not load records: " + friendlyError(error));
  }
}
function renderAll() {
  document.querySelector("#statStudents").textContent = students.length;
  const avg = students.length ? students.reduce((sum,s) => sum + scoreFor(s), 0) / students.length : null;
  const att = students.length ? students.reduce((sum,s) => sum + Number(s.attendance), 0) / students.length : null;
  document.querySelector("#statAverage").textContent = avg === null ? "—" : `${avg.toFixed(1)}%`;
  document.querySelector("#statAttendance").textContent = att === null ? "—" : `${att.toFixed(1)}%`;
  document.querySelector("#statSupport").textContent = students.filter(s => scoreFor(s) < 50).length;
  renderDistribution();
  renderRecent();
  renderStudents(document.querySelector("#searchStudents").value);
}
function renderDistribution() {
  const root = document.querySelector("#distribution");
  if (!students.length) {
    root.innerHTML = '<p class="muted">Add student records to see the distribution.</p>';
    return;
  }
  const categories = ["Excellent", "Good", "Average", "Needs support"];
  const counts = categories.map(c => students.filter(s => categoryFor(scoreFor(s)) === c).length);
  const colors = ["#54d6a0", "#7c9cff", "#ffb86b", "#ff7d91"];
  root.innerHTML = categories.map((c,i) => `<div class="dist-row"><span>${c}</span><div class="dist-track"><span style="width:${counts[i] / students.length * 100}%;background:${colors[i]}"></span></div><b class="dist-count">${counts[i]}</b></div>`).join("");
}
function studentCell(s) {
  const initials = escapeHTML((s.name || "?").split(/\s+/).slice(0,2).map(p => p[0]).join("").toUpperCase());
  return `<div class="student-cell"><span class="student-avatar">${initials}</span><span><b>${escapeHTML(s.name)}</b><small>${escapeHTML(s.course)}</small></span></div>`;
}
function renderRecent() {
  const root = document.querySelector("#recentRows");
  const latest = students.slice(0,5);
  root.innerHTML = latest.length ? latest.map(s => {
    const score = scoreFor(s), cat = categoryFor(score);
    return `<tr><td>${studentCell(s)}</td><td>${Number(s.attendance)}%</td><td class="score">${score}%</td><td><span class="category-chip ${categoryClass(cat)}">${cat}</span></td></tr>`;
  }).join("") : '<tr><td colspan="4" class="empty-cell">No records yet. Add your first student.</td></tr>';
}
function renderStudents(search = "") {
  const root = document.querySelector("#studentRows");
  const term = search.trim().toLowerCase();
  const filtered = students.filter(s => [s.name,s.roll,s.course].some(v => String(v || "").toLowerCase().includes(term)));
  document.querySelector("#studentCountLabel").textContent = `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;
  root.innerHTML = filtered.length ? filtered.map(s => {
    const score = scoreFor(s), cat = categoryFor(score);
    return `<tr><td>${studentCell(s)}</td><td>${escapeHTML(s.roll)}</td><td>${Number(s.attendance)}%</td><td class="score">${score}%</td><td><span class="category-chip ${categoryClass(cat)}">${cat}</span></td><td><button class="action-btn" data-edit="${s.id}">Edit</button><button class="action-btn delete" data-delete="${s.id}">Delete</button></td></tr>`;
  }).join("") : `<tr><td colspan="6" class="empty-cell">${term ? "No matching students found." : "No records yet. Add your first student."}</td></tr>`;
}
document.querySelector("#searchStudents").addEventListener("input", e => renderStudents(e.target.value));

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active-page", p.id === `page-${page}`));
  document.querySelectorAll(".nav-item[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  document.querySelector("#pageHeading").textContent = ({ overview:"Overview", students:"Students", prediction:"Prediction tool" })[page] || "Overview";
  document.querySelector("#sidebar").classList.remove("open");
}
document.querySelectorAll(".nav-item[data-page]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.go)));
document.querySelector("#mobileMenu").addEventListener("click", () => document.querySelector("#sidebar").classList.toggle("open"));

const dialog = document.querySelector("#studentDialog");
const studentForm = document.querySelector("#studentForm");
const studentFields = { name:"#sName", roll:"#sRoll", course:"#sCourse", exam:"#sExam", attendance:"#sAttendance", test:"#sTest", assignment:"#sAssignment" };
function getFormValues(prefix = "s") {
  const values = {};
  const names = ["name","roll","course","exam","attendance","test","assignment"];
  for (const name of names) {
    const el = document.querySelector(`#${prefix}${name[0].toUpperCase()}${name.slice(1)}`);
    if (!el) continue;
    values[name] = ["exam","attendance","test","assignment"].includes(name) ? Number(el.value) : el.value.trim();
  }
  return values;
}
function validateStudent(s) {
  if (!s.name || !s.roll || !s.course) return "Please fill in name, roll number, and course.";
  for (const field of ["exam","attendance","test","assignment"]) {
    if (!Number.isFinite(s[field]) || s[field] < 0 || s[field] > 100) return "All percentages must be between 0 and 100.";
  }
  if (students.some(old => old.roll.toLowerCase() === s.roll.toLowerCase() && old.id !== document.querySelector("#editId").value)) return "This roll number already exists in your records.";
  return "";
}
function openDialog(student = null) {
  studentForm.reset();
  document.querySelector("#editId").value = student?.id || "";
  document.querySelector("#dialogTitle").textContent = student ? "Edit student" : "Add student";
  document.querySelector("#studentMessage").textContent = "";
  const defaults = { name:"", roll:"", course:"BCA", exam:75, attendance:85, test:70, assignment:80, ...student };
  for (const [key, selector] of Object.entries(studentFields)) document.querySelector(selector).value = defaults[key] ?? "";
  dialog.showModal();
}
document.querySelector("#addStudentBtn").addEventListener("click", () => openDialog());
document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
document.querySelector("#cancelDialog").addEventListener("click", () => dialog.close());
document.querySelector("#studentRows").addEventListener("click", async e => {
  const editButton = e.target.closest("[data-edit]");
  const deleteButton = e.target.closest("[data-delete]");
  if (editButton) {
    const student = students.find(s => s.id === editButton.dataset.edit);
    if (student) openDialog(student);
  }
  if (deleteButton) {
    const student = students.find(s => s.id === deleteButton.dataset.delete);
    if (student && confirm(`Delete ${student.name}'s record? This cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, "students", student.id));
        notify("Student record deleted.");
        await loadStudents();
      } catch (error) { notify(friendlyError(error)); }
    }
  }
});
studentForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser || !db) return;
  const values = getFormValues("s");
  const error = validateStudent(values);
  if (error) { setMessage(document.querySelector("#studentMessage"), error); return; }
  const editId = document.querySelector("#editId").value;
  const payload = { ...values, ownerUid: currentUser.uid, updatedAt: serverTimestamp() };
  try {
    if (editId) await updateDoc(doc(db, "students", editId), payload);
    else await addDoc(collection(db, "students"), { ...payload, createdAt: serverTimestamp() });
    dialog.close();
    notify(editId ? "Student record updated." : "Student record saved to the cloud.");
    await loadStudents();
  } catch (error) {
    setMessage(document.querySelector("#studentMessage"), friendlyError(error));
  }
});

function readPredictionForm() {
  return {
    name: document.querySelector("#pName").value.trim(),
    roll: document.querySelector("#pRoll").value.trim(),
    course: document.querySelector("#pCourse").value.trim(),
    exam: Number(document.querySelector("#pExam").value),
    attendance: Number(document.querySelector("#pAttendance").value),
    test: Number(document.querySelector("#pTest").value),
    assignment: Number(document.querySelector("#pAssignment").value)
  };
}
function validPrediction(s) {
  if (!s.name || !s.roll || !s.course) return "Enter student name, roll number, and course.";
  if (["exam","attendance","test","assignment"].some(k => !Number.isFinite(s[k]) || s[k] < 0 || s[k] > 100)) return "Every percentage must be between 0 and 100.";
  return "";
}
function calculateAndShow() {
  const s = readPredictionForm();
  const error = validPrediction(s);
  if (error) { notify(error); return null; }
  const score = scoreFor(s), cat = categoryFor(score);
  lastPrediction = { ...s, score, category:cat };
  document.querySelector("#resultScore").innerHTML = `${score}<small>%</small>`;
  document.querySelector("#resultCategory").textContent = cat;
  document.querySelector("#resultCategory").className = `category-chip ${categoryClass(cat)}`;
  document.querySelector("#resultMeter").style.width = `${score}%`;
  document.querySelector("#resultMessage").textContent = score >= 70 ? "Current indicators look positive. Continue the habits that are working." : score >= 50 ? "Review the subject-wise results and identify areas where extra practice could help." : "Consider discussing learning support and a practical improvement plan with a teacher.";
  document.querySelector("#resultBreakdown").innerHTML = [
    ["Previous examination",s.exam,"40%"],["Attendance",s.attendance,"20%"],["Test marks",s.test,"25%"],["Assignments",s.assignment,"15%"]
  ].map(([label,value,weight]) => `<div class="breakdown-row"><span>${label} (${weight})</span><b>${value}%</b></div>`).join("");
  return lastPrediction;
}
document.querySelector("#calculateBtn").addEventListener("click", calculateAndShow);
document.querySelector("#predictionForm").addEventListener("submit", async e => {
  e.preventDefault();
  const prediction = calculateAndShow();
  if (!prediction) return;
  if (!currentUser || !db) { notify("Please sign in first."); return; }
  const error = validateStudent(prediction);
  if (error) { notify(error); return; }
  if (students.some(s => s.roll.toLowerCase() === prediction.roll.toLowerCase())) {
    notify("That roll number already exists. Use Students to edit the record.");
    return;
  }
  try {
    const { score, category, ...record } = prediction;
    await addDoc(collection(db, "students"), { ...record, ownerUid:currentUser.uid, createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
    notify(`Estimate calculated (${score}%) and student saved.`);
    await loadStudents();
  } catch (error) { notify(friendlyError(error)); }
});

if (!configReady) {
  setMessage(authMessage, "Firebase setup required: open README.md, create a Firebase project, and fill js/firebase-config.js.");
  authSubmit.disabled = true;
}
