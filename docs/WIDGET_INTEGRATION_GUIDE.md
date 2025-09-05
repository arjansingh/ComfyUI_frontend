# Widget Integration Guide: Universal Patterns + ComfyUI Implementation

## Overview

This guide documents universal patterns for integrating Vue components with LiteGraph widget systems, with concrete ComfyUI implementation examples. The content is organized in three progressive layers:

- **Part I: Universal Architecture** - Transferable principles that work across any Vue+LiteGraph project
- **Part II: ComfyUI Implementation** - Specific working examples and patterns for ComfyUI development  
- **Part III: Adaptation Guide** - How to apply universal principles to other Vue+LiteGraph projects

**Common Use Cases Across Projects:**
- Asset browsers with modal dialogs (models, textures, presets, files)
- Advanced text editors with syntax highlighting and autocomplete
- Interactive parameter controls with dropdowns and sliders
- File upload interfaces with drag-and-drop overlays  
- Multi-select components with search and filtering
- Color pickers, date selectors, and specialized input widgets

**Documentation Structure:** Universal principles are demonstrated through ComfyUI examples, then generalized for adaptation to other projects.

---

# Part I: Universal Architecture Principles

## Three-Layer Integration Architecture

The fundamental pattern for Vue+LiteGraph integration consists of three distinct layers with clear separation of concerns:

```
┌─────────────────────────────────────┐
│           Vue App Layer             │
│  - CustomWidget.vue                 │
│  - ModalDialog.vue                  │
│  - UI Framework Components          │
└─────────────────────────────────────┘
                  ↕
┌─────────────────────────────────────┐
│         Integration Layer           │
│  - useCustomWidget()                │
│  - ComponentWidgetImpl              │
│  - Widget Registry                  │
└─────────────────────────────────────┘
                  ↕
┌─────────────────────────────────────┐
│         LiteGraph Layer             │
│  - BaseWidget                       │
│  - Node Widget System               │
│  - Graph Canvas Events              │
└─────────────────────────────────────┘
```

**Why This Architecture Works:**

1. **Clear Separation**: Each layer has distinct responsibilities and interfaces
2. **Maintainable**: Changes in one layer don't cascade to others  
3. **Testable**: Each layer can be tested independently
4. **Flexible**: Vue components can use any presentation pattern (modal, inline, dropdown)
5. **Type Safe**: Well-defined interfaces between layers enable full TypeScript support

**Universal Principle**: The Integration Layer serves as a bridge between incompatible systems - Vue's reactive component model and LiteGraph's imperative widget system.

## Universal Communication Flow Pattern

The following sequence diagram shows the complete communication pattern for widget value updates. This pattern works regardless of presentation style (modal, inline, dropdown, overlay) or domain (assets, models, files, etc.):

```mermaid
sequenceDiagram
    participant U as User
    participant CW as CustomWidget<br/>(Vue Component)
    participant MD as ModalDialog<br/>(Vue Component)
    participant CWI as ComponentWidgetImpl<br/>(Integration Layer)
    participant BW as BaseWidget<br/>(LiteGraph)
    participant N as LGraphNode<br/>(LiteGraph)
    participant C as LGraphCanvas<br/>(LiteGraph)

    Note over U,C: Widget Creation Phase
    N->>+CWI: new ComponentWidgetImpl({ props, options })
    CWI->>CWI: Configure setValue with<br/>canvas context
    CWI->>+CW: Mount Vue component with props
    CW-->>-CWI: Component ready
    CWI-->>-N: Widget created and registered

    Note over U,C: User Interaction Phase
    U->>+CW: Click trigger button/area
    CW->>CW: showModal = true
    CW->>+MD: Modal/Interface opens with<br/>:on-select prop
    MD->>MD: Load and display options
    U->>MD: Select item/value
    MD->>MD: onSelect(item)
    MD->>-CW: Call props.onSelect(item)
    
    Note over U,C: Value Update Phase  
    CW->>+CW: onItemSelect(item)
    CW->>CW: selectedItem.value = item
    CW->>CW: newValue = transformItem(item)
    CW->>+CWI: props.widget.setValue(newValue)
    
    Note over CWI: Canvas Context Resolution
    CWI->>CWI: canvas = getCanvasFromApp()
    CWI->>CWI: syntheticEvent = new PointerEvent(...)
    CWI->>CWI: canvasEvent = Object.assign(...)
    
    CWI->>+BW: widget.setValue(newValue, {<br/>e: canvasEvent, node, canvas})
    BW->>BW: Update internal value
    BW->>BW: Call widget.callback()
    BW->>+N: node.onWidgetChanged()
    N->>N: Update node properties
    N-->>-BW: Node updated
    BW-->>-CWI: setValue complete
    CWI-->>-CW: Update successful
    
    Note over U,C: UI Update Phase
    CW->>CW: emit('update:modelValue')
    CW->>CW: showModal = false
    CW->>-MD: Modal/Interface closes
    
    Note over U,C: Final State
    Note over CW: Widget displays<br/>selected item
    Note over N: Node has new<br/>widget value
    Note over C: Graph version<br/>incremented
```

**Universal Communication Principles:**

1. **Props Flow Down**: ComponentWidgetImpl → Vue Component via `props`
2. **Events Flow Up**: Vue Component → ComponentWidgetImpl via configured `setValue`
3. **Canvas Context**: ComponentWidgetImpl manages LiteGraph integration requirements
4. **Value Updates**: BaseWidget handles the actual value change with proper context
5. **UI Reactivity**: Vue components update automatically via reactive getters

This pattern remains identical whether the Vue component presents a modal dialog, inline editor, dropdown selector, or any other interface style.

## Universal Widget Replacement Pattern

The core pattern for replacing standard LiteGraph widgets with Vue components follows a consistent structure across all projects:

### 1. Widget Composable Structure (Universal)

**✅ UNIVERSAL PATTERN:**
```typescript
export const useCustomWidget = (): WidgetConstructor => {
  const standardWidget = useStandardWidget()
  
  return (node: LGraphNode, inputSpec: InputSpec) => {
    // Eligibility check - configurable per project
    const shouldUseCustom = checkCustomWidgetEligibility(node, inputSpec)
    
    if (shouldUseCustom) {
      return createCustomWidget(node, inputSpec)
    }
    
    // Fallback to standard widget behavior
    return standardWidget(node, inputSpec)
  }
}

// Universal ComponentWidgetImpl creation pattern
function createCustomWidget(node: LGraphNode, inputSpec: InputSpec) {
  const widgetValue = ref<ValueType>(inputSpec.default || getDefaultValue())
  
  const widget = new ComponentWidgetImpl<ValueType>({
    node,
    name: inputSpec.name,
    component: YourCustomComponent,  // Your Vue component
    inputSpec,
    
    // OPTIONS: Internal widget behavior (for LiteGraph system)
    options: {
      getValue: () => widgetValue.value,
      setValue: (value: ValueType) => {
        widgetValue.value = processIncomingValue(value)
      }
    },
    
    // PROPS: Vue component properties (for Vue system)
    props: {
      widget: {
        get value() { return widgetValue.value },  // Reactive getter
        name: inputSpec.name,
        setValue: (newValue: ValueType) => {
          // Canvas context provided by app-specific provider
          const canvas = canvasProvider.getCanvas()
          const canvasEvent = canvasProvider.createSyntheticEvent()
          
          if (!canvas) {
            throw new Error('Canvas context required for setValue operation')
          }
          
          widget.setValue(newValue, { e: canvasEvent, node, canvas })
        }
      },
      // Additional component-specific props
      customProp1: yourValue1,
      customProp2: yourValue2
    }
  })
  
  addWidget(node, widget)
  return widget
}
```

