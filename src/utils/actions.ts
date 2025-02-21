"use server"

import { signIn, signOut } from "@/auth"

export const login = async (name : string) => {
    await signIn(name, {redirectTo : "/"})
}

export const logout = async () => {
    await signOut({redirectTo : "/"})
}
