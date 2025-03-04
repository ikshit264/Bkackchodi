import axios, { AxiosError } from "axios";
import { format } from 'date-fns';
import { GithubTokenExtract } from "./GithubBackchodi";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export async function getOwnerId(
  ownerType: "user" | "organization",
  owner: string,
  githubToken: string
): Promise<string | null> {
  /**
   * Get the node ID for the owner (user or organization)
   *
   * @param {("user" | "organization")} ownerType - Either "user" or "organization"
   * @returns {Promise<string | null>} The node ID or null if an error occurs
   */

  if (!owner) {
    console.error("Owner name is required");
    return null;
  }

  if (!githubToken) {
    console.error("GitHub token is required");
    return null;
  }

  if (!["user", "organization"].includes(ownerType)) {
    console.error(
      `Invalid owner type: ${ownerType}. Must be 'user' or 'organization'`
    );
    return null;
  }

  // GraphQL query to fetch owner ID
  const query = `
    query($login: String!) {
      ${ownerType}(login: $login) {
        id
      }
    }
  `;

  const variables = { login: owner };

  try {
    console.log(`Getting owner ID for ${ownerType} '${owner}'`);
    console.log("Request data:", JSON.stringify({ query, variables }));

    const response = await axios.post(
      GITHUB_GRAPHQL_URL,
      { query, variables },
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Owner ID API response:", JSON.stringify(response.data));

    const responseData = response.data;

    if (responseData.errors) {
      console.error("Failed to get owner ID:", responseData.errors);
      return null;
    }

    const ownerId = responseData.data?.[ownerType]?.id;
    
    if (!ownerId) {
      console.error(`No ID found for ${ownerType} '${owner}'`);
      return null;
    }
    
    console.log(`Owner ID retrieved: ${ownerId}`);

    return ownerId;
  } catch (error) {
    handleAxiosError(error, "Error fetching owner ID");
    return null;
  }
}

// Helper function to handle Axios errors
function handleAxiosError(error: unknown, prefix: string = "Error"): void {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      console.error(`${prefix}: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
    } else if (axiosError.request) {
      console.error(`${prefix}: No response received`, axiosError.request);
    } else {
      console.error(`${prefix}: ${axiosError.message}`);
    }
  } else {
    console.error(`${prefix}:`, error);
  }
}

interface ProjectDetails {
  id: string;
  title: string;
  url: string;
  number: number;
  fields: {
    nodes: Array<{
      id: string;
      name: string;
      dataType: string;
      options?: Array<{ id: string; name: string }>;
    }>;
  };
}

interface IssueData {
  title: string;
  body: string;
  labels?: string[];
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class GithubProject {
  ownerType: "user" | "organization";
  owner: string;
  githubToken: string;
  GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
  GITHUB_REST_API_URL = "https://api.github.com";

  constructor(
    ownerType: "user" | "organization",
    owner: string,
    githubToken: string
  ) {
    if (!owner) throw new Error("Owner name is required");
    if (!githubToken) throw new Error("GitHub token is required");
    if (!["user", "organization"].includes(ownerType)) {
      throw new Error(`Invalid owner type: ${ownerType}. Must be 'user' or 'organization'`);
    }
    
    this.ownerType = ownerType;
    this.owner = owner;
    this.githubToken = githubToken;
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${this.githubToken}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    };
  }

  async getOwnerId(): Promise<string | null> {
    return await getOwnerId(this.ownerType, this.owner, this.githubToken);
  }

  async createIssue(
    title: string,
    body: string,
    label: string,
    repo: string,
    owner: string = this.owner
  ): Promise<any | null> {
    if (!title) {
      console.error("Issue title is required");
      return null;
    }
    
    if (!body) {
      console.error("Issue body is required");
      return null;
    }
    
    if (!repo) {
      console.error("Repository name is required");
      return null;
    }
    
    if (!owner) {
      console.error("Owner name is required");
      return null;
    }

    const url = `${this.GITHUB_REST_API_URL}/repos/${owner}/${repo}/issues`;
    const headers = this.getHeaders();
    
    const data: IssueData = {
      title: title,
      body: body,
    };

    if (label) {
      data.labels = [label];
    }

    console.log(`Creating issue in ${owner}/${repo}:`, JSON.stringify(data));

    try {
      const response = await axios.post(url, data, { headers });
      console.log("Create issue API response:", JSON.stringify(response.data));

      if (response.status !== 201) {
        console.error(`Failed to create issue. Status: ${response.status}`);
        return null;
      }

      return response.data;
    } catch (error) {
      handleAxiosError(error, "Error creating issue");
      return null;
    }
  }

  async createProject(title: string): Promise<string | null> {
    if (!title) {
      console.error("Project title is required");
      return null;
    }

    const ownerId = await this.getOwnerId();

    if (!ownerId) {
      console.error("Failed to get owner ID for project creation");
      return null;
    }

    console.log(`Creating project "${title}" for owner ID: ${ownerId}`);

    const query = `mutation($ownerId: ID!, $title: String!) {
      createProjectV2(input: {ownerId: $ownerId, title: $title}) {
        projectV2 {
          id
          title
          url
          number
        }
      }
    }`;

    const variables = {
      ownerId: ownerId,
      title: title,
    };

    const requestData = {
      query,
      variables
    };

    console.log("Create project request data:", JSON.stringify(requestData));

    try {
      const response = await axios.post(
        this.GITHUB_GRAPHQL_URL,
        requestData,
        { headers: this.getHeaders() }
      );

      console.log("Create project API response:", JSON.stringify(response.data));

      const responseData = response.data;

      if (responseData.errors) {
        console.error("Failed to create project:", responseData.errors);
        return null;
      }

      const projectId = responseData.data?.createProjectV2?.projectV2?.id;
      
      if (!projectId) {
        console.error("Project ID not found in response");
        return null;
      }

      console.log(`Project created with ID: ${projectId}`);
      return projectId;
    } catch (error) {
      handleAxiosError(error, "Error creating project");
      return null;
    }
  }

  async getProjectDetails(projectId: string): Promise<ProjectDetails | null> {
    if (!projectId) {
      console.error("Project ID is required");
      return null;
    }

    const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          id
          title
          url
          number
          fields(first: 20) {
            nodes {
              ... on ProjectV2Field {
                id
                name
                dataType
              }
              ... on ProjectV2IterationField {
                id
                name
                dataType
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                dataType
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

    const variables = { projectId };
    const requestData = { query, variables };

    console.log(`Getting project details for project ID: ${projectId}`);
    console.log("Request data:", JSON.stringify(requestData));

    try {
      const response = await axios.post(
        this.GITHUB_GRAPHQL_URL,
        requestData,
        { headers: this.getHeaders() }
      );

      console.log("Get project details API response:", JSON.stringify(response.data));

      const responseData = response.data;

      if (responseData.errors) {
        console.error(`Failed to get project details:`, responseData.errors);
        return null;
      }

      if (!responseData.data?.node) {
        console.error("No project data found in response");
        return null;
      }

      return responseData.data.node as ProjectDetails;
    } catch (error) {
      handleAxiosError(error, "Error fetching project details");
      return null;
    }
  }

  async createStatusField(projectId: string): Promise<[string | null, string | null]> {
    if (!projectId) {
      console.error("Project ID is required");
      return [null, null];
    }

    console.log(`Creating Status field for project ID: ${projectId}`);

    const query = `mutation($projectId: ID!) {
      createProjectV2Field(input: {
        projectId: $projectId,
        dataType: SINGLE_SELECT,
        name: "Status",
        singleSelectOptions: [
          {name: "Todo", color: "BLUE"},
          {name: "In Progress", color: "YELLOW"},
          {name: "Done", color: "GREEN"}
        ]
      }) {
        projectV2Field {
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
    }`;
    
    const variables = { projectId };
    const requestData = { query, variables };

    console.log("Create status field request data:", JSON.stringify(requestData));

    try {
      const response = await axios.post(
        this.GITHUB_GRAPHQL_URL,
        requestData,
        { headers: this.getHeaders() }
      );

      console.log("Create status field API response:", JSON.stringify(response.data));

      const responseData = response.data;

      if (responseData.errors) {
        console.error("Failed to create status field:", responseData.errors);
        return [null, null];
      }

      const fieldData = responseData.data?.createProjectV2Field?.projectV2Field;
      
      if (!fieldData) {
        console.error("Field data not found in response");
        return [null, null];
      }
      
      const fieldId = fieldData.id;
      const todoOptionId = fieldData.options?.find((option: any) => option.name === "Todo")?.id || null;

      if (!todoOptionId) {
        console.error("Todo option ID not found in response");
      }

      console.log(`Status field created with ID: ${fieldId}, Todo option ID: ${todoOptionId}`);
      return [fieldId, todoOptionId];
    } catch (error) {
      handleAxiosError(error, "Error creating status field");
      return [null, null];
    }
  }

  async addIssueToProject(issueId: string, projectId: string): Promise<boolean> {
    if (!issueId) {
      console.error("Issue ID is required");
      return false;
    }
    
    if (!projectId) {
      console.error("Project ID is required");
      return false;
    }

    console.log(`Adding issue ${issueId} to project ${projectId}`);

    const query = `mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item {
          id
        }
      }
    }`;
    
    const variables = { projectId, contentId: issueId };
    const requestData = { query, variables };

    console.log("Add issue to project request data:", JSON.stringify(requestData));

    try {
      const response = await axios.post(
        this.GITHUB_GRAPHQL_URL,
        requestData,
        { headers: this.getHeaders() }
      );

      console.log("Add issue to project API response:", JSON.stringify(response.data));

      const responseData = response.data;

      if (responseData.errors) {
        console.error("Failed to add issue to project:", responseData.errors);
        return false;
      }

      const itemId = responseData.data?.addProjectV2ItemById?.item?.id;
      
      if (!itemId) {
        console.error("Item ID not found in response");
        return false;
      }

      console.log(`Issue added to project as item ${itemId}. Setting status to Todo...`);

      // Get or create Status field and Todo option
      const [statusFieldId, todoOptionId] = await this.getOrCreateStatusFieldId(projectId);

      if (!statusFieldId || !todoOptionId) {
        console.error("Failed to get or create Status field");
        return false;
      }

      // Set status to Todo
      return await this.setItemStatus(projectId, itemId, statusFieldId, todoOptionId);
    } catch (error) {
      handleAxiosError(error, "Error adding issue to project");
      return false;
    }
  }

  async setItemStatus(projectId: string, itemId: string, fieldId: string, optionId: string): Promise<boolean> {
    if (!projectId || !itemId || !fieldId || !optionId) {
      console.error("Missing required parameters for setItemStatus:", { 
        projectId: !!projectId, 
        itemId: !!itemId, 
        fieldId: !!fieldId, 
        optionId: !!optionId 
      });
      return false;
    }
    
    console.log(`Setting item ${itemId} status to option ${optionId}`);

    const query = `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
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
    }`;
    
    const variables = { projectId, itemId, fieldId, optionId };
    const requestData = { query, variables };

    console.log("Set item status request data:", JSON.stringify(requestData));

    try {
      const response = await axios.post(
        this.GITHUB_GRAPHQL_URL,
        requestData,
        { headers: this.getHeaders() }
      );

      console.log("Set item status API response:", JSON.stringify(response.data));

      const responseData = response.data;

      if (responseData.errors) {
        console.error("Failed to update status field:", responseData.errors);
        return false;
      }

      if (!responseData.data?.updateProjectV2ItemFieldValue?.projectV2Item?.id) {
        console.error("Updated item ID not found in response");
        return false;
      }

      console.log(`Successfully set item ${itemId} status to option ${optionId}`);
      return true;
    } catch (error) {
      handleAxiosError(error, "Error setting item status");
      return false;
    }
  }

  async getOrCreateStatusFieldId(projectId: string): Promise<[string | null, string | null]> {
    if (!projectId) {
      console.error("Project ID is required for getOrCreateStatusFieldId");
      return [null, null];
    }
    
    console.log(`Getting or creating Status field for project ${projectId}`);

    const projectDetails = await this.getProjectDetails(projectId);
    if (!projectDetails) {
        console.error("Failed to get project details");
        return [null, null];
    }
    
    const fields = projectDetails.fields.nodes;
    const statusField = fields.find((field) => field.name === "Status" && field.dataType === "SINGLE_SELECT");
    
    if (statusField) {
        console.log(`Found existing Status field: ${statusField.id}`);
        
        let todoOptionId: string | null = null;
        if (statusField.options && Array.isArray(statusField.options)) {
            for (const option of statusField.options) {
                const optionName = option.name.toLowerCase();
                if (["todo", "to do", "to-do"].includes(optionName)) {
                    todoOptionId = option.id;
                    console.log(`Found Todo option: ${option.name} (ID: ${todoOptionId})`);
                    break;
                }
            }
        } else {
            console.error("Status field options array is missing or not an array");
        }
        
        if (!todoOptionId) {
            console.warn("Status field exists but no Todo option found");
            console.log("Available options: " + (statusField.options || []).map((o) => o.name).join(", "));
        }
        
        return [statusField.id, todoOptionId];
    }
    
    console.log("Status field not found. Creating a new one.");
    return await this.createStatusField(projectId);
  }
}

export interface ProjectWithIssueResult {
  success: boolean;
  projectId?: string;
  issueNumber?: number;
  issueId?: string;
  error?: string;
}

export interface ProjectWithIssueParams {
  owner: string;
  userId : string;
  repoName: string;
  githubToken?: string;
  ownerType?: 'user' | 'organization';
  projectId?: string | null;
  projectTitle?: string | null;
  issueTitle?: string | null;
  issueBody?: string;
  issueLabel?: string;
}


/**
 * Example usage of the GitHub Project API
 * @param ownerType - 'user' or 'organization'
 * @param owner - GitHub username or organization name
 * @param githubToken - Personal access token with appropriate permissions
 * @param repoName - Repository name to create issues in
 * @returns {Promise<ProjectWithIssueResult>} - Result of the operation
 */
export async function createProjectWithIssue({
  owner,
  userId,
  repoName,
  ownerType = 'user',
  projectId = null,
  projectTitle = null,
  issueTitle = null,
  issueBody = 'This is an issue created via the GitHub API',
  issueLabel = 'bug'
}: ProjectWithIssueParams): Promise<ProjectWithIssueResult> {
  // Check required parameters
  if (!owner) {
    console.error('Missing required parameter: owner is required');
    return { success: false, error: 'Owner is required' };
  }

    const githubToken = await GithubTokenExtract(userId);
  
  if (!repoName) {
    console.error('Missing required parameter: repoName is required');
    return { success: false, error: 'Repository name is required' };
  }

  console.log('Starting GitHub workflow...');
  
  try {
    // Initialize GitHub project client
    const githubProject = new GithubProject(ownerType, owner, githubToken);
    
    // Generate timestamp for default titles
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    let result: ProjectWithIssueResult = { success: false };
    
    // Step 1: Get or create project
    if (!projectId) {
      // Create a new project if projectId not provided
      const actualProjectTitle = projectTitle || `Project (${timestamp})`;
      console.log(`Creating new project: "${actualProjectTitle}"`);
      
      projectId = await githubProject.createProject(actualProjectTitle);
      
      if (!projectId) {
        console.error('Failed to create project. Exiting.');
        return { success: false, error: 'Failed to create project' };
      }
      
      console.log(`Project created with ID: ${projectId}`);
      result.projectId = projectId;
    } else {
      console.log(`Using existing project with ID: ${projectId}`);
      result.projectId = projectId;
    }
    
    // Step 2: Create a new issue
    const actualIssueTitle = issueTitle || `Issue (${timestamp})`;
    console.log(`Creating issue: "${actualIssueTitle}"`);
    
    const issueData = await githubProject.createIssue(
      actualIssueTitle,
      issueBody,
      issueLabel,
      repoName,
      owner
    );
    
    if (!issueData) {
      console.error('Failed to create issue.');
      return { ...result, success: false, error: 'Failed to create issue' };
    }
    
    console.log(`Issue created: #${issueData.number} (${issueData.html_url})`);
    result.issueNumber = issueData.number;
    
    // GitHub REST API returns node_id which we need for the GraphQL API
    const issueNodeId = issueData.node_id;
    
    if (!issueNodeId) {
      console.error('Issue node ID not found in response.');
      return { ...result, success: false, error: 'Issue node ID not found in response' };
    }
    
    result.issueId = issueNodeId;
    
    // Step 3: Add the issue to the project with Todo status
    console.log(`Adding issue to project...`);
    
    const success = await githubProject.addIssueToProject(issueNodeId, projectId);
    
    if (success) {
      console.log('Operation completed successfully!');
      console.log(`Issue #${issueData.number} added to project ID ${projectId}`);
      return { ...result, success: true };
    } else {
      console.error('Failed to add issue to project.');
      return { ...result, success: false, error: 'Failed to add issue to project' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in createProjectWithIssue:', errorMessage);
    return { 
      success: false, 
      error: `Error in createProjectWithIssue: ${errorMessage}`,
      projectId: projectId || undefined
    };
  }
}

export default GithubProject;