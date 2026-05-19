package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-chaincode-go/v2/shim"
	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// ============================================================
// 3. RecordBMUData (ManufacturerMSP or EVManufacturerMSP)
// ============================================================

func (c *PassportContract) RecordBMUData(ctx contractapi.TransactionContextInterface,
	recordId string, passportId string, did string,
	dataHash string, signature string,
	fc string, soc string, voltage string, current string,
	temperature string, cellCount string, statusFlags string,
	dischargeCycles string, timestamp string) error {

	return c.recordBMUData(ctx, recordId, passportId, did, dataHash, signature, fc, soc, voltage, current, temperature, cellCount, statusFlags, dischargeCycles, timestamp, "", false)
}

// ============================================================
// 3-1. RecordBMUDataAutoID — txID-derived record ID to avoid duplicate-key read
// ============================================================

func (c *PassportContract) RecordBMUDataAutoID(ctx contractapi.TransactionContextInterface,
	passportId string, did string,
	dataHash string, signature string,
	fc string, soc string, voltage string, current string,
	temperature string, cellCount string, statusFlags string,
	dischargeCycles string, timestamp string) error {

	stub := ctx.GetStub()
	recordId := stub.GetTxID()
	if recordId == "" {
		return fmt.Errorf("transaction ID is required to derive BMU record ID")
	}
	return c.recordBMUDataAutoID(ctx, stub, recordId, passportId, did, dataHash, signature, fc, soc, voltage, current, temperature, cellCount, statusFlags, dischargeCycles, timestamp)
}

// 3-2. RecordBMUDataWithPayload — 48B rawPayload hash + BMS binding 검증
// ============================================================

func (c *PassportContract) RecordBMUDataWithPayload(ctx contractapi.TransactionContextInterface,
	recordId string, passportId string, did string,
	dataHash string, signature string,
	fc string, soc string, voltage string, current string,
	temperature string, cellCount string, statusFlags string,
	dischargeCycles string, timestamp string, rawPayloadHex string) error {

	return c.recordBMUData(ctx, recordId, passportId, did, dataHash, signature, fc, soc, voltage, current, temperature, cellCount, statusFlags, dischargeCycles, timestamp, rawPayloadHex, true)
}

func (c *PassportContract) recordBMUDataAutoID(ctx contractapi.TransactionContextInterface, stub shim.ChaincodeStubInterface,
	recordId string, passportId string, did string,
	dataHash string, signature string,
	fc string, soc string, voltage string, current string,
	temperature string, cellCount string, statusFlags string,
	dischargeCycles string, timestamp string) error {

	// The AutoID path uses the txID-derived record ID path. Keep it separate
	// from legacy/payload writes so normal BMU ingest avoids duplicate-record and
	// raw-payload branches without changing public chaincode APIs.
	msp, err := c.requireBMUWriterMSPAndGetMSP(ctx)
	if err != nil {
		return err
	}

	if err := validateBMURecordAutoIDInput(passportId, did, dataHash, signature, timestamp); err != nil {
		return err
	}

	fcVal, err := parseUint64Fast(fc)
	if err != nil {
		return fmt.Errorf("invalid fc value: %v", err)
	}

	socVal, voltageVal, currentVal, temperatureVal, cellCountVal, statusFlagsVal, dischargeCyclesVal, commonFields := parseBMUAutoIDConstantFields(soc, voltage, current, temperature, cellCount, statusFlags, dischargeCycles)
	if !commonFields {
		var parseErr error
		socParsed, parseErr := parseUint16CommonFast(soc, "32768", 32768)
		if parseErr != nil {
			return fmt.Errorf("invalid soc value: %v", parseErr)
		}
		socVal = uint16(socParsed)

		voltageVal, parseErr = parseFiniteFloatCommonFast("voltage", voltage, "40.000", 40)
		if parseErr != nil {
			return parseErr
		}

		currentVal, parseErr = parseFiniteFloatCommonFast("current", current, "0.000", 0)
		if parseErr != nil {
			return parseErr
		}

		temperatureParsed, parseErr := parseUint16CommonFast(temperature, "30000", 30000)
		if parseErr != nil {
			return fmt.Errorf("invalid temperature value: %v", parseErr)
		}
		temperatureVal = uint16(temperatureParsed)

		cellCountParsed, parseErr := parseUint8CommonFast(cellCount, "96", 96)
		if parseErr != nil {
			return fmt.Errorf("invalid cellCount value: %v", parseErr)
		}
		cellCountVal = uint8(cellCountParsed)

		statusFlagsParsed, parseErr := parseUint8CommonFast(statusFlags, "0", 0)
		if parseErr != nil {
			return fmt.Errorf("invalid statusFlags value: %v", parseErr)
		}
		statusFlagsVal = uint8(statusFlagsParsed)

		dischargeCyclesParsed, parseErr := parseUint16CommonFast(dischargeCycles, "0", 0)
		if parseErr != nil {
			return fmt.Errorf("invalid dischargeCycles value: %v", parseErr)
		}
		dischargeCyclesVal = uint16(dischargeCyclesParsed)
	}

	// validateBMURecordAutoIDInput already checked DID composite-key safety, so
	// the official AutoID hot path can build the Fabric-compatible lastFc key
	// without re-scanning DID inside commit.
	lastFcKey := lastFCKeyFromValidatedDID(did)
	return c.commitBMURecordAutoID(stub, msp, lastFcKey, recordId, passportId, did, dataHash, signature, fcVal, socVal, voltageVal, currentVal, temperatureVal, cellCountVal, statusFlagsVal, dischargeCyclesVal, timestamp)
}

