import { Router } from "express";
import {
  CreateHotelController,
  CreateUserController,
  LoginUserController,
} from "../controllers/contorller.js";
import { AuthUserMiddleware } from "../middleware/middleware.js";

export const route = Router();

route.post("/auth/signup", CreateUserController);
route.post("/auth/login", LoginUserController);
route.post("/hotels", AuthUserMiddleware, CreateHotelController);
