import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./Header";
import Footer from "./Footer";
import api from "../utility/axiosInterceptor.js";

const Page = () => {
  const { slug } = useParams();
  const [page, setPage] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await api.get(`/api/pages/${slug}`);
        setPage(response.data);
      } catch (error) {
        console.error("Error fetching page:", error);
      }
    };
    fetchPage();
  }, [slug]);

  if (!page) return <div>Loading...</div>;

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <div className="container py-4 flex-grow-1">
        <h1 className="mb-4">{page.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: page.content }} />
      </div>
      <Footer />
    </div>
  );
};

export default Page;