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
#include "Crypto_43_HSE.h"
#include "Crypto_43_HSE_Util.h"
#include "Crypto_43_HSE_Ipw.h"

/*==================================================================================================
*                                 SOURCE FILE VERSION INFORMATION
==================================================================================================*/
#define CRYPTO_43_HSE_VENDOR_ID_C                     43
#define CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_C      4
#define CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_C      7
#define CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_C   0
#define CRYPTO_43_HSE_SW_MAJOR_VERSION_C              5
#define CRYPTO_43_HSE_SW_MINOR_VERSION_C              0
#define CRYPTO_43_HSE_SW_PATCH_VERSION_C              0

/*==================================================================================================
*                                       FILE VERSION CHECKS
==================================================================================================*/
/* Check if Crypto source file and Crypto header file are of the same vendor */
#if (CRYPTO_43_HSE_VENDOR_ID_C != CRYPTO_43_HSE_VENDOR_ID)
    #error "Crypto_43_HSE.c and Crypto_43_HSE.h have different vendor ids"
#endif

/* Check if Crypto source file and Crypto header file are of the same Autosar version */
#if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_C    != CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION) || \
     (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_C    != CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION) || \
     (CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_C != CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION) \
    )
    #error "AutoSar Version Numbers of Crypto_43_HSE.c and Crypto_43_HSE.h are different"
#endif

/* Check if Crypto source file and Crypto header file are of the same Software version */
#if ((CRYPTO_43_HSE_SW_MAJOR_VERSION_C != CRYPTO_43_HSE_SW_MAJOR_VERSION) || \
     (CRYPTO_43_HSE_SW_MINOR_VERSION_C != CRYPTO_43_HSE_SW_MINOR_VERSION) || \
     (CRYPTO_43_HSE_SW_PATCH_VERSION_C != CRYPTO_43_HSE_SW_PATCH_VERSION)    \
    )
    #error "Software Version Numbers of Crypto_43_HSE.c and Crypto_43_HSE.h are different"
#endif


/* Check if Crypto source file and Crypto_43_HSE_Util header file are of the same vendor */
#if (CRYPTO_43_HSE_VENDOR_ID_C != CRYPTO_43_HSE_UTIL_VENDOR_ID)
    #error "Crypto_43_HSE.c and Crypto_43_HSE_Util.h have different vendor ids"
#endif

/* Check if Crypto source file and Crypto_43_HSE_Util header file are of the same Autosar version */
#if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_C    != CRYPTO_43_HSE_UTIL_AR_RELEASE_MAJOR_VERSION) || \
     (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_C    != CRYPTO_43_HSE_UTIL_AR_RELEASE_MINOR_VERSION) || \
     (CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_C != CRYPTO_43_HSE_UTIL_AR_RELEASE_REVISION_VERSION) \
    )
    #error "AutoSar Version Numbers of Crypto_43_HSE.c and Crypto_43_HSE_Util.h are different"
#endif

/* Check if Crypto source file and Crypto_43_HSE_Util header file are of the same Software version */
#if ((CRYPTO_43_HSE_SW_MAJOR_VERSION_C != CRYPTO_43_HSE_UTIL_SW_MAJOR_VERSION) || \
     (CRYPTO_43_HSE_SW_MINOR_VERSION_C != CRYPTO_43_HSE_UTIL_SW_MINOR_VERSION) || \
     (CRYPTO_43_HSE_SW_PATCH_VERSION_C != CRYPTO_43_HSE_UTIL_SW_PATCH_VERSION)    \
    )
    #error "Software Version Numbers of Crypto_43_HSE.c and Crypto_43_HSE_Util.h are different"
#endif


/* Check if Crypto source file and Crypto Ipw header file are of the same vendor */
#if (CRYPTO_43_HSE_VENDOR_ID_C != CRYPTO_43_HSE_VENDOR_ID_IPW_H)
    #error "Crypto_43_HSE.c and Crypto_43_HSE_Ipw.h have different vendor ids"
#endif

/* Check if Crypto source file and Crypto Ipw header file are of the same Autosar version */
#if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_C    != CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_IPW_H) || \
     (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_C    != CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_IPW_H) || \
     (CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_C != CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_IPW_H) \
    )
    #error "AutoSar Version Numbers of Crypto_43_HSE.c and Crypto_43_HSE_Ipw.h are different"
#endif

/* Check if Crypto source file and Crypto Ipw header file are of the same Software version */
#if ((CRYPTO_43_HSE_SW_MAJOR_VERSION_C != CRYPTO_43_HSE_SW_MAJOR_VERSION_IPW_H) || \
     (CRYPTO_43_HSE_SW_MINOR_VERSION_C != CRYPTO_43_HSE_SW_MINOR_VERSION_IPW_H) || \
     (CRYPTO_43_HSE_SW_PATCH_VERSION_C != CRYPTO_43_HSE_SW_PATCH_VERSION_IPW_H)    \
    )
    #error "Software Version Numbers of Crypto_43_HSE.c and Crypto_43_HSE_Ipw.h are different"
#endif

/*==================================================================================================
*                           LOCAL TYPEDEFS (STRUCTURES, UNIONS, ENUMS)
==================================================================================================*/
/**
* @brief Enum containing the possible return values for function Crypto_43_HSE_GetProcessJobError()
*/
typedef enum
{
    CRYPTO_43_HSE_NO_DET_RET_OK  = 0x00U,
    CRYPTO_43_HSE_NO_DET_RET_NOK,
    CRYPTO_43_HSE_NO_DET_RET_KEY_NOT_VALID,
    CRYPTO_43_HSE_NO_DET_RET_NOT_SUPPORTED,
    CRYPTO_43_HSE_DET_NULL_PTR,
    CRYPTO_43_HSE_DET_INVALID_LEN,
    CRYPTO_43_HSE_DET_INVALID_PARAM
} Crypto_43_HSE_ProcessJobErrorType;

/* Defines used to differentiate input/output for redirection checks*/
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
typedef enum
{
    CRYPTO_43_HSE_INPUT_REDIRECT  = 0U,
    CRYPTO_43_HSE_OUTPUT_REDIRECT = 1U
}CRYPTO_43_HSE_RedirectionIOType;
#endif

/* Structure defining the way the parameters of Crypto_43_HSE_ProcessJob() API should be handled */
typedef struct
{
    boolean bSingleCallOnly;           /* Boolean flag stating if the service is available only in SingleCall mode */
    boolean bCheckTargetKeyId;         /* Boolean flag stating if a check should be performed for the validity of TargetKeyId. Applicable for KeyManagement services accessible through Crypto_43_HSE_ProcessJob() API */
    uint8   u8InputModeMask;           /* 8 bit mask defining in which streaming modes the input parameter of the job should be checked for availability and corectness */
    uint8   u8SecondaryInputModeMask;  /* 8 bit mask defining in which streaming modes the secondary input parameter of the job should be checked for availability and corectness */
    uint8   u8TertiaryInputModeMask;   /* 8 bit mask defining in which streaming modes the tertiary input parameter of the job should be checked for availability and corectness */
    uint8   u8OutputModeMask;          /* 8 bit mask defining in which streaming modes the output parameter of the job should be checked for availability and corectness */
    uint8   u8SecondaryOutputModeMask; /* 8 bit mask defining in which streaming modes the secondary output parameter of the job should be checked for availability and corectness */
    uint8   u8VerifyPtrModeMask;       /* 8 bit mask defining in which streaming modes the verifyPtr parameter of the job should be checked for availability and corectness */
}Crypto_43_HSE_ProcessJobServiceParametersType;

/*==================================================================================================
*                                          LOCAL MACROS
==================================================================================================*/
/* Source offset for key element copy */
#define CRYPTO_KEYCOPY_SRC_OFFSET_U32           ((uint32)0U)
/* Define the number of services supported by Crypto driver */
#define CRYPTO_NUM_SUPPORTED_SERVICES_U8        ((uint8)((uint8)CRYPTO_KEYSETINVALID + 1U))
/* Defines for the UPDATE (U), FINISH (F) or UPDATE & FINISH (UF) Crypto operation modes */
#define CRYPTO_U_U8                             ((uint8)(CRYPTO_OPERATIONMODE_UPDATE))
#define CRYPTO_F_U8                             ((uint8)(CRYPTO_OPERATIONMODE_FINISH))
#define CRYPTO_UF_U8                            ((uint8)(CRYPTO_U_U8 | CRYPTO_F_U8))

#if (STD_ON == CRYPTO_43_HSE_ENABLE_FEED_HSE_DESC_SUPPORT)
    /* Define for the id of the keyElement requesting Crypto to perform a direct request to HSE FW */
    #define CRYPTO_KE_FEED_HSE_DESCRIPTOR_U32   ((uint32)0xFEEDDE5CU)
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_FEED_HSE_DESC_SUPPORT) */
                                                   
/*==================================================================================================
*                                         LOCAL CONSTANTS
==================================================================================================*/
#define CRYPTO_43_HSE_START_SEC_CONST_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/* Array containing information about job parameters for Crypto_43_HSE_ProcessJob() API */
static const Crypto_43_HSE_ProcessJobServiceParametersType Crypto_43_HSE_aProcessJobServiceParams[CRYPTO_NUM_SUPPORTED_SERVICES_U8] =
{
    /* bSingleCallOnly, bCheckTargetKeyId, u8InputModeMask, u8SecondaryInputModeMask, u8TertiaryInputModeMask, u8OutputModeMask, u8SecondaryOutputModeMask, u8VerifyPtrModeMask */
    {  (boolean)FALSE,   (boolean)FALSE,     CRYPTO_U_U8,            0x0U,                    0x0U,              CRYPTO_F_U8,              0x0U,                   0x0U         },  /* CRYPTO_HASH                  Idx = 0x00 */
    {  (boolean)FALSE,   (boolean)FALSE,     CRYPTO_U_U8,            0x0U,                    0x0U,              CRYPTO_F_U8,              0x0U,                   0x0U         },  /* CRYPTO_MACGENERATE           Idx = 0x01 */
    {  (boolean)FALSE,   (boolean)FALSE,     CRYPTO_U_U8,         CRYPTO_F_U8,                0x0U,                 0x0U,                  0x0U,                CRYPTO_F_U8     },  /* CRYPTO_MACVERIFY             Idx = 0x02 */
    {  (boolean)FALSE,   (boolean)FALSE,     CRYPTO_U_U8,            0x0U,                    0x0U,              CRYPTO_UF_U8,             0x0U,                   0x0U         },  /* CRYPTO_ENCRYPT               Idx = 0x03 */
    {  (boolean)FALSE,   (boolean)FALSE,     CRYPTO_U_U8,            0x0U,                    0x0U,              CRYPTO_UF_U8,             0x0U,                   0x0U         },  /* CRYPTO_DECRYPT               Idx = 0x04 */
    {  (boolean)FALSE,   (boolean)FALSE,     CRYPTO_U_U8,         CRYPTO_F_U8,                0x0U,              CRYPTO_UF_U8,          CRYPTO_F_U8,               0x0U         },  /* CRYPTO_AEADENCRYPT           Idx = 0x05 */
    {  (boolean)FALSE,   (boolean)FALSE,     CRYPTO_U_U8,         CRYPTO_F_U8,             CRYPTO_F_U8,          CRYPTO_UF_U8,             0x0U,                CRYPTO_F_U8     },  /* CRYPTO_AEADDECRYPT           Idx = 0x06 */
    {  (boolean)FALSE,   (boolean)FALSE,     CRYPTO_U_U8,            0x0U,                    0x0U,              CRYPTO_F_U8,              0x0U,                   0x0U         },  /* CRYPTO_SIGNATUREGENERATE     Idx = 0x07 */
    {  (boolean)FALSE,   (boolean)FALSE,     CRYPTO_U_U8,         CRYPTO_F_U8,                0x0U,                 0x0U,                  0x0U,                CRYPTO_F_U8     },  /* CRYPTO_SIGNATUREVERIFY       Idx = 0x08 */
    {  (boolean)FALSE,   (boolean)FALSE,        0x0U,                0x0U,                    0x0U,                 0x0U,                  0x0U,                   0x0U         },  /* EMPTY SLOT                   Idx = 0x09 */
    {  (boolean)FALSE,   (boolean)FALSE,        0x0U,                0x0U,                    0x0U,                 0x0U,                  0x0U,                   0x0U         },  /* EMPTY SLOT                   Idx = 0x0A */
    {  (boolean)TRUE,    (boolean)FALSE,        0x0U,                0x0U,                    0x0U,              CRYPTO_F_U8,              0x0U,                   0x0U         },  /* CRYPTO_RANDOMGENERATE        Idx = 0x0B */
    {  (boolean)TRUE,    (boolean)TRUE,      CRYPTO_F_U8,            0x0U,                    0x0U,                 0x0U,                  0x0U,                   0x0U         },  /* CRYPTO_RANDOMSEED            Idx = 0x0C */
    {  (boolean)TRUE,    (boolean)FALSE,        0x0U,                0x0U,                    0x0U,                 0x0U,                  0x0U,                   0x0U         },  /* CRYPTO_KEYGENERATE           Idx = 0x0D */
    {  (boolean)TRUE,    (boolean)TRUE,         0x0U,                0x0U,                    0x0U,                 0x0U,                  0x0U,                   0x0U         },  /* CRYPTO_KEYDERIVE             Idx = 0x0E */
    {  (boolean)TRUE,    (boolean)FALSE,        0x0U,             CRYPTO_F_U8,                0x0U,                 0x0U,                  0x0U,                   0x0U         },  /* CRYPTO_KEYEXCHANGECALCPUBVAL Idx = 0x0F */
    {  (boolean)TRUE,    (boolean)FALSE,     CRYPTO_F_U8,            0x0U,                    0x0U,                 0x0U,                  0x0U,                   0x0U         },  /* CRYPTO_KEYEXCHANGECALCSECRET Idx = 0x10 */
    {  (boolean)FALSE,   (boolean)FALSE,        0x0U,                0x0U,                    0x0U,                 0x0U,                  0x0U,                   0x0U         },  /* EMPTY SLOT                   Idx = 0x11 */
    {  (boolean)FALSE,   (boolean)FALSE,        0x0U,                0x0U,                    0x0U,                 0x0U,                  0x0U,                   0x0U         },  /* EMPTY SLOT                   Idx = 0x12 */
    {  (boolean)TRUE,    (boolean)FALSE,        0x0U,                0x0U,                    0x0U,                 0x0U,                  0x0U,                   0x0U         },  /* CRYPTO_KEYSETVALID           Idx = 0x13 */
    {  (boolean)TRUE,    (boolean)FALSE,        0x0U,                0x0U,                    0x0U,                 0x0U,                  0x0U,                   0x0U         }   /* CRYPTO_KEYSETINVALID         Idx = 0x14 */
};

#define CRYPTO_43_HSE_STOP_SEC_CONST_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/*==================================================================================================
*                                         LOCAL VARIABLES
==================================================================================================*/
#define CRYPTO_43_HSE_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"


/**
* @brief          This variable holds the state of the driver.
* @details        This variable holds the state of the driver. After reset is UNINIT. The output of Crypto_43_HSE_Init() function
*                 should set this variable into IDLE state.
*                  CRYPTO_43_HSE_DRIVER_UNINIT = The CRYPTO controller is not initialized. All registers belonging to the CRYPTO module are in reset state.
*/
Crypto_43_HSE_DriverStateType Crypto_43_HSE_aeDriverState[CRYPTO_43_HSE_MAX_NUMBER_PARTITIONS_U8];

#define CRYPTO_43_HSE_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/*==================================================================================================
*                                        GLOBAL CONSTANTS
==================================================================================================*/

/*==================================================================================================
*                                        GLOBAL VARIABLES
==================================================================================================*/

/*==================================================================================================
*                                    LOCAL FUNCTION PROTOTYPES
==================================================================================================*/
#define CRYPTO_43_HSE_START_SEC_CODE
#include "Crypto_43_HSE_MemMap.h"

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)

static inline Std_ReturnType Crypto_43_HSE_VerifyKeyValidity
(
    const uint32                 u32CryptoKeyIdx,
    const Crypto_ServiceInfoType eJobService
);

static inline Std_ReturnType Crypto_43_HSE_CopyKeyElements
(
    const uint32 u32PartitionId,
    const uint32 u32CryptoKeyIdx,
    const uint32 u32TargetKeyIdx
);

#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForInputPtr
(
    const Crypto_JobType* const pJob
);

static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForSecondaryInputPtr
(
    const Crypto_JobType* const pJob
);

static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForTertiaryInputPtr
(
    const Crypto_JobType* const pJob
);

static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForOutputPtr
(
    const Crypto_JobType* const pJob
);

static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForSecondaryOutputPtr
(
    const Crypto_JobType* const pJob
);

static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForVerifyPtr
(
    const Crypto_JobType* const pJob
);

static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForOutAndVerifyPtrs
(
    const Crypto_JobType* const pJob
);

static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetProcessJobError
(
#if ((STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) && (STD_OFF == CRYPTO_43_HSE_DEV_ERROR_DETECT))
    const uint32          u32ObjectIdx,
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) && (STD_OFF == CRYPTO_43_HSE_DEV_ERROR_DETECT)) */
    const Crypto_JobType* const pJob
);

#if (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT)
#if (STD_OFF == CRYPTO_43_HSE_DEV_ERROR_DETECT)
static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_CheckForContextErrorDetOff
(
    const uint32          u32ObjectIdx,
    const Crypto_JobType* const pJob
);
#endif /* (STD_OFF == CRYPTO_43_HSE_DEV_ERROR_DETECT) */

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
static inline Std_ReturnType Crypto_43_HSE_CheckForContextErrorDetOn
(
    const Crypto_JobType* const pJob,
    const boolean               bPrimitiveSupportContext
);
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) */

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
static inline Std_ReturnType Crypto_43_HSE_VerifyPrimitive
(
    uint32                u32ObjectId,
    const Crypto_JobType* pJob
);
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
static Std_ReturnType Crypto_43_HSE_CheckValidCoreAndDrvInitForCdoApis
(
    const uint32 u32PartitionId,
    const uint32 u32ObjectIdx,
    const uint8  u8ApiId
);
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)) */

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
static inline Std_ReturnType Crypto_43_HSE_GetNonDetErrorsForRandomSeed
(
    const uint32 u32CryptoKeyIdx
);

#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE)
static Std_ReturnType Crypto_43_HSE_GetNonDetErrorsForKeyGenerate
(
    const uint32 u32CryptoKeyIdx
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE) */

#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE)
static Std_ReturnType Crypto_43_HSE_GetNonDetErrorsForKeyDerive
(
    const uint32 u32CryptoKeyIdx,
    const uint32 u32CryptoTargetKeyIdx
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE) */

static Std_ReturnType Crypto_43_HSE_GetNonDetErrorsForKeyExchCalcPubVal
(
    const uint32        u32CryptoKeyIdx,
    const uint32* const pu32PublicValueLengthPtr
);

static Std_ReturnType Crypto_43_HSE_CopyDataFromPubValKeyElementToUser
(
    const uint32  u32PartitionId,
    const uint32  u32CryptoKeyIdx,
#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT))
    uint8* const  pu8PublicValuePtr,
#else
    const uint8*  pu8PublicValuePtr,
#endif
#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_EXPORT))
    uint32* const pu32PublicValueLengthPtr
#else
    const uint32* const pu32PublicValueLengthPtr
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_EXPORT)) */
);

static Std_ReturnType Crypto_43_HSE_GetNonDetErrorsForKeyExchCalcSecret
(
    const uint32 u32CryptoKeyIdx
);

static Std_ReturnType Crypto_43_HSE_MarkKeyAsValid
(
    const uint32 u32CryptoKeyIdx,
    const uint8  u8ServiceId
);

static Std_ReturnType Crypto_43_HSE_MarkKeyAsInvalid
(
    const uint32 u32CryptoKeyIdx,
    const uint8  u8ServiceId
);

static Std_ReturnType Crypto_43_HSE_CheckKeyCopyValid
(
    uint32 u32CryptoKeyIdx,
    uint32 u32TargetKeyIdx
);

static Std_ReturnType Crypto_43_HSE_CheckKeyCopyValidKeyElements
(
    uint32   u32CryptoKeyIdx,
    uint32   u32CryptoKeyElemIdx,
    uint32   u32TargetKeyIdx,
    boolean* pbFound
);

static inline Std_ReturnType Crypto_43_HSE_ExtraKeyCopyValidKEChecks
(
    const uint32 u32CryptoKeyIdx,
    const uint32 u32CryptoKeyElemIdx,
    const uint32 u32TargetKeyIdx,
    const uint32 u32Index
);

static inline Std_ReturnType Crypto_43_HSE_CheckParamAndConfForKeyElementCopy
(
    const uint32 u32CryptoKeyElementIdx,
    const uint32 u32CryptoTargetKeyElementIdx
);

static inline Std_ReturnType Crypto_43_HSE_CheckParamAndConfForKeyElementCopyPartial
(
    const uint32 u32CryptoKeyElementIdx,
    const uint32 u32CryptoTargetKeyElementIdx,
    const uint32 u32KeyElementSourceOffset,
    const uint32 u32KeyElementTargetOffset,
    const uint32 u32KeyElementCopyLength
);

static inline Std_ReturnType Crypto_43_HSE_ProcessKeyElementCopy
(
    const uint32 keyElementId,
    const uint32 targetKeyElementId,
    const uint32 u32TargetKeyIdx,
    const uint32 u32CryptoKeyElementIdx,
    const uint32 u32CryptoTargetKeyElementIdx
);

static inline Std_ReturnType Crypto_43_HSE_CheckForErrorsInKeyElementSet
(
    const uint32 u32PartitionId,
    const uint8* pu8Key,
    uint32       u32KeyLength,
    const uint32 u32CryptoKeyElementIdx
);

static inline Std_ReturnType Crypto_43_HSE_ProcessJobAndCheckNonDetErrors
(
    Crypto_JobType* pJob,
    const uint32    u32PartitionId,
    boolean*        pbJobProcessingComplete
);

static inline Std_ReturnType Crypto_43_HSE_ProcessJobAndCheckNonDetErrorsStepII
(
    Crypto_JobType* pJob,
    const uint32    u32PartitionId,
    const uint32    u32CryptoKeyIdx,
    boolean*        pbJobProcessingComplete
);

static inline Std_ReturnType Crypto_43_HSE_ProcessJobAndCheckNonDetErrorsStepIII
(
    const Crypto_JobType* pJob,
    const uint32          u32PartitionId,
    const uint32          u32CryptoKeyIdx,
    boolean*              pbJobProcessingComplete,
    boolean*              pbCheckForAsyncProcessing
);
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

