// actions/agentSession.js — AI Ventures Session Card
// Si SESSION_MANAGER_URL contiene "your-app" o está vacío → modo local
// En modo local muestra el card con el grupo Telegram hardcodeado en CONFIG

import { CONFIG }    from "../config.js";
import { APP_STATE } from "../utils/state.js";

const IS_LOCAL = !CONFIG.SESSION_MANAGER_URL ||
                  CONFIG.SESSION_MANAGER_URL.includes("your-app");

// Link directo al grupo — funciona si el founder ya es miembro
const LOCAL_GROUP_LINK = CONFIG.TELEGRAM_GROUP_LINK || `https://t.me/c/${String(CONFIG.TELEGRAM_GROUP_ID ?? "").replace("-100", "")}`;

// ─── Render session card ──────────────────────────────────────────────────────

export function renderSessionCard() {
  const container = document.getElementById("session-card-container");
  if (!container) return;

  // Solo visible para el founder
  if (!APP_STATE.isFounder) {
    container.innerHTML = "";
    return;
  }

  const session = APP_STATE.session;

  if (!session) {
    container.innerHTML = renderInactiveCard();
  } else {
    container.innerHTML = renderActiveCard(session);
    startCountdown(session.expiresAt);
  }

  attachSessionListeners();
}

// ─── Inactive card ────────────────────────────────────────────────────────────

function renderInactiveCard() {
  const hasAgents = (APP_STATE.agentBadges || []).filter(b => b.active).length > 0;

  return `
    <div style="
      margin: 8px 16px;
      padding: 12px 16px;
      border-radius: 10px;
      background: #0d1117;
      border: 1px solid #1f2937;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    ">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;">🤖</span>
        <div>
          <p style="margin:0;font-size:13px;font-weight:600;color:#e6edf3;">AI Agents</p>
          <p style="margin:0;font-size:11px;color:#555;">
            ${hasAgents
              ? `${(APP_STATE.agentBadges||[]).filter(b=>b.active).length} agent${(APP_STATE.agentBadges||[]).filter(b=>b.active).length>1?"s":""} ready`
              : "No agents minted yet"}
          </p>
        </div>
      </div>

      <button id="btn-start-session"
        ${!hasAgents ? "disabled" : ""}
        style="
          padding: 8px 14px;
          border-radius: 8px;
          background: ${hasAgents ? "#276ff5" : "#1a1a2e"};
          color: ${hasAgents ? "white" : "#555"};
          border: ${hasAgents ? "none" : "1px solid #30363d"};
          cursor: ${hasAgents ? "pointer" : "not-allowed"};
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        ">
        ${hasAgents ? "🚀 Start Session" : "No agents"}
      </button>
    </div>`;
}

// ─── Active card ──────────────────────────────────────────────────────────────

function renderActiveCard(session) {
  const link = session.inviteLink || LOCAL_GROUP_LINK;

  return `
    <div style="
      margin: 8px 16px;
      padding: 12px 16px;
      border-radius: 10px;
      background: #0d1117;
      border: 1px solid #276ff5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    ">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;">🤖</span>
        <div>
          <div style="display:flex;align-items:center;gap:6px;">
            <p style="margin:0;font-size:13px;font-weight:600;color:#e6edf3;">AI Agents</p>
            <span style="
              font-size:10px;padding:2px 6px;border-radius:10px;
              background:#0a2a0a;color:#3fb950;border:1px solid #3fb950;
              font-weight:600;
            ">● Active</span>
          </div>
          <p id="session-countdown" style="margin:0;font-size:11px;color:#555;">
            --:--:--
          </p>
        </div>
      </div>

      <div style="display:flex;gap:8px;align-items:center;">
        <a href="${link}" target="_blank" style="
          padding: 8px 14px;
          border-radius: 8px;
          background: #276ff5;
          color: white;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
        ">💬 Open Telegram</a>

        <button id="btn-end-session" style="
          padding: 8px 10px;
          border-radius: 8px;
          background: transparent;
          color: #555;
          border: 1px solid #30363d;
          cursor: pointer;
          font-size: 11px;
        ">End</button>
      </div>
    </div>`;
}

// ─── Event listeners ──────────────────────────────────────────────────────────

function attachSessionListeners() {
  document.getElementById("btn-start-session")?.addEventListener("click", startSession);
  document.getElementById("btn-end-session")?.addEventListener("click",   endSession);
}

// ─── Start session ────────────────────────────────────────────────────────────

async function startSession() {
  const btn = document.getElementById("btn-start-session");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Starting..."; }

  try {
    if (IS_LOCAL) {
      // Modo local — sin Railway, usar grupo existente directamente
      APP_STATE.session = {
        sessionId:  "local-session",
        inviteLink: LOCAL_GROUP_LINK,
        expiresAt:  new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        agents:     (APP_STATE.agentBadges || []).filter(b => b.active),
      };
      renderSessionCard();
      return;
    }

    // Modo Railway
    const activeBadges = (APP_STATE.agentBadges || []).filter(b => b.active);
    const res = await fetch(`${CONFIG.SESSION_MANAGER_URL}/session/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyAddress:      APP_STATE.componentAddress,
        founderBadgeAddress: APP_STATE.founderBadgeAddress,
        agentBadges: activeBadges.map(b => ({
          badgeId:   b.id,
          agentName: b.agent_name,
          role:      b.role,
        })),
        mode:              "demo",
        founderTelegramId: CONFIG.FOUNDER_TELEGRAM_ID ?? "",
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create session");
    }

    APP_STATE.session = await res.json();
    renderSessionCard();

  } catch (err) {
    console.error("[agentSession] startSession error:", err);
    alert(`Failed to start session: ${err.message}`);
    if (btn) { btn.disabled = false; btn.textContent = "🚀 Start Session"; }
  }
}

// ─── End session ──────────────────────────────────────────────────────────────

async function endSession() {
  if (!confirm("End the current agent session?")) return;

  if (!IS_LOCAL && APP_STATE.session?.sessionId) {
    try {
      await fetch(`${CONFIG.SESSION_MANAGER_URL}/session/end/${APP_STATE.session.sessionId}`, {
        method: "POST",
      });
    } catch (err) {
      console.error("[agentSession] endSession error:", err);
    }
  }

  APP_STATE.session = null;
  renderSessionCard();
}

// ─── Countdown ────────────────────────────────────────────────────────────────

let countdownTimer = null;

function startCountdown(expiresAt) {
  if (countdownTimer) clearInterval(countdownTimer);

  function tick() {
    const el = document.getElementById("session-countdown");
    if (!el) { clearInterval(countdownTimer); return; }

    const remaining = new Date(expiresAt) - new Date();
    if (remaining <= 0) {
      el.textContent = "Expired";
      APP_STATE.session = null;
      clearInterval(countdownTimer);
      setTimeout(renderSessionCard, 1000);
      return;
    }

    const h = Math.floor(remaining / 3_600_000);
    const m = Math.floor((remaining % 3_600_000) / 60_000);
    const s = Math.floor((remaining % 60_000) / 1000);
    el.textContent =
      `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} remaining`;
  }

  tick();
  countdownTimer = setInterval(tick, 1000);
}
