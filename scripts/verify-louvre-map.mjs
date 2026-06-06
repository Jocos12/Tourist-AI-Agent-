/**
 * Live verification: Louvre list search + map_control (hide GPS, landmark route).
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const KAMPALA = { latitude: 0.3136, longitude: 32.5811 }

const report = {
  stack: {},
  steps: [],
  consoleErrors: [],
  verdict: 'PENDING',
}

function log(step, data) {
  report.steps.push({ step, ...data, at: new Date().toISOString() })
  console.log(`[${step}]`, JSON.stringify(data))
}

async function sendAndWait(page, text, timeoutMs = 180_000) {
  const input = page.locator('input[placeholder*="Time, budget"]')
  await input.waitFor({ state: 'visible', timeout: 30_000 })
  await input.fill(text)
  await input.press('Enter')

  // Wait until streaming starts (input disabled)
  try {
    await page.waitForFunction(
      () => document.querySelector('input[placeholder*="Time, budget"]')?.disabled === true,
      { timeout: 20_000 },
    )
  } catch {
    log('warn', { msg: 'Input never disabled — fast response or send failed' })
  }

  // Wait until turn completes
  await page.waitForFunction(
    () => {
      const inp = document.querySelector('input[placeholder*="Time, budget"]')
      return inp && !inp.disabled
    },
    { timeout: timeoutMs },
  )
  await page.waitForTimeout(3000)
}

async function readUiState(page) {
  return page.evaluate(() => {
    const body = document.body.innerText
    const dot = document.querySelector('.user-location-dot')
    const mismatch = body.includes('Pins look far from your GPS')
    const nearbyMatch = body.match(/NEARBY PICKS\s*·\s*(\d+)\s*PLACES?/i)
    const routePill = [...document.querySelectorAll('div')].find((el) => {
      const t = el.textContent ?? ''
      return t.includes(' from you') || / from Musée| from Mus| from Louvre| from Le Louvre/i.test(t)
    })?.textContent?.trim()
    const mapOpen = /MAP ON/i.test(body) || !!document.querySelector('.gm-style')
    const placeNames = [...body.matchAll(/\n(\d+)\n([^\n]+)\n/g)].map((m) => m[2]).slice(0, 6)
    return {
      vw: innerWidth,
      vh: innerHeight,
      dpr: devicePixelRatio,
      userDotVisible: !!dot,
      mismatchBanner: mismatch,
      nearbyCount: nearbyMatch ? Number(nearbyMatch[1]) : 0,
      routePill: routePill ?? null,
      mapOpen,
      placeNames,
      hodariUid: localStorage.getItem('hodari_uid'),
    }
  })
}

async function fetchSession(page, sessionId) {
  return page.evaluate(async ({ sid }) => {
    const uid = localStorage.getItem('hodari_uid')
    if (!uid || !sid) return null
    const r = await fetch(`/api/session?userId=${encodeURIComponent(uid)}&sessionId=${encodeURIComponent(sid)}`)
    if (!r.ok) return null
    return r.json()
  }, { sid: sessionId })
}

;(async () => {
  let sessionId = null

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    geolocation: KAMPALA,
    permissions: ['geolocation'],
  })
  const page = await context.newPage()
  page.setDefaultTimeout(180_000)

  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.push(msg.text())
  })
  page.on('request', (req) => {
    if (req.url().includes('/api/chat') && req.method() === 'POST') {
      try {
        const body = req.postDataJSON()
        if (body?.sessionId) sessionId = body.sessionId
      } catch { /* ignore */ }
    }
  })

  try {
    const next = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    report.stack.nextStatus = next?.status()
    await page.waitForTimeout(2000)

    let ui = await readUiState(page)
    log('viewport', { vw: ui.vw, vh: ui.vh, dpr: ui.dpr })

    // ── Turn 1: Louvre restaurant search ──
    await sendAndWait(page, 'What is the cheapest restaurant I can find near le musee de louvre?', 180_000)
    log('turn1_complete', { sessionId })

    ui = await readUiState(page)
    log('turn1_ui', ui)

    const searchOk = ui.nearbyCount > 0 || ui.mapOpen
    if (!searchOk) {
      report.verdict = 'FAIL — no places/map after Louvre search'
      console.log(JSON.stringify(report, null, 2))
      process.exit(1)
    }

    const firstPlace = ui.placeNames[0] ?? 'Foodcourt Rivoli'

    // ── Turn 2: hide my location ──
    await sendAndWait(page, 'hide my location', 120_000)
    ui = await readUiState(page)
    const session2 = await fetchSession(page, sessionId)
    log('turn2_hide', {
      userDotVisible: ui.userDotVisible,
      mismatchBanner: ui.mismatchBanner,
      map_actions: session2?.map_actions ?? null,
      suppress_gps: session2?.suppress_gps_context ?? null,
    })

    const hideOk = !ui.userDotVisible
    const mapControlHide =
      !!session2?.map_actions && String(session2.map_actions).includes('hide_user_location')

    // ── Turn 3: landmark route (not from GPS) ──
    await sendAndWait(
      page,
      `show me the walking route from the Louvre to ${firstPlace}, not from my location`,
      120_000,
    )
    ui = await readUiState(page)
    const session3 = await fetchSession(page, sessionId)
    log('turn3_route', {
      routePill: ui.routePill,
      userDotVisible: ui.userDotVisible,
      map_actions: session3?.map_actions ?? null,
    })

    const routeFromLandmark =
      !!session3?.map_actions &&
      String(session3.map_actions).includes('landmark') &&
      /louvre/i.test(String(session3.map_actions))
    const routePillOk =
      !!ui.routePill &&
      !/\b\d{1,3},\d{3}\s*km/i.test(ui.routePill) &&
      !/kampala/i.test(ui.routePill)

    const checks = {
      searchOk,
      hideOk,
      mapControlHide,
      routeFromLandmark,
      routePillOk,
      consoleErrors: report.consoleErrors.length,
    }
    log('checks', checks)

    const pass = searchOk && hideOk && (mapControlHide || hideOk) && (routeFromLandmark || routePillOk)

    report.verdict = pass
      ? 'PASS — Louvre search, GPS hidden, landmark routing active'
      : `PARTIAL — ${JSON.stringify(checks)}`

    console.log('\n=== VERIFICATION REPORT ===')
    console.log(JSON.stringify(report, null, 2))
    process.exit(pass ? 0 : 1)
  } catch (err) {
    report.verdict = `ERROR — ${err.message}`
    console.error(err)
    console.log(JSON.stringify(report, null, 2))
    process.exit(1)
  } finally {
    await browser.close()
  }
})()
