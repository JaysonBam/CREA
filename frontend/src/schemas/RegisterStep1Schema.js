import { z } from "zod";

export const registerStep1Schema = z.object({
  email: z
    .string()
    .trim()
    .nonempty("Email is required")
    .email("Invalid email")
    .max(200, "Email must be at most 200 characters"),

  phone: z
    .string()
    .trim()
    .nonempty("Phone number is required")
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),

  password: z
    .string()
    .nonempty("Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password must be at most 200 characters"),

  firstName: z
    .string()
    .trim()
    .nonempty("First name is required")
    .max(150, "First name must be at most 150 characters"),

  lastName: z
    .string()
    .trim()
    .nonempty("Last name is required")
    .max(150, "Last name must be at most 150 characters"),
});
