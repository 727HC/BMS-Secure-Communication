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

/* Board-specific hardware configuration */
#include "bmu_board.h"

#ifdef BMS_MODE_EDDSA
/* Software Ed25519 via TweetNaCl (HSE ECC catalog unavailable on this board) */
#include "tweetnacl.h"

/* randombytes() implementation for TweetNaCl — fixed seed for deterministic keys */
/* Fixed seed matching blockchain DID registration */
static const uint8 g_bmu_ed25519_seed[32] = {
    'B','M','U','D','e','v','i','c','e','0','1','S','e','c','u','r',
    'e','C','o','m','m','0','0','0','0','0','0','0','0','0','0','1'
};
static boolean g_seed_used = FALSE;

void randombytes(unsigned char *x, unsigned long long xlen)
{
    if (!g_seed_used && xlen == 32U)
    {
        /* First call from crypto_sign_keypair — use fixed DID seed */
        memcpy(x, g_bmu_ed25519_seed, 32U);
        g_seed_used = TRUE;
    }
    else
    {
        /* Subsequent calls — simple PRNG */
        static uint32 rng = 0x12345678U;
        for (unsigned long long i = 0; i < xlen; i++)
        {
            rng ^= (rng << 13);
            rng ^= (rng >> 17);
            rng ^= (rng << 5);
            x[i] = (unsigned char)(rng & 0xFF);
        }
    }
}

/* Software EdDSA key pair */
static uint8 g_sw_ed25519_pk[32];  /* public key */
static uint8 g_sw_ed25519_sk[64];  /* secret key (seed + pk) */
#endif

/*============================================================================
 *  Configuration
 *============================================================================*/

/* Pre-Shared Key — separated into secrets.h (exclude from VCS) */
#include "common/secrets.h"
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
volatile boolean g_hseEddsaReady = FALSE;  /* TRUE = HSE HW signing available */
volatile uint32 g_eddsaSignCount = 0U;

/* HSE EdDSA key import buffers (must be in SRAM, not stack) */
static uint8 g_hse_ed_pubkey[EDDSA_KEY_SIZE];
static uint8 g_hse_ed_privkey[EDDSA_KEY_SIZE];

/* HSE DMA-safe input buffers (global BSS, not FreeRTOS task stack) */
static uint8 g_dec_input_uid[AES_KEY_SIZE];
static uint8 g_dec_input_seed[AES_KEY_SIZE];

/* Performance counters (visible in debugger + UART) */
volatile uint32 g_perf_cmac_us    = 0U;  /* Last CMAC verify time (µs) */
volatile uint32 g_perf_eddsa_ms   = 0U;  /* Last EdDSA sign time (ms)  */
volatile uint32 g_perf_keyex_ms   = 0U;  /* Key exchange duration (ms) */
volatile uint32 g_perf_e2e_us     = 0U;  /* CAN RX → verify done (µs) */

/* FreeRTOS task prototypes */
static void BMU_CanRxTask(void *pvParameters);
static void BMU_ProtocolTask(void *pvParameters);
static void BMU_DataProcessTask(void *pvParameters);
static void BMU_MonitorTask(void *pvParameters);

/* FreeRTOS queues and mutex */
static QueueHandle_t ctrlQueue;   /* Key Exchange/Resync control frames (FIFO) */
static QueueHandle_t dataQueue;   /* Battery Data latest frame (overwrite, depth=1) */
static QueueHandle_t procQueue;   /* Verified data → DataProcessTask */
static SemaphoreHandle_t uartMutex;

/* Queue drop counters */
volatile uint32 g_ctrlQueueDropCount = 0U;
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
 *  Board-specific registers defined in bmu_board.h
 *============================================================================*/
volatile uint32 g_lpuartStat = 0U;
volatile uint32 g_lpuartBaud = 0U;
volatile uint32 g_lpuartCtrl = 0U;

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

static void UART_SendUint(uint32 val);  /* forward declaration */

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

/** Format HSE key catalogs — uses generated config from Crypto_43_HSE_Cfg.c
 *  (includes AES + ECC_PAIR groups for EDDSA support) */
extern hseKeyGroupCfgEntry_t aHseNvmKeyCatalog[];
extern hseKeyGroupCfgEntry_t aHseRamKeyCatalog[];

