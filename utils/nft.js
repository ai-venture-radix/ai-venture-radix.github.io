// utils/nft.js — AI Venture Company
// Detects FounderBadge and AgentBadge by symbol metadata.
// No hardcoded resource addresses — works for any company created with this package.

import { CONFIG } from "../config.js";
import { APP_STATE } from "./state.js";

function getMeta(metadata, key) {
  const entry = metadata.find(m => m.key === key);
  return entry?.value?.typed?.value || null;
}

function getMetaArray(metadata, key) {
  const entry = metadata.find(m => m.key === key);
  return entry?.value?.typed?.values || [];
}

export async function accountHasAgent(accountAddress) {
  try {
    const response = await fetch(`${CONFIG.GATEWAY_URL}/state/entity/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [accountAddress],
        aggregation_level: "Vault",
        opt_ins: {
          non_fungible_include_nfids: true,
          explicit_metadata: ["name", "symbol", "component", "dapp_definitions"]
        }
      }),
    });

    const data = await response.json();
    const item = data?.items?.[0];
    const fungibles    = item?.fungible_resources?.items     || [];
    const nonFungibles = item?.non_fungible_resources?.items || [];

    let isFounder = false;
    let hasAgent  = false;

    // ── Detect FounderBadge ───────────────────────────────────────────────
    // Match by symbol "AIFB" and dapp_definitions containing our package
    for (const resource of fungibles) {
      const metadata = resource.explicit_metadata?.items || [];
      const symbol   = getMeta(metadata, "symbol");
      const amount   = parseFloat(resource.vaults?.items?.[0]?.amount || "0");

      if (symbol === CONFIG.FOUNDER_BADGE_SYMBOL && amount === 1) {
        // Read component address from badge metadata
        const componentAddress = getMeta(metadata, "component");

        if (componentAddress) {
          isFounder = true;
          APP_STATE.isFounder           = true;
          APP_STATE.founderBadgeAddress = resource.resource_address;
          APP_STATE.ownerBadgeAddress   = resource.resource_address;
          APP_STATE.componentAddress    = componentAddress;
          console.log("[nft] FounderBadge detected:", resource.resource_address);
          console.log("[nft] Component:", componentAddress);

          // Read agent badge resource from component state
          await loadAgentBadgeResource(componentAddress);
        }
      }
    }

    // ── Detect AgentBadge ─────────────────────────────────────────────────
    // Match by symbol "AIAB"
    for (const resource of nonFungibles) {
      const metadata = resource.explicit_metadata?.items || [];
      const symbol   = getMeta(metadata, "symbol");

      if (symbol === CONFIG.AGENT_BADGE_SYMBOL) {
        const vaultItem = resource.vaults?.items?.[0];
        const nfids     = vaultItem?.items || [];

        if (nfids.length > 0) {
          hasAgent = true;
          APP_STATE.hasAgent           = true;
          APP_STATE.agentBadgeResource = resource.resource_address;
          APP_STATE.agentBadgeLocalId  = nfids[0];

          // If we don't have a componentAddress yet, try to get it from badge metadata
          if (!APP_STATE.componentAddress) {
            const componentAddress = getMeta(metadata, "component");
            if (componentAddress) {
              APP_STATE.componentAddress = componentAddress;
            }
          }
          console.log("[nft] AgentBadge detected:", resource.resource_address, "id:", nfids[0]);
        }
      }
    }

    console.log("[nft] Detection result — isFounder:", isFounder, "hasAgent:", hasAgent);
    return isFounder || hasAgent;

  } catch (err) {
    console.error("[nft] Detection error:", err);
    return false;
  }
}

// ── Read agent badge resource address from component state ────────────────────
// The component stores the agent_badge_manager resource address in its state.
// We read it via the Gateway entity details endpoint.

async function loadAgentBadgeResource(componentAddress) {
  try {
    const response = await fetch(`${CONFIG.GATEWAY_URL}/state/entity/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [componentAddress],
        aggregation_level: "Global",
      }),
    });

    const data = await response.json();
    const fields = data?.items?.[0]?.details?.state?.fields || [];

    // Find agent_badge_manager field — it's a ResourceManager reference
    const badgeManagerField = fields.find(f =>
      f.field_name === "agent_badge_manager"
    );

    if (badgeManagerField?.value) {
      APP_STATE.agentBadgeResource = badgeManagerField.value;
      console.log("[nft] AgentBadgeResource from component:", badgeManagerField.value);
    }

  } catch (err) {
    console.error("[nft] loadAgentBadgeResource error:", err);
  }
}
