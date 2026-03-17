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

#ifndef CRYPTO_43_HSE_ASREXTENSION_H
#define CRYPTO_43_HSE_ASREXTENSION_H

/**
*   @file
*
*   @addtogroup CRYPTO_43_HSE_ASR_EXTENSIONS
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
#define CRYPTO_43_HSE_VENDOR_ID_ASREXTENSION_H                       43
#define CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_ASREXTENSION_H        4
#define CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_ASREXTENSION_H        7
#define CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_ASREXTENSION_H     0
#define CRYPTO_43_HSE_SW_MAJOR_VERSION_ASREXTENSION_H                5
#define CRYPTO_43_HSE_SW_MINOR_VERSION_ASREXTENSION_H                0
#define CRYPTO_43_HSE_SW_PATCH_VERSION_ASREXTENSION_H                0

/*==================================================================================================
*                                       FILE VERSION CHECKS
==================================================================================================*/
/* Check if Crypto ASRExtensions header file and Crypto configuration header file are of the same vendor */
#if (CRYPTO_43_HSE_VENDOR_ID_ASREXTENSION_H != CRYPTO_43_HSE_VENDOR_ID_CFG)
    #error "Crypto_43_HSE_ASRExtension.h and Crypto_43_HSE_Cfg.h have different vendor ids"
#endif

/* Check if Crypto ASRExtensions header file and Crypto configuration header file are of the same Autosar version */
#if ((CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_ASREXTENSION_H    != CRYPTO_43_HSE_AR_RELEASE_MAJOR_VERSION_CFG) || \
     (CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_ASREXTENSION_H    != CRYPTO_43_HSE_AR_RELEASE_MINOR_VERSION_CFG) || \
     (CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_ASREXTENSION_H != CRYPTO_43_HSE_AR_RELEASE_REVISION_VERSION_CFG) \
    )
    #error "AutoSar Version Numbers of Crypto_43_HSE_ASRExtension.h and Crypto_43_HSE_Cfg.h are different"
#endif

/* Check if Crypto ASRExtensions header file and Crypto configuration header file are of the same Software version */
#if ((CRYPTO_43_HSE_SW_MAJOR_VERSION_ASREXTENSION_H != CRYPTO_43_HSE_SW_MAJOR_VERSION_CFG) || \
     (CRYPTO_43_HSE_SW_MINOR_VERSION_ASREXTENSION_H != CRYPTO_43_HSE_SW_MINOR_VERSION_CFG) || \
     (CRYPTO_43_HSE_SW_PATCH_VERSION_ASREXTENSION_H != CRYPTO_43_HSE_SW_PATCH_VERSION_CFG)    \
    )
    #error "Software Version Numbers of Crypto_43_HSE_ASRExtension.h and Crypto_43_HSE_Cfg.h are different"
#endif

/*==================================================================================================
*                                            CONSTANTS
==================================================================================================*/

/*==================================================================================================
*                                       DEFINES AND MACROS
==================================================================================================*/

/* AUTOSAR Extension API's service IDs */
/**
* @brief API service ID for Crypto_43_HSE_Exts_FormatKeyCatalogs function
* */
#define CRYPTO_43_HSE_EXTS_FORMATKEYCATALOGS_ID                    ((uint8)0x80U)

/**
* @brief API service ID for Crypto_43_HSE_Exts_SetSynchronousRequestsTimeout function
* */
#define CRYPTO_43_HSE_EXTS_SETSYNCREQUESTSTIMEOUT_ID               ((uint8)0x81U)

/**
* @brief API service ID for Crypto_43_HSE_Exts_She_BootFailure function
* */
#define CRYPTO_43_HSE_EXTS_SHE_BOOTFAILURE_ID                      ((uint8)0x82U)

/**
* @brief API service ID for Crypto_43_HSE_Exts_She_BootOk function
* */
#define CRYPTO_43_HSE_EXTS_SHE_BOOTOK_ID                           ((uint8)0x83U)

/**
* @brief API service ID for Crypto_43_HSE_Exts_She_GetStatus function
* */
#define CRYPTO_43_HSE_EXTS_SHE_GETSTATUS_ID                        ((uint8)0x84U)

/**
* @brief API service ID for Crypto_43_HSE_Exts_She_GetId function
* */
#define CRYPTO_43_HSE_EXTS_SHE_GETID_ID                            ((uint8)0x85U)

/**
* @brief API service ID for Crypto_43_HSE_Exts_She_DebugChal function
* */
#define CRYPTO_43_HSE_EXTS_SHE_DEBUGCHAL_ID                        ((uint8)0x86U)

