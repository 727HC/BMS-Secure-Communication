/**
 * @file    main.c
 * @brief   BMU (Battery Management Unit) - S32K344 Integrated Firmware
 * @details Secure BMS communication: CAN-FD receive -> HSE CMAC verify -> UART output
 *
 * Base project: S32K344_CMAC (AUTOSAR RTD) or S32K344_CMAC_GenVer (HSE framework)
 *
 * Required S32DS peripheral configuration:
 *   - Clock:     System clock, FlexCAN clock, LPUART clock
 *   - Port:      CAN0_TX/RX pins, LPUART TX/RX pins
 *   - FlexCAN0:  CAN-FD enabled, BRS enabled, 64-byte payload, 500kbps/2Mbps
 *   - HSE:       HSE firmware installed, key catalogs formatted
 *   - LPUART:    28800 baud (LPUART6 bare-metal, OpenSDA Q172)
 *   - IntCtrl:   FlexCAN MB IRQ, MU0 IRQ (HSE)
 */

#ifdef __cplusplus
extern "C" {
#endif

/*============================================================================
 *  Includes
 *============================================================================*/
#include "Mcal.h"
#include "Clock_Ip.h"
#include "FlexCAN_Ip.h"
#include "IntCtrl_Ip.h"
#include "OsIf.h"
#include "Siul2_Port_Ip.h"
#include "Siul2_Port_Ip_Cfg.h"
#include "FlexCAN_Ip_Sa_PBcfg.h"

/* HSE includes */
#include "Hse_Ip.h"
#include "hse_interface.h"

#include <string.h>

/* FreeRTOS */
#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
#include "semphr.h"

/* Protocol definitions shared with CMU */
#include "common/bms_protocol.h"

/*============================================================================
 *  Configuration
 *============================================================================*/

/* Pre-Shared Key — separated into secrets.h (exclude from VCS) */
#include "common/secrets.h"

/* HSE MU instance */
#define HSE_MU_INSTANCE         HSE_IP_MU_0

/* HSE key handles */
#define HSE_PSK_KEY_HANDLE      ((hseKeyHandle_t)GET_KEY_HANDLE(HSE_KEY_CATALOG_ID_RAM, 0U, 0U))
#define HSE_SESSION_KEY_HANDLE  ((hseKeyHandle_t)GET_KEY_HANDLE(HSE_KEY_CATALOG_ID_RAM, 0U, 1U))

/* EDDSA (Ed25519) key handle — NVM catalog, group 1, slot 0 */
#define HSE_ECC_KEY_HANDLE      ((hseKeyHandle_t)GET_KEY_HANDLE(HSE_KEY_CATALOG_ID_NVM, 1U, 0U))

/* HSE Timeout */
#define HSE_TIMEOUT_TICKS       TIMEOUT_CRYPTO_INIT

/* S32K344 FlexCAN0 register addresses */
#define S32K344_FLEXCAN0_ESR1   (*(volatile uint32 *)0x40304020U)
#define S32K344_FLEXCAN0_ECR    (*(volatile uint32 *)0x40304024U)

/* CMU whitelist: authorized CMU UIDs */
#define CMU_WHITELIST_SIZE    4U
static uint8 CMU_UidWhitelist[CMU_WHITELIST_SIZE][UID_SIZE] = {0};
static uint8 g_whitelistCount = 0U;  /* Number of registered UIDs */
/* FALSE = discovery mode (auto-register first CMU_WHITELIST_SIZE UIDs)
   TRUE  = enforcement mode (reject unknown UIDs) */
static boolean g_whitelistEnforced = FALSE;
volatile uint8 g_lastUid[UID_SIZE];  /* Last received UID (visible in debugger) */


/*============================================================================
 *  HSE Service Descriptor Storage
 *============================================================================*/
static hseSrvDescriptor_t g_hse_srv_desc[HSE_NUM_OF_CHANNELS_PER_MU];
static Hse_Ip_MuStateType g_hse_mu_state;

/*============================================================================
 *  State Variables
 *============================================================================*/
static ProtocolState_t  g_proto_state = PROTO_STATE_INIT;
static uint32           g_expected_fc = 0U;
static uint8            g_cmac_fail_count = 0U;

/* Decrypted key material */
static uint8 g_decrypted_uid[UID_SIZE];
static uint8 g_decrypted_seed[SEED_SIZE];
static uint8 g_session_key[AES_KEY_SIZE];

/* Work buffers */
static uint8 g_cmac_input[CMAC_INPUT_SIZE];
static uint8 g_kdf_input[KDF_INPUT_SIZE];

/* EDDSA (Ed25519) buffers */
static uint8 g_eddsa_signR[EDDSA_SIGN_SIZE];
static uint8 g_eddsa_signS[EDDSA_SIGN_SIZE];
static uint32 g_eddsa_signRLen = EDDSA_SIGN_SIZE;
static uint32 g_eddsa_signSLen = EDDSA_SIGN_SIZE;
static uint8 g_eddsa_pubkey[EDDSA_PUBKEY_SIZE];  /* Ed25519 public key */
volatile boolean g_eddsaReady = FALSE;
volatile uint32 g_eddsaSignCount = 0U;

/* FreeRTOS task prototypes */
static void BMU_CanRxTask(void *pvParameters);
static void BMU_ProtocolTask(void *pvParameters);
static void BMU_DataProcessTask(void *pvParameters);
static void BMU_MonitorTask(void *pvParameters);

/* FreeRTOS queues */
static QueueHandle_t rxQueue;    /* CanRxTask → ProtocolTask */
static QueueHandle_t procQueue;  /* ProtocolTask → DataProcessTask */

/* UART mutex for thread-safe debug output */
static SemaphoreHandle_t uartMutex;

/* Queue drop counters (visible in debugger) */
volatile uint32 g_rxQueueDropCount  = 0U;
volatile uint32 g_procQueueDropCount = 0U;

/* CAN reception */
static volatile boolean g_can_tx_done = TRUE;

/*============================================================================
 *  CAN-FD Configuration
 *============================================================================*/
static Flexcan_Ip_DataInfoType g_canfd_tx_info = {
    .fd_enable   = TRUE,
    .enable_brs  = TRUE,
    .msg_id_type = FLEXCAN_MSG_ID_STD,
    .data_length = CANFD_RX_DATA_LENGTH,
    .is_polling  = TRUE,
    .is_remote   = FALSE
};

/*============================================================================
 *  LPUART6 Debug Output (bare-metal, no RTD driver)
 *  S32K3X4EVB-Q172: LPUART6 TX = PTA16 → OpenSDA Virtual COM
 *  Clock source: FIRC 48MHz → LPUART6
 *============================================================================*/

/* LPUART6 registers (OpenSDA UART on S32K3X4EVB-Q172) */
#define LPUART6_BASE    0x40340000U
#define LPUART6_BAUD    (*(volatile uint32 *)(LPUART6_BASE + 0x10U))
#define LPUART6_STAT    (*(volatile uint32 *)(LPUART6_BASE + 0x14U))
#define LPUART6_CTRL    (*(volatile uint32 *)(LPUART6_BASE + 0x18U))
#define LPUART6_DATA    (*(volatile uint32 *)(LPUART6_BASE + 0x1CU))

/* SIUL2 MSCR for PTA16 (LPUART6_TX on Q172 EVB) */
/* S32K344: SIUL2_0 base=0x40290000, MSCR offset=0x240 */
#define SIUL2_MSCR(n)   (*(volatile uint32 *)(0x40290000U + 0x240U + 4U * (n)))

/* LPUART BAUD register bits */
#define LPUART_BAUD_SBR_MASK    0x1FFFU
#define LPUART_BAUD_OSR_SHIFT   24U
#define LPUART_BAUD_OSR_MASK    (0x1FU << LPUART_BAUD_OSR_SHIFT)

/* LPUART CTRL register bits */
#define LPUART_CTRL_TE          (1U << 19U)  /* Transmitter Enable */
#define LPUART_CTRL_RE          (1U << 18U)  /* Receiver Enable */

/* LPUART STAT register bits */
#define LPUART_STAT_TDRE        (1U << 23U)  /* TX Data Register Empty */
#define LPUART_STAT_TC          (1U << 22U)  /* Transmission Complete */

/* LPUART6 baud: 28800 baud actual @ 48MHz/4=12MHz, OSR=15, SBR=26 */
#define LPUART6_OSR_VALUE       15U
#define LPUART6_SBR_VALUE       26U

/* SIUL2 MSCR field bits */
#define SIUL2_MSCR_OBE          (1U << 21U)  /* Output Buffer Enable */
#define SIUL2_MSCR_SRE          (1U << 14U)  /* Slew Rate Enable */
#define LPUART6_TX_SSS          5U           /* PTA16 LPUART6_TX = ALT5 */

/* MC_ME unlock key sequence */
#define MC_ME_KEY               0x5AF0U
#define MC_ME_KEY_INV           0xA50FU

volatile uint32 g_lpuartStat = 0U;
volatile uint32 g_lpuartBaud = 0U;
volatile uint32 g_lpuartCtrl = 0U;

/* MC_ME registers for clock gating (S32K344) */
#define MC_ME_BASE              0x402DC000U
#define MC_ME_PRTN1_COFB2_CLKEN (*(volatile uint32 *)(MC_ME_BASE + 0x338U))
#define MC_ME_PRTN1_COFB2_STAT  (*(volatile uint32 *)(MC_ME_BASE + 0x318U))
#define MC_ME_PRTN1_PUPD        (*(volatile uint32 *)(MC_ME_BASE + 0x304U))
#define MC_ME_CTL_KEY           (*(volatile uint32 *)(MC_ME_BASE + 0x000U))
/* S32K344: CTL_KEY_INV is written to the SAME register (offset 0x000), NOT 0x004 */
#define MC_ME_CTL_KEY_INV       (*(volatile uint32 *)(MC_ME_BASE + 0x000U))

/* LPUART6 = PRTN1_COFB2_REQ80 → bit (80-64) = bit 16 in COFB2 */
#define MC_ME_LPUART6_REQ_BIT   (1U << 16U)

/* MC_ME PRTN1 registers (must be at file scope — preprocessor ignores function scope) */
#define MC_ME_PRTN1_PCONF (*(volatile uint32 *)(MC_ME_BASE + 0x300U))

static void BMU_InitLpuart6(void)
{
    /* 0. Enable LPUART6 clock via MC_ME (PRTN1_COFB2, REQ80) */
    MC_ME_PRTN1_COFB2_CLKEN |= MC_ME_LPUART6_REQ_BIT;
    MC_ME_PRTN1_PCONF |= 1U;
    MC_ME_PRTN1_PUPD  |= 1U;
    MC_ME_CTL_KEY      = MC_ME_KEY;
    MC_ME_CTL_KEY_INV  = MC_ME_KEY_INV;
    while (!(MC_ME_PRTN1_COFB2_STAT & MC_ME_LPUART6_REQ_BIT)) { /* wait */ }

    /* 1. PTA16 = LPUART6_TX */
    SIUL2_MSCR(16) = LPUART6_TX_SSS | SIUL2_MSCR_OBE | SIUL2_MSCR_SRE;

    /* 2. LPUART6 init */
    LPUART6_CTRL = 0U;
    LPUART6_BAUD = (LPUART6_OSR_VALUE << LPUART_BAUD_OSR_SHIFT) | LPUART6_SBR_VALUE;

    /* 3. Enable transmitter */
    LPUART6_CTRL = LPUART_CTRL_TE;

    /* Debug: capture register values */
    g_lpuartStat = LPUART6_STAT;
    g_lpuartBaud = LPUART6_BAUD;
    g_lpuartCtrl = LPUART6_CTRL;
}

static void UART_SendChar(char c)
{
    while (!(LPUART6_STAT & LPUART_STAT_TDRE)) { /* wait */ }
    LPUART6_DATA = (uint32)(uint8)c;
}

/* Mutex-protected UART output to prevent interleaving between tasks */
static inline void UART_Lock(void)
{
    if (uartMutex != NULL) { xSemaphoreTake(uartMutex, portMAX_DELAY); }
}

static inline void UART_Unlock(void)
{
    if (uartMutex != NULL) { xSemaphoreGive(uartMutex); }
}

static void UART_SendString(const char *msg)
{
    if ((msg == NULL) || (*msg == '\0')) return;
    while (*msg)
    {
        UART_SendChar(*msg++);
    }
}

static void UART_SendHex(const uint8 *data, uint32 len)
{
    static const char hex[] = "0123456789ABCDEF";
    for (uint32 i = 0U; i < len; i++)
    {
        UART_SendChar(hex[data[i] >> 4]);
        UART_SendChar(hex[data[i] & 0x0FU]);
        if (i < (len - 1U)) UART_SendChar(' ');
    }
}

/*============================================================================
 *  FlexCAN Callback
 *============================================================================*/
extern void CAN0_ORED_0_31_MB_IRQHandler(void);

void FlexCAN_Callback(uint8 instance,
                       Flexcan_Ip_EventType eventType,
                       uint32 mbIdx,
                       const Flexcan_Ip_StateType *state)
{
    (void)instance;
    (void)mbIdx;
    (void)state;

    if (eventType == FLEXCAN_EVENT_TX_COMPLETE)
    {
        g_can_tx_done = TRUE;
    }
}

/*============================================================================
 *  HSE Helpers
 *============================================================================*/

/** Wait for HSE firmware initialization */
static boolean BMU_WaitHseReady(void)
{
    uint32 timeout = HSE_TIMEOUT_TICKS;
    while (timeout > 0U)
    {
        if (HSE_STATUS_INIT_OK == (Hse_Ip_GetHseStatus(0U) & HSE_STATUS_INIT_OK))
        {
            return TRUE;
        }
        timeout--;
    }
    return FALSE;
}

/** Format HSE key catalogs — must match FreeRTOS example structure
 *  (HSE NVM retains format across mass erase, so structure must be consistent) */
static hseSrvResponse_t BMU_FormatKeyCatalogs(void)
{
    /* RAM catalog: SHE + ECC_PUB + AES (matching FreeRTOS example) */
    static const hseKeyGroupCfgEntry_t ramCatalog[] = {
        {HSE_MU0_MASK, HSE_KEY_OWNER_ANY,  HSE_KEY_TYPE_SHE,     1U,  128U,            {0U, 0U}},
        {HSE_MU0_MASK, HSE_KEY_OWNER_ANY,  HSE_KEY_TYPE_ECC_PUB, 10U, HSE_KEY521_BITS, {0U, 0U}},
        {HSE_MU0_MASK, HSE_KEY_OWNER_ANY,  HSE_KEY_TYPE_AES,     2U,  HSE_KEY128_BITS, {0U, 0U}},
        {0U, 0U, 0U, 0U, 0U, {0U, 0U}}  /* Terminator */
    };

    /* NVM catalog: SHE + ECC_PAIR + AES (matching FreeRTOS example) */
    static const hseKeyGroupCfgEntry_t nvmCatalog[] = {
        {HSE_MU0_MASK, HSE_KEY_OWNER_ANY,  HSE_KEY_TYPE_SHE,      1U,  128U,            {0U, 0U}},
        {HSE_MU0_MASK, HSE_KEY_OWNER_CUST, HSE_KEY_TYPE_ECC_PAIR, 10U, HSE_KEY256_BITS, {0U, 0U}},
        {HSE_MU0_MASK, HSE_KEY_OWNER_CUST, HSE_KEY_TYPE_AES,      10U, HSE_KEY128_BITS, {0U, 0U}},
        /* Terminator */
        {0U, 0U, 0U, 0U, 0U, {0U, 0U}}
    };

    uint8 ch = Hse_Ip_GetFreeChannel(HSE_MU_INSTANCE);
    hseSrvDescriptor_t *pDesc = &g_hse_srv_desc[ch];

    memset(pDesc, 0, sizeof(hseSrvDescriptor_t));
    pDesc->srvId = HSE_SRV_ID_FORMAT_KEY_CATALOGS;

    hseFormatKeyCatalogsSrv_t *pFmt = &pDesc->hseSrv.formatKeyCatalogsReq;
    pFmt->pNvmKeyCatalogCfg = (HOST_ADDR)nvmCatalog;
    pFmt->pRamKeyCatalogCfg = (HOST_ADDR)ramCatalog;

    return Hse_Ip_ServiceRequest(HSE_MU_INSTANCE, ch,
                                 &(Hse_Ip_ReqType){
                                     .eReqType       = HSE_IP_REQTYPE_SYNC,
                                     .pfCallback      = NULL_PTR,
                                     .pCallbackParam  = NULL_PTR,
                                     .u32Timeout      = HSE_TIMEOUT_TICKS
                                 }, pDesc);
}

/** Import a symmetric key into HSE RAM catalog */
static hseSrvResponse_t BMU_ImportSymKey(hseKeyHandle_t keyHandle,
                                          const uint8 *keyData,
                                          uint16 keyBitLen)
{
    uint8 ch = Hse_Ip_GetFreeChannel(HSE_MU_INSTANCE);
    hseSrvDescriptor_t *pDesc = &g_hse_srv_desc[ch];

    memset(pDesc, 0, sizeof(hseSrvDescriptor_t));
    pDesc->srvId = HSE_SRV_ID_IMPORT_KEY;

    hseImportKeySrv_t *pImport = &pDesc->hseSrv.importKeyReq;
    pImport->pKeyInfo = (HOST_ADDR)&(hseKeyInfo_t){
        .keyFlags  = HSE_KF_USAGE_ENCRYPT | HSE_KF_USAGE_DECRYPT |
                     HSE_KF_USAGE_SIGN    | HSE_KF_USAGE_VERIFY,
        .keyBitLen = keyBitLen,
        .keyType   = HSE_KEY_TYPE_AES
    };
    pImport->targetKeyHandle = keyHandle;
    pImport->pKey[2]         = (HOST_ADDR)keyData;
    pImport->keyLen[2]       = keyBitLen / 8U;
    pImport->cipher.cipherKeyHandle = HSE_INVALID_KEY_HANDLE;
    pImport->keyContainer.authKeyHandle = HSE_INVALID_KEY_HANDLE;

    return Hse_Ip_ServiceRequest(HSE_MU_INSTANCE, ch,
                                 &(Hse_Ip_ReqType){
                                     .eReqType       = HSE_IP_REQTYPE_SYNC,
                                     .pfCallback      = NULL_PTR,
                                     .pCallbackParam  = NULL_PTR,
                                     .u32Timeout      = HSE_TIMEOUT_TICKS
                                 }, pDesc);
}

/** AES-128 ECB Decrypt */
static hseSrvResponse_t BMU_AesEcbDecrypt(hseKeyHandle_t keyHandle,
                                            const uint8 *cipher,
                                            uint8 *plain,
                                            uint32 inputLen)
{
    uint8 ch = Hse_Ip_GetFreeChannel(HSE_MU_INSTANCE);
    hseSrvDescriptor_t *pDesc = &g_hse_srv_desc[ch];

    memset(pDesc, 0, sizeof(hseSrvDescriptor_t));
    pDesc->srvId = HSE_SRV_ID_SYM_CIPHER;

    hseSymCipherSrv_t *pCipher = &pDesc->hseSrv.symCipherReq;
    pCipher->accessMode     = HSE_ACCESS_MODE_ONE_PASS;
    pCipher->cipherAlgo     = HSE_CIPHER_ALGO_AES;
    pCipher->cipherBlockMode = HSE_CIPHER_BLOCK_MODE_ECB;
    pCipher->cipherDir      = HSE_CIPHER_DIR_DECRYPT;
    pCipher->keyHandle      = keyHandle;
    pCipher->inputLength    = inputLen;
    pCipher->pInput         = (HOST_ADDR)cipher;
    pCipher->pOutput        = (HOST_ADDR)plain;
    pCipher->sgtOption      = HSE_SGT_OPTION_NONE;

    return Hse_Ip_ServiceRequest(HSE_MU_INSTANCE, ch,
                                 &(Hse_Ip_ReqType){
                                     .eReqType       = HSE_IP_REQTYPE_SYNC,
                                     .pfCallback      = NULL_PTR,
                                     .pCallbackParam  = NULL_PTR,
                                     .u32Timeout      = HSE_TIMEOUT_TICKS
                                 }, pDesc);
}

/** AES-128 CMAC Generate (for KDF) */
static hseSrvResponse_t BMU_CmacGenerate(hseKeyHandle_t keyHandle,
                                           const uint8 *input,
                                           uint32 inputLen,
                                           uint8 *tag,
                                           uint32 *tagLen)
{
    uint8 ch = Hse_Ip_GetFreeChannel(HSE_MU_INSTANCE);
    hseSrvDescriptor_t *pDesc = &g_hse_srv_desc[ch];

    memset(pDesc, 0, sizeof(hseSrvDescriptor_t));
    pDesc->srvId = HSE_SRV_ID_MAC;

    hseMacSrv_t *pMac = &pDesc->hseSrv.macReq;
    pMac->accessMode  = HSE_ACCESS_MODE_ONE_PASS;
    pMac->authDir     = HSE_AUTH_DIR_GENERATE;
    pMac->sgtOption   = HSE_SGT_OPTION_NONE;
    pMac->macScheme.macAlgo = HSE_MAC_ALGO_CMAC;
    pMac->macScheme.sch.cmac.cipherAlgo = HSE_CIPHER_ALGO_AES;
    pMac->keyHandle   = keyHandle;
    pMac->inputLength = inputLen;
    pMac->pInput      = (HOST_ADDR)input;
    pMac->pTag        = (HOST_ADDR)tag;
    pMac->pTagLength  = (HOST_ADDR)tagLen;

    return Hse_Ip_ServiceRequest(HSE_MU_INSTANCE, ch,
                                 &(Hse_Ip_ReqType){
                                     .eReqType       = HSE_IP_REQTYPE_SYNC,
                                     .pfCallback      = NULL_PTR,
                                     .pCallbackParam  = NULL_PTR,
                                     .u32Timeout      = HSE_TIMEOUT_TICKS
                                 }, pDesc);
}

/** AES-128 CMAC Verify */
static hseSrvResponse_t BMU_CmacVerify(hseKeyHandle_t keyHandle,
                                         const uint8 *input,
                                         uint32 inputLen,
                                         const uint8 *tag,
                                         uint32 tagLen)
{
    uint8 ch = Hse_Ip_GetFreeChannel(HSE_MU_INSTANCE);
    hseSrvDescriptor_t *pDesc = &g_hse_srv_desc[ch];

    memset(pDesc, 0, sizeof(hseSrvDescriptor_t));
    pDesc->srvId = HSE_SRV_ID_MAC;

    hseMacSrv_t *pMac = &pDesc->hseSrv.macReq;
    pMac->accessMode  = HSE_ACCESS_MODE_ONE_PASS;
    pMac->authDir     = HSE_AUTH_DIR_VERIFY;
    pMac->sgtOption   = HSE_SGT_OPTION_NONE;
    pMac->macScheme.macAlgo = HSE_MAC_ALGO_CMAC;
    pMac->macScheme.sch.cmac.cipherAlgo = HSE_CIPHER_ALGO_AES;
    pMac->keyHandle   = keyHandle;
    pMac->inputLength = inputLen;
    pMac->pInput      = (HOST_ADDR)input;
    pMac->pTag        = (HOST_ADDR)tag;
    pMac->pTagLength  = (HOST_ADDR)&tagLen;

    return Hse_Ip_ServiceRequest(HSE_MU_INSTANCE, ch,
                                 &(Hse_Ip_ReqType){
                                     .eReqType       = HSE_IP_REQTYPE_SYNC,
                                     .pfCallback      = NULL_PTR,
                                     .pCallbackParam  = NULL_PTR,
                                     .u32Timeout      = HSE_TIMEOUT_TICKS
                                 }, pDesc);
}

/*============================================================================
 *  Key Exchange Handling
 *============================================================================*/
static boolean BMU_HandleKeyExchange(const uint8 *rx_data)
{
    hseSrvResponse_t hse_resp;

    UART_SendString("[BMU] Processing key exchange...\r\n");

    /* 1. Extract encrypted UID and Seed */
    const uint8 *enc_uid  = &rx_data[0];
    const uint8 *enc_seed = &rx_data[UID_SIZE];

    /* 2. Decrypt UID using PSK */
    hse_resp = BMU_AesEcbDecrypt(HSE_PSK_KEY_HANDLE, enc_uid, g_decrypted_uid, UID_SIZE);
    if (hse_resp != HSE_SRV_RSP_OK)
    {
        UART_SendString("[BMU] ERR: Decrypt UID failed\r\n");
        return FALSE;
    }

    /* 3. Decrypt Seed using PSK */
    hse_resp = BMU_AesEcbDecrypt(HSE_PSK_KEY_HANDLE, enc_seed, g_decrypted_seed, SEED_SIZE);
    if (hse_resp != HSE_SRV_RSP_OK)
    {
        UART_SendString("[BMU] ERR: Decrypt Seed failed\r\n");
        return FALSE;
    }

    UART_SendString("[BMU] Decrypted UID: ");
    UART_SendHex(g_decrypted_uid, UID_SIZE);
    UART_SendString("\r\n");

    /* Save UID for debugger inspection */
    memcpy((void *)g_lastUid, g_decrypted_uid, UID_SIZE);

    /* 4. Verify UID against whitelist */
    {
        /* Check if UID is already registered */
        boolean uid_found = FALSE;
        for (uint8 w = 0U; w < g_whitelistCount; w++)
        {
            if (memcmp(g_decrypted_uid, CMU_UidWhitelist[w], UID_SIZE) == 0)
            {
                uid_found = TRUE;
                break;
            }
        }

        if (!uid_found)
        {
            if (!g_whitelistEnforced && (g_whitelistCount < CMU_WHITELIST_SIZE))
            {
                /* Discovery mode: auto-register new UID */
                memcpy(CMU_UidWhitelist[g_whitelistCount], g_decrypted_uid, UID_SIZE);
                g_whitelistCount++;
                UART_SendString("[BMU] UID auto-registered (discovery)\r\n");

                /* Auto-lock after all slots filled */
                if (g_whitelistCount >= CMU_WHITELIST_SIZE)
                {
                    g_whitelistEnforced = TRUE;
                    UART_SendString("[BMU] Whitelist FULL -> enforcement mode\r\n");
                }
            }
            else
            {
                /* Enforcement mode or slots full: reject */
                UART_SendString("[BMU] ERR: UID not in whitelist!\r\n");
                return FALSE;
            }
        }
        else
        {
            UART_SendString("[BMU] UID verified OK\r\n");
        }
    }

    /* 5. Derive session key: CMAC(PSK, Label || UID || Seed || 0x01) */
    BMS_BuildKdfInput(g_kdf_input, g_decrypted_uid, g_decrypted_seed);

    uint32 tag_len = AES_KEY_SIZE;
    hse_resp = BMU_CmacGenerate(HSE_PSK_KEY_HANDLE,
                                 g_kdf_input, KDF_INPUT_SIZE,
                                 g_session_key, &tag_len);
    if (hse_resp != HSE_SRV_RSP_OK)
    {
        UART_SendString("[BMU] ERR: KDF failed\r\n");
        return FALSE;
    }

    /* 6. Import session key into HSE */
    hse_resp = BMU_ImportSymKey(HSE_SESSION_KEY_HANDLE, g_session_key, AES_KEY_BITS);
    if (hse_resp != HSE_SRV_RSP_OK)
    {
        UART_SendString("[BMU] ERR: Import session key failed\r\n");
        return FALSE;
    }

    /* Clear session key from RAM */
    memset(g_session_key, 0, AES_KEY_SIZE);

    /* 7. Reset freshness counter */
    g_expected_fc = 1U;  /* CMU starts at 1 (pre-increments) */
    g_cmac_fail_count = 0U;

    UART_SendString("[BMU] Session key derived and imported\r\n");

    /* 8. Send authenticated ACK to CMU */
    {
        uint8 ack_frame[CTRL_FRAME_SIZE] = {0};
        ack_frame[0] = ACK_MARKER;
        /* CMAC(PSK, ack_data[8]) → append to ack_frame[8..23] */
        uint32 ackTagLen = CMAC_TAG_SIZE;
        /* ACK is sent before CMU loads session key, so use PSK for CMAC */
        hse_resp = BMU_CmacGenerate(HSE_PSK_KEY_HANDLE, ack_frame, CTRL_DATA_SIZE,
                                    &ack_frame[CTRL_DATA_SIZE], &ackTagLen);
        if (hse_resp != HSE_SRV_RSP_OK)
        {
            UART_SendString("[BMU] ERR: ACK CMAC generate failed\r\n");
            return FALSE;
        }
        Flexcan_Ip_DataInfoType txCtrl = g_canfd_tx_info;
        txCtrl.data_length = CTRL_FRAME_SIZE;
        FlexCAN_Ip_Send(INST_FLEXCAN_0, CAN_TX_MB_IDX,
                        &txCtrl, CAN_ID_KEY_ACK, ack_frame);
    }

    /* Wait for TX complete (polling) */
    {
        volatile uint32 txWait = TIMEOUT_CAN_TX;
        while ((FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_TX_MB_IDX)
                == FLEXCAN_STATUS_BUSY) && (txWait > 0U))
        {
            FlexCAN_Ip_MainFunctionWrite(INST_FLEXCAN_0, CAN_TX_MB_IDX);
            txWait--;
        }
    }

    return TRUE;
}

