-- CreateEnum
CREATE TYPE "ClassPaymentCollector" AS ENUM ('CLUB', 'INSTRUCTOR');

-- AlterTable
ALTER TABLE "class_enrollments" ADD COLUMN     "collectedBy" "ClassPaymentCollector",
ADD COLUMN     "paidAt" TIMESTAMP(3);