static inline Std_ReturnType Crypto_43_HSE_CheckForErrorsInProcessJob
(
    const uint32          u32PartitionId,
    const uint32          u32ObjectIdx,
    const Crypto_JobType* pJob
);

static inline Std_ReturnType Crypto_43_HSE_CheckForErrorsInProcessJobStepII
(
    const Crypto_43_HSE_ProcessJobErrorType eProcessJobError
);

#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
static Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_CheckRedirectionRWAccessRights
(
    uint32                       u32CryptoKeyElementIdx,
    const Crypto_ServiceInfoType eJobService,
    const CRYPTO_43_HSE_RedirectionIOType eRedirectionType
);

static Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_CheckRedirectionConfig
(
    uint32                       u32RedirectedKeyId,
    uint32                       u32RedirectedKeyElementId,
    const Crypto_ServiceInfoType eJobService,
    const CRYPTO_43_HSE_RedirectionIOType eRedirectionType
);
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */

#if (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM)
/**
* @brief           Update Nvram with new key information
* @details         Update Nvram with new key information
*
* @param[in]       u32CryptoKeyIdx - Index of the Crypto key
* @param[in]       u8ServiceId     - Service Id of the caller
* @return          E_OK         : Request successful
*                  E_NOT_OK     : Request failed
*/
static Std_ReturnType Crypto_43_HSE_UpdateNvram
(
    const uint32 u32CryptoKeyIdx,
    const uint8  u8ServiceId
);
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM) */

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
static inline Std_ReturnType Crypto_43_HSE_GetNonKeyMaterialElement
(
    const uint32 u32PartitionId,
    const uint32 u32CryptoKeyIdx,
    const uint32 u32CryptoKeyElementId,
    uint8*       pResult,
    uint32*      pResultLength
);
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

/*==================================================================================================
*                                         LOCAL FUNCTIONS
==================================================================================================*/
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)

/**
* @brief           Verify if a key ID is valid
* @details         Verify if a key ID is valid  (found inside the array of all key IDs supported by the Crypto driver)
*
* @param[in]       u32CryptoKeyIdx: Index of the Cypto key
* @param[in]       eJobService:     Job's service type
*
* @return          E_OK: Request successful, key ID found
*                  E_NOT_OK: Request failed, key ID not found
*
* @pre
*
*/
static inline Std_ReturnType Crypto_43_HSE_VerifyKeyValidity
(
    const uint32                 u32CryptoKeyIdx,
    const Crypto_ServiceInfoType eJobService
)
{
    Std_ReturnType RetVal = (Std_ReturnType)E_OK;

    /* All crypto services listed in Crypto_ServiceInfoType except for:
        - CRYPTO_RANDOMGENERATE
        - CRYPTO_HASH
        - CRYPTO_KEYSETVALID
        - CRYPTO_KEYSETINVALID
    require a key represented as a key identifier which is valid. */
    if ((CRYPTO_RANDOMGENERATE != eJobService) &&
        (CRYPTO_HASH           != eJobService) &&
        (CRYPTO_KEYSETVALID    != eJobService) &&
        (CRYPTO_KEYSETINVALID  != eJobService)
       )
    {
        if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
        {
            if ((uint8)CRYPTO_KEYSTATUS_INVALID == *Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].KeyStatus)
            {
                RetVal = (Std_ReturnType)CRYPTO_E_KEY_NOT_VALID;
            }
        }
        else
        {
            RetVal = (Std_ReturnType)E_NOT_OK;
        }
    }
    return RetVal;
}

/**
* @brief           Copy all keyMaterial and non material key elements from one key to another
* @details         Copy all keyMaterial and non material key elements from one key to another
*
* @param[in]       u32PartitionId             - Id of the partition where fromt this call is made
* @param[in]       u32CryptoKeyIdx            - index of the key from where to copy the non material key elements
* @param[in]       u32TargetKeyIdx            - index of the key where to copy the non material key elements
*
* @return          Std_ReturnType
*/
static inline Std_ReturnType Crypto_43_HSE_CopyKeyElements
(
    const uint32 u32PartitionId,
    const uint32 u32CryptoKeyIdx,
    const uint32 u32TargetKeyIdx
)
{
    Std_ReturnType RetVal = (Std_ReturnType)E_OK;
    boolean        bFound;
    uint32         u32Counter1;
    uint32         u32Counter2;

    /* Get the indexes for source and target element */
    uint32         u32KeyMaterialElementIndex = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);
    uint32         u32TargetKeyElementIndex   = Crypto_43_HSE_Util_GetKeyElementIdx (u32TargetKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);

    if ((CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32KeyMaterialElementIndex) && (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32TargetKeyElementIndex))
    {
        if ((hseKeyType_t)HSE_KEY_TYPE_SHARED_SECRET == Crypto_43_HSE_aKeyElementList[u32KeyMaterialElementIndex].u8HseKeyType)
        {
            /* Extract/Move the specified length starting from specified offset from source key element(key material) to target source element(key material) */
            RetVal = Crypto_43_HSE_Ipw_KeyDeriveExtract(u32PartitionId, u32KeyMaterialElementIndex, u32TargetKeyElementIndex,CRYPTO_KEYCOPY_SRC_OFFSET_U32,*Crypto_43_HSE_aKeyElementList[u32TargetKeyElementIndex].pu32CryptoElementActualSize);
        }
    }

    if ((Std_ReturnType)E_OK == RetVal)
    /* Copy the rest of the elements (different from key material) */
    {
        for (u32Counter1 = 0U; u32Counter1 < Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].u32NumCryptoKeyElements; u32Counter1++)
        {
            bFound = FALSE;
            for (u32Counter2 = 0U; ((u32Counter2 < Crypto_43_HSE_aKeyList[u32TargetKeyIdx].u32NumCryptoKeyElements) && (FALSE == bFound)); u32Counter2++)
            {
                /* Need to check if:
                   1. Key elements have same KeyElementId
                   2. The KeyElementId is not KeyMaterial
                   3. The buffer of the target u32KeyElementId (where data will be copied to) is not a NULL pointer */
                if ((Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32Counter1]].u32CryptoKeyElementId ==  \
                     Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32TargetKeyIdx].pCryptoKeyElementList[u32Counter2]].u32CryptoKeyElementId) &&
                     (CRYPTO_43_HSE_KEY_MATERIAL_U32 != Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32Counter1]].u32CryptoKeyElementId) &&
                     (NULL_PTR != Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32TargetKeyIdx].pCryptoKeyElementList[u32Counter2]].pCryptoElementArray)
                    )
                {
                    bFound = TRUE;
                    Crypto_43_HSE_Util_MemCpy8(Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32TargetKeyIdx].pCryptoKeyElementList[u32Counter2]].pCryptoElementArray,
                                        Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32Counter1]].pCryptoElementArray,
                                        *Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32Counter1]].pu32CryptoElementActualSize
                                      );
                    *Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32TargetKeyIdx].pCryptoKeyElementList[u32Counter2]].pu32CryptoElementActualSize = \
                    *Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32Counter1]].pu32CryptoElementActualSize;
                }
            }
        }
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

/**
* @brief           Verifies primary input pointer of one job for corectness (null ptr, invalid length)
* @details         Verifies primary input pointer of one job for corectness (null ptr, invalid length)
*
* @param[in]       pJob - Pointer to the configuration of the job. Contains structures with job and primitive relevant information but also pointer to result buffers.
*
* @return          Result of the operation
* @retval          CRYPTO_43_HSE_NO_DET_RET_OK:            No error to report to DET, the function should return E_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOK:           No error to report to DET, the function should return E_NOT_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_KEY_NOT_VALID: No error to report to DET, the function should return CRYPTO_E_KEY_NOT_VALID
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOT_SUPPORTED: No error to report to DET, the function should return CRYPTO_43_HSE_E_NOT_SUPPORTED
* @retval          CRYPTO_43_HSE_DET_NULL_PTR:             CRYPTO_43_HSE_E_PARAM_POINTER should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_PARAM:        CRYPTO_43_HSE_E_PARAM_HANDLE  should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_LEN:          CRYPTO_43_HSE_E_PARAM_VALUE   should be reported to DET
*/
static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForInputPtr
(
    const Crypto_JobType* const pJob
)
{
    Crypto_43_HSE_ProcessJobErrorType     eRetVal                  = CRYPTO_43_HSE_NO_DET_RET_OK;
    const Crypto_ServiceInfoType                       eJobService              = pJob->jobPrimitiveInfo->primitiveInfo->service;
    const Crypto_JobPrimitiveInputOutputType* const    pJobPrimitiveInputOutput = &pJob->jobPrimitiveInputOutput;
    const Crypto_OperationModeType                     eJobMode                 = pJobPrimitiveInputOutput->mode;
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
    const Crypto_JobRedirectionInfoType*               pJobRedir                = pJob->jobRedirectionInfoRef;
    const CRYPTO_43_HSE_RedirectionIOType eRedirectionType         = CRYPTO_43_HSE_INPUT_REDIRECT;
#endif /* #if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */

    /* Check the inputBuffer and inputLength, if a match exists between what spec requires for this service and what is the value provided by the app in eJobMode parameter */
    if (0x0U != ((uint8)eJobMode & (Crypto_43_HSE_aProcessJobServiceParams[eJobService].u8InputModeMask)))
    {
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
        /* If redirection is not configured, or redirection is configured and primary input is not set check inputPtr */
        if (
            (NULL_PTR == pJobRedir) ||
            (FALSE == Crypto_43_HSE_Util_IsRedirectionSet(pJobRedir->redirectionConfig, CRYPTO_REDIRECT_CONFIG_PRIMARY_INPUT))
           )
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */
        {
            if (NULL_PTR == pJobPrimitiveInputOutput->inputPtr)
            {
                eRetVal = CRYPTO_43_HSE_DET_NULL_PTR;
            }
        }
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
        else
        {
            /* If redirection is configured to redirect primary input, check the inputKey */
            eRetVal = Crypto_43_HSE_CheckRedirectionConfig(pJobRedir->inputKeyId, pJobRedir->inputKeyElementId, eJobService, eRedirectionType);
        }
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */
    }
    return eRetVal;
}

/**
* @brief           Verifies secondary input pointer of one job for corectness (null ptr, invalid length)
* @details         Verifies secondary input  pointer of one job for corectness (null ptr, invalid length)
*
* @param[in]       pJob - Pointer to the configuration of the job. Contains structures with job and primitive relevant information but also pointer to result buffers.
*
* @return          Result of the operation
* @retval          CRYPTO_43_HSE_NO_DET_RET_OK:            No error to report to DET, the function should return E_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOK:           No error to report to DET, the function should return E_NOT_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_KEY_NOT_VALID: No error to report to DET, the function should return CRYPTO_E_KEY_NOT_VALID
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOT_SUPPORTED: No error to report to DET, the function should return CRYPTO_43_HSE_E_NOT_SUPPORTED
* @retval          CRYPTO_43_HSE_DET_NULL_PTR:             CRYPTO_43_HSE_E_PARAM_POINTER should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_PARAM:        CRYPTO_43_HSE_E_PARAM_HANDLE  should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_LEN:          CRYPTO_43_HSE_E_PARAM_VALUE   should be reported to DET
*/
static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForSecondaryInputPtr
(
    const Crypto_JobType* const pJob
)
{
    Crypto_43_HSE_ProcessJobErrorType     eRetVal                  = CRYPTO_43_HSE_NO_DET_RET_OK;
    const Crypto_ServiceInfoType                       eJobService              = pJob->jobPrimitiveInfo->primitiveInfo->service;
    const Crypto_JobPrimitiveInputOutputType* const    pJobPrimitiveInputOutput = &pJob->jobPrimitiveInputOutput;
    const Crypto_OperationModeType                     eJobMode                 = pJobPrimitiveInputOutput->mode;
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
    const Crypto_JobRedirectionInfoType*               pJobRedir                = pJob->jobRedirectionInfoRef;
    const CRYPTO_43_HSE_RedirectionIOType eRedirectionType         = CRYPTO_43_HSE_INPUT_REDIRECT;
#endif /* #if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */

    /* Check the secondaryInputBuffer and secondaryInputLength, if a match exists between what spec requires for this service and what is the value provided by the app in eJobMode parameter */
    if (0x0U != ((uint8)eJobMode & (Crypto_43_HSE_aProcessJobServiceParams[eJobService].u8SecondaryInputModeMask)))
    {
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
        /* If redirection is not configured, or redirection is configured and secondary input redirection is not set check secondaryInputPtr */
        if (
            (NULL_PTR == pJobRedir) ||
            (FALSE == Crypto_43_HSE_Util_IsRedirectionSet(pJobRedir->redirectionConfig, CRYPTO_REDIRECT_CONFIG_SECONDARY_INPUT))
           )
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */
        {
            if (NULL_PTR == pJobPrimitiveInputOutput->secondaryInputPtr)
            {
                eRetVal = CRYPTO_43_HSE_DET_NULL_PTR;
            }
        }
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
        else
        {
            /* If redirection is configured to redirect secondary input, check the secondaryInputKey */
            eRetVal = Crypto_43_HSE_CheckRedirectionConfig(pJobRedir->secondaryInputKeyId, pJobRedir->secondaryInputKeyElementId, eJobService, eRedirectionType);
        }
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */
    }

    return eRetVal;
}

/**
* @brief           Verifies tertiary input pointer of one job for corectness (null ptr, invalid length)
* @details         Verifies tertiary input  pointer of one job for corectness (null ptr, invalid length)
*
* @param[in]       pJob - Pointer to the configuration of the job. Contains structures with job and primitive relevant information but also pointer to result buffers.
*
* @return          Result of the operation
* @retval          CRYPTO_43_HSE_NO_DET_RET_OK:            No error to report to DET, the function should return E_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOK:           No error to report to DET, the function should return E_NOT_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_KEY_NOT_VALID: No error to report to DET, the function should return CRYPTO_E_KEY_NOT_VALID
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOT_SUPPORTED: No error to report to DET, the function should return CRYPTO_43_HSE_E_NOT_SUPPORTED
* @retval          CRYPTO_43_HSE_DET_NULL_PTR:             CRYPTO_43_HSE_E_PARAM_POINTER should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_PARAM:        CRYPTO_43_HSE_E_PARAM_HANDLE  should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_LEN:          CRYPTO_43_HSE_E_PARAM_VALUE   should be reported to DET
*/
static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForTertiaryInputPtr
(
    const Crypto_JobType* const pJob
)
{
    Crypto_43_HSE_ProcessJobErrorType     eRetVal                  = CRYPTO_43_HSE_NO_DET_RET_OK;
    const Crypto_ServiceInfoType                       eJobService              = pJob->jobPrimitiveInfo->primitiveInfo->service;
    const Crypto_JobPrimitiveInputOutputType* const    pJobPrimitiveInputOutput = &pJob->jobPrimitiveInputOutput;
    const Crypto_OperationModeType                     eJobMode                 = pJobPrimitiveInputOutput->mode;
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
    const Crypto_JobRedirectionInfoType*               pJobRedir                = pJob->jobRedirectionInfoRef;
    const CRYPTO_43_HSE_RedirectionIOType eRedirectionType         = CRYPTO_43_HSE_INPUT_REDIRECT;
#endif /* #if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */

    /* Check the tertiaryInputBuffer and tertiaryInputLength, if a match exists between what spec requires for this service and what is the value provided by the app in eJobMode parameter */
    if (0x0U != ((uint8)eJobMode & (Crypto_43_HSE_aProcessJobServiceParams[eJobService].u8TertiaryInputModeMask)))
    {
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
        /* If redirection is not configured, or redirection is configured and tertiary input redirection is not set check tertiaryInputPtr */
        if (
            (NULL_PTR == pJobRedir) ||
            (FALSE == Crypto_43_HSE_Util_IsRedirectionSet(pJobRedir->redirectionConfig, CRYPTO_REDIRECT_CONFIG_TERTIARY_INPUT))
           )
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */
        {
            if (NULL_PTR == pJobPrimitiveInputOutput->tertiaryInputPtr)
            {
                eRetVal = CRYPTO_43_HSE_DET_NULL_PTR;
            }
        }
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
        else
        {
            /* If redirection is configured to redirect tertiary input, check the tertiaryInputKey */
            eRetVal = Crypto_43_HSE_CheckRedirectionConfig(pJobRedir->tertiaryInputKeyId, pJobRedir->tertiaryInputKeyElementId, eJobService, eRedirectionType);
        }
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */
    }
    return eRetVal;
}

/**
* @brief           Verifies primary output pointer of one job for corectness (null ptr, invalid length)
* @details         Verifies primary output pointer of one job for corectness (null ptr, invalid length)
*
* @param[in]       pJob - Pointer to the configuration of the job. Contains structures with job and primitive relevant information but also pointer to result buffers.
*
* @return          Result of the operation
* @retval          CRYPTO_43_HSE_NO_DET_RET_OK:            No error to report to DET, the function should return E_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOK:           No error to report to DET, the function should return E_NOT_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_KEY_NOT_VALID: No error to report to DET, the function should return CRYPTO_E_KEY_NOT_VALID
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOT_SUPPORTED: No error to report to DET, the function should return CRYPTO_43_HSE_E_NOT_SUPPORTED
* @retval          CRYPTO_43_HSE_DET_NULL_PTR:             CRYPTO_43_HSE_E_PARAM_POINTER should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_PARAM:        CRYPTO_43_HSE_E_PARAM_HANDLE  should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_LEN:          CRYPTO_43_HSE_E_PARAM_VALUE   should be reported to DET
*/
static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForOutputPtr
(
    const Crypto_JobType* const pJob
)
{
    Crypto_43_HSE_ProcessJobErrorType     eRetVal                  = CRYPTO_43_HSE_NO_DET_RET_OK;
    const Crypto_ServiceInfoType                       eJobService              = pJob->jobPrimitiveInfo->primitiveInfo->service;
    const Crypto_JobPrimitiveInputOutputType* const    pJobPrimitiveInputOutput = &pJob->jobPrimitiveInputOutput;
    const Crypto_OperationModeType                     eJobMode                 = pJobPrimitiveInputOutput->mode;
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
    const Crypto_JobRedirectionInfoType*               pJobRedir                = pJob->jobRedirectionInfoRef;
    const CRYPTO_43_HSE_RedirectionIOType eRedirectionType         = CRYPTO_43_HSE_OUTPUT_REDIRECT;
#endif /* #if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */

    /* Check the outputBuffer and outputLength, if a match exists between what spec requires for this service and what is the value provided by the app in eJobMode parameter */
    if (0x0U != ((uint8)eJobMode & (Crypto_43_HSE_aProcessJobServiceParams[eJobService].u8OutputModeMask)))
    {
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
        /* If redirection is not configured, or redirection is configured and primary output redirection is not set check outputPtr */
        if (
            (NULL_PTR == pJobRedir) ||
            (FALSE == Crypto_43_HSE_Util_IsRedirectionSet(pJobRedir->redirectionConfig, CRYPTO_REDIRECT_CONFIG_PRIMARY_OUTPUT))
           )
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */
        {
            if ((NULL_PTR == pJobPrimitiveInputOutput->outputPtr) || (NULL_PTR == pJobPrimitiveInputOutput->outputLengthPtr))
            {
                eRetVal = CRYPTO_43_HSE_DET_NULL_PTR;
            }
            else
            {
                if (0U == *(pJobPrimitiveInputOutput->outputLengthPtr))
                {
                    eRetVal = CRYPTO_43_HSE_DET_INVALID_LEN;
                }
            }
        }
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
        else
        {
            /* If redirection is configured to redirect the primary output, check the primaryOutputKey */
            eRetVal = Crypto_43_HSE_CheckRedirectionConfig(pJobRedir->outputKeyId, pJobRedir->outputKeyElementId, eJobService, eRedirectionType);
        }
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */
    }
    return eRetVal;
}

/**
* @brief           Verifies secondary output pointer of one job for corectness (null ptr, invalid length)
* @details         Verifies secondary output pointer of one job for corectness (null ptr, invalid length)
*
* @param[in]       pJob - Pointer to the configuration of the job. Contains structures with job and primitive relevant information but also pointer to result buffers.
*
* @return          Result of the operation
* @retval          CRYPTO_43_HSE_NO_DET_RET_OK:            No error to report to DET, the function should return E_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOK:           No error to report to DET, the function should return E_NOT_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_KEY_NOT_VALID: No error to report to DET, the function should return CRYPTO_E_KEY_NOT_VALID
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOT_SUPPORTED: No error to report to DET, the function should return CRYPTO_43_HSE_E_NOT_SUPPORTED
* @retval          CRYPTO_43_HSE_DET_NULL_PTR:             CRYPTO_43_HSE_E_PARAM_POINTER should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_PARAM:        CRYPTO_43_HSE_E_PARAM_HANDLE  should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_LEN:          CRYPTO_43_HSE_E_PARAM_VALUE   should be reported to DET
*/
static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForSecondaryOutputPtr
(
    const Crypto_JobType* const pJob
)
{
    Crypto_43_HSE_ProcessJobErrorType     eRetVal                  = CRYPTO_43_HSE_NO_DET_RET_OK;
    const Crypto_ServiceInfoType                       eJobService              = pJob->jobPrimitiveInfo->primitiveInfo->service;
    const Crypto_JobPrimitiveInputOutputType* const    pJobPrimitiveInputOutput = &pJob->jobPrimitiveInputOutput;
    const Crypto_OperationModeType                     eJobMode                 = pJobPrimitiveInputOutput->mode;
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
    const Crypto_JobRedirectionInfoType*               pJobRedir                = pJob->jobRedirectionInfoRef;
    const CRYPTO_43_HSE_RedirectionIOType eRedirectionType         = CRYPTO_43_HSE_OUTPUT_REDIRECT;
#endif /* #if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */

    /* Check the secondaryOutputBuffer and secondaryOutputLength, if a match exists between what spec requires for this service and what is the value provided by the app in eJobMode parameter */
    if (0x0U != ((uint8)eJobMode & (Crypto_43_HSE_aProcessJobServiceParams[eJobService].u8SecondaryOutputModeMask)))
    {
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
        /* If redirection is not configured, or redirection is configured and secondary output redirection is not set check secondaryOutputPtr */
        if (
            (NULL_PTR == pJobRedir) ||
            (FALSE == Crypto_43_HSE_Util_IsRedirectionSet(pJobRedir->redirectionConfig, CRYPTO_REDIRECT_CONFIG_SECONDARY_OUTPUT))
           )
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */
        {
            if ((NULL_PTR == pJobPrimitiveInputOutput->secondaryOutputPtr) || (NULL_PTR == pJobPrimitiveInputOutput->secondaryOutputLengthPtr))
            {
                eRetVal = CRYPTO_43_HSE_DET_NULL_PTR;
            }
            else
            {
                if (0U == *(pJobPrimitiveInputOutput->secondaryOutputLengthPtr))
                {
                    eRetVal = CRYPTO_43_HSE_DET_INVALID_LEN;
                }
            }
        }
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
        else
        {
            /* If redirection is configured to redirect the secondary output, check the secondaryOutputKey */
            eRetVal = Crypto_43_HSE_CheckRedirectionConfig(pJobRedir->secondaryOutputKeyId, pJobRedir->secondaryOutputKeyElementId, eJobService, eRedirectionType);
        }
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */
    }
    return eRetVal;
}

