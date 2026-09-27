#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# jago.sh — one entry point for GitHub ↔ local ↔ VPS operations.
#
# WHY THIS EXISTS
# The three halves of this project (working copy, GitHub, production host) drift
# apart silently: on 9 Sep 2026 the VPS was four merged PRs behind `main` and
# nothing on the site said so. Every command here is READ-ONLY except `deploy`,
# which only dispatches the human-approved workflow. Nothing in this file
# rebuilds, restarts, or migrates anything by itself — that stays human-gated
# (CLAUDE.md §d.4 / SSOT §9.6).
#
# Usage:  bash scripts/ops/jago.sh <command>
#   doctor          verify every credential/link in the chain (run this first)
#   status          local vs origin vs VPS, containers, health — the daily check
#   ci [n]          recent CI runs
#   health          live health + readiness (reads deps.redis, not the HTTP code)
#   logs <svc> [n]  tail a container's logs (api|web|worker|postgres|redis|…)
#   vps <cmd…>      run an arbitrary command on the host
#   drift           what is on main but not yet on the VPS
#   deploy <tag>    dispatch the Deploy workflow (still needs GitHub approval)
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

REPO="haluanitcore/Jago-Akademi-Website1"
VPS_ALIAS="jago-vps"
VPS_FALLBACK="root@212.85.26.131"
DEPLOY_PATH="/var/www/jago-akademi"
# BL-43: this host runs vps.yml. prod.yml publishes no host ports and detaches
# the site from host nginx → 502 sitewide. Never swap this constant.
COMPOSE="docker-compose.vps.yml"
SITE="https://jagoakademi.com"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32mOK\033[0m   %s\n' "$*"; }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$*"; }
warn() { printf '  \033[33mWARN\033[0m %s\n' "$*"; }

# Prefer the ~/.ssh/config alias; fall back to the literal target so the script
# still works on a machine that has the key but not the config entry.
vps() {
  if ssh -o BatchMode=yes -o ConnectTimeout=10 "$VPS_ALIAS" true 2>/dev/null; then
    ssh -o BatchMode=yes "$VPS_ALIAS" "$@"
  else
    ssh -o BatchMode=yes -o ConnectTimeout=15 -i ~/.ssh/id_jago_vps "$VPS_FALLBACK" "$@"
  fi
}

cmd_doctor() {
  bold "── Credentials & links ─────────────────────────────────────────"
  if gh auth status >/dev/null 2>&1; then
    ok "gh CLI authenticated as $(gh api user --jq .login 2>/dev/null)"
  else
    bad "gh CLI NOT authenticated -> run: gh auth login"
  fi
  if git ls-remote --exit-code origin >/dev/null 2>&1; then
    ok "git fetch/push to origin works"
  else
    bad "cannot reach origin"
  fi
  if vps 'echo' >/dev/null 2>&1; then
    ok "SSH to VPS works"
  else
    bad "SSH to VPS FAILED -> check ~/.ssh/config alias '$VPS_ALIAS' and key id_jago_vps"
  fi
  if vps "cd $DEPLOY_PATH && git ls-remote --exit-code origin >/dev/null" 2>/dev/null; then
    ok "VPS -> GitHub deploy key works (host can git pull)"
  else
    bad "VPS cannot reach GitHub"
  fi

  bold "── GitHub Actions config (CD) ──────────────────────────────────"
  local secrets vars s v
  secrets=$(gh secret list --repo "$REPO" 2>/dev/null | awk '{print $1}')
  for s in DEPLOY_HOST DEPLOY_USER DEPLOY_PATH DEPLOY_SSH_KEY; do
    if grep -qx "$s" <<<"$secrets"; then ok "secret $s"; else bad "secret $s MISSING -> CD cannot deploy"; fi
  done
  vars=$(gh variable list --repo "$REPO" 2>/dev/null | awk '{print $1}')
  for v in NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_API_URL API_PROXY_TARGET; do
    if grep -qx "$v" <<<"$vars"; then ok "variable $v"; else bad "variable $v MISSING -> web image builds with an empty API origin"; fi
  done
  if gh api "repos/$REPO/environments/production" >/dev/null 2>&1; then
    ok "environment 'production' exists"
  else
    warn "environment 'production' missing -> the deploy job cannot start (create it in repo Settings)"
  fi

  bold "── Host registry auth ──────────────────────────────────────────"
  # The CD workflow logs in per run, so a missing config here is EXPECTED and
  # fine. It only matters for a hand-run 'docker compose pull' on the host.
  if vps 'test -f ~/.docker/config.json' 2>/dev/null; then
    ok "host has a registry credential (manual pulls work)"
  else
    warn "host not logged in to GHCR — fine for CD (it logs in per run), but a manual 'compose pull' will 401"
  fi
}

cmd_status() {
  bold "── Working copy ────────────────────────────────────────────────"
  printf '  branch  %s\n' "$(git rev-parse --abbrev-ref HEAD)"
  printf '  head    %s\n' "$(git log --oneline -1)"
  local dirty ab
  dirty=$(git status --porcelain | wc -l | tr -d ' ')
  if [ "$dirty" -eq 0 ]; then ok "clean tree"; else warn "$dirty uncommitted file(s)"; fi
  git fetch -q origin 2>/dev/null
  ab=$(git rev-list --left-right --count origin/main...HEAD 2>/dev/null)
  printf '  vs origin/main: behind %s, ahead %s\n' "$(cut -f1 <<<"$ab")" "$(cut -f2 <<<"$ab")"

  bold "── GitHub ──────────────────────────────────────────────────────"
  gh run list --repo "$REPO" --limit 3 \
    --json status,conclusion,displayTitle,headBranch \
    --template '{{range .}}  {{.status}}/{{if .conclusion}}{{.conclusion}}{{else}}-{{end}}  {{.headBranch}}  {{.displayTitle}}{{"\n"}}{{end}}' 2>/dev/null \
    || warn "could not read CI runs"
  printf '  open PRs: %s\n' "$(gh pr list --repo "$REPO" --state open --json number --jq 'length' 2>/dev/null)"

  bold "── VPS ─────────────────────────────────────────────────────────"
  local host_head behind
  host_head=$(vps "cd $DEPLOY_PATH && git log --oneline -1" 2>/dev/null)
  if [ -z "$host_head" ]; then bad "unreachable"; return; fi
  printf '  deployed %s\n' "$host_head"
  behind=$(vps "cd $DEPLOY_PATH && git fetch -q origin main 2>/dev/null; git rev-list --count HEAD..origin/main" 2>/dev/null | tr -d '\r')
  if [ "${behind:-0}" -gt 0 ]; then
    warn "VPS is $behind commit(s) BEHIND origin/main — the live site is not running current main"
  else
    ok "VPS is level with origin/main"
  fi
  vps "cd $DEPLOY_PATH && docker compose -f $COMPOSE ps --format '  {{.Name}}  {{.Status}}'" 2>/dev/null

  bold "── Live ────────────────────────────────────────────────────────"
  cmd_health
}

cmd_health() {
  local code ready redis
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 12 "$SITE")
  if [ "$code" = "200" ]; then ok "GET $SITE -> 200"; else bad "GET $SITE -> $code"; fi
  ready=$(curl -s --max-time 12 "$SITE/api/ready")
  # RUNBOOK_DEPLOY.md: /api/ready answers 200 even when the queue is disabled —
  # it reports redis:"skipped" and still computes ready=true. Read the dep, not
  # the status code, or a dead reconciliation worker looks perfectly healthy.
  redis=$(sed -n 's/.*"redis"[: ]*"\([a-z]*\)".*/\1/p' <<<"$ready")
  case "$redis" in
    ok)      ok "api/ready redis=ok" ;;
    skipped) bad "api/ready redis=SKIPPED — queue is off; BL-144 reconciliation is NOT running" ;;
    "")      warn "api/ready returned no redis field: ${ready:0:140}" ;;
    *)       bad "api/ready redis=$redis" ;;
  esac
}

