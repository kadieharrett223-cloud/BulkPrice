import Head from "next/head";

const TUTORIAL_VIDEO_URL = "";

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
              {TUTORIAL_VIDEO_URL ? (
                <iframe
                  src={TUTORIAL_VIDEO_URL}
                  title="BulkPrice Tutorial Video"
                  className="w-full aspect-video"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center text-sm text-gray-600 px-6 text-center">
                  Video URL pending. Share your video link and it will appear here.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
