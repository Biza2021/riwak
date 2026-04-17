ALTER TABLE "Order"
ADD COLUMN "sugarCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "voiceNoteDataUrl" TEXT,
ADD COLUMN "voiceNoteMimeType" TEXT,
ADD COLUMN "voiceNoteDurationSec" INTEGER;
