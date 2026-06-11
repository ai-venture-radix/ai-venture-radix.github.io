// actions/revokeBadge.js — Gary AI Ventures
// Founder only. Recalls a specific agent badge by ID and burns it.

import { APP_STATE }                 from "../utils/state.js";
import { CONFIG }                    from "../config.js";
import { openActionModal, closeHow } from "../utils/modal.js";
import { sendTransaction }           from "./radix.js";
import { loadCompanyState }          from "../main.js";

export function revokeBadge() {
  if (!APP_STATE.isFounder) {
    alert("Only the Founder can revoke agent badges.");
    return;
  }

  const activeAgents = (APP_STATE.agentBadges || []).filter(b => b.active);

  if (activeAgents.length === 0) {
    alert("No active agent badges to revoke.");
    return;
  }

  const agentOptions = activeAgents.map(b =>
    `<option value="${b.id}">${b.agent_name} — ${b.role} (ID ${b.id})</option>`
  ).join("");

  openActionModal({
    title: "🔴 Revoke Agent Badge",
    hideConfirm: true,
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:8px;">

        <p style="color:#f85149;font-size:13px;margin:0;">
          ⚠️ This will permanently burn the selected agent badge.
          The agent will immediately lose all access to the company.
        </p>

        <div>
          <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">Select Agent</label>
          <select id="revoke-badge-select"
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;">
            ${agentOptions}
          </select>
        </div>

        <div>
          <label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px;">
            Agent Account Address (where the badge currently lives)
          </label>
          <input id="revoke-account" type="text" placeholder="account_tdx_2_1..."
            style="width:100%;padding:10px;border-radius:8px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;font-size:14px;box-sizing:border-box;font-family:monospace;">
          <p style="font-size:11px;color:#8b949e;margin:4px 0 0;">
            The recall is executed directly from the vault of this account.
          </p>
        </div>

        <button id="btn-revoke-confirm"
          style="padding:12px;border-radius:8px;background:#c0392b;color:white;border:none;cursor:pointer;font-size:15px;font-weight:600;">
          🔴 Revoke Badge
        </button>

      </div>
    `,
  });

  setTimeout(() => {
    document.getElementById("btn-revoke-confirm")?.addEventListener("click", async () => {
      const badgeId      = document.getElementById("revoke-badge-select")?.value;
      const agentAccount = document.getElementById("revoke-account")?.value?.trim();

      if (!badgeId) {
        alert("Select an agent badge to revoke."); return;
      }
      if (!agentAccount || !agentAccount.startsWith("account_")) {
        alert("Invalid agent account address."); return;
      }

      closeHow();
      await executeRevoke(badgeId, agentAccount);
    });
  }, 50);
}

async function executeRevoke(badgeId, agentAccount) {
  const account        = APP_STATE.activeAccount.address;
  const ownerBadge     = APP_STATE.founderBadgeAddress;
  const component      = APP_STATE.componentAddress;
  const agentBadgeRes  = APP_STATE.agentBadgeResource;
  // Save state before TX — wallet subscriber may reset APP_STATE during signing
  const savedComponentAddress = APP_STATE.componentAddress;
  const savedIsFounder = APP_STATE.isFounder;

  // Fetch the vault address of the agent badge inside the agent account
  const vaultAddress = await getAgentBadgeVault(agentAccount);
  if (!vaultAddress) {
    alert("Could not find agent badge vault in the specified account.");
    return;
  }

  const manifest = `
CALL_METHOD
    Address("${account}")
    "create_proof_of_amount"
    Address("${ownerBadge}")
    Decimal("1")
;
CALL_DIRECT_VAULT_METHOD
    Address("${vaultAddress}")
    "recall_non_fungibles"
    Array<NonFungibleLocalId>(NonFungibleLocalId("${badgeId}"))
;
TAKE_ALL_FROM_WORKTOP
    Address("${agentBadgeRes}")
    Bucket("badge_bucket")
;
CALL_METHOD
    Address("${component}")
    "revoke_badge"
    Bucket("badge_bucket")
;
`;

  console.log("[revokeBadge] manifest:\n", manifest);

  try {
    await sendTransaction(manifest);
    closeHow();
    // Poll — pass saved componentAddress in case APP_STATE was reset during TX signing
    const prevCount = (APP_STATE.agentBadges || []).filter(b => b.active).length;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 3000));
      await loadCompanyState(savedComponentAddress, savedIsFounder);
      if ((APP_STATE.agentBadges || []).filter(b => b.active).length < prevCount) break;
    }
  } catch (err) {
    console.error("[revokeBadge] error:", err);
    alert("Transaction failed. Check console for details.");
  }
}

// ── Fetch the vault address of the AgentBadge inside a given account ──────────

async function getAgentBadgeVault(accountAddress) {
  try {
    const response = await fetch(`${CONFIG.GATEWAY_URL}/state/entity/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [accountAddress],
        aggregation_level: "Vault",
      }),
    });
    const data = await response.json();
    const nfResources = data?.items?.[0]?.non_fungible_resources?.items || [];

    for (const resource of nfResources) {
      if (resource.resource_address === APP_STATE.agentBadgeResource) {
        return resource.vaults?.items?.[0]?.vault_address || null;
      }
    }
    return null;
  } catch (err) {
    console.error("[revokeBadge] getAgentBadgeVault error:", err);
    return null;
  }
}