func (c *PassportContract) recordBMUData(ctx contractapi.TransactionContextInterface,
	recordId string, passportId string, did string,
	dataHash string, signature string,
	fc string, soc string, voltage string, current string,
	temperature string, cellCount string, statusFlags string,
	dischargeCycles string, timestamp string, rawPayloadHex string, requireRawPayload bool) error {

	// BMU 데이터 수집: 배터리 제조사(제조/테스트) + EV 제조사(차량 운행 중) 허용
	msp, err := c.requireBMUWriterMSPAndGetMSP(ctx)
	if err != nil {
		return err
	}

	if err := validateBMURecordInput(recordId, passportId, did, dataHash, signature, timestamp); err != nil {
		return err
	}
	stub := ctx.GetStub()
	existingRecord, err := stub.GetState(recordId)
	if err != nil {
		return fmt.Errorf("failed to check existing record: %v", err)
	}
	if existingRecord != nil {
		return fmt.Errorf("BMU record %s already exists", recordId)
	}

	var bmsBindingCode32 uint32
	rawPayloadHashVerified := false
	if requireRawPayload {
		// Raw payload validation needs the BMS binding fields from the passport.
		passportCheck, err := c.loadPassport(ctx, passportId)
		if err != nil {
			return err
		}
		if passportCheck.DID != did {
			return fmt.Errorf("DID mismatch: passport %s is registered to DID %s, not %s", passportId, passportCheck.DID, did)
		}
		_, payloadCode32, err := validateBMURawPayload(dataHash, rawPayloadHex)
		if err != nil {
			return err
		}
		if err := validateBMSBindingCode(passportCheck, payloadCode32); err != nil {
			return err
		}
		bmsBindingCode32 = payloadCode32
		rawPayloadHashVerified = true
	}

	// Parse fc and check monotonic increase per DID
	fcVal, err := parseUint64Fast(fc)
	if err != nil {
		return fmt.Errorf("invalid fc value: %v", err)
	}

	socVal, err := parseUint16Fast(soc)
	if err != nil {
		return fmt.Errorf("invalid soc value: %v", err)
	}

	voltageVal, err := parseFiniteFloat("voltage", voltage)
	if err != nil {
		return err
	}

	currentVal, err := parseFiniteFloat("current", current)
	if err != nil {
		return err
	}

	temperatureVal, err := parseUint16Fast(temperature)
	if err != nil {
		return fmt.Errorf("invalid temperature value: %v", err)
	}

	cellCountVal, err := parseUint8Fast(cellCount)
	if err != nil {
		return fmt.Errorf("invalid cellCount value: %v", err)
	}

	statusFlagsVal, err := parseUint8Fast(statusFlags)
	if err != nil {
		return fmt.Errorf("invalid statusFlags value: %v", err)
	}

	dischargeCyclesVal, err := parseUint16Fast(dischargeCycles)
	if err != nil {
		return fmt.Errorf("invalid dischargeCycles value: %v", err)
	}

	return c.commitBMURecord(stub, msp, recordId, passportId, did, dataHash, signature, fcVal, uint16(socVal), voltageVal, currentVal, uint16(temperatureVal), uint8(cellCountVal), uint8(statusFlagsVal), uint16(dischargeCyclesVal), bmsBindingCode32, rawPayloadHashVerified, timestamp)
}

