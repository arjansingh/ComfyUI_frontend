import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/scripts/api'
import type { Asset } from '@/types/assetTypes'

export const useAssetStore = defineStore('asset', () => {
  const assets = ref<Asset[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const isAssetApiAvailable = computed(() => 
    api.serverSupportsFeature('asset_api')
  )

  // Mock data for development
  const mockAssets: Asset[] = [
    {
      id: 'mock-1',
      name: 'Realistic Vision V5.1',
      filename: 'realisticVisionV51_v51VAE.safetensors',
      preview_url: '',
      file_size: 2134567890,
      file_type: 'safetensors',
      tags: ['realistic', 'photorealistic', 'checkpoint'],
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: 'mock-2', 
      name: 'DreamShaper XL',
      filename: 'dreamshaperXL_v21TurboDPMSDE.safetensors',
      preview_url: '',
      file_size: 6789012345,
      file_type: 'safetensors',
      tags: ['xl', 'artistic', 'checkpoint'],
      created_at: '2024-02-01T14:20:00Z'
    },
    {
      id: 'mock-3',
      name: 'Anime Model V3',
      filename: 'animeModel_v3.safetensors',
      preview_url: '',
      file_size: 2000000000,
      file_type: 'safetensors',
      tags: ['anime', 'cartoon', 'checkpoint'],
      created_at: '2024-01-28T09:15:00Z'
    },
    {
      id: 'mock-4',
      name: 'Photorealistic Base',
      filename: 'photoBase_v12.ckpt',
      preview_url: '',
      file_size: 4000000000,
      file_type: 'ckpt',
      tags: ['photorealistic', 'portrait', 'checkpoint'],
      created_at: '2024-02-10T16:45:00Z'
    }
  ]

  async function fetchCheckpointAssets(): Promise<Asset[]> {
    if (!isAssetApiAvailable.value) {
      console.log('Asset API unavailable, using mock data')
      return mockAssets
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.fetchApi('/assets?include_tags=models,checkpoints&limit=100')
      const data = await response.json()
      return data
    } catch (err) {
      console.error('Asset API unavailable, falling back to mock data:', err)
      error.value = err instanceof Error ? err : new Error('Unknown error')
      return mockAssets
    } finally {
      isLoading.value = false
    }
  }

  async function loadCheckpointAssets() {
    const fetchedAssets = await fetchCheckpointAssets()
    assets.value = fetchedAssets
  }

  function searchAssets(query: string): Asset[] {
    if (!query.trim()) {
      return assets.value
    }
    
    const lowerQuery = query.toLowerCase()
    return assets.value.filter(asset => 
      asset.name.toLowerCase().includes(lowerQuery) ||
      asset.filename?.toLowerCase().includes(lowerQuery) ||
      asset.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  return {
    assets: computed(() => assets.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    isAssetApiAvailable,
    loadCheckpointAssets,
    searchAssets
  }
})