const express = require("express");
const router = express.Router();

const {
  getSingleCourse,
  getAllCourses,
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
  editMultipleContentsInCourse
} = require("../controllers/courseController"); 

const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication");

router
  .get("/all-courses", getAllCourses)
  .get("/courses/:courseId", getSingleCourse)
  .get("/suggested-courses", authenticateUser, getSuggestedCoursesForUser)
  .post(
    "/create-course",
    authenticateUser,
    authorizePermissions("admin"),
    createCourse
  )
  .patch(
    "/edit-course/:id",
    authenticateUser,
    authorizePermissions("admin"),
    editCourse
  )
  .post(
    "/add-content/:id",
    authenticateUser,
    authorizePermissions("admin"),
    addContentToCourse
  )
  
  .patch(
    "/edit-content/:id",
    authenticateUser,
    authorizePermissions("admin"),
    editMultipleContentsInCourse
  )
  .delete(
    "/delete-course/:id",
    authenticateUser,
    authorizePermissions("admin"),
    deleteCourse
  )
  .post("/courses/:courseId/quizzes", addQuizToCourse)
  .post("/courses/:courseId/quizzes/:quizId/submit", submitQuizAnswers)
  .put("/:courseId/quizzes/:quizId", editQuiz)    
  .delete("/:courseId/quizzes/:quizId", deleteQuiz) 
  .patch("/:courseId/quizzes/:quizId/publish", publishQuiz);

module.exports = router;
