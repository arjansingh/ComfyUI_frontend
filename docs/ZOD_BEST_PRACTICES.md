# Zod Best Practices for ComfyUI Frontend

**Last Updated:** 2025-09-08  
**Based on:** Asset service refactor session and existing codebase patterns

This document establishes the definitive Zod validation patterns for this project, based on actual working session evidence and established codebase conventions.

## Repository Schema Organization Patterns

### ✅ Correct: Dedicated Schema Files

All Zod schemas MUST live in `src/schemas/` directory with consistent naming:

```typescript
// src/schemas/assetSchema.ts
import { z } from 'zod'

const zAsset = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string()),
  size: z.number(),
  created_at: z.string().optional()
})

// Export schemas with descriptive names
export const assetSchema = zAsset
export const assetResponseSchema = zAssetResponse

// Export types derived from schemas
export type Asset = z.infer<typeof zAsset>
export type AssetResponse = z.infer<typeof zAssetResponse>
```

### ❌ Anti-Pattern: Inline Schema Definitions

**Never define schemas directly in service files:**

```typescript
// ❌ WRONG - Don't do this
function createAssetService() {
  const zAsset = z.object({ /* ... */ }) // Schemas don't belong here
  // ...
}
```

**Evidence:** The asset service originally had inline schemas that violated repository patterns, requiring refactor to match `colorPaletteSchema.ts` and `apiSchema.ts` conventions.

## Schema Definition Best Practices

### Naming Conventions

Follow established patterns from `apiSchema.ts`:

```typescript
// Internal schema definitions (private)
const zAsset = z.object({ /* ... */ })
const zAssetResponse = z.object({ /* ... */ })

// Exported schemas (descriptive names)
export const assetSchema = zAsset
export const assetResponseSchema = zAssetResponse
export const modelFolderSchema = zModelFolder

// Exported types (derived from schemas)
export type Asset = z.infer<typeof zAsset>
export type AssetResponse = z.infer<typeof zAssetResponse>
```

### Schema Composition Patterns

Based on `colorPaletteSchema.ts` and `apiSchema.ts`:

```typescript
// Compose complex schemas from simpler ones
const zBaseAsset = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string())
})

const zAssetWithMetadata = zBaseAsset.extend({
  size: z.number(),
  created_at: z.string().optional()
})

// Use passthrough for extensibility (following colorPaletteSchema pattern)
const zExtensibleAsset = zBaseAsset
  .extend({
    core_field: z.string()
  })
  .passthrough() // Allows additional properties
```

## Service Integration Patterns

### Standard Import Pattern

Based on `colorPaletteService.ts`:

```typescript
import { fromZodError } from 'zod-validation-error'
import { api } from '@/scripts/api'
import {
  assetResponseSchema,
  type Asset,
  type AssetResponse,
  type ModelFolder
} from '@/schemas/assetSchema'
```

### Validation Function Pattern

Following `colorPaletteService.ts` established pattern:

```typescript
/**
 * Validates asset response data using Zod schema
 */
function validateAssetResponse(data: unknown): AssetResponse {
  const result = assetResponseSchema.safeParse(data)
  if (result.success) return result.data

  const error = fromZodError(result.error)
  throw new Error(`Invalid asset response against zod schema:\n${error}`)
}
```

**Critical Requirements:**
- Always use `safeParse()` - never `parse()` directly
- Always use `fromZodError()` for user-friendly error messages
- Error message format: `"Invalid {type} against zod schema:\n{error}"`
- This matches `colorPaletteService.ts` established pattern

### Service Usage Pattern

```typescript
async function handleAssetRequest(url: string, context: string): Promise<AssetResponse> {
  const res = await api.fetchApi(url)
  if (!res.ok) {
    throw new Error(
      `Unable to load ${context}: Server returned ${res.status}. Please try again.`
    )
  }
  const data = await res.json()
  return validateAssetResponse(data) // Zod validation here
}
```

## Error Handling Standards

### User-Friendly Error Messages

Based on `colorPaletteService.ts` pattern:

```typescript
// ✅ CORRECT - Informative error with context
throw new Error(`Invalid asset response against zod schema:\n${error}`)

// ❌ WRONG - Technical-only error
throw new Error(`Zod validation failed: ${result.error}`)
```

### Error Context Pattern

For API integrations, provide context about what failed:

```typescript
function validateAssetResponse(data: unknown, context?: string): AssetResponse {
  const result = assetResponseSchema.safeParse(data)
  if (result.success) return result.data

  const error = fromZodError(result.error)
  const contextMsg = context ? ` when loading ${context}` : ''
  throw new Error(`Invalid asset response against zod schema${contextMsg}:\n${error}`)
}
```

## Testing Zod Validation

### Test Structure

Based on actual `assetService.test.ts` patterns:

