# 🚀 Kick Drop Game - Streamlined Setup for Streamers

## ✨ What's New?

We've created a **streamlined setup process** that eliminates the need for streamers to create their own Kick applications or manage Client IDs. Now streamers can get started with just **one click**!

## 🎯 For Streamers (Easy Setup)

### Quick Start
1. Go to: `http://localhost:3000/streamlined-oauth.html` (or your hosted URL)
2. Click **"🚀 Start with Kick Authorization"**
3. Authorize with your Kick account
4. Copy your overlay URL
5. Add it to OBS as a Browser Source
6. Start streaming!

### Features
- ✅ **No Client ID needed** - Everything is handled centrally
- ✅ **One-click authorization** - Direct Kick integration
- ✅ **Auto-detection** - Finds your channel and chatroom automatically
- ✅ **Instant setup** - Get your overlay URL immediately
- ✅ **OBS integration** - One-click OBS setup

## 🔧 For Developers (Central Configuration)

### Setting Up the Central Application

1. **Create a Kick Developer Application**:
   - Go to [kick.com/developer/applications](https://kick.com/developer/applications)
   - Create a new application
   - Set redirect URI to: `https://your-domain.com/streamlined-oauth.html`
   - Note down your Client ID

2. **Configure the Central Client ID**:
   ```typescript
   // In src/central-config.ts
   export const CENTRAL_OAUTH_CONFIG = {
       CLIENT_ID: 'your_actual_client_id_here', // Replace this!
       // ... rest of config
   };
   ```

3. **Deploy Your Application**:
   ```bash
   npm run build
   # Deploy the dist/ folder to your hosting service
   ```

### Configuration Options

The `central-config.ts` file contains all centralized settings:

```typescript
export const CENTRAL_OAUTH_CONFIG = {
    // Main application Client ID (REQUIRED)
    CLIENT_ID: 'your_client_id_here',
    
    // OAuth settings
    OAUTH_SETTINGS: {
        response_type: 'token',
        scope: 'chat:read chat:write',
        authorize_url: 'https://kick.com/oauth2/authorize',
        api_base: 'https://kick.com/api/v2'
    },
    
    // Default game settings
    DEFAULT_GAME_SETTINGS: {
        gravity: 400,
        gravity_chute: 60,
        max_velocity: 600,
        wait: 60
    },
    
    // UI customization
    UI_CONFIG: {
        theme: {
            primary_color: '#00ff88',
            secondary_color: '#9146ff'
        },
        messages: {
            success: '✅ Authorization successful!',
            // ... other messages
        }
    },
    
    // OBS integration
    OBS_CONFIG: {
        default_width: 1920,
        default_height: 1080,
        source_name: 'Kick Drop Game'
    }
};
```

## 🔄 Migration from Manual Setup

If you were using the manual setup (`oauth.html`), you can:

1. **Keep using the manual setup** - It still works!
2. **Switch to streamlined setup** - Direct streamers to `/streamlined-oauth.html`
3. **Use both** - Offer both options to your users

## 🌐 Hosting Options

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### GitHub Pages
```bash
npm run build
# Push dist/ folder to gh-pages branch
```

## 🔒 Security Considerations

- The central Client ID is **public** (it's sent to browsers)
- Only authorize trusted redirect URIs in your Kick application
- Use HTTPS in production
- The implicit OAuth flow is used for client-side simplicity

## 🆚 Comparison: Manual vs Streamlined

| Feature | Manual Setup | Streamlined Setup |
|---------|-------------|------------------|
| **Streamer Experience** | Complex | One-click |
| **Client ID Required** | Yes (each streamer) | No (centralized) |
| **Setup Time** | 10-15 minutes | 30 seconds |
| **Technical Knowledge** | Required | None |
| **Maintenance** | Per streamer | Centralized |

## 🎮 Game Features

Both setups support all game features:
- Real-time chat integration
- Customizable physics (gravity, velocity)
- Multiple drop sprites
- Sound effects
- Parachute mechanics
- Auto-reset functionality

## 🐛 Troubleshooting

### "Central Client ID not configured"
- Make sure you've set the correct Client ID in `central-config.ts`
- Rebuild and redeploy your application

### "No chatroom found"
- Make sure the streamer has streaming permissions on Kick
- Check that the channel exists and is active

### "Authorization failed"
- Check that the redirect URI matches exactly in your Kick application
- Ensure HTTPS is used in production

## 📞 Support

For streamers having issues:
1. Try refreshing the page
2. Clear browser cache
3. Make sure you're logged into Kick
4. Contact the developer if issues persist

For developers:
1. Check browser console for errors
2. Verify Kick application settings
3. Test with different browsers
4. Check network requests in DevTools

---

**Ready to make streaming setup effortless for your users? Configure your central Client ID and deploy! 🚀**