/**
* @brief           Checks the verifyPtr job structure member for corectness
* @details         Checks the verifyPtr job structure member for corectness
*
* @param[in]       pJob - Pointer to the configuration of the job. Contains structures with job and primitive relevant information but also pointer to result buffers.
*
* @return          Result of the operation
* @retval          CRYPTO_43_HSE_NO_DET_RET_OK:            No error to report to DET, the function should return E_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOK:           No error to report to DET, the function should return E_NOT_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_KEY_NOT_VALID: No error to report to DET, the function should return CRYPTO_E_KEY_NOT_VALID
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOT_SUPPORTED: No error to report to DET, the function should return CRYPTO_43_HSE_E_NOT_SUPPORTED
* @retval          CRYPTO_43_HSE_DET_NULL_PTR:             CRYPTO_43_HSE_E_PARAM_POINTER should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_PARAM:        CRYPTO_43_HSE_E_PARAM_HANDLE  should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_LEN:          CRYPTO_43_HSE_E_PARAM_VALUE   should be reported to DET
*/
static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForVerifyPtr
(
    const Crypto_JobType* const pJob
)
{
    Crypto_43_HSE_ProcessJobErrorType  eRetVal                  = CRYPTO_43_HSE_NO_DET_RET_OK;
    const Crypto_ServiceInfoType                    eJobService              = pJob->jobPrimitiveInfo->primitiveInfo->service;
    const Crypto_JobPrimitiveInputOutputType* const pJobPrimitiveInputOutput = &pJob->jobPrimitiveInputOutput;
    const Crypto_OperationModeType                  eJobMode                 = pJobPrimitiveInputOutput->mode;

    /* Check the verifyPtr, if a match exists between what spec requires for this service and what is the value provided by the app in eJobMode parameter */
    if (0x0U != ((uint8)eJobMode & (Crypto_43_HSE_aProcessJobServiceParams[eJobService].u8VerifyPtrModeMask)))
    {
        if (NULL_PTR == pJobPrimitiveInputOutput->verifyPtr)
        {
            eRetVal = CRYPTO_43_HSE_DET_NULL_PTR;
        }
    }
    return eRetVal;
}

/**
* @brief           Checks all out and verify parameters of one job for corectness (null ptr, invalid length)
* @details         Checks all out and verify parameters of one job for corectness (null ptr, invalid length)
*
* @param[in]       pJob - Pointer to the configuration of the job. Contains structures with job and primitive relevant information but also pointer to result buffers.
*
* @return          Result of the operation
* @retval          CRYPTO_43_HSE_NO_DET_RET_OK:            No error to report to DET, the function should return E_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOK:           No error to report to DET, the function should return E_NOT_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_KEY_NOT_VALID: No error to report to DET, the function should return CRYPTO_E_KEY_NOT_VALID
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOT_SUPPORTED: No error to report to DET, the function should return CRYPTO_43_HSE_E_NOT_SUPPORTED
* @retval          CRYPTO_43_HSE_DET_NULL_PTR:             CRYPTO_43_HSE_E_PARAM_POINTER should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_PARAM:        CRYPTO_43_HSE_E_PARAM_HANDLE  should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_LEN:          CRYPTO_43_HSE_E_PARAM_VALUE   should be reported to DET
*/
static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetJobErrorForOutAndVerifyPtrs
(
    const Crypto_JobType* const pJob
)
{
    Crypto_43_HSE_ProcessJobErrorType eRetVal;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    uint32                     u32TargetKeyIdx;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

    eRetVal = Crypto_43_HSE_GetJobErrorForOutputPtr(pJob);

    if (CRYPTO_43_HSE_NO_DET_RET_OK == eRetVal)
    {
        eRetVal = Crypto_43_HSE_GetJobErrorForSecondaryOutputPtr(pJob);

        if (CRYPTO_43_HSE_NO_DET_RET_OK == eRetVal)
        {
            eRetVal = Crypto_43_HSE_GetJobErrorForVerifyPtr(pJob);

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
            /* For some KeyManagement services realized through Crypto_43_HSE_ProcessJob(), the cryptoTargetKeyId should be checked for validity */
            if ((CRYPTO_43_HSE_NO_DET_RET_OK == eRetVal) && (TRUE == Crypto_43_HSE_aProcessJobServiceParams[(uint8)pJob->jobPrimitiveInfo->primitiveInfo->service].bCheckTargetKeyId))
            {
                /* According with the Cryif requirement SWS_CryIf_00133, the CryIf is responsible to always put the TargetCryptoKeyId in the targetCryptoKeyId member of the job structure */
                u32TargetKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(pJob->targetCryptoKeyId);
                if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32TargetKeyIdx)
                {
                    eRetVal = CRYPTO_43_HSE_DET_INVALID_PARAM;
                }
            }
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */
        }
    }

    return eRetVal;
}

/**
* @brief           Verify if certain parameters of one job are incorrect (null ptr, invalid length)
* @details         Verify if certain parameters of one job are incorrect (null ptr, invalid length)
*
* @param[in]       pJob - Pointer to the configuration of the job. Contains structures with job and primitive relevant information but also pointer to result buffers.
* @param[in]       u32ObjectIdx  - Idx of the Crypto Driver Object. - if DET is set to off
*
* @return          Result of the operation
* @retval          CRYPTO_43_HSE_NO_DET_RET_OK:            No error to report to DET, the function should return E_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOK:           No error to report to DET, the function should return E_NOT_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_KEY_NOT_VALID: No error to report to DET, the function should return CRYPTO_E_KEY_NOT_VALID
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOT_SUPPORTED: No error to report to DET, the function should return CRYPTO_43_HSE_E_NOT_SUPPORTED
* @retval          CRYPTO_43_HSE_DET_NULL_PTR:             CRYPTO_43_HSE_E_PARAM_POINTER should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_PARAM:        CRYPTO_43_HSE_E_PARAM_HANDLE  should be reported to DET
* @retval          CRYPTO_43_HSE_DET_INVALID_LEN:          CRYPTO_43_HSE_E_PARAM_VALUE   should be reported to DET
*/
static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_GetProcessJobError
(
#if ((STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) && (STD_OFF == CRYPTO_43_HSE_DEV_ERROR_DETECT))
    const uint32          u32ObjectIdx,
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) && (STD_OFF == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    const Crypto_JobType* const pJob
)
{
    /* Local variables*/
    Crypto_43_HSE_ProcessJobErrorType eRetVal;

    /* Check first if the service supports only SingleCall operation mode. In case yes and the mode in the job is not SingleCall, return E_NOK error */
    if ((TRUE == Crypto_43_HSE_aProcessJobServiceParams[(uint8)pJob->jobPrimitiveInfo->primitiveInfo->service].bSingleCallOnly)
    &&  (CRYPTO_OPERATIONMODE_SINGLECALL != pJob->jobPrimitiveInputOutput.mode))
    {
        eRetVal = CRYPTO_43_HSE_NO_DET_RET_NOK;
    }
    else
    {
#if ((STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) && (STD_OFF == CRYPTO_43_HSE_DEV_ERROR_DETECT))
        eRetVal = Crypto_43_HSE_CheckForContextErrorDetOff(u32ObjectIdx, pJob);

        if (CRYPTO_43_HSE_NO_DET_RET_OK == eRetVal)
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) && (STD_OFF == CRYPTO_43_HSE_DEV_ERROR_DETECT)) */
        {
            eRetVal = Crypto_43_HSE_GetJobErrorForInputPtr(pJob);

            if (CRYPTO_43_HSE_NO_DET_RET_OK == eRetVal)
            {
                eRetVal = Crypto_43_HSE_GetJobErrorForSecondaryInputPtr(pJob);

                if (CRYPTO_43_HSE_NO_DET_RET_OK == eRetVal)
                {
                    eRetVal = Crypto_43_HSE_GetJobErrorForTertiaryInputPtr(pJob);

                    if (CRYPTO_43_HSE_NO_DET_RET_OK == eRetVal)
                    {
                        eRetVal = Crypto_43_HSE_GetJobErrorForOutAndVerifyPtrs(pJob);
                    }
                }
            }
        }
    }
    return eRetVal;

}

#if (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT)
#if (STD_OFF == CRYPTO_43_HSE_DEV_ERROR_DETECT)
/**
* @brief           Save/Restore Context conditions
* @details         Verify if Save/Restore Context conditions are fulfilled, when DET is off
*
* @param[in]       pJob          - Pointer to the configuration of the job. Contains structures with job and primitive relevant information but also pointer to result buffers.
* @param[in]       u32ObjectIdx  - Idx of the Crypto Driver Object.
*
* @return          E_OK:     Request successful
*                  E_NOT_OK: Request failed
*
* @pre
*
*/
static inline Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_CheckForContextErrorDetOff
(
    const uint32          u32ObjectIdx,
    const Crypto_JobType* const pJob
)
{
    /* Local variables */
    const Crypto_PrimitiveInfoType*                 pJobPrimitiveInfo;
    uint32                                          u32Counter;
    const Crypto_43_HSE_PrimitiveType* pCryptoKeyPrimitive;
    Crypto_43_HSE_ProcessJobErrorType  eRetVal = CRYPTO_43_HSE_NO_DET_RET_OK;
    const Crypto_OperationModeType                  eOpMode = pJob->jobPrimitiveInputOutput.mode;
    const uint32                                    u32MaxStreamContextSize = CRYPTO_43_HSE_IPW_MAX_STREAMING_CONTEXT_SIZE;

    /* In case Dev Error Detection is set to off, the mandatory check for SWS_Crypto_00228 will be performed here */
    /* SWS_Crypto_00228: If job->jobPrimitiveInputOutput->mode is set to CRYPTO_OPERATIONMODE_SAVE_CONTEXT or CRYPTO_OPERATIONMODE_RESTORE_CONTEXT the crypto driver shall check if CryptoPrimitiveSupportContext is set to TRUE.
     * If not, the function shall return E_NOT_OK.
     */
    if((CRYPTO_OPERATIONMODE_SAVE_CONTEXT == eOpMode) || (CRYPTO_OPERATIONMODE_RESTORE_CONTEXT == eOpMode))
    {
        /* Context related operation mode detected, reset eRetVal */
        eRetVal = CRYPTO_43_HSE_NO_DET_RET_NOK;
        /* For ease of use */
        pJobPrimitiveInfo = pJob->jobPrimitiveInfo->primitiveInfo;

        /* Cycle through the primitives */
        for(u32Counter = 0U; u32Counter < Crypto_43_HSE_aDriverObjectList[u32ObjectIdx].u32NoCryptoPrimitives; u32Counter++)
        {
            /* Pointer used for ease of access */
            pCryptoKeyPrimitive = &Crypto_43_HSE_aDriverObjectList[u32ObjectIdx].pCryptoKeyPrimitives[u32Counter];

            /* Check if the job primitive information matches the key primitive one */
            if((pJobPrimitiveInfo->service                          == pCryptoKeyPrimitive->eService )             && \
               ((uint8)pJobPrimitiveInfo->algorithm.family          == pCryptoKeyPrimitive->u8AlgoFamily)          && \
               ((uint8)pJobPrimitiveInfo->algorithm.mode            == pCryptoKeyPrimitive->u8AlgoMode)            && \
               ((uint8)pJobPrimitiveInfo->algorithm.secondaryFamily == pCryptoKeyPrimitive->u8SecondaryAlgoFamily))
            {
                /* Check if the CryptoPrimitiveSupportContext was enabled from configuration */
                if(TRUE == pCryptoKeyPrimitive->bPrimitiveSupportContext)
                {
                    /* Requirement SWS_Crypto_00228 conditions fulfilled, PrimitiveSupportContext is enabled, now check for SWS_Crypto_00229 */
                    /* SWS_Crypto_00229: If job->jobPrimitiveInputOutput->mode is set to CRYPTO_OPERATIONMODE_SAVE_CONTEXT the crypto driver is called, then first the length of job->outputPtr provided with job->outputLengthPtr shall be
                     * checked if all context relevant data can be stored. If not, the function shall return E_NOT_OK.
                     */
                    if(CRYPTO_OPERATIONMODE_SAVE_CONTEXT == eOpMode)
                    {
                        /* Check if the output can hold the context relevant data that will be provided by HSE */
                        if(*(pJob->jobPrimitiveInputOutput.outputLengthPtr) >= u32MaxStreamContextSize)
                        {
                            eRetVal = CRYPTO_43_HSE_NO_DET_RET_OK;
                        }
                        /* If not, the operation cannot succeed, eRetVal already has CRYPTO_43_HSE_NO_DET_RET_NOK */
                    }
                    /* SWS_Crypto_00231: Operation mode is CRYPTO_OPERATIONMODE_RESTORE_CONTEXT, check if the length of the provided context data can be used by the HSE */
                    else if(pJob->jobPrimitiveInputOutput.inputLength <= u32MaxStreamContextSize)
                    {
                        eRetVal = CRYPTO_43_HSE_NO_DET_RET_OK;
                    }
                    /* If not, the operation cannot succeed, eRetVal already has CRYPTO_43_HSE_NO_DET_RET_NOK */
                    else
                    {
                        /* Nothing to do */
                    }
                }
                else
                {
                    /* PrimitiveSupportContext is not enabled - Nothing to do, eRetVal already has E_NOT_OK */
                }

                /* Primitive found, whatever the result, break the loop */
                break;
            }
            /* Information discrepancy, no match was found, eRetVal already has E_NOT_OK */
        }
    }
    else
    {
        /* No Context related operation mode set, no Context checks to be performed. eRetVal is initialized with CRYPTO_43_HSE_NO_DET_RET_OK,
           Therefore it will return CRYPTO_43_HSE_NO_DET_RET_OK */
    }


    return eRetVal;
}
#endif /* (STD_OFF == CRYPTO_43_HSE_DEV_ERROR_DETECT) */

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
/**
* @brief           Save/Restore Context conditions
* @details         Verify if Save/Restore Context conditions are fulfilled, when DET is on
*
* @param[in]       pJob - Pointer to the configuration of the job. Contains structures with job and primitive relevant information but also pointer to result buffers.
* @param[in]       bPrimitiveSupportContext - used to signal if configured primitive has support for context saving/restoring
*
* @return          E_OK:     Request successful
*                  E_NOT_OK: Request failed
*
* @pre
*
*/
static inline Std_ReturnType Crypto_43_HSE_CheckForContextErrorDetOn
(
    const Crypto_JobType* const pJob,
    const boolean               bPrimitiveSupportContext
)
{
    /* Local variables */
    Std_ReturnType                 RetVal  = (Std_ReturnType)E_NOT_OK;
    const Crypto_OperationModeType eOpMode = pJob->jobPrimitiveInputOutput.mode;
    const uint32 u32MaxStreamContxtSize    = CRYPTO_43_HSE_IPW_MAX_STREAMING_CONTEXT_SIZE;

    /* SWS_Crypto_00228: If job->jobPrimitiveInputOutput->mode is set to CRYPTO_OPERATIONMODE_SAVE_CONTEXT or CRYPTO_OPERATIONMODE_RESTORE_CONTEXT the crypto driver shall check if CryptoPrimitiveSupportContext is set to TRUE.
     * If not, the function shall return E_NOT_OK.
     */
    if((CRYPTO_OPERATIONMODE_SAVE_CONTEXT == eOpMode) || (CRYPTO_OPERATIONMODE_RESTORE_CONTEXT == eOpMode))
    {
        /* Check if the CryptoPrimitiveSupportContext was enabled from configuration */
        if(TRUE == bPrimitiveSupportContext)
        {
            /* Requirement conditions fulfilled for SWS_Crypto_00228, now check for SWS_Crypto_00229 */
            /* SWS_Crypto_00229: If job->jobPrimitiveInputOutput->mode is set to CRYPTO_OPERATIONMODE_SAVE_CONTEXT the crypto driver is called, then first the length of job->outputPtr provided with job->outputLengthPtr shall be
             * checked if all context relevant data can be stored. If not, the function shall return E_NOT_OK.
             */
            if(CRYPTO_OPERATIONMODE_SAVE_CONTEXT == eOpMode)
            {
                /* Check if the output can hold the context relevant data that will be provided by HSE */
                if(*(pJob->jobPrimitiveInputOutput.outputLengthPtr) >= u32MaxStreamContxtSize)
                {
                    RetVal = (Std_ReturnType)E_OK;
                }
                /* If not, the operation cannot succeed, RetVal already has E_NOT_OK */
            }
            /* SWS_Crypto_00231: Operation mode is CRYPTO_OPERATIONMODE_RESTORE_CONTEXT, check if the length of the provided context data can be used by HSE */
            else if(pJob->jobPrimitiveInputOutput.inputLength <= u32MaxStreamContxtSize)
            {
                RetVal = (Std_ReturnType)E_OK;
            }
            /* If not, the operation cannot succeed, RetVal already has E_NOT_OK */
            else
            {
                /* Nothing to do */
            }
        }
        else
        {
            /* PrimitiveSupportContext is not enabled - Nothing to do, RetVal already has E_NOT_OK */
        }
    }
    /* The other modes do not require any extra checks at this level */
    else
    {
        RetVal = (Std_ReturnType)E_OK;
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) */

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
/**
* @brief           Verify if a certain primitive is supported by a crypto driver object
* @details         Verify if a certain primitive is supported by a crypto driver object specified by u32objectIndex
*
* @param[in]       u32ObjectId - Holds the identifier of the Crypto Driver Object.
* @param[in]       pJob        - Pointer to the configuration of the job. Contains structures with job and primitive relevant information but also pointer to result buffers.
*
* @return          E_OK:     Request successful, primitive found
*                  E_NOT_OK: Request failed, primitive not found
*
* @pre
*
*/
static inline Std_ReturnType Crypto_43_HSE_VerifyPrimitive
(
    uint32                u32ObjectId,
    const Crypto_JobType* pJob
)
{
    Std_ReturnType                                  RetVal            = (Std_ReturnType)E_NOT_OK;
    const Crypto_PrimitiveInfoType*                 pJobPrimitiveInfo = pJob->jobPrimitiveInfo->primitiveInfo;
    uint32                                          u32Counter;
    const Crypto_43_HSE_PrimitiveType* pCryptoKeyPrimitive;

    /* Check if the service is not part of Key Management services */
    if(pJobPrimitiveInfo->service <= CRYPTO_RANDOMSEED)
    {
        /* Cycle through the primitives */
        for(u32Counter = 0U; u32Counter < Crypto_43_HSE_aDriverObjectList[u32ObjectId].u32NoCryptoPrimitives; u32Counter++)
        {
            /* Pointer used for ease of access */
            pCryptoKeyPrimitive = &Crypto_43_HSE_aDriverObjectList[u32ObjectId].pCryptoKeyPrimitives[u32Counter];

            /* Check if the job primitive information matches the key primitive one */
            if((pJobPrimitiveInfo->service                          == pCryptoKeyPrimitive->eService )             && \
               ((uint8)pJobPrimitiveInfo->algorithm.family          == pCryptoKeyPrimitive->u8AlgoFamily)          && \
               ((uint8)pJobPrimitiveInfo->algorithm.mode            == pCryptoKeyPrimitive->u8AlgoMode)            && \
               ((uint8)pJobPrimitiveInfo->algorithm.secondaryFamily == pCryptoKeyPrimitive->u8SecondaryAlgoFamily))
            {
#if (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT)
                /* Save/Restore Context related checks */
                RetVal = Crypto_43_HSE_CheckForContextErrorDetOn(pJob, pCryptoKeyPrimitive->bPrimitiveSupportContext);
#else
                RetVal = (Std_ReturnType)E_OK;
#endif
                /* Primitive found, whatever the result, break the loop */
                break;
            }
        }
    }
    /* Check if the service is within range of supported services */
    else if ((uint8)(pJobPrimitiveInfo->service) < CRYPTO_NUM_SUPPORTED_SERVICES_U8)
    {
        /* This is the case of the Key Management services accessible through Crypto_43_HSE_ProcessJob() API */
        RetVal = (Std_ReturnType)E_OK;
    }
    else
    {
        /* Do nothing */
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
/**
* @brief           Checks if call is done from a partition core and driver is initialized
* @details         Checks if call is done from a partition core and driver is initialized
*
* @param[in]       u32ObjectIdx    - Idx of the Crypto Driver Object
* @param[in]       u8ApiId         - Id of the caller API
* @param[in]       u32PartitionId  - Id of the partition the call is run on
*
* @return          E_OK:     Request successful
*                  E_NOT_OK: Request failed
*/
static Std_ReturnType Crypto_43_HSE_CheckValidCoreAndDrvInitForCdoApis
(
    const uint32 u32PartitionId,
    const uint32 u32ObjectIdx,
    const uint8  u8ApiId
)
{
    Std_ReturnType RetVal = (Std_ReturnType)E_NOT_OK;

#if (STD_ON == CRYPTO_43_HSE_ENABLE_MULTIPARTITION_SUPPORT)
    /* Check if the partition this call is coming from is valid */
    if (Crypto_43_HSE_aDriverObjectList[u32ObjectIdx].u32ValidPartitionId != u32PartitionId)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, u8ApiId, (uint8)CRYPTO_43_HSE_E_PARAM_CONFIG);
    }
    /* Check whether the Crypto driver is in CRYPTO_43_HSE_DRIVER_UNINIT state */
    else
#else
    /*Avoid compiler warnings*/
    (void)u32ObjectIdx;
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_MULTIPARTITION_SUPPORT) */
    {
        if (CRYPTO_43_HSE_DRIVER_UNINIT == Crypto_43_HSE_aeDriverState[u32PartitionId])
        {
            (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, u8ApiId, (uint8)CRYPTO_43_HSE_E_UNINIT);
        }
        else
        {
            RetVal = (Std_ReturnType)E_OK;
        }
    }

    return RetVal;
}

