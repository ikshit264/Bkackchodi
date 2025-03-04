import { useState } from "react";

export default function CreateGithubProjectButton({ Batchid, userId, projectid, stepIndex }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/ai/github/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: "ikshit264",
          repoName: "Konix",
          ownerType: "user",
          BatchProjectId : projectid,
          stepIndex : stepIndex,
          projectTitle: "Static Project Title",
          issueTitle: "Static Issue Title",
          issueBody: "Static Issue Body",
          issueLabel: "bug",
          batchId: Batchid,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setSuccess("Project created successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleClick} disabled={loading} style={{
        backgroundColor: "blue",
        color: "white",
        padding: "10px 20px",
        border: "none",
        cursor: "pointer",
        fontSize: "16px"
      }}>
        {loading ? "Creating..." : "Create GitHub Project"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}
    </div>
  );
}