/*============================================================================
 *  Secured Data Verification
 *============================================================================*/
static boolean BMU_VerifySecuredData(const uint8 *rx_payload)
{
    const uint8 *battery_data = &rx_payload[0];
    const uint8 *received_cmac = &rx_payload[BATTERY_DATA_SIZE];
    const BatteryData_t *pFrame = (const BatteryData_t *)rx_payload;
    hseSrvResponse_t hse_resp;

    /* Read FC from payload (embedded in BatteryData_t.freshness_counter) */
    uint32 rx_fc = pFrame->freshness_counter;

    /* Check FC is within acceptable window.
     * Use subtraction to avoid uint32 overflow when g_expected_fc is near UINT32_MAX. */
    if (rx_fc < g_expected_fc || (rx_fc - g_expected_fc) >= FC_WINDOW_SIZE)
    {
        g_cmac_fail_count++;
        UART_SendString("[BMU] WARN: FC out of window\r\n");
        return FALSE;
    }

    /* Build CMAC input: FC(4B) || Data(48B) */
    BMS_BuildCmacInput(g_cmac_input, rx_fc, battery_data);

    /* Verify CMAC using session key */
    hse_resp = BMU_CmacVerify(HSE_SESSION_KEY_HANDLE,
                               g_cmac_input, CMAC_INPUT_SIZE,
                               received_cmac, CMAC_TAG_SIZE);

    if (hse_resp == HSE_SRV_RSP_OK)
    {
        g_expected_fc = rx_fc + 1U;
        g_cmac_fail_count = 0U;
        return TRUE;
    }

    g_cmac_fail_count++;
    UART_SendString("[BMU] WARN: CMAC verify failed\r\n");
    return FALSE;
}

