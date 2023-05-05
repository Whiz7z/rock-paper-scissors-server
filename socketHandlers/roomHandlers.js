import Room from "../models/Room.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

let rooms = {};

export default (io, socket) => {
  const createRoom = async (payload) => {
    const roomId = payload.roomId;

    let rooms = await Room.find({ roomId: roomId });
    // console.log("roooms", rooms);
    if (rooms.length <= 0) {
      const createdRoom = await Room.create({
        roomId: roomId,
        players: [],
      });

      await createdRoom.save();

      io.emit("room:created", createdRoom);
    }
  };

  const deleteRoom = async (payload) => {
    console.log(payload);
    const roomId = payload;
    let roomsAfterDeleting = [];
    const roomToDelete = await Room.findOne({ roomId: roomId }).populate(
      "players"
    );

    //console.log("room to delete", roomToDelete);

    if (roomToDelete.players.length === 0) {
      await Room.deleteOne({ roomId: roomId });
    }

    io.emit("room:deleted", "room deleted");
  };

  const joinRoom = async (payload) => {
    let playersInTheRoom = [];
    const { roomId, token } = payload;

    let room = await Room.findOne({ roomId: roomId }).populate("players");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (
      room.players.length < 2 &&
      room.players.filter((player) => player.id === user.id).length === 0
    ) {
      socket.join(roomId);
      room.players.push(user.id);
      await room.save();

      const joinedRoom = await Room.findOne({ roomId: roomId }).populate(
        "players"
      );
      console.log("saved", joinedRoom.players);
      playersInTheRoom = joinedRoom.players.map((player) => player.nickname);
      console.log("player in the room", playersInTheRoom);
      io.to(roomId).emit("player:ready", {
        id: user._id,
        nickname: user.nickname,
        roomId: roomId,
        playersInTheRoom: playersInTheRoom,
      });
      io.emit("room:joined", { id: user._id, nickname: user.nickname });
    } else if (
      !(room.players.length >= 2) &&
      room.players.filter((player) => player.id === user.id).length === 1
    ) {
      socket.join(roomId);
      const joinedRoom = await Room.findOne({ roomId: roomId }).populate(
        "players"
      );
      playersInTheRoom = joinedRoom.players.map((player) => player.nickname);
      io.to(roomId).emit("player:ready", {
        id: user._id,
        nickname: user.nickname,
        roomId: roomId,
        playersInTheRoom: playersInTheRoom,
      });
      io.emit("room:joined", {
        id: user._id,
        nickname: user.nickname,
        roomId: roomId,
      });
    } else {
      io.emit("room:notjoined", "Room is full");
    }
  };

  const exitRoom = async (payload) => {
    let playersInTheRoom = [];
    const { roomId, token } = payload;
    let room = await Room.findOne({ roomId: roomId }).populate("players");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    room.players = room.players.filter((player) => player.id !== user.id);
    await room.save().then(() => {
      socket.leave(roomId);
      io.emit("room:exited", "room exited");
    });

    const joinedRoom = await Room.findOne({ roomId: roomId }).populate(
      "players"
    );
    playersInTheRoom = joinedRoom.players.map((player) => player.nickname);
    io.to(roomId).emit("player:exited", { playersInTheRoom: playersInTheRoom });
  };

  const makeMove = async (payload) => {
    const { roomId, choice, nickname } = payload;

    if (!rooms[roomId] || rooms[roomId].length === 0) {
      rooms[roomId] = [];
      rooms[roomId].push({
        nickname: nickname,
        choice: choice,
      });

      io.in(roomId).emit("player:move-made", rooms[roomId]);
    } else {
      rooms[roomId].push({
        nickname: nickname,
        choice: choice,
      });
      console.log("Rooms after first move of player", rooms);
      // io.in(roomId).emit("player:move-made", rooms[roomId]);
      if (rooms[roomId][0].choice === rooms[roomId][1].choice) {
        io.in(roomId).emit("player:winner", {
          result: "draw",
          choices: rooms[roomId],
        });
      } else if (
        rooms[roomId][0].choice === "scissors" &&
        rooms[roomId][1].choice === "paper"
      ) {
        let winner = await User.findOne({
          name: rooms[roomId][0].nickname,
        });

        winner.winrate.wins = winner.winrate.wins + 1;

        let loser = await User.findOne({
          name: rooms[roomId][1].nickname,
        });

        loser.winrate.loses = loser.winrate.loses + 1;
        await loser.save();
        await winner.save();
        io.in(roomId).emit("player:winner", {
          winner: rooms[roomId][0],
          choices: rooms[roomId],
        });
      }
    }
  };

  socket.on("room:create", createRoom);
  socket.on("room:delete", deleteRoom);
  socket.on("room:join", joinRoom);
  socket.on("room:exit", exitRoom);
  socket.on("player:make-move", makeMove);
};
