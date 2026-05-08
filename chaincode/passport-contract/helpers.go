package main

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// txTimestamp returns the transaction timestamp as RFC3339 string.
// Uses GetTxTimestamp() for deterministic endorsement across peers.
// Returns error instead of time.Now() fallback to prevent non-deterministic state.
func txTimestamp(ctx contractapi.TransactionContextInterface) (string, error) {
	ts, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return "", fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	if ts == nil {
		return "", fmt.Errorf("tx timestamp is nil")
	}
	return time.Unix(ts.Seconds, int64(ts.Nanos)).UTC().Format(time.RFC3339), nil
}

// sanitizeSelector escapes characters that could break CouchDB JSON selectors
func sanitizeSelector(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `"`, `\"`)
	return s
}

// buildQuery safely constructs a CouchDB Mango query from a selector map
// and optional top-level fields (like "sort", "limit"). Uses json.Marshal
// to guarantee proper escaping, preventing injection via string interpolation.
func buildQuery(selector map[string]interface{}, extras ...map[string]interface{}) (string, error) {
	query := map[string]interface{}{"selector": selector}
	for _, extra := range extras {
		for k, v := range extra {
			query[k] = v
		}
	}
	b, err := json.Marshal(query)
	if err != nil {
		return "", fmt.Errorf("failed to build query: %v", err)
	}
	return string(b), nil
}

func unmarshalTypedState(key string, stateJSON []byte, expectedDocType string, out interface{}) error {
	var envelope struct {
		DocType string `json:"docType"`
	}
	if err := json.Unmarshal(stateJSON, &envelope); err != nil {
		return fmt.Errorf("failed to unmarshal state %s: %v", key, err)
	}
	if envelope.DocType != expectedDocType {
		return fmt.Errorf("state type mismatch: key %s has docType %q, expected %q", key, envelope.DocType, expectedDocType)
	}
	if err := json.Unmarshal(stateJSON, out); err != nil {
		return fmt.Errorf("failed to unmarshal %s state: %v", expectedDocType, err)
	}
	return nil
}

func parseNonNegativeInt(fieldName string, value string) (int, error) {
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("invalid %s value: %v", fieldName, err)
	}
	if parsed < 0 {
		return 0, fmt.Errorf("%s must be non-negative, got %d", fieldName, parsed)
	}
	return parsed, nil
}

func parseNonNegativeFloat(fieldName string, value string) (float64, error) {
	parsed, err := parseFiniteFloat(fieldName, value)
	if err != nil {
		return 0, err
	}
	if parsed < 0 {
		return 0, fmt.Errorf("%s must be non-negative, got %f", fieldName, parsed)
	}
	return parsed, nil
}

func parseOptionalNonNegativeFloat(fieldName string, value string) (float64, error) {
	if value == "" {
		return 0, nil
	}
	return parseNonNegativeFloat(fieldName, value)
}

func parsePercent(fieldName string, value string) (float64, error) {
	parsed, err := parseFiniteFloat(fieldName, value)
	if err != nil {
		return 0, err
	}
	if parsed < 0 || parsed > 100 {
		return 0, fmt.Errorf("%s must be in [0, 100], got %f", fieldName, parsed)
	}
	return parsed, nil
}

func parseFiniteFloat(fieldName string, value string) (float64, error) {
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid %s value: %v", fieldName, err)
	}
	if math.IsNaN(parsed) || math.IsInf(parsed, 0) {
		return 0, fmt.Errorf("invalid %s value: must be finite", fieldName)
	}
	return parsed, nil
}

func parseStrictBool(fieldName string, value string) (bool, error) {
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, fmt.Errorf("invalid %s boolean value: %v", fieldName, err)
	}
	return parsed, nil
}

