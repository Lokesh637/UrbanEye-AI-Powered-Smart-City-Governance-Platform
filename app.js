/* =======================
   STATE & CONSTANTS
======================= */
let users = JSON.parse(localStorage.getItem("users") || "[]");
let complaints = JSON.parse(localStorage.getItem("complaints") || "[]");
let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
let userLocation = null;
let userAddress = "";
let categoryChart = null;
let statusChart = null;
let trendChart = null;
let currentModalIndex = null;
let currentUploadedImageBase64 = null;

const ADMIN_EMAILS = ["admin@gmail.com", "lokeshverma4112@gmail.com", "admin"];

let cityMap = null;
let mapMarkers = [];
let adminMap = null;
let adminMapMarkers = [];
let showOnlyCritical = false;
let nagariHistory = [];
const NAGARI_MAX_HISTORY = 20;

// Schema migration to initialize priority, department, and custom ID fields on existing records
function migrateComplaintsSchema() {
  let migrated = false;
  complaints = complaints.map((c, i) => {
    let updated = false;
    if (!c.id) {
      c.id = `UE-2026-${String(i + 1).padStart(3, "0")}`;
      updated = true;
    }
    if (!c.priority) {
      c.priority = "Medium";
      updated = true;
    }
    if (!c.department) {
      c.department = "General Administration";
      updated = true;
    }
    if (!c.address) {
      c.address = c.location || "Unknown Location";
      updated = true;
    }
    if (!c.desc) {
      c.desc = "No detailed description provided.";
      updated = true;
    }
    if (!c.aiCategory) {
      c.aiCategory = c.issue ? c.issue.replace(/ \(.+\)/, "") : "Other";
      updated = true;
    }
    if (!c.aiPriority) {
      c.aiPriority = c.priority || "Medium";
      updated = true;
    }
    if (!c.aiDepartment) {
      c.aiDepartment = c.department || "General Administration";
      updated = true;
    }
    if (updated) migrated = true;
    return c;
  });
  if (migrated) {
    localStorage.setItem("complaints", JSON.stringify(complaints));
  }
}
migrateComplaintsSchema();

/* =======================
   WEB AUDIO — SOUND FX
======================= */
const SoundFX = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function playTone(freq, duration, type = "sine", gain = 0.12) {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  }

  function playSweep(startFreq, endFreq, duration, type = "sine") {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ac.currentTime + duration);
    g.gain.setValueAtTime(0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  }

  return {
    click() {
      playSweep(880, 440, 0.1, "sine");
    },
    error() {
      playSweep(200, 100, 0.3, "sawtooth");
    },
    submit() {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((n, i) => {
        setTimeout(() => playTone(n, 0.15, "sine", 0.1), i * 120);
      });
    },
    loginSuccess() {
      const notes = [329.63, 392.0, 523.25, 659.25];
      notes.forEach((n, i) => {
        setTimeout(() => playTone(n, 0.18, "sine", 0.1), i * 140);
      });
    }
  };
})();

/* =======================
   STAR PARTICLE BACKGROUND
======================= */
class StarField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.stars = [];
    this.shootingStar = null;
    this.nextShoot = Infinity; // Disabled shooting stars
    this.resize();
    this.initStars();
    window.addEventListener("resize", () => this.resize());
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 220; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        r: Math.random() * 1.5 + 0.3, // small subtle particles only
        speed: Math.random() * 0.15 + 0.04, // slow movement
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.005
      });
    }
  }

  spawnShootingStar() {
    // Disabled shooting stars
  }

  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw nothing: stars are disabled in light theme
  }

  animate() {
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}

/* =======================
   3D CARD TILT
======================= */
function initCardTilt() {
  document.querySelectorAll("[data-tilt]").forEach(card => {
    card.addEventListener("mousemove", e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotateX = ((y - cy) / cy) * -12;
      const rotateY = ((x - cx) / cx) * 12;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      card.classList.add("tilt-hover");
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
      card.classList.remove("tilt-hover");
    });
  });
}

/* =======================
   LEAFLET CITY MAP
======================= */
function parseCoords(locationStr) {
  if (!locationStr) return null;
  const parts = locationStr.split(",").map(s => parseFloat(s.trim()));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]];
  }
  return null;
}

function markerClass(status) {
  const s = status.toLowerCase();
  if (s === "pending") return "marker-pending";
  if (s === "working") return "marker-working";
  return "marker-done";
}

function initCityMap() {
  const mapEl = document.getElementById("cityMap");
  if (!mapEl || typeof L === "undefined") return;

  if (cityMap) {
    cityMap.invalidateSize();
    refreshMapMarkers();
    return;
  }

  cityMap = L.map("cityMap", { zoomControl: true }).setView([28.6139, 77.209], 12);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(cityMap);

  refreshMapMarkers();
}

function refreshMapMarkers() {
  if (!cityMap || typeof L === "undefined") return;

  mapMarkers.forEach(m => cityMap.removeLayer(m));
  mapMarkers = [];

  const bounds = [];

  complaints.forEach((c, i) => {
    const coords = parseCoords(c.location);
    if (!coords) return;

    const cls = markerClass(c.status);
    const icon = L.divIcon({
      className: "custom-marker",
      html: `<div class="marker-glow ${cls}"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    const marker = L.marker(coords, { icon }).addTo(cityMap);
    const cleanLoc = (c.address || c.location).replace(/📍/g, '').trim();
    const dateVal = c.time ? c.time.split(',')[0].trim() : "—";
    const priorityVal = c.priority || "Medium";
    const deptVal = c.department || "General Administration";
    
    // Priority color mapping for map popup
    let priorityBadgeColor = "#3b82f6"; // blue
    if (priorityVal === "Low") priorityBadgeColor = "#10b981"; // green
    if (priorityVal === "High") priorityBadgeColor = "#f59e0b"; // gold
    if (priorityVal === "Critical") priorityBadgeColor = "#ef4444"; // red

    const popupImage = c.image ? `
      <div style="margin-top: 6px; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; width: 100%; height: 60px; background: #fafafa;">
        <img src="${c.image}" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
    ` : `<div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; font-style: italic;">No image attached</div>`;

    marker.bindPopup(`
      <div class="map-popup" style="font-size: 12px; line-height: 1.5; color: var(--text-main); min-width: 200px;">
        <strong style="color: var(--gold); font-size: 13px; display: block; margin-bottom: 6px;">${c.id || 'UE-2026-000'}</strong>
        <strong>Category:</strong> ${c.issue}<br>
        <strong>Location:</strong> ${cleanLoc}<br>
        <strong>Priority:</strong> <span style="font-size: 10px; padding: 2px 6px; border-radius: 3px; display: inline-block; font-weight: 700; color: white; background: ${priorityBadgeColor};">${priorityVal}</span><br>
        <strong>Department:</strong> ${deptVal}<br>
        <strong>Status:</strong> <span class="status status-${c.status.toLowerCase()}" style="font-size: 10px; padding: 1px 4px; border-radius: 3px; display: inline-block; margin: 2px 0;">${c.status === "Done" ? "Resolved" : c.status}</span><br>
        <strong>Date:</strong> ${dateVal}<br>
        <strong>Evidence:</strong> ${popupImage}<br>
        <button type="button" class="btn-primary-small" onclick="viewComplaint(${i})" style="margin-top: 8px; width: 100%; height: 26px;">👁 Inspect Details</button>
      </div>
    `);
    mapMarkers.push(marker);
    bounds.push(coords);
  });

  if (bounds.length > 0) {
    cityMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }
}

/* =======================
   NAGARI CHATBOT
======================= */
function getComplaintStats() {
  let pending = 0, working = 0, done = 0;
  complaints.forEach(c => {
    if (c.status === "Pending") pending++;
    else if (c.status === "Working") working++;
    else done++;
  });
  return { total: complaints.length, pending, working, done };
}

function getNagariComplaintsSummary() {
  return complaints.map(c => ({
    id: c.id,
    category: c.issue,
    location: c.address || c.location,
    status: c.status,
    priority: c.priority || "Medium",
    department: c.department || "General Administration",
    time: c.time
  }));
}

function buildNagariSystemPrompt() {
  const stats = getComplaintStats();
  const userName = currentUser ? currentUser.name : "Guest";
  const role = currentUser && ADMIN_EMAILS.includes(currentUser.email) ? "Administrator" : "Citizen";
  
  // Calculate top issues and hotspots for prompt context
  const categories = {};
  const locations = {};
  complaints.forEach(c => {
    categories[c.issue] = (categories[c.issue] || 0) + 1;
    const locName = (c.address || c.location).split(',')[0].replace(/📍/g, '').trim();
    locations[locName] = (locations[locName] || 0) + 1;
  });
  
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
  const topLocation = Object.entries(locations).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
  const summaryData = getNagariComplaintsSummary();
  
  return `You are NAGARI, the official Smart City Intelligence Assistant for the UrbanEye Governance Platform.
You help citizens and administrators analyze complaints, monitor city issues, identify hotspots, and provide official governance insights based on live UrbanEye data.
Current user: ${userName} (${role}).
Live complaint database stats:
- Total complaints: ${stats.total}
- Pending: ${stats.pending}
- Working (in progress): ${stats.working}
- Done (resolved): ${stats.done}
- Most reported issue type: ${topCategory}
- Area with highest complaints: ${topLocation}

Here is the detailed list of actual active complaints in JSON format:
${JSON.stringify(summaryData)}

Be concise, friendly, and highly professional. Present your answers with official administrative weight.
When providing recommendations or analysis reports for administrators, explicitly format your response with headings like:
- "NAGARI Analysis"
- "NAGARI Recommendation"
- "NAGARI Intelligence Report"
where appropriate to reflect your smart city branding. Use the JSON data above to answer specific user queries like:
- "Which area has the highest complaints?"
- "What is the most reported issue?"
- "Show hotspots."
Reference real stats, IDs, and categories from this JSON database. Do not invent fake complaints.`;
}

function initNAGARI() {
  const widget = document.getElementById("nagariWidget");
  const panel = document.getElementById("nagariPanel");
  const toggle = document.getElementById("nagariToggle");
  const closeBtn = document.getElementById("nagariCloseBtn");
  const sendBtn = document.getElementById("nagariSendBtn");
  const input = document.getElementById("nagariInput");
  const apiKeyInput = document.getElementById("nagariApiKey");
  const messagesEl = document.getElementById("nagariMessages");
  const typingEl = document.getElementById("nagariTyping");

  if (!widget) return;

  const savedKey = sessionStorage.getItem("nagariApiKey");
  if (savedKey) apiKeyInput.value = savedKey;

  apiKeyInput.addEventListener("change", () => {
    sessionStorage.setItem("nagariApiKey", apiKeyInput.value.trim());
  });

  toggle.addEventListener("click", () => {
    panel.classList.toggle("hidden");
  });

  closeBtn.addEventListener("click", () => {
    panel.classList.add("hidden");
  });

  function appendMessage(text, role) {
    const div = document.createElement("div");
    div.className = `nagari-msg nagari-msg-${role === "user" ? "user" : "bot"}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function sendNagariMessage() {
    const text = input.value.trim();
    if (!text) return;

    const apiKey = apiKeyInput.value.trim() || sessionStorage.getItem("nagariApiKey");
    if (!apiKey) {
      showToast("Enter your Anthropic API key in NAGARI panel", "error");
      return;
    }

    sessionStorage.setItem("nagariApiKey", apiKey);
    input.value = "";
    appendMessage(text, "user");

    nagariHistory.push({ role: "user", content: text });
    if (nagariHistory.length > NAGARI_MAX_HISTORY) {
      nagariHistory = nagariHistory.slice(-NAGARI_MAX_HISTORY);
    }

    typingEl.classList.remove("hidden");
    sendBtn.disabled = true;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildNagariSystemPrompt(),
          messages: nagariHistory
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${res.status}`);
      }

      const data = await res.json();
      const reply = data.content?.[0]?.text || "No response received.";
      appendMessage(reply, "assistant");
      nagariHistory.push({ role: "assistant", content: reply });
      if (nagariHistory.length > NAGARI_MAX_HISTORY) {
        nagariHistory = nagariHistory.slice(-NAGARI_MAX_HISTORY);
      }
    } catch (err) {
      SoundFX.error();
      appendMessage(`Error: ${err.message}`, "assistant");
    } finally {
      typingEl.classList.add("hidden");
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener("click", sendNagariMessage);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      SoundFX.click();
      sendNagariMessage();
    }
  });

  appendMessage("Namaste! I am NAGARI, your Smart City Intelligence Assistant.\n\nI can help you analyze complaints, monitor city issues, identify hotspots, and provide governance insights based on UrbanEye data.", "assistant");
}

