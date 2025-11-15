import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import getPrismaClient from "../../../../../lib/prisma";
import { isAdmin } from "../../../../../utils/admin";
import { transferOwnershipSchema } from "../../../../../lib/validations/groups";

const prisma = getPrismaClient();

/**
 * POST /api/groups/[groupId]/transfer-ownership
 * Transfer group ownership to another user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId } = await params;
    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const admin = await isAdmin();

    const body = await request.json();
    
    // Validate input
    const validation = transferOwnershipSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      );
    }

    const { newOwnerId } = validation.data;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        type: true,
        ownerId: true,
        isDeleted: true,
        members: {
          where: { leftAt: null },
          select: { userId: true, role: true },
        },
      },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    if (group.isDeleted) {
      return NextResponse.json({ error: "Cannot transfer ownership of deleted group" }, { status: 400 });
    }

    // Only current owner or admin can transfer ownership
    if (group.ownerId !== me.id && !admin) {
      return NextResponse.json({ error: "Only owner or admin can transfer ownership" }, { status: 403 });
    }

    // Check if new owner exists
    const newOwner = await prisma.user.findUnique({
      where: { id: newOwnerId },
      select: { id: true, userName: true, name: true },
    });

    if (!newOwner) {
      return NextResponse.json({ error: "New owner not found" }, { status: 404 });
    }

    // Can't transfer to current owner
    if (group.ownerId === newOwnerId) {
      return NextResponse.json({ error: "User is already the owner" }, { status: 400 });
    }

    // Check if new owner is a member
    const isMember = group.members.some((m) => m.userId === newOwnerId);
    if (!isMember) {
      return NextResponse.json({ error: "New owner must be a member of the group" }, { status: 400 });
    }

    // Transfer ownership in transaction
    await prisma.$transaction(async (tx) => {
      // Update previous owner's role to ADMIN
      if (group.ownerId) {
        await tx.groupMembership.upsert({
          where: {
            userId_groupId: {
              userId: group.ownerId,
              groupId: groupId,
            },
          },
          update: { role: "ADMIN" },
          create: {
            userId: group.ownerId,
            groupId: groupId,
            role: "ADMIN",
          },
        });
      }

      // Update new owner's role to OWNER
      await tx.groupMembership.upsert({
        where: {
          userId_groupId: {
            userId: newOwnerId,
            groupId: groupId,
          },
        },
        update: { role: "OWNER" },
        create: {
          userId: newOwnerId,
          groupId: groupId,
          role: "OWNER",
        },
      });

      // Update group owner
      await tx.group.update({
        where: { id: groupId },
        data: { ownerId: newOwnerId },
      });
    });

    // Notify new owner
    await prisma.notification.create({
      data: {
        recipientUserId: newOwnerId,
        type: "GROUP_OWNERSHIP_TRANSFERRED",
        data: {
          groupId: groupId,
          groupName: group.name,
          previousOwnerId: group.ownerId,
          newOwnerId: newOwnerId,
        },
      },
    });

    // Notify previous owner (if different from current user)
    if (group.ownerId && group.ownerId !== me.id) {
      await prisma.notification.create({
        data: {
          recipientUserId: group.ownerId,
          type: "GROUP_OWNERSHIP_TRANSFERRED_FROM",
          data: {
            groupId: groupId,
            groupName: group.name,
            newOwnerId: newOwnerId,
            newOwnerName: newOwner.userName || newOwner.name,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Ownership transferred successfully",
      data: {
        newOwnerId: newOwnerId,
        newOwnerName: newOwner.userName || newOwner.name,
      },
    }, { status: 200 });
  } catch (error) {
    console.error("Transfer ownership error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

