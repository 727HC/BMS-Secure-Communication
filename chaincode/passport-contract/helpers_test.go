package main

import (
	"crypto/sha256"
	"crypto/x509"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"math"
	"reflect"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/hyperledger/fabric-chaincode-go/v2/pkg/cid"
	"github.com/hyperledger/fabric-chaincode-go/v2/shim"
	"github.com/hyperledger/fabric-protos-go-apiv2/ledger/queryresult"
	"github.com/hyperledger/fabric-protos-go-apiv2/peer"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type fakeTxContext struct {
	msp  string
	stub shim.ChaincodeStubInterface
}

func (f fakeTxContext) GetStub() shim.ChaincodeStubInterface {
	return f.stub
}

func (f fakeTxContext) GetClientIdentity() cid.ClientIdentity {
	return fakeClientIdentity{msp: f.msp}
}

type countingTxContext struct {
	msp          string
	stub         shim.ChaincodeStubInterface
	getStubCalls int
}

func (c *countingTxContext) GetStub() shim.ChaincodeStubInterface {
	c.getStubCalls++
	return c.stub
}

func (c *countingTxContext) GetClientIdentity() cid.ClientIdentity {
	return fakeClientIdentity{msp: c.msp}
}

type stateStub struct {
	shim.ChaincodeStubInterface
	state              map[string][]byte
	queryResults       []*queryresult.KV
	queryStrings       []string
	paginatedQueries   []paginatedQuery
	paginationMetadata *peer.QueryResponseMetadata
	getStateKeys       []string
	putStateKeys       []string
	eventName          string
	eventPayload       []byte
	timestamp          *timestamppb.Timestamp
	txID               string
}

type paginatedQuery struct {
	query    string
	pageSize int32
	bookmark string
}

func newStateStub() *stateStub {
	return &stateStub{state: map[string][]byte{}}
}

func (s *stateStub) GetState(key string) ([]byte, error) {
	s.getStateKeys = append(s.getStateKeys, key)
	return s.state[key], nil
}

func (s *stateStub) PutState(key string, value []byte) error {
	s.putStateKeys = append(s.putStateKeys, key)
	copyValue := append([]byte(nil), value...)
	s.state[key] = copyValue
	return nil
}

func (s *stateStub) SetEvent(name string, payload []byte) error {
	s.eventName = name
	s.eventPayload = append([]byte(nil), payload...)
	return nil
}

func (s *stateStub) DelState(key string) error {
	delete(s.state, key)
	return nil
}

func (s *stateStub) CreateCompositeKey(objectType string, attributes []string) (string, error) {
	return shim.CreateCompositeKey(objectType, attributes)
}

func (s *stateStub) GetTxID() string {
	if s.txID != "" {
		return s.txID
	}
	return "test-tx"
}

func (s *stateStub) GetTxTimestamp() (*timestamppb.Timestamp, error) {
	if s.timestamp != nil {
		return s.timestamp, nil
	}
	return &timestamppb.Timestamp{Seconds: 1779060000}, nil
}

func (s *stateStub) GetQueryResult(query string) (shim.StateQueryIteratorInterface, error) {
	s.queryStrings = append(s.queryStrings, query)
	return &stateQueryIterator{results: s.queryResults}, nil
}

func (s *stateStub) GetQueryResultWithPagination(query string, pageSize int32, bookmark string) (shim.StateQueryIteratorInterface, *peer.QueryResponseMetadata, error) {
	s.paginatedQueries = append(s.paginatedQueries, paginatedQuery{query: query, pageSize: pageSize, bookmark: bookmark})
	metadata := s.paginationMetadata
	if metadata == nil {
		metadata = &peer.QueryResponseMetadata{FetchedRecordsCount: int32(len(s.queryResults))}
	}
	return &stateQueryIterator{results: s.queryResults}, metadata, nil
}

type stateQueryIterator struct {
	results []*queryresult.KV
	index   int
}

func (i *stateQueryIterator) HasNext() bool {
	return i.index < len(i.results)
}

func (i *stateQueryIterator) Next() (*queryresult.KV, error) {
	result := i.results[i.index]
	i.index++
	return result, nil
}

func (i *stateQueryIterator) Close() error {
	return nil
}

func TestQueryBMURecordsByPassportUsesCouchDBPaginationAndTimestampSort(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspRegulator, stub: stub}
	contract := &PassportContract{}

	passport := BatteryPassport{
		DocType:    docTypePassport,
		PassportID: "P1",
		DID:        "did:test:1",
	}
	passportJSON, err := json.Marshal(passport)
	if err != nil {
		t.Fatalf("marshal passport: %v", err)
	}
	if err := stub.PutState("P1", passportJSON); err != nil {
		t.Fatalf("PutState passport: %v", err)
	}

	bmuKV := func(recordID string, timestamp string) *queryresult.KV {
		t.Helper()
		record := BMURecord{
			DocType:    docTypeBMURecord,
			RecordID:   recordID,
			PassportID: "P1",
			DID:        "did:test:1",
			Timestamp:  timestamp,
			Status:     "VALID",
			CreatedAt:  timestamp,
			CreatorMSP: mspManufacturer,
		}
		recordJSON, err := json.Marshal(record)
		if err != nil {
			t.Fatalf("marshal BMU record: %v", err)
		}
		return &queryresult.KV{Key: recordID, Value: recordJSON}
	}
	stub.queryResults = []*queryresult.KV{
		bmuKV("B-new", "2026-05-18T00:00:03Z"),
		bmuKV("B-mid", "2026-05-18T00:00:02Z"),
	}
	stub.paginationMetadata = &peer.QueryResponseMetadata{Bookmark: "bm-next", FetchedRecordsCount: 2}

	page1, err := contract.QueryBMURecordsByPassport(ctx, "P1", 2, "bm-start")
	if err != nil {
		t.Fatalf("QueryBMURecordsByPassport page1 failed: %v", err)
	}
	if len(stub.paginatedQueries) != 1 {
		t.Fatalf("expected one paginated BMU query, got %d", len(stub.paginatedQueries))
	}
	gotQuery := stub.paginatedQueries[0]
	if gotQuery.pageSize != 2 || gotQuery.bookmark != "bm-start" {
		t.Fatalf("unexpected pagination args: %+v", gotQuery)
	}
	if !strings.Contains(gotQuery.query, `"sort":[{"timestamp":"desc"}]`) {
		t.Fatalf("BMU query should use CouchDB timestamp sort: %s", gotQuery.query)
	}
	if page1.Count != 2 || page1.Bookmark != "bm-next" {
		t.Fatalf("unexpected page1 metadata: count=%d bookmark=%q", page1.Count, page1.Bookmark)
	}
	if got := []string{page1.Records[0].RecordID, page1.Records[1].RecordID}; got[0] != "B-new" || got[1] != "B-mid" {
		t.Fatalf("page should preserve CouchDB newest-first order: %v", got)
	}
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
		{name: "RecordBMUData", wantInput: 16},                // receiver + ctx + 14 chaincode args
		{name: "RecordBMUDataAutoID", wantInput: 15},          // receiver + ctx + 13 chaincode args (recordId=txID)
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
	upperHash := strings.Repeat("A", 64)

	if err := validateBMURecordInput("R1", "P1", "did:test:1", goodHash, "", "2026-05-08T00:00:00Z"); err == nil {
		t.Fatal("expected empty signature to be rejected")
	} else if !strings.Contains(err.Error(), "signature/timestamp must not be empty") {
		t.Fatalf("expected compatible signature/timestamp error, got %v", err)
	}
	if err := validateBMURecordInput("R1", "P1", "did:test:1", upperHash, "sig", "2026-05-08T00:00:00Z"); err != nil {
		t.Fatalf("expected uppercase SHA-256 hex compatibility to be preserved, got %v", err)
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

func TestValidateBMURecordAutoIDInputPreservesSharedFieldValidation(t *testing.T) {
	goodHash := strings.Repeat("a", 64)
	upperHash := strings.Repeat("A", 64)

	if err := validateBMURecordAutoIDInput("P1", "did:test:1", goodHash, "", "2026-05-08T00:00:00Z"); err == nil {
		t.Fatal("expected empty signature to be rejected")
	} else if !strings.Contains(err.Error(), "signature/timestamp must not be empty") {
		t.Fatalf("expected compatible signature/timestamp error, got %v", err)
	}
	if err := validateBMURecordAutoIDInput("P1", "did:test:1", upperHash, "sig", "2026-05-08T00:00:00Z"); err != nil {
		t.Fatalf("expected uppercase SHA-256 hex compatibility to be preserved, got %v", err)
	}
	if err := validateBMURecordAutoIDInput("", "did:test:1", goodHash, "sig", "2026-05-08T00:00:00Z"); err == nil {
		t.Fatal("expected empty passportId to be rejected")
	}
	if err := validateBMURecordAutoIDInput("P1", "did:test:\x00bad", goodHash, "sig", "2026-05-08T00:00:00Z"); err == nil {
		t.Fatal("expected composite-key unsafe DID to be rejected")
	} else if !strings.Contains(err.Error(), "failed to create lastFc composite key") {
		t.Fatalf("expected compatible lastFc composite key error, got %v", err)
	}
	if err := validateBMURecordAutoIDInput("P1", "did:test:1", strings.Repeat("g", 64), "sig", "2026-05-08T00:00:00Z"); err == nil {
		t.Fatal("expected invalid dataHash to be rejected")
	}
	if err := validateBMURecordAutoIDInput("P1", "did:test:1", goodHash, "sig", "2026-05-08"); err == nil {
		t.Fatal("expected malformed BMU timestamp to be rejected")
	}

	if err := validateBMURecordAutoIDInput(
		"P-BMU-12345678-0001",
		"did:bmu:12345678:0001",
		goodHash,
		"sigProof",
		"2026-05-08T00:00:00Z",
	); err != nil {
		t.Fatalf("expected standard AutoID shape to validate, got %v", err)
	}

	if err := validateBMURecordAutoIDInput("P1", "did:test:1", goodHash, "sig", "2026-05-08T00:00:00Z"); err != nil {
		t.Fatalf("expected non-standard AutoID shape to validate, got %v", err)
	}
}

func TestTxTimestampPreservesRFC3339SecondPrecision(t *testing.T) {
	stub := newStateStub()
	stub.timestamp = &timestamppb.Timestamp{Seconds: 1779060000, Nanos: 987654321}
	got, err := txTimestamp(fakeTxContext{msp: mspManufacturer, stub: stub})
	if err != nil {
		t.Fatalf("txTimestamp failed: %v", err)
	}
	if got != "2026-05-17T23:20:00Z" {
		t.Fatalf("txTimestamp = %q, want second-precision RFC3339", got)
	}
}

func TestValidateRequiredRFC3339FastPathAndFallback(t *testing.T) {
	valid := []string{
		"2026-05-18T00:00:00Z",
		"2024-02-29T23:59:59Z",
		"2026-05-18T00:00:00.123Z",
		"2026-05-18T00:00:00+09:00",
	}
	for _, value := range valid {
		if err := validateRequiredRFC3339("timestamp", value); err != nil {
			t.Fatalf("expected valid RFC3339 %q to pass, got %v", value, err)
		}
	}

	invalid := []string{
		"2026-02-29T00:00:00Z",
		"2026-04-31T00:00:00Z",
		"2026-05-18T24:00:00Z",
		"2026-05-18T00:60:00Z",
		"2026-05-18T00:00:60Z",
		"2026-05-18T00:00:00.abcZ",
		"2026-05-18",
	}
	for _, value := range invalid {
		if err := validateRequiredRFC3339("timestamp", value); err == nil {
			t.Fatalf("expected invalid RFC3339 %q to be rejected", value)
		}
	}
}

func TestValidateSHA256HexLowercaseFastPathAndCompatibilityFallback(t *testing.T) {
	if err := validateSHA256Hex("dataHash", strings.Repeat("a", 64)); err != nil {
		t.Fatalf("expected lowercase SHA-256 hex to be accepted, got %v", err)
	}
	if err := validateSHA256Hex("dataHash", strings.Repeat("A", 64)); err != nil {
		t.Fatalf("expected uppercase SHA-256 hex compatibility to be preserved, got %v", err)
	}
	if err := validateSHA256Hex("dataHash", strings.Repeat("g", 64)); err == nil {
		t.Fatal("expected non-hex SHA-256 input to be rejected")
	}
}

func TestRecordBMUDataRejectsMissingCanonicalLastFCBinding(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}

	err := contract.RecordBMUData(ctx,
		"B1", "P1", "did:test:1",
		strings.Repeat("a", 64), "sig",
		"1", "32768", "40.000", "0.000",
		"30000", "96", "0", "0",
		"2026-05-18T00:00:00Z",
	)
	if err == nil {
		t.Fatal("expected missing canonical lastFc binding to be rejected")
	}
	if !strings.Contains(err.Error(), "missing canonical lastFc binding") {
		t.Fatalf("expected missing binding repair error, got %v", err)
	}
}

func TestRecordBMUDataRejectsLegacyLastFCBinding(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}

	key, err := lastFCKey("did:test:1")
	if err != nil {
		t.Fatalf("lastFCKey failed: %v", err)
	}
	if err := stub.PutState(key, []byte("7")); err != nil {
		t.Fatalf("PutState legacy lastFc: %v", err)
	}

	err = contract.RecordBMUData(ctx,
		"B1", "P1", "did:test:1",
		strings.Repeat("a", 64), "sig",
		"8", "32768", "40.000", "0.000",
		"30000", "96", "0", "0",
		"2026-05-18T00:00:00Z",
	)
	if err == nil {
		t.Fatal("expected legacy lastFc binding to be rejected")
	}
	if !strings.Contains(err.Error(), "legacy lastFc binding") {
		t.Fatalf("expected legacy binding repair error, got %v", err)
	}
}

