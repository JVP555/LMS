/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const express = require("express");
const Sequelize = require("sequelize");
const router = express.Router();
const {
  User,
  Course,
  Chapter,
  Page,
  PageCompletion,
  UserCourses,
} = require("../models");

const { ensureLoggedIn, ensureRole, ensureStudent } = require("../middleware");

//______________________________________________Student Dashboard_________________________________________
router.get("/Student", ensureRole("student"), async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Fetch user's enrolled courses with educator info
    const user = await User.findByPk(userId, {
      include: {
        model: Course,
        as: "enrolledCourses",
        include: {
          model: User,
          attributes: ["firstname", "lastname"],
        },
      },
    });

    // Fetch all courses with educator info
    const allCourses = await Course.findAll({
      include: {
        model: User,
        attributes: ["firstname", "lastname"],
      },
    });

    // Enrollment count per course
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

    const enrolledCourseIds = user.enrolledCourses.map((course) => course.id);

    // ✅ Fetch all pages and their courseIds via Chapter
    const allPages = await Page.findAll({
      include: {
        model: Chapter,
        attributes: ["courseId"],
      },
    });

    // Total pages per course
    const totalPagesPerCourse = {};
    allPages.forEach((page) => {
      const courseId = page.Chapter?.courseId;
      if (courseId) {
        totalPagesPerCourse[courseId] =
          (totalPagesPerCourse[courseId] || 0) + 1;
      }
    });

    // ✅ Fetch user's completed pages with Chapter → courseId
    const completions = await PageCompletion.findAll({
      where: { userId },
      include: [
        {
          model: Page,
          include: {
            model: Chapter,
            attributes: ["courseId"],
          },
        },
      ],
    });

    // Completed pages per course
    const completedPagesPerCourse = {};
    completions.forEach((comp) => {
      const courseId = comp.Page?.Chapter?.courseId;
      if (courseId) {
        completedPagesPerCourse[courseId] =
          (completedPagesPerCourse[courseId] || 0) + 1;
      }
    });

    // Completion percentage per course
    const completionPercentage = {};
    user.enrolledCourses.forEach((course) => {
      const courseId = course.id;
      const total = totalPagesPerCourse[courseId] || 0;
      const completed = completedPagesPerCourse[courseId] || 0;
      completionPercentage[courseId] =
        total === 0 ? 100 : Math.round((completed / total) * 100);
    });

    // ✅ Render dashboard with progress info
    res.render("Student/student", {
      title: "Student Dashboard",
      user: req.session.user,
      enrolledCourses: user.enrolledCourses,
      showDashboardFeatures: true,
      showDashboardFeaturesstudent: true,
      breadcrumb: [{ label: "Dashboard" }],
      enrolledCourseIds,
      allCourses,
      enrollmentMap,
      completionPercentage, // <- pass to view
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      },
    });
  } catch (err) {
    console.error("Error loading student dashboard:", err);
    req.flash("error", "Failed to load dashboard.");
    res.redirect("/");
  }
});

// Enroll in a course
router.post("/enroll/:courseId", ensureRole("student"), async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.session.user.id;
    const referer = req.get("referer");

    const existing = await UserCourses.findOne({ where: { userId, courseId } });
    if (existing) {
      req.flash("error", "Already enrolled in this course.");

      // Redirect back to referer if exists, else fallback
      return res.redirect(referer || `/student/courses/${courseId}/chapters`);
    }

    await UserCourses.create({ userId, courseId });
    req.flash("success", "Successfully enrolled in the course.");

    // Redirect back to referer if exists, else fallback
    return res.redirect(referer || `/student/courses/${courseId}/chapters`);
  } catch (err) {
    req.flash("error", "Enrollment failed.");
    res.redirect("/Student");
  }
});

