// config.js — AI Venture Company v2
// Only protocol-level constants here.
// Everything else (component, badges, company name) is read dynamically from chain.

export const CONFIG = {

  // ── Network ───────────────────────────────────────────────────────────────
  NETWORK_ID:  2,
  GATEWAY_URL: "https://stokenet.radixdlt.com",

  // ── App ───────────────────────────────────────────────────────────────────
  APP_NAME:    "AI Venture Company",
  APP_VERSION: "2.0.0",

  // ── Tokens ────────────────────────────────────────────────────────────────
  XRD: "resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc",

  // ── Protocol ──────────────────────────────────────────────────────────────
  DAPP_DEFINITION:   "account_tdx_2_12y3allk5pgzrdw6rcrwxrvfua6nlx3vgfd9cxs678sjpyjzlvz0ghp",
  PACKAGE_ADDRESS:   "package_tdx_2_1p4vs262u77dy68x22uw6lsjvk4c5dnvsg5xnvv7m55ls5ucdt9h5ug",
  DEV_FEE_COLLECTOR: "component_tdx_2_1cqtw9374r0gz2t0yksxcggyv4uru0g52hnjqnwacr4hlfghxfm9nrq",
  PLATFORM_ACCOUNT:  "account_tdx_2_12y3allk5pgzrdw6rcrwxrvfua6nlx3vgfd9cxs678sjpyjzlvz0ghp",

  // ── Badge detection ───────────────────────────────────────────────────────
  FOUNDER_BADGE_SYMBOL: "AIFB",
  AGENT_BADGE_SYMBOL:   "AIAB",

  // ── Revenue split defaults ────────────────────────────────────────────────
  SPLIT_TREASURY:    0.60,
  SPLIT_AGENT:       0.25,
  SPLIT_CONTRIBUTOR: 0.10,
  SPLIT_PLATFORM:    0.05,

  // ── Session Manager (Railway) ─────────────────────────────────────────────
  // Set to your Railway URL when deployed. Empty string = SELF_HOSTED mode.
  SESSION_MANAGER_URL: "https://ai-venture-sdk-production.up.railway.app",
  // ── Telegram ──────────────────────────────────────────────────────────────
  // Group ID for local testing (without Railway)
  TELEGRAM_GROUP_ID:   "-5008865701",
  TELEGRAM_GROUP_LINK: "https://t.me/+eZKIDe6YLcY1NWJh",

  // ── Radix Dashboard ───────────────────────────────────────────────────────
  DASHBOARD_URL: "https://dashboard.radixscan.io",
  // ── Founder ───────────────────────────────────────────────────────────────
  FOUNDER_TELEGRAM_ID: "595365208",



};
