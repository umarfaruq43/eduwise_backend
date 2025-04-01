const Course = require("../models/CourseModel");
const mongoose = require('mongoose')
const { extractValidationErrors } = require("../utils/handleError");


const getSingleCourse = async (req, res) => {
  try {
    const { courseId} = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "no course found"})
    }

    res.status(200).json({ status: "success", course})
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
}

const getAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find({});

    if (allCourses.length === 0) {
      return res.status(404).json({ message: "No courses found" });
    }

    res.status(200).json({ status: "success", allCourses });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

///Lecturer
const getLecturerCourses = async (req, res) => {
  try {
    // Ensure the authenticated user is a lecturer
    if (!req.user || req.user.role !== "lecturer") {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Only lecturers can view their courses.",
      });
    }

    const lecturerId = req.user.userId; // Get lecturer's ID from authenticated user
    const courses = await Course.find({ lecturer: lecturerId });

    res.status(200).json({
      status: "success",
      message: "Courses retrieved successfully",
      courses,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve courses",
      error,
    });
  }
};

const getSuggestedCoursesForUser = async (req, res) => {
  try {
    const interests = req.user.interests; 

    if (!interests || interests.length === 0) {
      return res
        .status(400)
        .json({ message: "No interests found for the user" });
    }

    const suggestedCourses = await Course.find({
      targetAudience: { $in: interests },
    });

    res.status(200).json({ status: "success", suggestedCourses });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const createCourse = async (req, res) => {
  try {
    // Ensure only lecturers can create courses
    if (req.user.role !== "lecturer") {
      return res.status(403).json({
        status: "error",
        message: "Only lecturers can create courses",
      });
    }

    // Create new course and assign lecturerId automatically
    const newCourse = new Course({
      ...req.body,
      lecturerId: req.user.userId,
    });

    await newCourse.save();

    res.status(201).json({
      status: "success",
      message: "Course created successfully",
      course: newCourse,
    });
  } catch (error) {
    const errorMessage = extractValidationErrors(error);

    res.status(400).json({
      status: "error",
      message: "Failed to create course",
      error: errorMessage,
    });
  }
};


const editCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const existingCourse = await Course.findById(courseId);

    if (!existingCourse) {
      return res.status(404).json({ status: "error", message: "Course not found" });
    }

    // Preserve existing contents if not provided in req.body
    const updatedData = { ...req.body };
    if (!req.body.contents) {
      updatedData.contents = existingCourse.contents;
    }

    const updatedCourse = await Course.findByIdAndUpdate(courseId, updatedData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: "success",
      message: "Course updated successfully",
      course: updatedCourse,
    });
  } catch (error) {
    console.error(error.message);
    res.status(400).json({ status: "error", message: "Failed to update course", error });
  }
};


const addContentToCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    let sections = req.body; // Can be a single object or an array

    // Ensure `sections` is always an array
    if (!Array.isArray(sections)) {
      sections = [sections];
    }

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        status: "error",
        message: "Course not found",
      });
    }

    // Assign section numbers based on existing sections
    const startingSectionNumber = course.contents.length + 1;

    const newSections = sections.map((section, index) => ({
      sectionTitle: section.sectionTitle,
      releaseDate: section.releaseDate,
      lessons: section.lessons,
      sectionNumber: startingSectionNumber + index,
    }));

    // Add sections to course
    course.contents.push(...newSections);

    // Save updated course
    await course.save();

    res.status(200).json({
      status: "success",
      message: "Contents added successfully",
      course,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: "Failed to add content",
      error: error.message,
    });
  }
};

const editContentInCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const contentId = req.params.contentId;
    const { sectionTitle, lessons } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ status: "error", message: "Course not found" });
    }

    const content = course.contents.id(contentId);
    if (!content) {
      return res
        .status(404)
        .json({ status: "error", message: "Content not found" });
    }

    content.sectionTitle = sectionTitle || content.sectionTitle;
    content.lessons = lessons || content.lessons;

    await course.save();

    res.status(200).json({
      status: "success",
      message: "Content updated successfully",
      course,
    });
  } catch (error) {
    res
      .status(400)
      .json({ status: "error", message: "Failed to update content", error });
  }
};

const editMultipleContentsInCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { contents } = req.body; // Expecting an array of content objects

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ status: "error", message: "Course not found" });
    }

    // Directly replace the contents array
    course.contents = contents;

    await course.save();

    res.status(200).json({
      status: "success",
      message: "Contents updated successfully",
      course,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ status: "error", message: "Failed to update contents", error });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const deletedCourse = await Course.findByIdAndDelete(courseId);

    if (!deletedCourse) {
      return res
        .status(404)
        .json({ status: "error", message: "Course not found" });
    }

    res.status(200).json({
      status: "success",
      message: "Course deleted successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to delete course", error });
  }
};


// quiz

const addQuizToCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { questions } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    for (const question of questions) {
      const correctAnswers = question.options.filter((opt) => opt.isCorrect);
      if (correctAnswers.length !== 1) {
        return res.status(400).json({
          message: `Each question must have exactly one correct answer. Issue in question: "${question.questionText}"`,
        });
      }
    }

    const quiz = { questions, _id: new mongoose.Types.ObjectId() };
    course.quizzes.push(quiz);

    await course.save();
  
    res.status(201).json({
      status: "success",
      message: "Quiz added successfully",
      quizId: quiz._id, 
      course,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



const submitQuizAnswers = async (req, res) => {
  try {
    const { courseId, quizId } = req.params;
    const { answers } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const quiz = course.quizzes.id(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (!quiz.published) {
      return res.status(400).json({ message: "Quiz is not published yet" });
    }

    if (answers.length !== quiz.questions.length) {
      return res.status(400).json({
        message: `Answers count (${answers.length}) does not match questions count (${quiz.questions.length}).`,
      });
    }

    let score = 0;
    quiz.questions.forEach((question, index) => {
      const selectedOption = answers[index];
      if (!selectedOption) return;

      const correctOption = question.options.find((opt) => opt.isCorrect);
      if (correctOption && correctOption.optionText === selectedOption) {
        score++;
      }
    });

    const percentage = Math.ceil((score / quiz.questions.length) * 100);

    // Compare with existing totalScore and update only if new score is higher
    if (!quiz.totalScore || percentage > quiz.totalScore) {
      quiz.totalScore = percentage;
    }
    quiz.attempts = quiz.attempts + 1;

    await course.save();

    res.status(200).json({
      status: "success",
      message: "Quiz submitted successfully",
      score: percentage,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const editQuiz = async (req, res) => {
  try {
    const { courseId, quizId } = req.params;
    const { questions } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const quiz = course.quizzes.id(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (quiz.published) {
      return res.status(403).json({ message: "Quiz cannot be edited after publishing" });
    }

    quiz.questions = questions;
    await course.save();

    res.status(200).json({
      status: "success",
      message: "Quiz updated successfully",
      updatedQuiz: quiz,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};



const deleteQuiz = async (req, res) => {
  try {
    const { courseId, quizId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const quizIndex = course.quizzes.findIndex((quiz) => quiz._id.toString() === quizId);
    if (quizIndex === -1) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (course.quizzes[quizIndex].published) {
      return res.status(403).json({ message: "Quiz cannot be deleted after publishing" });
    }

    course.quizzes.splice(quizIndex, 1);
    await course.save();

    res.status(200).json({
      status: "success",
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const publishQuiz = async (req, res) => {
  try {
    const { courseId, quizId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const quiz = course.quizzes.id(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (quiz.published) {
      return res.status(400).json({ message: "Quiz is already published" });
    }

    quiz.published = true;
    await course.save();

    res.status(200).json({
      status: "success",
      message: "Quiz has been published successfully",
      quiz,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};




module.exports = {
  getSingleCourse,
  getAllCourses,
  getSuggestedCoursesForUser,
  createCourse,
  editCourse,
  addContentToCourse,
  editMultipleContentsInCourse,
  editContentInCourse,
  deleteCourse,
  addQuizToCourse,
  submitQuizAnswers,
  editQuiz, 
  deleteQuiz,
  publishQuiz,
  getLecturerCourses,
};
