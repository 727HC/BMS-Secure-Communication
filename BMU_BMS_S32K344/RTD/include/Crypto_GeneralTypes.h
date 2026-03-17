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

#ifndef CRYPTO_GENERALTYPES_H
#define CRYPTO_GENERALTYPES_H

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
#include "StandardTypes.h"
#include "Rte_Csm_Type.h"

/*==================================================================================================
*                               SOURCE FILE VERSION INFORMATION
==================================================================================================*/
#define CRYPTO_GENERALTYPES_VENDOR_ID_H                       43
#define CRYPTO_GENERALTYPES_MODULE_ID_H                       110
#define CRYPTO_GENERALTYPES_AR_RELEASE_MAJOR_VERSION_H        4
#define CRYPTO_GENERALTYPES_AR_RELEASE_MINOR_VERSION_H        7
#define CRYPTO_GENERALTYPES_AR_RELEASE_REVISION_VERSION_H     0
#define CRYPTO_GENERALTYPES_SW_MAJOR_VERSION_H                5
#define CRYPTO_GENERALTYPES_SW_MINOR_VERSION_H                0
#define CRYPTO_GENERALTYPES_SW_PATCH_VERSION_H                0

/*==================================================================================================
*                                     FILE VERSION CHECKS
==================================================================================================*/

/*==================================================================================================
*                                           CONSTANTS
==================================================================================================*/

/*==================================================================================================
*                                       DEFINES AND MACROS
==================================================================================================*/
/* SWS_Csm_91043
   Extensions to Std_ReturnType */
#define CRYPTO_E_BUSY                                   ((uint8)0x02U) /* The service request failed because the service is still busy */
#define CRYPTO_E_ENTROPY_EXHAUSTED                      ((uint8)0x04U) /* The service request failed because the entropy of the random number generator is exhausted */
#define CRYPTO_E_KEY_READ_FAIL                          ((uint8)0x06U) /* The service request failed because read access was denied */
#define CRYPTO_E_KEY_WRITE_FAIL                         ((uint8)0x07U) /* The service request failed because the writing access failed */
#define CRYPTO_E_KEY_NOT_AVAILABLE                      ((uint8)0x08U) /* The service request failed because at least one required key element is not available. */
#define CRYPTO_E_KEY_NOT_VALID                          ((uint8)0x09U) /* The service request failed because the key is invalid. */
#define CRYPTO_E_KEY_SIZE_MISMATCH                      ((uint8)0x0AU) /* The service request failed because the key size does not match. */
#define CRYPTO_E_JOB_CANCELED                           ((uint8)0x0CU) /* The service request failed because the Job has been canceled. */
#define CRYPTO_E_KEY_EMPTY                              ((uint8)0x0DU) /* The service request failed because of uninitialized source key element. */

