# GitHub Actions CI/CD

## Overview

Three workflows automate lint, test, and deployment for CRM ByBusiness.

| Workflow | File | Triggers | What it does |
|---|---|---|---|
| **CI** | `ci.yml` | PR/push to `main` | Lint, lint:scope, build, unit tests |
| **E2E** | `e2e.yml` | PR/push to `main`, manual | Playwright E2E tests (12 specs) |
| **Deploy** | `deploy.yml` | Push to `main`, manual | Build + rsync to VPS production |

---

## Required GitHub Secrets

Configure these under **Settings → Secrets and variables → Actions** in the repository.

| Secret | Description | Example |
|---|---|---|
| `VPS_SSH_KEY` | Private SSH key with root access to the VPS | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `VPS_HOST` | Hostname or IP of the VPS | `72.60.191.179` |
| `N8N_API_KEY` | (Future) n8n API key for workflow deployments | `eyJhbGci...` |

### Adding a secret

1. Go to `https://github.com/Rafaeldelinares/la-fabrica-v2/settings/secrets/actions`
2. Click **New repository secret**
3. Add each secret from the table above
4. For `VPS_SSH_KEY`, copy the private key from `~/.ssh/id_rsa` on your local machine

---

## Triggering workflows

### Automatic (CI/CD)

- **CI** and **E2E** run automatically on every PR and push to `main`.
- **Deploy** runs automatically after every push to `main` (if CI passed).

### Manual

Use **workflow_dispatch** to trigger any workflow from the GitHub UI:

1. Go to **Actions** tab
2. Select the workflow
3. Click **Run workflow**

---

## Viewing test reports

E2E test artifacts are uploaded automatically:

- **playwright-report**: HTML report — download and open in a browser
- **test-results**: raw Playwright traces and screenshots

To download:
1. Go to the workflow run
2. Click on the job (e.g. `Playwright E2E`)
3. Scroll to **Artifacts** section
4. Click each artifact to download

Reports are retained for **7 days**.

---

## Branch protection

Recommended settings for `main`:

1. Go to **Settings → Branches → Add rule**
2. Set **Branch name pattern**: `main`
3. Enable:
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
   - ✅ **Require CI/CD workflows to pass before merging**
   - Add required checks: `lint-and-build`, `unit-tests`, `e2e`
   - ✅ **Do not allow bypassing the above settings**

This ensures no code reaches `main` without passing lint, build, unit tests, and E2E tests.

---

## Debugging a failing workflow

### 1. Find the failure

Go to **Actions** → select the failed run → click the failed job.

### 2. Read the logs

Each step expands to show stdout/stderr. Common failures:

| Step | Common cause | How to fix |
|---|---|---|
| `Install dependencies` | Lockfile mismatch | Run `npm ci` locally and commit |
| `Lint` | ESLint errors | Fix the reported file/line |
| `Lint scope` | Hardcoded `es_simulacion` literals | Remove or use the hook |
| `Build` | Vite build error | Run `npm run build` locally |
| `Run unit tests` | vitest assertion failure | Check `src/**/*.test.js` |
| `Run E2E tests` | Playwright test assertion | Check `e2e/**/*.spec.js` |
| `Deploy to VPS` | SSH key or rsync error | Verify secrets; check VPS is reachable |

### 3. Use artifacts

If E2E tests failed, download the `playwright-report` artifact — it contains screenshots and traces for every failure.

### 4. Re-run

Click **Re-run all jobs** (top right) after fixing the issue.

---

## Workflow details

### CI (`ci.yml`)

```
pull_request / push to main
  └─ lint-and-build  (lint, lint:scope, build)
  └─ unit-tests       (vitest run)
```

Both jobs run in parallel. All steps must pass.

### E2E (`e2e.yml`)

```
pull_request / push to main / manual
  └─ e2e  (playwright test with chromium)
       ├─ npm ci
       ├─ npx playwright install --with-deps chromium
       ├─ npm run build
       ├─ npm run test:e2e
       └─ artifacts: playwright-report/, test-results/
```

Uses `CI=true` env var so Playwright runs in single-worker mode.

### Deploy (`deploy.yml`)

```
push to main / manual
  └─ deploy  (needs: [] so it can run manually even without ci)
       ├─ npm ci
       ├─ npm run build
       └─ rsync dist/ → root@VPS_HOST:/var/www/crm.ia-bybusiness.com/
```

The `needs: []` allows manual deploys even if CI is failing. For branch-protection gated deploys, change to `needs: [lint-and-build, unit-tests]`.

The deploy uses the `production` environment which can have protection rules (required reviewers, etc.) configured in GitHub.

---

## Local equivalents

| GitHub Action | Local command |
|---|---|
| `npm ci` | `npm ci` |
| `npm run lint` | `npm run lint` |
| `npm run lint:scope` | `npm run lint:scope` |
| `npm run build` | `npm run build` |
| `npm test` | `npm test` (vitest) |
| `npm run test:e2e` | `npm run test:e2e` (Playwright) |
