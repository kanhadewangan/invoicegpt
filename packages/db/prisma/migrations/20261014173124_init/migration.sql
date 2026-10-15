-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "clientName" TEXT,
    "clientEmail" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "note" TEXT,
    "sourceText" TEXT,
    "paypalInvoiceId" TEXT,
    "paypalInvoiceNumber" TEXT,
    "payLink" TEXT,
    "paidAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_paypalInvoiceId_key" ON "Invoice"("paypalInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");
