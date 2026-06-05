export function getRuntimeErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return String(error);

  return (
    error.message
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? error.name
  );
}

export function logRuntimeWarning(scope: string, error: unknown) {
  console.warn(`${scope}: ${getRuntimeErrorMessage(error)}`);
}

export function getDatabaseUnavailableMessage(feature: string) {
  if (process.env.NODE_ENV === "production") {
    return `${feature} is temporarily unavailable. Please try again shortly.`;
  }

  return `${feature} cannot reach the database from this environment. Check DATABASE_URL or use a local database.`;
}
