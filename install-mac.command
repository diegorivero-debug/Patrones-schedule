#!/bin/bash
# install-mac.command
# Leadership Schedule — macOS Installer
#
# USAGE: Double-click this file in Finder. macOS will open it in Terminal.
# PERMISSIONS: This file must be executable. If you cloned the repo, run:
#   chmod +x install-mac.command
#
# What this script does:
#   1. Creates /Applications/Leadership Schedule.app (or ~/Applications as fallback)
#   2. Downloads all app files from GitHub
#   3. Generates an icon for the Dock
#   4. Registers the app with macOS Launch Services
#   5. Opens the app automatically

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────
APP_NAME="Leadership Schedule"
APP_BUNDLE="Leadership Schedule.app"
REPO_BASE="https://raw.githubusercontent.com/diegorivero-debug/Patrones-schedule/main"
INSTALL_VERSION="$(date +%Y%m%d)"

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Helpers ──────────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}ℹ️  $*${NC}"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $*${NC}"; }
error()   { echo -e "${RED}❌ $*${NC}"; }
step()    { echo -e "\n${BOLD}$*${NC}"; }

# ── Welcome ───────────────────────────────────────────────────────────────────
clear
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     📅  Leadership Schedule — Instalador Mac     ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
info "Este instalador creará \"${APP_NAME}.app\" en tu Mac."
info "Necesitas conexión a internet para descargar los archivos."
echo ""

# ── Check macOS ───────────────────────────────────────────────────────────────
if [[ "$(uname)" != "Darwin" ]]; then
  error "Este instalador es solo para macOS."
  exit 1
fi

# ── Determine install location ────────────────────────────────────────────────
step "📂 Paso 1/6: Eligiendo ubicación de instalación..."

if [[ -w "/Applications" ]]; then
  INSTALL_DIR="/Applications"
  info "Instalando en /Applications (disponible para todos los usuarios)"
else
  INSTALL_DIR="$HOME/Applications"
  mkdir -p "$INSTALL_DIR"
  warn "Sin permisos de administrador. Instalando en ~/Applications"
fi

APP_PATH="$INSTALL_DIR/$APP_BUNDLE"

# Remove previous installation if it exists
if [[ -d "$APP_PATH" ]]; then
  warn "Versión anterior encontrada. Reemplazando..."
  rm -rf "$APP_PATH"
fi

# ── Create .app bundle structure ──────────────────────────────────────────────
step "🏗️  Paso 2/6: Creando estructura de la app..."

CONTENTS_DIR="$APP_PATH/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
APP_DIR="$RESOURCES_DIR/app"

mkdir -p "$MACOS_DIR"
mkdir -p "$RESOURCES_DIR"
mkdir -p "$APP_DIR/js"
mkdir -p "$APP_DIR/css"

success "Estructura de directorios creada"

# ── Download app files ────────────────────────────────────────────────────────
step "⬇️  Paso 3/6: Descargando archivos de la aplicación..."

download() {
  local url="$1"
  local dest="$2"
  local name
  name="$(basename "$dest")"
  echo -n "  Descargando ${name}... "
  if curl -fsSL "$url" -o "$dest"; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    error "No se pudo descargar: $url"
    error "Verifica tu conexión a internet e inténtalo de nuevo."
    exit 1
  fi
}

# HTML pages
download "$REPO_BASE/index.html"                      "$APP_DIR/index.html"
download "$REPO_BASE/dashboard.html"                  "$APP_DIR/dashboard.html"
download "$REPO_BASE/equipo.html"                     "$APP_DIR/equipo.html"
download "$REPO_BASE/vacaciones.html"                 "$APP_DIR/vacaciones.html"
download "$REPO_BASE/planificador-13w.html"           "$APP_DIR/planificador-13w.html"
download "$REPO_BASE/auditor.html"                    "$APP_DIR/auditor.html"
download "$REPO_BASE/equity.html"                     "$APP_DIR/equity.html"
download "$REPO_BASE/ajustes.html"                    "$APP_DIR/ajustes.html"

# JavaScript files
download "$REPO_BASE/js/config.js"                    "$APP_DIR/js/config.js"
download "$REPO_BASE/js/app.js"                       "$APP_DIR/js/app.js"
download "$REPO_BASE/js/auditor.js"                   "$APP_DIR/js/auditor.js"
download "$REPO_BASE/js/equity.js"                    "$APP_DIR/js/equity.js"
download "$REPO_BASE/js/planificador.js"              "$APP_DIR/js/planificador.js"
download "$REPO_BASE/js/team-registry.js"             "$APP_DIR/js/team-registry.js"
download "$REPO_BASE/js/vacaciones.js"                "$APP_DIR/js/vacaciones.js"

