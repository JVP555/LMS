/* eslint-disable no-unused-vars */
const express = require("express");
const router = express.Router();
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const {
  User,
  Course,
  Chapter,
  Page,
  UserCourses,
  PageCompletion,
} = require("../models");
const { ensureLoggedIn, ensureRole, ensureEducator } = require("../middleware");

//____________________________________________Educator Dashboard_________________________________________________

// Educator Dashboard
router.get("/Educator", ensureRole("educator"), async (req, res) => {
  const courses = await Course.findAll({
    include: {
      model: User,
      attributes: ["firstname", "lastname"],
    },
  });

  const enrollments = await UserCourses.findAll({
    attributes: [
      "courseId",
      [Sequelize.fn("COUNT", Sequelize.col("userId")), "count"],
    ],
    group: ["courseId"],
    raw: true,
  });

  const enrollmentMap = {};
  enrollments.forEach((e) => {
    enrollmentMap[e.courseId] = parseInt(e.count);
  });

  res.render("Educator/educator", {
    title: "Educator Dashboard",
    user: req.session.user, // already set during login
    courses,
    enrollmentMap,
    messages: {
      error: req.flash("error"),
      success: req.flash("success"),
    },
  });
});

// Course Creation
router.get("/courses/new", ensureRole("educator"), (req, res) => {
  res.render("Educator/create-course", {
    title: "Create Course",
    user: req.session.user,
    messages: { error: req.flash("error"), success: req.flash("success") },
  });
});

