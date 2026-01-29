import { Request, Response } from "express";
import { CreateUserSchema, LoginUserSchema } from "../utils/zod.js";
import { ComparePassword, HashPassword, WriteJSON } from "../utils/utils.js";
import { prisma } from "../utils/prisma.js";
import jwt from "jsonwebtoken";
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
