import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../../lib/prisma";
import { updateGroupScore } from "../../../../../../lib/GroupScoreCalculator";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ inviteId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { inviteId } = await params;

    const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const invite = await prisma.groupInvite.findUnique({ 
      where: { id: inviteId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            isDeleted: true,
            type: true,
          },
        },
      },
    });
    
    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    if (invite.toUserId !== me.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (invite.status !== "PENDING") return NextResponse.json({ error: "Invite not pending" }, { status: 400 });
    
    // Check if group is deleted
    if (invite.group.isDeleted) {
      await prisma.groupInvite.update({ where: { id: inviteId }, data: { status: "CANCELLED" } });
      return NextResponse.json({ error: "Group has been deleted" }, { status: 400 });
    }
    
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      await prisma.groupInvite.update({ where: { id: inviteId }, data: { status: "EXPIRED" } });
      return NextResponse.json({ error: "Invite expired" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const role = invite.role || "MEMBER";
      
      if (role === "OWNER") {
        // Transfer ownership: previous owner becomes ADMIN
        const group = await tx.group.findUnique({ 
          where: { id: invite.groupId }, 
          select: { ownerId: true } 
        });
        
        if (group?.ownerId && group.ownerId !== me.id) {
          // Update previous owner's membership to ADMIN
          await tx.groupMembership.upsert({
            where: { 
              userId_groupId: { 
                userId: group.ownerId, 
                groupId: invite.groupId 
              } 
            },
            update: { role: "ADMIN", leftAt: null },
            create: { 
              userId: group.ownerId, 
              groupId: invite.groupId, 
              role: "ADMIN" 
            },
          });
        }
        
        // Update group owner
        await tx.group.update({ 
          where: { id: invite.groupId }, 
          data: { ownerId: me.id } 
        });
        
        // Create/update membership as OWNER
        await tx.groupMembership.upsert({
          where: { 
            userId_groupId: { 
              userId: me.id, 
              groupId: invite.groupId 
            } 
          },
          update: { role: "OWNER", leftAt: null },
          create: { 
            userId: me.id, 
            groupId: invite.groupId, 
            role: "OWNER" 
          },
        });
      } else {
        // Create/update membership with specified role
        await tx.groupMembership.upsert({
          where: { 
            userId_groupId: { 
              userId: me.id, 
              groupId: invite.groupId 
            } 
          },
          update: { 
            role: role as "OWNER" | "ADMIN" | "MEMBER", 
            leftAt: null 
          },
          create: { 
            userId: me.id, 
            groupId: invite.groupId, 
            role: role as "OWNER" | "ADMIN" | "MEMBER" 
          },
        });
      }
      
      // Update invite status
      await tx.groupInvite.update({ 
        where: { id: inviteId }, 
        data: { status: "ACCEPTED" } 
      });
    });

    // FIXED: Initialize GroupScore after accepting invite
    try {
      await updateGroupScore(me.id, invite.groupId);
    } catch (error) {
      console.error("Error initializing group score after invite accept:", error);
      // Don't fail the accept if score calculation fails, but log it
    }

    // Track contribution
    try {
      const { trackContribution } = await import("../../../../../../lib/ContributionService");
      const contributionType = invite.group.type === "CATEGORY" ? "SECTOR_JOINED" : "GROUP_JOINED";
      await trackContribution(
        me.id,
        contributionType,
        { groupId: invite.groupId, groupType: invite.group.type }
      );
    } catch (error) {
      console.error("Error tracking group join contribution:", error);
    }

    return NextResponse.json({ 
      success: true,
      message: "Invite accepted successfully",
      data: {
        groupId: invite.groupId,
        groupName: invite.group.name,
      },
    }, { status: 200 });
  } catch (error) {
    console.error("Accept group invite error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


