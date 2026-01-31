import { Router } from "express";
import {
  AddRoomToHotel,
  CancelBookingForCustomer,
  CreateHotelBooking,
  CreateHotelController,
  CreateUserController,
  GetAllBookingsByUser,
  GetHotelDetailsAndRoomDetails,
  GetHotelsByFilters,
  LoginUserController,
  SubmitReviewAfterBooking,
} from "../controllers/contorller.js";
import { AuthUserMiddleware } from "../middleware/middleware.js";

export const route = Router();

route.post("/auth/signup", CreateUserController);
route.post("/auth/login", LoginUserController);
route.post("/hotels", AuthUserMiddleware, CreateHotelController);

route.post("/hotels/:hotelId/rooms", AuthUserMiddleware, AddRoomToHotel);

route.get("/hotels", AuthUserMiddleware, GetHotelsByFilters);
route.get(
  "/hotels/:hotelId",
  AuthUserMiddleware,
  GetHotelDetailsAndRoomDetails,
);

route.post("/bookings", AuthUserMiddleware, CreateHotelBooking);

route.get("/bookings", AuthUserMiddleware, GetAllBookingsByUser);

route.put(
  "/bookings/:bookingId/cancel",
  AuthUserMiddleware,
  CancelBookingForCustomer,
);

route.post("/reviews", AuthUserMiddleware, SubmitReviewAfterBooking);
