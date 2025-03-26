"use server"

import { prisma } from "../../../../lib/prisma"

export async function GetUserByUserId(id : string) {
  if (!id) {
    throw new Error("GetUserByUserId: Provided id is invalid or undefined");
  }
  const response = prisma.user.findUnique({
    where: {
      clerkId: id
    }
  });
  if (!response) {
    throw new Error("User not found in Clerk");
  }
  return response;
}