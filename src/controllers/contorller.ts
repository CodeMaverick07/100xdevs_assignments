import { Request, Response } from "express";
import {
  AddCreateRoomSchema,
  CreateBookingSchema,
  CreateHotelSchema,
  CreateReviewSchema,
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
import { Prisma, BookingStatus } from "@prisma/client";

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
    return WriteJSON(
      res,
      { success: false, data: null, error: "INTERNAL_SERVER_ERROR" },
      500,
    );
  }
}

export async function LoginUserController(req: Request, res: Response) {
  const result = LoginUserSchema.safeParse(req.body);
  if (!result.success) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "INVALID_REQUEST" },
      400,
    );
  }

  const { email, password } = result.data;
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
    const isMatch = await ComparePassword(password, user.password);
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

    // FIX: Added validation for hotelId
    if (!hotelId || typeof hotelId !== "string") {
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

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
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
    if (hotel.ownerId != req.user.userId) {
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
          hotelId: hotelId,
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
        hotelId: hotelId,
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
    const hotelsWithMinPrice = hotels.map((hotel: any) => {
      const prices = hotel.rooms.map((r: any) => Number(r.pricePerNight));
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
) {
  if (!req.user) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "UNAUTHORIZED" },
      401,
    );
  }
  try {
    const hotelId = req.params.hotelId;
    const hotelsRoomData = await prisma.hotel.findFirst({
      where: {
        id: hotelId as string,
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
        rooms: {
          select: {
            id: true,
            roomNumber: true,
            roomType: true,
            pricePerNight: true,
            maxOccupancy: true,
          },
        },
      },
    });
    if (!hotelsRoomData) {
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
    return WriteJSON(
      res,
      { success: true, data: hotelsRoomData, error: null },
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

export async function CreateHotelBooking(req: AuthRequest, res: Response) {
  if (!req.user) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "UNAUTHORIZED" },
      401,
    );
  }

  if (req.user.role !== "customer") {
    return WriteJSON(
      res,
      { success: false, data: null, error: "FORBIDDEN" },
      403,
    );
  }
  try {
    const result = CreateBookingSchema.safeParse(req.body);
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
    if (!data.roomId) {
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
    const isRoomExist = await prisma.room.findUnique({
      where: {
        id: data.roomId,
      },
      select: {
        hotelId: true,
        maxOccupancy: true,
        pricePerNight: true,
      },
    });
    if (!isRoomExist) {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "ROOM_NOT_FOUND",
        },
        404,
      );
    }
    if (isRoomExist.maxOccupancy < data.guests) {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "INVALID_CAPACITY",
        },
        400,
      );
    }
    const bookingsForRoom = await prisma.booking.findMany({
      where: {
        roomId: data.roomId,
      },
      select: {
        checkInDate: true,
        checkOutDate: true,
      },
    });
    const isOverlap = bookingsForRoom.some((r) => {
      return (
        r.checkInDate < data.checkOutDate && r.checkOutDate > data.checkInDate
      );
    });
    if (isOverlap) {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "ROOM_NOT_AVAILABLE",
        },
        400,
      );
    }

    // FIX: Improved date validation to allow bookings for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInStart = new Date(data.checkInDate);
    checkInStart.setHours(0, 0, 0, 0);

    if (checkInStart < today) {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "INVALID_DATES",
        },
        400,
      );
    }
    if (data.checkOutDate <= data.checkInDate) {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "INVALID_DATES",
        },
        400,
      );
    }
    const nights =
      (new Date(data.checkOutDate).getTime() -
        new Date(data.checkInDate).getTime()) /
      (1000 * 60 * 60 * 24);
    const totalPrice = nights * Number(isRoomExist.pricePerNight);

    const booking = await prisma.booking.create({
      data: {
        userId: req.user.userId,
        roomId: data.roomId,
        hotelId: isRoomExist.hotelId,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        guests: data.guests,
        totalPrice: totalPrice,
        status: "confirmed",
      },
      select: {
        id: true,
        userId: true,
        roomId: true,
        hotelId: true,
        checkInDate: true,
        checkOutDate: true,
        guests: true,
        totalPrice: true,
        status: true,
        bookingDate: true,
      },
    });
    return WriteJSON(res, { success: true, data: booking, error: null }, 201);
  } catch (error) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "INTERNAL_SERVER_ERROR" },
      500,
    );
  }
}

export async function GetAllBookingsByUser(req: AuthRequest, res: Response) {
  if (!req.user) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "UNAUTHORIZED" },
      401,
    );
  }

  if (req.user.role !== "customer") {
    return WriteJSON(
      res,
      { success: false, data: null, error: "FORBIDDEN" },
      403,
    );
  }
  try {
    const statusRaw = req.query.status;
    let status: BookingStatus | undefined;
    if (Array.isArray(statusRaw)) {
      status = statusRaw[0] as BookingStatus;
    } else if (typeof statusRaw === "string") {
      status = statusRaw as BookingStatus;
    } else {
      status = undefined;
    }

    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.user.userId,
        ...(status !== undefined ? { status } : {}),
      },
      select: {
        id: true,
        roomId: true,
        hotelId: true,
        checkInDate: true,
        checkOutDate: true,
        guests: true,
        totalPrice: true,
        status: true,
        bookingDate: true,
        hotel: {
          select: {
            name: true,
          },
        },
        room: {
          select: {
            roomNumber: true,
            roomType: true,
          },
        },
      },
    });
    return WriteJSON(res, { success: true, data: bookings, error: null }, 200);
  } catch (error) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "INTERNAL_SERVER_ERROR" },
      500,
    );
  }
}

