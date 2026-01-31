import { NextFunction, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthRequest, WriteJSON } from "../utils/utils.js";

export async function AuthUserMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  console.log("Auth Header:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "UNAUTHORIZED" },
      401,
    );
  }

  const token = authHeader.split(" ")[1];

  console.log("Extracted Token:", token);
  console.log("Token length:", token?.length);

  if (!token) {
    return WriteJSON(
      res,
      { success: false, data: null, error: "UNAUTHORIZED" },
      401,
    );
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    console.log("JWT_SECRET exists:", !!jwtSecret);

    if (!jwtSecret) {
      return WriteJSON(
        res,
        { success: false, data: null, error: "UNAUTHORIZED" },
        401,
      );
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload & {
      userId: string;
      role: "owner" | "customer";
    };

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.log("JWT Verification Error:", error);
    return WriteJSON(
      res,
      { success: false, data: null, error: "UNAUTHORIZED" },
      401,
    );
  }
}
