/**
 * @file    main.c
 * @brief   CMU (Cell Monitoring Unit) - S32K144 Integrated Firmware
 * @details Secure BMS communication: UART data reception -> AES-CMAC -> CAN-FD
 *
 * Base project: FlexCAN_Ip_example_S32K144
 *
 * Required S32DS peripheral configuration:
 *   - Clock:     System clock, FlexCAN clock, LPUART clock
 *   - Port:      CAN0_TX/RX pins, LPUART1_TX/RX pins, LED/BTN pins
 *   - FlexCAN0:  CAN-FD enabled, BRS enabled, 64-byte payload, 500kbps/2Mbps
 *   - CSEc:      Enabled (requires FlexNVM partitioning)
 *   - LPUART1:   9600 baud (LPUART1 bare-metal, FIRCDIV2=48MHz)
 *   - IntCtrl:   FlexCAN MB IRQ, LPUART RX IRQ, PORTC IRQ
 */

#ifdef __cplusplus
extern "C" {
#endif

/*============================================================================
 *  Includes
 *============================================================================*/
#include "Csec_Ip.h"
#include "OsIf.h"
#include "Clock_Ip.h"
#include "FlexCAN_Ip.h"
#include "IntCtrl_Ip.h"
#include "Port_Ci_Port_Ip.h"
#include "Port_Ci_Port_Ip_Cfg.h"
#include "Gpio_Dio_Ip.h"
#include "Lpuart_Uart_Ip.h"
#include "Lpuart_Uart_Ip_Irq.h"

/* LPUART config - extern from generated PBcfg */
extern const Lpuart_Uart_Ip_UserConfigType Lpuart_Uart_Ip_xHwConfigPB_1;
#include <stdio.h>
#include <string.h>

/* FreeRTOS */
#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
#include "semphr.h"

/* Protocol definitions shared with BMU */
#include "common/bms_protocol.h"

/*============================================================================
 *  Configuration
 *============================================================================*/

/* Pre-Shared Key — separated into secrets.h (exclude from VCS) */
#include "common/secrets.h"

/*============================================================================
 *  S32K144 Register Addresses (not available via CMSIS in bare-metal RTD)
 *============================================================================*/
/* PCC (Peripheral Clock Control) */
#define PCC_PORTD_ADDR              (*(volatile uint32 *)0x40065130u)
#define PCC_PORTE_ADDR              (*(volatile uint32 *)0x40065124u)
#define PCC_FLEXCAN0_ADDR           (*(volatile uint32 *)0x40065090u)
#define PCC_CGC_BIT                 (1u << 30)

/* PORT pin mux */
#define PORTD_PCR_BASE              ((volatile uint32 *)0x4004C000u)
#define PORTE_PCR_BASE              ((volatile uint32 *)0x4004D000u)
#define PORT_MUX_GPIO               (1u << 8)

/* GPIO */
#define GPIOD_PDDR                  (*(volatile uint32 *)0x400FF0D4u)
#define GPIOD_PTOR                  (*(volatile uint32 *)0x400FF0CCu)
#define GPIOE_PDDR                  (*(volatile uint32 *)0x400FF114u)
#define GPIOE_PDOR                  (*(volatile uint32 *)0x400FF100u)

/* Pin numbers */
#define LED_RED_PIN                 15u     /* PTD15 = RED LED on S32K144 EVB */
#define CAN_TRCV_EN_PIN             11u     /* PTE11 = CAN transceiver enable */

/* CSEc timeout (alias to common constant) */
#define CSEC_TIMEOUT_TICKS          TIMEOUT_CRYPTO_INIT

/* S32K144 LPUART1 bare-metal registers */
#define PCC_LPUART1_ADDR    (*(volatile uint32 *)0x400651ACu)  /* moved from main() */
#define LPUART1_BASE_ADDR   0x4006B000U
#define LPUART1_BAUD_REG    (*(volatile uint32 *)(LPUART1_BASE_ADDR + 0x10U))
#define LPUART1_STAT_REG    (*(volatile uint32 *)(LPUART1_BASE_ADDR + 0x14U))
#define LPUART1_CTRL_REG    (*(volatile uint32 *)(LPUART1_BASE_ADDR + 0x18U))
#define LPUART1_DATA_REG    (*(volatile uint32 *)(LPUART1_BASE_ADDR + 0x1CU))
#define LPUART_RDRF         (1U << 21U)
#define LPUART_TDRE         (1U << 23U)
#define LPUART_CTRL_RE      (1U << 18U)
#define LPUART_CTRL_TE      (1U << 19U)

/* LPUART1 baud rate: 9615 baud @ FIRCDIV2=48MHz */
#define LPUART1_OSR_VALUE   15U
#define LPUART1_SBR_VALUE   312U

/* PCC clock gate bits */
#define PCC_PCS_FIRCDIV2    (3u << 24)

/* FlexNVM partition settings for CSEc key storage */
#if defined(S32K148)
    #define FLEXNVM_DEPART      (0x04U)
#elif (defined(S32K116) || defined(S32K118))
    #define FLEXNVM_DEPART      (0x09U)
#else
    #define FLEXNVM_DEPART      (0x03U)
#endif

#if (defined(S32K142W) || defined(S32K144W))
    #define CSEC_KEY_SIZE_CFG   (0x07U)
#else
    #define CSEC_KEY_SIZE_CFG   (0x03U)
#endif

#if (defined(S32K116) || defined(S32K118))
    #define FLEXNVM_EEPROM      (0x03U)
#else
    #define FLEXNVM_EEPROM      (0x02U)
#endif

/* CSEc flash register access */
#if (STD_ON == CSEC_IP_FTFM_MODULE)
    #define CMU_FCNFG_RAMRDY    FTFM_FCNFG_RAMRDY_MASK
    #define CMU_FCNFG_EEERDY    FTFM_FCNFG_EEERDY_MASK
    #define CMU_MGSTAT0_MASK    FTFM_FSTAT_MGSTAT0_MASK
#else
    #define CMU_FCNFG_RAMRDY    FTFC_FCNFG_RAMRDY_MASK
    #define CMU_FCNFG_EEERDY    FTFC_FCNFG_EEERDY_MASK
    #define CMU_MGSTAT0_MASK    FTFC_FSTAT_MGSTAT0_MASK
#endif

#define CMU_RAMRDY_SET      ((CSEC_IP_FLASH->FCNFG & CMU_FCNFG_RAMRDY) != 0U)
#define CMU_EEERDY_SET      ((CSEC_IP_FLASH->FCNFG & CMU_FCNFG_EEERDY) != 0U)

/* Port C instance for button interrupts */
#define PORTC_INSTANCE      2U

/* UART instance */
#define UART_INSTANCE       1U

/*============================================================================
 *  Non-cacheable memory sections for CSEc
 *============================================================================*/
#define CRYPTO_43_CSEC_START_SEC_VAR_CLEARED_8_NO_CACHEABLE
#include "Crypto_43_CSEC_MemMap.h"

static uint8 g_uid[UID_SIZE];
static uint8 g_seed[SEED_SIZE];
static uint8 g_session_key[AES_KEY_SIZE];
static uint8 g_encrypted_uid[UID_SIZE];
static uint8 g_encrypted_seed[SEED_SIZE];
static uint8 g_cmac_input[CMAC_INPUT_SIZE];
static uint8 g_cmac_output[CMAC_TAG_SIZE];
static uint8 g_kdf_input[KDF_INPUT_SIZE];
static uint8 g_canfd_payload[CANFD_PAYLOAD_SIZE];

#define CRYPTO_43_CSEC_STOP_SEC_VAR_CLEARED_8_NO_CACHEABLE
#include "Crypto_43_CSEC_MemMap.h"

/*============================================================================
 *  State Variables
 *============================================================================*/
static Csec_Ip_StateType       g_csec_state;
static Csec_Ip_ReqType         g_csec_req = { .eReqType = CSEC_IP_REQTYPE_SYNC };
static ProtocolState_t         g_proto_state = PROTO_STATE_INIT;
static uint32                  g_freshness_counter = 0U;

/* UART reception */
static uint8    g_uart_rx_buf[UART_FRAME_TOTAL];
static uint8    g_battery_data[BATTERY_DATA_SIZE];
static volatile boolean g_uart_rx_complete = FALSE;
/* g_new_data_ready removed — data flow now via txDataQueue */

/* CAN flags */
static volatile boolean g_can_tx_done   = TRUE;

/* === Global debug variables (visible in debugger) === */
volatile Flexcan_Ip_StatusType g_initStatus = FLEXCAN_STATUS_ERROR;
volatile uint32 g_maxMbNum = 0U;
volatile Flexcan_Ip_StatusType g_lastCanStatus = FLEXCAN_STATUS_ERROR;
volatile uint32 g_lastESR1 = 0U;
volatile uint32 g_lastECR  = 0U;
volatile uint32 g_txOkCount = 0U;
volatile uint32 g_txFailCount = 0U;
volatile uint32 g_CTRL1 = 0U;
volatile uint32 g_CBT   = 0U;
volatile uint32 g_FDCBT = 0U;
volatile uint32 g_MCR   = 0U;
volatile uint32 g_PCC   = 0U;
volatile uint32 g_FDCTRL = 0U;  /* FDCTRL: TDC enable/offset + payload size */
volatile boolean g_csecInitOk = FALSE;
volatile uint32  g_csecLoadStatus = 0xFFU;
volatile uint32  g_csecRngStatus  = 0xFFU;
volatile uint32  g_csecRamRdy  = 0U;
volatile uint32  g_csecEeeRdy  = 0U;
volatile uint32  g_csecFstat   = 0U;

/* FreeRTOS task prototypes */
static void CMU_UartRxTask(void *pvParameters);
static void CMU_ProtocolTask(void *pvParameters);
static void CMU_CanTxTask(void *pvParameters);
static void CMU_MonitorTask(void *pvParameters);

/* FreeRTOS queues */
static QueueHandle_t txDataQueue;   /* UartRxTask → CanTxTask (battery data ready) */

/* CSEc mutex — protects RAM KEY slot against concurrent access
 * between ProtocolTask (PSK reload for Resync) and CanTxTask (session key CMAC) */
static SemaphoreHandle_t csecMutex;

/* Key exchange buffer (reused across retries with same seed) */
static uint8 g_key_frame_buf[KEY_EXCHANGE_FRAME_SIZE];

/*============================================================================
 *  CAN-FD TX/RX Configuration
 *============================================================================*/
static Flexcan_Ip_DataInfoType g_canfd_tx_info = {
    .fd_enable   = TRUE,
    .enable_brs  = TRUE,
    .msg_id_type = FLEXCAN_MSG_ID_STD,
    .data_length = CANFD_PAYLOAD_SIZE,
    .is_polling  = TRUE,
    .is_remote   = FALSE
};

static Flexcan_Ip_DataInfoType g_canfd_tx_key_info = {
    .fd_enable   = TRUE,
    .enable_brs  = TRUE,
    .msg_id_type = FLEXCAN_MSG_ID_STD,
    .data_length = KEY_EXCHANGE_FRAME_SIZE,
    .is_polling  = TRUE,
    .is_remote   = FALSE
};

/*============================================================================
 *  UART Debug Helper
 *============================================================================*/
static volatile boolean g_uart_tx_done = TRUE;

static void UART_SendString(const char *msg)
{
    if ((msg == NULL) || (*msg == '\0')) return;
    while (!g_uart_tx_done) { /* wait */ }
    g_uart_tx_done = FALSE;
    Lpuart_Uart_Ip_AsyncSend(UART_INSTANCE, (const uint8 *)msg, strlen(msg));
    while (!g_uart_tx_done) { /* wait */ }
}

static void UART_SendHex(const uint8 *data, uint32 len)
{
    char hex[4];
    for (uint32 i = 0U; i < len; i++)
    {
        snprintf(hex, sizeof(hex), "%02X ", data[i]);
        UART_SendString(hex);
    }
    UART_SendString("\r\n");
}

/*============================================================================
 *  Button Callbacks (required by RTD Port_Ci_Icu config)
 *============================================================================*/
void PTC12_Callback(void)
{
    /* BTN1: reserved for future use */
}

void PTC13_Callback(void)
{
    /* BTN2: reserved for future use */
}

/*============================================================================
 *  Callbacks
 *============================================================================*/
void UART_Callback(const uint8 HwInstance,
                   const Lpuart_Uart_Ip_EventType Event,
                   const void *UserData)
{
    (void)UserData;
    if (HwInstance == UART_INSTANCE)
    {
        if (Event == LPUART_UART_IP_EVENT_END_TRANSFER)
        {
            g_uart_tx_done = TRUE;
        }
        else if (Event == LPUART_UART_IP_EVENT_RX_FULL)
        {
            g_uart_rx_complete = TRUE;
        }
    }
}

#if defined(S32K118)
extern void CAN0_ORED_0_31_MB_IRQHandler(void);
#else
extern void CAN0_ORED_0_15_MB_IRQHandler(void);
#endif

extern ISR(PORT_CI_ICU_IP_C_EXT_IRQ_ISR);

void FlexCAN_CallbackFunction(uint8 instance,
                               Flexcan_Ip_EventType eventType,
                               uint32 mbIdx,
                               const Flexcan_Ip_StateType *flexcanState)
{
    (void)instance;
    (void)mbIdx;
    (void)flexcanState;

    if (eventType == FLEXCAN_EVENT_TX_COMPLETE)
    {
        g_can_tx_done = TRUE;
    }
}

/*============================================================================
 *  CSEc Hardware Init (FlexNVM Partitioning)
 *============================================================================*/
static boolean CMU_InitCsecHw(void)
{
    g_csecRamRdy = CMU_RAMRDY_SET ? 1U : 0U;
    g_csecEeeRdy = CMU_EEERDY_SET ? 1U : 0U;

    /* EEERDY=1 && RAMRDY=0 is the correct state for CSEc mode.
       (RAMRDY and EEERDY are mutually exclusive) */
    if (!CMU_RAMRDY_SET && CMU_EEERDY_SET)
    {
        return TRUE;  /* Already partitioned for CSEc - ready */
    }

    /* Need partitioning: Program Partition command */
    CSEC_IP_FLASH->FCCOB[3] = 0x80U;         /* FCCOB0 = cmd: Program Partition */
    CSEC_IP_FLASH->FCCOB[2] = CSEC_KEY_SIZE_CFG; /* FCCOB1 = CSEc key size */
    CSEC_IP_FLASH->FCCOB[1] = 0x00U;         /* FCCOB2 = SFE = 0 */
    CSEC_IP_FLASH->FCCOB[0] = 0x00U;         /* FCCOB3 = unused */
    CSEC_IP_FLASH->FCCOB[7] = FLEXNVM_EEPROM;/* FCCOB4 = EEPROM size */
    CSEC_IP_FLASH->FCCOB[6] = FLEXNVM_DEPART;/* FCCOB5 = FlexNVM partition */
    CSEC_IP_FLASH->FSTAT    = CSEC_IP_FSTAT_CCIF_MASK;

    while (!(CSEC_IP_FLASH->FSTAT & CSEC_IP_FSTAT_CCIF_MASK)) { /* wait */ }

    g_csecFstat = CSEC_IP_FLASH->FSTAT;

    if ((g_csecFstat & CMU_MGSTAT0_MASK) || (g_csecFstat & CSEC_IP_FSTAT_ACCERR_MASK))
    {
        /* Partition failed, but if already configured, accept */
        if (CMU_EEERDY_SET)
        {
            return TRUE;
        }
        return FALSE;
    }
    return TRUE;
}

/*============================================================================
 *  Crypto Wrappers
 *============================================================================*/
static Csec_Ip_ErrorCodeType CMU_AesEcbEncrypt(const uint8 *plain,
                                                uint32 len,
                                                uint8 *cipher)
{
    return Csec_Ip_EncryptEcb(&g_csec_req, CSEC_IP_RAM_KEY, plain, len, cipher);
}

static Csec_Ip_ErrorCodeType CMU_GenerateCmac(const uint8 *input,
                                               uint32 bit_len,
                                               uint8 *cmac_out)
{
    return Csec_Ip_GenerateMac(&g_csec_req, CSEC_IP_RAM_KEY,
                               input, bit_len, cmac_out);
}

static Csec_Ip_ErrorCodeType CMU_DeriveSessionKey(const uint8 *uid,
                                                    const uint8 *seed,
                                                    uint8 *session_key)
{
    /* Build KDF input: Label || UID || Seed || Counter (NIST SP 800-108) */
    BMS_BuildKdfInput(g_kdf_input, uid, seed);

    /* Session key = CMAC(PSK, KDF_input) */
    return CMU_GenerateCmac(g_kdf_input, KDF_INPUT_BITS, session_key);
}

/*============================================================================
 *  UART Data Reception (framed: [0xAA][0x55][LEN][DATA...][XOR])
 *============================================================================*/
static boolean CMU_ParseUartFrame(const uint8 *frame, uint32 frame_len,
                                   uint8 *data_out)
{
    if (frame_len < UART_FRAME_TOTAL) return FALSE;
    if (frame[0] != UART_SYNC_0)     return FALSE;
    if (frame[1] != UART_SYNC_1)     return FALSE;
    if (frame[2] != BATTERY_DATA_SIZE) return FALSE;

    /* Verify XOR checksum */
    uint8 expected_cs = BMS_CalcChecksum(&frame[3], BATTERY_DATA_SIZE);
    if (frame[3 + BATTERY_DATA_SIZE] != expected_cs) return FALSE;

    /* Extract data */
    memcpy(data_out, &frame[3], BATTERY_DATA_SIZE);
    return TRUE;
}

static uint32 g_uart_rx_idx = 0U;

static void CMU_StartUartReception(void)
{
    g_uart_rx_complete = FALSE;
    g_uart_rx_idx = 0U;
}

/* Non-blocking bare-metal UART polling */
#define LPUART_OR   (1U << 19U)  /* Overrun flag */
#define LPUART_FE   (1U << 17U)  /* Framing Error */
#define LPUART_NF   (1U << 18U)  /* Noise Flag */

static void CMU_PollUartRx(void)
{
    /* Clear overrun/framing/noise errors if any */
    uint32 stat = LPUART1_STAT_REG;
    if (stat & (LPUART_OR | LPUART_FE | LPUART_NF))
    {
        LPUART1_STAT_REG = stat | (LPUART_OR | LPUART_FE | LPUART_NF); /* W1C */
        /* Reset reception — frame got corrupted */
        g_uart_rx_idx = 0U;
    }

    while ((LPUART1_STAT_REG & LPUART_RDRF) && (g_uart_rx_idx < UART_FRAME_TOTAL))
    {
        uint8 byte = (uint8)(LPUART1_DATA_REG & 0xFFU);

        /* Sync to frame start: look for [0xAA][0x55] */
        if (g_uart_rx_idx == 0U && byte != UART_SYNC_0) continue;
        if (g_uart_rx_idx == 1U && byte != UART_SYNC_1) { g_uart_rx_idx = 0U; continue; }

        g_uart_rx_buf[g_uart_rx_idx] = byte;
        g_uart_rx_idx++;
    }
    if (g_uart_rx_idx >= UART_FRAME_TOTAL)
    {
        g_uart_rx_complete = TRUE;
    }
}

/*============================================================================
 *  Send Secured Battery Data: Data(48B) || CMAC(16B) = 64B CAN-FD
 *============================================================================*/
static boolean CMU_SendSecuredData(const uint8 *battery_data)
{
    Csec_Ip_ErrorCodeType result;

    /* 1. Increment freshness counter (anti-replay) */
    g_freshness_counter++;

    /* 2. Build CMAC input: FC(4B) || Data(48B) = 52 bytes */
    BMS_BuildCmacInput(g_cmac_input, g_freshness_counter, battery_data);

    /* 3. Generate AES-128 CMAC over the input */
    result = CMU_GenerateCmac(g_cmac_input, CMAC_INPUT_BITS, g_cmac_output);
    if (result != CSEC_IP_ERC_NO_ERROR)
    {
        return FALSE;
    }

    /* 4. Build CAN-FD payload: Data(48B) || CMAC(16B) = 64B */
    memcpy(&g_canfd_payload[0],                 battery_data,  BATTERY_DATA_SIZE);
    /* Embed FC in BatteryData_t.freshness_counter field for BMU to read */
    {
        BatteryData_t *pFrame = (BatteryData_t *)&g_canfd_payload[0];
        pFrame->freshness_counter = g_freshness_counter;
    }
    memcpy(&g_canfd_payload[BATTERY_DATA_SIZE], g_cmac_output, CMAC_TAG_SIZE);

    /* 5. Send via CAN-FD (ID = 0x14), polling */
    FlexCAN_Ip_Send(INST_FLEXCAN_0, CAN_TX_MB_IDX,
                    &g_canfd_tx_info, CAN_ID_BATTERY_DATA,
                    g_canfd_payload);

    /* Wait for TX complete (polling) */
    volatile uint32 timeout = TIMEOUT_CAN_TX;
    while ((FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_TX_MB_IDX)
            == FLEXCAN_STATUS_BUSY) && (timeout > 0U))
    {
        FlexCAN_Ip_MainFunctionWrite(INST_FLEXCAN_0, CAN_TX_MB_IDX);
        timeout--;
    }

    return (FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_TX_MB_IDX)
            == FLEXCAN_STATUS_SUCCESS);
}

