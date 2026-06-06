import { DbConnection } from "./module_bindings";

// Configure (but do not yet build) the connection. SpacetimeDBProvider builds it
// and manages its lifecycle. URI and database name come from VITE_ env vars
// (see risk-dominion/.env).
export const connectionBuilder = DbConnection.builder()
  .withUri(import.meta.env.VITE_SPACETIMEDB_URI)
  .withDatabaseName(import.meta.env.VITE_MODULE_NAME)
  .onConnect((_conn, identity) => {
    console.log("Connected to SpacetimeDB as", identity.toHexString());
  })
  .onConnectError((_ctx, err) => {
    console.error("SpacetimeDB connection error:", err);
  })
  .onDisconnect((_ctx, err) => {
    console.warn("Disconnected from SpacetimeDB", err ?? "");
  });