### 2. Universal Widget Registry Pattern

Replace existing widget types in your project's widget registry:

```typescript
// Universal registry pattern
export const WidgetRegistry: Record<string, WidgetConstructor> = {
  // Replace existing widget types with enhanced versions
  COMBO: useCustomComboWidget(),
  STRING: useCustomStringWidget(), 
  NUMBER: useCustomNumberWidget(),
  // ... other widget types
}
```

**Why Replacement vs Addition Works:**
- **Automatic Usage**: Existing nodes automatically get enhanced widgets without code changes
- **Consistent Behavior**: Same node definition produces same widget type across all instances
- **Extension Compatibility**: Third-party nodes work without modification

---

# Part II: ComfyUI Implementation Reference

This section provides specific working examples using ComfyUI's architecture. These examples demonstrate how universal principles apply in practice.

## ComfyUI-Specific Implementation Patterns

### Asset Browser Widget Example

The following shows how universal patterns are applied to create ComfyUI's asset browser widget:

**ComfyUI useAssetComboWidget Implementation:**
```typescript
export const useAssetComboWidget = (): ComfyWidgetConstructorV2 => {
  const standardComboWidget = useComboWidget()
  
  return (node: LGraphNode, inputSpec: InputSpec) => {
    // ComfyUI-specific eligibility check
    const shouldUseAssetBrowser = checkAssetBrowserEligibility(node, inputSpec)
    
    if (shouldUseAssetBrowser) {
      return createAssetPickerWidget(node, inputSpec)
    }
    
    // Fallback to standard ComfyUI combo widget
    return standardComboWidget(node, inputSpec)
  }
}

// ComfyUI-specific widget creation
function createAssetPickerWidget(node: LGraphNode, inputSpec: ComboInputSpec) {
  const widgetValue = ref<string>(inputSpec.default || '')
  const widget = new ComponentWidgetImpl<string | object>({
    node,
    name: inputSpec.name,
    component: AssetPickerWidget,  // ComfyUI component
    inputSpec,
    options: {
      getValue: () => widgetValue.value,
      setValue: (value: string | object) => {
        const stringValue = typeof value === 'string' ? value : String(value)
        widgetValue.value = stringValue
      }
    },
    props: {
      widget: {
        get value() { return widgetValue.value },
        name: inputSpec.name,
        setValue: (newValue: string) => {
          // ComfyUI-specific canvas access
          const canvas = app.canvas
          const canvasEvent = createSyntheticPointerEvent()
          widget.setValue(newValue, { e: canvasEvent, node, canvas })
        }
      }
    }
  })
  
  addWidget(node, widget)
  return widget
}
```

**ComfyUI Widget Registry:**
```typescript
export const ComfyWidgets: Record<string, ComfyWidgetConstructor> = {
  // Replace COMBO with enhanced version for ComfyUI
  COMBO: transformWidgetConstructorV2ToV1(useAssetComboWidget()),
  // ... other ComfyUI widgets
}
```

## ComfyUI-Specific Anti-Patterns

**❌ BROKEN APPROACHES IN COMFYUI:**
- Direct DOM manipulation instead of ComponentWidgetImpl
- Modifying existing widgets in-place
- Intercepting at the UI level instead of widget system level

**Why These Approaches Fail in ComfyUI:**

- **Direct DOM Manipulation**: Bypasses Vue's reactivity system and component lifecycle, leading to memory leaks, broken event handling, and state inconsistencies when the graph updates
- **In-Place Widget Modification**: LiteGraph widgets have complex initialization and cleanup procedures - modifying them after creation breaks their internal state management and event binding
- **UI-Level Interception**: Intercepting at the visual layer (like sidebar component) misses the fundamental widget replacement requirement - the graph canvas still creates standard widgets that conflict with the custom UI

## ComfyUI Canvas Access Patterns

### ComfyUI-Specific Canvas Context

ComfyUI uses a centralized app instance for canvas access:

```typescript
import { app } from '@/scripts/app'

// ComfyUI canvas access
function getCanvasFromApp(): LGraphCanvas {
  const canvas = app.canvas
  
  if (!canvas) {
    throw new Error('Canvas is required for setValue operation')
  }
  
  return canvas
}

// ComfyUI synthetic event creation
function createSyntheticPointerEvent(): CanvasPointerEvent {
  const syntheticPointerEvent = new PointerEvent('pointerdown', {
    bubbles: false,
    cancelable: false,
    pointerId: -1,
    pointerType: 'mouse'
  })
  
  return Object.assign(syntheticPointerEvent, {
    canvasX: 0,
    canvasY: 0,
    deltaX: 0,
    deltaY: 0,
    safeOffsetX: 0,
    safeOffsetY: 0
  }) as CanvasPointerEvent
}
```

## ComfyUI Vue Component Examples

### Modal Asset Browser Pattern

**ComfyUI AssetPickerWidget.vue:**
```vue
<template>
  <div class="asset-picker-widget">
    <!-- Widget display -->
    <div class="selected-asset-display">
      <span class="asset-name">{{ displayName }}</span>
      <Button @click="openAssetBrowser" />
    </div>
    
    <!-- ComfyUI uses PrimeVue Dialog -->
    <Dialog 
      v-model:visible="showModal"
      :modal="true"
      :style="{ width: '80vw', height: '80vh' }"
    >
      <AssetBrowserDialog 
        :onClose="closeAssetBrowser"
        :onSelect="onAssetSelect"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
// ComfyUI-specific widget props interface
interface AssetPickerWidgetProps {
  widget: {
    value: string
    name: string
    setValue: (newValue: string) => void
  }
  nodeType?: string
  widgetName?: string
}

const props = withDefaults(defineProps<AssetPickerWidgetProps>(), {
  nodeType: '',
  widgetName: ''
})

const showModal = ref(false)
const selectedAsset = ref<Asset | null>(null)

const displayName = computed(() => {
  return selectedAsset.value?.name || props.widget.value || 'None'
})

const onAssetSelect = (asset: Asset) => {
  selectedAsset.value = asset
  const newValue = asset.filename || asset.name
  props.widget.setValue(newValue)  // Uses ComfyUI canvas context
  showModal.value = false
}
</script>
```

**Example: Modal Dialog Presentation Pattern**

This demonstrates one common presentation approach - other patterns (inline editors, dropdowns, overlays) follow the same communication principles with different UI presentation.

**✅ WORKING MODAL PATTERN:**
```vue
<template>
  <div class="asset-picker-widget">
    <!-- Widget display -->
    <div class="selected-asset-display">
      <span class="asset-name">{{ displayName }}</span>
      <Button @click="openAssetBrowser" />
    </div>
    
    <!-- Modal wrapper - CRITICAL: Use PrimeVue Dialog -->
    <Dialog 
      v-model:visible="showModal"
      :modal="true"
      :style="{ width: '80vw', height: '80vh' }"
    >
      <AssetBrowserDialog 
        :onClose="closeAssetBrowser"
        :onSelect="onAssetSelect"
      />
    </Dialog>
  </div>
</template>
```