#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)) */

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)

/**
* @brief           Validates the parameters used by the Crypto_43_HSE_RandomSeed() API
* @details         Validates the parameters used by the Crypto_43_HSE_RandomSeed() API
*
* @param[in]       u32CryptoKeyIdx - Index of the Crypto key
*
* @return          E_OK:               Request successful
*                  E_NOT_OK:           Request failed
*                  CRYPTO_E_KEY_EMPTY: Key is empty
*/
static inline Std_ReturnType Crypto_43_HSE_GetNonDetErrorsForRandomSeed
(
    const uint32 u32CryptoKeyIdx
)
{
    Std_ReturnType RetVal                = (Std_ReturnType)E_NOT_OK;
    const uint32   u32CryptoSeedStateIdx = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_RANDOM_SEED_STATE);

    if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoSeedStateIdx)
    {
        RetVal = (Std_ReturnType)E_OK;
    }

    return RetVal;
}

#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE)
/**
* @brief           Validates the parameters used by the Crypto_43_HSE_KeyGenerate() API
* @details         Validates the parameters used by the Crypto_43_HSE_KeyGenerate() API
*
* @param[in]       u32CryptoKeyIdx - Index of the Crypto key
*
* @return          E_OK:               Request successful
*                  E_NOT_OK:           Request failed
*                  CRYPTO_E_KEY_EMPTY: Key is empty
*/
static Std_ReturnType Crypto_43_HSE_GetNonDetErrorsForKeyGenerate
(
    const uint32 u32CryptoKeyIdx
)
{
    Std_ReturnType RetVal                      = (Std_ReturnType)E_NOT_OK;
    const uint32   u32CryptoKeyElementIdx      = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);
    const uint32   u32AlgoFamKeyElemIdx        = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYGENERATE_ALGORITHM);
    const uint32   u32CryptoKeyBaseExchangeIdx = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYEXCHANGE_BASE);
    const uint32   u32CurveIdKeyElemIdx        = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_43_HSE_KE_KEYGENERATE_CURVETYPE);

    /* Request failed, source key element is uninitialized */
    if (
        ((CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyBaseExchangeIdx) && (0U == *Crypto_43_HSE_aKeyElementList[u32CryptoKeyBaseExchangeIdx].pu32CryptoElementActualSize)) || \
        ((CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CurveIdKeyElemIdx) && (0U == *Crypto_43_HSE_aKeyElementList[u32CurveIdKeyElemIdx].pu32CryptoElementActualSize)) || \
        ((CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32AlgoFamKeyElemIdx) && (0U == *Crypto_43_HSE_aKeyElementList[u32AlgoFamKeyElemIdx].pu32CryptoElementActualSize))
       )
    {
        RetVal = (Std_ReturnType)CRYPTO_E_KEY_EMPTY;
    }
    else if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyElementIdx)
    {
        RetVal = (Std_ReturnType)E_OK;
    }
    else
    {
        /* Do nothing*/
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE) */

#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE)
/**
* @brief           Validates the parameters used by the Crypto_43_HSE_KeyDerive() API
* @details         Validates the parameters used by the Crypto_43_HSE_KeyDerive() API
*
* @param[in]       u32CryptoKeyIdx       - Index of the Crypto key
* @param[in]       u32CryptoTargetKeyIdx - Index of the target Crypto key
*
* @return          E_OK:               Request successful
*                  E_NOT_OK:           Request failed
*                  CRYPTO_E_KEY_EMPTY: Key is empty
*/
static Std_ReturnType Crypto_43_HSE_GetNonDetErrorsForKeyDerive
(
    const uint32 u32CryptoKeyIdx,
    const uint32 u32CryptoTargetKeyIdx
)
{
#if (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)
    uint8          u8KeyDeriveAlgo;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2) */
    Std_ReturnType RetVal                      = (Std_ReturnType)E_OK;
    const uint32   u32PasswordKeyElemIdx       = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYDERIVATION_PASSWORD);
    const uint32   u32DerivAlgoKeyElemIdx      = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYDERIVATION_ALGORITHM);
    const uint32   u32DerivSaltKeyElemIdx      = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYDERIVATION_SALT);
#if (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)
    const uint32   u32DerivIterationKeyElemIdx = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYDERIVATION_ITERATIONS);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2) */
    const uint32   u32TargetPasswordKeyElemIdx = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoTargetKeyIdx, CRYPTO_KE_KEYDERIVATION_PASSWORD);
    const uint32   u32DerivSecondAlgoKeyElemIdx  = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_43_HSE_KE_KEYDERIVATION_ALGORITHM_SECONDARY);

    if ((CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32DerivSecondAlgoKeyElemIdx)  &&
        (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32PasswordKeyElemIdx)         &&
        (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32DerivAlgoKeyElemIdx)        &&
        (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32TargetPasswordKeyElemIdx)
       )
    {
#if (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)
        u8KeyDeriveAlgo = Crypto_43_HSE_aKeyElementList[u32DerivAlgoKeyElemIdx].pCryptoElementArray[CRYPTO_43_HSE_KEY_DERIVE_ALGORITHM_IDX];
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2) */

        if ((0U == *Crypto_43_HSE_aKeyElementList[u32PasswordKeyElemIdx].pu32CryptoElementActualSize))
        {
            if ((hseKeyType_t)HSE_KEY_TYPE_SHARED_SECRET == Crypto_43_HSE_aKeyElementList[u32PasswordKeyElemIdx].u8HseKeyType)
            {
                RetVal = (Std_ReturnType)E_OK;
            }
            else
            {
                /* Request failed, source key element is uninitialized */
                RetVal = (Std_ReturnType)CRYPTO_E_KEY_EMPTY;
            }
        }

#if (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)
        /* Since the  SharedInfo input parameter is optional for ANSI X9.63, there is no need to check it*/
        if ((CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 == u32DerivSaltKeyElemIdx) && ((uint8)CRYPTO_ALGOFAM_KDFX963 != u8KeyDeriveAlgo))
        {
            RetVal = (Std_ReturnType)E_NOT_OK;
        }
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2) */

#if (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)
        if (((Std_ReturnType)E_OK == RetVal) && ((uint8)CRYPTO_ALGOFAM_PBKDF2 == u8KeyDeriveAlgo))
        {
            if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 == u32DerivIterationKeyElemIdx)
            {
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2) */

        /* SWS_Crypto_00221: For Key Derivation, the source key shall have access rights of at least CRYPTO_RA_INTERNAL_COPY or lower.
         * The destination key shall have at least the access right of its source key or lower.
         * Only the key element with CRYPTO_KE_KEYDERIVATION_PASSWORD will be checked, since it is the only one interracting between keys.
         */
        if(((Std_ReturnType)E_OK == RetVal) &&
           ((Crypto_43_HSE_aKeyElementList[u32PasswordKeyElemIdx].eCryptoKeyElementReadAccess      > CRYPTO_43_HSE_RA_INTERNAL_COPY) ||
           (Crypto_43_HSE_aKeyElementList[u32TargetPasswordKeyElemIdx].eCryptoKeyElementReadAccess >  Crypto_43_HSE_aKeyElementList[u32PasswordKeyElemIdx].eCryptoKeyElementReadAccess)))
        {
            /* Conditions not met, one or all read access rights are not valid */
            RetVal = (Std_ReturnType)E_NOT_OK;
        }
        else
        {
            /* Nothing to do, either the conditions are met and RetVal already has E_OK or other error is present, which will not be overwritten */
        }
    }
    else
    {
        RetVal = (Std_ReturnType)E_NOT_OK;
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE) */

/**
* @brief           Validates the parameters used by the Crypto_43_HSE_KeyExchangeCalcPubVal() API
* @details         Validates the parameters used by the Crypto_43_HSE_KeyExchangeCalcPubVal() API
*
* @param[in]       u32CryptoKeyIdx          - Index of the Crypto key
* @param[in]       pu32PublicValueLengthPtr - Pointer to the length of the public key
*
* @return          E_OK:                                        Request successful
*                  E_NOT_OK:                                    Request failed
*                  CRYPTO_43_HSE_RET_SMALL_BUFFER: Buffer is too small
*/
static Std_ReturnType Crypto_43_HSE_GetNonDetErrorsForKeyExchCalcPubVal
(
    const uint32        u32CryptoKeyIdx,
    const uint32* const pu32PublicValueLengthPtr
)
{
    Std_ReturnType RetVal                 = (Std_ReturnType)E_NOT_OK;
    const uint32   u32CryptoKeyElementIdx = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYEXCHANGE_OWNPUBKEY);

    if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyElementIdx)
    {
        /* SWS_Crypto_00195: If a Crypto Driver API is called and any buffer addressed during the operation is too small, then the operation shall not be performed.
                             If development error detection for the Crypto Driver is enabled, then the API function shall report CRYPTO_E_SMALL_BUFFER to the DET, else return E_NOT_OK. */
        if (Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].u32CryptoKeyElementMaxSize > *pu32PublicValueLengthPtr)
        {
            RetVal = CRYPTO_43_HSE_RET_SMALL_BUFFER;
        }
        /* SWS_Crypto_00221: Any key element that is used to generate keys using Key Exchange operation shall have access rights of at least CRYPTO_RA_INTERNAL_COPY or lower */
        else if(Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementReadAccess <= CRYPTO_43_HSE_RA_INTERNAL_COPY)
        {
            /* Read access rights are correct */
            RetVal = (Std_ReturnType)E_OK;
        }
        else
        {
            /* Read access rights are not correct, RetVal already has E_NOT_OK stored */
        }
    }

    return RetVal;
}

/**
* @brief           Export public key.
* @details         Exports the public key from CRYPTO_KE_KEYEXCHANGE_OWNPUBKEY and place it in pu8PublicValuePtr.
*
* @param[in]       u32CryptoKeyIdx           - Index of the Crypto key
* @param[in]       pu8PublicValuePtr         - Pointer to location where public key will be stored
* @param[in]       pu32PublicValueLengthPtr  - Pointer to the length of the public key
* @param[in]       u32PartitionId            - Id of the partition the call is run on
*
* @return          E_OK         : Request successful.
*                  E_NOT_OK     : Request failed.
*                  CRYPTO_E_BUSY: Request failed, Crypro Driver Object is busy.
*/
static Std_ReturnType Crypto_43_HSE_CopyDataFromPubValKeyElementToUser
(
    const uint32  u32PartitionId,
    const uint32  u32CryptoKeyIdx,
#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT))
    uint8* const  pu8PublicValuePtr,
#else
    const uint8*  pu8PublicValuePtr,
#endif
#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_EXPORT))
    uint32* const pu32PublicValueLengthPtr
#else
    const uint32* const pu32PublicValueLengthPtr
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_EXPORT)) */
)
{
    Std_ReturnType RetVal                 = (Std_ReturnType)E_NOT_OK;
    const uint32   u32CryptoKeyElementIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_KE_KEYEXCHANGE_OWNPUBKEY);

    if ((CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyElementIdx))
    {
        /* Export the ECC public key that later will be used to generate shared secret */
        RetVal = Crypto_43_HSE_Ipw_ExportKey(u32PartitionId, u32CryptoKeyElementIdx, pu8PublicValuePtr, pu32PublicValueLengthPtr);
    }

    return RetVal;
}

/**
* @brief           Checks if there are errors that do not need to be reported to DET in the validation of parameters for Crypto_43_HSE_KeyExchangeCalcSecret() API
* @details         Checks if there are errors that do not need to be reported to DET in the validation of parameters for Crypto_43_HSE_KeyExchangeCalcSecret() API
*
* @param[in]       u32CryptoKeyIdx          - Index of the Crypto key
*
* @return          E_OK:               Request successful
*                  E_NOT_OK:           Request failed
*/
static Std_ReturnType Crypto_43_HSE_GetNonDetErrorsForKeyExchCalcSecret
(
    const uint32 u32CryptoKeyIdx
)
{
    Std_ReturnType RetVal                       = (Std_ReturnType)E_NOT_OK;
    const uint32   u32CryptoKeyElementPrivIdx   = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYEXCHANGE_PRIVKEY);
    const uint32   u32CryptoKeyElementPubIdx    = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYEXCHANGE_OWNPUBKEY);
    const uint32   u32CryptoKeyElementSharedIdx = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYEXCHANGE_SHAREDVALUE);

    if ((CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyElementPrivIdx) &&
       (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyElementPubIdx)  &&
       (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyElementSharedIdx)
       )
    {
        /*SWS_Crypto_00221: Any key element that is used to generate keys using Key Exchange operation shall have access rights of at least CRYPTO_RA_INTERNAL_COPY or lower.*/
        if((Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementPrivIdx].eCryptoKeyElementReadAccess   <= CRYPTO_43_HSE_RA_INTERNAL_COPY) &&
           (Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementPubIdx].eCryptoKeyElementReadAccess    <= CRYPTO_43_HSE_RA_INTERNAL_COPY) &&
           (Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementSharedIdx].eCryptoKeyElementReadAccess <= CRYPTO_43_HSE_RA_INTERNAL_COPY))
        {
            /* Read access rights are correct */
            RetVal = (Std_ReturnType)E_OK;
        }
        else
        {
            /* Read access rights are not correct, RetVal already has E_NOT_OK value */
        }
    }

    return RetVal;
}

#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT))
/**
* @brief           Checks if key elements used for redirection are valid
* @details         Checks if key elements used for input/output redirection have the correct R/W access rights
*
* @param[in]       u32CryptoKeyElementIdx - key element id
* @param[in]       eJobService            - Service used
* @param[in]       eRedirectionType       - Input/Output redirection
*
* @return          Result of the operation
* @retval          CRYPTO_43_HSE_NO_DET_RET_OK:            No error to report to DET, the function should return E_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOK:           No error to report to DET, the function should return E_NOT_OK
*/
static Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_CheckRedirectionRWAccessRights
(
    uint32                       u32CryptoKeyElementIdx,
    const Crypto_ServiceInfoType eJobService,
    const CRYPTO_43_HSE_RedirectionIOType eRedirectionType
)
{
    /* Local variables */
    Crypto_43_HSE_ProcessJobErrorType eRetVal = CRYPTO_43_HSE_NO_DET_RET_NOK;

    /* Check if the redirection type is input related */
    /* SWS_Crypto_00221: If a key element is used for input using the input re-direction, the key element must have access rights CRYPTO_RA_INTERNAL_COPY or lower */
    if(CRYPTO_43_HSE_INPUT_REDIRECT == eRedirectionType)
    {
        /* SWS_Crypto_00221: If input re-direction is used for CryptoPrimitiveService ENCRYPT/DECRYPT or AEAD_ENCRYPT/AEAD_DECRYPT, the access rights must be set to RA_ENCRYPTED or lower */
        if((eJobService >= CRYPTO_ENCRYPT) && (eJobService <= CRYPTO_AEADDECRYPT))
        {
            if(Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementReadAccess <= CRYPTO_43_HSE_RA_ENCRYPTED)
            {
                /* Key element has the correct read access rights*/
                eRetVal = CRYPTO_43_HSE_NO_DET_RET_OK;
            }
            else
            {
                /* Incorrect read access rights, eRetVal already has CRYPTO_43_HSE_NO_DET_RET_NOK value*/
            }
        }
        else
        {
            /* In this case, read access rights include RA_INTERNAL_COPY */
            if(Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementReadAccess <= CRYPTO_43_HSE_RA_INTERNAL_COPY)
            {
                /* Key element has the correct read access rights */
                eRetVal = CRYPTO_43_HSE_NO_DET_RET_OK;
            }
            else
            {
                /* Incorrect read access rights, eRetVal already has CRYPTO_43_HSE_NO_DET_RET_NOK value */
            }
        }
    }
    else
    {
        /* Output redirection is used */
        /* SWS_Crypto_00221: If a key element is used for output re-direction, the key element must have access rights CRYPTO_WA_INTERNAL_COPY or lower. */
        if(Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementWriteAccess <= CRYPTO_43_HSE_WA_INTERNAL_COPY)
        {
            /* Key element has the correct read access rights*/
            eRetVal = CRYPTO_43_HSE_NO_DET_RET_OK;
        }
        else
        {
            /* Incorrect read access rights, eRetVal already has CRYPTO_43_HSE_NO_DET_RET_NOK value*/
        }
    }

    return eRetVal;
}

/**
* @brief           Checks if redirection is configured
* @details         Checks redirection configuration based on key id and key element id
*
* @param[in]       u32RedirectedKeyId        - Input key id
* @param[in]       u32RedirectedKeyElementId - Input key element id
* @param[in]       eJobService               - Service used
* @param[in]       eRedirectionType          - Input/Output redirection
*
* @return          Result of the operation
* @retval          CRYPTO_43_HSE_NO_DET_RET_OK:            No error to report to DET, the function should return E_OK
* @retval          CRYPTO_43_HSE_NO_DET_RET_KEY_NOT_VALID: No error to report to DET, the function should return CRYPTO_E_KEY_NOT_VALID
* @retval          CRYPTO_43_HSE_NO_DET_RET_NOT_SUPPORTED: No error to report to DET, the function should return CRYPTO_43_HSE_E_NOT_SUPPORTED
* @retval          CRYPTO_43_HSE_DET_INVALID_PARAM:        CRYPTO_43_HSE_E_PARAM_HANDLE  should be reported to DET
*/
static Crypto_43_HSE_ProcessJobErrorType Crypto_43_HSE_CheckRedirectionConfig
(
    uint32                       u32RedirectedKeyId,
    uint32                       u32RedirectedKeyElementId,
    const Crypto_ServiceInfoType eJobService,
    const CRYPTO_43_HSE_RedirectionIOType eRedirectionType
)
{
    uint32                     u32CryptoKeyIdx;
    uint32                     u32CryptoKeyElementIdx;
    Crypto_43_HSE_ProcessJobErrorType eRetVal;

    if (CRYPTO_43_HSE_KEY_MATERIAL_U32 != u32RedirectedKeyElementId)
    {
        u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(u32RedirectedKeyId);

        if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
        {
            if((uint8)CRYPTO_KEYSTATUS_INVALID == *Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].KeyStatus)
            {
                eRetVal = CRYPTO_43_HSE_NO_DET_RET_KEY_NOT_VALID;
            }
            else
            {
                u32CryptoKeyElementIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, u32RedirectedKeyElementId);

                if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyElementIdx)
                {
                    /* Key element is used for redirection, check Read/Write Access rights of said element*/
                    eRetVal = Crypto_43_HSE_CheckRedirectionRWAccessRights(u32CryptoKeyElementIdx, eJobService, eRedirectionType);
                }
                else
                {   /* Key element is invalid */
                    eRetVal = CRYPTO_43_HSE_DET_INVALID_PARAM;
                }
            }
        }
        else
        {
             eRetVal = CRYPTO_43_HSE_DET_INVALID_PARAM;
        }
    }
    else
    {
        eRetVal = CRYPTO_43_HSE_NO_DET_RET_NOT_SUPPORTED;
    }

    return eRetVal;
}
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)) */

#if (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM)
/**
* @brief           Update Nvram with new key information
* @details         Update Nvram with new key information
*
* @param[in]       u32CryptoKeyIdx - Index of the Crypto key
* @param[in]       u8ServiceId     - Service Id of the caller
* @return          E_OK         : Request successful
*                  E_NOT_OK     : Request failed
*/
static Std_ReturnType Crypto_43_HSE_UpdateNvram
(
    const uint32 u32CryptoKeyIdx,
    const uint8  u8ServiceId
)
{
    Std_ReturnType RetVal;

    /* Remember Key Status value, to be restored after it is written not NvRAM and the status CRYPTO_KEYSTATUS_UPDATE_IN_PROGRESS is updated */
    Crypto_43_HSE_aNvBlockDescriptor[u32CryptoKeyIdx].CryptoKeyStatusCopy = (Crypto_KeyStatusType)*Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].KeyStatus;

    /* SWS_Crypto_00243: On KEYSETVALID operation, writing the data block to NVM will be initiated by a call of the crypto driver to NvM_SetRamBlockStatus().
       This is the typical operation when the configuration CryptoNvBlock/CryptoNvBlockProcessing is set to DEFERRED.
       If CryptoNvBlock/CryptoNvBlockProcessing is set to IMMEDIATE, the Crypto Driver will, besides the call to NvM_SetRamBlockStatus(),
       also call NvM_WriteBlock() immediately afterwards. This will trigger an immediate write of the NV RAM Block to non-volatile memory.
    */
    RetVal = NvM_SetRamBlockStatus(Crypto_43_HSE_aNvBlockDescriptor[u32CryptoKeyIdx].NvBlockId, TRUE);

    if (((Std_ReturnType)E_OK == RetVal) && (CRYPTO_43_HSE_NV_BLOCK_IMMEDIATE == Crypto_43_HSE_aNvBlockDescriptor[u32CryptoKeyIdx].NvBlockProcessing))
    {
        RetVal = NvM_WriteBlock(Crypto_43_HSE_aNvBlockDescriptor[u32CryptoKeyIdx].NvBlockId, Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].KeyStatus);
    }
    else
    {
        /* do nothing */
    }

    if ((Std_ReturnType)E_OK == RetVal)
    {
        /* SWS_Crypto_00245: If a key is currently updated in NV RAM Block and has not yet been written by NVM,
           then this shall be reflected in the key status with CRYPTO_KEYSTATUS_UPDATE_IN_PROGRESS through the Crypto_KeyGetStatus() interface.
        */
        *Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].KeyStatus = (uint8)CRYPTO_KEYSTATUS_UPDATE_IN_PROGRESS;
        (void)u8ServiceId;
    }
    else
    {
        /* SWS_Crypto_00244: If a call to an NVM service (NvM_SetRamBlockStatus() or NvM_WriteBlock()) returns with E_NOT_OK,
           or when the callback function Crypto_<vi>_<ai>_NvBlock_Callback_<NvBlock> (see [SWS_Crypto_91026]) indicates with Nvm_RequestResultType
           that the block write operation has failed, the runtime error CRYPTO_E_RE_NVM_ACCESS_FAILED shall be reported to the DET.
        */
        (void) Det_ReportRuntimeError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, u8ServiceId, (uint8)CRYPTO_43_HSE_E_RE_NVM_ACCESS_FAILED);
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM) */

