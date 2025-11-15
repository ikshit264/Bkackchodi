import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadImageToCloudinary } from "../../../../utils/cloudinary";
import { prisma } from "../../../../lib/prisma";


export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Avatar Upload] Starting upload for user ${userId}, file size: ${file.size} bytes`);

    // Step 1: Upload to Cloudinary first
    let imageUrl: string;
    try {
      imageUrl = await uploadImageToCloudinary(buffer, "user-avatars");
      console.log(`[Avatar Upload] Successfully uploaded to Cloudinary: ${imageUrl}`);
    } catch (cloudinaryError) {
      console.error("[Avatar Upload] Cloudinary upload failed:", cloudinaryError);
      return NextResponse.json(
        { error: "Failed to upload image to Cloudinary. Please check your Cloudinary configuration." },
        { status: 500 }
      );
    }

    // Step 2: Update user's avatar in database with Cloudinary URL
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, avatar: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Save Cloudinary URL to database
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { avatar: imageUrl },
    });

    console.log(`[Avatar Upload] Successfully saved Cloudinary URL to database for user ${dbUser.id}`);

    return NextResponse.json(
      { success: true, imageUrl },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }
}

