#!/usr/bin/env bash
# ============================================================
#  🔍 PESANKU — Debug, Security & Vulnerability Checker
#  Jalankan : bash check.sh
#  Flag      : --fix   → auto-fix masalah ringan
#              --build → jalankan next build (lambat)
#              --json  → simpan hasil ke check-report.json
# ============================================================

# ── Warna ────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

# ── Argumen ──────────────────────────────────────────────────
AUTO_FIX=false; RUN_BUILD=false; JSON_OUT=false
for arg in "$@"; do
  [[ "$arg" == "--fix"   ]] && AUTO_FIX=true
  [[ "$arg" == "--build" ]] && RUN_BUILD=true
  [[ "$arg" == "--json"  ]] && JSON_OUT=true
done

# ── Counter ──────────────────────────────────────────────────
PASS=0; WARN_COUNT=0; FAIL_COUNT=0
declare -a JSON_LINES=()

# ── Helpers ──────────────────────────────────────────────────
pass() {
  echo -e "${GREEN}✅ ${NC}$*"
  ((PASS++))
  JSON_LINES+=("  {\"status\":\"pass\",\"msg\":\"$(echo "$*" | sed 's/"/\\"/g')\"}")
}
warn() {
  echo -e "${YELLOW}⚠️  ${NC}$*"
  ((WARN_COUNT++))
  JSON_LINES+=("  {\"status\":\"warn\",\"msg\":\"$(echo "$*" | sed 's/"/\\"/g')\"}")
}
fail() {
  echo -e "${RED}❌ ${NC}$*"
  ((FAIL_COUNT++))
  JSON_LINES+=("  {\"status\":\"fail\",\"msg\":\"$(echo "$*" | sed 's/"/\\"/g')\"}")
}
info()   { echo -e "${CYAN}ℹ️  ${NC}$*"; }
header() {
  echo ""
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}  $* ${NC}"
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}
cmd_exists() { command -v "$1" &>/dev/null; }

# ── Banner ───────────────────────────────────────────────────
clear
echo -e "${BOLD}${CYAN}"
echo " ____  _____ ____    _    _   _ _  ___   _ "
echo "|  _ \| ____/ ___|  / \  | \ | | |/ / | | |"
echo "| |_) |  _| \___ \ / _ \ |  \| | ' /| | | |"
echo "|  __/| |___ ___) / ___ \| |\  | . \| |_| |"
echo "|_|   |_____|____/_/   \_\_| \_|_|\_\\\\___/ "
echo "  Debug · Security · Vulnerability Checker"
echo -e "${NC}"
echo -e "  Waktu   : $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "  Proyek  : $(basename "$(pwd)")"
echo -e "  Auto-fix: ${AUTO_FIX}  |  Build: ${RUN_BUILD}  |  JSON: ${JSON_OUT}"

# ============================================================
# 1. ENVIRONMENT & KONFIGURASI
# ============================================================
header "1. ENVIRONMENT & KONFIGURASI"

# Node.js
if cmd_exists node; then
  NODE_VER=$(node -v)
  NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
  pass "Node.js: $NODE_VER"
  if [[ "$NODE_MAJOR" -lt 18 ]]; then
    fail "Node.js $NODE_VER terlalu lama — minimal v18 untuk Next.js"
  else
    pass "Versi Node.js memenuhi syarat minimum (v18+)"
  fi
else
  fail "Node.js tidak ditemukan"
fi

# npm
if cmd_exists npm; then
  pass "npm: $(npm -v)"
else
  fail "npm tidak ditemukan"
fi

# .env.local
if [[ -f ".env.local" ]]; then
  pass ".env.local ditemukan"
  if grep -q "\.env\.local" .gitignore 2>/dev/null; then
    pass ".env.local ada di .gitignore"
  else
    fail ".env.local TIDAK ada di .gitignore — risiko kredensial bocor!"
    if $AUTO_FIX; then
      echo ".env.local" >> .gitignore
      warn "AUTO-FIX: .env.local ditambahkan ke .gitignore"
    fi
  fi
else
  warn ".env.local tidak ditemukan"
fi

# .env.example
if [[ -f ".env.example" ]]; then
  pass ".env.example ditemukan"
else
  warn ".env.example tidak ditemukan — buat sebagai dokumentasi variabel env"
fi

