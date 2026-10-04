import pg from "pg";

// Use the same parser as the application, without opening a connection.
// Never spread connectionParameters: it contains the password and TLS keys.
export function databaseConnectionDiagnostics(connectionString: string | undefined) {
  try {
    if (!connectionString) return { configured: false };
    // pg exposes these runtime fields but its public typings omit them.
    const client = new pg.Client({ connectionString }) as unknown as {
      connectionParameters: {
        host: string; port: number; database: string; user: string;
        password: unknown; ssl: unknown;
      };
    };
    const parameters = client.connectionParameters;
    const host = parameters.host;
    const urlHost = host.includes(":") ? `[${host}]` : host;
    return {
      configured: true,
      host,
      port: parameters.port,
      database: parameters.database,
      username: parameters.user,
      password: "[REDACTED]",
      passwordConfigured: typeof parameters.password === "string" && parameters.password.length > 0,
      sslEnabled: Boolean(parameters.ssl),
      connectionString: `postgresql://${encodeURIComponent(parameters.user)}:[REDACTED]@${urlHost}:${parameters.port}/${encodeURIComponent(parameters.database)}`,
    };
  } catch {
    // Parser errors may contain the original URL. Do not log the error object.
    return { configured: true, parseError: true };
  }
}