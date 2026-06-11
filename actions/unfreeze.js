import { APP_STATE } from "../utils/state.js";
import { openActionModal } from "../utils/modal.js";
import { sendTransaction } from "./radix.js";

function unfreezeManifest() {
  const account     = APP_STATE.activeAccount.address;
  const ownerBadge  = APP_STATE.ownerBadgeAddress;
  const component   = APP_STATE.componentAddress;

  return `
CALL_METHOD
    Address("${account}")
    "create_proof_of_amount"
    Address("${ownerBadge}")
    Decimal("1")
;
CALL_METHOD
    Address("${component}")
    "unfreeze"
;
`;
}

export async function unfreeze() {

  // Validar que tenemos todo antes de abrir el modal
  if (!APP_STATE.activeAccount || !APP_STATE.ownerBadgeAddress || !APP_STATE.componentAddress) {
    console.error("Missing APP_STATE data for unfreeze");
    return;
  }

  openActionModal({
    title: "Unfreeze Wallet Agent AI",
    content: `
      This will unfreeze all outgoing activity of your agent wallet.<br><br>
      Please confirm and sign in your Radix Wallet.
    `,
    confirmText: "Unfreeze",
    onConfirm: async () => {
      const manifest = unfreezeManifest();
      console.log("UNFREEZE MANIFEST:", manifest);
      await sendTransaction(manifest);
    }
  });
}
