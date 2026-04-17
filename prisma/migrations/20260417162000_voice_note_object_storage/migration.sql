-- AlterTable
ALTER TABLE "public"."Order"
ADD COLUMN "voiceNoteStorageKey" TEXT,
ADD COLUMN "voiceNoteFileSizeBytes" INTEGER;

-- Drop the inline voice-note payload now that voice notes live in object storage.
ALTER TABLE "public"."Order"
DROP COLUMN "voiceNoteDataUrl";
