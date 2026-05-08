package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// ============================================================
// 20. IssueCredential — Anchor VC on Fabric
// ============================================================

func (c *PassportContract) IssueCredential(ctx contractapi.TransactionContextInterface,
	credentialId string, passportId string, credType string,
	issuerDid string, holderDid string,
	schemaId string, credDefId string,
	dataHash string, expiresAt string) error {

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	allowedIssuers, ok := credTypeIssuers[credType]
	if !ok {
		return fmt.Errorf("invalid credential type: %s (allowed: BATTERY_PASSPORT, BATTERY_HEALTH, MAINTENANCE, COMPLIANCE, RECYCLING)", credType)
	}
	authorized := false
	for _, allowed := range allowedIssuers {
		if msp == allowed {
			authorized = true
			break
		}
	}
	if !authorized {
		return fmt.Errorf("MSP %s is not authorized to issue %s credentials", msp, credType)
	}

	if credentialId == "" || passportId == "" || holderDid == "" || dataHash == "" {
		return fmt.Errorf("credentialId, passportId, holderDid, dataHash must not be empty")
	}
	if err := validateSHA256Hex("dataHash", dataHash); err != nil {
		return err
	}
	if err := validateOptionalRFC3339("expiresAt", expiresAt); err != nil {
		return err
	}

	existing, err := ctx.GetStub().GetState(credentialId)
	if err != nil {
		return fmt.Errorf("failed to check existing credential: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("credential %s already exists", credentialId)
	}

	// P1 ownership: 발급자가 해당 passport 에 접근 권한이 있는지 확인 (RequestCredentialIssuance 와 일관)
	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return err
	}
	if err := c.checkPassportAccess(ctx, passport); err != nil {
		return err
	}
	if err := validatePassportHolderDID(passport, holderDid); err != nil {
		return err
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}

	vc := VerifiableCredential{
		DocType:      docTypeVC,
		CredentialID: credentialId,
		PassportID:   passportId,
		CredType:     credType,
		IssuerDID:    issuerDid,
		IssuerMSP:    msp,
		HolderDID:    holderDid,
		SchemaID:     schemaId,
		CredDefID:    credDefId,
		DataHash:     dataHash,
		Status:       "ACTIVE",
		IssuedAt:     now,
		ExpiresAt:    expiresAt,
	}

	vcJSON, err := json.Marshal(vc)
	if err != nil {
		return fmt.Errorf("failed to marshal credential: %v", err)
	}

	return ctx.GetStub().PutState(credentialId, vcJSON)
}

// ============================================================
// 21. RevokeCredential — Revoke a VC
// ============================================================

