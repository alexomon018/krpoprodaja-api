import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { generateToken } from '../utils/jwt.ts'
import { db } from '../db/connection.ts'
import { users } from '../db/schema.ts'
import { eq } from 'drizzle-orm'

export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password, firstName, lastName } = req.body

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
      })

    // Generate JWT
    const token = await generateToken({
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
    })

    res.status(201).json({
      message: 'User created successfully',
      user: newUser,
      token,
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email))

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate JWT
    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    })

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Failed to login' })
  }
}
