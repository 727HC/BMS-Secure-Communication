package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// ============================================================
// 1. RegisterRawMaterial (ManufacturerMSP only)
// ============================================================

func (c *PassportContract) RegisterRawMaterial(ctx contractapi.TransactionContextInterface,
	materialId string, name string, origin string, supplier string,
	quantity string, unit string, certificationId string) error {

	if err := c.requireMSP(ctx, mspManufacturer); err != nil {
		return err
	}

	if materialId == "" || name == "" || origin == "" {
		return fmt.Errorf("materialId, name, origin must not be empty")
	}

	existing, err := ctx.GetStub().GetState(materialId)
	if err != nil {
		return fmt.Errorf("failed to check existing raw material: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("raw material %s already exists", materialId)
	}

	quantityVal, err := strconv.ParseFloat(quantity, 64)
	if err != nil {
		return fmt.Errorf("invalid quantity value: %v", err)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}

	material := RawMaterial{
		DocType:         docTypeRawMaterial,
		MaterialID:      materialId,
		Name:            name,
		Origin:          origin,
		Supplier:        supplier,
		Quantity:        quantityVal,
		Unit:            unit,
		CertificationID: certificationId,
		CreatedAt:       now,
		CreatorMSP:      msp,
	}

	materialJSON, err := json.Marshal(material)
	if err != nil {
		return fmt.Errorf("failed to marshal raw material: %v", err)
	}

	return ctx.GetStub().PutState(materialId, materialJSON)
}

// ============================================================
// 2. CreateBatteryPassport (ManufacturerMSP only)
// ============================================================

func (c *PassportContract) CreateBatteryPassport(ctx contractapi.TransactionContextInterface,
	passportId string, batteryId string, did string,
	model string, serialNumber string,
	manufacturerName string, manufactureCountry string,
	cellManufacturer string, cellManufactureCountry string,
	manufactureDate string, cellType string, chemistry string,
	cellCount string, weight string, totalEnergy string,
	energyDensity string, ratedCapacity string, expectedLifespan string,
	voltageRange string, temperatureRange string,
	carbonFootprint string) error {

	if err := c.requireMSP(ctx, mspManufacturer); err != nil {
		return err
	}

	if passportId == "" || batteryId == "" || did == "" || serialNumber == "" {
		return fmt.Errorf("passportId, batteryId, did, serialNumber must not be empty")
	}

	existing, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to check existing passport: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("passport %s already exists", passportId)
	}

	cellCountVal, err := strconv.Atoi(cellCount)
	if err != nil {
		return fmt.Errorf("invalid cellCount value: %v", err)
	}
	if cellCountVal < 0 {
		return fmt.Errorf("cellCount must be non-negative, got %d", cellCountVal)
	}

	weightVal, err := strconv.ParseFloat(weight, 64)
	if err != nil {
		return fmt.Errorf("invalid weight value: %v", err)
	}
	if weightVal < 0 {
		return fmt.Errorf("weight must be non-negative, got %f", weightVal)
	}

	totalEnergyVal, err := strconv.ParseFloat(totalEnergy, 64)
	if err != nil {
		return fmt.Errorf("invalid totalEnergy value: %v", err)
	}
	if totalEnergyVal < 0 {
		return fmt.Errorf("totalEnergy must be non-negative, got %f", totalEnergyVal)
	}

	energyDensityVal, err := strconv.ParseFloat(energyDensity, 64)
	if err != nil {
		return fmt.Errorf("invalid energyDensity value: %v", err)
	}
	if energyDensityVal < 0 {
		return fmt.Errorf("energyDensity must be non-negative, got %f", energyDensityVal)
	}

	ratedCapacityVal, err := strconv.ParseFloat(ratedCapacity, 64)
	if err != nil {
		return fmt.Errorf("invalid ratedCapacity value: %v", err)
	}
	if ratedCapacityVal < 0 {
		return fmt.Errorf("ratedCapacity must be non-negative, got %f", ratedCapacityVal)
	}

	expectedLifespanVal, err := strconv.Atoi(expectedLifespan)
	if err != nil {
		return fmt.Errorf("invalid expectedLifespan value: %v", err)
	}
	if expectedLifespanVal < 0 {
		return fmt.Errorf("expectedLifespan must be non-negative, got %d", expectedLifespanVal)
	}

	carbonFootprintVal, err := strconv.ParseFloat(carbonFootprint, 64)
	if err != nil {
		carbonFootprintVal = 0 // optional — 미입력 시 0
	}
	if carbonFootprintVal < 0 {
		return fmt.Errorf("carbonFootprint must be non-negative, got %f", carbonFootprintVal)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}

	passport := BatteryPassport{
		DocType:                docTypePassport,
		PassportID:             passportId,
		BatteryID:              batteryId,
		DID:                    did,
		Model:                  model,
		SerialNumber:           serialNumber,
		ManufacturerName:       manufacturerName,
		ManufactureCountry:     manufactureCountry,
		CellManufacturer:       cellManufacturer,
		CellManufactureCountry: cellManufactureCountry,
		ManufactureDate:        manufactureDate,
		CellType:               cellType,
		Chemistry:              chemistry,
		CellCount:              cellCountVal,
		Weight:                 weightVal,
		TotalEnergy:            totalEnergyVal,
		EnergyDensity:          energyDensityVal,
		RatedCapacity:          ratedCapacityVal,
		ExpectedLifespan:       expectedLifespanVal,
		VoltageRange:           voltageRange,
		TemperatureRange:       temperatureRange,
		CarbonFootprint:        carbonFootprintVal,
		RawMaterials:           []string{},
		RecyclingRates:         map[string]float64{},
		RecycledElementContent: map[string]float64{},
		ExtensionInfo:          map[string]string{},
		CurrentSOH:             100,
		Status:                 "MANUFACTURED",
		MaintenanceLogs:        []MaintenanceLog{},
		AccidentLogs:           []AccidentLog{},
		CorrectionLogs:         []CorrectionLog{},
		RegulatoryEvidenceIds:  []string{},
		CreatedAt:              now,
		UpdatedAt:              now,
		CreatorMSP:             msp,
	}

	passportJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, passportJSON)
}

