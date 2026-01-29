# Playwright Implementation Testing Checklist

**Branch:** `claude/OtaibaPlaywrightWork-PnIg5`
**Date:** 2026-01-29
**Status:** Ready for testing

---

## Overview

A Playwright implementation has been added as an alternative to Puppeteer. The original Puppeteer code is untouched - both versions coexist. This document outlines the steps to validate the Playwright version.

---

## Setup

- [ ] Checkout branch: `git checkout claude/OtaibaPlaywrightWork-PnIg5`
- [ ] Install dependencies: `npm install`
- [ ] Verify Playwright installed: `npx playwright --version`
- [ ] Install browsers: `npx playwright install chromium`
- [ ] Compile TypeScript: `npm run tsc`
- [ ] Verify build output exists: `ls build/AuxTA.playwright.js`

---

## Files to Review

| New File | Purpose |
|----------|---------|
| `src/playwright/playwright.ts` | Main browser wrapper |
| `src/macros/helpers/code.helper.playwright.ts` | Test helper methods |
| `src/macros/helpers/extend-default-page.playwright.ts` | Page extensions |
| `src/auxta/utilities/screenshot.helper.playwright.ts` | Screenshot capture |
| `src/AuxTA.playwright.ts` | Entry point |

---

## Functional Tests

### 1. Basic Browser Launch
- [ ] Browser starts in headless mode (server)
- [ ] Browser starts with UI (local, `ENVIRONMENT=LOCAL`)
- [ ] Browser closes cleanly after test

### 2. Page Navigation
- [ ] `page.goto()` works and logs correctly
- [ ] `waitForLoadState('networkidle')` works
- [ ] URL tracking is accurate

### 3. Element Interactions
- [ ] `page.click()` works and logs element name
- [ ] `page.type()` / `page.fill()` works and logs field name
- [ ] `page.waitForSelector()` works with timeout

### 4. Screenshot Capture
- [ ] Screenshots captured on failure
- [ ] Screenshots captured for all open tabs
- [ ] Buffer returned correctly for upload

### 5. Multi-Tab Support
- [ ] New tabs detected via `context.on('page')`
- [ ] Console/network logging works per-tab
- [ ] Tab logs accessible via `getTabLogs()`

### 6. Event Listeners
- [ ] Console messages captured
- [ ] Page errors captured
- [ ] HTTP responses logged
- [ ] Request failures logged

### 7. Error Handling
- [ ] Retry logic works (2nd attempt on failure)
- [ ] Error messages include proper context
- [ ] Screenshots captured on error

### 8. Report Upload
- [ ] Logs upload correctly to AuxTA backend
- [ ] Screenshots upload correctly
- [ ] Scenario status reflects pass/fail

---

## Integration Test

Run an existing test suite using Playwright instead of Puppeteer:

```typescript
// Change import in test file
// FROM:
import auxta from '@auxcode/auxta';

// TO:
import auxta from '@auxcode/auxta/build/AuxTA.playwright';
```

- [ ] Test suite runs to completion
- [ ] Results match Puppeteer version
- [ ] No regressions in functionality

---

## Known Differences from Puppeteer

| Feature | Puppeteer | Playwright |
|---------|-----------|------------|
| Network idle | `waitForNetworkIdle()` | `waitForLoadState('networkidle')` |
| New tab detection | `browser.on('targetcreated')` | `context.on('page')` |
| Force pseudo-state | CDP session | CSS injection |
| Device emulation | `KnownDevices` | `devices` |

---

## Issues Found

| # | Description | Severity | Status |
|---|-------------|----------|--------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## Sign-off

- [ ] All functional tests pass
- [ ] Integration test passes
- [ ] No regressions from Puppeteer version
- [ ] Ready for merge / further development

**Tested by:** ___________________
**Date:** ___________________
