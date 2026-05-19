const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

const corsOptions = {
	origin: (origin, callback) => {
		if (!origin || allowedOrigins.includes(origin)) {
			return callback(null, true);
		}

		return callback(new Error('Not allowed by CORS'));
	},
	credentials: true,
};

module.exports = corsOptions;
