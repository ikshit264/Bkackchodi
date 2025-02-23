export const validateJsonStructure = (jsonObject) => {
    if (typeof jsonObject !== "object" || jsonObject === null) {
      return { valid: false, error: "Invalid JSON: Expected an object." };
    }
  
    const requiredKeys = {
      Project_id: "number",
      batch: "number",
      title: "string",
      description: "string",
      level: "string",
      learningObjectives: "object", // Expecting an array (typeof array is "object")
    };
  
    for (const key in jsonObject) {
      const item = jsonObject[key];
  
      for (const requiredKey in requiredKeys) {
        if (!item.hasOwnProperty(requiredKey)) {
          return { valid: false, error: `Missing key: ${requiredKey} in object ${key}` };
        }
  
        if (requiredKey === "learningObjectives" && !Array.isArray(item[requiredKey])) {
          return { valid: false, error: `Invalid type for key: ${requiredKey} in object ${key}. Expected an array.` };
        }
  
        if (requiredKey !== "learningObjectives" && typeof item[requiredKey] !== requiredKeys[requiredKey]) {
          return { valid: false, error: `Type mismatch for key: ${requiredKey} in object ${key}. Expected ${requiredKeys[requiredKey]}, found ${typeof item[requiredKey]}` };
        }
      }
    }
  
    return { valid: true };
  };
  