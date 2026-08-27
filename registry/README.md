# MCP Registry Records

Prepared `server.json` records for the official MCP Registry.

## Records

| File | Server name | Endpoint | Tools | Publish status |
|------|------------|----------|-------|----------------|
| `contribution-exchange-server.json` | `com.signalaf/contribution-exchange` | `https://signalaf.com/api/exchange/mcp` | 10 (6 read-only + 4 mutation) | **Ready to publish** (after delegated-domain rollout completes) |
| `sigrank-server.json` | `com.signalaf/sigrank` | `https://signalaf.com/api/mcp` | 15 (all read-only) | **Do NOT publish yet** — SigRank identity reconciliation needed (see below) |

## Format

Both records use the current official remote-server format with the `remotes` property:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "com.signalaf/<server>",
  "remotes": [
    {
      "type": "streamable-http",
      "url": "https://signalaf.com/api/..."
    }
  ]
}
```

Reference: [Official remote-server format](https://modelcontextprotocol.io/registry/remote-servers)

## Validation

Both records pass:
- Valid JSON parse
- Required fields present (`name`, `description`, `version`, `remotes`)
- Reverse-DNS name format (`com.signalaf/<server>`)
- Valid `remotes` array with `streamable-http` transport type
- Publisher-provided metadata under `io.modelcontextprotocol.registry/publisher-provided`
- `description` field ≤ 100 characters (Registry-enforced limit; validated via `mcp-publisher validate`)

## Publication instructions (requires owner authorization)

Publication uses the official `mcp-publisher` CLI tool with domain-based authentication (DNS or HTTP `/.well-known/mcp-registry-auth`).

> **Auth blocker:** The `com.signalaf/*` namespace requires domain-based authentication. GitHub auth (the current `mcp-publisher` login) cannot publish to this namespace. The owner must set up DNS or HTTP authentication for `signalaf.com` before publication can proceed. See [authentication docs](https://modelcontextprotocol.io/registry/authentication).

Reference: [Official authentication instructions](https://modelcontextprotocol.io/registry/authentication) | [Publishing quickstart](https://modelcontextprotocol.io/registry/quickstart)

### Step 1: Authenticate with domain ownership

The server name `com.signalaf/*` requires domain-based authentication for `signalaf.com`. Choose one:

**DNS authentication** (TXT record):
```bash
# Generate Ed25519 key pair
openssl genpkey -algorithm Ed25519 -out key.pem
PUBLIC_KEY="$(openssl pkey -in key.pem -pubout -outform DER | tail -c 32 | base64)"
echo "signalaf.com. IN TXT \"v=MCPv1; k=ed25519; p=${PUBLIC_KEY}\""

# Add the TXT record in your DNS provider's control panel, then:
PRIVATE_KEY="$(openssl pkey -in key.pem -noout -text | grep -A3 'priv:' | tail -n +2 | tr -d ' :\n')"
mcp-publisher login dns --domain signalaf.com --private-key "${PRIVATE_KEY}"
```

**HTTP authentication** (`/.well-known/mcp-registry-auth`):
```bash
openssl genpkey -algorithm Ed25519 -out key.pem
PUBLIC_KEY="$(openssl pkey -in key.pem -pubout -outform DER | tail -c 32 | base64)"
echo "v=MCPv1; k=ed25519; p=${PUBLIC_KEY}" > mcp-registry-auth
# Deploy mcp-registry-auth to https://signalaf.com/.well-known/mcp-registry-auth, then:
mcp-publisher login http --domain signalaf.com --private-key "${PRIVATE_KEY}"
```

**Keep the private key outside the repository.**

### Step 2: Publish the Contribution Exchange record

```bash
mcp-publisher publish --file contribution-exchange-server.json
```

### Step 3: Verify

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=com.signalaf/contribution-exchange"
```

## SigRank identity — DO NOT PUBLISH YET

SigRank already exists in the MCP Registry as:

```
io.github.SunrisesIllNeverSee/sigrank-mcp
```

The existing entry covers the 23-tool npm/stdio package. The SignalAF remote server has 15 tools — a different catalog. Publishing `com.signalaf/sigrank` now would create two competing SigRank identities.

Before publishing the SigRank remote record:
1. Reconcile whether the remote server is the same product with partial transport parity or a separate hosted edition.
2. Normalize the version (current npm is `0.0.231`; Registry is stale at `0.17.2`; semver requires `0.18.0+` to be recognized as newer).
3. Repair the CI failure (cross-repo class-tier contract test).
4. Decide: add the remote transport to the existing `io.github.SunrisesIllNeverSee/sigrank-mcp` identity, or publish a new `com.signalaf/sigrank` identity.

Reference: [Official versioning rules](https://modelcontextprotocol.io/registry/versioning)

## Registry preview caveat

The Registry is in preview. Breaking changes or data resets may occur before general availability.
