-- CreateEnum
CREATE TYPE "NotionConnectionStatus" AS ENUM ('ACTIVE', 'NEEDS_RECONNECT');

-- CreateTable
CREATE TABLE "NotionConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "NotionConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "workspaceId" TEXT NOT NULL,
    "workspaceName" TEXT,
    "workspaceIcon" TEXT,
    "botId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tasksDataSourceId" TEXT,
    "tasksMapping" JSONB,
    "defaultHourlyRate" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lastTasksSyncAt" TIMESTAMP(3),
    "followUpsDataSourceId" TEXT,
    "followUpsMapping" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotionConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotionConnection_userId_key" ON "NotionConnection"("userId");

-- CreateIndex
CREATE INDEX "NotionConnection_workspaceId_idx" ON "NotionConnection"("workspaceId");

-- AddForeignKey
ALTER TABLE "NotionConnection" ADD CONSTRAINT "NotionConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
