import { Tweet } from "../models/tweetSchema.js";
import { User } from "../models/userSchema.js";
import cloudinary from "../config/cloudinary.js";

export const createTweet = async (req, res) => {
    try {
        const { description, id } = req.body;

        if (!description || !id) {
            return res.status(401).json({
                message: "All fields are required.",
                success: false
            });
        }

        // const user = await User.findById(id).select("-password");

        let mediaUrl = "";

        // If file exists, upload to Cloudinary
        if (req.file) {
            const result = await cloudinary.uploader.upload(
                `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
                {
                    resource_type: "auto" // IMPORTANT for videos
                }
            );

            mediaUrl = result.secure_url;
        }

        const newTweet = await Tweet.create({
            description,
            userId: id,
            media: mediaUrl
        });

        const populatedTweet = await Tweet.findById(newTweet._id)
            .populate("userId", "name username profilePicture");

        return res.status(201).json({
            message: "Tweet created successfully.",
            success: true,
            tweet: populatedTweet
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error",
            success: false
        });
    }
};



export const deleteTweet = async (req, res) => {
    try {
        const { id } = req.params;
        await Tweet.findByIdAndDelete(id);
        return res.status(200).json({
            message: "Tweet deleted successfully.",
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}



export const likeOrDislike = async (req, res) => {
    try {
        const loggedInUserId = req.body.id;
        const tweetId = req.params.id;
        const tweet = await Tweet.findById(tweetId);
        if (tweet.like.includes(loggedInUserId)) {
            // dislike
            await Tweet.findByIdAndUpdate(tweetId, { $pull: { like: loggedInUserId } });
            return res.status(200).json({
                message: "Tweet disliked successfully."
            })
        } else {
            // like
            await Tweet.findByIdAndUpdate(tweetId, { $push: { like: loggedInUserId } });
            return res.status(200).json({
                message: "Tweet liked successfully."
            })
        }
    } catch (error) {
        console.log(error);
    }
};



// export const getAllTweets = async (req, res) => {
//     // loggedInUser ka tweet + following user tweet
//     try {
//         const id = req.params.id;
//         const loggedInUser = await User.findById(id);
//         // const loggedInUserTweets = await Tweet.find({ userId: id });
//         const loggedInUserTweets = await Tweet.find()
//             .populate("userId", "name username profilePicture")
//             .sort({ createdAt: -1 });
//         const followingUserTweet = await Promise.all(loggedInUser.following.map((otherUsersId) => {
//             return Tweet.find({ userId: otherUsersId });
//         }));
//         return res.status(200).json({
//             tweets: loggedInUserTweets.concat(...followingUserTweet),
//         })
//     } catch (error) {
//         console.log(error);
//     }
// }

export const getAllTweets = async (req, res) => {
    try {
        const id = req.params.id;
        const loggedInUser = await User.findById(id);

        const tweets = await Tweet.find({
            userId: { $in: [id, ...loggedInUser.following] }
        })
            .populate("userId", "name username profilePicture")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            tweets
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
};



// export const getFollowingTweets = async (req, res) => {
//     try {
//         const id = req.params.id;
//         const loggedInUser = await User.findById(id);
//         const followingUserTweet = await Promise.all(loggedInUser.following.map((otherUsersId) => {
//             return Tweet.find({ userId: otherUsersId });
//         }));
//         return res.status(200).json({
//             tweets: [].concat(...followingUserTweet)
//         });
//     } catch (error) {
//         console.log(error);
//     }
// }

export const getFollowingTweets = async (req, res) => {
    try {
        const id = req.params.id;
        const loggedInUser = await User.findById(id);

        const tweets = await Tweet.find({
            userId: { $in: loggedInUser.following }
        })
            .populate("userId", "name username profilePicture")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            tweets
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
};
