/*
  Warnings:

  - You are about to drop the `BorrowLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Student` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STUDENT');

-- DropForeignKey
ALTER TABLE "BorrowLog" DROP CONSTRAINT "BorrowLog_bookId_fkey";

-- DropForeignKey
ALTER TABLE "BorrowLog" DROP CONSTRAINT "BorrowLog_studentId_fkey";

-- DropTable
DROP TABLE "BorrowLog";

-- DropTable
DROP TABLE "Student";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "mssv" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "telegramId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrow_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "bookId" INTEGER NOT NULL,
    "borrowDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'BORROWING',

    CONSTRAINT "borrow_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_mssv_key" ON "users"("mssv");

-- AddForeignKey
ALTER TABLE "borrow_logs" ADD CONSTRAINT "borrow_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_logs" ADD CONSTRAINT "borrow_logs_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
