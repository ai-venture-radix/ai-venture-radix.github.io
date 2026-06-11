// actions/depositWithSplit.js — Gary AI Ventures
// Anyone can call this — customer pays the company and XRD splits automatically.
// 60% treasury / 25% active agent / 10% contributor / 5% platform

import { APP_STATE }                 from "../utils/state.js";
import { CONFIG }                    from "../config.js";
import { openActionModal, closeHow } from "../utils/modal.js";
import { sendTransaction }           from "./radix.js";
import { loadCompanyState }          from "../main.js";

export function depositWithSplit() {
  // Build agent options for the dropdown from loaded state
  const activeAgents = (APP_STATE.agentBadges || []).filter(b => b.active);

  const agentOptions = activeAgents.length > 0
    ? activeAgents.map(b =>
        `<option value="${b.id}">${b.agent_name} (${b.role}) — ID ${b.id}</option>`
      ).join("")
    : `<option value="" disabled>No active agents yet</option>`;

  openActionModal({
    title: "⚡ Pay Company — Auto Split",
    hideConfirm: true,
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:8px;">

        <!-- Split preview -->
        <div style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:12px;">
          <p style="font-size:11px;color:#8b949e;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em;">
            Revenue split preview
          </p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;">
            <span style="color:#8b949e;">Treasury</span>
            <span style="color:#3fb950;font-weight:600;">${Math.round(CONFIG.SPLIT_TREASURY * 100)}%</span>
            <span style="color:#8b949e;">Active Agent</span>
            <span style="color:#79c0ff;font-weight:600;">${Math.round(CONFIG.SPLIT_AGENT * 100)}%</span>
            <span style="color:#8b949e;">Contributor</span>
            <span style="color:#d2a8ff;font-weight:600;">${Math.round(CONFIG.SPLIT_CONTRIBUTOR * 100)}%</span>
            <span style="color:#8b949e;">Platform</span>
            <span style="color:#ffa657;font-weight:600;">${Math.round(CONFIG.SPLIT_PLATFORM * 100)}%</span>
          </div>
        </div>

        <div>
          <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Amount (XRD)</label>
          <input id="split-amount" type="number" placeholder="10" min="0.01" step="0.01"
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Active Agent (receives ${Math.round(CONFIG.SPLIT_AGENT * 100)}%)</label>
          <select id="split-agent-select"
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
            ${agentOptions}
          </select>
        </div>

        <div>
          <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Agent Account Address</label>
          <input id="split-agent-account" type="text" placeholder="account_tdx_2_1..."
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;font-family:monospace;">
          <p style="font-size:11px;color:#8b949e;margin:4px 0 0;">
            The account that will receive the agent's revenue share.
          </p>
        </div>

        <!-- Live split calculation -->
        <div id="split-calc" style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:12px;display:none;">
          <p style="font-size:11px;color:#8b949e;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em;">
            You will send
          </p>
          <div id="split-calc-rows" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:13px;"></div>
        </div>

        <button id="btn-split-confirm"
          style="padding:12px;border-radius:8px;background:#276ff5;color:white;border:none;cursor:pointer;font-size:15px;font-weight:600;">
          ⚡ Send Payment
        </button>

      </div>
    `,
  });

  setTimeout(() => {
    // Live calculation on amount input
    document.getElementById("split-amount")?.addEventListener("input", (e) => {
      const amount = parseFloat(e.target.value);
      const calc   = document.getElementById("split-calc");
      const rows   = document.getElementById("split-calc-rows");
      if (!calc || !rows) return;
      if (isNaN(amount) || amount <= 0) { calc.style.display = "none"; return; }

      calc.style.display = "block";
      rows.innerHTML = `
        <span style="color:#8b949e;">Treasury</span>
        <span style="color:#3fb950;">${(amount * CONFIG.SPLIT_TREASURY).toFixed(4)} XRD</span>
        <span style="color:#8b949e;">Agent</span>
        <span style="color:#79c0ff;">${(amount * CONFIG.SPLIT_AGENT).toFixed(4)} XRD</span>
        <span style="color:#8b949e;">Contributor</span>
        <span style="color:#d2a8ff;">${(amount * CONFIG.SPLIT_CONTRIBUTOR).toFixed(4)} XRD</span>
        <span style="color:#8b949e;">Platform</span>
        <span style="color:#ffa657;">${(amount * CONFIG.SPLIT_PLATFORM).toFixed(4)} XRD</span>
      `;
    });

    document.getElementById("btn-split-confirm")?.addEventListener("click", async () => {
      const amount       = document.getElementById("split-amount")?.value?.trim();
      const agentAccount = document.getElementById("split-agent-account")?.value?.trim();

      if (!amount || parseFloat(amount) <= 0) {
        alert("Amount must be greater than 0."); return;
      }
      if (!agentAccount || !agentAccount.startsWith("account_")) {
        alert("Invalid agent account address."); return;
      }

      closeHow();
      await executeDepositWithSplit(amount, agentAccount);
    });
  }, 50);
}

async function executeDepositWithSplit(amount, agentAccount) {
  const account   = APP_STATE.activeAccount.address;
  const component = CONFIG.COMPONENT_ADDRESS;
  const xrd       = CONFIG.XRD;

  const manifest = `
CALL_METHOD
    Address("${account}")
    "withdraw"
    Address("${xrd}")
    Decimal("${amount}")
;
TAKE_ALL_FROM_WORKTOP
    Address("${xrd}")
    Bucket("payment")
;
CALL_METHOD
    Address("${component}")
    "deposit_with_split"
    Bucket("payment")
    Address("${agentAccount}")
;
`;

  console.log("[depositWithSplit] manifest:\n", manifest);

  try {
    await sendTransaction(manifest);
    await loadCompanyState();
  } catch (err) {
    console.error("[depositWithSplit] error:", err);
    alert("Transaction failed. Check console for details.");
  }
}
