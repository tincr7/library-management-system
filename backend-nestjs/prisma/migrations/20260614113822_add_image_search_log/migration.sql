-- CreateTable
CREATE TABLE "image_search_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "imagePath" TEXT NOT NULL,
    "resultBookId" INTEGER,
    "confidence" DOUBLE PRECISION,
    "searchText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_search_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "image_search_logs" ADD CONSTRAINT "image_search_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_search_logs" ADD CONSTRAINT "image_search_logs_resultBookId_fkey" FOREIGN KEY ("resultBookId") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;
