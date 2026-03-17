# BMS 프로젝트 버그 수정 및 하드코딩 개선 보고서

> 작성일: 2026-03-17
> 대상 파일: `CMU_BMS_S32K144/src/main.c`, `BMU_BMS_S32K344/src/main.c`, `firmware/tools/dataProcess.py`

---

## 요약

총 **9건** 수정 — 버그 6건, 하드코딩 3건

| # | 파일 | 심각도 | 분류 | 설명 |
|---|------|--------|------|------|
| 1 | CMU/main.c | 🔴 High | 버그 | `#define PCC_LPUART1_ADDR` 함수 내부 정의 |
| 2 | CMU/main.c | 🟡 Medium | 하드코딩 | KEY_EXCHANGE TX MB 인덱스 `0U` 직접 사용 |
| 3 | CMU/main.c | 🟡 Medium | 하드코딩 | WAIT_ACK RX MB 인덱스 `1U` 직접 사용 |
| 4 | CMU/main.c | 🟡 Medium | 버그 | RTOS 태스크 내 바쁜 대기(busy-wait) 루프 |
| 5 | BMU/main.c | 🟡 Medium | 하드코딩 | ConfigRxMb / ProtocolTask MB 인덱스 `1U`, `2U` |
| 6 | BMU/main.c | 🔴 High | 버그 | ACK CMAC 생성 반환값 미검사 |
| 7 | BMU/main.c | 🔴 High | 버그 | Resync CMAC 생성 반환값 미검사 |
| 8 | BMU/main.c | 🔴 High | 버그 | FC 윈도우 체크 uint32 오버플로우 |
| 9 | dataProcess.py | 🟡 Medium | 하드코딩 | 기본 포트/보레이트 config.env와 불일치 |

---

## 상세 수정 내역

---

### BUG-01 🔴 CMU — `#define PCC_LPUART1_ADDR` 함수 내부 정의

**파일**: `CMU_BMS_S32K144/src/main.c`

**문제**: 전처리기 매크로 `PCC_LPUART1_ADDR`이 `main()` 함수 본문 안에 `#define`으로 정의되어 있었습니다. C 전처리기는 함수 스코프를 인식하지 않으므로 해당 `#define`은 번역 단위 끝까지 유효하게 남아, 이후 코드에서 의도치 않은 재사용 또는 재정의 경고를 유발할 수 있습니다.

**수정 전**:
```c
int main(void) {
    ...
    #define PCC_LPUART1_ADDR (*(volatile uint32 *)0x400651ACu)
    PCC_LPUART1_ADDR = 0U;
```

**수정 후**:
```c
/* 파일 상단 레지스터 정의 섹션 */
#define PCC_LPUART1_ADDR    (*(volatile uint32 *)0x400651ACu)
...
int main(void) {
    ...
    PCC_LPUART1_ADDR = 0U;
```

---

### BUG-02 🟡 CMU — KEY_EXCHANGE TX MB 인덱스 `0U` 직접 사용

**파일**: `CMU_BMS_S32K144/src/main.c`

**문제**: KEY_EXCHANGE 상태에서 `FlexCAN_Ip_Send`, `FlexCAN_Ip_MainFunctionWrite`, `FlexCAN_Ip_GetTransferStatus` 호출 시 MB 인덱스를 `0U` 리터럴로 직접 사용했습니다. 동일 파일의 다른 위치에서는 `CAN_TX_MB_IDX` 상수를 사용하는 불일치가 존재했습니다.

**수정 전**:
```c
FlexCAN_Ip_Send(INST_FLEXCAN_0, 0U, &g_canfd_tx_key_info, ...);
FlexCAN_Ip_MainFunctionWrite(INST_FLEXCAN_0, 0U);
g_lastCanStatus = FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, 0U);
```

**수정 후**:
```c
FlexCAN_Ip_Send(INST_FLEXCAN_0, CAN_TX_MB_IDX, &g_canfd_tx_key_info, ...);
FlexCAN_Ip_MainFunctionWrite(INST_FLEXCAN_0, CAN_TX_MB_IDX);
g_lastCanStatus = FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_TX_MB_IDX);
```

---

### BUG-03 🟡 CMU — WAIT_ACK RX MB 인덱스 `1U` 직접 사용

**파일**: `CMU_BMS_S32K144/src/main.c`

**문제**: WAIT_ACK 상태에서 `FlexCAN_Ip_Receive`, `FlexCAN_Ip_GetTransferStatus`, `FlexCAN_Ip_MainFunctionRead` 호출 시 MB 인덱스를 `1U` 리터럴로 사용했습니다. `bms_protocol.h`에 `CAN_RX_MB_DATA = 1U`가 정의되어 있으나 사용하지 않았습니다.

