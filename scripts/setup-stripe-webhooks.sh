#!/usr/bin/env bash
# ─── PrinceMarketing.ai — Stripe Webhook Registration ──────────────────────
#
# Prerequisites:
#   1. Install Stripe CLI: brew install stripe/stripe-cli/stripe
#   2. Login: stripe login
#   3. Set DOMAIN below to your production domain
#
# Usage:
#   ./scripts/setup-stripe-webhooks.sh
#   ./scripts/setup-stripe-webhooks.sh --live   # For production
#
# ────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DOMAIN="${STRIPE_WEBHOOK_DOMAIN:-https://princemarketing.ai}"
WEBHOOK_PATH="/api/stripe/webhook"
WEBHOOK_URL="${DOMAIN}${WEBHOOK_PATH}"

# Events we care about
EVENTS=(
  # Checkout
  "checkout.session.completed"
  "checkout.session.expired"

  # Subscriptions
  "customer.subscription.created"
  "customer.subscription.updated"
  "customer.subscription.deleted"
  "customer.subscription.paused"
  "customer.subscription.resumed"
  "customer.subscription.trial_will_end"

  # Invoices
  "invoice.paid"
  "invoice.payment_failed"
  "invoice.finalized"

  # Payment intents
  "payment_intent.succeeded"
  "payment_intent.payment_failed"

  # Customer
  "customer.created"
  "customer.updated"
  "customer.deleted"
)

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PrinceMarketing.ai — Stripe Webhook Setup                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Webhook URL: ${WEBHOOK_URL}"
echo "Events: ${#EVENTS[@]}"
echo ""

# Join events with commas
EVENTS_CSV=$(IFS=,; echo "${EVENTS[*]}")

if [[ "${1:-}" == "--live" ]]; then
  echo "[LIVE MODE] Creating production webhook endpoint..."
  echo ""
  stripe webhook_endpoints create \
    --url="${WEBHOOK_URL}" \
    --enabled-events="${EVENTS_CSV}"
  echo ""
  echo "Done. Copy the webhook signing secret (whsec_...) to your .env:"
  echo "  STRIPE_WEBHOOK_SECRET=whsec_..."
else
  echo "[DEV MODE] Forwarding events to local server..."
  echo ""
  echo "Starting Stripe CLI listener..."
  echo "Press Ctrl+C to stop."
  echo ""
  stripe listen \
    --forward-to="localhost:3000${WEBHOOK_PATH}" \
    --events="${EVENTS_CSV}"
fi