---

# Part III: Adaptation Guide for Other Projects

This section shows how to adapt the universal principles and ComfyUI patterns to other Vue+LiteGraph projects.

## Universal Presentation Patterns

The ComponentWidgetImpl communication pattern works with any Vue component presentation approach. Here are adaptable patterns:

### Modal Dialog Pattern (Universal)

```vue
<template>
  <div class="custom-widget">
    <div class="widget-display">
      <span class="current-value">{{ displayValue }}</span>
      <Button @click="openModal" label="Browse..." />
    </div>
    
    <!-- Use your UI framework's dialog component -->
    <Dialog 
      v-model:visible="showModal"
      :modal="true"
      :style="{ width: '80vw', height: '80vh' }"
    >
      <BrowserComponent 
        :items="availableItems"
        :on-close="closeModal"
        :on-select="onItemSelect"
      />
    </Dialog>
  </div>
</template>
```

**🎯 Inline Editor Pattern:**
```vue
<template>
  <div class="inline-text-editor">
    <textarea 
      v-model="localValue" 
      @blur="updateWidgetValue"
      class="syntax-highlighted-editor"
    />
    <!-- Inline syntax highlighting, autocomplete, etc. -->
  </div>
</template>
```

**🎯 Dropdown Selector Pattern:**  
```vue
<template>
  <div class="dropdown-widget">
    <Button @click="showDropdown = !showDropdown">{{ displayValue }}</Button>
    <div v-if="showDropdown" class="dropdown-panel">
      <!-- Custom dropdown content with search, filtering, etc. -->
    </div>
  </div>
</template>
```

**🎯 Overlay Pattern:**
```vue
<template>
  <div class="overlay-widget">
    <input @focus="showOverlay = true" readonly :value="displayValue" />
    <Teleport to="body">
      <div v-if="showOverlay" class="custom-overlay">
        <!-- Color picker, file browser, etc. -->
      </div>
    </Teleport>
  </div>
</template>
```

**Common Pattern Elements:**
- **ComponentWidgetImpl structure remains identical** regardless of presentation
- **setValue communication** follows the same canvas context pattern
- **Props interface** stays consistent (widget.value, widget.setValue, etc.)
- **Only the Vue template and styling change** - the integration layer is universal

## ComponentWidgetImpl Structure Patterns

### ⚠️ CRITICAL: Props vs Options Distinction

The ComponentWidgetImpl uses two separate parameter objects: `options` for internal widget behavior and `props` for Vue component properties.

**Why This Separation Exists:**

ComponentWidgetImpl bridges two different systems that have different data requirements:

1. **DOM Widget System** (uses `options`): The underlying DOM widget infrastructure expects getValue/setValue functions for managing widget state within the LiteGraph system
2. **Vue Component System** (uses `props`): Vue components expect reactive data props that can trigger re-renders when values change

**Why Mixing Them Fails:**
If you put Vue component props in the `options` object, the DOM widget system tries to interpret them as widget configuration, leading to type errors and failed widget initialization. If you put DOM widget functions in `props`, Vue components receive non-reactive function references instead of the data they need for rendering.

**✅ WORKING: Proper ComponentWidgetImpl Structure**
```typescript
function createAssetPickerWidget(node: LGraphNode, inputSpec: ComboInputSpec) {
  const widgetValue = ref<string>(inputSpec.default || '')
  
  const widget = new ComponentWidgetImpl<string | object>({
    node,
    name: inputSpec.name,
    component: AssetPickerWidget,
    inputSpec,
    // OPTIONS: Internal widget behavior (for DOM widget system)
    options: {
      getValue: () => widgetValue.value,
      setValue: (value: string | object) => {
        const stringValue = typeof value === 'string' ? value : String(value)
        widgetValue.value = stringValue
        console.log('🔧 Widget value updated to:', stringValue)
      }
    },
    // PROPS: Passed to Vue component (this is what your Vue component receives)
    props: {
      widget: {
        // ✅ CRITICAL: Use getter for reactivity in Vue component
        get value() { return widgetValue.value },
        name: inputSpec.name,
        setValue: (newValue: string) => {
          // Get canvas from the ComfyUI app instance - this is the proper way
          // to access the canvas for widget setValue operations
          const canvas = app.canvas
          
          if (!canvas) {
            console.error('Canvas not found on app instance')
            throw new Error('Canvas is required for setValue operation')
          }

          // Create synthetic CanvasPointerEvent
          const syntheticPointerEvent = new PointerEvent('pointerdown', {
            bubbles: false,
            cancelable: false,
            pointerId: -1,
            pointerType: 'mouse'
          })
          
          const canvasEvent = Object.assign(syntheticPointerEvent, {
            canvasX: 0,
            canvasY: 0,
            deltaX: 0,
            deltaY: 0,
            safeOffsetX: 0,
            safeOffsetY: 0
          })
          
          // Call inherited setValue with proper WidgetEventOptions context
          widget.setValue(newValue, {
            e: canvasEvent,
            node: node,
            canvas: canvas
          })
        }
      },
      nodeType: node.type || 'unknown',
      widgetName: inputSpec.name
    }
  })
  
  addWidget(node, widget)
  return widget
}
```

**❌ BROKEN: Mixing Props and Options**
```typescript
// DON'T put Vue component props in options
options: {
  getValue: () => widgetValue.value,
  widget: { /* This belongs in props! */ }
}
```

**Why This Fails:**
The `options` object is consumed by the DOM widget infrastructure, which expects specific function signatures for getValue/setValue. When you put Vue component props in `options`, the DOM widget system tries to interpret them as widget configuration functions, causing type mismatches and initialization failures.

**❌ BROKEN: Static Value in Props**
```typescript
props: {
  widget: {
    value: widgetValue.value,  // Snapshot - never updates!
    name: inputSpec.name
  }
}
```

**Why This Fails:**
`widgetValue.value` is evaluated once at ComponentWidgetImpl creation time, creating a static snapshot. When the underlying `widgetValue` ref changes, the Vue component never sees the updates because it only received the initial value, not a reactive reference to the current value. This breaks the reactive data flow that Vue components depend on for re-rendering.

## Communication Patterns

### Vue → LiteGraph (Widget Value Updates)

**✅ WORKING: Proper setValue with Canvas Context**
```typescript
const onAssetSelect = (asset: Asset) => {
  console.log('🎯 Asset selected in picker widget:', asset.name)
  selectedAsset.value = asset
  
  // Use the setValue method provided in props (this has proper canvas context)
  const newValue = asset.filename || asset.name
  console.log('🔧 Setting widget value to:', newValue)
  
  props.widget.setValue(newValue)
  console.log('✅ Widget value set via setValue with canvas context')
  
  // Emit update for Vue reactivity
  emit('update:modelValue', newValue)
  
  console.log('🔄 Modal should close now via onClose callback')
}
```

