import Room from "../models/Room.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

let rooms = {};

export default (io, socket) => {
  const createRoom = async (payload) => {
    const { roomId, token } = payload;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user) {
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
    } else {
      io.emit("room:create_error", "Cannot create room, not logged in");
      console.log("cannot create room, not authorized");
    }
  };

  const deleteRoom = async (payload) => {
    console.log(payload);
    const { roomId, token } = payload;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user) {
      const roomToDelete = await Room.findOne({ roomId: roomId }).populate(
        "players"
      );

      if (roomToDelete.players.length === 0) {
        await Room.deleteOne({ roomId: roomId });
      }

      io.emit("room:deleted", "room deleted");
    } else {
      console.log("cannot delete not authorized");
    }
  };

  const joinRoom = async (payload) => {
    let playersInTheRoom = [];
    const { roomId, token } = payload;

    let room = await Room.findOne({ roomId: roomId }).populate("players");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    console.log(
      "room",
      room.players.map((player) => player.nickname)
    );

    if (room.players.find((userId) => userId.id === user.id)) {
      rooms[roomId] = null;
      socket.join(roomId);

      const joinedRoom = await Room.findOne({ roomId: roomId }).populate(
        "players"
      );

      playersInTheRoom = joinedRoom.players.map((player) => player.nickname);
      await joinedRoom.save();
      io.to(roomId).emit("player:ready", {
        id: user._id,
        nickname: user.nickname,
        roomId: roomId,
        playersInTheRoom: playersInTheRoom,
      });
      io.emit("room:joined");

      console.log(
        "find first",
        room.players.find((userId) => userId._id === user._id)
      );
    } else if (room.players.length === 0) {
      rooms[roomId] = null;
      socket.join(roomId);
      room.players.push(user._id);
      await room.save();

      const joinedRoom = await Room.findOne({ roomId: roomId }).populate(
        "players"
      );

      playersInTheRoom = joinedRoom.players.map((player) => player.nickname);
      await joinedRoom.save();
      io.to(roomId).emit("player:ready", {
        id: user._id,
        nickname: user.nickname,
        roomId: roomId,
        playersInTheRoom: playersInTheRoom,
      });
      io.emit("room:joined");
    } else if (
      room.players.length === 1 &&
      room.players.find((userId) => userId.id != user.id)
    ) {
      rooms[roomId] = null;
      socket.join(roomId);

      room.players.push(user._id);
      await room.save();

      const joinedRoom = await Room.findOne({ roomId: roomId }).populate(
        "players"
      );

      playersInTheRoom = joinedRoom.players.map((player) => player.nickname);
      await joinedRoom.save();
      io.to(roomId).emit("player:ready", {
        id: user._id,
        nickname: user.nickname,
        roomId: roomId,
        playersInTheRoom: playersInTheRoom,
      });
      io.emit("room:joined");
    } else if (room.players.length === 2) {
      console.log("cannot go in");
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
    rooms[roomId] = null;
  };

  const makeMove = async (payload) => {
    const { roomId, choice, nickname } = payload;
    const room = await Room.findOne({ roomId: roomId }).populate("players");

    if (
      room.players.filter((player) => player.nickname === nickname).length >= 1
    ) {
      if (!rooms[roomId] || rooms[roomId].length === 0) {
        rooms[roomId] = [];
        rooms[roomId].push({
          nickname: nickname,
          choice: choice,
        });

        io.in(roomId).emit("player:move-made", rooms[roomId]);
        console.log("first move", rooms[roomId]);
      } else if (rooms[roomId][0].nickname !== nickname) {
        rooms[roomId].push({
          nickname: nickname,
          choice: choice,
        });

        console.log("second move", rooms[roomId]);
        // io.in(roomId).emit("player:move-made", rooms[roomId]);
        if (rooms[roomId][0].choice === rooms[roomId][1].choice) {
          io.in(roomId).emit("player:winner", {
            result: "draw",
            choices: rooms[roomId],
          });
          rooms[roomId] = [];
        } else if (
          rooms[roomId][0].choice === "scissors" &&
          rooms[roomId][1].choice === "paper"
        ) {
          let winner = await User.findOne({
            nickname: rooms[roomId][0].nickname,
          });

          winner.winrate.wins = winner.winrate.wins + 1;

          let loser = await User.findOne({
            nickname: rooms[roomId][1].nickname,
          });

          loser.winrate.loses = loser.winrate.loses + 1;
          await loser.save();
          await winner.save();
          io.in(roomId).emit("player:winner", {
            winner: rooms[roomId][0],
            choices: rooms[roomId],
          });
          rooms[roomId] = [];
        } else if (
          rooms[roomId][0].choice === "paper" &&
          rooms[roomId][1].choice === "scissors"
        ) {
          let winner = await User.findOne({
            nickname: rooms[roomId][1].nickname,
          });

          winner.winrate.wins = winner.winrate.wins + 1;

          let loser = await User.findOne({
            nickname: rooms[roomId][0].nickname,
          });

          loser.winrate.loses = loser.winrate.loses + 1;
          await loser.save();
          await winner.save();
          io.in(roomId).emit("player:winner", {
            winner: rooms[roomId][1],
            choices: rooms[roomId],
          });
          rooms[roomId] = [];
        } else if (
          rooms[roomId][0].choice === "scissors" &&
          rooms[roomId][1].choice === "rock"
        ) {
          let winner = await User.findOne({
            nickname: rooms[roomId][1].nickname,
          });

          winner.winrate.wins = winner.winrate.wins + 1;

          let loser = await User.findOne({
            nickname: rooms[roomId][0].nickname,
          });

          loser.winrate.loses = loser.winrate.loses + 1;
          await loser.save();
          await winner.save();
          io.in(roomId).emit("player:winner", {
            winner: rooms[roomId][1],
            choices: rooms[roomId],
          });
          rooms[roomId] = [];
        } else if (
          rooms[roomId][0].choice === "rock" &&
          rooms[roomId][1].choice === "scissors"
        ) {
          let winner = await User.findOne({
            nickname: rooms[roomId][0].nickname,
          });

          winner.winrate.wins = winner.winrate.wins + 1;

          let loser = await User.findOne({
            nickname: rooms[roomId][1].nickname,
          });

          loser.winrate.loses = loser.winrate.loses + 1;
          await loser.save();
          await winner.save();
          io.in(roomId).emit("player:winner", {
            winner: rooms[roomId][0],
            choices: rooms[roomId],
          });
          rooms[roomId] = [];
        } else if (
          rooms[roomId][0].choice === "paper" &&
          rooms[roomId][1].choice === "rock"
        ) {
          let winner = await User.findOne({
            nickname: rooms[roomId][0].nickname,
          });

          winner.winrate.wins = winner.winrate.wins + 1;

          let loser = await User.findOne({
            nickname: rooms[roomId][1].nickname,
          });

          loser.winrate.loses = loser.winrate.loses + 1;
          await loser.save();
          await winner.save();
          io.in(roomId).emit("player:winner", {
            winner: rooms[roomId][0],
            choices: rooms[roomId],
          });
          rooms[roomId] = [];
        } else if (
          rooms[roomId][0].choice === "rock" &&
          rooms[roomId][1].choice === "paper"
        ) {
          let winner = await User.findOne({
            nickname: rooms[roomId][1].nickname,
          });

          winner.winrate.wins = winner.winrate.wins + 1;

          let loser = await User.findOne({
            nickname: rooms[roomId][0].nickname,
          });

          loser.winrate.loses = loser.winrate.loses + 1;
          await loser.save();
          await winner.save();
          io.in(roomId).emit("player:winner", {
            winner: rooms[roomId][1],
            choices: rooms[roomId],
          });

          rooms[roomId] = [];
        }
      }
    }
  };

  socket.on("room:create", createRoom);
  socket.on("room:delete", deleteRoom);
  socket.on("room:join", joinRoom);
  socket.on("room:exit", exitRoom);
  socket.on("player:make-move", makeMove);
};
