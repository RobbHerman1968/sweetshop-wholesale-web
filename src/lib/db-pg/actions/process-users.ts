'use server'

// import { PrismaClient } from '@prisma/client'
// import { db } from "@/lib/db";
// import { accountTable, userTable } from "@/lib/drizzle/schema";
// import { generateIdFromEntropySize } from 'lucia';
// import { hash } from "@node-rs/argon2";

// const prisma = new PrismaClient()

export async function processUsers() {
    console.log('In Process')
    // const oldAccounts = await prisma.account.findMany();
    // const newAccounts = await db.query.accountTable.findMany();
    // let users = await db.query.userTable.findMany();

    // console.log(oldAccounts.length);
    // console.log(newAccounts.length);

    // for (const oldAccount of oldAccounts) {

    //     console.log('Old Account', oldAccount);

    //     const newAccount = newAccounts.find(a => a.id === oldAccount.Id);
    //     const user = users.find(u => u.username === oldAccount.EmailAddress?.toLowerCase());

    //     console.log('New Account', newAccount)
    //     console.log('User', user)

    //     if (!user && !newAccount) {
    //         if (!newAccount && oldAccount.EmailAddress && oldAccount.Password) {
    //             const userId = generateIdFromEntropySize(10);
    //             const passwordHash = await hash(oldAccount.Password, {
    //                 memoryCost: 19456,
    //                 timeCost: 2,
    //                 outputLen: 32,
    //                 parallelism: 1
    //             });

    //             const user = await db.insert(userTable).values({
    //                 id: userId,
    //                 username: oldAccount.EmailAddress?.toLowerCase()!,
    //                 passwordHash: passwordHash,
    //                 isAdmin: false,
    //                 isActive: true,
    //             });

    //             const account = await db.insert(accountTable).values({
    //                 id: oldAccount.Id,
    //                 userId: userId,
    //                 accountMateId: oldAccount.AccountMateId,
    //                 isTerms: oldAccount.IsTerms,
    //                 isSkipTax: oldAccount.IsSkipTax,
    //                 isSkipShipping: oldAccount.IsSkipShipping,
    //                 isFreeGroundShipping: oldAccount.IsFreeGround,
    //                 terms: oldAccount.Terms
    //             });

    //             users = await db.query.userTable.findMany();
    //         }
    //     }

    //     if (user && !newAccount) {
    //         const account = await db.insert(accountTable).values({
    //             id: oldAccount.Id,
    //             userId: user.id,
    //             accountMateId: oldAccount.AccountMateId,
    //             isTerms: oldAccount.IsTerms,
    //             isSkipTax: oldAccount.IsSkipTax,
    //             isSkipShipping: oldAccount.IsSkipShipping,
    //             isFreeGroundShipping: oldAccount.IsFreeGround,
    //             terms: oldAccount.Terms
    //         });
    //     }

    // }
}

export async function createDefaultUser() {
    // const userId = generateIdFromEntropySize(10);
    // const passwordHash = await hash('just4ruth', {
    //     memoryCost: 19456,
    //     timeCost: 2,
    //     outputLen: 32,
    //     parallelism: 1
    // });

    // console.log(userId, passwordHash);

    // const user = await db.insert(userTable).values({
    //     id: userId,
    //     username: 'rob.herman@toolsbydesign.com',
    //     passwordHash: passwordHash,
    //     isAdmin: true,
    //     isActive: true,
    // });
}

