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

#ifndef CRYPTO_43_HSE_IPW_H
#define CRYPTO_43_HSE_IPW_H

/**
*   @file
*
*   @internal
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
#include "Crypto_43_HSE.h"

/*==================================================================================================
*                                 SOURCE FILE VERSION INFORMATION
==================================================================================================*/
#define CRYPTO_43_HSE_VENDOR_ID_IPW_H                       43
#define CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_IPW_H        4
#define CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_IPW_H        7
#define CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_IPW_H     0
#define CRYPTO_43_HSE_SW_MAJOR_VERSION_IPW_H                5
#define CRYPTO_43_HSE_SW_MINOR_VERSION_IPW_H                0
#define CRYPTO_43_HSE_SW_PATCH_VERSION_IPW_H                0

/*==================================================================================================
*                                       FILE VERSION CHECKS
==================================================================================================*/
/* Check if Crypto Ipw header file and Crypto header file are of the same vendor */
#if (CRYPTO_43_HSE_VENDOR_ID_IPW_H != CRYPTO_43_HSE_VENDOR_ID)
    #error "Crypto_43_HSE_Ipw.h and Crypto_43_HSE.h have different vendor ids"
#endif

/* Check if Crypto Ipw header file and Crypto header file are of the same Autosar version */
#if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_IPW_H    != CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION) || \
     (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_IPW_H    != CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION) || \
     (CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_IPW_H != CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION) \
    )
    #error "AutoSar Version Numbers of Crypto_43_HSE_Ipw.h and Crypto_43_HSE.h are different"
#endif

/* Check if Crypto Ipw header file and Crypto header file are of the same Software version */
#if ((CRYPTO_43_HSE_SW_MAJOR_VERSION_IPW_H != CRYPTO_43_HSE_SW_MAJOR_VERSION) || \
     (CRYPTO_43_HSE_SW_MINOR_VERSION_IPW_H != CRYPTO_43_HSE_SW_MINOR_VERSION) || \
     (CRYPTO_43_HSE_SW_PATCH_VERSION_IPW_H != CRYPTO_43_HSE_SW_PATCH_VERSION)    \
    )
    #error "Software Version Numbers of Crypto_43_HSE_Ipw.h and Crypto_43_HSE.h are different"
#endif

/*==================================================================================================
*                                            CONSTANTS
==================================================================================================*/

/*==================================================================================================
*                                       DEFINES AND MACROS
==================================================================================================*/
/* The minimum size required for Context saving by the Crypto driver - it represents the max value HSE can save.
 * For context saving, this value should be the minimum for the storing buffer.
 * For context restoring, this value should be the maximum for the restoring buffer, but it is strongly suggested to use this maximum
 * since the exact value that was previously saved by the HSE is unknown.
 */
#if (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT)
#define CRYPTO_43_HSE_IPW_MAX_STREAMING_CONTEXT_SIZE   (MAX_STREAMING_CONTEXT_SIZE)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) */

/*==================================================================================================
*                                              ENUMS
==================================================================================================*/

/*==================================================================================================
*                                  STRUCTURES AND OTHER TYPEDEFS
==================================================================================================*/

/*==================================================================================================
*                                  GLOBAL VARIABLE DECLARATIONS
==================================================================================================*/

/*==================================================================================================
*                                       FUNCTION PROTOTYPES
==================================================================================================*/
#define CRYPTO_43_HSE_START_SEC_CODE
#include "Crypto_43_HSE_MemMap.h"

Std_ReturnType Crypto_43_HSE_Ipw_Init
(
    const uint32 u32PartitionId
);

/* -------------------------------------------------------------------------- */

Std_ReturnType Crypto_43_HSE_Ipw_ProcessJob
(
    const uint32          u32PartitionId,
    const uint32          u32ObjectIdx,
    Crypto_JobType* const pJob
);

/* -------------------------------------------------------------------------- */

Std_ReturnType Crypto_43_HSE_Ipw_CancelJob
(
    const uint32                u32PartitionId,
    const uint32                u32ObjectIdx,
    const Crypto_JobType* const pJob
);

