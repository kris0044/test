import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminLayout from "./AdminLayout";
import api from "../utility/axiosInterceptor.js";
import { EditorContent, useEditor } from "@tiptap/react"; // TipTap imports
import StarterKit from "@tiptap/starter-kit";

const AdminPages = () => {
  const [pages, setPages] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // Will store HTML
  const [slug, setSlug] = useState("");
  const [editingPage, setEditingPage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const pagesPerPage = 10;

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML()); // Update content as HTML
    },
    editable: userRole === "admin", // Disable if not admin
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setUserRole(decoded.role);

      const response = await api.get("/api/pages");
      setPages(response.data);
    } catch (error) {
      console.error("Error fetching pages:", error);
      showToast("Error fetching pages");
    }
  };

  const showToast = (message) => {
    toast.info(message, { autoClose: 3000 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole !== "admin") return showToast("Only admins can manage pages.");
    const token = localStorage.getItem("token");

    try {
      if (editingPage) {
        await api.put(
          `/api/pages/${editingPage._id}`,
          { title, content, slug },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("Page updated successfully");
      } else {
        await api.post(
          "/api/pages",
          { title, content, slug },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("Page created successfully");
      }
      fetchPages();
      resetForm();
      setShowModal(false);
    } catch (error) {
      showToast(error.response?.data?.message || "Error saving page");
    }
  };

  const handleEdit = (page) => {
    if (userRole !== "admin") return showToast("Only admins can edit pages.");
    setTitle(page.title);
    setContent(page.content);
    if (editor) editor.commands.setContent(page.content); // Load content into editor
    setSlug(page.slug);
    setEditingPage(page);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (userRole !== "admin") return showToast("Only admins can delete pages.");
    const token = localStorage.getItem("token");

    try {
      await api.delete(`/api/pages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Page deleted successfully");
      fetchPages();
    } catch (error) {
      showToast("Error deleting page");
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    if (editor) editor.commands.setContent("");
    setSlug("");
    setEditingPage(null);
  };

  const filteredPages = pages.filter(
    (page) =>
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastPage = currentPage * pagesPerPage;
  const indexOfFirstPage = indexOfLastPage - pagesPerPage;
  const currentPages = filteredPages.slice(indexOfFirstPage, indexOfLastPage);
  const totalPages = Math.ceil(filteredPages.length / pagesPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <AdminLayout>
      <ToastContainer />

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="w-50">
          <input
            type="text"
            placeholder="Search by title or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
          disabled={userRole !== "admin"}
        >
          Add New Page
        </button>
      </div>

      <div
        className={`modal fade ${showModal ? "show d-block" : ""}`}
        tabIndex="-1"
        style={{ backgroundColor: showModal ? "rgba(0,0,0,0.5)" : "transparent" }}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editingPage ? "Edit Page" : "Add New Page"}</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              ></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="pageTitle" className="form-label">Title</label>
                  <input
                    type="text"
                    id="pageTitle"
                    placeholder="Page Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="form-control"
                    required
                    disabled={userRole !== "admin"}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="pageSlug" className="form-label">Slug</label>
                  <input
                    type="text"
                    id="pageSlug"
                    placeholder="Page Slug (e.g., about-us)"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="form-control"
                    required
                    disabled={userRole !== "admin"}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="pageContent" className="form-label">Content</label>
                  <EditorContent editor={editor} />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={userRole !== "admin"}
                >
                  {editingPage ? "Update Page" : "Create Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <h3 className="text-center">Manage Pages</h3>
      <div className="table-responsive">
        <table className="table table-bordered table-striped text-center">
          <thead className="table-dark">
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Created At</th>
              <th>Updated At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentPages.map((page) => (
              <tr key={page._id}>
                <td>{page.title}</td>
                <td>{page.slug}</td>
                <td>{new Date(page.createdAt).toLocaleDateString()}</td>
                <td>{new Date(page.updatedAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn btn-sm btn-warning me-2"
                    onClick={() => handleEdit(page)}
                    disabled={userRole !== "admin"}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(page._id)}
                    disabled={userRole !== "admin"}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <button
          className="btn btn-secondary"
          onClick={prevPage}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button
          className="btn btn-secondary"
          onClick={nextPage}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </AdminLayout>
  );
};

export default AdminPages;