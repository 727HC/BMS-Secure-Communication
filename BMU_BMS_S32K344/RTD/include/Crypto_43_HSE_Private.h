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

#ifndef CRYPTO_43_HSE_PRIVATE_H
#define CRYPTO_43_HSE_PRIVATE_H

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
#include "Crypto_43_HSE_Cfg.h"

/*==================================================================================================
*                                 SOURCE FILE VERSION INFORMATION
==================================================================================================*/
#define CRYPTO_43_HSE_VENDOR_ID_PRIVATE                       43
#define CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_PRIVATE        4
#define CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_PRIVATE        7
#define CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_PRIVATE     0
#define CRYPTO_43_HSE_SW_MAJOR_VERSION_PRIVATE                5
#define CRYPTO_43_HSE_SW_MINOR_VERSION_PRIVATE                0
#define CRYPTO_43_HSE_SW_PATCH_VERSION_PRIVATE                0

/*==================================================================================================
*                                       FILE VERSION CHECKS
==================================================================================================*/
/* Check if Crypto private header file and Crypto Cfg header file are of the same vendor */
#if (CRYPTO_43_HSE_VENDOR_ID_PRIVATE != CRYPTO_43_HSE_VENDOR_ID_CFG)
    #error "Crypto_43_HSE_Private.h and Crypto_43_HSE_Cfg.h have different vendor ids"
#endif

/* Check if Crypto private header file and Crypto Cfg header file are of the same Autosar version */
#if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_PRIVATE    != CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_CFG) || \
     (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_PRIVATE    != CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_CFG) || \
     (CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_PRIVATE != CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_CFG) \
    )
    #error "AutoSar Version Numbers of Crypto_43_HSE_Private.h and Crypto_43_HSE_Cfg.h are different"
#endif

/* Check if Crypto private header file and Crypto Cfg header file are of the same Software version */
#if ((CRYPTO_43_HSE_SW_MAJOR_VERSION_PRIVATE != CRYPTO_43_HSE_SW_MAJOR_VERSION_CFG) || \
     (CRYPTO_43_HSE_SW_MINOR_VERSION_PRIVATE != CRYPTO_43_HSE_SW_MINOR_VERSION_CFG) || \
     (CRYPTO_43_HSE_SW_PATCH_VERSION_PRIVATE != CRYPTO_43_HSE_SW_PATCH_VERSION_CFG)    \
    )
    #error "Software Version Numbers of Crypto_43_HSE_Private.h and Crypto_43_HSE_Cfg.h are different"
#endif

/*==================================================================================================
*                                            CONSTANTS
==================================================================================================*/
#define CRYPTO_43_HSE_START_SEC_CONST_8
#include "Crypto_43_HSE_MemMap.h"


/* Array of structures storing the information of the Crypto Driver Objects mapped on partitions */
extern const Crypto_43_HSE_PartitionToCdoMappingType Crypto_43_HSE_aPartitionToCdoMapping[CRYPTO_43_HSE_MAX_NUMBER_PARTITIONS_U8];

#define CRYPTO_43_HSE_STOP_SEC_CONST_8
#include "Crypto_43_HSE_MemMap.h"


#define CRYPTO_43_HSE_START_SEC_CONST_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/* Array of structures storing the information about the Crypto Driver Objects */
extern const Crypto_43_HSE_ObjectType Crypto_43_HSE_aDriverObjectList[CRYPTO_43_HSE_NUMBER_OF_DRIVER_OBJECTS_U32];

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    /* Array of structures storing the information for the Crypto Keys */
    extern const Crypto_43_HSE_KeyType Crypto_43_HSE_aKeyList[CRYPTO_43_HSE_NUMBER_OF_KEYS_U32];
    /* Array of structures storing the information for the Crypto Key Elements */
    extern const Crypto_43_HSE_KeyElementType Crypto_43_HSE_aKeyElementList[CRYPTO_43_HSE_NUMBER_OF_KEY_ELEMENTS_U32];
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


