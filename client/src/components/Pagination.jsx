export default function Pagination({ pagination, onPage }) {
  if (!pagination) return null;
  const { page, pages, total } = pagination;
  return (
    <div className="pagination">
      <span>{total} records</span>
      <div>
        <button className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Prev
        </button>
        <span className="page-label">
          Page {page} of {pages || 1}
        </span>
        <button className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}