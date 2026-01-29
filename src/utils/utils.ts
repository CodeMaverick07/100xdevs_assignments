import bcrypt from "bcrypt";
import { Response } from "express";

type JsonResponse = {
  success: boolean;
  data: any;
  error: unknown;
};

export async function WriteJSON(
  res: Response,
  data: JsonResponse,
  statusCode: number,
) {
  return res.status(statusCode).json(data);
}

export async function HashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function ComparePassword(hash: string, password: string) {
  return await bcrypt.compare(password, hash);
}