func (c *PassportContract) requireNextBMUFC(stub shim.ChaincodeStubInterface, passportId string, did string, fcVal uint64) (string, error) {
	// FC monotonic increase check — reject replay/stale BMU data.
	// Uses a dedicated state key instead of CouchDB rich query for performance.
	// New passports initialize this key with the passport binding, so strict
	// RecordBMUData avoids additional passport/binding GetState on the hot path.
	lastFcKey, err := lastFCKey(did)
	if err != nil {
		return "", fmt.Errorf("failed to create lastFc composite key: %v", err)
	}
	if err := c.requireNextBMUFCForKey(stub, lastFcKey, passportId, did, fcVal); err != nil {
		return "", err
	}
	return lastFcKey, nil
}

func (c *PassportContract) requireNextBMUFCForKey(stub shim.ChaincodeStubInterface, lastFcKey string, passportId string, did string, fcVal uint64) error {
	lastFcBytes, err := stub.GetState(lastFcKey)
	if err != nil {
		return fmt.Errorf("failed to read lastFc for DID %s: %v", did, err)
	}
	if lastFcBytes == nil {
		return fmt.Errorf("missing canonical lastFc binding for DID %s; repair required before recording BMU data", did)
	}
	boundPassportID, lastFcVal, hasLastFC, legacyNumeric, passportMatches, err := decodeLastFCBindingForPassport(lastFcBytes, passportId)
	if err != nil {
		return fmt.Errorf("failed to parse lastFc value: %v", err)
	}
	if legacyNumeric {
		return fmt.Errorf("legacy lastFc binding for DID %s requires repair before recording BMU data", did)
	}
	if !passportMatches {
		return fmt.Errorf("DID mismatch: DID %s is bound to passport %s, not %s", did, boundPassportID, passportId)
	}
	if hasLastFC && fcVal <= lastFcVal {
		return fmt.Errorf("fc %d must be greater than last valid fc %d for DID %s", fcVal, lastFcVal, did)
	}
	return nil
}

func (c *PassportContract) commitBMURecordAutoID(stub shim.ChaincodeStubInterface,
	msp string, lastFcKey string, recordId string, passportId string, did string,
	dataHash string, signature string,
	fcVal uint64, socVal uint16, voltageVal float64, currentVal float64,
	temperatureVal uint16, cellCountVal uint8, statusFlagsVal uint8, dischargeCyclesVal uint16,
	timestamp string) error {

	if err := c.requireNextBMUFCForKey(stub, lastFcKey, passportId, did, fcVal); err != nil {
		return err
	}

	createdAt, tsErr := txTimeFromStub(stub)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}

	recordJSON := marshalBMURecordAutoIDValidFieldsCreatedAtTime(
		recordId, passportId, did, dataHash, signature,
		fcVal, socVal, voltageVal, currentVal,
		temperatureVal, cellCountVal, statusFlagsVal, dischargeCyclesVal,
		timestamp, createdAt, msp,
	)

	if err := stub.PutState(recordId, recordJSON); err != nil {
		return fmt.Errorf("failed to store BMU record: %v", err)
	}

	lastFcValue := encodeLastFCBinding(passportId, fcVal, true)
	if err := stub.PutState(lastFcKey, lastFcValue); err != nil {
		return fmt.Errorf("failed to update lastFc: %v", err)
	}

	return nil
}