/**
* @brief           Marks a key as valid
* @details         Marks a key as valid
*
* @param[in]       u32CryptoKeyIdx - Index of the Crypto key
* @param[in]       u8ServiceId     - Service Id of the caller
*
* @return          E_OK         : Request successful
*                  E_NOT_OK     : Request failed
*                  CRYPTO_43_HSE_E_BUSY: Request failed, Crypro Driver Object is busy.
*/
static Std_ReturnType Crypto_43_HSE_MarkKeyAsValid
(
    const uint32 u32CryptoKeyIdx,
    const uint8  u8ServiceId
)
{
    Std_ReturnType RetVal = (Std_ReturnType)E_OK;

    /* Set the key as being valid */
    *Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].KeyStatus = (uint8)CRYPTO_KEYSTATUS_VALID;
#if (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM)

    /* If blockId is 0, then the CryptoKey does not have a NvBlock referenced, and there is no update needed in Nvram*/
    if (0x00U != Crypto_43_HSE_aNvBlockDescriptor[u32CryptoKeyIdx].NvBlockId)
    {
        /* SWS_Crypto_00242: The storage of keys resp. their elements shall be initiated only when KEYSETVALID” is started, either by a call to Crypto_KeySetValid()
           or to Crypto_ProcessJob() with primitive service CRYPTO_KEYSETVALID or CRYPTO_KEYSETINVALID set.*/
        RetVal = Crypto_43_HSE_UpdateNvram(u32CryptoKeyIdx, u8ServiceId);
    }
    else
    {
        /* do nothing */
    }
#else
    /*Avoid compiler warnings*/
    (void)u8ServiceId;
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM) */

    return RetVal;
}

/**
* @brief           Marks a key as invalid
* @details         Marks a key as invalid
*
* @param[in]       u32CryptoKeyIdx - Index of the Crypto key
* @param[in]       u8ServiceId     - Service Id of the caller
*
* @return          E_OK         : Request successful
*                  E_NOT_OK     : Request failed
*                  CRYPTO_43_HSE_E_BUSY: Request failed, Crypro Driver Object is busy.
*/
static Std_ReturnType Crypto_43_HSE_MarkKeyAsInvalid
(
    const uint32 u32CryptoKeyIdx,
    const uint8  u8ServiceId
)
{
    Std_ReturnType RetVal = (Std_ReturnType)E_OK;

    /* Set the key as being invalid */
    *Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].KeyStatus = (uint8)CRYPTO_KEYSTATUS_INVALID;
#if (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM)
    /* If blockId is 0, then the CryptoKey does not have a NvBlock referenced, and there is no update needed in Nvram*/
    if (0x00U != Crypto_43_HSE_aNvBlockDescriptor[u32CryptoKeyIdx].NvBlockId)
    {
        /* SWS_Crypto_00242: The storage of keys resp. their elements shall be initiated only when KEYSETVALID” is started, either by a call to Crypto_KeySetValid()
           or to Crypto_ProcessJob() with primitive service CRYPTO_KEYSETVALID or CRYPTO_KEYSETINVALID set.*/
        RetVal = Crypto_43_HSE_UpdateNvram(u32CryptoKeyIdx, u8ServiceId);
    }
    else
    {
        /* do nothing */
    }
#else
    /*Avoid compiler warnings*/
    (void)u8ServiceId;
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM) */

    return RetVal;
}

#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
/**
* @brief            Check that the keys are valid for copying.
* @details          Check that the source key and target key are valid for copying.
*
* @param[in]        u32CryptoKeyIdx    Holds the identifier of the key whose key element shall be the source element
* @param[in]        u32TargetKeyIdx    Holds the identifier of the key whose key element shall be the destination element
*
* @return           Result of the operation
* @retval           E_OK                        Keys are valid for copying
* @retval           Other values of E_OK        Keys are not valid for copying
*
*
* @pre
*
*/
static Std_ReturnType Crypto_43_HSE_CheckKeyCopyValid
(
    uint32 u32CryptoKeyIdx,
    uint32 u32TargetKeyIdx
)
{
    Std_ReturnType RetVal = (Std_ReturnType)E_OK;
    uint32         u32Counter;
    boolean        bFound;

    for (u32Counter = 0U; u32Counter < Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].u32NumCryptoKeyElements; u32Counter++)
    {
        /* SWS_Crypto_00220: A source key must have at least the rights Crypto_43_HSE_RA_INTERNAL_COPY or lower to get copied */
        if (CRYPTO_43_HSE_RA_INTERNAL_COPY < Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32Counter]].eCryptoKeyElementReadAccess)
        {
            /* Request failed, key has an element with CRYPTO_43_HSE_RA_DENIED */
            RetVal = (Std_ReturnType)CRYPTO_E_KEY_READ_FAIL;
        }
        else if (0U == *Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32Counter]].pu32CryptoElementActualSize)
        {
            if ((hseKeyType_t)HSE_KEY_TYPE_SHARED_SECRET != Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32Counter]].u8HseKeyType)
            {
                RetVal = (Std_ReturnType)CRYPTO_E_KEY_EMPTY;
            }
        }
        else
        {
            /* Do nothing*/
        }
        bFound = FALSE;
        if ((Std_ReturnType)E_OK == RetVal)
        {
            RetVal = Crypto_43_HSE_CheckKeyCopyValidKeyElements(u32CryptoKeyIdx, u32Counter, u32TargetKeyIdx, &bFound);
        }
        /* If no compatible key element was found, return */
        if ((FALSE == bFound) && ((Std_ReturnType)E_OK == RetVal))
        {
            RetVal = (Std_ReturnType)E_NOT_OK;
        }
        /* If any errors occured, get out */
        if ((Std_ReturnType)E_OK != RetVal)
        {
            break;
        }
    }
    return RetVal;
}

/**
* @brief            Check that the keys elements are valid for copying.
* @details          Check that the source key elements and target key elements are valid for copying.
*
* @param[in]        u32CryptoKeyIdx         Holds the identifier of the key whose key element shall be the source element
* @param[in]        u32CryptoKeyElemIdx     Holds the identifier of the key elements in the source element that must be checked
* @param[in]        u32TargetKeyIdx         Holds the identifier of the key whose key element shall be the destination element
* @param[out]       pbFound                 Out variable used by the function to state that a match between key elements in source and destination keys has been found
*
* @return           Result of the operation
* @retval           E_OK                        Key elements are valid for copying
* @retval           Other values of E_OK        Key elements are not valid for copying
*
*
* @pre
*
*/
static Std_ReturnType Crypto_43_HSE_CheckKeyCopyValidKeyElements
(
    uint32   u32CryptoKeyIdx,
    uint32   u32CryptoKeyElemIdx,
    uint32   u32TargetKeyIdx,
    boolean* pbFound
)
{
    Std_ReturnType RetVal = (Std_ReturnType)E_OK;
    uint32         u32Counter;

    for (u32Counter = 0U; u32Counter < Crypto_43_HSE_aKeyList[u32TargetKeyIdx].u32NumCryptoKeyElements; u32Counter++)
    {
        if (Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32CryptoKeyElemIdx]].u32CryptoKeyElementId ==  \
            Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32TargetKeyIdx].pCryptoKeyElementList[u32Counter]].u32CryptoKeyElementId
            )
        {
            /* Key element matches */
            *pbFound = TRUE;
            /* Check if the found key element is valid for this type of operation */
            RetVal = Crypto_43_HSE_ExtraKeyCopyValidKEChecks(u32CryptoKeyIdx, u32CryptoKeyElemIdx, u32TargetKeyIdx, u32Counter);
        }
        /* Checking if an error was reported, if so exit the loop */
        if ((Std_ReturnType)E_OK != RetVal)
        {
            break;
        }
    }

    return RetVal;
}

/**
* @brief            Check that the keys elements are valid for copying.
* @details          Check that the source key elements and target key elements are valid for copying - extra checks.
*
* @param[in]        u32CryptoKeyIdx         Holds the identifier of the key whose key element shall be the source element
* @param[in]        u32CryptoKeyElemIdx     Holds the identifier of the key elements in the source element that must be checked
* @param[in]        u32TargetKeyIdx         Holds the identifier of the key whose key element shall be the destination element
* @param[in]        u32Index                Holds the value of the key element index
*
* @return           Result of the operation
* @retval           E_OK                        Key elements are valid for copying
* @retval           Other values of E_OK        Key elements are not valid for copying
*
*
* @pre
*
*/
static inline Std_ReturnType Crypto_43_HSE_ExtraKeyCopyValidKEChecks
(
    const uint32 u32CryptoKeyIdx,
    const uint32 u32CryptoKeyElemIdx,
    const uint32 u32TargetKeyIdx,
    const uint32 u32Index
)
{
    Std_ReturnType RetVal = (Std_ReturnType)E_OK;

    /* Check if the Target Key Element has the proper write access */
    if (CRYPTO_43_HSE_WA_DENIED == Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32TargetKeyIdx].pCryptoKeyElementList[u32Index]].eCryptoKeyElementWriteAccess)
    {
        /* Request failed, not allowed to write key element */
        RetVal = (Std_ReturnType)CRYPTO_E_KEY_WRITE_FAIL;
    }
    /* Check to see if the Source Key Element has at least the same rights as the Target Key Element */
    else if((Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32CryptoKeyElemIdx]].eCryptoKeyElementReadAccess <  \
                Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32TargetKeyIdx].pCryptoKeyElementList[u32Index]].eCryptoKeyElementReadAccess)  \
                ||  \
            (Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32CryptoKeyElemIdx]].eCryptoKeyElementWriteAccess <  \
                Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32TargetKeyIdx].pCryptoKeyElementList[u32Index]].eCryptoKeyElementWriteAccess))
            {
                /* Request failed, at least one access right is lower */
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
    else if (
                (*Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32CryptoKeyElemIdx]].pu32CryptoElementActualSize >  \
                Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32TargetKeyIdx].pCryptoKeyElementList[u32Index]].u32CryptoKeyElementMaxSize     \
                )    \
                || \
                (
                (*Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32CryptoKeyElemIdx]].pu32CryptoElementActualSize != \
                Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32TargetKeyIdx].pCryptoKeyElementList[u32Index]].u32CryptoKeyElementMaxSize) && \
                ((boolean)FALSE == Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32TargetKeyIdx].pCryptoKeyElementList[u32Index]].bCryptoKeyElementAllowPartialAccess)
                )
            )
    {
        RetVal = (Std_ReturnType)CRYPTO_E_KEY_SIZE_MISMATCH;
    }
    else if (
                (CRYPTO_43_HSE_KEY_MATERIAL_U32 == Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32CryptoKeyElemIdx]].u32CryptoKeyElementId)
                &&
                /* If the key element is key material feature is not supported because intermediary buffer is needed*/
                ((hseKeyType_t)HSE_KEY_TYPE_SHARED_SECRET != Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32CryptoKeyElemIdx]].u8HseKeyType)
            )
    {

            RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;

    }
    else
    {
        /* Do nothing */
    }

    return RetVal;
}

/**
* @brief            Check that the parameters and configuration are valid for copying.
* @details          Check that the Key Element Id, Target Key Element Id and Crypto Key Element configuration are valid for copying.
*
* @param[in]        u32CryptoKeyElementIdx          Holds the index of the Crypto Key Element who shall be the source element
* @param[in]        u32CryptoTargetKeyElementIdx    Holds the index of the Crypto Key Element who shall be the destination element
*
* @return           Result of the operation
* @retval           E_OK                        Crypto Key Elements are valid for copying
* @retval           Other values of E_OK        Crypto Key Elements are not valid for copying
*
*
* @pre
*
*/
static inline Std_ReturnType Crypto_43_HSE_CheckParamAndConfForKeyElementCopy
(
    const uint32 u32CryptoKeyElementIdx,
    const uint32 u32CryptoTargetKeyElementIdx
)
{
    Std_ReturnType RetVal;
    uint32         u32CryptoKeyElementActualSize;
    uint32         u32TargetKeyElementMaxSize;

    u32CryptoKeyElementActualSize = *Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pu32CryptoElementActualSize;
    u32TargetKeyElementMaxSize    = Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].u32CryptoKeyElementMaxSize;

    /* Request failed, not allowed to extract key element */
    if (CRYPTO_43_HSE_RA_DENIED == Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementReadAccess)
    {
        RetVal = (Std_ReturnType)CRYPTO_E_KEY_READ_FAIL;
    }
    /* Request failed, not allowed to write key element */
    else if (CRYPTO_43_HSE_WA_DENIED == Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].eCryptoKeyElementWriteAccess)
    {
        RetVal = (Std_ReturnType)CRYPTO_E_KEY_WRITE_FAIL;
    }
    /* Check to see if the Source Key Element has at least the same rights as the Target Key Element */
    else if((Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementReadAccess < Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].eCryptoKeyElementReadAccess) ||  \
            (Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementWriteAccess < Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].eCryptoKeyElementWriteAccess)  \
           )
    {
        /* Request failed, at least one access right is lower */
        RetVal = (Std_ReturnType)E_NOT_OK;
    }
    /* Incompatible sizes between key elements */
    else if ((u32CryptoKeyElementActualSize  > u32TargetKeyElementMaxSize) || \
            ((u32CryptoKeyElementActualSize != u32TargetKeyElementMaxSize) && ((boolean)FALSE == Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].bCryptoKeyElementAllowPartialAccess)))
    {
        RetVal = (Std_ReturnType)CRYPTO_E_KEY_SIZE_MISMATCH;
    }
    /* Request failed, source key element is uninitialized */
    else if (0U == u32CryptoKeyElementActualSize)
    {
        RetVal = (Std_ReturnType)CRYPTO_E_KEY_EMPTY;
    }
    else
    {
        RetVal = (Std_ReturnType)E_OK;
    }

    return RetVal;
}

/**
* @brief            Process copying of the Key Elemnt for function Crypto_43_HSE_KeyElementCopy
* @details          Process copying of the Key Elemnt for function Crypto_43_HSE_KeyElementCopy
*
* @param[in]        u32PartitionId                  Holds the Id of the current partition
* @param[in]        keyElementId                    Holds the identifier of the key element which shall be the source for the copy operation
* @param[in]        targetKeyElementId              Holds the identifier of the key element which shall be the destination for the copy operation
* @param[in]        u32TargetKeyIdx                 Holds the identifier of the key whose key element shall be the destination element
* @param[in]        u32CryptoKeyElementIdx          Holds the identifier of the key elements in the source element that must be checked
* @param[in]        u32CryptoTargetKeyElementIdx    Holds the index of the Crypto Key Element who shall be the destination element
*
* @return           Result of the operation
* @retval           E_OK                            Request successful
* @retval           E_NOT_OK                        Request failed
*
*
* @pre
*
*/
static inline Std_ReturnType Crypto_43_HSE_ProcessKeyElementCopy
(
    const uint32 keyElementId,
    const uint32 targetKeyElementId,
    const uint32 u32TargetKeyIdx,
    const uint32 u32CryptoKeyElementIdx,
    const uint32 u32CryptoTargetKeyElementIdx
)
{
    const uint32 u32PartitionId = Crypto_43_HSE_Util_GetPartitionId();
    Std_ReturnType RetVal       = (Std_ReturnType)E_OK;

    if (CRYPTO_43_HSE_KEY_MATERIAL_U32 != keyElementId)
    {
        /* If the key element is key material, send it to be stored */
        if (CRYPTO_43_HSE_KEY_MATERIAL_U32 == targetKeyElementId)
        {
            RetVal = Crypto_43_HSE_Ipw_ImportKey(u32PartitionId,
                                                                Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pCryptoElementArray,
                                                                *Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pu32CryptoElementActualSize,
                                                                u32TargetKeyIdx,
                                                                u32CryptoTargetKeyElementIdx
                                                                );
            /* If the key import was successful update the Crypto element actual size */
            if ((Std_ReturnType)E_OK == RetVal)
            {
                *Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].pu32CryptoElementActualSize = *Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pu32CryptoElementActualSize;
            }
            /* Check if the error should be reported to Det */
            if (RetVal >= CRYPTO_43_HSE_RET_OPERATION_TIMEOUT)
            {
                Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYELEMENTCOPY_ID, (uint8)RetVal);
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
        /* If the key element is different from key material (IV, seed) - store it */
        else
        {
            /* Check if the buffer of the destination keyElement is allocated inside Crypto driver or is allocated inside IP, case when it is a NULL pointer */
            if (NULL_PTR != Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].pCryptoElementArray)
            {
                Crypto_43_HSE_Util_MemCpy8(Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].pCryptoElementArray,
                                                        Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pCryptoElementArray,
                                                        *Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pu32CryptoElementActualSize
                                                        );
                /* Update the actual size of the target element to source element actual size  */
                *Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].pu32CryptoElementActualSize = *Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pu32CryptoElementActualSize;
                RetVal = (Std_ReturnType)E_OK;
            }
            else
            {
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
    }
    else
    {
        if (CRYPTO_43_HSE_KEY_MATERIAL_U32 != targetKeyElementId)
        {
            RetVal = Crypto_43_HSE_Ipw_ExportKey(u32PartitionId,
                                                                u32CryptoKeyElementIdx,
                                                                Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].pCryptoElementArray,
                                                                Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].pu32CryptoElementActualSize
                                                                );
            if (RetVal >= CRYPTO_43_HSE_RET_OPERATION_TIMEOUT)
            {
                Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYELEMENTCOPY_ID, (uint8)RetVal);
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
        else
        {
            /* Copying a key material in another key material is not allowed. */
            RetVal = (Std_ReturnType)E_NOT_OK;
        }
    }

    return RetVal;
}

/**
* @brief            Check that the parameters and configuration are valid for copying.
* @details          Check that the Key Element Id, Target KeyElement Id and Crypto Key Element configuration are valid for copying.
*
* @param[in]        u32CryptoKeyElementIdx          Holds the index of the Crypto Key Element who shall be the source element
* @param[in]        u32CryptoTargetKeyElementIdx    Holds the index of the Crypto Key Element who shall be the destination element
* @param[in]        u32KeyElementSourceOffset       This is the offset of the of the source key element indicating the start index of the copy operation.
* @param[in]        u32KeyElementTargetOffset       This is the offset of the of the target key element indicating the start index of the copy operation.
* @param[in]        u32KeyElementCopyLength         Specifies the number of bytes that shall be copied
*
* @return           Result of the operation
* @retval           E_OK                        Crypto Key Elements are valid for copying
* @retval           Other values of E_OK        Crypto Key Elements are not valid for copying
*
*
* @pre
*
*/
static inline Std_ReturnType Crypto_43_HSE_CheckParamAndConfForKeyElementCopyPartial
(
    const uint32 u32CryptoKeyElementIdx,
    const uint32 u32CryptoTargetKeyElementIdx,
    const uint32 u32KeyElementSourceOffset,
    const uint32 u32KeyElementTargetOffset,
    const uint32 u32KeyElementCopyLength
)
{
    Std_ReturnType RetVal;
    uint32         u32CryptoKeyElementMaxSize;
    uint32         u32TargetCryptoKeyElementMaxSize;
    uint32         u32CryptoKeyElementActualSize;

    u32CryptoKeyElementMaxSize          = Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].u32CryptoKeyElementMaxSize;
    u32TargetCryptoKeyElementMaxSize    = Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].u32CryptoKeyElementMaxSize;

    u32CryptoKeyElementActualSize = *Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pu32CryptoElementActualSize;

    /* Request failed, not allowed to extract key element */
    if (CRYPTO_43_HSE_RA_DENIED == Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementReadAccess)
    {
        RetVal = (Std_ReturnType)CRYPTO_E_KEY_READ_FAIL;
    }
    /* Request failed, not allowed to write key element */
    else if (CRYPTO_43_HSE_WA_DENIED == Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].eCryptoKeyElementWriteAccess)
    {
        RetVal = (Std_ReturnType)CRYPTO_E_KEY_WRITE_FAIL;
    }
    /* Check to see if the Source Key Element has at least the same rights as the Target Key Element */
    else if((Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementReadAccess < Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].eCryptoKeyElementReadAccess) || \
            (Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementWriteAccess < Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].eCryptoKeyElementWriteAccess)
           )
    {
        /*Request failed, at least one access right is lower*/
        RetVal = (Std_ReturnType)E_NOT_OK;
    }
    /* Incompatible sizes between key elements */
    else if ((u32CryptoKeyElementMaxSize < (uint32)(u32KeyElementSourceOffset + u32KeyElementCopyLength)) ||  \
                (u32TargetCryptoKeyElementMaxSize < (uint32)(u32KeyElementTargetOffset + u32KeyElementCopyLength))
            )
    {
        RetVal = (Std_ReturnType)CRYPTO_E_KEY_SIZE_MISMATCH;
    }
    /* Request failed, source key element is uninitialized */
    else if (0U == u32CryptoKeyElementActualSize)
    {
        RetVal = (Std_ReturnType)CRYPTO_E_KEY_EMPTY;
        if ((hseKeyType_t)HSE_KEY_TYPE_SHARED_SECRET == Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].u8HseKeyType)
        {
            RetVal = (Std_ReturnType)E_OK;
        }
    }
    else
    {
        RetVal = (Std_ReturnType)E_OK;
    }
    return RetVal;
}

/**
* @brief            Check that the parameters and configuration are valid.
* @details          Check that the parameters and configuration are valid for Crypto_43_HSE_KeyElementSet().
*
* @param[in]        u32PartitionId            Holds the Id of the current partition
* @param[in]        u32CryptoKeyIdx           Holds the index of the Crypto Key
* @param[in]        pu8Key                    Holds the pointer to the key data which shall be set as key element
* @param[in]        u32KeyLength              Holds the length of the key element in bytes
* @param[in]        u32KeyElementId           Holds the identifier of the key element which shall be set
* @param[out]       u32CryptoKeyElementIdx    Holds the index of the key element which shall be set
*
* @return           Result of the operation
* @retval           E_OK                        Service request is valid
* @retval           Other values of E_OK        Service request is not valid
*
*
* @pre
*
*/
static inline Std_ReturnType Crypto_43_HSE_CheckForErrorsInKeyElementSet
(
    const uint32 u32PartitionId,
    const uint8* pu8Key,
    uint32       u32KeyLength,
    const uint32 u32CryptoKeyElementIdx
)
{
    Std_ReturnType RetVal = (Std_ReturnType)E_NOT_OK;

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_KEYELEMENTSET_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If the parameter pu8Key is a null pointer and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementSet shall report CRYPTO_43_HSE_E_PARAM_POINTER to the DET
    and return E_NOT_OK. */
    else if (NULL_PTR == pu8Key)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTSET_ID, (uint8)CRYPTO_43_HSE_E_PARAM_POINTER);
    }
    /* If u32KeyLength is zero and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementSet shall report CRYPTO_43_HSE_E_PARAM_VALUE to the DET and return E_NOT_OK. */
    else if (0U == u32KeyLength)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTSET_ID, (uint8)CRYPTO_43_HSE_E_PARAM_VALUE);
    }
    else
