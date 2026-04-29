import { Account } from './account-entity'

export type User = {
    id: string
    userName: string
    passwordHash: string
    isActive: boolean
    isAdmin: boolean
    firstName: string
    lastName: string
    accountId: number
    accounts: Account[]
}

export type UserReset = {
    id: number
    userId: string
    resetValue: number
    validUntil: Date
}
