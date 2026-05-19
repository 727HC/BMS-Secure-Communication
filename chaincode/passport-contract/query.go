package main

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// ============================================================
// 13. QueryPassport (RBAC filtered)
// ============================================================

func (c *PassportContract) QueryPassport(ctx contractapi.TransactionContextInterface,
	passportId string) (*BatteryPassport, error) {

	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return nil, err
	}

	if err := c.checkPassportAccess(ctx, passport); err != nil {
		return nil, err
	}

	if err := c.mergeSnapshot(ctx, passport); err != nil {
		return nil, err
	}
	return passport, nil
}

// CheckBMUHotBinding reports whether the DID has a canonical lastFc hot binding.
// It is read-only and exists so benchmark readiness can be proven before write runs.
func (c *PassportContract) CheckBMUHotBinding(ctx contractapi.TransactionContextInterface,
	passportId string, did string) (*BMUHotBindingStatus, error) {

	if passportId == "" || did == "" {
		return nil, fmt.Errorf("passportId and did must not be empty")
	}
	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return nil, err
	}
	if err := c.checkPassportAccess(ctx, passport); err != nil {
		return nil, err
	}
	if passport.DID != did {
		return nil, fmt.Errorf("DID mismatch: passport %s is registered to DID %s, not %s", passportId, passport.DID, did)
	}

	status := &BMUHotBindingStatus{
		PassportID: passportId,
		DID:        did,
		Status:     "unknown",
	}

	key, err := lastFCKey(did)
	if err != nil {
		return nil, fmt.Errorf("failed to create lastFc composite key: %v", err)
	}
	raw, err := ctx.GetStub().GetState(key)
	if err != nil {
		return nil, fmt.Errorf("failed to read lastFc for DID %s: %v", did, err)
	}
	if raw == nil {
		status.Status = "missing"
		status.Missing = true
		return status, nil
	}

	boundPassportID, fc, hasFC, legacyNumeric, err := decodeLastFCBinding(raw)
	if err != nil {
		status.Status = "malformed"
		status.Legacy = legacyNumeric
		status.DecodeError = err.Error()
		return status, nil
	}
	if legacyNumeric {
		status.Status = "legacy"
		status.FC = fc
		status.HasFC = hasFC
		status.Legacy = true
		return status, nil
	}

	status.BoundPassportID = boundPassportID
	status.FC = fc
	status.HasFC = hasFC
	if boundPassportID != passportId {
		status.Status = "mismatch"
		status.Mismatch = true
		return status, nil
	}
	status.Status = "canonical"
	return status, nil
}

// ============================================================
// 14. QueryAllPassports (all orgs)
// ============================================================

func (c *PassportContract) QueryAllPassports(ctx contractapi.TransactionContextInterface) (*PaginatedPassportResult, error) {
	return c.QueryPassportsWithPagination(ctx, defaultPageSize, "")
}

// ============================================================
// 15. QueryPassportsWithPagination (RBAC filtered)
// ============================================================

func (c *PassportContract) QueryPassportsWithPagination(ctx contractapi.TransactionContextInterface,
	pageSize int32, bookmark string) (*PaginatedPassportResult, error) {

	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}

	queryString, err := c.buildPassportQuery(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %v", err)
	}

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, pageSize, bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query passports: %v", err)
	}
	defer resultsIterator.Close()

	records := []*BatteryPassport{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var passport BatteryPassport
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypePassport, &passport); err != nil {
			return nil, err
		}
		normalizePassport(&passport)
		if err := c.mergeSnapshot(ctx, &passport); err != nil {
			return nil, err
		}
		records = append(records, &passport)
	}

	return &PaginatedPassportResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 16. GetPassportHistory (RBAC filtered)
// ============================================================

func (c *PassportContract) GetPassportHistory(ctx contractapi.TransactionContextInterface,
	passportId string) ([]string, error) {

	// Access check: read current passport to verify permission
	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return nil, err
	}
	if err := c.checkPassportAccess(ctx, passport); err != nil {
		return nil, err
	}

	historyIterator, err := ctx.GetStub().GetHistoryForKey(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to get history: %v", err)
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
			var p BatteryPassport
			if err := json.Unmarshal(modification.Value, &p); err == nil {
				normalizePassport(&p)
				normalized, _ := json.Marshal(p)
				history = append(history, string(normalized))
			} else {
				history = append(history, string(modification.Value))
			}
		}
	}

	return history, nil
}

// ============================================================
// 17. QueryBMURecordsByPassport (RBAC filtered)
// ============================================================