#else
    /* Avoid compiler warnings */
    (void)u32PartitionId;
    (void)pu8Key;
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
        /* All verifications done until now have passed. Set RetVal to E_OK */
        RetVal = (Std_ReturnType)E_OK;

        /* SWS_Crypto_00223: The crypto driver shall only perform this operation if the element has the write access set to: */
        /* CRYPTO_43_HSE_WA_ALLOWED or CRYPTO_43_HSE_WA_ENCRYPTED */
        if(CRYPTO_43_HSE_WA_INTERNAL_COPY <= Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementWriteAccess)
        {
            /* Request failed because write access was denied(element set to WA_DENIED or WA_INTERNAL_COPY) */
            RetVal = (Std_ReturnType)CRYPTO_E_KEY_WRITE_FAIL;
        }
#if (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_IMPORT)
        else if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_SHEKEYS == Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyFormat)
        {
            /* For SHE keys we have some special cases:
                1. When Write Access is Encrypted, the key is written providing M1+M2+M3
                   Driver will check that the input is exactly 64 bytes length and the key element max size is larger or equal with 16 bytes
                2. When Write Access is ALLOWED or INTERNAL_COPY the key is written in plain (this is the case of RAM key)
                   Driver will check that the input is exactly 16 bytes length and the key element max size is larger or equal with 16 bytes */
            if (CRYPTO_43_HSE_WA_ENCRYPTED == Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementWriteAccess)
            {
                if ((CRYPTO_43_HSE_SHE_SIZE_IN_U32 != u32KeyLength) || (Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].u32CryptoKeyElementMaxSize < CRYPTO_43_HSE_SHE_KEY_SIZE_U32))
                {
                    RetVal = (Std_ReturnType)CRYPTO_E_KEY_SIZE_MISMATCH;
                }
            }
            else
            {
                if ((CRYPTO_43_HSE_SHE_KEY_SIZE_U32 != u32KeyLength) || (Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].u32CryptoKeyElementMaxSize < CRYPTO_43_HSE_SHE_KEY_SIZE_U32))
                {
                    RetVal = (Std_ReturnType)CRYPTO_E_KEY_SIZE_MISMATCH;
                }
            }
        }
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_IMPORT) */
        else if (((FALSE == Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].bCryptoKeyElementAllowPartialAccess) && (u32KeyLength < Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].u32CryptoKeyElementMaxSize)) ||
                 (u32KeyLength > Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].u32CryptoKeyElementMaxSize))
        {
            /* If u32KeyLength parameter of the function is smaller than the size of the key element and the key element is not configured to allow partial access
               or if is greater than the key length return CRYPTO_E_KEY_SIZE_MISMATCH  */
            RetVal = (Std_ReturnType)CRYPTO_E_KEY_SIZE_MISMATCH;
        }
        else
        {
            /* Do nothing */
        }
    }
    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

/**
* @brief            Check that the parameters and configuration are valid.
* @details          Check that the parameters and configuration are valid for Crypto_43_HSE_ProcessJob().
*
* @param[in]        u32PartitionId  Holds the Id of the current partition
* @param[in]        u32ObjectIdx    Holds the index of the Crypto Driver Object
* @param[in]        pJob            Pointer to the configuration of the job. Contains structures with job and primitive relevant information but also pointer to result buffers.
*
* @return           Result of the operation
* @retval           E_OK                        Service request is valid
* @retval           Other values of E_OK        Service request is not valid
*
*
* @pre
*
*/
static inline Std_ReturnType Crypto_43_HSE_CheckForErrorsInProcessJob
(
    const uint32          u32PartitionId,
    const uint32          u32ObjectIdx,
    const Crypto_JobType* pJob
)
{
    Std_ReturnType RetVal;
    Crypto_43_HSE_ProcessJobErrorType eProcessJobError;

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    RetVal = (Std_ReturnType)E_NOT_OK;
    /* Check validity of driver object. */
    if (CRYPTO_43_HSE_INVALID_CDO_IDX_U32 == u32ObjectIdx)
    {
        /* If the parameter u32ObjectId is out of range and if development error detection for the Crypto Driver is enabled,
           the function Crypto_43_HSE_ProcessJob shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET and return E_NOT_OK. */
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_PROCESSJOB_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    else if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForCdoApis(u32PartitionId, u32ObjectIdx, CRYPTO_43_HSE_PROCESSJOB_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForCdoApis() function */
    }
    else if (NULL_PTR == pJob)
    {
        /* If the parameter job is a null pointer and if development error detection for the Crypto Driver is enabled,
           the function Crypto_43_HSE_ProcessJob shall report CRYPTO_43_HSE_E_PARAM_POINTER to the DET and return E_NOT_OK. */
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_PROCESSJOB_ID, (uint8)CRYPTO_43_HSE_E_PARAM_POINTER);
    }
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    /* Check whether the cryptoKeyId is valid */
    else if (
             (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == Crypto_43_HSE_Util_GetKeyIdx(pJob->cryptoKeyId)) &&
             (CRYPTO_RANDOMGENERATE      != pJob->jobPrimitiveInfo->primitiveInfo->service)                                   &&
             (CRYPTO_HASH                != pJob->jobPrimitiveInfo->primitiveInfo->service)
            )
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_PROCESSJOB_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */
    /* If the parameter job->jobPrimitiveInfo->primitiveInfo->service is not supported by the Crypto Driver Object and
       if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_ProcessJob shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET and return E_NOT_OK */
    else if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_VerifyPrimitive(u32ObjectIdx, pJob))
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_PROCESSJOB_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    /* If a pointer is required as an argument, but it is a null pointer, the Crypto_43_HSE_ProcessJob() function shall report CRYPTO_43_HSE_E_PARAM_POINTER. */
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
        /* Based on the information in the job, check if there are other errors the function shall report and translate to standard return type */
#if ((STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) && (STD_OFF == CRYPTO_43_HSE_DEV_ERROR_DETECT))
        eProcessJobError = Crypto_43_HSE_GetProcessJobError(u32ObjectIdx, pJob);
#else
        eProcessJobError = Crypto_43_HSE_GetProcessJobError(pJob);
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) && (STD_OFF == CRYPTO_43_HSE_DEV_ERROR_DETECT)) */

        /* This function is needed in order to avoid HIS violation: counter greater than the applicable limit */
        RetVal = Crypto_43_HSE_CheckForErrorsInProcessJobStepII(eProcessJobError);
    }

#if (STD_OFF == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    /* Avoid compiler warnings */
    (void)u32PartitionId;
    (void)u32ObjectIdx;
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */

    return RetVal;
}

static inline Std_ReturnType Crypto_43_HSE_CheckForErrorsInProcessJobStepII
(
    const Crypto_43_HSE_ProcessJobErrorType eProcessJobError
)
{
    Std_ReturnType RetVal = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    if (CRYPTO_43_HSE_DET_NULL_PTR == eProcessJobError)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_PROCESSJOB_ID, (uint8)CRYPTO_43_HSE_E_PARAM_POINTER);
    }
    else if (CRYPTO_43_HSE_DET_INVALID_LEN == eProcessJobError)
    {
        /* If the value, which is pointed by a length pointer, is zero, and if development error detection for the Crypto Driver is enabled, the Crypto_43_HSE_ProcessJob() function report CRYPTO_43_HSE_E_PARAM_VALUE
        to the DET and return E_NOT_OK.
        If a length pointer is required as an argument, but the value, which is pointed by the length pointer is zero, and if development error detection for the Crypto Driver is enabled, the Crypto_43_HSE_ProcessJob() function
        report CRYPTO_43_HSE_E_PARAM_VALUE to the DET and return E_NOT_OK.    */
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_PROCESSJOB_ID, (uint8)CRYPTO_43_HSE_E_PARAM_VALUE);
    }
    else if (CRYPTO_43_HSE_DET_INVALID_PARAM == eProcessJobError)
    {
        /* Invalid DET param can only be reported by synchronous key management services using 2 parameters (cryptoKeyId and targetCryptoKeyId): Crypto_43_HSE_KeyDerive() */
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_PROCESSJOB_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
        if (CRYPTO_43_HSE_NO_DET_RET_KEY_NOT_VALID == eProcessJobError)
        {
            RetVal = (Std_ReturnType)CRYPTO_E_KEY_NOT_VALID;
        }
        else if (CRYPTO_43_HSE_NO_DET_RET_NOT_SUPPORTED == eProcessJobError)
        {
            RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;
        }
        else if (CRYPTO_43_HSE_NO_DET_RET_OK == eProcessJobError)
        {
            RetVal = (Std_ReturnType)E_OK;
        }
        else
        {
            /* We get here when the function Crypto_43_HSE_GetProcessJobError() returns either:
                1. CRYPTO_43_HSE_NO_DET_RET_NOK
                2. CRYPTO_43_HSE_DET_NULL_PTR or CRYPTO_43_HSE_DET_INVALID_LEN or CRYPTO_43_HSE_DET_INVALID_PARAM when DET is disabled
                In both case we should return E_NOT_OK. RetVal is already set to E_NOT_OK from the moment it was declared, so nothing else to do */
        }
    }

    return RetVal;
}

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
/**
* @brief            Process jobs at HLD level and check that the parameters are valid.
* @details          Some of the jobs will be proceesed only at HLD level. Checks the parameters validity of the configured job for Crypto_43_HSE_ProcessJob().
*
* @param[in]        pJob                     Pointer to the configuration of the job. Contains structures with job and primitive relevant information but also pointer to result buffers.
* @param[in]        u32PartitionId           Holds the Id of the current partition
* @param[inout]     pbJobProcessingComplete  Pointer to boolean variable storing the processing status.
*
* @return           Result of the operation
* @retval           E_OK                        Service request is valid
* @retval           Other values of E_OK        Service request is not valid
*
*
* @pre
*
*/
static inline Std_ReturnType Crypto_43_HSE_ProcessJobAndCheckNonDetErrors
(
    Crypto_JobType* pJob,
    const uint32    u32PartitionId,
    boolean*        pbJobProcessingComplete
)
{
    Std_ReturnType         RetVal                   = (Std_ReturnType)E_OK;
    Crypto_ServiceInfoType eJobService              = pJob->jobPrimitiveInfo->primitiveInfo->service;
    uint32                 u32CryptoKeyIdx;

    /*
     The following crypto services do not require a key as a key identifier:
     - CRYPTO_RANDOMGENERATE
     - CRYPTO_HASH
    */
    if((CRYPTO_RANDOMGENERATE != eJobService) && (CRYPTO_HASH != eJobService))
    {
        /* According with the Cryif requirements SWS_CryIf_00133 and SWS_CryIf_00142, the CryIf is responsible to always put the CryptoKeyId in the cryptoKeyId member of the job structure */
        u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(pJob->cryptoKeyId);

        if(((uint8)eJobService < (uint8)CRYPTO_RANDOMSEED) && (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx))
        {

            /* This is the case of Crypto services that are natively handled by Crypto_43_HSE_ProcessJob interface */
            RetVal = Crypto_43_HSE_VerifyKeyValidity(u32CryptoKeyIdx, eJobService);
        }
        else if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
        {
            RetVal = Crypto_43_HSE_ProcessJobAndCheckNonDetErrorsStepII(pJob, u32PartitionId, u32CryptoKeyIdx, pbJobProcessingComplete);
        }
        else
        {
            RetVal = (Std_ReturnType)E_NOT_OK;
        }
    }

    return RetVal;
}

static inline Std_ReturnType Crypto_43_HSE_ProcessJobAndCheckNonDetErrorsStepII
(
    Crypto_JobType* pJob,
    const uint32    u32PartitionId,
    const uint32    u32CryptoKeyIdx,
    boolean*        pbJobProcessingComplete
)
{

    Std_ReturnType         RetVal                   = (Std_ReturnType)E_OK;
    Crypto_ServiceInfoType eJobService              = pJob->jobPrimitiveInfo->primitiveInfo->service;
    boolean                bCheckForAsyncProcessing = FALSE;
    Crypto_ProcessingType  eProcessingType;
#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE)
    uint32          u32CryptoTargetKeyIdx;

    /* According with the Cryif requirement SWS_CryIf_00133, the CryIf is responsible to always put the TargetCryptoKeyId in the targetCryptoKeyId member of the job structure */
    u32CryptoTargetKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(pJob->targetCryptoKeyId);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE) */

    eProcessingType = pJob->jobPrimitiveInfo->processingType;

    /* These are the cases of synchronous key management API services that are required to work on Crypto_43_HSE_ProcessJob interface */
    switch (eJobService)
    {
        /* Need to check the validity of parameters that are not checked by DET */
        case CRYPTO_RANDOMSEED:
            RetVal = Crypto_43_HSE_GetNonDetErrorsForRandomSeed(u32CryptoKeyIdx);
            break;

#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE)
        case CRYPTO_KEYGENERATE:
            RetVal = Crypto_43_HSE_GetNonDetErrorsForKeyGenerate(u32CryptoKeyIdx);
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE) */

#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE)
        case CRYPTO_KEYDERIVE:
            if(CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoTargetKeyIdx)
            {
                RetVal = Crypto_43_HSE_GetNonDetErrorsForKeyDerive(u32CryptoKeyIdx, u32CryptoTargetKeyIdx);
            }
            else
            {
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE) */

        default:
            RetVal = Crypto_43_HSE_ProcessJobAndCheckNonDetErrorsStepIII(pJob, u32PartitionId, u32CryptoKeyIdx, pbJobProcessingComplete, &bCheckForAsyncProcessing);
            break;
    }

    /* Check if the process service has to be verified if it is Async or not */
    if(TRUE == bCheckForAsyncProcessing)
    {
        /* Check if the processing type is Async */
        if (CRYPTO_PROCESSING_ASYNC == eProcessingType)
        {
            /* Activate callback */
            CryIf_CallbackNotification(pJob, RetVal);
        }
        else
        {
            /* Nothing to do */
        }

        /* This job has been completely processed at HLD level. No need to call any IPW functionality */
        *pbJobProcessingComplete = TRUE;
    }
    else
    {
        /* Nothing to do */
    }

    return RetVal;
}

static inline Std_ReturnType Crypto_43_HSE_ProcessJobAndCheckNonDetErrorsStepIII
(
    const Crypto_JobType* pJob,
    const uint32          u32PartitionId,
    const uint32          u32CryptoKeyIdx,
    boolean*              pbJobProcessingComplete,
    boolean*              pbCheckForAsyncProcessing
)
{
    Std_ReturnType         RetVal                   = (Std_ReturnType)E_OK;
    Crypto_ServiceInfoType eJobService = pJob->jobPrimitiveInfo->primitiveInfo->service;

    /* These are the cases of synchronous key management API services that are required to work on Crypto_43_HSE_ProcessJob interface */
    switch(eJobService)
    {
        case CRYPTO_KEYEXCHANGECALCPUBVAL:
            RetVal = Crypto_43_HSE_GetNonDetErrorsForKeyExchCalcPubVal(u32CryptoKeyIdx, pJob->jobPrimitiveInputOutput.outputLengthPtr);

            /* Check to see if there are any errors resulted from the checks performed by the function above */
            if ((Std_ReturnType)E_OK == RetVal)
            {
                /* Call the case specific operation and activate the flag for further checks */
                RetVal = Crypto_43_HSE_CopyDataFromPubValKeyElementToUser(u32PartitionId, u32CryptoKeyIdx, pJob->jobPrimitiveInputOutput.outputPtr, pJob->jobPrimitiveInputOutput.outputLengthPtr);
                *pbCheckForAsyncProcessing = TRUE;
            }
            else
            {
                /* This job has been completely processed at HLD level. No need to call any IPW functionality */
                *pbJobProcessingComplete = TRUE;
            }
            break;

        case CRYPTO_KEYEXCHANGECALCSECRET:
            RetVal = Crypto_43_HSE_GetNonDetErrorsForKeyExchCalcSecret(u32CryptoKeyIdx);
            break;

        case CRYPTO_KEYSETVALID:
            /* Call the case specific operation and activate the flag for further checks */
            RetVal = Crypto_43_HSE_MarkKeyAsValid(u32CryptoKeyIdx, CRYPTO_43_HSE_PROCESSJOB_ID);
            *pbCheckForAsyncProcessing = TRUE;
            break;

        case CRYPTO_KEYSETINVALID:
            /* Call the case specific operation and activate the flag for further checks */
            RetVal = Crypto_43_HSE_MarkKeyAsInvalid(u32CryptoKeyIdx, CRYPTO_43_HSE_PROCESSJOB_ID);
            *pbCheckForAsyncProcessing = TRUE;
            break;
        default:
            /* Invalid service id. Return E_NOT_OK */
            RetVal = (Std_ReturnType)E_NOT_OK;
            break;
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
/**
* @brief           Reads the content of a non key material keyElement
* @details         Reads the content of a non key material keyElement
*
* @param[in]       u32PartitionId:           Id of the partition where this function is run
* @param[in]       u32CryptoKeyIdx:          Id of the key
* @param[in]       u32CryptoKeyElementId:    Id of the key element
* @param[in]       pResult:                  Location where the key element will be exported
* @param[inout]    pResultLength:            The length of the exported key element
*
* @returns         Std_ReturnType
*                   E_OK:                       Request successful
*                   E_NOT_OK:                   Request unsuccessful
*                   CRYPTO_E_KEY_EMPTY:         Key is empty
*/
static inline Std_ReturnType Crypto_43_HSE_GetNonKeyMaterialElement
(
    const uint32 u32PartitionId,
    const uint32 u32CryptoKeyIdx,
    const uint32 u32CryptoKeyElementId,
    uint8*       pResult,
    uint32*      pResultLength
)
{
    Std_ReturnType RetVal                 = (Std_ReturnType)E_NOT_OK;
    uint32         u32CryptoKeyElementIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, u32CryptoKeyElementId);

    /* Check if the u32CryptoKeyElementIdx is valid */
    if(CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyElementIdx)
    {
        {
#if (STD_ON == CRYPTO_43_HSE_ENABLE_FEED_HSE_DESC_SUPPORT)
            /* Check if we are in the special case of FEEDDE5C keyElementId */
            if (CRYPTO_KE_FEED_HSE_DESCRIPTOR_U32 == u32CryptoKeyElementId)
            {
                RetVal = Crypto_43_HSE_Ipw_FeedHseDescriptor(u32PartitionId,
                                                      pResult,
                                                      pResultLength);
            }
            else
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_FEED_HSE_DESC_SUPPORT) */
            {
                /* Request failed, source key element is uninitialized */
                if (0U < *Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pu32CryptoElementActualSize)
                {
                    /* If the KeyElement we are trying to read information from uses an IP key, it will not have a buffer reserved in the Crypto driver, so we would get into the situation where
                    we read information from address 0. Protect against this case */
                    if (NULL_PTR != Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pCryptoElementArray)
                    {
                        Crypto_43_HSE_Util_MemCpy8(pResult, Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pCryptoElementArray, *Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pu32CryptoElementActualSize);
                        /* When the request has finished, the amount of data that has been stored shall be stored. */
                        *pResultLength = *Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pu32CryptoElementActualSize;
                        RetVal = (Std_ReturnType)E_OK;
                    }
                    else
                    {
                        RetVal = (Std_ReturnType)E_NOT_OK;
                    }
                }
                else
                {
                    RetVal = (Std_ReturnType)CRYPTO_E_KEY_EMPTY;
                }

                /* Avoid compiler warnings */
                (void)u32PartitionId;
            }
        }
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


/*==================================================================================================
*                                        GLOBAL FUNCTIONS
==================================================================================================*/
/**
* @implements     Crypto_Init_Activity
*/
void Crypto_43_HSE_Init
(
    const Crypto_43_HSE_ConfigType* configPtr
)
{
   
    Std_ReturnType RetVal;

    const uint32   u32PartitionId = Crypto_43_HSE_Util_GetPartitionId();

#if ((STD_ON == CRYPTO_43_HSE_ENABLE_MULTIPARTITION_SUPPORT) && (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT))
    /* Check if the partition this call is coming from is authorized. There should be at least one Crypto Driver Object mapped on the partition, in order for the call to be valid */
    if (0U != Crypto_43_HSE_aPartitionToCdoMapping[u32PartitionId].u8NumCDOs)
    {
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_MULTIPARTITION_SUPPORT && STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
        /* Initialize the driver only if the driver was not already initialized */
        if (CRYPTO_43_HSE_DRIVER_UNINIT == Crypto_43_HSE_aeDriverState[u32PartitionId])
        {
            RetVal = Crypto_43_HSE_Ipw_Init(u32PartitionId);
            if ((Std_ReturnType)E_OK == RetVal)
            {
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM))

                /* [SWS_Crypto_00247] On initialization of the crypto driver, the callback function Crypto_<vi>_<ai>_NvBlock_ReadFrom_<NvBlock>() shall be called to retrieve the previously persisted key elements for the associated Keys.*/
                /* [SWS_Crypto_00248] On initialization, if an NvBlock could be read successfully and the internal consistency check of the NvBlock data was successful, all key elements of the referencing keys to this block shall be set with the value from the NV RAM Block data. */
                /* [SWS_Crypto_00249] On initialization, when reading an NvBlock for keys and the block is available but corrupted (driver internal data consistency check failed), all related keys shall be set to invalid. The length value of all associated key elements, where CryptoKeyElementPersist is set to TRUE, shall be set to 0 even if CryptoKeyElementInitValue is set for this key. */
                /* [SWS_Crypto_00250] If an NvBlock has no data, respectively the NvBlock is empty, key elements of all referenced keys, where CryptoKeyElementInitValue is set, shall use this configured init value (as if no key storage is configured for the key). */
                /* [SWS_Crypto_00251] After initialization of all key elements at startup (either with default or with persisted data), the crypto driver shall check all keys and its key elements if they are valid (at least one key element has a value). If so, the corresponding key shall be set to VALID state. */
                /* Try to restore from Nvram the information containing the values of the persistent Crypto Key Elements by interrogating HSE */
                /* After restoring data from NvM, interogate Hse */
                RetVal = Crypto_43_HSE_Ipw_RestoreKeyValidInfoFromNvram(u32PartitionId);
                if ((Std_ReturnType)E_OK == RetVal)
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM)) */
                {
                    /* Initialize queues used by the driver's CDOs */
                    Crypto_43_HSE_Util_InitJobQueues();
                    /* After initialization, the Crypto driver is in initialized state */
                    Crypto_43_HSE_aeDriverState[u32PartitionId] = CRYPTO_43_HSE_DRIVER_INITIALIZED;
                }
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM))
                else
                {
                    (void) Det_ReportRuntimeError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_INIT_ID, (uint8)CRYPTO_43_HSE_E_RE_NVRAM_OPERATION_FAIL);
                }
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) && (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM)) */
            }
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
            else
            {
                (void) Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_INIT_ID, (uint8)CRYPTO_43_HSE_E_INIT_FAILED);
            }
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
        }