/*============================================================================
 *  Process Verified Battery Data
 *============================================================================*/
static void UART_SendUint(uint32 val)
{
    char buf[11];
    int i = 10;
    buf[i] = '\0';
    if (val == 0U) { UART_SendChar('0'); return; }
    while (val > 0U && i > 0)
    {
        i--;
        buf[i] = '0' + (char)(val % 10U);
        val /= 10U;
    }
    UART_SendString(&buf[i]);
}

static void BMU_ProcessBatteryData(const uint8 *raw_data)
{
    const BatteryData_t *batt = (const BatteryData_t *)raw_data;

    UART_Lock();
    UART_SendString("[BMU] OK FC=");
    UART_SendUint(g_expected_fc - 1U);
    UART_SendString(" SOC=");
    UART_SendUint(batt->soc_u16);
    UART_SendString(" T=");
    UART_SendUint(batt->temperature_u16);
    UART_SendString(" Cyc=");
    UART_SendUint(batt->discharge_cycles);
    UART_SendString(" Cells=");
    UART_SendUint(batt->cell_count);
    UART_SendString("\r\n");
    UART_Unlock();
}

/*============================================================================
 *  Send Resync Request to CMU
 *============================================================================*/
static void BMU_SendResyncRequest(void)
{
    uint8 resync_frame[CTRL_FRAME_SIZE] = {0};
    resync_frame[0] = RESYNC_MARKER;
    /* CMAC(PSK, resync_data[8]) — CMU reloads PSK before verifying */
    uint32 resyncTagLen = CMAC_TAG_SIZE;
    hseSrvResponse_t resyncResp = BMU_CmacGenerate(HSE_PSK_KEY_HANDLE, resync_frame,
                                                    CTRL_DATA_SIZE,
                                                    &resync_frame[CTRL_DATA_SIZE],
                                                    &resyncTagLen);
    if (resyncResp != HSE_SRV_RSP_OK)
    {
        UART_SendString("[BMU] ERR: Resync CMAC generate failed\r\n");
        return;
    }
    Flexcan_Ip_DataInfoType txCtrl = g_canfd_tx_info;
    txCtrl.data_length = CTRL_FRAME_SIZE;
    FlexCAN_Ip_Send(INST_FLEXCAN_0, CAN_TX_MB_IDX,
                    &txCtrl, CAN_ID_RESYNC_REQ, resync_frame);

    /* Wait for TX complete (polling) */
    {
        volatile uint32 txWait = TIMEOUT_CAN_TX;
        while ((FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_TX_MB_IDX)
                == FLEXCAN_STATUS_BUSY) && (txWait > 0U))
        {
            FlexCAN_Ip_MainFunctionWrite(INST_FLEXCAN_0, CAN_TX_MB_IDX);
            txWait--;
        }
    }

    UART_SendString("[BMU] Resync request sent\r\n");
}