# CSS files
download "$REPO_BASE/css/styles.css"                  "$APP_DIR/css/styles.css"
download "$REPO_BASE/css/index.css"                   "$APP_DIR/css/index.css"
download "$REPO_BASE/css/ajustes.css"                 "$APP_DIR/css/ajustes.css"
download "$REPO_BASE/css/auditor.css"                 "$APP_DIR/css/auditor.css"
download "$REPO_BASE/css/equity.css"                  "$APP_DIR/css/equity.css"
download "$REPO_BASE/css/planificador.css"            "$APP_DIR/css/planificador.css"
download "$REPO_BASE/css/vacaciones.css"              "$APP_DIR/css/vacaciones.css"

# CSV patterns
download "$REPO_BASE/patron_dia_normal.csv"           "$APP_DIR/patron_dia_normal.csv"
download "$REPO_BASE/patron_martes_commercial.csv"    "$APP_DIR/patron_martes_commercial.csv"
download "$REPO_BASE/patron_miercoles_leadership.csv" "$APP_DIR/patron_miercoles_leadership.csv"
download "$REPO_BASE/patron_sabado.csv"               "$APP_DIR/patron_sabado.csv"

success "Todos los archivos descargados correctamente"

# ── Write the install version marker ─────────────────────────────────────────
echo "$INSTALL_VERSION" > "$APP_DIR/.install_version"

# ── Create launch.sh ─────────────────────────────────────────────────────────
step "🚀 Paso 4/6: Creando script de lanzamiento..."

APP_INDEX="file://$APP_DIR/index.html"
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

cat > "$MACOS_DIR/launch.sh" << LAUNCH_SCRIPT
#!/bin/bash
# launch.sh — Opens Leadership Schedule as a standalone app window
# Auto-generated by install-mac.command

APP_INDEX="file://$APP_DIR/index.html"
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME_DATA="/tmp/ls-schedule-chrome"

if [[ -f "\$CHROME_BIN" ]]; then
  "\$CHROME_BIN" \\
    --app="\$APP_INDEX" \\
    --user-data-dir="\$CHROME_DATA" \\
    --no-first-run \\
    --disable-extensions \\
    2>/dev/null &
else
  open -a Safari "\$APP_INDEX"
fi
LAUNCH_SCRIPT

chmod +x "$MACOS_DIR/launch.sh"
success "launch.sh creado y con permisos de ejecución"

# ── Create Info.plist ─────────────────────────────────────────────────────────
step "📋 Paso 5/6: Configurando Info.plist..."

cat > "$CONTENTS_DIR/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launch.sh</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
    <key>CFBundleIdentifier</key>
    <string>com.leadership.schedule</string>
    <key>CFBundleName</key>
    <string>Leadership Schedule</string>
    <key>CFBundleDisplayName</key>
    <string>Leadership Schedule</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
PLIST

success "Info.plist configurado"

# ── Generate icon ─────────────────────────────────────────────────────────────
step "🎨 Paso 6/6: Generando icono para el Dock..."

# Check if Python 3 is available for icon generation
PYTHON_BIN=""
if command -v python3 &>/dev/null; then
  PYTHON_BIN="python3"
elif command -v python &>/dev/null; then
  PYTHON_BIN="python"
fi

ICON_CREATED=false

if [[ -n "$PYTHON_BIN" ]] && command -v iconutil &>/dev/null && command -v sips &>/dev/null; then
  ICONSET_TMP=$(mktemp -d)/icon.iconset
  mkdir -p "$ICONSET_TMP"

  # Generate a PNG using Python (no external deps needed)
  "$PYTHON_BIN" << 'PYTHON_ICON'
import struct, zlib, os, sys

def make_png(width, height, bg_r, bg_g, bg_b):
    """Generate a simple gradient PNG with 'LS' text placeholder."""
    def pack_chunk(name, data):
        c = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)

    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter type
        for x in range(width):
            # Gradient background: dark blue top-left to lighter blue bottom-right
            factor = (x / width + y / height) / 2
            r = int(bg_r + (30 - bg_r) * factor) & 0xFF
            g = int(bg_g + (115 - bg_g) * factor) & 0xFF
            b_val = int(bg_b + (232 - bg_b) * factor) & 0xFF

            # Rounded corner mask (approximate)
            corner = min(width, height) * 0.2
            cx, cy = x - width/2, y - height/2
            # White calendar body (inner rect)
            margin = width * 0.14
            header_h = height * 0.22
            if (margin < x < width - margin) and (height * 0.23 < y < height * 0.86):
                # Header area
                if (margin < x < width - margin) and (height * 0.23 < y < height * 0.23 + header_h):
                    r, g, b_val = 26, 87, 176
                else:
                    r, g, b_val = 245, 247, 255
            raw += bytes([r, g, b_val])

    compressed = zlib.compress(raw)
    png = b'\x89PNG\r\n\x1a\n'
    png += pack_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    png += pack_chunk(b'IDAT', compressed)
    png += pack_chunk(b'IEND', b'')
    return png