#if ((STD_ON == CRYPTO_43_HSE_ENABLE_MULTIPARTITION_SUPPORT) && (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT))
    }
    else
    {
        (void) Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_INIT_ID, (uint8)CRYPTO_43_HSE_E_PARAM_CONFIG);
    }
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_MULTIPARTITION_SUPPORT && STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */


    /* Avoid compiler warnings */
    (void) configPtr;
}

#if (STD_ON == CRYPTO_43_HSE_VERSION_INFO_API)
/**
* @implements     Crypto_GetVersionInfo_Activity
*/
void Crypto_43_HSE_GetVersionInfo
(
    Std_VersionInfoType* versioninfo
)
{
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    if (NULL_PTR == versioninfo)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_GETVERSIONINFO_ID, (uint8)CRYPTO_43_HSE_E_PARAM_POINTER);
    }
    else
#endif /* STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT */
    {
        versioninfo->moduleID           = (uint16)CRYPTO_43_HSE_MODULE_ID;
        versioninfo->vendorID           = (uint16)CRYPTO_43_HSE_VENDOR_ID;
        versioninfo->sw_major_version   = (uint8)CRYPTO_43_HSE_SW_MAJOR_VERSION;
        versioninfo->sw_minor_version   = (uint8)CRYPTO_43_HSE_SW_MINOR_VERSION;
        versioninfo->sw_patch_version   = (uint8)CRYPTO_43_HSE_SW_PATCH_VERSION;
    }
}
#endif /* (STD_ON == CRYPTO_43_HSE_VERSION_INFO_API) */

/**
* @implements     Crypto_ProcessJob_Activity
*/
Std_ReturnType Crypto_43_HSE_ProcessJob
(
    uint32          objectId,
    Crypto_JobType* job
)
{
    const uint32               u32PartitionId = Crypto_43_HSE_Util_GetPartitionId();
    const uint32               u32ObjectIdx   = Crypto_43_HSE_Util_GetObjectIdx(objectId);
    Std_ReturnType             RetVal;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    boolean                    bJobProcessingComplete = FALSE;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

    /* Check validity of driver object. */
    if (CRYPTO_43_HSE_INVALID_CDO_IDX_U32 == u32ObjectIdx)
    {
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
        /* If the parameter u32ObjectId is out of range and if development error detection for the Crypto Driver is enabled,
           the function Crypto_43_HSE_ProcessJob shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET and return E_NOT_OK. */
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_PROCESSJOB_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
        RetVal = (Std_ReturnType)E_NOT_OK;
    }
    else
    {
        RetVal = Crypto_43_HSE_CheckForErrorsInProcessJob(u32PartitionId, u32ObjectIdx, job);
    }

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    if ((Std_ReturnType)E_OK == RetVal)
    {
        RetVal = Crypto_43_HSE_ProcessJobAndCheckNonDetErrors(job, u32PartitionId, &bJobProcessingComplete);
    }
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

    if (
        ((Std_ReturnType)E_OK == RetVal)
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
     && (FALSE == bJobProcessingComplete)
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */
       )
    {
        RetVal = Crypto_43_HSE_Ipw_ProcessJob(u32PartitionId, u32ObjectIdx, job);
    }

    if (RetVal >= CRYPTO_43_HSE_RET_OPERATION_TIMEOUT)
    {
        Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_PROCESSJOB_ID, (uint8)RetVal);
        RetVal = (Std_ReturnType)E_NOT_OK;
    }


    return RetVal;
}

/**
* @implements     Crypto_CancelJob_Activity
*/
Std_ReturnType Crypto_43_HSE_CancelJob
(
    uint32          objectId,
    Crypto_JobType* job
)
{
    const uint32   u32PartitionId = Crypto_43_HSE_Util_GetPartitionId();
    Std_ReturnType RetVal         = (Std_ReturnType)E_NOT_OK;
    uint32         u32ObjectIdx   = Crypto_43_HSE_Util_GetObjectIdx(objectId);

    /* Check validity of driver object. */
    if (CRYPTO_43_HSE_INVALID_CDO_IDX_U32 == u32ObjectIdx)
    {
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
        /* If development error detection for the Crypto Driver is enabled: The function Crypto_43_HSE_CancelJob shall raise the error CRYPTO_43_HSE_E_PARAM_HANDLE and return E_NOT_OK if the parameter u32ObjectId is out or range. */
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_CANCELJOB_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    }
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    else if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForCdoApis(u32PartitionId, u32ObjectIdx, CRYPTO_43_HSE_CANCELJOB_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForCdoApis() function */
    }
    /* If development error detection for the Crypto Driver is enabled: The function Crypto_43_HSE_CancelJob shall raise the error CRYPTO_43_HSE_E_PARAM_POINTER and return E_NOT_OK if the parameter job is a null pointer. */
    else if (NULL_PTR == job)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_CANCELJOB_ID, (uint8)CRYPTO_43_HSE_E_PARAM_POINTER);
    }
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    else
    {
        RetVal = Crypto_43_HSE_Ipw_CancelJob(u32PartitionId, u32ObjectIdx, job);
        if (RetVal >= CRYPTO_43_HSE_RET_OPERATION_TIMEOUT)
        {
            Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_CANCELJOB_ID, (uint8)RetVal);
            RetVal = (Std_ReturnType)E_NOT_OK;
        }
    }


    return RetVal;
}

/**
* @implements     Crypto_KeyElementSet_Activity
*/
Std_ReturnType Crypto_43_HSE_KeyElementSet
(
    uint32       cryptoKeyId,
    uint32       keyElementId,
    const uint8* keyPtr,
    uint32       keyLength
)
{
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    Std_ReturnType RetVal = E_NOT_OK;
    const uint32   u32PartitionId = Crypto_43_HSE_Util_GetPartitionId();
    uint32         u32CryptoKeyElementIdx = 0u;
    uint32         u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(cryptoKeyId);

    
    /*Check if the value is valid*/
    if(CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
    {
        u32CryptoKeyElementIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, keyElementId);
        
        /* If parameter u32KeyElementId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementSet shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
        and return E_NOT_OK. */
        if(CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyElementIdx)
        {
            RetVal = Crypto_43_HSE_CheckForErrorsInKeyElementSet(u32PartitionId, keyPtr, keyLength, u32CryptoKeyElementIdx);
        }
        else
        {
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
            /*If u32CryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_KeyElementSet shall report CRYPTO_E_PARAM_HANDLE to the DET
            and return E_NOT_OK.*/
           (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTSET_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
#endif /*STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT*/
        }
    }
    else
    {
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
        /*If u32CryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_KeyElementSet shall report CRYPTO_E_PARAM_HANDLE to the DET
        and return E_NOT_OK.*/
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTSET_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
#endif /*STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT*/
    }

    if ((Std_ReturnType)E_OK == RetVal)
    {
        /* If the key element is key material or partner's public key or second key material, send it to be stored */
        if ((CRYPTO_43_HSE_KEY_MATERIAL_U32 == keyElementId) || (CRYPTO_43_HSE_KE_KEYEXCHANGE_PARTNERPUBKEY == keyElementId) || (CRYPTO_KE_CIPHER_2NDKEY == keyElementId))
        {
            RetVal = Crypto_43_HSE_Ipw_ImportKey(u32PartitionId,
                                          keyPtr,
                                          keyLength,
                                          u32CryptoKeyIdx,
                                          u32CryptoKeyElementIdx
                                         );
            if (RetVal >= CRYPTO_43_HSE_RET_OPERATION_TIMEOUT)
            {
                Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYELEMENTSET_ID, (uint8)RetVal);
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
        /* If the key element is different from key material (IV, seed) - store it */
        else
        {
            /* If the key element pointed by u32CryptoKeyElementIdx is not key material but uses a IP key, it will not have memory allocated inside Crypto.
               We need to check this condition. */
            if (NULL_PTR != Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pCryptoElementArray)
            {
                Crypto_43_HSE_Util_MemCpy8(Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pCryptoElementArray, keyPtr, keyLength);
                RetVal = (Std_ReturnType)E_OK;
            }
            else
            {
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
        /* Store the actual size of the key element */
        if ((Std_ReturnType)E_OK == RetVal)
        {
#if (STD_ON == CRYPTO_43_HSE_SPT_SHE)
            if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_SHEKEYS == Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyFormat)
            {
                if (CRYPTO_43_HSE_WA_ENCRYPTED == Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementWriteAccess)
                {
                    *Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pu32CryptoElementActualSize = CRYPTO_43_HSE_SHE_KEY_SIZE_U32;
                }
                else
                {
                    /* This is the case of imported RAM key. Need to set it's actual length to sum of M1 to M3 because this the length that the upper layer
                    will get when exporting the RAM key */
                    *Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pu32CryptoElementActualSize = CRYPTO_43_HSE_SHE_SIZE_OUT_U32;
                }
            }
            else
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE) */
            {
                *Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pu32CryptoElementActualSize = keyLength;
            }
        }

        /* When the KeyElementSet is called, the key state is set to invalid */
        *Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].KeyStatus = (uint8)CRYPTO_KEYSTATUS_INVALID;
    }
#else
    Std_ReturnType RetVal = (Std_ReturnType)E_NOT_OK;
    (void) cryptoKeyId;
    (void) keyElementId;
    (void) keyPtr;
    (void) keyLength;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)*/


    return RetVal;
}

/**
* @implements     Crypto_KeyGetStatus_Activity
*/
Std_ReturnType Crypto_43_HSE_KeyGetStatus
(
    uint32                  cryptoKeyId,
    Crypto_KeyStatusType*   keyStatusPtr
)
{
    Std_ReturnType RetVal        = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    const uint32 u32PartitionId  = Crypto_43_HSE_Util_GetPartitionId();
    uint32       u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(cryptoKeyId);

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
     /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_KEYGETSTATUS_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If parameter cryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeySetValid shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET and return E_NOT_OK. */
    else if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32CryptoKeyIdx)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYGETSTATUS_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    /* If the parameter keyPtr is a null pointer and if development error detection for the Crypto Driver is enabled, the function Crypto_KeyGetStatus shall report CRYPTO_E_PARAM_POINTER to the DET and return E_NOT_OK */
    else if (NULL_PTR == keyStatusPtr)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYGETSTATUS_ID, (uint8)CRYPTO_43_HSE_E_PARAM_POINTER);
    }
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
        /*If no errors are detected by the Crypto Driver, the status of the key shall be placed into keyStatusPtr. If the key is in valid state, the value CRYPTO_KEYSTATUS_VALID shall be reported.*/
        *keyStatusPtr = (Crypto_KeyStatusType)*Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].KeyStatus;

        /* If the key is currently not valid, the status CRYPTO_KEYSTATUS_INVALID shall be reported*/
        if (
            (CRYPTO_KEYSTATUS_VALID == *keyStatusPtr) 
#if (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM)
         || (CRYPTO_KEYSTATUS_UPDATE_IN_PROGRESS == *keyStatusPtr)
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM) */        
           )
        {
            /* Check if valid key is available */
            RetVal = Crypto_43_HSE_Ipw_CheckKey(u32PartitionId, u32CryptoKeyIdx);

            /* Check if the request was processed. */
            if (((Std_ReturnType)CRYPTO_E_KEY_EMPTY == RetVal) || ((Std_ReturnType)CRYPTO_E_KEY_NOT_AVAILABLE == RetVal))
            {
                /* If the key is currently not valid, the status CRYPTO_KEYSTATUS_INVALID shall be reported and return value will be E_OK */
                *keyStatusPtr = CRYPTO_KEYSTATUS_INVALID;
                RetVal = (Std_ReturnType)E_OK;
            }
            else if((Std_ReturnType)E_OK != RetVal)
            {
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
            else
            {
                /* To avoid misra issue */
            }
        }
        else
        {
            RetVal = (Std_ReturnType)E_OK;
        }
    }
#else
    /* Avoid compiler warnings */
    (void) cryptoKeyId;
    (void) keyStatusPtr;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


    return RetVal;
}

/**
* @implements     Crypto_KeySetValid_Activity
*/
Std_ReturnType Crypto_43_HSE_KeySetValid
(
    uint32 cryptoKeyId
)
{
    Std_ReturnType RetVal        = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    const uint32 u32PartitionId  = Crypto_43_HSE_Util_GetPartitionId();
    const uint32 u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(cryptoKeyId);

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_KEYSETVALID_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If parameter cryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeySetValid shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
    and return E_NOT_OK. */
    else if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32CryptoKeyIdx)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYSETVALID_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {

        /*Check the validity of the key material*/
        RetVal = Crypto_43_HSE_Ipw_CheckKey(u32PartitionId, u32CryptoKeyIdx);
        /*If the key material is valid, proceed with the key marking*/
        if ((Std_ReturnType)E_OK  == RetVal)
        {
            RetVal = Crypto_43_HSE_MarkKeyAsValid(u32CryptoKeyIdx, CRYPTO_43_HSE_KEYSETVALID_ID);
        }
        else if ((Std_ReturnType)CRYPTO_E_BUSY != RetVal)
        {
            /* Return E_NOT_OK in case of all return types except E_OK and CRYPTO_E_BUSY */
            RetVal = (Std_ReturnType)E_NOT_OK;
        }
        else
        {
            /*Keep the received value for RetVal*/
        }
    }
#else
    /* Avoid compiler warnings */
    (void) cryptoKeyId;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


    return RetVal;
}

/**
* @implements     Crypto_KeySetInvalid_Activity
*/
Std_ReturnType Crypto_43_HSE_KeySetInvalid
(
    uint32 cryptoKeyId
)
{
    Std_ReturnType RetVal        = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    const uint32 u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(cryptoKeyId);

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    const uint32 u32PartitionId  = Crypto_43_HSE_Util_GetPartitionId();

    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_KEYSETINVALID_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If parameter cryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeySetInvalid shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
    and return E_NOT_OK. */
    else if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32CryptoKeyIdx)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYSETINVALID_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
        /* Proceed with the key marking, get the status of the operation */
        RetVal = Crypto_43_HSE_MarkKeyAsInvalid(u32CryptoKeyIdx, (uint8)CRYPTO_43_HSE_KEYSETINVALID_ID);
    }
#else
    /* Avoid compiler warnings */
    (void) cryptoKeyId;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


    return RetVal;
}

/**
* @implements     Crypto_KeyElementGet_Activity
*/
Std_ReturnType Crypto_43_HSE_KeyElementGet
(
    uint32  cryptoKeyId,
    uint32  keyElementId,
    uint8*  resultPtr,
    uint32* resultLengthPtr
)
{
    Std_ReturnType RetVal                    = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    const uint32   u32PartitionId            = Crypto_43_HSE_Util_GetPartitionId();
    uint32         u32CryptoKeyIdx           = Crypto_43_HSE_Util_GetKeyIdx_GetKeyElementIdx(cryptoKeyId, CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32, CRYPTO_1_GET_KEY_IDX_CALL);
    uint32         u32CryptoKeyElementIdx;

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_KEYELEMENTGET_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If parameter cryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeySetValid shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
    and return E_NOT_OK. */
    else if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32CryptoKeyIdx)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTGET_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    /* If the parameter resultPtr and/or resultLengthPtr is a null pointer and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementGet shall report
    CRYPTO_43_HSE_E_PARAM_POINTER the DET and return E_NOT_OK. */
    else if ((NULL_PTR == resultPtr) || (NULL_PTR == resultLengthPtr))
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTGET_ID, (uint8)CRYPTO_43_HSE_E_PARAM_POINTER);
    }
    /* If the value, which is pointed by resultLengthPtr is zero and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementGet shall report CRYPTO_43_HSE_E_PARAM_VALUE to
    the DET and return E_NOT_OK. */
    else if (0U == *resultLengthPtr)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTGET_ID, (uint8)CRYPTO_43_HSE_E_PARAM_VALUE);
    }
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
        /* If the parameter keyElementId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementGet shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
        and return E_NOT_OK. */
        u32CryptoKeyElementIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, keyElementId);

        if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyElementIdx)
        {
            /* SWS_Crypto_00222: The crypto driver shall only perform this operation if the KeyElementReadAccess is set to: */
            /* CRYPTO_43_HSE_RA_ALLOWED or CRYPTO_43_HSE_RA_ENCRYPTED */
            if(CRYPTO_43_HSE_RA_INTERNAL_COPY <= Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementReadAccess)
            {
                /* Request failed because read access was denied(element set to RA_DENIED or RA_INTERNAL_COPY) */
                RetVal = (Std_ReturnType)CRYPTO_E_KEY_READ_FAIL;
            }
            /* SWS_Crypto_00195: If a Crypto Driver API is called and any buffer addressed during the operation is too small, then the operation shall not be performed.
                                 If development error detection for the Crypto Driver is enabled, then the API function shall report CRYPTO_E_SMALL_BUFFER to the DET, else return E_NOT_OK. */
            else if (*resultLengthPtr < *Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pu32CryptoElementActualSize)
            {
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
                (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTGET_ID, (uint8)CRYPTO_43_HSE_E_SMALL_BUFFER);
#endif
            }
            else
            {
                /* If the key element is key material, retrieve the key */
                if (CRYPTO_43_HSE_KEY_MATERIAL_U32 == keyElementId)
                {
                    /* Export the key */
                    RetVal = Crypto_43_HSE_Ipw_ExportKey(u32PartitionId,
                                                u32CryptoKeyElementIdx,
                                                resultPtr,
                                                resultLengthPtr
                                                );
                    if (RetVal >= CRYPTO_43_HSE_RET_OPERATION_TIMEOUT)
                    {
                        Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYELEMENTGET_ID, (uint8)RetVal);
                        RetVal = (Std_ReturnType)E_NOT_OK;
                    }
                }
                /* If the key element is different from key material (IV, seed) */
                else
                {
                    RetVal = Crypto_43_HSE_GetNonKeyMaterialElement(u32PartitionId,
                                                             u32CryptoKeyIdx,
                                                             keyElementId,
                                                             resultPtr,
                                                             resultLengthPtr
                                                            );
                }
            }
        }
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
        else
        {
            (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTGET_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
        }
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    }

#else
    /* Avoid compiler warnings */
    (void) cryptoKeyId;
    (void) keyElementId;
    (void) resultPtr;
    (void) resultLengthPtr;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


    return RetVal;
}

/**
* @implements     Crypto_KeyElementCopy_Activity
*/
Std_ReturnType Crypto_43_HSE_KeyElementCopy
(
    uint32 cryptoKeyId,
    uint32 keyElementId,
    uint32 targetCryptoKeyId,
    uint32 targetKeyElementId
)
{
    Std_ReturnType RetVal          = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    uint32         u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(cryptoKeyId);
    uint32         u32TargetKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(targetCryptoKeyId);
    uint32         u32CryptoKeyElementIdx;
    uint32         u32CryptoTargetKeyElementIdx;
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    const uint32   u32PartitionId  = Crypto_43_HSE_Util_GetPartitionId();

    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_KEYELEMENTCOPY_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If parameter cryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementCopy shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
    and return E_NOT_OK. */
    /* If parameter targetCryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementCopy shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
    and return E_NOT_OK. */
    else if ((CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32CryptoKeyIdx) || (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32TargetKeyIdx))
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTCOPY_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
        /* If parameter keyElementId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementCopy shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
        and return E_NOT_OK. */
        /* If parameter targetKeyElementId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementCopy shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
        and return E_NOT_OK. */
        u32CryptoKeyElementIdx       = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx,       keyElementId);
        u32CryptoTargetKeyElementIdx = Crypto_43_HSE_Util_GetKeyElementIdx(u32TargetKeyIdx, targetKeyElementId);

        if ((CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyElementIdx) && (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoTargetKeyElementIdx))
        {
            RetVal = Crypto_43_HSE_CheckParamAndConfForKeyElementCopy(u32CryptoKeyElementIdx, u32CryptoTargetKeyElementIdx);
        }
        else
        {
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
            (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTCOPY_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
        }

        if ((Std_ReturnType)E_OK == RetVal)
        {
            RetVal = Crypto_43_HSE_ProcessKeyElementCopy(keyElementId, targetKeyElementId, u32TargetKeyIdx, u32CryptoKeyElementIdx, u32CryptoTargetKeyElementIdx);
        }
        else
        {
           /* Nothing to do. Function has failed validation. */
        }
    }
#else
    /* Avoid compiler warnings */
    (void) cryptoKeyId;
    (void) keyElementId;
    (void) targetCryptoKeyId;
    (void) targetKeyElementId;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


    return RetVal;
}

