export interface Asset {
  id: string
  name: string
  filename?: string
  preview_url?: string
  file_size?: number
  file_type?: string
  tags?: string[]
  created_at?: string
  updated_at?: string
}

export interface AssetBrowserDialogOptions {
  nodeType: string
  widgetName: string
  currentValue?: string
  onSelect: (asset: Asset) => void
  onClose?: () => void
}