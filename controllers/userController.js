import { User } from "../models/userSchema.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinary.js";
import { Tweet } from "../models/tweetSchema.js";


export const Register = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        const file = req.file;
        // basic validation
        if (!name || !username || !email || !password) {
            return res.status(401).json({
                message: "All fields are required.",
                success: false
            })
        }
        const user = await User.findOne({ email });
        if (user) {
            return res.status(401).json({
                message: "User already exists.",
                success: false
            })
        }
        const hashedPassword = await bcryptjs.hash(password, 10);

        let profilePicUrl = "";

        if (file) {
            const result = await cloudinary.uploader.upload(
                `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
                { folder: "twitter_clone_profiles" }
            );
            profilePicUrl = result.secure_url;
        }

        await User.create({
            name,
            username,
            email,
            profilePicture: profilePicUrl,
            password: hashedPassword
        });
        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        })

    } catch (error) {
        console.log(error);
    }
}



export const Login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({
                message: "All fields are required.",
                success: false
            })
        };
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false
            })
        }
        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                message: "Incorect email or password",
                success: false
            });
        }
        const tokenData = {
            userId: user._id
        }
        const token = await jwt.sign(tokenData, process.env.TOKEN_SECRET, { expiresIn: "1d" });

        const isProduction = process.env.NODE_ENV === "production";

        res.status(200).cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "None" : "Lax",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        }).json({
            message: `Welcome back ${user.name}`,
            user,
            success: true
        });
    } catch (error) {
        console.log(error);
    }
}



export const logout = (req, res) => {
    return res.cookie("token", "", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        expires: new Date(0)
    }).json({
        message: "Logged out successfully.",
        success: true
    });
}



export const updateProfilePicture = async (req, res) => {
    try {
        // const userId = req.body.id; 
        const userId = req.user;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                message: "No file uploaded",
                success: false
            });
        }

        // Upload to cloudinary
        const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
            {
                folder: "twitter_clone_profiles"
            }
        );

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { profilePicture: result.secure_url },
            { returnDocument: "after" }
        ).select("-password");

        return res.status(200).json({
            message: "Profile picture updated successfully",
            user: updatedUser,
            success: true
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error",
            success: false
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user;
        const { name, bio } = req.body;

        let profilePicUrl;
        let coverPhotoUrl;

        if (req.files?.profilePicture) {
            const result = await cloudinary.uploader.upload(
                `data:${req.files.profilePicture[0].mimetype};base64,${req.files.profilePicture[0].buffer.toString("base64")}`
            );
            profilePicUrl = result.secure_url;
        }

        if (req.files?.coverPhoto) {
            const result = await cloudinary.uploader.upload(
                `data:${req.files.coverPhoto[0].mimetype};base64,${req.files.coverPhoto[0].buffer.toString("base64")}`
            );
            coverPhotoUrl = result.secure_url;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                name,
                bio,
                ...(profilePicUrl && { profilePicture: profilePicUrl }),
                ...(coverPhotoUrl && { coverPhoto: coverPhotoUrl })
            },
            { returnDocument: "after" }
        ).select("-password");

        res.status(200).json({
            success: true,
            user: updatedUser
        });

    } catch (error) {
        console.log(error);
    }
};


export const bookmark = async (req, res) => {
    try {
        const loggedInUserId = req.body.id;
        const tweetId = req.params.id;
        const user = await User.findById(loggedInUserId);
        if (user.bookmarks.includes(tweetId)) {
            // remove
            await User.findByIdAndUpdate(loggedInUserId, { $pull: { bookmarks: tweetId } });
            return res.status(200).json({
                message: "Removed from bookmarks."
            });
        } else {
            // bookmark
            await User.findByIdAndUpdate(loggedInUserId, { $push: { bookmarks: tweetId } });
            return res.status(200).json({
                message: "Saved to bookmarks."
            });
        }
    } catch (error) {
        console.log(error);
    }
};



export const getMyProfile = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findById(id).select("-password");
        const tweetCount = await Tweet.countDocuments({ userId: id });
        return res.status(200).json({
            user,
            tweetCount
        })
    } catch (error) {
        console.log(error);
    }
};



export const getOtherUsers = async (req, res) => {
    try {
        const { id } = req.params;
        const otherUsers = await User.find({ _id: { $ne: id } }).select("-password");
        if (!otherUsers) {
            return res.status(401).json({
                message: "Currently do not have any users."
            })
        };
        return res.status(200).json({
            otherUsers
        })
    } catch (error) {
        console.log(error);
    }
}



export const follow = async (req, res) => {
    try {
        const loggedInUserId = req.body.id;
        const userId = req.params.id;
        const loggedInUser = await User.findById(loggedInUserId);//patel
        const user = await User.findById(userId);//keshav
        if (!user.followers.includes(loggedInUserId)) {
            await user.updateOne({ $push: { followers: loggedInUserId } });
            await loggedInUser.updateOne({ $push: { following: userId } });
        } else {
            return res.status(400).json({
                message: `You just unfollowed ${user.name}`
            })
        };
        return res.status(200).json({
            message: `You just followed ${user.name}`,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}


export const unfollow = async (req, res) => {
    try {
        const loggedInUserId = req.body.id;
        const userId = req.params.id;
        const loggedInUser = await User.findById(loggedInUserId);//patel
        const user = await User.findById(userId);//keshav
        if (loggedInUser.following.includes(userId)) {
            await user.updateOne({ $pull: { followers: loggedInUserId } });
            await loggedInUser.updateOne({ $pull: { following: userId } });
        } else {
            return res.status(400).json({
                message: `You have not followed ${user.name} yet.`
            })
        };
        return res.status(200).json({
            message: `You just unfollowed ${user.name}`,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}