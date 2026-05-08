#!/usr/bin/env bash

function requireCAAdminCredentials() {
  : "${CA_ADMIN_USER:?CA_ADMIN_USER must be set}"
  : "${CA_ADMIN_PASSWORD:?CA_ADMIN_PASSWORD must be set}"
}

function createManufacturer() {
  : "${MANUFACTURER_PEER0_SECRET:?MANUFACTURER_PEER0_SECRET must be set}"
  : "${MANUFACTURER_USER1_SECRET:?MANUFACTURER_USER1_SECRET must be set}"
  : "${MANUFACTURER_ADMIN_SECRET:?MANUFACTURER_ADMIN_SECRET must be set}"
  requireCAAdminCredentials
  infoln "Enrolling the CA admin"
  mkdir -p organizations/peerOrganizations/manufacturer.battery.com/

  export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/manufacturer.battery.com/

  fabric-ca-client enroll -u "https://${CA_ADMIN_USER}:${CA_ADMIN_PASSWORD}@localhost:7054" --caname ca-manufacturer --tls.certfiles "${PWD}/organizations/fabric-ca/manufacturer/ca-cert.pem"

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-7054-ca-manufacturer.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-7054-ca-manufacturer.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-7054-ca-manufacturer.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-7054-ca-manufacturer.pem
    OrganizationalUnitIdentifier: orderer' > "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/msp/config.yaml"

  # Copy manufacturer's CA cert to manufacturer's /msp/tlscacerts directory (for use in the channel MSP definition)
  mkdir -p "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/manufacturer/ca-cert.pem" "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/msp/tlscacerts/ca.crt"

  # Copy manufacturer's CA cert to manufacturer's /tlsca directory (for use by clients)
  mkdir -p "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/tlsca"
  cp "${PWD}/organizations/fabric-ca/manufacturer/ca-cert.pem" "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/tlsca/tlsca.manufacturer.battery.com-cert.pem"

  # Copy manufacturer's CA cert to manufacturer's /ca directory (for use by clients)
  mkdir -p "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/ca"
  cp "${PWD}/organizations/fabric-ca/manufacturer/ca-cert.pem" "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/ca/ca.manufacturer.battery.com-cert.pem"

  infoln "Registering peer0"
  fabric-ca-client register --caname ca-manufacturer --id.name peer0 --id.secret "${MANUFACTURER_PEER0_SECRET}" --id.type peer --tls.certfiles "${PWD}/organizations/fabric-ca/manufacturer/ca-cert.pem"

  infoln "Registering user"
  fabric-ca-client register --caname ca-manufacturer --id.name user1 --id.secret "${MANUFACTURER_USER1_SECRET}" --id.type client --tls.certfiles "${PWD}/organizations/fabric-ca/manufacturer/ca-cert.pem"

  infoln "Registering the org admin"
  fabric-ca-client register --caname ca-manufacturer --id.name manufactureradmin --id.secret "${MANUFACTURER_ADMIN_SECRET}" --id.type admin --tls.certfiles "${PWD}/organizations/fabric-ca/manufacturer/ca-cert.pem"

  infoln "Generating the peer0 msp"
  fabric-ca-client enroll -u "https://peer0:${MANUFACTURER_PEER0_SECRET}@localhost:7054" --caname ca-manufacturer -M "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/peers/peer0.manufacturer.battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/manufacturer/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/peers/peer0.manufacturer.battery.com/msp/config.yaml"

  infoln "Generating the peer0-tls certificates, use --csr.hosts to specify Subject Alternative Names"
  fabric-ca-client enroll -u "https://peer0:${MANUFACTURER_PEER0_SECRET}@localhost:7054" --caname ca-manufacturer -M "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/peers/peer0.manufacturer.battery.com/tls" --enrollment.profile tls --csr.hosts peer0.manufacturer.battery.com --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/manufacturer/ca-cert.pem"

  # Copy the tls CA cert, server cert, server keystore to well known file names in the peer's tls directory
  cp "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/peers/peer0.manufacturer.battery.com/tls/tlscacerts/"* "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/peers/peer0.manufacturer.battery.com/tls/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/peers/peer0.manufacturer.battery.com/tls/signcerts/"* "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/peers/peer0.manufacturer.battery.com/tls/server.crt"
  cp "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/peers/peer0.manufacturer.battery.com/tls/keystore/"* "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/peers/peer0.manufacturer.battery.com/tls/server.key"

  infoln "Generating the user msp"
  fabric-ca-client enroll -u "https://user1:${MANUFACTURER_USER1_SECRET}@localhost:7054" --caname ca-manufacturer -M "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/users/User1@manufacturer.battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/manufacturer/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/users/User1@manufacturer.battery.com/msp/config.yaml"

  infoln "Generating the org admin msp"
  fabric-ca-client enroll -u "https://manufactureradmin:${MANUFACTURER_ADMIN_SECRET}@localhost:7054" --caname ca-manufacturer -M "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/users/Admin@manufacturer.battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/manufacturer/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/manufacturer.battery.com/users/Admin@manufacturer.battery.com/msp/config.yaml"
}