static hseSrvResponse_t BMU_FormatKeyCatalogs(void)
{
    uint8 ch = Hse_Ip_GetFreeChannel(HSE_MU_INSTANCE);
    hseSrvDescriptor_t *pDesc = &g_hse_srv_desc[ch];

    memset(pDesc, 0, sizeof(hseSrvDescriptor_t));
    pDesc->srvId = HSE_SRV_ID_FORMAT_KEY_CATALOGS;

    hseFormatKeyCatalogsSrv_t *pFmt = &pDesc->hseSrv.formatKeyCatalogsReq;
    pFmt->pNvmKeyCatalogCfg = (HOST_ADDR)aHseNvmKeyCatalog;
    pFmt->pRamKeyCatalogCfg = (HOST_ADDR)aHseRamKeyCatalog;

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
                                            uint8 *plain)
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
    pCipher->inputLength    = AES_KEY_SIZE;
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
    /* Copy to global buffers for HSE DMA access (not FreeRTOS task stack) */
    memcpy(g_dec_input_uid,  &rx_data[0],        AES_KEY_SIZE);
    memcpy(g_dec_input_seed, &rx_data[UID_SIZE],  AES_KEY_SIZE);
    const uint8 *enc_uid  = g_dec_input_uid;
    const uint8 *enc_seed = g_dec_input_seed;

    /* 2. Decrypt UID using PSK */
    hse_resp = BMU_AesEcbDecrypt(HSE_PSK_KEY_HANDLE, enc_uid, g_decrypted_uid);
    if (hse_resp != HSE_SRV_RSP_OK)
    {
        UART_SendString("[BMU] ERR: Decrypt UID failed\r\n");
        return FALSE;
    }

    /* 3. Decrypt Seed using PSK */
    hse_resp = BMU_AesEcbDecrypt(HSE_PSK_KEY_HANDLE, enc_seed, g_decrypted_seed);
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

    /* Sync FC on first frame after key exchange (queue may introduce delay) */
    if (g_expected_fc <= 1U && rx_fc > 0U)
    {
        g_expected_fc = rx_fc;
    }

    /* Check FC is within acceptable window (subtraction avoids overflow) */
    if (rx_fc < g_expected_fc || (rx_fc - g_expected_fc) >= FC_WINDOW_SIZE)
    {
        g_cmac_fail_count++;
        UART_SendString("[BMU] WARN: FC out of window\r\n");
        return FALSE;
    }

    /* Build CMAC input: FC(4B) || Data(48B) */
    BMS_BuildCmacInput(g_cmac_input, rx_fc, battery_data);

    /* Verify CMAC using session key — measure time */
    uint32 cyc_start = DWT_CYCCNT;
    hse_resp = BMU_CmacVerify(HSE_SESSION_KEY_HANDLE,
                               g_cmac_input, CMAC_INPUT_SIZE,
                               received_cmac, CMAC_TAG_SIZE);
    uint32 cyc_end = DWT_CYCCNT;
    g_perf_cmac_us = (cyc_end - cyc_start) / (configCPU_CLOCK_HZ / 1000000U);

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

