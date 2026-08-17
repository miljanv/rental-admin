-- AlterEnum: vans/cars are often registered without a tachograph at all.
ALTER TYPE "TachographType" ADD VALUE 'NONE';
