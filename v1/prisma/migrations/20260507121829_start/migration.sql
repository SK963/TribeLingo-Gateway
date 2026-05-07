-- AlterTable
ALTER TABLE "Translation" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'bg-[#eff4ff]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPhrase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "originalText" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "sourceLang" TEXT,
    "targetLang" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedPhrase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DictionaryEntry" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "pos" TEXT NOT NULL,
    "example" TEXT,
    "pronunciationUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DictionaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Folder_userId_idx" ON "Folder"("userId");

-- CreateIndex
CREATE INDEX "SavedPhrase_userId_idx" ON "SavedPhrase"("userId");

-- CreateIndex
CREATE INDEX "SavedPhrase_folderId_idx" ON "SavedPhrase"("folderId");

-- CreateIndex
CREATE UNIQUE INDEX "DictionaryEntry_word_key" ON "DictionaryEntry"("word");

-- CreateIndex
CREATE INDEX "DictionaryEntry_word_idx" ON "DictionaryEntry"("word");

-- CreateIndex
CREATE INDEX "ChatConversation_userId_idx" ON "ChatConversation"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPhrase" ADD CONSTRAINT "SavedPhrase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPhrase" ADD CONSTRAINT "SavedPhrase_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
