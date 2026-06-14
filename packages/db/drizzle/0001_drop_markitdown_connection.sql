-- Docling (REST, transport "internal") replaced the markitdown MCP sidecar.
-- markitdown is no longer seeded as a consumed MCP connection, so remove the
-- now-orphaned global row left behind on existing deployments.
DELETE FROM "mcp_connections" WHERE "provider_id" = 'markitdown';