func (c *PassportContract) commitBMURecord(stub shim.ChaincodeStubInterface,
	msp string, recordId string, passportId string, did string,
	dataHash string, signature string,
	fcVal uint64, socVal uint16, voltageVal float64, currentVal float64,
	temperatureVal uint16, cellCountVal uint8, statusFlagsVal uint8, dischargeCyclesVal uint16,
	bmsBindingCode32 uint32, rawPayloadHashVerified bool, timestamp string) error {

	lastFcKey, err := c.requireNextBMUFC(stub, passportId, did, fcVal)
	if err != nil {
		return err
	}

	now, tsErr := txTimestampFromStub(stub)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}

	record := BMURecord{
		DocType:                docTypeBMURecord,
		RecordID:               recordId,
		PassportID:             passportId,
		DID:                    did,
		DataHash:               dataHash,
		Signature:              signature,
		FC:                     fcVal,
		SOC:                    socVal,
		Voltage:                voltageVal,
		Current:                currentVal,
		Temperature:            temperatureVal,
		CellCount:              cellCountVal,
		StatusFlags:            statusFlagsVal,
		DischargeCycles:        dischargeCyclesVal,
		BMSBindingCode32:       bmsBindingCode32,
		RawPayloadHashVerified: rawPayloadHashVerified,
		Timestamp:              timestamp,
		Status:                 "VALID",
		CreatedAt:              now,
		CreatorMSP:             msp,
	}

	recordJSON, err := marshalBMURecordState(&record)
	if err != nil {
		return fmt.Errorf("failed to marshal BMU record: %v", err)
	}

	if err := stub.PutState(recordId, recordJSON); err != nil {
		return fmt.Errorf("failed to store BMU record: %v", err)
	}

	// Update lastFc state key for this DID
	if err := stub.PutState(lastFcKey, encodeLastFCBinding(passportId, fcVal, true)); err != nil {
		return fmt.Errorf("failed to update lastFc: %v", err)
	}

	// Snapshot은 cloud-agent block event에서 오프체인 생성 (write-path 최적화: 3 PutState → 2)
	return nil
}

func (c *PassportContract) findLatestValidBMURecordByDID(ctx contractapi.TransactionContextInterface, did string, excludeRecordId string) (*BMURecord, error) {
	query, err := buildQuery(map[string]interface{}{
		"docType": docTypeBMURecord,
		"did":     did,
		"status":  "VALID",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to build latest valid BMU record query: %v", err)
	}
	iter, err := ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query latest valid BMU record for DID %s: %v", did, err)
	}
	defer iter.Close()

	var latest *BMURecord
	for iter.HasNext() {
		entry, err := iter.Next()
		if err != nil {
			return nil, err
		}
		if entry.Key == excludeRecordId {
			continue
		}
		var candidate BMURecord
		if err := unmarshalTypedState(entry.Key, entry.Value, docTypeBMURecord, &candidate); err != nil {
			return nil, err
		}
		if candidate.RecordID == "" {
			candidate.RecordID = entry.Key
		}
		if latest == nil || candidate.FC > latest.FC {
			copyCandidate := candidate
			latest = &copyCandidate
		}
	}
	return latest, nil
}

// ============================================================
// 31. InvalidateBMURecord — BMU 데이터 무효화 (원본 보존)
// ============================================================

