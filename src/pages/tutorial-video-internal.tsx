import Head from "next/head";

export default function TutorialVideoInternalPage() {
  return (
    <>
      <Head>
        <title>BulkPrice Tutorial Video</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="w-full max-w-[1000px] mx-auto px-6 py-10">
        <div className="dashboard-wrapper">
          <section className="section-card p-6 md:p-8">
            <h1 className="section-title text-gray-900">BulkPrice Tutorial Video</h1>
            <p className="mt-2 body-compact text-gray-600">
              This page is intentionally unlinked for private reviewer access.
            </p>

            <div className="mt-6 rounded-2xl overflow-hidden border border-blue-100 bg-black/5">
              <video
                className="w-full aspect-video"
                controls
                preload="metadata"
                src="/bulk-price-tutorial.mp4"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
