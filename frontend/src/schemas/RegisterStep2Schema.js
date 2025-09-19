import { z } from "zod";

export const registerStep2Schema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("resident"),
    address: z.string().min(5, "Address is required"),
    ward_code: z.string().min(1, "Ward code is required"),
  }),
  z.object({
    role: z.literal("staff"),
  }),
  z.object({
    role: z.literal("communityleader"),
  }),
]);
