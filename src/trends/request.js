let cookieVal;

function buildQueryString(params) {
	return new URLSearchParams(params).toString();
}

async function rereq(options) {
	const { host, method, path, agent, headers } = options;

	const url = `https://${host}${path}`;

	const response = await fetch(url, {
		method,
		headers: headers || {},
		agent,
	});

	if (!response.ok) {
		throw new Error(`Request failed with status ${response.status}`);
	}

	return await response.text();
}

export default async function request({ method, host, path, qs, agent }) {
	const queryString = buildQueryString(qs);
	let fullPath = `${path}?${queryString}`;

	let headers = {};

	// Use cached cookieVal if set on 429 error
	if (cookieVal) {
		headers['cookie'] = cookieVal;
	}

	const options = {
		host,
		method,
		path: fullPath,
		agent,
		headers,
	};

	try {
		const url = `https://${host}${fullPath}`;

		const response = await fetch(url, {
			method,
			headers,
			agent,
		});

		if (response.status === 429 && response.headers.get('set-cookie')) {
			// Fix for the "too many requests" issue
			// Look for the set-cookie header and re-request
			cookieVal = response.headers.get('set-cookie').split(';')[0];
			headers['cookie'] = cookieVal;
			return await rereq(options);
		}

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		return await response.text();
	} catch (error) {
		throw error;
	}
}
