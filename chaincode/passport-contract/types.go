package main

import "github.com/hyperledger/fabric-contract-api-go/v2/contractapi"

// PassportContract provides functions for managing Battery Passport data on the ledger
type PassportContract struct {
	contractapi.Contract
}

// DocType constants
const (
	docTypePassport      = "batteryPassport"
	docTypeBMURecord     = "bmuRecord"
	docTypeBMUSnapshot   = "bmuSnapshot"
	docTypeRawMaterial   = "rawMaterial"
	docTypeVC            = "verifiableCredential"
	docTypeVerification  = "vcVerification"
	docTypeFCReset       = "fcReset"
	docTypeCredRequest   = "credentialRequest"
	defaultPageSize int32 = 100
	maxPageSize     int32 = 500
)

// MSP identity constants
const (
	mspManufacturer   = "ManufacturerMSP"
	mspEVManufacturer = "EVManufacturerMSP"
	mspService        = "ServiceMSP"
	mspRegulator      = "RegulatorMSP"
)

// Credential type → authorized issuer MSPs
var credTypeIssuers = map[string][]string{
	"BATTERY_PASSPORT": {mspManufacturer},
	"BATTERY_HEALTH":   {mspService},
	"MAINTENANCE":      {mspService},
	"COMPLIANCE":       {mspRegulator},
	"RECYCLING":        {mspRegulator},
}

// Field → authorized corrector MSPs (RegulatorMSP can correct all fields)
var fieldCorrectors = map[string][]string{
	// Manufacturer fields
	"model":                  {mspManufacturer, mspRegulator},
	"serialNumber":           {mspManufacturer, mspRegulator},
	"manufacturerName":       {mspManufacturer, mspRegulator},
	"manufactureCountry":     {mspManufacturer, mspRegulator},
	"cellManufacturer":       {mspManufacturer, mspRegulator},
	"cellManufactureCountry": {mspManufacturer, mspRegulator},
	"manufactureDate":        {mspManufacturer, mspRegulator},
	"cellType":               {mspManufacturer, mspRegulator},
	"chemistry":              {mspManufacturer, mspRegulator},
	"voltageRange":           {mspManufacturer, mspRegulator},
	"temperatureRange":       {mspManufacturer, mspRegulator},
	"cellCount":              {mspManufacturer, mspRegulator},
	"weight":                 {mspManufacturer, mspRegulator},
	"totalEnergy":            {mspManufacturer, mspRegulator},
	"energyDensity":          {mspManufacturer, mspRegulator},
	"ratedCapacity":          {mspManufacturer, mspRegulator},
	"expectedLifespan":       {mspManufacturer, mspRegulator},
	"carbonFootprint":        {mspManufacturer, mspRegulator},
	"manufacturingProcess":   {mspManufacturer, mspRegulator},
	"disposalMethod":         {mspManufacturer, mspRegulator},
	"recycledElementContent": {mspManufacturer, mspRegulator},
	"extensionInfo":          {mspManufacturer, mspRegulator},
	// EV Manufacturer fields
	"vin":               {mspEVManufacturer, mspRegulator},
	"installDate":       {mspEVManufacturer, mspRegulator},
	"evManufacturer":    {mspEVManufacturer, mspRegulator},
	"evAssemblyCountry": {mspEVManufacturer, mspRegulator},
}

// validSignalKeys defines the allowed signal keys for physical verification
var validSignalKeys = map[string]bool{
	"socMatched": true,
	"didMatched": true,
	"vinMatched": true,
	"fcMatched":  true,
}

// RawMaterial represents a raw material used in battery manufacturing
type RawMaterial struct {
	DocType         string  `json:"docType"`
	MaterialID      string  `json:"materialId"`
	Name            string  `json:"name"`
	Origin          string  `json:"origin"`
	Supplier        string  `json:"supplier"`
	Quantity        float64 `json:"quantity"`
	Unit            string  `json:"unit"`
	CertificationID string  `json:"certificationId"`
	CreatedAt       string  `json:"createdAt"`
	CreatorMSP      string  `json:"creatorMsp"`
}

// MaintenanceLog represents a maintenance event
type MaintenanceLog struct {
	Date        string `json:"date"`
	Type        string `json:"type"`
	Description string `json:"description"`
	Technician  string `json:"technician"`
	OrgMSP      string `json:"orgMsp"`
}

// AccidentLog represents an accident/incident record
type AccidentLog struct {
	Date        string `json:"date"`
	Severity    string `json:"severity"`
	Description string `json:"description"`
	Reporter    string `json:"reporter"`
	OrgMSP      string `json:"orgMsp"`
}