```typescript
describe('API validation', () => {
  it('should validate correct response structure', async () => {
    const validAssets = [
      {
        id: 'uuid-1',
        name: 'model.safetensors',
        tags: ['models', 'checkpoints'],
        size: 123456
      }
    ]
    mockApiResponse({ assets: validAssets })

    const result = await assetService.getAssetModels('checkpoints')
    
    expect(result).toEqual([
      expect.objectContaining({ name: 'model.safetensors', pathIndex: 0 })
    ])
  })

  it('should reject invalid response structure', async () => {
    const invalidAssets = [
      {
        id: 'uuid-1',
        // Missing required 'name' field
        tags: ['models', 'checkpoints'],
        size: 123456
      }
    ]
    mockApiResponse({ assets: invalidAssets })

    await expect(assetService.getAssetModels('checkpoints')).rejects.toThrow(
      'Invalid asset response against zod schema'
    )
  })
})
```

### Test Data Guidelines

**Evidence:** Tests originally failed when we made `name` required because test used `name: undefined`. With Zod validation, such invalid data is rejected at the API response level.

```typescript
// ✅ CORRECT - Use valid test data that matches schema
const validAssets = [
  { id: 'uuid-1', name: 'valid.safetensors', tags: ['models'], size: 123 }
]

// ❌ WRONG - Don't test with data that violates schema requirements
const invalidAssets = [
  { id: 'uuid-1', name: undefined, tags: ['models'], size: 123 } // Zod rejects this
]
```

## Schema Evolution Patterns

### Adding Optional Fields

```typescript
// Safe evolution - add optional fields
const zAssetV2 = zAsset.extend({
  metadata: z.record(z.string(), z.unknown()).optional(),
  version: z.string().optional()
})
```

### Handling Version Changes

Based on `apiSchema.ts` patterns:

```typescript
// Support multiple versions
const zAssetV1 = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string())
})

const zAssetV2 = zAssetV1.extend({
  size: z.number(),
  created_at: z.string().optional()
})

// Union for backward compatibility
const zAsset = z.union([zAssetV2, zAssetV1])
```

## Common Anti-Patterns to Avoid

### 1. Inline Schema Definitions ❌

**Evidence:** Asset service originally violated repository patterns with inline schemas.

```typescript
// ❌ DON'T DO THIS
function createService() {
  const schema = z.object({ /* ... */ }) // Wrong place!
}
```

### 2. Direct parse() Usage ❌

```typescript
// ❌ DON'T DO THIS - No error handling
const data = schema.parse(unknownData)

// ✅ DO THIS - Proper error handling
const result = schema.safeParse(unknownData)
if (!result.success) {
  // Handle error appropriately
}
```

### 3. Inconsistent Error Messages ❌

**Evidence:** Originally used "Invalid asset response against schema" instead of established "against zod schema" pattern.

```typescript
// ❌ INCONSISTENT with codebase
throw new Error(`Invalid data: ${error}`)

// ✅ CONSISTENT with colorPaletteService.ts
throw new Error(`Invalid asset response against zod schema:\n${error}`)
```

### 4. Missing Type Exports ❌

```typescript
// ❌ DON'T DO THIS - Others can't use types
const zAsset = z.object({ /* ... */ })
// No export type Asset = z.infer<typeof zAsset>

// ✅ DO THIS - Export types for reuse
export type Asset = z.infer<typeof zAsset>
```

## Migration Guidelines

### From Inline to Dedicated Schemas

**Evidence:** Asset service refactor from inline to dedicated schema file.

**Step 1:** Create schema file
```typescript
// Create src/schemas/yourFeatureSchema.ts
import { z } from 'zod'

const zYourType = z.object({ /* move schema here */ })
export const yourTypeSchema = zYourType
export type YourType = z.infer<typeof zYourType>
```

**Step 2:** Update service imports
```typescript
// Update src/services/yourService.ts
import {
  yourTypeSchema,
  type YourType
} from '@/schemas/yourFeatureSchema'
```

**Step 3:** Update validation calls
```typescript
// Change from inline schema usage
const result = zYourType.safeParse(data)

// To imported schema usage
const result = yourTypeSchema.safeParse(data)
```

## Integration with Existing Patterns

### Following apiSchema.ts Conventions

Large-scale schema files like `apiSchema.ts` demonstrate:
- Comprehensive type coverage for API responses
- Consistent naming with `z` prefixes for schemas
- Proper type inference patterns
- WebSocket message validation patterns

### Following colorPaletteSchema.ts Patterns

Service integration patterns demonstrate:
- Schema composition with `.extend()` and `.passthrough()`
- Complex validation with custom refinements
- Service-level validation functions
- Consistent error handling with `fromZodError()`

## Quick Reference Checklist

**Before implementing Zod validation:**
- [ ] Schema file created in `src/schemas/`
- [ ] Follows naming conventions (`zPrefix`, descriptive exports)
- [ ] Service imports from schema file (not inline)
- [ ] Uses `safeParse()` with `fromZodError()` error handling
- [ ] Error messages match repository pattern ("against zod schema")
- [ ] Types exported for reuse
- [ ] Tests validate both success and failure cases
- [ ] No anti-patterns (inline schemas, direct `parse()`, inconsistent errors)

**Evidence Base:** This documentation is based on the asset service refactor session where inline schemas violated repository patterns, requiring migration to dedicated schema files following established conventions from `colorPaletteSchema.ts` and `apiSchema.ts`.