func TestRecordBMUDataAutoIDUsesTxIDWithoutDuplicateRecordRead(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}
	key, err := lastFCKey("did:test:1")
	if err != nil {
		t.Fatalf("lastFCKey failed: %v", err)
	}
	if err := stub.PutState(key, encodeLastFCBinding("P1", 0, false)); err != nil {
		t.Fatalf("PutState lastFc: %v", err)
	}

	err = contract.RecordBMUDataAutoID(ctx,
		"P1", "did:test:1",
		"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "sig",
		"1", "80", "400.0", "0.0",
		"35", "96", "0", "0",
		"2026-05-18T00:00:00Z",
	)
	if err != nil {
		t.Fatalf("RecordBMUDataAutoID failed: %v", err)
	}
	rawRecord := stub.state["test-tx"]
	if rawRecord == nil {
		t.Fatal("RecordBMUDataAutoID did not use txID as record key")
	}
	var record BMURecord
	if err := json.Unmarshal(rawRecord, &record); err != nil {
		t.Fatalf("unmarshal auto-id record: %v", err)
	}
	if record.RecordID != "test-tx" || record.PassportID != "P1" || record.DID != "did:test:1" {
		t.Fatalf("unexpected auto-id record: %+v", record)
	}
	for _, key := range stub.getStateKeys {
		if key == "test-tx" {
			t.Fatalf("RecordBMUDataAutoID should not perform duplicate GetState on txID record key; reads=%v", stub.getStateKeys)
		}
	}
}

func TestRecordBMUDataAutoIDReusesStubAcrossHotPath(t *testing.T) {
	stub := newStateStub()
	ctx := &countingTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}
	key, err := lastFCKey("did:test:1")
	if err != nil {
		t.Fatalf("lastFCKey failed: %v", err)
	}
	if err := stub.PutState(key, encodeLastFCBinding("P1", 0, false)); err != nil {
		t.Fatalf("PutState lastFc: %v", err)
	}

	err = contract.RecordBMUDataAutoID(ctx,
		"P1", "did:test:1",
		"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "sig",
		"1", "80", "400.0", "0.0",
		"35", "96", "0", "0",
		"2026-05-18T00:00:00Z",
	)
	if err != nil {
		t.Fatalf("RecordBMUDataAutoID failed: %v", err)
	}
	if ctx.getStubCalls != 1 {
		t.Fatalf("RecordBMUDataAutoID should reuse one stub across hot path, got %d GetStub calls", ctx.getStubCalls)
	}
}

