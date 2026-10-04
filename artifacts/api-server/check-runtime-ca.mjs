// Run in a fresh Node process inside the final image, with its inherited env.
// Do not supply a custom `ca`: that would bypass the startup trust store.
import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { isAbsolute } from "node:path";
import { getCACertificates } from "node:tls";

try {
  assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED, "0",
    "TLS certificate verification must remain enabled");
  assert.ok(!["disable", "no-verify"].includes(process.env.PGSSLMODE),
    "PostgreSQL certificate verification must remain enabled");

  const path = process.env.NODE_EXTRA_CA_CERTS;
  assert.ok(path && isAbsolute(path), "NODE_EXTRA_CA_CERTS must name an absolute path");
  assert.ok((await stat(path)).isFile(), "NODE_EXTRA_CA_CERTS must be a regular file");
  await access(path, constants.R_OK);
  const pem = await readFile(path, "utf8");
  const certificates = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? [];
  assert.ok(certificates.length > 0, "The CA bundle contains no certificates");
  assert.equal(pem.replace(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g, "").trim(), "",
    "The CA bundle contains malformed or unexpected content");

  const fingerprints = (certs) => new Set(certs.map((cert) => {
    const parsed = new X509Certificate(cert);
    assert.ok(parsed.ca, "The trust bundle must contain only CA certificates");
    return parsed.fingerprint256;
  }));
  const expected = fingerprints(certificates);
  // Unlike simply parsing the file, this proves Node loaded it at startup.
  assert.deepEqual(fingerprints(getCACertificates("extra")), expected,
    "Node did not load the complete NODE_EXTRA_CA_CERTS bundle at startup");
  const defaults = fingerprints(getCACertificates("default"));
  for (const fingerprint of expected) {
    assert.ok(defaults.has(fingerprint), "A bundled CA is missing from Node's default trust store");
  }
  console.log(`Runtime CA smoke check passed: ${expected.size} CA certificates loaded; TLS verification enabled.`);
} catch (error) {
  console.error(`Runtime CA smoke check failed: ${error.message}`);
  process.exitCode = 1;
}