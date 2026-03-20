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
#include "Crypto_43_HSE_Private.h"
#include "Crypto_43_HSE.h"
#include "Crypto_43_HSE_Util.h"
#include "Hse_Ip_Cfg.h"

/*==================================================================================================
*                                 SOURCE FILE VERSION INFORMATION
==================================================================================================*/
#define CRYPTO_43_HSE_VENDOR_ID_CFG_C                      43
#define CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_CFG_C       4
#define CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_CFG_C       7
#define CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_CFG_C    0
#define CRYPTO_43_HSE_SW_MAJOR_VERSION_CFG_C               5
#define CRYPTO_43_HSE_SW_MINOR_VERSION_CFG_C               0
#define CRYPTO_43_HSE_SW_PATCH_VERSION_CFG_C               0

/*==================================================================================================
*                                       FILE VERSION CHECKS
==================================================================================================*/
/* Check if Crypto configuration source file and Crypto private header file are of the same vendor */
#if (CRYPTO_43_HSE_VENDOR_ID_CFG_C != CRYPTO_43_HSE_VENDOR_ID_PRIVATE)
    #error "Crypto_43_HSE_Cfg.c and Crypto_43_HSE_Private.h have different vendor ids"
#endif

/* Check if Crypto configuration source file and Crypto private header file are of the same Autosar version */
#if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_CFG_C    != CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_PRIVATE) || \
     (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_CFG_C    != CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_PRIVATE) || \
     (CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_CFG_C != CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_PRIVATE) \
    )
    #error "AutoSar Version Numbers of Crypto_43_HSE_Cfg.c and Crypto_43_HSE_Private.h are different"
#endif

/* Check if Crypto configuration source file and Crypto private header file are of the same Software version */
#if ((CRYPTO_43_HSE_SW_MAJOR_VERSION_CFG_C != CRYPTO_43_HSE_SW_MAJOR_VERSION_PRIVATE) || \
     (CRYPTO_43_HSE_SW_MINOR_VERSION_CFG_C != CRYPTO_43_HSE_SW_MINOR_VERSION_PRIVATE) || \
     (CRYPTO_43_HSE_SW_PATCH_VERSION_CFG_C != CRYPTO_43_HSE_SW_PATCH_VERSION_PRIVATE)    \
    )
    #error "Software Version Numbers of Crypto_43_HSE_Cfg.c and Crypto_43_HSE_Private.h are different"
#endif

/* Check if Crypto configuration source file and Crypto header file are of the same vendor */
#if (CRYPTO_43_HSE_VENDOR_ID_CFG_C != CRYPTO_43_HSE_VENDOR_ID)
    #error "Crypto_43_HSE_Cfg.c and Crypto_43_HSE.h have different vendor ids"
#endif

/* Check if Crypto configuration source file and Crypto header file are of the same Autosar version */
#if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_CFG_C    != CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION) || \
     (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_CFG_C    != CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION) || \
     (CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_CFG_C != CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION) \
    )
    #error "AutoSar Version Numbers of Crypto_43_HSE_Cfg.c and Crypto_43_HSE.h are different"
#endif

/* Check if Crypto configuration source file and Crypto header file are of the same Software version */
#if ((CRYPTO_43_HSE_SW_MAJOR_VERSION_CFG_C != CRYPTO_43_HSE_SW_MAJOR_VERSION) || \
     (CRYPTO_43_HSE_SW_MINOR_VERSION_CFG_C != CRYPTO_43_HSE_SW_MINOR_VERSION) || \
     (CRYPTO_43_HSE_SW_PATCH_VERSION_CFG_C != CRYPTO_43_HSE_SW_PATCH_VERSION)    \
    )
    #error "Software Version Numbers of Crypto_43_HSE_Cfg.c and Crypto_43_HSE.h are different"
#endif

/* Check if Crypto configuration source file and Hse Ip configuration header file are of the same vendor */
#if (CRYPTO_43_HSE_VENDOR_ID_CFG_C != HSE_IP_CFG_VENDOR_ID_H)
    #error "Crypto_43_HSE_Cfg.c and Hse_Ip_Cfg.h have different vendor ids"
#endif

/* Check if Crypto configuration source file and Hse Ip configuration header file are of the same Software version */
#if ((CRYPTO_43_HSE_SW_MAJOR_VERSION_CFG_C != HSE_IP_CFG_SW_MAJOR_VERSION_H) || \
     (CRYPTO_43_HSE_SW_MINOR_VERSION_CFG_C != HSE_IP_CFG_SW_MINOR_VERSION_H) || \
     (CRYPTO_43_HSE_SW_PATCH_VERSION_CFG_C != HSE_IP_CFG_SW_PATCH_VERSION_H)    \
    )
    #error "Software Version Numbers of Crypto_43_HSE_Cfg.c and Hse_Ip_Cfg.h are different"
#endif

/*==================================================================================================
*                           LOCAL TYPEDEFS (STRUCTURES, UNIONS, ENUMS)
==================================================================================================*/

/*==================================================================================================
*                                          LOCAL MACROS
==================================================================================================*/

/*==================================================================================================
*                                         LOCAL CONSTANTS
==================================================================================================*/

