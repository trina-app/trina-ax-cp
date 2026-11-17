// Folder sharing's rollout gate (docs/decisions/20261116-folder-share-server.md "Gate"; the web part:
// docs/AGENTS/plan/20261116-1330-folder-share-web.md). Its own small module: the sign-in answer (auth/service.ts
// Me.server.folderShares) reads it without loading the folder-share service.
import type { AppConfig } from '../app-config'

/** The switch in code: closed for the release until the manual folder-sharing QA run passes (opening it again is this
 * one line). A server's config file key `folderShares` (true or false; read at start) overrides it, as do tests through
 * `config.folderShares`; no environment variable sets it. */
export const FOLDER_SHARES_OPEN: boolean = false

/** May a person share a folder in their own files on this server? */
export function folderSharesOpen(config: Pick<AppConfig, 'folderShares'>): boolean {
  return (config.folderShares ?? FOLDER_SHARES_OPEN) === true
}
