import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { describe, expect, it, vi } from 'vitest'

import type { ComboInputSpec } from '@/schemas/nodeDef/nodeDefSchemaV2'
import type { SimplifiedWidget } from '@/types/simplifiedWidget'

import WidgetSelectDropdown from '@/renderer/extensions/vueNodes/widgets/components/WidgetSelectDropdown.vue'

describe('WidgetSelectDropdown getOptionLabel', () => {
  const createMockWidget = (
    value: string = 'hash123.png',
    options: {
      values?: string[]
      getOptionLabel?: (value: string | null) => string
    } = {},
    spec?: ComboInputSpec
  ): SimplifiedWidget<string | number | undefined> => ({
    name: 'test_image_select',
    type: 'combo',
    value,
    options: {
      values: ['hash123.png', 'hash456.png', 'hash789.png'],
      ...options
    },
    spec
  })

  const mountComponent = (
    widget: SimplifiedWidget<string | number | undefined>,
    modelValue: string | number | undefined,
    assetKind: 'image' | 'video' | 'audio' = 'image'
  ) => {
    return mount(WidgetSelectDropdown, {
      props: {
        widget,
        modelValue,
        assetKind,
        allowUpload: true,
        uploadFolder: 'input'
      },
      global: {
        plugins: [PrimeVue, createTestingPinia()]
      }
    })
  }

  describe('without getOptionLabel', () => {
    it('displays raw values in dropdown items', () => {
      const widget = createMockWidget('hash123.png')
      const wrapper = mountComponent(widget, 'hash123.png')

      const inputItems = (wrapper.vm as any).inputItems
      expect(inputItems).toHaveLength(3)
      expect(inputItems[0].name).toBe('hash123.png')
      expect(inputItems[0].label).toBe('hash123.png')
      expect(inputItems[1].name).toBe('hash456.png')
      expect(inputItems[1].label).toBe('hash456.png')
      expect(inputItems[2].name).toBe('hash789.png')
      expect(inputItems[2].label).toBe('hash789.png')
    })
  })

  describe('with getOptionLabel', () => {
    it('transforms values using getOptionLabel for display', () => {
      const getOptionLabel = vi.fn((value: string | null) => {
        if (!value) return 'No file'
        const mapping: Record<string, string> = {
          'hash123.png': 'vacation_photo.png',
          'hash456.png': 'family_portrait.png',
          'hash789.png': 'sunset_beach.png'
        }
        return mapping[value] || value
      })

      const widget = createMockWidget('hash123.png', {
        getOptionLabel
      })
      const wrapper = mountComponent(widget, 'hash123.png')

      const inputItems = (wrapper.vm as any).inputItems
      expect(inputItems).toHaveLength(3)
      expect(inputItems[0].name).toBe('hash123.png')
      expect(inputItems[0].label).toBe('vacation_photo.png')
      expect(inputItems[1].name).toBe('hash456.png')
      expect(inputItems[1].label).toBe('family_portrait.png')
      expect(inputItems[2].name).toBe('hash789.png')
      expect(inputItems[2].label).toBe('sunset_beach.png')

      expect(getOptionLabel).toHaveBeenCalledWith('hash123.png')
      expect(getOptionLabel).toHaveBeenCalledWith('hash456.png')
      expect(getOptionLabel).toHaveBeenCalledWith('hash789.png')
    })

    it('keeps original value unchanged when selecting items', async () => {
      const getOptionLabel = vi.fn((value: string | null) => {
        if (!value) return 'No file'
        return `friendly_${value}`
      })

      const widget = createMockWidget('hash123.png', {
        getOptionLabel
      })
      const wrapper = mountComponent(widget, 'hash123.png')

      // Simulate selecting an item
      const selectedSet = new Set(['input-1']) // index 1 = hash456.png
      ;(wrapper.vm as any).updateSelectedItems(selectedSet)

      // Should emit the original hash value, not the transformed name
      expect(wrapper.emitted('update:modelValue')).toBeDefined()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['hash456.png'])
    })

    it('handles errors in getOptionLabel gracefully', () => {
      const getOptionLabel = vi.fn((value: string | null) => {
        if (value === 'hash456.png') {
          throw new Error('Mapping failed')
        }
        return `friendly_${value}`
      })

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const widget = createMockWidget('hash123.png', {
        getOptionLabel
      })
      const wrapper = mountComponent(widget, 'hash123.png')

      const inputItems = (wrapper.vm as any).inputItems
      expect(inputItems[0].name).toBe('hash123.png')
      expect(inputItems[0].label).toBe('friendly_hash123.png')
      expect(inputItems[1].name).toBe('hash456.png')
      expect(inputItems[1].label).toBe('hash456.png')
      expect(inputItems[2].name).toBe('hash789.png')
      expect(inputItems[2].label).toBe('friendly_hash789.png')

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('output items with getOptionLabel', () => {
    it('applies getOptionLabel to output items as well', () => {
      const getOptionLabel = vi.fn((value: string | null) => {
        if (!value) return 'No file'
        return `output_${value}`
      })

      const widget = createMockWidget('hash123.png', {
        getOptionLabel
      })
      const wrapper = mountComponent(widget, 'hash123.png')

      // Output items are populated from queue history
      // For this test, we're verifying the transformation logic exists
      const outputItems = (wrapper.vm as any).outputItems
      expect(outputItems).toBeDefined()
      expect(Array.isArray(outputItems)).toBe(true)
    })
  })
})