/*============================================================================
 *  CAN-FD RX Re-arm
 *============================================================================*/
/*============================================================================
 *  EDDSA (Ed25519) Key Generation and Signing
 *============================================================================*/
static hseSrvResponse_t BMU_GenerateEddsaKey(void)
{
    uint8 ch = Hse_Ip_GetFreeChannel(HSE_MU_INSTANCE);
    hseSrvDescriptor_t *pDesc = &g_hse_srv_desc[ch];

    memset(pDesc, 0, sizeof(hseSrvDescriptor_t));
    pDesc->srvId = HSE_SRV_ID_KEY_GENERATE;

    hseKeyGenerateSrv_t *pGen = &pDesc->hseSrv.keyGenReq;
    pGen->keyInfo.keyType    = HSE_KEY_TYPE_ECC_PAIR;
    pGen->keyInfo.keyFlags   = HSE_KF_USAGE_SIGN | HSE_KF_USAGE_VERIFY | HSE_KF_ACCESS_EXPORTABLE;
    pGen->keyInfo.keyBitLen  = HSE_KEY256_BITS;
    pGen->keyInfo.specific.eccCurveId = HSE_EC_25519_ED25519;
    pGen->keyGenScheme       = HSE_KEY_GEN_ECC_KEY_PAIR;
    pGen->targetKeyHandle    = HSE_ECC_KEY_HANDLE;
    pGen->sch.eccKey.pPubKey = (HOST_ADDR)g_eddsa_pubkey;

    return Hse_Ip_ServiceRequest(HSE_MU_INSTANCE, ch,
                                 &(Hse_Ip_ReqType){
                                     .eReqType  = HSE_IP_REQTYPE_SYNC,
                                     .u32Timeout = HSE_TIMEOUT_TICKS
                                 }, pDesc);
}

