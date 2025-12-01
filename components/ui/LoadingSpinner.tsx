export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-10">
      <div className="three-body">
        <div className="three-body__dot"></div>
        <div className="three-body__dot"></div>
        <div className="three-body__dot"></div>
      </div>
    </div>
  );
}
