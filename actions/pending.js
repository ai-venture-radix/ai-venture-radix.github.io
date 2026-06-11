// actions/pending.js — Gary AI Ventures
// Handles pending action polling, parsing, display and approval.
// MODIFIED: added MintAgentBadge (variant 4) and RevokeAgentBadge (variant 5)

import { CONFIG }         from "../config.js";
import { APP_STATE }      from "../utils/state.js";
import { openActionModal, closeHow } from "../utils/modal.js";
import { sendTransaction } from "./radix.js";
import { loadCompanyState } from "../main.js";

// ─── Get Pending Action ───────────────────────────────────────────────────────

export async function getPendingTransfer() {
  if (!APP_STATE.componentAddress) return null;

  // Both founder and agent can have pending actions
  const badgeAddress = APP_STATE.isFounder
    ? APP_STATE.founderBadgeAddress
    : APP_STATE.agentBadgeResource;

  if (!badgeAddress) return null;

  const proofLine = APP_STATE.isFounder
    ? `CALL_METHOD Address("${APP_STATE.activeAccount.address}") "create_proof_of_amount" Address("${badgeAddress}") Decimal("1") ;`
    : `CALL_METHOD Address("${APP_STATE.activeAccount.address}") "create_proof_of_non_fungibles" Address("${badgeAddress}") Array<NonFungibleLocalId>(NonFungibleLocalId("${APP_STATE.agentBadgeLocalId}")) ;`;

  const manifest = `
${proofLine}
CALL_METHOD Address("${APP_STATE.componentAddress}") "get_pending_action" ;
`;

  const response = await fetch(`${CONFIG.GATEWAY_URL}/transaction/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      manifest,
      start_epoch_inclusive: 1,
      end_epoch_exclusive:   100,
      nonce: Math.floor(Math.random() * 1_000_000_000),
      signer_public_keys: [],
      notary_public_key: {
        key_type: "EddsaEd25519",
        key_hex:  "0000000000000000000000000000000000000000000000000000000000000001"
      },
      notary_is_signatory: true,
      tip_percentage: 0,
      flags: {
        use_free_credit:             true,
        assume_all_signature_proofs: true,
        skip_epoch_check:            true,
      },
    }),
  });

  const data   = await response.json();
  const output = data?.receipt?.output?.[1]?.programmatic_json;

  // Option::None
  if (!output || output.variant_id === "0") return null;

  // Option::Some
  const inner = output?.fields?.[0];
  if (!inner) return null;

  return parsePendingAction(inner);
}

// ─── Parse PendingAction enum ─────────────────────────────────────────────────
// variant_id: 0=Transfer, 1=WhitelistAdd, 2=UpdateLimits, 3=Custom,
//             4=MintAgentBadge (NEW), 5=RevokeAgentBadge (NEW)

function parsePendingAction(action) {
  const variantId = parseInt(action.variant_id ?? "-1");
  const fields    = action.fields || [];

  switch (variantId) {
    case 0: { // Transfer(PendingTransfer)
      const tf = fields[0]?.fields || [];
      return {
        type:             "Transfer",
        to:               tf[0]?.value,
        amount:           tf[1]?.value,
        asset:            tf[2]?.value,
        reason:           tf[3]?.value,
        requestedAtEpoch: tf[4]?.value,
      };
    }
    case 1: { // WhitelistAdd
      return {
        type:    "WhitelistAdd",
        name:    fields[0]?.value,
        address: fields[1]?.value,
        reason:  fields[2]?.value,
      };
    }
    case 2: { // UpdateLimits
      return {
        type:              "UpdateLimits",
        maxPerTransaction: fields[0]?.value,
        multisigThreshold: fields[1]?.value,
        dailyCap:          fields[2]?.value,
        reason:            fields[3]?.value,
      };
    }
    case 3: { // Custom
      return {
        type:             "Custom",
        actionType:       fields[0]?.value,
        description:      fields[1]?.value,
        payload:          fields[2]?.value,
        requestedAtEpoch: fields[3]?.value,
      };
    }
    case 4: { // MintAgentBadge (NEW)
      return {
        type:          "MintAgentBadge",
        agentName:     fields[0]?.value,
        role:          fields[1]?.value,
        spendingLimit: fields[2]?.value,
        revenueShare:  fields[3]?.value,
        destination:   fields[4]?.value,
        reason:        fields[5]?.value,
      };
    }
    case 5: { // RevokeAgentBadge (NEW)
      return {
        type:    "RevokeAgentBadge",
        badgeId: fields[0]?.value,
        reason:  fields[1]?.value,
      };
    }
    default:
      return null;
  }
}

// ─── Update Pending Card ──────────────────────────────────────────────────────

export function updatePendingCard(pending) {
  const card = document.getElementById("pending-approval-card");
  const icon = document.getElementById("pending-icon");
  const text = document.getElementById("pending-text");
  if (!card || !icon || !text) return;

  if (!pending) {
    card.classList.remove("active");
    card.classList.add("disabled");
    icon.textContent = "🔒";
    text.textContent = "No Pending Approvals";
    return;
  }

  card.classList.remove("disabled");
  card.classList.add("active");
  icon.textContent = "⚡";

  switch (pending.type) {
    case "Transfer":
      text.textContent = `Pending Transfer: ${pending.amount} XRD → ${pending.to?.slice(0, 12)}...`;
      break;
    case "WhitelistAdd":
      text.textContent = `Pending Whitelist: ${pending.name} — ${pending.address?.slice(0, 12)}...`;
      break;
    case "UpdateLimits":
      text.textContent = `Pending Limits: max ${pending.maxPerTransaction} / daily ${pending.dailyCap}`;
      break;
    case "MintAgentBadge":
      text.textContent = `Pending: Hire ${pending.agentName} as ${pending.role}`;
      break;
    case "RevokeAgentBadge":
      text.textContent = `Pending: Revoke Agent Badge #${pending.badgeId}`;
      break;
    case "Custom":
      text.textContent = `Pending: ${pending.actionType} — ${pending.description?.slice(0, 40)}...`;
      break;
    default:
      text.textContent = "Pending Action";
  }
}

