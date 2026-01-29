import { Router } from "express";
import {
  CreateUserController,
  LoginUserController,
} from "../controllers/contorller.js";

export const route = Router();

route.post("/auth/signup", CreateUserController);
route.post("/auth/login", LoginUserController);
