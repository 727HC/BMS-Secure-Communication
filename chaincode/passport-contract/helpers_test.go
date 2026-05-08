package main

import (
	"crypto/sha256"
	"crypto/x509"
	"encoding/binary"
	"encoding/hex"
	"reflect"
	"strings"
	"testing"

	"github.com/hyperledger/fabric-chaincode-go/v2/pkg/cid"
	"github.com/hyperledger/fabric-chaincode-go/v2/shim"
)

type fakeTxContext struct {
	msp string
}

func (f fakeTxContext) GetStub() shim.ChaincodeStubInterface {
	return nil
}

func (f fakeTxContext) GetClientIdentity() cid.ClientIdentity {
	return fakeClientIdentity{msp: f.msp}
}

type fakeClientIdentity struct {
	msp string
}

func (f fakeClientIdentity) GetID() (string, error) {
	return "test-client", nil
}

func (f fakeClientIdentity) GetMSPID() (string, error) {
	return f.msp, nil
}

func (f fakeClientIdentity) GetAttributeValue(string) (string, bool, error) {
	return "", false, nil
}

func (f fakeClientIdentity) AssertAttributeValue(string, string) error {
	return nil
}

func (f fakeClientIdentity) GetX509Certificate() (*x509.Certificate, error) {
	return nil, nil
}

func TestUnmarshalTypedStateRejectsWrongDocType(t *testing.T) {
	payload := []byte(`{"docType":"verifiableCredential","passportId":"P1"}`)
	var passport BatteryPassport

	err := unmarshalTypedState("P1", payload, docTypePassport, &passport)
	if err == nil {
		t.Fatal("expected cross-type docType mismatch to be rejected")
	}
	if !strings.Contains(err.Error(), "state type mismatch") {
		t.Fatalf("expected type mismatch error, got %v", err)
	}
}

func TestUnmarshalTypedStateAcceptsExpectedDocType(t *testing.T) {
	payload := []byte(`{"docType":"batteryPassport","passportId":"P1","did":"did:test:1"}`)
	var passport BatteryPassport

	if err := unmarshalTypedState("P1", payload, docTypePassport, &passport); err != nil {
		t.Fatalf("expected valid passport state, got %v", err)
	}
	if passport.PassportID != "P1" || passport.DID != "did:test:1" {
		t.Fatalf("unexpected passport decode: %+v", passport)
	}
}

func TestCreateBatteryPassportSignatureRemainsBackwardCompatible(t *testing.T) {
	method, ok := reflect.TypeOf(&PassportContract{}).MethodByName("CreateBatteryPassport")
	if !ok {
		t.Fatal("CreateBatteryPassport method must exist")
	}
	const wantInputs = 23 // receiver + ctx + existing 21 chaincode arguments
	if method.Type.NumIn() != wantInputs {
		t.Fatalf("CreateBatteryPassport signature changed: NumIn=%d, want %d", method.Type.NumIn(), wantInputs)
	}
}

func TestPassportHandoffContractSignaturesRemainCompatible(t *testing.T) {
	tests := []struct {
		name      string
		wantInput int
	}{
		{name: "SetPassportExtendedAttributes", wantInput: 8}, // receiver + ctx + 6 chaincode args
		{name: "BindBMSIdentifier", wantInput: 7},             // receiver + ctx + 5 chaincode args
		{name: "RecordSourceVerification", wantInput: 9},      // receiver + ctx + 7 chaincode args
		{name: "RecordBMUDataWithPayload", wantInput: 17},     // receiver + ctx + 15 chaincode args
	}

	contractType := reflect.TypeOf(&PassportContract{})
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			method, ok := contractType.MethodByName(tt.name)
			if !ok {
				t.Fatalf("%s method must exist", tt.name)
			}
			if method.Type.NumIn() != tt.wantInput {
				t.Fatalf("%s signature changed: NumIn=%d, want %d", tt.name, method.Type.NumIn(), tt.wantInput)
			}
		})
	}
}

func TestIssueCredentialSignatureRemainsBackwardCompatible(t *testing.T) {
	method, ok := reflect.TypeOf(&PassportContract{}).MethodByName("IssueCredential")
	if !ok {
		t.Fatal("IssueCredential method must exist")
	}
	const wantInputs = 11 // receiver + ctx + existing 9 chaincode arguments
	if method.Type.NumIn() != wantInputs {
		t.Fatalf("IssueCredential signature changed: NumIn=%d, want %d", method.Type.NumIn(), wantInputs)
	}
}

