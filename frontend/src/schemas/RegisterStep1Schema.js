import { z } from "zod";

export const registerStep1Schema = z.object({
  email: z.string().email("Invalid email").nonempty("Email is required"),

  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits")
    .regex(/^\d+$/, "Phone number must contain only digits")
    .nonempty("Phone number is required"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .nonempty("Password is required"),

  firstName: z.string().nonempty("First name is required"),

  lastName: z.string().nonempty("Last name is required"),
});