func TestRecordBMUDataAutoIDUsesGenericMarshalWithoutDuplicateRecordRead(t *testing.T) {
	txID := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	dataHash := "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
	passportID := "P-AUTOID-1"
	did := "did:test:autoid:1"
	signature := `sig<&>"`
	timestamp := "2026-05-19T03:00:00.000Z"

	stub := newStateStub()
	stub.txID = txID
	stub.timestamp = &timestamppb.Timestamp{Seconds: 1779129000}
	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}

	lastFcKey := lastFCKeyFromValidatedDID(did)
	if err := stub.PutState(lastFcKey, encodeLastFCBinding(passportID, 9999, true)); err != nil {
		t.Fatalf("PutState lastFc: %v", err)
	}
	stub.getStateKeys = nil
	stub.putStateKeys = nil

	if err := contract.RecordBMUDataAutoID(ctx,
		passportID, did,
		dataHash, signature,
		"10000", "32768", "40.000", "0.000",
		"30000", "96", "0", "0",
		timestamp,
	); err != nil {
		t.Fatalf("RecordBMUDataAutoID failed: %v", err)
	}

	got := stub.state[txID]
	if got == nil {
		t.Fatalf("RecordBMUDataAutoID did not store record under txID %s", txID)
	}
	want := marshalBMURecordAutoIDValidFieldsCreatedAtTime(
		txID, passportID, did, dataHash, signature,
		10000, 32768, 40, 0, 30000, 96, 0, 0,
		timestamp, time.Unix(1779129000, 0).UTC(), mspManufacturer,
	)
	if string(got) != string(want) {
		t.Fatalf("AutoID marshal mismatch\nwant: %s\n got: %s", want, got)
	}

	for _, key := range stub.getStateKeys {
		if key == txID {
			t.Fatalf("AutoID path must not perform duplicate GetState on txID; reads=%v", stub.getStateKeys)
		}
	}
	if !reflect.DeepEqual(stub.getStateKeys, []string{lastFcKey}) {
		t.Fatalf("AutoID path should perform exactly one GetState on lastFc, got %v", stub.getStateKeys)
	}
	if !reflect.DeepEqual(stub.putStateKeys, []string{txID, lastFcKey}) {
		t.Fatalf("AutoID path should perform exactly two PutState calls [record,lastFc], got %v", stub.putStateKeys)
	}
	boundPassportID, fc, hasFC, legacy, err := decodeLastFCBinding(stub.state[lastFcKey])
	if err != nil {
		t.Fatalf("decode updated lastFc: %v", err)
	}
	if boundPassportID != passportID || fc != 10000 || !hasFC || legacy {
		t.Fatalf("unexpected updated lastFc binding passport=%q fc=%d hasFC=%v legacy=%v", boundPassportID, fc, hasFC, legacy)
	}
}

func TestRepairFCBindingForDIDMigratesLegacyNumericBinding(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}
	passportID := "P1"
	did := "did:test:repair"

	passportJSON, err := json.Marshal(BatteryPassport{DocType: docTypePassport, PassportID: passportID, DID: did})
	if err != nil {
		t.Fatalf("marshal passport: %v", err)
	}
	if err := stub.PutState(passportID, passportJSON); err != nil {
		t.Fatalf("PutState passport: %v", err)
	}
	lastFcKey := lastFCKeyFromValidatedDID(did)
	if err := stub.PutState(lastFcKey, []byte("42")); err != nil {
		t.Fatalf("PutState legacy lastFc: %v", err)
	}
	stub.putStateKeys = nil

	if err := contract.RepairFCBindingForDID(ctx, passportID, did, "migrate legacy lastFc"); err != nil {
		t.Fatalf("RepairFCBindingForDID failed: %v", err)
	}

	boundPassportID, fc, hasFC, legacy, err := decodeLastFCBinding(stub.state[lastFcKey])
	if err != nil {
		t.Fatalf("decode repaired binding: %v", err)
	}
	if boundPassportID != passportID || fc != 42 || !hasFC || legacy {
		t.Fatalf("unexpected repaired binding passport=%q fc=%d hasFC=%v legacy=%v", boundPassportID, fc, hasFC, legacy)
	}
	if len(stub.putStateKeys) != 2 || stub.putStateKeys[0] != lastFcKey || !strings.HasPrefix(stub.putStateKeys[1], "FCREPAIR-") {
		t.Fatalf("expected binding repair and audit log writes, got %v", stub.putStateKeys)
	}
	var repairLog FCRepairLog
	if err := json.Unmarshal(stub.state[stub.putStateKeys[1]], &repairLog); err != nil {
		t.Fatalf("unmarshal repair log: %v", err)
	}
	if repairLog.Source != "legacyNumeric" || repairLog.PreviousFC != 42 || repairLog.RepairedFC != 42 || !repairLog.HasFC {
		t.Fatalf("unexpected repair log: %+v", repairLog)
	}
}

func TestRepairFCBindingForDIDRebuildsMissingBindingFromLatestRecord(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspRegulator, stub: stub}
	contract := &PassportContract{}
	passportID := "P1"
	did := "did:test:repair"

	passportJSON, err := json.Marshal(BatteryPassport{DocType: docTypePassport, PassportID: passportID, DID: did})
	if err != nil {
		t.Fatalf("marshal passport: %v", err)
	}
	if err := stub.PutState(passportID, passportJSON); err != nil {
		t.Fatalf("PutState passport: %v", err)
	}
	bmuKV := func(recordID string, fc uint64) *queryresult.KV {
		t.Helper()
		record := BMURecord{
			DocType:    docTypeBMURecord,
			RecordID:   recordID,
			PassportID: passportID,
			DID:        did,
			FC:         fc,
			Status:     "VALID",
		}
		recordJSON, err := json.Marshal(record)
		if err != nil {
			t.Fatalf("marshal BMU record: %v", err)
		}
		return &queryresult.KV{Key: recordID, Value: recordJSON}
	}
	stub.queryResults = []*queryresult.KV{
		bmuKV("B-old", 3),
		bmuKV("B-new", 7),
	}
	stub.putStateKeys = nil

	if err := contract.RepairFCBindingForDID(ctx, passportID, did, "rebuild missing lastFc"); err != nil {
		t.Fatalf("RepairFCBindingForDID failed: %v", err)
	}

	lastFcKey := lastFCKeyFromValidatedDID(did)
	boundPassportID, fc, hasFC, legacy, err := decodeLastFCBinding(stub.state[lastFcKey])
	if err != nil {
		t.Fatalf("decode repaired binding: %v", err)
	}
	if boundPassportID != passportID || fc != 7 || !hasFC || legacy {
		t.Fatalf("unexpected repaired binding passport=%q fc=%d hasFC=%v legacy=%v", boundPassportID, fc, hasFC, legacy)
	}
	if len(stub.queryStrings) != 1 || !strings.Contains(stub.queryStrings[0], `"did":"did:test:repair"`) {
		t.Fatalf("expected latest valid DID query, got %v", stub.queryStrings)
	}
}

func TestMarshalBMURecordStateMatchesEncodingJSONForHotPath(t *testing.T) {
	record := &BMURecord{
		DocType:         docTypeBMURecord,
		RecordID:        "test-tx",
		PassportID:      "P1",
		DID:             "did:test:1",
		DataHash:        strings.Repeat("a", 64),
		Signature:       "sigProof",
		FC:              1,
		SOC:             32768,
		Voltage:         40,
		Current:         0,
		Temperature:     30000,
		CellCount:       96,
		StatusFlags:     0,
		DischargeCycles: 0,
		Timestamp:       "2026-05-18T00:00:00Z",
		Status:          "VALID",
		CreatedAt:       "2026-05-18T00:00:01Z",
		CreatorMSP:      mspManufacturer,
	}

	got, err := marshalBMURecordState(record)
	if err != nil {
		t.Fatalf("marshalBMURecordState failed: %v", err)
	}
	want, err := json.Marshal(record)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}
	if string(got) != string(want) {
		t.Fatalf("custom BMU marshal mismatch\nwant: %s\n got: %s", want, got)
	}
}

func TestMarshalBMURecordValidStateMatchesEncodingJSONForHotPath(t *testing.T) {
	record := &BMURecord{
		DocType:         docTypeBMURecord,
		RecordID:        "test-tx",
		PassportID:      "P1",
		DID:             "did:test:1",
		DataHash:        strings.Repeat("a", 64),
		Signature:       "sigProof",
		FC:              1,
		SOC:             32768,
		Voltage:         40,
		Current:         0,
		Temperature:     30000,
		CellCount:       96,
		StatusFlags:     0,
		DischargeCycles: 0,
		Timestamp:       "2026-05-18T00:00:00Z",
		Status:          "VALID",
		CreatedAt:       "2026-05-18T00:00:01Z",
		CreatorMSP:      mspManufacturer,
	}

	got := marshalBMURecordValidState(record)
	want, err := json.Marshal(record)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}
	if string(got) != string(want) {
		t.Fatalf("valid BMU marshal mismatch\nwant: %s\n got: %s", want, got)
	}
}

