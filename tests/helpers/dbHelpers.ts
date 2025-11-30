import { db } from "../../src/db/connection.ts";
import { users } from "../../src/db/schema.ts";
import { hashPassword } from "../../src/utils/password.ts";
import { generateToken } from "../../src/utils/jwt.ts";

export async function createTestUser(
  userData: Partial<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }> = {}
) {
  const defaultData = {
    email: `test-${Date.now()}-${Math.random()}@example.com`,
    password: "TestPassword123!",
    firstName: "Test",
    lastName: "User",
    ...userData,
  };

  const hashedPassword = await hashPassword(defaultData.password);
  const [user] = await db
    .insert(users)
    .values({
      ...defaultData,
      password: hashedPassword,
    })
    .returning();

  const token = await generateToken({
    id: user.id,
    email: user.email,
  });

  return { user, token, rawPassword: defaultData.password };
}

export async function cleanupDatabase() {
  // Clean up in the right order due to foreign key constraints
  await db.delete(users);
}