/*============================================================================
 *  Main
 *============================================================================*/
int main(void)
{
    /* 1. Clock init */
    Clock_Ip_Init(&Clock_Ip_aClockConfig[0]);
    OsIf_Init(NULL_PTR);

    /* 2. Pin/Port init */
    Port_Ci_Port_Ip_Init(NUM_OF_CONFIGURED_PINS_PortContainer_0_BOARD_InitPeripherals,
                         g_pin_mux_InitConfigArr_PortContainer_0_BOARD_InitPeripherals);

    /* 3. LED setup - PTD15 RED LED */
    PCC_PORTD_ADDR |= PCC_CGC_BIT;
    PORTD_PCR_BASE[LED_RED_PIN] = PORT_MUX_GPIO;
    GPIOD_PDDR |= (1u << LED_RED_PIN);

    /* 3b. CAN transceiver enable */
    PCC_PORTE_ADDR |= PCC_CGC_BIT;
    PORTE_PCR_BASE[CAN_TRCV_EN_PIN] = PORT_MUX_GPIO;
    GPIOE_PDDR |= (1u << CAN_TRCV_EN_PIN);
    GPIOE_PDOR |= (1u << CAN_TRCV_EN_PIN);

    /* 3c. LPUART1 IRQ — disabled until LPUART1 works */
    /* (*(volatile uint32 *)0xE000E104U) = (1U << 1U); */

    /* 3d. LPUART1 init (UART RX from Simulink/dataProcess.py) */
    PCC_LPUART1_ADDR = 0U;
    PCC_LPUART1_ADDR = PCC_CGC_BIT | PCC_PCS_FIRCDIV2;
    LPUART1_CTRL_REG = 0U;
    LPUART1_BAUD_REG = (LPUART1_OSR_VALUE << 24) | LPUART1_SBR_VALUE;
    LPUART1_CTRL_REG = LPUART_CTRL_RE | LPUART_CTRL_TE;

    /* 4. FlexCAN0 clock enable */
    PCC_FLEXCAN0_ADDR |= PCC_CGC_BIT;

    /* 5. FlexCAN0 init */
    g_initStatus = FlexCAN_Ip_Init(INST_FLEXCAN_0, &FlexCAN_State0,
                                    &FlexCAN_Config0);
    g_maxMbNum = FlexCAN_State0.u32MaxMbNum;
    FlexCAN_Ip_SetTDCOffset(INST_FLEXCAN_0, TRUE, CANFD_TDC_OFFSET);
    FlexCAN_Ip_SetStartMode(INST_FLEXCAN_0);

    /* 6. CSEc Init */
    g_csecInitOk = CMU_InitCsecHw();       /* 1) FlexNVM partition first */

    if (g_csecInitOk)
    {
        Csec_Ip_Init(&g_csec_state);       /* 2) Driver init after partition */
        g_csecRngStatus  = (uint32)Csec_Ip_InitRng();           /* 3) RNG seed */
        g_csecLoadStatus = (uint32)Csec_Ip_LoadPlainKey(PreSharedKey); /* 4) PSK */
    }

    /* 7. TX info - CAN-FD, BRS, polling */
    /* txKeyInfo moved to global g_canfd_tx_key_info */

    /* 8. RX MBs for BMU responses (polling) */
    Flexcan_Ip_DataInfoType rxInfo;
    rxInfo.fd_enable   = TRUE;
    rxInfo.enable_brs  = TRUE;
    rxInfo.msg_id_type = FLEXCAN_MSG_ID_STD;
    rxInfo.data_length = CANFD_RX_DATA_LENGTH;
    rxInfo.is_polling  = TRUE;
    rxInfo.is_remote   = FALSE;

    /* MB1: ACK from BMU (ID 0x16) */
    FlexCAN_Ip_ConfigRxMb(INST_FLEXCAN_0, CAN_RX_MB_DATA, &rxInfo, CAN_ID_KEY_ACK);

    /* MB2: Resync from BMU (ID 0x17) */
    FlexCAN_Ip_ConfigRxMb(INST_FLEXCAN_0, CAN_RX_MB_CTRL, &rxInfo, CAN_ID_RESYNC_REQ);

    /* Capture debug registers */
    g_CTRL1  = IP_FLEXCAN0->CTRL1;
    g_CBT    = IP_FLEXCAN0->CBT;
    g_FDCBT  = IP_FLEXCAN0->FDCBT;
    g_MCR    = IP_FLEXCAN0->MCR;
    g_FDCTRL = IP_FLEXCAN0->FDCTRL;
    g_PCC    = PCC_FLEXCAN0_ADDR;
    g_lastESR1 = IP_FLEXCAN0->ESR1;
    g_lastECR  = IP_FLEXCAN0->ECR;

    /* 9. Set initial state */
    if (g_csecInitOk &&
        (g_csecLoadStatus == (uint32)CSEC_IP_ERC_NO_ERROR) &&
        (g_csecRngStatus  == (uint32)CSEC_IP_ERC_NO_ERROR))
    {
        g_proto_state = PROTO_STATE_INIT;
    }
    else
    {
        g_proto_state = PROTO_STATE_ERROR;
    }

    /* 10. Start UART reception for battery data from Simulink */
    CMU_StartUartReception();

    /* 11. Create FreeRTOS queues */
    txDataQueue = xQueueCreate(1U, BATTERY_DATA_SIZE);  /* depth=1, xQueueOverwrite used */
    csecMutex   = xSemaphoreCreateMutex();

    /* 12. Create FreeRTOS tasks */
    if (xTaskCreate(CMU_UartRxTask, "UartRx",
                    configMINIMAL_STACK_SIZE + TASK_CANRX_STACK, NULL,
                    tskIDLE_PRIORITY + TASK_CANRX_PRIORITY, NULL) != pdPASS ||
        xTaskCreate(CMU_ProtocolTask, "Protocol",
                    configMINIMAL_STACK_SIZE + TASK_PROTOCOL_STACK, NULL,
                    tskIDLE_PRIORITY + TASK_PROTOCOL_PRIORITY, NULL) != pdPASS ||
        xTaskCreate(CMU_CanTxTask, "CanTx",
                    configMINIMAL_STACK_SIZE + TASK_DATAPROC_STACK, NULL,
                    tskIDLE_PRIORITY + TASK_DATAPROC_PRIORITY, NULL) != pdPASS ||
        xTaskCreate(CMU_MonitorTask, "Monitor",
                    configMINIMAL_STACK_SIZE + TASK_MONITOR_STACK, NULL,
                    tskIDLE_PRIORITY + TASK_MONITOR_PRIORITY, NULL) != pdPASS)
    {
        for (;;) {}  /* Task creation failed — halt */
    }

    vTaskStartScheduler();
    for (;;) {}

    return 0;
}