func TestValidateBMURecordInputRejectsSignatureAndDataHash(t *testing.T) {
	goodHash := strings.Repeat("a", 64)

	if err := validateBMURecordInput("R1", "P1", "did:test:1", goodHash, "", "2026-05-08T00:00:00Z"); err == nil {
		t.Fatal("expected empty signature to be rejected")
	} else if !strings.Contains(err.Error(), "signature/timestamp must not be empty") {
		t.Fatalf("expected compatible signature/timestamp error, got %v", err)
	}

	for _, badHash := range []string{
		strings.Repeat("a", 63),
		strings.Repeat("g", 64),
	} {
		err := validateBMURecordInput("R1", "P1", "did:test:1", badHash, "sig", "2026-05-08T00:00:00Z")
		if err == nil {
			t.Fatalf("expected invalid dataHash %q to be rejected", badHash)
		}
	}

	if err := validateBMURecordInput("R1", "P1", "did:test:1", goodHash, "sig", "2026-05-08"); err == nil {
		t.Fatal("expected malformed BMU timestamp to be rejected")
	}
}

func TestCorrectPassportDataNumericHelpersRejectNegativeInputs(t *testing.T) {
	intFields := []string{"cellCount", "expectedLifespan"}
	for _, field := range intFields {
		if _, err := parseNonNegativeInt(field, "-1"); err == nil {
			t.Fatalf("expected %s negative value to be rejected", field)
		}
	}

	floatFields := []string{"weight", "totalEnergy", "energyDensity", "ratedCapacity", "carbonFootprint"}
	for _, field := range floatFields {
		if _, err := parseNonNegativeFloat(field, "-0.1"); err == nil {
			t.Fatalf("expected %s negative value to be rejected", field)
		}
		if _, err := parseNonNegativeFloat(field, "NaN"); err == nil {
			t.Fatalf("expected %s NaN value to be rejected", field)
		}
	}
}

func TestFiniteFloatAndRawMaterialQuantityRejectInvalidNumbers(t *testing.T) {
	for _, value := range []string{"NaN", "+Inf", "-Inf"} {
		if _, err := parseFiniteFloat("voltage", value); err == nil {
			t.Fatalf("expected non-finite float %q to be rejected", value)
		}
	}
	if _, err := parseNonNegativeFloat("quantity", "-1"); err == nil {
		t.Fatal("expected negative raw material quantity to be rejected")
	}
}

func TestParseStrictBoolRejectsMalformedBoolean(t *testing.T) {
	for _, value := range []string{"true", "false", "TRUE", "False"} {
		if _, err := parseStrictBool("available", value); err != nil {
			t.Fatalf("expected %q to parse via strconv.ParseBool, got %v", value, err)
		}
	}

	for _, value := range []string{"", "yes", "truthy", "not-false"} {
		if _, err := parseStrictBool("available", value); err == nil {
			t.Fatalf("expected malformed boolean %q to be rejected", value)
		}
	}
}

func TestValidateOptionalRFC3339RejectsMalformedExpiresAt(t *testing.T) {
	if err := validateOptionalRFC3339("expiresAt", ""); err != nil {
		t.Fatalf("empty expiresAt should remain optional, got %v", err)
	}
	if err := validateOptionalRFC3339("expiresAt", "2026-05-08T00:00:00Z"); err != nil {
		t.Fatalf("valid RFC3339 expiresAt rejected: %v", err)
	}
	if err := validateOptionalRFC3339("expiresAt", "2026-05-08"); err == nil {
		t.Fatal("expected malformed expiresAt to be rejected")
	}
}

func TestValidatePassportHolderDIDRejectsCredentialCrossBinding(t *testing.T) {
	passport := &BatteryPassport{PassportID: "P1", DID: "did:battery:1"}
	if err := validatePassportHolderDID(passport, "did:battery:1"); err != nil {
		t.Fatalf("expected matching holder DID to pass, got %v", err)
	}
	if err := validatePassportHolderDID(passport, "did:battery:2"); err == nil {
		t.Fatal("expected credential holder DID mismatch to be rejected")
	}
}

func TestPassportExtendedAttributesValidation(t *testing.T) {
	passport := &BatteryPassport{PassportID: "P1"}

	if err := applyPassportExtendedAttributes(
		passport,
		"dry-room-assembly",
		"certified-recycling",
		`{"lithium":12.5,"Ni":3}`,
		`{"standard":"BMS-3Y","oracle":"passed"}`,
	); err != nil {
		t.Fatalf("expected valid extended attributes to pass, got %v", err)
	}
	if passport.ManufacturingProcess != "dry-room-assembly" || passport.RecycledElementContent["lithium"] != 12.5 {
		t.Fatalf("extended attributes not applied: %+v", passport)
	}

	if _, err := parseRecycledElementContentJSON(`{"unobtainium":1}`); err == nil {
		t.Fatal("expected unknown recycled element key to be rejected")
	}
	if _, err := parseRecycledElementContentJSON(`{"lithium":-1}`); err == nil {
		t.Fatal("expected negative recycled element content to be rejected")
	}
	if _, err := parseRecycledElementContentJSON(`{"lithium":101}`); err == nil {
		t.Fatal("expected recycled element content over 100 to be rejected")
	}
	if _, err := parseExtensionInfoJSON(`{"": "bad"}`); err == nil {
		t.Fatal("expected empty extensionInfo key to be rejected")
	}
}

