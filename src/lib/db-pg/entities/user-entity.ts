import { Account } from './account-entity'

export type User = {
    id: number
    userName: string
    passwordHash: string
    isActive: boolean
    isAdmin: boolean
    firstName: string
    lastName: string
    accountMateId: string | null
    accounts: Account[]
}

export type UserReset = {
    id: number
    userId: number
    resetValue: number
    validUntil: Date
}