**✅ WORKING: Vue Component Props Interface**
```typescript
export interface AssetPickerWidgetProps {
  widget: {
    value: string                          // Current widget value (reactive)
    name: string                          // Widget name
    setValue: (newValue: string) => void  // Properly configured setValue function
  }
  nodeType?: string
  widgetName?: string
}
```

**❌ BROKEN: Calling setValue Without Proper Canvas Context**
```typescript
// This fails because setValue needs WidgetEventOptions
widget.setValue(newValue, {
  e: undefined,     // ❌ Invalid - needs proper CanvasPointerEvent  
  node: undefined,  // ❌ Invalid - needs actual LGraphNode
  canvas: undefined // ❌ Invalid - needs actual LGraphCanvas
})
```

**Why This Fails:**
BaseWidget.setValue immediately destructures the WidgetEventOptions parameter (`{ e, node, canvas }`) and then:

1. **Accesses Event Properties**: Tries to read `e.canvasX`, `e.deltaX`, etc. - if `e` is undefined, this throws "Cannot read properties of undefined"
2. **Calls Canvas Methods**: Invokes `canvas.graph_mouse` and other canvas methods - if `canvas` is undefined, this throws TypeError  
3. **Updates Node State**: Uses `node.setProperty()` and `node.onWidgetChanged()` - if `node` is undefined, these calls fail
4. **Graph Version Updates**: Accesses `node.graph._version` for change tracking - requires valid node and graph references

**Why Our setValue Works:**

Our approach succeeds because we provide all required context:

- **Canvas Context**: Obtained via `globalThis.app?.canvas` - the reliable ComfyUI architecture path
- **Complete Event**: Synthetic CanvasPointerEvent with all properties that LiteGraph expects (canvasX, deltaX, safeOffsetX, etc.)
- **Node Reference**: Actual LGraphNode passed from widget creation context
- **Proper Integration**: Uses the LiteGraph widget system's expected data flow instead of bypassing it

### LiteGraph → Vue (Props Flow)

**✅ WORKING: Reactive Props via ComponentWidgetImpl**
```typescript
// In ComponentWidgetImpl props (what Vue component receives)
props: {
  widget: {
    // ✅ Reactive getter - updates when widgetValue.value changes
    get value() { return widgetValue.value },
    name: inputSpec.name,
    setValue: (newValue: string) => {
      // Properly configured with canvas context
    }
  },
  nodeType: node.type || 'unknown',
  widgetName: inputSpec.name
}

// Vue component receives these props automatically
const props = withDefaults(defineProps<AssetPickerWidgetProps>(), {
  nodeType: '',
  widgetName: ''
})
```

**Why Reactive Getters Work:**

The `get value()` pattern creates a reactive property that:

1. **Reactive Updates**: Each time the Vue component accesses `props.widget.value`, it re-executes the getter function, reading the current `widgetValue.value`
2. **Dependency Tracking**: Vue's reactivity system automatically tracks that this component depends on `widgetValue`, so when `widgetValue` changes, the component re-renders
3. **Fresh Data**: Unlike static assignment (`value: widgetValue.value`), the getter always returns the current state, not a stale snapshot
4. **Performance**: Getters are only called when the property is accessed, avoiding unnecessary computation during widget initialization

### Component Communication Flow

This pattern works regardless of presentation style (modal, dropdown, inline, etc.).

**✅ WORKING: Prop chain pattern**
```
User clicks asset → AssetBrowserDialog.onSelect() 
     ↓ calls prop
AssetPickerWidget.onAssetSelect() 
     ↓ calls 
props.widget.setValue(newValue)
     ↓ triggers
BaseWidget.setValue() with proper canvas context
     ↓ updates
Node value + triggers callbacks + modal closes
```

**✅ WORKING: Prop-based modal communication**
```vue
<AssetBrowserDialog 
  :on-close="closeAssetBrowser"
  :on-select="onAssetSelect"  
/>
<!-- ✅ Using :on-select prop, not @select event -->
```

**❌ BROKEN: Event-based communication**
```vue
<!-- This doesn't work - prop vs event mismatch -->
<AssetBrowserDialog @select="onAssetSelect" />
```

**Why This Fails:**
AssetBrowserDialog is designed to receive callback functions as props (`:on-select`), not to emit Vue events (`@select`). When you use `@select`, Vue tries to listen for a custom event that AssetBrowserDialog never emits, so the communication chain breaks and asset selection never reaches the widget setValue.

## Eligibility Detection

**✅ WORKING: Widget name pattern matching**
```typescript
function checkAssetBrowserEligibility(node: LGraphNode, inputSpec: ComboInputSpec): boolean {
  // Focus on widget patterns rather than node types
  if (!isModelSelectionWidget(inputSpec)) {
    return false
  }
  
  // Optional: node type check as secondary filter
  if (node.type && node.type !== 'CheckpointLoaderSimple') {
    return false
  }
  
  return true
}

function isModelSelectionWidget(inputSpec: ComboInputSpec): boolean {
  const modelWidgetNames = ['ckpt_name', 'model_name', 'checkpoint']
  return modelWidgetNames.some(pattern => 
    inputSpec.name.toLowerCase().includes(pattern)
  )
}
```

**❌ BROKEN: Store-dependent eligibility**
```typescript
// This can cause initialization issues
const shouldUse = assetStore.isAssetApiAvailable.value
```

**Why This Fails:**
Widget creation happens during node initialization, which occurs early in the application lifecycle. At this time:

1. **Store Dependencies**: Pinia stores may not be fully initialized or may have async initialization logic still running
2. **API State**: Store values like `isAssetApiAvailable` depend on async API calls that may not have completed
3. **Inconsistent Behavior**: The same node type might get different widget types depending on timing, breaking user expectations
4. **Debugging Complexity**: Store-dependent eligibility creates hard-to-reproduce bugs where widget behavior varies based on load timing

**Why Pattern-Based Eligibility Works:**
Widget name patterns (`ckpt_name`, `model_name`) are static properties of the node definition that are always available during widget creation, making eligibility detection reliable and predictable.

## Common Errors & Solutions

### 1. "Cannot destructure property 'e' of 'undefined'" / "Cannot read properties of undefined (reading 'graph_mouse')"
**Cause:** Calling setValue without proper WidgetEventOptions context  
**Root Issue:** BaseWidget.setValue expects complete WidgetEventOptions with valid canvas context  
**✅ Solution:** Configure setValue properly in ComponentWidgetImpl props:
```typescript
props: {
  widget: {
    setValue: (newValue: string) => {
      // Get canvas from global ComfyUI app instance
      const globalApp = globalThis as { app?: { canvas?: LGraphCanvas } }
      const canvas = globalApp.app?.canvas
      
      if (!canvas) {
        throw new Error('Canvas is required for setValue operation')
      }

      // Create synthetic CanvasPointerEvent
      const syntheticPointerEvent = new PointerEvent('pointerdown', {
        bubbles: false, cancelable: false, pointerId: -1, pointerType: 'mouse'
      })
      
      const canvasEvent = Object.assign(syntheticPointerEvent, {
        canvasX: 0, canvasY: 0, deltaX: 0, deltaY: 0, safeOffsetX: 0, safeOffsetY: 0
      })
      
      // Call with proper WidgetEventOptions
      widget.setValue(newValue, { e: canvasEvent, node: node, canvas: canvas })
    }
  }
}
```

