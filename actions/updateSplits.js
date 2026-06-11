// actions/updateSplits.js — Gary AI Ventures
// Founder only. Reconfigures the 4 revenue split percentages.
// Percentages must sum to exactly 100%.

import { APP_STATE }                 from "../utils/state.js";
import { CONFIG }                    from "../config.js";
import { openActionModal, closeHow } from "../utils/modal.js";
import { sendTransaction }           from "./radix.js";

export function updateSplits() {
  if (!APP_STATE.isFounder) {
    alert("Only the Founder can update revenue splits.");
    return;
  }

  // Show current values as defaults
  const t = Math.round(CONFIG.SPLIT_TREASURY    * 100);
  const a = Math.round(CONFIG.SPLIT_AGENT       * 100);
  const c = Math.round(CONFIG.SPLIT_CONTRIBUTOR * 100);
  const p = Math.round(CONFIG.SPLIT_PLATFORM    * 100);

  openActionModal({
    title: "📊 Update Revenue Splits",
    hideConfirm: true,
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:8px;">

        <p style="font-size:13px;color:#8b949e;margin:0;">
          All four values must sum to exactly <strong style="color:#e6edf3;">100%</strong>.
        </p>

        <div>
          <label style="font-size:12px;color:#3fb950;display:block;margin-bottom:4px;">Treasury %</label>
          <input id="split-treasury" type="number" value="${t}" min="0" max="100" step="1"
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:12px;color:#79c0ff;display:block;margin-bottom:4px;">Active Agent %</label>
          <input id="split-agent" type="number" value="${a}" min="0" max="100" step="1"
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:12px;color:#d2a8ff;display:block;margin-bottom:4px;">Contributor %</label>
          <input id="split-contributor" type="number" value="${c}" min="0" max="100" step="1"
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:12px;color:#ffa657;display:block;margin-bottom:4px;">Platform %</label>
          <input id="split-platform" type="number" value="${p}" min="0" max="100" step="1"
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
        </div>

        <!-- Live sum indicator -->
        <div style="display:flex;align-items:center;justify-content:space-between;background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:10px 14px;">
          <span style="font-size:13px;color:#8b949e;">Total</span>
          <span id="split-sum-display" style="font-size:16px;font-weight:600;color:#f85149;">0%</span>
        </div>

        <button id="btn-splits-confirm"
          style="padding:12px;border-radius:8px;background:#276ff5;color:white;border:none;cursor:pointer;font-size:15px;font-weight:600;">
          📊 Update Splits
        </button>

      </div>
    `,
  });

  setTimeout(() => {
    const inputs = ["split-treasury", "split-agent", "split-contributor", "split-platform"];

    function updateSum() {
      const sum = inputs.reduce((acc, id) => {
        return acc + (parseFloat(document.getElementById(id)?.value) || 0);
      }, 0);
      const display = document.getElementById("split-sum-display");
      if (!display) return;
      display.textContent = `${sum}%`;
      display.style.color = sum === 100 ? "#3fb950" : "#f85149";
    }

    // Init sum display
    updateSum();

    inputs.forEach(id => {
      document.getElementById(id)?.addEventListener("input", updateSum);
    });

    document.getElementById("btn-splits-confirm")?.addEventListener("click", async () => {
      const treasury    = parseFloat(document.getElementById("split-treasury")?.value)    || 0;
      const agent       = parseFloat(document.getElementById("split-agent")?.value)       || 0;
      const contributor = parseFloat(document.getElementById("split-contributor")?.value) || 0;
      const platform    = parseFloat(document.getElementById("split-platform")?.value)    || 0;

      const sum = treasury + agent + contributor + platform;
      if (sum !== 100) {
        alert(`Splits must sum to 100%. Current total: ${sum}%`);
        return;
      }

      closeHow();
      await executeUpdateSplits(
        (treasury    / 100).toFixed(2),
        (agent       / 100).toFixed(2),
        (contributor / 100).toFixed(2),
        (platform    / 100).toFixed(2),
      );
    });
  }, 50);
}

async function executeUpdateSplits(treasury, agent, contributor, platform) {
  const account    = APP_STATE.activeAccount.address;
  const ownerBadge = APP_STATE.founderBadgeAddress;
  const component  = CONFIG.COMPONENT_ADDRESS;

  const manifest = `
CALL_METHOD
    Address("${account}")
    "create_proof_of_amount"
    Address("${ownerBadge}")
    Decimal("1")
;
CALL_METHOD
    Address("${component}")
    "update_revenue_splits"
    Decimal("${treasury}")
    Decimal("${agent}")
    Decimal("${contributor}")
    Decimal("${platform}")
;
`;

  console.log("[updateSplits] manifest:\n", manifest);

  try {
    await sendTransaction(manifest);
    // Update local config so the depositWithSplit preview reflects new values
    CONFIG.SPLIT_TREASURY    = parseFloat(treasury);
    CONFIG.SPLIT_AGENT       = parseFloat(agent);
    CONFIG.SPLIT_CONTRIBUTOR = parseFloat(contributor);
    CONFIG.SPLIT_PLATFORM    = parseFloat(platform);
    alert("Revenue splits updated successfully.");
  } catch (err) {
    console.error("[updateSplits] error:", err);
    alert("Transaction failed. Check console for details.");
  }
}
