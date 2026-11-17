// Folder sharing's web part, the server pieces it needs (docs/AGENTS/plan/20261116-1330-folder-share-web.md): the
// gate's one switch in code is closed, the sign-in answer tells the web whether folder sharing is open
// (Me.server.folderShares, absent while closed), the one-time admin line's preference is kept, and the web's list of
// places that are never shared (shared/src/folder-share-places.ts, a hint for the menus) is the server's own.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { SHARE_KEPT_NAMES } from '@mycel/shared'
import fs from 'node:fs'
import path from 'node:path'
import { loadAppConfig } from '../../server/src/app-config'
import { FOLDER_SHARES_OPEN, folderSharesOpen } from '../../server/src/files/folder-share-gate'
import { keptNames } from '../../server/src/files/share-places'
import { WORK } from '../lib/env'
import { harness, withOwner, type Client, type Harness } from './a-lib'

test('the switch in code is closed; config.folderShares (a test, or the config file key) overrides it', () => {
  expect(FOLDER_SHARES_OPEN).toBe(false)
  expect(folderSharesOpen({})).toBe(false)
  expect(folderSharesOpen({ folderShares: true })).toBe(true)
  expect(folderSharesOpen({ folderShares: false })).toBe(false)
})

test('server.json "folderShares" (true or false) sets config.folderShares; absent leaves the switch in code', () => {
  const dir = path.join(WORK, 'folder-shares-config')
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const load = (extra: object, n: string) => {
    const f = path.join(dir, `server-${n}.json`)
    fs.writeFileSync(f, JSON.stringify({ mode: 'dev', ...extra }))
    return loadAppConfig({ argv: ['--config', f], env: {} })
  }
  const absent = load({}, 'absent')
  expect(absent).not.toHaveProperty('folderShares')
  expect(folderSharesOpen(absent)).toBe(FOLDER_SHARES_OPEN)
  expect(load({ folderShares: true }, 'on').folderShares).toBe(true)
  expect(folderSharesOpen(load({ folderShares: true }, 'on'))).toBe(true)
  expect(folderSharesOpen(load({ folderShares: false }, 'off'))).toBe(false)
  expect(() => load({ folderShares: 'yes' }, 'bad')).toThrow(/folderShares/)
})

test('the web\'s never-shared names are the server\'s kept names, in the same order', () => {
  expect([...SHARE_KEPT_NAMES]).toEqual(keptNames())
})

describe('Me.server.folderShares', () => {
  let closed: Harness, open: Harness, a: Client, b: Client
  beforeAll(async () => {
    closed = await harness('c-folder-share-web-closed')
    open = await harness('c-folder-share-web-open', { folderShares: true })
    a = await withOwner(closed)
    b = await withOwner(open)
  }, 60_000)
  afterAll(() => { closed.close(); open.close() })

  test('absent while the gate is closed: the web shows nothing of folder sharing', async () => {
    const me = await a.call('GET', '/api/me')
    expect(me.server.folderShares).toBeUndefined()
  })
  test('true once it is open', async () => {
    const me = await b.call('GET', '/api/me')
    expect(me.server.folderShares).toBe(true)
  })
  test('the one-time admin line, once closed, stays closed (prefs.folderShareNotice)', async () => {
    const me = await b.call('PATCH', '/api/me', { prefs: { folderShareNotice: 'seen' } })
    expect(me.user.prefs.folderShareNotice).toBe('seen')
    expect((await b.call('GET', '/api/me')).user.prefs.folderShareNotice).toBe('seen')
  })
})
