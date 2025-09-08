/**
 * Base State Machine Framework
 *
 * Provides condition-based state transitions to eliminate timing assumptions
 * and improve test reliability across different execution environments.
 */

export interface StateMachineConfig<TState extends string, TEvent, TContext> {
  initialState: TState
  context: TContext
  transitions: StateTransitions<TState, TEvent, TContext>
  onEnterState?: (state: TState, context: TContext) => Promise<void> | void
  onExitState?: (state: TState, context: TContext) => Promise<void> | void
  debug?: boolean
}

export type StateTransitions<TState extends string, TEvent, TContext> = {
  [K in TState]: (event: TEvent, context: TContext) => Promise<TState> | TState
}

export class StateMachine<TState extends string, TEvent, TContext> {
  private _currentState: TState
  private _context: TContext
  private transitions: StateTransitions<TState, TEvent, TContext>
  private onEnterState?: (
    state: TState,
    context: TContext
  ) => Promise<void> | void
  private onExitState?: (
    state: TState,
    context: TContext
  ) => Promise<void> | void
  private debug: boolean

  constructor(config: StateMachineConfig<TState, TEvent, TContext>) {
    this._currentState = config.initialState
    this._context = config.context
    this.transitions = config.transitions
    this.onEnterState = config.onEnterState
    this.onExitState = config.onExitState
    this.debug = config.debug ?? false

    if (this.debug) {
      console.log(
        `[StateMachine] Initialized in state: ${String(this._currentState)}`
      )
    }
  }

  get currentState(): TState {
    return this._currentState
  }

  get context(): TContext {
    return this._context
  }

  async transition(event: TEvent): Promise<TState> {
    const currentState = this._currentState
    const transition = this.transitions[currentState]

    if (!transition) {
      throw new Error(
        `No transition defined for state: ${String(currentState)}`
      )
    }

    const nextState = await transition(event, this._context)

    if (nextState !== currentState) {
      if (this.debug) {
        console.log(
          `[StateMachine] Transition: ${String(currentState)} -> ${String(nextState)}`
        )
      }

      // Execute state change hooks
      if (this.onExitState) {
        await this.onExitState(currentState, this._context)
      }

      this._currentState = nextState

      if (this.onEnterState) {
        await this.onEnterState(nextState, this._context)
      }
    }

    return this._currentState
  }

  canTransitionTo(targetState: TState, event: TEvent): boolean {
    try {
      const transition = this.transitions[this._currentState]
      if (!transition) return false

      // For synchronous transitions, we can check directly
      const result = transition(event, this._context)
      if (result instanceof Promise) {
        // For async transitions, we can't easily check without executing
        return true
      }
      return result === targetState
    } catch {
      return false
    }
  }

  reset(newContext?: Partial<TContext>): void {
    if (newContext) {
      this._context = { ...this._context, ...newContext }
    }

    if (this.debug) {
      console.log(`[StateMachine] Reset to initial state`)
    }
  }
}

/**
 * Specialized State Machine for condition-based async operations
 * Eliminates timing assumptions by checking actual system conditions
 */
export interface ConditionStateMachineConfig<TState extends string, TContext>
  extends Omit<StateMachineConfig<TState, 'check', TContext>, 'transitions'> {
  conditions: ConditionTransitions<TState, TContext>
  checkInterval?: number
}

export type ConditionTransitions<TState extends string, TContext> = {
  [K in TState]: (context: TContext) => Promise<TState> | TState
}

export class ConditionStateMachine<
  TState extends string,
  TContext
> extends StateMachine<TState, 'check', TContext> {
  private conditions: ConditionTransitions<TState, TContext>
  private checkInterval: number

  constructor(config: ConditionStateMachineConfig<TState, TContext>) {
    const transitions = Object.fromEntries(
      Object.entries(config.conditions).map(([state, condition]) => [
        state,
        async (_event: 'check', context: TContext) =>
          (condition as (context: TContext) => Promise<TState> | TState)(
            context
          )
      ])
    ) as StateTransitions<TState, 'check', TContext>

    super({
      ...config,
      transitions
    })

    this.conditions = config.conditions
    this.checkInterval = config.checkInterval ?? 16 // ~60fps polling rate
  }

  async checkConditions(): Promise<TState> {
    return this.transition('check')
  }

  /**
   * Wait for the state machine to reach a target state
   * Uses condition-based checking instead of timing assumptions
   */
  async waitForState(
    targetState: TState | TState[],
    timeoutMs: number = 10000
  ): Promise<TState> {
    const targetStates = Array.isArray(targetState)
      ? targetState
      : [targetState]

    if (targetStates.includes(this.currentState)) {
      return this.currentState
    }

    return new Promise<TState>((resolve, reject) => {
      const startTime = Date.now()

      const checkState = async () => {
        try {
          const newState = await this.checkConditions()

          if (targetStates.includes(newState)) {
            cleanup()
            resolve(newState)
            return
          }

          // Check for timeout
          const elapsed = Date.now() - startTime
          if (elapsed >= timeoutMs) {
            cleanup()
            reject(
              new Error(
                `Timeout waiting for state ${String(targetState)}. ` +
                  `Current state: ${String(newState)}, elapsed: ${elapsed}ms`
              )
            )
          }
        } catch (error) {
          cleanup()
          reject(error)
        }
      }

      // Start checking conditions
      const intervalId = setInterval(checkState, this.checkInterval)

      // Set overall timeout
      const timeoutId = setTimeout(() => {
        cleanup()
        reject(
          new Error(
            `Timeout waiting for state ${String(targetState)} after ${timeoutMs}ms. ` +
              `Current state: ${String(this.currentState)}`
          )
        )
      }, timeoutMs)

      const cleanup = () => {
        clearTimeout(timeoutId)
        clearInterval(intervalId)
      }

      // Perform initial check
      void checkState()
    })
  }

  /**
   * Wait for any state change from current state
   */
  async waitForStateChange(timeoutMs: number = 5000): Promise<TState> {
    const initialState = this.currentState

    return new Promise<TState>((resolve, reject) => {
      const startTime = Date.now()

      const checkState = async () => {
        try {
          const newState = await this.checkConditions()

          if (newState !== initialState) {
            cleanup()
            resolve(newState)
            return
          }

          // Check for timeout
          const elapsed = Date.now() - startTime
          if (elapsed >= timeoutMs) {
            cleanup()
            reject(
              new Error(
                `Timeout waiting for state change from ${String(initialState)} after ${timeoutMs}ms`
              )
            )
          }
        } catch (error) {
          cleanup()
          reject(error)
        }
      }

      // Start checking conditions
      const intervalId = setInterval(checkState, this.checkInterval)

      // Set overall timeout
      const timeoutId = setTimeout(() => {
        cleanup()
        reject(
          new Error(
            `Timeout waiting for state change from ${String(initialState)} after ${timeoutMs}ms`
          )
        )
      }, timeoutMs)

      const cleanup = () => {
        clearTimeout(timeoutId)
        clearInterval(intervalId)
      }

      // Perform initial check
      void checkState()
    })
  }
}

/**
 * Utility function to create a simple condition-based state machine
 */
export function createConditionStateMachine<TState extends string, TContext>(
  config: ConditionStateMachineConfig<TState, TContext>
): ConditionStateMachine<TState, TContext> {
  return new ConditionStateMachine(config)
}
