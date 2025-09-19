const { z } = require("zod");
//This is a test schema for validating data for the test CRUD operations
const testCrudSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean({
    required_error: "Active is required",
    invalid_type_error: "Active must be true or false",
  }),
});

module.exports = { testCrudSchema };
