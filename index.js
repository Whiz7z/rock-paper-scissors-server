import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import connectToDatabase from "./database.js";
import userRoutes from "./routes/userRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import { createServer } from "http";
import { Server } from "socket.io";
import roomHandlers from "./socketHandlers/roomHandlers.js";

connectToDatabase();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
  /* options */
});

const onConnection = (socket) => {
  roomHandlers(io, socket);

  console.log(socket.id);
};

io.on("connection", onConnection);

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
app.use("/api/rooms", roomRoutes);

app.get("/api/hello", async (req, res) => {
  res.send("helllo");
});

const port = process.env.PORT || 5000;

httpServer.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
// app.listen(port, () => {
//   console.log(`Server runs on poooooort ${port}. ${process.env.SERVER_URL}`);
// });
