import {PrismaClient} from "@prisma/client";

const PrismaClientSingleton = () => {
    return new PrismaClient;
}

const globalforPrisma = globalThis as unknown as {prisma : PrismaClient | undefined};

export const prisma = globalforPrisma.prisma ?? PrismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalforPrisma.prisma = prisma