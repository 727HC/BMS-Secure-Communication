"""HSE FC counter mock unit tests (Option B / ADR-007).

Simulates HSE service responses for the BMU monotonic-counter logic.
NOT a hardware integration test - validates the 'shape' of the calls
and the read-first guard invariant that prevents NVM wipe.

Status codes mirror BMU firmware (BMU_BMS_S32K344/src/main.c helpers):
- 0x55A5AA33 = HSE_SRV_RSP_OK
- 0x55A5A399 = HSE_SRV_RSP_INVALID_PARAM (counter slot not configured)
- 0x33D6D4F1 = HSE_SRV_RSP_GENERAL_ERROR (transient)
- 0xAA55A21C = HSE_SRV_RSP_NOT_ALLOWED (LC / SU rights)
"""
import unittest


HSE_OK = 0x55A5AA33
HSE_INVALID_PARAM = 0x55A5A399
HSE_GENERAL_ERROR = 0x33D6D4F1
HSE_NOT_ALLOWED = 0xAA55A21C


class MockHSE:
    """Mock HSE that tracks slot 0 counter state."""

    def __init__(self):
        self.configured = False
        self.value = 0
        self.fail_next_n = 0  # for retry tests

    def config(self, slot, rp_bitsize):
        if self.fail_next_n > 0:
            self.fail_next_n -= 1
            return HSE_NOT_ALLOWED
        if slot != 0 or rp_bitsize < 32 or rp_bitsize > 64:
            return HSE_INVALID_PARAM
        # NOTE: real HSE wipes the counter on re-config. Read-first guard
        # in BMU_ConfigureFcCounter prevents this.
        self.configured = True
        self.value = 0
        return HSE_OK

    def read(self, slot):
        if not self.configured:
            return (HSE_INVALID_PARAM, 0)
        if self.fail_next_n > 0:
            self.fail_next_n -= 1
            return (HSE_GENERAL_ERROR, 0)
        return (HSE_OK, self.value)

    def increment(self, slot, value):
        if not self.configured:
            return HSE_INVALID_PARAM
        self.value += value
        return HSE_OK


class TestOptionB(unittest.TestCase):

    def test_config_first_boot(self):
        """First boot: read returns INVALID_PARAM, then config OK, then read=0."""
        hse = MockHSE()
        rsp, val = hse.read(0)
        self.assertEqual(rsp, HSE_INVALID_PARAM)
        rsp = hse.config(0, 40)
        self.assertEqual(rsp, HSE_OK)
        rsp, val = hse.read(0)
        self.assertEqual((rsp, val), (HSE_OK, 0))

    def test_idempotent_via_read_first(self):
        """Re-running 'BMU_ConfigureFcCounter' logic on already-configured counter
        must NOT call config (which would wipe). Test the read-first guard."""
        hse = MockHSE()
        hse.config(0, 40)
        hse.increment(0, 5)
        # Simulate BMU_ConfigureFcCounter logic:
        rsp, val = hse.read(0)
        if rsp == HSE_OK:
            pass  # skip config - correct path
        else:
            hse.config(0, 40)  # would wipe - wrong path
        rsp, val = hse.read(0)
        self.assertEqual(val, 5)  # NOT wiped

    def test_per_frame_increment(self):
        """1000 increments correctly accumulate (Mode 1 per-frame)."""
        hse = MockHSE()
        hse.config(0, 40)
        for _ in range(1000):
            hse.increment(0, 1)
        rsp, val = hse.read(0)
        self.assertEqual((rsp, val), (HSE_OK, 1000))

    def test_read_retry_recovers(self):
        """BMU_ReadFcCounter 3-retry recovers after 2 transient failures."""
        hse = MockHSE()
        hse.config(0, 40)
        hse.fail_next_n = 2
        rsp = None
        for _ in range(3):
            rsp, val = hse.read(0)
            if rsp == HSE_OK:
                break
        self.assertEqual(rsp, HSE_OK)

    def test_read_halts_after_3_fails(self):
        """Persistent failure -> caller would halt (read never returns OK)."""
        hse = MockHSE()
        hse.config(0, 40)
        hse.fail_next_n = 5
        rsp = None
        for _ in range(3):
            rsp, val = hse.read(0)
        self.assertNotEqual(rsp, HSE_OK)


if __name__ == "__main__":
    unittest.main()
