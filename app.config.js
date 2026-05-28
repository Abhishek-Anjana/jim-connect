const appJson = require("./app.json");

const productionApiUrl = "https://jim-connect-production.up.railway.app";

process.env.EXPO_PUBLIC_API_URL = productionApiUrl;
process.env.EXPO_PUBLIC_API_BASE_URL = productionApiUrl;

module.exports = ({ config }) => ({
  ...appJson.expo,
  ...config,
  extra: {
    ...(appJson.expo.extra ?? {}),
    ...(config.extra ?? {}),
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL
  }
});
