import jwt from "jsonwebtoken";

const isAuthenticated = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({
                message: "User not authenticated.",
                success: false
            });
        }

        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
        req.user = decoded.userId;
        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token",
            success: false
        });
    }
};

export default isAuthenticated;