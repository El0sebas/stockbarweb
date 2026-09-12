import React from 'react';
import { Eye, PencilSquare, Trash } from 'react-bootstrap-icons';

// Trío de acciones (ver detalle / editar / eliminar) reutilizado en todas las
// tablas CRUD para que el mismo gesto visual e icono signifiquen lo mismo en
// cualquier módulo del sistema.
export const RowActions = ({ onView, onEdit, onDelete, hideEdit = false, hideDelete = false, disabledReason }) => (
  <div className="d-flex justify-content-center gap-2">
    {onView && (
      <button
        className="btn btn-sm p-1 border-0"
        style={{ color: 'var(--brand-blue)' }}
        onClick={onView}
        title="Ver detalle"
      >
        <Eye size={18} />
      </button>
    )}
    {!hideEdit && onEdit && (
      <button
        className="btn btn-sm p-1 border-0"
        style={{ color: disabledReason ? 'var(--text-muted)' : 'var(--amber-action)', opacity: disabledReason ? 0.5 : 1, cursor: disabledReason ? 'not-allowed' : 'pointer' }}
        onClick={disabledReason ? undefined : onEdit}
        title={disabledReason || 'Editar'}
      >
        <PencilSquare size={18} />
      </button>
    )}
    {!hideDelete && onDelete && (
      <button
        className="btn btn-sm p-1 border-0"
        style={{ color: 'var(--brand-danger)', opacity: disabledReason ? 0.5 : 1, cursor: disabledReason ? 'not-allowed' : 'pointer' }}
        onClick={disabledReason ? undefined : onDelete}
        title={disabledReason || 'Eliminar'}
      >
        <Trash size={18} />
      </button>
    )}
  </div>
);
