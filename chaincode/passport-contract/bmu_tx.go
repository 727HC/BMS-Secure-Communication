package main

import (
	"encoding/json"
	"fmt"
	"strconv"

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

	// BMU 데이터 수집: 배터리 제조사(제조/테스트) + EV 제조사(차량 운행 중) 허용
	if err := c.requireMSP(ctx, mspManufacturer, mspEVManufacturer); err != nil {
		return err
	}

	if recordId == "" || passportId == "" || did == "" || dataHash == "" || timestamp == "" {
		return fmt.Errorf("recordId, passportId, did, dataHash, timestamp must not be empty")
	}

	// Check duplicate recordId
	existingRecord, err := ctx.GetStub().GetState(recordId)
	if err != nil {
		return fmt.Errorf("failed to check existing record: %v", err)
	}
	if existingRecord != nil {
		return fmt.Errorf("BMU record %s already exists", recordId)
	}

	// Check passport exists and DID matches
	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}
	var passportCheck BatteryPassport
	if err := json.Unmarshal(passportJSON, &passportCheck); err != nil {
		return fmt.Errorf("failed to unmarshal passport for DID check: %v", err)
	}
	if passportCheck.DID != did {
		return fmt.Errorf("DID mismatch: passport %s is registered to DID %s, not %s", passportId, passportCheck.DID, did)
	}

	// Parse fc and check monotonic increase per DID
	fcVal, err := strconv.ParseUint(fc, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid fc value: %v", err)
	}

	// FC monotonic increase check — reject replay/stale BMU data
	// Uses dedicated state key instead of CouchDB rich query for performance
	lastFcKey, err := ctx.GetStub().CreateCompositeKey("lastFc", []string{did})
	if err != nil {
		return fmt.Errorf("failed to create lastFc composite key: %v", err)
	}
	lastFcBytes, err := ctx.GetStub().GetState(lastFcKey)
	if err != nil {
		return fmt.Errorf("failed to read lastFc for DID %s: %v", did, err)
	}
	if lastFcBytes != nil {
		lastFcVal, err := strconv.ParseUint(string(lastFcBytes), 10, 64)
		if err != nil {
			return fmt.Errorf("failed to parse lastFc value: %v", err)
		}
		if fcVal <= lastFcVal {
			return fmt.Errorf("fc %d must be greater than last valid fc %d for DID %s", fcVal, lastFcVal, did)
		}
	}

	socVal, err := strconv.ParseUint(soc, 10, 16)
	if err != nil {
		return fmt.Errorf("invalid soc value: %v", err)
	}

	voltageVal, err := strconv.ParseFloat(voltage, 64)
	if err != nil {
		return fmt.Errorf("invalid voltage value: %v", err)
	}

	currentVal, err := strconv.ParseFloat(current, 64)
	if err != nil {
		return fmt.Errorf("invalid current value: %v", err)
	}

	temperatureVal, err := strconv.ParseUint(temperature, 10, 16)
	if err != nil {
		return fmt.Errorf("invalid temperature value: %v", err)
	}

	cellCountVal, err := strconv.ParseUint(cellCount, 10, 8)
	if err != nil {
		return fmt.Errorf("invalid cellCount value: %v", err)
	}

	statusFlagsVal, err := strconv.ParseUint(statusFlags, 10, 8)
	if err != nil {
		return fmt.Errorf("invalid statusFlags value: %v", err)
	}

	dischargeCyclesVal, err := strconv.ParseUint(dischargeCycles, 10, 16)
	if err != nil {
		return fmt.Errorf("invalid dischargeCycles value: %v", err)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}

	record := BMURecord{
		DocType:         docTypeBMURecord,
		RecordID:        recordId,
		PassportID:      passportId,
		DID:             did,
		DataHash:        dataHash,
		Signature:       signature,
		FC:              fcVal,
		SOC:             uint16(socVal),
		Voltage:         voltageVal,
		Current:         currentVal,
		Temperature:     uint16(temperatureVal),
		CellCount:       uint8(cellCountVal),
		StatusFlags:     uint8(statusFlagsVal),
		DischargeCycles: uint16(dischargeCyclesVal),
		Timestamp:       timestamp,
		Status:          "VALID",
		CreatedAt:       now,
		CreatorMSP:      msp,
	}

	recordJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal BMU record: %v", err)
	}

	err = ctx.GetStub().PutState(recordId, recordJSON)
	if err != nil {
		return fmt.Errorf("failed to store BMU record: %v", err)
	}

	// Update lastFc state key for this DID
	if err := ctx.GetStub().PutState(lastFcKey, []byte(strconv.FormatUint(fcVal, 10))); err != nil {
		return fmt.Errorf("failed to update lastFc: %v", err)
	}

	// Snapshot은 cloud-agent block event에서 오프체인 생성 (TPS 최적화: 3 PutState → 2)
	return nil
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

	recordJSON, err := ctx.GetStub().GetState(recordId)
	if err != nil {
		return fmt.Errorf("failed to read BMU record: %v", err)
	}
	if recordJSON == nil {
		return fmt.Errorf("BMU record %s does not exist", recordId)
	}

	var record BMURecord
	if err := json.Unmarshal(recordJSON, &record); err != nil {
		return fmt.Errorf("failed to unmarshal BMU record: %v", err)
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

	// lastFc 동기화 — 무효화된 레코드의 FC가 lastFc와 같으면 재계산
	lastFcKey, _ := ctx.GetStub().CreateCompositeKey("lastFc", []string{record.DID})
	lastFcBytes, _ := ctx.GetStub().GetState(lastFcKey)
	if lastFcBytes != nil {
		currentLastFc, _ := strconv.ParseUint(string(lastFcBytes), 10, 64)
		if currentLastFc == record.FC {
			// 다음 최신 유효 FC를 rich query로 조회 (희귀 연산이므로 허용)
			fcReQuery, _ := buildQuery(
				map[string]interface{}{
					"docType": docTypeBMURecord,
					"did":     record.DID,
					"status":  "VALID",
				},
				map[string]interface{}{
					"sort":  []map[string]string{{"fc": "desc"}},
					"limit": 1,
				},
			)
			fcReIter, err := ctx.GetStub().GetQueryResult(fcReQuery)
			if err == nil {
				defer fcReIter.Close()
				if fcReIter.HasNext() {
					entry, _ := fcReIter.Next()
					var latestValid BMURecord
					if json.Unmarshal(entry.Value, &latestValid) == nil {
						ctx.GetStub().PutState(lastFcKey, []byte(strconv.FormatUint(latestValid.FC, 10)))
					}
				} else {
					ctx.GetStub().DelState(lastFcKey)
				}
			}
		}
	}

	// BMU snapshot 재계산 — 무효화된 레코드가 snapshot의 lastBmuDataId였으면 최근 유효 레코드로 갱신
	if record.PassportID != "" {
		snapshotKey, _ := ctx.GetStub().CreateCompositeKey("snapshot", []string{record.PassportID})
		snapshotJSON, err := ctx.GetStub().GetState(snapshotKey)
		if err == nil && snapshotJSON != nil {
			var snap BMUSnapshot
			if json.Unmarshal(snapshotJSON, &snap) == nil && snap.LastBMUDataID == recordId {
				reQuery, _ := buildQuery(
					map[string]interface{}{
						"docType":    docTypeBMURecord,
						"passportId": record.PassportID,
						"status":     "VALID",
					},
					map[string]interface{}{
						"sort":  []map[string]string{{"fc": "desc"}},
						"limit": 1,
					},
				)
				reIter, err := ctx.GetStub().GetQueryResult(reQuery)
				if err == nil {
					defer reIter.Close()
					if reIter.HasNext() {
						entry, _ := reIter.Next()
						var latestValid BMURecord
						if json.Unmarshal(entry.Value, &latestValid) == nil {
							snap.CurrentSOC = float64(latestValid.SOC)
							snap.Temperature = latestValid.Temperature
							snap.StatusFlags = latestValid.StatusFlags
							snap.TotalDischargeCycles = int(latestValid.DischargeCycles)
							snap.LastBMUDataID = latestValid.RecordID
						}
					} else {
						snap.CurrentSOC = 0
						snap.Temperature = 0
						snap.StatusFlags = 0
						snap.TotalDischargeCycles = 0
						snap.LastBMUDataID = ""
					}
					snap.UpdatedAt = now
					if sJSON, err := json.Marshal(snap); err == nil {
						ctx.GetStub().PutState(snapshotKey, sJSON)
					}
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

	// 현재 lastFc 값 조회 (감사 로그용)
	lastFcKey, err := ctx.GetStub().CreateCompositeKey("lastFc", []string{did})
	if err != nil {
		return fmt.Errorf("failed to create lastFc composite key: %v", err)
	}

	var previousFC uint64
	lastFcBytes, err := ctx.GetStub().GetState(lastFcKey)
	if err != nil {
		return fmt.Errorf("failed to read lastFc for DID %s: %v", did, err)
	}
	if lastFcBytes != nil {
		var parseErr error
		previousFC, parseErr = strconv.ParseUint(string(lastFcBytes), 10, 64)
		if parseErr != nil {
			return fmt.Errorf("failed to parse lastFc for DID %s: %v", did, parseErr)
		}
	}

	// lastFc 키 삭제 — 다음 BMU 데이터부터 새 FC 시퀀스 시작
	if err := ctx.GetStub().DelState(lastFcKey); err != nil {
		return fmt.Errorf("failed to delete lastFc for DID %s: %v", did, err)
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
		DID:        did,
		Reason:     reason,
		PreviousFC: previousFC,
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

	return nil
}
