import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

class AuthenticationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.status = 401;
  }
}

const getFirebaseAdminAuth = () => {
  if (getApps().length > 0) {
    return getAuth();
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error("Missing Firebase Admin server credentials.");
  }

  const app = initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });

  return getAuth(app);
};

export const authenticateRequest = async (request) => {
  const authorization = request.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new AuthenticationError();
  }

  try {
    return await getFirebaseAdminAuth().verifyIdToken(match[1]);
  } catch (error) {
    if (error.message === "Missing Firebase Admin server credentials.") {
      throw error;
    }
    throw new AuthenticationError();
  }
};

export const getErrorStatus = (error, fallback = 500) => {
  return Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599
    ? error.status
    : fallback;
};
