import facebookLogin from 'ts-messenger-api'
import dotenv from 'dotenv'

dotenv.config()

const api = await facebookLogin({
	email: process.env.EMAIL,
	password: process.env.PASSWORD
})

if (!api) throw new Error('API failed to initialize.')

const friends = await api.getFriendsList()

console.log(friends)
