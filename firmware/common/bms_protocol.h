/**
 * @file    bms_protocol.h
 * @brief   BMS Secure Communication Protocol - Shared Definitions
 * @details Shared between CMU (S32K144) and BMU (S32K344)
 *          Based on: AES-128 CMAC + CAN-FD + Session Key (KDF)
 */

#ifndef BMS_PROTOCOL_H
#define BMS_PROTOCOL_H

#ifdef __cplusplus
extern "C" {
#endif

/*============================================================================
 *  Includes
 *============================================================================*/
#include <stdint.h>
#include <string.h>

/*============================================================================
 *  Build Mode Flags (define ONE in compiler args or here)
 *  BMS_MODE_PLAIN_CAN   — CAN-FD only, no crypto
 *  BMS_MODE_CMAC        — AES-128 CMAC authentication
 *  BMS_MODE_EDDSA       — CMAC + Ed25519 signing
 *  Default: BMS_MODE_EDDSA (full security)
 *============================================================================*/
#if !defined(BMS_MODE_PLAIN_CAN) && !defined(BMS_MODE_CMAC) && !defined(BMS_MODE_EDDSA)
    #define BMS_MODE_EDDSA
#endif

/*============================================================================
 *  CAN-FD Message IDs
 *============================================================================*/
#define CAN_ID_KEY_EXCHANGE         0x15U   /* 21: CMU -> BMU  key exchange      */
#define CAN_ID_KEY_ACK              0x16U   /* 22: BMU -> CMU  key ack           */
#define CAN_ID_BATTERY_DATA         0x14U   /* 20: CMU -> BMU  secured data      */
#define CAN_ID_RESYNC_REQ           0x17U   /* 23: BMU -> CMU  resync request    */

/*============================================================================
 *  CAN Mailbox Indices
 *============================================================================*/
#define CAN_TX_MB_IDX               0U
#define CAN_RX_MB_DATA              1U
#define CAN_RX_MB_CTRL              2U

/*============================================================================
 *  Frame & Crypto Sizes (bytes)
 *============================================================================*/
#define BATTERY_DATA_SIZE           48U
#define CMAC_TAG_SIZE               16U
#define CANFD_PAYLOAD_SIZE          64U
#define AES_KEY_SIZE                16U
#define AES_KEY_BITS                (AES_KEY_SIZE * 8U)  /* 128 bits */

/* EDDSA (Ed25519) sizes */
#define EDDSA_SIGN_SIZE             32U     /* Ed25519 signature R or S size */
#define EDDSA_PUBKEY_SIZE           64U     /* Ed25519 public key size       */
#define FC_SIZE                     4U
#define UID_SIZE                    16U
#define SEED_SIZE                   16U

/*============================================================================
 *  Derived Sizes
 *============================================================================*/
#define CMAC_INPUT_SIZE             (FC_SIZE + BATTERY_DATA_SIZE)    /* 52 bytes  */
#define CMAC_INPUT_BITS             (CMAC_INPUT_SIZE * 8U)          /* 416 bits  */
#define KEY_EXCHANGE_FRAME_SIZE     (UID_SIZE + SEED_SIZE)          /* 32 bytes  */
#define BATTERY_DATA_BITS           (BATTERY_DATA_SIZE * 8U)        /* 384 bits  */

/*============================================================================
 *  KDF Parameters (NIST SP 800-108 Counter Mode)
 *  SessionKey = CMAC(PSK, Label || UID || Seed || Counter)
 *============================================================================*/
#define KDF_LABEL                   "SessionKey"
#define KDF_LABEL_LEN               10U
#define KDF_COUNTER_VALUE           0x01U
#define KDF_INPUT_SIZE              (KDF_LABEL_LEN + UID_SIZE + SEED_SIZE + 1U) /* 43 bytes */
#define KDF_INPUT_BITS              (KDF_INPUT_SIZE * 8U)                       /* 344 bits */

/*============================================================================
 *  Timing
 *============================================================================*/
#define CMU_TX_PERIOD_MS            50U     /* CMU data transmission period      */
#define KEY_EXCHANGE_TIMEOUT_MS     3000U   /* Key exchange timeout              */
#define RESYNC_TIMEOUT_MS           1000U   /* Resync timeout                    */

/*============================================================================
 *  Protocol Limits
 *============================================================================*/
#define MAX_CMAC_FAIL_COUNT         3U      /* Consecutive CMAC failures -> resync */
#define MAX_KEY_RETRY_COUNT         3U      /* Key exchange max retries            */
#define FC_WINDOW_SIZE              5U      /* Freshness counter acceptance window */

/*============================================================================
 *  CAN-FD Hardware
 *============================================================================*/
#define CANFD_TDC_OFFSET            6U      /* Transceiver Delay Compensation  */
#define CANFD_RX_DATA_LENGTH        64U     /* RX mailbox data length          */

/*============================================================================
 *  Timeout Loop Counts (approximate, CPU-dependent)
 *============================================================================*/
#define TIMEOUT_CRYPTO_INIT         ((uint32)1000000U)  /* CSEc/HSE init wait  */
#define TIMEOUT_CAN_TX              ((uint32)500000U)   /* CAN TX polling wait */
#define TIMEOUT_CAN_RX_POLL         ((uint32)500000U)   /* CAN RX polling wait */
#define TIMEOUT_ACK_WAIT            ((uint32)2000000U)  /* ACK response wait   */
#define TIMEOUT_RESYNC_CHECK        ((uint32)10000U)    /* Resync poll check   */
#define DELAY_OPERATIONAL_LOOP      ((uint32)2000000U)  /* ~500ms TX interval  */
#define DELAY_ERROR_BLINK           ((uint32)500000U)   /* Error LED blink     */

/*============================================================================
 *  FreeRTOS Task Configuration
 *============================================================================*/
#define TASK_PROTOCOL_STACK         512U    /* Protocol task extra stack      */
#define TASK_MONITOR_STACK          128U    /* Monitor task extra stack       */
#define TASK_PROTOCOL_PRIORITY      2U      /* Protocol task priority         */
#define TASK_MONITOR_PRIORITY       1U      /* Monitor task priority          */
#define TASK_PROTOCOL_DELAY_MS      10U     /* Protocol polling interval     */
#define TASK_MONITOR_DELAY_MS       500U    /* Monitor reporting interval    */
#define TASK_ERROR_DELAY_MS         1000U   /* Error state delay             */
#define DELAY_KEY_RETRY             ((uint32)2000000U)  /* Key exchange retry  */

/*============================================================================
 *  Protocol Frame Markers
 *============================================================================*/
#define ACK_MARKER                  0x01U   /* Key ACK success byte            */
#define RESYNC_MARKER               0xFFU   /* Resync request byte             */
#define CTRL_DATA_SIZE              8U      /* Control frame data portion      */
#define CTRL_FRAME_SIZE             (CTRL_DATA_SIZE + CMAC_TAG_SIZE) /* 24B   */

/*============================================================================
 *  Debug Markers (visible in debugger watch window)
 *============================================================================*/
#define DBG_MARKER_BOOT             0xAA55U /* Binary started                  */
#define DBG_MARKER_CLK_OK           0xBB66U /* Clock init returned             */
#define DBG_MARKER_CAN_OK           0xCC77U /* CAN init / key exchange OK      */
#define DBG_MARKER_CRYPTO_OK        0xDD88U /* Crypto engine ready + PSK loaded */
#define DBG_MARKER_CRYPTO_FAIL      0xEE99U /* Crypto engine not available     */
#define DBG_MARKER_KEY_FAIL         0xFF00U /* Key exchange failed             */
#define DBG_MARKER_RESYNC           0xBBAAU /* CMAC fail → resync triggered    */

/*============================================================================
 *  UART Framing
 *  Frame: [0xAA][0x55][LEN][DATA...][XOR_CHECKSUM]
 *============================================================================*/
#define UART_SYNC_0                 0xAAU
#define UART_SYNC_1                 0x55U
#define UART_FRAME_OVERHEAD         4U      /* 2 sync + 1 len + 1 checksum       */
#define UART_FRAME_TOTAL            (UART_FRAME_OVERHEAD + BATTERY_DATA_SIZE) /* 52 bytes */
#define UART_BAUD_RATE              115200U

/*============================================================================
 *  Parallel Assembly Configuration
 *============================================================================*/
#define NUM_CELLS_PARALLEL          11U     /* Number of parallel cell assemblies */

/*============================================================================
 *  Data Structures
 *============================================================================*/

/**
 * @brief Battery data payload (48 bytes, packed)
 */
typedef struct __attribute__((packed)) {
    float    current_A;                         /*  4B : cell current (A)               */
    float    voltage_V;                         /*  4B : cell voltage (V)               */
    uint16_t soc_u16;                           /*  2B : avg SOC  (0~65535 -> 0.0~1.0)  */
    uint16_t discharge_cycles;                  /*  2B : discharge cycle count           */
    uint16_t temperature_u16;                   /*  2B : temp encoded (K, scaled)        */
    uint8_t  cell_voltage[NUM_CELLS_PARALLEL];  /* 11B : per-cell voltage (2.5~4.2V)    */
    uint8_t  cell_soc[NUM_CELLS_PARALLEL];      /* 11B : per-cell SOC    (0.0~1.0)      */
    uint16_t timestamp_ms;                      /*  2B : timestamp (ms, wraps 65535)     */
    uint8_t  status_flags;                      /*  1B : b0=charging b1=bal b2=fault     */
    uint8_t  cell_count;                        /*  1B : number of active cells          */
    uint32_t freshness_counter;                  /*  4B : FC (big-endian in CMAC input)   */
    uint8_t  reserved[4];                       /*  4B : reserved / future use           */
} BatteryData_t;
/* static_assert: 4+4+2+2+2+11+11+2+1+1+4+4 = 48 */

/**
 * @brief Secured CAN-FD frame (64 bytes)
 */
typedef struct __attribute__((packed)) {
    uint8_t data[BATTERY_DATA_SIZE];    /* 48B : battery data payload     */
    uint8_t cmac[CMAC_TAG_SIZE];        /* 16B : AES-128 CMAC tag         */
} SecuredFrame_t;

/**
 * @brief Key exchange frame (32 bytes via CAN-FD)
 */
typedef struct __attribute__((packed)) {
    uint8_t encrypted_uid[UID_SIZE];    /* 16B : AES-ECB(PSK, UID)        */
    uint8_t encrypted_seed[SEED_SIZE];  /* 16B : AES-ECB(PSK, Seed)       */
} KeyExchangeFrame_t;

/**
 * @brief Protocol state machine
 */
typedef enum {
    PROTO_STATE_INIT = 0,
    PROTO_STATE_KEY_EXCHANGE,
    PROTO_STATE_WAIT_ACK,
    PROTO_STATE_OPERATIONAL,
    PROTO_STATE_RESYNC,
    PROTO_STATE_ERROR
} ProtocolState_t;

/*============================================================================
 *  Utility: Build KDF input buffer
 *  Output: Label(10B) || UID(16B) || Seed(16B) || Counter(1B) = 43 bytes
 *============================================================================*/
static inline void BMS_BuildKdfInput(uint8_t *output,
                                     const uint8_t *uid,
                                     const uint8_t *seed)
{
    const char label[] = KDF_LABEL;
    uint32_t offset = 0U;

    memcpy(&output[offset], label, KDF_LABEL_LEN);
    offset += KDF_LABEL_LEN;

    memcpy(&output[offset], uid, UID_SIZE);
    offset += UID_SIZE;

    memcpy(&output[offset], seed, SEED_SIZE);
    offset += SEED_SIZE;

    output[offset] = KDF_COUNTER_VALUE;
}

/*============================================================================
 *  Utility: Build CMAC input buffer
 *  Output: FC(4B, big-endian) || Data(48B) = 52 bytes
 *============================================================================*/
static inline void BMS_BuildCmacInput(uint8_t *output,
                                      uint32_t freshness_counter,
                                      const uint8_t *data)
{
    /* Freshness counter in big-endian */
    output[0] = (uint8_t)((freshness_counter >> 24U) & 0xFFU);
    output[1] = (uint8_t)((freshness_counter >> 16U) & 0xFFU);
    output[2] = (uint8_t)((freshness_counter >>  8U) & 0xFFU);
    output[3] = (uint8_t)((freshness_counter >>  0U) & 0xFFU);

    memcpy(&output[FC_SIZE], data, BATTERY_DATA_SIZE);
}

/*============================================================================
 *  Utility: UART frame checksum (XOR of all data bytes)
 *============================================================================*/
static inline uint8_t BMS_CalcChecksum(const uint8_t *data, uint32_t len)
{
    /* CRC-8/MAXIM (polynomial 0x31, init 0x00) */
    uint8_t crc = 0x00U;
    for (uint32_t i = 0U; i < len; i++)
    {
        crc ^= data[i];
        for (uint8_t bit = 0U; bit < 8U; bit++)
        {
            if (crc & 0x80U)
                crc = (uint8_t)((crc << 1U) ^ 0x31U);
            else
                crc = (uint8_t)(crc << 1U);
        }
    }
    return crc;
}

#ifdef __cplusplus
}
#endif

#endif /* BMS_PROTOCOL_H */
