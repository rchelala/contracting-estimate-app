import type { Database } from './database.types'

export type EditorEstimate = Database['public']['Tables']['estimates']['Row']
export type EditorSection = Database['public']['Tables']['estimate_sections']['Row']
export type EditorLineItem = Database['public']['Tables']['estimate_line_items']['Row']
export type EditorAttachment = Database['public']['Tables']['estimate_attachments']['Row']
export type EditorClient = Database['public']['Tables']['clients']['Row']

export interface FullEstimate {
  estimate: EditorEstimate
  sections: EditorSection[]
  lineItems: EditorLineItem[]
  attachments: EditorAttachment[]
}
