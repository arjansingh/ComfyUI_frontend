import { app } from '@/scripts/app'
import { useAssetBrowserDialog } from '@/composables/useAssetBrowserDialog'
import { useAssetStore } from '@/stores/assetStore'

app.registerExtension({
  name: 'Comfy.AssetBrowser',
  
  async beforeRegisterNodeDef(nodeType: any) {
    // Check if this is a CheckpointLoaderSimple node
    if (!nodeType.comfyClass || nodeType.comfyClass !== 'CheckpointLoaderSimple') return
    
    const originalNodeCreated = nodeType.prototype.onNodeCreated
    nodeType.prototype.onNodeCreated = function() {
      const result = originalNodeCreated?.apply(this)
      
      // Find the ckpt_name widget
      const ckptWidget = this.widgets?.find((w: any) => w.name === 'ckpt_name')
      if (ckptWidget) {
        const assetStore = useAssetStore()
        
        // Only override if asset API is available, otherwise use default behavior
        if (assetStore.isAssetApiAvailable) {
          // Override the widget's mouse interaction
          (ckptWidget as any).onMouseDown = function() {
            // Show asset browser instead of dropdown
            const assetBrowserDialog = useAssetBrowserDialog()
            assetBrowserDialog.show({
              onSelect: (asset) => {
                // Update widget value with selected asset filename
                this.value = asset.filename || asset.name
                this.callback?.(this.value)
                
                // Mark the node as modified
                const node = this as any
                if (node.graph) {
                  node.graph.setDirtyCanvas(true)
                }
              }
            })
            
            // Prevent default dropdown behavior
            return true
          }
        }
      }
      
      return result
    }
  }
})