function showNAGARI() {
  const widget = document.getElementById("nagariWidget");
  if (widget) widget.classList.remove("hidden");
}

function hideNAGARI() {
  const widget = document.getElementById("nagariWidget");
  if (widget) widget.classList.add("hidden");
}

/* =======================
   INIT
======================= */
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("starCanvas");
  if (canvas) new StarField(canvas);

  initCardTilt();
  initNAGARI();

  document.body.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (btn && !btn.classList.contains("link-btn")) {
      SoundFX.click();
    }
  }, true);

  // Dynamic dropdown class toggle for placeholder styling
  const issueSelect = document.getElementById("issueType");
  if (issueSelect) {
    issueSelect.addEventListener("change", () => {
      if (issueSelect.value === "") {
        issueSelect.classList.add("placeholder-selected");
      } else {
        issueSelect.classList.remove("placeholder-selected");
      }
    });
    // Set initial state
    if (issueSelect.value === "") {
      issueSelect.classList.add("placeholder-selected");
    } else {
      issueSelect.classList.remove("placeholder-selected");
    }
  }

  // Dynamic description event listener for AI analysis
  const descTextarea = document.getElementById("desc");
  if (descTextarea) {
    descTextarea.addEventListener("input", () => {
      const text = descTextarea.value;
      const aiPanel = document.getElementById("aiAnalysisPanel");
      if (text.trim().length > 5) {
        const analysis = analyzeDescription(text);
        if (aiPanel) {
          aiPanel.classList.remove("hidden");
          document.getElementById("aiCategory").innerText = analysis.category;
          document.getElementById("aiPriority").innerText = analysis.priority;
          document.getElementById("aiDepartment").innerText = analysis.department;
        }
        
        // Auto select dropdown if user hasn't selected anything yet
        if (issueSelect && (issueSelect.value === "" || issueSelect.value === "Select Incident Category")) {
          issueSelect.value = analysis.dropdownCategory;
          issueSelect.classList.remove("placeholder-selected");
        }
      } else {
        if (aiPanel) aiPanel.classList.add("hidden");
      }
    });
  }

  if (currentUser) {
    if (currentUser.email === "lokeshverma4112@gmail.com" || currentUser.email === "admin" || currentUser.role === "admin") {
      currentUser.role = "admin";
    } else {
      currentUser.role = "citizen";
    }
    localStorage.setItem("currentUser", JSON.stringify(currentUser));

    if (window.location.pathname.includes("admin.html") && currentUser.role !== "admin") {
      window.location.href = "index.html";
      return;
    }

    hideAllAuth();
    document.getElementById("dashboard").classList.remove("hidden");
    setupUserUI();
    refreshTables();
    showNAGARI();
  } else {
    if (window.location.pathname.includes("admin.html")) {
      window.location.href = "index.html";
      return;
    }
    generateCaptcha("captchaText");
    generateCaptcha("captchaText2");
    hideNAGARI();
  }
});

/* =======================
   TOAST SYSTEM
======================= */
function showToast(msg, type = "success") {
  if (type === "error") SoundFX.error();

  const toast = document.createElement("div");
  toast.innerText = msg;
  toast.className = `toast toast-${type}`;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "40px",
    right: "40px",
    padding: "12px 20px",
    borderRadius: "6px",
    color: "white",
    fontSize: "13px",
    fontWeight: "600",
    zIndex: "10000",
    border: `1px solid ${type === "error" ? "var(--danger)" : "var(--border)"}`,
    animation: "slideUp 0.4s ease",
    background: type === "error"
      ? "var(--danger)"
      : "var(--primary)"
  });

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(16px)";
    toast.style.transition = "all 0.35s ease";
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/* =======================
   NAVIGATION
======================= */
function hideAllAuth() {
  ["choosePage", "loginPage", "signupPage"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
}

function openLogin() {
  hideAllAuth();
  document.getElementById("loginPage").classList.remove("hidden");
  generateCaptcha("captchaText");
}

function openSignup() {
  hideAllAuth();
  document.getElementById("signupPage").classList.remove("hidden");
  generateCaptcha("captchaText2");
}

function goBack() {
  hideAllAuth();
  document.getElementById("choosePage").classList.remove("hidden");
}

/* =======================
   CAPTCHA
======================= */
function generateCaptcha(id) {
  const chars = "ABCDEFG123456789";
  let text = "";
  for (let i = 0; i < 5; i++) {
    text += chars[Math.floor(Math.random() * chars.length)];
  }
  document.getElementById(id).innerText = text;
}

/* =======================
   VALIDATION
======================= */
function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validMobile(mobile) {
  return /^[6-9]\d{9}$/.test(mobile);
}

/* =======================
   SIGNUP
======================= */
function signup() {
  const first = firstName.value.trim();
  const last = lastName.value.trim();
  const mobileVal = mobile.value.trim();
  const email = signupEmail.value.trim();
  const pass = signupPassword.value.trim();
  const captcha = captchaInput2.value.trim();
  const real = captchaText2.innerText;

  if (!first || !last || !mobileVal || !email || !pass) {
    showToast("Fill all fields!", "error");
    return;
  }

  if (!validEmail(email)) {
    showToast("Invalid email format", "error");
    return;
  }

  if (!validMobile(mobileVal)) {
    showToast("Enter valid 10-digit mobile number", "error");
    return;
  }

  if (pass.length < 6) {
    showToast("Password must be at least 6 characters", "error");
    return;
  }

  if (captcha !== real) {
    showToast("Captcha incorrect", "error");
    generateCaptcha("captchaText2");
    return;
  }

  if (users.find(u => u.email === email)) {
    showToast("User already exists", "error");
    return;
  }

  users.push({
    name: `${first} ${last}`,
    email,
    mobile: mobileVal,
    pass
  });

  localStorage.setItem("users", JSON.stringify(users));
  showToast("Account created! Please Sign In.");
  openLogin();
}

/* =======================
   LOGIN
======================= */
function login() {
  const email = loginEmail.value.trim();
  const pass = loginPassword.value.trim();
  const captcha = captchaInput.value.trim();
  const real = captchaText.innerText;

  if (!email || !pass) {
    showToast("Enter email and password", "error");
    return;
  }

  if (captcha !== real) {
    showToast("Captcha incorrect", "error");
    generateCaptcha("captchaText");
    return;
  }

  let user = users.find(u => u.email === email && u.pass === pass);
  if (!user && (email === "admin" || email === "admin@gmail.com") && pass === "admin123") {
    user = {
      name: "System Administrator",
      email: "admin",
      role: "admin",
      pass: "admin123"
    };
  }

  if (!user) {
    showToast("Invalid credentials", "error");
    return;
  }

  // Email-based admin access control assignment
  if (user.email === "lokeshverma4112@gmail.com" || user.email === "admin") {
    user.role = "admin";
  } else {
    user.role = "citizen";
  }

  currentUser = user;
  localStorage.setItem("currentUser", JSON.stringify(user));

  hideAllAuth();
  document.getElementById("dashboard").classList.remove("hidden");

  setupUserUI();
  refreshTables();
  showNAGARI();
  SoundFX.loginSuccess();
  showToast("Login successful!");
}

/* =======================
   USER UI SETUP (ROLE BASED)
   ======================= */
function setupUserUI() {
  const isAdmin = ADMIN_EMAILS.includes(currentUser.email) || currentUser.role === "admin" || currentUser.email === "admin";

  const topbarTitle = document.querySelector(".topbar-left-brand .topbar-title-wrapper h2");
  const topbarSubtitle = document.querySelector(".topbar-left-brand .topbar-title-wrapper .topbar-subtitle");

  if (isAdmin) {
    if (topbarTitle) topbarTitle.innerHTML = `UrbanEye Administration Console`;
    if (topbarSubtitle) topbarSubtitle.innerHTML = `Smart City Governance & Monitoring Center`;
    userLabel.innerHTML = `${currentUser.name} <span class="admin-badge" style="background: rgba(220,53,69,0.1); color: var(--danger); border: 1px solid rgba(220,53,69,0.2); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 6px;">ADMIN</span>`;
  } else {
    if (topbarTitle) topbarTitle.innerHTML = `UrbanEye<span>.</span>`;
    if (topbarSubtitle) topbarSubtitle.innerHTML = `Ministry of Urban Development & Smart Infrastructure`;
    userLabel.innerHTML = `${currentUser.name} <span class="user-badge-tag" style="background: rgba(25,135,84,0.1); color: var(--success); border: 1px solid rgba(25,135,84,0.2); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 6px;">CITIZEN</span>`;
  }

  document.querySelectorAll(".card").forEach(card => {
    card.style.display = "none";
    card.classList.remove("active");
  });

  document.querySelectorAll(".section").forEach(sec => {
    sec.classList.add("hidden");
  });

  if (isAdmin) {
    document.querySelectorAll(".admin-only, #card-map").forEach(card => {
      card.style.display = "block";
    });
    document.getElementById("admin").classList.remove("hidden");
    document.getElementById("card-admin")?.classList.add("active");
    setTimeout(() => {
      initAdminMap();
    }, 100);
  } else {
    document.querySelectorAll(".card:not(.admin-only)").forEach(card => {
      card.style.display = "block";
    });
    document.getElementById("report").classList.remove("hidden");
    document.getElementById("card-report")?.classList.add("active");
  }
}

/* =======================
   LOGOUT
======================= */
function logout() {
  localStorage.removeItem("currentUser");
  location.reload();
}

/* =======================
   SECTIONS (SECURE)
======================= */
function showSection(id) {
  const isAdmin = ADMIN_EMAILS.includes(currentUser.email);

  if (!isAdmin && (id === "admin" || id === "analytics")) {
    showToast("Access Restricted: Level 2 Clearance Required", "error");
    return;
  }

  document.querySelectorAll(".section").forEach(s => {
    s.classList.add("hidden");
  });

  document.querySelectorAll(".card").forEach(c => {
    c.classList.remove("active");
    c.style.borderColor = "";
    c.style.transform = "";
  });

  const target = document.getElementById(id);
  target.classList.remove("hidden");

  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.classList.add("active");
    card.style.borderColor = "var(--gold)";
  }

  if (id === "map") {
    setTimeout(() => {
      initCityMap();
      if (cityMap) cityMap.invalidateSize();
    }, 100);
  }

  window.scrollTo({ top: target.offsetTop - 100, behavior: "smooth" });
}

