# Setting Up Your Anthropic API Key

UI Studio uses the Anthropic API to power its AI agent. This is the **same API and billing** that Claude Code uses.

## Why Do I Need an API Key?

- **Claude Code** uses secure session-based authentication (managed by the CLI)
- **UI Studio** needs direct API access to generate prototypes
- Both use the same Anthropic account and billing
- API calls from UI Studio will appear on your Anthropic usage dashboard

## Getting Your API Key

### Step 1: Visit the Anthropic Console

Go to: **https://console.anthropic.com/settings/keys**

(You may need to log in with the same account you use for Claude Code)

### Step 2: Create a New Key

1. Click "Create Key"
2. Give it a name like "UI Studio"
3. Copy the key (it starts with `sk-ant-`)

⚠️ **Important**: Save the key somewhere safe - you won't be able to see it again!

### Step 3: Add to UI Studio

Open the `.env` file in the UI Studio directory:

```bash
# Edit the .env file
nano /Users/ajaym/Documents/code/ui-studio/.env
```

Replace `your_api_key_here_replace_this` with your actual key:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

Save and close the file.

### Step 4: Restart UI Studio

```bash
npm run dev
```

That's it! The app will now load the API key automatically from the `.env` file.

## Billing & Usage

- **Same billing** as Claude Code - both charge your Anthropic account
- **Pay per token** - Only charged for what you use
- **Monitor usage** at https://console.anthropic.com/settings/usage
- Claude Sonnet 4.5 pricing (as of 2026):
  - Input: $3 per million tokens
  - Output: $15 per million tokens

Typical UI Studio session (generating a dashboard):
- ~5,000 tokens input + ~10,000 tokens output
- Cost: ~$0.15 per generation

## Troubleshooting

### "API key not set" error

Make sure:
1. The `.env` file exists in `/Users/ajaym/Documents/code/ui-studio/`
2. The key is correctly formatted (starts with `sk-ant-`)
3. No quotes around the key in the .env file
4. You restarted the app after adding the key

### "Invalid API key" error

- Check that you copied the entire key
- Make sure there are no extra spaces
- Verify the key is active at https://console.anthropic.com/settings/keys

### Can I use the same key for multiple apps?

Yes! You can use the same API key for UI Studio and other projects.

## Alternative: Environment Variable

If you prefer, you can still use an environment variable instead of the `.env` file:

```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
npm run dev
```

The `.env` file is just more convenient since you don't need to export it each time.

## Security Note

- The `.env` file is already in `.gitignore` - it won't be committed to git
- Never share your API key publicly
- If your key is compromised, delete it at https://console.anthropic.com/settings/keys and create a new one
