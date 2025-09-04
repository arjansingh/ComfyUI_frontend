import { app } from '@/scripts/app'
import { useAssetBrowserDialog } from '@/composables/useAssetBrowserDialog'
import { useAssetStore } from '@/stores/assetStore'

app.registerExtension({
  name: 'Comfy.AssetBrowser',
  
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeType.comfyClass !== 'CheckpointLoaderSimple') return
    
    const originalNodeCreated = nodeType.prototype.onNodeCreated
    nodeType.prototype.onNodeCreated = function() {
      const result = originalNodeCreated?.apply(this, arguments)
      
      // Find the ckpt_name widget
      const ckptWidget = this.widgets?.find(w => w.name === 'ckpt_name')
      if (ckptWidget) {
        const assetStore = useAssetStore()
        
        // Only override if asset API is available, otherwise use default behavior
        if (assetStore.isAssetApiAvailable) {
          // Store the original mouse down handler
          const originalMouseDown = ckptWidget.onMouseDown
          
          ckptWidget.onMouseDown = function(event) {
            // Show asset browser instead of dropdown
            const assetBrowserDialog = useAssetBrowserDialog()
            assetBrowserDialog.show({
              onSelect: (asset) => {
                // Update widget value with selected asset filename
                this.value = asset.filename || asset.name
                this.callback?.(this.value)
                
                // Mark the node as modified
                if (this.graph) {
                  this.graph.setDirtyCanvas(true)
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