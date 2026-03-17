/**
 * @brief Sys_GetCoreID - reads core ID from MSCM peripheral
 */
#include "StandardTypes.h"
#include "S32K344_COMMON.h"
#include "S32K344_MSCM.h"

uint8 Sys_GetCoreID(void)
{
    return (uint8)(IP_MSCM->CPXNUM & MSCM_CPXNUM_CPN_MASK);
}
