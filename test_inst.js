const intentHash = "txid_rdx1rfky844qk3dj7n79kmaszdtmcxg7pzvxj9d9hj0gma49ygcnspesxnjn5f";
const GATEWAY_URL = "https://mainnet.radixdlt.com";
const DEV_FEE_COLLECTOR = "component_rdx1crdwdgyxmrqsph2qdghf294364sue6cceyapg6uf2yd60e2ll9ckpd";

async function getInstantiateDetails(intentHash) {
  const response = await fetch(`${GATEWAY_URL}/transaction/committed-details`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      intent_hash: intentHash,
      opt_ins: { receipt_state_changes: true }
    })
  });

  const data = await response.json();
  const newGlobalEntities = data?.transaction?.receipt?.state_updates?.new_global_entities || [];

  console.log("new_global_entities:", JSON.stringify(newGlobalEntities, null, 2));

  const componentAddress = newGlobalEntities.find(e =>
    e.entity_type === "GlobalGenericComponent"
  )?.entity_address || null;

  const ownerBadgeAddress = newGlobalEntities.find(e =>
    e.entity_type === "GlobalFungibleResource"
  )?.entity_address || null;

  const agentBadgeAddress = newGlobalEntities.find(e =>
    e.entity_type === "GlobalNonFungibleResource"
  )?.entity_address || null;

  return { componentAddress, ownerBadgeAddress, agentBadgeAddress, badgeLocalId: "#1#" };
}

getInstantiateDetails(intentHash)
  .then(r => console.log("RESULT:", JSON.stringify(r, null, 2)))
  .catch(console.error);
