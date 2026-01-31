import { Request, Response } from "express";
import {
  AddCreateRoomSchema,
  CreateHotelSchema,
  CreateUserSchema,
  LoginUserSchema,
} from "../utils/zod.js";
import {
  ComparePassword,
  HashPassword,
  WriteJSON,
  AuthRequest,
} from "../utils/utils.js";
import { prisma } from "../utils/prisma.js";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";

export async function CreateUserController(req: Request, res: Response) {
  const result = CreateUserSchema.safeParse(req.body);

  if (!result.success) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "INVALID_REQUEST" },
      400,
    );
  }

  const { name, email, password, phone } = result.data;

  const role = result.data.role ?? "customer";

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return WriteJSON(
        res,
        { success: false, data: null, error: "EMAIL_ALREADY_EXISTS" },
        400,
      );
    }
    const hashedPassword = await HashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
      },
    });

    return WriteJSON(res, { success: true, data: user, error: null }, 201);
  } catch (error) {
    console.error(error);
    return WriteJSON(
      res,
      { success: false, data: null, error: "INTERNAL_SERVER_ERROR" },
      500,
    );
  }
}

export async function LoginUserController(req: Request, res: Response) {
  const result = LoginUserSchema.safeParse(req.body);
  console.log(result);
  if (!result.success) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "INVALID_REQUEST" },
      400,
    );
  }

  const { email, password } = result.data;
  console.log(email, password);
  const hash = await HashPassword(password);
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
      },
    });

    if (!user) {
      return WriteJSON(
        res,
        { success: false, data: null, error: "INVALID_CREDENTIALS" },
        401,
      );
    }
    const isMatch = await ComparePassword(user.password, password);
    if (!isMatch) {
      return WriteJSON(
        res,
        { success: false, data: null, error: "INVALID_CREDENTIALS" },
        401,
      );
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    return WriteJSON(
      res,
      {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
        error: null,
      },
      200,
    );
  } catch (error) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "INTERNAL_SERVER_ERROR" },
      500,
    );
  }
}

export async function CreateHotelController(req: AuthRequest, res: Response) {
  if (!req.user) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "UNAUTHORIZED" },
      401,
    );
  }

  if (req.user.role !== "owner") {
    return WriteJSON(
      res,
      { success: false, data: null, error: "FORBIDDEN" },
      403,
    );
  }

  const result = CreateHotelSchema.safeParse(req.body);

  if (!result.success) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "INVALID_REQUEST" },
      400,
    );
  }

  try {
    const hotel = await prisma.hotel.create({
      data: {
        ownerId: req.user.userId,
        description: result.data.description ?? null,
        city: result.data.city,
        name: result.data.name,
        country: result.data.country,
        amenities: result.data.amenities,
      },
      select: {
        id: true,
        ownerId: true,
        name: true,
        description: true,
        city: true,
        country: true,
        amenities: true,
        rating: true,
        totalReviews: true,
      },
    });

    return WriteJSON(res, { success: true, data: hotel, error: null }, 201);
  } catch (error) {
    console.error(error);
    return WriteJSON(
      res,
      { success: false, data: null, error: "INTERNAL_SERVER_ERROR" },
      500,
    );
  }
}

export async function AddRoomToHotel(req: AuthRequest, res: Response) {
  if (!req.user) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "UNAUTHORIZED" },
      401,
    );
  }
  if (req.user?.role != "owner") {
    return WriteJSON(
      res,
      {
        success: false,
        data: null,
        error: "FORBIDDEN",
      },
      403,
    );
  }
  try {
    const hotelId = req.params.hotelId;
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId as string },
    });
    if (!hotel) {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "HOTEL_NOT_FOUND",
        },
        404,
      );
    }
    if (hotel.ownerId == req.user.userId) {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "FORBIDDEN",
        },
        403,
      );
    }

    const result = AddCreateRoomSchema.safeParse(req.body);
    if (!result.success) {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "INVALID_REQUEST",
        },
        400,
      );
    }
    const data = result.data;

    const isRoomExist = await prisma.room.findUnique({
      where: {
        hotelId_roomNumber: {
          roomNumber: data.roomNumber,
          hotelId: hotelId as string,
        },
      },
    });
    if (isRoomExist) {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "ROOM_ALREADY_EXISTS",
        },
        400,
      );
    }
    const hotel_room = await prisma.room.create({
      data: {
        roomNumber: data.roomNumber,
        roomType: data.roomType,
        hotelId: hotelId as string,
        pricePerNight: data.pricePerNight,
        maxOccupancy: data.maxOccupancy,
      },
      select: {
        id: true,
        hotelId: true,
        roomNumber: true,
        roomType: true,
        pricePerNight: true,
        maxOccupancy: true,
      },
    });
    return WriteJSON(
      res,
      { success: true, data: hotel_room, error: null },
      201,
    );
  } catch (error) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "INTERNAL_SERVER_ERROR" },
      500,
    );
  }
}

export async function GetHotelsByFilters(req: AuthRequest, res: Response) {
  if (!req.user) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "UNAUTHORIZED" },
      401,
    );
  }
  try {
    const { city, country, minPrice, maxPrice, minRating } = req.query;
    const where: Prisma.HotelWhereInput = {
      ...(city && { city: city as string }),
      ...(country && { country: country as string }),
      ...(minRating && { rating: { gte: Number(minRating) } }),
      ...(minPrice || maxPrice
        ? {
            rooms: {
              some: {
                pricePerNight: {
                  ...(minPrice && { gte: Number(minPrice) }),
                  ...(maxPrice && { lte: Number(maxPrice) }),
                },
              },
            },
          }
        : {}),
    };
    const hotels = await prisma.hotel.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        city: true,
        country: true,
        amenities: true,
        rating: true,
        totalReviews: true,
        rooms: {
          select: {
            pricePerNight: true,
          },
        },
      },
    });
    const hotelsWithMinPrice = hotels.map((hotel) => {
      const prices = hotel.rooms.map((r) => Number(r.pricePerNight));
      return {
        id: hotel.id,
        name: hotel.name,
        description: hotel.description,
        city: hotel.city,
        country: hotel.country,
        amenities: hotel.amenities,
        rating: hotel.rating,
        totalReviews: hotel.totalReviews,
        minPricePerNight: prices.length ? Math.min(...prices) : null,
      };
    });
    return WriteJSON(
      res,
      { success: true, data: hotelsWithMinPrice, error: null },
      200,
    );
  } catch (error) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "INTERNAL_SERVER_ERROR" },
      500,
    );
  }
}

export async function GetHotelDetailsAndRoomDetails(
  req: AuthRequest,
  res: Response,
) {}

export async function CreateHotelBooking(req: AuthRequest, res: Response) {}

export async function GetAllBookingsByUser(req: AuthRequest, res: Response) {}

export async function CancelBookingForCustomer(
  req: AuthRequest,
  res: Response,
) {}

export async function SubmitReviewAfterBooking(
  req: AuthRequest,
  res: Response,
) {}