### 2. **Widget value doesn't update reactively in UI**
**Cause:** Using static value assignment in ComponentWidgetImpl props: `value: widgetValue.value`  
**Root Issue:** Creates snapshot at creation time, never updates when underlying ref changes  
**✅ Solution:** Use getter pattern in props:
```typescript
props: {
  widget: {
    get value() { return widgetValue.value },  // ✅ Reactive
    name: inputSpec.name
  }
}
```

### 3. **TypeScript errors: "Property 'canvas' does not exist on type 'LGraph'"**  
**Cause:** Trying to access `node.graph?.canvas` which doesn't exist on LGraph type  
**Root Issue:** Canvas is not a direct property of LGraph  
**✅ Solution:** Use global app access:
```typescript
const globalApp = globalThis as { app?: { canvas?: LGraphCanvas } }
const canvas = globalApp.app?.canvas
```

### 4. **Modal shows as small popup instead of full screen**
**Cause:** Missing PrimeVue Dialog wrapper component
**✅ Solution:** Wrap content in `<Dialog>` with proper sizing:
```vue
<Dialog 
  v-model:visible="showModal"
  :modal="true"
  :style="{ width: '80vw', height: '80vh' }"
>
  <YourBrowserComponent />
</Dialog>
```

### 5. **Modal doesn't close on selection**
**Cause:** Prop vs event communication mismatch
**✅ Solution:** Use `:on-select` prop instead of `@select` event:
```vue
<AssetBrowserDialog 
  :on-close="closeModal"
  :on-select="onSelect"  
/>
```

### 6. **ESLint/TypeScript violations: "NEVER use 'as any' type assertions"**
**Cause:** Using `as any` to bypass type checking (violates CLAUDE.md guidelines)  
**Root Issue:** Improper typing approaches  
**✅ Solution:** Use proper typing strategies:
```typescript
// ❌ Wrong
const canvas = (globalThis as any).app.canvas

// ✅ Correct  
const globalApp = globalThis as { app?: { canvas?: LGraphCanvas } }
const canvas = globalApp.app?.canvas
```

### 7. **ComponentWidgetImpl structure confusion**
**Cause:** Mixing `options` and `props` parameters  
**Root Issue:** Not understanding the two-parameter structure  
**✅ Solution:** Use proper parameter separation:
```typescript
new ComponentWidgetImpl({
  // ... basic params
  options: {        // Internal widget behavior
    getValue: () => widgetValue.value,
    setValue: (v) => widgetValue.value = v
  },
  props: {          // What Vue component receives
    widget: { /* props for Vue */ }
  }
})
```

## Testing Strategy

### **⚠️ CRITICAL: Complete Flow Testing**

Always test the **ENTIRE user flow** - widget creation through final value persistence. Partial testing misses critical integration issues.

**✅ Complete Testing Sequence:**
1. **Widget Creation**: `window.LiteGraph.createNode('CheckpointLoaderSimple')`
2. **Widget Replacement Verification**: Check console for widget replacement logs
3. **Modal Opening**: Click browse button, verify 80vw x 80vh modal opens
4. **Asset Selection**: Click asset, verify no console errors
5. **Value Updates**: Confirm widget value updates to selected asset
6. **Modal Closing**: Verify modal automatically closes after selection
7. **Reactivity**: Confirm UI displays updated asset name

**Essential Console Log Pattern (Complete Success Flow):**
```
✅ Complete success flow from our working implementation:
🔧 useAssetComboWidget called for: {nodeType: CheckpointLoaderSimple, inputName: ckpt_name, inputType: COMBO}
✅ Eligible for asset browser enhancement for: ckpt_name  
🎯 Creating AssetPickerWidget for: CheckpointLoaderSimple ckpt_name
🎯 Opening asset browser for widget: ckpt_name
🎯 Asset selected in picker widget: Realistic Vision V5.1
🔧 AssetPickerWidget setValue called with: realisticVisionV51_v51VAE.safetensors
✅ Widget setValue called with proper context
✅ Widget value set via setValue with canvas context
🎯 closeAssetBrowser called for widget: ckpt_name
✅ Modal should be closed now, showModal.value = false

❌ Critical error indicators (should NOT appear):
- Cannot destructure property 'e' of 'undefined'
- Canvas is required for setValue operation (without proper context)
- TypeError: Cannot read properties of undefined (reading 'graph_mouse')
- Modal remains open after asset selection
- Widget value doesn't update in UI after selection
- ESLint errors about 'as any' type assertions

🎯 Key success indicators:
- "Widget setValue called with proper context" ✅
- "Widget value set via setValue with canvas context" ✅  
- Modal closes automatically after selection ✅
- No TypeScript or ESLint errors ✅
```

### **Debug Strategy**
When issues occur, add comprehensive console logs:

```typescript
// In onAssetSelect
console.log('🎯 Asset selected:', asset.name)
console.log('🔧 Setting widget value to:', newValue)
console.log('✅ Widget value set via direct assignment')
console.log('🔄 Modal should close now via onClose callback')

// In closeAssetBrowser  
console.log('🎯 closeAssetBrowser called')
console.log('✅ Modal should be closed now, showModal.value =', showModal.value)
```

## Key Files Reference

- `/src/composables/widgets/useAssetComboWidget.ts` - Widget replacement logic
- `/src/scripts/widgets.ts` - Widget registry
- `/src/components/graph/widgets/AssetPickerWidget.vue` - Vue widget component
- `/src/scripts/domWidget.ts` - ComponentWidgetImpl implementation
- `/src/lib/litegraph/src/widgets/BaseWidget.ts` - Base widget setValue behavior

## Critical Success Patterns Summary

### **🎯 The Golden Rules**

1. **ALWAYS use ComponentWidgetImpl with proper props/options structure** - separates Vue props from widget behavior
2. **ALWAYS configure setValue in props with proper canvas context** - enables proper LiteGraph integration  
3. **ALWAYS use getter pattern for reactive values** - `get value() { return widgetValue.value }`
4. **ALWAYS test the complete user flow** - partial testing misses integration issues
5. **NEVER use `as any` type assertions** - follow TypeScript compliance patterns

### **🔧 Essential Code Patterns**

**Widget Creation (ComponentWidgetImpl Structure):**
```typescript
const widget = new ComponentWidgetImpl<string | object>({
  node, name: inputSpec.name, component: YourComponent, inputSpec,
  options: {                    // Internal widget behavior
    getValue: () => widgetValue.value,
    setValue: (value: string | object) => {
      const stringValue = typeof value === 'string' ? value : String(value)
      widgetValue.value = stringValue
    }
  },
  props: {                      // Vue component props
    widget: {
      get value() { return widgetValue.value },  // Reactive getter
      name: inputSpec.name,
      setValue: (newValue: string) => {
        // Proper setValue with canvas context (see Canvas Access Patterns)
        const canvas = getCanvasFromApp()
        const canvasEvent = createSyntheticPointerEvent()
        widget.setValue(newValue, { e: canvasEvent, node, canvas })
      }
    }
  }
})
```

**Value Updates (Proper setValue Call):**
```typescript
// In Vue component - use the configured setValue
props.widget.setValue(newValue)  // ✅ Has proper canvas context
```