// View course chapters
router.get(
  "/student/courses/:courseId/chapters",
  ensureRole("student"),
  async (req, res) => {
    const courseId = req.params.courseId;
    const userId = req.session.user.id;

    try {
      // Fetch course with educator
      const course = await Course.findByPk(courseId, {
        include: {
          model: User,
          attributes: ["firstname", "lastname"],
        },
      });

      if (!course) {
        req.flash("error", "Course not found.");
        return res.redirect("/Student");
      }

      // Fetch chapters for this course
      const chapters = await Chapter.findAll({ where: { courseId } });

      // Fetch all pages for those chapters
      const chapterIds = chapters.map((ch) => ch.id);
      const pages = await Page.findAll({
        where: { chapterId: chapterIds },
        raw: true,
      });

      // Group pages by chapterId
      const pagesByChapter = {};
      pages.forEach((page) => {
        if (!pagesByChapter[page.chapterId]) {
          pagesByChapter[page.chapterId] = [];
        }
        pagesByChapter[page.chapterId].push(page.id);
      });

      // Fetch completed pages by user
      const completions = await PageCompletion.findAll({
        where: { userId },
        raw: true,
      });

      const completedPageIds = new Set(completions.map((c) => c.pageId));

      // Mark each chapter as completed if all its pages are completed, or no pages exist
      const chaptersWithCompletion = chapters.map((chapter) => {
        const pageIds = pagesByChapter[chapter.id] || [];
        const allCompleted =
          pageIds.length === 0 ||
          pageIds.every((id) => completedPageIds.has(id));

        return {
          ...chapter.toJSON(),
          completed: allCompleted,
        };
      });

      // Enrollment counts
      const allenrollments = await UserCourses.findAll({
        attributes: [
          "courseId",
          [Sequelize.fn("COUNT", Sequelize.col("userId")), "count"],
        ],
        group: ["courseId"],
        raw: true,
      });

      const enrollmentMap = {};
      allenrollments.forEach((e) => {
        enrollmentMap[e.courseId] = parseInt(e.count);
      });

      // User's enrolled course IDs
      const enrollments = await UserCourses.findAll({ where: { userId } });
      const enrolledCourseIds = enrollments.map((e) => e.courseId);

      res.render("Student/student-chapter", {
        title: "Course Chapters",
        course,
        chapters: chaptersWithCompletion,
        user: req.session.user,
        enrolledCourseIds,
        enrollmentMap,
        messages: {
          error: req.flash("error"),
          success: req.flash("success"),
        },
        showDashboardFeatures: false,
        showDashboardFeaturesstudent: false,
        breadcrumb: [
          { label: "Dashboard", href: "/Student" },
          { label: course.coursename },
        ],
      });
    } catch (err) {
      console.error("Failed to load chapters:", err);
      req.flash("error", "Failed to load chapters.");
      res.redirect("/Student");
    }
  }
);

// View chapter pages
router.get(
  "/student/chapters/:chapterId/pages",
  ensureRole("student"),
  async (req, res) => {
    try {
      const chapterId = req.params.chapterId;
      const userId = req.session.user.id;

      // Fetch the chapter and its course
      const chapter = await Chapter.findByPk(chapterId, {
        include: {
          model: Course,
          attributes: ["id", "coursename"],
        },
      });

      if (!chapter) {
        req.flash("error", "Chapter not found.");
        return res.redirect("/Student");
      }

      const courseId = chapter.courseId;

      // Check if user is enrolled in the course
      const enrollment = await UserCourses.findOne({
        where: { userId, courseId },
      });

      if (!enrollment) {
        req.flash("error", "You are not enrolled in this course.");
        return res.redirect("/Student");
      }

      // Fetch all pages of this chapter
      const pages = await Page.findAll({
        where: { chapterId },
        order: [["id", "ASC"]],
      });

      // Fetch all completed pages for this user
      const completions = await PageCompletion.findAll({
        where: {
          userId,
          pageId: pages.map((p) => p.id),
        },
      });

      const completedPageIds = new Set(completions.map((c) => c.pageId));

      // Annotate each page with completion status
      const pagesWithCompletion = pages.map((page) => {
        const plainPage = page.get({ plain: true }); // Same as toJSON()
        plainPage.complete = completedPageIds.has(page.id);
        return plainPage;
      });

      res.render("Student/student-page", {
        title: "Pages",
        chapter: {
          id: chapter.id,
          chaptername: chapter.chaptername,
          description: chapter.description,
          courseId: chapter.courseId,
          coursename: chapter.Course?.coursename || "Course",
        },
        pages: pagesWithCompletion,
        user: req.session.user,
        messages: {
          error: req.flash("error"),
          success: req.flash("success"),
        },
        showDashboardFeatures: false,
        showDashboardFeaturesstudent: false,
        breadcrumb: [
          { label: "Dashboard", href: "/Student" },
          {
            label: chapter.Course?.coursename,
            href: `/student/courses/${chapter.courseId}/chapters`,
          },
          { label: chapter.chaptername },
        ],
      });
    } catch (err) {
      console.error("Failed to load chapter pages:", err);
      req.flash("error", "Failed to load pages.");
      res.redirect("/Student");
    }
  }
);

