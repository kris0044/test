const Page = require("../models/Page");

// Get all pages
exports.getAllPages = async (req, res) => {
  try {
    const pages = await Page.find();
    res.status(200).json(pages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching pages", error });
  }
};

// Get a single page by slug
exports.getPageBySlug = async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug });
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.status(200).json(page);
  } catch (error) {
    res.status(500).json({ message: "Error fetching page", error });
  }
};

// Create a new page (Admin only)
exports.createPage = async (req, res) => {
  const { title, content, slug } = req.body;
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admins can create pages" });
  }
  try {
    const newPage = new Page({ title, content, slug });
    await newPage.save();
    res.status(201).json({ message: "Page created successfully", page: newPage });
  } catch (error) {
    res.status(500).json({ message: "Error creating page", error });
  }
};

// Update a page (Admin only)
exports.updatePage = async (req, res) => {
  const { title, content, slug } = req.body;
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admins can update pages" });
  }
  try {
    const page = await Page.findByIdAndUpdate(
      req.params.id,
      { title, content, slug, updatedAt: Date.now() },
      { new: true }
    );
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.status(200).json({ message: "Page updated successfully", page });
  } catch (error) {
    res.status(500).json({ message: "Error updating page", error });
  }
};

// Delete a page (Admin only)
exports.deletePage = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admins can delete pages" });
  }
  try {
    const page = await Page.findByIdAndDelete(req.params.id);
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.status(200).json({ message: "Page deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting page", error });
  }
};