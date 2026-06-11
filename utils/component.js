import { CONFIG } from "../config.js";
import { APP_STATE } from "./state.js";

export async function getComponentBalance() {
  try {
    const response = await fetch(
      `${CONFIG.GATEWAY_URL}/state/entity/details`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addresses: [APP_STATE.componentAddress],
          aggregation_level: "Vault",
        })
      }
    );
    const data = await response.json();
    const fungibles = data?.items?.[0]?.fungible_resources?.items || [];
console.log(">>> component fungibles:", fungibles);
console.log(">>> some balance > 0:", fungibles.some(r => parseFloat(r.vaults?.items?.[0]?.amount || 0) > 0));


    // true si cualquier vault tiene amount > 0
    return fungibles.some(r => parseFloat(r.vaults?.items?.[0]?.amount || 0) > 0);

  } catch (err) {
    console.error("getComponentBalance ERROR:", err);
    return false;
  }
}