# .gitignore
if [[ -f ".gitignore" ]]; then
  pass ".gitignore ditemukan"
else
  fail ".gitignore tidak ditemukan!"
fi

# ============================================================
# 2. KEAMANAN FILE & KREDENSIAL
# ============================================================
header "2. KEAMANAN FILE & KREDENSIAL"

# Hardcoded secrets di src/
info "Memeriksa hardcoded credentials di src/..."
PATTERNS=(
  "password\s*=\s*['\"][^'\"]{4,}"
  "secret\s*=\s*['\"][^'\"]{4,}"
  "api_key\s*=\s*['\"][^'\"]{4,}"
  "TURSO_AUTH_TOKEN\s*=\s*['\"][^'\"]{8,}"
  "CLOUDINARY_API_SECRET\s*=\s*['\"][^'\"]{4,}"
)
CRED_FOUND=false
for pat in "${PATTERNS[@]}"; do
  MATCH=$(grep -rniE "$pat" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)
  if [[ -n "$MATCH" ]]; then
    fail "Potensi hardcoded credential (pattern: ${pat:0:30}...):"
    echo "$MATCH" | head -3 | sed 's/^/    /'
    CRED_FOUND=true
  fi
done
$CRED_FOUND || pass "Tidak ada hardcoded credentials di src/"

# node_modules di Git
if git ls-files node_modules 2>/dev/null | grep -q .; then
  fail "node_modules ter-commit ke Git — jalankan: git rm -r --cached node_modules"
else
  pass "node_modules tidak ter-commit ke Git"
fi

# .next di Git
if git ls-files .next 2>/dev/null | grep -q .; then
  warn ".next folder ter-commit ke Git — tambahkan ke .gitignore"
else
  pass ".next tidak ter-commit ke Git"
fi

# File sensitif pernah di-commit
info "Memeriksa file sensitif di Git history..."
HIST_FOUND=false
for sf in ".env" ".env.local" ".env.production"; do
  if git log --all --name-only --format='' 2>/dev/null | grep -Fxq "$sf"; then
    fail "File '$sf' pernah di-commit ke Git history!"
    HIST_FOUND=true
  fi
done
$HIST_FOUND || pass "Tidak ada file sensitif di Git history"

# ============================================================
# 3. DEPENDENCY AUDIT
# ============================================================
header "3. DEPENDENCY AUDIT"

info "Menjalankan npm audit (maks 60 detik)..."
if cmd_exists npm; then
  # Jalankan audit tanpa --json agar tidak perlu python3
  AUDIT_TEXT=$(timeout 60 npm audit 2>&1 || true)

  if echo "$AUDIT_TEXT" | grep -qi "critical"; then
    CRIT_N=$(echo "$AUDIT_TEXT" | grep -oiE "[0-9]+ critical" | grep -oE "[0-9]+" | head -1)
    fail "npm audit — ${CRIT_N:-?} Critical vulnerability!"
  fi
  if echo "$AUDIT_TEXT" | grep -qi "high"; then
    HIGH_N=$(echo "$AUDIT_TEXT" | grep -oiE "[0-9]+ high" | grep -oE "[0-9]+" | head -1)
    fail "npm audit — ${HIGH_N:-?} High vulnerability!"
  fi
  if echo "$AUDIT_TEXT" | grep -qi "moderate"; then
    warn "npm audit — terdapat Moderate vulnerability"
  fi
  if echo "$AUDIT_TEXT" | grep -qiE "found 0 vulnerabilities|no known vulnerabilities"; then
    pass "npm audit: tidak ada vulnerability"
  fi

  if $AUTO_FIX && echo "$AUDIT_TEXT" | grep -qiE "critical|high"; then
    info "AUTO-FIX: Menjalankan npm audit fix..."
    timeout 120 npm audit fix 2>&1 | tail -5 || true
  fi
else
  warn "npm tidak tersedia — lewati audit"
fi

# Package outdated (cepat, tanpa JSON)
info "Memeriksa package outdated (maks 30 detik)..."
OUTDATED=$(timeout 30 npm outdated 2>/dev/null || true)
if [[ -n "$OUTDATED" ]]; then
  COUNT=$(echo "$OUTDATED" | tail -n +2 | grep -c . || true)
  warn "$COUNT package outdated — jalankan: npm update"
  echo "$OUTDATED" | head -8 | sed 's/^/  /'
else
  pass "Semua package up-to-date"
