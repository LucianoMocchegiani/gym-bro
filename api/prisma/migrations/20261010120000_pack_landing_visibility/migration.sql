-- Existing packs remain visible; staff can hide individual packs from public landing pages.
ALTER TABLE "packs" ADD COLUMN "show_on_landing" BOOLEAN NOT NULL DEFAULT true;
