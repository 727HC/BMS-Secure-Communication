/*==================================================================================================
*   Project              : RTD AUTOSAR 4.7
*   Platform             : CORTEXM
*   Peripheral           : HSE
*   Dependencies         : none
*
*   Autosar Version      : 4.7.0
*   Autosar Revision     : ASR_REL_4_7_REV_0000
*   Autosar Conf.Variant :
*   SW Version           : 5.0.0
*   Build Version        : S32K3_RTD_5_0_0_D2410_ASR_REL_4_7_REV_0000_20250404
*
*   Copyright 2020 - 2025 NXP
*
*   NXP Confidential and Proprietary. This software is owned or controlled by NXP and may only be
*   used strictly in accordance with the applicable license terms. By expressly
*   accepting such terms or by downloading, installing, activating and/or otherwise
*   using the software, you are agreeing that you have read, and that you agree to
*   comply with and are bound by, such license terms. If you do not agree to be
*   bound by the applicable license terms, then you may not retain, install,
*   activate or otherwise use the software.
==================================================================================================*/

#ifndef CRYPTO_43_HSE_CFG_H
#define CRYPTO_43_HSE_CFG_H

/**
*   @file
*
*   @addtogroup CRYPTO_43_HSE
*   @{
*/

#ifdef __cplusplus
extern "C"{
#endif

/*==================================================================================================
*                                          INCLUDE FILES
* 1) system and project includes
* 2) needed interfaces from external units
* 3) internal and external interfaces from this unit
==================================================================================================*/
#include "Crypto_43_HSE_Types.h"
#include "SchM_Crypto_43_HSE.h"
#include "hse_interface.h"

/*==================================================================================================
*                                 SOURCE FILE VERSION INFORMATION
==================================================================================================*/
#define CRYPTO_43_HSE_VENDOR_ID_CFG                       43
#define CRYPTO_43_HSE_MODULE_ID_CFG                       114
#define CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_CFG        4
#define CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_CFG        7
#define CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_CFG     0
#define CRYPTO_43_HSE_SW_MAJOR_VERSION_CFG                5
#define CRYPTO_43_HSE_SW_MINOR_VERSION_CFG                0
#define CRYPTO_43_HSE_SW_PATCH_VERSION_CFG                0

/*==================================================================================================
*                                       FILE VERSION CHECKS
==================================================================================================*/
/* Check if Crypto Cfg header file and Crypto Types header file are of the same vendor */
#if (CRYPTO_43_HSE_VENDOR_ID_CFG != CRYPTO_43_HSE_VENDOR_ID_TYPES)
    #error "Crypto_43_HSE_Cfg.h and Crypto_43_HSE_Types.h have different vendor ids"
#endif

/* Check if Crypto Cfg header file and Crypto Types header file are of the same Autosar version */
#if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_CFG    != CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_TYPES) || \
     (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_CFG    != CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_TYPES) || \
     (CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_CFG != CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_TYPES) \
    )
    #error "AutoSar Version Numbers of Crypto_43_HSE_Cfg.h and Crypto_43_HSE_Types.h are different"
#endif

/* Check if Crypto Cfg header file and Crypto Types header file are of the same Software version */
#if ((CRYPTO_43_HSE_SW_MAJOR_VERSION_CFG != CRYPTO_43_HSE_SW_MAJOR_VERSION_TYPES) || \
     (CRYPTO_43_HSE_SW_MINOR_VERSION_CFG != CRYPTO_43_HSE_SW_MINOR_VERSION_TYPES) || \
     (CRYPTO_43_HSE_SW_PATCH_VERSION_CFG != CRYPTO_43_HSE_SW_PATCH_VERSION_TYPES)    \
    )
    #error "Software Version Numbers of Crypto_43_HSE_Cfg.h and Crypto_43_HSE_Types.h are different"
#endif