func (c *PassportContract) RevokeCredential(ctx contractapi.TransactionContextInterface,
	credentialId string, reason string) error {

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	vc, err := c.loadCredential(ctx, credentialId)
	if err != nil {
		return err
	}

	if vc.Status == "REVOKED" {
		return fmt.Errorf("credential %s is already revoked", credentialId)
	}

	// Only the original issuer or RegulatorMSP can revoke
	if msp != vc.IssuerMSP && msp != mspRegulator {
		return fmt.Errorf("access denied: only issuer (%s) or RegulatorMSP can revoke", vc.IssuerMSP)
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	vc.Status = "REVOKED"
	vc.RevokedAt = now
	vc.RevocationReason = reason

	updatedJSON, err := json.Marshal(vc)
	if err != nil {
		return fmt.Errorf("failed to marshal credential: %v", err)
	}

	return ctx.GetStub().PutState(credentialId, updatedJSON)
}

// ============================================================
// 26. VerifyCredentialStatus (all orgs)
// ============================================================

func (c *PassportContract) VerifyCredentialStatus(ctx contractapi.TransactionContextInterface,
	credentialId string) (string, error) {

	vc, err := c.loadCredential(ctx, credentialId)
	if err != nil {
		return "", err
	}

	type verifyResult struct {
		Valid            bool   `json:"valid"`
		Reason           string `json:"reason,omitempty"`
		RevokedAt        string `json:"revokedAt,omitempty"`
		RevocationReason string `json:"revocationReason,omitempty"`
		CredType         string `json:"credType,omitempty"`
		IssuedAt         string `json:"issuedAt,omitempty"`
		IssuerMSP        string `json:"issuerMsp,omitempty"`
	}

	if vc.Status == "REVOKED" {
		r, _ := json.Marshal(verifyResult{Valid: false, Reason: "revoked", RevokedAt: vc.RevokedAt, RevocationReason: vc.RevocationReason})
		return string(r), nil
	}

	if vc.ExpiresAt != "" {
		expiresAt, err := time.Parse(time.RFC3339, vc.ExpiresAt)
		if err != nil {
			return "", fmt.Errorf("invalid expiresAt value on credential %s: %v", credentialId, err)
		}
		tsStr, tsErr := txTimestamp(ctx)
		if tsErr != nil {
			return "", fmt.Errorf("failed to get timestamp: %v", tsErr)
		}
		txNow, _ := time.Parse(time.RFC3339, tsStr)
		if txNow.After(expiresAt) {
			r, _ := json.Marshal(verifyResult{Valid: false, Reason: "expired"})
			return string(r), nil
		}
	}

	r, _ := json.Marshal(verifyResult{Valid: true, CredType: vc.CredType, IssuedAt: vc.IssuedAt, IssuerMSP: vc.IssuerMSP})
	return string(r), nil
}

// ============================================================
// 27. LogCredentialVerification (all orgs)
// ============================================================

func (c *PassportContract) LogCredentialVerification(ctx contractapi.TransactionContextInterface,
	verificationId string, credentialId string, verifierDid string, resultStr string) error {

	if verificationId == "" || credentialId == "" {
		return fmt.Errorf("verificationId and credentialId must not be empty")
	}

	// Check credential exists and has the expected docType.
	if _, err := c.loadCredential(ctx, credentialId); err != nil {
		return err
	}

	// Check duplicate
	existing, err := ctx.GetStub().GetState(verificationId)
	if err != nil {
		return fmt.Errorf("failed to check existing verification: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("verification %s already exists", verificationId)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	result, err := parseStrictBool("result", resultStr)
	if err != nil {
		return err
	}
	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}

	verification := CredentialVerification{
		DocType:        docTypeVerification,
		VerificationID: verificationId,
		CredentialID:   credentialId,
		VerifierDID:    verifierDid,
		VerifierMSP:    msp,
		Result:         result,
		Timestamp:      now,
	}

	verJSON, err := json.Marshal(verification)
	if err != nil {
		return fmt.Errorf("failed to marshal verification: %v", err)
	}

	return ctx.GetStub().PutState(verificationId, verJSON)
}

// ============================================================
// 37. UpdateRegulatoryVerification — 규제 검증 상태 업데이트 (RegulatorMSP only)
// ============================================================

func (c *PassportContract) UpdateRegulatoryVerification(ctx contractapi.TransactionContextInterface,
	passportId string, status string, evidenceIdsJSON string) error {

	if err := c.requireMSP(ctx, mspRegulator); err != nil {
		return err
	}

	// status 값 제한
	validStatuses := map[string]bool{"VERIFIED": true, "PARTIAL": true, "PENDING": true, "FAILED": true}
	if !validStatuses[status] {
		return fmt.Errorf("invalid regulatory status: %s (must be VERIFIED, PARTIAL, PENDING, or FAILED)", status)
	}

	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return err
	}

	// evidenceIds 파싱 및 존재 확인
	var evidenceIds []string
	if err := json.Unmarshal([]byte(evidenceIdsJSON), &evidenceIds); err != nil {
		return fmt.Errorf("invalid evidenceIds JSON: %v", err)
	}
	for _, eid := range evidenceIds {
		vc, err := c.loadCredential(ctx, eid)
		if err != nil {
			return fmt.Errorf("evidence %s is not a valid credential", eid)
		}
		if vc.PassportID != passportId {
			return fmt.Errorf("evidence credential %s belongs to passport %s, not %s", eid, vc.PassportID, passportId)
		}
	}

	msp, mspErr := c.getClientMSP(ctx)
	if mspErr != nil {
		return fmt.Errorf("failed to get client MSP: %v", mspErr)
	}
	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	passport.RegulatoryStatus = status
	passport.RegulatoryVerifiedAt = now
	passport.RegulatoryVerifier = msp
	passport.RegulatoryEvidenceIds = evidenceIds
	passport.UpdatedAt = now

	eventID := fmt.Sprintf("%s:%s", passportId, ctx.GetStub().GetTxID())
	eventKey, err := ctx.GetStub().CreateCompositeKey(docTypeRegulatoryEvent, []string{passportId, eventID})
	if err != nil {
		return fmt.Errorf("failed to create regulatory verification event key: %v", err)
	}
	event := RegulatoryVerificationEvent{
		DocType:     docTypeRegulatoryEvent,
		EventID:     eventID,
		PassportID:  passportId,
		Status:      status,
		VerifierMSP: msp,
		EvidenceIDs: evidenceIds,
		VerifiedAt:  now,
	}
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal regulatory verification event: %v", err)
	}
	if err := ctx.GetStub().PutState(eventKey, eventJSON); err != nil {
		return fmt.Errorf("failed to store regulatory verification event: %v", err)
	}

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}
	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 38. VerifyPhysicalHistory — 실물-이력 일치 검증 (ManufacturerMSP, RegulatorMSP)
