-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tgdbId" INTEGER,
    "steamAppId" INTEGER,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coverUrl" TEXT,
    "genres" TEXT,
    "platforms" TEXT,
    "modes" TEXT,
    "released" TEXT,
    "onGamePass" BOOLEAN NOT NULL DEFAULT false,
    "gamePassSyncedAt" DATETIME,
    "tgdbUpdatedAt" DATETIME,
    "cachedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discoverable" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Game" ("cachedAt", "coverUrl", "gamePassSyncedAt", "genres", "id", "modes", "name", "onGamePass", "platforms", "refreshedAt", "released", "slug", "steamAppId", "tgdbId", "tgdbUpdatedAt") SELECT "cachedAt", "coverUrl", "gamePassSyncedAt", "genres", "id", "modes", "name", "onGamePass", "platforms", "refreshedAt", "released", "slug", "steamAppId", "tgdbId", "tgdbUpdatedAt" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE UNIQUE INDEX "Game_tgdbId_key" ON "Game"("tgdbId");
CREATE UNIQUE INDEX "Game_steamAppId_key" ON "Game"("steamAppId");
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
