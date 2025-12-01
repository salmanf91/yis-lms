export const rolePriority = {
    TEACHER: 1,
    ADMIN: 2,
    HOD: 3
}

export type UserRole = keyof typeof rolePriority;