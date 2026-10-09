
/**
 * CareerForge no longer uses device analytics or heartbeat tracking
 * for authentication.
 *
 * Keep these no-op exports temporarily so existing imports do not break.
 * Remove this file and its imports after checking all call sites.
 */

export const getInstallationId = () => null;
export const getDeviceId = () => null;
export const getDeviceMetadata = () => ({});

export const registerDevice = async () => {};
export const startSession = async () => {};
export const endSession = async () => {};