#ifndef DISABLE_MCAL_INTERMODULE_ASR_CHECK
    /* Check if Crypto Cfg header file and SchM_Crypto header file are of the same Autosar version */
    #if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_CFG != SCHM_CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION) || \
         (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_CFG != SCHM_CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION)    \
        )
        #error "AutoSar Version Numbers of Crypto_43_HSE_Cfg.h and SchM_Crypto_43_HSE.h are different"
    #endif
#endif

/*==================================================================================================
*                                            CONSTANTS
==================================================================================================*/

/*==================================================================================================
*                                       DEFINES AND MACROS
==================================================================================================*/
/* Pre-processor switch to enable/disable development error detection for Crypto API */
#define CRYPTO_43_HSE_DEV_ERROR_DETECT                         (STD_OFF)

/* Pre-processor switch to enable/disable the API to read out the modules version information */
#define CRYPTO_43_HSE_VERSION_INFO_API                         (STD_OFF)

/* Pre-processor switch to enable/disable the streaming restrications removal related with CMAC generation and HASH */
#define CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL           (STD_OFF)
    
/* Crypto instance ID value */
#define CRYPTO_43_HSE_INSTANCE_ID                              ((uint8)0)

/* Set asynchronous job process method */
#define CRYPTO_43_HSE_USE_INTERRUPTS_FOR_ASYNC_JOBS            (STD_OFF)

/* Crypto Timeout value */
#define CRYPTO_43_HSE_TIMEOUT_DURATION_U32                     ((uint32)1000000U)

/* Pre-processor switch to disable multipartition support in Crypto driver */
#define CRYPTO_43_HSE_ENABLE_MULTIPARTITION_SUPPORT            (STD_OFF)

/* Max number of partitions configured from the application */
#define CRYPTO_43_HSE_MAX_NUMBER_PARTITIONS_U8                 ((uint8)1U)

/* Number of configured partitions the driver can run in */
#define CRYPTO_43_HSE_NUMBER_PARTITIONS_ALLOWED_TO_RUN_IN_U8   ((uint8)1U)

/* Number of configured Crypto driver objects */
#define CRYPTO_43_HSE_NUMBER_OF_DRIVER_OBJECTS_U32             ((uint32)1U)

/* Compile time switch stating that there is no configured key */
#define CRYPTO_43_HSE_KEYS_EXIST                               (STD_OFF)

/* Compile time switch stating that support for Nvram read/write operations is enabled or disabled */
#define CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM                (STD_OFF)



/* Pre-processor switch to enable/disable support in Crypto driver for job redirection feature */
#define CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT               (STD_OFF)

/* Pre-processor switch to enable/disable support in Crypto driver for feeding Hse Firmware with descriptors using Crypto_43_HSE_KeyElementGet() API */
#define CRYPTO_43_HSE_ENABLE_FEED_HSE_DESC_SUPPORT             (STD_OFF)

/* Support for User mode.
*       STD_ON:  the Crypto driver can be executed from both supervisor and user mode
*       STD_OFF: the Crypto driver can be executed only from supervisor mode */
#define CRYPTO_43_HSE_ENABLE_USER_MODE_SUPPORT                 (STD_OFF)

#ifndef MCAL_ENABLE_USER_MODE_SUPPORT
    #ifdef CRYPTO_43_HSE_ENABLE_USER_MODE_SUPPORT
        #if (STD_ON == CRYPTO_43_HSE_ENABLE_USER_MODE_SUPPORT)
            #error MCAL_ENABLE_USER_MODE_SUPPORT is not enabled. For running Crypto driver in user mode the MCAL_ENABLE_USER_MODE_SUPPORT needs to be defined.
        #endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_USER_MODE_SUPPORT) */
    #endif /* ifndef CRYPTO_43_HSE_ENABLE_USER_MODE_SUPPORT */
#endif /* ifndef MCAL_ENABLE_USER_MODE_SUPPORT*/

