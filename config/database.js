import mongoose from "mongoose";

const databaseConnection = () => {
    mongoose.connect(process.env.MONGO_URI).then(() => {
        console.log("Connected to mongoDB");
    }).catch((error) => {
        console.log(error);
    })
}
export default databaseConnection;