#define CRYPTO_43_HSE_STOP_SEC_CONST_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/*==================================================================================================
*                                       DEFINES AND MACROS
==================================================================================================*/
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)

    /* Key Element ID of the key material */
    #define CRYPTO_43_HSE_KEY_MATERIAL_U32                         ((uint32)0x01U)

    #if (STD_ON == CRYPTO_43_HSE_SPT_SHE)
        /* Size of a SHE key */
        #define CRYPTO_43_HSE_SHE_KEY_SIZE_U32                     ((uint32)16U)
        /* SHE keys Input Output */
        #define CRYPTO_43_HSE_M1_SIZE_U32                          ((uint32)16U)
        #define CRYPTO_43_HSE_M2_SIZE_U32                          ((uint32)32U)
        #define CRYPTO_43_HSE_M3_SIZE_U32                          ((uint32)16U)
        #define CRYPTO_43_HSE_M4_SIZE_U32                          ((uint32)32U)
        #define CRYPTO_43_HSE_M5_SIZE_U32                          ((uint32)16U)

        #define CRYPTO_43_HSE_INDEX_M1_U32                         (0U)
        #define CRYPTO_43_HSE_INDEX_M2_U32                         ((uint32)(CRYPTO_43_HSE_M1_SIZE_U32))
        #define CRYPTO_43_HSE_INDEX_M3_U32                         ((uint32)(CRYPTO_43_HSE_M1_SIZE_U32 + CRYPTO_43_HSE_M2_SIZE_U32))
        #define CRYPTO_43_HSE_INDEX_M4_U32                         ((uint32)(CRYPTO_43_HSE_M1_SIZE_U32 + CRYPTO_43_HSE_M2_SIZE_U32 + CRYPTO_43_HSE_M3_SIZE_U32))
        #define CRYPTO_43_HSE_INDEX_M5_U32                         ((uint32)(CRYPTO_43_HSE_M1_SIZE_U32 + CRYPTO_43_HSE_M2_SIZE_U32 + CRYPTO_43_HSE_M3_SIZE_U32 + CRYPTO_43_HSE_M4_SIZE_U32))

        #define CRYPTO_43_HSE_SHE_SIZE_OUT_U32                     ((uint32)(CRYPTO_43_HSE_M1_SIZE_U32 + CRYPTO_43_HSE_M2_SIZE_U32 + CRYPTO_43_HSE_M3_SIZE_U32))
        #define CRYPTO_43_HSE_SHE_SIZE_IN_U32                      ((uint32)(CRYPTO_43_HSE_M1_SIZE_U32 + CRYPTO_43_HSE_M2_SIZE_U32 + CRYPTO_43_HSE_M3_SIZE_U32))
    #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE) */
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

/* Crypto extension to Std_ReturnType */
/* The service request failed because timeout occurred */
#define CRYPTO_43_HSE_RET_OPERATION_TIMEOUT                    ((Std_ReturnType)0x80U)
/* The service request failed because it is not supported */
#define CRYPTO_43_HSE_RET_NOT_SUPPORTED                        ((Std_ReturnType)0x81U)
/* The service request failed because at least one parameter is invalid */
#define CRYPTO_43_HSE_RET_INVALID_PARAM                        ((Std_ReturnType)0x82U)
/* The service request failed because there is no stream available for the job */
#define CRYPTO_43_HSE_RET_STREAM_BUSY                          ((Std_ReturnType)0x83U)
/* The service request failed because the buffer is too small to store the result */
#define CRYPTO_43_HSE_RET_SMALL_BUFFER                         ((Std_ReturnType)0x84U)
/* The mac or signature verification has failed due to invalid tag or signature */
#define CRYPTO_43_HSE_RET_VERIFY_FAILED                        ((Std_ReturnType)0x85U)

/*==================================================================================================
*                                              ENUMS
==================================================================================================*/

/*==================================================================================================
*                                  STRUCTURES AND OTHER TYPEDEFS
==================================================================================================*/

/*==================================================================================================
*                                  GLOBAL VARIABLE DECLARATIONS
==================================================================================================*/
#define CRYPTO_43_HSE_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

extern Crypto_43_HSE_DriverStateType Crypto_43_HSE_aeDriverState[CRYPTO_43_HSE_MAX_NUMBER_PARTITIONS_U8];

#define CRYPTO_43_HSE_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"


#define CRYPTO_43_HSE_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

extern Crypto_43_HSE_ObjectQueueType Crypto_43_HSE_aObjectQueueList[CRYPTO_43_HSE_NUMBER_OF_DRIVER_OBJECTS_U32];

#define CRYPTO_43_HSE_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/*==================================================================================================
*                                       FUNCTION PROTOTYPES
==================================================================================================*/
#define CRYPTO_43_HSE_START_SEC_CODE
#include "Crypto_43_HSE_MemMap.h"

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
/**
* @brief           Checks if call is done from a valid partition and driver is initialized
* @details         Checks if call is done from a valid partition and driver is initialized
*
* @param[in]       u32PartitionId - Id of the partition where fromt this call is made
* @param[in]       u8ApiId        - Id of the caller API
*
* @return          E_OK:     Request successful
*                  E_NOT_OK: Request failed
*/
Std_ReturnType Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis
(
    const uint32 u32PartitionId,
    const uint8  u8ApiId
);
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */

/**
* @brief           Reports to DET detected errros.
* @details         Reports to DET the extended development and runtime errros.
*
* @param[in]       u8ServiceId - The API service ID
* @param[in]       u8Error     - Crypto error extension to Std_ReturnType to be reported via DET
*
* @return          void
*/
void Crypto_43_HSE_ReportErrorToDet
(
    uint8 u8ServiceId,
    uint8 u8Error
);

#define CRYPTO_43_HSE_STOP_SEC_CODE
#include "Crypto_43_HSE_MemMap.h"

#ifdef __cplusplus
}
#endif

/** @} */

#endif /* CRYPTO_43_HSE_PRIVATE_H */