func (c *PassportContract) QueryBMURecordsByPassport(ctx contractapi.TransactionContextInterface,
	passportId string, pageSize int32, bookmark string) (*PaginatedBMUResult, error) {

	// Access check: verify caller can access the parent passport
	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return nil, err
	}
	if err := c.checkPassportAccess(ctx, passport); err != nil {
		return nil, err
	}

	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}

	queryString, err := buildQuery(
		map[string]interface{}{
			"docType":    docTypeBMURecord,
			"passportId": passportId,
		},
		map[string]interface{}{
			"sort": []map[string]string{{"timestamp": "desc"}},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %v", err)
	}

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, pageSize, bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query BMU records: %v", err)
	}
	defer resultsIterator.Close()

	records := []*BMURecord{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var record BMURecord
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypeBMURecord, &record); err != nil {
			return nil, err
		}
		records = append(records, &record)
	}

	return &PaginatedBMUResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 18. QueryBatteryByDID (ManufacturerMSP, RegulatorMSP)
// ============================================================

func (c *PassportContract) QueryBatteryByDID(ctx contractapi.TransactionContextInterface,
	did string) (*BatteryPassport, error) {

	if err := c.requireMSP(ctx, mspManufacturer, mspRegulator); err != nil {
		return nil, err
	}

	queryString, err := buildQuery(map[string]interface{}{
		"docType": docTypePassport,
		"did":     did,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %v", err)
	}

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query battery by DID: %v", err)
	}
	defer resultsIterator.Close()

	if resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var passport BatteryPassport
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypePassport, &passport); err != nil {
			return nil, err
		}
		normalizePassport(&passport)
		if err := c.mergeSnapshot(ctx, &passport); err != nil {
			return nil, err
		}
		return &passport, nil
	}

	return nil, fmt.Errorf("no passport found for DID %s", did)
}

// ============================================================
// 19. QueryRawMaterials (ManufacturerMSP, RegulatorMSP)
// ============================================================

func (c *PassportContract) QueryRawMaterials(ctx contractapi.TransactionContextInterface) ([]*RawMaterial, error) {

	if err := c.requireMSP(ctx, mspManufacturer, mspRegulator); err != nil {
		return nil, err
	}

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s"}}`, docTypeRawMaterial)

	// M-3: 페이지네이션 없는 전체 조회는 기본 상한 적용 (상태 비대화 방어)
	resultsIterator, _, err := ctx.GetStub().GetQueryResultWithPagination(queryString, defaultPageSize, "")
	if err != nil {
		return nil, fmt.Errorf("failed to query raw materials: %v", err)
	}
	defer resultsIterator.Close()

	materials := []*RawMaterial{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var material RawMaterial
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypeRawMaterial, &material); err != nil {
			return nil, err
		}
		materials = append(materials, &material)
	}

	return materials, nil
}

// ============================================================
// 19-2. QueryRawMaterialsWithPagination — 원자재 목록 페이지네이션
// ============================================================

