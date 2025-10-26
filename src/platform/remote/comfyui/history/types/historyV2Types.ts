/**
 * @fileoverview History V2 types and schemas - Internal cloud API format
 * @module platform/remote/comfyui/history/types/historyV2Types
 *
 * These types and schemas represent the V2 history format returned by the cloud API.
 * They are only used internally and are converted to V1 format via adapter.
 *
 * IMPORTANT: These types should NOT be used outside this history module.
 */

import { z } from 'zod'

import {
  zExtraData,
  zPromptId,
  zQueueIndex,
  zStatus,
  zTaskMeta,
  zTaskOutput
} from '@/schemas/apiSchema'

// V2-specific prompt schema (different from V1 tuple format)
const zTaskPromptV2 = z.object({
  priority: zQueueIndex,
  prompt_id: zPromptId,
  extra_data: zExtraData
})

// Raw history item from backend (without taskType)
const zRawHistoryItemV2 = z.object({
  prompt_id: zPromptId,
  prompt: zTaskPromptV2,
  status: zStatus.optional(),
  outputs: zTaskOutput,
  meta: zTaskMeta.optional()
})

// API response format: { history: [{prompt_id: "...", ...}, ...] }
const zHistoryResponseV2 = z.object({
  history: z.array(zRawHistoryItemV2)
})

// Export types
export type TaskPromptV2 = z.infer<typeof zTaskPromptV2>
export type RawHistoryItemV2 = z.infer<typeof zRawHistoryItemV2>
export type HistoryResponseV2 = z.infer<typeof zHistoryResponseV2>
export type TaskOutput = z.infer<typeof zTaskOutput>

// Export schemas for runtime validation (only zRawHistoryItemV2 used in tests)
export { zRawHistoryItemV2 }
