const express = require("express");
const router = express.Router();

const {
  getSingleCourse,
  getAllCourses,
  getLecturerCourses,
  getSuggestedCoursesForUser,
  createCourse,
  editCourse,
  addContentToCourse,
  editContentInCourse,
  deleteCourse,
  addQuizToCourse,
  submitQuizAnswers,
  editQuiz, 
  deleteQuiz,
  publishQuiz,
  editMultipleContentsInCourse,
  updateLessonWatched
} = require("../controllers/courseController"); 

const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication");

router
  .get("/all-courses", getAllCourses)
  .get("/courses/:courseId", getSingleCourse)
  .get("/suggested-courses", authenticateUser, getSuggestedCoursesForUser)
  .get("/lecturer/courses", authenticateUser, getLecturerCourses)
  .post(
    "/create-course",
    authenticateUser,
    authorizePermissions("lecturer"),
    createCourse
  )
  .patch(
    "/edit-course/:id",
    authenticateUser,
    authorizePermissions("lecturer"),
    editCourse
  )
  .post(
    "/add-content/:id",
    authenticateUser,
    authorizePermissions("lecturer"),
    addContentToCourse
  )
  
  .patch(
    "/edit-content/:id",
    authenticateUser,
    authorizePermissions("lecturer"),
    editMultipleContentsInCourse
  )
  .delete(
    "/delete-course/:id",
    authenticateUser,
    authorizePermissions("lecturer"),
    deleteCourse
  )
  .post("/courses/:courseId/quizzes", authenticateUser, addQuizToCourse)
  .post("/courses/:courseId/quizzes/:quizId/submit", authenticateUser, submitQuizAnswers)
  .put("/:courseId/quizzes/:quizId", authenticateUser, editQuiz)    
  .delete("/:courseId/quizzes/:quizId", authenticateUser, deleteQuiz) 
  .patch("/:courseId/quizzes/:quizId/publish", authenticateUser, publishQuiz)

module.exports = router;