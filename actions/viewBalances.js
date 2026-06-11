import { CONFIG }         from "../config.js";
import { APP_STATE }      from "../utils/state.js";
import { openActionModal } from "../utils/modal.js";

// ─── Fetch vault fungible balances ────────────────────────────────────────────

async function fetchComponentBalances() {
  const response = await fetch(
    `${CONFIG.GATEWAY_URL}/state/entity/details`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [APP_STATE.componentAddress],
        aggregation_level: "Vault",
        opt_ins: { explicit_metadata: ["name", "symbol"] },
      }),
    }
  );
  const data      = await response.json();
  const fungibles = data?.items?.[0]?.fungible_resources?.items || [];
  return fungibles.map(resource => {
    const metadata = resource.explicit_metadata?.items || [];
    const name     = metadata.find(m => m.key === "name")?.value?.typed?.value   || "Unknown";
    const symbol   = metadata.find(m => m.key === "symbol")?.value?.typed?.value || "???";
    const amount   = parseFloat(resource.vaults?.items?.[0]?.amount || 0).toFixed(4);
    return { name, symbol, amount };
  });
}

// ─── Fetch component state fields ─────────────────────────────────────────────
// Reads founder_account (renamed from notarizer_account in AICompany v2)

async function fetchComponentState() {
  const response = await fetch(
    `${CONFIG.GATEWAY_URL}/state/entity/details`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses: [APP_STATE.componentAddress] }),
    }
  );
  const data   = await response.json();
  const fields = data?.items?.[0]?.details?.state?.fields ?? [];
  const getField = name => fields.find(f => f.field_name === name)?.value ?? "—";

  return {
    agentBadgeResource: getField("agent_badge_manager"),
    ownerBadgeAddress:  getField("owner_badge_address"),
    // AICompany v2 uses founder_account — fallback to notarizer_account for v1
    founderAccount:     getField("founder_account") !== "—"
                          ? getField("founder_account")
                          : getField("notarizer_account"),
  };
}

// ─── Fetch agent account balances (XRD) ──────────────────────────────────────
// Reads the XRD balance of each active agent's programmatic account

async function fetchAgentBalances(badges) {
  const active = badges.filter(b => b.active && b.account);
  if (!active.length) return [];

  const results = await Promise.all(
    active.map(async b => {
      try {
        const res  = await fetch(`${CONFIG.GATEWAY_URL}/state/entity/details`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            addresses: [b.account],
            aggregation_level: "Vault",
            opt_ins: { explicit_metadata: ["symbol"] },
          }),
        });
        const data      = await res.json();
        const fungibles = data?.items?.[0]?.fungible_resources?.items || [];
        const xrd       = fungibles.find(r =>
          r.resource_address === CONFIG.XRD
        );
        const amount = parseFloat(xrd?.vaults?.items?.[0]?.amount || 0).toFixed(4);
        return { name: b.agent_name, role: b.role, account: b.account, amount };
      } catch {
        return { name: b.agent_name, role: b.role, account: b.account, amount: "—" };
      }
    })
  );
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function viewBalances() {
  if (!APP_STATE.componentAddress) {
    console.error("[viewBalances] Missing componentAddress");
    return;
  }

  const [balances, state, agentBalances] = await Promise.all([
    fetchComponentBalances(),
    fetchComponentState(),
    fetchAgentBalances(APP_STATE.agentBadges || []),
  ]);

  // ── Vault balance rows ──────────────────────────────────────────────────────
  const vaultRows = balances.length > 0
    ? balances.map(b => `
        <div style="display:flex;justify-content:space-between;align-items:center;
          padding:10px;border-radius:8px;background:#0a0f1a;border:1px solid #1f2937;">
          <span style="font-size:13px;color:#8b949e;">${b.symbol} — ${b.name}</span>
          <span style="font-size:14px;font-weight:600;color:#276ff5;">${b.amount}</span>
        </div>`).join("")
    : `<p style="color:#555;font-size:13px;text-align:center;">No assets in treasury vault.</p>`;

  // ── Agent wallet rows ───────────────────────────────────────────────────────
  const agentRows = agentBalances.length > 0
    ? agentBalances.map(a => `
        <div style="padding:10px;border-radius:8px;background:#0a0f1a;border:1px solid #1f2937;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:13px;color:#e6edf3;font-weight:600;">${a.role} Wallet</span>
            <span style="font-size:14px;font-weight:600;color:#276ff5;">${a.amount} XRD</span>
          </div>
          <p style="font-size:11px;color:#555;margin:0 0 2px;">${a.name}</p>
          <p style="font-size:11px;font-family:monospace;color:#8b949e;margin:0;word-break:break-all;">${a.account}</p>
          <a href="${CONFIG.DASHBOARD_URL}/account/${a.account}" target="_blank"
            style="display:inline-block;margin-top:4px;font-size:11px;color:#276ff5;text-decoration:none;">
            View on Dashboard ↗
          </a>
        </div>`).join("")
    : `<p style="color:#555;font-size:13px;text-align:center;">No active agent accounts found.</p>`;

  // ── Address block helper ────────────────────────────────────────────────────
  const addressBlock = (label, value, type = "resource") => `
    <div style="padding:10px;border-radius:8px;background:#0a0f1a;border:1px solid #1f2937;">
      <p style="font-size:11px;color:#555;margin:0 0 4px;">${label}</p>
      <p style="font-size:11px;font-family:monospace;color:#8b949e;margin:0;word-break:break-all;">${value}</p>
      ${value !== "—" ? `
        <a href="${CONFIG.DASHBOARD_URL}/${type}/${value}" target="_blank"
          style="display:inline-block;margin-top:4px;font-size:11px;color:#276ff5;text-decoration:none;">
          View on Dashboard ↗
        </a>` : ""}
    </div>`;

  openActionModal({
    title: "Balances & Addresses",
    hideConfirm: true,
    content: `
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">

        <!-- Treasury vault -->
        <p style="font-size:11px;color:#555;margin:0 0 2px;text-transform:uppercase;letter-spacing:0.05em;">
          Treasury Vault
        </p>
        ${vaultRows}

        <!-- Agent wallets -->
        <div style="margin-top:8px;border-top:1px solid #1f2937;padding-top:8px;">
          <p style="font-size:11px;color:#555;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">
            Agent Wallets
          </p>
        </div>
        ${agentRows}

        <!-- Contract addresses -->
        <div style="margin-top:8px;border-top:1px solid #1f2937;padding-top:8px;">
          <p style="font-size:11px;color:#555;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">
            Contract Info
          </p>
        </div>
        ${addressBlock("Component Address", APP_STATE.componentAddress, "component")}
        ${addressBlock("Agent Badge Resource (AIAB)", state.agentBadgeResource, "resource")}
        ${addressBlock("Founder Badge Resource (AIFB)", state.ownerBadgeAddress, "resource")}
        ${addressBlock("Founder Account", state.founderAccount, "account")}

        <a href="${CONFIG.DASHBOARD_URL}/component/${APP_STATE.componentAddress}"
          target="_blank"
          style="display:inline-block;margin-top:4px;font-size:12px;color:#276ff5;
            text-decoration:none;text-align:center;">
          View Component on Radix Dashboard ↗
        </a>

      </div>
    `,
  });
}
