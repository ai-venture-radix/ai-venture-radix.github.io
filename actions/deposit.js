import { CONFIG } from "../config.js";
import { APP_STATE } from "../utils/state.js";
import { openActionModal } from "../utils/modal.js";
import { sendTransaction } from "./radix.js";

async function getAccountTokens() {
  const account = APP_STATE.activeAccount.address;
  const response = await fetch(
    `${CONFIG.GATEWAY_URL}/state/entity/details`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [account],
        aggregation_level: "Vault",
        opt_ins: {
          explicit_metadata: ["name", "symbol"]
        }
      })
    }
  );
  const data = await response.json();
  const fungibles = data?.items?.[0]?.fungible_resources?.items || [];

console.log("PVOB address:", APP_STATE.ownerBadgeAddress);
console.log("Fungibles antes de filtrar:", fungibles.map(r => r.resource_address));


  return fungibles
       .filter(r => r.resource_address !== APP_STATE.ownerBadgeAddress)
       .filter(r => parseFloat(r.vaults?.items?.[0]?.amount || 0) > 0)

        .map(resource => {
    const metadata = resource.explicit_metadata?.items || [];
    const name   = metadata.find(m => m.key === "name")?.value?.typed?.value   || "Unknown";
    const symbol = metadata.find(m => m.key === "symbol")?.value?.typed?.value || "???";
    const amount = resource.vaults?.items?.[0]?.amount || "0";
    return { address: resource.resource_address, name, symbol, amount };
  });
}

function depositManifest(resourceAddress, amount) {
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
    Address("${account}")
    "withdraw"
    Address("${resourceAddress}")
    Decimal("${amount}")
;
TAKE_ALL_FROM_WORKTOP
    Address("${resourceAddress}")
    Bucket("deposit_bucket")
;
CALL_METHOD
    Address("${component}")
    "deposit"
    Bucket("deposit_bucket")
;
`;
}

export async function deposit() {
  if (!APP_STATE.activeAccount || !APP_STATE.ownerBadgeAddress || !APP_STATE.componentAddress) {
    console.error("Missing APP_STATE data for deposit");
    return;
  }

  const tokens = await getAccountTokens();

  const options = tokens.map(t => `
    <option value="${t.address}">
      ${t.symbol} — ${t.name} (${parseFloat(t.amount).toFixed(2)} available)
    </option>
  `).join("");

  openActionModal({
    title: "Deposit Funds",
    content: `
      <label>Select Token</label>
      <select id="deposit-resource" style="width:100%;padding:8px;margin:8px 0 16px;border-radius:8px;background:#111;color:white;border:1px solid #333;">
        ${options}
      </select>
      <label>Amount</label>
      <input id="deposit-amount" type="number"
        placeholder="0.0" min="0" step="0.1"
        style="width:100%;padding:8px;margin:8px 0;border-radius:8px;background:#111;color:white;border:1px solid #333;"
      />
    `,
    confirmText: "Deposit",
    onConfirm: async () => {
      const resourceAddress = document.getElementById("deposit-resource").value.trim();
      const amount          = document.getElementById("deposit-amount").value.trim();

      if (!resourceAddress || !amount || parseFloat(amount) <= 0) {
        console.error("Invalid deposit inputs");
        return;
      }

      const manifest = depositManifest(resourceAddress, amount);
      console.log("DEPOSIT MANIFEST:", manifest);
      await sendTransaction(manifest);
    }
  });
}