// ─── Check and Open Pending ───────────────────────────────────────────────────

export async function checkAndOpenPending() {
  const pending = await getPendingTransfer();
  if (!pending) {
    alert("No pending actions at this time.");
    return;
  }

  openActionModal({
    title:       "⚡ Pending Founder Approval",
    content:     buildPendingContent(pending),
    hideConfirm: true,
    onConfirm:   async () => {},
  });

  setTimeout(() => {
    document.getElementById("btn-approve")?.addEventListener("click", async () => {
      closeHow();
      await approvePending(pending);
    });
    document.getElementById("btn-reject")?.addEventListener("click", async () => {
      closeHow();
      await rejectPending();
    });
  }, 50);
}

// ─── Build modal content per action type ─────────────────────────────────────

function buildPendingContent(pending) {
  let details = "";

  switch (pending.type) {
    case "Transfer":
      details = `
        <p style="font-size:14px;color:orange;margin:0;font-weight:600;">
          ${pending.amount} XRD → ${pending.to?.slice(0, 20)}...
        </p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;">Reason: ${pending.reason}</p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;">Epoch: ${pending.requestedAtEpoch}</p>
      `;
      break;
    case "WhitelistAdd":
      details = `
        <p style="font-size:14px;color:#79c0ff;margin:0;font-weight:600;">
          Add to Whitelist: ${pending.name}
        </p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;font-family:monospace;">${pending.address}</p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;">Reason: ${pending.reason}</p>
      `;
      break;
    case "UpdateLimits":
      details = `
        <p style="font-size:14px;color:#ffa657;margin:0;font-weight:600;">Update Spending Limits</p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;">Max per TX: ${pending.maxPerTransaction} XRD</p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;">Multisig threshold: ${pending.multisigThreshold} XRD</p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;">Daily cap: ${pending.dailyCap} XRD</p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;">Reason: ${pending.reason}</p>
      `;
      break;
    case "MintAgentBadge": // NEW
      details = `
        <p style="font-size:14px;color:#3fb950;margin:0;font-weight:600;">
          🪪 Hire: ${pending.agentName}
        </p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;">Role: ${pending.role}</p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;">Spending limit: ${pending.spendingLimit} XRD/tx</p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;">Revenue share: ${(parseFloat(pending.revenueShare || 0) * 100).toFixed(0)}%</p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;font-family:monospace;word-break:break-all;">To: ${pending.destination}</p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;">Reason: ${pending.reason}</p>
      `;
      break;
    case "RevokeAgentBadge": // NEW
      details = `
        <p style="font-size:14px;color:#f85149;margin:0;font-weight:600;">
          🔴 Revoke Agent Badge #${pending.badgeId}
        </p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;">Reason: ${pending.reason}</p>
        <p style="font-size:12px;color:#f85149;margin:8px 0 0;">
          ⚠️ The agent will immediately lose all access.
        </p>
      `;
      break;
    case "Custom":
      details = `
        <p style="font-size:14px;color:#d2a8ff;margin:0;font-weight:600;">${pending.actionType}</p>
        <p style="font-size:12px;color:#8b949e;margin:4px 0 0;">${pending.description}</p>
        <p style="font-size:11px;color:#8b949e;margin:4px 0 0;font-family:monospace;word-break:break-all;">${pending.payload}</p>
      `;
      break;
  }

  return `
    <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">
      <div style="background:#0d1117;border-radius:8px;padding:12px;border:1px solid rgba(255,165,0,0.3);">
        <p style="font-size:12px;color:#8b949e;margin:0 0 8px;">Agent is requesting:</p>
        ${details}
      </div>
      <div style="display:flex;gap:12px;">
        <button id="btn-approve"
          style="flex:1;padding:12px;border-radius:8px;background:#238636;color:white;border:none;cursor:pointer;font-size:15px;font-weight:600;">
          ✅ Approve
        </button>
        <button id="btn-reject"
          style="flex:1;padding:12px;border-radius:8px;background:#c0392b;color:white;border:none;cursor:pointer;font-size:15px;font-weight:600;">
          ❌ Reject
        </button>
      </div>
    </div>
  `;
}

