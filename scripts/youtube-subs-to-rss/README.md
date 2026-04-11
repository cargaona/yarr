# youtube-subs-to-rss

Browser script to export your YouTube subscriptions as an OPML file for importing into yarr.

## what it does

Extracts every channel from your YouTube subscriptions page and downloads an OPML file containing their RSS feeds. The resulting file can be directly imported into yarr or any RSS reader.

## prerequisites

* Modern web browser (Chrome, Firefox, Safari, Edge)
* Active YouTube account with subscriptions
* Signed in to YouTube

## usage

1. Sign in to YouTube at [youtube.com](https://www.youtube.com)

2. Navigate to your subscriptions page:  
   [https://www.youtube.com/feed/channels](https://www.youtube.com/feed/channels)  
   
   **Note:** This is the "All subscriptions" page, **not** `/feed/subscriptions`

3. Open browser DevTools:
   * **Windows/Linux:** `F12` or `Ctrl+Shift+I`
   * **macOS:** `Cmd+Option+I`

4. Click the **Console** tab

5. Copy the entire contents of `youtube-subs-to-rss.js` and paste into the console

6. Press `Enter` to execute

7. Wait for the script to complete:
   * The page will auto-scroll to load all subscriptions
   * Progress updates will appear in the console
   * When finished, `youtube-subscriptions.opml` will download automatically

8. Import into yarr:
   * Click the **"+"** menu in yarr
   * Select **"Import from OPML"**
   * Choose the downloaded `youtube-subscriptions.opml` file

## output

The script generates an OPML file containing:

* **Folder:** All feeds organized under a "YouTube" folder
* **Feed format:** Standard YouTube RSS feeds (`https://www.youtube.com/feeds/videos.xml?channel_id=...`)
* **Metadata:** Channel titles and URLs

Example OPML structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>YouTube Subscriptions</title>
  </head>
  <body>
    <outline title="YouTube" text="YouTube">
      <outline type="rss" text="Channel Name" title="Channel Name" 
               xmlUrl="https://www.youtube.com/feeds/videos.xml?channel_id=UC..." 
               htmlUrl="https://www.youtube.com/channel/UC..."/>
      <!-- ... more channels ... -->
    </outline>
  </body>
</opml>
```

## configuration

Edit these constants at the top of `youtube-subs-to-rss.js` to customize behavior:

```javascript
const OPML_FOLDER_NAME = "YouTube";          // Folder name in OPML file
const OUTPUT_FILENAME = "youtube-subscriptions.opml";  // Output filename
const SCROLL_DELAY_MS = 800;                 // Delay between scroll steps (ms)
const MAX_SCROLL_IDLE_ROUNDS = 3;            // Scroll attempts before stopping
const HANDLE_FETCH_DELAY_MS = 250;           // Delay between handle lookups (ms)
```

## how it works

1. **Auto-scroll:** Scrolls to the bottom of the page repeatedly to lazy-load all subscription tiles
2. **Channel extraction:** Parses channel data from DOM elements:
   * Tries to extract `channelId` from element data
   * Falls back to parsing `/channel/UC...` URLs
   * Captures `@handle` usernames for resolution
3. **Handle resolution:** For channels using `@username` format, fetches the channel page to extract the canonical channel ID
4. **OPML generation:** Builds a valid OPML 2.0 document with XML-escaped channel names
5. **Download:** Creates a blob and triggers browser download

## troubleshooting

### Script reports "No channels resolved"

* Ensure you're on [https://www.youtube.com/feed/channels](https://www.youtube.com/feed/channels) (not `/feed/subscriptions`)
* Check that you have active subscriptions
* Try refreshing the page and running the script again

### Some channels are missing

* The script may have stopped scrolling too early. Increase `MAX_SCROLL_IDLE_ROUNDS` or `SCROLL_DELAY_MS`
* Some channels may use handles that fail to resolve. Check console warnings for skipped channels

### YouTube DOM changes break the script

YouTube occasionally updates their page structure. If the script stops working:

* Check the browser console for errors
* The selectors may need updating:
  * `tileSelector = "ytd-channel-renderer"` (main channel tile element)
  * `#channel-title` (channel name)
  * `#main-link` (channel URL)

### Rate limiting or handle resolution failures

If you have many subscriptions (500+), YouTube may rate-limit handle lookups. The script includes delays (`HANDLE_FETCH_DELAY_MS`) to mitigate this. Increase the delay if needed.

## notes

* **Read-only operation:** The script only reads page data, it doesn't modify your account
* **No dependencies:** Vanilla JavaScript, no extensions or build tools required
* **One-time use:** Run whenever you want to sync your subscriptions to yarr
* **Privacy:** All processing happens locally in your browser; no data is sent to third parties

## license

See `license` file in repository root.
