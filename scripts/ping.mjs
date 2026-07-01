const url = process.env.PING_URL ?? "https://nailbar-api.onrender.com/health";

const res = await fetch(url);
console.log(`Pinged ${url} -> ${res.status}`);
