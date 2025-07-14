/** parsed hash string (key-value pairs become object properties) */
const hs = Object.fromEntries(
	window.location.hash
		.substring(1)
		?.split("&")
		.map((v) => v.split("=")) ?? [],
);

/** parsed query string (key-value pairs become object properties) */
const qs = Object.fromEntries(
	window.location.search
		.substring(1)
		?.split("&")
		.map((v) => v.split("=").map(decodeURIComponent)) ?? [],
);

/** combined hash and query parameters for OAuth compatibility */
const hsWithQuery = { ...hs, ...qs };

/** awaitable sleep function */
const sleep = async (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export { hs, qs, hsWithQuery, sleep };