/**
* @brief API service ID for Crypto_43_HSE_Exts_She_DebugAuth function
* */
#define CRYPTO_43_HSE_EXTS_SHE_DEBUGAUTH_ID                        ((uint8)0x87U)

/**
* @brief API service ID for Crypto_43_HSE_Exts_She_MPCompression function
* */
#define CRYPTO_43_HSE_EXTS_SHE_MPCOMPRESSION_ID                    ((uint8)0x88U)


/* Key Element Index Definition for Crypto ASR extension functions */
/* Key Exchange */
#ifndef CRYPTO_43_HSE_KE_KEYEXCHANGE_PARTNERPUBKEY
    #define CRYPTO_43_HSE_KE_KEYEXCHANGE_PARTNERPUBKEY             ((uint32)1000U)   /* Partner Public Key */
#endif

/* Key Generate */
#ifndef CRYPTO_43_HSE_KE_KEYGENERATE_CURVETYPE
    #define CRYPTO_43_HSE_KE_KEYGENERATE_CURVETYPE                 ((uint32)1001U)   /* Curve Id OID */
#endif

/* Key Derivation */
#ifndef CRYPTO_43_HSE_KE_KEYDERIVATION_ALGORITHM_SECONDARY
    #define CRYPTO_43_HSE_KE_KEYDERIVATION_ALGORITHM_SECONDARY     ((uint32)1002U)  /* Secondary algorithm */
#endif

/* ECC Key Format */
#ifndef CRYPTO_43_HSE_KE_ECC_FORMAT
    #define CRYPTO_43_HSE_KE_ECC_FORMAT                            ((uint32)1003U)   /* Raw, Uncompressed, Compressed */
#endif

/* Sector Number Key Format */
#ifndef CRYPTO_43_HSE_KE_SECTOR_NUMBER
    #define CRYPTO_43_HSE_KE_SECTOR_NUMBER                         ((uint32)1004U)   /* Sector number key */
#endif

/* Sector Size Key Format */
#ifndef CRYPTO_43_HSE_KE_SECTOR_SIZE
    #define CRYPTO_43_HSE_KE_SECTOR_SIZE                           ((uint32)1005U)   /* Sector size key */
#endif

#if (STD_ON == CRYPTO_43_HSE_SPT_ECC)
/* Hashed input for ECC Signature generate and verify */
#ifndef CRYPTO_43_HSE_KE_INPUT_FORMAT
    #define CRYPTO_43_HSE_KE_INPUT_FORMAT                          ((uint32)1006U)   /* ECC Signature input format */
#endif
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC) */

/**
* @brief Defines for custom extensions to Crypto_AlgorithmFamilyType
* */
#ifndef CRYPTO_43_HSE_ALGOFAM_CUSTOM_ED448
    #define CRYPTO_43_HSE_ALGOFAM_CUSTOM_ED448                     ((uint8)128)
#endif

#ifndef CRYPTO_43_HSE_ALGOFAM_CUSTOM_ED25519PH
    #define CRYPTO_43_HSE_ALGOFAM_CUSTOM_ED25519PH                 ((uint8)129) /*ED22519 elliptic curve with pre-hash*/
#endif


/**
* @brief Defines for custom extensions to Crypto_AlgorithmModeType
* */
#ifndef CRYPTO_43_HSE_ALGOMODE_CUSTOM_FAST_CMAC
    #define CRYPTO_43_HSE_ALGOMODE_CUSTOM_FAST_CMAC                ((uint8)128)  /* Hse optimized AES CMAC */
#endif

#ifndef CRYPTO_43_HSE_ALGOMODE_CUSTOM_SIPHASH_2_4_128
    #define CRYPTO_43_HSE_ALGOMODE_CUSTOM_SIPHASH_2_4_128          ((uint8)129)  /* SipHash 2-4 variant with tag length 128 bits */
#endif

#ifndef CRYPTO_43_HSE_ALGOMODE_CUSTOM_DRBG_PR
    #define CRYPTO_43_HSE_ALGOMODE_CUSTOM_DRBG_PR                  ((uint8)130)  /* Deterministic Random Bit Generator with prediction resistance */
#endif

#ifndef CRYPTO_43_HSE_ALGOMODE_CUSTOM_DRBG_RS
    #define CRYPTO_43_HSE_ALGOMODE_CUSTOM_DRBG_RS                  ((uint8)131)  /* Deterministic Random Bit Generator with prediction resistance and reseed for each 16 bytes of data */
#endif



