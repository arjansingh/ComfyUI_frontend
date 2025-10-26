/**
 * @fileoverview History V1 types - Public interface used throughout the app
 * @module platform/remote/comfyui/history/types/historyV1Types
 *
 * These types represent the V1 history format that the application expects.
 * Both desktop (direct V1 API) and cloud (V2 API + adapter) return data in this format.
 */

import type { HistoryTaskItem, TaskPrompt } from '@/schemas/apiSchema'

/**
 * History response format - V1 API returns object with History key
 */
export interface HistoryV1Response {
  History: HistoryTaskItem[]
}

/**
 * Re-export V1 types from schema
 */
export type { HistoryTaskItem, TaskPrompt }
