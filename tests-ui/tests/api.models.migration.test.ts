import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/scripts/api'

// Mock asset response types based on the new API
type AssetInfo = {
  id: string
  name: string
  asset_hash: string
  preview_hash?: string
  user_metadata: Record<string, any>
  created_at: string
  updated_at: string
  last_access_time: string
  tags: string[]
}

type AssetsResponse = {
  assets: AssetInfo[]
  total: number
  has_more: boolean
}

describe('API Models Migration', () => {
  let mockFetchApi: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetchApi = vi.fn()
    vi.spyOn(api, 'fetchApi').mockImplementation(mockFetchApi)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getModelFolders()', () => {
    it('should extract unique folder tags from assets API response', async () => {
      // Mock successful assets response
      const mockAssets: AssetInfo[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'model1.safetensors',
          asset_hash: 'blake3:abc123',
          user_metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_access_time: '2024-01-01T00:00:00Z',
          tags: ['models', 'checkpoints', 'flux']
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'model2.safetensors',
          asset_hash: 'blake3:def456',
          user_metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_access_time: '2024-01-01T00:00:00Z',
          tags: ['models', 'loras', 'style']
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'model3.safetensors',
          asset_hash: 'blake3:ghi789',
          user_metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_access_time: '2024-01-01T00:00:00Z',
          tags: ['models', 'vae']
        }
      ]

      const mockResponse: AssetsResponse = {
        assets: mockAssets,
        total: 3,
        has_more: false
      }

      mockFetchApi.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockResponse)
      })

      const result = await api.getModelFolders()

      // Should call new assets endpoint
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/assets?include_tags=models&limit=500'
      )

      // Should extract unique folder tags (excluding system tags)
      expect(result).toEqual([
        { name: 'checkpoints', folders: [] },
        { name: 'flux', folders: [] },
        { name: 'loras', folders: [] },
        { name: 'style', folders: [] },
        { name: 'vae', folders: [] }
      ])
    })

    it('should filter out system tags and duplicates', async () => {
      const mockAssets: AssetInfo[] = [
        {
          id: '1',
          name: 'test1.safetensors',
          asset_hash: 'blake3:abc123',
          user_metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_access_time: '2024-01-01T00:00:00Z',
          tags: ['models', 'checkpoints', 'flux']
        },
        {
          id: '2',
          name: 'test2.safetensors',
          asset_hash: 'blake3:def456',
          user_metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_access_time: '2024-01-01T00:00:00Z',
          tags: ['models', 'checkpoints', 'sdxl'] // duplicate checkpoints
        }
        // Asset without 'models' tag would not be returned by API
      ]

      mockFetchApi.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          assets: mockAssets,
          total: 3,
          has_more: false
        })
      })

      const result = await api.getModelFolders()

      // Should only return unique non-system tags (input tag filtered out, duplicates removed)
      expect(result).toEqual([
        { name: 'checkpoints', folders: [] },
        { name: 'flux', folders: [] },
        { name: 'sdxl', folders: [] }
      ])
    })

    it('should handle empty response', async () => {
      mockFetchApi.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi
          .fn()
          .mockResolvedValueOnce({ assets: [], total: 0, has_more: false })
      })

      const result = await api.getModelFolders()

      expect(result).toEqual([])
    })

    it('should handle 404 response', async () => {
      mockFetchApi.mockResolvedValueOnce({
        status: 404
      })

      const result = await api.getModelFolders()

      expect(result).toEqual([])
    })
  })

  describe('getModels(folder)', () => {
    it('should filter assets by folder tag and map to old format', async () => {
      const mockAssets: AssetInfo[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'flux-dev.safetensors',
          asset_hash: 'blake3:abc123',
          user_metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_access_time: '2024-01-01T00:00:00Z',
          tags: ['models', 'checkpoints']
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'sdxl-base.safetensors',
          asset_hash: 'blake3:def456',
          user_metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_access_time: '2024-01-01T00:00:00Z',
          tags: ['models', 'checkpoints']
        }
      ]

      mockFetchApi.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          assets: mockAssets,
          total: mockAssets.length,
          has_more: false
        })
      })

      const result = await api.getModels('checkpoints')

      // Should call assets API with folder tag filter
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/assets?include_tags=models,checkpoints&sort=name&order=asc&limit=500'
      )

      // Should map to old format with synthetic pathIndex and include assetId
      expect(result).toEqual([
        {
          name: 'flux-dev.safetensors',
          pathIndex: 0,
          assetId: '550e8400-e29b-41d4-a716-446655440000'
        },
        {
          name: 'sdxl-base.safetensors',
          pathIndex: 1,
          assetId: '550e8400-e29b-41d4-a716-446655440001'
        }
      ])
    })

    it('should handle empty folder', async () => {
      mockFetchApi.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi
          .fn()
          .mockResolvedValueOnce({ assets: [], total: 0, has_more: false })
      })

      const result = await api.getModels('empty_folder')

      expect(result).toEqual([])
    })

    it('should handle 404 response', async () => {
      mockFetchApi.mockResolvedValueOnce({
        status: 404
      })

      const result = await api.getModels('nonexistent')

      expect(result).toEqual([])
    })

    it('should preserve sort order and generate sequential pathIndex', async () => {
      const mockAssets: AssetInfo[] = [
        {
          id: '3',
          name: 'zebra.safetensors',
          asset_hash: 'blake3:ghi789',
          user_metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_access_time: '2024-01-01T00:00:00Z',
          tags: ['models', 'loras']
        },
        {
          id: '1',
          name: 'alpha.safetensors',
          asset_hash: 'blake3:abc123',
          user_metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_access_time: '2024-01-01T00:00:00Z',
          tags: ['models', 'loras']
        },
        {
          id: '2',
          name: 'beta.safetensors',
          asset_hash: 'blake3:def456',
          user_metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_access_time: '2024-01-01T00:00:00Z',
          tags: ['models', 'loras']
        }
      ]

      mockFetchApi.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          assets: mockAssets,
          total: 3,
          has_more: false
        })
      })

      const result = await api.getModels('loras')

      // PathIndex should be sequential based on returned order
      expect(result).toEqual([
        { name: 'zebra.safetensors', pathIndex: 0, assetId: '3' },
        { name: 'alpha.safetensors', pathIndex: 1, assetId: '1' },
        { name: 'beta.safetensors', pathIndex: 2, assetId: '2' }
      ])
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetchApi.mockRejectedValueOnce(new Error('Network error'))

      await expect(api.getModelFolders()).rejects.toThrow('Network error')
    })

    it('should handle malformed JSON responses', async () => {
      mockFetchApi.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockRejectedValueOnce(new Error('Invalid JSON'))
      })

      await expect(api.getModels('checkpoints')).rejects.toThrow('Invalid JSON')
    })
  })

  describe('Asset Scanning Integration', () => {
    it('should trigger asset scan when getModelFolders returns empty results', async () => {
      // Mock empty response first, then successful scan scheduling, then retry with data
      mockFetchApi
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: vi
            .fn()
            .mockResolvedValueOnce({ assets: [], total: 0, has_more: false })
        })
        // Mock scan schedule call
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: vi.fn().mockResolvedValueOnce({ status: 'scheduled' })
        })
        // Mock scan status calls (3 retries with exponential backoff)
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: vi.fn().mockResolvedValueOnce({ status: 'completed' })
        })
        // Mock retry call with assets
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: vi.fn().mockResolvedValueOnce({
            assets: [
              {
                id: '1',
                name: 'test-model.safetensors',
                asset_hash: 'blake3:abc123',
                user_metadata: {},
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                last_access_time: '2024-01-01T00:00:00Z',
                tags: ['models', 'checkpoints']
              }
            ],
            total: 1,
            has_more: false
          })
        })

      const result = await api.getModelFolders()

      // Should call initial assets API
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/assets?include_tags=models&limit=500'
      )
      // Should call scan schedule
      expect(mockFetchApi).toHaveBeenCalledWith('/assets/scan/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roots: ['models', 'input', 'output'] })
      })
      // Should call scan status
      expect(mockFetchApi).toHaveBeenCalledWith('/assets/scan')
      // Should retry assets API
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/assets?include_tags=models&limit=500'
      )

      // Should return folders from retry response
      expect(result).toEqual([{ name: 'checkpoints', folders: [] }])
    })

    it('should trigger asset scan when getModels returns empty results', async () => {
      // Mock empty response first, then successful scan, then retry with data
      mockFetchApi
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: vi
            .fn()
            .mockResolvedValueOnce({ assets: [], total: 0, has_more: false })
        })
        // Mock scan schedule call
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: vi.fn().mockResolvedValueOnce({ status: 'scheduled' })
        })
        // Mock scan status call
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: vi.fn().mockResolvedValueOnce({ status: 'completed' })
        })
        // Mock retry call with models
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: vi.fn().mockResolvedValueOnce({
            assets: [
              {
                id: '1',
                name: 'test-model.safetensors',
                asset_hash: 'blake3:abc123',
                user_metadata: {},
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                last_access_time: '2024-01-01T00:00:00Z',
                tags: ['models', 'checkpoints']
              }
            ],
            total: 1,
            has_more: false
          })
        })

      const result = await api.getModels('checkpoints')

      // Should call initial API, scan schedule, scan status, and retry
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/assets?include_tags=models,checkpoints&sort=name&order=asc&limit=500'
      )
      expect(mockFetchApi).toHaveBeenCalledWith('/assets/scan/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roots: ['models', 'input', 'output'] })
      })

      // Should return models from retry response
      expect(result).toEqual([
        { name: 'test-model.safetensors', pathIndex: 0, assetId: '1' }
      ])
    })

    it('should handle scan failure gracefully', async () => {
      // Mock empty response, then failed scan scheduling
      mockFetchApi
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: vi
            .fn()
            .mockResolvedValueOnce({ assets: [], total: 0, has_more: false })
        })
        // Mock failed scan schedule
        .mockResolvedValueOnce({
          status: 500
        })

      const result = await api.getModelFolders()

      expect(result).toEqual([])
      // Should not retry API call if scan fails
      expect(mockFetchApi).toHaveBeenCalledTimes(2)
    })
  })
})
