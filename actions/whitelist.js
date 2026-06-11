import { CONFIG } from "../config.js";
import { APP_STATE } from "../utils/state.js";
import { openActionModal } from "../utils/modal.js";
import { sendTransaction } from "./radix.js";

function addWhitelistManifest(name,walletAddress) {
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
    "add_to_whitelist"
    "${name}"
    Address("${walletAddress}")

;
`;
}

function removeWhitelistManifest(walletAddress) {
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
    "remove_from_whitelist"
    Address("${walletAddress}")
;
`;
}

export async function addWhitelist() {
  if (!APP_STATE.activeAccount || !APP_STATE.ownerBadgeAddress || !APP_STATE.componentAddress) {
    console.error("Missing APP_STATE data for addWhitelist");
    return;
  }

  openActionModal({
    title: "Add to Whitelist",
    content: `
      <div style="display:flex;flex-direction:column;gap:16px;margin-top:8px;">
        <div>
          <label style="font-size:13px;color:#8b949e;">Wallet Name</label>
          <p style="font-size:12px;color:#555;margin:2px 0 6px;">
            A name to identify this wallet easily.
          </p>
          <input id="whitelist-name" type="text"
            placeholder="my-defi-wallet"
            style="width:100%;padding:8px;border-radius:8px;background:#111;color:white;border:1px solid #333;box-sizing:border-box;"/>
        </div>
        <div>
          <label style="font-size:13px;color:#8b949e;">Wallet Address</label>
          <p style="font-size:12px;color:#555;margin:2px 0 6px;">
            This wallet will be allowed to receive funds from the agent.
          </p>
          <input id="whitelist-address" type="text"
            placeholder="account_tdx_2_1..."
            style="width:100%;padding:8px;border-radius:8px;background:#111;color:white;border:1px solid #333;box-sizing:border-box;"/>
        </div>
      </div>
    `,
    confirmText: "Add",
    onConfirm: async () => {
      const name    = document.getElementById("whitelist-name").value.trim();
      const address = document.getElementById("whitelist-address").value.trim();

      if (!name || !address) {
        console.error("Name and address required");
        return;
      }

      const manifest = addWhitelistManifest(name, address);
      console.log("ADD WHITELIST MANIFEST:", manifest);
      await sendTransaction(manifest);
    }
  });
}

export async function getHasWhitelist() {
  const list = await getWhitelist();
  return list.length > 0;
}


async function getWhitelist() {
  const account    = APP_STATE.activeAccount.address;
  const ownerBadge = APP_STATE.ownerBadgeAddress;
  const component  = APP_STATE.componentAddress;

  const manifest = `
CALL_METHOD Address("${account}") "create_proof_of_amount" Address("${ownerBadge}") Decimal("1") ;
CALL_METHOD Address("${component}") "get_whitelist" ;
`;

  const response = await fetch(
    `${CONFIG.GATEWAY_URL}/transaction/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manifest,
        start_epoch_inclusive: 1,
        end_epoch_exclusive: 100,
        nonce: Math.floor(Math.random() * 1000000000),
        signer_public_keys: [],
        notary_public_key: {
          key_type: "EddsaEd25519",
          key_hex: "0000000000000000000000000000000000000000000000000000000000000001"
        },
        notary_is_signatory: true,
        tip_percentage: 0,
        flags: {
          use_free_credit: true,
          assume_all_signature_proofs: true,
          skip_epoch_check: true
        }
      })
    }
  );
  const data = await response.json();
  console.log("WHITELIST PREVIEW:", data);

  // output[0] es el proof, output[1] es el array de tuples
  const output = data?.receipt?.output;
  
  console.log("RAW OUTPUT:", JSON.stringify(output, null, 2));

    if (!output || !output[1]) return [];
        const items = output[1]?.programmatic_json?.elements || [];
        
        return items.map(tuple => ({
          name:    tuple.fields[0].value,
          address: tuple.fields[1].value
        }))
        .filter(w => w.address !== APP_STATE.activeAccount.address);


}

export async function removeWhitelist() {
  if (!APP_STATE.activeAccount || !APP_STATE.ownerBadgeAddress || !APP_STATE.componentAddress) {
    console.error("Missing APP_STATE data for removeWhitelist");
    return;
  }

  const whitelist = await getWhitelist();

  if (whitelist.length === 0) {
    console.warn("No wallets in whitelist");
    return;
  }

  const options = whitelist.map(w => `
    <option value="${w.address}">${w.name} — ${w.address.slice(0, 16)}...</option>
  `).join("");

  openActionModal({
    title: "Remove from Whitelist",
    content: `
      <label style="font-size:13px;color:#8b949e;">Select Wallet to Revoke</label>
      <p style="font-size:12px;color:#555;margin:2px 0 8px;">
        This wallet will no longer be allowed to receive funds from the agent.
      </p>
      <select id="whitelist-address"
        style="width:100%;padding:8px;margin:8px 0;border-radius:8px;background:#111;color:white;border:1px solid #333;box-sizing:border-box;">
        ${options}
      </select>
    `,
    confirmText: "Remove",
    onConfirm: async () => {
      const address = document.getElementById("whitelist-address").value;
      if (!address) return;
      const manifest = removeWhitelistManifest(address);
      console.log("REMOVE WHITELIST MANIFEST:", manifest);
      await sendTransaction(manifest);
    }
  });
}



















