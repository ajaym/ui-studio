# UI Studio Installation Guide

This guide walks you through downloading, installing, and setting up UI Studio on your computer. No programming experience required.

---

## Step 1: Get an API Key

UI Studio uses Claude (by Anthropic) to generate your prototypes. You need an API key to connect to it.

1. Go to [console.anthropic.com](https://console.anthropic.com/) and create a free account (or sign in)
2. Navigate to **Settings > API Keys** ([direct link](https://console.anthropic.com/settings/keys))
3. Click **Create Key**
4. Copy the key — it starts with `sk-ant-...`
5. Save it somewhere safe (you will need it in Step 3)

> **Note:** Anthropic charges for API usage. Generating a prototype typically costs a few cents. You can set a spending limit in your Anthropic account settings.

---

## Step 2: Install UI Studio

### macOS (Apple Silicon)

1. Download `UI Studio-<version>-arm64.dmg` from the [Releases page](../../releases)
2. Double-click the `.dmg` file to open it
3. Drag **UI Studio** into your **Applications** folder
4. Open **Applications** and double-click **UI Studio**
5. If you see a message saying the app "can't be opened because Apple cannot check it for malicious software":
   - Open **System Settings > Privacy & Security**
   - Scroll down and click **Open Anyway** next to the UI Studio message
   - Click **Open** in the confirmation dialog

### Windows

1. Download `UI Studio-Setup-<version>.exe` from the [Releases page](../../releases)
2. Double-click the installer
3. Follow the setup wizard (you can choose where to install)
4. UI Studio will appear in your Start Menu when installation is complete
5. If Windows Defender SmartScreen shows a warning:
   - Click **More info**
   - Click **Run anyway**

### Linux

1. Download `UI Studio-<version>.AppImage` from the [Releases page](../../releases)
2. Make the file executable:
   - Right-click the file > **Properties** > **Permissions** > check **Allow executing file as program**
   - Or in a terminal: `chmod +x UI\ Studio-<version>.AppImage`
3. Double-click the AppImage to run it — no installation needed

---

## Step 3: Set Up Your API Key

UI Studio needs your Anthropic API key to work. Choose whichever method is easiest for you.

### Option A: Create a `.env` file (recommended — set it once, works every time)

**macOS:**

1. Open the **Terminal** app (search for "Terminal" in Spotlight with Cmd+Space)
2. Paste this command, replacing `your_key_here` with the key you copied in Step 1:

```
echo "ANTHROPIC_API_KEY=your_key_here" > ~/Library/Application\ Support/ui-studio/.env
```

3. Press Enter
4. Done! The key is saved. You can close Terminal.

> If you get a "No such file or directory" error, run UI Studio once first (it creates the folder on first launch), then try again.

**Windows:**

1. Open **File Explorer**
2. Type `%APPDATA%\UI Studio` in the address bar and press Enter
3. Right-click in the folder > **New** > **Text Document**
4. Name it `.env` (remove the `.txt` extension — if prompted, confirm you want to change the extension)
5. Open the file in Notepad and add this line:

```
ANTHROPIC_API_KEY=your_key_here
```

6. Save and close

**Linux:**

1. Open a terminal
2. Run:

```
echo "ANTHROPIC_API_KEY=your_key_here" > ~/.config/UI\ Studio/.env
```

### Option B: Set an environment variable (for one session)

This works but you have to do it each time you launch from a terminal.

**macOS / Linux:**

```
export ANTHROPIC_API_KEY=your_key_here
open /Applications/UI\ Studio.app   # macOS
./UI\ Studio-*.AppImage              # Linux
```

**Windows (PowerShell):**

```
$env:ANTHROPIC_API_KEY="your_key_here"
& "C:\Program Files\UI Studio\UI Studio.exe"
```

---

## Step 4: Start Using UI Studio

1. Open UI Studio
2. You will see a chat panel on the left and a preview panel on the right
3. Type a description of the UI you want, for example:
   - *"Create a dashboard with a sidebar, user stats, and a recent activity feed"*
   - *"Build a login page with email and password fields"*
4. Press Enter and wait — the AI will generate your prototype in the preview panel
5. Keep chatting to refine it:
   - *"Make the sidebar collapsible"*
   - *"Change the color scheme to dark mode"*
   - *"Add a search bar at the top"*

You can also click the attachment button to upload a screenshot or wireframe and say something like *"Build this"*.

---

## Troubleshooting

**"Agent service not initialized" error**
Your API key is not set or is invalid. Follow Step 3 above to set it up.

**The app opens but the preview panel stays blank**
This is normal before you send your first message. Type something in the chat to get started.

**macOS says the app is "damaged" or won't open**
Run this command in Terminal, then try opening the app again:
```
xattr -cr /Applications/UI\ Studio.app
```

**Windows installer is blocked by antivirus**
This can happen with unsigned applications. Add an exception in your antivirus software, or right-click the installer and select "Run as administrator".

**Linux AppImage won't launch**
Make sure it has execute permissions: `chmod +x UI\ Studio-*.AppImage`. If it still won't start, try running it from a terminal to see error output.

---

## Uninstalling

**macOS:** Drag UI Studio from Applications to the Trash. To also remove your data, delete `~/Library/Application Support/UI Studio/`.

**Windows:** Open Settings > Apps, find UI Studio, and click Uninstall.

**Linux:** Delete the AppImage file. To also remove your data, delete `~/.config/UI Studio/`.
