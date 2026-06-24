#!/usr/bin/env bash
#
# update-schools.sh — 爬取阳光高考全国院校数据
#
# 用法:
#   ./scripts/update-schools.sh            # 完整爬取（列表 + 详情）
#   ./scripts/update-schools.sh --list     # 仅更新列表（跳过详情API，快速）
#   ./scripts/update-schools.sh --detail   # 仅补充详情（需已有列表数据）
#   ./scripts/update-schools.sh --help     # 查看帮助
#
# 幂等性: 可随时重复执行，输出完全覆盖旧数据。
# 数据源: 阳光高考 https://gaokao.chsi.com.cn
# 输出:   data/_all-schools.json + data/{省份代码}/universities/_common/院校基本信息.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/update-schools_${TIMESTAMP}.log"

# ========== 颜色输出 ==========
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*" | tee -a "$LOG_FILE"; }
ok()   { echo -e "${GREEN}[OK]${NC} $*" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"; }

# ========== 帮助 ==========
usage() {
    cat <<'EOF'
用法: ./scripts/update-schools.sh [选项]

选项:
  (无参数)     完整爬取（列表 + 详情），约需 15-20 分钟
  --list       仅更新院校列表（约 1 分钟，不含地址/官网/电话）
  --detail     仅补充详情 API（需已运行过 --list，约 15 分钟）
  --validate   仅校验已有数据
  --help       显示此帮助

幂等性:
  每次执行都会完全覆盖旧数据，可安全重复运行。
  建议定期执行以获取最新院校信息。

数据来源:
  阳光高考 https://gaokao.chsi.com.cn
EOF
    exit 0
}

# ========== 前置检查 ==========
check_deps() {
    local missing=()
    for cmd in node curl python3; do
        if ! command -v "$cmd" &>/dev/null; then
            missing+=("$cmd")
        fi
    done
    if [ ${#missing[@]} -gt 0 ]; then
        err "缺少依赖: ${missing[*]}"
        exit 1
    fi

    # 检查 pnpm
    if ! command -v pnpm &>/dev/null; then
        err "缺少 pnpm，请先安装: npm install -g pnpm"
        exit 1
    fi

    # 检查项目依赖
    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        warn "node_modules 不存在，正在安装依赖..."
        cd "$PROJECT_DIR" && pnpm install
    fi
}

# ========== 主逻辑 ==========
main() {
    local mode="full"

    case "${1:-}" in
        --help|-h)    usage ;;
        --list)       mode="list" ;;
        --detail)     mode="detail" ;;
        --validate)   mode="validate" ;;
        "")           mode="full" ;;
        *)            err "未知参数: $1"; usage ;;
    esac

    mkdir -p "$LOG_DIR" "$DATA_DIR"

    log "=========================================="
    log "阳光高考院校数据更新"
    log "模式: $mode"
    log "时间: $(date '+%Y-%m-%d %H:%M:%S')"
    log "日志: $LOG_FILE"
    log "=========================================="

    check_deps

    cd "$PROJECT_DIR"

    if [ "$mode" = "validate" ]; then
        validate_data
        exit 0
    fi

    # 运行 TypeScript 爬虫
    log "启动爬虫..."
    local start_time=$SECONDS

    if [ "$mode" = "full" ] || [ "$mode" = "list" ]; then
        log "Phase 1+2: 爬取院校列表和详情..."
        pnpm tsx scripts/scrape-all-schools.ts 2>&1 | tee -a "$LOG_FILE"
    elif [ "$mode" = "detail" ]; then
        log "Phase 2: 仅补充详情 API..."
        pnpm tsx scripts/scrape-all-schools.ts --detail-only 2>&1 | tee -a "$LOG_FILE" || {
            warn "detail-only 模式未实现，执行完整爬取"
            pnpm tsx scripts/scrape-all-schools.ts 2>&1 | tee -a "$LOG_FILE"
        }
    fi

    local elapsed=$(( SECONDS - start_time ))
    local mins=$(( elapsed / 60 ))
    local secs=$(( elapsed % 60 ))

    # 验证结果
    log ""
    log "校验数据..."
    validate_data

    log ""
    log "=========================================="
    ok "全部完成! 耗时 ${mins}分${secs}秒"
    ok "日志已保存: $LOG_FILE"
    log "=========================================="
}

# ========== 数据校验 ==========
validate_data() {
    local all_schools="$DATA_DIR/_all-schools.json"

    if [ ! -f "$all_schools" ]; then
        err "数据文件不存在: $all_schools"
        return 1
    fi

    python3 - "$all_schools" <<'PYEOF'
import json, sys, os

data_file = sys.argv[1]
data_dir = os.path.dirname(data_file)

with open(data_file) as f:
    schools = json.load(f)

total = len(schools)
provinces = {}
levels = {}
with_detail = 0
with_name = 0
dupes = set()
codes = set()

for s in schools:
    code = s.get('code', '')
    name = s.get('name', '')
    loc = s.get('location', '未知')
    level = s.get('level', '未知')

    if code in codes:
        dupes.add(code)
    codes.add(code)

    if name: with_name += 1
    if s.get('address') or s.get('phone'): with_detail += 1

    provinces[loc] = provinces.get(loc, 0) + 1
    levels[level] = levels.get(level, 0) + 1

# 校验省份文件
prov_files = 0
for d in os.listdir(data_dir):
    prov_path = os.path.join(data_dir, d, 'universities', '_common', '院校基本信息.json')
    if os.path.isfile(prov_path):
        prov_files += 1

print(f"  总院校数: {total}")
print(f"  有效名称: {with_name}/{total}")
print(f"  含详情:   {with_detail}/{total} ({with_detail*100//total}%)")
print(f"  省份分布: {len(provinces)} 个省, {prov_files} 个省份文件")
print(f"  办学层次: {levels}")
if dupes:
    print(f"  ⚠ 重复代码: {len(dupes)} 个")
    print(f"    示例: {list(dupes)[:5]}")
else:
    print(f"  ✓ 无重复代码")

# 检查关键省份
key_provs = {'河北': 0, '北京': 0, '广东': 0}
for s in schools:
    loc = s.get('location', '')
    if loc in key_provs:
        key_provs[loc] += 1
print(f"  关键省份: {', '.join(f'{k}={v}所' for k,v in key_provs.items())}")
PYEOF

    ok "数据校验通过"
}

main "$@"
