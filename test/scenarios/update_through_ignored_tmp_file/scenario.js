/* @flow */

/*:: import type { Scenario } from '..' */

module.exports = ({
  side: 'local',
  noCaptures: true,
  init: [{ ino: 1, path: 'file.docx', content: 'initial content' }],
  actions: [
    { type: 'create_file', path: '~jk432.tmp' },
    { type: 'mv', src: 'file.docx', dst: '~jk432.tmp' },
    { type: 'update_file', path: '~jk432.tmp', content: 'updated content' },
    { type: 'wait', ms: 1000 },
    { type: 'mv', src: '~jk432.tmp', dst: 'file.docx' }
  ],
  expected: {
    tree: ['file.docx'],
    remoteTrash: [],
    contents: {
      'file.docx': 'updated content'
    }
  }
} /*: Scenario */)