function createEVManufacturer() {
  : "${EVMANUFACTURER_PEER0_SECRET:?EVMANUFACTURER_PEER0_SECRET must be set}"
  : "${EVMANUFACTURER_USER1_SECRET:?EVMANUFACTURER_USER1_SECRET must be set}"
  : "${EVMANUFACTURER_ADMIN_SECRET:?EVMANUFACTURER_ADMIN_SECRET must be set}"
  requireCAAdminCredentials
  infoln "Enrolling the CA admin"
  mkdir -p organizations/peerOrganizations/evmanufacturer.battery.com/

  export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/

  fabric-ca-client enroll -u "https://${CA_ADMIN_USER}:${CA_ADMIN_PASSWORD}@localhost:8054" --caname ca-evmanufacturer --tls.certfiles "${PWD}/organizations/fabric-ca/evmanufacturer/ca-cert.pem"

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-evmanufacturer.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-evmanufacturer.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-evmanufacturer.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-8054-ca-evmanufacturer.pem
    OrganizationalUnitIdentifier: orderer' > "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/msp/config.yaml"

  # Copy CA cert to /msp/tlscacerts directory
  mkdir -p "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/evmanufacturer/ca-cert.pem" "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/msp/tlscacerts/ca.crt"

  # Copy CA cert to /tlsca directory
  mkdir -p "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/tlsca"
  cp "${PWD}/organizations/fabric-ca/evmanufacturer/ca-cert.pem" "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/tlsca/tlsca.evmanufacturer.battery.com-cert.pem"

  # Copy CA cert to /ca directory
  mkdir -p "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/ca"
  cp "${PWD}/organizations/fabric-ca/evmanufacturer/ca-cert.pem" "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/ca/ca.evmanufacturer.battery.com-cert.pem"

  infoln "Registering peer0"
  fabric-ca-client register --caname ca-evmanufacturer --id.name peer0 --id.secret "${EVMANUFACTURER_PEER0_SECRET}" --id.type peer --tls.certfiles "${PWD}/organizations/fabric-ca/evmanufacturer/ca-cert.pem"

  infoln "Registering user"
  fabric-ca-client register --caname ca-evmanufacturer --id.name user1 --id.secret "${EVMANUFACTURER_USER1_SECRET}" --id.type client --tls.certfiles "${PWD}/organizations/fabric-ca/evmanufacturer/ca-cert.pem"

  infoln "Registering the org admin"
  fabric-ca-client register --caname ca-evmanufacturer --id.name evmanufactureradmin --id.secret "${EVMANUFACTURER_ADMIN_SECRET}" --id.type admin --tls.certfiles "${PWD}/organizations/fabric-ca/evmanufacturer/ca-cert.pem"

  infoln "Generating the peer0 msp"
  fabric-ca-client enroll -u "https://peer0:${EVMANUFACTURER_PEER0_SECRET}@localhost:8054" --caname ca-evmanufacturer -M "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/peers/peer0.evmanufacturer.battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/evmanufacturer/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/peers/peer0.evmanufacturer.battery.com/msp/config.yaml"

  infoln "Generating the peer0-tls certificates, use --csr.hosts to specify Subject Alternative Names"
  fabric-ca-client enroll -u "https://peer0:${EVMANUFACTURER_PEER0_SECRET}@localhost:8054" --caname ca-evmanufacturer -M "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/peers/peer0.evmanufacturer.battery.com/tls" --enrollment.profile tls --csr.hosts peer0.evmanufacturer.battery.com --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/evmanufacturer/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/peers/peer0.evmanufacturer.battery.com/tls/tlscacerts/"* "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/peers/peer0.evmanufacturer.battery.com/tls/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/peers/peer0.evmanufacturer.battery.com/tls/signcerts/"* "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/peers/peer0.evmanufacturer.battery.com/tls/server.crt"
  cp "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/peers/peer0.evmanufacturer.battery.com/tls/keystore/"* "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/peers/peer0.evmanufacturer.battery.com/tls/server.key"

  infoln "Generating the user msp"
  fabric-ca-client enroll -u "https://user1:${EVMANUFACTURER_USER1_SECRET}@localhost:8054" --caname ca-evmanufacturer -M "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/users/User1@evmanufacturer.battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/evmanufacturer/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/users/User1@evmanufacturer.battery.com/msp/config.yaml"

  infoln "Generating the org admin msp"
  fabric-ca-client enroll -u "https://evmanufactureradmin:${EVMANUFACTURER_ADMIN_SECRET}@localhost:8054" --caname ca-evmanufacturer -M "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/users/Admin@evmanufacturer.battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/evmanufacturer/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/evmanufacturer.battery.com/users/Admin@evmanufacturer.battery.com/msp/config.yaml"
}

