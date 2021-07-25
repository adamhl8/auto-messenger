# auto-messenger

A CLI app for Facebook Messenger that allows you to send a message at a scheduled time.

![auto-messenger](https://user-images.githubusercontent.com/1844269/126891589-b6537367-4238-4bdf-96f3-b3fade15d62b.png)

## Installation

1. Install prerequisites. [pnpm](https://pnpm.io) is used as the package manager.

```
npm install -g pnpm
```

2. Clone the repo.

```
git clone https://github.com/adamhl8/auto-messenger.git
```

3. Install dependencies.

```
pnpm i
```

4. Start the app.

```
pnpm start
```

## Usage

After you login with your Facebook email/password, you will be prompted for the following:

- **Thread ID** - The unique ID that exists for each user/group in Messenger. These IDs shouldn't ever change (barring a Messenger update/change).
- **Message** - The message that will be sent to your recipient. Type whatever you want or simply type "like" (without quotes) to send the default like/thumbs-up sticker.
- **Time** - The time you want your message to be sent. Messages can currently only be scheduled up to 24 hours in advance.
- **Max Delay Minutes** - The maximum number of minutes possible for the randomized delay which is added on top of your set time. For example, if you give a max delay of 10, auto-messenger will generate a random delay between 0 seconds and 10 minutes.

You'll have the option of saving your config so you can skip the prompts on subsequent uses.

Once you confirm that everything looks good and hit continue, make sure you leave the app open and don't disconnect from the internet.
**If your computer goes to sleep, your message will not send.**

After the message is sent, you will have to close and reopen the app if you want to schedule another message. auto-messenger does not send more than one message per run.

### Get Thread IDs

The [API](https://github.com/makiprogrammer/ts-messenger-api) that auto-messenger is using currently does not support automatically getting thread IDs. As a workaround, you'll have the option of monitoring incoming messages which will provide you with thread IDs. Once the desired recipient has sent you a message, you'll have their thread ID so you likely only will need to do this once per recipient.

### config.txt

You can make a file called `config.txt` in the root of the project directory to make scheduling a message much quicker. You can provide as few or as many settings as you want. The file needs to be formatted as follows (order doesn't matter):

```
email=youremail@here.com
threadID=123456789
message=like
time=0830
maxDelayMinutes=10
```

### AppState Login

After logging in once with your Facebook email/password, auto-messenger will save a file called `app-state.json`. This contains your login session so you don't have to reenter your login info every time. If auto-messenger fails to login with AppState, it will fallback to using email/password.