func TestValidateBMSBindingRejectsMalformedAndConflictingIdentifier(t *testing.T) {
	passport := &BatteryPassport{
		PassportID:      "P1",
		BMSManagementID: "BMS-MGMT-001",
		BMSBindingID:    "did:battery:1#BMS-MGMT-001",
	}

	if err := validateBMSBinding(passport, "BMS-MGMT-001", "did:battery:1#BMS-MGMT-001"); err != nil {
		t.Fatalf("expected idempotent BMS binding to pass, got %v", err)
	}
	if err := validateBMSBinding(passport, "BMS MGMT 001", "did:battery:1#BMS-MGMT-001"); err == nil {
		t.Fatal("expected malformed BMS management identifier to be rejected")
	}
	if err := validateBMSBinding(passport, "BMS-MGMT-002", "did:battery:1#BMS-MGMT-001"); err == nil {
		t.Fatal("expected conflicting BMS management identifier to be rejected")
	}
}

func TestBMSBindingCode32DerivesFromCanonicalIdentifier(t *testing.T) {
	canonicalID := "BMS-MGMT-001"
	sum := sha256.Sum256([]byte(canonicalID))
	expected := binary.LittleEndian.Uint32(sum[0:4])

	if got := deriveBMSBindingCode32(canonicalID); got != expected {
		t.Fatalf("unexpected binding code: got %d want %d", got, expected)
	}
	if got := formatBMSBindingCode32(expected); got != "0x2c9a0e0c" {
		t.Fatalf("unexpected binding code hex: got %s", got)
	}
}

func TestBMSBindingEvidenceHashMatchesEmbeddedCanonicalJSON(t *testing.T) {
	got, err := computeBMSBindingEvidenceHash("BMS-MGMT-001", "did:battery:001#BMS-MGMT-001")
	if err != nil {
		t.Fatalf("expected evidence hash computation to pass, got %v", err)
	}
	const want = "b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178"
	if got != want {
		t.Fatalf("unexpected evidence hash: got %s want %s", got, want)
	}
	if err := validateBMSBindingEvidenceHash(want, "BMS-MGMT-001", "did:battery:001#BMS-MGMT-001"); err != nil {
		t.Fatalf("expected lab evidence hash to pass, got %v", err)
	}
	if err := validateBMSBindingEvidenceHash(strings.Repeat("a", 64), "BMS-MGMT-001", "did:battery:001#BMS-MGMT-001"); err == nil {
		t.Fatal("expected mismatched BMS evidence hash to be rejected")
	}
}

func TestValidateBMURawPayloadChecks48ByteHashAndBindingCode(t *testing.T) {
	canonicalID := "BMS-MGMT-001"
	payload := make([]byte, 48)
	binary.LittleEndian.PutUint32(payload[44:48], deriveBMSBindingCode32(canonicalID))
	hash := sha256.Sum256(payload)
	dataHash := hex.EncodeToString(hash[:])

	_, payloadCode, err := validateBMURawPayload(dataHash, hex.EncodeToString(payload))
	if err != nil {
		t.Fatalf("expected valid 48-byte payload to pass, got %v", err)
	}
	passport := &BatteryPassport{
		PassportID:       "P1",
		BMSManagementID:  canonicalID,
		BMSBindingCode32: deriveBMSBindingCode32(canonicalID),
	}
	if err := validateBMSBindingCode(passport, payloadCode); err != nil {
		t.Fatalf("expected matching BMS binding code to pass, got %v", err)
	}

	badPayload := append([]byte(nil), payload...)
	binary.LittleEndian.PutUint32(badPayload[44:48], payloadCode+1)
	badHash := sha256.Sum256(badPayload)
	_, badPayloadCode, err := validateBMURawPayload(hex.EncodeToString(badHash[:]), hex.EncodeToString(badPayload))
	if err != nil {
		t.Fatalf("expected bad payload hash to be internally consistent, got %v", err)
	}
	if err := validateBMSBindingCode(passport, badPayloadCode); err == nil {
		t.Fatal("expected mismatched payload bmsBindingCode32 to be rejected")
	}

	if _, _, err := validateBMURawPayload(dataHash, hex.EncodeToString(payload[:47])); err == nil {
		t.Fatal("expected non-48-byte rawPayload to be rejected")
	}
	if _, _, err := validateBMURawPayload(strings.Repeat("f", 64), hex.EncodeToString(payload)); err == nil {
		t.Fatal("expected dataHash mismatch to be rejected")
	}
}