func TestMarshalBMURecordAutoIDValidStateMatchesEncodingJSONForHotPath(t *testing.T) {
	record := &BMURecord{
		DocType:         docTypeBMURecord,
		RecordID:        strings.Repeat("a", 64) + `<&>"\`,
		PassportID:      "P1",
		DID:             "did:test:1",
		DataHash:        strings.Repeat("b", 64),
		Signature:       "sigProof<&>",
		FC:              1,
		SOC:             32768,
		Voltage:         40,
		Current:         0,
		Temperature:     30000,
		CellCount:       96,
		StatusFlags:     0,
		DischargeCycles: 0,
		Timestamp:       "2026-05-18T00:00:00.123Z",
		Status:          "VALID",
		CreatedAt:       "2026-05-18T00:00:01Z",
		CreatorMSP:      mspManufacturer,
	}

	got := marshalBMURecordAutoIDValidState(record)
	want, err := json.Marshal(record)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}
	if string(got) != string(want) {
		t.Fatalf("auto-id valid BMU marshal mismatch\nwant: %s\n got: %s", want, got)
	}
}

func TestMarshalBMURecordAutoIDValidFieldsFitsFabricTxIDCapacity(t *testing.T) {
	got := marshalBMURecordAutoIDValidFields(
		"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		"P-BMU-12345678-0001",
		"did:bmu:12345678:0001",
		"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		"sigProof",
		10000,
		32768,
		40,
		0,
		30000,
		96,
		0,
		0,
		"2026-05-19T03:00:00.000Z",
		"2026-05-19T03:00:00Z",
		mspManufacturer,
	)
	if len(got) > cap(got) {
		t.Fatalf("marshal output exceeded capacity, len=%d cap=%d", len(got), cap(got))
	}
	if cap(got) != 508 {
		t.Fatalf("expected Fabric txID capacity to stay in 512-byte allocation class, got len=%d cap=%d", len(got), cap(got))
	}
}

func TestMarshalBMURecordAutoIDValidFieldsCreatedAtTimeMatchesStringPath(t *testing.T) {
	createdAt := time.Unix(1779129000, 987654321).UTC()
	got := marshalBMURecordAutoIDValidFieldsCreatedAtTime(
		"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		"P-BMU-12345678-0001",
		"did:bmu:12345678:0001",
		"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		"sigProof",
		10000,
		32768,
		40,
		0,
		30000,
		96,
		0,
		0,
		"2026-05-19T03:00:00.000Z",
		createdAt,
		mspManufacturer,
	)
	want := marshalBMURecordAutoIDValidFields(
		"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		"P-BMU-12345678-0001",
		"did:bmu:12345678:0001",
		"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		"sigProof",
		10000,
		32768,
		40,
		0,
		30000,
		96,
		0,
		0,
		"2026-05-19T03:00:00.000Z",
		createdAt.Format(time.RFC3339),
		mspManufacturer,
	)
	if string(got) != string(want) {
		t.Fatalf("createdAt time marshal mismatch\nwant: %s\n got: %s", want, got)
	}
	if cap(got) != 508 {
		t.Fatalf("expected createdAt time marshal to stay in 512-byte allocation class, got len=%d cap=%d", len(got), cap(got))
	}
}

func TestAppendUTCSecondRFC3339MatchesTimeAppendFormat(t *testing.T) {
	cases := []time.Time{
		time.Unix(1779129000, 0).UTC(),
		time.Unix(1779129000, 987654321).UTC(),
		time.Date(2026, 5, 19, 3, 0, 0, 123456789, time.FixedZone("KST", 9*60*60)),
		time.Date(10000, 1, 2, 3, 4, 5, 0, time.UTC),
	}
	for _, tt := range cases {
		got := appendUTCSecondRFC3339(nil, tt)
		want := tt.AppendFormat(nil, time.RFC3339)
		if string(got) != string(want) {
			t.Fatalf("appendUTCSecondRFC3339(%s) mismatch\nwant: %s\n got: %s", tt, want, got)
		}
	}
}

func TestAppendJSONLowerHex64StringFastPathAndFallback(t *testing.T) {
	lowerHex := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	got, ok := appendJSONLowerHex64String(nil, lowerHex)
	if !ok {
		t.Fatal("expected lowercase 64-char hex to use fast path")
	}
	want, err := json.Marshal(lowerHex)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}
	if string(got) != string(want) {
		t.Fatalf("lower hex JSON mismatch\nwant: %s\n got: %s", want, got)
	}

	if _, ok := appendJSONLowerHex64String(nil, strings.ToUpper(lowerHex)); ok {
		t.Fatal("expected uppercase hex to use fallback")
	}
	if _, ok := appendJSONLowerHex64String(nil, lowerHex[:63]); ok {
		t.Fatal("expected short value to use fallback")
	}
	if _, ok := appendJSONLowerHex64String(nil, strings.Repeat("g", 64)); ok {
		t.Fatal("expected non-hex value to use fallback")
	}
}

func TestMarshalBMURecordAutoIDValidStatePreservesNegativeZeroCurrent(t *testing.T) {
	record := &BMURecord{
		DocType:         docTypeBMURecord,
		RecordID:        strings.Repeat("a", 64),
		PassportID:      "P-BMU-12345678-0001",
		DID:             "did:bmu:12345678:0001",
		DataHash:        strings.Repeat("b", 64),
		Signature:       "sigProof",
		FC:              10000,
		SOC:             32768,
		Voltage:         40,
		Current:         math.Copysign(0, -1),
		Temperature:     30000,
		CellCount:       96,
		StatusFlags:     0,
		DischargeCycles: 0,
		Timestamp:       "2026-05-19T03:00:00.000Z",
		Status:          "VALID",
		CreatedAt:       "2026-05-19T03:00:00Z",
		CreatorMSP:      mspManufacturer,
	}

	got := marshalBMURecordAutoIDValidState(record)
	want, err := json.Marshal(record)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}
	if string(got) != string(want) {
		t.Fatalf("negative-zero auto-id marshal mismatch\nwant: %s\n got: %s", want, got)
	}
}

func TestAppendJSONBMUFloatCommonValuesMatchEncodingJSON(t *testing.T) {
	for _, value := range []float64{0, math.Copysign(0, -1), 40, 40.125, -1.5} {
		got := appendJSONBMUFloat(nil, value)
		want, err := json.Marshal(value)
		if err != nil {
			t.Fatalf("json.Marshal(%v) failed: %v", value, err)
		}
		if string(got) != string(want) {
			t.Fatalf("appendJSONBMUFloat(%v) = %s, want %s", value, got, want)
		}
	}
}

func TestMarshalBMURecordStateMatchesEncodingJSONWithOptionalAndEscaping(t *testing.T) {
	record := &BMURecord{
		DocType:                docTypeBMURecord,
		RecordID:               "B<&>\"\\\n",
		PassportID:             "P\u2028",
		DID:                    "did:test:\u2029",
		DataHash:               strings.Repeat("b", 64),
		Signature:              "sig<&>\u2028\u2029" + string([]byte{0xff}),
		FC:                     18446744073709551615,
		SOC:                    65535,
		Voltage:                40.125,
		Current:                -1.5,
		Temperature:            30000,
		CellCount:              96,
		StatusFlags:            7,
		DischargeCycles:        42,
		BMSBindingCode32:       123456,
		RawPayloadHashVerified: true,
		Timestamp:              "2026-05-18T00:00:00Z",
		Status:                 "INVALIDATED",
		InvalidatedBy:          "Regulator<&>",
		InvalidatedAt:          "2026-05-18T00:00:02Z",
		InvalidReason:          "reason<&>\n",
		CreatedAt:              "2026-05-18T00:00:01Z",
		CreatorMSP:             mspRegulator,
	}

	got, err := marshalBMURecordState(record)
	if err != nil {
		t.Fatalf("marshalBMURecordState failed: %v", err)
	}
	want, err := json.Marshal(record)
	if err != nil {
		t.Fatalf("json.Marshal failed: %v", err)
	}
	if string(got) != string(want) {
		t.Fatalf("custom BMU marshal mismatch\nwant: %s\n got: %s", want, got)
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
	valid := map[string]float64{
		"40.000": 40,
		"0.000":  0,
		"-12.5":  -12.5,
		"1e3":    1000,
		".5":     0.5,
	}
	for value, want := range valid {
		got, err := parseFiniteFloat("voltage", value)
		if err != nil {
			t.Fatalf("expected finite float %q to parse, got %v", value, err)
		}
		if got != want {
			t.Fatalf("parseFiniteFloat(%q) = %v, want %v", value, got, want)
		}
	}

	for _, value := range []string{"NaN", "+Inf", "-Inf"} {
		if _, err := parseFiniteFloat("voltage", value); err == nil {
			t.Fatalf("expected non-finite float %q to be rejected", value)
		}
	}
	if _, err := parseNonNegativeFloat("quantity", "-1"); err == nil {
		t.Fatal("expected negative raw material quantity to be rejected")
	}
}

func TestParseSimpleDecimalFloatFastMatchesStrconvParseFloat(t *testing.T) {
	for _, value := range []string{
		"40.000",
		"0.000",
		"+40.000",
		"-40.125",
		"-12.5",
		"+12.5",
		".5",
		"1.",
		"123456789012345",
		"123456789012.345",
	} {
		got, ok := parseSimpleDecimalFloatFast(value)
		if !ok {
			t.Fatalf("expected fast decimal parse for %q", value)
		}
		want, err := strconv.ParseFloat(value, 64)
		if err != nil {
			t.Fatalf("strconv.ParseFloat(%q) failed: %v", value, err)
		}
		if got != want {
			t.Fatalf("parseSimpleDecimalFloatFast(%q) = %v, want %v", value, got, want)
		}
	}
}

func TestParseFixed3DecimalFloatFastMatchesStrconvParseFloat(t *testing.T) {
	for _, value := range []string{
		"0.000",
		"40.000",
		"+40.125",
		"-40.125",
		"123456789012.345",
	} {
		got, ok := parseFixed3DecimalFloatFast(value)
		if !ok {
			t.Fatalf("expected fixed-3 fast decimal parse for %q", value)
		}
		want, err := strconv.ParseFloat(value, 64)
		if err != nil {
			t.Fatalf("strconv.ParseFloat(%q) failed: %v", value, err)
		}
		if got != want {
			t.Fatalf("parseFixed3DecimalFloatFast(%q) = %v, want %v", value, got, want)
		}
	}
}

func TestParseFiniteFloatCommonFastPreservesFallbackSemantics(t *testing.T) {
	if got, err := parseFiniteFloatCommonFast("voltage", "40.000", "40.000", 40); err != nil || got != 40 {
		t.Fatalf("parseFiniteFloatCommonFast common = %v, %v; want 40, nil", got, err)
	}
	if got, err := parseFiniteFloatCommonFast("voltage", "40.125", "40.000", 40); err != nil || got != 40.125 {
		t.Fatalf("parseFiniteFloatCommonFast fallback = %v, %v; want 40.125, nil", got, err)
	}
	if got, err := parseFiniteFloatCommonFast("current", "-0.000", "0.000", 0); err != nil || !math.Signbit(got) {
		t.Fatalf("parseFiniteFloatCommonFast negative zero fallback = %v, %v; want negative zero, nil", got, err)
	}
	if _, err := parseFiniteFloatCommonFast("voltage", "NaN", "40.000", 40); err == nil {
		t.Fatal("expected NaN fallback to be rejected")
	}
}

func TestParseBMUAutoIDConstantFieldsMatchesDefaultBMUValues(t *testing.T) {
	soc, voltage, current, temperature, cellCount, statusFlags, dischargeCycles, ok := parseBMUAutoIDConstantFields(
		"32768", "40.000", "0.000", "30000", "96", "0", "0",
	)
	if !ok {
		t.Fatal("expected BMU default fields to use constant-field fast path")
	}
	if soc != 32768 || voltage != 40 || current != 0 || temperature != 30000 ||
		cellCount != 96 || statusFlags != 0 || dischargeCycles != 0 {
		t.Fatalf("unexpected parsed defaults: soc=%d voltage=%v current=%v temperature=%d cellCount=%d statusFlags=%d dischargeCycles=%d",
			soc, voltage, current, temperature, cellCount, statusFlags, dischargeCycles)
	}
	if _, _, _, _, _, _, _, ok := parseBMUAutoIDConstantFields("32769", "40.000", "0.000", "30000", "96", "0", "0"); ok {
		t.Fatal("expected non-default SOC to fall back to regular parsers")
	}
	if _, _, _, _, _, _, _, ok := parseBMUAutoIDConstantFields("32768", "40.000", "-0.000", "30000", "96", "0", "0"); ok {
		t.Fatal("expected negative zero current to fall back to regular parsers")
	}
}

func TestParseSimpleDecimalFloatFastFallsBackForComplexOrRiskyValues(t *testing.T) {
	for _, value := range []string{
		"",
		"+",
		"-",
		"1e3",
		"NaN",
		"+Inf",
		"1.2.3",
		"1234567890123456",
		"1234567890123.456",
	} {
		if got, ok := parseSimpleDecimalFloatFast(value); ok {
			t.Fatalf("expected %q to use strconv fallback, got fast value %v", value, got)
		}
	}
}

func TestParseUint10FastMatchesStrconvParseUint(t *testing.T) {
	tests := []struct {
		value   string
		bitSize int
	}{
		{value: "0", bitSize: 64},
		{value: "1", bitSize: 64},
		{value: "18446744073709551615", bitSize: 64},
		{value: "18446744073709551616", bitSize: 64},
		{value: "65535", bitSize: 16},
		{value: "65536", bitSize: 16},
		{value: "255", bitSize: 8},
		{value: "256", bitSize: 8},
		{value: "", bitSize: 16},
		{value: "+1", bitSize: 16},
		{value: "-1", bitSize: 16},
		{value: "1_000", bitSize: 16},
	}

	for _, tt := range tests {
		got, gotErr := parseUint10Fast(tt.value, tt.bitSize)
		want, wantErr := strconv.ParseUint(tt.value, 10, tt.bitSize)
		if got != want {
			t.Fatalf("parseUint10Fast(%q, %d) = %d, want %d", tt.value, tt.bitSize, got, want)
		}
		if (gotErr == nil) != (wantErr == nil) {
			t.Fatalf("parseUint10Fast(%q, %d) error = %v, want %v", tt.value, tt.bitSize, gotErr, wantErr)
		}
		if gotErr != nil && wantErr != nil && gotErr.Error() != wantErr.Error() {
			t.Fatalf("parseUint10Fast(%q, %d) error = %q, want %q", tt.value, tt.bitSize, gotErr.Error(), wantErr.Error())
		}
	}
}

func TestDedicatedParseUintFastHelpersMatchStrconvParseUint(t *testing.T) {
	tests := []struct {
		name    string
		parse   func(string) (uint64, error)
		value   string
		bitSize int
	}{
		{name: "uint64 max", parse: parseUint64Fast, value: "18446744073709551615", bitSize: 64},
		{name: "uint64 overflow", parse: parseUint64Fast, value: "18446744073709551616", bitSize: 64},
		{name: "uint64 short no-overflow path", parse: parseUint64Fast, value: "9999999999999999999", bitSize: 64},
		{name: "uint64 short invalid fallback", parse: parseUint64Fast, value: "123x", bitSize: 64},
		{name: "uint16 max", parse: parseUint16Fast, value: "65535", bitSize: 16},
		{name: "uint16 overflow", parse: parseUint16Fast, value: "65536", bitSize: 16},
		{name: "uint16 long fallback", parse: parseUint16Fast, value: "000000", bitSize: 16},
		{name: "uint16 invalid fallback", parse: parseUint16Fast, value: "12x", bitSize: 16},
		{name: "uint8 max", parse: parseUint8Fast, value: "255", bitSize: 8},
		{name: "uint8 overflow", parse: parseUint8Fast, value: "256", bitSize: 8},
		{name: "uint8 long fallback", parse: parseUint8Fast, value: "0000", bitSize: 8},
		{name: "uint8 invalid fallback", parse: parseUint8Fast, value: "1_0", bitSize: 8},
		{name: "empty", parse: parseUint16Fast, value: "", bitSize: 16},
		{name: "signed fallback", parse: parseUint16Fast, value: "+1", bitSize: 16},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, gotErr := tt.parse(tt.value)
			want, wantErr := strconv.ParseUint(tt.value, 10, tt.bitSize)
			if got != want {
				t.Fatalf("%s parse(%q) = %d, want %d", tt.name, tt.value, got, want)
			}
			if (gotErr == nil) != (wantErr == nil) {
				t.Fatalf("%s parse(%q) error = %v, want %v", tt.name, tt.value, gotErr, wantErr)
			}
			if gotErr != nil && wantErr != nil && gotErr.Error() != wantErr.Error() {
				t.Fatalf("%s parse(%q) error = %q, want %q", tt.name, tt.value, gotErr.Error(), wantErr.Error())
			}
		})
	}
}

func TestParseUintCommonFastHelpersPreserveFallbackSemantics(t *testing.T) {
	if got, err := parseUint16CommonFast("32768", "32768", 32768); err != nil || got != 32768 {
		t.Fatalf("parseUint16CommonFast common = %d, %v; want 32768, nil", got, err)
	}
	if got, err := parseUint16CommonFast("42", "32768", 32768); err != nil || got != 42 {
		t.Fatalf("parseUint16CommonFast fallback = %d, %v; want 42, nil", got, err)
	}
	if _, err := parseUint16CommonFast("65536", "32768", 32768); err == nil {
		t.Fatal("expected uint16 overflow fallback to be rejected")
	}
	if got, err := parseUint8CommonFast("96", "96", 96); err != nil || got != 96 {
		t.Fatalf("parseUint8CommonFast common = %d, %v; want 96, nil", got, err)
	}
	if got, err := parseUint8CommonFast("7", "96", 96); err != nil || got != 7 {
		t.Fatalf("parseUint8CommonFast fallback = %d, %v; want 7, nil", got, err)
	}
	if _, err := parseUint8CommonFast("256", "96", 96); err == nil {
		t.Fatal("expected uint8 overflow fallback to be rejected")
	}
}

func TestParseUint10BytesFastMatchesStrconvParseUint(t *testing.T) {
	tests := []struct {
		value   string
		bitSize int
	}{
		{value: "0", bitSize: 64},
		{value: "42", bitSize: 64},
		{value: "9999999999999999999", bitSize: 64},
		{value: "18446744073709551615", bitSize: 64},
		{value: "18446744073709551616", bitSize: 64},
		{value: "65535", bitSize: 16},
		{value: "65536", bitSize: 16},
		{value: "", bitSize: 16},
		{value: "+1", bitSize: 16},
		{value: "1_000", bitSize: 16},
	}

	for _, tt := range tests {
		got, gotErr := parseUint10BytesFast([]byte(tt.value), tt.bitSize)
		want, wantErr := strconv.ParseUint(tt.value, 10, tt.bitSize)
		if got != want {
			t.Fatalf("parseUint10BytesFast(%q, %d) = %d, want %d", tt.value, tt.bitSize, got, want)
		}
		if (gotErr == nil) != (wantErr == nil) {
			t.Fatalf("parseUint10BytesFast(%q, %d) error = %v, want %v", tt.value, tt.bitSize, gotErr, wantErr)
		}
		if gotErr != nil && wantErr != nil && gotErr.Error() != wantErr.Error() {
			t.Fatalf("parseUint10BytesFast(%q, %d) error = %q, want %q", tt.value, tt.bitSize, gotErr.Error(), wantErr.Error())
		}
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

func TestPassportDIDBindingIndexAcceptsHotPath(t *testing.T) {
	stub := newStateStub()

	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}
	if err := contract.putPassportDIDBinding(ctx, "P1", "did:test:1"); err != nil {
		t.Fatalf("putPassportDIDBinding failed: %v", err)
	}

	key, err := passportDIDBindingKey(ctx, "P1", "did:test:1")
	if err != nil {
		t.Fatalf("passportDIDBindingKey failed: %v", err)
	}
	value, err := stub.GetState(key)
	if err != nil {
		t.Fatalf("GetState binding failed: %v", err)
	}
	if string(value) != "1" {
		t.Fatalf("unexpected binding value %q", string(value))
	}

	if err := contract.validatePassportDIDBinding(ctx, "P1", "did:test:1"); err != nil {
		t.Fatalf("expected indexed binding to validate without full passport fallback: %v", err)
	}
}

func TestPassportDIDBindingFallbackAcceptsPreIndexPassport(t *testing.T) {
	stub := newStateStub()

	passportJSON, err := json.Marshal(BatteryPassport{
		DocType:    docTypePassport,
		PassportID: "P1",
		DID:        "did:test:1",
	})
	if err != nil {
		t.Fatalf("marshal passport: %v", err)
	}
	if err := stub.PutState("P1", passportJSON); err != nil {
		t.Fatalf("PutState passport: %v", err)
	}

	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	if err := (&PassportContract{}).validatePassportDIDBinding(ctx, "P1", "did:test:1"); err != nil {
		t.Fatalf("expected pre-index passport fallback to validate: %v", err)
	}
}

func TestPassportDIDBindingFallbackRejectsDIDMismatch(t *testing.T) {
	stub := newStateStub()

	passportJSON, err := json.Marshal(BatteryPassport{
		DocType:    docTypePassport,
		PassportID: "P1",
		DID:        "did:test:real",
	})
	if err != nil {
		t.Fatalf("marshal passport: %v", err)
	}
	if err := stub.PutState("P1", passportJSON); err != nil {
		t.Fatalf("PutState passport: %v", err)
	}

	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	err = (&PassportContract{}).validatePassportDIDBinding(ctx, "P1", "did:test:other")
	if err == nil {
		t.Fatal("expected DID mismatch to be rejected")
	}
	if !strings.Contains(err.Error(), "DID mismatch") {
		t.Fatalf("expected DID mismatch error, got %v", err)
	}
}

func TestLastFCBindingRoundTripAndLegacyDecode(t *testing.T) {
	encoded := encodeLastFCBinding("P1", 42, true)
	passportID, fc, hasFC, legacy, err := decodeLastFCBinding(encoded)
	if err != nil {
		t.Fatalf("decodeLastFCBinding failed: %v", err)
	}
	if passportID != "P1" || fc != 42 || !hasFC || legacy {
		t.Fatalf("unexpected decoded binding passport=%q fc=%d hasFC=%v legacy=%v", passportID, fc, hasFC, legacy)
	}

	encoded = encodeLastFCBinding("P1", 0, false)
	passportID, fc, hasFC, legacy, err = decodeLastFCBinding(encoded)
	if err != nil {
		t.Fatalf("decode initial binding failed: %v", err)
	}
	if passportID != "P1" || fc != 0 || hasFC || legacy {
		t.Fatalf("unexpected decoded initial binding passport=%q fc=%d hasFC=%v legacy=%v", passportID, fc, hasFC, legacy)
	}

	passportID, fc, hasFC, legacy, err = decodeLastFCBinding([]byte("7"))
	if err != nil {
		t.Fatalf("decode legacy numeric failed: %v", err)
	}
	if passportID != "" || fc != 7 || !hasFC || !legacy {
		t.Fatalf("unexpected decoded legacy binding passport=%q fc=%d hasFC=%v legacy=%v", passportID, fc, hasFC, legacy)
	}
}

func TestEncodeLastFCBindingUsesExactCapacity(t *testing.T) {
	for _, tt := range []struct {
		name       string
		passportID string
		fc         uint64
		hasFC      bool
	}{
		{name: "initial", passportID: "P-BMU-12345678-0001", hasFC: false},
		{name: "one digit", passportID: "P-BMU-12345678-0001", fc: 9, hasFC: true},
		{name: "four digits", passportID: "P-BMU-12345678-0001", fc: 9999, hasFC: true},
		{name: "five digits", passportID: "P-BMU-12345678-0001", fc: 10000, hasFC: true},
		{name: "max uint64", passportID: "P-BMU-12345678-0001", fc: ^uint64(0), hasFC: true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			encoded := encodeLastFCBinding(tt.passportID, tt.fc, tt.hasFC)
			if len(encoded) != cap(encoded) {
				t.Fatalf("expected exact capacity, len=%d cap=%d encoded=%q", len(encoded), cap(encoded), encoded)
			}

			passportID, fc, hasFC, legacy, err := decodeLastFCBinding(encoded)
			if err != nil {
				t.Fatalf("decodeLastFCBinding failed: %v", err)
			}
			if passportID != tt.passportID || fc != tt.fc || hasFC != tt.hasFC || legacy {
				t.Fatalf("unexpected decoded binding passport=%q fc=%d hasFC=%v legacy=%v", passportID, fc, hasFC, legacy)
			}
		})
	}
}

func TestAppendLastFCBindingMatchesEncodeLastFCBinding(t *testing.T) {
	for _, tt := range []struct {
		name       string
		passportID string
		fc         uint64
		hasFC      bool
	}{
		{name: "initial", passportID: "P-BMU-12345678-0001", hasFC: false},
		{name: "canonical", passportID: "P-BMU-12345678-0001", fc: 10000, hasFC: true},
		{name: "large passport id fallback capacity", passportID: strings.Repeat("P", 80), fc: ^uint64(0), hasFC: true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var buf [64]byte
			got := appendLastFCBinding(buf[:0], tt.passportID, tt.fc, tt.hasFC)
			want := encodeLastFCBinding(tt.passportID, tt.fc, tt.hasFC)
			if string(got) != string(want) {
				t.Fatalf("appendLastFCBinding mismatch\nwant: %q\n got: %q", want, got)
			}
		})
	}
}

func TestDecodeLastFCBindingForPassportAvoidsMatchAllocationPath(t *testing.T) {
	encoded := encodeLastFCBinding("P1", 42, true)
	passportID, fc, hasFC, legacy, matches, err := decodeLastFCBindingForPassport(encoded, "P1")
	if err != nil {
		t.Fatalf("decodeLastFCBindingForPassport failed: %v", err)
	}
	if passportID != "P1" || fc != 42 || !hasFC || legacy || !matches {
		t.Fatalf("unexpected matched binding passport=%q fc=%d hasFC=%v legacy=%v matches=%v", passportID, fc, hasFC, legacy, matches)
	}

	passportID, fc, hasFC, legacy, matches, err = decodeLastFCBindingForPassport(encoded, "P2")
	if err != nil {
		t.Fatalf("decode mismatched binding failed: %v", err)
	}
	if passportID != "P1" || fc != 42 || !hasFC || legacy || matches {
		t.Fatalf("unexpected mismatched binding passport=%q fc=%d hasFC=%v legacy=%v matches=%v", passportID, fc, hasFC, legacy, matches)
	}

	passportID, fc, hasFC, legacy, matches, err = decodeLastFCBindingForPassport([]byte("7"), "P1")
	if err != nil {
		t.Fatalf("decode legacy numeric failed: %v", err)
	}
	if passportID != "" || fc != 7 || !hasFC || !legacy || matches {
		t.Fatalf("unexpected legacy binding passport=%q fc=%d hasFC=%v legacy=%v matches=%v", passportID, fc, hasFC, legacy, matches)
	}
}

func TestLastFCKeyMatchesFabricCompositeKey(t *testing.T) {
	for _, did := range []string{"did:test:1", "did:테스트:1"} {
		got, err := lastFCKey(did)
		if err != nil {
			t.Fatalf("lastFCKey failed for %q: %v", did, err)
		}
		want, err := shim.CreateCompositeKey("lastFc", []string{did})
		if err != nil {
			t.Fatalf("shim.CreateCompositeKey failed for %q: %v", did, err)
		}
		if got != want {
			t.Fatalf("lastFCKey(%q) = %q, want Fabric composite key %q", did, got, want)
		}
		if trusted := lastFCKeyFromValidatedDID(did); trusted != got {
			t.Fatalf("lastFCKeyFromValidatedDID(%q) = %q, want %q", did, trusted, got)
		}
	}

	if _, err := lastFCKey("did:test:\x00bad"); err == nil {
		t.Fatal("lastFCKey should reject null byte attributes like Fabric CreateCompositeKey")
	}
	if _, err := lastFCKey("did:test:" + string(rune(0x10ffff))); err == nil {
		t.Fatal("lastFCKey should reject max-rune attributes like Fabric CreateCompositeKey")
	}
	if _, err := lastFCKey(string([]byte{0xff, 0xfe})); err == nil {
		t.Fatal("lastFCKey should reject invalid UTF-8 attributes like Fabric CreateCompositeKey")
	}
}

func TestInitialPassportFCBindingDoesNotOverwriteExistingHighWater(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}

	key, err := lastFCKey("did:test:1")
	if err != nil {
		t.Fatalf("lastFCKey failed: %v", err)
	}
	if err := stub.PutState(key, encodeLastFCBinding("P1", 99, true)); err != nil {
		t.Fatalf("PutState existing lastFc: %v", err)
	}

	if err := contract.putInitialPassportFCBinding(ctx, "P1", "did:test:1"); err != nil {
		t.Fatalf("putInitialPassportFCBinding failed: %v", err)
	}

	passportID, fc, hasFC, _, err := decodeLastFCBinding(stub.state[key])
	if err != nil {
		t.Fatalf("decode lastFc: %v", err)
	}
	if passportID != "P1" || fc != 99 || !hasFC {
		t.Fatalf("initial binding overwrote existing high-water: passport=%q fc=%d hasFC=%v", passportID, fc, hasFC)
	}
}

func TestInitialPassportFCBindingAcceptsSamePassportExistingHighWater(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}

	key, err := lastFCKey("did:test:1")
	if err != nil {
		t.Fatalf("lastFCKey failed: %v", err)
	}
	if err := stub.PutState(key, encodeLastFCBinding("P1", 99, true)); err != nil {
		t.Fatalf("PutState existing lastFc: %v", err)
	}

	if err := contract.putInitialPassportFCBinding(ctx, "P1", "did:test:1"); err != nil {
		t.Fatalf("same-passport existing lastFc should be accepted: %v", err)
	}

	passportID, fc, hasFC, legacy, err := decodeLastFCBinding(stub.state[key])
	if err != nil {
		t.Fatalf("decode lastFc: %v", err)
	}
	if passportID != "P1" || fc != 99 || !hasFC || legacy {
		t.Fatalf("same-passport high-water changed unexpectedly: passport=%q fc=%d hasFC=%v legacy=%v", passportID, fc, hasFC, legacy)
	}
}

func TestInitialPassportFCBindingRejectsMismatchedExistingPassport(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}

	key, err := lastFCKey("did:test:1")
	if err != nil {
		t.Fatalf("lastFCKey failed: %v", err)
	}
	if err := stub.PutState(key, encodeLastFCBinding("P0", 99, true)); err != nil {
		t.Fatalf("PutState existing lastFc: %v", err)
	}

	err = contract.putInitialPassportFCBinding(ctx, "P1", "did:test:1")
	if err == nil {
		t.Fatal("expected mismatched existing passport binding to be rejected")
	}
	if !strings.Contains(err.Error(), "bound to passport P0") {
		t.Fatalf("expected explicit mismatch error, got %v", err)
	}
}

func TestInitialPassportFCBindingRejectsLegacyNumericExistingBinding(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}

	key, err := lastFCKey("did:test:1")
	if err != nil {
		t.Fatalf("lastFCKey failed: %v", err)
	}
	if err := stub.PutState(key, []byte("99")); err != nil {
		t.Fatalf("PutState legacy lastFc: %v", err)
	}

	err = contract.putInitialPassportFCBinding(ctx, "P1", "did:test:1")
	if err == nil {
		t.Fatal("expected legacy existing lastFc to require repair instead of silent success")
	}
	if !strings.Contains(err.Error(), "legacy") {
		t.Fatalf("expected legacy repair error, got %v", err)
	}
}

func TestResetFCForDIDPreservesCanonicalBindingAndEmitsAuditEvent(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}

	passportJSON, err := json.Marshal(BatteryPassport{DocType: docTypePassport, PassportID: "P1", DID: "did:test:1"})
	if err != nil {
		t.Fatalf("marshal passport: %v", err)
	}
	if err := stub.PutState("P1", passportJSON); err != nil {
		t.Fatalf("PutState passport: %v", err)
	}
	key, err := lastFCKey("did:test:1")
	if err != nil {
		t.Fatalf("lastFCKey failed: %v", err)
	}
	if err := stub.PutState(key, encodeLastFCBinding("P1", 99, true)); err != nil {
		t.Fatalf("PutState existing lastFc: %v", err)
	}

	if err := contract.ResetFCForDID(ctx, "did:test:1", "BMU reboot reset"); err != nil {
		t.Fatalf("ResetFCForDID failed: %v", err)
	}

	raw := stub.state[key]
	if raw == nil {
		t.Fatal("ResetFCForDID deleted canonical lastFc binding")
	}
	passportID, fc, hasFC, legacy, err := decodeLastFCBinding(raw)
	if err != nil {
		t.Fatalf("decode reset lastFc: %v", err)
	}
	if passportID != "P1" || fc != 0 || hasFC || legacy {
		t.Fatalf("reset did not preserve canonical binding with cleared high-water: passport=%q fc=%d hasFC=%v legacy=%v", passportID, fc, hasFC, legacy)
	}
	logID := "FCRESET-did:test:1-test-tx"
	rawLog := stub.state[logID]
	if rawLog == nil {
		t.Fatal("ResetFCForDID did not write audit log")
	}
	if stub.eventName != logID || string(stub.eventPayload) != string(rawLog) {
		t.Fatalf("ResetFCForDID did not emit audit event name=%q payload=%s log=%s", stub.eventName, stub.eventPayload, rawLog)
	}
	var resetLog FCResetLog
	if err := json.Unmarshal(rawLog, &resetLog); err != nil {
		t.Fatalf("unmarshal reset log: %v", err)
	}
	if resetLog.PassportID != "P1" || resetLog.DID != "did:test:1" || resetLog.PreviousFC != 99 || !resetLog.HasFC || resetLog.ResetBy != mspManufacturer {
		t.Fatalf("unexpected reset log: %+v", resetLog)
	}
}

func TestResetFCForDIDRequiresReasonLengthAndExistingDIDPassport(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}
	key, err := lastFCKey("did:test:1")
	if err != nil {
		t.Fatalf("lastFCKey failed: %v", err)
	}
	if err := stub.PutState(key, encodeLastFCBinding("P1", 99, true)); err != nil {
		t.Fatalf("PutState existing lastFc: %v", err)
	}

	if err := contract.ResetFCForDID(ctx, "did:test:1", "short"); err == nil || !strings.Contains(err.Error(), "at least 10") {
		t.Fatalf("expected short reason to be rejected, got %v", err)
	}
	if err := contract.ResetFCForDID(ctx, "did:test:1", "BMU reboot reset"); err == nil || !strings.Contains(err.Error(), "passport P1 does not exist") {
		t.Fatalf("expected missing passport/DID binding to be rejected, got %v", err)
	}
}

func TestInvalidateBMURecordPreservesCanonicalBindingWhenNoValidRecordRemains(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}

	record := BMURecord{
		DocType:    docTypeBMURecord,
		RecordID:   "B1",
		PassportID: "P1",
		DID:        "did:test:1",
		FC:         99,
		Status:     "VALID",
		CreatedAt:  "2026-05-18T00:00:00Z",
		CreatorMSP: mspManufacturer,
	}
	recordJSON, err := json.Marshal(record)
	if err != nil {
		t.Fatalf("marshal record: %v", err)
	}
	if err := stub.PutState("B1", recordJSON); err != nil {
		t.Fatalf("PutState record: %v", err)
	}
	key, err := lastFCKey("did:test:1")
	if err != nil {
		t.Fatalf("lastFCKey failed: %v", err)
	}
	if err := stub.PutState(key, encodeLastFCBinding("P1", 99, true)); err != nil {
		t.Fatalf("PutState lastFc: %v", err)
	}

	if err := contract.InvalidateBMURecord(ctx, "B1", "benchmark repair"); err != nil {
		t.Fatalf("InvalidateBMURecord failed: %v", err)
	}

	raw := stub.state[key]
	if raw == nil {
		t.Fatal("InvalidateBMURecord deleted canonical lastFc binding")
	}
	passportID, fc, hasFC, legacy, err := decodeLastFCBinding(raw)
	if err != nil {
		t.Fatalf("decode invalidation lastFc: %v", err)
	}
	if passportID != "P1" || fc != 0 || hasFC || legacy {
		t.Fatalf("invalidation did not preserve canonical binding with cleared high-water: passport=%q fc=%d hasFC=%v legacy=%v", passportID, fc, hasFC, legacy)
	}
	var invalidated BMURecord
	if err := json.Unmarshal(stub.state["B1"], &invalidated); err != nil {
		t.Fatalf("unmarshal invalidated record: %v", err)
	}
	if invalidated.Status != "INVALIDATED" || invalidated.InvalidReason != "benchmark repair" {
		t.Fatalf("record was not invalidated correctly: %+v", invalidated)
	}
}

func TestInvalidateBMURecordSnapshotRecoveryScansDIDSelectorWithoutHotPathIndex(t *testing.T) {
	stub := newStateStub()
	ctx := fakeTxContext{msp: mspManufacturer, stub: stub}
	contract := &PassportContract{}

	record := BMURecord{
		DocType:         docTypeBMURecord,
		RecordID:        "B2",
		PassportID:      "P1",
		DID:             "did:test:1",
		FC:              100,
		SOC:             96,
		Temperature:     40,
		StatusFlags:     0,
		DischargeCycles: 7,
		Status:          "VALID",
		CreatedAt:       "2026-05-18T00:00:00Z",
		CreatorMSP:      mspManufacturer,
	}
	recordJSON, err := json.Marshal(record)
	if err != nil {
		t.Fatalf("marshal record: %v", err)
	}
	if err := stub.PutState("B2", recordJSON); err != nil {
		t.Fatalf("PutState record: %v", err)
	}
	key, err := lastFCKey("did:test:1")
	if err != nil {
		t.Fatalf("lastFCKey failed: %v", err)
	}
	if err := stub.PutState(key, encodeLastFCBinding("P1", 100, true)); err != nil {
		t.Fatalf("PutState lastFc: %v", err)
	}
	snapshotKey, err := stub.CreateCompositeKey("snapshot", []string{"P1"})
	if err != nil {
		t.Fatalf("snapshot key: %v", err)
	}
	snapshot := BMUSnapshot{
		DocType:       docTypeBMUSnapshot,
		PassportID:    "P1",
		LastBMUDataID: "B2",
		UpdatedAt:     "2026-05-18T00:00:00Z",
	}
	snapshotJSON, err := json.Marshal(snapshot)
	if err != nil {
		t.Fatalf("marshal snapshot: %v", err)
	}
	if err := stub.PutState(snapshotKey, snapshotJSON); err != nil {
		t.Fatalf("PutState snapshot: %v", err)
	}

	previous := BMURecord{
		DocType:         docTypeBMURecord,
		RecordID:        "B1",
		PassportID:      "P1",
		DID:             "did:test:1",
		FC:              99,
		SOC:             70,
		Temperature:     35,
		StatusFlags:     1,
		DischargeCycles: 6,
		Status:          "VALID",
		CreatedAt:       "2026-05-17T00:00:00Z",
		CreatorMSP:      mspManufacturer,
	}
	previousJSON, err := json.Marshal(previous)
	if err != nil {
		t.Fatalf("marshal previous: %v", err)
	}
	stub.queryResults = []*queryresult.KV{
		// Fabric rich queries do not need to be trusted as read-your-writes for
		// this repair path; the invalidated record must be skipped explicitly.
		{Key: "B2", Value: recordJSON},
		{Key: "B1", Value: previousJSON},
	}

	if err := contract.InvalidateBMURecord(ctx, "B2", "benchmark repair"); err != nil {
		t.Fatalf("InvalidateBMURecord failed: %v", err)
	}
	if len(stub.queryStrings) != 1 {
		t.Fatalf("expected shared lastFc/snapshot recovery query to run once, got %d", len(stub.queryStrings))
	}
	snapshotRecoveryQuery := stub.queryStrings[0]
	if !strings.Contains(snapshotRecoveryQuery, `"did":"did:test:1"`) {
		t.Fatalf("snapshot recovery query should use DID selector: %s", snapshotRecoveryQuery)
	}
	if strings.Contains(snapshotRecoveryQuery, `"passportId"`) {
		t.Fatalf("snapshot recovery query should not require passport+fc index: %s", snapshotRecoveryQuery)
	}
	if strings.Contains(snapshotRecoveryQuery, `"sort"`) || strings.Contains(snapshotRecoveryQuery, `"limit"`) {
		t.Fatalf("snapshot recovery query should scan the DID selector without requiring a CouchDB sort index: %s", snapshotRecoveryQuery)
	}

	var updatedSnapshot BMUSnapshot
	if err := json.Unmarshal(stub.state[snapshotKey], &updatedSnapshot); err != nil {
		t.Fatalf("unmarshal updated snapshot: %v", err)
	}
	if updatedSnapshot.LastBMUDataID != "B1" || updatedSnapshot.CurrentSOC != 70 || updatedSnapshot.Temperature != 35 {
		t.Fatalf("snapshot was not recovered from latest valid DID record: %+v", updatedSnapshot)
	}
}
