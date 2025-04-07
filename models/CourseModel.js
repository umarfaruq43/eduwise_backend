const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    duration: { type: Number, required: true },
    lecturer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    enrolledStudents: { type: Number, required: true },
    description: { type: String, required: true },
    objectives: { type: String, required: true },
    targetAudience: {
      type: [String],
      enum: [
        "Machine Learning",
        "Robotics",
        "Natural Language Processing (NLP)",
        "Cognitive Computing",
        "AI in Gaming",
      ],
    },
    language: {
      type: String,
      enum: ["english", "spanish", "french", "german"],
    },
    level: { type: String, enum: ["beginner", "intermediate", "advanced"] },
    price: { type: Number, required: true, min: 0 },
    certificate: { type: Boolean, default: true },
    imageUrl: {
      type: String,
    },
    contents: [
      {
        sectionNumber: { type: Number, required: true },
        sectionTitle: { type: String, required: true },
        releaseDate: { type: Date },
        lessons: [
          {
            lessonTitle: { type: String, required: true },
            documentUrl:  { type: String, required: false },
            videoUrl: {
              type: String,
              required: true,
            },
            duration: { type: Number, required: true },
            watched: { type: Boolean, default: false }, 
            watchedAt: { type: Date },
          },
        ],
      },
    ],
    progress: { type: Number, default: 0, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },

    quizzes: [
      {
        questions: [
          {
            questionText: String,
            options: [
              {
                optionText: String,
                isCorrect: Boolean,
              },
            ],
          },
        ],
        totalScore: { type: Number, default: 0, min: 0, max: 100 },
        published: { type: Boolean, default: false },
        attempts: { type: Number, default: 0 },
      },
    ],
  },

  { timestamps: true }
);

CourseSchema.pre("save", function (next) {
  if (this.isNew && this.contents.length > 0) {
    // Loop through each section and assign sectionNumber
    this.contents.forEach((section, index) => {
      // Assign sectionNumber only if it's not already set
      if (!section.sectionNumber) {
        section.sectionNumber = index + 1; // Assign section number based on index
      }
    });
  }
  next();
});


module.exports = mongoose.model("Course", CourseSchema);
