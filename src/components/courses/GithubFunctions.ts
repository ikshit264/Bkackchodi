import axios from "axios";
import { ProgressCallback, createProgressUpdate } from "../../utils/github/progressTracker";

export async function CreateIssue (
    owner,
    repoName,
    ownerType,
    BatchProjectId,
    projectTitle,
    batchId,
    userId,
    steps,
    onProgress?: ProgressCallback
) {
    // Creating a new variable to store title and description along with index
    const stepSummaries = steps.map((step, index) => ({
        index: index,
        title: step.step.stepTitle,
        body: step.step.description,
        issueId: null, // Placeholder for storing issueId
        itemId: null,
    }));

    // Report: Creating repository
    onProgress?.(createProgressUpdate("creating_repo", "Creating GitHub repository...", 0, steps.length + 2));

    const repo = await axios.post("/api/ai/github/repo", {
        projectId : BatchProjectId,
        userId,
        repoName,
        desc: "This is a test repo",
    });

    console.log("batch proj Id", BatchProjectId)

    repoName = repo.data.RepoName

    // Report: Repository created
    onProgress?.(createProgressUpdate("repo_created", "Repository created successfully", 1, steps.length + 2));

    // OPTIMIZATION: Use bulk creation API for much faster performance
    onProgress?.(createProgressUpdate("bulk_creating_issues", `Creating ${steps.length} issues in bulk...`, 1, steps.length + 2));

    try {
        const bulkResponse = await axios.post("/api/ai/github/projects/bulk", {
            owner,
            userId,
            batchId,
            repoName: repoName,
            BatchProjectId,
            ownerType,
            projectTitle,
            issues: stepSummaries.map(step => ({
                title: step.title,
                body: step.body,
                label: "task",
            })),
        });

        if (bulkResponse.data.success) {
            // Update stepSummaries with results from bulk creation
            bulkResponse.data.results.forEach((result: { success: boolean; issueId?: string; itemId?: string }, index: number) => {
                if (result.success && result.issueId && result.itemId) {
                    stepSummaries[index].issueId = result.issueId;
                    stepSummaries[index].itemId = result.itemId;
                    
                    // Report progress for each issue
                    onProgress?.(createProgressUpdate(
                        "issue_created", 
                        `Issue ${index + 1}/${steps.length} created`, 
                        index + 2, 
                        steps.length + 2
                    ));
                }
            });

            // Report: All issues created
            onProgress?.(createProgressUpdate("completed", `All ${bulkResponse.data.totalCreated} issues created successfully`, steps.length + 2, steps.length + 2));
        } else {
            throw new Error("Bulk creation failed");
        }
    } catch (error) {
        console.error("Bulk creation failed, falling back to individual creation:", error);
        
        // Fallback to individual creation if bulk fails
        onProgress?.(createProgressUpdate("creating_issues", `Creating ${steps.length} issues...`, 1, steps.length + 2));

        const issuePromises = stepSummaries.map(async (step, index) => {
            try {
                const response = await axios.post("/api/ai/github/projects", {
                    owner,
                    userId,
                    batchId,
                    repoName : repoName,
                    BatchProjectId,
                    ownerType,
                    projectTitle,
                    issueLabel: "task",
                    issueTitle: step.title,
                    issueBody: step.body
                });

                if (response.data.success) {
                    step.issueId = response.data.issueId;
                    step.itemId = response.data.itemId;
                    console.log("Github Function", step.issueId, step.itemId);
                    
                    // Report progress for each issue
                    onProgress?.(createProgressUpdate(
                        "issue_created", 
                        `Issue ${index + 1}/${steps.length} created`, 
                        index + 2, 
                        steps.length + 2
                    ));
                } else {
                    console.error(`Failed to create issue for step ${step.index}`);
                }
            } catch (error) {
                console.error(`Error creating issue for step ${step.index}:`, error);
                onProgress?.(createProgressUpdate(
                    "error",
                    `Failed to create issue ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    index + 2,
                    steps.length + 2,
                    error instanceof Error ? error.message : 'Unknown error'
                ));
            }
            return step;
        });

        // Wait for all issues to be created in parallel
        const results = await Promise.allSettled(issuePromises);
        
        // Update stepSummaries with results
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                stepSummaries[index] = result.value;
            }
        });

        // Report: All issues created
        onProgress?.(createProgressUpdate("completed", "All issues created successfully", steps.length + 2, steps.length + 2));
    }

    console.log("stepSummaries", stepSummaries);
    return stepSummaries;
}
