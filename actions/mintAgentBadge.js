// actions/mintAgentBadge.js — Gary AI Ventures
// Founder only. Mints a new AgentBadge NFT with role and spending limits.

import { APP_STATE }      from "../utils/state.js";
import { CONFIG }         from "../config.js";
import { openActionModal, closeHow } from "../utils/modal.js";
import { sendTransaction } from "./radix.js";
import { loadCompanyState } from "../main.js";

const ROLES = ["Marketing", "Designer", "Research"];

export function mintAgentBadge() {
  if (!APP_STATE.isFounder) {
    alert("Only the Founder can mint agent badges.");
    return;
  }

  openActionModal({
    title: "🪪 Mint Agent Badge",
    hideConfirm: true,
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:8px;">

        <div>
          <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Agent Name</label>
          <input id="mint-agent-name" type="text" placeholder="e.g. Marketing Agent #1"
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Role</label>
          <select id="mint-agent-role"
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
            ${ROLES.map(r => `<option value="${r}">${r}</option>`).join("")}
          </select>
        </div>

        <div>
          <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Spending Limit (XRD per transaction)</label>
          <input id="mint-spending-limit" type="number" placeholder="10" min="0.01" step="0.01"
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Revenue Share (0.0 – 1.0, e.g. 0.25 = 25%)</label>
          <input id="mint-revenue-share" type="number" placeholder="0.25" min="0" max="1" step="0.01"
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Destination Account (receives the badge)</label>
          <input id="mint-destination" type="text" placeholder="account_tdx_2_1..."
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;font-family:monospace;">
        </div>

        <button id="btn-mint-confirm"
          style="padding:12px;border-radius:8px;background:#276ff5;color:white;border:none;cursor:pointer;font-size:15px;font-weight:600;">
          🪪 Mint Badge
        </button>

      </div>
    `,
  });

  setTimeout(() => {
    document.getElementById("btn-mint-confirm")?.addEventListener("click", async () => {
      const agentName     = document.getElementById("mint-agent-name")?.value?.trim();
      const role          = document.getElementById("mint-agent-role")?.value;
      const spendingLimit = document.getElementById("mint-spending-limit")?.value?.trim();
      const revenueShare  = document.getElementById("mint-revenue-share")?.value?.trim();
      const destination   = document.getElementById("mint-destination")?.value?.trim();

      // ── Validation ──────────────────────────────────────────────────────────
      if (!agentName) {
        alert("Agent name is required."); return;
      }
      if (!spendingLimit || parseFloat(spendingLimit) <= 0) {
        alert("Spending limit must be greater than 0."); return;
      }
      const revShare = parseFloat(revenueShare);
      if (isNaN(revShare) || revShare < 0 || revShare > 1) {
        alert("Revenue share must be between 0 and 1."); return;
      }
      if (!destination || !destination.startsWith("account_")) {
        alert("Invalid destination account address."); return;
      }

      closeHow();
      await executeMint(agentName, role, spendingLimit, revenueShare, destination);
    });
  }, 50);
}

async function executeMint(agentName, role, spendingLimit, revenueShare, destination) {
  const account    = APP_STATE.activeAccount.address;
  const ownerBadge = APP_STATE.founderBadgeAddress;
  const component  = APP_STATE.componentAddress;
  const savedComponentAddress = APP_STATE.componentAddress;
  const savedIsFounder = APP_STATE.isFounder;

  const manifest = `
CALL_METHOD
    Address("${account}")
    "create_proof_of_amount"
    Address("${ownerBadge}")
    Decimal("1")
;
CALL_METHOD
    Address("${component}")
    "mint_agent_badge"
    "${agentName}"
    "${role}"
    Decimal("${spendingLimit}")
    Decimal("${revenueShare}")
    Address("${destination}")
    "${destination}"
;
`;

  console.log("[mintAgentBadge] manifest:\n", manifest);

  try {
    await sendTransaction(manifest);
    closeHow();
    const prevCount = (APP_STATE.agentBadges || []).length;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 3000));
      await loadCompanyState(savedComponentAddress, savedIsFounder);
      if ((APP_STATE.agentBadges || []).length > prevCount) break;
    }
  } catch (err) {
    console.error("[mintAgentBadge] error:", err);
    alert("Transaction failed. Check console for details.");
  }
}
