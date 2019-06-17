/* @flow */

const _ = require('lodash')

const logger = require('../../logger')
const metadata = require('../../metadata')

/*::
import type Channel from './channel'
import type { AtomEvent, EventKind } from './event'
import type { Ignore } from '../../ignore'
*/

const STEP_NAME = 'filterIgnored'

const log = logger({
  component: `atom/${STEP_NAME}`
})

module.exports = {
  STEP_NAME,
  loop
}

// This step removes events about files and directories that are ignored. It's
// better to put this step as soon as possible in the chain to avoid doing
// useless computing for ignored files/directories (like adding inotify
// watchers), but it needs to be put after the AddInfos step as the docType is
// required to know if the event can be ignored.
function loop(
  channel /*: Channel */,
  opts /*: { ignore: Ignore } */
) /*: Channel */ {
  const isIgnored = (path /*: string */, kind /*: EventKind */) =>
    opts.ignore.isIgnored({
      relativePath: path,
      isFolder: kind === 'directory'
    })

  return channel.map(events => {
    const batch = []

    for (const event of events) {
      if (event.noIgnore) {
        batch.push(event)
        continue
      }

      const isPathIgnored = isIgnored(event.path, event.kind)

      if (event.action === 'renamed' && event.oldPath != null) {
        const isOldPathIgnored = isIgnored(event.oldPath, event.kind)

        if (isOldPathIgnored && isPathIgnored) {
          log.debug({ event }, 'Ignored via .cozyignore')
        } else if (isPathIgnored) {
          const deletedEvent = movedToIgnoredPath(event)
          batch.push(deletedEvent)
        } else if (isOldPathIgnored) {
          const createdEvent = movedFromIgnoredPath(event)
          batch.push(createdEvent)
        } else {
          batch.push(event)
        }
      } else if (isPathIgnored) {
        log.debug({ event }, 'Ignored via .cozyignore')
      } else {
        batch.push(event)
      }
    }

    return batch
  })
}

function movedFromIgnoredPath(event /*: AtomEvent */) /*: AtomEvent */ {
  const createdEvent = {
    ...event,
    action: 'created'
  }
  _.set(createdEvent, [STEP_NAME, 'movedFromIgnoredPath'], createdEvent.oldPath)
  delete createdEvent.oldPath

  return createdEvent
}

function movedToIgnoredPath(event /*: AtomEvent */) /*: AtomEvent */ {
  const deletedEvent = {
    ...event,
    action: 'deleted'
  }
  _.set(deletedEvent, [STEP_NAME, 'movedToIgnoredPath'], deletedEvent.path)
  deletedEvent._id = metadata.id(deletedEvent.oldPath)
  deletedEvent.path = deletedEvent.oldPath
  delete deletedEvent.oldPath

  return deletedEvent
}
