import mongoose from "mongoose";

const connectToDatabase = async () => {
  try {
    mongoose.set("strictQuery", false);
    const connect = await mongoose.connect(
      `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@place-project.98ixmv4.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
    );

    console.log(`MongoDB Connected: ${connect.connection.host}`);
  } catch (error) {
    console.log(`Error of mongo: ${error.message}`);
  }
};

export default connectToDatabase;
