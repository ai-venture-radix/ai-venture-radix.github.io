// utils/state.js — Gary AI Ventures

export const APP_STATE = {

  // ── Wallet / connection ───────────────────────────────────────────────────
  walletData:    null,
  activeAccount: null,

  // ── Role detection ────────────────────────────────────────────────────────
  isFounder: false,
  hasAgent:  false,

  // ── Badge data of connected account ───────────────────────────────────────
  founderBadgeAddress:  null,
  agentBadgeResource:   null,
  agentBadgeLocalId:    null,

  // ── Component ─────────────────────────────────────────────────────────────
  componentAddress: null,

  // ── Company state (loaded from chain) ────────────────────────────────────
  companyName:     null,
  treasuryBalance: null,
  totalRevenue:    null,
  badgeCounter:    0,

  // ── Agents list (loaded from get_agent_badges) ────────────────────────────
  // Each entry: { id, agent_name, role, active, spending_limit, revenue_share, account? }
  // account is set when the session manager creates the programmatic account (DEMO mode)
  agentBadges: [],

  // ── Active session ────────────────────────────────────────────────────────
  session: null,
  // session shape: { sessionId, inviteLink, expiresAt, agents[] }

  // ── Polling lock — prevents wallet subscriber from resetting state during polls
  polling: false,

  // ── Legacy ────────────────────────────────────────────────────────────────
  hasBalance:        false,
  ownerBadgeAddress: null,

};