func validateSHA256Hex(fieldName string, value string) error {
	if len(value) != 64 {
		return fmt.Errorf("%s must be 64-character hex SHA-256, got length %d", fieldName, len(value))
	}
	for _, r := range value {
		if !((r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F')) {
			return fmt.Errorf("%s must be 64-character hex SHA-256", fieldName)
		}
	}
	return nil
}

func validateBMURecordInput(recordId string, passportId string, did string, dataHash string, signature string, timestamp string) error {
	if signature == "" || timestamp == "" {
		return fmt.Errorf("signature/timestamp must not be empty")
	}
	if recordId == "" || passportId == "" || did == "" || dataHash == "" {
		return fmt.Errorf("recordId, passportId, did, dataHash must not be empty")
	}
	if err := validateSHA256Hex("dataHash", dataHash); err != nil {
		return err
	}
	return validateRequiredRFC3339("timestamp", timestamp)
}

func validateOptionalRFC3339(fieldName string, value string) error {
	if value == "" {
		return nil
	}
	if _, err := time.Parse(time.RFC3339, value); err != nil {
		return fmt.Errorf("invalid %s value: %v", fieldName, err)
	}
	return nil
}

func validateRequiredRFC3339(fieldName string, value string) error {
	if value == "" {
		return fmt.Errorf("%s must not be empty", fieldName)
	}
	if _, err := time.Parse(time.RFC3339, value); err != nil {
		return fmt.Errorf("invalid %s value: %v", fieldName, err)
	}
	return nil
}

func validatePassportHolderDID(passport *BatteryPassport, holderDid string) error {
	if holderDid == "" {
		return fmt.Errorf("holderDid must not be empty")
	}
	if passport.DID != holderDid {
		return fmt.Errorf("holder DID mismatch: passport %s is registered to DID %s, not %s", passport.PassportID, passport.DID, holderDid)
	}
	return nil
}

func validateBMSIdentifier(fieldName string, value string) error {
	if value == "" {
		return fmt.Errorf("%s must not be empty", fieldName)
	}
	if len(value) > 128 {
		return fmt.Errorf("%s must be at most 128 characters", fieldName)
	}
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			continue
		}
		switch r {
		case ':', '_', '-', '.', '/', '#':
			continue
		default:
			return fmt.Errorf("%s contains invalid character %q", fieldName, r)
		}
	}
	return nil
}

func parseRecycledElementContentJSON(value string) (map[string]float64, error) {
	if value == "" {
		return map[string]float64{}, nil
	}
	var parsed map[string]float64
	if err := json.Unmarshal([]byte(value), &parsed); err != nil {
		return nil, fmt.Errorf("invalid recycledElementContent JSON: %v", err)
	}
	if parsed == nil {
		return map[string]float64{}, nil
	}
	for key, rate := range parsed {
		if !validRecycledElementKeys[key] {
			return nil, fmt.Errorf("unknown recycledElementContent key: %s", key)
		}
		if math.IsNaN(rate) || math.IsInf(rate, 0) {
			return nil, fmt.Errorf("invalid recycledElementContent rate for %s: must be finite", key)
		}
		if rate < 0 || rate > 100 {
			return nil, fmt.Errorf("invalid recycledElementContent rate for %s: must be in [0, 100], got %f", key, rate)
		}
	}
	return parsed, nil
}

func parseExtensionInfoJSON(value string) (map[string]string, error) {
	if value == "" {
		return map[string]string{}, nil
	}
	var parsed map[string]string
	if err := json.Unmarshal([]byte(value), &parsed); err != nil {
		return nil, fmt.Errorf("invalid extensionInfo JSON: %v", err)
	}
	if parsed == nil {
		return map[string]string{}, nil
	}
	for key := range parsed {
		if key == "" {
			return nil, fmt.Errorf("extensionInfo key must not be empty")
		}
		if len(key) > 64 {
			return nil, fmt.Errorf("extensionInfo key %s must be at most 64 characters", key)
		}
	}
	return parsed, nil
}

