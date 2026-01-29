import { Router } from "express";
import { CreateUserController } from "../controllers/contorller.js";

export const route = Router();

route.post("/auth/signup", CreateUserController);
