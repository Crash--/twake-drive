import {
  BlockNoteSchema,
  createInlineContentSpec,
  defaultInlineContentSpecs
} from '@blocknote/core'

// Must stay identical to the schema of the Drive editor
// (src/modules/views/DocsNote/schema.js): a node that this schema cannot
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
    return { dom }
  }
})

export const schema = BlockNoteSchema.create({
  inlineContentSpecs: { ...defaultInlineContentSpecs, mention: Mention }
})