/**
* @implements     Crypto_KeyElementCopyPartial_Activity
*/
Std_ReturnType Crypto_43_HSE_KeyElementCopyPartial
(
    uint32 cryptoKeyId,
    uint32 keyElementId,
    uint32 keyElementSourceOffset,
    uint32 keyElementTargetOffset,
    uint32 keyElementCopyLength,
    uint32 targetCryptoKeyId,
    uint32 targetKeyElementId
)
{
    Std_ReturnType RetVal          = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    const uint32   u32PartitionId  = Crypto_43_HSE_Util_GetPartitionId();
    uint32         u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx_GetKeyElementIdx(cryptoKeyId, CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32, CRYPTO_1_GET_KEY_IDX_CALL);
    uint32         u32TargetKeyIdx = Crypto_43_HSE_Util_GetKeyIdx_GetKeyElementIdx(targetCryptoKeyId, CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32, CRYPTO_1_GET_KEY_IDX_CALL);
    uint32         u32CryptoKeyElementIdx;
    uint32         u32CryptoTargetKeyElementIdx;
    uint32         u32TargetCryptoKeyElementActualSize;
    const uint8*   pCryptoSourceElementArray;
    uint8*         pCryptoTargetElementArray;
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)

    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_KEYELEMENTCOPYPARTIAL_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If parameter cryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementCopyPartial shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
    and return E_NOT_OK. */
    /* If parameter targetCryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementCopyPartial shall report CRYPTO_43_HSE_E_PARAM_HANDLE to
    the DET and return E_NOT_OK. */
    else if ((CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32CryptoKeyIdx) || (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32TargetKeyIdx))
    {
        Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYELEMENTCOPYPARTIAL_ID, CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
        /* If parameter keyElementId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementCopyPartial shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
        and return E_NOT_OK. */
        /* If parameter targetKeyElementId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementCopyPartial shall report CRYPTO_43_HSE_E_PARAM_HANDLE to
        the DET and return E_NOT_OK. */
        (void)u32PartitionId;
        u32CryptoKeyElementIdx       = Crypto_43_HSE_Util_GetKeyIdx_GetKeyElementIdx (u32CryptoKeyIdx, keyElementId, CRYPTO_0_GET_KEY_ELEMENT_IDX_CALL);   
        u32CryptoTargetKeyElementIdx = Crypto_43_HSE_Util_GetKeyIdx_GetKeyElementIdx (u32TargetKeyIdx, targetKeyElementId, CRYPTO_0_GET_KEY_ELEMENT_IDX_CALL);

        if ((CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyElementIdx) && (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoTargetKeyElementIdx))
        {
            RetVal = Crypto_43_HSE_CheckParamAndConfForKeyElementCopyPartial(u32CryptoKeyElementIdx, u32CryptoTargetKeyElementIdx, keyElementSourceOffset, keyElementTargetOffset, keyElementCopyLength);
        }
        else
        {
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
            Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYELEMENTCOPYPARTIAL_ID, CRYPTO_43_HSE_E_PARAM_HANDLE);
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
        }
        if ((Std_ReturnType)E_OK == RetVal)
        {
            u32TargetCryptoKeyElementActualSize = *Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].pu32CryptoElementActualSize;

            pCryptoSourceElementArray = Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].pCryptoElementArray;
            pCryptoTargetElementArray = Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].pCryptoElementArray;

            /* This case is used for non Key material to non key material keys */
            if ((CRYPTO_43_HSE_KEY_MATERIAL_U32 != keyElementId) && (CRYPTO_43_HSE_KEY_MATERIAL_U32 != targetKeyElementId))
            {
                Crypto_43_HSE_Util_MemCpy8(&pCryptoTargetElementArray[keyElementTargetOffset], &pCryptoSourceElementArray[keyElementSourceOffset], keyElementCopyLength);

                if (u32TargetCryptoKeyElementActualSize < (uint32)(keyElementTargetOffset + keyElementCopyLength))
                {
                    *Crypto_43_HSE_aKeyElementList[u32CryptoTargetKeyElementIdx].pu32CryptoElementActualSize = (uint32)(keyElementTargetOffset + keyElementCopyLength);
                }

                RetVal = (Std_ReturnType)E_OK;
            }
            /* This case is used for Shared Secret source key type */
            else if ((CRYPTO_43_HSE_KEY_MATERIAL_U32 == keyElementId) && (CRYPTO_43_HSE_KEY_MATERIAL_U32 == targetKeyElementId))
            {
                if ((hseKeyType_t)HSE_KEY_TYPE_SHARED_SECRET == Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].u8HseKeyType)
                {
                    /*  Extract/Move the specified length starting from specified offset from source key element(key material) to target source element(key material) */
                    RetVal = Crypto_43_HSE_Ipw_KeyDeriveExtract(u32PartitionId, u32CryptoKeyElementIdx, u32CryptoTargetKeyElementIdx,keyElementSourceOffset, keyElementCopyLength);
                    if (RetVal >= CRYPTO_43_HSE_RET_OPERATION_TIMEOUT)
                    {
                        Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYELEMENTCOPYPARTIAL_ID, (uint8)RetVal);
                        RetVal = (Std_ReturnType)E_NOT_OK;
                    }
                }
                else
                {
                    RetVal = (Std_ReturnType)E_NOT_OK;
                }
            }
            else
            {
                Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYELEMENTCOPYPARTIAL_ID, CRYPTO_43_HSE_RET_NOT_SUPPORTED);
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
    }
#else
    /* Avoid compiler warnings */
    (void) cryptoKeyId;
    (void) keyElementId;
    (void) keyElementSourceOffset;
    (void) keyElementTargetOffset;
    (void) keyElementCopyLength;
    (void) targetCryptoKeyId;
    (void) targetKeyElementId;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


    return RetVal;
}

/**
* @implements     Crypto_KeyCopy_Activity
*/
Std_ReturnType Crypto_43_HSE_KeyCopy
(
    uint32 cryptoKeyId,
    uint32 targetCryptoKeyId
)
{
    Std_ReturnType RetVal          = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    const uint32   u32PartitionId  = Crypto_43_HSE_Util_GetPartitionId();
    uint32         u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(cryptoKeyId);
    uint32         u32TargetKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(targetCryptoKeyId);

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_KEYCOPY_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If cryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyCopy shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET and return E_NOT_OK. */
    /* If targetCryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyCopy shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
    and return E_NOT_OK. */
    else if ((CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32CryptoKeyIdx) || (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32TargetKeyIdx))
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYCOPY_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    else
#endif
    {
        /* Verify if number of Crypto Key Elements is larger on the source than on target. Report E_NOT_OK if this happens */
        if (Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].u32NumCryptoKeyElements > Crypto_43_HSE_aKeyList[u32TargetKeyIdx].u32NumCryptoKeyElements)
        {
            RetVal = (Std_ReturnType)E_NOT_OK;
        }
        else
        {
            RetVal = (Std_ReturnType)Crypto_43_HSE_CheckKeyCopyValid(u32CryptoKeyIdx, u32TargetKeyIdx);
            if ((Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED == RetVal)
            {
                Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYCOPY_ID, CRYPTO_43_HSE_RET_NOT_SUPPORTED);
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
        if ((Std_ReturnType)E_OK == RetVal)
        {

            RetVal = Crypto_43_HSE_CopyKeyElements(u32PartitionId, u32CryptoKeyIdx, u32TargetKeyIdx);
            if (RetVal >= CRYPTO_43_HSE_RET_OPERATION_TIMEOUT)
            {
                Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYCOPY_ID, (uint8)RetVal);
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
    }
#else
    /* Avoid compiler warnings */
    (void) cryptoKeyId;
    (void) targetCryptoKeyId;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


    return RetVal;
}

/**
* @implements     Crypto_KeyElementIdsGet_Activity
*/
Std_ReturnType Crypto_43_HSE_KeyElementIdsGet
(
    uint32  cryptoKeyId,
    uint32* keyElementIdsPtr,
    uint32* keyElementIdsLengthPtr
)
{
    Std_ReturnType RetVal            = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    uint32         u32CryptoKeyIdx   = Crypto_43_HSE_Util_GetKeyIdx(cryptoKeyId);
    uint32         u32Index;

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    const uint32   u32PartitionId  = Crypto_43_HSE_Util_GetPartitionId();

    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_KEYELEMENTIDSGET_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If cryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyElementIdsGet shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
    and return E_NOT_OK. */
    else if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32CryptoKeyIdx)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTIDSGET_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    else if ((NULL_PTR == keyElementIdsPtr) || (NULL_PTR == keyElementIdsLengthPtr))
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTIDSGET_ID, (uint8)CRYPTO_43_HSE_E_PARAM_POINTER);
    }
    else if (Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].u32NumCryptoKeyElements > *keyElementIdsLengthPtr)
    {
        /* SWS_Crypto_00195: If a Crypto Driver API is called and any buffer addressed during the operation is too small, then the operation shall not be performed.
                             If development error detection for the Crypto Driver is enabled, then the API function shall report CRYPTO_E_SMALL_BUFFER to the DET, else return E_NOT_OK. */
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYELEMENTIDSGET_ID, (uint8)CRYPTO_43_HSE_E_SMALL_BUFFER);
    }
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
        *keyElementIdsLengthPtr = Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].u32NumCryptoKeyElements;

        /*Loop through the number of key elements*/
        for (u32Index = 0U; u32Index < Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].u32NumCryptoKeyElements; u32Index++)
        {
            /*Store the Key Element ID*/
            keyElementIdsPtr[u32Index] = Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].pCryptoKeyElementList[u32Index]].u32CryptoKeyElementId;
        }
        RetVal = (Std_ReturnType)E_OK;
    }
#else
    /* Avoid compiler warnings */
    (void) cryptoKeyId;
    (void) keyElementIdsPtr;
    (void) keyElementIdsLengthPtr;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


    return RetVal;
}

/**
* @implements     Crypto_RandomSeed_Activity
*/
Std_ReturnType Crypto_43_HSE_RandomSeed
(
    uint32       cryptoKeyId,
    const uint8* seedPtr,
    uint32       seedLength
)
{
    Std_ReturnType RetVal          = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    const uint32   u32PartitionId  = Crypto_43_HSE_Util_GetPartitionId();
    const uint32   u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(cryptoKeyId);

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_RANDOMSEED_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If u32CryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_RandomSeed shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
    and return E_NOT_OK. */
    else if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32CryptoKeyIdx)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_RANDOMSEED_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    /* If the parameter seedPtr is a null pointer and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_RandomSeed shall report CRYPTO_43_HSE_E_PARAM_POINTER to the DET
    and return E_NOT_OK. */
    else if (NULL_PTR == seedPtr)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_RANDOMSEED_ID, (uint8)CRYPTO_43_HSE_E_PARAM_POINTER);
    }
    /* If seedLength is zero and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_RandomSeed shall report CRYPTO_43_HSE_E_PARAM_VALUE to the DET and return E_NOT_OK. */
    else if  (0U == seedLength)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_RANDOMSEED_ID, (uint8)CRYPTO_43_HSE_E_PARAM_VALUE);
    }
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
        RetVal = Crypto_43_HSE_GetNonDetErrorsForRandomSeed(u32CryptoKeyIdx);
        if ((Std_ReturnType)E_OK == RetVal)
        {
            RetVal = Crypto_43_HSE_Ipw_RandomSeed(u32PartitionId, u32CryptoKeyIdx, seedPtr, seedLength);
            if (RetVal >= CRYPTO_43_HSE_RET_OPERATION_TIMEOUT)
            {
                Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_RANDOMSEED_ID, (uint8)RetVal);
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
    }
#else
    /* Avoid compiler warnings */
    (void) cryptoKeyId;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

    /* Avoid compiler warnings */
    (void) seedPtr;
    (void) seedLength;


    return RetVal;
}

/**
* @implements     Crypto_KeyGenerate_Activity
*/
Std_ReturnType Crypto_43_HSE_KeyGenerate
(
    uint32 cryptoKeyId
)
{
    Std_ReturnType RetVal          = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    const uint32   u32PartitionId  = Crypto_43_HSE_Util_GetPartitionId();
    uint32         u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(cryptoKeyId);

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_KEYGENERATE_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If the parameter cryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyGenerate shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
    and return E_NOT_OK. */
    else if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32CryptoKeyIdx)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYGENERATE_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE)
        RetVal = Crypto_43_HSE_GetNonDetErrorsForKeyGenerate(u32CryptoKeyIdx);
        if ((Std_ReturnType)E_OK == RetVal)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE) */
        {
            RetVal = Crypto_43_HSE_Ipw_KeyGenerate(u32PartitionId, u32CryptoKeyIdx);
            if (RetVal >= CRYPTO_43_HSE_RET_OPERATION_TIMEOUT)
            {
                Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYGENERATE_ID, (uint8)RetVal);
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
    }
#else
    /* Avoid compiler warnings */
    (void)cryptoKeyId;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


    return RetVal;
}


/**
* @implements     Crypto_KeyDerive_Activity
*/
Std_ReturnType Crypto_43_HSE_KeyDerive
(
    uint32 cryptoKeyId,
    uint32 targetCryptoKeyId
)
{
    Std_ReturnType RetVal          = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    const uint32   u32PartitionId  = Crypto_43_HSE_Util_GetPartitionId();
    const uint32   u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(cryptoKeyId);
    const uint32   u32TargetKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(targetCryptoKeyId);

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_KEYDERIVE_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If the parameter cryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyDerive shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
    and return E_NOT_OK. */
    /* If the parameter targetCryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyDerive shall report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET
    and return E_NOT_OK.*/
    else if ((CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32CryptoKeyIdx) || (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32TargetKeyIdx))
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYDERIVE_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE)
        RetVal = Crypto_43_HSE_GetNonDetErrorsForKeyDerive(u32CryptoKeyIdx, u32TargetKeyIdx);
        if ((Std_ReturnType)E_OK == RetVal)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE) */
        {
            RetVal = Crypto_43_HSE_Ipw_KeyDerive(u32PartitionId, u32CryptoKeyIdx, u32TargetKeyIdx);
            if (RetVal >= CRYPTO_43_HSE_RET_OPERATION_TIMEOUT)
            {
                Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYDERIVE_ID, (uint8)RetVal);
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
    }
#else
    /* Avoid compiler warnings */
    (void)cryptoKeyId;
    (void)targetCryptoKeyId;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


    return RetVal;
}

/**
* @implements     Crypto_KeyExchangeCalcPubVal_Activity
*/
Std_ReturnType Crypto_43_HSE_KeyExchangeCalcPubVal
(
    uint32  cryptoKeyId,
    uint8*  publicValuePtr,
    uint32* publicValueLengthPtr
)
{
    Std_ReturnType RetVal          = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    const uint32   u32PartitionId  = Crypto_43_HSE_Util_GetPartitionId();
    uint32         u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(cryptoKeyId);

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_KEYEXCHANGECALCPUBVAL_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If the parameter cryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyExchangeCalcPubVal shall
    report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET and return E_NOT_OK. */
    else if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32CryptoKeyIdx)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYEXCHANGECALCPUBVAL_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    /* If the parameter publicValuePtr is a null pointer and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyExchangeCalcPubVal shall
    report CRYPTO_43_HSE_E_PARAM_POINTER to the DET and return E_NOT_OK. */
    else if (NULL_PTR == publicValuePtr)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYEXCHANGECALCPUBVAL_ID, (uint8)CRYPTO_43_HSE_E_PARAM_POINTER);
    }
    /* If the parameter pubValueLengthPtr is a null pointer and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyExchangeCalcPubVal shall
    report CRYPTO_43_HSE_E_PARAM_POINTER to the DET and return E_NOT_OK. */
    else if (NULL_PTR == publicValueLengthPtr)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYEXCHANGECALCPUBVAL_ID, (uint8)CRYPTO_43_HSE_E_PARAM_POINTER);
    }
    /* If the value, which is pointed by pubValueLengthPtr is zero and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyExchangeCalcPubVal shall
    report CRYPTO_43_HSE_E_PARAM_VALUE to the DET and return E_NOT_OK. */
    else if (0U == *publicValueLengthPtr)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYEXCHANGECALCPUBVAL_ID, (uint8)CRYPTO_43_HSE_E_PARAM_VALUE);
    }
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
        RetVal = Crypto_43_HSE_GetNonDetErrorsForKeyExchCalcPubVal(u32CryptoKeyIdx, publicValueLengthPtr);

        if ((Std_ReturnType)E_OK == RetVal)
        {
            RetVal = Crypto_43_HSE_CopyDataFromPubValKeyElementToUser(u32PartitionId, u32CryptoKeyIdx, publicValuePtr, publicValueLengthPtr);
        }
        if (RetVal >= CRYPTO_43_HSE_RET_OPERATION_TIMEOUT)
        {
            Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYEXCHANGECALCPUBVAL_ID, (uint8)RetVal);
            RetVal = (Std_ReturnType)E_NOT_OK;
        }
    }
#else
    /* Avoid compiler warnings */
    (void)cryptoKeyId;
    (void)publicValuePtr;
    (void)publicValueLengthPtr;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


    return RetVal;
}

/**
* @implements     Crypto_KeyExchangeCalcSecret_Activity
*/
Std_ReturnType Crypto_43_HSE_KeyExchangeCalcSecret
(
    uint32       cryptoKeyId,
    const uint8* partnerPublicValuePtr,
    uint32       partnerPublicValueLength
)
{
    Std_ReturnType RetVal          = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    const uint32   u32PartitionId  = Crypto_43_HSE_Util_GetPartitionId();
    const uint32   u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(cryptoKeyId);

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
    /* Check whether the call is coming from an authorized partition and the driver is initialized */
    if ((Std_ReturnType)E_NOT_OK == Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis(u32PartitionId, CRYPTO_43_HSE_KEYEXCHANGECALCSECRET_ID))
    {
        /* Nothing to do. The reporting to DET was done from inside the Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis() function */
    }
    /* If the parameter cryptoKeyId is out of range and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyExchangeCalcSecret shall
    report CRYPTO_43_HSE_E_PARAM_HANDLE to the DET and return E_NOT_OK. */
    else if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 == u32CryptoKeyIdx)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYEXCHANGECALCSECRET_ID, (uint8)CRYPTO_43_HSE_E_PARAM_HANDLE);
    }
    /* If the parameter partnerPublicValuePtr is a null pointer and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyExchangeCalcSecret shall
    report CRYPTO_43_HSE_E_PARAM_POINTER to the DET and return E_NOT_OK. */
    else if (NULL_PTR == partnerPublicValuePtr)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYEXCHANGECALCSECRET_ID, (uint8)CRYPTO_43_HSE_E_PARAM_POINTER);
    }
    /* If partnerPublicValueLength is zero and if development error detection for the Crypto Driver is enabled, the function Crypto_43_HSE_KeyExchangeCalcSecret shall report CRYPTO_43_HSE_E_PARAM_VALUE to the DET
    and return E_NOT_OK. */
    else if (0U == partnerPublicValueLength)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, (uint8)CRYPTO_43_HSE_KEYEXCHANGECALCSECRET_ID, (uint8)CRYPTO_43_HSE_E_PARAM_VALUE);
    }
    else
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */
    {
        RetVal =  Crypto_43_HSE_GetNonDetErrorsForKeyExchCalcSecret(u32CryptoKeyIdx);
        if ((Std_ReturnType)E_OK == RetVal)
        {
            RetVal = Crypto_43_HSE_Ipw_CalcSecret(u32PartitionId, u32CryptoKeyIdx, partnerPublicValuePtr, partnerPublicValueLength);
            if (RetVal >= CRYPTO_43_HSE_RET_OPERATION_TIMEOUT)
            {
                Crypto_43_HSE_ReportErrorToDet((uint8)CRYPTO_43_HSE_KEYEXCHANGECALCSECRET_ID, (uint8)RetVal);
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
    }
#else
    /* Avoid compiler warnings */
    (void)cryptoKeyId;
    (void)partnerPublicValuePtr;
    (void)partnerPublicValueLength;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


    return RetVal;
}

/**
* @brief            If asynchronous job processing is configured and there are job queues, the function is called cyclically to process queued jobs.
* @details          If asynchronous job processing is configured and there are job queues, the function is called cyclically to process queued jobs.
*
* @param[in]        none
*
* @return           void
*
*
* @pre
*/
/**
* @implements     Crypto_MainFunction_Activity
*/
void Crypto_43_HSE_MainFunction (void)
{
    const uint32 u32PartitionId = Crypto_43_HSE_Util_GetPartitionId();

    /* SWS_BSW_00037 - If the module is not initialized and the main function is executed then no error shall be reported and the main function shall return immediately. */
    if (CRYPTO_43_HSE_DRIVER_INITIALIZED == Crypto_43_HSE_aeDriverState[u32PartitionId])
    {
        Crypto_43_HSE_Ipw_MainFunction(u32PartitionId);
    }
}

#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
/**
* @brief           Checks if call is done from a valid core and driver is initialized
* @details         Checks if call is done from a valid core and driver is initialized
*
* @param[in]       u32PartitionId - Id of the partition from where this call is made
* @param[in]       u8ApiId        - Id of the caller API
*
* @return          E_OK:     Request successful
*                  E_NOT_OK: Request failed
*/
Std_ReturnType Crypto_43_HSE_CheckValidCoreAndDrvInitForNonCdoApis
(
    const uint32 u32PartitionId,
    const uint8  u8ApiId
)
{
    Std_ReturnType RetVal = (Std_ReturnType)E_NOT_OK;

#if (STD_ON == CRYPTO_43_HSE_ENABLE_MULTIPARTITION_SUPPORT)
    /* Check if the partition this call is coming from is valid. There should be at least one Crypto Driver Object mapped on the partition in order for the call to be valid */
    if (0U == Crypto_43_HSE_aPartitionToCdoMapping[u32PartitionId].u8NumCDOs)
    {
        (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, u8ApiId, (uint8)CRYPTO_43_HSE_E_PARAM_CONFIG);
    }
    /* Check whether the Crypto driver is in CRYPTO_43_HSE_DRIVER_UNINIT state */
    else
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_MULTIPARTITION_SUPPORT) */
    {
        if (CRYPTO_43_HSE_DRIVER_UNINIT == Crypto_43_HSE_aeDriverState[u32PartitionId])
        {
            (void)Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, u8ApiId, (uint8)CRYPTO_43_HSE_E_UNINIT);
        }
        else
        {
            RetVal = (Std_ReturnType)E_OK;
        }
    }

    return RetVal;
}
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
)
{
    switch (u8Error)
    {
#if (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT)
        /* Development error report*/
        case CRYPTO_43_HSE_RET_NOT_SUPPORTED:
            (void) Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, u8ServiceId, CRYPTO_43_HSE_E_NOT_SUPPORTED);
            break;


        case CRYPTO_43_HSE_RET_INVALID_PARAM:
            (void) Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, u8ServiceId, CRYPTO_43_HSE_E_INVALID_PARAM);
            break;

        case CRYPTO_43_HSE_RET_SMALL_BUFFER:
            (void) Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, u8ServiceId, CRYPTO_43_HSE_E_SMALL_BUFFER);
            break;

        case CRYPTO_43_HSE_E_PARAM_HANDLE:
            (void) Det_ReportError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, u8ServiceId, CRYPTO_43_HSE_E_PARAM_HANDLE);
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_DEV_ERROR_DETECT) */

        /* Runtime error report */
        case CRYPTO_43_HSE_RET_OPERATION_TIMEOUT:
            (void) Det_ReportRuntimeError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, u8ServiceId, CRYPTO_43_HSE_E_RE_OPERATION_TIMEOUT);
            break;


        case CRYPTO_43_HSE_RET_STREAM_BUSY:
            (void) Det_ReportRuntimeError((uint16)CRYPTO_43_HSE_MODULE_ID, (uint8)CRYPTO_43_HSE_INSTANCE_ID, u8ServiceId, CRYPTO_43_HSE_E_RE_STREAM_BUSY);
            break;

        default:
            /* Should not get here */
            break;
    }
}

#define CRYPTO_43_HSE_STOP_SEC_CODE
#include "Crypto_43_HSE_MemMap.h"

#ifdef __cplusplus
}
#endif

/** @} */