func applyPassportExtendedAttributes(passport *BatteryPassport, manufacturingProcess string, disposalMethod string, recycledElementContentJSON string, extensionInfoJSON string) error {
	recycledElementContent, err := parseRecycledElementContentJSON(recycledElementContentJSON)
	if err != nil {
		return err
	}
	extensionInfo, err := parseExtensionInfoJSON(extensionInfoJSON)
	if err != nil {
		return err
	}
	passport.ManufacturingProcess = manufacturingProcess
	passport.DisposalMethod = disposalMethod
	passport.RecycledElementContent = recycledElementContent
	passport.ExtensionInfo = extensionInfo
	return nil
}

func marshalPassportExtendedAttributes(passport *BatteryPassport) (string, error) {
	payload := struct {
		ManufacturingProcess   string             `json:"manufacturingProcess"`
		DisposalMethod         string             `json:"disposalMethod"`
		RecycledElementContent map[string]float64 `json:"recycledElementContent"`
		ExtensionInfo          map[string]string  `json:"extensionInfo"`
	}{
		ManufacturingProcess:   passport.ManufacturingProcess,
		DisposalMethod:         passport.DisposalMethod,
		RecycledElementContent: passport.RecycledElementContent,
		ExtensionInfo:          passport.ExtensionInfo,
	}
	b, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal extended attributes: %v", err)
	}
	return string(b), nil
}

func validateBMSBinding(passport *BatteryPassport, bmsManagementId string, bmsBindingId string) error {
	if err := validateBMSIdentifier("bmsManagementId", bmsManagementId); err != nil {
		return err
	}
	if err := validateBMSIdentifier("bmsBindingId", bmsBindingId); err != nil {
		return err
	}
	if passport.BMSManagementID != "" && passport.BMSManagementID != bmsManagementId {
		return fmt.Errorf("BMS management identifier mismatch: passport %s is bound to %s, not %s", passport.PassportID, passport.BMSManagementID, bmsManagementId)
	}
	if passport.BMSBindingID != "" && passport.BMSBindingID != bmsBindingId {
		return fmt.Errorf("BMS binding identifier mismatch: passport %s is bound to %s, not %s", passport.PassportID, passport.BMSBindingID, bmsBindingId)
	}
	return nil
}

func deriveBMSBindingCode32(canonicalID string) uint32 {
	sum := sha256.Sum256([]byte(strings.TrimSpace(canonicalID)))
	return binary.LittleEndian.Uint32(sum[0:4])
}

func formatBMSBindingCode32(code uint32) string {
	return fmt.Sprintf("0x%08x", code)
}

func computeBMSBindingEvidenceHash(bmsManagementId string, bmsBindingId string) (string, error) {
	evidence := map[string]string{
		"bmsBindingCode32": formatBMSBindingCode32(deriveBMSBindingCode32(bmsManagementId)),
		"bmsBindingId":     bmsBindingId,
		"bmsManagementId":  strings.TrimSpace(bmsManagementId),
	}
	canonical, err := json.Marshal(evidence)
	if err != nil {
		return "", fmt.Errorf("failed to marshal BMS binding evidence: %v", err)
	}
	sum := sha256.Sum256(canonical)
	return hex.EncodeToString(sum[:]), nil
}

func validateBMSBindingEvidenceHash(evidenceHash string, bmsManagementId string, bmsBindingId string) error {
	if evidenceHash == "" {
		return nil
	}
	if err := validateSHA256Hex("evidenceHash", evidenceHash); err != nil {
		return err
	}
	expectedHash, err := computeBMSBindingEvidenceHash(bmsManagementId, bmsBindingId)
	if err != nil {
		return err
	}
	if !strings.EqualFold(evidenceHash, expectedHash) {
		return fmt.Errorf("evidenceHash mismatch: expected SHA-256 of canonical BMS binding JSON %s, got %s", expectedHash, evidenceHash)
	}
	return nil
}

