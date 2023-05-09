import express from "express";
import asyncHandler from "express-async-handler";
import Room from "../models/Room.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const roomRoutes = express.Router();

const getAllRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({}, "-_id -__v").populate(
    "players",
    "-password -createdAt -updatedAt -v"
  );

  //console.log("rooms get", rooms);
  res.json(rooms);
});

const getPlayersInTheRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.query;
  //console.log("body", req.query);
  const room = await Room.findOne({ roomId: roomId }).populate(
    "players",
    "-password"
  );

  res.json(room.players.map((player) => player.nickname));
});

const joinTheRoom = asyncHandler(async (req, res) => {
  const { roomId, token } = req.body;

  let roomToJoin = await Room.findOne({ roomId: roomId }).populate("players");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id);

  let room = await Room.findOne({ roomId: roomId }).populate("players");

  if (user) {
    if (
      !(room.players.length >= 2) &&
      room.players.filter((player) => player._id === user._id).length === 0
    ) {
      room.players.push(user._id);
      await room.save().then(() => {
        res.json({ room: room, isJoined: true });
      });
    } else if (
      !(room.players.length >= 2) &&
      room.players.filter((player) => player._id === user._id).length === 1
    ) {
      res.json({ room: room, isJoined: true });
    } else {
      res.json({ room: room, isJoined: false });
    }
  } else {
    res.status(400).send("You are not logged in");
  }
});

roomRoutes.route("/").get(getAllRooms);
roomRoutes.route("/getplayers").get(getPlayersInTheRoom);
roomRoutes.route("/join").post(joinTheRoom);

export default roomRoutes;
