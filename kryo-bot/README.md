# Kryo Support Bot

An all-in-one Discord bot: tickets, SellAuth integration, ping protection, welcome messages, giveaways, and a status command.

## Features

- **Tickets** - branded panel with your image, category-based ticket channels, role pings on open, auto-greeting, owner-only Transcript/Close/Waist-of-Time/Give-Role buttons, auto DM + log-channel transcripts, done-ticket category.
- **SellAuth** - connect shop + API key, `/checkinvoice` lookups, product restock via select menu + modal, and a customer-facing "Claim Role" panel that verifies an invoice and grants $1/$50/$300+ roles automatically.
- **Ping protection** - protect a role; pinging it warns twice, then times out on the 3rd offense.
- **Welcome** - member-info welcome embed (avatar, account age, join date) posted to a configurable channel.
- **Giveaways** - button-based entry, `/gcreate /gend /greroll /glist`, survives bot restarts.
- **/status** - uptime/latency/server count.

## 1. Create the Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Under **Bot**, click **Reset Token** and copy it → this is `BOT_TOKEN`.
3. On the same Bot page, enable these **Privileged Gateway Intents**: `SERVER MEMBERS INTENT` and `MESSAGE CONTENT INTENT`.
4. Under **OAuth2 → General**, copy the **Application ID** → this is `CLIENT_ID`.
5. Under **OAuth2 → URL Generator**, select scopes `bot` and `applications.commands`, and permissions: Manage Channels, Manage Roles, Moderate Members, Send Messages, Embed Links, Attach Files, Read Message History, View Channels. Use the generated URL to invite the bot to your server.
6. Get your own Discord user ID (enable Developer Mode in Discord → right-click your name → Copy User ID) → this is `OWNER_ID`.

## 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
OWNER_ID=your_discord_user_id_here
GUILD_ID=            # optional, for instant command updates while testing
```

`OWNER_ID` is the only account (besides server Administrators) allowed to press the owner-only ticket buttons.

## 3. Install and run

```bash
npm install
npm run deploy   # registers all slash commands with Discord
npm start        # starts the bot
```

If `GUILD_ID` is set, commands appear instantly in that one server (good for testing). Leave it blank for a global deploy across every server the bot is in (can take up to an hour to show up).

## 4. Push this to your own GitHub repository

This project is already `git`-ready (see `.gitignore`, which keeps your `.env` and local data files out of git).

```bash
git init
git add .
git commit -m "Initial commit - Kryo Support bot"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

(Create the empty repo first on github.com, or with `gh repo create <your-repo> --private --source=. --push` if you have the GitHub CLI installed.)

**Never commit your `.env` file or your BOT_TOKEN/SellAuth API key** - `.gitignore` already excludes `.env` and the `data/` folder.

## 5. Set up each system in your server

Run these once you've invited the bot (all setup commands require **Manage Server** permission):

### Tickets
1. `/ticketimage` - upload the image shown top-right of the ticket panel.
2. `/ticketchannel` - pick the **category** new ticket channels get created under.
3. `/ticketdonechannel` - pick the **category** closed tickets move to.
4. `/tickettranschannel` - pick the **text channel** transcripts are logged to.
5. `/ticketpingrole` - pick up to 5 roles pinged whenever a ticket opens.
6. `/ticketsupportrole` - pick up to 5 roles that can see every ticket.
7. `/ticketpanel` - send the "Kryo Support" panel with the Open Ticket button.
8. `/showticketcommands` - quick reference for all of the above.

Inside a ticket, only the bot **owner** (`OWNER_ID`) or a server **Administrator** can use Transcript / Close Ticket / Waist of Time / Give Role.

### SellAuth
1. `/sellauthshopid` - your SellAuth shop ID.
2. `/sellauthapi` - your SellAuth API key (Dashboard → Account → API).
3. `/sellauthrole1`, `/sellauthrole50`, `/sellauthrole300` - roles granted for $1+/$50+/$300+ invoices.
4. `/sellauthcustomerpanel` - sends the "Claim Role" panel customers use with their invoice ID.
5. `/checkinvoice` - anyone can look up an invoice's status/product/price/date.
6. `/sellauthrestock` - pick a product, then paste new stock lines in the modal that pops up.

> Note: SellAuth's public restock endpoint currently works reliably for simple (non-variant) products. If a product uses variants, `/sellauthrestock` will tell you to restock it from the SellAuth dashboard instead.

### Ping protection
1. `/pingrole` - pick the role to protect (e.g. your Owner/Staff role).
2. `/pingremove` - clear a user's warnings and lift their timeout early.

### Welcome
1. `/welcomechannel` - pick the channel.
2. `/welcomeenable` - turn it on.
3. `/welcometest` - preview the message using your own account.

### Giveaways
- `/gcreate prize duration winners` - e.g. `/gcreate prize:"Discord Nitro" duration:1d winners:1`
- `/gend message_id` - end early.
- `/greroll message_id` - reroll winners.
- `/glist` - see everything currently running.

## Project structure

```
src/
  commands/        one file per slash command, grouped by feature
  events/          ready, interactionCreate, guildMemberAdd, messageCreate
  handlers/        ticketService, welcomeService, giveawayService
  utils/           storage (JSON db), sellauth (API client), embeds, transcript, permissions
  config/env.js    loads and validates BOT_TOKEN/CLIENT_ID/OWNER_ID
deploy-commands.js registers slash commands with Discord
data/              JSON storage created automatically at runtime (git-ignored)
```

Data is stored in flat JSON files under `data/` - no database setup required. Fine for a single-bot, single-process deployment; swap `src/utils/storage.js` for a real database if you outgrow it.