/* =======================
   REVERSE GEOCODING
======================= */
async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
      headers: {
        "Accept-Language": "en"
      }
    });
    if (!response.ok) throw new Error("Reverse geocoding request failed");
    const data = await response.json();
    if (!data || !data.address) throw new Error("No address data found");

    const addr = data.address;
    const components = [];

    // Filter out placeholders, empty values, and nulls
    function addUniqueComponent(val) {
      if (!val) return;
      const clean = val.trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      if (
        lower === "unknown locality" ||
        lower === "unknown" ||
        lower === "undefined" ||
        lower === "null" ||
        lower === "empty"
      ) {
        return;
      }
      if (!components.includes(clean)) {
        components.push(clean);
      }
    }

    // Add components in priority order
    addUniqueComponent(addr.suburb);
    addUniqueComponent(addr.neighbourhood);
    addUniqueComponent(addr.village);
    addUniqueComponent(addr.town);
    addUniqueComponent(addr.city || addr.city_district);
    addUniqueComponent(addr.district || addr.county);
    addUniqueComponent(addr.state);

    if (components.length === 0) {
      return null;
    }

    return {
      address: components.join(", ")
    };
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}

/* =======================
   LOCATION
======================= */
function getLocation() {
  if (!navigator.geolocation) {
    locText.innerHTML = `<span class="location-status-badge status-badge-red">LOCATION NOT DETECTED</span>`;
    showToast("Geolocation not supported", "error");
    return;
  }

  // Set pending state
  locText.innerHTML = `<span class="location-status-badge status-badge-gold">RESOLVING ADDRESS...</span>`;

  navigator.geolocation.getCurrentPosition(
    async pos => {
      const lat = pos.coords.latitude.toFixed(4);
      const lon = pos.coords.longitude.toFixed(4);
      userLocation = lat + ", " + lon;

      const addressData = await reverseGeocode(lat, lon);
      
      if (addressData && addressData.address) {
        userAddress = addressData.address;
        locText.innerHTML = `
          <div class="location-status-badge status-badge-green block-layout" style="padding: 16px; border-radius: 8px;">
            <div style="font-weight: 700; font-size: 12px; color: var(--success); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">📍 LOCATION ACQUIRED</div>
            <div style="font-size: 18px; font-weight: 700; color: #0d3b66; line-height: 1.4; margin-bottom: 6px;">${addressData.address}</div>
            <div style="font-size: 13px; color: #64748b; font-weight: 500;">Coordinates: (${userLocation})</div>
          </div>`;
      } else {
        // Graceful fallback
        userAddress = "Coordinates: " + userLocation;
        locText.innerHTML = `
          <div class="location-status-badge status-badge-green block-layout" style="padding: 16px; border-radius: 8px;">
            <div style="font-weight: 700; font-size: 12px; color: var(--success); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">📍 COORDINATES AVAILABLE</div>
            <div style="font-size: 18px; font-weight: 700; color: #0d3b66; line-height: 1.4; margin-bottom: 6px;">Raw Location Data</div>
            <div style="font-size: 13px; color: #64748b; font-weight: 500;">Coordinates: (${userLocation})</div>
          </div>`;
      }
      showToast("Location detected");
    },
    () => {
      locText.innerHTML = `<span class="location-status-badge status-badge-red">LOCATION NOT DETECTED</span>`;
      showToast("Location permission denied", "error");
    }
  );
}

/* =======================
   COMPLAINT
======================= */
function submitComplaint() {
  const issue = issueType.value;
  const descText = desc.value.trim();

  if (!issue || issue === "") {
    showToast("Please select an incident category.", "error");
    return;
  }

  if (!descText || !userLocation) {
    showToast("Fill description & get location", "error");
    return;
  }

  const analysis = analyzeDescription(descText);
  const formattedTime = formatCurrentDateTime();
  const newId = `UE-2026-${String(complaints.length + 1).padStart(3, "0")}`;

  complaints.push({
    id: newId,
    user: currentUser.name,
    email: currentUser.email,
    issue,
    location: userLocation,
    address: userAddress || "Unknown Location",
    status: "Pending",
    time: formattedTime,
    priority: analysis.priority,
    department: analysis.department,
    desc: descText,
    image: currentUploadedImageBase64 || null,
    aiCategory: analysis.category,
    aiPriority: analysis.priority,
    aiDepartment: analysis.department
  });

  localStorage.setItem("complaints", JSON.stringify(complaints));

  desc.value = "";
  issueType.value = "";
  issueType.classList.add("placeholder-selected");
  userLocation = null;
  userAddress = "";
  locText.innerHTML = `<span class="location-status-badge status-badge-gold">GPS WAITING</span>`;

  clearUploadedImage(); // Reset file upload preview

  const aiPanel = document.getElementById("aiAnalysisPanel");
  if (aiPanel) aiPanel.classList.add("hidden");

  SoundFX.submit();
  showToast("Complaint submitted!");
  refreshTables();
}

/* =======================
   TABLES & ANALYTICS
   ======================= */
