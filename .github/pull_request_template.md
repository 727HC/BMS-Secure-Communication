## Sensitive-data checklist

- [ ] I ran `python3 scripts/check-sensitive-patterns.py --include-untracked` locally.
- [ ] I did not add `.env`, wallet, Fabric MSP/keystore material, generated benchmark resolved configs, raw audit payloads, tokens, passwords, or local machine paths.
- [ ] Any credential-like example uses an environment variable or placeholder, not a real/default secret literal.
- [ ] If this PR changes GitHub-facing docs, I checked that it does not reintroduce historical sensitive markers.

## Notes

<!-- Keep this section sanitized. Do not paste secrets, raw payloads, private keys, local absolute paths, or personal contact data. -->
