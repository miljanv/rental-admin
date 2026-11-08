-- Favorite partners are listed first in partner pickers. Additive; every existing partner starts unmarked.
ALTER TABLE "partners" ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;
