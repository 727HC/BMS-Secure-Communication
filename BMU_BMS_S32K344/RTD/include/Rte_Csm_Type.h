/*==================================================================================================
*   Project              : RTD AUTOSAR 4.7
*   Platform             : CORTEXM
*   Peripheral           : Csm
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
*   NXP Confidential. This software is owned or controlled by NXP and may only be
*   used strictly in accordance with the applicable license terms. By expressly
*   accepting such terms or by downloading, installing, activating and/or otherwise
*   using the software, you are agreeing that you have read, and that you agree to
*   comply with and are bound by, such license terms. If you do not agree to be
*   bound by the applicable license terms, then you may not retain, install,
*   activate or otherwise use the software.
==================================================================================================*/

#ifndef RTE_CSM_TYPE_H
#define RTE_CSM_TYPE_H

/**
*   @file
*
*   @internal
*   @addtogroup CSM
*   @{
*/

#ifdef __cplusplus
extern "C"{
#endif

/*==================================================================================================
*                                         INCLUDE FILES
* 1) system and project includes
* 2) needed interfaces from external units
* 3) internal and external interfaces from this unit
==================================================================================================*/

/*==================================================================================================
*                               SOURCE FILE VERSION INFORMATION
==================================================================================================*/
#define RTE_CSM_TYPE_VENDOR_ID_H                       43
#define RTE_CSM_TYPE_MODULE_ID_H                       110
#define RTE_CSM_TYPE_AR_RELEASE_MAJOR_VERSION_H        4
#define RTE_CSM_TYPE_AR_RELEASE_MINOR_VERSION_H        7
#define RTE_CSM_TYPE_AR_RELEASE_REVISION_VERSION_H     0
#define RTE_CSM_TYPE_SW_MAJOR_VERSION_H                5
#define RTE_CSM_TYPE_SW_MINOR_VERSION_H                0
#define RTE_CSM_TYPE_SW_PATCH_VERSION_H                0

/*==================================================================================================
*                                     FILE VERSION CHECKS
==================================================================================================*/

/*==================================================================================================
*                                           CONSTANTS
==================================================================================================*/

/*==================================================================================================
*                                       DEFINES AND MACROS
==================================================================================================*/

/*==================================================================================================
*                                             ENUMS
==================================================================================================*/

/*==================================================================================================
*                                 STRUCTURES AND OTHER TYPEDEFS
==================================================================================================*/
/* SWS_Csm_01024
   Enumeration of the result type of verification operations. */
typedef enum
{
    CRYPTO_E_VER_OK     = 0x00U,    /* The result of the verification is "true", i.e. the two compared elements are identical. This return code shall be given as value "0" */
    CRYPTO_E_VER_NOT_OK = 0x01U     /* The result of the verification is "false", i.e. the two compared elements are not identical. This return code shall be given as value "1". */
} Crypto_VerifyResultType;

/* SWS_Csm_01029
   Enumeration which operation shall be performed. This enumeration is constructed from a bit mask, where the first bit indicates "Start", the second "Update" and the third "Finish". */
typedef enum
{
    CRYPTO_OPERATIONMODE_START           = 0x01U, /* Operation Mode is "Start". The job's state shall be reset, i.e. previous input data and intermediate results shall be deleted. */
    CRYPTO_OPERATIONMODE_UPDATE          = 0x02U, /* Operation Mode is "Update". Used to calculate intermediate results. */
    CRYPTO_OPERATIONMODE_STREAMSTART     = 0x03U, /* Operation Mode is "Stream Start". Mixture of "Start" and "Update". Used for streaming. */
    CRYPTO_OPERATIONMODE_FINISH          = 0x04U, /* Operation Mode is "Finish". The calculations shall be finalized */
    CRYPTO_OPERATIONMODE_SINGLECALL      = 0x07U, /* Operation Mode is "Single Call". Mixture of "Start", "Update" and "Finish". */
    CRYPTO_OPERATIONMODE_SAVE_CONTEXT    = 0x08U, /* Operation mode is "Save workspace context". Context data shall be provided by the crypto driver to the application. */
    CRYPTO_OPERATIONMODE_RESTORE_CONTEXT = 0x10U  /* Operation mode is "Restore workspace context". Application provides the context data that was previously stored and the crypto driver shall restore the internal workspace. */
} Crypto_OperationModeType;

/* SWS_Csm_91102
   Enumeration for key status. */
typedef enum
{
    CRYPTO_KEYSTATUS_INVALID            = 0x00U, /* The status of the key is invalid (for example after Csm_KeyElementSet the Csm_KeySetValid was not called). */
    CRYPTO_KEYSTATUS_VALID              = 0x01U, /* The status of the key is valid (for example the status was successfully set by the Csm_KeySetValid). */
    CRYPTO_KEYSTATUS_UPDATE_IN_PROGRESS = 0x02U  /* AUTOSAR CP R22-11: Indicates that the NV RAM Block that is assigned to this key are currently being updated. The update operation is in progress and has not yet been completed by NVM. */
} Crypto_KeyStatusType;

/*==================================================================================================
*                                 GLOBAL VARIABLE DECLARATIONS
==================================================================================================*/

/*==================================================================================================
*                                     FUNCTION PROTOTYPES
==================================================================================================*/

#ifdef __cplusplus
}
#endif

/** @} */

#endif /* RTE_CSM_TYPE_H */
