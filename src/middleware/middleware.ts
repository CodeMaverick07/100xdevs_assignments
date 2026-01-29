import { NextFunction, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthRequest, WriteJSON } from "../utils/utils.js";

export async function AuthUserMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "UNAUTHORIZED" },
      401,
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return WriteJSON(
        res,
        { success: false, data: null, error: "UNAUTHORIZED" },
        401,
      );
    }

    const decoded = jwt.verify(token!, jwtSecret) as unknown as JwtPayload & {
      userId: string;
      role: "owner" | "customer";
    };

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "INVALID_TOKEN" },
      401,
    );
  }
}
