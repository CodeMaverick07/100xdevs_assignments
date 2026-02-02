import z from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["customer", "owner"]).optional(),
  phone: z.string().min(10).max(15).optional(),
});

export const LoginUserSchema = z.object({
  email: z.email("invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const CreateHotelSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  city: z.string().min(2),
  country: z.string().min(2),
  amenities: z.array(z.string()).optional().default([]),
});

export const AddCreateRoomSchema = z.object({
  roomNumber: z.string(),
  roomType: z.string(),
  pricePerNight: z.number(),
  maxOccupancy: z.number(),
});

export const CreateBookingSchema = z
  .object({
    roomId: z.string(),
    checkInDate: z.coerce.date(),
    checkOutDate: z.coerce.date(),
    guests: z.number().positive(),
  })
  .refine((data) => data.checkOutDate > data.checkInDate, {
    message: "Checkout date must be after check-in date",
    path: ["checkOutDate"],
  });

export const CreateReviewSchema = z.object({
  bookingId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string(),
});