fi

# ============================================================
# 4. TYPESCRIPT & LINT
# ============================================================
header "4. TYPESCRIPT & LINT"

# TypeScript check
info "Menjalankan TypeScript type-check (maks 90 detik)..."
if cmd_exists npx; then
  TSC_OUT=$(timeout 90 npx tsc --noEmit 2>&1 || true)
  if [[ -n "$TSC_OUT" ]]; then
    TS_ERR=$(echo "$TSC_OUT" | grep -c "error TS" || true)
    fail "TypeScript: $TS_ERR error ditemukan"
    echo "$TSC_OUT" | grep "error TS" | head -10 | sed 's/^/  /'
  else
    pass "TypeScript: tidak ada error"
  fi
else
  warn "npx tidak tersedia — lewati TypeScript check"
fi

# ESLint
info "Menjalankan ESLint (maks 60 detik)..."
if cmd_exists npx; then
  LINT_OUT=$(timeout 60 npx eslint src/ --ext .ts,.tsx 2>&1 || true)
  LINT_ERR=$(echo "$LINT_OUT" | grep -cE "^\s+[0-9]+:[0-9]+\s+error" || true)
  LINT_WRN=$(echo "$LINT_OUT" | grep -cE "^\s+[0-9]+:[0-9]+\s+warning" || true)
  if [[ "$LINT_ERR" -gt 0 ]]; then
    fail "ESLint: $LINT_ERR error"
    echo "$LINT_OUT" | grep -E "^\s+[0-9]+:[0-9]+\s+error" | head -10 | sed 's/^/  /'
  else
    pass "ESLint: tidak ada error"
  fi
  if [[ "$LINT_WRN" -gt 0 ]]; then
    warn "ESLint: $LINT_WRN warning"
  else
    pass "ESLint: tidak ada warning"
  fi
  if $AUTO_FIX && [[ "$LINT_ERR" -gt 0 ]]; then
    info "AUTO-FIX: Menjalankan eslint --fix..."
    timeout 60 npx eslint src/ --ext .ts,.tsx --fix 2>/dev/null || true
  fi
else
  warn "npx tidak tersedia — lewati ESLint"
fi

# ============================================================
# 5. KEAMANAN KODE (PATTERN ANALYSIS)
# ============================================================
header "5. KEAMANAN KODE (PATTERN ANALYSIS)"

SRC="src"

# SQL injection (template literal di query)
info "Memeriksa potensi SQL injection..."
SQL=$(grep -rniE "(execute|query)\s*\(\s*\`[^)]*\$\{" "$SRC" \
      --include="*.ts" --include="*.tsx" 2>/dev/null || true)
if [[ -n "$SQL" ]]; then
  fail "Potensi SQL injection: template literal langsung di query"
  echo "$SQL" | head -5 | sed 's/^/  /'
else
  pass "Tidak ada SQL injection pattern"
fi

# XSS: dangerouslySetInnerHTML
info "Memeriksa dangerouslySetInnerHTML..."
XSS=$(grep -rn "dangerouslySetInnerHTML" "$SRC" \
      --include="*.tsx" --include="*.ts" 2>/dev/null || true)
if [[ -n "$XSS" ]]; then
  XCOUNT=$(echo "$XSS" | wc -l)
  warn "dangerouslySetInnerHTML ditemukan ($XCOUNT lokasi) — pastikan input di-sanitasi"
  echo "$XSS" | head -5 | sed 's/^/  /'
else
  pass "Tidak ada dangerouslySetInnerHTML"
fi

# eval()
info "Memeriksa penggunaan eval()..."
EVAL=$(grep -rniE "\beval\s*\(" "$SRC" \
       --include="*.ts" --include="*.tsx" 2>/dev/null || true)
if [[ -n "$EVAL" ]]; then
  fail "eval() ditemukan — sangat berbahaya!"
  echo "$EVAL" | head -5 | sed 's/^/  /'
else
  pass "Tidak ada eval()"
fi

# TypeScript 'any'
info "Memeriksa penggunaan 'any' berlebihan..."
ANY_COUNT=$(grep -rniE ":\s*any\b" "$SRC" \
            --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || true)