static hseSrvResponse_t BMU_EddsaSign(const uint8 *data, uint32 dataLen)
{
    uint8 ch = Hse_Ip_GetFreeChannel(HSE_MU_INSTANCE);
    hseSrvDescriptor_t *pDesc = &g_hse_srv_desc[ch];

    memset(pDesc, 0, sizeof(hseSrvDescriptor_t));
    pDesc->srvId = HSE_SRV_ID_SIGN;

    hseSignSrv_t *pSign = &pDesc->hseSrv.signReq;
    hseSignScheme_t scheme;
    scheme.signSch = HSE_SIGN_EDDSA;
    scheme.sch.eddsa.bHashEddsa    = FALSE;
    scheme.sch.eddsa.contextLength = 0U;
    scheme.sch.eddsa.pContext      = 0U;

    pSign->accessMode    = HSE_ACCESS_MODE_ONE_PASS;
    pSign->authDir       = HSE_AUTH_DIR_GENERATE;
    pSign->signScheme    = scheme;
    pSign->keyHandle     = HSE_ECC_KEY_HANDLE;
    pSign->pInput        = (HOST_ADDR)data;
    pSign->inputLength   = dataLen;
    pSign->bInputIsHashed = FALSE;
    pSign->sgtOption     = HSE_SGT_OPTION_NONE;

    g_eddsa_signRLen = EDDSA_SIGN_SIZE;
    g_eddsa_signSLen = EDDSA_SIGN_SIZE;
    pSign->pSignature[0]       = (HOST_ADDR)g_eddsa_signR;
    pSign->pSignatureLength[0] = (HOST_ADDR)&g_eddsa_signRLen;
    pSign->pSignature[1]       = (HOST_ADDR)g_eddsa_signS;
    pSign->pSignatureLength[1] = (HOST_ADDR)&g_eddsa_signSLen;

    return Hse_Ip_ServiceRequest(HSE_MU_INSTANCE, ch,
                                 &(Hse_Ip_ReqType){
                                     .eReqType  = HSE_IP_REQTYPE_SYNC,
                                     .u32Timeout = HSE_TIMEOUT_TICKS
                                 }, pDesc);
}