func (c *PassportContract) QueryRawMaterialsWithPagination(ctx contractapi.TransactionContextInterface,
	pageSizeStr string, bookmark string) (*PaginatedMaterialResult, error) {

	if err := c.requireMSP(ctx, mspManufacturer, mspRegulator); err != nil {
		return nil, err
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s"}}`, docTypeRawMaterial)
	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query raw materials: %v", err)
	}
	defer resultsIterator.Close()

	materials := []*RawMaterial{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var material RawMaterial
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypeRawMaterial, &material); err != nil {
			return nil, err
		}
		materials = append(materials, &material)
	}
	if materials == nil {
		materials = []*RawMaterial{}
	}

	return &PaginatedMaterialResult{
		Records:  materials,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 23. QueryCredentialsByPassport (RBAC filtered)
// ============================================================

func (c *PassportContract) QueryCredentialsByPassport(ctx contractapi.TransactionContextInterface,
	passportId string, pageSizeStr string, bookmark string) (*PaginatedVCResult, error) {

	// Access check on parent passport
	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return nil, err
	}
	if err := c.checkPassportAccess(ctx, passport); err != nil {
		return nil, err
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	queryString, err := buildQuery(map[string]interface{}{
		"docType":    docTypeVC,
		"passportId": passportId,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %v", err)
	}

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query credentials: %v", err)
	}
	defer resultsIterator.Close()

	records := []*VerifiableCredential{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vc VerifiableCredential
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypeVC, &vc); err != nil {
			return nil, err
		}
		records = append(records, &vc)
	}

	return &PaginatedVCResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 24. QueryCredentialsByHolder (ManufacturerMSP, RegulatorMSP)
// ============================================================

func (c *PassportContract) QueryCredentialsByHolder(ctx contractapi.TransactionContextInterface,
	holderDid string, pageSizeStr string, bookmark string) (*PaginatedVCResult, error) {

	if err := c.requireMSP(ctx, mspManufacturer, mspRegulator); err != nil {
		return nil, err
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	queryString, err := buildQuery(map[string]interface{}{
		"docType":   docTypeVC,
		"holderDid": holderDid,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %v", err)
	}

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query credentials: %v", err)
	}
	defer resultsIterator.Close()

	records := []*VerifiableCredential{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vc VerifiableCredential
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypeVC, &vc); err != nil {
			return nil, err
		}
		records = append(records, &vc)
	}

	return &PaginatedVCResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 25. QueryCredentialsByType (all orgs, filtered by MSP)
// ============================================================

func (c *PassportContract) QueryCredentialsByType(ctx contractapi.TransactionContextInterface,
	credType string, pageSizeStr string, bookmark string) (*PaginatedVCResult, error) {

	if _, ok := credTypeIssuers[credType]; !ok {
		return nil, fmt.Errorf("invalid credential type: %s", credType)
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get client MSP: %v", err)
	}

	var queryString string
	if msp == mspRegulator {
		qs, qErr := buildQuery(map[string]interface{}{
			"docType":  docTypeVC,
			"credType": credType,
		})
		if qErr != nil {
			return nil, fmt.Errorf("failed to build query: %v", qErr)
		}
		queryString = qs
	} else {
		qs, qErr := buildQuery(map[string]interface{}{
			"docType":   docTypeVC,
			"credType":  credType,
			"issuerMsp": msp,
		})
		if qErr != nil {
			return nil, fmt.Errorf("failed to build query: %v", qErr)
		}
		queryString = qs
	}

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query credentials: %v", err)
	}
	defer resultsIterator.Close()

	records := []*VerifiableCredential{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vc VerifiableCredential
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypeVC, &vc); err != nil {
			return nil, err
		}
		records = append(records, &vc)
	}

	return &PaginatedVCResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 29. QueryRevokedCredentials (RegulatorMSP only)
// ============================================================

func (c *PassportContract) QueryRevokedCredentials(ctx contractapi.TransactionContextInterface,
	pageSizeStr string, bookmark string) (*PaginatedVCResult, error) {

	if err := c.requireMSP(ctx, mspRegulator); err != nil {
		return nil, err
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s","status":"REVOKED"}}`, docTypeVC)

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query revoked credentials: %v", err)
	}
	defer resultsIterator.Close()

	records := []*VerifiableCredential{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vc VerifiableCredential
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypeVC, &vc); err != nil {
			return nil, err
		}
		records = append(records, &vc)
	}

	return &PaginatedVCResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 32. QueryCorrectionHistory — 배터리여권 정정 이력 조회
// ============================================================

func (c *PassportContract) QueryCorrectionHistory(ctx contractapi.TransactionContextInterface,
	passportId string) ([]CorrectionLog, error) {

	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return nil, err
	}

	if err := c.checkPassportAccess(ctx, passport); err != nil {
		return nil, err
	}

	return passport.CorrectionLogs, nil
}

// ============================================================
// 35. QueryVerificationsByCredential — VC 검증 이력 조회 (credential별)
// ============================================================