if   [[ "$ANY_COUNT" -gt 20 ]]; then fail "Terlalu banyak 'any' ($ANY_COUNT lokasi)"
elif [[ "$ANY_COUNT" -gt 0  ]]; then warn "$ANY_COUNT penggunaan 'any' — pertimbangkan refactor"
else pass "Tidak ada penggunaan 'any'"
fi

# console.log
info "Memeriksa console.log yang tertinggal..."
CON=$(grep -rn "console\.\(log\|error\|warn\|debug\)" "$SRC" \
      --include="*.ts" --include="*.tsx" 2>/dev/null | \
      grep -v "//.*console\." | wc -l || true)
if   [[ "$CON" -gt 20 ]]; then warn "Banyak console statement ($CON) — gunakan logger untuk production"
elif [[ "$CON" -gt 0  ]]; then warn "$CON console statement — hapus sebelum production"
else pass "Tidak ada console statement"
fi

# TODO/FIXME
info "Memeriksa TODO/FIXME/HACK..."
TODO_N=$(grep -rniE "(\/\/|\/\*)\s*(TODO|FIXME|HACK|XXX|BUG)\b" "$SRC" \
         --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || true)
if [[ "$TODO_N" -gt 0 ]]; then
  warn "$TODO_N TODO/FIXME/HACK ditemukan:"
  grep -rniE "(\/\/|\/\*)\s*(TODO|FIXME|HACK|XXX|BUG)\b" "$SRC" \
    --include="*.ts" --include="*.tsx" 2>/dev/null | head -8 | sed 's/^/  /'
else
  pass "Tidak ada TODO/FIXME/HACK"
fi

# API route tanpa auth
info "Memeriksa API route tanpa autentikasi..."
API_DIR="$SRC/app/api"
UNAUTH=0
if [[ -d "$API_DIR" ]]; then
  while IFS= read -r -d '' f; do
    case "$f" in
      "$API_DIR/auth/register/route.ts")
        continue
        ;;
    esac
    if grep -qiE "export\s+async\s+function\s+(POST|PUT|DELETE|PATCH)" "$f" 2>/dev/null; then
      if ! grep -qiE "(verifyToken|getServerSession|verify|jwt\.verify|auth\(|checkAuth|cookies\(\)|getUserFromSession)" "$f" 2>/dev/null; then
        warn "API route mungkin tanpa auth: $f"
        ((UNAUTH++))
      fi
    fi
  done < <(find "$API_DIR" -name "route.ts" -print0 2>/dev/null)
  [[ "$UNAUTH" -eq 0 ]] && pass "Semua API route mutasi tampaknya punya auth check"
else
  info "$API_DIR tidak ditemukan — lewati"
fi

# ============================================================
# 6. NEXT.JS SPECIFIC
# ============================================================
header "6. NEXT.JS SPECIFIC"

# next.config
NCFG=""
for f in next.config.ts next.config.js next.config.mjs; do
  [[ -f "$f" ]] && NCFG+=$(cat "$f")
done
if [[ -n "$NCFG" ]]; then
  pass "next.config ditemukan"
  echo "$NCFG" | grep -q "headers"           && pass "Security headers dikonfigurasi" \
                                              || warn "Tidak ada HTTP security headers di next.config"
  echo "$NCFG" | grep -q "reactStrictMode"   && pass "reactStrictMode dikonfigurasi" \
                                              || warn "reactStrictMode tidak diatur — tambahkan: reactStrictMode: true"
else
  warn "next.config tidak ditemukan"
fi

# middleware.ts / proxy.ts
if [[ -f "src/proxy.ts" || -f "proxy.ts" || -f "src/middleware.ts" || -f "middleware.ts" ]]; then
  pass "proxy.ts/middleware.ts ditemukan — proteksi route aktif"
else
  warn "proxy.ts/middleware.ts tidak ditemukan — pertimbangkan menambahkan untuk proteksi route"
fi

# ============================================================
# 7. GIT HYGIENE
# ============================================================
header "7. GIT HYGIENE"

# Uncommitted changes
UNCOM=$(git status --porcelain 2>/dev/null | wc -l || echo 0)
if [[ "$UNCOM" -gt 0 ]]; then
  warn "$UNCOM file belum di-commit:"
  git status --short 2>/dev/null | head -8 | sed 's/^/  /'
else
  pass "Working tree bersih"
fi

# Branch belum di-merge
UNMERGED=$(git branch --no-merged 2>/dev/null | wc -l || echo 0)
if [[ "$UNMERGED" -gt 3 ]]; then
  warn "$UNMERGED branch belum di-merge — pertimbangkan dibersihkan"
