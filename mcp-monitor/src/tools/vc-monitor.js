// Tool 3: VC (Verifiable Credential) Event Tracking
const fabricClient = require('../utils/fabric-client');
const { readRecentLogs } = require('../utils/log-reader');

const CRED_TYPES = ['BATTERY_PASSPORT', 'BATTERY_HEALTH', 'MAINTENANCE', 'COMPLIANCE', 'RECYCLING'];

function getDataScope() {
  const { mspId } = fabricClient.getOrgConfig();
  const isRegulator = mspId === 'RegulatorMSP';
  return {
    msp: mspId,
    scope: isRegulator ? 'all-orgs' : 'own-org',
    note: isRegulator
      ? 'RegulatorMSP sees all credentials'
      : `${mspId} sees only own-issued credentials`,
  };
}

async function execute(params) {
  const { action, passport_id, cred_type, days_until_expiry = 30, limit = 20 } = params;

  switch (action) {
    case 'events': {
      // Get VC events from structured logs
      const { logs } = readRecentLogs(500, { category: 'vc' });
      let events = logs.map((l) => ({
        timestamp: l.timestamp,
        event: l.action || l.function || 'unknown',
        credentialId: l.credentialId || null,
        passportId: l.passportId || null,
        credType: l.credType || null,
        success: l.level !== 'error',
        details: l.message,
      }));

      // Filter
      if (passport_id) {
        events = events.filter((e) => e.passportId === passport_id);
      }
      if (cred_type) {
        events = events.filter((e) => e.credType === cred_type);
      }

      // Also query Fabric for credentials by passport if specified
      let fabricCreds = [];
      if (passport_id) {
        try {
          const result = await fabricClient.evaluate(
            'QueryCredentialsByPassport', passport_id, String(limit), ''
          );
          fabricCreds = (result.records || []).map((c) => ({
            credentialId: c.credentialId,
            passportId: c.passportId,
            credType: c.credType,
            status: c.status,
            issuedAt: c.issuedAt,
            expiresAt: c.expiresAt,
            issuerDid: c.issuerDid,
            holderDid: c.holderDid,
          }));
        } catch { /* ignore */ }
      }

      return {
        action: 'events',
        dataScope: getDataScope(),
        logEventCount: events.length,
        fabricCredCount: fabricCreds.length,
        events: events.slice(-limit),
        credentials: fabricCreds,
      };
    }

    case 'expiring': {
      const now = new Date();
      const expiryThreshold = new Date(now.getTime() + days_until_expiry * 86400000);
      const expiring = [];

      // Query credentials by each type and check expiry
      for (const type of (cred_type ? [cred_type] : CRED_TYPES)) {
        try {
          const result = await fabricClient.evaluate(
            'QueryCredentialsByType', type, String(limit), ''
          );
          const creds = result.records || [];

          for (const cred of creds) {
            if (passport_id && cred.passportId !== passport_id) continue;
            if (!cred.expiresAt) continue;

            const expiryDate = new Date(cred.expiresAt);
            if (expiryDate <= expiryThreshold && cred.status === 'ACTIVE') {
              const daysLeft = Math.ceil((expiryDate - now) / 86400000);
              expiring.push({
                credentialId: cred.credentialId,
                passportId: cred.passportId,
                credType: cred.credType,
                expiresAt: cred.expiresAt,
                daysUntilExpiry: daysLeft,
                isExpired: daysLeft <= 0,
                holderDid: cred.holderDid,
              });
            }
          }
        } catch { /* ignore - type may not have any creds */ }
      }

      // Sort by days until expiry
      expiring.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

      return {
        action: 'expiring',
        dataScope: getDataScope(),
        threshold: `${days_until_expiry} days`,
        count: expiring.length,
        expired: expiring.filter((e) => e.isExpired).length,
        expiringCredentials: expiring.slice(0, limit),
      };
    }

    case 'stats': {
      const stats = {
        byType: {},
        byStatus: { ACTIVE: 0, REVOKED: 0, EXPIRED: 0 },
        total: 0,
      };

      for (const type of CRED_TYPES) {
        try {
          const result = await fabricClient.evaluate(
            'QueryCredentialsByType', type, String(100), ''
          );
          const creds = result.records || [];

          const typeStats = { total: 0, active: 0, revoked: 0, expired: 0 };
          const now = new Date();

          for (const cred of creds) {
            if (passport_id && cred.passportId !== passport_id) continue;

            if (cred.status === 'REVOKED') {
              typeStats.revoked++;
              stats.byStatus.REVOKED++;
            } else if (cred.expiresAt && new Date(cred.expiresAt) < now) {
              typeStats.expired++;
              stats.byStatus.EXPIRED++;
            } else {
              typeStats.active++;
              stats.byStatus.ACTIVE++;
            }
            stats.total++;
          }

          typeStats.total = typeStats.active + typeStats.revoked + typeStats.expired;
          stats.byType[type] = typeStats;
        } catch {
          stats.byType[type] = { total: 0, error: 'query failed' };
        }
      }

      return {
        action: 'stats',
        dataScope: getDataScope(),
        passportFilter: passport_id || 'all',
        ...stats,
      };
    }

    case 'revoked': {
      try {
        const result = await fabricClient.evaluate(
          'QueryRevokedCredentials', String(limit), ''
        );
        let creds = result.records || [];

        if (passport_id) {
          creds = creds.filter((c) => c.passportId === passport_id);
        }
        if (cred_type) {
          creds = creds.filter((c) => c.credType === cred_type);
        }

        const revokedList = creds.map((c) => ({
          credentialId: c.credentialId,
          passportId: c.passportId,
          credType: c.credType,
          revokedAt: c.revokedAt || c.updatedAt,
          revokeReason: c.revokeReason || '',
          issuerDid: c.issuerDid,
          holderDid: c.holderDid,
        }));

        return {
          action: 'revoked',
          dataScope: getDataScope(),
          count: revokedList.length,
          revokedCredentials: revokedList,
        };
      } catch (err) {
        throw new Error(`Failed to query revoked credentials: ${err.message}`);
      }
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

module.exports = { execute };