func (c *PassportContract) QueryVerificationsByCredential(ctx contractapi.TransactionContextInterface,
	credentialId string, pageSizeStr string, bookmark string) (*PaginatedVerificationResult, error) {

	// RBAC: credential의 연관 passport 접근 권한 확인
	vc, err := c.loadCredential(ctx, credentialId)
	if err != nil {
		return nil, err
	}
	if vc.PassportID != "" {
		if err := c.checkCredentialAccess(ctx, vc); err != nil {
			return nil, err
		}
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	queryString, err := buildQuery(
		map[string]interface{}{
			"docType":      docTypeVerification,
			"credentialId": credentialId,
		},
		map[string]interface{}{
			"sort": []map[string]string{{"timestamp": "desc"}},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %v", err)
	}
	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query verifications: %v", err)
	}
	defer resultsIterator.Close()

	records := []*CredentialVerification{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var v CredentialVerification
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypeVerification, &v); err != nil {
			return nil, err
		}
		records = append(records, &v)
	}
	if records == nil {
		records = []*CredentialVerification{}
	}

	return &PaginatedVerificationResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 36. QueryVerificationsByVerifier — 검증자별 검증 이력 조회 (RegulatorMSP only)
// ============================================================

func (c *PassportContract) QueryVerificationsByVerifier(ctx contractapi.TransactionContextInterface,
	verifierDid string, pageSizeStr string, bookmark string) (*PaginatedVerificationResult, error) {

	if err := c.requireMSP(ctx, mspRegulator); err != nil {
		return nil, err
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	queryString, err := buildQuery(
		map[string]interface{}{
			"docType":     docTypeVerification,
			"verifierDid": verifierDid,
		},
		map[string]interface{}{
			"sort": []map[string]string{{"timestamp": "desc"}},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %v", err)
	}
	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query verifications: %v", err)
	}
	defer resultsIterator.Close()

	records := []*CredentialVerification{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var v CredentialVerification
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypeVerification, &v); err != nil {
			return nil, err
		}
		records = append(records, &v)
	}
	if records == nil {
		records = []*CredentialVerification{}
	}

	return &PaginatedVerificationResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 36-2. QuerySourceVerificationsByPassport — source/oracle 검증 이력
// ============================================================

func (c *PassportContract) QuerySourceVerificationsByPassport(ctx contractapi.TransactionContextInterface,
	passportId string, pageSizeStr string, bookmark string) (*PaginatedSourceVerificationResult, error) {

	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return nil, err
	}
	if err := c.checkPassportAccess(ctx, passport); err != nil {
		return nil, err
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	queryString, err := buildQuery(
		map[string]interface{}{
			"docType":    docTypeSourceVerification,
			"passportId": passportId,
		},
		map[string]interface{}{
			"sort": []map[string]string{{"createdAt": "desc"}},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %v", err)
	}
	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query source verifications: %v", err)
	}
	defer resultsIterator.Close()

	records := []*SourceVerification{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var v SourceVerification
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypeSourceVerification, &v); err != nil {
			return nil, err
		}
		records = append(records, &v)
	}
	if records == nil {
		records = []*SourceVerification{}
	}

	return &PaginatedSourceVerificationResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 36-3. QueryRegulatoryVerificationHistory — 규제 검증 이벤트 이력
// ============================================================

func (c *PassportContract) QueryRegulatoryVerificationHistory(ctx contractapi.TransactionContextInterface,
	passportId string, pageSizeStr string, bookmark string) (*PaginatedRegulatoryVerificationResult, error) {

	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return nil, err
	}
	if err := c.checkPassportAccess(ctx, passport); err != nil {
		return nil, err
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	queryString, err := buildQuery(
		map[string]interface{}{
			"docType":    docTypeRegulatoryEvent,
			"passportId": passportId,
		},
		map[string]interface{}{
			"sort": []map[string]string{{"verifiedAt": "desc"}},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %v", err)
	}
	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query regulatory verification history: %v", err)
	}
	defer resultsIterator.Close()

	records := []*RegulatoryVerificationEvent{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var v RegulatoryVerificationEvent
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypeRegulatoryEvent, &v); err != nil {
			return nil, err
		}
		records = append(records, &v)
	}
	if records == nil {
		records = []*RegulatoryVerificationEvent{}
	}

	return &PaginatedRegulatoryVerificationResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 36-4. QueryPhysicalVerificationHistory — 실물 검증 이벤트 이력
// ============================================================

func (c *PassportContract) QueryPhysicalVerificationHistory(ctx contractapi.TransactionContextInterface,
	passportId string, pageSizeStr string, bookmark string) (*PaginatedPhysicalVerificationResult, error) {

	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return nil, err
	}
	if err := c.checkPassportAccess(ctx, passport); err != nil {
		return nil, err
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	queryString, err := buildQuery(
		map[string]interface{}{
			"docType":    docTypePhysicalEvent,
			"passportId": passportId,
		},
		map[string]interface{}{
			"sort": []map[string]string{{"verifiedAt": "desc"}},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %v", err)
	}
	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query physical verification history: %v", err)
	}
	defer resultsIterator.Close()

	records := []*PhysicalVerificationEvent{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var v PhysicalVerificationEvent
		if err := unmarshalTypedState(queryResponse.Key, queryResponse.Value, docTypePhysicalEvent, &v); err != nil {
			return nil, err
		}
		records = append(records, &v)
	}
	if records == nil {
		records = []*PhysicalVerificationEvent{}
	}

	return &PaginatedPhysicalVerificationResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}
