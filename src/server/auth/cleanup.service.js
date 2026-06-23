import { cleanupOAuthStates } from "./oauth.service.js";
import { cleanupVerificationCodes } from "./verification.service.js";

export function cleanupAuthArtifacts(now = Date.now()) {
  cleanupVerificationCodes(now);
  cleanupOAuthStates(now);
}