/*============================================================================
 *  Main
 *============================================================================*/
/*============================================================================
 *  DEBUG: CAN-FD BMS Data RX + TX ACK
 *============================================================================*/
volatile uint32 g_rxCount = 0U;
volatile uint32 g_rxId    = 0U;
volatile uint32 g_rxLen   = 0U;
volatile uint32 g_txCount = 0U;
volatile Flexcan_Ip_StatusType g_bmu_initStatus = FLEXCAN_STATUS_ERROR;
volatile Flexcan_Ip_StatusType g_txStatus = FLEXCAN_STATUS_ERROR;
volatile uint32 g_ESR1    = 0U;
volatile uint32 g_ECR     = 0U;
volatile Clock_Ip_StatusType g_clkStatus = CLOCK_IP_ERROR;
volatile uint32 g_debugMarker   = 0U;
volatile uint32 g_debugAfterClk = 0U;
volatile boolean g_hseReady = FALSE;
volatile uint32 g_hseImportStatus = 0U;
volatile uint32 g_hseFormatStatus = 0U;
volatile uint32 g_verifiedCount = 0U;
volatile uint32 g_cmacFailTotal = 0U;

/* Parsed BatteryData_t fields (visible in debugger) */
volatile float   g_batt_current  = 0.0f;
volatile float   g_batt_voltage  = 0.0f;
volatile uint16  g_batt_soc      = 0U;
volatile uint16  g_batt_temp     = 0U;
volatile uint16  g_batt_cycles   = 0U;
volatile uint8   g_batt_cells    = 0U;
volatile uint8   g_batt_flags    = 0U;
volatile uint8   g_batt_cellV0   = 0U;  /* first cell voltage */
volatile uint8   g_batt_cellV1   = 0U;  /* second cell voltage */

