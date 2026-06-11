// utils/ui.js — Gary AI Ventures

import { APP_STATE } from "./state.js";



// Update company name 
export function updateCompanyName(name) {
  if (!name) return;
  // Header title
  const headerTitle = document.querySelector(".header-title");
  if (headerTitle) {
    headerTitle.innerHTML = `<span class="wallet">${name}</span>`;
  }
  // Hero title
  const heroTitle = document.querySelector(".app-title");
  if (heroTitle) {
    heroTitle.innerHTML = `<span class="wallet">${name}</span>`;
  }
  // Browser tab
  document.title = name;
}



// ── Update UI visibility based on role ────────────────────────────────────────

export function updateUI(isFounder, hasAgent, showCreate = false) {
 console.log("[updateUI] called with:", isFounder, hasAgent, showCreate);
  const createCard = document.getElementById("create-company-card");
  console.log("[updateUI] create-company-card classes:", createCard?.className);





  const companySection  = document.getElementById("company-section");
  const agentsSection   = document.getElementById("agents-section");
  const founderControls = document.getElementById("founder-controls");
  const agentControls   = document.getElementById("agent-controls");
  const ownerLocked     = document.getElementById("owner-locked");
  const pendingCard     = document.getElementById("pending-approval-card");


  // Siempre ocultar el create card por defecto
  document.getElementById("create-company-card")?.classList.add("hidden");

  if (showCreate) {
    document.getElementById("company-section")?.classList.add("hidden");
    document.getElementById("agents-section")?.classList.add("hidden");
    document.getElementById("founder-controls")?.classList.add("hidden");
    document.getElementById("agent-controls")?.classList.add("hidden");
    document.getElementById("owner-locked")?.classList.add("hidden");
    document.getElementById("create-company-card")?.classList.remove("hidden");
    return;
  }





  if (!isFounder && !hasAgent) {
    // Not connected or no badge — show locked state
    companySection?.classList.add("hidden");
    agentsSection?.classList.add("hidden");
    founderControls?.classList.add("hidden");
    agentControls?.classList.add("hidden");
    ownerLocked?.classList.remove("hidden");
    pendingCard?.classList.add("hidden");
    return;
  }

  // Anyone with a badge sees the company overview and agents table
  companySection?.classList.remove("hidden");
  agentsSection?.classList.remove("hidden");
  ownerLocked?.classList.add("hidden");
  pendingCard?.classList.remove("hidden");

  if (isFounder) {
    founderControls?.classList.remove("hidden");
    agentControls?.classList.add("hidden");
  } else {
    founderControls?.classList.add("hidden");
    agentControls?.classList.remove("hidden");
  }
}

// ── Render company overview card ──────────────────────────────────────────────

export function renderCompanyOverview() {
  const el = document.getElementById("company-overview");
  if (!el) return;

  const name    = APP_STATE.companyName    || "—";
  const balance = parseFloat(APP_STATE.treasuryBalance || 0).toFixed(2);
  const revenue = parseFloat(APP_STATE.totalRevenue    || 0).toFixed(2);
  //const agents  = APP_STATE.badgeCounter  || 0;
  const agents = (APP_STATE.agentBadges || []).filter(b => b.active).length;

  el.innerHTML = `
    <div class="overview-grid">
      <div class="overview-item">
        <span class="overview-label">Company</span>
        <span class="overview-value company-name">${name}</span>
      </div>
      <div class="overview-item">
        <span class="overview-label">Treasury</span>
        <span class="overview-value treasury">${balance} XRD</span>
      </div>
      <div class="overview-item">
        <span class="overview-label">Total Revenue</span>
        <span class="overview-value revenue">${revenue} XRD</span>
      </div>
      <div class="overview-item">
        <span class="overview-label">Agents</span>
        <span class="overview-value agents">${agents}</span>
      </div>
    </div>
  `;
}

// ── Render agents table ───────────────────────────────────────────────────────

export function renderAgentsTable(badges) {
  const el = document.getElementById("agents-table");
  if (!el) return;

  if (!badges || badges.length === 0) {
    el.innerHTML = `
      <p style="color:#8b949e;font-size:13px;text-align:center;padding:20px 0;">
        No agents yet. Mint the first agent badge to get started.
      </p>
    `;
    return;
  }

  const rows = badges.map(b => `
    <tr class="${b.active ? "" : "inactive-row"}">
      <td>${b.id || "—"}</td>
      <td>${b.agent_name || "—"}</td>
      <td><span class="role-badge role-${(b.role || "").toLowerCase()}">${b.role || "—"}</span></td>
      <td>${parseFloat(b.spending_limit || 0).toFixed(2)} XRD</td>
      <td>${(parseFloat(b.revenue_share || 0) * 100).toFixed(0)}%</td>
      <td>
        <span class="status-dot ${b.active ? "active" : "inactive"}"></span>
        ${b.active ? "Active" : "Inactive"}
      </td>
    </tr>
  `).join("");

  el.innerHTML = `
    <table class="agents-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Role</th>
          <th>Spending Limit</th>
          <th>Revenue Share</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// ── Legacy — kept for compatibility ──────────────────────────────────────────

export function updateInstantiateButton() {}
