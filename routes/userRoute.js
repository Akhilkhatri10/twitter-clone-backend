import express from "express";
import { Login, Register, bookmark, follow, getMyProfile, getOtherUsers, logout, unfollow, updateProfile, updateProfilePicture } from "../controllers/userController.js";
import isAuthenticated from "../config/auth.js";
import upload from "../config/multer.js";
const router = express.Router();

router.route("/register").post(upload.single("profilePicture"), Register);
router.route("/login").post(Login);
router.route("/logout").get(logout);
router.route("/bookmark/:id").put(isAuthenticated, bookmark)
router.route("/profile/:id").get(isAuthenticated, getMyProfile);
router.route("/otheruser/:id").get(isAuthenticated, getOtherUsers);
router.route("/follow/:id").post(isAuthenticated, follow);
router.route("/unfollow/:id").post(isAuthenticated, unfollow);
router.route("/update-profile-picture").put(isAuthenticated, upload.single("profilePicture"), updateProfilePicture);
router.route("/update-profile").put(isAuthenticated, upload.fields([{ name: "profilePicture", maxCount: 1 }, { name: "coverPhoto", maxCount: 1 }]), updateProfile);

export default router;