export async function CancelBookingForCustomer(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "UNAUTHORIZED" },
      401,
    );
  }

  if (req.user.role !== "customer") {
    return WriteJSON(
      res,
      { success: false, data: null, error: "FORBIDDEN" },
      403,
    );
  }
  const bookingId = req.query.bookingId;
  if (!bookingId || typeof bookingId !== "string") {
    return WriteJSON(
      res,
      { success: false, data: null, error: "INVALID_BOOKING_ID" },
      400,
    );
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return WriteJSON(
        res,
        { success: false, data: null, error: "BOOKING_NOT_FOUND" },
        404,
      );
    }

    if (booking.userId !== req.user.userId) {
      return WriteJSON(
        res,
        { success: false, data: null, error: "FORBIDDEN" },
        403,
      );
    }

    if (booking.status === "cancelled") {
      return WriteJSON(
        res,
        { success: false, data: null, error: "ALREADY_CANCELLED" },
        400,
      );
    }

    const checkout = new Date(booking.checkOutDate);
    checkout.setHours(23, 59, 59, 999);

    if (checkout.getTime() < Date.now()) {
      return WriteJSON(
        res,
        { success: false, data: null, error: "BOOKING_ALREADY_COMPLETED" },
        400,
      );
    }

    const checkInTime = new Date(booking.checkInDate).getTime();
    const now = Date.now();
    const HOURS_24 = 24 * 60 * 60 * 1000;

    if (checkInTime - now < HOURS_24) {
      return WriteJSON(
        res,
        { success: false, data: null, error: "CANCELLATION_DEADLINE_PASSED" },
        400,
      );
    }
    const result = await prisma.booking.updateMany({
      where: {
        id: bookingId,
        status: "confirmed",
      },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
      },
    });

    if (result.count === 0) {
      return WriteJSON(
        res,
        { success: false, data: null, error: "BOOKING_NOT_CANCELLABLE" },
        400,
      );
    }

    return WriteJSON(
      res,
      {
        success: true,
        data: {
          id: bookingId,
          status: "cancelled",
          cancelledAt: new Date(),
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

export async function SubmitReviewAfterBooking(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "UNAUTHORIZED" },
      401,
    );
  }

  if (req.user.role !== "customer") {
    return WriteJSON(
      res,
      { success: false, data: null, error: "FORBIDDEN" },
      403,
    );
  }
  try {
    const result = CreateReviewSchema.safeParse(req.body);
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
    const booking = await prisma.booking.findUnique({
      where: { id: data?.bookingId as string },
    });
    if (!booking) {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "BOOKING_NOT_FOUND",
        },
        404,
      );
    }
    if (booking?.status === "cancelled") {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "BOOKING_NOT_ELIGIBLE",
        },
        400,
      );
    }
    if (booking?.userId != req.user.userId) {
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
    const checkoutTime = new Date(booking.checkOutDate).getTime();
    const now = Date.now();
    if (checkoutTime > now) {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "BOOKING_NOT_ELIGIBLE",
        },
        400,
      );
    }
    const isReviewed = await prisma.review.findUnique({
      where: {
        userId_bookingId: {
          userId: req.user.userId,
          bookingId: data.bookingId,
        },
      },
    });
    if (isReviewed) {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "ALREADY_REVIEWED",
        },
        400,
      );
    }
    const review = await prisma.review.create({
      data: {
        userId: req.user.userId,
        hotelId: booking.hotelId,
        bookingId: booking.id,
        rating: data!.rating,
        comment: data?.comment,
      },
      select: {
        userId: true,
        bookingId: true,
        hotelId: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });
    const hotel = await prisma.hotel.findUnique({
      where: { id: booking.hotelId },
      select: {
        rating: true,
        totalReviews: true,
      },
    });

    // FIX: Improved error message
    if (hotel?.rating == null || hotel.totalReviews == null) {
      return WriteJSON(
        res,
        {
          success: false,
          data: null,
          error: "HOTEL_DATA_INVALID",
        },
        500,
      );
    }
    const newTotalReviews = hotel.totalReviews + 1;

    const newRating =
      (Number(hotel.rating) * hotel.totalReviews + data.rating) /
      newTotalReviews;
    await prisma.hotel.update({
      where: {
        id: booking.hotelId,
      },
      data: {
        rating: newRating,
        totalReviews: newTotalReviews,
      },
    });
    return WriteJSON(res, { success: true, data: review, error: null }, 201);
  } catch (error) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "INTERNAL_SERVER_ERROR" },
      500,
    );
  }
}