else
  pass "Branch belum di-merge: $UNMERGED (aman)"
fi

# Commit message generik
BAD=$(git log --oneline -20 2>/dev/null | \
      grep -ciE "^[a-f0-9]+ (fix|test|wip|update|commit|changes?)$" || true)
if [[ "$BAD" -gt 3 ]]; then
  warn "$BAD commit message generik — gunakan pesan deskriptif"
else
  pass "Kualitas commit message: baik"
fi

# ============================================================
# 8. NEXT BUILD (opsional, --build)
# ============================================================
header "8. NEXT BUILD CHECK"

if $RUN_BUILD; then
  info "Menjalankan next build (bisa memakan 2-5 menit)..."
  BUILD_OUT=$(timeout 300 npx next build 2>&1 || true)
  if echo "$BUILD_OUT" | grep -qiE "error|failed"; then
    ERR=$(echo "$BUILD_OUT" | grep -iE "error|failed" | head -5)
    fail "Build GAGAL:"
    echo "$ERR" | sed 's/^/  /'
  else
    pass "Build berhasil — tidak ada compile error"
  fi
else
  info "Build check dilewati — jalankan dengan flag --build untuk mengecek"
  info "Contoh: bash check.sh --build"
fi

# ============================================================
# RINGKASAN
# ============================================================
TOTAL=$((PASS + WARN_COUNT + FAIL_COUNT))
echo ""
echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║       📊  RINGKASAN HASIL PENGECEKAN         ║${NC}"
echo -e "${BOLD}${BLUE}╠══════════════════════════════════════════════╣${NC}"
printf "${BOLD}${BLUE}║  ${GREEN}✅ LULUS      : %-4s                          ${BLUE}║${NC}\n" "$PASS"
printf "${BOLD}${BLUE}║  ${YELLOW}⚠️  PERINGATAN : %-4s                          ${BLUE}║${NC}\n" "$WARN_COUNT"
printf "${BOLD}${BLUE}║  ${RED}❌ GAGAL      : %-4s                          ${BLUE}║${NC}\n" "$FAIL_COUNT"
printf "${BOLD}${BLUE}║  Total cek   : %-4s                          ${BLUE}║${NC}\n" "$TOTAL"
echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

if   [[ "$FAIL_COUNT" -eq 0 && "$WARN_COUNT" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}🎉 Semua pengecekan lulus! Proyek siap production.${NC}"
elif [[ "$FAIL_COUNT" -eq 0 ]]; then
  echo -e "${YELLOW}${BOLD}🟡 Ada peringatan yang perlu diperhatikan.${NC}"
else
  echo -e "${RED}${BOLD}🔴 Ada ${FAIL_COUNT} masalah kritis yang harus diperbaiki!${NC}"
fi

echo ""
echo -e "${CYAN}Opsi lanjutan:${NC}"
echo -e "  ${BOLD}bash check.sh --fix${NC}    → auto-fix masalah ringan"
echo -e "  ${BOLD}bash check.sh --build${NC}  → tambahkan next build check"
echo -e "  ${BOLD}bash check.sh --json${NC}   → simpan hasil ke check-report.json"
echo ""

# ── Output JSON ──────────────────────────────────────────────
if $JSON_OUT; then
  REPORT_FILE="check-report.json"
  {
    echo "{"
    echo "  \"timestamp\": \"$(date -Iseconds 2>/dev/null || date)\","
    echo "  \"project\": \"$(basename "$(pwd)")\","
    echo "  \"summary\": {"
    echo "    \"pass\": $PASS,"
    echo "    \"warn\": $WARN_COUNT,"
    echo "    \"fail\": $FAIL_COUNT"
    echo "  },"
    echo "  \"results\": ["
    for i in "${!JSON_LINES[@]}"; do
      if [[ $i -lt $((${#JSON_LINES[@]} - 1)) ]]; then
        echo "${JSON_LINES[$i]},"
      else
        echo "${JSON_LINES[$i]}"
      fi
    done
    echo "  ]"
    echo "}"
  } > "$REPORT_FILE"
  echo -e "${GREEN}✅ Laporan JSON disimpan: ${BOLD}$REPORT_FILE${NC}"
fi

exit "$FAIL_COUNT"