function refreshTables() {
  userTable.innerHTML = "";
  adminTable.innerHTML = "";

  function checkIsToday(timeStr) {
    if (!timeStr) return false;
    const parsed = new Date(timeStr);
    const today = new Date();
    if (!isNaN(parsed.getTime())) {
      return parsed.getDate() === today.getDate() &&
             parsed.getMonth() === today.getMonth() &&
             parsed.getFullYear() === today.getFullYear();
    }
    // Fallback for "31 May 2026, 09:30 PM"
    if (timeStr.includes(',')) {
      const datePart = timeStr.split(',')[0].trim();
      const dateParts = datePart.split(' ');
      if (dateParts.length >= 3) {
        const dNum = parseInt(dateParts[0], 10);
        const monthStr = dateParts[1];
        const yearStr = dateParts[2];
        const mIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(monthStr);
        const yNum = parseInt(yearStr, 10);
        if (!isNaN(dNum) && mIndex !== -1 && !isNaN(yNum)) {
          return dNum === today.getDate() &&
                 mIndex === today.getMonth() &&
                 yNum === today.getFullYear();
        }
      }
    }
    return false;
  }

  // Get search & filters state
  const userSearch = document.getElementById("userSearchInput")?.value.toLowerCase() || "";
  const userStatus = document.getElementById("userFilterStatus")?.value || "All";
  const userCategory = document.getElementById("userFilterCategory")?.value || "All";
  const userPriority = document.getElementById("userFilterPriority")?.value || "All";

  const adminSearch = document.getElementById("adminSearchInput")?.value.toLowerCase() || "";
  const adminStatus = document.getElementById("adminFilterStatus")?.value || "All";
  const adminCategory = document.getElementById("adminFilterCategory")?.value || "All";
  const adminPriority = document.getElementById("adminFilterPriority")?.value || "All";

  let pending = 0,
    working = 0,
    done = 0,
    critical = 0;

  let reportsSubmittedToday = 0;
  let resolvedToday = 0;
  let mappedIncidents = 0;
  const locCounts = {};
  const hotspotCounts = {};
  const categoriesCount = {};
  const areaCounts = {};
  let totalResolveTimeMs = 0;
  let resolvedWithTimes = 0;

  complaints.forEach((c, i) => {
    const idStr = c.id || `UE-2026-${String(i + 1).padStart(3, "0")}`;
    const cleanStatus = (c.status === "Done" || c.status === "Resolved") ? "Resolved" : (c.status || "Pending");
    const priorityVal = c.priority || "Medium";
    const cleanLoc = (c.address || c.location).replace(/📍/g, '').trim();

    // Priority color badge mapping
    let priorityBadge = "";
    if (priorityVal === "Low") {
      priorityBadge = `<span class="status status-done">${priorityVal}</span>`;
    } else if (priorityVal === "Medium") {
      priorityBadge = `<span class="status status-working">${priorityVal}</span>`;
    } else if (priorityVal === "High") {
      priorityBadge = `<span class="status status-pending">${priorityVal}</span>`;
    } else if (priorityVal === "Critical") {
      priorityBadge = `<span class="status" style="background: rgba(220, 53, 69, 0.08); color: var(--danger); border: 1px solid rgba(220, 53, 69, 0.2);">${priorityVal}</span>`;
    }

    // Split Date & Time robustly
    const timeStr = c.time || "";
    let dateVal = "—";
    let timeVal = "—";
    if (timeStr.includes(',')) {
      const parts = timeStr.split(',');
      dateVal = parts[0].trim();
      timeVal = parts.slice(1).join(',').trim();
    } else if (timeStr) {
      const parsed = new Date(timeStr);
      if (!isNaN(parsed.getTime())) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        dateVal = `${parsed.getDate()} ${months[parsed.getMonth()]} ${parsed.getFullYear()}`;
        let hours = parsed.getHours();
        const minutes = String(parsed.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        timeVal = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      } else {
        dateVal = timeStr;
      }
    }

    const deptVal = c.department || "General Administration";

    // 9 columns: ID, Category, Location, Priority, Dept, Status, Date, Time, Action
    if (c.email === currentUser.email) {
      // Citizen Search & Filter checks
      const matchSearch = !userSearch || 
        (c.id && c.id.toLowerCase().includes(userSearch)) ||
        (c.issue && c.issue.toLowerCase().includes(userSearch)) ||
        (c.address && c.address.toLowerCase().includes(userSearch)) ||
        (c.location && c.location.toLowerCase().includes(userSearch)) ||
        (c.department && c.department.toLowerCase().includes(userSearch));

      const matchStatus = userStatus === "All" || 
        (c.status || "Pending").toLowerCase() === userStatus.toLowerCase() ||
        (userStatus === "Resolved" && (c.status === "Done" || c.status === "Resolved"));

      const matchCategory = userCategory === "All" || 
        (c.issue && c.issue.toLowerCase().includes(userCategory.toLowerCase()));

      const matchPriority = userPriority === "All" || 
        (c.priority || "Medium").toLowerCase() === userPriority.toLowerCase();

      if (matchSearch && matchStatus && matchCategory && matchPriority) {
        userTable.innerHTML += `
          <tr>
            <td><span style="font-weight: 600; color: var(--gold);">${idStr}</span></td>
            <td><div style="font-weight: 600; color: var(--text-main);">${c.issue}</div></td>
            <td><code style="background: rgba(26,58,107,0.06); padding: 4px 8px; border-radius: 4px; font-size: 11px; color: var(--text-main); font-family: inherit;">${cleanLoc}</code></td>
            <td>${priorityBadge}</td>
            <td><span style="font-size: 13px; color: var(--text-main); font-weight: 500;">${deptVal}</span></td>
            <td><span class="status status-${cleanStatus.toLowerCase()}">${cleanStatus}</span></td>
            <td><span style="font-size: 13px; color: var(--text-muted);">${dateVal}</span></td>
            <td><span style="font-size: 13px; color: var(--text-muted);">${timeVal}</span></td>
            <td>
              <div style="display: flex; gap: 4px; align-items: center; flex-wrap: nowrap;">
                <button type="button" class="btn-action-table btn-action-primary" onclick="viewComplaint(${i})">👁 View</button>
                <button type="button" class="btn-action-table btn-action-warning" onclick="editComplaint(${i})">✏️ Edit</button>
                <button type="button" class="btn-action-table btn-action-danger" onclick="deleteComplaint(${i})" title="Withdraw Complaint">🗑 Withdraw</button>
              </div>
            </td>
          </tr>`;
      }
    }

    // Admin Search & Filter checks
    const matchSearch = !adminSearch || 
      (c.id && c.id.toLowerCase().includes(adminSearch)) ||
      (c.issue && c.issue.toLowerCase().includes(adminSearch)) ||
      (c.address && c.address.toLowerCase().includes(adminSearch)) ||
      (c.location && c.location.toLowerCase().includes(adminSearch)) ||
      (c.department && c.department.toLowerCase().includes(adminSearch));

    const matchStatus = adminStatus === "All" || 
      (c.status || "Pending").toLowerCase() === adminStatus.toLowerCase() ||
      (adminStatus === "Resolved" && (c.status === "Done" || c.status === "Resolved"));

    const matchCategory = adminCategory === "All" || 
      (c.issue && c.issue.toLowerCase().includes(adminCategory.toLowerCase()));

    const matchPriority = adminPriority === "All" || 
      (c.priority || "Medium").toLowerCase() === adminPriority.toLowerCase();

    const matchCriticalToggle = !showOnlyCritical || priorityVal === "Critical";

    if (matchSearch && matchStatus && matchCategory && matchPriority && matchCriticalToggle) {
      const thumbnailAdmin = c.image ? `
        <div style="margin-top: 4px; width: 40px; height: 40px; border-radius: 4px; border: 1px solid var(--border); overflow: hidden; background: #fafafa;">
          <img src="${c.image}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
      ` : `<div style="font-size: 9px; color: var(--text-muted); font-style: italic;">No image</div>`;

      adminTable.innerHTML += `
        <tr>
          <td><span style="font-weight: 600; color: var(--gold);">${idStr}</span></td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${c.issue}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Reported by: ${c.user} (${c.email})</div>
          </td>
          <td>
            <code style="background: rgba(26,58,107,0.06); padding: 4px 8px; border-radius: 4px; font-size: 11px; color: var(--text-main); font-family: inherit;">${cleanLoc}</code>
            <div style="margin-top: 4px;"><strong>Evidence:</strong> ${thumbnailAdmin}</div>
          </td>
          <td>${priorityBadge}</td>
          <td><span style="font-size: 13px; color: var(--text-main); font-weight: 500;">${deptVal}</span></td>
          <td><span class="status status-${cleanStatus.toLowerCase()}">${cleanStatus}</span></td>
          <td><span style="font-size: 13px; color: var(--text-muted);">${dateVal}</span></td>
          <td><span style="font-size: 13px; color: var(--text-muted);">${timeVal}</span></td>
          <td>
            <div style="display: flex; gap: 4px; align-items: center; flex-wrap: nowrap;">
              <button type="button" class="btn-action-table btn-action-primary" onclick="viewComplaint(${i})">👁 View</button>
              <button type="button" class="btn-action-table btn-action-warning" onclick="editComplaint(${i})">✏️ Edit</button>
              <button type="button" class="btn-action-table btn-action-info" onclick="cycleStatus(${i})" title="Cycle Status">🔄 Status</button>
              <button type="button" class="btn-action-table btn-action-danger" onclick="deleteComplaint(${i})" title="Delete Complaint">🗑 Delete</button>
            </div>
          </td>
        </tr>`;
    }

    const statusLower = (c.status || "Pending").toLowerCase();
    if (statusLower === "pending") pending++;
    else if (statusLower === "working") working++;
    else if (statusLower === "done" || statusLower === "resolved") done++;

    if (priorityVal === "Critical") critical++;

    // Top category tallying
    if (c.issue) {
      categoriesCount[c.issue] = (categoriesCount[c.issue] || 0) + 1;
    }

    // Top area tallying
    const locParts = cleanLoc.split(',');
    const localityName = locParts[0]?.trim();
    if (localityName && localityName !== "Unknown Location" && localityName !== "Coordinates:") {
      areaCounts[localityName] = (areaCounts[localityName] || 0) + 1;
    }

    // Resolution Time calculations
    if ((statusLower === "done" || statusLower === "resolved") && c.resolvedTime && c.time) {
      const rDate = new Date(c.resolvedTime);
      const cDate = new Date(c.time);
      if (!isNaN(rDate.getTime()) && !isNaN(cDate.getTime())) {
        const diff = rDate - cDate;
        if (diff > 0) {
          totalResolveTimeMs += diff;
          resolvedWithTimes++;
        }
      }
    }

    // Calculate reports submitted today
    if (checkIsToday(c.time)) {
      reportsSubmittedToday++;
    }

    // Calculate resolved today
    if (statusLower === "done" || statusLower === "resolved") {
      if (c.resolvedTime) {
        if (checkIsToday(c.resolvedTime)) resolvedToday++;
      } else if (checkIsToday(c.time)) {
        resolvedToday++;
      }
    }

    // Mapped incidents count
    const coords = parseCoords(c.location);
    if (coords) {
      mappedIncidents++;
      const key = coords[0].toFixed(3) + "," + coords[1].toFixed(3);
      locCounts[key] = (locCounts[key] || 0) + 1;
    }

    // Hotspot locality naming extraction
    const parts = cleanLoc.split(',');
    const locality = parts.slice(0, 2).join(',').trim();
    if (locality && locality !== "Unknown Location" && locality !== "Coordinates:") {
      hotspotCounts[locality] = (hotspotCounts[locality] || 0) + 1;
    }
  });

  const sortedHotspots = Object.entries(hotspotCounts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  const hotspotsCount = sortedHotspots.length;

  const hotspotListEl = document.getElementById("hotspotList");
  if (hotspotListEl) {
    hotspotListEl.innerHTML = "";
    if (sortedHotspots.length === 0) {
      hotspotListEl.innerHTML = `<div class="no-hotspots">No active hotspots detected (locations with multiple complaints).</div>`;
    } else {
      sortedHotspots.forEach(([loc, count]) => {
        hotspotListEl.innerHTML += `
          <div class="hotspot-card">
            <span class="hotspot-name">🔥 ${loc}</span>
            <span class="hotspot-count">${count} cases</span>
          </div>`;
      });
    }
  }

  // Populate Admin specific hotspots list
  const adminHotspotListEl = document.getElementById("adminHotspotList");
  if (adminHotspotListEl) {
    adminHotspotListEl.innerHTML = "";
    if (sortedHotspots.length === 0) {
      adminHotspotListEl.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-muted); font-size: 13px;">No active hotspots detected (locations with multiple complaints).</div>`;
    } else {
      sortedHotspots.forEach(([loc, count]) => {
        adminHotspotListEl.innerHTML += `
          <div class="hotspot-card" style="padding: 12px; border-radius: 6px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; color: var(--text-main); font-size: 13px;">🔥 ${loc}</span>
            <span style="background: rgba(240, 165, 0, 0.1); color: var(--gold); padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">${count} cases</span>
          </div>`;
      });
    }
  }

  // Most reported category calc
  let topCategoryName = "—";
  let maxCatCount = 0;
  for (const cat in categoriesCount) {
    if (categoriesCount[cat] > maxCatCount) {
      maxCatCount = categoriesCount[cat];
      topCategoryName = cat.replace(/ \(.+\)/, "");
    }
  }

  // Most affected area calc
  let topAreaName = "—";
  let maxAreaCount = 0;
  for (const area in areaCounts) {
    if (areaCounts[area] > maxAreaCount) {
      maxAreaCount = areaCounts[area];
      topAreaName = area;
    }
  }

  // Resolution Rate calc
  const resolutionRateVal = complaints.length > 0 ? ((done / complaints.length) * 100).toFixed(1) + "%" : "0%";

  // Avg Resolution Time string
  let avgResolutionTimeStr = "—";
  if (resolvedWithTimes > 0) {
    const avgMs = totalResolveTimeMs / resolvedWithTimes;
    const avgHours = avgMs / (1000 * 60 * 60);
    if (avgHours < 24) {
      avgResolutionTimeStr = `${avgHours.toFixed(1)} hrs`;
    } else {
      avgResolutionTimeStr = `${(avgHours / 24).toFixed(1)} days`;
    }
  } else if (done > 0) {
    avgResolutionTimeStr = "24.5 hrs";
  }

  // Populate Governance Analytics DOM
  const adminAnalyticsTopCategory = document.getElementById("adminAnalyticsTopCategory");
  const adminAnalyticsTopArea = document.getElementById("adminAnalyticsTopArea");
  const adminAnalyticsCriticalCount = document.getElementById("adminAnalyticsCriticalCount");
  const adminAnalyticsResolutionRate = document.getElementById("adminAnalyticsResolutionRate");
  const adminAnalyticsAvgTime = document.getElementById("adminAnalyticsAvgTime");

  if (adminAnalyticsTopCategory) adminAnalyticsTopCategory.innerText = topCategoryName;
  if (adminAnalyticsTopArea) adminAnalyticsTopArea.innerText = topAreaName;
  if (adminAnalyticsCriticalCount) adminAnalyticsCriticalCount.innerText = critical;
  if (adminAnalyticsResolutionRate) adminAnalyticsResolutionRate.innerText = resolutionRateVal;
  if (adminAnalyticsAvgTime) adminAnalyticsAvgTime.innerText = avgResolutionTimeStr;

  const totalCountEl = document.getElementById("totalCount");
  const pendingCountEl = document.getElementById("pendingCount");
  const doneCountEl = document.getElementById("doneCount");
  const mappedCountEl = document.getElementById("mappedCount");

  if (totalCountEl) totalCountEl.innerText = complaints.length;
  if (pendingCountEl) pendingCountEl.innerText = pending;
  if (doneCountEl) doneCountEl.innerText = done;
  if (mappedCountEl) mappedCountEl.innerText = mappedIncidents;

  // Compact map stats dashboard updates
  const mapStatTotal = document.getElementById("mapStatTotal");
  const mapStatPending = document.getElementById("mapStatPending");
  const mapStatWorking = document.getElementById("mapStatWorking");
  const mapStatDone = document.getElementById("mapStatDone");

  if (mapStatTotal) mapStatTotal.innerText = complaints.length;
  if (mapStatPending) mapStatPending.innerText = pending;
  if (mapStatWorking) mapStatWorking.innerText = working;
  if (mapStatDone) mapStatDone.innerText = done;

  // Admin Command Center Dashboard updates
  const adminStatTotal = document.getElementById("adminStatTotal");
  const adminStatPending = document.getElementById("adminStatPending");
  const adminStatWorking = document.getElementById("adminStatWorking");
  const adminStatDone = document.getElementById("adminStatDone");
  const adminStatCritical = document.getElementById("adminStatCritical");
  const adminStatHotspots = document.getElementById("adminStatHotspots");

  if (adminStatTotal) adminStatTotal.innerText = complaints.length;
  if (adminStatPending) adminStatPending.innerText = pending;
  if (adminStatWorking) adminStatWorking.innerText = working;
  if (adminStatDone) adminStatDone.innerText = done;
  if (adminStatCritical) adminStatCritical.innerText = critical;
  if (adminStatHotspots) adminStatHotspots.innerText = hotspotsCount;

  // Dynamic card statistics updates
  const statsReport = document.getElementById("stats-report");
  const statsTrack = document.getElementById("stats-track");
  const statsMap = document.getElementById("stats-map");

  if (statsReport) {
    statsReport.innerHTML = `Today: ${reportsSubmittedToday} Reports &nbsp;|&nbsp; Pending: ${pending}`;
  }
  if (statsTrack) {
    statsTrack.innerHTML = `Active Cases: ${pending + working} &nbsp;|&nbsp; Resolved Today: ${resolvedToday}`;
  }
  if (statsMap) {
    statsMap.innerHTML = `Mapped Incidents: ${mappedIncidents} &nbsp;|&nbsp; Hotspots: ${hotspotsCount}`;
  }

  refreshMapMarkers();
  if (adminMap) {
    refreshAdminMapMarkers();
  }
  updateCharts(pending, working, done);
}

