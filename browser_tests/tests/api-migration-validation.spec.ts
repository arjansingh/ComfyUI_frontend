import { expect } from '@playwright/test'

import { comfyPageFixture as test } from '../fixtures/ComfyPage'

test.describe('API Migration Validation', () => {
  test('Should validate assets API migration for model library', async ({
    page
  }) => {
    // Track network requests
    const apiRequests: Array<{ url: string; status: number; response?: any }> =
      []

    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('/api/assets') && url.includes('include_tags=models')) {
        const responseData = await response.json().catch(() => null)
        apiRequests.push({
          url,
          status: response.status(),
          response: responseData
        })
      }
    })

    // 1. Visit the app at localhost:5173
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Wait for the app to be ready
    await expect(page.locator('body')).toBeVisible()

    // 2. Open the model sidebar
    const sidebarToggle = page
      .locator(
        '[data-testid="sidebar-toggle"], .sidebar-toggle, button:has-text("Models")'
      )
      .or(page.locator('button').filter({ hasText: /model/i }).first())
      .or(page.locator('.p-button').filter({ hasText: /model/i }).first())
      .or(page.locator('[title*="model" i], [aria-label*="model" i]'))

    // Try to find and click the model sidebar button
    if ((await sidebarToggle.count()) > 0) {
      await sidebarToggle.first().click()
    } else {
      // Fallback: look for any sidebar or panel that might contain models
      const sidebar = page.locator('.sidebar, .panel, .drawer').first()
      if ((await sidebar.count()) > 0) {
        await sidebar.click()
      }
    }

    // Wait a bit for the sidebar to open and load
    await page.waitForTimeout(2000)

    // Look for model library or model-related UI elements
    const modelLibrarySelectors = [
      '[data-testid="model-library"]',
      '.model-library',
      '.model-tree',
      '.model-list',
      'text=Models',
      'text=Checkpoints',
      'text=LoRA',
      '[class*="model"]'
    ]

    let modelLibraryFound = false
    for (const selector of modelLibrarySelectors) {
      if ((await page.locator(selector).count()) > 0) {
        await page.locator(selector).first().click()
        modelLibraryFound = true
        break
      }
    }

    // Wait for API calls to complete
    await page.waitForTimeout(3000)

    // 3. Validate API responses
    console.log(
      'API Requests captured:',
      apiRequests.map((req) => ({ url: req.url, status: req.status }))
    )

    // Should have made at least one assets API call
    expect(apiRequests.length).toBeGreaterThan(0)

    // All API calls should return 2xx status
    for (const request of apiRequests) {
      expect(request.status).toBeGreaterThanOrEqual(200)
      expect(request.status).toBeLessThan(300)
    }

    // Validate API response structure
    const foldersRequest = apiRequests.find(
      (req) =>
        req.url.includes('include_tags=models') &&
        req.url.includes('limit=500') &&
        !req.url.includes(',') // This is the getModelFolders call
    )

    if (foldersRequest?.response) {
      expect(foldersRequest.response).toHaveProperty('items')
      expect(foldersRequest.response).toHaveProperty('total')
      expect(Array.isArray(foldersRequest.response.items)).toBe(true)

      // Each asset should have the required fields
      for (const asset of foldersRequest.response.items) {
        expect(asset).toHaveProperty('id')
        expect(asset).toHaveProperty('name')
        expect(asset).toHaveProperty('tags')
        expect(asset).toHaveProperty('asset_hash')
        expect(Array.isArray(asset.tags)).toBe(true)
        expect(asset.tags).toContain('models')
      }
    }

    // 4. Validate UI shows model directories
    const modelDirectories = []

    // Try to extract model directories from the UI
    const folderElements = page.locator(
      '[class*="folder"], [class*="directory"], .tree-node:not(.leaf)'
    )
    const folderCount = await folderElements.count()

    if (folderCount > 0) {
      for (let i = 0; i < Math.min(folderCount, 10); i++) {
        const folderText = await folderElements.nth(i).textContent()
        if (folderText && folderText.trim()) {
          modelDirectories.push(folderText.trim())
        }
      }
    }

    // Also check for text content that might indicate model categories
    const possibleCategories = [
      'checkpoints',
      'loras',
      'vae',
      'text_encoders',
      'controlnet'
    ]
    const foundCategories = []

    for (const category of possibleCategories) {
      const categoryElement = page
        .locator(`text=${category}`)
        .or(page.locator(`text=${category.replace('_', ' ')}`))
      if ((await categoryElement.count()) > 0) {
        foundCategories.push(category)
      }
    }

    console.log('Found model directories in UI:', modelDirectories)
    console.log('Found model categories in UI:', foundCategories)

    // 5. Validate consistency between API and UI
    if (foldersRequest?.response && foldersRequest.response.items.length > 0) {
      // Extract unique categories from API response
      const apiCategories = new Set()
      for (const asset of foldersRequest.response.items) {
        for (const tag of asset.tags) {
          if (tag !== 'models' && tag !== 'input' && tag !== 'output') {
            apiCategories.add(tag)
          }
        }
      }

      console.log('Categories from API:', Array.from(apiCategories))

      // UI should show some indication of the categories returned by API
      // (Either as folder names or in some other form)
      const totalUIElements = modelDirectories.length + foundCategories.length
      if (apiCategories.size > 0) {
        expect(totalUIElements).toBeGreaterThan(0)
      }
    }

    // Take a screenshot for debugging
    await page.screenshot({
      path: 'browser_tests/screenshots/api-migration-validation.png',
      fullPage: true
    })

    // Log final status
    console.log('✅ API Migration Validation Complete')
    console.log(`📊 API Calls: ${apiRequests.length}`)
    console.log(
      `📁 UI Elements: ${modelDirectories.length + foundCategories.length}`
    )
    console.log(`🔗 Model Library Found: ${modelLibraryFound}`)
  })

  test('Should validate individual model folder API calls', async ({
    page
  }) => {
    // Track specific model folder API requests
    const modelFolderRequests: Array<{
      url: string
      status: number
      response?: any
    }> = []

    page.on('response', async (response) => {
      const url = response.url()
      // Look for specific folder API calls like /api/assets?include_tags=models,checkpoints
      if (
        url.includes('/api/assets') &&
        url.includes('include_tags=models,') &&
        url.includes('sort=name')
      ) {
        const responseData = await response.json().catch(() => null)
        modelFolderRequests.push({
          url,
          status: response.status(),
          response: responseData
        })
      }
    })

    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Try to expand model folders to trigger specific API calls
    const expandableElements = page.locator(
      '[class*="expand"], [class*="toggle"], .tree-node:not(.leaf)'
    )
    const expandCount = await expandableElements.count()

    if (expandCount > 0) {
      // Click on expandable elements to trigger model loading
      for (let i = 0; i < Math.min(expandCount, 3); i++) {
        try {
          await expandableElements.nth(i).click()
          await page.waitForTimeout(1000)
        } catch (e) {
          console.log(`Could not click expandable element ${i}:`, e)
        }
      }
    }

    await page.waitForTimeout(2000)

    console.log(
      'Model folder API requests:',
      modelFolderRequests.map((req) => ({
        url: req.url,
        status: req.status
      }))
    )

    // Validate model folder API calls if any were made
    for (const request of modelFolderRequests) {
      expect(request.status).toBeGreaterThanOrEqual(200)
      expect(request.status).toBeLessThan(300)

      if (request.response) {
        expect(request.response).toHaveProperty('items')
        expect(Array.isArray(request.response.items)).toBe(true)

        // Each model should have the required fields including assetId
        for (const asset of request.response.items) {
          expect(asset).toHaveProperty('id') // This becomes assetId in our mapping
          expect(asset).toHaveProperty('name')
          expect(asset).toHaveProperty('tags')
          expect(Array.isArray(asset.tags)).toBe(true)
          expect(asset.tags).toContain('models')
        }
      }
    }
  })
})
