# ADR-0001: Align Release Claims With Roadmap State

**Status:** Proposed
**Date:** 2026-07-27
**Deciders:** Governance Dashboard Maintainers
**Implements:** [ADR-013: README Claim Substantiation](../../../agentics-enforcement/plans/adr/ADR-013-readme-claim-substantiation.md) (agentics-enforcement)

---

## Context

This repo's README claims a shipped v1.0 while its own completion roadmap describes
that same v1.0 as 18-24 weeks of unstarted future work. All citations read from the
working tree on 2026-07-27.

**README claims:**

- Line 5: `[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/llm-governance-dashboard)`
- Line 7: `[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/yourusername/llm-governance-dashboard/actions)`
- Line 10: `> Production-ready, open source platform for multi-tenant LLM governance with real-time cost tracking, budget enforcement, policy management, and comprehensive analytics.`

Both badges are hardcoded `img.shields.io/badge/` literals, and both link to
`github.com/yourusername/...` — a placeholder. The "build passing" evidence link
points at the Actions page of a repository that does not exist.

**`docs/COMPLETION_ROADMAP.md` describes the same v1.0 as future work:**

- Lines 8-11: `- MVP Phase: 8-10 weeks` / `- Beta Phase: 6-8 weeks` / `- v1.0 Release: 4-6 weeks` / `- **Total Estimated Duration: 18-24 weeks**`
- Line 769: `## Phase 3: v1.0 Production Release (Weeks 19-24)`
- Line 772: `The v1.0 release delivers a production-ready, enterprise-grade LLM governance platform...` — future tense, for the version the README says already shipped.
- Lines 1284-1294: `**Production Gate (End of Week 24):**` followed by `- [ ] All v1.0 features complete`, `- [ ] 95%+ test coverage maintained`, `- [ ] Zero critical or high bugs`, `- [ ] 99.99% uptime demonstrated in staging`, `- [ ] Legal and compliance sign-off`

**Every checkbox in all three phase gates (lines 1260-1294) is unchecked** — MVP,
Beta, and Production alike. By the repo's own criteria, the MVP gate has not been
passed.

**Measured ground truth:** 251 TODO/FIXME markers across the repo, **49 of them in
`services/auth-service` alone** — the highest concentration found fleet-wide.
Authentication is not a peripheral concern for a multi-tenant governance product
claiming "complete workspace isolation" and "role-based access" (README lines
17-18); it is the feature that makes multi-tenancy safe.

This repo does have a committed `Cargo.lock` (156KB) and `package-lock.json`, so it
satisfies ADR-013 Rule 4 — unlike its sibling offenders. The failures here are
Rule 2 (claim contradicts roadmap) and Rule 3 (placeholder org URLs).

## Decision

**The README's version claim is brought into line with the roadmap's own gate
criteria: unchecked gates mean the version has not shipped.**

Per ADR-013 Rule 2, the `version-1.0.0` badge and the "Production-ready" lede are
withdrawn until the Production Gate checkboxes at `docs/COMPLETION_ROADMAP.md`
lines 1284-1294 are actually checked. Per Rule 3, the placeholder URLs are replaced
with the real repository URL before any readiness claim is restored.

The roadmap is not the problem — it is a good document, and it is the *only* honest
account of this project's state. The README is what must change.

Concretely:

1. Replace the `yourusername` placeholder in README lines 5 and 7 with the real
   org path.
2. Reword line 5's badge from `version-1.0.0-blue` to `version-0.x--dev-orange`,
   matching gate reality.
3. Replace line 7's hardcoded `build-passing` badge with the repo's real GitHub
   Actions workflow badge.
4. Rewrite line 10's lede to describe intent rather than assert shipped status —
   the feature list that follows is a fine roadmap, and reads honestly once it is
   not prefixed by "Production-ready".
5. Burn down the 49 `services/auth-service` TODO/FIXME markers, or file them as
   tracked issues. A TODO in an auth path is an unfinished security control, and
   it must not be invisible to someone evaluating this for multi-tenant use.
6. Check the MVP gate boxes (roadmap lines 1260-1270) as they are genuinely met.
   That is the next real milestone, and the roadmap already defines it precisely.

## Consequences

### Positive

- The README stops contradicting the roadmap. Today a reader who opens both gets
  two irreconcilable accounts and no way to tell which is current.
- Working clone/Actions URLs, so the "build passing" claim becomes checkable
  rather than pointing at a 404.
- Surfacing the 49 auth TODOs as issues turns invisible risk into tracked work.
- Checked MVP gates become a real, earned signal — worth more than an unearned
  v1.0 badge.

### Negative

- Publicly downgrading from v1.0 to 0.x is a visible retreat. It is still cheaper
  than an adopter discovering the auth TODOs in production.
- Auditing 49 auth markers is real work that competes with feature delivery.

### Risks

- Some auth TODOs may prove to be genuine security gaps rather than cleanup.
  Mitigation: triage them before, not after, restoring any readiness claim — that
  is the entire point of doing this now.

## Implementation Plan

1. Replace `yourusername` with the real org in `README.md` lines 5 and 7.
2. Change line 5's badge to `version-0.x--dev-orange`.
3. Replace line 7's badge with the real Actions workflow badge.
4. Rewrite line 10 to drop "Production-ready" and state intent.
5. Inventory all 49 `services/auth-service` TODO/FIXME markers; classify each as
   security-relevant or cosmetic.
6. File security-relevant markers as tracked issues; resolve or annotate the rest.
7. Walk the MVP Gate criteria (roadmap lines 1260-1270) and check every box that
   is genuinely satisfied.
8. If the roadmap is superseded, annotate it `<!-- @post-1.0-roadmap -->` per
   ADR-013's exemption — but only if that is actually true.
9. Restore a production-readiness claim only when the Production Gate boxes
   (lines 1284-1294) are checked.

## Verification

- [ ] `grep -rn "yourusername" README.md` returns nothing.
- [ ] No `img.shields.io/badge/build-` literal remains in `README.md`.
- [ ] The version in `README.md` line 5 matches `VERSION` and the roadmap's
      current phase.
- [ ] `grep -rn -E "TODO|FIXME" services/auth-service --include=*.rs | wc -l`
      returns 0, or every remaining marker has a linked issue ID.
- [ ] MVP Gate checkboxes at `docs/COMPLETION_ROADMAP.md` lines 1260-1270 reflect
      real state.
- [ ] No "Production-ready" assertion appears in `README.md` while any Production
      Gate box at lines 1284-1294 is unchecked.
- [ ] `npm run check:claims-honesty` (agentics-enforcement) exits 0 for this repo.