/**
* @brief Defines for Crypto Encryption Scheme
* */
#define CRYPTO_43_HSE_ENC_SCHEME_NONE                              ((uint8)0x00U)
#define CRYPTO_43_HSE_ENC_SCHEME_SYM                               ((uint8)0x01U)
#define CRYPTO_43_HSE_ENC_SCHEME_AEAD                              ((uint8)0x02U)
#define CRYPTO_43_HSE_ENC_SCHEME_RSA                               ((uint8)0x03U)

/**
* @brief Defines for Crypto Authentication Scheme
* */
#define CRYPTO_43_HSE_AUTH_SCHEME_NONE                             ((uint8)0x00U)
#define CRYPTO_43_HSE_AUTH_SCHEME_MAC                              ((uint8)0x01U)
#define CRYPTO_43_HSE_AUTH_SCHEME_SIGN                             ((uint8)0x02U)

#if (STD_ON == CRYPTO_43_HSE_SPT_ECC)
/**
* @brief Defines for custom data type of hashed input
* */
#define CRYPTO_43_HSE_INPUT_FMT_PLAIN                              ((uint8)0x00U)  /* Plain  input is used */
#define CRYPTO_43_HSE_INPUT_FMT_HASHED                             ((uint8)0x01U)  /* Hashed input is used */
#endif /* (STD_ON == CRYPTO_43_HSE_SPT_ECC) */

/*==================================================================================================
*                                              ENUMS
==================================================================================================*/

/*==================================================================================================
*                                  STRUCTURES AND OTHER TYPEDEFS
==================================================================================================*/

/** @brief Type define used for Crypto Encryption Scheme selection. */
typedef uint8 Crypto_43_HSE_EncSchemeType;
/** @brief Type define used for Crypto Authentication Scheme selection. */
typedef uint8 Crypto_43_HSE_AuthSchemeType;

