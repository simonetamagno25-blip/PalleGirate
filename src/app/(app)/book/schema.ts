import { z } from "zod";
import { isValidDay } from "@/lib/time/rome";

export const daySchema = z.string().refine(isValidDay);

export const submitSchema = z.object({
  bookingId: z.string().optional(),
  memberId: z.string().optional(),
  mode: z.enum(["member", "admin"]),
  fieldId: z.string().min(1),
  day: daySchema,
  minute: z.number().int().min(0).max(1439),
  slots: z.number().int(),
});
