export interface RowsProps<T> {
  rows: T[];
  onDelete: (id: string) => void;
  onAddRow: () => void;
  onUpdate: (data: T) => void;
  onMoveRow?: (dragStart: string, dropIndex: string) => void;
  isReadOnly?: boolean;
}
