'use server'

export async function getAccountMateData() {
    try {
        const URL: string = 'https://localhost:7269/graphql'
        const time = new Date().getTime()
        const headers = {
            'Content-Type': 'application/json',
            Security: time.toString(),
        }
        const requestBody = {
            query: `query (){
              allAccountsRob {
                id
              }          
          }`,
        }

        const options = {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
        }

        const response = await (await fetch(URL, options)).json()
        console.log('RESPONSE FROM FETCH REQUEST', response)
        return response
    } catch (error) {
        console.error('ERROR FROM FETCH REQUEST', error)
    }
}

export async function getAccountMateDataById(id: string) {
    try {
        const URL: string = 'https://localhost:7269/AccountMate/GetAccountMateAccountById'
        const time = new Date().getTime()
        const headers = {
            'Content-Type': 'application/json-patch+json',
            Security: time.toString(),
        }

        const options = {
            method: 'POST',
            headers,
            body: JSON.stringify(id),
        }
        console.log('OPTIONS', options)
        const response = await (await fetch(URL, options)).json()
        console.log('RESPONSE FROM FETCH REQUEST', response)
        return response
    } catch (error) {
        console.error('ERROR FROM FETCH REQUEST', error)
    }
}