// ============================================================

func (c *PassportContract) VerifyPhysicalHistory(ctx contractapi.TransactionContextInterface,
	passportId string, signalsJSON string, reason string) error {

	if err := c.requireMSP(ctx, mspManufacturer, mspRegulator); err != nil {
		return err
	}

	if reason == "" {
		return fmt.Errorf("reason must not be empty")
	}

	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return err
	}

	// signals 파싱 및 키 검증
	var signals map[string]bool
	if err := json.Unmarshal([]byte(signalsJSON), &signals); err != nil {
		return fmt.Errorf("invalid signals JSON: %v", err)
	}
	if len(signals) == 0 {
		return fmt.Errorf("signals must not be empty")
	}
	for key := range signals {
		if !validSignalKeys[key] {
			return fmt.Errorf("unknown signal key: %s (valid: socMatched, didMatched, vinMatched, fcMatched, bmsIdentifierMatched)", key)
		}
	}

	// 자동 status 판정: 모든 signal true → VERIFIED, 하나라도 false → MISMATCH
	verifyStatus := "VERIFIED"
	for _, matched := range signals {
		if !matched {
			verifyStatus = "MISMATCH"
			break
		}
	}

	msp, mspErr := c.getClientMSP(ctx)
	if mspErr != nil {
		return fmt.Errorf("failed to get client MSP: %v", mspErr)
	}
	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	passport.PhysicalVerification = &PhysicalVerification{
		Status:      verifyStatus,
		VerifiedAt:  now,
		VerifierMSP: msp,
		Reason:      reason,
		Signals:     signals,
	}
	passport.UpdatedAt = now

	eventID := fmt.Sprintf("%s:%s", passportId, ctx.GetStub().GetTxID())
	eventKey, err := ctx.GetStub().CreateCompositeKey(docTypePhysicalEvent, []string{passportId, eventID})
	if err != nil {
		return fmt.Errorf("failed to create physical verification event key: %v", err)
	}
	event := PhysicalVerificationEvent{
		DocType:     docTypePhysicalEvent,
		EventID:     eventID,
		PassportID:  passportId,
		Status:      verifyStatus,
		VerifierMSP: msp,
		Reason:      reason,
		Signals:     signals,
		VerifiedAt:  now,
	}
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal physical verification event: %v", err)
	}
	if err := ctx.GetStub().PutState(eventKey, eventJSON); err != nil {
		return fmt.Errorf("failed to store physical verification event: %v", err)
	}

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}
	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 38-2. RecordSourceVerification — oracle/source verification result
// ============================================================

