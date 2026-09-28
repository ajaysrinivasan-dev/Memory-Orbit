class AuthenticationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.status = 401;
  }
}

const FIREBASE_WEB_API_KEY = "AIzaSyBaoN5G5ERVDk15vSWfYWx5uBUJTFijIRQ";
const LOOKUP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`;

export const authenticateRequest = async (request) => {
  const authorization = request.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new AuthenticationError();
  }

  try {
    const lookupResponse = await fetch(LOOKUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: match[1] }),
    });

    const data = await lookupResponse.json().catch(() => ({}));
    const user = Array.isArray(data.users) ? data.users[0] : null;

    if (!lookupResponse.ok || !user?.localId || user.disabled) {
      throw new AuthenticationError();
    }

    return {
      uid: user.localId,
      email: user.email || null,
      emailVerified: Boolean(user.emailVerified),
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    console.error("[Auth] Firebase token lookup failed:", error);
    const serviceError = new Error("Authentication service temporarily unavailable.");
    serviceError.status = 503;
    throw serviceError;
  }
};

export const getErrorStatus = (error, fallback = 500) => {
  return Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599
    ? error.status
    : fallback;
};