#define CRYPTO_43_HSE_START_SEC_CONST_8
#include "Crypto_43_HSE_MemMap.h"

/* Array storing the indexes of the Crypto Driver Objects */
static const uint8 Crypto_43_HSE_au8CDOs[] =
{
    0U
};

#define CRYPTO_43_HSE_STOP_SEC_CONST_8
#include "Crypto_43_HSE_MemMap.h"


#define CRYPTO_43_HSE_START_SEC_CONST_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/* Array storing the Crypto primitives in the Crypto Driver Object CryptoDriverObject_0 */
static const Crypto_43_HSE_PrimitiveType Crypto_43_HSE_aPrimitives_CryptoDriverObject_0[1U] =
{
    {
        CRYPTO_MACGENERATE,
        (uint8)CRYPTO_ALGOFAM_AES,
        (uint8)CRYPTO_ALGOMODE_CMAC,
        (uint8)CRYPTO_ALGOFAM_NOT_SET,
        (boolean)FALSE
    }
};

#define CRYPTO_43_HSE_STOP_SEC_CONST_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/*==================================================================================================
*                                         LOCAL VARIABLES
==================================================================================================*/

/*==================================================================================================
*                                        GLOBAL CONSTANTS
==================================================================================================*/

#define CRYPTO_43_HSE_START_SEC_CONST_8
#include "Crypto_43_HSE_MemMap.h"

/* Array storing the mapping of the MU instance per partition */
const Crypto_43_HSE_PartitionToMuMappingType Crypto_43_HSE_aPartitionToMuMapping[CRYPTO_43_HSE_MAX_NUMBER_PARTITIONS_U8] =
{
    {HSE_IP_MU_0, 0x00U}
};

#define CRYPTO_43_HSE_STOP_SEC_CONST_8
#include "Crypto_43_HSE_MemMap.h"


#define CRYPTO_43_HSE_START_SEC_CONST_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/* Array of structures storing the information of the Crypto Driver Objects mapped on partitions */
const Crypto_43_HSE_PartitionToCdoMappingType Crypto_43_HSE_aPartitionToCdoMapping[CRYPTO_43_HSE_MAX_NUMBER_PARTITIONS_U8] =
{
    /* Structure storing the information of the Crypto Driver Objects */
    {
        /* Number of Crypto Driver Objects */
        1U,
        /* Reference to array storing the indexes of the Crypto Driver Objects */
        Crypto_43_HSE_au8CDOs
    }
};

/* Array of structures storing the information about the Crypto Driver Objects */
const Crypto_43_HSE_ObjectType Crypto_43_HSE_aDriverObjectList[CRYPTO_43_HSE_NUMBER_OF_DRIVER_OBJECTS_U32] =
{
    /* Structure storing the information about Crypto Driver Object CryptoDriverObject_0 */
    {
        /* Reference to the jobs queue */
        NULL_PTR,
        /* Jobs queue size */
        0U,
        /* Reference to the Crypto primitives list */
        Crypto_43_HSE_aPrimitives_CryptoDriverObject_0,
        /* Number of crypto primitives */
        1U
    }
};

/* Table containing NVM key catalog entries */
/* SRAM-resident catalogs (const removed for HSE DMA access) */
hseKeyGroupCfgEntry_t aHseNvmKeyCatalog[] =
{
    {(HSE_MU0_MASK), HSE_KEY_OWNER_CUST, HSE_KEY_TYPE_AES,      10U, 128U           , {0U, 0U}},
    {(HSE_MU0_MASK), HSE_KEY_OWNER_CUST, HSE_KEY_TYPE_ECC_PAIR, 10U, HSE_KEY256_BITS , {0U, 0U}},
    {0U, 0U, 0U, 0U, 0U, {0U, 0U}}
};

hseKeyGroupCfgEntry_t aHseRamKeyCatalog[] =
{
    {(HSE_MU0_MASK), HSE_KEY_OWNER_ANY,  HSE_KEY_TYPE_AES,      10U, 128U           , {0U, 0U}},
    {(HSE_MU0_MASK), HSE_KEY_OWNER_ANY,  HSE_KEY_TYPE_ECC_PUB,  10U, HSE_KEY256_BITS , {0U, 0U}},
    {0U, 0U, 0U, 0U, 0U, {0U, 0U}}
};

#define CRYPTO_43_HSE_STOP_SEC_CONST_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/*==================================================================================================
*                                        GLOBAL VARIABLES
==================================================================================================*/

#define CRYPTO_43_HSE_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

Crypto_43_HSE_ObjectQueueType Crypto_43_HSE_aObjectQueueList[CRYPTO_43_HSE_NUMBER_OF_DRIVER_OBJECTS_U32];

#define CRYPTO_43_HSE_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/*==================================================================================================
*                                    LOCAL FUNCTION PROTOTYPES
==================================================================================================*/

/*==================================================================================================
*                                         LOCAL FUNCTIONS
==================================================================================================*/

/*==================================================================================================
*                                        GLOBAL FUNCTIONS
==================================================================================================*/

#ifdef __cplusplus
}
#endif

/** @} */