func validateBMURawPayload(dataHash string, rawPayloadHex string) ([]byte, uint32, error) {
	rawPayloadHex = strings.TrimSpace(rawPayloadHex)
	if rawPayloadHex == "" {
		return nil, 0, fmt.Errorf("rawPayload must not be empty")
	}
	rawPayloadHex = strings.TrimPrefix(rawPayloadHex, "0x")
	rawPayloadHex = strings.TrimPrefix(rawPayloadHex, "0X")

	payload, err := hex.DecodeString(rawPayloadHex)
	if err != nil {
		return nil, 0, fmt.Errorf("invalid rawPayload hex: %v", err)
	}
	if len(payload) != 48 {
		return nil, 0, fmt.Errorf("rawPayload must be 48 bytes, got %d", len(payload))
	}

	payloadHash := sha256.Sum256(payload)
	expectedHash := hex.EncodeToString(payloadHash[:])
	if !strings.EqualFold(dataHash, expectedHash) {
		return nil, 0, fmt.Errorf("dataHash mismatch: expected SHA-256 of 48-byte rawPayload %s, got %s", expectedHash, dataHash)
	}

	return payload, binary.LittleEndian.Uint32(payload[44:48]), nil
}

func validateBMSBindingCode(passport *BatteryPassport, payloadCode32 uint32) error {
	if passport.BMSManagementID == "" {
		return fmt.Errorf("BMS management identifier must be bound before validating BMU rawPayload")
	}
	expectedCode32 := deriveBMSBindingCode32(passport.BMSManagementID)
	if passport.BMSBindingCode32 != 0 && passport.BMSBindingCode32 != expectedCode32 {
		return fmt.Errorf("stored BMS binding code mismatch: passport %s has %d, expected %d from canonical BMS management identifier %s", passport.PassportID, passport.BMSBindingCode32, expectedCode32, passport.BMSManagementID)
	}
	if payloadCode32 != expectedCode32 {
		return fmt.Errorf("BMS binding code mismatch: payload bmsBindingCode32 %d does not match canonical BMS management identifier %s code %d", payloadCode32, passport.BMSManagementID, expectedCode32)
	}
	return nil
}

func isStatusAllowed(status string, allowed ...string) bool {
	for _, candidate := range allowed {
		if status == candidate {
			return true
		}
	}
	return false
}

func (c *PassportContract) loadPassport(ctx contractapi.TransactionContextInterface, passportId string) (*BatteryPassport, error) {
	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return nil, fmt.Errorf("passport %s does not exist", passportId)
	}
	var passport BatteryPassport
	if err := unmarshalTypedState(passportId, passportJSON, docTypePassport, &passport); err != nil {
		return nil, err
	}
	normalizePassport(&passport)
	return &passport, nil
}

func (c *PassportContract) loadRawMaterial(ctx contractapi.TransactionContextInterface, materialId string) (*RawMaterial, error) {
	materialJSON, err := ctx.GetStub().GetState(materialId)
	if err != nil {
		return nil, fmt.Errorf("failed to read raw material: %v", err)
	}
	if materialJSON == nil {
		return nil, fmt.Errorf("raw material %s does not exist", materialId)
	}
	var material RawMaterial
	if err := unmarshalTypedState(materialId, materialJSON, docTypeRawMaterial, &material); err != nil {
		return nil, err
	}
	return &material, nil
}

func (c *PassportContract) loadBMURecord(ctx contractapi.TransactionContextInterface, recordId string) (*BMURecord, error) {
	recordJSON, err := ctx.GetStub().GetState(recordId)
	if err != nil {
		return nil, fmt.Errorf("failed to read BMU record: %v", err)
	}
	if recordJSON == nil {
		return nil, fmt.Errorf("BMU record %s does not exist", recordId)
	}
	var record BMURecord
	if err := unmarshalTypedState(recordId, recordJSON, docTypeBMURecord, &record); err != nil {
		return nil, err
	}
	return &record, nil
}