/** @brief Custom structure used in custom key import. */
typedef struct
{
    struct
    {   /** @brief Crypto Encryption Scheme selection.
         *  @details Includes parameters needed for encryption scheme: NONE,
         *           SYM, AEAD, RSA.
         */
        Crypto_43_HSE_EncSchemeType  SelEncryptionScheme;

        /** @brief   INPUT: Cipher key handle.
         *                  The CipherKeyHandle can only be a provisioning key (#HSE_KF_USAGE_KEY_PROVISION and #HSE_KF_USAGE_DECRYPT flags are set). <br>
         *                  Note that the key handle identifies the cipher scheme below.
         *                  In case of symmetric cipher scheme and authenticated encryption scheme(AEAD) the differentiation is made using the first byte of cipherScheme.
         *                  Must be set to #HSE_INVALID_KEY_HANDLE if not used. */
        hseKeyHandle_t                            CipherKeyHandle;

        /** @brief HSE Cipher scheme.
         *  @details Includes parameters needed for symmetric cipher/RSA encryption and decryption.
         */
        struct
        {
            /** @brief   INPUT: Symmetric cipher scheme. */
            hseSymCipherScheme_t                  SymCipher;
            /** @brief   INPUT: Authenticated encryption scheme (AEAD-GCM/CCM). */
            hseAeadScheme_t                       AeadCipher;
            /** @brief   INPUT: RSA cipher scheme. */
            hseRsaCipherScheme_t                  RsaCipher;
        } EncryptionScheme;
    } Encryption;

    struct
    {
        /** @brief Crypto Authentication Scheme selection.
         *  @details Includes parameters needed for encryption scheme: NONE,
         *           MAC, SIGN.
         */
        Crypto_43_HSE_AuthSchemeType SelAuthenticationScheme;

        /** @brief   INPUT: Authentication key handle (#HSE_KF_USAGE_KEY_PROVISION and #HSE_KF_USAGE_SIGN flags are set).
         *                  Note that the key handle identifies the authentication scheme below.
         *                  Must be set to HSE_INVALID_KEY_HANDLE if not used. */
        hseKeyHandle_t                            AuthKeyHandle;

        /** @brief HSE authentication scheme.
         *  @details Includes parameters needed for authentication.
         */
        struct {
            /** @brief   INPUT: MAC scheme. */
            hseMacScheme_t                        MacScheme;
            /** @brief   INPUT: Signature scheme. */
            hseSignScheme_t                       SignScheme;
        } AuthenticationScheme;

        /** @brief   INPUT when importing: Address(es) to authentication tag.
         *           OUTPUT when exporting: Address of authentication tag.
         *           - For MAC and RSA signature,  only pAuth[0] is used.
         *           - Both pointers are used for (R,S) (ECC or ED25519).
         */
        uint8*                                    pAuthentication[2];

        /** @brief   INPUT when importing: Byte length(s) of the authentication tag(s).
         *           INPUT/OUTPUT when exporting: Used as address(es) for the length(s) (uin16_t values) of the authentication tag.
         *           - For MAC and RSA signature, only authLen[0] is used.
         *           - Both lengths are used for (R,S) (ECC or ED25519).
         */
        uint16                                    au16AuthenticationLength[2];

        /** @brief   INPUT: Address of the key container; includes the key value(s) and other information used to authenticate the key.
         *                  (e.g. TBSCertificate for a X.509 certificate). */
        uint8*                                    pKeyContainer;

        /** @brief   INPUT: The container length.
         *           @note  The container includes only the signed block (without the signature). */
        uint16                                    u16KeyContainerLength;
    } Authentication;

    struct
    {
        /** @brief INPUT when importing key properties
         *              Each cryptographic key material will be based on key properties (info) and key data.
         *         OUTPUT when exporting: Export the key information (see hseKeyInfo_t).
         *              For symmetric keys exported in an authenticated key container, key information MUST be part of the key container.
         *              For symmetric keys exported authenticated with AEAD, key information MUST be part of AAD (see hseAeadScheme_t).
         *              For public keys this parameter is optional. It can be NULL.
         */
        hseKeyInfo_t*                             pKeyInfo;

        /** @brief   INPUT when importing: Pointer to key values.
         *           A asymmetric private key should always be imported together with the public key.
         *           - pKey[0]:
         *              - RSA public modulus n (big-endian).
         *              - ECC the x- and y-coordinate of the public key must be passed one after another
         *                    (the byte length of the stored value of the public key must be twice the byte length of the prime p)
         *              - ED25519 point x.
         *           - pKey[1]:
         *              - RSA public exponent e (big-endian).
         *           - pKey[2]:
         *              - RSA private exponent d (big-endian).
         *              - ECC/ED25519 private scalar (big-endian).
         *              - The symmetric key (e.g AES, HMAC).
         *           OUTPUT when exporting:
         *           - pKey[0]:
         *              - RSA public modulus n.
         *              - ECC the x- and y-coordinate of the public key must be passed one after another
         *                    (the byte length of the stored value of the public key must be twice the byte length of the prime p)
         *              - ED25519 point x.
         *           - pKey[1]:
         *              - RSA public exponent e.
         *           - pKey[2]:
         *              - The symmetric key (e.g AES, HMAC).
         */
        uint8*                                    pKey[3];

        /** @brief   INPUT when importing:
         *                   The length in bytes for the above key values in the same order.
         *                   Note that keyInfo.keyBitLen specifies the key length in bits.
         *           INPUT/OUTPUT when exporting:
         *                   Used as "address of" uint16_t values of the length (in bytes) for the above buffers (INPUT).
         *                   As output, it provides the lengths of the encrypted or unencrypted (only for public) keys.
         *                   Note that the length in bits of the key is specified by hseKeyInfo_t.
         */
        uint16                                    au16KeyLength[3];
    } KeyData;
} Crypto_43_HSE_KeyImportExportType;

/*==================================================================================================
*                                  GLOBAL VARIABLE DECLARATIONS
==================================================================================================*/

/*==================================================================================================
*                                       FUNCTION PROTOTYPES
==================================================================================================*/
#define CRYPTO_43_HSE_START_SEC_CODE
#include "Crypto_43_HSE_MemMap.h"

/**
 * @brief           Format Key Catalogs service.
 * @details         Used to configure the NVM and RAM key catalogs.
 *
 * @param[in]       none
 * @param[inout]    none
 * @param[out]      none
 * @returns         Std_ReturnType
 *                  E_OK: The operation was executed successfully.
 *                  E_NOT_OK: The operation could not be executed successfully.
 *
 * @pre Crypto driver is initialized on the current partition.
 *
 */
Std_ReturnType Crypto_43_HSE_Exts_FormatKeyCatalogs(void);

/**
 * @brief           Sets the timeout for synchronous job requests
 * @details         Sets the timeout for synchronous job requests
 *
 * @param[in]       u32Timeout - Timeout value, based on the configured 'Timeout Counter Type' the value is interpreted as ticks, microseconds or user defined unit.
 *
 * @returns         void
 *
 *
 * @pre Crypto driver is initialized on the current partition.
 *
 */
Std_ReturnType Crypto_43_HSE_Exts_SetSynchronousRequestsTimeout
(
    uint32 u32Timeout
);