/* Support for SHE */
#define CRYPTO_43_HSE_SPT_SHE                                  (STD_ON)

/* Support for Miyaguchi-Preneel compression function (SHE spec support) */
#define CRYPTO_43_HSE_SPT_MP                                   (STD_ON)

/* Support for AES */
#define CRYPTO_43_HSE_SPT_AES                                  (STD_ON)
    #define CRYPTO_43_HSE_SPT_AES_CBC                          (STD_ON)
    #define CRYPTO_43_HSE_SPT_AES_CFB                          (STD_ON)
    #define CRYPTO_43_HSE_SPT_AES_CTR                          (STD_ON)
    #define CRYPTO_43_HSE_SPT_AES_ECB                          (STD_ON)
    #define CRYPTO_43_HSE_SPT_AES_OFB                          (STD_ON)
    /* Support for XTS AES */
    #define CRYPTO_43_HSE_SPT_XTS_AES                          (STD_OFF)

/* Support for AEAD */
#define CRYPTO_43_HSE_SPT_AEAD                                 (STD_ON)

/* Support for MAC */
#define CRYPTO_43_HSE_SPT_MAC                                  (STD_ON)
    #define CRYPTO_43_HSE_SPT_CMAC                             (STD_ON)
    #define CRYPTO_43_HSE_SPT_FAST_CMAC                        (STD_ON)
    #define CRYPTO_43_HSE_SPT_GMAC                             (STD_ON)
    #define CRYPTO_43_HSE_SPT_HMAC                             (STD_ON)
    #define CRYPTO_43_HSE_SPT_XCBCMAC                          (STD_OFF)

/* Support for TDES_(128, 192)_(ECB, CBC, CFB, OFB) as defined  in NIST SP 800-67 rev1. */
#define CRYPTO_43_HSE_SPT_TDES                                 (STD_OFF)

/* Support for HASH primitives */
#define CRYPTO_43_HSE_SPT_HASH                                 (STD_ON)
    #define CRYPTO_43_HSE_SPT_MD5                              (STD_OFF)
    #define CRYPTO_43_HSE_SPT_SHA1                             (STD_ON)
    #define CRYPTO_43_HSE_SPT_SHA2_224                         (STD_ON)
    #define CRYPTO_43_HSE_SPT_SHA2_256                         (STD_ON)
    #define CRYPTO_43_HSE_SPT_SHA2_384                         (STD_ON)
    #define CRYPTO_43_HSE_SPT_SHA2_512                         (STD_ON)
    #define CRYPTO_43_HSE_SPT_SHA2_512_224                     (STD_ON)
    #define CRYPTO_43_HSE_SPT_SHA2_512_256                     (STD_ON)
    #define CRYPTO_43_HSE_SPT_SHA3                             (STD_ON)

/* Support for SIPHASH primitive */
#define CRYPTO_43_HSE_SPT_SIPHASH                              (STD_OFF)

/* Support for RSA primitives */
#define CRYPTO_43_HSE_SPT_RSA                                  (STD_ON)
    #define CRYPTO_43_HSE_SPT_RSAES_NO_PADDING                 (STD_ON)
    #define CRYPTO_43_HSE_SPT_RSAES_OAEP                       (STD_ON)
    #define CRYPTO_43_HSE_SPT_RSAES_PCKS1_V15                  (STD_ON)
    #define CRYPTO_43_HSE_SPT_RSAASSA_PSS                      (STD_ON)
    #define CRYPTO_43_HSE_SPT_RSASSA_PCKS1_V15                 (STD_ON)