**Modal Integration (PrimeVue Dialog):**
```vue
<Dialog v-model:visible="showModal" :style="{ width: '80vw', height: '80vh' }">
  <YourBrowserComponent :on-close="closeModal" :on-select="onSelect" />
</Dialog>
```

## Canvas Access Patterns

### **🎯 CRITICAL: Accessing Canvas Context for setValue**

The most common failure point in widget integration is accessing canvas context. The setValue method requires proper canvas context through WidgetEventOptions.

**✅ WORKING: ComfyUI App Canvas Access**
```typescript
import { app } from '@/scripts/app'

function getCanvasFromApp(): LGraphCanvas {
  const canvas = app.canvas
  
  if (!canvas) {
    throw new Error('Canvas is required for setValue operation')
  }
  
  return canvas
}
```

**✅ WORKING: Synthetic CanvasPointerEvent Creation**
```typescript
function createSyntheticPointerEvent(): CanvasPointerEvent {
  // Create base PointerEvent
  const syntheticPointerEvent = new PointerEvent('pointerdown', {
    bubbles: false,
    cancelable: false,
    pointerId: -1,
    pointerType: 'mouse'
  })
  
  // Add required canvas properties
  const canvasEvent = Object.assign(syntheticPointerEvent, {
    canvasX: 0,      // X coordinate in graph space
    canvasY: 0,      // Y coordinate in graph space  
    deltaX: 0,       // Delta movement X
    deltaY: 0,       // Delta movement Y
    safeOffsetX: 0,  // Firefox workaround offset X
    safeOffsetY: 0   // Firefox workaround offset Y
  })
  
  return canvasEvent as CanvasPointerEvent
}
```

**Why Synthetic Events Are Necessary:**

The BaseWidget.setValue method in LiteGraph expects a complete WidgetEventOptions object with three required properties: `e` (CanvasPointerEvent), `node` (LGraphNode), and `canvas` (LGraphCanvas). This requirement exists because:

1. **Real User Events**: When users interact with widgets directly (clicking, dragging), LiteGraph automatically provides real PointerEvents that get extended with canvas-specific properties
2. **Programmatic Calls**: When Vue components call setValue programmatically (like asset selection), there is no real user event - we're triggering the setValue from code
3. **Required Event Properties**: BaseWidget.setValue attempts to destructure the event object (`{ e, node, canvas }`) and access properties like `e.canvasX` and calls methods like `canvas.graph_mouse` - if any of these are undefined, setValue fails

**Why These Specific Properties Are Required:**

- `canvasX/canvasY`: Graph-space coordinates used by LiteGraph for positioning and hit detection
- `deltaX/deltaY`: Movement deltas used for drag operations and gesture recognition  
- `safeOffsetX/safeOffsetY`: Firefox-specific workarounds for browser offset calculation bugs
- All properties must be numbers (not undefined) because BaseWidget and canvas methods perform calculations with them

**Why Object.assign Works:**
Object.assign creates a proper CanvasPointerEvent by extending the base PointerEvent with canvas-specific properties, maintaining the event's prototype chain while adding the required fields that LiteGraph expects.
```

**✅ WORKING: Complete setValue Implementation**
```typescript
// In ComponentWidgetImpl props
setValue: (newValue: string) => {
  const canvas = getCanvasFromApp()
  const canvasEvent = createSyntheticPointerEvent()
  
  // Call BaseWidget.setValue with proper WidgetEventOptions
  widget.setValue(newValue, {
    e: canvasEvent,
    node: node,
    canvas: canvas
  })
}
```

**❌ BROKEN: Failed Canvas Access Attempts**
```typescript
// These paths don't work:
const canvas = node.graph?.canvas           // ❌ Property doesn't exist on LGraph
const canvas = node.graph.list_of_graphcanvas?.[0]  // ❌ Unreliable
const canvas = someStore.getCanvas()        // ❌ Store dependency issues
const globalApp = globalThis as { app?: { canvas?: LGraphCanvas } }  // ❌ Unnecessarily complex global access
const canvas = globalApp.app?.canvas        // ❌ When proper import is available
```

### **Why Direct App Import Access Works:**

**ComfyUI Architecture Context:**
ComfyUI follows a centralized application pattern where the `app` object serves as the main application controller. Direct import access is preferred because:

1. **Single Canvas Pattern**: ComfyUI typically runs with one primary graph canvas that handles all node interactions
2. **Module-Based Architecture**: The app object is properly exported from `@/scripts/app` for clean module dependencies
3. **Type Safety**: Direct imports provide full TypeScript typing without complex type assertions
4. **Lifecycle Reliability**: The app instance is initialized early and persists throughout the application lifecycle

**Why Alternative Approaches Fail:**

- `node.graph?.canvas`: **Fails because LGraph type doesn't have a canvas property** - the graph object represents the node connection data, not the visual canvas that renders it
- `node.graph.list_of_graphcanvas?.[0]`: **Unreliable because this is an internal LiteGraph array** that may be empty, have multiple canvases, or change unexpectedly during graph operations
- `someStore.getCanvas()`: **Creates circular dependencies and initialization order issues** - stores may not be initialized when widgets are created, and store-based canvas access can fail during early widget creation phases

**Why Direct Import Access Works:**
This approach succeeds because it directly accesses ComfyUI's exported app instance with full type safety and module dependencies, guaranteed to be available when widget setValue operations occur.

## TypeScript Compliance Patterns

### **🚨 CRITICAL: Avoiding `as any` Type Assertions**

Following CLAUDE.md guidelines, we must avoid `as any` type assertions while maintaining proper typing.

**✅ WORKING: Proper Import Typing**
```typescript
// Import the app instance directly with full typing
import { app } from '@/scripts/app'
const canvas = app.canvas
```

**✅ WORKING: Safe Type Assertion (Object Extension)**
```typescript
// For PointerEvent extension - this is safe because we're adding the properties
const syntheticEvent = new PointerEvent('pointerdown', { /* ... */ })
const canvasEvent = Object.assign(syntheticEvent, {
  canvasX: 0, canvasY: 0, deltaX: 0, deltaY: 0,
  safeOffsetX: 0, safeOffsetY: 0
}) as CanvasPointerEvent  // Safe - we're adding the required properties

