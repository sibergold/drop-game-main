const constants = {
	/** minimum vertical velocity "bump" on collision */
	BUMP_MIN: 20,
	/** random spread for bump */
	BUMP_SPREAD: 20,
	/** font family for labels */
	FONT_FAMILY: "Syne Mono",
	/** default force of gravity */
	GRAVITY: 400,
	/** default force of gravity with chute */
	GRAVITY_CHUTE: 30,
	/** username label font size */
	LABEL_SIZE: 20,
	/** maximum wait (in ms) between queued drops */
	MAX_QUEUE_BUFFER: 300,
	/** maximum angle of sway */
	MAX_SWAY: 25,
	/** maximum random velocity */
	MAX_VELOCITY: 600,
	/** minimum wait (in ms) between queued drops */
	MIN_QUEUE_BUFFER: 100,
	/** number of sprites */
	NUM_SPRITES: 5,
	/** Base URL for OAuth (client ID will be added dynamically) */
	OAUTH_BASE_URL: process.env.KICK_OAUTH_BASE_URL || "https://kick.com/oauth2/authorize",
	/** number of recent scores to list with !droprecent */
	RECENT_SCORES: 10,
	/** score label font size */
	SCORE_SIZE: 26,
	/** height of screen */
	SCREEN_HEIGHT: window.innerHeight,
	/** width of screen */
	SCREEN_WIDTH: window.innerWidth,
	/** font stroke color */
	STROKE_COLOR: "#000",
	/** font stroke thickness */
	STROKE_THICKNESS: 6,
	/** number of seconds between score tidying */
	TIDY_SCHEDULE: 5 * 60 * 1000,
	/** number of recent drops to track */
	TRACK_RECENT: 10,
	/** 24 hours in milliseconds */
	TWENTY_FOUR_HOURS: 24 * 60 * 60 * 1000,
	/** default wait before reset (in seconds) */
	WAIT_FOR_RESET: 60,
	/** OAuth URL builder function for multi-user support */
	buildOAuthURL: (clientId: string, redirectUri?: string) => {
		const redirect = redirectUri || window.location.href.replace(/[^/]\.html|$/i, "streamlined-oauth.html");
		const oauthBaseUrl = process.env.KICK_OAUTH_BASE_URL || "https://kick.com/oauth2/authorize";
		return (
			`${oauthBaseUrl}` +
			`?client_id=${clientId}` +
			`&redirect_uri=${encodeURIComponent(redirect)}` +
			`&response_type=token` +
			`&scope=chat:read%20chat:write`
		);
	},
};

export default constants;