/* Support for ECC primitives */
#define CRYPTO_43_HSE_SPT_ECC                                  (STD_ON)
    #define CRYPTO_43_HSE_SPT_EDDSA                            (STD_ON)
    #define CRYPTO_43_HSE_SPT_ECDSA                            (STD_ON)
    #define CRYPTO_43_HSE_SPT_SECP192R1                        (STD_OFF)
    #define CRYPTO_43_HSE_SPT_SECP224R1                        (STD_OFF)
    #define CRYPTO_43_HSE_SPT_SECP192K1                        (STD_OFF)
    #define CRYPTO_43_HSE_SPT_SECP224K1                        (STD_OFF)
    #define CRYPTO_43_HSE_SPT_SECP256K1                        (STD_OFF)
    #define CRYPTO_43_HSE_SPT_SECP256R1                        (STD_ON)
    #define CRYPTO_43_HSE_SPT_SECP384R1                        (STD_ON)
    #define CRYPTO_43_HSE_SPT_SECP521R1                        (STD_ON)
    #define CRYPTO_43_HSE_SPT_BRAINPOOLP192R1                  (STD_OFF)
    #define CRYPTO_43_HSE_SPT_BRAINPOOLP224R1                  (STD_OFF)
    #define CRYPTO_43_HSE_SPT_BRAINPOOLP256R1                  (STD_ON)
    #define CRYPTO_43_HSE_SPT_BRAINPOOLP320R1                  (STD_ON)
    #define CRYPTO_43_HSE_SPT_BRAINPOOLP384R1                  (STD_ON)
    #define CRYPTO_43_HSE_SPT_BRAINPOOLP512R1                  (STD_ON)
    #define CRYPTO_43_HSE_SPT_BRAINPOOLP192T1                  (STD_OFF)
    #define CRYPTO_43_HSE_SPT_BRAINPOOLP224T1                  (STD_OFF)
    #define CRYPTO_43_HSE_SPT_BRAINPOOLP256T1                  (STD_OFF)
    #define CRYPTO_43_HSE_SPT_BRAINPOOLP320T1                  (STD_OFF)
    #define CRYPTO_43_HSE_SPT_BRAINPOOLP384T1                  (STD_OFF)
    #define CRYPTO_43_HSE_SPT_BRAINPOOLP512T1                  (STD_OFF)
    #define CRYPTO_43_HSE_SPT_EC25519_ED25519                  (STD_ON)
    #define CRYPTO_43_HSE_SPT_EC25519_ED25519PH                (STD_ON)
    #define CRYPTO_43_HSE_SPT_EC25519_CURVE25519               (STD_ON)
    #define CRYPTO_43_HSE_SPT_EC448_ED448                      (STD_OFF)
    #define CRYPTO_43_HSE_SPT_EC448_CURVE448                   (STD_OFF)

/* Support for various key operations */
#define CRYPTO_43_HSE_SPT_KEY_IMPORT                           (STD_ON)
    #define CRYPTO_43_HSE_SPT_SHE_KEY_IMPORT                   (STD_ON)
    #define CRYPTO_43_HSE_SPT_SYM_KEY_IMPORT                   (STD_ON)
    #define CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT                   (STD_ON)
    #define CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT                   (STD_ON)
    #define CRYPTO_43_HSE_SPT_ENC_AUTH_KEY_IMPORT              (STD_ON)
#define CRYPTO_43_HSE_SPT_KEY_EXPORT                           (STD_ON)
    #define CRYPTO_43_HSE_SPT_SHE_KEY_EXPORT                   (STD_ON)
    #define CRYPTO_43_HSE_SPT_SYM_KEY_EXPORT                   (STD_ON)
    #define CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT                   (STD_ON)
    #define CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT                   (STD_ON)
#define CRYPTO_43_HSE_SPT_FORMATKEYCATALOGS                    (STD_ON)
#define CRYPTO_43_HSE_SPT_GETKEYINFO                           (STD_ON)
#define CRYPTO_43_HSE_SPT_KEYVERIFY                            (STD_ON)

/* Support for key derivation */
#define CRYPTO_43_HSE_SPT_KEY_DERIVE                           (STD_ON)
    #define CRYPTO_43_HSE_SPT_KDF_ANS_X963                     (STD_ON)
    #define CRYPTO_43_HSE_SPT_PBKDF2                           (STD_ON)
    #define CRYPTO_43_HSE_SPT_KDFTLS_12PRF                     (STD_ON)

