import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DICTIONARY_ENTRIES = [
  { word: "Khorang", meaning: "Voice / Word", pos: "Noun", example: "Ang khorang kahm." },
  { word: "Kahm", meaning: "Good / Well", pos: "Adjective", example: "Nwng kahm ma?" },
  { word: "Hati", meaning: "Market", pos: "Noun", example: "Ang hati-o thaknai." },
  { word: "Borok", meaning: "People / Human", pos: "Noun", example: "Borok seng kaham." },
  { word: "Noksa", meaning: "Village / Home", pos: "Noun", example: "Chini noksa-o jorao nini." },
  { word: "Tamo", meaning: "What", pos: "Pronoun", example: "Nwng tamo khlai?" },
  { word: "Khlai", meaning: "Do / Make", pos: "Verb", example: "Ang khlai tong?" },
  { word: "Thung", meaning: "Come", pos: "Verb", example: "Nini thung legi." },
  { word: "Nwng", meaning: "You", pos: "Pronoun", example: "Nwng kahm ma?" },
  { word: "Ang", meaning: "I / Me", pos: "Pronoun", example: "Ang thaknai." },
  { word: "Seng", meaning: "Many / Much", pos: "Adjective", example: "Borok seng kaham." },
  { word: "Jorao", meaning: "Love", pos: "Verb", example: "Chini jorao nini." },
];

async function main() {
  console.log("Seeding dictionary...");
  for (const entry of DICTIONARY_ENTRIES) {
    await prisma.dictionaryEntry.upsert({
      where: { word: entry.word },
      update: entry,
      create: entry,
    });
  }
  console.log("Dictionary seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