function createService() {
  : "${SERVICE_PEER0_SECRET:?SERVICE_PEER0_SECRET must be set}"
  : "${SERVICE_USER1_SECRET:?SERVICE_USER1_SECRET must be set}"
  : "${SERVICE_ADMIN_SECRET:?SERVICE_ADMIN_SECRET must be set}"
  requireCAAdminCredentials
  infoln "Enrolling the CA admin"
  mkdir -p organizations/peerOrganizations/service.battery.com/

  export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/service.battery.com/

  fabric-ca-client enroll -u "https://${CA_ADMIN_USER}:${CA_ADMIN_PASSWORD}@localhost:9054" --caname ca-service --tls.certfiles "${PWD}/organizations/fabric-ca/service/ca-cert.pem"

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-9054-ca-service.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-9054-ca-service.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-9054-ca-service.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-9054-ca-service.pem
    OrganizationalUnitIdentifier: orderer' > "${PWD}/organizations/peerOrganizations/service.battery.com/msp/config.yaml"

  # Copy CA cert to /msp/tlscacerts directory
  mkdir -p "${PWD}/organizations/peerOrganizations/service.battery.com/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/service/ca-cert.pem" "${PWD}/organizations/peerOrganizations/service.battery.com/msp/tlscacerts/ca.crt"

  # Copy CA cert to /tlsca directory
  mkdir -p "${PWD}/organizations/peerOrganizations/service.battery.com/tlsca"
  cp "${PWD}/organizations/fabric-ca/service/ca-cert.pem" "${PWD}/organizations/peerOrganizations/service.battery.com/tlsca/tlsca.service.battery.com-cert.pem"

  # Copy CA cert to /ca directory
  mkdir -p "${PWD}/organizations/peerOrganizations/service.battery.com/ca"
  cp "${PWD}/organizations/fabric-ca/service/ca-cert.pem" "${PWD}/organizations/peerOrganizations/service.battery.com/ca/ca.service.battery.com-cert.pem"

  infoln "Registering peer0"
  fabric-ca-client register --caname ca-service --id.name peer0 --id.secret "${SERVICE_PEER0_SECRET}" --id.type peer --tls.certfiles "${PWD}/organizations/fabric-ca/service/ca-cert.pem"

  infoln "Registering user"
  fabric-ca-client register --caname ca-service --id.name user1 --id.secret "${SERVICE_USER1_SECRET}" --id.type client --tls.certfiles "${PWD}/organizations/fabric-ca/service/ca-cert.pem"

  infoln "Registering the org admin"
  fabric-ca-client register --caname ca-service --id.name serviceadmin --id.secret "${SERVICE_ADMIN_SECRET}" --id.type admin --tls.certfiles "${PWD}/organizations/fabric-ca/service/ca-cert.pem"

  infoln "Generating the peer0 msp"
  fabric-ca-client enroll -u "https://peer0:${SERVICE_PEER0_SECRET}@localhost:9054" --caname ca-service -M "${PWD}/organizations/peerOrganizations/service.battery.com/peers/peer0.service.battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/service/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/service.battery.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/service.battery.com/peers/peer0.service.battery.com/msp/config.yaml"

  infoln "Generating the peer0-tls certificates, use --csr.hosts to specify Subject Alternative Names"
  fabric-ca-client enroll -u "https://peer0:${SERVICE_PEER0_SECRET}@localhost:9054" --caname ca-service -M "${PWD}/organizations/peerOrganizations/service.battery.com/peers/peer0.service.battery.com/tls" --enrollment.profile tls --csr.hosts peer0.service.battery.com --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/service/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/service.battery.com/peers/peer0.service.battery.com/tls/tlscacerts/"* "${PWD}/organizations/peerOrganizations/service.battery.com/peers/peer0.service.battery.com/tls/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/service.battery.com/peers/peer0.service.battery.com/tls/signcerts/"* "${PWD}/organizations/peerOrganizations/service.battery.com/peers/peer0.service.battery.com/tls/server.crt"
  cp "${PWD}/organizations/peerOrganizations/service.battery.com/peers/peer0.service.battery.com/tls/keystore/"* "${PWD}/organizations/peerOrganizations/service.battery.com/peers/peer0.service.battery.com/tls/server.key"

  infoln "Generating the user msp"
  fabric-ca-client enroll -u "https://user1:${SERVICE_USER1_SECRET}@localhost:9054" --caname ca-service -M "${PWD}/organizations/peerOrganizations/service.battery.com/users/User1@service.battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/service/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/service.battery.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/service.battery.com/users/User1@service.battery.com/msp/config.yaml"

  infoln "Generating the org admin msp"
  fabric-ca-client enroll -u "https://serviceadmin:${SERVICE_ADMIN_SECRET}@localhost:9054" --caname ca-service -M "${PWD}/organizations/peerOrganizations/service.battery.com/users/Admin@service.battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/service/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/service.battery.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/service.battery.com/users/Admin@service.battery.com/msp/config.yaml"
}

