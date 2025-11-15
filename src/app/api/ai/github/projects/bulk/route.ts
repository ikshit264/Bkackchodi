import { NextRequest, NextResponse } from "next/server";
import { CreateProject } from "../../../../../../utils/github/GithubProjectBackchodi";
import { GithubTokenExtract } from "../../../../../../utils/github/GithubBackchodi";
import getPrismaClient from "../../../../../../lib/prisma";
import axios, { AxiosError } from "axios";

const prisma = getPrismaClient();

interface BulkIssue {
  title: string;
  body: string;
  label?: string;
}

interface StatusFieldNode {
  id: string;
  name: string;
  options?: Array<{ id: string; name: string }>;
}

interface SuccessfulIssue {
  success: true;
  issueId: string;
  issueNumber: number;
  htmlUrl: string;
  itemId?: string | null;
  error?: string;
}

interface FailedIssue {
  success: false;
  error: string;
  index?: number;
}

/**
 * Bulk create issues and add them to project
 * This is much faster than creating issues one by one
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      owner,
      userId,
      batchId,
      repoName,
      BatchProjectId,
      ownerType,
      projectTitle,
      issues, // Array of { title, body, label }
    } = body;

    if (!owner || !userId || !repoName || !ownerType || !projectTitle || !batchId || !BatchProjectId || !Array.isArray(issues)) {
      return NextResponse.json(
        { error: "Missing required parameters or invalid issues array" },
        { status: 400 }
      );
    }

    const githubToken = await GithubTokenExtract(userId);
    if (!githubToken) {
      return NextResponse.json({ error: "GitHub token not found" }, { status: 401 });
    }

    // Find or create GitHub project
    const projectRecord = await prisma.batch.findFirst({
      where: { id: batchId },
      select: { githubProjectId: true },
    });

    let projectId: string | null = projectRecord?.githubProjectId || null;

    if (!projectId) {
      const created = await CreateProject(owner, userId, ownerType, projectTitle);
      if (typeof created === "string" && created) {
        projectId = created;
        await prisma.batch.update({
          where: { id: batchId },
          data: { githubProjectId: projectId }
        });
      }
    }

    if (!projectId) {
      return NextResponse.json({ error: "Failed to create or find GitHub project" }, { status: 500 });
    }

    // Bulk create all issues in parallel
    const issuePromises = issues.map(async (issue: BulkIssue) => {
      try {
        const response = await axios.post(
          `https://api.github.com/repos/${owner}/${repoName}/issues`,
          {
            title: issue.title,
            body: issue.body,
            labels: issue.label ? [issue.label] : [],
          },
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              "Content-Type": "application/json",
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        if (response.status === 201) {
          return {
            success: true,
            issueId: response.data.node_id,
            issueNumber: response.data.number,
            htmlUrl: response.data.html_url,
          };
        }
        return { success: false, error: `Status: ${response.status}` };
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        return {
          success: false,
          error: axiosError.response?.data?.message || axiosError.message || "Unknown error",
        };
      }
    });

    const issueResults = await Promise.allSettled(issuePromises);
    const successfulIssues: SuccessfulIssue[] = issueResults
      .filter((r): r is PromiseFulfilledResult<SuccessfulIssue | FailedIssue> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((v): v is SuccessfulIssue => v.success === true);

    // Now add all issues to the project in parallel using GraphQL
    const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
    
    // Get status field once
    const getStatusFieldQuery = `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            fields(first: 20) {
              nodes {
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    const statusFieldResponse = await axios.post(
      GITHUB_GRAPHQL_URL,
      { query: getStatusFieldQuery, variables: { projectId } },
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    let statusFieldId: string | null = null;
    let todoOptionId: string | null = null;

    if (statusFieldResponse.data?.data?.node?.fields?.nodes) {
      const statusField = (statusFieldResponse.data.data.node.fields.nodes as StatusFieldNode[]).find(
        (f) => f.name === "Status"
      );
      if (statusField) {
        statusFieldId = statusField.id;
        todoOptionId = statusField.options?.find((o) => o.name === "Todo")?.id || null;
      }
    }

    // Add all issues to project in parallel
    const addToProjectPromises = successfulIssues.map(async (issue: SuccessfulIssue) => {
      try {
        // Add issue to project
        const addItemQuery = `
          mutation($projectId: ID!, $contentId: ID!) {
            addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
              item {
                id
              }
            }
          }
        `;

        const addResponse = await axios.post(
          GITHUB_GRAPHQL_URL,
          {
            query: addItemQuery,
            variables: { projectId, contentId: issue.issueId },
          },
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const itemId = addResponse.data?.data?.addProjectV2ItemById?.item?.id;

        // Set status to Todo if we have the field
        if (itemId && statusFieldId && todoOptionId) {
          const updateStatusQuery = `
            mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
              updateProjectV2ItemFieldValue(input: {
                projectId: $projectId,
                itemId: $itemId,
                fieldId: $fieldId,
                value: { singleSelectOptionId: $optionId }
              }) {
                projectV2Item {
                  id
                }
              }
            }
          `;

          await axios.post(
            GITHUB_GRAPHQL_URL,
            {
              query: updateStatusQuery,
              variables: {
                projectId,
                itemId,
                fieldId: statusFieldId,
                optionId: todoOptionId,
              },
            },
            {
              headers: {
                Authorization: `Bearer ${githubToken}`,
                "Content-Type": "application/json",
              },
            }
          );
        }

        return {
          ...issue,
          itemId,
        };
      } catch (error) {
        return {
          ...issue,
          itemId: null,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const finalResults = await Promise.allSettled(addToProjectPromises);

    const results: (SuccessfulIssue | FailedIssue)[] = finalResults.map((r, index) => {
      if (r.status === "fulfilled") {
        return r.value;
      }
      return {
        success: false,
        error: "Promise rejected",
        index,
      };
    });

    return NextResponse.json({
      success: true,
      projectId,
      results,
      totalCreated: results.filter((r) => r.success && r.itemId).length,
      totalIssues: issues.length,
    });
  } catch (error) {
    console.error("Bulk issue creation error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

