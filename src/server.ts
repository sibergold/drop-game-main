import compression from "compression";
import cors from "cors";
import express from "express";
import { createHttpTerminator } from "http-terminator";


const host = process.env.SERVER_HOST ?? process.env.host ?? "localhost";
const port = parseInt(process.env.SERVER_PORT ?? process.env.port ?? "3000");
const app = express();

if (process.env.NODE_ENV !== "production") {
	app.use(cors({ origin: "*" }));
}

app.use(compression());
app.use(express.json({ limit: "10mb" }));

// Configure MIME types for static files
express.static.mime.define({
	'application/javascript': ['ts'],
	'text/javascript': ['ts']
});

app.use(express.static("dist"));

app.disable("x-powered-by");

const listener = app.listen(port, host);
const terminator = createHttpTerminator({ server: listener });
const shutdown = async () => {	
	await terminator.terminate();
	process.exit(0);
};

["SIGINT", "SIGTERM"].forEach((signal) => process.on(signal, shutdown));
