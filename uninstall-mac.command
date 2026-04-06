#!/bin/bash
# uninstall-mac.command
# Leadership Schedule — Desinstalador macOS
#
# USAGE: Double-click this file in Finder. macOS will open it in Terminal.

set -euo pipefail

APP_NAME="Leadership Schedule"
APP_BUNDLE="Leadership Schedule.app"

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}ℹ️  $*${NC}"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $*${NC}"; }
error()   { echo -e "${RED}❌ $*${NC}"; }

clear
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   🗑️   Leadership Schedule — Desinstalador Mac   ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Find the app ──────────────────────────────────────────────────────────────
APP_PATH=""
if [[ -d "/Applications/$APP_BUNDLE" ]]; then
  APP_PATH="/Applications/$APP_BUNDLE"
elif [[ -d "$HOME/Applications/$APP_BUNDLE" ]]; then
  APP_PATH="$HOME/Applications/$APP_BUNDLE"
fi

if [[ -z "$APP_PATH" ]]; then
  warn "No se encontró \"${APP_NAME}\" instalada en este Mac."
  warn "Ubicaciones buscadas:"
  warn "  • /Applications/${APP_BUNDLE}"
  warn "  • ~/Applications/${APP_BUNDLE}"
  echo ""
  info "Presiona Enter para cerrar."
  read -r
  exit 0
fi

# ── Confirm uninstall ─────────────────────────────────────────────────────────
info "Se encontró la app en: $APP_PATH"
echo ""
echo -e "${BOLD}¿Estás seguro de que quieres desinstalar \"${APP_NAME}\"? [s/N]${NC} "
read -r -t 15 CONFIRM || CONFIRM="n"
CONFIRM="${CONFIRM:-n}"

if [[ "${CONFIRM,,}" != "s" ]]; then
  info "Desinstalación cancelada."
  exit 0
fi

# ── Remove app bundle ─────────────────────────────────────────────────────────
echo ""
info "Eliminando $APP_PATH ..."
rm -rf "$APP_PATH"
success "App eliminada correctamente"

# ── Clean up Chrome temp data ──────────────────────────────────────────────────
CHROME_DATA="/tmp/ls-schedule-chrome"
if [[ -d "$CHROME_DATA" ]]; then
  info "Limpiando datos temporales de Chrome..."
  rm -rf "$CHROME_DATA"
  success "Datos temporales eliminados"
fi

# ── Unregister from Launch Services ──────────────────────────────────────────
LS_REGISTER="/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister"
if [[ -f "$LS_REGISTER" ]]; then
  "$LS_REGISTER" -u "$APP_PATH" 2>/dev/null || true
fi

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       ✅  Desinstalación completada              ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
success "\"${APP_NAME}\" ha sido eliminada de tu Mac."
echo ""
info "Los datos de localStorage guardados en el navegador no se han eliminado."
info "Si quieres reinstalar en el futuro, descarga install-mac.command de nuevo."
echo ""
info "Presiona Enter para cerrar."
read -r
