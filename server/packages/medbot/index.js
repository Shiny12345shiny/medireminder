/**
 * ================================================================
 * medbot/index.js
 * Package entry point — clean exports for the entire medbot package
 * ================================================================
 */

"use strict";

const chatEngine = require("./core/chatEngine");
const drugService = require("./drugDatabase/drugService");
const { buildUserContext } = require("./userContext/contextBuilder");
const chatRoutes = require("./routes/chatRoutes");
const config = require("./config");

/**
 * Check that all required services are reachable on startup
 */
async function checkDrugApiHealth() {
  const health = await drugService.checkApiHealth();
  if (health.healthy) {
    console.log(
      `✅ [Medbot] Drug API is healthy — ${health.medicinesLoaded} medicines loaded`
    );
  } else {
    console.warn(
      "⚠️  [Medbot] Drug API is NOT reachable at",
      config.drugApi.baseUrl,
      "\n   Start it with: cd server/packages/medbot/drugDatabase && python medicine_api.py"
    );
  }
  return health;
}

module.exports = {
  // Express router — mount with: app.use('/api/chat', chatRoutes)
  chatRoutes,

  // Startup health check
  checkDrugApiHealth,

  // Core engine (for direct use if needed)
  chatEngine,

  // Drug service (for direct use if needed)
  drugService,

  // Context builder (for direct use if needed)
  buildUserContext,

  // Config
  config,
};