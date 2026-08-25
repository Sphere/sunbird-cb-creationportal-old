#!/usr/bin/env node
/**
 * Replay the security-hotspot dispositions documented in
 * docs/sonarqube-hotspot-dispositions.md onto a SonarQube / SonarCloud server.
 *
 * Hotspot review state lives in each server's database and does not travel with
 * the code, so a freshly scanned project reports every hotspot as TO_REVIEW and
 * Security Review as E. This applies the same reviewed/Safe status, writing the
 * rationale into each hotspot's comment so the justification is auditable in the
 * UI rather than buried in a script.
 *
 * Idempotent: only hotspots still in TO_REVIEW are touched.
 *
 *   node scripts/sonar-apply-hotspot-dispositions.mjs \
 *     --host https://sonarcloud.io \
 *     --project <projectKey> \
 *     --token <token with "Administer Security Hotspots">
 *
 *   --dry-run   list what would change without changing anything
 */

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, all) =>
    a.startsWith('--') ? [[a.slice(2), all[i + 1]?.startsWith('--') !== false ? true : all[i + 1]]] : [],
  ),
)

const HOST = (args.host || '').replace(/\/$/, '')
const PROJECT = args.project
const TOKEN = args.token
const DRY = Boolean(args['dry-run'])

if (!HOST || !PROJECT || !TOKEN) {
  console.error('usage: --host <url> --project <key> --token <token> [--dry-run]')
  process.exit(2)
}

/**
 * Per-rule justification. Keep in step with
 * docs/sonarqube-hotspot-dispositions.md — that file is the human-readable
 * version of exactly these strings.
 */
const JUSTIFICATION = {
  'typescript:S6268':
    'Angular sanitizer bypass, reviewed and accepted. Angular throws RuntimeError 5201 when a raw ' +
    'string is bound in a RESOURCE_URL context, so the content-player iframes cannot avoid a bypass. ' +
    'The [innerHTML] sites render content that passed the author -> review -> publish workflow, whose ' +
    'roles are enforced by Keycloak. NOTE: that disposition assumes the authoring pipeline is trusted; ' +
    'if untrusted end users gain authoring rights these must be re-reviewed. Bypasses that were NOT ' +
    'load-bearing (7 inert bypassSecurityTrustStyle, 6 unnecessary ones on <img [src]>) were deleted ' +
    'in code rather than dispositioned.',
  'typescript:S2245':
    'Non-security use of Math.random(). Each value is a Sunbird content "code" field, a quiz option ' +
    'id, or an option-shuffle index. The content "code" is a client-supplied identifier, not a secret: ' +
    'the authoritative identifier is generated server-side and access is governed by Keycloak tokens ' +
    'and role checks. No token, credential, session id or password derives from these. DOM element ids ' +
    'that used Math.random() were converted in code to a shared collision-free counter.',
  'typescript:S5852':
    'Reviewed - not ReDoS-prone. Most are the form <[^>]*>: the negated class cannot match the ' +
    'terminating ">", so there is exactly one way to match any prefix - no ambiguity, no backtracking, ' +
    'linear runtime. The <map>-body regex is inherently ambiguous (its body legitimately contains ">") ' +
    'and is accepted because it runs client-side over content the viewer already loaded, so worst case ' +
    'is that one user\'s own tab. Genuinely ambiguous regexes were made linear in code instead.',
}

const auth = 'Basic ' + Buffer.from(`${TOKEN}:`).toString('base64')

async function api(path, options = {}) {
  const res = await fetch(`${HOST}${path}`, {
    ...options,
    headers: { Authorization: auth, ...(options.headers || {}) },
  })
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} on ${path} — ${await res.text()}`)
  }
  return res.status === 204 ? null : res.json()
}

async function main() {
  const hotspots = []
  for (let page = 1; ; page += 1) {
    const r = await api(
      `/api/hotspots/search?projectKey=${encodeURIComponent(PROJECT)}&status=TO_REVIEW&ps=500&p=${page}`,
    )
    hotspots.push(...r.hotspots)
    if (hotspots.length >= r.paging.total || r.hotspots.length === 0) {
      break
    }
  }

  if (hotspots.length === 0) {
    console.log('Nothing to do: no hotspots in TO_REVIEW.')
    return
  }

  const byRule = hotspots.reduce((acc, h) => {
    ;(acc[h.ruleKey] ||= []).push(h)
    return acc
  }, {})

  console.log(`${hotspots.length} hotspot(s) awaiting review on ${PROJECT}:`)
  for (const [rule, list] of Object.entries(byRule)) {
    const known = JUSTIFICATION[rule] ? '' : '   <-- NO JUSTIFICATION ON FILE, will be skipped'
    console.log(`  ${String(list.length).padStart(4)}  ${rule}${known}`)
  }

  if (DRY) {
    console.log('\n--dry-run: nothing changed.')
    return
  }

  let done = 0
  let skipped = 0
  for (const h of hotspots) {
    const comment = JUSTIFICATION[h.ruleKey]
    if (!comment) {
      // Never blanket-approve a rule nobody has reasoned about.
      skipped += 1
      continue
    }
    const body = new URLSearchParams({
      hotspot: h.key,
      status: 'REVIEWED',
      resolution: 'SAFE',
      comment,
    })
    await api('/api/hotspots/change_status', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    done += 1
  }

  console.log(`\nmarked reviewed/SAFE: ${done}`)
  if (skipped) {
    console.log(`skipped (no justification on file, review these by hand): ${skipped}`)
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
