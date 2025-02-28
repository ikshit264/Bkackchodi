import axios from "axios";

export const uploadCourse = async (title, description, batches) => {
  try {
    const response = await axios.post("/api/query/courseandprojects", {
      title,
      description,
      batches,
    });

    if (!(response.status === 201 || response.status === 200)) {
      const jsondata = await response.data;
      throw new Error(jsondata.message ?? jsondata.error);
    }
  } catch (err) {
    console.error("Error uploading course:", err);
  }
};