/* Support for Diffie-Hellman Compute Key */
#define CRYPTO_43_HSE_SPT_COMPUTE_DH                           (STD_ON)

/* Support Import/Export of streaming context for symmetric operations */
#define CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT             (STD_ON)

/* Support for key generation */
#define CRYPTO_43_HSE_SPT_KEY_GENERATE                         (STD_ON)
    #define CRYPTO_43_HSE_SPT_SYM_RND_KEY_GEN                  (STD_ON)
    #define CRYPTO_43_HSE_SPT_RSA_KEY_PAIR_GEN                 (STD_ON)
    #define CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN                 (STD_ON)
    #define CRYPTO_43_HSE_SPT_CLASSIC_DH_KEY_PAIR_GEN          (STD_OFF)

/* Support for Cipher modes flags for AES keys */
#define CRYPTO_43_HSE_AES_BLOCK_MODE_MASK                      (STD_ON)

/* Support for HSE ECC key format */
#define CRYPTO_43_HSE_ECC_KEY_FORMAT                           (STD_ON)

/* Support for Compressed ECC key format */
#define CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT                    (STD_ON)

/* Symbolic names for the CryptoDriverObjectId attribute of all the Crypto Driver Objects */
#define CryptoConf_CryptoDriverObject_CryptoDriverObject_0  ((uint32)0U)

/*==================================================================================================
*                                              ENUMS
==================================================================================================*/

/*==================================================================================================
*                                  STRUCTURES AND OTHER TYPEDEFS
==================================================================================================*/
/* Structure containing the number and list of Crypto Driver Objects allocated to a partition */
typedef struct
{
    const uint8  u8NumCDOs;
    const uint8* au8CDOsList;
} Crypto_43_HSE_PartitionToCdoMappingType;

/* Structure storing information about a Crypto Driver Object */
typedef struct
{
    Crypto_43_HSE_QueueElementType* const    pQueuedJobs;
    const uint32                             u32CryptoQueueSize;
    const Crypto_43_HSE_PrimitiveType* const pCryptoKeyPrimitives;
    const uint32                             u32NoCryptoPrimitives;
} Crypto_43_HSE_ObjectType;

/* Structure storing information about which Mu instance is allocated to a partition */
typedef struct
{
    const uint8 u8MuInstance;
    const uint8 u8IdxMuInstance;
} Crypto_43_HSE_PartitionToMuMappingType;


/*==================================================================================================
*                                  GLOBAL CONSTANTS DECLARATIONS
==================================================================================================*/

#define CRYPTO_43_HSE_START_SEC_CONST_8
#include "Crypto_43_HSE_MemMap.h"

/* Array storing the mapping of the MU instance per partition */
extern const Crypto_43_HSE_PartitionToMuMappingType Crypto_43_HSE_aPartitionToMuMapping[CRYPTO_43_HSE_MAX_NUMBER_PARTITIONS_U8];

#define CRYPTO_43_HSE_STOP_SEC_CONST_8
#include "Crypto_43_HSE_MemMap.h"

#define CRYPTO_43_HSE_START_SEC_CONST_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/* Variables related to Hse KeyCatalog feature */
extern const hseKeyGroupCfgEntry_t aHseNvmKeyCatalog[2U];
extern const hseKeyGroupCfgEntry_t aHseRamKeyCatalog[2U];

#define CRYPTO_43_HSE_STOP_SEC_CONST_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"
/*==================================================================================================
*                                  GLOBAL VARIABLE DECLARATIONS
==================================================================================================*/

/*==================================================================================================
*                                       FUNCTION PROTOTYPES
==================================================================================================*/

#ifdef __cplusplus
}
#endif

/** @} */

#endif /* CRYPTO_43_HSE_CFG_H */

