/**
 * @file    cmu_board.h
 * @brief   CMU Board Configuration - S32K144 (S32K144EVB-Q100)
 * @details Hardware-specific register addresses, pin mappings, and clock settings.
 *          Separates board-level config from application logic in main.c.
 */

#ifndef CMU_BOARD_H
#define CMU_BOARD_H

#include <stdint.h>

/*============================================================================
 *  PCC (Peripheral Clock Control)
 *============================================================================*/
#define PCC_PORTD_ADDR          (*(volatile uint32 *)0x40065130u)
#define PCC_PORTE_ADDR          (*(volatile uint32 *)0x40065124u)
#define PCC_FLEXCAN0_ADDR       (*(volatile uint32 *)0x40065090u)
#define PCC_CGC_BIT             (1u << 30)
#define PCC_PCS_FIRCDIV2        (3u << 24)

/*============================================================================
 *  PORT Pin Mux
 *============================================================================*/
#define PORTD_PCR_BASE          ((volatile uint32 *)0x4004C000u)
#define PORTE_PCR_BASE          ((volatile uint32 *)0x4004D000u)
#define PORT_MUX_GPIO           (1u << 8)

/*============================================================================
 *  GPIO
 *============================================================================*/
#define GPIOD_PDDR              (*(volatile uint32 *)0x400FF0D4u)
#define GPIOD_PTOR              (*(volatile uint32 *)0x400FF0CCu)
#define GPIOE_PDDR              (*(volatile uint32 *)0x400FF114u)
#define GPIOE_PDOR              (*(volatile uint32 *)0x400FF100u)

/*============================================================================
 *  Board Pin Assignments (S32K144EVB-Q100)
 *============================================================================*/
#define LED_RED_PIN             15u     /* PTD15 = RED LED */
#define CAN_TRCV_EN_PIN         11u     /* PTE11 = CAN transceiver enable */

/*============================================================================
 *  LPUART1 Registers (bare-metal, data input from dataProcess.py)
 *  Clock source: FIRCDIV2 = 48MHz
 *============================================================================*/
#define LPUART1_BASE_ADDR      0x4006B000U
#define LPUART1_BAUD_REG       (*(volatile uint32 *)(LPUART1_BASE_ADDR + 0x10U))
#define LPUART1_STAT_REG       (*(volatile uint32 *)(LPUART1_BASE_ADDR + 0x14U))
#define LPUART1_CTRL_REG       (*(volatile uint32 *)(LPUART1_BASE_ADDR + 0x18U))
#define LPUART1_DATA_REG       (*(volatile uint32 *)(LPUART1_BASE_ADDR + 0x1CU))

/* LPUART register bits */
#define LPUART_RDRF             (1U << 21U)     /* RX Data Register Full */
#define LPUART_TDRE             (1U << 23U)     /* TX Data Register Empty */
#define LPUART_CTRL_RE          (1U << 18U)     /* Receiver Enable */
#define LPUART_CTRL_TE          (1U << 19U)     /* Transmitter Enable */

/* LPUART1 baud: 9615 @ FIRCDIV2=48MHz, OSR=15, SBR=312 */
#define LPUART1_OSR_VALUE       15U
#define LPUART1_SBR_VALUE       312U

/*============================================================================
 *  CSEc Configuration
 *============================================================================*/
#define CSEC_TIMEOUT_TICKS      TIMEOUT_CRYPTO_INIT

/* FlexNVM partition settings for CSEc key storage */
#if defined(S32K148)
    #define FLEXNVM_DEPART      (0x04U)
#elif (defined(S32K116) || defined(S32K118))
    #define FLEXNVM_DEPART      (0x09U)
#else
    #define FLEXNVM_DEPART      (0x03U)
#endif

#if (defined(S32K142W) || defined(S32K144W))
    #define CSEC_KEY_SIZE_CFG   (0x07U)
#else
    #define CSEC_KEY_SIZE_CFG   (0x03U)
#endif

#if (defined(S32K116) || defined(S32K118))
    #define FLEXNVM_EEPROM      (0x03U)
#else
    #define FLEXNVM_EEPROM      (0x02U)
#endif

/* CSEc flash register access */
#if (STD_ON == CSEC_IP_FTFM_MODULE)
    #define CMU_FCNFG_RAMRDY    FTFM_FCNFG_RAMRDY_MASK
    #define CMU_FCNFG_EEERDY    FTFM_FCNFG_EEERDY_MASK
    #define CMU_MGSTAT0_MASK    FTFM_FSTAT_MGSTAT0_MASK
#else
    #define CMU_FCNFG_RAMRDY    FTFC_FCNFG_RAMRDY_MASK
    #define CMU_FCNFG_EEERDY    FTFC_FCNFG_EEERDY_MASK
    #define CMU_MGSTAT0_MASK    FTFC_FSTAT_MGSTAT0_MASK
#endif

#define CMU_RAMRDY_SET          ((CSEC_IP_FLASH->FCNFG & CMU_FCNFG_RAMRDY) != 0U)
#define CMU_EEERDY_SET          ((CSEC_IP_FLASH->FCNFG & CMU_FCNFG_EEERDY) != 0U)

/*============================================================================
 *  Misc
 *============================================================================*/
#define PORTC_INSTANCE          2U      /* Port C for button interrupts */
#define UART_INSTANCE           1U      /* LPUART instance index */

#endif /* CMU_BOARD_H */
