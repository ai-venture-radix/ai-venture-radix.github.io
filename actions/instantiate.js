// actions/instantiate.js — Gary AI Ventures
// Shows a modal to create a new AICompany on-chain.
// Called when a founder connects their wallet and has no existing component.

import { CONFIG }                    from "../config.js";
import { APP_STATE }                 from "../utils/state.js";
import { openActionModal, closeHow } from "../utils/modal.js";
import { sendTransaction }           from "./radix.js";
import { loadCompanyState }          from "../main.js";

export function showInstantiateModal() {
  openActionModal({
    title: "🚀 Create Your AI Venture Company",
    hideConfirm: true,
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:8px;">

        <p style="font-size:13px;color:#8b949e;margin:0;">
          Deploy your AICompany contract on Radix. You will receive the Founder Badge in your wallet.
        </p>

        <div>
          <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Company Name</label>
          <input id="inst-company-name" type="text" placeholder="e.g. Gary AI Ventures"
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Max per TX (XRD)</label>
            <input id="inst-max-tx" type="number" value="10" min="1"
              style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Multisig threshold</label>
            <input id="inst-multisig" type="number" value="50" min="1"
              style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Daily cap (XRD)</label>
            <input id="inst-daily-cap" type="number" value="100" min="1"
              style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
          </div>
        </div>

        <div>
          <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Contributor Account</label>
          <input id="inst-contributor" type="text" placeholder="account_tdx_2_1..."
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;font-family:monospace;">
          <p style="font-size:11px;color:#8b949e;margin:4px 0 0;">Receives 10% of every payment. Can be your own account.</p>
        </div>

        <!-- Revenue split -->
        <div style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:12px;">
          <p style="font-size:11px;color:#8b949e;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.05em;">Revenue split — must sum to 100%</p>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;">
            <div>
              <label style="font-size:11px;color:#3fb950;display:block;margin-bottom:4px;">Treasury %</label>
              <input id="inst-split-treasury" type="number" value="60" min="0" max="100"
                style="width:100%;padding:8px;border-radius:6px;background:#161b22;border:1px solid #30363d;color:#e6edf3;font-size:13px;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:11px;color:#79c0ff;display:block;margin-bottom:4px;">Agent %</label>
              <input id="inst-split-agent" type="number" value="25" min="0" max="100"
                style="width:100%;padding:8px;border-radius:6px;background:#161b22;border:1px solid #30363d;color:#e6edf3;font-size:13px;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:11px;color:#d2a8ff;display:block;margin-bottom:4px;">Contributor %</label>
              <input id="inst-split-contributor" type="number" value="10" min="0" max="100"
                style="width:100%;padding:8px;border-radius:6px;background:#161b22;border:1px solid #30363d;color:#e6edf3;font-size:13px;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:11px;color:#ffa657;display:block;margin-bottom:4px;">Platform %</label>
              <input id="inst-split-platform" type="number" value="5" min="0" max="100"
                style="width:100%;padding:8px;border-radius:6px;background:#161b22;border:1px solid #30363d;color:#e6edf3;font-size:13px;box-sizing:border-box;">
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">
            <span style="font-size:12px;color:#8b949e;">Total</span>
            <span id="inst-split-sum" style="font-size:15px;font-weight:500;color:#f85149;">100%</span>
          </div>
        </div>

        <button id="btn-instantiate-confirm"
          style="padding:12px;border-radius:8px;background:#276ff5;color:white;border:none;cursor:pointer;font-size:15px;font-weight:600;">
          🚀 Create Company
        </button>

      </div>
    `,
  });

  setTimeout(() => {
    // Live split sum
    const splitIds = ["inst-split-treasury", "inst-split-agent", "inst-split-contributor", "inst-split-platform"];

    function updateSum() {
      const sum = splitIds.reduce((acc, id) => {
        return acc + (parseFloat(document.getElementById(id)?.value) || 0);
      }, 0);
      const el = document.getElementById("inst-split-sum");
      if (!el) return;
      el.textContent = `${sum}%`;
      el.style.color = sum === 100 ? "#3fb950" : "#f85149";
    }

    updateSum();
    splitIds.forEach(id => document.getElementById(id)?.addEventListener("input", updateSum));

    document.getElementById("btn-instantiate-confirm")?.addEventListener("click", async () => {
      const companyName   = document.getElementById("inst-company-name")?.value?.trim();
      const maxTx         = document.getElementById("inst-max-tx")?.value?.trim();
      const multisig      = document.getElementById("inst-multisig")?.value?.trim();
      const dailyCap      = document.getElementById("inst-daily-cap")?.value?.trim();
      const contributor   = document.getElementById("inst-contributor")?.value?.trim();
      const splitTreasury = parseFloat(document.getElementById("inst-split-treasury")?.value) || 0;
      const splitAgent    = parseFloat(document.getElementById("inst-split-agent")?.value)    || 0;
      const splitContrib  = parseFloat(document.getElementById("inst-split-contributor")?.value) || 0;
      const splitPlatform = parseFloat(document.getElementById("inst-split-platform")?.value) || 0;

      // Validations
      if (!companyName) { alert("Company name is required."); return; }
      if (!contributor || !contributor.startsWith("account_")) {
        alert("Invalid contributor account address."); return;
      }
      const splitSum = splitTreasury + splitAgent + splitContrib + splitPlatform;
      if (splitSum !== 100) {
        alert(`Revenue splits must sum to 100%. Current: ${splitSum}%`); return;
      }

      closeHow();
      await executeInstantiate({
        companyName,
        maxTx,
        multisig,
        dailyCap,
        contributor,
        splitTreasury: (splitTreasury / 100).toFixed(2),
        splitAgent:    (splitAgent    / 100).toFixed(2),
        splitContrib:  (splitContrib  / 100).toFixed(2),
        splitPlatform: (splitPlatform / 100).toFixed(2),
      });
    });
  }, 50);
}

async function executeInstantiate({
  companyName, maxTx, multisig, dailyCap, contributor,
  splitTreasury, splitAgent, splitContrib, splitPlatform,
}) {
  const founderAccount = APP_STATE.activeAccount.address;

  const manifest = `
CALL_FUNCTION
    Address("${CONFIG.PACKAGE_ADDRESS}")
    "AICompany"
    "instantiate"
    "${companyName}"
    Decimal("${maxTx}")
    Decimal("${multisig}")
    Decimal("${dailyCap}")
    Array<Tuple>()
    Address("${founderAccount}")
    Address("${CONFIG.DEV_FEE_COLLECTOR}")
    Address("${founderAccount}")
    Address("${contributor}")
    Address("${CONFIG.PLATFORM_ACCOUNT}")
    Decimal("${splitTreasury}")
    Decimal("${splitAgent}")
    Decimal("${splitContrib}")
    Decimal("${splitPlatform}")
;
CALL_METHOD
    Address("${founderAccount}")
    "try_deposit_batch_or_abort"
    Expression("ENTIRE_WORKTOP")
    None
;
`;

  console.log("[instantiate] manifest:\n", manifest);

  try {
    const txId = await sendTransaction(manifest);
    alert(`✅ Company created! TX: ${txId}\n\nRefresh the page to see your new dashboard.`);
  } catch (err) {
    console.error("[instantiate] error:", err);
    alert("Transaction failed. Check console for details.");
  }
}
