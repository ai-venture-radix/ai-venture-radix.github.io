// main.js — Gary AI Ventures v2

import {
  RadixDappToolkit,
  DataRequestBuilder,
} from "@radixdlt/radix-dapp-toolkit";

import { CONFIG }                from "./config.js";
import { APP_STATE }             from "./utils/state.js";
import { accountHasAgent }       from "./utils/nft.js";
import { renderAccountSelector } from "./utils/accountSelector.js";
import { updateUI, renderCompanyOverview, renderAgentsTable, updateCompanyName } from "./utils/ui.js";
import { renderSessionCard }     from "./actions/agentSession.js";

// ── Actions ───────────────────────────────────────────────────────────────────

import { deposit }                       from "./actions/deposit.js";
import { freeze }                        from "./actions/freeze.js";
import { unfreeze }                      from "./actions/unfreeze.js";
import { emergencyWithdraw }             from "./actions/emergencyWithdraw.js";
import { increaseLimits }                from "./actions/increaseLimits.js";
import { resetDailyCap }                 from "./actions/resetDailyCap.js";
import { viewBalances }                  from "./actions/viewBalances.js";
import { addWhitelist, removeWhitelist } from "./actions/whitelist.js";
import { revokeBadge }                   from "./actions/revokeBadge.js";
import { mintAgentBadge }                from "./actions/mintAgentBadge.js";
import { depositWithSplit }              from "./actions/depositWithSplit.js";
import { updateSplits }                  from "./actions/updateSplits.js";
import { showInstantiateModal }          from "./actions/instantiate.js";

import {
  getPendingTransfer,
  updatePendingCard,
  checkAndOpenPending,
} from "./actions/pending.js";

import {
  openHow, openAbout, openTerms, openDisclaimer, openPrivacy,
  closeHow, closeDisclaimer, openActionModal, openLimitsModal,
} from "./utils/modal.js";

// ── Expose to window ──────────────────────────────────────────────────────────

window.deposit             = deposit;
window.revokeBadge         = revokeBadge;
window.increaseLimits      = increaseLimits;
window.resetDailyCap       = resetDailyCap;
window.viewBalances        = viewBalances;
window.mintAgentBadge      = mintAgentBadge;
window.depositWithSplit    = depositWithSplit;
window.updateSplits        = updateSplits;
window.checkAndOpenPending = checkAndOpenPending;
window.openHow             = openHow;
window.openAbout           = openAbout;
window.openTerms           = openTerms;
window.openDisclaimer      = openDisclaimer;
window.openPrivacy         = openPrivacy;
window.closeHow            = closeHow;
window.closeDisclaimer     = closeDisclaimer;
window.closeModal          = closeHow;
window.openLimitsModal     = openLimitsModal;
window.freeze              = freeze;
window.unfreeze            = unfreeze;
window.showInstantiateModal = showInstantiateModal;

// ── Whitelist modal ───────────────────────────────────────────────────────────

window.toggleWhitelist = function () {
  openActionModal({
    title: "Whitelist",
    hideConfirm: true,
    content: `
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">
        <button id="btn-add-wl" style="padding:12px;border-radius:8px;background:#276ff5;color:white;border:none;cursor:pointer;font-size:15px;font-weight:600;">
          ➕ Add wallet to whitelist
        </button>
        <button id="btn-remove-wl" style="padding:12px;border-radius:8px;background:#7c4dff;color:white;border:none;cursor:pointer;font-size:15px;font-weight:600;">
          ➖ Remove wallet from whitelist
        </button>
      </div>
    `,
  });
  setTimeout(() => {
    document.getElementById("btn-add-wl")?.addEventListener("click", () => { closeHow(); addWhitelist(); });
    document.getElementById("btn-remove-wl")?.addEventListener("click", () => { closeHow(); removeWhitelist(); });
  }, 50);
};

// ── Emergency modal ───────────────────────────────────────────────────────────

window.openEmergencyModal = function () {
  openActionModal({
    title: "🔴 Emergency Controls",
    hideConfirm: true,
    content: `
      <p style="color:#8b949e;font-size:13px;margin:0 0 16px;">
        Select an action. Each will require your signature in Radix Wallet.
      </p>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">
        <button id="btn-freeze" style="padding:12px;border-radius:8px;background:#1a1a2e;border:1px solid #444;color:white;cursor:pointer;font-size:15px;font-weight:600;text-align:left;">
          🧊 Freeze — Lock all agent activity
        </button>
        <button id="btn-unfreeze" style="padding:12px;border-radius:8px;background:#1a1a2e;border:1px solid #444;color:white;cursor:pointer;font-size:15px;font-weight:600;text-align:left;">
          🔓 Unfreeze — Restore agent operations
        </button>
        <button id="btn-withdraw" style="padding:12px;border-radius:8px;background:#2d0000;border:1px solid #c0392b;color:#ff6b6b;cursor:pointer;font-size:15px;font-weight:600;text-align:left;">
          💸 Emergency Withdraw — Recover ALL funds
        </button>
      </div>
    `,
  });
  setTimeout(() => {
    document.getElementById("btn-freeze")?.addEventListener("click",   () => { closeHow(); freeze(); });
    document.getElementById("btn-unfreeze")?.addEventListener("click", () => { closeHow(); unfreeze(); });
    document.getElementById("btn-withdraw")?.addEventListener("click", () => { closeHow(); emergencyWithdraw(); });
  }, 50);
};

// ── Init Radix Dapp Toolkit ───────────────────────────────────────────────────

