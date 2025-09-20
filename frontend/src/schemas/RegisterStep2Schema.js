import { z } from "zod";

export const registerStep2Schema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("resident"),
    address: z.string().min(5, "Address is required"),
    ward_code: z.string().min(1, "Ward code is required"),
    address: z.string().optional(),       // required if resident
    address_lat: z.coerce.number().optional(),
    address_lng: z.coerce.number().optional(),
    address_place_id: z.string().optional(),
  }),
  z.object({
    role: z.literal("staff"),
  }),
  z.object({
    role: z.literal("communityleader"),
  }),
]);
