# Security Policy

We take the security of FintechPressHub seriously. Thank you for taking the time to responsibly disclose any issues you find.

## Supported versions

Only the `main` branch is actively maintained and receives security fixes. If you're running an older snapshot, please update before reporting.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| Older   | :x:                |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.** Public issues let attackers see the bug before a fix is shipped.

Instead, report privately using either of these channels:

1. **GitHub's private vulnerability reporting** (preferred)
   Go to the [Security tab](https://github.com/aleenaa10000-coder/Fintech-Catalyst-Hub/security) of this repo and click **Report a vulnerability**. This opens a private advisory only the maintainers can see.

2. **Email**
   Send the details to **hello@fintechpresshub.com** with the subject line `SECURITY:` followed by a short description.

Please include as much of the following as you can:

- A clear description of the issue and its impact
- Steps to reproduce (proof-of-concept, request payloads, screenshots)
- The affected route, file, or component
- Your environment (Replit / local, Node version, browser if relevant)
- Any suggested fix, if you have one

If you'd like a PGP key to encrypt sensitive details, ask in your initial email and we'll provide one.

## What to expect

| Stage                | Target turnaround                                   |
| -------------------- | --------------------------------------------------- |
| Acknowledgement      | Within **3 business days** of your report           |
| Initial assessment   | Within **7 business days** (severity + next steps)  |
| Fix or mitigation    | Critical: **14 days** &nbsp;·&nbsp; High: **30 days** &nbsp;·&nbsp; Medium/Low: best effort |
| Public disclosure    | Coordinated with you, after a fix is released       |

We'll keep you updated as we triage and fix the issue, and we're happy to credit you in the release notes (or keep your report anonymous — your choice).

## Out of scope

The following generally won't be treated as vulnerabilities:

- Reports based solely on automated scanner output without a working proof-of-concept
- Missing security headers on pages that don't handle sensitive data
- Self-XSS that requires the victim to paste attacker-controlled code
- Denial-of-service from extreme traffic volumes
- Issues in third-party dependencies that already have a public CVE and a pending Dependabot/Renovate PR
- Social-engineering, phishing, or physical-access attacks

## Safe-harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, data destruction, and service disruption
- Only interact with accounts they own or have explicit permission to test
- Report the issue privately and give us reasonable time to fix it before any public disclosure

Thank you for helping keep FintechPressHub and its users safe.
