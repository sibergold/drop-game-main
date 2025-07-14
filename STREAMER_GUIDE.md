# 🪂 Kick Parachute Drop Game - Streamer Guide

## 🚀 Quick Setup (1-Click)

1. Go to: `http://localhost:3000/streamlined-oauth.html`
2. Click "🚀 Start with Kick Authorization"
3. Authorize the app on Kick.com
4. Copy your overlay URL
5. Add as Browser Source in OBS (1920x1080)

**That's it! No Client ID setup needed!**

## 🎮 How It Works

Your viewers can participate in an exciting parachute drop game where they try to land as close as possible to the target pad. The closer they land, the higher their score!

### 👥 Viewer Commands

- `!drop` - Join the parachute drop game
- `!drop emote_name` - Drop with a custom emote (if available)
- `!droptop` - Show top scores leaderboard
- `!droplow` - Show lowest scores
- `!droprecent` - Show recent drops
- `!help` or `!commands` - Show all available commands

### 🛡️ Moderator Commands

- `!queuedrop` - Start a queue for group drops
- `!queuedrop 30` - Start queue with 30 second auto-release
- `!startdrop` - Manually release all queued players
- `!resetdrop` - Reset the current game
- `!clearscores` - Clear all scores
- `!clearscores username` - Clear specific user's scores

## 🎯 Game Modes

### Individual Mode (Default)
- Game starts automatically when someone types `!drop`
- Players drop immediately when they join
- Perfect for continuous engagement

### Queue Mode (Group Competitions)
1. Moderator types `!queuedrop` to start a queue
2. Viewers type `!drop` to join the queue
3. Moderator types `!startdrop` to release everyone at once
4. Creates exciting group competitions!

## ⚙️ Customization Options

When setting up your overlay, you can customize:

- **Gravity**: How fast objects fall (default: 400)
- **Parachute Gravity**: How fast objects fall with parachute (default: 60)
- **Max Velocity**: Maximum falling speed (default: 600)
- **Reset Wait**: Time before game resets (default: 60 seconds)

## 🏆 Scoring System

- **100 points**: Perfect center landing
- **0+ points**: Landing on the pad (closer = higher score)
- **No points**: Missing the pad entirely

Scores are automatically saved and persist between streams!

## 💡 Pro Tips

1. **Use Queue Mode for Events**: Great for subscriber celebrations or special events
2. **Encourage Emote Drops**: Viewers can use `!drop emote_name` for personalized drops
3. **Check Leaderboards**: Use `!droptop` to celebrate your best players
4. **Reset When Needed**: Use `!resetdrop` to start fresh competitions

## 🔧 Troubleshooting

### Game Not Responding
- Check that the overlay URL is correct in OBS
- Refresh the browser source
- Verify Kick chat connection in browser console

### Chat Commands Not Working
- Ensure you completed the OAuth authorization
- Check that the overlay is loaded in OBS
- Verify your Kick account has necessary permissions

### Performance Issues
- Use 1920x1080 resolution for browser source
- Disable "Shutdown source when not visible" in OBS
- Close other unnecessary browser sources

## 🎨 OBS Setup

1. Add new **Browser Source**
2. Set URL to your overlay link
3. Set Width: **1920**, Height: **1080**
4. **Uncheck** "Shutdown source when not visible"
5. **Check** "Refresh browser when scene becomes active"

## 🆘 Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify your Kick authorization is still valid
3. Try refreshing the browser source in OBS
4. Re-authorize if needed using the setup link

---

**Have fun and happy streaming! 🎮✨**
