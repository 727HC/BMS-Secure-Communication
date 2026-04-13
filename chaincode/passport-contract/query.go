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

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if passportJSON == nil {
		return nil, fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	if err := c.checkPassportAccess(ctx, &passport); err != nil {
		return nil, err
	}

	normalizePassport(&passport)
	c.mergeSnapshot(ctx, &passport)
	return &passport, nil
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

	var records []*BatteryPassport
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var passport BatteryPassport
		err = json.Unmarshal(queryResponse.Value, &passport)
		if err != nil {
			return nil, err
		}
		normalizePassport(&passport)
		c.mergeSnapshot(ctx, &passport)
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
	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return nil, fmt.Errorf("passport %s does not exist", passportId)
	}
	var passport BatteryPassport
	if err := json.Unmarshal(passportJSON, &passport); err != nil {
		return nil, fmt.Errorf("failed to unmarshal passport: %v", err)
	}
	if err := c.checkPassportAccess(ctx, &passport); err != nil {
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
	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return nil, fmt.Errorf("passport %s does not exist", passportId)
	}
	var passport BatteryPassport
	if err := json.Unmarshal(passportJSON, &passport); err != nil {
		return nil, fmt.Errorf("failed to unmarshal passport: %v", err)
	}
	if err := c.checkPassportAccess(ctx, &passport); err != nil {
		return nil, err
	}

	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s","passportId":"%s"},"sort":[{"timestamp":"desc"}]}`, docTypeBMURecord, sanitizeSelector(passportId))

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, pageSize, bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query BMU records: %v", err)
	}
	defer resultsIterator.Close()

	var records []*BMURecord
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var record BMURecord
		err = json.Unmarshal(queryResponse.Value, &record)
		if err != nil {
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

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s","did":"%s"}}`, docTypePassport, sanitizeSelector(did))

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
		err = json.Unmarshal(queryResponse.Value, &passport)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal passport: %v", err)
		}
		normalizePassport(&passport)
		c.mergeSnapshot(ctx, &passport)
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

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query raw materials: %v", err)
	}
	defer resultsIterator.Close()

	var materials []*RawMaterial
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var material RawMaterial
		err = json.Unmarshal(queryResponse.Value, &material)
		if err != nil {
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

	var materials []*RawMaterial
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var material RawMaterial
		if err := json.Unmarshal(queryResponse.Value, &material); err != nil {
			continue
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
	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return nil, fmt.Errorf("passport %s does not exist", passportId)
	}
	var passport BatteryPassport
	if err := json.Unmarshal(passportJSON, &passport); err != nil {
		return nil, fmt.Errorf("failed to unmarshal passport: %v", err)
	}
	if err := c.checkPassportAccess(ctx, &passport); err != nil {
		return nil, err
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s","passportId":"%s"}}`, docTypeVC, sanitizeSelector(passportId))

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query credentials: %v", err)
	}
	defer resultsIterator.Close()

	var records []*VerifiableCredential
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vc VerifiableCredential
		if err := json.Unmarshal(queryResponse.Value, &vc); err != nil {
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

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s","holderDid":"%s"}}`, docTypeVC, sanitizeSelector(holderDid))

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query credentials: %v", err)
	}
	defer resultsIterator.Close()

	var records []*VerifiableCredential
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vc VerifiableCredential
		if err := json.Unmarshal(queryResponse.Value, &vc); err != nil {
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
		queryString = fmt.Sprintf(`{"selector":{"docType":"%s","credType":"%s"}}`, docTypeVC, sanitizeSelector(credType))
	} else {
		queryString = fmt.Sprintf(`{"selector":{"docType":"%s","credType":"%s","issuerMsp":"%s"}}`, docTypeVC, sanitizeSelector(credType), msp)
	}

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query credentials: %v", err)
	}
	defer resultsIterator.Close()

	var records []*VerifiableCredential
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vc VerifiableCredential
		if err := json.Unmarshal(queryResponse.Value, &vc); err != nil {
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

	var records []*VerifiableCredential
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vc VerifiableCredential
		if err := json.Unmarshal(queryResponse.Value, &vc); err != nil {
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

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return nil, fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	if err := json.Unmarshal(passportJSON, &passport); err != nil {
		return nil, fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	if err := c.checkPassportAccess(ctx, &passport); err != nil {
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
	vcJSON, err := ctx.GetStub().GetState(credentialId)
	if err != nil {
		return nil, fmt.Errorf("failed to read credential: %v", err)
	}
	if vcJSON == nil {
		return nil, fmt.Errorf("credential %s does not exist", credentialId)
	}
	var vc VerifiableCredential
	if err := json.Unmarshal(vcJSON, &vc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal credential: %v", err)
	}
	if vc.PassportID != "" {
		if err := c.checkCredentialAccess(ctx, &vc); err != nil {
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

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s","credentialId":"%s"},"sort":[{"timestamp":"desc"}]}`, docTypeVerification, sanitizeSelector(credentialId))
	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query verifications: %v", err)
	}
	defer resultsIterator.Close()

	var records []*CredentialVerification
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var v CredentialVerification
		if err := json.Unmarshal(queryResponse.Value, &v); err != nil {
			continue
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

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s","verifierDid":"%s"},"sort":[{"timestamp":"desc"}]}`, docTypeVerification, sanitizeSelector(verifierDid))
	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query verifications: %v", err)
	}
	defer resultsIterator.Close()

	var records []*CredentialVerification
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var v CredentialVerification
		if err := json.Unmarshal(queryResponse.Value, &v); err != nil {
			continue
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
