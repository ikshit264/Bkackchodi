/* eslint-disable  @typescript-eslint/no-explicit-any */

"use server"

import { prisma } from "../../../../lib/prisma";


export async function GetUserByUserId(id : string) {
  if (!id) {
    throw new Error("GetUserByUserId: Provided id is invalid or undefined");
  }
  const response = prisma.user.findFirst({
    where: {
      clerkId: id
    }
  });
  if (!response) {
    throw new Error("User not found in Clerk");
  }
  return response;
}

export async function GetUserByUserName(userName : string) {
  if (!userName) {
    throw new Error("GetUserByUserName: Provided userName is invalid or undefined");
  }
  const response = await prisma.user.findFirst({
    where: {
      userName: userName
    }
  });

  if (!response) {
    throw new Error("User not found in Clerk");
  }
  
  return response;
}

export async function UpdateUserDetails(clerkId : string, data : any) {
  if (!clerkId) {
    throw new Error("UpdateUserDetails: Provided clerkId is invalid or undefined");
  }
  const updateData: any = {
    name: data.name,
    lastName: data.lastName
  };
  
  // Add optional fields if provided
  if (data.collegeName !== undefined) {
    updateData.collegeName = data.collegeName || null;
  }
  if (data.graduationYear !== undefined) {
    updateData.graduationYear = data.graduationYear ? parseInt(data.graduationYear) : null;
  }
  if (data.avatar !== undefined) {
    updateData.avatar = data.avatar || null;
  }
  
  const response = await prisma.user.update({
    where: {
      clerkId: clerkId
    },
    data: updateData
  });
  if (!response) {
    throw new Error("User not found");
  }
  return response;
}

export async function UpdateUserApiDetails(clerkId : string, data : any){
  if (!clerkId) {
    throw new Error("UpdateUserApiDetails: Provided clerkId is invalid or undefined");
  }
  const response = await prisma.user.update({
    where: {
      clerkId: clerkId
    },
    data: {
      geminiApiKey: data.gemini_api_key ?? '',
      groqApiKey: data.groq_api_key ?? ''
    }
  });
  if (!response) {
    throw new Error("User not found");
  }
  return response;
}

export async function GetUserIdByName(userName : string){
  const res = await GetUserByUserName(userName);
  return res.id;
}