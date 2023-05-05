import mongoose from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const Schema = mongoose.Schema;

const roomSchema = new Schema(
  {
    roomId: { type: String, required: true },
    players: [
      {
        type: mongoose.Types.ObjectId,
        ref: "User",
        validate: {
          validator: function (v, x, z) {
            return !(this.players.length > 2);
          },
          message: (props) => `${props.value} exceeds maximum array size (2)!`,
        },
      },
    ],
  },
  { collection: "Rooms" }
);

roomSchema.plugin(uniqueValidator);
const Room = mongoose.model("Room", roomSchema);

export default Room;