func (c *PassportContract) RecordSourceVerification(ctx contractapi.TransactionContextInterface,
	verificationId string, passportId string, sourceType string, sourceId string,
	dataHash string, resultStr string, detailsJSON string) error {

	if verificationId == "" || passportId == "" || sourceType == "" || sourceId == "" || dataHash == "" {
		return fmt.Errorf("verificationId, passportId, sourceType, sourceId, dataHash must not be empty")
	}
	if err := validateSHA256Hex("dataHash", dataHash); err != nil {
		return err
	}
	result, err := parseStrictBool("result", resultStr)
	if err != nil {
		return err
	}
	details, err := parseExtensionInfoJSON(detailsJSON)
	if err != nil {
		return err
	}

	existing, err := ctx.GetStub().GetState(verificationId)
	if err != nil {
		return fmt.Errorf("failed to check existing source verification: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("source verification %s already exists", verificationId)
	}

	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return err
	}
	if err := c.checkPassportAccess(ctx, passport); err != nil {
		return err
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}
	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}

	verification := SourceVerification{
		DocType:        docTypeSourceVerification,
		VerificationID: verificationId,
		PassportID:     passportId,
		SourceType:     sourceType,
		SourceID:       sourceId,
		DataHash:       dataHash,
		Result:         result,
		Details:        details,
		VerifierMSP:    msp,
		CreatedAt:      now,
	}
	verificationJSON, err := json.Marshal(verification)
	if err != nil {
		return fmt.Errorf("failed to marshal source verification: %v", err)
	}
	return ctx.GetStub().PutState(verificationId, verificationJSON)
}

// ============================================================
// 39. QueryIssuers — 발급기관 목록 조회 (RegulatorMSP only)
// ============================================================

func (c *PassportContract) QueryIssuers(ctx contractapi.TransactionContextInterface) ([]string, error) {
	if err := c.requireMSP(ctx, mspRegulator); err != nil {
		return nil, err
	}
	seen := map[string]bool{}
	var issuers []string
	for _, msps := range credTypeIssuers {
		for _, msp := range msps {
			if !seen[msp] {
				seen[msp] = true
				issuers = append(issuers, msp)
			}
		}
	}
	return issuers, nil
}

// ============================================================
// 40. QueryCredentialTypesByIssuer — 발급기관별 Credential 타입 조회
// ============================================================

func (c *PassportContract) QueryCredentialTypesByIssuer(ctx contractapi.TransactionContextInterface,
	issuerMsp string) ([]string, error) {

	// RegulatorMSP는 전체 조회, 다른 MSP는 본인 조회만
	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get client MSP: %v", err)
	}
	if msp != mspRegulator && msp != issuerMsp {
		return nil, fmt.Errorf("access denied: can only query own issuer types or require RegulatorMSP")
	}

	var types []string
	for credType, msps := range credTypeIssuers {
		for _, m := range msps {
			if m == issuerMsp {
				types = append(types, credType)
				break
			}
		}
	}
	return types, nil
}

// ============================================================
// 41. RequestCredentialIssuance — VC 발급 요청 (모든 MSP)
// ============================================================

func (c *PassportContract) RequestCredentialIssuance(ctx contractapi.TransactionContextInterface,
	requestId string, passportId string, credType string) error {

	if requestId == "" || passportId == "" || credType == "" {
		return fmt.Errorf("requestId, passportId, credType must not be empty")
	}

	// credType 유효성 검증
	targetIssuers, ok := credTypeIssuers[credType]
	if !ok {
		return fmt.Errorf("invalid credential type: %s (allowed: BATTERY_PASSPORT, BATTERY_HEALTH, MAINTENANCE, COMPLIANCE, RECYCLING)", credType)
	}

	// 중복 체크
	existing, err := ctx.GetStub().GetState(requestId)
	if err != nil {
		return fmt.Errorf("failed to check existing request: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("credential request %s already exists", requestId)
	}

	// passport 존재 및 접근 권한 확인
	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return err
	}
	if err := c.checkPassportAccess(ctx, passport); err != nil {
		return err
	}

	msp, mspErr := c.getClientMSP(ctx)
	if mspErr != nil {
		return fmt.Errorf("failed to get client MSP: %v", mspErr)
	}
	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}

	request := CredentialRequest{
		DocType:         docTypeCredRequest,
		RequestID:       requestId,
		PassportID:      passportId,
		CredType:        credType,
		TargetIssuerMsp: targetIssuers[0],
		RequesterMsp:    msp,
		Status:          "PENDING",
		RequestedAt:     now,
	}

	requestJSON, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("failed to marshal credential request: %v", err)
	}
	return ctx.GetStub().PutState(requestId, requestJSON)
}