function createRegulator() {
  : "${REGULATOR_PEER0_SECRET:?REGULATOR_PEER0_SECRET must be set}"
  : "${REGULATOR_USER1_SECRET:?REGULATOR_USER1_SECRET must be set}"
  : "${REGULATOR_ADMIN_SECRET:?REGULATOR_ADMIN_SECRET must be set}"
  requireCAAdminCredentials
  infoln "Enrolling the CA admin"
  mkdir -p organizations/peerOrganizations/regulator.battery.com/

  export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/regulator.battery.com/

  fabric-ca-client enroll -u "https://${CA_ADMIN_USER}:${CA_ADMIN_PASSWORD}@localhost:10054" --caname ca-regulator --tls.certfiles "${PWD}/organizations/fabric-ca/regulator/ca-cert.pem"

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-10054-ca-regulator.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-10054-ca-regulator.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-10054-ca-regulator.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-10054-ca-regulator.pem
    OrganizationalUnitIdentifier: orderer' > "${PWD}/organizations/peerOrganizations/regulator.battery.com/msp/config.yaml"

  # Copy CA cert to /msp/tlscacerts directory
  mkdir -p "${PWD}/organizations/peerOrganizations/regulator.battery.com/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/regulator/ca-cert.pem" "${PWD}/organizations/peerOrganizations/regulator.battery.com/msp/tlscacerts/ca.crt"

  # Copy CA cert to /tlsca directory
  mkdir -p "${PWD}/organizations/peerOrganizations/regulator.battery.com/tlsca"
  cp "${PWD}/organizations/fabric-ca/regulator/ca-cert.pem" "${PWD}/organizations/peerOrganizations/regulator.battery.com/tlsca/tlsca.regulator.battery.com-cert.pem"

  # Copy CA cert to /ca directory
  mkdir -p "${PWD}/organizations/peerOrganizations/regulator.battery.com/ca"
  cp "${PWD}/organizations/fabric-ca/regulator/ca-cert.pem" "${PWD}/organizations/peerOrganizations/regulator.battery.com/ca/ca.regulator.battery.com-cert.pem"

  infoln "Registering peer0"
  fabric-ca-client register --caname ca-regulator --id.name peer0 --id.secret "${REGULATOR_PEER0_SECRET}" --id.type peer --tls.certfiles "${PWD}/organizations/fabric-ca/regulator/ca-cert.pem"

  infoln "Registering user"
  fabric-ca-client register --caname ca-regulator --id.name user1 --id.secret "${REGULATOR_USER1_SECRET}" --id.type client --tls.certfiles "${PWD}/organizations/fabric-ca/regulator/ca-cert.pem"

  infoln "Registering the org admin"
  fabric-ca-client register --caname ca-regulator --id.name regulatoradmin --id.secret "${REGULATOR_ADMIN_SECRET}" --id.type admin --tls.certfiles "${PWD}/organizations/fabric-ca/regulator/ca-cert.pem"

  infoln "Generating the peer0 msp"
  fabric-ca-client enroll -u "https://peer0:${REGULATOR_PEER0_SECRET}@localhost:10054" --caname ca-regulator -M "${PWD}/organizations/peerOrganizations/regulator.battery.com/peers/peer0.regulator.battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/regulator/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/regulator.battery.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/regulator.battery.com/peers/peer0.regulator.battery.com/msp/config.yaml"

  infoln "Generating the peer0-tls certificates, use --csr.hosts to specify Subject Alternative Names"
  fabric-ca-client enroll -u "https://peer0:${REGULATOR_PEER0_SECRET}@localhost:10054" --caname ca-regulator -M "${PWD}/organizations/peerOrganizations/regulator.battery.com/peers/peer0.regulator.battery.com/tls" --enrollment.profile tls --csr.hosts peer0.regulator.battery.com --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/regulator/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/regulator.battery.com/peers/peer0.regulator.battery.com/tls/tlscacerts/"* "${PWD}/organizations/peerOrganizations/regulator.battery.com/peers/peer0.regulator.battery.com/tls/ca.crt"
  cp "${PWD}/organizations/peerOrganizations/regulator.battery.com/peers/peer0.regulator.battery.com/tls/signcerts/"* "${PWD}/organizations/peerOrganizations/regulator.battery.com/peers/peer0.regulator.battery.com/tls/server.crt"
  cp "${PWD}/organizations/peerOrganizations/regulator.battery.com/peers/peer0.regulator.battery.com/tls/keystore/"* "${PWD}/organizations/peerOrganizations/regulator.battery.com/peers/peer0.regulator.battery.com/tls/server.key"

  infoln "Generating the user msp"
  fabric-ca-client enroll -u "https://user1:${REGULATOR_USER1_SECRET}@localhost:10054" --caname ca-regulator -M "${PWD}/organizations/peerOrganizations/regulator.battery.com/users/User1@regulator.battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/regulator/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/regulator.battery.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/regulator.battery.com/users/User1@regulator.battery.com/msp/config.yaml"

  infoln "Generating the org admin msp"
  fabric-ca-client enroll -u "https://regulatoradmin:${REGULATOR_ADMIN_SECRET}@localhost:10054" --caname ca-regulator -M "${PWD}/organizations/peerOrganizations/regulator.battery.com/users/Admin@regulator.battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/regulator/ca-cert.pem"

  cp "${PWD}/organizations/peerOrganizations/regulator.battery.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/regulator.battery.com/users/Admin@regulator.battery.com/msp/config.yaml"
}

