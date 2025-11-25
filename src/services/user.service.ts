import bcrypt from "bcrypt";
import { UserModel } from "../models/user.model";

const SALT_ROUNDS = 10;
export async function createUser(
    {
        name, 
        email,
        password, 
        role,
    } : {
        name: string;
        email: string;
        password: string;
        role: "ADMIN" | "HOD" | "TEACHER",
    }
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
    const userCount = await UserModel.countDocuments();
    return userCount;
}

export async function findActiveUserByEmail(email: string) {
    const existing = await UserModel.findOne({email, isActive: true })
    return existing;
}

export async function findUserByEmail(email: string) {
    const user = await UserModel.findOne({email})
    return user;
}
