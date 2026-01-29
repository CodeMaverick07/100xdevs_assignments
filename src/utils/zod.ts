import z from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["customer", "owner"]).optional(),
  phone: z.string().min(10).max(15),
});

export const LoginUserSchema = z.object({
  email: z.email("invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});


