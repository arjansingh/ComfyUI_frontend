import { useAssetBrowserDialog } from '@/composables/useAssetBrowserDialog'

import { app } from '../../scripts/app'

// Adds asset browser capability to eligible combo widgets

// Check if a widget is eligible for asset browser functionality
const isAssetBrowserWidget = (widget: any) => {
  if (!widget || widget.type !== 'combo') return false

  // Check for asset browser eligibility based on widget name patterns
  const assetInputNames = ['ckpt_name', 'model_name', 'checkpoint']
  const widgetName = widget.name?.toLowerCase() || ''

  return assetInputNames.some((pattern) => widgetName.includes(pattern))
}

app.registerExtension({
  name: 'Comfy.AssetBrowser',
  nodeCreated(node) {
    // Find widgets that are eligible for asset browser and add onClick handlers
    if (!node.widgets) return

    const assetBrowserDialog = useAssetBrowserDialog()

    for (const widget of node.widgets) {
      // Check if this widget is eligible for asset browser enhancement
      if (isAssetBrowserWidget(widget)) {
        console.log('🎯 Adding asset browser onClick to widget:', widget.name)

        // Store original callback
        const originalCallback = widget.callback || (() => {})

        // Add onClick handler that opens asset browser
        widget.callback = function (
          value: any,
          canvas?: any,
          node?: any,
          pos?: any,
          e?: any
        ) {
          console.log('🎯 Asset browser widget clicked:', widget.name)

          assetBrowserDialog.show({
            onSelect: (asset) => {
              console.log('✅ Asset selected:', asset.name)
              // Update widget value
              widget.value = asset.filename || asset.name
              // Trigger widget change event
              if (node && node.onWidgetChanged) {
                node.onWidgetChanged(widget.name, widget.value)
              }
            }
          })

          // Call original callback
          return originalCallback(value, canvas, node, pos, e)
        }
      }
    }
  }
})
