export {}

// Create a type for the roles
export type Roles = 'admin' | 'moderator'

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles
    }
  }
  // Prisma client instance on global for development reuse
  // eslint-disable-next-line no-var
  var prisma: import("@prisma/client").PrismaClient
}