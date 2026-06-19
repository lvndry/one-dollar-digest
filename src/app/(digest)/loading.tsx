export default function Loading() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
      {/* Masthead skeleton */}
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-10 text-center">
        <div
          className="skeleton mx-auto mb-8 rounded"
          style={{ height: "10px", width: "180px" }}
        />
        <div
          className="skeleton mx-auto mb-8 rounded"
          style={{ height: "72px", width: "420px", maxWidth: "90%" }}
        />
        <div
          className="skeleton mx-auto mb-10 rounded"
          style={{ height: "14px", width: "200px" }}
        />
        <div className="mt-12 h-px" style={{ backgroundColor: "var(--border)" }} />
      </div>

      {/* Article grid skeleton */}
      <main className="max-w-5xl mx-auto px-6 pb-24">
        <div className="mb-28">
          <div className="mb-8">
            <div
              className="skeleton rounded"
              style={{ height: "36px", width: "160px" }}
            />
            <div className="mt-4 h-px" style={{ backgroundColor: "var(--border)" }} />
          </div>
          {/* Featured card skeleton */}
          <div
            className="skeleton mb-10 w-full rounded"
            style={{ aspectRatio: "16/9" }}
          />
          {/* Card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-10">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="flex flex-col gap-3">
                <div className="skeleton w-full rounded" style={{ aspectRatio: "3/2" }} />
                <div
                  className="skeleton rounded"
                  style={{ height: "14px", width: "60%" }}
                />
                <div
                  className="skeleton rounded"
                  style={{ height: "14px", width: "90%" }}
                />
                <div
                  className="skeleton rounded"
                  style={{ height: "10px", width: "40%" }}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