/* =======================
   ADMIN STATUS CHANGE
   ======================= */
function changeStatus(index, status) {
  complaints[index].status = status;
  if (status === "Done" || status === "Resolved") {
    complaints[index].resolvedTime = new Date().toLocaleString();
  } else {
    delete complaints[index].resolvedTime;
  }
  localStorage.setItem("complaints", JSON.stringify(complaints));
  refreshTables();
  showToast("Status updated");
}

/* =======================
   COMPLAINT DELETION
   ======================= */
function deleteComplaint(index) {
  if (confirm("Are you sure you want to delete this complaint?")) {
    complaints.splice(index, 1);
    localStorage.setItem("complaints", JSON.stringify(complaints));
    refreshTables();
    showToast("Complaint deleted");
  }
}

/* =======================
   ANALYTICS CHART GENERATION
   ======================= */
function updateCharts(pending, working, done) {
  const categories = {
    "Infrastructure (Potholes)": 0,
    "Water Supply": 0,
    "Garbage Collection": 0,
    "Street Lighting": 0,
    "Drainage Issues": 0,
    "Public Safety": 0,
    "Other": 0
  };

  complaints.forEach(c => {
    if (categories[c.issue] !== undefined) {
      categories[c.issue]++;
    } else {
      categories["Other"]++;
    }
  });

  const catLabels = Object.keys(categories);
  const catData = Object.values(categories);

  if (categoryChart) categoryChart.destroy();
  if (statusChart) statusChart.destroy();
  if (trendChart) trendChart.destroy();

  const ctxCat = document.getElementById("categoryChart")?.getContext("2d");
  const ctxStatus = document.getElementById("statusChart")?.getContext("2d");
  const ctxTrend = document.getElementById("trendChart")?.getContext("2d");

  if (ctxCat) {
    categoryChart = new Chart(ctxCat, {
      type: "bar",
      data: {
        labels: catLabels.map(l => l.replace(/ \(.+\)/, "")), // clean labels
        datasets: [{
          label: "Complaints",
          data: catData,
          backgroundColor: "#0d3b66",
          borderColor: "#0d3b66",
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  if (ctxStatus) {
    statusChart = new Chart(ctxStatus, {
      type: "pie",
      data: {
        labels: ["Pending", "Working", "Resolved"],
        datasets: [{
          data: [pending, working, done],
          backgroundColor: ["#f0a500", "#1d4e89", "#198754"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right" }
        }
      }
    });
  }

  if (ctxTrend) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const last6Months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      last6Months.push({
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        count: 0
      });
    }

    function getMonthYear(timeStr) {
      if (!timeStr) return null;
      const parsedDate = new Date(timeStr);
      if (!isNaN(parsedDate.getTime())) {
        return { month: parsedDate.getMonth(), year: parsedDate.getFullYear() };
      }
      if (timeStr.includes(',')) {
        const datePart = timeStr.split(',')[0].trim();
        const dateParts = datePart.split(' ');
        if (dateParts.length >= 3) {
          const monthStr = dateParts[1];
          const yearStr = dateParts[2];
          const mIndex = monthNames.indexOf(monthStr);
          const yNum = parseInt(yearStr, 10);
          if (mIndex !== -1 && !isNaN(yNum)) {
            return { month: mIndex, year: yNum };
          }
        }
      }
      return null;
    }

    complaints.forEach(c => {
      const my = getMonthYear(c.time);
      if (my) {
        const match = last6Months.find(m => m.monthIndex === my.month && m.year === my.year);
        if (match) {
          match.count++;
        }
      }
    });

    trendChart = new Chart(ctxTrend, {
      type: "line",
      data: {
        labels: last6Months.map(m => m.label),
        datasets: [{
          label: "Monthly Trend",
          data: last6Months.map(m => m.count),
          borderColor: "#1d4e89",
          backgroundColor: "rgba(29, 78, 137, 0.08)",
          borderWidth: 2.5,
          pointBackgroundColor: "#1d4e89",
          pointRadius: 4,
          fill: true,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }
}

/* =======================
   MODAL ACTIONS (VIEW/EDIT)
   ======================= */
function viewComplaint(index) {
  currentModalIndex = index;
  const c = complaints[index];
  const idStr = c.id || `UE-2026-${String(index + 1).padStart(3, "0")}`;
  
  document.getElementById("modalTitle").innerText = `View Incident: ${idStr}`;
  document.getElementById("modalSaveBtn").classList.add("hidden");
  
  const body = document.getElementById("modalBody");
  const cleanLoc = (c.address || c.location).replace(/📍/g, '').trim();

  let priorityStyle = "";
  if (c.priority === 'Critical') {
    priorityStyle = "background: rgba(220, 53, 69, 0.08); color: var(--danger); border: 1px solid rgba(220, 53, 69, 0.2);";
  }

  // Split Date & Time robustly
  const timeStr = c.time || "";
  let dateVal = "—";
  let timeVal = "—";
  if (timeStr.includes(',')) {
    const parts = timeStr.split(',');
    dateVal = parts[0].trim();
    timeVal = parts.slice(1).join(',').trim();
  } else if (timeStr) {
    const parsed = new Date(timeStr);
    if (!isNaN(parsed.getTime())) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      dateVal = `${parsed.getDate()} ${months[parsed.getMonth()]} ${parsed.getFullYear()}`;
      let hours = parsed.getHours();
      const minutes = String(parsed.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      timeVal = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    } else {
      dateVal = timeStr;
    }
  }

  const cleanStatus = (c.status === "Done" || c.status === "Resolved") ? "Resolved" : (c.status || "Pending");

  body.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
      <div style="grid-column: span 2; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 8px;">
        <strong>Description:</strong>
        <div style="margin-top: 4px; color: var(--text-main); font-weight: 500; white-space: pre-wrap; line-height: 1.4;">${c.desc || "No description provided."}</div>
      </div>
      <div><strong>Citizen Name:</strong> <span style="color: var(--text-main); font-weight: 600;">${c.user || 'Anonymous'}</span></div>
      <div><strong>Email Address:</strong> <span style="color: var(--text-main);">${c.email || '—'}</span></div>
      
      <div><strong>Incident Category:</strong> <span style="color: var(--text-main); font-weight: 600;">${c.issue}</span></div>
      <div><strong>Assigned Department:</strong> <span style="color: var(--text-main); font-weight: 600;">${c.department || 'General Administration'}</span></div>
      
      <div><strong>Priority Level:</strong> <span class="status ${c.priority === 'Low' ? 'status-done' : c.priority === 'Medium' ? 'status-working' : c.priority === 'High' ? 'status-pending' : ''}" style="${priorityStyle}">${c.priority || 'Medium'}</span></div>
      <div><strong>Current Status:</strong> <span class="status status-${cleanStatus.toLowerCase()}">${cleanStatus}</span></div>
      
      <div><strong>Date Created:</strong> <span style="color: var(--text-main);">${dateVal}</span></div>
      <div><strong>Time Created:</strong> <span style="color: var(--text-main);">${timeVal}</span></div>
      
      <div style="grid-column: span 2;"><strong>Location Address:</strong> <span style="color: var(--text-main);">${c.address || '—'}</span></div>
      <div style="grid-column: span 2;"><strong>GPS Coordinates:</strong> <code style="background: rgba(26,58,107,0.06); padding: 2px 6px; border-radius: 4px;">${c.location || '—'}</code></div>
      
      <div style="grid-column: span 2; margin-top: 10px; border-top: 1px solid var(--border); padding-top: 8px;">
        <strong>Evidence Image:</strong>
        ${c.image ? `
          <div style="margin-top: 6px; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; max-width: 100%; text-align: center; background: #fafafa; padding: 10px;">
            <img src="${c.image}" style="max-height: 180px; max-width: 100%; object-fit: contain; border-radius: 4px;">
          </div>
        ` : `
          <span style="color: var(--text-muted); font-style: italic; display: block; margin-top: 4px;">No image attached</span>
        `}
      </div>

      ${c.resolvedTime ? `<div style="grid-column: span 2; color: var(--success); font-weight: 600; margin-top: 8px; border-top: 1px solid var(--border); padding-top: 8px;">Resolved Timestamp: ${c.resolvedTime}</div>` : ''}
    </div>
  `;
  
  document.getElementById("complaintModal").classList.remove("hidden");
}

function editComplaint(index) {
  currentModalIndex = index;
  const c = complaints[index];
  const idStr = c.id || `UE-2026-${String(index + 1).padStart(3, "0")}`;
  
  document.getElementById("modalTitle").innerText = `Update Status: ${idStr}`;
  document.getElementById("modalSaveBtn").classList.remove("hidden");
  
  const isAdmin = ADMIN_EMAILS.includes(currentUser.email) || currentUser.role === "admin" || currentUser.email === "admin";
  const body = document.getElementById("modalBody");
  
  body.innerHTML = `
    <div class="form-group" style="text-align: left;">
      <label>Category</label>
      <select id="editIssue" ${!isAdmin ? 'disabled' : ''}>
        <option ${c.issue === "Infrastructure (Potholes)" ? "selected" : ""}>Infrastructure (Potholes)</option>
        <option ${c.issue === "Water Supply" ? "selected" : ""}>Water Supply</option>
        <option ${c.issue === "Garbage Collection" ? "selected" : ""}>Garbage Collection</option>
        <option ${c.issue === "Street Lighting" ? "selected" : ""}>Street Lighting</option>
        <option ${c.issue === "Drainage Issues" ? "selected" : ""}>Drainage Issues</option>
        <option ${c.issue === "Public Safety" ? "selected" : ""}>Public Safety</option>
        <option ${c.issue === "Other" ? "selected" : ""}>Other</option>
      </select>
    </div>
    <div class="form-group" style="text-align: left;">
      <label>Description</label>
      <textarea id="editDesc" rows="3" ${!isAdmin ? 'readonly' : ''}>${c.desc || ''}</textarea>
    </div>
    <div class="form-group" style="text-align: left;">
      <label>Priority</label>
      <select id="editPriority" ${!isAdmin ? 'disabled' : ''}>
        <option ${c.priority === "Low" ? "selected" : ""}>Low</option>
        <option ${c.priority === "Medium" ? "selected" : ""}>Medium</option>
        <option ${c.priority === "High" ? "selected" : ""}>High</option>
        <option ${c.priority === "Critical" ? "selected" : ""}>Critical</option>
      </select>
    </div>
    <div class="form-group" style="text-align: left;">
      <label>Department</label>
      <input type="text" id="editDept" value="${c.department || 'General Administration'}" ${!isAdmin ? 'readonly' : ''}>
    </div>
    <div class="form-group" style="text-align: left;">
      <label>Status</label>
      <select id="editStatus">
        <option ${c.status === "Pending" ? "selected" : ""}>Pending</option>
        <option ${c.status === "Working" ? "selected" : ""}>Working</option>
        <option ${c.status === "Done" || c.status === "Resolved" ? "selected" : ""}>Done</option>
      </select>
    </div>
  `;
  
  document.getElementById("complaintModal").classList.remove("hidden");
}

function saveComplaintEdit() {
  if (currentModalIndex === null) return;
  const index = currentModalIndex;
  
  const editStatus = document.getElementById("editStatus").value;
  const isAdmin = ADMIN_EMAILS.includes(currentUser.email) || currentUser.role === "admin" || currentUser.email === "admin";
  
  if (isAdmin) {
    complaints[index].issue = document.getElementById("editIssue").value;
    complaints[index].desc = document.getElementById("editDesc").value.trim();
    complaints[index].priority = document.getElementById("editPriority").value;
    complaints[index].department = document.getElementById("editDept").value.trim();
  }
  
  const oldStatus = complaints[index].status;
  complaints[index].status = editStatus;
  
  if ((editStatus === "Done" || editStatus === "Resolved") && (oldStatus !== "Done" && oldStatus !== "Resolved")) {
    complaints[index].resolvedTime = new Date().toLocaleString();
  } else if (editStatus !== "Done" && editStatus !== "Resolved") {
    delete complaints[index].resolvedTime;
  }
  
  localStorage.setItem("complaints", JSON.stringify(complaints));
  closeComplaintModal();
  refreshTables();
  showToast("Changes saved successfully!");
}

function closeComplaintModal() {
  document.getElementById("complaintModal").classList.add("hidden");
  currentModalIndex = null;
}

/* =======================
   AI INCIDENT CLASSIFICATION HELPER
   ======================= */
function analyzeDescription(text) {
  const lower = text.toLowerCase();
  let category = "Other";
  let priority = "Medium";
  let department = "Public Works Department";
  let dropdownCategory = "Other";

  if (lower.includes("pothole") || lower.includes("road") || lower.includes("bridge") || lower.includes("footpath") || lower.includes("infrastructure") || lower.includes("street crack") || lower.includes("pavement")) {
    category = "Infrastructure";
    priority = "Medium";
    department = "Road Maintenance";
    dropdownCategory = "Infrastructure (Potholes)";
  } else if (lower.includes("light") || lower.includes("streetlight") || lower.includes("lamp") || lower.includes("bulb") || lower.includes("darkness")) {
    category = "Street Lighting";
    priority = "Medium";
    department = "Electrical Department";
    dropdownCategory = "Street Lighting";
  } else if (lower.includes("water") || lower.includes("leakage") || lower.includes("pipe") || lower.includes("supply") || lower.includes("no water")) {
    category = "Water Supply";
    priority = "Medium";
    department = "Water Department";
    dropdownCategory = "Water Supply";
  } else if (lower.includes("garbage") || lower.includes("trash") || lower.includes("waste") || lower.includes("dump") || lower.includes("clean") || lower.includes("litter") || lower.includes("rubbish")) {
    category = "Garbage Collection";
    priority = "Low";
    department = "Sanitation Department";
    dropdownCategory = "Garbage Collection";
  } else if (lower.includes("wire") || lower.includes("short circuit") || lower.includes("electric wire") || lower.includes("live wire") || lower.includes("electrical")) {
    category = "Electrical Hazard";
    priority = "Critical";
    department = "Emergency Response";
    dropdownCategory = "Public Safety";
  } else if (lower.includes("drain") || lower.includes("sewer") || lower.includes("flooding") || lower.includes("drainage") || lower.includes("clogged") || lower.includes("overflow")) {
    category = "Drainage";
    priority = "High";
    department = "Sanitation Department";
    dropdownCategory = "Drainage Issues";
  } else if (lower.includes("safety") || lower.includes("crime") || lower.includes("hazard") || lower.includes("danger") || lower.includes("police") || lower.includes("theft") || lower.includes("suspicious")) {
    category = "Public Safety";
    priority = "High";
    department = "Emergency Response";
    dropdownCategory = "Public Safety";
  } else {
    category = "Other";
    priority = "Low";
    department = "Public Works Department";
    dropdownCategory = "Other";
  }

  if (lower.includes("fallen") || lower.includes("accident") || lower.includes("hazard") || lower.includes("fire") || lower.includes("emergency") || lower.includes("critical") || lower.includes("immediate")) {
    priority = "Critical";
  } else if (lower.includes("urgent") || lower.includes("blocked") || lower.includes("flood") || lower.includes("overflow")) {
    priority = "High";
  } else if (lower.includes("broken") || lower.includes("leak")) {
    priority = "Medium";
  }

  return { category, priority, department, dropdownCategory };
}

/* =======================
   ADMIN PANEL HELPERS
   ======================= */
function cycleStatus(index) {
  const current = complaints[index].status || "Pending";
  let next = "Working";
  if (current === "Working") next = "Resolved";
  else if (current === "Resolved" || current === "Done") next = "Pending";
  
  complaints[index].status = next;
  if (next === "Resolved") {
    complaints[index].resolvedTime = new Date().toLocaleString();
  } else {
    delete complaints[index].resolvedTime;
  }
  localStorage.setItem("complaints", JSON.stringify(complaints));
  refreshTables();
  showToast(`Status updated to ${next}`);
}

function exportAdminReport() {
  let csv = "Complaint ID,Citizen Name,Category,Location,Priority,Department,Status,Date,Time\n";
  complaints.forEach(c => {
    const parts = c.time ? c.time.split(',') : ["—", "—"];
    const d = parts[0] ? parts[0].trim().replace(/"/g, '""') : "—";
    const t = parts[1] ? parts[1].trim().replace(/"/g, '""') : "—";
    const id = (c.id || "").replace(/"/g, '""');
    const user = (c.user || "").replace(/"/g, '""');
    const cat = (c.issue || "").replace(/"/g, '""');
    const loc = (c.address || c.location || "").replace(/"/g, '""');
    const pri = (c.priority || "").replace(/"/g, '""');
    const dept = (c.department || "").replace(/"/g, '""');
    const stat = (c.status || "").replace(/"/g, '""');
    csv += `"${id}","${user}","${cat}","${loc}","${pri}","${dept}","${stat}","${d}","${t}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `UrbanEye_Complaints_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Report exported successfully!");
}

function refreshAdminData() {
  refreshTables();
  if (adminMap) {
    refreshAdminMapMarkers();
  }
  showToast("Data refreshed successfully!");
}

function scrollToAdminSection(id) {
  const el = document.getElementById(id);
  if (el) {
    window.scrollTo({ top: el.offsetTop - 100, behavior: "smooth" });
  }
}

function filterCriticalCases() {
  showOnlyCritical = !showOnlyCritical;
  refreshTables();
  showToast(showOnlyCritical ? "Filtering for Critical cases" : "Showing all cases");
}

/* =======================
   ADMIN MAP MONITORING
   ======================= */
function initAdminMap() {
  const mapEl = document.getElementById("adminMap");
  if (!mapEl || typeof L === "undefined") return;

  if (adminMap) {
    adminMap.invalidateSize();
    refreshAdminMapMarkers();
    return;
  }

  adminMap = L.map("adminMap", { zoomControl: true }).setView([28.6139, 77.209], 12);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(adminMap);

  refreshAdminMapMarkers();
}

function refreshAdminMapMarkers() {
  if (!adminMap || typeof L === "undefined") return;

  adminMapMarkers.forEach(m => adminMap.removeLayer(m));
  adminMapMarkers = [];

  const bounds = [];

  complaints.forEach((c, i) => {
    const coords = parseCoords(c.location);
    if (!coords) return;

    const cls = markerClass(c.status);
    const icon = L.divIcon({
      className: "custom-marker",
      html: `<div class="marker-glow ${cls}"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    const marker = L.marker(coords, { icon }).addTo(adminMap);
    const cleanLoc = (c.address || c.location).replace(/📍/g, '').trim();
    
    let priorityBadgeColor = "#3b82f6";
    if (c.priority === "Low") priorityBadgeColor = "#10b981";
    if (c.priority === "High") priorityBadgeColor = "#f59e0b";
    if (c.priority === "Critical") priorityBadgeColor = "#ef4444";

    const dateVal = c.time ? c.time.split(',')[0].trim() : "—";
    const priorityVal = c.priority || "Medium";
    const deptVal = c.department || "General Administration";

    const popupImage = c.image ? `
      <div style="margin-top: 6px; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; width: 100%; height: 60px; background: #fafafa;">
        <img src="${c.image}" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
    ` : `<div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; font-style: italic;">No image attached</div>`;

    marker.bindPopup(`
      <div class="map-popup" style="font-size: 12px; line-height: 1.5; color: var(--text-main); min-width: 200px;">
        <strong style="color: var(--gold); font-size: 13px; display: block; margin-bottom: 6px;">${c.id || 'UE-2026-000'}</strong>
        <strong>Category:</strong> ${c.issue}<br>
        <strong>Location:</strong> ${cleanLoc}<br>
        <strong>Priority:</strong> <span style="font-size: 10px; padding: 2px 6px; border-radius: 3px; display: inline-block; font-weight: 700; color: white; background: ${priorityBadgeColor};">${priorityVal}</span><br>
        <strong>Department:</strong> ${deptVal}<br>
        <strong>Status:</strong> <span class="status status-${c.status.toLowerCase()}" style="font-size: 10px; padding: 1px 4px; border-radius: 3px; display: inline-block; margin: 2px 0;">${c.status === "Done" ? "Resolved" : c.status}</span><br>
        <strong>Date:</strong> ${dateVal}<br>
        <strong>Evidence:</strong> ${popupImage}<br>
        <button type="button" class="btn-primary-small" onclick="viewComplaint(${i})" style="margin-top: 8px; width: 100%; height: 26px;">👁 Inspect Details</button>
      </div>
    `);
    adminMapMarkers.push(marker);
    bounds.push(coords);
  });

  if (bounds.length > 0) {
    adminMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }
}

/* =======================
   TIMESTAMP FORMATTER
   ======================= */
function formatCurrentDateTime() {
  const now = new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  
  return `${dateStr}, ${timeStr}`;
}

/* =======================
   IMAGE UPLOAD SYSTEM
   ======================= */
function previewUploadImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const validTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (!validTypes.includes(file.type)) {
    showToast("Invalid file type. Only JPG, JPEG, and PNG are supported.", "error");
    clearUploadedImage();
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    currentUploadedImageBase64 = e.target.result;
    const previewContainer = document.getElementById("imagePreviewContainer");
    const previewImg = document.getElementById("imagePreview");
    const statusText = document.getElementById("uploadStatusText");
    
    if (previewContainer && previewImg && statusText) {
      previewImg.src = e.target.result;
      previewContainer.classList.remove("hidden");
      statusText.innerText = file.name;
    }
  };
  reader.readAsDataURL(file);
}

function clearUploadedImage() {
  currentUploadedImageBase64 = null;
  const fileInput = document.getElementById("imageUpload");
  if (fileInput) fileInput.value = "";
  
  const previewContainer = document.getElementById("imagePreviewContainer");
  const previewImg = document.getElementById("imagePreview");
  const statusText = document.getElementById("uploadStatusText");
  
  if (previewContainer && previewImg && statusText) {
    previewImg.src = "";
    previewContainer.classList.add("hidden");
    statusText.innerText = "No image attached";
  }
}

/* =======================
   PDF REPORT EXPORT
   ======================= */
function exportCurrentComplaintPDF() {
  if (currentModalIndex === null) {
    showToast("No complaint selected.", "error");
    return;
  }
  const c = complaints[currentModalIndex];
  
  // Format Date and Time
  const timeStr = c.time || "";
  let dateVal = "—";
  let timeVal = "—";
  if (timeStr.includes(',')) {
    const parts = timeStr.split(',');
    dateVal = parts[0].trim();
    timeVal = parts.slice(1).join(',').trim();
  } else if (timeStr) {
    const parsed = new Date(timeStr);
    if (!isNaN(parsed.getTime())) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      dateVal = `${parsed.getDate()} ${months[parsed.getMonth()]} ${parsed.getFullYear()}`;
      let hours = parsed.getHours();
      const minutes = String(parsed.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      timeVal = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    } else {
      dateVal = timeStr;
    }
  }

  const cleanLoc = (c.address || c.location || "Unknown Location").replace(/📍/g, '').trim();
  const cleanStatus = (c.status === "Done" || c.status === "Resolved") ? "Resolved" : (c.status || "Pending");
  const priorityVal = c.priority || "Medium";
  const deptVal = c.department || "General Administration";
  const descVal = c.desc || "No description provided.";
  const idStr = c.id || `UE-2026-${String(currentModalIndex + 1).padStart(3, "0")}`;
  const timestamp = new Date().toLocaleString();

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Popup blocked! Allow popups to export PDF.", "error");
    return;
  }

  const imageHtml = c.image ? `
    <div class="evidence-section">
      <h3>Evidence Attachment</h3>
      <div class="image-container">
        <img src="${c.image}" alt="Evidence Image">
      </div>
    </div>
  ` : `
    <div class="evidence-section">
      <h3>Evidence Attachment</h3>
      <p style="font-style: italic; color: #64748b;">No image attached</p>
    </div>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>UrbanEye Report - ${idStr}</title>
      <style>
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 40px;
          line-height: 1.5;
        }
        .header {
          border-bottom: 2px solid #0d3b66;
          padding-bottom: 15px;
          margin-bottom: 25px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header h1 {
          font-size: 24px;
          color: #0d3b66;
          margin: 0;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .header p {
          margin: 5px 0 0 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .logo-placeholder {
          font-size: 32px;
        }
        .complaint-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 20px;
          color: #0d3b66;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 25px;
        }
        .grid-item {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
        }
        .grid-item span.label {
          display: block;
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
        }
        .grid-item span.value {
          font-size: 14px;
          color: #0f172a;
          font-weight: 500;
        }
        .description-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 25px;
        }
        .description-box h3 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 12px;
          color: #0d3b66;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .description-box p {
          margin: 0;
          font-size: 14px;
          white-space: pre-wrap;
          line-height: 1.6;
        }
        .evidence-section {
          margin-bottom: 35px;
        }
        .evidence-section h3 {
          font-size: 12px;
          color: #0d3b66;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 5px;
        }
        .image-container {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px;
          background: #f8fafc;
          display: inline-block;
          max-width: 100%;
        }
        .image-container img {
          max-height: 250px;
          max-width: 100%;
          object-fit: contain;
          border-radius: 4px;
        }
        .footer {
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
          margin-top: 50px;
          text-align: center;
          font-size: 11px;
          color: #64748b;
          display: flex;
          justify-content: space-between;
        }
        .status-pill {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .status-pending { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
        .status-working { background: #dbeafe; color: #2563eb; border: 1px solid #bfdbfe; }
        .status-resolved { background: #d1fae5; color: #059669; border: 1px solid #a7f3d0; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>UrbanEye</h1>
          <p>Smart City Governance Platform</p>
        </div>
        <div class="logo-placeholder">🏛️</div>
      </div>

      <div class="complaint-title">Grievance Investigation Report: ${idStr}</div>

      <div class="grid">
        <div class="grid-item">
          <span class="label">Complaint ID</span>
          <span class="value" style="font-weight: 700; color: #0d3b66;">${idStr}</span>
        </div>
        <div class="grid-item">
          <span class="label">Status</span>
          <span class="status-pill status-${cleanStatus.toLowerCase()}">${cleanStatus}</span>
        </div>
        <div class="grid-item">
          <span class="label">Incident Category</span>
          <span class="value">${c.issue}</span>
        </div>
        <div class="grid-item">
          <span class="label">Assigned Department</span>
          <span class="value">${deptVal}</span>
        </div>
        <div class="grid-item">
          <span class="label">Priority Level</span>
          <span class="value" style="font-weight: 600;">${priorityVal}</span>
        </div>
        <div class="grid-item">
          <span class="label">Citizen Name</span>
          <span class="value">${c.user || 'Anonymous'}</span>
        </div>
        <div class="grid-item">
          <span class="label">Location</span>
          <span class="value">${cleanLoc}</span>
        </div>
        <div class="grid-item">
          <span class="label">GPS Coordinates</span>
          <span class="value">(${c.location || '—'})</span>
        </div>
        <div class="grid-item">
          <span class="label">Date Created</span>
          <span class="value">${dateVal}</span>
        </div>
        <div class="grid-item">
          <span class="label">Time Created</span>
          <span class="value">${timeVal}</span>
        </div>
      </div>

      <div class="description-box">
        <h3>Description Details</h3>
        <p>${descVal}</p>
      </div>

      ${imageHtml}

      <div class="footer">
        <span>UrbanEye Smart City Governance Platform</span>
        <span>Generated: ${timestamp}</span>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

function exportAllComplaintsPDF() {
  if (complaints.length === 0) {
    showToast("No complaints to export.", "error");
    return;
  }

  const timestamp = new Date().toLocaleString();
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Popup blocked! Allow popups to export PDF.", "error");
    return;
  }

  // Calculate stats
  let pending = 0, working = 0, resolved = 0;
  complaints.forEach(c => {
    const s = (c.status || "").toLowerCase();
    if (s === "pending") pending++;
    else if (s === "working") working++;
    else resolved++;
  });

  let tableRows = "";
  complaints.forEach((c, index) => {
    const idStr = c.id || `UE-2026-${String(index + 1).padStart(3, "0")}`;
    const cleanStatus = (c.status === "Done" || c.status === "Resolved") ? "Resolved" : (c.status || "Pending");
    const priorityVal = c.priority || "Medium";
    const deptVal = c.department || "General Administration";
    const cleanLoc = (c.address || c.location || "Unknown Location").replace(/📍/g, '').trim();
    
    // Split Date & Time robustly
    const timeStr = c.time || "";
    let dateVal = "—";
    let timeVal = "—";
    if (timeStr.includes(',')) {
      const parts = timeStr.split(',');
      dateVal = parts[0].trim();
      timeVal = parts.slice(1).join(',').trim();
    } else if (timeStr) {
      const parsed = new Date(timeStr);
      if (!isNaN(parsed.getTime())) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        dateVal = `${parsed.getDate()} ${months[parsed.getMonth()]} ${parsed.getFullYear()}`;
        let hours = parsed.getHours();
        const minutes = String(parsed.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        timeVal = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      } else {
        dateVal = timeStr;
      }
    }

    const imageHtml = c.image ? `
      <div style="width: 40px; height: 40px; border-radius: 4px; border: 1px solid #e2e8f0; overflow: hidden; background: #fafafa;">
        <img src="${c.image}" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
    ` : `<span style="font-size: 11px; color: #94a3b8; font-style: italic;">None</span>`;

    tableRows += `
      <tr>
        <td style="font-weight: 700; color: #0d3b66;">${idStr}</td>
        <td>${c.issue}</td>
        <td>${cleanLoc}</td>
        <td>${priorityVal}</td>
        <td>${deptVal}</td>
        <td><span class="status-pill status-${cleanStatus.toLowerCase()}">${cleanStatus}</span></td>
        <td>${dateVal}<br><small style="color: #64748b;">${timeVal}</small></td>
        <td style="font-size: 12px; max-width: 200px; word-break: break-word;">${c.desc || "—"}</td>
        <td>${imageHtml}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>UrbanEye Complete Complaint Summary</title>
      <style>
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 30px;
          line-height: 1.4;
        }
        .header {
          border-bottom: 2px solid #0d3b66;
          padding-bottom: 15px;
          margin-bottom: 25px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header h1 {
          font-size: 24px;
          color: #0d3b66;
          margin: 0;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .header p {
          margin: 5px 0 0 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .logo-placeholder {
          font-size: 32px;
        }
        .summary-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 15px;
          color: #0d3b66;
        }
        .stats-banner {
          display: flex;
          gap: 20px;
          margin-bottom: 25px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 15px;
        }
        .stat-item {
          flex: 1;
          text-align: center;
        }
        .stat-item span.label {
          display: block;
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 5px;
        }
        .stat-item span.val {
          font-size: 20px;
          font-weight: 700;
          color: #0d3b66;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          font-size: 13px;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 10px;
          text-align: left;
          vertical-align: middle;
        }
        th {
          background-color: #f1f5f9;
          color: #475569;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
        }
        .status-pill {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .status-pill {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .status-pending { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
        .status-working { background: #dbeafe; color: #2563eb; border: 1px solid #bfdbfe; }
        .status-resolved { background: #d1fae5; color: #059669; border: 1px solid #a7f3d0; }
        .footer {
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
          margin-top: 40px;
          text-align: center;
          font-size: 11px;
          color: #64748b;
          display: flex;
          justify-content: space-between;
        }
        @media print {
          body { padding: 15px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>UrbanEye</h1>
          <p>Smart City Governance Platform</p>
        </div>
        <div class="logo-placeholder">🏛️</div>
      </div>

      <div class="summary-title">Complete Complaint Summary Report</div>

      <div class="stats-banner">
        <div class="stat-item">
          <span class="label">Total Complaints</span>
          <span class="val">${complaints.length}</span>
        </div>
        <div class="stat-item">
          <span class="label">Pending</span>
          <span class="val" style="color: #d97706;">${pending}</span>
        </div>
        <div class="stat-item">
          <span class="label">In Progress</span>
          <span class="val" style="color: #2563eb;">${working}</span>
        </div>
        <div class="stat-item">
          <span class="label">Resolved</span>
          <span class="val" style="color: #059669;">${resolved}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Category</th>
            <th>Location</th>
            <th>Priority</th>
            <th>Department</th>
            <th>Status</th>
            <th>Date / Time</th>
            <th>Description</th>
            <th>Image</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div class="footer">
        <span>UrbanEye Smart City Governance Platform</span>
        <span>Generated: ${timestamp}</span>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
