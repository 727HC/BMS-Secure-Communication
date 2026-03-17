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

#ifndef CRYPTO_43_HSE_TYPES_H
#define CRYPTO_43_HSE_TYPES_H

/**
*   @file
*
*   @internal
*   @addtogroup CRYPTO
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
#include "Mcal.h"
#include "Rte_Csm_Type.h"
#include "Crypto_GeneralTypes.h"

/*==================================================================================================
*                                 SOURCE FILE VERSION INFORMATION
==================================================================================================*/
#define CRYPTO_43_HSE_VENDOR_ID_TYPES                       43
#define CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_TYPES        4
#define CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_TYPES        7
#define CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_TYPES     0
#define CRYPTO_43_HSE_SW_MAJOR_VERSION_TYPES                5
#define CRYPTO_43_HSE_SW_MINOR_VERSION_TYPES                0
#define CRYPTO_43_HSE_SW_PATCH_VERSION_TYPES                0

/*==================================================================================================
*                                       FILE VERSION CHECKS
==================================================================================================*/
#ifndef DISABLE_MCAL_INTERMODULE_ASR_CHECK
    /* Check if header file and Mcal.h header file are of the same AutoSar version */
    #if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_TYPES != MCAL_AR_RELEASE_MAJOR_VERSION) || \
         (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_TYPES != MCAL_AR_RELEASE_MINOR_VERSION)    \
        )
        #error "AutoSar Version Numbers of Crypto_43_HSE_Types.h and Mcal.h are different"
    #endif

    /* Check if header file and Rte_Csm_Type.h header header file are of the same AutoSar version */
    #if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_TYPES != RTE_CSM_TYPE_AR_RELEASE_MAJOR_VERSION_H) || \
         (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_TYPES != RTE_CSM_TYPE_AR_RELEASE_MINOR_VERSION_H)    \
        )
        #error "AutoSar Version Numbers of Crypto_43_HSE_Types.h and Rte_Csm_Type.h are different"
    #endif

    /* Check if header file and Crypto_GeneralTypes.h header header file are of the same AutoSar version */
    #if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_TYPES != CRYPTO_GENERALTYPES_AR_RELEASE_MAJOR_VERSION_H) || \
         (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_TYPES != CRYPTO_GENERALTYPES_AR_RELEASE_MINOR_VERSION_H)    \
        )
        #error "AutoSar Version Numbers of Crypto_43_HSE_Types.h and Crypto_GeneralTypes.h are different"
    #endif
#endif

/*==================================================================================================
*                                            CONSTANTS
==================================================================================================*/

/*==================================================================================================
*                                       DEFINES AND MACROS
==================================================================================================*/

/*==================================================================================================
*                                              ENUMS
==================================================================================================*/
typedef enum
{
    CRYPTO_43_HSE_WA_ALLOWED       = 0x00U, /* key element can be written as plaintext */
    CRYPTO_43_HSE_WA_ENCRYPTED     = 0x01U, /* key element can be written encrypted */
    CRYPTO_43_HSE_WA_INTERNAL_COPY = 0x02U, /* key element can be filled with another key element in the same crypto driver */
    CRYPTO_43_HSE_WA_DENIED        = 0x03U  /* key element can not be written from outside the crypto criver */
} Crypto_43_HSE_KeyElementWriteAccessType;

typedef enum
{
    CRYPTO_43_HSE_RA_ALLOWED       = 0x00U, /* key element can be read as plaintext */
    CRYPTO_43_HSE_RA_ENCRYPTED     = 0x01U, /* key element can be read encrypted */
    CRYPTO_43_HSE_RA_INTERNAL_COPY = 0x02U, /* key element can be copied to another key element in the same crypto driver */
    CRYPTO_43_HSE_RA_DENIED        = 0x03U  /* key element cannot be read from outside the crypto driver */
} Crypto_43_HSE_KeyElementReadAccessType;

typedef enum
{
    CRYPTO_43_HSE_KE_FORMAT_BIN_OCTET                       = 0x01U,
    CRYPTO_43_HSE_KE_FORMAT_BIN_SHEKEYS                     = 0x02U,
    CRYPTO_43_HSE_KE_FORMAT_BIN_IDENT_PRIVATEKEY_PKCS8      = 0x03U,
    CRYPTO_43_HSE_KE_FORMAT_BIN_IDENT_PUBLICKEY             = 0x04U,
    CRYPTO_43_HSE_KE_FORMAT_BIN_RSA_PRIVATEKEY              = 0x05U,
    CRYPTO_43_HSE_KE_FORMAT_BIN_RSA_PUBLICKEY               = 0x06U,
    CRYPTO_43_HSE_KE_FORMAT_BIN_CUSTOM_IMPORT_EXPORT        = 0xF0U
} Crypto_43_HSE_KeyFormatType;

/**
* @brief Enum containing the possible states of the Crypto driver
*/
typedef enum
{
    CRYPTO_43_HSE_DRIVER_UNINIT      = 0x00U,
    CRYPTO_43_HSE_DRIVER_INITIALIZED = 0x01U
} Crypto_43_HSE_DriverStateType;

/*==================================================================================================
*                                  STRUCTURES AND OTHER TYPEDEFS
==================================================================================================*/
typedef struct
{
    const Crypto_ServiceInfoType eService;
    const uint8                  u8AlgoFamily;
    const uint8                  u8AlgoMode;
    const uint8                  u8SecondaryAlgoFamily;
    const boolean                bPrimitiveSupportContext;
} Crypto_43_HSE_PrimitiveType;

typedef struct
{
    uint32          u32Next;
    Crypto_JobType* pJob;
} Crypto_43_HSE_QueueElementType;

/* Structure storing information about the elements in the queue of a Crypto Driver Object */
typedef struct
{
    uint32 u32HeadOfFreeJobs;
    uint32 u32HeadOfQueuedJobs;
}Crypto_43_HSE_ObjectQueueType;

typedef struct
{
    const uint32                u32NumCryptoKeyElements;
    const uint32* const         pCryptoKeyElementList;
    uint8* const                KeyStatus;
} Crypto_43_HSE_KeyType;

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

#endif /* CRYPTO_43_HSE_TYPES_H */
