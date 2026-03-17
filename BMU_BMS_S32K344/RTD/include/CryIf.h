/*==================================================================================================
*   Project              : RTD AUTOSAR 4.7
*   Platform             : CORTEXM
*   Peripheral           : CryIf
*   Dependencies         : none
*
*   Autosar Version      : 4.7.0
*   Autosar Revision     : ASR_REL_4_7_REV_0000
*   Autosar Conf.Variant :
*   SW Version           : 5.0.0
*   Build Version        : S32K3_RTD_5_0_0_D2410_ASR_REL_4_7_REV_0000_20250404
*
*   (c) Copyright 2020 - 2025 NXP
*   All Rights Reserved.
*
*   NXP Confidential. This software is owned or controlled by NXP and may only be
*   used strictly in accordance with the applicable license terms. By expressly
*   accepting such terms or by downloading, installing, activating and/or otherwise
*   using the software, you are agreeing that you have read, and that you agree to
*   comply with and are bound by, such license terms. If you do not agree to be
*   bound by the applicable license terms, then you may not retain, install,
*   activate or otherwise use the software.
==================================================================================================*/

#ifndef CRYIF_H
#define CRYIF_H

/**
*   @file
*
*   @addtogroup CRYIF
*   @{
*/

#ifdef __cplusplus
extern "C"{
#endif

/*==================================================================================================
*                                        INCLUDE FILES
* 1) system and project includes
* 2) needed interfaces from external units
* 3) internal and external interfaces from this unit
==================================================================================================*/
#include "Rte_Csm_Type.h"
#include "Crypto_GeneralTypes.h"

/*==================================================================================================
*                              SOURCE FILE VERSION INFORMATION
==================================================================================================*/
#define CRYIF_VENDOR_ID                       43
#define CRYIF_MODULE_ID                       112
#define CRYIF_AR_RELEASE_MAJOR_VERSION        4
#define CRYIF_AR_RELEASE_MINOR_VERSION        7
#define CRYIF_AR_RELEASE_REVISION_VERSION     0
#define CRYIF_SW_MAJOR_VERSION                5
#define CRYIF_SW_MINOR_VERSION                0
#define CRYIF_SW_PATCH_VERSION                0

/*==================================================================================================
*                                    FILE VERSION CHECKS
==================================================================================================*/
#ifndef DISABLE_MCAL_INTERMODULE_ASR_CHECK
    /* Check if CryIf header file and Rte_Csm_Type header file are of the same Autosar version */
    #if ((CRYIF_AR_RELEASE_MAJOR_VERSION != RTE_CSM_TYPE_AR_RELEASE_MAJOR_VERSION_H) || \
         (CRYIF_AR_RELEASE_MINOR_VERSION != RTE_CSM_TYPE_AR_RELEASE_MINOR_VERSION_H)    \
        )
        #error "AutoSar Version Numbers of CryIf.h and Rte_Csm_Type.h are different"
    #endif

    /* Check if CryIf header file and Crypto_GeneralTypes header file are of the same Autosar version */
    #if ((CRYIF_AR_RELEASE_MAJOR_VERSION != CRYPTO_GENERALTYPES_AR_RELEASE_MAJOR_VERSION_H) || \
         (CRYIF_AR_RELEASE_MINOR_VERSION != CRYPTO_GENERALTYPES_AR_RELEASE_MINOR_VERSION_H)    \
        )
        #error "AutoSar Version Numbers of CryIf.h and Crypto_GeneralTypes.h are different"
    #endif
#endif

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

/*==================================================================================================
*                                GLOBAL VARIABLE DECLARATIONS
==================================================================================================*/

/*==================================================================================================
*                                     FUNCTION PROTOTYPES
==================================================================================================*/
/**
* @brief            Notifies the CRYIF about the completion of the request with the result of the cryptographic operation.
* @details          Notifies the CRYIF about the completion of the request with the result of the cryptographic operation.
*
* @param[in]        job         Points to the completed job's information structure. It contains a callbackID to identify which job is finished.
* @param[in]        result      Contains the result of the cryptographic operation.
*
* @return           void
*/
void CryIf_CallbackNotification
(
    Crypto_JobType* job,
    Std_ReturnType result
);



#ifdef __cplusplus
}
#endif

/** @} */

#endif /* CRYIF_H */