// View page
router.get("/student/page/:id", ensureRole("student"), async (req, res) => {
  const pageId = req.params.id;
  const userId = req.session.user.id;

  try {
    const page = await Page.findByPk(pageId, {
      include: {
        model: Chapter,
        include: Course,
      },
    });

    if (!page) {
      req.flash("error", "Page not found.");
      return res.redirect("/Student");
    }

    const chapter = page.Chapter;
    const course = chapter?.Course;

    // Check enrollment
    const enrolled = await UserCourses.findOne({
      where: { userId, courseId: course.id },
    });

    if (!enrolled) {
      req.flash("error", "You are not enrolled in this course.");
      return res.redirect("/Student");
    }

    // Get page list to determine prev/next
    const allPages = await Page.findAll({
      where: { chapterId: chapter.id },
      order: [["id", "ASC"]],
    });

    const index = allPages.findIndex((p) => p.id === page.id);
    const prevPage = index > 0 ? allPages[index - 1] : null;
    const nextPage = index < allPages.length - 1 ? allPages[index + 1] : null;

    // Check completion
    const completed = await PageCompletion.findOne({
      where: { userId, pageId },
    });

    res.render("Student/student-pageview", {
      title: "Page View",
      page: {
        id: page.id,
        title: page.title,
        content: page.content,
        completed: !!completed,
      },
      ch: {
        id: chapter.id,
        chaptername: chapter.chaptername,
        courseId: course.id,
        coursename: course.coursename,
      },
      prevPage,
      nextPage,
      user: req.session.user,
      messages: {
        error: req.flash("error"),
        success: req.flash("success"),
      },
      showDashboardFeatures: false,
      showDashboardFeaturesstudent: false,
      breadcrumb: [
        { label: "Dashboard", href: "/Student" },
        {
          label: course.coursename,
          href: `/student/courses/${course.id}/chapters`,
        },
        {
          label: chapter.chaptername,
          href: `/student/chapters/${chapter.id}/pages`,
        },
        { label: page.title },
      ],
    });
  } catch (err) {
    console.error("Page load error:", err);
    req.flash("error", "Unable to load page.");
    res.redirect("/Student");
  }
});

// Mark page as completed
router.post(
  "/student/markCompleted/:id",
  ensureRole("student"),
  async (req, res) => {
    const pageId = req.params.id;
    const userId = req.session.user.id;

    try {
      const existing = await PageCompletion.findOne({
        where: { userId, pageId },
      });

      if (!existing) {
        await PageCompletion.create({ userId, pageId });
      }

      res.redirect("/student/page/" + pageId);
    } catch (err) {
      req.flash("error", "Could not mark page as completed.");
      res.redirect("/student/page/" + pageId);
    }
  }
);

// View report
router.get("/student/viewreport", ensureRole("student"), async (req, res) => {
  const userId = req.session.user.id;

  try {
    // Get student's enrolled courses
    const enrollments = await User.findByPk(userId, {
      include: {
        model: Course,
        as: "enrolledCourses",
      },
    });

    const enrolledCourses = enrollments.enrolledCourses;

    if (!enrolledCourses.length) {
      return res.render("Student/student-viewreport", {
        title: "Course Reports",
        user: req.session.user,
        reportData: [],
      });
    }

    // Fetch chapters
    const chapters = await Chapter.findAll({
      where: {
        courseId: enrolledCourses.map((c) => c.id),
      },
    });

    const chapterCountMap = {};
    chapters.forEach((ch) => {
      chapterCountMap[ch.courseId] = (chapterCountMap[ch.courseId] || 0) + 1;
    });

    // Fetch all pages
    const allPages = await Page.findAll({
      include: {
        model: Chapter,
        attributes: ["courseId"],
      },
    });

    const totalPagesPerCourse = {};
    allPages.forEach((page) => {
      const courseId = page.Chapter?.courseId;
      if (courseId) {
        totalPagesPerCourse[courseId] =
          (totalPagesPerCourse[courseId] || 0) + 1;
      }
    });

    // Fetch student's completed pages
    const completions = await PageCompletion.findAll({
      where: { userId },
      include: {
        model: Page,
        include: {
          model: Chapter,
          attributes: ["courseId"],
        },
      },
    });

    const completedPagesPerCourse = {};
    completions.forEach((comp) => {
      const courseId = comp.Page?.Chapter?.courseId;
      if (courseId) {
        completedPagesPerCourse[courseId] =
          (completedPagesPerCourse[courseId] || 0) + 1;
      }
    });

    // Construct report data
    const reportData = enrolledCourses.map((course) => {
      const courseId = course.id;
      const totalChapters = chapterCountMap[courseId] || 0;
      const totalPages = totalPagesPerCourse[courseId] || 0;
      const completedPages = completedPagesPerCourse[courseId] || 0;
      const percentage =
        totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 100;

      return {
        course,
        totalChapters,
        totalPages,
        percentage,
      };
    });

    res.render("Student/student-viewreport", {
      title: "Course Reports",
      user: req.session.user,
      reportData,
      showDashboardFeatures: false,
      showDashboardFeaturesstudent: false,
      breadcrumb: [
        { label: "Dashboard", href: "/Student" },
        { label: "Reports" },
      ],
    });
  } catch (err) {
    console.error("Error generating student report:", err);
    req.flash("error", "Unable to load report.");
    res.redirect("/Student");
  }
});

module.exports = router;