/**
 * @brief           SHE boot failure service.
 * @details         Used to impose sanctions during invalid boot.
 *
 * @param[in]       none
 * @returns         Std_ReturnType
 *                  E_OK: The operation was executed successfully.
 *                  E_NOT_OK: The operation could not be executed successfully.
 *
 * @pre Crypto driver is initialized on the current partition.
 *
 */
Std_ReturnType Crypto_43_HSE_Exts_SHE_BootFailure(void);

/**
 * @brief           SHE boot ok service.
 * @details         Used to mark successful boot verification.
 *
 * @param[in]       none
 * @returns         Std_ReturnType
 *                  E_OK: The operation was executed successfully.
 *                  E_NOT_OK: The operation could not be executed successfully.
 *
 * @pre Crypto driver is initialized on the current partition.
 *
 */
Std_ReturnType Crypto_43_HSE_Exts_SHE_BootOk(void);

/**
 * @brief           SHE get status service.
 * @details         Used to return the contents of the status register.
 *
 * @param[out]      pStatus - Pointer to uint8 location where the function will write the SHE status
 * @returns         Std_ReturnType
 *                  E_OK: The operation was executed successfully.
 *                  E_NOT_OK: The operation could not be executed successfully.
 *
 * @pre Crypto driver is initialized on the current partition.
 *
 */
Std_ReturnType Crypto_43_HSE_Exts_SHE_GetStatus
(
    uint8*  pStatus
);

/**
 * @brief           SHE get id service.
 * @details         Used return the identity and the value of the status register protected by a MAC over a challenge and the data.
 *
 * @param[in]       pChallenge - Pointer to a 128-bit buffer where from the challenge will be taken
 * @param[out]      pId        - Pointer to a 128-bit buffer where UID will be stored
 * @param[out]      pSreg      - Pointer to a 8-bit buffer where status register will be stored
 * @param[out]      pMac       - Pointer to a 128-bit buffer where MAC key will be stored
 * @returns         Std_ReturnType
 *                  E_OK: The operation was executed successfully.
 *                  E_NOT_OK: The operation could not be executed successfully.
 *
 * @pre Crypto driver is initialized on the current partition.
 *
 */
Std_ReturnType Crypto_43_HSE_Exts_SHE_GetId
(
    const uint8* pChallenge,
    const uint8* pId,
    const uint8* pSreg,
    const uint8* pMac
);

/**
 * @brief           SHE debug challenge service.
 * @details         Used to generate a 128-bit random challenge output value that is used in conjunction with the DEBUG_AUTH command.
 *
 * @param[out]      pChallenge - Pointer to uint8 location where the output challenge will be stored
 * @returns         Std_ReturnType
 *                  E_OK: The operation was executed successfully.
 *                  E_NOT_OK: The operation could not be executed successfully.
 *
 * @pre Crypto driver is initialized on the current partition.
 *
 */
Std_ReturnType Crypto_43_HSE_Exts_SHE_DebugChal
(
    const uint8* pChallenge
);

/**
 * @brief           SHE debug authorization service.
 * @details         Erases all user keys.
 *
 * @param[in]       pAuthorization - Pointer to uint8 location storing authorization value
 * @returns         Std_ReturnType
 *                  E_OK: The operation was executed successfully.
 *                  E_NOT_OK: The operation could not be executed successfully.
 *
 * @pre Crypto driver is initialized on the current partition.
 *
 */
Std_ReturnType Crypto_43_HSE_Exts_SHE_DebugAuth
(
    const uint8* pAuthorization
);

/**
 * @brief          Miyaguchi-Preneel Compression.
 * @details        One-way compression function used to derive a 128 bit output from a given message
 *
 * @param[in]      pInputKey        Message start address
 * @param[in]      u32InputKeyLen   Message length (bytes) address
 * @param[out]     pResult          Output address
 * @param[in.out]  pResultLen       Message length (bytes) for output buffer
 * @returns        Std_ReturnType
 *                 E_OK: The operation was executed successfully.
 *                 E_NOT_OK: The operation could not be executed successfully.
 *
 * @pre Crypto driver is initialized on the current partition.
 *
*/
Std_ReturnType Crypto_43_HSE_Exts_MPCompression
(
    const uint8*  pInput,
          uint32  u32InputLen,
    const uint8*  pResult,
    const uint32* pResultLen
);

#define CRYPTO_43_HSE_STOP_SEC_CODE
#include "Crypto_43_HSE_MemMap.h"

#ifdef __cplusplus
}
#endif

/** @} */

#endif /* CRYPTO_43_HSE_ASREXTENSION_H */


