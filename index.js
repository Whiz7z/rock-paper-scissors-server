import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import connectToDatabase from "./database.js";
import userRoutes from "./routes/userRoutes.js";

connectToDatabase();
const app = express();
app.use(helmet());
app.use(cors());

app.use(function (req, res, next) {
  // res.header("Access-Control-Allow-Origin", "*");
  const allowedOrigins = [process.env.CLIENT_URL];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-credentials", true);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, UPDATE");
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());

app.use("/api/users", userRoutes);

app.get("/api/hello", async (req, res) => {
  res.send("helllo");
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server runs on poooooort ${port}. ${process.env.SERVER_URL}`);
});