// Acceptable type assertion pattern: Object.assign + type assertion
// This works because we control what properties we're adding
```

**When Type Assertions Are Acceptable:**
- **Object Extension**: When using `Object.assign` to add known properties to an object
- **Library Interface Compliance**: When you need to match an exact interface requirement
- **Property Addition**: When you're adding properties that TypeScript can't infer automatically

**When Type Assertions Violate CLAUDE.md Rules:**
- **`as any`**: Always forbidden - bypasses all type checking
- **Assumption-based**: `err as Error` assumes `err` is an Error without verification
- **Shortcut casting**: `{} as SomeType` creates objects with missing properties
- **Unknown objects**: Casting objects you didn't create or control

**❌ BROKEN: Type Assertion Violations**
```typescript
const app = (globalThis as any).app        // ❌ Violates CLAUDE.md rules
const canvas = app.canvas                  // ❌ No type safety
const event = {} as CanvasPointerEvent     // ❌ Empty object cast
// Even this complex global access is unnecessary when proper imports exist:
const globalApp = globalThis as { app?: { canvas?: LGraphCanvas } }  // ❌ Overly complex
```

**Why `as any` Assertions Fail in This Codebase:**

The CLAUDE.md guidelines prohibit `as any` assertions because they:

1. **Break Type Safety**: Disable TypeScript's ability to catch type errors at compile time, leading to runtime failures
2. **Cause Runtime Errors**: Properties and methods accessed through `as any` may not exist, causing "Cannot read properties of undefined" errors
3. **Break IDE Support**: IntelliSense, autocomplete, and refactoring tools can't work with `any` types
4. **Hide Integration Issues**: Type errors often indicate real architectural problems that need proper solutions, not type casting workarounds

**Why Structured Type Assertions Work:**

Our structured approach succeeds because:

- **Preserves Type Information**: TypeScript can still validate the expected structure
- **Enables Safe Access**: Optional chaining (`app?.canvas`) handles cases where properties don't exist  
- **Maintains IDE Support**: Full autocomplete and type checking for accessed properties
- **Self-Documenting**: The type assertion clearly shows what structure we expect

### **Proper Error Handling Patterns**

**✅ WORKING: Type-Safe Error Handling**
```typescript
try {
  // Some operation that might fail
  await someAsyncOperation()
} catch (err) {
  // Proper type guard instead of 'as Error'
  const error = err instanceof Error ? err : new Error(String(err))
  console.error('Operation failed:', error.message)
  throw error
}
```

**❌ BROKEN: Type Assertion Error Handling**
```typescript
try {
  await someAsyncOperation()
} catch (err) {
  const error = err as Error  // ❌ Violates CLAUDE.md rules
  console.error('Operation failed:', error.message)
}
```

**Why Type Guards Work Better:**
- `instanceof Error` provides runtime type checking that actually validates the object
- `String(err)` safely converts any value to a string without assuming type structure
- Maintains type safety while handling edge cases where thrown values aren't Error instances

### **Union Type Handling Patterns**

Widget systems often need to handle multiple value types. Here are proper patterns for union type handling:

**✅ WORKING: Type Narrowing with typeof**
```typescript
// ComponentWidgetImpl options setValue with union types
setValue: (value: string | object) => {
  const stringValue = typeof value === 'string' ? value : String(value)
  widgetValue.value = stringValue
}

// More complex union type handling
function processWidgetValue(value: string | number | boolean): string {
  if (typeof value === 'string') {
    return value.trim()
  } else if (typeof value === 'number') {
    return value.toString()
  } else if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  
  // Exhaustive check - TypeScript will error if we miss a case
  const _exhaustive: never = value
  return String(value)
}
```

**✅ WORKING: Type Guards for Complex Objects**
```typescript
// Type guard functions for widget value validation
function isAssetObject(value: unknown): value is { filename: string; name: string } {
  return typeof value === 'object' && 
         value !== null && 
         'filename' in value && 
         'name' in value &&
         typeof (value as { filename: unknown }).filename === 'string'
}

// Usage in widget setValue
setValue: (value: string | object) => {
  let finalValue: string
  
  if (typeof value === 'string') {
    finalValue = value
  } else if (isAssetObject(value)) {
    finalValue = value.filename
  } else {
    finalValue = String(value)
  }
  
  widgetValue.value = finalValue
}
```

**❌ BROKEN: Unsafe Union Handling**
```typescript
// Don't assume types without checking
setValue: (value: string | object) => {
  const stringValue = (value as any).filename || value  // ❌ Unsafe assumption
  widgetValue.value = stringValue
}

// Don't cast to bypass union types  
setValue: (value: string | object) => {
  widgetValue.value = value as string  // ❌ May fail if value is object
}
```

### **Essential Type Imports for Widget Development**
```typescript
// Core app instance for canvas access
import { app } from '@/scripts/app'

// LiteGraph types
import type { LGraphNode } from '@/lib/litegraph/src/litegraph'
import type { CanvasPointerEvent } from '@/lib/litegraph/src/types/events'

// Widget system components  
import { ComponentWidgetImpl, addWidget } from '@/scripts/domWidget'
import type { ComfyWidgetConstructorV2 } from '@/scripts/widgets'

// Input specification types
import { 
  ComboInputSpec, 
  type InputSpec, 
  isComboInputSpec 
} from '@/schemas/nodeDef/nodeDefSchemaV2'

// Vue composition
import { ref, computed } from 'vue'
```

## Best Practices

1. **Always use ComponentWidgetImpl** for Vue component integration
2. **Replace existing widget types** rather than creating new ones  
3. **Use getter/setter pattern** for reactive widget values that support assignment
4. **Direct widget.value assignment** for programmatic updates (with lint suppression)
5. **Prop-based communication** between components, not events
6. **Pattern-based eligibility** rather than store-dependent logic
7. **Comprehensive console logging** for debugging complete widget lifecycle
8. **Test complete user flows** from node creation through final value persistence
9. **Use PrimeVue Dialog** for modal overlays with proper 80vw x 80vh sizing

### **🚨 Avoid These Anti-Patterns**
- ❌ Static value snapshots: `value: widgetValue.value`
- ❌ Read-only computed refs: `value: computed(() => widgetValue.value)`  
- ❌ Direct prop mutations without proper setValue
- ❌ Partial flow testing: Always test the complete user journey
- ❌ Using `as any` type assertions (violates CLAUDE.md guidelines)

## Adapting This Pattern to Other Widget Types

### **🎯 Generic Application Guide**

This asset browser example demonstrates the complete pattern, but you can adapt it for any widget replacement:

**1. LoRA Selector Widget:**
```typescript
// Eligibility: target 'lora_name' widgets
function isLoRASelectionWidget(inputSpec: ComboInputSpec): boolean {
  return ['lora_name', 'lora', 'adapter'].some(pattern => 
    inputSpec.name.toLowerCase().includes(pattern)
  )
}

// Component: LoRAPickerWidget.vue with modal LoRABrowser
// Same ComponentWidgetImpl structure, different UI content
```

**2. Advanced Text Editor Widget:**
```typescript
// Eligibility: target large text inputs
function isAdvancedTextWidget(inputSpec: InputSpec): boolean {
  return inputSpec.type === 'STRING' && 
         (inputSpec.multiline || inputSpec.name.includes('prompt'))
}

// Component: AdvancedTextEditor.vue with syntax highlighting
// No modal - inline editor with expanded features
```

**3. Color Picker Widget:**
```typescript  
// Eligibility: target color-related widgets
function isColorWidget(inputSpec: InputSpec): boolean {
  return inputSpec.type === 'STRING' && 
         inputSpec.name.toLowerCase().includes('color')
}