router.post("/courses", ensureRole("educator"), async (req, res) => {
  const { coursename } = req.body;
  try {
    const newCourse = await Course.create({
      coursename,
      userId: req.session.user.id,
    });
    req.flash("success", "Course created successfully.");
    res.redirect(`/my-chapters/${newCourse.id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to create course.");
    res.redirect("/courses/new");
  }
});

// Page View
router.get("/page/:pageId", ensureLoggedIn, async (req, res) => {
  const pageId = req.params.pageId;
  try {
    const page = await Page.findByPk(pageId, {
      include: [{ model: Chapter, include: [Course] }],
    });

    if (!page) {
      req.flash("error", "Page not found.");
      return res.redirect("/");
    }

    // Find the next page in the same chapter
    const nextPage = await Page.findOne({
      where: {
        chapterId: page.chapterId,
        id: { [Op.gt]: Number(pageId) },
      },
      order: [["id", "ASC"]],
    });

    // Find the previous page in the same chapter
    const prevPage = await Page.findOne({
      where: {
        chapterId: page.chapterId,
        id: { [Op.lt]: Number(pageId) },
      },
      order: [["id", "DESC"]],
    });

    res.render("Educator/educator-pageview", {
      title: page.title,
      user: req.session.user,
      page,
      nextPage,
      prevPage, // Include this in the render context
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      },
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred while loading the page.");
    res.redirect("/");
  }
});

router.get("/my-page/:pageId", ensureLoggedIn, async (req, res) => {
  const pageId = req.params.pageId;
  try {
    const page = await Page.findByPk(pageId, {
      include: [{ model: Chapter, include: [Course] }],
    });

    if (!page) {
      req.flash("error", "Page not found.");
      return res.redirect("/");
    }

    // Find the next page in the same chapter
    const nextPage = await Page.findOne({
      where: {
        chapterId: page.chapterId,
        id: { [Op.gt]: Number(pageId) },
      },
      order: [["id", "ASC"]],
    });

    // Find the previous page in the same chapter
    const prevPage = await Page.findOne({
      where: {
        chapterId: page.chapterId,
        id: { [Op.lt]: Number(pageId) },
      },
      order: [["id", "DESC"]],
    });

    res.render("Educator/educator-pageview", {
      title: "My View",
      user: req.session.user,
      page,
      nextPage,
      prevPage, // Include this in the render context
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      },
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred while loading the page.");
    res.redirect("/");
  }
});
// Mark Page Completed
router.post(
  "/markCompleted/:pageId",
  ensureRole("educator"),
  async (req, res) => {
    const pageId = req.params.pageId;
    const userId = req.session.user.id;
    const redirectTo = req.get("Referer") || `/page/${pageId}`;

    try {
      const page = await Page.findByPk(pageId, {
        include: {
          model: Chapter,
          include: {
            model: Course,
          },
        },
      });

      if (!page) {
        req.flash("error", "Page not found.");
        return res.redirect(redirectTo);
      }

      if (page.Chapter.Course.userId !== userId) {
        req.flash("error", "You are not authorized to mark this page.");
        return res.redirect(redirectTo);
      }

      page.completed = !page.completed;
      await page.save();

      req.flash(
        "success",
        `Page marked as ${
          page.completed ? "completed" : "not completed"
        } successfully.`
      );
      res.redirect(redirectTo);
    } catch (err) {
      console.error(err);
      req.flash(
        "error",
        "An error occurred while marking the page as completed."
      );
      res.redirect(redirectTo);
    }
  }
);

router.get("/courses/:courseId/chapters", ensureLoggedIn, async (req, res) => {
  const courseId = req.params.courseId;
  try {
    const chapters = await Chapter.findAll({ where: { courseId } });
    const course = await Course.findByPk(courseId);
    res.render("Educator/educator-chapter", {
      title: "Chapters",
      course,
      chapters,
      user: req.session.user,
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load chapters.");
    res.redirect("/Educator");
  }
});

router.get("/chapters/:chapterId/pages", ensureLoggedIn, async (req, res) => {
  const chapterId = req.params.chapterId;
  try {
    const chapter = await Chapter.findByPk(chapterId, {
      include: {
        model: Course,
      },
    });
    if (!chapter) {
      req.flash("error", "Chapter not found.");
      return res.redirect("/Educator");
    }

    const pages = await Page.findAll({ where: { chapterId } });

    res.render("Educator/educator-page", {
      title: "Pages",
      chapter,
      pages,
      user: req.session.user,
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load pages.");
    res.redirect("/Educator");
  }
});

router.get("/my-courses", ensureLoggedIn, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Fetch all courses created by the educator
    const myCourses = await Course.findAll({
      where: { userId },
    });

    // Fetch enrollment counts for these courses
    const enrollments = await UserCourses.findAll({
      where: {
        courseId: myCourses.map((course) => course.id),
      },
      attributes: [
        "courseId",
        [Sequelize.fn("COUNT", Sequelize.col("userId")), "count"],
      ],
      group: ["courseId"],
      raw: true,
    });

    const enrollmentMap = {};
    enrollments.forEach((e) => {
      enrollmentMap[e.courseId] = parseInt(e.count);
    });

    // Render the view with enrollment counts
    res.render("Educator/educator-course", {
      title: "My Courses",
      courses: myCourses,
      user: req.session.user,
      enrollmentMap, // <- pass this to view
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      },
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Error fetching your courses.");
    res.redirect("/Educator");
  }
});

// Edit Course Route (GET)
router.get(
  "/courses/:courseId/edit",
  ensureRole("educator"),
  async (req, res) => {
    const courseId = req.params.courseId;
    const redirectTo = req.query.redirectTo || "/Educator"; // default if not given

    try {
      const course = await Course.findByPk(courseId);
      if (!course || course.userId !== req.session.user.id) {
        req.flash("error", "You cannot edit this course.");
        return res.redirect(redirectTo);
      }

      res.render("Educator/create-course", {
        title: "Edit Course",
        course,
        courseId,
        redirectTo,
        messages: {
          error: req.flash("error"),
          success: req.flash("success"),
        },
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to load course for editing.");
      res.redirect(redirectTo); // redirecting back to where the user was
    }
  }
);

// Update Course Route (POST)
router.post("/courses/:courseId", ensureRole("educator"), async (req, res) => {
  const courseId = req.params.courseId;
  const { coursename } = req.body;
  const redirectTo = req.query.redirectTo || "/Educator"; // <-- FIXED

  try {
    const course = await Course.findByPk(courseId);
    if (!course || course.userId !== req.session.user.id) {
      req.flash("error", "You cannot edit this course.");
      return res.redirect(redirectTo); // redirect to the correct page
    }

    await course.update({ coursename });
    req.flash("success", "Course updated successfully.");
    res.redirect(redirectTo);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to update course.");
    res.redirect(`/courses/${courseId}/edit?redirectTo=${redirectTo}`); // sending back to the edit form
  }
});

// Delete Course Route (POST)
router.post(
  "/courses/:courseId/delete",
  ensureRole("educator"),
  async (req, res) => {
    const courseId = req.params.courseId;
    let redirectTo = req.query.redirectTo || "/Educator"; // Default to Educator dashboard

    // Make sure the redirectTo is a safe, relative path
    if (!redirectTo.startsWith("/") || redirectTo.includes("://")) {
      redirectTo = "/Educator"; // Fallback if the redirectTo is unsafe
    }

    try {
      const course = await Course.findByPk(courseId);
      if (!course || course.userId !== req.session.user.id) {
        req.flash("error", "You cannot delete this course.");
        return res.redirect(redirectTo); // Redirect back to safe location
      }
      await course.destroy();
      req.flash("success", "Course deleted successfully.");
      res.redirect(redirectTo); // Redirect after successful deletion
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to delete course.");
      res.redirect(redirectTo); // Redirect back to safe location in case of failure
    }
  }
);

// My Chapters (Educator)
router.get(
  "/my-chapters/:courseId",
  ensureRole("educator"),
  async (req, res) => {
    try {
      const courseId = req.params.courseId;
      const course = await Course.findByPk(courseId);

      if (!course) {
        req.flash("error", "Course not found.");
        return res.redirect("/Educator");
      }

      const chapters = await Chapter.findAll({
        where: { courseId },
      });

      res.render("Educator/educator-chapter", {
        title: "My Chapters",
        course,
        chapters,
        user: req.session.user,
        messages: {
          error: req.flash("error"),
          success: req.flash("success"),
        },
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error fetching your chapters.");
      res.redirect("/Educator");
    }
  }
);

router.get(
  "/my-courses/:courseId/my-chapters/new",
  ensureLoggedIn,
  ensureRole("educator"),
  async (req, res) => {
    const courseId = req.params.courseId;

    try {
      const course = await Course.findByPk(courseId, {
        attributes: ["id", "coursename"],
      });

      if (!course) {
        req.flash("error", "Course not found.");
        return res.redirect("/my-courses");
      }

      res.render("Educator/create-chapter", {
        title: "Create New Chapter",
        courseId: courseId,
        course, // ✅ pass course to the view
        chapter: null,
        messages: {
          error: req.flash("error"),
          success: req.flash("success"),
        },
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to load course.");
      res.redirect("/my-courses");
    }
  }
);

router.post(
  "/my-courses/:courseId/my-chapters",
  ensureLoggedIn,
  ensureRole("educator"),
  async (req, res) => {
    const courseId = req.params.courseId;
    try {
      const { chaptername, description } = req.body;

      await Chapter.create({
        courseId,
        chaptername,
        description,
      });

      req.flash("success", "Chapter created successfully.");
      res.redirect(`/my-chapters/${courseId}`); // 👈 redirect to where the request came from
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to create chapter.");
      res.redirect(`/my-chapters/${courseId}`);
    }
  }
);

// Edit Chapter Form
router.get(
  "/chapters/:chapterId/edit",
  ensureRole("educator"),
  async (req, res) => {
    try {
      const { chapterId } = req.params;

      const chapter = await Chapter.findByPk(chapterId, {
        include: {
          model: Course,
          attributes: ["id", "coursename", "userId"],
        },
      });

      if (!chapter) {
        req.flash("error", "Chapter not found.");
        return res.redirect("/Educator");
      }

      if (chapter.Course.userId !== req.session.user.id) {
        req.flash("error", "You cannot edit this chapter.");
        return res.redirect("/Educator");
      }

      res.render("Educator/create-chapter", {
        title: "Edit Chapter",
        chapter,
        courseId: chapter.Course.id,
        course: chapter.Course,
        messages: {
          error: req.flash("error"),
          success: req.flash("success"),
        },
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to load chapter for editing.");
      res.redirect("/Educator");
    }
  }
);

// Update Chapter
router.post(
  "/chapters/:chapterId",
  ensureRole("educator"),
  async (req, res) => {
    try {
      const { chapterId } = req.params;
      const { chaptername, description } = req.body;

      const chapter = await Chapter.findByPk(chapterId, {
        include: [{ model: Course }],
      });

      if (!chapter || chapter.Course.userId !== req.session.user.id) {
        req.flash("error", "You cannot edit this chapter.");
        return res.redirect("/educator");
      }

      await chapter.update({ chaptername, description });

      const courseId = chapter.Course.id;
      req.flash("success", "Chapter updated successfully.");
      res.redirect(`/my-chapters/${courseId}`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to update chapter.");
      res.redirect("/educator");
    }
  }
);

// Handle Chapter Deletion
router.post(
  "/chapters/:chapterId/delete",
  ensureRole("educator"),
  async (req, res) => {
    const { chapterId } = req.params;
    const redirectTo = req.query.redirectTo || "/my-chapters";

    // Validate the redirect URL
    if (!redirectTo.startsWith("/") || redirectTo.includes("://")) {
      return res.redirect("/my-chapters");
    }

    try {
      const chapter = await Chapter.findByPk(chapterId, {
        include: [{ model: Course }],
      });

      // Ensure the chapter exists and belongs to the logged-in educator
      if (!chapter || chapter.Course.userId !== req.session.user.id) {
        req.flash("error", "You cannot delete this chapter.");
        return res.redirect(redirectTo);
      }

      // Delete the chapter
      await chapter.destroy();
      req.flash("success", "Chapter deleted successfully.");
      res.redirect(redirectTo);
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to delete chapter.");
      res.redirect(redirectTo);
    }
  }
);
//pagessss
router.get(
  "/my-chapters/:chapterId/my-pages",
  ensureRole("educator"),
  async (req, res) => {
    const chapterId = req.params.chapterId;

    try {
      const chapter = await Chapter.findByPk(chapterId, {
        include: [Course],
      });

      if (!chapter) {
        req.flash("error", "Chapter not found.");
        return res.redirect("/Educator");
      }

      const pages = await Page.findAll({ where: { chapterId } });

      res.render("Educator/educator-page", {
        title: "My Pages",
        chapter,
        pages,
        user: req.session.user,
        messages: {
          error: req.flash("error"),
          success: req.flash("success"),
        },
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to load pages.");
      res.redirect("/Educator");
    }
  }
);

router.get(
  "/my-chapter/:chapterId/my-pages/new",
  ensureRole("educator"),
  async (req, res) => {
    const chapterId = req.params.chapterId;
    try {
      const chapter = await Chapter.findByPk(chapterId, {
        attributes: ["id", "chaptername"],
        include: {
          model: Course,
          attributes: ["id", "coursename"],
        },
      });

      if (!chapter) {
        req.flash("error", "Chapter not found.");
        return res.redirect("/Educator");
      }

      res.render("Educator/create-page", {
        title: "Create New Page",
        page: {},
        chapterId,
        chapter, // ✅ passing chapter with associated course
        messages: {
          error: req.flash("error"),
          success: req.flash("success"),
        },
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading the create page form.");
      res.redirect("/Educator");
    }
  }
);

router.post(
  "/my-chapter/:chapterId/my-pages",
  ensureRole("educator"),
  async (req, res) => {
    const { title, content } = req.body;
    const chapterId = req.params.chapterId;

    try {
      const chapter = await Chapter.findByPk(chapterId);
      if (!chapter) {
        req.flash("error", "Chapter not found.");
        return res.redirect(`/my-chapter/${chapterId}/my-pages/new`);
      }

      const page = await Page.create({
        title,
        content,
        chapterId,
      });

      req.flash("success", "Page created successfully.");
      res.redirect(`/my-chapters/${chapterId}/my-pages`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to create page.");
      res.redirect(`/my-chapter/${chapterId}/my-pages/new`);
    }
  }
);

// Edit Page Route (GET)
router.get("/pages/:pageId/edit", ensureRole("educator"), async (req, res) => {
  const pageId = req.params.pageId;
  try {
    const page = await Page.findByPk(pageId, {
      include: {
        model: Chapter,
        attributes: ["id", "chaptername"],
        include: {
          model: Course,
          attributes: ["id", "coursename"],
        },
      },
    });

    if (!page) {
      req.flash("error", "Page not found.");
      return res.redirect("/Educator");
    }

    res.render("Educator/create-page", {
      title: "Edit Page",
      page,
      chapterId: page.Chapter.id,
      chapter: page.Chapter,
      user: req.session.user,
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      },
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load page for editing.");
    res.redirect("/Educator");
  }
});

// Update Page Route (POST)
router.post("/pages/:pageId/edit", ensureRole("educator"), async (req, res) => {
  const pageId = req.params.pageId;
  const { title, content } = req.body;

  try {
    const page = await Page.findByPk(pageId);

    if (!page) {
      req.flash("error", "Page not found.");
      return res.redirect("/Educator");
    }

    await page.update({ title, content });

    const chapterId = page.chapterId;

    req.flash("success", "Page updated successfully.");
    res.redirect(`/my-chapters/${chapterId}/my-pages`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to update page.");
    res.redirect(`/pages/${pageId}/edit`);
  }
});

router.post(
  "/pages/:pageId/delete",
  ensureRole("educator"),
  async (req, res) => {
    const pageId = req.params.pageId;
    let redirectTo = req.query.redirectTo || "/Educator"; // fallback route

    // Validate redirectTo to be safe
    if (!redirectTo.startsWith("/") || redirectTo.includes("://")) {
      redirectTo = "/Educator";
    }

    try {
      const page = await Page.findByPk(pageId, {
        include: [{ model: Chapter }],
      });

      if (!page) {
        req.flash("error", "Page not found.");
        return res.redirect(redirectTo);
      }

      const courseOwnerId = await Course.findByPk(page.Chapter.courseId).then(
        (course) => course?.userId
      );

      if (courseOwnerId !== req.session.user.id) {
        req.flash("error", "You are not authorized to delete this page.");
        return res.redirect(redirectTo);
      }

      await page.destroy();
      req.flash("success", "Page deleted successfully.");
      res.redirect(redirectTo);
    } catch (err) {
      console.error(err);
      req.flash("error", "Failed to delete page.");
      res.redirect(redirectTo);
    }
  }
);
// View Report for a Course
router.get("/educator/viewreport", ensureRole("educator"), async (req, res) => {
  try {
    const educatorId = req.session.user.id;

    // Step 1: Get all courses created by this educator
    const educatorCourses = await Course.findAll({
      where: { userId: educatorId },
    });

    const educatorCourseIds = educatorCourses.map((c) => c.id);

    // Step 2: Count enrollments in each educator course
    const courseEnrollmentMap = {};
    for (const courseId of educatorCourseIds) {
      const count = await UserCourses.count({
        where: { courseId },
      });
      courseEnrollmentMap[courseId] = count;
    }

    // Step 3: Count total number of students enrolled in any course (not just this educator’s)
    const allEnrollments = await UserCourses.findAll({
      attributes: ["userId"],
    });
    const totalStudents = allEnrollments.length;

    // Step 4: Prepare report data
    const reportData = educatorCourses.map((course) => {
      const enrolledCount = courseEnrollmentMap[course.id] || 0;
      const percentage =
        totalStudents > 0
          ? ((enrolledCount / totalStudents) * 100).toFixed(2)
          : "0.00";

      return {
        course,
        enrolledCount,
        percentage,
      };
    });

    res.render("Educator/educator-viewreport", {
      title: "Course Enrollment Report",
      user: req.session.user,
      reportData,
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      },
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load reports.");
    res.redirect("/Educator");
  }
});

module.exports = router;
