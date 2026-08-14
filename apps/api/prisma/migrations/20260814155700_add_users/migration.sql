-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Bootstrap admin / admin123. ON CONFLICT keeps a password that was changed later.
INSERT INTO "User" ("id", "username", "passwordHash", "createdAt", "updatedAt")
VALUES (
    'cmseedadmin00000000000001',
    'admin',
    '$2b$12$CkUL7U3YUht4FeAu1gIUeek66MZRfbQ7gSU/6xAVZbcVyUkisYZ6q',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("username") DO NOTHING;
