import express from "express";
import User from "../models/User.js";
import asyncHandler from "express-async-handler";

import jwt from "jsonwebtoken";
const userRoutes = express.Router();

const genToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "60d" });
};

const loginUser = asyncHandler(async (req, res) => {
  const { nickname, password } = req.body;
  const user = await User.findOne({ nickname });

  console.log("userid", user._id);

  if (user && (await user.matchPasswords(password))) {
    res.status(201).json({
      _id: user._id,
      nickname: user.nickname,
      token: genToken(user._id),
      createdAt: user.createdAt,
    });
  } else {
    res.status(401).send("Invalid nickname or password");
    throw new Error("User not found.");
  }
});

const registerUser = asyncHandler(async (req, res) => {
  const { nickname, password } = req.body;

  const userExists = await User.findOne({ nickname });
  console.log("exist", userExists);
  if (userExists) {
    return res
      .status(400)
      .send(
        "We already have an account with that nickname, try to choose another."
      );
  }

  const user = await User.create({
    nickname,
    password,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      nickname: user.nickname,
      winrate: user.winrate,
      token: genToken(user._id),
    });
  } else {
    res.status(400).send("We could not register you.");
    throw new Error(
      "Something went wrong. Please check your data and try again."
    );
  }
});

userRoutes.route("/login").post(loginUser);
userRoutes.route("/register").post(registerUser);

export default userRoutes;
