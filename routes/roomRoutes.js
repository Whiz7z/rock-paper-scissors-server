import express from "express";
import asyncHandler from "express-async-handler";
import Room from "../models/Room.js";

const roomRoutes = express.Router();

const getAllRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({}, "-_id -__v");

  //console.log("rooms get", rooms);
  res.json(rooms);
});

roomRoutes.route("/").get(getAllRooms);

export default roomRoutes;