**수정 전**:
```c
FlexCAN_Ip_Receive(INST_FLEXCAN_0, 1U, &rxMsg, TRUE);
while ((FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, 1U) == FLEXCAN_STATUS_BUSY) ...
    FlexCAN_Ip_MainFunctionRead(INST_FLEXCAN_0, 1U);
if ((FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, 1U) == FLEXCAN_STATUS_SUCCESS) ...
```

**수정 후**:
```c
FlexCAN_Ip_Receive(INST_FLEXCAN_0, CAN_RX_MB_DATA, &rxMsg, TRUE);
while ((FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_RX_MB_DATA) == FLEXCAN_STATUS_BUSY) ...
    FlexCAN_Ip_MainFunctionRead(INST_FLEXCAN_0, CAN_RX_MB_DATA);
if ((FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_RX_MB_DATA) == FLEXCAN_STATUS_SUCCESS) ...
```

---

### BUG-04 🟡 CMU — FreeRTOS 태스크 내 바쁜 대기(busy-wait) 루프

**파일**: `CMU_BMS_S32K144/src/main.c`

**문제**: KEY_EXCHANGE 상태에서 TX 실패 시 재시도 지연을 `for (volatile uint32 d = 0U; d < DELAY_KEY_RETRY; d++) {}` 형태의 바쁜 대기로 구현했습니다. FreeRTOS 태스크 내에서 바쁜 대기를 사용하면 스케줄러가 다른 태스크에 CPU를 양보하지 못해 실시간성을 해칩니다.

**수정 전**:
```c
g_txFailCount++;
for (volatile uint32 d = 0U; d < DELAY_KEY_RETRY; d++) {}
break;
```

**수정 후**:
```c
g_txFailCount++;
vTaskDelay(pdMS_TO_TICKS(KEY_EXCHANGE_TIMEOUT_MS));
break;
```

---

### BUG-05 🟡 BMU — ConfigRxMb / ProtocolTask MB 인덱스 `1U`, `2U` 직접 사용

**파일**: `BMU_BMS_S32K344/src/main.c`

**문제**: `FlexCAN_Ip_ConfigRxMb`, `FlexCAN_Ip_Receive`, `FlexCAN_Ip_GetTransferStatus`, `FlexCAN_Ip_MainFunctionRead` 모두 MB 인덱스를 `1U`, `2U` 리터럴로 사용했습니다. `bms_protocol.h`에 `CAN_RX_MB_DATA = 1U`, `CAN_RX_MB_CTRL = 2U`가 정의되어 있으나 사용하지 않았습니다.

**수정 전**:
```c
FlexCAN_Ip_ConfigRxMb(INST_FLEXCAN_0, 1U, &rxInfo, CAN_ID_KEY_EXCHANGE);
FlexCAN_Ip_ConfigRxMb(INST_FLEXCAN_0, 2U, &rxInfo, CAN_ID_BATTERY_DATA);
...
FlexCAN_Ip_Receive(INST_FLEXCAN_0, 1U, &rxMsg, TRUE);      // INIT 상태
FlexCAN_Ip_Receive(INST_FLEXCAN_0, 2U, &rxMsg, TRUE);      // OPERATIONAL 상태
```

**수정 후**:
```c
FlexCAN_Ip_ConfigRxMb(INST_FLEXCAN_0, CAN_RX_MB_DATA, &rxInfo, CAN_ID_KEY_EXCHANGE);
FlexCAN_Ip_ConfigRxMb(INST_FLEXCAN_0, CAN_RX_MB_CTRL, &rxInfo, CAN_ID_BATTERY_DATA);
...
FlexCAN_Ip_Receive(INST_FLEXCAN_0, CAN_RX_MB_DATA, &rxMsg, TRUE);
FlexCAN_Ip_Receive(INST_FLEXCAN_0, CAN_RX_MB_CTRL, &rxMsg, TRUE);
```

---

### BUG-06 🔴 BMU — ACK CMAC 생성 반환값 미검사

**파일**: `BMU_BMS_S32K344/src/main.c` — `BMU_HandleKeyExchange()`

**문제**: 키 교환 ACK 프레임의 CMAC을 생성하는 `BMU_CmacGenerate()` 호출의 반환값을 검사하지 않았습니다. HSE 오류로 CMAC 생성이 실패해도 0으로 초기화된 ACK 프레임이 그대로 CMU에 전송되어, CMU가 잘못된 CMAC을 검증하게 됩니다. 이는 프로토콜 무결성 침해로 이어집니다.

**수정 전**:
```c
BMU_CmacGenerate(HSE_PSK_KEY_HANDLE, ack_frame, CTRL_DATA_SIZE,
                  &ack_frame[CTRL_DATA_SIZE], &ackTagLen);
```

**수정 후**:
```c
hse_resp = BMU_CmacGenerate(HSE_PSK_KEY_HANDLE, ack_frame, CTRL_DATA_SIZE,
                              &ack_frame[CTRL_DATA_SIZE], &ackTagLen);
if (hse_resp != HSE_SRV_RSP_OK)
{
    UART_SendString("[BMU] ERR: ACK CMAC generate failed\r\n");
    return FALSE;
}
```

