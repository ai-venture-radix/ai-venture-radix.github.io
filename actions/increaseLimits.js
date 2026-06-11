import { APP_STATE } from "../utils/state.js";
import { openActionModal } from "../utils/modal.js";
import { sendTransaction } from "./radix.js";

function increaseLimitsManifest(maxPerTx, multisig, dailyCap) {
  const account    = APP_STATE.activeAccount.address;
  const ownerBadge = APP_STATE.ownerBadgeAddress;
  const component  = APP_STATE.componentAddress;

  return `
CALL_METHOD
    Address("${account}")
    "create_proof_of_amount"
    Address("${ownerBadge}")
    Decimal("1")
;
CALL_METHOD
    Address("${component}")
    "update_limits"
    Decimal("${maxPerTx}")
    Decimal("${multisig}")
    Decimal("${dailyCap}")
;
`;
}

export async function increaseLimits() {
  if (!APP_STATE.activeAccount || !APP_STATE.ownerBadgeAddress || !APP_STATE.componentAddress) {
    console.error("Missing APP_STATE data for increaseLimits");
    return;
  }

  openActionModal({
    title: "Update Limits",
    content: `
      <div style="display:flex;flex-direction:column;gap:16px;margin-top:8px;">
        <div>
          <label style="font-size:13px;color:#8b949e;">Max per Transaction</label>
          <p style="font-size:12px;color:#555;margin:2px 0 6px;">
            Maximum amount the agent can spend in a single transaction.
          </p>
          <input id="limit-max-tx" type="number"
            placeholder="200" min="0" step="1"
            style="width:100%;padding:8px;border-radius:8px;background:#111;color:white;border:1px solid #333;box-sizing:border-box;"
          />
        </div>
        <div>
          <label style="font-size:13px;color:#8b949e;">Multisig Threshold</label>
          <p style="font-size:12px;color:#555;margin:2px 0 6px;">
            Maximum the agent and owner can spend together in one TX.
          </p>
          <input id="limit-multisig" type="number"
            placeholder="100" min="0" step="1"
            style="width:100%;padding:8px;border-radius:8px;background:#111;color:white;border:1px solid #333;box-sizing:border-box;"
          />
        </div>
        <div>
          <label style="font-size:13px;color:#8b949e;">Daily Cap</label>
          <p style="font-size:12px;color:#555;margin:2px 0 6px;">
            Maximum total spending allowed per day.
          </p>
          <input id="limit-daily" type="number"
            placeholder="10000" min="0" step="1"
            style="width:100%;padding:8px;border-radius:8px;background:#111;color:white;border:1px solid #333;box-sizing:border-box;"
          />
        </div>
      </div>
    `,
    confirmText: "Update Limits",
    onConfirm: async () => {
      const maxPerTx  = document.getElementById("limit-max-tx").value.trim();
      const multisig  = document.getElementById("limit-multisig").value.trim();
      const dailyCap  = document.getElementById("limit-daily").value.trim();

      if (!maxPerTx || !multisig || !dailyCap) {
        console.error("All fields required for increaseLimits");
        return;
      }

      if (parseFloat(maxPerTx) > parseFloat(multisig)) {
        console.error("Max per TX cannot exceed Multisig Threshold");
        return;
      }

      if (parseFloat(multisig) > parseFloat(dailyCap)) {
        console.error("Multisig Threshold cannot exceed Daily Cap");
        return;
      }

      const manifest = increaseLimitsManifest(maxPerTx, multisig, dailyCap);
      console.log("INCREASE LIMITS MANIFEST:", manifest);
      await sendTransaction(manifest);
    }
  });
}
