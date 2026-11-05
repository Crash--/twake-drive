import {
  BlockNoteSchema,
  createInlineContentSpec,
  defaultInlineContentSpecs
} from '@blocknote/core'

// Must stay identical to the schema of the collab server export
// (poc/docs-editor/collab/schema.mjs): a node that the server schema cannot
// build is deleted from the Y.Doc by y-prosemirror.
export const MENTION_CONFIG = {
  type: 'mention',
  propSchema: { user: { default: '' }, name: { default: '' } },
  content: 'none'
}

const Mention = createInlineContentSpec(MENTION_CONFIG, {
  render: inlineContent => {
    const dom = document.createElement('span')
    dom.textContent = `@${inlineContent.props.name}`
    dom.dataset.user = inlineContent.props.user
    // shortcut: inline style for the POC, the real one goes in twake-mui.
    dom.style.cssText =
      'background:#e7f0fb;color:#1971c2;border-radius:4px;padding:0 3px'
    return { dom }
  }
})

export const schema = BlockNoteSchema.create({
  inlineContentSpecs: { ...defaultInlineContentSpecs, mention: Mention }
})
