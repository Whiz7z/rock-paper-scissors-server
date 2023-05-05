import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    nickname: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      reuired: true,
    },
    winrate: {
      wins: { type: Number, default: 0 },
      loses: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);
userSchema.methods.matchPasswords = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);
export default User;
