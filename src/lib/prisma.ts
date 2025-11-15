import { PrismaClient } from "@prisma/client";

const getPrismaClient = () => {
  if (process.env.NODE_ENV === "production") {
    // Create a new instance in production
    return new PrismaClient();
  } else {
    // Reuse the existing instance in development
    if (!global.prisma) {
      global.prisma = new PrismaClient();
    }
    return global.prisma;
  }
};

// Export both default (for backward compatibility) and named export
export default getPrismaClient;
export const prisma = getPrismaClient();