func (c *PassportContract) InvalidateBMURecord(ctx contractapi.TransactionContextInterface,
	recordId string, reason string) error {

	if err := c.requireMSP(ctx, mspManufacturer, mspRegulator); err != nil {
		return err
	}

	if recordId == "" || reason == "" {
		return fmt.Errorf("recordId and reason must not be empty")
	}

	record, err := c.loadBMURecord(ctx, recordId)
	if err != nil {
		return err
	}

	if record.Status == "INVALIDATED" {
		return fmt.Errorf("BMU record %s is already invalidated", recordId)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	record.Status = "INVALIDATED"
	record.InvalidatedBy = msp
	record.InvalidatedAt = now
	record.InvalidReason = reason

	updatedJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal BMU record: %v", err)
	}

	if err := ctx.GetStub().PutState(recordId, updatedJSON); err != nil {
		return fmt.Errorf("failed to store invalidated record: %v", err)
	}

	var latestValidCache *BMURecord
	latestValidLoaded := false
	getLatestValid := func() (*BMURecord, error) {
		if latestValidLoaded {
			return latestValidCache, nil
		}
		latestValid, err := c.findLatestValidBMURecordByDID(ctx, record.DID, recordId)
		if err != nil {
			return nil, err
		}
		latestValidCache = latestValid
		latestValidLoaded = true
		return latestValidCache, nil
	}

	// lastFc 동기화 — 무효화된 레코드의 FC가 lastFc와 같으면 재계산
	lastFcKey, err := lastFCKey(record.DID)
	if err != nil {
		return fmt.Errorf("failed to create lastFc composite key: %v", err)
	}
	lastFcBytes, err := ctx.GetStub().GetState(lastFcKey)
	if err != nil {
		return fmt.Errorf("failed to read lastFc for DID %s: %v", record.DID, err)
	}
	if lastFcBytes == nil {
		return fmt.Errorf("missing canonical lastFc binding for DID %s; repair required before invalidating BMU records", record.DID)
	}
	if lastFcBytes != nil {
		boundPassportID, currentLastFc, hasLastFC, legacyNumeric, err := decodeLastFCBinding(lastFcBytes)
		if err != nil {
			return fmt.Errorf("failed to parse lastFc value: %v", err)
		}
		if legacyNumeric {
			return fmt.Errorf("legacy lastFc binding for DID %s requires repair before invalidating BMU records", record.DID)
		}
		if boundPassportID != record.PassportID {
			return fmt.Errorf("DID mismatch: DID %s is bound to passport %s, not %s", record.DID, boundPassportID, record.PassportID)
		}
		if hasLastFC && currentLastFc == record.FC {
			// 다음 최신 유효 FC를 rich query scan으로 조회한다.
			// 희귀 repair 경로라 write-hot-path CouchDB index 비용을 늘리지 않는다.
			latestValid, err := getLatestValid()
			if err != nil {
				return err
			}
			if latestValid != nil {
				if latestValid.PassportID != boundPassportID {
					return fmt.Errorf("latest valid BMU record passport mismatch: DID %s is bound to passport %s, query returned %s", record.DID, boundPassportID, latestValid.PassportID)
				}
				if err := ctx.GetStub().PutState(lastFcKey, encodeLastFCBinding(latestValid.PassportID, latestValid.FC, true)); err != nil {
					return fmt.Errorf("failed to update lastFc: %v", err)
				}
			} else {
				if err := ctx.GetStub().PutState(lastFcKey, encodeLastFCBinding(boundPassportID, 0, false)); err != nil {
					return fmt.Errorf("failed to reset lastFc binding for DID %s: %v", record.DID, err)
				}
			}
		}
	}

	// BMU snapshot 재계산 — 무효화된 레코드가 snapshot의 lastBmuDataId였으면 최근 유효 레코드로 갱신
	if record.PassportID != "" {
		snapshotKey, err := ctx.GetStub().CreateCompositeKey("snapshot", []string{record.PassportID})
		if err != nil {
			return fmt.Errorf("failed to create snapshot composite key: %v", err)
		}
		snapshotJSON, err := ctx.GetStub().GetState(snapshotKey)
		if err != nil {
			return fmt.Errorf("failed to read BMU snapshot: %v", err)
		}
		if snapshotJSON != nil {
			var snap BMUSnapshot
			if err := unmarshalTypedState(snapshotKey, snapshotJSON, docTypeBMUSnapshot, &snap); err != nil {
				return err
			}
			if snap.LastBMUDataID == recordId {
				latestValid, err := getLatestValid()
				if err != nil {
					return err
				}
				if latestValid != nil {
					if latestValid.PassportID != record.PassportID {
						return fmt.Errorf("latest valid BMU record passport mismatch: DID %s is bound to passport %s, query returned %s", record.DID, record.PassportID, latestValid.PassportID)
					}
					snap.CurrentSOC = float64(latestValid.SOC)
					snap.Temperature = latestValid.Temperature
					snap.StatusFlags = latestValid.StatusFlags
					snap.TotalDischargeCycles = int(latestValid.DischargeCycles)
					snap.LastBMUDataID = latestValid.RecordID
				} else {
					snap.CurrentSOC = 0
					snap.Temperature = 0
					snap.StatusFlags = 0
					snap.TotalDischargeCycles = 0
					snap.LastBMUDataID = ""
				}
				snap.UpdatedAt = now
				sJSON, err := json.Marshal(snap)
				if err != nil {
					return fmt.Errorf("failed to marshal BMU snapshot: %v", err)
				}
				if err := ctx.GetStub().PutState(snapshotKey, sJSON); err != nil {
					return fmt.Errorf("failed to update BMU snapshot: %v", err)
				}
			}
		}
	}

	return nil
}

