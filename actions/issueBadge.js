import { APP_STATE } from "../utils/state.js";
import { openActionModal } from "../utils/modal.js";
import { sendTransaction } from "./radix.js";

const EPOCHS_PER_DAY = 288;

function issueBadgeManifest(agentName, days) {
  const account    = APP_STATE.activeAccount.address;
  const ownerBadge = APP_STATE.ownerBadgeAddress;
  const component  = APP_STATE.componentAddress;
  const epochs     = Math.round(days * EPOCHS_PER_DAY);

  return `
CALL_METHOD
    Address("${account}")
    "create_proof_of_amount"
    Address("${ownerBadge}")
    Decimal("1")
;
CALL_METHOD
    Address("${component}")
    "issue_new_badge"
    "${agentName}"
    ${epochs}u64
;
CALL_METHOD
    Address("${account}")
    "deposit_batch"
    Expression("ENTIRE_WORKTOP")
;
`;

}

export async function issueBadge() {
  if (!APP_STATE.activeAccount || !APP_STATE.ownerBadgeAddress || !APP_STATE.componentAddress) {
    console.error("Missing APP_STATE data for issueBadge");
    return;
  }
openActionModal({
    title: "Issue New Agent Badge",
    content: `
      <div style="display:flex;flex-direction:column;gap:16px;margin-top:8px;">
        <div>
          <label style="font-size:13px;color:#8b949e;">Agent Name</label>
          <p style="font-size:12px;color:#555;margin:2px 0 6px;">
            A name to identify this agent badge.
          </p>
          <input id="issue-name" type="text"
            placeholder="my-trading-agent"
            style="width:100%;padding:8px;border-radius:8px;background:#111;color:white;border:1px solid #333;box-sizing:border-box;"
          />
        </div>
        <div>
          <label style="font-size:13px;color:#8b949e;">Badge Duration (days)</label>
          <p style="font-size:12px;color:#555;margin:2px 0 6px;">
            How many days this badge will be valid.
          </p>
          <input id="issue-days" type="number"
            placeholder="30" min="1" step="1"
            style="width:100%;padding:8px;border-radius:8px;background:#111;color:white;border:1px solid #333;box-sizing:border-box;"
          />
        </div>
      </div>
    `,
    confirmText: "Issue Badge",
    onConfirm: async () => {
      const agentName    = document.getElementById("issue-name").value.trim();
      const days         = parseInt(document.getElementById("issue-days").value);
      if (!agentName || !days || days < 1 ) {
        console.error("Invalid inputs for issueBadge");
        return;
      }
      const manifest = issueBadgeManifest(agentName, days);
      console.log("ISSUE BADGE MANIFEST:", manifest);
      await sendTransaction(manifest);
    }
  });
}

