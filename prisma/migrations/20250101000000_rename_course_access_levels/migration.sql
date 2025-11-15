-- Rename enum values using transaction-safe approach
-- This migration renames enum values: VIEWER -> READ_ONLY, CLONE -> COPY, CLONE_AND_VIEW -> SYNC_COPY

DO $$ 
BEGIN
    -- Check if enum values exist before renaming (for shadow database compatibility)
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CourseAccessLevel') THEN
        -- Rename VIEWER to READ_ONLY if it exists
        IF EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'VIEWER' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CourseAccessLevel')
        ) THEN
            ALTER TYPE "CourseAccessLevel" RENAME VALUE 'VIEWER' TO 'READ_ONLY';
        END IF;

        -- Rename CLONE to COPY if it exists
        IF EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'CLONE' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CourseAccessLevel')
        ) THEN
            ALTER TYPE "CourseAccessLevel" RENAME VALUE 'CLONE' TO 'COPY';
        END IF;

        -- Rename CLONE_AND_VIEW to SYNC_COPY if it exists
        IF EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'CLONE_AND_VIEW' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CourseAccessLevel')
        ) THEN
            ALTER TYPE "CourseAccessLevel" RENAME VALUE 'CLONE_AND_VIEW' TO 'SYNC_COPY';
        END IF;
    END IF;
END $$;