/* AUTOSAR Key Element Index Definition */
/* MAC */
#define CRYPTO_KE_MAC_KEY                               ((uint32)1U)    /* Key Material */
#define CRYPTO_KE_MAC_PROOF                             ((uint32)2U)    /* Proof (SHE) */
/* Signature */
#define CRYPTO_KE_SIGNATURE_KEY                         ((uint32)1U)    /* Key Material */
/* Random */
#define CRYPTO_KE_RANDOM_SEED_STATE                     ((uint32)3U)    /* Seed State */
#define CRYPTO_KE_RANDOM_ALGORITHM                      ((uint32)4U)    /* Algorithm */
/* Cipher/AEAD */
#define CRYPTO_KE_CIPHER_KEY                            ((uint32)1U)    /* Key Material */
#define CRYPTO_KE_CIPHER_IV                             ((uint32)5U)    /* Init Vector */
#define CRYPTO_KE_CIPHER_PROOF                          ((uint32)2U)    /* Proof (SHE) */
#define CRYPTO_KE_CIPHER_2NDKEY                         ((uint32)7U)    /* 2nd Key Material */
/* Key Exchange */
#define CRYPTO_KE_KEYEXCHANGE_BASE                      ((uint32)8U)    /* Base */
#define CRYPTO_KE_KEYEXCHANGE_PRIVKEY                   ((uint32)9U)    /* Private Key */
#define CRYPTO_KE_KEYEXCHANGE_OWNPUBKEY                 ((uint32)10U)   /* Own Public Key */
#define CRYPTO_KE_KEYEXCHANGE_SHAREDVALUE               ((uint32)1U)    /* Shared Value */
#define CRYPTO_KE_KEYEXCHANGE_ALGORITHM                 ((uint32)12U)   /* Algorithm */
/* Key Derivation */
#define CRYPTO_KE_KEYDERIVATION_PASSWORD                ((uint32)1U)    /* Password */
#define CRYPTO_KE_KEYDERIVATION_SALT                    ((uint32)13U)   /* Salt */
#define CRYPTO_KE_KEYDERIVATION_ITERATIONS              ((uint32)14U)   /* Iterations */
#define CRYPTO_KE_KEYDERIVATION_ALGORITHM               ((uint32)15U)   /* Algorithm */
/* Key Generate */
#define CRYPTO_KE_KEYGENERATE_KEY                       ((uint32)1U)    /* Algorithm */
#define CRYPTO_KE_KEYGENERATE_SEED                      ((uint32)16U)   /* Algorithm */
#define CRYPTO_KE_KEYGENERATE_ALGORITHM                 ((uint32)17U)   /* Algorithm */
/* Certificate Parsing */
#define CRYPTO_KE_CERTIFICATE_DATA                      ((uint32)0U)    /* Certificate */
#define CRYPTO_KE_CERTIFICATE_PARSING_FORMAT            ((uint32)18U)   /* Format */
#define CRYPTO_KE_CERTIFICATE_CURRENT_TIME              ((uint32)19U)   /* Current time */
#define CRYPTO_KE_CERTIFICATE_VERSION                   ((uint32)20U)   /* Version */
#define CRYPTO_KE_CERTIFICATE_SERIALNUMBER              ((uint32)21U)   /* Serial Number */
#define CRYPTO_KE_CERTIFICATE_SIGNATURE_ALGORITHM       ((uint32)22U)   /* Signature Algorithm */
#define CRYPTO_KE_CERTIFICATE_ISSUER                    ((uint32)23U)   /* Issuer */
#define CRYPTO_KE_CERTIFICATE_VALIDITY_NOT_BEFORE       ((uint32)24U)   /* Validity Start */
#define CRYPTO_KE_CERTIFICATE_VALIDITY_NOT_AFTER        ((uint32)25U)   /* Validity End */
#define CRYPTO_KE_CERTIFICATE_SUBJECT                   ((uint32)26U)   /* Subject */
#define CRYPTO_KE_CERTIFICATE_SUBJECT_PUBLIC_KEY        ((uint32)1U)    /* Subject Public Key */
#define CRYPTO_KE_CERTIFICATE_EXTENSIONS                ((uint32)27U)   /* Extensions */
#define CRYPTO_KE_CERTIFICATE_SIGNATURE                 ((uint32)28U)   /* Signature */

/*==================================================================================================
*                                             ENUMS
==================================================================================================*/

/*==================================================================================================
*                                 STRUCTURES AND OTHER TYPEDEFS
==================================================================================================*/
/* SWS_Csm_01028
   Enumeration of the current job state. */
typedef enum
{
    CRYPTO_JOBSTATE_IDLE   = 0x00U,  /* Job is in the state "idle". This state is reached after Csm_Init() or when the "Finish" state is finished. */
    CRYPTO_JOBSTATE_ACTIVE = 0x01U   /* Job is in the state "active". There was already some input or there are intermediate results. This state is reached, when the "update" or "start" operation  finishes. */
} Crypto_JobStateType;

/* SWS_Csm_01048
   Enumeration of the algorithm mode. */