func TestPhysicalVerificationAllowsBMSIdentifierSignal(t *testing.T) {
	if !validSignalKeys["bmsIdentifierMatched"] {
		t.Fatal("expected bmsIdentifierMatched to be an allowed physical verification signal")
	}
}

func TestCheckPassportAccessRBACRegression(t *testing.T) {
	contract := &PassportContract{}

	tests := []struct {
		name     string
		msp      string
		passport BatteryPassport
		wantErr  bool
	}{
		{
			name: "regulator can access any passport",
			msp:  mspRegulator,
			passport: BatteryPassport{
				PassportID: "P1",
				Status:     "ACTIVE",
			},
		},
		{
			name: "manufacturer can access own passport",
			msp:  mspManufacturer,
			passport: BatteryPassport{
				PassportID: "P1",
				CreatorMSP: mspManufacturer,
				Status:     "ACTIVE",
			},
		},
		{
			name: "manufacturer cannot access another creator passport",
			msp:  mspManufacturer,
			passport: BatteryPassport{
				PassportID: "P1",
				CreatorMSP: mspRegulator,
				Status:     "ACTIVE",
			},
			wantErr: true,
		},
		{
			name: "ev manufacturer can browse manufactured passport",
			msp:  mspEVManufacturer,
			passport: BatteryPassport{
				PassportID: "P1",
				Status:     "MANUFACTURED",
			},
		},
		{
			name: "ev manufacturer can access bound passport",
			msp:  mspEVManufacturer,
			passport: BatteryPassport{
				PassportID:  "P1",
				Status:      "ACTIVE",
				VIN:         "VIN-1",
				EvBinderMSP: mspEVManufacturer,
			},
		},
		{
			name: "ev manufacturer cannot access unbound active passport",
			msp:  mspEVManufacturer,
			passport: BatteryPassport{
				PassportID: "P1",
				Status:     "ACTIVE",
			},
			wantErr: true,
		},
		{
			name: "service can access maintenance passport",
			msp:  mspService,
			passport: BatteryPassport{
				PassportID: "P1",
				Status:     "MAINTENANCE",
			},
		},
		{
			name: "service can access past maintenance passport",
			msp:  mspService,
			passport: BatteryPassport{
				PassportID: "P1",
				Status:     "ACTIVE",
				MaintenanceLogs: []MaintenanceLog{
					{OrgMSP: mspService},
				},
			},
		},
		{
			name: "service cannot access unrelated active passport",
			msp:  mspService,
			passport: BatteryPassport{
				PassportID: "P1",
				Status:     "ACTIVE",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := contract.checkPassportAccess(fakeTxContext{msp: tt.msp}, &tt.passport)
			if (err != nil) != tt.wantErr {
				t.Fatalf("checkPassportAccess error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestStatusTransitionRegressionGuards(t *testing.T) {
	tests := []struct {
		name    string
		status  string
		allowed []string
		want    bool
	}{
		{"bind accepts manufactured", "MANUFACTURED", []string{"MANUFACTURED", "ACTIVE"}, true},
		{"bind accepts active rebinding guard path", "ACTIVE", []string{"MANUFACTURED", "ACTIVE"}, true},
		{"bind rejects disposed", "DISPOSED", []string{"MANUFACTURED", "ACTIVE"}, false},
		{"maintenance request accepts active", "ACTIVE", []string{"ACTIVE"}, true},
		{"maintenance request rejects manufactured", "MANUFACTURED", []string{"ACTIVE"}, false},
		{"maintenance log accepts maintenance", "MAINTENANCE", []string{"MAINTENANCE", "ACTIVE"}, true},
		{"analysis request accepts maintenance", "MAINTENANCE", []string{"ACTIVE", "MAINTENANCE"}, true},
		{"analysis result accepts analysis", "ANALYSIS", []string{"ANALYSIS"}, true},
		{"analysis result rejects active", "ACTIVE", []string{"ANALYSIS"}, false},
		{"extract accepts active", "ACTIVE", []string{"ACTIVE", "ANALYSIS"}, true},
		{"extract rejects manufactured", "MANUFACTURED", []string{"ACTIVE", "ANALYSIS"}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isStatusAllowed(tt.status, tt.allowed...); got != tt.want {
				t.Fatalf("isStatusAllowed(%q, %v) = %v, want %v", tt.status, tt.allowed, got, tt.want)
			}
		})
	}
}
