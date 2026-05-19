#!/usr/bin/env python3
"""
Payload Encryption - Protocol Verification Test
Simulates CMU encrypt-then-MAC → BMU verify-then-decrypt flow.
Validates AES-128-CBC + CMAC with FC-derived IV matches firmware logic.
"""
import struct
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.cmac import CMAC


AES_KEY_SIZE = 16
BATTERY_DATA_SIZE = 48
FC_SIZE = 4


def build_cbc_iv(fc: int) -> bytes:
    """IV = FC(4B, big-endian) zero-padded to 16B - matches BMS_BuildCbcIv()"""
    iv = struct.pack(">I", fc) + b"\x00" * 12
    return iv


def build_cmac_input(fc: int, data: bytes) -> bytes:
    """FC(4B, big-endian) || Data(48B) - matches BMS_BuildCmacInput()"""
    return struct.pack(">I", fc) + data


def aes_cbc_encrypt(key: bytes, iv: bytes, plaintext: bytes) -> bytes:
    """AES-128-CBC encrypt - matches CMU_AesCbcEncrypt()"""
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    enc = cipher.encryptor()
    return enc.update(plaintext) + enc.finalize()


def aes_cbc_decrypt(key: bytes, iv: bytes, ciphertext: bytes) -> bytes:
    """AES-128-CBC decrypt - matches BMU_AesCbcDecrypt()"""
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    dec = cipher.decryptor()
    return dec.update(ciphertext) + dec.finalize()


def cmac_generate(key: bytes, data: bytes) -> bytes:
    """AES-128 CMAC - matches CMU_GenerateCmac() / BMU_CmacVerify()"""
    c = CMAC(algorithms.AES(key))
    c.update(data)
    return c.finalize()


def cmac_verify(key: bytes, data: bytes, tag: bytes) -> bool:
    """CMAC verify - matches BMU_CmacVerify()"""
    c = CMAC(algorithms.AES(key))
    c.update(data)
    try:
        c.verify(tag)
        return True
    except Exception:
        return False


def test_encrypt_then_mac():
    """Full protocol test: CMU encrypt-then-MAC → BMU verify-then-decrypt"""
    # Simulate session key (derived from KDF in real firmware)
    session_key = os.urandom(AES_KEY_SIZE)

    # Simulate battery data (48B, 16B-aligned → no padding needed)
    plaintext = os.urandom(BATTERY_DATA_SIZE)
    assert len(plaintext) % 16 == 0, "48B must be 16B-aligned for CBC"

    print(f"Session key:  {session_key.hex()}")
    print(f"Plaintext:    {plaintext[:16].hex()}... ({len(plaintext)}B)")

    for fc in [1, 2, 100, 0xFFFFFFFF]:
        print(f"\n--- FC={fc} ---")

        # === CMU side (encrypt-then-MAC) ===
        iv = build_cbc_iv(fc)
        ciphertext = aes_cbc_encrypt(session_key, iv, plaintext)
        cmac_input = build_cmac_input(fc, ciphertext)  # CMAC over ciphertext
        mac_tag = cmac_generate(session_key, cmac_input)

        # CAN FD frame: [ciphertext(48B) | CMAC(16B)] = 64B
        can_frame = ciphertext + mac_tag
        assert len(can_frame) == 64, f"CAN FD frame must be 64B, got {len(can_frame)}"
        print(f"  IV:         {iv.hex()}")
        print(f"  Ciphertext: {ciphertext[:16].hex()}...")
        print(f"  CMAC:       {mac_tag.hex()}")

        # === BMU side (verify-then-decrypt) ===
        rx_cipher = can_frame[:BATTERY_DATA_SIZE]
        rx_mac = can_frame[BATTERY_DATA_SIZE:]

        # 1. CMAC verify (on ciphertext)
        verify_input = build_cmac_input(fc, rx_cipher)
        assert cmac_verify(session_key, verify_input, rx_mac), "CMAC verify FAILED"
        print(f"  CMAC verify: PASS")

        # 2. CBC decrypt
        rx_iv = build_cbc_iv(fc)
        decrypted = aes_cbc_decrypt(session_key, rx_iv, rx_cipher)
        assert decrypted == plaintext, "Decrypt mismatch!"
        print(f"  Decrypted:  {decrypted[:16].hex()}... MATCH")


def test_tamper_detection():
    """Verify that tampered ciphertext is rejected by CMAC"""
    session_key = os.urandom(AES_KEY_SIZE)
    plaintext = os.urandom(BATTERY_DATA_SIZE)
    fc = 42

    iv = build_cbc_iv(fc)
    ciphertext = aes_cbc_encrypt(session_key, iv, plaintext)
    cmac_input = build_cmac_input(fc, ciphertext)
    mac_tag = cmac_generate(session_key, cmac_input)

    # Tamper with 1 byte of ciphertext
    tampered = bytearray(ciphertext)
    tampered[0] ^= 0xFF
    tampered = bytes(tampered)

    verify_input = build_cmac_input(fc, tampered)
    assert not cmac_verify(session_key, verify_input, mac_tag), \
        "Tampered data should FAIL CMAC"
    print("\n--- Tamper detection: PASS (tampered ciphertext rejected) ---")


def test_iv_uniqueness():
    """Verify different FCs produce different ciphertexts for same plaintext"""
    session_key = os.urandom(AES_KEY_SIZE)
    plaintext = os.urandom(BATTERY_DATA_SIZE)

    ciphertexts = set()
    for fc in range(100):
        iv = build_cbc_iv(fc)
        ct = aes_cbc_encrypt(session_key, iv, plaintext)
        ciphertexts.add(ct)

    assert len(ciphertexts) == 100, "All ciphertexts must be unique"
    print(f"\n--- IV uniqueness: PASS (100 unique ciphertexts for same plaintext) ---")


def test_legacy_compatibility():
    """Verify PAYLOAD_ENCRYPTION_ENABLED=0 path (plaintext + CMAC)"""
    session_key = os.urandom(AES_KEY_SIZE)
    plaintext = os.urandom(BATTERY_DATA_SIZE)
    fc = 7

    # Legacy: CMAC over plaintext
    cmac_input = build_cmac_input(fc, plaintext)
    mac_tag = cmac_generate(session_key, cmac_input)

    can_frame = plaintext + mac_tag
    assert len(can_frame) == 64

    # Verify
    verify_input = build_cmac_input(fc, plaintext)
    assert cmac_verify(session_key, verify_input, mac_tag)
    print(f"\n--- Legacy compatibility (plaintext+CMAC): PASS ---")


if __name__ == "__main__":
    print("=" * 60)
    print("Payload Encryption - Protocol Verification")
    print("=" * 60)

    test_encrypt_then_mac()
    test_tamper_detection()
    test_iv_uniqueness()
    test_legacy_compatibility()

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED")
    print("=" * 60)