typedef enum
{
    CRYPTO_ALGOMODE_NOT_SET           = 0x00U,  /* Algorithm key is not set */
    CRYPTO_ALGOMODE_ECB               = 0x01U,  /* Blockmode: Electronic Code Book */
    CRYPTO_ALGOMODE_CBC               = 0x02U,  /* Blockmode: Cipher Block Chaining */
    CRYPTO_ALGOMODE_CFB               = 0x03U,  /* Blockmode: Cipher Feedback Mode */
    CRYPTO_ALGOMODE_OFB               = 0x04U,  /* Blockmode: Output Feedback Mode */
    CRYPTO_ALGOMODE_CTR               = 0x05U,  /* Blockmode: Counter Modex */
    CRYPTO_ALGOMODE_GCM               = 0x06U,  /* Blockmode: Galois/Counter Mode */
    CRYPTO_ALGOMODE_XTS               = 0x07U,  /* XEX Tweakable Block Cipher with Ciphertext Stealing */
    CRYPTO_ALGOMODE_RSAES_OAEP        = 0x08U,  /* RSA Optimal Asymmetric Encryption Padding */
    CRYPTO_ALGOMODE_RSAES_PKCS1_v1_5  = 0x09U,  /* RSA encryption/decryption with PKCS#1 v1.5 padding */
    CRYPTO_ALGOMODE_RSASSA_PSS        = 0x0AU,  /* RSA Probabilistic Signature Scheme */
    CRYPTO_ALGOMODE_RSASSA_PKCS1_v1_5 = 0x0BU,  /* RSA signature with PKCS#1 v1.5 */
    CRYPTO_ALGOMODE_8ROUNDS           = 0x0CU,  /* 8 rounds (e.g. ChaCha8) */
    CRYPTO_ALGOMODE_12ROUNDS          = 0x0DU,  /* 12 rounds (e.g. ChaCha12) */
    CRYPTO_ALGOMODE_20ROUNDS          = 0x0EU,  /* 20 rounds (e.g. ChaCha20) */
    CRYPTO_ALGOMODE_HMAC              = 0x0FU,  /* Hashed-based MAC */
    CRYPTO_ALGOMODE_CMAC              = 0x10U,  /* Cipher-based MAC */
    CRYPTO_ALGOMODE_GMAC              = 0x11U,  /* Galois MAC */
    CRYPTO_ALGOMODE_CTRDRBG           = 0x12U,  /* Counter-based Deterministic Random Bit Generator */
    CRYPTO_ALGOMODE_SIPHASH_2_4       = 0x13U,  /* Siphash-2-4 */
    CRYPTO_ALGOMODE_SIPHASH_4_8       = 0x14U,  /* Siphash-4-8 */
    CRYPTO_ALGOMODE_PXXXR1            = 0x15U,  /* ANSI R1 Curve */
    CRYPTO_ALGOMODE_CUSTOM            = 0xffU   /* Custom algorithm mode */
} Crypto_AlgorithmModeType;

/* SWS_Csm_01031
   Enumeration of the kind of the service. */
typedef enum
{
    CRYPTO_HASH                  = 0x00U,  /* Hash Service */
    CRYPTO_MACGENERATE           = 0x01U,  /* MacGenerate Service */
    CRYPTO_MACVERIFY             = 0x02U,  /* MacVerify Service */
    CRYPTO_ENCRYPT               = 0x03U,  /* Encrypt Service */
    CRYPTO_DECRYPT               = 0x04U,  /* Decrypt Service */
    CRYPTO_AEADENCRYPT           = 0x05U,  /* AEADEncrypt Service */
    CRYPTO_AEADDECRYPT           = 0x06U,  /* AEADDecrypt Service */
    CRYPTO_SIGNATUREGENERATE     = 0x07U,  /* SignatureGenerate Service */
    CRYPTO_SIGNATUREVERIFY       = 0x08U,  /* SignatureVerify Service */
    CRYPTO_RANDOMGENERATE        = 0x0BU,  /* RandomGenerate Service */
    CRYPTO_RANDOMSEED            = 0x0CU,  /* RandomSeed Service */
    CRYPTO_KEYGENERATE           = 0x0DU,  /* KeyGenerate Service */
    CRYPTO_KEYDERIVE             = 0x0EU,  /* KeyDerive Service */
    CRYPTO_KEYEXCHANGECALCPUBVAL = 0x0FU,  /* KeyExchangeCalcpubVal Service */
    CRYPTO_KEYEXCHANGECALCSECRET = 0x10U,  /* KeyExchangeCalcSecret Service */
    CRYPTO_KEYSETVALID           = 0x13U,  /* KeySetValid Service */
    CRYPTO_KEYSETINVALID         = 0x14U   /* KeySetInvalid Service */
} Crypto_ServiceInfoType;