// ============================================================
// ResetFCForDID — FC 재동기화 (장비 재부팅/교체/DID 재프로비저닝)
// ============================================================

func (c *PassportContract) ResetFCForDID(ctx contractapi.TransactionContextInterface,
	did string, reason string) error {

	// ManufacturerMSP + RegulatorMSP만 허용 (보안 민감 작업)
	if err := c.requireMSP(ctx, mspManufacturer, mspRegulator); err != nil {
		return err
	}

	if did == "" || reason == "" {
		return fmt.Errorf("did and reason must not be empty")
	}
	if len(reason) < 10 {
		return fmt.Errorf("reason must be at least 10 characters")
	}

	// 현재 lastFc 값 조회 (감사 로그용)
	lastFcKey, err := lastFCKey(did)
	if err != nil {
		return fmt.Errorf("failed to create lastFc composite key: %v", err)
	}

	var previousFC uint64
	var boundPassportID string
	lastFcBytes, err := ctx.GetStub().GetState(lastFcKey)
	if err != nil {
		return fmt.Errorf("failed to read lastFc for DID %s: %v", did, err)
	}
	if lastFcBytes == nil {
		return fmt.Errorf("missing canonical lastFc binding for DID %s; repair required before reset", did)
	}
	boundPassportID, parsedFC, hasLastFC, legacyNumeric, parseErr := decodeLastFCBinding(lastFcBytes)
	if parseErr != nil {
		return fmt.Errorf("failed to parse lastFc for DID %s: %v", did, parseErr)
	}
	if legacyNumeric {
		return fmt.Errorf("legacy lastFc binding for DID %s requires repair before reset", did)
	}
	if boundPassportID == "" {
		return fmt.Errorf("missing passport binding in lastFc for DID %s; repair required before reset", did)
	}
	if hasLastFC {
		previousFC = parsedFC
	}
	passport, err := c.loadPassport(ctx, boundPassportID)
	if err != nil {
		return err
	}
	if passport.DID != did {
		return fmt.Errorf("DID mismatch: passport %s is registered to DID %s, not %s", boundPassportID, passport.DID, did)
	}

	// Keep the DID→passport binding and only clear the FC high-water.
	if err := ctx.GetStub().PutState(lastFcKey, encodeLastFCBinding(boundPassportID, 0, false)); err != nil {
		return fmt.Errorf("failed to reset lastFc for DID %s: %v", did, err)
	}

	// 감사 로그 기록
	msp, mspErr := c.getClientMSP(ctx)
	if mspErr != nil {
		return fmt.Errorf("failed to get client MSP: %v", mspErr)
	}
	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	logID := fmt.Sprintf("FCRESET-%s-%s", did, ctx.GetStub().GetTxID())

	resetLog := FCResetLog{
		DocType:    docTypeFCReset,
		LogID:      logID,
		PassportID: boundPassportID,
		DID:        did,
		Reason:     reason,
		PreviousFC: previousFC,
		HasFC:      hasLastFC,
		ResetBy:    msp,
		ResetAt:    now,
	}

	logJSON, err := json.Marshal(resetLog)
	if err != nil {
		return fmt.Errorf("failed to marshal FC reset log: %v", err)
	}

	if err := ctx.GetStub().PutState(logID, logJSON); err != nil {
		return fmt.Errorf("failed to store FC reset log: %v", err)
	}
	if err := ctx.GetStub().SetEvent(logID, logJSON); err != nil {
		return fmt.Errorf("failed to emit FC reset event: %v", err)
	}

	return nil
}

