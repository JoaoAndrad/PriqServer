-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Recruitment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdById" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "hasTime" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recruitment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Recruitment_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Recruitment" ("createdAt", "createdById", "gameId", "id", "scheduledAt", "status") SELECT "createdAt", "createdById", "gameId", "id", "scheduledAt", "status" FROM "Recruitment";
DROP TABLE "Recruitment";
ALTER TABLE "new_Recruitment" RENAME TO "Recruitment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