/* SWS_Csm_01047
   Enumeration of the algorithm family. */
typedef enum
{
    CRYPTO_ALGOFAM_NOT_SET                      = 0x00U, /* Algorithm family is not set */
    CRYPTO_ALGOFAM_SHA1                         = 0x01U, /* SHA1 hash */
    CRYPTO_ALGOFAM_SHA2_224                     = 0x02U, /* SHA2-224 hash */
    CRYPTO_ALGOFAM_SHA2_256                     = 0x03U, /* SHA2-256 hash */
    CRYPTO_ALGOFAM_SHA2_384                     = 0x04U, /* SHA2-384 hash */
    CRYPTO_ALGOFAM_SHA2_512                     = 0x05U, /* SHA2-512 hash */
    CRYPTO_ALGOFAM_SHA2_512_224                 = 0x06U, /* SHA2-512/224 hash */
    CRYPTO_ALGOFAM_SHA2_512_256                 = 0x07U, /* SHA2-512/256 hash */
    CRYPTO_ALGOFAM_SHA3_224                     = 0x08U, /* SHA3-224 hash */
    CRYPTO_ALGOFAM_SHA3_256                     = 0x09U, /* SHA3-256 hash */
    CRYPTO_ALGOFAM_SHA3_384                     = 0x0AU, /* SHA3-384 hash */
    CRYPTO_ALGOFAM_SHA3_512                     = 0x0BU, /* SHA3-512 hash */
    CRYPTO_ALGOFAM_SHAKE128                     = 0x0CU, /* SHAKE128 hash */
    CRYPTO_ALGOFAM_SHAKE256                     = 0x0DU, /* SHAKE256 hash */
    CRYPTO_ALGOFAM_RIPEMD160                    = 0x0EU, /* RIPEMD hash */
    CRYPTO_ALGOFAM_BLAKE_1_256                  = 0x0FU, /* BLAKE-1-256 hash */
    CRYPTO_ALGOFAM_BLAKE_1_512                  = 0x10U, /* BLAKE-1-512 hash */
    CRYPTO_ALGOFAM_BLAKE_2s_256                 = 0x11U, /* BLAKE-2s-256 hash */
    CRYPTO_ALGOFAM_BLAKE_2s_512                 = 0x12U, /* BLAKE-2s-512 hash */
    CRYPTO_ALGOFAM_3DES                         = 0x13U, /* 3DES cipher */
    CRYPTO_ALGOFAM_AES                          = 0x14U, /* AES cipher */
    CRYPTO_ALGOFAM_CHACHA                       = 0x15U, /* ChaCha cipher */
    CRYPTO_ALGOFAM_RSA                          = 0x16U, /* RSA cipher */
    CRYPTO_ALGOFAM_ED25519                      = 0x17U, /* ED22519 elliptic curve */
    CRYPTO_ALGOFAM_BRAINPOOL                    = 0x18U, /* Brainpool elliptic curve */
    CRYPTO_ALGOFAM_ECCNIST                      = 0x19U, /* NIST ECC elliptic curves */
    CRYPTO_ALGOFAM_RNG                          = 0x1BU, /* Random Number Generator */
    CRYPTO_ALGOFAM_SIPHASH                      = 0x1CU, /* SipHash */
    CRYPTO_ALGOFAM_ECCANSI                      = 0x1EU, /* Elliptic curve according to ANSI X9.62 */
    CRYPTO_ALGOFAM_ECCSEC                       = 0x1FU, /* Elliptic curve according to SECG */
    CRYPTO_ALGOFAM_DRBG                         = 0x20U, /* Random number generator according to NIST SP800-90A */
    CRYPTO_ALGOFAM_FIPS186                      = 0x21U, /* Random number generator according to FIPS 186. */
    CRYPTO_ALGOFAM_PADDING_PKCS7                = 0x22U, /* Cipher padding according to PKCS.7 */
    CRYPTO_ALGOFAM_PADDING_ONEWITHZEROS         = 0x23U, /* Cipher padding mode. Fill/verify data with 0, but first bit after the data is 1. Eg. "DATA" & 0x80 & 0x00... */
    CRYPTO_ALGOFAM_PBKDF2                       = 0x24U, /* Password-Based Key Derivation Function 2 */
    CRYPTO_ALGOFAM_KDFX963                      = 0x25U, /* ANSI X9.63 Public Key Cryptography */
    CRYPTO_ALGOFAM_DH                           = 0x26U, /* Diffie-Hellman */
    CRYPTO_ALGOFAM_SM2                          = 0x27U, /* SM2 elliptic curve algorithm */
    CRYPTO_ALGOFAM_EEA3                         = 0x28U, /* Stream cipher based on [x01] */
    CRYPTO_ALGOFAM_SM3                          = 0x29U, /* Chinese hash algorithm based on [x02] */
    CRYPTO_ALGOFAM_EIA3                         = 0x2AU, /* Authentication algorithm [x01] */
    CRYPTO_ALGOFAM_HKDF                         = 0x2BU, /* HMAC-based extract-and-expand key derivation function */
    CRYPTO_ALGOFAM_ECDSA                        = 0x2CU, /* Elliptic-curve Digital Signatures */
    CRYPTO_ALGOFAM_POLY1305                     = 0x2DU, /* MAC calculation algorithm */
    CRYPTO_ALGOFAM_X25519                       = 0x2EU, /* Elliptic curve X25519 for ECDH */
    CRYPTO_ALGOFAM_ECDH                         = 0x2FU, /* Elliptic-curve Diffie Hellman */
    CRYPTO_ALGOFAM_CUSTOM                       = 0xFFU  /* Custom algorithm family */
} Crypto_AlgorithmFamilyType;