function createOrderer() {
  : "${ORDERER_NODE_SECRET:?ORDERER_NODE_SECRET must be set}"
  : "${ORDERER_ADMIN_SECRET:?ORDERER_ADMIN_SECRET must be set}"
  requireCAAdminCredentials
  infoln "Enrolling the CA admin"
  mkdir -p organizations/ordererOrganizations/battery.com

  export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/ordererOrganizations/battery.com

  fabric-ca-client enroll -u "https://${CA_ADMIN_USER}:${CA_ADMIN_PASSWORD}@localhost:11054" --caname ca-orderer --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-11054-ca-orderer.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-11054-ca-orderer.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-11054-ca-orderer.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-11054-ca-orderer.pem
    OrganizationalUnitIdentifier: orderer' > "${PWD}/organizations/ordererOrganizations/battery.com/msp/config.yaml"

  # Copy orderer org's CA cert to orderer org's /msp/tlscacerts directory
  mkdir -p "${PWD}/organizations/ordererOrganizations/battery.com/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem" "${PWD}/organizations/ordererOrganizations/battery.com/msp/tlscacerts/tlsca.battery.com-cert.pem"

  # Copy orderer org's CA cert to orderer org's /tlsca directory
  mkdir -p "${PWD}/organizations/ordererOrganizations/battery.com/tlsca"
  cp "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem" "${PWD}/organizations/ordererOrganizations/battery.com/tlsca/tlsca.battery.com-cert.pem"

  infoln "Registering orderer"
  fabric-ca-client register --caname ca-orderer --id.name orderer --id.secret "${ORDERER_NODE_SECRET}" --id.type orderer --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"

  infoln "Generating the orderer MSP"
  fabric-ca-client enroll -u "https://orderer:${ORDERER_NODE_SECRET}@localhost:11054" --caname ca-orderer -M "${PWD}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"

  cp "${PWD}/organizations/ordererOrganizations/battery.com/msp/config.yaml" "${PWD}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/msp/config.yaml"

  infoln "Generating the orderer TLS certificates, use --csr.hosts to specify Subject Alternative Names"
  fabric-ca-client enroll -u "https://orderer:${ORDERER_NODE_SECRET}@localhost:11054" --caname ca-orderer -M "${PWD}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/tls" --enrollment.profile tls --csr.hosts orderer.battery.com --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"

  # Copy the tls CA cert, server cert, server keystore to well known file names in the orderer's tls directory
  cp "${PWD}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/tls/tlscacerts/"* "${PWD}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/tls/ca.crt"
  cp "${PWD}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/tls/signcerts/"* "${PWD}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/tls/server.crt"
  cp "${PWD}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/tls/keystore/"* "${PWD}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/tls/server.key"

  # Copy orderer org's CA cert to orderer's /msp/tlscacerts directory
  mkdir -p "${PWD}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/msp/tlscacerts"
  cp "${PWD}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/tls/tlscacerts/"* "${PWD}/organizations/ordererOrganizations/battery.com/orderers/orderer.battery.com/msp/tlscacerts/tlsca.battery.com-cert.pem"

  # Register and generate artifacts for the orderer admin
  infoln "Registering the orderer admin"
  fabric-ca-client register --caname ca-orderer --id.name ordererAdmin --id.secret "${ORDERER_ADMIN_SECRET}" --id.type admin --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"

  infoln "Generating the admin msp"
  fabric-ca-client enroll -u "https://ordererAdmin:${ORDERER_ADMIN_SECRET}@localhost:11054" --caname ca-orderer -M "${PWD}/organizations/ordererOrganizations/battery.com/users/Admin@battery.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/ordererOrg/ca-cert.pem"

  cp "${PWD}/organizations/ordererOrganizations/battery.com/msp/config.yaml" "${PWD}/organizations/ordererOrganizations/battery.com/users/Admin@battery.com/msp/config.yaml"
}