// BatteryPassport - GBA 21 compliant battery passport
type BatteryPassport struct {
	DocType    string `json:"docType"`
	PassportID string `json:"passportId"`
	BatteryID  string `json:"batteryId"`
	DID        string `json:"did"`

	// GBA 21 fields (2-21)
	Model                  string `json:"model"`
	SerialNumber           string `json:"serialNumber"`
	EVManufacturer         string `json:"evManufacturer"`
	EVAssemblyCountry      string `json:"evAssemblyCountry"`
	EvBinderMSP            string `json:"evBinderMsp"`
	ManufacturerName       string `json:"manufacturerName"`
	ManufactureCountry     string `json:"manufactureCountry"`
	CellManufacturer       string `json:"cellManufacturer"`
	CellManufactureCountry string `json:"cellManufactureCountry"`
	ManufactureDate        string `json:"manufactureDate"`
	CellType               string `json:"cellType"`
	Chemistry              string `json:"chemistry"`
	CellCount              int    `json:"cellCount"`
	Weight                 float64 `json:"weight"`
	TotalEnergy            float64 `json:"totalEnergy"`
	EnergyDensity          float64 `json:"energyDensity"`
	RatedCapacity          float64 `json:"ratedCapacity"`
	ExpectedLifespan       int    `json:"expectedLifespan"`
	VoltageRange           string `json:"voltageRange"`
	TemperatureRange       string `json:"temperatureRange"`

	// EV binding
	VIN         string `json:"vin"`
	InstallDate string `json:"installDate"`

	// Raw materials & sustainability
	RawMaterials           []string           `json:"rawMaterials"`
	RecyclingRates         map[string]float64 `json:"recyclingRates"`
	ContainsHazardous      bool               `json:"containsHazardous"`
	CarbonFootprint        float64            `json:"carbonFootprint"`
	ManufacturingProcess   string             `json:"manufacturingProcess"`
	DisposalMethod         string             `json:"disposalMethod"`
	RecycledElementContent map[string]float64 `json:"recycledElementContent"`
	ExtensionInfo          map[string]string  `json:"extensionInfo"`

	// Real-time state (updated by BMU data)
	CurrentSOC           float64 `json:"currentSoc"`
	Temperature          uint16  `json:"currentTemperature"`
	StatusFlags          uint8   `json:"currentStatusFlags"`
	CurrentSOH           float64 `json:"currentSoh"`
	SOCE                 float64 `json:"soce"`
	RemainingLifeCycle   int     `json:"remainingLifeCycle"`
	TotalDischargeCycles int     `json:"totalDischargeCycles"`
	LastBMUDataID        string  `json:"lastBmuDataId"`

	// Status & logs
	Status           string           `json:"status"`
	RecycleAvailable bool             `json:"recycleAvailable"`
	MaintenanceLogs  []MaintenanceLog `json:"maintenanceLogs"`
	AccidentLogs     []AccidentLog    `json:"accidentLogs"`

	// Regulatory verification (3차년도)
	RegulatoryStatus      string   `json:"regulatoryVerificationStatus"`
	RegulatoryVerifiedAt  string   `json:"regulatoryVerifiedAt"`
	RegulatoryVerifier    string   `json:"regulatoryVerifier"`
	RegulatoryEvidenceIds []string `json:"regulatoryEvidenceIds"`

	// Physical-history verification (3차년도)
	PhysicalVerification *PhysicalVerification `json:"physicalHistoryVerification"`

	// Corrections
	CorrectionLogs []CorrectionLog `json:"correctionLogs"`

	// Audit
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
	CreatorMSP string `json:"creatorMsp"`
}

// BMURecord represents a BMU data record
type BMURecord struct {
	DocType         string  `json:"docType"`
	RecordID        string  `json:"recordId"`
	PassportID      string  `json:"passportId"`
	DID             string  `json:"did"`
	DataHash        string  `json:"dataHash"`
	Signature       string  `json:"signature"`
	FC              uint64  `json:"fc"`
	SOC             uint16  `json:"soc"`
	Voltage         float64 `json:"voltage"`
	Current         float64 `json:"current"`
	Temperature     uint16  `json:"temperature"`
	CellCount       uint8   `json:"cellCount"`
	StatusFlags     uint8   `json:"statusFlags"`
	DischargeCycles uint16  `json:"dischargeCycles"`
	Timestamp       string  `json:"timestamp"`
	Status          string  `json:"status,omitempty" metadata:",optional"`
	InvalidatedBy   string  `json:"invalidatedBy,omitempty" metadata:",optional"`
	InvalidatedAt   string  `json:"invalidatedAt,omitempty" metadata:",optional"`
	InvalidReason   string  `json:"invalidReason,omitempty" metadata:",optional"`
	CreatedAt       string  `json:"createdAt"`
	CreatorMSP      string  `json:"creatorMsp"`
}

