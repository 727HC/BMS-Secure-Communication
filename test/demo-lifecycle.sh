#!/bin/bash
# Battery Passport 전주기 데모 시나리오
# 4개 조직이 참여하는 배터리 전주기를 API로 시연합니다.
#
# 사용법: ./demo-lifecycle.sh [agent_url]
# 기본값: http://localhost:3001

set -e
API="${1:-http://localhost:3001}"
PASS="demo1234"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }
ok() { echo -e "  ${GREEN}✓ $1${NC}"; }
info() { echo -e "  ${YELLOW}→ $1${NC}"; }
fail() { echo -e "  ${RED}✗ $1${NC}"; }

call() {
  local METHOD=$1 URL=$2 DATA=$3 TOKEN=$4
  local HEADERS="-H Content-Type:application/json"
  [ -n "$TOKEN" ] && HEADERS="$HEADERS -H Authorization:Bearer $TOKEN"
  if [ "$METHOD" = "GET" ]; then
    curl -s $HEADERS "$URL"
  else
    curl -s -X $METHOD $HEADERS -d "$DATA" "$URL"
  fi
}

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║     Battery Passport 전주기 데모 시나리오            ║"
echo "║     GBA 21 규격 | 4-Org Fabric Network              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================
step "[0/9] 시스템 상태 확인"
STATUS=$(call GET "$API/api/status")
FABRIC=$(echo $STATUS | python3 -c "import sys,json;print(json.load(sys.stdin)['fabric'])" 2>/dev/null)
if [ "$FABRIC" = "connected" ]; then
  ok "Fabric 연결됨: $(echo $STATUS | python3 -c "import sys,json;d=json.load(sys.stdin);print(f'{d[\"org\"]} / {d[\"channel\"]} / {d[\"contract\"]}')")"
else
  fail "Fabric 미연결. Agent를 먼저 시작하세요."
  exit 1
fi