/*============================================================================
 *  FreeRTOS Task: UART RX (highest priority)
 *  Polls UART for incoming battery data from Simulink/dataProcess.py.
 *  When a complete frame is received, enqueues it to txDataQueue.
 *============================================================================*/
static void CMU_UartRxTask(void *pvParameters)
{
    (void)pvParameters;

    for (;;)
    {
        CMU_PollUartRx();

        if (g_uart_rx_complete)
        {
            if (CMU_ParseUartFrame(g_uart_rx_buf, UART_FRAME_TOTAL, g_battery_data))
            {
                xQueueOverwrite(txDataQueue, g_battery_data);
            }
            CMU_StartUartReception();
        }

        vTaskDelay(pdMS_TO_TICKS(TASK_CANRX_DELAY_MS));
    }
}

/*============================================================================
 *  FreeRTOS Task: CMU Protocol State Machine
 *  Handles: INIT, KEY_EXCHANGE, WAIT_ACK, RESYNC, ERROR states.
 *  OPERATIONAL state is handled by CanTxTask.
 *============================================================================*/
static void CMU_ProtocolTask(void *pvParameters)
{
    (void)pvParameters;
    Flexcan_Ip_MsgBuffType rxMsg;

    while (1)
    {
        g_lastESR1 = IP_FLEXCAN0->ESR1;
        g_lastECR  = IP_FLEXCAN0->ECR;

        switch (g_proto_state)
        {
        /*--- INIT: Generate seed, encrypt UID+Seed, prepare key frame ---*/
        case PROTO_STATE_INIT:
        {
            Csec_Ip_ErrorCodeType result;
            uint8 challenge[UID_SIZE] = {0};
            uint8 mac_buf[CMAC_TAG_SIZE];
            uint8 uid_status;

            /* Generate random seed */
            result = Csec_Ip_GenerateRnd(&g_csec_req, g_seed);
            if (result != CSEC_IP_ERC_NO_ERROR)
            {
                g_proto_state = PROTO_STATE_ERROR;
                break;
            }

            /* Get device UID */
            result = Csec_Ip_GetId(challenge, g_uid, &uid_status, mac_buf);
            if (result != CSEC_IP_ERC_NO_ERROR)
            {
                g_proto_state = PROTO_STATE_ERROR;
                break;
            }

            /* Encrypt UID and Seed with PSK */
            result = CMU_AesEcbEncrypt(g_uid, UID_SIZE, g_encrypted_uid);
            if (result != CSEC_IP_ERC_NO_ERROR)
            {
                g_proto_state = PROTO_STATE_ERROR;
                break;
            }

            result = CMU_AesEcbEncrypt(g_seed, SEED_SIZE, g_encrypted_seed);
            if (result != CSEC_IP_ERC_NO_ERROR)
            {
                g_proto_state = PROTO_STATE_ERROR;
                break;
            }

            /* Build key exchange frame buffer */
            memcpy(&g_key_frame_buf[0], g_encrypted_uid, UID_SIZE);
            memcpy(&g_key_frame_buf[UID_SIZE], g_encrypted_seed, SEED_SIZE);

            g_proto_state = PROTO_STATE_KEY_EXCHANGE;
            break;
        }

        /*--- KEY_EXCHANGE: Send key frame, wait for ACK ---*/
        case PROTO_STATE_KEY_EXCHANGE:
        {
            /* Send key exchange frame on CAN ID 0x15 */
            FlexCAN_Ip_Send(INST_FLEXCAN_0, CAN_TX_MB_IDX, &g_canfd_tx_key_info,
                            CAN_ID_KEY_EXCHANGE, g_key_frame_buf);

            {
                volatile uint32 timeout = TIMEOUT_CAN_TX;
                while ((FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_TX_MB_IDX)
                        == FLEXCAN_STATUS_BUSY) && (timeout > 0U))
                {
                    FlexCAN_Ip_MainFunctionWrite(INST_FLEXCAN_0, CAN_TX_MB_IDX);
                    timeout--;
                }
            }

            g_lastCanStatus = FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_TX_MB_IDX);

            if (g_lastCanStatus != FLEXCAN_STATUS_SUCCESS)
            {
                /* TX failed (no ACK on bus?), retry after delay */
                g_txFailCount++;
                vTaskDelay(pdMS_TO_TICKS(KEY_EXCHANGE_TIMEOUT_MS));
                break;
            }

            g_txOkCount++;
            g_proto_state = PROTO_STATE_WAIT_ACK;
            break;
        }

        /*--- WAIT_ACK: Wait for ACK from BMU on ID 0x16 ---*/
        case PROTO_STATE_WAIT_ACK:
        {
            /* Poll CAN_RX_MB_DATA for ACK */
            FlexCAN_Ip_Receive(INST_FLEXCAN_0, CAN_RX_MB_DATA, &rxMsg, TRUE);

            volatile uint32 timeout = TIMEOUT_ACK_WAIT;
            while ((FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_RX_MB_DATA)
                    == FLEXCAN_STATUS_BUSY) && (timeout > 0U))
            {
                FlexCAN_Ip_MainFunctionRead(INST_FLEXCAN_0, CAN_RX_MB_DATA);
                timeout--;
            }

            if ((FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_RX_MB_DATA)
                 == FLEXCAN_STATUS_SUCCESS)
                && (rxMsg.data[0] == ACK_MARKER))
            {
                /* Verify ACK CMAC (PSK-based, 24B = 8B data + 16B CMAC) */
                {
                    uint8 expected_mac[CMAC_TAG_SIZE];
                    Csec_Ip_ErrorCodeType cmacResult;
                    cmacResult = CMU_GenerateCmac(rxMsg.data, CTRL_DATA_SIZE * 8U, expected_mac);
                    if (cmacResult != CSEC_IP_ERC_NO_ERROR)
                    {
                        g_proto_state = PROTO_STATE_ERROR;
                        break;
                    }
                    if (memcmp(expected_mac, &rxMsg.data[CTRL_DATA_SIZE], CMAC_TAG_SIZE) != 0)
                    {
                        /* CMAC mismatch — ACK might be spoofed */
                        break;
                    }
                }

                /* ACK verified - derive session key */
                Csec_Ip_ErrorCodeType result;
                result = CMU_DeriveSessionKey(g_uid, g_seed, g_session_key);
                if (result != CSEC_IP_ERC_NO_ERROR)
                {
                    g_proto_state = PROTO_STATE_ERROR;
                    break;
                }

                /* Load session key into CSEc RAM (overwrites PSK) */
                result = Csec_Ip_LoadPlainKey(g_session_key);
                memset(g_session_key, 0, AES_KEY_SIZE);

                if (result != CSEC_IP_ERC_NO_ERROR)
                {
                    g_proto_state = PROTO_STATE_ERROR;
                    break;
                }

                g_freshness_counter = 0U;
                g_proto_state = PROTO_STATE_OPERATIONAL;
            }
            else
            {
                /* Timeout - resend key exchange */
                g_proto_state = PROTO_STATE_KEY_EXCHANGE;
            }
            break;
        }

        /*--- OPERATIONAL: Check for Resync from BMU ---*/
        case PROTO_STATE_OPERATIONAL:
        {
            /* Check for resync request from BMU (quick non-blocking poll) */
            FlexCAN_Ip_Receive(INST_FLEXCAN_0, CAN_RX_MB_CTRL, &rxMsg, TRUE);
            {
                volatile uint32 chk = TIMEOUT_RESYNC_CHECK;
                while ((FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_RX_MB_CTRL)
                        == FLEXCAN_STATUS_BUSY) && (chk > 0U))
                {
                    FlexCAN_Ip_MainFunctionRead(INST_FLEXCAN_0, CAN_RX_MB_CTRL);
                    chk--;
                }
            }
            if (FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_RX_MB_CTRL)
                == FLEXCAN_STATUS_SUCCESS)
            {
                /* Reload PSK for Resync CMAC verification — mutex protects CSEc RAM KEY */
                xSemaphoreTake(csecMutex, portMAX_DELAY);
                Csec_Ip_ErrorCodeType pskResult = Csec_Ip_LoadPlainKey(PreSharedKey);
                if (pskResult != CSEC_IP_ERC_NO_ERROR)
                {
                    xSemaphoreGive(csecMutex);
                    g_proto_state = PROTO_STATE_ERROR;
                    break;
                }
                uint8 expected_mac[CMAC_TAG_SIZE];
                Csec_Ip_ErrorCodeType cmacR = CMU_GenerateCmac(rxMsg.data, CTRL_DATA_SIZE * 8U, expected_mac);
                xSemaphoreGive(csecMutex);
                if (cmacR != CSEC_IP_ERC_NO_ERROR)
                {
                    break;
                }
                if (memcmp(expected_mac, &rxMsg.data[CTRL_DATA_SIZE], CMAC_TAG_SIZE) == 0)
                {
                    g_proto_state = PROTO_STATE_RESYNC;
                }
                break;
            }

            /* No resync — just yield; CanTxTask handles data transmission */
            vTaskDelay(pdMS_TO_TICKS(TASK_PROTOCOL_DELAY_MS));
            break;
        }

        /*--- RESYNC: Re-initialize keys ---*/
        case PROTO_STATE_RESYNC:
            /* Reload PSK */
            if (Csec_Ip_LoadPlainKey(PreSharedKey) != CSEC_IP_ERC_NO_ERROR)
            {
                g_proto_state = PROTO_STATE_ERROR;
                break;
            }
            g_freshness_counter = 0U;
            g_proto_state = PROTO_STATE_INIT;
            break;

        /*--- ERROR: Crypto failure ---*/
        case PROTO_STATE_ERROR:
            GPIOD_PTOR = (1u << LED_RED_PIN);
            vTaskDelay(pdMS_TO_TICKS(TASK_ERROR_DELAY_MS));
            break;

        default:
            g_proto_state = PROTO_STATE_ERROR;
            break;
        }
        vTaskDelay(pdMS_TO_TICKS(TASK_PROTOCOL_DELAY_MS));
    }
}

