import { APP_STATE } from "../utils/state.js";

export function instantiateManifest({
  fee,
  minPolicy,
  multisigThreshold,
  dailyLimit,
  allowedAddresses,
  agentName,
  cooldown
}) {

  const account = APP_STATE.activeAccount.address;

  return `
CALL_METHOD
    Address("${account}")
    "lock_fee"
    Decimal("${fee}")
;

CALL_FUNCTION
    Address("PACKAGE")
    "PolicyVault"
    "instantiate"
    Decimal("${minPolicy}")
    Decimal("${multisigThreshold}")
    Decimal("${dailyLimit}")
    Array<Address>()
    "${agentName}"
    ${cooldown}u64
;

CALL_METHOD
    Address("${account}")
    "deposit_batch"
    Expression("ENTIRE_WORKTOP")
;
`;
}


