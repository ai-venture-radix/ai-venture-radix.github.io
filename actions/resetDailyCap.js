import { APP_STATE } from "../utils/state.js";
import { openActionModal } from "../utils/modal.js";
import { sendTransaction } from "./radix.js";

function resetDailyCapManifest() {
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
    "reset_daily_cap"
;
`;
}

export async function resetDailyCap() {
  if (!APP_STATE.activeAccount || !APP_STATE.ownerBadgeAddress || !APP_STATE.componentAddress) {
    console.error("Missing APP_STATE data for resetDailyCap");
    return;
  }

  openActionModal({
    title: "Reset Daily Cap",
    content: `
      <p style="font-size:14px;color:#8b949e;margin-bottom:12px;">
        This will restart the daily spending counter back to zero.
      </p>
      <p style="font-size:12px;color:#555;">
        ⚠️ Only works if at least 24 hours (288 epochs) have passed since the last reset.
      </p>
    `,
    confirmText: "Reset Daily Cap",
    onConfirm: async () => {
      const manifest = resetDailyCapManifest();
      console.log("RESET DAILY CAP MANIFEST:", manifest);
      await sendTransaction(manifest);
    }
  });
}