// BMUSnapshot holds real-time BMU state separated from passport key to avoid MVCC conflicts
type BMUSnapshot struct {
	DocType              string  `json:"docType"`
	PassportID           string  `json:"passportId"`
	CurrentSOC           float64 `json:"currentSoc"`
	Temperature          uint16  `json:"temperature"`
	StatusFlags          uint8   `json:"statusFlags"`
	TotalDischargeCycles int     `json:"totalDischargeCycles"`
	LastBMUDataID        string  `json:"lastBmuDataId"`
	UpdatedAt            string  `json:"updatedAt"`
}

// CorrectionLog represents a data correction event
type CorrectionLog struct {
	Date          string `json:"date"`
	FieldName     string `json:"fieldName"`
	OriginalValue string `json:"originalValue"`
	NewValue      string `json:"newValue"`
	Reason        string `json:"reason"`
	CorrectedBy   string `json:"correctedBy"`
}

// VerifiableCredential represents a VC anchored on Fabric
type VerifiableCredential struct {
	DocType          string `json:"docType"`
	CredentialID     string `json:"credentialId"`
	PassportID       string `json:"passportId"`
	CredType         string `json:"credType"`
	IssuerDID        string `json:"issuerDid"`
	IssuerMSP        string `json:"issuerMsp"`
	HolderDID        string `json:"holderDid"`
	SchemaID         string `json:"schemaId"`
	CredDefID        string `json:"credDefId"`
	DataHash         string `json:"dataHash"`
	Status           string `json:"status"`
	IssuedAt         string `json:"issuedAt"`
	ExpiresAt        string `json:"expiresAt"`
	RevokedAt        string `json:"revokedAt"`
	RevocationReason string `json:"revocationReason"`
}

// CredentialVerification represents a verification event log
type CredentialVerification struct {
	DocType        string `json:"docType"`
	VerificationID string `json:"verificationId"`
	CredentialID   string `json:"credentialId"`
	VerifierDID    string `json:"verifierDid"`
	VerifierMSP    string `json:"verifierMsp"`
	Result         bool   `json:"result"`
	Timestamp      string `json:"timestamp"`
}

// PhysicalVerification represents physical-history binding verification
type PhysicalVerification struct {
	Status      string          `json:"status"`      // VERIFIED | MISMATCH | PENDING
	VerifiedAt  string          `json:"verifiedAt"`
	VerifierMSP string          `json:"verifierMsp"`
	Reason      string          `json:"reason"`
	Signals     map[string]bool `json:"signals"`
}

// CredentialRequest represents a credential issuance request (2차년도 #10-12)
type CredentialRequest struct {
	DocType         string `json:"docType"`
	RequestID       string `json:"requestId"`
	PassportID      string `json:"passportId"`
	CredType        string `json:"credType"`
	TargetIssuerMsp string `json:"targetIssuerMsp"`
	RequesterMsp    string `json:"requesterMsp"`
	Status          string `json:"status"` // PENDING | APPROVED | REJECTED
	RequestedAt     string `json:"requestedAt"`
	ApprovedAt      string `json:"approvedAt"`
	ApproverMsp     string `json:"approverMsp"`
	RejectedAt      string `json:"rejectedAt"`
	RejectedBy      string `json:"rejectedBy"`
	RejectionReason string `json:"rejectionReason"`
}

// FCResetLog records a freshness counter reset event for audit trail
type FCResetLog struct {
	DocType    string `json:"docType"`
	LogID      string `json:"logId"`
	DID        string `json:"did"`
	Reason     string `json:"reason"`
	PreviousFC uint64 `json:"previousFc"`
	ResetBy    string `json:"resetBy"`
	ResetAt    string `json:"resetAt"`
}

// PaginatedPassportResult for passport queries
type PaginatedPassportResult struct {
	Records  []*BatteryPassport `json:"records"`
	Bookmark string             `json:"bookmark"`
	Count    int                `json:"count"`
}

// PaginatedBMUResult for BMU record queries
type PaginatedBMUResult struct {
	Records  []*BMURecord `json:"records"`
	Bookmark string       `json:"bookmark"`
	Count    int          `json:"count"`
}

// PaginatedMaterialResult for raw material queries
type PaginatedMaterialResult struct {
	Records  []*RawMaterial `json:"records"`
	Bookmark string         `json:"bookmark"`
	Count    int            `json:"count"`
}

// PaginatedVCResult for VC queries
type PaginatedVCResult struct {
	Records  []*VerifiableCredential `json:"records"`
	Bookmark string                  `json:"bookmark"`
	Count    int                     `json:"count"`
}

// PaginatedVerificationResult for verification history queries
type PaginatedVerificationResult struct {
	Records  []*CredentialVerification `json:"records"`
	Bookmark string                    `json:"bookmark"`
	Count    int                       `json:"count"`
}