export const rdt = RadixDappToolkit({
  dAppDefinitionAddress: CONFIG.DAPP_DEFINITION,
  networkId:             CONFIG.NETWORK_ID,
  applicationName:       CONFIG.APP_NAME,
  applicationVersion:    CONFIG.APP_VERSION,
});

rdt.walletApi.setRequestData(
  DataRequestBuilder.accounts().atLeast(1)
);

// ── Wallet subscription ───────────────────────────────────────────────────────

window.onAccountChanged = async function(account) {
  APP_STATE.activeAccount = account;
  const prevComponentAddress = APP_STATE.componentAddress;
  APP_STATE.isFounder = false;
  APP_STATE.hasAgent  = false;

  await accountHasAgent(account.address);

  // Restore componentAddress if wallet subscriber reset it during TX signing
  if (!APP_STATE.componentAddress && prevComponentAddress) {
    APP_STATE.componentAddress = prevComponentAddress;
  }

  console.log("[main] isFounder:", APP_STATE.isFounder, "hasAgent:", APP_STATE.hasAgent);

  if (!APP_STATE.isFounder && !APP_STATE.hasAgent) {
    updateUI(false, false, true);
    return;
  }

  await loadCompanyState();
  updateUI(APP_STATE.isFounder, APP_STATE.hasAgent);
};

rdt.walletApi.walletData$.subscribe(async (walletData) => {
  APP_STATE.walletData = walletData;
  if (!walletData?.accounts?.length) return;
  if (APP_STATE.polling) return;  // Don't reset state during active polling

  renderAccountSelector(walletData.accounts);
  await window.onAccountChanged(walletData.accounts[0]);
});

// ── Load company state from Gateway ──────────────────────────────────────────

export async function loadCompanyState(forceComponentAddress = null, forceIsFounder = null) {
  if (forceComponentAddress) APP_STATE.componentAddress = forceComponentAddress;
  if (forceIsFounder !== null) APP_STATE.isFounder = forceIsFounder;
  try {
    // ── get_company_info ──────────────────────────────────────────────────────
    const infoResponse = await fetch(`${CONFIG.GATEWAY_URL}/transaction/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manifest: `
CALL_METHOD
    Address("${APP_STATE.componentAddress}")
    "get_company_info"
;
        `,
        start_epoch_inclusive: 1,
        end_epoch_exclusive:   100,
        nonce: Math.floor(Math.random() * 1_000_000_000),
        signer_public_keys: [],
        notary_public_key: {
          key_type: "EddsaEd25519",
          key_hex: "0000000000000000000000000000000000000000000000000000000000000001"
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

    const infoData   = await infoResponse.json();
    const infoFields = infoData?.receipt?.output?.[0]?.programmatic_json?.fields || [];

    APP_STATE.companyName     = infoFields[0]?.value || CONFIG.COMPANY_NAME;
    APP_STATE.treasuryBalance = infoFields[1]?.value || "0";
    APP_STATE.totalRevenue    = infoFields[2]?.value || "0";
    APP_STATE.badgeCounter    = parseInt(infoFields[3]?.value || "0");
    APP_STATE.hasBalance      = parseFloat(APP_STATE.treasuryBalance) > 0;
    updateCompanyName(APP_STATE.companyName);

    console.log("[main] Company info:", APP_STATE.companyName, APP_STATE.treasuryBalance, APP_STATE.totalRevenue);

    // ── get_agent_badges ──────────────────────────────────────────────────────
    const badgesResponse = await fetch(`${CONFIG.GATEWAY_URL}/transaction/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manifest: `
CALL_METHOD
    Address("${APP_STATE.componentAddress}")
    "get_agent_badges"
;
        `,
        start_epoch_inclusive: 1,
        end_epoch_exclusive:   100,
        nonce: Math.floor(Math.random() * 1_000_000_000),
        signer_public_keys: [],
        notary_public_key: {
          key_type: "EddsaEd25519",
          key_hex: "0000000000000000000000000000000000000000000000000000000000000001"
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

    const badgesData  = await badgesResponse.json();
    const badgesArray = badgesData?.receipt?.output?.[0]?.programmatic_json?.elements || [];

    APP_STATE.agentBadges = badgesArray.map(tuple => {
      const fields = tuple?.fields || [];
      const data   = fields[1]?.fields || [];
      return {
        id:             fields[0]?.value,
        agent_name:     data[0]?.value,
        role:           data[1]?.value,
        created_epoch:  data[2]?.value,
        active:         data[3]?.value === "true" || data[3]?.value === true,
        spending_limit: data[4]?.value,
        revenue_share:  data[5]?.value,
        account:        data[6]?.value ?? null,
      };
    });

    console.log("[main] Agent badges loaded:", APP_STATE.agentBadges.length);

    // ── Render ────────────────────────────────────────────────────────────────
    renderCompanyOverview();
    renderAgentsTable(APP_STATE.agentBadges);
    if (APP_STATE.isFounder) renderSessionCard();
    if (APP_STATE.isFounder || APP_STATE.hasAgent) {
      updateUI(APP_STATE.isFounder, APP_STATE.hasAgent);
    }

  } catch (err) {
    console.error("[main] loadCompanyState error:", err);
  }
}

// ── Pending actions polling ───────────────────────────────────────────────────

function startPendingPolling() {
  setInterval(async () => {
    if (!(APP_STATE.isFounder || APP_STATE.hasAgent)) return;
    if (!APP_STATE.componentAddress) return;
    const pending = await getPendingTransfer();
    updatePendingCard(pending);
  }, 15_000);
}

startPendingPolling();
