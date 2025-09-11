import { z } from "zod";

export const registerStep2Schema = z.object({
  role: z.enum(["resident", "staff", "communityleader"], {
    required_error: "Role is required",
    invalid_type_error: "Invalid role",
  }),
});