/* -------------------------------------------------------------------------- */

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    Std_ReturnType Crypto_43_HSE_Ipw_ImportKey
    (
        const uint32       u32PartitionId,
        const uint8* const pKey,
        const uint32       u32KeyLength,
        const uint32       u32CryptoKeyIdx,
        const uint32       u32CryptoKeyElementIdx
    );

    /* -------------------------------------------------------------------------- */

    Std_ReturnType Crypto_43_HSE_Ipw_ExportKey
    (
        const uint32  u32PartitionId,
        const uint32  u32KeyMaterialKeyElemIdx,
    #if ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT))
        uint8* const  pResult,
    #else
        const uint8*  pResult,
    #endif
    #if ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_EXPORT))
        uint32* const pResultLength
    #else
        const uint32* const pResultLength
    #endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_EXPORT)) */
    );

    /* -------------------------------------------------------------------------- */

    Std_ReturnType Crypto_43_HSE_Ipw_KeyDeriveExtract
    (
        const uint32 u32PartitionId,
        const uint32 u32CryptoSrcKeyIdx,
        const uint32 u32TargetCryptoKeyIdx,
        const uint32 u32KeyElementSourceOffset,
        const uint32 u32KeyElementCopyLength
    );

    /* -------------------------------------------------------------------------- */

    Std_ReturnType Crypto_43_HSE_Ipw_RandomSeed
    (
        const uint32       u32PartitionId,
        const uint32       u32CryptoKeyIdx,
        const uint8* const pu8SeedPtr,
        const uint32       u32SeedLength
    );

    /* -------------------------------------------------------------------------- */

    Std_ReturnType Crypto_43_HSE_Ipw_KeyGenerate
    (
        const uint32 u32PartitionId,
        const uint32 u32CryptoKeyIdx
    );

    /* -------------------------------------------------------------------------- */

    Std_ReturnType Crypto_43_HSE_Ipw_KeyDerive
    (
        const uint32 u32PartitionId,
        const uint32 u32CryptoKeyIdx,
        const uint32 u32TargetKeyIdx
    );

    /* -------------------------------------------------------------------------- */

    Std_ReturnType Crypto_43_HSE_Ipw_CalcSecret
    (
        const uint32       u32PartitionId,
        const uint32       u32CryptoKeyIdx,
        const uint8* const pPartnerPublicValue,
        const uint32       u32PartnerPublicValueLength
    );

    /* -------------------------------------------------------------------------- */

    #if (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM)
    Std_ReturnType Crypto_43_HSE_Ipw_RestoreKeyValidInfoFromNvram
    (
        const uint32 u32PartitionId
    );
    #endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM) */

    /* -------------------------------------------------------------------------- */

    #if (STD_ON == CRYPTO_43_HSE_ENABLE_FEED_HSE_DESC_SUPPORT)
    Std_ReturnType Crypto_43_HSE_Ipw_FeedHseDescriptor
    (
        const uint32 u32PartitionId,
        uint8*       pu8ResultPtr,
        uint32*      pu32ResultLengthPtr
    );
    #endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_FEED_HSE_DESC_SUPPORT) */
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

/* -------------------------------------------------------------------------- */

void Crypto_43_HSE_Ipw_MainFunction
(
    const uint32 u32PartitionId
);

/* -------------------------------------------------------------------------- */
Std_ReturnType Crypto_43_HSE_Ipw_FormatKeyCatalogs
(
    const uint32 u32PartitionId
);

/* -------------------------------------------------------------------------- */

void Crypto_43_HSE_Ipw_SetSynchronousRequestsTimeout
(
    const uint32 u32PartitionId,
    const uint32 u32Timeout
);

/* -------------------------------------------------------------------------- */

Std_ReturnType Crypto_43_HSE_Ipw_SheSetBootStatus
(
    const uint32  u32PartitionId,
    const boolean bStatus
);

/* -------------------------------------------------------------------------- */

Std_ReturnType Crypto_43_HSE_Ipw_SheGetStatus
(
    const uint32 u32PartitionId,
    uint8*       pStatus
);

/* -------------------------------------------------------------------------- */

Std_ReturnType Crypto_43_HSE_Ipw_SheGetId
(
    const uint32 u32PartitionId,
    const uint8* pChallenge,
    const uint8* pId,
    const uint8* pSreg,
    const uint8* pMac
);

/* -------------------------------------------------------------------------- */

Std_ReturnType Crypto_43_HSE_Ipw_SheDebugChal
(
    const uint32 u32PartitionId,
    const uint8* pChallenge
);

/* -------------------------------------------------------------------------- */

Std_ReturnType Crypto_43_HSE_Ipw_SheDebugAuth
(
    const uint32 u32PartitionId,
    const uint8* pAuthorization
);

/* -------------------------------------------------------------------------- */

Std_ReturnType Crypto_43_HSE_Ipw_SheMPCompression
(
    const uint32  u32PartitionId,
    const uint8*  pInput,
    const uint32  u32InputLen,
    const uint8*  pResult,
    const uint32* pResultLen
);

/* -------------------------------------------------------------------------- */

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
Std_ReturnType Crypto_43_HSE_Ipw_CheckKey
(
    const uint32 u32PartitionId,
    const uint32 u32CryptoKeyIdx
);
#endif /*STD_ON == CRYPTO_43_HSE_KEYS_EXIST*/

/* -------------------------------------------------------------------------- */


/* -------------------------------------------------------------------------- */

/**
* @brief           Function converts an address to HSE host address
* @details         Function converts an address to HSE host address; if Crypto TCM support is enabled, address offset for specific processor is added
*
* @param[in]       Addr:  Address to be converted
*
* @returns         HOST_ADDR: Hse Host Address
*/
#define Crypto_Ipw_AddrHandler(Address) Hse_Ip_ToAHBAddress(Address)

#define CRYPTO_43_HSE_STOP_SEC_CODE
#include "Crypto_43_HSE_MemMap.h"

#ifdef __cplusplus
}
#endif

/** @} */

#endif /* CRYPTO_43_HSE_IPW_H */


