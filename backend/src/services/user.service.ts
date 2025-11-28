import bcrypt from "bcrypt";
import { UserModel } from "../models/user.model";

const SALT_ROUNDS = 10;

type UserRole = "ADMIN" | "HOD" | "TEACHER";

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export async function createUser(
    {
        name, 
        email,
        password, 
        role,
    } : CreateUserInput
) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const user = await UserModel.create({
        name,
        email,
        passwordHash,
        role,
        isActive: true
    })

    return user;
}

export async function getUserCount () {
    return UserModel.countDocuments();
}

export async function findActiveUserByEmail(email: string) {
    return UserModel.findOne({email, isActive: true })
}

export async function findUserByEmail(email: string) {
    return UserModel.findOne({email})
}
