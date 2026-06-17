/*
  Warnings:

  - You are about to drop the column `image` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `isbn` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `Student` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Book_isbn_key";

-- AlterTable
ALTER TABLE "Book" DROP COLUMN "image",
DROP COLUMN "isbn",
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "department";
