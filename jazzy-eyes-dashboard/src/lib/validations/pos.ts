import { z } from 'zod';

// Frame ID validation - just numbers, no FR- prefix
export const frameIdSchema = z.object({
  frameId: z.string()
    .min(1, 'Frame ID is required')
    .regex(/^\d+$/, 'Frame ID must contain only numbers (e.g., 0542)')
});

export type FrameIdFormData = z.infer<typeof frameIdSchema>;
