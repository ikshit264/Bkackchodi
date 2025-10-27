"use server";

import { prisma } from "../../../../lib/prisma";
import { GetUserIdByName } from "../user";

export async function GetCoursesById(id: string) {
  if (!id) {
    throw new Error("GetUserByUserId: Provided id is invalid or undefined");
  }
  const response = await prisma.course.findMany({
    where: {
      userId: id,
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  if (!response) {
    throw new Error("Courses not found in Course");
  }

  return response;
}

export async function GetCoursesByName(userName : string){
    const userId = await GetUserIdByName(userName);
    if (!userId) {throw Error ("No user Id found")};
    return await GetCoursesById(userId);
}

export async function GetCourseByID(userName : string, id : string){

  const userId = await GetUserIdByName(userName);
    if (!userId) {throw Error ("No user Id found")};

  const response = await prisma.course.findUnique({
    where: {
      id: id,
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });
  if (!response) {
    throw new Error("Course not found in Course");
  }
  return response;
}