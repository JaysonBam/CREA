const { z } = require("zod");

const safeTextRegex = /^[a-zA-Z0-9\s.,'!?()\-\/\\]*$/;

const wardRequestSchema = z
  .object({
    ward_id: z.coerce
      .number({ invalid_type_error: "Ward id must be a number", required_error: "Ward id is required" })
      .positive({ message: "Ward id must be a positive number" }),
    person_id: z.coerce
      .number({ invalid_type_error: "person_id must be a number" })
      .positive()
      .optional(),
    // Accept both 'decline' and frontend 'reject' as valid negative responses
    type: z
      .enum(["request", "accept", "decline", "reject", "leave"], {
        invalid_type_error: "Invalid request type",
      })
      .optional()
      .default("request"),
    // message is required for type === 'request' but optional for accept/decline/leave
    message: z
      .string()
      .max(1000, { message: "Message cannot be longer than 1000 characters" })
      .regex(safeTextRegex, { message: "Message contains invalid characters" })
      .optional()
      .or(z.literal("")),
    job_description: z
      .string()
      .max(255, { message: "Job description is too long" })
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // If this is a normal join request, message must be present
    if (String(data.type || "request") === "request") {
      const m = data.message;
      if (m == null || (typeof m === "string" && m.trim().length === 0)) {
        ctx.addIssue({ path: ["message"], message: "Message is required for a join request" });
      }
    }
  })
  .strict();

module.exports = { wardRequestSchema };
