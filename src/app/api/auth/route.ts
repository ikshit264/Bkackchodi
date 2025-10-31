import { NextResponse } from "next/server";
import { GithubTokenExtract } from "../../../utils/github/GithubBackchodi";
import { getOwnerId } from "../../../utils/github/GithubProjectBackchodi";
import { prisma } from "../../../../lib/prisma";
import { auth } from "@clerk/nextjs/server"; 
import { fullOrPartialScoreFetch, updateRanksAtomic } from "../../../lib/BackendHelpers";

async function fetchClerkUser(userId: string) {
  const response = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user from Clerk");
  }

  return response.json();
}
export async function GET(request: Request) {
  const { userId } = await auth();

  console.log("🔑 Authenticated userId from Clerk:", userId);

  if (!userId) {
    console.log("❌ No userId found — Unauthorized access");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clerkUser = await fetchClerkUser(userId);
    console.log("🧾 Clerk user fetched:", clerkUser);

    if (!clerkUser || clerkUser.id !== userId) {
      console.log("❌ Clerk user mismatch or not found");
      return NextResponse.json(
        { error: "User not found in Clerk" },
        { status: 404 }
      );
    }

    const githubToken = await GithubTokenExtract(userId);
    console.log("🔐 GitHub token extracted:", githubToken);

    const githubId = clerkUser.username;
    console.log("👤 GitHub ID / username from Clerk:", githubId);

    const githubOwnerid = await getOwnerId("user", githubId, githubToken);
    console.log("🏷️ GitHub owner ID fetched:", githubOwnerid);

    // ✅ Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    const dbUser = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        email: clerkUser.email_addresses?.[0]?.email_address || "",
        githubToken,
        githubOwnerid,
        userName: clerkUser.username,
        githubId,
      },
      create: {
        clerkId: clerkUser.id,
        name: clerkUser.first_name || "",
        lastName: clerkUser.last_name || "",
        avatar: clerkUser.avatar,
        email: clerkUser.email_addresses?.[0]?.email_address || "",
        userName: clerkUser.username,
        githubToken,
        githubOwnerid,
        githubId,
      },
      select: { id: true, userName: true },
    });

    console.log("✅ DB user upserted:", dbUser);

    if (!dbUser) {
      console.log("❌ User not found or failed to upsert in DB");
      return NextResponse.json(
        { error: "User not found in DB" },
        { status: 404 }
      );
    }

    const forceFetch = existingUser ? false : true;

    await fullOrPartialScoreFetch({
      userId: dbUser.id,
      userName: dbUser.userName,
      githubToken: githubToken,
      year : undefined,
      forceFetch,
    });
    // console.log('scoreData', scoreData);
    await updateRanksAtomic();

    console.log(`🚀 Called score API (forceFetch: ${forceFetch})`);

    return NextResponse.redirect(new URL(`/${dbUser.userName}/profile`, request.url));
  } catch (error) {
    console.error("🔥 Error syncing user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
