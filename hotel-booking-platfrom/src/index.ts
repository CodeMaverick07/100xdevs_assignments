import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { route } from "./routes/routes.js";

const app = express();
dotenv.config();
const port = process.env.PORT;
const allowedHosts = process.env.ALLOWED_HOSTS
  ? process.env.ALLOWED_HOSTS.split(",")
  : [];
app.use(cors({ origin: allowedHosts, credentials: true }));

app.use(express.json());
app.use(cookieParser());

app.use("/api", route);

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
