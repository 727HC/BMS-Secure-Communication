"""
Validate the backward-compatible BMS management identifier hint in BatteryData_t.

The firmware payload remains 48 bytes. Bytes 44..47 are the existing reserved[4]
area and may carry bmsBindingCode32 = first 32 bits of SHA-256(canonical ID),
stored as little-endian uint32. BMU signs the entire 48-byte payload, so the
hint is covered by signature and dataHash without changing CAN-FD size.
"""

import hashlib
import json
import struct
from datetime import datetime, timezone

PAYLOAD_SIZE = 48
BMS_BINDING_CODE_OFFSET = 44
BMS_MANAGEMENT_ID = "BMS-MGMT-001"
DID = "did:battery:001"
BMS_BINDING_ID = f"{DID}#{BMS_MANAGEMENT_ID}"
SIGNATURE = "a" * 128


def bms_binding_code(identifier: str) -> int:
    digest = hashlib.sha256(identifier.strip().encode("utf-8")).digest()
    return struct.unpack("<I", digest[:4])[0]


def build_payload(binding_code: int = 0) -> bytes:
    data = struct.pack("<f", -3.8)        # current can be negative
    data += struct.pack("<f", 44.4)       # voltage can be positive
    data += struct.pack("<H", 41650)      # soc_u16
    data += struct.pack("<H", 7)          # discharge_cycles
    data += struct.pack("<H", 38760)      # temperature_u16
    data += bytes([123] * 11)             # cell_voltage[11]
    data += bytes([210] * 11)             # cell_soc[11]
    data += struct.pack("<H", 1200)       # timestamp_ms
    data += bytes([0x00, 11])             # status_flags, cell_count
    data += struct.pack("<I", 42)         # freshness_counter
    data += struct.pack("<I", binding_code & 0xFFFFFFFF)
    assert len(data) == PAYLOAD_SIZE
    return data


def agent_post_payload(raw_payload: bytes) -> dict:
    return {
        "did": DID,
        "rawPayload": raw_payload.hex(),
        "signature": SIGNATURE,
    }


def binding_evidence_hash(binding_code: int) -> str:
    evidence = {
        "bmsBindingCode32": f"0x{binding_code:08x}",
        "bmsBindingId": BMS_BINDING_ID,
        "bmsManagementId": BMS_MANAGEMENT_ID,
    }
    canonical = json.dumps(evidence, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def main() -> None:
    legacy = build_payload()
    assert legacy[BMS_BINDING_CODE_OFFSET:BMS_BINDING_CODE_OFFSET + 4] == b"\x00\x00\x00\x00"

    code = bms_binding_code(BMS_MANAGEMENT_ID)
    payload = build_payload(code)
    assert len(payload) == PAYLOAD_SIZE
    assert struct.unpack("<I", payload[BMS_BINDING_CODE_OFFSET:BMS_BINDING_CODE_OFFSET + 4])[0] == code

    data_hash = hashlib.sha256(payload).hexdigest()
    evidence_hash = binding_evidence_hash(code)
    assert len(data_hash) == 64
    assert len(evidence_hash) == 64
    assert len(agent_post_payload(payload)["rawPayload"]) == PAYLOAD_SIZE * 2
    assert len(agent_post_payload(payload)["signature"]) == 128

    sample = {
        "bmsManagementId": BMS_MANAGEMENT_ID,
        "bmsBindingId": BMS_BINDING_ID,
        "bmsBindingCode32": f"0x{code:08x}",
        "agentPostBody": agent_post_payload(payload),
        "agentDerived": {
            "dataHash": data_hash,
            "timestampExample": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        },
        "chaincodeBinding": {
            "function": "BindBMSIdentifier",
            "bmsManagementId": BMS_MANAGEMENT_ID,
            "bmsBindingId": BMS_BINDING_ID,
            "evidenceHash": evidence_hash,
        },
    }
    print(json.dumps(sample, indent=2, sort_keys=True))
    print("BMS identifier payload test: PASS")


if __name__ == "__main__":
    main()