// ============================================================
// 4. BindToVehicle (EVManufacturerMSP only)
// ============================================================

func (c *PassportContract) BindToVehicle(ctx contractapi.TransactionContextInterface,
	passportId string, vin string, installDate string,
	evManufacturer string, evAssemblyCountry string) error {

	if err := c.requireMSP(ctx, mspEVManufacturer); err != nil {
		return err
	}

	// M-3: VIN/passportId 필수 입력 검증
	if passportId == "" {
		return fmt.Errorf("passportId must not be empty")
	}
	if vin == "" {
		return fmt.Errorf("vin must not be empty")
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	if passport.Status != "MANUFACTURED" && passport.Status != "ACTIVE" {
		return fmt.Errorf("passport status must be MANUFACTURED or ACTIVE, current: %s", passport.Status)
	}
	if passport.Status == "ACTIVE" && passport.VIN != "" {
		return fmt.Errorf("passport %s already bound to VIN %s; unbind first", passportId, passport.VIN)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	passport.VIN = vin
	passport.InstallDate = installDate
	passport.EVManufacturer = evManufacturer
	passport.EVAssemblyCountry = evAssemblyCountry
	passport.EvBinderMSP = msp
	passport.Status = "ACTIVE"
	passport.UpdatedAt = now

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 5. RequestMaintenance (EVManufacturerMSP only)
// ============================================================

func (c *PassportContract) RequestMaintenance(ctx contractapi.TransactionContextInterface,
	passportId string, maintenanceType string, description string) error {

	if err := c.requireMSP(ctx, mspEVManufacturer); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	if passport.Status != "ACTIVE" {
		return fmt.Errorf("passport status must be ACTIVE for maintenance request, current: %s", passport.Status)
	}

	msp, mspErr := c.getClientMSP(ctx)
	if mspErr != nil {
		return fmt.Errorf("failed to get client MSP: %v", mspErr)
	}
	// P1 ownership: 바인딩한 EVManufacturer 만 정비 요청 가능
	if passport.EvBinderMSP != msp {
		return fmt.Errorf("access denied: passport %s is bound to %s, caller %s cannot request maintenance", passportId, passport.EvBinderMSP, msp)
	}
	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	requestLog := MaintenanceLog{
		Date:        now,
		Type:        maintenanceType,
		Description: description,
		OrgMSP:      msp,
	}
	passport.MaintenanceLogs = append(passport.MaintenanceLogs, requestLog)
	passport.Status = "MAINTENANCE"
	passport.UpdatedAt = now

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 6. AddMaintenanceLog (ServiceMSP only)
// ============================================================

func (c *PassportContract) AddMaintenanceLog(ctx contractapi.TransactionContextInterface,
	passportId string, maintenanceType string, description string, technician string) error {

	if err := c.requireMSP(ctx, mspService); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	log := MaintenanceLog{
		Date:        now,
		Type:        maintenanceType,
		Description: description,
		Technician:  technician,
		OrgMSP:      msp,
	}

	if passport.Status != "MAINTENANCE" && passport.Status != "ACTIVE" {
		return fmt.Errorf("cannot add maintenance log: passport status must be MAINTENANCE or ACTIVE, current: %s", passport.Status)
	}

	passport.MaintenanceLogs = append(passport.MaintenanceLogs, log)
	passport.Status = "ACTIVE"
	passport.UpdatedAt = now

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 7. AddAccidentLog (EVManufacturerMSP or ServiceMSP)
// ============================================================

func (c *PassportContract) AddAccidentLog(ctx contractapi.TransactionContextInterface,
	passportId string, severity string, description string, reporter string) error {

	if err := c.requireMSP(ctx, mspEVManufacturer, mspService); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	// P1 ownership: EVManufacturer 는 바인더 본인, Service 는 정비 이력 보유 시만
	switch msp {
	case mspEVManufacturer:
		if passport.EvBinderMSP != msp {
			return fmt.Errorf("access denied: passport %s is bound to %s, caller %s cannot log accidents", passportId, passport.EvBinderMSP, msp)
		}
	case mspService:
		if err := c.checkPassportAccess(ctx, &passport); err != nil {
			return err
		}
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	accidentLog := AccidentLog{
		Date:        now,
		Severity:    severity,
		Description: description,
		Reporter:    reporter,
		OrgMSP:      msp,
	}

	passport.AccidentLogs = append(passport.AccidentLogs, accidentLog)
	passport.UpdatedAt = now

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 8. RequestAnalysis (EVManufacturerMSP only)
// ============================================================

func (c *PassportContract) RequestAnalysis(ctx contractapi.TransactionContextInterface,
	passportId string) error {

	if err := c.requireMSP(ctx, mspEVManufacturer); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	if passport.Status != "ACTIVE" && passport.Status != "MAINTENANCE" {
		return fmt.Errorf("passport status must be ACTIVE or MAINTENANCE for analysis request, current: %s", passport.Status)
	}

	// P1 ownership: 바인딩한 EVManufacturer 만 분석 요청 가능
	msp, mspErr := c.getClientMSP(ctx)
	if mspErr != nil {
		return fmt.Errorf("failed to get client MSP: %v", mspErr)
	}
	if passport.EvBinderMSP != msp {
		return fmt.Errorf("access denied: passport %s is bound to %s, caller %s cannot request analysis", passportId, passport.EvBinderMSP, msp)
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	passport.Status = "ANALYSIS"
	passport.UpdatedAt = now

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 9. SubmitAnalysisResult (ServiceMSP only)
// ============================================================

func (c *PassportContract) SubmitAnalysisResult(ctx contractapi.TransactionContextInterface,
	passportId string, soh string, soce string,
	remainingLifeCycle string, recycleAvailable string) error {

	if err := c.requireMSP(ctx, mspService); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	if passport.Status != "ANALYSIS" {
		return fmt.Errorf("passport status must be ANALYSIS for result submission, current: %s", passport.Status)
	}

	sohVal, err := strconv.ParseFloat(soh, 64)
	if err != nil {
		return fmt.Errorf("invalid soh value: %v", err)
	}
	if sohVal < 0 || sohVal > 100 {
		return fmt.Errorf("soh must be in [0, 100], got %f", sohVal)
	}

	soceVal, err := strconv.ParseFloat(soce, 64)
	if err != nil {
		return fmt.Errorf("invalid soce value: %v", err)
	}
	if soceVal < 0 || soceVal > 100 {
		return fmt.Errorf("soce must be in [0, 100], got %f", soceVal)
	}

	remainingLifeCycleVal, err := strconv.Atoi(remainingLifeCycle)
	if err != nil {
		return fmt.Errorf("invalid remainingLifeCycle value: %v", err)
	}
	if remainingLifeCycleVal < 0 {
		return fmt.Errorf("remainingLifeCycle must be non-negative, got %d", remainingLifeCycleVal)
	}

	recycleAvailableVal := strings.ToLower(recycleAvailable) == "true"

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	passport.CurrentSOH = sohVal
	passport.SOCE = soceVal
	passport.RemainingLifeCycle = remainingLifeCycleVal
	passport.RecycleAvailable = recycleAvailableVal
	passport.Status = "ACTIVE"
	passport.UpdatedAt = now

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 10. SetRecycleAvailability (ServiceMSP or RegulatorMSP)
// ============================================================

func (c *PassportContract) SetRecycleAvailability(ctx contractapi.TransactionContextInterface,
	passportId string, available string) error {

	if err := c.requireMSP(ctx, mspService, mspRegulator); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	// P2-5: DISPOSED 여권은 recycle availability 변경 불가 (기존 PRECONDITION 패턴)
	if passport.Status == "DISPOSED" {
		return fmt.Errorf("passport status must be ACTIVE or ANALYSIS or RECYCLING for recycle availability change, current: %s", passport.Status)
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	passport.RecycleAvailable = strings.ToLower(available) == "true"
	passport.UpdatedAt = now

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 11. ExtractMaterials (RegulatorMSP only)
// ============================================================

func (c *PassportContract) ExtractMaterials(ctx contractapi.TransactionContextInterface,
	passportId string, recyclingRatesJSON string) error {

	if err := c.requireMSP(ctx, mspRegulator); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	if passport.Status != "ACTIVE" && passport.Status != "ANALYSIS" {
		return fmt.Errorf("extract requires ACTIVE or ANALYSIS status, current: %s", passport.Status)
	}

	var recyclingRates map[string]float64
	err = json.Unmarshal([]byte(recyclingRatesJSON), &recyclingRates)
	if err != nil {
		return fmt.Errorf("invalid recycling rates JSON: %v", err)
	}

	// P2-4: 각 element 의 비율은 [0, 1] 범위
	for material, rate := range recyclingRates {
		if rate < 0 || rate > 1 {
			return fmt.Errorf("invalid recycling rate for %s: must be in [0, 1], got %f", material, rate)
		}
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	passport.RecyclingRates = recyclingRates
	passport.Status = "RECYCLING"
	passport.UpdatedAt = now

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 12. DisposeBattery (RegulatorMSP only)
// ============================================================

func (c *PassportContract) DisposeBattery(ctx contractapi.TransactionContextInterface,
	passportId string) error {

	if err := c.requireMSP(ctx, mspRegulator); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	if passport.Status == "DISPOSED" {
		return fmt.Errorf("passport %s is already disposed", passportId)
	}
	if passport.Status == "MANUFACTURED" {
		return fmt.Errorf("passport %s has not been activated yet", passportId)
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	passport.Status = "DISPOSED"
	passport.UpdatedAt = now

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 30. CorrectPassportData — 배터리여권 필드 정정 (감사 기록 포함)
// ============================================================

func (c *PassportContract) CorrectPassportData(ctx contractapi.TransactionContextInterface,
	passportId string, fieldName string, newValue string, reason string) error {

	if passportId == "" || fieldName == "" || newValue == "" || reason == "" {
		return fmt.Errorf("passportId, fieldName, newValue, reason must not be empty")
	}

	// 필드별 권한 확인
	allowedMSPs, fieldExists := fieldCorrectors[fieldName]
	if !fieldExists {
		return fmt.Errorf("field '%s' is not correctable", fieldName)
	}
	if err := c.requireMSP(ctx, allowedMSPs...); err != nil {
		return fmt.Errorf("MSP not authorized to correct field '%s': %v", fieldName, err)
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	if err := json.Unmarshal(passportJSON, &passport); err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	// Ownership 검증 — fieldCorrectors 가 MSP 종류만 본 후, 호출자가 실제로
	// 해당 여권의 발급자/바인더인지 확인. Regulator 는 보편 corrector 라 통과.
	// requireMSP 가 이미 fieldCorrectors[fieldName] 으로 MSP 종류를 좁혔으므로
	// 여기서 만나는 msp 는 Manufacturer / EVManufacturer / Regulator 셋 뿐.
	switch msp {
	case mspManufacturer:
		if passport.CreatorMSP != msp {
			return fmt.Errorf("access denied: passport %s was created by %s, caller %s cannot correct it", passportId, passport.CreatorMSP, msp)
		}
	case mspEVManufacturer:
		if passport.EvBinderMSP != msp {
			return fmt.Errorf("access denied: passport %s was bound by %s, caller %s cannot correct EV fields", passportId, passport.EvBinderMSP, msp)
		}
	}

	// 정정 가능한 필드 목록 및 원래 값 추출
	var originalValue string
	switch fieldName {
	// Manufacturer fields
	case "model":
		originalValue = passport.Model
		passport.Model = newValue
	case "serialNumber":
		originalValue = passport.SerialNumber
		passport.SerialNumber = newValue
	case "manufacturerName":
		originalValue = passport.ManufacturerName
		passport.ManufacturerName = newValue
	case "manufactureCountry":
		originalValue = passport.ManufactureCountry
		passport.ManufactureCountry = newValue
	case "cellManufacturer":
		originalValue = passport.CellManufacturer
		passport.CellManufacturer = newValue
	case "cellManufactureCountry":
		originalValue = passport.CellManufactureCountry
		passport.CellManufactureCountry = newValue
	case "manufactureDate":
		originalValue = passport.ManufactureDate
		passport.ManufactureDate = newValue
	case "cellType":
		originalValue = passport.CellType
		passport.CellType = newValue
	case "chemistry":
		originalValue = passport.Chemistry
		passport.Chemistry = newValue
	case "voltageRange":
		originalValue = passport.VoltageRange
		passport.VoltageRange = newValue
	case "temperatureRange":
		originalValue = passport.TemperatureRange
		passport.TemperatureRange = newValue
	case "cellCount":
		originalValue = strconv.Itoa(passport.CellCount)
		val, err := strconv.Atoi(newValue)
		if err != nil {
			return fmt.Errorf("invalid cellCount value: %v", err)
		}
		passport.CellCount = val
	case "weight":
		originalValue = fmt.Sprintf("%f", passport.Weight)
		val, err := strconv.ParseFloat(newValue, 64)
		if err != nil {
			return fmt.Errorf("invalid weight value: %v", err)
		}
		passport.Weight = val
	case "totalEnergy":
		originalValue = fmt.Sprintf("%f", passport.TotalEnergy)
		val, err := strconv.ParseFloat(newValue, 64)
		if err != nil {
			return fmt.Errorf("invalid totalEnergy value: %v", err)
		}
		passport.TotalEnergy = val
	case "energyDensity":
		originalValue = fmt.Sprintf("%f", passport.EnergyDensity)
		val, err := strconv.ParseFloat(newValue, 64)
		if err != nil {
			return fmt.Errorf("invalid energyDensity value: %v", err)
		}
		passport.EnergyDensity = val
	case "ratedCapacity":
		originalValue = fmt.Sprintf("%f", passport.RatedCapacity)
		val, err := strconv.ParseFloat(newValue, 64)
		if err != nil {
			return fmt.Errorf("invalid ratedCapacity value: %v", err)
		}
		passport.RatedCapacity = val
	case "expectedLifespan":
		originalValue = strconv.Itoa(passport.ExpectedLifespan)
		val, err := strconv.Atoi(newValue)
		if err != nil {
			return fmt.Errorf("invalid expectedLifespan value: %v", err)
		}
		passport.ExpectedLifespan = val
	case "carbonFootprint":
		originalValue = fmt.Sprintf("%f", passport.CarbonFootprint)
		val, err := strconv.ParseFloat(newValue, 64)
		if err != nil {
			return fmt.Errorf("invalid carbonFootprint value: %v", err)
		}
		passport.CarbonFootprint = val
	case "manufacturingProcess":
		originalValue = passport.ManufacturingProcess
		passport.ManufacturingProcess = newValue
	case "disposalMethod":
		originalValue = passport.DisposalMethod
		passport.DisposalMethod = newValue
	case "recycledElementContent":
		origJSON, _ := json.Marshal(passport.RecycledElementContent)
		originalValue = string(origJSON)
		var parsed map[string]float64
		if err := json.Unmarshal([]byte(newValue), &parsed); err != nil {
			return fmt.Errorf("invalid recycledElementContent JSON: %v", err)
		}
		passport.RecycledElementContent = parsed
	case "extensionInfo":
		origJSON, _ := json.Marshal(passport.ExtensionInfo)
		originalValue = string(origJSON)
		var parsed map[string]string
		if err := json.Unmarshal([]byte(newValue), &parsed); err != nil {
			return fmt.Errorf("invalid extensionInfo JSON: %v", err)
		}
		passport.ExtensionInfo = parsed
	// EV Manufacturer fields
	case "vin":
		originalValue = passport.VIN
		passport.VIN = newValue
	case "installDate":
		originalValue = passport.InstallDate
		passport.InstallDate = newValue
	case "evManufacturer":
		originalValue = passport.EVManufacturer
		passport.EVManufacturer = newValue
	case "evAssemblyCountry":
		originalValue = passport.EVAssemblyCountry
		passport.EVAssemblyCountry = newValue
	default:
		return fmt.Errorf("field '%s' is not correctable", fieldName)
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}

	correction := CorrectionLog{
		Date:          now,
		FieldName:     fieldName,
		OriginalValue: originalValue,
		NewValue:      newValue,
		Reason:        reason,
		CorrectedBy:   msp,
	}

	passport.CorrectionLogs = append(passport.CorrectionLogs, correction)
	passport.UpdatedAt = now

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 19-1. LinkRawMaterials — 여권에 원자재 연결
// ============================================================

func (c *PassportContract) LinkRawMaterials(ctx contractapi.TransactionContextInterface,
	passportId string, materialIds string) error {

	if err := c.requireMSP(ctx, mspManufacturer); err != nil {
		return err
	}

	if passportId == "" || materialIds == "" {
		return fmt.Errorf("passportId, materialIds must not be empty")
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	if err := json.Unmarshal(passportJSON, &passport); err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	// 기존 원자재 중복 체크용 set
	existing := make(map[string]bool)
	for _, id := range passport.RawMaterials {
		existing[id] = true
	}

	ids := strings.Split(materialIds, ",")
	var added []string
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		// 원자재가 실제 존재하는지 확인
		matJSON, err := ctx.GetStub().GetState(id)
		if err != nil {
			return fmt.Errorf("failed to check material %s: %v", id, err)
		}
		if matJSON == nil {
			return fmt.Errorf("raw material %s does not exist", id)
		}
		if !existing[id] {
			passport.RawMaterials = append(passport.RawMaterials, id)
			existing[id] = true
			added = append(added, id)
		}
	}

	if len(added) == 0 {
		return fmt.Errorf("no new materials to link (all already linked or empty)")
	}

	now, tsErr := txTimestamp(ctx)
	if tsErr != nil {
		return fmt.Errorf("failed to get timestamp: %v", tsErr)
	}
	passport.UpdatedAt = now

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}