func (c *PassportContract) loadCredential(ctx contractapi.TransactionContextInterface, credentialId string) (*VerifiableCredential, error) {
	vcJSON, err := ctx.GetStub().GetState(credentialId)
	if err != nil {
		return nil, fmt.Errorf("failed to read credential: %v", err)
	}
	if vcJSON == nil {
		return nil, fmt.Errorf("credential %s does not exist", credentialId)
	}
	var vc VerifiableCredential
	if err := unmarshalTypedState(credentialId, vcJSON, docTypeVC, &vc); err != nil {
		return nil, err
	}
	return &vc, nil
}

func (c *PassportContract) loadCredentialRequest(ctx contractapi.TransactionContextInterface, requestId string) (*CredentialRequest, error) {
	requestJSON, err := ctx.GetStub().GetState(requestId)
	if err != nil {
		return nil, fmt.Errorf("failed to read credential request: %v", err)
	}
	if requestJSON == nil {
		return nil, fmt.Errorf("credential request %s does not exist", requestId)
	}
	var request CredentialRequest
	if err := unmarshalTypedState(requestId, requestJSON, docTypeCredRequest, &request); err != nil {
		return nil, err
	}
	return &request, nil
}

// ============================================================
// RBAC Helpers
// ============================================================

func (c *PassportContract) getClientMSP(ctx contractapi.TransactionContextInterface) (string, error) {
	return ctx.GetClientIdentity().GetMSPID()
}

func (c *PassportContract) requireMSP(ctx contractapi.TransactionContextInterface, allowedMSPs ...string) error {
	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}
	for _, allowed := range allowedMSPs {
		if msp == allowed {
			return nil
		}
	}
	return fmt.Errorf("access denied: MSP %s not in allowed list %v", msp, allowedMSPs)
}

// normalizePassport ensures nil slices/maps are initialized (for legacy data compatibility)
func normalizePassport(p *BatteryPassport) {
	if p.RawMaterials == nil {
		p.RawMaterials = []string{}
	}
	if p.RecyclingRates == nil {
		p.RecyclingRates = map[string]float64{}
	}
	if p.MaintenanceLogs == nil {
		p.MaintenanceLogs = []MaintenanceLog{}
	}
	if p.AccidentLogs == nil {
		p.AccidentLogs = []AccidentLog{}
	}
	if p.CorrectionLogs == nil {
		p.CorrectionLogs = []CorrectionLog{}
	}
	if p.RecycledElementContent == nil {
		p.RecycledElementContent = map[string]float64{}
	}
	if p.ExtensionInfo == nil {
		p.ExtensionInfo = map[string]string{}
	}
	if p.RegulatoryEvidenceIds == nil {
		p.RegulatoryEvidenceIds = []string{}
	}
	if p.PhysicalVerification == nil {
		p.PhysicalVerification = &PhysicalVerification{Signals: map[string]bool{}}
	}
}

// mergeSnapshot overlays real-time BMU data from the separate snapshot key onto the passport.
// If no snapshot exists (legacy data), the passport's embedded values are preserved.
func (c *PassportContract) mergeSnapshot(ctx contractapi.TransactionContextInterface, passport *BatteryPassport) error {
	snapshotKey, err := ctx.GetStub().CreateCompositeKey("snapshot", []string{passport.PassportID})
	if err != nil {
		return fmt.Errorf("failed to create snapshot composite key: %v", err)
	}
	snapshotJSON, err := ctx.GetStub().GetState(snapshotKey)
	if err != nil {
		return fmt.Errorf("failed to read BMU snapshot: %v", err)
	}
	if snapshotJSON == nil {
		return nil
	}
	var snap BMUSnapshot
	if err := unmarshalTypedState(snapshotKey, snapshotJSON, docTypeBMUSnapshot, &snap); err != nil {
		return err
	}
	passport.CurrentSOC = snap.CurrentSOC
	passport.Temperature = snap.Temperature
	passport.StatusFlags = snap.StatusFlags
	passport.TotalDischargeCycles = snap.TotalDischargeCycles
	passport.LastBMUDataID = snap.LastBMUDataID
	if snap.UpdatedAt > passport.UpdatedAt {
		passport.UpdatedAt = snap.UpdatedAt
	}
	return nil
}