static void BMU_ProcessBatteryData(const uint8 *raw_data, uint32 fc)
{
    const BatteryData_t *batt = (const BatteryData_t *)raw_data;

    /* Only print every 10th frame to reduce UART blocking */
    static uint32 printCount = 0U;
    printCount++;
    if ((printCount % UART_PRINT_INTERVAL) == 1U)
    {
        UART_Lock();
        UART_SendString("[BMU] OK FC=");
        UART_SendUint(fc);
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
 *  EDDSA (Ed25519) — Byte swap + Key Import + Signing
 *============================================================================*/
static void SwapArrayBytes(uint8 *buf, uint32 len)
{
    uint32 start = 0U;
    uint32 end   = len - 1U;
    uint8  tmp;
    while (start < end)
    {
        tmp        = buf[start];
        buf[start] = buf[end];
        buf[end]   = tmp;
        start++;
        end--;
    }
}

static hseSrvResponse_t BMU_ImportEddsaKey(const uint8 *pubKey, const uint8 *privKey)
{
    uint8 ch = Hse_Ip_GetFreeChannel(HSE_MU_INSTANCE);
    hseSrvDescriptor_t *pDesc = &g_hse_srv_desc[ch];

    /* Copy to DMA-safe SRAM buffers and swap to big-endian for HSE */
    memcpy(g_hse_ed_pubkey,  pubKey,  EDDSA_KEY_SIZE);
    memcpy(g_hse_ed_privkey, privKey, EDDSA_KEY_SIZE);
    SwapArrayBytes(g_hse_ed_pubkey,  EDDSA_KEY_SIZE);
    SwapArrayBytes(g_hse_ed_privkey, EDDSA_KEY_SIZE);

    memset(pDesc, 0, sizeof(hseSrvDescriptor_t));
    pDesc->srvId = HSE_SRV_ID_IMPORT_KEY;

    hseImportKeySrv_t *pImp = &pDesc->hseSrv.importKeyReq;

    /* Key info */
    static hseKeyInfo_t edKeyInfo;
    memset(&edKeyInfo, 0, sizeof(edKeyInfo));
    edKeyInfo.keyType                = HSE_KEY_TYPE_ECC_PAIR;
    edKeyInfo.keyFlags               = HSE_KF_USAGE_SIGN | HSE_KF_USAGE_VERIFY;
    edKeyInfo.keyBitLen              = HSE_KEY256_BITS;
    edKeyInfo.specific.eccCurveId    = HSE_EC_25519_ED25519;

    pImp->pKeyInfo                   = (HOST_ADDR)&edKeyInfo;
    pImp->targetKeyHandle            = HSE_ECC_KEY_HANDLE;
    pImp->pKey[0]                    = (HOST_ADDR)g_hse_ed_pubkey;
    pImp->keyLen[0]                  = EDDSA_KEY_SIZE;
    pImp->pKey[2]                    = (HOST_ADDR)g_hse_ed_privkey;
    pImp->keyLen[2]                  = EDDSA_KEY_SIZE;
    pImp->cipher.cipherKeyHandle     = HSE_INVALID_KEY_HANDLE;
    pImp->keyContainer.authKeyHandle = HSE_INVALID_KEY_HANDLE;
    pImp->keyFormat.eccKeyFormat     = HSE_KEY_FORMAT_ECC_PUB_RAW;

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

    /*--- 0. DWT Cycle Counter for performance measurement ---*/
    DWT_Init();

    /*--- 1. Clock Init ---*/
    /* After .mex fix: FIRC-only mode (no PLL), so this should succeed */
    g_clkStatus = Clock_Ip_Init(&Clock_Ip_aClockConfig[0]);
    g_debugAfterClk = DBG_MARKER_CLK_OK;

    /*--- 2. Port Init ---*/
    Siul2_Port_Ip_Init(NUM_OF_CONFIGURED_PINS_PortContainer_0_BOARD_InitPeripherals,
                       g_pin_mux_InitConfigArr_PortContainer_0_BOARD_InitPeripherals);

    OsIf_Init(NULL_PTR);

    /*--- 2b. LPUART6 Debug Init (OpenSDA UART on Q172 EVB) ---*/
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

    /* Read HSE lifecycle */
    if (g_hseReady)
    {
        static volatile uint8 g_currentLC = 0U;
        uint8 ch = Hse_Ip_GetFreeChannel(HSE_MU_INSTANCE);
        hseSrvDescriptor_t *pDesc = &g_hse_srv_desc[ch];
        memset(pDesc, 0, sizeof(*pDesc));
        pDesc->srvId = HSE_SRV_ID_GET_ATTR;
        pDesc->hseSrv.getAttrReq.attrId  = HSE_SECURE_LIFECYCLE_ATTR_ID;
        pDesc->hseSrv.getAttrReq.attrLen = sizeof(uint8);
        pDesc->hseSrv.getAttrReq.pAttr   = (HOST_ADDR)&g_currentLC;
        Hse_Ip_ServiceRequest(HSE_MU_INSTANCE, ch,
            &(Hse_Ip_ReqType){ .eReqType = HSE_IP_REQTYPE_SYNC,
                               .u32Timeout = HSE_TIMEOUT_TICKS }, pDesc);

        UART_SendString("[HSE] LC=0x");
        {
            static const char hx[] = "0123456789ABCDEF";
            UART_SendChar(hx[(g_currentLC >> 4) & 0xF]);
            UART_SendChar(hx[g_currentLC & 0xF]);
        }
        switch (g_currentLC) {
            case 0x04: UART_SendString(" (CUST_DEL)\r\n"); break;
            case 0x08: UART_SendString(" (OEM_PROD)\r\n"); break;
            case 0x10: UART_SendString(" (IN_FIELD)\r\n"); break;
            default:   UART_SendString(" (UNKNOWN)\r\n");  break;
        }
    }

    if (g_hseReady)
    {
        /* Diagnose HSE state before Format */
        {
            hseStatus_t st = Hse_Ip_GetHseStatus(HSE_MU_INSTANCE);
            UART_SendString("[HSE] INSTALL_OK=");
            UART_SendChar((st & HSE_STATUS_INSTALL_OK) ? '1' : '0');
            UART_SendString(" CUST_SU=");
            UART_SendChar((st & HSE_STATUS_CUST_SUPER_USER) ? '1' : '0');
            UART_SendString("\r\n");
        }

        /* Format key catalogs (SRAM-resident for HSE DMA access) */
        g_hseFormatStatus = (uint32)BMU_FormatKeyCatalogs();
        UART_SendString("[HSE] Fmt=0x");
        { static const char hx[]="0123456789ABCDEF"; uint32 v=g_hseFormatStatus;
          int i; for(i=28;i>=0;i-=4) UART_SendChar(hx[(v>>i)&0xF]); }
        UART_SendString("\r\n");

        /* Import PSK into HSE RAM key slot (try regardless of format result) */
        g_hseImportStatus = (uint32)BMU_ImportSymKey(HSE_PSK_KEY_HANDLE, PreSharedKey, AES_KEY_BITS);
        UART_SendString("[HSE] Imp=0x");
        { static const char hx[]="0123456789ABCDEF"; uint32 v=g_hseImportStatus;
          int i; for(i=28;i>=0;i-=4) UART_SendChar(hx[(v>>i)&0xF]); }
        UART_SendString("\r\n");

        #ifdef BMS_MODE_EDDSA
        /* Ed25519: generate key pair with TweetNaCl, then try HSE HW import */
        {
            crypto_sign_keypair(g_sw_ed25519_pk, g_sw_ed25519_sk);
            g_eddsaReady = TRUE;

            /* Try importing into HSE for hardware-accelerated signing */
            /* TweetNaCl sk[0..31] = seed (private key for HSE) */
            hseSrvResponse_t edResp = BMU_ImportEddsaKey(g_sw_ed25519_pk, g_sw_ed25519_sk);

            UART_Lock();
            if (edResp == HSE_SRV_RSP_OK)
            {
                g_hseEddsaReady = TRUE;
                UART_SendString("[HSE-EdDSA] Import OK, PK=");
            }
            else
            {
                UART_SendString("[SW-EdDSA] HSE import failed 0x");
                { static const char hx[]="0123456789ABCDEF"; uint32 v=(uint32)edResp;
                  int i; for(i=28;i>=0;i-=4) UART_SendChar(hx[(v>>i)&0xF]); }
                UART_SendString(", fallback SW. PK=");
            }
            UART_SendHex(g_sw_ed25519_pk, 32);
            UART_SendString("\r\n");
            UART_Unlock();
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

    /* MB1: Key Exchange from CMU (ID 0x15) */
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
    ctrlQueue = xQueueCreate(RX_QUEUE_LENGTH,   sizeof(CanRxItem_t));
    dataQueue = xQueueCreate(1U,               sizeof(CanRxItem_t));  /* overwrite */
    procQueue = xQueueCreate(PROC_QUEUE_LENGTH,  sizeof(CanRxItem_t));
    uartMutex = xSemaphoreCreateMutex();

    if ((ctrlQueue == NULL) || (dataQueue == NULL) || (procQueue == NULL) || (uartMutex == NULL))
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
        /* Poll Key Exchange MB only when not in OPERATIONAL */
        if (g_proto_state != PROTO_STATE_OPERATIONAL)
        {
            FlexCAN_Ip_Receive(INST_FLEXCAN_0, CAN_RX_MB_DATA, &rxMsg, TRUE);
            {
                volatile uint32 timeout = TIMEOUT_CAN_RX_SHORT;
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
                if (xQueueSend(ctrlQueue, &item, 0U) != pdPASS) { g_ctrlQueueDropCount++; }
            }
        }

        /* Poll Battery Data MB — overwrite with latest frame */
        if (g_proto_state == PROTO_STATE_OPERATIONAL)
        {
            FlexCAN_Ip_Receive(INST_FLEXCAN_0, CAN_RX_MB_CTRL, &rxMsg, TRUE);
            {
                volatile uint32 timeout = TIMEOUT_CAN_RX_SHORT;
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
                xQueueOverwrite(dataQueue, &item);  /* Always latest */
            }
        }

        vTaskDelay(pdMS_TO_TICKS(TASK_CANRX_DELAY_MS));
    }
}

/*============================================================================
 *  FreeRTOS Task: Protocol State Machine
 *  Reads from rxQueue, handles Key Exchange / CMAC verify / Resync.
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
        case PROTO_STATE_INIT:
        {
            if (xQueueReceive(ctrlQueue, &item,
                              pdMS_TO_TICKS(TASK_PROTOCOL_DELAY_MS)) == pdPASS)
            {
                if (item.msgId == CAN_ID_KEY_EXCHANGE)
                {
                    g_rxCount++;
                    if (BMU_HandleKeyExchange(item.data))
                    {
                        xQueueReset(ctrlQueue);
                        xQueueReset(dataQueue);
                        xQueueReset(procQueue);
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
            }
            break;
        }

        case PROTO_STATE_OPERATIONAL:
        {
            if (xQueueReceive(dataQueue, &item,
                              pdMS_TO_TICKS(TASK_PROTOCOL_DELAY_MS)) == pdPASS)
            {
                g_rxCount++;
                uint32 e2e_start = DWT_CYCCNT;
                if (BMU_VerifySecuredData(item.data))
                {
                    uint32 e2e_end = DWT_CYCCNT;
                    g_perf_e2e_us = (e2e_end - e2e_start) / (configCPU_CLOCK_HZ / 1000000U);
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

                    /* Forward to DataProcessTask for UART output + EDDSA */
                    item.fc = g_expected_fc - 1U;
                    if (xQueueSend(procQueue, &item, 0U) != pdPASS)
                    {
                        g_procQueueDropCount++;
                    }
                }
                else
                {
                    g_cmacFailTotal++;
                    if (g_cmac_fail_count >= MAX_CMAC_FAIL_COUNT)
                    {
                        g_proto_state = PROTO_STATE_RESYNC;
                        g_debugMarker = DBG_MARKER_RESYNC;
                    }
                }
            }
            break;
        }

        case PROTO_STATE_RESYNC:
            BMU_SendResyncRequest();
            xQueueReset(ctrlQueue);
            xQueueReset(dataQueue);
            xQueueReset(procQueue);
            g_cmac_fail_count = 0U;
            g_expected_fc = 0U;
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
            /* UART output for verified battery data */
            BMU_ProcessBatteryData(item.data, item.fc);

            #ifdef BMS_MODE_EDDSA
            if (g_eddsaReady)
            {
                TickType_t sign_start = xTaskGetTickCount();
                boolean signOk = FALSE;

                if (g_hseEddsaReady)
                {
                    /* HSE hardware Ed25519 signing */
                    hseSrvResponse_t sr = BMU_EddsaSign(item.data, BATTERY_DATA_SIZE);
                    if (sr == HSE_SRV_RSP_OK)
                    {
                        /* HSE returns R,S in big-endian — swap back to little-endian */
                        SwapArrayBytes(g_eddsa_signR, EDDSA_SIGN_SIZE);
                        SwapArrayBytes(g_eddsa_signS, EDDSA_SIGN_SIZE);
                        signOk = TRUE;
                    }
                }

                if (!signOk)
                {
                    /* Software Ed25519 fallback via TweetNaCl */
                    uint8 sm[BATTERY_DATA_SIZE + 64];
                    unsigned long long smlen;
                    crypto_sign(sm, &smlen, item.data, BATTERY_DATA_SIZE, g_sw_ed25519_sk);
                    memcpy(g_eddsa_signR, &sm[0],  EDDSA_SIGN_SIZE);
                    memcpy(g_eddsa_signS, &sm[32], EDDSA_SIGN_SIZE);
                    signOk = TRUE;
                }

                g_perf_eddsa_ms = (uint32)(xTaskGetTickCount() - sign_start);
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

    static uint32 monitorCount = 0U;
    for (;;)
    {
        g_ESR1 = S32K344_FLEXCAN0_ESR1;
        g_ECR  = S32K344_FLEXCAN0_ECR;

        monitorCount++;
        /* Print performance stats every 10th monitor cycle (5 seconds) */
        if ((monitorCount % 10U) == 0U)
        {
            UART_Lock();
            UART_SendString("[PERF] CMAC=");
            UART_SendUint(g_perf_cmac_us);
            UART_SendString("us E2E=");
            UART_SendUint(g_perf_e2e_us);
            UART_SendString("us EdDSA=");
            UART_SendUint(g_perf_eddsa_ms);
            UART_SendString("ms RX=");
            UART_SendUint(g_rxCount);
            UART_SendString(" OK=");
            UART_SendUint(g_verifiedCount);
            UART_SendString("\r\n");
            UART_Unlock();
        }

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
