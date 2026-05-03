import Modal from '../ui/Modal'

interface Props {
  open: boolean
  lineItemCount: number
  onCancel: () => void
  onConfirm: () => void
}

export default function DeleteSectionModal({ open, lineItemCount, onCancel, onConfirm }: Props) {
  const body =
    lineItemCount === 1
      ? 'This will delete 1 line item and cannot be undone.'
      : `This will delete ${lineItemCount} line items and cannot be undone.`

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Delete section?"
      footer={
        <>
          <button
            type="button"
            className="border border-slate-200 text-slate-700 text-sm font-semibold px-3 py-2 rounded-md hover:bg-slate-50"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bg-red-600 text-white text-sm font-semibold px-3 py-2 rounded-md hover:bg-red-700"
            onClick={onConfirm}
          >
            Delete section
          </button>
        </>
      }
    >
      {body}
    </Modal>
  )
}
