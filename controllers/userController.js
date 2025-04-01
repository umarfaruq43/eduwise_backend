const User = require("../models/UserModel");
const Course = require("../models/CourseModel");
const Job = require("../models/JobModel");
const bcrypt = require("bcryptjs");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

const getUserCount = async (req, res) => {
  try {
    const userCount = await User.countDocuments({ role: "user" });

    res.status(200).json({
      status: "success",
      message: "User count retrieved successfully",
      count: userCount,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve user count",
      error,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users

    res.status(200).json({
      status: "success",
      totalUsers: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve users",
      error: error.message,
    });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate(
      "enrolledCourses",
      "title description"
    );


    
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    const userDetails = user.toObject();
  

    delete userDetails.password;

    res.status(200).json({ status: "success", user: userDetails });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const updateUserDetails = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, email } = req.body;
    let { interests } = req.body;

    // Normalize interests to ensure it's always an array
    if (interests) {
      if (!Array.isArray(interests)) {
        if (typeof interests === "string" && interests.trim()) {
          interests = [interests]; // Convert single string to array
        } else {
          interests = []; // Default to an empty array
        }
      }
    }

    // Validate interests
    if (interests && interests.length === 0) {
      return res
        .status(400)
        .json({ error: "Please select at least one interest." });
    }

    const validInterests = [
      "Machine Learning",
      "Robotics",
      "Natural Language Processing (NLP)",
      "Cognitive Computing",
      "AI in Gaming",
    ];

    const invalidInterests = interests
      ? interests.filter((interest) => !validInterests.includes(interest))
      : [];
    if (invalidInterests.length > 0) {
      return res.status(400).json({
        error: `${invalidInterests.join(", ")} is/are not valid interest(s)`,
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if email is being updated to a new value and if it already exists
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: "Email is already in use" });
      }
    }

    // Update user fields
    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.interests = interests || user.interests;

    // Handle image upload if provided
    if (req.files && req.files.userImage) {
      const userImage = req.files.userImage;

      // Validate image type
      const allowedMimeTypes = ["image/jpeg", "image/png"];
      if (!allowedMimeTypes.includes(userImage.mimetype)) {
        return res.status(400).json({
          error: "Only JPEG and PNG images are allowed for user image!",
        });
      }

      // Upload the new image to Cloudinary
      const userImageResult = await cloudinary.uploader.upload(
        userImage.tempFilePath,
        {
          use_filename: true,
          folder: "edwise_images",
        }
      );

      // Update the user image field
      user.userImage = userImageResult.secure_url;

      // Delete the temp file after successful upload
      if (userImage.tempFilePath) {
        fs.unlink(userImage.tempFilePath, (err) => {
          if (err) {
            console.error("Error deleting temp file:", err);
          }
        });
      }
    }

    // Save the updated user details
    await user.save();

    res.status(200).json({
      status: "success",
      message: "User details updated successfully",
      user: {
        fullName: user.fullName,
        email: user.email,
        interests: user.interests,
        role: user.role,
        userImage: user.userImage,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const getUserEnrolledCourses = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate(
      "enrolledCourses"
    );

    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    res.status(200).json({
      status: "success",
      enrolledCourses: user.enrolledCourses,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const enrollUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

   
    

    if (!course) {
      return res
        .status(404)
        .json({ status: "error", message: "Course not found" });
    }

    const user = await User.findById(userId);


    

    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    if (user.enrolledCourses.includes(courseId)) {
      return res
        .status(400)
        .json({ status: "error", message: "Already enrolled in the course" });
    }

    user.enrolledCourses.push(courseId);


    

    const courseProgress = {
      courseId: course._id,
      sections: course.contents.map((section) => ({
        sectionTitle: section.sectionTitle,
        lessons: section.lessons.map((lesson) => ({
          lessonTitle: lesson.lessonTitle,
          watched: false, 
        })),
      })),
      status: "not started",
    };

    user.progress.push(courseProgress);

    await user.save();

    res.status(200).json({
      status: "success",
      message: "User successfully enrolled in this course",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const suggestJobsBasedOnInterests = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    if (!user.interests || user.interests.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "User has not specified any interests",
      });
    }

    const jobs = await Job.find({ category: { $in: user.interests } });

    res.status(200).json({
      status: "success",
      message: "Suggested jobs based on user interests",
      nbHits: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};


const suggestJobsBasedOnCourses = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).populate("enrolledCourses");
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    if (!user.enrolledCourses || user.enrolledCourses.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "User is not enrolled in any courses",
      });
    }
    const categories = [
      ...new Set(
        user.enrolledCourses.flatMap((course) => course.targetAudience)
      ),
    ];

    if (categories.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No categories found for the enrolled courses",
      });
    }

    const jobs = await Job.find({ category: { $in: categories } });

    res.status(200).json({
      status: "success",
      message: "Suggested jobs based on enrolled courses",
      nbHits: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const getUserCourseProgress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { courseId } = req.params;

    const user = await User.findById(userId).populate("enrolledCourses");
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    const enrolledCourse = user.enrolledCourses.find((ec) =>
      ec._id.equals(courseId)
    );

    if (!enrolledCourse) {
      return res.status(404).json({
        status: "error",
        message: "Course not found in user progress",
      });
    }

    const courseProgress = user.progress.find(
      (progress) => progress.courseId.toString() === courseId
    );

    if (!courseProgress) {
      return res.status(404).json({
        status: "error",
        message: "Course progress not found",
      });
    }

    const sectionProgress = courseProgress.sections.map((section) => {
      let completedLessons = 0;
      let notCompletedLessons = 0;

      section.lessons.forEach((lesson) => {
        if (lesson.watched) {
          completedLessons++;
        } else {
          notCompletedLessons++;
        }
      });

      return {
        sectionId: section._id,
        sectionTitle: section.sectionTitle,
        completedLessons,
        notCompletedLessons,
        totalLessons: section.lessons.length,
        sectionStatus:
          completedLessons === section.lessons.length
            ? "completed"
            : "in progress",
      };
    });

    const totalLessonsInCourse = courseProgress.sections.reduce(
      (total, section) => total + section.lessons.length,
      0
    );

    const completedLessonsInCourse = courseProgress.sections.reduce(
      (total, section) =>
        total + section.lessons.filter((lesson) => lesson.watched).length,
      0
    );

    const completedSections = sectionProgress.filter(
      (section) => section.sectionStatus === "completed"
    ).length;
    const totalSections = courseProgress.sections.length;

    const courseStatus =
      completedSections === totalSections ? "completed" : "in progress";

    const totalCourses = user.enrolledCourses.length;
    const totalCompletedCourses = user.progress.filter((progress) =>
      progress.sections.every((section) =>
        section.lessons.every((lesson) => lesson.watched)
      )
    ).length;

    res.status(200).json({
      status: "success",
      progress: sectionProgress,
      courseStatus,
      totalCourses,
      totalCompletedCourses,
      totalLessonsInCourse,
      completedLessonsInCourse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};




const markLessonWatched = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { courseId, sectionTitle, lessonTitle } = req.params;

    const user = await User.findById(userId).populate("enrolledCourses");
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    const courseProgress = user.progress.find(
      (progress) => progress.courseId.toString() === courseId
    );

    if (!courseProgress) {
      return res.status(404).json({
        status: "error",
        message: "Course not found in user progress",
      });
    }

    const section = courseProgress.sections.find(
      (sec) => sec.sectionTitle === sectionTitle
    );

    if (!section) {
      return res
        .status(404)
        .json({ status: "error", message: "Section not found" });
    }

    const lesson = section.lessons.find(
      (les) => les.lessonTitle === lessonTitle
    );

    if (!lesson) {
      return res
        .status(404)
        .json({ status: "error", message: "Lesson not found" });
    }

    if (lesson.watched) {
      return res.status(400).json({
        status: "error",
        message: "Lesson already marked as watched",
      });
    }

    lesson.watched = true;

    const sectionWatchedCount = section.lessons.filter(
      (les) => les.watched
    ).length;
    const sectionTotalLessons = section.lessons.length;

    const courseWatchedCount = courseProgress.sections.reduce(
      (total, sec) => total + sec.lessons.filter((les) => les.watched).length,
      0
    );
    const courseTotalLessons = courseProgress.sections.reduce(
      (total, sec) => total + sec.lessons.length,
      0
    );

    const allLessonsWatched = courseProgress.sections.every((sec) =>
      sec.lessons.every((les) => les.watched)
    );

    courseProgress.status = allLessonsWatched ? "completed" : "active";

    await user.save();

    res.status(200).json({
      status: "success",
      message: "Lesson marked as watched",
      sectionNumber:
        courseProgress.sections.findIndex(
          (sec) => sec.sectionTitle === sectionTitle
        ) + 1, 
      sectionTitle: section.sectionTitle,
      lessonTitle: lesson.lessonTitle,
      sectionWatchedCount,
      sectionTotalLessons,
      courseWatchedCount,
      courseTotalLessons,
      courseStatus: courseProgress.status,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};


/// Super Admin

const createAdmin = async (req, res) => {
  try {
    const { name, email } = req.body;

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ status: "error", message: "Admin already exists" });
    }

    // Create new admin
    const hashedPassword = await bcrypt.hash("12345678", 10); // Default password
    const newAdmin = new User({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    await newAdmin.save();

    res.status(201).json({ 
      status: "success", 
      message: "Admin created successfully", 
      admin: newAdmin 
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    // Toggle the user's status
    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      status: "success",
      message: `User ${user.isActive ? "enabled" : "disabled"} successfully`,
      user,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
};

module.exports = {
  getUserCount,
  enrollUser,
  getUserDetails,
  getUserEnrolledCourses,
  suggestJobsBasedOnCourses,
  getUserCourseProgress,
  markLessonWatched,
  updateUserDetails,
  suggestJobsBasedOnInterests,
  createAdmin,
  toggleUserStatus,
  getAllUsers
};
