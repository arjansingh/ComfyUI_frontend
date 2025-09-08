/**
 * Canvas Stability State Machine
 *
 * Replaces timing-based waitForCanvasStable with condition-based state transitions.
 * Eliminates environment-dependent timing assumptions and safety overrides.
 */
import { Page } from '@playwright/test'

import {
  ConditionStateMachine,
  createConditionStateMachine
} from './StateMachine'

export enum CanvasState {
  INITIALIZING = 'initializing',
  CHECKING = 'checking',
  STABLE = 'stable',
  UNSTABLE = 'unstable'
}

export interface CanvasContext {
  page: Page
  consecutiveStableChecks: number
  requiredStableChecks: number
  lastCheckTime: number
  debug: boolean
}

export interface CanvasStabilityConfig {
  page: Page
  requiredStableChecks?: number
  debug?: boolean
}

/**
 * Creates a canvas stability state machine that eliminates timing assumptions
 */
export function createCanvasStabilityStateMachine(
  config: CanvasStabilityConfig
): ConditionStateMachine<CanvasState, CanvasContext> {
  const context: CanvasContext = {
    page: config.page,
    consecutiveStableChecks: 0,
    requiredStableChecks: config.requiredStableChecks ?? 2, // Minimum stable checks
    lastCheckTime: 0,
    debug: config.debug ?? false
  }

  return createConditionStateMachine({
    initialState: CanvasState.INITIALIZING,
    context,
    debug: config.debug,
    checkInterval: 16, // ~60fps for responsive checking

    conditions: {
      [CanvasState.INITIALIZING]: async (ctx) => {
        const isAppReady = await checkAppInitialization(ctx.page)
        if (isAppReady) {
          if (ctx.debug)
            console.log(
              '[CanvasStability] App initialized, starting stability checks'
            )
          return CanvasState.CHECKING
        }
        return CanvasState.INITIALIZING
      },

      [CanvasState.CHECKING]: async (ctx) => {
        const instabilityReasons = await detectInstabilities(ctx.page)

        if (instabilityReasons.length > 0) {
          if (ctx.debug) {
            console.log(
              '[CanvasStability] Instabilities detected:',
              instabilityReasons
            )
          }
          ctx.consecutiveStableChecks = 0
          return CanvasState.UNSTABLE
        }

        // All stability checks passed
        ctx.consecutiveStableChecks++
        ctx.lastCheckTime = Date.now()

        if (ctx.consecutiveStableChecks >= ctx.requiredStableChecks) {
          if (ctx.debug) {
            console.log(
              `[CanvasStability] Stable after ${ctx.consecutiveStableChecks} consecutive checks`
            )
          }
          return CanvasState.STABLE
        }

        if (ctx.debug && ctx.consecutiveStableChecks % 10 === 0) {
          console.log(
            `[CanvasStability] Stable checks: ${ctx.consecutiveStableChecks}/${ctx.requiredStableChecks}`
          )
        }

        return CanvasState.CHECKING
      },

      [CanvasState.UNSTABLE]: async (ctx) => {
        const instabilityReasons = await detectInstabilities(ctx.page)

        if (instabilityReasons.length === 0) {
          if (ctx.debug)
            console.log(
              '[CanvasStability] Instabilities resolved, resuming checks'
            )
          return CanvasState.CHECKING
        }

        return CanvasState.UNSTABLE
      },

      [CanvasState.STABLE]: async (ctx) => {
        // Re-verify stability to handle dynamic changes
        const instabilityReasons = await detectInstabilities(ctx.page)

        if (instabilityReasons.length > 0) {
          if (ctx.debug)
            console.log(
              '[CanvasStability] Stability lost, returning to checking'
            )
          ctx.consecutiveStableChecks = 0
          return CanvasState.UNSTABLE
        }

        return CanvasState.STABLE
      }
    }
  })
}

/**
 * Check if the ComfyUI app is fully initialized
 */
async function checkAppInitialization(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return !!(
      window['app'] &&
      window['app'].extensionManager &&
      window['app'].graph
    )
  })
}

/**
 * Detect all current instabilities in the canvas system
 * Returns array of reasons for instability (empty array = stable)
 */
async function detectInstabilities(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const instabilities: string[] = []

    try {
      const app = window['app']
      const graph = app.graph

      // Check for missing required objects
      if (!app) {
        instabilities.push('app_missing')
        return instabilities
      }
      if (!graph) {
        instabilities.push('graph_missing')
        return instabilities
      }

      // Check graph state
      if (graph.dirty === true) {
        instabilities.push('graph_dirty')
      }

      // Check canvas rendering state
      if (app.canvas?.rendering === true) {
        instabilities.push('canvas_rendering')
      }

      // Check extension manager workflow state
      if (app.extensionManager?.workflow?.isBusy === true) {
        instabilities.push('workflow_busy')
      }

      // Check widget states
      if (graph.nodes && Array.isArray(graph.nodes)) {
        for (const node of graph.nodes) {
          if (!node.widgets) continue

          for (const widget of node.widgets) {
            if (widget?.pending === true) {
              instabilities.push('widget_pending')
              break
            }
            if (widget?.updating === true) {
              instabilities.push('widget_updating')
              break
            }
          }

          // Break early if we found widget instability
          if (instabilities.some((r) => r.startsWith('widget_'))) {
            break
          }
        }
      }

      // Check for active animations or transitions
      const hasActiveAnimations = document
        .getAnimations()
        .some((anim) => anim.playState === 'running')
      if (hasActiveAnimations) {
        instabilities.push('animations_running')
      }

      // Check for pending network requests (optional - might be too strict)
      // This could help detect when remote widgets are still loading
      if (document.readyState !== 'complete') {
        instabilities.push('document_loading')
      }
    } catch (error) {
      // If stability checking itself fails, assume unstable
      instabilities.push('check_error: ' + String(error))
    }

    return instabilities
  })
}

/**
 * Enhanced canvas stability checker with comprehensive condition validation
 *
 * This class provides the main API that replaces the timing-based waitForCanvasStable
 */
export class CanvasStabilityChecker {
  private stateMachine: ConditionStateMachine<CanvasState, CanvasContext>

  constructor(config: CanvasStabilityConfig) {
    this.stateMachine = createCanvasStabilityStateMachine(config)
  }

  get currentState(): CanvasState {
    return this.stateMachine.currentState
  }

  get context(): CanvasContext {
    return this.stateMachine.context
  }

  /**
   * Wait for canvas to reach stable state
   * Replaces timing-based waitForCanvasStable with condition-based checking
   */
  async waitForStable(timeoutMs: number = 10000): Promise<void> {
    await this.stateMachine.waitForState(CanvasState.STABLE, timeoutMs)
  }

  /**
   * Check current stability without waiting
   */
  async checkStability(): Promise<CanvasState> {
    return this.stateMachine.checkConditions()
  }

  /**
   * Reset the stability checker (useful between tests)
   */
  reset(): void {
    this.stateMachine.reset({
      consecutiveStableChecks: 0,
      lastCheckTime: 0
    })
  }

  /**
   * Get detailed stability information for debugging
   */
  async getStabilityInfo(): Promise<{
    state: CanvasState
    consecutiveStableChecks: number
    requiredStableChecks: number
    instabilities: string[]
  }> {
    const state = await this.checkStability()
    const instabilities = await detectInstabilities(this.context.page)

    return {
      state,
      consecutiveStableChecks: this.context.consecutiveStableChecks,
      requiredStableChecks: this.context.requiredStableChecks,
      instabilities
    }
  }
}
