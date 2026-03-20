/**
 * @file    bmu_board.h
 * @brief   BMU Board Configuration - S32K344 (S32K3X4EVB-Q172)
 * @details Hardware-specific register addresses, pin mappings, and clock settings.
 *          Separates board-level config from application logic in main.c.
 */

#ifndef BMU_BOARD_H
#define BMU_BOARD_H

#include <stdint.h>

/*============================================================================
 *  S32K344 FlexCAN0 Registers
 *============================================================================*/
#define S32K344_FLEXCAN0_ESR1   (*(volatile uint32 *)0x40304020U)
#define S32K344_FLEXCAN0_ECR    (*(volatile uint32 *)0x40304024U)

/*============================================================================
 *  LPUART6 Registers (OpenSDA Virtual COM on S32K3X4EVB-Q172)
 *  PTA16 = LPUART6_TX
 *  Clock source: FIRC 48MHz / PCC divider
 *============================================================================*/
#define LPUART6_BASE            0x40340000U
#define LPUART6_BAUD            (*(volatile uint32 *)(LPUART6_BASE + 0x10U))
#define LPUART6_STAT            (*(volatile uint32 *)(LPUART6_BASE + 0x14U))
#define LPUART6_CTRL            (*(volatile uint32 *)(LPUART6_BASE + 0x18U))
#define LPUART6_DATA            (*(volatile uint32 *)(LPUART6_BASE + 0x1CU))

/* LPUART6 baud: 28800 @ 48MHz/4=12MHz, OSR=15, SBR=26 */
#define LPUART6_OSR_VALUE       15U
#define LPUART6_SBR_VALUE       26U

/*============================================================================
 *  LPUART Register Bits (common to all LPUART instances)
 *============================================================================*/
#define LPUART_BAUD_SBR_MASK    0x1FFFU
#define LPUART_BAUD_OSR_SHIFT   24U
#define LPUART_BAUD_OSR_MASK    (0x1FU << LPUART_BAUD_OSR_SHIFT)
#define LPUART_CTRL_TE          (1U << 19U)     /* Transmitter Enable */
#define LPUART_CTRL_RE          (1U << 18U)     /* Receiver Enable */
#define LPUART_STAT_TDRE        (1U << 23U)     /* TX Data Register Empty */
#define LPUART_STAT_TC          (1U << 22U)     /* Transmission Complete */

/*============================================================================
 *  SIUL2 (System Integration Unit Lite2) - Pin Muxing
 *  S32K344: SIUL2_0 base = 0x40290000, MSCR offset = 0x240
 *============================================================================*/
#define SIUL2_MSCR(n)           (*(volatile uint32 *)(0x40290000U + 0x240U + 4U * (n)))
#define SIUL2_MSCR_OBE          (1U << 21U)     /* Output Buffer Enable */
#define SIUL2_MSCR_SRE          (1U << 14U)     /* Slew Rate Enable */
#define LPUART6_TX_PIN          16U             /* PTA16 */
#define LPUART6_TX_SSS          5U              /* PTA16 ALT5 = LPUART6_TX */

/*============================================================================
 *  MC_ME (Mode Entry Module) - Clock Gating
 *============================================================================*/
#define MC_ME_BASE              0x402DC000U
#define MC_ME_PRTN1_PCONF       (*(volatile uint32 *)(MC_ME_BASE + 0x300U))
#define MC_ME_PRTN1_PUPD        (*(volatile uint32 *)(MC_ME_BASE + 0x304U))
#define MC_ME_PRTN1_COFB2_STAT  (*(volatile uint32 *)(MC_ME_BASE + 0x318U))
#define MC_ME_PRTN1_COFB2_CLKEN (*(volatile uint32 *)(MC_ME_BASE + 0x338U))
#define MC_ME_CTL_KEY           (*(volatile uint32 *)(MC_ME_BASE + 0x000U))
/* S32K344: both key writes go to same register at offset 0x000 */
#define MC_ME_CTL_KEY_INV       (*(volatile uint32 *)(MC_ME_BASE + 0x000U))
#define MC_ME_KEY               0x5AF0U
#define MC_ME_KEY_INV           0xA50FU

/* LPUART6 = PRTN1_COFB2_REQ80 → bit (80-64) = bit 16 */
#define MC_ME_LPUART6_REQ_BIT   (1U << 16U)

/*============================================================================
 *  DWT Cycle Counter (Cortex-M7 Performance Measurement)
 *============================================================================*/
#define DWT_CTRL                (*(volatile uint32 *)0xE0001000U)
#define DWT_CYCCNT              (*(volatile uint32 *)0xE0001004U)
#define DEM_CR                  (*(volatile uint32 *)0xE000EDFCU)

static inline void DWT_Init(void)
{
    DEM_CR   |= (1U << 24U);   /* TRCENA: enable DWT */
    DWT_CYCCNT = 0U;
    DWT_CTRL |= 1U;            /* CYCCNTENA: enable cycle counter */
}

/*============================================================================
 *  HSE Configuration
 *============================================================================*/
#define HSE_MU_INSTANCE         HSE_IP_MU_0
#define HSE_TIMEOUT_TICKS       TIMEOUT_CRYPTO_INIT

/* HSE key handles */
#define HSE_PSK_KEY_HANDLE      ((hseKeyHandle_t)GET_KEY_HANDLE(HSE_KEY_CATALOG_ID_RAM, 0U, 0U))
#define HSE_SESSION_KEY_HANDLE  ((hseKeyHandle_t)GET_KEY_HANDLE(HSE_KEY_CATALOG_ID_RAM, 0U, 1U))
#define HSE_ECC_KEY_HANDLE      ((hseKeyHandle_t)GET_KEY_HANDLE(HSE_KEY_CATALOG_ID_NVM, 1U, 0U))

/*============================================================================
 *  CMU Whitelist Configuration
 *============================================================================*/
#define CMU_WHITELIST_SIZE      4U

#endif /* BMU_BOARD_H */