// ─── Approve ──────────────────────────────────────────────────────────────────

async function approvePending(pending) {
  const account    = APP_STATE.activeAccount.address;
  const ownerBadge = APP_STATE.founderBadgeAddress;
  const component  = CONFIG.COMPONENT_ADDRESS;

  let manifest = `
CALL_METHOD
    Address("${account}")
    "create_proof_of_amount"
    Address("${ownerBadge}")
    Decimal("1")
;
CALL_METHOD
    Address("${component}")
    "approve_action"
;
`;

  // Transfer — deposit returned funds to destination
  if (pending.type === "Transfer") {
    manifest += `
TAKE_ALL_FROM_WORKTOP
    Address("${pending.asset}")
    Bucket("approved_bucket")
;
CALL_METHOD
    Address("${pending.to}")
    "try_deposit_or_abort"
    Bucket("approved_bucket")
    Enum<0u8>()
;
`;
  }

  console.log("[pending] APPROVE MANIFEST:\n", manifest);

  try {
    await sendTransaction(manifest);
    updatePendingCard(null);
    // Refresh agents table if a badge was minted or revoked
    if (pending.type === "MintAgentBadge" || pending.type === "RevokeAgentBadge") {
      await loadCompanyState();
    }
  } catch (err) {
    console.error("[pending] approve error:", err);
    alert("Transaction failed. Check console for details.");
  }
}

// ─── Reject ───────────────────────────────────────────────────────────────────

async function rejectPending() {
  const account    = APP_STATE.activeAccount.address;
  const ownerBadge = APP_STATE.founderBadgeAddress;
  const component  = CONFIG.COMPONENT_ADDRESS;

  const manifest = `
CALL_METHOD
    Address("${account}")
    "create_proof_of_amount"
    Address("${ownerBadge}")
    Decimal("1")
;
CALL_METHOD
    Address("${component}")
    "reject_action"
;
`;

  try {
    await sendTransaction(manifest);
    updatePendingCard(null);
  } catch (err) {
    console.error("[pending] reject error:", err);
    alert("Transaction failed. Check console for details.");
  }
}