/* SWS_Csm_01009
   Structure containing input and output information depending on the job and the crypto primitive. */
typedef struct
{
    const uint8*             inputPtr;                  /* Pointer to the input data. */
    uint32                   inputLength;               /* Contains the input length in bytes. */
    const uint8*             secondaryInputPtr;         /* Pointer to the secondary input data (for MacVerify, SignatureVerify). */
    uint32                   secondaryInputLength;      /* Contains the secondary input length in bytes. */
    const uint8*             tertiaryInputPtr;          /* Pointer to the tertiary input data (for MacVerify, SignatureVerify). */
    uint32                   tertiaryInputLength;       /* Contains the tertiary input length in bytes. */
    uint8*                   outputPtr;                 /* Pointer to the output data. */
    uint32*                  outputLengthPtr;           /* Holds a pointer to a memory location containing the output length in bytes. */
    uint8*                   secondaryOutputPtr;        /* Pointer to the secondary output data. */
    uint32*                  secondaryOutputLengthPtr;  /* Holds a pointer to a memory location containing the secondary output length in bytes. */
    Crypto_VerifyResultType* verifyPtr;                 /* Output pointer to a memory location holding a Crypto_VerifyResultType */
    Crypto_OperationModeType mode;                      /* Indicator of the mode(s)/operation(s) to be performed */
    uint32                   cryIfKeyId;                /* Holds the CryIf key id for key operation services. */
    uint32                   targetCryIfKeyId;          /* Holds the target CryIf key id for key operation services. */
} Crypto_JobPrimitiveInputOutputType;

/* SWS_Csm_01008
   Structure which determines the exact algorithm. Note, not every algorithm needs to specify all fields. AUTOSAR shall only allow valid combinations. */
typedef struct
{
    Crypto_AlgorithmFamilyType family;             /* The family of the algorithm */
    Crypto_AlgorithmFamilyType secondaryFamily;    /* The secondary family of the algorithm  */
    uint32                     keyLength;          /* The key length in bits to be used with that algorithm */
    Crypto_AlgorithmModeType   mode;               /* The operation mode to be used with that algorithm */
} Crypto_AlgorithmInfoType;

/* SWS_Csm_01011
   Structure which contains basic information about the crypto primitive. */
typedef struct
{
    const Crypto_ServiceInfoType   service;     /* Contains the enum of the used service, e.g. Encrypt */
    const Crypto_AlgorithmInfoType algorithm;   /* Contains the information of the used algorithm */
} Crypto_PrimitiveInfoType;

/* SWS_Csm_01049
   Enumeration of the processing type. */