cmd_drift() {
  git fetch -q origin
  local host_sha
  host_sha=$(vps "cd $DEPLOY_PATH && git rev-parse HEAD" 2>/dev/null | tr -d '\r')
  if [ -z "$host_sha" ]; then bad "VPS unreachable"; return 1; fi
  bold "Commits on origin/main that the VPS is NOT running:"
  git log --oneline "$host_sha..origin/main" 2>/dev/null || warn "host commit $host_sha unknown locally — fetch first"
}

cmd_logs() {
  local svc="${1:-api}" n="${2:-100}"
  vps "cd $DEPLOY_PATH && docker compose -f $COMPOSE logs --tail=$n --no-color $svc"
}

cmd_deploy() {
  local tag="${1:-}"
  if [ -z "$tag" ]; then echo "usage: jago.sh deploy <tag-or-sha>"; return 1; fi
  bold "Dispatching the Deploy workflow for '$tag'"
  echo "  This only QUEUES the run. The 'production' environment gate still needs a"
  echo "  human approval, and the pre-deploy DB backup (RUNBOOK_DEPLOY.md §9) is"
  echo "  still a manual step — take it BEFORE approving."
  gh workflow run deploy.yml --repo "$REPO" -f ref="$tag" || return 1
  gh run list --repo "$REPO" --workflow deploy.yml --limit 3
}

case "${1:-status}" in
  doctor) cmd_doctor ;;
  status) cmd_status ;;
  health) cmd_health ;;
  drift)  cmd_drift ;;
  ci)     gh run list --repo "$REPO" --limit "${2:-10}" ;;
  logs)   shift; cmd_logs "$@" ;;
  vps)    shift; vps "$@" ;;
  deploy) shift; cmd_deploy "$@" ;;
  *)      sed -n '12,21p' "$0" ;;
esac