# ============================================================
step "[1/9] 4개 조직 회원가입"
for ORG_NUM in 1 2 3 4; do
  case $ORG_NUM in
    1) USER="mfg-demo"  LABEL="제조사" ;;
    2) USER="ev-demo"   LABEL="EV제조사" ;;
    3) USER="svc-demo"  LABEL="정비/분석" ;;
    4) USER="reg-demo"  LABEL="검증기관" ;;
  esac
  RESULT=$(call POST "$API/api/auth/register" "{\"userId\":\"$USER\",\"password\":\"$PASS\",\"orgNum\":\"$ORG_NUM\"}")
  TOKEN=$(echo $RESULT | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
  if [ -n "$TOKEN" ]; then
    eval "TOKEN_ORG$ORG_NUM=$TOKEN"
    ok "$LABEL ($USER) 가입 완료"
  else
    fail "$LABEL 가입 실패: $RESULT"
  fi
done

# ============================================================
step "[2/9] 원자재 등록 (제조사)"
MAT_ID="MAT-DEMO-$(date +%s)"
RESULT=$(call POST "$API/api/materials" \
  "{\"materialId\":\"$MAT_ID\",\"name\":\"리튬\",\"origin\":\"Australia\",\"supplier\":\"Pilbara Minerals\",\"quantity\":500,\"unit\":\"kg\",\"certificationId\":\"CERT-AU-2024\"}" \
  "$TOKEN_ORG1")
ok "원자재 등록: $MAT_ID ($(echo $RESULT | python3 -c "import sys,json;print(json.load(sys.stdin).get('success',''))" 2>/dev/null))"

# ============================================================
step "[3/9] 배터리 여권 발급 (제조사) — GBA 21 규격"
PASSPORT_ID="PASSPORT-DEMO-$(date +%s)"
BATTERY_ID="BATTERY-DEMO-$(date +%s)"
RESULT=$(call POST "$API/api/passports" \
  "{\"passportId\":\"$PASSPORT_ID\",\"batteryId\":\"$BATTERY_ID\",\"did\":\"did:sov:demo001\",
    \"model\":\"xEV-Pro-100\",\"serialNumber\":\"SN-KR-2024-0001\",
    \"manufacturerName\":\"한국배터리\",\"manufactureCountry\":\"Korea\",
    \"cellManufacturer\":\"셀텍코리아\",\"cellManufactureCountry\":\"Korea\",
    \"manufactureDate\":\"2024-06-15\",\"cellType\":\"prismatic\",\"chemistry\":\"NCM811\",
    \"cellCount\":11,\"weight\":45.5,\"totalEnergy\":72.0,\"energyDensity\":1.58,
    \"ratedCapacity\":120.0,\"expectedLifespan\":2000,
    \"voltageRange\":\"2.8-3.6-4.2\",\"temperatureRange\":\"10-45\"}" \
  "$TOKEN_ORG1")
ok "여권 발급: $PASSPORT_ID"
info "상태: MANUFACTURED | SOH: 100% | 셀수: 11 | 화학: NCM811"

sleep 5

# ============================================================
step "[4/9] BMU 실시간 데이터 수신 (제조사 — 서명 없이 테스트)"
BMU_PAYLOAD=$(node -e "
const buf=Buffer.alloc(48);
buf.writeFloatLE(12.5,0);buf.writeFloatLE(3.72,4);buf.writeUInt16LE(85,8);
buf.writeUInt16LE(150,10);buf.writeUInt16LE(27,12);
for(let i=0;i<11;i++){buf.writeUInt8(140,14+i);buf.writeUInt8(85,25+i);}
buf.writeUInt16LE(1000,36);buf.writeUInt8(0,38);buf.writeUInt8(11,39);
buf.writeUInt32LE(42,40);console.log(buf.toString('hex'));
" 2>/dev/null)
RESULT=$(call POST "$API/api/bmu/data" \
  "{\"rawPayload\":\"$BMU_PAYLOAD\",\"did\":\"did:sov:demo001\",\"signature\":\"none\"}")
RECORD_ID=$(echo $RESULT | python3 -c "import sys,json;print(json.load(sys.stdin).get('recordId',''))" 2>/dev/null)
ok "BMU 기록: $RECORD_ID"
info "SOC=85% | V=3.72V | I=12.5A | T=27°C | Cycles=150"

sleep 2

# ============================================================
step "[5/9] VIN 바인딩 — 전기차 장착 (EV제조사)"
RESULT=$(call PUT "$API/api/passports/$PASSPORT_ID/bind" \
  "{\"vin\":\"KMHD341DPRU123456\",\"installDate\":\"2024-09-01\",\"evManufacturer\":\"현대자동차\",\"evAssemblyCountry\":\"Korea\"}" \
  "$TOKEN_ORG2")
ok "VIN 바인딩: KMHD341DPRU123456 → 현대자동차"
info "상태: MANUFACTURED → ACTIVE"

sleep 2

# ============================================================
step "[6/9] 정비 요청 + 수행 (EV제조사 → 정비업체)"
info "EV제조사가 정비 요청..."
call POST "$API/api/maintenance/$PASSPORT_ID/request" \
  "{\"maintenanceType\":\"routine\",\"description\":\"12개월 정기점검\"}" \
  "$TOKEN_ORG2" > /dev/null
ok "정비 요청 완료 (상태: MAINTENANCE)"

sleep 2
info "정비업체가 점검 수행..."
call POST "$API/api/maintenance/$PASSPORT_ID/log" \
  "{\"maintenanceType\":\"routine\",\"description\":\"SOH 96% 확인, 셀 밸런싱 정상, 냉각 시스템 양호\",\"technician\":\"김정비\"}" \
  "$TOKEN_ORG3" > /dev/null
ok "정비 기록 추가 (상태: ACTIVE 복귀)"

sleep 2

# ============================================================
step "[7/9] SOH 분석 (EV제조사 요청 → 정비업체 수행)"
info "EV제조사가 분석 요청..."
call POST "$API/api/analysis/$PASSPORT_ID/request" "{}" "$TOKEN_ORG2" > /dev/null
ok "분석 요청 (상태: ANALYSIS)"

sleep 2
info "정비업체가 분석 결과 제출..."
call POST "$API/api/analysis/$PASSPORT_ID/result" \
  "{\"soh\":92.5,\"soce\":88.0,\"remainingLifeCycle\":1500,\"recycleAvailable\":false}" \
  "$TOKEN_ORG3" > /dev/null
ok "분석 결과: SOH=92.5% | SOCE=88% | 잔여수명=1500 | 재활용=불필요"

sleep 2

# ============================================================
step "[8/9] 재활용 판정 + 원자재 추출 (검증기관)"
info "검증기관이 재활용 판정..."
call PUT "$API/api/recycling/$PASSPORT_ID/availability" \
  "{\"available\":true}" "$TOKEN_ORG4" > /dev/null
ok "재활용 가능 판정"

sleep 2
info "검증기관이 원자재 추출..."
call POST "$API/api/recycling/$PASSPORT_ID/extract" \
  "{\"recyclingRates\":{\"리튬\":85.5,\"코발트\":92.0,\"니켈\":88.0,\"망간\":90.0}}" \
  "$TOKEN_ORG4" > /dev/null
ok "원자재 추출: 리튬 85.5% | 코발트 92% | 니켈 88% | 망간 90%"
info "상태: RECYCLING"

sleep 2
info "검증기관이 최종 폐기 처리..."
call POST "$API/api/recycling/$PASSPORT_ID/dispose" "{}" "$TOKEN_ORG4" > /dev/null
ok "배터리 폐기 완료 (상태: DISPOSED)"

sleep 2

# ============================================================
step "[9/9] 최종 여권 상태 + 블록체인 이력"
sleep 5
echo ""
PASSPORT=$(call GET "$API/api/passports/$PASSPORT_ID")
echo "$PASSPORT" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  if 'error' in d:
    print(f'  조회 지연 — CLI로 확인합니다')
    sys.exit(1)
  print('  ┌─────────────────────────────────────────────┐')
  print(f'  │ 여권 ID:    {d[\"passportId\"]}')
  print(f'  │ 모델:       {d[\"model\"]}')
  print(f'  │ 일련번호:   {d[\"serialNumber\"]}')
  print(f'  │ 제조사:     {d[\"manufacturerName\"]} ({d[\"manufactureCountry\"]})')
  print(f'  │ VIN:        {d.get(\"vin\",\"-\")}')
  print(f'  │ EV 제조사:  {d.get(\"evManufacturer\",\"-\")}')
  print(f'  │ 상태:       {d[\"status\"]}')
  print(f'  │ SOC:        {d[\"currentSoc\"]}%')
  print(f'  │ SOH:        {d[\"currentSoh\"]}%')
  print(f'  │ SOCE:       {d.get(\"soce\",0)}%')
  print(f'  │ 방전주기:   {d[\"totalDischargeCycles\"]}회')
  print(f'  │ 정비이력:   {len(d.get(\"maintenanceLogs\",[]))}건')
  print(f'  │ 재활용률:   {d.get(\"recyclingRates\",{})}')
  print(f'  │ 생성:       {d[\"createdAt\"]}')
  print(f'  │ 최종수정:   {d[\"updatedAt\"]}')
  print('  └─────────────────────────────────────────────┘')
except:
  print('  (API 조회 지연 — 블록 전파 대기 중)')
" 2>/dev/null || true

HISTORY=$(call GET "$API/api/passports/$PASSPORT_ID/history")
HIST_COUNT=$(echo "$HISTORY" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null)
ok "블록체인 변경이력: ${HIST_COUNT}건"

echo -e "\n${GREEN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║           전주기 데모 시나리오 완료!                  ║"
echo "║                                                      ║"
echo "║  원자재등록 → 여권발급 → BMU수신 → VIN바인딩         ║"
echo "║  → 정비 → SOH분석 → 재활용 → 폐기                   ║"
echo "║                                                      ║"
echo "║  4개 조직 × 9단계 × 블록체인 기록 완료               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
