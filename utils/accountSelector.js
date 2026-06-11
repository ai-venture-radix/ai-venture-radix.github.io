import { APP_STATE } from "./state.js";
import { accountHasAgent } from "./nft.js";
import { getComponentBalance } from "./component.js";
import { updateInstantiateButton, updateUI } from "./ui.js";
import { getHasWhitelist } from "../actions/whitelist.js";
import { getPendingTransfer, updatePendingCard } from "../actions/pending.js";


export async function renderAccountSelector(accounts) {
  const container = document.getElementById("account-selector-container");
  const select    = document.getElementById("account-select");
  if (!container || !select) return;

  container.classList.remove("hidden");
  select.innerHTML = "";

  accounts.forEach((account) => {
    const option = document.createElement("option");
    option.value = account.address;
    option.textContent = `${account.label} - ${account.address.slice(0, 10)}...`;
    select.appendChild(option);
  });

  // ── Carga inicial — primera cuenta ──
  await updateAccountState(accounts[0]);

  // ── Cambio manual ──
  // select.onchange = async (e) => {
  //   const selected = accounts.find(a => a.address === e.target.value);
  //   await updateAccountState(selected);
  // };
select.onchange = async (e) => {
  const selected = accounts.find(a => a.address === e.target.value);
  APP_STATE.activeAccount = selected;
  // Trigger full detection from main.js
  await window.onAccountChanged(selected);
};
    

}
export async function updateAccountState(account) {
  APP_STATE.activeAccount     = account;
  APP_STATE.ownerBadgeAddress = null;
  APP_STATE.componentAddress  = null;
  APP_STATE.agentAccountAddress  = null;
  APP_STATE.agentBadgeAddress = null;
  APP_STATE.agentBadgeLocalId = null;
  APP_STATE.isFounder         = false; 
  APP_STATE.hasAgent          = false;
  APP_STATE.hasBalance        = false;
  APP_STATE.hasWhitelist      = false;

//   const hasAgent = await accountHasAgent(account.address);
//   APP_STATE.hasAgent = hasAgent;
//   console.log(">>> hasAgent:", hasAgent);
//   console.log(">>> componentAddress:", APP_STATE.componentAddress);
//
//   let hasBalance   = false;
//   let hasWhitelist = false;
//
//   if (hasAgent && APP_STATE.componentAddress) {
//     hasBalance = await getComponentBalance();
//     APP_STATE.hasBalance = hasBalance;
//     console.log(">>> hasBalance:", hasBalance);
//
//     hasWhitelist = await getHasWhitelist();
//     APP_STATE.hasWhitelist = hasWhitelist;
//     console.log(">>> hasWhitelist:", hasWhitelist);
//   } else {
//     console.log(">>> skipping — hasAgent:", hasAgent, "componentAddress:", APP_STATE.componentAddress);
//   }
//
//   updateInstantiateButton(hasAgent);
//   // updateUI is called by main.js with the correct isFounder/hasAgent params
//   // Do NOT call updateUI here — it would overwrite the correct state
//
//   console.log("Account updated:", account.address);
//   console.log("hasAgent:", hasAgent, "hasBalance:", hasBalance, "hasWhitelist:", hasWhitelist);
//   console.log("APP_STATE:", { ...APP_STATE });
//
//
// // al final de updateAccountState
// if (hasAgent && APP_STATE.componentAddress) {
//   const pending = await getPendingTransfer();
//   updatePendingCard(pending);
// }


}