// ============================================================
// RepairFCBindingForDID — canonical lastFc binding migration/repair
// ============================================================

func (c *PassportContract) RepairFCBindingForDID(ctx contractapi.TransactionContextInterface,
	passportId string, did string, reason string) error {

	if err := c.requireMSP(ctx, mspManufacturer, mspRegulator); err != nil {
		return err
	}
	if passportId == "" || did == "" || reason == "" {
		return fmt.Errorf("passportId, did and reason must not be empty")
	}

	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return err
	}
	if passport.DID != did {
		return fmt.Errorf("DID mismatch: passport %s is registered to DID %s, not %s", passportId, passport.DID, did)
	}

	lastFcKey, err := lastFCKey(did)
	if err != nil {
		return fmt.Errorf("failed to create lastFc composite key: %v", err)
	}

	var previousFC uint64
	var repairedFC uint64
	hasFC := false
	source := "missing"

	lastFcBytes, err := ctx.GetStub().GetState(lastFcKey)
	if err != nil {
		return fmt.Errorf("failed to read lastFc for DID %s: %v", did, err)
	}

	if lastFcBytes == nil {
		latest, err := c.findLatestValidBMURecordByDID(ctx, did, "")
		if err != nil {
			return err
		}
		if latest != nil {
			if latest.PassportID != passportId {
				return fmt.Errorf("latest valid BMU record passport mismatch: DID %s is bound to passport %s, query returned %s", did, passportId, latest.PassportID)
			}
			repairedFC = latest.FC
			hasFC = true
			source = "latestValidRecord"
		}
	} else {
		boundPassportID, parsedFC, parsedHasFC, legacyNumeric, parseErr := decodeLastFCBinding(lastFcBytes)
		if parseErr != nil {
			return fmt.Errorf("failed to parse lastFc for DID %s: %v", did, parseErr)
		}
		if !legacyNumeric && boundPassportID != "" && boundPassportID != passportId {
			return fmt.Errorf("DID mismatch: DID %s is bound to passport %s, not %s", did, boundPassportID, passportId)
		}
		if parsedHasFC {
			previousFC = parsedFC
			repairedFC = parsedFC
			hasFC = true
		}
		if legacyNumeric {
			source = "legacyNumeric"
		} else {
			source = "alreadyCanonical"
		}
	}

	if err := ctx.GetStub().PutState(lastFcKey, encodeLastFCBinding(passportId, repairedFC, hasFC)); err != nil {
		return fmt.Errorf("failed to repair lastFc for DID %s: %v", did, err)
	}

	msp, mspErr := c.getClientMSP(ctx)
	if mspErr != nil {
		return fmt.Errorf("failed to get client MSP: %v", mspErr)
	}
	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	logID := fmt.Sprintf("FCREPAIR-%s-%s", did, ctx.GetStub().GetTxID())
	repairLog := FCRepairLog{
		DocType:    docTypeFCRepair,
		LogID:      logID,
		PassportID: passportId,
		DID:        did,
		Reason:     reason,
		Source:     source,
		PreviousFC: previousFC,
		RepairedFC: repairedFC,
		HasFC:      hasFC,
		RepairedBy: msp,
		RepairedAt: now,
	}
	logJSON, err := json.Marshal(repairLog)
	if err != nil {
		return fmt.Errorf("failed to marshal FC repair log: %v", err)
	}
	if err := ctx.GetStub().PutState(logID, logJSON); err != nil {
		return fmt.Errorf("failed to store FC repair log: %v", err)
	}

	return nil
}