// Component: ColorPickerWidget.vue with color palette
// Props: widget.setValue for hex color values
```

### **🔧 Universal Adaptation Steps**

**Step 1: Widget Replacement Logic**
```typescript
export const useYourCustomWidget = (): ComfyWidgetConstructorV2 => {
  const standardWidget = useStandardWidget() // Whatever you're replacing
  
  return (node: LGraphNode, inputSpec: InputSpec) => {
    if (shouldUseCustomWidget(node, inputSpec)) {
      return createYourCustomWidget(node, inputSpec)
    }
    return standardWidget(node, inputSpec)
  }
}
```

**Step 2: Eligibility Function**
```typescript
function shouldUseCustomWidget(node: LGraphNode, inputSpec: InputSpec): boolean {
  // Adapt these conditions to your use case:
  const matchesWidgetPattern = /* your widget name/type pattern */
  const matchesNodeType = /* your target node types */
  const hasRequiredFeatures = /* any other conditions */
  
  return matchesWidgetPattern && matchesNodeType && hasRequiredFeatures
}
```

**Step 3: Component Creation**  
```typescript
function createYourCustomWidget(node: LGraphNode, inputSpec: InputSpec) {
  const widgetValue = ref<YourValueType>(inputSpec.default || '')
  
  const widget = new ComponentWidgetImpl({
    node, name: inputSpec.name,
    component: YourCustomComponent,  // Your Vue component
    inputSpec,
    options: {
      getValue: () => widgetValue.value,
      setValue: (value: YourValueType) => widgetValue.value = value
    },
    props: {
      widget: {
        get value() { return widgetValue.value },
        name: inputSpec.name,
        setValue: (newValue: YourValueType) => {
          // Same canvas access pattern for any widget type
          const canvas = getCanvasFromGlobalApp()
          const canvasEvent = createSyntheticPointerEvent()
          widget.setValue(newValue, { e: canvasEvent, node, canvas })
        }
      },
      // Add your component-specific props
      customProp1: /* your value */,
      customProp2: /* your value */
    }
  })
  
  addWidget(node, widget)
  return widget
}
```

**Step 4: Vue Component Interface**
```typescript
export interface YourCustomWidgetProps {
  widget: {
    value: YourValueType
    name: string  
    setValue: (newValue: YourValueType) => void
  }
  // Your component-specific props
  customProp1?: YourType1
  customProp2?: YourType2
}
```

### **Key Principles (Universal)**

1. **ComponentWidgetImpl Structure**: Always separate `options` (internal) from `props` (Vue component)
2. **Canvas Context**: Always use the same canvas access pattern for setValue
3. **Reactive Values**: Always use getter pattern for reactive widget values
4. **TypeScript Compliance**: Always avoid `as any` type assertions
5. **Complete Testing**: Always test the full user interaction flow

These patterns work for **any** widget type - the architecture remains the same whether you're building asset browsers, text editors, color pickers, or any other custom widget interface.

## Configuration Templates for Different Architectures

### Canvas Provider Implementations

**Single App Instance Pattern:**
```typescript
// For projects with global singleton app pattern (like ComfyUI)
class SingletonCanvasProvider implements CanvasContextProvider {
  constructor(private getApp: () => App) {}
  
  getCanvas(): LGraphCanvas | null {
    return this.getApp().canvas
  }
  
  createSyntheticEvent(): CanvasPointerEvent {
    const baseEvent = new PointerEvent('pointerdown', {
      bubbles: false, cancelable: false, pointerId: -1, pointerType: 'mouse'
    })
    
    return Object.assign(baseEvent, {
      canvasX: 0, canvasY: 0, deltaX: 0, deltaY: 0,
      safeOffsetX: 0, safeOffsetY: 0
    }) as CanvasPointerEvent
  }
}
```

**Dependency Injection Pattern:**
```typescript
// For projects using DI containers
class DICanvasProvider implements CanvasContextProvider {
  constructor(private container: DIContainer) {}
  
  getCanvas(): LGraphCanvas | null {
    return this.container.get<LGraphCanvas>('canvas')
  }
  
  createSyntheticEvent(): CanvasPointerEvent {
    // Same event creation pattern
  }
}
```

**Store-Based Pattern:**
```typescript
// For projects using centralized state (Pinia, Vuex, etc.)
class StoreCanvasProvider implements CanvasContextProvider {
  constructor(private store: AppStore) {}
  
  getCanvas(): LGraphCanvas | null {
    return this.store.state.canvas
  }
  
  createSyntheticEvent(): CanvasPointerEvent {
    // Same event creation pattern
  }
}
```

### Project Configuration Setup

```typescript
// Configure widget integration for your project
interface WidgetIntegrationConfig {
  canvasProvider: CanvasContextProvider
  eligibilityRules: EligibilityRule[]
  widgetRegistry: Record<string, WidgetConstructor>
}

// Example configuration
const config: WidgetIntegrationConfig = {
  canvasProvider: new YourCanvasProvider(yourAppInstance),
  eligibilityRules: [
    createPatternRule(['file', 'path'], 'FileBrowser'),
    createPatternRule(['color', 'rgb'], 'ColorPicker'),
    createNodeTypeRule(['YourCustomNode'])
  ],
  widgetRegistry: {
    COMBO: useYourComboWidget(),
    STRING: useYourStringWidget()
  }
}
```

### Domain-Specific Adaptations

**For Media/Asset Management Projects:**
```typescript
const mediaEligibilityRules = [
  createPatternRule(['image', 'texture', 'model'], 'AssetBrowser'),
  createPatternRule(['audio', 'sound'], 'AudioBrowser'),
  createPatternRule(['video', 'clip'], 'VideoBrowser')
]
```

**For Data Processing Projects:**
```typescript
const dataEligibilityRules = [
  createPatternRule(['dataset', 'data', 'input'], 'DataBrowser'),
  createPatternRule(['transform', 'filter'], 'TransformEditor'),
  createPatternRule(['output', 'export'], 'ExportConfig')
]
```

**For Game Development Projects:**
```typescript
const gameEligibilityRules = [
  createPatternRule(['sprite', 'animation'], 'SpriteBrowser'),
  createPatternRule(['scene', 'level'], 'SceneBrowser'),
  createPatternRule(['shader', 'material'], 'ShaderEditor')
]
```

## Summary: Universal vs Project-Specific Elements

### Always Universal (Apply to Any Project):
- Three-layer architecture (Vue ↔ Integration ↔ LiteGraph)
- ComponentWidgetImpl structure with options/props separation
- Reactive getter pattern for widget values
- Canvas context requirements for setValue operations
- Widget replacement strategy (replace existing types vs. add new)
- Type safety patterns avoiding `as any` assertions

### Project-Specific Customization Points:
- **Canvas Provider Implementation**: How your app accesses the canvas
- **Eligibility Rules**: Which widgets get custom treatment
- **Value Transformations**: How to process widget values for your domain
- **UI Framework**: PrimeVue, Quasar, Element Plus, etc.
- **Presentation Style**: Modal, inline, dropdown based on your UX requirements

### Migration Path from Project-Specific to Universal:

1. **Identify Current Canvas Access**: How does your project get the LiteGraph canvas?
2. **Extract Value Logic**: What domain-specific transformations do you need?
3. **Define Eligibility Patterns**: Which widget names/types should get custom treatment?
4. **Choose Presentation Style**: Modal, inline, dropdown, or overlay?
5. **Implement Canvas Provider**: Create provider matching your app architecture
6. **Configure Widget Registry**: Replace existing types with enhanced versions

This guide provides both the universal architectural foundation and the project-specific configuration flexibility needed to implement Vue+LiteGraph widget integration in any codebase.