int main(void)
{
    g_debugMarker = DBG_MARKER_BOOT;

    /*--- 1. Clock Init ---*/
    /* After .mex fix: FIRC-only mode (no PLL), so this should succeed */
    g_clkStatus = Clock_Ip_Init(&Clock_Ip_aClockConfig[0]);
    Siul2_Port_Ip_Init(NUM_OF_CONFIGURED_PINS_PortContainer_0_BOARD_InitPeripherals,
                       g_pin_mux_InitConfigArr_PortContainer_0_BOARD_InitPeripherals);
    OsIf_Init(NULL_PTR);
    BMU_InitLpuart6();

    UART_SendString("\r\n[BMU] Boot: LPUART6 OK\r\n");
    /*--- 3. FlexCAN0 Init (Clock_Ip_Init handles gate via RTD) ---*/
    g_bmu_initStatus = FlexCAN_Ip_Init(INST_FLEXCAN_0, &FlexCAN_State0, &FlexCAN_Config0);

    /*--- 4. TDC for CAN-FD BRS ---*/
    FlexCAN_Ip_SetTDCOffset(INST_FLEXCAN_0, TRUE, CANFD_TDC_OFFSET);
    FlexCAN_Ip_SetStartMode(INST_FLEXCAN_0);

    /*--- 4b. HSE Init ---*/
    Hse_Ip_Init(HSE_MU_INSTANCE, &g_hse_mu_state);
    g_hseReady = BMU_WaitHseReady();

    if (g_hseReady)
    {
        /* Format key catalogs (required once, may return NOT_ALLOWED if already formatted) */
        g_hseFormatStatus = (uint32)BMU_FormatKeyCatalogs();
        UART_SendString("[BMU] Format status=");
        UART_SendUint(g_hseFormatStatus);
        UART_SendString("\r\n");

        /* Import PSK into HSE RAM key slot (try regardless of format result) */
        g_hseImportStatus = (uint32)BMU_ImportSymKey(HSE_PSK_KEY_HANDLE, PreSharedKey, AES_KEY_BITS);
        UART_SendString("[BMU] Import status=");
        UART_SendUint(g_hseImportStatus);
        UART_SendString("\r\n");

        #ifdef BMS_MODE_EDDSA
        /* Generate Ed25519 key pair for EDDSA signing */
        hseSrvResponse_t eccResp = BMU_GenerateEddsaKey();
        if (eccResp == HSE_SRV_RSP_OK)
        {
            g_eddsaReady = TRUE;
            UART_SendString("[BMU] Ed25519 key generated\r\n");
        }
        else
        {
            UART_SendString("[BMU] Ed25519 key gen failed\r\n");
        }
        #endif
    }

    /*--- 5. Configure RX Mailboxes (polling) ---*/
    Flexcan_Ip_DataInfoType rxInfo;
    rxInfo.fd_enable   = TRUE;
    rxInfo.enable_brs  = TRUE;
    rxInfo.msg_id_type = FLEXCAN_MSG_ID_STD;
    rxInfo.data_length = CANFD_RX_DATA_LENGTH;
    rxInfo.is_polling  = TRUE;
    rxInfo.is_remote   = FALSE;

    /* MB(CAN_RX_MB_DATA): Key Exchange from CMU (ID 0x15) */
    FlexCAN_Ip_ConfigRxMb(INST_FLEXCAN_0, CAN_RX_MB_DATA, &rxInfo, CAN_ID_KEY_EXCHANGE);

    /* MB(CAN_RX_MB_CTRL): Battery Data from CMU (ID 0x14) */
    FlexCAN_Ip_ConfigRxMb(INST_FLEXCAN_0, CAN_RX_MB_CTRL, &rxInfo, CAN_ID_BATTERY_DATA);

    /*--- 6. Set initial protocol state ---*/
    if (g_hseReady && (g_hseImportStatus == (uint32)HSE_SRV_RSP_OK))
    {
        g_proto_state = PROTO_STATE_INIT;
        g_debugMarker = DBG_MARKER_CRYPTO_OK;
    }
    else
    {
        g_proto_state = PROTO_STATE_ERROR;
        g_debugMarker = DBG_MARKER_CRYPTO_FAIL;
    }

    /*--- 7. Create FreeRTOS queues and mutex ---*/
    rxQueue   = xQueueCreate(RX_QUEUE_LENGTH,   sizeof(CanRxItem_t));
    procQueue = xQueueCreate(PROC_QUEUE_LENGTH,  sizeof(CanRxItem_t));
    uartMutex = xSemaphoreCreateMutex();

    if ((rxQueue == NULL) || (procQueue == NULL) || (uartMutex == NULL))
    {
        UART_SendString("[BMU] ERR: Queue/mutex creation failed\r\n");
        for (;;) {}
    }

    /*--- 8. Create FreeRTOS tasks ---*/
    UART_SendString("[BMU] Creating FreeRTOS tasks...\r\n");

    if (xTaskCreate(BMU_CanRxTask, "CanRx",
                    configMINIMAL_STACK_SIZE + TASK_CANRX_STACK, NULL,
                    tskIDLE_PRIORITY + TASK_CANRX_PRIORITY, NULL) != pdPASS ||
        xTaskCreate(BMU_ProtocolTask, "Protocol",
                    configMINIMAL_STACK_SIZE + TASK_PROTOCOL_STACK, NULL,
                    tskIDLE_PRIORITY + TASK_PROTOCOL_PRIORITY, NULL) != pdPASS ||
        xTaskCreate(BMU_DataProcessTask, "DataProc",
                    configMINIMAL_STACK_SIZE + TASK_DATAPROC_STACK, NULL,
                    tskIDLE_PRIORITY + TASK_DATAPROC_PRIORITY, NULL) != pdPASS ||
        xTaskCreate(BMU_MonitorTask, "Monitor",
                    configMINIMAL_STACK_SIZE + TASK_MONITOR_STACK, NULL,
                    tskIDLE_PRIORITY + TASK_MONITOR_PRIORITY, NULL) != pdPASS)
    {
        UART_SendString("[BMU] ERR: Task creation failed\r\n");
        for (;;) {}
    }

    UART_SendString("[BMU] Starting FreeRTOS scheduler\r\n");
    vTaskStartScheduler();

    /* Should never reach here */
    for (;;) {}
    return 0;
}

/*============================================================================
 *  FreeRTOS Task: CAN RX (highest priority)
 *  Polls both CAN MBs and enqueues received frames to rxQueue.
 *============================================================================*/
static void BMU_CanRxTask(void *pvParameters)
{
    (void)pvParameters;
    Flexcan_Ip_MsgBuffType rxMsg;
    CanRxItem_t item;

    UART_SendString("[Task] CanRx started\r\n");

    for (;;)
    {
        /* Poll MB for Key Exchange (ID 0x15) */
        FlexCAN_Ip_Receive(INST_FLEXCAN_0, CAN_RX_MB_DATA, &rxMsg, TRUE);
        {
            volatile uint32 timeout = TIMEOUT_CAN_RX_POLL;
            while ((FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_RX_MB_DATA)
                    == FLEXCAN_STATUS_BUSY) && (timeout > 0U))
            {
                FlexCAN_Ip_MainFunctionRead(INST_FLEXCAN_0, CAN_RX_MB_DATA);
                timeout--;
            }
        }
        if (FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_RX_MB_DATA)
            == FLEXCAN_STATUS_SUCCESS)
        {
            memset(&item, 0, sizeof(item));
            memcpy(item.data, rxMsg.data, sizeof(item.data));
            item.msgId   = rxMsg.msgId;
            item.dataLen = rxMsg.dataLen;
            item.fc      = 0U;
            if (xQueueSend(rxQueue, &item, 0U) != pdPASS)
            {
                g_rxQueueDropCount++;
            }
        }

        /* Poll MB for Battery Data (ID 0x14) */
        FlexCAN_Ip_Receive(INST_FLEXCAN_0, CAN_RX_MB_CTRL, &rxMsg, TRUE);
        {
            volatile uint32 timeout = TIMEOUT_CAN_RX_POLL;
            while ((FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_RX_MB_CTRL)
                    == FLEXCAN_STATUS_BUSY) && (timeout > 0U))
            {
                FlexCAN_Ip_MainFunctionRead(INST_FLEXCAN_0, CAN_RX_MB_CTRL);
                timeout--;
            }
        }
        if (FlexCAN_Ip_GetTransferStatus(INST_FLEXCAN_0, CAN_RX_MB_CTRL)
            == FLEXCAN_STATUS_SUCCESS)
        {
            memset(&item, 0, sizeof(item));
            memcpy(item.data, rxMsg.data, sizeof(item.data));
            item.msgId   = rxMsg.msgId;
            item.dataLen = rxMsg.dataLen;
            item.fc      = 0U;
            if (xQueueSend(rxQueue, &item, 0U) != pdPASS)
            {
                g_rxQueueDropCount++;
            }
        }

        vTaskDelay(pdMS_TO_TICKS(TASK_CANRX_DELAY_MS));
    }
}

