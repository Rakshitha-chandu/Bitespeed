-- CreateTable
CREATE TABLE "Contact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "linkedId" INTEGER,
    "linkPrecedence" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "Contact_phoneNumber_idx" ON "Contact"("phoneNumber");