typedef enum
{
    CRYPTO_PROCESSING_ASYNC = 0x00U,    /* Asynchronous job processing */
    CRYPTO_PROCESSING_SYNC  = 0x01U     /* Synchronous  job processing */
} Crypto_ProcessingType;

/* SWS_Csm_01012
   Structure which contains further information, which depends on the job and the crypto primitive. */
typedef struct
{
    uint32                          callbackId;                    /* Identifier of the callback function, to be called, if the configured service finished. */
    const Crypto_PrimitiveInfoType* primitiveInfo;                 /* Pointer to a structure containing further configuration of the crypto primitives */
    uint32                          cryIfKeyId;                    /* Identifier of the CryIf key. */
    Crypto_ProcessingType           processingType;                /* Determines the synchronous or asynchronous behavior. */
} Crypto_JobPrimitiveInfoType;

/* SWS_Csm_91024
   Defines which of the input/output parameters are re-directed to a key element. The values can be combined to define a bit field. */
typedef enum
{
    CRYPTO_REDIRECT_CONFIG_PRIMARY_INPUT    = 0x01,
    CRYPTO_REDIRECT_CONFIG_SECONDARY_INPUT  = 0x02,
    CRYPTO_REDIRECT_CONFIG_TERTIARY_INPUT   = 0x04,
    CRYPTO_REDIRECT_CONFIG_PRIMARY_OUTPUT   = 0x10,
    CRYPTO_REDIRECT_CONFIG_SECONDARY_OUTPUT = 0x20
} Crypto_InputOutputRedirectionConfigType;

/* SWS_Csm_91026
   Structure which holds the identifiers of the keys and key elements which shall be used as input and output for a job and a bit structure which indicates which buffers shall be redirected to those key elements. */
typedef struct
{
    uint8  redirectionConfig;                  /* Bit structure which indicates which buffer shall be redirected to a key element. Values from Crypto_InputOutputRedirectionConfigType can be used and combined with unary OR operation. */
    uint32 inputKeyId;                         /* Identifier of the key which shall be used as input */
    uint32 inputKeyElementId;                  /* Identifier of the key element which shall be used as input */
    uint32 secondaryInputKeyId;                /* Identifier of the key which shall be used as secondary input */
    uint32 secondaryInputKeyElementId;         /* Identifier of the key element which shall be used as secondary input */
    uint32 tertiaryInputKeyId;                 /* Identifier of the key which shall be used as tertiary input */
    uint32 tertiaryInputKeyElementId;          /* Identifier of the key element which shall be used as tertiary input */
    uint32 outputKeyId;                        /* Identifier of the key which shall be used as output */
    uint32 outputKeyElementId;                 /* Identifier of the key element which shall be used as output */
    uint32 secondaryOutputKeyId;               /* Identifier of the key which shall be used as secondary output */
    uint32 secondaryOutputKeyElementId;        /* Identifier of the key element which shall be used as secondary output */
} Crypto_JobRedirectionInfoType;

/* SWS_Csm_01013
   Structure which contains further information, which depends on the job and the crypto primitive  */
typedef struct
{
    uint32                             jobId;                       /* Identifier for the job structure */
    Crypto_JobStateType                jobState;                    /* Determines the current job state */
    Crypto_JobPrimitiveInputOutputType jobPrimitiveInputOutput;     /* Structure containing input and output information depending on the job and the crypto primitive */
    const Crypto_JobPrimitiveInfoType* jobPrimitiveInfo;            /* Pointer to a structure containing further information, which depends on the job and the crypto primitive */
    Crypto_JobRedirectionInfoType*     jobRedirectionInfoRef;       /* Pointer to a structure containing further information on the usage of keys as input and output for jobs. */
    uint32                             cryptoKeyId;                 /* Identifier of the Crypto Driver key. The identifier shall be written by the Crypto Interface. */
    uint32                             targetCryptoKeyId;           /* Target identifier of the Crypto Driver key. The identifier shall be written by the Crypto Interface. */
    const uint32                       jobPriority;                 /* Specifies the importance of the job (the higher, the more important). */
} Crypto_JobType;

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

#endif /* CRYPTO_GENERALTYPES_H */