/*============================================================================
 *  FreeRTOS Task: CAN TX (data transmission)
 *  Periodically sends CMAC-authenticated battery data via CAN-FD.
 *  Uses data from txDataQueue (real UART data) or simulated fallback.
 *============================================================================*/
static void CMU_CanTxTask(void *pvParameters)
{
    (void)pvParameters;
    uint32 txCount = 0U;
    uint8 latestData[BATTERY_DATA_SIZE];
    boolean hasRealData = FALSE;

    for (;;)
    {
        /* Only transmit in OPERATIONAL state */
        if (g_proto_state != PROTO_STATE_OPERATIONAL)
        {
            vTaskDelay(pdMS_TO_TICKS(TASK_PROTOCOL_DELAY_MS));
            continue;
        }

        /* Check for new real data from UartRxTask */
        if (xQueueReceive(txDataQueue, latestData, 0U) == pdPASS)
        {
            hasRealData = TRUE;
        }

        const uint8 *tx_data;
        if (hasRealData)
        {
            tx_data = latestData;
        }
        else
        {
            /* Fallback: simulated data if no UART connected */
            static BatteryData_t simData;
            memset(&simData, 0, sizeof(simData));
            simData.current_A        = SIM_CURRENT_BASE + (float)(txCount % SIM_CURRENT_MOD) * SIM_CURRENT_STEP;
            simData.voltage_V        = SIM_VOLTAGE_BASE + (float)(txCount % SIM_VOLTAGE_MOD) * SIM_VOLTAGE_STEP;
            simData.soc_u16          = (uint16_t)(SIM_SOC_MAX - (txCount % SIM_SOC_MOD) * SIM_SOC_STEP);
            simData.discharge_cycles = (uint16_t)(txCount / SIM_CYCLES_DIV);
            simData.temperature_u16  = SIM_TEMP_DEFAULT;
            simData.cell_count       = NUM_CELLS_PARALLEL;
            simData.timestamp_ms     = (uint16_t)(txCount * SIM_TX_PERIOD_MS);
            simData.status_flags     = 0x00U;
            for (uint32 c = 0U; c < NUM_CELLS_PARALLEL; c++)
            {
                simData.cell_voltage[c] = (uint8)(SIM_CELL_VOLT_BASE + (txCount + c) % SIM_CELL_VOLT_MOD);
                simData.cell_soc[c]     = (uint8)(SIM_CELL_SOC_BASE - (txCount % SIM_CELL_SOC_MOD));
            }
            tx_data = (const uint8 *)&simData;
        }

        /* Send with CMAC authentication — mutex protects CSEc RAM KEY */
        xSemaphoreTake(csecMutex, portMAX_DELAY);
        boolean txResult = CMU_SendSecuredData(tx_data);
        xSemaphoreGive(csecMutex);
        if (txResult)
        {
            g_txOkCount++;
        }
        else
        {
            g_txFailCount++;
        }

        /* Toggle RED LED */
        GPIOD_PTOR = (1u << LED_RED_PIN);
        txCount++;

        g_lastCanStatus = FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_TX_MB_IDX);

        /* TX interval ~500ms */
        vTaskDelay(pdMS_TO_TICKS(CMU_TX_PERIOD_MS));
    }
}

/*============================================================================
 *  FreeRTOS Task: CMU System Monitor
 *============================================================================*/
static void CMU_MonitorTask(void *pvParameters)
{
    (void)pvParameters;
    for (;;)
    {
        g_lastESR1 = IP_FLEXCAN0->ESR1;
        g_lastECR  = IP_FLEXCAN0->ECR;
        vTaskDelay(pdMS_TO_TICKS(TASK_MONITOR_DELAY_MS));
    }
}

#ifdef __cplusplus
}
#endif
