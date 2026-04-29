export const CHAT_SESSIONS_KEY = "ai-saas-chat-sessions";
export const ACTIVE_SESSION_KEY = "ai-saas-active-session";
export const WEATHER_CITY_KEY = "ai-saas-weather-city";
export const LIVE_UPDATES_KEY = "ai-saas-live-updates";

export function getUserStorageKey(username: string, key: string) {
  return `${key}:${username.toLowerCase()}`;
}