// checkPassportAccess verifies the caller's MSP has permission to view the passport
func (c *PassportContract) checkPassportAccess(ctx contractapi.TransactionContextInterface, passport *BatteryPassport) error {
	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	switch msp {
	case mspRegulator:
		return nil // 규제기관: 전체 접근
	case mspManufacturer:
		if passport.CreatorMSP == msp {
			return nil // 자기가 만든 배터리만
		}
	case mspEVManufacturer:
		if passport.VIN != "" && passport.EvBinderMSP == msp {
			return nil // 자기 조직이 바인딩한 배터리
		}
		if passport.Status == "MANUFACTURED" {
			return nil // 미바인딩 여권 조회 허용 (바인딩 대상 탐색용)
		}
	case mspService:
		if passport.Status == "MAINTENANCE" || passport.Status == "ANALYSIS" {
			return nil // 현재 정비/분석 의뢰된 배터리
		}
		// 사후 조회: 과거 정비 이력이 있으면 접근 허용
		for _, log := range passport.MaintenanceLogs {
			if log.OrgMSP == mspService {
				return nil
			}
		}
	}

	return fmt.Errorf("access denied: MSP %s cannot access passport %s", msp, passport.PassportID)
}

// checkCredentialAccess verifies caller can access a credential via its parent passport
func (c *PassportContract) checkCredentialAccess(ctx contractapi.TransactionContextInterface, vc *VerifiableCredential) error {
	passportJSON, err := ctx.GetStub().GetState(vc.PassportID)
	if err != nil {
		return fmt.Errorf("failed to read passport for credential access check: %v", err)
	}
	if passportJSON == nil {
		// passport 삭제된 경우 — 발급자 MSP 또는 규제기관만 허용
		msp, err := c.getClientMSP(ctx)
		if err != nil {
			return fmt.Errorf("failed to get client MSP: %v", err)
		}
		if msp == mspRegulator || msp == vc.IssuerMSP {
			return nil
		}
		return fmt.Errorf("access denied: credential %s has no accessible passport", vc.CredentialID)
	}
	var passport BatteryPassport
	if err := unmarshalTypedState(vc.PassportID, passportJSON, docTypePassport, &passport); err != nil {
		return err
	}
	normalizePassport(&passport)
	return c.checkPassportAccess(ctx, &passport)
}

// buildPassportQuery returns a CouchDB selector filtered by caller's MSP
func (c *PassportContract) buildPassportQuery(ctx contractapi.TransactionContextInterface) (string, error) {
	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get client MSP: %v", err)
	}

	switch msp {
	case mspRegulator:
		return fmt.Sprintf(`{"selector":{"docType":"%s"}}`, docTypePassport), nil
	case mspManufacturer:
		return fmt.Sprintf(`{"selector":{"docType":"%s","creatorMsp":"%s"}}`, docTypePassport, msp), nil
	case mspEVManufacturer:
		// 본인 바인딩 여권 + 미바인딩(MANUFACTURED) 여권도 조회 가능
		return fmt.Sprintf(`{"selector":{"docType":"%s","$or":[{"vin":{"$gt":""},"evBinderMsp":"%s"},{"status":"MANUFACTURED"}]}}`, docTypePassport, msp), nil
	case mspService:
		// 현재 정비/분석 진행 중 + 과거 정비 이력이 있는 여권도 조회 허용
		return fmt.Sprintf(`{"selector":{"docType":"%s","$or":[{"status":{"$in":["MAINTENANCE","ANALYSIS"]}},{"maintenanceLogs":{"$elemMatch":{"orgMsp":"%s"}}}]}}`, docTypePassport, mspService), nil
	default:
		return "", fmt.Errorf("unknown MSP: %s", msp)
	}
}