// ============================================================
// 42. ApproveCredentialIssuance — VC 발급 승인 (대상 IssuerMSP or RegulatorMSP)
// ============================================================

func (c *PassportContract) ApproveCredentialIssuance(ctx contractapi.TransactionContextInterface,
	requestId string) error {

	request, err := c.loadCredentialRequest(ctx, requestId)
	if err != nil {
		return err
	}

	if request.Status != "PENDING" {
		return fmt.Errorf("credential request %s is not pending, current status: %s", requestId, request.Status)
	}

	// RBAC: targetIssuerMsp 또는 RegulatorMSP만 승인 가능
	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}
	if msp != request.TargetIssuerMsp && msp != mspRegulator {
		return fmt.Errorf("access denied: only %s or RegulatorMSP can approve this request", request.TargetIssuerMsp)
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	request.Status = "APPROVED"
	request.ApprovedAt = now
	request.ApproverMsp = msp

	updatedJSON, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("failed to marshal updated request: %v", err)
	}
	return ctx.GetStub().PutState(requestId, updatedJSON)
}

// ============================================================
// 43. RejectCredentialIssuance — VC 발급 거부 (대상 IssuerMSP or RegulatorMSP)
// ============================================================

func (c *PassportContract) RejectCredentialIssuance(ctx contractapi.TransactionContextInterface,
	requestId string, reason string) error {

	if reason == "" {
		return fmt.Errorf("rejection reason must not be empty")
	}

	request, err := c.loadCredentialRequest(ctx, requestId)
	if err != nil {
		return err
	}

	if request.Status != "PENDING" {
		return fmt.Errorf("credential request %s is not pending, current status: %s", requestId, request.Status)
	}

	// RBAC: targetIssuerMsp 또는 RegulatorMSP만 거부 가능
	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}
	if msp != request.TargetIssuerMsp && msp != mspRegulator {
		return fmt.Errorf("access denied: only %s or RegulatorMSP can reject this request", request.TargetIssuerMsp)
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	request.Status = "REJECTED"
	request.RejectedAt = now
	request.RejectedBy = msp
	request.RejectionReason = reason

	updatedJSON, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("failed to marshal updated request: %v", err)
	}
	return ctx.GetStub().PutState(requestId, updatedJSON)
}

// ============================================================
// QueryCredential (all orgs)
// ============================================================

func (c *PassportContract) QueryCredential(ctx contractapi.TransactionContextInterface,
	credentialId string) (*VerifiableCredential, error) {

	vc, err := c.loadCredential(ctx, credentialId)
	if err != nil {
		return nil, err
	}

	// RBAC: credential의 연관 passport 접근 권한 확인
	if vc.PassportID != "" {
		if err := c.checkCredentialAccess(ctx, vc); err != nil {
			return nil, err
		}
	}

	return vc, nil
}

// ============================================================
// 28. GetCredentialHistory
// ============================================================

func (c *PassportContract) GetCredentialHistory(ctx contractapi.TransactionContextInterface,
	credentialId string) ([]string, error) {

	// RBAC: credential 읽어서 연관 passport 접근 권한 확인
	vc, err := c.loadCredential(ctx, credentialId)
	if err != nil {
		return nil, err
	}
	if vc.PassportID != "" {
		if err := c.checkCredentialAccess(ctx, vc); err != nil {
			return nil, err
		}
	}

	historyIterator, err := ctx.GetStub().GetHistoryForKey(credentialId)
	if err != nil {
		return nil, fmt.Errorf("failed to get credential history: %v", err)
	}
	defer historyIterator.Close()

	var history []string
	for historyIterator.HasNext() {
		modification, err := historyIterator.Next()
		if err != nil {
			return nil, err
		}
		if modification.IsDelete {
			history = append(history, `{"deleted":true}`)
		} else {
			history = append(history, string(modification.Value))
		}
	}

	return history, nil
}
