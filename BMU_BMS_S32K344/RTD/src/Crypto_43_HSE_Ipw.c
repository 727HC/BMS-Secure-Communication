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
#include "Crypto_43_HSE_Ipw.h"
#include "Crypto_43_HSE_Util.h"
#include "Hse_Ip.h"

/*==================================================================================================
*                                 SOURCE FILE VERSION INFORMATION
==================================================================================================*/
#define CRYPTO_43_HSE_VENDOR_ID_IPW_C                       43
#define CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_IPW_C        4
#define CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_IPW_C        7
#define CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_IPW_C     0
#define CRYPTO_43_HSE_SW_MAJOR_VERSION_IPW_C                5
#define CRYPTO_43_HSE_SW_MINOR_VERSION_IPW_C                0
#define CRYPTO_43_HSE_SW_PATCH_VERSION_IPW_C                0

/*==================================================================================================
*                                       FILE VERSION CHECKS
==================================================================================================*/
/* Check if Crypto Ipw source file and Crypto Ipw header file are of the same vendor */
#if (CRYPTO_43_HSE_VENDOR_ID_IPW_C != CRYPTO_43_HSE_VENDOR_ID_IPW_H)
    #error "Crypto_Ipw.c and Crypto_Ipw.h have different vendor ids"
#endif

/* Check if Crypto Ipw source file and Crypto Ipw header file are of the same Autosar version */
#if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_IPW_C    != CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_IPW_H) || \
     (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_IPW_C    != CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_IPW_H) || \
     (CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_IPW_C != CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_IPW_H) \
    )
    #error "AutoSar Version Numbers of Crypto_Ipw.c and Crypto_Ipw.h are different"
#endif

/* Check if Crypto Ipw source file and Crypto Ipw header file are of the same Software version */
#if ((CRYPTO_43_HSE_SW_MAJOR_VERSION_IPW_C != CRYPTO_43_HSE_SW_MAJOR_VERSION_IPW_H) || \
     (CRYPTO_43_HSE_SW_MINOR_VERSION_IPW_C != CRYPTO_43_HSE_SW_MINOR_VERSION_IPW_H) || \
     (CRYPTO_43_HSE_SW_PATCH_VERSION_IPW_C != CRYPTO_43_HSE_SW_PATCH_VERSION_IPW_H)    \
    )
    #error "Software Version Numbers of Crypto_Ipw.c and Crypto_Ipw.h are different"
#endif


/* Check if Crypto Ipw source file and Crypto_43_HSE_Util header file are of the same vendor */
#if (CRYPTO_43_HSE_VENDOR_ID_IPW_C != CRYPTO_43_HSE_UTIL_VENDOR_ID)
    #error "Crypto_Ipw.c and Crypto_43_HSE_Util.h have different vendor ids"
#endif

/* Check if Crypto Ipw source file and Crypto_43_HSE_Util header file are of the same Autosar version */
#if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_IPW_C    != CRYPTO_43_HSE_UTIL_AR_RELEASE_MAJOR_VERSION) || \
     (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_IPW_C    != CRYPTO_43_HSE_UTIL_AR_RELEASE_MINOR_VERSION) || \
     (CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_IPW_C != CRYPTO_43_HSE_UTIL_AR_RELEASE_REVISION_VERSION) \
    )
    #error "AutoSar Version Numbers of Crypto_Ipw.c and Crypto_43_HSE_Util.h are different"
#endif

/* Check if Crypto Ipw source file and Crypto_43_HSE_Util header file are of the same Software version */
#if ((CRYPTO_43_HSE_SW_MAJOR_VERSION_IPW_C != CRYPTO_43_HSE_UTIL_SW_MAJOR_VERSION) || \
     (CRYPTO_43_HSE_SW_MINOR_VERSION_IPW_C != CRYPTO_43_HSE_UTIL_SW_MINOR_VERSION) || \
     (CRYPTO_43_HSE_SW_PATCH_VERSION_IPW_C != CRYPTO_43_HSE_UTIL_SW_PATCH_VERSION)    \
    )
    #error "Software Version Numbers of Crypto_Ipw.c and Crypto_43_HSE_Util.h are different"
#endif


/* Check if Crypto Ipw source file and Hse_Ip header file are of the same vendor */
#if (CRYPTO_43_HSE_VENDOR_ID_IPW_C != HSE_IP_VENDOR_ID_H)
    #error "Crypto_Ipw.c and Hse_Ip.h have different vendor ids"
#endif

/* Check if source file and Hse_Ip header file are of the same Software version */
#if ((CRYPTO_43_HSE_SW_MAJOR_VERSION_IPW_C  != HSE_IP_SW_MAJOR_VERSION_H) || \
     (CRYPTO_43_HSE_SW_MINOR_VERSION_IPW_C  != HSE_IP_SW_MINOR_VERSION_H) || \
     (CRYPTO_43_HSE_SW_PATCH_VERSION_IPW_C != HSE_IP_SW_PATCH_VERSION_H)    \
    )
    #error "Software Version Numbers of Crypto_Ipw.c and Hse_Ip.h are different"
#endif

/*==================================================================================================
*                                          LOCAL MACROS
==================================================================================================*/
/* This is needed in order to have the CancelJob work correctly even when trying to launch a Crypto_43_HSE_CancelJob() for a job with jobId = 0 that was never launched */
#define CRYPTO_IPW_INVALID_VAL_FOR_JOBID_U32                ((uint32)0xA5AA5A55U)

/* Value used to mark that there is no stream available */
#define CRYPTO_IPW_INVALID_STREAM_ID_U8                     ((uint8)0xFFU)


/*Define used to mirror the implementation of CRYPTO_IPW_PTR_TO_HOST_ADDR of the HSE FW interface
*CRYPTO_IPW_PTR_TO_HOST_ADDR can not be used in this module due to Misra 4.9 deviation
*/
#ifdef HSE_SPT_64BIT_ADDR
    #if (CPU_TYPE_64 == CPU_TYPE)
        /* 64 bit pointer to 64-bit unsigned integer */
        #define CRYPTO_IPW_PTR_TO_HOST_ADDR (HOST_ADDR)(uint64)
    #else
        /* 32 bit pointer to 64-bit unsigned integer */
        #define CRYPTO_IPW_PTR_TO_HOST_ADDR (HOST_ADDR)(uint64)(uint32)
    #endif
#else
    #if (CPU_TYPE_64 == CPU_TYPE)
        /* 64 bit pointer to 32-bit unsigned integer */
        /* TODO: This scanario need a different logic for conversion, compiler may issue trucation error */
        #define CRYPTO_IPW_PTR_TO_HOST_ADDR(ptr) (HOST_ADDR)(uint32)Crypto_Ipw_UInt64ToUInt32((uint64)ptr)
    #else
        /* 32 bit pointer to 32-bit unsigned integer */
        #define CRYPTO_IPW_PTR_TO_HOST_ADDR (HOST_ADDR)(uint32)
    #endif
#endif

#if (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT)
    /* Curve ID was not configured by user */
    #define CRYPTO_IPW_KE_INVALID_CURVE_ID_U8               ((uint8)0xFFU)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) */

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    #if ((STD_ON == CRYPTO_43_HSE_SPT_RSA) && (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_PAIR_GEN))
        #define CRYPTO_IPW_RSA_MOD_LEN                      (256U)
    #endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA) && (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_PAIR_GEN)) */

    #if ((STD_ON == CRYPTO_43_HSE_SPT_ECC) && (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN))
        #if(STD_ON == (CRYPTO_43_HSE_SPT_SECP192R1 || CRYPTO_43_HSE_SPT_SECP256R1))
            /* Size of Ecc Nist 192R1 and 256R1 OID */
            #define CRYPTO_IPW_NIST_SECP_192R1_256R1_SIZE_U8        ((uint8)0x08)

            #if(STD_ON == CRYPTO_43_HSE_SPT_SECP192R1)
            #define CRYPTO_IPW_NIST_SECP192R1_OID_UNIQUE_VALUE      ((uint8)0x01)
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP192R1) */

            #if(STD_ON == CRYPTO_43_HSE_SPT_SECP256R1)
            #define CRYPTO_IPW_NIST_SECP256R1_OID_UNIQUE_VALUE      ((uint8)0x07)
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP256R1) */
            
        #endif /* (STD_ON == (CRYPTO_43_HSE_SPT_SECP192R1 || CRYPTO_43_HSE_SPT_SECP256R1)) */

        #if (STD_ON == (CRYPTO_43_HSE_SPT_SECP224R1 || CRYPTO_43_HSE_SPT_SECP384R1 || CRYPTO_43_HSE_SPT_SECP521R1 || CRYPTO_43_HSE_SPT_SECP192K1 || CRYPTO_43_HSE_SPT_SECP224K1 || CRYPTO_43_HSE_SPT_SECP256K1))
            /* Size of Ecc Nist 192K1, 224K1, 224R1, 256K1,384R1 and 521K1 OID */
            #define CRYPTO_IPW_NIST_SECP_192K1_224K1_224R1_256K1_384R1_521R1_SIZE_U8    ((uint8)0x05)

            #if(STD_ON == CRYPTO_43_HSE_SPT_SECP224R1)
            #define CRYPTO_IPW_NIST_SECP224R1_OID_UNIQUE_VALUE                          ((uint8)0x21)
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP224R1) */

            #if(STD_ON == CRYPTO_43_HSE_SPT_SECP384R1)
            #define CRYPTO_IPW_NIST_SECP384R1_OID_UNIQUE_VALUE                          ((uint8)0x22)
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP384R1) */

            #if(STD_ON == CRYPTO_43_HSE_SPT_SECP521R1)
            #define CRYPTO_IPW_NIST_SECP521R1_OID_UNIQUE_VALUE                          ((uint8)0x23)
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP521R1) */

            #if(STD_ON == CRYPTO_43_HSE_SPT_SECP192K1)
            #define CRYPTO_IPW_NIST_SECP192K1_OID_UNIQUE_VALUE                          ((uint8)0x1F)
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP192K1) */

            #if(STD_ON == CRYPTO_43_HSE_SPT_SECP224K1)
            #define CRYPTO_IPW_NIST_SECP224K1_OID_UNIQUE_VALUE                          ((uint8)0x20)
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP224K1) */

            #if(STD_ON == CRYPTO_43_HSE_SPT_SECP256K1)
            #define CRYPTO_IPW_NIST_SECP256K1_OID_UNIQUE_VALUE                          ((uint8)0x0A)
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP256K1) */                    
            
        #endif /* (STD_ON == (CRYPTO_43_HSE_SPT_SECP224R1 || CRYPTO_43_HSE_SPT_SECP384R1 || CRYPTO_43_HSE_SPT_SECP521R1 || CRYPTO_43_HSE_SPT_SECP192K1 || CRYPTO_43_HSE_SPT_SECP224K1 || CRYPTO_43_HSE_SPT_SECP256K1)) */

        #if(STD_ON == (CRYPTO_43_HSE_SPT_BRAINPOOLP192R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP224R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP256R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP320R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP384R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP512R1 || \
                       CRYPTO_43_HSE_SPT_BRAINPOOLP192T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP224T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP256T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP320T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP384T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP512T1))
            /* Size of Brainpool OID Version  */
            #define CRYPTO_IPW_BRAINPOOL_OID_VERSION_SIZE_U8    ((uint8)0x08)

            /* Size of Brainpool OID Object identifier */
            #define CRYPTO_IPW_BRAINPOOL_OID_OBJ_ID_SIZE_U8     ((uint8)0x09)
        #endif /* STD_ON == (CRYPTO_43_HSE_SPT_BRAINPOOLP192R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP224R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP256R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP320R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP384R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP512R1 || \
                             CRYPTO_43_HSE_SPT_BRAINPOOLP192T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP224T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP256T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP320T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP384T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP512T1) */

        #if(STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP192R1)
            /* Object identifier for brainpoolP192r1 */
            #define CRYPTO_IPW_BRAINPOOLP192R1_OBJECT_ID_U8     ((uint8)0x03U)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP192R1 */

        #if(STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP192T1)
            /* Object identifier for brainpoolP192t1 */
            #define CRYPTO_IPW_BRAINPOOLP192T1_OBJECT_ID_U8     ((uint8)0x04U)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP192T1 */

        #if(STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224R1)
            /* Object identifier for brainpoolP224r1 */
            #define CRYPTO_IPW_BRAINPOOLP224R1_OBJECT_ID_U8     ((uint8)0x05U)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224R1 */

        #if(STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224T1)
            /* Object identifier for brainpoolP224t1 */
            #define CRYPTO_IPW_BRAINPOOLP224T1_OBJECT_ID_U8     ((uint8)0x06U)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224T1 */

        #if(STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256R1)
            /* Object identifier for brainpoolP256r1 */
            #define CRYPTO_IPW_BRAINPOOLP256R1_OBJECT_ID_U8     ((uint8)0x07U)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256R1 */

        #if(STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256T1)
            /* Object identifier for brainpoolP256t1 */
            #define CRYPTO_IPW_BRAINPOOLP256T1_OBJECT_ID_U8     ((uint8)0x08U)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256T1 */

        #if(STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320R1)
            /* Object identifier for brainpoolP320r1 */
            #define CRYPTO_IPW_BRAINPOOLP320R1_OBJECT_ID_U8     ((uint8)0x09U)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320R1 */

        #if(STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320T1)
            /* Object identifier for brainpoolP320T1 */
            #define CRYPTO_IPW_BRAINPOOLP320T1_OBJECT_ID_U8     ((uint8)0x0AU)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320T1 */

        #if(STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384R1)
            /* Object identifier for brainpoolP384r1 */
            #define CRYPTO_IPW_BRAINPOOLP384R1_OBJECT_ID_U8     ((uint8)0x0BU)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384R1 */

        #if(STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384T1)
            /* Object identifier for brainpoolP384t1 */
            #define CRYPTO_IPW_BRAINPOOLP384T1_OBJECT_ID_U8     ((uint8)0x0CU)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384T1 */

        #if(STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512R1)
            /* Object identifier for brainpoolP512r1 */
            #define CRYPTO_IPW_BRAINPOOLP512R1_OBJECT_ID_U8     ((uint8)0x0DU)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512R1 */

        #if(STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512T1)
            /* Object identifier for brainpoolP512t1 */
            #define CRYPTO_IPW_BRAINPOOLP512T1_OBJECT_ID_U8     ((uint8)0x0EU)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512T1 */

        #if(STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519)
            /* Size of Ecc ED25519 OID */
            #define CRYPTO_IPW_25519_ED25519_SIZE_U8            ((uint8)0x09U)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519 */

        #if(STD_ON == CRYPTO_43_HSE_SPT_EC25519_CURVE25519)
            /* Size of Ecc CURVE25519 OID */
            #define CRYPTO_IPW_25519_CURVE25519_SIZE_U8         ((uint8)0x0AU)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_EC25519_CURVE25519 */

        #if((STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448) || (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448))
            /* Size of Ecc ED448 and CURVE448 OID */
            #define CRYPTO_IPW_448_ED448_CURVE448_SIZE_U8       ((uint8)0x03U)
        #endif /* STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448 */
    #endif /* ((STD_ON == CRYPTO_43_HSE_SPT_ECC) && (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN)) */

    #if (STD_ON == CRYPTO_43_HSE_SPT_FAST_CMAC)
        /* FAST CMAC max tag size is always 128 bits, the equivalent of 16 bytes */
        #if (STD_ON == CRYPTO_43_HSE_LENGTHS_FOR_FASTCMAC_JOBS_USE_BITS)
            #define CRYPTO_IPW_FASTCMAC_MAX_TAG_LEN_U8          ((uint8)128U)
        #else
            #define CRYPTO_IPW_FASTCMAC_MAX_TAG_LEN_U8          ((uint8)16U)
        #endif /* (STD_ON == CRYPTO_43_HSE_LENGTHS_FOR_FASTCMAC_JOBS_USE_BITS) */
    #endif /* (STD_ON == CRYPTO_43_HSE_SPT_FAST_CMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_KEYVERIFY)
    /*Used to define the length(in bytes) of an uint8 array buffer that also represents the length of a SHE tag*/
    #define CRYPTO_IPW_INPUT_BUFFER_TAG_LENGTH          (32U)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEYVERIFY) */

#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE)
    /* Index of the byte storing the Secondary Algorithm value in the buffer of the CRYPTO_43_HSE_KE_KEYDERIVATION_ALGORITHM_SECONDARY key element */
    #define CRYPTO_IPW_ALGORITHM_SECONDARY_IDX          (0U)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE) */

/* Channel 0 of the Messaging Unit instance */
#define CRYPTO_IPW_CHANNEL_0_U8                         ((uint8)0U)

/* Mask for FINISH operation mode flag */
#define CRYPTO_IPW_OPERATIONMODE_FINISH_MASK_U8         ((uint8)0x04U)

#if (STD_ON == CRYPTO_43_HSE_SPT_SHE)
    /* Key handle of the SHE MASTER ECU key */
    #define CRYPTO_IPW_SHE_MASTER_ECU_KEY_HANDLE_U32    ((uint32)0x00010000U)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE) */



/*Define macro to convert address to host address size */
#if (CPU_TYPE == CPU_TYPE_64)
  #define CRYPTO_HSE_HOST_ADDR_TO_INT (uint64)
#else
  #define CRYPTO_HSE_HOST_ADDR_TO_INT (uint32)
#endif

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    #if (STD_ON == CRYPTO_43_HSE_SPT_ECC)
        /* Length of temporary buffer used for endianness conversion */
        #define CRYPTO_IPW_BIG_END_FORM_SIZE_U32        ((uint32)200U)
    #endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC) */
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) 
/* Macro used for storing the size of au8BackupBuffer */
#define CRYPTO_IPW_BACKUP_BUFFER_SIZE                       ((uint32)1024U)
/* Macro used for storing the actual block size for CMAC operations */
#define CRYPTO_IPW_CMAC_BLOCK_SIZE                          ((uint8)16U)
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */
/*==================================================================================================
*                           LOCAL TYPEDEFS (STRUCTURES, UNIONS, ENUMS)
==================================================================================================*/
/* State structure for Crypto_Ipw layer storing variables that should be kept per MU instance */
typedef struct
{
    Hse_Ip_MuStateType  Hse_Ip_MuState;                                               /* Structure storing HseIp internal variables */
    Hse_Ip_ReqType      Hse_Ip_aRequest[HSE_NUM_OF_CHANNELS_PER_MU];               /* Array of requests to Hse Ip layer that must be kept available between asynchronous calls */
    uint32              au32MuChannelJobId[HSE_NUM_OF_CHANNELS_PER_MU];            /* Array containing the jobIds of each job that runs on a MU channel */
    uint32              au32MuChannelCDOIdx[HSE_NUM_OF_CHANNELS_PER_MU];           /* Array storing the index of the CDO where the job came from */
    uint32              u32HseSyncRequestsTimeout;                                    /* Variable storing the timeout for synchronous requests sent to HSE in ticks */
    hseSrvDescriptor_t* pHseSrvDescriptor;                                            /* Pointer where the statically allocated memory for Hse service descriptors placed in SHARED RAM begins */
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
    hseKeyInfo_t        HseKeyInfoStorage[HSE_NUM_OF_CHANNELS_PER_MU];             /* Structure containing key properties used by functions to get or provide the key information when requesting services from HSE */
    uint32              au32OutLength[HSE_NUM_OF_CHANNELS_PER_MU];                 /* Array that will be filled with the length information from user output */
    #if (STD_ON == CRYPTO_43_HSE_SPT_CMAC)    || \
        (STD_ON == CRYPTO_43_HSE_SPT_XCBCMAC) || \
        (STD_ON == CRYPTO_43_HSE_SPT_GMAC)    || \
        (STD_ON == CRYPTO_43_HSE_SPT_HMAC)    || \
        (STD_ON == CRYPTO_43_HSE_SPT_SIPHASH)
    uint32              au32MacVerifyInputLenInBytes[HSE_NUM_OF_CHANNELS_PER_MU];  /* Array storing a temporary conversion of the secondaryInputLength parameter of a MacVerify job, from bits to bytes */
    #endif /* (STD_ON == SPT_CMAC || SPT_XCBCMAC || SPT_GMAC || SPT_HMAC || SPT_SIPHASH) */
    #if (STD_ON == CRYPTO_43_HSE_SPT_ECC)
    uint8               au8KeyBigEndForm[CRYPTO_IPW_BIG_END_FORM_SIZE_U32];         /* Temporary buffer used for endianness conversion */
    #endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC) */
    #if (STD_ON == CRYPTO_43_HSE_SPT_RSA)
    uint32              au32SizeRsa[2U];                                              /* RSA key size */
    #endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA) */
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */
} Crypto_Ipw_MuStateType;

#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
    /* Structure used to store information about Hash algo */
    typedef struct
    {
        hseHashAlgo_t HseHashAlgo;
        uint32        u32HashLength;
    } Crypto_Ipw_HashConfigType;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */

/* Structure to store information about an HSE stream used by the Crypto driver */
typedef struct
{
    uint32  u32CdoIdx;
    uint32  u32JobId;
} Crypto_Ipw_StreamStatusType;

#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)
typedef struct
{
    /* Buffer used for saving bytes which can not be seent to HSE FW in streaming mode*/
    uint8    au8BackupBuffer[CRYPTO_IPW_BACKUP_BUFFER_SIZE]; 
    /* Variable used for storing the number of bytes which can not be sent to HSE*/
    uint32   u32NoOfBackupBytes;
    /* Variable used for storing offset in backup buffer for the bytes which can not be sent to HSE */
    uint32   u32OffsetRemainingBytes;
} Crypto_Ipw_StreamingBufferType;
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */
#if (CPU_TYPE == CPU_TYPE_64)
#ifndef HSE_SPT_64BIT_ADDR
typedef union
{
    uint64 ui64[1];
    uint32 ui32[2];
    uint16 ui16[4];
    uint8  ui8[8];
} Crypto_Ipw_GenericRegisterType;
#endif /* HSE_SPT_64BIT_ADDR */
#endif /* (CPU_TYPE == CPU_TYPE_64) */

/*==================================================================================================
*                                         LOCAL CONSTANTS
==================================================================================================*/

/*==================================================================================================
*                                         LOCAL VARIABLES
==================================================================================================*/
#define CRYPTO_43_HSE_START_SEC_VAR_CLEARED_UNSPECIFIED_NO_CACHEABLE
#include "Crypto_43_HSE_MemMap.h"

/* Array storing the Crypto_Ipw layer per MU state machine structures */
static Crypto_Ipw_MuStateType Crypto_Ipw_aCryptoHseMuState[CRYPTO_43_HSE_NUMBER_PARTITIONS_ALLOWED_TO_RUN_IN_U8];

#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)
static Crypto_Ipw_StreamingBufferType Crypto_Ipw_aRestrictionRemovalStreaming[HSE_STREAM_COUNT];
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */

#define CRYPTO_43_HSE_STOP_SEC_VAR_CLEARED_UNSPECIFIED_NO_CACHEABLE
#include "Crypto_43_HSE_MemMap.h"

#define CRYPTO_43_HSE_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/* Array of pointers to Crypto_Ipw layer state structures, one per MU instance */
static Crypto_Ipw_MuStateType* Crypto_Ipw_apMuState[HSE_NUM_OF_MU_INSTANCES];

/* Array of structures storing information about the allocation status of the HSE streams */
static Crypto_Ipw_StreamStatusType Crypto_Ipw_aStreamStatus[HSE_STREAM_COUNT];

/* Stores the stream status per bits */
static uint8 Crypto_Ipw_u8StreamBusyBitMap;

#define CRYPTO_43_HSE_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"


#define CRYPTO_43_HSE_START_SEC_VAR_CLEARED_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"

/* Array containing one pointer per Crypto Driver Object, storing the currently processing synchronous job */
static Crypto_JobType* Crypto_Ipw_apSyncJobInProgress[CRYPTO_43_HSE_NUMBER_OF_DRIVER_OBJECTS_U32];

#define CRYPTO_43_HSE_STOP_SEC_VAR_CLEARED_UNSPECIFIED
#include "Crypto_43_HSE_MemMap.h"


#define CRYPTO_43_HSE_START_SEC_VAR_SHARED_CLEARED_UNSPECIFIED_NO_CACHEABLE
#include "Crypto_43_HSE_MemMap.h"

static hseSrvDescriptor_t Crypto_Ipw_aHseSrvDescriptor[CRYPTO_43_HSE_NUMBER_PARTITIONS_ALLOWED_TO_RUN_IN_U8][HSE_NUM_OF_CHANNELS_PER_MU];

#define CRYPTO_43_HSE_STOP_SEC_VAR_SHARED_CLEARED_UNSPECIFIED_NO_CACHEABLE
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

#if (CPU_TYPE == CPU_TYPE_64)
#ifndef HSE_SPT_64BIT_ADDR
static uint32 Crypto_Ipw_UInt64ToUInt32(uint64 ui64);
#endif /* HSE_SPT_64BIT_ADDR */
#endif /* (CPU_TYPE == CPU_TYPE_64) */

#define CRYPTO_43_HSE_START_SEC_CODE
#include "Crypto_43_HSE_MemMap.h"

static void Crypto_Ipw_FillVerifyPtr
(
    const Crypto_JobType* pCryptoJob,
    Std_ReturnType* const pStdRetVal
);
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) || (STD_ON == CRYPTO_43_HSE_SPT_HASH))

static inline hseAccessMode_t Crypto_Ipw_ConfigureAccessMode
(
    const Crypto_OperationModeType eAccessMode
);
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) || (STD_ON == CRYPTO_43_HSE_SPT_HASH)) */

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
#if ((STD_ON == CRYPTO_43_HSE_SPT_GETKEYINFO) || (STD_ON == CRYPTO_43_HSE_SPT_KEYVERIFY))
static inline Std_ReturnType Crypto_Ipw_CheckGenericKey
(
    const uint8  u8MuInstance,
    const uint32 u32CryptoKeyIdx,
    const uint32 u32KeyMaterialKeyElemIdx,
    const uint32 u32HseKeyHandle
);
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_GETKEYINFO) || (STD_ON == CRYPTO_43_HSE_SPT_KEYVERIFY)) */

#if (STD_ON == CRYPTO_43_HSE_SPT_CMAC) || (STD_ON == CRYPTO_43_HSE_SPT_XCBCMAC)
static inline Std_ReturnType Crypto_Ipw_CmacXcbcMacGenerate
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
);

static inline Std_ReturnType Crypto_Ipw_CmacXcbcMacVerify
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_CMAC) || (STD_ON == CRYPTO_43_HSE_SPT_XCBCMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_FAST_CMAC)
static inline Std_ReturnType Crypto_Ipw_FastCmac
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    hseAuthDir_t          HseAuthDir,
    boolean*              pbReqSentOverChannel
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_FAST_CMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_GMAC)
static inline Std_ReturnType Crypto_Ipw_GmacGenerate
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
);

static inline Std_ReturnType Crypto_Ipw_GmacVerify
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_GMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_AEAD)
static inline Std_ReturnType Crypto_Ipw_AeadEncDec
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    hseCipherDir_t        CipherDir,
    boolean*              pbReqSentOverChannel
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_AEAD) */

static inline Std_ReturnType Crypto_Ipw_EncDec
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    hseCipherDir_t        u8CipherDir,
    boolean*              pbReqSentOverChannel
);

#if (STD_ON == CRYPTO_43_HSE_SPT_XTS_AES)
static inline Std_ReturnType Crypto_Ipw_XtsEncDec
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    hseCipherDir_t        u8CipherDir,
    boolean*              pbReqSentOverChannel
);
#endif /*(STD_ON == CRYPTO_43_HSE_SPT_XTS_AES)*/

#if (STD_ON == CRYPTO_43_HSE_SPT_HMAC)
static inline Std_ReturnType Crypto_Ipw_HmacGen
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    hseHashAlgo_t         HashAlgo,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
);

static inline Std_ReturnType Crypto_Ipw_HmacVerify
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    hseHashAlgo_t         HashAlgo,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HMAC) */

static inline hseCipherBlockMode_t Crypto_Ipw_ConfigureAlgoMode
(
    uint8 u8AlgoMode
);

#if (STD_ON == CRYPTO_43_HSE_SPT_RSA)
static inline Std_ReturnType Crypto_Ipw_RSAEncDec
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    hseCipherDir_t        CipherDir,
    boolean*              pbReqSentOverChannel
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA) */

#if (STD_ON == CRYPTO_43_HSE_SPT_SYM_KEY_IMPORT)
static inline Std_ReturnType Crypto_Ipw_LoadSimKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    uint32              u32KeyLength,
    const uint8*        pKeyMaterial,
    uint32              u32KeyMaterialKeyElemIdx
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SYM_KEY_IMPORT) */

static inline Std_ReturnType Crypto_Ipw_ImportCustomKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const uint8*        pKeyMaterial,
    uint32              u32KeyMaterialKeyElemIdx
);

#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_EXPORT)
static inline Std_ReturnType Crypto_Ipw_ExportCustomKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const uint8*        pKeyMaterial,
    uint32              u32KeyMaterialKeyElemIdx
);
#endif

#if (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_IMPORT)
static inline Std_ReturnType Crypto_Ipw_SheLoadPlainKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const uint8*        pKeyMaterial,
    uint32              u32KeyMaterialKeyElemIdx
);

static inline Std_ReturnType Crypto_Ipw_SheLoadKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const uint8*        pKeyMaterial,
    uint32              u32CryptoKeyIdx,
    uint32              u32KeyMaterialKeyElemIdx
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_IMPORT) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT))
static inline Std_ReturnType Crypto_Ipw_ExportPubKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    uint32              u32KeyMaterialKeyElemIdx,
    uint8* const        pResult,
#if (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT)
    uint32*             pResultLength
#else
    const uint32*       pResultLength
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) */
);

static inline Std_ReturnType Crypto_Ipw_ExportPubKeyUpdateRes
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    uint32              u32KeyMaterialKeyElemIdx,
    uint8* const        pResult,
#if (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT)
    uint32*             pResultLength,
#else
    const uint32*       pResultLength,
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) */
    Std_ReturnType      ReturnValue
);
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT)) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT))
static inline Std_ReturnType Crypto_Ipw_ExportResultAddr
(
    hseExportKeySrv_t*    pExportKeyReq,
    uint8                 u8HseKeyType,
    const uint8* const    pResult,
    const uint32*         pResultLength
#if (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT)
    , const uint32       u32KeyHandle,
    uint8                u8MuInstance,
    uint8                u8MuChannel
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) */
);
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT)) */


#if (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_EXPORT)
static inline Std_ReturnType Crypto_Ipw_ExportRamSheKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const uint8*        pResult
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_EXPORT) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN))
static inline uint16 Crypto_Ipw_EccKeyBitLen
(
    uint16 u16CurveId
);
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN)) */

#if (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT)
static inline Std_ReturnType Crypto_Ipw_EccLoadPlainPubKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const uint8*        pKey,
    uint32              u32KeyLength,
    uint32              u32KeyMaterialKeyElemIdx,
#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
    uint32              u32CryptoKeyIdx,
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */
    uint8               u8CurveId
);

static inline Std_ReturnType Crypto_Ipw_EccLoadPlainPairKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const               uint8* pKey,
    uint32              u32KeyLength,
    uint32              u32KeyMaterialKeyElemIdx,
#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
    uint32              u32CryptoKeyIdx,
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */
    uint8               u8CurveId
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC))
static inline Std_ReturnType Crypto_Ipw_SignRequest
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
);

static inline boolean Crypto_Ipw_FillSignRequestDescriptor
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSignSrv_t*         pSignSrv,
    const Crypto_JobType* pJob,
    const uint32          u32SignKeyElemIdx
);
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) */

#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE)
static Std_ReturnType Crypto_Ipw_KeyGenerateRequest
(
    const uint8           u8MuInstance,
    const uint8           u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    const uint32          u32CryptoKeyIdx,
    boolean*              pbReqSentOverChannel
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE) */

#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE)
static Std_ReturnType Crypto_Ipw_KeyDeriveRequest
(
    const uint8           u8MuInstance,
    const uint8           u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
#if ((STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2))
    Crypto_JobType*       pJob,
#else
    const Crypto_JobType* pJob,
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)) */
    const uint32          u32CryptoKeyIdx,
    const uint32          u32TargetKeyIdx,
#if ((STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2))
    boolean*              pbReqSentOverChannel
#else
    const boolean*        pbReqSentOverChannel
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)) */
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE) */

#if (((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) && (STD_ON == CRYPTO_43_HSE_SPT_COMPUTE_DH))
static Std_ReturnType Crypto_Ipw_CalcSecretRequest
(
    const uint8           u8MuInstance,
    const uint8           u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    const uint32          u32CryptoKeyIdx,
    const uint8* const    pPartnerPublicValue,
    const uint32          u32PartnerPublicValueLength
);
#endif /* (((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) && (STD_ON == CRYPTO_43_HSE_SPT_COMPUTE_DH)) */

#if (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN)
static inline uint8 Crypto_Ipw_GetEccCurveId
(
    const uint32 u32EccCurveOidKeyElemIdx,
    const uint8  u8EccCurveAlgoFam
);

static inline uint8 Crypto_Ipw_ConvertNistOidToCurveId
(
    const uint8* pCurveOid,
    const uint32 u32CurveOidLength
);

static inline uint8 Crypto_Ipw_ConvertNistOidToCurveId_OidLength8
(
    const uint8* pCurveOid
);

static inline uint8 Crypto_Ipw_ConvertNistOidToCurveId_OidLength5
(
    const uint8* pCurveOid
);

static inline uint8 Crypto_Ipw_ConvertBrainPoolOidToCurveId
(
    const uint8* pCurveOid,
    const uint32 u32CurveOidLength
);

static inline uint8 Crypto_Ipw_ConvertEd25519OidToCurveId
(
    const uint8* pCurveOid,
    const uint32 u32CurveOidLength
);

static inline uint8 Crypto_Ipw_ConvertEd448OidToCurveId
(
    const uint8* pCurveOid,
    const uint32 u32CurveOidLength
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT))
static inline Std_ReturnType Crypto_Ipw_GetKeyInfo
(
    const uint8   u8MuInstance,
    uint32        u32HseKeyHandle,
    hseKeyInfo_t* pHseKeyInfoStorage
);
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT)) */
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

static inline Std_ReturnType Crypto_Ipw_OperationModeControl
(
    Crypto_JobType* pJob
);

static inline uint8 Crypto_Ipw_AllocStream
(
    const uint32          u32ObjectIdx,
    const Crypto_JobType* pJob
);

static inline void Crypto_Ipw_FreeStream
(
    const uint32 u32ObjectIdx,
    uint32       u32JobId
);

#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
static inline Crypto_Ipw_HashConfigType Crypto_Ipw_ConfigureHashAlgo
(
    uint8 u8AlgoFamily
);

#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)
static inline uint8 Crypto_Ipw_GetHashBlockSize
(
    uint8 u8AlgoFamily
);
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */
static inline Std_ReturnType Crypto_Ipw_Hash
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_SIPHASH) && (STD_ON == CRYPTO_43_HSE_KEYS_EXIST))
static inline Std_ReturnType Crypto_Ipw_SipHash
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    hseAuthDir_t          HseAuthDir,
    boolean*              pbReqSentOverChannel
);
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_SIPHASH) && (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)) */

static inline Std_ReturnType Crypto_Ipw_Random
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob
);

static inline Std_ReturnType Crypto_Ipw_TranslateHseResponse
(
    hseSrvResponse_t HseResponse
);

static Std_ReturnType Crypto_Ipw_ProcessOperation
(
    const uint8     u8MuInstance,
    uint32          u32ObjectIdx,
    Crypto_JobType* pJob
);


static inline Std_ReturnType Crypto_Ipw_SendCancelJobReq
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    uint8               u8MuChannelToCancel
);

static void Crypto_Ipw_ProcessMuChannelResponse
(
    uint8            u8MuInstance,
    uint8            u8MuChannel,
    hseSrvResponse_t HseResponse,
    void*            pCallbackParam
);

static Std_ReturnType Crypto_Ipw_SendMsg
(
    const uint8                 u8MuInstance,
    const uint8                 u8MuChannel,
    hseSrvDescriptor_t* const   pHseSrvDescriptor,
    Crypto_JobType* const       pJob
);

static void Crypto_Ipw_PushJobsFromQueuesToHse
(
    const uint8  u8MuInstance,
    const uint32 u32PartitionId
);

static inline Std_ReturnType Crypto_Ipw_ServiceRequest
(
    const uint8           u8MuInstance,
    const uint8           u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
);

#if (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT)
static inline Std_ReturnType Crypto_Ipw_SaveRestoreContext
(
    const uint8           u8MuInstance,
    const uint8           u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
);
#endif

#if ((STD_ON == CRYPTO_43_HSE_SPT_MAC) && (STD_ON == CRYPTO_43_HSE_KEYS_EXIST))
static inline Std_ReturnType Crypto_Ipw_MacServiceRequest
(
    const uint8           u8MuInstance,
    const uint8           u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
);
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_MAC) && (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)) */

#if((STD_ON == CRYPTO_43_HSE_KEYS_EXIST))
#if((STD_ON == CRYPTO_43_HSE_SPT_SYM_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) ||  \
    (STD_ON == CRYPTO_43_HSE_SPT_RSA)            || (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE)   ||  \
    (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE))
static inline uint32 Crypto_Ipw_GetBitLenFromByteLen
(
    uint32 u32Len
);
#endif /*((STD_ON == CRYPTO_43_HSE_SPT_SYM_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE) ||(STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE))*/

#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC))
static inline uint32 Crypto_Ipw_GetByteLenFromBitLen
(
    uint32 u32Len
);
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) */
#endif /*(STD_ON == CRYPTO_43_HSE_KEYS_EXIST)*/

static inline boolean Crypto_Ipw_IsBitSet
(
    uint8 u8BitField,
    uint8 u8Bit
);

#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)
static inline uint32 Crypto_Ipw_NumberOfBytesForHseFw
(
    uint32 u32BytesToBeProcessed,
    uint8  u8BlockSize
);

static inline uint8 Crypto_Ipw_RemainingBytes
(
    uint32 u32BytesToBeProcessed,
    uint8  u8BlockSize
);
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */
/*==================================================================================================
*                                         LOCAL FUNCTIONS
==================================================================================================*/
#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)
/**
* @brief           Function which return the number of bytes which can be processed by HSE FW in streaming mode
* @details         Number of bytes which can be processed by HSE depends by block size
*
* @param[in]       u32BytesToBeProcessed     Number of bytes which shall be processed
* @param[in]       u8BlockSize               Block size supported by HSE FW
*
* @returns         uint8                     Number of bytes which can be processed by HSE FW
*/
static inline uint32 Crypto_Ipw_NumberOfBytesForHseFw
(
    uint32 u32BytesToBeProcessed,
    uint8  u8BlockSize
)
{
    uint32 u32RetVal = 0u;
    
    if (u8BlockSize != 0u)
    {
        u32RetVal = (u32BytesToBeProcessed / u8BlockSize) * u8BlockSize;
    }
    else
    {
        /* This should never be reached because block size can not be 0 */
    }
    
    return u32RetVal;
}

/**
* @brief           Function which return the number of bytes which can not be processed by HSE FW in streaming mode
* @details         Number of bytes which can not be processed by HSE depends by block size
*
* @param[in]       u32BytesToBeProcessed     Number of bytes which shall be processed
* @param[in]       u8BlockSize               Block size supported by HSE FW
*
* @returns         uint8                     Number of bytes which can be processed by HSE FW
*/
static inline uint8 Crypto_Ipw_RemainingBytes
(
    uint32 u32BytesToBeProcessed,
    uint8  u8BlockSize
)
{
    uint8 u8RetVal = 0u;
    
    if (u8BlockSize != 0u)
    {
        u8RetVal = (uint8)( u32BytesToBeProcessed % u8BlockSize );
    }
    else
    {
        /* This should never be reached because block size can not be 0 */
    }
    
    return u8RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */

#if (CPU_TYPE == CPU_TYPE_64)
#ifndef HSE_SPT_64BIT_ADDR
static uint32 Crypto_Ipw_UInt64ToUInt32(uint64 ui64)
{
    Crypto_Ipw_GenericRegisterType reg;
    uint32 ui32;
    reg.ui64[0] = ui64;

    /* Check for endianness */
    if((ui64 & 0xFF) != reg.ui8[0])
    {
        ui32 = reg.ui32[1];
    }
    else
    {
        ui32 = reg.ui32[0];
    }

    return ui32;
}
#endif /* HSE_SPT_64BIT_ADDR */
#endif /* (CPU_TYPE == CPU_TYPE_64) */

/**
* @brief           Fills the verifyPtr for Signature Verification, MAC Verify and AEAD Decrypt jobs
* @details         Fills the verifyPtr (CRYPTO_E_VER_OK or CRYPTO_E_VER_NOT_OK) for Signature Verification, MAC Verify and AEAD Decrypt jobs. This function is needed because the HSE descriptors do not provide such field (verifyPtr).
*
* @param[in]       pCryptoJob:   Pointer to Crypto job
* @param[inout]    pStdRetVal:   Pointer to Std_ReturnType translated response received from HSE
*
* @returns         void
*/
static void Crypto_Ipw_FillVerifyPtr
(
    const Crypto_JobType* pCryptoJob,
    Std_ReturnType* const pStdRetVal
)
{
    Crypto_ServiceInfoType eCryptoService = pCryptoJob->jobPrimitiveInfo->primitiveInfo->service;

    if (
        (CRYPTO_MACVERIFY       == eCryptoService)
#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC))
        ||
        (CRYPTO_SIGNATUREVERIFY == eCryptoService)
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) */
#if (STD_ON == CRYPTO_43_HSE_SPT_AEAD)
        ||
        (CRYPTO_AEADDECRYPT     == eCryptoService)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_AEAD) */
       )
    {
        if ((Std_ReturnType)E_OK == *pStdRetVal)
        {
            *pCryptoJob->jobPrimitiveInputOutput.verifyPtr = CRYPTO_E_VER_OK;
        }
        else
        {
            /* Check what type of error was repored by the firmware */
            if ((Std_ReturnType)CRYPTO_43_HSE_RET_VERIFY_FAILED == *pStdRetVal)
            {
                /* The firmware reported that the mac or signature is not valid, return E_OK in order for upper layers to check verifyPtr */
                *pStdRetVal = (Std_ReturnType)E_OK;
            }
            /* Mark the mac or signature verification as failed */
            *pCryptoJob->jobPrimitiveInputOutput.verifyPtr = CRYPTO_E_VER_NOT_OK;
        }
    }
}
#if ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) || (STD_ON == CRYPTO_43_HSE_SPT_HASH))

/**
* @brief           Configures the mode for HSE (start, update, finish, singlecall)
* @details         Configures the mode for HSE (start, update, finish, singlecall).
*
* @param[in]       eAccessMode: Mode needed by the job
*
* @returns         Corresponding mode of HSE
*                   HSE_ACCESS_MODE_START    - start mode configured
*                   HSE_ACCESS_MODE_UPDATE   - update mode configured
*                   HSE_ACCESS_MODE_FINISH   - finish mode configured
*                   HSE_ACCESS_MODE_ONE_PASS - singlecall operation configured
*/
static inline hseAccessMode_t Crypto_Ipw_ConfigureAccessMode
(
    const Crypto_OperationModeType eAccessMode
)
{
    hseAccessMode_t RetVal;

    switch (eAccessMode)
    {
        case CRYPTO_OPERATIONMODE_SINGLECALL:
            RetVal = HSE_ACCESS_MODE_ONE_PASS;
            break;

        case CRYPTO_OPERATIONMODE_START:
            RetVal = HSE_ACCESS_MODE_START;
            break;

        case CRYPTO_OPERATIONMODE_UPDATE:
            RetVal = HSE_ACCESS_MODE_UPDATE;
            break;

        case CRYPTO_OPERATIONMODE_STREAMSTART:
            /* According to HSE interface files,
               HSE_ACCESS_MODE_START behaves like CRYPTO_OPERATIONMODE_STREAMSTART (except AEAD services)
               If valid inputs and output parameters are provided in Crypto_JobType object. */
            RetVal = HSE_ACCESS_MODE_START;
            break;

        case CRYPTO_OPERATIONMODE_FINISH:
            RetVal = HSE_ACCESS_MODE_FINISH;
            break;

        default:
            RetVal = HSE_ACCESS_MODE_ONE_PASS;
            break;
    }

    return RetVal;
}
#endif /* ((STD_ON == CRYPTO_43_HSE_KEYS_EXIST) || (STD_ON == CRYPTO_43_HSE_SPT_HASH)) */

/**
* @brief           Function that allocates job id to stream
* @details         Assign jobId to stream if it is available
*
* @param[in]       u32ObjectIdx:  Index of the Crypto Driver Object where the job to alloc stream to came from
* @param[in]       pJob:          Pointer to the job to be processed
*
* @returns         uint8: The index of the available stream or CRYPTO_IPW_INVALID_STREAM_ID_U8 if there are no available streams
*/
static inline uint8 Crypto_Ipw_AllocStream
(
    const uint32          u32ObjectIdx,
    const Crypto_JobType* pJob
)
{
    uint8  u8Counter;
    uint8  u8StreamId = CRYPTO_IPW_INVALID_STREAM_ID_U8;


    /* Loop first through all streams searching if one already allocated for the current job can be found */
    for (u8Counter = 0U; u8Counter < HSE_STREAM_COUNT; u8Counter++)
    {
        if ((TRUE == Crypto_Ipw_IsBitSet(Crypto_Ipw_u8StreamBusyBitMap, u8Counter))     &&
            (u32ObjectIdx == Crypto_Ipw_aStreamStatus[u8Counter].u32CdoIdx) &&
            (pJob->jobId  == Crypto_Ipw_aStreamStatus[u8Counter].u32JobId)
           )
        {
            u8StreamId = u8Counter;
            break;
        }
    }

    /* Crypto_Ipw_aStreamStatus[] is a global variable.
       For this reason we need a critical section in order to make atomic the operation of read-modify-write for this variable */
    SchM_Enter_Crypto_43_HSE_CRYPTO_EXCLUSIVE_AREA_03();

    /* If no already allocated stream matching the jobId of the current job was found, loop again through all streams,
       searching this time one that is free (not already allocated) */
    if(CRYPTO_IPW_INVALID_STREAM_ID_U8 == u8StreamId)
    {
        for (u8Counter = 0U; u8Counter < HSE_STREAM_COUNT; u8Counter++)
        {
            if (FALSE == Crypto_Ipw_IsBitSet(Crypto_Ipw_u8StreamBusyBitMap, u8Counter))
            {
                Crypto_Ipw_aStreamStatus[u8Counter].u32CdoIdx = u32ObjectIdx;
                Crypto_Ipw_aStreamStatus[u8Counter].u32JobId  = (uint32)pJob->jobId;
                Crypto_Ipw_u8StreamBusyBitMap |= ((uint8)1 << u8Counter);
                u8StreamId = u8Counter;
#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)
                Crypto_Ipw_aRestrictionRemovalStreaming[u8Counter].u32NoOfBackupBytes = 0u;
                Crypto_Ipw_aRestrictionRemovalStreaming[u8Counter].u32OffsetRemainingBytes = 0u;
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */            
                break;
            }
        }
    }

    SchM_Exit_Crypto_43_HSE_CRYPTO_EXCLUSIVE_AREA_03();

    return u8StreamId;
}

/**
* @brief           Function that clear stream slot status
* @details         Set stream slot status to not used
*
* @param[in]       u32ObjectIdx: Index of the Crypto Driver Object where the job to free stream for came from
* @param[in]       u32JobId:     Configured JobId
*
* @returns         void
*/
static inline void Crypto_Ipw_FreeStream
(
    const uint32 u32ObjectIdx,
    uint32       u32JobId
)
{
    uint8 u8Counter;

    /* Crypto_Ipw_aStreamStatus[] is a global variable.
       For this reason we need a critical section in order to make atomic the operation of read-modify-write for this variable */
    SchM_Enter_Crypto_43_HSE_CRYPTO_EXCLUSIVE_AREA_04();

    /* Loop through all streams searching if one already allocated for the current job can be found. Free it if found */
    for (u8Counter = 0U; u8Counter < HSE_STREAM_COUNT; u8Counter++)
    {
        if ((TRUE == Crypto_Ipw_IsBitSet(Crypto_Ipw_u8StreamBusyBitMap, u8Counter))     &&
            (u32ObjectIdx == Crypto_Ipw_aStreamStatus[u8Counter].u32CdoIdx) &&
            (u32JobId     == Crypto_Ipw_aStreamStatus[u8Counter].u32JobId)
           )
        {
            Crypto_Ipw_u8StreamBusyBitMap &=  (uint8)~((uint8)1 << u8Counter);
#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)            
            Crypto_Ipw_aRestrictionRemovalStreaming[u8Counter].u32NoOfBackupBytes = 0u;
            Crypto_Ipw_aRestrictionRemovalStreaming[u8Counter].u32OffsetRemainingBytes = 0u;
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */
            break;
        }
    }

    SchM_Exit_Crypto_43_HSE_CRYPTO_EXCLUSIVE_AREA_04();
}

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
#if (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN)

/**
* @brief           Convert Ecc Nist OID to Curve Id
* @details         This function will parse OID data and return the Ecc Curve Id
*
* @param[in]       pCurveOid         : Curve OID element array
*
* @returns         uint8             : Curve Id value
*/

static inline uint8 Crypto_Ipw_ConvertNistOidToCurveId_OidLength8
(
    const uint8* pCurveOid
)
{
    uint8   u8RetEccCurveId = HSE_EC_CURVE_NONE;
    boolean bCompareResult;

#if ((STD_ON == CRYPTO_43_HSE_SPT_SECP256R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP192R1))
    /* Below is the OID array whose first 7 bytes are same for 256R1 and 192R1, only the last byte is different*/
    static const uint8 Crypto_Ipw_au8EccNistSecp192_256Oid[7U]     = {0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01};

    /* Check if the OID configured by user is equal to Nist Secp 256 OID */
    bCompareResult = Crypto_43_HSE_Util_MemCmp(pCurveOid, Crypto_Ipw_au8EccNistSecp192_256Oid, 7U);
    if (TRUE == bCompareResult)
    {
        switch(pCurveOid[7U])
        {
            #if(STD_ON == CRYPTO_43_HSE_SPT_SECP256R1)
            /* OID bytes for NIST P-256 standard curves {0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07} */
            case CRYPTO_IPW_NIST_SECP256R1_OID_UNIQUE_VALUE:
                u8RetEccCurveId = HSE_EC_SEC_SECP256R1;
                break;
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP256R1) */

            #if(STD_ON == CRYPTO_43_HSE_SPT_SECP192R1)
            /* OID bytes for NIST P-192 standard curves {0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x01} */
            case CRYPTO_IPW_NIST_SECP192R1_OID_UNIQUE_VALUE:
                u8RetEccCurveId = HSE_EC_SEC_SECP192R1;
                break;
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP192R1) */

            default:
                u8RetEccCurveId = HSE_EC_CURVE_NONE;
                break;
        }
    }
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP256R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP192R1) */

    return u8RetEccCurveId;
}

/**
* @brief           Convert Ecc Nist OID to Curve Id
* @details         This function will parse OID data and return the Ecc Curve Id
*
* @param[in]       pCurveOid         : Curve OID element array
*
* @returns         uint8             : Curve Id value
*/

static inline uint8 Crypto_Ipw_ConvertNistOidToCurveId_OidLength5
(
    const uint8* pCurveOid
)
{
    uint8   u8RetEccCurveId = HSE_EC_CURVE_NONE;
    boolean bCompareResult;

#if((STD_ON == CRYPTO_43_HSE_SPT_SECP224R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP384R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP521R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP192K1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP224K1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP256K1))
    /* Below is the OID array whose first 7 bytes are same for 224R1, 384R1, 521R1, 192K1, 224K1 and 256R1, only the last byte is different*/
    static const uint8 Crypto_Ipw_au8EccNistSecp192_224_256_384_521Oid[4U] = {0x2B, 0x81, 0x04, 0x00};

    /* Check if the OID configured by user is equal to Nist Secp 256 OID */
    bCompareResult = Crypto_43_HSE_Util_MemCmp(pCurveOid, Crypto_Ipw_au8EccNistSecp192_224_256_384_521Oid, 4U);
    if (TRUE == bCompareResult)
    {
        switch(pCurveOid[4U])
        {
            #if (STD_ON == CRYPTO_43_HSE_SPT_SECP521R1)
            /* OID bytes for NIST P-521R1 curve {0x2B, 0x81, 0x04, 0x00, 0x23} */
            case CRYPTO_IPW_NIST_SECP521R1_OID_UNIQUE_VALUE:
                u8RetEccCurveId = HSE_EC_SEC_SECP521R1;
                break;
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP521R1) */

            #if (STD_ON == CRYPTO_43_HSE_SPT_SECP384R1)
            /* OID bytes for NIST P-384R1 curve {0x2B, 0x81, 0x04, 0x00, 0x22} */
            case CRYPTO_IPW_NIST_SECP384R1_OID_UNIQUE_VALUE :
                u8RetEccCurveId = HSE_EC_SEC_SECP384R1;
                break;
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP384R1) */

            #if (STD_ON == CRYPTO_43_HSE_SPT_SECP224R1)
            /* OID bytes for NIST P-224R1 curve {0x2B, 0x81, 0x04, 0x00, 0x21} */
            case CRYPTO_IPW_NIST_SECP224R1_OID_UNIQUE_VALUE:
                u8RetEccCurveId = HSE_EC_SEC_SECP224R1;
                break;
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP224R1) */

            #if (STD_ON == CRYPTO_43_HSE_SPT_SECP256K1)
            /* OID bytes for NIST P-256K1 curve {0x2B, 0x81, 0x04, 0x00, 0x0A} */
            case CRYPTO_IPW_NIST_SECP256K1_OID_UNIQUE_VALUE:
                u8RetEccCurveId = HSE_EC_SEC_SECP256K1;
                break;
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP256K1) */

            #if (STD_ON == CRYPTO_43_HSE_SPT_SECP224K1)
            /* OID bytes for NIST P-224K1 curve {0x2B, 0x81, 0x04, 0x00, 0x20} */
            case CRYPTO_IPW_NIST_SECP224K1_OID_UNIQUE_VALUE:
                u8RetEccCurveId = HSE_EC_SEC_SECP224K1;
                break;
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP224K1) */

            #if (STD_ON == CRYPTO_43_HSE_SPT_SECP192K1)
            /* OID bytes for NIST P-192K1 curve {0x2B, 0x81, 0x04, 0x00, 0x1F} */
            case CRYPTO_IPW_NIST_SECP192K1_OID_UNIQUE_VALUE :
                u8RetEccCurveId = HSE_EC_SEC_SECP192K1;
                break;
            #endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP192K1) */

            default:
                u8RetEccCurveId = HSE_EC_CURVE_NONE;
                break;
        }
    }
#endif /*((STD_ON == CRYPTO_43_HSE_SPT_SECP224R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP384R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP521R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP192K1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP224K1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP256K1))*/

    return u8RetEccCurveId;

}

/**
* @brief           Convert Ecc Nist OID to Curve Id
* @details         This function will parse OID data and return the Ecc Curve Id
*
* @param[in]       pCurveOid         : Curve OID element array
* @param[in]       u32CurveOidLength : Curve OID Length
*
* @returns         uint8             : Curve Id value
*/
static inline uint8 Crypto_Ipw_ConvertNistOidToCurveId
(
    const uint8* pCurveOid,
    const uint32 u32CurveOidLength
)
{
    uint8   u8RetEccCurveId = HSE_EC_CURVE_NONE;

    switch (u32CurveOidLength)
    {
#if (STD_ON == CRYPTO_43_HSE_SPT_SECP256R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP192R1)
        case CRYPTO_IPW_NIST_SECP_192R1_256R1_SIZE_U8:
           u8RetEccCurveId=Crypto_Ipw_ConvertNistOidToCurveId_OidLength8(pCurveOid);
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP256R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP192R1) */

#if((STD_ON == CRYPTO_43_HSE_SPT_SECP224R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP384R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP521R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP192K1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP224K1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP256K1))
        case CRYPTO_IPW_NIST_SECP_192K1_224K1_224R1_256K1_384R1_521R1_SIZE_U8:
            u8RetEccCurveId=Crypto_Ipw_ConvertNistOidToCurveId_OidLength5(pCurveOid);
            break;
#endif /*((STD_ON == CRYPTO_43_HSE_SPT_SECP224R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP384R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP521R1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP192K1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP224K1) || (STD_ON == CRYPTO_43_HSE_SPT_SECP256K1))*/

        default:
            u8RetEccCurveId = HSE_EC_CURVE_NONE;
            break;
    }

    return u8RetEccCurveId;
}

/**
* @brief           Convert Ecc BrainPool OID to Curve Id
* @details         This function will parse OID data and return the Ecc Curve Id
*
* @param[in]       pCurveOid         : Curve OID element array
* @param[in]       u32CurveOidLength : Curve OID Length
*
* @returns         uint8             : Curve Id value
*/
static inline uint8 Crypto_Ipw_ConvertBrainPoolOidToCurveId
(
    const uint8* pCurveOid,
    const uint32 u32CurveOidLength
)
{
    uint8   u8RetEccCurveId = HSE_EC_CURVE_NONE;
#if(STD_ON == (CRYPTO_43_HSE_SPT_BRAINPOOLP192R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP224R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP256R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP320R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP384R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP512R1 || \
               CRYPTO_43_HSE_SPT_BRAINPOOLP192T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP224T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP256T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP320T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP384T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP512T1))

    boolean bCompareResult;
    uint8   u8VersionId;
    /* OID bytes for ECC Branipool standard curves */
    static const uint8 Crypto_Ipw_au8EccBrainpoolOid[CRYPTO_IPW_BRAINPOOL_OID_VERSION_SIZE_U8] = {0x2B, 0x24, 0x03, 0x03, 0x02, 0x08, 0x01, 0x01};

    if (CRYPTO_IPW_BRAINPOOL_OID_OBJ_ID_SIZE_U8 == u32CurveOidLength)
    {
        /* Compare the first common 8 bytes from Brainpool OID */
        bCompareResult = Crypto_43_HSE_Util_MemCmp(pCurveOid, Crypto_Ipw_au8EccBrainpoolOid, CRYPTO_IPW_BRAINPOOL_OID_VERSION_SIZE_U8);

        if (TRUE == bCompareResult)
        {
            /* Take last byte from Oid and set curve id */
            u8VersionId = pCurveOid[CRYPTO_IPW_BRAINPOOL_OID_VERSION_SIZE_U8];

            switch (u8VersionId)
            {
#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP192R1)
                case CRYPTO_IPW_BRAINPOOLP192R1_OBJECT_ID_U8:
                    u8RetEccCurveId = HSE_EC_BRAINPOOL_BRAINPOOLP192R1;
                    break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP192R1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP192T1)
                case CRYPTO_IPW_BRAINPOOLP192T1_OBJECT_ID_U8:
                    u8RetEccCurveId = HSE_EC_BRAINPOOL_BRAINPOOLP192T1;
                    break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP192T1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224R1)
                case CRYPTO_IPW_BRAINPOOLP224R1_OBJECT_ID_U8:
                    u8RetEccCurveId = HSE_EC_BRAINPOOL_BRAINPOOLP224R1;
                    break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224R1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224T1)
                case CRYPTO_IPW_BRAINPOOLP224T1_OBJECT_ID_U8:
                    u8RetEccCurveId = HSE_EC_BRAINPOOL_BRAINPOOLP224T1;
                    break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224T1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256R1)
                case CRYPTO_IPW_BRAINPOOLP256R1_OBJECT_ID_U8:
                    u8RetEccCurveId = HSE_EC_BRAINPOOL_BRAINPOOLP256R1;
                    break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256R1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256T1)
                case CRYPTO_IPW_BRAINPOOLP256T1_OBJECT_ID_U8:
                    u8RetEccCurveId = HSE_EC_BRAINPOOL_BRAINPOOLP256T1;
                    break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256T1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320R1)
                case CRYPTO_IPW_BRAINPOOLP320R1_OBJECT_ID_U8:
                    u8RetEccCurveId = HSE_EC_BRAINPOOL_BRAINPOOLP320R1;
                    break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320R1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320T1)
                case CRYPTO_IPW_BRAINPOOLP320T1_OBJECT_ID_U8:
                    u8RetEccCurveId = HSE_EC_BRAINPOOL_BRAINPOOLP320T1;
                    break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320T1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384R1)
                case CRYPTO_IPW_BRAINPOOLP384R1_OBJECT_ID_U8:
                    u8RetEccCurveId = HSE_EC_BRAINPOOL_BRAINPOOLP384R1;
                    break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384R1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384T1)
                case CRYPTO_IPW_BRAINPOOLP384T1_OBJECT_ID_U8:
                    u8RetEccCurveId = HSE_EC_BRAINPOOL_BRAINPOOLP384T1;
                    break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384T1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512R1)
                case CRYPTO_IPW_BRAINPOOLP512R1_OBJECT_ID_U8:
                    u8RetEccCurveId = HSE_EC_BRAINPOOL_BRAINPOOLP512R1;
                    break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512R1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512T1)
                case CRYPTO_IPW_BRAINPOOLP512T1_OBJECT_ID_U8:
                    u8RetEccCurveId = HSE_EC_BRAINPOOL_BRAINPOOLP512T1;
                    break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512T1) */

                default:
                    u8RetEccCurveId = HSE_EC_CURVE_NONE;
                    break;
            }
        }
    }
#else
     /* Avoid compiler warnings */
    (void)pCurveOid;
    (void)u32CurveOidLength;
#endif /* STD_ON == (CRYPTO_43_HSE_SPT_BRAINPOOLP192R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP224R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP256R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP320R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP384R1 || CRYPTO_43_HSE_SPT_BRAINPOOLP512R1 || \
                       CRYPTO_43_HSE_SPT_BRAINPOOLP192T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP224T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP256T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP320T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP384T1 || CRYPTO_43_HSE_SPT_BRAINPOOLP512T1) */
    return u8RetEccCurveId;
}

/**
* @brief           Convert Ecc ED25519 OID to Curve Id
* @details         This function will parse OID data and return the Ecc Curve Id
*
* @param[in]       pCurveOid         : Curve OID element array
* @param[in]       u32CurveOidLength : Curve OID Length
*
* @returns         uint8             : Curve Id value
*/
static inline uint8 Crypto_Ipw_ConvertEd25519OidToCurveId
(
    const uint8* pCurveOid,
    const uint32 u32CurveOidLength
)
{
    uint8   u8RetEccCurveId = HSE_EC_CURVE_NONE;
#if ((STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519) || (STD_ON == CRYPTO_43_HSE_SPT_EC25519_CURVE25519) || (STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519PH))
    boolean bCompareResult;
#if ((STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519) || (STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519PH))
    /*OID bytes for ED25519 standard curves */
    static const uint8 Crypto_Ipw_au8EccEd25519Oid[CRYPTO_IPW_25519_ED25519_SIZE_U8]       = {0x2B, 0x06, 0x01, 0x04, 0x01, 0xDA, 0x47, 0x0F, 0x01};
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519) || (STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519PH)) */

#if (STD_ON == CRYPTO_43_HSE_SPT_EC25519_CURVE25519)
    /*OID bytes for CURVE25519 standard curves */
    static const uint8 Crypto_Ipw_au8EccCurve25519Oid[CRYPTO_IPW_25519_CURVE25519_SIZE_U8] = {0x2B, 0x06, 0x01, 0x04, 0x01, 0x97, 0x55, 0x01, 0x05, 0x01};
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC25519_CURVE25519) */

    switch (u32CurveOidLength)
    {
#if ((STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519) || (STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519PH))
        case CRYPTO_IPW_25519_ED25519_SIZE_U8:
            /* Check if the OID configured by user is equal to ED25519 OID */
            bCompareResult = Crypto_43_HSE_Util_MemCmp(pCurveOid, Crypto_Ipw_au8EccEd25519Oid, u32CurveOidLength);

            if (TRUE == bCompareResult)
            {
                u8RetEccCurveId = HSE_EC_25519_ED25519;
            }
            break;
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519) || (STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519PH)) */

#if (STD_ON == CRYPTO_43_HSE_SPT_EC25519_CURVE25519)
        case CRYPTO_IPW_25519_CURVE25519_SIZE_U8:
            /* Check if the OID configured by user is equal to CURVE25519 OID */
            bCompareResult = Crypto_43_HSE_Util_MemCmp(pCurveOid, Crypto_Ipw_au8EccCurve25519Oid, u32CurveOidLength);

            if (TRUE == bCompareResult)
            {
                u8RetEccCurveId = HSE_EC_25519_CURVE25519;
            }
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC25519_CURVE25519) */

        default:
            u8RetEccCurveId = HSE_EC_CURVE_NONE;
            break;
    }

    /* Avoid compiler warnings */
    (void)bCompareResult;
#else
    /* Avoid compiler warnings */
    (void)pCurveOid;
    (void)u32CurveOidLength;
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519) || (STD_ON == CRYPTO_43_HSE_SPT_EC25519_CURVE25519) || (STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519PH)) */

    return u8RetEccCurveId;
}

/**
* @brief           Convert Ecc ED448 OID to Curve Id
* @details         This function will parse OID data and return the Ecc Curve Id
*
* @param[in]       pCurveOid         : Curve OID element array
* @param[in]       u32CurveOidLength : Curve OID Length
*
* @returns         uint8             : Curve Id value
*/
static inline uint8 Crypto_Ipw_ConvertEd448OidToCurveId
(
    const uint8* pCurveOid,
    const uint32 u32CurveOidLength
)
{
    uint8   u8RetEccCurveId = HSE_EC_CURVE_NONE;
#if ((STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448) || (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448))
    boolean bCompareResult;
#if (STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448)
    /*OID bytes for ED448 standard curves */
    static const uint8 Crypto_Ipw_au8EccEd448Oid[CRYPTO_IPW_448_ED448_CURVE448_SIZE_U8]       = {0x2B, 0x65, 0x71};
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448) */

#if (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448)
    /*OID bytes for CURVE448 standard curves */
    static const uint8 Crypto_Ipw_au8EccCurve448Oid[CRYPTO_IPW_448_ED448_CURVE448_SIZE_U8] = {0x2B, 0x65, 0x6F};
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448) */

    if (CRYPTO_IPW_448_ED448_CURVE448_SIZE_U8 == u32CurveOidLength)
    {
#if (STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448)
        /* Check if the OID configured by user is equal to ED448 OID */
        bCompareResult = Crypto_43_HSE_Util_MemCmp(pCurveOid, Crypto_Ipw_au8EccEd448Oid, u32CurveOidLength);

        if (TRUE == bCompareResult)
        {
            u8RetEccCurveId = HSE_EC_448_ED448;
        }
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448) */

#if (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448)
        if (FALSE == bCompareResult)
        {
            /* Check if the OID configured by user is equal to CURVE448 OID */
            bCompareResult = Crypto_43_HSE_Util_MemCmp(pCurveOid, Crypto_Ipw_au8EccCurve448Oid, u32CurveOidLength);

            if (TRUE == bCompareResult)
            {
                u8RetEccCurveId = HSE_EC_448_CURVE448;
            }
        }
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448) */
    }
#else
    /* Avoid compiler warnings */
    (void)pCurveOid;
    (void)u32CurveOidLength;
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448) || (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448)) */

    return u8RetEccCurveId;
}

/**
* @brief           Get ECC curve id
* @details         This function will return the curve id from OID
*
* @param[in]       u32EccCurveOidKeyElemIdx: Curve Oid element index
* @param[in]       u8EccCurveAlgoFam       : Curve Oid Algorithm Family
*
* @returns         uint8                   : Curve Id value
*/
static inline uint8 Crypto_Ipw_GetEccCurveId
(
    const uint32 u32EccCurveOidKeyElemIdx,
    const uint8  u8EccCurveAlgoFam
)
{
    const uint8* pCurveOid         = Crypto_43_HSE_aKeyElementList[u32EccCurveOidKeyElemIdx].pCryptoElementArray;
    const uint32 u32CurveOidLength = *Crypto_43_HSE_aKeyElementList[u32EccCurveOidKeyElemIdx].pu32CryptoElementActualSize;
    uint8        u8RetEccCurveId   = HSE_EC_CURVE_NONE;

    switch (u8EccCurveAlgoFam)
    {
        case (uint8)CRYPTO_ALGOFAM_ECCNIST:
            u8RetEccCurveId = Crypto_Ipw_ConvertNistOidToCurveId(pCurveOid,u32CurveOidLength);
            break;

        case (uint8)CRYPTO_ALGOFAM_BRAINPOOL:
            u8RetEccCurveId = Crypto_Ipw_ConvertBrainPoolOidToCurveId(pCurveOid, u32CurveOidLength);
            break;

        case (uint8)CRYPTO_ALGOFAM_ED25519:
        /*Intentional Fall-Through*/
        case CRYPTO_43_HSE_ALGOFAM_CUSTOM_ED25519PH:
            u8RetEccCurveId = Crypto_Ipw_ConvertEd25519OidToCurveId(pCurveOid, u32CurveOidLength);
            break;

        case (uint8)CRYPTO_43_HSE_ALGOFAM_CUSTOM_ED448:
            u8RetEccCurveId = Crypto_Ipw_ConvertEd448OidToCurveId(pCurveOid, u32CurveOidLength);
            break;

        default:
            u8RetEccCurveId = HSE_EC_CURVE_NONE;
            break;
    }

    return u8RetEccCurveId;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN))
/**
* @brief           Function that returns bit length of key
* @details         Returns bit length of a key based on the elliptic curve ID
*
* @param[in]       u16CurveId: ID of elliptic curve
*
* @returns         uint16:     Length of key
*/
static inline uint16 Crypto_Ipw_EccKeyBitLen
(
    uint16 u16CurveId
)
{
    uint16 u16RetKeyBitLen;

    switch (u16CurveId)
    {
#if ((STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519) || (STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519PH))
        case HSE_EC_25519_ED25519:
            u16RetKeyBitLen = 256U;
            break;
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519) || (STD_ON == CRYPTO_43_HSE_SPT_EC25519_ED25519PH)) */

#if (STD_ON == CRYPTO_43_HSE_SPT_EC25519_CURVE25519)
        case HSE_EC_25519_CURVE25519:
            u16RetKeyBitLen = 256U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC25519_CURVE25519) */

#if (STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448)
        case HSE_EC_448_ED448:
            u16RetKeyBitLen = 456U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448) */

#if (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448)
        case HSE_EC_448_CURVE448:
            u16RetKeyBitLen = 448U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448) */

#if (STD_ON == CRYPTO_43_HSE_SPT_SECP256R1)
        case HSE_EC_SEC_SECP256R1:
            u16RetKeyBitLen = 256U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP256R1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_SECP384R1)
        case HSE_EC_SEC_SECP384R1:
            u16RetKeyBitLen = 384U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP384R1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_SECP521R1)
        case HSE_EC_SEC_SECP521R1:
            u16RetKeyBitLen = 521U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP521R1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_SECP192R1)
        case HSE_EC_SEC_SECP192R1:
            u16RetKeyBitLen = 192U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP192R1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_SECP224R1)
        case HSE_EC_SEC_SECP224R1:
            u16RetKeyBitLen = 224U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP224R1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_SECP192K1)
        case HSE_EC_SEC_SECP192K1:
            u16RetKeyBitLen = 192U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP192K1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_SECP224K1)
        case HSE_EC_SEC_SECP224K1:
            u16RetKeyBitLen = 224U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP224K1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_SECP256K1)
        case HSE_EC_SEC_SECP256K1:
            u16RetKeyBitLen = 256U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SECP256K1) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP192R1) || (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP192T1))
        case HSE_EC_BRAINPOOL_BRAINPOOLP192R1:
        case HSE_EC_BRAINPOOL_BRAINPOOLP192T1:
            u16RetKeyBitLen = 192U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP192R1) || (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP192T1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224R1)
        case HSE_EC_BRAINPOOL_BRAINPOOLP224R1:
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224R1) */
#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224T1)
        case HSE_EC_BRAINPOOL_BRAINPOOLP224T1:
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224T1) */
#if ((STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224R1) || (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224T1))
            u16RetKeyBitLen = 224U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224R1) || (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP224T1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256R1)
        case HSE_EC_BRAINPOOL_BRAINPOOLP256R1:
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256R1) */
#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256T1)
        case HSE_EC_BRAINPOOL_BRAINPOOLP256T1:
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256T1) */
#if ((STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256R1) || (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256T1))
            u16RetKeyBitLen = 256U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256R1) || (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP256T1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320R1)
        case HSE_EC_BRAINPOOL_BRAINPOOLP320R1:
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320R1) */
#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320T1)
        case HSE_EC_BRAINPOOL_BRAINPOOLP320T1:
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320T1) */
#if ((STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320R1) || (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320T1))
            u16RetKeyBitLen =  320U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320R1) || (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP320T1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384R1)
        case HSE_EC_BRAINPOOL_BRAINPOOLP384R1:
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384R1) */
#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384T1)
        case HSE_EC_BRAINPOOL_BRAINPOOLP384T1:
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384T1) */
#if ((STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384R1) || (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384T1))
            u16RetKeyBitLen =  384U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384R1) || (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP384T1) */

#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512R1)
        case HSE_EC_BRAINPOOL_BRAINPOOLP512R1:
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512R1) */
#if (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512T1)
        case HSE_EC_BRAINPOOL_BRAINPOOLP512T1:
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512T1) */
#if ((STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512R1) || (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512T1))
            u16RetKeyBitLen =  512U;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512R1) || (STD_ON == CRYPTO_43_HSE_SPT_BRAINPOOLP512T1) */

        default:
            u16RetKeyBitLen = 0U;
            break;
    }

    return u16RetKeyBitLen;
}
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN)) */

/**
* @brief           Configure algorithm mode
* @details         Map autosar algorithm mode to HSE data structure
*
* @param[in]       uint8: Autosar job algorithm mode
*
* @returns         hseCipherBlockMode_t: HSE block mode
*/
static inline hseCipherBlockMode_t Crypto_Ipw_ConfigureAlgoMode
(
    uint8 u8AlgoMode
)
{
    hseCipherBlockMode_t RetVal;

    switch (u8AlgoMode)
    {
#if (STD_ON == CRYPTO_43_HSE_SPT_AES_ECB)
        case (uint8)CRYPTO_ALGOMODE_ECB:
            RetVal = HSE_CIPHER_BLOCK_MODE_ECB;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_AES_ECB) */

#if (STD_ON == CRYPTO_43_HSE_SPT_AES_CBC)
        case (uint8)CRYPTO_ALGOMODE_CBC:
            RetVal = HSE_CIPHER_BLOCK_MODE_CBC;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_AES_CBC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_AES_CFB)
        case (uint8)CRYPTO_ALGOMODE_CFB:
            RetVal = HSE_CIPHER_BLOCK_MODE_CFB;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_AES_CFB) */

#if (STD_ON == CRYPTO_43_HSE_SPT_AES_CTR)
        case (uint8)CRYPTO_ALGOMODE_CTR:
            RetVal = HSE_CIPHER_BLOCK_MODE_CTR;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_AES_CTR) */

#if (STD_ON == CRYPTO_43_HSE_SPT_AES_OFB)
        case (uint8)CRYPTO_ALGOMODE_OFB:
            RetVal = HSE_CIPHER_BLOCK_MODE_OFB;
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_AES_OFB) */

        default:
            RetVal = HSE_CIPHER_BLOCK_MODE_NULL;
            break;
    }

    return RetVal;
}

#if (STD_ON == CRYPTO_43_HSE_SPT_HMAC)
/**
* @brief           Fills the HMAC generate descriptor
* @details         Configures the HSE HMAC generate descriptor
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       HashAlgo:             Translates AUTOSAR hash Algo into available HSE hash algo
* @param[in]       u8StreamId:           Identifier of the HSE stream used for the job
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: keyId not existent, IV (if needed)
*/
static inline Std_ReturnType Crypto_Ipw_HmacGen
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    hseHashAlgo_t         HashAlgo,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
)
{
    hseMacSrv_t*   pMacGenCmd      = &(pHseSrvDescriptor->hseSrv.macReq);
    Std_ReturnType RetVal          = (Std_ReturnType)E_NOT_OK;
    uint32         u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(pJob->cryptoKeyId);
    uint32         u32KeyMaterialKeyElemIdx;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    /* Update the selected IOs or redirect if required to */
    Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

    /* Check parameter cryptoKeyId is out of range */
    if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
    {
        u32KeyMaterialKeyElemIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);

        if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32KeyMaterialKeyElemIdx)
        {
            pHseSrvDescriptor->srvId                = HSE_SRV_ID_MAC;
            pMacGenCmd->sgtOption                   = HSE_SGT_OPTION_NONE;
            pMacGenCmd->streamId                    = u8StreamId;
            pMacGenCmd->macScheme.macAlgo           = HSE_MAC_ALGO_HMAC;
            pMacGenCmd->macScheme.sch.hmac.hashAlgo = HashAlgo;
            pMacGenCmd->accessMode                  = Crypto_Ipw_ConfigureAccessMode (pJob->jobPrimitiveInputOutput.mode);
            pMacGenCmd->authDir                     = HSE_AUTH_DIR_GENERATE;
            pMacGenCmd->keyHandle                   = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;
            pMacGenCmd->inputLength                 = (uint32)(*jobPrimitiveIOUpdate.pInputLength);
            pMacGenCmd->pInput                      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));
            /* [SWS_Crypto_00071] Output buffer length and output buffer are available only at finish step */
            if ((uint8)CRYPTO_OPERATIONMODE_FINISH == (uint8)(((uint8)(pJob->jobPrimitiveInputOutput.mode)) & CRYPTO_IPW_OPERATIONMODE_FINISH_MASK_U8))
            {
                pMacGenCmd->pTag                    = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));
                pMacGenCmd->pTagLength              = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutputLength));
            }
            RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
            /* Mark the request as sent */
            *pbReqSentOverChannel = TRUE;
        }
    }
    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_CMAC) || (STD_ON == CRYPTO_43_HSE_SPT_XCBCMAC)
/**
* @brief           Fills the CMAC or XCBCMAC generate descriptor
* @details         Configures the HSE CMAC or XCBCMAC generate descriptor
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       u8StreamId:           Identifier of the HSE stream used for the job
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: keyId not existent, IV(if needed)
*/
static inline Std_ReturnType Crypto_Ipw_CmacXcbcMacGenerate
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
)
{
    hseMacSrv_t*   pMacGenCmd      = &(pHseSrvDescriptor->hseSrv.macReq);
    Std_ReturnType RetVal          = (Std_ReturnType)E_NOT_OK;
#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)
    uint32 u32ReceivedSize, u32NoOfBytesToHse;
#endif /* #if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */
    uint32         u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(pJob->cryptoKeyId);
    uint32         u32KeyMaterialKeyElemIdx;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    /* Update the selected IOs or redirect if required to */
    Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

    /* Check parameter cryptoKeyId is out of range*/
    if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
    {
        u32KeyMaterialKeyElemIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);

        if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32KeyMaterialKeyElemIdx)
        {
            pHseSrvDescriptor->srvId = HSE_SRV_ID_MAC;

            /* Choosing CMAC or XCBCMAC */
            if (CRYPTO_ALGOMODE_CMAC == pJob->jobPrimitiveInfo->primitiveInfo->algorithm.mode)
            {
                pMacGenCmd->macScheme.macAlgo             = HSE_MAC_ALGO_CMAC;
                pMacGenCmd->macScheme.sch.cmac.cipherAlgo = HSE_CIPHER_ALGO_AES;
            }
            else
            {
                pMacGenCmd->macScheme.macAlgo             = HSE_MAC_ALGO_XCBC_MAC;
                /* XCBC MAC supports only AES128 */
            }
            pMacGenCmd->streamId    = u8StreamId;
            pMacGenCmd->accessMode  = Crypto_Ipw_ConfigureAccessMode (pJob->jobPrimitiveInputOutput.mode);
            pMacGenCmd->authDir     = HSE_AUTH_DIR_GENERATE;
            pMacGenCmd->keyHandle   = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;
            pMacGenCmd->sgtOption   = HSE_SGT_OPTION_NONE;

#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)
            if(pJob->jobPrimitiveInputOutput.mode != CRYPTO_OPERATIONMODE_SINGLECALL) 
            {
                /*  Streaming mode only */
                u32ReceivedSize = (uint32)*jobPrimitiveIOUpdate.pInputLength;
                
                /* Check if there are data for START or UPDATE mode */
                if ( (u32ReceivedSize <= (CRYPTO_IPW_BACKUP_BUFFER_SIZE - Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes)) && (pJob->jobPrimitiveInputOutput.mode != CRYPTO_OPERATIONMODE_FINISH) )
                {
                    /* Get multiple of block size from input length plus number of bakup bytes */
                    u32NoOfBytesToHse = Crypto_Ipw_NumberOfBytesForHseFw(u32ReceivedSize + Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes, CRYPTO_IPW_CMAC_BLOCK_SIZE);
                    
                    /* Check if input length is bigger than block size */
                    if (u32NoOfBytesToHse > 0u )
                    {
                        /* Shift the remaining data from previous request on position 0 in the backup buffer */
                        Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[0u], &Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32OffsetRemainingBytes], Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes);
                        /* Copy the received data into backup buffer after bytes from previous request */
                        Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes], jobPrimitiveIOUpdate.pInput, u32ReceivedSize);
                        
                        /* Set the backup buffer as input for CMAC Gen function */            
                        pMacGenCmd->pInput = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[0u]));
                        /* Set the input length for CMAC Gen function */
                        pMacGenCmd->inputLength = u32NoOfBytesToHse;
                        
                        /*Save the offset for the reamining bytes for the next request */
                        Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32OffsetRemainingBytes = u32NoOfBytesToHse;
                        /* Save the number of reamining bytes which were not sent to HSE FW for the next request */
                        Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes = Crypto_Ipw_RemainingBytes(u32ReceivedSize + Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes, CRYPTO_IPW_CMAC_BLOCK_SIZE);
                        
                        /* Sent the request to HSE */
                        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
                        /* Mark the request as sent */
                        *pbReqSentOverChannel = TRUE;
                    }
                    /* The input length is zero or less than block size */
                    else
                    {
                        /* Shift the remaining data from previous request on position 0 in the backup buffer */
                        Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[0u], &Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32OffsetRemainingBytes], Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes);
                        /* Copy the received data into backup buffer after bytes from previous request */
                        Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes], jobPrimitiveIOUpdate.pInput, u32ReceivedSize);
                        /* Save the number of reamining bytes which can not be sent to HSE FW */
                        Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes = Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes + (uint8)u32ReceivedSize;
                        
                        if (pJob->jobPrimitiveInputOutput.mode == CRYPTO_OPERATIONMODE_START)
                        {
                            pMacGenCmd->pInput = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[0u]));
                            pMacGenCmd->inputLength = 0u;
                            RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);  
                        }
                        /* pJob->jobPrimitiveInputOutput.mode == CRYPTO_OPERATIONMODE_UPDATE */
                        else
                        {
                            /* HSE does not accept length 0 in operation mode UPDATE */
                            /* These bytes were save earlier and just give positive answer without sending a request to HSE */
                            RetVal = E_OK;  

                            /* Release the allocated channel */
                            Hse_Ip_ReleaseChannel(u8MuInstance, u8MuChannel);                                                        
                        }
                        /* Reset the offset since there are no bytes to be sent to HSE */
                        Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32OffsetRemainingBytes = 0u;
                        /* Mark the request as sent */
                        *pbReqSentOverChannel = TRUE;
                    }
                }
                /* Check if finish stage arrived */ 
                /* [SWS_Crypto_00071] Output buffer length and output buffer are available only at finish step */
                else if ( (pJob->jobPrimitiveInputOutput.mode == CRYPTO_OPERATIONMODE_FINISH) && (u32ReceivedSize <= (CRYPTO_IPW_BACKUP_BUFFER_SIZE - Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes)) )
                {                    
                    /* Shift the remaining data from previous request on position 0 in the backup buffer */
                    Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[0u], &Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32OffsetRemainingBytes], Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes);
                    /* Copy the received data into backup buffer after bytes from previous request */
                    Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes], jobPrimitiveIOUpdate.pInput, u32ReceivedSize);       
                    
                    Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32OffsetRemainingBytes = 0u;
                    
                    pMacGenCmd->inputLength = Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes + u32ReceivedSize;
                    pMacGenCmd->pInput      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[0u]));
                    pMacGenCmd->pTag       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));
                    pMacGenCmd->pTagLength = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutputLength));
                    RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
                    /* Mark the request as sent */
                    *pbReqSentOverChannel = TRUE; 
                    Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes = 0u;
                }
                else
                {
                    /* Update mode with length of 0 is not allowed */
                    RetVal = E_NOT_OK;
                }
            }
            else
            {
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */
                pMacGenCmd->pInput      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));
                pMacGenCmd->inputLength = (uint32)(*jobPrimitiveIOUpdate.pInputLength);
                pMacGenCmd->pTag       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));
                pMacGenCmd->pTagLength = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutputLength));
                RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
                /* Mark the request as sent */
                *pbReqSentOverChannel = TRUE;
#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)
            }
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */
        }
    }

    return RetVal;
}

/**
* @brief           Fills the CMAC or XCBCMAC verify descriptor
* @details         Configures the HSE CMAC or XCBCMAC verify descriptor
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       u8StreamId:           Identifier of the HSE stream used for the job
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: keyId not existent, IV(if needed)
*/
static inline Std_ReturnType Crypto_Ipw_CmacXcbcMacVerify
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
)
{
    Std_ReturnType RetVal          = (Std_ReturnType)E_NOT_OK;
    uint32         u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx_GetKeyElementIdx(pJob->cryptoKeyId, CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32, CRYPTO_1_GET_KEY_IDX_CALL);
    uint32         u32KeyMaterialKeyElemIdx;
    hseMacSrv_t*   pMacVerCmd;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    /* Check parameter cryptoKeyId is out of range*/
    if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
    {
        u32KeyMaterialKeyElemIdx = Crypto_43_HSE_Util_GetKeyIdx_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32, CRYPTO_0_GET_KEY_ELEMENT_IDX_CALL);

        /* Update the selected IOs or redirect if required to */
        Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

        pHseSrvDescriptor->srvId = HSE_SRV_ID_MAC;
        pMacVerCmd               = &(pHseSrvDescriptor->hseSrv.macReq);

        if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32KeyMaterialKeyElemIdx)
        {
            /* Choose CMAC or XCBCMAC */
            if (CRYPTO_ALGOMODE_CMAC == pJob->jobPrimitiveInfo->primitiveInfo->algorithm.mode)
            {
                pMacVerCmd->macScheme.macAlgo             = HSE_MAC_ALGO_CMAC;
                pMacVerCmd->macScheme.sch.cmac.cipherAlgo = HSE_CIPHER_ALGO_AES;
            }
            else
            {
                pMacVerCmd->macScheme.macAlgo             = HSE_MAC_ALGO_XCBC_MAC;
                /* XCBC MAC supports only AES128 */
            }
            pMacVerCmd->accessMode  = Crypto_Ipw_ConfigureAccessMode (pJob->jobPrimitiveInputOutput.mode);
            pMacVerCmd->streamId    = u8StreamId;
            pMacVerCmd->authDir     = HSE_AUTH_DIR_VERIFY;
            pMacVerCmd->keyHandle   = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;
            pMacVerCmd->inputLength = (uint32)(*jobPrimitiveIOUpdate.pInputLength);
            pMacVerCmd->pInput      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));
#if (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)
            if ((NULL_PTR != pJob->jobRedirectionInfoRef) && Crypto_43_HSE_Util_IsRedirectionSet(pJob->jobRedirectionInfoRef->redirectionConfig, CRYPTO_REDIRECT_CONFIG_SECONDARY_INPUT))
            {
                /* In case of redirection of secondary input, the Crypto driver will take the secondaryInputLength parameter from the redirected key element, where it is measured in bytes
                   Need to initialize the state machine variable storing the number of bytes with the number of bytes from the redirected keyElement*/
                Crypto_Ipw_apMuState[u8MuInstance]->au32MacVerifyInputLenInBytes[u8MuChannel] = ((uint32)(*jobPrimitiveIOUpdate.pSecondaryInputLength));
            }
            else
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT) */
            {
                /* In case of no redirection of secondary input, the Crypto driver will take the secondaryInputLength parameter from the received MacVerify job, where it is measured in bits
                   Need to initialize the state machine variable storing the number of bytes with the number of bits from the job divided by 8 */
                 Crypto_Ipw_apMuState[u8MuInstance]->au32MacVerifyInputLenInBytes[u8MuChannel] = ((uint32)(*jobPrimitiveIOUpdate.pSecondaryInputLength)) / 8U;
            }
            /* Pass to the HSE FW the address of the state machine variable instead of the adress of the job member */
            pMacVerCmd->pTagLength  = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&(Crypto_Ipw_apMuState[u8MuInstance]->au32MacVerifyInputLenInBytes[u8MuChannel])));
            pMacVerCmd->pTag        = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pSecondaryInput));
            pMacVerCmd->sgtOption   = HSE_SGT_OPTION_NONE;

            RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
            /* Mark the request as sent */
            *pbReqSentOverChannel = TRUE;
        }
    }
    /* [SWS_Crypto_00071] Fill verifyPtr at FINISH */
    if ((CRYPTO_PROCESSING_SYNC == pJob->jobPrimitiveInfo->processingType) && ((uint8)CRYPTO_OPERATIONMODE_FINISH == (uint8)(((uint8)(pJob->jobPrimitiveInputOutput.mode)) & CRYPTO_IPW_OPERATIONMODE_FINISH_MASK_U8)))
    {
        /* If the job is synchronous, fill the VerifyPtr in case the primitive was MacVerify or AEAD Decrypt */
        Crypto_Ipw_FillVerifyPtr(pJob, &RetVal);
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_CMAC) || (STD_ON == CRYPTO_43_HSE_SPT_XCBCMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_FAST_CMAC)
/**
* @brief           Fills the FAST CMAC generate descriptor
* @details         Configures the HSE Fast CMAC descriptor for MAC generation or verification
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       HseAuthDir:           HSE_AUTH_DIR_GENERATE or HSE_AUTH_DIR_VERIFY
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: keyId not existent, IV(if needed)
*/
static inline Std_ReturnType Crypto_Ipw_FastCmac
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    hseAuthDir_t          HseAuthDir,
    boolean*              pbReqSentOverChannel
)
{
    hseFastCMACSrv_t* pFastCmacSrv    = &(pHseSrvDescriptor->hseSrv.fastCmacReq);
    Std_ReturnType    RetVal          = (Std_ReturnType)E_NOT_OK;
    uint32            u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(pJob->cryptoKeyId);
    uint32            u32KeyMaterialKeyElemIdx;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    /* Update the selected IOs or redirect if required to */
    Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

    if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
    {
        u32KeyMaterialKeyElemIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);

        if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32KeyMaterialKeyElemIdx)
        {
            pHseSrvDescriptor->srvId     = HSE_SRV_ID_FAST_CMAC;

            pFastCmacSrv->authDir        = HseAuthDir;
            pFastCmacSrv->keyHandle      = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;
            pFastCmacSrv->pInput         = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));

            /* The need for the presence of the preprocessor if-else directive below comes from the fact that the FastCmac service is designed in HSE FW to work with lengths measured in bits.
               The ASR CSM spec states in SWS_Csm_01009 that the inputLength is measured in bytes and also outputLengthPtr is measured in bytes.
               The if-else below was added in code in order to support in the Crypto driver both cases when the inputLength parameter of a received FastCmac job is measured in bytes or bits. */
#if (STD_ON == CRYPTO_43_HSE_LENGTHS_FOR_FASTCMAC_JOBS_USE_BITS)
            /* The Crypto driver will consider that the inputLength parameter of a received FastCmac job is measured in bits.
               Because pJob->jobPrimitiveInputOutput.inputLength comes from CSM in bits and HSE FW expects the input length in bits, the information can be passed directly to HSE FW */
            pFastCmacSrv->inputBitLength = (uint32)(*jobPrimitiveIOUpdate.pInputLength);
#else
            /* The Crypto driver will consider that the inputLength parameter of a received FastCmac job is measured in bytes.
               Because pJob->jobPrimitiveInputOutput.inputLength comes from CSM in bytes and HSE FW expects the input length in bits, make the conversion from bytes to bits */
            pFastCmacSrv->inputBitLength = ((uint32)(*jobPrimitiveIOUpdate.pInputLength) * 8U);
#endif /* (STD_ON == CRYPTO_43_HSE_LENGTHS_FOR_FASTCMAC_JOBS_USE_BYTES) */

            if (HSE_AUTH_DIR_GENERATE == HseAuthDir)
            {
                pFastCmacSrv->pTag         = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pJob->jobPrimitiveInputOutput.outputPtr));

                /* [SWS_Crypto_00135] If the crypto primitive requires a buffer for the result, its memory location is referred by the pointer job->jobPrimitiveInput.outputPtr. On calling this function,
                job->jobPrimitiveInput.outputLengthPtr shall contain the size of the associated buffer. When the request has finished, the actual length of the returned value shall be stored. */
                /* Considering the requirement above and the fact that if the requested tag length exceeds the value of 128 bits, it will anyway be truncated by HSE FW to 128 bits, the length of the tag
                will be adjusted below, in case it is larger than 128 bits, before being sent to HSE FW */
                if((*(pJob->jobPrimitiveInputOutput.outputLengthPtr)) > CRYPTO_IPW_FASTCMAC_MAX_TAG_LEN_U8)
                {
                    *(pJob->jobPrimitiveInputOutput.outputLengthPtr) = CRYPTO_IPW_FASTCMAC_MAX_TAG_LEN_U8;
                }

                /* The need for the presence of the preprocessor if-else directive below comes from the fact that the FastCmac service is designed in HSE FW to work with lengths measured in bits.
                   The ASR CSM spec states in SWS_Csm_01009 that the inputLength is measured in bytes and also outputLengthPtr is measured in bytes.
                   The if-else below was added in code in order to support in the Crypto driver both cases when the outputLengthPtr parameter of a received FastCmac job is measured in bytes or bits. */
#if (STD_ON == CRYPTO_43_HSE_LENGTHS_FOR_FASTCMAC_JOBS_USE_BITS)
                /* The Crypto driver will consider that the outputLengthPtr parameter of a received FastCmac job is measured in bits.
                   Because pJob->jobPrimitiveInputOutput.outputLengthPtr comes from CSM in bits and HSE FW expects the tag length in bits, the information can be passed directly to HSE FW */
                pFastCmacSrv->tagBitLength = (uint8)(*(pJob->jobPrimitiveInputOutput.outputLengthPtr));
#else
                /* The Crypto driver will consider that the outputLengthPtr parameter of a received FastCmac job is measured in bytes.
                   Because pJob->jobPrimitiveInputOutput.outputLengthPtr comes from CSM in bytes and HSE FW expects the tag length in bits, make the conversion from bytes to bits */
                pFastCmacSrv->tagBitLength = (uint8)((*(pJob->jobPrimitiveInputOutput.outputLengthPtr)) * 8U);
#endif /* (STD_ON == CRYPTO_43_HSE_LENGTHS_FOR_FASTCMAC_JOBS_USE_BYTES) */
            }
            else
            {
                pFastCmacSrv->pTag         = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pSecondaryInput));
                pFastCmacSrv->tagBitLength = (uint8)(*jobPrimitiveIOUpdate.pSecondaryInputLength);
            }
            RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
            /* Mark the request as sent */
            *pbReqSentOverChannel = TRUE;
        }
    }

    if (HSE_AUTH_DIR_VERIFY == HseAuthDir)
    {
        /* If the job is synchronous, fill the VerifyPtr */
        Crypto_Ipw_FillVerifyPtr(pJob, &RetVal);
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_FAST_CMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_GMAC)
/**
* @brief           Fills the GMAC generate descriptor
* @details         Configures the HSE GMAC generate descriptor
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       u8StreamId:           Identifier of the HSE stream used for the job
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: keyId not existent, IV(if needed)
*/
static inline Std_ReturnType Crypto_Ipw_GmacGenerate
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
)
{
    hseMacSrv_t*   pMacGenCmd;
    Std_ReturnType RetVal          = (Std_ReturnType)E_OK;
    uint32         u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(pJob->cryptoKeyId);
    uint32         u32CipherIvKeyElemIdx;
    uint32         u32CryptoKeyMaterialIdx;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    /* Update the selected IOs or redirect if required to */
    Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

    /* Check parameter cryptoKeyId is out of range*/
    if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
    {
        u32CryptoKeyMaterialIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);

        /* Search for IV, if not found return an error */
        if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyMaterialIdx)
        {
            u32CipherIvKeyElemIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_KE_CIPHER_IV);

            if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CipherIvKeyElemIdx)
            {
                pMacGenCmd = &(pHseSrvDescriptor->hseSrv.macReq);
                pMacGenCmd->macScheme.sch.gmac.pIV      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(Crypto_43_HSE_aKeyElementList[u32CipherIvKeyElemIdx].pCryptoElementArray));
                pMacGenCmd->macScheme.sch.gmac.ivLength =                     *Crypto_43_HSE_aKeyElementList[u32CipherIvKeyElemIdx].pu32CryptoElementActualSize;
            }
            else
            {
                RetVal = (Std_ReturnType)E_NOT_OK;
            }
        }
        else
        {
            RetVal = (Std_ReturnType)E_NOT_OK;
        }

        if ((Std_ReturnType)E_OK == RetVal)
        {
            pHseSrvDescriptor->srvId      = HSE_SRV_ID_MAC;
            pMacGenCmd->accessMode        = Crypto_Ipw_ConfigureAccessMode (pJob->jobPrimitiveInputOutput.mode);
            pMacGenCmd->macScheme.macAlgo = HSE_MAC_ALGO_GMAC;
            pMacGenCmd->streamId          = u8StreamId;
            pMacGenCmd->authDir           = HSE_AUTH_DIR_GENERATE;
            pMacGenCmd->keyHandle         = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32CryptoKeyMaterialIdx].u32HseKeyHandle;
            pMacGenCmd->inputLength       = (uint32)(*jobPrimitiveIOUpdate.pInputLength);
            pMacGenCmd->pInput            = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));
            pMacGenCmd->sgtOption         = HSE_SGT_OPTION_NONE;

            if ((uint8)CRYPTO_OPERATIONMODE_FINISH == (uint8)(((uint8)(pJob->jobPrimitiveInputOutput.mode)) & CRYPTO_IPW_OPERATIONMODE_FINISH_MASK_U8))
            {
                pMacGenCmd->pTag         = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));
                pMacGenCmd->pTagLength   = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutputLength));
            }
            RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
            /* Mark the request as sent */
            *pbReqSentOverChannel = TRUE;
        }
    }
    else
    {
        RetVal = (Std_ReturnType)E_NOT_OK;
    }

    return RetVal;
}

/**
* @brief           Fills the GMAC verify descriptor
* @details         Configures the HSE GMAC verify descriptor
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       u8StreamId:           Identifier of the HSE stream used for the job
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: keyId not existent, IV(if needed)
*/
static inline Std_ReturnType Crypto_Ipw_GmacVerify
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
)
{
    hseMacSrv_t*   pMacVerCmd      = &(pHseSrvDescriptor->hseSrv.macReq);
    Std_ReturnType RetVal          = (Std_ReturnType)E_OK;
    uint32         u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(pJob->cryptoKeyId);
    uint32         u32CipherIvKeyElemIdx;
    uint32         u32CryptoKeyMaterialIdx = CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

        /* Check parameter cryptoKeyId is out of range*/
    if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
    {
        u32CryptoKeyMaterialIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);

        /* Update the selected IOs or redirect if required to */
        Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

        /* Search for IV, if not found return an error */
        if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 !=  u32CryptoKeyMaterialIdx)
        {
            u32CipherIvKeyElemIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_KE_CIPHER_IV);

            if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 !=  u32CipherIvKeyElemIdx)
            {
                pMacVerCmd->macScheme.sch.gmac.pIV      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(Crypto_43_HSE_aKeyElementList[u32CipherIvKeyElemIdx].pCryptoElementArray));
                pMacVerCmd->macScheme.sch.gmac.ivLength =                     *Crypto_43_HSE_aKeyElementList[u32CipherIvKeyElemIdx].pu32CryptoElementActualSize;
            }
            else
            {
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
        RetVal = (Std_ReturnType)E_NOT_OK;
    }

    if ((Std_ReturnType)E_OK == RetVal)
    {
        pHseSrvDescriptor->srvId      = HSE_SRV_ID_MAC;
        pMacVerCmd->accessMode        = Crypto_Ipw_ConfigureAccessMode (pJob->jobPrimitiveInputOutput.mode);
        pMacVerCmd->streamId          = u8StreamId;
        pMacVerCmd->macScheme.macAlgo = HSE_MAC_ALGO_GMAC;
        pMacVerCmd->authDir           = HSE_AUTH_DIR_VERIFY;
        pMacVerCmd->keyHandle         = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32CryptoKeyMaterialIdx].u32HseKeyHandle;
        pMacVerCmd->inputLength       = (uint32)(*jobPrimitiveIOUpdate.pInputLength);
        pMacVerCmd->pInput            = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));
#if (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)
        if ((NULL_PTR != pJob->jobRedirectionInfoRef) && Crypto_43_HSE_Util_IsRedirectionSet(pJob->jobRedirectionInfoRef->redirectionConfig, CRYPTO_REDIRECT_CONFIG_SECONDARY_INPUT))
        {
            /* In case of redirection of secondary input, the Crypto driver will take the secondaryInputLength parameter from the redirected key element, where it is measured in bytes
               Need to initialize the state machine variable storing the number of bytes with the number of bytes from the redirected keyElement*/
            Crypto_Ipw_apMuState[u8MuInstance]->au32MacVerifyInputLenInBytes[u8MuChannel] = ((uint32)(*jobPrimitiveIOUpdate.pSecondaryInputLength));
        }
        else
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT) */
        {
            /* In case of no redirection of secondary input, the Crypto driver will take the secondaryInputLength parameter from the received MacVerify job, where it is measured in bits
               Need to initialize the state machine variable storing the number of bytes with the number of bits from the job divided by 8 */
             Crypto_Ipw_apMuState[u8MuInstance]->au32MacVerifyInputLenInBytes[u8MuChannel] = ((uint32)(*jobPrimitiveIOUpdate.pSecondaryInputLength)) / 8U;
        }
        /* Pass to the HSE FW the address of the state machine variable instead of the adress of the job member */
        pMacVerCmd->pTagLength = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&(Crypto_Ipw_apMuState[u8MuInstance]->au32MacVerifyInputLenInBytes[u8MuChannel])));
        pMacVerCmd->pTag       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pSecondaryInput));
        pMacVerCmd->sgtOption  = HSE_SGT_OPTION_NONE;

        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
        /* Mark the request as sent */
        *pbReqSentOverChannel = TRUE;
    }
    if ((CRYPTO_PROCESSING_SYNC == pJob->jobPrimitiveInfo->processingType) && ((uint8)CRYPTO_OPERATIONMODE_FINISH == (uint8)(((uint8)(pJob->jobPrimitiveInputOutput.mode)) & CRYPTO_IPW_OPERATIONMODE_FINISH_MASK_U8)))
    {
        /* If the job is synchronous, fill the VerifyPtr in case the primitive was MacGenerate or AEAD Decrypt */
        Crypto_Ipw_FillVerifyPtr(pJob, &RetVal);
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_GMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_HMAC)
/**
* @brief           Fills the HMAC verify descriptor
* @details         Configures the HSE HMAC verify descriptor
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       HashAlgo:             Translates AUTOSAR hash Algo into available HSE hash algo
* @param[in]       u8StreamId:           Identifier of the HSE stream used for the job
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: keyId not existent, IV(if needed)
*/
static inline Std_ReturnType Crypto_Ipw_HmacVerify
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    hseHashAlgo_t         HashAlgo,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
)
{
    uint32         u32CryptoKeyMaterialIdx;
    hseMacSrv_t*   pMacVerCmd         = &(pHseSrvDescriptor->hseSrv.macReq);
    Std_ReturnType RetVal             = (Std_ReturnType)E_NOT_OK;
    uint32         u32CryptoKeyIdx    = Crypto_43_HSE_Util_GetKeyIdx(pJob->cryptoKeyId);
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    /* Update the selected IOs or redirect if required to */
    Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

    /* Check parameter cryptoKeyId is out of range*/
    if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
    {
        u32CryptoKeyMaterialIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);

        if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyMaterialIdx)
        {
            pHseSrvDescriptor->srvId                = HSE_SRV_ID_MAC;
            pMacVerCmd->streamId                    = u8StreamId;   /* Only 0 or 1 possible - maximum 2 jobs in paralel*/
            pMacVerCmd->macScheme.macAlgo           = HSE_MAC_ALGO_HMAC;
            pMacVerCmd->macScheme.sch.hmac.hashAlgo = HashAlgo;
            pMacVerCmd->accessMode                  = Crypto_Ipw_ConfigureAccessMode (pJob->jobPrimitiveInputOutput.mode);
            pMacVerCmd->authDir                     = HSE_AUTH_DIR_VERIFY;
            pMacVerCmd->keyHandle                   = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32CryptoKeyMaterialIdx].u32HseKeyHandle;
            pMacVerCmd->inputLength                 = (uint32)(*jobPrimitiveIOUpdate.pInputLength);
            pMacVerCmd->pInput                      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));
            pMacVerCmd->pTag                        = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pSecondaryInput));
#if (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)
            if ((NULL_PTR != pJob->jobRedirectionInfoRef) && Crypto_43_HSE_Util_IsRedirectionSet(pJob->jobRedirectionInfoRef->redirectionConfig, CRYPTO_REDIRECT_CONFIG_SECONDARY_INPUT))
            {
                /* In case of redirection of secondary input, the Crypto driver will take the secondaryInputLength parameter from the redirected key element, where it is measured in bytes
                   Need to initialize the state machine variable storing the number of bytes with the number of bytes from the redirected keyElement*/
                Crypto_Ipw_apMuState[u8MuInstance]->au32MacVerifyInputLenInBytes[u8MuChannel] = ((uint32)(*jobPrimitiveIOUpdate.pSecondaryInputLength));
            }
            else
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT) */
            {
                /* In case of no redirection of secondary input, the Crypto driver will take the secondaryInputLength parameter from the received MacVerify job, where it is measured in bits
                   Need to initialize the state machine variable storing the number of bytes with the number of bits from the job divided by 8 */
                 Crypto_Ipw_apMuState[u8MuInstance]->au32MacVerifyInputLenInBytes[u8MuChannel] = ((uint32)(*jobPrimitiveIOUpdate.pSecondaryInputLength)) / 8U;
            }
            /* Pass to the HSE FW the address of the state machine variable instead of the adress of the job member */
            pMacVerCmd->pTagLength                  = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&(Crypto_Ipw_apMuState[u8MuInstance]->au32MacVerifyInputLenInBytes[u8MuChannel])));
            pMacVerCmd->sgtOption                   = HSE_SGT_OPTION_NONE;

            RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
            /* Mark the request as sent */
            *pbReqSentOverChannel = TRUE;
        }
    }
    /* [SWS_Crypto_00071] Fill verifyPtr at FINISH */
    if ((CRYPTO_PROCESSING_SYNC == pJob->jobPrimitiveInfo->processingType) && ((uint8)CRYPTO_OPERATIONMODE_FINISH == (uint8)(((uint8)(pJob->jobPrimitiveInputOutput.mode)) & CRYPTO_IPW_OPERATIONMODE_FINISH_MASK_U8)))
    {
        /* If the job is synchronous, fill the VerifyPtr in case the primitive was MacGenerate or AEAD Decrypt */
        Crypto_Ipw_FillVerifyPtr(pJob, &RetVal);
    }
    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_AEAD)
/**
* @brief           Fills the AEAD encrypt descriptor
* @details         Configures the AEAD encrypt descriptor
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       u8StreamId:           Allocated stream ID
* @param[in]       CipherDir:            Choose between encrypt / decrypt
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: keyId not existent
*/
static inline Std_ReturnType Crypto_Ipw_AeadEncDec
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    hseCipherDir_t        CipherDir,
    boolean*              pbReqSentOverChannel
)
{
    hseAeadSrv_t*  pAeadCmd        = &(pHseSrvDescriptor->hseSrv.aeadReq);
    Std_ReturnType RetVal          = (Std_ReturnType)E_OK;
    uint32         u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(pJob->cryptoKeyId);
    uint32         u32CipherIvKeyElemIdx;
    uint32         u32CryptoKeyMaterialIdx;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    /* Check if u32CryptoKeyIdx is out of range*/
    if(CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
    {
        u32CryptoKeyMaterialIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);
        u32CipherIvKeyElemIdx   = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_KE_CIPHER_IV);

        /* Update the selected IOs or redirect if required to */
        Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

        /* Check if a key material element and a initialization vector element was found for the current job key */
        if ((CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyMaterialIdx) && (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CipherIvKeyElemIdx))
        {
            /* Check if there is input data to be processed. If there is no data to process skip checking the job output buffer length.
               For data processing the output buffer must be big enough for the result */
            if ((0U == *jobPrimitiveIOUpdate.pInputLength) || (*jobPrimitiveIOUpdate.pOutputLength >= *jobPrimitiveIOUpdate.pInputLength))
            {
                pHseSrvDescriptor->srvId      = HSE_SRV_ID_AEAD;
                pAeadCmd->authCipherMode      = HSE_AUTH_CIPHER_MODE_GCM;
                pAeadCmd->cipherDir           = CipherDir;
                pAeadCmd->accessMode          = Crypto_Ipw_ConfigureAccessMode (pJob->jobPrimitiveInputOutput.mode);
                /* Use allocated stream, it will be ignored by firmware for single call */
                pAeadCmd->streamId            = u8StreamId;
                pAeadCmd->keyHandle           = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32CryptoKeyMaterialIdx].u32HseKeyHandle;
                pAeadCmd->pInput              = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));
                pAeadCmd->pOutput             = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));
                 /* The length of the plaintext and ciphertext (in bytes). Zero means authentication only. GCM: It can have any number of bits between 0 & (2^39-256) (use byte equivalent) */
                pAeadCmd->inputLength         = (uint32)(*jobPrimitiveIOUpdate.pInputLength);
                pAeadCmd->pIV                 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(Crypto_43_HSE_aKeyElementList[u32CipherIvKeyElemIdx].pCryptoElementArray));
                pAeadCmd->ivLength            = *Crypto_43_HSE_aKeyElementList[u32CipherIvKeyElemIdx].pu32CryptoElementActualSize;
                pAeadCmd->pAAD                = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pSecondaryInput));
                pAeadCmd->aadLength           = (uint32)(*jobPrimitiveIOUpdate.pSecondaryInputLength);
                pAeadCmd->sgtOption           = HSE_SGT_OPTION_NONE;

                if (HSE_CIPHER_DIR_ENCRYPT == CipherDir)
                {
                    pAeadCmd->pTag            = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pSecondaryOutput));
                    pAeadCmd->tagLength       = (uint32)(*jobPrimitiveIOUpdate.pSecondaryOutputLength);
                }
                else
                {
                    pAeadCmd->pTag            = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pTertiaryInput));
                    pAeadCmd->tagLength       = (uint32)(*jobPrimitiveIOUpdate.pTertiaryInputLength);
                }

                /* [SWS_Crypto_00071], [SWS_Crypto_00135] When the request has finished, the actual length of the returned value shall be stored.
                   User can provide input data even for START step, this is an extension to the [SWS_Crypto_00071] requirement, the user can skip the input data processing at START or FINISH
                   by setting the input length to 0.
                   If the input length is 0 no result will be provided so output length should not be updated. */
                if (0U != *jobPrimitiveIOUpdate.pInputLength)
                {
                    *jobPrimitiveIOUpdate.pOutputLength = *jobPrimitiveIOUpdate.pInputLength;
                }

                RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
                /* Mark the request as sent */
                *pbReqSentOverChannel = TRUE;
            }
            else
            {
                /* SWS_Crypto_00195: If a Crypto Driver API is called and any buffer addressed during the operation is too small, then the operation shall not be performed.
                                     If development error detection for the Crypto Driver is enabled, then the API function shall report CRYPTO_E_SMALL_BUFFER to the DET, else return E_NOT_OK. */
                RetVal = CRYPTO_43_HSE_RET_SMALL_BUFFER;
            }
        }
        else
        {
            RetVal = (Std_ReturnType)E_NOT_OK;
        }
    }
    else
    {
        RetVal = (Std_ReturnType)E_NOT_OK;
    }

    if (HSE_CIPHER_DIR_DECRYPT == CipherDir)
    {
        /* [SWS_Crypto_00071] Fill verifyPtr at FINISH */
        if ((CRYPTO_PROCESSING_SYNC == pJob->jobPrimitiveInfo->processingType) && ((uint8)CRYPTO_OPERATIONMODE_FINISH == (uint8)(((uint8)(pJob->jobPrimitiveInputOutput.mode)) & CRYPTO_IPW_OPERATIONMODE_FINISH_MASK_U8)))
        {
            /* If the job is synchronous, fill the VerifyPtr in case the primitive was MacGenerate or AEAD Decrypt */
            Crypto_Ipw_FillVerifyPtr(pJob, &RetVal);
        }
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_AEAD) */

/**
* @brief           Fills the encrypt/decript  descriptor
* @details         Configures the encrypt/decript descriptor
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       u8CipherDir:          Choose between encrypt / decrypt
* @param[in]       u8StreamId:           Allocated stream ID
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_EncDec
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    hseCipherDir_t        u8CipherDir,
    boolean*              pbReqSentOverChannel
)
{
    hseSymCipherSrv_t*   pSymEncDecCmd           = &(pHseSrvDescriptor->hseSrv.symCipherReq);
    Std_ReturnType       RetVal                  = (Std_ReturnType)E_NOT_OK;
    hseCipherBlockMode_t HseAlgoMode             = Crypto_Ipw_ConfigureAlgoMode((uint8)pJob->jobPrimitiveInfo->primitiveInfo->algorithm.mode);
    boolean              bRequestIsValid         = TRUE;
    uint32               u32CryptoKeyIdx         = Crypto_43_HSE_Util_GetKeyIdx(pJob->cryptoKeyId);
    uint32               u32CryptoKeyMaterialIdx = CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32;
    uint32               u32CipherIvKeyElemIdx;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    pHseSrvDescriptor->srvId  = HSE_SRV_ID_SYM_CIPHER;
    pSymEncDecCmd->accessMode = Crypto_Ipw_ConfigureAccessMode (pJob->jobPrimitiveInputOutput.mode);
    /* Use allocated stream, it will be ignored by firmware for single call */
    pSymEncDecCmd->streamId   = u8StreamId;
    pSymEncDecCmd->sgtOption  = HSE_SGT_OPTION_NONE;

    /* Check parameter cryptoKeyId is out of range*/
    if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
    {
        u32CryptoKeyMaterialIdx   = Crypto_43_HSE_Util_GetKeyIdx_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32, CRYPTO_0_GET_KEY_ELEMENT_IDX_CALL);
    }
    
	if (CRYPTO_ALGOFAM_AES == pJob->jobPrimitiveInfo->primitiveInfo->algorithm.family)
    {
        pSymEncDecCmd->cipherAlgo = HSE_CIPHER_ALGO_AES;
    }
#if(STD_ON == CRYPTO_43_HSE_SPT_TDES)
    else if (CRYPTO_ALGOFAM_3DES == pJob->jobPrimitiveInfo->primitiveInfo->algorithm.family)
    {
        pSymEncDecCmd->cipherAlgo = HSE_CIPHER_ALGO_3DES;
    }
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_TDES) */
    else
    {
        pSymEncDecCmd->cipherAlgo = HSE_CIPHER_ALGO_NULL;
    }

    /* Check if a key material element was found for the current job key */
    if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyMaterialIdx)
    {
        /* Check for IV in case of block mode different than ECB */
        if (CRYPTO_ALGOMODE_ECB != pJob->jobPrimitiveInfo->primitiveInfo->algorithm.mode)
        {
            u32CipherIvKeyElemIdx = Crypto_43_HSE_Util_GetKeyIdx_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_KE_CIPHER_IV, CRYPTO_0_GET_KEY_ELEMENT_IDX_CALL);
            /* Check if a initialization vector element was found for the current job key */
            if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 !=  u32CipherIvKeyElemIdx)
            {
                /* IV length is not required, as it is considered to be always set to 16 bytes */
                pSymEncDecCmd->pIV = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(Crypto_43_HSE_aKeyElementList[u32CipherIvKeyElemIdx].pCryptoElementArray));
            }
            else
            {
                bRequestIsValid = FALSE;
            }
        }
    }
    else
    {
        bRequestIsValid = FALSE;
    }

    /* Update the selected IOs or redirect if required to */
    Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

    /* Check if the request is valid (has all the needed information in place) */
    if (TRUE == bRequestIsValid)
    {
        pSymEncDecCmd->cipherDir       = u8CipherDir;
        pSymEncDecCmd->cipherBlockMode = HseAlgoMode;
        pSymEncDecCmd->inputLength     = (uint32)(*jobPrimitiveIOUpdate.pInputLength);
        pSymEncDecCmd->pInput          = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));
        pSymEncDecCmd->pOutput         = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));
        pSymEncDecCmd->keyHandle       = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32CryptoKeyMaterialIdx].u32HseKeyHandle;

        /* If the input data is provided the output buffer length must be greater or equal to input data length */
        if ((0U == *jobPrimitiveIOUpdate.pInputLength) || (*jobPrimitiveIOUpdate.pOutputLength >= *jobPrimitiveIOUpdate.pInputLength))
        {
            /* If input data has been provided update the value of the output length */
            if (0U != *jobPrimitiveIOUpdate.pInputLength)
            {
                /* [SWS_Crypto_00071], [SWS_Crypto_00135] When the request has finished, the actual length of the returned value shall be stored */
                *jobPrimitiveIOUpdate.pOutputLength = *jobPrimitiveIOUpdate.pInputLength;
            }

            RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
            /* Mark the request as sent */
            *pbReqSentOverChannel = TRUE;
        }
        else
        {
            /* SWS_Crypto_00195: If a Crypto Driver API is called and any buffer addressed during the operation is too small, then the operation shall not be performed.
                                 If development error detection for the Crypto Driver is enabled, then the API function shall report CRYPTO_E_SMALL_BUFFER to the DET, else return E_NOT_OK. */
            RetVal = CRYPTO_43_HSE_RET_SMALL_BUFFER;
        }
    }

    return RetVal;
}

#if (STD_ON == CRYPTO_43_HSE_SPT_XTS_AES)
/**
* @brief           Fills the encrypt/decript descriptor for XTS AES
* @details         Configures the encrypt/decript descriptor for XTS AES
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       u8CipherDir:          Choose between encrypt / decrypt
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                  E_OK: correct configuration of parameters
*                  E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*                  CRYPTO_E_SMALL_BUFFER: provided buffer is to small
*/
static inline Std_ReturnType Crypto_Ipw_XtsEncDec
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    hseCipherDir_t        u8CipherDir,
    boolean*              pbReqSentOverChannel
)
{
    /*Local variables used in this function*/
    uint32                  u32CipherKeyElemIdx;
    uint32                  u32TweakKeyElemIdx;
    uint32                  u32SectorNumberKeyElemIdx;
    uint32                  u32SectorSizeKeyElemIdx;
    hseXtsAesCipherSrv_t*   pXtsEncDecCmd       = &(pHseSrvDescriptor->hseSrv.xtsAesCipherReq);
    Std_ReturnType          RetVal              = (Std_ReturnType)E_NOT_OK;
    uint32                  u32CryptoKeyIdx;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    if(CRYPTO_43_HSE_UTIL_MAX_U32 > u32CryptoJobId)
    {
        u32CryptoKeyIdx     = Crypto_43_HSE_Util_GetKeyIdx(u32CryptoJobId);

        /* Check if the parameter cryptoKeyId is out of range*/
        if(CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
        {
            /*Assign the service ID*/
            pHseSrvDescriptor->srvId  = HSE_SRV_ID_XTS_AES_CIPHER;

            /*Get the Key Element IDs*/
            u32CipherKeyElemIdx       = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);
            u32TweakKeyElemIdx        = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_CIPHER_2NDKEY);
            u32SectorNumberKeyElemIdx = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_43_HSE_KE_SECTOR_NUMBER);
            u32SectorSizeKeyElemIdx   = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_43_HSE_KE_SECTOR_SIZE);

            /*Check if any of the elements are invalid and if the ALGOFAM is iset to AES*/
            if ((CRYPTO_ALGOFAM_AES != pJob->jobPrimitiveInfo->primitiveInfo->algorithm.family)        ||
                (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 == u32CipherKeyElemIdx)        ||
                (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 == u32TweakKeyElemIdx)         ||
                (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 == u32SectorNumberKeyElemIdx)  ||
                (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 == u32SectorSizeKeyElemIdx)
            )
            {
                /*Nothing to do, ALGOFAM or elements invalid*/
            }
            else
            {
                /*The request is valid, continue*/
                /*Update the selected IOs or redirect if required to*/
                Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

                pXtsEncDecCmd->cipherDir       = u8CipherDir;
                pXtsEncDecCmd->inputLength     = (uint32)(*jobPrimitiveIOUpdate.pInputLength);
                pXtsEncDecCmd->pInput          = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));
                pXtsEncDecCmd->pOutput         = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));
                pXtsEncDecCmd->sectorNumber    = *Crypto_43_HSE_aKeyElementList[u32SectorNumberKeyElemIdx].pCryptoElementArray;
                pXtsEncDecCmd->sectorSize      = *Crypto_43_HSE_aKeyElementList[u32SectorSizeKeyElemIdx].pCryptoElementArray;
                pXtsEncDecCmd->cipherKeyHandle = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32CipherKeyElemIdx].u32HseKeyHandle;
                pXtsEncDecCmd->tweakKeyHandle  = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32TweakKeyElemIdx].u32HseKeyHandle;

                /* If the input data is provided the output buffer length must be greater or equal to input data length */
                if((0U == *jobPrimitiveIOUpdate.pInputLength) || (*jobPrimitiveIOUpdate.pOutputLength >= *jobPrimitiveIOUpdate.pInputLength))
                {
                    /*Check if the input length is not 0*/
                    if(0U != *jobPrimitiveIOUpdate.pInputLength)
                    {
                        /* [SWS_Crypto_00071], [SWS_Crypto_00135] When the request has finished, the actual length of the returned value shall be stored */
                        *jobPrimitiveIOUpdate.pOutputLength = *jobPrimitiveIOUpdate.pInputLength;
                    }
                    else
                    {
                        /*If the input length is 0 no result will be provided so output length should not be updated.*/
                    }

                    RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
                    /* Mark the request as sent */
                    *pbReqSentOverChannel = TRUE;
                }
                else
                {
                    /* [SWS_Crypto_00136] Output buffer is not big enough to store the result */
                    RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_SMALL_BUFFER;
                }
            }
        }
        else
        {
            /*Nothing to do, the key ID is invalid*/
        }
    }
    else
    {
        /*Nothing to do, the job ID is invalid*/
    }

    return RetVal;
}
#endif /* STD_ON == CRYPTO_43_HSE_SPT_XTS_AES */

#if (STD_ON == CRYPTO_43_HSE_SPT_RSA)
/**
* @brief           Fills the RSA encrypt/decrypt descriptor
* @details         Configures the RSA encrypt/decrypt descriptor
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       CipherDir:            Choose between encrypt / decrypt
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: keyId not existent
*/
static inline Std_ReturnType Crypto_Ipw_RSAEncDec
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    hseCipherDir_t        CipherDir,
    boolean*              pbReqSentOverChannel
)
{
    hseRsaCipherSrv_t*              pRsaEncDecSrv   = &(pHseSrvDescriptor->hseSrv.rsaCipherReq);
#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
    Crypto_Ipw_HashConfigType       HashAlgo        = Crypto_Ipw_ConfigureHashAlgo((uint8)pJob->jobPrimitiveInfo->primitiveInfo->algorithm.secondaryFamily);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */
    Std_ReturnType                  RetVal          = (Std_ReturnType)E_NOT_OK;
    boolean                         bAlgoFound      = TRUE;
    uint32                          u32CryptoKeyIdx = Crypto_43_HSE_Util_GetKeyIdx(pJob->cryptoKeyId);
    uint32                          u32CryptoKeyMaterialIdx;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    /* Check parameter cryptoKeyId is out of range*/
    if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
    {
        u32CryptoKeyMaterialIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);

        /* Update the selected IOs or redirect if required to */
        Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

        if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CryptoKeyMaterialIdx)
        {
            pHseSrvDescriptor->srvId = HSE_SRV_ID_RSA_CIPHER;
            pRsaEncDecSrv->cipherDir = CipherDir;

            if (CRYPTO_ALGOMODE_RSAES_OAEP == pJob->jobPrimitiveInfo->primitiveInfo->algorithm.mode)
            {
                pRsaEncDecSrv->rsaScheme.rsaAlgo                 = HSE_RSA_ALGO_RSAES_OAEP;
#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
                pRsaEncDecSrv->rsaScheme.sch.rsaOAEP.hashAlgo    = HashAlgo.HseHashAlgo;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */
                if ((0U == *jobPrimitiveIOUpdate.pSecondaryInputLength) ||
                    (NULL_PTR == jobPrimitiveIOUpdate.pSecondaryInput))
                {
                    pRsaEncDecSrv->rsaScheme.sch.rsaOAEP.labelLength = (uint32)0UL;
                    pRsaEncDecSrv->rsaScheme.sch.rsaOAEP.pLabel      = (HOST_ADDR)0U;
                }
                else
                {
                    pRsaEncDecSrv->rsaScheme.sch.rsaOAEP.labelLength = (uint32)(*jobPrimitiveIOUpdate.pSecondaryInputLength);
                    pRsaEncDecSrv->rsaScheme.sch.rsaOAEP.pLabel      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pSecondaryInput));
                }
            }
            else if (CRYPTO_ALGOMODE_RSAES_PKCS1_v1_5 == pJob->jobPrimitiveInfo->primitiveInfo->algorithm.mode)
            {
                pRsaEncDecSrv->rsaScheme.rsaAlgo = HSE_RSA_ALGO_RSAES_PKCS1_V15;
            }
            else
            {
                bAlgoFound = FALSE;
            }
            if (TRUE == bAlgoFound)
            {
                pRsaEncDecSrv->pInput        = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));
                pRsaEncDecSrv->inputLength   = (uint32)(*jobPrimitiveIOUpdate.pInputLength);
                pRsaEncDecSrv->pOutput       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));
                pRsaEncDecSrv->pOutputLength = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutputLength));
                pRsaEncDecSrv->keyHandle     = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32CryptoKeyMaterialIdx].u32HseKeyHandle;

                RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
                /* Mark the request as sent */
                *pbReqSentOverChannel = TRUE;
            }
        }
    }
    return RetVal;
}
#endif /* STD_ON == CRYPTO_43_HSE_SPT_RSA) */

#if (STD_ON == CRYPTO_43_HSE_SPT_SYM_KEY_IMPORT)
/**
* @brief           Fills the import descriptor
* @details         Configures the import descriptor for symetric keys
*
* @param[in]       u8MuInstance:             MU instance where the job will be issued
* @param[in]       u8MuChannel:              MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:        Descriptor to be filled and send to HSE
* @param[in]       u32KeyLength:             Key length defined
* @param[in]       pKeyElement:              Pointer to Key Material
* @param[in]       u32KeyMaterialKeyElemIdx: Index of Key Material
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_LoadSimKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    uint32              u32KeyLength,
    const uint8*        pKeyMaterial,
    uint32              u32KeyMaterialKeyElemIdx
)
{
    hseImportKeySrv_t* pImportKeyReq;
    uint32             u32KeyBitLen;
    Std_ReturnType     RetVal;

    if (CRYPTO_43_HSE_WA_ENCRYPTED == Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].eCryptoKeyElementWriteAccess)
    {
        RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;
    }
    else
    {
        pImportKeyReq     = &(pHseSrvDescriptor->hseSrv.importKeyReq);
        u32KeyBitLen      = Crypto_Ipw_GetBitLenFromByteLen(u32KeyLength);

        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyType      = (hseKeyType_t)Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u8HseKeyType;
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyBitLen    = (uint16)u32KeyBitLen;
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyFlags     =                Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].hseKeyFlags;
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyCounter   =                Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyCounter;
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].smrFlags     = (hseSmrFlags_t)Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeySmrFlags;
#if (STD_ON == CRYPTO_43_HSE_AES_BLOCK_MODE_MASK)
    #ifdef HSE_KU_AES_BLOCK_MODE_ANY
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].specific.aesBlockModeMask = HSE_KU_AES_BLOCK_MODE_ANY; /* Any AES block mode can be used */
    #else
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].specific.aesBlockModeMask = (hseAesBlockModeMask_t)0U; /* Any AES block mode can be used */
    #endif
#endif /* (STD_ON == CRYPTO_43_HSE_AES_BLOCK_MODE_MASK) */
        /* Clear the HseReserved bytes in the keyInfo structure, as HSE FW expects these to be 0 */
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].hseReserved[0U] = 0U;
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].hseReserved[1U] = 0U;

        pHseSrvDescriptor->srvId = HSE_SRV_ID_IMPORT_KEY;

        /* The key import is not encrypted, nor authenticated */
        pImportKeyReq->cipher.cipherKeyHandle     = HSE_INVALID_KEY_HANDLE;
        pImportKeyReq->keyContainer.authKeyHandle = HSE_INVALID_KEY_HANDLE;


        pImportKeyReq->pKeyInfo  = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel]));
        pImportKeyReq->pKey[2]   = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pKeyMaterial[0u]));
        pImportKeyReq->keyLen[2] = (uint16)u32KeyLength;

        pImportKeyReq->targetKeyHandle = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;

        /* Loading a key is always synchronous */
        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SYM_KEY_IMPORT) */

/**
* @brief           Fills the import descriptor
* @details         Configures the import descriptor with custom structure information
*
* @param[in]       u8MuInstance:             MU instance where the job will be issued
* @param[in]       u8MuChannel:              MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:        Descriptor to be filled and send to HSE
* @param[in]       pKeyElement:              Pointer to custom structure
* @param[in]       u32KeyMaterialKeyElemIdx: Index of Key Material
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_ImportCustomKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const uint8*        pKeyMaterial,
    uint32              u32KeyMaterialKeyElemIdx
)
{
    hseImportKeySrv_t*                        pImportKeyReq;
    Std_ReturnType                            RetVal;
    const Crypto_43_HSE_KeyImportExportType* pImportKeyCustomStruct = (const Crypto_43_HSE_KeyImportExportType*)pKeyMaterial;

    pImportKeyReq = &(pHseSrvDescriptor->hseSrv.importKeyReq);

    pHseSrvDescriptor->srvId = HSE_SRV_ID_IMPORT_KEY;

    pImportKeyReq->cipher.cipherKeyHandle     = (hseKeyHandle_t)HSE_INVALID_KEY_HANDLE;
    pImportKeyReq->keyContainer.authKeyHandle = (hseKeyHandle_t)HSE_INVALID_KEY_HANDLE;

    /* Encryption */
    if (CRYPTO_43_HSE_WA_ENCRYPTED == Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].eCryptoKeyElementWriteAccess)
    {
        /* Used mainly to transfer the cipher scheme data to the correct HSE union. */
        switch (pImportKeyCustomStruct->Encryption.SelEncryptionScheme)
        {
            case CRYPTO_43_HSE_ENC_SCHEME_SYM:
                pImportKeyReq->cipher.cipherKeyHandle            = pImportKeyCustomStruct->Encryption.CipherKeyHandle;
                pImportKeyReq->cipher.cipherScheme.symCipher     = pImportKeyCustomStruct->Encryption.EncryptionScheme.SymCipher;
                break;
            case CRYPTO_43_HSE_ENC_SCHEME_AEAD:
                pImportKeyReq->cipher.cipherKeyHandle            = pImportKeyCustomStruct->Encryption.CipherKeyHandle;
                pImportKeyReq->cipher.cipherScheme.aeadCipher    = pImportKeyCustomStruct->Encryption.EncryptionScheme.AeadCipher;
                break;
            case CRYPTO_43_HSE_ENC_SCHEME_RSA:
                pImportKeyReq->cipher.cipherKeyHandle            = pImportKeyCustomStruct->Encryption.CipherKeyHandle;
                pImportKeyReq->cipher.cipherScheme.rsaCipher     = pImportKeyCustomStruct->Encryption.EncryptionScheme.RsaCipher;
                break;
            default:
                /* No operation needed here. */
                break;
        }
    }

    /* Authentication */
    if ((CRYPTO_43_HSE_AUTH_SCHEME_MAC  == pImportKeyCustomStruct->Authentication.SelAuthenticationScheme) ||
        (CRYPTO_43_HSE_AUTH_SCHEME_SIGN == pImportKeyCustomStruct->Authentication.SelAuthenticationScheme))
    {
        /* Used to transfer the authentication scheme data to the correct HSE union. */
        switch (pImportKeyCustomStruct->Authentication.SelAuthenticationScheme)
        {
            case CRYPTO_43_HSE_AUTH_SCHEME_MAC:
                pImportKeyReq->keyContainer.authScheme.macScheme  = pImportKeyCustomStruct->Authentication.AuthenticationScheme.MacScheme;
                break;
            case CRYPTO_43_HSE_AUTH_SCHEME_SIGN:
                pImportKeyReq->keyContainer.authScheme.sigScheme  = pImportKeyCustomStruct->Authentication.AuthenticationScheme.SignScheme;
                break;
            default:
                /* This line is never reached */
                break;
        }
        /* Filling the key container used in authentication */
        pImportKeyReq->keyContainer.authKeyHandle   = pImportKeyCustomStruct->Authentication.AuthKeyHandle;
        pImportKeyReq->keyContainer.pAuth[0]        = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pImportKeyCustomStruct->Authentication.pAuthentication[0]));
        pImportKeyReq->keyContainer.pAuth[1]        = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pImportKeyCustomStruct->Authentication.pAuthentication[1]));
        pImportKeyReq->keyContainer.authLen[0]      = pImportKeyCustomStruct->Authentication.au16AuthenticationLength[0];
        pImportKeyReq->keyContainer.authLen[1]      = pImportKeyCustomStruct->Authentication.au16AuthenticationLength[1];
        pImportKeyReq->keyContainer.pKeyContainer   = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pImportKeyCustomStruct->Authentication.pKeyContainer));
        pImportKeyReq->keyContainer.keyContainerLen = pImportKeyCustomStruct->Authentication.u16KeyContainerLength;
    }

    /* KeyData*/
    pImportKeyReq->pKeyInfo                = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pImportKeyCustomStruct->KeyData.pKeyInfo));
    pImportKeyReq->pKey[0]                 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pImportKeyCustomStruct->KeyData.pKey[0]));
    pImportKeyReq->pKey[1]                 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pImportKeyCustomStruct->KeyData.pKey[1]));
    pImportKeyReq->pKey[2]                 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pImportKeyCustomStruct->KeyData.pKey[2]));
    pImportKeyReq->keyLen[0]               = pImportKeyCustomStruct->KeyData.au16KeyLength[0];
    pImportKeyReq->keyLen[1]               = pImportKeyCustomStruct->KeyData.au16KeyLength[1];
    pImportKeyReq->keyLen[2]               = pImportKeyCustomStruct->KeyData.au16KeyLength[2];
    /* Key handle of the target, where the key will be stored. */
    pImportKeyReq->targetKeyHandle = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;

    /* Loading a key is always synchronous */
    RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);

    return RetVal;
}

#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_EXPORT)
/**
* @brief           Fills the export descriptor
* @details         Configures the export descriptor with custom structure information
*
* @param[in]       u8MuInstance:             MU instance where the job will be issued
* @param[in]       u8MuChannel:              MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:        Descriptor to be filled and send to HSE
* @param[in]       pKeyElement:              Pointer to custom structure
* @param[in]       u32KeyMaterialKeyElemIdx: Index of Key Material
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_ExportCustomKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const uint8*        pKeyMaterial,
    uint32              u32KeyMaterialKeyElemIdx
)
{
    hseExportKeySrv_t*                         pExportKeyReq;
    const Crypto_43_HSE_KeyImportExportType*  pExportKeyCustomStruct;
    Std_ReturnType                             RetVal;

    pExportKeyReq          = &(pHseSrvDescriptor->hseSrv.exportKeyReq);
    pExportKeyCustomStruct = (const Crypto_43_HSE_KeyImportExportType*)pKeyMaterial;

    pHseSrvDescriptor->srvId = HSE_SRV_ID_EXPORT_KEY;

    pExportKeyReq->cipher.cipherKeyHandle     = (hseKeyHandle_t)HSE_INVALID_KEY_HANDLE;
    pExportKeyReq->keyContainer.authKeyHandle = (hseKeyHandle_t)HSE_INVALID_KEY_HANDLE;

    /* Encryption */
    if (CRYPTO_43_HSE_WA_ENCRYPTED == Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].eCryptoKeyElementWriteAccess)
    {
        /* Used mainly to transfer the cipher scheme data to the correct HSE union. */
        switch (pExportKeyCustomStruct->Encryption.SelEncryptionScheme)
        {
            case CRYPTO_43_HSE_ENC_SCHEME_SYM:
                pExportKeyReq->cipher.cipherKeyHandle            = pExportKeyCustomStruct->Encryption.CipherKeyHandle;
                pExportKeyReq->cipher.cipherScheme.symCipher     = pExportKeyCustomStruct->Encryption.EncryptionScheme.SymCipher;
                break;
            case CRYPTO_43_HSE_ENC_SCHEME_AEAD:
                pExportKeyReq->cipher.cipherKeyHandle            = pExportKeyCustomStruct->Encryption.CipherKeyHandle;
                pExportKeyReq->cipher.cipherScheme.aeadCipher    = pExportKeyCustomStruct->Encryption.EncryptionScheme.AeadCipher;
                break;
            case CRYPTO_43_HSE_ENC_SCHEME_RSA:
                pExportKeyReq->cipher.cipherKeyHandle            = pExportKeyCustomStruct->Encryption.CipherKeyHandle;
                pExportKeyReq->cipher.cipherScheme.rsaCipher     = pExportKeyCustomStruct->Encryption.EncryptionScheme.RsaCipher;
                break;
            default:
                /* No operation needed here. */
                break;
        }
    }

    /* Authentication */
    if ((CRYPTO_43_HSE_AUTH_SCHEME_MAC  == pExportKeyCustomStruct->Authentication.SelAuthenticationScheme) ||
        (CRYPTO_43_HSE_AUTH_SCHEME_SIGN == pExportKeyCustomStruct->Authentication.SelAuthenticationScheme))
    {
        /* Used to transfer the authentication scheme data to the correct HSE union. */
        switch (pExportKeyCustomStruct->Authentication.SelAuthenticationScheme)
        {
            case CRYPTO_43_HSE_AUTH_SCHEME_MAC:
                pExportKeyReq->keyContainer.authScheme.macScheme  = pExportKeyCustomStruct->Authentication.AuthenticationScheme.MacScheme;
                break;
            case CRYPTO_43_HSE_AUTH_SCHEME_SIGN:
                pExportKeyReq->keyContainer.authScheme.sigScheme  = pExportKeyCustomStruct->Authentication.AuthenticationScheme.SignScheme;
                break;
            default:
                /* This line is never reached */
                break;
        }
        /* Filling the key container used in authentication */
        pExportKeyReq->keyContainer.authKeyHandle   = pExportKeyCustomStruct->Authentication.AuthKeyHandle;
        pExportKeyReq->keyContainer.pAuth[0]        = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pExportKeyCustomStruct->Authentication.pAuthentication[0]));
        pExportKeyReq->keyContainer.pAuth[1]        = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pExportKeyCustomStruct->Authentication.pAuthentication[1]));
        pExportKeyReq->keyContainer.pAuthLen[0]     = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pExportKeyCustomStruct->Authentication.au16AuthenticationLength[0]));
        pExportKeyReq->keyContainer.pAuthLen[1]     = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pExportKeyCustomStruct->Authentication.au16AuthenticationLength[1]));
        pExportKeyReq->keyContainer.pKeyContainer   = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pExportKeyCustomStruct->Authentication.pKeyContainer));
        pExportKeyReq->keyContainer.keyContainerLen = pExportKeyCustomStruct->Authentication.u16KeyContainerLength;
    }

    /* KeyData*/
    pExportKeyReq->pKeyInfo                = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pExportKeyCustomStruct->KeyData.pKeyInfo));
    pExportKeyReq->pKey[0]                 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pExportKeyCustomStruct->KeyData.pKey[0]));
    pExportKeyReq->pKey[1]                 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pExportKeyCustomStruct->KeyData.pKey[1]));
    pExportKeyReq->pKey[2]                 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pExportKeyCustomStruct->KeyData.pKey[2]));
    pExportKeyReq->pKeyLen[0]              = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pExportKeyCustomStruct->KeyData.au16KeyLength[0]));
    pExportKeyReq->pKeyLen[1]              = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pExportKeyCustomStruct->KeyData.au16KeyLength[1]));
    pExportKeyReq->pKeyLen[2]              = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pExportKeyCustomStruct->KeyData.au16KeyLength[2]));
    /* Key handle of the target, where the key will be stored. */
    pExportKeyReq->targetKeyHandle = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;

    /* Loading a key is always synchronous */
    RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_EXPORT) */

#if (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_IMPORT)
/**
* @brief           Fills the import descriptor
* @details         Configures the import descriptor for SHE keys in plain format
*
* @param[in]       u8MuInstance:        MU instance where the job will be issued
* @param[in]       u8MuChannel:         MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:   Descriptor to be filled and send to HSE
* @param[in]       pKeyMaterial:        Pointer to Key Material
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_SheLoadPlainKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const uint8*        pKeyMaterial,
    uint32              u32KeyMaterialKeyElemIdx
)
{
    hseSheLoadPlainKeySrv_t* pSheLoadPlainKeyReq;
    Std_ReturnType           RetVal;

    pHseSrvDescriptor->srvId             = HSE_SRV_ID_SHE_LOAD_PLAIN_KEY;
    pSheLoadPlainKeyReq                  = &(pHseSrvDescriptor->hseSrv.sheLoadPlainKeyReq);
    pSheLoadPlainKeyReq->pKey            = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pKeyMaterial[0u]));
    /* Avoid compiler warnings for not used param */
    (void)u32KeyMaterialKeyElemIdx;

    /* Loading a key is always synchronous */
    RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);

    return RetVal;
}

/**
* @brief           Fills the import descriptor
* @details         Configures the import descriptor for SHE keys in format encrypted
*
* @param[in]       u8MuInstance:             MU instance where the job will be issued
* @param[in]       u8MuChannel:              MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:        Descriptor to be filled and send to HSE
* @param[in]       pKeyMaterial:             Pointer to Key Material element
* @param[in]       u32CryptoKeyIdx:          Index of the used Crypto Key
* @param[in]       u32KeyMaterialKeyElemIdx: Index of Key Material
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_SheLoadKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const uint8*        pKeyMaterial,
    uint32              u32CryptoKeyIdx,
    uint32              u32KeyMaterialKeyElemIdx
)
{
    Std_ReturnType      RetVal;
    uint32              u32KeyHandle   = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;
    boolean             bM4M5Requested = FALSE;
    hseSheLoadKeySrv_t* pSheLoadKeyReq;

    /* Dummy buffers to store the SHE M4 and M5 output messages from HSE FW, when these are not requested by Crypto driver */
    static uint8        au8DummyM4[CRYPTO_43_HSE_M4_SIZE_U32];
    static uint8        au8DummyM5[CRYPTO_43_HSE_M5_SIZE_U32];

    /* MAC Proof key element and Cipher Proof key element ar needed for M4 and M5 output , Autosar marks them as not mandatory */
    /* Here CRYPTO_KE_MAC_PROOF and CRYPTO_KE_CIPHER_PROOF has same value */
    uint32 u32MacCipherProofKeyElemIdx    = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_MAC_PROOF);

    pSheLoadKeyReq = &(pHseSrvDescriptor->hseSrv.sheLoadKeyReq);
    pHseSrvDescriptor->srvId = HSE_SRV_ID_SHE_LOAD_KEY;

    pSheLoadKeyReq->sheGroupIndex = (hseKeyGroupIdx_t)GET_GROUP_IDX(u32KeyHandle);
    pSheLoadKeyReq->pM1           = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pKeyMaterial[CRYPTO_43_HSE_INDEX_M1_U32]));
    pSheLoadKeyReq->pM2           = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pKeyMaterial[CRYPTO_43_HSE_INDEX_M2_U32]));
    pSheLoadKeyReq->pM3           = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pKeyMaterial[CRYPTO_43_HSE_INDEX_M3_U32]));

    /* Here M4 and M5 must be as M4M5 (concatenated )) output */
    if ((CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32MacCipherProofKeyElemIdx) &&
        ((CRYPTO_43_HSE_M4_SIZE_U32 + CRYPTO_43_HSE_M5_SIZE_U32) <= Crypto_43_HSE_aKeyElementList[u32MacCipherProofKeyElemIdx].u32CryptoKeyElementMaxSize)
       )
    {
        pSheLoadKeyReq->pM4 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_43_HSE_aKeyElementList[u32MacCipherProofKeyElemIdx].pCryptoElementArray[0u]));
        pSheLoadKeyReq->pM5 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_43_HSE_aKeyElementList[u32MacCipherProofKeyElemIdx].pCryptoElementArray[CRYPTO_43_HSE_M4_SIZE_U32]));
        bM4M5Requested      = TRUE;
    }
    else
    {
        pSheLoadKeyReq->pM4 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(au8DummyM4));
        pSheLoadKeyReq->pM5 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(au8DummyM5));
    }

    /* Loading a key is always synchronous */
    RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);

    /* If importing the key was successful and M4 and M5 were requested by upper layer, they were already updated by HSE in the CipherProof and MacProof key elements
       We need to update the actual length of these 2 key elements */
    if (((Std_ReturnType)E_OK == RetVal) && (TRUE == bM4M5Requested))
    {
        *Crypto_43_HSE_aKeyElementList[u32MacCipherProofKeyElemIdx].pu32CryptoElementActualSize = (CRYPTO_43_HSE_M4_SIZE_U32 + CRYPTO_43_HSE_M5_SIZE_U32);
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_IMPORT) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT))
/**
* @brief           Key export in plain.
Exports symmetric key or public part of a key pair.
* @details         The firmware has key export restrictions that can be checked in hseExportKeySrv_t's comment.
*                  The NVM/RAM symmetric keys can not be exported by this function as those keys can be exported only encrypted.
*                  The NVM/RAM public keys (from key pair or public key slots) can be exported in plain by this function.
*                  The private part of a key pair can not be exported (the private part is never disclosed to the host).
*                  The public keys, where the key value is stored in the application area(_PUB_EXT), can not be exported.
*                  Key information export is disabled.
*
* @param[in]       u8MuInstance:             MU instance where the job will be issued
* @param[in]       u8MuChannel:              MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:        Descriptor to be filled and send to HSE
* @param[in]       u32KeyMaterialKeyElemIdx: Index of Key Material
* @param[in]       pResult:                  Output key element where the result will be stored
* @param[in]       pResultLength:            Pointer to the length of the output key element
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_ExportPubKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    uint32              u32KeyMaterialKeyElemIdx,
    uint8* const        pResult,
#if (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT)
    uint32*             pResultLength
#else
    const uint32*       pResultLength
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) */
)
{
    Std_ReturnType           RetVal;
    hseExportKeySrv_t* const pExportKeyReq = &(pHseSrvDescriptor->hseSrv.exportKeyReq);
    const uint32             u32KeyHandle = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;
    const uint8              u8HseKeyType = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u8HseKeyType;

    /* Export Service Request */
    pHseSrvDescriptor->srvId = HSE_SRV_ID_EXPORT_KEY;
    /* The key handle of the key to be exported. */
    pExportKeyReq->targetKeyHandle = (hseKeyHandle_t)u32KeyHandle;
    /* The cipher key handle shall be set to invalid as this function performs plain key export. */
    pExportKeyReq->cipher.cipherKeyHandle       = HSE_INVALID_KEY_HANDLE;
    /* The authentication key handle shall be set to invalid as this function performs plain key export without authentication. */
    pExportKeyReq->keyContainer.authKeyHandle   = HSE_INVALID_KEY_HANDLE;
    /* Key information is not required as this function performs plain key export. */
    pExportKeyReq->pKeyInfo = (HOST_ADDR)0U;

    /* Fill the export descriptor with required result and result length addresses */
    RetVal = Crypto_Ipw_ExportResultAddr
                                        (
                                            pExportKeyReq,
                                            u8HseKeyType,
                                            pResult,
                                            pResultLength
#if (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT)
                                            , u32KeyHandle,
                                            u8MuInstance,
                                            u8MuChannel
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) */
                                        );

    /* Send the request and update the results of the operation */
    RetVal = Crypto_Ipw_ExportPubKeyUpdateRes(u8MuInstance, u8MuChannel, pHseSrvDescriptor, u32KeyMaterialKeyElemIdx, pResult, pResultLength, RetVal);
    return RetVal;
}

/**
* @brief           Exports symmetric key or public part of a key pair. Update result of export
* @details         Restrictions for export service(which apply for both SuperUser and User rights):
*                  - Key flags (of key properties) are always applied, this service can only be used if the key is exportable.
*                  - NVM/RAM symmetric keys can be exported only encrypted and/or optionally authenticated.
*                  - NVM/RAM public keys (from key pair or public key slots) can be exported in plain, keys can/cannot be authenticated.
*                  - The private part of a key pair can NOT be exported (the private part is never disclosed to the host).
*                  - public keys, where the key value is stored in the application area(_PUB_EXT), can not be exported.
*                  - To export an encrypted/authenticated NVM key, the provided provision key must have the same group owner as the exported NVM key (not applicable for RAM keys).
*                  Key Information export is disabled.
*
* @param[in]       u8MuInstance:             MU instance where the job will be issued
* @param[in]       u8MuChannel:              MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:        Descriptor to be filled and send to HSE
* @param[in]       u32KeyMaterialKeyElemIdx: Index of Key Material
* @param[in]       pResult:                  Output key element where the result will be stored
* @param[in]       pResultLength:            Pointer to the length of the output key element
* @param[in]       ReturnValue:              Element used to store the status of the operations preceding this function's call
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_ExportPubKeyUpdateRes
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    uint32              u32KeyMaterialKeyElemIdx,
    uint8* const        pResult,
#if (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT)
    uint32*             pResultLength,
#else
    const uint32*       pResultLength,
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) */
    Std_ReturnType      ReturnValue
)
{
    uint32             u32EccPubLen = 0u;
    const uint32       u32KeyHandle = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;
    const uint8        u8HseKeyType = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u8HseKeyType;
    Std_ReturnType     RetVal       = ReturnValue;

    /* Check if the size is right, only for RSA key export RetVal can be E_NOT_OK if the result size can not contain modulus n and public exponent e */
    if ((Std_ReturnType)E_OK == RetVal)
    {
        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);
    }

#if (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT)
    if ((HSE_KEY_TYPE_ECC_PAIR == u8HseKeyType) || (HSE_KEY_TYPE_ECC_PUB == u8HseKeyType))
    {
        if ((Std_ReturnType)E_OK == Crypto_Ipw_GetKeyInfo(u8MuInstance, u32KeyHandle, &Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel]))
        {
            u32EccPubLen = Crypto_Ipw_GetByteLenFromBitLen((uint32)Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyBitLen);
            if ((HSE_EC_25519_ED25519 == Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].specific.eccCurveId) || (HSE_EC_25519_CURVE25519 == Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].specific.eccCurveId))
            {
                /* [SWS_Crypto_00192]The public key information for ED25519 contains a point on the curve:ED25519 Public Key = Point X. The point is stored in little endian format. */
                /* The public key information for ED448 contains a point on the curve: ED448 Public Key = Point X. The point is stored in little endian format. */
                /* Convert Point X (convert public key)*/
                Crypto_43_HSE_Util_SwapArrayBytes(pResult, u32EccPubLen);
            }
            else
            {
                /* [SWS_Crypto_00190]Public keys for NIST and Brainpool ECC curves are provided with their X and Y coordinates: ECC Public Key = Point X | Point Y.
                 * The points are stored in little endian format.The number of bytes for the key depends on the implementation of the curve. */
                /* Convert X (First point of Public Key)from Little Endian to Big endian */
                Crypto_43_HSE_Util_SwapArrayBytes(&pResult[0], u32EccPubLen);
                /* Convert Y (Second point  of Public Key)from Little Endian to Big endian */
                Crypto_43_HSE_Util_SwapArrayBytes(&pResult[u32EccPubLen], u32EccPubLen);
            }
        }
        else
        {
            /* If the information about the key can't be read the swap fails */
            RetVal = E_NOT_OK;
        }
    }
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT) */

#if (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT)
    /* Compute total length for RSA key export */
    if (((Std_ReturnType)E_OK == RetVal) && ((HSE_KEY_TYPE_RSA_PUB == u8HseKeyType) || (HSE_KEY_TYPE_RSA_PAIR == u8HseKeyType)))
    {
        *pResultLength = Crypto_Ipw_apMuState[u8MuInstance]->au32SizeRsa[0] + Crypto_Ipw_apMuState[u8MuInstance]->au32SizeRsa[1];
    }
#else
    /* Avoid compiler warnings */
    (void) pResultLength;
#endif/* (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) */

    return RetVal;
}
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT)) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT))
/**
* @brief           Fills the descriptor for exported keys
* @details         Configures the export descriptor with required result and result length addresses
*
* @param[out]      pExportKeyReq: Pointer to export descriptor
* @param[in]       u8HseKeyType:  Configured key type
* @param[in]       pResult:       Output key element where the result will be stored
* @param[in]       pResultLength: Pointer to the length of the output key element
* @param[in]       u32KeyHandle:  Handle used to identify a key in the firmware
* @param[in]       u8MuInstance:  MU instance where the job will be issued
*
* @returns         Std_ReturnType
*/
static inline Std_ReturnType Crypto_Ipw_ExportResultAddr
(
    hseExportKeySrv_t*    pExportKeyReq,
    uint8                 u8HseKeyType,
    const uint8* const    pResult,
    const uint32*         pResultLength
#if (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT)
    , const uint32        u32KeyHandle,
    uint8                 u8MuInstance,
    uint8                 u8MuChannel
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) */
)
{
    Std_ReturnType RetVal = E_OK;

    switch (u8HseKeyType)
    {
#if (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT)
        /* Asymmetric Key Export */
        case HSE_KEY_TYPE_RSA_PUB:
        /* fall-through */
        case HSE_KEY_TYPE_RSA_PAIR:
            /* Obtain key information to know the size of modulus n and exponent e. */
            if ((Std_ReturnType)E_OK == Crypto_Ipw_GetKeyInfo(u8MuInstance, u32KeyHandle, &Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel]))
            {
                /* Check if the length of the pResult is big enough to contain the key */
                if (*pResultLength < (((uint32)Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyBitLen >> 3) + (uint32)(Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].specific.pubExponentSize)))
                {
                    /* Buffer is not big enough */
                    RetVal = E_NOT_OK;
                }
                else
                {
                    /* Use the following variables to save the returned length */
                    /* RSA public modulus n size. */
                    Crypto_Ipw_apMuState[u8MuInstance]->au32SizeRsa[0] = ((uint32)Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyBitLen >> 3);
                    /* RSA public exponent e size.*/
                    Crypto_Ipw_apMuState[u8MuInstance]->au32SizeRsa[1] = (Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].specific.pubExponentSize);
                    /* RSA public exponent e. */
                    pExportKeyReq->pKey[1]    = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR((&pResult[Crypto_Ipw_apMuState[u8MuInstance]->au32SizeRsa[0]])));
                    /* Length of the buffer used for storing the exported key, if the buffer is too small the export will fail */
                    /* Address of uint16 value of the length (in bytes) for the above buffer.
                       After a succesful request it provides the length of the public exponent e.*/
                    pExportKeyReq->pKeyLen[1] = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au32SizeRsa[1]));
                    /* RSA public modulus n. */
                    pExportKeyReq->pKey[0]    = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pResult));
                    /* Length of the buffer used for storing the exported key, if the buffer is too small the export will fail */
                    /* Address of uint16 value of the length (in bytes) for the above buffer.
                       After a succesful request it provides the length of the public modulus n.*/
                    pExportKeyReq->pKeyLen[0] = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au32SizeRsa[0]));
                }
            }
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) */

#if (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT)
        case HSE_KEY_TYPE_ECC_PAIR:
        case HSE_KEY_TYPE_ECC_PUB :
            /* ECC the x and y coordinate of the public key must be passed one after another(the byte length of the stored value of the public key must be twice the byte length of the prime p).
               ED25519 point x. */
            pExportKeyReq->pKey[0]  = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pResult));
            /* Length of the buffer used for storing the exported key, if the buffer is too small the export will fail */
            /* Address of uint16 value of the length (in bytes) for the above buffer.
               After a succesful request it provides the total length of the key.*/
            pExportKeyReq->pKeyLen[0] = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pResultLength));
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT) */

        default:
            /* Should not get here */
            break;
    }

    return RetVal;
}
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT)) */

#if (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_EXPORT)
/**
* @brief           Fills the export descriptor
* @details         Configures the export descriptor for SHE RAM keys
*
* @param[in]       u8MuInstance:        MU instance where the job will be issued
* @param[in]       u8MuChannel:         MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:   Descriptor to be filled and send to HSE
* @param[in]       pResult:             Output key element where the result will be stored
* @param[in]       pResultLength:       Pointer to the length of the output key element
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_ExportRamSheKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const uint8*        pResult
)
{
    hseSheExportRamKeySrv_t* pSheExportRamKeyReq;
    Std_ReturnType           RetVal;
    /* Dummy buffers to store the SHE M4 and M5 output messages from HSE FW, when these are not requested by Crypto driver */
    static uint8        au8DummyM4[CRYPTO_43_HSE_M4_SIZE_U32];
    static uint8        au8DummyM5[CRYPTO_43_HSE_M5_SIZE_U32];

    pSheExportRamKeyReq      = &(pHseSrvDescriptor->hseSrv.sheExportRamKeyReq);
    pHseSrvDescriptor->srvId = HSE_SRV_ID_SHE_EXPORT_RAM_KEY;

    pSheExportRamKeyReq->pM1 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pResult[CRYPTO_43_HSE_INDEX_M1_U32]));
    pSheExportRamKeyReq->pM2 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pResult[CRYPTO_43_HSE_INDEX_M2_U32]));
    pSheExportRamKeyReq->pM3 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pResult[CRYPTO_43_HSE_INDEX_M3_U32]));
    pSheExportRamKeyReq->pM4 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(au8DummyM4));
    pSheExportRamKeyReq->pM5 = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(au8DummyM5));

    RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_EXPORT) */

#if (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT)
/**
* @brief           Fills the import descriptor for ECC keys
* @details         Configures the improt descriptor for ECC keys in plain format
*
* @param[in]       u8MuInstance:             MU instance where the job will be issued
* @param[in]       u8MuChannel:              MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:        Descriptor to be filled and send to HSE
* @param[in]       pKey:                     Pointer to the Public key that will be set
* @param[in]       u32KeyLength:                Length of Public key
* @param[in]       u32KeyMaterialKeyElemIdx: Index of Key Material
* @param[in]       u8CurveId:                Curve id configured by user
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_EccLoadPlainPubKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const uint8*        pKey,
    uint32              u32KeyLength,
    uint32              u32KeyMaterialKeyElemIdx,
#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
    uint32              u32CryptoKeyIdx,
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */
    uint8               u8CurveId
)
{
    hseImportKeySrv_t* pImportKeyReq;
    uint32             u32pubKeyByteLen;
    uint32             u32PrivKeyByteLen;
    Std_ReturnType     RetVal          = (Std_ReturnType)E_NOT_OK;
    uint16             u16EccKeyBitlen = Crypto_Ipw_EccKeyBitLen(u8CurveId);
#if (STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT)
    hseEccKeyFormat_t  EccKeyFormat      = HSE_KEY_FORMAT_ECC_PUB_RAW;
#endif /* (STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) */
    uint8              u8Index           = 0U;
#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
    uint8              u8EccFormatKeySet;
    uint32             u32EccFormatKeyElemIdx;
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */
    pImportKeyReq     = &pHseSrvDescriptor->hseSrv.importKeyReq;
    u32pubKeyByteLen  = Crypto_Ipw_GetByteLenFromBitLen((uint32)u16EccKeyBitlen);
    u32PrivKeyByteLen = Crypto_Ipw_GetByteLenFromBitLen((uint32)u16EccKeyBitlen);
    if (CRYPTO_IPW_KE_INVALID_CURVE_ID_U8 != u8CurveId)
    {
        /* Set the public key length for x & y if curve not ED25519 or ED448 */
        if (
                (HSE_EC_25519_ED25519    != (hseEccCurveId_t)u8CurveId)
             && (HSE_EC_25519_CURVE25519 != (hseEccCurveId_t)u8CurveId)
#if (STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448)
             && (HSE_EC_448_ED448        != (hseEccCurveId_t)u8CurveId)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448) */
#if (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448)
             && (HSE_EC_448_CURVE448     != (hseEccCurveId_t)u8CurveId)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448) */
           )
        {
#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
            u32EccFormatKeyElemIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KE_ECC_FORMAT);
            /* Check the format of the ECC key (RAW/UNCOMPRESSED/COMPRESSED) */
            if(CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32EccFormatKeyElemIdx)
            {
                /* The configuration of the CryptoKey contains a CryptoKeyElement with ECC format */
                u8EccFormatKeySet = Crypto_43_HSE_aKeyElementList[u32EccFormatKeyElemIdx].pCryptoElementArray[0];
                if(0U != (u8EccFormatKeySet & 0x03U))
                {
                    /* CryptoKeyElement with ECC format was set to 0x02 or 0x03, marking the compressed format */
                    EccKeyFormat = HSE_KEY_FORMAT_ECC_PUB_COMPRESSED;
                    /* Public key is composed of  X, u32pubKeyByteLen has the proper value, no need to update it. */
                }
                else
                {
                    /* CryptoKeyElement with ECC format should be set to 0x04, marking the uncompressed format */
                    EccKeyFormat = HSE_KEY_FORMAT_ECC_PUB_UNCOMPRESSED;
                    /* Public key is composed of  X | Y */
                    u32pubKeyByteLen =  2U * u32pubKeyByteLen;
                }
                /* Set the ECC Key format in the buffer that goes to HSE */
                Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[0U] = u8EccFormatKeySet;
                /* Starting point of the key data in internal buffer */
                u8Index = 1U;
            }
            else
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */
            {
                /* ECC RAW format is selected by default if no CryptoKeyElement with ECC format is found */
                /* Public key is composed of  X | Y */
                u32pubKeyByteLen =  2U * u32pubKeyByteLen;
            }
        }
        /* In case of custom ecc curve id */
        if (0U == u32pubKeyByteLen)
        {
            u32pubKeyByteLen = u32KeyLength;
        }

        /* Check for big endianness conversion buffer offsets to avoid overflow */
        if ((u32pubKeyByteLen == u32KeyLength) && (CRYPTO_IPW_BIG_END_FORM_SIZE_U32 > u32pubKeyByteLen))
        {
            /* Copy the key in a buffer used for big endian conversion */
            Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[u8Index], pKey, u32KeyLength);

            /* Check the curve type to see if the conversion must be made for X and Y or just for X */
            if (
                (HSE_EC_25519_ED25519       != (hseEccCurveId_t)u8CurveId) &&
                (HSE_EC_25519_CURVE25519    != (hseEccCurveId_t)u8CurveId)
#if (STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448)
                && (HSE_EC_448_ED448        != (hseEccCurveId_t)u8CurveId)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448) */
#if (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448)
                && (HSE_EC_448_CURVE448     != (hseEccCurveId_t)u8CurveId)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448) */
               )
            {
#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
                if ((HSE_KEY_FORMAT_ECC_PUB_RAW == EccKeyFormat) || (HSE_KEY_FORMAT_ECC_PUB_UNCOMPRESSED == EccKeyFormat))
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */
                {
                    /* [SWS_Crypto_00190]Public keys for NIST and Brainpool ECC curves are provided with their X and Y coordinates: ECC Public Key = Point X | Point Y.
                     * The points are stored in little endian format.The number of bytes for the key depends on the implementation of the curve. */
                    /* Public key is composed of  X(PubKeyLen/2) | Y (PubKeyLen/2)*/
                    /* Convert X (First point of Public Key)from Little Endian to Big endian */
                    Crypto_43_HSE_Util_SwapArrayBytes(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[u8Index], (u32pubKeyByteLen >> 1U));
                    /* Convert Y (Second point  of Public Key)from Little Endian to Big endian */
                    Crypto_43_HSE_Util_SwapArrayBytes(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[(u32pubKeyByteLen >> 1U) + u8Index], (u32pubKeyByteLen >> 1U));
                }
#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
                else
                {
                    /* [SWS_Crypto_00190]Public keys for NIST and Brainpool ECC curves are provided with their X and Y coordinates: ECC Public Key = Point X | Point Y.
                     * The points are stored in little endian format.The number of bytes for the key depends on the implementation of the curve. */
                    /* Convert X (First point of Public Key)from Little Endian to Big endian */
                    Crypto_43_HSE_Util_SwapArrayBytes(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[u8Index], u32pubKeyByteLen);
                }
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */
            }
            else
            {
                /* [SWS_Crypto_00192]The public key information for ED25519 contains a point on the curve:ED25519 Public Key = Point X. The point is stored in little endian format. */
                /* The public key information for ED448 contains a point on the curve: ED448 Public Key = Point X. The point is stored in little endian format. */
                /* Convert X (Public Key)from Little Endian to Big endian */
                Crypto_43_HSE_Util_SwapArrayBytes(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[0], u32pubKeyByteLen);
            }

            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyType             = (hseKeyType_t) Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u8HseKeyType;
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyFlags            = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].hseKeyFlags;
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].specific.eccCurveId = (hseEccCurveId_t)u8CurveId;
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyBitLen           =  u16EccKeyBitlen;
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyCounter          = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyCounter;
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].smrFlags            = (hseSmrFlags_t)Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeySmrFlags;
            /* If Crypto_Ipw_EccKeyBitLen() returns 0 a custom ECC ID is used -> take the key bit len from configuration */
            if (0U == Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyBitLen)
            {
                Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyBitLen = (uint16)Crypto_Ipw_GetBitLenFromByteLen(Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32CryptoKeyElementMaxSize);
            }
            /* Clear the HseReserved bytes in the keyInfo structure, as HSE FW expects these to be 0 */
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].hseReserved[0U] = 0U;
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].hseReserved[1U] = 0U;

            pHseSrvDescriptor->srvId       = HSE_SRV_ID_IMPORT_KEY;
            pImportKeyReq->pKeyInfo        = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel]));
            pImportKeyReq->pKey[0]         = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm));
            pImportKeyReq->keyLen[0]       = (uint16)u32pubKeyByteLen + u8Index;
            pImportKeyReq->pKey[2]         = (HOST_ADDR)0U;
            pImportKeyReq->keyLen[2]       = (uint16)u32PrivKeyByteLen;
            pImportKeyReq->targetKeyHandle = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;

            pImportKeyReq->cipher.cipherKeyHandle     = HSE_INVALID_KEY_HANDLE;
            pImportKeyReq->keyContainer.authKeyHandle = HSE_INVALID_KEY_HANDLE;
 #if (STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT)
            /* Support for HSE ECC key format */
            pImportKeyReq->keyFormat.eccKeyFormat     = EccKeyFormat;
#endif /* (STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) */

            RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);
        }
    }
    return RetVal;
}

/**
* @brief           Fills the import descriptor for ECC keys
* @details         Configures the improt descriptor for ECC keys in plain format
*
* @param[in]       u8MuInstance:             MU instance where the job will be issued
* @param[in]       u8MuChannel:              MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:        Descriptor to be filled and send to HSE
* @param[in]       pKey:                     Pointer to the Public key that will be set
* @param[in]       u32KeyLength:             Length of Public key
* @param[in]       u32KeyMaterialKeyElemIdx: Index of Key Material
* @param[in]       u8CurveId:                Curve id configured by user
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_EccLoadPlainPairKey
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    const uint8*        pKey,
    uint32              u32KeyLength,
    uint32              u32KeyMaterialKeyElemIdx,
#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
    uint32              u32CryptoKeyIdx,
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */
    uint8               u8CurveId
)
{
    hseImportKeySrv_t* pImportKeyReq;
    Std_ReturnType     RetVal            = (Std_ReturnType)E_NOT_OK;
    uint32             u32pubKeyByteLen  = Crypto_Ipw_GetByteLenFromBitLen((uint32)Crypto_Ipw_EccKeyBitLen(u8CurveId));
    uint32             u32PrivKeyByteLen = Crypto_Ipw_GetByteLenFromBitLen((uint32)Crypto_Ipw_EccKeyBitLen(u8CurveId));
#if (STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT)
    hseEccKeyFormat_t  EccKeyFormat      = HSE_KEY_FORMAT_ECC_PUB_RAW;
#endif /* (STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) */
    uint8              u8Index           = 0U;
#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
    uint8              u8EccFormatKeySet;
    uint32             u32EccFormatKeyElemIdx;
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */

    pImportKeyReq  = &pHseSrvDescriptor->hseSrv.importKeyReq;

    if (CRYPTO_IPW_KE_INVALID_CURVE_ID_U8 != u8CurveId)
    {
        /* Set the public key length for x & y if curve not ED25519 or ED448 */
        if (
                (HSE_EC_25519_ED25519    != (hseEccCurveId_t)u8CurveId)
             && (HSE_EC_25519_CURVE25519 != (hseEccCurveId_t)u8CurveId)
#if (STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448)
             && (HSE_EC_448_ED448        != (hseEccCurveId_t)u8CurveId)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC448_ED448) */
#if (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448)
             && (HSE_EC_448_CURVE448     != (hseEccCurveId_t)u8CurveId)
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_EC448_CURVE448) */
           )
        {
#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
            u32EccFormatKeyElemIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KE_ECC_FORMAT);
            /* Check the format of the ECC key (RAW/UNCOMPRESSED/COMPRESSED) */
            if(CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32EccFormatKeyElemIdx)
            {
                /* The configuration of the CryptoKey contains a CryptoKeyElement with ECC format */
                u8EccFormatKeySet = Crypto_43_HSE_aKeyElementList[u32EccFormatKeyElemIdx].pCryptoElementArray[0];

                if(0U != (u8EccFormatKeySet & 0x03U))
                {
                    /* CryptoKeyElement with ECC format was set to 0x02 or 0x03, marking the compressed format */
                    EccKeyFormat = HSE_KEY_FORMAT_ECC_PUB_COMPRESSED;
                    /* Public key is composed of  X, u32pubKeyByteLen has the proper value, no need to update it. */
                }
                else
                {
                    /* CryptoKeyElement with ECC format should be set to 0x04, marking the uncompressed format */
                    EccKeyFormat = HSE_KEY_FORMAT_ECC_PUB_UNCOMPRESSED;
                    /* Public key is composed of  X | Y */
                    u32pubKeyByteLen =  2U * u32pubKeyByteLen;
                }
                /* Set the ECC Key format in the buffer that goes to HSE */
                Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[0U] = u8EccFormatKeySet;
                /* Starting point of the key data in internal buffer */
                u8Index = 1U;
            }
            else
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */
            {
                /* ECC RAW format is selected by default if no CryptoKeyElement with ECC format is found */
                /* Public key is composed of  X | Y */
                u32pubKeyByteLen =  2U * u32pubKeyByteLen;
            }

            /* Check for big endianness conversion buffer offsets to avoid overflow */
            if((CRYPTO_IPW_BIG_END_FORM_SIZE_U32 > (u32pubKeyByteLen)) &&
               (CRYPTO_IPW_BIG_END_FORM_SIZE_U32 > (u32pubKeyByteLen + u32PrivKeyByteLen)))
            {
                /* Copy the key in a buffer used for big endian conversion */
                Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[u8Index], pKey, u32KeyLength);

#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
                if ((HSE_KEY_FORMAT_ECC_PUB_RAW == EccKeyFormat) || (HSE_KEY_FORMAT_ECC_PUB_UNCOMPRESSED == EccKeyFormat))
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */
                {
                    /* [SWS_Crypto_00190]Public keys for NIST and Brainpool ECC curves are provided with their X and Y coordinates: ECC Public Key = Point X | Point Y.
                     * The points are stored in little endian format.The number of bytes for the key depends on the implementation of the curve. */
                    /* Convert X (First point of Public Key)from Little Endian to Big endian */
                    Crypto_43_HSE_Util_SwapArrayBytes(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[u8Index], u32pubKeyByteLen >> 1U);
                    /* Convert Y (Second point  of Public Key)from Little Endian to Big endian */
                    Crypto_43_HSE_Util_SwapArrayBytes(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[(u32pubKeyByteLen >> 1U) + u8Index], u32pubKeyByteLen >> 1U);
                }
#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
                else
                {
                    /* [SWS_Crypto_00190]Public keys for NIST and Brainpool ECC curves are provided with their X and Y coordinates: ECC Public Key = Point X | Point Y.
                     * The points are stored in little endian format.The number of bytes for the key depends on the implementation of the curve. */
                    /* Convert X (First point of Public Key)from Little Endian to Big endian */
                    Crypto_43_HSE_Util_SwapArrayBytes(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[u8Index], u32pubKeyByteLen);
                }
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */

                /* [SWS_Crypto_00191]Private keys for NIST and Brainpool ECC curves are provided with their X and Y coordinates and an additional scalar:ECC Private Key = Point X | Point Y | Scalar.
                 * The points and the scalar are stored in little endian. */
                /* Convert Private Key from Little Endian to Big endian */
                Crypto_43_HSE_Util_SwapArrayBytes(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[u32pubKeyByteLen + u8Index],u32PrivKeyByteLen);

                pImportKeyReq->pKey[0]   = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[0]));
                pImportKeyReq->keyLen[0] = (uint16)u32pubKeyByteLen + u8Index;

                pImportKeyReq->pKey[2]   = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[u32pubKeyByteLen + u8Index]));
                pImportKeyReq->keyLen[2] = (uint16)u32PrivKeyByteLen;
            }
        }
        else
        {
            /* Check for big endianness conversion buffer offsets to avoid overflow */
            if((CRYPTO_IPW_BIG_END_FORM_SIZE_U32 > (u32PrivKeyByteLen)) &&
               (CRYPTO_IPW_BIG_END_FORM_SIZE_U32 > (u32PrivKeyByteLen + u32pubKeyByteLen)))
            {
                /* Copy the key in a buffer used for big endian conversion */
                Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[u8Index], pKey, u32KeyLength);

                /* The private key information for ED448 contains a random constant and the point X on the curve: ED448 Private Key = Seed K | Point X. */
                /* [SWS_Crypto_00193]The private key information for ED25519 contains a random constant and the point X on the curve:ED25519 Private Key = Seed K | Point X.
                 * The point and the seed are stored in little endian format. */
                /* Convert SeedK (Convert Private key) */
                Crypto_43_HSE_Util_SwapArrayBytes(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[0], u32PrivKeyByteLen);

                /* [SWS_Crypto_00192]The public key information for ED25519 contains a point on the curve:ED25519 Public Key = Point X. The point is stored in little endian format. */
                /* The public key information for ED448 contains a point on the curve: ED448 Public Key = Point X. The point is stored in little endian format. */
                /* Convert Point X (convert public key)*/
                Crypto_43_HSE_Util_SwapArrayBytes(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[u32PrivKeyByteLen], u32pubKeyByteLen);

                pImportKeyReq->pKey[0]   = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[u32PrivKeyByteLen]));
                pImportKeyReq->keyLen[0] = (uint16)u32pubKeyByteLen;

                pImportKeyReq->pKey[2]   = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm[0]));
                pImportKeyReq->keyLen[2] = (uint16)u32PrivKeyByteLen;
            }
            else
            {
                /* Should not get here */
            }
        }

        /* u32KeyLength represents the length of the entire key without the format */
        if ((u32pubKeyByteLen + u32PrivKeyByteLen) == u32KeyLength)
        {
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyType             = (hseKeyType_t)Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u8HseKeyType;
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyFlags            = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].hseKeyFlags;
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].specific.eccCurveId = (hseEccCurveId_t)u8CurveId;
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyBitLen           = Crypto_Ipw_EccKeyBitLen(u8CurveId);
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyCounter          = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyCounter;
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].smrFlags            = (hseSmrFlags_t)Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeySmrFlags;
            /* Clear the HseReserved bytes in the keyInfo structure, as HSE FW expects these to be 0 */
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].hseReserved[0U] = 0U;
            Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].hseReserved[1U] = 0U;

            pHseSrvDescriptor->srvId       = HSE_SRV_ID_IMPORT_KEY;
            pImportKeyReq->pKeyInfo        = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel]));
            pImportKeyReq->targetKeyHandle = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;

            /* Only for encrypted ECC is needed*/
            pImportKeyReq->cipher.cipherKeyHandle     = HSE_INVALID_KEY_HANDLE;
            pImportKeyReq->keyContainer.authKeyHandle = HSE_INVALID_KEY_HANDLE;
#if (STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT)
            /* Support for HSE ECC key format */
            pImportKeyReq->keyFormat.eccKeyFormat     = EccKeyFormat;
#endif /* (STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) */

            RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);

            /* Clear the key from the internal buffer */
            Crypto_43_HSE_Util_Memset(Crypto_Ipw_apMuState[u8MuInstance]->au8KeyBigEndForm, 0x00, u32KeyLength + u8Index);
        }
    }
    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC))
/**
* @brief           Signature generation or verification.
* @details         A signature is generated for the message provided or a verification of the signature is done for RSA PSS, RSA PKCS1 V1.5, ECDSA, EDDSA.
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       u8StreamId:           Identifier of the HSE stream used for the job
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK:     Request successful.
*                   E_NOT_OK: Request failed.
*/
static inline Std_ReturnType Crypto_Ipw_SignRequest
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
)
{
    Std_ReturnType                            RetVal                = (Std_ReturnType)E_NOT_OK;
    uint32                                    u32CryptoKeyIdx       = Crypto_43_HSE_Util_GetKeyIdx(pJob->cryptoKeyId);
    uint8                                     u8AlgoFamily          = (uint8)pJob->jobPrimitiveInfo->primitiveInfo->algorithm.family;
    boolean                                   bError                = FALSE;
    const Crypto_JobPrimitiveInputOutputType* pPrimitiveInputOutput = &pJob->jobPrimitiveInputOutput;
    const Crypto_PrimitiveInfoType*           pPrimitiveInfo        = pJob->jobPrimitiveInfo->primitiveInfo;
    uint32                                    u32SignKeyElemIdx;
    hseSignSrv_t*                             pSignSrv;
#if (STD_ON == CRYPTO_43_HSE_SPT_ECC)
#ifdef CRYPTO_43_HSE_KE_INPUT_FORMAT
    uint32                                    u32HashedInputKeyElemIdx;
#endif /* CRYPTO_43_HSE_KE_INPUT_FORMAT */
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC) */

    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    /* Update the selected IOs or redirect if required to */
    Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

    /* Check parameter cryptoKeyId is out of range*/
    if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
    {
        u32SignKeyElemIdx  = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_KE_SIGNATURE_KEY);

        if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32SignKeyElemIdx)
        {
            pSignSrv = &(pHseSrvDescriptor->hseSrv.signReq);

            pHseSrvDescriptor->srvId      = HSE_SRV_ID_SIGN;
            pSignSrv->accessMode          = Crypto_Ipw_ConfigureAccessMode(pPrimitiveInputOutput->mode);
            pSignSrv->sgtOption           = HSE_SGT_OPTION_NONE;
            pSignSrv->keyHandle           = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32SignKeyElemIdx].u32HseKeyHandle;
            pSignSrv->streamId            = u8StreamId;
            /* Load the input message */
            pSignSrv->inputLength         = (uint32)(*jobPrimitiveIOUpdate.pInputLength);
            pSignSrv->pInput              = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));
            pSignSrv->bInputIsHashed      = FALSE;

#if (STD_ON == CRYPTO_43_HSE_SPT_ECC)
            /* Check if input is already hashed */
#ifdef CRYPTO_43_HSE_KE_INPUT_FORMAT
            u32HashedInputKeyElemIdx  = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KE_INPUT_FORMAT);
            if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32HashedInputKeyElemIdx)
            {
                if(CRYPTO_43_HSE_INPUT_FMT_HASHED == Crypto_43_HSE_aKeyElementList[u32HashedInputKeyElemIdx].pCryptoElementArray[0])
                {
                    pSignSrv->bInputIsHashed = TRUE;
                }
            }
#endif /* CRYPTO_43_HSE_KE_INPUT_FORMAT */
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC) */

            /* Choose the direction of the signature */
            if (CRYPTO_SIGNATUREGENERATE == pPrimitiveInfo->service)
            {
                pSignSrv->authDir = HSE_AUTH_DIR_GENERATE;
                Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel] = (uint32)(*jobPrimitiveIOUpdate.pOutputLength);
            }
            else if (CRYPTO_SIGNATUREVERIFY == pPrimitiveInfo->service)
            {
                pSignSrv->authDir = HSE_AUTH_DIR_VERIFY;
                Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel] = (uint32)(*jobPrimitiveIOUpdate.pSecondaryInputLength);
            }
            else
            {
                /* Should not get here */
                /* If this point is reached, do not send message to HSE */
                bError = TRUE;
            }

            if (FALSE == bError)
            {
                bError = Crypto_Ipw_FillSignRequestDescriptor(u8MuInstance, u8MuChannel, pSignSrv, pJob, u32SignKeyElemIdx);

                /* Check if the descriptor is valid */
                if (FALSE == bError)
                {
                    RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
                    /* Mark the request as sent */
                    *pbReqSentOverChannel = TRUE;
                }
            }
        }
    }
    if ((CRYPTO_PROCESSING_SYNC == pJob->jobPrimitiveInfo->processingType) && ((uint8)CRYPTO_OPERATIONMODE_FINISH == (uint8)(((uint8)(pJob->jobPrimitiveInputOutput.mode)) & CRYPTO_IPW_OPERATIONMODE_FINISH_MASK_U8)))
    {
        if (CRYPTO_SIGNATUREVERIFY == pPrimitiveInfo->service)
        {
            /*[SWS_Crypto_00071]If the job is synchronous, fill the VerifyPtr */
            Crypto_Ipw_FillVerifyPtr(pJob, &RetVal);
        }
        /* [SWS_Crypto_00135], [SWS_Crypto_00071] Fill the output length pointer with the result length when FINISH is set for signature generation */
        else if ((Std_ReturnType)E_OK == RetVal)
        {
            if ((uint8)CRYPTO_ALGOFAM_RSA == u8AlgoFamily)
            {
                *jobPrimitiveIOUpdate.pOutputLength = Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel];
            }
            else
            {
                *jobPrimitiveIOUpdate.pOutputLength = Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel] << 1;
            }
        }
        else
        {
            /* Should not get here */
        }
    }
    return RetVal;
}

/**
* @brief           Fills signature descriptor.
* @details         Fills signature descriptor based on the configured job.
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[out]      pSignSrv:             Signature descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       u32SignKeyElemIdx:    Holds the index of the Crypto Key Element
*
* @returns         boolean
*                   False:     Descriptor filled successful.
*                   True:      Parameter invalid.
*/
static inline boolean Crypto_Ipw_FillSignRequestDescriptor
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSignSrv_t*         pSignSrv,
    const Crypto_JobType* pJob,
    const uint32          u32SignKeyElemIdx
)
{
    uint8                           u8AlgoFamily    = (uint8)pJob->jobPrimitiveInfo->primitiveInfo->algorithm.family;
    const Crypto_PrimitiveInfoType* pPrimitiveInfo  = pJob->jobPrimitiveInfo->primitiveInfo;
    uint32                          u32JobKeyLength = Crypto_Ipw_GetByteLenFromBitLen(pJob->jobPrimitiveInfo->primitiveInfo->algorithm.keyLength);
    boolean                         bError          = FALSE;
    uint8                           u8AlgoSecFamily = (uint8)pJob->jobPrimitiveInfo->primitiveInfo->algorithm.secondaryFamily;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    /* Update the selected IOs or redirect if required to */
    Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
    Crypto_Ipw_HashConfigType                 HashAlgo              = Crypto_Ipw_ConfigureHashAlgo(u8AlgoSecFamily);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */

    /* Fill the signature descriptor based on algorithm family used */
    switch (u8AlgoFamily)
    {
#if (STD_ON == CRYPTO_43_HSE_SPT_RSA)
        case (uint8)CRYPTO_ALGOFAM_RSA:
            /* Setup the Salt Length */
            switch (pPrimitiveInfo->algorithm.mode)
            {
                case CRYPTO_ALGOMODE_RSASSA_PSS:
                    pSignSrv->signScheme.signSch             = HSE_SIGN_RSASSA_PSS;
#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
                    pSignSrv->signScheme.sch.rsaPss.hashAlgo = HashAlgo.HseHashAlgo;
                    if (((HSE_HASH_ALGO_SHA2_512 == HashAlgo.HseHashAlgo) || (HSE_HASH_ALGO_SHA3_512 == HashAlgo.HseHashAlgo)) &&
                        (1024U == Crypto_Ipw_GetBitLenFromByteLen(Crypto_43_HSE_aKeyElementList[u32SignKeyElemIdx].u32CryptoKeyElementMaxSize))
                       )
                    {
                        pSignSrv->signScheme.sch.rsaPss.saltLength = 62U;
                    }
                    else
                    {
                        pSignSrv->signScheme.sch.rsaPss.saltLength = HashAlgo.u32HashLength;
                    }
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */
                    break;

                case CRYPTO_ALGOMODE_RSASSA_PKCS1_v1_5:
                       pSignSrv->signScheme.signSch                  = HSE_SIGN_RSASSA_PKCS1_V15;
#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
                    pSignSrv->signScheme.sch.rsaPkcs1v15.hashAlgo = HashAlgo.HseHashAlgo;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */
                    break;

                default:
                    /* Should not get here */
                    /* If this point is reached, do not send message to HSE */
                    bError = TRUE;
                    break;
            }

            if (CRYPTO_SIGNATUREGENERATE == pPrimitiveInfo->service)
            {
                pSignSrv->pSignature[0]       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));
                pSignSrv->pSignature[1]       = (HOST_ADDR)0U; /* To be removed after fw stops additional checking */
                pSignSrv->pSignatureLength[0] = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]));
                pSignSrv->pSignatureLength[1] = (HOST_ADDR)0U; /* To be removed after fw stops additional checking */
            }
            else
            {
                pSignSrv->pSignature[0]       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pSecondaryInput));
                pSignSrv->pSignatureLength[0] = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]));
            }
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA) */

#if (STD_ON == CRYPTO_43_HSE_SPT_ECC)
        case (uint8)CRYPTO_ALGOFAM_ECCNIST:
            /* The signature (r,s) length for ECDSA is double the length of the private key used to generate the signature.
               Check that the output buffer containing the signature is at least twice the size of the private key */
            if (((2UL*u32JobKeyLength) <= Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]) ||
                ((HSE_ACCESS_MODE_ONE_PASS != pSignSrv->accessMode) && (HSE_ACCESS_MODE_FINISH != pSignSrv->accessMode)))
            {
                pSignSrv->signScheme.signSch            = HSE_SIGN_ECDSA;
#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
                pSignSrv->signScheme.sch.ecdsa.hashAlgo = HashAlgo.HseHashAlgo;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */
                /* Compute the length of the r or s part of the signature as being the length of the private key */
                Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel] = u32JobKeyLength;

                if (CRYPTO_SIGNATUREGENERATE == pPrimitiveInfo->service)
                {
                    pSignSrv->pSignature[0]       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));
                    pSignSrv->pSignatureLength[0] = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]));
                    pSignSrv->pSignature[1]       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR((&jobPrimitiveIOUpdate.pOutput[Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]])));
                    pSignSrv->pSignatureLength[1] = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]));
                }
                else
                {
                    pSignSrv->pSignature[0]       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pSecondaryInput));
                    pSignSrv->pSignature[1]       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR((&jobPrimitiveIOUpdate.pSecondaryInput[Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]])));
                    pSignSrv->pSignatureLength[0] = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]));
                    pSignSrv->pSignatureLength[1] = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]));
                }
            }
            else
            {
                /* If the length is not the expected one */
                bError = TRUE;
            }
            break;

        case (uint8)CRYPTO_ALGOFAM_ED25519:
        /*Intentional Fall-Through*/
        case CRYPTO_43_HSE_ALGOFAM_CUSTOM_ED25519PH:
        /* Walk through */
        case (uint8)CRYPTO_43_HSE_ALGOFAM_CUSTOM_ED448:
            /* The signature length is double the length of the private key used to generate the signature.
               Check that the output buffer containing the signature is at least twice the size of the private key */
            if (((2UL*u32JobKeyLength) <= Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]) ||
                ((HSE_ACCESS_MODE_ONE_PASS != pSignSrv->accessMode) && (HSE_ACCESS_MODE_FINISH != pSignSrv->accessMode)))
            {
                pSignSrv->signScheme.signSch = HSE_SIGN_EDDSA;

                /*Check which one of the 3 cases is active, if it's CRYPTO_43_HSE_ALGOFAM_CUSTOM_ED25519PH, then the input needs pre-hashing*/
                if(CRYPTO_43_HSE_ALGOFAM_CUSTOM_ED25519PH == u8AlgoFamily)
                {
                    /* Firmware will pre-hash the input and perform a HashEddsa signature */
                    pSignSrv->signScheme.sch.eddsa.bHashEddsa = TRUE;
                }
                else
                {
                    /* Firmware will not pre-hash the input, a pure Eddsa will be performed */
                    pSignSrv->signScheme.sch.eddsa.bHashEddsa = FALSE;
                }

                /* Compute the length of half of the signature as being the length of the private key */
                Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel] = u32JobKeyLength;

                if (CRYPTO_SIGNATUREGENERATE == pPrimitiveInfo->service)
                {
                    pSignSrv->pSignature[0]       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));
                    pSignSrv->pSignatureLength[0] = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]));
                    pSignSrv->pSignature[1]       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR((&jobPrimitiveIOUpdate.pOutput[Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]])));
                    pSignSrv->pSignatureLength[1] = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]));
                    /* Fill the context */
                    pSignSrv->signScheme.sch.eddsa.contextLength = (uint8)(*jobPrimitiveIOUpdate.pSecondaryInputLength);
                    pSignSrv->signScheme.sch.eddsa.pContext      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pSecondaryInput));
                }
                else
                {
                    pSignSrv->pSignature[0]       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pSecondaryInput));
                    pSignSrv->pSignature[1]       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR((&jobPrimitiveIOUpdate.pSecondaryInput[Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]])));
                    pSignSrv->pSignatureLength[0] = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]));
                    pSignSrv->pSignatureLength[1] = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->au32OutLength[u8MuChannel]));
                    /* Fill the context */
                    pSignSrv->signScheme.sch.eddsa.contextLength = (uint8)(*jobPrimitiveIOUpdate.pTertiaryInputLength);
                    pSignSrv->signScheme.sch.eddsa.pContext      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pTertiaryInput));
                }
            }
            else
            {
                /* If the length is not the expected one */
                bError = TRUE;
            }
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC) */

        default:
            /* If this point is reached, do not send message to HSE */
            bError = TRUE;
            break;
    }

#if (STD_OFF == CRYPTO_43_HSE_SPT_RSA)
    /* Avoid compiler warning */
    (void)u32SignKeyElemIdx;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA) */

    return bError;
}
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) */
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

/**
* @brief           Function that checks the Job Operation Mode status
* @details         Check the operation mode state machine
*
* @param[in]       pJob: Pointer to job
*
* @returns         Std_ReturnType
*                   E_OK:     Correct configuration of parameters
*                   E_NOT_OK: Incorrect configuration
*/
static inline Std_ReturnType Crypto_Ipw_OperationModeControl
(
    Crypto_JobType* pJob
)
{
    Std_ReturnType                 RetVal     = (Std_ReturnType)E_NOT_OK;
    const Crypto_OperationModeType eJobMode   = pJob->jobPrimitiveInputOutput.mode;
    const Crypto_JobStateType      eJobState  = pJob->jobState;

    switch (eJobMode)
    {
        case CRYPTO_OPERATIONMODE_STREAMSTART: /* fall-through */
        case CRYPTO_OPERATIONMODE_START:       /* fall-through */
        case CRYPTO_OPERATIONMODE_SINGLECALL:
            /** [SWS_Crypto_00020] If Crypto_ProcessJob() is called while in Idle or Active state and
            with the operation mode START, the previous request shall be cancelled.
            That means, that all previously buffered data for this job shall be reset,
            and the job shall switch to Active state and process the new one.*/
            pJob->jobState = CRYPTO_JOBSTATE_ACTIVE;
            RetVal = E_OK;
            break;

        case CRYPTO_OPERATIONMODE_UPDATE:        /* fall-through */
        case CRYPTO_OPERATIONMODE_FINISH:        /* fall-through */
#if (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT)
        case CRYPTO_OPERATIONMODE_SAVE_CONTEXT:  /* fall-through */
        case CRYPTO_OPERATIONMODE_RESTORE_CONTEXT:
            /* [SWS_Crypto_00118]  If Crypto_ProcessJob() is called while the job is in state Idle and
            the START flag in the operation mode is not set, the function shall return with E_NOT_OK. */
            /* [SWS_Crypto_00023] If Crypto_ProcessJob() is called while in Active state and
            with the operation mode FINISH, the cryptographic calculations shall be finalized. */
            /* The operation Save Context should only be processed if there were other operations before it.
             * Eg: START or UPDATE - the state should not be CRYPTO_JOBSTATE_IDLE
             * The operation Restore Context should only be processed if the context was saved before it, thus the same rule applies.
             */
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) */
            if (CRYPTO_JOBSTATE_ACTIVE == eJobState)
            {
                RetVal = E_OK;
            }
            break;

        default:
            /* Do Nothing */
            break;
    }
    return RetVal;
}

#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
/**
* @brief           Configure HSE algo
* @details         Set algo according to Autosar job
*
* @param[in]       u8AlgoFamily:    Crypto job algorithm
*
* @returns         Crypto_Ipw_HashConfigType: Corresponding HSE algorithm and Hash Length
*/
static inline Crypto_Ipw_HashConfigType Crypto_Ipw_ConfigureHashAlgo
(
    uint8 u8AlgoFamily
)
{
    Crypto_Ipw_HashConfigType RetVal;

    switch (u8AlgoFamily)
    {
#if (STD_ON == CRYPTO_43_HSE_SPT_SHA1)
        case (uint8)CRYPTO_ALGOFAM_SHA1:
            RetVal.HseHashAlgo   = HSE_HASH_ALGO_SHA_1;
            RetVal.u32HashLength = 20U;
            break;
#endif

#if (STD_ON == CRYPTO_43_HSE_SPT_SHA2_224)
        case (uint8)CRYPTO_ALGOFAM_SHA2_224:
            RetVal.HseHashAlgo   = HSE_HASH_ALGO_SHA2_224;
            RetVal.u32HashLength = 28U;
            break;
#endif

#if (STD_ON == CRYPTO_43_HSE_SPT_SHA2_256)
        case (uint8)CRYPTO_ALGOFAM_SHA2_256:
            RetVal.HseHashAlgo   = HSE_HASH_ALGO_SHA2_256;
            RetVal.u32HashLength = 32U;
            break;
#endif

#if (STD_ON == CRYPTO_43_HSE_SPT_SHA2_384)
        case (uint8)CRYPTO_ALGOFAM_SHA2_384:
            RetVal.HseHashAlgo   = HSE_HASH_ALGO_SHA2_384;
            RetVal.u32HashLength = 48U;
            break;
#endif

#if (STD_ON == CRYPTO_43_HSE_SPT_SHA2_512)
        case (uint8)CRYPTO_ALGOFAM_SHA2_512:
            RetVal.HseHashAlgo   = HSE_HASH_ALGO_SHA2_512;
            RetVal.u32HashLength = 64U;
            break;
#endif

#if (STD_ON == CRYPTO_43_HSE_SPT_SHA2_512_224)
        case (uint8)CRYPTO_ALGOFAM_SHA2_512_224:
            RetVal.HseHashAlgo   = HSE_HASH_ALGO_SHA2_512_224;
            RetVal.u32HashLength = 28U;
            break;
#endif

#if (STD_ON == CRYPTO_43_HSE_SPT_SHA2_512_256)
        case (uint8)CRYPTO_ALGOFAM_SHA2_512_256:
            RetVal.HseHashAlgo   = HSE_HASH_ALGO_SHA2_512_256;
            RetVal.u32HashLength = 32U;
            break;
#endif

#if (STD_ON == CRYPTO_43_HSE_SPT_SHA3)
        case (uint8)CRYPTO_ALGOFAM_SHA3_224:
            RetVal.HseHashAlgo   = HSE_HASH_ALGO_SHA3_224;
            RetVal.u32HashLength = 28U;
            break;

        case (uint8)CRYPTO_ALGOFAM_SHA3_256:
            RetVal.HseHashAlgo   = HSE_HASH_ALGO_SHA3_256;
            RetVal.u32HashLength = 32U;
            break;

        case (uint8)CRYPTO_ALGOFAM_SHA3_384:
            RetVal.HseHashAlgo   = HSE_HASH_ALGO_SHA3_384;
            RetVal.u32HashLength = 48U;
            break;

        case (uint8)CRYPTO_ALGOFAM_SHA3_512:
            RetVal.HseHashAlgo   = HSE_HASH_ALGO_SHA3_512;
            RetVal.u32HashLength = 64U;
            break;
#endif

        default:
            RetVal.HseHashAlgo   = HSE_HASH_ALGO_NULL;
            RetVal.u32HashLength = 0U;
            break;
    }
    return RetVal;
}

#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)
/**
* @brief           Configure HASH block size
* @details         Set HASH block size according u8AlgoFamily
*
* @param[in]       u8AlgoFamily:    Crypto job algorithm
*
* @returns         uint8: Hash Block Size
*/
static inline uint8 Crypto_Ipw_GetHashBlockSize(uint8 u8AlgoFamily)
{
    uint8 RetVal;
    
    switch (u8AlgoFamily)
    {
        case (uint8)CRYPTO_ALGOFAM_SHA1:
        case (uint8)CRYPTO_ALGOFAM_SHA2_224:
        case (uint8)CRYPTO_ALGOFAM_SHA2_256:
            RetVal = 512 / 8;
            break;

        case (uint8)CRYPTO_ALGOFAM_SHA2_384:
        case (uint8)CRYPTO_ALGOFAM_SHA2_512:
        case (uint8)CRYPTO_ALGOFAM_SHA2_512_224:
        case (uint8)CRYPTO_ALGOFAM_SHA2_512_256:
            RetVal = 1024 / 8;
            break;

        case (uint8)CRYPTO_ALGOFAM_SHA3_224:
            RetVal = 1152 / 8;
            break;

        case (uint8)CRYPTO_ALGOFAM_SHA3_256:
            RetVal = 1088 / 8;
            break;

        case (uint8)CRYPTO_ALGOFAM_SHA3_384:
            RetVal = 832 / 8;
            break;

        case (uint8)CRYPTO_ALGOFAM_SHA3_512:
            RetVal = 576 / 8;
            break;

        default:
            /* this should never happen */
            RetVal = 0;
            break;
    }
    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */
/**
* @brief           Fills the hash descriptor
* @details         Configures the hash descriptor
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       u8StreamId:           Identifier of the HSE stream used for the job
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_Hash
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
)
{
    hseHashSrv_t*             pHashSrv      = &(pHseSrvDescriptor->hseSrv.hashReq);
#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
    Crypto_Ipw_HashConfigType HashAlgo      = Crypto_Ipw_ConfigureHashAlgo((uint8)pJob->jobPrimitiveInfo->primitiveInfo->algorithm.family);
#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)
    uint32 u32ReceivedSize, u32NoOfBytesToHse;
    uint8                     u8BlockSize   = Crypto_Ipw_GetHashBlockSize((uint8)pJob->jobPrimitiveInfo->primitiveInfo->algorithm.family);
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */
    Std_ReturnType            RetVal;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    /* Update the selected IOs or redirect if required to */
    Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

    /* [SWS_Crypto_00071] In case of START and UPDATE the output length should not be checked as the length is required only for FINISH and SINGLE CALL */
    pHseSrvDescriptor->srvId = HSE_SRV_ID_HASH;
    pHashSrv->accessMode     = Crypto_Ipw_ConfigureAccessMode (pJob->jobPrimitiveInputOutput.mode);
#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
    pHashSrv->hashAlgo       = HashAlgo.HseHashAlgo;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */
    pHashSrv->streamId       = u8StreamId;
    pHashSrv->sgtOption      = HSE_SGT_OPTION_NONE;
    /* START: inputPtr, inputLength, outputPtr and outputLengthPtr are not required, if inputLength is 0 the firmware will not process the intput.
              If inputLength is not 0 the input will be processed.
       UPDATE: inputPtr, inputLength are required
       FINISH: inputPtr, inputLength are optional, if inputLength is not 0 the input will be processed */
#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)
    if(pJob->jobPrimitiveInputOutput.mode != CRYPTO_OPERATIONMODE_SINGLECALL) 
    {
        /*  Streaming mode only */
        u32ReceivedSize = (uint32)*jobPrimitiveIOUpdate.pInputLength;
        
        /* Check if there are data for START or UPDATE mode */
        if ( (u32ReceivedSize <= (CRYPTO_IPW_BACKUP_BUFFER_SIZE - Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes)) && (pJob->jobPrimitiveInputOutput.mode != CRYPTO_OPERATIONMODE_FINISH) )
        {
            /* Get multiple of block size from input length plus number of bakup bytes */
            u32NoOfBytesToHse = Crypto_Ipw_NumberOfBytesForHseFw(u32ReceivedSize + Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes, u8BlockSize);
            
            /* Check if input length is bigger than block size */
            if (u32NoOfBytesToHse > 0u )
            {
                /* Shift the remaining data from previous request on position 0 in the backup buffer */
                Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[0u], &Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32OffsetRemainingBytes], Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes);
                /* Copy the received data into backup buffer after bytes from previous request */
                Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes], jobPrimitiveIOUpdate.pInput, u32ReceivedSize);
                
                /* Set the backup buffer as input for HASH function */            
                pHashSrv->pInput = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[0u]));
                /* Set the input length for HASH function */
                pHashSrv->inputLength = u32NoOfBytesToHse;
                
                /*Save the offset for the reamining bytes for the next request */
                Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32OffsetRemainingBytes = u32NoOfBytesToHse;
                /* Save the number of reamining bytes which were not sent to HSE FW for the next request */
                Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes = Crypto_Ipw_RemainingBytes(u32ReceivedSize + Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes, u8BlockSize);
                
                /* Sent the request to HSE */
                RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
                /* Mark the request as sent */
                *pbReqSentOverChannel = TRUE;
            }
            /* The input length is zero or less than block size */
            else
            {
                /* Shift the remaining data from previous request on position 0 in the backup buffer */
                Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[0u], &Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32OffsetRemainingBytes], Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes);
                /* Copy the received data into backup buffer after bytes from previous request */
                Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes], jobPrimitiveIOUpdate.pInput, u32ReceivedSize);
                /* Save the number of reamining bytes which can not be sent to HSE FW */
                Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes = Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes + (uint8)u32ReceivedSize;
                
                if (pJob->jobPrimitiveInputOutput.mode == CRYPTO_OPERATIONMODE_START)
                {
                    pHashSrv->pInput = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[0u]));
                    pHashSrv->inputLength = 0u;
                    RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);  
                }
                /* pJob->jobPrimitiveInputOutput.mode == CRYPTO_OPERATIONMODE_UPDATE */
                else
                {
                    /* HSE does not accept length 0 in operation mode UPDATE */
                    /* These bytes were save earlier and just give positive answer without sending a request to HSE */
                    RetVal = E_OK;  
                    
                    /* Release the allocated channel */
                    Hse_Ip_ReleaseChannel(u8MuInstance, u8MuChannel);  
                }
                
                /* Reset the offset since there are no bytes to be sent to HSE */
                Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32OffsetRemainingBytes = 0u;
                /* Mark the request as sent */
                *pbReqSentOverChannel = TRUE;
            }
        }
        /* Check if finish stage arrived */
        else if ( (pJob->jobPrimitiveInputOutput.mode == CRYPTO_OPERATIONMODE_FINISH) && (u32ReceivedSize <= (CRYPTO_IPW_BACKUP_BUFFER_SIZE - Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes)) )
        {

            /* Shift the remaining data from previous request on position 0 in the backup buffer */
            Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[0u], &Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32OffsetRemainingBytes], Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes);
            /* Copy the received data into backup buffer after bytes from previous request */
            Crypto_43_HSE_Util_MemCpy8(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes], jobPrimitiveIOUpdate.pInput, u32ReceivedSize);       
            
            Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32OffsetRemainingBytes = 0u;
                    
            pHashSrv->inputLength = Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes + u32ReceivedSize;
            pHashSrv->pInput      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].au8BackupBuffer[0u]));
            pHashSrv->pHash = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));

            /* [SWS_Crypto_00135] Store in outputLengthPtr or redirected output length the actual length of the returned value.
               If the buffer is smaller than the size of the hash, the hash will be truncated (not applicable for Miyaguchi Preneel).*/
            pHashSrv->pHashLength = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutputLength));
            RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
            /* Mark the request as sent */
            *pbReqSentOverChannel = TRUE; 
            Crypto_Ipw_aRestrictionRemovalStreaming[u8StreamId].u32NoOfBackupBytes = 0u;
        }
        else
        {
            /* Start or Update mode with length of 0, this is not allowed */
            RetVal = E_NOT_OK;
        }
    }
    else
    {
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */
        pHashSrv->pInput      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));
        pHashSrv->inputLength = (uint32)(*jobPrimitiveIOUpdate.pInputLength);
        pHashSrv->pHash = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));

        /* [SWS_Crypto_00135] Store in outputLengthPtr or redirected output length the actual length of the returned value.
           If the buffer is smaller than the size of the hash, the hash will be truncated (not applicable for Miyaguchi Preneel).*/
        pHashSrv->pHashLength = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutputLength));
        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
        /* Mark the request as sent */
        *pbReqSentOverChannel = TRUE;
#if (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL)
    }
#endif /* (STD_ON == CRYPTO_43_HSE_STREAMING_RESTRICTIONS_REMOVAL) */

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */


#if ((STD_ON == CRYPTO_43_HSE_SPT_SIPHASH) && (STD_ON == CRYPTO_43_HSE_KEYS_EXIST))
/**
* @brief           Fills the SipHash descriptor
* @details         Configures the hash descriptor
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       HseAuthDir:           HSE_AUTH_DIR_GENERATE or HSE_AUTH_DIR_VERIFY
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_SipHash
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    hseAuthDir_t          HseAuthDir,
    boolean*              pbReqSentOverChannel
)
{
    Std_ReturnType                  RetVal               = (Std_ReturnType)E_NOT_OK;
    uint32                          u32CryptoKeyIdx      = Crypto_43_HSE_Util_GetKeyIdx(pJob->cryptoKeyId);
    uint32                          u32SipHashKeyElemIdx;
    const Crypto_PrimitiveInfoType* pPrimitiveInfo       = pJob->jobPrimitiveInfo->primitiveInfo;
    hseSipHashSrv_t*                pSipHashSrv;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    /* Update the selected IOs or redirect if required to */
    Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

    /* Check parameter cryptoKeyId is out of range*/
    if (CRYPTO_43_HSE_INVALID_KEY_IDX_U32 != u32CryptoKeyIdx)
    {
        u32SipHashKeyElemIdx = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);

        /* Check parameter u32SipHashKeyElemIdx is out of range*/
        if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32SipHashKeyElemIdx)
        {
            pSipHashSrv = &(pHseSrvDescriptor->hseSrv.sipHashReq);

            pHseSrvDescriptor->srvId    = HSE_SRV_ID_SIPHASH;
            pSipHashSrv->authDir        = HseAuthDir;
            pSipHashSrv->keyHandle      = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32SipHashKeyElemIdx].u32HseKeyHandle;
            /* Load the input message */
            pSipHashSrv->inputLength    = (uint16)(*jobPrimitiveIOUpdate.pInputLength);
            pSipHashSrv->pInput         = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pInput));

            if (CRYPTO_ALGOMODE_SIPHASH_2_4 == pPrimitiveInfo->algorithm.mode)
            {
                /* Please use a 128-bit key for CRYPTO_ALGOMODE_SIPHASH_2_4 variant */
                pSipHashSrv->sipHashVariant = HSE_SIPHASH_VARIANT_64;
            }
            else
            {
                /* Please use a 128-bit key for CRYPTO_43_HSE_ALGOMODE_CUSTOM_SIPHASH_2_4_128 variant */
                pSipHashSrv->sipHashVariant = HSE_SIPHASH_VARIANT_128;
            }

            /* Choose the direction of the SipHash */
            if (HSE_AUTH_DIR_GENERATE == HseAuthDir)
            {
                pSipHashSrv->pTag      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));
                pSipHashSrv->tagLength = (uint8)(*jobPrimitiveIOUpdate.pOutputLength);
                RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
                /* Mark the request as sent */
                *pbReqSentOverChannel = TRUE;

                /* Fill the output length pointer with the result length when SipHash generation is finished successfully */
                if ((Std_ReturnType)E_OK == RetVal)
                {
                    /* For 64 bits SipHash, if value of outputLengthPtr is larger than 8 (bytes), store in outputLengthPtr the standard size */
                    if((CRYPTO_ALGOMODE_SIPHASH_2_4 == pPrimitiveInfo->algorithm.mode)
                    && (8U < *jobPrimitiveIOUpdate.pOutputLength))
                    {
                        *jobPrimitiveIOUpdate.pOutputLength = 8U;
                    }

                    /* For 128 bits SipHash, if value of outputLengthPtr is larger than 16 (bytes), store in outputLengthPtr the standard size */
                    if((CRYPTO_43_HSE_ALGOMODE_CUSTOM_SIPHASH_2_4_128 == (uint8)pPrimitiveInfo->algorithm.mode)
                    && (16U < *jobPrimitiveIOUpdate.pOutputLength))
                    {
                        *jobPrimitiveIOUpdate.pOutputLength = 16U;
                    }
                }
            }
            else
            {
                pSipHashSrv->pTag      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pSecondaryInput));
#if (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT)
                if ((NULL_PTR != pJob->jobRedirectionInfoRef) && Crypto_43_HSE_Util_IsRedirectionSet(pJob->jobRedirectionInfoRef->redirectionConfig, CRYPTO_REDIRECT_CONFIG_SECONDARY_INPUT))
                {
                    /* In case of redirection of secondary input, the Crypto driver will take the secondaryInputLength parameter from the redirected key element, where it is measured in bytes
                       Need to initialize the state machine variable storing the number of bytes with the number of bytes from the redirected keyElement*/
                    Crypto_Ipw_apMuState[u8MuInstance]->au32MacVerifyInputLenInBytes[u8MuChannel] = ((uint32)(*jobPrimitiveIOUpdate.pSecondaryInputLength));
                }
                else
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_REDIRECTION_SUPPORT) */
                {
                    /* In case of no redirection of secondary input, the Crypto driver will take the secondaryInputLength parameter from the received MacVerify job, where it is measured in bits
                       Need to initialize the state machine variable storing the number of bytes with the number of bits from the job divided by 8 */
                     Crypto_Ipw_apMuState[u8MuInstance]->au32MacVerifyInputLenInBytes[u8MuChannel] = ((uint32)(*jobPrimitiveIOUpdate.pSecondaryInputLength)) / 8U;
                }
                /* Pass to the HSE FW the address of the state machine variable instead of the adress of the job member */
                pSipHashSrv->tagLength = (uint8)(Crypto_Ipw_apMuState[u8MuInstance]->au32MacVerifyInputLenInBytes[u8MuChannel]);
                RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
                /* Mark the request as sent */
                *pbReqSentOverChannel  = TRUE;
            }
        }
    }

    /* Fill verifyPtr only for synchronous processing type.
       For asynchronous processing type the verifyPtr will be filled by Crypto_Ipw_ProcessMuChannelResponse() function. The service is only accessible in one-pass. */
    if((HSE_AUTH_DIR_VERIFY == HseAuthDir) && (CRYPTO_PROCESSING_SYNC == pJob->jobPrimitiveInfo->processingType))
    {
        /* Fill the VerifyPtr */
        Crypto_Ipw_FillVerifyPtr(pJob, &RetVal);
    }

    return RetVal;
}
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_SIPHASH) && (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)) */

/**
* @brief           Fills the random descriptor
* @details         Configures the random descriptor
*
* @param[in]       u8MuInstance:        MU instance where the job will be issued
* @param[in]       u8MuChannel:         MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:   Descriptor to be filled and send to HSE
* @param[in]       pJob:                Pointer to the job
*
* @returns         Std_ReturnType
*                   E_OK: correct configuration of parameters
*                   E_NOT_OK: incorrect configuration of parameters: incorrect lengths
*/
static inline Std_ReturnType Crypto_Ipw_Random
(
    uint8                 u8MuInstance,
    uint8                 u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob
)
{
    hseGetRandomNumSrv_t* pRndCmd    = &(pHseSrvDescriptor->hseSrv.getRandomNumReq);
    hseRngClass_t         u8RngClass = 0xFFU;
    const uint8           u8AlgoMode = (uint8)pJob->jobPrimitiveInfo->primitiveInfo->algorithm.mode;
    Std_ReturnType        RetVal;
    Crypto_43_HSE_JobPrimitiveIOUpdateType jobPrimitiveIOUpdate;

    /* Update the selected IOs or redirect if required to */
    Crypto_43_HSE_Util_UpdateInputOutput(pJob, &jobPrimitiveIOUpdate);

    pHseSrvDescriptor->srvId = HSE_SRV_ID_GET_RANDOM_NUM;
    pRndCmd->pRandomNum      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(jobPrimitiveIOUpdate.pOutput));
    /* Firmware restrictions apply to the length of the random number */
    pRndCmd->randomNumLength = *(jobPrimitiveIOUpdate.pOutputLength);
    /* Deterministic Random Generator class selection */
    switch (u8AlgoMode)
    {
        case (uint8)CRYPTO_ALGOMODE_CTRDRBG:
            u8RngClass = HSE_RNG_CLASS_DRG3;
            break;

        case CRYPTO_43_HSE_ALGOMODE_CUSTOM_DRBG_PR:
            u8RngClass = HSE_RNG_CLASS_DRG4;
            break;

        case CRYPTO_43_HSE_ALGOMODE_CUSTOM_DRBG_RS:
            u8RngClass = HSE_RNG_CLASS_PTG3;
            break;

        default:
            /* Do nothing, this point must not be reached */
            break;
    }
    pRndCmd->rngClass = u8RngClass;
    RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);

    return RetVal;
}

/**
* @brief           Verifies the response received from HSE
* @details         Verifies the response received from HSE and sets the corresponding response for CRYPTO driver
*
* @param[in]       u32Message: Response received from HSE
*
* @returns         Std_ReturnType
*                   E_OK:                       Request successful
*                   E_NOT_OK:                   Request unsuccessful
*                   CRYPTO_E_KEY_READ_FAIL:     Failure in reading the key
*                   CRYPTO_E_KEY_WRITE_FAIL:    Failure in writing the key
*                   CRYPTO_E_KEY_NOT_AVAILABLE: Key not available
*                   CRYPTO_E_KEY_NOT_VALID:     Invalid key
*                   CRYPTO_E_BUSY:              Busy
*/
static inline Std_ReturnType Crypto_Ipw_TranslateHseResponse
(
    hseSrvResponse_t HseResponse
)
{
    Std_ReturnType RetVal;

    switch (HseResponse)
    {
        /* HSE command successfully executed with no error. */
        case HSE_SRV_RSP_OK:
            RetVal = (Std_ReturnType)E_OK;
            break;
        case HSE_SRV_RSP_NOT_ENOUGH_SPACE:          /* There is no enough space to perform operation (e.g. load a key) */
        /* fall-through */
        case HSE_SRV_RSP_STREAMING_MODE_FAILURE:    /* The service request that uses streaming mode failed (e.g. UPDATES and FINISH steps do not use the same HSE interface ID and channel ID as START step) */
        /* fall-through */
        case HSE_SRV_RSP_MEMORY_FAILURE:            /* Detect physical errors, flipped bits etc., during memory read or write operations. */
        /* fall-through */
        case HSE_SRV_RSP_GENERAL_ERROR:             /* This error code is returned if an error not covered by the error codes above is detected inside HSE. */
            RetVal = (Std_ReturnType)E_NOT_OK;
            break;
        case HSE_SRV_RSP_VERIFY_FAILED:             /* HSE signals that a verification request fails (e.g. MAC and Signature verification)  */
            RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_VERIFY_FAILED;
            break;

        /* The service request failed because the specified key slot is empty. */
        case HSE_SRV_RSP_KEY_EMPTY:
            RetVal = (Std_ReturnType)CRYPTO_E_KEY_EMPTY;
            break;

        /* The service request failed because read access was denied */
        case HSE_SRV_RSP_READ_FAILURE:
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
            RetVal = (Std_ReturnType)CRYPTO_E_KEY_READ_FAIL;
#else
            RetVal = (Std_ReturnType)E_NOT_OK;
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */
            break;

        /* The service request failed because read access was denied */
        case HSE_SRV_RSP_WRITE_FAILURE:
            RetVal = (Std_ReturnType)CRYPTO_E_KEY_WRITE_FAIL;
            break;

        /* This error code is returned if a key is locked due to failed boot measurement or an active debugger. */
        case HSE_SRV_RSP_KEY_NOT_AVAILABLE:
            RetVal = (Std_ReturnType)CRYPTO_E_KEY_NOT_AVAILABLE;
            break;

        /* Specified key slot is either not valid or not available due to a key usage flags restrictions. */
        case HSE_SRV_RSP_KEY_INVALID:
            RetVal = (Std_ReturnType)CRYPTO_E_KEY_NOT_VALID;
            break;

        /* Specified size of tag is not valid or not supported by HSE */
        case HSE_SRV_RSP_INVALID_PARAM: /* The HSE request parameters are invalid (e.g misaligned, invalid range) */
            RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_INVALID_PARAM;
            break;

        /* Extension to HSE returned values for signaling that no response was received from HSE in the timeout window */
        case HSE_IP_SRV_RSP_NO_RESPONSE:
            RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_OPERATION_TIMEOUT;
            break;

        default:
            /* Should not get here */
            RetVal = (Std_ReturnType)E_NOT_OK;
            break;
    }

    return RetVal;
}

/**
* @brief           Function to process the Hse response received on a channel
* @details         Function to process the Hse response received on a channel
*
* @param[in]       u8MuInstance:   MU instance where the Hse response was received
* @param[in]       u8MuChannel:    MU channel where the Hse response was received
* @param[in]       HseResponse:    HSE service response
* @param[in]       pCallbackParam: Parameter used to call the asynchronous callback (can be NULL)
*
* @returns         void
*/
static void Crypto_Ipw_ProcessMuChannelResponse
(
    uint8            u8MuInstance,
    uint8            u8MuChannel,
    hseSrvResponse_t HseResponse,
    void*            pCallbackParam
)
{
    const uint32          u32PartitionId   = Crypto_43_HSE_Util_GetPartitionId();
    /* Crypto_Ipw layer always adds the pointer to the Crypto job as callback parameter to Hse_Ip_ServiceRequest() */
    Crypto_JobType* const pCryptoJob               = (Crypto_JobType*)pCallbackParam;
    Std_ReturnType        CryptoErrorCode;
    uint32                u32CdoIdx;

    /* Try to get jobs from the CDO's queues only if the Crypto Driver has been initialized */
    if (CRYPTO_43_HSE_DRIVER_INITIALIZED == Crypto_43_HSE_aeDriverState[u32PartitionId])
    {
        /* This Hse request is complete. If there are jobs in the queue of the CDO running on the current partition, send them to HSE for processing */
        Crypto_Ipw_PushJobsFromQueuesToHse(u8MuInstance, u32PartitionId);
    }
    /* As the asynchronous job is complete, mark the channel as having an invalid JobId value */
    Crypto_Ipw_apMuState[u8MuInstance]->au32MuChannelJobId[u8MuChannel] = CRYPTO_IPW_INVALID_VAL_FOR_JOBID_U32;

    /* Translate the message received from HSE to Crypto error code */
    CryptoErrorCode = Crypto_Ipw_TranslateHseResponse(HseResponse);
    if (CRYPTO_43_HSE_RET_INVALID_PARAM == CryptoErrorCode)
    {
        CryptoErrorCode = (Std_ReturnType)E_NOT_OK;
    }
    /* Fill the verifyPtr in case the primitive was MacGenerate or AEAD Decrypt */
    Crypto_Ipw_FillVerifyPtr(pCryptoJob, &CryptoErrorCode);

    /* Check if the job is in FINISH operation mode, single call operation mode or if an error occured */
    if (((uint8)CRYPTO_OPERATIONMODE_FINISH == (uint8)(((uint8)(pCryptoJob->jobPrimitiveInputOutput.mode)) & CRYPTO_IPW_OPERATIONMODE_FINISH_MASK_U8))||
        ((Std_ReturnType)E_OK != CryptoErrorCode)
       )
    {
        /* [SWS_Crypto_00018][SWS_Crypto_00119] Clear the job state for FINISH operation mode or if an error occured in START,UPDATE or FINISH operation mode.
           The state will be cleared for single call too as it contains the FINISH step. */
        pCryptoJob->jobState = CRYPTO_JOBSTATE_IDLE;
        /* Free stream for FINISH operation mode or if an error occured during streaming */
        if (CRYPTO_OPERATIONMODE_SINGLECALL!= pCryptoJob->jobPrimitiveInputOutput.mode)
        {
            /* Get the index of the CDO where the currently processed job came on */
            u32CdoIdx = Crypto_Ipw_apMuState[u8MuInstance]->au32MuChannelCDOIdx[u8MuChannel];
            /* Free the stream for the current job */
            Crypto_Ipw_FreeStream(u32CdoIdx, pCryptoJob->jobId);
        }
    }

    /* Call the callback */
    CryIf_CallbackNotification(pCryptoJob, CryptoErrorCode);
}

/**
* @brief           Processes a job
* @details         Tries to initiate a request to HSE to process a job. If no MU channels are available returns CRYPTO_E_BUSY
*
* @param[in]       u8MuInstance: MU instance used to send the request to HSE
* @param[in]       u32ObjectIdx: Index of the Crypto Driver Object where the job will be processed
* @param[in]       pJob:         Pointer to the job to be processed
*
* @returns         Std_ReturnType
*                   E_OK:          Request successful
*                   E_NOT_OK:      Request unsuccessful
*                   CRYPTO_E_BUSY: No MU channels available to process the requested job operation
*/
static Std_ReturnType Crypto_Ipw_ProcessOperation
(
    const uint8     u8MuInstance,
    uint32          u32ObjectIdx,
    Crypto_JobType* pJob
)
{
    uint8                          u8MuChannel;
    Std_ReturnType                 RetVal;
    uint8                          u8StreamId = CRYPTO_IPW_INVALID_STREAM_ID_U8;
    hseSrvDescriptor_t*            pHseSrvDescriptor;
    boolean                        bReqSentOverChannel;
#if (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT)
    const Crypto_OperationModeType eJobMode   = pJob->jobPrimitiveInputOutput.mode;
    boolean                        bSaveRestoreContextUsed = FALSE;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) */

    /* Check if a free MU channel can be found */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);
    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        /* Channel successfully obtain, keep the status of the request and mark it as waiting to be send */
        bReqSentOverChannel = FALSE;
        pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);
        /* Check operation mode status */
        RetVal = Crypto_Ipw_OperationModeControl(pJob);

        /* If the job has stream mode operation check if any stream slots is available */
        if ((CRYPTO_OPERATIONMODE_SINGLECALL != pJob->jobPrimitiveInputOutput.mode) && ((Std_ReturnType)E_OK == RetVal))
        {
            /* Grab an available stream */
            u8StreamId = Crypto_Ipw_AllocStream(u32ObjectIdx, pJob);
            if (CRYPTO_IPW_INVALID_STREAM_ID_U8 == u8StreamId)
            {
                RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_STREAM_BUSY;
            }

#if (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT)
            /* Check if the operation mode is related to Saving/Restoring Context */
            if(((Std_ReturnType)E_OK == RetVal) && ((CRYPTO_OPERATIONMODE_SAVE_CONTEXT == eJobMode) || (CRYPTO_OPERATIONMODE_RESTORE_CONTEXT == eJobMode)))
            {
                RetVal = Crypto_Ipw_SaveRestoreContext(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, &bReqSentOverChannel);
                bSaveRestoreContextUsed = TRUE;

                if ((CRYPTO_OPERATIONMODE_SAVE_CONTEXT == eJobMode) && (E_OK == RetVal))
                {
                    /* Free stream as it was successfully saved */
                    Crypto_Ipw_FreeStream(u32ObjectIdx, pJob->jobId);
                }
            }
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) */
        }

#if (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT)
        /* If Save/Restore context operation mode was used, there is no reason to process the used service(no new input/data can be provided) */
        if (((Std_ReturnType)E_OK == RetVal) && (FALSE == bSaveRestoreContextUsed))
        {
#else
        if ((Std_ReturnType)E_OK == RetVal)
        {
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT) */
            /* Store the index of the CDO where the job came from */
            Crypto_Ipw_apMuState[u8MuInstance]->au32MuChannelCDOIdx[u8MuChannel] = u32ObjectIdx;

            /* Service the request */
            if(CRYPTO_OPERATIONMODE_STREAMSTART == pJob->jobPrimitiveInputOutput.mode)
            {
                /* According to HSE interface files,
                   HSE_ACCESS_MODE_START behaves like CRYPTO_OPERATIONMODE_STREAMSTART (except AEAD services)
                   If valid inputs and output parameters are provided in Crypto_JobType object. */
                pJob->jobPrimitiveInputOutput.mode = CRYPTO_OPERATIONMODE_START;
                RetVal = Crypto_Ipw_ServiceRequest(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, &bReqSentOverChannel);

                /* restoring job mode */
                pJob->jobPrimitiveInputOutput.mode = CRYPTO_OPERATIONMODE_STREAMSTART;
            }
            else
            {
                RetVal = Crypto_Ipw_ServiceRequest(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, &bReqSentOverChannel);
            }

            if ((CRYPTO_PROCESSING_SYNC      == pJob->jobPrimitiveInfo->processingType)
            && ((CRYPTO_OPERATIONMODE_FINISH == pJob->jobPrimitiveInputOutput.mode) || ((Std_ReturnType)E_OK != RetVal)))
            {
                /* Clear stream status for SYNC requests */
                Crypto_Ipw_FreeStream(u32ObjectIdx, pJob->jobId);
            }
        }

        /* Free the allocated channel in case the request was not sent to firmware */
        if (FALSE == bReqSentOverChannel)
        {
            Hse_Ip_ReleaseChannel(u8MuInstance, u8MuChannel);
        }
    }
    else
    {
        /* No free MU channel was found */
        RetVal = (Std_ReturnType)CRYPTO_E_BUSY;
    }
    return RetVal;
}


/**
* @brief           Sends to HSE the request to cancel a service request in progress
* @details         Sends to HSE the request to cancel a service request in progress
*
* @param[in]       u8MuInstance:         MU instance used to send the request to HSE
* @param[in]       u8MuChannel:          MU channel used to send the request to HSE
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       u8MuChannelToCancel:  MU channel for which the request should be cancelled
*
* @returns         Std_ReturnType
*/
static inline Std_ReturnType Crypto_Ipw_SendCancelJobReq
(
    uint8               u8MuInstance,
    uint8               u8MuChannel,
    hseSrvDescriptor_t* pHseSrvDescriptor,
    uint8               u8MuChannelToCancel
)
{
    Std_ReturnType RetVal;

    /* Fill the request message */
    pHseSrvDescriptor->srvId = HSE_SRV_ID_CANCEL;
    pHseSrvDescriptor->hseSrv.cancelSrvReq.muChannelIdx = u8MuChannelToCancel;

    /* TMU driver uses the same channel0 as the cancel job request in interrupt context to send requests to HSE thus
       when entering the TMU interrupt handler the channel0 must be free in order to allow a send request to HSE,
       to ensure this send message function should complete the request to HSE and not be interrupted by TMU */
    SchM_Enter_Crypto_43_HSE_CRYPTO_EXCLUSIVE_AREA_05();
    /* Send the cancel request to HSE */
    RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);
    SchM_Exit_Crypto_43_HSE_CRYPTO_EXCLUSIVE_AREA_05();

    return RetVal;

}

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT))
/**
* @brief           Function to obtain key information.
* @details         Requests HSE to return hseKeyInfo_t of the key.
*
* @param[in]       u8MuInstance:    MU instance where the key info will be requested
* @param[in]       u32HseKeyHandle: Key handle of the key.
*
* @returns         Std_ReturnType
*/
static inline Std_ReturnType Crypto_Ipw_GetKeyInfo
(
    const uint8   u8MuInstance,
    uint32        u32HseKeyHandle,
    hseKeyInfo_t* pHseKeyInfoStorage
)
{
#if(STD_ON == CRYPTO_43_HSE_SPT_GETKEYINFO)
    hseSrvDescriptor_t* pHseSrvDescriptor;
    uint8               u8MuChannel;
    Std_ReturnType      RetVal = (Std_ReturnType)E_NOT_OK;

    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);
        /* Fill the HSE descriptor with a request to get key info */
        pHseSrvDescriptor->srvId                          = HSE_SRV_ID_GET_KEY_INFO;
        pHseSrvDescriptor->hseSrv.getKeyInfoReq.keyHandle = u32HseKeyHandle;
        if(NULL_PTR != pHseKeyInfoStorage)
        {
            pHseSrvDescriptor->hseSrv.getKeyInfoReq.pKeyInfo  = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pHseKeyInfoStorage));
        }
        else
        {
            pHseSrvDescriptor->hseSrv.getKeyInfoReq.pKeyInfo  = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel]));
        }
        /* Send the request to HSE, synchronously */
        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);
    }
#else
    Std_ReturnType RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;
    /* Ignore compiler warnings */
    (void)u8MuInstance;
    (void)u32HseKeyHandle;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_GETKEYINFO) */
    return RetVal;
}
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT)) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_GETKEYINFO) || (STD_ON == CRYPTO_43_HSE_SPT_KEYVERIFY))
/**
* @brief           Function that checks validity of the key material of a Crypto key with respect to the Crypto key's generic type
* @details         Function that checks validity of the key material of a Crypto key with respect to the Crypto key's generic type
*
* @param[in]       u8MuInstance              :  MU instance used to send the request to HSE
* @param[in]       u32CryptoKeyIdx           :  Index of the Crypto key
* @param[in]       u32KeyMaterialKeyElemIdx  :  Index of the Crypto key material
* @param[in]       u32HseKeyHandle           :  Valid value of HSE Key Handle
*
* @returns         Std_ReturnType
*                  E_OK         : The operation was executed successfully.
*                  E_NOT_OK     : The operation failed.
*                  CRYPTO_E_BUSY: No MU channels available to process the requested job operation.
*                  CRYPTO_E_KEY_EMPTY         : Specified key slot is empty.
*                  CRYPTO_E_KEY_NOT_AVAILABLE : This error code is returned if a key is locked or not available.
*/
static inline Std_ReturnType Crypto_Ipw_CheckGenericKey
(
    const uint8  u8MuInstance,
    const uint32 u32CryptoKeyIdx,
    const uint32 u32KeyMaterialKeyElemIdx,
    const uint32 u32HseKeyHandle
)
{
    Std_ReturnType              RetVal;
    uint8                       u8MuChannel;
    uint8                       u8KeyType;

#if (STD_ON == CRYPTO_43_HSE_SPT_KEYVERIFY)
    Crypto_43_HSE_KeyFormatType eKeyFormat;
    const uint8                 u8InputBuffer[64] = { 0U };
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEYVERIFY) */
    hseSrvDescriptor_t*         pHseSrvDescriptor;

    /* We have found at least one key element in the current key which is using HSE*/
    u8KeyType  = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u8HseKeyType;

    /*Check key type before verifying, as SHE keys are validated differently than other keys*/
    if ((uint8)HSE_KEY_TYPE_SHE == u8KeyType)
    {
#if (STD_ON == CRYPTO_43_HSE_SPT_KEYVERIFY)
        /*Check key type before verifying, as SHE keys are validated differently than other keys*/
        eKeyFormat = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].eCryptoKeyFormat;

        if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_SHEKEYS == eKeyFormat)
        {
            /* Get a free channel, if possible */
            u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);

            if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
            {
                pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);
                /* Fill the HSE descriptor with a request to get key info */
                pHseSrvDescriptor->srvId                            = HSE_SRV_ID_KEY_VERIFY;
                pHseSrvDescriptor->hseSrv.verifyKeyReq.keyHandle    = u32HseKeyHandle;
                pHseSrvDescriptor->hseSrv.verifyKeyReq.keyVerAlgo   = HSE_KEY_VER_SHA256;
                pHseSrvDescriptor->hseSrv.verifyKeyReq.tagLen       = CRYPTO_IPW_INPUT_BUFFER_TAG_LENGTH;
                pHseSrvDescriptor->hseSrv.verifyKeyReq.pTag         = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&u8InputBuffer[0u]));

                /* Send the request to HSE, synchronously */
                RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);

                /* Here we are performing negaive check, only if key slot have valid key varification will fail */
                if((Std_ReturnType)CRYPTO_43_HSE_RET_VERIFY_FAILED == RetVal)
                {
                    RetVal = (Std_ReturnType)E_OK;
                }
                else if (((Std_ReturnType)CRYPTO_E_KEY_EMPTY == RetVal) || ((Std_ReturnType)CRYPTO_E_KEY_NOT_AVAILABLE == RetVal))
                {
                    /* The HSE slot information is empty or not available for verification. Mark the key as invalid. */
                    *Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].KeyStatus = (uint8)CRYPTO_KEYSTATUS_INVALID;
                }
                else
                {
                    /* All other errors should return E_NOT_OK */
                    RetVal = (Std_ReturnType)E_NOT_OK;
                }
            }
            else
            {
                /* No free MU channel was found */
                RetVal = (Std_ReturnType)CRYPTO_E_BUSY;
            }
        }
        else
        {
            /* Incompatible key format used for SHE keys */
            RetVal = (Std_ReturnType)E_NOT_OK;
        }
#else
        /* Verification service is not available, return E_OK */
        RetVal = (Std_ReturnType)E_OK;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEYVERIFY) */
    }
    else
    {
#if (STD_ON == CRYPTO_43_HSE_SPT_GETKEYINFO)
        /* Get a free channel, if possible */
        u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);

        if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
        {
            pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);
            /* Fill the HSE descriptor with a request to get key info */
            pHseSrvDescriptor->srvId                          = HSE_SRV_ID_GET_KEY_INFO;
            pHseSrvDescriptor->hseSrv.getKeyInfoReq.keyHandle = u32HseKeyHandle;
            pHseSrvDescriptor->hseSrv.getKeyInfoReq.pKeyInfo  = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&(Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel])));

            /* Send the request to HSE, synchronously */
            RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);
            if ((Std_ReturnType)E_OK != RetVal)
            {
                if (((Std_ReturnType)CRYPTO_E_KEY_EMPTY == RetVal) || ((Std_ReturnType)CRYPTO_E_KEY_NOT_AVAILABLE == RetVal))
                {
                    /* The HSE slot information is empty or not available for check. Mark the key as invalid. */
                    *Crypto_43_HSE_aKeyList[u32CryptoKeyIdx].KeyStatus = (uint8)CRYPTO_KEYSTATUS_INVALID;
                }
                else
                {
                    RetVal = (Std_ReturnType)E_NOT_OK;
                }
            }
        }
        else
        {
            /* No free MU channel was found */
            RetVal = (Std_ReturnType)CRYPTO_E_BUSY;
        }
#else
        /* Verification service is not available, return E_OK */
        RetVal = (Std_ReturnType)E_OK;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_GETKEYINFO) */
    }

    return RetVal;
}
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_GETKEYINFO) || (STD_ON == CRYPTO_43_HSE_SPT_KEYVERIFY)) */

#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE)
/**
* @brief           Function to fill and send to HSE request to generate a key
* @details         Function to fill and send to HSE request to generate a key
*
* @param[in]       u8MuInstance:         MU instance where the Hse request will be sent
* @param[in]       u8MuChannel:          MU channel where the Hse request will be sent
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       u32CryptoKeyIdx:      Index of the Crypto key
* @param[in]       pJob:                 Pointer to the Crypto job
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*/
static Std_ReturnType Crypto_Ipw_KeyGenerateRequest
(
    const uint8           u8MuInstance,
    const uint8           u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    const uint32          u32CryptoKeyIdx,
    boolean*              pbReqSentOverChannel
)
{
    Std_ReturnType       RetVal                    = (Std_ReturnType)E_NOT_OK;
    hseKeyGenerateSrv_t* pKeyGenSrv;
    hseKeyInfo_t*        pKeyInfo;
          uint32         u32Intermediate;
    const uint32         u32KeyMaterialKeyElemIdx  = Crypto_43_HSE_Util_GetKeyElementIdx (u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);
          uint8          u8AlgoFam                 = (uint8)CRYPTO_ALGOFAM_NOT_SET;
          uint32         u32KeyLength;
          hseKeyType_t   KeyType;
          uint32         u32KeyHandle;
          hseKeyFlags_t  hseKeyFlags;
    const uint32         u32AlgoFamKeyElemIdx      = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYGENERATE_ALGORITHM);

#if (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_PAIR_GEN)
    const uint8*         pBaseExchange;
          uint32         u32BaseExchangeLength;
    const uint32         u32BaseExchangeKeyElemIdx = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYEXCHANGE_BASE);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_PAIR_GEN) */
#if (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN)
    const uint32         u32CurveIdKeyElemIdx      = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_43_HSE_KE_KEYGENERATE_CURVETYPE);
    uint8                u8CurveId                 = HSE_EC_CURVE_NONE;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN) */

    /* Check if the u32KeyMaterialKeyElemIdx is valid */
    if(CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32KeyMaterialKeyElemIdx)
    {
        u32KeyLength                  = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32CryptoKeyElementMaxSize;
        KeyType                       = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u8HseKeyType;
        u32KeyHandle                  = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;
        hseKeyFlags                   = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].hseKeyFlags;

        pHseSrvDescriptor->srvId      = HSE_SRV_ID_KEY_GENERATE;
        u32Intermediate               = Crypto_Ipw_GetBitLenFromByteLen(u32KeyLength);
        pKeyGenSrv                    = &(pHseSrvDescriptor->hseSrv.keyGenReq);
        pKeyInfo = &(pKeyGenSrv->keyInfo);

        pKeyGenSrv->targetKeyHandle   = (hseKeyHandle_t)u32KeyHandle;
        pKeyInfo->keyType   = KeyType;
        pKeyInfo->keyBitLen = (uint16)u32Intermediate;
        pKeyInfo->keyFlags  = hseKeyFlags;
        /* SMR not used thus the flags are set to zero */
        pKeyInfo->smrFlags    = (hseSmrFlags_t)0x00;
        /* For RAM keys, the key counter is forced to zero (not used) and for NVM it will be set to zero */
        pKeyInfo->keyCounter  = (uint32)0x00;
        /* Clear the HseReserved bytes in the keyInfo structure, as HSE FW expects these to be 0 */
        pKeyInfo->hseReserved[0U] = 0U;
        pKeyInfo->hseReserved[1U] = 0U;

        if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32AlgoFamKeyElemIdx)
        {
            u8AlgoFam = *Crypto_43_HSE_aKeyElementList[u32AlgoFamKeyElemIdx].pCryptoElementArray;
        }

        switch (u8AlgoFam)
        {
#if (STD_ON == CRYPTO_43_HSE_SPT_SYM_RND_KEY_GEN)
            case (uint8)CRYPTO_ALGOFAM_AES:
                pKeyGenSrv->keyGenScheme = (hseKeyGenScheme_t)HSE_KEY_GEN_SYM_RANDOM_KEY;

                /* Enable using the generated key with any AES block mode */
#if (STD_ON == CRYPTO_43_HSE_AES_BLOCK_MODE_MASK)
    #ifdef HSE_KU_AES_BLOCK_MODE_ANY
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].specific.aesBlockModeMask = HSE_KU_AES_BLOCK_MODE_ANY; /* Any AES block mode can be used */
    #else
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].specific.aesBlockModeMask = (hseAesBlockModeMask_t)0U; /* Any AES block mode can be used */
    #endif
#endif /* (STD_ON == CRYPTO_43_HSE_AES_BLOCK_MODE_MASK) */

                /* Mark the request as being valid. Use temporary the RetVal variable */
                RetVal = (Std_ReturnType)E_OK;
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SYM_RND_KEY_GEN) */

#if (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_PAIR_GEN)
            case (uint8)CRYPTO_ALGOFAM_RSA:
                /* Check if Base Exchange key element exists in target key */
                if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32BaseExchangeKeyElemIdx)
                {
                    pBaseExchange         = Crypto_43_HSE_aKeyElementList[u32BaseExchangeKeyElemIdx].pCryptoElementArray;
                    u32BaseExchangeLength = *Crypto_43_HSE_aKeyElementList[u32BaseExchangeKeyElemIdx].pu32CryptoElementActualSize;
                    /* - For RSA, keyBitLen specifies the bit length of the public modulus which shall be generated. */
                    pKeyInfo->keyBitLen                = (uint16) Crypto_Ipw_GetBitLenFromByteLen((uint32)CRYPTO_IPW_RSA_MOD_LEN);
                    pKeyInfo->specific.pubExponentSize = (uint8)u32BaseExchangeLength;
                    pKeyGenSrv->keyGenScheme                     = (hseKeyGenScheme_t) HSE_KEY_GEN_RSA_KEY_PAIR;
                    pKeyGenSrv->sch.rsaKey.pubExpLength          = u32BaseExchangeLength;
                    pKeyGenSrv->sch.rsaKey.pPubExp               = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pBaseExchange[0u]));
                    /*The  public modulus n. It can be NULL (the modulus is not provided using this service).*/
                    pKeyGenSrv->sch.rsaKey.pModulus              = (HOST_ADDR)0U;
                    /* Mark the request as being valid. Use temporary the RetVal variable */
                    RetVal                                       = (Std_ReturnType)E_OK;
                }
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_PAIR_GEN) */

#if (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN)
            case (uint8)CRYPTO_ALGOFAM_ECCNIST:
            /* fall-through */
            case (uint8)CRYPTO_ALGOFAM_BRAINPOOL:
            /* fall-through */
            case (uint8)CRYPTO_ALGOFAM_ED25519:
            /* fall-through */
            case (uint8)CRYPTO_43_HSE_ALGOFAM_CUSTOM_ED25519PH:
            /* fall-through */
            case (uint8)CRYPTO_43_HSE_ALGOFAM_CUSTOM_ED448:
                /* Check if curve id data have been imported previously in the target key */
                if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32CurveIdKeyElemIdx)
                {
                    /* Load the coresponding curve id based on user key element data */
                    u8CurveId = Crypto_Ipw_GetEccCurveId(u32CurveIdKeyElemIdx, u8AlgoFam);

                    if (HSE_EC_CURVE_NONE != u8CurveId)
                    {
                        pKeyInfo->keyBitLen           = Crypto_Ipw_EccKeyBitLen(u8CurveId); /* For ECC, the bit length of the base point order. */
                        pKeyInfo->specific.eccCurveId = (hseEccCurveId_t)u8CurveId;
                        pKeyGenSrv->keyGenScheme                = (hseKeyGenScheme_t)HSE_KEY_GEN_ECC_KEY_PAIR;
                        pKeyGenSrv->sch.eccKey.pPubKey          = (HOST_ADDR)0U;
                        /* Mark the request as being valid. Use temporary the RetVal variable */
                        RetVal                                  = (Std_ReturnType)E_OK;
                    }
                }
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_PAIR_GEN) */

            default:
                 /* Do nothing. RetVal is already set to E_NOT_OK which is the value that will be returned by the function */
                 break;
        }

        if ((Std_ReturnType)E_OK == RetVal)
        {
            RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
            /* Mark the request as sent */
            *pbReqSentOverChannel = TRUE;
        }
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE) */

#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE)
/**
* @brief         Fill and send service data for key derivation
* @details       Based on user configured algorithm this function will send key derivation command to HSE
*
* @param[in]       u8MuInstance:         MU instance where the Hse request will be sent
* @param[in]       u8MuChannel:          MU channel where the Hse request will be sent
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       u32CryptoKeyIdx:      Index of the Crypto key
* @param[in]       u32TargetKeyIdx:      Index of the Target key
* @param[in]       pJob:                 Pointer to the Crypto job
* @param[inout]    pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK:     Correct configuration of parameters
*                   E_NOT_OK: Incorrect configuration of parameters: incorrect lengths
*/
static Std_ReturnType Crypto_Ipw_KeyDeriveRequest
(
    const uint8           u8MuInstance,
    const uint8           u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
#if ((STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2))
    Crypto_JobType*       pJob,
#else
    const Crypto_JobType* pJob,
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)) */
    const uint32          u32CryptoKeyIdx,
    const uint32          u32TargetKeyIdx,
#if ((STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2))
    boolean*              pbReqSentOverChannel
#else
    const boolean*        pbReqSentOverChannel
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)) */
)
{
    Std_ReturnType                  RetVal                        = (Std_ReturnType)E_NOT_OK;
#if ((STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2))
    hseKeyDeriveSrv_t*              pDeriveKeySrv;
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)) */
    const uint32                    u32PasswordKeyElemIdx         = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYDERIVATION_PASSWORD);
    const uint32                    u32DerivAlgoKeyElemIdx        = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYDERIVATION_ALGORITHM);
    const uint32                    u32DerivSaltKeyElemIdx        = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYDERIVATION_SALT);
    const uint32                    u32TargetKeyMaterialElemIdx   = Crypto_43_HSE_Util_GetKeyElementIdx(u32TargetKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);
    const uint32                    u32DerivSecondAlgoKeyElemIdx  = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_43_HSE_KE_KEYDERIVATION_ALGORITHM_SECONDARY);
#if (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)
    const uint32                    u32DerivIterationKeyElemIdx   = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYDERIVATION_ITERATIONS);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2) */
          uint32                    u32KeyHandle;
          uint32                    u32TargetKeyHandle;
          uint8                     u8KeyDeriveAlgo;
#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
          Crypto_Ipw_HashConfigType HashAlgo;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */

    /* Check that all indexes returned by Crypto_Util_GetKeyElementIdx are valid (except u32DerivIterationKeyElemIdx). A logic OR between all indexes will be equal to CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 when at least
       one of the indexes is invalid */
    if(CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != (u32PasswordKeyElemIdx | u32DerivAlgoKeyElemIdx | u32TargetKeyMaterialElemIdx | u32DerivSecondAlgoKeyElemIdx))
    {
        u32KeyHandle       = Crypto_43_HSE_aKeyElementList[u32PasswordKeyElemIdx].u32HseKeyHandle;
        u32TargetKeyHandle = Crypto_43_HSE_aKeyElementList[u32TargetKeyMaterialElemIdx].u32HseKeyHandle;
        u8KeyDeriveAlgo    = Crypto_43_HSE_aKeyElementList[u32DerivAlgoKeyElemIdx].pCryptoElementArray[CRYPTO_43_HSE_KEY_DERIVE_ALGORITHM_IDX];
#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
        HashAlgo           = Crypto_Ipw_ConfigureHashAlgo(Crypto_43_HSE_aKeyElementList[u32DerivSecondAlgoKeyElemIdx].pCryptoElementArray[CRYPTO_IPW_ALGORITHM_SECONDARY_IDX]);
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */

        /* Set Hse service type to Derive */
        pHseSrvDescriptor->srvId = HSE_SRV_ID_KEY_DERIVE;

#if (STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)
        /* Keep a pointer to the derive structure, to optimize code */
        pDeriveKeySrv = &(pHseSrvDescriptor->hseSrv.keyDeriveReq);

        switch (u8KeyDeriveAlgo)
        {
#if (STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963)
            case (uint8)CRYPTO_ALGOFAM_KDFX963:
                pDeriveKeySrv->kdfAlgo                      = HSE_KDF_ALGO_ANS_X963;
                pDeriveKeySrv->sch.ANS_X963.srcKeyHandle    = (hseKeyHandle_t)u32KeyHandle;
                pDeriveKeySrv->sch.ANS_X963.targetKeyHandle = (hseKeyHandle_t)u32TargetKeyHandle;
                pDeriveKeySrv->sch.ANS_X963.keyMatLen       = (uint16)Crypto_43_HSE_aKeyElementList[u32TargetKeyMaterialElemIdx].u32CryptoKeyElementMaxSize;
                pDeriveKeySrv->sch.ANS_X963.kdfPrf          = HSE_KDF_PRF_HASH;
                /* KDF hash can only take the values defined for hseHmacPrfAlgo_t */
                pDeriveKeySrv->sch.ANS_X963.prfAlgo.hash    = (hseHmacPrfAlgo_t)HashAlgo.HseHashAlgo;

                if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32DerivSaltKeyElemIdx)
                {
                    pDeriveKeySrv->sch.ANS_X963.pInfo      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(Crypto_43_HSE_aKeyElementList[u32DerivSaltKeyElemIdx].pCryptoElementArray));
                    pDeriveKeySrv->sch.ANS_X963.infoLength = *Crypto_43_HSE_aKeyElementList[u32DerivSaltKeyElemIdx].pu32CryptoElementActualSize;
                }
                else
                {
                    /* SharedInfo input parameter is optional for ANSI X9.63. We will only ensure that the HSE descriptor is filled in correctly */
                    pDeriveKeySrv->sch.ANS_X963.pInfo      = (HOST_ADDR)0U;
                    pDeriveKeySrv->sch.ANS_X963.infoLength = (uint32)0U;
                }

                RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
                /* Mark the request as sent */
                *pbReqSentOverChannel = TRUE;
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) */

#if (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)
            case (uint8)CRYPTO_ALGOFAM_PBKDF2:
                /* The iterations value must be a 32bit value */
                if ((CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32DerivIterationKeyElemIdx) && ((uint32)4U == *Crypto_43_HSE_aKeyElementList[u32DerivIterationKeyElemIdx].pu32CryptoElementActualSize))
                {
                    pDeriveKeySrv->kdfAlgo                    = HSE_KDF_ALGO_PBKDF2HMAC;
                    pDeriveKeySrv->sch.PBKDF2.srcKeyHandle    = (hseKeyHandle_t)u32KeyHandle;
                    pDeriveKeySrv->sch.PBKDF2.targetKeyHandle = (hseKeyHandle_t)u32TargetKeyHandle;
                    pDeriveKeySrv->sch.PBKDF2.keyMatLen       = (uint16)Crypto_43_HSE_aKeyElementList[u32TargetKeyMaterialElemIdx].u32CryptoKeyElementMaxSize;
                    /* KDF hash can only take the values defined for hseHmacPrfAlgo_t */
                    pDeriveKeySrv->sch.PBKDF2.hmacHash        = (hseHmacPrfAlgo_t)HashAlgo.HseHashAlgo;
                    pDeriveKeySrv->sch.PBKDF2.iterations      = *(uint32 *)Crypto_43_HSE_aKeyElementList[u32DerivIterationKeyElemIdx].pCryptoElementArray;

                    if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32DerivSaltKeyElemIdx)
                    {
                        pDeriveKeySrv->sch.PBKDF2.saltLength = *Crypto_43_HSE_aKeyElementList[u32DerivSaltKeyElemIdx].pu32CryptoElementActualSize;
                        pDeriveKeySrv->sch.PBKDF2.pSalt      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(Crypto_43_HSE_aKeyElementList[u32DerivSaltKeyElemIdx].pCryptoElementArray));
                    }

                    RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
                    /* Mark the request as sent */
                    *pbReqSentOverChannel = TRUE;
                }
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2) */

            default:
                /* Do nothing. Function will return E_NOT_OK for an unsupported derive algo */
                break;
        }
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2) */
    }

    /* Avoid compiler warnings */
#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
    (void)HashAlgo;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */
    (void)u32KeyHandle;
    (void)u32TargetKeyHandle;
    (void)u32DerivSaltKeyElemIdx;
#if ((STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2))
    (void)pDeriveKeySrv;
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_KDF_ANS_X963) || (STD_ON == CRYPTO_43_HSE_SPT_PBKDF2)) */
    (void)u8MuInstance;
    (void)u8MuChannel;
    (void)pJob;
    (void)pbReqSentOverChannel;
    (void)u8KeyDeriveAlgo;

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE) */

#if (((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) && (STD_ON == CRYPTO_43_HSE_SPT_COMPUTE_DH))
/**
* @brief         Fill and send service data for computing secret
* @details       Fill and send service data for computing secret
*
* @param[in]       u8MuInstance:                MU instance where the Hse request will be sent
* @param[in]       u8MuChannel:                 MU channel where the Hse request will be sent
* @param[in]       pHseSrvDescriptor:           Descriptor to be filled and send to HSE
* @param[in]       u32CryptoKeyIdx:             Index of the Crypto key
* @param[in]       pPartnerPublicValue:         Value of the partner's public key
* @param[in]       u32PartnerPublicValueLength: Length of the partner's public key
* @param[in]       pJob:                        Pointer to the Crypto job
*
* @returns         Std_ReturnType
*                   E_OK:     Correct configuration of parameters
*                   E_NOT_OK: Incorrect configuration of parameters: incorrect lengths
*/
static Std_ReturnType Crypto_Ipw_CalcSecretRequest
(
    const uint8           u8MuInstance,
    const uint8           u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    const uint32          u32CryptoKeyIdx,
    const uint8* const    pPartnerPublicValue,
    const uint32          u32PartnerPublicValueLength
)
{
    hseDHComputeSharedSecretSrv_t* pKeyGenSrv;
    Std_ReturnType                 RetVal                     = (Std_ReturnType)E_NOT_OK;
    const uint32                   u32PrivKeyElementIdx       = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYEXCHANGE_PRIVKEY);
    const uint32                   u32PartnerPubKeyElementIdx = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_43_HSE_KE_KEYEXCHANGE_PARTNERPUBKEY);
    const uint32                   u32SharedKeyElementIdx     = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_KE_KEYEXCHANGE_SHAREDVALUE);

    /* Check that all indexes returned by Crypto_Util_GetKeyElementIdx are valid. A logic OR between all indexes will be equal to CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 when at least
       one of the indexes is invalid */
    if(CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != (u32PrivKeyElementIdx | u32PartnerPubKeyElementIdx | u32SharedKeyElementIdx))
    {
        pHseSrvDescriptor->srvId = HSE_SRV_ID_DH_COMPUTE_SHARED_SECRET;

        pKeyGenSrv                   = &(pHseSrvDescriptor->hseSrv.dhComputeSecretReq);
        pKeyGenSrv->privKeyHandle    = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32PrivKeyElementIdx].u32HseKeyHandle;
        pKeyGenSrv->peerPubKeyHandle = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32PartnerPubKeyElementIdx].u32HseKeyHandle;
        pKeyGenSrv->targetKeyHandle  = (hseKeyHandle_t)Crypto_43_HSE_aKeyElementList[u32SharedKeyElementIdx].u32HseKeyHandle;

        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);

        /* Avoid compiler warnings */
        (void)pPartnerPublicValue;
        (void)u32PartnerPublicValueLength;
    }

    return RetVal;
}
#endif /* (((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) && (STD_ON == CRYPTO_43_HSE_SPT_COMPUTE_DH)) */
#endif /*  (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

/**
* @brief           Sends a mesage to HSE via MU
* @details         Sends a mesage to HSE via MU. The message contains the address of a descriptor
*
* @param[in]       u8MuInstance: MU instance used to send the request to HSE
* @param[in]       u8MuChannel:  MU channel used to send the request to HSE
* @param[in]       pHseSrvDescriptor:      Message to be sent to HSE
* @param[in]       eProcessType: SYNC/ASYNC
*
* @returns         Std_ReturnType
*                   E_OK:     Request successful
*                   E_NOT_OK: Request unsuccessful
*/
static Std_ReturnType Crypto_Ipw_SendMsg
(
    const uint8                 u8MuInstance,
    const uint8                 u8MuChannel,
    hseSrvDescriptor_t* const   pHseSrvDescriptor,
    Crypto_JobType* const       pJob
)
{
    hseSrvResponse_t      HseResponse;
    Std_ReturnType        RetVal;
    Hse_Ip_ReqType*       pHseIpReq       = &Crypto_Ipw_apMuState[u8MuInstance]->Hse_Ip_aRequest[u8MuChannel];
    /* If pJob parameter (pointer to the Crypto job requesting this service) is NULL, the request is for sure synchronous */
    Crypto_ProcessingType eProcessingType = CRYPTO_PROCESSING_SYNC;

    if (NULL_PTR != pJob)
    {
        eProcessingType = pJob->jobPrimitiveInfo->processingType;
        /* Set the value of the stored jobId */
        Crypto_Ipw_apMuState[u8MuInstance]->au32MuChannelJobId[u8MuChannel] = pJob->jobId;
    }

    if (CRYPTO_PROCESSING_SYNC == eProcessingType)
    {
        pHseIpReq->eReqType   = HSE_IP_REQTYPE_SYNC;
        pHseIpReq->u32Timeout = Crypto_Ipw_apMuState[u8MuInstance]->u32HseSyncRequestsTimeout;
    }
    else
    {
#if   (STD_ON == CRYPTO_43_HSE_USE_INTERRUPTS_FOR_ASYNC_JOBS)
        pHseIpReq->eReqType = HSE_IP_REQTYPE_ASYNC_IRQ;
#else
        pHseIpReq->eReqType = HSE_IP_REQTYPE_ASYNC_POLL;
#endif /*(STD_ON == CRYPTO_43_HSE_USE_INTERRUPTS_FOR_ASYNC_JOBS)*/

        pHseIpReq->pfCallback     = &Crypto_Ipw_ProcessMuChannelResponse;
        /* Set the pointer to the job as parameter to the callback */
        pHseIpReq->pCallbackParam = (void*)pJob;
    }

    /* Send the request to HSE driver */
    HseResponse = Hse_Ip_ServiceRequest(u8MuInstance, u8MuChannel, pHseIpReq, (hseSrvDescriptor_t*)CRYPTO_HSE_HOST_ADDR_TO_INT(Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pHseSrvDescriptor))));

    /* Translate the message received from HSE to a Std_ReturnType value */
    RetVal      = Crypto_Ipw_TranslateHseResponse(HseResponse);

    if (CRYPTO_PROCESSING_SYNC == eProcessingType)
    {
        /* As the synchronous job is done, mark the channel as having an invalid JobId value */
        Crypto_Ipw_apMuState[u8MuInstance]->au32MuChannelJobId[u8MuChannel] = CRYPTO_IPW_INVALID_VAL_FOR_JOBID_U32;
    }

    return RetVal;
}

/**
* @brief           Checks the CDO queues for pending messages and sends them to HSE for processing
* @details         Checks the CDO queues for pending messages and sends them to HSE for processing
*
* @param[in]       u8MuInstance: MU instance used to send the request to HSE
*
* @returns         void
*/
static void Crypto_Ipw_PushJobsFromQueuesToHse
(
    const uint8  u8MuInstance,
    const uint32 u32PartitionId
)
{
    boolean         bJobSentToHseAndDequeued = TRUE;
    boolean         bBreakWhile;
    Std_ReturnType  StdRetVal;
    uint32          u32HeadOfQueuedJobs;
    uint32          u32NumCDOsNotAllowedToProcessQueuedJobs;
    Crypto_JobType* pJob;
    uint8           u8ObjectIdx;
    static uint32   u32ObjectCounter[CRYPTO_43_HSE_MAX_NUMBER_PARTITIONS_U8] = {0U};

    /* Get the index of the Crypto Driver Object processed on the current partition */
    u8ObjectIdx = Crypto_43_HSE_aPartitionToCdoMapping[u32PartitionId].au8CDOsList[u32ObjectCounter[u32PartitionId]];

    /* Check if the current CDO does not have jobs in queue */
    if (CRYPTO_43_HSE_JOB_QUEUE_NONE_U32 == Crypto_43_HSE_aObjectQueueList[u8ObjectIdx].u32HeadOfQueuedJobs)
    {
        /* Pass to the queue of the next CDO in the current partition */
        u32ObjectCounter[u32PartitionId] = (u32ObjectCounter[u32PartitionId] + 1UL)%Crypto_43_HSE_aPartitionToCdoMapping[u32PartitionId].u8NumCDOs;
        u8ObjectIdx                      = Crypto_43_HSE_aPartitionToCdoMapping[u32PartitionId].au8CDOsList[u32ObjectCounter[u32PartitionId]];
    }
    u32NumCDOsNotAllowedToProcessQueuedJobs = 0U;
    /* Keep looping while we manage to dequeue async jobs from any of the CDOs queues and send them to HSE */
    while (TRUE == bJobSentToHseAndDequeued)
    {
        bJobSentToHseAndDequeued = FALSE;
        /* Clear the break so that the queue of the next CDO in the current partition will be processed if the process operation function is not busy */
        bBreakWhile = FALSE;
        /* Try to take the first job from each CDO's queue of jobs and send it to HSE, in order to assure that jobs requests from all CDOs are sent being processed with the same priority */
        while ((CRYPTO_43_HSE_JOB_QUEUE_NONE_U32 != Crypto_43_HSE_aObjectQueueList[u8ObjectIdx].u32HeadOfQueuedJobs) && (FALSE == bBreakWhile))
        {
            u32HeadOfQueuedJobs = Crypto_43_HSE_aObjectQueueList[u8ObjectIdx].u32HeadOfQueuedJobs;
            /* Take the first job in the queue. The queue is already ordered by priority so the first job in queue has the highest priority */
            pJob = Crypto_43_HSE_aDriverObjectList[u8ObjectIdx].pQueuedJobs[u32HeadOfQueuedJobs].pJob;

            /* SWS_Crypto_00199 - If the Crypto Driver has a queue and if a synchronous job is issued and the priority is greater than the highest priority available in the queue, the Crypto Driver shall disable
            processing new jobs from the queue until the next call of the main function has finished that follows after completion of the currently processed job.*/
            if ((NULL_PTR != Crypto_Ipw_apSyncJobInProgress[u8ObjectIdx]) &&
               (Crypto_Ipw_apSyncJobInProgress[u8ObjectIdx]->jobPriority > pJob->jobPriority))
            {
                /* Count the number of CDO's for which processing was not allowed because of synchronous request ongoing */
                u32NumCDOsNotAllowedToProcessQueuedJobs++;
                /* If all the CDOs were not allowed to process queued jobs, exit the inner loop*/
                if (Crypto_43_HSE_aPartitionToCdoMapping[u32PartitionId].u8NumCDOs == u32NumCDOsNotAllowedToProcessQueuedJobs)
                {
                    break;
                }
                /* Pass to the queue of the next CDO in the current partition */
                u32ObjectCounter[u32PartitionId] = (u32ObjectCounter[u32PartitionId] + 1UL)%Crypto_43_HSE_aPartitionToCdoMapping[u32PartitionId].u8NumCDOs;
                u8ObjectIdx                      = Crypto_43_HSE_aPartitionToCdoMapping[u32PartitionId].au8CDOsList[u32ObjectCounter[u32PartitionId]];
                continue;
            }

            /* Try to send the job to HSE for processing */
            StdRetVal = Crypto_Ipw_ProcessOperation(u8MuInstance, u8ObjectIdx, pJob);

            if ((Std_ReturnType)CRYPTO_E_BUSY != StdRetVal)
            {
                /* If return value is not CRYPTO_E_BUSY, it means that a free MU channel was found and the request was send to HSE
                   Take the first queued job and put it back in the free jobs queue */
                Crypto_43_HSE_Util_DequeueHeadJob(u8ObjectIdx);
                /* Mark the job as being dequeued and sent to HSE for processing */
                bJobSentToHseAndDequeued = TRUE;
                /* [SWS_Crypto_00119]If return value is not E_OK, call the callback to inform the upper layers an error happened with the job */
                if ((Std_ReturnType)E_OK != StdRetVal)
                {
                    /* [SWS_Crypto_00119]Clear the job state in case of error. If no error occurs the state will be cleared in Crypto_Ipw_ProcessMuChannelResponse */
                    pJob->jobState = CRYPTO_JOBSTATE_IDLE;
                    CryIf_CallbackNotification (pJob, StdRetVal);
                }
                /* Pass to the queue of the next CDO in the current partition */
                u32ObjectCounter[u32PartitionId] = (u32ObjectCounter[u32PartitionId] + 1UL)%Crypto_43_HSE_aPartitionToCdoMapping[u32PartitionId].u8NumCDOs;
                u8ObjectIdx                      = Crypto_43_HSE_aPartitionToCdoMapping[u32PartitionId].au8CDOsList[u32ObjectCounter[u32PartitionId]];
            }
            else
            {
                /* Exit the inner while without updating the CDO, so that at next MainFunction call the current CDO has the chance to send again the job to HSE */
                bBreakWhile = TRUE;
            }
        }
    }
}

#if (STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT)
/**
* @brief           Calls the function which will service the Save/Restore Context request
* @details         Based on the configured operation a request will be send to the firmware
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       u8StreamId:           Allocated stream ID
* @param[out]      pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                  E_OK:                         Request successful
*                  E_NOT_OK:                     Request unsuccessful
*/
static inline Std_ReturnType Crypto_Ipw_SaveRestoreContext
(
    const uint8           u8MuInstance,
    const uint8           u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
)
{
    /* Local variables */
    Std_ReturnType                 RetVal;
    hseImportExportStreamCtxSrv_t* pImportExportStreamCtxSrv = &(pHseSrvDescriptor->hseSrv.importExportStreamCtx);
    Crypto_OperationModeType       eJobMode                  = pJob->jobPrimitiveInputOutput.mode;

    /* SWS_Crypto_00230 and SWS_Crypto_00231 */
    /* Load the HSE-specific service ID */
    pHseSrvDescriptor->srvId            = HSE_SRV_ID_IMPORT_EXPORT_STREAM_CTX;
    /* Stream ID to be sent over to HSE */
    pImportExportStreamCtxSrv->streamId = u8StreamId;

    /* Check to see what context related operation is selected */
    if(CRYPTO_OPERATIONMODE_SAVE_CONTEXT == eJobMode)
    {
        /* SWS_Crypto_00230: To save the context the crypto driver object shall store all relevant workspace data of the currently active primitive
         *that was modified by previously processed START and UPDATE operation and shall place them into job->outputPtr (so-called snapshot of context data).
        */
        pImportExportStreamCtxSrv->operation      = HSE_EXPORT_STREAMING_CONTEXT;
        pImportExportStreamCtxSrv->pStreamContext = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pJob->jobPrimitiveInputOutput.outputPtr));
    }
    /* CRYPTO_OPERATIONMODE_RESTORE_CONTEXT */
    else
    {
        /* SWS_Crypto_00231: The context data shall contain all data that is needed to restore a workspace with this data, so that the crypto primitive can resume the operation at exactly this point */
        pImportExportStreamCtxSrv->operation      = HSE_IMPORT_STREAMING_CONTEXT;
        pImportExportStreamCtxSrv->pStreamContext = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pJob->jobPrimitiveInputOutput.inputPtr));
    }

    /* Send the request to HSE */
    RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);

    /* Mark the request as sent */
    *pbReqSentOverChannel = TRUE;

    return RetVal;
}
#endif /* STD_ON == CRYPTO_43_HSE_SPT_STREAM_CTX_IMPORT_EXPORT */

/**
* @brief           Calls the function which will service the request
* @details         Based on the configured service in job a request will be send to the firmware
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       u8StreamId:           Allocated stream ID
* @param[out]      pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK:                         Request successful
*                   E_NOT_OK:                     Request unsuccessful
*                   CRYPTO_E_KEY_EMPTY:           The service request failed because the specified key slot is empty
*                   CRYPTO_E_KEY_NOT_AVAILABLE:   This error code is returned if a key is locked due to failed boot measurement or an active debugger
*                   CRYPTO_E_KEY_NOT_VALID:       Specified key slot is either not valid or not available due to a key usage flags restrictions
*                   CRYPTO_RET_INVALID_PARAM:     The request parameters are invalid
*                   CRYPTO_RET_OPERATION_TIMEOUT: No response was received from firmware in the timeout window
*                   CRYPTO_RET_NOT_SUPPORTED:     Service is not available
*/
static inline Std_ReturnType Crypto_Ipw_ServiceRequest
(
    const uint8           u8MuInstance,
    const uint8           u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
)
{
    Std_ReturnType  RetVal    = (Std_ReturnType)E_NOT_OK;

    switch (pJob->jobPrimitiveInfo->primitiveInfo->service)
    {
#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
#if (STD_ON == CRYPTO_43_HSE_SPT_MAC)
        case CRYPTO_MACGENERATE:
        /* fall-through */
        case CRYPTO_MACVERIFY:
            RetVal = Crypto_Ipw_MacServiceRequest(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, pbReqSentOverChannel);
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_MAC) */

        case CRYPTO_ENCRYPT:
#if (STD_ON == CRYPTO_43_HSE_SPT_RSA)
            if (CRYPTO_ALGOFAM_RSA == pJob->jobPrimitiveInfo->primitiveInfo->algorithm.family)
            {
                RetVal = Crypto_Ipw_RSAEncDec(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, HSE_CIPHER_DIR_ENCRYPT, pbReqSentOverChannel);
            }
            else
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA) */
            {
#if (STD_ON == CRYPTO_43_HSE_SPT_XTS_AES)
                if(CRYPTO_ALGOMODE_XTS == pJob->jobPrimitiveInfo->primitiveInfo->algorithm.mode)
                {
                    RetVal = Crypto_Ipw_XtsEncDec(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, HSE_CIPHER_DIR_ENCRYPT, pbReqSentOverChannel);
                }
                else
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_XTS_AES) */
                {
                    RetVal = Crypto_Ipw_EncDec(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, HSE_CIPHER_DIR_ENCRYPT, pbReqSentOverChannel);
                }
            }
            break;

        case CRYPTO_DECRYPT:
#if (STD_ON == CRYPTO_43_HSE_SPT_RSA)
            if (CRYPTO_ALGOFAM_RSA == pJob->jobPrimitiveInfo->primitiveInfo->algorithm.family)
            {
                RetVal = Crypto_Ipw_RSAEncDec(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, HSE_CIPHER_DIR_DECRYPT, pbReqSentOverChannel);
            }
            else
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA) */
            {
#if (STD_ON == CRYPTO_43_HSE_SPT_XTS_AES)
                if(CRYPTO_ALGOMODE_XTS == pJob->jobPrimitiveInfo->primitiveInfo->algorithm.mode)
                {
                    RetVal = Crypto_Ipw_XtsEncDec(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, HSE_CIPHER_DIR_DECRYPT, pbReqSentOverChannel);
                }
                else
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_XTS_AES) */
                {
                    RetVal = Crypto_Ipw_EncDec(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, HSE_CIPHER_DIR_DECRYPT, pbReqSentOverChannel);
                }
            }
            break;

#if (STD_ON == CRYPTO_43_HSE_SPT_AEAD)
        case CRYPTO_AEADENCRYPT:
            RetVal = Crypto_Ipw_AeadEncDec(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, HSE_CIPHER_DIR_ENCRYPT, pbReqSentOverChannel);
            break;

        case CRYPTO_AEADDECRYPT:
            RetVal = Crypto_Ipw_AeadEncDec (u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, HSE_CIPHER_DIR_DECRYPT, pbReqSentOverChannel);
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_AEAD) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC))
        case CRYPTO_SIGNATUREGENERATE:
        /* fall-through */
        case CRYPTO_SIGNATUREVERIFY:
            RetVal = Crypto_Ipw_SignRequest(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, pbReqSentOverChannel);
            break;
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) */
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

#if (STD_ON == CRYPTO_43_HSE_SPT_HASH)
        case CRYPTO_HASH:
            RetVal = Crypto_Ipw_Hash(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, pbReqSentOverChannel);
            break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HASH) */

        case CRYPTO_RANDOMGENERATE:
            RetVal = Crypto_Ipw_Random(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob);
            /* Crypto_Ipw_Random() will always send the request to firmware */
            *pbReqSentOverChannel = TRUE;
            break;

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
        /* Functionality of synchronous key management functions accessed through Crypto_ProcessJob interface */
        case CRYPTO_KEYGENERATE:
#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE)
            /* According with the Cryif requirements SWS_CryIf_00133 and SWS_CryIf_00142, the CryIf is responsible to always put the CryptoKeyId in the cryptoKeyId member of the job structure
               and the TargetCryptoKeyId in the targetCryptoKeyId member of the job structure */
            RetVal = Crypto_Ipw_KeyGenerateRequest(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, pJob->cryptoKeyId, pbReqSentOverChannel);
#else
            /* HSE does not support this service */
            RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;
#endif
            break;

        case CRYPTO_KEYDERIVE:
#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE)
            /* According with the Cryif requirements SWS_CryIf_00133 and SWS_CryIf_00142, the CryIf is responsible to always put the CryptoKeyId in the cryptoKeyId member of the job structure
               and the TargetCryptoKeyId in the targetCryptoKeyId member of the job structure */
            RetVal = Crypto_Ipw_KeyDeriveRequest(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, pJob->cryptoKeyId, pJob->targetCryptoKeyId, pbReqSentOverChannel);
#else
            /* HSE does not support this service */
            RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE) */
            break;

        case CRYPTO_KEYEXCHANGECALCSECRET:
#if (((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) && (STD_ON == CRYPTO_43_HSE_SPT_COMPUTE_DH))
            /* According with the Cryif requirements SWS_CryIf_00133 and SWS_CryIf_00142, the CryIf is responsible to always put the CryptoKeyId in the cryptoKeyId member of the job structure
               and the TargetCryptoKeyId in the targetCryptoKeyId member of the job structure */
            RetVal = Crypto_Ipw_CalcSecretRequest(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, pJob->cryptoKeyId,  pJob->jobPrimitiveInputOutput.inputPtr, pJob->jobPrimitiveInputOutput.inputLength);
            /* Crypto_Ipw_CalcSecretRequest() will always send the request to firmware */
            *pbReqSentOverChannel = TRUE;
#else
            /* HSE does not support this service */
            RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;
#endif /* (((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) && (STD_ON == CRYPTO_43_HSE_SPT_COMPUTE_DH)) */
            break;

        case CRYPTO_RANDOMSEED:
            /* HSE does not support this service */
            RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;
            break;

#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */
        default:
            /* Should not get here. If yes, report an error */
            RetVal = (Std_ReturnType)E_NOT_OK;
            break;
    }
#if ((STD_OFF == CRYPTO_43_HSE_KEYS_EXIST) && (STD_OFF == CRYPTO_43_HSE_SPT_HASH))

    /* Ignore compiler warning */
    (void)u8StreamId;
#endif

    return RetVal;
}

#if ((STD_ON == CRYPTO_43_HSE_SPT_MAC) && (STD_ON == CRYPTO_43_HSE_KEYS_EXIST))
/**
* @brief           Calls the MAC function which will service the request
* @details         Based on the configured service in job a MAC request will be send to the firmware
*
* @param[in]       u8MuInstance:         MU instance where the job will be issued
* @param[in]       u8MuChannel:          MU channel where the job will be issued
* @param[in]       pHseSrvDescriptor:    Descriptor to be filled and send to HSE
* @param[in]       pJob:                 Pointer to the job
* @param[in]       u8StreamId:           Allocated stream ID
* @param[out]      pbReqSentOverChannel: Pointer to a boolean storing channel usage
*
* @returns         Std_ReturnType
*                   E_OK:                         Request successful
*                   E_NOT_OK:                     Request unsuccessful
*                   CRYPTO_E_KEY_EMPTY:           The service request failed because the specified key slot is empty
*                   CRYPTO_E_KEY_NOT_AVAILABLE:   This error code is returned if a key is locked due to failed boot measurement or an active debugger
*                   CRYPTO_E_KEY_NOT_VALID:       Specified key slot is either not valid or not available due to a key usage flags restrictions
*                   CRYPTO_RET_INVALID_PARAM:     The request parameters are invalid
*                   CRYPTO_RET_OPERATION_TIMEOUT: No response was received from firmware in the timeout window
*                   CRYPTO_RET_NOT_SUPPORTED:     Service is not available
*/
static inline Std_ReturnType Crypto_Ipw_MacServiceRequest
(
    const uint8           u8MuInstance,
    const uint8           u8MuChannel,
    hseSrvDescriptor_t*   pHseSrvDescriptor,
    Crypto_JobType*       pJob,
    uint8                 u8StreamId,
    boolean*              pbReqSentOverChannel
)
{
    Std_ReturnType            RetVal     = (Std_ReturnType)E_NOT_OK;
#if ((STD_ON == CRYPTO_43_HSE_SPT_HMAC) && (STD_ON == CRYPTO_43_HSE_SPT_HASH))
    Crypto_Ipw_HashConfigType HashAlgo   = Crypto_Ipw_ConfigureHashAlgo((uint8)pJob->jobPrimitiveInfo->primitiveInfo->algorithm.family);
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_HMAC) && (STD_ON == CRYPTO_43_HSE_SPT_HASH)) */
    /* Put algorithm.mode in a local variable to optimize code */
    uint8                     u8AlgoMode = (uint8)pJob->jobPrimitiveInfo->primitiveInfo->algorithm.mode;

    if (CRYPTO_MACGENERATE == pJob->jobPrimitiveInfo->primitiveInfo->service)
    {
        switch (u8AlgoMode)
        {
#if (STD_ON == CRYPTO_43_HSE_SPT_FAST_CMAC)
            case (uint8)CRYPTO_43_HSE_ALGOMODE_CUSTOM_FAST_CMAC:
                RetVal = Crypto_Ipw_FastCmac(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, HSE_AUTH_DIR_GENERATE, pbReqSentOverChannel);
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_FAST_CMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_CMAC) || (STD_ON == CRYPTO_43_HSE_SPT_XCBCMAC)
            case (uint8)CRYPTO_ALGOMODE_CMAC:
            /* fall-through */
            case (uint8)CRYPTO_ALGOMODE_CBC:
                RetVal = Crypto_Ipw_CmacXcbcMacGenerate(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, pbReqSentOverChannel);
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_CMAC) || (STD_ON == CRYPTO_43_HSE_SPT_XCBCMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_GMAC)
            case (uint8)CRYPTO_ALGOMODE_GMAC:
                RetVal = Crypto_Ipw_GmacGenerate (u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, pbReqSentOverChannel);
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_GMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_HMAC) && (STD_ON == CRYPTO_43_HSE_SPT_HASH)
            case (uint8)CRYPTO_ALGOMODE_HMAC:
                RetVal = Crypto_Ipw_HmacGen(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, HashAlgo.HseHashAlgo, u8StreamId, pbReqSentOverChannel);
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HMAC) && (STD_ON == CRYPTO_43_HSE_SPT_HASH) */

#if (STD_ON == CRYPTO_43_HSE_SPT_SIPHASH)
            case (uint8)CRYPTO_ALGOMODE_SIPHASH_2_4:
            /* fall-through */
            case (uint8)CRYPTO_43_HSE_ALGOMODE_CUSTOM_SIPHASH_2_4_128:
                RetVal = Crypto_Ipw_SipHash(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, HSE_AUTH_DIR_GENERATE, pbReqSentOverChannel);
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SIPHASH) */

            default:
                RetVal = (Std_ReturnType)E_NOT_OK;
                break;
        }
    }
    else
    {
        switch (u8AlgoMode)
        {
#if (STD_ON == CRYPTO_43_HSE_SPT_FAST_CMAC)
            case (uint8)CRYPTO_43_HSE_ALGOMODE_CUSTOM_FAST_CMAC:
                RetVal = Crypto_Ipw_FastCmac(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, HSE_AUTH_DIR_VERIFY, pbReqSentOverChannel);
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_FAST_CMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_CMAC) || (STD_ON == CRYPTO_43_HSE_SPT_XCBCMAC)
            case (uint8)CRYPTO_ALGOMODE_CMAC:
            /* fall-through */
            case (uint8)CRYPTO_ALGOMODE_CBC:
                RetVal = Crypto_Ipw_CmacXcbcMacVerify(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, pbReqSentOverChannel);
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_CMAC) || (STD_ON == CRYPTO_43_HSE_SPT_XCBCMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_GMAC)
            case (uint8)CRYPTO_ALGOMODE_GMAC:
                RetVal = Crypto_Ipw_GmacVerify (u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, u8StreamId, pbReqSentOverChannel);
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_GMAC) */

#if (STD_ON == CRYPTO_43_HSE_SPT_HMAC) && (STD_ON == CRYPTO_43_HSE_SPT_HASH)
            case (uint8)CRYPTO_ALGOMODE_HMAC:
                RetVal = Crypto_Ipw_HmacVerify (u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, HashAlgo.HseHashAlgo, u8StreamId, pbReqSentOverChannel);
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_HMAC) && (STD_ON == CRYPTO_43_HSE_SPT_HASH)*/

#if (STD_ON == CRYPTO_43_HSE_SPT_SIPHASH)
            case (uint8)CRYPTO_ALGOMODE_SIPHASH_2_4:
            /* fall-through */
            case (uint8)CRYPTO_43_HSE_ALGOMODE_CUSTOM_SIPHASH_2_4_128:
                RetVal = Crypto_Ipw_SipHash(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pJob, HSE_AUTH_DIR_VERIFY, pbReqSentOverChannel);
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SIPHASH) */

            default:
                RetVal = (Std_ReturnType)E_NOT_OK;
                break;
        }
    }
    return RetVal;
}
#endif/* ((STD_ON == CRYPTO_43_HSE_SPT_MAC) && (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)) */

#if((STD_ON == CRYPTO_43_HSE_KEYS_EXIST))
#if((STD_ON == CRYPTO_43_HSE_SPT_SYM_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || \
    (STD_ON == CRYPTO_43_HSE_SPT_RSA)            || (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE)   || \
    (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE))
/**
* @brief           Function used to get the length value in bits from bytes
* @details         Function created with the restrain of macro-like functions in mind.
*                  It is used to get the length value in bits from bytes by dividing by 8
*
* @param[in]       u32Len: The length in bytes
*
* @returns         uint32
*/
static inline uint32 Crypto_Ipw_GetBitLenFromByteLen
(
    uint32 u32Len
)
{
    /*Get the bits length*/
    return ((uint32)((u32Len) << 3U));
}
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_SYM_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE) || (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE)) */

#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC))
/**
* @brief           Function used to get the number of bytes it would take to hold the inputed bits
* @details         Function created with the restrain of macro-like functions in mind.
*                  It is used to get the number of bytes it would take to hold the inputed bits
*
* @param[in]       u32Len: The length in bits
*
* @returns         uint32
*/
static inline uint32 Crypto_Ipw_GetByteLenFromBitLen
(
    uint32 u32Len
)
{
    /*Get the number of needed bytes*/
    return ((u32Len < (CRYPTO_43_HSE_UTIL_MAX_U32 - (uint32)7U)) ? ((uint32)(((u32Len) + (uint32)7U) / (uint32)8U)) : CRYPTO_43_HSE_UTIL_MAX_U32);
}
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) */
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

/**
* @brief           Function used to get the status of a single bit(if it's set or not)
* @details         Function created with the restrain of macro-like functions in mind. Based on an Index,
*                  it verifies if the wanted bit is set or not inside an 8-bit map
*
* @param[in]       u8BitField: The bit-map to be tested
* @param[in]       u8Bit: The bit to be veiried if it's set
*
* @returns         boolean
*/
static inline boolean Crypto_Ipw_IsBitSet
(
    uint8 u8BitField,
    uint8 u8Bit
)
{
    /*Check if the bit is set*/
    return ((boolean)(0U != ((u8BitField) & (1U << (u8Bit)))));
}

/*==================================================================================================
*                                       GLOBAL FUNCTIONS
==================================================================================================*/
/**
* @brief           Initializes the driver
* @details         Initializes the driver
*
* @param[in]       u32PartitionId:   Id of the partition from where the call to the function was made
*
* @returns         Std_ReturnType: Status of initializing the MU
*/
Std_ReturnType Crypto_43_HSE_Ipw_Init
(
    const uint32 u32PartitionId
)
{
    const uint8    u8MuInstance    = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;
    const uint8    u8IdxMuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8IdxMuInstance;
    uint8          u8CDOCounter;
    uint8          u8CDOIdx;
    uint8          u8MuChannel;

    /* Initialize the pointer to the Crypto_Ipw layer state machine */
    Crypto_Ipw_apMuState[u8MuInstance] = &Crypto_Ipw_aCryptoHseMuState[u8IdxMuInstance];

    /* Initialize the Hse Ip layer */
    (void)Hse_Ip_Init(u8MuInstance, &(Crypto_Ipw_apMuState[u8MuInstance]->Hse_Ip_MuState));

    /* Initialize the CDO pointers that store the synchronous job currently processing */
    for (u8CDOCounter = 0U; u8CDOCounter < Crypto_43_HSE_aPartitionToCdoMapping[u32PartitionId].u8NumCDOs; u8CDOCounter++)
    {
        u8CDOIdx = Crypto_43_HSE_aPartitionToCdoMapping[u32PartitionId].au8CDOsList[u8CDOCounter];
        Crypto_Ipw_apSyncJobInProgress[u8CDOIdx] = NULL_PTR;
    }

    for (u8MuChannel = 0U; u8MuChannel < HSE_NUM_OF_CHANNELS_PER_MU; u8MuChannel++)
    {
        /* Initialize the jobId's of the references to Hse requests kept per MU instance to some magic number.
           This is needed in order to have the CancelJob work correctly even when trying to launch a Crypto_CancelJob() for a never launched job having jobId = 0 */
        Crypto_Ipw_apMuState[u8MuInstance]->au32MuChannelJobId[u8MuChannel] = CRYPTO_IPW_INVALID_VAL_FOR_JOBID_U32;
    }
    /* Set the pointer to the start of the 16 global service descriptors allocated for the current used MU instance */
    Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor = &(Crypto_Ipw_aHseSrvDescriptor[u8IdxMuInstance][0U]);
    /* Set default timeout for synchronous operations */
    Crypto_Ipw_apMuState[u8MuInstance]->u32HseSyncRequestsTimeout = CRYPTO_43_HSE_TIMEOUT_DURATION_U32;

    /* Initialize stream status */
    Crypto_Ipw_u8StreamBusyBitMap = (uint8)0U;

    return (Std_ReturnType)E_OK;
}

/**
* @brief           Processes a job
* @details         Tries to initiate a request to HSE to process a job. If all MU channels are busy and the job is async, it queues it
*
* @param[in]       u32PartitionId: Id of the partition from where the call to the function was made
* @param[in]       u32ObjectIdx:   Identifier of the Crypto Driver Object to be used for processing the job
* @param[in]       pJob:           Pointer to the job to be processed
*
* @returns         Std_ReturnType
*                   E_OK:                Request successful
*                   CRYPTO_E_BUSY:       Sync request received when Crypto is busy or async request received when Crypto is busy and there is no more room to store the job in the queue
*/
Std_ReturnType Crypto_43_HSE_Ipw_ProcessJob
(
    const uint32          u32PartitionId,
    const uint32          u32ObjectIdx,
    Crypto_JobType* const pJob
)
{
    const uint8    u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;
    Std_ReturnType RetVal       = (Std_ReturnType)E_OK;

    if (CRYPTO_PROCESSING_SYNC == pJob->jobPrimitiveInfo->processingType)
    {
        Crypto_Ipw_apSyncJobInProgress[u32ObjectIdx] = pJob;
    }


    RetVal = Crypto_Ipw_ProcessOperation(u8MuInstance, u32ObjectIdx, pJob);

    /* Processing of an eventual synchronous request has finished. Set pointer back to NULL */
    Crypto_Ipw_apSyncJobInProgress[u32ObjectIdx] = NULL_PTR;

    /* If there was no MU channel available to process the request, check the type of the request (sync or async) */
    if ((Std_ReturnType)CRYPTO_E_BUSY == RetVal)
    {
        if  (
               (CRYPTO_PROCESSING_ASYNC == pJob->jobPrimitiveInfo->processingType) && \
               (0U != Crypto_43_HSE_aDriverObjectList[u32ObjectIdx].u32CryptoQueueSize)
            )
        {
            /* Try to queue the job */
            if (TRUE == Crypto_43_HSE_Util_QueueJob(u32ObjectIdx, pJob))
            {
                /* Set return value to E_OK, as the async job has been queued successfully for later processing */
                RetVal = (Std_ReturnType)E_OK;
            }
            else
            {
                /* Job could not be queued as the CDO queue is full */
                RetVal = (Std_ReturnType)CRYPTO_E_BUSY;
            }
        }
    }
    else if ((Std_ReturnType)E_OK != RetVal)
    {
        /* [SWS_Crypto_00025]Clear the job state in case of error. If no error occurs the state will be cleared in Crypto_Ipw_ProcessMuChannelResponse */
        pJob->jobState = CRYPTO_JOBSTATE_IDLE;
    }
    /* [SWS_Crypto_00018][SWS_Crypto_00023] If the job is processed synchronously and operation mode is set to single call or finish change the state of the job to idle */
    else if ((CRYPTO_PROCESSING_SYNC == pJob->jobPrimitiveInfo->processingType) && ((uint8)CRYPTO_OPERATIONMODE_FINISH == (uint8)(((uint8)(pJob->jobPrimitiveInputOutput.mode)) & CRYPTO_IPW_OPERATIONMODE_FINISH_MASK_U8)))
    {
        pJob->jobState = CRYPTO_JOBSTATE_IDLE;
    }
    else
    {
        /*Do nothing */
    }
    return RetVal;
}

/**
* @brief           Cancels a job
* @details         Tries to cancel the currently processing job if the id is the same. Otherwise searches the queue of jobs in order to dequeue it
*
* @param[in]       u32PartitionId: Id of the partition from where the call to the function was made
* @param[in]       u32ObjectIdx:   Identifier of the Crypto Driver Object to be used for canceling the job
* @param[in]       pJob:           Pointer to the job to be canceled
*
* @returns         Std_ReturnType
*/
Std_ReturnType Crypto_43_HSE_Ipw_CancelJob
(
    const uint32                u32PartitionId,
    const uint32                u32ObjectIdx,
    const Crypto_JobType* const pJob
)
{
    uint8               u8Index;
    hseSrvDescriptor_t* pHseSrvDescriptor;
    Std_ReturnType      RetVal       = (Std_ReturnType)E_OK;
    boolean             bJobFound    = FALSE;
    const uint8         u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;
    uint8               u8MuChannel;

    /* Loop through all MU channels where a request have been sent but a response was not yet received */
    for (u8Index = 0U; u8Index < HSE_NUM_OF_CHANNELS_PER_MU; u8Index++)
    {
        /* Search for a job:
            1. coming from the Crypto Driver Object received as parameter
            2. matching the same jobId like the one received as parameter */
        if ((Crypto_Ipw_apMuState[u8MuInstance]->au32MuChannelCDOIdx[u8Index] == u32ObjectIdx) &&
           (Crypto_Ipw_apMuState[u8MuInstance]->au32MuChannelJobId[u8Index]  == pJob->jobId))
        {
            /* Administrative requests must only be sent on channel 0 */
            u8MuChannel = CRYPTO_IPW_CHANNEL_0_U8;
            /* Obtain a descriptor for the request */
            pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);
            /* Try to cancel the job */
            RetVal = Crypto_Ipw_SendCancelJobReq(u8MuInstance, u8MuChannel, pHseSrvDescriptor, u8Index);
            /* SWS_Crypto_00183 - If no errors are detected by Crypto Driver and the driver is not able
               to cancel the job (e.g. due to hardware limitations), the service Crypto_CancelJob() shall
               return CRYPTO_E_JOB_CANCELED. */
            if ((CRYPTO_43_HSE_RET_OPERATION_TIMEOUT != RetVal) &&
                (CRYPTO_43_HSE_RET_INVALID_PARAM     != RetVal) &&
                ((Std_ReturnType)E_OK != RetVal)
               )
            {
                RetVal = (Std_ReturnType)CRYPTO_E_JOB_CANCELED;
            }
            bJobFound = TRUE;
            break;
        }
    }

    /* If job was not found in the list of jobs sent to HSE for processing, check if it's not waiting in the queue */
    if (FALSE == bJobFound)
    {
        /* No matter if the job is found in the CDO's queue or not, always return E_OK because of the following 2 requirements:
           - SWS_Crypto_00143: If no errors are detected by Crypto Driver and the driver is able to cancel the job immediately, the service Crypto_CancelJob() shall remove the job from the queue
        and cancel the job in the hardware. If the cancellation is successful E_OK shall be returned, otherwise it shall return E_NOT_OK.
           - SWS_Crypto_00214: If no errors are detected by Crypto Driver and the driver does currently not process this job, the service Crypto_CancelJob() shall return E_OK without any processing. */
        (void)Crypto_43_HSE_Util_DequeueJob(u32ObjectIdx, pJob);
    }

    return RetVal;
}

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
/**
* @brief           Imports a key
* @details         Fills the descriptor for importing a key
*
* @param[in]       u32PartitionId:         Id of the partition from where the call to the function was made
* @param[in]       pKey:                   Address of the key to be loaded
* @param[in]       u32KeyLength:           Key length
* @param[in]       u32CryptoKeyIdx:        Id of the Crypto Key for which the key material is imported
* @param[in]       u32CryptoKeyElementIdx: The index of the Crypto Key Element
*
* @returns         Std_ReturnType
*                       E_OK: request successful
*                       E_NOT_OK: request unsuccessful
*                       CRYPTO_E_KEY_READ_FAIL - failure in reading the key
*                       CRYPTO_E_KEY_WRITE_FAIL - failure in writing the key
*                       CRYPTO_E_KEY_NOT_AVAILABLE - key not available
*                       CRYPTO_E_KEY_NOT_VALID - invalid key
*                       CRYPTO_E_BUSY - busy
*/
Std_ReturnType Crypto_43_HSE_Ipw_ImportKey
(
    const uint32       u32PartitionId,
    const uint8* const pKey,
    const uint32       u32KeyLength,
    const uint32       u32CryptoKeyIdx,
    const uint32       u32CryptoKeyElementIdx
)
{
    Std_ReturnType                   RetVal                 = (Std_ReturnType)E_NOT_OK;
    const uint8                      u8MuInstance           = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;
/* In order to avoid MISRA MISRA C-2012 Rule 2.2, 16.6 and 16.1 switch-case-default-break is enabled only in case both 
CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT and CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT are ON */
#if ((STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT))
    uint8                            u8KeyType              = Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].u8HseKeyType;
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT)) */
    Crypto_43_HSE_KeyElementWriteAccessType eKeyElementWriteAccess = Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyElementWriteAccess;
    Crypto_43_HSE_KeyFormatType             eKeyElementFormat      = Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].eCryptoKeyFormat;
    uint8                            u8MuChannel;
    hseSrvDescriptor_t*              pHseSrvDescriptor;

#if (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT)
     uint8 u8CurveId = Crypto_43_HSE_aKeyElementList[u32CryptoKeyElementIdx].u8HseEccCurveId;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) */

    /* Get a free channel, if possible */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);
    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);
/* In order to avoid MISRA MISRA C-2012 Rule 16.6 and 16.1 switch-case-default-break is enabled only in case both 
CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT and CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT are ON */
#if ((STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT))
        switch (u8KeyType)
        {
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT)) */       
#if (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT)
            case HSE_KEY_TYPE_ECC_PAIR:
                if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_OCTET == eKeyElementFormat)
                {
                    if (CRYPTO_43_HSE_WA_ENCRYPTED == eKeyElementWriteAccess)
                    {
                        /* Not supported */
                    }
                    else
                    {
                        RetVal = Crypto_Ipw_EccLoadPlainPairKey(u8MuInstance,
                                                                u8MuChannel,
                                                                pHseSrvDescriptor,
                                                                pKey,
                                                                u32KeyLength,
                                                                u32CryptoKeyElementIdx,
#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
                                                                u32CryptoKeyIdx,
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */
                                                                u8CurveId
                                                               );
                    }
                }

                if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_CUSTOM_IMPORT_EXPORT == eKeyElementFormat)
                {
                    RetVal = Crypto_Ipw_ImportCustomKey(u8MuInstance,
                                                      u8MuChannel,
                                                      pHseSrvDescriptor,
                                                      pKey,
                                                      u32CryptoKeyElementIdx);
                }
                break;

            case HSE_KEY_TYPE_ECC_PUB:
                if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_OCTET == eKeyElementFormat)
                {
                    if (CRYPTO_43_HSE_WA_ENCRYPTED == eKeyElementWriteAccess)
                    {
                     /* Not supported */
                    }
                    else
                    {
                        RetVal = Crypto_Ipw_EccLoadPlainPubKey(u8MuInstance,
                                                                u8MuChannel,
                                                                pHseSrvDescriptor,
                                                                pKey,
                                                                u32KeyLength,
                                                                u32CryptoKeyElementIdx,
#if ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) && (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT))
                                                                u32CryptoKeyIdx,
#endif /* ((STD_ON == CRYPTO_43_HSE_ECC_KEY_FORMAT) (STD_ON == CRYPTO_43_HSE_ECC_COMPRESSED_FORMAT)) */
                                                                u8CurveId
                                                                );
                    }
                }

                if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_CUSTOM_IMPORT_EXPORT == eKeyElementFormat)
                {
                    RetVal = Crypto_Ipw_ImportCustomKey(u8MuInstance,
                                                      u8MuChannel,
                                                      pHseSrvDescriptor,
                                                      pKey,
                                                      u32CryptoKeyElementIdx);
                }
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) */

#if (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT)
            case  HSE_KEY_TYPE_RSA_PUB:
                  /* For RSA public key go to the next case and import public key using the same approach as private key,
                     therefore no need for break */
            case  HSE_KEY_TYPE_RSA_PAIR:
                if (((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_RSA_PRIVATEKEY == eKeyElementFormat) || ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_RSA_PUBLICKEY == eKeyElementFormat))
                {
                    if (CRYPTO_43_HSE_WA_ENCRYPTED == eKeyElementWriteAccess)
                    {
                        /* Not supported */
                    }
                    else
                    {
                        /* Not supported */
                    }
                }

                if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_CUSTOM_IMPORT_EXPORT == eKeyElementFormat)
                {
                    RetVal = Crypto_Ipw_ImportCustomKey(u8MuInstance,
                                                      u8MuChannel,
                                                      pHseSrvDescriptor,
                                                      pKey,
                                                      u32CryptoKeyElementIdx);
                }
                break;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT) */
/* In order to avoid MISRA MISRA C-2012 Rule 16.6 and 16.1 switch-case-default-break statement is enabled only in case both 
CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT and CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT are ON */
#if ((STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT))
            default:
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT)) */
                /* Import SHE keys, if support for this is enabled */
#if (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_IMPORT)
                /* Ignore compiler warning */
                (void)u32KeyLength;

                if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_SHEKEYS == eKeyElementFormat)
                {
                    /*Check the write access of the key alement */
                    if (CRYPTO_43_HSE_WA_ENCRYPTED == eKeyElementWriteAccess)
                    {
                        RetVal = Crypto_Ipw_SheLoadKey(u8MuInstance,
                                                       u8MuChannel,
                                                       pHseSrvDescriptor,
                                                       pKey,
                                                       u32CryptoKeyIdx,
                                                       u32CryptoKeyElementIdx);
                    }
                    else
                    {
                        RetVal = Crypto_Ipw_SheLoadPlainKey(u8MuInstance,
                                                            u8MuChannel,
                                                            pHseSrvDescriptor,
                                                            pKey,
                                                            u32CryptoKeyElementIdx);
                    }
                }
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_IMPORT) */

                /* Import symmetric keys, if support for this is enabled */
#if (STD_ON == CRYPTO_43_HSE_SPT_SYM_KEY_IMPORT)
                if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_OCTET == eKeyElementFormat)
                {
                    RetVal = Crypto_Ipw_LoadSimKey(u8MuInstance,
                                                   u8MuChannel,
                                                   pHseSrvDescriptor,
                                                   u32KeyLength,
                                                   pKey,
                                                   u32CryptoKeyElementIdx);
                }

                if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_CUSTOM_IMPORT_EXPORT == eKeyElementFormat)
                {
                    RetVal = Crypto_Ipw_ImportCustomKey(u8MuInstance,
                                                      u8MuChannel,
                                                      pHseSrvDescriptor,
                                                      pKey,
                                                      u32CryptoKeyElementIdx);
                }
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SYM_KEY_IMPORT) */
/* In order to avoid MISRA MISRA C-2012 Rule 16.6 and 16.1 switch-case-default-break statement is enabled only in case both 
CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT and CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT are ON */
#if ((STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT))
                break;
        }
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_IMPORT) || (STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_IMPORT)) */
    }
    /* If no channel found - return CRYPTO_E_BUSY */
    else
    {
        RetVal = (Std_ReturnType)CRYPTO_E_BUSY;
    }

    /* Avoid compiler warning */
    (void)u32CryptoKeyIdx;

    return RetVal;
}

/**
* @brief           Exports a key
* @details         Fills the descriptor for exporting a key
*
* @param[in]       u32PartitionId:           Id of the partition from where the call to the function was made
* @param[in]       u32KeyMaterialKeyElemIdx: Id of the Key Material Crypto Key Element
* @param[in]       u32KeyExportKeyElemIdx:   Id of the key element where the tag or signature will be stored
* @param[in]       pResult:                  Location where the key will be exported
* @param[inout]    pResultLength:            The length of the exported key
*
* @returns         Std_ReturnType
*                   E_OK:                       Request successful
*                   E_NOT_OK:                   Request unsuccessful
*                   CRYPTO_E_KEY_READ_FAIL:     Failure in reading the key
*                   CRYPTO_E_KEY_WRITE_FAIL:    Failure in writing the key
*                   CRYPTO_E_KEY_NOT_AVAILABLE: Key not available
*                   CRYPTO_E_KEY_NOT_VALID:     Invalid key
*                   CRYPTO_E_BUSY:              Busy
*/
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
)
{
#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_EXPORT)
    Std_ReturnType       RetVal       = (Std_ReturnType)E_NOT_OK;
    const uint8          u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;
    uint8                u8KeyType    = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u8HseKeyType;
    Crypto_43_HSE_KeyFormatType eKeyFormat = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].eCryptoKeyFormat;
    uint8                u8MuChannel;
    hseSrvDescriptor_t*  pHseSrvDescriptor;

    /* Get a free channel, if possible */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);

    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);

#if (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_EXPORT)
        if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_SHEKEYS == eKeyFormat)
        {
            RetVal         = Crypto_Ipw_ExportRamSheKey(u8MuInstance, u8MuChannel, pHseSrvDescriptor, pResult);
            *pResultLength = CRYPTO_43_HSE_SHE_SIZE_OUT_U32;
        }
        else
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE_KEY_EXPORT) */
        {
#if ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT))
            if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_OCTET == eKeyFormat)
            {
                RetVal = Crypto_Ipw_ExportPubKey(u8MuInstance, u8MuChannel, pHseSrvDescriptor, u32KeyMaterialKeyElemIdx, pResult, pResultLength);
            }
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_RSA_KEY_EXPORT) || (STD_ON == CRYPTO_43_HSE_SPT_ECC_KEY_EXPORT)) */
        }

        /* A custom key export may be attempted if the key element format matches. */
        if ((Crypto_43_HSE_KeyFormatType)CRYPTO_43_HSE_KE_FORMAT_BIN_CUSTOM_IMPORT_EXPORT == eKeyFormat)
        {
            RetVal = Crypto_Ipw_ExportCustomKey(u8MuInstance,
                                                u8MuChannel,
                                                pHseSrvDescriptor,
                                                pResult,
                                                u32KeyMaterialKeyElemIdx);
        }
    }
    /* If no channel found - return CRYPTO_E_BUSY */
    else
    {
        RetVal = (Std_ReturnType)CRYPTO_E_BUSY;
    }

    /* Ignore compiler warning */
    (void)u8KeyType;
#else
    Std_ReturnType RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;
    /* Ignore compiler warnings */
    (void)u32PartitionId;
    (void)u32KeyMaterialKeyElemIdx;
    (void)pResult;
    (void)pResultLength;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_EXPORT) */
    return RetVal;
}

/**
* @brief           Copy Key service
* @details         This service can be used to extract keys (or a key) from the derived key material placed
*                  in a temporary shared secret slot (HSE_KEY_TYPE_SHARED_SECRET)
*
* @param[in]       u32PartitionId:            Id of the partition from where the call to the function was made
* @param[in]       u32CryptoSrcKeyIdx:        Key element index of source key to be copied
* @param[in]       u32TargetCryptoKeyIdx:     Key element index of target key
* @param[in]       u32KeyElementSourceOffset: Key element source offset
* @param[in]       u32KeyElementCopyLength:   Specifies the number of bytes that shall be copied
*
* @returns         Std_ReturnType
*                       E_OK         : Request successful.
*                       E_NOT_OK     : Request unsuccessful.
*                       CRYPTO_E_BUSY: No MU channels available to process the requested job operation.
*/
Std_ReturnType Crypto_43_HSE_Ipw_KeyDeriveExtract
(
    const uint32 u32PartitionId,
    const uint32 u32CryptoSrcKeyIdx,
    const uint32 u32TargetCryptoKeyIdx,
    const uint32 u32KeyElementSourceOffset,
    const uint32 u32KeyElementCopyLength
)
{
#if(STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE)
    hseKeyDeriveCopyKeySrv_t* pExtractKeySrv;
    hseSrvDescriptor_t*       pHseSrvDescriptor;
    uint8                     u8MuChannel;
    Std_ReturnType            RetVal;
    const uint8               u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    /* Get a free channel, if possible */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);

    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyType                   = (hseKeyType_t) Crypto_43_HSE_aKeyElementList[u32TargetCryptoKeyIdx].u8HseKeyType;
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyBitLen                 = (uint16)Crypto_Ipw_GetBitLenFromByteLen(u32KeyElementCopyLength);
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].keyFlags                  =                Crypto_43_HSE_aKeyElementList[u32TargetCryptoKeyIdx].hseKeyFlags;
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].smrFlags                  = (hseSmrFlags_t)Crypto_43_HSE_aKeyElementList[u32TargetCryptoKeyIdx].u32HseKeySmrFlags;
#if (STD_ON == CRYPTO_43_HSE_AES_BLOCK_MODE_MASK)
    #ifdef HSE_KU_AES_BLOCK_MODE_ANY
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].specific.aesBlockModeMask = HSE_KU_AES_BLOCK_MODE_ANY; /* Any AES block mode can be used */
    #else
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].specific.aesBlockModeMask = (hseAesBlockModeMask_t)0U; /* Any AES block mode can be used */
    #endif
#endif /* (STD_ON == CRYPTO_43_HSE_AES_BLOCK_MODE_MASK) */
        /* Clear the HseReserved bytes in the keyInfo structure, as HSE FW expects these to be 0 */
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].hseReserved[0U] = 0U;
        Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel].hseReserved[1U] = 0U;

        pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);
        pExtractKeySrv    = &pHseSrvDescriptor->hseSrv.keyDeriveCopyKeyReq;

        pHseSrvDescriptor->srvId        = HSE_SRV_ID_KEY_DERIVE_COPY;
        pExtractKeySrv->keyHandle       = Crypto_43_HSE_aKeyElementList[u32CryptoSrcKeyIdx].u32HseKeyHandle;
        pExtractKeySrv->startOffset     = (uint16)u32KeyElementSourceOffset;
        pExtractKeySrv->targetKeyHandle = Crypto_43_HSE_aKeyElementList[u32TargetCryptoKeyIdx].u32HseKeyHandle;
        pExtractKeySrv->keyInfo         = Crypto_Ipw_apMuState[u8MuInstance]->HseKeyInfoStorage[u8MuChannel];

        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);
    }
    else
    {
        /* No free MU channel was found */
        RetVal = (Std_ReturnType)CRYPTO_E_BUSY;
    }
    /* Ignore compiler warnings */
    (void)u32KeyElementCopyLength;
    (void)u32KeyElementSourceOffset;
#else
    Std_ReturnType RetVal = CRYPTO_43_HSE_RET_NOT_SUPPORTED;
    /* Ignore compiler warnings */
    (void)u32PartitionId;
    (void)u32CryptoSrcKeyIdx;
    (void)u32TargetCryptoKeyIdx;
    (void)u32KeyElementSourceOffset;
    (void)u32KeyElementCopyLength;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE) */

    return RetVal;
}

/**
* @brief           Random seed
* @details         Random seed
*
* @param[in]       u32PartitionId:  Id of the partition from where the call to the function was made
* @param[in]       u32CryptoKeyIdx: If of the Crypto Key to be used for Random Seed
* @param[in]       pu8SeedPtr:      Pointer to the seed
* @param[in]       u32SeedLength:   Length of the seed
*
* @returns         Std_ReturnType
*                       E_OK:     Correct configuration of parameters
*                       E_NOT_OK: Incorrect configuration of parameters: keyId not existent, wrong length
*/
Std_ReturnType Crypto_43_HSE_Ipw_RandomSeed
(
    const uint32       u32PartitionId,
    const uint32       u32CryptoKeyIdx,
    const uint8* const pu8SeedPtr,
    const uint32       u32SeedLength
)
{
    /* Ignore compiler warnings */
    (void)u32PartitionId;
    (void)u32CryptoKeyIdx;
    (void)pu8SeedPtr;
    (void)u32SeedLength;

    return (Std_ReturnType)E_OK;
}

/**
* @brief           Generate key
* @details         Generate random key, RSA pair, ECC pair
*
* @param[in]       u32PartitionId: Id of the partition from where the call to the function was made
* @param[in]       u32CryptoKeyId: If of the Crypto Key to be used for Key Generation
*
* @returns         Std_ReturnType
*                       E_OK         : Correct configuration of parameters.
*                       E_NOT_OK     : Incorrect configuration of parameters: keyId not existent, wrong length.
*                       CRYPTO_E_BUSY: No MU channels available to process the requested job operation.
*/
Std_ReturnType Crypto_43_HSE_Ipw_KeyGenerate
(
    const uint32 u32PartitionId,
    const uint32 u32CryptoKeyIdx
)
{
#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE)
    uint8               u8MuChannel;
    hseSrvDescriptor_t* pHseSrvDescriptor;
    Std_ReturnType      RetVal;
    boolean             bReqSentOverChannel = FALSE;
    const uint8         u8MuInstance        = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    /* Check if a free MU channel can be found */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);
    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);

        RetVal = Crypto_Ipw_KeyGenerateRequest(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR, u32CryptoKeyIdx, &bReqSentOverChannel);
        /* Free the allocated channel in case the request was not sent to firmware */
        if (FALSE == bReqSentOverChannel)
        {
            Hse_Ip_ReleaseChannel(u8MuInstance, u8MuChannel);
        }
    }
    else
    {
        /* No free MU channel was found */
        RetVal = (Std_ReturnType)CRYPTO_E_BUSY;
    }
#else
    Std_ReturnType RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;
    /* Ignore compiler warnings */
    (void)u32PartitionId;
    (void)u32CryptoKeyIdx;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_GENERATE) */
    return RetVal;
}

/**
* @brief         Tries to allocate a free MU channel for initiating the KeyDerive operation in HSE
* @details       Tries to allocate a free MU channel for initiating the KeyDerive operation in HSE
*
* @param[in]     u32PartitionId:  Id of the partition from where the call to the function was made
* @param[in]     u32CryptoKeyIdx: Index of the Crypto Key
* @param[in]     u32TargetKeyIdx: Index of the Target Crypto Key
*
* @returns         Std_ReturnType
*                   E_OK         : Correct configuration of parameters.
*                   E_NOT_OK     : Incorrect configuration of parameters: incorrect lengths.
*                   CRYPTO_E_BUSY: No MU channels available to process the requested job operation.
*/
Std_ReturnType Crypto_43_HSE_Ipw_KeyDerive
(
    const uint32 u32PartitionId,
    const uint32 u32CryptoKeyIdx,
    const uint32 u32TargetKeyIdx
)
{
#if (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE)
    uint8               u8MuChannel;
    hseSrvDescriptor_t* pHseSrvDescriptor;
    Std_ReturnType      RetVal;
    boolean             bReqSentOverChannel = FALSE;
    const uint8         u8MuInstance        = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    /* Check if a free MU channel can be found */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);
    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);

        RetVal = Crypto_Ipw_KeyDeriveRequest(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR, u32CryptoKeyIdx, u32TargetKeyIdx, &bReqSentOverChannel);
        /* Free the allocated channel in case the request was not sent to firmware */
        if (FALSE == bReqSentOverChannel)
        {
            Hse_Ip_ReleaseChannel(u8MuInstance, u8MuChannel);
        }
    }
    else
    {
        /* No free MU channel was found */
        RetVal = (Std_ReturnType)CRYPTO_E_BUSY;
    }
#else
    Std_ReturnType RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;
    /* Ignore compiler warnings */
    (void)u32PartitionId;
    (void)u32CryptoKeyIdx;
    (void)u32TargetKeyIdx;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_KEY_DERIVE) */

    return RetVal;
}

/**
* @brief           Computes Shared Secret
* @details         Calculates the shared secret key for the key exchange with the key material of the key
*                  identified by the cryptoKeyId and the partner public key. The shared secret key is
*                  stored as a key element in the same key.
*
* @param[in]       u32PartitionId:              Id of the partition from where the call to the function was made
* @param[in]       u32CryptoKeyIdx:             Index of the key
* @param[in]       pPartnerPublicValue:         Pointer to partner public key data
* @param[in]       u32PartnerPublicValueLength: Length of partner public key
*
* @returns      Std_ReturnType -
*                  E_OK         : Correct configuration of parameters.
*                  E_NOT_OK     : Incorrect configuration of parameters: keyId not existent, wrong length.
*                  CRYPTO_E_BUSY: No MU channels available to process the requested job operation.
*/
Std_ReturnType Crypto_43_HSE_Ipw_CalcSecret
(
    const uint32       u32PartitionId,
    const uint32       u32CryptoKeyIdx,
    const uint8* const pPartnerPublicValue,
    const uint32       u32PartnerPublicValueLength
)
{
#if (((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) && (STD_ON == CRYPTO_43_HSE_SPT_COMPUTE_DH))
    uint8               u8MuChannel;
    hseSrvDescriptor_t* pHseSrvDescriptor;
    Std_ReturnType      RetVal;
    const uint8         u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    /* Check if a free MU channel can be found */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);
    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);

        RetVal = Crypto_Ipw_CalcSecretRequest(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR, u32CryptoKeyIdx, pPartnerPublicValue, u32PartnerPublicValueLength);
    }
    else
    {
        /* No free MU channel was found */
        RetVal = (Std_ReturnType)CRYPTO_E_BUSY;
    }
#else
    Std_ReturnType RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;
    /* Ignore compiler warnings */
    (void)u32PartitionId;
    (void)u32CryptoKeyIdx;
    (void)pPartnerPublicValue;
    (void)u32PartnerPublicValueLength;
#endif /* (((STD_ON == CRYPTO_43_HSE_SPT_RSA) || (STD_ON == CRYPTO_43_HSE_SPT_ECC)) && (STD_ON == CRYPTO_43_HSE_SPT_COMPUTE_DH)) */

    return RetVal;
}

#if (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM)
/**
* @brief           Function that tries to restore information about the valid flag of the Crypto keys from Nvram
* @details         Function that tries to restore information about the valid flag of the Crypto keys from Nvram
*
* @param[in]       u32PartitionId: Id of the partition from where the call to the function was made
*
* @returns         Std_ReturnType
*                  E_OK         : The operation was executed successfully.
*                  E_NOT_OK     : The operation failed.
*                  CRYPTO_E_BUSY: No MU channels available to process the requested job operation.
*/
Std_ReturnType Crypto_43_HSE_Ipw_RestoreKeyValidInfoFromNvram
(
    const uint32 u32PartitionId
)
{
    Std_ReturnType      RetVal = (Std_ReturnType)E_OK;
    uint32              u32KeyCounter;
    uint32              u32KeyElemCounter;
    uint32              u32HseKeyHandle;
    const uint8         u8MuInstance        = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;
    Std_ReturnType      NvMBlockStatus   = (Std_ReturnType)E_OK;

    /* Loop through all the keys that are marked as valid from the just restored blob */
    for (u32KeyCounter = 0; u32KeyCounter < CRYPTO_43_HSE_NUMBER_OF_KEYS_U32; u32KeyCounter++)
    {
        if ((uint8)CRYPTO_KEYSTATUS_VALID == *Crypto_43_HSE_aKeyList[u32KeyCounter].KeyStatus)
        {
            /* We assume here that a key has been marked valid by the upper layer only after all its key elements that use a HSE key have been imported in HSE
               Therefore, we will check here that all key elements of the currently looped key that use a HSE key are residing in non-empty HSE key slots */
            for (u32KeyElemCounter = 0; u32KeyElemCounter < Crypto_43_HSE_aKeyList[u32KeyCounter].u32NumCryptoKeyElements; u32KeyElemCounter++)
            {
                u32HseKeyHandle = Crypto_43_HSE_aKeyElementList[Crypto_43_HSE_aKeyList[u32KeyCounter].pCryptoKeyElementList[u32KeyElemCounter]].u32HseKeyHandle;
                if ((uint32)HSE_INVALID_KEY_HANDLE != u32HseKeyHandle)
                {
                    /* Check HSE key status */
                    NvMBlockStatus = Crypto_43_HSE_Ipw_CheckKey(u8MuInstance, u32KeyCounter);

                    if (((Std_ReturnType)E_OK != NvMBlockStatus) && ((Std_ReturnType)CRYPTO_E_BUSY != NvMBlockStatus))
                    {
                        /* We have found at least one key element in the current looped valid key which is using HSE, but the HSE slot information is not ok. Mark the key as invalid. */
                        *Crypto_43_HSE_aKeyList[u32KeyCounter].KeyStatus = (uint8)CRYPTO_KEYSTATUS_INVALID;

                        /* SWS_NvM_00471: Reserved NVRAM block IDs: 0 -> to derive multi block request results via NvM_GetErrorStatus 1 -> redundant NVRAM block which holds the configuration ID */
                        /* Check if valid NvM block is configured with Key*/
                        if (Crypto_43_HSE_aNvBlockDescriptor[u32KeyCounter].NvBlockId > 0)
                        {
                            /* In case there is a mismatch between status from Nvm and the one from HSE, update Nvm accordingly */
                            NvMBlockStatus = NvM_SetRamBlockStatus(Crypto_43_HSE_aNvBlockDescriptor[u32KeyCounter].NvBlockId, TRUE);

                            if (((Std_ReturnType)E_OK == NvMBlockStatus) && (CRYPTO_43_HSE_NV_BLOCK_IMMEDIATE == Crypto_43_HSE_aNvBlockDescriptor[u32KeyCounter].NvBlockProcessing))
                            {
                                NvMBlockStatus = NvM_WriteBlock(Crypto_43_HSE_aNvBlockDescriptor[u32KeyCounter].NvBlockId, Crypto_43_HSE_aKeyList[u32KeyCounter].KeyStatus);
                            }
                            else
                            {
                                /* do nothing */
                            }

                            /* In case writing process and/or set ram block satus has not finished yet, then update status with CRYPTO_KEYSTATUS_UPDATE_IN_PROGRESS*/
                            if ((Std_ReturnType)E_OK == NvMBlockStatus)
                            {
                               /* SWS_Crypto_00245: If a key is currently updated in NV RAM Block and has not yet been written by NVM,
                                  then this shall be reflected in the key status with CRYPTO_KEYSTATUS_UPDATE_IN_PROGRESS through the Crypto_KeyGetStatus() interface.
                                */
                               *Crypto_43_HSE_aKeyList[u32KeyCounter].KeyStatus = (uint8)CRYPTO_KEYSTATUS_UPDATE_IN_PROGRESS;
                            }
                        }
                        else
                        {
                            /* Return E_OK as NvM block is not configured with Key*/
                            NvMBlockStatus = E_OK;
                        }
                        break;
                    }
                }
            }

            /* For each key status there will be single return value*/
            if ((Std_ReturnType)E_OK != NvMBlockStatus)
            {
                RetVal = E_NOT_OK;
            }
        }
    }
    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_KEY_STORAGE_IN_NVM) */

#if (STD_ON == CRYPTO_43_HSE_ENABLE_FEED_HSE_DESC_SUPPORT)
/**
* @brief           Function that performs a request to HSE based on the received descriptor parameter
* @details         Function that always performs a synchronous request to HSE based on the received descriptor parameter
*
* @param[in]       u32PartitionId:      Id of the partition from where the call to the function was made
* @param[in]       pu8ResultPtr:        Pointer to the descriptor to be sent to HSE
* @param[in]       pu32ResultLengthPtr: Pointer to location where the value of the HSE response will be stored
*
* @returns         Std_ReturnType
*/
Std_ReturnType Crypto_43_HSE_Ipw_FeedHseDescriptor
(
    const uint32 u32PartitionId,
    uint8*       pu8ResultPtr,
    uint32*      pu32ResultLengthPtr
)
{
    uint8            u8MuChannel;
    hseSrvResponse_t HseResponse;
    Hse_Ip_ReqType*  pHseIpReq;
    Std_ReturnType   RetVal;
    const uint8      u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    /* Get a free channel, if possible */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);

    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseIpReq = &Crypto_Ipw_apMuState[u8MuInstance]->Hse_Ip_aRequest[u8MuChannel];

        pHseIpReq->eReqType   = HSE_IP_REQTYPE_SYNC;
        pHseIpReq->u32Timeout = Crypto_Ipw_apMuState[u8MuInstance]->u32HseSyncRequestsTimeout;

        /* Send the request to Hse Ip layer */
        HseResponse = Hse_Ip_ServiceRequest(u8MuInstance, u8MuChannel, pHseIpReq, (hseSrvDescriptor_t*)CRYPTO_HSE_HOST_ADDR_TO_INT(Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pu8ResultPtr))));

        /* Translate the message received from HSE to a Std_ReturnType value */
        RetVal = Crypto_Ipw_TranslateHseResponse(HseResponse);
        /* Update the content of the pu32ResultLengthPtr with the response received from HSE */
        *pu32ResultLengthPtr = (uint32)HseResponse;
    }
    else
    {
        /* No free MU channel was found */
        RetVal = (Std_ReturnType)CRYPTO_E_BUSY;
    }

    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_ENABLE_FEED_HSE_DESC_SUPPORT) */
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */

/**
* @brief           Main function
* @details         Main function - check for async jobs, then send jobs from the queue
*
* @param[in]       u32PartitionId: Id of the partition from where the call to the function was made
*
* @returns         void
*/
void Crypto_43_HSE_Ipw_MainFunction
(
    const uint32 u32PartitionId
)
{
    const uint8 u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    /* Call the main function of the HseIp layer. This is responsible for calling back the async jobs callbacks */
    Hse_Ip_MainFunction(u8MuInstance);
}

/**
* @brief           Format the Key Catalogs
* @details         HSE firmware formatting key catalogs
*
* @param[in]       u32PartitionId: Id of the partition from where the call to the function was made
*
* @returns         Std_ReturnType
*/
Std_ReturnType Crypto_43_HSE_Ipw_FormatKeyCatalogs
(
    const uint32 u32PartitionId
)
{
#if(STD_ON == CRYPTO_43_HSE_SPT_FORMATKEYCATALOGS)
    hseFormatKeyCatalogsSrv_t* pFormatKeyCatalogsReq;
    hseSrvDescriptor_t*        pHseSrvDescriptor;
    uint8                      u8MuChannel;
    Std_ReturnType             RetVal       = (Std_ReturnType)E_NOT_OK;
    const uint8                u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    /* Get a free channel, if possible */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);

    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);
        pFormatKeyCatalogsReq = &pHseSrvDescriptor->hseSrv.formatKeyCatalogsReq;

        pHseSrvDescriptor->srvId = HSE_SRV_ID_FORMAT_KEY_CATALOGS;
        pFormatKeyCatalogsReq->pNvmKeyCatalogCfg = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(aHseNvmKeyCatalog));
        pFormatKeyCatalogsReq->pRamKeyCatalogCfg = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(aHseRamKeyCatalog));

        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);
    }
#else
    Std_ReturnType RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;

    /* Ignore compiler warning */
    (void)u32PartitionId;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_FORMATKEYCATALOGS) */

    return RetVal;
}

/**
* @brief           Sets the timeout for synhronous requests send to HSE
* @details         Sets the timeout for synhronous requests send to HSE
*
* @param[in]       u32PartitionId: Id of the partition from where the call to the function was made
* @param[in]       u32Timeout:     Value of the timeout
*
* @returns         Std_ReturnType
*/
void Crypto_43_HSE_Ipw_SetSynchronousRequestsTimeout
(
    const uint32 u32PartitionId,
    const uint32 u32Timeout
)
{
    const uint8 u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    Crypto_Ipw_apMuState[u8MuInstance]->u32HseSyncRequestsTimeout = u32Timeout;
}

/**
* @brief           Sets SHE boot status to ok or failed
* @details         Sets SHE boot status to ok or failed
*
* @param[in]       u8MuInstance: MU instance used to send the request to HSE
* @param[in]       bStatus:      Boolean flag defining if status should be ok (when TRUE) or failed (when FALSE)
*
* @returns         Std_ReturnType
*/
Std_ReturnType Crypto_43_HSE_Ipw_SheSetBootStatus
(
    const uint32  u32PartitionId,
    const boolean bStatus
)
{
#if (STD_ON == CRYPTO_43_HSE_SPT_SHE)
    hseSrvDescriptor_t*        pHseSrvDescriptor;
    uint8                      u8MuChannel;
    Std_ReturnType             RetVal       = (Std_ReturnType)E_NOT_OK;
    const uint8                u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    /* Get a free channel, if possible */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);

    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);

        if (TRUE == bStatus)
        {
            pHseSrvDescriptor->srvId = HSE_SRV_ID_SHE_BOOT_OK;
        }
        else
        {
            pHseSrvDescriptor->srvId = HSE_SRV_ID_SHE_BOOT_FAILURE;
        }

        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);
    }
#else
    Std_ReturnType RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;

    /* Ignore compiler warning */
    (void)u32PartitionId;
    (void)bStatus;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE) */

    return RetVal;
}


/**
* @brief           Gets SHE status
* @details         Gets SHE status
*
* @param[in]       u32PartitionId: Id of the partition from where the call to the function was made
* @param[out]      pStatus:        Pointer to one byte location provide by app where Crypto will store the status of HSE
*
* @returns         Std_ReturnType
*/
Std_ReturnType Crypto_43_HSE_Ipw_SheGetStatus
(
    const uint32 u32PartitionId,
    uint8*       pStatus
)
{
#if (STD_ON == CRYPTO_43_HSE_SPT_SHE)
    Std_ReturnType RetVal       = (Std_ReturnType)E_OK;
    const uint8    u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    *pStatus = (uint8)Hse_Ip_GetHseStatus(u8MuInstance);
#else
    Std_ReturnType RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;

    /* Ignore compiler warning */
    (void)u32PartitionId;
    (void)pStatus;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE) */

    return RetVal;
}


/**
* @brief           Gets SHE ID
* @details         The function returns the identity (UID) and the value of the status register protected by a MAC over a challenge and the data
*
* @param[in]       u32PartitionId: Id of the partition from where the call to the function was made
* @param[in]       pChallenge:     Pointer to a 128-bit buffer where from the challenge will be taken
* @param[out]      pId:            Pointer to a 128-bit buffer where UID will be stored
* @param[out]      pSreg:          Pointer to a 8-bit buffer where status register will be stored
* @param[out]      pMac:           Pointer to a 128-bit buffer where MAC key will be stored
*
* @returns         Std_ReturnType
*/
Std_ReturnType Crypto_43_HSE_Ipw_SheGetId
(
    const uint32 u32PartitionId,
    const uint8* pChallenge,
    const uint8* pId,
    const uint8* pSreg,
    const uint8* pMac
)
{
#if (STD_ON == CRYPTO_43_HSE_SPT_SHE)
    hseSheGetIdSrv_t*   pSheGetIdReq;
    hseSrvDescriptor_t* pHseSrvDescriptor;
    uint8               u8MuChannel;
    Std_ReturnType      RetVal       = (Std_ReturnType)E_NOT_OK;
    const uint8         u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    /* Get a free channel, if possible */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);

    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);
        pSheGetIdReq      = &(pHseSrvDescriptor->hseSrv.sheGetIdReq);

        pHseSrvDescriptor->srvId = HSE_SRV_ID_SHE_GET_ID;

        pSheGetIdReq->pChallenge = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pChallenge[0u]));
        pSheGetIdReq->pId        = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pId[0u]));
        pSheGetIdReq->pSreg      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pSreg[0u]));
        pSheGetIdReq->pMac       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pMac[0u]));

        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);
    }
#else
    Std_ReturnType RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;

    /* Ignore compiler warning */
    (void)u32PartitionId;
    (void)pChallenge;
    (void)pId;
    (void)pSreg;
    (void)pMac;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE) */

    return RetVal;
}

/**
* @brief           Initiates SHE debug challenge
* @details         Initiates SHE debug challenge
*
* @param[in]       u32PartitionId: Id of the partition from where the call to the function was made
* @param[out]      pChallenge:     Pointer to a 128-bit buffer where the challenge will be stored
*
* @returns         Std_ReturnType
*/
Std_ReturnType Crypto_43_HSE_Ipw_SheDebugChal
(
    const uint32 u32PartitionId,
    const uint8* pChallenge
)
{
#if (STD_ON == CRYPTO_43_HSE_SPT_SHE)
    hseSysAuthorizationReqSrv_t* pSysAuthReq;
    hseSrvDescriptor_t*          pHseSrvDescriptor;
    uint8                        u8MuChannel;
    Std_ReturnType               RetVal       = (Std_ReturnType)E_NOT_OK;
    const uint8                  u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    /* Get a free channel, if possible */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);

    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);
        pSysAuthReq       = &(pHseSrvDescriptor->hseSrv.sysAuthorizationReq);

        pHseSrvDescriptor->srvId = HSE_SRV_ID_SYS_AUTH_REQ;

        pSysAuthReq->sysAuthOption  = HSE_SYS_AUTH_KEY_MGMT;
        pSysAuthReq->sysRights      = HSE_RIGHTS_SUPER_USER;
        pSysAuthReq->ownerKeyHandle = CRYPTO_IPW_SHE_MASTER_ECU_KEY_HANDLE_U32;
        pSysAuthReq->pChallenge     = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pChallenge[0]));
        pSysAuthReq->authScheme.macScheme.macAlgo             = HSE_MAC_ALGO_CMAC;
        pSysAuthReq->authScheme.macScheme.sch.cmac.cipherAlgo = HSE_CIPHER_ALGO_AES;

        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);
    }
#else
    Std_ReturnType RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;

    /* Ignore compiler warning */
    (void)u32PartitionId;
    (void)pChallenge;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE) */

    return RetVal;
}


/**
* @brief           Initiates SHE debug authorization
* @details         Initiates SHE debug authorization
*
* @param[in]       u32PartitionId: Id of the partition from where the call to the function was made
* @param[in]       pAuthorization: Pointer to a 128-bit buffer where from the authorization value will be taken
*
* @returns         Std_ReturnType
*/
Std_ReturnType Crypto_43_HSE_Ipw_SheDebugAuth
(
    const uint32 u32PartitionId,
    const uint8* pAuthorization
)
{
#if (STD_ON == CRYPTO_43_HSE_SPT_SHE)
    hseSysAuthorizationRespSrv_t* pSysAuthResp;
    hseEraseKeySrv_t*             pEraseKeyReq;
    hseSrvDescriptor_t*           pHseSrvDescriptor;
    uint8                         u8MuChannel;
    Std_ReturnType                RetVal       = (Std_ReturnType)E_NOT_OK;
    const uint8                   u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    /* Get a free channel, if possible */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);

    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);
        pSysAuthResp      = &(pHseSrvDescriptor->hseSrv.sysAuthorizationResp);

        pHseSrvDescriptor->srvId = HSE_SRV_ID_SYS_AUTH_RESP;

        pSysAuthResp->authLen[0] = 16U;
        pSysAuthResp->authLen[1] = 0U;
        pSysAuthResp->pAuth[0]   = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pAuthorization[0u]));
        pSysAuthResp->pAuth[1]   = (HOST_ADDR)0U;

        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);

        if ((Std_ReturnType)E_OK == RetVal)
        {
            /* Get a free channel, if possible */
            u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);

            /* If a free channel is found */
            if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
            {
                pHseSrvDescriptor = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);
                pEraseKeyReq      = &(pHseSrvDescriptor->hseSrv.eraseKeyReq);

                pHseSrvDescriptor->srvId = HSE_SRV_ID_ERASE_KEY;

                pEraseKeyReq->keyHandle       = HSE_INVALID_KEY_HANDLE;
                pEraseKeyReq->eraseKeyOptions = HSE_ERASE_ALL_NVM_SYM_KEYS_ON_MU_IF;

                RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);
            }
        }
    }
#else
    Std_ReturnType RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;

    /* Ignore compiler warning */
    (void)u32PartitionId;
    (void)pAuthorization;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_SHE) */

    return RetVal;
}


/**
* @brief           Miyaguchi-Preneel compression function
* @details         Gets SHE status
*
* @param[in]       u32PartitionId: Id of the partition from where the call to the function was made
* @param[in]       pInput:         Pointer to input data
* @param[in]       u32InputLen:    Input data length
* @param[out]      pResult:        Pointer to result data
* @param[inout]    pResultLen:     Pointer to result data length
*
* @returns         Std_ReturnType
*/
Std_ReturnType Crypto_43_HSE_Ipw_SheMPCompression
(
    const uint32  u32PartitionId,
    const uint8*  pInput,
    const uint32  u32InputLen,
    const uint8*  pResult,
    const uint32* pResultLen
)
{
#if (STD_ON == CRYPTO_43_HSE_SPT_MP)
    hseHashSrv_t*        pSheHashSrv;
    hseSrvDescriptor_t*  pHseSrvDescriptor;
    uint8                u8MuChannel;
    Std_ReturnType       RetVal       = (Std_ReturnType)E_NOT_OK;
    const uint8          u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

    /* Get a free channel, if possible */
    u8MuChannel = Hse_Ip_GetFreeChannel(u8MuInstance);

    /* If a free channel is found */
    if (HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor        = &(Crypto_Ipw_apMuState[u8MuInstance]->pHseSrvDescriptor[u8MuChannel]);
        pSheHashSrv              = &(pHseSrvDescriptor->hseSrv.hashReq);
        pHseSrvDescriptor->srvId = HSE_SRV_ID_HASH;
        pSheHashSrv->accessMode  = HSE_ACCESS_MODE_ONE_PASS;
        pSheHashSrv->hashAlgo    = HSE_HASH_ALGO_MP;
        pSheHashSrv->inputLength = u32InputLen;
        pSheHashSrv->pHash       = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pResult[0u]));
        pSheHashSrv->pHashLength = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(pResultLen));
        pSheHashSrv->pInput      = Crypto_Ipw_AddrHandler(CRYPTO_IPW_PTR_TO_HOST_ADDR(&pInput[0u]));

        RetVal = Crypto_Ipw_SendMsg(u8MuInstance, u8MuChannel, pHseSrvDescriptor, NULL_PTR);
    }
#else
    Std_ReturnType RetVal = (Std_ReturnType)CRYPTO_43_HSE_RET_NOT_SUPPORTED;

    /* Ignore compiler warning */
    (void)u32PartitionId;
    (void)pInput;
    (void)u32InputLen;
    (void)pResult;
    (void)pResultLen;
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_MP) */

    return RetVal;
}

#if (STD_ON == CRYPTO_43_HSE_KEYS_EXIST)
/**
* @brief           Function that checks validity of the key material of a Crypto key with respect to the Crypto key's type
* @details         Function that checks validity of the key material of a Crypto key with respect to the Crypto key's type
*
* @param[in]       u32PartitionId   :  Id of the partition from where the call to the function was made
* @param[in]       u32CryptoKeyIdx  :  Index of the Crypto key
*
* @returns         Std_ReturnType
*                  E_OK         : The operation was executed successfully.
*                  E_NOT_OK     : The operation failed.
*                  CRYPTO_E_BUSY: No MU channels available to process the requested job operation.
*                  CRYPTO_E_KEY_EMPTY         : Specified key slot is empty.
*                  CRYPTO_E_KEY_NOT_AVAILABLE : This error code is returned if a key is locked or not available.
*/
Std_ReturnType Crypto_43_HSE_Ipw_CheckKey
(
    const uint32 u32PartitionId,
    const uint32 u32CryptoKeyIdx
)
{
    /*Local variables used in this function*/
    Std_ReturnType      RetVal = (Std_ReturnType)E_OK;

#if ((STD_ON == CRYPTO_43_HSE_SPT_GETKEYINFO) || (STD_ON == CRYPTO_43_HSE_SPT_KEYVERIFY))
    uint8               u8KeyCatalogId;
    uint32              u32HseKeyHandle;
    uint8               u8MuInstance;

    /* Gets the key element which is key material */
    uint32 u32KeyMaterialKeyElemIdx = Crypto_43_HSE_Util_GetKeyElementIdx(u32CryptoKeyIdx, CRYPTO_43_HSE_KEY_MATERIAL_U32);

    /*Check if the key material element is valid*/
    if (CRYPTO_43_HSE_INVALID_KEY_ELEMENT_IDX_U32 != u32KeyMaterialKeyElemIdx)
    {
        RetVal = (Std_ReturnType)E_NOT_OK;
        u32HseKeyHandle = Crypto_43_HSE_aKeyElementList[u32KeyMaterialKeyElemIdx].u32HseKeyHandle;

        /* We have found at least one key element in the current key which is using HSE*/
        if ((uint32)HSE_INVALID_KEY_HANDLE != u32HseKeyHandle)
        {
            /* Getting catalog id from key handle */
            u8KeyCatalogId = (uint8)(u32HseKeyHandle>>16);

            /*Get the MU instace from the partition given as function argument*/
            u8MuInstance = Crypto_43_HSE_aPartitionToMuMapping[u32PartitionId].u8MuInstance;

            if (((uint8)HSE_KEY_CATALOG_ID_ROM == u8KeyCatalogId)
            ||  ((uint8)HSE_KEY_CATALOG_ID_RAM == u8KeyCatalogId) || ((uint8)HSE_KEY_CATALOG_ID_NVM == u8KeyCatalogId))
            {
                RetVal = Crypto_Ipw_CheckGenericKey(u8MuInstance, u32CryptoKeyIdx, u32KeyMaterialKeyElemIdx, u32HseKeyHandle);
            }
            else
            {
                /* Do nothing, just added to avoid Misra Issue */
            }
        }
        else
        {
            /*Nothing to do, Invalid key handle, E_NOT_OK will be returned*/
        }
    }
    else
    {
        /*Key material element is not present, return E_OK*/
    }

#else
    /* Ignore compiler warnings */
    (void) u32PartitionId;
    (void) u32CryptoKeyIdx;
#endif /* ((STD_ON == CRYPTO_43_HSE_SPT_GETKEYINFO) || (STD_ON == CRYPTO_43_HSE_SPT_KEYVERIFY)) */
    return RetVal;
}
#endif /* (STD_ON == CRYPTO_43_HSE_KEYS_EXIST) */


#define CRYPTO_43_HSE_STOP_SEC_CODE
#include "Crypto_43_HSE_MemMap.h"

#ifdef __cplusplus
}
#endif

/** @} */