/*============================================================================
 *  FreeRTOS Task: Protocol State Machine
 *  Reads from rxQueue, handles Key Exchange / CMAC verify / Resync.
 *  Verified data is forwarded to procQueue for EDDSA signing.
 *============================================================================*/
static void BMU_ProtocolTask(void *pvParameters)
{
    (void)pvParameters;
    CanRxItem_t item;

    UART_SendString("[Task] Protocol started\r\n");

    for (;;)
    {
        switch (g_proto_state)
        {
        /*--- INIT: Wait for key exchange from CMU ---*/
        case PROTO_STATE_INIT:
        {
            if (xQueueReceive(rxQueue, &item,
                              pdMS_TO_TICKS(TASK_PROTOCOL_DELAY_MS)) == pdPASS)
            {
                if (item.msgId == CAN_ID_KEY_EXCHANGE)
                {
                    g_rxCount++;
                    g_rxId  = item.msgId;
                    g_rxLen = item.dataLen;

                    if (BMU_HandleKeyExchange(item.data))
                    {
                        g_proto_state = PROTO_STATE_OPERATIONAL;
                        g_debugMarker = DBG_MARKER_CAN_OK;
                        UART_SendString("[Task] Key exchange OK -> OPERATIONAL\r\n");
                    }
                    else
                    {
                        g_debugMarker = DBG_MARKER_KEY_FAIL;
                        UART_SendString("[Task] Key exchange FAILED\r\n");
                    }
                }
                /* Ignore non-key-exchange frames in INIT state */
            }
            break;
        }

        /*--- OPERATIONAL: Verify secured battery data ---*/
        case PROTO_STATE_OPERATIONAL:
        {
            if (xQueueReceive(rxQueue, &item,
                              pdMS_TO_TICKS(TASK_PROTOCOL_DELAY_MS)) == pdPASS)
            {
                g_rxCount++;
                g_rxId  = item.msgId;
                g_rxLen = item.dataLen;

                if (item.msgId == CAN_ID_BATTERY_DATA)
                {
                    if (BMU_VerifySecuredData(item.data))
                    {
                        g_verifiedCount++;

                        const BatteryData_t *batt = (const BatteryData_t *)item.data;
                        g_batt_current = batt->current_A;
                        g_batt_voltage = batt->voltage_V;
                        g_batt_soc     = batt->soc_u16;
                        g_batt_temp    = batt->temperature_u16;
                        g_batt_cycles  = batt->discharge_cycles;
                        g_batt_cells   = batt->cell_count;
                        g_batt_flags   = batt->status_flags;
                        g_batt_cellV0  = batt->cell_voltage[0];
                        g_batt_cellV1  = batt->cell_voltage[1];

                        BMU_ProcessBatteryData(item.data);

                        /* Forward to DataProcessTask for EDDSA signing */
                        item.fc = g_expected_fc - 1U;
                        if (xQueueSend(procQueue, &item, 0U) != pdPASS)
                        {
                            g_procQueueDropCount++;
                        }
                    }
                    else
                    {
                        g_cmacFailTotal++;
                        UART_SendString("[Task] CMAC FAIL\r\n");
                        if (g_cmac_fail_count >= MAX_CMAC_FAIL_COUNT)
                        {
                            g_proto_state = PROTO_STATE_RESYNC;
                            g_debugMarker = DBG_MARKER_RESYNC;
                        }
                    }
                }
            }
            break;
        }

        /*--- RESYNC ---*/
        case PROTO_STATE_RESYNC:
            BMU_SendResyncRequest();
            xQueueReset(rxQueue);   /* Flush stale frames from previous session */
            g_cmac_fail_count = 0U;
            g_expected_fc = 0U;  /* Temporary reset; BMU_HandleKeyExchange() will set to 1 */
            if (BMU_ImportSymKey(HSE_PSK_KEY_HANDLE, PreSharedKey, AES_KEY_BITS)
                != HSE_SRV_RSP_OK)
            {
                UART_SendString("[BMU] ERR: PSK re-import failed\r\n");
                g_proto_state = PROTO_STATE_ERROR;
            }
            else
            {
                g_proto_state = PROTO_STATE_INIT;
            }
            break;

        /*--- ERROR ---*/
        case PROTO_STATE_ERROR:
            vTaskDelay(pdMS_TO_TICKS(TASK_ERROR_DELAY_MS));
            break;

        default:
            g_proto_state = PROTO_STATE_ERROR;
            break;
        }
    }
}

/*============================================================================
 *  FreeRTOS Task: Data Processing (EDDSA signing + UART output)
 *  Reads verified battery data from procQueue, signs with Ed25519,
 *  outputs signature + raw payload via UART for blockchain agent.
 *============================================================================*/
static void BMU_DataProcessTask(void *pvParameters)
{
    (void)pvParameters;
    CanRxItem_t item;

    UART_SendString("[Task] DataProcess started\r\n");

    for (;;)
    {
        if (xQueueReceive(procQueue, &item, portMAX_DELAY) == pdPASS)
        {
            #ifdef BMS_MODE_EDDSA
            if (g_eddsaReady)
            {
                hseSrvResponse_t sigResp = BMU_EddsaSign(item.data, BATTERY_DATA_SIZE);
                if (sigResp == HSE_SRV_RSP_OK)
                {
                    g_eddsaSignCount++;
                    UART_Lock();
                    UART_SendString("[SIGN] FC=");
                    UART_SendUint(item.fc);
                    UART_SendString(" R=");
                    UART_SendHex(g_eddsa_signR, EDDSA_SIGN_SIZE);
                    UART_SendString(" S=");
                    UART_SendHex(g_eddsa_signS, EDDSA_SIGN_SIZE);
                    UART_SendString(" DATA=");
                    UART_SendHex(item.data, BATTERY_DATA_SIZE);
                    UART_SendString("\r\n");
                    UART_Unlock();
                }
            }
            #endif
        }
    }
}

/*============================================================================
 *  FreeRTOS Task: System Monitor
 *  Periodically reports CAN bus status
 *============================================================================*/
static void BMU_MonitorTask(void *pvParameters)
{
    (void)pvParameters;

    UART_SendString("[Task] Monitor started\r\n");

    for (;;)
    {
        g_ESR1 = S32K344_FLEXCAN0_ESR1;
        g_ECR  = S32K344_FLEXCAN0_ECR;

        vTaskDelay(pdMS_TO_TICKS(TASK_MONITOR_DELAY_MS));
    }
}

/*============================================================================
 *  Stubs required by newlib (nano.specs + nosys.specs)
 *============================================================================*/
void _exit(int status)
{
    (void)status;
    while (1) {}  /* hang forever */
}

#ifdef __cplusplus
}
#endif
