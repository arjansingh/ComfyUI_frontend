import { z } from 'zod'

// Zod schemas for asset API validation
const zAsset = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string()),
  size: z.number(),
  created_at: z.string().optional()
})

const zAssetResponse = z.object({
  assets: z.array(zAsset).optional(),
  total: z.number().optional(),
  has_more: z.boolean().optional()
})

const zModelFolder = z.object({
  name: z.string(),
  folders: z.array(z.string())
})

// Export schemas following repository patterns
export const assetSchema = zAsset
export const assetResponseSchema = zAssetResponse
export const modelFolderSchema = zModelFolder

// Export types derived from Zod schemas
export type Asset = z.infer<typeof zAsset>
export type AssetResponse = z.infer<typeof zAssetResponse>
export type ModelFolder = z.infer<typeof zModelFolder>