iconset = os.environ.get('ICONSET_TMP', '/tmp/icon.iconset')
sizes = [16, 32, 64, 128, 256, 512]
for s in sizes:
    data = make_png(s, s, 13, 71, 161)
    with open(f'{iconset}/icon_{s}x{s}.png', 'wb') as f:
        f.write(data)
    # @2x version
    data2x = make_png(s*2, s*2, 13, 71, 161)
    with open(f'{iconset}/icon_{s}x{s}@2x.png', 'wb') as f:
        f.write(data2x)
print("Icons generated successfully")
PYTHON_ICON

  export ICONSET_TMP
  "$PYTHON_BIN" << PYTHON_ICON2
import struct, zlib, os

def make_png(width, height):
    def pack_chunk(name, data):
        c = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)
    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            factor = (x / width + y / height) / 2
            r = int(13 + (30 - 13) * factor) & 0xFF
            g = int(71 + (115 - 71) * factor) & 0xFF
            b = int(161 + (232 - 161) * factor) & 0xFF
            margin = width * 0.14
            header_h = height * 0.22
            if (margin < x < width - margin) and (height * 0.23 < y < height * 0.86):
                if (margin < x < width - margin) and (height * 0.23 < y < height * 0.23 + header_h):
                    r, g, b = 26, 87, 176
                else:
                    r, g, b = 245, 247, 255
            raw += bytes([r, g, b])
    compressed = zlib.compress(raw)
    png = b'\x89PNG\r\n\x1a\n'
    png += pack_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    png += pack_chunk(b'IDAT', compressed)
    png += pack_chunk(b'IEND', b'')
    return png

iconset = "$ICONSET_TMP"
sizes = [16, 32, 64, 128, 256, 512]
for s in sizes:
    with open(f'{iconset}/icon_{s}x{s}.png', 'wb') as f:
        f.write(make_png(s, s))
    with open(f'{iconset}/icon_{s}x{s}@2x.png', 'wb') as f:
        f.write(make_png(s*2, s*2))
PYTHON_ICON2

  if iconutil -c icns "$ICONSET_TMP" -o "$RESOURCES_DIR/icon.icns" 2>/dev/null; then
    ICON_CREATED=true
    success "Icono generado correctamente"
  else
    warn "No se pudo convertir a .icns (iconutil falló)"
  fi
  rm -rf "$(dirname "$ICONSET_TMP")"
fi

if [[ "$ICON_CREATED" == "false" ]]; then
  warn "No se pudo generar el icono. La app funcionará sin icono personalizado."
  warn "Puedes añadir un icono manualmente más tarde desde icons/icon.svg del repositorio."
fi

# ── Register with Launch Services ────────────────────────────────────────────
LS_REGISTER="/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister"
if [[ -f "$LS_REGISTER" ]]; then
  "$LS_REGISTER" -f "$APP_PATH" 2>/dev/null || true
  success "App registrada con Launch Services"
fi

# Touch the app bundle so Finder picks it up
touch "$APP_PATH"

# ── Open the app ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║          🎉  ¡Instalación completada!            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
success "\"${APP_NAME}\" instalada en: $APP_PATH"
echo ""
info "Puedes abrir la app desde:"
info "  • Launchpad"
info "  • Finder > Aplicaciones > Leadership Schedule"
info "  • Spotlight: Cmd+Space → 'Leadership Schedule'"
echo ""

# Ask user if they want to open it now
echo -e "${BOLD}¿Abrir Leadership Schedule ahora? [S/n]${NC} "
read -r -t 10 OPEN_NOW || OPEN_NOW="s"
OPEN_NOW="${OPEN_NOW:-s}"

if [[ "${OPEN_NOW,,}" != "n" ]]; then
  info "Abriendo la app..."
  open "$APP_PATH" 2>/dev/null || bash "$MACOS_DIR/launch.sh"
  success "¡App abierta! Búscala en el Dock."
fi

echo ""
info "Para desinstalar, ejecuta: uninstall-mac.command"
echo ""