---

### BUG-07 🔴 BMU — Resync CMAC 생성 반환값 미검사

**파일**: `BMU_BMS_S32K344/src/main.c` — `BMU_SendResyncRequest()`

**문제**: Resync 프레임의 CMAC을 생성하는 `BMU_CmacGenerate()` 반환값을 검사하지 않았습니다. HSE 오류 시 0으로 초기화된 CMAC 태그가 포함된 Resync 프레임이 전송되고, CMU 측에서 이를 검증하면 실패하여 무한 재동기화 루프에 빠질 수 있습니다.

**수정 전**:
```c
BMU_CmacGenerate(HSE_PSK_KEY_HANDLE, resync_frame, CTRL_DATA_SIZE,
                  &resync_frame[CTRL_DATA_SIZE], &resyncTagLen);
```

**수정 후**:
```c
hseSrvResponse_t resyncResp = BMU_CmacGenerate(HSE_PSK_KEY_HANDLE, resync_frame,
                                                CTRL_DATA_SIZE,
                                                &resync_frame[CTRL_DATA_SIZE],
                                                &resyncTagLen);
if (resyncResp != HSE_SRV_RSP_OK)
{
    UART_SendString("[BMU] ERR: Resync CMAC generate failed\r\n");
    return;
}
```

---

### BUG-08 🔴 BMU — FC 윈도우 체크 uint32 오버플로우

**파일**: `BMU_BMS_S32K344/src/main.c` — `BMU_VerifySecuredData()`

**문제**: Freshness Counter 범위 검사에서 `g_expected_fc + FC_WINDOW_SIZE`를 계산할 때, `g_expected_fc`가 `UINT32_MAX - FC_WINDOW_SIZE` 이상이면 덧셈이 uint32 오버플로우를 일으킵니다. 오버플로우 시 윈도우 상한이 0 근처의 값이 되어 정상 프레임을 거부하거나, 이론상 재전송 공격 프레임을 허용할 수 있습니다.

**수정 전**:
```c
if (rx_fc < g_expected_fc || rx_fc >= (g_expected_fc + FC_WINDOW_SIZE))
```

**수정 후**:
```c
/* 뺄셈 기반으로 오버플로우 없이 윈도우 체크 */
if (rx_fc < g_expected_fc || (rx_fc - g_expected_fc) >= FC_WINDOW_SIZE)
```

> `rx_fc < g_expected_fc` 조건이 먼저 false가 돼야 두 번째 조건이 평가되므로, `rx_fc - g_expected_fc`는 항상 양수가 됩니다.

---

### BUG-09 🟡 dataProcess.py — 기본 포트/보레이트 config.env 불일치

**파일**: `firmware/tools/dataProcess.py`

**문제**: argparse 기본값이 `port="COM3"`, `baud=115200`으로 하드코딩되어 있었습니다. 프로젝트 공통 설정인 `config.env`에는 `CMU_COM=COM5`, `CMU_UART_BAUD=9600`으로 정의되어 있어 불일치했습니다. `start.sh`는 올바르게 `--port $CMU_COM --baud $CMU_UART_BAUD`로 호출하지만, 개발자가 직접 스크립트를 실행할 때 잘못된 기본값으로 연결 실패가 발생합니다.

**수정 전**:
```python
parser.add_argument("--port", type=str, default="COM3",
                    help="UART serial port (default: COM3)")
parser.add_argument("--baud", type=int, default=115200,
                    help="Baud rate (default: 115200)")
```

**수정 후**:
```python
parser.add_argument("--port", type=str, default="COM5",
                    help="UART serial port (default: COM5, matches config.env CMU_COM)")
parser.add_argument("--baud", type=int, default=9600,
                    help="Baud rate (default: 9600, matches config.env CMU_UART_BAUD)")
```

---

## 수정하지 않은 항목 (검토 필요)

아래는 코드 구조상 잠재적 위험이 있으나 의도적 설계로 판단하여 수정을 보류한 항목입니다.

| 항목 | 파일 | 판단 근거 |
|------|------|-----------|
| `g_hseFormatStatus` 오류 무시 | BMU/main.c L852 | 이미 포맷된 경우 `NOT_ALLOWED` 반환이 정상. 주석으로 명시됨 |
| `BMU_AesEcbDecrypt` 입력 길이 `AES_KEY_SIZE` | BMU/main.c L390 | UID_SIZE=SEED_SIZE=AES_KEY_SIZE=16 으로 일치. 단, 상수명이 의미적으로 부정확 |
| CMU OPERATIONAL 루프 내 `for` 지연 | CMU/main.c | 주기적 UART 폴링 포함(`(d & 0xFFU) == 0U`)이 있어 단순 바쁜 대기는 아님. 단, vTaskDelay 기반으로 재설계를 권장 |
