const User = require("../models/UserModel");
const createTokenUser = require("../utils/createTokenUser");
const { createToken } = require("../utils/token");
const { handleValidationError } = require("../utils/handleError");
const Course = require("../models/CourseModel");
const bcrypt = require('bcryptjs')
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { log } = require("console");

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Please provide an email address" });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ error: "No user found with the provided email" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; 

    await user.save();

    const resetURL = `${process.env.FRONTEND_URL}/?token=${resetToken}`;
  
    

    const message = `
      <p>Forgot your password? Click the link below to reset it:</p>
      <p><a href="${resetURL}" target="_blank">${resetURL}</a></p>
      <p>If you did not request this, please ignore this email.</p>
    `;
 
    

    await sendEmail(
      user.email,
      "Password Reset Request",
      "Forgot your password? Click the link below to reset it.",
      message
    );

    return res.status(200).json({
      status: "success",
      message: "Password reset link sent to your email",
    });
  } catch (error) {
  

    res.status(500).json({
      error: "An error occurred, please try again later",
    });
  }
};


const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Token is invalid or expired" });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.status(200).json({
      status: "success",
      message: "Password has been reset successfully",
    });
  } catch (error) {
    if (
      error.message ==
      "User validation failed: password: Password must contain at least one uppercase letter, one number, and one special character"
    ) {
      return res.status(500).json({
        error:
          "Password must contain at least one uppercase letter, one number, and one special character",
      });
    }
    res.status(500).json({ error: "An error occurred, please try again" });
  }
};

const register = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    let interests = req.body.interests;
    if (!Array.isArray(interests)) {
      if (typeof interests === "string" && interests.trim()) {
        interests = [interests];
      } else {
        interests = [];
      }
    }

    // if (interests.length === 0) {
    //   return res
    //     .status(400)
    //     .json({ error: "Please select at least one interest." });
    // }

    // const validInterests = [
    //   "Machine Learning",
    //   "Robotics",
    //   "Natural Language Processing (NLP)",
    //   "Cognitive Computing",
    //   "AI in Gaming",
    // ];

    // const invalidInterests = interests.filter(
    //   (interest) => !validInterests.includes(interest)
    // );
    // if (invalidInterests.length > 0) {
    //   return res.status(400).json({
    //     error: `${invalidInterests.join(", ")} is/are not valid interest(s)`,
    //   });
    // }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const user = await User.create({
      fullName,
      email,
      password,
      interests,
      role,
    });

    const tokenUser = createTokenUser(user);
    const token = createToken({ user: tokenUser });

    return res.status(201).json({
      token,
      status: "success",
      message: "User created successfully",
      user: tokenUser,
    });
  } catch (error) {


    const { statusCode = 500, error: errorMessage = "Internal Server Error" } =
      handleValidationError(error);
    return res.status(statusCode).json({ error: errorMessage });
  }
};

const getSuggestedCourses = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const suggestedCourses = await Course.find({
      targetAudience: { $in: user.interests },
    });
    return suggestedCourses;
  } catch (error) {
   
    throw new Error("Error fetching suggested courses: " + error.message);
  }
};

const login = async (req, res) => {

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please provide email and password" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Email or password incorrect" });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(400).json({ error: "Email or password incorrect" });
    }

    const tokenUser = createTokenUser(user);
    const token = createToken({ user: tokenUser });

    return res.status(200).json({
      token,
      status: "success",
      message: "Login successful",
      user: tokenUser,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};


const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId; 

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({
          error: "Both current password and new password are required.",
        });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const isPasswordMatch = await user.comparePassword(currentPassword);
    if (!isPasswordMatch) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    if (
      !/[A-Z]/.test(newPassword) ||
      !/\d/.test(newPassword) ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
    ) {
      return res.status(400).json({
        error:
          "New password must contain at least one uppercase letter, one number, and one special character.",
      });
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    

    await User.findByIdAndUpdate(userId, { password: hashedPassword });
    

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    const { statusCode = 500, error: errorMessage = "Internal Server Error" } =
      handleValidationError(error);
    return res.status(statusCode).json({ error: errorMessage });
  }
};



module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword
};
