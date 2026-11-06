export function redactLocalPaths(value: string): string {
  return value
    .replace(/\/private(?=<[A-Z_]+>)/g, "")
    .replace(/(?:\/private)?\/var\/folders\/[\w-]+\/[\w-]+\/T/g, "<TMP>")
    .replace(/(?:\/private)?\/tmp\/claude-\d+/g, "<TMP>")
    .replace(/-private-var-folders-[\w-]+?-T-/g, "-<TMP>-")
    .replace(/<HOME>\/(?:Source|dev|src|code|projects)\/[^\s"'`)]*/g, "<HOME>/<PATH>");
}
