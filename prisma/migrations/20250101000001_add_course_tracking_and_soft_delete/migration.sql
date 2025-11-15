-- Add sourceCourseId to Course (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Course' AND column_name = 'sourceCourseId') THEN
        ALTER TABLE "Course" ADD COLUMN "sourceCourseId" TEXT;
        ALTER TABLE "Course" ADD CONSTRAINT "Course_sourceCourseId_fkey" 
          FOREIGN KEY ("sourceCourseId") REFERENCES "Course"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for sourceCourseId if not exists
CREATE INDEX IF NOT EXISTS "Course_sourceCourseId_idx" ON "Course"("sourceCourseId");

-- Add isDeleted and deletedAt to CourseAccess (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CourseAccess' AND column_name = 'isDeleted') THEN
        ALTER TABLE "CourseAccess" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CourseAccess' AND column_name = 'deletedAt') THEN
        ALTER TABLE "CourseAccess" ADD COLUMN "deletedAt" TIMESTAMP(3);
    END IF;
END $$;

-- Add indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS "CourseAccess_userId_idx" ON "CourseAccess"("userId");
CREATE INDEX IF NOT EXISTS "CourseAccess_access_idx" ON "CourseAccess"("access");
CREATE INDEX IF NOT EXISTS "CourseAccess_createdAt_idx" ON "CourseAccess"("createdAt");
CREATE INDEX IF NOT EXISTS "CourseAccess_isDeleted_idx" ON "CourseAccess"("isDeleted");

-- Add indexes to CourseInvite (if not exists)
CREATE INDEX IF NOT EXISTS "CourseInvite_expiresAt_idx" ON "CourseInvite"("expiresAt");
CREATE INDEX IF NOT EXISTS "CourseInvite_status_idx" ON "CourseInvite"("status");
CREATE INDEX IF NOT EXISTS "CourseInvite_toUserId_status_idx" ON "CourseInvite"("toUserId", "status");

