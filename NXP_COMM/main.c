/*
*   (c) Copyright 2020 NXP
*
*   NXP Confidential. This software is owned or controlled by NXP and may only be used strictly
*   in accordance with the applicable license terms.  By expressly accepting
*   such terms or by downloading, installing, activating and/or otherwise using
*   the software, you are agreeing that you have read, and that you agree to
*   comply with and are bound by, such license terms.  If you do not agree to
*   be bound by the applicable license terms, then you may not retain,
*   install, activate or otherwise use the software.
*
*   This file contains sample code only. It is not part of the production code deliverables.
*/

#ifdef __cplusplus
extern "C" {
#endif

/*==================================================================================================
*                                        INCLUDE FILES
* 1) system and project includes
* 2) needed interfaces from external units
* 3) internal and external interfaces from this unit
==================================================================================================*/
#include "Hse_Ip.h"
#include "OsIf.h"
#include "Devassert.h"
#include "check_example.h"
#include "hse_interface.h"
#include <string.h>

/*==================================================================================================
*                          LOCAL TYPEDEFS (STRUCTURES, UNIONS, ENUMS)
==================================================================================================*/

/*==================================================================================================
*                                       LOCAL MACROS
==================================================================================================*/
#define MU0_INSTANCE_U8                     ((uint8)0U        )
#define APP_MU_INSTANCE_U8                  (MU0_INSTANCE_U8  )
#define TIMEOUT_TICKS_U32                   ((uint32)10000000U)
#define BITS_TO_BYTES(bitLen)               ((((bitLen) + 7UL) >> 3UL))
#define HSE_DEMO_NVM_ECC_KEY_HANDLE         GET_KEY_HANDLE(HSE_KEY_CATALOG_ID_NVM, 0, 0)
#define ARRAY_SIZE(x)                       (sizeof(x) / sizeof((x)[0]))

/*==================================================================================================
*                                      LOCAL CONSTANTS
==================================================================================================*/
#define CRYPTO_START_SEC_CONST_UNSPECIFIED
#include "Crypto_MemMap.h"

const hseKeyGroupCfgEntry_t Hse_aNvmKeyCatalog[] =
{
    {HSE_ALL_MU_MASK, HSE_KEY_OWNER_CUST, HSE_KEY_TYPE_ECC_PAIR, 3U, HSE_KEY521_BITS, {0U}},
    {0U             , 0U                , 0U                   , 0U, 0U             , {0U}}
};

const hseKeyGroupCfgEntry_t Hse_aRamKeyCatalog[] =
{
	{HSE_ALL_MU_MASK, HSE_KEY_OWNER_ANY , HSE_KEY_TYPE_ECC_PAIR, 3U, HSE_KEY521_BITS, {0U}},
	{0U             , 0U                , 0U                   , 0U, 0U             , {0U}}
};




const uint8_t eccP256PubKey[] =
{ 0x3d, 0x40, 0x17, 0xc3, 0xe8, 0x43, 0x89, 0x5a, 0x92, 0xb7, 0x0a, 0xa7, 0x4d, 0x1b, 0x7e, 0xbc,
  0x9c, 0x98, 0x2c, 0xcf, 0x2e, 0xc4, 0x96, 0x8c, 0xc0, 0xcd, 0x55, 0xf1, 0x2a, 0xf4, 0x66, 0x0c
};
const uint16_t eccP256PubKeyLen = ARRAY_SIZE(eccP256PubKey);

const uint8_t eccP256PrivKey[] =
{ 0x4c, 0xcd, 0x08, 0x9b, 0x28, 0xff, 0x96, 0xda, 0x9d, 0xb6, 0xc3, 0x46, 0xec, 0x11, 0x4e, 0x0f,
  0x5b, 0x8a, 0x31, 0x9f, 0x35, 0xab, 0xa6, 0x24, 0xda, 0x8c, 0xf6, 0xed, 0x4f, 0xb8, 0xa6, 0xfb
};
const uint16_t eccP256PrivKeyLen = ARRAY_SIZE(eccP256PrivKey);

const uint8_t plainText128_0[] =
{
  0x72
};
const uint16_t plainText128Len_0 = ARRAY_SIZE(plainText128_0);






const uint8_t eddsaContext128_0[] =
{
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
};
const uint16_t eddsaContextLen128_0 = ARRAY_SIZE(eddsaContext128_0);

#define CRYPTO_STOP_SEC_CONST_UNSPECIFIED
#include "Crypto_MemMap.h"

/*==================================================================================================
*                                      LOCAL VARIABLES
==================================================================================================*/
static Hse_Ip_MuStateType HseIp_MuState;
static Hse_Ip_ReqType HseIp_aRequest[HSE_NUM_OF_CHANNELS_PER_MU];
static uint8_t signR[256] = {0};
static uint8_t signS[256] = {0};
static uint32_t signRLen  = ARRAY_SIZE(signR);
static uint32_t signSLen  = ARRAY_SIZE(signS);

/*==================================================================================================
*                                      GLOBAL CONSTANTS
==================================================================================================*/


/*==================================================================================================
*                                      GLOBAL VARIABLES
==================================================================================================*/
#define CRYPTO_START_SEC_VAR_SHARED_CLEARED_UNSPECIFIED_NO_CACHEABLE
#include "Crypto_MemMap.h"
hseSrvDescriptor_t   Hse_aSrvDescriptor[HSE_NUM_OF_CHANNELS_PER_MU];
#define CRYPTO_STOP_SEC_VAR_SHARED_CLEARED_UNSPECIFIED_NO_CACHEABLE
#include "Crypto_MemMap.h"

#define CRYPTO_START_SEC_VAR_CLEARED_UNSPECIFIED_NO_CACHEABLE
#include "Crypto_MemMap.h"
uint32_t        gKeySecCount        = 0UL;
hseKeyInfo_t    gKeyInfo            = {0U};
hseSignScheme_t gSignScheme         = {0U};
uint8_t         gEccP256PubKey[32]  = {0U};
uint8_t         gEccP256PrivKey[32] = {0U};
#define CRYPTO_STOP_SEC_VAR_CLEARED_UNSPECIFIED_NO_CACHEABLE
#include "Crypto_MemMap.h"

/*==================================================================================================
*                                   LOCAL FUNCTION PROTOTYPES
==================================================================================================*/
void MemCpy8
(
    uint8*       pu8Dest,
    const uint8* pu8Source,
    uint32       u32Size
);
void SwapArrayBytes
(
	uint8* pu8Source,
	uint32 u32ByteLen
);
uint32_t KeyBitLen(uint32_t eccCurveId);
hseSrvResponse_t HSE_EraseKeys(void);
hseSrvResponse_t HSE_FormatHseKeyCatalogs(void);
hseSrvResponse_t HSE_ImportFormattedEccKeyReq
(
	hseKeyHandle_t targetKeyHandle,
	hseKeyType_t keyType,
	hseKeyFlags_t keyFlags,
	hseEccCurveId_t eccCurveId,
	uint16_t keyBitLength,
	hseEccKeyFormat_t keyFormat,
	const uint8_t* pPubKey,
	const uint8_t* pPrivKey
);
hseSrvResponse_t HSE_EddsaSign
(
	hseAccessMode_t accessMode,
    hseKeyHandle_t keyHandle,
	uint32_t inputLength,
    const uint8_t* pInput,
	bool_t bInputIsHashed,
	hseSGTOption_t sgtOption,
    uint32_t* pSignatureLength0,
	uint8_t* pSignature0,
    uint32_t* pSignatureLength1,
	uint8_t* pSignature1
);
hseSrvResponse_t HSE_EddsaVerify
(
	hseAccessMode_t accessMode,
    hseKeyHandle_t keyHandle,
	uint32_t inputLength,
    const uint8_t* pInput,
	bool_t bInputIsHashed,
	hseSGTOption_t sgtOption,
	const uint32_t* pSignatureLength0,
	const uint8_t* pSignature0,
	const uint32_t* pSignatureLength1,
	const uint8_t* pSignature1
);

/*==================================================================================================
*                                       LOCAL FUNCTIONS
==================================================================================================*/
void MemCpy8
(
    uint8*       pu8Dest,
    const uint8* pu8Source,
    uint32       u32Size
)
{
    if((NULL_PTR != pu8Dest) && (NULL_PTR != pu8Source))
    {
        uint32 u32Index;

        for(u32Index = 0; u32Index < u32Size; u32Index++)
        {
            pu8Dest[u32Index] = pu8Source[u32Index];
        }
    }
    else
    {

    }
}

void SwapArrayBytes
(
	uint8_t *pu8Source,
	uint32_t u32ByteLen
)
{
	uint32_t u32Start = (uint32_t)0U;
    uint32_t u32End   = u32ByteLen - 1U ;
    uint8_t  u8Temp   = (uint8_t)0U;

    if ((NULL_PTR != pu8Source) && ((uint32_t)0U != u32ByteLen))
    {
        while (u32Start < u32End)
        {
            u8Temp              = pu8Source[u32Start];
            pu8Source[u32Start] = pu8Source[u32End];
            pu8Source[u32End]   = u8Temp;
            u32Start++;
            u32End--;
        }
    }
}

uint32_t KeyBitLen(uint32_t eccCurveId)
{
    switch(eccCurveId)
    {
        #ifdef HSE_SPT_EC_SEC_SECP256R1
        case HSE_EC_SEC_SECP256R1:
            return 256UL;
        #endif

        #ifdef HSE_SPT_EC_SEC_SECP384R1
        case HSE_EC_SEC_SECP384R1:
            return 384UL;
        #endif

        #ifdef HSE_SPT_EC_SEC_SECP521R1
        case HSE_EC_SEC_SECP521R1:
            return 521UL;
        #endif

        #ifdef HSE_SPT_EC_BRAINPOOL_BRAINPOOLP256R1
        case HSE_EC_BRAINPOOL_BRAINPOOLP256R1:
            return 256UL;
        #endif

        #ifdef HSE_SPT_EC_BRAINPOOL_BRAINPOOLP320R1
        case HSE_EC_BRAINPOOL_BRAINPOOLP320R1:
            return 320UL;
        #endif

        #ifdef HSE_SPT_EC_BRAINPOOL_BRAINPOOLP384R1
        case HSE_EC_BRAINPOOL_BRAINPOOLP384R1:
            return 384UL;
        #endif

        #ifdef HSE_SPT_EC_BRAINPOOL_BRAINPOOLP512R1
        case HSE_EC_BRAINPOOL_BRAINPOOLP512R1:
            return 512UL;
        #endif

        #ifdef HSE_SPT_EC_25519_ED25519
        case HSE_EC_25519_ED25519:
            return 256UL;
        #endif

        #ifdef HSE_SPT_EC_25519_CURVE25519
        case HSE_EC_25519_CURVE25519:
            return 256UL;
        #endif

        #ifdef HSE_SPT_EC_448_ED448
        case HSE_EC_448_ED448:
            return 456UL;
        #endif

        #ifdef HSE_SPT_EC_448_CURVE448
        case HSE_EC_448_CURVE448:
            return 448UL;
        #endif

        default:
            return 0UL;
    }
}

hseSrvResponse_t HSE_EraseKeys(void)
{
    hseSrvDescriptor_t *pHseSrvDescriptor;
    hseSrvResponse_t    srvResponse = HSE_SRV_RSP_GENERAL_ERROR;
    uint8               u8MuChannel = Hse_Ip_GetFreeChannel(APP_MU_INSTANCE_U8);

    if(HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
		pHseSrvDescriptor = &Hse_aSrvDescriptor[u8MuChannel];

		memset(pHseSrvDescriptor, 0, sizeof(hseSrvDescriptor_t));

		pHseSrvDescriptor->srvId               = HSE_SRV_ID_ERASE_HSE_NVM_DATA;

		HseIp_aRequest[u8MuChannel].eReqType   = HSE_IP_REQTYPE_SYNC;
		HseIp_aRequest[u8MuChannel].u32Timeout = TIMEOUT_TICKS_U32;

		srvResponse = Hse_Ip_ServiceRequest(APP_MU_INSTANCE_U8, u8MuChannel, &HseIp_aRequest[u8MuChannel], pHseSrvDescriptor);
    }

    return srvResponse;
}

hseSrvResponse_t HSE_FormatHseKeyCatalogs(void)
{
    hseSrvDescriptor_t *pHseSrvDescriptor;
    hseSrvResponse_t    srvResponse = HSE_SRV_RSP_GENERAL_ERROR;
    uint8               u8MuChannel = Hse_Ip_GetFreeChannel(APP_MU_INSTANCE_U8);

    if(HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &Hse_aSrvDescriptor[u8MuChannel];

        memset(pHseSrvDescriptor, 0, sizeof(hseSrvDescriptor_t));

        pHseSrvDescriptor->srvId                                         = HSE_SRV_ID_FORMAT_KEY_CATALOGS;
        pHseSrvDescriptor->hseSrv.formatKeyCatalogsReq.pNvmKeyCatalogCfg = HSE_PTR_TO_HOST_ADDR(Hse_aNvmKeyCatalog);
        pHseSrvDescriptor->hseSrv.formatKeyCatalogsReq.pRamKeyCatalogCfg = HSE_PTR_TO_HOST_ADDR(Hse_aRamKeyCatalog);

        HseIp_aRequest[u8MuChannel].eReqType                             = HSE_IP_REQTYPE_SYNC;
        HseIp_aRequest[u8MuChannel].u32Timeout                           = TIMEOUT_TICKS_U32;

        srvResponse = Hse_Ip_ServiceRequest(APP_MU_INSTANCE_U8, u8MuChannel, &HseIp_aRequest[u8MuChannel], pHseSrvDescriptor);
    }

    return srvResponse;
}

hseSrvResponse_t HSE_ImportFormattedEccKeyReq
(
	hseKeyHandle_t targetKeyHandle,
	hseKeyType_t keyType,
	hseKeyFlags_t keyFlags,
	hseEccCurveId_t eccCurveId,
	uint16_t keyBitLength,
	hseEccKeyFormat_t keyFormat,
	const uint8_t* pPubKey,
	const uint8_t* pPrivKey
)
{
    hseSrvDescriptor_t *pHseSrvDescriptor;
    hseSrvResponse_t    srvResponse   = HSE_SRV_RSP_GENERAL_ERROR;
    uint8               u8MuChannel   = Hse_Ip_GetFreeChannel(APP_MU_INSTANCE_U8);
    uint16_t            pubKeyByteLen = BITS_TO_BYTES(keyBitLength);

    if(HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &Hse_aSrvDescriptor[u8MuChannel];

        memset(pHseSrvDescriptor, 0, sizeof(hseSrvDescriptor_t));

        gKeyInfo.keyType                                                  = keyType;
		gKeyInfo.keyFlags                                                 = keyFlags;
		gKeyInfo.specific.eccCurveId                                      = eccCurveId;
		gKeyInfo.keyBitLen                                                = keyBitLength;
		gKeyInfo.keyCounter                                               = 0UL;

        pHseSrvDescriptor->srvId                                          = HSE_SRV_ID_IMPORT_KEY;
        pHseSrvDescriptor->hseSrv.importKeyReq.pKeyInfo                   = (HOST_ADDR)&gKeyInfo;
        pHseSrvDescriptor->hseSrv.importKeyReq.pKey[0]                    = (HOST_ADDR)pPubKey;
        pHseSrvDescriptor->hseSrv.importKeyReq.keyLen[0]                  = pubKeyByteLen;
        pHseSrvDescriptor->hseSrv.importKeyReq.pKey[2]                    = (HOST_ADDR)pPrivKey;
        pHseSrvDescriptor->hseSrv.importKeyReq.keyLen[2]                  = BITS_TO_BYTES(keyBitLength);
        pHseSrvDescriptor->hseSrv.importKeyReq.targetKeyHandle            = targetKeyHandle;
        pHseSrvDescriptor->hseSrv.importKeyReq.cipher.cipherKeyHandle     = HSE_INVALID_KEY_HANDLE;
        pHseSrvDescriptor->hseSrv.importKeyReq.keyContainer.authKeyHandle = HSE_INVALID_KEY_HANDLE;
        pHseSrvDescriptor->hseSrv.importKeyReq.keyFormat.eccKeyFormat     = keyFormat;

        HseIp_aRequest[u8MuChannel].eReqType                              = HSE_IP_REQTYPE_SYNC;
        HseIp_aRequest[u8MuChannel].u32Timeout                            = TIMEOUT_TICKS_U32;

        srvResponse = Hse_Ip_ServiceRequest(APP_MU_INSTANCE_U8, u8MuChannel, &HseIp_aRequest[u8MuChannel], pHseSrvDescriptor);
    }

    return srvResponse;
}

hseSrvResponse_t HSE_EddsaSign
(
	hseAccessMode_t accessMode,
    hseKeyHandle_t keyHandle,
	uint32_t inputLength,
    const uint8_t* pInput,
	bool_t bInputIsHashed,
	hseSGTOption_t sgtOption,
    uint32_t* pSignatureLength0,
	uint8_t* pSignature0,
    uint32_t* pSignatureLength1,
	uint8_t* pSignature1
)
{
    hseSrvDescriptor_t *pHseSrvDescriptor;
    hseSrvResponse_t    srvResponse = HSE_SRV_RSP_GENERAL_ERROR;
    uint8               u8MuChannel = Hse_Ip_GetFreeChannel(APP_MU_INSTANCE_U8);

    if(HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &Hse_aSrvDescriptor[u8MuChannel];

        memset(pHseSrvDescriptor, 0, sizeof(hseSrvDescriptor_t));

        gSignScheme.signSch                                   = HSE_SIGN_EDDSA;
        gSignScheme.sch.eddsa.bHashEddsa                      = FALSE;
        //gSignScheme.sch.eddsa.contextLength                   = eddsaContextLen128_0;
        gSignScheme.sch.eddsa.contextLength                   = 0;
		gSignScheme.sch.eddsa.pContext                        = (HOST_ADDR)eddsaContext128_0;

        pHseSrvDescriptor->srvId                              = HSE_SRV_ID_SIGN;
        pHseSrvDescriptor->hseSrv.signReq.accessMode          = accessMode;
        pHseSrvDescriptor->hseSrv.signReq.signScheme          = gSignScheme;
        pHseSrvDescriptor->hseSrv.signReq.authDir             = HSE_AUTH_DIR_GENERATE;
		pHseSrvDescriptor->hseSrv.signReq.keyHandle           = keyHandle;
		pHseSrvDescriptor->hseSrv.signReq.inputLength         = inputLength;
		pHseSrvDescriptor->hseSrv.signReq.pInput              = (HOST_ADDR)pInput;
		pHseSrvDescriptor->hseSrv.signReq.bInputIsHashed      = bInputIsHashed;
		pHseSrvDescriptor->hseSrv.signReq.sgtOption           = sgtOption;
		pHseSrvDescriptor->hseSrv.signReq.pSignature[0]       = (HOST_ADDR)pSignature0;
		pHseSrvDescriptor->hseSrv.signReq.pSignature[1]       = (HOST_ADDR)pSignature1;
		pHseSrvDescriptor->hseSrv.signReq.pSignatureLength[0] = (HOST_ADDR)pSignatureLength0;
		pHseSrvDescriptor->hseSrv.signReq.pSignatureLength[1] = (HOST_ADDR)pSignatureLength1;

        HseIp_aRequest[u8MuChannel].eReqType                  = HSE_IP_REQTYPE_SYNC;
        HseIp_aRequest[u8MuChannel].u32Timeout                = TIMEOUT_TICKS_U32;

        srvResponse = Hse_Ip_ServiceRequest(APP_MU_INSTANCE_U8, u8MuChannel, &HseIp_aRequest[u8MuChannel], pHseSrvDescriptor);
    }

    return srvResponse;
}

hseSrvResponse_t HSE_EddsaVerify
(
	hseAccessMode_t accessMode,
    hseKeyHandle_t keyHandle,
	uint32_t inputLength,
    const uint8_t* pInput,
	bool_t bInputIsHashed,
	hseSGTOption_t sgtOption,
	const uint32_t* pSignatureLength0,
	const uint8_t* pSignature0,
	const uint32_t* pSignatureLength1,
	const uint8_t* pSignature1
)
{
    hseSrvDescriptor_t *pHseSrvDescriptor;
    hseSrvResponse_t    srvResponse = HSE_SRV_RSP_GENERAL_ERROR;
    uint8               u8MuChannel = Hse_Ip_GetFreeChannel(APP_MU_INSTANCE_U8);

    if(HSE_IP_INVALID_MU_CHANNEL_U8 != u8MuChannel)
    {
        pHseSrvDescriptor = &Hse_aSrvDescriptor[u8MuChannel];

        memset(pHseSrvDescriptor, 0, sizeof(hseSrvDescriptor_t));

        gSignScheme.signSch                                   = HSE_SIGN_EDDSA;
        gSignScheme.sch.eddsa.bHashEddsa                      = FALSE;
        //gSignScheme.sch.eddsa.contextLength                   = eddsaContextLen128_0;
        gSignScheme.sch.eddsa.contextLength                   = 0;
		gSignScheme.sch.eddsa.pContext                        = (HOST_ADDR)eddsaContext128_0;

        pHseSrvDescriptor->srvId                              = HSE_SRV_ID_SIGN;
        pHseSrvDescriptor->hseSrv.signReq.accessMode          = accessMode;
        pHseSrvDescriptor->hseSrv.signReq.signScheme          = gSignScheme;
        pHseSrvDescriptor->hseSrv.signReq.authDir             = HSE_AUTH_DIR_VERIFY;
		pHseSrvDescriptor->hseSrv.signReq.keyHandle           = keyHandle;
		pHseSrvDescriptor->hseSrv.signReq.inputLength         = inputLength;
		pHseSrvDescriptor->hseSrv.signReq.pInput              = (HOST_ADDR)pInput;
		pHseSrvDescriptor->hseSrv.signReq.bInputIsHashed      = bInputIsHashed;
		pHseSrvDescriptor->hseSrv.signReq.sgtOption           = sgtOption;
		pHseSrvDescriptor->hseSrv.signReq.pSignature[0]       = (HOST_ADDR)pSignature0;
		pHseSrvDescriptor->hseSrv.signReq.pSignature[1]       = (HOST_ADDR)pSignature1;
		pHseSrvDescriptor->hseSrv.signReq.pSignatureLength[0] = (HOST_ADDR)pSignatureLength0;
		pHseSrvDescriptor->hseSrv.signReq.pSignatureLength[1] = (HOST_ADDR)pSignatureLength1;

        HseIp_aRequest[u8MuChannel].eReqType                  = HSE_IP_REQTYPE_SYNC;
        HseIp_aRequest[u8MuChannel].u32Timeout                = TIMEOUT_TICKS_U32;

        srvResponse = Hse_Ip_ServiceRequest(APP_MU_INSTANCE_U8, u8MuChannel, &HseIp_aRequest[u8MuChannel], pHseSrvDescriptor);
    }

    return srvResponse;
}

/*==================================================================================================
*                                       GLOBAL FUNCTIONS
==================================================================================================*/
int main(void)
{
    hseStatus_t      HseStatus;
    hseSrvResponse_t HseResponse;

    OsIf_Init(NULL_PTR);

    HseStatus = Hse_Ip_GetHseStatus(APP_MU_INSTANCE_U8);
    DevAssert(0U != (HseStatus & HSE_STATUS_INIT_OK));
    DevAssert(0U != (HseStatus & HSE_STATUS_RNG_INIT_OK));

    Hse_Ip_Init(APP_MU_INSTANCE_U8, &HseIp_MuState);

    HseResponse = HSE_EraseKeys();
    DevAssert(HSE_SRV_RSP_OK == HseResponse);

    HseResponse = HSE_FormatHseKeyCatalogs();
	DevAssert((HSE_SRV_RSP_OK == HseResponse));

	/* Must transfer from little endian to big endian format. */
	MemCpy8(gEccP256PubKey , eccP256PubKey , eccP256PubKeyLen );
	MemCpy8(gEccP256PrivKey, eccP256PrivKey, eccP256PrivKeyLen);
	SwapArrayBytes(gEccP256PubKey , eccP256PubKeyLen );
	SwapArrayBytes(gEccP256PrivKey, eccP256PrivKeyLen);

    HseResponse = HSE_ImportFormattedEccKeyReq(
    		HSE_DEMO_NVM_ECC_KEY_HANDLE,
			HSE_KEY_TYPE_ECC_PAIR,
			(HSE_KF_USAGE_SIGN | HSE_KF_USAGE_VERIFY),
			HSE_EC_25519_ED25519,
			KeyBitLen(HSE_EC_25519_ED25519),
			HSE_KEY_FORMAT_ECC_PUB_RAW,
			gEccP256PubKey,
			gEccP256PrivKey
			);
	DevAssert((HSE_SRV_RSP_OK == HseResponse));

	HseResponse = HSE_EddsaSign(
			HSE_ACCESS_MODE_ONE_PASS,
			HSE_DEMO_NVM_ECC_KEY_HANDLE,
			plainText128Len_0,
			plainText128_0,
			FALSE,
			0U,
	        &signRLen,
			signR,
			&signSLen,
			signS
			);
	DevAssert((HSE_SRV_RSP_OK == HseResponse));

	HseResponse = HSE_EddsaVerify(
			HSE_ACCESS_MODE_ONE_PASS,
			HSE_DEMO_NVM_ECC_KEY_HANDLE,
			plainText128Len_0,
			plainText128_0,
			FALSE,
			0U,
	        &signRLen,
			signR,
			&signSLen,
			signS
			);
	DevAssert((HSE_SRV_RSP_OK == HseResponse));

	while(1)
	{

	}

    return (0U);
}


#ifdef __cplusplus
}
#endif

/** @} */
