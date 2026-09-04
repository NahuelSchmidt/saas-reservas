-- AlterTable
ALTER TABLE "pricing_rules" ADD COLUMN     "cashQuarterPriceCents" INTEGER;

-- AlterTable
ALTER TABLE "booking_configs" DROP COLUMN "cashDiscountPct";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "cashQuarterPriceCents" INTEGER;
